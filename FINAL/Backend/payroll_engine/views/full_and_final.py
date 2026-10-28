"""Port of ``controller/payroll/fullAndFinal.js`` (Full & Final settlement).

Exited employees in BSS = ``PayrollEmployee`` rows with ``exitData.exitStatus`` set (BSS
binding ended -> ``bss_adapter.sync_employees``, or the HR exit endpoint in
``views/core.py``) / ``status == 'Inactive'`` / ``exitData.lastWorkingDay`` set — the
same three conditions legacy used.
"""

import math
import re

from django.core.exceptions import ValidationError
from django.utils import timezone

from ..context import PayrollError, payroll_view, send_response
from ..models import FullAndFinal, PayrollEmployee
from ..models.base import iso, new_subdoc_id
from ..services.audit_log import log_payroll_action
from ..services.ff_leave_encashment_helper import get_employee_leave_encashment_details, js_new_date
from ..services.ff_settlement_preview import GRATUITY_CAP, build_settlement_preview, leave_rate
from ..services.jsmath import (UNDEFINED, clean, js_add, js_min, js_nc, js_or, js_round, js_str,
                               js_truthy, num0, parse_int, to_number)

EMPLOYEE_FIELDS = ["firstName", "lastName", "email", "uniqueId", "jobTitle", "dateOfJoining",
                   "exitData", "status"]
LOCKED_MESSAGE = "Finalized settlement cannot be changed"
_HEX24 = re.compile(r"^[0-9a-fA-F]{24}$")


# ----------------------------------------------------------------------------- helpers

def is_settlement_locked(settlement):
    return settlement is not None and settlement.status in ("finalized", "paid")


def _is_valid_object_id(value):
    """``mongoose.Types.ObjectId.isValid``."""
    if isinstance(value, bool):
        return False
    if isinstance(value, (int, float)):
        return True
    if isinstance(value, str):
        return len(value) == 12 or bool(_HEX24.match(value))
    return False


def _cast_number(value, path):
    """Mongoose ``Number`` cast on save: numeric strings become numbers, junk -> CastError."""
    if value is UNDEFINED or value is None:
        return value
    if isinstance(value, bool):
        return 1 if value else 0
    if isinstance(value, (int, float)):
        return clean(float(value))
    n = to_number(value)
    if math.isnan(n) or isinstance(value, (dict, list)):
        raise ValueError(f'FullAndFinal validation failed: {path}: Cast to Number failed for value '
                         f'"{js_str(value)}" (type {type(value).__name__}) at path "{path}"')
    return clean(n)


def _or0(value):
    return js_or(value if value is not None else UNDEFINED, 0)


def _get(doc, key):
    return (doc or {}).get(key, UNDEFINED)


def _get_settlement(ctx, settlement_id):
    try:
        return FullAndFinal.objects.filter(org=ctx.require_org(), pk=settlement_id).first()
    except (ValidationError, ValueError):
        return None


def _load_for_update(ctx, settlement_id, check_lock=True):
    settlement = _get_settlement(ctx, settlement_id)
    if settlement is None:
        raise PayrollError("Settlement not found", 404)
    if check_lock and is_settlement_locked(settlement):
        raise PayrollError(LOCKED_MESSAGE, 400)
    return settlement


def _employee_ref(emp):
    """Legacy ``populate('employeeId', EMPLOYEE_FIELDS)``."""
    if emp is None:
        return None
    doc = emp.to_dict()
    out = {"_id": doc["_id"]}
    for key in EMPLOYEE_FIELDS:
        out[key] = doc.get(key)
    return out


def _populated(settlement):
    data = settlement.to_dict()
    data["employeeId"] = _employee_ref(settlement.employee)
    return data


def _audit(ctx, settlement, action, remarks, before=None):
    log_payroll_action(ctx, action=action, entity_type="settlement", entity_id=settlement.pk,
                       affected_employee=settlement.employee, before_data=before,
                       after_data={"status": settlement.status,
                                   "totalPayables": settlement.total_payables,
                                   "totalDeductions": settlement.total_deductions,
                                   "netPayable": settlement.net_payable},
                       remarks=remarks)


