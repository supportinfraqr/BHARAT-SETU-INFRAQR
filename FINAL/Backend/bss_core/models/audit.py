"""Monthly contractor audit jobs and per-site run limits."""

import uuid

from django.db import models

from .auth import User
from .relationship import Site


class AuditSchedule(models.Model):
    """Per contractor + site monthly audit allowance (no fixed dates)."""

    contractor = models.ForeignKey(User, on_delete=models.CASCADE, related_name="audit_schedules",
                                   limit_choices_to={"role": "contractor"})
    site = models.ForeignKey(Site, on_delete=models.CASCADE, related_name="audit_schedules")
    runs_per_month = models.PositiveSmallIntegerField(default=2)
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                                   related_name="+")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "audit_schedule"
        constraints = [models.UniqueConstraint(fields=["contractor", "site"],
                                               name="uq_audit_schedule_contractor_site")]
        indexes = [models.Index(fields=["contractor", "site"], name="idx_audit_schedule_pair")]

    def __str__(self):
        return f"{self.contractor_id}@{self.site_id}:{self.runs_per_month}/month"


class AuditJob(models.Model):
    """One monthly document audit run for a contractor + site + month."""

    STATUS = [
        ("PENDING", "Pending"),
        ("BUILDING", "Building folder"),
        ("RUNNING", "Running"),
        ("READY", "Ready"),
        ("FAILED", "Failed"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    contractor = models.ForeignKey(User, on_delete=models.CASCADE, related_name="audit_jobs",
                                   limit_choices_to={"role": "contractor"})
    employer = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                                 related_name="audit_jobs_as_employer",
                                 limit_choices_to={"role": "employer"})
    site = models.ForeignKey(Site, on_delete=models.SET_NULL, null=True, blank=True,
                             related_name="audit_jobs")
    month = models.CharField(max_length=20)
    year = models.CharField(max_length=4)
    financial_year = models.CharField(max_length=12, blank=True)
    period_start = models.DateField(null=True, blank=True)
    period_end = models.DateField(null=True, blank=True)
    version = models.PositiveIntegerField(default=1)
    is_current = models.BooleanField(default=True)
    status = models.CharField(max_length=12, choices=STATUS, default="PENDING")
    requested_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                                     related_name="audit_jobs_requested")
    job_dir = models.CharField(max_length=500, blank=True)
    query_count = models.PositiveIntegerField(default=0)
    worker_count = models.PositiveIntegerField(default=0)
    report_html = models.CharField(max_length=500, blank=True)
    report_pdf = models.CharField(max_length=500, blank=True)
    report_xlsx = models.CharField(max_length=500, blank=True)
    report_json = models.CharField(max_length=500, blank=True)
    evidence_json = models.CharField(max_length=500, blank=True)
    summary = models.JSONField(default=dict, blank=True)
    token_usage = models.JSONField(default=dict, blank=True)
    agent_version = models.CharField(max_length=40, blank=True)
    provider = models.CharField(max_length=40, blank=True)
    model = models.CharField(max_length=120, blank=True)
    error_message = models.TextField(blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "audit_job"
        ordering = ["-created_at"]
        constraints = [models.UniqueConstraint(
            fields=["contractor", "site", "month", "year", "version"],
            name="uq_audit_job_version")]
        indexes = [
            models.Index(fields=["contractor", "site"], name="idx_audit_job_pair"),
            models.Index(fields=["status"], name="idx_audit_job_status"),
            models.Index(fields=["month", "year"], name="idx_audit_job_period"),
        ]

    def __str__(self):
        return f"{self.id} {self.contractor_id} {self.month} {self.year}"
