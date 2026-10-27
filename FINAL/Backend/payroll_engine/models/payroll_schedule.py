"""Port of ``models/payroll/payrollSchedule.js`` (schema ``PayrollSchedule``). No hooks.

``workingDays`` is an array of day-name strings. ``upcomingPayrolls`` elements carry an
``"_id"`` (``new_subdoc_id()``); ``payDate`` inside them is an ISO string.
"""

from django.db import models

from .base import NO, Arr, DocModel, Obj, new_subdoc

PAY_FREQUENCIES = ["monthly", "bi-weekly", "weekly", "semi-monthly"]
WEEK_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

# payrollSchedule.js L46-51
UPCOMING_PAYROLL = Obj(period=NO, payDate=NO)


def new_upcoming_payroll(**values):
    return new_subdoc(UPCOMING_PAYROLL, **values)


class PayrollSchedule(DocModel):
    pay_frequency = models.CharField(max_length=16, choices=[(c, c) for c in PAY_FREQUENCIES],
                                     default="monthly")
    working_days = models.JSONField(default=list, blank=True)
    pay_day = models.CharField(max_length=16, default="7")
    first_pay_period = models.DateTimeField(null=True, blank=True)          # required
    upcoming_payrolls = models.JSONField(default=list, blank=True)
    status = models.CharField(max_length=16, choices=[("active", "active"),
                                                      ("inactive", "inactive")],
                              default="active")
    auto_process_enabled = models.BooleanField(default=True)
    auto_process_time = models.CharField(max_length=8, default="13:00")
    last_auto_run_at = models.DateTimeField(null=True, blank=True, default=None)
    last_auto_run_key = models.CharField(max_length=32, blank=True, default="")
    last_auto_run_status = models.CharField(max_length=32, blank=True, default="")
    last_auto_run_message = models.TextField(blank=True, default="")
    created_by = models.CharField(max_length=64, blank=True, default="")

    TRIM_FIELDS = ("auto_process_time",)
    JSON_SCHEMAS = {"working_days": Arr(), "upcoming_payrolls": Arr(UPCOMING_PAYROLL)}

    DOC_FIELDS = {
        "payFrequency": "pay_frequency", "workingDays": "working_days", "payDay": "pay_day",
        "firstPayPeriod": "first_pay_period", "upcomingPayrolls": "upcoming_payrolls",
        "status": "status", "autoProcessEnabled": "auto_process_enabled",
        "autoProcessTime": "auto_process_time", "lastAutoRunAt": "last_auto_run_at",
        "lastAutoRunKey": "last_auto_run_key", "lastAutoRunStatus": "last_auto_run_status",
        "lastAutoRunMessage": "last_auto_run_message", "createdBy": "created_by",
    }

    class Meta:
        db_table = "pe_payroll_schedule"
        indexes = [models.Index(fields=["org", "status"], name="idx_pe_sched_org_status")]
