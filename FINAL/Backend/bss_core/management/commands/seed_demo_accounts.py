"""Seed the BSS demo accounts (workers / contractors / employers).

Idempotent — safe to re-run. Usage:

    python manage.py seed_demo_accounts

Passwords:
    workers     -> Bss@Worker123
    contractors -> Bss@Contractor123
    employers   -> Bss@Employer123

BSS IDs are random alphanumeric: BSS-W / BSS-C / BSS-E + 10 chars. Codes are
assigned only when an account is first created (or its code is blank), so
re-running never clobbers an already-issued ID.
"""

import uuid

from django.core.management.base import BaseCommand
from django.db import transaction

from api import bss_ids
from bss_core.models import (
    ContractorProfile,
    EmployerProfile,
    User,
    UserCredential,
    WorkerIdentity,
    WorkerOther,
)

WORKER_PASSWORD = "Bss@Worker123"
CONTRACTOR_PASSWORD = "Bss@Contractor123"
EMPLOYER_PASSWORD = "Bss@Employer123"
DEMO_MPIN = "1234"

# (phone, name) — easy demo ids. 1111111111 is the primary demo worker.
WORKERS = [
    ("1111111111", "Ramesh Kumar"),
    ("2222222222", "Suresh Patel"),
    ("3333333333", "Anita Devi"),
]

# (phone, contractor name)
CONTRACTORS = [
    ("4444444444", "BuildWell Contractors"),
    ("5555555555", "Skyline Infra"),
    ("6666666666", "Metro Labour Co"),
]

# (phone, employer name)
EMPLOYERS = [
    ("7777777777", "Adani Infra Pvt Ltd"),
    ("8888888888", "L&T Construction"),
]

# Contact/registration details shown to bound workers (contractor & employer
# details on the worker dashboard). Keyed by phone.
CONTRACTOR_DETAILS = {
    "4444444444": {"contact_person": "Rajesh Nair", "email": "contact@buildwell.example",
                   "lin": "MH/CLRA/2026/000444", "state": "Maharashtra",
                   "district": "Mumbai Suburban", "address": "Plot 14, MIDC, Andheri East, Mumbai 400093"},
    "5555555555": {"contact_person": "Meera Iyer", "email": "ops@skylineinfra.example",
                   "lin": "MH/CLRA/2026/000555", "state": "Maharashtra",
                   "district": "Thane", "address": "2nd Floor, Hiranandani Estate, Thane West 400607"},
    "6666666666": {"contact_person": "Salim Shaikh", "email": "admin@metrolabour.example",
                   "lin": "MH/CLRA/2026/000666", "state": "Maharashtra",
                   "district": "Pune", "address": "Survey 88, Hinjewadi Phase 2, Pune 411057"},
}

EMPLOYER_DETAILS = {
    "7777777777": {"contact_person": "Priya Menon", "email": "projects@adaniinfra.example",
                   "industry": "Infrastructure", "lin": "MH/PE/2026/000777",
                   "state": "Maharashtra", "district": "Mumbai",
                   "address": "Adani Corporate House, Shantigram, Ahmedabad 382421"},
    "8888888888": {"contact_person": "Karthik Rao", "email": "sites@lntconstruction.example",
                   "industry": "Construction", "lin": "MH/PE/2026/000888",
                   "state": "Maharashtra", "district": "Mumbai Suburban",
                   "address": "L&T House, Ballard Estate, Mumbai 400001"},
}

# Demo job postings (BSS_Feature_Comparison.xlsx > Rozgar Setu > Available Jobs).
# Keyed to the demo contractor phone so the worker /worker/rozgar screen shows
# real, backend-driven listings with State/City/Designation/Experience/DOB.
DEMO_JOBS = [
    {
        "phone": "4444444444", "title": "Electrician", "trade": "High-Rise Electrification",
        "category": "Electrical", "designation": "Electrician",
        "state": "Maharashtra", "city": "Pune", "wage": "26000",
        "experience": "3-6 years", "dob_limit": "On or after 01 Jan 1980", "vacancies": 4,
        "skills": ["Electrical Wiring", "Panel Installation", "Conduit Laying"],
        "description": "Site electrification, wiring and panel installation for a residential high-rise. PPE and site induction provided. Weekly wage settlement.",
    },
    {
        "phone": "5555555555", "title": "Bar Bender", "trade": "Metro Depot Works",
        "category": "Steel / Rebar", "designation": "Bar Bender",
        "state": "Maharashtra", "city": "Mumbai", "wage": "25500",
        "experience": "2-5 years", "dob_limit": "On or after 01 Jan 1982", "vacancies": 6,
        "skills": ["Rebar Cutting", "Cage Fabrication", "BBS Reading"],
        "description": "Rebar cutting, bending, cage fabrication for metro depot beam & column structures. Safety gear & site accommodation provided.",
    },
    {
        "phone": "6666666666", "title": "Scaffolder / Rigger", "trade": "Industrial Plant Maintenance",
        "category": "Scaffolding", "designation": "Scaffolder",
        "state": "Gujarat", "city": "Surat", "wage": "27000",
        "experience": "4+ years", "dob_limit": "On or after 01 Jan 1978", "vacancies": 3,
        "skills": ["Scaffolding Erection", "Rigging", "Work at Height"],
        "description": "Heavy scaffolding erection and dismantling for refinery shutdown maintenance. Mandatory safety kit & daily attendance log.",
    },
]

# Leave master (drives the worker Leave ledger: opening + accrued - availed).
DEMO_LEAVE_TYPES = [
    {"code": "PERSONAL", "name": "Personal Leave", "annual_entitlement": 12, "opening_balance": 2, "sort_order": 1},
    {"code": "MEDICAL", "name": "Medical Leave", "annual_entitlement": 12, "opening_balance": 1, "sort_order": 2},
    {"code": "OTHER", "name": "Other Configured Leave", "annual_entitlement": 12, "opening_balance": 0, "sort_order": 3},
]

