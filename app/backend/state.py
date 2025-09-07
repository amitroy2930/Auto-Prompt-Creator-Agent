from typing import Dict, Any

from langchain_community.chat_message_histories import ChatMessageHistory
from langchain_core.chat_history import BaseChatMessageHistory


# Global thread store (per conversation) - stores chat histories and configurations
_thread_store: Dict[str, Dict[str, Any]] = {}


def get_thread_store() -> Dict[str, Dict[str, Any]]:
    return _thread_store


def get_session_history(session_id: str) -> BaseChatMessageHistory:
    """Get or create chat message history for a session."""
    if session_id not in _thread_store:
        _thread_store[session_id] = {
            "history": ChatMessageHistory(),
            "system_message": None,
            "is_streaming": False,
            "first_turn": True,
        }
    return _thread_store[session_id]["history"]

