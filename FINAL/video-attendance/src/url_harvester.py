"""URL harvester: turn open webcam-listing pages into working camera feeds.

Listing pages change constantly (rotating embeds, JS players, dead links), so
hand-maintaining URLs doesn't scale. Pipeline per page:

    fetch HTML -> regex candidates -> [LLM refine] -> probe each -> keep first
    working stream -> registry entry {name, source, web_port, profile}

The LLM step is OPTIONAL and provider-agnostic (any OpenAI-compatible chat
endpoint). Without `LLM_API_KEY` the harvester runs regex-only, which already
catches plain <video>/<source> tags, .m3u8/.mp4 URLs and JS `file:` vars:

    LLM_BASE_URL  default https://api.openai.com/v1 (override for local models)
    LLM_API_KEY   unset = regex-only mode
    LLM_MODEL     default gpt-4o-mini (or e.g. llama3 via your local endpoint)

Respect the sites you harvest: public demo feeds are fine, but obey
robots.txt / terms of use, don't hammer (per-page delay), and keep the
`page_url` on each entry so a human can re-check provenance.
"""
import os
import re
import time
import urllib.parse
import urllib.request
from typing import Any, Dict, List, Optional

_CANDIDATE_PATTERNS = [
    re.compile(r'(https?://[^\s"\'<>\\]+\.m3u8(?:\?[^\s"\'<>\\]*)?)', re.I),
    re.compile(r'(https?://[^\s"\'<>\\]+\.mpd(?:\?[^\s"\'<>\\]*)?)', re.I),
    re.compile(r'(https?://[^\s"\'<>\\]+\.(?:mp4|webm|mov)(?:\?[^\s"\'<>\\]*)?)', re.I),
    re.compile(r'(rtsp://[^\s"\'<>\\]+)', re.I),
    re.compile(r'(?:file|source)\s*:\s*["\'](https?://[^"\']+)["\']', re.I),
    re.compile(r'<source[^>]+src=["\']([^"\']+)["\']', re.I),
    re.compile(r'<video[^>]+src=["\']([^"\']+)["\']', re.I),
]

_UA = {"User-Agent": "Mozilla/5.0 (BTP-CCTV harvester; contact admin)"}


def fetch_html(url: str, timeout_s: float = 20.0) -> str:
    req = urllib.request.Request(url, headers=_UA)
    with urllib.request.urlopen(req, timeout=timeout_s) as resp:
        ctype = resp.headers.get("Content-Type", "")
        raw = resp.read(2_000_000)
    enc = "utf-8"
    m = re.search(r"charset=([\w-]+)", ctype)
    if m:
        enc = m.group(1)
    return raw.decode(enc, "replace")


def regex_candidates(html: str, base_url: str) -> List[str]:
    """Ordered unique playable-URL candidates, resolved against page URL."""
    out: List[str] = []
    for pat in _CANDIDATE_PATTERNS:
        for m in pat.finditer(html):
            u = urllib.parse.urljoin(base_url, m.group(1).strip())
            if u not in out and not u.lower().endswith((".js", ".css", ".png", ".jpg")):
                out.append(u)
    return out[:25]


