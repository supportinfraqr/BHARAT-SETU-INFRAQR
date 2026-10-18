"""Document taxonomy: every kind of document the agent can receive, how to recognise it and what to
extract from it.

Each DocType carries
  * patterns   — regexes over the file path and the first page of text (heuristic classifier)
  * scope      — "rows"  : a register/return with one row per worker
                 "person": one worker per document or page (Form-11, service certificate, ID card …)
                 "est"    : establishment-level document (challan, registration, licence …)
  * row_fields / attr_fields — field name -> description. These descriptions are the extraction
    contract given to DeepSeek, and the field names are what the audit rules read.
  * visual     — the page images are sent to the vision model as well as the text (signatures,
                 stamps, photos, handwriting matter for this type).

The keys (WR, WG, MR …) are the evidence keys used throughout checks.py.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field

# --------------------------------------------------------------------------- shared field vocab
WORKER_ID = {
    "emp_code": "Employee code / E.Code / token number exactly as printed (null if absent)",
    "name": "Worker's full name exactly as printed",
}
PERSON = {
    "father_name": "Father's / husband's name as printed (null if absent)",
    "spouse_name": "Spouse's name if the document names a husband/wife separately (null otherwise)",
    "dob": "Date of birth exactly as printed",
    "gender": "Male / Female / Other as printed",
}
SIGN_ATTRS = {
    "form": "Form name / number / rule printed in the header, verbatim (e.g. 'FORM XIII (Rule 75)')",
    "register_number": "Register serial / book number if printed (null if none)",
    "employer_signature": "true if an employer / authorised signatory signature is visible, false if the place is blank, null if unknown",
    "employer_stamp": "true if a company stamp / seal is visible, false if absent, null if unknown",
    "employee_signature": "Describe the employee signature / thumb-impression column: 'present for all rows', 'blank for all N rows', 'partly signed (k of N)', 'no such column'",
}
NIL_ATTRS = {
    "entries": "Verbatim nil statement if the register says there were no entries (e.g. 'NO FINE IN THE MONTH OF JAN-25'), else a one-line summary",
    "nil": "true if the register has no entries for the period, false if it has entries",
}


@dataclass(frozen=True)
class DocType:
    key: str
    title: str
    root: str                      # "cq" contractor query | "gt" worker ground truth | "any"
    scope: str                     # rows | person | est
    patterns: tuple[str, ...] = ()
    text_patterns: tuple[str, ...] = ()
    row_fields: dict = field(default_factory=dict)
    attr_fields: dict = field(default_factory=dict)
    visual: bool = False
    criteria: tuple[str, ...] = ()  # catalogue "Criteria" this document evidences
    notes: str = ""

    def spec_text(self) -> str:
        lines = [f"Document type: {self.key} — {self.title}."]
        if self.notes:
            lines.append(self.notes)
        if self.attr_fields:
            lines.append("attributes (document level):")
            lines += [f"  - {k}: {v}" for k, v in self.attr_fields.items()]
        if self.row_fields:
            lines.append("rows (one object per worker / member / entry):")
            lines += [f"  - {k}: {v}" for k, v in self.row_fields.items()]
        return "\n".join(lines)


def _dt(key, title, root, scope, patterns=(), text=(), rows=None, attrs=None, visual=False, criteria=(), notes=""):
    return DocType(key, title, root, scope, tuple(patterns), tuple(text), rows or {}, attrs or {}, visual, tuple(criteria), notes)


MONEY = "number (rupees, no symbols)"
TYPES: list[DocType] = [
    # ------------------------------------------------------------------ registers (rows)
    _dt("WR", "Workman / Employee Register (Form XIII / Form I)", "cq", "rows",
        [r"workm[ae]n ?reg", r"employee ?reg", r"form.?(xiii|i)\b.*reg", r"register of (workm|employ)"],
        [r"register of workm", r"register of employees", r"form\s*-?\s*xiii"],
        {**WORKER_ID, **PERSON, "designation": "Designation / nature of employment",
         "address": "Permanent / home address", "local_address": "Local / present address if a separate column exists (null otherwise)",
         "doj": "Date of joining / commencement", "exit": "Date of termination / leaving (null if still employed)",
         "exit_reason": "Reason for leaving if printed", "photo": "true if a photograph is affixed against this row, false if not",
         "remarks": "Remarks column"},
        {**SIGN_ATTRS, "photo_column": "true if the register has a photograph column, false if not",
         "employee_signature_column": "true if the register has an employee signature / thumb impression column, false if not",
         "establishment_name": "Contractor / establishment name in the header", "site": "Site / location / department in the header"},
        visual=True, criteria=("Workman Register (Form XIII)", "Employee Register (Form I)")),
    _dt("WG", "Wage Register / Salary Register", "cq", "rows",
        [r"wage.?reg", r"salary.?reg", r"pay ?roll", r"register of wages", r"form.?(x|iv)\b.*wage"],
        [r"wages? (payment )?register", r"register of wages", r"salary.*register"],
        {**WORKER_ID, "father_name": "Father / husband name", "designation": "Designation", "doj": "Date of joining",
         "dob": "Date of birth", "uan": "UAN number ('-' if blank)", "esic_ip": "ESI IP number ('-' if blank)",
         "rate_basic": "Rate of pay: Basic + DA per month " + MONEY,
         "rate_total": "Total rate of pay per month (sum of rate components) " + MONEY,
         "rate_components": "object head -> monthly rate for every rate-of-pay head (Basic & DA, HRA, Conveyance, CCA …)",
         "days_worked": "Days worked (number)", "paid_days": "Total paid days / pay days (number)",
         "weekly_off": "Weekly rest days paid", "holidays": "Paid holidays", "leave_days": "Paid leave days (CL+EL+SL)",
         "basic_earned": "Basic & DA actually earned this month " + MONEY,
         "earnings": "object head -> amount for EVERY earnings head actually paid (basic_da, hra, conveyance, cca, washing, extra_days, overtime, incentive, bonus, arrears, other …)",
         "extra_days_wages": "Extra days / overtime wages " + MONEY, "bonus": "Bonus paid with wages " + MONEY,
         "gross": "Gross earnings " + MONEY, "epf": "Employee PF deduction " + MONEY, "esi": "Employee ESI deduction " + MONEY,
         "pt": "Professional tax deducted " + MONEY, "lwf": "LWF deducted " + MONEY, "tds": "Income tax / TDS " + MONEY,
         "advance": "Advance recovered " + MONEY, "fine": "Fines deducted " + MONEY, "damage": "Damage / loss deduction " + MONEY,
         "other_deductions": "Other deductions " + MONEY, "total_ded": "Total deductions " + MONEY, "net": "Net payable " + MONEY,
         "employer_pf": "Employer PF contribution if printed", "employer_esi": "Employer ESI contribution if printed",
         "payment_date": "Date of payment if printed per row", "employee_signature": "true / false / null — signature present in this row"},
        {**SIGN_ATTRS, "wage_period": "Wage period as printed, e.g. 'January, 2025'",
         "wage_period_start": "First day of the wage period (dd-mm-yyyy) if derivable", "wage_period_end": "Last day of the wage period",
         "establishment_name": "Establishment name", "establishment_address": "Establishment address", "site": "Dept / site",
         "pf_code": "Company PF number", "esi_code": "Company ESI number",
         "deduction_heads": "list of every deduction column heading", "earning_heads": "list of every earnings column heading"},
        visual=True, criteria=("Wage Register",),
        notes="Many registers stack 4-5 values per cell vertically (e.g. Basic&DA / HRA / Conv / Total). Read the column "
              "header stack and assign each stacked value to the right field. Copy numbers exactly."),
    _dt("MR", "Muster Roll / Attendance Register", "cq", "rows",
        [r"muster", r"attendance.?reg(?!.*in.?&?.?out)"], [r"muster roll", r"register of attendance"],
        {**WORKER_ID, "father_name": "Father / husband name",
         "daily": "list with one mark per calendar day of the month in order (P, A, WO, NH, L, CL, H … exactly as marked; '' if blank)",
         "days_worked": "Total days worked", "paid_days": "Total paid days / total", "absent": "Total absent days",
         "weekly_offs": "Weekly offs", "holidays": "Holidays", "leave": "Leave days"},
        {**SIGN_ATTRS}, visual=True, criteria=("Muster Roll",)),
    _dt("BR", "Bonus Register (Form C)", "cq", "rows", [r"bonus"], [r"bonus", r"form\s*c\b"],
        {**WORKER_ID, "bonus": "Bonus amount for this period " + MONEY, "bonus_pct": "Bonus % if printed",
         "eligible_wages": "Wages on which bonus computed if printed", "working_days": "Working days if printed",
         "paid_date": "Date bonus paid if printed per row", "set_on_off": "Set-on / set-off figures if any",
         "employee_signature": "true / false / null"},
        {**SIGN_ATTRS, "paid_date": "Date of payment", "accounting_year": "Accounting year / period"},
        visual=True, criteria=("Bonus Register",)),
    _dt("LR", "Leave Register", "cq", "rows", [r"leave.?reg"], [r"leave (with wages )?register", r"register of leave"],
        {**WORKER_ID, "dob": "DOB", "gender": "Gender", "leave_entitlement": "Leave credited / entitlement (null if '-')",
         "leave_availed": "Leave availed this period", "leave_balance": "Balance (null if '-')",
         "days_worked_year": "Days worked in the calendar year if printed"},
        {**SIGN_ATTRS, **NIL_ATTRS}, visual=True, criteria=("Leave Register",)),
    _dt("OT", "Register of Overtime", "cq", "rows", [r"over ?time"], [r"register of over ?time", r"overtime"],
        {**WORKER_ID, "date": "Date", "ot_hours": "OT hours", "ot_wages": "OT wages " + MONEY, "consent": "true if worker consent recorded"},
        {**SIGN_ATTRS, **NIL_ATTRS}, criteria=("Register of Overtime (OT)",)),
    _dt("ADV", "Register of Deduction for Advances", "cq", "rows", [r"advance"], [r"advance"],
        {**WORKER_ID, "date": "Date of advance", "amount": "Advance amount", "instalments": "Number / amount of instalments",
         "recovered": "Recovered this period", "balance": "Balance"}, {**SIGN_ATTRS, **NIL_ATTRS},
        criteria=("Register of Deduction for Advance",)),
    _dt("FINE", "Register of Fines", "cq", "rows", [r"\bfine"], [r"register of fines"],
        {**WORKER_ID, "act_date": "Date of act / omission", "amount": "Fine amount", "realised_date": "Date realised",
         "reason": "Act / omission", "show_cause": "true if cause shown"}, {**SIGN_ATTRS, **NIL_ATTRS},
        criteria=("Register of Fines",)),
    _dt("DED", "Register of Deductions for Damage or Loss", "cq", "rows", [r"deduction.?reg", r"damage"], [r"damage or loss"],
        {**WORKER_ID, "date": "Date", "amount": "Deduction", "damage_value": "Value of damage / loss", "show_cause": "true if cause shown"},
        {**SIGN_ATTRS, **NIL_ATTRS}, criteria=("Register of Deduction for Damage / Loss",)),
    _dt("ACC", "Register of Accidents & Dangerous Occurrences (Form XIX / Form 11)", "cq", "rows", [r"accident.?reg"],
        [r"register of accident", r"dangerous occurrence"],
        {**WORKER_ID, "date": "Accident date", "nature": "Nature of injury / occurrence", "reported_on": "Date reported"},
        {**SIGN_ATTRS, **NIL_ATTRS}, criteria=("Safety, Health & Welfare", "Accident & Compensation Reporting")),
    _dt("IO", "In & Out / Gate Attendance Register", "cq", "rows", [r"in ?(&|and)? ?out", r"gate", r"biometric", r"time ?card"],
        [r"in\s*&?\s*out", r"time in", r"in time"],
        {**WORKER_ID, "days_worked": "Days present per the register (count of P / days with in-time)",
         "absent": "Days marked absent", "daily": "list of the mark per calendar day ('P','A','WO','NH','' …)",
         "times": "'recorded' / 'recorded <range>' / 'not recorded' — are in and out times written",
         "max_daily_hours": "Longest working day in hours if computable from in/out times",
         "weekly_hours_max": "Highest weekly total hours if computable",
         "night_work_days": "Days with in-time before 06:00 or out-time after 19:00 (number)",
         "signatures": "'daily' / 'partial (<which days>)' / 'none — <reason>' — worker signature against each day",
         "overwriting": "true if any entry is overwritten / corrected without initials", "note": "Short note of anything irregular"},
        {"summary_columns": "State whether the monthly present / absent / leave summary columns are filled and signed",
         "layout": "Describe if marks/times are written in the wrong rows/columns", **SIGN_ATTRS},
        visual=True, criteria=("In-Out Register / Attendance Register",),
        notes="Often a handwritten photograph. Count carefully; if a value is illegible return null and say so in note."),
    _dt("SC", "Salary payment confirmation / Bank transfer sheet", "cq", "rows",
        [r"salary.?confirm", r"bank.?(transfer|statement|sheet|advice)", r"neft", r"payment.?advice"],
        [r"salary.*(paid|credited|transfer)", r"neft", r"utr", r"transaction"],
        {**WORKER_ID, "net": "Amount paid " + MONEY, "account_number": "Beneficiary account number", "ifsc": "IFSC",
         "transaction_id": "UTR / transaction id", "status": "Payment status (Success / Failed / Pending)", "paid_date": "Payment date"},
        {"paid_date": "Salary payment / credit date", "total_amount": "Total amount " + MONEY, "bank_name": "Bank / branch",
         "has_account_numbers": "true if per-worker account numbers are shown", "has_amounts": "true if per-worker amounts are shown",
         "has_status": "true if per-worker success/failure status is shown", "has_transaction_ids": "true if UTR / transaction ids shown",
         "wage_period": "Wage month the payment relates to"},
        criteria=("Bank Transfer Sheet",)),
    _dt("DECL", "Declaration of wage payment", "cq", "est", [r"declaration"], [r"declar"],
        attrs={"paid_date": "Wage payment date declared", "wage_payment_deadline_day": "Day of month by which wages are declared payable",
               "total_amount": "Total paid " + MONEY, "wage_period": "Wage month", "statement": "One-line summary of what is declared"},
        criteria=("Bank Transfer Sheet",)),
    _dt("PAYSLIP", "Payslips / wage slips", "cq", "rows", [r"pay ?slip", r"wage ?slip", r"salary ?slip"], [r"pay ?slip", r"wage slip"],
        {**WORKER_ID, "period": "Wage period", "gross": "Gross", "deductions": "Total deductions", "net": "Net pay",
         "acknowledged": "true if employee signed / acknowledged or slip states computer-generated"},
        criteria=("Payslip",)),
    _dt("FORM14", "Employment Card (Form XIV)", "cq", "person", [r"employment.?card", r"form.?xiv"], [r"employment card"],
        {**WORKER_ID, "designation": "Designation", "wage_rate": "Wage rate", "doj": "DOJ", "acknowledged": "true if signed by employee"},
        criteria=("Employment Card (Form XIV)",)),
    _dt("APPT", "Appointment letters (contractor-issued)", "cq", "person", [r"appoint"], [r"appointment", r"we are pleased to appoint"],
        {**WORKER_ID, **PERSON, "aadhaar": "Aadhaar", "uan": "UAN / IP number", "lin": "LIN if printed", "designation": "Designation",
         "skill": "Skill category", "wage": "Wage stated", "doj": "Date of joining", "letter_date": "Date of the letter",
         "local_address": "Local address", "address": "Permanent address",
         "signed_by_employer": "true / false", "signed_by_employee": "true / false",
         "maternity_clause": "true if the letter mentions maternity benefit", "ec_rights_clause": "true if it mentions employees' compensation rights"},
        visual=True, criteria=("Personal File",)),
    _dt("SVC", "Service / experience certificate", "cq", "person", [r"service.?cert", r"experience.?cert", r"form.?(xv|xxiii)\b"],
        [r"service certificate", r"experience certificate", r"this is to certify"],
        {**WORKER_ID, **PERSON, "designation": "Designation", "doj": "Date of joining", "exit": "Date of leaving",
         "wage_rate_stated": "Monthly wage / rate stated " + MONEY, "form": "Form number printed (e.g. 'Form XV', 'Form XXIII')",
         "issue_date": "Date of issue"}, criteria=("Workman Register (Form XIII)", "Personal File")),
    # ------------------------------------------------------------------ PF
    _dt("PFECR", "PF Electronic Challan cum Return (ECR)", "cq", "rows", [r"\becr\b.*(pf|epf)|(pf|epf).*\becr\b", r"pf.?ecr"],
        [r"electronic challan cum return", r"provident fund"],
        {"uan": "UAN", "name": "Member name as in the ECR", "name_uan_repository": "Name as per UAN repository if a separate column",
         "gross": "Gross wages " + MONEY, "epf_wages": "EPF wages", "eps_wages": "EPS wages", "edli_wages": "EDLI wages",
         "epf": "EPF contribution remitted (employee share)", "eps": "EPS contribution", "epf_er": "EPF-EPS difference (employer)",
         "ncp_days": "NCP days", "refund": "Refund of advances"},
        {"wage_month": "Wage month", "return_month": "Return month", "est_code": "Establishment id", "est_name": "Establishment name",
         "lin": "LIN", "total_members": "Total members", "total_epf_wages": "Sum of EPF wages", "max_eps_wages": "Highest EPS wages in any row",
         "max_edli_wages": "Highest EDLI wages in any row", "ee_total": "Total EPF contribution remitted (employee)",
         "eps_total": "Total EPS remitted", "er_epf_total": "Total EPF-EPS remitted", "salary_disbursement_date": "Salary disbursement date",
         "trrn": "TRRN if printed", "uploaded": "Uploaded date-time"},
        criteria=("ECR (Electronic Challan cum Return)",),
        notes="Return every member row in the ECR, even if there are many; compute max_eps_wages / max_edli_wages from the rows."),
    _dt("PFCH", "PF Combined Challan", "cq", "est", [r"(pf|epf).*challan(?!.*receipt)"], [r"combined challan", r"challan.*a/c"],
        attrs={"wage_month": "Wage month", "est_code": "Establishment code", "est_name": "Establishment name", "trrn": "TRRN",
               "total_wages": "Total EPF wages", "ee_share": "A/c 1 employee share", "er_epf": "A/c 1 employer share",
               "er_eps": "A/c 10 pension", "edli": "A/c 21 EDLI", "admin": "A/c 2 + 22 admin charges", "members": "Total subscribers",
               "grand_total": "Grand total", "due_date": "Due date printed", "challan_date": "Challan generated date"},
        criteria=("EPF Challan",)),
    _dt("PFRCPT", "PF payment receipt", "cq", "est", [r"(pf|epf).*(receipt|payment)"], [r"payment confirmation", r"receipt"],
        attrs={"trrn": "TRRN", "amount": "Amount paid", "paid_date": "Payment date (dd-mm-yyyy)", "status": "Payment status", "est_code": "Est code",
               "wage_month": "Wage month"}, criteria=("EPF Challan",)),
    _dt("TRRN", "TRRN status / query page", "cq", "est", [r"\btrrn\b"], [r"trrn"],
        attrs={"trrn": "TRRN", "amount": "Amount", "paid_date": "Payment / realisation date", "status": "Status text verbatim",
               "wage_month": "Wage month"}, criteria=("EPF Challan",)),
    _dt("PFALLOT", "PF code allotment letter / registration", "cq", "est", [r"allot", r"pf.?(registration|certificate)"],
        [r"allotment of code", r"code number"],
        attrs={"code": "PF establishment code", "est_name": "Establishment name", "date": "Allotment date", "address": "Address"},
        criteria=("EPF Registration Certificate",)),
    _dt("F11", "PF Form-11 declarations", "cq", "person", [r"form.?-?11\b", r"form.?xi\b"], [r"form\s*-?\s*11", r"declaration form"],
        {"name": "Member name", **PERSON, "mobile": "Mobile", "email": "Email", "uan": "UAN / previous UAN",
         "previous_pf_member": "'yes' / 'no' / 'not answered'", "previous_eps_member": "'yes' / 'no' / 'not answered'",
         "international_worker": "'yes' / 'no' / 'not answered'", "bank_account": "Bank account number", "ifsc": "IFSC",
         "aadhaar": "Aadhaar number", "pan": "PAN", "form_date": "Date the employee signed", "place": "Place",
         "employer_section": "'completed' or 'blank' — employer's declaration part (DOJ, PF number, signature & seal)",
         "employer_doj": "DOJ written by employer", "employee_signature": "true / false",
         "issues": "list of legibility / field-placement defects (swapped date & place, overwritten digits, incomplete IFSC …)"},
        visual=True, criteria=("Personal File",),
        notes="Usually handwritten, one worker per page. Read from the image; mark unreadable values null and list them in issues."),
    _dt("F2", "PF Form-2 nomination / e-nomination", "cq", "person", [r"form.?-?0?2\b", r"nominat"], [r"form\s*-?\s*2", r"nomination"],
        {"name": "Member name (whose nomination this is)", "uan": "Member UAN", "dob": "Member DOB", "father_name": "Father",
         "spouse_name": "Spouse", "aadhaar": "Member Aadhaar", "address": "Member address",
         "nominees": "list of {name, relation, share_pct}", "nominee_share_pct": "Total share % allotted (number)",
         "nomination_history": "Nomination status text verbatim (e.g. 'No Nomination History found')",
         "family": "list of family members {name, relation, dob, aadhaar}", "employee_signature": "true / false"},
        criteria=("Personal File",)),
    # ------------------------------------------------------------------ ESIC
    _dt("ESECR", "ESIC monthly contribution return (ECR)", "cq", "rows", [r"esic?.*\becr\b", r"esic?.*(return|contribution)(?!.*receipt)"],
        [r"monthly contribution", r"insurance number"],
        {"esic_ip": "IP number", "name": "IP name", "esi_days": "Number of days", "gross": "Total monthly wages",
         "esi": "IP contribution", "reason_code": "Reason code for zero days if any"},
        {"period": "Contribution period / month", "employer_code": "Employer code", "total_wages": "Total wages", "ip_total": "Total IP contribution",
         "er_total": "Total employer contribution", "total": "Total contribution", "ips": "Number of IPs"},
        criteria=("ESIC Challan",)),
    _dt("ESCH", "ESIC challan", "cq", "est", [r"esic?.*challan"], [r"challan"],
        attrs={"period": "Contribution month", "employer_code": "Employer code", "amount": "Amount", "challan_number": "Challan no.",
               "challan_date": "Challan date", "due_date": "Due date"}, visual=True, criteria=("ESIC Challan",)),
    _dt("ESRCPT", "ESIC payment receipt", "cq", "est", [r"esic?.*(receipt|payment)"], [r"transaction"],
        attrs={"period": "Contribution period", "employer_code": "Employer code", "amount": "Amount", "date": "Payment date",
               "status": "Status verbatim", "transaction_id": "Transaction id"}, criteria=("ESIC Challan",)),
    _dt("ESCARD", "ESIC e-Pehchan cards", "cq", "rows", [r"e.?pehchan", r"esic?.?card"], [r"pehchan", r"temporary identity"],
        {"esic_ip": "IP number", "name": "Name", "dob": "DOB", "doj": "Date of appointment", "employer_code": "Employer code"},
        criteria=("Personal File",)),
    _dt("ESCODE", "ESIC registration / sub-code coverage letter", "cq", "est", [r"sub.?code", r"esic?.*(registration|coverage|c-?11)"],
        [r"sub.?code", r"coverage"],
        attrs={"employer_code": "Main employer code", "subcode": "Sub-code", "letter_date": "Letter date", "covered_from": "Covered from",
               "address": "Covered address"}, criteria=("ESIC Registration",)),
    _dt("ESACC", "ESIC accident-free / other ESIC certificate", "cq", "est", [r"accident.?free"], [r"accident"],
        attrs={"period": "Period", "statement": "What it certifies"}, criteria=("Accident & Compensation Reporting",)),
    # ------------------------------------------------------------------ PT / LWF / state
    _dt("PTCH", "Professional Tax challan", "cq", "est", [r"\bpt\b.*challan", r"professional.?tax.*challan"], [r"profession tax", r"mtr"],
        attrs={"amount": "Amount paid", "paid_date": "Payment date", "period_from": "Period from", "period_to": "Period to",
               "ptrc_number": "PTRC number", "challan_number": "GRN / challan number"}, criteria=("Professional Tax (PT)",)),
    _dt("PTRC", "PT registration certificate (PTRC)", "cq", "est", [r"ptrc"], [r"certificate of registration"],
        attrs={"number": "PTRC number", "effective": "Effective date", "name": "Name", "address": "Address"},
        criteria=("Professional Tax (PT)",)),
    _dt("PTEC", "PT enrolment certificate (PTEC)", "cq", "est", [r"ptec"], [r"certificate of enrol"],
        attrs={"number": "PTEC number", "effective": "Effective date"}, criteria=("Professional Tax (PT)",)),
    _dt("PTRET", "PT annual return", "cq", "est", [r"pt.*return", r"form.?iii.?b"], [], attrs={"period": "Period", "filed_on": "Filed on"},
        criteria=("Professional Tax (PT)",)),
    _dt("LWFREG", "LWF registration", "cq", "est", [r"lwf.*regist"], [r"welfare"],
        attrs={"code": "LWF code", "registered": "Registration date", "start": "Liability start date"}, criteria=("Labour Welfare Fund (LWF)",)),
    _dt("LWFNOT", "LWF state notification", "cq", "est", [r"lwf.*notif"], [r"notification"],
        attrs={"state": "State", "employee_rate": "Employee contribution", "employer_rate": "Employer contribution",
               "months": "Contribution months", "effective": "Effective date"}, visual=True, criteria=("Labour Welfare Fund (LWF)",)),
    _dt("LWFCH", "LWF challan / return", "cq", "est", [r"lwf.*(challan|return|payment)"], [],
        attrs={"period": "Period", "amount": "Amount", "paid_date": "Paid date"}, criteria=("Labour Welfare Fund (LWF)",)),
    _dt("MWN", "Minimum wage notification", "cq", "est", [r"minimum.?wage.*notif", r"notif.*minimum"], [r"minimum rates of wages"],
        attrs={"state": "State", "effective_from": "Effective from", "rates": "list of {category, zone, basic, vda, total}"},
        criteria=("Wage Register",)),
    _dt("MWR", "Minimum Wages Act annual return (Form III)", "cq", "est", [r"minimum.?wage"], [r"minimum wages"],
        attrs={"period": "Period", "filed_on": "Filed on", "statement": "Summary"}, criteria=("Wage Register",)),
    _dt("PWR", "Payment of Wages annual return", "cq", "est", [r"payment of wages"], [r"payment of wages"],
        attrs={"period": "Period", "filed_on": "Filed on", "statement": "Summary"}, criteria=("Statutory Returns (Labour Codes)",)),
    _dt("MATR", "Maternity Benefit annual return", "cq", "est", [r"maternity"], [r"maternity"],
        attrs={"period": "Period", "filed_on": "Filed on", "women_employed": "Women employed", "cases": "Number of maternity benefit cases",
               "benefit_paid": "Total maternity benefit paid", "statement": "Summary"}, criteria=("Maternity Benefit",)),
    _dt("HOL", "Holiday list", "cq", "est", [r"holiday"], [r"holiday"],
        attrs={"year": "Year", "list": "list of [date dd-mm-yyyy, holiday name]", "signed": "true if signed by management, false if only a typed block",
               "signatory": "Signatory name if any", "sent_to_authority": "true if marked as sent to the authority"},
        visual=True, criteria=("Holiday List",)),
    _dt("POSH", "POSH annual return / report", "cq", "est", [r"posh"], [r"sexual harassment"],
        attrs={"period": "Period", "filed_on": "Date filed", "addressed_to": "Authority addressed", "district": "District",
               "workshops": "Number of awareness programmes", "complaints_received": "Complaints received", "complaints_disposed": "Disposed",
               "ic_constituted": "true if IC constitution is stated", "employees": "Number of employees stated"},
        criteria=("POSH Compliance",)),
    _dt("POSHPOL", "POSH policy / IC constitution / IC minutes", "cq", "est", [r"posh.*polic", r"internal (complaints )?committee", r"\bicc?\b"],
        [], attrs={"kind": "policy / IC order / minutes", "date": "Date", "members": "IC members list", "women_members": "Women count",
                   "external_member": "true if an external member"}, criteria=("POSH Compliance",)),
    _dt("CHILD", "Child Labour Act abstract / policy", "cq", "est", [r"child"], [r"child labour"],
        attrs={"title": "Title", "statement": "Summary"}, criteria=("Child Labour Compliance",)),
    # ------------------------------------------------------------------ establishment documents
    _dt("AGREEMENT", "Contract / agreement with principal employer", "cq", "est", [r"agreement", r"contract.?copy", r"\bmou\b"], [r"agreement"],
        attrs={"parties": "Parties", "start": "Start date", "end": "End date", "signed": "true if signed by both", "scope": "Scope of work",
               "manpower": "Manpower clause", "compliance_clauses": "Statutory compliance clauses"}, criteria=("Agreement Copy",)),
    _dt("PO", "Purchase order / work order", "cq", "est", [r"purchase.?order", r"work.?order", r"\bp\.?o\b"], [r"purchase order", r"work order"],
        attrs={"number": "PO number", "date": "PO date", "valid_to": "Validity", "service": "Service description", "manpower": "Manpower"},
        criteria=("Purchase Order / Work Order",)),
    _dt("LICENCE", "Labour licence (CLRA / OSH)", "cq", "est", [r"licen[cs]e(?!.*renew)"], [r"licen[cs]e"],
        attrs={"number": "Licence number", "valid_from": "Valid from", "valid_to": "Valid to", "max_workers": "Maximum workers",
               "authority": "Issuing authority", "sites": "Sites covered"}, criteria=("Labour Licence",)),
    _dt("LICREN", "Labour licence renewal / amendment (Form VII / XXI)", "cq", "est", [r"renew", r"form.?(vii|xxi)\b"], [r"renewal"],
        attrs={"application_date": "Application date", "renewed_to": "Renewed up to", "expiry_previous": "Previous expiry",
               "max_workers": "Manpower"}, criteria=("Labour Licence Renewal (Form VII)", "Labour Licence Renewal (Form XXI)")),
    _dt("ECPOL", "Employees' Compensation insurance policy", "cq", "est", [r"compensation", r"\bwc\b.*polic", r"ec.?polic"], [r"compensation"],
        attrs={"policy_no": "Policy number", "valid_from": "From", "valid_to": "To", "insured_count": "Insured headcount", "sites": "Sites"},
        criteria=("Employees Compensation Policy",)),
    _dt("FORMD", "Equal remuneration register (Form D)", "cq", "est", [r"form.?d\b", r"equal.?remun"], [r"equal remuneration"],
        attrs={"statement": "Summary"}, criteria=("Equal Remuneration (Form D)",)),
    _dt("IWR", "International worker return", "cq", "est", [r"\biw\b", r"international"], [r"international worker"],
        attrs={"period": "Period", "statement": "Summary"}, criteria=("IW Return (International Worker Return)",)),
    _dt("OSHREG", "Establishment registration (OSH Form III) / LIN", "cq", "est", [r"form.?iii\b.*regist", r"osh.*regist", r"\blin\b"],
        [r"registration certificate"],
        attrs={"number": "Registration number", "lin": "LIN", "date": "Date", "headcount_band": "Headcount", "address": "Address",
               "employer": "Employer"}, criteria=("Establishment Registration (OSH)",)),
    _dt("FORMVI", "OSH Form VI acknowledgement (commencement / completion)", "cq", "est", [r"form.?vi\b"], [],
        attrs={"ack_date": "Acknowledgement date", "event": "commencement / completion", "event_date": "Date"},
        criteria=("Establishment Registration (OSH)",)),
    _dt("RETURN_LC", "Labour Code return acknowledgement (Form XVII / XVIII / XXIII)", "cq", "est",
        [r"form.?(xvii|xviii|xxiii)\b", r"half.?yearly", r"annual return"], [],
        attrs={"form": "Form", "period": "Period", "filed_on": "Filed on"}, criteria=("Statutory Returns (Labour Codes)",)),
    _dt("SAFETY", "Safety / health record (risk assessment, training, PPE, Form VIII, mock drill, safety officer)", "cq", "est",
        [r"risk.?assess", r"training", r"\bppe\b", r"form.?viii\b", r"mock.?drill", r"safety"], [],
        attrs={"kind": "What record this is", "date": "Date", "statement": "Summary"}, criteria=("Safety, Health & Welfare",)),
    _dt("GRATUITY", "Gratuity nomination / claim (Form F, Form III, IV, V)", "cq", "person", [r"gratuity", r"form.?f\b"], [r"gratuity"],
        {"name": "Name", "form": "Form", "date": "Date", "amount": "Amount"}, criteria=("Gratuity", "Personal File")),
    _dt("IR", "Industrial relations record (GRC, grievance register, standing orders, notices)", "cq", "est",
        [r"grievance", r"standing.?order", r"\bgrc\b"], [], attrs={"kind": "What it is", "date": "Date", "statement": "Summary"},
        criteria=("Industrial Relations",)),
    _dt("BOCW", "BOCW record (Form XV, cess, registration)", "cq", "est", [r"bocw", r"cess", r"building.*construction"], [],
        attrs={"kind": "What it is", "date": "Date", "amount": "Amount"}, criteria=("BOCW – Construction Work",)),
    _dt("NOTICE", "Inspection / improvement notice or compliance report", "cq", "est", [r"inspection", r"improvement.?notice", r"show.?cause"],
        [], attrs={"notice_date": "Notice date", "report_date": "Compliance report date"}, criteria=("Inspections & Legal Declarations",)),
    _dt("OTHER", "Other / unclassified contractor document", "cq", "est", [], [], attrs={"title": "Document title", "statement": "Summary"}),
    # ------------------------------------------------------------------ worker ground truth
    _dt("GT_AADHAAR", "Aadhaar card", "gt", "person", [r"aadh?a?r"], [r"aadhaar", r"unique identification", r"\d{4}\s\d{4}\s\d{4}"],
        {"name": "Name", "father_name": "Father / husband name (from S/O, D/O, W/O, C/O)", "dob": "DOB",
         "gender": "Gender", "aadhaar": "12-digit Aadhaar number", "address": "Full address with PIN", "mobile": "Mobile if printed",
         "state": "State in the address"}, visual=True),
    _dt("GT_PAN", "PAN card", "gt", "person", [r"\bpan\b"], [r"income tax department", r"permanent account number"],
        {"name": "Name", "father_name": "Father's name", "dob": "DOB", "pan": "PAN"}, visual=True),
    _dt("GT_BANK", "Bank passbook / cancelled cheque", "gt", "person", [r"bank", r"passbook", r"cheque"], [r"ifsc", r"account no"],
        {"name": "Account holder name", "father_name": "S/O if printed", "bank_account": "Account number", "ifsc": "IFSC",
         "bank": "Bank and branch", "address": "Address if printed", "kind": "'passbook' / 'cancelled cheque' / 'statement'"}, visual=True),
    _dt("GT_APPOINTMENT", "Appointment letter (worker copy)", "gt", "person", [r"appoint"], [r"appointment"],
        {"name": "Name", "designation": "Designation", "doj": "DOJ", "wage": "Wage", "letter_date": "Date",
         "signed_by_employer": "true / false", "signed_by_employee": "true / false"}, visual=True,
        notes="If this page is actually a bio-data / application form, classify it as GT_BIODATA instead."),
    _dt("GT_BIODATA", "Bio-data / application form", "gt", "person", [r"bio.?data", r"application", r"resume"], [r"bio.?data", r"application form"],
        {"name": "Name", "father_name": "Father", "dob": "DOB", "gender": "Gender", "mobile": "Mobile", "address": "Address",
         "aadhaar": "Aadhaar", "date_filled": "Date filled (null if blank)", "employee_signature": "true if signed, false if blank",
         "photo": "true if a photograph is pasted"}, visual=True),
    _dt("GT_PHOTO", "Passport photograph", "gt", "person", [r"photo"], [], {"attested": "true if signed / stamped across the photo"}, visual=True),
    _dt("GT_OTHER", "Other worker document (education certificate, ration card, voter ID …)", "gt", "person", [], [],
        {"name": "Name", "kind": "What document", "dob": "DOB", "address": "Address"}, visual=True),
]

BY_KEY = {t.key: t for t in TYPES}
CQ_TYPES = [t for t in TYPES if t.root in ("cq", "any")]
GT_TYPES = [t for t in TYPES if t.root in ("gt", "any")]

# GT document types -> the label used in the worker-folder checklist (checks P-059..P-063, P-083)
GT_LABEL = {"GT_AADHAAR": "Aadhaar", "GT_PAN": "PAN", "GT_BANK": "Bank proof", "GT_APPOINTMENT": "Appointment letter",
            "GT_BIODATA": "Bio-data", "GT_PHOTO": "Photograph"}


def heuristic(rel_path: str, first_text: str, root: str) -> list[tuple[str, int]]:
    """Score every candidate type by filename (weight 3) and first-page text (weight 1). Highest first."""
    name = rel_path.lower().replace("_", " ")
    text = (first_text or "")[:4000].lower()
    pool = GT_TYPES if root == "gt" else CQ_TYPES
    scores = []
    for t in pool:
        s = 3 * sum(1 for p in t.patterns if re.search(p, name)) + sum(1 for p in t.text_patterns if re.search(p, text))
        if s:
            scores.append((t.key, s))
    scores.sort(key=lambda kv: -kv[1])
    return scores