# Demo courses (admin-managed catalog). Each lesson embeds a YouTube video;
# completing all lessons + passing the quiz awards the course's skill.
DEMO_COURSES = [
    {
        "code": "SAFETY-101", "title": "Construction Safety Basics", "provider": "BSS Learning",
        "category": "Safety", "duration": "2h", "rating": 4.6, "badge": "Mandatory", "sort_order": 1,
        "description": "Core site-safety rules: PPE, working at height, hazard reporting and emergency response.",
        "instructor": "BSS Safety Team", "certification": "BSS Safety Badge", "skill_name": "Site Safety",
        "modules": [
            {
                "title": "Module 1 · Safety Foundations",
                "lessons": [
                    {"title": "Why site safety matters", "duration": "15 min",
                     "youtube_url": "https://www.youtube.com/embed?listType=search&list=construction%20site%20safety%20basics"},
                    {"title": "Personal Protective Equipment (PPE)", "duration": "20 min",
                     "youtube_url": "https://www.youtube.com/embed?listType=search&list=construction%20PPE%20safety%20equipment"},
                ],
                "assignments": [
                    {"title": "Assignment 1 · Safety basics", "pass_score": 60, "questions": [
                        {"question": "What should you do before starting any task on site?",
                         "options": ["Start immediately", "Attend the safety briefing and wear PPE", "Wait for a friend", "Skip if experienced"],
                         "correct_index": 1},
                        {"question": "PPE stands for…",
                         "options": ["Personal Protective Equipment", "Public Property Entry", "Pre-Planned Excavation", "Paid Personal Earnings"],
                         "correct_index": 0},
                    ]},
                    {"title": "Written assignment · PPE checklist", "type": "WRITING", "pass_score": 60,
                     "instructions": "In your own words, list the PPE you must wear for a task at height and explain why each item matters (at least 3 items).",
                     "questions": []},
                ],
            },
            {
                "title": "Module 2 · Working at Height",
                "lessons": [
                    {"title": "Working at height & fall protection", "duration": "25 min",
                     "youtube_url": "https://www.youtube.com/embed?listType=search&list=working%20at%20height%20fall%20protection"},
                    {"title": "Emergency response on site", "duration": "15 min",
                     "youtube_url": "https://www.youtube.com/embed?listType=search&list=construction%20site%20emergency%20response"},
                ],
                "assignments": [
                    {"title": "Assignment 2 · Height & emergencies", "pass_score": 70, "questions": [
                        {"question": "A safety harness is required when working…",
                         "options": ["On the ground", "At height where a fall is possible", "Only at night", "Never"],
                         "correct_index": 1},
                        {"question": "If you see an unsafe condition you should…",
                         "options": ["Ignore it", "Report it to your supervisor", "Fix it without training", "Go home"],
                         "correct_index": 1},
                    ]},
                ],
            },
        ],
    },
    {
        "code": "FIN-101", "title": "Digital Financial Literacy", "provider": "Bharat Shram Setu",
        "category": "Life Skills", "duration": "1.5h", "rating": 4.8, "badge": "Recommended", "sort_order": 2,
        "description": "Digital banking, UPI payments and sending money home safely without falling for scams.",
        "instructor": "BSS Digital Empowerment Team", "certification": "Digital Citizen Certificate",
        "skill_name": "Digital Payments",
        "modules": [
            {
                "title": "Module 1 · Digital Banking",
                "lessons": [
                    {"title": "Setting up UPI safely", "duration": "20 min",
                     "youtube_url": "https://www.youtube.com/embed?listType=search&list=UPI%20payment%20setup%20tutorial%20hindi"},
                    {"title": "Sending money home securely", "duration": "20 min",
                     "youtube_url": "https://www.youtube.com/embed?listType=search&list=send%20money%20UPI%20safely"},
                ],
                "assignments": [
                    {"title": "Assignment 1 · UPI basics", "pass_score": 60, "questions": [
                        {"question": "Your UPI PIN should be shared with…",
                         "options": ["Your friend", "Nobody", "The caller from the bank", "The shopkeeper"],
                         "correct_index": 1},
                    ]},
                ],
            },
            {
                "title": "Module 2 · Staying Safe",
                "lessons": [
                    {"title": "Spotting scams and frauds", "duration": "20 min",
                     "youtube_url": "https://www.youtube.com/embed?listType=search&list=UPI%20fraud%20scam%20awareness"},
                ],
                "assignments": [
                    {"title": "Assignment 2 · Fraud awareness", "pass_score": 70, "questions": [
                        {"question": "A caller asking for your OTP is likely…",
                         "options": ["A bank officer", "A fraudster", "A government officer", "Your employer"],
                         "correct_index": 1},
                    ]},
                ],
            },
        ],
    },
    {
        "code": "MASON-201", "title": "Modern Masonry Techniques", "provider": "L&T Skilling Institute",
        "category": "Technical", "duration": "3h", "rating": 4.7, "badge": "", "sort_order": 3,
        "description": "Correct cement mixing ratios, efficient bricklaying, waterproofing and curing.",
        "instructor": "Amit Desai, Lead Engineer", "certification": "Advanced Mason (L3)",
        "skill_name": "Masonry",
        "modules": [
            {
                "title": "Module 1 · Materials & Mix",
                "lessons": [
                    {"title": "Understanding modern mix ratios", "duration": "30 min",
                     "youtube_url": "https://www.youtube.com/embed?listType=search&list=cement%20mortar%20mix%20ratio%20masonry"},
                ],
                "assignments": [
                    {"title": "Assignment 1 · Mix ratios", "pass_score": 60, "questions": [
                        {"question": "A common general-purpose mortar mix is…",
                         "options": ["1:1", "1:6", "1:20", "1:50"],
                         "correct_index": 1},
                    ]},
                ],
            },
            {
                "title": "Module 2 · Technique & Curing",
                "lessons": [
                    {"title": "Efficient bricklaying", "duration": "30 min",
                     "youtube_url": "https://www.youtube.com/embed?listType=search&list=bricklaying%20techniques%20mason"},
                    {"title": "Waterproofing & curing", "duration": "30 min",
                     "youtube_url": "https://www.youtube.com/embed?listType=search&list=concrete%20curing%20waterproofing"},
                ],
                "assignments": [
                    {"title": "Assignment 2 · Curing", "pass_score": 70, "questions": [
                        {"question": "Curing of concrete mainly helps to…",
                         "options": ["Change its colour", "Develop strength and prevent cracks", "Make it cheaper", "Speed up removal"],
                         "correct_index": 1},
                    ]},
                ],
            },
        ],
    },
    {
        "code": "SCAFF-301", "title": "Scaffolding Safety", "provider": "NSDC - Skill India",
        "category": "Safety", "duration": "2.5h", "rating": 4.8, "badge": "", "sort_order": 4,
        "description": "Safe erection, use and inspection of scaffolding for high-rise and industrial works.",
        "instructor": "Rajesh Kumar, Safety Officer", "certification": "NSDC Scaffolding Badge",
        "skill_name": "Scaffolding",
        "modules": [
            {
                "title": "Module 1 · Scaffold Basics",
                "lessons": [
                    {"title": "Types of scaffolding", "duration": "25 min",
                     "youtube_url": "https://www.youtube.com/embed?listType=search&list=scaffolding%20types%20construction"},
                    {"title": "Harness and fall protection", "duration": "25 min",
                     "youtube_url": "https://www.youtube.com/embed?listType=search&list=scaffolding%20harness%20fall%20protection"},
                ],
                "assignments": [
                    {"title": "Assignment 1 · Scaffold safety", "pass_score": 60, "questions": [
                        {"question": "Before using a scaffold you should…",
                         "options": ["Climb quickly", "Check it is tagged and inspected", "Remove some planks", "Ignore the tag"],
                         "correct_index": 1},
                    ]},
                ],
            },
            {
                "title": "Module 2 · Inspection",
                "lessons": [
                    {"title": "Pre-use inspection checklist", "duration": "25 min",
                     "youtube_url": "https://www.youtube.com/embed?listType=search&list=scaffold%20inspection%20checklist"},
                ],
                "assignments": [
                    {"title": "Assignment 2 · Inspection", "pass_score": 70, "questions": [
                        {"question": "A scaffold tag shows…",
                         "options": ["The worker's name", "Whether it is safe to use", "The weather", "The wage"],
                         "correct_index": 1},
                    ]},
                ],
            },
        ],
    },
]

