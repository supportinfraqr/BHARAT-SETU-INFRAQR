from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("bss_core", "0217_site_is_mine_site"),
    ]

    operations = [
        migrations.AlterField(
            model_name="contactmessage",
            name="status",
            field=models.CharField(
                choices=[("NEW", "New"), ("READ", "Read"), ("RESOLVED", "Resolved"),
                         ("CLOSED", "Closed")],
                default="NEW", max_length=10),
        ),
        migrations.CreateModel(
            name="ContactMessageReply",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("body", models.TextField()),
                ("emailed", models.BooleanField(default=False)),
                ("email_error", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("author", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to="bss_core.user")),
                ("message", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="replies", to="bss_core.contactmessage")),
            ],
            options={
                "db_table": "contact_message_reply",
                "ordering": ["created_at"],
                "indexes": [models.Index(fields=["message", "created_at"], name="idx_contact_reply_msg")],
            },
        ),
    ]
