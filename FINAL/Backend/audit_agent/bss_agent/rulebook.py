"""Reads the 31 audit areas of config/AuditingInstructions.html (its SECTIONS master data) so the reports
can show each area's objective and, for every line item, the rulebook's parameter, AI action and risk.

Areas added by the v3 catalogue (Labour Codes) have no rulebook entry; their objectives are below.
"""

from __future__ import annotations

import html
import re
from functools import lru_cache
from pathlib import Path

AGENT_ROOT = Path(__file__).resolve().parent.parent

EXTRA_OBJECTIVES = {
    "General – All Areas": "Verify that every worker and every identity, wage and statutory field agrees across all contractor documents and with the worker's own papers.",
    "Labour Licence Renewal (Form XXI)": "Verify the licence renewal / amendment was applied for within the statutory window.",
    "Establishment Registration (OSH)": "Verify the contractor's OSH Code registration (Form III, LIN) and its intimations.",
    "Employee Register (Form I)": "Verify the Employee Register is kept in the Labour Code Form I with complete particulars.",
    "Gratuity": "Verify gratuity eligibility, computation, nomination and payment timelines for leavers.",
    "Maternity Benefit": "Verify maternity benefit eligibility, payment, leave and protection for women workers.",
    "Safety, Health & Welfare": "Verify safety, health and welfare records required under the OSH Code.",
    "Inter-State Migrant Workers": "Identify inter-State migrant workers and verify their PF / ESI coverage and journey allowance.",
    "BOCW – Construction Work": "Verify Building & Other Construction Workers obligations where the contractor does construction work.",
    "Industrial Relations": "Verify grievance redressal, standing orders, change notices, lay-off and retrenchment obligations.",
    "Statutory Returns (Labour Codes)": "Verify the half-yearly and annual returns under the Labour Codes were filed on time.",
    "Inspections & Legal Declarations": "Verify compliance reports against inspection / improvement notices.",
    "Notices & Displays": "Verify statutory notices and abstracts are displayed at the workplace.",
    "Accident & Compensation Reporting": "Verify accident reporting and compensation obligations.",
}


@lru_cache(maxsize=1)
def load() -> dict:
    path = AGENT_ROOT / "config" / "AuditingInstructions.html"
    out = {"objectives": dict(EXTRA_OBJECTIVES), "items": {}, "area_risk": {}}
    if not path.exists():
        return out
    t = path.read_text(encoding="utf-8")
    for m in re.finditer(r'\{\s*id:(\d+),\s*title:"([^"]+)",\s*risk:"([^"]+)",\s*objective:"([^"]+)",\s*items:\[(.*?)\]\s*\}', t, re.S):
        sid, title, risk, objective, items = int(m.group(1)), m.group(2), m.group(3), m.group(4), m.group(5)
        out["objectives"][html.unescape(title)] = html.unescape(objective)
        out["area_risk"][title] = risk
        for i, it in enumerate(re.finditer(r"\{([^{}]*)\}", items), start=1):
            fields = {k: html.unescape(v) for k, v in re.findall(r'(\w+):"([^"]*)"', it.group(1))}
            out["items"][f"A{sid:02d}.{i}"] = fields
    return out


def objective(criteria: str) -> str:
    return load()["objectives"].get(criteria) or f"Verify compliance of the {criteria} records against the audit catalogue."


def item(code: str) -> dict:
    return load()["items"].get(code, {})


ACTION_WORDS = [("Calculate", r"%|sum of|= .*[+−-]|calculat|rate|wages? = |ceiling"), ("Compare", r"=|identical|agrees|match|vs\b"),
                ("Collect", r"supplied|holds|on file|has an entry|appears|available"), ("Report", r"record|report")]


def ai_action(spec) -> str:
    for code in spec.ref_codes:
        it = item(code)
        if it.get("action"):
            return it["action"]
    text = f"{spec.item}".lower()
    for word, rx in ACTION_WORDS:
        if re.search(rx, text):
            return word
    return "Validate"


def verification_point(spec) -> str:
    """'Name matches Aadhaar exactly' — the expected outcome text of the first rulebook reference."""
    for code in spec.ref_codes:
        it = item(code)
        if it.get("verify"):
            return it["verify"]
    m = re.search(r"—\s*([^/]+)", spec.ref or "")
    return m.group(1).strip() if m else (spec.ref or spec.act or "")
