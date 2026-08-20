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

ENTITY_TYPE = [
    ("EMPLOYER", "Employer"),
    ("CONTRACTOR", "Contractor"),
    ("WORKER", "Worker"),
    ("SITE", "Site"),
]


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


class Site(models.Model):
    """A work site. GOLDEN RULE: a site always belongs to an Employer, nothing else.

    Contractors and Workers are assigned to a site, but never own it.
    Mirrors the legacy evm_tbl_sitemanager structure.
    """
    name = models.CharField(max_length=255)
    site_code = models.CharField(max_length=100, blank=True)
    employer = models.ForeignKey(
        Employer, on_delete=models.CASCADE, related_name="sites"
    )
    address = models.TextField(blank=True)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    location_address = models.TextField(blank=True)
    state = models.CharField(max_length=100, blank=True)
    city = models.CharField(max_length=100, blank=True)
    pincode = models.CharField(max_length=20, blank=True)
    contact_person = models.CharField(max_length=255, blank=True)
    contact_mobile = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True, null=True)
    description = models.TextField(blank=True)
    pan_no = models.CharField(max_length=50, blank=True)
    gstin = models.CharField(max_length=50, blank=True)
    clrarc = models.CharField(max_length=100, blank=True)
    clrlic = models.CharField(max_length=100, blank=True)
    manpower_type = models.CharField(max_length=100, blank=True)
    manpower_count = models.CharField(max_length=50, blank=True)
    valid_from = models.CharField(max_length=50, blank=True)
    valid_to = models.CharField(max_length=50, blank=True)
    is_active = models.BooleanField(default=True)
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
    # Assigned site (site belongs to employer - golden rule)
    site = models.ForeignKey(
        Site, on_delete=models.SET_NULL, null=True, blank=True, related_name="contractors"
    )
    location_lat = models.FloatField(null=True, blank=True)
    location_lng = models.FloatField(null=True, blank=True)
    location_address = models.TextField(blank=True)
    site_name = models.CharField(max_length=255, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class ContractorEmployment(models.Model):
    """A contractor can work for MULTIPLE employers, each at a site (many-to-many).

    GOLDEN RULE: the site always belongs to the employer on this record.
    Each row = contractor is employed by `employer` at `site`.
    """
    contractor = models.ForeignKey(
        Contractor, on_delete=models.CASCADE, related_name="employments"
    )
    employer = models.ForeignKey(
        Employer, on_delete=models.CASCADE, related_name="contractor_employments"
    )
    site = models.ForeignKey(
        Site, on_delete=models.SET_NULL, null=True, blank=True, related_name="contractor_employments"
    )
    status = models.CharField(
        max_length=16,
        choices=[("ACTIVE", "Active"), ("ENDED", "Ended"), ("SUSPENDED", "Suspended")],
        default="ACTIVE",
    )
    started_at = models.DateTimeField(null=True, blank=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("contractor", "employer", "site")]
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.contractor.name} @ {self.employer.name}"


