"""Camera registry: the fleet's source of truth for "which cameras exist".

At 2 cameras this is a thin wrapper over config.yaml `cameras:`. At 3000 it
is the seam where the YAML list gets replaced by a DB table / API without
touching the pipeline: everything downstream consumes CameraSpec, never raw
YAML. Sharding (`shard_index`/`shard_count`) lets N nodes split the fleet
deterministically — node i runs specs where (position % count) == i.
"""
from copy import deepcopy
from dataclasses import dataclass, field
from typing import Any, Dict, List


@dataclass
class CameraSpec:
    name: str
    source: str
    web_port: int = 0
    host: str = "127.0.0.1"  # node serving this camera's dashboard (status only)
    face_level: bool = False  # close-up face-height mount (see FACE_LEVEL_PRESET)
    overrides: Dict[str, Any] = field(default_factory=dict)
    profile: str = ""  # profiler label, informational (near-sharp, far-soft, ...)


# Face-level mount preset: the camera sits at face height, faces fill the
# frame. Far-field defaults are wrong here — tiny-face attempts only catch
# background posters, soft blur gates eat nothing (close faces are sharp),
# and bbox posture is meaningless for headshots (weight -> ~0, motion and
# activity carry the liveness signal). Merged UNDER explicit overrides.
FACE_LEVEL_PRESET: Dict[str, Any] = {
    "detector": {"infer_width": 640, "conf": 0.40},
    "face": {"auto_register_min_face_px": 80, "min_blur": 25,
             "refresh_interval_s": 1.5},
    "vitality": {"weights": {"age": 0.40, "motion": 0.30,
                              "posture": 0.05, "activity": 0.25}},
}


def _deep_merge(base: dict, over: dict) -> dict:
    out = deepcopy(base)
    for key, val in (over or {}).items():
        if isinstance(val, dict) and isinstance(out.get(key), dict):
            out[key] = _deep_merge(out[key], val)
        else:
            out[key] = deepcopy(val)
    return out


def _spec_from_entry(entry: dict) -> CameraSpec:
    return CameraSpec(
        name=str(entry.get("name")),
        source=str(entry.get("source", "")),
        web_port=int(entry.get("web_port", 0) or 0),
        host=str(entry.get("host", "") or "127.0.0.1"),
        face_level=bool(entry.get("face_level", False)),
        overrides=dict(entry.get("overrides", {}) or {}),
        profile=str(entry.get("profile", "") or ""),
    )


def load_camera_specs(config: dict) -> List[CameraSpec]:
    """Parse config.yaml `cameras:` into specs. Empty list = single-cam mode."""
    return [_spec_from_entry(e) for e in config.get("cameras", []) or []]


def load_registry(config: dict, registry_url: str = "") -> List[CameraSpec]:
    """Shared registry for multi-server fleets. `registry_url` (or
    `fleet.registry_url`) serves a JSON list of camera entries in the same
    shape as config `cameras:` — every node loads the same list, then runs
    only its shard. Falls back to local YAML when unset."""
    import json
    import urllib.request
    url = registry_url or ((config.get("fleet", {}) or {}).get("registry_url", "") or "")
    if not url:
        return load_camera_specs(config)
    req = urllib.request.Request(url, headers={"User-Agent": "BTP-CCTV/1.0",
                                                "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=15) as resp:
        entries = json.loads(resp.read().decode("utf-8", "replace"))
    if not isinstance(entries, list):
        raise ValueError(f"registry at {url} did not return a JSON list")
    return [_spec_from_entry(e) for e in entries]


def find_spec(specs: List[CameraSpec], name: str) -> CameraSpec:
    for spec in specs:
        if spec.name == name:
            return spec
    raise KeyError(f"unknown camera '{name}'")


def apply_camera_overrides(config: dict, spec: CameraSpec) -> dict:
    """Return a per-camera config copy.

    Merge order: global -> FACE_LEVEL_PRESET (if face_level) -> explicit
    spec.overrides. Unknown keys pass through so new tunables don't need
    registry changes.
    """
    merged = dict(config)
    if spec.face_level:
        merged = _deep_merge(merged, FACE_LEVEL_PRESET)
    merged = _deep_merge(merged, spec.overrides)
    return merged


def shard_specs(specs: List[CameraSpec], shard_index: int, shard_count: int) -> List[CameraSpec]:
    """Deterministic fleet split for multi-node runs. Node `shard_index`
    (0-based) of `shard_count` total. shard_count=1 returns all specs."""
    if shard_count <= 1:
        return list(specs)
    if not 0 <= shard_index < shard_count:
        raise ValueError(f"shard_index {shard_index} out of range for {shard_count} shards")
    return [s for i, s in enumerate(specs) if i % shard_count == shard_index]
