"""Self-hosted document OCR engine.

Replaces the external OCR service (http://13.202.27.216:8080/ocr, previously
proxied by EesassinErp OCRAPI/OCRHelper) with an in-process Python engine:

  - JPEG / PNG / WebP / BMP / TIFF  -> RapidOCR over ONNX directly
  - PDF                             -> rasterize each page (pypdfium2) then OCR

No network calls, no system OCR binary, no GPU. The engine is loaded once per
process (lazy, thread-safe) and reused across requests.
"""

import io
import logging
import threading
import time

logger = logging.getLogger(__name__)


class OcrError(Exception):
    pass


MAX_PDF_PAGES = 6          # never OCR a bottomless PDF
MAX_PIXELS = 2_500_000     # downscale pages so OCR stays fast (~150dpi A4)
PDF_RENDER_SCALE = 1.4     # base render scale (pypdfium2: 1.0 == 72dpi)
OCR_TIME_BUDGET_S = 60     # stop between pages once past this — return partial text

_ENGINE_LOCK = threading.Lock()
_ENGINE = None


def _is_pdf(file_bytes: bytes) -> bool:
    return file_bytes[:1024].lstrip().startswith(b"%PDF")


def _get_engine():
    global _ENGINE
    if _ENGINE is None:
        with _ENGINE_LOCK:
            if _ENGINE is None:
                try:
                    from rapidocr_onnxruntime import RapidOCR
                except Exception as exc:  # pragma: no cover - missing dep
                    raise OcrError(f"OCR engine not installed: {exc}") from exc
                _ENGINE = RapidOCR()
    return _ENGINE


def _rasterize_pdf(file_bytes: bytes):
    """Render a PDF to a list of RGB PIL pages, capped in page count + pixels."""
    try:
        import pypdfium2 as pdfium
    except Exception as exc:  # pragma: no cover - missing dep
        raise OcrError(f"PDF rasterizer not installed: {exc}") from exc

    try:
        doc = pdfium.PdfDocument(io.BytesIO(file_bytes))
    except Exception as exc:
        raise OcrError(f"Could not read PDF: {exc}") from exc

    n = min(len(doc), MAX_PDF_PAGES)
    if n <= 0:
        doc.close()
        raise OcrError("PDF has no pages.")

    frames = []
    try:
        for i in range(n):
            page = doc[i]
            try:
                w, h = page.get_size()
                scale = PDF_RENDER_SCALE
                while w * scale * h * scale > MAX_PIXELS and scale > 0.25:
                    scale *= 0.5
                pil = page.render(scale=scale).to_pil().convert("RGB")
            finally:
                page.close()
            frames.append(pil)
    finally:
        doc.close()
    return frames


def _open_image(file_bytes: bytes):
    try:
        from PIL import Image
    except Exception as exc:  # pragma: no cover - missing dep
        raise OcrError(f"Pillow not installed: {exc}") from exc
    try:
        img = Image.open(io.BytesIO(file_bytes)).convert("RGB")
    except Exception as exc:
        raise OcrError(f"Could not read image: {exc}") from exc
    if img.width * img.height > MAX_PIXELS:
        ratio = (MAX_PIXELS / (img.width * img.height)) ** 0.5
        img = img.resize((max(1, int(img.width * ratio)), max(1, int(img.height * ratio))))
    return [img]


def _ocr_frames(engine, frames, budget_s=OCR_TIME_BUDGET_S):
    lines = []
    start = time.monotonic()
    for index, img in enumerate(frames):
        if index and time.monotonic() - start > budget_s:
            logger.warning("OCR time budget (%ss) reached; returning partial text", budget_s)
            break
        try:
            result, _ = engine(img)
        except Exception as exc:
            logger.warning("OCR page failed: %s", exc)
            continue
        for _box, text, _score in result or []:
            text = (text or "").strip()
            if text:
                lines.append(text)
    return "\n".join(lines)


def extract_text(file_bytes: bytes, filename: str = "", timeout: float | int | None = None) -> str:
    """Return the recognized text for a document (image or PDF).

    Arguments mirror api.ocr_client.extract_text so callers can keep passing a
    timeout; work is bounded by page/scale caps, so timeout is best-effort (a
    single page's OCR is not preemptable).
    """
    del timeout  # bounded by the caps above; kept for interface compatibility
    if not file_bytes:
        raise OcrError("Empty document.")

    if _is_pdf(file_bytes) or (filename or "").lower().endswith(".pdf"):
        frames = _rasterize_pdf(file_bytes)
    else:
        frames = _open_image(file_bytes)

    return _ocr_frames(_get_engine(), frames)


# Alias used by legacy call-sites that import this module path.
get_text = extract_text