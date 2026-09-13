from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("bss_core", "0047_merge_nominee_docs_and_bss_id_sequence"),
    ]

    operations = [
        migrations.AlterField(
            model_name="contractorsiteallotment",
            name="status",
            field=models.CharField(
                choices=[("PENDING", "Pending"), ("APPROVED", "Approved"),
                         ("REJECTED", "Rejected"), ("RELEASED", "Released")],
                default="PENDING", max_length=20),
        ),
        migrations.AddField(
            model_name="contractorsiteallotment",
            name="release_requested_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="contractorsiteallotment",
            name="release_requested_by",
            field=models.CharField(blank=True, max_length=20),
        ),
        migrations.AddField(
            model_name="contractorsiteallotment",
            name="released_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