def _totals(settlement):
    sd = settlement.salary_dues or {}
    bi = settlement.bonus_incentives or {}
    salary_total = js_add(_or0(sd.get("unpaidSalary")), _or0(sd.get("proratedSalary")))
    leave_total = _or0((settlement.leave_encashment or {}).get("totalAmount"))
    bonus_total = js_add(js_add(js_add(_or0(bi.get("performanceBonus")), _or0(bi.get("statutoryBonus"))),
                                _or0(bi.get("incentives"))), _or0(bi.get("commission")))
    reimbursement_total = _or0((settlement.pending_reimbursements or {}).get("totalAmount"))
    gratuity_total = _or0((settlement.gratuity or {}).get("gratuityAmount"))
    total_payables = js_add(js_add(js_add(js_add(salary_total, leave_total), bonus_total),
                                   reimbursement_total), gratuity_total)
    total_deductions = js_add(_or0((settlement.deductions or {}).get("totalDeductions")),
                              _or0((settlement.tax_deductions or {}).get("totalTax")))
    net_payable = to_number(total_payables) - to_number(total_deductions)
    return total_payables, total_deductions, net_payable


# ----------------------------------------------------------------------------- handlers

@payroll_view(["POST"])
def initiate_full_and_final(ctx):
    org = ctx.require_org()
    body = ctx.body
    employee_id = body.get("employeeId")
    resignation_id = body.get("resignationId", UNDEFINED)
    last_working_date = body.get("lastWorkingDate")
    if not js_truthy(employee_id) or not js_truthy(last_working_date):
        raise PayrollError("Employee ID and last working date are required", 400)

    if isinstance(resignation_id, str):
        normalized = re.sub(r'^"+|"+$', "", resignation_id.strip())
    else:
        normalized = resignation_id
    if js_truthy(normalized) and not _is_valid_object_id(normalized):
        raise PayrollError("Invalid resignation ID", 400)

    try:
        existing = FullAndFinal.objects.filter(org=org, employee_id=employee_id).exists()
        employee = PayrollEmployee.objects.filter(org=org, pk=employee_id).first()
    except (ValidationError, ValueError):
        existing, employee = False, None
    if existing:
        raise PayrollError("Full & Final settlement already initiated for this employee", 400)
    if employee is None:
        # BSS: settlements reference PayrollEmployee by FK (legacy stored any id).
        raise PayrollError("Employee not found", 404)

    lwd = js_new_date(last_working_date)
    if lwd is None:
        raise ValueError(
            'FullAndFinal validation failed: lastWorkingDate: Cast to date failed for value '
            f'"{js_str(last_working_date)}" (type {type(last_working_date).__name__}) at path '
            '"lastWorkingDate"')

    settlement = FullAndFinal(org=org, employee=employee,
                              resignation_id=str(normalized) if js_truthy(normalized) else "",
                              last_working_date=lwd, status="initiated")
    settlement.save()
    _audit(ctx, settlement, "settlement_initiated", "Full & Final settlement initiated")
    return send_response(201, True, "Full & Final settlement initiated successfully",
                         settlement.to_dict())


@payroll_view(["PUT"])
def update_salary_dues(ctx, settlementId):
    body = ctx.body
    settlement = _load_for_update(ctx, settlementId)
    p = "salaryDues"
    settlement.salary_dues = {
        "unpaidSalary": _cast_number(_or0(body.get("unpaidSalary")), f"{p}.unpaidSalary"),
        "workingDaysInLastMonth": _cast_number(_or0(body.get("workingDaysInLastMonth")),
                                               f"{p}.workingDaysInLastMonth"),
        "proratedSalary": _cast_number(_or0(body.get("proratedSalary")), f"{p}.proratedSalary"),
        "basicSalary": _cast_number(_or0(body.get("basicSalary")), f"{p}.basicSalary"),
        "allowances": _cast_number(_or0(body.get("allowances")), f"{p}.allowances"),
        "formula": js_str(js_or(body.get("formula", UNDEFINED),
                                _get(settlement.salary_dues, "formula"), "")),
    }
    settlement.save()
    _audit(ctx, settlement, "settlement_initiated", "Full & Final salary dues updated")
    return send_response(200, True, "Salary dues updated successfully", settlement.to_dict())


