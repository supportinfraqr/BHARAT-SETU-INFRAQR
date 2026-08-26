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
    worker_data = [
        dict(
            full_name="Rajesh Kumar", worker_id="WK-001", mobile="9876543410",
            alternative_mobile="9876543411", email="rajesh.kumar@demo.com",
            aadhaar_no="123456789012", aadhaar_status="VERIFIED",
            pan_no="ABCK1234P", designation="Mason", department="Civil Works",
            gender="Male", marital_status="Married", date_of_birth="15/08/1990",
            year_of_birth="1990", blood_group="B+", religion="Hindu", caste="General",
            state="Uttar Pradesh", city="Noida", pincode="201310",
            present_address="12 Village Kulesra, Greater Noida",
            permanent_address="12 Village Kulesra, Greater Noida",
            p_state="Uttar Pradesh", p_city="Greater Noida", p_pincode="201310",
            landmark="Near Kulesra Chowk", district="Gautam Buddha Nagar",
            sub_district="Jewar", post_office="Kulesra", street="Main Road", house="H-12",
            employer=emp_a, contractor=con1, site=site_a1, is_active=True,
            doj="15/01/2025", father_name="Ram Kumar", legacy_employee_code="worker@test.com",
            legacy_employee_id=470,
            previous_uan="100234567890", previous_esi="2004567890123",
            camp_number="CAMP-A1-01", transport="BSS Bus 12", route_id="RTE-A1-01",
            supervisor1="Manish Sharma", supervisor2="Rakesh Yadav",
            escalation1="Manish Sharma", escalation2="Deepak Verma",
            issue_date="15/01/2025", valid_till="31/12/2026",
            bank_account="50100234567891", bank_ifsc="HDFC0001234",
            bank_name="HDFC Bank", account_holder_name="Rajesh Kumar",
            nominee_name="Sunita Kumar", nominee_relation="Wife",
            nominee_dob="20/05/1993", nominee_mobile="9876500011",
            nominee_address="12 Village Kulesra, Greater Noida",
            gross_salary="22500", wage_type="Monthly",
            wage_disbursement_mode="Bank Transfer", minimum_wage_category="Semi-skilled",
            lwf="YES", wc_policy="L&T Policy 2025",
            worker_grade="Grade-3", type_work="Permanent", nature_job="Construction",
            s_date="15/01/2025", en_date="31/12/2026",
            s_name="Noida Metro Phase 2", site_location="Greater Noida", site_state="Uttar Pradesh",
            fitness_types="Fit", medical_status="FIT", next_medical_due="15/01/2026",
            ppe="YES", ppe_type="Helmet, Safety Shoes, Gloves",
            safety_training_status="COMPLETED", site_induction_status="COMPLETED",
            police_verification_status="CLEARED",
            temp_id_status="ISSUED", temp_id_number="TMP-001-2025", temp_id_date="15/01/2025",
            permanent_id_status="ISSUED", permanent_id_number="BSS-001-2025", permanent_id_date="15/02/2025",
            pf_account="PF-UP-1012345678", trainer_name="Manish Sharma", trainer_date="16/01/2025",
        ),
        dict(
            full_name="Amit Sharma", worker_id="WK-002", mobile="9876543420",
            alternative_mobile="9876543421", email="amit.sharma@demo.com",
            aadhaar_no="234567890123", aadhaar_status="VERIFIED",
            pan_no="ABCK2345P", designation="Electrician", department="Electrical",
            gender="Male", marital_status="Unmarried", date_of_birth="10/02/1995",
            year_of_birth="1995", blood_group="O+", religion="Hindu", caste="General",
            state="Bihar", city="Patna", pincode="800001",
            present_address="45 Sector 62, Noida",
            permanent_address="Village Rampur, Patna",
            p_state="Bihar", p_city="Patna", p_pincode="800001",
            landmark="Near Metro Station", district="Gautam Buddha Nagar",
            sub_district="Noida", post_office="Sector 62", street="Sector 62 Road", house="45-A",
            employer=emp_a, contractor=con2, site=site_a2, is_active=True,
            doj="01/03/2025", father_name="Dinesh Sharma",
            legacy_employee_id=471,
            previous_uan="100345678901", previous_esi="2005678901234",
            camp_number="CAMP-A2-02", transport="BSS Bus 07", route_id="RTE-A2-02",
            supervisor1="Deepak Verma", supervisor2="Rakesh Yadav",
            escalation1="Deepak Verma", escalation2="Manish Sharma",
            issue_date="01/03/2025", valid_till="31/12/2026",
            bank_account="50101234567890", bank_ifsc="ICICI0005678",
            bank_name="ICICI Bank", account_holder_name="Amit Sharma",
            nominee_name="Dinesh Sharma", nominee_relation="Father",
            nominee_dob="01/01/1965", nominee_mobile="9876500022",
            nominee_address="Village Rampur, Patna",
            gross_salary="26000", wage_type="Monthly",
            wage_disbursement_mode="Bank Transfer", minimum_wage_category="Skilled",
            lwf="YES", wc_policy="L&T Policy 2025",
            worker_grade="Grade-4", type_work="Permanent", nature_job="Electrical Works",
            s_date="01/03/2025", en_date="31/12/2026",
            s_name="Noida Expressway Tower", site_location="Noida", site_state="Uttar Pradesh",
            fitness_types="Fit", medical_status="FIT", next_medical_due="01/03/2026",
            ppe="YES", ppe_type="Helmet, Safety Shoes, Gloves, Goggles",
            safety_training_status="COMPLETED", site_induction_status="COMPLETED",
            police_verification_status="CLEARED",
            temp_id_status="ISSUED", temp_id_number="TMP-002-2025", temp_id_date="01/03/2025",
            permanent_id_status="ISSUED", permanent_id_number="BSS-002-2025", permanent_id_date="01/04/2025",
            pf_account="PF-UP-1013456789", trainer_name="Deepak Verma", trainer_date="02/03/2025",
        ),
        dict(
            full_name="Suresh Patel", worker_id="WK-003", mobile="9876543430",
            alternative_mobile="9876543431", email="suresh.patel@demo.com",
            aadhaar_no="345678901234", aadhaar_status="VERIFIED",
            pan_no="ABCK3456P", designation="Plumber", department="Plumbing",
            gender="Male", marital_status="Married", date_of_birth="05/06/1988",
            year_of_birth="1988", blood_group="A+", religion="Hindu", caste="OBC",
            state="Uttarakhand", city="Dehradun", pincode="248001",
            present_address="78 Rajpur Road, Dehradun",
            permanent_address="78 Rajpur Road, Dehradun",
            p_state="Uttarakhand", p_city="Dehradun", p_pincode="248001",
            landmark="Near Clock Tower", district="Dehradun",
            sub_district="Dehradun", post_office="Rajpur Road", street="Rajpur Road", house="78-B",
            employer=emp_b, contractor=con3, site=site_b1, is_active=True,
            doj="10/06/2025", father_name="Gopal Patel",
            legacy_employee_id=472,
            previous_uan="100456789012", previous_esi="2006789012345",
            camp_number="CAMP-B1-03", transport="BSS Bus 03", route_id="RTE-B1-03",
            supervisor1="Ravi Tiwari", supervisor2="Pradeep Nain",
            escalation1="Ravi Tiwari", escalation2="Anita Gupta",
            issue_date="10/06/2025", valid_till="31/12/2026",
            bank_account="50102345678901", bank_ifsc="SBI0001234",
            bank_name="State Bank of India", account_holder_name="Suresh Patel",
            nominee_name="Kavita Patel", nominee_relation="Wife",
            nominee_dob="12/09/1991", nominee_mobile="9876500033",
            nominee_address="78 Rajpur Road, Dehradun",
            gross_salary="21000", wage_type="Monthly",
            wage_disbursement_mode="Bank Transfer", minimum_wage_category="Semi-skilled",
            lwf="YES", wc_policy="Metro Policy 2025",
            worker_grade="Grade-3", type_work="Permanent", nature_job="Plumbing Works",
            s_date="10/06/2025", en_date="31/12/2026",
            s_name="Dehradun Valley Project", site_location="Selaqui, Dehradun", site_state="Uttarakhand",
            fitness_types="Fit", medical_status="FIT", next_medical_due="10/06/2026",
            ppe="YES", ppe_type="Helmet, Safety Shoes, Gloves",
            safety_training_status="COMPLETED", site_induction_status="COMPLETED",
            police_verification_status="CLEARED",
            temp_id_status="ISSUED", temp_id_number="TMP-003-2025", temp_id_date="10/06/2025",
            permanent_id_status="ISSUED", permanent_id_number="BSS-003-2025", permanent_id_date="10/07/2025",
            pf_account="PF-UK-1014567890", trainer_name="Ravi Tiwari", trainer_date="11/06/2025",
        ),
        dict(
            full_name="Vikram Singh", worker_id="WK-004", mobile="9876543440",
            alternative_mobile="9876543441", email="vikram.singh@demo.com",
            aadhaar_no="456789012345", aadhaar_status="VERIFIED",
            pan_no="ABCK4567P", designation="Carpenter", department="Wood Works",
            gender="Male", marital_status="Married", date_of_birth="22/11/1985",
            year_of_birth="1985", blood_group="AB+", religion="Sikh", caste="General",
            state="Punjab", city="Ludhiana", pincode="141001",
            present_address="23 Selaqui, Dehradun",
            permanent_address="Gali No. 4, Jalandhar Road, Ludhiana",
            p_state="Punjab", p_city="Ludhiana", p_pincode="141001",
            landmark="Near Bus Stand", district="Dehradun",
            sub_district="Rishikesh", post_office="Selaqui", street="Selaqui Road", house="23-C",
            employer=emp_b, contractor=con4, site=site_b2, is_active=True,
            doj="01/08/2025", father_name="Mahender Singh",
            legacy_employee_id=473,
            previous_uan="100567890123", previous_esi="2007890123456",
            camp_number="CAMP-B2-04", transport="BSS Bus 09", route_id="RTE-B2-04",
            supervisor1="Sanjay Verma", supervisor2="Pradeep Nain",
            escalation1="Sanjay Verma", escalation2="Anita Gupta",
            issue_date="01/08/2025", valid_till="31/12/2026",
            bank_account="50103456789012", bank_ifsc="AXIS0005678",
            bank_name="Axis Bank", account_holder_name="Vikram Singh",
            nominee_name="Harpreet Kaur", nominee_relation="Wife",
            nominee_dob="03/03/1989", nominee_mobile="9876500044",
            nominee_address="Gali No. 4, Jalandhar Road, Ludhiana",
            gross_salary="24000", wage_type="Monthly",
            wage_disbursement_mode="Bank Transfer", minimum_wage_category="Skilled",
            lwf="YES", wc_policy="Metro Policy 2025",
            worker_grade="Grade-4", type_work="Permanent", nature_job="Wood Works",
            s_date="01/08/2025", en_date="31/12/2026",
            s_name="Rajpur Road Highrise", site_location="Rajpur Road, Dehradun", site_state="Uttarakhand",
            fitness_types="Fit", medical_status="FIT", next_medical_due="01/08/2026",
            ppe="YES", ppe_type="Helmet, Safety Shoes, Gloves",
            safety_training_status="COMPLETED", site_induction_status="COMPLETED",
            police_verification_status="CLEARED",
            temp_id_status="ISSUED", temp_id_number="TMP-004-2025", temp_id_date="01/08/2025",
            permanent_id_status="ISSUED", permanent_id_number="BSS-004-2025", permanent_id_date="01/09/2025",
            pf_account="PF-UK-1015678901", trainer_name="Sanjay Verma", trainer_date="02/08/2025",
        ),
    ]

    workers = []
    for wd in worker_data:
        w = Worker.objects.create(**wd)
        workers.append(w)
        print(f"  Worker: {w.full_name} (id={w.id}) -> {w.contractor.name if w.contractor else '-'} @ {w.site.name if w.site else '-'}")
    w1, w2, w3, w4 = workers

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
    # LOGIN ACCOUNTS for every entity (password = username)
    # ================================================================
    print("\n" + "=" * 60)
    print("LOGIN ACCOUNTS")
    print("=" * 60)

    def ensure_user(username, role, employer=None, contractor=None, worker=None):
        u = User.objects.filter(username=username).first()
        if not u:
            u = User(username=username, role=role, email=username)
        else:
            u.role = role
        if employer is not None:
            u.employer_id = employer.pk if hasattr(employer, 'pk') else employer
        if contractor is not None:
            u.contractor_id = contractor.pk if hasattr(contractor, 'pk') else contractor
        if worker is not None:
            w = worker
            w.legacy_employee_code = username
            w.mobile = w.mobile or username
            w.save(update_fields=["legacy_employee_code"])
            u.employer_id = w.employer_id
            u.contractor_id = w.contractor_id
            u.mobile = w.mobile
        u.set_password(username)
        u.save()
        print(f"  {username} ({role}) emp={u.employer_id} con={u.contractor_id}")

    ensure_user("metro@test.com", "EMPLOYER", employer=emp_b)
    ensure_user("apex@test.com", "PRIMARY_CONTRACTOR", contractor=con2)
    ensure_user("himalayan@test.com", "PRIMARY_CONTRACTOR", contractor=con3)
    ensure_user("doon@test.com", "PRIMARY_CONTRACTOR", contractor=con4)
    ensure_user("amit@test.com", "WORKER", worker=w2)
    ensure_user("suresh@test.com", "WORKER", worker=w3)
    ensure_user("vikram@test.com", "WORKER", worker=w4)
    print("  (existing accounts employer/contractor/worker@test.com preserved)")

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
