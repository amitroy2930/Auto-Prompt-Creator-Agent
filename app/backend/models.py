from typing import Literal, Optional

from pydantic import BaseModel


class StartRequest(BaseModel):
    thread_id: str
    chat_id: Optional[str] = None
    is_first_turn: Optional[bool] = None
    llm_name: Optional[str] = None


class EndRequest(BaseModel):
    thread_id: str


class MessageRequest(BaseModel):
    message: str
    thread_id: str
    chat_id: Optional[str] = None
    model: Optional[str] = None


class CreateChatRequest(BaseModel):
    title: Optional[str] = None


class ChatSessionResponse(BaseModel):
    id: str
    title: str
    created_at: str
    updated_at: str
    message_count: int = 0
    preview: Optional[str] = None


class MessageResponse(BaseModel):
    role: Literal["system", "user", "assistant"]
    content: str


class StreamResponse(BaseModel):
    message: str

