"""Settings-UI backend: schema, comment-preserving save, live apply.

The web dashboard's /settings page is driven by FIELDS below — one entry per
tunable. `live: True` means the running pipeline picks it up on save without
a restart (via apply_live); `live: False` needs a restart and is badged so.

Secrets (postgres, API keys) are deliberately NOT in the schema and are never
served by /api/config.
"""
from typing import Any, Dict, List, Tuple

SECTIONS = [
    ("face", "Face recognition — who gets named"),
    ("detector", "Person detection — finding bodies"),
    ("qr", "QR / barcode scanning"),
    ("vitality", "Vitality score weights (should sum to ~1)"),
    ("source", "Video source"),
    ("display", "On-screen display"),
]

# type: number | int | bool | text
FIELDS: List[Dict[str, Any]] = [
    # ---- face: matching ----
    dict(section="face", key="cosine_threshold", label="Match threshold",
         type="number", min=0.3, max=0.9, step=0.01, live=True,
         help="Max distance for a name. Lower = stricter (fewer false names, more misses)."),
    dict(section="face", key="match_margin", label="Ambiguity margin",
         type="number", min=0.0, max=0.3, step=0.01, live=True,
         help="Winner must beat runner-up by this much or face stays Visitor. 0 = old behavior."),
    dict(section="face", key="match_topk", label="Voters (top-K)",
         type="int", min=1, max=10, live=True,
         help="How many nearest gallery images vote on each face."),
    dict(section="face", key="match_votes", label="Votes needed",
         type="int", min=1, max=10, live=True,
         help="Majority required to name someone (e.g. 2 of 3)."),
    dict(section="face", key="identity_patience", label="Identity patience",
         type="int", min=1, max=5, live=True,
         help="Consecutive disagreements before a locked name is reconsidered."),
    dict(section="face", key="reassign_margin", label="Reassign margin",
         type="number", min=0.5, max=1.2, step=0.01, live=True,
         help="Locked identity tolerates drift up to here before re-evaluation."),
    # ---- face: quality gates ----
    dict(section="face", key="min_blur", label="Min sharpness",
         type="number", min=0, max=200, step=1, live=True,
         help="Softer frames skip matching. 0 = off. Raise against false names, lower against misses."),
    dict(section="face", key="auto_register_min_face_px", label="Min face size (px)",
         type="int", min=30, max=200, live=True,
         help="Faces smaller than this are never judged. ~60 ≈ 2.5 m cutoff on 720p."),
    dict(section="face", key="refresh_interval_s", label="Face refresh (s)",
         type="number", min=0.5, max=10, step=0.5, live=False,
         help="How often each track is re-identified. Needs restart."),
    dict(section="face", key="annotate_unknowns", label="Label strangers",
         type="bool", live=False,
         help="Off = neutral Visitor boxes (recommended). Needs restart."),
    dict(section="face", key="antispoof_enabled", label="Anti-spoof gate",
         type="bool", live=True,
         help="Reject photos-on-screen / printouts. Model loads on first enable."),
    dict(section="face", key="antispoof_threshold", label="Anti-spoof strictness",
         type="number", min=0.1, max=0.9, step=0.05, live=True,
         help="Min live-probability. Raise = stricter."),
    dict(section="face", key="age_smooth_window", label="Age smoothing window",
         type="int", min=1, max=10, live=False,
         help="Median over last N age estimates. Needs restart."),
    # ---- face: model choice (restart) ----
    dict(section="face", key="recognition_model", label="Embedding model",
         type="text", live=False,
         help="ArcFace recommended. Changing models REQUIRES full re-enrollment!"),
    dict(section="face", key="detector_backend", label="Face detector",
         type="text", live=False,
         help="retinaface (accurate) / mediapipe (fast) / opencv (fastest, weakest)."),
    # ---- detector ----
    dict(section="detector", key="conf", label="Person confidence",
         type="number", min=0.1, max=0.9, step=0.05, live=True,
         help="Lower catches distant people + more false boxes."),
    dict(section="detector", key="process_every", label="Detect every Nth frame",
         type="int", min=1, max=4, live=False,
         help="2 halves YOLO CPU cost (display stays smooth). Needs restart."),
    dict(section="detector", key="track_lost_after_s", label="Track memory (s)",
         type="number", min=1, max=10, step=0.5, live=False,
         help="How long a hidden person keeps their track ID. Needs restart."),
    # ---- qr ----
    dict(section="qr", key="enabled", label="QR scanning on",
         type="bool", live=True, help="Master switch for code detection."),
    dict(section="qr", key="cooldown_s", label="Repeat cooldown (s)",
         type="number", min=0, max=120, step=1, live=True,
         help="Same code ignored for this long after a scan."),
    dict(section="qr", key="max_width", label="Fast-pass width",
         type="int", min=320, max=1280, live=False,
         help="Downscaled pass for near codes. Needs restart."),
    dict(section="qr", key="fullres_fallback", label="Distance fallback",
         type="bool", live=False,
         help="Retry at full resolution when fast pass misses. Needs restart."),
    # ---- vitality ----
    dict(section="vitality.weights", key="age", label="Age weight",
         type="number", min=0, max=1, step=0.05, live=True, help=""),
    dict(section="vitality.weights", key="motion", label="Motion weight",
         type="number", min=0, max=1, step=0.05, live=True, help=""),
    dict(section="vitality.weights", key="posture", label="Posture weight",
         type="number", min=0, max=1, step=0.05, live=True, help=""),
    dict(section="vitality.weights", key="activity", label="Activity weight",
         type="number", min=0, max=1, step=0.05, live=True, help=""),
    # ---- source ----
    dict(section="source", key="webcam_index", label="Webcam index",
         type="int", min=0, max=9, live=False,
         help="Use --scan previews to identify. Needs restart."),
    dict(section="source", key="webcam_width", label="Width",
         type="int", min=640, max=1920, live=False,
         help="Requested capture mode (driver may refuse). Needs restart."),
    dict(section="source", key="webcam_height", label="Height",
         type="int", min=480, max=1080, live=False,
         help="Requested capture mode. Needs restart."),
    # ---- display ----
    dict(section="display", key="face_zoom_enabled", label="Face zoom inset",
         type="bool", live=False, help="Magnified face, top-right. Needs restart."),
    dict(section="display", key="roster_enabled", label="Roster sidebar",
         type="bool", live=False, help="Who's-in-frame panel. Needs restart."),
]

