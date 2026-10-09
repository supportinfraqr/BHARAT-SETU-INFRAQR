from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("bss_core", "0154_seed_employment_card_master"),
    ]

    operations = [
        migrations.CreateModel(
            name="TranslationSetting",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "mode",
                    models.CharField(
                        choices=[
                            ("free", "Free (unofficial) Google endpoint"),
                            ("google_cloud", "Google Cloud Translation API"),
                        ],
                        default="free",
                        max_length=20,
                    ),
                ),
                ("api_key_enc", models.CharField(blank=True, default="", max_length=600)),
                ("enabled", models.BooleanField(default=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={"db_table": "translation_setting"},
        ),
    ]
