"""Auto payroll on pay day — port of ``utils/payroll/autoPayrollRunner.js``.

Exported (legacy -> port):
    getTodayParts                      -> get_today_parts
    normalizeAutoProcessTime           -> normalize_auto_process_time
    resolvePeriodFromSchedule          -> resolve_period_from_schedule
    syncAutoPayrollRegistry            -> sync_auto_payroll_registry
    runAutoPayrollForAllOrganizations  -> run_auto_payroll_for_all_organizations
(+ evaluate_row, to_registry_payload, process_matched_org)

Legacy ran every minute and required ``now == autoProcessTime`` (HH:mm). Here
``window_minutes`` widens that to ``autoProcessTime <= now < autoProcessTime + window``
so a coarser cron (the ``run_auto_payroll`` command, every 15 minutes) still fires once;
``window_minutes=1`` is exactly the legacy rule. ``lastAutoRunKey`` (``YYYY-Mon``) keeps
each period idempotent. The legacy "main-DB gate" is ``AutoPayrollRegistry``.
"""

import logging
import os
import re

from django.utils import timezone

from .financial_year import _to_instant
from .jsmath import js_str, js_trim

logger = logging.getLogger("payroll_engine")

MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov",
               "Dec"]


def _zone(time_zone):
    from zoneinfo import ZoneInfo

    return ZoneInfo(time_zone or "Asia/Kolkata")


def get_today_parts(time_zone="Asia/Kolkata", now=None):
    now = now or timezone.now()
    if now.tzinfo is None:
        now = now.replace(tzinfo=_zone(time_zone))
    local = now.astimezone(_zone(time_zone))
    return {
        "year": local.year, "month": local.month, "day": local.day,
        "hour": local.hour, "minute": local.minute,
        "key": f"{local.year}-{local.month:02d}-{local.day:02d}",
        "timeHm": f"{local.hour:02d}:{local.minute:02d}",
    }


def normalize_auto_process_time(value):
    if value is None or js_trim(js_str(value)) == "":
        return "13:00"
    m = re.match(r"^(\d{1,2}):(\d{2})(?::\d{2})?$", js_trim(js_str(value)))
    if not m:
        return "13:00"
    hour = min(23, max(0, int(m.group(1))))
    minute = min(59, max(0, int(m.group(2))))
    return f"{hour:02d}:{minute:02d}"


def _local(value, tz):
    instant = _to_instant(value) if value else None
    return instant.astimezone(tz) if instant is not None else None


def same_calendar_day(date_val, today, tz):
    d = _local(date_val, tz)
    return d is not None and (d.year, d.month, d.day) == (today["year"], today["month"],
                                                          today["day"])


def resolve_period_from_schedule(schedule, today, time_zone="Asia/Kolkata"):
    tz = _zone(time_zone)
    upcoming = schedule.get("upcomingPayrolls")
    upcoming = upcoming if isinstance(upcoming, list) else []
    matched = next((r for r in upcoming if same_calendar_day(r.get("payDate"), today, tz)), None)
    if matched and matched.get("payDate"):
        d = _local(matched["payDate"], tz)
        return {"month": MONTH_SHORT[d.month - 1], "year": d.year,
                "periodLabel": matched.get("period") or f"{MONTH_SHORT[d.month - 1]} {d.year}",
                "source": "upcomingPayrolls"}
    if str(schedule.get("payFrequency") or "monthly") == "monthly":
        m = re.match(r"^\s*[+-]?\d+", js_str(schedule.get("payDay") or "7"))
        pay_day = min(31, max(1, (int(m.group()) if m else 0) or 7))
        if today["day"] == pay_day:
            label = f"{MONTH_SHORT[today['month'] - 1]} {today['year']}"
            return {"month": MONTH_SHORT[today["month"] - 1], "year": today["year"],
                    "periodLabel": label, "source": "monthlyPayDay"}
    return None


