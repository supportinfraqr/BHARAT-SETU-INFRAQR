"""BSS-branded summary PDF (A4) — the same ReportLab page engine as before (template.py), laid out to the
"Audit Report Sample" design, covering the management view only:

  Cover · 01 Report Control Sheet · 02 Executive Summary · 03 Point-wise Compliance Status by Category ·
  Audit Area Scorecard (every audit area) · 04 Compliance Views (worker-wise [A4 landscape], contractor,
  site & state, summary report) · Legend · Where to find the detail

Section 05 onwards (every line item, sub-check, worker finding, documents examined, audit assurance) is in
the companion branded Excel workbook (workbook.py). Input is the view model from report_model.build(run).
"""

from __future__ import annotations

import hashlib
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_RIGHT
from reportlab.platypus import CondPageBreak, Flowable, KeepTogether, LongTable, NextPageTemplate, PageBreak, Spacer, Table, TableStyle

from . import branding
from .template import (B, BB, BLUE, BLUE_SOFT, BORDER, CONTENT_W, HB, HS, INK, LAND_CONTENT_W, MUTED, PANEL, SAFFRON, SAFFRON_SOFT,
                       GREEN, P, S, SectionMarker, _ps, build, callout, chip, hexc, risk_chip, safe, section_header, status_c,
                       status_soft, toc)

NAVY = BLUE
ZEBRA = colors.HexColor("#F8FAFC")
STATUS_SHORT = {"Complied": "C", "Partially Complied": "PC", "Non-Complied": "NC", "Document Not Available": "DNA",
                "Not Verifiable": "NV", "Not Applicable": "N/A", "Not Auditable": "NAU", "—": "—"}


def akey(no) -> str:
    return "area" + hashlib.md5(str(no).encode()).hexdigest()[:8]


def _band_color(b):
    return {"green": branding.status_color("Complied"), "amber": branding.status_color("Partially Complied"),
            "red": branding.status_color("Non-Complied")}.get(b, "#8A94A0")


# =========================================================================== flowables
class AreaBand(Flowable):
    """Navy band: number box, title, score circle and 'N LINE ITEMS · RISK: X' pill (as in the design)."""

    def __init__(self, no, title, score, n, risk, width=CONTENT_W):
        super().__init__()
        self.no, self.title, self.score, self.n, self.risk, self.width, self.height = no, title, score, n, risk, width, 26

    def draw(self):
        c = self.canv
        c.setFillColor(NAVY)
        c.roundRect(0, 0, self.width, self.height, 4, stroke=0, fill=1)
        c.setFillColor(colors.Color(1, 1, 1, alpha=0.16))
        c.roundRect(7, 6, 22, 14, 3, stroke=0, fill=1)
        c.setFillColor(colors.white)
        c.setFont(BB, 7.6)
        c.drawCentredString(18, 9.6, f"{self.no:02d}")
        c.setFont(HS, 9.6)
        title = self.title.upper()
        while c.stringWidth(title, HS, 9.6) > self.width - 230 and len(title) > 10:
            title = title[:-2]
        c.drawString(36, 9, title + ("…" if title != self.title.upper() else ""))
        pill = f"{self.n} LINE ITEMS · RISK: {self.risk.upper() if self.risk != 'None' else 'NONE'}"
        pw = c.stringWidth(pill, BB, 6.4) + 14
        c.setStrokeColor(colors.Color(1, 1, 1, alpha=0.45))
        c.setFillColor(colors.Color(1, 1, 1, alpha=0.12))
        c.roundRect(self.width - pw - 8, 6, pw, 14, 7, stroke=1, fill=1)
        c.setFillColor(colors.white)
        c.setFont(BB, 6.4)
        c.drawString(self.width - pw - 1, 10.3, pill)
        cx = self.width - pw - 26
        if self.score is None:
            return
        c.setFillColor(colors.white)
        c.circle(cx, 13, 11, stroke=0, fill=1)
        c.setFillColor(hexc(_band_color("green" if (self.score or 0) >= 80 else "amber" if (self.score or 0) >= 50 else "red"))
                       if self.score is not None else MUTED)
        c.setFont(BB, 6.6)
        c.drawCentredString(cx, 10.6, f"{self.score}%" if self.score is not None else "n/a")


