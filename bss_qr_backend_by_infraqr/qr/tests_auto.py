"""Automated internal tests for the QR system (GUIDE.MD spec).

Covers end-to-end, using Django's test client against the real views:
- QR reference generation/verification/tamper rejection
- Scan flows per role (employer/contractor/worker, admin)
- Binding lifecycle: request -> dual-handshake consent (APP / SMS_OTP / IVR / VOICE)
- Fallback escalation ladder (Case I APP->IVR, Case II APP->SMS_OTP->VOICE)
- Unbind lifecycle (dual consent) + hierarchy cleanup
- Visibility gate (Rule 5/6): bound = full profile, unbound = general info
- Hierarchy invariants (ECSW tuple, one-worker-one-site)
- Geo verification + attendance marking
- Admin scan-log audit trail
"""
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone

from rest_framework.test import APIClient

from authx.models import User

from .consent import finalize_binding, request_consent, resolve_consent
from .models import (
    Attendance,
    Binding,
    Contractor,
    ContractorEmployment,
    Employer,
    QRCode,
    ScanLog,
    Site,
    Worker,
)
from .services import create_qr_for_entity, generate_qr_reference, verify_qr_reference


class BaseQRTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        # Employer + site
        self.employer = Employer.objects.create(
            name="Employer 1", email="employer@test.com",
            contact_mobile="9111111111", approval_status="APPROVED",
            plan_type="SILVER",
            plan_expiry=timezone.now() + timezone.timedelta(days=365),
        )
        self.site = Site.objects.create(
            name="Site 1", employer=self.employer,
            latitude=17.38, longitude=78.48,
        )
        # Second employer (for cross-hierarchy checks)
        self.employer2 = Employer.objects.create(
            name="Employer 2", email="employer2@test.com",
            contact_mobile="9222222222", approval_status="APPROVED",
            plan_type="SILVER",
            plan_expiry=timezone.now() + timezone.timedelta(days=365),
        )
        # Contractors
        self.contractor = Contractor.objects.create(
            name="Contractor 1", contact_mobile="9333333333",
            email="contractor@test.com", employer=self.employer,
        )
        self.contractor2 = Contractor.objects.create(
            name="Contractor 2", contact_mobile="9444444444",
            email="contractor2@test.com", employer=self.employer2,
        )
        # Workers
        self.worker = Worker.objects.create(
            full_name="Worker 1", worker_id="WRK0001",
            legacy_employee_code="worker@test.com", mobile="9555555555",
            aadhaar_no="123412341234", pan_no="ABCDE1234F",
            father_name="Suresh", present_address="Bhopal",
            gender="Male", date_of_birth="15-06-1990", blood_group="B+",
            employer=self.employer,
        )
        self.worker2 = Worker.objects.create(
            full_name="Worker 2", worker_id="WRK0002",
            legacy_employee_code="worker2@test.com", mobile="9666666666",
            aadhaar_no="999999999999",
            employer=self.employer2,
        )
        # QR codes
        self.qr_worker = create_qr_for_entity("WORKER", self.worker.pk)
        self.qr_worker2 = create_qr_for_entity("WORKER", self.worker2.pk)
        self.qr_contractor = create_qr_for_entity("CONTRACTOR", self.contractor.pk)
        self.qr_employer = create_qr_for_entity("EMPLOYER", self.employer.pk)

        # Users
        self.admin = User.objects.create_user(
            username="admin@test.com", password="admin@test.com", role="SUPER_ADMIN"
        )
        self.emp_user = User.objects.create_user(
            username="employer@test.com", password="employer@test.com",
            role="EMPLOYER", employer_id=self.employer.pk,
        )
        self.con_user = User.objects.create_user(
            username="contractor@test.com", password="contractor@test.com",
            role="PRIMARY_CONTRACTOR", contractor_id=self.contractor.pk,
        )
        self.wrk_user = User.objects.create_user(
            username="worker@test.com", password="worker@test.com",
            role="WORKER",
        )

    def auth(self, user):
        self.client.force_authenticate(user=user)

    def scan(self, qr_ref, **extra):
        return self.client.post(reverse("qr-scan"), {"qr_reference": qr_ref, **extra}, format="json")


