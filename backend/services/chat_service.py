import asyncio
import json
import uuid
from typing import AsyncGenerator

from rich import print
from sqlalchemy.orm import Session

from models.schemas import LlmResponseTypes, QueryRequest
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
            message_id = str(uuid.uuid4())
            yield f"data: {json.dumps(StreamMessage(response_type=LlmResponseTypes.SERVER_ERROR,
                                                    content=f"Chat service error: {str(e)}", message_id=message_id).model_dump())}\n\n"
            yield f"data: {json.dumps(StreamMessage(response_type=LlmResponseTypes.END_OF_STREAM, content="Stream completed", message_id=message_id).model_dump())}\n\n"

    async def _stream_agentic_response(self, request: QueryRequest) -> AsyncGenerator[str, None]:
        user_message = request.user_message
        message_id = str(uuid.uuid4())
        channel_messages = []
        response_chunks = []
        sources = []

        print(f"[cyan]Generated message_id: {message_id}[/cyan]")

        try:
            asyncio.create_task(
                self.orchestrator_service.process_query(request)
            )
            async for sse_message in self.stream_service.stream_messages():
                try:
                    message_data = json.loads(sse_message.replace("data: ", "").strip())
                    stream_msg = StreamMessage(**message_data)

                    if stream_msg.response_type == LlmResponseTypes.CHANNEL_MESSAGE:
                        channel_messages = stream_msg.data.get("channels", [])
                        all_channels = [msg.get("channel", "") for msg in channel_messages]
                        yield f"data: {json.dumps(StreamMessage(
                            response_type=LlmResponseTypes.CHANNEL_MESSAGE,
                            content="Marketing campaign messages generated",
                            data={"channels": all_channels},
                            message_id=message_id
                        ).model_dump())}\n\n"
                    elif stream_msg.response_type == LlmResponseTypes.RETRIEVED_DATA:
                        sources = stream_msg.data.get("sources", [])
                        stream_msg.message_id = message_id
                        yield f"data: {json.dumps(stream_msg.model_dump())}\n\n"
                    elif stream_msg.response_type == LlmResponseTypes.END_OF_STREAM:
                        print("[green]END_OF_STREAM received! Breaking loop...[/green]")
                        break
                    elif stream_msg.response_type == LlmResponseTypes.LLM_RESPONSE:
                        stream_msg.message_id = message_id
                        yield f"data: {json.dumps(stream_msg.model_dump())}\n\n"
                        response_chunks.append(stream_msg.content)
                    else:
                        stream_msg.message_id = message_id
                        yield f"data: {json.dumps(stream_msg.model_dump())}\n\n"

                except Exception as parse_error:
                    print(f"[yellow]Failed to parse stream message: {parse_error}[/yellow]")
                    yield f"data: {json.dumps(StreamMessage(response_type=LlmResponseTypes.SERVER_ERROR, content=f"Stream message parse error: {str(parse_error)}", message_id=message_id).model_dump())}\n\n"

            if response_chunks:
                full_response = "".join(response_chunks)
                try:
                    self.repository.create(message_id, user_message, full_response, sources, channel_messages)
                except Exception as save_error:
                    try:
                        self.db.rollback()
                        self.repository.create(message_id, request.user_message, full_response, sources,
                                               channel_messages)
                        print(
                            f"[green]Chat history saved successfully after rollback.[/green]"
                        )
                    except Exception as rollback_error:
                        print(f"[red]Failed to save chat history: {str(save_error)}[/red]")
                        print(f"[red]Failed to save chat history after rollback: {str(rollback_error)}[/red]")
                        yield f"data: {json.dumps(StreamMessage(response_type=LlmResponseTypes.SERVER_ERROR, content=f"Failed to save chat history: {str(save_error)}", message_id=message_id).model_dump())}\n\n"
        except Exception as e:
            yield f"data: {json.dumps(StreamMessage(response_type=LlmResponseTypes.SERVER_ERROR, content=f"Agentic response error: {str(e)}", message_id=message_id).model_dump())}\n\n"
        finally:
            yield f"data: {json.dumps(StreamMessage(response_type=LlmResponseTypes.END_OF_STREAM, content="Stream completed", message_id=message_id).model_dump())}\n\n"

    def get_chat_history(self):
        return self.repository.get_history()

    def clear_chat_history(self):
        return self.repository.clear_history()

    def get_channel_messages(self, chat_id: str, channel: str):
        return self.repository.get_channel_messages(chat_id, channel)
