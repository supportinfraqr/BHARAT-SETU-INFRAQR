"""Rule checks for catalogue S.No 138-204 — the Labour Codes rows added in Agent1_AuditableFields_v3.

Most of these need documents a monthly contractor submission rarely carries (licence, Form III,
returns, safety records). Each rule therefore first decides APPLICABILITY from the evidence
(headcount thresholds, women on the rolls, leavers, construction work, inter-state workers …),
then computes what the evidence supports, and otherwise reports Document Not Available /
Not Verifiable with the reason. DeepSeek then audits every row with these facts (auditor.py).
"""

from __future__ import annotations

import re
from datetime import date, timedelta

from .checks import (C, DNA, NA, NC, NV, PC, Ctx, _daily, _desig_core, _extra_days, _not_supplied, check, worst_status)
from .evidence import blank, fmt_date, money, num, nz, parse_date

STATES = {"andhra pradesh": "AP", "arunachal pradesh": "AR", "assam": "AS", "bihar": "BR", "chhattisgarh": "CG", "goa": "GA",
          "gujarat": "GJ", "haryana": "HR", "himachal pradesh": "HP", "jharkhand": "JH", "karnataka": "KA", "kerala": "KL",
          "madhya pradesh": "MP", "maharashtra": "MH", "manipur": "MN", "meghalaya": "ML", "mizoram": "MZ", "nagaland": "NL",
          "odisha": "OD", "orissa": "OD", "punjab": "PB", "rajasthan": "RJ", "sikkim": "SK", "tamil nadu": "TN", "telangana": "TS",
          "tripura": "TR", "uttar pradesh": "UP", "uttarakhand": "UK", "west bengal": "WB", "delhi": "DL", "jammu": "JK",
          "ladakh": "LA", "chandigarh": "CH", "puducherry": "PY", "dadra": "DN", "daman": "DN", "lakshadweep": "LD", "andaman": "AN"}
# PIN-code first two digits -> state (postal circles), used when the address names no state
PIN_STATE = {**{str(i): "DL" for i in (11,)}, **{str(i): "HR" for i in (12, 13)}, **{str(i): "PB" for i in (14, 15, 16)},
             "17": "HP", "18": "JK", "19": "JK", **{str(i): "UP" for i in range(20, 29)}, **{str(i): "RJ" for i in range(30, 35)},
             **{str(i): "GJ" for i in range(36, 40)}, **{str(i): "MH" for i in range(40, 45)}, **{str(i): "MP" for i in range(45, 49)},
             "49": "CG", **{str(i): "TS" for i in (50,)}, **{str(i): "AP" for i in (51, 52, 53)}, **{str(i): "KA" for i in range(56, 60)},
             **{str(i): "TN" for i in range(60, 65)}, **{str(i): "KL" for i in range(67, 70)}, **{str(i): "WB" for i in range(70, 75)},
             **{str(i): "OD" for i in range(75, 78)}, "78": "AS", "79": "AS", **{str(i): "BR" for i in range(80, 86)}}


def _state_of(addr: str) -> str | None:
    a = str(addr or "").lower()
    for name, code in STATES.items():
        if name in a:
            return code
    if re.search(r"\bmh\b|maha", a):
        return "MH"
    pins = re.findall(r"(?<!\d)(\d{3})\s?(\d{3})(?!\d)", str(addr or ""))
    if pins:
        return PIN_STATE.get(pins[-1][0][:2])
    return None


def _women(x: Ctx) -> list[str]:
    return [c for c in x.codes if x.gender(c) == "Female"]


def _leavers(x: Ctx) -> list[str]:
    return [c for c in x.codes if x.left_in_month(c)]


def _doc_or_dna(x: Ctx, types: tuple, label: str, risk="Medium", applicable=True, why_na="", sub=""):
    hits = x.ev.has(*types)
    if not applicable:
        return x.F(x.site(), label, "Not applicable", "—", NA, "None", why_na, sub)
    if hits:
        return x.F(x.site(), label, "Present: " + "; ".join(h["rel"] for h in hits), "; ".join(h["rel"] for h in hits), NV, risk,
                   "Document supplied — content audited by DeepSeek.", sub)
    return _not_supplied(x, label, types[0], risk, sub)


def _construction(x: Ctx) -> bool:
    nw = str(x.ev.meta.get("nature_of_work") or "")
    return bool(x.ev.meta.get("is_construction")) or bool(re.search(r"construct|civil|building|erection|bocw", nw, re.I))


# --------------------------------------------------------------------------- licence / registration
@check(138)
def lc_headcount_licence(x, s):
    lic = x.ev.doc("LICENCE")
    mx = num(lic.get("max_workers"))
    n = len(x.wcodes)
    if mx is None:
        return [_not_supplied(x, "Labour Licence (licensed headcount)", "LICENCE", "High"),
                x.F(x.site(), "Workers on Wage Register ≤ licensed headcount", f"{n} workers on the Wage Register", x.ev.doc_name("WG"),
                    NV, "High", "Licensed maximum unknown — licence not supplied.")]
    ok = n <= mx
    return [x.F(x.site(), f"≤ {mx:g} licensed workers", f"{n} on the Wage Register", x.ev.doc_name("LICENCE"), C if ok else NC, "High",
                "Within the licensed headcount." if ok else "More workers than licensed — amend the licence (Form XXI) before increasing.")]


@check(139)
def lc_renewal_window(x, s):
    ren = x.ev.doc("LICREN")
    app, exp = parse_date(ren.get("application_date")), parse_date(ren.get("expiry_previous") or x.ev.doc("LICENCE").get("valid_to"))
    if not (app and exp):
        return [_doc_or_dna(x, ("LICREN",), "Licence renewal application (Form XXI) with dates", "High")]
    lo, hi = exp - timedelta(days=90), exp - timedelta(days=30)
    ok = lo <= app <= hi
    return [x.F(x.site(), f"Applied between {fmt_date(lo)} and {fmt_date(hi)}", f"Applied {fmt_date(app)} (expiry {fmt_date(exp)})",
                x.ev.doc_name("LICREN"), C if ok else PC, "High", "Within the renewal window." if ok else "Renewal applied outside the 90–30 day window.")]


@check(140, covers=("10 or more",))
def lc_form3(x, s):
    hc = x.headcount
    lin = x.ev.meta.get("lin")
    out = [_doc_or_dna(x, ("OSHREG",), "Contractor registration certificate (OSH Form III)", "High", hc >= 10,
                       f"Headcount {hc} is below 10 — registration not required.")]
    out.append(x.F(x.site(), "LIN (Labour Identification Number)", lin or "Not found", x.ev.doc_name("PFECR") if lin else "—",
                   C if lin else DNA, "Medium", f"LIN {lin} is quoted on the PF ECR." if lin else "No LIN on any document."))
    out.append(x.F(x.site(), "Required where 10 or more workers", f"Headcount evidenced: {hc} (site rolls {len(x.codes)}; establishment "
                   f"returns {int(nz(x.ev.meta.get('headcount_establishment')))})", "Wage Register; PF ECR", C if hc >= 10 else NA, "None",
                   "Threshold met — registration is mandatory." if hc >= 10 else "Below threshold.", "10 or more"))
    return out


@check(141)
def lc_form3_particulars(x, s):
    reg = x.ev.doc("OSHREG")
    if not reg:
        return [_not_supplied(x, "OSH Form III registration (particulars)", "OSHREG", "Medium")]
    issues = []
    if reg.get("address") and x.ev.meta.get("contractor_address"):
        from .evidence import compare_names
        if compare_names(str(reg["address"]), str(x.ev.meta["contractor_address"]))[0] == "Mismatch":
            issues.append("address differs")
    return [x.F(x.site(), "Form III particulars = contractor master", "; ".join(issues) or "Consistent", x.ev.doc_name("OSHREG"),
                PC if issues else C, "Medium", ("Differences: " + "; ".join(issues)) if issues else "Particulars agree.")]


