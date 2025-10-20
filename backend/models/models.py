import uuid
from datetime import datetime

from sqlalchemy import Column, String, DateTime, Text

from models import Base


class Integration(Base):
    __tablename__ = "integrations"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    data_source = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    message = Column(Text, nullable=False)
    response = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