class CatCard(Flowable):
    """Category card: title, checkpoints · flags, score, C/PC/NC/DNA/Other minis and a compliance bar."""

    def __init__(self, cat: dict, width: float, height=78):
        super().__init__()
        self.cat, self.width, self.height = cat, width, height

    def draw(self):
        c, k = self.canv, self.cat
        col = hexc(_band_color(k["band"]))
        c.setFillColor(colors.white)
        c.setStrokeColor(BORDER)
        c.roundRect(0, 0, self.width, self.height, 5, stroke=1, fill=1)
        c.setFillColor(col)
        c.rect(0, 0, 3.5, self.height, stroke=0, fill=1)
        c.setFillColor(NAVY)
        c.setFont(HS, 9)
        c.drawString(11, self.height - 16, k["short"])
        c.setFont(B, 6.6)
        c.setFillColor(MUTED)
        c.drawString(11, self.height - 26, f"{k['total']} checkpoints · {k['flags']} flags")
        c.setFillColor(col)
        c.setFont(HB, 15)
        c.drawRightString(self.width - 9, self.height - 20, f"{k['score']}%" if k["score"] is not None else "—")
        c.setFont(BB, 5.6)
        c.setFillColor(MUTED)
        c.drawRightString(self.width - 9, self.height - 28, "SCORE")
        x = 11
        for lab, key, st in (("C", "c", "Complied"), ("PC", "pc", "Partially Complied"), ("NC", "nc", "Non-Complied"),
                             ("DNA", "dna", "Document Not Available"), ("Other", "other", "Not Applicable")):
            t = f"{lab} {k[key]}"
            w = c.stringWidth(t, BB, 6) + 8
            c.setFillColor(status_soft(st))
            c.setStrokeColor(status_c(st))
            c.roundRect(x, self.height - 46, w, 11, 2.5, stroke=1, fill=1)
            c.setFillColor(status_c(st))
            c.setFont(BB, 6)
            c.drawString(x + 4, self.height - 42.6, t)
            x += w + 3
        c.setFont(B, 6.4)
        c.setFillColor(MUTED)
        c.drawString(11, 17, "Compliance")
        c.drawRightString(self.width - 9, 17, f"{k['score']}%" if k["score"] is not None else "—")
        c.setFillColor(hexc("#E6EBF0"))
        c.roundRect(11, 8, self.width - 20, 4.5, 2.2, stroke=0, fill=1)
        if k["score"]:
            c.setFillColor(col)
            c.roundRect(11, 8, (self.width - 20) * k["score"] / 100, 4.5, 2.2, stroke=0, fill=1)


class Gauge(Flowable):
    def __init__(self, score, size=140):
        super().__init__()
        self.score, self.width, self.height = score, size, size * 0.62

    def draw(self):
        from .template import draw_gauge
        draw_gauge(self.canv, self.width / 2, 22, self.width * 0.36, self.score, "Compliance score", thickness=11)


# =========================================================================== helpers
def _tbl(columns, rows, width=CONTENT_W, status_cols=(), risk_cols=(), head_bg=None, zebra=True, font=7.0, total_row=False,
         repeat=1, center_cols=(), short_status=False):
    widths = [width * f for _, f in columns]
    cell = _ps("c", B, font, font * 1.3, INK)
    cellc = _ps("cc", B, font, font * 1.3, INK, TA_CENTER)
    head = _ps("h", BB, font - 0.4, font * 1.25, colors.white)
    data = [[P(h, head) for h, _ in columns]]
    st = [("BACKGROUND", (0, 0), (-1, 0), head_bg or NAVY), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
          ("TOPPADDING", (0, 0), (-1, -1), 3.2), ("BOTTOMPADDING", (0, 0), (-1, -1), 3.2),
          ("LEFTPADDING", (0, 0), (-1, -1), 4), ("RIGHTPADDING", (0, 0), (-1, -1), 4), ("LINEBELOW", (0, 1), (-1, -1), 0.35, BORDER)]
    for i, r in enumerate(rows, start=1):
        line = []
        for j, v in enumerate(r):
            if j in status_cols and short_status:
                line.append(P(f"<b>{STATUS_SHORT.get(v, v)}</b>", _ps("ss", BB, font + 0.4, font * 1.3, status_c(v) if v in STATUS_SHORT and v != "—" else MUTED, TA_CENTER), raw=True))
                if v in branding.theme()["status"]:
                    st.append(("BACKGROUND", (j, i), (j, i), status_soft(v)))
            elif j in status_cols:
                line.append(chip(v, 5.6) if v not in ("—", "", None) else P("—", cellc))
                if v in branding.theme()["status"]:
                    st.append(("BACKGROUND", (j, i), (j, i), status_soft(v)))
            elif j in risk_cols:
                line.append(risk_chip(v, 5.8))
            elif hasattr(v, "wrap"):
                line.append(v)
            else:
                line.append(P(str(v if v is not None else "—"), cellc if j in center_cols else cell))
        data.append(line)
        if zebra and i % 2 == 0:
            st.append(("BACKGROUND", (0, i), (-1, i), ZEBRA))
    if total_row:
        st += [("BACKGROUND", (0, len(data) - 1), (-1, len(data) - 1), NAVY)]
        data[-1] = [P(str(v), _ps("tr", BB, font, font * 1.3, colors.white, TA_CENTER if j else 0)) for j, v in enumerate(rows[-1])]
    t = LongTable(data, colWidths=widths, repeatRows=repeat, splitByRow=1)
    t.setStyle(TableStyle(st))
    return t


