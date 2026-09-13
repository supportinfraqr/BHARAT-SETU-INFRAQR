from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("bss_core", "0044_workeraddressmobility_current_same_as_permanent"),
    ]

    operations = [
        migrations.AddField(
            model_name="workercontractorbinding",
            name="rejected_by",
            field=models.CharField(blank=True, max_length=20),
        ),
        migrations.AddField(
            model_name="workercontractorbinding",
            name="rejected_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="workercontractorbinding",
            name="unbind_requested_by",
            field=models.CharField(blank=True, max_length=20),
        ),
        migrations.AddField(
            model_name="contractoremployerbinding",
            name="rejected_by",
            field=models.CharField(blank=True, max_length=20),
        ),
        migrations.AddField(
            model_name="contractoremployerbinding",
            name="rejected_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="contractoremployerbinding",
            name="unbind_requested_by",
            field=models.CharField(blank=True, max_length=20),
        ),
    ]