# Supplementary reading material per module (admin-managed).
DEMO_READINGS = {
    ("SAFETY-101", 1): [
        {"title": "Site safety handbook", "duration": "10 min read",
         "body": "Key rules for every shift:\n• Always wear the PPE issued for your task (helmet, safety shoes, harness where required).\n• Attend the toolbox talk before starting work.\n• Report every hazard or near-miss to your supervisor immediately.\n• Know the emergency assembly point and first-aid location."},
        {"title": "PPE quick guide", "duration": "5 min read",
         "body": "Helmet: protects the head from falling objects.\nSafety shoes: steel toe, always laced.\nHarness: mandatory above 1.8 m, clipped to a certified anchor.\nGloves and goggles: for cutting, grinding and chemical work."},
    ],
    ("SAFETY-101", 2): [
        {"title": "Working-at-height checklist", "duration": "8 min read",
         "body": "Before working at height:\n1. Is there a safer way to do the job from the ground?\n2. Are guardrails, nets or a harness in place?\n3. Is the anchor point certified and inspected?\n4. Is the area below barricaded?\n5. Is the weather safe (no high wind / lightning)?"},
    ],
    ("FIN-101", 1): [
        {"title": "UPI safety guide", "duration": "6 min read",
         "body": "• Set your UPI PIN yourself and never share it — not even with someone claiming to be from the bank.\n• Verify the payee name before approving.\n• Check the amount carefully; UPI transfers are instant and hard to reverse.\n• Keep a transaction SMS/email as proof."},
    ],
    ("FIN-101", 2): [
        {"title": "Common fraud patterns", "duration": "6 min read",
         "body": "• Callers asking for OTP, PIN or CVV are fraudsters.\n• 'Lottery' or 'job deposit' requests are scams.\n• Remote-access apps (AnyDesk/TeamViewer) requested by strangers are dangerous.\n• If in doubt, disconnect and call your bank's official number."},
    ],
    ("MASON-201", 1): [
        {"title": "Mortar mix reference", "duration": "7 min read",
         "body": "General purpose mortar: 1 part cement : 6 parts sand.\nPlaster (internal): 1:4 to 1:6.\nUse clean, sieved sand and potable water.\nMix only what you can use within ~30 minutes."},
    ],
    ("MASON-201", 2): [
        {"title": "Curing best practices", "duration": "6 min read",
         "body": "• Cure concrete for at least 7 days (28 days for full strength).\n• Keep the surface damp — cover with wet gunny bags or ponding.\n• Protect from direct sun and fast drying.\n• Waterproofing is applied only after the surface is fully cured and clean."},
    ],
    ("SCAFF-301", 1): [
        {"title": "Scaffold types reference", "duration": "8 min read",
         "body": "• Independent/tied scaffold: tied to the structure.\n• Mobile scaffold: on castors with brakes, never moved with people on it.\n• Suspended scaffold: hung from overhead, needs certified anchors.\nAll scaffolds must be erected by trained scaffolders."},
    ],
    ("SCAFF-301", 2): [
        {"title": "Pre-use inspection checklist", "duration": "7 min read",
         "body": "Check daily: base plates on firm ground, verticals plumb, braces in place, planks secured, guardrails and toe-boards fitted, no missing ties, and a valid 'safe to use' tag. If anything is wrong, tag it 'do not use' and report it."},
    ],
}

