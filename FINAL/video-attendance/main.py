import argparse
import os
import statistics
import sys
import time
from collections import deque
from typing import Optional

import cv2
import yaml

from src.video_source import VideoSource
from src.person_detector import PersonDetector
from src.face_engine import FaceEngine, TrackStateCache, TrackIdentityTracker
from src.face_worker import FaceWorker
from src.qr_detector import QRDetector
from src.vitality import VitalityScorer, compute_motion_energy
from src.database import Database
from src.annotate import (
    draw_person_box, draw_face_box, draw_qr, draw_hud, save_snapshot,
    draw_help_footer, draw_scan_toast, draw_empty_state, shorten_payload,
    draw_face_zoom, draw_roster_sidebar,  # STAGED ideas 1+3, off by default
    age_group, face_quality_text,
)
from src.web_stream import MJPEGWebServer


def load_config(path: str) -> dict:
    with open(path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="BTP CCTV analytics pipeline")
    p.add_argument("--config", default="config.yaml")
    p.add_argument("--source", default=None,
                   help="override source: webcam index, rtsp:// url, or file path")
    p.add_argument("--no-display", action="store_true")
    p.add_argument("--web", type=int, default=0, metavar="PORT",
                   help="serve the annotated live stream at http://0.0.0.0:PORT")
    p.add_argument("--duration", type=float, default=0.0,
                   help="stop after N seconds (0 = run until quit)")
    p.add_argument("--camera", default=None, metavar="NAME",
                   help="run one entry from config 'cameras:' (multi-CCTV; "
                        "own source, web port, db file, snapshot folder)")
    p.add_argument("--site", default=None, metavar="SITE",
                   help="tag every row with this BSS site (id/slug) so the "
                        "dashboard can show attendance for one site")
    p.add_argument("--antispoof", dest="antispoof",
                   action=argparse.BooleanOptionalAction, default=None,
                   help="force the anti-spoof gate on/off for this run "
                        "(overrides config; can also toggle live with 'a')")
    p.add_argument("--list-cameras", action="store_true",
                   help="list entries from config 'cameras:' and exit")
    p.add_argument("--scan", action="store_true",
                   help="probe local webcams + configured rtsp urls, suggest "
                        "free web ports, then exit (no models loaded)")
    return p.parse_args()


def find_free_port(start: int, tries: int = 20) -> Optional[int]:
    """First bindable TCP port at/after `start` (for per-camera dashboards)."""
    import socket
    for port in range(start, start + tries):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            try:
                s.bind(("0.0.0.0", port))
            except OSError:
                continue
            return port
    return None


def _tcp_reachable(url: str, timeout: float = 2.0):
    """Quick port check for scan probes. True/False, or None if unparsable."""
    import socket
    from urllib.parse import urlparse
    try:
        parts = urlparse(url if "://" in url else "rtsp://" + url)
        host = parts.hostname
        port = parts.port or (554 if (parts.scheme or "rtsp") == "rtsp" else 80)
        if not host:
            return None
        with socket.create_connection((host, port), timeout=timeout):
            pass
        return True
    except Exception:
        return False


