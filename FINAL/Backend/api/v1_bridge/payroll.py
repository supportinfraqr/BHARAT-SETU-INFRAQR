"""Payroll setup persistence — the statutory config cluster + salary components.

Reference: ``Requirements/BSS_Feature_Comparison.xlsx`` → "Payroll setup" sheet
(summarised in ``BSS_Database_Gap_Analysis.md`` section E).
"""

# ruff: noqa: F401,F403
from .common import *


def _num(value):
    return payloads._num(value)


def _date(value):
    text = str(value or "").strip()[:10]
    if not text:
        return None
    try:
        return datetime.strptime(text, "%Y-%m-%d").date()
    except ValueError:
        return None


def _pay_day(value):
    import re
    match = re.search(r"\d+", str(value or ""))
    if not match:
        return 1
    return max(1, min(31, int(match.group())))


def _handle_payroll_setup(user, body):
    """Persist the full payroll setup cluster for the caller's organisation."""
    from bss_core.models import (BonusConfig, BonusStateMinWage, EpfConfig, EsiConfig,
                                 FfsConfig, LwfConfig, PayrollConfig, PtConfig,
                                 SalaryBenefit, SalaryComponent, SalaryDeduction,
                                 SalaryReimbursement, StaffPortalConfig)

    config, _ = PayrollConfig.objects.get_or_create(employer=user)

    schedule = body.get("paySchedule") or {}
    if schedule:
        if schedule.get("payFrequency"):
            config.salary_frequency = str(schedule["payFrequency"])[:20]
        days = schedule.get("workingDays")
        if isinstance(days, list):
            config.working_days = ", ".join(str(d)[:20] for d in days)[:120]
        if schedule.get("payDay") is not None:
            config.default_pay_date = _pay_day(schedule.get("payDay"))
        if schedule.get("firstPayPeriod"):
            config.first_pay_period = _date(schedule.get("firstPayPeriod")) or config.first_pay_period
        config.save()

    statutory = body.get("statutory") or {}

    epf = statutory.get("epf") or {}
    if epf:
        obj, _ = EpfConfig.objects.get_or_create(config=config)
        obj.epf_number = str(epf.get("number") or "")[:40]
        obj.deduction_cycle = str(epf.get("deductionCycle") or "MONTHLY")[:20]
        obj.employer_pf_included = bool(epf.get("includeInSalary"))
        obj.edli_included = bool(epf.get("edliIncluded"))
        obj.admin_charges_included = bool(epf.get("adminChargesIncluded"))
        obj.employee_level_override = bool(epf.get("allowOverride"))
        obj.prorate_restricted_pf_wage = bool(epf.get("proRate"))
        obj.consider_components_lop = bool(epf.get("lopConsideration"))
        obj.abry_eligible = bool(epf.get("abryEligible"))
        obj.save()

    esi = statutory.get("esi") or {}
    if esi:
        obj, _ = EsiConfig.objects.get_or_create(config=config)
        obj.esi_number = str(esi.get("number") or "")[:40]
        obj.deduction_cycle = str(esi.get("deductionCycle") or "MONTHLY")[:20]
        obj.save()

    pt_rows = statutory.get("professionalTax")
    if isinstance(pt_rows, list):
        config.pt_configs.all().delete()
        for row in pt_rows:
            if not isinstance(row, dict):
                continue
            location = str(row.get("location") or "")[:120]
            PtConfig.objects.create(
                config=config, location=location, work_location=location,
                pt_number=str(row.get("ptNumber") or "")[:40],
                state=str(row.get("state") or "")[:60],
                deduction_cycle=str(row.get("cycle") or "MONTHLY")[:20],
                applicable=bool(row.get("applicable")))

    lwf_rows = statutory.get("labourWelfareFund")
    if isinstance(lwf_rows, list):
        config.lwf_configs.all().delete()
        for row in lwf_rows:
            if not isinstance(row, dict):
                continue
            LwfConfig.objects.create(
                config=config,
                state=str(row.get("state") or "")[:60],
                min_amount=_num(row.get("minAmount")) or 0,
                max_amount=_num(row.get("maxAmount")),
                employee_share=_num(row.get("employeeShare")) or 0,
                employer_share=_num(row.get("employerShare")) or 0,
                deduction_cycle=str(row.get("cycle") or "HALF_YEARLY")[:20],
                applicable=bool(row.get("applicable", row.get("enabled"))),
                status_enabled=bool(row.get("enabled", True)))

    bonus = statutory.get("statutoryBonus") or {}
    if bonus:
        obj, _ = BonusConfig.objects.get_or_create(config=config)
        obj.payment_cycle = str(bonus.get("paymentCycle") or "YEARLY")[:20]
        obj.bonus_pct = _num(bonus.get("percentage")) or 0
        obj.save()
        states = bonus.get("minWageStates")
        if isinstance(states, list):
            config.bonus_min_wages.all().delete()
            for state in states:
                name = state if isinstance(state, str) else (
                    state.get("state") if isinstance(state, dict) else "")
                if name:
                    BonusStateMinWage.objects.create(config=config, state=str(name)[:60],
                                                     configured=True)

    salary = body.get("salary") or {}
    earnings = salary.get("earnings")
    if isinstance(earnings, list):
        config.earnings.all().delete()
        for order, row in enumerate(earnings):
            if not isinstance(row, dict) or not row.get("name"):
                continue
            SalaryComponent.objects.create(
                config=config, name=str(row["name"])[:80],
                type=str(row.get("type") or "FIXED")[:20],
                calculation_method=str(row.get("calculation") or "FIXED")[:20],
                calc_value=_num(row.get("value")) or 0,
                consider_for_pf=bool(row.get("considerForPf")),
                consider_for_esi=bool(row.get("considerForEsi")),
                sort_order=order)
    deductions = salary.get("deductions")
    if isinstance(deductions, list):
        config.deductions.all().delete()
        for order, row in enumerate(deductions):
            if not isinstance(row, dict) or not row.get("name"):
                continue
            SalaryDeduction.objects.create(
                config=config, name=str(row["name"])[:80],
                statutory=bool(row.get("statutory")),
                frequency="RECURRING" if str(row.get("frequency", "")).lower().startswith("rec") else "ONE_TIME",
                amount=_num(row.get("amount")) or 0, sort_order=order)
    benefits = salary.get("benefits")
    if isinstance(benefits, list):
        config.benefits.all().delete()
        for row in benefits:
            if not isinstance(row, dict) or not row.get("name"):
                continue
            SalaryBenefit.objects.create(
                config=config, name=str(row["name"])[:80],
                frequency=str(row.get("frequency") or "MONTHLY")[:20].upper(),
                amount=_num(row.get("amount")) or 0)
    reimbursements = salary.get("reimbursements")
    if isinstance(reimbursements, list):
        config.reimbursements.all().delete()
        for row in reimbursements:
            if not isinstance(row, dict) or not row.get("name"):
                continue
            SalaryReimbursement.objects.create(
                config=config, name=str(row["name"])[:80],
                max_amount_per_month=_num(row.get("maxAmount")) or 0)

    full_final = salary.get("fullFinal") or {}
    if full_final:
        obj, _ = FfsConfig.objects.get_or_create(config=config)
        leave = full_final.get("leaveEncashment") or {}
        gratuity = full_final.get("gratuityEncashment") or {}
        notice = full_final.get("noticePenalty") or {}
        excess = full_final.get("excessLeaveRecovery") or {}
        assume = full_final.get("assumeDaysRecovery") or {}
        obj.leave_encashment_enabled = bool(leave.get("enabled"))
        obj.leave_encashment_leave_type = str(leave.get("leaveType") or "")[:60]
        obj.leave_encashment_on = str(leave.get("on") or "")[:40]
        obj.leave_encashment_days = leave.get("days") if isinstance(leave.get("days"), int) else None
        obj.leave_encashment_calc_days = str(leave.get("calcDays") or "")[:40]
        obj.leave_encashment_custom = str(leave.get("custom") or "")[:120]
        obj.gratuity_encashment_enabled = bool(gratuity.get("enabled"))
        obj.gratuity_maturity_years = gratuity.get("maturityYears") if isinstance(gratuity.get("maturityYears"), int) else None
        obj.gratuity_maturity_months = gratuity.get("maturityMonths") if isinstance(gratuity.get("maturityMonths"), int) else None
        obj.gratuity_rounding_months = str(gratuity.get("roundingMonths") or "")[:40]
        obj.notice_penalty_enabled = bool(notice.get("enabled"))
        obj.notice_penalty_on = str(notice.get("on") or "")[:40]
        obj.excess_leave_recovery = bool(excess.get("enabled"))
        obj.excess_leave_penalty_on = str(excess.get("on") or "")[:40]
        obj.assume_days = assume.get("days") if isinstance(assume.get("days"), int) else 0
        obj.assume_days_penalty_on = str(assume.get("on") or "")[:40]
        obj.save()

    staff = body.get("staffPortal") or {}
    if staff:
        obj, _ = StaffPortalConfig.objects.get_or_create(config=config)
        obj.portal_access = bool(staff.get("portalAccess", True))
        obj.banner_message = str(staff.get("bannerMessage") or "")[:500]
        obj.banner_till = _date(staff.get("bannerTill"))
        obj.support_contact = str(staff.get("contact") or "")[:120]
        obj.document_visibility = {
            "showDocuments": bool(staff.get("showDocuments")),
            "showSalaryRevision": bool(staff.get("showSalaryRevision")),
        }
        obj.save()

    return payloads._contractor_payroll_config(user)


__all__ = ["_handle_payroll_setup", "payroll_setup"]


@api_view(["GET", "POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def payroll_setup(request):
    """Read (GET) or save (POST) the payroll setup cluster for the organisation."""
    if request.user.role not in ("contractor", "employer", "bss_admin"):
        return Response({"error": "Payroll setup is available to contractors, employers and admins."},
                        status=status.HTTP_403_FORBIDDEN)
    if request.method == "GET":
        return Response({"data": payloads._contractor_payroll_config(request.user)},
                        status=status.HTTP_200_OK)
    body = request.data if isinstance(request.data, dict) else {}
    data = _handle_payroll_setup(request.user, body)
    log_audit(request.user, "UPDATE", "payroll_setup", request.user.id,
              after={"summary": "Updated payroll setup"})
    return Response({"data": data}, status=status.HTTP_200_OK)
