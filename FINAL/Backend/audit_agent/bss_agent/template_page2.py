"""BSS continuation pages: flowing tables, worker discrepancy cards and category scorecards.

Long content (198 checkpoint rows, every flagged worker finding) never gets truncated or
shrunk: tables split across as many pages as needed, repeat their header row on every page,
and the page header from template.py marks the page "(continued)". Each worker card keeps its
identity band with the first rows of its table so a card never starts at the foot of a page.
"""

from __future__ import annotations

from reportlab.lib import colors
from reportlab.platypus import CondPageBreak, KeepTogether, LongTable, Spacer, Table, TableStyle

from .template import (B, BB, HB, HS, BLUE, BLUE_SOFT, BORDER, CONTENT_W, INK, MUTED, PANEL, SAFFRON, Bar, P, S, _ps, chip, hexc,
                       risk_chip, safe, status_c, status_soft)
from . import branding

ZEBRA = colors.HexColor("#F8FAFC")


def _cell(v, style="cell"):
    if hasattr(v, "wrap"):
        return v
    return P(v, style)


def data_table(columns: list[tuple[str, float]], rows: list[list], status_col: int | None = None,
               risk_col: int | None = None, zebra=True, head_bg=None, font_size=None, bold_col: int | None = None) -> LongTable:
    """columns: (header, fraction-of-width). rows: raw values (str) or flowables.
    status_col/risk_col: index of a column holding a status / risk word -> rendered as a coloured chip."""
    widths = [CONTENT_W * f for _, f in columns]
    data = [[P(h, "cell_head") for h, _ in columns]]
    statuses = []
    for r in rows:
        row = []
        for i, v in enumerate(r):
            if i == status_col:
                row.append(chip(v))
                statuses.append(v)
            elif i == risk_col:
                row.append(risk_chip(v))
            else:
                row.append(_cell(v, "cell_b" if i == bold_col else "cell"))
        data.append(row)
    t = LongTable(data, colWidths=widths, repeatRows=1, splitByRow=1)
    st = [("BACKGROUND", (0, 0), (-1, 0), head_bg or BLUE), ("VALIGN", (0, 0), (-1, -1), "TOP"),
          ("TOPPADDING", (0, 0), (-1, -1), 3.6), ("BOTTOMPADDING", (0, 0), (-1, -1), 3.6),
          ("LEFTPADDING", (0, 0), (-1, -1), 4.5), ("RIGHTPADDING", (0, 0), (-1, -1), 4.5),
          ("LINEBELOW", (0, 1), (-1, -1), 0.4, BORDER)]
    if zebra:
        for i in range(1, len(data)):
            if i % 2 == 0:
                st.append(("BACKGROUND", (0, i), (-1, i), ZEBRA))
    if status_col is not None:
        for i, s in enumerate(statuses, start=1):
            st += [("BACKGROUND", (status_col, i), (status_col, i), status_soft(s)), ("VALIGN", (status_col, i), (status_col, i), "MIDDLE")]
    if risk_col is not None:
        st.append(("VALIGN", (risk_col, 1), (risk_col, -1), "MIDDLE"))
    t.setStyle(TableStyle(st))
    return t


def kv_table(pairs: list[tuple[str, str]], key_w=0.28) -> Table:
    data = [[P(k, "cell_b"), P(v, "cell")] for k, v in pairs]
    t = Table(data, colWidths=[CONTENT_W * key_w, CONTENT_W * (1 - key_w)])
    t.setStyle(TableStyle([("BACKGROUND", (0, 0), (0, -1), PANEL), ("LINEBELOW", (0, 0), (-1, -1), 0.4, BORDER),
                           ("VALIGN", (0, 0), (-1, -1), "TOP"), ("TOPPADDING", (0, 0), (-1, -1), 4),
                           ("BOTTOMPADDING", (0, 0), (-1, -1), 4)]))
    return t


def scorecard(title: str, stat: dict, statuses: list[str]) -> Table:
    """Category band: name, compliance score, status counts and a proportion bar."""
    sc = stat["score"]
    counts = "   ".join(f"<font color='{branding.status_color(s)}'><b>{stat['status'].get(s, 0)}</b></font> {safe(s)}"
                       for s in statuses if stat["status"].get(s))
    left = [P(title, _ps("sct", HS, 10.5, 13, BLUE)), P(counts, "small", raw=True), Spacer(1, 4),
            Bar([(stat["status"].get(s, 0), branding.status_color(s)) for s in statuses], width=CONTENT_W * 0.72, height=6)]
    right = [P(f"{sc:.0f}%" if sc is not None else "—", _ps("scv", HB, 20, 22, INK, 2)),
             P("CATEGORY SCORE", _ps("scl", BB, 6.4, 8, MUTED, 2)),
             P(f"{stat['n']} checkpoints · {stat['flags']} flags", _ps("scs", B, 6.6, 8.5, MUTED, 2))]
    t = Table([[left, right]], colWidths=[CONTENT_W * 0.76, CONTENT_W * 0.24])
    t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), PANEL), ("LINEBEFORE", (0, 0), (0, 0), 3.5, BLUE),
                           ("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("TOPPADDING", (0, 0), (-1, -1), 8),
                           ("BOTTOMPADDING", (0, 0), (-1, -1), 8), ("LEFTPADDING", (0, 0), (-1, -1), 10),
                           ("RIGHTPADDING", (0, 0), (-1, -1), 10)]))
    return t


