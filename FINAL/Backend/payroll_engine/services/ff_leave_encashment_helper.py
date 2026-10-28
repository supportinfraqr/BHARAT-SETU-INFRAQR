"""Port of ``utils/payroll/ffLeaveEncashmentHelper.js`` (Full & Final leave encashment).

Exported (legacy name -> port):
    getEmployeeLeaveEncashmentDetails -> get_employee_leave_encashment_details
    fetchEmployeeLeaveBalances        -> fetch_employee_leave_balances
    buildLeaveEncashmentSummary       -> build_leave_encashment_summary
    calculateEncashableLeaves         -> calculate_encashable_leaves

The per-leave-type balance maths of ``fetchEmployeeLeaveBalances`` lives in
``compute_leave_balances`` (pure: legacy-shaped leave-type docs + usage rows in, legacy
rows out) so it can be differential-tested against the JS with fake Mongoose models.

BSS mapping (``bss_leave_type_docs``): BSS ``LeaveType`` has no encashment / monthly /
validity / carry-forward configuration. Each active BSS leave type becomes a legacy
``typeOfLeave: 'Yearly'`` doc with ``creditDays = annual_entitlement + opening_balance``
(legacy yearly types are not prorated), ``encashed = is_paid`` with no day cap
(``encashedDays: 0``), never unlimited, no validity window. Usage = every APPROVED BSS
leave request of that type (legacy summed every Approved request, with no date window).
"""

from datetime import datetime, timezone

from .financial_year import LOCAL_TZ, _to_instant
from .jsmath import (UNDEFINED, js_max, js_min, js_or, js_out, js_round,
                     js_truthy, num0)


def js_date_json(instant):
    """``JSON.stringify`` of a JS ``Date`` (UTC ISO with milliseconds)."""
    if instant is None:
        return None
    utc = instant.astimezone(timezone.utc)
    return utc.strftime("%Y-%m-%dT%H:%M:%S.") + f"{utc.microsecond // 1000:03d}Z"


def js_new_date(value=UNDEFINED):
    """``new Date(value)`` -> aware UTC datetime or ``None`` (Invalid Date).

    ``new Date()`` / ``new Date(undefined)`` differ in JS (now vs Invalid Date); pass
    ``None`` explicitly for ``now`` handling at call sites."""
    if value is UNDEFINED:
        return None
    if value is None:
        return _to_instant(0)  # new Date(null) -> epoch
    return _to_instant(value)


def get_leave_name(leave_name_id=UNDEFINED):
    if not js_truthy(leave_name_id):
        return ""
    if isinstance(leave_name_id, str):
        return leave_name_id
    return js_or(leave_name_id.get("name", UNDEFINED), leave_name_id.get("shortName", UNDEFINED),
                 leave_name_id.get("code", UNDEFINED), "")


def calculate_encashable_leaves(leave_type, remaining=UNDEFINED):
    balance = js_max(0, num0(remaining))
    if (not js_truthy(leave_type.get("encashed")) or leave_type.get("leaveType") != "Paid"
            or js_truthy(leave_type.get("isUnlimited"))):
        return 0
    if balance <= 0:
        return 0
    cap = num0(leave_type.get("encashedDays"))
    return js_out(js_min(balance, cap) if cap > 0 else balance)


def _or0(value):
    return value if js_truthy(value) else 0


def _months_earned_till_prev(effective_start, ref_instant):
    """Legacy ``while (tmp <= prevMonthEnd)`` month counter (local calendar months)."""
    if effective_start is None or ref_instant is None:
        return 0  # Invalid Date compares false -> loop never runs
    start = effective_start.astimezone(LOCAL_TZ)
    ref = ref_instant.astimezone(LOCAL_TZ)
    # tmp = start with day 1 (same time of day); prevMonthEnd = last day of the month
    # before ref at 23:59:59 -> counts months start..(ref month - 1) inclusive.
    return max(0, (ref.year * 12 + ref.month) - (start.year * 12 + start.month))


