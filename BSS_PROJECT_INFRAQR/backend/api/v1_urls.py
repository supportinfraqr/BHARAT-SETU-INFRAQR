from django.urls import path

from . import v1_views


urlpatterns = [
    path("auth/login", v1_views.LoginV1View.as_view(), name="v1-login"),
    path("auth/logout", v1_views.LogoutV1View.as_view(), name="v1-logout"),
    path("session", v1_views.SessionV1View.as_view(), name="v1-session"),
    path("grievances", v1_views.GrievanceV1View.as_view(), name="v1-grievances"),
]
