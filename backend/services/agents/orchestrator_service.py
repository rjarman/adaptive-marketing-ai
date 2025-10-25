import asyncio

from rich import print
from sqlalchemy.orm import Session

from models import Customer
from models.schemas import (
    QueryRequest, QueryProcessingResult, LlmResponseTypes
)
from repositories.chat_repository import ChatRepository
from repositories.customer_repository import CustomerRepository
from services.agents import CONFIDENCE_THRESHOLD
from services.agents.business_analyst_agent import BusinessAnalystAgent
from services.agents.manager_agent import ManagerAgent, ManagerDecision
from services.agents.marketing_agent import MarketingAgent
from services.agents.paraphrase_agent import ParaphraseAgent
from services.agents.query_generator_agent import QueryGeneratorAgent, QueryGenerationRequest
from services.agents.validator_agent import ValidatorAgent, ValidationRequest
from services.stream_service import StreamService, StreamMessage


class OrchestratorService:
    _HISTORICAL_CONTEXT_RETRIEVAL_LIMIT = 50
    _MAX_ITERATIONS = 10
    _FALLBACK_CONFIDENCE_THRESHOLD = 0.5

    def __init__(self, db: Session, stream_service: StreamService):
        self.db = db
        self.stream_service = stream_service
        self.paraphrase_agent = ParaphraseAgent()
        self.manager_agent = ManagerAgent(stream_service)
        self.query_generator_agent = QueryGeneratorAgent(db, stream_service)
        self.validator_agent = ValidatorAgent(db, stream_service)
        self.business_analyst = BusinessAnalystAgent(stream_service)
        self.marketing_agent = MarketingAgent()
        self.chat_repository = ChatRepository(db)
        self.customer_repository = CustomerRepository(db)
        self._processing_steps = []

    def __del__(self):
        try:
            self._processing_steps = []
            self.query_generator_agent.cleanup_historical_data()
            print("[green]Historical data cleaned up on orchestrator destruction[/green]")
        except Exception as e:
            print(f"[yellow]Warning: Failed to cleanup historical data in orchestrator destructor: {e}[/yellow]")

    async def _process_sql_query(
            self,
            request: QueryRequest,
            manager_decision: ManagerDecision,
    ) -> QueryProcessingResult:
        message = "Starting query generation..."
        print(f"[blue]{message}[/blue]")
        self.stream_service.add_message(StreamMessage(
            response_type=LlmResponseTypes.AGENT_STATUS,
            content=message
        ))

        iteration = 0
        previous_validation_feedback = None
        previous_improvement_suggestions = None
        previous_execution_error = None

        while iteration < self._MAX_ITERATIONS:
            iteration += 1
            print(f"[cyan]SQL Generation Attempt {iteration}/{self._MAX_ITERATIONS}[/cyan]")
            self.stream_service.add_message(StreamMessage(
                response_type=LlmResponseTypes.AGENT_THINKING,
                content="Generating query..."
            ))

            try:
                generation_request = QueryGenerationRequest(
                    user_message=request.user_message,
                    context={"manager_decision": manager_decision.model_dump()},
                    validation_feedback=previous_validation_feedback,
                    improvement_suggestions=previous_improvement_suggestions,
                    execution_error=previous_execution_error
                )
                generated_query = await self.query_generator_agent.generate_query(generation_request)

                self._processing_steps.append(
                    f"Iteration {iteration}: Generated query (confidence: {generated_query.confidence_score:.2f})")

                validation_request = ValidationRequest(
                    user_message=request.user_message,
                    generated_query=generated_query,
                )
                validation_result = await self.validator_agent.validate_query(validation_request)

                self._processing_steps.append(
                    f"Iteration {iteration}: Validation (confidence: {validation_result.confidence_score:.2f}, valid: {validation_result.is_valid})")
                self._record_historical_data(
                    request=request,
                    generated_query=generated_query,
                    validation_result=validation_result,
                    iteration=iteration
                )

                if validation_result.has_security_error or (
                        validation_result.is_valid and validation_result.confidence_score >= CONFIDENCE_THRESHOLD):
                    result = QueryProcessingResult(
                        success=True,
                        sql_query=generated_query.sql_query,
                        explanation=generated_query.explanation,
                        validation_result=validation_result,
                        error_message=None,
                        processing_steps=self._processing_steps,
                        all_data=validation_result.all_data,
                        confidence_score=validation_result.confidence_score
                    )
                    async for analysis_chunk in self.business_analyst.analyze_result(result, request.user_message):
                        self.stream_service.add_message(StreamMessage(
                            response_type=LlmResponseTypes.LLM_RESPONSE,
                            content=analysis_chunk
                        ))

                    if result.all_data:
                        self.stream_service.add_message(StreamMessage(
                            response_type=LlmResponseTypes.RETRIEVED_DATA,
                            content="Sources used for the response.",
                            data={"sources": result.all_data}
                        ))
                        all_customer_ids = [data.get("id", "") for data in result.all_data]
                        customer_data = self.customer_repository.get_customer_by_id(all_customer_ids)
                        if customer_data:
                            self.stream_service.add_message(StreamMessage(
                                response_type=LlmResponseTypes.AGENT_STATUS,
                                content="Generating marketing campaign messages..."
                            ))
                            is_marketing_messages_needed = await self.marketing_agent.is_marketing_messages_needed(
                                request.user_message,
                            )
                            if is_marketing_messages_needed:
                                properties = Customer.get_referable_properties()
                                self.stream_service.add_message(StreamMessage(
                                    response_type=LlmResponseTypes.GENERATING_CHANNEL_MESSAGE,
                                    content="Generating messages for marketing channels..."
                                ))
                                campaign_messages = await self.marketing_agent.generate_campaign_messages(result,
                                                                                                          request.user_message,
                                                                                                          properties)
                                enriched_messages = self.marketing_agent.enrich_messages_with_customer_data(
                                    campaign_messages, customer_data, [p[0] for p in properties]
                                )
                                self.stream_service.add_message(StreamMessage(
                                    response_type=LlmResponseTypes.CHANNEL_MESSAGE,
                                    content="Marketing campaign messages generated",
                                    data={"channels": enriched_messages}
                                ))
                    self.stream_service.add_message(StreamMessage(
                        response_type=LlmResponseTypes.QUERY_PROCESSING_RESULT,
                        content=f"Query validated successfully on attempt {iteration}",
                        data=result.model_dump()
                    ))
                    self._processing_steps.append(f"Success on iteration {iteration}")
                    await asyncio.sleep(0.1)
                    print("[green]Orchestrator calling end_streaming() - SUCCESS case[/green]")
                    self.stream_service.end_streaming()
                    await asyncio.sleep(0.1)
                    return result

                else:
                    print(
                        f"[yellow]Validation failed (confidence: {validation_result.confidence_score:.2f}). " + f"{'Retrying...' if iteration < self._MAX_ITERATIONS else 'Using best attempt.'}[/yellow]")
                    self.stream_service.add_message(StreamMessage(
                        response_type=LlmResponseTypes.AGENT_THINKING,
                        content="Evaluating query..."
                    ))

                    if iteration < self._MAX_ITERATIONS:
                        previous_validation_feedback = validation_result.low_confidence_explanation
                        previous_improvement_suggestions = validation_result.improvement_suggestions
                        previous_execution_error = validation_result.error_message

                        self._processing_steps.append(
                            f"Iteration {iteration} failed: {validation_result.validation_details}...")

                        if previous_validation_feedback:
                            print(f"[magenta]Feedback for next attempt: {previous_validation_feedback}...[/magenta]")

                        if previous_execution_error:
                            print(f"[red]SQL execution error to fix: {previous_execution_error}...[/red]")

                        await asyncio.sleep(0.5)

            except Exception as e:
                error_msg = f"Iteration {iteration} error: {str(e)}"
                self._processing_steps.append(error_msg)
                self.stream_service.add_message(StreamMessage(
                    response_type=LlmResponseTypes.SERVER_ERROR,
                    content=error_msg
                ))

                if iteration == self._MAX_ITERATIONS:
                    break

                await asyncio.sleep(0.5)
        raise Exception(f"Failed to generate valid SQL query after {self._MAX_ITERATIONS} attempts")

    async def _process_general_query(
            self,
            request: QueryRequest,
            manager_decision: ManagerDecision,
    ) -> QueryProcessingResult:
        self.stream_service.add_message(StreamMessage(
            response_type=LlmResponseTypes.AGENT_STATUS,
            content="Processing as general query..."
        ))

        try:
            response_chunks = []
            async for chunk in self.manager_agent.handle_general_query(request, manager_decision):
                self.stream_service.add_message(StreamMessage(
                    response_type=LlmResponseTypes.LLM_RESPONSE,
                    content=chunk
                ))
                response_chunks.append(chunk)
            full_response = "".join(response_chunks)
            self._processing_steps.append("Manager handled general query successfully")

            result = QueryProcessingResult(
                success=True,
                sql_query=None,
                explanation=full_response,
                validation_result=None,
                error_message=None,
                processing_steps=self._processing_steps
            )
            self.stream_service.add_message(StreamMessage(
                response_type=LlmResponseTypes.GENERAL_QUERY_RESPONSE,
                content="General query handled successfully",
                data=result.model_dump()
            ))

            await asyncio.sleep(0.1)
            self.stream_service.end_streaming()
            return result

        except Exception as e:
            error_msg = f"General query processing error: {str(e)}"
            self._processing_steps.append(error_msg)
            self.stream_service.end_streaming()
            return QueryProcessingResult(
                success=False,
                sql_query=None,
                explanation=None,
                validation_result=None,
                error_message=error_msg,
                processing_steps=self._processing_steps
            )

    def _record_historical_data(self,
                                request,
                                generated_query,
                                validation_result,
                                iteration: int):
        try:
            self.query_generator_agent.add_validation_result(
                user_message=request.user_message,
                generated_query=generated_query.sql_query,
                validation_result=validation_result
            )
            print(f"[green]Validation result stored for learning (Iteration {iteration})[/green]")

        except Exception as e:
            print(f"[yellow]Warning: Failed to store validation result: {e}[/yellow]")

    def _handle_processing_step(self):
        print("\n[bold blue]Process flow steps[/bold blue]\n")
        for i, step in enumerate(self._processing_steps, start=1):
            print(f"[cyan]Step {i}/{len(self._processing_steps)}:[/cyan] {step}")

    async def process_query(self, request: QueryRequest):
        """
        The main entry point for processing user queries through the agentic system.

        Flow:
        1. Manager analyzes query and decides routing
        2. If SQL is needed: Query Generator -> Validator -> (retry if invalid)
        3. If general: Manager handles directly
        4. Return final result

        """
        message = f"Start processing query: '{request.user_message[:50]}...'"
        print(f"[bold green]{message}[/bold green]")
        self.stream_service.add_message(StreamMessage(
            response_type=LlmResponseTypes.AGENT_STATUS,
            content=message
        ))

        try:
            message = "Analyzing query intent..."
            print(f"[blue]{message}[/blue]")
            self.stream_service.add_message(StreamMessage(
                response_type=LlmResponseTypes.AGENT_THINKING,
                content=message
            ))
            chat_history = self.chat_repository.get_history(limit=self._HISTORICAL_CONTEXT_RETRIEVAL_LIMIT)
            original_message = request.user_message
            request.user_message = await self.paraphrase_agent.paraphrase_query(request.user_message, chat_history)

            if request.user_message != original_message:
                message = f"Enhanced query with LLM-analyzed conversation context"
                print(f"[cyan]{message}[/cyan]")
                self.stream_service.add_message(StreamMessage(
                    response_type=LlmResponseTypes.AGENT_THINKING,
                    content=message
                ))
                self._processing_steps.append(
                    f"LLM-enhanced query: '{original_message}' → '{request.user_message[:100]}...'")
            else:
                message = f"LLM analyzed query - determined no context needed"
                print(f"[blue]{message}[/blue]")
                self.stream_service.add_message(StreamMessage(
                    response_type=LlmResponseTypes.AGENT_THINKING,
                    content=message
                ))
                self._processing_steps.append("LLM analysis: Query is standalone, no context enhancement needed")
            manager_decision = await self.manager_agent.analyze_query(request)
            self._processing_steps.append(
                f"Manager decision: {manager_decision.query_type} query (confidence: {manager_decision.confidence_score:.2f})")

            if manager_decision.should_use_sql_agent:
                await self._process_sql_query(request, manager_decision)
            else:
                await self._process_general_query(request, manager_decision)

            self._handle_processing_step()

        except Exception as e:
            error_msg = f"Orchestrator error: {str(e)}"
            print(f"[red]{error_msg}[/red]")
            self.stream_service.add_message(StreamMessage(
                response_type=LlmResponseTypes.SERVER_ERROR,
                content=error_msg
            ))
            self.stream_service.end_streaming()
