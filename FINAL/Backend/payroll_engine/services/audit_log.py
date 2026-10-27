"""Port of ``logPayrollAction`` (controller/payroll/auditLog.js).

Legacy defined the writer but no controller ever called it, so the legacy audit
screens were always empty. The port calls it from every payroll mutation (BSS
auditing requirement); the stored document shape is the legacy one.
Never raises — auditing must not break a payroll mutation (legacy swallowed
errors the same way).
"""

import logging

logger = logging.getLogger("payroll_engine")


def log_payroll_action(ctx=None, *, action, entity_type, entity_id="", org=None,
                       affected_employee=None, before_data=None, after_data=None,
                       payroll_details=None, remarks=""):
    """Record one audit entry.

    ``action`` / ``entity_type`` must be values from ``models.payroll_audit_log``
    ``AUDIT_ACTIONS`` / ``AUDIT_ENTITY_TYPES``. ``ctx`` (PayrollContext) supplies
    org, performer, IP and user agent; pass ``org`` instead for system jobs
    (auto payroll). ``affected_employee`` is a PayrollEmployee or None.
    """
    from ..models import PayrollAuditLog

    try:
        request = getattr(getattr(ctx, "request", None), "_request", None)
        org = org or getattr(ctx, "org", None)
        if org is None:
            return None
        meta = getattr(request, "META", {}) if request is not None else {}
        forwarded = (meta.get("HTTP_X_FORWARDED_FOR") or "").split(",")[0].strip()
        log = PayrollAuditLog(
            org=org,
            action=action,
            entity_type=entity_type,
            entity_id=str(entity_id or "")[:64],
            performed_by=ctx.actor_id if ctx is not None else "",
            performed_by_name=ctx.actor_name if ctx is not None else "System (auto payroll)",
            affected_employee=affected_employee,
            affected_employee_name=(affected_employee.full_name if affected_employee is not None else ""),
            before_data=before_data,
            after_data=after_data,
            ip_address=(forwarded or meta.get("REMOTE_ADDR") or "")[:64],
            user_agent=meta.get("HTTP_USER_AGENT", "") or "",
            remarks=remarks or "",
        )
        if payroll_details:
            log.payroll_details = {**(log.payroll_details or {}), **payroll_details}
        log.save()
        return log
    except Exception:  # noqa: BLE001
        logger.exception("Failed to log payroll action")
        return None
