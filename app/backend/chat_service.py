import os
import re
from typing import Dict, Tuple, Callable, Iterator, Any, Optional

from fastapi.responses import StreamingResponse  # only for media type constant
from langchain_core.messages import SystemMessage
from langchain_community.chat_message_histories import ChatMessageHistory
from langchain_core.runnables.history import RunnableWithMessageHistory

from utils import load_file
from langchain_llm_provider import get_llm

from state import get_thread_store, get_session_history


# =============================
# Configuration
# =============================
CURRENT_DIR = os.path.dirname(__file__)
PROMPT_FILE = os.path.join(CURRENT_DIR, "prompts", "multi-agent-prompt-engineer.yaml")


def format_llm_response(content: str) -> str:
    """Format LLM response by replacing XML-style tags with markdown formatting."""
    tag_mappings = {
        "Inputs": "Inputs",
        "Instructions Structure": "Instructions Structure",
        "Instructions": "Instructions",
    }

    formatted_content = content
    for tag, header in tag_mappings.items():
        opening_pattern = f"<{re.escape(tag)}>"
        closing_pattern = f"</{re.escape(tag)}>"
        formatted_content = re.sub(
            opening_pattern, f"## {header}\n```xml", formatted_content, flags=re.IGNORECASE
        )
        formatted_content = re.sub(
            closing_pattern, "```", formatted_content, flags=re.IGNORECASE
        )
    return formatted_content


def extract_subtasks(document_content: str) -> Dict[str, str]:
    """Extract subtask content from the updated medical report task analysis document."""
    subtask_pattern = r"Sub-Task (\d+):"
    sections = re.split(subtask_pattern, document_content)
    subtasks: Dict[str, str] = {}
    for i in range(1, len(sections), 2):
        if i + 1 < len(sections):
            task_number = sections[i]
            task_content = sections[i + 1].strip()
            subtasks[task_number] = task_content
    return subtasks


def load_prompts() -> Dict[str, Any]:
    return load_file(PROMPT_FILE, file_type="yaml")


def init_thread(thread_id: str, is_prompt_assistant: Optional[bool], model_key: Optional[str] = None) -> None:
    """Initialize a new conversation thread."""
    model = get_llm(model_key)
    prompts = load_prompts()

    chat_with_history = RunnableWithMessageHistory(model, get_session_history)

    system_message = []
    if model_key and model_key.startswith("gpt-5"):
        system_message.append(
            SystemMessage(content=prompts["markdown_instruction"]["description"])
        )

    if is_prompt_assistant is False:
        system_message.append(
            SystemMessage(
                content=prompts["agent_task_analysis_and_decomposition"]["description"]
            )
        )
    elif is_prompt_assistant is True:
        system_message.append(
            SystemMessage(content=prompts["claude_prompt_generator"]["description"])
        )

    store = get_thread_store()
    print(f"Requested Thread Id: {thread_id}")
    print(f"1. Available keys insude thread_store: {store.keys()}")

    if thread_id not in store:
        store[thread_id] = {
            "history": ChatMessageHistory(),
            "system_message": None,
            "is_streaming": "gemini" in (model_key or ""),
            "first_turn": True,
        }

    store[thread_id].update(
        {
            "chat_with_history": chat_with_history,
            "system_message": system_message,
            "is_streaming": "gemini" in (model_key or ""),
            "first_turn": True,
            "config": {"configurable": {"session_id": thread_id}},
        }
    )
    print(f"2. Available keys insude thread_store: {store.keys()}")


def _stream_prompt_generator(chat_with_history, message: str, config) -> Iterator[str]:
    try:
        response_content = ""
        for chunk in chat_with_history.stream(message, config=config):
            if hasattr(chunk, "content"):
                content = format_llm_response(chunk.content)
            else:
                content = format_llm_response(str(chunk))
            response_content += content
            yield content
    except Exception as e:
        print(f"Streaming error: {e}")
        yield f"Error: {str(e)}"


