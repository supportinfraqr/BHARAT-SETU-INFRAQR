"""DigiLocker OAuth2 + issued-document integration.

Backend-only port of the EesassinErp DigiLocker flow (PKCE S256, OAuth2
authorization_code grant) into the BSS Django backend. Exposes clean REST
endpoints (see api/views.py) and stores the verified identity + fetched
digitally-issued documents so they flow into the existing document /
verification / token pipeline.
"""

from django.db import models
from django.utils import timezone

from .auth import User


class DigiLockerProfile(models.Model):
    """Verified identity fetched from DigiLocker /oauth2/1/user (one per user)."""

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="digilocker")
    digilocker_id = models.CharField(max_length=120, unique=True)
    name = models.CharField(max_length=200, blank=True)
    dob = models.CharField(max_length=40, blank=True)
    gender = models.CharField(max_length=20, blank=True)
    mobile = models.CharField(max_length=40, blank=True)
    email = models.EmailField(max_length=160, blank=True)
    eaadhaar = models.CharField(max_length=60, blank=True)
    reference_key = models.CharField(max_length=200, blank=True)
    picture_path = models.CharField(max_length=255, blank=True)
    is_verified = models.BooleanField(default=False)
    linked_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "digilocker_profile"

    def __str__(self):
        return f"{self.digilocker_id} ({self.name})"


class DigiLockerDocument(models.Model):
    """A digitally-issued document fetched from /oauth2/2/files/issued."""

    STATUS = [("DOWNLOADED", "Downloaded"), ("FAILED", "Failed")]

    profile = models.ForeignKey(DigiLockerProfile, on_delete=models.CASCADE,
                                related_name="documents")
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True,
                             related_name="digilocker_documents")
    uri = models.CharField(max_length=500, db_index=True)
    doctype = models.CharField(max_length=120, blank=True)
    issuer = models.CharField(max_length=300, blank=True)
    doc_date = models.CharField(max_length=120, blank=True)
    file_path = models.CharField(max_length=500, blank=True)
    file_name = models.CharField(max_length=255, blank=True)
    pan_number = models.CharField(max_length=20, blank=True)
    status = models.CharField(max_length=20, choices=STATUS, default="DOWNLOADED")
    downloaded_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "digilocker_document"
        unique_together = ("profile", "uri")
        indexes = [models.Index(fields=["user"], name="idx_dl_doc_user")]

    def __str__(self):
        return f"{self.doctype} {self.file_name}"


class DigiLockerSession(models.Model):
    """PKCE OAuth2 state/session. code_verifier is stored server-side so the
    callback can be stateless (no cookie/session dependency)."""

    STATUS = [("INITIATED", "Initiated"), ("CODE_RECEIVED", "Code Received"),
              ("TOKEN_OBTAINED", "Token Obtained"), ("COMPLETED", "Completed"),
              ("ERROR", "Error"), ("EXPIRED", "Expired")]

    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                             related_name="digilocker_sessions")
    state = models.CharField(max_length=128, unique=True, db_index=True)
    code_verifier = models.CharField(max_length=200)
    status = models.CharField(max_length=20, choices=STATUS, default="INITIATED")
    code = models.CharField(max_length=512, blank=True)
    access_token_hash = models.CharField(max_length=128, blank=True)
    error = models.CharField(max_length=1000, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "digilocker_session"
        indexes = [models.Index(fields=["status"], name="idx_dl_session_status")]

    @property
    def is_expired(self):
        return (self.expires_at is not None and timezone.now() > self.expires_at)

    def __str__(self):
        return f"{self.state} ({self.status})"