class Worker(models.Model):
    # --- Core identity ---
    legacy_employee_code = models.CharField(max_length=64, blank=True, null=True)
    legacy_employee_id = models.BigIntegerField(null=True, blank=True)
    full_name = models.CharField(max_length=255)
    worker_id = models.CharField(max_length=32, unique=True, blank=True, null=True)
    mobile = models.CharField(max_length=20, blank=True, null=True)
    alternative_mobile = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True, null=True)
    aadhaar_no = models.CharField(max_length=16, blank=True, null=True)
    aadhaar_status = models.CharField(max_length=32, blank=True)
    aadhaar_message = models.TextField(blank=True)
    aadhaar_response_json = models.TextField(blank=True)
    pan_no = models.CharField(max_length=16, blank=True, null=True)
    father_name = models.CharField(max_length=255, blank=True)
    care_of = models.CharField(max_length=255, blank=True)
    gender = models.CharField(max_length=20, blank=True)
    marital_status = models.CharField(max_length=50, blank=True)
    date_of_birth = models.CharField(max_length=50, blank=True)
    year_of_birth = models.CharField(max_length=10, blank=True)
    blood_group = models.CharField(max_length=10, blank=True)
    religion = models.CharField(max_length=50, blank=True)
    caste = models.CharField(max_length=50, blank=True)
    country = models.CharField(max_length=100, blank=True)
    digilocker_id = models.CharField(max_length=100, blank=True)
    reference_id = models.CharField(max_length=100, blank=True)
    transaction_id = models.CharField(max_length=100, blank=True)
    party_code = models.CharField(max_length=100, blank=True)
    party_type_id = models.CharField(max_length=50, blank=True)
    party_id = models.CharField(max_length=50, blank=True)
    client_id = models.CharField(max_length=50, blank=True)
    store_code = models.CharField(max_length=50, blank=True)
    licence_id = models.CharField(max_length=100, blank=True)

    # --- Address (present) ---
    present_address = models.TextField(blank=True)
    landmark = models.CharField(max_length=255, blank=True)
    sub_district = models.CharField(max_length=100, blank=True)
    vtc = models.CharField(max_length=100, blank=True)
    district = models.CharField(max_length=100, blank=True)
    post_office = models.CharField(max_length=100, blank=True)
    street = models.CharField(max_length=255, blank=True)
    house = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    city = models.CharField(max_length=100, blank=True)
    pincode = models.CharField(max_length=20, blank=True)

    # --- Address (permanent) ---
    permanent_address = models.TextField(blank=True)
    p_state = models.CharField(max_length=100, blank=True)
    p_city = models.CharField(max_length=100, blank=True)
    p_pincode = models.CharField(max_length=20, blank=True)

    # --- Work ---
    designation = models.CharField(max_length=150, blank=True)
    department = models.CharField(max_length=150, blank=True)
    worker_grade = models.CharField(max_length=50, blank=True)
    type_work = models.CharField(max_length=50, blank=True)
    nature_job = models.CharField(max_length=100, blank=True)
    s_date = models.CharField(max_length=50, blank=True)
    en_date = models.CharField(max_length=50, blank=True)
    s_name = models.CharField(max_length=255, blank=True)
    legacy_site_id = models.CharField(max_length=50, blank=True)
    site_location = models.CharField(max_length=255, blank=True)
    site_state = models.CharField(max_length=100, blank=True)

    # --- Finance / PF / ESI / Wage ---
    bank_account = models.CharField(max_length=50, blank=True)
    bank_ifsc = models.CharField(max_length=50, blank=True)
    bank_name = models.CharField(max_length=150, blank=True)
    account_holder_name = models.CharField(max_length=150, blank=True)
    previous_uan = models.CharField(max_length=50, blank=True)
    previous_esi = models.CharField(max_length=50, blank=True)
    pf_account = models.CharField(max_length=50, blank=True)
    gross_salary = models.CharField(max_length=50, blank=True)
    minimum_wage_category = models.CharField(max_length=100, blank=True)
    wage_type = models.CharField(max_length=50, blank=True)
    wage_disbursement_mode = models.CharField(max_length=100, blank=True)
    lwf = models.CharField(max_length=50, blank=True)
    wc_policy = models.CharField(max_length=50, blank=True)

    # --- Nominee (PF) ---
    nominee_name = models.CharField(max_length=255, blank=True)
    nominee_relation = models.CharField(max_length=50, blank=True)
    nominee_dob = models.CharField(max_length=50, blank=True)
    nominee_address = models.TextField(blank=True)
    nominee_mobile = models.CharField(max_length=20, blank=True)
    nominee_email = models.EmailField(blank=True)
    nominee_pan = models.CharField(max_length=16, blank=True)
    nominee_aadhaar = models.CharField(max_length=16, blank=True)

    # --- Nominee (PF nominee) ---
    pf_nominee_name = models.CharField(max_length=255, blank=True)
    pf_nominee_relation = models.CharField(max_length=50, blank=True)
    pf_nominee_dob = models.CharField(max_length=50, blank=True)
    pf_nominee_address = models.TextField(blank=True)
    pf_nominee_mobile = models.CharField(max_length=20, blank=True)
    pf_nominee_email = models.EmailField(blank=True)

    # --- Nominee (ESI) ---
    esi_nominee_name = models.CharField(max_length=255, blank=True)
    esi_nominee_relation = models.CharField(max_length=50, blank=True)
    esi_nominee_dob = models.CharField(max_length=50, blank=True)
    esi_nominee_address = models.TextField(blank=True)
    esi_nominee_mobile = models.CharField(max_length=20, blank=True)
    esi_nominee_email = models.EmailField(blank=True)

    # --- Nominee (Bonus) ---
    bonus_nominee_name = models.CharField(max_length=255, blank=True)
    bonus_nominee_relation = models.CharField(max_length=50, blank=True)
    bonus_nominee_dob = models.CharField(max_length=50, blank=True)
    bonus_nominee_address = models.TextField(blank=True)
    bonus_nominee_mobile = models.CharField(max_length=20, blank=True)
    bonus_nominee_email = models.EmailField(blank=True)

    # --- Nominee (Other) ---
    other_nominee_name = models.CharField(max_length=255, blank=True)
    other_nominee_relation = models.CharField(max_length=50, blank=True)
    other_nominee_dob = models.CharField(max_length=50, blank=True)
    other_nominee_address = models.TextField(blank=True)
    other_nominee_mobile = models.CharField(max_length=20, blank=True)
    other_nominee_email = models.EmailField(blank=True)

    # --- Medical / Compliance ---
    fitness_types = models.CharField(max_length=50, blank=True)
    medical_status = models.CharField(max_length=50, blank=True)
    next_medical_due = models.CharField(max_length=50, blank=True)
    medical_certificate_file_path = models.CharField(max_length=500, blank=True)
    ppe = models.CharField(max_length=50, blank=True)
    ppe_type = models.CharField(max_length=100, blank=True)
    safety_training_status = models.CharField(max_length=50, blank=True)
    site_induction_status = models.CharField(max_length=50, blank=True)
    police_verification_status = models.CharField(max_length=50, blank=True)

    # --- ID / Verification ---
    temp_id_status = models.CharField(max_length=50, blank=True)
    temp_id_number = models.CharField(max_length=100, blank=True)
    temp_id_date = models.CharField(max_length=50, blank=True)
    permanent_id_status = models.CharField(max_length=50, blank=True)
    permanent_id_number = models.CharField(max_length=100, blank=True)
    permanent_id_date = models.CharField(max_length=50, blank=True)
    issue_date = models.CharField(max_length=50, blank=True)
    valid_till = models.CharField(max_length=50, blank=True)
    camp_number = models.CharField(max_length=100, blank=True)
    transport = models.CharField(max_length=100, blank=True)
    route_id = models.CharField(max_length=100, blank=True)

    # --- Document upload file paths ---
    pan_copy_file_path = models.CharField(max_length=500, blank=True)
    aadhaar_copy_file_path = models.CharField(max_length=500, blank=True)
    pan_card_file_path = models.CharField(max_length=500, blank=True)
    cheque_passbook_file_path = models.CharField(max_length=500, blank=True)
    education_certificate_file_path = models.CharField(max_length=500, blank=True)
    experience_certificate_file_path = models.CharField(max_length=500, blank=True)
    aadhaar_front_side_file_path = models.CharField(max_length=500, blank=True)
    aadhaar_back_side_file_path = models.CharField(max_length=500, blank=True)
    relieving_letter_file_path = models.CharField(max_length=500, blank=True)
    payslips_file_path = models.CharField(max_length=500, blank=True)
    photos_1_file_path = models.CharField(max_length=500, blank=True)
    photos_2_file_path = models.CharField(max_length=500, blank=True)
    photos_3_file_path = models.CharField(max_length=500, blank=True)
    photos_4_file_path = models.CharField(max_length=500, blank=True)

    # --- Others ---
    trainer_name = models.CharField(max_length=255, blank=True)
    trainer_date = models.CharField(max_length=50, blank=True)
    supervisor1 = models.CharField(max_length=255, blank=True)
    supervisor2 = models.CharField(max_length=255, blank=True)
    escalation1 = models.CharField(max_length=255, blank=True)
    escalation2 = models.CharField(max_length=255, blank=True)
    remark = models.TextField(blank=True)
    field_name = models.CharField(max_length=255, blank=True)
    is_deleted = models.BooleanField(default=False)

    # --- Dates / Hierarchy ---
    doj = models.CharField(max_length=50, blank=True)
    leaving_date = models.CharField(max_length=50, blank=True)
    employer = models.ForeignKey(
        Employer, on_delete=models.SET_NULL, null=True, blank=True, related_name="workers"
    )
    contractor = models.ForeignKey(
        Contractor, on_delete=models.SET_NULL, null=True, blank=True, related_name="workers"
    )
    site = models.ForeignKey(
        Site, on_delete=models.SET_NULL, null=True, blank=True, related_name="workers"
    )
    # GUIDE.MD: unique constant E-C-S-W tuple (never duplicated)
    ecsw_tuple = models.CharField(max_length=64, unique=True, blank=True, null=True)
    photo = models.URLField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.full_name


