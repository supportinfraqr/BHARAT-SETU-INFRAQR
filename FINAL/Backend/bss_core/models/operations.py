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
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                                    related_name="+")
    approved_at = models.DateTimeField(null=True, blank=True)
    remarks = models.CharField(max_length=255, blank=True)
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
              ("REOPENED", "Reopened"), ("CLOSED", "Closed")]
    CATEGORY = [("WAGES", "Wages"), ("SAFETY", "Safety"), ("HARASSMENT", "Harassment"),
                ("ACCOMMODATION", "Accommodation"), ("BENEFITS", "Benefits"),
                ("OTHER", "Other")]

    worker = models.ForeignKey(User, on_delete=models.CASCADE, related_name="grievances")
    # Snapshot of the parties at submission time so contractor/employer keep an
    # audit view of the ticket even after the binding ends.
    contractor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                                   related_name="contractor_grievances")
    employer = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                                 related_name="employer_grievances")
    ticket_no = models.CharField(max_length=40, unique=True, blank=True)
    category = models.CharField(max_length=20, choices=CATEGORY, default="OTHER")
    language = models.CharField(max_length=40, blank=True)
    recording_file = models.CharField(max_length=255, blank=True)
    audio = models.FileField(upload_to="worker_grievances/%Y/%m/", blank=True, null=True)
    recording_duration_secs = models.IntegerField(null=True, blank=True)
    body = models.CharField(max_length=1000, blank=True)
    attachment_file = models.CharField(max_length=255, blank=True)
    attachment = models.FileField(upload_to="worker_grievances/%Y/%m/", blank=True, null=True)
    assigned_to = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                                    related_name="assigned_grievances")
    status = models.CharField(max_length=30, choices=STATUS, default="RECORDED")
    submitted_at = models.DateTimeField(null=True, blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    reopened_at = models.DateTimeField(null=True, blank=True)
    resolution_confirmed = models.BooleanField(default=False)
    confirmed_at = models.DateTimeField(null=True, blank=True)
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
    attachment = models.FileField(upload_to="grievance_responses/%Y/%m/", blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "grievance_response"
        indexes = [models.Index(fields=["grievance"], name="idx_grievance_resp_grievance")]

    def __str__(self):
        return str(self.grievance_id)


class GrievanceFileToken(models.Model):
    """Single-use, short-lived token granting one read of a grievance file.

    Files are never exposed as stable URLs: the client asks for a token (after a
    role/visibility check) and exchanges it once at ``/v1/grievances/file/<token>``
    within ``expires_at``. The raw token is stored only as a SHA-256 hash."""

    KIND = [("audio", "Audio recording"), ("attachment", "Attachment")]

    grievance = models.ForeignKey(WorkerGrievance, on_delete=models.CASCADE, related_name="file_tokens")
    response = models.ForeignKey(GrievanceResponse, on_delete=models.CASCADE, null=True, blank=True,
                                 related_name="file_tokens")
    kind = models.CharField(max_length=20, choices=KIND)
    issued_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                                  related_name="issued_grievance_tokens")
    token_hash = models.CharField(max_length=128, unique=True)
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "grievance_file_token"
        indexes = [models.Index(fields=["grievance"], name="idx_gft_grievance")]

    @property
    def is_valid(self):
        return self.used_at is None and self.expires_at > timezone.now()

    def __str__(self):
        return f"{self.grievance_id} {self.kind}"


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
    submission = models.ForeignKey("SubmissionEvidence", on_delete=models.SET_NULL,
                                   null=True, blank=True, related_name="tokens")
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


class LeaveType(models.Model):
    """Configurable leave category (master). Entitlement drives the ledger."""

    code = models.CharField(max_length=40, unique=True)
    name = models.CharField(max_length=80)
    annual_entitlement = models.PositiveIntegerField(default=12)
    opening_balance = models.PositiveIntegerField(default=0)
    is_paid = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "leave_type"
        ordering = ["sort_order", "id"]

    def __str__(self):
        return self.name


class LeaveRequest(models.Model):
    """Worker leave application + approval lifecycle (contractor approves)."""

    STATUS = [("PENDING", "Pending"), ("APPROVED", "Approved"),
              ("REJECTED", "Rejected"), ("CANCELLED", "Cancelled")]

    worker = models.ForeignKey(User, on_delete=models.CASCADE, related_name="leave_requests")
    leave_type = models.ForeignKey(LeaveType, on_delete=models.PROTECT, related_name="requests")
    site = models.ForeignKey(Site, on_delete=models.SET_NULL, null=True, blank=True,
                             related_name="leave_requests")
    contractor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                                   related_name="leave_approvals")
    from_date = models.DateField()
    to_date = models.DateField()
    days = models.PositiveIntegerField(default=1)
    reason = models.CharField(max_length=2000, blank=True)
    attachment_id = models.CharField(max_length=80, blank=True)
    status = models.CharField(max_length=20, choices=STATUS, default="PENDING")
    approver = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                                 related_name="leave_decisions")
    decided_at = models.DateTimeField(null=True, blank=True)
    comment = models.CharField(max_length=500, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "leave_request"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["worker", "status"], name="idx_leave_worker_status"),
            models.Index(fields=["contractor", "status"], name="idx_leave_contractor_status"),
        ]

    def __str__(self):
        return f"{self.worker_id} {self.leave_type_id} {self.from_date}..{self.to_date} ({self.status})"


