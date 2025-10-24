from fastapi import Depends, APIRouter
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from models import get_db
from models.schemas import ChatHistoryResponse, ChatMessageResponse
from services.chat_service import ChatService

router = APIRouter(
    tags=["chat"],
)


@router.get("/stream")
async def chat_stream(message: str, db: Session = Depends(get_db)):
    service = ChatService(db)

    return StreamingResponse(
        service.stream_chat_response(message),
        media_type="text/event-stream",
    )


@router.get("/history", response_model=ChatHistoryResponse)
def get_chat_history(db: Session = Depends(get_db)):
    service = ChatService(db)
    messages = service.get_chat_history()

    return ChatHistoryResponse(
        messages=[
            ChatMessageResponse(
                id=msg.id,
                message=msg.message,
                response=msg.response,
                createdAt=msg.created_at,
                sources=msg.sources,
            )
            for msg in messages
        ]
    )


@router.delete("/history")
def clear_chat_history(db: Session = Depends(get_db)):
    service = ChatService(db)
    service.clear_chat_history()
    return {"message": "Chat history cleared successfully"}
