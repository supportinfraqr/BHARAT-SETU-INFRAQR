"""Registered devices (per user) — recorded so a worker's device registrations
are kept on record and shown in Settings.

A device is identified by a client-generated ``device_id`` persisted in the
browser; the row is upserted on each registration so ``last_seen`` stays current.
"""

from django.conf import settings
from django.db import models


class UserDevice(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                             related_name="registered_devices")
    device_id = models.CharField(max_length=120)
    label = models.CharField(max_length=120, blank=True)
    platform = models.CharField(max_length=60, blank=True)
    user_agent = models.CharField(max_length=300, blank=True)
    ip_address = models.CharField(max_length=60, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_seen = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "user_device"
        constraints = [models.UniqueConstraint(fields=["user", "device_id"], name="uq_user_device")]
        ordering = ["-last_seen"]

    def __str__(self):
        return f"{self.user_id}:{self.device_id}"
