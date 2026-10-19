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
import pathlib
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
    exact text layer; scanned PDFs have little/no embedded text, so return "" and
    let the caller fall back to OCR."""
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


def extract_text_ocr(file_bytes: bytes, filename: str = "") -> str:
    """Force rasterisation + OCR (ignore the PDF text layer). Used to refine a
    name that the native text layer merged (e.g. "YasserAli")."""
    if not file_bytes:
        raise OcrError("Empty document.")
    if _is_pdf(file_bytes) or (filename or "").lower().endswith(".pdf"):
        frames = _rasterize_pdf(file_bytes)
    else:
        frames = _open_image(file_bytes)
    return _ocr_frames(_get_engine(), frames)


# Alias used by legacy call-sites that import this module path.
get_text = extract_text

def extract_photo(file_bytes: bytes, filename: str = ""):
    """Best-effort: return the passport photo embedded in a PDF (JPEG bytes) or None.

    Looks at the first two pages, keeps portrait-shaped images (ratio ~1.05–1.9),
    and among those picks the one with the most colours (the photo, not the
    emblem/QR). Only PDFs are handled; images are returned as-is.
    """
    name = (filename or "").lower()
    if not (name.endswith(".pdf") or file_bytes[:5] == b"%PDF-"):
        return None
    try:
        import pypdfium2 as pdfium
    except Exception:  # noqa: BLE001
        return None
    try:
        doc = pdfium.PdfDocument(io.BytesIO(file_bytes))
    except Exception:  # noqa: BLE001
        return None
    best = None
    try:
        for pno in range(min(2, len(doc))):
            for obj in doc[pno].get_objects():
                if not isinstance(obj, pdfium.PdfImage):
                    continue
                pil = None
                try:
                    pil = obj.extract()
                except Exception:  # noqa: BLE001
                    try:
                        pil = obj.get_bitmap().to_pil()
                    except Exception:  # noqa: BLE001
                        pil = None
                if pil is None:
                    continue
                try:
                    w, h = pil.size
                    if w < 40 or h < 40:
                        continue
                    ratio = h / max(w, 1)
                    if not (1.05 < ratio < 1.95):
                        continue
                    colours = len(pil.convert("RGB").resize((48, 48)).getcolors(48 * 48) or [])
                    score = (colours, w * h)
                    if colours < 60:
                        continue
                    if best is None or score > best[0]:
                        best = (score, pil)
                except Exception:  # noqa: BLE001
                    continue
    finally:
        try:
            doc.close()
        except Exception:  # noqa: BLE001
            pass
    if best is None:
        return None
    img = best[1]
    w, h = img.size
    # A full Aadhaar page/card was embedded (not a cropped passport photo) —
    # crop the top-right photo area of the page.
    if w >= 600 and h >= 800:
        img = img.crop((int(w * 0.60), int(h * 0.06), int(w * 0.98), int(h * 0.42)))
    buf = io.BytesIO()
    img.convert("RGB").save(buf, "JPEG", quality=90)
    return buf.getvalue()

# ── Face (person photo) extraction ───────────────────────────────────────────
FACE_MODEL_PATH = str(pathlib.Path(__file__).resolve().parent / "models" / "face_detection_yunet_2023mar.onnx")


def render_page_image(file_bytes: bytes, filename: str = "", max_side: int = 1400):
    """Render page 1 of a PDF (or the image itself) to a downscaled JPEG.

    Used as the "whole Aadhaar card" preview/evidence. No OCR is performed."""
    try:
        if _is_pdf(file_bytes) or (filename or "").lower().endswith(".pdf"):
            frames = _rasterize_pdf(file_bytes)
        else:
            frames = _open_image(file_bytes)
    except OcrError:
        return None
    if not frames:
        return None
    img = frames[0]
    w, h = img.size
    longest = max(w, h)
    if longest > max_side and longest > 0:
        ratio = max_side / longest
        img = img.resize((max(1, int(w * ratio)), max(1, int(h * ratio))))
    buf = io.BytesIO()
    img.convert("RGB").save(buf, "JPEG", quality=85)
    return buf.getvalue()


def _face_crop(image):
    """Largest face in a PIL image → padded 3:4 JPEG bytes, or None."""
    if image is None:
        return None
    try:
        import os

        import cv2
        import numpy as np
    except Exception:  # noqa: BLE001
        return None
    if not os.path.exists(FACE_MODEL_PATH):
        return None
    try:
        w, h = image.size
        if w < 80 or h < 80:
            return None
        scale = min(1.0, 1600.0 / max(w, h))
        det = image.resize((max(1, int(w * scale)), max(1, int(h * scale)))) if scale < 1 else image
        arr = np.asarray(det.convert("RGB"))[:, :, ::-1].copy()  # RGB -> BGR
        dh, dw = arr.shape[:2]
        detector = cv2.FaceDetectorYN.create(FACE_MODEL_PATH, "", (dw, dh), 0.6, 0.3, 5000)
        detector.setInputSize((dw, dh))
        _, faces = detector.detect(arr)
        if faces is None or len(faces) == 0:
            return None
        best = max(faces, key=lambda f: float(f[2]) * float(f[3]))
        x, y, fw, fh = (float(best[i]) / scale for i in range(4))
        pad = 0.30
        cx, cy = x + fw / 2, y + fh / 2
        cw, ch = fw * (1 + 2 * pad), fh * (1 + 2 * pad)
        if cw / ch < 0.75:
            cw = ch * 0.75
        else:
            ch = cw / 0.75
        left, top = max(0, int(cx - cw / 2)), max(0, int(cy - ch / 2))
        right, bottom = min(w, int(cx + cw / 2)), min(h, int(cy + ch / 2))
        if right - left < 40 or bottom - top < 40:
            return None
        crop = image.crop((left, top, right, bottom)).resize((400, 500))
        buf = io.BytesIO()
        crop.convert("RGB").save(buf, "JPEG", quality=90)
        return buf.getvalue()
    except Exception:  # noqa: BLE001
        return None


def extract_face(file_bytes: bytes, filename: str = ""):
    """Return the worker's passport photo (JPEG bytes) from the document.

    Renders the PDF pages and uses the YuNet face detector; scans the first two
    pages and returns the first face found. Falls back to the legacy embedded
    portrait-image heuristic when no face is detected."""
    try:
        if _is_pdf(file_bytes) or (filename or "").lower().endswith(".pdf"):
            frames = _rasterize_pdf(file_bytes)
        else:
            frames = _open_image(file_bytes)
    except OcrError:
        return None
    for image in frames[:2]:
        crop = _face_crop(image)
        if crop:
            return crop
    # Fallback: embedded portrait image (old behaviour).
    return extract_photo(file_bytes, filename)

