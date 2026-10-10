"""Core identity & profile models mirroring FINAL/Db schema (app_role, users,
user_credentials, contractor/employer/government/bss_staff profiles)."""

from django.contrib.auth.base_user import BaseUserManager
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models


class AppRole(models.Model):
    """Reference of platform roles (app_role)."""
    code = models.CharField(max_length=40, unique=True)
    label = models.CharField(max_length=60)
    is_login_role = models.BooleanField(default=True)
    sort_order = models.SmallIntegerField(default=0)

    class Meta:
        db_table = "app_role"

    def __str__(self):
        return self.code


class UserManager(BaseUserManager):
    def create_user(self, username, password=None, role="worker", **extra):
        user = self.model(username=username, role=role, **extra)
        if password:
            user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, username, password=None, **extra):
        return self.create_user(username, password=password, role="bss_admin",
                                account_active=True, is_verified=True, is_staff=True,
                                is_superuser=True, **extra)

    def get_by_natural_key(self, username):
        return self.get(username=username)


class User(AbstractBaseUser, PermissionsMixin):
    """The unified login record (users table). A single auth row per person;
    the role field scopes what the user can see/do (RBAC)."""

    ROLE_CHOICES = [
        ("worker", "Worker"),
        ("contractor", "Contractor"),
        ("employer", "Employer"),
        ("government", "Government"),
        ("bss_staff", "BSS Staff"),
        ("bss_admin", "BSS Admin"),
    ]

    username = models.CharField("Login", max_length=150, unique=True)
    full_name = models.CharField("Full name", max_length=160, blank=True)
    role = models.CharField(max_length=40, choices=ROLE_CHOICES, default="worker", db_index=True)
    account_active = models.BooleanField(default=True)
    is_verified = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    # Single active session: the id of the one session currently allowed to act
    # as this user. A successful login overwrites it, immediately invalidating
    # every previously issued token/session.
    current_session_id = models.CharField(max_length=64, blank=True, default="", db_index=True)
    current_session_at = models.DateTimeField(null=True, blank=True)

    objects = UserManager()

    USERNAME_FIELD = "username"
    REQUIRED_FIELDS = ["role"]

    class Meta:
        db_table = "users"

    def __str__(self):
        return f"{self.username} ({self.role})"

    def get_full_name(self):
        """Display name. Django's AbstractBaseUser omits this (only AbstractUser
        provides it), yet the codebase calls it as a fallback label."""
        return (self.full_name or "").strip()

    def get_short_name(self):
        return self.username


class UserCredential(models.Model):
    """Additional sign-in / identity credentials (mobile, email, aadhaar, login_id)."""
    IDENTITY_TYPES = [("mobile", "Mobile"), ("email", "Email"),
                      ("aadhaar", "Aadhaar"), ("login_id", "Login Id")]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="credentials")
    identity_type = models.CharField(max_length=20, choices=IDENTITY_TYPES)
    identity_value = models.CharField(max_length=255)
    is_primary = models.BooleanField(default=False)
    verified = models.BooleanField(default=False)
    password_hash = models.CharField(max_length=255, blank=True, null=True)
    mpin_hash = models.CharField(max_length=255, blank=True, null=True)

    class Meta:
        db_table = "user_credentials"
        unique_together = ("identity_type", "identity_value")

    def __str__(self):
        return f"{self.identity_type}: {self.identity_value}"


