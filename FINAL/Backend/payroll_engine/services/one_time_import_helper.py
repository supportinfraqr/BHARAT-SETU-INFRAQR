"""One-time earnings / deductions import helpers.

Port of ``FINAL/legacy_payroll/utils/payroll/oneTimeImportHelper.js``.

Exported (legacy name -> port):
    ALLOWED_CATEGORIES
    findEmployeeForImport          -> find_employee_for_import
    resolveEmployeeImportError     -> resolve_employee_import_error
    validateOneTimeImportRows      -> validate_one_time_import_rows
    mergeOneTimeIntoOverrides      -> merge_one_time_into_overrides
    applyAdHocOneTimeLines         -> apply_ad_hoc_one_time_lines   (mutates the lists)
    groupOneTimeRowsByEmployee     -> group_one_time_rows_by_employee (JS ``Map`` -> dict)
    summarizeRows                  -> summarize_rows
    findOrgComponent               -> find_org_component
    loadConfirmedOneTimeImportRows -> load_confirmed_one_time_import_rows
                                      (``PayrollOneTimeImportModel`` param dropped)

Employees are legacy-shaped dicts (``PayrollEmployee.to_dict()``); they are matched on
``customId`` first, then ``uniqueId`` (BSS worker id) exactly like the legacy helper.
"""

import math

from .jsmath import UNDEFINED, js_or, js_round, js_str, js_truthy, num0
from .salary_component_helper import normalize_component_key, normalize_overrides

ALLOWED_CATEGORIES = ["earnings", "deductions", "benefits"]


def _g(obj, key):
    return obj.get(key, UNDEFINED) if isinstance(obj, dict) else UNDEFINED


def find_org_component(salary_components=UNDEFINED, category=UNDEFINED, code="", name=""):
    salary_components = [] if salary_components is UNDEFINED else salary_components
    code = "" if code is UNDEFINED else code
    name = "" if name is UNDEFINED else name
    doc = next((c for c in salary_components if _g(c, "category") == category), None)
    if doc is None or not js_truthy(_g(doc, "components")):
        return None
    code_key = normalize_component_key(code)
    name_key = normalize_component_key(name)
    for component in doc["components"]:
        comp_code = normalize_component_key(_g(component, "code"))
        comp_name = normalize_component_key(_g(component, "name"))
        if (code_key and comp_code == code_key) or (name_key and comp_name == name_key):
            return component
    return None


def find_employee_for_import(employees=UNDEFINED, raw_code=""):
    employees = [] if employees is UNDEFINED else employees
    key = normalize_component_key(raw_code)
    if not key:
        return None
    for emp in employees:
        if normalize_component_key(_g(emp, "customId")) == key:
            return emp
    for emp in employees:
        if normalize_component_key(_g(emp, "uniqueId")) == key:
            return emp
    return None


def resolve_employee_import_error(raw_code=UNDEFINED, active_employees=UNDEFINED,
                                  inactive_employees=UNDEFINED):
    active_employees = [] if active_employees is UNDEFINED else active_employees
    inactive_employees = [] if inactive_employees is UNDEFINED else inactive_employees
    emp = find_employee_for_import(active_employees, raw_code)
    if emp:
        return {"employee": emp, "error": None}
    inactive = find_employee_for_import(inactive_employees, raw_code)
    if inactive:
        return {"employee": None,
                "error": f"Employee is {js_str(_g(inactive, 'status'))}. "
                         "Sirf Active employees import ho sakte hain."}
    return {"employee": None, "error": "Employee not found."}


def _finite(v):
    return isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(v)


