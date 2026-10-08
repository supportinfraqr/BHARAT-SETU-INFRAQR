"""Worker document master catalog (mandatory, idempotent)."""

# Standard worker document catalog. Codes are <= 6 chars (model constraint).
DOCUMENTS = [
    ("WM01", "Aadhaar Card", True, "worker", 0),
    ("WM02", "PAN Card", True, "worker", 0),
    ("WM03", "Address Proof", True, "worker", 0),
    ("WM04", "Education Certificate", False, "worker", 0),
    ("WM05", "Skill Certificate", False, "worker", 0),
    ("AADHAR", "Aadhaar Card", True, "worker", 1),
    ("PAN", "PAN Card", True, "worker", 2),
    ("BANK", "Bank Passbook / Cancelled Cheque", True, "worker", 3),
    ("PHOTO", "Passport Size Photo", True, "worker", 4),
    ("SIGN", "Signature", True, "worker", 5),
    ("UAN", "UAN Card", False, "worker", 6),
    ("ESIC", "ESIC Card", False, "worker", 7),
    ("BOCW", "BOCW Card", False, "worker", 8),
    ("EDU", "Educational Certificate", False, "worker", 9),
    ("MED", "Medical Fitness Certificate", True, "worker", 10),
    ("TGP", "Temporary Gate Pass", False, "system", 11),
    ("PGP", "Permanent Gate Pass", True, "system", 12),
    ("APPT", "Appointment Letter", False, "system", 13),
    ("EXPL", "Experience Letter", False, "system", 14),
    ("CARD", "Employment Card", False, "system", 15),
]


def seed():
    from bss_core.models import WorkerDocumentMaster
    created = 0
    for code, name, mandatory, uploaded_by, order in DOCUMENTS:
        _, was_created = WorkerDocumentMaster.objects.update_or_create(
            code=code,
            defaults={
                "document_name": name,
                "is_mandatory": mandatory,
                "uploaded_by": uploaded_by,
                "sort_order": order,
            },
        )
        created += int(was_created)
    return created
