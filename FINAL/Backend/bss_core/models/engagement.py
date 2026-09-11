"""Cross-cutting engagement & governance models: user preferences, notifications,
append-only audit log, and a generic approval queue used across modules."""

from django.db import models

from .auth import User


class UserPreference(models.Model):
    """Per-user preferences: language, notifications, comms, accessibility, privacy."""

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="preferences")
    interface_language = models.CharField(max_length=10, default="en")
    notification_prefs = models.JSONField(default=dict, blank=True)
    communication_prefs = models.JSONField(default=dict, blank=True)
    accessibility_prefs = models.JSONField(default=dict, blank=True)
    privacy_prefs = models.JSONField(default=dict, blank=True)
    qr_share_enabled = models.BooleanField(default=True)
    binding_enabled = models.BooleanField(default=True)
    mpin_configured = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "user_preference"

    def __str__(self):
        return f"{self.user_id} ({self.interface_language})"


class Notification(models.Model):
    """App/in-app notification centre entry for any user."""

    TYPE = [("INFO", "Info"), ("APPROVAL", "Approval"), ("WARNING", "Warning"),
            ("GRIEVANCE", "Grievance"), ("COMPLIANCE", "Compliance"), ("PAYROLL", "Payroll")]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="notifications")
    type = models.CharField(max_length=20, choices=TYPE, default="INFO")
    title = models.CharField(max_length=120)
    body = models.CharField(max_length=500, blank=True)
    link = models.CharField(max_length=255, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "notification"
        indexes = [
            models.Index(fields=["user", "is_read"], name="idx_notif_user_read"),
            models.Index(fields=["created_at"], name="idx_notif_created"),
        ]

    def __str__(self):
        return f"{self.user_id} {self.title}"


class AuditLog(models.Model):
    """Append-only audit trail for RBAC, disputes & DPDP accountability."""

    ACTION = [("CREATE", "Create"), ("UPDATE", "Update"), ("DELETE", "Delete"),
              ("APPROVE", "Approve"), ("REJECT", "Reject"), ("READ", "Read"),
              ("LOGIN", "Login"), ("LOGOUT", "Logout"), ("DOWNLOAD", "Download")]

    actor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                              related_name="audit_logs")
    actor_role = models.CharField(max_length=40, blank=True)
    action = models.CharField(max_length=20, choices=ACTION)
    entity_type = models.CharField(max_length=80)
    entity_id = models.CharField(max_length=40, blank=True)
    before = models.JSONField(default=dict, blank=True)
    after = models.JSONField(default=dict, blank=True)
    ip_address = models.CharField(max_length=45, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "audit_log"
        indexes = [
            models.Index(fields=["actor"], name="idx_audit_actor"),
            models.Index(fields=["entity_type", "entity_id"], name="idx_audit_entity"),
            models.Index(fields=["created_at"], name="idx_audit_created"),
        ]

    def __str__(self):
        return f"{self.actor_id} {self.action} {self.entity_type}"


class ApprovalQueue(models.Model):
    """Generic approval workflow record (bindings, gate passes, jobs, documents)."""

    STATUS = [("PENDING", "Pending"), ("APPROVED", "Approved"), ("REJECTED", "Rejected"),
              ("CANCELLED", "Cancelled")]

    entity_type = models.CharField(max_length=60)
    entity_id = models.CharField(max_length=40)
    requested_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                                     related_name="approvals_requested")
    approver = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                                 related_name="approvals_handled")
    status = models.CharField(max_length=20, choices=STATUS, default="PENDING")
    remarks = models.CharField(max_length=500, blank=True)
    requested_at = models.DateTimeField(auto_now_add=True)
    decided_at = models.DateTimeField(null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = "approval_queue"
        indexes = [
            models.Index(fields=["entity_type", "entity_id"], name="idx_approval_entity"),
            models.Index(fields=["status"], name="idx_approval_status"),
        ]

    def __str__(self):
        return f"{self.entity_type}#{self.entity_id} {self.status}"
