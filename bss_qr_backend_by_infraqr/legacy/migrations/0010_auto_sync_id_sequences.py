"""Sync Postgres identity sequences for tables bulk-migrated from SQL Server.

The imported tables were created with Django-style sequences, but the data was
loaded with explicit Ids, so the sequences trail max(Id). Without this, ORM
creates would reuse existing Ids (there are no PK constraints on those tables).
"""
from django.db import migrations

SEQUENCE_SQL = [
    "bss_legacy_dbo_newsletter_Id_seq",
    "bss_legacy_dbo_newsletter_client_mapping_Id_seq",
    "bss_legacy_dbo_conversation_Id_seq",
    "bss_legacy_dbo_conversationdocument_Id_seq",
    "bss_legacy_dbo_mapping_Id_seq",
]


def sync_sequences(apps, schema_editor):
    vendor = schema_editor.connection.vendor
    if vendor != "postgresql":
        return
    table_names = schema_editor.connection.introspection.table_names()
    with schema_editor.connection.cursor() as cursor:
        for seq in SEQUENCE_SQL:
            table = seq.replace("_Id_seq", "")
            if table in table_names:
                sql = 'SELECT setval(\'"%s"\', (SELECT COALESCE(max("Id"), 1) FROM "%s"))' % (seq, table)
                cursor.execute(sql)


class Migration(migrations.Migration):

    dependencies = [
        ('legacy', '0009_conversation_conversationdocument_emailmaster_and_more'),
    ]

    operations = [
        migrations.RunPython(sync_sequences, migrations.RunPython.noop),
    ]
