"""DigiLocker **EntityLocker** OAuth2 sessions + verified entities.

A business (employer/contractor) verifies its organisation through the Meri
Pehchaan Entity Locker. The PKCE authorization-code flow is initiated by
``api/v1_bridge/entitylocker.py``; the pending request (``state`` +
``code_verifier``) is stored here so the public callback can complete without a
client session, and the verified entity details are kept on the same row.
"""

from django.db import models
from django.utils import timezone

from .auth import User


class EntityLockerAuth(models.Model):
    STATUS = [("INITIATED", "Initiated"), ("VERIFIED", "Verified"),
              ("FAILED", "Failed"), ("EXPIRED", "Expired")]

    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                             related_name="entitylocker_auths")
    state = models.CharField(max_length=128, unique=True, db_index=True)
    code_verifier = models.CharField(max_length=200)
    role = models.CharField(max_length=20, blank=True, default="contractor")  # contractor / employer
    id_type = models.CharField(max_length=20, blank=True)    # GSTIN / MCA21 / PAN
    id_value = models.CharField(max_length=60, blank=True)
    status = models.CharField(max_length=20, choices=STATUS, default="INITIATED")
    # Verified entity details (from GET /public/oauth2/1/entity).
    entity_name = models.CharField(max_length=200, blank=True)
    entity_locker_id = models.CharField(max_length=120, blank=True)
    verified_by = models.CharField(max_length=40, blank=True)  # PAN / UD / CIN
    doi = models.CharField(max_length=40, blank=True)
    email = models.CharField(max_length=160, blank=True)
    mobile = models.CharField(max_length=40, blank=True)
    error = models.CharField(max_length=1000, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "entitylocker_auth"
        indexes = [models.Index(fields=["status"], name="idx_el_auth_status")]

    @property
    def is_expired(self):
        return self.expires_at is not None and timezone.now() > self.expires_at

    def __str__(self):
        return f"{self.state} ({self.status})"
