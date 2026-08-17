from django.urls import path

from . import views

urlpatterns = [
    # Entities
    path("employers/", views.EmployerListCreate.as_view(), name="employer-list"),
    path("contractors/", views.ContractorListCreate.as_view(), name="contractor-list"),
    path("workers/", views.WorkerListCreate.as_view(), name="worker-list"),
    # QR
    path("qr/", views.QRCodeView.as_view(), name="qr-view"),
    path("qr/scan/", views.QRScanView.as_view(), name="qr-scan"),
    path("qr/geocode/", views.ReverseGeocodeView.as_view(), name="reverse-geocode"),
    path("qr/me/", views.UserQRView.as_view(), name="user-qr"),
    path("workers/<int:worker_id>/card/", views.WorkerCardView.as_view(), name="worker-card"),
    # Binding
    path("bindings/", views.BindingCreate.as_view(), name="binding-create"),
    path("bindings/list/", views.BindingList.as_view(), name="binding-list"),
    path("bindings/<int:binding_id>/approve/", views.BindingApprove.as_view(), name="binding-approve"),
    path("bindings/unbind/", views.WorkerUnbind.as_view(), name="worker-unbind"),
    path("contractors/reassign/", views.ContractorReassign.as_view(), name="contractor-reassign"),
    # Activity
    path("scans/", views.ScanLogList.as_view(), name="scan-list"),
    path("dashboard/", views.DashboardStats.as_view(), name="dashboard"),
    path("notifications/", views.NotificationList.as_view(), name="notifications"),
    # QR Management System
    path("management/employers/", views.EmployerListAdmin.as_view(), name="employer-admin-list"),
    path("management/employers/<int:employer_id>/approve/", views.EmployerApprove.as_view(), name="employer-approve"),
    path("management/employers/<int:employer_id>/tree/", views.EmployerTreeView.as_view(), name="employer-tree"),
    path("management/contractors/<int:contractor_id>/tree/", views.ContractorTreeView.as_view(), name="contractor-tree"),
    path("management/workers/<int:worker_id>/tree/", views.WorkerTreeView.as_view(), name="worker-tree"),
    path("management/plans/", views.PlanList.as_view(), name="plan-list"),
    path("management/employer/plan/", views.EmployerAttachPlan.as_view(), name="employer-plan"),
    path("management/employer/my/", views.MyPlanView.as_view(), name="my-plan"),
    path("profile/me/", views.MyProfileView.as_view(), name="my-profile"),
    # Locations
    path("locations/", views.SavedLocationList.as_view(), name="saved-locations"),
    path("locations/<int:location_id>/", views.SavedLocationDelete.as_view(), name="saved-location-delete"),
    path("contractors/<int:contractor_id>/location/", views.SetContractorLocation.as_view(), name="set-contractor-location"),
]
