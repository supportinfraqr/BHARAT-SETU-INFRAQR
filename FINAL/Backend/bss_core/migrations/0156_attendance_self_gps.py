from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("bss_core", "0155_translation_setting"),
    ]

    operations = [
        migrations.AlterField(
            model_name="attendance",
            name="capture_method",
            field=models.CharField(
                choices=[
                    ("QR", "QR"),
                    ("NFC", "NFC"),
                    ("CAMERA", "Camera"),
                    ("SHEET", "Uploaded Sheet"),
                    ("SELF", "Self (GPS)"),
                ],
                max_length=20,
            ),
        ),
        migrations.AlterField(
            model_name="attendance",
            name="verification_type",
            field=models.CharField(
                choices=[
                    ("qr_worker", "QR Worker"),
                    ("qr_site", "QR Site"),
                    ("nfc_card", "NFC Card"),
                    ("face_image", "Face Image"),
                    ("badge_image", "Badge Image"),
                    ("gps_self", "GPS Self"),
                ],
                max_length=30,
                null=True,
                blank=True,
            ),
        ),
        migrations.AddField(
            model_name="attendance",
            name="gps_distance_m",
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True),
        ),
        migrations.AddField(
            model_name="attendance",
            name="gps_accuracy_m",
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True),
        ),
    ]
