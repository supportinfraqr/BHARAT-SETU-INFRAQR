from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("bss_core", "0044_workeraddressmobility_current_same_as_permanent"),
    ]

    operations = [
        migrations.AddField(
            model_name="workerfamilydependant",
            name="nominee_documents",
            field=models.JSONField(default=list, blank=True),
        ),
    ]
