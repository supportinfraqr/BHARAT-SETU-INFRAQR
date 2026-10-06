import difflib
import time
from dataclasses import dataclass
from typing import List, Optional, Tuple

import cv2
import numpy as np

try:
    from pyzbar.pyzbar import decode as _zbar_decode, ZBarSymbol
except ImportError:
    _zbar_decode = None
    ZBarSymbol = None

# ZBar's PDF417 decoder has a known internal assertion bug that spams warnings
# on frames that vaguely resemble a PDF417 pattern. We don't use PDF417 here,
# so it's excluded outright rather than suppressed after the fact.
_DEFAULT_SYMBOLS = None
if ZBarSymbol is not None:
    _wanted_names = [
        "QRCODE", "EAN13", "EAN8", "UPCA", "UPCE",
        "CODE128", "CODE39", "CODE93", "I25",
    ]
    _DEFAULT_SYMBOLS = [
        getattr(ZBarSymbol, name) for name in _wanted_names
        if hasattr(ZBarSymbol, name)
    ] or None


@dataclass
class QRDetection:
    payload: str
    symbology: str
    bbox: Tuple[int, int, int, int]
    matched_label: Optional[str] = None
    match_score: float = 0.0
    should_log: bool = True


def _normalize(s: str) -> str:
    return " ".join(s.strip().lower().split())


