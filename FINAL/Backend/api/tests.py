import uuid
from datetime import timedelta

from django.db import IntegrityError, transaction
from django.test import TestCase
from django.utils import timezone

from api.v1_bridge.edge import _create_camera
from api.v1_payloads.common import _site_is_mine
from bss_core.models import (ContractorEmployerBinding, EdgeCamera, Site, User,
                             WorkerContractorBinding)


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
