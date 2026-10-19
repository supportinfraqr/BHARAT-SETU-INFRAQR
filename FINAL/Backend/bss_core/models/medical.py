"""Occupational health & safety: the state health-examination form library
(Form-VIII / Form-IX), the frozen forms dispatched to employers' sites, the
per-worker medical examination records, and PPE / training safety records.

Mirrors the CLRA register-template pattern: a template is authored per state or
Central (``jurisdiction``); a frozen version is dispatched to an employer's
sites in the same state; the employer's Medical Officer records exams against
that state's form and the Safety Office records PPE/training.
"""

from django.db import models

from .auth import User
from .relationship import Site


class MedicalFormTemplate(models.Model):
    """State (or Central) health-examination form template (Form-VIII/IX).

    ``state="Central"`` with ``jurisdiction="central"`` is the pan-India form;
    a state row shadows it. Edits save as ``draft``; ``frozen`` bumps ``version``."""

    JURISDICTION = [("state", "State"), ("central", "Central")]
    STATUS = [("draft", "Draft"), ("frozen", "Frozen")]
    FORM_TYPE = [("VIII", "Form-VIII (factories)"), ("IX", "Form-IX (mines)")]

    state = models.CharField(max_length=60, db_index=True)
    # Form-VIII and Form-IX are independent forms (separate draft/published state).
    form_type = models.CharField(max_length=6, choices=FORM_TYPE, default="VIII", db_index=True)
    jurisdiction = models.CharField(max_length=10, choices=JURISDICTION, default="state", db_index=True)
    template_id = models.CharField(max_length=80, blank=True, default="osh-form-viii-ix-2026")
    name = models.CharField(max_length=200, blank=True)
    html = models.TextField(blank=True)
    status = models.CharField(max_length=10, choices=STATUS, default="draft")
    version = models.PositiveIntegerField(default=1)
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                                   related_name="medical_forms_created")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "medical_form_template"
        constraints = [models.UniqueConstraint(fields=["state", "jurisdiction", "form_type"],
                                               name="uq_medical_form_state_form")]
        indexes = [models.Index(fields=["state"], name="idx_medical_form_state")]

    def __str__(self):
        return f"{self.state} Form-{self.form_type} ({self.jurisdiction}) v{self.version}"


class MedicalFormDispatch(models.Model):
    """A frozen form version sent by BSS Admin to an employer's sites."""

    state = models.CharField(max_length=60, db_index=True)
    jurisdiction = models.CharField(max_length=10, default="state")
    version = models.PositiveIntegerField(default=1)
    html = models.TextField(blank=True)
    employer = models.ForeignKey(User, on_delete=models.CASCADE, related_name="medical_form_dispatches",
                                 limit_choices_to={"role": "employer"})
    note = models.CharField(max_length=400, blank=True)
    sent_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                                related_name="medical_form_dispatches_sent")
    sent_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "medical_form_dispatch"
        indexes = [models.Index(fields=["employer", "state"], name="idx_medical_dispatch_emp_state")]

    def __str__(self):
        return f"{self.state} -> {self.employer_id} v{self.version}"


class MedicalFormDispatchSite(models.Model):
    dispatch = models.ForeignKey(MedicalFormDispatch, on_delete=models.CASCADE, related_name="sites")
    site = models.ForeignKey(Site, on_delete=models.CASCADE, related_name="medical_form_dispatches")

    class Meta:
        db_table = "medical_form_dispatch_site"
        unique_together = ("dispatch", "site")


class MedicalExam(models.Model):
    """One recorded medical examination (Form-VIII or Form-IX) for a worker."""

    FORM_TYPE = [("VIII", "Form-VIII (Health Examination)"), ("IX", "Form-IX (Mine)")]
    FITNESS = [("Fit", "Fit"), ("Fit with restrictions", "Fit with restrictions"), ("Unfit", "Unfit")]

    worker = models.ForeignKey(User, on_delete=models.CASCADE, related_name="medical_exams",
                               limit_choices_to={"role": "worker"})
    site = models.ForeignKey(Site, on_delete=models.SET_NULL, null=True, blank=True,
                             related_name="medical_exams")
    state = models.CharField(max_length=60, blank=True, db_index=True)
    form_type = models.CharField(max_length=6, choices=FORM_TYPE, default="VIII")
    dispatch = models.ForeignKey(MedicalFormDispatch, on_delete=models.SET_NULL, null=True, blank=True,
                                 related_name="exams")
    form_version = models.PositiveIntegerField(default=1)
    part_a = models.JSONField(default=dict, blank=True)     # name/gender/dob/company/designation/uan/aadhaar/…
    tests = models.JSONField(default=list, blank=True)      # [{key,name,result,unit,flag,fileName}]
    doctor = models.JSONField(default=dict, blank=True)     # {name,reg,hospital}
    exam_date = models.DateField(null=True, blank=True)
    interval_months = models.PositiveIntegerField(default=12)
    next_due = models.DateField(null=True, blank=True)
    remarks = models.TextField(blank=True)
    height_work = models.JSONField(default=dict, blank=True)  # {value:'NA'|'No'|'Yes', detail}
    overall = models.CharField(max_length=30, choices=FITNESS, default="Fit")
    restrictions = models.TextField(blank=True)
    alt_fit = models.JSONField(default=dict, blank=True)
    unfit = models.JSONField(default=dict, blank=True)
    # Values for {{custom.<key>}} tokens in the form HTML (asked from the Medical Officer).
    custom_fields = models.JSONField(default=dict, blank=True)
    recorded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                                    related_name="medical_exams_recorded")
    recorded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "medical_exam"
        ordering = ["-recorded_at"]
        indexes = [models.Index(fields=["worker", "-recorded_at"], name="idx_medical_exam_worker")]

    def __str__(self):
        return f"{self.worker_id} {self.form_type} {self.exam_date}"


