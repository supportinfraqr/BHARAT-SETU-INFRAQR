"""Friendly on-screen overlay helpers (OpenCV window + web stream).

Design goals:
- Readable at a glance: pill labels with solid backgrounds (no thin text
  floating over video), color-coded by identity state.
- Debug detail preserved: track id, match distance, age, vitality, fps.
- Long QR payloads (e.g. JWTs) never cover the whole frame: truncated.
- Resolution-independent: all font sizes / thicknesses scale with frame
  width (baseline 960px), so fullscreen (1280/1920) stays crisp and
  proportional instead of tiny.
"""
import os
import time
from typing import List, Optional, Tuple

import cv2

# BGR colors (OpenCV order)
GREEN = (60, 200, 80)      # known person / matched code
AMBER = (40, 170, 255)     # unknown person
BLUE = (235, 160, 60)      # scanning (no face result yet)
MAGENTA = (180, 60, 220)   # unmatched QR code
GREY_BG = (30, 30, 30)
WHITE = (255, 255, 255)

FONT = cv2.FONT_HERSHEY_SIMPLEX
_BASE_WIDTH = 960.0  # overlay sizes are tuned for this width


def save_snapshot(frame, subdir: str) -> Optional[str]:
    os.makedirs(subdir, exist_ok=True)
    ts = time.strftime("%Y%m%d_%H%M%S")
    path = os.path.join(subdir, f"snap_{ts}_{int((time.time() % 1) * 1000):03d}.jpg")
    if cv2.imwrite(path, frame):
        return path
    return None


# ---------------------------------------------------------------- helpers

def _scale(frame) -> float:
    """UI scale factor relative to the 960px baseline, clamped."""
    w = frame.shape[1] if frame is not None and len(frame.shape) >= 2 else _BASE_WIDTH
    return max(0.7, min(2.2, w / _BASE_WIDTH))


def age_group(age) -> Optional[str]:
    """Bucket an estimated age into Young / Middle-aged / Old.

    Cutoffs (chosen to match the vitality age_curve anchors in config.yaml —
    full score at 20, zero at 90 — and standard working-age brackets):
      Young        < 30
      Middle-aged  30-59
      Old          >= 60
    Note DeepFace age error is typically +/-5y, so treat boundaries as soft.
    Returns None when age is None.
    """
    if age is None:
        return None
    try:
        a = float(age)
    except (TypeError, ValueError):
        return None
    if a < 30:
        return "Young"
    if a < 60:
        return "Middle-aged"
    return "Old"


def vitality_color(score: float) -> Tuple[int, int, int]:
    """Green -> amber -> red as vitality drops."""
    try:
        s = float(score)
    except (TypeError, ValueError):
        return (200, 200, 200)
    if s >= 70:
        return GREEN
    if s >= 40:
        return AMBER
    return (60, 60, 230)


def shorten_payload(payload: str, max_len: int = 38) -> str:
    """Truncate long payloads (JWTs etc.) so they fit in one pill.

    JWT-looking strings (two dots, very long) are shown as
    ``JWT:<first 14>...<last 8>`` since the middle is not human-readable.
    """
    s = str(payload).replace("\n", " ").strip()
    if len(s) > 60 and s.count(".") == 2:
        head, _, tail = s.rpartition(".")
        return f"JWT:{s[:14]}...{tail[-8:]}"
    if len(s) <= max_len:
        return s
    keep = max_len - 3
    return s[: keep - 8] + "..." + s[-8:]


