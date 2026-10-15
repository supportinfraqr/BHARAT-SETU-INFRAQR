"""MJPEG web dashboard: styled page + live image + JSON stats + settings UI.

- `/` live dashboard, `/stream` MJPEG, `/stats` JSON polled by the page.
- `/settings` human-friendly tuner for every performance-affecting option
  (driven by src/config_ui.py schema). Saving writes config.yaml
  (comments preserved) and hot-applies whatever is live-flaggable.
- `/api/config` serves ONLY schema fields (never postgres secrets).
- NOTE: no authentication — anyone on your LAN can open these pages.
  Keep the port off the internet.
"""
import json
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Optional

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
a.set{color:#7db4ff;text-decoration:none;font-size:13px;margin-left:auto}
</style></head>
<body>
<header><div id="livedot" class="dot"></div>
<div><h1>BTP CCTV Analytics &mdash; live</h1>
<div class="sub">OpenCV window mirror &middot; auto-refreshing stats below</div></div>
<a class="set" href="/settings">&#9881; Settings</a></header>
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
<footer>Keys in desktop window: <code>Q</code> quit &middot; <code>S</code> snapshot &middot; <code>F</code> fullscreen &middot; <code>A</code> anti-spoof on/off &middot; box colors: <b style="color:#46c46a">green=known</b> <b style="color:#f5a524">amber=unknown</b> <b style="color:#3ea6ff">blue=scanning</b></footer>
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

_SETTINGS_PAGE = """<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Settings — BTP CCTV Analytics</title>
<style>
body{margin:0;background:#14161a;color:#eee;font-family:Segoe UI,Arial,sans-serif}
header{padding:12px 18px;background:#1e2127;border-bottom:1px solid #333}
h1{font-size:17px;margin:0}
.sub{font-size:12px;color:#9aa0aa}
main{max-width:860px;margin:0 auto;padding:14px 18px 40px}
section{background:#1e2127;border:1px solid #333;border-radius:8px;padding:12px 16px;margin:12px 0}
h2{font-size:14px;margin:2px 0 10px}
.row{display:flex;gap:12px;align-items:center;padding:7px 0;border-top:1px solid #2a2d33}
.row:first-of-type{border-top:none}
.lab{flex:1;min-width:0}
.lab b{font-size:13px;font-weight:600}
.lab span{display:block;font-size:11px;color:#9aa0aa}
.badge{font-size:10px;padding:1px 7px;border-radius:8px;margin-left:6px}
.live{background:#123f22;color:#7dffa8}
.rest{background:#4a3413;color:#ffcf87}
input[type=number],input[type=text]{width:90px;background:#26292f;color:#eee;border:1px solid #444;border-radius:5px;padding:5px 8px}
input[type=range]{width:150px;accent-color:#46c46a}
input[type=checkbox]{width:18px;height:18px;accent-color:#46c46a}
#save{position:sticky;bottom:12px;background:#1f7a38;color:#fff;border:none;border-radius:8px;padding:12px 26px;font-size:15px;cursor:pointer;width:100%}
#save:hover{background:#26a04a}
#msg{padding:10px 14px;border-radius:8px;margin:10px 0;display:none;font-size:13px}
#msg.ok{display:block;background:#123f22;color:#bdf5cd}
#msg.warn{display:block;background:#4a3413;color:#ffe1a8}
a.back{color:#7db4ff;font-size:13px;text-decoration:none}
.warnbar{background:#3a2a10;color:#ffcf87;font-size:12px;padding:8px 18px}
</style></head>
<body>
<header><h1>&#9881; Settings</h1><div class="sub">Tune performance live &middot; <a class="back" href="/">&larr; back to live view</a></div></header>
<div class="warnbar">No login on this page — anyone on your network can change these. Keep the port off the internet.</div>
<main><div id="msg"></div><div id="form"></div>
<button id="save" onclick="save()">Save settings</button></main>
<script>
let SCHEMA=null;
function ctl(f,v){
  const p=f.section+'.'+f.key;
  if(f.type==='bool') return `<input type="checkbox" data-p="${p}" ${v?'checked':''}>`;
  if(f.type==='text') return `<input type="text" data-p="${p}" value="${v??''}">`;
  const st=f.step??1;
  return `<input type="range" data-p="${p}" min="${f.min}" max="${f.max}" step="${st}" value="${v??f.min}" oninput="this.nextElementSibling.value=this.value">`+
         `<input type="number" data-p="${p}" min="${f.min}" max="${f.max}" step="${st}" value="${v??f.min}" oninput="this.previousElementSibling.value=this.value" style="width:70px">`;
}
async function load(){
  const r=await fetch('/api/config',{cache:'no-store'}); SCHEMA=await r.json();
  const host=document.getElementById('form'); host.innerHTML='';
  for(const s of SCHEMA.sections){
    const sec=document.createElement('section');
    sec.innerHTML=`<h2>${s.title}</h2>`;
    for(const f of SCHEMA.fields.filter(x=>x.section===s.name)){
      const v=SCHEMA.values[f.section+'.'+f.key];
      const badge=f.live?'<span class="badge live">live</span>':'<span class="badge rest">restart</span>';
      sec.innerHTML+=`<div class="row"><div class="lab"><b>${f.label}${badge}</b><span>${f.help||''}</span></div>${ctl(f,v)}</div>`;
    }
    host.appendChild(sec);
  }
}
async function save(){
  const vals={};
  document.querySelectorAll('[data-p]').forEach(el=>{
    const p=el.getAttribute('data-p');
    if(!(p in vals)) vals[p]=el.type==='checkbox'?el.checked:el.value;
  });
  const r=await fetch('/api/settings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({values:vals})});
  const res=await r.json();
  const m=document.getElementById('msg');
  if(!res.ok){m.className='warn';m.textContent='Save failed: '+(res.error||'unknown');return;}
  let t=`Saved. Live now: ${res.live.length?res.live.join(', '):'—'}.`;
  if(res.restart.length) t+=` Restart pipeline for: ${res.restart.join(', ')}.`;
  if(res.rejected.length) t+=` Rejected: ${res.rejected.join(', ')}.`;
  m.className=res.restart.length?'warn':'ok'; m.textContent=t; window.scrollTo(0,0);
}
load();
</script>
</body></html>
"""


class MJPEGWebServer:
    def __init__(self, port: int = 8080, config_path: Optional[str] = None):
        self.port = port
        self.config_path = config_path
        self._jpeg: bytes = b""
        self._stats: dict = {}
        self._lock = threading.Lock()
        self._running = True
        # Set by main.py: called with the fresh config dict after /api/settings
        # save so live-flaggable values apply without restart.
        self.on_config_save = None
        outer = self

        class Handler(BaseHTTPRequestHandler):
            def _send(self, body: bytes, ctype: str) -> None:
                self.send_response(200)
                self.send_header("Content-Type", ctype)
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)

            def do_GET(self):
                if self.path == "/":
                    self._send(_PAGE.encode(), "text/html; charset=utf-8")
                elif self.path == "/settings":
                    if not outer.config_path:
                        self._send(b"settings unavailable (no config file)",
                                   "text/plain")
                        return
                    self._send(_SETTINGS_PAGE.encode(), "text/html; charset=utf-8")
                elif self.path == "/api/config":
                    self._serve_config()
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
                elif self.path == "/stats":
                    with outer._lock:
                        payload = json.dumps(outer._stats).encode()
                    self._send(payload, "application/json")
                else:
                    self.send_response(404)
                    self.end_headers()

            def do_POST(self):
                if self.path != "/api/settings" or not outer.config_path:
                    self.send_response(404)
                    self.end_headers()
                    return
                try:
                    length = int(self.headers.get("Content-Length", 0))
                    body = json.loads(self.rfile.read(length) or b"{}")
                    values = body.get("values", {})
                    if not isinstance(values, dict):
                        raise ValueError("values must be an object")
                    from src.config_ui import apply_save, load_yaml
                    live, restart, rejected = apply_save(outer.config_path, values)
                    data, _ = load_yaml(outer.config_path)
                    if callable(outer.on_config_save):
                        try:
                            outer.on_config_save(dict(data))
                        except Exception as e:
                            print(f"[web] live-apply failed: {e}")
                    self._send(json.dumps({"ok": True, "live": live,
                                           "restart": restart,
                                           "rejected": rejected}).encode(),
                               "application/json")
                except Exception as e:
                    self._send(json.dumps({"ok": False,
                                           "error": str(e)}).encode(),
                               "application/json")

            def _serve_config(self):
                from src.config_ui import SECTIONS, FIELDS, current_values, load_yaml
                try:
                    data, _ = load_yaml(outer.config_path or "")
                    payload = json.dumps({
                        "sections": [{"name": n, "title": t} for n, t in SECTIONS],
                        "fields": FIELDS,
                        "values": current_values(data),
                    }).encode()
                except Exception as e:
                    payload = json.dumps({"error": str(e)}).encode()
                self._send(payload, "application/json")

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
