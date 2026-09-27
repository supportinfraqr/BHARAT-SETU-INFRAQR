"""Public identity-verification payload builder (binding-aware disclosure).

Disclosure follows the app's permission policy:
  * pre-binding  -> public-safe set (name, photo, age/sex, blood group,
                    verification badges, skills, location, masked identifiers)
  * post-binding -> the extensive record (contact, address, banking, social
                    security, employment, wages, welfare) for the bound party.
"""

# ruff: noqa: F401,F403
from .common import *  # noqa: F401,F403


def _mask(value, keep=4):
    v = str(value or "").strip()
    if not v:
        return ""
    if len(v) <= keep:
        return v
    return "•" * (len(v) - keep) + v[-keep:]


def _addr_line(obj, prefix):
    parts = [
        getattr(obj, f"{prefix}_address", ""),
        getattr(obj, f"{prefix}_locality", ""),
        getattr(obj, f"{prefix}_city", ""),
        getattr(obj, f"{prefix}_district", ""),
        getattr(obj, f"{prefix}_state", ""),
        getattr(obj, f"{prefix}_pincode", ""),
    ]
    return ", ".join(_d(p) for p in parts if _d(p))


def _worker_relationship(worker_user, viewer):
    """'self' | 'bound' | 'public' — whether the viewer may see the full record."""
    if viewer is None or not getattr(viewer, "is_authenticated", False):
        return "public"
    if getattr(viewer, "id", None) == worker_user.id:
        return "self"
    role = getattr(viewer, "role", "")
    if role == "contractor":
        if WorkerContractorBinding.objects.filter(
                worker=worker_user, contractor=viewer, binding_status="ACCEPTED").exists():
            return "bound"
    if role == "employer":
        if WorkerContractorBinding.objects.filter(
                worker=worker_user, binding_status="ACCEPTED", site__employer=viewer).exists():
            return "bound"
    return "public"


def _employer_relationship(employer_user, viewer):
    """'self' | 'bound' | 'public' for a scanned principal employer."""
    if viewer is None or not getattr(viewer, "is_authenticated", False):
        return "public"
    if getattr(viewer, "id", None) == employer_user.id:
        return "self"
    role = getattr(viewer, "role", "")
    if role == "contractor":
        if ContractorEmployerBinding.objects.filter(
                contractor=viewer, employer=employer_user,
                binding_status="ACCEPTED").exists():
            return "bound"
    if role == "worker":
        if WorkerContractorBinding.objects.filter(
                worker=viewer, binding_status="ACCEPTED",
                site__employer=employer_user).exists():
            return "bound"
    return "public"


def _contractor_relationship(contractor_user, viewer):
    """'self' | 'bound' | 'public' for a scanned contractor."""
    if viewer is None or not getattr(viewer, "is_authenticated", False):
        return "public"
    if getattr(viewer, "id", None) == contractor_user.id:
        return "self"
    role = getattr(viewer, "role", "")
    if role == "employer":
        if ContractorEmployerBinding.objects.filter(
                contractor=contractor_user, employer=viewer,
                binding_status="ACCEPTED").exists():
            return "bound"
    if role == "worker":
        if WorkerContractorBinding.objects.filter(
                worker=viewer, contractor=contractor_user,
                binding_status="ACCEPTED").exists():
            return "bound"
    return "public"


