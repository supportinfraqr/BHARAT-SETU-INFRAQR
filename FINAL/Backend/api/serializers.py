"""DRF serializers for the BSS API.

Grouped by domain so the frontend can consume clear, field-complete JSON for
each resource. Custom business endpoints (consent, attendance punch,
wage payment, token issue) live in api/views.py.
"""

from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import make_password
from rest_framework import serializers

from bss_core.models import (
    Site, WorkerContractorBinding, ContractorJob, RozgarRequest,
    ConsentChallenge, SmsOtp,
    WorkerIdentity, WorkerAddressMobility, WorkerFamilyDependant,
    WorkerSocialSecurity, WorkerWelfareSafety, WorkerBanking,
    WorkerClassification, WorkerEmployment, SkillMaster,
    WorkerSkillsEmployability, WorkerOther, WorkerDocumentMaster, WorkerDocument,
    RbacPermission, QrRoleAccess, LookupValue, WorkerCategoryMaster,
    AttendanceDevice, Attendance, WorkerWages, WagePayment,
    WorkerGatePass, WorkerGrievance, DocumentAccessToken,
    DigiLockerProfile, DigiLockerDocument, DigiLockerSession,
)

User = get_user_model()


# ---------------------------------------------------------------------------
# Auth / Identity
# ---------------------------------------------------------------------------
class RoleField(serializers.ChoiceField):
    def to_representation(self, value):
        for k, v in self.choices.items():
            if k == value:
                return v
        return value


class UserSerializer(serializers.ModelSerializer):
    role_label = serializers.SerializerMethodField()
    credential_types = serializers.SerializerMethodField()
    profile = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ("id", "username", "role", "role_label", "account_active",
                  "is_verified", "last_login", "credential_types", "profile")
        read_only_fields = ("id", "last_login")

    def get_role_label(self, obj):
        return dict(User.ROLE_CHOICES).get(obj.role, obj.role)

    def get_credential_types(self, obj):
        return [{"type": c.identity_type, "value": c.identity_value, "primary": c.is_primary}
                for c in obj.credentials.all()]

    def get_profile(self, obj):
        if obj.role == "contractor" and hasattr(obj, "contractor_profile"):
            p = obj.contractor_profile
            return {"contractor_name": p.contractor_name, "contractor_code": p.contractor_code,
                    "approval_status": p.approval_status, "mobile": p.mobile}
        if obj.role == "employer" and hasattr(obj, "employer_profile"):
            p = obj.employer_profile
            return {"employer_name": p.employer_name, "employer_code": p.employer_code,
                    "approval_status": p.approval_status, "mobile": p.mobile}
        return None


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, style={"input_type": "password"})
    mobile = serializers.CharField(required=False, allow_blank=True)
    email = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ("id", "username", "password", "role", "mobile", "email")

    def validate_role(self, value):
        allowed = [r for r, _ in User.ROLE_CHOICES] 
        if value not in allowed:
            raise serializers.ValidationError("Invalid role")
        return value

    def create(self, validated_data):
        mobile = validated_data.pop("mobile", "")
        email = validated_data.pop("email", "")
        password = validated_data.pop("password")
        user = User.objects.create_user(**validated_data)
        user.set_password(password)
        user.save()
        from bss_core.models import UserCredential
        if mobile:
            UserCredential.objects.create(user=user, identity_type="mobile",
                                          identity_value=mobile, is_primary=True)
        if email:
            UserCredential.objects.create(user=user, identity_type="email",
                                          identity_value=email)
        return user


# ---------------------------------------------------------------------------
# Relationship / Hierarchy
# ---------------------------------------------------------------------------
class SiteSerializer(serializers.ModelSerializer):
    employer_name = serializers.SerializerMethodField()

    class Meta:
        model = Site
        fields = ("id", "site_name", "site_code", "employer", "employer_name",
                  "latitude", "longitude", "site_qr_token", "location", "city",
                  "district", "state", "pincode", "created_at", "updated_at")
        read_only_fields = ("site_qr_token", "created_at", "updated_at")

    def get_employer_name(self, obj):
        if hasattr(obj.employer, "employer_profile"):
            return obj.employer.employer_profile.employer_name
        return obj.employer.username


class WorkerContractorBindingSerializer(serializers.ModelSerializer):
    worker_name = serializers.SerializerMethodField()
    contractor_name = serializers.SerializerMethodField()
    site_name = serializers.CharField(source="site.site_name", read_only=True)
    employer = serializers.SerializerMethodField()

    class Meta:
        model = WorkerContractorBinding
        fields = ("id", "worker", "contractor", "site", "worker_name", "contractor_name",
                  "site_name", "employer", "binding_status", "consent_worker",
                  "consent_contractor", "consent_method", "accepted_at",
                  "created_at", "updated_at")

    def get_worker_name(self, obj):
        return obj.worker.worker_identity.name if hasattr(obj.worker, "worker_identity") else obj.worker.username

    def get_contractor_name(self, obj):
        if hasattr(obj.contractor, "contractor_profile"):
            return obj.contractor.contractor_profile.contractor_name
        return obj.contractor.username

    def get_employer(self, obj):
        if obj.site_id:
            return obj.site.employer_id
        return None


