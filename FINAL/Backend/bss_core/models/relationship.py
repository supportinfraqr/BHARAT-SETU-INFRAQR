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
    # Globally-unique BSS site identifier, e.g. BSS-S7KQ2M9X4RT (auto-generated).
    bss_site_id = models.CharField(max_length=20, unique=True, null=True, blank=True)
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
    site_type = models.CharField(max_length=60, blank=True)
    site_category = models.CharField(max_length=60, blank=True)
    shift_model = models.CharField(max_length=40, blank=True)
    working_days = models.CharField(max_length=40, blank=True)
    gate_timing = models.CharField(max_length=40, blank=True)
    workforce_model = models.CharField(max_length=60, blank=True)
    compliance_client = models.CharField(max_length=120, blank=True)
    statutory_applicability = models.CharField(max_length=255, blank=True)
    reporting_period = models.CharField(max_length=40, blank=True)
    preferred_calendar = models.CharField(max_length=40, blank=True)
    # Restricted Holiday (RH) policy: how many optional holidays are offered to
    # workers at this site, and how many they may actually avail per year (with
    # prior contractor approval).
    restricted_holiday_allotment = models.PositiveSmallIntegerField(default=4)
    restricted_holiday_max_avail = models.PositiveSmallIntegerField(default=2)
    # Weekly off days for the site, comma-separated day codes (MON..SUN).
    weekly_off_days = models.CharField(max_length=40, blank=True, default="SUN")
    project_head = models.CharField(max_length=120, blank=True)
    site_hr = models.CharField(max_length=120, blank=True)
    safety_officer = models.CharField(max_length=120, blank=True)
    attendance_enabled = models.BooleanField(default=True)
    attendance_method = models.CharField(max_length=40, blank=True)
    attendance_device_count = models.SmallIntegerField(default=0)
    attendance_coverage = models.CharField(max_length=40, blank=True)
    attendance_daily_sync = models.BooleanField(default=False)
    billing_contractor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                                           related_name="billing_sites",
                                           limit_choices_to={"role": "contractor"})
    accommodation_camp = models.BooleanField(default=False)
    canteen_facility = models.BooleanField(default=False)
    tool_store = models.BooleanField(default=False)
    welfare_room = models.BooleanField(default=False)
    medical_room = models.BooleanField(default=False)

    # --- Basic Site Identification (Site Detail sheet) ---
    site_display_name = models.CharField(max_length=120, blank=True)
    internal_location_code = models.CharField(max_length=40, blank=True)
    parent_company = models.CharField(max_length=120, blank=True)
    business_unit = models.CharField(max_length=120, blank=True)
    division = models.CharField(max_length=120, blank=True)
    department = models.CharField(max_length=120, blank=True)
    cost_centre = models.CharField(max_length=120, blank=True)
    profit_centre = models.CharField(max_length=120, blank=True)
    project_code = models.CharField(max_length=120, blank=True)
    erp_site_code = models.CharField(max_length=120, blank=True)
    site_status = models.CharField(max_length=40, blank=True)
    site_start_date = models.DateField(null=True, blank=True)
    expected_end_date = models.DateField(null=True, blank=True)
    actual_start_date = models.DateField(null=True, blank=True)
    actual_completion_date = models.DateField(null=True, blank=True)

    # --- Site Classification ---
    primary_industry = models.CharField(max_length=120, blank=True)
    sub_industry = models.CharField(max_length=120, blank=True)
    site_nature = models.CharField(max_length=160, blank=True)  # Permanent/Temporary/Project/Mobile/...

    # --- Location & Jurisdiction ---
    country = models.CharField(max_length=60, blank=True)
    tehsil_taluka = models.CharField(max_length=60, blank=True)
    village = models.CharField(max_length=60, blank=True)
    landmark = models.CharField(max_length=120, blank=True)
    geo_fence_radius = models.IntegerField(null=True, blank=True)
    site_boundary_coordinates = models.TextField(blank=True)
    labour_jurisdiction = models.CharField(max_length=120, blank=True)
    labour_office = models.CharField(max_length=120, blank=True)
    pf_office = models.CharField(max_length=120, blank=True)
    esic_office = models.CharField(max_length=120, blank=True)
    police_station = models.CharField(max_length=120, blank=True)
    fire_department = models.CharField(max_length=120, blank=True)

    # --- Principal Employer Details ---
    legal_entity_name = models.CharField(max_length=120, blank=True)
    employer_trade_name = models.CharField(max_length=120, blank=True)
    employer_code = models.CharField(max_length=40, blank=True)
    employer_cin = models.CharField(max_length=40, blank=True)
    employer_pan = models.CharField(max_length=20, blank=True)
    employer_gstin = models.CharField(max_length=20, blank=True)
    employer_lin = models.CharField(max_length=40, blank=True)
    epfo_establishment_code = models.CharField(max_length=40, blank=True)
    esic_employer_code = models.CharField(max_length=40, blank=True)
    factory_registration_number = models.CharField(max_length=60, blank=True)
    labour_registration_number = models.CharField(max_length=60, blank=True)
    authorized_signatory = models.CharField(max_length=120, blank=True)
    authorization_letter = models.CharField(max_length=255, blank=True)

    # --- Site Management Team ---
    site_head = models.CharField(max_length=120, blank=True)
    hr_head = models.CharField(max_length=120, blank=True)
    admin_head = models.CharField(max_length=120, blank=True)
    ehs_head = models.CharField(max_length=120, blank=True)
    security_head = models.CharField(max_length=120, blank=True)
    compliance_officer = models.CharField(max_length=120, blank=True)
    payroll_spoc = models.CharField(max_length=120, blank=True)
    contractor_management_spoc = models.CharField(max_length=120, blank=True)
    medical_officer = models.CharField(max_length=120, blank=True)
    emergency_coordinator = models.CharField(max_length=120, blank=True)
    fire_safety_officer = models.CharField(max_length=120, blank=True)

    # --- Workforce Configuration ---
    direct_employees = models.IntegerField(null=True, blank=True)
    contract_workers = models.IntegerField(null=True, blank=True)
    apprentices = models.IntegerField(null=True, blank=True)
    trainees = models.IntegerField(null=True, blank=True)
    interns = models.IntegerField(null=True, blank=True)
    consultants = models.IntegerField(null=True, blank=True)
    temporary_workers = models.IntegerField(null=True, blank=True)
    casual_workers = models.IntegerField(null=True, blank=True)
    daily_wage_workers = models.IntegerField(null=True, blank=True)
    migrant_workers = models.IntegerField(null=True, blank=True)
    interstate_migrant_workers = models.IntegerField(null=True, blank=True)
    foreign_workers = models.IntegerField(null=True, blank=True)
    gig_workers = models.IntegerField(null=True, blank=True)
    women_workers = models.IntegerField(null=True, blank=True)
    night_shift_workers = models.IntegerField(null=True, blank=True)
    minimum_workforce = models.IntegerField(null=True, blank=True)
    average_workforce = models.IntegerField(null=True, blank=True)
    maximum_workforce = models.IntegerField(null=True, blank=True)

    # --- Contractor & Vendor Configuration ---
    contractors_deployed = models.BooleanField(null=True, blank=True)
    expected_active_contractors = models.IntegerField(null=True, blank=True)
    maximum_contractors = models.IntegerField(null=True, blank=True)
    labour_contractors = models.IntegerField(null=True, blank=True)
    service_contractors = models.IntegerField(null=True, blank=True)
    manpower_suppliers = models.IntegerField(null=True, blank=True)
    subcontractors_allowed = models.BooleanField(null=True, blank=True)
    contractor_prequalification = models.BooleanField(null=True, blank=True)
    compliance_audit_required = models.BooleanField(null=True, blank=True)
    worker_approval_required = models.BooleanField(null=True, blank=True)
    document_verification_required = models.BooleanField(null=True, blank=True)
    site_induction_mandatory = models.BooleanField(null=True, blank=True)
    medical_fitness_mandatory = models.BooleanField(null=True, blank=True)
    training_mandatory = models.BooleanField(null=True, blank=True)
    insurance_verification_required = models.BooleanField(null=True, blank=True)
    monthly_compliance_submission = models.BooleanField(null=True, blank=True)

    # --- Project & Construction Details ---
    project_name = models.CharField(max_length=120, blank=True)
    project_owner = models.CharField(max_length=120, blank=True)
    pmc_consultant = models.CharField(max_length=120, blank=True)
    epc_contractor = models.CharField(max_length=120, blank=True)
    main_contractor = models.CharField(max_length=120, blank=True)
    project_value = models.DecimalField(max_digits=16, decimal_places=2, null=True, blank=True)
    estimated_labour_cost = models.DecimalField(max_digits=16, decimal_places=2, null=True, blank=True)
    work_order_number = models.CharField(max_length=80, blank=True)
    work_order_date = models.DateField(null=True, blank=True)
    contract_start_date = models.DateField(null=True, blank=True)
    contract_end_date = models.DateField(null=True, blank=True)
    nature_of_work = models.CharField(max_length=255, blank=True)
    built_up_area = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    number_of_floors = models.IntegerField(null=True, blank=True)
    building_height = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    excavation_depth = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    # --- Industry Specific Details ---
    manufacturing_process = models.TextField(blank=True)
    product_manufactured = models.CharField(max_length=120, blank=True)
    production_capacity = models.CharField(max_length=80, blank=True)
    hazardous_process = models.BooleanField(null=True, blank=True)
    factory_occupier = models.CharField(max_length=120, blank=True)
    factory_manager = models.CharField(max_length=120, blank=True)
    mine_type = models.CharField(max_length=80, blank=True)
    mineral = models.CharField(max_length=80, blank=True)
    mine_lease_number = models.CharField(max_length=80, blank=True)
    warehouse_area = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    storage_capacity = models.CharField(max_length=80, blank=True)
    hazardous_goods = models.BooleanField(null=True, blank=True)
    power_plant_capacity_mw = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    oil_gas_facility_type = models.CharField(max_length=80, blank=True)
    hospital_beds = models.IntegerField(null=True, blank=True)
    office_seating_capacity = models.IntegerField(null=True, blank=True)

    # --- Shift & Working Hours ---
    shift_applicable = models.BooleanField(null=True, blank=True)
    general_shift_start = models.TimeField(null=True, blank=True)
    general_shift_end = models.TimeField(null=True, blank=True)
    morning_shift = models.CharField(max_length=40, blank=True)
    evening_shift = models.CharField(max_length=40, blank=True)
    night_shift = models.CharField(max_length=40, blank=True)
    weekly_off_pattern = models.CharField(max_length=40, blank=True)
    holiday_calendar = models.CharField(max_length=255, blank=True)
    overtime_allowed = models.BooleanField(null=True, blank=True)
    ot_approval_required = models.BooleanField(null=True, blank=True)
    maximum_ot_hours = models.IntegerField(null=True, blank=True)

    # --- Gate & Access (single-value counts; individual gates in SiteGate) ---
    number_of_gates = models.IntegerField(null=True, blank=True)

    # --- Attendance Configuration ---
    geo_fencing = models.BooleanField(null=True, blank=True)
    grace_period = models.IntegerField(null=True, blank=True)
    late_coming_rule = models.CharField(max_length=80, blank=True)
    early_exit_rule = models.CharField(max_length=80, blank=True)
    missing_punch_rule = models.CharField(max_length=80, blank=True)
    half_day_rule = models.CharField(max_length=80, blank=True)
    ot_attendance_rule = models.CharField(max_length=80, blank=True)

    # --- Gate Pass Configuration ---
    temporary_gate_pass = models.BooleanField(null=True, blank=True)
    permanent_gate_pass = models.BooleanField(null=True, blank=True)
    project_gate_pass = models.BooleanField(null=True, blank=True)
    contractor_based_pass = models.BooleanField(null=True, blank=True)
    gatepass_worker_verification_required = models.BooleanField(null=True, blank=True)
    gatepass_site_induction_required = models.BooleanField(null=True, blank=True)
    gatepass_medical_fitness_required = models.BooleanField(null=True, blank=True)
    gatepass_safety_training_required = models.BooleanField(null=True, blank=True)
    ppe_required_before_entry = models.BooleanField(null=True, blank=True)
    pass_validity = models.CharField(max_length=40, blank=True)

    # --- Safety & EHS ---
    risk_category = models.CharField(max_length=80, blank=True)
    work_at_height = models.BooleanField(null=True, blank=True)
    confined_space = models.BooleanField(null=True, blank=True)
    hot_work = models.BooleanField(null=True, blank=True)
    electrical_work = models.BooleanField(null=True, blank=True)
    excavation = models.BooleanField(null=True, blank=True)
    lifting_operations = models.BooleanField(null=True, blank=True)
    chemical_handling = models.BooleanField(null=True, blank=True)
    hazardous_material = models.BooleanField(null=True, blank=True)
    ppe_requirements = models.CharField(max_length=255, blank=True)
    permit_to_work_required = models.BooleanField(null=True, blank=True)

    # --- Training & Induction ---
    safety_induction = models.BooleanField(null=True, blank=True)
    fire_safety = models.BooleanField(null=True, blank=True)
    emergency_response_training = models.BooleanField(null=True, blank=True)
    ppe_training = models.BooleanField(null=True, blank=True)
    job_specific_training = models.BooleanField(null=True, blank=True)
    training_validity = models.IntegerField(null=True, blank=True)
    refresher_period = models.IntegerField(null=True, blank=True)
    assessment_required = models.BooleanField(null=True, blank=True)
    minimum_passing_score = models.IntegerField(null=True, blank=True)
    digital_certificate = models.BooleanField(null=True, blank=True)

    # --- Medical & Welfare (remaining) ---
    pre_employment_medical = models.BooleanField(null=True, blank=True)
    periodic_medical = models.BooleanField(null=True, blank=True)
    ambulance = models.BooleanField(null=True, blank=True)
    first_aid_facility = models.BooleanField(null=True, blank=True)
    drinking_water = models.BooleanField(null=True, blank=True)
    rest_area = models.BooleanField(null=True, blank=True)
    toilets = models.BooleanField(null=True, blank=True)
    separate_toilets = models.BooleanField(null=True, blank=True)
    changing_room = models.BooleanField(null=True, blank=True)
    creche = models.BooleanField(null=True, blank=True)
    transport = models.BooleanField(null=True, blank=True)

    # --- Labour Compliance ---
    applicable_state = models.CharField(max_length=60, blank=True)
    scheduled_employment = models.CharField(max_length=120, blank=True)
    minimum_wage_zone = models.CharField(max_length=80, blank=True)
    epfo_applicable = models.BooleanField(null=True, blank=True)
    esic_applicable = models.BooleanField(null=True, blank=True)
    clra_applicable = models.BooleanField(null=True, blank=True)
    bocw_applicable = models.BooleanField(null=True, blank=True)
    factory_compliance_applicable = models.BooleanField(null=True, blank=True)
    shops_establishment_applicable = models.BooleanField(null=True, blank=True)
    interstate_migrant_compliance = models.BooleanField(null=True, blank=True)
    compliance_frequency = models.CharField(max_length=80, blank=True)

    # --- Documents & Licences (flags) ---
    document_expiry_tracking = models.BooleanField(null=True, blank=True)
    renewal_reminder = models.BooleanField(null=True, blank=True)

    # --- Emergency Management ---
    emergency_control_room = models.CharField(max_length=120, blank=True)
    emergency_contact = models.CharField(max_length=20, blank=True)
    nearest_hospital = models.CharField(max_length=120, blank=True)
    ambulance_provider = models.CharField(max_length=120, blank=True)
    muster_points = models.CharField(max_length=255, blank=True)
    evacuation_plan = models.CharField(max_length=255, blank=True)
    fire_emergency = models.BooleanField(null=True, blank=True)
    medical_emergency = models.BooleanField(null=True, blank=True)
    industrial_accident = models.BooleanField(null=True, blank=True)
    chemical_gas_leak = models.BooleanField(null=True, blank=True)
    natural_disaster = models.BooleanField(null=True, blank=True)

    # --- BSS Module Activation ---
    module_worker_onboarding = models.BooleanField(null=True, blank=True)
    module_contractor_management = models.BooleanField(null=True, blank=True)
    module_universal_worker_id = models.BooleanField(null=True, blank=True)
    module_worker_qr_card = models.BooleanField(null=True, blank=True)
    module_contractor_qr_scanner = models.BooleanField(null=True, blank=True)
    module_attendance = models.BooleanField(null=True, blank=True)
    module_gate_pass = models.BooleanField(null=True, blank=True)
    module_dynamic_qr = models.BooleanField(null=True, blank=True)
    module_face_verification = models.BooleanField(null=True, blank=True)
    module_document_management = models.BooleanField(null=True, blank=True)
    module_compliance_management = models.BooleanField(null=True, blank=True)
    module_payroll_integration = models.BooleanField(null=True, blank=True)
    module_wage_validation = models.BooleanField(null=True, blank=True)
    module_skill_training = models.BooleanField(null=True, blank=True)
    module_medical_management = models.BooleanField(null=True, blank=True)
    module_grievance_management = models.BooleanField(null=True, blank=True)
    module_safety_ehs = models.BooleanField(null=True, blank=True)
    module_audit_management = models.BooleanField(null=True, blank=True)
    module_reports_analytics = models.BooleanField(null=True, blank=True)

    # --- Site Contacts (remaining) ---
    plant_head = models.CharField(max_length=120, blank=True)

    # --- Creation extras ---
    site_creation_type = models.CharField(max_length=80, blank=True)
    required_automation = models.CharField(max_length=255, blank=True)
    assign_color = models.CharField(max_length=20, blank=True)

    # --- Contractor Controls ---
    contractor_types_allowed = models.CharField(max_length=255, blank=True)
    maximum_contractors_allowed = models.IntegerField(null=True, blank=True)
    maximum_workers_at_site = models.IntegerField(null=True, blank=True)

    # --- Safety & Security ---
    ppe_mandatory = models.BooleanField(null=True, blank=True)
    types_of_ppe = models.CharField(max_length=255, blank=True)
    safety_training_required = models.BooleanField(null=True, blank=True)
    police_verification_required = models.BooleanField(null=True, blank=True)
    id_card_issuance_required = models.BooleanField(null=True, blank=True)

    # --- Site Documents ---
    nearest_labour_office = models.CharField(max_length=120, blank=True)
    site_document_submission_day = models.CharField(max_length=40, blank=True)
    site_document_reminder_days = models.IntegerField(null=True, blank=True)
    contractor_upload_restriction = models.BooleanField(null=True, blank=True)

    # --- Approval & Go-Live ---
    created_by = models.CharField(max_length=120, blank=True)
    site_admin_review = models.CharField(max_length=40, blank=True)
    hr_review = models.CharField(max_length=40, blank=True)
    compliance_review = models.CharField(max_length=40, blank=True)
    ehs_review = models.CharField(max_length=40, blank=True)
    principal_employer_approval = models.CharField(max_length=40, blank=True)
    bss_activation = models.CharField(max_length=40, blank=True)
    go_live_date = models.DateField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "site"

    def save(self, *args, **kwargs):
        if not self.site_qr_token:
            import uuid
            self.site_qr_token = str(uuid.uuid4())
        if not self.bss_site_id:
            from api import bss_ids
            self.bss_site_id = bss_ids.new_bss_site_code()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.site_code} ({self.site_name})"


