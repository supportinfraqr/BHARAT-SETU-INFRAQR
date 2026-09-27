# Derivable Insights — What We Can Extrapolate From Person Data

Source signals already produced by the pipeline (`main.py`, `src/`):

| Signal | Where it comes from | Stored / available as |
|---|---|---|
| Person bbox + track ID | `person_detector.py` (YOLOv8n + ByteTrack) | `Track.bbox`, `Track.centers`, `Track.speed()`, `Track.active` |
| Presence state + intervals | `person_detector.py` hysteresis | `presence_intervals` table |
| Face identity + match distance | `face_engine.py` (Facenet512, cosine) | `sightings.person_id`, `match_distance` |
| Age estimate (median-smoothed) + group | `face_engine.py` + `annotate.age_group()` | `sightings.age_estimate` → Young <30 / Middle-aged 30–59 / Old 60+ |
| Motion energy | `vitality.compute_motion_energy()` (frame differencing) | `vitality_scores.components` JSON |
| Posture (upright vs bent/collapsed) | `VitalityScorer.bbox_aspect_ratio()` | `vitality_scores.components` JSON |
| Activity ratio | `VitalityScorer` sliding window | `vitality_scores.components` JSON |
| Composite vitality score 0–100 | `vitality.py` | `vitality_scores.score` (every 5 s per track) |
| QR / barcode scans | `qr_detector.py` (10 s cooldown) | `code_scans` table + `known_codes` |
| Visit sessions | `main.py` sighting lifecycle | `sightings` table (`track_id`, `ts_start`, `ts_end`) |

---

## Tier 1 — Already stored, just query (`report.py` / SQL, no code changes)

1. **Footfall** — entries/exits per hour/day (`sightings.ts_start`).
2. **Live occupancy + absence %** — current active tracks; `presence_intervals`.
3. **Dwell time per visit** — `ts_end - ts_start` per sighting.
4. **Dwell time per person** — sum over all sightings with the same `person_id`.
5. **Returning-visitor rate** — distinct `person_id`s seen on 2+ `track_id`s ÷ total visitors.
6. **Age demographics** — histogram of `age_estimate`; counts per Young / Middle-aged / Old.
7. **Known vs unknown ratio** — matched names vs `Unknown` (staff-vs-visitor split if staff are enrolled).
8. **New faces per day** — auto-registered `ID-XXXX` persons by `enrolled_at` date.
9. **QR scans per visitor / per hour** — `code_scans` joined against concurrent sightings.
10. **Average vitality per person / per hour** — `AVG(vitality_scores.score)` grouped by `person_id` or time bucket.

## Tier 2 — Easy derivations from existing signals (small code, no new models)

11. **Loitering flag** — dwell > threshold (e.g. 5 min) AND low motion energy → HUD toast + DB flag. Slots into `vitality.py` / `main.py` HUD.
12. **Fall / collapse alert** — aspect ratio flips wide (posture component crashes) AND motion → ~0 → alert. Same slot as above; highest welfare value.
13. **Running / rushing flag** — `Track.speed()` above threshold for N consecutive frames.
14. **Stillness / welfare alarm** — person present but motion energy ~0 for > threshold (e.g. 60 s).
15. **Crowd density** — live `len(tracks)` + per-minute max count history → quiet / busy / crowded bands.
16. **Peak-hours heatmap** — sighting starts bucketed by hour-of-day × day-of-week.
17. **Direction flow (in/out counting)** — compare first vs last bbox center against a configurable counting line. Needs the line drawn once; then ±1 counters in `person_detector.py`.
18. **Queue length estimate** — count of slow-moving, closely spaced tracks in a zone (needs a zone polygon in config).
19. **Visit frequency & regularity per person** — visits/day, usual arrival hour, avg gap between visits (all from `sightings` + `person_id`).
20. **Vitality trend per person** — first-visit vs latest-visit average vitality (rising / stable / falling).
21. **Staff attendance** — first-seen / last-seen per enrolled name per day (from sightings).
22. **Unknown-face aging** — `Unknown` sightings that later match an auto-registered ID (re-identification across visits via embedding distance).
23. **Camera-attention score** — face-box size ÷ person-box size over time (how close/frontal people get).
24. **Dwell-zone map** — accumulate bbox-center heatmap over a session (numpy histogram → overlay or saved PNG).

## Tier 3 — Needs a new model, input, or calibration

