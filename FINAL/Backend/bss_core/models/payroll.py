"""Payroll configuration cluster: statutory configs (EPF/ESI/PT/LWF/Bonus),
salary components/deductions/benefits/reimbursements, full-&-final rules,
staff-portal preferences and payroll periods/runs."""

from django.db import models

from .auth import User


class PayrollConfig(models.Model):
    """Top-level payroll settings for an employer."""

    employer = models.OneToOneField(User, on_delete=models.CASCADE, related_name="payroll_config")
    salary_frequency = models.CharField(max_length=20, default="MONTHLY")
    currency = models.CharField(max_length=10, default="INR")
    consider_pf = models.BooleanField(default=True)
    consider_esi = models.BooleanField(default=True)
    consider_pt = models.BooleanField(default=True)
    consider_lwf = models.BooleanField(default=False)
    consider_bonus = models.BooleanField(default=True)
    default_pay_date = models.SmallIntegerField(default=1)
    working_days = models.CharField(max_length=120, blank=True)
    first_pay_period = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "payroll_config"

    def __str__(self):
        return str(self.employer_id)


class EpfConfig(models.Model):
    config = models.OneToOneField(PayrollConfig, on_delete=models.CASCADE, related_name="epf")
    epf_number = models.CharField(max_length=40, blank=True)
    employer_rate = models.DecimalField(max_digits=5, decimal_places=2, default=12)
    employee_rate = models.DecimalField(max_digits=5, decimal_places=2, default=12)
    employer_pension_rate = models.DecimalField(max_digits=5, decimal_places=2, default=8.33)
    apply_on = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    cap_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    deduction_cycle = models.CharField(max_length=20, default="MONTHLY")
    employer_pf_included = models.BooleanField(default=False)
    edli_included = models.BooleanField(default=False)
    admin_charges_included = models.BooleanField(default=False)
    employee_level_override = models.BooleanField(default=False)
    prorate_restricted_pf_wage = models.BooleanField(default=False)
    consider_components_lop = models.BooleanField(default=False)
    abry_eligible = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "epf_config"

    def __str__(self):
        return f"EPF {self.epf_number}"


class EsiConfig(models.Model):
    config = models.OneToOneField(PayrollConfig, on_delete=models.CASCADE, related_name="esi")
    esi_number = models.CharField(max_length=40, blank=True)
    employer_rate = models.DecimalField(max_digits=5, decimal_places=2, default=3.25)
    employee_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0.75)
    apply_on = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    cap_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    deduction_cycle = models.CharField(max_length=20, default="MONTHLY")
    employer_contribution_included = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "esi_config"

    def __str__(self):
        return f"ESI {self.esi_number}"


