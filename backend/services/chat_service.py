import json
from typing import AsyncGenerator

from sqlalchemy.orm import Session

from core.llm_handler import openai_client
from core.prompt_hanlder import SYSTEM_PROMPT
from core.settings import settings
from models.schemas import LlmResponseTypes
from repositories.chat_repository import ChatRepository


class ChatService:
    def __init__(self, db: Session):
        self.repository = ChatRepository(db)

    async def stream_chat_response(self, message: str) -> AsyncGenerator[str, None]:
        try:
            response_chunks = []

            messages = [
                {
                    "role": "system",
                    "content": SYSTEM_PROMPT
                },
                {"role": "user", "content": message}
            ]

            stream = await openai_client.chat.completions.create(
                model=settings.openai_model,
                messages=messages,
                stream=True
            )

            async for chunk in stream:
                if chunk.choices[0].delta.content is not None:
                    content = chunk.choices[0].delta.content
                    response_chunks.append(content)

                    sse_data = {
                        "responseType": LlmResponseTypes.LLM_RESPONSE,
                        "data": content
                    }
                    yield f"data: {json.dumps(sse_data)}\n\n"

            full_response = "".join(response_chunks)
            self.repository.create(message, full_response)
            end_data = {
                "responseType": LlmResponseTypes.END_OF_STREAM,
                "data": ""
            }
            yield f"data: {json.dumps(end_data)}\n\n"

        except Exception as e:
            error_data = {
                "responseType": LlmResponseTypes.END_OF_STREAM,
                "data": f"Error: {str(e)}"
            }
            yield f"data: {json.dumps(error_data)}\n\n"

    def get_chat_history(self):
        return self.repository.get_history()

    def clear_chat_history(self):
        return self.repository.clear_history()