def to_registry_payload(org_uuid, schedule_doc, org_name=""):
    oid = str(org_uuid)
    if not schedule_doc:
        return {"org_uuid": oid, "organizationName": org_name or oid, "status": "inactive",
                "autoProcessEnabled": False}
    return {
        "org_uuid": oid,
        "organizationName": org_name or oid,
        "status": "inactive" if schedule_doc.get("status") == "inactive" else "active",
        "autoProcessEnabled": schedule_doc.get("autoProcessEnabled") is not False,
        "autoProcessTime": normalize_auto_process_time(schedule_doc.get("autoProcessTime")),
        "payFrequency": schedule_doc.get("payFrequency") or "monthly",
        "payDay": js_str(schedule_doc.get("payDay") if schedule_doc.get("payDay") is not None
                         else "7"),
        "firstPayPeriod": schedule_doc.get("firstPayPeriod") or None,
        "upcomingPayrolls": [{"period": r.get("period"), "payDate": r.get("payDate")}
                             for r in (schedule_doc.get("upcomingPayrolls") or [])],
        "lastAutoRunKey": schedule_doc.get("lastAutoRunKey") or "",
    }


_REG_ATTRS = {"organizationName": "organization_name", "status": "status",
              "autoProcessEnabled": "auto_process_enabled",
              "autoProcessTime": "auto_process_time", "payFrequency": "pay_frequency",
              "payDay": "pay_day", "firstPayPeriod": "first_pay_period",
              "upcomingPayrolls": "upcoming_payrolls", "lastAutoRunKey": "last_auto_run_key"}


def sync_auto_payroll_registry(org_uuid, schedule_doc, org_name=""):
    """Upsert the registry row for an org from its schedule dict (``to_dict()``)."""
    from ..models import AutoPayrollRegistry

    if not org_uuid:
        return None
    payload = to_registry_payload(org_uuid, schedule_doc, org_name)
    row, _ = AutoPayrollRegistry.objects.get_or_create(org_uuid=str(org_uuid))
    for key, attr in _REG_ATTRS.items():
        if key not in payload:
            continue
        value = payload[key]
        if key == "firstPayPeriod":
            value = _to_instant(value) if value else None
        setattr(row, attr, value)
    row.save()
    return row


def _minutes(hm):
    h, m = hm.split(":")
    return int(h) * 60 + int(m)


def evaluate_row(row, today, window_minutes=1, time_zone="Asia/Kolkata"):
    if not row:
        return {"skipped": True, "reason": "no_schedule"}
    if row.get("status") != "active":
        return {"skipped": True, "reason": "inactive"}
    if row.get("autoProcessEnabled") is False:
        return {"skipped": True, "reason": "auto_disabled"}
    if row.get("firstPayPeriod"):
        first = _local(row["firstPayPeriod"], _zone(time_zone))
        if first is not None:
            first_key = f"{first.year}-{first.month:02d}-{first.day:02d}"
            if today["key"] < first_key:
                return {"skipped": True, "reason": "before_first_period"}
    period = resolve_period_from_schedule(row, today, time_zone)
    if not period:
        return {"skipped": True, "reason": "not_pay_day"}
    run_key = f"{period['year']}-{period['month']}"
    if row.get("lastAutoRunKey") == run_key:
        return {"skipped": True, "reason": "already_auto_run", "period": period["periodLabel"]}
    configured = normalize_auto_process_time(row.get("autoProcessTime"))
    delta = _minutes(today["timeHm"]) - _minutes(configured)
    if not (0 <= delta < max(1, int(window_minutes))):
        return {"skipped": True, "reason": "not_auto_time", "period": period["periodLabel"],
                "configuredTime": configured, "now": today["timeHm"]}
    return {"skipped": False, "period": period, "configuredTime": configured, "runKey": run_key}