class PtConfig(models.Model):
    """Professional Tax config — one row per work location (a state may have
    several locations, and applicability differs by state)."""

    config = models.ForeignKey(PayrollConfig, on_delete=models.CASCADE, related_name="pt_configs")
    location = models.CharField(max_length=120, blank=True)
    pt_number = models.CharField(max_length=40, blank=True)
    applicable = models.BooleanField(default=False)
    slab_lookup = models.CharField(max_length=40, blank=True)
    deduction_cycle = models.CharField(max_length=20, default="MONTHLY")
    state = models.CharField(max_length=60, blank=True)
    work_location = models.CharField(max_length=120, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "pt_config"

    def __str__(self):
        return f"PT {self.location or self.work_location or self.state}"


class LwfConfig(models.Model):
    """Labour Welfare Fund config — one row per state (with an enable toggle)."""

    config = models.ForeignKey(PayrollConfig, on_delete=models.CASCADE, related_name="lwf_configs")
    lwf_number = models.CharField(max_length=40, blank=True)
    applicable = models.BooleanField(default=False)
    status_enabled = models.BooleanField(default=True)
    employer_share = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    employee_share = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    state = models.CharField(max_length=60, blank=True)
    min_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    max_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    deduction_cycle = models.CharField(max_length=20, default="HALF_YEARLY")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "lwf_config"

    def __str__(self):
        return f"LWF {self.state}"


class BonusStateMinWage(models.Model):
    """Statutory-bonus minimum wage configured per state (drives eligibility)."""

    config = models.ForeignKey(PayrollConfig, on_delete=models.CASCADE,
                               related_name="bonus_min_wages")
    state = models.CharField(max_length=60)
    min_wage = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    configured = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "bonus_state_min_wage"
        constraints = [models.UniqueConstraint(fields=["config", "state"],
                                               name="uq_bonus_state_min_wage")]

    def __str__(self):
        return f"Bonus min wage {self.state}"


class BonusConfig(models.Model):
    config = models.OneToOneField(PayrollConfig, on_delete=models.CASCADE, related_name="bonus")
    bonus_pct = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    minimum_statutory = models.DecimalField(max_digits=5, decimal_places=2, default=8.33)
    salary_ceiling = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    payment_cycle = models.CharField(max_length=20, default="YEARLY")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "bonus_config"

    def __str__(self):
        return f"Bonus {self.bonus_pct}%"


class SalaryComponent(models.Model):
    """Earnings component in a salary structure (basic, HRA, allowance...)."""

    config = models.ForeignKey(PayrollConfig, on_delete=models.CASCADE, related_name="earnings")
    name = models.CharField(max_length=80)
    type = models.CharField(max_length=20, default="FIXED")
    calculation_method = models.CharField(max_length=20, default="PERCENT")
    calc_value = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    consider_for_pf = models.BooleanField(default=False)
    consider_for_esi = models.BooleanField(default=False)
    sort_order = models.SmallIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "salary_component"
        indexes = [models.Index(fields=["config"], name="idx_salary_comp_config")]

    def __str__(self):
        return self.name


class SalaryDeduction(models.Model):
    """Deduction component (PF, ESIC, PT, LWF, loan...)."""

    FREQ = [("ONE_TIME", "One Time"), ("RECURRING", "Recurring")]

    config = models.ForeignKey(PayrollConfig, on_delete=models.CASCADE, related_name="deductions")
    name = models.CharField(max_length=80)
    statutory = models.BooleanField(default=False)
    frequency = models.CharField(max_length=20, choices=FREQ, default="RECURRING")
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    percent = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    sort_order = models.SmallIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "salary_deduction"
        indexes = [models.Index(fields=["config"], name="idx_salary_ded_config")]

    def __str__(self):
        return self.name


class SalaryBenefit(models.Model):
    """Voluntary benefits (VPF, NPS)."""

    FREQ = [("MONTHLY", "Monthly"), ("QUARTERLY", "Quarterly"), ("ANNUAL", "Annual")]

    config = models.ForeignKey(PayrollConfig, on_delete=models.CASCADE, related_name="benefits")
    name = models.CharField(max_length=80)
    frequency = models.CharField(max_length=20, choices=FREQ, default="MONTHLY")
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "salary_benefit"
        indexes = [models.Index(fields=["config"], name="idx_salary_benefit_config")]

    def __str__(self):
        return self.name


class SalaryReimbursement(models.Model):
    """Reimbursement items (fuel, driver, leave encashment...)."""

    config = models.ForeignKey(PayrollConfig, on_delete=models.CASCADE,
                               related_name="reimbursements")
    name = models.CharField(max_length=80)
    max_amount_per_month = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "salary_reimbursement"
        indexes = [models.Index(fields=["config"], name="idx_salary_reimb_config")]

    def __str__(self):
        return self.name


class FfsConfig(models.Model):
    """Full & Final (F&F) settlement rules."""

    config = models.OneToOneField(PayrollConfig, on_delete=models.CASCADE, related_name="ffs")
    leave_encashment_enabled = models.BooleanField(default=True)
    leave_encashment_leave_type = models.CharField(max_length=60, blank=True)
    leave_encashment_on = models.CharField(max_length=40, blank=True)
    leave_encashment_days = models.SmallIntegerField(null=True, blank=True)
    leave_encashment_calc_days = models.CharField(max_length=40, blank=True)
    leave_encashment_custom = models.CharField(max_length=120, blank=True)
    gratuity_encashment_enabled = models.BooleanField(default=True)
    gratuity_maturity_years = models.SmallIntegerField(null=True, blank=True)
    gratuity_maturity_months = models.SmallIntegerField(null=True, blank=True)
    gratuity_rounding_months = models.CharField(max_length=40, blank=True)
    notice_penalty_enabled = models.BooleanField(default=False)
    notice_penalty_on = models.CharField(max_length=40, blank=True)
    excess_leave_recovery = models.BooleanField(default=False)
    excess_leave_penalty_on = models.CharField(max_length=40, blank=True)
    assume_days = models.SmallIntegerField(default=0)
    assume_days_penalty_on = models.CharField(max_length=40, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "ffs_config"

    def __str__(self):
        return str(self.config_id)


class StaffPortalConfig(models.Model):
    """Staff/worker self-service portal preferences."""

    config = models.OneToOneField(PayrollConfig, on_delete=models.CASCADE,
                                  related_name="staff_portal")
    portal_access = models.BooleanField(default=True)
    banner_message = models.CharField(max_length=500, blank=True)
    banner_till = models.DateField(null=True, blank=True)
    support_contact = models.CharField(max_length=120, blank=True)
    document_visibility = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "staff_portal_config"

    def __str__(self):
        return str(self.config_id)


class PayrollPeriod(models.Model):
    """A granted payroll run period + pay date."""

    STATUS = [("OPEN", "Open"), ("PROCESSING", "Processing"), ("COMPLETED", "Completed"),
              ("CANCELLED", "Cancelled")]

    config = models.ForeignKey(PayrollConfig, on_delete=models.CASCADE, related_name="periods")
    period_start = models.DateField()
    period_end = models.DateField()
    pay_date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS, default="OPEN")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "payroll_period"
        constraints = [models.UniqueConstraint(
            fields=["config", "period_start", "period_end"], name="uq_payroll_period")]

    def __str__(self):
        return f"{self.period_start} - {self.period_end} {self.status}"


class PayrollWorkspaceStore(models.Model):
    """Server-side store for the payroll workspace module state.

    The workspace keeps runs, payments, approvals, loans, salary structures,
    revisions, Form-16, full-&-final and VPF requests. Persisting the module
    JSON per owner makes that state durable and shared across devices instead of
    living only in the browser session."""

    owner_type = models.CharField(max_length=20)   # contractor | employer | admin
    owner_id = models.CharField(max_length=80)
    records = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "payroll_workspace_store"
        constraints = [models.UniqueConstraint(fields=["owner_type", "owner_id"],
                                               name="uq_payroll_workspace_owner")]

    def __str__(self):
        return f"{self.owner_type}:{self.owner_id}"
