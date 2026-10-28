"""Salary revision bulk import: row validation + revision creation / approval / implement.

Port of ``FINAL/legacy_payroll/utils/payroll/salaryRevisionImportHelper.js``.

Exported (legacy name -> port):
    REVISION_TYPES
    validateSalaryRevisionRows       -> validate_salary_revision_rows
    summarizeRows                    -> summarize_rows
    applySalaryRevisionImport        -> apply_salary_revision_import
    formatRevisionTypeLabel          -> format_revision_type_label
    resolveExcelComponentOverrides   -> resolve_excel_component_overrides
    removeClearedComponentOverrides  -> remove_cleared_component_overrides
    materializeDefaultAmountOverrides -> materialize_default_amount_overrides
    sanitizeStatutoryFlags           -> sanitize_statutory_flags
    applyStatutoryFlagsToEmployee    -> apply_statutory_flags_to_employee
    applyStateToEmployee             -> apply_state_to_employee
(+ the module-private helpers under the same snake_case names.)

``employee`` arguments of the mutating helpers accept a ``PayrollEmployee`` (its
``statutory_info`` is replaced) or a legacy dict (``statutoryInfo`` replaced).
``apply_salary_revision_import`` drops the Mongoose model params; dates in returned rows
are aware ``datetime`` objects (``Date`` in legacy).
"""

import math
from datetime import datetime, timedelta, timezone

from .jsmath import (UNDEFINED, is_nullish, js_or, js_round, js_str, js_trim, js_truthy,
                     to_fixed, to_number)
from .loan_helper import js_date, js_iso, local_parts
from .one_time_import_helper import resolve_employee_import_error
from .salary_component_helper import (calculate_component_amount, is_basic_salary_component,
                                      merge_component_overrides, normalize_component_key,
                                      normalize_overrides, strip_basic_from_overrides,
                                      to_stored_overrides, with_explicit_basic_override)
from .salary_structure_import_helper import compute_payroll_info_from_salary_input

REVISION_TYPES = ["increment", "promotion", "adjustment", "new_joiner", "annual_hike"]
EN_IN_SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sept", "Oct",
                      "Nov", "Dec"]


def _g(obj, key):
    return obj.get(key, UNDEFINED) if isinstance(obj, dict) else UNDEFINED


def _finite(v):
    return isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(v)


def normalize_excel_match_key(value=""):
    import re

    value = "" if value is UNDEFINED else value
    return re.sub(r"[^a-z0-9]", "", js_trim(js_str(js_or(value, ""))).lower())


def is_balancing_allowance_component(comp=UNDEFINED):
    comp = {} if comp is UNDEFINED or comp is None else comp
    code = normalize_excel_match_key(_g(comp, "code"))
    name = normalize_excel_match_key(_g(comp, "name"))
    return (code in ("special", "specialallowance", "other", "otherallowance", "otherextra",
                     "otherextraallowance")
            or name in ("specialallowance", "otherallowance", "otherextraallowance"))


def build_org_component_catalog(salary_components=UNDEFINED):
    catalog = []
    for doc in js_or(salary_components if salary_components is not UNDEFINED else None, []):
        category = js_trim(js_str(js_or(_g(doc, "category"), ""))).lower()
        if not category:
            continue
        for comp in js_or(_g(doc, "components"), []):
            status = _g(comp, "status")
            if js_truthy(status) and status != "active":
                continue
            if is_balancing_allowance_component(comp):
                continue
            name = js_trim(js_str(js_or(_g(comp, "name"), "")))
            code = js_trim(js_str(js_or(_g(comp, "code"), "")))
            keys = [k for k in (normalize_excel_match_key(name), normalize_excel_match_key(code)) if k]
            if not keys:
                continue
            catalog.append({"category": category, "code": code, "name": name, "matchKeys": keys,
                            "component": comp})
    return catalog


def component_dedupe_key(comp=UNDEFINED):
    comp = {} if comp is UNDEFINED else comp
    cat = js_str(js_or(_g(comp, "category"), "")).lower()
    return f"{cat}:{normalize_component_key(js_or(_g(comp, 'code'), _g(comp, 'name')))}"