class ContractorJobSerializer(serializers.ModelSerializer):
    contractor_name = serializers.SerializerMethodField()

    class Meta:
        model = ContractorJob
        fields = ("id", "contractor", "contractor_name", "site", "job_title",
                  "job_description", "wage_offered", "start_date", "validity_until",
                  "is_active", "created_at", "updated_at")

    def get_contractor_name(self, obj):
        if hasattr(obj.contractor, "contractor_profile"):
            return obj.contractor.contractor_profile.contractor_name
        return obj.contractor.username


class RozgarRequestSerializer(serializers.ModelSerializer):
    job_title = serializers.CharField(source="job.job_title", read_only=True)

    class Meta:
        model = RozgarRequest
        fields = ("id", "job", "job_title", "contractor", "worker", "status",
                  "requested_at", "responded_at", "expires_at", "notes", "created_at")


# ---------------------------------------------------------------------------
# Worker onboarding domain
# ---------------------------------------------------------------------------
class WorkerIdentitySerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkerIdentity
        fields = "__all__"


class WorkerAddressMobilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkerAddressMobility
        fields = "__all__"


class WorkerFamilyDependantSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkerFamilyDependant
        fields = "__all__"


class WorkerSocialSecuritySerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkerSocialSecurity
        fields = "__all__"


class WorkerWelfareSafetySerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkerWelfareSafety
        fields = "__all__"


class WorkerBankingSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkerBanking
        fields = "__all__"


class WorkerClassificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkerClassification
        fields = "__all__"


class WorkerEmploymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkerEmployment
        fields = "__all__"


class SkillMasterSerializer(serializers.ModelSerializer):
    class Meta:
        model = SkillMaster
        fields = "__all__"


class WorkerSkillsEmployabilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkerSkillsEmployability
        fields = "__all__"


class WorkerOtherSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkerOther
        fields = "__all__"


class WorkerDocumentMasterSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkerDocumentMaster
        fields = "__all__"


class WorkerDocumentSerializer(serializers.ModelSerializer):
    document_name = serializers.CharField(source="document.document_name", read_only=True)
    document_code = serializers.CharField(source="document.code", read_only=True)

    class Meta:
        model = WorkerDocument
        fields = ("id", "user", "document", "document_code", "document_name",
                  "file_name", "file_path", "file_size", "mime_type", "status",
                  "uploaded_at", "created_at", "updated_at")


# ---------------------------------------------------------------------------
# Access / masters
# ---------------------------------------------------------------------------
class RbacPermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = RbacPermission
        fields = "__all__"


class QrRoleAccessSerializer(serializers.ModelSerializer):
    class Meta:
        model = QrRoleAccess
        fields = "__all__"


class LookupValueSerializer(serializers.ModelSerializer):
    class Meta:
        model = LookupValue
        fields = ("id", "category", "value", "sort_order")


class WorkerCategoryMasterSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkerCategoryMaster
        fields = "__all__"


# ---------------------------------------------------------------------------
# Operations
# ---------------------------------------------------------------------------
class AttendanceDeviceSerializer(serializers.ModelSerializer):
    class Meta:
        model = AttendanceDevice
        fields = "__all__"


class AttendanceSerializer(serializers.ModelSerializer):
    worker_name = serializers.SerializerMethodField()
    site_name = serializers.CharField(source="site.site_name", read_only=True, default=None)

    class Meta:
        model = Attendance
        fields = ("id", "worker", "worker_name", "site", "site_name", "contractor",
                  "device", "attendance_date", "check_in_time", "check_out_time",
                  "status", "capture_method", "verification_type", "image_file",
                  "confidence_pct", "gps_lat", "gps_long", "is_geofence_ok",
                  "is_verified", "verified_by", "verified_at", "remarks", "created_at")

    def get_worker_name(self, obj):
        if hasattr(obj.worker, "worker_identity"):
            return obj.worker.worker_identity.name
        return obj.worker.username


class WorkerWagesSerializer(serializers.ModelSerializer):
    worker_name = serializers.SerializerMethodField()

    class Meta:
        model = WorkerWages
        fields = ("id", "worker", "worker_name", "site", "contractor",
                  "period_start", "period_end", "wage_frequency", "days_present",
                  "days_absent", "daily_wage", "units_done", "piece_rate", "base_wage",
                  "overtime_hours", "overtime_amount", "gross_wage", "deductions_amount",
                  "net_wage", "status", "computed_from_attendance", "approved_by",
                  "approved_at", "created_at", "updated_at")

    def get_worker_name(self, obj):
        if hasattr(obj.worker, "worker_identity"):
            return obj.worker.worker_identity.name
        return obj.worker.username


class WagePaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = WagePayment
        fields = ("id", "worker_wages", "pay_mode", "amount", "paid_at",
                  "transaction_ref", "bank_account_last4", "upi_id", "paid_by",
                  "remarks", "created_at")


class WorkerGatePassSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkerGatePass
        fields = "__all__"


class WorkerGrievanceSerializer(serializers.ModelSerializer):
    worker_name = serializers.SerializerMethodField()

    class Meta:
        model = WorkerGrievance
        fields = ("id", "worker", "worker_name", "language", "recording_file",
                  "recording_duration_secs", "body", "status", "submitted_at", "created_at")

    def get_worker_name(self, obj):
        if hasattr(obj.worker, "worker_identity"):
            return obj.worker.worker_identity.name
        return obj.worker.username


class DocumentAccessTokenSerializer(serializers.ModelSerializer):
    is_valid = serializers.BooleanField(read_only=True)

    class Meta:
        model = DocumentAccessToken
        fields = ("id", "token_type", "document", "subject", "requester", "token_hash",
                  "status", "issued_at", "expires_at", "used_at", "max_uses", "use_count",
                  "redirect_url", "ip_address", "is_valid", "created_at")
        read_only_fields = ("token_hash", "issued_at")


class ConsentChallengeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConsentChallenge
        fields = ("id", "binding", "worker", "contractor", "stage", "challenge_value",
                  "secret_valid_until", "attempts", "state", "created_at", "updated_at")
        read_only_fields = ("challenge_value",)


class SmsOtpSerializer(serializers.ModelSerializer):
    class Meta:
        model = SmsOtp
        fields = ("id", "mobile", "purpose", "expires_at", "attempts", "max_attempts",
                  "verified", "created_at")
        read_only_fields = ("otp_hash",)


class WorkerProfileCompositeSerializer(serializers.Serializer):
    """Nested worker on-boarding profile returned by /workers/{id}/profile."""
    identity = WorkerIdentitySerializer(required=False)
    address = WorkerAddressMobilitySerializer(required=False)
    family = WorkerFamilyDependantSerializer(many=True, required=False)
    social_security = WorkerSocialSecuritySerializer(required=False)
    welfare_safety = WorkerWelfareSafetySerializer(required=False)
    banking = WorkerBankingSerializer(required=False)
    classification = WorkerClassificationSerializer(required=False)
    employment = WorkerEmploymentSerializer(many=True, required=False)
    skills = WorkerSkillsEmployabilitySerializer(required=False)
    other = WorkerOtherSerializer(required=False)
    documents = WorkerDocumentSerializer(many=True, required=False)


# ---------------------------------------------------------------------------
# DigiLocker
# ---------------------------------------------------------------------------
class DigiLockerProfileSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = DigiLockerProfile
        fields = ("id", "user", "user_name", "digilocker_id", "name", "dob",
                  "gender", "mobile", "email", "eaadhaar", "reference_key",
                  "picture_path", "is_verified", "linked_at", "updated_at")
        read_only_fields = ("id", "digilocker_id", "is_verified", "linked_at", "updated_at")

    def get_user_name(self, obj):
        return obj.user.username if obj.user_id else ""


class DigiLockerDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = DigiLockerDocument
        fields = ("id", "profile", "user", "uri", "doctype", "issuer", "doc_date",
                  "file_path", "file_name", "pan_number", "status", "downloaded_at",
                  "created_at")
        read_only_fields = ("id", "file_path", "file_name", "status", "downloaded_at", "created_at")


class DigiLockerStartSerializer(serializers.Serializer):
    authorize_url = serializers.URLField(read_only=True)
    state = serializers.CharField(read_only=True)


class DigiLockerStatusSerializer(serializers.Serializer):
    status = serializers.CharField(read_only=True)
    digilocker_id = serializers.CharField(read_only=True, required=False)
    name = serializers.CharField(read_only=True, required=False)
    documents_count = serializers.IntegerField(read_only=True, required=False)
    error = serializers.CharField(read_only=True, required=False)


# ---------------------------------------------------------------------------
# Worker QR profile card (backend payload rendered as a QR by frontend)
# ---------------------------------------------------------------------------
class WorkerQrCardSerializer(serializers.Serializer):
    qr_token = serializers.CharField(read_only=True)
    worker_id = serializers.IntegerField(read_only=True)
    bss_worker_id = serializers.CharField(read_only=True)
    name = serializers.CharField(read_only=True)
    photo = serializers.CharField(read_only=True, required=False)
    digilocker_verified = serializers.BooleanField(read_only=True, required=False)
    digilocker_id = serializers.CharField(read_only=True, required=False, allow_null=True)
    active_site = serializers.SerializerMethodField()
    verified_documents = serializers.SerializerMethodField()

    def get_active_site(self, obj):
        site = obj.get("active_site")
        return SiteSerializer(site).data if site else None

    def get_verified_documents(self, obj):
        return obj.get("verified_documents") or []
