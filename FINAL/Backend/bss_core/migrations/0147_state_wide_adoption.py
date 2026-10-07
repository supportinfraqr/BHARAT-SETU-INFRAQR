"""CLRA/additional-form adoption moves from per-site to state-wide.

Every existing ``site``-scoped adoption row is rolled up into a ``site=None``
row for the same employer + state (union of adopted ids, active/mandatory
preserved), then the per-site rows are removed. Idempotent."""

from django.db import migrations


def _ensure_register_adoption(Adoption, employer_id, state, template_id, active):
    existing = Adoption.objects.filter(
        employer_id=employer_id, site__isnull=True, template_id=template_id).first()
    if existing is None:
        Adoption.objects.create(employer_id=employer_id, site=None, template_id=template_id,
                                state=state, is_active=active)
    elif active and not existing.is_active:
        existing.is_active = True
        existing.save(update_fields=["is_active"])


def _ensure_form_selection(Selection, employer_id, form_name_id, mandatory, active):
    existing = Selection.objects.filter(
        employer_id=employer_id, site__isnull=True, form_name_id=form_name_id).first()
    if existing is None:
        Selection.objects.create(employer_id=employer_id, site=None, form_name_id=form_name_id,
                                 is_mandatory=mandatory, is_active=active)
    else:
        fields = []
        if active and not existing.is_active:
            existing.is_active = True
            fields.append("is_active")
        if mandatory and not existing.is_mandatory:
            existing.is_mandatory = True
            fields.append("is_mandatory")
        if fields:
            existing.save(update_fields=fields)


def state_wide(apps, schema_editor):
    Adoption = apps.get_model("bss_core", "EmployerRegisterTemplateAdoption")
    Selection = apps.get_model("bss_core", "EmployerFormSelection")
    CustomFormName = apps.get_model("bss_core", "CustomFormName")

    # ── CLRA register adoption: (employer, state) → site=None rows ───────────
    site_rows = Adoption.objects.filter(site__isnull=False)
    register_changed = 0
    for employer_id, state in (site_rows.values_list("employer_id", "state").distinct()):
        rows = site_rows.filter(employer_id=employer_id, state__iexact=state)
        for template_id in set(rows.values_list("template_id", flat=True)):
            active = rows.filter(template_id=template_id, is_active=True).exists()
            _ensure_register_adoption(Adoption, employer_id, state, template_id, active)
            register_changed += 1
    site_rows.delete()

    # ── Additional-form catalog selection: (employer, form_name) ─────────────
    sel_site_rows = Selection.objects.filter(site__isnull=False)
    for employer_id, form_name_id in (sel_site_rows.values_list("employer_id", "form_name_id").distinct()):
        rows = sel_site_rows.filter(employer_id=employer_id, form_name_id=form_name_id)
        active_rows = rows.filter(is_active=True)
        active = active_rows.exists()
        mandatory = active_rows.filter(is_mandatory=True).exists()
        _ensure_form_selection(Selection, employer_id, form_name_id, mandatory, active)
    sel_site_rows.delete()

    # ── Employer's own forms: (employer, state, name) → site=None ────────────
    own_site_rows = CustomFormName.objects.filter(employer__isnull=False, site__isnull=False)
    for employer_id, state, name in (own_site_rows.values_list("employer_id", "state", "name").distinct()):
        source = own_site_rows.filter(employer_id=employer_id, state__iexact=state, name=name).first()
        existing = CustomFormName.objects.filter(
            employer_id=employer_id, site__isnull=True, state__iexact=state, name=name).first()
        if existing is None and source is not None:
            CustomFormName.objects.create(
                employer_id=employer_id, site=None, state=source.state, name=source.name,
                jurisdiction=getattr(source, "jurisdiction", "state"),
                format_variant=getattr(source, "format_variant", "new"),
                is_mandatory=source.is_mandatory, requires_document=source.requires_document,
                frequency=source.frequency, description=source.description,
                ai_checks=list(source.ai_checks or []), is_active=source.is_active,
                sort_order=source.sort_order, created_by=source.created_by)
    own_site_rows.delete()

    if register_changed:
        print(f"[0147] rolled up {register_changed} register adoption(s) from site → state scope")


class Migration(migrations.Migration):

    dependencies = [
        ("bss_core", "0146_register_letterhead_edges"),
    ]

    operations = [
        migrations.RunPython(state_wide, migrations.RunPython.noop),
    ]