@check(142)
def lc_form6(x, s):
    f6 = x.ev.doc("FORMVI")
    ag = x.ev.doc("AGREEMENT")
    ack, start = parse_date(f6.get("ack_date")), parse_date(f6.get("event_date") or ag.get("start"))
    if not (ack and start):
        return [_doc_or_dna(x, ("FORMVI",), "Form VI acknowledgement (commencement / completion)", "Medium"),
                x.F(x.site(), "Contract start / end date", ag.get("start") or "Agreement not supplied", x.ev.doc_name("AGREEMENT"),
                    NV, "Medium", "Contract dates needed to measure the 30-day window.")]
    gap = (ack - start).days
    return [x.F(x.site(), "≤ 30 days after contract start / end", f"{gap} days", x.ev.doc_name("FORMVI"), C if gap <= 30 else PC, "Medium",
                "Intimated in time." if gap <= 30 else f"Form VI filed {gap} days after the event.")]


@check(143, covers=("Mandatory fields", "dated on or before DOJ"))
def lc_appt_fields(x, s):
    if not x.ev.has("APPT"):
        return [_not_supplied(x, "Appointment letters (OSH Rule 6 format)", "APPT", "High"),
                x.F(x.site(), "Mandatory fields present", "No letters", "—", DNA, "High", "Cannot check fields.", "Mandatory fields"),
                x.F(x.site(), "Letter dated on or before DOJ", "No letters", "—", DNA, "High", "Cannot check dates.", "dated on or before DOJ")]
    out = []
    need = ("name", "dob", "father_name", "aadhaar", "lin", "uan", "designation", "skill", "wage")
    for c in x.codes:
        for k, r in x.ev.recs(c, "APPT"):
            miss = [f for f in need if blank(r.get(f))]
            out.append(x.F(x.who(c), "All OSH Rule 6 fields", "Missing: " + ", ".join(miss) if miss else "Complete", x.ev.loc(k, r),
                           PC if miss else C, "Medium", "Letter lacks mandatory fields." if miss else "Complete.", "Mandatory fields"))
            ld, doj = parse_date(r.get("letter_date")), x.doj(c)
            ok = ld and doj and ld <= doj
            out.append(x.F(x.who(c), f"Dated on/before DOJ {fmt_date(doj)}", fmt_date(ld), x.ev.loc(k, r), C if ok else PC if ld else NV, "Medium",
                           "Issued before joining." if ok else "Letter dated after joining." if ld else "Letter date not legible.", "dated on or before DOJ"))
            for f in ("name", "designation"):
                if r.get(f) and x.wr(c).get(f):
                    from .evidence import compare_names
                    res = compare_names(str(x.wr(c)[f]), str(r[f]))[0]
                    if res == "Mismatch":
                        out.append(x.F(x.who(c), f"{f} = Employee Register", f"{r[f]} vs {x.wr(c)[f]}", x.ev.loc(k, r), PC, "Medium",
                                       f"Appointment letter {f} differs from the Employee Register."))
    return out


@check(144)
def lc_form_i(x, s):
    if not x.ev.has("WR"):
        return [_not_supplied(x, "Employee Register", "WR", "High")]
    form = str(x.ev.doc("WR").get("form") or "")
    ok = re.search(r"form\s*[-–]?\s*(i|1)\b(?![iv])", form, re.I)
    return [x.F(x.site(), "Employee Register in Form I (OSH / CoW Rules)", form or "Form not printed", x.ev.doc_name("WR"),
                C if ok else PC, "Medium", "Maintained in Form I." if ok else
                f"Register is headed '{form or 'without a form number'}' — the Labour Codes prescribe Form I in place of CLRA Form XIII.")]


@check(145)
def lc_local_address(x, s):
    out = []
    for c in x.codes:
        la = x.first(c, "local_address")
        out.append(x.F(x.who(c), "Local address recorded", la or "Not recorded", x.ev.doc_name("WR"), C if la else PC, "Low",
                       "Recorded." if la else "No local / present address in the Employee Register or appointment letter."))
    return out


@check(146)
def lc_form7_nom(x, s):
    hits = [d for d in x.ev.cq_documents() if re.search(r"form.?vii\b.*nomin|nomination.*wages", d["rel"], re.I)]
    if hits:
        return [x.F(x.site(), "Form VII (Code on Wages) nominations", "Present", hits[0]["rel"], NV, "Medium", "Supplied — audited by DeepSeek.")]
    return [x.F(x.who(c), "Form VII nomination (Code on Wages)", "Not supplied", "—", DNA, "Medium",
                "No nomination for unpaid wages under the Code on Wages.") for c in x.codes]


@check(147)
def lc_gratuity_form3(x, s):
    if x.ev.has("GRATUITY"):
        return [x.F(x.site(), "Gratuity nomination (Form III, SS Code)", "Gratuity documents present", x.ev.doc_name("GRATUITY"), NV, "Medium",
                    "Supplied — DeepSeek checks the form used.")]
    return [x.F(x.who(c), "Gratuity nomination in Form III", "Not supplied", "—", DNA, "Medium", "No gratuity nomination on file.") for c in x.codes]


@check(148)
def lc_maternity_clause(x, s):
    women = _women(x)
    if not women:
        return [x.F(x.site(), "Maternity clause for women workers", "No woman on the rolls", x.ev.doc_name("WR"), NA, "None",
                    "No woman worker is recorded (see P-084 for gender doubts).")]
    out = []
    for c in women:
        recs = x.ev.recs(c, "APPT")
        if not recs:
            out.append(x.F(x.who(c), "Maternity clause in appointment letter", "No appointment letter", "—", DNA, "Medium",
                           "Appointment letter not supplied (see P-066)."))
        else:
            k, r = recs[0]
            ok = r.get("maternity_clause") is True
            out.append(x.F(x.who(c), "Maternity clause", "Present" if ok else "Absent", x.ev.loc(k, r), C if ok else PC, "Medium",
                           "Clause present." if ok else "Appointment letter lacks a maternity-benefit clause."))
    return out


@check(149)
def lc_ec_clause(x, s):
    out = []
    for c in x.codes:
        recs = x.ev.recs(c, "APPT")
        if not recs:
            out.append(x.F(x.who(c), "EC-rights clause in appointment letter", "No appointment letter", "—", DNA, "Medium",
                           "Appointment letter not supplied (see P-066)."))
        else:
            k, r = recs[0]
            ok = r.get("ec_rights_clause") is True
            out.append(x.F(x.who(c), "EC-rights clause", "Present" if ok else "Absent", x.ev.loc(k, r), C if ok else PC, "Medium",
                           "Clause present." if ok else "Letter does not inform the worker of employees' compensation rights."))
    return out


@check(150)
def lc_form23(x, s):
    out = []
    for c in _leavers(x):
        recs = x.ev.recs(c, "SVC")
        if not recs:
            out.append(x.F(x.who(c), "Experience certificate in Form XXIII", "Not supplied", "—", DNA, "Medium", "No certificate for this leaver."))
            continue
        k, r = recs[0]
        form = str(r.get("form") or "")
        ok = bool(re.search(r"xxiii|23", form, re.I))
        out.append(x.F(x.who(c), "Form XXIII", form or "No form number (plain service certificate)", x.ev.loc(k, r), C if ok else PC, "Medium",
                       "Issued in Form XXIII." if ok else "Certificate is not in the prescribed Form XXIII (OSH Code)."))
    return out or [x.F(x.site(), "Form XXIII for leavers", "No leaver in the month", x.ev.doc_name("WR"), NA, "None", "No worker left.")]


# --------------------------------------------------------------------------- wages (Labour Codes)
@check(151)
def lc_rate_history(x, s):
    return [x.F(x.site(), "Current rate vs rate 12 months earlier", "Only the current month's Wage Register supplied", x.ev.doc_name("WG"), NV, "Medium",
                "Wage-rate history needs the Wage Register of the same month last year; not in this submission.")]


