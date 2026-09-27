# Backfills consent_date for contractors that already have a registered_at.
#
# A BSS profile is created at the point consent is recorded — the live helper
# stamps both registered_at and consent_date from one now() — but the rows that
# predate that change have a registered_at and a NULL consent_date, so the QR
# scan shows "Member of BSS since" with an empty "Consent accepted" beside it.
# The user explicitly asked for the two to be the same, so this aligns the
# existing rows: consent_date := registered_at::date.
#
# Only rows with a real registered_at are touched. Contractors with no
# registered_at at all are left fully blank rather than guessed.
#
# Reverse is a noop: after the fact there is no way to tell a consent_date this
# migration wrote from one that was legitimately captured later, and re-nulling
# a real consent date would be worse than leaving this in place.

from django.db import migrations


def backfill_consent_date(apps, schema_editor):
    ContractorProfile = apps.get_model("bss_core", "ContractorProfile")
    for profile in ContractorProfile.objects.filter(
            consent_date__isnull=True, registered_at__isnull=False):
        profile.consent_date = profile.registered_at.date()
        profile.save(update_fields=["consent_date"])


class Migration(migrations.Migration):

    dependencies = [
        ("bss_core", "0122_contractor_registered_at"),
    ]

    operations = [
        migrations.RunPython(backfill_consent_date, migrations.RunPython.noop),
    ]