class QRDetector:
    """Detects and decodes QR codes *and* 1D/2D barcodes (EAN-13, Code128,
    Code39, etc.) from a frame.

    Uses `pyzbar` (ZBar bindings) when available, since it decodes both QR
    codes and common barcode symbologies through a single call. Falls back to
    OpenCV's QR-only detector if pyzbar/zbar isn't installed on the system.

    Every decoded string is fuzzy-matched (difflib) against a set of known
    codes enrolled via `enroll.py --code LABEL --value STRING`, so a scan
    that's close enough to (but not byte-identical to) an enrolled value -
    e.g. a slightly misread character - still resolves to the right label.
    """

    def __init__(self, config: dict, db=None):
        cfg = config.get("qr", {})
        self.enabled = bool(cfg.get("enabled", True))
        self.cooldown_s = float(cfg.get("cooldown_s", 10.0))
        self.max_width = int(cfg.get("max_width", 640))
        # Distance strategy (payment-app style): cheap downscaled pass first
        # for near codes; only when it finds nothing, retry at (near-)full
        # resolution where distant/small codes are still decodable.
        self.fullres_fallback = bool(cfg.get("fullres_fallback", True))
        self.fullres_width = int(cfg.get("fullres_width", 1280))
        self.match_threshold = float(cfg.get("match_threshold", 0.82))
        self.auto_register = bool(cfg.get("auto_register", False))
        # Scores below match_threshold but at/above this are "ambiguous" -
        # close-ish to some existing code (probably a noisy re-read of it)
        # but not confident enough to call it a match. Skip auto-registering
        # these to avoid spawning near-duplicate labels for the same code.
        self.auto_register_max_score = float(cfg.get("auto_register_max_score", 0.55))

        self._qr_detector = cv2.QRCodeDetector()  # fallback path only
        self._last_seen: dict = {}

        self.db = db
        self.known_codes: List[Tuple[str, str]] = db.load_known_codes() if db else []

        if _zbar_decode is None:
            print("[qr] pyzbar not installed - falling back to QR-only detection. "
                  "Install barcode support with: pip install pyzbar "
                  "(requires the system 'zbar' shared library too).")

    def _best_match(self, payload: str) -> Tuple[Optional[str], float]:
        """Fuzzy-match payload against every enrolled known code. Runs on
        every scan, not just on ones that end up logged - matching happens
        before we decide whether the cooldown suppresses the record."""
        if not self.known_codes:
            return None, 0.0
        norm_payload = _normalize(payload)
        best_label, best_score = None, 0.0
        for label, value in self.known_codes:
            score = difflib.SequenceMatcher(None, norm_payload, _normalize(value)).ratio()
            if score > best_score:
                best_label, best_score = label, score
        if best_score >= self.match_threshold:
            return best_label, best_score
        return None, best_score

    def register_unknown(self, payload: str, score: float) -> Optional[str]:
        """Auto-enroll a never-before-seen code under a generated label
        (CODE-0001, CODE-0002, ...), mirroring face_engine.register_unknown.

        Skipped when `score` falls in the ambiguous grey zone (between
        auto_register_max_score and match_threshold) - that range means the
        payload was fairly close to some existing known code without being a
        confident match, which is more likely a noisy re-read than a truly
        new code, so we don't want to spawn a near-duplicate entry for it.
        """
        if self.db is None:
            return None
        if score >= self.auto_register_max_score:
            print(f"[qr] ambiguous score {score:.2f} in grey zone "
                  f"({self.auto_register_max_score:.2f}-{self.match_threshold:.2f}), "
                  f"skipping auto-registration")
            return None
        n = self.db.conn.execute(
            "SELECT COUNT(*) FROM known_codes WHERE label LIKE 'CODE-%'"
        ).fetchone()[0]
        while True:
            n += 1
            label = f"CODE-{n:04d}"
            if not any(existing == label for existing, _ in self.known_codes):
                break
        self.db.add_known_code(label, payload)
        self.known_codes.append((label, payload))
        print(f"[qr] new code auto-registered: {label} (value={payload!r})")
        return label

    @staticmethod
    def _to_width(frame: np.ndarray, width: int) -> Tuple[np.ndarray, float]:
        """Resize to `width` (never upscale). Returns (gray, scale) where
        scale maps result coords back to the input frame."""
        h, w = frame.shape[:2]
        if w <= width:
            gray = frame if len(frame.shape) == 2 else cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            return gray, 1.0
        scale = w / width
        small = cv2.resize(frame, (width, int(round(h / scale))),
                           interpolation=cv2.INTER_AREA)
        gray = small if len(small.shape) == 2 else cv2.cvtColor(small, cv2.COLOR_BGR2GRAY)
        return gray, scale

    def _decode_raw(self, gray: np.ndarray) -> List[Tuple[str, str, Tuple[int, int, int, int]]]:
        raw: List[Tuple[str, str, Tuple[int, int, int, int]]] = []

        if _zbar_decode is not None:
            try:
                if _DEFAULT_SYMBOLS is not None:
                    symbols = _zbar_decode(gray, symbols=_DEFAULT_SYMBOLS)
                else:
                    symbols = _zbar_decode(gray)
            except Exception:
                symbols = []
            for sym in symbols:
                text = sym.data.decode("utf-8", "replace")
                if not text:
                    continue
                x, y, w, h = sym.rect
                raw.append((text, sym.type, (x, y, x + w, y + h)))
            return raw

        # Fallback: OpenCV QR-only multi-detect.
        try:
            ok, decoded, points, _ = self._qr_detector.detectAndDecodeMulti(gray)
        except Exception:
            ok, decoded, points = False, [], None
        if ok and points is not None:
            for text, pts in zip(decoded, points):
                if not text:
                    continue
                xs, ys = pts[:, 0], pts[:, 1]
                bbox = (int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max()))
                raw.append((text, "QRCODE", bbox))
        return raw

    def detect(self, frame: np.ndarray) -> List[QRDetection]:
        if not self.enabled:
            return []
        # Payment-app strategy: fast downscaled pass first; full-resolution
        # distance pass only when the fast one finds nothing. Bboxes from
        # whichever level hit are mapped back to input-frame coordinates.
        levels = [self.max_width]
        if self.fullres_fallback:
            full = min(frame.shape[1], self.fullres_width)
            if full > self.max_width:
                levels.append(full)
        decoded: List[Tuple[str, str, Tuple[int, int, int, int]]] = []
        for width in levels:
            gray, scale = self._to_width(frame, width)
            found = self._decode_raw(gray)
            if found:
                decoded = [(t, s, (int(x1 * scale), int(y1 * scale),
                                   int(x2 * scale), int(y2 * scale)))
                           for t, s, (x1, y1, x2, y2) in found]
                break

        now = time.time()
        results: List[QRDetection] = []
        for text, symbology, bbox in decoded:
            # Always fuzzy-match and always return the detection, so the box
            # stays drawn on every frame the code is actually visible. Only
            # the cooldown decides whether *this* frame should also trigger
            # a DB insert / snapshot / print - not whether it's drawn at all.
            last = self._last_seen.get(text)
            should_log = last is None or now - last >= self.cooldown_s
            if should_log:
                self._last_seen[text] = now

            label, score = self._best_match(text)
            if label is None and should_log and self.auto_register:
                new_label = self.register_unknown(text, score)
                if new_label is not None:
                    label, score = new_label, 1.0

            results.append(QRDetection(
                payload=text, symbology=symbology, bbox=bbox,
                matched_label=label, match_score=score, should_log=should_log,
            ))

        if len(self._last_seen) > 500:
            cutoff = now - max(self.cooldown_s * 10, 600)
            self._last_seen = {k: v for k, v in self._last_seen.items() if v >= cutoff}
        return results