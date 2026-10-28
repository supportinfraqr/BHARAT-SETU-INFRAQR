import uuid

from django.db import IntegrityError, transaction
from django.test import TestCase

from api.v1_bridge.edge import _create_camera
from bss_core.models import EdgeCamera, Site, User


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