def validate_one_time_import_rows(raw_rows=UNDEFINED, employees=UNDEFINED,
                                  salary_components=UNDEFINED, inactive_employees=UNDEFINED):
    raw_rows = [] if raw_rows is UNDEFINED else raw_rows
    employees = [] if employees is UNDEFINED else employees
    salary_components = [] if salary_components is UNDEFINED else salary_components
    inactive_employees = [] if inactive_employees is UNDEFINED else inactive_employees
    validated = []
    for index, raw in enumerate(raw_rows):
        base = {
            "rowNumber": js_or(_g(raw, "rowNumber"), index + 1),
            "employeeCode": js_or(_g(raw, "employeeCode"), ""),
            "employeeName": "",
            "category": js_or(_g(raw, "category"), ""),
            "componentCode": js_or(_g(raw, "componentCode"), ""),
            "componentName": js_or(_g(raw, "componentName"), ""),
            "amount": _g(raw, "amount"),
            "remarks": js_or(_g(raw, "remarks"), ""),
            "valid": False,
            "error": "",
            "isAdHoc": False,
            "matchedOrgComponent": False,
            "employeeId": None,
        }
        if not js_truthy(base["employeeCode"]):
            validated.append({**base, "error": "employeeCode is required (customId e.g. NSS02, "
                                               "ya uniqueId e.g. NAG00003)"})
            continue
        res = resolve_employee_import_error(base["employeeCode"], employees, inactive_employees)
        emp = res["employee"]
        if not emp:
            validated.append({**base, "error": res["error"]})
            continue
        base["employeeId"] = _g(emp, "_id")
        base["employeeName"] = (f"{js_str(js_or(_g(emp, 'firstName'), ''))} "
                                f"{js_str(js_or(_g(emp, 'lastName'), ''))}").strip()
        if base["category"] not in ALLOWED_CATEGORIES:
            validated.append({**base, "error": "category must be earnings, deductions, or benefits"})
            continue
        if not _finite(base["amount"]) or base["amount"] < 0:
            validated.append({**base, "error": "amount must be a valid number >= 0"})
            continue
        if not js_truthy(base["componentCode"]) and not js_truthy(base["componentName"]):
            validated.append({**base, "error": "componentCode or componentName is required"})
            continue
        org_component = find_org_component(salary_components, base["category"],
                                           base["componentCode"], base["componentName"])
        if org_component:
            base["componentCode"] = js_or(_g(org_component, "code"), base["componentCode"])
            base["componentName"] = js_or(_g(org_component, "name"), base["componentName"])
            base["matchedOrgComponent"] = True
            base["isAdHoc"] = False
        else:
            base["matchedOrgComponent"] = False
            base["isAdHoc"] = True
            if not js_truthy(base["componentName"]):
                base["componentName"] = base["componentCode"]
        base["valid"] = True
        validated.append(base)
    return validated


def merge_one_time_into_overrides(permanent_overrides=UNDEFINED, one_time_rows=UNDEFINED):
    permanent_overrides = [] if permanent_overrides is UNDEFINED else permanent_overrides
    one_time_rows = [] if one_time_rows is UNDEFINED else one_time_rows
    merged = list(normalize_overrides(permanent_overrides))
    for row in one_time_rows:
        if not js_truthy(_g(row, "valid")) or js_truthy(_g(row, "isAdHoc")):
            continue
        items = normalize_overrides([{"category": _g(row, "category"),
                                      "code": _g(row, "componentCode"),
                                      "name": _g(row, "componentName"),
                                      "overrideAmount": _g(row, "amount")}])
        if not items:
            continue
        item = items[0]
        idx = next((i for i, o in enumerate(merged)
                    if o.get("category") == item.get("category") and o.get("code") == item.get("code")), -1)
        if idx >= 0:
            merged[idx] = item
        else:
            merged.append(item)
    return merged


def apply_ad_hoc_one_time_lines(one_time_rows=UNDEFINED, earnings=None, deductions=None,
                                benefits=None):
    one_time_rows = [] if one_time_rows is UNDEFINED else one_time_rows
    for row in one_time_rows:
        if not js_truthy(_g(row, "valid")) or not js_truthy(_g(row, "isAdHoc")):
            continue
        line = {
            "componentName": js_or(_g(row, "componentName"), _g(row, "componentCode"),
                                   "One Time Component"),
            "amount": js_round(num0(_g(row, "amount"))),
            "calculationType": "one-time-import",
        }
        if line["amount"] <= 0:
            continue
        line["amount"] = int(line["amount"]) if float(line["amount"]).is_integer() else line["amount"]
        cat = _g(row, "category")
        if cat == "earnings":
            earnings.append(line)
        elif cat == "deductions":
            deductions.append(line)
        elif cat == "benefits":
            benefits.append(line)
    return UNDEFINED


def group_one_time_rows_by_employee(rows=UNDEFINED):
    rows = [] if rows is UNDEFINED else rows
    out = {}
    for row in rows:
        if not js_truthy(_g(row, "valid")) or not js_truthy(_g(row, "employeeId")):
            continue
        out.setdefault(js_str(row["employeeId"]), []).append(row)
    return out


def summarize_rows(rows=UNDEFINED):
    rows = [] if rows is UNDEFINED else rows
    valid = sum(1 for r in rows if js_truthy(_g(r, "valid")))
    return {"totalRows": len(rows), "validRows": valid, "invalidRows": len(rows) - valid}


def load_confirmed_one_time_import_rows(org_uuid, month, year):
    """Valid rows of the latest confirmed one-time import for the period (or ``[]``)."""
    from ..models import PayrollOneTimeImport

    org_id = getattr(org_uuid, "pk", org_uuid)
    try:
        year_n = float(year)
    except (TypeError, ValueError):
        return []
    batch = (PayrollOneTimeImport.objects
             .filter(org_id=org_id, month=month, year=year_n, status="confirmed")
             .order_by("-confirmed_at", "-updated_at").first())
    if batch is None or not batch.rows:
        return []
    return [r for r in batch.rows if js_truthy(r.get("valid"))]
