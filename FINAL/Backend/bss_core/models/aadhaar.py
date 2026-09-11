"""Aadhaar oKYC (Sandbox.co.in) challenge + verified identity, ported from
the EesassinErp flow into the BSS Django backend (backend-only client)."""

from django.db import models
from django.utils import timezone

from .auth import User


class AadhaarChallenge(models.Model):
    """A generate/verify OTP round-trip with Sandbox.co.in oKYC for a single
    Aadhaar number. Attached to a worker user once verification succeeds."""

    STATUS = [
        ("INITIATED", "Initiated"),
        ("OTP_SENT", "OTP Sent"),
        ("VERIFIED", "Verified"),
        ("EXPIRED", "Expired"),
        ("FAILED", "Failed"),
    ]

    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                             related_name="aadhaar_challenges")
    aadhaar_number = models.CharField(max_length=20, db_index=True)
    reference_id = models.CharField(max_length=200, blank=True)
    status = models.CharField(max_length=20, choices=STATUS, default="INITIATED")
    otp_attempts = models.SmallIntegerField(default=0)
    max_attempts = models.SmallIntegerField(default=5)
    consent = models.BooleanField(default=True)
    name = models.CharField(max_length=200, blank=True)
    gender = models.CharField(max_length=20, blank=True)
    date_of_birth = models.CharField(max_length=40, blank=True)
    care_of = models.CharField(max_length=255, blank=True)
    full_address = models.TextField(blank=True)
    state = models.CharField(max_length=60, blank=True)
    district = models.CharField(max_length=60, blank=True)
    pincode = models.CharField(max_length=10, blank=True)
    photo_path = models.CharField(max_length=500, blank=True)
    response_json = models.TextField(blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "aadhaar_challenge"
        indexes = [models.Index(fields=["aadhaar_number", "status"],
                                name="idx_aadhaar_num_status")]

    @property
    def is_expired(self):
        return (self.expires_at is not None
                and timezone.now() > self.expires_at)

    def __str__(self):
        return f"{self.aadhaar_number} {self.status}"