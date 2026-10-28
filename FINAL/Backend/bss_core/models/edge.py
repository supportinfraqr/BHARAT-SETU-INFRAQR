"""Client-side attendance devices, camera schedules and inbound edge events.

The camera/face pipeline runs on the client. BSS only receives heartbeats,
face embeddings and QR events; no video or images are stored here.
"""

import uuid

from django.db import models
from django.db.models.functions import Lower
from django.utils import timezone

from .auth import User
from .relationship import Site
from .submissions import WorkerFacePhoto


class EdgeDevice(models.Model):
    """One activated client installation for an employer.

    The device can run cameras across every site of its employer. A camera is
    still owned by exactly one device at a time.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    employer = models.ForeignKey(User, on_delete=models.CASCADE, related_name="edge_devices",
                                 limit_choices_to={"role": "employer"})
    name = models.CharField(max_length=120, blank=True)
    activation_phone = models.CharField(max_length=20, blank=True)
    device_fingerprint = models.CharField(max_length=128)
    token_hash = models.CharField(max_length=64, db_index=True, blank=True)
    version = models.CharField(max_length=40, blank=True)
    last_seen_at = models.DateTimeField(null=True, blank=True)
    last_seen_ip = models.GenericIPAddressField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "edge_device"
        constraints = [models.UniqueConstraint(fields=["employer", "device_fingerprint"],
                                               name="uq_edge_device_employer_fingerprint")]
        indexes = [
            models.Index(fields=["employer"], name="idx_edge_device_employer"),
            models.Index(fields=["token_hash"], name="idx_edge_device_token"),
        ]

    def __str__(self):
        return f"{self.employer_id}:{self.device_fingerprint[:12]}"


class EdgeCamera(models.Model):
    """A site camera with its own IP allowlist, schedule and authentication token.

    Cameras exist at site level so the employer can configure them before the
    site laptop is activated. A camera can be claimed by only one active edge
    device at a time.
    """

    MODE = [
        ("LIVE", "Live"),
        ("SENDING", "Sending data"),
        ("SCHEDULED_OFF", "Scheduled off"),
        ("OFFLINE", "Offline"),
    ]

    site = models.ForeignKey(Site, on_delete=models.CASCADE, related_name="attendance_cameras")
    device = models.ForeignKey(EdgeDevice, on_delete=models.SET_NULL, null=True, blank=True,
                               related_name="cameras")
    uid = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    APPROVAL = [
        ("PENDING", "Pending approval"),
        ("APPROVED", "Approved"),
        ("REJECTED", "Rejected"),
        ("REMOVED", "Removed"),
    ]
    approval_status = models.CharField(max_length=12, choices=APPROVAL, default="PENDING", db_index=True)
    employer_label = models.CharField(max_length=120, blank=True)
    created_by_device = models.ForeignKey("EdgeDevice", on_delete=models.SET_NULL, null=True, blank=True,
                                          related_name="created_cameras")
    approved_at = models.DateTimeField(null=True, blank=True)
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                                    related_name="approved_edge_cameras")
    removed_at = models.DateTimeField(null=True, blank=True)
    removed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                                   related_name="removed_edge_cameras")
    label = models.CharField(max_length=120)
    channel = models.PositiveSmallIntegerField(null=True, blank=True)
    allowed_ip = models.GenericIPAddressField(null=True, blank=True)
    timezone = models.CharField(max_length=64, default="Asia/Kolkata")
    schedule_enabled = models.BooleanField(default=False)
    capture_windows = models.JSONField(default=list, blank=True)
    ATTENDANCE_MODES = [("FACE", "Face only"), ("QR", "QR only"), ("BOTH", "Face + QR")]
    attendance_mode = models.CharField(max_length=10, choices=ATTENDANCE_MODES, default="FACE")
    token_hash = models.CharField(max_length=64, db_index=True, blank=True)
    token_prefix = models.CharField(max_length=16, blank=True)
    is_claimed = models.BooleanField(default=False)
    claimed_at = models.DateTimeField(null=True, blank=True)
    last_mode = models.CharField(max_length=20, choices=MODE, default="OFFLINE")
    last_status = models.CharField(max_length=40, blank=True)
    last_seen_at = models.DateTimeField(null=True, blank=True)
    last_seen_ip = models.GenericIPAddressField(null=True, blank=True)
    last_event_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "edge_camera"
        constraints = [
            # A removed/rejected camera must not block re-adding the same label.
            # Active labels stay unique per site, case-insensitively.
            models.UniqueConstraint(
                Lower("label"), "site",
                condition=~models.Q(approval_status__in=("REMOVED", "REJECTED")),
                name="uq_edge_camera_site_active_label",
            ),
        ]
        indexes = [
            models.Index(fields=["site"], name="idx_edge_camera_site"),
            models.Index(fields=["device"], name="idx_edge_camera_device"),
            models.Index(fields=["token_hash"], name="idx_edge_camera_token"),
            models.Index(fields=["allowed_ip"], name="idx_edge_camera_allowed_ip"),
        ]

    def __str__(self):
        return f"{self.site_id}:{self.label}"


class EdgeEvent(models.Model):
    """Idempotent inbound event from an edge device (embedding / QR only)."""

    STATUS = [
        ("ACCEPTED", "Accepted"),
        ("UNKNOWN", "Unknown worker"),
        ("REJECTED", "Rejected"),
        ("DUPLICATE", "Duplicate"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    device = models.ForeignKey(EdgeDevice, on_delete=models.CASCADE, related_name="events")
    camera = models.ForeignKey(EdgeCamera, on_delete=models.SET_NULL, null=True, blank=True,
                               related_name="events")
    event_id = models.CharField(max_length=80)
    worker = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                               related_name="edge_events")
    site = models.ForeignKey(Site, on_delete=models.CASCADE, related_name="edge_events")
    occurred_at = models.DateTimeField()
    capture_method = models.CharField(max_length=20, default="FACE")
    status = models.CharField(max_length=20, choices=STATUS, default="UNKNOWN")
    confidence = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    match_distance = models.DecimalField(max_digits=8, decimal_places=6, null=True, blank=True)
    model_name = models.CharField(max_length=40, blank=True)
    model_version = models.CharField(max_length=80, blank=True)
    embedding = models.BinaryField(null=True, blank=True)
    details = models.JSONField(default=dict, blank=True)
    attendance = models.ForeignKey("bss_core.Attendance", on_delete=models.SET_NULL,
                                   null=True, blank=True, related_name="edge_events")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "edge_event"
        constraints = [models.UniqueConstraint(fields=["device", "event_id"],
                                               name="uq_edge_event_device_event")]
        indexes = [
            models.Index(fields=["site", "occurred_at"], name="idx_edge_event_site_time"),
            models.Index(fields=["camera", "occurred_at"], name="idx_edge_event_camera_time"),
            models.Index(fields=["status"], name="idx_edge_event_status"),
            models.Index(fields=["created_at"], name="idx_edge_event_created"),
        ]

    def __str__(self):
        return f"{self.device_id}:{self.event_id}"


class WorkerFaceEmbedding(models.Model):
    """One face vector from worker self-enrollment or a client CCTV camera."""

    SOURCE = [("WORKER_SELF", "Worker self-enrollment"),
              ("CLIENT_MANUAL", "Client camera manual enrollment")]

    worker = models.ForeignKey(User, on_delete=models.CASCADE, related_name="face_embeddings")
    photo = models.ForeignKey(WorkerFacePhoto, on_delete=models.CASCADE, null=True, blank=True,
                              related_name="embeddings")
    source = models.CharField(max_length=20, choices=SOURCE, default="WORKER_SELF")
    camera = models.ForeignKey(EdgeCamera, on_delete=models.SET_NULL, null=True, blank=True,
                               related_name="face_embeddings")
    device = models.ForeignKey(EdgeDevice, on_delete=models.SET_NULL, null=True, blank=True,
                               related_name="face_embeddings")
    slot = models.PositiveSmallIntegerField(null=True, blank=True)
    captured_at = models.DateTimeField(null=True, blank=True)
    meta = models.JSONField(default=dict, blank=True)
    model_name = models.CharField(max_length=40, default="ArcFace")
    model_version = models.CharField(max_length=80, blank=True)
    detector_backend = models.CharField(max_length=40, default="retinaface")
    embedding = models.BinaryField()
    dim = models.PositiveSmallIntegerField(default=512)
    weights_sha = models.CharField(max_length=64, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "worker_face_embedding"
        constraints = [models.UniqueConstraint(fields=["photo", "model_name", "model_version"],
                                               name="uq_worker_face_embedding_photo_model")]
        indexes = [
            models.Index(fields=["worker"], name="idx_worker_face_emb_worker"),
            models.Index(fields=["worker", "source"], name="idx_worker_face_emb_source"),
            models.Index(fields=["model_name", "model_version"], name="idx_worker_face_emb_model"),
        ]

    def __str__(self):
        return f"{self.worker_id}:{self.model_name}"


class EdgeAlert(models.Model):
    """One open alert per camera and kind (no-data / IP mismatch)."""

    KIND = [
        ("NO_DATA", "No data"),
        ("IP_MISMATCH", "IP mismatch"),
    ]
    STATUS = [
        ("OPEN", "Open"),
        ("RESOLVED", "Resolved"),
    ]

    device = models.ForeignKey(EdgeDevice, on_delete=models.CASCADE, related_name="alerts")
    camera = models.ForeignKey(EdgeCamera, on_delete=models.CASCADE, related_name="alerts")
    kind = models.CharField(max_length=20, choices=KIND)
    status = models.CharField(max_length=12, choices=STATUS, default="OPEN")
    allowed_ip = models.GenericIPAddressField(null=True, blank=True)
    last_observed_ip = models.GenericIPAddressField(null=True, blank=True)
    count = models.PositiveIntegerField(default=0)
    first_seen_at = models.DateTimeField(default=timezone.now)
    last_seen_at = models.DateTimeField(default=timezone.now)
    notified_at = models.DateTimeField(null=True, blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "edge_alert"
        constraints = [models.UniqueConstraint(
            fields=["camera"], condition=models.Q(status="OPEN"),
            name="uq_edge_alert_open_camera")]
        indexes = [
            models.Index(fields=["status", "kind"], name="idx_edge_alert_status_kind"),
            models.Index(fields=["device"], name="idx_edge_alert_device"),
        ]

    def __str__(self):
        return f"{self.camera_id}:{self.kind}:{self.status}"
