import argparse
import json
import os
import sys

import numpy as np

from src.database import Database
from src.face_engine import FaceEngine
import yaml


def load_config(path: str) -> dict:
    with open(path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def parse_meta(pairs) -> dict:
    """Parse repeatable --meta KEY=VALUE flags into a dict."""
    meta: dict = {}
    for item in pairs or []:
        if "=" not in item:
            print(f"[enroll] ignoring bad --meta {item!r} (use KEY=VALUE)")
            continue
        k, v = item.split("=", 1)
        meta[k.strip()] = v.strip()
    return meta


def main() -> int:
    p = argparse.ArgumentParser(description="Enroll known persons into the face database")
    p.add_argument("--config", default="config.yaml")
    p.add_argument("--name", help="person name")
    p.add_argument("--images", nargs="+", default=[],
                   help="image files or a folder of images for one person")
    p.add_argument("--bulk", metavar="FOLDER",
                   help="folder containing one subfolder per person (subfolder name = person name)")
    p.add_argument("--notes", default="")
    p.add_argument("--meta", action="append", default=[],
                   metavar="KEY=VALUE",
                   help="free-form metadata (repeatable); e.g. --meta role=Guard --meta shift=night."
                        " In --bulk mode, <person_dir>/meta.json is read instead when present.")
    p.add_argument("--list", action="store_true")
    p.add_argument("--clear", action="store_true",
                   help="delete ALL enrolled persons + embeddings (sighting "
                        "history rows are kept, unlinked). Use with --config "
                        "to clear a camera-specific DB.")
    p.add_argument("--audit", action="store_true",
                   help="gallery hygiene check: per-person spread + cross-person "
                        "confusion pairs (same-photo-enrolled-twice shows d<0.2)")
    p.add_argument("--prune", action="store_true",
                   help="clean the whole gallery after enrolling: auto-deletes "
                        "cross-person near-duplicates (same photo under two "
                        "names) and lists outlier candidates for manual review. "
                        "New enrollments are guarded automatically; this covers "
                        "rows enrolled before the guard existed.")
    p.add_argument("--info", metavar="NAME", help="show full detail (incl. metadata) for one person")
    p.add_argument("--code", metavar="LABEL",
                   help="enroll a known QR/barcode string under LABEL (use with --value)")
    p.add_argument("--value", help="the exact decoded string payload for --code")
    p.add_argument("--list-codes", action="store_true", help="list enrolled known codes")
    args = p.parse_args()

    config = load_config(args.config)
    db = Database(config.get("postgres", {}))

    if args.list_codes:
        rows = db.list_known_codes()
        if not rows:
            print("no codes enrolled yet")
        for cid, label, value, ts in rows:
            print(f"  [{cid}] {label}: {value!r}  (enrolled {ts})")
        return 0

    if args.code:
        if not args.value:
            print("provide --value STRING together with --code LABEL")
            return 1
        cid = db.add_known_code(args.code, args.value)
        print(f"[enroll] code '{args.code}' enrolled (id={cid}, value={args.value!r})")
        return 0

    if args.clear:
        n_per = db.conn.execute("SELECT COUNT(*) FROM persons").fetchone()[0]
        n_emb = db.conn.execute("SELECT COUNT(*) FROM face_embeddings").fetchone()[0]
        # Sightings reference persons via FK: unlink first, keep history rows
        # (their text `name` column still shows who was seen).
        db.conn.execute("UPDATE sightings SET person_id = NULL WHERE person_id IS NOT NULL")
        db.conn.execute("DELETE FROM face_embeddings")
        db.conn.execute("DELETE FROM persons")
        db.commit()
        print(f"[enroll] cleared {n_per} persons + {n_emb} embeddings "
              f"(sighting history kept, names preserved as text)")
        return 0

    if args.list:
        rows = db.list_persons()
        if not rows:
            print("no persons enrolled yet")
        for pid, name, ts in rows:
            n_emb = len([e for e in db.load_gallery(config["face"]["recognition_model"]) if e[0] == pid])
            meta = db.get_person_meta(pid)
            meta_s = f"  meta={meta}" if meta else ""
            print(f"  [{pid}] {name}  ({n_emb} embeddings, enrolled {ts}){meta_s}")
        return 0

    if args.audit:
        from src.face_engine import cosine_distance
        model = config["face"]["recognition_model"]
        thr = float(config["face"].get("cosine_threshold", 0.32))
        rows = db.conn.execute(
            """SELECT fe.id, fe.person_id, p.name, fe.embedding
               FROM face_embeddings fe JOIN persons p ON p.id = fe.person_id
               WHERE fe.model_name = ?""", (model,)).fetchall()
        items = [(i, pid, n, np.frombuffer(b, dtype=np.float32)) for i, pid, n, b in rows]
        by_name = {}
        for _, pid, n, e in items:
            by_name.setdefault(n, []).append(e / np.linalg.norm(e))
        print(f"[audit] {len(items)} embeddings, {len(by_name)} persons (thr={thr})")
        dupes = 0
        for a in range(len(items)):
            for b in range(a + 1, len(items)):
                if items[a][1] == items[b][1]:
                    continue
                d = cosine_distance(items[a][3], items[b][3])
                if d <= thr * 0.5:
                    dupes += 1
                    print(f"  DUPE emb#{items[a][0]} ({items[a][2]}) vs "
                          f"emb#{items[b][0]} ({items[b][2]}): d={d:.4f}")
        names = sorted(by_name)
        for i in range(len(names)):
            for j in range(i + 1, len(names)):
                A = np.stack(by_name[names[i]])
                B = np.stack(by_name[names[j]])
                dmin = float((1 - A @ B.T).min())
                if dmin <= thr:
                    print(f"  CONFUSION {names[i]} vs {names[j]}: min_d={dmin:.3f}")
        if not dupes:
            print("  no cross-person near-duplicates")
        return 0

    if args.prune:
        from src.face_engine import cosine_distance
        model = config["face"]["recognition_model"]
        dupe_guard = float(config["face"].get("cosine_threshold", 0.32)) * 0.5
        outlier_max = float(config["face"].get("enroll_outlier_max", 0.55))
        rows = db.conn.execute(
            """SELECT fe.id, fe.person_id, p.name, fe.embedding
               FROM face_embeddings fe JOIN persons p ON p.id = fe.person_id
               WHERE fe.model_name = ?""", (model,)).fetchall()
        items = [(i, pid, n, np.frombuffer(b, dtype=np.float32)) for i, pid, n, b in rows]
        by_pid = {}
        for _, pid, _, e in items:
            by_pid.setdefault(pid, []).append(e)
        doomed: dict = {}  # emb_id -> reason

        def medoid_excl(pid: int, skip_id: int):
            """Medoid of person's embeddings excluding one row (None if singleton)."""
            rest = [e for (i, p, _, e) in items if p == pid and i != skip_id]
            if not rest:
                return None
            E = np.stack([e / np.linalg.norm(e) for e in rest])
            return E[int(np.argmax((E @ E.T).sum(axis=1)))]

        for a in range(len(items)):
            for b in range(a + 1, len(items)):
                ia, ib = items[a][0], items[b][0]
                if items[a][1] == items[b][1] or ia in doomed or ib in doomed:
                    continue
                d = cosine_distance(items[a][3], items[b][3])
                if d > dupe_guard:
                    continue
                # Same face under two names: evict the one further from its
                # own cluster (the intruder). Singleton loses to a cluster;
                # two singletons keep the earlier enrollment.
                ma = medoid_excl(items[a][1], ia)
                mb = medoid_excl(items[b][1], ib)
                da = cosine_distance(items[a][3], ma) if ma is not None else 0.0
                db_ = cosine_distance(items[b][3], mb) if mb is not None else 0.0
                if (ma is None) != (mb is None):
                    loser = ia if ma is None else ib
                elif abs(da - db_) < 1e-9:
                    loser = max(ia, ib)
                else:
                    loser = ia if da > db_ else ib
                kept = items[b] if loser == ia else items[a]
                doomed[loser] = (f"same face as {kept[2]!r} emb#{kept[0]} "
                                 f"(d={d:.3f})")
        for eid, reason in doomed.items():
            db.conn.execute("DELETE FROM face_embeddings WHERE id = ?", (eid,))
            print(f"  deleted emb#{eid}: {reason}")
        db.commit()
        # Outliers are report-only: small clusters make auto-delete unsafe.
        reported = 0
        for pid in sorted(by_pid):
            alive = [(i, n, e) for (i, p, n, e) in items
                     if p == pid and i not in doomed]
            if len(alive) < 3:
                continue
            E = np.stack([e / np.linalg.norm(e) for (_, _, e) in alive])
            med = E[int(np.argmax((E @ E.T).sum(axis=1)))]
            for (i, n, e) in alive:
                d = cosine_distance(e, med)
                if d > outlier_max:
                    reported += 1
                    print(f"  review emb#{i} ({n}): far from own cluster (d={d:.3f})")
        print(f"[prune] {len(doomed)} deleted, {reported} outlier candidates "
              f"for review (of {len(items)} embeddings)")
        return 0

    if args.info:
        row = db.get_person_by_name(args.info)
        if not row:
            print(f"no person named {args.info!r}")
            return 1
        pid = row[0]
        n_emb = len([e for e in db.load_gallery(config["face"]["recognition_model"]) if e[0] == pid])
        print(f"  [{pid}] {args.info}")
        print(f"  embeddings : {n_emb} ({config['face']['recognition_model']})")
        print(f"  metadata   : {json.dumps(db.get_person_meta(pid), indent=2)}")
        return 0

    model = config["face"]["recognition_model"]
    backend = config["face"]["detector_backend"]

    if args.bulk:
        dupe_guard = float(config["face"].get("cosine_threshold", 0.32)) * 0.5
        outlier_max = float(config["face"].get("enroll_outlier_max", 0.55))
        added = FaceEngine.build_gallery_from_folder(db, args.bulk, model, backend,
                                                     dupe_guard=dupe_guard,
                                                     outlier_max=outlier_max)
        # Per-person metadata sidecars: data/faces/<Name>/meta.json
        if os.path.isdir(args.bulk):
            for entry in sorted(os.listdir(args.bulk)):
                person_dir = os.path.join(args.bulk, entry)
                sidecar = os.path.join(person_dir, "meta.json")
                if not (os.path.isdir(person_dir) and os.path.isfile(sidecar)):
                    continue
                try:
                    meta = json.load(open(sidecar, encoding="utf-8"))
                except Exception as e:
                    print(f"[enroll] bad meta.json for {entry}: {e}")
                    continue
                row = db.get_person_by_name(entry)
                if row and isinstance(meta, dict):
                    db.set_person_meta(row[0], meta)
                    print(f"[enroll] {entry}: metadata {meta}")
        print(f"[enroll] bulk enrollment complete, {added} embeddings added")
        return 0

    if not args.name or not args.images:
        print("provide --name and --images, or use --bulk FOLDER; use --list to view DB")
        return 1

    meta = parse_meta(args.meta)
    row = db.get_person_by_name(args.name)
    if row:
        pid = row[0]
        if meta:
            db.set_person_meta(pid, meta)
    else:
        pid = db.add_person(args.name, args.notes, meta)

    from deepface import DeepFace
    files = []
    for item in args.images:
        if os.path.isdir(item):
            for fname in sorted(os.listdir(item)):
                if fname.lower().endswith((".jpg", ".jpeg", ".png")):
                    files.append(os.path.join(item, fname))
        else:
            files.append(item)

    dupe_guard = float(config["face"].get("cosine_threshold", 0.32)) * 0.5
    outlier_max = float(config["face"].get("enroll_outlier_max", 0.55))
    seen = list(db.load_gallery(model))
    count = 0
    for path in files:
        try:
            reps = DeepFace.represent(
                img_path=path, model_name=model,
                detector_backend=backend, enforce_detection=False,
            )
        except Exception as e:
            print(f"[enroll] no face in {path}: {e}")
            continue
        for rep in reps:
            emb = np.array(rep["embedding"], dtype=np.float32)
            refusal = FaceEngine.check_enrollment(
                seen, pid, args.name, emb, dupe_guard, outlier_max)
            if refusal is not None:
                print(f"[enroll] refused {path}: {refusal}")
                continue
            db.add_embedding(pid, model, emb)
            seen.append((pid, args.name, emb))
            count += 1
        print(f"[enroll] {args.name}: +{len(reps)} from {path}")

    print(f"[enroll] done: person '{args.name}' (id={pid}), {count} new embeddings")
    return 0


if __name__ == "__main__":
    sys.exit(main())