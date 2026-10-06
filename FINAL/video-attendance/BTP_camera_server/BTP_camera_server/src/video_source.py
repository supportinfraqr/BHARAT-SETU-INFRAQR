import time
import threading
from dataclasses import dataclass
from typing import Optional, List, Tuple

import cv2

from src.ivideon import (
    IvideonError,
    resolve_ivideon_hls,
    resolve_owdb_camera,
)


@dataclass
class SourceInfo:
    kind: str
    uri: str


class VideoSource:
    def __init__(self, config: dict):
        self.cfg = config["source"]
        self._cap: Optional[cv2.VideoCapture] = None
        self._lock = threading.Lock()
        self._frame = None
        self._ok = False
        self._running = False
        self._ended = False
        self._paced = False
        self._consumed = threading.Event()
        self._thread: Optional[threading.Thread] = None
        self.info: Optional[SourceInfo] = None
        self._candidates: List[SourceInfo] = []
        self._cand_idx = -1

    def _candidate_sources(self) -> List[SourceInfo]:
        out: List[SourceInfo] = []
        mode = self.cfg.get("mode", "auto")
        if mode in ("auto", "ivideon"):
            for entry in self.cfg.get("ivideon_cameras", []):
                cam = entry["id"] if isinstance(entry, dict) else str(entry)
                out.append(SourceInfo("ivideon", cam))
            owdb = self.cfg.get("openwebcamdb") or {}
            key = owdb.get("api_key")
            if key:
                for slug in owdb.get("webcams", []):
                    try:
                        cam, name = resolve_owdb_camera(str(slug), str(key))
                        print(f"[video] owdb '{slug}' -> ivideon {cam} ({name})")
                        out.append(SourceInfo("ivideon", cam))
                    except Exception as e:
                        print(f"[video] owdb lookup failed for '{slug}': {e}")
        if mode in ("auto", "rtsp"):
            for u in self.cfg.get("rtsp_urls", []):
                out.append(SourceInfo("rtsp", u))
        if mode in ("auto", "http"):
            for u in self.cfg.get("http_urls", []):
                out.append(SourceInfo("rtsp", u))
        if mode in ("auto", "file"):
            for f in self.cfg.get("local_files", []):
                out.append(SourceInfo("file", str(f)))
        if mode in ("auto", "webcam"):
            out.append(SourceInfo("webcam", str(self.cfg.get("webcam_index", 0))))
        return out

    def _try_open(self, src: SourceInfo) -> bool:
        open_uri = src.uri
        if src.kind == "ivideon":
            try:
                open_uri = resolve_ivideon_hls(src.uri)
                print(f"[video] resolved {src.uri} -> hls")
            except IvideonError as e:
                print(f"[video] {e}")
                return False
            cap = cv2.VideoCapture(open_uri)
        elif src.kind == "webcam":
            # Backend fallback: DSHOW can refuse a camera that MSMF (Windows'
            # modern backend) opens fine, and vice versa after driver updates.
            # Retries cover transient busy states; persistent failure means
            # another app holds the camera (single opener only), it is
            # unplugged, or camera privacy is off (Settings -> Privacy).
            backends = [cv2.CAP_DSHOW]
            if hasattr(cv2, "CAP_MSMF"):
                backends.append(cv2.CAP_MSMF)
            backends.append(cv2.CAP_ANY)
            cap = None
            for backend in backends:
                for _ in range(2):
                    try:
                        cap = cv2.VideoCapture(int(src.uri), backend)
                        if cap.isOpened():
                            break
                    except Exception:
                        cap = None
                    time.sleep(1.0)
                if cap is not None and cap.isOpened():
                    break
                if cap is not None:
                    try:
                        cap.release()
                    except Exception:
                        pass
                    cap = None
            if cap is None or not cap.isOpened():
                print(f"[video] webcam {src.uri} busy or unavailable: close other "
                      f"apps using the camera (only one program at a time), "
                      f"check it is plugged in and camera privacy is on.")
                return False
            try:
                # DirectShow otherwise settles on the sensor's default mode
                # (usually 640x480). MJPG unlocks the HD modes on most UVC
                # webcams; the connect log prints what was actually granted.
                cap.set(cv2.CAP_PROP_FOURCC,
                        cv2.VideoWriter.fourcc(*"MJPG"))
                cap.set(cv2.CAP_PROP_FRAME_WIDTH,
                        float(self.cfg.get("webcam_width", 1280)))
                cap.set(cv2.CAP_PROP_FRAME_HEIGHT,
                        float(self.cfg.get("webcam_height", 720)))
            except Exception:
                pass
        else:
            cap = cv2.VideoCapture(src.uri)
            if src.kind == "rtsp":
                cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        if not cap.isOpened():
            cap.release()
            return False
        ok, frame = cap.read()
        if not ok or frame is None:
            cap.release()
            return False
        with self._lock:
            self._frame = frame
            self._ok = True
        self._cap = cap
        self._paced = src.kind == "file"
        fh, fw = frame.shape[:2]
        print(f"[video] connected to {src.kind}: {src.uri} (frame {fw}x{fh})")
        return True

    def connect(self) -> bool:
        self._candidates = self._candidate_sources()
        for idx, src in enumerate(self._candidates):
            if self._try_open(src):
                self.info = src
                self._cand_idx = idx
                return True
            print(f"[video] failed to open {src.kind}: {src.uri}")
        return False

    def start(self) -> bool:
        if not self.connect():
            return False
        self._running = True
        self._thread = threading.Thread(target=self._grab_loop, daemon=True)
        self._thread.start()
        return True

    def _reopen_current(self) -> bool:
        delay = float(self.cfg.get("reconnect_delay_s", 5))
        attempts = 0
        while self._running:
            time.sleep(delay)
            if not self._running:
                break
            if self.info and self._try_open(self.info):
                return True
            attempts += 1
            if attempts >= 3 and self._candidates:
                print("[video] source unavailable, failing over to next candidate")
                for offset in range(1, len(self._candidates)):
                    idx = (self._cand_idx + offset) % len(self._candidates)
                    src = self._candidates[idx]
                    print(f"[video] trying {src.kind}: {src.uri}")
                    if self._try_open(src):
                        self.info = src
                        self._cand_idx = idx
                        return True
                attempts = 0
        return False

    def _grab_loop(self) -> None:
        while self._running:
            cap = self._cap
            if cap is None:
                break
            ok, frame = cap.read()
            if not ok or frame is None:
                with self._lock:
                    self._ok = False
                if self.info and self.info.kind in ("rtsp", "ivideon"):
                    print("[video] stream lost, reconnecting...")
                    try:
                        cap.release()
                    except Exception:
                        pass
                    if not self._reopen_current():
                        break
                    continue
                else:
                    with self._lock:
                        self._ok = False
                    self._ended = True
                    break
            with self._lock:
                self._frame = frame
                self._ok = True

            if self._paced:
                while self._running and not self._consumed.is_set():
                    time.sleep(0.005)
                self._consumed.clear()

    @property
    def ended(self) -> bool:
        return self._ended

    def read(self) -> Tuple[bool, Optional[any]]:
        with self._lock:
            if self._ok and self._frame is not None:
                frame = self._frame.copy()
                if self._paced:
                    self._consumed.set()
                return True, frame
            return False, None

    def stop(self) -> None:
        self._running = False
        if self._thread is not None:
            self._thread.join(timeout=3)
        if self._cap is not None:
            try:
                self._cap.release()
            except Exception:
                pass
