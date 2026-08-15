from django.contrib.auth.models import AbstractUser
from django.db import models

ROLE_CHOICES = [
    ("SUPER_ADMIN", "Super Admin"),
    ("BSS_STAFF", "BSS Staff"),
    ("EMPLOYER", "Employer"),
    ("PRIMARY_CONTRACTOR", "Primary Contractor"),
    ("SECONDARY_CONTRACTOR", "Secondary Contractor"),
    ("WORKER", "Worker"),
]


class User(AbstractUser):
    role = models.CharField(max_length=32, choices=ROLE_CHOICES, default="BSS_STAFF")
    # Link to the legacy SQL Server LoginTable.LoginId (optional for reference)
    legacy_login_id = models.IntegerField(null=True, blank=True)
    mobile = models.CharField(max_length=20, blank=True)
    # scope link (which employer/contractor tree this user belongs to)
    employer_id = models.BigIntegerField(null=True, blank=True)
    contractor_id = models.BigIntegerField(null=True, blank=True)

    def __str__(self):
        return f"{self.username} ({self.role})"