class SiteGate(models.Model):
    """Individual gate at a site (Site Detail sheet — Gate & Access Configuration)."""
    site = models.ForeignKey(Site, on_delete=models.CASCADE, related_name="gates")
    name = models.CharField(max_length=80, blank=True)
    gate_type = models.CharField(max_length=40, blank=True)
    location = models.CharField(max_length=120, blank=True)
    direction = models.CharField(max_length=40, blank=True)  # Entry/Exit/Both
    operating_hours = models.CharField(max_length=40, blank=True)
    qr_access = models.BooleanField(null=True, blank=True)
    dynamic_qr = models.BooleanField(null=True, blank=True)
    rfid = models.BooleanField(null=True, blank=True)
    biometric = models.BooleanField(null=True, blank=True)
    face_recognition = models.BooleanField(null=True, blank=True)
    smart_card = models.BooleanField(null=True, blank=True)
    mobile_access = models.BooleanField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "site_gate"

    def __str__(self):
        return f"{self.name or 'Gate'} ({self.site_id})"


class SiteLicense(models.Model):
    """Licence held at a site (Site Detail sheet — License Details)."""
    site = models.ForeignKey(Site, on_delete=models.CASCADE, related_name="licenses")
    license_name = models.CharField(max_length=120, blank=True)
    license_status = models.CharField(max_length=40, blank=True)
    license_date = models.DateField(null=True, blank=True)
    license_number = models.CharField(max_length=80, blank=True)
    validity_start_date = models.DateField(null=True, blank=True)
    validity_end_date = models.DateField(null=True, blank=True)
    license_cost = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    security_deposit_amount = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    license_copy = models.CharField(max_length=255, blank=True)
    amendment_copy = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "site_license"

    def __str__(self):
        return f"{self.license_name or 'Licence'} ({self.site_id})"


