"""Compliance & statutory-master models: document/register masters, compliance
matrix (act/form/no/frequency/criticality/score), generated compliance documents,
audit reports & scoring, employer↔document/register/act mappings, statutory rate
masters (PT, LWF, licence, minimum wage) and the admin menu-permission matrix."""

from django.db import models

from .auth import User


class RegisterDocumentMaster(models.Model):
    """Master of statutory documents & registers (name, type, act, form, state,
    frequency, criticality, mandatory)."""

    KIND = [("document", "Document"), ("register", "Register")]

    code = models.CharField(max_length=10, unique=True)
    kind = models.CharField(max_length=20, choices=KIND)
    document_name = models.CharField(max_length=160)
    act = models.CharField(max_length=160, blank=True)
    form_number = models.CharField(max_length=40, blank=True)
    state = models.CharField(max_length=60, blank=True)
    frequency = models.CharField(max_length=40, blank=True)
    criticality = models.CharField(max_length=20, blank=True)
    is_mandatory = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    sort_order = models.SmallIntegerField(default=0)
    details = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "register_document_master"
        indexes = [models.Index(fields=["kind"], name="idx_reg_doc_master_kind")]

    def __str__(self):
        return f"{self.code} {self.document_name}"


class RegisterTemplate(models.Model):
    """A State + Form statutory register template (the PAN-India CLRA library).

    Each row keeps the ordered column headers parsed from the source register so
    the contractor's uploaded master data can be rendered into the register.
    One active template per (state, form); re-import bumps the version.

    Admin-authored forms (the Universal Compliance field dictionary) are stored
    on the same row: ``fields`` is the ordered list of sections/labelled fields
    (data type, source, mandatory, read-only, signature/approval flags) and the
    ``html`` layout renders them in the Register output."""

    TEMPLATE_TYPES = [("register", "Register"), ("return", "Return"),
                      ("form", "Form"), ("checklist", "Checklist"), ("report", "Report")]
    STATUS = [("draft", "Draft"), ("approved", "Approved"),
              ("published", "Published"), ("retired", "Retired")]
    OUTPUT_FORMATS = [("pdf", "PDF"), ("xlsx", "Excel (XLSX)")]

    state = models.CharField(max_length=60, db_index=True)
    form_code = models.CharField(max_length=60)
    # The CLRA purpose/register this template serves (e.g. "Register of Overtime").
    # Several purposes can share a form_code (Maharashtra maps every register to
    # FORM II) — each purpose still gets its own register-wise template.
    purpose = models.CharField(max_length=160, blank=True, default="")
    title = models.CharField(max_length=200, blank=True)
    template_type = models.CharField(max_length=20, choices=TEMPLATE_TYPES, default="register")
    status = models.CharField(max_length=20, choices=STATUS, default="draft")
    act = models.CharField(max_length=160, blank=True)
    frequency = models.CharField(max_length=60, blank=True)
    # Statutory metadata (absorbed from the RegisterDocumentMaster master).
    criticality = models.CharField(max_length=20, blank=True)
    is_mandatory = models.BooleanField(default=False)
    # OCR verification checklist for a manually-uploaded register, same shape as
    # CustomFormName.ocr_checkpoints: [{"type","label","value","required"}].
    ocr_checkpoints = models.JSONField(default=list, blank=True)
    source_format = models.CharField(max_length=10, blank=True)  # xlsx / xls / docx
    # Per-template output: registers export XLSX, forms export PDF. Blank =
    # derive from template_type (register -> xlsx, otherwise -> pdf).
    output_format = models.CharField(max_length=10, choices=OUTPUT_FORMATS, blank=True)
    document = models.ForeignKey(RegisterDocumentMaster, on_delete=models.SET_NULL,
                                 null=True, blank=True, related_name="templates")
    columns = models.JSONField(default=list, blank=True)
    meta = models.JSONField(default=dict, blank=True)
    # Ordered sections & fields (Universal Compliance field dictionary):
    # [{"section","label","dataType","dataSource","sourceField",
    #   "mandatory","readOnly","signature","approval","sort"}]
    fields = models.JSONField(default=list, blank=True)
    # Admin-authored HTML layout for the register (with {{tokens}} / {{ROWS}}).
    # When blank, the register is rendered from `columns` as a plain table.
    html = models.TextField(blank=True)
    # Per-worker documents (Identity Card / Wage Slip): render once per
    # master-file row instead of once per batch. The authored HTML is wrapped
    # in a {{#rows}} loop when rendered.
    per_row = models.BooleanField(default=False)
    source_file = models.FileField(upload_to="clra/templates/%Y/", blank=True)
    is_active = models.BooleanField(default=True)
    format_available = models.BooleanField(default=True)
    version = models.PositiveIntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "register_template"
        constraints = [models.UniqueConstraint(fields=["state", "purpose", "form_code"],
                                               name="uq_register_template_state_purpose_form")]
        indexes = [models.Index(fields=["state"], name="idx_register_template_state")]

    def __str__(self):
        return f"{self.state} {self.form_code}"

    def resolved_output_format(self):
        """Explicit output format, else register -> XLSX / form -> PDF."""
        if self.output_format in ("pdf", "xlsx"):
            return self.output_format
        return "xlsx" if self.template_type == "register" else "pdf"


