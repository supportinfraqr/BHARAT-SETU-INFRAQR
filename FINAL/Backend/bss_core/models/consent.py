"""Consent / OTP / IVR flow for worker->contractor binding and OTP challenge."""

from django.db import models
from django.utils import timezone

from .auth import User


class ConsentChallenge(models.Model):
    """3-stage consent escalation for non-smartphone workers:
    APP (skipped if no smartphone) -> IVR (60s) -> OTP (5-min validity).
    Worker receives the code via SMS and dictates it to the contractor."""

    STAGE = [("APP", "App"), ("IVR", "IVR"), ("OTP", "OTP")]
    STATE = [("PENDING", "Pending"), ("SENT", "Sent"), ("VERIFIED", "Verified"),
             ("EXPIRED", "Expired"), ("FAILED", "Failed"), ("RESOLVED", "Resolved")]

    binding = models.ForeignKey("WorkerContractorBinding", on_delete=models.CASCADE,
                                null=True, blank=True, related_name="consent_challenges")
    worker = models.ForeignKey(User, on_delete=models.CASCADE, related_name="consent_challenges")
    contractor = models.ForeignKey(User, on_delete=models.CASCADE, related_name="+")
    stage = models.CharField(max_length=20, choices=STAGE)
    challenge_value = models.CharField(max_length=255, blank=True)
    secret_hash = models.CharField(max_length=128, blank=True)
    secret_valid_until = models.DateTimeField(null=True, blank=True)
    attempts = models.SmallIntegerField(default=0)
    state = models.CharField(max_length=20, choices=STATE, default="PENDING")
    ivr_ivr_tokens = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "consent_challenge"
        indexes = [models.Index(fields=["worker"], name="idx_consent_worker")]

    @property
    def is_expired(self):
        return (self.secret_valid_until is not None
                and timezone.now() > self.secret_valid_until)

    def __str__(self):
        return f"{self.stage} {self.state}"


class SmsOtp(models.Model):
    """SMS-delivered one-time passwords (general purpose)."""

    PURPOSE = [("BINDING", "Binding Consent"), ("LOGIN", "Login"),
               ("VERIFY", "Verify"), ("IVR", "IVR")]

    mobile = models.CharField(max_length=20)
    purpose = models.CharField(max_length=20, choices=PURPOSE, default="LOGIN")
    otp_hash = models.CharField(max_length=128)
    expires_at = models.DateTimeField()
    attempts = models.SmallIntegerField(default=0)
    max_attempts = models.SmallIntegerField(default=5)
    verified = models.BooleanField(default=False)
    delivery_channel = models.CharField(max_length=20, default="none")
    delivery_status = models.CharField(max_length=20, default="pending")
    delivery_error = models.TextField(blank=True, default="")
    delivered_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "sms_otp"
        indexes = [models.Index(fields=["mobile", "purpose"], name="idx_sms_otp_mobile")]

    @property
    def is_expired(self):
        return timezone.now() > self.expires_at

    def __str__(self):
        return f"{self.mobile} {self.purpose}"
