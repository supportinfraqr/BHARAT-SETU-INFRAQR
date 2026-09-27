import cv2

urls = [
    ("rtsp.stream demo", "rtsp://rtsp.stream/pattern"),
    ("Axis ONVIF demo cam", "rtsp://demo:demo@ipvmdemo.dyndns.org:554/onvif-media/media.amp?profile=1"),
    ("HiOF lecture stream", "rtsp://freja.hiof.no:1935/rtplive/definst/hwstream.stream"),
]

for name, url in urls:
    cap = cv2.VideoCapture(url)
    cap.set(cv2.CAP_PROP_OPEN_TIMEOUT_MSEC, 8000)
    cap.set(cv2.CAP_PROP_READ_TIMEOUT_MSEC, 5000)
    ok = False
    if cap.isOpened():
        ok, frame = cap.read()
    print(f"{name:24s} -> {'OK ' + str(frame.shape) if ok else 'unreachable'}")
    cap.release()
