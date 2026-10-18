# syntax=docker/dockerfile:1
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# opencv (pulled in by rapidocr-onnxruntime) needs libGL.so.1 + glib at import
# time; python:3.12-slim ships neither. WeasyPrint needs pango, gdk-pixbuf and
# shared-mime-info at import time.
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    libpango-1.0-0 \
    libpangoft2-1.0-0 \
    libgdk-pixbuf-2.0-0 \
    shared-mime-info \
    poppler-utils \
    fonts-dejavu-core \
    fonts-noto-core \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt gunicorn

# CACHEBUST: pass a changing value (e.g. a timestamp) to force this COPY to
# re-run. Works around Docker 29/containerd reusing a stale COPY layer when only
# file contents changed.
ARG CACHEBUST=0
COPY . .

RUN chmod +x /app/entrypoint.sh

EXPOSE 8000
ENTRYPOINT ["/app/entrypoint.sh"]