class RegisterFieldMapping(models.Model):
    """Admin override: a register-template column → a master-file field key.

    When present, these mappings take precedence over the automatic
    ``match_column`` heuristic so the admin can pin a column to a field."""

    template = models.ForeignKey(RegisterTemplate, on_delete=models.CASCADE,
                                 related_name="field_mappings")
    column = models.CharField(max_length=200)
    field_key = models.CharField(max_length=60)
    sort_order = models.SmallIntegerField(default=0)

    class Meta:
        db_table = "register_field_mapping"
        constraints = [models.UniqueConstraint(fields=["template", "column"],
                                               name="uq_register_field_col")]

    def __str__(self):
        return f"{self.column} → {self.field_key}"


class RegisterCalculationRule(models.Model):
    """Admin-configured calculation for a register field, e.g. ``ot_hours * ot_rate``.

    The formula uses master-file field keys and basic arithmetic; it is evaluated
    per row and its result is exposed to the template as ``{{CALC_<target>}}``."""

    template = models.ForeignKey(RegisterTemplate, on_delete=models.CASCADE,
                                 related_name="calculation_rules")
    target_field = models.CharField(max_length=80)
    label = models.CharField(max_length=120, blank=True)
    formula = models.CharField(max_length=255)
    sort_order = models.SmallIntegerField(default=0)

    class Meta:
        db_table = "register_calculation_rule"

    def __str__(self):
        return f"{self.target_field} = {self.formula}"


class EmployerRegisterTemplateAdoption(models.Model):
    """An employer adopting a State+Form CLRA register **for a specific site**.

    Adoption is per (employer, site, template). Once at least one row exists for
    a site, that site is *gated*: the employer's contractors at that site only see
    the adopted forms (plus mandatory ones). Sites with no adoption rows keep the
    full applicable library (backward compatible)."""

    employer = models.ForeignKey(User, on_delete=models.CASCADE,
                                 related_name="register_template_adoptions")
    template = models.ForeignKey(RegisterTemplate, on_delete=models.CASCADE,
                                 related_name="employer_adoptions")
    # The site this adoption applies to. Null only for legacy state-level rows.
    site = models.ForeignKey("Site", on_delete=models.CASCADE, null=True, blank=True,
                             related_name="register_template_adoptions")
    state = models.CharField(max_length=60, db_index=True)
    is_active = models.BooleanField(default=True)
    adopted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "employer_register_template_adoption"
        constraints = [models.UniqueConstraint(
            fields=["employer", "site", "template"], name="uq_employer_site_register_template")]
        indexes = [models.Index(fields=["employer", "site"],
                                name="idx_emp_reg_tpl_site"),
                   models.Index(fields=["employer", "state"],
                                name="idx_emp_reg_tpl_state")]

    def __str__(self):
        return f"{self.employer_id} site{self.site_id} -> {self.template_id}"