@payroll_view(["PUT"])
def update_leave_encashment(ctx, settlementId):
    body = ctx.body
    settlement = _load_for_update(ctx, settlementId)
    current = settlement.leave_encashment or {}
    resolved_method = js_or(body.get("method", UNDEFINED), _get(current, "method"), "basic_26")
    basic = num0(js_nc(body.get("basicSalary", UNDEFINED), _get(current, "basicSalary")))
    gross = num0(js_nc(body.get("grossSalary", UNDEFINED), _get(current, "grossSalary")))
    rate = leave_rate(resolved_method, basic, gross)
    per_day_rate = js_or(rate["perDayRate"], num0(body.get("perDayRate", UNDEFINED)), 0)
    leaves = num0(body.get("encashableLeaves", UNDEFINED))
    p = "leaveEncashment"
    settlement.leave_encashment = {
        "availableLeaves": _cast_number(_or0(body.get("availableLeaves")), f"{p}.availableLeaves"),
        "encashableLeaves": clean(leaves),
        "perDayRate": clean(per_day_rate),
        "totalAmount": clean(js_round(leaves * per_day_rate * 100) / 100),
        "method": js_str(resolved_method),
        "basicSalary": clean(basic),
        "grossSalary": clean(gross),
        "formula": js_str(js_or(body.get("formula", UNDEFINED),
                                f"Encashable leaves × ({rate['formula']})")),
    }
    settlement.save()
    _audit(ctx, settlement, "settlement_initiated", "Full & Final leave encashment updated")
    return send_response(200, True, "Leave encashment updated successfully", settlement.to_dict())


@payroll_view(["PUT"])
def update_bonus_incentives(ctx, settlementId):
    body = ctx.body
    settlement = _load_for_update(ctx, settlementId)
    p = "bonusIncentives"
    settlement.bonus_incentives = {
        "performanceBonus": _cast_number(_or0(body.get("performanceBonus")), f"{p}.performanceBonus"),
        "statutoryBonus": _cast_number(_or0(body.get("statutoryBonus")), f"{p}.statutoryBonus"),
        "incentives": _cast_number(_or0(body.get("incentives")), f"{p}.incentives"),
        "commission": _cast_number(_or0(body.get("commission")), f"{p}.commission"),
        "method": js_str(js_or(body.get("method", UNDEFINED), "")),
        "formula": js_str(js_or(body.get("formula", UNDEFINED), "")),
        "monthsCounted": _cast_number(_or0(body.get("monthsCounted")), f"{p}.monthsCounted"),
        "calcBase": _cast_number(_or0(body.get("calcBase")), f"{p}.calcBase"),
        "percentage": _cast_number(_or0(body.get("percentage")), f"{p}.percentage"),
        "eligible": js_truthy(body.get("eligible", UNDEFINED)),
    }
    settlement.save()
    _audit(ctx, settlement, "settlement_initiated", "Full & Final bonus and incentives updated")
    return send_response(200, True, "Bonus and incentives updated successfully",
                         settlement.to_dict())


@payroll_view(["PUT"])
def update_deductions(ctx, settlementId):
    body = ctx.body
    settlement = _load_for_update(ctx, settlementId)
    keys = ["noticePeriodShortfall", "loansAdvances", "companyAssetRecovery", "damageLoss",
            "overtimeTaken", "otherDeductions"]
    values = {k: _or0(body.get(k)) for k in keys}
    # Legacy summed with ``+`` (string values concatenate, then Mongoose casts).
    total = values[keys[0]]
    for k in keys[1:]:
        total = js_add(total, values[k])
    p = "deductions"
    out = {k: _cast_number(values[k], f"{p}.{k}") for k in keys}
    out["totalDeductions"] = _cast_number(total, f"{p}.totalDeductions")
    settlement.deductions = out
    settlement.save()
    _audit(ctx, settlement, "settlement_initiated", "Full & Final deductions updated")
    return send_response(200, True, "Deductions updated successfully", settlement.to_dict())