class WorkerBenefitRecord(models.Model):
    """Worker benefit records: PF contributions (autofetched) and Bonus /
    Leave Encashment (uploaded by the contractor)."""

    KIND = [("PF", "Provident Fund"), ("BONUS", "Bonus"), ("LEAVE_ENCASHMENT", "Leave Encashment")]
    STATUS = [("RECORDED", "Recorded"), ("CREDITED", "Credited"),
              ("PROCESSING", "Processing"), ("PAID", "Paid")]

    worker = models.ForeignKey(User, on_delete=models.CASCADE, related_name="benefit_records")
    contractor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                                   related_name="benefit_uploads")
    site = models.ForeignKey(Site, on_delete=models.SET_NULL, null=True, blank=True,
                             related_name="benefit_records")
    kind = models.CharField(max_length=20, choices=KIND)
    period = models.CharField(max_length=40, blank=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    days = models.DecimalField(max_digits=6, decimal_places=1, null=True, blank=True)
    rate = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    employee_contribution = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    employer_contribution = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    reason = models.CharField(max_length=120, blank=True)
    status = models.CharField(max_length=20, choices=STATUS, default="RECORDED")
    paid_on = models.DateField(null=True, blank=True)
    credited_on = models.DateField(null=True, blank=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                                   related_name="+")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "worker_benefit_record"
        ordering = ["-period", "-id"]

    def __str__(self):
        return f"{self.worker_id} {self.kind} {self.period}"


class GratuityApplication(models.Model):
    """Worker-initiated gratuity application, verified by the contractor/employer."""

    STATUS = [("SUBMITTED", "Submitted"), ("UNDER_EXAMINATION", "Under examination"),
              ("APPROVED", "Approved"), ("DISBURSED", "Disbursed"), ("REJECTED", "Rejected")]

    worker = models.ForeignKey(User, on_delete=models.CASCADE, related_name="gratuity_applications")
    contractor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                                   related_name="gratuity_requests")
    site = models.ForeignKey(Site, on_delete=models.SET_NULL, null=True, blank=True,
                             related_name="gratuity_applications")
    reference = models.CharField(max_length=40, unique=True)
    reason = models.CharField(max_length=500, blank=True)
    status = models.CharField(max_length=30, choices=STATUS, default="SUBMITTED")
    submitted_on = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "gratuity_application"
        ordering = ["-submitted_on"]

    def __str__(self):
        return f"{self.reference} {self.worker_id} {self.status}"


class SalaryAdvance(models.Model):
    """Worker salary-advance lifecycle: worker requests → contractor approves and
    disburses (Cash/Online) → worker accepts → recovered/adjusted in payroll."""

    STATUS = [("REQUESTED", "Requested"), ("APPROVED", "Approved"),
              ("DISBURSED", "Disbursed"), ("ACCEPTED", "Accepted"),
              ("ADJUSTED", "Adjusted"), ("REJECTED", "Rejected")]
    MODE = [("CASH", "Cash"), ("ONLINE", "Online")]

    worker = models.ForeignKey(User, on_delete=models.CASCADE, related_name="salary_advances")
    contractor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                                   related_name="advance_requests")
    site = models.ForeignKey(Site, on_delete=models.SET_NULL, null=True, blank=True,
                             related_name="advances")
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    reason = models.CharField(max_length=255, blank=True)
    status = models.CharField(max_length=20, choices=STATUS, default="REQUESTED")
    mode = models.CharField(max_length=10, choices=MODE, blank=True)
    reference = models.CharField(max_length=80, blank=True)
    payroll_period = models.CharField(max_length=40, blank=True)
    requested_at = models.DateTimeField(auto_now_add=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    disbursed_at = models.DateTimeField(null=True, blank=True)
    accepted_at = models.DateTimeField(null=True, blank=True)
    adjusted_at = models.DateTimeField(null=True, blank=True)
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                                    related_name="+")
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "salary_advance"
        ordering = ["-requested_at"]

    def __str__(self):
        return f"ADV-{self.id} {self.worker_id} {self.status}"