class StateCode(models.Model):
    """State / UT reference: 2-letter code + LWF / NH-FH applicability."""

    state = models.CharField(max_length=60, unique=True)
    code = models.CharField(max_length=10, blank=True)
    is_union_territory = models.BooleanField(default=False)
    lwf = models.CharField(max_length=40, blank=True)
    nh_fh = models.CharField(max_length=120, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "state_code"

    def __str__(self):
        return f"{self.state} ({self.code})"


class StateFormApplicability(models.Model):
    """The PAN-India CLRA applicability matrix: state + purpose → applicable form."""

    state = models.CharField(max_length=60, db_index=True)
    purpose = models.CharField(max_length=160)
    form_label = models.CharField(max_length=80, blank=True)
    strength_rc_pe = models.CharField(max_length=40, blank=True)
    strength_licence = models.CharField(max_length=40, blank=True)
    lwf = models.CharField(max_length=40, blank=True)
    hra = models.CharField(max_length=40, blank=True)
    nh_fh = models.CharField(max_length=120, blank=True)
    pt_frequency = models.CharField(max_length=120, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "state_form_applicability"
        constraints = [models.UniqueConstraint(fields=["state", "purpose"],
                                               name="uq_state_form_applicability")]
        indexes = [models.Index(fields=["state"], name="idx_state_form_applicability")]

    def __str__(self):
        return f"{self.state} · {self.purpose} → {self.form_label}"


class StateFeeMaster(models.Model):
    """State-wise CLRA security / government fees."""

    state = models.CharField(max_length=60, unique=True)
    security_fee_per_employee = models.CharField(max_length=80, blank=True)
    govt_fees = models.CharField(max_length=80, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "state_fee_master"

    def __str__(self):
        return f"Fees {self.state}"


class ComplianceMaster(models.Model):
    """Compliance matrix line item (act + form, its nature & max score)."""

    act = models.CharField(max_length=160)
    form_number = models.CharField(max_length=60, blank=True)
    nature = models.CharField(max_length=120, blank=True)
    remark = models.CharField(max_length=255, blank=True)
    max_score = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    is_active = models.BooleanField(default=True)
    details = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "compliance_master"
        indexes = [models.Index(fields=["act"], name="idx_compliance_master_act")]

    def __str__(self):
        return f"{self.act} {self.form_number}"


class ComplianceDocument(models.Model):
    """A generated compliance document/case per employer per item & FY with expiry,
    days-left, unique compliance number, mandatory flag and OCR accuracy."""

    STATUS = [("DRAFT", "Draft"), ("PENDING", "Pending"), ("SUBMITTED", "Submitted"),
              ("EXPIRED", "Expired"), ("COMPLETED", "Completed")]

    employer = models.ForeignKey(User, on_delete=models.CASCADE, related_name="compliance_docs")
    master = models.ForeignKey(ComplianceMaster, on_delete=models.CASCADE,
                               related_name="generated_docs")
    register_doc = models.ForeignKey(RegisterDocumentMaster, on_delete=models.SET_NULL,
                                     null=True, blank=True, related_name="generated_docs")
    financial_year = models.CharField(max_length=12, blank=True)
    period = models.CharField(max_length=40, blank=True)
    state = models.CharField(max_length=60, blank=True)
    client_name = models.CharField(max_length=200, blank=True)
    verification = models.CharField(max_length=20, blank=True)
    site = models.ForeignKey("Site", on_delete=models.SET_NULL, null=True, blank=True,
                             related_name="compliance_docs")
    worker = models.ForeignKey("User", on_delete=models.SET_NULL, null=True, blank=True,
                               related_name="compliance_docs_as_worker")
    issue_date = models.DateField(null=True, blank=True)
    unique_no = models.CharField(max_length=60, blank=True)
    form_number = models.CharField(max_length=40, blank=True)
    frequency = models.CharField(max_length=40, blank=True)
    criticality = models.CharField(max_length=20, blank=True)
    due_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS, default="PENDING")
    is_mandatory = models.BooleanField(default=False)
    ocr_accuracy = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    file_path = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "compliance_document"
        indexes = [
            models.Index(fields=["employer"], name="idx_comp_doc_employer"),
            models.Index(fields=["financial_year"], name="idx_comp_doc_fy"),
            models.Index(fields=["due_date"], name="idx_comp_doc_due"),
        ]

    @property
    def days_left(self):
        if not self.due_date:
            return None
        from django.utils import timezone
        return (self.due_date - timezone.localdate()).days

    def __str__(self):
        return f"{self.unique_no} {self.status}"


class ComplianceReport(models.Model):
    """A compliance audit / scorecard performed on an employer for a period."""

    employer = models.ForeignKey(User, on_delete=models.CASCADE, related_name="compliance_reports")
    financial_year = models.CharField(max_length=12, blank=True)
    period = models.CharField(max_length=40, blank=True)
    state = models.CharField(max_length=60, blank=True)
    site_name = models.CharField(max_length=200, blank=True)
    client_name = models.CharField(max_length=200, blank=True)
    unique_no = models.CharField(max_length=60, blank=True)
    score = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    score_pct = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    auditor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                                related_name="+")
    auditor_remarks = models.CharField(max_length=1000, blank=True)
    vendor_remarks = models.CharField(max_length=1000, blank=True)
    report_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "compliance_report"
        indexes = [models.Index(fields=["employer"], name="idx_comp_report_employer")]

    def __str__(self):
        return f"{self.unique_no} {self.score_pct}%"


class ComplianceReportItem(models.Model):
    """Per-line scoring of a compliance report (act-wise item breakdown)."""

    report = models.ForeignKey(ComplianceReport, on_delete=models.CASCADE,
                               related_name="items")
    master = models.ForeignKey(ComplianceMaster, on_delete=models.SET_NULL, null=True, blank=True)
    act = models.CharField(max_length=160, blank=True)
    form_number = models.CharField(max_length=60, blank=True)
    nature = models.CharField(max_length=120, blank=True)
    max_score = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    achieved_score = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    status = models.CharField(max_length=20, blank=True)
    remarks = models.CharField(max_length=500, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "compliance_report_item"
        indexes = [models.Index(fields=["report"], name="idx_comp_report_item_report")]

    def __str__(self):
        return f"{self.act} {self.achieved_score}/{self.max_score}"


class EmployerDocumentMapping(models.Model):
    """Which register/document masters an employer is subject to."""

    employer = models.ForeignKey(User, on_delete=models.CASCADE, related_name="doc_mappings")
    register_doc = models.ForeignKey(RegisterDocumentMaster, on_delete=models.CASCADE,
                                     related_name="employer_mappings")
    is_mandatory = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)
    details = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "employer_document_mapping"
        constraints = [models.UniqueConstraint(
            fields=["employer", "register_doc"], name="uq_employer_doc_mapping")]

    def __str__(self):
        return f"{self.employer_id} -> {self.register_doc_id}"


class EmployerRegisterMapping(models.Model):
    """Legacy alias kept for symmetry; also tracks register-master ownership."""

    employer = models.ForeignKey(User, on_delete=models.CASCADE, related_name="register_mappings")
    register_doc = models.ForeignKey(RegisterDocumentMaster, on_delete=models.CASCADE,
                                     related_name="employer_register_mappings")
    is_active = models.BooleanField(default=True)
    details = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "employer_register_mapping"
        constraints = [models.UniqueConstraint(
            fields=["employer", "register_doc"], name="uq_employer_register_mapping")]

    def __str__(self):
        return f"{self.employer_id} -> {self.register_doc_id}"


class EmployerActMapping(models.Model):
    """Which acts apply to an employer (drives compliance matrix)."""

    employer = models.ForeignKey(User, on_delete=models.CASCADE, related_name="act_mappings")
    act = models.CharField(max_length=160)
    register_doc = models.ForeignKey(RegisterDocumentMaster, on_delete=models.SET_NULL,
                                     null=True, blank=True, related_name="act_mappings")
    is_active = models.BooleanField(default=True)
    details = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "employer_act_mapping"
        constraints = [models.UniqueConstraint(fields=["employer", "act"], name="uq_employer_act")]

    def __str__(self):
        return f"{self.employer_id} {self.act}"


class PtMaster(models.Model):
    """Professional Tax master (per state)."""

    FREQ = [("MONTHLY", "Monthly"), ("QUARTERLY", "Quarterly"), ("ANNUAL", "Annual")]

    state = models.CharField(max_length=60)
    pt_number = models.CharField(max_length=80, blank=True)
    payment_frequency = models.CharField(max_length=20, choices=FREQ, default="MONTHLY")
    is_active = models.BooleanField(default=True)
    details = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "pt_master"
        indexes = [models.Index(fields=["state"], name="idx_pt_master_state")]

    def __str__(self):
        return f"PT {self.state}"


class PtSlab(models.Model):
    """Professional Tax slab within a PT master."""

    pt_master = models.ForeignKey(PtMaster, on_delete=models.CASCADE, related_name="slabs")
    from_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    to_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "pt_slab"
        indexes = [models.Index(fields=["pt_master"], name="idx_pt_slab_master")]

    def __str__(self):
        return f"{self.from_amount}-{self.to_amount} = {self.amount}"


class LwfMaster(models.Model):
    """Labour Welfare Fund master (state-level contribution rules)."""

    state = models.CharField(max_length=60)
    min_wage = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    max_wage = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    employer_share = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    employee_share = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    payment_month = models.CharField(max_length=20, blank=True)
    lwf_type = models.CharField(max_length=40, blank=True)
    designation = models.CharField(max_length=80, blank=True)
    is_active = models.BooleanField(default=True)
    details = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "lwf_master"
        indexes = [models.Index(fields=["state"], name="idx_lwf_master_state")]

    def __str__(self):
        return f"LWF {self.state}"


class LicenseMaster(models.Model):
    """Business license master (govt fee, security deposit, validity rules)."""

    license_name = models.CharField(max_length=160)
    state = models.CharField(max_length=60, blank=True)
    government_fee = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    security_deposit = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    industry = models.CharField(max_length=120, blank=True)
    minimum_wages = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    payment_frequency = models.CharField(max_length=40, blank=True)
    bonus_pct = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    wage_zone = models.CharField(max_length=40, blank=True)
    is_active = models.BooleanField(default=True)
    details = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "license_master"

    def __str__(self):
        return f"{self.license_name} {self.state}"


class MinimumWage(models.Model):
    """Minimum wage matrix (state + industry + grade + category + wage zone)."""

    state = models.CharField(max_length=60)
    industry = models.CharField(max_length=120)
    grade = models.CharField(max_length=80, blank=True)
    employment_category = models.CharField(max_length=80, blank=True)
    wage_zone = models.CharField(max_length=40, blank=True)
    basic_wage = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    vda = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    total_wage = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    effective_from = models.DateField(null=True, blank=True)
    effective_to = models.DateField(null=True, blank=True)
    notification_number = models.CharField(max_length=80, blank=True)
    notification_file = models.FileField(upload_to="minimum_wage/notifications/%Y/%m/", blank=True)
    is_active = models.BooleanField(default=True)
    details = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "minimum_wage"
        indexes = [
            models.Index(fields=["state", "industry"], name="idx_min_wage_state_industry"),
            models.Index(fields=["effective_from"], name="idx_min_wage_eff"),
        ]
        # One minimum wage per worker group (state + zone + grade + employment
        # category) per effective period. The amounts are data, not identity.
        constraints = [
            models.UniqueConstraint(
                fields=["state", "wage_zone", "grade", "employment_category",
                        "effective_from", "effective_to"],
                name="uq_minimum_wage_key"),
        ]

    def __str__(self):
        return f"{self.state} {self.industry} {self.grade}"


class MenuPermission(models.Model):
    """Role → menu-item permission matrix for the admin/menu builder."""

    role = models.CharField(max_length=40)
    menu_code = models.CharField(max_length=60)
    label = models.CharField(max_length=120, blank=True)
    allowed = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "menu_permission"
        constraints = [models.UniqueConstraint(
            fields=["role", "menu_code"], name="uq_menu_permission")]

    def __str__(self):
        return f"{self.role} {self.menu_code} {self.allowed}"


class UserMenuPermission(models.Model):
    """Per-user module → action grants (the admin Permission Page)."""

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="menu_permissions")
    permissions = models.JSONField(default=dict, blank=True)  # {"Workers": ["View", "Edit"]}
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "user_menu_permission"

    def __str__(self):
        return f"perms:{self.user_id}"


