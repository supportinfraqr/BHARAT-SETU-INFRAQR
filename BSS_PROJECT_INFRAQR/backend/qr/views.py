from datetime import date, datetime

from django.conf import settings
from django.db import transaction
from django.db.models import Count
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .cards import card_response
from .models import (
    Attendance,
    Binding,
    Contractor,
    Employer,
    Notification,
    QRCode,
    ScanLog,
    Worker,
)
from .serializers import (
    AttendanceSerializer,
    BindingSerializer,
    ContractorSerializer,
    EmployerSerializer,
    NotificationSerializer,
    QRCodeSerializer,
    ScanLogSerializer,
    WorkerSerializer,
)
from .services import (
    create_qr_for_entity,
    geo_within,
    log_scan,
    notify,
    resolve_entity,
    verify_qr_reference,
    write_audit,
)

SUPER = "SUPER_ADMIN"
STAFF = "BSS_STAFF"
EMPLOYER = "EMPLOYER"
PRIMARY = "PRIMARY_CONTRACTOR"
SECONDARY = "SECONDARY_CONTRACTOR"


class ThrottledScan:
    pass


def role_has_access(user, required_roles):
    if user.role == SUPER:
        return True
    return user.role in required_roles


class EmployerListCreate(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not role_has_access(request.user, [SUPER, STAFF, EMPLOYER]):
            return Response({"Result": "Forbidden", "Message": "Permission denied"}, status=403)
        qs = Employer.objects.filter(is_active=True)
        return Response(EmployerSerializer(qs, many=True).data)

    def post(self, request):
        if not role_has_access(request.user, [SUPER, STAFF]):
            return Response({"Result": "Forbidden", "Message": "Permission denied"}, status=403)
        ser = EmployerSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        with transaction.atomic():
            obj = ser.save()
            create_qr_for_entity("EMPLOYER", obj.pk)
            write_audit(request, "EMPLOYER_CREATED", "EMPLOYER", obj.pk, new=str(obj.pk))
        return Response({"Result": "Success", "Data": ser.data}, status=201)


class ContractorListCreate(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not role_has_access(request.user, [SUPER, STAFF, EMPLOYER, PRIMARY, SECONDARY]):
            return Response({"Result": "Forbidden", "Message": "Permission denied"}, status=403)
        qs = Contractor.objects.filter(is_active=True)
        return Response(ContractorSerializer(qs, many=True).data)

    def post(self, request):
        if not role_has_access(request.user, [SUPER, STAFF, EMPLOYER]):
            return Response({"Result": "Forbidden", "Message": "Permission denied"}, status=403)
        ser = ContractorSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        with transaction.atomic():
            obj = ser.save()
            create_qr_for_entity("CONTRACTOR", obj.pk)
            write_audit(request, "CONTRACTOR_CREATED", "CONTRACTOR", obj.pk, new=str(obj.pk))
        return Response({"Result": "Success", "Data": ser.data}, status=201)


class WorkerListCreate(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not role_has_access(request.user, [SUPER, STAFF, EMPLOYER, PRIMARY, SECONDARY]):
            return Response({"Result": "Forbidden", "Message": "Permission denied"}, status=403)
        qs = Worker.objects.filter(is_active=True)
        return Response(WorkerSerializer(qs, many=True).data)

    def post(self, request):
        if not role_has_access(request.user, [SUPER, STAFF, EMPLOYER, PRIMARY, SECONDARY]):
            return Response({"Result": "Forbidden", "Message": "Permission denied"}, status=403)
        ser = WorkerSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        with transaction.atomic():
            obj = ser.save()
            create_qr_for_entity("WORKER", obj.pk)
            write_audit(request, "WORKER_CREATED", "WORKER", obj.pk, new=str(obj.pk))
        return Response({"Result": "Success", "Data": ser.data}, status=201)


class QRCodeView(APIView):
    """Return the QR for an entity, or scan/verify by reference."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        qr_reference = request.query_params.get("qr_reference") or request.query_params.get("qr")
        entity_type = request.query_params.get("entity_type")
        entity_id = request.query_params.get("entity_id")
        if qr_reference:
            qr = verify_qr_reference(qr_reference)
            if not qr:
                log_scan(request, None, scan_result="INVALID_QR")
                return Response({"Result": "Error", "Message": "Invalid QR reference"}, status=400)
            log_scan(request, qr, scan_result="LOOKUP")
            return Response({"Result": "Success", "Data": QRCodeSerializer(qr).data})
        if entity_type and entity_id:
            qr = QRCode.objects.filter(entity_type=entity_type.upper(), entity_id=entity_id).first()
            if not qr:
                return Response({"Result": "Error", "Message": "QR not found"}, status=404)
            return Response({"Result": "Success", "Data": QRCodeSerializer(qr).data})
        return Response({"Result": "Error", "Message": "Missing qr_reference or entity_type+entity_id"}, status=400)


class QRScanView(APIView):
    """Secure QR scan: verify reference, resolve worker, geo-verify, mark attendance."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        qr_reference = request.data.get("qr_reference") or request.data.get("qr")
        lat = request.data.get("latitude")
        lng = request.data.get("longitude")
        if not qr_reference:
            return Response({"Result": "Error", "Message": "qr_reference required"}, status=400)

        qr = verify_qr_reference(qr_reference)
        if not qr:
            log_scan(request, None, scan_result="INVALID_QR", lat=lat, lng=lng)
            write_audit(request, "SCAN_INVALID_QR", "QR", previous=qr_reference)
            return Response({"Result": "Error", "Message": "Invalid QR reference"}, status=400)

        entity = resolve_entity(qr)
        if entity is None:
            return Response({"Result": "Error", "Message": "No entity found for QR"}, status=404)

        location_status = "NA"
        if lat is None or lng is None:
            location_status = "LOCATION_UNAVAILABLE"

        # Worker scan -> attendance flow
        if qr.entity_type == "WORKER":
            worker = entity
            if not worker.is_active:
                log_scan(request, qr, worker=worker, scan_result="INACTIVE_WORKER", lat=lat, lng=lng)
                return Response({"Result": "Error", "Message": "Worker is not active"}, status=400)

            # Geo-verification against contractor's permitted location
            contractor = worker.contractor
            match = None
            if contractor and contractor.location_lat and lat is not None and lng is not None:
                match = geo_within(float(lat), float(lng), contractor.location_lat, contractor.location_lng)
                location_status = "MATCH" if match else "MISMATCH"
            elif contractor and contractor.location_lat:
                location_status = "LOCATION_UNAVAILABLE"
            elif contractor is None:
                location_status = "NO_CONTRACTOR_BOUND"

            att_status = "PRESENT" if match else (
                "LOCATION_MISMATCH" if location_status == "MISMATCH"
                else "VERIFICATION_FAILED" if location_status in ("LOCATION_UNAVAILABLE", "NA", "NO_CONTRACTOR_BOUND")
                else "PRESENT"
            )

            with transaction.atomic():
                att, _ = Attendance.objects.update_or_create(
                    worker=worker,
                    date=timezone.localdate(),
                    defaults={
                        "employer": worker.employer,
                        "contractor": worker.contractor,
                        "scan_user": request.user,
                        "qr": qr,
                        "time": timezone.localtime().time(),
                        "latitude": lat,
                        "longitude": lng,
                        "location_status": location_status,
                        "attendance_status": att_status,
                        "location_mismatch": location_status == "MISMATCH",
                    },
                )
                log_scan(request, qr, worker=worker, employer=worker.employer,
                         contractor=worker.contractor, location_status=location_status,
                         scan_result=att_status, lat=lat, lng=lng)

            if location_status == "MISMATCH":
                notify("EMPLOYER", "LOCATION_MISMATCH",
                       f"Worker {worker.full_name} scanned outside permitted location")
                write_audit(request, "SCAN_LOCATION_MISMATCH", "WORKER", worker.pk, previous=qr_reference)

            return Response({
                "Result": "Success",
                "Data": {
                    "worker": {"id": worker.pk, "full_name": worker.full_name, "worker_id": worker.worker_id},
                    "attendance": AttendanceSerializer(att).data,
                    "location_status": location_status,
                },
            })

        # Non-worker entity lookup
        log_scan(request, qr, scan_result="LOOKUP", lat=lat, lng=lng)
        return Response({"Result": "Success", "Data": {"qr": QRCodeSerializer(qr).data, "entity_type": qr.entity_type}})


class BindingCreate(APIView):
    """Create a binding request (employer<->contractor or worker<->contractor)."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        binding_type = request.data.get("binding_type")
        employer_id = request.data.get("employer")
        contractor_id = request.data.get("contractor")
        worker_id = request.data.get("worker")
        site_name = request.data.get("site_name", "")
        lat = request.data.get("latitude")
        lng = request.data.get("longitude")

        if binding_type == "EMPLOYER_CONTRACTOR":
            # One contractor <=> one employer rule
            contractor = Contractor.objects.filter(pk=contractor_id).first()
            if contractor and contractor.employer_id and str(contractor.employer_id) != str(employer_id):
                return Response({"Result": "Error", "Message": "Contractor already bound to another employer"}, status=409)
            binding = Binding.objects.create(
                binding_type=binding_type, employer_id=employer_id, contractor_id=contractor_id,
                status="PENDING", site_name=site_name,
            )
            write_audit(request, "BINDING_REQUEST_EMPLOYER_CONTRACTOR", "BINDING", binding.pk)
            notify("EMPLOYER", "CONTRACTOR_BINDING_REQUEST",
                   f"Contractor {contractor_id} requested binding")
            return Response({"Result": "Success", "Data": BindingSerializer(binding).data}, status=201)

        if binding_type == "WORKER_CONTRACTOR":
            worker = Worker.objects.filter(pk=worker_id).first()
            contractor = Contractor.objects.filter(pk=contractor_id).first()
            if not worker or not contractor:
                return Response({"Result": "Error", "Message": "Worker or contractor not found"}, status=404)
            # Geo-location based binding
            if contractor.location_lat and lat is not None and lng is not None:
                if not geo_within(float(lat), float(lng), contractor.location_lat, contractor.location_lng):
                    log_scan(request, None, worker=worker, scan_result="BINDING_LOCATION_MISMATCH", lat=lat, lng=lng)
                    return Response({"Result": "Error", "Message": "Binding requires permitted geo-location"}, status=400)
            elif contractor.location_lat:
                return Response({"Result": "Error", "Message": "Location unavailable for binding"}, status=400)
            if worker.contractor_id and worker.contractor_id != int(contractor_id):
                return Response({"Result": "Error", "Message": "Worker already bound to another contractor"}, status=409)
            binding = Binding.objects.create(
                binding_type=binding_type, employer_id=employer_id or contractor.employer_id,
                contractor_id=contractor_id, worker_id=worker_id, status="APPROVED",
                site_name=site_name,
            )
            worker.contractor = contractor
            worker.employer = contractor.employer
            worker.save(update_fields=["contractor", "employer"])
            write_audit(request, "WORKER_BOUND", "WORKER", worker.pk, new=str(contractor.pk))
            return Response({"Result": "Success", "Data": BindingSerializer(binding).data}, status=201)

        return Response({"Result": "Error", "Message": "Invalid binding_type"}, status=400)


class BindingApprove(APIView):
    """Employer approves/rejects a contractor binding request."""

    permission_classes = [IsAuthenticated]

    def post(self, request, binding_id):
        decision = request.data.get("decision", "APPROVE").upper()
        binding = Binding.objects.filter(pk=binding_id).first()
        if not binding:
            return Response({"Result": "Error", "Message": "Binding not found"}, status=404)
        if not role_has_access(request.user, [SUPER, EMPLOYER]):
            return Response({"Result": "Forbidden", "Message": "Permission denied"}, status=403)
        if decision == "APPROVE":
            binding.status = "ACTIVE"
            binding.started_at = timezone.now()
            if binding.binding_type == "EMPLOYER_CONTRACTOR" and binding.contractor_id:
                Contractor.objects.filter(pk=binding.contractor_id).update(employer=binding.employer)
            binding.save()
            write_audit(request, "BINDING_APPROVED", "BINDING", binding.pk, new="APPROVED")
            notify("PRIMARY_CONTRACTOR", "BINDING_APPROVED", "Your binding request was approved",
                   recipient_user=binding.approved_by)
        else:
            binding.status = "REJECTED"
            binding.save()
            write_audit(request, "BINDING_REJECTED", "BINDING", binding.pk, new="REJECTED")
        return Response({"Result": "Success", "Data": BindingSerializer(binding).data})


class ContractorReassign(APIView):
    """Reassign workers from one contractor to another, preserving history."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        from_contractor_id = request.data.get("from_contractor")
        to_contractor_id = request.data.get("to_contractor")
        if not role_has_access(request.user, [SUPER, EMPLOYER]):
            return Response({"Result": "Forbidden", "Message": "Permission denied"}, status=403)
        from_c = Contractor.objects.filter(pk=from_contractor_id).first()
        to_c = Contractor.objects.filter(pk=to_contractor_id).first()
        if not from_c or not to_c:
            return Response({"Result": "Error", "Message": "Contractor not found"}, status=404)
        with transaction.atomic():
            # End old bindings, preserve history
            Binding.objects.filter(binding_type="WORKER_CONTRACTOR", contractor=from_c, status="ACTIVE").update(
                status="REASSIGNED", ended_at=timezone.now()
            )
            workers = Worker.objects.filter(contractor=from_c, is_active=True)
            count = workers.update(contractor=to_c, employer=to_c.employer)
            Binding.objects.create(
                binding_type="WORKER_CONTRACTOR", employer=to_c.employer, contractor=to_c,
                status="ACTIVE", started_at=timezone.now(),
            )
            from_c.is_active = False
            from_c.save(update_fields=["is_active"])
            write_audit(request, "CONTRACTOR_REASSIGNED", "CONTRACTOR", from_c.pk,
                        previous=str(from_contractor_id), new=str(to_contractor_id))
            notify("EMPLOYER", "CONTRACTOR_REASSIGNED",
                   f"{count} workers reassigned from contractor {from_contractor_id} to {to_contractor_id}")
        return Response({"Result": "Success", "Message": f"Reassigned {count} workers"})


class ScanLogList(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not role_has_access(request.user, [SUPER, EMPLOYER, PRIMARY, SECONDARY]):
            return Response({"Result": "Forbidden", "Message": "Permission denied"}, status=403)
        qs = ScanLog.objects.all()
        worker = request.query_params.get("worker")
        if worker:
            qs = qs.filter(worker_id=worker)
        return Response(ScanLogSerializer(qs[:200], many=True).data)


class DashboardStats(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not role_has_access(request.user, [SUPER, EMPLOYER, PRIMARY, SECONDARY, STAFF]):
            return Response({"Result": "Forbidden", "Message": "Permission denied"}, status=403)
        today = timezone.localdate()
        return Response({
            "Result": "Success",
            "Data": {
                "total_workers": Worker.objects.count(),
                "total_scans": ScanLog.objects.count(),
                "active_sites": Contractor.objects.filter(is_active=True, site_name__gt="").values("site_name").distinct().count(),
                "scan_activity": {
                    "today": ScanLog.objects.filter(created_at__date=today).count(),
                    "this_week": ScanLog.objects.filter(created_at__date__gte=today - timezone.timedelta(days=7)).count(),
                    "this_month": ScanLog.objects.filter(created_at__month=today.month, created_at__year=today.year).count(),
                },
            },
        })


class WorkerCardView(APIView):
    """Render a worker ID card (PNG/PDF) with the static QR. QR is just one feature of this module."""

    permission_classes = [IsAuthenticated]

    def get(self, request, worker_id):
        worker = Worker.objects.filter(pk=worker_id, is_active=True).first()
        if not worker:
            return Response({"Result": "Error", "Message": "Worker not found"}, status=404)
        qr = QRCode.objects.filter(entity_type="WORKER", entity_id=worker.pk).first()
        if not qr:
            qr = create_qr_for_entity("WORKER", worker.pk)
        fmt = request.query_params.get("fmt", "png").lower()
        if fmt not in ("png", "pdf"):
            fmt = "png"
        return card_response(worker, qr.qr_reference, fmt)


class UserQRView(APIView):
    """Generate a QR code for the logged-in user (identity QR)."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        login_id = getattr(user, "legacy_login_id", None) or user.pk
        identity = f"BSS-USER|{user.username}|{login_id}"
        from .cards import qr_png_bytes
        return HttpResponse(qr_png_bytes(identity), content_type="image/png")


class NotificationList(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = Notification.objects.filter(recipient_role=request.user.role).order_by("-created_at")[:50]
        return Response(NotificationSerializer(qs, many=True).data)


# ---------------------------------------------------------------------------
# QR Management System (employer approvals + plans)
# ---------------------------------------------------------------------------

PLAN_FEATURES = {
    "SILVER": ["Static QR security layer", "Worker record lookup", "Basic scan logging", "Date & time capture", "BharatShramSetu integration"],
    "GOLD": ["All Silver features", "Automated QR scan counting", "Scanning-user capture", "OpenStreetMap scan location", "Role-based access permissions"],
    "PLATINUM": ["All Gold features", "Advanced audit reporting", "Site / contractor level views", "Exception monitoring", "Enhanced admin controls"],
}


class EmployerListAdmin(APIView):
    """List all employers (admin). Optional ?status=PENDING|APPROVED|REJECTED."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not role_has_access(request.user, [SUPER, STAFF]):
            return Response({"Result": "Forbidden", "Message": "Permission denied"}, status=403)
        qs = Employer.objects.all().order_by("approval_status", "-created_at")
        status_filter = request.query_params.get("status")
        if status_filter:
            qs = qs.filter(approval_status=status_filter.upper())
        data = []
        for e in qs:
            qr = QRCode.objects.filter(entity_type="EMPLOYER", entity_id=e.pk).first()
            data.append({
                "id": e.pk,
                "name": e.name,
                "email": e.email,
                "contact_person": e.contact_person,
                "contact_mobile": e.contact_mobile,
                "approval_status": e.approval_status,
                "plan_type": e.plan_type,
                "plan_expiry": e.plan_expiry,
                "qr_reference": qr.qr_reference if qr else None,
                "created_at": e.created_at,
            })
        return Response({"Result": "Success", "Data": data})


class EmployerApprove(APIView):
    """Admin approves/rejects a pending employer."""

    permission_classes = [IsAuthenticated]

    def post(self, request, employer_id):
        if not role_has_access(request.user, [SUPER, STAFF]):
            return Response({"Result": "Forbidden", "Message": "Permission denied"}, status=403)
        emp = Employer.objects.filter(pk=employer_id).first()
        if not emp:
            return Response({"Result": "Error", "Message": "Employer not found"}, status=404)
        decision = request.data.get("decision", "APPROVE").upper()
        if decision == "APPROVE":
            emp.approval_status = "APPROVED"
            emp.is_active = True
            emp.approved_by = request.user
            emp.approved_at = timezone.now()
            emp.save()
            write_audit(request, "EMPLOYER_APPROVED", "EMPLOYER", emp.pk, previous="PENDING", new="APPROVED")
            notify("EMPLOYER", "EMPLOYER_APPROVED", f"Your employer account '{emp.name}' was approved.")
        elif decision == "REJECT":
            emp.approval_status = "REJECTED"
            emp.is_active = False
            emp.save()
            write_audit(request, "EMPLOYER_REJECTED", "EMPLOYER", emp.pk, previous="PENDING", new="REJECTED")
        return Response({"Result": "Success", "Data": EmployerSerializer(emp).data})


class PlanList(APIView):
    """List available plans with features."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        plans = [{"plan": k, "features": v} for k, v in PLAN_FEATURES.items()]
        return Response({"Result": "Success", "Data": plans})


class EmployerAttachPlan(APIView):
    """Employer attaches a plan (SILVER/GOLD/PLATINUM) to their account."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        plan = (request.data.get("plan_type") or "").upper()
        if plan not in ("SILVER", "GOLD", "PLATINUM"):
            return Response({"Result": "Error", "Message": "Invalid plan. Choose SILVER, GOLD or PLATINUM."}, status=400)
        # Employer can attach a plan to their own account; admin to any.
        emp = None
        if role_has_access(request.user, [SUPER, STAFF]):
            employer_id = request.data.get("employer_id")
            emp = Employer.objects.filter(pk=employer_id).first() if employer_id else Employer.objects.filter(email=request.user.email).first()
        else:
            emp = Employer.objects.filter(email=request.user.email).first()
            if not emp:
                emp = Employer.objects.filter(contact_mobile=request.user.mobile).first()
        if not emp:
            return Response({"Result": "Error", "Message": "Employer account not found. Ensure the employer is approved first."}, status=400)
        if emp.approval_status != "APPROVED":
            return Response({"Result": "Error", "Message": "Employer must be approved before attaching a plan."}, status=400)
        emp.plan_type = plan
        # 30-day plan expiry
        emp.plan_expiry = timezone.now() + timezone.timedelta(days=30)
        emp.save()
        write_audit(request, "EMPLOYER_PLAN_ATTACHED", "EMPLOYER", emp.pk, previous=plan, new=f"{plan} 30d")
        return Response({"Result": "Success", "Data": EmployerSerializer(emp).data})


class MyPlanView(APIView):
    """Logged-in employer sees their own plan + QR."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        emp = Employer.objects.filter(email=request.user.email).first()
        if not emp:
            return Response({"Result": "Error", "Message": "No employer account linked"}, status=404)
        qr = QRCode.objects.filter(entity_type="EMPLOYER", entity_id=emp.pk).first()
        return Response({
            "Result": "Success",
            "Data": {
                "employer": EmployerSerializer(emp).data,
                "qr_reference": qr.qr_reference if qr else None,
                "plan_features": PLAN_FEATURES.get(emp.plan_type, []),
            },
        })
