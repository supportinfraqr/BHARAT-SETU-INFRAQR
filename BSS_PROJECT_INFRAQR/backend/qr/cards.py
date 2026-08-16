"""Render worker ID cards with the static QR code as PNG or PDF."""
import io
import os

import qrcode
from django.conf import settings
from django.http import HttpResponse
from PIL import Image, ImageDraw, ImageFont
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

LOGO_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static", "qr", "bharatshramsetu-logo.png")


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


def _round_mask(size):
    mask = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(mask)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=int(size * 0.22), fill=255)
    return mask


def _build_designed_qr(data, box=(240, 240), quiet=12):
    """Build a polished QR: navy modules with rounded corners, brand ring logo, rounded frame."""
    if isinstance(box, (tuple, list)):
        box = box[0]
    BRAND_NAVY = (2, 43, 94)      # #022B5E
    BRAND_NAVY_DARK = (1, 26, 60)
    BRAND_GREEN = (8, 124, 56)
    BRAND_ORANGE = (245, 130, 32)
    RING = (245, 130, 32)          # orange ring around logo

    # 1. Render a reliable base QR with qrcode lib (preserves finder patterns)
    qr = qrcode.QRCode(version=None, error_correction=qrcode.constants.ERROR_CORRECT_H, box_size=8, border=2)
    qr.add_data(data)
    qr.make(fit=True)
    base = qr.make_image(fill_color="black", back_color="white").convert("RGBA")
    base_w, base_h = base.size

    # 2. Recolor dark pixels to brand navy (keep geometry exactly so it still scans)
    px = base.load()
    for y in range(base_h):
        for x in range(base_w):
            r, g, b, a = px[x, y]
            if r < 128 and g < 128 and b < 128:
                px[x, y] = (BRAND_NAVY[0], BRAND_NAVY[1], BRAND_NAVY[2], 255)

    # 3. Scale to target box (NEAREST preserves sharp module edges for reliable scanning)
    new_w = box - 2 * quiet
    new_h = box - 2 * quiet
    scaled = base.resize((new_w, new_h), Image.NEAREST)

    canvas_size = box
    img = Image.new("RGBA", (canvas_size, canvas_size), (255, 255, 255, 255))
    img.paste(scaled, (quiet, quiet))

    # 4. Center logo badge with orange ring on white rounded card
    try:
        logo = Image.open(LOGO_PATH).convert("RGBA")
    except Exception:
        logo = None
    if logo is not None:
        logo_size = int(new_w * 0.20)
        logo = logo.resize((logo_size, logo_size), Image.LANCZOS)
        pad = 10
        badge = logo_size + 2 * pad
        # Solid white rounded badge (fully covers QR area so nothing peeks through)
        badge_img = Image.new("RGBA", (badge, badge), (255, 255, 255, 255))
        bmask = Image.new("L", (badge, badge), 0)
        ImageDraw.Draw(bmask).rounded_rectangle([0, 0, badge - 1, badge - 1], radius=int(badge * 0.24), fill=255)
        badge_img.paste(logo, (pad, pad), logo)
        # Orange ring drawn ON the solid badge (opaque), wider than badge so it sits on white edge
        ring = Image.new("RGBA", (badge, badge), (0, 0, 0, 0))
        ImageDraw.Draw(ring).rounded_rectangle(
            [0, 0, badge - 1, badge - 1], radius=int(badge * 0.24), outline=RING, width=5
        )
        bx = (canvas_size - badge) // 2
        by = (canvas_size - badge) // 2
        img.paste(badge_img, (bx, by), bmask)
        # draw ring on top of badge (opaque pixels only on the ring strokes)
        img.paste(ring, (bx, by), ring)

    # 5. Rounded white frame with navy border
    frame_pad = 10
    fsz = canvas_size + 2 * frame_pad
    final = Image.new("RGBA", (fsz, fsz), (255, 255, 255, 255))
    ImageDraw.Draw(final).rounded_rectangle(
        [0, 0, fsz - 1, fsz - 1], radius=22, outline=BRAND_NAVY, width=3
    )
    final.paste(img, (frame_pad, frame_pad), img)
    return final.convert("RGB")


def _overlay_logo(qr_img):
    """Place the BharatShramSetu logo in the center of the QR (with white border)."""
    try:
        logo = Image.open(LOGO_PATH).convert("RGBA")
    except Exception:
        return qr_img
    w, h = qr_img.size
    logo_size = int(w * 0.24)
    logo = logo.resize((logo_size, logo_size), Image.LANCZOS)

    # White rounded background behind the logo for scan-ability
    bg = Image.new("RGBA", (logo_size + 8, logo_size + 8), "white")
    mask = _round_mask(logo_size + 8)
    logo_rgba = Image.new("RGBA", (logo_size, logo_size), (0, 0, 0, 0))
    logo_rgba.paste(logo, (0, 0), logo)
    bg.paste(logo_rgba, (4, 4), logo_rgba)

    bg = bg.convert("RGBA")
    base = qr_img.convert("RGBA")
    x = (w - bg.size[0]) // 2
    y = (h - bg.size[1]) // 2
    base.paste(bg, (x, y), mask)
    return base.convert("RGB")


def _qr_image(qr_reference, box=(220, 220), with_logo=True):
    return _build_designed_qr(qr_reference, box)


def qr_png_bytes(data: str, box=(240, 240)) -> bytes:
    """Return PNG bytes of a QR encoding arbitrary data (designed with logo)."""
    img = _build_designed_qr(data, box)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def worker_card_image(worker, qr_reference):
    """Return a PIL image of the worker ID card (600x380 px)."""
    W, H = 600, 380
    # Create background
    img = Image.new("RGB", (W, H), "#f8fafc")
    d = ImageDraw.Draw(img)

    # Main card border
    d.rectangle([0, 0, W - 1, H - 1], outline="#e2e8f0", width=2)

    # Header bar
    BRAND_NAVY = "#022b5e"
    BRAND_GOLD = "#e2b13c"
    d.rectangle([0, 0, W, 52], fill=BRAND_NAVY)
    d.text((20, 14), "BHARAT SHRAM SETU", font=_card_font(21), fill="white")
    d.text((W - 165, 17), "WORKER ID CARD", font=_card_font(13), fill=BRAND_GOLD)

    # Photo placeholder (rounded rect background with user silhouette)
    photo_box = [30, 80, 150, 200]
    d.rounded_rectangle(photo_box, radius=8, fill="#e2e8f0")
    # Draw silhouette icon
    d.ellipse([75, 105, 105, 135], fill="#cbd5e1") # head
    d.chord([60, 142, 120, 192], start=180, end=360, fill="#cbd5e1") # body

    # Details
    name = worker.full_name or "N/A"
    wid = worker.worker_id or f"WRK{worker.pk:06d}"
    d.text((180, 85), f"Name:  {name}", font=_card_font(19), fill="#0f172a")
    d.text((180, 118), f"Worker ID:  {wid}", font=_card_font(15), fill="#475569")
    d.text((180, 148), f"Role:  Worker", font=_card_font(15), fill="#475569")
    d.text((180, 178), f"Employer:  {worker.employer.name if worker.employer else '—'}",
           font=_card_font(15), fill="#475569")

    # QR on the right
    qr_size = 140
    qr_img = _qr_image(qr_reference, (qr_size, qr_size))
    img.paste(qr_img, (W - 180, 80))

    # Footer
    d.rectangle([0, H - 36, W, H], fill=BRAND_NAVY)
    d.text((20, H - 26), "BSS – Building a Transparent & Accountable Workforce Ecosystem",
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