class SavedLocation(models.Model):
    """A location starred/saved by an employer for reuse as a contractor working location."""
    employer = models.ForeignKey(
        Employer, on_delete=models.CASCADE, related_name="saved_locations", null=True, blank=True
    )
    name = models.CharField(max_length=255, blank=True)
    latitude = models.FloatField()
    longitude = models.FloatField()
    address = models.CharField(max_length=500, blank=True)
    is_starred = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name or self.address or 'Location'} ({self.latitude},{self.longitude})"


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
    site = models.ForeignKey(
        Site, on_delete=models.SET_NULL, null=True, blank=True, related_name="bindings"
    )
    status = models.CharField(max_length=16, choices=STATUS, default="PENDING")
    # Consent lifecycle (GUIDE.MD: dual handshake - both parties must consent)
    initiator_consent = models.CharField(
        max_length=16,
        choices=[("NONE", "None"), ("PENDING", "Pending"), ("APPROVED", "Approved"), ("REJECTED", "Rejected"), ("TIMEOUT", "Timed Out")],
        default="NONE",
    )
    approver_consent = models.CharField(
        max_length=16,
        choices=[("NONE", "None"), ("PENDING", "Pending"), ("APPROVED", "Approved"), ("REJECTED", "Rejected"), ("TIMEOUT", "Timed Out")],
        default="NONE",
    )
    consent_channel = models.CharField(
        max_length=16,
        choices=[("APP", "App"), ("SMS_OTP", "SMS OTP"), ("IVR", "IVR"), ("VOICE", "Voice")],
        default="APP",
    )
    consent_expires_at = models.DateTimeField(null=True, blank=True)
    initiator_consent_at = models.DateTimeField(null=True, blank=True)
    approver_consent_at = models.DateTimeField(null=True, blank=True)
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
