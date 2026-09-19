"""Clear ALL binding data (every user) on this database.

Deletes bindings and everything derived from them, in FK-safe order, without
touching user accounts, identities, sites or masters. Intended for a LOCAL dev
database so bindings can be re-tested from scratch.

Usage:
    python manage.py clear_bindings --dry-run     # show what would be deleted
    python manage.py clear_bindings --yes         # actually delete
"""

from django.core.management.base import BaseCommand
from django.db import transaction


def _targets():
    """(label, queryset-factory) pairs in delete order."""
    from bss_core.models import (
        ApprovalQueue, ComplianceBatch, ComplianceChecklistField,
        ContractorEmployerBinding, ContractorSiteAllotment, ConsentChallenge,
        GatePassScan, GratuityApplication, Notification, PayrollWorkspaceStore,
        SalaryAdvance, SubmissionEvidence, WagePayment, WorkerBenefitRecord,
        WorkerComplianceChecklist, WorkerContractorBinding, WorkerEmployment,
        WorkerGatePass, WorkerGatePassBlock, WorkerWages,
    )
    return [
        ("gate pass scans", GatePassScan.objects.all()),
        ("gate pass blocks", WorkerGatePassBlock.objects.all()),
        ("gate passes", WorkerGatePass.objects.all()),
        ("compliance checklist fields", ComplianceChecklistField.objects.all()),
        ("compliance checklists", WorkerComplianceChecklist.objects.all()),
        ("employment records", WorkerEmployment.objects.all()),
        ("consent challenges", ConsentChallenge.objects.all()),
        ("wage payments", WagePayment.objects.all()),
        ("wages", WorkerWages.objects.all()),
        ("salary advances", SalaryAdvance.objects.all()),
        ("benefit records", WorkerBenefitRecord.objects.all()),
        ("gratuity applications", GratuityApplication.objects.all()),
        ("payroll workspace stores", PayrollWorkspaceStore.objects.all()),
        ("submissions", SubmissionEvidence.objects.all()),
        ("compliance batches", ComplianceBatch.objects.all()),
        ("approvals", ApprovalQueue.objects.all()),
        ("notifications", Notification.objects.all()),
        ("worker-contractor bindings", WorkerContractorBinding.objects.all()),
        ("site allotments", ContractorSiteAllotment.objects.all()),
        ("contractor-employer bindings", ContractorEmployerBinding.objects.all()),
    ]


class Command(BaseCommand):
    help = "Delete ALL binding data (every user) from this database — local dev only."

    def add_arguments(self, parser):
        parser.add_argument("--yes", action="store_true", help="Confirm deletion.")
        parser.add_argument("--dry-run", action="store_true", help="Show counts only.")

    def handle(self, *args, **options):
        targets = _targets()
        if options["dry_run"] or not options["yes"]:
            self.stdout.write("Binding data on this database:")
            for label, qs in targets:
                self.stdout.write(f"  {label:32s} {qs.count()}")
            if not options["yes"]:
                self.stdout.write(self.style.WARNING(
                    "\nDry run. Re-run with --yes to delete."))
            return

        with transaction.atomic():
            for label, qs in targets:
                n, _ = qs.delete()
                self.stdout.write(f"  deleted {label}: {n}")
        self.stdout.write(self.style.SUCCESS("All binding data cleared."))
