"""Uploaded evidence / compliance documents submitted through the portal
multipart `/submissions` flow. Replaces the previous in-memory random-id
behaviour so uploads survive restarts and can be downloaded back."""

from django.db import models

from .auth import User


class SubmissionEvidence(models.Model):
    STATUS = [
        ("PENDING", "Pending review"),
        ("VERIFIED", "Verified"),
        ("RETURNED", "Returned"),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="submissions")
    role = models.CharField(max_length=20, default="worker")
    doc_type = models.CharField(max_length=200, blank=True)
    site = models.CharField(max_length=200, blank=True)
    period = models.CharField(max_length=200, blank=True)
    employer = models.CharField(max_length=200, blank=True)
    # Compliance-submission package metadata (Client → State → FY → Month → Site → Location).
    state = models.CharField(max_length=60, blank=True)
    financial_year = models.CharField(max_length=12, blank=True)
    month = models.CharField(max_length=20, blank=True)
    location = models.CharField(max_length=120, blank=True)
    # Document master attributes for this evidence row.
    document_type = models.CharField(max_length=40, blank=True)
    frequency = models.CharField(max_length=40, blank=True)
    is_mandatory = models.BooleanField(default=False)
    unique_no = models.CharField(max_length=60, blank=True)
    due_date = models.DateField(null=True, blank=True)
    file = models.FileField(upload_to="submissions/%Y/%m/")
    original_name = models.CharField(max_length=255, blank=True)
    file_size = models.BigIntegerField(default=0)
    mime_type = models.CharField(max_length=120, blank=True)
    checksum_sha256 = models.CharField(max_length=64, blank=True)
    ocr_accuracy = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    validation_findings = models.JSONField(default=list, blank=True)
    status = models.CharField(max_length=20, choices=STATUS, default="PENDING")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "submission_evidence"
        indexes = [models.Index(fields=["user", "status"], name="idx_submission_user")]
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.role}/{self.original_name}"