import sys

sys.path.insert(0, ".")
import yaml
from src.database import Database
from src.face_engine import cosine_distance

cfg = yaml.safe_load(open("config.yaml"))
db = Database(cfg.get("postgres", {}))
rows = db.load_gallery(cfg["face"]["recognition_model"])
threshold = float(cfg["face"]["cosine_threshold"])
auto_ids = [(pid, name, emb) for pid, name, emb in rows if name.startswith("ID-")]
print(f"auto-registered persons: {len(auto_ids)} (threshold={threshold})")
dups = 0
for i in range(len(auto_ids)):
    for j in range(i + 1, len(auto_ids)):
        pid1, n1, e1 = auto_ids[i]
        pid2, n2, e2 = auto_ids[j]
        d = cosine_distance(e1, e2)
        if d <= threshold:
            dups += 1
            print(f"  DUPLICATE: {n1} (id={pid1}) <-> {n2} (id={pid2})  dist={d:.3f}  likely same person")
if dups == 0 and auto_ids:
    print("  no pairs below threshold — no obvious duplicates")
elif not auto_ids:
    print("  no auto IDs found")

for pid, name, emb in rows:
    if name.startswith("ID-"):
        n_emb = sum(1 for p, _, _ in rows if p == pid)
        if n_emb > 1:
            print(f"  {name}: {n_emb} embeddings (multi-view, good)")

print("\nTo remove a duplicate person, run:")
print("  python enroll.py --prune   (auto-deletes same-face-twice rows)")
print("or delete one id via psql:  DELETE FROM face_embeddings WHERE person_id = <ID>;")
print("                            DELETE FROM persons WHERE id = <ID>;")