class ComplianceBatch(models.Model):
    """A generated statutory-register batch (CLRA) for a contractor at a site for a
    period, produced from an uploaded compliance master file."""

    STATUS = [("GENERATED", "Generated"), ("PENDING", "Pending"), ("FAILED", "Failed"),
              ("SUBMITTED", "Submitted"), ("VERIFIED", "Verified"), ("RETURNED", "Returned"),
              ("SUPERSEDED", "Superseded")]

    contractor = models.ForeignKey(User, on_delete=models.CASCADE, related_name="compliance_batches")
    site = models.ForeignKey("Site", on_delete=models.SET_NULL, null=True, blank=True,
                             related_name="compliance_batches")
    financial_year = models.CharField(max_length=12, blank=True)
    month = models.CharField(max_length=20, blank=True)
    year = models.CharField(max_length=4, blank=True)
    state = models.CharField(max_length=60, blank=True)
    employee_count = models.IntegerField(default=0)
    location_count = models.IntegerField(default=0)
    generated_on = models.DateField(null=True, blank=True)
    generated_by = models.CharField(max_length=120, blank=True)
    master_file = models.FileField(upload_to="compliance/master/%Y/%m/", blank=True)
    signature_file = models.FileField(upload_to="compliance/signature/%Y/%m/", blank=True)
    generated_file = models.FileField(upload_to="compliance/batches/%Y/%m/", blank=True)
    rows_count = models.IntegerField(default=0)
    notes = models.CharField(max_length=255, blank=True)
    status = models.CharField(max_length=20, choices=STATUS, default="GENERATED")
    # When a site+period is regenerated, the previous batch is kept for audit but
    # marked SUPERSEDED and points at the batch that replaced it.
    superseded_by = models.ForeignKey("self", null=True, blank=True,
                                      on_delete=models.SET_NULL, related_name="supersedes")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "compliance_batch"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.contractor_id} {self.month} {self.year}"


