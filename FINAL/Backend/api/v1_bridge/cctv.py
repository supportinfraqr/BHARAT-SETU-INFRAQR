"""Site CCTV camera setup + status (employer-only).

The employer defines, per site, the cameras the CCTV attendance engine should
watch. Attendance is driven only by these configured feeds — never a device
camera. CCTV is an employer-only capability; contractors have no access.
Passwords are stored encrypted and never returned to the browser.
"""

# ruff: noqa: F401,F403
from .common import *  # noqa: F401,F403
from .bindings import *  # noqa: F401,F403

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
        limit = int(getattr(site, "max_cctv_cameras", 5) or 5)
        return Response({"data": {"siteId": site.id, "siteKey": _site_key(site),
                                  "maxCameras": limit, "cameraCount": rows.count(),
                                  "allowFeedView": bool(getattr(site, "allow_cctv_feed_view", False)),
                                  "cameras": [_camera_json(c) for c in rows]}})

    existing = SiteCctvCamera.objects.filter(site=site).count()
    limit = int(getattr(site, "max_cctv_cameras", 5) or 5)
    if existing >= limit:
        return Response({"error": f"This site is limited to {limit} CCTV cameras. "
                                  f"Ask BSS admin to increase the limit for this site."},
                        status=status.HTTP_400_BAD_REQUEST)
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
def cctv_camera_snapshot(request, camera_id):
    """Latest JPEG frame for one camera — powers the employer's live preview tile."""
    from django.http import HttpResponse

    from bss_core.models import SiteCctvCamera

    user = request.user
    camera = SiteCctvCamera.objects.select_related("site").filter(pk=camera_id).first()
    if camera is None:
        return Response({"error": "Camera not found."}, status=status.HTTP_404_NOT_FOUND)
    allowed = user.role == "employer" and camera.site is not None and camera.site.employer_id == user.id
    if not allowed:
        return Response({"error": "You do not have access to this camera."}, status=status.HTTP_403_FORBIDDEN)
    if not bool(getattr(camera.site, "allow_cctv_feed_view", False)):
        return Response({"error": "Live feed viewing is disabled for this site. Ask BSS admin to enable it."},
                        status=status.HTTP_403_FORBIDDEN)
    source = camera.build_source()
    if not source:
        return Response({"error": "This camera has no feed details yet."}, status=status.HTTP_400_BAD_REQUEST)
    try:
        content, ctype = control.get_frame(source)
    except control.AttendanceControlError as exc:
        return Response({"error": str(exc)}, status=exc.status_code)
    response = HttpResponse(content, content_type=ctype or "image/jpeg")
    response["Cache-Control"] = "no-store"
    return response


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def cctv_camera_stream(request, camera_id):
    """Live MJPEG stream for one camera — smooth preview (employer, feed-view allowed)."""
    from django.http import StreamingHttpResponse

    from bss_core.models import SiteCctvCamera

    user = request.user
    camera = SiteCctvCamera.objects.select_related("site").filter(pk=camera_id).first()
    if camera is None:
        return Response({"error": "Camera not found."}, status=status.HTTP_404_NOT_FOUND)
    allowed = user.role == "employer" and camera.site is not None and camera.site.employer_id == user.id
    if not allowed:
        return Response({"error": "You do not have access to this camera."}, status=status.HTTP_403_FORBIDDEN)
    if not bool(getattr(camera.site, "allow_cctv_feed_view", False)):
        return Response({"error": "Live feed viewing is disabled for this site. Ask BSS admin to enable it."},
                        status=status.HTTP_403_FORBIDDEN)
    source = camera.build_source()
    if not source:
        return Response({"error": "This camera has no feed details yet."}, status=status.HTTP_400_BAD_REQUEST)
    try:
        upstream = control.get_stream(source)
    except control.AttendanceControlError as exc:
        return Response({"error": str(exc)}, status=exc.status_code)

    def _pipe():
        try:
            for chunk in upstream.iter_content(chunk_size=65536):
                if chunk:
                    yield chunk
        finally:
            upstream.close()

    response = StreamingHttpResponse(
        _pipe(),
        content_type=upstream.headers.get("Content-Type", "multipart/x-mixed-replace; boundary=frame"))
    response["Cache-Control"] = "no-store"
    response["X-Accel-Buffering"] = "no"
    return response


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def cctv_status(request):
    """Site CCTV status: configured cameras + which have a live session.

    Employer-only: an employer sees their own sites.
    """
    from bss_core.models import SiteCctvCamera

    user = request.user
    site_id = request.query_params.get("siteId")
    site = _employer_site(user, site_id) if user.role == "employer" else None
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
        "allowFeedView": bool(getattr(site, "allow_cctv_feed_view", False)),
        "anyRunning": bool(active),
    }})


