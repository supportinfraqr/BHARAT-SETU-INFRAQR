import cv2
from ultralytics import YOLO

cap = cv2.VideoCapture("tests/assets/cctv_sim.mp4")
model = YOLO("yolov8n.pt")
qr = cv2.QRCodeDetector()

i = 0
person_hits = 0
qr_hits = []
while True:
    ok, frame = cap.read()
    if not ok:
        break
    if i % 10 == 0:
        r = model.predict(frame, classes=[0], conf=0.25, verbose=False)[0]
        n = len(r.boxes)
        person_hits += n
        if i < 200:
            print(f"frame {i}: persons={n}")
        ok2, decoded, _, _ = qr.detectAndDecodeMulti(frame)
        texts = [t for t in decoded if t]
        if texts:
            qr_hits.append((i, texts))
    i += 1

print("total frames:", i, "total person boxes:", person_hits)
print("qr hits:", qr_hits[:5], "count:", len(qr_hits))
