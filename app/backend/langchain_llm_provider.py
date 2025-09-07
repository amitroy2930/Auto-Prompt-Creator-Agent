# app/llm_provider.py
 
import os
import sys
import json
from dotenv import load_dotenv
from langchain_google_vertexai import ChatVertexAI
from google.oauth2 import service_account
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic
from langchain.callbacks.streaming_stdout import StreamingStdOutCallbackHandler

# Ensure .env at app/.env is loaded regardless of CWD
CURRENT_DIR = os.path.dirname(__file__)
ENV_PATH = os.path.join(CURRENT_DIR, "..", ".env")
load_dotenv(dotenv_path=os.path.abspath(ENV_PATH))
 
def get_llm(model_key: str):
    """
    Returns an LLM config compatible with `llm=` param of crewai.Agent.
    """
    # 1. Load agent-specific model override
    model_name = os.getenv(model_key)
    if not model_name:
        model_name = os.getenv("DEFAULT_MODEL")
        print(f"Model key '{model_key}' not found in environment variables. We are using the default model '{model_name}'.")
    else:
        print(f"Using model '{model_name}' from environment variable '{model_key}'.")
        
    if model_name.startswith("vertex_ai/"):
        creds_path = os.getenv("VERTEXAI_CREDS_PATH")
        # vertex_creds_json = None
        vertex_project = os.getenv("GoogleArtifactRegistrySettings__ProjectId")

        vertex_credentials_info = {}
        if creds_path and os.path.isfile(creds_path):
            with open(creds_path, "r") as file:
                vertex_credentials_info = json.load(file)
        else:
            print(f"Credentials file not found at {creds_path}. Please check the path.")
            sys.exit(1)
        

        credentials = service_account.Credentials.from_service_account_info(vertex_credentials_info)
        
        streaming = "gemini" in model_name
 
        llm = ChatVertexAI(
            model=model_name.replace("vertex_ai/", ""),
            credentials=credentials,
            temperature=0.5,
            max_tokens=8192,
            max_retries=2,
            # streaming=True,
            # callbacks=[StreamingStdOutCallbackHandler()] if streaming else [],
            model_kwargs={"project_id": vertex_project} if vertex_project else {}
        )
 
        return llm
    
    elif model_name.startswith("openai/"):
        return ChatOpenAI(
            model=model_name.replace("openai/", ""),
            temperature=1,
            max_tokens=81920 if model_name.startswith("gpt-5") else 8192,
            openai_api_key=os.getenv("OPENAI_API_KEY"),
            openai_api_base=os.getenv("OPENAI_API_BASE")
        )
    
    elif model_name.startswith("anthropic/"):
        print("   Initializing Anthropic Claude model...")
        return ChatAnthropic(
            model=model_name.replace("anthropic/", ""),
            temperature=0.7,
            max_tokens=8192, # Claude models support very large contexts, but this is a safe default for output length
            anthropic_api_key=os.getenv("ANTHROPIC_API_KEY"),
            anthropic_api_url=os.getenv("ANTHROPIC_API_BASE")
        )
    
    else:
        raise ValueError(f"Unsupported model or provider: {model_name}")
    