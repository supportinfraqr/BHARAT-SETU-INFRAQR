import uuid

from django.conf import settings
from django.db import models

QR_STATUS = [
    ("UNREGISTERED", "Unregistered"),
    ("REGISTERED", "Registered"),
    ("UNBOUND", "Unbound"),
    ("BINDING_REQUESTED", "Binding Requested"),
    ("BOUND", "Bound"),
    ("ACTIVE", "Active"),
    ("SUSPENDED", "Suspended / Inactive"),
    ("REASSIGNED", "Reassigned / Historical"),
]

ENTITY_TYPE = [("EMPLOYER", "Employer"), ("CONTRACTOR", "Contractor"), ("WORKER", "Worker")]


class QRCode(models.Model):
    """Unique static QR reference for an entity. The printed QR encodes only this opaque reference."""
    qr_reference = models.CharField(max_length=64, unique=True, db_index=True)
    entity_type = models.CharField(max_length=16, choices=ENTITY_TYPE)
    entity_id = models.BigIntegerField()
    status = models.CharField(max_length=24, choices=QR_STATUS, default="UNREGISTERED")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    scan_count = models.PositiveIntegerField(default=0)

    class Meta:
        unique_together = [("entity_type", "entity_id")]

    def __str__(self):
        return f"{self.entity_type}:{self.entity_id} {self.qr_reference}"


class Employer(models.Model):
    APPROVAL_STATUS = [
        ("PENDING", "Pending Approval"),
        ("APPROVED", "Approved"),
        ("REJECTED", "Rejected"),
    ]
    PLAN_TYPE = [
        ("FREE", "Free"),
        ("SILVER", "Silver"),
        ("GOLD", "Gold"),
        ("PLATINUM", "Platinum"),
    ]
    name = models.CharField(max_length=255)
    legacy_party_id = models.BigIntegerField(null=True, blank=True)
    contact_person = models.CharField(max_length=255, blank=True)
    contact_mobile = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True, null=True)
    address = models.TextField(blank=True)
    # Legacy party fields
    pan_no = models.CharField(max_length=50, blank=True)
    gstin = models.CharField(max_length=50, blank=True)
    cin = models.CharField(max_length=50, blank=True)
    lin = models.CharField(max_length=50, blank=True)
    registration_type = models.CharField(max_length=100, blank=True)
    bank_details = models.TextField(blank=True)
    industry = models.CharField(max_length=150, blank=True)
    state = models.CharField(max_length=100, blank=True)
    city = models.CharField(max_length=100, blank=True)
    pincode = models.CharField(max_length=20, blank=True)
    is_active = models.BooleanField(default=True)
    approval_status = models.CharField(max_length=20, choices=APPROVAL_STATUS, default="PENDING")
    plan_type = models.CharField(max_length=20, choices=PLAN_TYPE, default="FREE")
    plan_expiry = models.DateTimeField(null=True, blank=True)
    approved_by = models.ForeignKey(
        "authx.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="approved_employers"
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class Contractor(models.Model):
    name = models.CharField(max_length=255)
    legacy_party_id = models.BigIntegerField(null=True, blank=True)
    contact_person = models.CharField(max_length=255, blank=True)
    contact_mobile = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True, null=True)
    address = models.TextField(blank=True)
    # Legacy party fields
    pan_no = models.CharField(max_length=50, blank=True)
    gstin = models.CharField(max_length=50, blank=True)
    registration_type = models.CharField(max_length=100, blank=True)
    bank_details = models.TextField(blank=True)
    industry = models.CharField(max_length=150, blank=True)
    state = models.CharField(max_length=100, blank=True)
    city = models.CharField(max_length=100, blank=True)
    pincode = models.CharField(max_length=20, blank=True)
    employer = models.ForeignKey(
        Employer, on_delete=models.SET_NULL, null=True, blank=True, related_name="contractors"
    )
    is_primary = models.BooleanField(default=True)
    location_lat = models.FloatField(null=True, blank=True)
    location_lng = models.FloatField(null=True, blank=True)
    site_name = models.CharField(max_length=255, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class Worker(models.Model):
    legacy_employee_code = models.CharField(max_length=64, blank=True, null=True)
    legacy_employee_id = models.BigIntegerField(null=True, blank=True)
    full_name = models.CharField(max_length=255)
    worker_id = models.CharField(max_length=32, unique=True, blank=True, null=True)
    mobile = models.CharField(max_length=20, blank=True, null=True)
    alternative_mobile = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True, null=True)
    aadhaar_no = models.CharField(max_length=16, blank=True, null=True)
    pan_no = models.CharField(max_length=16, blank=True, null=True)
    father_name = models.CharField(max_length=255, blank=True)
    gender = models.CharField(max_length=20, blank=True)
    marital_status = models.CharField(max_length=50, blank=True)
    date_of_birth = models.CharField(max_length=50, blank=True)
    designation = models.CharField(max_length=150, blank=True)
    department = models.CharField(max_length=150, blank=True)
    present_address = models.TextField(blank=True)
    permanent_address = models.TextField(blank=True)
    state = models.CharField(max_length=100, blank=True)
    city = models.CharField(max_length=100, blank=True)
    pincode = models.CharField(max_length=20, blank=True)
    bank_account = models.CharField(max_length=50, blank=True)
    bank_ifsc = models.CharField(max_length=50, blank=True)
    previous_uan = models.CharField(max_length=50, blank=True)
    previous_esi = models.CharField(max_length=50, blank=True)
    pf_account = models.CharField(max_length=50, blank=True)
    gross_salary = models.CharField(max_length=50, blank=True)
    doj = models.CharField(max_length=50, blank=True)
    leaving_date = models.CharField(max_length=50, blank=True)
    employer = models.ForeignKey(
        Employer, on_delete=models.SET_NULL, null=True, blank=True, related_name="workers"
    )
    contractor = models.ForeignKey(
        Contractor, on_delete=models.SET_NULL, null=True, blank=True, related_name="workers"
    )
    photo = models.URLField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.full_name


