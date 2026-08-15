"""Render worker ID cards with the static QR code as PNG or PDF."""
import io

import qrcode
from django.conf import settings
from django.http import HttpResponse
from PIL import Image, ImageDraw, ImageFont
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas


def _card_font(size):
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/dejavu/DejaVuSans.ttf",
    ]
    for path in candidates:
        try:
            return ImageFont.truetype(path, size)
        except Exception:
            continue
    return ImageFont.load_default()


def _qr_image(qr_reference, box=(220, 220)):
    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=8,
        border=2,
    )
    qr.add_data(qr_reference)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white").convert("RGB")
    return img.resize(box, Image.LANCZOS)


def worker_card_image(worker, qr_reference):
    """Return a PIL image of the worker ID card (600x380 px)."""
    W, H = 600, 380
    img = Image.new("RGB", (W, H), "white")
    d = ImageDraw.Draw(img)

    # Header bar
    d.rectangle([0, 0, W, 46], fill="#1a5276")
    d.text((20, 12), "BHARAT SHARAM SETU", font=_card_font(20), fill="white")
    d.text((W - 150, 14), "WORKER ID CARD", font=_card_font(13), fill="#f7dc6f")

    # Photo placeholder
    d.rectangle([30, 70, 130, 170], outline="#1a5276", width=2)
    d.text((50, 112), "PHOTO", font=_card_font(14), fill="#999")

    # Details
    name = worker.full_name or "N/A"
    wid = worker.worker_id or f"WRK{worker.pk:06d}"
    d.text((155, 80), f"Name:  {name}", font=_card_font(18), fill="black")
    d.text((155, 112), f"Worker ID:  {wid}", font=_card_font(16), fill="#333")
    d.text((155, 142), f"Role:  Worker", font=_card_font(16), fill="#333")
    d.text((155, 172), f"Employer:  {worker.employer.name if worker.employer else '—'}",
           font=_card_font(14), fill="#555")

    # QR on the right
    qr_img = _qr_image(qr_reference, (150, 150))
    img.paste(qr_img, (W - 180, 70))
    d.text((W - 160, 235), "STATIC QR", font=_card_font(12), fill="#1a5276")

    # Footer
    d.rectangle([0, H - 30, W, H], fill="#1a5276")
    d.text((20, H - 24), "BSS – Building a Transparent & Accountable Workforce Ecosystem",
           font=_card_font(11), fill="white")
    return img


def worker_card_pdf(worker, qr_reference):
    """Return a PDF (A4) with the card rendered and the QR reference printed below."""
    img = worker_card_image(worker, qr_reference)
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    a4w, a4h = A4
    img.save("/tmp/_card_tmp.png", format="PNG")
    c.drawImage("/tmp/_card_tmp.png", 60, a4h - 300, width=510, height=323)
    c.setFont("Helvetica", 9)
    c.drawString(60, a4h - 330, f"QR Reference: {qr_reference}")
    c.drawString(60, a4h - 345, "Keep this card; the QR identifies the worker securely.")
    c.showPage()
    c.save()
    return buf.getvalue()


def card_response(worker, qr_reference, fmt="png"):
    if fmt == "pdf":
        data = worker_card_pdf(worker, qr_reference)
        return HttpResponse(data, content_type="application/pdf")
    img = worker_card_image(worker, qr_reference)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return HttpResponse(buf.getvalue(), content_type="image/png")