def _worker_details(wi, user):
    """Extensive post-binding record for a worker."""
    emp = WorkerEmployment.objects.filter(user=user).order_by("-id").first()
    bank = WorkerBanking.objects.filter(user=user).first()
    ss = WorkerSocialSecurity.objects.filter(user=user).first()
    welfare = WorkerWelfareSafety.objects.filter(user=user).first()
    addr = WorkerAddressMobility.objects.filter(user=user).first()
    wage = WorkerWages.objects.filter(worker=user).order_by("-period_end", "-id").first()
    binding = (WorkerContractorBinding.objects
               .filter(worker=user, binding_status="ACCEPTED")
               .select_related("contractor", "site", "site__employer").first())
    site = binding.site if binding and binding.site else None
    return {
        "aadhaar": _d(wi.aadhaar),
        "pan": _d(wi.pan),
        "dateOfBirth": _dts(wi.date_of_birth) if wi.date_of_birth else "",
        "fatherName": _d(wi.father_name),
        "motherName": _d(wi.mother_name),
        "spouseName": _d(wi.spouse_name),
        "maritalStatus": _d(wi.marital_status),
        "mobile": _d(wi.mobile_number),
        "alternateMobile": _d(wi.alternate_mobile),
        "email": _d(wi.email),
        "placeOfBirth": _d(wi.place_of_birth),
        "disability": _d(wi.disability_status),
        "emergency": {
            "name": _d(wi.emergency_contact_name),
            "number": _d(wi.emergency_contact_number),
            "relation": _d(wi.emergency_contact_relation),
        },
        "address": {
            "current": _addr_line(addr, "current") if addr else "",
            "permanent": _addr_line(addr, "permanent") if addr else "",
            "migrant": bool(addr.migrant_worker) if addr else False,
        },
        "banking": {
            "bankName": _d(bank.bank_name if bank else ""),
            "accountHolder": _d(bank.bank_account_holder_name if bank else ""),
            "accountMasked": _mask(bank.bank_account_number if bank else ""),
            "ifsc": _d(bank.ifsc_code if bank else ""),
            "status": _d(bank.bank_verification_status if bank else ""),
        },
        "socialSecurity": {
            "uan": _d(ss.epfo_uan if ss else ""),
            "esic": _d(ss.esic_ip_number if ss else ""),
            "lwf": _d(ss.lwf_no if ss else ""),
            "bocw": _d(ss.bocw_reg_number if ss else ""),
            "eshram": _d(ss.e_shram_no if ss else ""),
        },
        "employment": {
            "contractor": _org_name(binding.contractor) if binding else "",
            "employer": _org_name(site.employer) if site else "",
            "site": _d(site.site_name) if site else "",
            "designation": _d((emp.designation if emp else "") or (binding.designation if binding else "")),
            "department": _d((emp.department if emp else "") or (binding.department if binding else "")),
            "shift": _d((emp.shift if emp else "") or (binding.shift if binding else "")),
            "doj": _dts(emp.doj) if emp and emp.doj else "",
            "natureOfJob": _d(emp.nature_of_job if emp else ""),
            "typeOfWork": _d(emp.type_of_work if emp else ""),
        },
        "wages": {
            "lastGross": float(wage.gross_wage) if wage and wage.gross_wage is not None else None,
            "frequency": _d(wage.wage_frequency if wage else ""),
            "periodEnd": _dts(wage.period_end) if wage and wage.period_end else "",
        } if wage else None,
        "welfare": {
            "ppe": _d(welfare.types_of_ppe_given if welfare else ""),
            "safetyTraining": bool(welfare.safety_training_completed) if welfare else False,
            "insurance": _d(welfare.insurance_status if welfare else ""),
            "policeVerification": _d(welfare.police_verification if welfare else ""),
        },
    }