class Binding(models.Model):
    """Employer<->Contractor and Contractor<->Worker bindings with full history."""
    BINDING_TYPE = [
        ("EMPLOYER_CONTRACTOR", "Employer-Contractor"),
        ("WORKER_CONTRACTOR", "Worker-Contractor"),
    ]
    STATUS = [
        ("PENDING", "Pending"),
        ("APPROVED", "Approved"),
        ("REJECTED", "Rejected"),
        ("ACTIVE", "Active"),
        ("ENDED", "Ended"),
        ("REASSIGNED", "Reassigned"),
    ]
    binding_type = models.CharField(max_length=24, choices=BINDING_TYPE)
    employer = models.ForeignKey(
        Employer, on_delete=models.CASCADE, null=True, blank=True, related_name="bindings"
    )
    contractor = models.ForeignKey(
        Contractor, on_delete=models.CASCADE, null=True, blank=True, related_name="bindings"
    )
    worker = models.ForeignKey(
        Worker, on_delete=models.CASCADE, null=True, blank=True, related_name="bindings"
    )
    status = models.CharField(max_length=16, choices=STATUS, default="PENDING")
    request_reference = models.CharField(max_length=64, blank=True)
    site_name = models.CharField(max_length=255, blank=True)
    approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class Attendance(models.Model):
    STATUS = [
        ("PRESENT", "Present"),
        ("ABSENT", "Absent"),
        ("LOCATION_MISMATCH", "Location Mismatch"),
        ("VERIFICATION_FAILED", "Verification Failed"),
        ("SCAN_FAILED", "Scan Failed"),
        ("PENDING_SYNC", "Pending Sync"),
        ("SYNCED", "Synced"),
    ]
    worker = models.ForeignKey(Worker, on_delete=models.CASCADE, related_name="attendance")
    employer = models.ForeignKey(Employer, on_delete=models.CASCADE, null=True, blank=True)
    contractor = models.ForeignKey(Contractor, on_delete=models.CASCADE, null=True, blank=True)
    scan_user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    qr = models.ForeignKey(QRCode, on_delete=models.SET_NULL, null=True, blank=True)
    date = models.DateField(db_index=True)
    time = models.TimeField()
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    location_status = models.CharField(max_length=32, blank=True)
    attendance_status = models.CharField(max_length=24, choices=STATUS, default="PENDING_SYNC")
    location_mismatch = models.BooleanField(default=False)
    synced_to_bss = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("worker", "date")]


class ScanLog(models.Model):
    """Every QR scan, fully traceable."""
    qr = models.ForeignKey(QRCode, on_delete=models.SET_NULL, null=True, blank=True, related_name="scans")
    qr_reference = models.CharField(max_length=64, blank=True)
    worker = models.ForeignKey(Worker, on_delete=models.SET_NULL, null=True, blank=True)
    scanning_user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    user_role = models.CharField(max_length=32, blank=True)
    employer = models.ForeignKey(Employer, on_delete=models.SET_NULL, null=True, blank=True)
    contractor = models.ForeignKey(Contractor, on_delete=models.SET_NULL, null=True, blank=True)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    location_status = models.CharField(max_length=32, blank=True)
    scan_result = models.CharField(max_length=32, blank=True)
    device_info = models.CharField(max_length=255, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]


class AuditLog(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    action = models.CharField(max_length=255)
    entity_type = models.CharField(max_length=64, blank=True)
    entity_id = models.BigIntegerField(null=True, blank=True)
    previous_value = models.TextField(blank=True)
    new_value = models.TextField(blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class Notification(models.Model):
    recipient_role = models.CharField(max_length=32)
    recipient_user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="notifications"
    )
    notification_type = models.CharField(max_length=64)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