def process_matched_org(org_uuid, org_name="", now=None, window_minutes=1):
    from .. import bss_adapter
    from ..models import PayrollSchedule
    from ..views.payroll_run import process_payroll_core
    from ..views.payroll_schedule import generate_upcoming_payrolls

    label = org_name or str(org_uuid)
    tz_name = os.environ.get("TIME_ZONE_PAYROLL") or "Asia/Kolkata"
    today = get_today_parts(tz_name, now)
    try:
        org = bss_adapter.get_org_user(org_uuid)
        schedule = PayrollSchedule.objects.filter(org=org).order_by("created_at").first() \
            if org is not None else None
        if schedule is None:
            sync_auto_payroll_registry(org_uuid, None, label)
            return {"org": label, "skipped": True, "reason": "no_schedule"}
        live = evaluate_row(to_registry_payload(org_uuid, schedule.to_dict(), label), today,
                            window_minutes, tz_name)
        if live["skipped"]:
            sync_auto_payroll_registry(org_uuid, schedule.to_dict(), label)
            return {"org": label, **live}

        period = live["period"]
        logger.info("[AutoPayroll] %s: %s matched -> %s %s", label, live["configuredTime"],
                    period["month"], period["year"])
        bss_adapter.sync_employees(org, force=True)
        status, ok, message, _data = process_payroll_core(
            org, {"month": period["month"], "year": period["year"], "employeeIds": [],
                  "excludeEmployeeIds": []})
        success = ok is True or status == 200

        schedule.last_auto_run_at = timezone.now()
        schedule.last_auto_run_key = live["runKey"]
        schedule.last_auto_run_status = "success" if success else "failed"
        schedule.last_auto_run_message = message or (
            "Auto payroll processed" if success else "Auto payroll failed")
        schedule.save()
        try:
            schedule.upcoming_payrolls = generate_upcoming_payrolls(
                schedule.pay_frequency, schedule.pay_day, schedule.first_pay_period)
            schedule.save()
        except Exception as err:  # noqa: BLE001
            logger.error("[AutoPayroll] %s: upcoming refresh failed %s", label, err)
        sync_auto_payroll_registry(org_uuid, schedule.to_dict(), label)
        return {"org": label, "skipped": False, "success": success,
                "period": period["periodLabel"], "message": message}
    except Exception as err:  # noqa: BLE001
        logger.exception("[AutoPayroll] %s", label)
        return {"org": label, "skipped": False, "success": False, "error": str(err)}


def backfill_registry():
    """Register every org that has a PayrollSchedule but no registry row yet.

    Legacy required the org to "Save Pay Schedule once"; the port also picks up schedules
    created before the registry existed (e.g. imported data)."""
    from .. import bss_adapter
    from ..models import AutoPayrollRegistry, PayrollSchedule

    known = set(AutoPayrollRegistry.objects.values_list("org_uuid", flat=True))
    added = 0
    for schedule in PayrollSchedule.objects.select_related("org").order_by("created_at"):
        oid = str(schedule.org_id)
        if oid in known:
            continue
        sync_auto_payroll_registry(oid, schedule.to_dict(),
                                   bss_adapter.org_profile(schedule.org)["name"])
        known.add(oid)
        added += 1
    return added


def run_auto_payroll_for_all_organizations(now=None, window_minutes=1):
    """Cron entry: registry gate first; the org's data is touched only on a match."""
    from ..models import AutoPayrollRegistry

    tz_name = os.environ.get("TIME_ZONE_PAYROLL") or "Asia/Kolkata"
    today = get_today_parts(tz_name, now)
    summary = []
    for row in AutoPayrollRegistry.objects.order_by("created_at"):
        doc = row.to_dict()
        org_name = doc.get("organizationName") or doc["org_uuid"]
        gate = evaluate_row(doc, today, window_minutes, tz_name)
        if gate["skipped"]:
            summary.append({"org": org_name, **gate})
            continue
        summary.append(process_matched_org(doc["org_uuid"], org_name, now, window_minutes))
    return summary


__all__ = ["get_today_parts", "normalize_auto_process_time", "resolve_period_from_schedule",
           "sync_auto_payroll_registry", "run_auto_payroll_for_all_organizations",
           "evaluate_row", "to_registry_payload", "process_matched_org", "backfill_registry"]
