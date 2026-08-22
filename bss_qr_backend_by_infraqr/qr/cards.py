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
def _deva_font(size):
    candidates = [
        "/usr/share/fonts/truetype/noto/NotoSansDevanagari-Regular.ttf",
        "/usr/share/fonts/truetype/noto/NotoSerifDevanagari-Regular.ttf",
    ]
    for path in candidates:
        try:
            return ImageFont.truetype(path, size)
        except Exception:
            continue
    return _card_font(size)



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
        [3, 3, fsz - 4, fsz - 4], radius=22, outline=BRAND_NAVY, width=3
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


def _worker_age(dob):
    """Best-effort age from a DOB string (returns None if unparsable)."""
    from datetime import date, datetime
    if not dob:
        return None
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%Y/%m/%d", "%d-%b-%Y"):
        try:
            d = datetime.strptime(str(dob).strip(), fmt).date()
            today = date.today()
            return today.year - d.year - ((today.month, today.day) < (d.month, d.day))
        except ValueError:
            continue
    return None


def _load_photo(photo):
    """Load a worker photo (URL or local path) into a PIL image, or None."""
    if not photo:
        return None
    try:
        if str(photo).lower().startswith("http"):
            import urllib.request
            with urllib.request.urlopen(photo, timeout=5) as r:
                return Image.open(io.BytesIO(r.read())).convert("RGB")
        return Image.open(photo).convert("RGB")
    except Exception:
        return None


def _wrap_text(text, font, max_width, draw):
    """Wrap text to fit max_width using the given font."""
    words = str(text).split()
    lines = []
    cur = ""
    for w in words:
        test = (cur + " " + w).strip()
        if draw.textlength(test, font=font) <= max_width:
            cur = test
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def _truncate_text(text, font, max_width, draw):
    text_str = str(text)
    if draw.textlength(text_str, font=font) <= max_width:
        return text_str
    for i in range(len(text_str), 0, -1):
        test = text_str[:i] + "..."
        if draw.textlength(test, font=font) <= max_width:
            return test
    return "..."




def _entity_details(entity_type, entity):
    """Build type-specific (label, value) rows for the identity card."""
    if entity_type == "WORKER":
        age = _worker_age(entity.date_of_birth)
        site = entity.site.name if entity.site else (entity.contractor.site_name if entity.contractor else "—")
        return [
            ("Worker Name", entity.full_name or "N/A"),
            ("Worker ID", entity.worker_id or f"WRK{entity.pk:06d}"),
            ("Father/Spouse Name", entity.father_name or entity.care_of or "—"),
            ("Sex", entity.gender or "—"),
            ("Date of Birth", entity.date_of_birth or "—"),
            ("Age", str(age) if age is not None else "—"),
            ("Blood Group", entity.blood_group or "—"),
            ("Nature of Job", entity.designation or "—"),
            ("Mobile", entity.mobile or "—"),
            ("Aadhaar No", entity.aadhaar_no or "—"),
            ("PAN No", entity.pan_no or "—"),
            ("Issued Date", entity.issue_date or "—"),
            ("Site", site),
            ("Contractor", entity.contractor.name if entity.contractor else "—"),
            ("Employer", entity.employer.name if entity.employer else "—"),
        ]
    if entity_type == "CONTRACTOR":
        return [
            ("Contractor Name", entity.name or "N/A"),
            ("Contractor ID", f"CON{entity.pk:06d}"),
            ("Contact Person", entity.contact_person or "—"),
            ("Type", "Primary" if entity.is_primary else "Secondary"),
            ("Mobile", entity.contact_mobile or "—"),
            ("PAN No", entity.pan_no or "—"),
            ("GSTIN", entity.gstin or "—"),
            ("Industry", entity.industry or "—"),
            ("Site", entity.site_name or (entity.site.name if entity.site else "—")),
            ("City", entity.city or "—"),
            ("State", entity.state or "—"),
            ("Employer", entity.employer.name if entity.employer else "—"),
        ]
    if entity_type == "EMPLOYER":
        return [
            ("Employer Name", entity.name or "N/A"),
            ("Employer ID", f"EMP{entity.pk:06d}"),
            ("Contact Person", entity.contact_person or "—"),
            ("Mobile", entity.contact_mobile or "—"),
            ("PAN No", entity.pan_no or "—"),
            ("GSTIN", entity.gstin or "—"),
            ("CIN", entity.cin or "—"),
            ("Industry", entity.industry or "—"),
            ("City", entity.city or "—"),
            ("State", entity.state or "—"),
            ("Plan", entity.plan_type or "—"),
        ]
    return []


