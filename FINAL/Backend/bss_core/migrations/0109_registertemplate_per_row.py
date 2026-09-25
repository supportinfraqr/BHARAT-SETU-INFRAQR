from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("bss_core", "0108_statutorymaster_uq_label"),
    ]

    operations = [
        migrations.AddField(
            model_name="registertemplate",
            name="per_row",
            field=models.BooleanField(default=False),
        ),
    ]