class StatutoryMaster(models.Model):
    """Statutory component rate master (EPF/EPS/EDLI/ESIC/Bonus/Gratuity/LWF/
    leave/holidays). Cost sheet templates source their locked rates here."""

    component = models.CharField(max_length=30, unique=True)
    label = models.CharField(max_length=80, blank=True)
    rate = models.DecimalField(max_digits=8, decimal_places=4, default=0)
    rate_type = models.CharField(max_length=10, default="PERCENT")  # PERCENT / FIXED / DAYS
    condition = models.CharField(max_length=200, blank=True)
    mandatory = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "statutory_master"

    def __str__(self):
        return f"{self.component} {self.rate}"


class EmployerSapConfig(models.Model):
    """Per-employer SAP API connection (Business One Service Layer / Gateway OData).

    Secrets (password/token) are stored encrypted (see ``api.crypto``).
    ``mode`` picks the API shape, ``auth_type`` the auth method.
    """

    MODES = [("b1", "SAP Business One (Service Layer)"),
             ("odata", "SAP Gateway OData")]
    AUTH_TYPES = [("session", "Login session (B1SESSION/CompanyDB)"),
                  ("bearer", "Bearer token"),
                  ("basic", "Basic auth")]

    employer = models.OneToOneField(User, on_delete=models.CASCADE, related_name="sap_config")
    mode = models.CharField(max_length=10, choices=MODES, default="b1")
    auth_type = models.CharField(max_length=10, choices=AUTH_TYPES, default="session")
    base_url = models.CharField(max_length=255, blank=True)
    company_db = models.CharField(max_length=80, blank=True)
    username = models.CharField(max_length=120, blank=True)
    password_enc = models.TextField(blank=True)
    token_enc = models.TextField(blank=True)
    extra_login = models.JSONField(default=dict, blank=True)
    entity = models.CharField(max_length=80, blank=True, default="A_BusinessPartner")
    id_field = models.CharField(max_length=80, blank=True, default="CardCode")
    bp_filter = models.CharField(max_length=255, blank=True)
    verify_tls = models.BooleanField(default=True)
    field_mapping = models.JSONField(default=dict, blank=True)
    allowlist_ips = models.CharField(max_length=255, blank=True)
    is_active = models.BooleanField(default=True)
    last_tested_at = models.DateTimeField(null=True, blank=True)
    last_status = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "employer_sap_config"

    def __str__(self):
        return f"SAP config · employer {self.employer_id} ({self.mode})"


