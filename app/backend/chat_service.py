import os
import re
import asyncio
from typing import Dict, Tuple, Callable, Iterator, Any, Optional

from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from langchain_community.chat_message_histories import ChatMessageHistory
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain.agents import create_agent
from langchain_mcp_adapters.client import MultiServerMCPClient

from utils import load_file
from langchain_llm_provider import get_llm

from state import get_thread_store, get_session_history
from db import ensure_chat_session, save_chat_message


# =============================
# Configuration
# =============================
CURRENT_DIR = os.path.dirname(__file__)
PROMPT_FILE = os.path.join(CURRENT_DIR, "prompts", "multi-agent-prompt-engineer.yaml")
DEFAULT_MCP_SERVER_URL = os.getenv("LLM_MCP_SERVER_URL", "http://localhost:9000/mcp")


def _run_async(coro):
    return asyncio.run(coro)


def _content_to_text(content: Any) -> str:
    if isinstance(content, str):
        return content

    if isinstance(content, list):
        text_parts = []
        for part in content:
            if isinstance(part, str):
                text_parts.append(part)
            elif isinstance(part, dict) and part.get("type") == "text":
                text_value = part.get("text")
                if text_value:
                    text_parts.append(text_value)
        if text_parts:
            return "\n".join(text_parts)

    return str(content)


def _history_to_agent_messages(history: ChatMessageHistory) -> list[dict]:
    messages: list[dict] = []
    for msg in history.messages:
        if isinstance(msg, HumanMessage):
            messages.append({"role": "user", "content": msg.content})
        elif isinstance(msg, AIMessage):
            messages.append({"role": "assistant", "content": msg.content})
    return messages


def _build_normal_mode_system_prompt(system_messages: list[SystemMessage]) -> str:
    prompt_parts = [msg.content for msg in system_messages if getattr(msg, "content", None)]
    prompt_parts.append(
        "You can use the MCP tool 'search_web_information' to fetch real-time web information. "
        "Use this tool only when the user query needs up-to-date or external factual data. "
        "For general reasoning, coding, writing, and stable knowledge answers, respond directly without tool use."
    )
    return "\n\n".join(prompt_parts)


async def _process_normal_mode_message_async(thread_state: Dict[str, Any], message: str) -> str:
    mcp_client = MultiServerMCPClient(
        {
            "web_search": {
                "url": DEFAULT_MCP_SERVER_URL,
                "transport": "streamable_http",
            }
        }
    )
    tools = await mcp_client.get_tools()

    agent = create_agent(
        model=get_llm(thread_state.get("model")),
        tools=tools,
        system_prompt=_build_normal_mode_system_prompt(thread_state.get("system_message", [])),
    )

    agent_messages = _history_to_agent_messages(thread_state["history"])
    agent_messages.append({"role": "user", "content": message})

    result = await agent.ainvoke({"messages": agent_messages})
    response_messages = result.get("messages", []) if isinstance(result, dict) else []

    if not response_messages:
        return ""

    last_message = response_messages[-1]
    return _content_to_text(getattr(last_message, "content", last_message))


def _process_normal_mode_message(thread_state: Dict[str, Any], message: str) -> str:
    return _run_async(_process_normal_mode_message_async(thread_state, message))


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


def init_thread(
    thread_id: str,
    is_prompt_assistant: Optional[bool],
    model_key: Optional[str] = None,
    chat_id: Optional[str] = None,
) -> None:
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
        mode = "agent_assistant"
        system_message.append(
            SystemMessage(
                content=prompts["agent_task_analysis_and_decomposition"]["description"]
            )
        )
    elif is_prompt_assistant is True:
        mode = "prompt_assistant"
        system_message.append(
            SystemMessage(content=prompts["claude_prompt_generator"]["description"])
        )
    else:
        mode = "normal"

    store = get_thread_store()
    print(f"Requested Thread Id: {thread_id}")
    print(f"1. Available keys insude thread_store: {store.keys()}")

    if thread_id not in store:
        store[thread_id] = {
            "history": ChatMessageHistory(),
            "system_message": None,
            "is_streaming": "gemini" in (model_key or ""),
            "first_turn": True,
            "chat_id": chat_id,
            "model": model_key,
            "mode": mode,
        }

    store[thread_id].update(
        {
            "chat_with_history": chat_with_history,
            "system_message": system_message,
            "is_streaming": "gemini" in (model_key or ""),
            "first_turn": True,
            "chat_id": chat_id,
            "model": model_key,
            "mode": mode,
            "config": {"configurable": {"session_id": thread_id}},
        }
    )

    if chat_id:
        ensure_chat_session(chat_id)

    print(f"2. Available keys insude thread_store: {store.keys()}")


