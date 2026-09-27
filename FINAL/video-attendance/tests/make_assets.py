import os

import cv2
import numpy as np
import ultralytics

assets_dir = os.path.join(os.path.dirname(ultralytics.__file__), "assets")
bus_path = os.path.join(assets_dir, "bus.jpg")
print("using", bus_path, os.path.exists(bus_path))

person_img = cv2.imread(bus_path)
ph, pw = person_img.shape[:2]
target_h = 640
target_w = int(pw * target_h / ph)
person_big = cv2.resize(person_img, (target_w, target_h))

qr_encoder = cv2.QRCodeEncoder.create()
qr_img = qr_encoder.encode("BTP-VISITOR-12345")

bg = np.full((720, 1280, 3), 60, dtype=np.uint8)
cv2.putText(bg, "CAM 01 - LOBBY", (30, 40), cv2.FONT_HERSHEY_SIMPLEX, 1.0,
            (200, 200, 200), 2, cv2.LINE_AA)

fourcc = cv2.VideoWriter_fourcc(*"mp4v")
out = cv2.VideoWriter("tests/assets/cctv_sim.mp4", fourcc, 10.0, (1280, 720))

qr_resized = cv2.resize(qr_img, (200, 200), interpolation=cv2.INTER_NEAREST)
qr_bgr = cv2.cvtColor(qr_resized, cv2.COLOR_GRAY2BGR)

total_frames = 150
for i in range(total_frames):
    frame = bg.copy()
    x = int(320 + 80 * np.sin(i / 25.0))
    y = int(40 + 8 * np.sin(i / 10.0))
    ph_fit = min(target_h, 720 - y)
    pw_fit = int(target_w * ph_fit / target_h)
    resized = cv2.resize(person_big, (pw_fit, ph_fit))
    frame[y:y + ph_fit, x:x + pw_fit] = resized
    if 30 <= i <= 100 or i > 120:
        frame[500:700, 1040:1240] = qr_bgr
    if 90 < i <= 110:
        frame = bg.copy()
        cv2.putText(frame, "CAM 01 - LOBBY", (30, 40), cv2.FONT_HERSHEY_SIMPLEX, 1.0,
                    (200, 200, 200), 2, cv2.LINE_AA)
        frame[500:700, 1040:1240] = qr_bgr
    out.write(frame)

out.release()

test_frame_path = "tests/assets/qr_check.png"
probe = bg.copy()
probe[500:700, 1040:1240] = qr_bgr
cv2.imwrite(test_frame_path, probe)

det = cv2.QRCodeDetector()
ok, decoded, _, _ = det.detectAndDecodeMulti(probe)
print("qr self-test:", ok, decoded)
