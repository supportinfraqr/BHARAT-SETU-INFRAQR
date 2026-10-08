from django.db import migrations


def seed(apps, schema_editor):
    Master = apps.get_model("bss_core", "WorkerDocumentMaster")
    Master.objects.update_or_create(
        code="CARD",
        defaults={
            "document_name": "Employment Card",
            "is_mandatory": False,
            "uploaded_by": "system",
            "sort_order": 15,
        },
    )


def unseed(apps, schema_editor):
    Master = apps.get_model("bss_core", "WorkerDocumentMaster")
    Master.objects.filter(code="CARD").delete()


class Migration(migrations.Migration):

    dependencies = [
        ("bss_core", "0153_workeridentity_pan_name"),
    ]

    operations = [
        migrations.RunPython(seed, unseed),
    ]
