"""Legal/registry child records for employers & contractors: directors,
statutory registrations, contacts, contracts, banks, documents and consent
declarations. A single party table pattern (party_type + party_user) keeps
the employer and contractor registries identical in shape."""

from django.db import models

from .auth import User


class PartyDirector(models.Model):
    """A director / authorised signatory of an employer or contractor entity."""

    PARTY = [("employer", "Employer"), ("contractor", "Contractor")]

    party_type = models.CharField(max_length=20, choices=PARTY)
    party_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="directors")
    din = models.CharField("DIN", max_length=40, blank=True)
    director_name = models.CharField(max_length=120)
    designation = models.CharField(max_length=120, blank=True)
    appointment_date = models.DateField(null=True, blank=True)
    cessation_date = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "party_director"
        indexes = [models.Index(fields=["party_type", "party_user"], name="idx_party_dir_party")]

    def __str__(self):
        return f"{self.director_name} ({self.party_type})"


class PartyStatutoryRegistration(models.Model):
    """Employer/contractor statutory registrations with validity (EPFO, ESIC,
    Shops & Est., Factory licence, CLRA, BOCW, PT, LWF, Apprenticeship...)."""

    PARTY = [("employer", "Employer"), ("contractor", "Contractor")]
    KIND = [("EPFO", "EPFO"), ("ESIC", "ESIC"), ("SHOPS_EST", "Shops & Establishments"),
            ("FACTORY", "Factory Licence"), ("CLRA", "Contract Labour (CLRA)"),
            ("BOCW", "BOCW"), ("PT", "Professional Tax"), ("LWF", "Labour Welfare Fund"),
            ("APPRENTICE", "Apprenticeship"), ("OTHER", "Other")]

    party_type = models.CharField(max_length=20, choices=PARTY)
    party_user = models.ForeignKey(User, on_delete=models.CASCADE,
                                   related_name="statutory_registrations")
    reg_kind = models.CharField(max_length=20, choices=KIND)
    reg_number = models.CharField(max_length=80, blank=True)
    authority = models.CharField(max_length=120, blank=True)
    issued_at = models.DateField(null=True, blank=True)
    expiry_at = models.DateField(null=True, blank=True)
    verification_status = models.CharField(max_length=20, default="PENDING")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "party_statutory_registration"
        indexes = [
            models.Index(fields=["party_type", "party_user"], name="idx_party_stat_party"),
            models.Index(fields=["reg_kind"], name="idx_party_stat_kind"),
        ]

    def __str__(self):
        return f"{self.reg_kind} {self.reg_number}"


class PartyContact(models.Model):
    """Primary & compliance contacts of an employer/contractor entity."""

    PARTY = [("employer", "Employer"), ("contractor", "Contractor")]
    KINDS = [("primary", "Primary"), ("compliance", "Compliance"),
             ("billing", "Billing"), ("other", "Other")]

    party_type = models.CharField(max_length=20, choices=PARTY)
    party_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="contacts")
    kind = models.CharField(max_length=20, choices=KINDS, default="other")
    full_name = models.CharField(max_length=120, blank=True)
    email = models.EmailField(max_length=120, blank=True)
    mobile = models.CharField(max_length=20, blank=True)
    designation = models.CharField(max_length=120, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "party_contact"
        indexes = [models.Index(fields=["party_type", "party_user"], name="idx_party_contact")]

    def __str__(self):
        return f"{self.kind} {self.full_name}"


class PartyBank(models.Model):
    """Banking details of an employer/contractor entity."""

    PARTY = [("employer", "Employer"), ("contractor", "Contractor")]

    party_type = models.CharField(max_length=20, choices=PARTY)
    party_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="banks")
    account_holder_name = models.CharField(max_length=120)
    bank_name = models.CharField(max_length=120)
    account_number = models.CharField(max_length=40)
    ifsc_code = models.CharField(max_length=20)
    is_primary = models.BooleanField(default=False)
    annual_turnover_band = models.CharField(max_length=40, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "party_bank"
        indexes = [models.Index(fields=["party_type", "party_user"], name="idx_party_bank")]

    def __str__(self):
        return f"{self.bank_name} {self.account_number[-4:]}"


class PartyContract(models.Model):
    """A principal-employer ↔ contractor contract / work order linked to a site."""

    PARTY = [("employer", "Employer"), ("contractor", "Contractor")]

    party_type = models.CharField(max_length=20, choices=PARTY)
    party_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="contracts")
    counterpart_name = models.CharField(max_length=120, blank=True)
    site = models.ForeignKey("Site", on_delete=models.SET_NULL, null=True, blank=True,
                             related_name="party_contracts")
    work_order_no = models.CharField(max_length=80, blank=True)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "party_contract"
        indexes = [models.Index(fields=["party_type", "party_user"], name="idx_party_contract")]

    def __str__(self):
        return f"{self.work_order_no or self.id}"


