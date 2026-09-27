import json
import re
import time
import urllib.request
from typing import Optional

OPENAPI_URL = "https://openapi-alpha.ivideon.com"
OWDB_API_URL = "https://openwebcamdb.com/api/v1"


class IvideonError(RuntimeError):
    pass


def resolve_ivideon_hls(camera_id: str, access_token: str = "public",
                        timeout_s: float = 20.0, attempts: int = 3) -> str:
    url = (
        f"{OPENAPI_URL}/cameras/{camera_id}/live_stream"
        f"?op=GET&access_token={access_token}&format=hls"
    )
    last_err: Optional[Exception] = None
    for attempt in range(1, attempts + 1):
        req = urllib.request.Request(url, headers={"User-Agent": "BTP-CCTV/1.0"})
        try:
            with urllib.request.urlopen(req, timeout=timeout_s) as resp:
                final_url = resp.geturl()
                ctype = resp.headers.get("Content-Type", "") or ""
                if "mpegurl" in ctype.lower() or ".m3u8" in final_url:
                    return final_url
                body = resp.read(65536).decode("utf-8", "replace").strip()
            if body.startswith("http"):
                return body.split()[0]
            raise IvideonError(
                f"unexpected response for {camera_id}: {body[:120]!r}"
            )
        except IvideonError:
            raise
        except Exception as e:
            last_err = e
            if attempt < attempts:
                time.sleep(1.5 * attempt)
    raise IvideonError(
        f"resolve failed for {camera_id} after {attempts} attempts: {last_err}"
    )


_ID_PATTERNS = [
    re.compile(r"server=(100-[A-Za-z0-9]+)&(?:amp;)?camera=(\d+)"),
    re.compile(r"\b(100-[A-Za-z0-9]{12,}):(\d{3,})\b"),
]


def extract_camera_ids(text: str) -> list:
    found = []
    for pat in _ID_PATTERNS:
        for m in pat.finditer(text):
            cid = f"{m.group(1)}:{m.group(2)}"
            if cid not in found:
                found.append(cid)
    return found


def fetch_owdb_webcam(slug: str, api_key: str, timeout_s: float = 15.0) -> dict:
    url = f"{OWDB_API_URL}/webcams/{slug}"
    req = urllib.request.Request(url, headers={
        "Authorization": f"Bearer {api_key}",
        "User-Agent": "BTP-CCTV/1.0",
        "Accept": "application/json",
    })
    with urllib.request.urlopen(req, timeout=timeout_s) as resp:
        data = resp.read().decode("utf-8", "replace")
    try:
        parsed = json.loads(data)
    except json.JSONDecodeError:
        raise IvideonError(f"owdb response not JSON for {slug}")
    if isinstance(parsed, dict) and isinstance(parsed.get("data"), dict):
        parsed = parsed["data"]
    return parsed


def resolve_owdb_camera(slug: str, api_key: str) -> tuple:
    data = fetch_owdb_webcam(slug, api_key)
    blob = json.dumps(data)
    ids = extract_camera_ids(blob)
    name = ""
    if isinstance(data, dict):
        for k in ("name", "title", "slug"):
            v = data.get(k)
            if isinstance(v, str) and v.strip():
                name = v.strip()
                break
    if not ids:
        raise IvideonError(f"no ivideon camera id found in owdb entry '{slug}'")
    return ids[0], name


def cache_busted(hls_url: str) -> str:
    sep = "&" if "?" in hls_url else "?"
    return f"{hls_url}{sep}_={int(time.time() * 1000)}"
