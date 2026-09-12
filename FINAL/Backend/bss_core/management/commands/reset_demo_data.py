"""Clear all activity for the demo accounts so they start fresh.

Removes bindings, employment, leave requests, grievances, gate passes, salary
advances, benefit records, gratuity applications, attendance, wages, rozgar
applications and course progress for the demo workers / contractors / employers.

Usage:

    python manage.py reset_demo_data
"""

from django.core.management.base import BaseCommand
from django.db import transaction

from bss_core.models import (
    Attendance,
    ConsentChallenge,
    CourseEnrollment,
    GratuityApplication,
    GrievanceResponse,
    LeaveRequest,
    Notification,
    RozgarRequest,
    SalaryAdvance,
    WagePayment,
    WorkerBenefitRecord,
    WorkerContractorBinding,
    WorkerEmployment,
    WorkerGatePass,
    WorkerGrievance,
    WorkerWages,
    User,
)

DEMO_PHONES = [
    "9999294962", "1111111111", "2222222222", "3333333333",
    "4444444444", "5555555555", "6666666666", "7777777777", "8888888888",
]


class Command(BaseCommand):
    help = "Delete demo-account activity (bindings, leave, grievances, passes, ...)."

    @transaction.atomic
    def handle(self, *args, **options):
        usernames = [f"{role}_{phone}" for phone in DEMO_PHONES
                     for role in ("worker", "contractor", "employer")]
        users = User.objects.filter(username__in=usernames)
        ids = list(users.values_list("id", flat=True))
        if not ids:
            self.stdout.write("No demo users found.")
            return

        counts = {}

        def wipe(label, qs):
            n, _ = qs.delete()
            counts[label] = n

        # Grievances (responses cascade).
        wipe("grievance responses", GrievanceResponse.objects.filter(
            grievance__worker_id__in=ids))
        wipe("grievances", WorkerGrievance.objects.filter(worker_id__in=ids))
        # Leave.
        wipe("leave requests", LeaveRequest.objects.filter(worker_id__in=ids))
        # Payroll.
        wipe("salary advances", SalaryAdvance.objects.filter(worker_id__in=ids))
        wipe("benefit records", WorkerBenefitRecord.objects.filter(worker_id__in=ids))
        wipe("gratuity applications", GratuityApplication.objects.filter(worker_id__in=ids))
        wipe("wage payments", WagePayment.objects.filter(worker_wages__worker_id__in=ids))
        wipe("wages", WorkerWages.objects.filter(worker_id__in=ids))
        # Access.
        wipe("gate passes", WorkerGatePass.objects.filter(worker_id__in=ids))
        # Rozgar.
        wipe("rozgar requests", RozgarRequest.objects.filter(worker_id__in=ids))
        # Attendance.
        wipe("attendance", Attendance.objects.filter(worker_id__in=ids))
        # Learning.
        wipe("course enrollments", CourseEnrollment.objects.filter(worker_id__in=ids))
        # Bindings (employment first; consent challenges cascade).
        wipe("employment records", WorkerEmployment.objects.filter(
            user_id__in=ids))
        wipe("consent challenges", ConsentChallenge.objects.filter(
            binding__worker_id__in=ids))
        wipe("bindings", WorkerContractorBinding.objects.filter(worker_id__in=ids))
        # Notifications tied to the demo users.
        wipe("notifications", Notification.objects.filter(user_id__in=ids))

        self.stdout.write(self.style.SUCCESS(
            f"Reset {len(ids)} demo users. Deleted: "
            + ", ".join(f"{k}={v}" for k, v in counts.items())))
