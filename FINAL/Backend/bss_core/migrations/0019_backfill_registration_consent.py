from django.db import migrations
from django.utils import timezone


def backfill(apps, schema_editor):
    WorkerOther = apps.get_model("bss_core", "WorkerOther")
    for obj in WorkerOther.objects.all():
        base = obj.created_at.date() if obj.created_at else timezone.now().date()
        changed = False
        if not obj.registration_date:
            obj.registration_date = base
            changed = True
        if obj.consent_date is None:
            obj.consent_date = base
            changed = True
        if obj.consent_registration is None:
            obj.consent_registration = True
            changed = True
        if obj.consent_verification is None:
            obj.consent_verification = True
            changed = True
        if not obj.registration_source:
            obj.registration_source = "Self Registered via App"
            changed = True
        if not obj.registered_by:
            obj.registered_by = "Worker Self-Service (BSS App)"
            changed = True
        if changed:
            obj.save()


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("bss_core", "0018_workerskill"),
    ]

    operations = [
        migrations.RunPython(backfill, noop),
    ]
