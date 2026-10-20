"""BSS-admin control for the per-site attendance-camera limit.

The camera feed/RTSP configuration itself lives on the client. This module
keeps only the employer-facing cap on how many attendance cameras a site can
register.
"""

from .common import *  # noqa: F401,F403
from bss_core.models import EdgeCamera, Site

__all__ = ["admin_sites_cctv", "admin_site_camera_limit"]


def _admin_only(request):
    return request.user.role in ("bss_admin", "bss_staff")


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def admin_sites_cctv(request):
    """BSS admin: list sites with their attendance-camera limit and usage."""
    if not _admin_only(request):
        return Response({"error": "BSS admin only."}, status=status.HTTP_403_FORBIDDEN)
    rows = []
    for site in Site.objects.select_related("employer").order_by("site_name")[:2000]:
        rows.append({
            "id": site.id,
            "name": site.site_name,
            "code": site.site_code,
            "employer": getattr(site.employer, "username", "") if site.employer_id else "",
            "maxCameras": int(getattr(site, "max_cctv_cameras", 5) or 5),
            "cameraCount": EdgeCamera.objects.filter(site=site).count(),
        })
    return Response({"rows": rows}, status=status.HTTP_200_OK)


@api_view(["GET", "POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def admin_site_camera_limit(request, site_id):
    """BSS admin: read/set the maximum number of attendance cameras for a site."""
    if not _admin_only(request):
        return Response({"error": "BSS admin only."}, status=status.HTTP_403_FORBIDDEN)
    site = Site.objects.filter(pk=site_id).first()
    if site is None:
        return Response({"error": "Site not found."}, status=status.HTTP_404_NOT_FOUND)
    if request.method == "POST":
        body = request.data if isinstance(request.data, dict) else {}
        if body.get("maxCameras") not in (None, ""):
            try:
                limit = int(body.get("maxCameras"))
            except (TypeError, ValueError):
                return Response({"error": "Enter a camera limit."}, status=status.HTTP_400_BAD_REQUEST)
            site.max_cctv_cameras = max(1, min(limit, 50))
            site.save(update_fields=["max_cctv_cameras", "updated_at"])
            from .admin_console import log_audit
            log_audit(request.user, "UPDATE", "site_camera_limit", site.id,
                      after={"summary": f"Attendance camera limit — max={site.max_cctv_cameras}",
                             "site": site.site_name})
    return Response({"data": {
        "siteId": site.id,
        "siteName": site.site_name,
        "maxCameras": int(getattr(site, "max_cctv_cameras", 5) or 5),
        "cameraCount": EdgeCamera.objects.filter(site=site).count(),
    }}, status=status.HTTP_200_OK)
