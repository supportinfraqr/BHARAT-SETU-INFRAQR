"""OpenStreetMap geocoding helpers (Nominatim reverse geocoding)."""
import json
import time
import urllib.parse
import urllib.request

NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse"
USER_AGENT = "InfraQR-BSS/1.0 (bss@infraqr.com)"


def reverse_geocode(lat, lng):
    """Reverse geocode coordinates to a human-readable location via OpenStreetMap.

    Returns a dict: {display_name, address, place_type} or None on failure.
    """
    if lat is None or lng is None:
        return None
    params = {
        "format": "json",
        "lat": f"{float(lat):.6f}",
        "lon": f"{float(lng):.6f}",
        "zoom": 16,
        "addressdetails": 1,
    }
    url = NOMINATIM_URL + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode())
        if not data or "display_name" not in data:
            return None
        addr = data.get("address") or {}
        parts = []
        for key in ("road", "neighbourhood", "suburb", "city_district", "town", "city", "municipality", "county", "state"):
            if addr.get(key):
                parts.append(addr[key])
                break
        return {
            "display_name": data.get("display_name", ""),
            "address": addr,
            "place_type": data.get("type", ""),
            "short_name": ", ".join(parts),
        }
    except Exception:
        return None