class SiteOrder(models.Model):
    """Work order against a site (Site Detail sheet — Order Details)."""
    site = models.ForeignKey(Site, on_delete=models.CASCADE, related_name="orders")
    order_number = models.CharField(max_length=80, blank=True)
    order_qty = models.CharField(max_length=40, blank=True)  # no. of manpower
    order_value = models.DecimalField(max_digits=16, decimal_places=2, null=True, blank=True)
    validity_from = models.DateField(null=True, blank=True)
    validity_to = models.DateField(null=True, blank=True)
    order_copy = models.CharField(max_length=255, blank=True)
    supervisor_name = models.CharField(max_length=120, blank=True)
    supervisor_number = models.CharField(max_length=20, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "site_order"

    def __str__(self):
        return f"{self.order_number or 'Order'} ({self.site_id})"


class SiteDocument(models.Model):
    """Site-level document / licence upload (Site Detail sheet — Documents & Licences)."""
    site = models.ForeignKey(Site, on_delete=models.CASCADE, related_name="documents")
    doc_type = models.CharField(max_length=80, blank=True)
    file_path = models.CharField(max_length=255, blank=True)
    expiry_date = models.DateField(null=True, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "site_document"

    def __str__(self):
        return f"{self.doc_type or 'Document'} ({self.site_id})"


class SiteClraRegistration(models.Model):
    """Contract Labour (Regulation & Abolition) Act registration for a site."""
    site = models.ForeignKey(Site, on_delete=models.CASCADE, related_name="clra_registrations")
    clra_registration_no = models.CharField(max_length=80, blank=True)
    pe_registration_number = models.CharField(max_length=80, blank=True)
    issuing_authority = models.CharField(max_length=120, blank=True)
    maximum_contract_workers = models.IntegerField(null=True, blank=True)
    validity_from = models.DateField(null=True, blank=True)
    validity_to = models.DateField(null=True, blank=True)
    rc_copy = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "site_clra_registration"

    def __str__(self):
        return f"CLRA {self.clra_registration_no or ''} ({self.site_id})"


class SiteBocwRegistration(models.Model):
    """BOCW (Building & Other Construction Workers) registration for a site."""
    site = models.ForeignKey(Site, on_delete=models.CASCADE, related_name="bocw_registrations")
    bocw_registration_no = models.CharField(max_length=80, blank=True)
    issuing_authority = models.CharField(max_length=120, blank=True)
    maximum_workers = models.IntegerField(null=True, blank=True)
    validity_from = models.DateField(null=True, blank=True)
    validity_to = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "site_bocw_registration"

    def __str__(self):
        return f"BOCW {self.bocw_registration_no or ''} ({self.site_id})"


class WorkerContractorBinding(models.Model):
    """Links worker <-> contractor <-> site. Drives RBAC binding_scope.
    One worker = one ACTIVE site (partial unique index). Employer derived via site."""

    STATUS = [("PENDING", "Pending"), ("ACCEPTED", "Accepted"),
              ("REJECTED", "Rejected"), ("CANCELLED", "Cancelled"), ("EXPIRED", "Expired")]
    CONSENT_METHOD = [("app", "App"), ("ivr", "IVR"), ("sms_otp", "SMS OTP"), ("voice", "Voice")]
    INITIATOR = [("worker", "Worker"), ("contractor", "Contractor")]

    worker = models.ForeignKey(User, on_delete=models.CASCADE, related_name="worker_bindings",
                               limit_choices_to={"role": "worker"})
    contractor = models.ForeignKey(User, on_delete=models.CASCADE, related_name="contractor_bindings",
                                   limit_choices_to={"role": "contractor"})
    site = models.ForeignKey(Site, on_delete=models.CASCADE, related_name="bindings")
    binding_status = models.CharField(max_length=20, choices=STATUS, default="PENDING")
    # Who raised the request (worker scanned a contractor QR / applied to a job =
    # worker; contractor scanned a worker QR / added the worker = contractor).
    # Stored because two-sided consent makes the initiator unrecoverable later.
    initiated_by = models.CharField(max_length=20, choices=INITIATOR, blank=True, default="")
    consent_worker = models.BooleanField(default=False)
    consent_contractor = models.BooleanField(default=False)
    consent_method = models.CharField(max_length=20, choices=CONSENT_METHOD, null=True, blank=True)
    # Offered terms captured when the binding is created (drive the worker's
    # Current Employment Details and the binding card).
    designation = models.CharField(max_length=80, blank=True)
    department = models.CharField(max_length=80, blank=True)
    shift = models.CharField(max_length=40, blank=True)
    offered_wage = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    accepted_at = models.DateTimeField(null=True, blank=True)
    # Who declined the request and when (worker / contractor).
    rejected_by = models.CharField(max_length=20, blank=True)
    rejected_at = models.DateTimeField(null=True, blank=True)
    # Two-sided unbinding: a binding is cancelled only when both sides consent.
    unbind_requested_at = models.DateTimeField(null=True, blank=True)
    unbind_requested_by = models.CharField(max_length=20, blank=True)
    unbind_consent_worker = models.BooleanField(default=False)
    unbind_consent_contractor = models.BooleanField(default=False)
    unbound_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "worker_contractor_binding"
        constraints = [
            # Only one *live* request per (worker, contractor, site) at a time.
            # Terminal rows (rejected/cancelled/expired) are kept as history, so a
            # fresh request after a decline creates a new PENDING row instead of
            # overwriting the declined one.
            models.UniqueConstraint(
                fields=["worker", "contractor", "site"],
                condition=models.Q(binding_status__in=["PENDING", "ACCEPTED"]),
                name="uq_binding_ecsw_active",
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


class ContractorEmployerBinding(models.Model):
    """Direct contractor <-> employer engagement (two-sided consent). Sites are
    allotted separately via ContractorSiteAllotment."""

    STATUS = [("PENDING", "Pending"), ("ACCEPTED", "Accepted"),
              ("REJECTED", "Rejected"), ("CANCELLED", "Cancelled")]
    SOURCE = [("employer_qr", "Employer QR"), ("contractor_qr", "Contractor QR"),
              ("site_qr", "Site QR")]

    contractor = models.ForeignKey(User, on_delete=models.CASCADE,
                                   related_name="employer_bindings",
                                   limit_choices_to={"role": "contractor"})
    employer = models.ForeignKey(User, on_delete=models.CASCADE,
                                 related_name="contractor_bindings_direct",
                                 limit_choices_to={"role": "employer"})
    binding_status = models.CharField(max_length=20, choices=STATUS, default="PENDING")
    consent_contractor = models.BooleanField(default=False)
    consent_employer = models.BooleanField(default=False)
    consent_method = models.CharField(max_length=20, null=True, blank=True)
    source = models.CharField(max_length=20, choices=SOURCE, default="site_qr")
    # Employer's saved secondary-contractor selection for this binding (the
    # tickboxes in the Site permissions dialog) — a list of CE binding ids.
    secondary_binding_ids = models.JSONField(default=list, blank=True)
    accepted_at = models.DateTimeField(null=True, blank=True)
    # Who declined the request and when (contractor / employer).
    rejected_by = models.CharField(max_length=20, blank=True)
    rejected_at = models.DateTimeField(null=True, blank=True)
    # Two-sided unbinding: a binding is cancelled only when both sides consent.
    unbind_requested_at = models.DateTimeField(null=True, blank=True)
    unbind_requested_by = models.CharField(max_length=20, blank=True)
    unbind_consent_contractor = models.BooleanField(default=False)
    unbind_consent_employer = models.BooleanField(default=False)
    unbound_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "contractor_employer_binding"
        constraints = [
            # Only one live request per contractor<->employer; rejected/cancelled
            # rows are preserved so a re-request creates a new PENDING row.
            models.UniqueConstraint(fields=["contractor", "employer"],
                                    condition=models.Q(binding_status__in=["PENDING", "ACCEPTED"]),
                                    name="uq_contractor_employer_active"),
        ]

    def __str__(self):
        return f"C{self.contractor_id}-E{self.employer_id} {self.binding_status}"


class ContractorSiteAllotment(models.Model):
    """A site the employer allots to a bound contractor (one row per site)."""

    STATUS = [("PENDING", "Pending"), ("APPROVED", "Approved"), ("REJECTED", "Rejected"),
              ("RELEASED", "Released")]
    SOURCE = [("site_qr", "Site QR"), ("employer_allot", "Employer Allotment"),
              ("contractor_request", "Contractor Request")]

    binding = models.ForeignKey(ContractorEmployerBinding, on_delete=models.CASCADE,
                                related_name="allotments")
    site = models.ForeignKey(Site, on_delete=models.CASCADE,
                             related_name="contractor_allotments")
    status = models.CharField(max_length=20, choices=STATUS, default="PENDING")
    source = models.CharField(max_length=20, choices=SOURCE, default="site_qr")
    approved_at = models.DateTimeField(null=True, blank=True)
    # Two-sided site release: the contractor asks to give an approved site back
    # and the employer approves it (the allotment then becomes RELEASED).
    release_requested_at = models.DateTimeField(null=True, blank=True)
    release_requested_by = models.CharField(max_length=20, blank=True)
    released_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "contractor_site_allotment"
        constraints = [
            models.UniqueConstraint(fields=["binding", "site"],
                                    name="uq_contractor_site_allotment"),
        ]

    def __str__(self):
        return f"C{self.binding.contractor_id}-S{self.site_id} {self.status}"


class ContractorJob(models.Model):
    """A job posting by a contractor, optionally scoped to a site."""
    contractor = models.ForeignKey(User, on_delete=models.CASCADE, related_name="jobs",
                                   limit_choices_to={"role": "contractor"})
    site = models.ForeignKey(Site, on_delete=models.SET_NULL, null=True, blank=True, related_name="jobs")
    job_title = models.CharField(max_length=120)
    job_description = models.CharField(max_length=500, blank=True)
    wage_offered = models.CharField(max_length=60, blank=True)
    # --- Job posting details (BSS_Feature_Comparison.xlsx, Contractor > Rozgar Setu) ---
    designation = models.CharField(max_length=120, blank=True)
    trade = models.CharField(max_length=80, blank=True)
    category = models.CharField(max_length=80, blank=True)
    workplace_type = models.CharField(max_length=40, blank=True, default="On-site")
    state = models.CharField(max_length=60, blank=True)
    city = models.CharField(max_length=60, blank=True)
    skills = models.JSONField(default=list, blank=True)
    experience = models.CharField(max_length=60, blank=True)
    dob_limit = models.CharField(max_length=80, blank=True)
    min_salary = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    max_salary = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    salary_visibility = models.CharField(max_length=30, blank=True, default="Visible to all")
    vacancies = models.PositiveIntegerField(default=1)
    duration = models.CharField(max_length=60, blank=True)
    visibility = models.CharField(max_length=20, blank=True, default="Public")
    status = models.CharField(max_length=20, blank=True, default="SUBMITTED")  # DRAFT/SUBMITTED/APPROVED/CLOSED
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

    STATUS = [("PENDING", "Pending"), ("SHORTLISTED", "Shortlisted"), ("ACCEPTED", "Accepted"),
              ("REJECTED", "Rejected"), ("CANCELLED", "Cancelled"), ("EXPIRED", "Expired")]

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
