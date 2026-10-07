"""Onboarding (Plan A, "secure channel") quarantine models.

An employer submits historical worker/site/contractor data through an
authenticated portal upload. The data is held in an isolated **quarantine**
(the two models below) and never becomes part of BSS data assets — nothing is
written to ``User`` / profiles / identities / bindings — until the pipeline
completes: admin review → quarantine → automated cleaning → staff structuring →
employer approval → migration.
"""

from django.conf import settings
from django.db import models


class OnboardingBatch(models.Model):
    """One employer/admin historical-data submission moving through Plan A."""

    SOURCES = [
        ("EMPLOYER_UPLOAD", "Employer upload"),
        ("ADMIN_UPLOAD", "Admin upload"),
        ("SAP", "SAP integration"),
    ]
    STATES = [
        ("SUBMITTED", "Submitted"),
        ("QUARANTINED", "Admin approved / in quarantine"),
        ("CLEANED", "Cleaned"),
        ("STRUCTURED", "Structured"),
        ("APPROVED", "Employer approved"),
        ("MIGRATED", "Migrated to BSS assets"),
        ("REJECTED", "Rejected"),
        ("FAILED", "Failed"),
    ]

    source = models.CharField(max_length=20, choices=SOURCES, default="EMPLOYER_UPLOAD")
    employer = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True,
                                 on_delete=models.SET_NULL,
                                 related_name="onboarding_batches_as_employer")
    submitted_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True,
                                     on_delete=models.SET_NULL,
                                     related_name="onboarding_batches_submitted")
    state = models.CharField(max_length=20, choices=STATES, default="SUBMITTED", db_index=True)

    # Original submission artifact + integrity hash.
    file_name = models.CharField(max_length=255, blank=True)
    original_file = models.FileField(upload_to="onboarding/%Y/%m/", blank=True, null=True)
    file_checksum = models.CharField(max_length=64, blank=True)

    # Employer data-sharing consent/declaration (required before admin review).
    consent_given = models.BooleanField(default=False)
    consent_at = models.DateTimeField(null=True, blank=True)
    consent_version = models.CharField(max_length=40, blank=True)
    declaration = models.TextField(blank=True)

    counts = models.JSONField(default=dict, blank=True)

    # Admin review (step 2 of the workflow).
    reviewed_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True,
                                    on_delete=models.SET_NULL,
                                    related_name="onboarding_batches_reviewed")
    reviewed_at = models.DateTimeField(null=True, blank=True)
    review_note = models.TextField(blank=True)

    # Employer restricted-view approval (steps 6-7).
    employer_reviewed_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True,
                                             on_delete=models.SET_NULL,
                                             related_name="onboarding_batches_employer_reviewed")
    employer_reviewed_at = models.DateTimeField(null=True, blank=True)
    employer_review_note = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "onboarding_batch"
        indexes = [models.Index(fields=["state", "source"], name="idx_onboarding_batch_state"),
                   models.Index(fields=["employer"], name="idx_onboarding_batch_employer")]

    def __str__(self):
        return f"OnboardingBatch #{self.pk} {self.source} {self.state}"


class OnboardingRecord(models.Model):
    """One staged (quarantined) row of an onboarding submission."""

    ENTITY_TYPES = [
        ("EMPLOYER", "Employer"),
        ("CONTRACTOR", "Contractor"),
        ("WORKER", "Worker"),
        ("SITE", "Site"),
        ("RELATION", "Relation"),
    ]
    STATUSES = [
        ("PENDING", "Pending"),
        ("OK", "OK"),
        ("FLAGGED", "Flagged"),
        ("REJECTED", "Rejected"),
        ("MIGRATED", "Migrated"),
    ]

    batch = models.ForeignKey(OnboardingBatch, on_delete=models.CASCADE, related_name="records")
    entity_type = models.CharField(max_length=20, choices=ENTITY_TYPES)
    row_index = models.PositiveIntegerField(default=0)
    raw_data = models.JSONField(default=dict, blank=True)
    clean_data = models.JSONField(default=dict, blank=True)
    issues = models.JSONField(default=list, blank=True)
    status = models.CharField(max_length=20, choices=STATUSES, default="PENDING")

    # Planned/linked live entity (set during structuring; applied at migration).
    matched_type = models.CharField(max_length=20, blank=True)
    matched_id = models.IntegerField(null=True, blank=True)
    result = models.JSONField(default=dict, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "onboarding_record"
        constraints = [models.UniqueConstraint(
            fields=["batch", "entity_type", "row_index"], name="uq_onboarding_record_row")]
        indexes = [models.Index(fields=["batch", "entity_type"], name="idx_onboarding_record_batch")]

    def __str__(self):
        return f"OnboardingRecord #{self.pk} {self.entity_type}#{self.row_index}"
