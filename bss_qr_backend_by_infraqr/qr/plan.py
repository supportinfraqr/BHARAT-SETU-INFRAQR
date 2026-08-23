"""Plan enforcement for the QR system.

Plans: SILVER, GOLD, PLATINUM. Admin sets plan_type + plan_expiry on an Employer.

Enforcement:
- An employer's plan must be APPROVED + not expired for their workforce to use paid features.
- Feature gating based on PLAN_FEATURES tiers.
"""
from django.utils import timezone

PLAN_FEATURES = {
    "SILVER": ["Static QR security layer", "Worker record lookup", "Basic scan logging", "Date & time capture", "BharatShramSetu integration"],
    "GOLD": ["All Silver features", "Automated QR scan counting", "Scanning-user capture", "OpenStreetMap scan location", "Role-based access permissions"],
    "PLATINUM": ["All Gold features", "Advanced audit reporting", "Site / contractor level views", "Exception monitoring", "Enhanced admin controls"],
}

# Machine-readable feature keys per plan
PLAN_LEVEL = {"SILVER": 1, "GOLD": 2, "PLATINUM": 3}


def plan_level(plan_type: str) -> int:
    return PLAN_LEVEL.get((plan_type or "").upper(), 0)


def is_plan_active(employer) -> bool:
    """A plan is active if the employer is approved and the plan is not expired."""
    if not employer:
        return False
    if employer.approval_status != "APPROVED":
        return False
    if not employer.plan_expiry:
        # No expiry set -> treated as active if a plan is attached
        return bool(employer.plan_type and employer.plan_type.upper() in PLAN_LEVEL)
    return timezone.now() < employer.plan_expiry


def plan_status(employer) -> dict:
    """Return a structured plan status for an employer."""
    if not employer:
        return {"plan_type": None, "active": False, "expired": True, "approved": False, "level": 0}
    active = is_plan_active(employer)
    return {
        "plan_type": employer.plan_type,
        "plan_expiry": employer.plan_expiry,
        "active": active,
        "expired": not active,
        "approved": employer.approval_status == "APPROVED",
        "level": plan_level(employer.plan_type),
        "features": PLAN_FEATURES.get(employer.plan_type, []) if employer.plan_type in PLAN_LEVEL else [],
    }


def has_feature(employer, required_level: int) -> bool:
    """Whether the employer's plan grants at least `required_level`."""
    return plan_level(getattr(employer, "plan_type", "")) >= required_level


def employer_for_scope(emp_id):
    from .models import Employer
    return Employer.objects.filter(pk=emp_id).first() if emp_id else None
