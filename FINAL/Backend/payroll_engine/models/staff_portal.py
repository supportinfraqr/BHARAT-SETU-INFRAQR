"""Port of ``models/payroll/staffPortal.js`` (schema ``StaffPortal``). No hooks.

``webTabs`` elements carry an ``"_id"`` (``new_subdoc_id()``) — the legacy controller
addresses them with ``webTabs.id(tabId)`` / ``webTabs.pull(tabId)``. ``isVisible`` defaults
to ``true`` (applied on ``save()``; ``new_web_tab()`` builds one).
"""

from django.db import models

from .base import NO, Arr, DocModel, Obj, new_subdoc

# staffPortal.js L15-21
WEB_TAB = Obj(title=NO, url=NO, isVisible=True)


def new_web_tab(**values):
    return new_subdoc(WEB_TAB, **values)


class StaffPortal(DocModel):
    enable_portal_access = models.BooleanField(default=False)
    banner_message = models.TextField(blank=True, default="")
    banner_end_date = models.DateTimeField(null=True, blank=True)
    portal_contact_email = models.CharField(max_length=255, blank=True, default="")
    web_tabs = models.JSONField(default=list, blank=True)

    JSON_SCHEMAS = {"web_tabs": Arr(WEB_TAB)}

    DOC_FIELDS = {
        "enablePortalAccess": "enable_portal_access", "bannerMessage": "banner_message",
        "bannerEndDate": "banner_end_date", "portalContactEmail": "portal_contact_email",
        "webTabs": "web_tabs",
    }

    class Meta:
        db_table = "pe_staff_portal"
