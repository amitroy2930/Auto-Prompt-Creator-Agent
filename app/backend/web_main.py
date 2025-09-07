"""FastAPI entrypoint for Auto Prompt Creator backend (refactored)."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from models import StartRequest, EndRequest, MessageRequest
from chat_service import (
    init_thread,
    process_message,
    end_thread,
    get_thread_history_data,
    list_active_threads,
    clear_all_threads,
)


# =============================
# Lifespan Event Handlers
# =============================
@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    clear_all_threads()
    print("All threads cleared and server stopped.")


# =============================
# FastAPI Setup
# =============================
app = FastAPI(
    title="Auto Prompt Creator API",
    version="1.0.0",
    description="Backend service for managing AI-driven multi-agent prompts",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =============================
# Routes
# =============================
@app.post("/api/start")
def start_chat(body: StartRequest):
    """Start a new chat session."""
    init_thread(body.thread_id, body.is_first_turn, body.llm_name)
    return {"ok": True, "thread_id": body.thread_id}


@app.post("/api/message")
def send_message(body: MessageRequest):
    """Send a user message to the thread and get AI response."""
    kind, payload = process_message(body.thread_id, body.message)
    if kind == "stream":
        return StreamingResponse(payload, media_type="text/event-stream")
    return payload


@app.post("/api/end")
def end_chat(body: EndRequest):
    """End a chat session and clear memory."""
    end_thread(body.thread_id)
    return {"ok": True}


# =============================
# Additional utility endpoints
# =============================
@app.get("/api/thread/{thread_id}/history")
def get_thread_history(thread_id: str):
    """Get conversation history for a thread (useful for debugging)."""
    return get_thread_history_data(thread_id)


@app.get("/api/threads")
def list_threads():
    """List all active threads."""
    return list_active_threads()


# =============================
# Run with Uvicorn
# =============================
if __name__ == "__main__":
    import uvicorn

    uvicorn.run("web_main:app", host="0.0.0.0", port=8001, reload=True)
