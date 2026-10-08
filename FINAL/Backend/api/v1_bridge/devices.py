"""Registered devices — record the caller's devices and list them (Settings)."""

# ruff: noqa: F401,F403
from .common import *  # noqa: F401,F403


def _device_row(d):
    return {
        "id": d.id, "deviceId": d.device_id, "label": d.label, "platform": d.platform,
        "lastSeen": payloads._dts(d.last_seen), "createdAt": payloads._dts(d.created_at),
    }


@api_view(["GET", "POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def user_devices(request):
    """GET → the caller's registered devices; POST → register/touch one."""
    from bss_core.models import UserDevice
    user = request.user
    if request.method == "POST":
        body = request.data if isinstance(request.data, dict) else {}
        device_id = str(body.get("deviceId") or "").strip()[:120]
        if device_id:
            forwarded = request.META.get("HTTP_X_FORWARDED_FOR", "")
            ip = (forwarded.split(",")[0].strip() or request.META.get("REMOTE_ADDR", ""))[:60]
            UserDevice.objects.update_or_create(
                user=user, device_id=device_id,
                defaults={
                    "label": str(body.get("label") or "")[:120],
                    "platform": str(body.get("platform") or "")[:60],
                    "user_agent": request.META.get("HTTP_USER_AGENT", "")[:300],
                    "ip_address": ip,
                })
    qs = UserDevice.objects.filter(user=user)[:20]
    return Response({"data": [_device_row(d) for d in qs]}, status=status.HTTP_200_OK)


__all__ = ["user_devices"]
