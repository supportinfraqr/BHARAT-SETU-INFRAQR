"""Site CCTV camera setup + status (employer configures, contractor reads).

The employer defines, per site, the cameras the CCTV attendance engine should
watch. Attendance is driven only by these configured feeds — never a device
camera. Passwords are stored encrypted and never returned to the browser.
"""

# ruff: noqa: F401,F403
from .common import *  # noqa: F401,F403
from .bindings import *  # noqa: F401,F403
from .bindings import _contractor_site_ids

from .. import attendance_control as control


def _site_key(site):
    return str(getattr(site, "bss_site_id", "") or site.id)


def _employer_site(user, site_id):
    from bss_core.models import Site

    if not site_id:
        return None
    try:
        site_id = int(site_id)
    except (TypeError, ValueError):
        return None
    return Site.objects.filter(pk=site_id, employer=user).first()


def _contractor_site(user, site_id):
    from bss_core.models import Site

    if not site_id:
        return None
    try:
        site_id = int(site_id)
    except (TypeError, ValueError):
        return None
    if site_id not in _contractor_site_ids(user):
        return None
    return Site.objects.filter(pk=site_id).first()


def _masked_source(camera):
    """The computed feed URL with any password replaced by *** for display."""
    source = camera.build_source()
    if not source:
        return ""
    if camera.username and camera.get_password() and "://" in source:
        scheme, rest = source.split("://", 1)
        if "@" in rest:
            creds, tail = rest.split("@", 1)
            if ":" in creds:
                user = creds.split(":", 1)[0]
                return f"{scheme}://{user}:***@{tail}"
    return source


def _camera_json(camera):
    return {
        "id": camera.id,
        "siteId": camera.site_id,
        "label": camera.label,
        "area": camera.area,
        "sourceType": camera.source_type,
        "host": camera.host,
        "port": camera.port,
        "channel": camera.channel,
        "username": camera.username,
        "hasPassword": camera.has_password,
        "url": camera.url,
        "enabled": camera.enabled,
        "sortOrder": camera.sort_order,
        "feed": _masked_source(camera),
        "configured": bool(camera.build_source()),
    }


def _apply_camera_payload(camera, body):
    """Apply an incoming payload to a camera instance (validating basics)."""
    def text(key, current=""):
        value = body.get(key)
        return str(value).strip() if value is not None else (current or "")

    camera.label = text("label", camera.label)
    camera.area = text("area", camera.area)
    source_type = str(body.get("sourceType") or camera.source_type or "RTSP").strip().upper()
    if source_type not in ("RTSP", "HTTP", "FILE", "OTHER"):
        source_type = "RTSP"
    camera.source_type = source_type
    camera.host = text("host", camera.host)
    camera.channel = text("channel", camera.channel)
    camera.username = text("username", camera.username)
    camera.url = text("url", camera.url)
    port = body.get("port")
    if port in (None, ""):
        camera.port = camera.port
    else:
        try:
            camera.port = int(port)
        except (TypeError, ValueError):
            camera.port = None
    if body.get("sortOrder") is not None:
        try:
            camera.sort_order = max(0, int(body.get("sortOrder")))
        except (TypeError, ValueError):
            pass
    if body.get("enabled") is not None:
        camera.enabled = bool(body.get("enabled"))
    # Password: blank/absent keeps the stored value; explicit "" from the UI's
    # "remove password" flag clears it.
    if body.get("clearPassword"):
        camera.password_enc = ""
    elif body.get("password") not in (None, ""):
        camera.set_password(str(body.get("password")))
    return camera


def _validate_camera(camera):
    if not camera.label:
        return "Give the camera a name."
    if camera.source_type in ("RTSP", "HTTP") and not camera.host:
        return "Enter the camera IP address / host."
    if camera.source_type in ("FILE", "OTHER") and not camera.url:
        return "Enter the stream/test URL."
    return ""


