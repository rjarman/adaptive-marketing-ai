from datetime import datetime
from enum import Enum
from typing import List

from pydantic import BaseModel


class LlmResponseTypes(str, Enum):
    LLM_RESPONSE = "LLM_RESPONSE"
    END_OF_STREAM = "END_OF_STREAM"


class DataSourceTypes(str, Enum):
    WEBSITE = "WEBSITE"
    SHOPIFY = "SHOPIFY"
    CRMS = "CRMS"


class IntegrationCreate(BaseModel):
    dataSource: DataSourceTypes


class IntegrationResponse(BaseModel):
    id: str
    dataSource: DataSourceTypes
    createdAt: datetime

    class Config:
        from_attributes = True


class ChatMessageResponse(BaseModel):
    id: str
    message: str
    response: str
    createdAt: datetime

    class Config:
        from_attributes = True


class ChatHistoryResponse(BaseModel):
    messages: List[ChatMessageResponse]


class IntegrationDeleteResponse(BaseModel):
    message: str
    customers_removed: int
    data_cleanup: str
