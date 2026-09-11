"""Access, role-permission and reference-master models: rbac_permissions,
qr_role_access, lookup_value, worker_category_master."""

from django.db import models

from .auth import User


class RbacPermission(models.Model):
    """Single generic field-level permission table (role x resource x field).
    Data tables carry NO permission columns; this table drives visibility."""

    ACCESS = [("view", "View"), ("no", "No"), ("full", "Full"),
              ("masked", "Masked"), ("restricted", "Restricted"),
              ("view_masked", "View Masked"), ("optional", "Optional"),
              ("edit", "Edit"), ("conditional", "Conditional")]
    REVEAL = [("full", "Full"), ("verified_only", "Verified Only"),
              ("band_only", "Band Only"), ("public", "Public")]
    SCOPE = [("unbound", "Unbound"), ("bound", "Bound")]

    role = models.CharField(max_length=40, db_index=True)
    resource = models.CharField(max_length=60)
    field = models.CharField(max_length=60)
    access = models.CharField(max_length=20, choices=ACCESS)
    reveal_type = models.CharField(max_length=20, choices=REVEAL, null=True, blank=True)
    binding_scope = models.CharField(max_length=20, choices=SCOPE, null=True, blank=True)
    scope = models.CharField(max_length=40, null=True, blank=True)

    class Meta:
        db_table = "rbac_permissions"
        unique_together = ("role", "resource", "field", "binding_scope")

    def __str__(self):
        return f"{self.role}.{self.resource}.{self.field} = {self.access}"


class QrRoleAccess(models.Model):
    """QR-scanner scope per role (guest, worker, contractor, employer, government,
    bss_staff, bss_admin)."""

    SCOPE = [("unbound", "Unbound"), ("bound", "Bound")]

    role = models.CharField(max_length=40)
    binding_scope = models.CharField(max_length=20, choices=SCOPE, null=True, blank=True)
    grant_mechanism = models.CharField(max_length=120, blank=True)
    default_access = models.CharField(max_length=60, blank=True)
    sensitive_allowed = models.BooleanField(default=False)
    optional_identifiers = models.BooleanField(default=False)
    recommended_scope = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "qr_role_access"
        unique_together = ("role", "binding_scope")

    def __str__(self):
        return f"{self.role}:{self.binding_scope}"


class LookupValue(models.Model):
    """Single generic dropdown lookup (34 categories, 382 values)."""

    category = models.CharField(max_length=60, db_index=True)
    value = models.CharField(max_length=120)
    sort_order = models.SmallIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "lookup_value"
        unique_together = ("category", "value")

    def __str__(self):
        return f"{self.category}: {self.value}"


class WorkerCategoryMaster(models.Model):
    code = models.CharField(max_length=5, unique=True)
    name = models.CharField(max_length=120)
    definition = models.CharField(max_length=500, blank=True)
    typical_workplaces = models.CharField(max_length=300, blank=True)
    primary_relationship = models.CharField(max_length=120, blank=True)
    data_focus = models.CharField(max_length=300, blank=True)
    sort_order = models.SmallIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "worker_category_master"

    def __str__(self):
        return f"{self.code} {self.name}"