def _cards(items: list[tuple[str, str, str]], cols=3, accent=None) -> Table:
    """Control-sheet style cards: (label, value, foot)."""
    w = (CONTENT_W - (cols - 1) * 6) / cols
    lab = _ps("cl", BB, 5.9, 7.5, MUTED)
    val = _ps("cv", HS, 8.6, 10.6, NAVY)
    foot = _ps("cf", B, 6.3, 8, MUTED)
    cells = [[P(l.upper(), lab), P(v, val), P(f, foot)] for l, v, f in items]
    rows, cur = [], []
    for c in cells:
        cur.append(c)
        if len(cur) == cols:
            rows.append(cur)
            cur = []
    if cur:
        rows.append(cur + [""] * (cols - len(cur)))
    data, widths = [], []
    for r in rows:
        line = []
        for i, c in enumerate(r):
            line.append(c)
            if i < cols - 1:
                line.append("")
        data.append(line)
    widths = sum(([w, 6] for _ in range(cols)), [])[:-1]
    t = Table(data, colWidths=widths)
    st = [("VALIGN", (0, 0), (-1, -1), "TOP"), ("TOPPADDING", (0, 0), (-1, -1), 6), ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
          ("LEFTPADDING", (0, 0), (-1, -1), 8)]
    for ri in range(len(data)):
        for ci in range(0, len(widths), 2):
            if data[ri][ci] != "":
                st += [("BACKGROUND", (ci, ri), (ci, ri), colors.white), ("BOX", (ci, ri), (ci, ri), 0.5, BORDER),
                       ("LINEBEFORE", (ci, ri), (ci, ri), 3, hexc(accent or branding.color("primary")))]
    st.append(("ROWBACKGROUNDS", (0, 0), (-1, -1), [None]))
    t.setStyle(TableStyle(st))
    return t


