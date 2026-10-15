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


def _clean_native_text(text):
    """Drop char-by-char noise lines (some signed PDFs render the rotated
    signature block one glyph per line)."""
    return "\n".join(ln.strip() for ln in (text or "").splitlines() if len(ln.strip()) >= 2)


def _pdf_native_text(file_bytes, min_alnum=40):
    """Return the PDF's own text layer when it is usable.

    Digitally-generated PDFs (e.g. DigiLocker PAN/Aadhaar certificates) carry an
    exact text layer — including the spacing between words — which rasterised OCR
    often mangles (``SYED YASSER ALI`` -> ``SYEDYASSERALI``). Scanned PDFs have
    little/no embedded text, so return "" and let the caller fall back to OCR.
    """
    try:
        import pypdfium2 as pdfium
    except Exception:  # noqa: BLE001 — no native reader available
        return ""
    try:
        doc = pdfium.PdfDocument(file_bytes)
    except Exception:  # noqa: BLE001
        return ""
    parts = []
    try:
        for page in doc:
            try:
                text = page.get_textpage().get_text_range() or ""
            except Exception:  # noqa: BLE001
                text = ""
            if text.strip():
                parts.append(text)
    finally:
        try:
            doc.close()
        except Exception:  # noqa: BLE001
            pass
    raw = "\n".join(parts).strip()
    if sum(c.isalnum() for c in raw) < min_alnum:
        return ""
    return _clean_native_text(raw)


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
        # Prefer the exact text layer when present (digital PDFs); only rasterise
        # + OCR when there is no usable embedded text (scanned documents).
        native = _pdf_native_text(file_bytes)
        if native:
            return native
        frames = _rasterize_pdf(file_bytes)
    else:
        frames = _open_image(file_bytes)

    return _ocr_frames(_get_engine(), frames)


# Alias used by legacy call-sites that import this module path.
get_text = extract_text