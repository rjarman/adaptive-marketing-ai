from typing import List, Dict, Any

from sqlalchemy.orm import Session

from models.models import ChatMessage


class ChatRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, msg_id: str, message: str, response: str, sources: List[Dict[str, Any]],
               channel_messages: List[Dict[str, Any]]) -> ChatMessage:
        chat_message = ChatMessage(
            id=msg_id,
            message=message,
            response=response,
            sources=sources if sources else [],
            channel_messages=channel_messages if channel_messages else [],
        )
        self.db.add(chat_message)
        self.db.commit()
        self.db.refresh(chat_message)
        return chat_message

    def get_history(self, limit: int = None) -> List[ChatMessage]:
        query = self.db.query(ChatMessage).order_by(ChatMessage.created_at.asc())
        if limit:
            query = query.limit(limit)
        return query.all()

    def clear_history(self) -> None:
        self.db.query(ChatMessage).delete()
        self.db.commit()

    def get_channel_messages(self, chat_id: str, channel: str):
        chat_message = self.db.query(ChatMessage).filter(ChatMessage.id == chat_id).first()
        if not chat_message:
            return []
        channel_messages = chat_message.channel_messages or []
        matched = [cm for cm in channel_messages if cm.get("channel") == channel]
        return matched