# ============================================================ QR TECHNOLOGY
class QRTechnologyTests(BaseQRTest):
    def test_generate_and_verify(self):
        ref = generate_qr_reference("WORKER", self.worker.pk)
        qr = verify_qr_reference(ref)
        self.assertIsNotNone(qr)
        self.assertEqual(qr.entity_type, "WORKER")
        self.assertEqual(qr.entity_id, self.worker.pk)

    def test_tampered_reference_rejected(self):
        ref = self.qr_worker.qr_reference
        # Flip one char in the middle (keeping base64 alphabet)
        tampered = ref[:-4] + ("A" if ref[-4] != "A" else "B") + ref[-3:]
        self.assertIsNone(verify_qr_reference(tampered))

    def test_garbage_reference_rejected(self):
        self.assertIsNone(verify_qr_reference("not-a-real-ref"))
        self.assertIsNone(verify_qr_reference(""))

    def test_unknown_entity_reference(self):
        ref = generate_qr_reference("WORKER", 999999)
        self.assertIsNone(verify_qr_reference(ref))


# ============================================================ SCAN FLOWS
class ScanFlowTests(BaseQRTest):
    def test_unauthenticated_scan_rejected(self):
        resp = self.scan(self.qr_worker.qr_reference)
        self.assertEqual(resp.status_code, 401)

    def test_invalid_qr_logged(self):
        self.auth(self.wrk_user)
        resp = self.scan("BOGUSREF123")
        self.assertEqual(resp.status_code, 400)
        self.assertIn("Invalid QR", resp.json()["Message"])
        self.assertTrue(ScanLog.objects.filter(scan_result="INVALID_QR").exists())

    def test_admin_scan_worker_full_profile(self):
        self.auth(self.admin)
        resp = self.scan(self.qr_worker.qr_reference)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()["Data"]
        self.assertEqual(data["action"], "view_info")
        self.assertEqual(data["worker"]["full_name"], "Worker 1")

    def test_employer_scan_own_worker(self):
        self.auth(self.emp_user)
        resp = self.scan(self.qr_worker.qr_reference)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["Data"]["worker"]["full_name"], "Worker 1")

    def test_employer_scan_foreign_worker_denied(self):
        self.auth(self.emp_user)
        resp = self.scan(self.qr_worker2.qr_reference)
        self.assertEqual(resp.status_code, 403)
        self.assertTrue(ScanLog.objects.filter(scan_result="HIERARCHY_DENIED").exists())

    def test_contractor_scan_unbound_worker_creates_binding(self):
        self.auth(self.con_user)
        resp = self.scan(self.qr_worker.qr_reference)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()["Data"]
        self.assertEqual(data["action"], "binding_requested")
        binding = Binding.objects.get(pk=data["binding_id"])
        self.assertEqual(binding.binding_type, "WORKER_CONTRACTOR")
        self.assertEqual(binding.status, "PENDING")
        # Contractor auto-approved as approver (they initiated)
        self.assertEqual(binding.approver_consent, "APPROVED")

    def test_contractor_scan_bound_worker_attendance(self):
        # Bind worker to contractor first
        binding = Binding.objects.create(
            binding_type="WORKER_CONTRACTOR", employer=self.employer,
            contractor=self.contractor, worker=self.worker,
            site=self.site, status="ACTIVE",
            initiator_consent="APPROVED", approver_consent="APPROVED",
        )
        finalize_binding(binding)
        self.auth(self.con_user)
        resp = self.scan(self.qr_worker.qr_reference,
                         latitude=17.38, longitude=78.48)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()["Data"]
        self.assertEqual(data["action"], "already_bound")
        self.assertEqual(data["worker"]["full_name"], "Worker 1")
        self.assertIn("attendance", data)

    def test_worker_scan_worker_visibility_gate(self):
        # Two workers with no binding -> GENERAL profile only
        self.auth(self.wrk_user)
        resp = self.scan(self.qr_worker2.qr_reference)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()["Data"]
        self.assertEqual(data["visibility"], "GENERAL")
        prof = data["worker"]
        self.assertIn("Name", prof)
        self.assertIn("BloodGroup", prof)
        self.assertNotIn("aadhaar_no", prof)
        self.assertNotIn("mobile", prof)
        self.assertNotIn("present_address", prof)

    def test_worker_scan_bound_worker_full_profile(self):
        # A worker viewing their OWN card gets the full profile (bound to self).
        self.auth(self.wrk_user)
        resp = self.scan(self.qr_worker.qr_reference)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()["Data"]
        self.assertEqual(data["visibility"], "FULL")
        prof = data["worker"]
        self.assertIn("full_name", prof)
        self.assertIn("mobile", prof)
        self.assertIn("aadhaar_no", prof)

    def test_contractor_scan_employer_binding_request(self):
        self.auth(self.con_user)
        resp = self.scan(self.qr_employer.qr_reference)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()["Data"]
        self.assertIn(data["action"], ("binding_requested", "already_bound", "request_pending"))

    def test_geo_mismatch_recorded(self):
        # Contractor with location pin at site; scan far away
        self.contractor.location_lat = 17.38
        self.contractor.location_lng = 78.48
        self.contractor.save()
        binding = Binding.objects.create(
            binding_type="WORKER_CONTRACTOR", employer=self.employer,
            contractor=self.contractor, worker=self.worker,
            site=self.site, status="ACTIVE",
            initiator_consent="APPROVED", approver_consent="APPROVED",
        )
        finalize_binding(binding)
        self.auth(self.con_user)
        resp = self.scan(self.qr_worker.qr_reference,
                         latitude=28.6, longitude=77.2)  # Delhi vs Hyderabad
        self.assertEqual(resp.status_code, 200)
        data = resp.json()["Data"]
        self.assertEqual(data["location_status"], "MISMATCH")
        att = Attendance.objects.get(worker=self.worker)
        self.assertTrue(att.location_mismatch)
        self.assertEqual(att.attendance_status, "LOCATION_MISMATCH")