def compute_leave_balances(leave_types, usage_rows, employee, ref_date):
    """Body of ``fetchEmployeeLeaveBalances`` after the two queries.

    ``leave_types``: legacy LeaveType docs (``leaveNameId`` populated);
    ``usage_rows``: ``{leaveTypeId: {"usedDays", "advanceDays"}}``;
    ``ref_date``: aware datetime (``refDate``)."""
    leaves = []
    for lt in leave_types:
        usage_row = usage_rows.get(str(lt.get("_id"))) or {}
        used_days = _or0(usage_row.get("usedDays"))
        advance_used = _or0(usage_row.get("advanceDays"))
        leave_name = get_leave_name(lt.get("leaveNameId", UNDEFINED))
        encashment_policy = {"encashed": js_truthy(lt.get("encashed")),
                             "encashedDaysLimit": _or0(lt.get("encashedDays"))}

        if js_truthy(lt.get("isUnlimited")):
            leaves.append({
                "leaveTypeId": lt.get("_id"), "leaveName": leave_name,
                "leaveType": lt.get("leaveType", UNDEFINED),
                "typeOfLeave": lt.get("typeOfLeave", UNDEFINED), "isUnlimited": True,
                "totalAllotted": "Unlimited", "usedDays": used_days,
                "remainingBalance": "Unlimited", "advanceUsed": advance_used,
                "encashmentPolicy": encashment_policy, "isEncashable": False,
                "encashableLeaves": 0,
            })
            continue

        if lt.get("typeOfLeave") != "Monthly":
            total_allotted = num0(lt.get("creditDays"))
            remaining_balance = total_allotted - used_days
            encashable = calculate_encashable_leaves(lt, remaining_balance)
            leaves.append({
                "leaveTypeId": lt.get("_id"), "leaveName": leave_name,
                "leaveType": lt.get("leaveType", UNDEFINED),
                "typeOfLeave": lt.get("typeOfLeave", UNDEFINED),
                "validityStart": js_or(lt.get("validityStart"), None),
                "validityEnd": js_or(lt.get("validityEnd"), None),
                "totalAllotted": total_allotted, "usedDays": used_days,
                "remainingBalance": remaining_balance, "advanceUsed": advance_used,
                "carryForward": js_truthy(lt.get("carryForward")),
                "carryForwardLimit": _or0(lt.get("carryForwardLimit")),
                "encashmentPolicy": encashment_policy, "isEncashable": encashable > 0,
                "encashableLeaves": encashable,
            })
            continue

        if js_truthy(lt.get("validityStart")):
            effective_start = js_new_date(lt.get("validityStart"))
        else:
            # Legacy reads employee.joiningDate (the Employee field is dateOfJoining).
            effective_start = js_new_date(employee.get("joiningDate", UNDEFINED))
        months = _months_earned_till_prev(effective_start, ref_date)
        monthly_allowed = num0(lt.get("monthlyAllowed"))
        earned_till_prev = months * monthly_allowed
        unused_prev = earned_till_prev - used_days
        carry_forward = 0
        if js_truthy(lt.get("carryForward")) and unused_prev > 0:
            carry_forward = js_min(unused_prev, _or0(lt.get("carryForwardLimit")))
        total_allotted = carry_forward + monthly_allowed
        remaining_balance = total_allotted - used_days
        encashable = calculate_encashable_leaves(lt, remaining_balance)
        leaves.append({
            "leaveTypeId": lt.get("_id"), "leaveName": leave_name,
            "leaveType": lt.get("leaveType", UNDEFINED),
            "typeOfLeave": lt.get("typeOfLeave", UNDEFINED),
            "validityStart": js_or(lt.get("validityStart"), None),
            "validityEnd": js_or(lt.get("validityEnd"), None),
            "monthlyAllowed": _or0(lt.get("monthlyAllowed")),
            "earnedTillPrev": earned_till_prev, "carryForward": carry_forward,
            "totalAllotted": total_allotted, "usedDays": used_days,
            "remainingBalance": remaining_balance, "advanceUsed": advance_used,
            "encashmentPolicy": encashment_policy, "isEncashable": encashable > 0,
            "encashableLeaves": encashable,
        })
    return js_out(leaves)


def bss_leave_type_docs():
    """Active BSS leave types as legacy ``LeaveType`` docs (see module docstring)."""
    from .. import bss_adapter

    docs = []
    for lt in bss_adapter.leave_types():
        docs.append({
            "_id": lt["_id"], "status": "active",
            "leaveNameId": {"name": lt["name"], "code": lt.get("code") or ""},
            "leaveType": lt["leaveType"], "typeOfLeave": "Yearly",
            "creditDays": (lt.get("annualEntitlement") or 0) + (lt.get("openingBalance") or 0),
            "encashed": lt["leaveType"] == "Paid", "encashedDays": 0, "isUnlimited": False,
            "carryForward": False, "carryForwardLimit": 0,
            "validityStart": None, "validityEnd": None,
        })
    return docs