class ContractorProfile(models.Model):
    APPROVAL = [("PENDING", "Pending"), ("APPROVED", "Approved"), ("REJECTED", "Rejected")]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="contractor_profile")
    contractor_name = models.CharField(max_length=120, blank=True)
    contractor_code = models.CharField(max_length=40, blank=True, unique=True)
    profile_image = models.CharField(max_length=300, blank=True)
    trade_name = models.CharField(max_length=120, blank=True)
    constitution = models.CharField(max_length=80, blank=True)
    entity_type = models.CharField(max_length=80, blank=True)
    cin = models.CharField(max_length=40, blank=True)
    roc = models.CharField(max_length=80, blank=True)
    registration_number = models.CharField(max_length=80, blank=True)
    nic_code = models.CharField(max_length=20, blank=True)
    category_name = models.CharField(max_length=80, blank=True)
    sub_category = models.CharField(max_length=80, blank=True)
    entity_class = models.CharField(max_length=80, blank=True)
    activity = models.CharField(max_length=160, blank=True)
    company_age = models.CharField(max_length=20, blank=True)
    members_count = models.IntegerField(null=True, blank=True)
    authorized_capital = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    paid_up_capital = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    incorporation_date = models.DateField(null=True, blank=True)
    agm_date = models.DateField(null=True, blank=True)
    balance_sheet_date = models.DateField(null=True, blank=True)
    udyam_no = models.CharField(max_length=40, blank=True)
    labour_dept_reg_no = models.CharField(max_length=80, blank=True)
    clra_licence_no = models.CharField(max_length=80, blank=True)
    bocw_reg_no = models.CharField(max_length=80, blank=True)
    licence_valid_from = models.DateField(null=True, blank=True)
    licence_valid_to = models.DateField(null=True, blank=True)
    operating_states = models.CharField(max_length=255, blank=True)
    onboarding_method = models.CharField(max_length=40, blank=True)
    attendance_method = models.CharField(max_length=40, blank=True)
    payroll_method = models.CharField(max_length=40, blank=True)
    consent_date = models.DateField(null=True, blank=True)
    # When the contractor profile was created on BSS. Distinct from
    # consent_date: the profile can exist before terms are accepted, and this
    # is the audit trail for "created", not "consented".
    registered_at = models.DateTimeField(null=True, blank=True)
    registration_source = models.CharField(max_length=80, blank=True)
    registered_by = models.CharField(max_length=120, blank=True)
    risk_rating = models.CharField(max_length=20, blank=True)
    is_verified_badge = models.BooleanField(default=False)
    contact_person = models.CharField(max_length=120, blank=True)
    mobile = models.CharField(max_length=20, blank=True)
    email = models.EmailField(max_length=120, blank=True)
    state = models.CharField(max_length=60, blank=True)
    district = models.CharField(max_length=60, blank=True)
    address = models.CharField(max_length=255, blank=True)
    gstin = models.CharField(max_length=40, blank=True)
    pan_no = models.CharField(max_length=20, blank=True)
    lin = models.CharField(max_length=40, blank=True)
    approval_status = models.CharField(max_length=20, choices=APPROVAL, default="PENDING")
    is_active = models.BooleanField(default=True)
    # Identity / legal extras (BSS Feature Comparison — Contractor Identity).
    company_name = models.CharField(max_length=160, blank=True)
    listed_on_stock_exchange = models.CharField(max_length=20, blank=True)
    company_status = models.CharField(max_length=60, blank=True)
    nic_description = models.TextField(blank=True)
    auth_designation = models.CharField(max_length=80, blank=True)
    # Director / signatory (Directors tab).
    din = models.CharField(max_length=30, blank=True)
    director_name = models.CharField(max_length=160, blank=True)
    director_designation = models.CharField(max_length=80, blank=True)
    director_appointment_date = models.DateField(null=True, blank=True)
    director_cessation = models.CharField(max_length=40, blank=True)
    director_cessation_date = models.DateField(null=True, blank=True)
    # Address extras.
    city = models.CharField(max_length=60, blank=True)
    pincode = models.CharField(max_length=10, blank=True)
    # Compliance contacts.
    compliance_contact_name = models.CharField(max_length=120, blank=True)
    compliance_contact_mobile = models.CharField(max_length=20, blank=True)
    compliance_contact_email = models.EmailField(max_length=120, blank=True)
    # Banking & commercial.
    bank_account_name = models.CharField(max_length=160, blank=True)
    bank_account_number = models.CharField(max_length=40, blank=True)
    bank_ifsc = models.CharField(max_length=20, blank=True)
    # Worker management.
    qr_device_id = models.CharField(max_length=120, blank=True)
    # Document references.
    pf_reg_cert = models.CharField(max_length=120, blank=True)
    esic_reg_proof = models.CharField(max_length=120, blank=True)
    insurance_proof = models.CharField(max_length=120, blank=True)
    bank_proof = models.CharField(max_length=120, blank=True)
    other_certs = models.CharField(max_length=255, blank=True)
    # Financial extras.
    bank_name = models.CharField(max_length=160, blank=True)
    turnover_band = models.CharField(max_length=60, blank=True)
    # Explicit registration date (distinct from the audit registered_at).
    registration_date = models.DateField(null=True, blank=True)
    # Principal employer & site / contract (editable on the contractor profile).
    principal_employer_name = models.CharField(max_length=160, blank=True)
    principal_employer_id = models.CharField(max_length=40, blank=True)
    site_establishment_name = models.CharField(max_length=160, blank=True)
    site_ref_id = models.CharField(max_length=40, blank=True)
    work_order_number = models.CharField(max_length=80, blank=True)
    contract_start_date = models.DateField(null=True, blank=True)
    contract_end_date = models.DateField(null=True, blank=True)
    # Site pre-selected for worker bindings created by scanning a worker QR.
    default_site = models.ForeignKey("bss_core.Site", null=True, blank=True,
                                     on_delete=models.SET_NULL, related_name="+")
    # GST identity verification (API Setu GSTN Registration Certificate).
    gst_verification_status = models.CharField(max_length=20, default="PENDING")
    gst_verified_at = models.DateTimeField(null=True, blank=True)
    gst_legal_name = models.CharField(max_length=200, blank=True)
    gst_trade_name = models.CharField(max_length=200, blank=True)
    gst_constitution = models.CharField(max_length=120, blank=True)
    gst_certificate = models.FileField(upload_to="gst_certificates/", null=True, blank=True)
    gst_registration_date = models.CharField(max_length=20, blank=True)  # GSTN dateOfRegistration (dd/mm/yyyy)
    # Post-GST identity step: are you on EntityLocker? If not, manual documents.
    entity_locker_declined = models.BooleanField(default=False)
    manual_verification_status = models.CharField(max_length=20, default="NOT_SUBMITTED")
    manual_verification_note = models.CharField(max_length=255, blank=True)
    # Identity card dates: issued once at profile creation (= BSS registered_at
    # date), valid for three years.
    id_card_issue_date = models.DateField(null=True, blank=True)
    id_card_validity_till = models.DateField(null=True, blank=True)

    class Meta:
        db_table = "contractor_profiles"

    def __str__(self):
        return self.contractor_name or str(self.user_id)