class SiteLeavePolicy(models.Model):
    """Per-site leave entitlement. Workers bound to the site inherit this policy
    (set up by the contractor) instead of the global LeaveType defaults."""

    site = models.ForeignKey(Site, on_delete=models.CASCADE, related_name="leave_policies")
    leave_type = models.ForeignKey(LeaveType, on_delete=models.CASCADE, related_name="site_policies")
    annual_entitlement = models.PositiveIntegerField(default=12)
    opening_balance = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "site_leave_policy"
        ordering = ["id"]
        constraints = [
            models.UniqueConstraint(fields=["site", "leave_type"], name="uq_site_leave_policy"),
        ]

    def __str__(self):
        return f"{self.site_id}:{self.leave_type_id}"


class SiteHoliday(models.Model):
    """Per-site holiday calendar entry. Workers bound to the site inherit it.

    Kept deliberately small — only the three standard Indian calendar categories:
    weekly offs, fixed public/gazetted holidays, and optional (restricted)
    holidays the worker may choose from with prior approval."""

    TYPES = [("WEEKLY_OFF", "Weekly Off"), ("PUBLIC", "Public Holiday"),
             ("RESTRICTED", "Restricted Holiday")]

    site = models.ForeignKey(Site, on_delete=models.CASCADE, related_name="holidays")
    date = models.DateField()
    name = models.CharField(max_length=120)
    holiday_type = models.CharField(max_length=20, choices=TYPES, default="PUBLIC")
    is_paid = models.BooleanField(default=True)
    note = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "site_holiday"
        ordering = ["date", "id"]
        constraints = [
            models.UniqueConstraint(fields=["site", "date", "name"], name="uq_site_holiday"),
        ]

    def __str__(self):
        return f"{self.site_id} {self.date} {self.name}"


class RestrictedHolidayRequest(models.Model):
    """A worker's request to avail a Restricted Holiday (RH) at their site.

    The contractor's prior approval is required. The number of RH a worker may
    avail per year is capped by the site's ``restricted_holiday_max_avail``."""

    STATUS = [("PENDING", "Pending"), ("APPROVED", "Approved"),
              ("REJECTED", "Rejected"), ("CANCELLED", "Cancelled")]

    worker = models.ForeignKey(User, on_delete=models.CASCADE, related_name="restricted_holiday_requests")
    contractor = models.ForeignKey(User, on_delete=models.CASCADE, related_name="restricted_holiday_approvals")
    site = models.ForeignKey(Site, on_delete=models.CASCADE, related_name="restricted_holiday_requests")
    holiday = models.ForeignKey(SiteHoliday, on_delete=models.SET_NULL, null=True, blank=True,
                                related_name="restricted_requests")
    holiday_date = models.DateField()
    holiday_name = models.CharField(max_length=120, blank=True)
    reason = models.CharField(max_length=500, blank=True)
    status = models.CharField(max_length=20, choices=STATUS, default="PENDING")
    decided_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                                   related_name="restricted_holiday_decisions")
    decided_at = models.DateTimeField(null=True, blank=True)
    comment = models.CharField(max_length=500, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "restricted_holiday_request"
        ordering = ["-created_at", "-id"]
        constraints = [
            # One live request per worker/site/date (terminal rows kept as history).
            models.UniqueConstraint(fields=["worker", "site", "holiday_date"],
                                    condition=models.Q(status__in=["PENDING", "APPROVED"]),
                                    name="uq_rh_request_active"),
        ]

    def __str__(self):
        return f"{self.worker_id} {self.holiday_date} ({self.status})"


class DocumentTemplateStore(models.Model):
    """Server-side store for the frontend document-engine template records.

    Templates used to live only in the browser's localStorage, so they vanished
    across devices and could not render on the worker/contractor side. Keeping
    the JSON record array per owner here makes them durable and shareable."""

    owner_type = models.CharField(max_length=20)   # employer | contractor
    owner_id = models.CharField(max_length=80)     # owner BSS id
    records = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "document_template_store"
        constraints = [
            models.UniqueConstraint(fields=["owner_type", "owner_id"],
                                    name="uq_doc_template_owner"),
        ]

    def __str__(self):
        return f"{self.owner_type}:{self.owner_id}"


class WorkerGatePassBlock(models.Model):
    """Principal employer's switch to stop gate-pass generation for a worker
    (both temporary and permanent). When blocked the pass is not generated."""

    worker = models.ForeignKey(User, on_delete=models.CASCADE, related_name="gate_pass_blocks")
    employer = models.ForeignKey(User, on_delete=models.CASCADE, related_name="gate_pass_blocks_issued")
    blocked = models.BooleanField(default=True)
    blocked_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="+")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "worker_gate_pass_block"
        constraints = [
            models.UniqueConstraint(fields=["worker", "employer"], name="uq_gate_pass_block"),
        ]

    def __str__(self):
        return f"{self.worker_id} blocked={self.blocked}"