def _split(path: str) -> List[str]:
    return path.split(".")


def _get(cfg: dict, path: str):
    cur = cfg
    for part in _split(path):
        if not isinstance(cur, dict):
            return None
        cur = cur.get(part)
    return cur


def current_values(cfg: dict) -> Dict[str, Any]:
    """Schema fields only (never secrets) for the settings form."""
    out: Dict[str, Any] = {}
    for f in FIELDS:
        path = f"{f['section']}.{f['key']}"
        out[path] = _get(cfg, path)
    return out


def coerce(field: dict, value: Any) -> Tuple[bool, Any]:
    """Validate + clamp one value. Returns (ok, cleaned)."""
    t = field["type"]
    try:
        if t == "bool":
            if isinstance(value, str):
                return True, value.lower() in ("1", "true", "on", "yes")
            return True, bool(value)
        if t == "int":
            v = int(float(value))
            return True, max(field["min"], min(field["max"], v))
        if t == "number":
            v = float(value)
            return True, max(field["min"], min(field["max"], v))
        return True, str(value)  # text: model/backend names
    except (TypeError, ValueError):
        return False, None


def load_yaml(path: str) -> Tuple[Any, Any]:
    """Comment-preserving load (ruamel). Returns (data, yaml_instance)."""
    from ruamel.yaml import YAML
    yml = YAML()
    yml.preserve_quotes = True
    with open(path, encoding="utf-8") as fh:
        return yml.load(fh), yml


def apply_save(config_path: str, values: Dict[str, Any]) -> Tuple[List[str], List[str], List[str]]:
    """Validate `values` ({'section.key': v}), persist to yaml (comments kept).

    Returns (applied_live_paths, restart_paths, rejected_paths). Live vs
    restart comes from the schema; actual live application happens via the
    on_config_save hook in main.py — this function only records which is which.
    """
    data, yml = load_yaml(config_path)
    live, restart, rejected = [], [], []
    for path, raw in values.items():
        # section itself may contain dots (vitality.weights)
        field = next((f for f in FIELDS if f"{f['section']}.{f['key']}" == path), None)
        if field is None:
            rejected.append(path)
            continue
        ok, clean = coerce(field, raw)
        if not ok:
            rejected.append(path)
            continue
        node = data
        parts = _split(f"{field['section']}.{field['key']}")
        for part in parts[:-1]:
            node = node.setdefault(part, {})
        node[parts[-1]] = clean
        (live if field["live"] else restart).append(path)
    with open(config_path, "w", encoding="utf-8") as fh:
        yml.dump(data, fh)
    return live, restart, rejected


def apply_live_config(cfg: dict, face_engine=None, qr_detector=None,
                      person_detector=None, vitality=None) -> List[str]:
    """Push live-flagged values into running objects. Returns applied paths.

    Objects are duck-typed (only attribute assignment + set_antispoof_enabled),
    so this works with the real components or test doubles.
    """
    applied = []
    face = cfg.get("face", {})
    if face_engine is not None:
        for key, attr in (("cosine_threshold", "threshold"),
                          ("match_margin", "match_margin"),
                          ("match_topk", "match_topk"),
                          ("match_votes", "match_votes"),
                          ("min_blur", "min_blur"),
                          ("identity_patience", "identity_patience"),
                          ("reassign_margin", "reassign_margin"),
                          ("antispoof_threshold", "antispoof_threshold"),
                          ("auto_register_min_face_px", "auto_min_face_px")):
            if key in face:
                try:
                    setattr(face_engine, attr, type(getattr(face_engine, attr))(face[key]))
                    applied.append(f"face.{key}")
                except (TypeError, ValueError, AttributeError):
                    pass
        if "antispoof_enabled" in face:
            face_engine.set_antispoof_enabled(bool(face["antispoof_enabled"]))
            applied.append("face.antispoof_enabled")
    qr = cfg.get("qr", {})
    if qr_detector is not None:
        if "enabled" in qr:
            qr_detector.enabled = bool(qr["enabled"])
            applied.append("qr.enabled")
        if "cooldown_s" in qr:
            qr_detector.cooldown_s = float(qr["cooldown_s"])
            applied.append("qr.cooldown_s")
    det = cfg.get("detector", {})
    if person_detector is not None and "conf" in det:
        person_detector.conf = float(det["conf"])
        applied.append("detector.conf")
    vit = (cfg.get("vitality", {}).get("weights", {}) or {})
    if vitality is not None:
        for key, attr in (("age", "w_age"), ("motion", "w_motion"),
                          ("posture", "w_posture"), ("activity", "w_activity")):
            if key in vit:
                try:
                    setattr(vitality, attr, float(vit[key]))
                    applied.append(f"vitality.weights.{key}")
                except (TypeError, ValueError):
                    pass
    return applied
