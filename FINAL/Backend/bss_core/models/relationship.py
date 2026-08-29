"""Relationship / hierarchy models: Site, WorkerContractorBinding,
ContractorJob, RozgarRequest. Enforces the E-C-S-W hierarchy."""

from django.db import models

from .auth import User


class Site(models.Model):
    """One row per physical site. Site -> Many-to-One -> Employer.
    One employer can own many sites (employer_id is non-unique). Carries GPS
    coordinates and a site-based QR token."""

    site_name = models.CharField(max_length=120, blank=True)
    site_code = models.CharField(max_length=40, unique=True)
    employer = models.ForeignKey(User, on_delete=models.CASCADE, related_name="sites",
                                 limit_choices_to={"role": "employer"})
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    site_qr_token = models.CharField(max_length=36, unique=True, editable=False)
    location = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=60, blank=True)
    district = models.CharField(max_length=60, blank=True)
    state = models.CharField(max_length=60, blank=True)
    pincode = models.CharField(max_length=10, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "site"

    def save(self, *args, **kwargs):
        if not self.site_qr_token:
            import uuid
            self.site_qr_token = str(uuid.uuid4())
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.site_code} ({self.site_name})"


class WorkerContractorBinding(models.Model):
    """Links worker <-> contractor <-> site. Drives RBAC binding_scope.
    One worker = one ACTIVE site (partial unique index). Employer derived via site."""

    STATUS = [("PENDING", "Pending"), ("ACCEPTED", "Accepted"),
              ("REJECTED", "Rejected"), ("CANCELLED", "Cancelled"), ("EXPIRED", "Expired")]
    CONSENT_METHOD = [("app", "App"), ("ivr", "IVR"), ("sms_otp", "SMS OTP"), ("voice", "Voice")]

    worker = models.ForeignKey(User, on_delete=models.CASCADE, related_name="worker_bindings",
                               limit_choices_to={"role": "worker"})
    contractor = models.ForeignKey(User, on_delete=models.CASCADE, related_name="contractor_bindings",
                                   limit_choices_to={"role": "contractor"})
    site = models.ForeignKey(Site, on_delete=models.CASCADE, related_name="bindings")
    binding_status = models.CharField(max_length=20, choices=STATUS, default="PENDING")
    consent_worker = models.BooleanField(default=False)
    consent_contractor = models.BooleanField(default=False)
    consent_method = models.CharField(max_length=20, choices=CONSENT_METHOD, null=True, blank=True)
    accepted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "worker_contractor_binding"
        constraints = [
            models.UniqueConstraint(
                fields=["worker", "contractor", "site"], name="uq_binding_ecsw_tuple"
            ),
        ]
        indexes = [
            models.Index(fields=["contractor"], name="idx_binding_contractor"),
            models.Index(fields=["worker"], name="idx_binding_worker"),
        ]

    @property
    def employer(self):
        return self.site.employer

    def __str__(self):
        return f"W{self.worker_id}-C{self.contractor_id}-S{self.site_id}"


class ContractorJob(models.Model):
    """A job posting by a contractor, optionally scoped to a site."""

    contractor = models.ForeignKey(User, on_delete=models.CASCADE, related_name="jobs",
                                   limit_choices_to={"role": "contractor"})
    site = models.ForeignKey(Site, on_delete=models.SET_NULL, null=True, blank=True, related_name="jobs")
    job_title = models.CharField(max_length=120)
    job_description = models.CharField(max_length=500, blank=True)
    wage_offered = models.CharField(max_length=60, blank=True)
    start_date = models.DateField(null=True, blank=True)
    validity_until = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "contractor_job"

    def __str__(self):
        return self.job_title


class RozgarRequest(models.Model):
    """Worker -> job application / request (Rozgar & Request flow)."""

    STATUS = [("PENDING", "Pending"), ("ACCEPTED", "Accepted"), ("REJECTED", "Rejected"),
              ("CANCELLED", "Cancelled"), ("EXPIRED", "Expired")]

    job = models.ForeignKey(ContractorJob, on_delete=models.CASCADE, related_name="requests")
    contractor = models.ForeignKey(User, on_delete=models.CASCADE, related_name="rozgar_requests")
    worker = models.ForeignKey(User, on_delete=models.CASCADE, related_name="rozgar_applications")
    status = models.CharField(max_length=20, choices=STATUS, default="PENDING")
    requested_at = models.DateTimeField(auto_now_add=True)
    responded_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    notes = models.CharField(max_length=500, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "rozgar_request"

    def __str__(self):
        return f"{self.worker_id} -> {self.job_id} ({self.status})"
