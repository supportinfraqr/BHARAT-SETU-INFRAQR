from django.db import migrations

# Standard worker document catalog. Codes are <= 6 chars (model constraint).
DOCUMENTS = [
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
]


def seed(apps, schema_editor):
    Master = apps.get_model("bss_core", "WorkerDocumentMaster")
    for code, name, mandatory, uploaded_by, order in DOCUMENTS:
        Master.objects.update_or_create(
            code=code,
            defaults={
                "document_name": name,
                "is_mandatory": mandatory,
                "uploaded_by": uploaded_by,
                "sort_order": order,
            },
        )


def unseed(apps, schema_editor):
    Master = apps.get_model("bss_core", "WorkerDocumentMaster")
    Master.objects.filter(code__in=[d[0] for d in DOCUMENTS]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("bss_core", "0020_workerdocument_file"),
    ]

    operations = [
        migrations.RunPython(seed, unseed),
    ]
