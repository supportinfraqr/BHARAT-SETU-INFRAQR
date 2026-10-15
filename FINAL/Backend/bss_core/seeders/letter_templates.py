"""Default letter templates (all-India + Central heads) — idempotent, additive.

Admin can edit these and add state-wise variants; an employer picks a template
per site. Resolution order at render time: site's choice → state template →
all-India default (these rows). A site with ``jurisdiction == "central"``
resolves to the **Central** head templates seeded here.

There is deliberately **no** HTML in this file. The canonical library is the
generated ``bss_core/seeds/letter_defaults.py`` (produced by
``python manage.py dump_letter_defaults``); this module simply takes the
all-India + Central rows out of that snapshot. Keeping the markup in one
generated file is what stops the appointment letter and the statutory Form XV
certificate from drifting apart between hand-maintained copies.

This is the additive path: it only ever *creates* the default rows if they are
missing, and never overwrites or deletes an admin's edits, so it is safe to run
on every deploy. Use ``python manage.py seed_letter_templates --reset`` to
reproduce the exact full library (all states included).
"""

# Non-geographic regulatory heads whose templates ship as defaults on every
# deploy. "" = all-India fallback; "Central" = the Central-jurisdiction head.
DEFAULT_STATES = ("", "Central")


def default_rows():
    """The all-India + Central rows from the canonical snapshot, stable order."""
    from bss_core.seeds import letter_defaults as DEFAULTS

    return [e for e in DEFAULTS.TEMPLATES
            if (e.get("state") or "") in DEFAULT_STATES]


def all_india_defaults():
    """The all-India rows only (kept for backward compatibility)."""
    return [e for e in default_rows() if not (e.get("state") or "")]


def seed():
    """Create the default (all-India + Central) letter templates if absent.

    Returns the number of rows created."""
    from bss_core import letter_brand
    from bss_core.models import LetterTemplate

    created = 0
    for e in default_rows():
        kind = e["letter_type"]
        state = e.get("state") or ""
        _, made = LetterTemplate.objects.get_or_create(
            state=state,
            letter_type=kind,
            name=e["name"],
            defaults={
                # A statutory type can never carry a logo, whatever the
                # snapshot says, so a stale snapshot cannot reintroduce one.
                "html": letter_brand.ensure_letter_html(e["html"], kind, state=state),
                "logo_url": (e.get("logo_url") or "")
                            if letter_brand.wants_logo(kind, state=state) else "",
                "is_active": bool(e.get("is_active", True)),
            })
        created += int(made)
    return created