def _status_chips(counts: dict) -> Table:
    items = [("Complied", counts["Complied"]), ("Partially Complied", counts["Partially Complied"]), ("Non-Complied", counts["Non-Complied"]),
             ("Document Not Available", counts["Document Not Available"]),
             ("Not Applicable", counts["Not Verifiable"] + counts["Not Applicable"] + counts["Not Auditable"])]
    labels = {"Not Applicable": "N/A · Not Verifiable · Not Auditable"}
    cells = [P(f"<font color='{branding.status_color(s)}'>●</font> <b>{safe(labels.get(s, s))} {n}</b>",
               _ps("chp", B, 6.4, 8, status_c(s), TA_CENTER), raw=True) for s, n in items]
    t = Table([cells], colWidths=[CONTENT_W * f for f in (0.15, 0.2, 0.17, 0.22, 0.26)])
    st = [("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4)]
    for i, (s, _) in enumerate(items):
        st += [("BACKGROUND", (i, 0), (i, 0), status_soft(s)), ("LINEAFTER", (i, 0), (i, 0), 3, colors.white)]
    t.setStyle(TableStyle(st))
    return t


def _sub(text):
    return P(text, "h3")


def _sec(no, title, intro=None):
    return section_header(no, title, intro)


# =========================================================================== sections
def cover_meta(m: dict) -> dict:
    meta, k = m["meta"], m["kpi"]
    sc = k["counts"]
    return {
        "title": f"BSS Compliance Audit — {meta['contractor']} — {meta['wage_month']}", "subject": "Labour & contractor compliance audit",
        "report_no": meta["report_no"], "contractor": meta["contractor"], "contractor_short": meta["contractor"],
        "principal_employer": meta["principal_employer"], "site_short": meta["site_short"], "wage_month": meta["wage_month_short"],
        "wage_month_long": meta["wage_month"].upper(), "checkpoints": k["total"], "score": k["score"], "overall_risk": k["overall_risk"],
        "generated": meta["generated"], "classification": meta["classification"],
        "engine_pill": f"{meta.get('ai_label', 'AI').upper()} AI AUDIT" if meta["mode"] == "deepseek" else "",
        "subtitle": "Contractor submission audited against worker ground truth — every field, every worker",
        "cover_rows": [("Contractor", meta["contractor"]), ("Principal employer", meta["principal_employer"]),
                       ("Site / location", meta["site"]), ("Wage month audited", meta["wage_month"]),
                       ("Audit scope", f"{k['total']} checkpoints ({k['possible']} evidence + {k['not_possible']} scope-gap) · {k['subchecks']} sub-checks"),
                       ("Workers in scope", f"{k['on_rolls']} on contractor rolls · {k['gt_workers']} in worker ground-truth folder"),
                       ("Documents examined", meta["documents"]), ("Prepared by / date", f"{meta['auditor']} · {meta['audit_date']}")],
        "cover_stats": [f"{sc['Complied']} complied · {sc['Partially Complied']} partial · {sc['Non-Complied']} non-complied",
                        f"{sc['Document Not Available']} doc not available · {k['other']} n/a or not verifiable",
                        f"{k['flags']} discrepancy flags · {k['gt_missing']} workers off the rolls"],
    }


def sec_control(m) -> list:
    meta, k = m["meta"], m["kpi"]
    out = [NextPageTemplate("body"), PageBreak()] + _sec("01", "Report Control Sheet")
    out.append(_cards([
        ("Principal employer", meta["principal_employer"], meta["site_short"]),
        ("Contractor", meta["contractor"], meta["contractor_address"][:70] or meta["nature_of_work"]),
        ("Site / location", meta["site"], meta["state"]),
        ("Audit period", meta["period"], f"Wage month {meta['wage_month']}"),
        ("Audit date", meta["audit_date"], meta["engine"]),
        ("Registrations", meta["registrations"], "As read from the submission"),
        ("Workers in scope", f"{k['on_rolls']} on rolls · {k['gt_missing']} off rolls", f"{k['gt_workers']} in worker ground-truth folder"),
        ("Audit scope", f"{k['total']} checkpoints · {k['subchecks']} sub-checks", f"Catalogue {meta['catalogue']}"),
        ("Report number", meta["report_no"], meta["classification"]),
    ]))
    out += [Spacer(1, 14), P("Contents", "h2"), toc()]
    return out


def sec_executive(m) -> list:
    k, nar = m["kpi"], m["narrative"]
    sc = k["counts"]
    out = [PageBreak()] + _sec("02", "Executive Summary")
    rows = [("Overall Risk Rating", k["overall_risk"].upper(), branding.risk_color(k["overall_risk"])),
            ("Complied", sc["Complied"], branding.status_color("Complied")),
            ("Partially Complied", sc["Partially Complied"], branding.status_color("Partially Complied")),
            ("Non-Complied", sc["Non-Complied"], branding.status_color("Non-Complied")),
            ("Document Not Available", sc["Document Not Available"], branding.status_color("Document Not Available")),
            ("N/A · Not Verifiable · Not Auditable", k["other"], branding.status_color("Not Applicable")),
            ("Discrepancy Flags", k["flags"], branding.color("critical")),
            ("Workers Off the Rolls", k["gt_missing"], branding.color("critical")),
            ("Indicative Exposure (month)", f"₹{k['exposure']:,}", branding.color("critical"))]
    lst = Table([[P(a, _ps("el", BB, 7.2, 9, MUTED)), P(f"<font color='{c}'><b>{safe(v)}</b></font>", _ps("ev", BB, 8, 10, INK, TA_RIGHT), raw=True)]
                 for a, v, c in rows], colWidths=[CONTENT_W * 0.42, CONTENT_W * 0.18])
    lst.setStyle(TableStyle([("LINEBELOW", (0, 0), (-1, -1), 0.4, BORDER), ("TOPPADDING", (0, 0), (-1, -1), 2.6), ("BOTTOMPADDING", (0, 0), (-1, -1), 2.6)]))
    t = Table([[Gauge(k["score"], 150), lst]], colWidths=[CONTENT_W * 0.36, CONTENT_W * 0.64])
    t.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("LEFTPADDING", (0, 0), (-1, -1), 0)]))
    out += [t, Spacer(1, 8), _status_chips(sc), Spacer(1, 10), P("SUMMARY", _ps("sh", BB, 7.6, 10, MUTED)),
            P(nar["summary"], "body_j"), Spacer(1, 4), P("KEY MESSAGES", _ps("sh2", BB, 7.6, 10, MUTED))]
    msgs = "<br/>".join(f"•&nbsp; {safe(x)}" for x in nar["messages"])
    out.append(callout(msgs, accent=branding.color("critical"), bg=hexc(branding.color("critical_soft"))))
    out += [Spacer(1, 8), callout(safe(nar["opinion"]), title="Auditor's opinion", accent=branding.risk_color(k["overall_risk"])),
            Spacer(1, 4), P(f"Narrative: {nar['source']}. Verdicts: {m['meta']['engine']}.", "tiny")]
    return out


