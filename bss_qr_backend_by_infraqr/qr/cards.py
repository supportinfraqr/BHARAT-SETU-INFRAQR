"""
BSS Employment Card renderer — pixel-accurate match to the reference design.
Front: portrait card with logo header, verified banner, circular photo,
       name/QR row, 2×2 detail grid, construction bg, icon footer.
Back:  navy header, data rows with circle icons, disclaimer, signature, URL bar.
"""
import io, os, math
import qrcode
from django.http import HttpResponse
from PIL import Image, ImageDraw, ImageFont, ImageFilter

STATIC = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static", "qr")
LOGO_PATH    = os.path.join(STATIC, "bharatshramsetu-logo.png")
WORKER_PHOTO = os.path.join(STATIC, "default_worker.png")

# ── Palette ──────────────────────────────────────────────────────────────────
NAVY        = (2,   43,  94)
NAVY_DARK   = (1,   26,  60)
ORANGE      = (245, 130, 32)
GREEN       = (8,   124, 56)
TEAL        = (0,   138, 138)
WHITE       = (255, 255, 255)
OFF_WHITE   = (247, 250, 253)
LIGHT_GRAY  = (240, 244, 248)
TEXT_DARK   = (15,  23,  42)
TEXT_MED    = (51,  65,  85)
TEXT_MUTED  = (100, 116, 139)
LINK_BLUE   = (33,  117, 216)
DOT_COLOR   = (200, 215, 232)
BORDER_CLR  = (203, 213, 225)

# ── Card canvas ───────────────────────────────────────────────────────────────
CW, CH = 900, 1240          # portrait card (px)

# ── Fonts ─────────────────────────────────────────────────────────────────────
def _font(size, bold=False):
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold
        else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf" if bold
        else "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]
    for p in candidates:
        try: return ImageFont.truetype(p, size)
        except Exception: pass
    return ImageFont.load_default()

# ── Utils ─────────────────────────────────────────────────────────────────────
def _trunc(text, font, max_w, draw):
    s = str(text)
    if draw.textlength(s, font=font) <= max_w: return s
    for i in range(len(s), 0, -1):
        t = s[:i] + "…"
        if draw.textlength(t, font=font) <= max_w: return t
    return "…"

def _wrap(text, font, max_w, draw):
    words, lines, cur = str(text).split(), [], ""
    for w in words:
        test = (cur + " " + w).strip()
        if draw.textlength(test, font=font) <= max_w: cur = test
        else:
            if cur: lines.append(cur)
            cur = w
    if cur: lines.append(cur)
    return lines

def _circle_mask(size):
    m = Image.new("L", (size, size), 0)
    ImageDraw.Draw(m).ellipse([0, 0, size-1, size-1], fill=255)
    return m

def _round_mask(w, h, r):
    m = Image.new("L", (w, h), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, w-1, h-1], radius=r, fill=255)
    return m

def _load_photo(photo_field):
    if not photo_field: return None
    try:
        s = str(photo_field)
        if s.lower().startswith("http"):
            import urllib.request
            with urllib.request.urlopen(s, timeout=5) as r:
                return Image.open(io.BytesIO(r.read())).convert("RGB")
        return Image.open(s).convert("RGB")
    except Exception:
        return None

def _load_default_photo():
    try: return Image.open(WORKER_PHOTO).convert("RGB")
    except Exception: return None