def identity_card_image(entity_type, entity, qr_reference, role_label="", email=""):
    """Render an HD (1560x1000) landscape identity card for worker/contractor/employer."""
    W, H = 1560, 1000
    img = Image.new("RGB", (W, H), "#ffffff")
    d = ImageDraw.Draw(img)

    BRAND_NAVY = (2, 43, 94)
    BRAND_ORANGE = (245, 130, 32)
    BRAND_GREEN = (20, 148, 60)
    TEXT_DARK = (15, 23, 42)
    TEXT_MUTED = (71, 85, 105)
    LINE_COLOR = (226, 232, 240)

    f_title = _card_font(48)
    f_sub = _card_font(24)
    f_caption = _card_font(14)
    f_lbl = _card_font(20)
    f_val = _card_font(20)

    d.rounded_rectangle([24, 24, W - 26, H - 26], radius=48, outline="#cbd5e1", width=4)

    # Header logo
    logo_sz = 104
    logo_x, logo_y = 64, 48
    try:
        logo = Image.open(LOGO_PATH).convert("RGBA")
        logo = logo.resize((logo_sz, logo_sz), Image.LANCZOS)
        img.paste(logo, (logo_x, logo_y), logo)
    except Exception:
        pass
    d.text((logo_x + logo_sz // 2, logo_y + logo_sz + 10), "श्रमिक का सम्मान, देश का निर्माण",
           font=_deva_font(14), fill=BRAND_NAVY, anchor="mt")

    # Header text
    d.text((230, 52), "Bharat", font=f_title, fill=BRAND_NAVY)
    bx = 230 + d.textlength("Bharat ", font=f_title)
    d.text((bx, 52), "Shram", font=f_title, fill=BRAND_ORANGE)
    bx += d.textlength("Shram ", font=f_title)
    d.text((bx, 52), "Setu", font=f_title, fill=BRAND_GREEN)
    role_cap = f"Digital {role_label} ID Card" if role_label else "Digital ID Card"
    d.text((230, 116), role_cap, font=f_sub, fill=TEXT_MUTED)
    d.line([(64, 190), (W - 64, 190)], fill=BRAND_NAVY, width=2)

    # Photo (right)
    px, py, pw, ph = 1120, 230, 272, 308
    d.rounded_rectangle([px - 2, py - 2, px + pw + 2, py + ph + 2], radius=16, outline="#cbd5e1", width=2)
    d.rounded_rectangle([px, py, px + pw - 1, py + ph - 1], radius=16, fill="#f8fafc")
    
    photo = _load_photo(getattr(entity, "photo", None))
    if photo is not None:
        photo = photo.resize((pw, ph), Image.LANCZOS)
        pmask = Image.new("L", (pw, ph), 0)
        ImageDraw.Draw(pmask).rounded_rectangle([0, 0, pw - 1, ph - 1], radius=16, fill=255)
        img.paste(photo, (px, py), pmask)
    else:
        # Load high quality random AI generated worker photo
        try:
            default_photo_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static", "qr", "default_worker.png")
            dphoto = Image.open(default_photo_path).convert("RGB")
            dphoto = dphoto.resize((pw, ph), Image.LANCZOS)
            pmask = Image.new("L", (pw, ph), 0)
            ImageDraw.Draw(pmask).rounded_rectangle([0, 0, pw - 1, ph - 1], radius=16, fill=255)
            img.paste(dphoto, (px, py), pmask)
        except Exception:
            d.ellipse([px + pw // 2 - 40, py + 70, px + pw // 2 + 40, py + 150], fill="#cbd5e1")
            d.chord([px + 30, py + 160, px + pw - 30, py + ph - 30], start=180, end=360, fill="#cbd5e1")

    badge_y = py + ph + 24
    d.rounded_rectangle([px, badge_y, px + pw, badge_y + 44], radius=22, fill=BRAND_NAVY)
    d.text((px + pw // 2, badge_y + 22), "✓ Verified Member", font=_card_font(20), fill="white", anchor="mm")
    d.text((px + pw // 2, badge_y + 60), role_label or "Digital ID", font=_card_font(18), fill=BRAND_NAVY, anchor="mm")

    # Details (two columns, left)
    details = _entity_details(entity_type, entity)
    if email:
        details.insert(1, ("Email", email))
    if role_label:
        details.insert(2, ("Role", role_label))
    half = (len(details) + 1) // 2
    colA = details[:half]
    colB = details[half:]

    dy = 224
    step = 52

    def draw_col(items, icon_x, lbl_x, val_x, line_end_x, dy):
        max_w = line_end_x - val_x - 10
        for label, val in items:
            d.rectangle([icon_x, dy - 4, icon_x + 44, dy + 32], outline="#cbd5e1", width=2)
            d.ellipse([icon_x + 16, dy + 8, icon_x + 28, dy + 20], fill=BRAND_NAVY)
            d.text((lbl_x, dy), label, font=f_lbl, fill=TEXT_MUTED)
            trunc_val = _truncate_text(val, f_val, max_w, d)
            d.text((val_x, dy), trunc_val, font=f_val, fill=TEXT_DARK)
            d.line([(icon_x, dy + 42), (line_end_x, dy + 42)], fill=LINE_COLOR, width=2)
            dy += step
        return dy

    colA_end = draw_col(colA, icon_x=64, lbl_x=124, val_x=360, line_end_x=530, dy=dy)
    draw_col(colB, icon_x=560, lbl_x=620, val_x=840, line_end_x=1080, dy=dy)

    # Address (full width)
    addr_y = colA_end + 8
    d.text((124, addr_y), "Address", font=f_lbl, fill=TEXT_MUTED)
    d.text((360, addr_y), ":", font=f_lbl, fill=TEXT_MUTED)
    addr = getattr(entity, "present_address", None) or getattr(entity, "address", None) or "—"
    addr_lines = _wrap_text(addr, f_val, 700, d)
    ay = addr_y
    for ln in addr_lines[:2]:
        d.text((400, ay), ln, font=f_val, fill=TEXT_DARK)
        ay += 30

    # Digitally signed (with timestamp from account creation)
    created = getattr(entity, "created_at", None)
    if created:
        from django.utils import timezone as tz
        created = tz.localtime(created)
        sign_time = created.strftime("%d-%m-%Y %H:%M:%S")
    else:
        from django.utils import timezone as tz
        sign_time = tz.localtime().strftime("%d-%m-%Y %H:%M:%S")
    sig_y = addr_y + 84
    d.line([(124, sig_y + 20), (1000, sig_y + 20)], fill="#94a3b8", width=2)
    d.text((124, sig_y + 32), f"Digitally signed by BSS SYSTEM on {sign_time}",
           font=_card_font(20), fill=BRAND_NAVY)

    # QR (bottom right)
    qrx, qr_y, qr_sz = 1156, 644, 200
    qr_img = _qr_image(qr_reference, (qr_sz, qr_sz))
    # Paste the designed QR code directly (it already has a rounded outline frame)
    img.paste(qr_img, (qrx - 10, qr_y - 10))
    d.text((qrx + qr_sz // 2, qr_y + qr_sz + 32), "BSS Verification QR", font=_card_font(18), fill=BRAND_NAVY, anchor="mm")

    # Footer
    d.text((W // 2, H - 52), "One Nation. One Platform. One Worker.", font=_card_font(20), fill=BRAND_NAVY, anchor="mm")
    d.line([(64, H - 52), (W // 2 - 220, H - 52)], fill=BRAND_NAVY, width=2)
    d.line([(W // 2 + 220, H - 52), (W - 64, H - 52)], fill=BRAND_NAVY, width=2)

    return img


def worker_card_image(worker, qr_reference):
    return identity_card_image("WORKER", worker, qr_reference,
                               role_label="Worker", email=worker.email or "")


def contractor_card_image(contractor, qr_reference):
    return identity_card_image("CONTRACTOR", contractor, qr_reference,
                               role_label="Contractor", email=contractor.email or "")


def employer_card_image(employer, qr_reference):
    return identity_card_image("EMPLOYER", employer, qr_reference,
                               role_label="Employer", email=employer.email or "")


def entity_card_image(entity_type, entity, qr_reference):
    if entity_type == "CONTRACTOR":
        return contractor_card_image(entity, qr_reference)
    if entity_type == "EMPLOYER":
        return employer_card_image(entity, qr_reference)
    return worker_card_image(entity, qr_reference)


def simple_identity_card(name, role, email, qr_reference, user_id=""):
    """Simple HD identity card for users with no QR entity (e.g. admin/staff)."""
    W, H = 1560, 1000
    img = Image.new("RGB", (W, H), "#ffffff")
    d = ImageDraw.Draw(img)
    BRAND_NAVY = (2, 43, 94)
    BRAND_ORANGE = (245, 130, 32)
    BRAND_GREEN = (20, 148, 60)
    TEXT_MUTED = (71, 85, 105)
    TEXT_DARK = (15, 23, 42)

    d.rounded_rectangle([24, 24, W - 26, H - 26], radius=48, outline="#cbd5e1", width=4)
    logo_sz = 104
    logo_x, logo_y = 64, 48
    try:
        logo = Image.open(LOGO_PATH).convert("RGBA")
        logo = logo.resize((logo_sz, logo_sz), Image.LANCZOS)
        img.paste(logo, (logo_x, logo_y), logo)
    except Exception:
        pass

    d.text((230, 52), "Bharat", font=_card_font(48), fill=BRAND_NAVY)
    bx = 230 + d.textlength("Bharat ", font=_card_font(48))
    d.text((bx, 52), "Shram", font=_card_font(48), fill=BRAND_ORANGE)
    bx += d.textlength("Shram ", font=_card_font(48))
    d.text((bx, 52), "Setu", font=_card_font(48), fill=BRAND_GREEN)
    d.text((230, 116), "Digital Identity Card", font=_card_font(24), fill=TEXT_MUTED)
    d.line([(64, 190), (W - 64, 190)], fill=BRAND_NAVY, width=2)

    # Badge
    d.rounded_rectangle([900, 230, 1100, 274], radius=22, fill=BRAND_NAVY)
    d.text((1000, 252), "✓ Verified Member", font=_card_font(20), fill="white", anchor="mm")

    # Details
    details = [
        ("Name", name or "—"),
        ("Role", role or "—"),
        ("Email", email or "—"),
        ("User ID", user_id or "—"),
    ]
    y = 330
    for label, val in details:
        d.text((144, y), f"{label}:", font=_card_font(20), fill=TEXT_MUTED)
        d.text((380, y), str(val)[:40], font=_card_font(20), fill=TEXT_DARK)
        d.line([(64, y + 42), (1100, y + 42)], fill=(226, 232, 240), width=2)
        y += 64

    # QR
    qrx, qr_y, qr_sz = 1156, 330, 200
    d.rectangle([qrx - 2, qr_y - 2, qrx + qr_sz + 2, qr_y + qr_sz + 2], outline="#cbd5e1", width=2)
    img.paste(_qr_image(qr_reference, (qr_sz, qr_sz)), (qrx, qr_y))
    d.text((qrx + qr_sz // 2, qr_y + qr_sz + 20), "BSS Verification QR", font=_card_font(18), fill=BRAND_NAVY, anchor="mm")

    d.text((W // 2, H - 52), "One Nation. One Platform. One Worker.", font=_card_font(20), fill=BRAND_NAVY, anchor="mm")
    return img


def _card_to_pdf(img, qr_reference):
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    a4w, a4h = A4
    img.save("/tmp/_card_tmp.png", format="PNG")
    card_w = 520
    card_h = int(card_w * img.size[1] / img.size[0])
    x_pos = (a4w - card_w) / 2
    y_pos = a4h - card_h - 80
    c.drawImage("/tmp/_card_tmp.png", x_pos, y_pos, width=card_w, height=card_h)
    c.setFont("Helvetica", 9)
    c.drawString(x_pos, y_pos - 24, f"QR Reference: {qr_reference}")
    c.showPage()
    c.save()
    return buf.getvalue()


def worker_card_pdf(worker, qr_reference):
    return _card_to_pdf(worker_card_image(worker, qr_reference), qr_reference)


def card_response(worker, qr_reference, fmt="png"):
    if fmt == "pdf":
        return HttpResponse(_card_to_pdf(worker_card_image(worker, qr_reference), qr_reference),
                            content_type="application/pdf")
    img = worker_card_image(worker, qr_reference)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return HttpResponse(buf.getvalue(), content_type="image/png")


def entity_card_response(entity_type, entity, qr_reference, fmt="png"):
    if fmt == "pdf":
        return HttpResponse(_card_to_pdf(entity_card_image(entity_type, entity, qr_reference), qr_reference),
                            content_type="application/pdf")
    img = entity_card_image(entity_type, entity, qr_reference)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return HttpResponse(buf.getvalue(), content_type="image/png")