@api_view(["GET", "POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def employer_cctv_cameras(request):
    """List (GET) or add (POST) CCTV cameras for one of the employer's sites."""
    from bss_core.models import SiteCctvCamera

    user = request.user
    if user.role != "employer":
        return Response({"error": "Only employers can configure CCTV."}, status=status.HTTP_403_FORBIDDEN)
    body = request.data if isinstance(request.data, dict) else {}
    site = _employer_site(user, body.get("siteId") or request.query_params.get("siteId"))
    if site is None:
        return Response({"error": "You do not have access to this site."}, status=status.HTTP_403_FORBIDDEN)

    if request.method == "GET":
        rows = SiteCctvCamera.objects.filter(site=site).order_by("sort_order", "id")
        return Response({"data": {"siteId": site.id, "siteKey": _site_key(site), "cameras": [_camera_json(c) for c in rows]}})

    camera = SiteCctvCamera(site=site)
    _apply_camera_payload(camera, body)
    error = _validate_camera(camera)
    if error:
        return Response({"error": error}, status=status.HTTP_400_BAD_REQUEST)
    if not camera.sort_order:
        camera.sort_order = (SiteCctvCamera.objects.filter(site=site).count() + 1)
    camera.save()
    return Response({"data": _camera_json(camera)}, status=status.HTTP_201_CREATED)


@api_view(["GET", "PUT", "PATCH", "DELETE"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def employer_cctv_camera_detail(request, camera_id):
    """Read / update / delete one of the employer's CCTV cameras."""
    from bss_core.models import SiteCctvCamera

    user = request.user
    if user.role != "employer":
        return Response({"error": "Only employers can configure CCTV."}, status=status.HTTP_403_FORBIDDEN)
    camera = SiteCctvCamera.objects.filter(pk=camera_id, site__employer=user).first()
    if camera is None:
        return Response({"error": "Camera not found."}, status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        return Response({"data": _camera_json(camera)})
    if request.method == "DELETE":
        camera.delete()
        return Response({"data": {"deleted": True, "id": camera_id}})

    body = request.data if isinstance(request.data, dict) else {}
    _apply_camera_payload(camera, body)
    error = _validate_camera(camera)
    if error:
        return Response({"error": error}, status=status.HTTP_400_BAD_REQUEST)
    camera.save()
    return Response({"data": _camera_json(camera)})


@api_view(["POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def employer_cctv_test(request):
    """Probe a camera feed and report whether the engine can open it."""
    from bss_core.models import SiteCctvCamera

    user = request.user
    if user.role != "employer":
        return Response({"error": "Only employers can test CCTV feeds."}, status=status.HTTP_403_FORBIDDEN)
    body = request.data if isinstance(request.data, dict) else {}

    camera_id = body.get("cameraId")
    if camera_id:
        camera = SiteCctvCamera.objects.filter(pk=camera_id, site__employer=user).first()
        if camera is None:
            return Response({"error": "Camera not found."}, status=status.HTTP_404_NOT_FOUND)
    else:
        site = _employer_site(user, body.get("siteId"))
        if site is None:
            return Response({"error": "You do not have access to this site."}, status=status.HTTP_403_FORBIDDEN)
        camera = SiteCctvCamera(site=site)
        _apply_camera_payload(camera, body)
        error = _validate_camera(camera)
        if error:
            return Response({"error": error}, status=status.HTTP_400_BAD_REQUEST)

    source = camera.build_source()
    if not source:
        return Response({"error": "This camera has no feed details yet."}, status=status.HTTP_400_BAD_REQUEST)
    try:
        result = control.probe(source)
    except control.AttendanceControlError as exc:
        return Response({"error": str(exc)}, status=exc.status_code)
    return Response({"data": result}, status=status.HTTP_200_OK)


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def cctv_status(request):
    """Site CCTV status: configured cameras + which have a live session.

    Employers see their own sites; contractors only sites allotted to them.
    """
    from bss_core.models import SiteCctvCamera

    user = request.user
    site_id = request.query_params.get("siteId")
    if user.role == "employer":
        site = _employer_site(user, site_id)
    elif user.role == "contractor":
        site = _contractor_site(user, site_id)
    else:
        site = None
    if site is None:
        return Response({"error": "You do not have access to this site."}, status=status.HTTP_403_FORBIDDEN)

    cameras = list(SiteCctvCamera.objects.filter(site=site).order_by("sort_order", "id"))
    key = _site_key(site)
    try:
        sessions = control.list_sessions()
    except control.AttendanceControlError:
        sessions = []
    active = {str(s.get("camera") or ""): s for s in sessions if str(s.get("site")) == key and s.get("active")}
    rows = []
    for cam in cameras:
        session = active.get(cam.label)
        data = _camera_json(cam)
        data["running"] = bool(session)
        data["session"] = session
        rows.append(data)
    return Response({"data": {
        "siteId": site.id,
        "siteKey": key,
        "siteName": site.site_name,
        "cameras": rows,
        "anyRunning": bool(active),
    }})


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def contractor_cctv_cameras(request):
    """Read-only CCTV camera list for a site the contractor is allotted to."""
    from bss_core.models import SiteCctvCamera

    if request.user.role != "contractor":
        return Response({"error": "Contractors only."}, status=status.HTTP_403_FORBIDDEN)
    site = _contractor_site(request.user, request.query_params.get("siteId"))
    if site is None:
        return Response({"error": "You do not have access to this site."}, status=status.HTTP_403_FORBIDDEN)
    rows = SiteCctvCamera.objects.filter(site=site).order_by("sort_order", "id")
    return Response({"data": {"siteId": site.id, "siteKey": _site_key(site), "cameras": [_camera_json(c) for c in rows]}})


def cameras_for_site(site):
    """Enabled cameras with a usable feed for the attendance engine."""
    from bss_core.models import SiteCctvCamera

    out = []
    for cam in SiteCctvCamera.objects.filter(site=site, enabled=True).order_by("sort_order", "id"):
        source = cam.build_source()
        if source:
            out.append({"label": cam.label, "area": cam.area or cam.label, "source": source})
    return out