# ── QR builder ────────────────────────────────────────────────────────────────
def _build_qr(data, size=220):
    qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_H, box_size=8, border=2)
    qr.add_data(data); qr.make(fit=True)
    base = qr.make_image(fill_color="black", back_color="white").convert("RGBA")
    # Recolour modules to navy
    px = base.load()
    for y in range(base.size[1]):
        for x in range(base.size[0]):
            r,g,b,a = px[x,y]
            if r < 128: px[x,y] = (*NAVY, 255)
    inner = size - 20
    scaled = base.resize((inner, inner), Image.NEAREST)
    canvas = Image.new("RGBA", (size, size), (255,255,255,255))
    canvas.paste(scaled, (10, 10))
    # Logo badge
    try:
        logo = Image.open(LOGO_PATH).convert("RGBA")
        lsz = int(inner * 0.22)
        logo = logo.resize((lsz, lsz), Image.LANCZOS)
        pad = 7; bsz = lsz + 2*pad
        badge = Image.new("RGBA", (bsz, bsz), (255,255,255,255))
        bmask = Image.new("L", (bsz, bsz), 0)
        ImageDraw.Draw(bmask).rounded_rectangle([0,0,bsz-1,bsz-1], radius=bsz//4, fill=255)
        badge.paste(logo, (pad, pad), logo)
        ring = Image.new("RGBA", (bsz, bsz), (0,0,0,0))
        ImageDraw.Draw(ring).rounded_rectangle([0,0,bsz-1,bsz-1], radius=bsz//4,
                                               outline=ORANGE, width=4)
        bx = (size - bsz)//2; by = (size - bsz)//2
        canvas.paste(badge, (bx, by), bmask)
        canvas.paste(ring,  (bx, by), ring)
    except Exception: pass
    # Border
    fp = 8; fsz = size + 2*fp
    final = Image.new("RGBA", (fsz, fsz), (255,255,255,255))
    ImageDraw.Draw(final).rounded_rectangle([2,2,fsz-3,fsz-3], radius=14,
                                             outline=NAVY, width=3)
    final.paste(canvas, (fp, fp), canvas)
    return final.convert("RGB")

def qr_png_bytes(data, box=(240,240)):
    img = _build_qr(data, box[0] if isinstance(box,(tuple,list)) else box)
    buf = io.BytesIO(); img.save(buf, "PNG"); return buf.getvalue()

# ── Circle icon helper ────────────────────────────────────────────────────────
def _draw_icon_circle(draw, cx, cy, radius, bg_color, border_color, symbol, symbol_font, symbol_color=WHITE):
    """Draw a filled circle with a border and centred symbol."""
    draw.ellipse([cx-radius, cy-radius, cx+radius, cy+radius],
                 fill=bg_color, outline=border_color, width=2)
    draw.text((cx, cy), symbol, font=symbol_font, fill=symbol_color, anchor="mm")

# ── Entity detail extractors ──────────────────────────────────────────────────
def _front_info(entity_type, entity):
    if entity_type == "WORKER":
        site = entity.site.name if entity.site else "—"
        loc2 = (entity.employer.name if entity.employer else "") 
        location = site + (f"\n{loc2}" if loc2 else "")
        return {
            "name":       entity.full_name or "—",
            "desig":      getattr(entity, "designation", None) or "Worker",
            "contractor": entity.contractor.name if entity.contractor else "—",
            "code":       entity.worker_id or f"W{entity.pk:07d}",
            "dept":       getattr(entity, "department", None) or "—",
            "mobile":     entity.mobile or "—",
            "location":   location,
        }
    if entity_type == "CONTRACTOR":
        return {
            "name":       entity.name or "—",
            "desig":      "Contractor",
            "contractor": entity.employer.name if entity.employer else "—",
            "code":       f"CON{entity.pk:06d}",
            "dept":       "Contract Work",
            "mobile":     entity.contact_mobile or "—",
            "location":   entity.site_name or "—",
        }
    return {
        "name": entity.name if hasattr(entity,'name') else "—",
        "desig": "Employer", "contractor": "—",
        "code": f"EMP{entity.pk:06d}", "dept": "Management",
        "mobile": getattr(entity,'contact_mobile',"—") or "—",
        "location": getattr(entity,'city',"—") or "—",
    }

def _back_rows(entity_type, entity):
    if entity_type == "WORKER":
        return [
            ("drop", "Blood Group",              entity.blood_group or "—",         False),
            ("phone","Emergency Contact Number", getattr(entity, "emergency_contact", None) or "—",    True),
            ("group","Relation",                 getattr(entity, "emergency_relation", None) or "—",   False),
            ("camp", "Camp No.",                 getattr(entity,"camp_no",None) or "—", True),
            ("key",  "UAN No.",                  getattr(entity, "uan_no", None) or "—",             False),
            ("shield","ESIC No.",                getattr(entity, "esic_no", None) or "—",            False),
            ("user", "Supervisor Name",          getattr(entity,"supervisor_name",None) or "—", False),
            ("phone2","Supervisor No.",          getattr(entity,"supervisor_mobile",None) or "—", True),
            ("bus",  "Route/Bus No.",            getattr(entity,"route_no",None) or "—", False),
        ]
    if entity_type == "CONTRACTOR":
        return [
            ("doc",  "PAN No.",        entity.pan_no or "—",        False),
            ("tax",  "GSTIN",          entity.gstin or "—",          False),
            ("id",   "Industry",       entity.industry or "—",       False),
            ("state","State",          entity.state or "—",          False),
            ("city", "City",           entity.city or "—",           False),
            ("user", "Contact Person", entity.contact_person or "—", False),
            ("mail", "Email",          entity.email or "—",          False),
        ]
    return []

# ── FRONT card ────────────────────────────────────────────────────────────────
def _draw_front(entity_type, entity, qr_ref):
    img = Image.new("RGB", (CW, CH), WHITE)
    d   = ImageDraw.Draw(img)

    # Outer rounded border
    d.rounded_rectangle([2, 2, CW-3, CH-3], radius=22, outline=BORDER_CLR, width=3)

    # ── 1. HEADER (white, 115px) ──────────────────────────────────────────────
    HH = 115
    # Logo
    lsz = 82
    lx, ly = 18, 16
    try:
        logo = Image.open(LOGO_PATH).convert("RGBA")
        logo = logo.resize((lsz, lsz), Image.LANCZOS)
        img.paste(logo, (lx, ly), logo)
    except Exception:
        d.ellipse([lx, ly, lx+lsz, ly+lsz], fill=ORANGE)

    # Brand text
    tx = lx + lsz + 12
    d.text((tx, 14), "BHARAT",     font=_font(28, True), fill=NAVY)
    d.text((tx, 46), "SHRAM SETU", font=_font(28, True), fill=ORANGE)
    d.text((tx, 80), "One Worker. One Identity. One Future.",
           font=_font(13), fill=TEXT_MUTED)

    # Green+Orange accent lines under tagline
    acc_y = 97
    d.rectangle([tx, acc_y,   tx+60, acc_y+3], fill=ORANGE)
    d.rectangle([tx+64, acc_y, tx+124, acc_y+3], fill=GREEN)
    d.rectangle([tx+128, acc_y, tx+188, acc_y+3], fill=NAVY)

    # Vertical separator
    sep_x = 430
    d.line([(sep_x, 14), (sep_x, HH-8)], fill=BORDER_CLR, width=2)

    # "EMPLOYMENT CARD"
    ec_cx = sep_x + (CW - sep_x)//2
    d.text((ec_cx, 22), "EMPLOYMENT", font=_font(26, True), fill=NAVY, anchor="mt")
    d.text((ec_cx, 58), "CARD",       font=_font(26, True), fill=NAVY, anchor="mt")

    # ── 2. VERIFIED BANNER (navy, 50px) ───────────────────────────────────────
    BY = HH
    BH = 50
    d.rectangle([3, BY, CW-4, BY+BH], fill=NAVY)
    # shield "🛡" approximation — draw a rounded pentagon
    sx, sy = CW//2 - 120, BY + 13
    d.rounded_rectangle([sx, sy, sx+26, sy+24], radius=4, fill=WHITE)
    d.text((sx+13, sy+12), "☉", font=_font(14), fill=NAVY, anchor="mm")
    info = _front_info(entity_type, entity)
    role_txt = f"VERIFIED {entity_type.replace('_',' ')} ID"
    d.text((CW//2, BY+25), role_txt, font=_font(22, True), fill=WHITE, anchor="mm")

    # ── 3. PHOTO (circular, left) ─────────────────────────────────────────────
    PY  = BY + BH + 18        # top of photo
    PSZ = 195                  # diameter
    PCX = 18 + PSZ//2         # circle centre x
    PCY = PY + PSZ//2         # circle centre y

    # Cyan/teal ring around photo
    ring_pad = 4
    d.ellipse([PCX - PSZ//2 - ring_pad, PCY - PSZ//2 - ring_pad,
               PCX + PSZ//2 + ring_pad, PCY + PSZ//2 + ring_pad],
              fill=TEAL)

    photo = _load_photo(getattr(entity, "photo", None)) or _load_default_photo()
    if photo:
        photo = photo.resize((PSZ, PSZ), Image.LANCZOS)
        mask  = _circle_mask(PSZ)
        img.paste(photo, (PCX - PSZ//2, PCY - PSZ//2), mask)
    else:
        d.ellipse([PCX-PSZ//2, PCY-PSZ//2, PCX+PSZ//2, PCY+PSZ//2], fill=LIGHT_GRAY)

    # ── 4. NAME / DESIG / QR ─────────────────────────────────────────────────
    NX = PCX + PSZ//2 + 20    # name text start x
    NY = PY + 10

    d.text((NX, NY),    info["name"],  font=_font(40, True), fill=NAVY)
    d.text((NX, NY+50), info["desig"], font=_font(22),       fill=TEXT_MED)
    con_txt = f"Contractor : {info['contractor']}"
    d.text((NX, NY+80), con_txt,       font=_font(19),       fill=TEXT_MED)

    # QR — top-right of this section
    QSZ = 210
    QX  = CW - QSZ - 18
    QY  = PY + 5
    qr_img = _build_qr(qr_ref, QSZ)
    img.paste(qr_img, (QX, QY))

    # ── 5. DETAIL GRID (2 × 2) ────────────────────────────────────────────────
    GY = PY + PSZ + 28         # grid top
    GH = 95                    # row height
    CL = CW // 2               # column split

    grid_items = [
        # (icon_char, icon_bg, label, value, col, row)
        ("⊞", (230,240,255), "Worker Code",   info["code"],     0, 0),
        ("⊟", (230,255,240), "Department",    info["dept"],     1, 0),
        ("☎", (230,240,255), "Mobile Number", info["mobile"],   0, 1),
        ("⊕", (230,255,240), "Work Location", info["location"], 1, 1),
    ]

    icon_fnt   = _font(20)
    label_fnt  = _font(16)
    value_fnt  = _font(22, True)
    loc_fnt    = _font(19, True)

    for (icon, icon_bg, lbl, val, col, row) in grid_items:
        gx = 14 + col * CL
        gy = GY + row * GH

        # Thin column divider
        if col == 1:
            d.line([(CL, gy+8), (CL, gy+GH-8)], fill=BORDER_CLR, width=1)

        # Icon circle
        icx = gx + 34
        icy = gy + GH//2
        d.ellipse([icx-26, icy-26, icx+26, icy+26],
                  fill=icon_bg, outline=BORDER_CLR, width=2)
        d.text((icx, icy), icon, font=icon_fnt, fill=NAVY, anchor="mm")

        # Label & value
        tx2 = icx + 38
        d.text((tx2, gy+14), lbl, font=label_fnt, fill=TEXT_MUTED)
        # Value (multi-line for location)
        lines = val.split("\n")
        d.text((tx2, gy+36), _trunc(lines[0], value_fnt, CL-tx2-8, d),
               font=value_fnt, fill=TEXT_DARK)
        if len(lines) > 1:
            d.text((tx2, gy+62), _trunc(lines[1], loc_fnt, CL-tx2-8, d),
                   font=loc_fnt, fill=TEXT_MUTED)

        # Dotted horizontal separator
        sep_y = gy + GH - 2
        for dx in range(14 + col * CL, 14 + (col+1) * CL - 14, 8):
            d.rectangle([dx, sep_y, dx+4, sep_y+1], fill=DOT_COLOR)

    # ── 6. CONSTRUCTION SILHOUETTE BG ─────────────────────────────────────────
    # Draw a subtle light-blue construction scene behind the lower half
    bg_y = GY - 10
    bg_h = CH - bg_y - 115
    # sky gradient
    for yi in range(bg_h):
        alpha = int(12 * (1 - yi/bg_h))
        clr   = (200, 220, 240)
        d.rectangle([3, bg_y+yi, CW-4, bg_y+yi+1], fill=clr)

    # Simple crane silhouette (left side)
    crane_x, crane_y = 14, bg_y + 20
    crane_clr = (170, 195, 220)
    # Mast
    d.rectangle([crane_x+10, crane_y, crane_x+18, crane_y+bg_h-30], fill=crane_clr)
    # Jib (horizontal arm)
    d.rectangle([crane_x+10, crane_y, crane_x+110, crane_y+8],      fill=crane_clr)
    # Counter jib
    d.rectangle([crane_x-30, crane_y, crane_x+10, crane_y+6],       fill=crane_clr)
    # Hook line
    d.rectangle([crane_x+80, crane_y+8, crane_x+82, crane_y+50],    fill=crane_clr)
    # Building blocks
    for bx, bh in [(crane_x+120, 60),(crane_x+160, 80),(crane_x+200, 50),
                   (crane_x+250, 100),(crane_x+300, 70)]:
        d.rectangle([bx, crane_y+bg_h-bh-28, bx+38, crane_y+bg_h-28], fill=crane_clr)
    # Worker silhouettes (right)
    for wx in [CW-180, CW-130, CW-80]:
        d.ellipse([wx-10, crane_y+bg_h-70, wx+10, crane_y+bg_h-50], fill=crane_clr)
        d.rectangle([wx-8, crane_y+bg_h-50, wx+8, crane_y+bg_h-24], fill=crane_clr)

    # Redraw the grid items over the bg
    for (icon, icon_bg, lbl, val, col, row) in grid_items:
        gx = 14 + col * CL
        gy = GY + row * GH
        icx = gx + 34; icy = gy + GH//2
        d.ellipse([icx-26, icy-26, icx+26, icy+26],
                  fill=icon_bg, outline=BORDER_CLR, width=2)
        d.text((icx, icy), icon, font=icon_fnt, fill=NAVY, anchor="mm")
        tx2 = icx + 38
        d.text((tx2, gy+14), lbl, font=label_fnt, fill=TEXT_MUTED)
        lines = val.split("\n")
        d.text((tx2, gy+36), _trunc(lines[0], value_fnt, CL-tx2-8, d),
               font=value_fnt, fill=TEXT_DARK)
        if len(lines) > 1:
            d.text((tx2, gy+62), _trunc(lines[1], loc_fnt, CL-tx2-8, d),
                   font=loc_fnt, fill=TEXT_MUTED)

    # ── 7. ORANGE + GREEN ACCENT STRIPE ──────────────────────────────────────
    stripe_y = CH - 112
    d.rectangle([3, stripe_y, CW-4, stripe_y+6], fill=ORANGE)
    d.rectangle([3, stripe_y+7, CW-4, stripe_y+10], fill=GREEN)

    # ── 8. FOOTER ICONS ──────────────────────────────────────────────────────
    footer_y = stripe_y + 14
    footer_bg = NAVY
    d.rounded_rectangle([3, stripe_y+12, CW-4, CH-3], radius=20, fill=footer_bg)

    footer_items = [
        ("🛡", "Verified\nIdentity"),
        ("💼", "Portable\nAcross Jobs"),
        ("🔒", "Secure &\nTrusted"),
        ("📷", "Scan for\nVerification"),
    ]
    fw = CW // len(footer_items)
    fi_fnt  = _font(26)
    fl_fnt  = _font(14)

    for i, (icon, label) in enumerate(footer_items):
        fx = fw * i + fw // 2
        fy = footer_y + 8
        # Icon circle
        d.ellipse([fx-22, fy, fx+22, fy+44], fill=(255,255,255,0))
        d.rounded_rectangle([fx-22, fy, fx+22, fy+44], radius=10,
                             outline=(255,255,255,80), width=2)
        d.text((fx, fy+22), icon, font=fi_fnt, fill=WHITE, anchor="mm")
        # Label
        lines = label.split("\n")
        for j, ln in enumerate(lines):
            d.text((fx, fy+50 + j*17), ln, font=fl_fnt, fill=WHITE, anchor="mt")

    return img


# ── BACK card ────────────────────────────────────────────────────────────────
def _draw_back(entity_type, entity, qr_ref):
    img = Image.new("RGB", (CW, CH), WHITE)
    d   = ImageDraw.Draw(img)

    d.rounded_rectangle([2, 2, CW-3, CH-3], radius=22, outline=BORDER_CLR, width=3)

    # ── 1. DARK NAVY HEADER ───────────────────────────────────────────────────
    HH = 100
    d.rounded_rectangle([3, 3, CW-4, HH], radius=20, fill=NAVY_DARK)

    # Decorative lines + title
    title = "Your Identity. Your Work. Your Security."
    tf    = _font(20, True)
    tw    = d.textlength(title, font=tf)
    tx_c  = CW // 2
    ty    = 18
    # Side lines
    line_w = (CW - tw - 80) // 2
    d.line([(20, ty+14), (20+line_w, ty+14)], fill=(255,255,255,180), width=2)
    d.line([(CW-20-line_w, ty+14), (CW-20, ty+14)], fill=(255,255,255,180), width=2)
    d.text((tx_c, ty), title, font=tf, fill=WHITE, anchor="mt")

    # Shield icon row
    sh_y = ty + 36
    d.text((tx_c, sh_y), "🛡", font=_font(28), fill=ORANGE, anchor="mt")

    # ── 2. DATA ROWS ─────────────────────────────────────────────────────────
    rows    = _back_rows(entity_type, entity)
    ROW_H   = 57
    START_Y = HH + 8

    icon_map = {
        "drop":   ("💧", (220,240,255)),
        "phone":  ("📞", (220,255,220)),
        "group":  ("👥", (255,240,220)),
        "camp":   ("⛺", (240,220,255)),
        "key":    ("🔑", (255,255,220)),
        "shield": ("🏥", (220,240,255)),
        "user":   ("👤", (240,255,240)),
        "phone2": ("📱", (220,255,220)),
        "bus":    ("🚌", (255,240,220)),
        "doc":    ("📄", (220,240,255)),
        "tax":    ("🏛", (240,255,240)),
        "id":     ("🏭", (255,240,220)),
        "state":  ("📍", (220,240,255)),
        "city":   ("🏙", (240,255,240)),
        "mail":   ("📧", (255,240,220)),
    }

    lbl_fnt = _font(18)
    val_fnt = _font(19, True)
    ico_fnt = _font(20)

    for i, (icon_key, label, value, is_link) in enumerate(rows):
        ry = START_Y + i * ROW_H
        # Alternating row bg
        row_bg = OFF_WHITE if i % 2 == 0 else WHITE
        d.rectangle([4, ry, CW-5, ry+ROW_H-1], fill=row_bg)

        icon_char, icon_bg = icon_map.get(icon_key, ("•", LIGHT_GRAY))
        # Icon circle
        icx = 36; icy = ry + ROW_H//2
        d.ellipse([icx-22, icy-22, icx+22, icy+22],
                  fill=icon_bg, outline=BORDER_CLR, width=2)
        d.text((icx, icy), icon_char, font=ico_fnt, fill=NAVY, anchor="mm")

        # Label
        lbl_x = 70
        d.text((lbl_x, ry+12), label, font=lbl_fnt, fill=TEXT_MED)
        # Colon
        colon_x = lbl_x + 220
        d.text((colon_x, ry+12), ":", font=lbl_fnt, fill=TEXT_MED)
        # Value
        val_x = colon_x + 20
        val_color = LINK_BLUE if is_link else TEXT_DARK
        d.text((val_x, ry+10), _trunc(value, val_fnt, CW-val_x-12, d),
               font=val_fnt, fill=val_color)

        # Dotted separator
        dot_y = ry + ROW_H - 2
        for dx in range(4, CW-5, 9):
            d.rectangle([dx, dot_y, dx+5, dot_y+1], fill=DOT_COLOR)

    # ── 3. DISCLAIMER BOX ────────────────────────────────────────────────────
    disc_y = START_Y + len(rows) * ROW_H + 10
    disc_h = 80
    d.rounded_rectangle([14, disc_y, CW-15, disc_y+disc_h], radius=8,
                         fill=(240, 245, 255), outline=BORDER_CLR, width=1)

    bullets = [
        "This identity card must always be carried & displayed for security & identification.",
        "Loss or theft of this card should be reported to shipra@talentcompliance.in.",
        "This card is not transferable & must be returned immediately on cessation of employment.",
    ]
    bf = _font(13)
    by = disc_y + 8
    for bul in bullets:
        d.text((28, by), "•", font=bf, fill=NAVY)
        for j, ln in enumerate(_wrap(bul, bf, CW-60, d)):
            d.text((44, by + j*18), ln, font=bf, fill=TEXT_MED)
        by += len(_wrap(bul, bf, CW-60, d)) * 18 + 4

    # ── 4. ISSUE / VALID UPTO ────────────────────────────────────────────────
    import datetime
    now       = datetime.date.today()
    issue_str = now.strftime("%d/%m/%Y")
    valid_str = (now + datetime.timedelta(days=365)).strftime("%d/%m/%Y")
    iv_y      = disc_y + disc_h + 14
    date_fnt  = _font(17)
    d.text((22,  iv_y), "📅", font=date_fnt, fill=NAVY)
    d.text((50,  iv_y), f"Issue Date  :  {issue_str}", font=date_fnt, fill=NAVY)
    d.text((CW-22, iv_y), f"Valid Upto  :  {valid_str}",
           font=date_fnt, fill=LINK_BLUE, anchor="ra")
    d.line([(22, iv_y+26), (CW-22, iv_y+26)], fill=BORDER_CLR, width=1)

    # ── 5. SIGNATURE ────────────────────────────────────────────────────────
    sig_y   = iv_y + 36
    info    = _front_info(entity_type, entity)
    sig_fnt = _font(24, True)   # simulate cursive with bold
    name_fnt= _font(16, True)
    role_fnt= _font(15)

    d.text((32, sig_y), info["name"], font=sig_fnt, fill=NAVY)
    d.line([(32, sig_y+34), (260, sig_y+34)], fill=TEXT_MED, width=2)
    d.text((32, sig_y+40), info["name"],  font=name_fnt, fill=TEXT_DARK)
    d.text((32, sig_y+60), info["desig"], font=role_fnt,  fill=TEXT_MUTED)

    if entity_type == "WORKER":
        d.text((CW-22, sig_y+48), f"Contractor : {info['contractor']}",
               font=role_fnt, fill=TEXT_MED, anchor="ra")

    # ── 6. GREEN FOOTER URL BAR ──────────────────────────────────────────────
    foot_y = CH - 54
    d.rounded_rectangle([3, foot_y, CW-4, CH-3], radius=18, fill=GREEN)
    url_fnt = _font(16)
    d.text((22, foot_y+16), "🌐", font=url_fnt, fill=WHITE)
    d.text((50, foot_y+16),
           "https://login.bharatshramsetu.com/RetailSection/ContractorWorker",
           font=url_fnt, fill=WHITE)

    return img


# ── Public API ────────────────────────────────────────────────────────────────
def identity_card_image(entity_type, entity, qr_reference, side="front", **_):
    if side == "back":
        return _draw_back(entity_type, entity, qr_reference)
    return _draw_front(entity_type, entity, qr_reference)

def worker_card_image(worker, qr_reference, side="front"):
    return identity_card_image("WORKER", worker, qr_reference, side=side)

def contractor_card_image(contractor, qr_reference, side="front"):
    return identity_card_image("CONTRACTOR", contractor, qr_reference, side=side)

def employer_card_image(employer, qr_reference, side="front"):
    return identity_card_image("EMPLOYER", employer, qr_reference, side=side)

def entity_card_image(entity_type, entity, qr_reference, side="front"):
    if entity_type == "CONTRACTOR": return contractor_card_image(entity, qr_reference, side)
    if entity_type == "EMPLOYER":   return employer_card_image(entity, qr_reference, side)
    return worker_card_image(entity, qr_reference, side)

def simple_identity_card(name, role, email, qr_reference, user_id=""):
    img = Image.new("RGB", (CW, CH), WHITE)
    d   = ImageDraw.Draw(img)
    d.rounded_rectangle([2, 2, CW-3, CH-3], radius=22, outline=BORDER_CLR, width=3)
    try:
        logo = Image.open(LOGO_PATH).convert("RGBA").resize((80, 80), Image.LANCZOS)
        img.paste(logo, (18, 16), logo)
    except Exception: pass
    d.text((110, 18), "BHARAT SHRAM SETU", font=_font(28, True), fill=NAVY)
    d.text((110, 54), "Digital Identity Card", font=_font(20), fill=TEXT_MUTED)
    d.line([(14, 106), (CW-14, 106)], fill=NAVY, width=2)
    y = 130
    for lbl, val in [("Name", name), ("Role", role), ("Email", email), ("User ID", user_id)]:
        d.text((30, y), f"{lbl}:", font=_font(18), fill=TEXT_MUTED)
        d.text((240, y), str(val)[:44], font=_font(19, True), fill=TEXT_DARK)
        d.line([(14, y+42), (CW-14, y+42)], fill=BORDER_CLR, width=1)
        y += 60
    qsz = 220
    qx  = (CW - qsz) // 2
    img.paste(_build_qr(qr_reference, qsz), (qx, CH-qsz-80))
    d.text((CW//2, CH-44), "One Nation. One Platform. One Worker.",
           font=_font(17), fill=NAVY, anchor="mm")
    return img


# ── PDF helpers ───────────────────────────────────────────────────────────────
def _card_to_pdf_single(img, qr_reference):
    """Single-side portrait PDF."""
    from reportlab.lib.pagesizes import A4
    from reportlab.pdfgen import canvas as rl_canvas
    buf = io.BytesIO()
    c   = rl_canvas.Canvas(buf, pagesize=A4)
    a4w, a4h = A4
    tmp = "/tmp/_bss_card_tmp.png"
    img.save(tmp, "PNG")
    cw = 380; ch = int(cw * img.size[1] / img.size[0])
    c.drawImage(tmp, (a4w-cw)/2, a4h-ch-80, width=cw, height=ch)
    c.setFont("Helvetica", 9)
    c.drawString((a4w-cw)/2, a4h-ch-100, f"QR Reference: {qr_reference}")
    c.showPage(); c.save()
    return buf.getvalue()

def _card_to_pdf_both(front_img, back_img, qr_reference):
    """Both sides side-by-side on one landscape A4 PDF page."""
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.pdfgen import canvas as rl_canvas
    buf = io.BytesIO()
    page_w, page_h = landscape(A4)   # ~841 × 595 pt
    c = rl_canvas.Canvas(buf, pagesize=landscape(A4))

    # Save both sides as temp PNGs
    tmp_f = "/tmp/_bss_front_tmp.png"
    tmp_b = "/tmp/_bss_back_tmp.png"
    front_img.save(tmp_f, "PNG")
    back_img.save(tmp_b,  "PNG")

    # Each card gets half the page width with margins
    margin = 24
    gap    = 16
    card_w = (page_w - margin*2 - gap) / 2
    card_h = int(card_w * front_img.size[1] / front_img.size[0])
    card_y = (page_h - card_h) / 2   # vertically centred

    # Front (left)
    c.drawImage(tmp_f, margin, card_y, width=card_w, height=card_h)
    # Back (right)
    c.drawImage(tmp_b, margin + card_w + gap, card_y, width=card_w, height=card_h)

    # Labels
    c.setFont("Helvetica-Bold", 9)
    c.setFillColorRGB(0.1, 0.17, 0.37)
    c.drawCentredString(margin + card_w/2,           card_y - 16, "FRONT SIDE")
    c.drawCentredString(margin + card_w + gap + card_w/2, card_y - 16, "BACK SIDE")

    # Footer
    c.setFont("Helvetica", 8)
    c.setFillColorRGB(0.4, 0.45, 0.55)
    c.drawCentredString(page_w/2, 16,
        f"Bharat Shram Setu Employment Card  |  QR Ref: {qr_reference}")

    c.showPage(); c.save()
    return buf.getvalue()

# Keep old name as alias for backward compat
def _card_to_pdf(img, qr_reference):
    return _card_to_pdf_single(img, qr_reference)

# ── Public API ────────────────────────────────────────────────────────────────
def identity_card_image(entity_type, entity, qr_reference, side="front", **_):
    if side == "back":
        return _draw_back(entity_type, entity, qr_reference)
    if side == "both":
        # Return a tuple (front, back) — callers must handle this
        return (_draw_front(entity_type, entity, qr_reference),
                _draw_back(entity_type, entity, qr_reference))
    return _draw_front(entity_type, entity, qr_reference)

def worker_card_image(worker, qr_reference, side="front"):
    return identity_card_image("WORKER", worker, qr_reference, side=side)

def contractor_card_image(contractor, qr_reference, side="front"):
    return identity_card_image("CONTRACTOR", contractor, qr_reference, side=side)

def employer_card_image(employer, qr_reference, side="front"):
    return identity_card_image("EMPLOYER", employer, qr_reference, side=side)

def entity_card_image(entity_type, entity, qr_reference, side="front"):
    if entity_type == "CONTRACTOR": return contractor_card_image(entity, qr_reference, side)
    if entity_type == "EMPLOYER":   return employer_card_image(entity, qr_reference, side)
    return worker_card_image(entity, qr_reference, side)

def simple_identity_card(name, role, email, qr_reference, user_id=""):
    img = Image.new("RGB", (CW, CH), WHITE)
    d   = ImageDraw.Draw(img)
    d.rounded_rectangle([2, 2, CW-3, CH-3], radius=22, outline=BORDER_CLR, width=3)
    try:
        logo = Image.open(LOGO_PATH).convert("RGBA").resize((80, 80), Image.LANCZOS)
        img.paste(logo, (18, 16), logo)
    except Exception: pass
    d.text((110, 18), "BHARAT SHRAM SETU", font=_font(28, True), fill=NAVY)
    d.text((110, 54), "Digital Identity Card", font=_font(20), fill=TEXT_MUTED)
    d.line([(14, 106), (CW-14, 106)], fill=NAVY, width=2)
    y = 130
    for lbl, val in [("Name", name), ("Role", role), ("Email", email), ("User ID", user_id)]:
        d.text((30, y), f"{lbl}:", font=_font(18), fill=TEXT_MUTED)
        d.text((240, y), str(val)[:44], font=_font(19, True), fill=TEXT_DARK)
        d.line([(14, y+42), (CW-14, y+42)], fill=BORDER_CLR, width=1)
        y += 60
    qsz = 220
    qx  = (CW - qsz) // 2
    img.paste(_build_qr(qr_reference, qsz), (qx, CH-qsz-80))
    d.text((CW//2, CH-44), "One Nation. One Platform. One Worker.",
           font=_font(17), fill=NAVY, anchor="mm")
    return img

# ── Django HTTP helpers ───────────────────────────────────────────────────────
def card_response(worker, qr_reference, fmt="png", side="front"):
    if side == "both" and fmt == "pdf":
        front = worker_card_image(worker, qr_reference, side="front")
        back  = worker_card_image(worker, qr_reference, side="back")
        return HttpResponse(
            _card_to_pdf_both(front, back, qr_reference),
            content_type="application/pdf",
        )
    img = worker_card_image(worker, qr_reference, side=side)
    if fmt == "pdf":
        return HttpResponse(_card_to_pdf_single(img, qr_reference), content_type="application/pdf")
    buf = io.BytesIO(); img.save(buf, "PNG")
    return HttpResponse(buf.getvalue(), content_type="image/png")

def entity_card_response(entity_type, entity, qr_reference, fmt="png", side="front"):
    """Render entity card.  side='both'+fmt='pdf' → dual-side landscape PDF."""
    if side == "both" and fmt == "pdf":
        front = entity_card_image(entity_type, entity, qr_reference, side="front")
        back  = entity_card_image(entity_type, entity, qr_reference, side="back")
        return HttpResponse(
            _card_to_pdf_both(front, back, qr_reference),
            content_type="application/pdf",
        )
    img = entity_card_image(entity_type, entity, qr_reference, side=side)
    if fmt == "pdf":
        return HttpResponse(_card_to_pdf_single(img, qr_reference), content_type="application/pdf")
    buf = io.BytesIO(); img.save(buf, "PNG")
    return HttpResponse(buf.getvalue(), content_type="image/png")

