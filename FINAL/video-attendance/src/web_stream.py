"""MJPEG web dashboard: styled page + live image + JSON stats polling."""
import json
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import cv2

_PAGE = """<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>BTP CCTV Analytics</title>
<style>
body{margin:0;background:#14161a;color:#eee;font-family:Segoe UI,Arial,sans-serif}
header{display:flex;align-items:center;gap:10px;padding:10px 16px;background:#1e2127;border-bottom:1px solid #333}
.dot{width:12px;height:12px;border-radius:50%;background:#e5484d}
.dot.on{background:#46c46a;box-shadow:0 0 8px #46c46a}
h1{font-size:17px;margin:0;font-weight:600}
.sub{font-size:12px;color:#9aa0aa}
main{padding:12px 16px;max-width:1100px;margin:0 auto}
.cards{display:flex;gap:10px;flex-wrap:wrap;margin:10px 0}
.card{background:#1e2127;border:1px solid #333;border-radius:8px;padding:8px 14px;min-width:140px}
.card b{font-size:18px;display:block}
.card span{font-size:11px;color:#9aa0aa}
img{width:100%;border-radius:8px;border:1px solid #333;background:#000}
footer{color:#9aa0aa;font-size:12px;padding:8px 16px 20px;max-width:1100px;margin:0 auto}
code{background:#26292f;padding:1px 6px;border-radius:4px}
#lastqr{word-break:break-all}
</style></head>
<body>
<header><div id="livedot" class="dot"></div>
<div><h1>BTP CCTV Analytics &mdash; live</h1>
<div class="sub">OpenCV window mirror &middot; auto-refreshing stats below</div></div></header>
<main>
<div class="cards">
<div class="card"><b id="s-status">-</b><span>status</span></div>
<div class="card"><b id="s-fps">-</b><span>fps</span></div>
<div class="card"><b id="s-tracks">-</b><span>tracks</span></div>
<div class="card"><b id="s-gallery">-</b><span>known faces</span></div>
<div class="card"><b id="s-absence">-</b><span>absence %</span></div>
</div>
<img src="/stream">
<div class="cards"><div class="card" style="flex:1"><b id="lastqr" style="font-size:13px;font-weight:400">-</b><span>last QR / code scan</span></div></div>
</main>
<footer>Keys in desktop window: <code>Q</code> quit &middot; <code>S</code> snapshot &middot; <code>F</code> fullscreen &middot; <code>A</code> anti-spoof on/off &middot;
box colors: <b style="color:#46c46a">green=known</b> <b style="color:#f5a524">amber=unknown</b> <b style="color:#3ea6ff">blue=scanning</b></footer>
<script>
async function tick(){
  try{
    const r = await fetch('/stats',{cache:'no-store'});
    const s = await r.json();
    document.getElementById('s-status').textContent = s.status || '-';
    document.getElementById('s-fps').textContent = (s.fps??'-') + (s.fps==null?'':' fps');
    document.getElementById('s-tracks').textContent = s.tracks ?? '-';
    document.getElementById('s-gallery').textContent = s.gallery ?? '-';
    document.getElementById('s-absence').textContent = (s.absence_pct??'-') + (s.absence_pct==null?'':' %');
    document.getElementById('lastqr').textContent = s.last_qr || 'none yet';
    document.getElementById('livedot').className = 'dot' + (s.status && s.status.includes('PRESENT') ? ' on' : '');
  }catch(e){}
  setTimeout(tick, 1000);
}
tick();
</script>
</body></html>
"""


class MJPEGWebServer:
    def __init__(self, port: int = 8080):
        self.port = port
        self._jpeg: bytes = b""
        self._stats: dict = {}
        self._lock = threading.Lock()
        self._running = True
        outer = self

        class Handler(BaseHTTPRequestHandler):
            def do_GET(self):
                if self.path == "/":
                    body = _PAGE.encode()
                    self.send_response(200)
                    self.send_header("Content-Type", "text/html; charset=utf-8")
                    self.send_header("Content-Length", str(len(body)))
                    self.end_headers()
                    self.wfile.write(body)
                elif self.path == "/stats":
                    with outer._lock:
                        payload = json.dumps(outer._stats).encode()
                    self.send_response(200)
                    self.send_header("Content-Type", "application/json")
                    self.send_header("Content-Length", str(len(payload)))
                    self.end_headers()
                    self.wfile.write(payload)
                elif self.path == "/stream":
                    self.send_response(200)
                    self.send_header("Content-Type",
                                     "multipart/x-mixed-replace; boundary=frame")
                    self.end_headers()
                    while outer._running:
                        with outer._lock:
                            jpg = outer._jpeg
                        if jpg:
                            try:
                                self.wfile.write(
                                    b"--frame\r\nContent-Type: image/jpeg\r\n"
                                    b"Content-Length: " + str(len(jpg)).encode()
                                    + b"\r\n\r\n" + jpg + b"\r\n"
                                )
                            except (BrokenPipeError, ConnectionResetError):
                                return
                        threading.Event().wait(0.066)
                else:
                    self.send_response(404)
                    self.end_headers()

            def log_message(self, *args):
                pass

        self._handler_cls = Handler
        self._httpd = ThreadingHTTPServer(("0.0.0.0", port), Handler)
        self._thread = threading.Thread(target=self._httpd.serve_forever,
                                        daemon=True)
        self._thread.start()
        print(f"[web] dashboard at http://0.0.0.0:{port}  "
              f"(open http://<server-ip>:{port} from your laptop)")

    def update(self, frame) -> None:
        ok, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
        if ok:
            with self._lock:
                self._jpeg = buf.tobytes()

    def set_stats(self, stats: dict) -> None:
        with self._lock:
            self._stats = dict(stats)

    def stop(self) -> None:
        self._running = False
        self._httpd.shutdown()