class PartyDocument(models.Model):
    """Verified business documents of an employer/contractor (PAN, GST, CLRA...)."""

    PARTY = [("employer", "Employer"), ("contractor", "Contractor")]
    STATUS = [("PENDING", "Pending"), ("UNDER_VERIFICATION", "Under Verification"),
              ("VERIFIED", "Verified"), ("REJECTED", "Rejected"), ("EXPIRED", "Expired")]

    party_type = models.CharField(max_length=20, choices=PARTY)
    party_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="party_documents")
    doc_type = models.CharField(max_length=60)
    doc_name = models.CharField(max_length=120, blank=True)
    file_path = models.CharField(max_length=255, blank=True)
    verification_status = models.CharField(max_length=20, choices=STATUS, default="PENDING")
    issued_at = models.DateField(null=True, blank=True)
    expiry_at = models.DateField(null=True, blank=True)
    ocr_accuracy = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "party_document"
        indexes = [
            models.Index(fields=["party_type", "party_user"], name="idx_party_doc_party"),
            models.Index(fields=["verification_status"], name="idx_party_doc_status"),
        ]

    def __str__(self):
        return f"{self.doc_type} {self.verification_status}"


class PartyConsentDeclaration(models.Model):
    """Recorded consents / declarations (info-accurate, authorised-rep, terms,
    privacy, consent-for-verification) signed by an employer or contractor."""

    PARTY = [("employer", "Employer"), ("contractor", "Contractor")]
    DECL = [("INFO_ACCURATE", "Information Accurate"), ("AUTHORISED_REP", "Authorised Representative"),
            ("TERMS", "Accepted Terms"), ("PRIVACY", "Privacy Policy"),
            ("VERIFICATION_CONSENT", "Consent for Verification"), ("DATA_PROCESSING", "Data Processing")]

    party_type = models.CharField(max_length=20, choices=PARTY)
    party_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="consents")
    declaration = models.CharField(max_length=30, choices=DECL)
    accepted = models.BooleanField(default=True)
    accepted_at = models.DateTimeField(auto_now_add=True)
    ip_address = models.CharField(max_length=45, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "party_consent_declaration"
        constraints = [models.UniqueConstraint(
            fields=["party_type", "party_user", "declaration"], name="uq_party_consent")]

    def __str__(self):
        return f"{self.declaration} {self.accepted}"


class PartyMaster(models.Model):
    """Generic party master (employers/contractors/sites/workers trading partners)."""

    KIND = [("employer", "Employer"), ("contractor", "Contractor"),
            ("site", "Site"), ("worker", "Worker"), ("vendor", "Vendor"), ("other", "Other")]

    party_type = models.CharField(max_length=20, choices=KIND)
    party_name = models.CharField(max_length=160)
    address = models.CharField(max_length=255, blank=True)
    state = models.CharField(max_length=60, blank=True)
    city = models.CharField(max_length=60, blank=True)
    contact_name = models.CharField(max_length=120, blank=True)
    contact_mobile = models.CharField(max_length=20, blank=True)
    contact_email = models.EmailField(max_length=120, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "party_master"
        indexes = [models.Index(fields=["party_type"], name="idx_party_master_type")]

    def __str__(self):
        return f"{self.party_type} {self.party_name}"
