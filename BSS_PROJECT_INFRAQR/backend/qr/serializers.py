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
        fields = [
            "id", "name", "contact_person", "contact_mobile", "email", "address",
            "pan_no", "gstin", "cin", "lin", "registration_type", "bank_details",
            "industry", "state", "city", "pincode",
            "approval_status", "plan_type", "is_active", "created_at",
        ]


class ContractorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contractor
        fields = [
            "id", "name", "contact_person", "contact_mobile", "email", "address",
            "pan_no", "gstin", "registration_type", "bank_details", "industry",
            "state", "city", "pincode", "employer", "is_primary", "location_lat",
            "location_lng", "location_address", "site_name", "is_active", "created_at",
        ]


class WorkerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Worker
        fields = [
            "id", "legacy_employee_code", "full_name", "worker_id", "mobile",
            "alternative_mobile", "email", "aadhaar_no", "aadhaar_status", "aadhaar_message",
            "aadhaar_response_json", "pan_no", "father_name", "care_of", "gender",
            "marital_status", "date_of_birth", "year_of_birth", "blood_group", "religion",
            "caste", "country", "digilocker_id", "reference_id", "transaction_id",
            "party_code", "party_type_id", "party_id", "client_id", "store_code",
            "licence_id", "present_address", "landmark", "sub_district", "vtc", "district",
            "post_office", "street", "house", "state", "city", "pincode",
            "permanent_address", "p_state", "p_city", "p_pincode",
            "designation", "department", "worker_grade", "type_work", "nature_job",
            "s_date", "en_date", "s_name", "site_id", "site_location", "site_state",
            "bank_account", "bank_ifsc", "bank_name", "account_holder_name",
            "previous_uan", "previous_esi", "pf_account", "gross_salary",
            "minimum_wage_category", "wage_type", "wage_disbursement_mode", "lwf", "wc_policy",
            "nominee_name", "nominee_relation", "nominee_dob", "nominee_address",
            "nominee_mobile", "nominee_email", "nominee_pan", "nominee_aadhaar",
            "pf_nominee_name", "pf_nominee_relation", "pf_nominee_dob", "pf_nominee_address",
            "pf_nominee_mobile", "pf_nominee_email",
            "esi_nominee_name", "esi_nominee_relation", "esi_nominee_dob", "esi_nominee_address",
            "esi_nominee_mobile", "esi_nominee_email",
            "bonus_nominee_name", "bonus_nominee_relation", "bonus_nominee_dob", "bonus_nominee_address",
            "bonus_nominee_mobile", "bonus_nominee_email",
            "other_nominee_name", "other_nominee_relation", "other_nominee_dob", "other_nominee_address",
            "other_nominee_mobile", "other_nominee_email",
            "fitness_types", "medical_status", "next_medical_due", "medical_certificate_file_path",
            "ppe", "ppe_type", "safety_training_status", "site_induction_status",
            "police_verification_status",
            "temp_id_status", "temp_id_number", "temp_id_date", "permanent_id_status",
            "permanent_id_number", "permanent_id_date", "issue_date", "valid_till",
            "camp_number", "transport", "route_id",
            "pan_copy_file_path", "aadhaar_copy_file_path", "pan_card_file_path",
            "cheque_passbook_file_path", "education_certificate_file_path",
            "experience_certificate_file_path", "aadhaar_front_side_file_path",
            "aadhaar_back_side_file_path", "relieving_letter_file_path", "payslips_file_path",
            "photos_1_file_path", "photos_2_file_path", "photos_3_file_path", "photos_4_file_path",
            "trainer_name", "trainer_date", "supervisor1", "supervisor2",
            "escalation1", "escalation2", "remark", "field_name", "is_deleted",
            "doj", "leaving_date", "employer", "contractor",
            "photo", "is_active", "created_at",
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
            "initiator_consent", "approver_consent", "consent_channel",
            "consent_expires_at", "initiator_consent_at", "approver_consent_at",
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
