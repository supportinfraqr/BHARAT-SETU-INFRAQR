"""Per-camera capture-window evaluation shared by API and alert jobs."""

from datetime import time
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

EDGE_DAY_NAMES = ("mon", "tue", "wed", "thu", "fri", "sat", "sun")


def time_value(value):
    text = str(value or "").strip()
    if len(text) != 5 or text[2] != ":":
        return None
    try:
        hour, minute = int(text[:2]), int(text[3:])
    except ValueError:
        return None
    if hour > 23 or minute > 59:
        return None
    return time(hour, minute)


def day_index(value):
    text = str(value or "").strip().lower()[:3]
    return EDGE_DAY_NAMES.index(text) if text in EDGE_DAY_NAMES else None


def schedule_active(camera, when):
    if not camera.schedule_enabled or not camera.capture_windows:
        return True
    try:
        tz = ZoneInfo(camera.timezone or "Asia/Kolkata")
    except ZoneInfoNotFoundError:
        tz = ZoneInfo("Asia/Kolkata")
    local = when.astimezone(tz)
    current = local.time()
    weekday = local.weekday()
    for window in camera.capture_windows or []:
        if not isinstance(window, dict):
            continue
        days = {day_index(d) for d in (window.get("days") or [])}
        days.discard(None)
        if days and weekday not in days:
            continue
        start = time_value(window.get("start"))
        end = time_value(window.get("end"))
        if start is None or end is None:
            continue
        if start <= end:
            if start <= current <= end:
                return True
        else:
            if current >= start or current <= end:
                return True
    return False