@check(152, covers=("Part-time",))
def lc_part_time(x, s):
    pt = [c for c in x.wcodes if re.search(r"part.?time", str(x.wg(c).get("designation") or x.wr(c).get("designation") or ""), re.I)]
    if not pt:
        return [x.F(x.site(), "Part-time pay ≥ (MW ÷ 8) × hours", "No part-time worker on the rolls", x.ev.doc_name("WG"), NA, "None",
                    "Every worker is engaged full-time.", "Part-time")]
    return [x.F(x.who(c), "Part-time pay ≥ (MW ÷ 8) × hours", "Hours not recorded", x.ev.doc_name("WG"), NV, "Medium",
                "Hours worked and the minimum-wage master are needed.", "Part-time") for c in pt]


@check(153, covers=("not more than 1 month",))
def lc_wage_period(x, s):
    wg = x.ev.doc("WG")
    period = str(wg.get("wage_period") or "")
    a, b = parse_date(wg.get("wage_period_start")), parse_date(wg.get("wage_period_end"))
    if a and b:
        days = (b - a).days + 1
        ok = days <= 31
        found = f"{fmt_date(a)} – {fmt_date(b)} ({days} days)"
    else:
        ok = bool(re.search(r"month|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec", period, re.I))
        found = period or "Wage period not printed"
    st = C if ok else (NV if not period else PC)
    return [x.F(x.site(), "Wage period start & end recorded", found, x.ev.doc_name("WG"), st, "Medium",
                "Monthly wage period." if ok else "Wage period not stated."),
            x.F(x.site(), "Wage period ≤ 1 month", found, x.ev.doc_name("WG"), st, "Medium",
                "Within one month." if ok else "Wage period exceeds or is not shown as one month.", "not more than 1 month")]


@check(154, covers=("2 working days", "leave encashment"))
def lc_fnf(x, s):
    out = []
    paid_dates = [parse_date(v) for v, _, _ in x.ev.cross.get("salary_paid_date", []) if parse_date(v)]
    paid = max(paid_dates) if paid_dates else None
    for c in _leavers(x):
        lwd = x.left_in_month(c)
        due = lwd
        n = 0
        while n < 2:
            due += timedelta(days=1)
            if due.weekday() != 6:
                n += 1
        ff = parse_date(x.wg(c).get("payment_date")) or paid
        if not ff:
            out.append(x.F(x.who(c), f"F&F by {fmt_date(due)}", "Payment date not evidenced", x.ev.doc_name("SC"), NV, "High", "No payment date.", "2 working days"))
            continue
        ok = ff <= due
        out.append(x.F(x.who(c), f"F&F within 2 working days of leaving ({fmt_date(lwd)}) → by {fmt_date(due)}", f"Paid {fmt_date(ff)}",
                       x.ev.doc_name("SC"), C if ok else NC, "High", "Settled in time." if ok else
                       f"Full & final paid with the monthly payroll on {fmt_date(ff)} — {(ff - due).days} day(s) late (Code on Wages §17(2)).",
                       "2 working days"))
        enc = any(re.search(r"encash|leave", str(h), re.I) for h in (x.wg(c).get("earnings") or {}))
        out.append(x.F(x.who(c), "Leave encashment in F&F", "Included" if enc else "No encashment head", x.ev.loc("WG", x.wg(c)),
                       C if enc else NV, "Medium", "Encashment paid." if enc else
                       "No leave encashment shown; leave balance not recorded (see P-165), so the amount due cannot be confirmed.", "leave encashment"))
    return out or [x.F(x.site(), "F&F for leavers", "No leaver in the month", x.ev.doc_name("WR"), NA, "None", "No worker left.", "2 working days"),
                   x.F(x.site(), "Leave encashment on exit", "No leaver", "—", NA, "None", "No worker left.", "leave encashment")]


@check(155, covers=("Dy. CLC",))
def lc_unpaid(x, s):
    unpaid = [c for c in x.wcodes if x.ev.has("SC") and not x.ev.recs(c, "SC")]
    if not unpaid:
        return [x.F(x.site(), "Unpaid wages deposited with the authority", "Every worker on the Wage Register was paid" if x.ev.has("SC")
                    else "Payment proof not supplied", x.ev.doc_name("SC"), NA if x.ev.has("SC") else NV, "Medium",
                    "No unpaid worker, so no deposit is due." if x.ev.has("SC") else "Cannot identify unpaid workers.", "Dy. CLC")]
    return [x.F(x.who(c), "Unpaid dues deposited (death 3 months / untraceable 6 months + 15 days)", "Not in payment confirmation; no deposit challan",
                x.ev.doc_name("SC"), NV, "High", "Worker not shown as paid — confirm payment or deposit with the Dy. CLC.", "Dy. CLC") for c in unpaid]


@check(156, covers=("employer share",))
def lc_er_heads(x, s):
    heads = [str(h) for h in (x.ev.doc("WG").get("deduction_heads") or [])]
    bad = [h for h in heads if re.search(r"employer|er\.?\s*(pf|esi)|e\.?r\.", h, re.I)]
    st = PC if bad else C if heads else NV
    obs = ("Employer contribution shown as a deduction head: " + ", ".join(bad)) if bad else (
        "No deduction head for the employer's PF / ESI share (employer contribution is shown separately)." if heads else "Deduction heads not available.")
    return [x.F(x.site(), "No deduction head for employer PF / ESI", ", ".join(heads) or "—", x.ev.doc_name("WG"), st, "High", obs),
            x.F(x.site(), "Employer share not recovered from wages", ", ".join(bad) or "None", x.ev.doc_name("WG"), st, "High", obs, "employer share")]


@check(157, covers=("absent days",))
def lc_absence_deduction(x, s):
    out = []
    for c in x.wcodes:
        wg = x.wg(c)
        rate, paid = nz(wg.get("rate_total")), num(wg.get("paid_days"))
        if not rate or paid is None:
            continue
        doj, ext = x.doj(c), x.exit_date(c)
        start = max(doj, x.ev.month_start) if doj else x.ev.month_start
        end = ext if ext and x.ev.month_start <= ext <= x.ev.month_end else x.ev.month_end
        window = (end - start).days + 1
        absent = max(0, window - int(paid))
        e = wg.get("earnings") if isinstance(wg.get("earnings"), dict) else {}
        fixed = nz(wg.get("gross")) - nz(e.get("bonus", wg.get("bonus"))) - nz(e.get("extra_days", wg.get("extra_days_wages")))
        expected_earned = rate * paid / x.ev.month_days
        deduction = rate - fixed
        allowed = rate / x.ev.month_days * (x.ev.month_days - paid)
        ok = deduction <= allowed + x.tol
        out.append(x.F(x.who(c), f"Absence deduction ≤ {money(round(allowed, 2))} ({x.ev.month_days - int(paid)} unpaid day(s) × {money(round(rate / x.ev.month_days, 2))})",
                       f"Rate {money(rate)} − fixed earnings {money(round(fixed, 2))} = {money(round(deduction, 2))}", x.ev.loc("WG", wg),
                       C if ok else NC, "High", "Proportionate." if ok else
                       f"Wages cut by {money(round(deduction, 2))} for {x.ev.month_days - int(paid)} unpaid day(s) — "
                       f"{money(round(deduction - allowed, 2))} more than the proportionate {money(round(allowed, 2))}"
                       + (" (an earnings head was prorated short)." if absent == 0 else f" ({absent} absent day(s) within employment)."), "absent days"))
    return out or [x.F(x.site(), "Absence deduction proportionate", "Wage Register not available", "—", NV, "High", "Cannot compute.", "absent days")]