# Demo site holiday calendar (inherited by every worker bound to the site).
DEMO_HOLIDAYS = [
    {"date": "2026-01-26", "name": "Republic Day", "holiday_type": "PUBLIC", "is_paid": True},
    {"date": "2026-08-15", "name": "Independence Day", "holiday_type": "PUBLIC", "is_paid": True},
    {"date": "2026-10-02", "name": "Gandhi Jayanti", "holiday_type": "PUBLIC", "is_paid": True},
    {"date": "2026-11-08", "name": "Diwali", "holiday_type": "RESTRICTED", "is_paid": True},
    {"date": "2026-12-25", "name": "Christmas", "holiday_type": "OPTIONAL", "is_paid": True},
]


def _get_or_create_user(username, password, role):
    user, _ = User.objects.get_or_create(
        username=username,
        defaults={"role": role, "account_active": True, "is_verified": True, "is_active": True},
    )
    user.role = role
    user.is_active = True
    user.set_password(password)
    user.save()
    return user


def _set_mobile(user, phone, mpin=None):
    UserCredential.objects.filter(user=user, identity_type="mobile").delete()
    cred, _ = UserCredential.objects.update_or_create(
        identity_type="mobile", identity_value=phone,
        defaults={"user": user, "is_primary": True, "verified": True},
    )
    if mpin:
        from django.contrib.auth.hashers import make_password
        cred.mpin_hash = make_password(str(mpin))
        cred.save(update_fields=["mpin_hash"])