@payroll_view(["PUT"])
def update_gratuity(ctx, settlementId):
    body = ctx.body
    settlement = _load_for_update(ctx, settlementId)
    is_eligible = body.get("isEligible", UNDEFINED)
    years = num0(body.get("yearsOfService", UNDEFINED))
    wage = num0(body.get("lastDrawnSalary", UNDEFINED))
    raw = (wage * 15 * years) / 26 if js_truthy(is_eligible) else 0
    capped = raw > GRATUITY_CAP
    gratuity_amount = js_round(js_min(GRATUITY_CAP, raw) * 100) / 100
    settlement.gratuity = {
        "isEligible": js_truthy(is_eligible),
        "yearsOfService": clean(years),
        "completedYears": clean(js_or(num0(body.get("completedYears", UNDEFINED)),
                                      _get(settlement.gratuity, "completedYears"), 0)),
        "lastDrawnSalary": clean(wage),
        "gratuityAmount": clean(gratuity_amount),
        "formula": (f"(Last drawn Basic + DA × 15 × {js_str(years)}) / 26"
                    f"{'. Capped at 20,00,000.' if capped else ''}") if js_truthy(is_eligible)
        else "Not eligible",
        "reason": js_str(js_or(body.get("reason", UNDEFINED), "")),
        "capped": capped,
    }
    settlement.save()
    _audit(ctx, settlement, "settlement_initiated", "Full & Final gratuity updated")
    return send_response(200, True, "Gratuity updated successfully", settlement.to_dict())


@payroll_view(["POST"])
def calculate_final_settlement(ctx, settlementId):
    settlement = _load_for_update(ctx, settlementId)
    total_payables, total_deductions, net_payable = _totals(settlement)
    settlement.total_payables = to_number(total_payables)
    settlement.total_deductions = to_number(total_deductions)
    settlement.net_payable = net_payable
    settlement.save()
    _audit(ctx, settlement, "settlement_initiated", "Full & Final settlement calculated")
    return send_response(200, True, "Final settlement calculated successfully", {
        "totalPayables": clean(total_payables) if not isinstance(total_payables, str) else total_payables,
        "totalDeductions": clean(total_deductions) if not isinstance(total_deductions, str) else total_deductions,
        "netPayable": clean(net_payable),
        "settlement": settlement.to_dict(),
    })


@payroll_view(["POST"])
def add_approval(ctx, settlementId):
    body = ctx.body
    settlement = _load_for_update(ctx, settlementId)
    status = body.get("status", UNDEFINED)
    approval = {"_id": new_subdoc_id()}
    for key in ("approverName", "approverRole"):
        if key in body and body[key] is not None:
            approval[key] = js_str(body[key])
    approval["approvedDate"] = iso(timezone.now())
    approval["status"] = js_or(status, "pending")
    approval["comments"] = js_str(js_or(body.get("comments", UNDEFINED), ""))
    if approval["status"] not in ("pending", "approved", "rejected"):
        index = len(settlement.approvals or [])
        raise ValueError(f"FullAndFinal validation failed: approvals.{index}.status: "
                         f"`{js_str(approval['status'])}` is not a valid enum value for path `status`.")
    before = settlement.status
    settlement.approvals = list(settlement.approvals or []) + [approval]
    if status == "approved":
        settlement.status = "approved"
    elif status == "rejected":
        settlement.status = "rejected"
    settlement.save()
    _audit(ctx, settlement, "settlement_approved",
           f"Full & Final approval added ({approval['status']})", before={"status": before})
    return send_response(200, True, "Approval added successfully", settlement.to_dict())