def resolve_excel_component_overrides(component_amounts=UNDEFINED, salary_components=UNDEFINED,
                                      blank_component_headers=UNDEFINED):
    component_amounts = {} if component_amounts is UNDEFINED else component_amounts
    salary_components = [] if salary_components is UNDEFINED else salary_components
    blank_component_headers = [] if blank_component_headers is UNDEFINED else blank_component_headers
    catalog = build_org_component_catalog(salary_components)

    def find_in_catalog(header):
        key = normalize_excel_match_key(header)
        if not key:
            return None
        return next((c for c in catalog if key in c["matchKeys"]), None)

    excel_overrides, blank_components, unmatched = [], [], []
    present = set()
    for header, amount in (component_amounts or {}).items():
        if not math.isfinite(to_number(amount)):
            continue
        found = find_in_catalog(header)
        if not found:
            unmatched.append(header)
            continue
        key = component_dedupe_key(found)
        if key in present:
            continue
        present.add(key)
        excel_overrides.append({"category": found["category"], "code": found["code"],
                                "name": found["name"], "overrideAmount": to_number(amount)})
    for header in blank_component_headers or []:
        found = find_in_catalog(header)
        if not found:
            unmatched.append(header)
            continue
        key = component_dedupe_key(found)
        if key in present:
            continue
        present.add(key)
        blank_components.append(found)
    missing = [c for c in catalog if component_dedupe_key(c) not in present]
    return {
        "overrides": normalize_overrides(excel_overrides),
        "blankComponents": blank_components,
        "missingComponents": missing,
        "unmatched": unmatched,
        "cleared": [{"category": c["category"], "code": c["code"], "name": c["name"]}
                    for c in blank_components],
    }


def is_same_component_override(a=UNDEFINED, b=UNDEFINED):
    a = {} if a is UNDEFINED else a
    b = {} if b is UNDEFINED else b
    a_code = normalize_component_key(js_or(_g(a, "code"), _g(a, "name")))
    b_code = normalize_component_key(js_or(_g(b, "code"), _g(b, "name")))
    a_name = normalize_component_key(_g(a, "name"))
    b_name = normalize_component_key(_g(b, "name"))
    if js_str(js_or(_g(a, "category"), "")).lower() != js_str(js_or(_g(b, "category"), "")).lower():
        return False
    return bool((a_code and b_code and a_code == b_code) or (a_name and b_name and a_name == b_name)
                or (a_code and b_name and a_code == b_name) or (a_name and b_code and a_name == b_code))


def remove_cleared_component_overrides(overrides=UNDEFINED, cleared=UNDEFINED):
    overrides = [] if overrides is UNDEFINED else overrides
    cleared = [] if cleared is UNDEFINED else cleared
    if not cleared:
        return normalize_overrides(overrides)
    return [item for item in normalize_overrides(overrides)
            if not any(is_same_component_override(item, c) for c in cleared)]


def materialize_default_amount_overrides(components=UNDEFINED, salary_bases=UNDEFINED):
    components = [] if components is UNDEFINED else components
    salary_bases = {} if salary_bases is UNDEFINED else salary_bases
    items = []
    for item in components or []:
        comp = js_or(_g(item, "component"), item)
        amount = js_round(to_number(calculate_component_amount(comp, salary_bases, None)))
        items.append({"category": _g(item, "category"), "code": _g(item, "code"),
                      "name": _g(item, "name"), "overrideAmount": amount})
    return normalize_overrides(items)


def to_default_components_array(overrides=UNDEFINED):
    overrides = [] if overrides is UNDEFINED else overrides
    return [{"category": o["category"], "code": o["code"], "name": o["name"],
             "amount": o["overrideAmount"], "componentName": o["name"]}
            for o in normalize_overrides(overrides)]


