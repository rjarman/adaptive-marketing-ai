import json

from pydantic import BaseModel

from core.llm_handler import openai_client
from core.prompt_hanlder import SYSTEM_PROMPT
from core.settings import settings
from models.schemas import QueryRequest, LlmResponseTypes
from services.stream_service import stream_service, StreamMessage


class ManagerDecision(BaseModel):
    should_use_sql_agent: bool
    reasoning: str
    confidence_score: float
    query_type: str


class ManagerAgent:
    _MANAGER_AGENT_TEMPERATURE = 0.7
    _MANAGER_AGENT_GENERAL_QUERY_TEMPERATURE = 0.3

    _MANAGER_AGENT_MAX_TOKENS = 128

    @staticmethod
    def _get_system_prompt() -> str:
        return """You are the Manager Agent in a customer campaign analysis system.

Your primary role is to analyze user queries and determine the appropriate action:

1. **Campaign/SQL Queries**: These are queries about customer segmentation, campaigns, marketing analysis, or database queries.
   Examples:
   - "Create a campaign for customers who added items to cart but didn't buy in last 7 days"
   - "Find high-value customers who haven't purchased recently"  
   - "Show me customers with high engagement scores"
   - "Get customers who accept marketing from Shopify"

2. **General Queries**: These are conversational queries not related to customer data analysis.
   Examples:
   - "What is your purpose?"
   - "How does this system work?"
   - "What can you help me with?"

For campaign/SQL queries, you should orchestrate the Query Generator and Validator agents.
For general queries, provide a helpful response based on your system knowledge.

**System Context:**
- You have access to a customer database with comprehensive customer data
- The system specializes in customer segmentation and campaign creation
- Available data sources: Website, Shopify, CRM systems
- Customer data includes: engagement scores, purchase history, lifecycle stages, preferences

**Decision Criteria:**
- Use SQL agents for: campaigns, customer analysis, segmentation, marketing queries, database requests
- Handle directly for: system questions, general conversation, help requests

Respond in JSON format with your decision and reasoning."""

    async def analyze_query(self, request: QueryRequest) -> ManagerDecision:
        # @todo make sure query has read only operation
        stream_service.add_message(StreamMessage(
            response_type=LlmResponseTypes.AGENT_STATUS,
            content=f"🧠 Manager analyzing query: '{request.user_message[:50]}...'"
        ))

        try:
            messages = [
                {"role": "system", "content": self._get_system_prompt()},
                {"role": "user", "content": f"""
Analyze this user query and determine if it should be handled by SQL agents or as a general query:

Query: "{request.user_message}"

Respond with a JSON object containing:
- should_use_sql_agent: boolean
- reasoning: string explaining your decision
- confidence_score: float between 0-1
- query_type: "campaign", "general", or "sql_direct"
"""}
            ]

            response = await openai_client.chat.completions.create(
                model=settings.openai_model,
                messages=messages,
                temperature=self._MANAGER_AGENT_TEMPERATURE,
                max_tokens=self._MANAGER_AGENT_MAX_TOKENS
            )

            response_content = response.choices[0].message.content

            try:
                start_idx = response_content.find('{')
                end_idx = response_content.rfind('}') + 1
                if start_idx != -1 and end_idx != -1:
                    json_str = response_content[start_idx:end_idx]
                    decision_data = json.loads(json_str)
                else:
                    raise ValueError("No JSON found in response")

            except (json.JSONDecodeError, ValueError):
                raise ValueError("Failed to parse JSON from response")

            decision = ManagerDecision(**decision_data)
            stream_service.add_message(StreamMessage(
                response_type=LlmResponseTypes.AGENT_STATUS,
                content=f"📊 Decision: {'SQL Agent' if decision.should_use_sql_agent else 'General Response'} "
                        f"(confidence: {decision.confidence_score:.2f})"
            ))
            print(f"Manager decision: {decision.model_dump()}")
            return decision

        except Exception as e:
            stream_service.add_message(StreamMessage(
                response_type=LlmResponseTypes.SERVER_ERROR,
                content=f"Manager Agent analysis error: {str(e)}"
            ))
            raise Exception("Failed to analyze query") from e

    async def handle_general_query(self, request: QueryRequest, manager_decision: ManagerDecision) -> str:
        # @todo from manager decision explain if there any operation except read only
        stream_service.add_message(StreamMessage(
            response_type=LlmResponseTypes.AGENT_STATUS,
            content="💬 Manager Agent handling general query"
        ))

        try:
            messages = [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": request.user_message}
            ]
            # @todo make query streamable in chunk
            response = await openai_client.chat.completions.create(
                model=settings.openai_model,
                messages=messages,
                temperature=self._MANAGER_AGENT_GENERAL_QUERY_TEMPERATURE
            )
            result = response.choices[0].message.content
            print(f"Manager response: {result}")
            return result

        except Exception as e:
            error_msg = f"Error handling general query: {str(e)}"
            stream_service.add_message(StreamMessage(
                response_type=LlmResponseTypes.SERVER_ERROR,
                content=error_msg
            ))
            return "I apologize, but I encountered an error while processing your request. Please try again or rephrase your question."
