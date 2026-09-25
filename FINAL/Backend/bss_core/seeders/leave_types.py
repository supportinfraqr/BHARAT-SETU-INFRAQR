"""Leave-type master catalog (mandatory, create-only)."""

# Standard leave categories. `code` is the stable key (unique).
LEAVE_TYPES = [
    ("CASUAL", "Casual Leave", 12, 0, True, 1),
    ("MEDICAL", "Medical Leave", 7, 0, True, 2),
    ("PERSONAL", "Personal Leave", 5, 0, True, 3),
]


def seed():
    from bss_core.models import LeaveType
    created = 0
    for code, name, entitlement, opening, is_paid, order in LEAVE_TYPES:
        _, was_created = LeaveType.objects.get_or_create(
            code=code,
            defaults={
                "name": name,
                "annual_entitlement": entitlement,
                "opening_balance": opening,
                "is_paid": is_paid,
                "is_active": True,
                "sort_order": order,
            },
        )
        created += int(was_created)
    return created