class EmployerProfile(models.Model):
    APPROVAL = [("PENDING", "Pending"), ("APPROVED", "Approved"), ("REJECTED", "Rejected")]
    FREQ = [("WEEKLY", "Weekly"), ("MONTHLY", "Monthly"), ("FORTNIGHTLY", "Fortnightly")]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="employer_profile")
    employer_name = models.CharField(max_length=120, blank=True)
    employer_code = models.CharField(max_length=40, blank=True, unique=True)
    employer_category = models.CharField(max_length=80, blank=True)
    trade_name = models.CharField(max_length=120, blank=True)
    ownership = models.CharField(max_length=80, blank=True)
    cin = models.CharField(max_length=40, blank=True)
    roc = models.CharField(max_length=80, blank=True)
    registration_number = models.CharField(max_length=80, blank=True)
    entity_class = models.CharField(max_length=80, blank=True)
    nic_code = models.CharField(max_length=20, blank=True)
    members_count = models.IntegerField(null=True, blank=True)
    authorized_capital = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    paid_up_capital = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    incorporation_date = models.DateField(null=True, blank=True)
    agm_date = models.DateField(null=True, blank=True)
    balance_sheet_date = models.DateField(null=True, blank=True)
    corporate_website = models.CharField(max_length=160, blank=True)
    verification_status = models.CharField(max_length=20, default="PENDING")
    verification_date = models.DateField(null=True, blank=True)
    # When the employer profile was created on BSS ("BSS member since").
    registered_at = models.DateTimeField(null=True, blank=True)
    verification_source = models.CharField(max_length=80, blank=True)
    pan_verification_status = models.CharField(max_length=20, default="PENDING")
    gst_verification_status = models.CharField(max_length=20, default="PENDING")
    workforce_model = models.CharField(max_length=60, blank=True)
    total_headcount = models.IntegerField(null=True, blank=True)
    payroll_frequency = models.CharField(max_length=20, choices=FREQ, default="MONTHLY")
    wage_period = models.CharField(max_length=40, blank=True)
    attendance_method = models.CharField(max_length=40, blank=True)
    onboarding_method = models.CharField(max_length=40, blank=True)
    min_wage_mapping = models.CharField(max_length=80, blank=True)
    pf_coverage = models.BooleanField(default=True)
    esic_coverage = models.BooleanField(default=True)
    gratuity_coverage = models.BooleanField(default=True)
    lwf_coverage = models.BooleanField(default=False)
    medical_insurance = models.BooleanField(default=False)
    accident_insurance = models.BooleanField(default=False)
    oth_enabled = models.BooleanField(default=False)
    medical_exam_enabled = models.BooleanField(default=False)
    first_aid_enabled = models.BooleanField(default=True)
    ppe_provision = models.BooleanField(default=True)
    safety_training_enabled = models.BooleanField(default=True)
    site_induction_enabled = models.BooleanField(default=True)
    emergency_plan_enabled = models.BooleanField(default=True)
    fire_certificate = models.BooleanField(default=False)
    canteen_facility = models.BooleanField(default=False)
    creche_facility = models.BooleanField(default=False)
    transport_facility = models.BooleanField(default=False)
    accommodation_facility = models.BooleanField(default=False)
    grievance_mechanism = models.BooleanField(default=True)
    grievance_officer_name = models.CharField(max_length=120, blank=True)
    posh_icc = models.BooleanField(default=False)
    standing_orders = models.BooleanField(default=False)
    communication_channel = models.CharField(max_length=80, blank=True)
    default_approval_sla_days = models.SmallIntegerField(default=3)
    compliance_reminder_window_days = models.SmallIntegerField(default=7)
    preferred_reporting_period = models.CharField(max_length=40, blank=True)
    escalation_contact = models.CharField(max_length=120, blank=True)
    # Site pre-selected for contractor bindings / site allotments.
    default_site = models.ForeignKey("bss_core.Site", null=True, blank=True,
                                     on_delete=models.SET_NULL, related_name="+")
    contact_person = models.CharField(max_length=120, blank=True)
    mobile = models.CharField(max_length=20, blank=True)
    email = models.EmailField(max_length=120, blank=True)
    state = models.CharField(max_length=60, blank=True)
    district = models.CharField(max_length=60, blank=True)
    address = models.CharField(max_length=255, blank=True)
    industry = models.CharField(max_length=80, blank=True)
    gstin = models.CharField(max_length=40, blank=True)
    pan_no = models.CharField(max_length=20, blank=True)
    lin = models.CharField(max_length=40, blank=True)
    approval_status = models.CharField(max_length=20, choices=APPROVAL, default="PENDING")
    is_active = models.BooleanField(default=True)
    # GST identity verification (API Setu GSTN Registration Certificate).
    # gst_verification_status is declared above.
    gst_verified_at = models.DateTimeField(null=True, blank=True)
    gst_legal_name = models.CharField(max_length=200, blank=True)
    gst_trade_name = models.CharField(max_length=200, blank=True)
    gst_constitution = models.CharField(max_length=120, blank=True)
    gst_certificate = models.FileField(upload_to="gst_certificates/", null=True, blank=True)
    gst_registration_date = models.CharField(max_length=20, blank=True)  # GSTN dateOfRegistration (dd/mm/yyyy)
    # Post-GST identity step: are you on EntityLocker? If not, manual documents.
    entity_locker_declined = models.BooleanField(default=False)
    manual_verification_status = models.CharField(max_length=20, default="NOT_SUBMITTED")
    manual_verification_note = models.CharField(max_length=255, blank=True)
    # Identity card dates: issued once at profile creation (= BSS registered_at
    # date), valid for three years.
    id_card_issue_date = models.DateField(null=True, blank=True)
    id_card_validity_till = models.DateField(null=True, blank=True)

    class Meta:
        db_table = "employer_profiles"

    def __str__(self):
        return self.employer_name or str(self.user_id)


