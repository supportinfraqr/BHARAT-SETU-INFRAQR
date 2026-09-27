FROM python:3.10-slim

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    DEBIAN_FRONTEND=noninteractive

# ffmpeg for RTSP/file capture; GL/GLib/X libs for OpenCV; libzbar for the
# optional barcode backend.
RUN apt-get update && apt-get install -y --no-install-recommends \
        ffmpeg libgl1 libglib2.0-0 libsm6 libxext6 libxrender1 libzbar0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# CPU-only torch first: no ~5 GB of CUDA libs, and no triton import racing the
# capture thread (that import segfaults on CPU-only hosts). Pinning the +cpu
# wheels with --extra-index-url takes torch from the PyTorch index while its
# dependencies still resolve from PyPI.
COPY requirements.txt .
RUN pip install --no-cache-dir --extra-index-url https://download.pytorch.org/whl/cpu \
        "torch==2.14.0+cpu" "torchvision==0.29.0+cpu" \
    && pip install --no-cache-dir -r requirements.txt

COPY . .

ENV BTP_PG_SCHEMA=attendance
EXPOSE 80
CMD ["python", "controller.py"]
