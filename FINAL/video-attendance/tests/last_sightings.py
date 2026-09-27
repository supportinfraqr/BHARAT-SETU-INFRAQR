import sys
import time

sys.path.insert(0, ".")

import yaml

from src.database import Database

cfg = yaml.safe_load(open("config.yaml"))
db = Database(cfg.get("postgres", {}))
cutoff = time.time() - 180
rows = db.conn.execute(
    """SELECT s.id, COALESCE(p.name, s.name, 'Unknown'), s.age_estimate, s.match_distance,
              s.ts_end - s.ts_start,
              (SELECT ROUND(AVG(score), 1) FROM vitality_scores v WHERE v.sighting_id = s.id)
       FROM sightings s LEFT JOIN persons p ON p.id = s.person_id
       WHERE s.ts_start > %s ORDER BY s.id""",
    (cutoff,),
).fetchall()
print(f"{len(rows)} sightings in the last 3 min:")
for r in rows[:12]:
    d = f"{r[3]:.2f}" if r[3] is not None else "-"
    print(f"  #{r[0]:<3} {r[1]:<18} age~{str(r[2]):<5} match_d={d:<6} dur={round(r[4] or 0)}s vit={r[5]}")
vs = db.conn.execute(
    "SELECT COUNT(*), ROUND(AVG(score), 1) FROM vitality_scores WHERE ts > %s",
    (cutoff,),
).fetchone()
print("vitality samples:", vs[0], "| avg:", vs[1])
db.close()