def build_identity_verify(bss_id, viewer=None):
    bss_id = (bss_id or "").strip()
    if bss_id.upper().startswith("BSS-E"):
        ep = EmployerProfile.objects.filter(employer_code=bss_id).first()
        if not ep:
            return None
        relationship = _employer_relationship(ep.user, viewer)
        data = {
            "relationship": relationship,
            "id": ep.user_id,
            "name": _d(ep.employer_name),
            "company": _d(ep.trade_name),
            "bssId": _d(ep.employer_code),
            "verified": bool(ep.approval_status == "APPROVED"),
            "identity": {
                "name": _d(ep.employer_name), "bssId": _d(ep.employer_code),
                "company": _d(ep.trade_name), "category": "Principal Employer",
                "location": ", ".join(x for x in [_d(ep.state), _d(ep.district)] if x),
                "verified": bool(ep.approval_status == "APPROVED"),
            },
        }
        if relationship in ("bound", "self"):
            sites = [s for s in Site.objects.filter(employer=ep.user)
                     .values_list("site_name", flat=True)[:20] if s]
            data["details"] = {"org": {
                "tradeName": _d(ep.trade_name),
                "category": _d(ep.employer_category),
                "contactPerson": _d(ep.contact_person),
                "mobile": _d(ep.mobile),
                "email": _d(ep.email),
                "address": _d(ep.address),
                "state": _d(ep.state),
                "district": _d(ep.district),
                "lin": _d(ep.lin),
                "cin": _d(ep.cin),
                "sites": sites,
                "contractors": ContractorEmployerBinding.objects.filter(
                    employer=ep.user, binding_status="ACCEPTED").count(),
            }}
        return data
    if bss_id.upper().startswith("BSS-C") or bss_id.upper().startswith("BSSC"):
        try:
            cp = ContractorProfile.objects.get(contractor_code=bss_id)
        except ContractorProfile.DoesNotExist:
            return None
        relationship = _contractor_relationship(cp.user, viewer)

        # Three distinct facts, deliberately kept apart:
        #   bssMemberSince — when the contractor's profile was created on BSS,
        #                    i.e. when they joined the platform.
        #   consentDate    — when they accepted BSS terms. A separate legal act,
        #                    and blank for anyone who never consented on-platform.
        #   bindingDate    — when THIS viewer became connected (see below), so it
        #                    legitimately differs from viewer to viewer.
        # Left blank when unknown: an absent date is better than an invented one
        # on a statutory record.
        bss_member_since = _date_str(cp.registered_at)
        consent_date_str = _date_str(cp.consent_date)

        # Binding date / Contractor joined date when viewer has permission / relationship
        binding_date = ""
        if viewer and getattr(viewer, "is_authenticated", False):
            role = getattr(viewer, "role", "")
            if role == "employer":
                ce = ContractorEmployerBinding.objects.filter(
                    contractor=cp.user, employer=viewer
                ).order_by("-id").first()
                if ce:
                    b_dt = ce.accepted_at or ce.created_at
                    binding_date = _date_str(b_dt)
            elif role == "worker":
                wc = WorkerContractorBinding.objects.filter(
                    contractor=cp.user, worker=viewer
                ).order_by("-id").first()
                if wc:
                    b_dt = wc.accepted_at or wc.created_at
                    binding_date = _date_str(b_dt)
            elif role == "contractor" and viewer.id == cp.user.id:
                ce = ContractorEmployerBinding.objects.filter(
                    contractor=cp.user, binding_status="ACCEPTED"
                ).order_by("created_at").first()
                if ce:
                    b_dt = ce.accepted_at or ce.created_at
                    binding_date = _date_str(b_dt)

        data = {
            "relationship": relationship,
            "id": cp.user_id,
            "name": _d(cp.contractor_name),
            "company": _d(cp.trade_name),
            "bssId": _d(cp.contractor_code),
            "verified": bool(cp.is_verified_badge),
            "bssMemberSince": bss_member_since,
            "consentDate": consent_date_str,
            "bindingDate": binding_date,
            "identity": {
                "name": _d(cp.contractor_name), "bssId": _d(cp.contractor_code),
                "company": _d(cp.trade_name), "category": "Contractor",
                "location": ", ".join(x for x in [_d(cp.state), _d(cp.operating_states)] if x),
                "verified": bool(cp.is_verified_badge),
                "bssMemberSince": bss_member_since,
                "consentDate": consent_date_str,
                "bindingDate": binding_date,
            },
        }
        if relationship in ("bound", "self"):
            data["details"] = {"org": {
                "tradeName": _d(cp.trade_name),
                "contactPerson": _d(cp.contact_person),
                "mobile": _d(cp.mobile),
                "email": _d(cp.email),
                "address": _d(cp.address),
                "state": _d(cp.state),
                "district": _d(cp.district),
                "lin": _d(cp.lin),
                "clraLicence": _d(cp.clra_licence_no),
                "operatingStates": _d(cp.operating_states),
                "pan": _d(cp.pan_no),
                "gstin": _d(cp.gstin),
                "workers": WorkerContractorBinding.objects.filter(
                    contractor=cp.user, binding_status="ACCEPTED").count(),
                "bssMemberSince": bss_member_since,
                "consentDate": consent_date_str,
                "bindingDate": binding_date,
            }}
        return data
    wi = WorkerIdentity.objects.filter(bss_worker_id=bss_id).first()
    if not wi:
        return None
    user = wi.user
    sk = WorkerSkillsEmployability.objects.filter(user=user).first()
    cls = WorkerClassification.objects.filter(user=user).first()
    addr = WorkerAddressMobility.objects.filter(user=user).first()
    other = WorkerOther.objects.filter(user=user).first()
    edu = WorkerEducation.objects.filter(user=user).order_by("-id").first()
    relationship = _worker_relationship(user, viewer)

    location = ", ".join(x for x in [
        _d(addr.current_city if addr else ""),
        _d(addr.current_district if addr else ""),
        _d(addr.current_state if addr else ""),
    ] if x)

    data = {
        "relationship": relationship,
        "identity": {
            "name": _d(wi.name),
            "bssId": _d(wi.bss_worker_id),
            "photoUrl": _d(wi.photo),
            "gender": _d(wi.gender),
            "age": wi.age or "",
            "bloodGroup": _d(wi.blood_group),
            "category": _d(cls.worker_category if cls else ""),
            "occupation": _d(cls.occupation if cls else ""),
            "sector": _d(cls.sector if cls else ""),
            "aadhaarVerified": bool(wi.aadhaar),
            "panVerified": bool(wi.pan_verified),
            "mobileMasked": _mask(wi.mobile_number),
            "aadhaarMasked": _mask(wi.aadhaar),
            "location": location,
            "availableForWork": bool(other.available_for_work) if other else False,
        },
        "employment": {"status": ""},
        "skills": {
            "primary": {
                "name": _d(sk.primary_skill if sk else ""),
                "level": "novice",
                "experienceYears": _d(sk.skill_experience_years if sk else ""),
            },
            "secondary": [s.strip() for s in _d(sk.secondary_skills if sk else "").split(",") if s.strip()],
            "certification": _d(sk.certification_name if sk else ""),
            "certificationVerified": bool(sk.certification_verified) if sk else False,
            "languages": _d(sk.languages_known if sk else ""),
        },
        "education": {
            "qualification": _d(edu.qualification_course if edu else ""),
            "board": _d(edu.board_university if edu else ""),
            "year": _d(edu.passing_year if edu else ""),
        },
    }

    if relationship in ("bound", "self"):
        details = _worker_details(wi, user)
        data["details"] = details
        data["employment"] = {
            "status": _d(WorkerEmployment.objects.filter(user=user).order_by("-id").first().status
                         if WorkerEmployment.objects.filter(user=user).exists() else ""),
            **{k: details["employment"][k] for k in (
                "contractor", "employer", "site", "designation", "department", "shift", "doj")},
        }
    return data


__all__ = [
    "build_identity_verify",
]