def cameras_for_site(site):
    """Enabled cameras with a usable feed for the attendance engine."""
    from bss_core.models import SiteCctvCamera

    out = []
    for cam in SiteCctvCamera.objects.filter(site=site, enabled=True).order_by("sort_order", "id"):
        source = cam.build_source()
        if source:
            out.append({"label": cam.label, "area": cam.area or cam.label, "source": source})
    return out


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def admin_sites_cctv(request):
    """BSS admin: list all sites with their CCTV settings (limit + feed-view)."""
    from bss_core.models import Site, SiteCctvCamera

    if request.user.role not in ("bss_admin", "bss_staff"):
        return Response({"error": "BSS admin only."}, status=status.HTTP_403_FORBIDDEN)
    qs = Site.objects.select_related("employer").order_by("site_name")[:2000]
    rows = []
    for s in qs:
        rows.append({
            "id": s.id, "name": s.site_name, "code": s.site_code,
            "employer": (getattr(s.employer, "username", "") if s.employer_id else ""),
            "maxCameras": int(getattr(s, "max_cctv_cameras", 5) or 5),
            "allowFeedView": bool(getattr(s, "allow_cctv_feed_view", False)),
            "cameraCount": SiteCctvCamera.objects.filter(site=s).count(),
        })
    return Response({"rows": rows}, status=status.HTTP_200_OK)


@api_view(["GET", "POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def admin_site_camera_limit(request, site_id):
    """BSS admin: read / set the per-site CCTV camera limit + live feed-view."""
    from bss_core.models import Site, SiteCctvCamera

    if request.user.role not in ("bss_admin", "bss_staff"):
        return Response({"error": "BSS admin only."}, status=status.HTTP_403_FORBIDDEN)
    site = Site.objects.filter(pk=site_id).first()
    if site is None:
        return Response({"error": "Site not found."}, status=status.HTTP_404_NOT_FOUND)

    if request.method == "POST":
        body = request.data if isinstance(request.data, dict) else {}
        fields = []
        if body.get("maxCameras") not in (None, ""):
            try:
                limit = int(body.get("maxCameras"))
            except (TypeError, ValueError):
                return Response({"error": "Enter a camera limit."}, status=status.HTTP_400_BAD_REQUEST)
            site.max_cctv_cameras = max(1, min(limit, 50))
            fields.append("max_cctv_cameras")
        if body.get("allowFeedView") is not None:
            site.allow_cctv_feed_view = bool(body.get("allowFeedView"))
            fields.append("allow_cctv_feed_view")
        if fields:
            site.save(update_fields=fields + ["updated_at"])
            from .admin_console import log_audit
            log_audit(request.user, "UPDATE", "site_cctv_settings", site.id,
                      after={"summary": f"CCTV settings — max={site.max_cctv_cameras} "
                                        f"feedView={site.allow_cctv_feed_view}",
                             "site": site.site_name})

    return Response({"data": {
        "siteId": site.id, "siteName": site.site_name,
        "maxCameras": int(getattr(site, "max_cctv_cameras", 5) or 5),
        "allowFeedView": bool(getattr(site, "allow_cctv_feed_view", False)),
        "cameraCount": SiteCctvCamera.objects.filter(site=site).count(),
    }})