REVISION_TYPE_ALIASES = {
    "increment": "increment", "hike": "increment", "annual_hike": "annual_hike",
    "annualhike": "annual_hike", "annual": "annual_hike", "promotion": "promotion",
    "adjust": "adjustment", "adjustment": "adjustment", "new_joiner": "new_joiner",
    "newjoiner": "new_joiner", "joiner": "new_joiner", "new": "new_joiner",
}


def parse_optional_number(value=UNDEFINED):
    if is_nullish(value) or js_trim(js_str(value)) == "":
        return None
    n = to_number(value)
    return n if math.isfinite(n) else float("nan")


_EXCEL_EPOCH = datetime(1899, 12, 30, tzinfo=timezone.utc)


def parse_effective_date(value=UNDEFINED):
    if is_nullish(value) or (not isinstance(value, datetime) and js_trim(js_str(value)) == ""):
        return None
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    raw = js_trim(js_str(value))
    as_number = to_number(raw)
    if math.isfinite(as_number) and 25000 <= as_number <= 60000:
        ms = math.trunc(as_number * 86400000)
        return _EXCEL_EPOCH + timedelta(milliseconds=ms)
    return js_date(raw)


def parse_boolean(value=UNDEFINED, default_value=False):
    if is_nullish(value) or js_trim(js_str(value)) == "":
        return default_value
    raw = js_trim(js_str(value)).lower()
    if raw in ("true", "yes", "y", "1"):
        return True
    if raw in ("false", "no", "n", "0"):
        return False
    return default_value


def sanitize_statutory_flags(flags=UNDEFINED):
    out = {}
    if not isinstance(flags, dict):
        return out
    for key in ("epfApplicable", "pfOnActuals", "esiApplicable", "lwfApplicable", "ptApplicable"):
        value = flags.get(key, UNDEFINED)
        if isinstance(value, bool):
            out[key] = value
            continue
        if is_nullish(value) or value == "":
            continue
        raw = js_trim(js_str(value)).lower()
        if raw in ("true", "yes", "y", "1"):
            out[key] = True
        elif raw in ("false", "no", "n", "0"):
            out[key] = False
    if isinstance(out.get("esiApplicable"), bool):
        out["esiOptedOut"] = out["esiApplicable"] is False
    return out


def clone_statutory_info(source):
    if not js_truthy(source):
        return {}
    return dict(source) if isinstance(source, dict) else {}


def apply_pf_on_actuals_to_statutory_info(statutory_info=UNDEFINED, pf_on_actuals=UNDEFINED):
    statutory_info = {} if statutory_info is UNDEFINED else statutory_info
    if not isinstance(pf_on_actuals, bool):
        return statutory_info
    current = js_or(_g(statutory_info, "epfOverride"), {})
    return {**statutory_info,
            "epfOverride": {**(current if isinstance(current, dict) else {}),
                            "enabled": pf_on_actuals, "applyCeiling": not pf_on_actuals}}


def _split_flags(flags):
    pf = flags.get("pfOnActuals", UNDEFINED)
    rest = {k: v for k, v in flags.items() if k != "pfOnActuals"}
    return pf, rest


def merge_employee_statutory_for_calc(employee, statutory_flags=UNDEFINED):
    flags = sanitize_statutory_flags({} if statutory_flags is UNDEFINED else statutory_flags)
    pf, applicability = _split_flags(flags)
    base = clone_statutory_info(_employee_statutory(employee))
    return apply_pf_on_actuals_to_statutory_info({**base, **applicability}, pf)


def _employee_statutory(employee):
    if employee is None or employee is UNDEFINED:
        return UNDEFINED
    if isinstance(employee, dict):
        return employee.get("statutoryInfo", UNDEFINED)
    return getattr(employee, "statutory_info", None)


def _set_employee_statutory(employee, value):
    if isinstance(employee, dict):
        employee["statutoryInfo"] = value
    else:
        employee.statutory_info = value


