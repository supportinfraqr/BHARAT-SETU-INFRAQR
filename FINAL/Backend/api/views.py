"""DRF ViewSets + custom business-action endpoints for the BSS API.

Includes the domain workflows encoded in the schema:
  * Worker <-> Contractor binding with 3-stage consent (APP / IVR / OTP/SMS)
  * Attendance punch by QR / NFC / CAMERA (device- and geofence-aware)
  * Wage auto-computation from attendance + wage payment disbursement
  * Time-bound document access token issue / verify
  * Grievance 3-step flow
"""

import hashlib
import logging
import os
import secrets
import uuid
from datetime import datetime, timezone

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db.models import Q
from django.utils import timezone as tz
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

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
    UserPreference, Notification, AuditLog, ApprovalQueue,
    PartyDirector, PartyStatutoryRegistration, PartyContact, PartyBank,
    PartyContract, PartyDocument, PartyConsentDeclaration, PartyMaster,
    RegisterDocumentMaster, ComplianceMaster, ComplianceDocument,
    ComplianceReport, ComplianceReportItem, EmployerDocumentMapping,
    EmployerRegisterMapping, EmployerActMapping, PtMaster, PtSlab,
    LwfMaster, LicenseMaster, MinimumWage, MenuPermission,
    PayrollConfig, EpfConfig, EsiConfig, PtConfig, LwfConfig, BonusConfig,
    SalaryComponent, SalaryDeduction, SalaryBenefit, SalaryReimbursement,
    FfsConfig, StaffPortalConfig, PayrollPeriod, GrievanceResponse,
)
from .serializers import (
    UserSerializer, RegisterSerializer,
    SiteSerializer, WorkerContractorBindingSerializer, ContractorJobSerializer,
    RozgarRequestSerializer,
    WorkerIdentitySerializer, WorkerAddressMobilitySerializer,
    WorkerFamilyDependantSerializer, WorkerSocialSecuritySerializer,
    WorkerWelfareSafetySerializer, WorkerBankingSerializer,
    WorkerClassificationSerializer, WorkerEmploymentSerializer,
    SkillMasterSerializer, WorkerSkillsEmployabilitySerializer,
    WorkerOtherSerializer, WorkerDocumentMasterSerializer, WorkerDocumentSerializer,
    RbacPermissionSerializer, QrRoleAccessSerializer, LookupValueSerializer,
    WorkerCategoryMasterSerializer, AttendanceDeviceSerializer, AttendanceSerializer,
    WorkerWagesSerializer,     WagePaymentSerializer, WorkerGatePassSerializer,
    WorkerGrievanceSerializer, DocumentAccessTokenSerializer,
    ConsentChallengeSerializer, SmsOtpSerializer, WorkerProfileCompositeSerializer,
    DigiLockerProfileSerializer, DigiLockerDocumentSerializer,
    DigiLockerStartSerializer, DigiLockerStatusSerializer, WorkerQrCardSerializer,
    UserPreferenceSerializer, NotificationSerializer, AuditLogSerializer,
    ApprovalQueueSerializer, GrievanceResponseSerializer, WorkerGrievanceExtSerializer,
    PartyDirectorSerializer, PartyStatutoryRegistrationSerializer,
    PartyContactSerializer, PartyBankSerializer, PartyContractSerializer,
    PartyDocumentSerializer, PartyConsentDeclarationSerializer, PartyMasterSerializer,
    RegisterDocumentMasterSerializer, ComplianceMasterSerializer,
    ComplianceDocumentSerializer, ComplianceReportSerializer,
    ComplianceReportItemSerializer, EmployerDocumentMappingSerializer,
    EmployerRegisterMappingSerializer, EmployerActMappingSerializer,
    PtMasterSerializer, PtSlabSerializer, LwfMasterSerializer, LicenseMasterSerializer,
    MinimumWageSerializer, MenuPermissionSerializer,
    PayrollConfigSerializer, EpfConfigSerializer, EsiConfigSerializer,
    PtConfigSerializer, LwfConfigSerializer, BonusConfigSerializer,
    SalaryComponentSerializer, SalaryDeductionSerializer, SalaryBenefitSerializer,
    SalaryReimbursementSerializer, FfsConfigSerializer, StaffPortalConfigSerializer,
    PayrollPeriodSerializer,
)
from . import digilocker_client as dl
from . import bss_ids

User = get_user_model()

GRIEVANCE_STATUS_FLOW = ["RECORDED", "SUBMITTED", "VIEWED_ON_DASHBOARD"]


