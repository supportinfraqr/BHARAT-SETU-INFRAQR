from django.db import migrations


def backfill(apps, schema_editor):
    Adoption = apps.get_model("bss_core", "EmployerMedicalFormAdoption")
    for adoption in Adoption.objects.select_related("template"):
        template = adoption.template
        if template is None:
            continue
        adoption.adopted_version = template.version or 1
        adoption.adopted_html = template.html or ""
        adoption.save(update_fields=["adopted_version", "adopted_html"])


class Migration(migrations.Migration):
    dependencies = [("bss_core", "0192_medical_adoption_snapshot")]
    operations = [migrations.RunPython(backfill, migrations.RunPython.noop)]
