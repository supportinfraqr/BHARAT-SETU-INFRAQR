"""Operational models: attendance (QR/NFC/Camera), wages & payments,
gate passes (TGP/PGP), grievances, and time-bound document tokens."""

from django.db import models
from django.utils import timezone

from .auth import User
from .relationship import Site
from .worker import WorkerDocument


class AttendanceDevice(models.Model):
    """Physical capture hardware bound to a site; capture_type selects method."""

    CAPTURE = [("QR", "QR Scanner"), ("NFC", "NFC Terminal"), ("CAMERA", "Image/Camera")]

    site = models.ForeignKey(Site, on_delete=models.CASCADE, related_name="attendance_devices")
    contractor = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True,
                                   related_name="attendance_devices")
    device_code = models.CharField(max_length=40, unique=True)
    device_name = models.CharField(max_length=120, blank=True)
    capture_type = models.CharField(max_length=20, choices=CAPTURE)
    device_serial = models.CharField(max_length=80, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "attendance_device"
        indexes = [models.Index(fields=["site"], name="idx_att_device_site")]

    def __str__(self):
        return self.device_code


class Attendance(models.Model):
    """One punch/log per attendance event captured by QR, NFC or CAMERA."""

    STATUS = [("PRESENT", "Present"), ("ABSENT", "Absent"), ("LEAVE", "Leave"),
              ("HOLIDAY", "Holiday"), ("EXPECTED", "Expected"), ("LATE", "Late"),
              ("HALF_DAY", "Half Day")]
    CAPTURE = [("QR", "QR"), ("NFC", "NFC"), ("CAMERA", "Camera")]
    VERIFY = [("qr_worker", "QR Worker"), ("qr_site", "QR Site"), ("nfc_card", "NFC Card"),
              ("face_image", "Face Image"), ("badge_image", "Badge Image")]

    worker = models.ForeignKey(User, on_delete=models.CASCADE, related_name="attendance")
    site = models.ForeignKey(Site, on_delete=models.CASCADE, related_name="attendance")
    contractor = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True,
                                   related_name="contractor_attendance")
    device = models.ForeignKey(AttendanceDevice, on_delete=models.SET_NULL, null=True, blank=True,
                               related_name="punches")
    attendance_date = models.DateField(auto_now_add=False)
    check_in_time = models.DateTimeField(null=True, blank=True)
    check_out_time = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS, default="PRESENT")
    capture_method = models.CharField(max_length=20, choices=CAPTURE)
    verification_type = models.CharField(max_length=30, choices=VERIFY, null=True, blank=True)
    image_file = models.CharField(max_length=255, blank=True, null=True)
    confidence_pct = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    gps_lat = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    gps_long = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    is_geofence_ok = models.BooleanField(null=True, blank=True)
    is_verified = models.BooleanField(default=False)
    verified_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                                    related_name="+")
    verified_at = models.DateTimeField(null=True, blank=True)
    remarks = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "attendance"
        indexes = [
            models.Index(fields=["worker", "attendance_date"], name="idx_att_worker_date"),
            models.Index(fields=["site", "attendance_date"], name="idx_att_site_date"),
            models.Index(fields=["contractor"], name="idx_att_contractor"),
        ]

    def __str__(self):
        return f"{self.worker_id} {self.attendance_date} {self.capture_method}"


