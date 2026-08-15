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
    path("workers/<int:worker_id>/card/", views.WorkerCardView.as_view(), name="worker-card"),
    # Binding
    path("bindings/", views.BindingCreate.as_view(), name="binding-create"),
    path("bindings/<int:binding_id>/approve/", views.BindingApprove.as_view(), name="binding-approve"),
    path("contractors/reassign/", views.ContractorReassign.as_view(), name="contractor-reassign"),
    # Activity
    path("scans/", views.ScanLogList.as_view(), name="scan-list"),
    path("dashboard/", views.DashboardStats.as_view(), name="dashboard"),
    path("notifications/", views.NotificationList.as_view(), name="notifications"),
]