def fetch_employee_leave_balances(employee, employee_id=None, as_of_date=None):
    """``employee``: PayrollEmployee; ``as_of_date``: aware datetime (default now)."""
    from .. import bss_adapter

    ref_date = as_of_date or datetime.now(timezone.utc)
    leave_types = bss_leave_type_docs()
    if not leave_types:
        return []
    usage = bss_adapter.leave_usage(employee)
    ids = {lt["_id"] for lt in leave_types}
    usage_rows = {k: {"usedDays": v, "advanceDays": 0} for k, v in usage.items() if k in ids}
    return compute_leave_balances(leave_types, usage_rows, employee.to_dict(), ref_date)


def build_leave_encashment_summary(leaves=UNDEFINED, salary_bases=UNDEFINED):
    leaves = [] if leaves is UNDEFINED else leaves
    salary_bases = {} if salary_bases is UNDEFINED else salary_bases
    numeric = [lv for lv in leaves if not js_truthy(lv.get("isUnlimited"))]
    total_available = 0
    for lv in numeric:
        total_available += js_max(0, num0(lv.get("remainingBalance")))
    total_encashable = 0
    for lv in numeric:
        total_encashable += num0(lv.get("encashableLeaves"))
    basic = num0(salary_bases.get("baseSalary"))
    gross = num0(salary_bases.get("grossSalary"))
    if basic > 0:
        rate = js_round((basic / 30) * 100) / 100
    elif gross > 0:
        rate = js_round((gross / 30) * 100) / 100
    else:
        rate = 0
    total_amount = js_round(total_encashable * rate * 100) / 100
    return js_out({
        "totalAvailableLeaves": total_available,
        "totalEncashableLeaves": total_encashable,
        "suggestedPerDayRate": rate,
        "suggestedTotalAmount": total_amount,
        "encashableLeaveTypes": [lv for lv in numeric if js_truthy(lv.get("isEncashable"))],
    })


def get_employee_leave_encashment_details(org, employee_id, as_of_date=None, employee=None):
    """Returns ``{"error": {...}}`` or ``{"data": {...}}`` like the legacy helper.

    ``as_of_date`` is the raw query value (``req.query.asOfDate``)."""
    from ..models import PayrollEmployee

    if employee is None:
        try:
            employee = PayrollEmployee.objects.filter(org=org, pk=employee_id).first()
        except Exception:  # noqa: BLE001 — invalid id -> legacy CastError; treat as not found
            employee = None
    if employee is None:
        return {"error": {"status": 404, "message": "Employee not found"}}

    if js_truthy(as_of_date):
        ref_date = js_new_date(as_of_date)
    else:
        ref_date = datetime.now(timezone.utc)
    if ref_date is None:
        return {"error": {"status": 400, "message": "Invalid asOfDate"}}

    leaves = fetch_employee_leave_balances(employee, employee_id, ref_date)
    info = employee.payroll_info or {}
    salary_bases = {
        "baseSalary": js_or(info.get("baseSalary"), 0),
        "grossSalary": js_or(info.get("grossSalary"), 0),
    }
    summary = build_leave_encashment_summary(leaves, salary_bases)
    block = {
        "availableLeaves": summary["totalAvailableLeaves"],
        "encashableLeaves": summary["totalEncashableLeaves"],
        "perDayRate": summary["suggestedPerDayRate"],
        "totalAmount": summary["suggestedTotalAmount"],
    }
    return {"data": js_out({
        "employee": {
            "id": str(employee.pk),
            "name": f"{employee.first_name or ''} {employee.last_name or ''}".strip(),
            "email": employee.email,
            # Legacy selected ``joiningDate`` which the Employee schema does not have
            # (it is ``dateOfJoining``), so this was always null.
            "joiningDate": None,
        },
        "asOfDate": js_date_json(ref_date),
        "salaryBases": salary_bases,
        "leaves": leaves,
        "summary": dict(block),
        "leaveEncashment": dict(block),
        "encashableLeaveTypes": summary["encashableLeaveTypes"],
    })}


__all__ = ["get_employee_leave_encashment_details", "fetch_employee_leave_balances",
           "build_leave_encashment_summary", "calculate_encashable_leaves", "get_leave_name",
           "compute_leave_balances", "js_date_json", "js_new_date"]
