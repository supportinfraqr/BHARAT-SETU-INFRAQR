"""Import legacy SQL Server reference data into PostgreSQL (Employer/Contractor/Worker + QR)."""
from django.core.management.base import BaseCommand
from django.db import transaction

from legacy.models import EmployeeMaster, PartyMaster
from qr.models import Contractor, Employer, Worker
from qr.services import create_qr_for_entity


class Command(BaseCommand):
    help = "Seed PostgreSQL QR tables from the legacy SQL Server mirror."

    def handle(self, *args, **options):
        self.stdout.write("Importing Employers (PartyMaster PartyType=Client) ...")
        with transaction.atomic():
            for row in PartyMaster.objects.filter(
                PartyType__iexact="Client", IsDeleted=0
            )[:500]:
                emp, _ = Employer.objects.get_or_create(
                    legacy_party_id=row.PartyId,
                    defaults={
                        "name": row.PartyName or f"Employer {row.PartyId}",
                        "contact_person": row.ContactPerson,
                        "contact_mobile": row.ContactMobile,
                        "email": row.EmailId,
                        "address": row.Address,
                    },
                )
                create_qr_for_entity("EMPLOYER", emp.pk)

        self.stdout.write("Importing Contractors (PartyMaster PartyType=Vendor) ...")
        with transaction.atomic():
            for row in PartyMaster.objects.filter(
                PartyType__iexact="Vendor", IsDeleted=0
            )[:500]:
                con, _ = Contractor.objects.get_or_create(
                    legacy_party_id=row.PartyId,
                    defaults={"name": row.PartyName or f"Contractor {row.PartyId}"},
                )
                create_qr_for_entity("CONTRACTOR", con.pk)

        self.stdout.write("Importing Workers (from EmployeeMaster) ...")
        with transaction.atomic():
            imported = 0
            for row in EmployeeMaster.objects.filter(IsActive="1")[:1000]:
                wid = row.EmployeeCode or f"WRK{row.Id:06d}"
                worker, created = Worker.objects.get_or_create(
                    legacy_employee_id=row.Id,
                    defaults={
                        "worker_id": wid,
                        "full_name": row.EmployeeName or f"Worker {row.Id}",
                        "legacy_employee_code": row.EmployeeCode,
                        "mobile": row.MobileNumber,
                        "aadhaar_no": row.AdharCardNumber,
                        "pan_no": row.PANNumber,
                    },
                )
                if created:
                    imported += 1
                create_qr_for_entity("WORKER", worker.pk)
            self.stdout.write(f"  imported {imported} new workers")

        self.stdout.write(self.style.SUCCESS(
            f"Done. Employers={Employer.objects.count()} Contractors={Contractor.objects.count()} "
            f"Workers={Worker.objects.count()}"
        ))
