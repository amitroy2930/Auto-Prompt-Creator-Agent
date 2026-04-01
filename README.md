# PromptPilot AI (Auto-Prompt-Creator-Agent)

<div align="center">
  <img src="./Images/light_mode.png" alt="PromptPilot AI Interface" width="800">

  [![GitHub Stars](https://img.shields.io/github/stars/amitroy2930/Auto-Prompt-Creator-Agent?style=for-the-badge)](https://github.com/amitroy2930/Auto-Prompt-Creator-Agent/stargazers)
  [![GitHub Forks](https://img.shields.io/github/forks/amitroy2930/Auto-Prompt-Creator-Agent?style=for-the-badge)](https://github.com/amitroy2930/Auto-Prompt-Creator-Agent/network/members)
  [![License](https://img.shields.io/github/license/amitroy2930/Auto-Prompt-Creator-Agent?style=for-the-badge)](https://github.com/amitroy2930/Auto-Prompt-Creator-Agent/blob/main/LICENSE)
</div>

## Problem Statement

As an AI engineer, a significant amount of time is often spent on two recurring challenges:

1. **Agent Design Decisions**
   Deciding whether a task should be handled by a single agent or split into multiple sub-tasks executed by multiple agents.

2. **Prompt Engineering Overhead**
   Crafting, refining, and optimizing prompts—often by testing across multiple LLMs—before reaching the best version.

This iterative process is time-consuming and inefficient.

## Solution: PromptPilot AI

**PromptPilot AI** is designed to solve both challenges by providing a structured and interactive workspace for prompt engineering, agent planning, and multi-model comparison.

## Key Features

### 1) Prompt Assistant Mode

- Activate by typing: **`prompt assistant`**
- Automatically restructures your input prompt using best practices inspired by OpenAI, Claude, and Gemini patterns.
- Improves clarity, structure, and effectiveness for better LLM outputs.

### 2) Agent Assistant Mode

- Activate by typing: **`agent assistant`** followed by your task description.
- The system will:
  - Ask **MCQ-based questions** to understand your objective.
  - Suggest an **optimal breakdown into sub-tasks/sub-agents**.
  - Allow you to **modify/refine** the proposed structure.
  - After finalization, type **`generate prompts`** to create:
    - **Separate prompts for each sub-task** automatically.

### 3) Multi-Model Comparison

- Supports multiple LLMs such as **OpenAI, Gemini, and Claude**.
- Shows responses **side-by-side in a single view**.
- Helps you quickly compare outputs and select the best one.

### 4) Normal Chat Mode

- If no specific mode is selected, PromptPilot works as a **standard chatbot**.
- Includes:
  - Multi-model side-by-side comparison.
  - **Real-time web search** integration via Tavily (through MCP).
  - More up-to-date and context-aware responses.

### 5) Persistent Memory

- All conversations are stored in a **PostgreSQL database**.
- This ensures:
  - No data loss after restart.
  - Ability to **resume conversations anytime** from the sidebar.

## Demo

<div align="center">
  <img src="Images/dark_mode_2.gif" alt="PromptPilot AI dark mode demo" width="600"/>
  <p><em>PromptPilot AI in dark mode</em></p>
</div>

## How to Run the Project

### Prerequisites

- Docker Desktop
- API keys for the LLM providers you want to use

### Steps

1. Clone the repository:
   ```bash
   git clone https://github.com/amitroy2930/Auto-Prompt-Creator-Agent.git
   ```

2. Add your API keys in the `.env` file.

3. Navigate to the project folder:
   ```bash
   cd Auto-Prompt-Creator-Agent
   ```

4. Run the application:
   ```bash
   docker compose up
   ```

5. Open the frontend:
   ```
   http://0.0.0.0:8080/
   ```

## Summary

PromptPilot AI reduces the effort spent on:

- Deciding agent architecture
- Repeated prompt-engineering iterations

It provides a **structured, interactive, and multi-model environment** to accelerate AI development workflows.

---

<div align="center">
  <p>Made with ❤️ by <a href="https://github.com/amitroy2930">Amit Roy</a></p>
  <p>⭐ Star this repo if you find it helpful!</p>
</div>