def scan_sources(config: dict, max_webcam: int = 9) -> int:
    """Probe which video sources are actually available. No models loaded.

    Saves one preview snapshot per working webcam so virtual cameras
    (DroidCam, OBS, ManyCam) can be told apart from the real sensor
    by looking instead of guessing indices."""
    import os as _os
    snap_dir = config.get("paths", {}).get("snapshots", "data/snapshots")
    _os.makedirs(snap_dir, exist_ok=True)
    print("=== source scan (local webcams) ===")
    live: list = []
    for i in range(max_webcam + 1):
        try:
            cap = cv2.VideoCapture(i, cv2.CAP_DSHOW)
            opened = cap.isOpened()
            frame_ok = False
            if opened:
                ok, fr = cap.read()
                frame_ok = bool(ok and fr is not None)
                if frame_ok:
                    snap = _os.path.join(snap_dir, f"scan_cam{i}.jpg")
                    cv2.imwrite(snap, fr)
                    h, w = fr.shape[:2]
                    print(f"  webcam {i}: OK - frame {w}x{h}, preview: {snap}")
                    live.append(str(i))
                    cap.release()
                    continue
            cap.release()
            print(f"  webcam {i}: {'opened, no frame' if opened else 'not found'}")
        except Exception as e:
            print(f"  webcam {i}: error {e}")
    print("=== source scan (configured rtsp) ===")
    for u in (config.get("source", {}).get("rtsp_urls", []) or []):
        try:
            # Fast TCP pre-check: a dead server refuses in ms, while
            # VideoCapture would stall ~30 s on it. Only probe with
            # VideoCapture when the port actually accepts connections.
            if _tcp_reachable(u, timeout=2.0) is False:
                print(f"  rtsp {u}: unreachable (port closed)")
                continue
            cap = cv2.VideoCapture(u)
            opened = cap.isOpened()
            try:
                cap.release()
            except Exception:
                pass
            print(f"  rtsp {u}: {'reachable' if opened else 'unreachable'}")
            if opened:
                live.append(u)
        except Exception as e:
            print(f"  rtsp {u}: error {e}")
    print("=== suggested free web ports ===")
    port = 8080
    if not live:
        print("  (no live source found - check cameras/cables, then re-run)")
    for src in live:
        free = find_free_port(port, tries=50)
        if free is None:
            print("  (no free ports left near 8080+)")
            break
        print(f"  source {src} -> --web {free}")
        port = free + 1
    return 0


def apply_source_override(config: dict, source: str) -> None:
    cfg = {"mode": "auto", "webcam_index": 0, "rtsp_urls": [], "local_files": [],
           "reconnect_delay_s": config["source"].get("reconnect_delay_s", 5)}
    if source.isdigit():
        cfg["mode"] = "webcam"
        cfg["webcam_index"] = int(source)
    elif source.startswith("ivideon://"):
        cfg["mode"] = "ivideon"
        cfg["ivideon_cameras"] = [source.replace("ivideon://", "", 1)]
        cfg["openwebcamdb"] = config.get("source", {}).get("openwebcamdb", {})
    elif source.lower().startswith(("rtsp://", "http://", "https://")):
        key = "rtsp_urls" if source.lower().startswith("rtsp://") else "http_urls"
        cfg["mode"] = "rtsp" if source.lower().startswith("rtsp://") else "http"
        cfg[key] = [source]
    else:
        cfg["mode"] = "file"
        cfg["local_files"] = [source]
    config["source"] = cfg


