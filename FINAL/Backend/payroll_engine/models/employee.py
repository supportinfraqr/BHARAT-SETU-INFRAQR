"""Payroll employee — the legacy ``Employee`` document, scoped to one payroll org.

In BSS the person is a ``bss_core.User`` with role ``worker``. A worker bound to
an org (contractor directly, or employer via site) gets one ``PayrollEmployee``
row per org. Identity fields (name, mobile, PAN, bank, UAN, DOJ...) are synced
from BSS by ``payroll_engine.bss_adapter.sync_employees``; payroll-only fields
(payrollInfo, payrollPreferences, taxInfo, statutory overrides, exitData) are
owned here and never overwritten by the sync.
"""

from django.conf import settings
from django.db import models

from .base import DocModel, iso


def default_payroll_info():
    return {
        "baseSalary": 0, "grossSalary": 0, "ctc": 0, "paymentFrequency": "Monthly",
        "currency": "INR", "taxRegime": "New", "variablePay": 0, "incentives": 0,
        "salaryEffectiveFrom": None, "componentOverrides": [], "defaultComponents": [],
    }


def default_payroll_preferences():
    return {
        "holdSalary": False, "holdReason": "", "loanDeduction": 0, "advanceDeduction": 0,
        "vpf": {"enabled": False, "contributionType": "percentage", "percentage": 0,
                "fixedAmount": 0, "status": "none", "acknowledged": False,
                "requestedAt": None, "effectiveFrom": None},
        "paymentMode": "Bank Transfer",
    }


def default_tax_info():
    return {
        "taxDeclarationSubmitted": False, "taxDeclarationYear": "",
        "investmentProofSubmitted": False, "investmentProofYear": "",
        "estimatedTaxLiability": 0, "tdsDeducted": 0,
    }


def default_bank_info():
    return {
        "bankCountry": "", "bankCode": "", "bankName": "", "branchName": "", "ifscCode": "",
        "swiftCode": "", "bankAccountNumber": "", "confirmBankAccountNumber": "",
        "accountHolderName": "", "accountType": "", "isVerified": False, "verifiedOn": None,
    }


def default_statutory_info():
    return {
        "pfAccountNumber": "", "uan": "", "esiNumber": "", "esiApplicable": True,
        "esiOptedOut": False, "ptApplicable": False, "ptState": "", "gratuityApplicable": False,
        "lwfApplicable": True, "lwfState": "", "employmentCategory": "",
        "epfOverride": {"enabled": False, "employeeContributionRate": None,
                        "employerContributionRate": None, "restrictedPfWage": None,
                        "applyCeiling": True},
        "epfApplicable": True,
    }


def default_exit_data():
    return {"exitStatus": "", "date": None, "reason": "", "authorizedBy": None,
            "lastWorkingDay": None}


def default_national_id():
    return {"pan": "", "aadhar": "", "passport": "", "passportValid": None,
            "nameInPan": "", "nameInAadhaar": "", "nameInPassport": ""}


def default_address():
    return {"address": "", "street": "", "city": "", "state": "", "pin": "", "country": ""}


class PayrollEmployee(DocModel):
    STATUS = [("Active", "Active"), ("Inactive", "Inactive"), ("Probation", "Probation")]

    worker = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                               related_name="payroll_employments")
    # Legacy identity columns (synced from BSS).
    first_name = models.CharField(max_length=120, blank=True)
    last_name = models.CharField(max_length=120, blank=True)
    display_name = models.CharField(max_length=160, blank=True)
    email = models.CharField(max_length=160, blank=True)
    unique_id = models.CharField(max_length=40, blank=True, db_index=True)   # BSS worker id
    custom_id = models.CharField(max_length=40, blank=True)                  # org-assigned code
    mobile = models.CharField(max_length=20, blank=True)
    date_of_joining = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS, default="Active", db_index=True)
    job_title = models.CharField(max_length=120, blank=True)
    department = models.CharField(max_length=120, blank=True)
    category_name = models.CharField(max_length=120, blank=True)
    employee_type = models.CharField(max_length=60, blank=True)
    gender = models.CharField(max_length=20, blank=True)
    dob = models.DateField(null=True, blank=True)
    father_spouse = models.CharField(max_length=160, blank=True)
    site_id_ref = models.CharField(max_length=40, blank=True)    # BSS Site id of the binding
    site_name = models.CharField(max_length=160, blank=True)
    work_state = models.CharField(max_length=60, blank=True)     # site state (PT/LWF default)
    present_address = models.JSONField(default=default_address, blank=True)
    permanent_address = models.JSONField(default=default_address, blank=True)
    national_id = models.JSONField(default=default_national_id, blank=True)
    bank_info = models.JSONField(default=default_bank_info, blank=True)
    # Payroll-owned (never overwritten by the BSS sync).
    payroll_info = models.JSONField(default=default_payroll_info, blank=True)
    payroll_preferences = models.JSONField(default=default_payroll_preferences, blank=True)
    tax_info = models.JSONField(default=default_tax_info, blank=True)
    statutory_info = models.JSONField(default=default_statutory_info, blank=True)
    exit_data = models.JSONField(default=default_exit_data, blank=True)
    nomination_info = models.JSONField(default=dict, blank=True)
    previous_employment = models.JSONField(default=list, blank=True)
    # Fields the org edited by hand; the BSS sync leaves these untouched.
    locked_fields = models.JSONField(default=list, blank=True)
    synced_at = models.DateTimeField(null=True, blank=True)

    DOC_FIELDS = {
        "workerId": "worker",
        "firstName": "first_name", "lastName": "last_name", "displayName": "display_name",
        "email": "email", "uniqueId": "unique_id", "customId": "custom_id",
        "dateOfJoining": "date_of_joining", "status": "status", "jobTitle": "job_title",
        "department": "department", "categoryName": "category_name",
        "employeeType": "employee_type", "fatherSpouse": "father_spouse",
        "siteId": "site_id_ref", "siteName": "site_name", "workState": "work_state",
        "presentAddress": "present_address", "permanentAddress": "permanent_address",
        "nationalID": "national_id", "bankInfo": "bank_info",
        "payrollInfo": "payroll_info", "payrollPreferences": "payroll_preferences",
        "taxInfo": "tax_info", "statutoryInfo": "statutory_info", "exitData": "exit_data",
        "nominationInfo": "nomination_info", "previousEmployment": "previous_employment",
    }

    class Meta:
        db_table = "pe_employee"
        constraints = [models.UniqueConstraint(fields=["org", "worker"],
                                               name="uq_pe_employee_org_worker")]
        indexes = [models.Index(fields=["org", "status"], name="idx_pe_emp_org_status")]

    @property
    def full_name(self):
        return " ".join(p for p in [self.first_name, self.last_name] if p).strip()

    def to_dict(self, **extra):
        out = super().to_dict(**extra)
        out["phone"] = {"mobile": self.mobile, "home": ""}
        out["demographics"] = {"dob": iso(self.dob), "gender": self.gender}
        out.setdefault("name", self.full_name)
        return out

    def __str__(self):
        return f"{self.full_name or self.unique_id} @ {self.org_id}"
