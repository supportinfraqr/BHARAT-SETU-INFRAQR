import uuid
from datetime import timedelta

from django.db import IntegrityError, transaction
from django.test import TestCase, override_settings
from django.utils import timezone

from api.v1_bridge.edge import _create_camera
from api.v1_payloads.common import _site_is_mine
from bss_core.models import (ContactMessage, ContractorEmployerBinding, EdgeCamera, EdgeDevice,
                             Site, User, WorkerContractorBinding)


class EdgeCameraLabelConstraintTests(TestCase):
    def setUp(self):
        self.employer = User.objects.create_user(username="edge-owner", role="employer")
        self.site = Site.objects.create(
            employer=self.employer,
            bss_site_id="BSS-TEST-SITE",
            site_qr_token=uuid.uuid4().hex,
            site_name="Test Site",
        )

    def test_removed_camera_does_not_block_same_label(self):
        removed = EdgeCamera.objects.create(
            site=self.site, label="sr", approval_status="REMOVED")
        active = EdgeCamera.objects.create(
            site=self.site, label="SR", approval_status="APPROVED")
        self.assertNotEqual(removed.pk, active.pk)

    def test_active_labels_are_case_insensitively_unique(self):
        EdgeCamera.objects.create(
            site=self.site, label="sr", approval_status="APPROVED")
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                EdgeCamera.objects.create(
                    site=self.site, label="SR", approval_status="APPROVED")

    def test_create_camera_ignores_removed_existing_row(self):
        removed = EdgeCamera.objects.create(
            site=self.site, label="sr", approval_status="REMOVED")
        created = _create_camera(self.site, "sr")
        self.assertNotEqual(removed.pk, created.pk)
        self.assertEqual(created.approval_status, "PENDING")


class EdgePunchStateTests(TestCase):
    def setUp(self):
        self.employer = User.objects.create_user(username="punch-owner", role="employer")
        self.contractor = User.objects.create_user(username="punch-contractor", role="contractor")
        self.worker = User.objects.create_user(username="punch-worker", role="worker")
        self.site = Site.objects.create(
            employer=self.employer,
            bss_site_id="BSS-PUNCH-SITE",
            site_qr_token=uuid.uuid4().hex,
            site_name="Punch Site",
        )
        self.camera = EdgeCamera.objects.create(
            site=self.site, label="gate", approval_status="APPROVED")
        ContractorEmployerBinding.objects.create(
            contractor=self.contractor, employer=self.employer,
            binding_status="ACCEPTED")
        WorkerContractorBinding.objects.create(
            worker=self.worker, contractor=self.contractor, site=self.site,
            binding_status="ACCEPTED")

    def _camera_sighting(self, now, session="session-1", minutes=5):
        from api.v1_bridge.edge import _mark_edge_attendance
        return _mark_edge_attendance(
            self.worker, self.site, self.camera, now, 0.1, uuid.uuid4(),
            presence={
                "sessionId": session,
                "startedAt": now,
                "endedAt": now + timedelta(minutes=minutes),
                "dwellSeconds": minutes * 60,
            },
            method="FACE",
        )

    def test_camera_after_punch_does_not_change_in_out(self):
        from api.v1_bridge.attendance import _record_punch
        from bss_core.models import Attendance
        when = timezone.now()
        attendance, _, action = _record_punch(
            self.worker, self.site, "SELF", "gps_self", when)
        self.assertEqual(action, "IN")
        self._camera_sighting(when + timedelta(minutes=1))
        attendance.refresh_from_db()
        self.assertEqual(attendance.last_punch_type, "IN")
        self.assertEqual(attendance.check_in_time, when)
        self.assertIsNone(attendance.check_out_time)
        self.assertEqual(attendance.capture_method, "SELF")
        self.assertTrue(Attendance.objects.filter(pk=attendance.pk).exists())

    def test_camera_only_is_present_but_not_on_site(self):
        from api.v1_bridge.employer_analytics import _live
        self._camera_sighting(timezone.now())
        live = _live(self.employer, None, None)
        self.assertEqual(live["onSiteNow"], 0)
        self.assertEqual(live["today"]["present"], 1)
        self.assertEqual(live["workers"][0]["status"], "on_camera")
        self.assertEqual(live["workers"][0]["punches"], 0)

    def test_first_punch_after_camera_is_in(self):
        from api.v1_bridge.attendance import _record_punch
        from bss_core.models import Attendance
        when = timezone.now()
        self._camera_sighting(when)
        attendance = Attendance.objects.get(worker=self.worker, attendance_date=timezone.localdate())
        self.assertEqual(attendance.last_punch_type, "")
        attendance, _, action = _record_punch(
            self.worker, self.site, "QR", "qr_worker", when + timedelta(minutes=2))
        self.assertEqual(action, "IN")
        self.assertEqual(attendance.last_punch_type, "IN")
        self.assertEqual(attendance.capture_method, "QR")
        self.assertEqual(attendance.check_in_time, when + timedelta(minutes=2))


