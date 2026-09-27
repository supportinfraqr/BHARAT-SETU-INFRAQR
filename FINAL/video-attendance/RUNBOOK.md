# BTP CCTV Analytics — Runbook (start here)

Real-time CCTV analytics: person detection + tracking, face recognition with
enrolled identities, age + age-group estimation, vitality scoring, QR/barcode
capture, and a live web dashboard. This file consolidates GUIDE, SETUP, PLAN,
PROJECT_OVERVIEW, INSIGHTS, and FACE_DETECTION into one step-by-step guide.
Those files remain for design history; **this one is the current truth**.

All commands run in PowerShell from the `BTP_camera` folder.

---

## 0. Prerequisites

| Requirement | Notes |
|---|---|
| Python **3.10** (`py -3.10 --version`) | DeepFace/TensorFlow wheels are stable here |
| **Postgres** server (local installer or remote) | Replaces the old SQLite file; pipeline auto-creates databases |
| Webcam, or an RTSP/file source | Run `main.py --scan` later to confirm |

---

## 1. One-time environment setup

```powershell
py -3.10 -m venv .venv
.\.venv\Scripts\pip install -r requirements.txt
```

First pipeline start downloads model weights once (~600 MB DeepFace/age +
retinaface + ArcFace into `~\.deepface\weights`, ~2 MB anti-spoof weights
into `data\models\`, `yolov8n.pt` ~6 MB). Allow time + internet.

## 2. Postgres setup (once per machine)

```sql
CREATE ROLE btp LOGIN PASSWORD 'choose-a-password';
CREATE DATABASE btp OWNER btp;
```

Then in `config.yaml`:

```yaml
postgres:
  host: 127.0.0.1
  port: 5432
  dbname: btp        # per-camera runs use btp_<name> automatically
  user: btp
  password: ""       # or export BTP_PG_PASSWORD (preferred); full
                     # BTP_DATABASE_URL override also supported
```

Migrating from the old SQLite files (keeps every row + embedding, ids intact):

```powershell
.\.venv\Scripts\python tools\migrate_sqlite_to_pg.py --sqlite data\db.sqlite3
.\.venv\Scripts\python tools\migrate_sqlite_to_pg.py --sqlite data\db_gate.sqlite3 --dbname btp_gate
```

## 3. Check your cameras

```powershell
.\.venv\Scripts\python main.py --scan            # probes webcams + rtsp, suggests free ports
.\.venv\Scripts\python main.py --list-cameras    # entries under config `cameras:`
```

* `--scan` saves one preview per working webcam to `data\snapshots\scan_camN.jpg` —
  **open them** to tell virtual cameras (DroidCam/OBS) apart from the real sensor.
* The startup line `[video] connected to webcam: 1 (frame 1280x720)` is authoritative:
  if it says `640x480`, the HD request was refused (see Troubleshooting).
* Put the real index in `source.webcam_index` (HD 1280×720 is requested automatically).
* People should pass at **1.5–2.5 m**, facing the camera, with light falling *on* faces.

## 4. Enroll known people

```powershell
# Bulk: one subfolder per person (+ optional <Name>\meta.json)
.\.venv\Scripts\python enroll.py --bulk people

# One person, with metadata
.\.venv\Scripts\python enroll.py --name "Danish" --images photo1.jpg photo2.jpg --meta role=Guard

# Inspect / maintain
.\.venv\Scripts\python enroll.py --list
.\.venv\Scripts\python enroll.py --info "Danish"
.\.venv\Scripts\python enroll.py --audit    # confusion + duplicate check
.\.venv\Scripts\python enroll.py --prune    # delete same-face-twice rows, list outliers
.\.venv\Scripts\python enroll.py --clear    # wipe ALL enrollments (history kept, unlinked)
```

Rules that save pain later: 3–5 sharp frontal photos per person at realistic
distance (~2 m, not just selfies); one face per photo (multi-face files enroll
*every* face found — `+2 from file` means check that file); enrollment is
refused automatically if the face already belongs to someone else.
**Restart the pipeline after enrolling** (gallery loads at startup).
Enroll into each database you run with (default `btp`, per-camera `btp_<name>`).

## 5. Run the pipeline

```powershell
.\.venv\Scripts\python main.py                                        # auto failover (config order)
.\.venv\Scripts\python main.py --source 1                             # webcam index
.\.venv\Scripts\python main.py --source rtsp://127.0.0.1:8554/cctv    # RTSP / http / file / ivideon://
.\.venv\Scripts\python main.py --web 8080                             # + browser dashboard
.\.venv\Scripts\python main.py --camera gate                          # one multi-CCTV entry
powershell -ExecutionPolicy Bypass -File tools\run_all_cameras.ps1    # ALL cameras, one window each
.\.venv\Scripts\python main.py --duration 60                          # auto-stop after 60 s
```

Keys in the video window: `Q` quit · `S` snapshot · `F` fullscreen · `A` anti-spoof on/off.
Web dashboard: `http://<pc-ip>:<port>/` (styled stats + `/stats` JSON).

Local RTSP test rig (no camera needed):

```powershell
powershell -ExecutionPolicy Bypass -File tests\run_rtsp_rig.ps1   # serves rtsp://127.0.0.1:8554/cctv
.\.venv\Scripts\python main.py --source rtsp://127.0.0.1:8554/cctv
```

## 6. Reports

```powershell
.\.venv\Scripts\python report.py               # default database
.\.venv\Scripts\python report.py --db btp_gate # per-camera database
.\.venv\Scripts\python report.py --json
.\.venv\Scripts\python tests\last_sightings.py # recent activity snapshot
```

## 7. Reading the screen

* Person label: `#1 Danish · Guard | ~24y Young | d=0.12 | vit 82`
  (`d` = cosine distance, 0 = identical; must clear 0.6 to name).
* Face pill adds `· 96px b210` = face size + sharpness diagnostic.
  Healthy: ≥80px, blur well above `min_blur`. Small/soft = camera problem, not model.
* Colors: **green** = enrolled match, **amber** = unknown/`Visitor`, **blue** = still scanning.
* Non-enrolled faces show `#3 · Visitor` only (matching still runs + logs; see
  `face.annotate_unknowns`). Photos-on-screen never match while anti-spoof is on.
* Age groups: Young <30 · Middle-aged 30–59 · Old ≥60 (soft ±5y boundaries).

## 8. Tuning cheat-sheet (current values)

| Knob | Value | Raise it when | Lower it when |
|---|---|---|---|
| `face.cosine_threshold` | 0.6 | strangers get named | enrolled people missed |
| `face.match_margin` | 0.08 | lookalikes flip names | too many `Visitor`s on real people |
| `face.match_topk / match_votes` | 3 / 2 | — (majority-of-3 vote; rarely needs change) | — |
| `face.min_blur` | 15 | phantom matches on mush | real faces never attempt (soft cam) |
| `face.auto_register_min_face_px` | 60 | far-field junk attempts | working-zone faces skipped |
| `face.antispoof_threshold` | 0.4 | phone photos get named | real people stuck `Visitor` |
| `face.identity_patience` | 2 | names flicker | corrections feel slow |
| `detector.conf` | 0.35 | random objects boxed | distant people missed |
| `detector.process_every` | 1–2 | CPU struggling (2 halves YOLO cost; display is flicker-free) | tracking feels steppy |
| `qr.fullres_width` | 1280 | distant QRs missed | QR stage slow |

Decision rule: change one knob, watch `d=` values for a few minutes, keep the
wider gap between known-cluster and stranger-cluster. Never tune blind.

## 9. Concepts (60-second version)

* **`track_id` vs `person_id`**: track = unbroken on-screen continuity (dies after
  4 s gone); person = persistent DB identity. Re-visits link via face match.
* **Matching** (all three must pass): KNN majority (2 of top-3 gallery images agree)
  → distance ≤ 0.6 → beats runner-up person by ≥ 0.08. Searched via FAISS index
  (exact cosine, rebuilt from Postgres each boot).
* **Gallery hygiene**: one face per enrollment photo; `--audit` after batches,
  `--prune` on `DUPE` lines. Same-photo-twice is refused automatically.
* **Age** is a median over the last 5 estimates per track (no flicker).
* **Vitality** 0–100 = 0.45·age + 0.25·motion + 0.15·posture + 0.15·activity,
  logged every 5 s with JSON components for offline re-weighting.
* **QR**: near codes via fast 640px pass, distant codes via full-res fallback;
  same payload ignored for `cooldown_s` (10 s); JWT-looking payloads display shortened.
* **Per-camera isolation**: own source, web port, Postgres db (`btp_<name>`),
  snapshot folder. Cross-camera identity is *not* linked (see INSIGHTS.md backlog).

## 10. Troubleshooting

| Symptom | Cause → fix |
|---|---|
| `connected ... (frame 640x480)` on a 720p cam | DirectShow default mode → automatic HD request usually fixes; if refused, check Camera app/driver for HD mode |
| `VIDEOIO(DSHOW)... can't be used to capture` / `no video source available` | transient exclusive-lock: pipeline retries DSHOW→MSMF→ANY automatically; persistent = another app holds cam / unplugged / Settings→Privacy→Camera off |
| Wrong app/camera opens (DroidCam index theft) | re-run `--scan`, eyeball `scan_camN.jpg`, update `webcam_index`; or disable the virtual device |
| Faces stuck `scanning...` | face below 60px / softer than `min_blur` → check pill readout; or gallery empty for current model → re-enroll |
| Right person, wrong name | duplicate identity in gallery → `enroll.py --audit`, `--prune`, re-enroll cleanly |
| Real person flickers `Visitor` | borderline `d=` near 0.6 or margin fails → add enrollment photos at *that* distance/lighting |
| Phone photo gets named | anti-spoof off → press `A` or set `face.antispoof_enabled: true` |
| `no video source available` (all fail) | all configured sources down; check config order/network |
| Boxes flicker with `process_every: 2` | fixed — cached redraw; update if on an old checkout |
| Postgres connection refused | server not running / wrong host-port-user in `postgres:` / password via `BTP_PG_PASSWORD` |
| Console Unicode errors | `$env:PYTHONIOENCODING="utf-8"` |

## 11. File map + further reading

```
main.py / enroll.py / report.py / config.yaml / requirements.txt
src/: video_source, person_detector, face_engine, face_worker, face_engine(vote),
     vector_store (FAISS), antispoof, qr_detector, vitality, database (Postgres),
     annotate, ivideon, web_stream
tools/: run_all_cameras.ps1, migrate_sqlite_to_pg.py, MediaMTX/FFmpeg rig
tests/: benchmark, find_duplicates, last_sightings, + dev utilities
data/: snapshots/, models/ (anti-spoof ONNX)
people/: enrollment source folders (example layout)
```

* `INSIGHTS.md` — everything derivable from the data + build backlog.
* `FACE_DETECTION.md` — detection levers + which readout maps to which fix.
* `PLAN.md` / `PROJECT_OVERVIEW.md` / `GUIDE.md` / `SETUP.md` — design history
  (note: predate the Postgres + ArcFace + voting changes where they conflict).
