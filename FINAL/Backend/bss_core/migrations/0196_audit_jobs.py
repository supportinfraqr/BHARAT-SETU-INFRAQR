import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('bss_core', '0195_contact_message'),
    ]

    operations = [
        migrations.CreateModel(
            name='AuditSchedule',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('runs_per_month', models.PositiveSmallIntegerField(default=2)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('contractor', models.ForeignKey(limit_choices_to={'role': 'contractor'}, on_delete=django.db.models.deletion.CASCADE, related_name='audit_schedules', to=settings.AUTH_USER_MODEL)),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='+', to=settings.AUTH_USER_MODEL)),
                ('site', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='audit_schedules', to='bss_core.site')),
            ],
            options={
                'db_table': 'audit_schedule',
                'indexes': [models.Index(fields=['contractor', 'site'], name='idx_audit_schedule_pair')],
                'constraints': [models.UniqueConstraint(fields=('contractor', 'site'), name='uq_audit_schedule_contractor_site')],
            },
        ),
        migrations.CreateModel(
            name='AuditJob',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('month', models.CharField(max_length=20)),
                ('year', models.CharField(max_length=4)),
                ('financial_year', models.CharField(blank=True, max_length=12)),
                ('period_start', models.DateField(blank=True, null=True)),
                ('period_end', models.DateField(blank=True, null=True)),
                ('version', models.PositiveIntegerField(default=1)),
                ('is_current', models.BooleanField(default=True)),
                ('status', models.CharField(choices=[('PENDING', 'Pending'), ('BUILDING', 'Building folder'), ('RUNNING', 'Running'), ('READY', 'Ready'), ('FAILED', 'Failed')], default='PENDING', max_length=12)),
                ('job_dir', models.CharField(blank=True, max_length=500)),
                ('query_count', models.PositiveIntegerField(default=0)),
                ('worker_count', models.PositiveIntegerField(default=0)),
                ('report_html', models.CharField(blank=True, max_length=500)),
                ('report_pdf', models.CharField(blank=True, max_length=500)),
                ('report_xlsx', models.CharField(blank=True, max_length=500)),
                ('report_json', models.CharField(blank=True, max_length=500)),
                ('evidence_json', models.CharField(blank=True, max_length=500)),
                ('summary', models.JSONField(blank=True, default=dict)),
                ('token_usage', models.JSONField(blank=True, default=dict)),
                ('agent_version', models.CharField(blank=True, max_length=40)),
                ('provider', models.CharField(blank=True, max_length=40)),
                ('model', models.CharField(blank=True, max_length=120)),
                ('error_message', models.TextField(blank=True)),
                ('started_at', models.DateTimeField(blank=True, null=True)),
                ('finished_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('contractor', models.ForeignKey(limit_choices_to={'role': 'contractor'}, on_delete=django.db.models.deletion.CASCADE, related_name='audit_jobs', to=settings.AUTH_USER_MODEL)),
                ('employer', models.ForeignKey(blank=True, limit_choices_to={'role': 'employer'}, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='audit_jobs_as_employer', to=settings.AUTH_USER_MODEL)),
                ('requested_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='audit_jobs_requested', to=settings.AUTH_USER_MODEL)),
                ('site', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='audit_jobs', to='bss_core.site')),
            ],
            options={
                'db_table': 'audit_job',
                'ordering': ['-created_at'],
                'indexes': [
                    models.Index(fields=['contractor', 'site'], name='idx_audit_job_pair'),
                    models.Index(fields=['status'], name='idx_audit_job_status'),
                    models.Index(fields=['month', 'year'], name='idx_audit_job_period'),
                ],
                'constraints': [models.UniqueConstraint(fields=('contractor', 'site', 'month', 'year', 'version'), name='uq_audit_job_version')],
            },
        ),
    ]