25. **Pose / action labels** (sitting, bending, hands-up, lying) — needs YOLOv8-pose keypoints (`PLAN.md` §5 upgrade path).
26. **Gaze / attention direction** — needs facial landmarks (Dlib/MediaPipe mesh); unreliable below ~100 px faces.
27. **Emotion / expression** — needs an expression classifier; treat CCTV output as indicative only.
28. **Gender** — free if age backend is swapped to MiVOLO (joint age+gender model).
29. **Cross-camera identity** — same person across two feeds; needs body ReID embeddings (OSNet-style), face alone is insufficient at distance.
30. **Abandoned-object detection** — needs background subtraction + object persistence tracking, separate from the person pipeline.
31. **Exact age** — single-frame estimates are ±5 y; median smoothing (done) + a better backend (MiVOLO/ONNX) is the path, not more heuristics.
32. **Cloud-VLM captions** ("person in red jacket crouching") — most descriptive, but breaks the local-only privacy stance and adds latency/cost.
33. **facial attributes** 

---

## Backlog — requested, not yet built

33. **Unified identity across cameras** — today each camera keeps its own DB
    + gallery, so one physical person is logged as two independent identities
    (separate sighting rows, and `Unknown`/duplicate `ID-XXXX` unless enrolled
    in every camera DB). Options, cheapest first:
    a. **Shared gallery, split sightings** — one `data/gallery.sqlite3` for
       `persons` + `face_embeddings` (enroll once, all cameras recognize);
       each camera keeps its own sightings/vitals DB.
    b. **Nightly merge job** — offline script cosine-matches embeddings across
       per-camera DBs into a `same_person` mapping table for reporting only.
    c. **True cross-camera ReID** — body-appearance embeddings + joint tracking.

---

## Suggested build order (value per effort)

1. **Fall/collapse + stillness alerts** — welfare use-case, ~30 lines on existing components.
2. **Loitering + running flags** — same code path as above, different thresholds.
3. **Peak-hours + demographics section in `report.py`** — pure SQL over data already stored.
4. **Direction flow + queue length** — needs config zones/lines, then trivial counting.
5. **Pose upgrade** — only when Tier 2 is exhausted; it's the gateway to all action-level insights.



1. APPA-REAL — probably the best fit for what you want. It has ~7,600 face images, each labeled with both the real (chronological) age and an apparent age — the average of ~38 human votes guessing the person's age from the photo. It's built specifically to study the gap between real and perceived age. The task involves predicting a person's apparent age based on visual features of aging rather than their actual chronological age, and this dataset provides ground truth for both. 
arxiv

2. FG-NET + crowdsourced guesses — FG-NET is a classic aging dataset: it contains 1,002 photos of 82 individuals' faces, each with a biological age as ground truth. Han et al. (2015) added a companion set of human guesses: 165 Amazon Mechanical Turk workers gave their own age estimates on the photos, so each photo has 10 human guesses on average, from 60.73 answers per worker on average. This is a very direct "actual age vs. human-guessed age" dataset. 
arxiv
arxiv

3. ChaLearn LAP (2015/2016) "Apparent Age Estimation" challenges — Widely used benchmark where each face has a "ground truth" apparent age derived from multiple human raters, used to compare against model predictions. These are small-scale apparent age datasets collected in the wild, as opposed to the large-scale real-age dataset MORPH used elsewhere. 
arxiv

4. Adience — One of the largest in-the-wild facial age databases, used because getting precise actual age is hard, so it instead provides approximate age-range annotations — useful if you want coarse actual-age buckets vs. predictions. 
bmva-archive

5. MORPH-II — the largest dataset with precise actual (not apparent) ages: over 55,000 facial images from more than 13,000 individuals, with ages ranging from 16 to 77, mostly African (77%) and European (19%) subjects. Used heavily to benchmark model-predicted age vs. true age (MAE metric). 
arxiv

6. UTKFace / IMDB-WIKI — Large-scale (UTKFace has ~20k+ images with real ages; IMDB-WIKI has 523,051 facial images of celebrities crawled from IMDB and Wikipedia, with ages ranging 0–100) — mostly used for model-vs-actual-age comparisons, less so human-guess data. Note UTKFace's ages were themselves partly machine-estimated then human-checked, so it's not pure ground truth. 
arxiv

7. MegaAge / MegaAge-Asian — MegaAge-Asian is a newer dataset of 40,000 Asian faces aged 0–70, meant to increase racial diversity and generalization for age models.