"""System-level bookkeeping models."""

from django.db import models


class BssIdSequence(models.Model):
    """Single-row monotonic counter that seeds globally-unique BSS IDs.

    Allocating BSS IDs from a sequential counter makes duplicates mathematically
    impossible; the counter value is then run through a reversible affine mask
    (see ``api.bss_ids``) so the printed IDs look completely random. This avoids
    the retry-on-collision loop of purely random generation.
    """

    id = models.PositiveSmallIntegerField(primary_key=True)  # always 1
    value = models.BigIntegerField(default=0)

    class Meta:
        db_table = "bss_id_sequence"

    def __str__(self):
        return f"BSS id sequence = {self.value}"
