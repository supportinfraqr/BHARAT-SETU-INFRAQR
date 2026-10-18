"""BharatShramSetu (BSS) design tokens shared by the report, charts and workbook.

config/bss_theme.json is the single source; the constants below are fallbacks only.
"""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

AGENT_ROOT = Path(__file__).resolve().parent.parent
THEME_FILE = AGENT_ROOT / "config" / "bss_theme.json"

_FALLBACK = {
    "brand": {"name": "BharatShramSetu", "short_name": "BSS",
              "tagline": "BharatShramSetu — Bridging Workers, Contractors & Trust",
              "agent_name": "BSS Document Audit Agent",
              "footer": "BharatShramSetu | Confidential Audit Report",
              "logo": "assets/bss_logo.png", "logo_dark": "assets/bss_logo_dark.png"},
    "colors": {"primary": "#0B3C5D", "secondary": "#F4A300", "accent": "#1E7A46", "bg": "#FFFFFF",
               "text_dark": "#1A1A1A", "text_muted": "#5A5A5A", "border": "#E0E0E0", "critical": "#C62828",
               "panel": "#F3F6F9", "primary_soft": "#E6EEF4", "secondary_soft": "#FDF1D8",
               "accent_soft": "#E3F2E9", "critical_soft": "#FBE9E9"},
    "fonts": {"files": {}},
    "status": {}, "risk": {},
}

STATUS_ORDER = ["Complied", "Partially Complied", "Non-Complied", "Document Not Available",
                "Not Verifiable", "Not Applicable", "Not Auditable"]
RISK_ORDER = ["Critical", "High", "Medium", "Low", "None"]


@lru_cache(maxsize=1)
def theme() -> dict:
    data = json.loads(THEME_FILE.read_text(encoding="utf-8")) if THEME_FILE.exists() else {}
    out = {k: (dict(v) if isinstance(v, dict) else v) for k, v in _FALLBACK.items()}
    for k, v in data.items():
        out[k] = {**out.get(k, {}), **v} if isinstance(v, dict) else v
    return out


def color(name: str) -> str:
    return theme()["colors"][name]


def status_color(status: str) -> str:
    return theme()["status"].get(status, {}).get("color", "#8A94A0")


def status_soft(status: str) -> str:
    return theme()["status"].get(status, {}).get("soft", "#F2F3F5")


def risk_color(risk: str) -> str:
    return theme()["risk"].get(risk, "#DDE3E8")


def logo_path(dark: bool = False) -> Path:
    return AGENT_ROOT / theme()["brand"]["logo_dark" if dark else "logo"]


def brand(key: str) -> str:
    return theme()["brand"][key]


_FONTS: dict | None = None


def register_fonts() -> dict:
    """Register Poppins/Inter with ReportLab (Helvetica fallback). Returns role -> font name."""
    global _FONTS
    if _FONTS:
        return _FONTS
    from reportlab.lib.fonts import addMapping
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont

    wanted = {"heading": "Poppins", "heading_semi": "Poppins-SemiBold", "heading_bold": "Poppins-Bold",
              "body": "Inter", "body_bold": "Inter-Bold"}
    fallback = {"heading": "Helvetica", "heading_semi": "Helvetica-Bold", "heading_bold": "Helvetica-Bold",
                "body": "Helvetica", "body_bold": "Helvetica-Bold"}
    files = theme()["fonts"].get("files", {})
    out = {}
    for role, name in wanted.items():
        path = AGENT_ROOT / files.get(name, f"assets/fonts/{name}.ttf")
        try:
            pdfmetrics.registerFont(TTFont(name, str(path)))
            out[role] = name
        except Exception:
            out[role] = fallback[role]
    if out["body"] == "Inter" and out["body_bold"] == "Inter-Bold":
        for bold, italic, face in ((0, 0, "Inter"), (1, 0, "Inter-Bold"), (0, 1, "Inter"), (1, 1, "Inter-Bold")):
            addMapping("Inter", bold, italic, face)
    _FONTS = out
    return out