class WorkerWages(models.Model):
    """Earned wages per worker per pay period (auto from attendance or manual)."""

    FREQ = [("DAILY", "Daily"), ("WEEKLY", "Weekly"), ("MONTHLY", "Monthly"),
            ("PIECE_RATE", "Piece Rate")]
    STATUS = [("DRAFT", "Draft"), ("APPROVED", "Approved"), ("PAID", "Paid"),
              ("CANCELLED", "Cancelled")]

    worker = models.ForeignKey(User, on_delete=models.CASCADE, related_name="wages")
    site = models.ForeignKey(Site, on_delete=models.SET_NULL, null=True, blank=True,
                             related_name="wages")
    contractor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                                   related_name="+")
    period_start = models.DateField()
    period_end = models.DateField()
    wage_frequency = models.CharField(max_length=20, choices=FREQ, default="MONTHLY")
    days_present = models.DecimalField(max_digits=5, decimal_places=1, default=0)
    days_absent = models.DecimalField(max_digits=5, decimal_places=1, default=0)
    daily_wage = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    units_done = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    piece_rate = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    base_wage = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    overtime_hours = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    overtime_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    gross_wage = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    deductions_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    net_wage = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=STATUS, default="DRAFT")
    computed_from_attendance = models.BooleanField(default=False)
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                                    related_name="+")
    approved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "worker_wages"
        constraints = [models.UniqueConstraint(
            fields=["worker", "period_start", "period_end"], name="uq_wages_period")]
        indexes = [
            models.Index(fields=["worker"], name="idx_wages_worker"),
            models.Index(fields=["site"], name="idx_wages_site"),
        ]

    def __str__(self):
        return f"{self.worker_id} {self.period_start}-{self.period_end}"


class WagePayment(models.Model):
    """Actual disbursement of an approved wage record."""

    MODE = [("BANK", "Bank"), ("UPI", "UPI"), ("CASH", "Cash")]

    worker_wages = models.ForeignKey(WorkerWages, on_delete=models.CASCADE, related_name="payments")
    pay_mode = models.CharField(max_length=20, choices=MODE)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    paid_at = models.DateTimeField(auto_now_add=True)
    transaction_ref = models.CharField(max_length=80, blank=True)
    bank_account_last4 = models.CharField(max_length=10, blank=True)
    upi_id = models.CharField(max_length=80, blank=True)
    paid_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                                related_name="+")
    remarks = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "wage_payment"
        indexes = [models.Index(fields=["worker_wages"], name="idx_wage_payment_wages")]

    def __str__(self):
        return f"{self.worker_wages_id} {self.amount} {self.pay_mode}"


class WorkerGatePass(models.Model):
    """Temporary (TGP) / Permanent (PGP) site access permits."""

    TYPE = [("TGP", "Temporary Gate Pass"), ("PGP", "Permanent Gate Pass")]
    STATUS = [("ACTIVE", "Active"), ("EXPIRED", "Expired"), ("REVOKED", "Revoked"),
              ("PENDING", "Pending")]
    SOURCE = [("CONTRACTOR_GATE_PASS", "Contractor Gate Pass"), ("MANUAL", "Manual"),
              ("SYSTEM", "System")]

    worker = models.ForeignKey(User, on_delete=models.CASCADE, related_name="gate_passes")
    site = models.ForeignKey(Site, on_delete=models.CASCADE, null=True, blank=True,
                             related_name="gate_passes")
    gate_pass_type = models.CharField(max_length=20, choices=TYPE)
    gate_pass_no = models.CharField(max_length=40)
    status = models.CharField(max_length=20, choices=STATUS, default="ACTIVE")
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    issued_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                                  related_name="+")
    source = models.CharField(max_length=20, choices=SOURCE, default="CONTRACTOR_GATE_PASS")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "worker_gate_pass"
        constraints = [models.UniqueConstraint(
            fields=["worker", "gate_pass_type", "gate_pass_no"], name="uq_gate_pass")]
        indexes = [
            models.Index(fields=["worker"], name="idx_gate_pass_worker"),
            models.Index(fields=["worker", "gate_pass_type"], name="idx_gate_pass_type"),
        ]

    def __str__(self):
        return f"{self.gate_pass_type} {self.gate_pass_no} {self.status}"