def apply_statutory_flags_to_employee(employee, statutory_flags=UNDEFINED):
    flags = sanitize_statutory_flags({} if statutory_flags is UNDEFINED else statutory_flags)
    if not flags:
        return False
    pf, applicability = _split_flags(flags)
    current = clone_statutory_info(_employee_statutory(employee))
    _set_employee_statutory(employee, apply_pf_on_actuals_to_statutory_info(
        {**current, **applicability}, pf))
    return True


def apply_state_to_employee(employee, state=UNDEFINED):
    next_state = js_trim(js_str(js_or(state, "")))
    if not js_truthy(employee) or not next_state:
        return False
    current = clone_statutory_info(_employee_statutory(employee))
    _set_employee_statutory(employee, {**current, "ptState": next_state, "lwfState": next_state})
    return True


def normalize_revision_type(value=UNDEFINED):
    import re

    if not js_truthy(value):
        return ""
    key = re.sub(r"\s+", "_", js_trim(js_str(value)).lower())
    return REVISION_TYPE_ALIASES.get(key) or key


def format_revision_type_label(revision_type=UNDEFINED):
    labels = {"annual_hike": "Annual Hike", "new_joiner": "New Joiner", "promotion": "Promotion",
              "increment": "Increment", "adjustment": "Adjustment"}
    return labels.get(revision_type) if isinstance(revision_type, str) and revision_type in labels \
        else revision_type


def summarize_rows(rows=UNDEFINED):
    rows = [] if rows is UNDEFINED else rows
    valid = sum(1 for r in rows if js_truthy(_g(r, "valid")))
    return {"totalRows": len(rows), "validRows": valid, "invalidRows": len(rows) - valid}


def calculate_arrears(arrears_applicable=UNDEFINED, arrears_from_date=UNDEFINED,
                      effective_from=UNDEFINED, increment_amount=UNDEFINED):
    if (not js_truthy(arrears_applicable) or not js_truthy(arrears_from_date)
            or not js_truthy(effective_from) or to_number(increment_amount) <= 0):
        return {"arrearsAmount": 0, "arrearsToDate": None}
    from_d = js_date(arrears_from_date)
    to_d = js_date(effective_from)
    if from_d is None or to_d is None:
        return {"arrearsAmount": float("nan"), "arrearsToDate": to_d}
    fy, fm, _ = local_parts(from_d)
    ty, tm, _ = local_parts(to_d)
    months = max(0, (ty - fy) * 12 + (tm - fm))
    amount = js_round((to_number(increment_amount) / 12) * months)
    return {"arrearsAmount": int(amount) if math.isfinite(amount) else amount, "arrearsToDate": to_d}


def resolve_planned_status(auto_approve, auto_implement):
    if js_truthy(auto_implement):
        return "implemented"
    if js_truthy(auto_approve):
        return "approved"
    return "pending"


def _employee_plain(emp):
    return emp if isinstance(emp, dict) else emp.to_dict()


