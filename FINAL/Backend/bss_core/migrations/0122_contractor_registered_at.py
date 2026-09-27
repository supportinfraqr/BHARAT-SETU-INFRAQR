# Records when a contractor profile was created on BSS, so "Member of BSS
# since" has a real, auditable source instead of an empty field.
#
# consent_date already existed but was never written by the self-registration
# flow, so it was NULL for every contractor and the QR-scan "Member of BSS
# since" row could never render. This adds the separate creation timestamp
# (profile can exist before terms are accepted) and backfills it for existing
# rows from the earliest BSS artefact we can actually evidence for them.
#
# NOTE: deliberately does NOT touch the StatutoryMaster `uq_statutory_label`
# constraint. The model no longer declares it, so `makemigrations` offers to
# drop it, but the `0113_remove_statutorymaster_uq_statutory_label` migration
# that another session planned never landed. Bundling that unrelated schema
# change into this feature migration would silently drop a unique constraint in
# prod. It is left for a deliberate, separate migration.

from django.db import migrations, models
from django.db.models import Min
from django.utils import timezone


def _midnight(day):
    """A timezone-aware midnight for a plain date."""
    return timezone.make_aware(
        timezone.datetime.combine(day, timezone.datetime.min.time()))


def backfill_registered_at(apps, schema_editor):
    """Stamp registered_at for existing contractors.

    Uses the earliest date we can actually evidence per contractor, in order of
    preference:
      1. consent_date        — they consented to join BSS
      2. earliest binding    — they first appeared on the platform
    Falls back to the contractor's licence start. Contractors with no evidence
    at all are left NULL rather than guessed: a fabricated date on a statutory
    credential is worse than an absent one.

    Registered_at is a DateTimeField, so plain dates are pinned to local
    midnight; binding timestamps keep their real time of day.
    """
    ContractorProfile = apps.get_model("bss_core", "ContractorProfile")
    ContractorEmployerBinding = apps.get_model("bss_core", "ContractorEmployerBinding")
    WorkerContractorBinding = apps.get_model("bss_core", "WorkerContractorBinding")

    for profile in ContractorProfile.objects.filter(registered_at__isnull=True):
        candidates = []
        if profile.consent_date:
            candidates.append(_midnight(profile.consent_date))
        else:
            emp = (ContractorEmployerBinding.objects
                   .filter(contractor_id=profile.user_id)
                   .aggregate(m=Min("created_at"))["m"])
            wrk = (WorkerContractorBinding.objects
                   .filter(contractor_id=profile.user_id)
                   .aggregate(m=Min("created_at"))["m"])
            candidates.extend(v for v in (emp, wrk) if v)
            if not candidates and profile.licence_valid_from:
                candidates.append(_midnight(profile.licence_valid_from))

        if not candidates:
            continue
        profile.registered_at = min(candidates)
        profile.save(update_fields=["registered_at"])


class Migration(migrations.Migration):

    dependencies = [
        ("bss_core", "0121_register_template_purpose_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="contractorprofile",
            name="registered_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.RunPython(backfill_registered_at, migrations.RunPython.noop),
    ]