def sec_categories(m) -> list:
    out = [PageBreak()] + _sec("03", "Point-wise Compliance Status by Category")
    k = m["kpi"]
    out.append(callout(f"The {k['total']} checkpoints are grouped into {len(m['categories'])} audit categories. Each card shows the category's "
                       "compliance score, the count of checkpoints at each status and the number of discrepancy flags raised. Detailed line "
                       "items are in the companion workbook (sheet 05 Audit Areas).", accent=branding.color("primary"), bg=BLUE_SOFT))
    out.append(Spacer(1, 8))
    cols = 3
    w = (CONTENT_W - (cols - 1) * 8) / cols
    cards = [CatCard(c, w) for c in m["categories"]]
    rows = [cards[i:i + cols] + [""] * (cols - len(cards[i:i + cols])) for i in range(0, len(cards), cols)]
    data = [sum(([c, ""] for c in r), [])[:-1] for r in rows]
    g = Table(data, colWidths=sum(([w, 8] for _ in range(cols)), [])[:-1])
    g.setStyle(TableStyle([("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 0), ("BOTTOMPADDING", (0, 0), (-1, -1), 8)]))
    out += [g, Spacer(1, 6), P("CATEGORY SCORECARD", _ps("cs", BB, 7.6, 10, MUTED))]
    rows = [[c["name"], c["c"], c["pc"], c["nc"], c["dna"], c["other"], c["total"], c["flags"],
             P(f"<font color='{_band_color(c['band'])}'><b>{c['score'] if c['score'] is not None else '—'}%</b></font>", _ps("s", B, 7, 9, INK, TA_CENTER), raw=True)]
            for c in m["categories"]]
    t = m["category_totals"]
    rows.append(["TOTAL", t["c"], t["pc"], t["nc"], t["dna"], t["other"], t["total"], t["flags"], f"{t['score']}%"])
    out.append(_tbl([("Category", 0.27), ("C", 0.08), ("PC", 0.08), ("NC", 0.08), ("DNA", 0.08), ("Other", 0.09), ("Total", 0.1), ("Flags", 0.1), ("Score", 0.12)],
                    rows, center_cols=range(1, 9), total_row=True))
    return out


def sec_area_scorecard(m) -> list:
    out = [PageBreak(), SectionMarker(f"Audit Area Scorecard — {len(m['areas'])} Areas", 0),
           AreaBand(0, f"Audit area scorecard — {len(m['areas'])} audit areas", None, sum(a["n"] for a in m["areas"]), m["kpi"]["overall_risk"]),
           Spacer(1, 6),
           P(f"Every audit area of the catalogue with its line-item results. The line-by-line detail of each area is in the workbook "
             f"<b>{safe(m['meta'].get('workbook', ''))}</b>, sheet <b>05 Audit Areas</b>.", _ps("asi", B, 7.4, 10, INK), raw=True), Spacer(1, 5)]
    rows = []
    for a in m["areas"]:
        k = a["counts"]
        other = k["Not Verifiable"] + k["Not Applicable"] + k["Not Auditable"]
        sc = a["score"]
        rows.append([f"{a['no']:02d}", P(f"<b>{safe(a['name'])}</b>", _ps("an", B, 6.7, 8.4, INK), raw=True), a["n"], k["Complied"],
                     k["Partially Complied"], k["Non-Complied"], k["Document Not Available"], other, a["flags"],
                     P(f"<font color='{_band_color(a['band'])}'><b>{str(sc) + '%' if sc is not None else 'n/a'}</b></font>",
                       _ps("as", B, 6.8, 8.4, INK, TA_CENTER), raw=True), a["risk"]])
    out.append(_tbl([("#", 0.05), ("Audit area", 0.33), ("Items", 0.07), ("C", 0.06), ("PC", 0.06), ("NC", 0.06), ("DNA", 0.07),
                     ("Other", 0.07), ("Flags", 0.07), ("Score", 0.08), ("Risk", 0.08)], rows, risk_cols=(10,), font=6.7,
                    center_cols=range(2, 9)))
    return out


def sec_views(m) -> list:
    k = m["kpi"]
    params = m["worker_params"]
    out = [NextPageTemplate("land"), PageBreak(), SectionMarker("04  Compliance Views — Worker / Contractor / Site / State / Summary", 0)]
    out += [AreaBand(4, "Compliance views — worker-wise", m["avg_worker"], len(m["workers"]), k["overall_risk"], LAND_CONTENT_W), Spacer(1, 6)]
    out.append(P(f"<b>Worker-wise compliance:</b> one row per worker (on the contractor's rolls, then ground-truth workers missing from the rolls). "
                 f"Each parameter column is the worst status of that worker's findings in the related catalogue rows; '—' = not applicable to the "
                 f"worker. Average worker score <b>{m['avg_worker'] if m['avg_worker'] is not None else '—'}%</b>.", _ps("wi", B, 7.4, 10, INK), raw=True))
    out.append(Spacer(1, 4))
    head = [("Worker", 0.105), ("Code", 0.05), ("Designation", 0.07), ("DOJ", 0.045), ("Wage", 0.045), ("UAN / IP", 0.065)]
    pw = (1 - sum(f for _, f in head) - 0.04 - 0.175) / len(params)
    cols = head + [(p["label"], pw) for p in params] + [("Score", 0.04), ("Observation", 0.175)]
    rows = []
    small = _ps("sm", B, 5.9, 7.4, INK)
    for w in m["workers"]:
        name = P(f"<b>{safe(w['worker'])}</b>" + ("" if w["on_rolls"] else " <font color='#C62828' size='5.4'>OFF ROLL</font>"), small, raw=True)
        ids = "<br/>".join(safe(x) for x in (str(w["uan"] or ""), str(w["esic"] or "")) if x and x != "-") or "—"
        pct = w["pct"]
        rows.append([name, w["code"], P(safe(w["designation"]), small), P(safe(w["doj"]), small), w["wage"], P(ids, small, raw=True)]
                    + [w["params"][p["key"]] for p in params]
                    + [P(f"<font color='{_band_color('green' if (pct or 0) >= 80 else 'amber' if (pct or 0) >= 50 else 'red') if pct is not None else '#5A5A5A'}'><b>{pct if pct is not None else '—'}%</b></font>",
                         _ps("pc", B, 6.6, 8, INK, TA_CENTER), raw=True), P(w["obs"][:420], small)])
    st_cols = range(len(head), len(head) + len(params))
    out.append(_tbl(cols, rows, width=LAND_CONTENT_W, status_cols=st_cols, font=6.0, short_status=True))
    out.append(Spacer(1, 4))
    out.append(P("Status codes — " + " · ".join(f"<font color='{branding.status_color(k)}'><b>{v}</b></font> {safe(k)}"
                                               for k, v in STATUS_SHORT.items() if k != "—") + " · — not applicable to the worker",
                 _ps("sk", B, 6, 8, MUTED), raw=True))
    out.append(P("Parameter key — " + " · ".join(f"<b>{safe(p['label'])}</b>: {safe(p['desc'])}" for p in params), _ps("pk", B, 6, 8, MUTED), raw=True))

    # contractor / site / state
    out += [PageBreak(), AreaBand(4, "Contractor comparison · site & state analysis", m["kpi"]["score"], len(m["contractors"]), k["overall_risk"],
                                  LAND_CONTENT_W), Spacer(1, 6)]
    c = m["contractors"][0]
    out.append(P("<b>Contractor scorecard.</b> This audit covers one contractor; the same layout compares several contractors when the BSS "
                 "platform aggregates audits.", _ps("ci", B, 7.4, 10, INK), raw=True))
    cols2 = [("Contractor", 0.16), ("Workers", 0.05), ("Off rolls", 0.05)] + [(p["label"], 0.055) for p in params] + \
            [("Score", 0.05), ("Exposure ₹", 0.065), ("Risk", 0.045)]
    rows2 = [[P(f"<b>{safe(c['name'])}</b>", small, raw=True), c["workers"], c["off_rolls"]] + [c["params"][p["key"]] for p in params]
             + [f"{c['score']}%", f"₹{c['exposure']:,}", c["overall_risk"] if "overall_risk" in c else c["risk"]]]
    out.append(_tbl(cols2, rows2, width=LAND_CONTENT_W * (sum(f for _, f in cols2)), status_cols=range(3, 3 + len(params)), short_status=True,
                    risk_cols=(len(cols2) - 1,), font=6.2, center_cols=(1, 2, len(cols2) - 3, len(cols2) - 2)))
    out.append(Spacer(1, 10))
    for label, ents, extra in (("Site-wise scorecard", m["sites"], [("State", 0.12)]), ("State-wise scorecard", m["states"], [])):
        out.append(P(label.upper(), _ps("vs", BB, 7.4, 10, MUTED)))
        colsx = [(label.split("-")[0].strip(), 0.22)] + extra + [("Contractors", 0.08), ("Workers", 0.07), ("Complied", 0.08), ("Partial", 0.08),
                                                                ("Non-Complied", 0.09), ("DNA", 0.07), ("Score", 0.07), ("Risk", 0.07)]
        rowsx = [[P(f"<b>{safe(e['name'])}</b>", small, raw=True)] + ([e.get("state", "")] if extra else []) +
                 [e["contractors"], e["workers"], e["c"], e["pc"], e["nc"], e["dna"], f"{e['score']}%", e["risk"]] for e in ents]
        out.append(_tbl(colsx, rowsx, width=LAND_CONTENT_W * sum(f for _, f in colsx), risk_cols=(len(colsx) - 1,), font=6.6,
                        center_cols=range(1, len(colsx) - 1)))
        out.append(Spacer(1, 8))

    # summary report
    out += [NextPageTemplate("body"), PageBreak(), AreaBand(4, "Compliance views — summary report", k["score"], len(m["top_risks"]), k["overall_risk"]),
            Spacer(1, 8), P("TOP 5 RISKS REQUIRING IMMEDIATE ATTENTION", _ps("tr", BB, 7.6, 10, MUTED))]
    out.append(_tbl([("#", 0.04), ("Risk", 0.27), ("Area", 0.14), ("Level", 0.08), ("Affected workers / sites", 0.2), ("Recommended action", 0.27)],
                    [[i, P(f"<b>{safe(t['id'])}</b> {safe(t['item'])}<br/><font color='#5A5A5A'>{safe(t['summary'][:260])}</font>", _ps("t", B, 6.6, 8.4, INK), raw=True),
                      t["area"], t["risk"], t["affected"][:200], _action_for(m, t)] for i, t in enumerate(m["top_risks"], start=1)],
                    risk_cols=(3,), font=6.6, center_cols=(0,)))
    out += [Spacer(1, 10), P("MATERIAL FINANCIAL EXPOSURE (INDICATIVE, WAGE MONTH)", _ps("fe", BB, 7.6, 10, MUTED))]
    ex = [[e["head"], e["nature"], f"₹{e['amount']:,}", e["workers"], e["consequence"]] for e in m["exposure"]]
    ex.append(["TOTAL INDICATIVE EXPOSURE", "", f"₹{m['exposure_total']:,}", "", "Excludes interest u/s 7Q, damages u/s 14B and penalties"])
    out.append(_tbl([("Exposure head", 0.25), ("Nature", 0.15), ("Indicative ₹", 0.1), ("Workers", 0.22), ("Consequence if unresolved", 0.28)], ex,
                    font=6.6, total_row=True))
    out += [Spacer(1, 10), P("RECOMMENDED ACTIONS FOR MANAGEMENT", _ps("ra", BB, 7.6, 10, MUTED))]
    out.append(_tbl([("#", 0.04), ("Action", 0.24), ("Owner", 0.18), ("Target", 0.09), ("What to do", 0.45)],
                    [[i, P(f"<b>{safe(a.get('title'))}</b>", _ps("a", B, 6.8, 8.6, INK), raw=True), a.get("owner", ""),
                      f"{a.get('days', '')} days" if a.get("days") else "", a.get("body", "")] for i, a in enumerate(m["actions"], start=1)],
                    font=6.8, center_cols=(0, 3)))
    return out


def _action_for(m, t) -> str:
    return f"Correct and evidence within {t['action_days']} days ({t['risk']} risk). Detail: workbook sheet '05 Audit Areas', {t['id']}."


def sec_legend(m) -> list:
    out = [PageBreak()] + _sec("06", "Legend — Status & Risk Codes")
    out.append(_tbl([("Compliance status", 0.3), ("Meaning", 0.7)], [[s["status"], s["def"]] for s in m["status_legend"]], status_cols=(0,), font=7.4))
    out.append(Spacer(1, 10))
    out.append(_tbl([("Risk level", 0.3), ("Typical cases", 0.7)], [[r["risk"], r["def"]] for r in m["risk_legend"]], risk_cols=(0,), font=7.4))
    out.append(Spacer(1, 8))
    out.append(P("Compliance score = (Complied + ½ × Partially Complied) ÷ (Complied + Partially Complied + Non-Complied + Document Not Available). "
                 "Not Verifiable, Not Applicable and Not Auditable rows are excluded from the score. Overall risk = the highest risk among "
                 "failing checkpoints.", "small"))
    return out


def sec_detail_pointer(m) -> list:
    k = m["kpi"]
    wb = m["meta"].get("workbook") or "the findings workbook"
    sheets = [("05 Audit Areas", f"all {k['total']} line items under their {len(m['areas'])} audit areas — step, parameter, verification point, "
                                 "AI action, risk, status, observation, and every Remarks sub-check"),
              ("Area Scorecard", "every audit area with counts, score and risk; links to the area"),
              ("Worker Register", "every flagged finding for every worker (Annexure A)"),
              ("Evidence", f"all {sum(a['n'] for a in m['areas'])} rows' findings — expected (ground truth) vs found (contractor) with document › page / row"),
              ("Sub-checks", f"verdict for each of the {k['subchecks']} Remarks sub-checks"),
              ("All Checkpoints", "flat, filterable list of every checkpoint"),
              ("Worker Matrix · Exposure", "worker-wise parameter matrix and the financial-exposure workings"),
              ("Documents", "every file examined, its document type and how it was read (Annexure B)"),
              ("Assurance", "coverage, AI vs rule check, processing notes (Annexure C)")]
    out = [PageBreak()] + _sec("→", "Detailed Audit — Companion Workbook",
                               "This PDF is the management summary. The complete item-level audit is delivered as a branded Excel workbook "
                               "with the same report number.")
    out.append(callout(f"<b>Workbook:</b> {safe(wb)}<br/>All figures in this PDF are drawn from the same audit run as the workbook and the "
                       "interactive HTML report.", accent=branding.color("accent"), bg=hexc(branding.color("accent_soft"))))
    out.append(Spacer(1, 6))
    out.append(_tbl([("Sheet", 0.25), ("What it contains", 0.75)], [[P(f"<b>{safe(a)}</b>", _ps("ws", B, 7.2, 9, INK), raw=True), b] for a, b in sheets],
                    font=7.2))
    out += [Spacer(1, 10), P(f"Audit assurance: {k['total']} of {k['total']} checkpoints and {k['subchecks']} of {k['subchecks']} Remarks "
                             f"sub-checks have a verdict · verdict engine: {safe(m['meta']['engine'])} · rows where {safe(m['meta'].get('ai_label', 'AI'))} differs from the "
                             f"rule check: {k['differs']}.", "small")]
    return out


def build_pdf(model: dict, out_pdf: Path) -> Path:
    def story():
        out = [Spacer(1, 1)]
        out += sec_control(model) + sec_executive(model) + sec_categories(model) + sec_area_scorecard(model) + sec_views(model)
        return out + sec_legend(model) + sec_detail_pointer(model)
    build(out_pdf, cover_meta(model), story)
    return out_pdf
