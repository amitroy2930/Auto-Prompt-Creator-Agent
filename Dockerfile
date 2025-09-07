# Backend-only Dockerfile for Auto Prompt Creator
# Builds a slim Python image and runs FastAPI with Uvicorn.

FROM python:3.11-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

# System deps (optional but useful for manylinux wheels and timezones)
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       curl ca-certificates tzdata \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python deps first for better layer caching
COPY requirements.txt ./
RUN pip install --upgrade pip \
    && pip install -r requirements.txt

# Copy application source
COPY app ./app

# Expose API port
EXPOSE 8001

# Work from backend dir so relative imports work (e.g., `from models import ...`)
WORKDIR /app/app/backend

# Default environment hints (override at runtime as needed)
# ENV VERTEXAI_CREDS_PATH=/app/app/credentials/vertex_ai.json

CMD ["uvicorn", "web_main:app", "--host", "0.0.0.0", "--port", "8001"]

