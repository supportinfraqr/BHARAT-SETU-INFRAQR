# Generated for the BSS support contact form.

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('bss_core', '0194_employer_staff'),
    ]

    operations = [
        migrations.CreateModel(
            name='ContactMessage',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('reference', models.CharField(max_length=40, unique=True)),
                ('name', models.CharField(max_length=120)),
                ('role', models.CharField(choices=[('worker', 'Worker'), ('contractor', 'Contractor'), ('employer', 'Employer'), ('employer_staff', 'Employer staff')], default='worker', max_length=20)),
                ('bss_id', models.CharField(blank=True, max_length=40)),
                ('email', models.EmailField(max_length=254)),
                ('phone', models.CharField(blank=True, max_length=20)),
                ('category', models.CharField(choices=[('account', 'Account & access'), ('attendance', 'Attendance & wages'), ('gate_pass', 'Gate pass'), ('compliance', 'Compliance & documents'), ('technical', 'Technical issue'), ('other', 'Other')], default='other', max_length=20)),
                ('subject', models.CharField(max_length=160)),
                ('message', models.TextField()),
                ('status', models.CharField(choices=[('NEW', 'New'), ('READ', 'Read'), ('RESOLVED', 'Resolved')], default='NEW', max_length=10)),
                ('emailed', models.BooleanField(default=False)),
                ('email_error', models.TextField(blank=True)),
                ('ip_address', models.GenericIPAddressField(blank=True, null=True)),
                ('user_agent', models.CharField(blank=True, max_length=255)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='contact_messages', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'contact_message',
                'ordering': ['-created_at'],
                'indexes': [
                    models.Index(fields=['role'], name='idx_contact_role'),
                    models.Index(fields=['created_at'], name='idx_contact_created'),
                ],
            },
        ),
    ]