class SiteMineClassificationTests(TestCase):
    def setUp(self):
        self.employer = User.objects.create_user(username="mine-owner", role="employer")

    def test_explicit_flag_marks_site_as_mine(self):
        site = Site.objects.create(
            employer=self.employer, bss_site_id="BSS-MINE-SITE",
            site_qr_token=uuid.uuid4().hex, site_name="Mine Site",
            is_mine_site=True)
        self.assertTrue(_site_is_mine(site))

    def test_non_mine_site_is_not_mine(self):
        site = Site.objects.create(
            employer=self.employer, bss_site_id="BSS-FACTORY-SITE",
            site_qr_token=uuid.uuid4().hex, site_name="Factory Site",
            site_type="Mining Contractor Office", mine_type="Open cast")
        self.assertFalse(_site_is_mine(site))


class SupportTicketAdminTests(TestCase):
    def setUp(self):
        from rest_framework.test import APIClient
        self.client = APIClient()
        self.admin = User.objects.create_user(username="ticket-admin", role="bss_admin")
        self.client.force_authenticate(user=self.admin)
        self.ticket = ContactMessage.objects.create(
            reference="BSS-TEST-TICKET", name="Test Worker", role="worker",
            email="worker@example.com", category="technical",
            subject="Cannot mark attendance", message="The site QR does not work for me.")

    @override_settings(
        EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
        EMAIL_HOST="localhost", BSS_CONTACT_TO_EMAIL="support@example.com",
        DEFAULT_FROM_EMAIL="noreply@example.com")
    def test_reply_is_saved_and_emailed_then_ticket_can_close(self):
        from django.core import mail
        response = self.client.post("/v1/admin/support-tickets", {
            "action": "reply", "id": self.ticket.id,
            "message": "We have reset the site QR. Please scan it again.",
        }, format="json")
        self.assertEqual(response.status_code, 200)
        self.ticket.refresh_from_db()
        self.assertEqual(self.ticket.status, "READ")
        self.assertEqual(self.ticket.replies.count(), 1)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("BSS-TEST-TICKET", mail.outbox[0].subject)

        response = self.client.post("/v1/admin/support-tickets", {
            "action": "status", "id": self.ticket.id, "status": "CLOSED",
        }, format="json")
        self.assertEqual(response.status_code, 200)
        self.ticket.refresh_from_db()
        self.assertEqual(self.ticket.status, "CLOSED")


class MySupportTicketsTests(TestCase):
    def test_user_only_sees_own_tickets(self):
        from rest_framework.test import APIClient
        worker = User.objects.create_user(username="ticket-worker", role="worker")
        other = User.objects.create_user(username="ticket-other", role="worker")
        ContactMessage.objects.create(
            user=worker, reference="BSS-OWN", name="Worker", role="worker",
            email="own@example.com", subject="Own ticket", message="Own message")
        ContactMessage.objects.create(
            user=other, reference="BSS-OTHER", name="Other", role="worker",
            email="other@example.com", subject="Other ticket", message="Other message")
        client = APIClient()
        client.force_authenticate(user=worker)
        response = client.get("/v1/support-tickets")
        self.assertEqual(response.status_code, 200)
        rows = response.json()["data"]
        self.assertEqual([row["reference"] for row in rows], ["BSS-OWN"])