class Command(BaseCommand):
    help = "Create/refresh the BSS demo worker, contractor and employer accounts."

    @transaction.atomic
    def handle(self, *args, **options):
        for phone, name in WORKERS:
            user = _get_or_create_user(f"worker_{phone}", WORKER_PASSWORD, "worker")
            ident = WorkerIdentity.objects.filter(user=user).first()
            if ident is None:
                ident = WorkerIdentity.objects.create(
                    user=user, bss_worker_id=bss_ids.new_bss_worker_id(),
                    name=name, mobile_number=phone)
            elif not ident.bss_worker_id:
                ident.bss_worker_id = bss_ids.new_bss_worker_id()
                ident.save(update_fields=["bss_worker_id"])
            # Stamp the registration + consent audit record (WorkerOther).
            from api.v1_bridge import _record_registration_consent
            _record_registration_consent(user)
            _set_mobile(user, phone, DEMO_MPIN)
            self.stdout.write(f"worker    {phone}  {ident.bss_worker_id}  {name}")

        for phone, name in CONTRACTORS:
            user = _get_or_create_user(f"contractor_{phone}", CONTRACTOR_PASSWORD, "contractor")
            prof = ContractorProfile.objects.filter(user=user).first()
            if prof is None:
                prof = ContractorProfile.objects.create(
                    user=user, contractor_name=name, trade_name=name,
                    contractor_code=bss_ids.new_bss_contractor_code(),
                    approval_status="APPROVED", is_verified_badge=True, mobile=phone,
                    **CONTRACTOR_DETAILS.get(phone, {}))
            elif not prof.contractor_code:
                prof.contractor_code = bss_ids.new_bss_contractor_code()
                prof.save(update_fields=["contractor_code"])
            _set_mobile(user, phone, DEMO_MPIN)
            self.stdout.write(f"contractor {phone}  {prof.contractor_code}  {name}")

        for phone, name in EMPLOYERS:
            user = _get_or_create_user(f"employer_{phone}", EMPLOYER_PASSWORD, "employer")
            prof = EmployerProfile.objects.filter(user=user).first()
            if prof is None:
                prof = EmployerProfile.objects.create(
                    user=user, employer_name=name, trade_name=name,
                    employer_code=bss_ids.new_bss_employer_code(),
                    approval_status="APPROVED", mobile=phone,
                    **EMPLOYER_DETAILS.get(phone, {}))
            elif not prof.employer_code:
                prof.employer_code = bss_ids.new_bss_employer_code()
                prof.save(update_fields=["employer_code"])
            _set_mobile(user, phone, DEMO_MPIN)
            self.stdout.write(f"employer  {phone}  {prof.employer_code}  {name}")

        # --- Demo Rozgar job postings (drive /worker/rozgar Available Jobs) ---
        from bss_core.models import ContractorJob

        for spec in DEMO_JOBS:
            cuser = User.objects.filter(username=f"contractor_{spec['phone']}").first()
            if cuser is None:
                continue
            job, created = ContractorJob.objects.update_or_create(
                contractor=cuser, job_title=spec["title"],
                defaults={
                    "job_description": spec["description"],
                    "wage_offered": spec["wage"],
                    "designation": spec["designation"],
                    "trade": spec["trade"],
                    "category": spec["category"],
                    "workplace_type": "On-site",
                    "state": spec["state"],
                    "city": spec["city"],
                    "skills": spec["skills"],
                    "experience": spec["experience"],
                    "dob_limit": spec["dob_limit"],
                    "vacancies": spec.get("vacancies", 1),
                    "salary_visibility": "Visible to all",
                    "visibility": "Public",
                    "status": "SUBMITTED",
                    "is_active": True,
                },
            )
            self.stdout.write(f"job       {spec['phone']}  JOB-{job.id}  {job.job_title} @ {job.city}")

        # --- Leave master ---
        from bss_core.models import LeaveType

        for spec in DEMO_LEAVE_TYPES:
            LeaveType.objects.update_or_create(
                code=spec["code"],
                defaults={
                    "name": spec["name"],
                    "annual_entitlement": spec["annual_entitlement"],
                    "opening_balance": spec["opening_balance"],
                    "sort_order": spec["sort_order"],
                    "is_active": True,
                    "is_paid": True,
                },
            )
        self.stdout.write(f"leave     {len(DEMO_LEAVE_TYPES)} types configured")

        # --- Course catalog (admin-managed): modules -> lessons + assignments ---
        from bss_core.models import (
            Course, CourseModule, CourseLesson, CourseAssignment, CourseReading, CourseQuestion,
        )

        for spec in DEMO_COURSES:
            course, _ = Course.objects.update_or_create(
                code=spec["code"],
                defaults={
                    "title": spec["title"], "provider": spec["provider"],
                    "category": spec["category"], "duration": spec["duration"],
                    "rating": spec["rating"], "description": spec["description"],
                    "instructor": spec["instructor"], "certification": spec["certification"],
                    "skill_name": spec["skill_name"], "badge": spec.get("badge", ""),
                    "sort_order": spec.get("sort_order", 0), "is_active": True,
                },
            )
            for mi, mod in enumerate(spec["modules"], 1):
                module, _ = CourseModule.objects.update_or_create(
                    course=course, sort_order=mi, defaults={"title": mod["title"]})
                for li, lesson in enumerate(mod["lessons"], 1):
                    CourseLesson.objects.update_or_create(
                        course=course, module=module, sort_order=li,
                        defaults={"title": lesson["title"], "duration": lesson["duration"],
                                  "youtube_url": lesson["youtube_url"]})
                module.lessons.filter(sort_order__gt=len(mod["lessons"])).delete()
                for ai, asg in enumerate(mod["assignments"], 1):
                    assignment, _ = CourseAssignment.objects.update_or_create(
                        module=module, sort_order=ai,
                        defaults={"title": asg["title"], "pass_score": asg.get("pass_score", 60),
                                  "assignment_type": asg.get("type", "QUIZ"),
                                  "instructions": asg.get("instructions", "")})
                    for qi, q in enumerate(asg["questions"], 1):
                        CourseQuestion.objects.update_or_create(
                            course=course, assignment=assignment, sort_order=qi,
                            defaults={"question": q["question"], "options": q["options"],
                                      "correct_index": q["correct_index"]})
                    assignment.questions.filter(sort_order__gt=len(asg["questions"])).delete()
                module.assignments.filter(sort_order__gt=len(mod["assignments"])).delete()
                readings = DEMO_READINGS.get((spec["code"], mi), [])
                for ri, reading in enumerate(readings, 1):
                    CourseReading.objects.update_or_create(
                        module=module, sort_order=ri,
                        defaults={"title": reading["title"], "body": reading.get("body", ""),
                                  "resource_url": reading.get("url", ""),
                                  "duration": reading.get("duration", "")})
                module.readings.filter(sort_order__gt=len(readings)).delete()
            course.modules.filter(sort_order__gt=len(spec["modules"])).delete()
            self.stdout.write(
                f"course    {course.code}  {course.title}  "
                f"({len(spec['modules'])} modules)")

        # --- Demo network: link every demo employer <-> contractor <-> worker
        # through real bindings and approved site allotments so the whole
        # E-C-S-W chain is populated for the demo accounts. ---
        from bss_core.models import (
            Site, WorkerContractorBinding, ContractorEmployerBinding,
            ContractorSiteAllotment, ContractorJob,
        )
        from django.utils import timezone as _btz
        import datetime as _bdt

        def _user(username):
            return User.objects.filter(username=username).first()

        def _site_for(employer, code, name, location, state, city):
            site, _ = Site.objects.get_or_create(
                site_code=code,
                defaults={"employer": employer, "site_name": name, "location": location,
                          "state": state, "city": city, "site_qr_token": str(uuid.uuid4())},
            )
            if site.employer_id != employer.id:
                site.employer = employer
                site.save(update_fields=["employer"])
            return site

        def _accept_contractor(contractor, employer, site):
            e = (ContractorEmployerBinding.objects
                 .filter(contractor=contractor, employer=employer,
                         binding_status__in=("PENDING", "ACCEPTED")).first())
            if e is None:
                e = ContractorEmployerBinding.objects.create(
                    contractor=contractor, employer=employer, binding_status="ACCEPTED")
            e.binding_status = "ACCEPTED"
            e.consent_contractor = True
            e.consent_employer = True
            e.consent_method = "app"
            if not e.accepted_at:
                e.accepted_at = _btz.now()
            e.save()
            ContractorSiteAllotment.objects.update_or_create(
                binding=e, site=site,
                defaults={"status": "APPROVED", "source": "employer_allot",
                          "approved_at": _btz.now()})
            return e

        def _accept_worker(worker, contractor, site, **terms):
            b = WorkerContractorBinding.objects.filter(
                worker=worker, contractor=contractor, site=site,
                binding_status__in=("PENDING", "ACCEPTED")).first()
            if b is None:
                b = WorkerContractorBinding.objects.create(
                    worker=worker, contractor=contractor, site=site, binding_status="ACCEPTED")
            b.binding_status = "ACCEPTED"
            b.consent_worker = True
            b.consent_contractor = True
            b.consent_method = "app"
            for key, value in terms.items():
                setattr(b, key, value)
            if not b.accepted_at:
                b.accepted_at = _btz.now() - _bdt.timedelta(days=1180)
            b.save()
            try:
                from api import v1_bridge as _bridge
                _bridge._sync_employment_from_binding(b)
            except Exception:
                pass
            return b

        # (employer, contractor, site_code, site_name, location, state, city, workers)
        DEMO_NETWORK = [
            ("7777777777", "4444444444", "DEMO-SITE-001", "Demo Metro Site",
             "Sector 21, Navi Mumbai", "Maharashtra", "Mumbai", ["1111111111", "2222222222"]),
            ("8888888888", "5555555555", "DEMO-SITE-002", "Demo Highway Site",
             "NH-48, Panvel", "Maharashtra", "Panvel", ["3333333333"]),
            ("7777777777", "6666666666", "DEMO-SITE-003", "Demo Industrial Site",
             "MIDC, Bhosari, Pune", "Maharashtra", "Pune", []),
            ("7827532749", "9999294962", "DEMO-SITE-004", "Demo Tech Park",
             "Hinjewadi Phase 1, Pune", "Maharashtra", "Pune", ["9873463856"]),
        ]
        demo_sites = {}
        for emp_phone, con_phone, code, name, location, state, city, worker_phones in DEMO_NETWORK:
            employer = _user(f"employer_{emp_phone}")
            contractor = _user(f"contractor_{con_phone}")
            if not employer or not contractor:
                continue
            site = _site_for(employer, code, name, location, state, city)
            demo_sites[code] = site
            _accept_contractor(contractor, employer, site)
            for worker_phone in worker_phones:
                worker = _user(f"worker_{worker_phone}")
                if worker:
                    _accept_worker(worker, contractor, site, designation="Mason",
                                   department="Civil Works", shift="Day", offered_wage=21000)
            self.stdout.write(
                f"network   {employer.username} <-> {contractor.username} @ {site.site_code} "
                f"({len(worker_phones)} worker(s))")

        # --- Site-level statutory profile: drive the per-site "Compliance &
        # Statutory" tab (PF/ESIC/CLRA/BOCW/Factory/Shops applicability, state,
        # scheduled employment, minimum-wage zone, frequency, client) so the
        # contractor's site detail isn't a wall of em-dashes. ---
        SITE_COMPLIANCE = {
            "DEMO-SITE-001": {
                "epfo_applicable": True, "esic_applicable": True,
                "clra_applicable": True, "bocw_applicable": True,
                "factory_compliance_applicable": False, "shops_establishment_applicable": False,
                "interstate_migrant_compliance": True,
                "applicable_state": "Maharashtra",
                "scheduled_employment": "Building and Other Construction Work",
                "minimum_wage_zone": "Zone I – Mumbai Metropolitan Region",
                "compliance_frequency": "Monthly",
                "compliance_client": "Adani Infra Pvt Ltd",
                "statutory_applicability": "CLRA Act 1970 · EPF & MP Act 1952 · ESI Act 1948 · "
                                           "BOCW Act 1996 · Minimum Wages Act 1948 · Payment of "
                                           "Wages Act 1936 · Interstate Migrant Workmen Act 1979",
            },
            "DEMO-SITE-002": {
                "epfo_applicable": True, "esic_applicable": True,
                "clra_applicable": True, "bocw_applicable": True,
                "factory_compliance_applicable": False, "shops_establishment_applicable": False,
                "interstate_migrant_compliance": True,
                "applicable_state": "Maharashtra",
                "scheduled_employment": "Building and Other Construction Work",
                "minimum_wage_zone": "Zone II – Pune Region",
                "compliance_frequency": "Monthly",
                "compliance_client": "NHAI Panvel Bridges Ltd",
            },
            "DEMO-SITE-003": {
                "epfo_applicable": True, "esic_applicable": True,
                "clra_applicable": True, "bocw_applicable": False,
                "factory_compliance_applicable": True, "shops_establishment_applicable": False,
                "interstate_migrant_compliance": False,
                "applicable_state": "Maharashtra",
                "scheduled_employment": "Industrial Manufacturing Activity under Factories Act",
                "minimum_wage_zone": "Zone I – Pune",
                "compliance_frequency": "Monthly",
                "compliance_client": "Bhosari Engineering Works Pvt Ltd",
            },
            "DEMO-SITE-004": {
                "epfo_applicable": False, "esic_applicable": False,
                "clra_applicable": False, "bocw_applicable": False,
                "factory_compliance_applicable": False, "shops_establishment_applicable": True,
                "interstate_migrant_compliance": False,
                "applicable_state": "Maharashtra",
                "scheduled_employment": "Information Technology / IT-enabled Services",
                "minimum_wage_zone": "Zone I – Pune",
                "compliance_frequency": "Quarterly",
                "compliance_client": "Hinjewadi Tech Park Ltd",
            },
        }
        for code, fields in SITE_COMPLIANCE.items():
            site = demo_sites.get(code)
            if site is None:
                continue
            for key, value in fields.items():
                setattr(site, key, value)
            site.save(update_fields=list(fields.keys()))

        # --- ComplianceReport audits: clean up the hardcoded seed audits so the
        # per-site % is computed from evidence (verified share), not fake scores. ---
        from bss_core.models import ComplianceReport as _ComplianceReport
        _ComplianceReport.objects.filter(
            employer_id__in=[u.pk for u in map(_user, ("contractor_4444444444", "contractor_5555555555")) if u],
            unique_no__startswith="UN705").delete()

        site_compliance_extra = SITE_COMPLIANCE["DEMO-SITE-001"]

        # Any other site already allotted to a demo contractor (e.g. one created
        # by hand in the running DB) still gets the statutory profile so its
        # Compliance & Statutory tab isn't empty.
        demo_ids = [u.pk for u in map(_user, ("contractor_4444444444", "contractor_5555555555")) if u]
        handled_codes = set(SITE_COMPLIANCE)
        for a in (ContractorSiteAllotment.objects
                  .filter(status="APPROVED", binding__binding_status="ACCEPTED",
                          binding__contractor_id__in=demo_ids)
                  .select_related("site", "binding__contractor")):
            site = a.site
            if site.site_code in handled_codes:
                continue
            for key, value in site_compliance_extra.items():
                if key == "applicable_state" and (site.state or "").strip():
                    value = site.state
                setattr(site, key, value)
            site.save(update_fields=list(site_compliance_extra.keys()))

        # --- Compliance evidence: drives each site's average and the PF/ESIC
        # history card from real submission rows. Per-site compliance % =
        # verified share (100 × VERIFIED / total) — genuine, not seeded numbers.
        # Seeded rows are tagged SEED-<SITE-CODE> so re-running replaces only
        # our own rows and never touches uploads the user made from the portal. ---
        from bss_core.models import SubmissionEvidence as _Evidence
        from decimal import Decimal as _Decimal

        def _seed_evidence(contractor, site, employer_name, docs, month="October"):
            tag = f"SEED-{(site.site_code or 'X').upper()}-"
            _Evidence.objects.filter(user=contractor, unique_no__startswith=tag).delete()
            for i, (doc_type, document_type, status) in enumerate(docs, start=1):
                _Evidence.objects.create(
                    user=contractor, role="contractor", doc_type=doc_type,
                    document_type=document_type, site=site.site_name,
                    period=f"{month} 2026-27", month=month, financial_year="2026-27",
                    state=(site.state or "").strip(), employer=employer_name,
                    is_mandatory=True, unique_no=f"{tag}{i:02d}",
                    ocr_accuracy=_Decimal("100.00") if status == "VERIFIED" else _Decimal("96.00"),
                    status=status)

        # One PF + one ESIC challan + a register filed (verified) and one line
        # still in-flight — so the site lands at 3 of 4 = 75%.
        METRO_DOCS = [
            ("EPF Challan", "EPF", "VERIFIED"),
            ("ESIC Challan", "ESIC", "VERIFIED"),
            ("CLRA Register - Form XIII", "CLRA", "VERIFIED"),
            ("Payment of Wages Register", "POW", "PENDING"),
        ]
        metro_site = demo_sites.get("DEMO-SITE-001")
        con444 = _user("contractor_4444444444")
        if metro_site and con444:
            _seed_evidence(con444, metro_site, "Adani Infra Pvt Ltd", METRO_DOCS)

        # --- Licences & registrations: drive the "Active Licences" KPI and the
        # profile's Registrations & Licences tab from real statutory-registration
        # rows (EPFO, ESIC, CLRA, BOCW) for the demo contractor and employer. ---
        from bss_core.models import PartyStatutoryRegistration as _PartyStat
        from datetime import date as _bdate

        def _seed_reg(party, reg_kind, number, authority, valid_from=None, valid_to=None):
            _PartyStat.objects.update_or_create(
                party_type=party.role, party_user=party, reg_kind=reg_kind,
                defaults={
                    "reg_number": number, "authority": authority,
                    "issued_at": (valid_from or _bdate.today()),
                    "expiry_at": valid_to or (_bdate.today().replace(year=_bdate.today().year + 1)),
                    "verification_status": "ACTIVE", "is_active": True,
                })

        emp777 = _user("employer_7777777777")
        if con444:
            _seed_reg(con444, "CLRA", "MH/CLRA/2026/000444",
                      "Department of Labour, Maharashtra")
            _seed_reg(con444, "EPFO", "MH/PF/125423/2026", "EPFO Regional Office, Mumbai")
            _seed_reg(con444, "ESIC", "MH/ESIC/221456", "ESIC Regional Office, Mumbai")
            cp444 = getattr(con444, "contractor_profile", None)
            if cp444:
                for attr, value in (
                        ("clra_licence_no", "MH/CLRA/2026/000444"),
                        ("labour_dept_reg_no", "MH/LAB/2026/887766"),
                        ("bocw_reg_no", "MH/BOCW/2026/556677"),
                        ("udyam_no", "UDYAM-MH-00-1234567")):
                    setattr(cp444, attr, value)
                cp444.save()
        if emp777:
            _seed_reg(emp777, "EPFO", "MH/PF/125423/PEM", "EPFO Regional Office, Mumbai")
            _seed_reg(emp777, "ESIC", "MH/ESIC/221456/PEM", "ESIC Regional Office, Mumbai")

        # Attach the demo job postings to the primary demo site so a worker
        # applying on Rozgar raises a site-specific binding request.
        primary_site = demo_sites.get("DEMO-SITE-001")
        if primary_site:
            ContractorJob.objects.filter(site__isnull=True).update(site=primary_site)

        # Primary demo worker for the rich payroll / benefits / leave data below.
        employer_user = _user("employer_7777777777")
        contractor_user = _user("contractor_4444444444")
        worker_user = _user("worker_1111111111")
        site = primary_site
        if employer_user and contractor_user and worker_user and site:
            binding = WorkerContractorBinding.objects.filter(
                worker=worker_user, contractor=contractor_user, site=site).first()
            if binding and not binding.accepted_at:
                binding.accepted_at = _btz.now() - _bdt.timedelta(days=1180)
                binding.save(update_fields=["accepted_at"])

            # Demo eligibility data (Medical / Health & Safety / Compliance) so
            # gate passes can be requested for the demo worker.
            from bss_core.models import WorkerBanking, WorkerSocialSecurity, WorkerWelfareSafety

            ws, _ = WorkerWelfareSafety.objects.get_or_create(user=worker_user)
            ws.medical_examination_status = ws.medical_examination_status or "Done"
            ws.medical_fitness_status = ws.medical_fitness_status or "Fit"
            ws.ppe_required = True
            ws.types_of_ppe_given = ws.types_of_ppe_given or "Helmet, Safety shoes, Harness"
            ws.safety_training_completed = True
            ws.site_induction_status = ws.site_induction_status or "Done"
            ws.save()
            bank, _ = WorkerBanking.objects.get_or_create(user=worker_user)
            if not bank.bank_account_number:
                bank.bank_name = bank.bank_name or "State Bank of India"
                bank.bank_account_holder_name = bank.bank_account_holder_name or "Syed Yasser Ali"
                bank.bank_account_number = "XXXXXXXX1234"
                bank.save()
            ss, _ = WorkerSocialSecurity.objects.get_or_create(user=worker_user)
            if not ss.epfo_uan:
                ss.epfo_uan = "100200300400"
            if not ss.esic_ip_number:
                ss.esic_ip_number = "ESIC-IP-0001"
            ss.save()
            wi = WorkerIdentity.objects.filter(user=worker_user).first()
            if wi and not wi.aadhaar:
                wi.aadhaar = "123412341234"
                wi.save(update_fields=["aadhaar"])
            self.stdout.write("eligibility worker_1111111111: Medical Done, Health & Safety Done, Compliance Done")

            # Site calendar the contractor manages; workers bound here inherit it.
            from bss_core.models import LeaveType, SiteHoliday, SiteLeavePolicy

            for spec in DEMO_HOLIDAYS:
                SiteHoliday.objects.update_or_create(
                    site=site, date=spec["date"], name=spec["name"],
                    defaults={"holiday_type": spec["holiday_type"], "is_paid": spec["is_paid"]},
                )
            for spec in DEMO_LEAVE_TYPES:
                lt = LeaveType.objects.filter(code=spec["code"]).first()
                if lt:
                    SiteLeavePolicy.objects.update_or_create(
                        site=site, leave_type=lt,
                        defaults={"annual_entitlement": spec["annual_entitlement"],
                                  "opening_balance": spec["opening_balance"], "is_active": True},
                    )
            self.stdout.write(f"calendar  {site.site_name}: {len(DEMO_HOLIDAYS)} holidays, {len(DEMO_LEAVE_TYPES)} leave policies")

            # Demo payroll: wage history + salary advances for the demo worker.
            import datetime as _dt
            from django.utils import timezone as _tz
            from bss_core.models import SalaryAdvance, WorkerWages

            wage_specs = [
                {"start": _dt.date(2026, 8, 1), "end": _dt.date(2026, 8, 31),
                 "present": 26, "absent": 0, "gross": 26000, "deductions": 1800, "net": 24200},
                {"start": _dt.date(2026, 7, 1), "end": _dt.date(2026, 7, 31),
                 "present": 24, "absent": 1, "gross": 24000, "deductions": 1800, "net": 22200},
                {"start": _dt.date(2026, 6, 1), "end": _dt.date(2026, 6, 30),
                 "present": 25, "absent": 0, "gross": 25000, "deductions": 1800, "net": 23200},
            ]
            for spec in wage_specs:
                WorkerWages.objects.update_or_create(
                    worker=worker_user, period_start=spec["start"], period_end=spec["end"],
                    defaults={"contractor": contractor_user, "site": site,
                              "wage_frequency": "MONTHLY", "days_present": spec["present"],
                              "days_absent": spec["absent"], "daily_wage": 1000,
                              "base_wage": spec["gross"], "gross_wage": spec["gross"],
                              "deductions_amount": spec["deductions"], "net_wage": spec["net"],
                              "status": "PAID", "computed_from_attendance": True},
                )
            if not SalaryAdvance.objects.filter(worker=worker_user).exists():
                SalaryAdvance.objects.create(
                    worker=worker_user, contractor=contractor_user, site=site,
                    amount=5000, reason="Medical emergency in family", status="DISBURSED",
                    mode="ONLINE", reference="UTR-HDFC2608200214",
                    approved_at=_tz.now(), disbursed_at=_tz.now(), approved_by=contractor_user)
                SalaryAdvance.objects.create(
                    worker=worker_user, contractor=contractor_user, site=site,
                    amount=3000, reason="Travel to hometown", status="ADJUSTED",
                    mode="CASH", payroll_period="July 2026",
                    approved_at=_tz.now(), disbursed_at=_tz.now(), accepted_at=_tz.now(),
                    adjusted_at=_tz.now(), approved_by=contractor_user)
            self.stdout.write(f"payroll   {len(wage_specs)} wage records + 2 advances for worker_1111111111")

            # Benefits: PF contributions (autofetched) + Bonus + Leave Encashment.
            from bss_core.models import WorkerBenefitRecord

            for month, credited in [("Jun 2026", _dt.date(2026, 7, 5)),
                                    ("Jul 2026", _dt.date(2026, 8, 5)),
                                    ("Aug 2026", _dt.date(2026, 9, 5))]:
                WorkerBenefitRecord.objects.update_or_create(
                    worker=worker_user, kind="PF", period=month,
                    defaults={"contractor": contractor_user, "site": site,
                              "employee_contribution": 1800, "employer_contribution": 1800,
                              "amount": 3600, "credited_on": credited, "status": "CREDITED",
                              "created_by": contractor_user})
            WorkerBenefitRecord.objects.update_or_create(
                worker=worker_user, kind="BONUS", period="FY 2025-26",
                defaults={"contractor": contractor_user, "site": site, "amount": 12500,
                          "reason": "Statutory bonus (8.33% of basic)", "status": "PAID",
                          "paid_on": _dt.date(2026, 10, 15), "created_by": contractor_user})
            WorkerBenefitRecord.objects.update_or_create(
                worker=worker_user, kind="LEAVE_ENCASHMENT", period="FY 2025-26",
                defaults={"contractor": contractor_user, "site": site, "days": 5, "rate": 1000,
                          "amount": 5000, "reason": "Encashment of 5 unused leave days",
                          "status": "PAID", "paid_on": _dt.date(2026, 4, 20),
                          "created_by": contractor_user})
            self.stdout.write("benefits  3 PF + 1 bonus + 1 leave-encashment for worker_1111111111")

        self.stdout.write(self.style.SUCCESS(f"Demo accounts seeded. MPIN for all demo logins: {DEMO_MPIN}"))