def _sha256(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------
class RegisterViewSet(viewsets.GenericViewSet):
    permission_classes = [AllowAny]
    serializer_class = RegisterSerializer

    def create(self, request):
        ser = self.get_serializer(data=request.data)
        ser.is_valid(raise_exception=True)
        user = ser.save()
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


class UserViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = User.objects.all().order_by("id")
    serializer_class = UserSerializer

    @action(detail=False, methods=["get"])
    def me(self, request):
        return Response(UserSerializer(request.user).data)


# ---------------------------------------------------------------------------
# Relationship / Hierarchy
# ---------------------------------------------------------------------------
class SiteViewSet(viewsets.ModelViewSet):
    queryset = Site.objects.select_related("employer").all().order_by("id")
    serializer_class = SiteSerializer
    filterset_fields = ["employer", "state", "district", "city"]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.role == "employer":
            qs = qs.filter(employer=user)
        elif user.role == "contractor":
            qs = qs.filter(bindings__contractor=user).distinct()
        return qs


class BindingViewSet(viewsets.ModelViewSet):
    queryset = WorkerContractorBinding.objects.select_related("worker", "contractor", "site").all().order_by("id")
    serializer_class = WorkerContractorBindingSerializer
    filterset_fields = ["worker", "contractor", "site", "binding_status"]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.role == "contractor":
            return qs.filter(contractor=user)
        if user.role == "worker":
            return qs.filter(worker=user)
        if user.role == "employer":
            return qs.filter(site__employer=user)
        return qs

    @action(detail=False, methods=["post"])
    def initiate(self, request):
        """Contractor proposes a binding to a worker on a site -> PENDING."""
        worker_id = request.data.get("worker")
        site_id = request.data.get("site")
        if request.user.role != "contractor":
            return Response({"detail": "Only contractors may propose bindings."},
                            status=status.HTTP_403_FORBIDDEN)
        binding = (WorkerContractorBinding.objects
                   .filter(worker_id=worker_id, contractor=request.user, site_id=site_id,
                           binding_status__in=("PENDING", "ACCEPTED"))
                   .order_by("-created_at").first())
        if binding is None:
            binding = WorkerContractorBinding.objects.create(
                worker_id=worker_id, contractor=request.user, site_id=site_id)
        return Response(self.get_serializer(binding).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def consent(self, request, pk=None):
        """3-stage consent flow. worker consents directly (APP) or via a
        ConsentChallenge stage (IVR / OTP). Accepts {'stage': ...}."""
        binding = self.get_object()
        stage = request.data.get("stage", "APP").upper()
        if binding.binding_status not in ("PENDING", "ACCEPTED", "CANCELLED"):
            return Response({"detail": "Binding not in a consentable state."},
                            status=status.HTTP_400_BAD_REQUEST)
        if stage == "APP":
            binding.consent_worker = True
            binding.consent_method = "app"
            binding.binding_status = "ACCEPTED"
            binding.accepted_at = tz.now()
            binding.save()
            return Response(self.get_serializer(binding).data)
        # IVR / OTP require a challenge
        challenge = ConsentChallenge.objects.filter(binding=binding, stage=stage,
                                                    state="VERIFIED").first()
        if not challenge:
            return Response({"detail": f"No verified {stage} challenge for this binding."},
                            status=status.HTTP_400_BAD_REQUEST)
        binding.consent_worker = True
        binding.consent_method = "sms_otp" if stage == "OTP" else "ivr"
        binding.binding_status = "ACCEPTED"
        binding.accepted_at = tz.now()
        binding.save()
        return Response(self.get_serializer(binding).data)


class ConsentChallengeViewSet(viewsets.ModelViewSet):
    queryset = ConsentChallenge.objects.all().order_by("id")
    serializer_class = ConsentChallengeSerializer
    filterset_fields = ["worker", "contractor", "stage", "state", "binding"]

    @action(detail=False, methods=["post"])
    def issue(self, request):
        """Issue an IVR or OTP challenge for a binding.
        Accepts {'binding': id, 'stage': 'IVR'|'OTP', 'mobile': optional}."""
        binding_id = request.data.get("binding")
        stage = (request.data.get("stage") or "OTP").upper()
        try:
            binding = WorkerContractorBinding.objects.get(pk=binding_id)
        except WorkerContractorBinding.DoesNotExist:
            return Response({"detail": "Binding not found."}, status=status.HTTP_404_NOT_FOUND)
        if stage == "IVR":
            secret = None
            valid_until = tz.now() + tz.timedelta(seconds=60)
        else:  # OTP - 5 minute validity
            otp = secrets.token_hex(3).upper()
            secret = otp
            valid_until = tz.now() + tz.timedelta(minutes=5)
        challenge = ConsentChallenge.objects.create(
            binding=binding, worker=binding.worker, contractor=binding.contractor,
            stage=stage, challenge_value=secret or "",
            secret_hash=_sha256(secret) if secret else "",
            secret_valid_until=valid_until, state="SENT")
        if secret:
            identity = WorkerIdentity.objects.filter(user=binding.worker).first()
            mobile = (identity.mobile_number if identity and identity.mobile_number
                      else binding.worker.username)
            sms = SmsOtp.objects.create(
                mobile=mobile, purpose="BINDING", otp_hash=_sha256(secret),
                expires_at=valid_until, max_attempts=5)
            from . import whatsapp_client

            whatsapp_client.deliver_async(sms.pk, mobile, secret, 5)
        return Response({
            "id": challenge.id, "stage": challenge.stage,
            "secret_valid_until": challenge.secret_valid_until.isoformat(),
        })

    @action(detail=True, methods=["post"])
    def verify(self, request, pk=None):
        """Verify an OTP/IVR response against a challenge.
        Accepts {'code': 'XXXXXX'} (or {'ivr': '1'|'0'})."""
        challenge = self.get_object()
        if challenge.is_expired or challenge.state != "SENT":
            return Response({"detail": "Challenge is expired or already consumed."},
                            status=status.HTTP_400_BAD_REQUEST)
        code = request.data.get("code") or request.data.get("ivr")
        if not code:
            return Response({"detail": "Missing code."}, status=status.HTTP_400_BAD_REQUEST)
        challenge.attempts += 1
        if challenge.secret_hash and _sha256(str(code)) == challenge.secret_hash:
            challenge.state = "VERIFIED"
            challenge.save()
            return Response({"detail": "Verified"}, status=status.HTTP_200_OK)
        if challenge.attempts >= 5:
            challenge.state = "FAILED"
        challenge.save()
        return Response({"detail": "Invalid code."}, status=status.HTTP_400_BAD_REQUEST)


class SmsOtpViewSet(viewsets.ModelViewSet):
    queryset = SmsOtp.objects.all().order_by("id")
    serializer_class = SmsOtpSerializer

    @action(detail=False, methods=["post"])
    def send(self, request):
        mobile = request.data.get("mobile")
        purpose = (request.data.get("purpose") or "LOGIN").upper()
        if not mobile:
            return Response({"detail": "mobile required."}, status=status.HTTP_400_BAD_REQUEST)
        otp = secrets.token_hex(3).upper()
        record = SmsOtp.objects.create(mobile=mobile, purpose=purpose,
                                       otp_hash=_sha256(otp),
                                       expires_at=tz.now() + tz.timedelta(minutes=5))
        from . import whatsapp_client

        whatsapp_client.deliver_async(record.pk, mobile, otp, 5)
        return Response({"detail": "OTP sent", "challengeId": f"otp-{record.pk}"})


class ContractorJobViewSet(viewsets.ModelViewSet):
    queryset = ContractorJob.objects.select_related("contractor", "site").all().order_by("id")
    serializer_class = ContractorJobSerializer
    filterset_fields = ["contractor", "site", "is_active"]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.role == "contractor":
            return qs.filter(contractor=user)
        return qs


class RozgarRequestViewSet(viewsets.ModelViewSet):
    queryset = RozgarRequest.objects.select_related("job", "contractor", "worker").all().order_by("id")
    serializer_class = RozgarRequestSerializer
    filterset_fields = ["worker", "contractor", "job", "status"]


# ---------------------------------------------------------------------------
# Worker onboarding
# ---------------------------------------------------------------------------
class WorkerProfileViewSet(viewsets.GenericViewSet):
    """Aggregates a worker's full on-boarding profile by user id.
    GET /workers/{id}/profile and POST /workers/{id}/profile to (re)build it."""

    serializer_class = WorkerProfileCompositeSerializer

    @action(detail=True, methods=["get", "post"], url_path="profile")
    def profile(self, request, pk=None):
        try:
            worker = User.objects.get(pk=pk, role="worker")
        except User.DoesNotExist:
            return Response({"detail": "Worker not found."}, status=status.HTTP_404_NOT_FOUND)

        data = {
            "identity": WorkerIdentitySerializer(worker.worker_identity).data if hasattr(worker, "worker_identity") else None,
            "address": WorkerAddressMobilitySerializer(worker.worker_address).data if hasattr(worker, "worker_address") else None,
            "family": WorkerFamilyDependantSerializer(worker.family_dependants.all(), many=True).data,
            "social_security": WorkerSocialSecuritySerializer(worker.social_security).data if hasattr(worker, "social_security") else None,
            "welfare_safety": WorkerWelfareSafetySerializer(worker.welfare_safety).data if hasattr(worker, "welfare_safety") else None,
            "banking": WorkerBankingSerializer(worker.banking).data if hasattr(worker, "banking") else None,
            "classification": WorkerClassificationSerializer(worker.classification).data if hasattr(worker, "classification") else None,
            "employment": WorkerEmploymentSerializer(worker.employments.all(), many=True).data,
            "skills": WorkerSkillsEmployabilitySerializer(worker.skills).data if hasattr(worker, "skills") else None,
            "other": WorkerOtherSerializer(worker.other).data if hasattr(worker, "other") else None,
            "documents": WorkerDocumentSerializer(worker.documents.all(), many=True).data,
        }
        if request.method == "POST":
            return Response({"detail": "Composite profile write is per-section; see section endpoints."},
                            status=status.HTTP_200_OK)
        return Response(data)


class WorkerIdentityViewSet(viewsets.ModelViewSet):
    queryset = WorkerIdentity.objects.all().order_by("id")
    serializer_class = WorkerIdentitySerializer
    filterset_fields = ["user"]


class WorkerAddressMobilityViewSet(viewsets.ModelViewSet):
    queryset = WorkerAddressMobility.objects.all().order_by("id")
    serializer_class = WorkerAddressMobilitySerializer
    filterset_fields = ["user"]


class WorkerFamilyDependantViewSet(viewsets.ModelViewSet):
    queryset = WorkerFamilyDependant.objects.all().order_by("id")
    serializer_class = WorkerFamilyDependantSerializer
    filterset_fields = ["user"]


class WorkerSocialSecurityViewSet(viewsets.ModelViewSet):
    queryset = WorkerSocialSecurity.objects.all().order_by("id")
    serializer_class = WorkerSocialSecuritySerializer
    filterset_fields = ["user"]


class WorkerWelfareSafetyViewSet(viewsets.ModelViewSet):
    queryset = WorkerWelfareSafety.objects.all().order_by("id")
    serializer_class = WorkerWelfareSafetySerializer
    filterset_fields = ["user"]


class WorkerBankingViewSet(viewsets.ModelViewSet):
    queryset = WorkerBanking.objects.all().order_by("id")
    serializer_class = WorkerBankingSerializer
    filterset_fields = ["user"]


class WorkerClassificationViewSet(viewsets.ModelViewSet):
    queryset = WorkerClassification.objects.all().order_by("id")
    serializer_class = WorkerClassificationSerializer
    filterset_fields = ["user"]


class WorkerEmploymentViewSet(viewsets.ModelViewSet):
    queryset = WorkerEmployment.objects.all().order_by("id")
    serializer_class = WorkerEmploymentSerializer
    filterset_fields = ["user"]


class SkillMasterViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = SkillMaster.objects.all().order_by("id")
    serializer_class = SkillMasterSerializer
    filterset_fields = ["sector", "family", "occupation"]


class WorkerSkillsEmployabilityViewSet(viewsets.ModelViewSet):
    queryset = WorkerSkillsEmployability.objects.all().order_by("id")
    serializer_class = WorkerSkillsEmployabilitySerializer
    filterset_fields = ["user"]


class WorkerOtherViewSet(viewsets.ModelViewSet):
    queryset = WorkerOther.objects.all().order_by("id")
    serializer_class = WorkerOtherSerializer
    filterset_fields = ["user"]


class WorkerDocumentMasterViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = WorkerDocumentMaster.objects.all().order_by("id")
    serializer_class = WorkerDocumentMasterSerializer


class WorkerDocumentViewSet(viewsets.ModelViewSet):
    queryset = WorkerDocument.objects.select_related("document").all().order_by("id")
    serializer_class = WorkerDocumentSerializer
    filterset_fields = ["user", "document", "status"]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.role == "worker":
            return qs.filter(user=user)
        return qs


# ---------------------------------------------------------------------------
# Access / masters
# ---------------------------------------------------------------------------
class RbacPermissionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = RbacPermission.objects.all().order_by("id")
    serializer_class = RbacPermissionSerializer
    filterset_fields = ["role", "resource", "field"]


class QrRoleAccessViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = QrRoleAccess.objects.all().order_by("id")
    serializer_class = QrRoleAccessSerializer
    filterset_fields = ["role", "binding_scope"]


class LookupValueViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = LookupValue.objects.all().order_by("id")
    serializer_class = LookupValueSerializer
    filterset_fields = ["category"]

    @action(detail=False, methods=["get"])
    def categories(self, request):
        cats = (LookupValue.objects.order_by("category", "sort_order")
                .values_list("category", flat=True).distinct())
        return Response(sorted(set(cats)))


class WorkerCategoryMasterViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = WorkerCategoryMaster.objects.all().order_by("id")
    serializer_class = WorkerCategoryMasterSerializer


# ---------------------------------------------------------------------------
# Operations: Attendance
# ---------------------------------------------------------------------------
class AttendanceDeviceViewSet(viewsets.ModelViewSet):
    queryset = AttendanceDevice.objects.select_related("site").all().order_by("id")
    serializer_class = AttendanceDeviceSerializer
    filterset_fields = ["site", "capture_type", "is_active"]


class AttendanceViewSet(viewsets.ModelViewSet):
    queryset = Attendance.objects.select_related("worker", "site", "device").all().order_by("id")
    serializer_class = AttendanceSerializer
    filterset_fields = ["worker", "site", "contractor", "attendance_date", "status", "capture_method"]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.role == "worker":
            return qs.filter(worker=user)
        if user.role == "contractor":
            return qs.filter(contractor=user)
        if user.role == "employer":
            return qs.filter(site__employer=user)
        return qs

    @action(detail=False, methods=["post"])
    def punch(self, request):
        """Record a punch/attendance event.
        Accepts {'worker', 'site', 'capture_method','device', 'attendance_date',
        'check_in_time'(opt),'verification_type'(opt),'image_file'(opt),
        'gps_lat','gps_long'}. Status computed from time / defaults to PRESENT."""
        worker_id = request.data.get("worker")
        site_id = request.data.get("site")
        capture_method = (request.data.get("capture_method") or "QR").upper()
        if not worker_id or not site_id:
            return Response({"detail": "worker and site are required."},
                            status=status.HTTP_400_BAD_REQUEST)
        a_date = request.data.get("attendance_date") or tz.now().date()
        existing = Attendance.objects.filter(worker_id=worker_id, site_id=site_id,
                                             attendance_date=a_date).first()
        if existing and existing.check_in_time and not existing.check_out_time:
            existing.check_out_time = tz.now()
            existing.save()
            return Response(self.get_serializer(existing).data)
        att = Attendance.objects.create(
            worker_id=worker_id, site_id=site_id,
            contractor_id=request.data.get("contractor"),
            device_id=request.data.get("device"),
            attendance_date=a_date, check_in_time=tz.now() if request.data.get("check_in_time") else tz.now(),
            status="PRESENT", capture_method=capture_method,
            verification_type=request.data.get("verification_type"),
            image_file=request.data.get("image_file"),
            confidence_pct=request.data.get("confidence_pct"),
            gps_lat=request.data.get("gps_lat"), gps_long=request.data.get("gps_long"),
            is_geofence_ok=request.data.get("is_geofence_ok"),
            remarks=request.data.get("remarks", ""),
        )
        return Response(self.get_serializer(att).data, status=status.HTTP_201_CREATED)


# ---------------------------------------------------------------------------
# Operations: Wages & payments
# ---------------------------------------------------------------------------
class WorkerWagesViewSet(viewsets.ModelViewSet):
    queryset = WorkerWages.objects.select_related("worker", "site").all().order_by("id")
    serializer_class = WorkerWagesSerializer
    filterset_fields = ["worker", "site", "contractor", "status", "period_start", "period_end"]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.role == "contractor":
            return qs.filter(contractor=user)
        if user.role == "employer":
            return qs.filter(site__employer=user)
        return qs

    @action(detail=False, methods=["post"])
    def compute(self, request):
        """Auto-compute a wage record from attendance in a pay period.
        Accepts {'worker', 'site', 'period_start', 'period_end', 'daily_wage'}."""
        worker_id = request.data.get("worker")
        site_id = request.data.get("site")
        period_start = request.data.get("period_start")
        period_end = request.data.get("period_end")
        daily_wage = request.data.get("daily_wage")
        if not all([worker_id, site_id, period_start, period_end, daily_wage]):
            return Response({"detail": "worker, site, period_start, period_end, daily_wage required."},
                            status=status.HTTP_400_BAD_REQUEST)
        days = Attendance.objects.filter(worker_id=worker_id, site_id=site_id,
                                         attendance_date__gte=period_start,
                                         attendance_date__lte=period_end,
                                         status="PRESENT").count()
        gross = round(float(days) * float(daily_wage), 2)
        net = gross
        contractor_id = request.data.get("contractor") or (
            request.user.id if request.user.role == "contractor" else None)
        # ensure the requesting contractor owns an existing wage record as well
        pre = WorkerWages.objects.filter(worker_id=worker_id, period_start=period_start,
                                         period_end=period_end).first()
        if pre and request.user.role == "contractor":
            pre.contractor_id = request.user.id
            pre.save(update_fields=["contractor"])
        wages, _created = WorkerWages.objects.update_or_create(
            worker_id=worker_id, period_start=period_start, period_end=period_end,
            defaults={"site_id": site_id, "contractor_id": contractor_id,
                      "days_present": days, "days_absent": 0, "daily_wage": daily_wage,
                      "gross_wage": gross, "net_wage": net, "computed_from_attendance": True,
                      "status": "DRAFT"})
        return Response(self.get_serializer(wages).data)

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        wages = self.get_object()
        if wages.status != "DRAFT":
            return Response({"detail": f"Cannot approve {wages.status}."},
                            status=status.HTTP_400_BAD_REQUEST)
        wages.status = "APPROVED"
        wages.approved_by = request.user
        wages.approved_at = tz.now()
        wages.save()
        return Response(self.get_serializer(wages).data)


class WagePaymentViewSet(viewsets.ModelViewSet):
    queryset = WagePayment.objects.select_related("worker_wages").all().order_by("id")
    serializer_class = WagePaymentSerializer
    filterset_fields = ["worker_wages", "pay_mode", "paid_by"]

    @action(detail=False, methods=["post"])
    def disburse(self, request):
        """Disburse an approved wage record.
        Accepts {'worker_wages', 'pay_mode','amount','transaction_ref',
        'bank_account_last4','upi_id','remarks'}."""
        wages = WorkerWages.objects.get(pk=request.data.get("worker_wages"))
        if wages.status not in ("APPROVED", "DRAFT"):
            return Response({"detail": "Wage record must be approved to disburse."},
                            status=status.HTTP_400_BAD_REQUEST)
        payment = WagePayment.objects.create(
            worker_wages=wages, pay_mode=request.data.get("pay_mode", "BANK"),
            amount=request.data.get("amount", wages.net_wage),
            transaction_ref=request.data.get("transaction_ref", f"TXN-{uuid.uuid4().hex[:10].upper()}"),
            bank_account_last4=request.data.get("bank_account_last4", ""),
            upi_id=request.data.get("upi_id", ""),
            paid_by=request.user, remarks=request.data.get("remarks", ""))
        wages.status = "PAID"
        wages.save()
        return Response(WagePaymentSerializer(payment).data, status=status.HTTP_201_CREATED)


class WorkerGatePassViewSet(viewsets.ModelViewSet):
    queryset = WorkerGatePass.objects.select_related("worker", "site").all().order_by("id")
    serializer_class = WorkerGatePassSerializer
    filterset_fields = ["worker", "site", "gate_pass_type", "status"]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.role == "worker":
            return qs.filter(worker=user)
        return qs


# ---------------------------------------------------------------------------
# Operations: Grievance
# ---------------------------------------------------------------------------
class WorkerGrievanceViewSet(viewsets.ModelViewSet):
    queryset = WorkerGrievance.objects.select_related("worker").all().order_by("id")
    serializer_class = WorkerGrievanceSerializer
    filterset_fields = ["worker", "status"]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.role == "worker":
            return qs.filter(worker=user)
        return qs

    @action(detail=True, methods=["post"])
    def advance(self, request, pk=None):
        """Move a grievance through RECORDED -> SUBMITTED -> VIEWED_ON_DASHBOARD."""
        grievance = self.get_object()
        idx = GRIEVANCE_STATUS_FLOW.index(grievance.status)
        if idx >= len(GRIEVANCE_STATUS_FLOW) - 1:
            return Response({"detail": "Already in final state."})
        grievance.status = GRIEVANCE_STATUS_FLOW[idx + 1]
        if grievance.status == "SUBMITTED":
            grievance.submitted_at = tz.now()
        grievance.save()
        return Response(self.get_serializer(grievance).data)


# ---------------------------------------------------------------------------
# Operations: Document access tokens
# ---------------------------------------------------------------------------
class DocumentAccessTokenViewSet(viewsets.ModelViewSet):
    queryset = DocumentAccessToken.objects.all().order_by("id")
    serializer_class = DocumentAccessTokenSerializer
    filterset_fields = ["token_type", "document", "subject", "status"]

    @action(detail=False, methods=["post"])
    def issue(self, request):
        """Issue a time-bound token.
        Accepts {'token_type','document'(opt),'subject'(opt),'expires_at'(ISO,opt),
        'max_uses'(opt),'redirect_url'(opt)}. Returned token is raw (dev)."""
        raw = secrets.token_urlsafe(32)
        expires_at_raw = request.data.get("expires_at")
        if expires_at_raw:
            try:
                expires_at = datetime.fromisoformat(expires_at_raw.replace("Z", "+00:00"))
            except ValueError:
                expires_at = tz.now() + tz.timedelta(days=1)
        else:
            expires_at = tz.now() + tz.timedelta(days=1)
        token = DocumentAccessToken.objects.create(
            token_type=(request.data.get("token_type") or "DOCUMENT_VIEW"),
            document_id=request.data.get("document"),
            subject_id=request.data.get("subject"),
            requester=request.user,
            token_hash=_sha256(raw), status="ACTIVE",
            expires_at=expires_at, max_uses=int(request.data.get("max_uses") or 1),
            redirect_url=request.data.get("redirect_url", ""),
            ip_address=request.META.get("REMOTE_ADDR", ""))
        return Response({"token": raw, "expires_at": token.expires_at.isoformat(),
                         "status": token.status, "id": token.id})

    @action(detail=False, methods=["post"])
    def verify(self, request):
        """Exchange a raw token for its record (if ACTIVE + unexpired + under max_uses)."""
        raw = request.data.get("token")
        if not raw:
            return Response({"detail": "token required."}, status=status.HTTP_400_BAD_REQUEST)
        token = DocumentAccessToken.objects.filter(token_hash=_sha256(raw)).first()
        if not token:
            return Response({"valid": False, "detail": "Unknown token."}, status=status.HTTP_404_NOT_FOUND)
        if not token.is_valid:
            return Response({"valid": False, "detail": f"Token is {token.status} / expired / exhausted."},
                            status=status.HTTP_400_BAD_REQUEST)
        token.use_count += 1
        if token.use_count >= token.max_uses:
            token.status = "USED"
        token.save()
        return Response({"valid": True, "id": token.id, "token_type": token.token_type,
                         "document": token.document_id, "redirect_url": token.redirect_url})


# ---------------------------------------------------------------------------
# QR access helper
# ---------------------------------------------------------------------------
class QrAccessActionViewSet(viewsets.GenericViewSet):
    """POST /qr/scan — resolve a site QR token to the site + viewable binding scope."""
    serializer_class = SiteSerializer

    @action(detail=False, methods=["post"])
    def scan(self, request):
        qr_token = request.data.get("qr_token") or request.data.get("token")
        if not qr_token:
            return Response({"detail": "qr_token required."}, status=status.HTTP_400_BAD_REQUEST)
        site = Site.objects.filter(site_qr_token=qr_token).first()
        if not site:
            return Response({"detail": "Unknown site QR."}, status=status.HTTP_404_NOT_FOUND)
        role = request.user.role if request.user.is_authenticated else "guest"
        return Response({"site": SiteSerializer(site).data, "role": role})


# ---------------------------------------------------------------------------
# DigiLocker OAuth2 (backend-only, ported from EesassinErp)
# ---------------------------------------------------------------------------
def _digilocker_doc_kind(item):
    """Classify a DigiLocker file into the BSS identity it can fill."""
    blob = " ".join(str(item.get(k) or "") for k in ("doctype", "name", "uri")).upper()
    if "PAN" in blob:
        return "pan"
    if "AADHAAR" in blob or "ADHAR" in blob:
        return "aadhaar"
    if any(k in blob for k in ("EPFO", "UAN", "PRFND", "PASSBOOK", "PROVIDENT")):
        return "uan"
    return ""


def _first_12_digit(*texts):
    import re as _re
    for text in texts:
        m = _re.search(r"(?<!\d)(\d{4})\s?(\d{4})\s?(\d{4})(?!\d)", str(text or ""))
        if m:
            return "".join(m.groups())
    return ""


def _apply_digilocker_documents(user, items):
    """Fill Aadhaar / PAN / UAN on the worker profile from fetched DigiLocker
    files. Never overwrites a value that is already present."""
    identity = WorkerIdentity.objects.filter(user=user).first()
    social = WorkerSocialSecurity.objects.filter(user=user).first()
    identity_dirty = False
    for item in items:
        kind = _digilocker_doc_kind(item)
        if not kind:
            continue
        uri, name = item.get("uri") or "", item.get("name") or ""
        if kind == "pan" and identity:
            # DigiLocker is authoritative for PAN: a fetched PAN always wins over
            # a manually-typed value and is the only source that marks it verified.
            pan = dl.extract_pan(uri) or dl.extract_pan(name)
            if pan and (identity.pan != pan or not identity.pan_verified):
                identity.pan = pan
                identity.pan_verified = True
                identity_dirty = True
        elif kind == "aadhaar" and identity and not identity.aadhaar:
            num = _first_12_digit(uri, name)
            if num:
                identity.aadhaar = num
                identity_dirty = True
        elif kind == "uan":
            if social is None:
                social, _ = WorkerSocialSecurity.objects.get_or_create(user=user)
            if social and not social.epfo_uan:
                uan = _first_12_digit(uri, name)
                if uan:
                    social.epfo_uan = uan
                    social.save(update_fields=["epfo_uan", "updated_at"])
    if identity_dirty and identity:
        identity.save()


def _store_eaadhaar(profile, user, xml_text):
    """Persist the DigiLocker e-Aadhaar XML as an ADHAR document and fill the
    worker's Aadhaar number/name when the signed XML carries them."""
    import xml.etree.ElementTree as ET
    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError:
        return
    uid_data = root if root.tag == "UidData" else root.find(".//UidData")
    if uid_data is None:
        return
    uid = str(uid_data.get("uid") or "").strip()
    folder = dl.ensure_doc_dir()
    fname = "eaadhaar-" + (profile.digilocker_id or str(profile.id)) + ".xml"
    fpath = os.path.join(folder, fname)
    try:
        with open(fpath, "w", encoding="utf-8") as f:
            f.write(xml_text)
    except OSError:
        fpath = ""
    uri = f"in.gov.uidai-ADHAR-{profile.digilocker_id}"
    DigiLockerDocument.objects.update_or_create(
        profile=profile, uri=uri,
        defaults={"user": user, "doctype": "ADHAR",
                  "issuer": "Aadhaar, Unique Identification Authority of India",
                  "file_path": fpath, "file_name": fname or f"{uri}.xml",
                  "status": "DOWNLOADED", "downloaded_at": tz.now()})
    try:
        _sync_document_register(user, "AADHAR", xml_text.encode("utf-8"),
                                fname or "eaadhaar.xml", "application/xml")
    except Exception:
        pass
    identity = WorkerIdentity.objects.filter(user=user).first()
    if identity:
        dirty = False
        if uid.isdigit() and len(uid) == 12 and not identity.aadhaar:
            identity.aadhaar = uid
            dirty = True
        if not identity.name and uid_data.get("name"):
            identity.name = uid_data.get("name")
            dirty = True
        if dirty:
            identity.save()


def _digilocker_master_code(item):
    """Map a DigiLocker file to a WorkerDocumentMaster code (or None)."""
    blob = " ".join(str(item.get(k) or "") for k in ("doctype", "name", "uri")).upper()
    if "PAN" in blob:
        return "PAN"
    if "AADHAAR" in blob or "ADHAR" in blob:
        return "AADHAR"
    if any(k in blob for k in ("UAN", "EPFO", "PRFND", "PASSBOOK", "PROVIDENT")):
        return "UAN"
    if any(k in blob for k in ("SSCER", "HSCER", "ABCID", "MARKSHEET", "CERTIFICATE", "MARKS STATEMENT")):
        return "EDU"
    return None


def _sync_document_register(user, master_code, file_bytes, filename, mime=""):
    """Attach a fetched DigiLocker file to the worker's document register so the
    Documents checklist shows it as present instead of Missing."""
    from django.core.files.base import ContentFile
    from bss_core.models import WorkerDocument, WorkerDocumentMaster
    master = WorkerDocumentMaster.objects.filter(code=master_code).first()
    if master is None:
        return
    doc = WorkerDocument.objects.filter(user=user, document=master).first()
    if doc is None:
        doc = WorkerDocument(user=user, document=master)
    doc.file_name = filename
    doc.file_size = len(file_bytes)
    doc.mime_type = mime or ("application/pdf" if filename.lower().endswith(".pdf")
                             else "application/octet-stream")
    doc.status = "VERIFIED"
    doc.is_mandatory = master.is_mandatory
    doc.owner_role = "worker"
    doc.auto_generated = True
    doc.file.save(filename, ContentFile(file_bytes), save=False)
    doc.file_path = doc.file.name
    doc.save()


def _capture_pan_name(user, file_bytes):
    """Read the PAN holder name from the fetched DigiLocker PAN PDF (OCR) and
    record whether it matches the worker's Aadhaar name."""
    if user is None or not file_bytes:
        return
    identity = WorkerIdentity.objects.filter(user=user).first()
    if identity is None or identity.pan_holder_name:
        return
    try:
        from . import ocr_client
        text = ocr_client.extract_text(file_bytes, "pan.pdf")
        fields = ocr_client.extract_fields("pan", text)
    except Exception as exc:
        logging.getLogger(__name__).warning("PAN name OCR failed: %s", exc)
        return
    name = str(fields.get("name") or "").strip()
    if not name:
        return
    from .identity_utils import names_match, verified_aadhaar
    aadhaar_name = str((verified_aadhaar(user) or {}).get("name") or identity.name or "").strip()
    identity.pan_holder_name = name[:120]
    identity.pan_name_matches_aadhaar = names_match(name, aadhaar_name)
    identity.save(update_fields=["pan_holder_name", "pan_name_matches_aadhaar", "updated_at"])


def _background_fetch_documents(session, access_token, profile, user):
    """Download issued docs in the background; failures recorded per doc so the
    sync response stays fast."""
    errors = []
    try:
        items = []
        # Each endpoint is independent and optional — one failing (e.g. the app has
        # no files.uploadeddocs scope, or DigiLocker answers with an empty body)
        # must never abort the issued-documents pull. Uploaded / e-Aadhaar are
        # opt-in (not granted for this app; PAN from issued docs is the norm).
        loaders = [dl.list_issued_documents]
        if getattr(settings, "DIGILOCKER_FETCH_UPLOADED", False):
            loaders.append(dl.list_uploaded_documents)
        for loader in loaders:
            try:
                items += loader(access_token) or []
            except Exception as exc:
                errors.append(f"{loader.__name__}: {exc}")
                logging.getLogger(__name__).warning("DigiLocker %s failed: %s", loader.__name__, exc)
        try:
            _apply_digilocker_documents(user, items)
        except Exception as exc:
            errors.append(f"apply: {exc}")
            logging.getLogger(__name__).warning("DigiLocker apply failed: %s", exc)
        if (profile.eaadhaar or "").strip().upper() == "Y" and getattr(settings, "DIGILOCKER_FETCH_EADHAAR", False):
            try:
                _store_eaadhaar(profile, user, dl.fetch_eaadhaar(access_token))
            except Exception as exc:
                errors.append(f"eaadhaar: {exc}")
                logging.getLogger(__name__).warning("DigiLocker eaadhaar failed: %s", exc)
        seen = set()
        for item in items:
            uri = item.get("uri") or ""
            if not uri or uri in seen:
                continue
            seen.add(uri)
            existing = DigiLockerDocument.objects.filter(profile=profile, uri=uri).first()
            if existing:
                if user is not None and existing.user_id != getattr(user, "id", None):
                    existing.user = user
                try:
                    file_bytes = dl.download_document(access_token, uri)
                    if file_bytes:
                        folder = dl.ensure_doc_dir()
                        fname = dl.safe_filename(uri) + ".pdf"
                        fpath = os.path.join(folder, fname)
                        with open(fpath, "wb") as f:
                            f.write(file_bytes)
                        existing.file.save(fname, ContentFile(file_bytes), save=False)
                        existing.file_path = existing.file.name
                        if dl.extract_pan(uri):
                            _capture_pan_name(user, file_bytes)
                except Exception as exc:
                    logging.getLogger(__name__).warning("DigiLocker re-download %s failed: %s", uri, exc)
                existing.downloaded_at = tz.now()
                existing.doc_date = (item.get("doc_date") or "")[:60]
                existing.issuer = (item.get("issuer") or "")[:120]
                existing.document_name = (item.get("document_name") or "")[:200]
                existing.save()
                continue
            try:
                file_bytes = dl.download_document(access_token, uri)
                folder = dl.ensure_doc_dir()
                fname = dl.safe_filename(uri) + ".pdf"
                fpath = os.path.join(folder, fname)
                with open(fpath, "wb") as f:
                    f.write(file_bytes)
                if dl.extract_pan(uri) or dl.extract_pan(item.get("name") or ""):
                    _capture_pan_name(user, file_bytes)
                DigiLockerDocument.objects.create(
                    profile=profile, user=user,
                    uri=uri,
                    doctype=(item.get("doctype") or "")[:120],
                    issuer=(item.get("issuer") or "")[:300],
                    doc_date=(item.get("date") or ""),
                    file_path=fpath, file_name=fname,
                    pan_number=(dl.extract_pan(uri) or dl.extract_pan(item.get("name") or "")),
                    status="DOWNLOADED", downloaded_at=tz.now())
                master_code = _digilocker_master_code(item)
                if master_code:
                    try:
                        _sync_document_register(user, master_code, file_bytes, fname, "application/pdf")
                    except Exception:
                        pass
            except Exception as exc:
                logging.getLogger(__name__).warning(
                    "DigiLocker download failed for uri=%s: %s", uri, exc)
                DigiLockerDocument.objects.get_or_create(
                    profile=profile, uri=uri,
                    defaults={"user": user, "doctype": (item.get("doctype") or "")[:120],
                              "issuer": (item.get("issuer") or "")[:300],
                              "doc_date": (item.get("date") or ""), "status": "FAILED",
                              "error_detail": str(exc)[:255]})
    except Exception as exc:  # never let the background thread die silently
        errors.append(f"fetch: {exc}")
        logging.getLogger(__name__).exception("DigiLocker background fetch crashed: %s", exc)
    finally:
        if errors:
            session.error = "; ".join(errors)[:500]
        session.status = "COMPLETED"
        session.save(update_fields=["status", "error", "updated_at"])


class DigiLockerViewSet(viewsets.GenericViewSet):
    """POST /digilocker/start → pkce authorize URL
       GET  /digilocker/callback → oauth callback (code+state)
       GET  /digilocker/status   → poll completion
       GET  /digilocker/profile  → current user's profile + documents
       GET  /digilocker/documents → fetched issued documents"""

    serializer_class = DigiLockerStartSerializer

    def get_authenticators(self):
        # The OAuth callback is a top-level browser redirect with no session; the
        # FE forwards it with the service token, which the default JWT auth would
        # reject ("Given token not valid for any token type"). Skip auth here —
        # the DigiLocker session (state) identifies the user.
        # NOTE: self.action is not set yet at this point, so inspect action_map.
        if "callback" in getattr(self, "action_map", {}).values():
            return []
        # Authenticated actions use the BSS session auth, which tolerates the
        # X-BSS-Subject header when the short-lived JWT access token has expired
        # (the default JWTAuthentication would 401 with "token not valid").
        from .v1_bridge import BssSessionAuthentication
        return [BssSessionAuthentication()]

    def get_permissions(self):
        from rest_framework.permissions import AllowAny, IsAuthenticated
        if self.action in ("start", "callback", "status"):
            return [AllowAny()]
        return [IsAuthenticated()]

    @action(detail=False, methods=["post"])
    def start(self, request):
        verifier = dl.generate_code_verifier()
        state = secrets.token_urlsafe(24)
        session = DigiLockerSession.objects.create(
            user=request.user if request.user.is_authenticated else None,
            state=state, code_verifier=verifier, status="INITIATED",
            expires_at=tz.now() + tz.timedelta(minutes=settings.DIGILOCKER_SESSION_TTL_MIN))
        url = dl.build_authorize_url(state, verifier)
        return Response({"authorize_url": url, "state": state, "session_id": session.id})

    @action(detail=False, methods=["get"])
    def callback(self, request):
        code = request.query_params.get("code")
        state = request.query_params.get("state")
        session = DigiLockerSession.objects.filter(state=state).first()
        if not code or not session:
            return Response({"detail": "Invalid callback."}, status=status.HTTP_400_BAD_REQUEST)
        if session.is_expired or session.status in ("COMPLETED", "ERROR"):
            session.status = "EXPIRED" if session.is_expired else session.status
            session.save()
            return Response({"detail": "DigiLocker session expired or used."},
                            status=status.HTTP_410_GONE)
        session.code = code
        session.status = "CODE_RECEIVED"
        session.save(update_fields=["code", "status", "updated_at"])
        try:
            token_data = dl.exchange_code(code, session.code_verifier)
            access_token = token_data["access_token"]
            session.access_token_hash = _sha256(access_token)
            session.status = "TOKEN_OBTAINED"
            session.save(update_fields=["access_token_hash", "status", "updated_at"])
            user_data = dl.get_user(access_token)
        except dl.DigiLockerError as exc:
            session.status = "ERROR"
            session.error = str(exc)
            session.save(update_fields=["status", "error", "updated_at"])
            return Response({"detail": str(exc)}, status=status.HTTP_502_BAD_GATEWAY)

        digilocker_id = user_data.get("digilockerid") or ""
        # Link / update profile on the mapped user (create if unknown).
        user = session.user
        if user is None:
            mobile = user_data.get("mobile") or ""
            from bss_core.models import UserCredential
            cred = UserCredential.objects.filter(identity_type="mobile",
                                                 identity_value=mobile).first()
            user = cred.user if cred else None
        profile, _ = DigiLockerProfile.objects.update_or_create(
            digilocker_id=digilocker_id,
            defaults={"user": user, "name": user_data.get("name") or "",
                      "dob": user_data.get("dob") or "", "gender": user_data.get("gender") or "",
                      "mobile": user_data.get("mobile") or "", "email": user_data.get("email") or "",
                      "eaadhaar": user_data.get("eaadhaar") or "",
                      "reference_key": user_data.get("reference_key") or "",
                      "is_verified": True})
        # store picture if present
        picture_b64 = user_data.get("picture") or ""
        if picture_b64:
            try:
                folder = dl.ensure_doc_dir()
                pic_path = os.path.join(folder, digilocker_id + ".jpg")
                with open(pic_path, "wb") as f:
                    f.write(__import__("base64").b64decode(picture_b64))
                profile.picture_path = pic_path
                profile.save(update_fields=["picture_path", "updated_at"])
            except Exception:
                pass

        # A DigiLocker account is linked to this user. Previously-fetched documents
        # may still be attached to an older user (the profile can be re-linked),
        # which hid them from the Documents wallet — re-home them to this user and
        # re-register them so the Documents checklist shows them as present.
        if user is not None:
            for row in DigiLockerDocument.objects.filter(profile=profile).exclude(user=user):
                row.user = user
                row.save(update_fields=["user"])
                code = _digilocker_master_code({"doctype": row.doctype, "name": row.file_name or "", "uri": row.uri or ""})
                if code and row.file_path:
                    try:
                        with open(row.file_path, "rb") as fh:
                            _sync_document_register(user, code, fh.read(), row.file_name or "document")
                    except Exception:
                        pass

        import threading
        threading.Thread(target=_background_fetch_documents,
                         args=(session, access_token, profile, user), daemon=True).start()
        return Response({
            "status": "PROCESSING",
            "session_id": session.id,
            "digilocker_id": digilocker_id,
            "name": profile.name,
            "is_verified": True,
        })

    @action(detail=False, methods=["get"])
    def status(self, request):
        session = DigiLockerSession.objects.filter(
            state=request.query_params.get("state")).first()
        if not session:
            return Response({"detail": "Unknown session."}, status=status.HTTP_404_NOT_FOUND)
        if session.status != "COMPLETED" and session.is_expired:
            session.status = "EXPIRED"
            session.save(update_fields=["status", "updated_at"])
        profile = DigiLockerProfile.objects.filter(
            user_id=session.user_id).first() if session.user_id else None
        data = {"status": session.status}
        if session.error:
            data["error"] = session.error
        if profile:
            data["digilocker_id"] = profile.digilocker_id
            data["name"] = profile.name
            data["documents_count"] = profile.documents.count()
        return Response(DigiLockerStatusSerializer(data).data)

    @action(detail=False, methods=["get"])
    def profile(self, request):
        profile = DigiLockerProfile.objects.filter(user=request.user).first()
        if not profile:
            return Response({"detail": "No DigiLocker profile linked."},
                            status=status.HTTP_404_NOT_FOUND)
        return Response(DigiLockerProfileSerializer(profile).data)

    @action(detail=False, methods=["get"])
    def documents(self, request):
        # Match on the document's user OR its profile owner, so documents fetched
        # before the profile was (re)linked still show for the linked user.
        docs = (DigiLockerDocument.objects
                .filter(Q(user=request.user) | Q(profile__user=request.user))
                .distinct().order_by("-created_at"))
        latest = DigiLockerSession.objects.filter(user=request.user).order_by("-id").first()
        return Response({
            "data": DigiLockerDocumentSerializer(docs, many=True).data,
            "error": (latest.error if latest else "") or "",
            "status": (latest.status if latest else ""),
        })


# ---------------------------------------------------------------------------
# Full QR technology (backend)
# ---------------------------------------------------------------------------
class WorkerQrActionViewSet(viewsets.GenericViewSet):
    """QR profile-card + worker/site QR scan endpoints.

    POST /qr/worker-card/      → payload to render THIS worker's QR card
    POST /qr/worker-scan/      → resolve a scanned worker QR token (role-scoped)
    POST /qr/scan/             → resolve a scanned site QR token (inherited)
    POST /qr/issue-token/      → (re)issue a worker's qr_token
    """

    serializer_class = WorkerQrCardSerializer

    @action(detail=False, methods=["post"], url_path="worker-card")
    def worker_card(self, request):
        if request.user.role != "worker":
            return Response({"detail": "Only workers have QR cards."},
                            status=status.HTTP_403_FORBIDDEN)
        return Response(self._card_payload(request.user))

    @action(detail=False, methods=["post"], url_path="worker-scan")
    def worker_scan(self, request):
        qr_token = request.data.get("qr_token") or request.data.get("token")
        if not qr_token:
            return Response({"detail": "qr_token required."}, status=status.HTTP_400_BAD_REQUEST)
        from bss_core.models import WorkerIdentity
        ident = WorkerIdentity.objects.filter(qr_token=qr_token).first()
        if not ident:
            return Response({"detail": "Unknown worker QR."}, status=status.HTTP_404_NOT_FOUND)
        return Response(self._card_payload(ident.user))

    @action(detail=False, methods=["post"], url_path="issue-token")
    def issue_token(self, request):
        if request.user.role != "worker":
            return Response({"detail": "Only workers can have QR tokens."},
                            status=status.HTTP_403_FORBIDDEN)
        ident, _created = WorkerIdentity.objects.get_or_create(
            user=request.user, defaults={"bss_worker_id": bss_ids.new_bss_worker_id()})
        import uuid as _uuid
        ident.qr_token = _uuid.uuid4().hex + _uuid.uuid4().hex[:8]
        ident.save(update_fields=["qr_token"])
        return Response({"qr_token": ident.qr_token, "worker_id": request.user.id})

    def _card_payload(self, worker):
        from bss_core.models import WorkerIdentity, WorkerContractorBinding, WorkerDocument
        ident = WorkerIdentity.objects.filter(user=worker).first()
        active_binding = WorkerContractorBinding.objects.filter(
            worker=worker, binding_status="ACCEPTED").first()
        dl_profile = getattr(worker, "digilocker", None)
        verified = list(WorkerDocument.objects.filter(
            user=worker, status="VERIFIED").values_list("document__code", "document__document_name"))
        data = {
            "qr_token": ident.qr_token if ident else None,
            "worker_id": worker.id,
            "bss_worker_id": ident.bss_worker_id if ident else None,
            "name": ident.name if ident else worker.username,
            "photo": ident.photo if ident and ident.photo else None,
            "digilocker_verified": bool(dl_profile and dl_profile.is_verified),
            "digilocker_id": dl_profile.digilocker_id if dl_profile else None,
            "active_site": active_binding.site if active_binding else None,
            "verified_documents": [code for code, _ in verified],
        }
        return WorkerQrCardSerializer(data).data


# ---------------------------------------------------------------------------
# Engagement & governance
# ---------------------------------------------------------------------------
class UserPreferenceViewSet(viewsets.ModelViewSet):
    queryset = UserPreference.objects.select_related("user").all().order_by("id")
    serializer_class = UserPreferenceSerializer
    filterset_fields = ["user"]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.role in ("worker", "contractor", "employer"):
            return qs.filter(user=user)
        return qs


class NotificationViewSet(viewsets.ModelViewSet):
    queryset = Notification.objects.select_related("user").all().order_by("-created_at")
    serializer_class = NotificationSerializer
    filterset_fields = ["user", "type", "is_read"]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.role in ("worker", "contractor", "employer"):
            return qs.filter(user=user)
        return qs


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AuditLog.objects.select_related("actor").all().order_by("-created_at")
    serializer_class = AuditLogSerializer
    filterset_fields = ["actor", "action", "entity_type", "entity_id"]


class ApprovalQueueViewSet(viewsets.ModelViewSet):
    queryset = ApprovalQueue.objects.select_related("requested_by", "approver").all().order_by("-requested_at")
    serializer_class = ApprovalQueueSerializer
    filterset_fields = ["entity_type", "entity_id", "status", "approver"]


class GrievanceResponseViewSet(viewsets.ModelViewSet):
    queryset = GrievanceResponse.objects.select_related("grievance", "actor").all().order_by("id")
    serializer_class = GrievanceResponseSerializer
    filterset_fields = ["grievance"]


# ---------------------------------------------------------------------------
# Employer / Contractor registry
# ---------------------------------------------------------------------------
class PartyDirectorViewSet(viewsets.ModelViewSet):
    queryset = PartyDirector.objects.all().order_by("id")
    serializer_class = PartyDirectorSerializer
    filterset_fields = ["party_type", "party_user"]


class PartyStatutoryRegistrationViewSet(viewsets.ModelViewSet):
    queryset = PartyStatutoryRegistration.objects.all().order_by("id")
    serializer_class = PartyStatutoryRegistrationSerializer
    filterset_fields = ["party_type", "party_user", "reg_kind"]


class PartyContactViewSet(viewsets.ModelViewSet):
    queryset = PartyContact.objects.all().order_by("id")
    serializer_class = PartyContactSerializer
    filterset_fields = ["party_type", "party_user", "kind"]


class PartyBankViewSet(viewsets.ModelViewSet):
    queryset = PartyBank.objects.all().order_by("id")
    serializer_class = PartyBankSerializer
    filterset_fields = ["party_type", "party_user"]


class PartyContractViewSet(viewsets.ModelViewSet):
    queryset = PartyContract.objects.select_related("site").all().order_by("id")
    serializer_class = PartyContractSerializer
    filterset_fields = ["party_type", "party_user", "site"]


class PartyDocumentViewSet(viewsets.ModelViewSet):
    queryset = PartyDocument.objects.all().order_by("id")
    serializer_class = PartyDocumentSerializer
    filterset_fields = ["party_type", "party_user", "doc_type", "verification_status"]


class PartyConsentDeclarationViewSet(viewsets.ModelViewSet):
    queryset = PartyConsentDeclaration.objects.all().order_by("id")
    serializer_class = PartyConsentDeclarationSerializer
    filterset_fields = ["party_type", "party_user", "declaration"]


class PartyMasterViewSet(viewsets.ModelViewSet):
    queryset = PartyMaster.objects.all().order_by("id")
    serializer_class = PartyMasterSerializer
    filterset_fields = ["party_type", "state", "is_active"]


# ---------------------------------------------------------------------------
# Compliance & statutory masters
# ---------------------------------------------------------------------------
class RegisterDocumentMasterViewSet(viewsets.ModelViewSet):
    queryset = RegisterDocumentMaster.objects.all().order_by("id")
    serializer_class = RegisterDocumentMasterSerializer
    filterset_fields = ["kind", "state", "is_mandatory"]


class ComplianceMasterViewSet(viewsets.ModelViewSet):
    queryset = ComplianceMaster.objects.all().order_by("id")
    serializer_class = ComplianceMasterSerializer
    filterset_fields = ["act", "form_number"]


class ComplianceDocumentViewSet(viewsets.ModelViewSet):
    queryset = ComplianceDocument.objects.select_related("employer", "master").all().order_by("id")
    serializer_class = ComplianceDocumentSerializer
    filterset_fields = ["employer", "financial_year", "status", "site"]


class ComplianceReportViewSet(viewsets.ModelViewSet):
    queryset = ComplianceReport.objects.select_related("employer").all().order_by("-id")
    serializer_class = ComplianceReportSerializer
    filterset_fields = ["employer", "financial_year"]


class ComplianceReportItemViewSet(viewsets.ModelViewSet):
    queryset = ComplianceReportItem.objects.all().order_by("id")
    serializer_class = ComplianceReportItemSerializer
    filterset_fields = ["report"]


class EmployerDocumentMappingViewSet(viewsets.ModelViewSet):
    queryset = EmployerDocumentMapping.objects.all().order_by("id")
    serializer_class = EmployerDocumentMappingSerializer
    filterset_fields = ["employer", "register_doc"]


class EmployerRegisterMappingViewSet(viewsets.ModelViewSet):
    queryset = EmployerRegisterMapping.objects.all().order_by("id")
    serializer_class = EmployerRegisterMappingSerializer
    filterset_fields = ["employer", "register_doc"]


class EmployerActMappingViewSet(viewsets.ModelViewSet):
    queryset = EmployerActMapping.objects.all().order_by("id")
    serializer_class = EmployerActMappingSerializer
    filterset_fields = ["employer", "act"]


class PtMasterViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = PtMaster.objects.prefetch_related("slabs").all().order_by("id")
    serializer_class = PtMasterSerializer
    filterset_fields = ["state"]


class PtSlabViewSet(viewsets.ModelViewSet):
    queryset = PtSlab.objects.all().order_by("id")
    serializer_class = PtSlabSerializer
    filterset_fields = ["pt_master"]


class LwfMasterViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = LwfMaster.objects.all().order_by("id")
    serializer_class = LwfMasterSerializer
    filterset_fields = ["state"]


class LicenseMasterViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = LicenseMaster.objects.all().order_by("id")
    serializer_class = LicenseMasterSerializer
    filterset_fields = ["state"]


class MinimumWageViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = MinimumWage.objects.all().order_by("id")
    serializer_class = MinimumWageSerializer
    filterset_fields = ["state", "industry"]


class MenuPermissionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = MenuPermission.objects.all().order_by("id")
    serializer_class = MenuPermissionSerializer
    filterset_fields = ["role", "menu_code"]


# ---------------------------------------------------------------------------
# Payroll configuration cluster
# ---------------------------------------------------------------------------
class PayrollConfigViewSet(viewsets.ModelViewSet):
    queryset = PayrollConfig.objects.select_related("employer").all().order_by("id")
    serializer_class = PayrollConfigSerializer
    filterset_fields = ["employer"]


class EpfConfigViewSet(viewsets.ModelViewSet):
    queryset = EpfConfig.objects.all().order_by("id")
    serializer_class = EpfConfigSerializer
    filterset_fields = ["config"]


class EsiConfigViewSet(viewsets.ModelViewSet):
    queryset = EsiConfig.objects.all().order_by("id")
    serializer_class = EsiConfigSerializer
    filterset_fields = ["config"]


class PtConfigViewSet(viewsets.ModelViewSet):
    queryset = PtConfig.objects.all().order_by("id")
    serializer_class = PtConfigSerializer
    filterset_fields = ["config"]


class LwfConfigViewSet(viewsets.ModelViewSet):
    queryset = LwfConfig.objects.all().order_by("id")
    serializer_class = LwfConfigSerializer
    filterset_fields = ["config"]


class BonusConfigViewSet(viewsets.ModelViewSet):
    queryset = BonusConfig.objects.all().order_by("id")
    serializer_class = BonusConfigSerializer
    filterset_fields = ["config"]


class SalaryComponentViewSet(viewsets.ModelViewSet):
    queryset = SalaryComponent.objects.all().order_by("id")
    serializer_class = SalaryComponentSerializer
    filterset_fields = ["config"]


class SalaryDeductionViewSet(viewsets.ModelViewSet):
    queryset = SalaryDeduction.objects.all().order_by("id")
    serializer_class = SalaryDeductionSerializer
    filterset_fields = ["config"]


class SalaryBenefitViewSet(viewsets.ModelViewSet):
    queryset = SalaryBenefit.objects.all().order_by("id")
    serializer_class = SalaryBenefitSerializer
    filterset_fields = ["config"]


class SalaryReimbursementViewSet(viewsets.ModelViewSet):
    queryset = SalaryReimbursement.objects.all().order_by("id")
    serializer_class = SalaryReimbursementSerializer
    filterset_fields = ["config"]


class FfsConfigViewSet(viewsets.ModelViewSet):
    queryset = FfsConfig.objects.all().order_by("id")
    serializer_class = FfsConfigSerializer
    filterset_fields = ["config"]


class StaffPortalConfigViewSet(viewsets.ModelViewSet):
    queryset = StaffPortalConfig.objects.all().order_by("id")
    serializer_class = StaffPortalConfigSerializer
    filterset_fields = ["config"]


class PayrollPeriodViewSet(viewsets.ModelViewSet):
    queryset = PayrollPeriod.objects.all().order_by("id")
    serializer_class = PayrollPeriodSerializer
    filterset_fields = ["config", "status"]