@payroll_view(["PUT"])
def update_payment_details(ctx, settlementId):
    body = ctx.body
    settlement = _load_for_update(ctx, settlementId, check_lock=False)
    mode = body.get("paymentMode")
    if mode not in (None, "") and mode not in ("bank_transfer", "cheque", "cash"):
        raise ValueError("FullAndFinal validation failed: paymentDetails.paymentMode: "
                         f"`{js_str(mode)}` is not a valid enum value for path "
                         "`paymentDetails.paymentMode`.")
    payment_date = body.get("paymentDate")
    if js_truthy(payment_date):
        parsed = js_new_date(payment_date)
        if parsed is None:
            raise ValueError("FullAndFinal validation failed: paymentDetails.paymentDate: Cast to "
                             f"date failed for value \"{js_str(payment_date)}\" at path "
                             "\"paymentDetails.paymentDate\"")
        payment_date_out = iso(parsed)
    else:
        payment_date_out = iso(timezone.now())
    details = {}
    for key in ("paymentMode", "transactionId", "bankAccountNumber", "ifscCode"):
        if key in body and body[key] is not None:
            details[key] = js_str(body[key])
        if key == "paymentMode":
            details["paymentDate"] = payment_date_out
    settlement.payment_details = details
    before = settlement.status
    settlement.status = "paid"
    settlement.settlement_date = timezone.now()
    settlement.save()
    _audit(ctx, settlement, "settlement_paid", "Full & Final settlement paid",
           before={"status": before})
    return send_response(200, True, "Payment details updated successfully", settlement.to_dict())


@payroll_view(["GET"])
def get_employee_leave_encashment_details_view(ctx, employeeId):
    result = get_employee_leave_encashment_details(ctx.require_org(), employeeId,
                                                   ctx.query("asOfDate"))
    if result.get("error"):
        raise PayrollError(result["error"]["message"], result["error"]["status"])
    return send_response(200, True, "Employee leave encashment details fetched successfully",
                         result["data"])


@payroll_view(["GET"])
def get_settlement_by_employee(ctx, employeeId):
    org = ctx.require_org()
    try:
        settlement = (FullAndFinal.objects.filter(org=org, employee_id=employeeId)
                      .select_related("employee").order_by("created_at").first())
    except (ValidationError, ValueError):
        settlement = None
    if settlement is None:
        raise PayrollError("Settlement not found", 404)
    return send_response(200, True, "Settlement fetched successfully", _populated(settlement))


@payroll_view(["GET"])
def get_settlement_by_id(ctx, settlementId):
    settlement = _get_settlement(ctx, settlementId)
    if settlement is None:
        raise PayrollError("Settlement not found", 404)
    return send_response(200, True, "Settlement fetched successfully", _populated(settlement))


@payroll_view(["GET"])
def get_all_settlements(ctx):
    rows = (FullAndFinal.objects.filter(org=ctx.require_org()).select_related("employee")
            .order_by("created_at", "id"))
    return send_response(200, True, "Settlements fetched successfully",
                         [_populated(s) for s in rows])


def _is_left(emp):
    exit_data = emp.exit_data or {}
    return (emp.status == "Inactive" or exit_data.get("exitStatus") not in (None, "")
            or exit_data.get("lastWorkingDay") is not None)


def _lwd_sort_value(emp):
    value = (emp.exit_data or {}).get("lastWorkingDay")
    inst = js_new_date(value) if value is not None else None
    return inst.timestamp() if inst is not None else float("-inf")