class SapSyncLog(models.Model):
    """Audit trail of SAP→BSS contractor pulls."""

    employer = models.ForeignKey(User, on_delete=models.CASCADE, related_name="sap_sync_logs")
    contractor_id = models.IntegerField(null=True, blank=True)
    source = models.CharField(max_length=80, blank=True)
    status = models.CharField(max_length=20, blank=True)
    mapped = models.JSONField(default=dict, blank=True)
    message = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "employer_sap_sync_log"


class CustomFormName(models.Model):
    """Ad-hoc compliance form names with **no register template** — submitted
    directly (evidence upload) by the contractor, optionally mandatory.

    ``employer`` null = a BSS Admin-defined form for the state (applies to all
    employers in that state); otherwise the employer's own form. Both are merged
    into the site's applicable documents alongside the templated registers.
    """

    employer = models.ForeignKey(User, null=True, blank=True, on_delete=models.CASCADE,
                                 related_name="custom_form_names")
    # Site scope for the employer's own forms: null = applies to all of the
    # employer's sites in ``state`` (legacy); set = applies only to that site.
    site = models.ForeignKey("Site", null=True, blank=True, on_delete=models.CASCADE,
                             related_name="custom_form_names_at_site")
    state = models.CharField(max_length=60, db_index=True)
    name = models.CharField(max_length=160)
    is_mandatory = models.BooleanField(default=False)
    # True = a document/PDF upload is required; False = "submission only"
    # (the contractor just marks it submitted — no document/PDF needed).
    requires_document = models.BooleanField(default=True)
    frequency = models.CharField(max_length=40, blank=True)
    description = models.CharField(max_length=255, blank=True)
    # OCR verification checklist: a list of checkpoints the uploaded evidence
    # must satisfy, e.g. [{"type":"signature","label":"Signature","required":true},
    # {"type":"name","label":"Contractor name","value":"contractor"},
    # {"type":"keyword","label":"Licence no","value":"LICENCE"}].
    ocr_checkpoints = models.JSONField(default=list, blank=True)
    is_active = models.BooleanField(default=True)
    sort_order = models.SmallIntegerField(default=0)
    created_by = models.CharField(max_length=120, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "custom_form_name"
        constraints = [models.UniqueConstraint(fields=["employer", "site", "state", "name"],
                                               name="uq_custom_form_site_state_name")]
        indexes = [models.Index(fields=["state"], name="idx_custom_form_state")]

    def __str__(self):
        return f"{self.state} · {self.name}"


class EmployerFormSelection(models.Model):
    """An employer's selection of an Admin (global) additional form for its
    contractors, with the employer's own mandatory flag.

    ``site`` null = legacy selection applying to all the employer's sites in the
    form's state; set = selection applies only to that site (site-specific wins
    over the legacy one)."""

    employer = models.ForeignKey(User, on_delete=models.CASCADE, related_name="form_selections")
    form_name = models.ForeignKey(CustomFormName, on_delete=models.CASCADE,
                                  related_name="employer_selections")
    site = models.ForeignKey("Site", null=True, blank=True, on_delete=models.CASCADE,
                             related_name="form_selections_at_site")
    is_mandatory = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "employer_form_selection"
        constraints = [models.UniqueConstraint(fields=["employer", "site", "form_name"],
                                               name="uq_employer_site_form_selection")]

    def __str__(self):
        return f"employer {self.employer_id} · form {self.form_name_id}"


class AuditReport(models.Model):
    """A stored quarterly audit/verification report (snapshot) generated by the
    BSS audit engine for an employer or contractor scope."""

    SCOPE = [("EMPLOYER", "Employer"), ("CONTRACTOR", "Contractor"), ("BSS", "BSS")]

    scope_type = models.CharField(max_length=20, choices=SCOPE, default="EMPLOYER")
    employer = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True,
                                 related_name="audit_reports_as_employer")
    contractor = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True,
                                   related_name="audit_reports_as_contractor")
    site = models.ForeignKey("Site", on_delete=models.SET_NULL, null=True, blank=True,
                             related_name="audit_reports")
    financial_year = models.CharField(max_length=12, blank=True)
    quarter = models.PositiveSmallIntegerField(default=0)
    period_start = models.DateField(null=True, blank=True)
    period_end = models.DateField(null=True, blank=True)
    report_types = models.CharField(max_length=80, blank=True)  # e.g. "co,board,auditor"
    parameters = models.JSONField(default=list, blank=True)
    summary = models.JSONField(default=dict, blank=True)
    file = models.FileField(upload_to="audit_reports/%Y/%m/", blank=True, null=True)
    generated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                                     related_name="+")
    generated_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "audit_report"
        ordering = ["-generated_at", "-id"]
        indexes = [
            models.Index(fields=["scope_type", "employer"], name="idx_audit_rep_employer"),
            models.Index(fields=["scope_type", "contractor"], name="idx_audit_rep_contractor"),
        ]

    def __str__(self):
        who = self.employer_id or self.contractor_id or "BSS"
        return f"{self.get_scope_type_display()} {who} Q{self.quarter} FY{self.financial_year}"


class EmployerSapContractorMap(models.Model):
    """Per-employer mapping of a bound contractor to its SAP Business Partner id,
    plus the outcome of the last SAP→BSS pull (pending / synced / failed)."""

    STATUS = [("PENDING", "Pending pull"), ("SYNCED", "Synced"), ("FAILED", "Failed")]

    employer = models.ForeignKey(User, on_delete=models.CASCADE,
                                 related_name="sap_contractor_maps")
    contractor = models.ForeignKey(User, on_delete=models.CASCADE,
                                   related_name="sap_employer_maps")
    sap_id = models.CharField(max_length=120, blank=True)
    status = models.CharField(max_length=12, choices=STATUS, default="PENDING")
    last_source = models.CharField(max_length=80, blank=True)
    last_status = models.CharField(max_length=255, blank=True)
    mapped_fields = models.JSONField(default=list, blank=True)
    last_synced_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "employer_sap_contractor_map"
        ordering = ["-updated_at", "-id"]
        constraints = [models.UniqueConstraint(fields=["employer", "contractor"],
                                               name="uq_sap_map_employer_contractor")]

    def __str__(self):
        return f"employer {self.employer_id} · contractor {self.contractor_id} → {self.sap_id} ({self.status})"
