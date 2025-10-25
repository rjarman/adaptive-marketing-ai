from datetime import datetime
from enum import Enum
from typing import List, Optional, Dict, Any

from pydantic import BaseModel


class LlmResponseTypes(str, Enum):
    LLM_RESPONSE = "LLM_RESPONSE"
    SERVER_ERROR = "SERVER_ERROR"
    END_OF_STREAM = "END_OF_STREAM"
    AGENT_STATUS = "AGENT_STATUS"
    AGENT_THINKING = "AGENT_THINKING"
    SQL_QUERY = "SQL_QUERY"
    QUERY_PROCESSING_RESULT = "QUERY_PROCESSING_RESULT"
    RETRIEVED_DATA = "RETRIEVED_DATA"
    GENERAL_QUERY_RESPONSE = "GENERAL_QUERY_RESPONSE"
    CHANNEL_MESSAGE = "CHANNEL_MESSAGE"
    GENERATING_CHANNEL_MESSAGE = "GENERATING_CHANNEL_MESSAGE"


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
    sources: Optional[List[Dict[str, Any]]] = []
    createdAt: datetime
    channelMessages: Optional[List[Dict[str, Any]]] = []

    class Config:
        from_attributes = True


class ChatHistoryResponse(BaseModel):
    messages: List[ChatMessageResponse]


class IntegrationDeleteResponse(BaseModel):
    message: str
    customers_removed: int
    data_cleanup: str


class QueryRequest(BaseModel):
    user_message: str
    session_id: Optional[str] = None


class QueryValidationResult(BaseModel):
    is_valid: bool
    confidence_score: float
    validation_details: str
    all_data: Optional[List[Dict[str, Any]]] = None
    error_message: Optional[str] = None
    low_confidence_explanation: Optional[str] = None
    improvement_suggestions: Optional[List[str]] = None
    has_security_error: Optional[bool] = None


class GeneratedQuery(BaseModel):
    sql_query: str
    explanation: str
    confidence_score: float
    tables_used: List[str]


class QueryProcessingResult(BaseModel):
    success: bool
    sql_query: Optional[str] = None
    explanation: Optional[str] = None
    validation_result: Optional[QueryValidationResult] = None
    error_message: Optional[str] = None
    processing_steps: List[str] = []
    all_data: Optional[List[Dict[str, Any]]] = None
    confidence_score: Optional[float] = None
