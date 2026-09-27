# Improving Face Detection — Levers That Matter

Face **detection** = finding the face box. (Recognition = naming it; see
`INSIGHTS.md` Tier 2–3 and the ArcFace notes.) Detection fails are silent:
`process_crop()` returns `None` and the track stays `scanning...`, so every
lever below is about getting a box out of more frames.

## Already implemented in this project

| Lever | Where | Status |
|---|---|---|
| RetinaFace backend (landmarks + alignment, far better than Haar on angle/size) | `config.yaml → face.detector_backend` | ✅ done |
| HD feed request (MJPG 1280×720; DirectShow defaults to 480p) | `src/video_source.py`, `source.webcam_width/height` | ✅ done |
| Minimum face size floor (skip hopelessly small faces) | `face.auto_register_min_face_px: 60` | ✅ done, tune per camera |
| Blur gate (skip mushy frames instead of misdetecting) | `face.min_blur: 15` | ✅ done |
| Face-position gate (reject boxes low/off-center in the person crop — usually hands, posters) | `src/face_engine.py process_crop` | ✅ done |
| Live quality readout (`· 96px b210` on face pills) tells you which lever to pull | `src/annotate.py face_quality_text` | ✅ done |

## Config knobs you can turn today (no code)

1. **`face.detector_backend`** — `retinaface` (current) → try `mediapipe` (faster on CPU, slightly weaker) or `yolov8` (consistent with your person detector, needs weights). One line + restart.
2. **`face.auto_register_min_face_px`** — lower (50) attempts smaller faces (more misses *and* more false boxes); raise (80) only judges clean close faces. Match it to camera distance: 60 ≈ 2.5m cutoff on 720p.
3. **`face.min_blur`** — lower (or 0 = off) attempts softer frames; raise if background patterns keep producing phantom face boxes.
4. **`source.webcam_width/height`** — 1280×720 now; only raise if the sensor genuinely offers more (pipeline caps processing at 1280 wide anyway).
5. **`detector.infer_width` / `process_every`** — these govern *person* boxes, but a missed person means its face is never even attempted. Raise `infer_width` toward 960 if small/distant people vanish.

## Code changes (future work, roughly ordered by value)

6. **Detect-then-track for faces** — run retinaface once per track, then follow the box with a cheap tracker (KCF/optical flow) between refreshes instead of redetecting every 2 s. Fewer detector calls, no flicker, lower CPU.
7. **CLAHE / illumination normalization** on the person crop before detection (already flagged in `PLAN.md` risks) — backlit and night-IR faces are the top miss cause after size.
8. **Multi-scale detection pass** — run the detector on a 1.5× upscale of the person crop when the first pass finds nothing; catches 40–60px faces at ~2× CPU cost for that frame only.
9. **Relax the position/centering gates per camera** — the upper-55% + 5–95% rules assume a standing adult facing the camera; ceiling-mounted or seated scenarios need looser bounds (config-ify them first).
10. **Face-box propagation across frames** — reuse last known face position as the detector's search prior/ROI instead of scanning the whole person crop (faster + fewer background false hits like the Haar ghosts seen in testing).
11. **Dedicated face detector (YOLO-face / YuNet)** replacing DeepFace's backend call — single-purpose models with better small-face recall; YuNet runs ~1 ms on CPU.
12. **Denoise before detect** — light fast denoising on night frames; noise creates phantom boxes and destroys small-face recall simultaneously.
13. **GPU inference** — Ultralytics + ONNX paths auto-use CUDA when present; roughly 5–10× detector headroom, which funds options 6–8 for free.

## Camera / environment (no code, often the biggest win)

14. **Distance** — every halving of distance quadruples face pixels. 1.5–2 m on 720p is the working band; past ~3 m detection rate falls off a cliff regardless of model.
15. **Light on faces** — a bright window *behind* the subject silhouettes the face into undetectability on any backend. Light source belongs behind the camera.
16. **Focus at working distance** — fixed-focus laptop webcams tuned for arm's length go soft at 2 m; softness kills small-face detection before the blur gate even sees it.
17. **Shutter / motion blur** — walking subjects + slow auto-exposure = smeared faces. More light (faster shutter) beats any detector upgrade here.
18. **Mounting angle** — near-frontal, near-eye-level maximizes detectable faces; steep ceiling angles show foreheads, not faces.

## How to decide which lever (use the readout)

* Face pill shows **small px** (`<60px`) → levers 4, 5, 8, 14.
* Face pill shows **low blur** (`b` near `min_blur`) → levers 3, 7, 12, 15, 16, 17.
* Big sharp faces still undetected → levers 1, 6, 9, 10, 11, 18.
* Nothing detected anywhere, ever → check the startup `frame WxH` log first (the 480p trap), then lever 1's weights/backend.