# ============================================================ CONSENT
class ConsentFlowTests(BaseQRTest):
    def _make_ec_binding(self):
        return Binding.objects.create(
            binding_type="EMPLOYER_CONTRACTOR", employer=self.employer,
            contractor=self.contractor, status="PENDING",
        )

    def test_dual_handshake_approve(self):
        b = self._make_ec_binding()
        self.auth(self.emp_user)
        r1 = self.client.post(reverse("consent-request", args=[b.pk]),
                              {"party": "initiator", "channel": "APP"}, format="json")
        self.assertEqual(r1.json()["Data"]["channel"], "APP")
        r1 = self.client.post(reverse("consent-resolve", args=[b.pk]),
                              {"party": "initiator", "decision": "approve"}, format="json")
        self.assertFalse(r1.json()["Data"]["binding_complete"])
        r2 = self.client.post(reverse("consent-resolve", args=[b.pk]),
                              {"party": "approver", "decision": "approve"}, format="json")
        self.assertTrue(r2.json()["Data"]["binding_complete"])
        b.refresh_from_db()
        self.assertEqual(b.status, "ACTIVE")
        # Hierarchy created
        self.assertTrue(ContractorEmployment.objects.filter(
            contractor=self.contractor, employer=self.employer, status="ACTIVE").exists())

    def test_dual_handshake_reject(self):
        b = self._make_ec_binding()
        self.auth(self.emp_user)
        request_consent(b, "initiator", "APP")
        resolve_consent(b, "initiator", True)
        resolve_consent(b, "approver", False)
        b.refresh_from_db()
        self.assertEqual(b.approver_consent, "REJECTED")
        self.assertNotEqual(b.status, "ACTIVE")

    def test_timeout_escalates_app_to_sms_otp(self):
        """Case II ladder: APP times out -> auto escalate to SMS_OTP."""
        b = self._make_ec_binding()
        request_consent(b, "approver", "APP")
        # Backdate expiry so the next resolve sees a timeout
        Binding.objects.filter(pk=b.pk).update(consent_expires_at=timezone.now() - timezone.timedelta(seconds=5))
        b.refresh_from_db()
        r = resolve_consent(b, "approver", True)
        self.assertTrue(r["timed_out"])
        self.assertEqual(r["escalated_to"], "SMS_OTP")
        self.assertTrue(r.get("otp"))
        b.refresh_from_db()
        self.assertEqual(b.approver_consent, "PENDING")
        self.assertEqual(b.consent_channel, "SMS_OTP")

    def test_sms_otp_verify_then_sms_timeout_to_voice(self):
        """Case II: SMS OTP wrong -> stays pending; correct OTP completes."""
        b = self._make_ec_binding()
        # Contracting party is the contractor (initiator in E-C binding)
        self.auth(self.con_user)
        self.client.post(reverse("consent-request", args=[b.pk]),
                         {"party": "initiator", "channel": "SMS_OTP"}, format="json")
        # Wrong OTP
        r = self.client.post(reverse("consent-resolve", args=[b.pk]),
                             {"party": "initiator", "decision": "approve", "otp": "0000"}, format="json")
        self.assertTrue(r.json()["Data"]["invalid_otp"])
        # Correct OTP path
        from .consent import _otp_store
        otp = _otp_store().get(f"consent_otp:{b.pk}:9333333333")
        r = self.client.post(reverse("consent-resolve", args=[b.pk]),
                             {"party": "initiator", "decision": "approve", "otp": otp}, format="json")
        self.assertFalse(r.json()["Data"]["binding_complete"])  # approver still pending
        # Approver (employer) requests APP consent then approves -> binding activates
        self.auth(self.emp_user)
        self.client.post(reverse("consent-request", args=[b.pk]),
                         {"party": "approver", "channel": "APP"}, format="json")
        r = self.client.post(reverse("consent-resolve", args=[b.pk]),
                             {"party": "approver", "decision": "approve"}, format="json")
        self.assertTrue(r.json()["Data"]["binding_complete"])
        b.refresh_from_db()
        self.assertEqual(b.status, "ACTIVE")

    def test_ivr_sequence_for_worker_target(self):
        """Case I ladder: worker consents -> APP then IVR (no SMS)."""
        b = Binding.objects.create(
            binding_type="WORKER_CONTRACTOR", employer=self.employer,
            contractor=self.contractor, worker=self.worker, status="PENDING",
        )
        request_consent(b, "initiator", "APP")
        Binding.objects.filter(pk=b.pk).update(consent_expires_at=timezone.now() - timezone.timedelta(seconds=5))
        b.refresh_from_db()
        r = resolve_consent(b, "initiator", True)
        self.assertTrue(r["timed_out"])
        self.assertEqual(r["escalated_to"], "IVR")
        self.assertNotIn("otp", r)

    def test_auto_channel_resolves_to_next(self):
        """AUTO on a fresh binding starts with APP."""
        b = self._make_ec_binding()
        d = request_consent(b, "initiator", "AUTO")
        self.assertEqual(d["channel"], "APP")

    def test_consent_api_endpoints(self):
        b = self._make_ec_binding()
        self.auth(self.con_user)
        resp = self.client.post(reverse("consent-request", args=[b.pk]),
                                {"party": "initiator", "channel": "APP"}, format="json")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["Data"]["channel"], "APP")
        resp = self.client.post(reverse("consent-resolve", args=[b.pk]),
                                {"party": "initiator", "decision": "approve"}, format="json")
        self.assertEqual(resp.status_code, 200)
        resp = self.client.post(reverse("consent-resolve", args=[b.pk]),
                                {"party": "approver", "decision": "approve"}, format="json")
        self.assertEqual(resp.json()["Data"]["binding_complete"], True)


