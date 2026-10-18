# syntax=docker/dockerfile:1
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    poppler-utils \
    ca-certificates \
    fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*

COPY audit_runner/requirements.txt /app/audit_runner/requirements.txt
RUN pip install --upgrade pip && pip install -r /app/audit_runner/requirements.txt

COPY audit_agent /app/audit_agent
COPY audit_runner /app/audit_runner

ENV BSS_AUDIT_AGENT_DIR=/app/audit_agent \
    BSS_AUDIT_JOBS_DIR=/data/audit/jobs \
    DEEPSEEK_CACHE_DIR=/data/audit/cache

ENTRYPOINT ["python", "/app/audit_runner/runner.py"]
