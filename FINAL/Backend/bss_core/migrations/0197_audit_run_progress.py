from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('bss_core', '0196_audit_jobs'),
    ]

    operations = [
        migrations.AddField(
            model_name='auditjob',
            name='progress',
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AddField(
            model_name='auditjob',
            name='artifacts',
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name='auditjob',
            name='last_heartbeat',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='auditjob',
            name='attempts',
            field=models.PositiveSmallIntegerField(default=0),
        ),
        migrations.AddField(
            model_name='auditjob',
            name='max_attempts',
            field=models.PositiveSmallIntegerField(default=3),
        ),
        migrations.AddField(
            model_name='auditjob',
            name='cancel_requested',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='auditjob',
            name='trigger_type',
            field=models.CharField(default='manual', max_length=20),
        ),
        migrations.AddField(
            model_name='auditjob',
            name='notified_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.CreateModel(
            name='AuditJobEvent',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('type', models.CharField(max_length=30)),
                ('payload', models.JSONField(blank=True, default=dict)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('job', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='events', to='bss_core.auditjob')),
            ],
            options={
                'db_table': 'audit_job_event',
                'ordering': ['id'],
                'indexes': [models.Index(fields=['job', 'id'], name='idx_audit_event_job')],
            },
        ),
    ]
