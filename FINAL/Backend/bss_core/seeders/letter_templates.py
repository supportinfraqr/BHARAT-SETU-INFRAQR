"""All-India default letter templates (idempotent, additive).

Admin can edit these and add state-wise variants; an employer picks a template
per site. Resolution order at render time: site's choice → state template →
all-India default (these rows).

There is deliberately **no** HTML in this file. The canonical library is the
generated ``bss_core/seeds/letter_defaults.py`` (produced by
``python manage.py dump_letter_defaults``); this module simply takes the
all-India rows out of that snapshot. Keeping the markup in one generated file
is what stops the appointment letter and the statutory Form XV certificate from
drifting apart between hand-maintained copies.

This is the additive path: it only ever *creates* the two all-India rows if they
are missing, and never overwrites or deletes an admin's edits, so it is safe to
run on every deploy. Use ``python manage.py seed_letter_templates --reset`` to
reproduce the exact full library (all states included).
"""


def all_india_defaults():
    """The all-India rows from the canonical snapshot, in a stable order."""
    from bss_core.seeds import letter_defaults as DEFAULTS

    return [e for e in DEFAULTS.TEMPLATES if not (e.get("state") or "")]


def seed():
    """Create the all-India letter defaults if absent. Returns rows created."""
    from bss_core import letter_brand
    from bss_core.models import LetterTemplate

    created = 0
    for e in all_india_defaults():
        kind = e["letter_type"]
        _, made = LetterTemplate.objects.get_or_create(
            state=e.get("state") or "",
            letter_type=kind,
            name=e["name"],
            defaults={
                # A statutory type can never carry a logo, whatever the
                # snapshot says, so a stale snapshot cannot reintroduce one.
                "html": letter_brand.ensure_letter_html(e["html"], kind),
                "logo_url": (e.get("logo_url") or "")
                            if letter_brand.wants_logo(kind) else "",
                "is_active": bool(e.get("is_active", True)),
            })
        created += int(made)
    return created
