"""Seed default **AI checkpoints** for every CLRA register template and every
additional form, so the AI audit checks a sensible baseline set of conditions.

Only fills rows whose checklist is empty (the admin can then edit them); use
``--overwrite`` to reset all to the defaults.

    python manage.py seed_ai_checkpoints
    python manage.py seed_ai_checkpoints --overwrite
"""

from django.core.management.base import BaseCommand


def _register_checks(template):
    code = (template.form_code or "").strip()
    return [
        {"type": "columns", "label": "Register matches the template columns", "required": True},
        {"type": "title", "label": f"Form title / heading ({code})" if code else "Form title / heading", "required": True},
        {"type": "name", "label": "Name of workmen / workers present", "required": True},
        {"type": "period", "label": "Wage / reporting period stated", "required": True},
        {"type": "signature", "label": "Signature of contractor / authorised signatory", "required": True},
    ]


def _form_checks(form):
    name = (form.name or "").strip()
    return [
        {"type": "title", "label": f"Document title / heading ({name})" if name else "Document title / heading", "required": True},
        {"type": "signature", "label": "Signature / company seal", "required": False},
        {"type": "period", "label": "Applicable period / validity dates", "required": False},
    ]


class Command(BaseCommand):
    help = "Seed default AI checkpoints for register templates and additional forms."

    def add_arguments(self, parser):
        parser.add_argument("--overwrite", action="store_true",
                            help="Replace existing checkpoints with the defaults.")
        parser.add_argument("--only", choices=["registers", "forms"], default=None,
                            help="Limit to registers or forms only.")

    def handle(self, *args, **options):
        from bss_core.models import CustomFormName, RegisterTemplate

        overwrite = options["overwrite"]
        only = options["only"]
        reg = form = 0

        if only in (None, "registers"):
            for t in RegisterTemplate.objects.all():
                if overwrite or not t.ai_checks:
                    t.ai_checks = _register_checks(t)
                    t.save(update_fields=["ai_checks"])
                    reg += 1

        if only in (None, "forms"):
            for f in CustomFormName.objects.filter(is_active=True):
                if overwrite or not f.ai_checks:
                    f.ai_checks = _form_checks(f)
                    f.save(update_fields=["ai_checks"])
                    form += 1

        self.stdout.write(self.style.SUCCESS(
            f"AI checkpoints seeded — {reg} register template(s), {form} additional form(s)."))