def llm_refine(page_url: str, html: str, candidates: List[str],
               model: Optional[str] = None) -> Optional[Dict]:
    """Ask the LLM to pick real playable streams from page soup.

    Returns {"streams": [{"url":..., "type":...}], "label":..., "requires_js":...}
    or None when no key is set / any error (caller falls back to regex list).
    Never raises.
    """
    import json
    key = os.environ.get("LLM_API_KEY", "")
    if not key:
        return None
    base = os.environ.get("LLM_BASE_URL", "https://api.openai.com/v1").rstrip("/")
    model = model or os.environ.get("LLM_MODEL", "gpt-4o-mini")
    snippet = html[:12000]
    system = ("You extract direct playable video-stream URLs from a webcam "
              "listing page. Reply ONLY with JSON: "
              '{"streams": [{"url": "...", "type": "hls|mp4|rtsp|dash|unknown"}], '
              '"label": "short place name", "requires_js": true|false}. '
              "Include only direct stream files (m3u8, mpd, mp4, webm, rtsp), "
              "never thumbnails, scripts, or stylesheets. Prefer candidates "
              "already found if they look playable.")
    user = f"page: {page_url}\nregex candidates: {candidates[:15]}\nhtml:\n{snippet}"
    body = json.dumps({
        "model": model,
        "temperature": 0,
        "max_tokens": 1200,
        "response_format": {"type": "json_object"},
        "messages": [{"role": "system", "content": system},
                     {"role": "user", "content": user}],
    }).encode()
    try:
        req = urllib.request.Request(
            base + "/chat/completions", data=body,
            headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=60) as resp:
            payload = json.loads(resp.read().decode("utf-8", "replace"))
        text = payload["choices"][0]["message"]["content"].strip()
        text = re.sub(r"^```(?:json)?|```$", "", text, flags=re.M).strip()
        data = json.loads(text)
        if not isinstance(data.get("streams"), list):
            return None
        return data
    except Exception as e:
        print(f"[harvest] LLM refine failed ({e}) — using regex candidates")
        return None


def slugify(text: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return slug[:40] or "cam"


def harvest_page(page_url: str, base_source_cfg: dict, probe_timeout_s: float = 8.0,
                 llm_model: Optional[str] = None, quick_profile_s: float = 0.0) -> Dict:
    """Full pipeline for one listing page. Returns a registry-entry dict
    (with `page_url`, `harvested_at`, and `dead_candidates` for debugging).
    Raises RuntimeError when nothing on the page probes playable."""
    import time as _t
    from src import source_factory
    html = fetch_html(page_url)
    cands = regex_candidates(html, page_url)
    label = ""
    refined = llm_refine(page_url, html, cands, model=llm_model)
    ordered = cands
    if refined:
        llm_urls = [s.get("url") for s in refined.get("streams", [])
                    if isinstance(s, dict) and s.get("url")]
        ordered = llm_urls + [c for c in cands if c not in llm_urls]
        label = str(refined.get("label", "") or "")
    if not label:
        m = re.search(r"<title>(.*?)</title>", html, re.S | re.I)
        label = (m.group(1).strip()[:60] if m else page_url)
    dead = []
    for url in ordered:
        cfg = source_factory.parse(url, base_source_cfg)
        try:
            rep = source_factory.probe(cfg, timeout_s=probe_timeout_s)
        except Exception as e:
            dead.append({"url": url, "error": str(e)[:120]})
            continue
        if not rep.get("ok"):
            dead.append({"url": url, "error": rep.get("error", "?")})
            continue
        entry: Dict[str, Any] = {
            "name": slugify(label),
            "source": url,
            "page_url": page_url,
            "harvested_at": _t.strftime("%Y-%m-%dT%H:%M:%S"),
            "probe": {"width": rep["width"], "height": rep["height"], "kind": rep["kind"]},
            "dead_candidates": dead,
        }
        if quick_profile_s > 0:
            try:
                from src.camera_profiler import profile_camera_source, suggest_entry
                stats = profile_camera_source(
                    {"source": cfg}, url, seconds=quick_profile_s)
                entry["profile"] = stats.label
                if suggest_entry(stats).get("face_level"):
                    entry["face_level"] = True
            except Exception as e:
                entry["profile_error"] = str(e)[:120]
        return entry
    raise RuntimeError(f"no playable stream on {page_url} "
                       f"({len(ordered)} candidates probed)")


def harvest_all(pages: List[str], base_source_cfg: dict, delay_s: float = 2.0,
                **kw) -> List[Dict]:
    """Harvest every page, polite delay between fetches. Failures become
    `{"page_url":..., "error":...}` rows so one dead site can't kill the run."""
    out = []
    for i, page in enumerate(pages):
        if i:
            time.sleep(delay_s)
        try:
            out.append(harvest_page(page, base_source_cfg, **kw))
            print(f"[harvest] OK {page} -> {out[-1]['source']}")
        except Exception as e:
            print(f"[harvest] FAIL {page}: {e}")
            out.append({"page_url": page, "error": str(e)[:200]})
    return out
