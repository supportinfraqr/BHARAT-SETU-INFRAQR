# Register-wise CLRA templates: one template per (state, purpose) even when
# several purposes share a form_code (Maharashtra maps all registers to FORM II).
# This relaxes the (state, form_code) uniqueness so duplicate form codes are kept
# apart by purpose.
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('bss_core', '0120_custom_form_site_adoption'),
    ]

    operations = [
        migrations.AddField(
            model_name='registertemplate',
            name='purpose',
            field=models.CharField(blank=True, default='', max_length=160),
        ),
        migrations.RemoveConstraint(
            model_name='registertemplate',
            name='uq_register_template_state_form',
        ),
        migrations.AddConstraint(
            model_name='registertemplate',
            constraint=models.UniqueConstraint(fields=('state', 'purpose', 'form_code'),
                                               name='uq_register_template_state_purpose_form'),
        ),
    ]