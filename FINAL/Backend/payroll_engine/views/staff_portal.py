"""Port of ``controller/payroll/staffPortal.js``.

Staff-portal settings (single document per org), its ``webTabs`` sub-document array
and per-employee UI preferences.
"""

from django.db import transaction

from ..context import PayrollError, by_method, get_employee, payroll_view, send_response
from ..models import EmployeePreferences, StaffPortal
from ..models.staff_portal import new_web_tab
from ..services.audit_log import log_payroll_action
from ..services.financial_year import _to_instant


def _js_date(value):
    """Mongoose Date cast of a request value (null/'' -> None)."""
    if value is None or value == "":
        return None
    inst = _to_instant(value)
    if inst is None:
        # Mongoose would raise a CastError -> legacy handleError (500).
        raise PayrollError(f'Cast to date failed for value "{value}"', 500)
    return inst


def _audit(ctx, portal, remarks):
    log_payroll_action(ctx, action="compliance_updated", entity_type="compliance",
                       entity_id=str(portal.pk), after_data=portal.to_dict(), remarks=remarks)


@payroll_view(["POST"])
def update_staff_portal_settings(ctx):
    org = ctx.require_org()
    body = ctx.body
    with transaction.atomic():
        portal = StaffPortal.objects.select_for_update().filter(org=org).first()
        if portal is None:
            portal = StaffPortal(org=org)
        # findOneAndUpdate drops ``undefined`` keys: only keys present in the body change.
        if "enablePortalAccess" in body:
            portal.enable_portal_access = bool(body.get("enablePortalAccess"))
        if "bannerMessage" in body:
            portal.banner_message = "" if body.get("bannerMessage") is None else str(body.get("bannerMessage"))
        if "bannerEndDate" in body:
            portal.banner_end_date = _js_date(body.get("bannerEndDate"))
        if "portalContactEmail" in body:
            v = body.get("portalContactEmail")
            portal.portal_contact_email = "" if v is None else str(v)
        portal.save()
    _audit(ctx, portal, "Staff portal settings updated")
    return send_response(200, True, "Staff portal settings updated successfully", portal.to_dict())


@payroll_view(["GET"], access="any")
def get_staff_portal_settings(ctx):
    org = ctx.require_org()
    portal = StaffPortal.objects.filter(org=org).first()
    return send_response(200, True, "Staff portal settings fetched successfully",
                         portal.to_dict() if portal else {})


@payroll_view(["POST"])
def add_web_tab(ctx):
    org = ctx.require_org()
    body = ctx.body
    title, url, is_visible = body.get("title"), body.get("url"), body.get("isVisible", None)
    if not title or not url:
        raise PayrollError("Title and URL are required", 400)
    with transaction.atomic():
        portal = StaffPortal.objects.select_for_update().filter(org=org).first()
        if portal is None:
            portal = StaffPortal(org=org, web_tabs=[])
        tabs = list(portal.web_tabs or [])
        tabs.append(new_web_tab(title=title, url=url,
                                isVisible=is_visible if "isVisible" in body else True))
        portal.web_tabs = tabs
        portal.save()
    _audit(ctx, portal, f"Staff portal web tab added: {title}")
    return send_response(200, True, "Web tab added successfully", portal.to_dict())


@payroll_view(["PUT"])
def update_web_tab(ctx, tabId):
    org = ctx.require_org()
    body = ctx.body
    with transaction.atomic():
        portal = StaffPortal.objects.select_for_update().filter(org=org).first()
        if portal is None:
            raise PayrollError("Staff portal not found", 404)
        tabs = list(portal.web_tabs or [])
        tab = next((t for t in tabs if str(t.get("_id")) == str(tabId)), None)
        if tab is None:
            raise PayrollError("Web tab not found", 404)
        for key in ("title", "url", "isVisible"):
            if key in body:
                tab[key] = body.get(key)
        portal.web_tabs = tabs
        portal.save()
    _audit(ctx, portal, f"Staff portal web tab updated: {tabId}")
    return send_response(200, True, "Web tab updated successfully", portal.to_dict())


@payroll_view(["DELETE"])
def delete_web_tab(ctx, tabId):
    org = ctx.require_org()
    with transaction.atomic():
        portal = StaffPortal.objects.select_for_update().filter(org=org).first()
        if portal is None:
            raise PayrollError("Staff portal not found", 404)
        # ``webTabs.pull(tabId)`` — silently a no-op when the id is absent.
        portal.web_tabs = [t for t in (portal.web_tabs or []) if str(t.get("_id")) != str(tabId)]
        portal.save()
    _audit(ctx, portal, f"Staff portal web tab deleted: {tabId}")
    return send_response(200, True, "Web tab deleted successfully", portal.to_dict())


@payroll_view(["GET"], access="any")
def get_all_web_tabs(ctx):
    org = ctx.require_org()
    portal = StaffPortal.objects.filter(org=org).first()
    return send_response(200, True, "Web tabs fetched successfully",
                         (portal.web_tabs if portal else None) or [])


@payroll_view(["PUT"], access="any")
def update_employee_preferences(ctx, employeeId):
    org = ctx.require_org()
    emp = get_employee(ctx, employeeId)
    body = ctx.body
    email_n = body.get("emailNotifications", None)
    sms_n = body.get("smsNotifications", None)
    values = {
        "language": body.get("language") or "en",
        "date_format": body.get("dateFormat") or "DD/MM/YYYY",
        "time_zone": body.get("timeZone") or "UTC",
        "email_notifications": email_n if "emailNotifications" in body else True,
        "sms_notifications": sms_n if "smsNotifications" in body else False,
        "theme": body.get("theme") or "light",
    }
    with transaction.atomic():
        prefs = (EmployeePreferences.objects.select_for_update()
                 .filter(org=org, employee=emp).first())
        if prefs is None:
            prefs = EmployeePreferences(org=org, employee=emp)
        for attr, value in values.items():
            setattr(prefs, attr, value)
        prefs.save()
    return send_response(200, True, "Employee preferences updated successfully", prefs.to_dict())


@payroll_view(["GET"], access="any")
def get_employee_preferences(ctx, employeeId):
    org = ctx.require_org()
    emp = get_employee(ctx, employeeId)
    prefs = EmployeePreferences.objects.filter(org=org, employee=emp).first()
    return send_response(200, True, "Employee preferences fetched successfully",
                         prefs.to_dict() if prefs else {})


ROUTES = [
    ("staffPortal/settings", by_method(post=update_staff_portal_settings,
                                       get=get_staff_portal_settings), "staff_portal_settings"),
    ("staffPortal/webTab", add_web_tab, "staff_portal_add_web_tab"),
    ("staffPortal/webTab/<str:tabId>", by_method(put=update_web_tab, delete=delete_web_tab),
     "staff_portal_web_tab"),
    ("staffPortal/webTabs", get_all_web_tabs, "staff_portal_web_tabs"),
    ("staffPortal/preferences/<str:employeeId>",
     by_method(put=update_employee_preferences, get=get_employee_preferences),
     "staff_portal_preferences"),
]