def validate_salary_revision_rows(raw_rows=UNDEFINED, employees=UNDEFINED,
                                  salary_components=UNDEFINED, statutory_compliance=UNDEFINED,
                                  inactive_employees=UNDEFINED):
    raw_rows = [] if raw_rows is UNDEFINED else raw_rows
    employees = [] if employees is UNDEFINED else employees
    salary_components = [] if salary_components is UNDEFINED else salary_components
    inactive_employees = [] if inactive_employees is UNDEFINED else inactive_employees
    validated = []
    for index, raw in enumerate(raw_rows):
        base_salary_raw = _g(raw, "baseSalary")
        base = {
            "rowNumber": js_or(_g(raw, "rowNumber"), index + 1),
            "employeeCode": js_or(_g(raw, "employeeCode"), ""),
            "employeeName": "",
            "revisionType": normalize_revision_type(_g(raw, "revisionType")),
            "effectiveFrom": _g(raw, "effectiveFrom"),
            "baseSalary": 0,
            "excelBasicSalary": None if is_nullish(base_salary_raw) else base_salary_raw,
            "grossSalary": _g(raw, "grossSalary"),
            "ctcInput": _g(raw, "ctcInput"),
            "state": js_or(_g(raw, "state"), ""),
            "taxRegime": js_or(_g(raw, "taxRegime"), ""),
            "paymentFrequency": js_or(_g(raw, "paymentFrequency"), ""),
            "arrearsApplicable": parse_boolean(_g(raw, "arrearsApplicable"), False),
            "arrearsFromDate": _g(raw, "arrearsFromDate"),
            "autoApprove": parse_boolean(_g(raw, "autoApprove"), False),
            "autoImplement": parse_boolean(_g(raw, "autoImplement"), False),
            "remarks": js_or(_g(raw, "remarks"), ""),
            "oldSalary": {"ctc": 0, "grossSalary": 0, "basicSalary": 0},
            "newSalary": {"ctc": 0, "grossSalary": 0, "basicSalary": 0},
            "incrementAmount": 0,
            "incrementPercentage": 0,
            "arrearsAmount": 0,
            "plannedStatus": "pending",
            "warnings": [],
            "valid": False,
            "error": "",
            "employeeId": None,
            "statutoryFlags": sanitize_statutory_flags(_g(raw, "statutoryFlags")),
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
        st_info = _g(emp, "statutoryInfo")
        if not js_truthy(base["state"]):
            base["state"] = js_trim(js_str(js_or(_g(st_info, "ptState"), _g(st_info, "lwfState"), "")))
        if not js_truthy(base["revisionType"]) or base["revisionType"] not in REVISION_TYPES:
            validated.append({**base, "error": f"revisionType must be one of: {', '.join(REVISION_TYPES)}"})
            continue
        effective = parse_effective_date(base["effectiveFrom"])
        if effective is None:
            validated.append({**base, "error": "effectiveFrom is required and must be a valid date"})
            continue
        base["effectiveFrom"] = effective
        if not _finite(base["grossSalary"]) or base["grossSalary"] <= 0:
            validated.append({**base, "error": "grossSalary must be a number greater than 0"})
            continue
        ctc_in = base["ctcInput"]
        if ctc_in is not None and (not _finite(ctc_in) or ctc_in < 0):
            validated.append({**base, "error": "ctc must be a valid number >= 0 when provided"})
            continue
        if base["arrearsApplicable"]:
            arrears_from = parse_effective_date(base["arrearsFromDate"])
            if arrears_from is None:
                validated.append({**base, "error": "arrearsFrom is required when arrearsApplicable is true"})
                continue
            if arrears_from > effective:
                validated.append({**base, "error": "arrearsFrom cannot be after effectiveFrom"})
                continue
            base["arrearsFromDate"] = arrears_from
        else:
            base["arrearsFromDate"] = None
        if base["autoImplement"] and not base["autoApprove"]:
            validated.append({**base, "error": "auto_approve cannot be false when auto_implement is true"})
            continue

        pinfo = _g(emp, "payrollInfo")
        employee_overrides = normalize_overrides(js_or(_g(pinfo, "componentOverrides"), []))
        res_x = resolve_excel_component_overrides(js_or(_g(raw, "componentAmounts"), {}),
                                                  salary_components,
                                                  js_or(_g(raw, "blankComponentHeaders"), []))
        excel_overrides = res_x["overrides"]
        if res_x["unmatched"]:
            base["warnings"].append(
                f"Unknown component column(s) ignored: {', '.join(js_str(u) for u in res_x['unmatched'])}")

        from_column = to_number(_g(raw, "baseSalary"))
        basic_item = next((i for i in excel_overrides if is_basic_salary_component(i)), None)
        from_component = to_number(basic_item["overrideAmount"] if basic_item is not None else UNDEFINED)
        if math.isfinite(from_column) and from_column > 0:
            excel_basic = from_column
        elif math.isfinite(from_component) and from_component > 0:
            excel_basic = from_component
        else:
            excel_basic = 0
        has_excel_basic = excel_basic > 0

        using_default = [{"category": c["category"], "code": c["code"], "name": c["name"]}
                         for c in res_x["blankComponents"] + res_x["missingComponents"]]
        compute_overrides = with_explicit_basic_override(
            remove_cleared_component_overrides(
                merge_component_overrides(employee_overrides, excel_overrides), using_default),
            excel_basic if has_excel_basic else 0, salary_components)

        plain = dict(emp)
        st_calc = merge_employee_statutory_for_calc(emp, base["statutoryFlags"])
        if js_truthy(base["state"]):
            st_calc["ptState"] = base["state"]
            st_calc["lwfState"] = base["state"]
        computed = compute_payroll_info_from_salary_input(
            base_salary=excel_basic if has_excel_basic else 0, gross_salary=base["grossSalary"],
            state=base["state"], employee={**plain, "statutoryInfo": st_calc},
            salary_components=salary_components, statutory_compliance=statutory_compliance,
            tax_regime=base["taxRegime"], payment_frequency=base["paymentFrequency"],
            salary_effective_from=effective, gross_salary_input=base["grossSalary"],
            ctc_input=base["ctcInput"], overrides=compute_overrides)
        payroll_info = computed.get("payrollInfo")
        if not payroll_info:
            validated.append({**base, "error": "Unable to compute salary structure from gross salary"})
            continue
        new_basic = payroll_info["baseSalary"]
        new_gross = payroll_info["grossSalary"]
        new_ctc = payroll_info["ctc"]
        base["baseSalary"] = new_basic
        if new_basic > new_gross or new_gross > new_ctc:
            validated.append({**base, "error": "Invalid salary structure. Please keep Basic ≤ Gross ≤ CTC"})
            continue
        bases = {"baseSalary": new_basic, "grossSalary": new_gross, "ctc": new_ctc}

        def not_basic(c):
            return ("basic" not in normalize_excel_match_key(c["name"])
                    and "basic" not in normalize_excel_match_key(c["code"]))

        blank_defaults = materialize_default_amount_overrides(
            [c for c in res_x["blankComponents"] if not_basic(c)], bases)
        missing_defaults = materialize_default_amount_overrides(
            [c for c in res_x["missingComponents"] if not_basic(c)], bases)
        default_components = to_default_components_array(missing_defaults)
        revision_overrides = strip_basic_from_overrides(merge_component_overrides(
            merge_component_overrides(excel_overrides, blank_defaults), missing_defaults))

        old_ctc = js_or(_g(pinfo, "ctc"), 0)
        old_gross = js_or(_g(pinfo, "grossSalary"), 0)
        old_basic = js_or(_g(pinfo, "baseSalary"), 0)
        increment = new_ctc - to_number(old_ctc)
        pct = to_fixed((increment / to_number(old_ctc)) * 100, 2) if to_number(old_ctc) > 0 else 0
        arrears = calculate_arrears(base["arrearsApplicable"], base["arrearsFromDate"], effective,
                                    increment)
        validated.append({
            **base,
            "employeeComponentOverrides": to_stored_overrides(employee_overrides),
            "excelComponentOverrides": to_stored_overrides(excel_overrides),
            "defaultComponents": default_components,
            "oldSalary": {"ctc": old_ctc, "grossSalary": old_gross, "basicSalary": old_basic,
                          "components": [],
                          "componentOverrides": to_stored_overrides(employee_overrides)},
            "newSalary": {"ctc": new_ctc, "grossSalary": new_gross, "basicSalary": new_basic,
                          "components": js_or(computed.get("components"), []),
                          "componentOverrides": to_stored_overrides(revision_overrides),
                          "defaultComponents": default_components},
            "incrementAmount": increment,
            "incrementPercentage": pct,
            "arrearsAmount": arrears["arrearsAmount"],
            "plannedStatus": resolve_planned_status(base["autoApprove"], base["autoImplement"]),
            "warnings": [*base["warnings"], *computed.get("warnings", [])],
            "revisionTypeLabel": format_revision_type_label(base["revisionType"]),
            "statutoryFlags": base["statutoryFlags"],
            "valid": True,
            "error": "",
        })
    return validated


# ------------------------------------------------------------------ DB side


def _pk(v):
    return getattr(v, "pk", v)


def create_revision_from_row(row, org_uuid, requested_by=""):
    from ..models import SalaryRevision

    arrears = calculate_arrears(row.get("arrearsApplicable"), row.get("arrearsFromDate"),
                                row.get("effectiveFrom"), row.get("incrementAmount"))
    old = row.get("oldSalary") or {}
    new = row.get("newSalary") or {}
    employee_overrides = normalize_overrides(
        js_or(row.get("employeeComponentOverrides"), old.get("componentOverrides"), []))
    if isinstance(new.get("componentOverrides"), list):
        revision_overrides = normalize_overrides(new["componentOverrides"])
    else:
        revision_overrides = normalize_overrides(js_or(row.get("excelComponentOverrides"), []))
    default_components = js_or(new.get("defaultComponents"), row.get("defaultComponents"), [])
    flags = sanitize_statutory_flags(row.get("statutoryFlags"))
    revision = SalaryRevision(
        org_id=_pk(org_uuid), employee_id=row.get("employeeId"),
        revision_type=row.get("revisionType"), effective_from=js_date(row.get("effectiveFrom")),
        old_salary={"ctc": old.get("ctc"), "grossSalary": old.get("grossSalary"),
                    "basicSalary": old.get("basicSalary"),
                    "components": js_or(old.get("components"), []),
                    "componentOverrides": to_stored_overrides(employee_overrides)},
        new_salary={"ctc": new.get("ctc"), "grossSalary": new.get("grossSalary"),
                    "basicSalary": new.get("basicSalary"),
                    "components": js_or(new.get("components"), []),
                    "componentOverrides": to_stored_overrides(revision_overrides),
                    "defaultComponents": default_components},
        increment_amount=row.get("incrementAmount") or 0,
        increment_percentage=row.get("incrementPercentage") or 0,
        arrears_applicable=bool(row.get("arrearsApplicable")),
        arrears_from_date=js_date(row.get("arrearsFromDate")) if row.get("arrearsApplicable")
        and row.get("arrearsFromDate") is not None else None,
        arrears_to_date=arrears["arrearsToDate"],
        arrears_amount=arrears["arrearsAmount"], arrears_paid=False, status="pending",
        requested_by=js_str(requested_by or ""), remarks=js_or(row.get("remarks"), ""),
        state=js_or(row.get("state"), ""))
    if flags:
        revision.statutory_applicability = flags
    revision.save()
    return revision


def approve_revision(revision, user_id, emp_id=None, approver_name=None, approver_role=None,
                     comments="Auto-approved via bulk import"):
    from ..models.salary_revision import new_approval

    name = js_str(f"User {user_id or ''}").strip()
    role = "Importer"
    if emp_id:
        from ..models import PayrollEmployee

        approver = PayrollEmployee.objects.filter(pk=emp_id).first()
        if approver is not None:
            name = approver.full_name or name
            role = approver.job_title or approver.category_name or role
    if approver_name:
        name = approver_name
    if approver_role:
        role = approver_role
    approvals = list(revision.approvals or [])
    approvals.append(new_approval(employeeId=str(emp_id) if emp_id else None, approverName=name,
                                  approverRole=role,
                                  approvedDate=js_iso(datetime.now(timezone.utc)),
                                  status="approved", comments=comments))
    revision.approvals = approvals
    revision.status = "approved"
    revision.save()


def en_in_short_month(dt):
    """``date.toLocaleString('en-IN', { month: 'short' })`` (server TZ Asia/Kolkata)."""
    _, m, _ = local_parts(dt)
    return EN_IN_SHORT_MONTHS[m]


def build_revision_arrears(revision, org, remarks):
    """Arrears document legacy created when implementing a revision with arrears."""
    from ..models import Arrears

    monthly = (revision.increment_amount or 0) / 12
    months = js_round(revision.arrears_amount / monthly) if monthly > 0 else 0
    frm = js_date(revision.arrears_from_date)
    to = js_date(revision.arrears_to_date)
    return Arrears(
        org=org, employee_id=revision.employee_id, arrears_type="salary_revision",
        period_from={"month": en_in_short_month(frm), "year": local_parts(frm)[0]},
        period_to={"month": en_in_short_month(to), "year": local_parts(to)[0]},
        components=[{"componentName": "Salary Revision Arrears",
                     "oldAmount": (revision.old_salary or {}).get("ctc"),
                     "newAmount": (revision.new_salary or {}).get("ctc"),
                     "difference": revision.increment_amount, "months": int(months),
                     "totalArrears": revision.arrears_amount}],
        total_arrears_amount=revision.arrears_amount, tds_on_arrears=0,
        net_arrears_payable=revision.arrears_amount, status="calculated",
        salary_revision=revision, remarks=remarks)


def implement_revision(revision, org_uuid):
    from django.db import transaction

    from ..models import PayrollEmployee

    with transaction.atomic():
        employee = PayrollEmployee.objects.select_for_update().filter(pk=revision.employee_id).first()
        if employee is None:
            raise Exception("Employee not found")  # noqa: TRY002 — legacy plain Error
        info = dict(employee.payroll_info or {})
        new = revision.new_salary or {}
        info["ctc"] = new.get("ctc")
        info["grossSalary"] = new.get("grossSalary")
        info["baseSalary"] = new.get("basicSalary")
        info["salaryEffectiveFrom"] = js_iso(revision.effective_from)
        stored = to_stored_overrides(js_or(new.get("componentOverrides"), []))
        if stored:
            info["componentOverrides"] = stored
        defaults = js_or(new.get("defaultComponents"), [])
        info["defaultComponents"] = defaults if isinstance(defaults, list) else []
        employee.payroll_info = info
        apply_statutory_flags_to_employee(employee, revision.statutory_applicability or {})
        apply_state_to_employee(employee, revision.state)
        employee.save()

        arrears_record = None
        if revision.arrears_applicable and (revision.arrears_amount or 0) > 0:
            arrears_record = build_revision_arrears(
                revision, revision.org, "Auto-created from bulk salary revision import")
            arrears_record.save()
        revision.status = "implemented"
        revision.implemented_date = datetime.now(timezone.utc)
        revision.save()
    return {"arrearsRecord": arrears_record}


def apply_salary_revision_import(valid_rows=None, org_uuid=None, requested_by="", emp_id=None,
                                 approver_name=None, approver_role=None):
    from django.db import transaction

    results, errors = [], []
    for row in valid_rows or []:
        try:
            # One savepoint per legacy save step: a DB error must not poison the caller's
            # transaction, while earlier steps of a failed row persist exactly like legacy.
            with transaction.atomic():
                revision = create_revision_from_row(row, org_uuid, requested_by)
            final = "pending"
            if row.get("autoApprove"):
                with transaction.atomic():
                    approve_revision(revision, requested_by, emp_id, approver_name, approver_role)
                final = "approved"
            if row.get("autoImplement"):
                if revision.status != "approved":
                    raise Exception("Revision must be approved before implement")  # noqa: TRY002
                implement_revision(revision, org_uuid)
                final = "implemented"
            results.append({
                "rowNumber": row.get("rowNumber"), "employeeId": row.get("employeeId"),
                "employeeCode": row.get("employeeCode"), "employeeName": row.get("employeeName"),
                "revisionId": str(revision.pk), "revisionType": row.get("revisionType"),
                "revisionTypeLabel": format_revision_type_label(row.get("revisionType")),
                "status": final, "oldSalary": row.get("oldSalary"), "newSalary": row.get("newSalary"),
                "incrementAmount": row.get("incrementAmount"),
                "incrementPercentage": row.get("incrementPercentage"),
            })
        except Exception as err:  # noqa: BLE001 — legacy per-row catch
            errors.append({"rowNumber": row.get("rowNumber"), "employeeCode": row.get("employeeCode"),
                           "error": str(err)})
    return {"results": results, "errors": errors}
