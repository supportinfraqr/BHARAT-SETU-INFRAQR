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
    SavedLocation,
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
WORKER = "WORKER"


def resolve_scope(user):
    """Return (employer_id, contractor_id, role) scoping the user's view of the hierarchy.

    - Admin/Staff: no scope (see everything)
    - Employer: their own employer_id only (own contractors + workers)
    - Contractor: their own contractor_id only (own workers)
    - Worker: their own employer_id + contractor_id (self only)
    """
    if user.role == SUPER or user.role == STAFF:
        return (None, None, user.role)
    if user.role == EMPLOYER:
        emp_id = user.employer_id
        if not emp_id:
            # Fallback: link by email to the Employer record
            emp = Employer.objects.filter(email=user.email).first()
            if emp:
                emp_id = emp.pk
                user.employer_id = emp.pk
                try:
                    user.save(update_fields=["employer_id"])
                except Exception:
                    pass
        return (emp_id, None, user.role)
    if user.role in (PRIMARY, SECONDARY):
        con_id = user.contractor_id
        if not con_id:
            con = Contractor.objects.filter(contact_mobile=user.mobile).first()
            if con:
                con_id = con.pk
                user.contractor_id = con.pk
                try:
                    user.save(update_fields=["contractor_id"])
                except Exception:
                    pass
        return (None, con_id, user.role)
    if user.role == WORKER:
        worker = Worker.objects.filter(legacy_employee_code=user.username).first()
        if not worker:
            worker = Worker.objects.filter(mobile=user.mobile).first()
        if worker:
            return (worker.employer_id, worker.contractor_id, user.role)
        return (None, None, user.role)
    return (None, None, user.role)


def _scanner_contractor(request):
    """Return (contractor_id, role) for the scanning user if they are a contractor, else (None, role)."""
    user = request.user
    if user.role in (PRIMARY, SECONDARY):
        con_id = user.contractor_id
        if not con_id:
            con = Contractor.objects.filter(contact_mobile=user.mobile).first()
            if con:
                con_id = con.pk
        return (con_id, user.role)
    return (None, getattr(user, "role", ""))


def role_has_access(user, required_roles):
    if user.role == SUPER:
        return True
    return user.role in required_roles


