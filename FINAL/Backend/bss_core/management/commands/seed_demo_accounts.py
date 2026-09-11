"""Seed the BSS demo accounts (workers / contractors / employers).

Idempotent — safe to re-run. Usage:

    python manage.py seed_demo_accounts

Passwords:
    workers     -> Bss@Worker123
    contractors -> Bss@Contractor123
    employers   -> Bss@Employer123

BSS IDs follow the standard format: BSS-W / BSS-C / BSS-E + 10-digit PK.
"""

from django.core.management.base import BaseCommand
from django.db import transaction

from bss_core.models import (
    ContractorProfile,
    EmployerProfile,
    User,
    UserCredential,
    WorkerIdentity,
    WorkerOther,
)

WORKER_PASSWORD = "Bss@Worker123"
CONTRACTOR_PASSWORD = "Bss@Contractor123"
EMPLOYER_PASSWORD = "Bss@Employer123"

# (phone, name) — 9999294962 is the real test number; the rest are easy demo ids.
WORKERS = [
    ("9999294962", "Syed Yasser Ali"),
    ("1111111111", "Ramesh Kumar"),
    ("2222222222", "Suresh Patel"),
    ("3333333333", "Anita Devi"),
]

# (phone, contractor name)
CONTRACTORS = [
    ("4444444444", "BuildWell Contractors"),
    ("5555555555", "Skyline Infra"),
    ("6666666666", "Metro Labour Co"),
]

# (phone, employer name)
EMPLOYERS = [
    ("7777777777", "Adani Infra Pvt Ltd"),
    ("8888888888", "L&T Construction"),
]

# Contact/registration details shown to bound workers (contractor & employer
# details on the worker dashboard). Keyed by phone.
CONTRACTOR_DETAILS = {
    "4444444444": {"contact_person": "Rajesh Nair", "email": "contact@buildwell.example",
                   "lin": "MH/CLRA/2026/000444", "state": "Maharashtra",
                   "district": "Mumbai Suburban", "address": "Plot 14, MIDC, Andheri East, Mumbai 400093"},
    "5555555555": {"contact_person": "Meera Iyer", "email": "ops@skylineinfra.example",
                   "lin": "MH/CLRA/2026/000555", "state": "Maharashtra",
                   "district": "Thane", "address": "2nd Floor, Hiranandani Estate, Thane West 400607"},
    "6666666666": {"contact_person": "Salim Shaikh", "email": "admin@metrolabour.example",
                   "lin": "MH/CLRA/2026/000666", "state": "Maharashtra",
                   "district": "Pune", "address": "Survey 88, Hinjewadi Phase 2, Pune 411057"},
}

EMPLOYER_DETAILS = {
    "7777777777": {"contact_person": "Priya Menon", "email": "projects@adaniinfra.example",
                   "industry": "Infrastructure", "lin": "MH/PE/2026/000777",
                   "state": "Maharashtra", "district": "Mumbai",
                   "address": "Adani Corporate House, Shantigram, Ahmedabad 382421"},
    "8888888888": {"contact_person": "Karthik Rao", "email": "sites@lntconstruction.example",
                   "industry": "Construction", "lin": "MH/PE/2026/000888",
                   "state": "Maharashtra", "district": "Mumbai Suburban",
                   "address": "L&T House, Ballard Estate, Mumbai 400001"},
}


def _bss_worker_id(user_id):
    return f"BSS-W{user_id:010d}"


def _bss_contractor_code(user_id):
    return f"BSS-C{user_id:010d}"


def _bss_employer_code(user_id):
    return f"BSS-E{user_id:010d}"


def _get_or_create_user(username, password, role):
    user, _ = User.objects.get_or_create(
        username=username,
        defaults={"role": role, "account_active": True, "is_verified": True, "is_active": True},
    )
    user.role = role
    user.is_active = True
    user.set_password(password)
    user.save()
    return user


def _set_mobile(user, phone):
    UserCredential.objects.filter(user=user, identity_type="mobile").delete()
    UserCredential.objects.update_or_create(
        identity_type="mobile", identity_value=phone,
        defaults={"user": user, "is_primary": True, "verified": True},
    )


class Command(BaseCommand):
    help = "Create/refresh the BSS demo worker, contractor and employer accounts."

    @transaction.atomic
    def handle(self, *args, **options):
        for phone, name in WORKERS:
            user = _get_or_create_user(f"worker_{phone}", WORKER_PASSWORD, "worker")
            WorkerIdentity.objects.update_or_create(
                user=user,
                defaults={"bss_worker_id": _bss_worker_id(user.id), "name": name, "mobile_number": phone},
            )
            WorkerOther.objects.get_or_create(user=user)
            _set_mobile(user, phone)
            self.stdout.write(f"worker    {phone}  {_bss_worker_id(user.id)}  {name}")

        for phone, name in CONTRACTORS:
            user = _get_or_create_user(f"contractor_{phone}", CONTRACTOR_PASSWORD, "contractor")
            ContractorProfile.objects.update_or_create(
                user=user,
                defaults={
                    "contractor_name": name, "trade_name": name,
                    "contractor_code": _bss_contractor_code(user.id),
                    "approval_status": "APPROVED", "is_verified_badge": True, "mobile": phone,
                    **CONTRACTOR_DETAILS.get(phone, {}),
                },
            )
            _set_mobile(user, phone)
            self.stdout.write(f"contractor {phone}  {_bss_contractor_code(user.id)}  {name}")

        for phone, name in EMPLOYERS:
            user = _get_or_create_user(f"employer_{phone}", EMPLOYER_PASSWORD, "employer")
            EmployerProfile.objects.update_or_create(
                user=user,
                defaults={
                    "employer_name": name, "trade_name": name,
                    "employer_code": _bss_employer_code(user.id),
                    "approval_status": "APPROVED", "mobile": phone,
                    **EMPLOYER_DETAILS.get(phone, {}),
                },
            )
            _set_mobile(user, phone)
            self.stdout.write(f"employer  {phone}  {_bss_employer_code(user.id)}  {name}")

        self.stdout.write(self.style.SUCCESS("Demo accounts seeded."))
