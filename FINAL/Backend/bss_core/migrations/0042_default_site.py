from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("bss_core", "0041_contractoremployerbinding_unbind_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="contractorprofile",
            name="default_site",
            field=models.ForeignKey(blank=True, null=True,
                                    on_delete=django.db.models.deletion.SET_NULL,
                                    related_name="+", to="bss_core.site"),
        ),
        migrations.AddField(
            model_name="employerprofile",
            name="default_site",
            field=models.ForeignKey(blank=True, null=True,
                                    on_delete=django.db.models.deletion.SET_NULL,
                                    related_name="+", to="bss_core.site"),
        ),
    ]