class EntityVerificationDocument(models.Model):
    """Manual identity documents uploaded when an entity is not on EntityLocker."""
    DOC_TYPES = [("PAN", "PAN card"), ("AADHAAR", "Aadhaar"),
                 ("INCORPORATION", "Incorporation certificate"), ("OTHER", "Other")]

    user = models.ForeignKey(User, on_delete=models.CASCADE,
                             related_name="entity_verification_documents")
    doc_type = models.CharField(max_length=20, choices=DOC_TYPES, default="OTHER")
    file = models.FileField(upload_to="entity_verification/")
    note = models.CharField(max_length=255, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "entity_verification_document"

    def __str__(self):
        return f"{self.doc_type} · {self.user_id}"


class GovernmentProfile(models.Model):
    GOV_TYPE = [("inspector", "Inspector"), ("admin", "Admin")]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="government_profile")
    gov_type = models.CharField(max_length=20, choices=GOV_TYPE)
    officer_name = models.CharField(max_length=120, blank=True)
    department = models.CharField(max_length=80, blank=True)
    designation = models.CharField(max_length=80, blank=True)
    jurisdiction = models.CharField(max_length=120, blank=True)

    class Meta:
        db_table = "government_profile"

    def __str__(self):
        return self.officer_name or str(self.user_id)


class BssStaffProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="bss_staff_profile")
    employee_code = models.CharField(max_length=40, blank=True)
    full_name = models.CharField(max_length=120, blank=True)
    department = models.CharField(max_length=80, blank=True)
    designation = models.CharField(max_length=80, blank=True)
    mobile = models.CharField(max_length=20, blank=True)
    email = models.EmailField(max_length=120, blank=True)

    class Meta:
        db_table = "bss_staff_profile"

    def __str__(self):
        return self.full_name or str(self.user_id)
