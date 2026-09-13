from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("bss_core", "0043_contractorsiteallotment_source"),
    ]

    operations = [
        migrations.AddField(
            model_name="workeraddressmobility",
            name="current_same_as_permanent",
            field=models.BooleanField(default=False),
        ),
    ]