@payroll_view(["GET"])
def get_exited_employees(ctx):
    org = ctx.require_org()
    page_n = parse_int(ctx.query("page"))
    page = max(1, page_n if isinstance(page_n, int) and page_n else 1)
    limit_n = parse_int(ctx.query("limit"))
    limit = max(1, limit_n if isinstance(limit_n, int) and limit_n else 30)
    search = str(ctx.query("search") or "").strip()

    rows = [e for e in PayrollEmployee.objects.filter(org=org) if _is_left(e)]
    if search:
        rx = re.compile(re.escape(search), re.IGNORECASE)
        rows = [e for e in rows if any(rx.search(v or "") for v in
                                       (e.first_name, e.last_name, e.unique_id, e.email))]
    # sort({'exitData.lastWorkingDay': -1, firstName: 1})
    rows.sort(key=lambda e: e.first_name or "")
    rows.sort(key=_lwd_sort_value, reverse=True)
    total = len(rows)
    page_rows = rows[(page - 1) * limit:(page - 1) * limit + limit]
    fields = ["firstName", "lastName", "email", "uniqueId", "jobTitle", "status", "exitData",
              "dateOfJoining"]
    employees = []
    for e in page_rows:
        doc = e.to_dict()
        employees.append({"_id": doc["_id"], **{k: doc.get(k) for k in fields}})
    return send_response(200, True, "Left employees fetched successfully", {
        "employees": employees,
        "totalEmployees": total,
        "totalPages": max(1, math.ceil(total / limit)),
        "currentPage": page,
    })


@payroll_view(["GET"])
def get_settlement_preview(ctx, employeeId):
    result = build_settlement_preview(ctx.require_org(), employeeId, ctx.query("lastWorkingDate"))
    if result.get("error"):
        raise PayrollError(result["error"]["message"], result["error"]["status"])
    return send_response(200, True, "Settlement preview calculated", result["data"])


@payroll_view(["POST"])
def finalize_settlement(ctx, settlementId):
    settlement = _load_for_update(ctx, settlementId, check_lock=False)
    if settlement.status == "paid":
        raise PayrollError("Paid settlement is already closed", 400)
    if settlement.status == "rejected":
        raise PayrollError("Rejected settlement cannot be finalized", 400)
    total_payables, total_deductions, net_payable = _totals(settlement)
    before = settlement.status
    settlement.total_payables = to_number(total_payables)
    settlement.total_deductions = to_number(total_deductions)
    settlement.net_payable = net_payable
    settlement.status = "finalized"
    settlement.finalized_at = timezone.now()
    settlement.save()
    _audit(ctx, settlement, "settlement_approved", "Full & Final settlement finalized",
           before={"status": before})
    return send_response(200, True, "Full and final settlement finalized", settlement.to_dict())


ROUTES = [
    ("fullAndFinal/initiate", initiate_full_and_final, "ff_initiate"),
    ("fullAndFinal/exitedEmployees", get_exited_employees, "ff_exited_employees"),
    ("fullAndFinal/preview/<str:employeeId>", get_settlement_preview, "ff_preview"),
    ("fullAndFinal/employee/<str:employeeId>/leaveEncashmentDetails",
     get_employee_leave_encashment_details_view, "ff_leave_encashment_details"),
    ("fullAndFinal/employee/<str:employeeId>", get_settlement_by_employee, "ff_by_employee"),
    ("fullAndFinal/<str:settlementId>/salaryDues", update_salary_dues, "ff_salary_dues"),
    ("fullAndFinal/<str:settlementId>/leaveEncashment", update_leave_encashment,
     "ff_leave_encashment"),
    ("fullAndFinal/<str:settlementId>/bonusIncentives", update_bonus_incentives,
     "ff_bonus_incentives"),
    ("fullAndFinal/<str:settlementId>/deductions", update_deductions, "ff_deductions"),
    ("fullAndFinal/<str:settlementId>/gratuity", update_gratuity, "ff_gratuity"),
    ("fullAndFinal/<str:settlementId>/calculate", calculate_final_settlement, "ff_calculate"),
    ("fullAndFinal/<str:settlementId>/finalize", finalize_settlement, "ff_finalize"),
    ("fullAndFinal/<str:settlementId>/approval", add_approval, "ff_approval"),
    ("fullAndFinal/<str:settlementId>/payment", update_payment_details, "ff_payment"),
    ("fullAndFinal/<str:settlementId>", get_settlement_by_id, "ff_by_id"),
    ("fullAndFinal", get_all_settlements, "ff_list"),
]
