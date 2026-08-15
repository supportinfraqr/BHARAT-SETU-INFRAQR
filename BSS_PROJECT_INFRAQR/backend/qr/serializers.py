from rest_framework import serializers

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


class EmployerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Employer
        fields = ["id", "name", "contact_person", "contact_mobile", "email", "address", "is_active", "created_at"]


class ContractorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contractor
        fields = [
            "id", "name", "contact_mobile", "employer", "is_primary", "location_lat",
            "location_lng", "site_name", "is_active", "created_at",
        ]


class WorkerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Worker
        fields = [
            "id", "legacy_employee_code", "full_name", "worker_id", "mobile", "aadhaar_no",
            "pan_no", "employer", "contractor", "is_active", "created_at",
        ]


class QRCodeSerializer(serializers.ModelSerializer):
    class Meta:
        model = QRCode
        fields = ["qr_reference", "entity_type", "entity_id", "status", "scan_count", "created_at"]


class BindingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Binding
        fields = [
            "id", "binding_type", "employer", "contractor", "worker", "status",
            "request_reference", "site_name", "started_at", "ended_at", "created_at",
        ]


class ScanLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = ScanLog
        fields = [
            "id", "qr_reference", "worker", "scanning_user", "user_role", "employer",
            "contractor", "latitude", "longitude", "location_status", "scan_result",
            "ip_address", "created_at",
        ]


class AttendanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attendance
        fields = [
            "id", "worker", "employer", "contractor", "scan_user", "qr", "date", "time",
            "latitude", "longitude", "location_status", "attendance_status",
            "location_mismatch", "synced_to_bss", "created_at",
        ]


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ["id", "recipient_role", "notification_type", "message", "is_read", "created_at"]
