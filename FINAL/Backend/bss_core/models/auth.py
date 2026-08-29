"""Core identity & profile models mirroring FINAL/Db schema (app_role, users,
user_credentials, contractor/employer/government/bss_staff/it profiles)."""

from django.contrib.auth.base_user import BaseUserManager
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models


class AppRole(models.Model):
    """Reference of platform roles (app_role)."""
    code = models.CharField(max_length=40, unique=True)
    label = models.CharField(max_length=60)
    is_login_role = models.BooleanField(default=True)
    sort_order = models.SmallIntegerField(default=0)

    class Meta:
        db_table = "app_role"

    def __str__(self):
        return self.code


class UserManager(BaseUserManager):
    def create_user(self, username, password=None, role="public", **extra):
        user = self.model(username=username, role=role, **extra)
        if password:
            user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, username, password=None, **extra):
        return self.create_user(username, password=password, role="bss_super_admin",
                                account_active=True, is_verified=True, is_staff=True,
                                is_superuser=True, **extra)

    def get_by_natural_key(self, username):
        return self.get(username=username)


class User(AbstractBaseUser, PermissionsMixin):
    """The unified login record (users table). A single auth row per person;
    the role field scopes what the user can see/do (RBAC)."""

    ROLE_CHOICES = [
        ("public", "Public"),
        ("worker", "Worker"),
        ("contractor", "Contractor"),
        ("employer", "Employer"),
        ("government_inspector", "Government Inspector"),
        ("government_admin", "Government Admin"),
        ("bss_staff", "BSS Staff"),
        ("it_task_force", "IT Task Force"),
        ("bss_super_admin", "BSS Super Admin"),
    ]

    username = models.CharField("Login", max_length=150, unique=True)
    role = models.CharField(max_length=40, choices=ROLE_CHOICES, default="public", db_index=True)
    account_active = models.BooleanField(default=True)
    is_verified = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    objects = UserManager()

    USERNAME_FIELD = "username"
    REQUIRED_FIELDS = ["role"]

    class Meta:
        db_table = "users"

    def __str__(self):
        return f"{self.username} ({self.role})"


class UserCredential(models.Model):
    """Additional sign-in / identity credentials (mobile, email, aadhaar, login_id)."""
    IDENTITY_TYPES = [("mobile", "Mobile"), ("email", "Email"),
                      ("aadhaar", "Aadhaar"), ("login_id", "Login Id")]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="credentials")
    identity_type = models.CharField(max_length=20, choices=IDENTITY_TYPES)
    identity_value = models.CharField(max_length=255)
    is_primary = models.BooleanField(default=False)
    verified = models.BooleanField(default=False)
    password_hash = models.CharField(max_length=255, blank=True, null=True)
    mpin_hash = models.CharField(max_length=255, blank=True, null=True)

    class Meta:
        db_table = "user_credentials"
        unique_together = ("identity_type", "identity_value")

    def __str__(self):
        return f"{self.identity_type}: {self.identity_value}"


class ContractorProfile(models.Model):
    APPROVAL = [("PENDING", "Pending"), ("APPROVED", "Approved"), ("REJECTED", "Rejected")]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="contractor_profile")
    contractor_name = models.CharField(max_length=120, blank=True)
    contractor_code = models.CharField(max_length=40, blank=True)
    contact_person = models.CharField(max_length=120, blank=True)
    mobile = models.CharField(max_length=20, blank=True)
    email = models.EmailField(max_length=120, blank=True)
    state = models.CharField(max_length=60, blank=True)
    district = models.CharField(max_length=60, blank=True)
    address = models.CharField(max_length=255, blank=True)
    gstin = models.CharField(max_length=40, blank=True)
    pan_no = models.CharField(max_length=20, blank=True)
    lin = models.CharField(max_length=40, blank=True)
    approval_status = models.CharField(max_length=20, choices=APPROVAL, default="PENDING")
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "contractor_profiles"

    def __str__(self):
        return self.contractor_name or str(self.user_id)


class EmployerProfile(models.Model):
    APPROVAL = [("PENDING", "Pending"), ("APPROVED", "Approved"), ("REJECTED", "Rejected")]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="employer_profile")
    employer_name = models.CharField(max_length=120, blank=True)
    employer_code = models.CharField(max_length=40, blank=True)
    contact_person = models.CharField(max_length=120, blank=True)
    mobile = models.CharField(max_length=20, blank=True)
    email = models.EmailField(max_length=120, blank=True)
    state = models.CharField(max_length=60, blank=True)
    district = models.CharField(max_length=60, blank=True)
    address = models.CharField(max_length=255, blank=True)
    industry = models.CharField(max_length=80, blank=True)
    gstin = models.CharField(max_length=40, blank=True)
    pan_no = models.CharField(max_length=20, blank=True)
    lin = models.CharField(max_length=40, blank=True)
    approval_status = models.CharField(max_length=20, choices=APPROVAL, default="PENDING")
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "employer_profiles"

    def __str__(self):
        return self.employer_name or str(self.user_id)


class GovernmentProfile(models.Model):
    GOV_TYPE = [("inspector", "Inspector"), ("admin", "Admin")]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="government_profile")
    gov_type = models.CharField(max_length=20, choices=GOV_TYPE)
    officer_name = models.CharField(max_length=120, blank=True)
    department = models.CharField(max_length=80, blank=True)
    designation = models.CharField(max_length=80, blank=True)
    jurisdiction = models.CharField(max_length=120, blank=True)

    class Meta:
        db_table = "government_profile"

    def __str__(self):
        return self.officer_name or str(self.user_id)


class BssStaffProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="bss_staff_profile")
    employee_code = models.CharField(max_length=40, blank=True)
    full_name = models.CharField(max_length=120, blank=True)
    department = models.CharField(max_length=80, blank=True)
    designation = models.CharField(max_length=80, blank=True)
    mobile = models.CharField(max_length=20, blank=True)
    email = models.EmailField(max_length=120, blank=True)

    class Meta:
        db_table = "bss_staff_profile"

    def __str__(self):
        return self.full_name or str(self.user_id)


class ItTaskForceProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="it_profile")
    employee_code = models.CharField(max_length=40, blank=True)
    full_name = models.CharField(max_length=120, blank=True)
    department = models.CharField(max_length=80, blank=True)
    designation = models.CharField(max_length=80, blank=True)
    mobile = models.CharField(max_length=20, blank=True)
    email = models.EmailField(max_length=120, blank=True)

    class Meta:
        db_table = "it_profile"

    def __str__(self):
        return self.full_name or str(self.user_id)
