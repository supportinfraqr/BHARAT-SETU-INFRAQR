# Add WorkerOther.available_for_work (worker availability toggle, "Available for work" in Rozgar Setu)
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("bss_core", "0009_workeridentity_place_of_birth"),
    ]

    operations = [
        migrations.AddField(
            model_name="workerother",
            name="available_for_work",
            field=models.BooleanField(default=False),
        ),
    ]
