"""
llm_server.py - MCP server providing LLM tools via Tavily web search.
"""

import json
import logging
import os

from dotenv import load_dotenv
from langchain_community.tools.tavily_search import TavilySearchResults
from mcp.server.fastmcp import FastMCP

load_dotenv()

# ── Logging ──────────────────────────────────────────────────────────────────

logging.basicConfig(level=logging.WARNING)

_SILENT_LOGGERS = [
    "uvicorn", "uvicorn.error", "uvicorn.access",
    "httpx", "langchain", "langgraph",
    "langchain_mcp_adapters", "mcp", "fastmcp",
]
for _name in _SILENT_LOGGERS:
    _log = logging.getLogger(_name)
    _log.setLevel(logging.WARNING)
    _log.disabled = True

logger = logging.getLogger(__name__)

# ── Server ────────────────────────────────────────────────────────────────────

mcp = FastMCP("LLMService", log_level="ERROR", port=9000)

# ── Helpers ───────────────────────────────────────────────────────────────────

def _format_doc(doc: dict) -> str:
    content = doc.get("content", "").replace("\n", " ")
    while "  " in content:
        content = content.replace("  ", " ")
    return (
        f"Title: {doc.get('title')}\n"
        f"URL:   {doc.get('url')}\n"
        f"Content: {content}"
    )


async def _tavily_search(query: str, max_results: int = 2) -> str:
    tool = TavilySearchResults(
        max_results=max_results,
        tavily_api_key=os.getenv("TAVILY_API_KEY"),
    )
    docs = await tool.arun({"query": query})
    return "\n\n".join(_format_doc(d) for d in docs)

# ── Tools ─────────────────────────────────────────────────────────────────────

@mcp.tool()
async def search_web_information(query: str) -> str:
    """
    Perform a web search to retrieve relevant and up-to-date information for a given query.

    Args:
        query (str): The search query describing the information needed.

    Returns:
        str: A summarized result of the web search, or an error message if the search fails.
    """
    try:
        response = await _tavily_search(query)
        return response
    except FileNotFoundError as e:
        return f"Error: Context file not found — {e}"
    except json.JSONDecodeError as e:
        return f"Error: Invalid JSON in context file — {e}"
    except Exception as e:
        return f"Error processing patient info query: {e}"

# ── Entrypoint ────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    logger.debug("Starting LLM MCP Server on port 9000...")
    mcp.run(transport="streamable-http")