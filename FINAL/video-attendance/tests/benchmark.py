import sys
import time

import cv2
import yaml

sys.path.insert(0, ".")
cfg = yaml.safe_load(open("config.yaml"))

from ultralytics import YOLO
from src.face_engine import FaceEngine
from src.database import Database
from src.qr_detector import QRDetector

frame = cv2.imread("tests/assets/person1.jpg")
big = cv2.resize(frame, (1280, 720))
crop = big[100:600, 400:800]

def bench(name, fn, n=10):
    fn()
    t0 = time.time()
    for _ in range(n):
        fn()
    dt = (time.time() - t0) / n * 1000
    print(f"{name:38s} {dt:7.1f} ms")
    return dt

model = YOLO(cfg["detector"]["model"])
bench("YOLOv8n track 1280x720", lambda: model.track(big, persist=True, classes=[0], imgsz=640, conf=0.35, verbose=False))
bench("YOLOv8n track 640x360", lambda: model.track(cv2.resize(big, (640, 360)), persist=True, classes=[0], imgsz=640, conf=0.35, verbose=False))

db = Database({**cfg.get("postgres", {}), "dbname": "btp_test"})
gallery = db.load_gallery("Facenet512")
engine = FaceEngine(cfg, gallery, db=db)
bench("FaceEngine.process_crop (rec+age)", lambda: engine.process_crop(crop), n=5)

qr = QRDetector(cfg)
bench("QRCodeDetector 960px", lambda: qr.detect(big))

try:
    import torch
    print("torch cuda available:", torch.cuda.is_available())
except Exception:
    print("torch cuda check failed")

import onnxruntime
print("onnxruntime providers:", onnxruntime.get_available_providers())
