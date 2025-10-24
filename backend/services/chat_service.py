import asyncio
import json
from typing import AsyncGenerator

from rich import print
from sqlalchemy.orm import Session

from models.schemas import LlmResponseTypes, QueryRequest, QueryProcessingResult
from repositories.chat_repository import ChatRepository
from services.agents.orchestrator_service import OrchestratorService
from services.stream_service import StreamMessage, StreamService


class ChatService:
    def __init__(self, db: Session):
        self.stream_service = StreamService()
        self.repository = ChatRepository(db)
        self.db = db
        self.orchestrator_service = OrchestratorService(db, self.stream_service)

    async def stream_chat_response(self, message: str) -> AsyncGenerator[str, None]:
        try:
            request = QueryRequest(user_message=message)
            async for sse_chunk in self._stream_agentic_response(request):
                yield sse_chunk

        except Exception as e:
            yield f"data: {json.dumps(StreamMessage(response_type=LlmResponseTypes.SERVER_ERROR,
                                                    content=f"Chat service error: {str(e)}").model_dump())}\n\n"
            yield f"data: {json.dumps(StreamMessage(response_type=LlmResponseTypes.END_OF_STREAM, content="Stream completed").model_dump())}\n\n"

    async def _stream_agentic_response(self, request: QueryRequest) -> AsyncGenerator[str, None]:
        response_chunks = []

        try:
            asyncio.create_task(
                self.orchestrator_service.process_query(request)
            )
            async for sse_message in self.stream_service.stream_messages():
                try:
                    message_data = json.loads(sse_message.replace("data: ", "").strip())
                    stream_msg = StreamMessage(**message_data)

                    if stream_msg.response_type == LlmResponseTypes.QUERY_PROCESSING_RESULT:
                        result = QueryProcessingResult(**stream_msg.data)
                        if result.success and result.sql_query:
                            yield f"data: {json.dumps(StreamMessage(
                                response_type=LlmResponseTypes.SQL_QUERY,
                                content=f"```sql\n{result.sql_query}\n```"
                            ).model_dump())}\n\n"
                            response_chunks.append(f"```sql\n{result.sql_query}\n```\n\n")
                        if result and result.success and result.explanation:
                            yield f"data: {json.dumps(StreamMessage(response_type=LlmResponseTypes.LLM_RESPONSE, content=result.explanation).model_dump())}\n\n"
                            response_chunks.append(result.explanation)
                    elif stream_msg.response_type == LlmResponseTypes.END_OF_STREAM:
                        print("[green]END_OF_STREAM received! Breaking loop...[/green]")
                        break
                    else:
                        yield f"data: {json.dumps(stream_msg.model_dump())}\n\n"

                except Exception as parse_error:
                    print(f"[yellow]Failed to parse stream message: {parse_error}[/yellow]")
                    yield f"data: {json.dumps(StreamMessage(response_type=LlmResponseTypes.SERVER_ERROR, content=f"Stream message parse error: {str(parse_error)}").model_dump())}\n\n"

            if response_chunks:
                full_response = " ".join(response_chunks)
                try:
                    self.repository.create(request.user_message, full_response)
                except Exception as save_error:
                    try:
                        self.db.rollback()
                        self.repository.create(request.user_message, full_response)
                    except:
                        print(f"[red]Failed to save chat history: {str(save_error)}[/red]")
                        yield f"data: {json.dumps(StreamMessage(response_type=LlmResponseTypes.SERVER_ERROR, content=f"Failed to save chat history: {str(save_error)}").model_dump())}\n\n"
        except Exception as e:
            yield f"data: {json.dumps(StreamMessage(response_type=LlmResponseTypes.SERVER_ERROR, content=f"Agentic response error: {str(e)}").model_dump())}\n\n"
        finally:
            yield f"data: {json.dumps(StreamMessage(response_type=LlmResponseTypes.END_OF_STREAM, content="Stream completed").model_dump())}\n\n"

    def get_chat_history(self):
        return self.repository.get_history()

    def clear_chat_history(self):
        return self.repository.clear_history()
