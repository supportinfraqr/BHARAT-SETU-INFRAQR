"""Worker on-boarding / profile domain models: identity, address/mobility,
family/dependants, social security, welfare & safety, banking, classification,
employment, skills & employability, other (consent/registration), documents
and their masters."""

from django.db import models

from .auth import User
from .relationship import Site


class WorkerIdentity(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="worker_identity",
                                limit_choices_to={"role": "worker"})
    bss_worker_id = models.CharField(max_length=20, unique=True)
    qr_token = models.CharField(max_length=64, unique=True, blank=True, null=True, editable=False)
    name = models.CharField(max_length=120, blank=True)
    gender = models.CharField(max_length=10, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    age = models.SmallIntegerField(null=True, blank=True)
    mobile_number = models.CharField(max_length=20, blank=True)
    alternate_mobile = models.CharField(max_length=20, blank=True)
    email = models.EmailField(max_length=120, blank=True)
    marital_status = models.CharField(max_length=20, blank=True)
    father_name = models.CharField(max_length=120, blank=True)
    mother_name = models.CharField(max_length=120, blank=True)
    spouse_name = models.CharField(max_length=120, blank=True)
    emergency_contact_name = models.CharField(max_length=120, blank=True)
    emergency_contact_number = models.CharField(max_length=20, blank=True)
    emergency_contact_relation = models.CharField(max_length=60, blank=True)
    disability_status = models.CharField(max_length=40, blank=True)
    disability_type_pct = models.CharField(max_length=80, blank=True)
    blood_group = models.CharField(max_length=10, blank=True)
    religion = models.CharField(max_length=40, blank=True)
    caste = models.CharField(max_length=40, blank=True)
    photo = models.CharField(max_length=255, blank=True)
    pan = models.CharField(max_length=20, blank=True)
    aadhaar = models.CharField(max_length=20, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    place_of_birth = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "worker_identity"

    def save(self, *args, **kwargs):
        if not self.qr_token:
            import uuid
            self.qr_token = uuid.uuid4().hex + uuid.uuid4().hex[:8]
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name or self.bss_worker_id


class WorkerAddressMobility(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="worker_address",
                                limit_choices_to={"role": "worker"})
    current_address = models.CharField(max_length=255, blank=True)
    current_state = models.CharField(max_length=60, blank=True)
    current_district = models.CharField(max_length=60, blank=True)
    current_city = models.CharField(max_length=60, blank=True)
    current_pincode = models.CharField(max_length=10, blank=True)
    permanent_address = models.CharField(max_length=255, blank=True)
    permanent_state = models.CharField(max_length=60, blank=True)
    permanent_district = models.CharField(max_length=60, blank=True)
    permanent_city = models.CharField(max_length=60, blank=True)
    permanent_pincode = models.CharField(max_length=10, blank=True)
    migrant_worker = models.BooleanField(null=True, blank=True)
    migration_type = models.CharField(max_length=40, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "worker_address_mobility"

    def __str__(self):
        return str(self.user_id)


class WorkerFamilyDependant(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="family_dependants")
    family_members_count = models.SmallIntegerField(null=True, blank=True)
    dependants_count = models.SmallIntegerField(null=True, blank=True)
    name = models.CharField(max_length=120, blank=True)
    dependant = models.CharField(max_length=40, blank=True)
    relation = models.CharField(max_length=60, blank=True)
    nominee_age = models.SmallIntegerField(null=True, blank=True)
    nominee_dob = models.DateField(null=True, blank=True)
    contact = models.CharField(max_length=20, blank=True)
    address = models.CharField(max_length=255, blank=True)
    nominee = models.BooleanField(null=True, blank=True)
    nominee_type = models.CharField(max_length=40, blank=True)
    pan_copy_nominee = models.BooleanField(null=True, blank=True)
    aadhaar_copy_nominee = models.BooleanField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "worker_family_dependants"

    def __str__(self):
        return f"{self.user_id}: {self.name or ''}"


class WorkerSocialSecurity(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="social_security")
    epfo_uan = models.CharField(max_length=40, blank=True)
    esic_ip_number = models.CharField(max_length=40, blank=True)
    lwf_no = models.CharField(max_length=40, blank=True)
    wc_policy_no = models.CharField(max_length=40, blank=True)
    e_shram_no = models.CharField(max_length=40, blank=True)
    bocw_reg_number = models.CharField(max_length=40, blank=True)
    state_worker_id = models.CharField(max_length=40, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "worker_social_security"

    def __str__(self):
        return str(self.user_id)


class WorkerWelfareSafety(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="welfare_safety")
    ppe_required = models.BooleanField(null=True, blank=True)
    types_of_ppe_given = models.CharField(max_length=120, blank=True)
    safety_training_completed = models.BooleanField(null=True, blank=True)
    site_induction_status = models.CharField(max_length=40, blank=True)
    insurance_status = models.CharField(max_length=40, blank=True)
    accomodation_provided = models.CharField(max_length=40, blank=True)
    police_verification = models.CharField(max_length=40, blank=True)
    training_date = models.DateField(null=True, blank=True)
    trainer_name = models.CharField(max_length=120, blank=True)
    temp_gatepass_status = models.CharField(max_length=40, blank=True)
    tgp_no = models.CharField(max_length=40, blank=True)
    temp_gatepass_start_date = models.DateField(null=True, blank=True)
    temp_gatepass_end_date = models.DateField(null=True, blank=True)
    permanent_gatepass_status = models.CharField(max_length=40, blank=True)
    pgp_no = models.CharField(max_length=40, blank=True)
    permanent_gatepass_start_date = models.DateField(null=True, blank=True)
    permanent_gatepass_end_date = models.DateField(null=True, blank=True)
    medical_examination_status = models.CharField(max_length=40, blank=True)
    last_medical_examination = models.DateField(null=True, blank=True)
    medical_fitness_status = models.CharField(max_length=40, blank=True)
    next_medical_due = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "worker_welfare_safety"

    def __str__(self):
        return str(self.user_id)


class WorkerBanking(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="banking")
    bank_name = models.CharField(max_length=120, blank=True)
    bank_account_holder_name = models.CharField(max_length=120, blank=True)
    bank_account_number = models.CharField(max_length=40, blank=True)
    ifsc_code = models.CharField(max_length=20, blank=True)
    bank_verification_status = models.CharField(max_length=40, blank=True)
    upi_enabled = models.BooleanField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "worker_banking"

    def __str__(self):
        return str(self.user_id)


class WorkerClassification(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="classification")
    worker_category = models.CharField(max_length=60, blank=True)
    sector = models.CharField(max_length=80, blank=True)
    industry = models.CharField(max_length=80, blank=True)
    occupation = models.CharField(max_length=80, blank=True)
    skill = models.CharField(max_length=80, blank=True)
    current_employment_status = models.CharField(max_length=40, blank=True)
    total_worker_experience = models.CharField(max_length=40, blank=True)
    gig_platform_worker_id = models.CharField(max_length=60, blank=True)
    gig_platform_name = models.CharField(max_length=120, blank=True)
    gig_platform_type = models.CharField(max_length=60, blank=True)
    gig_date_joined_platform = models.DateField(null=True, blank=True)
    gig_avg_hours_per_day = models.CharField(max_length=40, blank=True)
    gig_avg_days_per_week = models.CharField(max_length=40, blank=True)
    gig_service_area = models.CharField(max_length=120, blank=True)
    gig_vehicle_type = models.CharField(max_length=60, blank=True)
    gig_vehicle_ownership = models.CharField(max_length=40, blank=True)
    gig_dl_number = models.CharField(max_length=40, blank=True)
    gig_dl_expiry = models.DateField(null=True, blank=True)
    se_business_name = models.CharField(max_length=120, blank=True)
    se_business_type = models.CharField(max_length=60, blank=True)
    se_registration_status = models.CharField(max_length=40, blank=True)
    se_start_date = models.DateField(null=True, blank=True)
    se_business_location = models.CharField(max_length=120, blank=True)
    se_avg_hours_per_day = models.CharField(max_length=40, blank=True)
    se_avg_days_per_week = models.CharField(max_length=40, blank=True)
    se_num_employees = models.SmallIntegerField(null=True, blank=True)
    se_employer_or_business_name = models.CharField(max_length=120, blank=True)
    season_job_work_type = models.CharField(max_length=80, blank=True)
    season_start_date = models.DateField(null=True, blank=True)
    season_end_date = models.DateField(null=True, blank=True)
    season_avg_hours_per_day = models.CharField(max_length=40, blank=True)
    season_avg_days_per_week = models.CharField(max_length=40, blank=True)
    season_work_location = models.CharField(max_length=120, blank=True)
    season_expected_income = models.CharField(max_length=40, blank=True)
    season_payment_frequency = models.CharField(max_length=40, blank=True)
    payment_mode = models.CharField(max_length=40, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "worker_classification"

    def __str__(self):
        return str(self.user_id)


class WorkerEmployment(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="employments")
    assignment = models.ForeignKey("WorkerContractorBinding", on_delete=models.SET_NULL,
                                   null=True, blank=True, related_name="employments")
    camp_no = models.CharField(max_length=40, blank=True)
    shift = models.CharField(max_length=40, blank=True)
    ref_worker_id = models.CharField(max_length=40, blank=True)
    doj = models.DateField(null=True, blank=True)
    designation = models.CharField(max_length=80, blank=True)
    department = models.CharField(max_length=80, blank=True)
    id_card_issue_date = models.DateField(null=True, blank=True)
    id_card_validity_till = models.DateField(null=True, blank=True)
    transport_facility = models.CharField(max_length=40, blank=True)
    route = models.CharField(max_length=80, blank=True)
    bus_no = models.CharField(max_length=40, blank=True)
    status = models.CharField(max_length=40, blank=True)
    pf_account = models.CharField(max_length=40, blank=True)
    nature_of_job = models.CharField(max_length=120, blank=True)
    type_of_work = models.CharField(max_length=120, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "worker_employment"

    def __str__(self):
        return str(self.user_id)


class SkillMaster(models.Model):
    code = models.CharField(max_length=6, unique=True)
    sector = models.CharField(max_length=60)
    family = models.CharField(max_length=80, blank=True)
    occupation = models.CharField(max_length=120)
    typical_level = models.CharField(max_length=40, blank=True)
    industry_use = models.CharField(max_length=200, blank=True)
    description = models.CharField(max_length=300, blank=True)
    sort_order = models.SmallIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "skill_master"

    def __str__(self):
        return f"{self.code} {self.occupation}"


class WorkerSkillsEmployability(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="skills")
    qualification_course = models.CharField(max_length=120, blank=True)
    board_university = models.CharField(max_length=120, blank=True)
    passing_year = models.CharField(max_length=10, blank=True)
    primary_skill = models.CharField(max_length=80, blank=True)
    primary_skill_code = models.CharField(max_length=6, blank=True, null=True)
    secondary_skills = models.CharField(max_length=255, blank=True)
    skill_experience_years = models.CharField(max_length=20, blank=True)
    certification_name = models.CharField(max_length=120, blank=True)
    certification_number = models.CharField(max_length=60, blank=True)
    certification_authority = models.CharField(max_length=120, blank=True)
    certification_expiry = models.DateField(null=True, blank=True)
    certification_verified = models.BooleanField(default=False)
    languages_known = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "worker_skills_employability"


class WorkerEducation(models.Model):
    """Multiple education/qualification records per worker (self-declared)."""

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="educations")
    qualification_course = models.CharField(max_length=120, blank=True)
    board_university = models.CharField(max_length=120, blank=True)
    passing_year = models.CharField(max_length=10, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "worker_education"
        ordering = ["id"]


class WorkerSkill(models.Model):
    """Multiple skills/trades per worker. verified=True marks a certification
    issued through the BSS course-completion system (self-declared otherwise)."""

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="worker_skills")
    name = models.CharField(max_length=80, blank=True)
    experience_years = models.CharField(max_length=20, blank=True)
    verified = models.BooleanField(default=False)
    certification_name = models.CharField(max_length=120, blank=True)
    certification_number = models.CharField(max_length=60, blank=True)
    certification_authority = models.CharField(max_length=120, blank=True)
    certification_expiry = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "worker_skill"
        ordering = ["id"]


class WorkerOther(models.Model):
    """Consent / registration audit + QR opt-in."""

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="other")
    consent_registration = models.BooleanField(null=True, blank=True)
    consent_verification = models.BooleanField(null=True, blank=True)
    consent_date = models.DateField(null=True, blank=True)
    qr_opt_in = models.BooleanField(default=False)
    available_for_work = models.BooleanField(default=False)
    registration_source = models.CharField(max_length=80, blank=True)
    registered_by = models.CharField(max_length=120, blank=True)
    registration_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "worker_other"

    def __str__(self):
        return str(self.user_id)


class WorkerDocumentMaster(models.Model):
    code = models.CharField(max_length=6, unique=True)
    document_name = models.CharField(max_length=120)
    is_mandatory = models.BooleanField(default=False)
    uploaded_by = models.CharField(max_length=20, default="worker",
                                   choices=[("worker", "Worker"), ("system", "System")])
    sort_order = models.SmallIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "worker_document_master"

    def __str__(self):
        return f"{self.code} {self.document_name}"


class WorkerDocument(models.Model):
    """Worker/contractor document with expiry, mandatory flag, ownership & auto-gen."""
    STATUS = [("UPLOADED", "Uploaded"), ("VERIFIED", "Verified"), ("REJECTED", "Rejected"),
              ("MISSING", "Missing"), ("UNDER_VERIFICATION", "Under Verification"),
              ("EXPIRED", "Expired")]
    OWNER = [("worker", "Worker"), ("contractor", "Contractor"), ("system", "System")]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="documents")
    document = models.ForeignKey(WorkerDocumentMaster, on_delete=models.CASCADE,
                                 related_name="uploads")
    file_name = models.CharField(max_length=255, blank=True)
    file_path = models.CharField(max_length=255, blank=True)
    file_size = models.BigIntegerField(null=True, blank=True)
    mime_type = models.CharField(max_length=100, blank=True)
    status = models.CharField(max_length=20, choices=STATUS, default="UPLOADED")
    expiry_date = models.DateField(null=True, blank=True)
    is_mandatory = models.BooleanField(default=False)
    owner_role = models.CharField(max_length=20, choices=OWNER, default="worker")
    auto_generated = models.BooleanField(default=False)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "worker_documents"
        unique_together = ("user", "document", "file_name")
        indexes = [
            models.Index(fields=["user"], name="idx_worker_docs_user"),
            models.Index(fields=["document"], name="idx_worker_docs_doc"),
            models.Index(fields=["expiry_date"], name="idx_worker_docs_expiry"),
        ]

    def __str__(self):
        return self.file_name or str(self.user_id)