class EdgeDeviceReuseTests(TestCase):
    def setUp(self):
        from api.v1_bridge.edge import _create_edge_device
        self.create_device = _create_edge_device
        self.employer_a = User.objects.create_user(username="edge-a", role="employer")
        self.employer_b = User.objects.create_user(username="edge-b", role="employer")
        self.site = Site.objects.create(
            employer=self.employer_a, bss_site_id="BSS-EDGE-A",
            site_qr_token=uuid.uuid4().hex, site_name="Edge Site")

    def test_active_device_for_another_employer_blocks_reuse(self):
        EdgeDevice.objects.create(employer=self.employer_a, device_fingerprint="pc-1",
                                  is_active=True)
        with self.assertRaisesRegex(ValueError, "already activated for"):
            self.create_device(self.employer_b, "9999999999", "pc-1", "PC", "1.5.15", "")

    def test_inactive_device_does_not_block_another_employer(self):
        EdgeDevice.objects.create(employer=self.employer_a, device_fingerprint="pc-2",
                                  is_active=False)
        device, token = self.create_device(
            self.employer_b, "9999999999", "pc-2", "PC", "1.5.15", "")
        self.assertEqual(device.employer_id, self.employer_b.id)
        self.assertTrue(token)

    def test_deactivate_releases_device_and_cameras(self):
        import hashlib
        from rest_framework.test import APIClient
        raw = "edge-token-test"
        device = EdgeDevice.objects.create(
            employer=self.employer_a, device_fingerprint="pc-3",
            token_hash=hashlib.sha256(raw.encode()).hexdigest(), is_active=True)
        camera = EdgeCamera.objects.create(
            site=self.site, device=device, label="cam", approval_status="APPROVED",
            token_hash="camera-hash", is_claimed=True)
        client = APIClient()
        response = client.post("/v1/edge/deactivate", HTTP_X_EDGE_TOKEN=raw,
                               data={}, format="json")
        self.assertEqual(response.status_code, 200)
        device.refresh_from_db()
        camera.refresh_from_db()
        self.assertFalse(device.is_active)
        self.assertEqual(device.token_hash, "")
        self.assertFalse(camera.is_claimed)
        self.assertIsNone(camera.device_id)
        self.assertEqual(camera.token_hash, "")


class AdditionalFormFrequencyTests(TestCase):
    def setUp(self):
        from rest_framework.test import APIClient
        self.employer = User.objects.create_user(username="form-employer", role="employer")
        self.admin = User.objects.create_user(username="form-admin", role="bss_admin")
        self.employer_client = APIClient()
        self.employer_client.force_authenticate(user=self.employer)
        self.admin_client = APIClient()
        self.admin_client.force_authenticate(user=self.admin)

    def test_employer_form_requires_frequency(self):
        response = self.employer_client.post("/v1/employer/form-names", {
            "state": "Uttar Pradesh", "name": "Police Verification",
            "mandatory": True, "frequency": "",
        }, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("Frequency is required", response.json()["error"])

    def test_employer_form_saves_with_frequency(self):
        response = self.employer_client.post("/v1/employer/form-names", {
            "state": "Uttar Pradesh", "name": "Police Verification",
            "mandatory": True, "frequency": "Yearly",
        }, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["data"]["frequency"], "Yearly")

    def test_admin_catalog_form_requires_frequency(self):
        response = self.admin_client.post("/v1/admin/form-names", {
            "state": "Uttar Pradesh", "name": "Medical Fitness",
            "frequency": "",
        }, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("Frequency is required", response.json()["error"])

    def test_admin_catalog_form_saves_with_frequency(self):
        response = self.admin_client.post("/v1/admin/form-names", {
            "state": "Uttar Pradesh", "name": "Medical Fitness",
            "frequency": "Yearly",
        }, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["data"]["frequency"], "Yearly")
