from typing import Literal, Optional

from pydantic import BaseModel


class StartRequest(BaseModel):
    thread_id: str
    is_first_turn: Optional[bool] = None
    llm_name: Optional[str] = None


class EndRequest(BaseModel):
    thread_id: str


class MessageRequest(BaseModel):
    message: str
    thread_id: str


class MessageResponse(BaseModel):
    role: Literal["system", "user", "assistant"]
    content: str


class StreamResponse(BaseModel):
    message: str

