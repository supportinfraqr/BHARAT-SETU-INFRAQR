"""Random alphanumeric BSS IDs for all existing accounts (data + schema).

Regenerates any legacy PK-derived numeric codes (BSS-W0000000004 ...) into
collision-checked random alphanumeric IDs, and hardens the schema so a randomly
allocated code can never be clobbered by a concurrent re-allocation:

* WorkerIdentity.bss_worker_id   -> already unique=True (no change)
* ContractorProfile.contractor_code -> unique=True (new)
* EmployerProfile.employer_code      -> unique=True (new)
"""

import re

from django.db import migrations, models

from api import bss_ids as _alloc

# A code is left alone only when it is ALREADY in the new random format.
# Everything else (PK-derived numbers, hand-made "CTR-..." fixtures, blanks)
# is regenerated, so after this migration every account carries a uniform,
# non-guessable BSS ID.
# New format charset is A-Z/2-9 excluding I, O, 0 and 1 (readability), i.e.
# [A-HJ-NP-Z2-9]. Using this exact class (not [A-Z0-9]) is what lets us tell a
# real random code apart from a PK-derived "BSS-W0000000001".
_NEW_WORKER_RE = re.compile(r"^BSS-W[A-HJ-NP-Z2-9]{10}$")
_NEW_CONTRACTOR_RE = re.compile(r"^BSS-C[A-HJ-NP-Z2-9]{10}$")
_NEW_EMPLOYER_RE = re.compile(r"^BSS-E[A-HJ-NP-Z2-9]{10}$")


def _regen_worker(apps, schema_editor):
    WorkerIdentity = apps.get_model("bss_core", "WorkerIdentity")
    for row in WorkerIdentity.objects.all().only("id", "bss_worker_id"):
        code = row.bss_worker_id
        if not code or not _NEW_WORKER_RE.match(code):
            row.bss_worker_id = _alloc.new_bss_worker_id()
            row.save(update_fields=["bss_worker_id"])


def _regen_contractor(apps, schema_editor):
    ContractorProfile = apps.get_model("bss_core", "ContractorProfile")
    for row in ContractorProfile.objects.all().only("id", "contractor_code"):
        code = row.contractor_code
        if not code or not _NEW_CONTRACTOR_RE.match(code):
            row.contractor_code = _alloc.new_bss_contractor_code()
            row.save(update_fields=["contractor_code"])


def _regen_employer(apps, schema_editor):
    EmployerProfile = apps.get_model("bss_core", "EmployerProfile")
    for row in EmployerProfile.objects.all().only("id", "employer_code"):
        code = row.employer_code
        if not code or not _NEW_EMPLOYER_RE.match(code):
            row.employer_code = _alloc.new_bss_employer_code()
            row.save(update_fields=["employer_code"])


def _noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("bss_core", "0025_workercontractorbinding_department_and_more"),
    ]

    operations = [
        migrations.RunPython(_regen_worker, _noop),
        migrations.RunPython(_regen_contractor, _noop),
        migrations.RunPython(_regen_employer, _noop),
        migrations.AlterField(
            model_name="contractorprofile",
            name="contractor_code",
            field=models.CharField(max_length=40, blank=True, unique=True),
        ),
        migrations.AlterField(
            model_name="employerprofile",
            name="employer_code",
            field=models.CharField(max_length=40, blank=True, unique=True),
        ),
    ]