def _pill(frame, text: str, org: Tuple[int, int],
          fg: Tuple[int, int, int] = WHITE,
          bg: Tuple[int, int, int] = GREY_BG,
          scale: float = 0.55, thickness: int = 1,
          pad: int = 6) -> Tuple[int, int, int, int]:
    """Draw text on a filled rounded-ish background pill. Returns pill rect."""
    s = _scale(frame)
    scale, pad = scale * s, max(3, int(round(pad * s)))
    thickness = max(1, int(round(thickness * s)))
    x, y = int(org[0]), int(org[1])
    (tw, th), baseline = cv2.getTextSize(text, FONT, scale, thickness)
    h, w = frame.shape[:2]
    x1 = max(0, min(x - pad, w - 1))
    y1 = max(0, min(y - th - pad, h - 1))
    x2 = max(0, min(x + tw + pad, w))
    y2 = max(0, min(y + baseline + pad, h))
    overlay = frame.copy()
    cv2.rectangle(overlay, (x1, y1), (x2, y2), bg, -1)
    cv2.addWeighted(overlay, 0.82, frame, 0.18, 0, frame)
    cv2.rectangle(frame, (x1, y1), (x2, y2), bg, 1)
    cv2.putText(frame, text, (x1 + pad, y2 - pad), FONT, scale, fg,
                thickness, cv2.LINE_AA)
    return x1, y1, x2, y2


def _translucent_bar(frame, y1: int, y2: int, alpha: float = 0.62) -> None:
    h, w = frame.shape[:2]
    y1c, y2c = max(0, y1), min(h, y2)
    if y2c <= y1c:
        return
    overlay = frame.copy()
    cv2.rectangle(overlay, (0, y1c), (w, y2c), (18, 18, 18), -1)
    cv2.addWeighted(overlay, alpha, frame, 1 - alpha, 0, frame)


# ---------------------------------------------------------------- boxes