class EmployerMedicalFormAdoption(models.Model):
    """An employer adopting a published medical form (per state + form type).

    Adoption lets the employer choose which published Form-VIII / Form-IX version
    their Medical Officers use. No adoption rows = every published form is
    available (backward compatible)."""

    employer = models.ForeignKey(User, on_delete=models.CASCADE,
                                 related_name="medical_form_adoptions",
                                 limit_choices_to={"role": "employer"})
    template = models.ForeignKey("MedicalFormTemplate", on_delete=models.CASCADE,
                                 related_name="employer_adoptions")
    state = models.CharField(max_length=60, db_index=True)
    form_type = models.CharField(max_length=6, db_index=True)
    # Version pinned by the employer — new publishes do not change it until re-adopted.
    adopted_version = models.PositiveIntegerField(default=1)
    adopted_html = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    adopted_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "employer_medical_form_adoption"
        constraints = [models.UniqueConstraint(
            fields=["employer", "template"], name="uq_employer_medical_form_adoption")]
        indexes = [models.Index(fields=["employer", "state"], name="idx_emp_medical_adopt")]

    def __str__(self):
        return f"{self.employer_id} -> {self.template_id}"


class SafetyRecord(models.Model):
    """Per-worker, PER-SITE PPE kit issue + training programmes (Safety Office).

    Induction and PPE are site-specific: a worker has one record per site, so a
    move to a new site requires a fresh induction/kit for that site."""

    worker = models.ForeignKey(User, on_delete=models.CASCADE, related_name="safety_records",
                               limit_choices_to={"role": "worker"})
    site = models.ForeignKey(Site, on_delete=models.CASCADE, related_name="safety_records",
                             null=True, blank=True)
    kit_items = models.JSONField(default=dict, blank=True)   # {key:{issued,issueDate,size,condition,remarks}}
    trainings = models.JSONField(default=dict, blank=True)   # {key:{completed,date,trainer,score,validUntil,remarks}}
    issued_by = models.CharField(max_length=120, blank=True)
    store_ref = models.CharField(max_length=120, blank=True)
    kit_condition = models.CharField(max_length=60, blank=True)
    notes = models.TextField(blank=True)
    updated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                                   related_name="safety_records_updated")
    updated_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "worker_safety_record"
        unique_together = ("worker", "site")
        indexes = [models.Index(fields=["worker"], name="idx_safety_record_worker")]

    def __str__(self):
        return f"safety {self.worker_id}@{self.site_id}"


class SafetyCertificate(models.Model):
    """An issued Health & Safety compliance certificate (PPE + training + site
    induction) for a worker at a site. The certificate number is persisted so an
    issued certificate is traceable/mapped in the DB."""

    worker = models.ForeignKey(User, on_delete=models.CASCADE, related_name="safety_certificates",
                               limit_choices_to={"role": "worker"})
    site = models.ForeignKey(Site, on_delete=models.CASCADE, related_name="safety_certificates",
                             null=True, blank=True)
    employer = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                                 related_name="safety_certificates_issued_for",
                                 limit_choices_to={"role": "employer"})
    # Snapshot of the worker's BSS id at issue time (the certificate's key).
    worker_bss_id = models.CharField(max_length=40, blank=True)
    cert_no = models.CharField(max_length=60, unique=True)
    issued_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                                  related_name="safety_certificates_issued")
    issued_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "safety_certificate"
        unique_together = ("worker", "site")
        indexes = [models.Index(fields=["worker"], name="idx_safety_cert_worker")]

    def __str__(self):
        return self.cert_no