@check(158, covers=("One combined register", "NIL entry"))
def lc_form_iv(x, s):
    if not x.ev.has("WG"):
        return [_not_supplied(x, "Wage Register", "WG", "High")]
    form = str(x.ev.doc("WG").get("form") or "")
    ok = bool(re.search(r"form\s*[-–]?\s*iv\b|rule\s*51", form, re.I))
    separate = [x.ev.doc_name(k) for k in ("OT", "ADV", "FINE", "DED") if x.ev.has(k)]
    nil = [k for k in ("OT", "ADV", "FINE", "DED") if x.ev.has(k) and x.ev.doc(k).get("nil") is not False]
    return [x.F(x.site(), "Register in Form IV (Code on Wages Rule 51)", form or "Form not printed", x.ev.doc_name("WG"), C if ok else PC, "Medium",
                "Maintained in Form IV." if ok else f"Wage Register is '{form or 'unnumbered'}' — the Code on Wages prescribes the combined Form IV."),
            x.F(x.site(), "One combined register for wages, OT, advances, fines, damage", "Separate registers: " + (", ".join(separate) or "none"),
                x.ev.doc_name("WG"), C if ok else PC, "Medium", "Combined." if ok else "Separate CLRA-era registers used instead of the combined Form IV.",
                "One combined register"),
            x.F(x.site(), "NIL entry where no fine / deduction / OT", f"NIL statements in: {', '.join(x.ev.doc_name(k) for k in nil) or 'none'}",
                "Registers", C if nil else NV, "Low", "NIL entries recorded." if nil else "No NIL entries found.", "NIL entry")]


# --------------------------------------------------------------------------- hours, rest, overtime
@check(159, covers=("≤ 8", "Excess treated as overtime"))
def lc_hours(x, s):
    out = []
    for c in x.codes:
        io = x.w(c).get("IO", {})
        hmax, wmax = num(io.get("max_daily_hours")), num(io.get("weekly_hours_max"))
        if hmax is None and wmax is None:
            continue
        ok = (hmax or 0) <= 8 and (wmax or 0) <= 48
        out.append(x.F(x.who(c), "≤ 8 h / day and ≤ 48 h / week", f"Max {hmax or '—'} h/day; {wmax or '—'} h/week", x.ev.loc("IO", io),
                       C if ok else PC, "Medium", "Within limits." if ok else "Hours exceed the daily / weekly limit.", "≤ 8"))
        if not ok:
            ot = any(x.ev.recs(c, "OT")) or _extra_days(x, c)[0]
            out.append(x.F(x.who(c), "Excess hours paid as overtime", "OT recorded" if ot else "No OT recorded", x.ev.doc_name("OT"),
                           C if ot else NC, "High", "Excess paid as OT." if ot else "Hours beyond the limit not paid as overtime.", "Excess treated as overtime"))
    if not out:
        return [x.F(x.site(), "Daily ≤ 8 h, weekly ≤ 48 h", "In / out hours not computable from the gate register", x.ev.doc_name("IO"),
                    NV if x.ev.has("IO") else DNA, "Medium", "Hours worked are not legible / recorded per day.", "≤ 8"),
                x.F(x.site(), "Excess hours treated as overtime", "Hours not available", "—", NV, "Medium", "Cannot compute excess hours.",
                    "Excess treated as overtime")]
    return out


@check(160, covers=("consent", "15–30 min", "144"))
def lc_ot_rules(x, s):
    paid = [c for c in x.wcodes if _extra_days(x, c)[0]]
    ot_rows = [(c, r) for c in x.codes for _, r in x.ev.recs(c, "OT")]
    if not paid and not ot_rows:
        return [x.F(x.site(), t, "No overtime in the month", x.ev.doc_name("OT"), NA, "None", "No overtime worked.", kw)
                for kw, t in (("consent", "OT only with consent"), ("15–30 min", "OT rounding"), ("144", "≤ 144 OT hours / quarter"))]
    consent = [r for _, r in ot_rows if r.get("consent") is True]
    return [x.F(x.site(), "OT only with worker consent", f"{len(consent)} consent record(s); extra days paid to {len(paid)} worker(s)",
                x.ev.doc_name("OT"), C if paid and len(consent) >= len(paid) else PC, "Medium",
                "Consent recorded." if consent else "Extra-day work paid without any OT register entry or consent.", "consent"),
            x.F(x.site(), "OT minutes rounded (15–30 min = ½ h, > 30 min = 1 h)", "OT hours not recorded", x.ev.doc_name("OT"), NV, "Low",
                "OT is paid in whole days; minutes are not recorded.", "15–30 min"),
            x.F(x.site(), "≤ 144 OT hours per quarter", "One month only", x.ev.doc_name("WG"), NV, "Medium",
                "Quarterly total needs the other two months (monthly figures in P-048).", "144")]


