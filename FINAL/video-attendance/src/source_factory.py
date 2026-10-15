"""Source factory: one doorway for every CCTV flavour.

VideoSource already speaks webcam / RTSP / HTTP / file (/ ivideon legacy).
This module adds what a 3000-feed fleet needs around it:
- a single `parse()` for the `--source` / `cameras[].source` syntax,
- credential redaction for logs (RTSP URLs carry user:pass),
- a `probe()` health check used by the fleet runner and --scan.

New transports (ONVIF, HLS, USB grabbers) implement `build_video_config()`
here; the pipeline keeps consuming plain VideoSource configs.
"""
from typing import Dict
from urllib.parse import urlsplit, urlunsplit


SUPPORTED_SCHEMES = ("webcam-index", "rtsp://", "http://", "https://", "file")


def redact(uri: str) -> str:
    """Strip user:pass from a URI for safe logging."""
    try:
        if "://" not in uri or "@" not in uri:
            return uri
        parts = urlsplit(uri)
        host = parts.hostname or ""
        if parts.port:
            host += f":{parts.port}"
        return urlunsplit((parts.scheme, host, parts.path, parts.query, parts.fragment))
    except Exception:
        return uri


def parse(source: str, base_source_cfg: Dict = None) -> Dict:
    """Build a `source:` config dict from --source syntax. Mirrors the logic
    in main.apply_source_override so fleet tools and the pipeline agree."""
    base = dict(base_source_cfg or {})
    cfg = {"mode": "auto", "webcam_index": 0, "rtsp_urls": [], "local_files": [],
           "reconnect_delay_s": base.get("reconnect_delay_s", 5)}
    for key in ("webcam_width", "webcam_height", "ivideon_cameras",
                "openwebcamdb", "rtsp_urls", "http_urls", "local_files"):
        if key in base:
            cfg[key] = base[key]
    if source.isdigit():
        cfg["mode"] = "webcam"
        cfg["webcam_index"] = int(source)
    elif source.startswith("ivideon://"):  # legacy public-cam path
        cfg["mode"] = "ivideon"
        cfg["ivideon_cameras"] = [source.replace("ivideon://", "", 1)]
        cfg["openwebcamdb"] = base.get("openwebcamdb", {})
    elif source.lower().startswith(("rtsp://", "http://", "https://")):
        key = "rtsp_urls" if source.lower().startswith("rtsp://") else "http_urls"
        cfg["mode"] = "rtsp" if source.lower().startswith("rtsp://") else "http"
        cfg[key] = [source]
    else:
        cfg["mode"] = "file"
        cfg["local_files"] = [source]
    return cfg


def probe(config: Dict, timeout_s: float = 8.0) -> Dict:
    """Open the source briefly, grab one frame, report health. No models."""
    import time
    import cv2
    from src.video_source import VideoSource
    t0 = time.time()
    vs = VideoSource({"source": config})
    if not vs.start():
        return {"ok": False, "error": "open failed", "uri": redact(str(config))}
    try:
        ok, frame = vs.read()
        if not ok or frame is None:
            # File sources pace delivery; allow one beat.
            time.sleep(0.3)
            ok, frame = vs.read()
        if not ok or frame is None:
            return {"ok": False, "error": "no frame", "uri": redact(str(config))}
        h, w = frame.shape[:2]
        return {"ok": True, "width": w, "height": h,
                "open_s": round(time.time() - t0, 2),
                "uri": redact(vs.info.uri if vs.info else "?"),
                "kind": vs.info.kind if vs.info else "?"}
    finally:
        vs.stop()
