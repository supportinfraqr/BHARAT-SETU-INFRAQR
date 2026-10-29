"""Mirror worker self-enrolment vectors from the CCTV controller into BSS."""

import base64

import numpy as np
from django.db import transaction
from django.utils import timezone

from bss_core.models import WorkerFaceEmbedding, WorkerFacePhoto

from . import attendance_control as control
from .v1_bridge.edge import (EDGE_FACE_DETECTOR, EDGE_FACE_MODEL_NAME,
                             EDGE_FACE_MODEL_VERSION, EDGE_FACE_WEIGHTS_SHA)


def sync_self_vectors(identity, photos=None):
    """Copy the controller's vectors for one worker into BSS.

    Returns the number of vectors stored. Existing WORKER_SELF rows are replaced;
    CLIENT_MANUAL rows and a MANUAL matching preference are never removed.
    """
    person = str(getattr(identity, "bss_worker_id", "") or "").strip()
    if not person:
        return 0
    payload = control.enroll_vectors(person)
    raw_vectors = payload.get("embeddings") or []
    if not raw_vectors:
        return 0
    if str(payload.get("model") or EDGE_FACE_MODEL_NAME) != EDGE_FACE_MODEL_NAME:
        raise ValueError("Controller face model does not match BSS.")
    if str(payload.get("detector") or EDGE_FACE_DETECTOR) != EDGE_FACE_DETECTOR:
        raise ValueError("Controller face detector does not match BSS.")

    vectors = []
    for encoded in raw_vectors:
        try:
            vector = np.frombuffer(base64.b64decode(str(encoded)), dtype=np.float32)
        except Exception as exc:  # noqa: BLE001
            raise ValueError("Controller returned an invalid face vector.") from exc
        if vector.size != 512:
            continue
        norm = float(np.linalg.norm(vector))
        if norm <= 0:
            continue
        vectors.append(vector / norm)
    if not vectors:
        return 0

    photos = list(photos or WorkerFacePhoto.objects
                  .filter(user_id=identity.user_id).order_by("slot", "id"))
    photo_by_slot = {int(photo.slot): photo for photo in photos}
    now = timezone.now()
    with transaction.atomic():
        WorkerFaceEmbedding.objects.filter(
            worker_id=identity.user_id, source="WORKER_SELF").delete()
        for index, vector in enumerate(vectors):
            photo = photo_by_slot.get(index + 1)
            WorkerFaceEmbedding.objects.create(
                worker_id=identity.user_id,
                photo=photo,
                source="WORKER_SELF",
                slot=index + 1,
                captured_at=photo.created_at if photo else now,
                meta={"syncedFrom": "video-attendance"},
                model_name=EDGE_FACE_MODEL_NAME,
                model_version=EDGE_FACE_MODEL_VERSION,
                detector_backend=EDGE_FACE_DETECTOR,
                embedding=vector.astype(np.float32).tobytes(),
                dim=512,
                weights_sha=EDGE_FACE_WEIGHTS_SHA,
            )
        if str(getattr(identity, "face_match_source", "SELF") or "SELF").upper() != "MANUAL":
            identity.face_match_source = "SELF"
            identity.save(update_fields=["face_match_source", "updated_at"])
    return len(vectors)


__all__ = ["sync_self_vectors"]
