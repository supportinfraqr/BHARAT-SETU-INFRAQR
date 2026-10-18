"""BSS-branded HTML report: one self-contained file (logo and brand fonts embedded, no external calls),
rendered server-side from report_model.build(run) with templates/report.html.j2.

The page offers the branded PDF as a download (same folder, same report number), filters by
status / risk / free text, expandable per-worker evidence for every line item, and prints cleanly.
"""

from __future__ import annotations

import base64
import math
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape

from . import branding

TEMPLATES = Path(__file__).resolve().parent / "templates"
FONTS = [("Poppins", 600, "Poppins-SemiBold.ttf"), ("Poppins", 700, "Poppins-Bold.ttf"),
         ("Inter", 400, "Inter-Regular.ttf"), ("Inter", 700, "Inter-Bold.ttf")]


def _fontfaces(embed: bool) -> str:
    if not embed:
        return "@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700&family=Poppins:wght@600;700&display=swap');"
    out = []
    for fam, weight, fn in FONTS:
        p = branding.AGENT_ROOT / "assets" / "fonts" / fn
        if p.exists():
            b64 = base64.b64encode(p.read_bytes()).decode()
            out.append(f"@font-face{{font-family:'{fam}';font-weight:{weight};font-style:normal;font-display:swap;"
                       f"src:url(data:font/ttf;base64,{b64}) format('truetype');}}")
    return "\n".join(out)


def _logo() -> str:
    p = branding.logo_path()
    return "data:image/png;base64," + base64.b64encode(p.read_bytes()).decode() if p.exists() else ""


def gauge_svg(score: float) -> str:
    """Semi-circular gauge (red < 50 ≤ amber < 75 ≤ green), as in the PDF."""
    col = branding.status_color("Non-Complied" if score < 50 else "Partially Complied" if score < 75 else "Complied")
    r, cx, cy, sw = 92, 120, 112, 20
    a = math.pi * (1 - min(max(score, 0), 100) / 100)
    x, y = cx + r * math.cos(a), cy - r * math.sin(a)
    large = 0
    track = f"M {cx - r} {cy} A {r} {r} 0 0 1 {cx + r} {cy}"
    val = f"M {cx - r} {cy} A {r} {r} 0 {large} 1 {x:.1f} {y:.1f}"
    ticks = "".join(f'<text x="{cx + (r + 22) * math.cos(math.pi * (1 - t / 100)):.0f}" y="{cy - (r + 22) * math.sin(math.pi * (1 - t / 100)) + 4:.0f}" '
                    f'font-size="10" fill="#5A5A5A" text-anchor="middle">{t}</text>' for t in (0, 50, 75, 100))
    return (f'<svg viewBox="-12 -14 264 166" width="100%" style="max-width:270px" role="img" aria-label="Compliance score {score:.0f}%">'
            f'<path d="{track}" fill="none" stroke="#E6EBF0" stroke-width="{sw}" stroke-linecap="round"/>'
            f'<path d="{val}" fill="none" stroke="{col}" stroke-width="{sw}" stroke-linecap="round"/>{ticks}'
            f'<text x="{cx}" y="{cy - 8}" font-size="38" font-weight="700" text-anchor="middle" fill="#1A1A1A" font-family="Poppins,Arial">{score:.0f}%</text>'
            f'<text x="{cx}" y="{cy + 12}" font-size="10" font-weight="700" letter-spacing="1" text-anchor="middle" fill="#5A5A5A">COMPLIANCE SCORE</text></svg>')


def build_html(model: dict, out_html: Path, pdf_name: str | None = None, xlsx_name: str | None = None, embed_fonts: bool = True) -> Path:
    env = Environment(loader=FileSystemLoader(str(TEMPLATES)), autoescape=select_autoescape(["html", "j2"]), trim_blocks=True, lstrip_blocks=True)
    html = env.get_template("report.html.j2").render(
        m=model, c=branding.theme()["colors"], sc=model["status_colors"], ss=model["status_soft"], rc=model["risk_colors"],
        logo=_logo(), fontfaces=_fontfaces(embed_fonts), gauge=gauge_svg(model["kpi"]["score"]), pdf_name=pdf_name, xlsx_name=xlsx_name)
    out_html.write_text(html, encoding="utf-8")
    return out_html