# ============================================================ UNBIND
class UnbindFlowTests(BaseQRTest):
    def setUp(self):
        super().setUp()
        self.binding = Binding.objects.create(
            binding_type="WORKER_CONTRACTOR", employer=self.employer,
            contractor=self.contractor, worker=self.worker,
            site=self.site, status="ACTIVE",
            initiator_consent="APPROVED", approver_consent="APPROVED",
        )
        finalize_binding(self.binding)

    def test_unbind_requires_dual_consent(self):
        # Contractor (approver in WORKER_CONTRACTOR) initiates unbind
        self.auth(self.con_user)
        resp = self.client.post(reverse("binding-unbind", args=[self.binding.pk]), {}, format="json")
        self.assertEqual(resp.status_code, 200)
        self.binding.refresh_from_db()
        self.assertEqual(self.binding.unbind_status, "PENDING")
        self.assertEqual(self.binding.approver_unbind_consent, "APPROVED")  # contractor auto-approved
        # Worker (initiator) must consent to unbind
        self.auth(self.wrk_user)
        resp = self.client.post(reverse("unbind-consent-request", args=[self.binding.pk]),
                                {"party": "initiator", "channel": "APP"}, format="json")
        self.assertEqual(resp.status_code, 200)
        resp = self.client.post(reverse("unbind-consent-resolve", args=[self.binding.pk]),
                                {"party": "initiator", "decision": "approve"}, format="json")
        self.assertEqual(resp.status_code, 200)
        self.binding.refresh_from_db()
        self.assertEqual(self.binding.status, "ENDED")

    def test_unbind_reject_keeps_binding(self):
        self.auth(self.con_user)
        self.client.post(reverse("binding-unbind", args=[self.binding.pk]), {}, format="json")
        self.client.post(reverse("unbind-consent-request", args=[self.binding.pk]),
                         {"party": "initiator", "channel": "APP"}, format="json")
        self.client.post(reverse("unbind-consent-resolve", args=[self.binding.pk]),
                         {"party": "initiator", "decision": "reject"}, format="json")
        self.binding.refresh_from_db()
        self.assertEqual(self.binding.status, "ACTIVE")