class WorkerGrievance(models.Model):
    """Voice-recorded grievance with full ticket lifecycle (multi-party resolution)."""

    STATUS = [("RECORDED", "Recorded"), ("SUBMITTED", "Submitted"),
              ("VIEWED_ON_DASHBOARD", "Viewed on Dashboard"), ("OPEN", "Open"),
              ("IN_PROGRESS", "In Progress"), ("RESOLVED", "Resolved"),
              ("REOPENED", "Reopened")]
    CATEGORY = [("WAGES", "Wages"), ("SAFETY", "Safety"), ("HARASSMENT", "Harassment"),
                ("ACCOMMODATION", "Accommodation"), ("BENEFITS", "Benefits"),
                ("OTHER", "Other")]

    worker = models.ForeignKey(User, on_delete=models.CASCADE, related_name="grievances")
    ticket_no = models.CharField(max_length=40, unique=True, blank=True)
    category = models.CharField(max_length=20, choices=CATEGORY, default="OTHER")
    language = models.CharField(max_length=40, blank=True)
    recording_file = models.CharField(max_length=255, blank=True)
    recording_duration_secs = models.IntegerField(null=True, blank=True)
    body = models.CharField(max_length=1000, blank=True)
    attachment_file = models.CharField(max_length=255, blank=True)
    assigned_to = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                                    related_name="assigned_grievances")
    status = models.CharField(max_length=30, choices=STATUS, default="RECORDED")
    submitted_at = models.DateTimeField(null=True, blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    reopened_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "worker_grievance"
        indexes = [
            models.Index(fields=["worker"], name="idx_grievance_worker"),
            models.Index(fields=["status"], name="idx_grievance_status"),
            models.Index(fields=["category"], name="idx_grievance_category"),
        ]

    def save(self, *args, **kwargs):
        if not self.ticket_no:
            import secrets
            self.ticket_no = "GV-" + timezone.now().strftime("%Y%m%d") + "-" + secrets.token_hex(3).upper()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.ticket_no} {self.status}"


class GrievanceResponse(models.Model):
    """Reply / resolution entry in a grievance thread (worker/contractor/employer/BSS)."""

    grievance = models.ForeignKey(WorkerGrievance, on_delete=models.CASCADE,
                                  related_name="responses")
    actor_role = models.CharField(max_length=30, blank=True)
    actor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                              related_name="+")
    body = models.CharField(max_length=2000, blank=True)
    attachment_file = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "grievance_response"
        indexes = [models.Index(fields=["grievance"], name="idx_grievance_resp_grievance")]

    def __str__(self):
        return str(self.grievance_id)


class DocumentAccessToken(models.Model):
    """Time-bound / timed tokens for secure document access & verification."""

    TYPE = [("DOCUMENT_VIEW", "Document View"), ("DOCUMENT_VERIFY", "Document Verify"),
            ("DOCUMENT_DOWNLOAD", "Document Download"), ("ONBOARDING", "Onboarding"),
            ("OFFER_LETTER", "Offer Letter")]
    STATUS = [("ACTIVE", "Active"), ("USED", "Used"), ("EXPIRED", "Expired"),
              ("REVOKED", "Revoked")]

    token_type = models.CharField(max_length=30, choices=TYPE)
    document = models.ForeignKey(WorkerDocument, on_delete=models.SET_NULL, null=True, blank=True,
                                 related_name="tokens")
    subject = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True,
                                related_name="subject_tokens")
    requester = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True,
                                  related_name="requested_tokens")
    token_hash = models.CharField(max_length=128, unique=True)
    status = models.CharField(max_length=20, choices=STATUS, default="ACTIVE")
    issued_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)
    max_uses = models.SmallIntegerField(default=1)
    use_count = models.SmallIntegerField(default=0)
    redirect_url = models.CharField(max_length=255, blank=True)
    ip_address = models.CharField(max_length=45, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "document_access_token"
        indexes = [
            models.Index(fields=["token_hash"], name="idx_doc_token_hash"),
            models.Index(fields=["expires_at"], name="idx_doc_token_expiry"),
            models.Index(fields=["document"], name="idx_doc_token_doc"),
        ]

    @property
    def is_valid(self):
        now = timezone.now()
        return (self.status == "ACTIVE" and self.expires_at is not None
                and self.expires_at > now and self.use_count < self.max_uses)

    def __str__(self):
        return f"{self.token_type} {self.status}"
