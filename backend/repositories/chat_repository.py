from typing import List

from sqlalchemy.orm import Session

from models.models import ChatMessage


class ChatRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, message: str, response: str) -> ChatMessage:
        chat_message = ChatMessage(message=message, response=response)
        self.db.add(chat_message)
        self.db.commit()
        self.db.refresh(chat_message)
        return chat_message

    def get_history(self, limit: int = None) -> List[ChatMessage]:
        query = self.db.query(ChatMessage).order_by(ChatMessage.created_at.desc())
        if limit:
            query = query.limit(limit)
        return query.all()

    def clear_history(self) -> None:
        self.db.query(ChatMessage).delete()
        self.db.commit()
