"""Port of ``models/autoPayrollRegistryModel.js`` (model ``AutoPayrollRegistry``).

Legacy: a *main-DB* (cross-org) light copy of each org's Pay Schedule that the
minute-cron scans; the tenant DB is opened only on a match
(``utils/payroll/autoPayrollRunner.js`` ``syncAutoPayrollRegistry`` upserts by
``org_uuid``). So this is a ``GlobalDocModel`` (no ``org`` FK, no ``organizationId`` in
``to_dict()``); ``org_uuid`` stores the payroll org's BSS user id as a string, unique.
``upcomingPayrolls`` elements carry ``"_id"`` (``new_subdoc_id()``) like legacy.
"""

from django.db import models

from .base import NO, Arr, GlobalDocModel, Obj

PAY_FREQUENCIES = ["monthly", "bi-weekly", "weekly", "semi-monthly"]
UPCOMING_PAYROLL = Obj(period=NO, payDate=NO)


class AutoPayrollRegistry(GlobalDocModel):
    org_uuid = models.CharField(max_length=64, unique=True)                  # required
    organization_name = models.CharField(max_length=255, blank=True, default="")
    status = models.CharField(max_length=16, choices=[("active", "active"),
                                                      ("inactive", "inactive")],
                              default="active")
    auto_process_enabled = models.BooleanField(default=True)
    auto_process_time = models.CharField(max_length=8, default="13:00")
    pay_frequency = models.CharField(max_length=16, choices=[(c, c) for c in PAY_FREQUENCIES],
                                     default="monthly")
    pay_day = models.CharField(max_length=16, default="7")
    first_pay_period = models.DateTimeField(null=True, blank=True, default=None)
    upcoming_payrolls = models.JSONField(default=list, blank=True)
    last_auto_run_key = models.CharField(max_length=32, blank=True, default="")

    JSON_SCHEMAS = {"upcoming_payrolls": Arr(UPCOMING_PAYROLL)}

    DOC_FIELDS = {
        "org_uuid": "org_uuid", "organizationName": "organization_name", "status": "status",
        "autoProcessEnabled": "auto_process_enabled", "autoProcessTime": "auto_process_time",
        "payFrequency": "pay_frequency", "payDay": "pay_day",
        "firstPayPeriod": "first_pay_period", "upcomingPayrolls": "upcoming_payrolls",
        "lastAutoRunKey": "last_auto_run_key",
    }

    class Meta:
        db_table = "pe_auto_payroll_registry"
