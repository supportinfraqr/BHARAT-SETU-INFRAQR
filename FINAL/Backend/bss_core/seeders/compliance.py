"""Compliance + register/document catalog (mandatory, idempotent).

Feeds two admin masters and the contractor/employer compliance pages:
* ``ComplianceMaster``        → BSS Admin → Compliance Master (read-only)
* ``RegisterDocumentMaster``  → BSS Admin → Document Master (kind=document)
                                 and CLRA Templates (kind=register)
"""

# Central-government compliance matrix (act + form + nature). max_score = weight.
COMPLIANCE_MATRIX = [
    ("Contract Labour (Regulation & Abolition) Act, 1970", "FORM XII", "Registration", 10),
    ("Contract Labour (Regulation & Abolition) Act, 1970", "FORM XIII", "Licence", 10),
    ("Contract Labour (Regulation & Abolition) Act, 1970", "FORM XVI", "Muster Roll", 10),
    ("Contract Labour (Regulation & Abolition) Act, 1970", "FORM XVII", "Register of Wages", 10),
    ("Contract Labour (Regulation & Abolition) Act, 1970", "FORM XIX", "Wage Slip", 5),
    ("Contract Labour (Regulation & Abolition) Act, 1970", "FORM XX", "Register of Deductions", 5),
    ("Contract Labour (Regulation & Abolition) Act, 1970", "FORM XXI", "Register of Fines", 5),
    ("Contract Labour (Regulation & Abolition) Act, 1970", "FORM XXII", "Register of Advances", 5),
    ("Contract Labour (Regulation & Abolition) Act, 1970", "FORM XXIII", "Register of Overtime", 5),
    ("Employees' Provident Funds & Miscellaneous Provisions Act, 1952", "FORM 5", "EPF Return", 10),
    ("Employees' State Insurance Act, 1948", "FORM 3", "ESIC Return", 10),
    ("Payment of Wages Act, 1936", "FORM IV", "Wage Register", 10),
    ("Minimum Wages Act, 1948", "FORM XI", "Minimum Wage Register", 10),
    ("Payment of Bonus Act, 1965", "FORM D", "Bonus Register", 5),
    ("Building & Other Construction Workers Act, 1996", "BOCW", "BOCW Registration", 10),
    ("Sexual Harassment of Women at Workplace Act, 2013", "POSH", "POSH Policy & Committee", 10),
    ("Inter-State Migrant Workmen Act, 1979", "FORM I", "Migrant Workmen Register", 5),
    ("Occupational Safety, Health & Working Conditions Code, 2020", "OSH", "Safety Register", 10),
]

# Statutory registers catalog (code, kind, name, act, form, frequency, criticality, mandatory).
REGISTER_DOCS = [
    ("RD01", "register", "Register of Workmen / Muster Roll", "CLRA 1970", "FORM XVI", "Monthly", "High", True),
    ("RD02", "register", "Register of Wages", "CLRA 1970", "FORM XVII", "Monthly", "High", True),
    ("RD03", "register", "Register of Deductions", "CLRA 1970", "FORM XX", "Monthly", "Medium", True),
    ("RD04", "register", "Register of Fines", "CLRA 1970", "FORM XXI", "Monthly", "Medium", True),
    ("RD05", "register", "Register of Advances", "CLRA 1970", "FORM XXII", "Monthly", "Medium", True),
    ("RD06", "register", "Register of Overtime", "CLRA 1970", "FORM XXIII", "Monthly", "Medium", True),
    ("RD07", "register", "Attendance Register", "CLRA 1970", "FORM XVI", "Monthly", "High", True),
    ("RD08", "register", "Wage Slip", "Payment of Wages 1936", "FORM XIX", "Monthly", "Medium", False),
    ("RD09", "document", "EPF Monthly Return", "EPF 1952", "FORM 5", "Monthly", "High", True),
    ("RD10", "document", "ESIC Monthly Contribution", "ESIC 1948", "FORM 3", "Monthly", "High", True),
    ("RD11", "document", "BOCW Registration Certificate", "BOCW 1996", "BOCW", "Annual", "High", True),
    ("RD12", "document", "CLRA Registration Certificate", "CLRA 1970", "FORM XII", "Annual", "High", True),
    ("RD13", "document", "CLRA Licence", "CLRA 1970", "FORM XIII", "Annual", "High", True),
    ("RD14", "document", "POSH Policy & Committee Order", "POSH 2013", "POSH", "Annual", "High", True),
    ("RD15", "register", "Minimum Wage Register", "Minimum Wages 1948", "FORM XI", "Monthly", "High", True),
]


def seed():
    from bss_core.models import ComplianceMaster, RegisterDocumentMaster

    c_created = 0
    for act, form_number, nature, max_score in COMPLIANCE_MATRIX:
        _, created = ComplianceMaster.objects.update_or_create(
            act=act, form_number=form_number,
            defaults={"nature": nature, "max_score": max_score, "is_active": True},
        )
        c_created += int(created)

    r_created = 0
    for order, (code, kind, name, act, form, freq, crit, mandatory) in enumerate(REGISTER_DOCS):
        _, created = RegisterDocumentMaster.objects.update_or_create(
            code=code,
            defaults={
                "kind": kind, "document_name": name, "act": act, "form_number": form,
                "frequency": freq, "criticality": crit, "is_mandatory": mandatory,
                "is_active": True, "sort_order": order,
            },
        )
        r_created += int(created)
    return c_created, r_created