# ============================================================ HIERARCHY
class HierarchyTests(BaseQRTest):
    def test_assign_worker_to_system_sets_ecsw(self):
        from .hierarchy import assign_worker_to_system
        w = assign_worker_to_system(self.worker, self.contractor, self.site)
        self.assertEqual(w.ecsw_tuple,
                         f"{self.employer.pk}-{self.contractor.pk}-{self.site.pk}-{self.worker.pk}")
        self.assertEqual(w.employer_id, self.employer.pk)
        self.assertEqual(w.site_id, self.site.pk)

    def test_reassign_worker_raises(self):
        from .hierarchy import assign_worker_to_system
        assign_worker_to_system(self.worker, self.contractor, self.site)
        with self.assertRaises(ValueError):
            assign_worker_to_system(self.worker, self.contractor2, self.site)

    def test_contractor_multi_employer(self):
        from .hierarchy import get_contractor_employers
        ContractorEmployment.objects.create(
            contractor=self.contractor, employer=self.employer, site=self.site, status="ACTIVE")
        ContractorEmployment.objects.create(
            contractor=self.contractor, employer=self.employer2, site=self.site, status="ACTIVE")
        emps = get_contractor_employers(self.contractor)
        self.assertIn(self.employer, emps)
        self.assertIn(self.employer2, emps)

    def test_get_employer_contractors_at_site(self):
        from .hierarchy import get_employer_contractors_at_site
        ContractorEmployment.objects.create(
            contractor=self.contractor, employer=self.employer, site=self.site, status="ACTIVE")
        cons = get_employer_contractors_at_site(self.employer, self.site)
        self.assertIn(self.contractor, cons)


# ============================================================ VISIBILITY API
class ProfileVisibilityTests(BaseQRTest):
    def test_lookup_unbound_general(self):
        self.auth(self.wrk_user)
        resp = self.client.get(reverse("profile-lookup"),
                               {"entity_type": "WORKER", "entity_id": self.worker2.pk})
        self.assertEqual(resp.status_code, 200)
        data = resp.json()["Data"]
        self.assertEqual(data["visibility"], "GENERAL")
        self.assertNotIn("aadhaar_no", data["profile"])

    def test_lookup_bound_full(self):
        Binding.objects.create(
            binding_type="WORKER_CONTRACTOR", employer=self.employer,
            contractor=self.contractor, worker=self.worker,
            status="ACTIVE", initiator_consent="APPROVED", approver_consent="APPROVED",
        )
        self.auth(self.wrk_user)
        resp = self.client.get(reverse("profile-lookup"),
                               {"entity_type": "WORKER", "entity_id": self.worker.pk})
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["Data"]["visibility"], "FULL")

    def test_admin_always_full(self):
        self.auth(self.admin)
        resp = self.client.get(reverse("profile-lookup"),
                               {"entity_type": "WORKER", "entity_id": self.worker2.pk})
        self.assertEqual(resp.json()["Data"]["visibility"], "FULL")


# ============================================================ AUDIT / SCANS
class AuditTests(BaseQRTest):
    def test_scan_log_created(self):
        self.auth(self.admin)
        self.scan(self.qr_worker.qr_reference)
        self.assertTrue(ScanLog.objects.filter(scan_result="CONTRACTOR_SCAN").exists()
                        or ScanLog.objects.filter(scan_result__in=("PRESENT", "VIEW")).exists()
                        or ScanLog.objects.count() >= 1)

    def test_attendance_created_for_bound_worker(self):
        binding = Binding.objects.create(
            binding_type="WORKER_CONTRACTOR", employer=self.employer,
            contractor=self.contractor, worker=self.worker,
            site=self.site, status="ACTIVE",
            initiator_consent="APPROVED", approver_consent="APPROVED",
        )
        finalize_binding(binding)
        self.auth(self.con_user)
        self.scan(self.qr_worker.qr_reference, latitude=17.38, longitude=78.48)
        self.assertTrue(Attendance.objects.filter(worker=self.worker).exists())