def _stream_task_generator(chat_with_history, tasks: Dict[str, str], config) -> Iterator[str]:
    try:
        for task_num, task in tasks.items():
            yield f"\n--- Processing Task {task_num} ---\n"
            for chunk in chat_with_history.stream(task, config=config):
                if hasattr(chunk, "content"):
                    content = format_llm_response(chunk.content)
                else:
                    content = format_llm_response(str(chunk))
                yield content
            yield "\n\n"
    except Exception as e:
        print(f"Streaming error: {e}")
        yield f"Error: {str(e)}"


def process_message(thread_id: str, message: str) -> Tuple[str, Any]:
    """Process a user message. Returns ('stream', generator) or ('json', payload)."""
    store = get_thread_store()
    if thread_id not in store:
        return (
            "json",
            {"message": "Please Type 'start'/ 'start prompt assistant'/ 'start agent assistant' to start the session"},
        )

    thread_state = store[thread_id]
    chat_with_history = thread_state["chat_with_history"]
    config = thread_state["config"]
    system_message = thread_state["system_message"]
    first_turn = thread_state["first_turn"]
    is_streaming = thread_state["is_streaming"]

    if first_turn:
        for msg in system_message:
            thread_state["history"].add_message(msg)
        thread_state["first_turn"] = False

    msg_lower = message.lower()
    if "generate" in msg_lower and ("prompt" in msg_lower or "prompts" in msg_lower):
        last_msg = thread_state["history"].messages[-1]
        if hasattr(last_msg, "content"):
            last_response = last_msg.content
        else:
            last_response = str(last_msg)

        all_subtasks = extract_subtasks(last_response)

        prompts = load_prompts()
        thread_state["history"] = ChatMessageHistory()
        thread_state["history"].add_message(
            SystemMessage(content=prompts["claude_prompt_generator"]["description"])
        )

        if is_streaming:
            return ("stream", _stream_task_generator(chat_with_history, all_subtasks, config))
        else:
            try:
                all_responses: Dict[str, str] = {}
                for task_num, task in all_subtasks.items():
                    response = chat_with_history.invoke(task, config=config)
                    if hasattr(response, "content"):
                        response_content = format_llm_response(response.content)
                    else:
                        response_content = format_llm_response(str(response))
                    all_responses[f"task_{task_num}"] = response_content

                combined_response = "\n\n".join(
                    [
                        f"--- Task {task_num.split('_')[1]} ---\n{content}"
                        for task_num, content in all_responses.items()
                    ]
                )
                return ("json", {"message": combined_response, "individual_responses": all_responses})
            except Exception as e:
                print(f"Non-streaming error: {e}")
                return ("json", {"message": f"Error: {str(e)}"})

    else:
        if is_streaming:
            return ("stream", _stream_prompt_generator(chat_with_history, message, config))
        else:
            try:
                response = chat_with_history.invoke(message, config=config)
                if hasattr(response, "content"):
                    response_content = format_llm_response(response.content)
                else:
                    response_content = format_llm_response(str(response))
                return ("json", {"message": response_content})
            except Exception as e:
                print(f"Non-streaming error: {e}")
                return ("json", {"message": f"Error: {str(e)}"})


def end_thread(thread_id: str) -> bool:
    store = get_thread_store()
    thread_state = store.pop(thread_id, None)
    if thread_state:
        print(f"Thread {thread_id} state removed.")
        return True
    else:
        print(f"Thread {thread_id} not found.")
        return False


def get_thread_history_data(thread_id: str) -> Dict[str, Any]:
    store = get_thread_store()
    if thread_id not in store:
        return {"error": "Thread not found"}
    history = store[thread_id]["history"]
    messages = []
    for msg in history.messages:
        messages.append({"type": msg.__class__.__name__, "content": msg.content})
    return {"thread_id": thread_id, "messages": messages}


def list_active_threads() -> Dict[str, Any]:
    store = get_thread_store()
    return {"active_threads": list(store.keys())}


def clear_all_threads() -> None:
    store = get_thread_store()
    for thread_id in list(store.keys()):
        end_thread(thread_id)

