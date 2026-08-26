"""
Seed script for BSS QR Backend.
Creates: 2 Employers, 4 Contractors, 4 Workers, Sites, Bindings, QR codes.
Also sets up ERP user links so login→scan flow works.

Run locally first (with Django settings), then deploy to server.
"""
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bss_qr.settings')

import django
django.setup()

from django.utils import timezone
from qr.models import (
    Employer, Contractor, Worker, Site, Binding, QRCode,
    ContractorEmployment, ScanLog, AuditLog, Notification,
)
from authx.models import User


def get_or_create_qr(entity_type, entity_id):
    from qr.services import generate_qr_reference
    ref = generate_qr_reference(entity_type, entity_id)
    qr, created = QRCode.objects.get_or_create(
        entity_type=entity_type, entity_id=entity_id,
        defaults={'qr_reference': ref, 'status': 'BOUND'}
    )
    if not created:
        qr.qr_reference = ref
        qr.status = 'BOUND'
        qr.save(update_fields=['qr_reference', 'status'])
    print(f"  QR {entity_type}:{entity_id} -> {ref[:50]}...")
    return qr


def main():
    now = timezone.now()

    # ================================================================
    # CLEANUP: Remove all existing QR data
    # ================================================================
    print("=" * 60)
    print("CLEANUP")
    print("=" * 60)
    AuditLog.objects.all().delete()
    ScanLog.objects.all().delete()
    Notification.objects.all().delete()
    Binding.objects.all().delete()
    QRCode.objects.all().delete()
    ContractorEmployment.objects.all().delete()
    Worker.objects.all().delete()
    Contractor.objects.all().delete()
    Site.objects.all().delete()
    Employer.objects.all().delete()
    print("  All QR entities cleared.\n")

    # ================================================================
    # EMPLOYERS (2)
    # ================================================================
    print("=" * 60)
    print("EMPLOYERS")
    print("=" * 60)
    emp_a = Employer.objects.create(
        name="Principal Infra Solutions Pvt Ltd",
        contact_person="Vikash Sharma",
        contact_mobile="9876543210",
        email="employer@test.com",
        address="123 Sector 62, Noida, UP 201301",
        pan_no="AABCP1234A",
        gstin="09AABCP1234A1ZV",
        industry="Construction",
        state="Uttar Pradesh",
        city="Noida",
        pincode="201301",
        approval_status="APPROVED",
        is_active=True,
    )
    print(f"  Employer A: {emp_a.name} (id={emp_a.id})")

    emp_b = Employer.objects.create(
        name="Metro Developers Ltd",
        contact_person="Anita Gupta",
        contact_mobile="9876543220",
        email="metro@test.com",
        address="456 Rajpur Road, Dehradun, UK 248001",
        pan_no="AABCM5678B",
        gstin="05AABCM5678B1ZV",
        industry="Real Estate",
        state="Uttarakhand",
        city="Dehradun",
        pincode="248001",
        approval_status="APPROVED",
        is_active=True,
    )
    print(f"  Employer B: {emp_b.name} (id={emp_b.id})")

    # ================================================================
    # SITES (2 per employer)
    # ================================================================
    print("\n" + "=" * 60)
    print("SITES")
    print("=" * 60)
    site_a1 = Site.objects.create(
        name="Noida Metro Phase 2",
        site_code="NMD-P2-001",
        employer=emp_a,
        address="Plot 78, Knowledge Park, Greater Noida",
        city="Greater Noida",
        state="Uttar Pradesh",
        pincode="201310",
        contact_person="Rajesh Kumar",
        contact_mobile="9876543211",
        latitude=28.4595,
        longitude=77.0266,
        is_active=True,
    )
    print(f"  Site A1: {site_a1.name} (id={site_a1.id})")

    site_a2 = Site.objects.create(
        name="Noida Expressway Tower",
        site_code="NEX-TWR-002",
        employer=emp_a,
        address="Tower B, Sector 137, Noida Expressway",
        city="Noida",
        state="Uttar Pradesh",
        pincode="201305",
        contact_person="Amit Singh",
        contact_mobile="9876543212",
        latitude=28.5074,
        longitude=77.3888,
        is_active=True,
    )
    print(f"  Site A2: {site_a2.name} (id={site_a2.id})")

    site_b1 = Site.objects.create(
        name="Dehradun Valley Project",
        site_code="DVP-001",
        employer=emp_b,
        address="Village Selaqui, Dehradun",
        city="Dehradun",
        state="Uttarakhand",
        pincode="248155",
        contact_person="Pradeep Nain",
        contact_mobile="9876543221",
        latitude=30.2363,
        longitude=77.7989,
        is_active=True,
    )
    print(f"  Site B1: {site_b1.name} (id={site_b1.id})")

    site_b2 = Site.objects.create(
        name="Rajpur Road Highrise",
        site_code="RRH-002",
        employer=emp_b,
        address="42 Rajpur Road, Dehradun",
        city="Dehradun",
        state="Uttarakhand",
        pincode="248001",
        contact_person="Sanjay Verma",
        contact_mobile="9876543222",
        latitude=30.3265,
        longitude=78.0104,
        is_active=True,
    )
    print(f"  Site B2: {site_b2.name} (id={site_b2.id})")

    # ================================================================
    # CONTRACTORS (4: 2 per employer)
    # ================================================================
    print("\n" + "=" * 60)
    print("CONTRACTORS")
    print("=" * 60)
    con1 = Contractor.objects.create(
        name="Sharma Constructions",
        contact_person="Manish Sharma",
        contact_mobile="9876543310",
        email="contractor@test.com",
        address="78 Industrial Area, Noida",
        pan_no="BCDPS1234C",
        gstin="09BCDPS1234C1ZV",
        industry="Civil Works",
        state="Uttar Pradesh",
        city="Noida",
        employer=emp_a,
        site=site_a1,
        is_primary=True,
        is_active=True,
    )
    print(f"  Contractor 1: {con1.name} (id={con1.id}) -> Employer {emp_a.name}")

    con2 = Contractor.objects.create(
        name="Apex Infrastructure",
        contact_person="Deepak Verma",
        contact_mobile="9876543320",
        email="apex@test.com",
        address="12 Phase 2, Noida",
        pan_no="BCDPA9876D",
        gstin="09BCDPA9876D1ZV",
        industry="Electrical",
        state="Uttar Pradesh",
        city="Noida",
        employer=emp_a,
        site=site_a2,
        is_primary=False,
        is_active=True,
    )
    print(f"  Contractor 2: {con2.name} (id={con2.id}) -> Employer {emp_a.name}")

    con3 = Contractor.objects.create(
        name="Himalayan Builders",
        contact_person="Ravi Tiwari",
        contact_mobile="9876543330",
        email="himalayan@test.com",
        address="34 Rajpur Road, Dehradun",
        pan_no="BCDPH4321E",
        gstin="05BCDPH4321E1ZV",
        industry="Plumbing",
        state="Uttarakhand",
        city="Dehradun",
        employer=emp_b,
        site=site_b1,
        is_primary=True,
        is_active=True,
    )
    print(f"  Contractor 3: {con3.name} (id={con3.id}) -> Employer {emp_b.name}")

    con4 = Contractor.objects.create(
        name="Doon Valley Contractors",
        contact_person="Suresh Rawat",
        contact_mobile="9876543340",
        email="doon@test.com",
        address="56 Clement Town, Dehradun",
        pan_no="BCDPD8765F",
        gstin="05BCDPD8765F1ZV",
        industry="Finishing",
        state="Uttarakhand",
        city="Dehradun",
        employer=emp_b,
        site=site_b2,
        is_primary=False,
        is_active=True,
    )
    print(f"  Contractor 4: {con4.name} (id={con4.id}) -> Employer {emp_b.name}")

    # ================================================================
    # CONTRACTOR EMPLOYMENT records (link contractor↔employer↔site)
    # ================================================================
    print("\n" + "=" * 60)
    print("CONTRACTOR EMPLOYMENTS")
    print("=" * 60)
    for c, e, s in [(con1, emp_a, site_a1), (con2, emp_a, site_a2),
                     (con3, emp_b, site_b1), (con4, emp_b, site_b2)]:
        ce = ContractorEmployment.objects.create(
            contractor=c, employer=e, site=s, status="ACTIVE",
            started_at=now,
        )
        print(f"  {c.name} @ {e.name} [{s.name}] -> ACTIVE")

    # ================================================================
    # WORKERS (4: 1 per contractor)
    # ================================================================
    print("\n" + "=" * 60)
    print("WORKERS")
    print("=" * 60)
    w1 = Worker.objects.create(
        full_name="Rajesh Kumar",
        worker_id="WK-001",
        mobile="9876543410",
        designation="Mason",
        department="Civil Works",
        gender="Male",
        blood_group="B+",
        state="Uttar Pradesh",
        city="Noida",
        pincode="201310",
        present_address="12 Village Kulesra, Greater Noida",
        employer=emp_a,
        contractor=con1,
        site=site_a1,
        is_active=True,
        doj="15/01/2025",
        father_name="Ram Kumar",
        legacy_employee_code="worker@test.com",
    )
    print(f"  Worker 1: {w1.full_name} (id={w1.id}) -> {con1.name} @ {site_a1.name}")

    w2 = Worker.objects.create(
        full_name="Amit Sharma",
        worker_id="WK-002",
        mobile="9876543420",
        designation="Electrician",
        department="Electrical",
        gender="Male",
        blood_group="O+",
        state="Bihar",
        city="Patna",
        pincode="800001",
        present_address="45 Sector 62, Noida",
        employer=emp_a,
        contractor=con2,
        site=site_a2,
        is_active=True,
        doj="01/03/2025",
        father_name="Dinesh Sharma",
    )
    print(f"  Worker 2: {w2.full_name} (id={w2.id}) -> {con2.name} @ {site_a2.name}")

    w3 = Worker.objects.create(
        full_name="Suresh Patel",
        worker_id="WK-003",
        mobile="9876543430",
        designation="Plumber",
        department="Plumbing",
        gender="Male",
        blood_group="A+",
        state="Uttarakhand",
        city="Dehradun",
        pincode="248001",
        present_address="78 Rajpur Road, Dehradun",
        employer=emp_b,
        contractor=con3,
        site=site_b1,
        is_active=True,
        doj="10/06/2025",
        father_name="Gopal Patel",
    )
    print(f"  Worker 3: {w3.full_name} (id={w3.id}) -> {con3.name} @ {site_b1.name}")

    w4 = Worker.objects.create(
        full_name="Vikram Singh",
        worker_id="WK-004",
        mobile="9876543440",
        designation="Carpenter",
        department="Wood Works",
        gender="Male",
        blood_group="AB+",
        state="Punjab",
        city="Ludhiana",
        pincode="141001",
        present_address="23 Selaqui, Dehradun",
        employer=emp_b,
        contractor=con4,
        site=site_b2,
        is_active=True,
        doj="01/08/2025",
        father_name="Mahender Singh",
    )
    print(f"  Worker 4: {w4.full_name} (id={w4.id}) -> {con4.name} @ {site_b2.name}")

    # ================================================================
    # QR CODES (for all entities)
    # ================================================================
    print("\n" + "=" * 60)
    print("QR CODES")
    print("=" * 60)
    for etype, eid in [
        ("EMPLOYER", emp_a.id), ("EMPLOYER", emp_b.id),
        ("CONTRACTOR", con1.id), ("CONTRACTOR", con2.id),
        ("CONTRACTOR", con3.id), ("CONTRACTOR", con4.id),
        ("WORKER", w1.id), ("WORKER", w2.id),
        ("WORKER", w3.id), ("WORKER", w4.id),
        ("SITE", site_a1.id), ("SITE", site_a2.id),
        ("SITE", site_b1.id), ("SITE", site_b2.id),
    ]:
        get_or_create_qr(etype, eid)

    # ================================================================
    # BINDINGS
    # ================================================================
    print("\n" + "=" * 60)
    print("BINDINGS")
    print("=" * 60)

    # EMPLOYER_CONTRACTOR bindings (all ACTIVE)
    for e, c, s in [(emp_a, con1, site_a1), (emp_a, con2, site_a2),
                     (emp_b, con3, site_b1), (emp_b, con4, site_b2)]:
        b = Binding.objects.create(
            binding_type="EMPLOYER_CONTRACTOR",
            employer=e, contractor=c, site=s, site_name=s.name,
            status="ACTIVE",
            initiator_consent="APPROVED",
            approver_consent="APPROVED",
            initiator_consent_at=now,
            approver_consent_at=now,
            consent_channel="APP",
            started_at=now,
        )
        print(f"  EC Binding: {e.name} <-> {c.name} [{s.name}] (id={b.id}) ACTIVE")

    # WORKER_CONTRACTOR bindings (all ACTIVE)
    for w, c in [(w1, con1), (w2, con2), (w3, con3), (w4, con4)]:
        b = Binding.objects.create(
            binding_type="WORKER_CONTRACTOR",
            employer=w.employer, contractor=c, worker=w, site=w.site,
            site_name=w.site.name if w.site else "",
            status="ACTIVE",
            initiator_consent="APPROVED",
            approver_consent="APPROVED",
            initiator_consent_at=now,
            approver_consent_at=now,
            consent_channel="APP",
            started_at=now,
        )
        print(f"  WC Binding: {w.full_name} <-> {c.name} (id={b.id}) ACTIVE")

    # ================================================================
    # ERP USER LINKS (set Django User FKs for proper resolve_scope)
    # ================================================================
    print("\n" + "=" * 60)
    print("ERP USER LINKS")
    print("=" * 60)

    # employer@test.com → Employer A (id=emp_a.id)
    u_emp = User.objects.filter(username="employer@test.com").first()
    if u_emp:
        u_emp.employer_id = emp_a.id
        u_emp.save(update_fields=["employer_id"])
        print(f"  employer@test.com -> employer_id={emp_a.id}")

    # contractor@test.com → Contractor 1 (id=con1.id)
    u_con = User.objects.filter(username="contractor@test.com").first()
    if u_con:
        u_con.contractor_id = con1.id
        u_con.save(update_fields=["contractor_id"])
        print(f"  contractor@test.com -> contractor_id={con1.id}")

    # worker@test.com → linked via legacy_employee_code="worker@test.com" on Worker 1
    u_wkr = User.objects.filter(username="worker@test.com").first()
    if u_wkr:
        u_wkr.employer_id = emp_a.id
        u_wkr.contractor_id = con1.id
        u_wkr.mobile = w1.mobile
        u_wkr.save(update_fields=["employer_id", "contractor_id", "mobile"])
        print(f"  worker@test.com -> employer_id={emp_a.id}, contractor_id={con1.id}, mobile={w1.mobile}")

    # ================================================================
    # SUMMARY
    # ================================================================
    print("\n" + "=" * 60)
    print("FINAL SUMMARY")
    print("=" * 60)
    print(f"\nEmployers ({Employer.objects.count()}):")
    for e in Employer.objects.all():
        print(f"  id={e.id} name={e.name} email={e.email}")

    print(f"\nSites ({Site.objects.count()}):")
    for s in Site.objects.all():
        print(f"  id={s.id} name={s.name} employer_id={s.employer_id}")

    print(f"\nContractors ({Contractor.objects.count()}):")
    for c in Contractor.objects.all():
        print(f"  id={c.id} name={c.name} employer_id={c.employer_id} site={c.site.name if c.site else '-'}")

    print(f"\nWorkers ({Worker.objects.count()}):")
    for w in Worker.objects.all():
        print(f"  id={w.id} name={w.full_name} emp={w.employer_id} con={w.contractor_id} site={w.site.name if w.site else '-'}")

    print(f"\nBindings ({Binding.objects.count()}):")
    for b in Binding.objects.all():
        emp_n = Employer.objects.filter(pk=b.employer_id).values_list('name', flat=True).first() or '-'
        con_n = Contractor.objects.filter(pk=b.contractor_id).values_list('name', flat=True).first() or '-'
        wkr_n = Worker.objects.filter(pk=b.worker_id).values_list('full_name', flat=True).first() or '-'
        print(f"  id={b.id} type={b.binding_type} emp={emp_n} con={con_n} worker={wkr_n} site={b.site_name or '-'} status={b.status}")

    print(f"\nQR Codes ({QRCode.objects.count()}):")
    for qr in QRCode.objects.all():
        print(f"  id={qr.id} type={qr.entity_type} entity={qr.entity_id} status={qr.status}")

    print(f"\nDjango Users:")
    for u in User.objects.all().order_by('id'):
        print(f"  id={u.id} username={u.username} role={u.role} emp={u.employer_id} con={u.contractor_id}")

    print("\n" + "=" * 60)
    print("SEED COMPLETE!")
    print("=" * 60)


if __name__ == "__main__":
    main()
