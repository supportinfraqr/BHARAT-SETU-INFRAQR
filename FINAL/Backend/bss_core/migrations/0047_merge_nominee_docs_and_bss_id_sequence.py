from django.db import migrations


class Migration(migrations.Migration):
    """Merge the two leaf migrations created concurrently:
    - 0045_workerfamilydependant_nominee_documents (this branch)
    - 0046_bss_id_sequence_and_site_id (other branch)
    """

    dependencies = [
        ("bss_core", "0045_workerfamilydependant_nominee_documents"),
        ("bss_core", "0046_bss_id_sequence_and_site_id"),
    ]

    operations = []
