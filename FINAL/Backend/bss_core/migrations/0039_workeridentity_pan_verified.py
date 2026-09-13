from django.db import migrations, models


def backfill_pan_verified(apps, schema_editor):
    """Mark PAN as verified for workers whose PAN matches a DigiLocker-fetched
    document (only DigiLocker-sourced PANs are verified)."""
    WorkerIdentity = apps.get_model("bss_core", "WorkerIdentity")
    DigiLockerDocument = apps.get_model("bss_core", "DigiLockerDocument")
    for identity in WorkerIdentity.objects.exclude(pan=""):
        if DigiLockerDocument.objects.filter(
            user=identity.user, pan_number__iexact=identity.pan
        ).exists():
            identity.pan_verified = True
            identity.save(update_fields=["pan_verified"])


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("bss_core", "0038_workeraddressmobility_current_locality_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="workeridentity",
            name="pan_verified",
            field=models.BooleanField(default=False),
        ),
        migrations.RunPython(backfill_pan_verified, noop),
    ]