def worker_band(w: dict) -> Table:
    risk = w["risk"]
    tag = "ON CONTRACTOR ROLLS" if w["on_rolls"] else "NOT ON CONTRACTOR ROLLS"
    gt = f"Ground-truth folder: {w['gt']}" if w["gt"] else "No ground-truth folder supplied"
    left = [P(w["worker"], _ps("wn", HS, 11, 13, colors.white)),
            P(f"{w['code']}  ·  {w['designation'] or '—'}  ·  {gt}", _ps("ws", B, 7.2, 9.5, colors.HexColor("#D6E2EC")))]
    pills = " ".join(f"<font color='{branding.risk_color(k) if k != 'Low' else '#F7D4D2'}'><b>{risk.get(k, 0)}</b></font>"
                     f"<font color='#D6E2EC'> {k}</font>&nbsp;&nbsp;" for k in ("Critical", "High", "Medium", "Low") if risk.get(k))
    right = [P(f"{w['flags']} flags  ·  risk score {w['score']}", _ps("wf", BB, 8, 10, colors.white, 2)),
             P(pills, _ps("wp", B, 7.2, 9.5, colors.white, 2), raw=True),
             P(tag, _ps("wt", BB, 6.4, 8, SAFFRON if not w["on_rolls"] else colors.HexColor("#9FC3E0"), 2))]
    t = Table([[left, right]], colWidths=[CONTENT_W * 0.62, CONTENT_W * 0.38])
    t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), BLUE), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                           ("LINEBEFORE", (0, 0), (0, 0), 4, SAFFRON), ("TOPPADDING", (0, 0), (-1, -1), 7),
                           ("BOTTOMPADDING", (0, 0), (-1, -1), 7), ("LEFTPADDING", (0, 0), (-1, -1), 10),
                           ("RIGHTPADDING", (0, 0), (-1, -1), 10)]))
    return t


FINDING_COLS = [("ID", 0.07), ("Check (item compared)", 0.19), ("Expected / ground truth", 0.165),
                ("Found in contractor documents", 0.19), ("Status", 0.12), ("Risk", 0.075), ("What is wrong", 0.19)]


def worker_card(w: dict, items: list) -> list:
    rows = [[r.spec.cid, r.spec.item, f.expected, f.found, f.status, f.risk, f.observation] for r, f in items]
    tbl = data_table(FINDING_COLS, rows, status_col=4, risk_col=5, bold_col=0)
    return [CondPageBreak(150), KeepTogether([worker_band(w), Spacer(1, 3)]), tbl, Spacer(1, 12)]


def legend_row(statuses: list[str]) -> Table:
    cells = [[chip(s) for s in statuses]]
    t = Table(cells, colWidths=[CONTENT_W / len(statuses)] * len(statuses))
    st = [("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4)]
    for i, s in enumerate(statuses):
        st.append(("BACKGROUND", (i, 0), (i, 0), status_soft(s)))
    t.setStyle(TableStyle(st + [("LINEAFTER", (0, 0), (-2, 0), 2, colors.white)]))
    return t


def matrix_table(header: list[str], rows: list[list], first_w=0.24) -> Table:
    """Coverage matrix: cells 'yes' / 'no' / 'na' rendered as coloured marks."""
    n = len(header) - 1
    widths = [CONTENT_W * first_w] + [CONTENT_W * (1 - first_w) / n] * n
    marks = {"yes": ("✓", "Complied"), "no": ("×", "Non-Complied"), "dna": ("—", "Document Not Available"),
             "na": ("n/a", "Not Applicable"), "part": ("!", "Partially Complied")}
    data = [[P(h, "cell_head") for h in header]]
    st = [("BACKGROUND", (0, 0), (-1, 0), BLUE), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
          ("LINEBELOW", (0, 1), (-1, -1), 0.4, BORDER), ("LINEAFTER", (0, 1), (-2, -1), 0.4, BORDER),
          ("TOPPADDING", (0, 0), (-1, -1), 3.5), ("BOTTOMPADDING", (0, 0), (-1, -1), 3.5)]
    for i, r in enumerate(rows, start=1):
        line = [P(r[0], "cell_b")]
        for j, v in enumerate(r[1:], start=1):
            sym, s = marks.get(v, (v, "Not Applicable"))
            line.append(P(f"<font color='{branding.status_color(s)}'><b>{sym}</b></font>", _ps("m", B, 9, 10, INK, 1), raw=True))
            st.append(("BACKGROUND", (j, i), (j, i), status_soft(s)))
        data.append(line)
    t = Table(data, colWidths=widths, repeatRows=1)
    t.setStyle(TableStyle(st))
    return t
