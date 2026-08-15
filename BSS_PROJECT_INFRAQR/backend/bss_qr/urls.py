from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("authx.urls")),
    path("api/qr/", include("qr.urls")),
    # Legacy-compatible namespace (frontend-facing routes)
    path("api/", include("api.urls")),
]