def _stream_prompt_generator(
    chat_with_history,
    message: str,
    config,
    *,
    chat_id: Optional[str],
    thread_id: str,
    model: Optional[str],
) -> Iterator[str]:
    try:
        response_content = ""
        for chunk in chat_with_history.stream(message, config=config):
            if hasattr(chunk, "content"):
                content = format_llm_response(chunk.content)
            else:
                content = format_llm_response(str(chunk))
            response_content += content
            yield content

        if chat_id and response_content.strip():
            save_chat_message(
                chat_id=chat_id,
                thread_id=thread_id,
                role="assistant",
                content=response_content,
                model=model,
            )
    except Exception as e:
        print(f"Streaming error: {e}")
        yield f"Error: {str(e)}"


def _stream_task_generator(
    chat_with_history,
    tasks: Dict[str, str],
    config,
    *,
    chat_id: Optional[str],
    thread_id: str,
    model: Optional[str],
) -> Iterator[str]:
    try:
        combined_response = ""
        for task_num, task in tasks.items():
            section_header = f"\n--- Processing Task {task_num} ---\n"
            combined_response += section_header
            yield section_header
            for chunk in chat_with_history.stream(task, config=config):
                if hasattr(chunk, "content"):
                    content = format_llm_response(chunk.content)
                else:
                    content = format_llm_response(str(chunk))
                combined_response += content
                yield content
            combined_response += "\n\n"
            yield "\n\n"

        if chat_id and combined_response.strip():
            save_chat_message(
                chat_id=chat_id,
                thread_id=thread_id,
                role="assistant",
                content=combined_response,
                model=model,
            )
    except Exception as e:
        print(f"Streaming error: {e}")
        yield f"Error: {str(e)}"


def process_message(
    thread_id: str,
    message: str,
    *,
    chat_id: Optional[str] = None,
    model: Optional[str] = None,
) -> Tuple[str, Any]:
    """Process a user message. Returns ('stream', generator) or ('json', payload)."""
    store = get_thread_store()
    if thread_id not in store:
        if model:
            init_thread(
                thread_id=thread_id,
                is_prompt_assistant=None,
                model_key=model,
                chat_id=chat_id,
            )
        else:
            return (
                "json",
                {"message": "Please Type 'start'/ 'start prompt assistant'/ 'start agent assistant' to start the session"},
            )

    thread_state = store[thread_id]
    resolved_chat_id = chat_id or thread_state.get("chat_id")
    resolved_model = model or thread_state.get("model")

    if resolved_chat_id:
        thread_state["chat_id"] = resolved_chat_id
        ensure_chat_session(resolved_chat_id)

    if resolved_model:
        thread_state["model"] = resolved_model

    chat_with_history = thread_state["chat_with_history"]
    config = thread_state["config"]
    system_message = thread_state["system_message"]
    first_turn = thread_state["first_turn"]
    is_streaming = thread_state["is_streaming"]

    if first_turn:
        for msg in system_message:
            thread_state["history"].add_message(msg)
        thread_state["first_turn"] = False

    if resolved_chat_id:
        save_chat_message(
            chat_id=resolved_chat_id,
            thread_id=thread_id,
            role="user",
            content=message,
            model=resolved_model,
        )

    mode = thread_state.get("mode", "normal")
    if mode == "normal":
        try:
            response_content = _process_normal_mode_message(thread_state, message)
            response_content = format_llm_response(response_content)

            thread_state["history"].add_user_message(message)
            thread_state["history"].add_ai_message(response_content)

            if resolved_chat_id and response_content.strip():
                save_chat_message(
                    chat_id=resolved_chat_id,
                    thread_id=thread_id,
                    role="assistant",
                    content=response_content,
                    model=resolved_model,
                )

            return ("json", {"message": response_content})
        except Exception as e:
            print(f"Normal mode (MCP agent) error: {e}")
            return ("json", {"message": f"Error: {str(e)}"})

    msg_lower = message.lower()
    if "generate prompt" in msg_lower or "generate prompts" in msg_lower:
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
            return (
                "stream",
                _stream_task_generator(
                    chat_with_history,
                    all_subtasks,
                    config,
                    chat_id=resolved_chat_id,
                    thread_id=thread_id,
                    model=resolved_model,
                ),
            )
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

                if resolved_chat_id and combined_response.strip():
                    save_chat_message(
                        chat_id=resolved_chat_id,
                        thread_id=thread_id,
                        role="assistant",
                        content=combined_response,
                        model=resolved_model,
                    )

                return ("json", {"message": combined_response, "individual_responses": all_responses})
            except Exception as e:
                print(f"Non-streaming error: {e}")
                return ("json", {"message": f"Error: {str(e)}"})

    else:
        if is_streaming:
            return (
                "stream",
                _stream_prompt_generator(
                    chat_with_history,
                    message,
                    config,
                    chat_id=resolved_chat_id,
                    thread_id=thread_id,
                    model=resolved_model,
                ),
            )
        else:
            try:
                response = chat_with_history.invoke(message, config=config)
                if hasattr(response, "content"):
                    response_content = format_llm_response(response.content)
                else:
                    response_content = format_llm_response(str(response))

                if resolved_chat_id and response_content.strip():
                    save_chat_message(
                        chat_id=resolved_chat_id,
                        thread_id=thread_id,
                        role="assistant",
                        content=response_content,
                        model=resolved_model,
                    )

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