def draw_person_box(frame, bbox: Tuple[int, int, int, int], label: str,
                    present: bool = True,
                    state: Optional[str] = None,
                    vitality: Optional[float] = None) -> None:
    """Person box with state color + pill label + vitality bar.

    state: 'known' | 'unknown' | 'scanning' (inferred from label if omitted).
    vitality: 0-100 score, drawn as a mini bar under the box.
    """
    s = _scale(frame)
    x1, y1, x2, y2 = (int(v) for v in bbox)
    h, w = frame.shape[:2]
    x1, y1 = max(0, x1), max(0, y1)
    x2, y2 = min(w, x2), min(h, y2)

    if state is None:
        low = label.lower()
        if "scanning" in low:
            state = "scanning"
        elif "unknown" in low or "id-" in low:
            state = "unknown"
        else:
            state = "known" if present else "unknown"
    color = {"known": GREEN, "unknown": AMBER, "scanning": BLUE}.get(state, GREEN)

    thick = max(2, int(round(2 * s)))
    cv2.rectangle(frame, (x1, y1), (x2, y2), color, thick)
    # corner accents for visibility at small sizes
    arm = min(int(22 * s), (x2 - x1) // 4, (y2 - y1) // 4)
    if arm > 4:
        for cx, cy, dx, dy in ((x1, y1, 1, 1), (x2, y1, -1, 1),
                               (x1, y2, 1, -1), (x2, y2, -1, -1)):
            cv2.line(frame, (cx, cy), (cx + dx * arm, cy), color, thick + 1)
            cv2.line(frame, (cx, cy), (cx, cy + dy * arm), color, thick + 1)

    _pill(frame, label, (x1, max(y1 - 8, int(26 * s))), fg=WHITE, bg=color)

    if vitality is not None:
        try:
            v = max(0.0, min(100.0, float(vitality)))
        except (TypeError, ValueError):
            v = 0.0
        bx1, bx2 = x1, x2
        bar_h = max(5, int(round(6 * s)))
        by = min(h - bar_h - 2, y2 + 4)
        cv2.rectangle(frame, (bx1, by), (bx2, by + bar_h), (40, 40, 40), -1)
        fill = int((bx2 - bx1) * v / 100.0)
        if fill > 0:
            cv2.rectangle(frame, (bx1, by), (bx1 + fill, by + bar_h),
                          vitality_color(v), -1)


def draw_face_box(frame, face_box_local: Tuple[int, int, int, int],
                  offset: Tuple[int, int], text: str) -> None:
    s = _scale(frame)
    ox, oy = int(offset[0]), int(offset[1])
    x1, y1, x2, y2 = (int(v) for v in face_box_local)
    ax1, ay1, ax2, ay2 = x1 + ox, y1 + oy, x2 + ox, y2 + oy
    cv2.rectangle(frame, (ax1, ay1), (ax2, ay2), (255, 180, 0),
                  max(1, int(round(2 * s))))
    if text:
        _pill(frame, shorten_payload(text, 44), (ax1, max(ay1 - 8, int(26 * s))),
              fg=WHITE, bg=(90, 90, 30), scale=0.5)


def draw_qr(frame, bbox: Tuple[int, int, int, int], payload: str,
            symbology: str = "QRCODE",
            matched_label: Optional[str] = None) -> None:
    s = _scale(frame)
    x1, y1, x2, y2 = (int(v) for v in bbox)
    color = GREEN if matched_label else MAGENTA
    cv2.rectangle(frame, (x1 - 4, y1 - 4), (x2 + 4, y2 + 4), color,
                  max(2, int(round(2 * s))))
    tag = f"[{matched_label}] " if matched_label else ""
    text = f"{tag}{symbology}: {shorten_payload(payload)}"
    _pill(frame, text, (x1, min(y2 + 30, frame.shape[0] - 12)),
          fg=WHITE, bg=color, scale=0.5)


# ---------------------------------------------------------------- HUD / chrome

def draw_hud(frame, lines: List[str]) -> None:
    """Top status bar: translucent strip + status dot + white text."""
    if not lines:
        return
    s = _scale(frame)
    row_h = int(22 * s)
    _translucent_bar(frame, 0, 28 + row_h * len(lines))
    # status dot from first line
    status_on = "present" in lines[0].lower() and "no person" not in lines[0].lower()
    dot_color = GREEN if status_on else (80, 80, 230)
    r = max(6, int(round(8 * s)))
    cv2.circle(frame, (20, int(12 * s) + 8), r, dot_color, -1)
    cv2.circle(frame, (20, int(12 * s) + 8), r, WHITE, 1)
    y = int(27 * s)
    for i, line in enumerate(lines):
        x = int(38 * s) if i == 0 else 10
        cv2.putText(frame, line, (x, y), FONT, 0.55 * s, WHITE,
                    max(1, int(round(1 * s))), cv2.LINE_AA)
        y += row_h


def draw_help_footer(frame,
                     text: str = "Q: quit  S: snapshot  F: fullscreen  A: antispoof  |  green=known  amber=unknown  blue=scanning") -> None:
    s = _scale(frame)
    h, w = frame.shape[:2]
    bar_h = int(28 * s)
    _translucent_bar(frame, h - bar_h, h, alpha=0.55)
    cv2.putText(frame, text, (10, h - int(9 * s)), FONT, 0.45 * s,
                (220, 220, 220), max(1, int(round(1 * s))), cv2.LINE_AA)


def draw_scan_toast(frame, scans: List[str], max_items: int = 3) -> None:
    """Bottom-right stack of recent QR/code scans (already shortened)."""
    if not scans:
        return
    s = _scale(frame)
    scale, thickness, pad = 0.5 * s, max(1, int(round(1 * s))), max(3, int(round(6 * s)))
    items = [shorten_payload(x, 34) for x in scans[-max_items:]]
    widths, total_h = [], 8
    heights = []
    for txt in items:
        (tw, th), bl = cv2.getTextSize("QR " + txt, FONT, scale, thickness)
        widths.append(tw + pad * 2 + 8)
        heights.append(th + bl + pad * 2)
        total_h += th + bl + pad * 2 + 6
    h, w = frame.shape[:2]
    bw = max(widths) + 8
    x0 = max(0, w - bw - 10)
    y0 = max(0, h - int(34 * s) - total_h)
    overlay = frame.copy()
    cv2.rectangle(overlay, (x0, y0), (w - 10, h - int(34 * s)), (18, 18, 18), -1)
    cv2.addWeighted(overlay, 0.7, frame, 0.3, 0, frame)
    y = y0 + 8
    for txt, bh in zip(items, heights):
        cv2.rectangle(frame, (x0 + 4, y), (x0 + 12, y + bh - 8), MAGENTA, -1)
        cv2.putText(frame, "QR " + txt, (x0 + 18, y + bh - pad - 4),
                    FONT, scale, WHITE, thickness, cv2.LINE_AA)
        y += bh + 2


def draw_empty_state(frame, text: str = "No person in view - waiting for motion...  (F: fullscreen)") -> None:
    s = _scale(frame)
    scale, thickness = 0.6 * s, max(1, int(round(1 * s)))
    (tw, th), bl = cv2.getTextSize(text, FONT, scale, thickness)
    h, w = frame.shape[:2]
    x = max(10, (w - tw) // 2)
    y = h // 2
    _pill(frame, text, (x, y), fg=(230, 230, 230), bg=(50, 50, 50),
          scale=0.6, thickness=1)


def draw_face_zoom(frame, face_img, label: Optional[str] = None,
                   size: int = 220) -> None:
    """STAGED idea 1 (off unless display.face_zoom_enabled=true).

    Magnified face inset pinned top-right, below the HUD. `face_img` is a
    BGR crop (any size); it is scaled to `size` px wide (at 960 baseline,
    auto-scaled for fullscreen). Pass e.g. ``f"#{tid} {name}"`` as label.
    No-op if `face_img` is None/empty.
    """
    if face_img is None or getattr(face_img, "size", 0) == 0:
        return
    s = _scale(frame)
    w_px = max(80, int(round(size * s)))
    fh, fw = face_img.shape[:2]
    h_px = max(1, int(round(fh * w_px / max(1, fw))))
    try:
        zoomed = cv2.resize(face_img, (w_px, h_px), interpolation=cv2.INTER_LINEAR)
    except cv2.error:
        return
    H, W = frame.shape[:2]
    m = max(6, int(round(10 * s)))
    x0 = max(0, W - w_px - m)
    y0 = min(H - h_px - m, int(84 * s))  # sit below the HUD strip
    if y0 < 0 or x0 + w_px <= 0:
        return
    frame[y0:y0 + h_px, x0:x0 + w_px] = zoomed
    cv2.rectangle(frame, (x0, y0), (x0 + w_px, y0 + h_px), WHITE,
                  max(1, int(round(2 * s))))
    if label:
        _pill(frame, shorten_payload(label, 30), (x0, y0 + h_px + int(22 * s)),
              fg=WHITE, bg=GREY_BG, scale=0.5)


def draw_roster_sidebar(frame, entries: List[dict],
                        max_entries: int = 6) -> None:
    """STAGED idea 3 (off unless display.roster_enabled=true).

    Right-side "who's in frame" panel so floating labels can't overlap when
    several people crowd the view. Each entry: dict with keys
    ``track_id`` (int), ``name`` (str), ``age`` (int|None),
    ``vitality`` (float|None), ``state`` ('known'|'unknown'|'scanning').
    The age group (Young / Middle-aged / Old) is derived via age_group().
    Shows up to `max_entries` rows, then a "+N more" line. No-op if empty.
    """
    if not entries:
        return
    s = _scale(frame)
    H, W = frame.shape[:2]
    rows = list(entries)[:max_entries]
    extra = len(entries) - len(rows)
    scale, thick = 0.5 * s, max(1, int(round(1 * s)))
    pad = max(4, int(round(8 * s)))
    line_h = int(24 * s)
    title = f"IN FRAME ({len(entries)})"
    (tw, th), _ = cv2.getTextSize(title, FONT, scale, thick)
    widest = tw
    for r in rows:
        txt = f"#{r.get('track_id', '?')} {r.get('name', '?')}"
        (t2, _), _ = cv2.getTextSize(txt, FONT, scale, thick)
        widest = max(widest, t2)
    bw = widest + pad * 2 + int(16 * s)
    bh = line_h * (len(rows) + 2) + pad
    if extra > 0:
        bh += line_h
    x0 = max(0, W - bw - 10)
    y0 = min(max(0, H - bh - int(34 * s)), int(84 * s))  # below HUD, above footer
    overlay = frame.copy()
    cv2.rectangle(overlay, (x0, y0), (x0 + bw, y0 + bh), (18, 18, 18), -1)
    cv2.addWeighted(overlay, 0.72, frame, 0.28, 0, frame)
    cv2.rectangle(frame, (x0, y0), (x0 + bw, y0 + bh), (80, 80, 80), 1)
    y = y0 + pad + int(14 * s)
    cv2.putText(frame, title, (x0 + pad, y), FONT, scale,
                (200, 200, 200), thick, cv2.LINE_AA)
    y += line_h
    dot_r = max(3, int(round(5 * s)))
    for r in rows:
        state = r.get("state", "unknown")
        dot = {"known": GREEN, "unknown": AMBER, "scanning": BLUE}.get(state, AMBER)
        cv2.circle(frame, (x0 + pad + dot_r, y - 4), dot_r, dot, -1)
        line1 = f"#{r.get('track_id', '?')} {shorten_payload(str(r.get('name', '?')), 22)}"
        cv2.putText(frame, line1, (x0 + pad + dot_r * 2 + 6, y), FONT,
                    scale, WHITE, thick, cv2.LINE_AA)
        y += int(15 * s)
        sub = []
        if r.get("age") is not None:
            grp = age_group(r["age"])
            sub.append(f"~{r['age']}y {grp}" if grp else f"~{r['age']}y")
        if r.get("vitality") is not None:
            try:
                sub.append(f"vit {float(r['vitality']):.0f}")
            except (TypeError, ValueError):
                pass
        if sub:
            cv2.putText(frame, "   " + "  ".join(sub),
                        (x0 + pad + dot_r * 2 + 6, y), FONT,
                        0.42 * s, (190, 190, 190), thick, cv2.LINE_AA)
            y += int(13 * s)
        y += int(6 * s)
    if extra > 0:
        cv2.putText(frame, f"+{extra} more", (x0 + pad, y), FONT,
                    scale, (180, 180, 180), thick, cv2.LINE_AA)


def face_quality_text(frame, person_bbox: Tuple[int, int, int, int],
                        face_box_local: Tuple[int, int, int, int]) -> str:
    """Diagnostic '96px b210' string for face labels: face-box size in pixels
    plus Laplacian sharpness measured on the CURRENT frame (the stored
    face_box may come from an earlier refresh, so coordinates are clamped).
    Read it as: >=80px and blur well above min_blur (25) = healthy feed;
    small/soft values = camera/distance problem, not a model problem."""
    x1, y1, x2, y2 = (int(v) for v in person_bbox)
    fx1, fy1, fx2, fy2 = (int(v) for v in face_box_local)
    fpx = max(fx2 - fx1, fy2 - fy1)
    h, w = frame.shape[:2]
    px1, py1, px2, py2 = max(0, x1), max(0, y1), min(w, x2), min(h, y2)
    if px2 <= px1 or py2 <= py1:
        return f"{fpx}px"
    pc = frame[py1:py2, px1:px2]
    ch, cw = pc.shape[:2]
    ax1, ay1 = max(0, min(fx1, cw)), max(0, min(fy1, ch))
    ax2, ay2 = max(0, min(fx2, cw)), max(0, min(fy2, ch))
    if ax2 <= ax1 or ay2 <= ay1:
        return f"{fpx}px"
    gray = cv2.cvtColor(pc[ay1:ay2, ax1:ax2], cv2.COLOR_BGR2GRAY)
    return f"{fpx}px b{cv2.Laplacian(gray, cv2.CV_64F).var():.0f}"