class EmployerListCreate(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not role_has_access(request.user, [SUPER, STAFF, EMPLOYER]):
            return Response({"Result": "Forbidden", "Message": "Permission denied"}, status=403)
        emp_id, con_id, role = resolve_scope(request.user)
        qs = Employer.objects.filter(is_active=True)
        if role == EMPLOYER and emp_id:
            # Employer sees only their own record
            qs = qs.filter(pk=emp_id)
        elif role == EMPLOYER and not emp_id:
            # Employer not linked yet — show nothing
            qs = qs.none()
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
        emp_id, con_id, role = resolve_scope(request.user)
        qs = Contractor.objects.filter(is_active=True)
        if role == EMPLOYER and emp_id:
            # Employer sees only their own contractors
            qs = qs.filter(employer_id=emp_id)
        elif role in (PRIMARY, SECONDARY) and con_id:
            # Contractor sees only themselves
            qs = qs.filter(pk=con_id)
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
        emp_id, con_id, role = resolve_scope(request.user)
        qs = Worker.objects.filter(is_active=True)
        if role == EMPLOYER and emp_id:
            # Employer sees only workers in their own tree
            qs = qs.filter(employer_id=emp_id)
        elif role in (PRIMARY, SECONDARY) and con_id:
            qs = qs.filter(contractor_id=con_id)
        return Response(WorkerSerializer(qs, many=True).data)

    def post(self, request):
        if not role_has_access(request.user, [SUPER, STAFF, EMPLOYER, PRIMARY, SECONDARY]):
            return Response({"Result": "Forbidden", "Message": "Permission denied"}, status=403)
        emp_id, con_id, role = resolve_scope(request.user)
        ser = WorkerSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        # Scope validation: ensure the worker falls within the caller's hierarchy
        worker_emp_id = request.data.get("employer")
        worker_con_id = request.data.get("contractor")
        if role == EMPLOYER and emp_id:
            if worker_emp_id and str(worker_emp_id) != str(emp_id):
                return Response({"Result": "Error", "Message": "Cannot create worker outside your hierarchy"}, status=403)
            if worker_con_id:
                if not Contractor.objects.filter(pk=worker_con_id, employer_id=emp_id).exists():
                    return Response({"Result": "Error", "Message": "Contractor not in your hierarchy"}, status=403)
        elif role in (PRIMARY, SECONDARY) and con_id:
            if worker_con_id and str(worker_con_id) != str(con_id):
                return Response({"Result": "Error", "Message": "Cannot create worker outside your contractor"}, status=403)
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
            data = QRCodeSerializer(qr).data
            # Attach scoped entity details so any role can show scan-info popup
            entity = resolve_entity(qr)
            emp_id, con_id, role = resolve_scope(request.user)
            if qr.entity_type == "EMPLOYER" and entity:
                data["entity_details"] = {
                    "id": entity.pk,
                    "name": entity.name,
                    "contact_person": entity.contact_person,
                    "contact_mobile": entity.contact_mobile,
                    "email": entity.email,
                    "industry": entity.industry,
                    "city": entity.city,
                }
                # If scanner is a contractor, attach binding status
                con_id2, role2 = _scanner_contractor(request)
                if con_id2:
                    contractor = Contractor.objects.filter(pk=con_id2).first()
                    if contractor and contractor.employer_id == entity.pk:
                        data["binding_status"] = "ALREADY_BOUND"
                    elif contractor and contractor.employer_id:
                        data["binding_status"] = "BOUND_ELSEWHERE"
                    else:
                        pending = Binding.objects.filter(
                            binding_type="EMPLOYER_CONTRACTOR", employer=entity, contractor=contractor, status="PENDING"
                        ).first()
                        data["binding_status"] = "PENDING" if pending else "NOT_REQUESTED"
            elif qr.entity_type == "CONTRACTOR" and entity:
                full = (role in (SUPER, STAFF, EMPLOYER) and (role != EMPLOYER or entity.employer_id == emp_id))
                data["entity_details"] = {
                    "id": entity.pk,
                    "name": entity.name,
                    "contact_mobile": entity.contact_mobile,
                    "site_name": entity.site_name,
                    "is_primary": entity.is_primary,
                } if full or role in (PRIMARY, SECONDARY) and entity.pk == con_id else {
                    "id": entity.pk,
                    "name": entity.name,
                    "site_name": entity.site_name,
                }
                # If scanner is a worker, attach binding status (worker <-> contractor)
                if role == WORKER:
                    worker = Worker.objects.filter(legacy_employee_code=request.user.username).first()
                    if not worker:
                        worker = Worker.objects.filter(mobile=request.user.mobile).first()
                    if worker:
                        if worker.contractor_id == entity.pk:
                            data["binding_status"] = "ALREADY_BOUND"
                        elif worker.contractor_id:
                            data["binding_status"] = "BOUND_ELSEWHERE"
                        else:
                            pending = Binding.objects.filter(
                                binding_type="WORKER_CONTRACTOR", contractor=entity, worker=worker, status="PENDING"
                            ).first()
                            data["binding_status"] = "PENDING" if pending else "NOT_REQUESTED"
            elif qr.entity_type == "WORKER" and entity:
                full = (role in (SUPER, STAFF) or (role == EMPLOYER and entity.employer_id == emp_id)
                        or (role in (PRIMARY, SECONDARY) and entity.contractor_id == con_id)
                        or (role == WORKER and entity.pk == (Worker.objects.filter(
                            legacy_employee_code=request.user.username).values_list("pk", flat=True).first())))
                data["entity_details"] = {
                    "id": entity.pk,
                    "full_name": entity.full_name,
                    "worker_id": entity.worker_id,
                    "mobile": entity.mobile,
                    "designation": entity.designation,
                } if full else {
                    "id": entity.pk,
                    "full_name": entity.full_name,
                    "worker_id": entity.worker_id,
                }
            return Response({"Result": "Success", "Data": data})
        if entity_type and entity_id:
            qr = QRCode.objects.filter(entity_type=entity_type.upper(), entity_id=entity_id).first()
            if not qr:
                return Response({"Result": "Error", "Message": "QR not found"}, status=404)
            return Response({"Result": "Success", "Data": QRCodeSerializer(qr).data})
        return Response({"Result": "Error", "Message": "Missing qr_reference or entity_type+entity_id"}, status=400)


class ReverseGeocodeView(APIView):
    """Reverse geocode live coordinates to a human-readable location via OpenStreetMap."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        lat = request.query_params.get("lat")
        lng = request.query_params.get("lng")
        if not lat or not lng:
            return Response({"Result": "Error", "Message": "lat and lng required"}, status=400)
        from .geocode import reverse_geocode
        result = reverse_geocode(float(lat), float(lng))
        if not result:
            return Response({"Result": "Error", "Message": "Could not resolve location"}, status=404)
        return Response({"Result": "Success", "Data": result})


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

        emp_id, con_id, scanner_role = resolve_scope(request.user)

        # Worker QR scan
        if qr.entity_type == "WORKER":
            worker = entity
            if not worker.is_active:
                log_scan(request, qr, worker=worker, scan_result="INACTIVE_WORKER", lat=lat, lng=lng)
                return Response({"Result": "Error", "Message": "Worker is not active"}, status=400)

            # Employer scans a worker QR -> hierarchy-scoped info (no attendance)
            if scanner_role == EMPLOYER:
                if emp_id and worker.employer_id and worker.employer_id != emp_id:
                    log_scan(request, qr, worker=worker, scan_result="HIERARCHY_DENIED", lat=lat, lng=lng)
                    return Response({"Result": "Error", "Message": "This worker is not under your hierarchy"}, status=403)
                return Response({
                    "Result": "Success",
                    "Data": {
                        "entity_type": "WORKER",
                        "action": "view_info",
                        "worker": WorkerSerializer(worker).data,
                    },
                })

            # Contractor scans a worker QR -> full info if worker is under their contractor
            if scanner_role in (PRIMARY, SECONDARY):
                if con_id and worker.contractor_id and worker.contractor_id != con_id:
                    log_scan(request, qr, worker=worker, scan_result="HIERARCHY_DENIED", lat=lat, lng=lng)
                    return Response({"Result": "Error", "Message": "This worker is not under your contractor"}, status=403)
                return Response({
                    "Result": "Success",
                    "Data": {
                        "entity_type": "WORKER",
                        "action": "view_info",
                        "worker": WorkerSerializer(worker).data,
                    },
                })

            # Worker scans a worker QR -> basic info (same level), no attendance
            if scanner_role == WORKER:
                return Response({
                    "Result": "Success",
                    "Data": {
                        "entity_type": "WORKER",
                        "action": "view_info",
                        "worker": WorkerSerializer(worker).data,
                    },
                })

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

            resolved_location = None
            if lat is not None and lng is not None:
                try:
                    from .geocode import reverse_geocode
                    resolved_location = reverse_geocode(float(lat), float(lng))
                except Exception:
                    resolved_location = None

            return Response({
                "Result": "Success",
                "Data": {
                    "worker": {"id": worker.pk, "full_name": worker.full_name, "worker_id": worker.worker_id},
                    "attendance": AttendanceSerializer(att).data,
                    "location_status": location_status,
                    "resolved_location": resolved_location,
                },
            })

        # Contractor QR scanned -> hierarchy-scoped info
        if qr.entity_type == "CONTRACTOR":
            contractor = entity
            log_scan(request, qr, scan_result="CONTRACTOR_SCAN", lat=lat, lng=lng)
            if scanner_role == EMPLOYER:
                if emp_id and contractor.employer_id and contractor.employer_id != emp_id:
                    return Response({"Result": "Error", "Message": "This contractor is not under your hierarchy"}, status=403)
                return Response({
                    "Result": "Success",
                    "Data": {
                        "entity_type": "CONTRACTOR",
                        "action": "view_info",
                        "contractor": ContractorSerializer(contractor).data,
                    },
                })
            if scanner_role in (PRIMARY, SECONDARY):
                if con_id and contractor.pk != con_id:
                    # Contractor scanning another contractor -> basic info only
                    return Response({
                        "Result": "Success",
                        "Data": {
                            "entity_type": "CONTRACTOR",
                            "action": "view_info",
                            "contractor": {"id": contractor.pk, "name": contractor.name, "site_name": contractor.site_name},
                        },
                    })
                return Response({
                    "Result": "Success",
                    "Data": {
                        "entity_type": "CONTRACTOR",
                        "action": "view_info",
                        "contractor": ContractorSerializer(contractor).data,
                    },
                })
            if scanner_role == WORKER:
                # Worker scanning a contractor -> info + binding request
                worker = Worker.objects.filter(legacy_employee_code=request.user.username).first()
                if not worker:
                    worker = Worker.objects.filter(mobile=request.user.mobile).first()
                basic = {
                    "id": contractor.pk,
                    "name": contractor.name,
                    "contact_mobile": contractor.contact_mobile,
                    "site_name": contractor.site_name,
                    "is_primary": contractor.is_primary,
                }
                if not worker:
                    return Response({
                        "Result": "Success",
                        "Data": {"entity_type": "CONTRACTOR", "contractor": basic, "action": "worker_login_required"},
                    })
                # Worker already bound to this contractor
                if worker.contractor_id == contractor.pk:
                    return Response({
                        "Result": "Success",
                        "Data": {"entity_type": "CONTRACTOR", "contractor": basic, "action": "already_bound", "can_unbind": True},
                    })
                # Worker bound to another contractor
                if worker.contractor_id:
                    return Response({
                        "Result": "Success",
                        "Data": {"entity_type": "CONTRACTOR", "contractor": basic, "action": "bound_elsewhere", "can_request": True},
                    })
                # Unbound worker -> create PENDING request (avoid duplicates)
                existing = Binding.objects.filter(
                    binding_type="WORKER_CONTRACTOR", contractor=contractor, worker=worker, status="PENDING"
                ).first()
                if existing:
                    return Response({
                        "Result": "Success",
                        "Data": {"entity_type": "CONTRACTOR", "contractor": basic, "action": "request_pending", "request_id": existing.pk},
                    })
                binding = Binding.objects.create(
                    binding_type="WORKER_CONTRACTOR", employer=contractor.employer,
                    contractor=contractor, worker=worker, status="PENDING",
                )
                write_audit(request, "BINDING_REQUEST_WORKER_CONTRACTOR", "BINDING", binding.pk)
                notify("PRIMARY_CONTRACTOR", "WORKER_BINDING_REQUEST",
                       f"Worker {worker.full_name} requested to bind with {contractor.name}")
                return Response({
                    "Result": "Success",
                    "Data": {"entity_type": "CONTRACTOR", "contractor": basic, "action": "binding_requested"},
                })
            # Admin/staff -> full info
            return Response({
                "Result": "Success",
                "Data": {
                    "entity_type": "CONTRACTOR",
                    "action": "view_info",
                    "contractor": ContractorSerializer(contractor).data,
                },
            })

        # Employer QR scanned by a contractor -> basic info + bind/unbind option
        if qr.entity_type == "EMPLOYER":
            employer = entity
            con_id, role = _scanner_contractor(request)
            log_scan(request, qr, scan_result="EMPLOYER_SCAN", lat=lat, lng=lng)
            basic = {
                "id": employer.pk,
                "name": employer.name,
                "contact_person": employer.contact_person,
                "contact_mobile": employer.contact_mobile,
                "email": employer.email,
                "industry": employer.industry,
                "state": employer.state,
                "city": employer.city,
            }
            if not con_id:
                return Response({
                    "Result": "Success",
                    "Data": {"entity_type": "EMPLOYER", "employer": basic, "action": "contractor_login_required"},
                })
            contractor = Contractor.objects.filter(pk=con_id).first()
            # If contractor is bound to THIS employer -> option to unbind
            if contractor and contractor.employer_id == employer.pk:
                return Response({
                    "Result": "Success",
                    "Data": {"entity_type": "EMPLOYER", "employer": basic, "action": "already_bound", "can_unbind": True},
                })
            # If bound to another employer -> show basic info + option to request binding here
            if contractor and contractor.employer_id:
                return Response({
                    "Result": "Success",
                    "Data": {
                        "entity_type": "EMPLOYER",
                        "employer": basic,
                        "action": "bound_elsewhere",
                        "can_request": True,
                        "current_employer_id": contractor.employer_id,
                    },
                })
            # Unbound contractor -> create PENDING request (avoid duplicates)
            existing = Binding.objects.filter(
                binding_type="EMPLOYER_CONTRACTOR", employer=employer, contractor=contractor, status="PENDING"
            ).first()
            if existing:
                return Response({
                    "Result": "Success",
                    "Data": {"entity_type": "EMPLOYER", "employer": basic, "action": "request_pending", "request_id": existing.pk},
                })
            binding = Binding.objects.create(
                binding_type="EMPLOYER_CONTRACTOR", employer=employer, contractor=contractor,
                status="PENDING",
            )
            write_audit(request, "BINDING_REQUEST_EMPLOYER_CONTRACTOR", "BINDING", binding.pk)
            notify("EMPLOYER", "CONTRACTOR_BINDING_REQUEST",
                   f"Contractor {contractor.name} requested to bind with {employer.name}")
            return Response({
                "Result": "Success",
                "Data": {"entity_type": "EMPLOYER", "employer": basic, "action": "binding_requested"},
            })

        # Non-worker entity lookup
        log_scan(request, qr, scan_result="LOOKUP", lat=lat, lng=lng)
        return Response({"Result": "Success", "Data": {"qr": QRCodeSerializer(qr).data, "entity_type": qr.entity_type}})


class BindingCreate(APIView):
    """Create a binding request (employer<->contractor or worker<->contractor)."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not role_has_access(request.user, [SUPER, STAFF, EMPLOYER, PRIMARY, SECONDARY]):
            return Response({"Result": "Forbidden", "Message": "Permission denied"}, status=403)
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


class BindingList(APIView):
    """List binding requests scoped to the logged-in employer or contractor."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not role_has_access(request.user, [SUPER, STAFF, EMPLOYER, PRIMARY, SECONDARY, WORKER]):
            return Response({"Result": "Forbidden", "Message": "Permission denied"}, status=403)
        emp_id, con_id, role = resolve_scope(request.user)
        qs = Binding.objects.all().order_by("-created_at")
        if role == EMPLOYER and emp_id:
            qs = qs.filter(employer_id=emp_id)
        elif role in (PRIMARY, SECONDARY) and con_id:
            qs = qs.filter(contractor_id=con_id)
        elif role == WORKER:
            # Worker sees only bindings that include them
            worker = Worker.objects.filter(legacy_employee_code=request.user.username).first()
            if not worker:
                worker = Worker.objects.filter(mobile=request.user.mobile).first()
            if worker:
                qs = qs.filter(worker_id=worker.pk)
            else:
                qs = qs.none()
        data = []
        for b in qs:
            emp = Employer.objects.filter(pk=b.employer_id).first()
            con = Contractor.objects.filter(pk=b.contractor_id).first()
            worker = Worker.objects.filter(pk=b.worker_id).first()
            data.append({
                "id": b.pk,
                "binding_type": b.binding_type,
                "status": b.status,
                "employer": {"id": b.employer_id, "name": emp.name if emp else None},
                "contractor": {"id": b.contractor_id, "name": con.name if con else None},
                "worker": {"id": b.worker_id, "name": worker.full_name if worker else None},
                "site_name": b.site_name,
                "created_at": b.created_at,
                "started_at": b.started_at,
                "ended_at": b.ended_at,
            })
        return Response({"Result": "Success", "Data": data})


class BindingApprove(APIView):
    """Employer approves/rejects a contractor binding request, or contractor approves a worker binding request."""

    permission_classes = [IsAuthenticated]

    def post(self, request, binding_id):
        decision = request.data.get("decision", "APPROVE").upper()
        binding = Binding.objects.filter(pk=binding_id).first()
        if not binding:
            return Response({"Result": "Error", "Message": "Binding not found"}, status=404)
        emp_id, con_id, role = resolve_scope(request.user)
        is_admin = role in (SUPER, STAFF)
        can_approve = is_admin
        # Employer approves EMPLOYER_CONTRACTOR bindings in their tree
        if role == EMPLOYER and binding.binding_type == "EMPLOYER_CONTRACTOR":
            can_approve = True
            if emp_id and binding.employer_id and binding.employer_id != emp_id:
                return Response({"Result": "Error", "Message": "Binding not in your hierarchy"}, status=403)
        # Contractor approves WORKER_CONTRACTOR bindings for their contractor
        if role in (PRIMARY, SECONDARY) and binding.binding_type == "WORKER_CONTRACTOR":
            can_approve = True
            if con_id and binding.contractor_id != con_id:
                return Response({"Result": "Error", "Message": "Binding not for your contractor"}, status=403)
        if not can_approve:
            return Response({"Result": "Forbidden", "Message": "Permission denied"}, status=403)
        if decision == "APPROVE":
            binding.status = "ACTIVE"
            binding.started_at = timezone.now()
            binding.approved_by = request.user
            if binding.binding_type == "EMPLOYER_CONTRACTOR" and binding.contractor_id:
                Contractor.objects.filter(pk=binding.contractor_id).update(employer=binding.employer)
            if binding.binding_type == "WORKER_CONTRACTOR" and binding.worker_id:
                worker = Worker.objects.filter(pk=binding.worker_id).first()
                contractor = Contractor.objects.filter(pk=binding.contractor_id).first()
                if worker and contractor:
                    worker.contractor = contractor
                    worker.employer = contractor.employer
                    worker.save(update_fields=["contractor", "employer"])
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
        # Hierarchy check: employer can only reassign within their own hierarchy
        if request.user.role == EMPLOYER:
            emp_id, _, _ = resolve_scope(request.user)
            if emp_id:
                if from_c.employer_id != emp_id:
                    return Response({"Result": "Error", "Message": "Source contractor not in your hierarchy"}, status=403)
                if to_c.employer_id != emp_id:
                    return Response({"Result": "Error", "Message": "Target contractor not in your hierarchy"}, status=403)
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


class WorkerUnbind(APIView):
    """Unbind a worker from their contractor (end active binding, unlink worker)."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        worker_id = request.data.get("worker")
        if not role_has_access(request.user, [SUPER, STAFF, EMPLOYER, PRIMARY, SECONDARY]):
            return Response({"Result": "Forbidden", "Message": "Permission denied"}, status=403)
        worker = Worker.objects.filter(pk=worker_id).first()
        if not worker:
            return Response({"Result": "Error", "Message": "Worker not found"}, status=404)
        # Hierarchy check
        emp_id, con_id, role = resolve_scope(request.user)
        if role == EMPLOYER and emp_id and worker.employer_id != emp_id:
            return Response({"Result": "Error", "Message": "Worker not in your hierarchy"}, status=403)
        if role in (PRIMARY, SECONDARY) and con_id and worker.contractor_id != con_id:
            return Response({"Result": "Error", "Message": "Worker not under your contractor"}, status=403)
        if role == WORKER and emp_id is not None and worker.employer_id != emp_id:
            return Response({"Result": "Error", "Message": "Cannot unbind another worker"}, status=403)
        with transaction.atomic():
            binding = Binding.objects.filter(
                binding_type="WORKER_CONTRACTOR", worker=worker, status="ACTIVE"
            ).first()
            if binding:
                binding.status = "ENDED"
                binding.ended_at = timezone.now()
                binding.save()
            worker.contractor = None
            worker.employer = None
            worker.save(update_fields=["contractor", "employer"])
            write_audit(request, "WORKER_UNBOUND", "WORKER", worker.pk,
                        previous=str(binding.contractor_id) if binding else "", new="")
        return Response({"Result": "Success", "Message": f"Worker {worker.full_name} unbound"})


class ScanLogList(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not role_has_access(request.user, [SUPER, STAFF, EMPLOYER, PRIMARY, SECONDARY]):
            return Response({"Result": "Forbidden", "Message": "Permission denied"}, status=403)
        emp_id, con_id, role = resolve_scope(request.user)
        qs = ScanLog.objects.all()
        if role == EMPLOYER and emp_id:
            qs = qs.filter(employer_id=emp_id)
        elif role in (PRIMARY, SECONDARY) and con_id:
            qs = qs.filter(contractor_id=con_id)
        worker = request.query_params.get("worker")
        if worker:
            qs = qs.filter(worker_id=worker)
        return Response(ScanLogSerializer(qs[:200], many=True).data)


class DashboardStats(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not role_has_access(request.user, [SUPER, STAFF, EMPLOYER, PRIMARY, SECONDARY]):
            return Response({"Result": "Forbidden", "Message": "Permission denied"}, status=403)
        emp_id, con_id, role = resolve_scope(request.user)
        today = timezone.localdate()
        # Base querysets scoped by role
        workers = Worker.objects.filter(is_active=True)
        scans = ScanLog.objects.all()
        contractors = Contractor.objects.filter(is_active=True, site_name__gt="")
        if role == EMPLOYER and emp_id:
            workers = workers.filter(employer_id=emp_id)
            scans = scans.filter(employer_id=emp_id)
            contractors = contractors.filter(employer_id=emp_id)
        elif role in (PRIMARY, SECONDARY) and con_id:
            workers = workers.filter(contractor_id=con_id)
            scans = scans.filter(contractor_id=con_id)
            contractors = contractors.filter(pk=con_id)
        return Response({
            "Result": "Success",
            "Data": {
                "total_workers": workers.count(),
                "total_scans": scans.count(),
                "active_sites": contractors.values("site_name").distinct().count(),
                "scan_activity": {
                    "today": scans.filter(created_at__date=today).count(),
                    "this_week": scans.filter(created_at__date__gte=today - timezone.timedelta(days=7)).count(),
                    "this_month": scans.filter(created_at__month=today.month, created_at__year=today.year).count(),
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
        from .cards import qr_png_bytes
        # Resolve the user's entity QR so the identity card is scannable
        qr_ref = None
        if user.role in (EMPLOYER, PRIMARY, SECONDARY, WORKER):
            if user.role == EMPLOYER:
                emp_id = user.employer_id or resolve_scope(user)[0]
                if emp_id:
                    qr_obj = QRCode.objects.filter(entity_type="EMPLOYER", entity_id=emp_id).first()
                    if qr_obj:
                        qr_ref = qr_obj.qr_reference
            elif user.role in (PRIMARY, SECONDARY):
                con_id = user.contractor_id or resolve_scope(user)[1]
                if con_id:
                    qr_obj = QRCode.objects.filter(entity_type="CONTRACTOR", entity_id=con_id).first()
                    if qr_obj:
                        qr_ref = qr_obj.qr_reference
            elif user.role == WORKER:
                worker = Worker.objects.filter(legacy_employee_code=user.username).first()
                if not worker:
                    worker = Worker.objects.filter(mobile=user.mobile).first()
                if worker:
                    qr_obj = QRCode.objects.filter(entity_type="WORKER", entity_id=worker.pk).first()
                    if qr_obj:
                        qr_ref = qr_obj.qr_reference
        if qr_ref:
            return HttpResponse(qr_png_bytes(qr_ref), content_type="image/png")
        # Fallback: plain identity QR (not scannable, informational only)
        login_id = getattr(user, "legacy_login_id", None) or user.pk
        identity = f"BSS-USER|{user.username}|{login_id}"
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


class EmployerTreeView(APIView):
    """Admin sees full employer tree: employer details + contractors + workers."""

    permission_classes = [IsAuthenticated]

    def get(self, request, employer_id):
        if not role_has_access(request.user, [SUPER, STAFF]):
            return Response({"Result": "Forbidden", "Message": "Permission denied"}, status=403)
        emp = Employer.objects.filter(pk=employer_id).first()
        if not emp:
            return Response({"Result": "Error", "Message": "Employer not found"}, status=404)
        qr = QRCode.objects.filter(entity_type="EMPLOYER", entity_id=emp.pk).first()
        contractors = Contractor.objects.filter(employer_id=emp.pk, is_active=True).order_by("name")
        tree_contractors = []
        for c in contractors:
            workers = Worker.objects.filter(contractor_id=c.pk, is_active=True).order_by("full_name")
            c_qr = QRCode.objects.filter(entity_type="CONTRACTOR", entity_id=c.pk).first()
            tree_contractors.append({
                "id": c.pk,
                "name": c.name,
                "contact_mobile": c.contact_mobile,
                "site_name": c.site_name,
                "location_lat": c.location_lat,
                "location_lng": c.location_lng,
                "location_address": c.location_address,
                "is_primary": c.is_primary,
                "qr_reference": c_qr.qr_reference if c_qr else None,
                "workers": [
                    {
                        "id": w.pk,
                        "full_name": w.full_name,
                        "worker_id": w.worker_id,
                        "mobile": w.mobile,
                        "designation": w.designation,
                        "is_active": w.is_active,
                    } for w in workers
                ],
            })
        return Response({
            "Result": "Success",
            "Data": {
                "employer": EmployerSerializer(emp).data,
                "qr_reference": qr.qr_reference if qr else None,
                "contractors": tree_contractors,
                "total_contractors": len(tree_contractors),
                "total_workers": sum(len(c["workers"]) for c in tree_contractors),
            },
        })


class ContractorTreeView(APIView):
    """Admin sees full contractor tree: contractor details + workers."""

    permission_classes = [IsAuthenticated]

    def get(self, request, contractor_id):
        if not role_has_access(request.user, [SUPER, STAFF]):
            return Response({"Result": "Forbidden", "Message": "Permission denied"}, status=403)
        con = Contractor.objects.filter(pk=contractor_id).first()
        if not con:
            return Response({"Result": "Error", "Message": "Contractor not found"}, status=404)
        qr = QRCode.objects.filter(entity_type="CONTRACTOR", entity_id=con.pk).first()
        emp = Employer.objects.filter(pk=con.employer_id).first()
        workers = Worker.objects.filter(contractor_id=con.pk).order_by("full_name")
        return Response({
            "Result": "Success",
            "Data": {
                "contractor": ContractorSerializer(con).data,
                "qr_reference": qr.qr_reference if qr else None,
                "employer": EmployerSerializer(emp).data if emp else None,
                "workers": [
                    {
                        "id": w.pk,
                        "full_name": w.full_name,
                        "worker_id": w.worker_id,
                        "mobile": w.mobile,
                        "designation": w.designation,
                        "is_active": w.is_active,
                    } for w in workers
                ],
            },
        })


class WorkerTreeView(APIView):
    """Admin sees full worker details: worker + employer + contractor."""

    permission_classes = [IsAuthenticated]

    def get(self, request, worker_id):
        if not role_has_access(request.user, [SUPER, STAFF]):
            return Response({"Result": "Forbidden", "Message": "Permission denied"}, status=403)
        w = Worker.objects.filter(pk=worker_id).first()
        if not w:
            return Response({"Result": "Error", "Message": "Worker not found"}, status=404)
        qr = QRCode.objects.filter(entity_type="WORKER", entity_id=w.pk).first()
        emp = Employer.objects.filter(pk=w.employer_id).first()
        con = Contractor.objects.filter(pk=w.contractor_id).first()
        bindings = Binding.objects.filter(worker_id=w.pk).order_by("-created_at")
        return Response({
            "Result": "Success",
            "Data": {
                "worker": WorkerSerializer(w).data,
                "qr_reference": qr.qr_reference if qr else None,
                "employer": EmployerSerializer(emp).data if emp else None,
                "contractor": ContractorSerializer(con).data if con else None,
                "bindings": [
                    {
                        "id": b.pk,
                        "binding_type": b.binding_type,
                        "status": b.status,
                        "started_at": b.started_at,
                        "ended_at": b.ended_at,
                    } for b in bindings
                ],
            },
        })


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
        # Expiry date: explicit date or default 30 days
        expiry_date = request.data.get("expiry_date") or request.data.get("plan_expiry")
        if expiry_date:
            try:
                from datetime import datetime
                parsed = datetime.strptime(str(expiry_date)[:10], "%Y-%m-%d")
                emp.plan_expiry = timezone.make_aware(parsed)
            except (ValueError, TypeError):
                return Response({"Result": "Error", "Message": "Invalid expiry date. Use YYYY-MM-DD."}, status=400)
        else:
            emp.plan_expiry = timezone.now() + timezone.timedelta(days=30)
        emp.save()
        write_audit(request, "EMPLOYER_PLAN_ATTACHED", "EMPLOYER", emp.pk, previous=plan, new=f"{plan} until {emp.plan_expiry.date()}")
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


class MyProfileView(APIView):
    """GET/PUT the logged-in user's own profile (employer/contractor/worker)."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        emp_id, con_id, role = resolve_scope(request.user)
        data = {"role": request.user.role, "username": request.user.username, "email": request.user.email, "mobile": request.user.mobile}
        if role == EMPLOYER and emp_id:
            emp = Employer.objects.filter(pk=emp_id).first()
            if not emp:
                return Response({"Result": "Error", "Message": "Employer not found"}, status=404)
            data["entity"] = "employer"
            data["profile"] = EmployerSerializer(emp).data
            return Response({"Result": "Success", "Data": data})
        if role in (PRIMARY, SECONDARY) and con_id:
            con = Contractor.objects.filter(pk=con_id).first()
            if not con:
                return Response({"Result": "Error", "Message": "Contractor not found"}, status=404)
            data["entity"] = "contractor"
            data["profile"] = ContractorSerializer(con).data
            return Response({"Result": "Success", "Data": data})
        if request.user.role == WORKER:
            # Worker scoped by legacy employee code / username
            worker = Worker.objects.filter(legacy_employee_code=request.user.username).first()
            if not worker:
                worker = Worker.objects.filter(mobile=request.user.mobile).first()
            if not worker:
                return Response({"Result": "Error", "Message": "Worker profile not found"}, status=404)
            data["entity"] = "worker"
            data["profile"] = WorkerSerializer(worker).data
            return Response({"Result": "Success", "Data": data})
        return Response({"Result": "Error", "Message": "No profile linked to this account"}, status=404)

    def put(self, request):
        emp_id, con_id, role = resolve_scope(request.user)
        if role == EMPLOYER and emp_id:
            emp = Employer.objects.filter(pk=emp_id).first()
            if not emp:
                return Response({"Result": "Error", "Message": "Employer not found"}, status=404)
            ser = EmployerSerializer(emp, data=request.data, partial=True)
        elif role in (PRIMARY, SECONDARY) and con_id:
            con = Contractor.objects.filter(pk=con_id).first()
            if not con:
                return Response({"Result": "Error", "Message": "Contractor not found"}, status=404)
            ser = ContractorSerializer(con, data=request.data, partial=True)
        elif request.user.role == WORKER:
            worker = Worker.objects.filter(legacy_employee_code=request.user.username).first()
            if not worker:
                worker = Worker.objects.filter(mobile=request.user.mobile).first()
            if not worker:
                return Response({"Result": "Error", "Message": "Worker profile not found"}, status=404)
            ser = WorkerSerializer(worker, data=request.data, partial=True)
        else:
            return Response({"Result": "Error", "Message": "No profile linked to this account"}, status=404)
        ser.is_valid(raise_exception=True)
        ser.save()
        write_audit(request, "PROFILE_UPDATED", ser.instance._meta.object_name, ser.instance.pk)
        return Response({"Result": "Success", "Data": ser.data})


class SavedLocationList(APIView):
    """Saved/starred locations for reuse (employer or admin)."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        emp_id, con_id, role = resolve_scope(request.user)
        is_admin = role in (SUPER, STAFF)
        if not is_admin and (role != EMPLOYER or not emp_id):
            return Response({"Result": "Forbidden", "Message": "Only employers can manage locations"}, status=403)
        if is_admin:
            locs = SavedLocation.objects.all().order_by("-created_at")
        else:
            locs = SavedLocation.objects.filter(employer_id=emp_id).order_by("-created_at")
        data = [{
            "id": l.pk, "name": l.name, "latitude": l.latitude, "longitude": l.longitude,
            "address": l.address, "is_starred": l.is_starred, "employer_id": l.employer_id,
        } for l in locs]
        return Response({"Result": "Success", "Data": data})

    def post(self, request):
        emp_id, con_id, role = resolve_scope(request.user)
        is_admin = role in (SUPER, STAFF)
        if not is_admin and (role != EMPLOYER or not emp_id):
            return Response({"Result": "Forbidden", "Message": "Only employers can save locations"}, status=403)
        lat = request.data.get("latitude")
        lng = request.data.get("longitude")
        if lat is None or lng is None:
            return Response({"Result": "Error", "Message": "latitude and longitude required"}, status=400)
        loc = SavedLocation.objects.create(
            employer_id=emp_id if not is_admin else request.data.get("employer_id"),
            name=request.data.get("name", ""),
            latitude=float(lat),
            longitude=float(lng),
            address=request.data.get("address", ""),
            is_starred=bool(request.data.get("is_starred", True)),
        )
        write_audit(request, "LOCATION_SAVED", "SavedLocation", loc.pk)
        return Response({"Result": "Success", "Data": {
            "id": loc.pk, "name": loc.name, "latitude": loc.latitude, "longitude": loc.longitude,
            "address": loc.address, "is_starred": loc.is_starred,
        }}, status=201)


class SavedLocationDelete(APIView):
    """Delete a saved/starred location."""

    permission_classes = [IsAuthenticated]

    def delete(self, request, location_id):
        emp_id, con_id, role = resolve_scope(request.user)
        is_admin = role in (SUPER, STAFF)
        loc = SavedLocation.objects.filter(pk=location_id).first()
        if not loc:
            return Response({"Result": "Error", "Message": "Location not found"}, status=404)
        if not is_admin and loc.employer_id != emp_id:
            return Response({"Result": "Error", "Message": "Location not yours"}, status=403)
        loc.delete()
        return Response({"Result": "Success", "Message": "Location removed"})


class SetContractorLocation(APIView):
    """Employer/admin sets a contractor's working location (lat/lng + reverse-geocoded address)."""

    permission_classes = [IsAuthenticated]

    def post(self, request, contractor_id=None):
        emp_id, con_id, role = resolve_scope(request.user)
        is_admin = role in (SUPER, STAFF)
        if not is_admin and (role != EMPLOYER or not emp_id):
            return Response({"Result": "Forbidden", "Message": "Only employers can set contractor locations"}, status=403)
        if contractor_id is None:
            contractor_id = request.data.get("contractor_id")
        lat = request.data.get("latitude")
        lng = request.data.get("longitude")
        if not contractor_id or lat is None or lng is None:
            return Response({"Result": "Error", "Message": "contractor_id, latitude and longitude required"}, status=400)
        contractor = Contractor.objects.filter(pk=contractor_id).first()
        if not contractor:
            return Response({"Result": "Error", "Message": "Contractor not found"}, status=404)
        if not is_admin and contractor.employer_id != emp_id:
            return Response({"Result": "Error", "Message": "Contractor not in your hierarchy"}, status=403)
        address = request.data.get("address", "")
        if not address and lat is not None and lng is not None:
            try:
                from .geocode import reverse_geocode
                res = reverse_geocode(float(lat), float(lng))
                address = (res or {}).get("display_name", "")
            except Exception:
                address = ""
        contractor.location_lat = float(lat)
        contractor.location_lng = float(lng)
        contractor.location_address = address
        contractor.site_name = request.data.get("site_name", contractor.site_name or "")
        contractor.save(update_fields=["location_lat", "location_lng", "location_address", "site_name"])
        write_audit(request, "CONTRACTOR_LOCATION_SET", "Contractor", contractor.pk,
                    previous="", new=f"{lat},{lng}")
        return Response({"Result": "Success", "Data": {
            "id": contractor.pk, "name": contractor.name,
            "location_lat": contractor.location_lat, "location_lng": contractor.location_lng,
            "location_address": contractor.location_address,
            "site_name": contractor.site_name, "address": address,
        }})

