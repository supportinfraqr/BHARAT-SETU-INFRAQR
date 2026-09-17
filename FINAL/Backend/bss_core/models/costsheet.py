"""Universal worker cost sheet templates.

A cost sheet template carries the platform-locked statutory rules and the
minimum-wage link for a (state, industry, worker category, designation), plus
org-configurable custom cost lines. It drives the worker's wage, statutory
components, employer cost and CTC — replacing manual wage entry at binding.

Reference: ``Requirements/BSS_Cost sheet template_flows.docx``.
"""

from django.db import models

from .auth import User
from .compliance import MinimumWage


class CostSheetTemplate(models.Model):
    """One cost sheet template (platform universal, or an org's customised copy)."""

    TYPE = [("UNIVERSAL", "Universal"), ("STATE", "State-specific"),
            ("INDUSTRY", "Industry-specific"), ("SITE", "Site-specific")]
    APPLIES_TO = [("employer", "Employer"), ("contractor", "Contractor"), ("both", "Both")]
    STATUS = [("DRAFT", "Draft"), ("COMPLIANCE", "Compliance review"),
              ("FINANCE", "Finance review"), ("PUBLISHED", "Published"),
              ("ARCHIVED", "Archived")]
    FREQ = [("MONTHLY", "Monthly"), ("DAILY", "Daily"), ("PER_SHIFT", "Per-shift")]

    name = models.CharField(max_length=160)
    code = models.CharField(max_length=60, unique=True)
    template_type = models.CharField(max_length=20, choices=TYPE, default="UNIVERSAL")
    applies_to = models.CharField(max_length=20, choices=APPLIES_TO, default="both")
    industry = models.CharField(max_length=120, blank=True)
    state = models.CharField(max_length=60, blank=True)  # "" = All India
    effective_date = models.DateField(null=True, blank=True)
    effective_to = models.DateField(null=True, blank=True)
    worker_category = models.CharField(max_length=60, blank=True)
    designation = models.CharField(max_length=80, blank=True)
    currency = models.CharField(max_length=10, default="INR")
    calculation_frequency = models.CharField(max_length=20, choices=FREQ, default="MONTHLY")
    inherits_parent_rules = models.BooleanField(default=True)
    parent = models.ForeignKey("self", on_delete=models.SET_NULL, null=True, blank=True,
                               related_name="children")
    superseded_by = models.ForeignKey("self", on_delete=models.SET_NULL, null=True, blank=True,
                                      related_name="supersedes")
    owner = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                              related_name="cost_sheet_templates")
    status = models.CharField(max_length=20, choices=STATUS, default="DRAFT")
    version = models.PositiveIntegerField(default=1)
    notes = models.CharField(max_length=500, blank=True)
    details = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "cost_sheet_template"
        indexes = [models.Index(fields=["state", "industry"], name="idx_cost_sheet_scope"),
                   models.Index(fields=["status"], name="idx_cost_sheet_status")]

    def __str__(self):
        return f"{self.code} {self.name}"


class CostSheetDesignation(models.Model):
    """A worker category → sub-category → designation the template applies to."""

    template = models.ForeignKey(CostSheetTemplate, on_delete=models.CASCADE,
                                 related_name="designations")
    worker_category = models.CharField(max_length=60, blank=True)
    sub_category = models.CharField(max_length=80, blank=True)
    designation = models.CharField(max_length=80)
    inherits_parent_rules = models.BooleanField(default=True)
    sort_order = models.SmallIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "cost_sheet_designation"
        ordering = ["sort_order", "id"]

    def __str__(self):
        return self.designation


class CostSheetMinimumWage(models.Model):
    """The statutory minimum-wage link for a template (read-only, statutory)."""

    template = models.ForeignKey(CostSheetTemplate, on_delete=models.CASCADE,
                                 related_name="minimum_wages")
    minimum_wage = models.ForeignKey(MinimumWage, on_delete=models.SET_NULL, null=True, blank=True,
                                     related_name="cost_sheets")
    state = models.CharField(max_length=60, blank=True)
    zone = models.CharField(max_length=40, blank=True)
    district = models.CharField(max_length=60, blank=True)
    scheduled_employment = models.CharField(max_length=120, blank=True)
    worker_category = models.CharField(max_length=60, blank=True)
    basic_wage = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    vda = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    minimum_monthly_wage = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    minimum_daily_wage = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    notification_number = models.CharField(max_length=80, blank=True)
    effective_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "cost_sheet_minimum_wage"

    def __str__(self):
        return f"MW {self.state} {self.zone}"


class CostSheetStatutoryLine(models.Model):
    """A statutory component rule (rate comes from the statutory master, locked)."""

    COMPONENT = [("EPF", "EPF (Employer PF)"), ("EPS", "EPS"), ("EDLI", "EDLI"),
                 ("ESIC", "ESIC (Employer)"), ("BONUS", "Bonus"), ("GRATUITY", "Gratuity"),
                 ("LWF", "Labour Welfare Fund"), ("LEAVE_RESERVE", "Leave Reserve"),
                 ("WEEKLY_OFF", "Weekly Off"), ("NATIONAL_HOLIDAYS", "National Holidays")]
    RATE_TYPE = [("PERCENT", "Percent of wages"), ("FIXED", "Fixed"), ("DAYS", "Days")]

    template = models.ForeignKey(CostSheetTemplate, on_delete=models.CASCADE,
                                 related_name="statutory_lines")
    component = models.CharField(max_length=30, choices=COMPONENT)
    rate = models.DecimalField(max_digits=8, decimal_places=4, default=0)
    rate_type = models.CharField(max_length=10, choices=RATE_TYPE, default="PERCENT")
    applicable = models.BooleanField(default=True)
    condition = models.CharField(max_length=160, blank=True)
    mandatory = models.BooleanField(default=True)
    sort_order = models.SmallIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "cost_sheet_statutory_line"
        ordering = ["sort_order", "id"]

    def __str__(self):
        return f"{self.component} {self.rate}"


class CostSheetCustomLine(models.Model):
    """An org-configurable (or platform-fixed) custom cost head."""

    FREQ = [("ONE_TIME", "One-time"), ("MONTHLY", "Monthly"), ("ANNUAL", "Annual")]
    APPLIES_TO = [("employer", "Employer"), ("contractor", "Contractor"), ("both", "Both")]
    RATE_TYPE = [("FIXED", "Fixed"), ("PERCENT", "Percent")]

    template = models.ForeignKey(CostSheetTemplate, on_delete=models.CASCADE,
                                 related_name="custom_lines")
    name = models.CharField(max_length=80)
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    rate_type = models.CharField(max_length=10, choices=RATE_TYPE, default="FIXED")
    frequency = models.CharField(max_length=12, choices=FREQ, default="MONTHLY")
    applies_to = models.CharField(max_length=20, choices=APPLIES_TO, default="both")
    editable_by_org = models.BooleanField(default=True)
    sort_order = models.SmallIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "cost_sheet_custom_line"
        ordering = ["sort_order", "id"]

    def __str__(self):
        return self.name
