"""Port of ``models/payroll/employeePreferences.js`` (schema ``EmployeePreferences``)."""

from django.db import models

from .base import DocModel


class EmployeePreferences(DocModel):
    employee = models.ForeignKey("payroll_engine.PayrollEmployee", on_delete=models.CASCADE,
                                 related_name="+")
    language = models.CharField(max_length=8, default="en",
                                choices=[(c, c) for c in ["en", "hi", "es", "fr", "de"]])
    date_format = models.CharField(max_length=16, default="DD/MM/YYYY",
                                   choices=[(c, c) for c in ["DD/MM/YYYY", "MM/DD/YYYY",
                                                             "YYYY-MM-DD"]])
    time_zone = models.CharField(max_length=64, default="UTC")
    email_notifications = models.BooleanField(default=True)
    sms_notifications = models.BooleanField(default=False)
    theme = models.CharField(max_length=8, default="light",
                             choices=[(c, c) for c in ["light", "dark", "auto"]])

    DOC_FIELDS = {
        "employeeId": "employee", "language": "language", "dateFormat": "date_format",
        "timeZone": "time_zone", "emailNotifications": "email_notifications",
        "smsNotifications": "sms_notifications", "theme": "theme",
    }

    class Meta:
        db_table = "pe_employee_preferences"
        indexes = [models.Index(fields=["org", "employee"], name="idx_pe_prefs_org_emp")]