def _runs(daily: list[str]) -> tuple[int, list[int]]:
    """(longest run of working days, list of 7-day blocks without a rest day)."""
    run = best = 0
    for d in daily:
        run = run + 1 if d == "P" else 0
        best = max(best, run)
    weeks = []
    for i in range(0, len(daily) - 6, 7):
        blk = daily[i:i + 7]
        if all(d == "P" for d in blk):
            weeks.append(i // 7 + 1)
    return best, weeks


@check(161, covers=("1 rest day", "10 consecutive"))
def lc_rest(x, s):
    out = []
    for c in x.codes:
        daily = _daily(x, c)
        if not daily:
            continue
        best, weeks = _runs(daily)
        out.append(x.F(x.who(c), "≥ 1 rest day in every week", f"Weeks without rest: {weeks or 'none'}", x.ev.loc("MR", x.w(c).get("MR")),
                       PC if weeks else C, "Medium", f"No weekly rest in week(s) {weeks}." if weeks else "Weekly rest given.", "1 rest day"))
        out.append(x.F(x.who(c), "≤ 10 consecutive working days", f"Longest run {best} days", x.ev.loc("MR", x.w(c).get("MR")),
                       PC if best > 10 else C, "Medium", f"{best} consecutive working days without rest." if best > 10 else "Within limit.",
                       "10 consecutive"))
    return out or [x.F(x.site(), "Rest days", "No daily muster marks", x.ev.doc_name("MR"), DNA, "Medium", "Daily marks not available.")]


@check(162, covers=("rest day paid at 2×",))
def lc_rest_day_work(x, s):
    out = []
    for c in x.wcodes:
        daily = _daily(x, c)
        if not daily:
            continue
        best, weeks = _runs(daily)
        amt, n, at_1x = _extra_days(x, c)
        if not weeks and not amt:
            continue
        ok = amt and not at_1x and not weeks
        out.append(x.F(x.who(c), "Rest-day work paid at 2× and a substitute rest day given",
                       f"Weeks without rest: {weeks or 'none'}; extra-day wages {money(amt)}{' at 1×' if at_1x else ''}",
                       x.ev.loc("WG", x.wg(c)), C if ok else PC, "Medium",
                       "Paid at 2× with substitute rest." if ok else "Rest-day work paid at the ordinary rate and / or no substitute rest day.",
                       "rest day paid at 2×"))
    return out or [x.F(x.site(), "Rest-day work", "No rest day worked", x.ev.doc_name("MR"), NA, "None", "No worker worked on a rest day.",
                       "rest day paid at 2×")]


@check(163, covers=("2 months", "Max 2 per week"))
def lc_comp_holidays(x, s):
    lost = []
    for c in x.codes:
        _, weeks = _runs(_daily(x, c))
        if weeks:
            lost.append(f"{x.ev.worker_name(c)} (week {', '.join(map(str, weeks))})")
    if not lost:
        return [x.F(x.site(), "Compensatory holidays for lost weekly holidays", "No weekly holiday lost", x.ev.doc_name("MR"), NA, "None",
                    "Every worker had a weekly rest.", "2 months"),
                x.F(x.site(), "Max 2 compensatory holidays per week", "Not applicable", "—", NA, "None", "No compensatory holiday due.", "Max 2 per week")]
    return [x.F(x.site(), "Compensatory holiday within the same / next 2 months", "Lost weekly holidays: " + "; ".join(lost),
                x.ev.doc_name("MR"), NV, "Medium", "Following months' muster rolls are needed to confirm compensatory holidays.", "2 months"),
            x.F(x.site(), "≤ 2 compensatory holidays per week", "Not determinable from one month", "—", NV, "Low", "Needs later muster rolls.", "Max 2 per week")]


@check(164, covers=("midnight", "24 consecutive"))
def lc_shift(x, s):
    night = [c for c in x.codes if re.search(r"night", str(x.wg(c).get("designation") or x.wr(c).get("designation") or ""), re.I)]
    st = NV if night else NA
    obs = (f"Night-shift workers ({', '.join(x.ev.worker_name(c) for c in night)}) — in / out times are needed to apply the midnight rule."
           if night else "No shift crossing midnight is evidenced.")
    return [x.F(x.site(), "Post-midnight hours counted in the previous day", "Night shift: " + (", ".join(x.ev.worker_name(c) for c in night) or "none"),
                x.ev.doc_name("IO"), st, "Low", obs, "midnight"),
            x.F(x.site(), "24 consecutive hours rest", "Daily rest pattern", x.ev.doc_name("MR"), st, "Low", obs, "24 consecutive")]


@check(165, covers=("1 day leave per 20", "Carry forward", "Encashment on exit"))
def lc_leave_credit(x, s):
    lr = x.ev.doc("LR")
    if not lr:
        return [_not_supplied(x, "Leave Register", "LR", "Medium")]
    out = []
    ent = [x.ev.worker_name(c) for c in x.codes if any(not blank(r.get("leave_entitlement")) for _, r in x.ev.recs(c, "LR"))]
    out.append(x.F(x.site(), "1 day leave per 20 days worked (after 180 days in the year)", f"Entitlement recorded for {len(ent)} of {len(x.codes)}",
                   x.ev.doc_name("LR"), PC if not ent else NV, "Medium",
                   "Leave entitlement and balance columns are blank — accrual cannot be verified." if not ent else "Check accrual against annual days.",
                   "1 day leave per 20"))
    out.append(x.F(x.site(), "Carry-forward ≤ 30 days", "Balances not recorded" if not ent else "Recorded", x.ev.doc_name("LR"), NV, "Low",
                   "No opening / closing balances to test.", "Carry forward"))
    leavers = _leavers(x)
    out.append(x.F(x.site(), "Leave encashed on exit", f"{len(leavers)} leaver(s)", x.ev.doc_name("WG"), NA if not leavers else NV, "Medium",
                   "No leaver." if not leavers else "Encashment not shown for leavers (see P-154).", "Encashment on exit"))
    return out


@check(166)
def lc_form_xx(x, s):
    if not x.ev.has("LR"):
        return [_not_supplied(x, "Leave Register", "LR", "Medium")]
    form = str(x.ev.doc("LR").get("form") or "")
    ok = bool(re.search(r"\bxx\b(?!\s*[iv])|form\s*[-–]?\s*20\b", form, re.I))
    return [x.F(x.site(), "Leave Register in Form XX (OSH Rules)", form or "Form not printed", x.ev.doc_name("LR"), C if ok else PC, "Low",
                "Prescribed form." if ok else f"Leave Register is '{form or 'unnumbered'}', not Form XX.")]


@check(167, covers=("Women working before 6 am",))
def lc_women_night(x, s):
    women = _women(x)
    if not women:
        return [x.F(x.site(), "Women before 6 am / after 7 pm: consent + transport", "No woman on the rolls", x.ev.doc_name("WR"), NA, "None",
                    "No woman worker recorded.", "Women working before 6 am")]
    out = []
    for c in women:
        io = x.w(c).get("IO", {})
        n = num(io.get("night_work_days"))
        night_desig = re.search(r"night", str(x.wg(c).get("designation") or ""), re.I)
        if n is None and not night_desig:
            out.append(x.F(x.who(c), "No night work, or consent + transport", "Night work not evidenced", x.ev.loc("IO", io), NV, "Medium",
                           "In / out times not available to confirm the hours.", "Women working before 6 am"))
        elif (n or 0) > 0 or night_desig:
            out.append(x.F(x.who(c), "Written consent + pick-up / drop record", "Not supplied", "—", DNA, "High",
                           "Woman worked night hours — consent and transport records not supplied.", "Women working before 6 am"))
        else:
            out.append(x.F(x.who(c), "No night work", "None", x.ev.loc("IO", io), C, "None", "No night hours.", "Women working before 6 am"))
    return out


@check(168, covers=("Proportionate bonus", "Lay-off"))
def lc_bonus_prop(x, s):
    out = []
    for c in x.wcodes:
        wg = x.wg(c)
        b, paid, basic, rate = num(wg.get("bonus")), num(wg.get("paid_days")), nz(wg.get("basic_earned")), nz(wg.get("rate_basic"))
        if b is None or paid is None or not rate:
            continue
        full = b / basic * rate if basic else None
        prop = full * paid / x.ev.month_days if full else None
        ok = prop is not None and abs(prop - b) <= max(2, 0.02 * b)
        out.append(x.F(x.who(c), f"Bonus ∝ paid days ({paid:g}/{x.ev.month_days})", f"{money(b)} on basic {money(basic)}",
                       x.ev.loc("WG", wg), C if ok else PC, "Low", "Bonus proportionate to days." if ok else "Bonus not proportionate to days paid.",
                       "Proportionate bonus"))
    out.append(x.F(x.site(), "Lay-off, paid leave and maternity leave counted as working days", "No lay-off / leave / maternity days in the month"
                   if not any(_daily(x, c).count("L") for c in x.codes) else "Leave days present", x.ev.doc_name("MR"), NA, "None",
                   "No such days in the month.", "Lay-off"))
    return out


@check(169, covers=("excluded allowances",))
def lc_ecr_recompute(x, s):
    out = []
    for c in x.wcodes:
        W = x.code_wage(c)
        basic = nz(x.wg(c).get("basic_earned"))
        for k, ecr in x.ev.recs(c, "PFECR"):
            ew = num(ecr.get("epf_wages"))
            if ew is None:
                continue
            ok = abs(ew - min(W, 15000)) <= x.tol or abs(ew - W) <= x.tol
            out.append(x.F(x.who(c), f"EPF wages = Code-on-Wages wage {money(round(W, 2))}" + (f" (basic {money(basic)} + add-back {money(round(W - basic, 2))})" if W - basic > 1 else ""),
                           money(ew), x.ev.loc(k, ecr), C if ok else PC, "High", "Correct." if ok else
                           f"ECR EPF wages {money(ew)} vs {money(round(W, 2))} after adding back exclusions above 50% of remuneration.",
                           "excluded allowances"))
        if not x.ev.recs(c, "PFECR") and W - basic > 1:
            out.append(x.F(x.who(c), f"PF wage incl. add-back {money(round(W, 2))}", "Not in PF ECR", x.ev.doc_name("PFECR"), NV, "High",
                           "Worker not in the ECR (see P-076).", "excluded allowances"))
    return out or [x.F(x.site(), "ECR wages recomputed", "No ECR row for this site", "—", NV, "High", "No ECR data.", "excluded allowances")]


@check(170, covers=("Eligible after 5 years", "last wages × 15"))
def lc_gratuity(x, s):
    out = []
    for c in _leavers(x):
        doj, lwd = x.doj(c), x.left_in_month(c)
        if not doj:
            out.append(x.F(x.who(c), "Gratuity eligibility", "DOJ unknown", "—", NV, "Medium", "No DOJ.", "Eligible after 5 years"))
            continue
        yrs = (lwd - doj).days / 365.25
        eligible = yrs >= 5
        out.append(x.F(x.who(c), "≥ 5 years' service for gratuity", f"{yrs:.1f} years ({fmt_date(doj)} – {fmt_date(lwd)})", x.ev.doc_name("WR"),
                       NA if not eligible else NV, "Medium", "Not eligible — service below 5 years (fixed-term status not recorded)."
                       if not eligible else "Eligible — gratuity payment record needed.", "Eligible after 5 years"))
        if eligible:
            last = nz(x.wg(c).get("rate_basic"))
            amt = round(last * 15 / 26 * round(yrs))
            out.append(x.F(x.who(c), f"Gratuity ≈ {money(last)} × 15/26 × {round(yrs)} = {money(amt)}", "No payment evidenced", "—", DNA, "High",
                           "Gratuity due but not evidenced.", "last wages × 15"))
        else:
            out.append(x.F(x.who(c), "Gratuity computation", "Not due", "—", NA, "None", "No gratuity due.", "last wages × 15"))
    return out or [x.F(x.site(), "Gratuity for leavers", "No leaver in the month", x.ev.doc_name("WR"), NA, "None", "No worker left.", "Eligible after 5 years"),
                   x.F(x.site(), "Gratuity computation", "No leaver", "—", NA, "None", "No worker left.", "last wages × 15")]


@check(171, covers=("Form V notice", "Payment within 30 days", "Interest if delayed"))
def lc_gratuity_forms(x, s):
    eligible = [c for c in _leavers(x) if x.doj(c) and (x.left_in_month(c) - x.doj(c)).days / 365.25 >= 5]
    if not eligible and not x.ev.has("GRATUITY"):
        return [x.F(x.site(), t, "No gratuity claim", "—", NA, "None", "No worker eligible for gratuity left this month.", kw)
                for kw, t in (("Form V notice", "Form V within 15 days of Form IV"), ("Payment within 30 days", "Payment within 30 days"),
                              ("Interest if delayed", "Interest if delayed"))]
    return [_doc_or_dna(x, ("GRATUITY",), t, "High", sub=kw) for kw, t in
            (("Form V notice", "Form IV claim / Form V notice"), ("Payment within 30 days", "Gratuity payment record"),
             ("Interest if delayed", "Interest on delayed gratuity"))]


# --------------------------------------------------------------------------- maternity
def _maternity_cases(x: Ctx) -> tuple[int | None, str]:
    m = x.ev.doc("MATR")
    if not m:
        return None, "Maternity return not supplied"
    n = num(m.get("cases"))
    return (int(n) if n is not None else None), f"Maternity return {m.get('period') or ''}: {m.get('cases', '—')} case(s)"


def _maternity(x: Ctx, label: str, covers: tuple, risk="High"):
    women = _women(x)
    n, note = _maternity_cases(x)
    if not women:
        return [x.F(x.site(), label, "No woman on the rolls", x.ev.doc_name("WR"), NA, "None", "No woman worker recorded.", kw) for kw in covers or ("",)]
    if n == 0:
        return [x.F(x.site(), label, note, x.ev.doc_name("MATR"), NA, "None",
                    "No maternity case reported, and no woman on the rolls is recorded on maternity leave.", kw) for kw in covers or ("",)]
    return [x.F(x.site(), label, note + f"; women on rolls: {', '.join(x.ev.worker_name(c) for c in women)}", x.ev.doc_name("MATR"), NV if n else DNA,
                risk, "Maternity records (Form X / XI, delivery dates, payments) needed." if n else "Maternity return not supplied — cases unknown.", kw)
            for kw in covers or ("",)]


@check(172, covers=("6 weeks after delivery",))
def lc_mat_attendance(x, s): return _maternity(x, "No attendance within 6 weeks after delivery", ("6 weeks after delivery",))


@check(173, covers=("ESI not covering", "26 weeks", "80 days"))
def lc_mat_benefit(x, s): return _maternity(x, "Maternity benefit = 26 / 12 weeks × average daily wage", ("ESI not covering", "26 weeks", "80 days"))


@check(174)
def lc_mat_forms(x, s): return _maternity(x, "Form XI / Form X dates vs payment", ())


@check(175, covers=("Miscarriage", "Tubectomy", "Pregnancy illness"))
def lc_mat_leave(x, s): return _maternity(x, "Leave register vs Form X", ("Miscarriage", "Tubectomy", "Pregnancy illness"), "Medium")


@check(176, covers=("No dismissal",))
def lc_mat_exit(x, s):
    women = _women(x)
    left = [c for c in women if x.left_in_month(c)]
    n, note = _maternity_cases(x)
    if not women:
        return [x.F(x.site(), "No discharge of a woman during maternity absence", "No woman on rolls", "—", NA, "None", "No woman worker.", "No dismissal")]
    return [x.F(x.site(), "No discharge of a woman during maternity absence",
                f"Women who left: {', '.join(x.ev.worker_name(c) for c in left) or 'none'}; {note}", x.ev.doc_name("WR"),
                NA if not left or n == 0 else NV, "High",
                "No woman on maternity absence left the rolls." if not left or n == 0 else "Confirm the leavers were not on maternity absence.",
                "No dismissal")]


@check(177, covers=("50+ employees", "₹500 per child"))
def lc_creche(x, s):
    hc = x.headcount
    if hc < 50:
        return [x.F(x.site(), "Crèche / allowance where 50+ employees", f"Headcount {hc}", "Wage Register; PF ECR", NA, "None",
                    f"Headcount {hc} is below 50 — crèche not required.", kw) for kw in ("50+ employees", "₹500 per child")]
    return [_doc_or_dna(x, ("SAFETY",), "Crèche MoU / allowance record", "Medium", sub="50+ employees"),
            x.F(x.site(), "Allowance ≥ ₹500 per child per month", "No allowance head in Wage Register", x.ev.doc_name("WG"), NV, "Medium",
                "Crèche allowance not evidenced.", "₹500 per child")]


# --------------------------------------------------------------------------- safety & health
def _safety(x: Ctx, word: str, label: str, risk="Medium", sub=""):
    hits = [d for d in x.ev.has("SAFETY") if re.search(word, d["rel"], re.I)] or (x.ev.has("SAFETY") if not word else [])
    if hits:
        return x.F(x.site(), label, "Present: " + "; ".join(h["rel"] for h in hits), hits[0]["rel"], NV, risk, "Supplied — audited by DeepSeek.", sub)
    return _not_supplied(x, label, "SAFETY", risk, sub)


@check(178)
def lc_risk(x, s): return [_safety(x, r"risk", "Risk assessment document & review date")]


@check(179)
def lc_training(x, s): return [_safety(x, r"train|induction", "Safety training record vs DOJ")]


@check(180, covers=("PPE free of cost",))
def lc_ppe(x, s):
    heads = " ".join(str(h) for h in (x.ev.doc("WG").get("deduction_heads") or []))
    ppe = re.search(r"ppe|uniform|shoe|medical", heads, re.I)
    return [_safety(x, r"ppe", "PPE issue register"),
            x.F(x.site(), "No PPE / medical-exam deduction in wages", "Deduction heads: " + (heads or "—"), x.ev.doc_name("WG"),
                PC if ppe else C if heads else NV, "High", "PPE / medical deduction head found." if ppe else "No such deduction.", "PPE free of cost")]


@check(181, covers=("aged 40+",))
def lc_form8(x, s):
    if not _construction(x):
        return [x.F(x.site(), "Annual health check (Form VIII) for BOCW / dock workers 40+", "Not a construction / dock contractor",
                    "Nature of work: " + str(x.ev.meta.get("nature_of_work") or "—"), NA, "None", "Applies to BOCW / dock workers only.", "aged 40+")]
    over40 = [c for c in x.codes if x.dob(c) and (x.ev.month_start - x.dob(c)).days / 365.25 >= 40]
    return [_safety(x, r"form.?viii|health", f"Form VIII health check for {len(over40)} worker(s) aged 40+", "High", "aged 40+")]


@check(182, covers=("Hazardous work",))
def lc_hazard(x, s):
    haz = bool(x.ev.meta.get("hazardous"))
    if not haz:
        return [x.F(x.site(), "Pre-employment + periodic exam for hazardous work", "No hazardous process recorded", "Nature of work", NA, "None",
                    "Work is not recorded as a hazardous process.", "Hazardous work")]
    return [_safety(x, r"medical|exam", "Medical examination records", "High", "Hazardous work")]


@check(183, covers=("maintained", "NIL entry"))
def lc_accident_reg(x, s):
    reg = x.ev.doc("ACC")
    if not reg:
        return [_not_supplied(x, "Register of Accidents & Dangerous Occurrences", "ACC", "Medium", "maintained"),
                x.F(x.site(), "NIL entry where none", "Register not supplied", "—", DNA, "Medium", "Cannot verify.", "NIL entry")]
    nil = reg.get("nil") is not False
    return [x.F(x.site(), "Register of Accidents maintained", "Present", x.ev.doc_name("ACC"), C, "None", "Maintained.", "maintained"),
            x.F(x.site(), "NIL entry where none", reg.get("entries") or ("NIL" if nil else "Entries present"), x.ev.doc_name("ACC"),
                C if nil and reg.get("entries") else NV, "Low", "NIL entry recorded." if nil else "Accidents recorded — DeepSeek checks the reports.", "NIL entry")]


@check(184, covers=("mock drill",))
def lc_mock(x, s): return [_safety(x, r"mock|drill", "Mock-drill attendance (≥ 1 per quarter)", "Medium", "mock drill")]


@check(185, covers=("250+",))
def lc_safety_officer(x, s):
    hc = x.headcount
    if not _construction(x) or hc < 250:
        return [x.F(x.site(), "Safety Officer for BOCW contractor with 250+ workers", f"Construction: {_construction(x)}; headcount {hc}",
                    "Nature of work; headcount", NA, "None", "Not a BOCW contractor with 250+ workers.", "250+")]
    return [_safety(x, r"safety.?officer", "Safety Officer appointment letter", "High", "250+")]


# --------------------------------------------------------------------------- inter-state migrant workers
@check(186, covers=("Home State", "ESI & PF"))
def lc_ismw(x, s):
    work = x.ev.meta.get("state")
    out = []
    for gname, g in x.ev.gt["workers"].items():
        addr = (g["fields"].get("address") or [[""]])[0][0]
        home = _state_of(g.get("state") or addr)
        code = x.ev.links.get(gname)
        who = x.who_gt(gname)
        if not home:
            out.append(x.F(who, f"Home state vs work state {work}", "Home state not determinable", "Aadhaar address", NV, "Low", "Address lacks a state / PIN.", "Home State"))
            continue
        mig = home != work
        out.append(x.F(who, f"Home state vs work state {work}", f"Aadhaar home state {home}", "Aadhaar address", C, "None",
                       f"Inter-State migrant worker ({home} → {work})." if mig else "Local worker.", "Home State"))
        if mig:
            covered = code and x.pf_member(code) and x.esi_member(code)
            out.append(x.F(who, "ESI & PF extended to the migrant worker", "Covered" if covered else "Not on rolls" if not code else "Not covered",
                           x.ev.doc_name("WG"), C if covered else NC, "High",
                           "PF and ESI extended." if covered else "Migrant worker without PF / ESI coverage.", "ESI & PF"))
    for c in x.codes:
        if x.ev.gt_for(c):
            continue
        home = _state_of(x.wr(c).get("address"))
        if home and work and home != work:
            covered = x.pf_member(c) and x.esi_member(c)
            out.append(x.F(x.who(c), "ESI & PF extended to the migrant worker", f"Home state {home}; " + ("covered" if covered else "not covered"),
                           x.ev.doc_name("WR"), C if covered else NC, "High",
                           "PF and ESI extended." if covered else "Migrant worker without PF / ESI coverage.", "ESI & PF"))
    if not any(f.subcheck == x.sub("ESI & PF") for f in out):
        out.append(x.F(x.site(), "ESI & PF for migrant workers", "No inter-State migrant identified", "Addresses", NA, "None", "No migrant worker.", "ESI & PF"))
    return out


@check(187, covers=("to-and-fro fare",))
def lc_journey(x, s):
    work = x.ev.meta.get("state")
    out = []
    for c in x.codes:
        home = _state_of(x.wr(c).get("address")) or _state_of(x.ev.gt["workers"].get(x.ev.gt_for(c) or "", {}).get("state"))
        if not home or home == work:
            continue
        doj = x.doj(c)
        days = (x.ev.month_end - doj).days if doj else 0
        out.append(x.F(x.who(c), "Journey allowance after 180 days", f"Service {days} days; no journey-allowance record", x.ev.doc_name("WG"),
                       NV if days >= 180 else NA, "Medium", "Eligible — no journey allowance evidenced." if days >= 180 else "Not yet eligible.",
                       "to-and-fro fare"))
    return out or [x.F(x.site(), "Journey allowance for migrant workers", "No inter-State migrant on the rolls", "Addresses", NA, "None",
                       "No migrant worker on the rolls.", "to-and-fro fare")]


# --------------------------------------------------------------------------- BOCW
def _bocw(x: Ctx, label: str, covers: tuple, doc_word: str):
    if not _construction(x):
        return [x.F(x.site(), label, "Not a construction contractor", "Nature of work: " + str(x.ev.meta.get("nature_of_work") or "—"), NA, "None",
                    "BOCW provisions apply only to building and construction work.", kw) for kw in covers]
    return [_safety(x, doc_word, label, "High", kw) if kw != "Only for construction" else
            x.F(x.site(), "Construction contractor", "Yes", "Nature of work", C, "None", "BOCW applies.", kw) for kw in covers]


@check(188, covers=("Only for construction", "Form XV"))
def lc_bocw1(x, s): return _bocw(x, "Form XV within 60 days of commencement", ("Only for construction", "Form XV"), r"form.?xv")


@check(189, covers=("Only for construction", "Cess"))
def lc_bocw2(x, s): return _bocw(x, "Cess paid before commencement", ("Only for construction", "Cess"), r"cess")


@check(190, covers=("Only for construction", "Form XVII / XVIII"))
def lc_bocw3(x, s): return _bocw(x, "Form XVII / XVIII within 60 days", ("Only for construction", "Form XVII / XVIII"), r"form.?xvi")


@check(191, covers=("Only for construction", "18–60"))
def lc_bocw4(x, s): return _bocw(x, "BOCW registration of workers", ("Only for construction", "18–60"), r"bocw|registration")


# --------------------------------------------------------------------------- industrial relations
@check(192, covers=("20+ workers", "30 days"))
def lc_grc(x, s):
    hc = x.headcount
    if hc < 20:
        return [x.F(x.site(), "GRC where 20+ workers", f"Headcount {hc}", "—", NA, "None", "Below 20 workers.", kw) for kw in ("20+ workers", "30 days")]
    return [_doc_or_dna(x, ("IR",), f"Grievance Redressal Committee (headcount {hc})", "Medium", sub="20+ workers"),
            x.F(x.site(), "Grievances closed within 30 days", "Grievance register not supplied", "—", DNA if not x.ev.has("IR") else NV, "Medium",
                "Cannot verify closure times.", "30 days")]


@check(193, covers=("300+",))
def lc_standing_orders(x, s):
    hc = x.headcount
    return [x.F(x.site(), "Standing orders where 300+ workers", f"Headcount {hc}", "—", NA, "None", "Below 300 workers.", "300+")] if hc < 300 \
        else [_doc_or_dna(x, ("IR",), "Standing Orders / adoption intimation", "High", sub="300+")]


@check(194, covers=("21 days",))
def lc_change_notice(x, s):
    return [x.F(x.site(), "Form IV notice ≥ 21 days before a change in service conditions", "One month supplied — no change detectable",
                x.ev.doc_name("WG"), NV, "Low", "A change of wages / hours / shifts can be detected only against earlier months' registers.", "21 days")]


@check(195, covers=("Lay-off compensation", "50+ workers"))
def lc_layoff(x, s):
    lay = any("lay" in str(r.get("remarks", "")).lower() for c in x.codes for r in x.w(c).values() if isinstance(r, dict))
    return [x.F(x.site(), t, "No lay-off recorded" if not lay else "Lay-off recorded", x.ev.doc_name("MR"), NA if not lay else NV, "Medium",
                "No lay-off in the month." if not lay else "Compute lay-off compensation.", kw)
            for kw, t in (("Lay-off compensation", "Lay-off compensation 50% × (basic + DA) ÷ 26"), ("50+ workers", "Applies to 50+ workers"))]


@check(196, covers=("1 month notice", "Compensation = avg pay", "Form XIII to Govt"))
def lc_retrench(x, s):
    leavers = _leavers(x)
    retr = [c for c in leavers if re.search(r"retrench|terminat|discharg", str(x.wr(c).get("exit_reason") or x.wr(c).get("remarks") or ""), re.I)]
    if not retr:
        return [x.F(x.site(), t, "No retrenchment recorded" + (f"; {len(leavers)} leaver(s) — reason not recorded" if leavers else ""),
                    x.ev.doc_name("WR"), NA if not leavers else NV, "Low",
                    "No retrenchment in the month." if not leavers else "Exit reason not recorded — confirm the leavers resigned.", kw)
                for kw, t in (("1 month notice", "1 month notice / pay in lieu"), ("Compensation = avg pay", "Retrenchment compensation"),
                              ("Form XIII to Govt", "Form XIII intimation to Government"))]
    return [x.F(x.who(c), t, "Not evidenced", "—", DNA, "High", "Retrenchment documents not supplied.", kw) for c in retr
            for kw, t in (("1 month notice", "Notice / pay in lieu"), ("Compensation = avg pay", "Compensation"), ("Form XIII to Govt", "Form XIII"))]


@check(197, covers=("15 days' last drawn",))
def lc_reskilling(x, s):
    return [x.F(x.site(), "Re-skilling fund: 15 days' wages per retrenched worker within 10 days", "No retrenchment recorded", x.ev.doc_name("WR"),
                NA, "None", "No retrenched worker this month (see P-196).", "15 days' last drawn")]


# --------------------------------------------------------------------------- returns, inspections, POSH
def _return(x: Ctx, form: str, label: str, due: str, kw: str):
    hits = [d for d in x.ev.has("RETURN_LC") if re.search(form, d["rel"], re.I)] or [
        d for d in x.ev.has("RETURN_LC") if re.search(form, str(x.ev.doc("RETURN_LC").get("form", "")), re.I)]
    if hits:
        return [x.F(x.site(), f"{label} acknowledgement", "Present", hits[0]["rel"], NV, "Medium", "Supplied — DeepSeek checks the filing date.", kw)]
    return [x.F(x.site(), f"{label} acknowledgement ({due})", "Not supplied", "—", DNA, "Medium", f"{label} acknowledgement not produced.", kw)]


@check(198, covers=("Half-yearly",))
def lc_form18(x, s): return _return(x, r"xviii|18", "Form XVIII half-yearly return", "30 July / 30 January", "Half-yearly")


@check(199, covers=("Annual return",))
def lc_form17(x, s): return _return(x, r"xvii\b|17\b", "Form XVII annual return", "28/29 February", "Annual return")


@check(200, covers=("SS Code",))
def lc_form23_return(x, s): return _return(x, r"xxiii|23", "Form XXIII SS Code annual return", "28/29 February", "SS Code")


@check(201, covers=("30 days of improvement",))
def lc_notice(x, s):
    n = x.ev.doc("NOTICE")
    if not n:
        return [x.F(x.site(), "Compliance report within 30 days of an improvement notice", "No inspection / improvement notice in the submission",
                    "—", NA, "None", "No notice received is evidenced.", "30 days of improvement")]
    a, b = parse_date(n.get("notice_date")), parse_date(n.get("report_date"))
    ok = a and b and (b - a).days <= 30
    return [x.F(x.site(), "Report ≤ 30 days after notice", f"Notice {fmt_date(a)}; report {fmt_date(b)}", x.ev.doc_name("NOTICE"),
                C if ok else PC if b else NC, "High", "In time." if ok else "Late / no compliance report.", "30 days of improvement")]


@check(202, covers=("10+ employees", "Presiding officer", "50% women", "external member"))
def lc_ic(x, s):
    hc = x.headcount
    if hc < 10:
        return [x.F(x.site(), "Internal Committee", f"Headcount {hc}", "—", NA, "None", "Below 10 employees.", kw)
                for kw in ("10+ employees", "Presiding officer", "50% women", "external member")]
    pol = x.ev.doc("POSHPOL")
    if not pol:
        return [x.F(x.site(), f"IC constitution order & member list (headcount {hc})", "Not supplied", "—", DNA, "High",
                    "IC is mandatory but its constitution order is not produced.", kw) for kw in ("10+ employees", "Presiding officer", "50% women", "external member")]
    members = pol.get("members") or []
    women = num(pol.get("women_members"))
    return [x.F(x.site(), "IC constituted (10+ employees)", "Order present", x.ev.doc_name("POSHPOL"), C, "None", "IC constituted.", "10+ employees"),
            x.F(x.site(), "Presiding officer — senior woman", str(members[:1]) if members else "Not stated", x.ev.doc_name("POSHPOL"), NV, "High",
                "DeepSeek verifies from the order.", "Presiding officer"),
            x.F(x.site(), "≥ 50% women", f"{women:g} of {len(members)}" if women is not None and members else "Not stated", x.ev.doc_name("POSHPOL"),
                (C if women >= len(members) / 2 else NC) if women is not None and members else NV, "High", "Composition checked.", "50% women"),
            x.F(x.site(), "One external member", "Yes" if pol.get("external_member") else "Not stated", x.ev.doc_name("POSHPOL"),
                C if pol.get("external_member") else NV, "High", "External member present." if pol.get("external_member") else "Not evidenced.", "external member")]


@check(203, covers=("POSH policy displayed", "Awareness session"))
def lc_posh_policy(x, s):
    p = x.ev.doc("POSH")
    w = num(p.get("workshops"))
    return [_doc_or_dna(x, ("POSHPOL",), "POSH policy displayed", "High", sub="POSH policy displayed"),
            x.F(x.site(), "Awareness session at least once a year", f"{w:g} programme(s) reported in the annual return" if w is not None else "Not reported",
                x.ev.doc_name("POSH"), C if (w or 0) >= 1 else (NV if p else DNA), "Medium",
                "Awareness programmes reported." if (w or 0) >= 1 else "No awareness session evidenced; attendance records not supplied.", "Awareness session")]


@check(204, covers=("90 days",))
def lc_posh_inquiry(x, s):
    p = x.ev.doc("POSH")
    rec = num(p.get("complaints_received"))
    if rec == 0:
        return [x.F(x.site(), "Inquiry completed within 90 days", "0 complaints received", x.ev.doc_name("POSH"), NA, "None",
                    "No complaint in the period, so no inquiry was due.", "90 days")]
    if rec is None:
        return [x.F(x.site(), "Inquiry completed within 90 days", "Complaint data not available", x.ev.doc_name("POSH"), NV if p else DNA, "High",
                    "Complaints / disposal not evidenced.", "90 days")]
    disp = num(p.get("complaints_disposed"))
    return [x.F(x.site(), "Inquiry completed within 90 days", f"{rec:g} received, {disp if disp is not None else '—'} disposed", x.ev.doc_name("POSH"),
                NV, "High", "Complaint dates needed to test the 90-day limit.", "90 days")]