def main() -> int:
    args = parse_args()
    config = load_config(args.config)

    if args.list_cameras:
        entries = config.get("cameras", []) or []
        if not entries:
            print("(no entries under 'cameras:' in config)")
        for c in entries:
            print(f"{c.get('name')} | source={c.get('source')} | web_port={c.get('web_port', 0)}")
        return 0
    if args.scan:
        return scan_sources(config)
    if args.antispoof is not None:
        config["face"]["antispoof_enabled"] = bool(args.antispoof)

    # Multi-CCTV: --camera picks one config entry (own source/web port/db).
    # Run one process per camera (separate terminals, or tools\run_all_cameras.ps1).
    cam_name: Optional[str] = None
    web_port = args.web
    if args.camera:
        entry = next((c for c in config.get("cameras", []) or []
                      if str(c.get("name")) == args.camera), None)
        if entry is None:
            # Employer-defined camera (from CCTV Setup): accept the label as long
            # as an explicit --source is supplied. No config.yaml entry needed.
            if not args.source:
                print(f"[main] unknown camera '{args.camera}' (see --list-cameras)")
                return 2
            cam_name = str(args.camera)
        else:
            cam_name = str(entry["name"])
            apply_source_override(config, str(entry["source"]))
            if not args.web and entry.get("web_port"):
                web_port = int(entry["web_port"])
    if args.source:
        apply_source_override(config, args.source)

    paths = config["paths"]
    pg_cfg = dict(config.get("postgres", {}))
    if cam_name:
        snapshots_dir = os.path.join(paths["snapshots"], cam_name)
    else:
        snapshots_dir = paths["snapshots"]
    db = Database(pg_cfg, camera=cam_name, site=args.site)
    db.conn.execute("UPDATE sightings SET ts_end=%s WHERE ts_end IS NULL", (time.time(),))
    db.commit()

    gallery_rows = db.load_gallery(config["face"]["recognition_model"])
    face_engine = FaceEngine(config, gallery_rows, db=db)
    face_worker = FaceWorker(face_engine)
    face_worker.start()
    auto_min_seen = float(config["face"].get("auto_register_min_seen_s", 3.0))
    age_window = max(1, int(config["face"].get("age_smooth_window", 5)))
    age_every = max(1, int(config["face"].get("age_reestimate_every", 3)))
    annotate_unknowns = bool(config["face"].get("annotate_unknowns", False))
    face_cache = TrackStateCache(float(config["face"].get("refresh_interval_s", 2.0)))
    identity_tracker = TrackIdentityTracker(patience=int(config["face"].get("identity_patience", 3)))
    person_detector = PersonDetector(config)
    qr_detector = QRDetector(config, db=db)
    vitality = VitalityScorer(config)

    source = VideoSource(config)
    if not source.start():
        print("[main] no video source available")
        return 1

    show = config.get("display", {}).get("show", True) and not args.no_display
    web_server = None
    if web_port:
        actual = find_free_port(web_port)
        if actual is None:
            print(f"[main] no free web port near {web_port}, dashboard disabled")
        else:
            if actual != web_port:
                print(f"[main] port {web_port} busy, serving instead on {actual}")
            web_server = MJPEGWebServer(actual)
    annotate = show or web_server is not None
    process_every = int(config["detector"].get("process_every", 2))
    base_window = config.get("display", {}).get("window_name", "BTP CCTV Analytics")
    window_name = f"{base_window} - {cam_name}" if cam_name else base_window

    # Resizable window (aspect kept) so maximize / fullscreen scales cleanly.
    # Without this the window defaults to autosize and maximizing just
    # stretches a small bitmap. Toggle fullscreen at runtime with F.
    is_fullscreen = False
    if show:
        flags = cv2.WINDOW_NORMAL
        if hasattr(cv2, "WINDOW_KEEPRATIO"):
            flags |= cv2.WINDOW_KEEPRATIO
        cv2.namedWindow(window_name, flags)
        cv2.resizeWindow(window_name, 1280, 720)

    observations: dict = {}
    sighting_ids: dict = {}
    last_vitality_write: dict = {}
    recent_scans: list = []  # short strings for the on-screen QR toast

    # --- STAGED UX ideas 1+3 (disabled in config.yaml -> zero behavior change).
    # To activate: set display.face_zoom_enabled / display.roster_enabled to
    # true and restart. Nothing else to edit.
    _display_cfg = config.get("display", {})
    face_zoom_on = bool(_display_cfg.get("face_zoom_enabled", False))
    face_zoom_size = int(_display_cfg.get("face_zoom_size", 220))
    roster_on = bool(_display_cfg.get("roster_enabled", False))
    roster_max = int(_display_cfg.get("roster_max_entries", 6))
    zoom_cache: dict = {}  # track_id -> person crop (for the face inset)
    live_vit: dict = {}    # track_id -> last vitality score (for the roster)
    age_hist: dict = {}    # track_id -> deque of recent age estimates (median smoothing)
    age_tick: dict = {}    # track_id -> refresh count (periodic re-estimate schedule)
    meta_cache: dict = {}  # person_id -> metadata dict (one DB hit per person per session)
    prev_gray = None
    frame_idx = 0
    started = time.time()
    fps_smoothed = 0.0
    error_count = 0

    tag = f"camera={cam_name} db={db.params.get('dbname')} " if cam_name else ""
    print(f"[main] running | {tag}gallery size: {len(gallery_rows)} | display: {show}")
    print("[main] keys: q=quit  s=snapshot  f=fullscreen  a=antispoof on/off")

    def draw_track_overlay(frame, track) -> None:
        """Draw person + face boxes for one track from the last known
        observation. Safe to call on skipped frames (process_every > 1):
        boxes persist from cache instead of flickering off every other frame."""
        x1, y1, x2, y2 = track.bbox
        obs = observations.get(track.track_id)
        vit_score = live_vit.get(track.track_id)
        enrolled = (
            obs is not None and obs.person_id is not None
            and not str(obs.name).startswith("ID-")
        )
        if obs is None:
            state, name = "scanning", "scanning..."
        elif enrolled:
            state, name = "known", obs.name
        else:
            state, name = "unknown", "Unknown"
        if not enrolled and not annotate_unknowns:
            draw_person_box(frame, track.bbox, f"#{track.track_id} · Visitor",
                            present=True, state="unknown", vitality=vit_score)
            return
        role = None
        if enrolled:
            if obs.person_id not in meta_cache:
                meta_cache[obs.person_id] = db.get_person_meta(obs.person_id)
            role = meta_cache[obs.person_id].get("role")
        who = f"{name} · {role}" if role else name
        group = age_group(obs.age) if obs is not None else None
        label = f"#{track.track_id} {who}"
        if obs is not None and obs.age is not None:
            label += f" | ~{obs.age}y {group}"
        if obs is not None and obs.distance is not None:
            label += f" | d={obs.distance:.2f}"
        label += f" | vit {vit_score:.0f}" if vit_score is not None else " | vit ?"
        draw_person_box(frame, track.bbox, label, present=True,
                        state=state, vitality=vit_score)
        if obs is not None and obs.face_box is not None:
            fx1, fy1, fx2, fy2 = obs.face_box
            cx_off, cy_off = max(0, x1), max(0, y1)
            face_text = f"{who}"
            if obs.age is not None:
                face_text += f" ~{obs.age}y {group}"
            if obs.distance is not None:
                face_text += f" d={obs.distance:.2f}"
            face_text += (" · " + face_quality_text(
                frame, track.bbox, (fx1, fy1, fx2, fy2)))
            draw_face_box(frame, (fx1, fy1, fx2, fy2),
                          (int(cx_off), int(cy_off)), face_text)

    try:
        while True:
            if args.duration > 0 and time.time() - started >= args.duration:
                break

            ok, frame = source.read()
            if not ok or frame is None:
                if source.ended:
                    print("[main] input ended")
                    break
                time.sleep(0.05)
                if time.time() - started > 30 and frame_idx == 0:
                    print("[main] no frames received, aborting")
                    break
                continue

            t_loop = time.time()
            frame_idx += 1
            # 1280 when a window is shown so fullscreen upscaling stays
            # sharp; detector still downscales to infer_width internally.
            work_width = 1280 if show else (960 if annotate else 640)
            small = cv2.resize(frame, (work_width, int(frame.shape[0] * work_width / frame.shape[1]))) \
                if frame.shape[1] > work_width else frame

            tracks = []
            try:
                if frame_idx % process_every == 0:
                    tracks = person_detector.process(small)

                    cur_gray = cv2.cvtColor(cv2.resize(small, (480, 270)), cv2.COLOR_BGR2GRAY)
                    scale_x = 480 / small.shape[1]
                    scale_y = 270 / small.shape[0]

                    for track in tracks:
                        x1, y1, x2, y2 = track.bbox
                        gx1, gy1 = int(x1 * scale_x), int(y1 * scale_y)
                        gx2, gy2 = int(x2 * scale_x), int(y2 * scale_y)
                        motion = compute_motion_energy(prev_gray, cur_gray, (gx1, gy1, gx2, gy2))

                        if track.track_id not in sighting_ids and track.active:
                            sid = db.start_sighting(track.track_id, None, None)
                            sighting_ids[track.track_id] = sid

                        obs = observations.get(track.track_id)
                        if face_cache.due(track.track_id):
                            crop = small[max(0, y1):min(small.shape[0], y2),
                                         max(0, x1):min(small.shape[1], x2)]
                            if crop.size:
                                # Age smoothing schedule: estimate every refresh
                                # until the median window fills, then only every
                                # age_every-th refresh (cheap, still adaptive).
                                # (Old logic keyed off obs.age being None, which
                                # alternated and caused display flicker.)
                                hist = age_hist.get(track.track_id)
                                n_hist = len(hist) if hist else 0
                                tick = age_tick.get(track.track_id, 0) + 1
                                age_tick[track.track_id] = tick
                                want_age = n_hist < age_window or tick % age_every == 0
                                face_worker.submit(track.track_id, crop, want_age)
                                face_cache.mark(track.track_id)
                                if face_zoom_on:  # STAGED idea 1: keep pixels for inset
                                    zoom_cache[track.track_id] = crop.copy()
                        latest = face_worker.pop_result(track.track_id)
                        if latest is not None:
                            obs = latest
                            locked = identity_tracker.get(track.track_id)

                            if locked is not None:
                                d = (face_engine.distance_to_person(obs.embedding, locked.person_id)
                                     if obs.embedding is not None else None)
                                if d is not None and d <= face_engine.reassign_margin:
                                    obs.person_id, obs.name, obs.distance = locked.person_id, locked.name, d
                                    identity_tracker.note_hit(track.track_id)
                                    if d > face_engine.threshold:
                                        face_engine.enroll_variant(locked.person_id, locked.name, obs.embedding)
                                else:
                                    release = identity_tracker.note_miss(track.track_id)
                                    if not release:
                                        obs.person_id, obs.name = locked.person_id, locked.name
                                    else:
                                        identity_tracker.forget([track.track_id])
                                        if (face_engine.should_auto_register(obs)
                                                and time.time() - track.first_seen >= auto_min_seen):
                                            res = face_engine.register_unknown(obs)
                                            if res is not None:
                                                obs.person_id, obs.name = res
                                                obs.distance = 0.0
                                        if obs.person_id is not None:
                                            identity_tracker.lock(track.track_id, obs.person_id, obs.name)
                            else:
                                if (face_engine.should_auto_register(obs)
                                        and time.time() - track.first_seen >= auto_min_seen):
                                    res = face_engine.register_unknown(obs)
                                    if res is not None:
                                        obs.person_id, obs.name = res
                                        obs.distance = 0.0
                                if obs.person_id is not None:
                                    identity_tracker.lock(track.track_id, obs.person_id, obs.name)

                            # Median age smoothing: feed each fresh estimate into
                            # the per-track window and display the median, so a
                            # single bad frame can't swing the shown age. If this
                            # cycle skipped estimation, keep the previous median
                            # instead of dropping to None (no flicker).
                            if obs.age is not None:
                                hist = age_hist.get(track.track_id)
                                if hist is None:
                                    hist = age_hist[track.track_id] = deque(maxlen=age_window)
                                hist.append(int(obs.age))
                                obs.age = int(round(statistics.median(hist)))
                            else:
                                hist = age_hist.get(track.track_id)
                                if hist:
                                    obs.age = int(round(statistics.median(hist)))

                            observations[track.track_id] = obs
                            sid = sighting_ids.get(track.track_id)
                            if sid is not None:
                                db.update_sighting_identity(
                                    sid, obs.person_id, obs.name, obs.age, obs.distance
                                )

                        aspect = VitalityScorer.bbox_aspect_ratio(track.bbox)
                        vit = vitality.update(track.track_id,
                                              obs.age if obs else None,
                                              motion, aspect)
                        live_vit[track.track_id] = vit.score  # STAGED idea 3: roster data
                        last_write = last_vitality_write.get(track.track_id, 0.0)
                        if t_loop - last_write >= 5.0 and track.active:
                            sid = sighting_ids.get(track.track_id)
                            db.insert_vitality(sid, vit.score, vit.components)
                            last_vitality_write[track.track_id] = t_loop

                        if annotate:
                            draw_track_overlay(small, track)

                    stale = person_detector.stale_track_ids()
                    for tid in stale:
                        sid = sighting_ids.pop(tid, None)
                        if sid is not None:
                            db.end_sighting(sid)
                        observations.pop(tid, None)
                        vitality.forget(tid)
                        zoom_cache.pop(tid, None)  # STAGED idea 1: drop inset pixels
                        live_vit.pop(tid, None)    # STAGED idea 3: drop roster row
                        age_hist.pop(tid, None)    # age smoothing: drop window
                        age_tick.pop(tid, None)    # age smoothing: drop schedule
                    face_cache.forget(stale)
                    face_worker.forget(stale)
                    identity_tracker.forget(stale)

                    for code in qr_detector.detect(small):
                        if annotate:
                            draw_qr(small, code.bbox, code.payload,
                                    code.symbology, code.matched_label)
                        if not code.should_log:
                            continue
                        snap_path = save_snapshot(small, snapshots_dir)
                        db.insert_code_scan(
                            code.payload, code.symbology,
                            code.matched_label, code.match_score, snap_path,
                        )
                        pretty = shorten_payload(code.payload, 60)
                        tag = (f" -> matched '{code.matched_label}' "
                               f"(score={code.match_score:.2f})") if code.matched_label else ""
                        print(f"[qr] captured ({code.symbology}): {pretty!r}{tag}")
                        recent_scans.append(
                            f"{code.matched_label + ': ' if code.matched_label else ''}{code.payload}"
                        )
                        recent_scans[:] = recent_scans[-3:]

                    prev_gray = cur_gray
            except Exception as e:
                error_count += 1
                print(f"[main] frame error #{error_count}: {type(e).__name__}: {e}")
                if error_count > 50:
                    raise

            dt = time.time() - t_loop
            fps_smoothed = 0.9 * fps_smoothed + 0.1 * (1.0 / dt) if dt > 0 else fps_smoothed
            if annotate:
                stats = person_detector.stats()
                status = "● PERSON PRESENT" if person_detector.present else "○ NO PERSON"
                hud = [
                    f"{status} | absent {stats['absence_pct']:.1f}% "
                    f"| up {stats['duration_s']:.0f}s | {fps_smoothed:.1f} fps",
                    f"DB: {len(gallery_rows)} faces | tracks: {len(person_detector.tracks)} "
                    f"| sightings: {len(sighting_ids)} | scans: {len(recent_scans)} "
                    f"| spoof:{'on' if face_engine.antispoof_enabled else 'off'}",
                ]
                active_tracks = [t for t in person_detector.tracks.values()
                                 if t.active]
                if frame_idx % process_every != 0:
                    # Detection skipped this frame: redraw last known boxes so
                    # the display doesn't flicker with process_every > 1.
                    for track in active_tracks:
                        draw_track_overlay(small, track)
                if not active_tracks:
                    draw_empty_state(small)
                draw_hud(small, hud)
                # --- STAGED idea 1: face zoom inset (needs display.face_zoom_enabled=true).
                # Shows the first track with a detected face, magnified top-right.
                if face_zoom_on:
                    for track in active_tracks:
                        obs = observations.get(track.track_id)
                        crop = zoom_cache.get(track.track_id)
                        if obs is None or obs.face_box is None or crop is None:
                            continue
                        fx1, fy1, fx2, fy2 = obs.face_box
                        ch, cw = crop.shape[:2]
                        fx1, fy1 = max(0, fx1), max(0, fy1)
                        fx2, fy2 = min(cw, fx2), min(ch, fy2)
                        if fx2 > fx1 and fy2 > fy1:
                            draw_face_zoom(small, crop[fy1:fy2, fx1:fx2],
                                           f"#{track.track_id} {obs.name}",
                                           size=face_zoom_size)
                            break
                # --- STAGED idea 3: roster sidebar (needs display.roster_enabled=true).
                # One row per live track; drawn before the toast so scans stay visible.
                if roster_on:
                    entries = []
                    for track in active_tracks:
                        obs = observations.get(track.track_id)
                        enrolled = (
                            obs is not None and obs.person_id is not None
                            and not str(obs.name).startswith("ID-")
                        )
                        if obs is None:
                            state, name = "scanning", "scanning..."
                        elif enrolled:
                            state, name = "known", obs.name
                        else:
                            state, name = "unknown", "Unknown"
                        entries.append({
                            "track_id": track.track_id, "name": name,
                            "age": obs.age if obs else None,
                            "vitality": live_vit.get(track.track_id),
                            "state": state,
                        })
                    draw_roster_sidebar(small, entries, max_entries=roster_max)
                draw_scan_toast(small, recent_scans)
                draw_help_footer(small)
                if web_server is not None:
                    web_server.update(small)
                    web_server.set_stats({
                        "status": status,
                        "fps": round(fps_smoothed, 1),
                        "tracks": len(person_detector.tracks),
                        "gallery": len(gallery_rows),
                        "absence_pct": stats["absence_pct"],
                        "last_qr": shorten_payload(recent_scans[-1], 80) if recent_scans else None,
                    })
            if show:
                cv2.imshow(window_name, small)
                key = cv2.waitKey(1) & 0xFF
                if key in (ord("q"), 27):
                    break
                if key == ord("s"):
                    path = save_snapshot(small, snapshots_dir)
                    print(f"[main] snapshot saved: {path}")
                if key in (ord("f"), ord("F")):
                    is_fullscreen = not is_fullscreen
                    cv2.setWindowProperty(
                        window_name, cv2.WND_PROP_FULLSCREEN,
                        cv2.WINDOW_FULLSCREEN if is_fullscreen else cv2.WINDOW_NORMAL,
                    )
                    print(f"[main] fullscreen {'on' if is_fullscreen else 'off'}")
                if key in (ord("a"), ord("A")):
                    on = face_engine.set_antispoof_enabled(
                        not face_engine.antispoof_enabled)
                    print(f"[main] anti-spoof {'on' if on else 'off'}")
    except KeyboardInterrupt:
        pass
    finally:
        person_detector.finalize()
        face_worker.stop()
        if web_server is not None:
            web_server.stop()
        for tid, sid in list(sighting_ids.items()):
            db.end_sighting(sid)
        for interval in person_detector.get_present_intervals():
            if interval["end"] is None:
                interval["end"] = time.time()
            db.insert_presence_interval(interval["start"], interval["end"], True)
        db.commit()
        source.stop()
        cv2.destroyAllWindows()

    stats = person_detector.stats()
    print("\n===== SESSION SUMMARY =====")
    print(f"uptime          : {stats['duration_s']:.1f} s")
    print(f"person present  : {stats['present_s']:.1f} s")
    print(f"absence percent : {stats['absence_pct']}%")
    print(f"processing fps  : {fps_smoothed:.1f}")
    report = db.session_report()
    print(f"sightings       : {len(report['sightings'])}")
    print(f"qr scans        : {len(report.get('code_scans', report.get('qr_scans', [])))}")
    print("run `python report.py` for the full report")
    db.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())