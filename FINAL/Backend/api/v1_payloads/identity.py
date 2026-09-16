"""Public identity-verification payload builder."""

# ruff: noqa: F401,F403
from .common import *  # noqa: F401,F403


def build_identity_verify(bss_id):
    bss_id = (bss_id or "").strip()
    if bss_id.upper().startswith("BSS-E"):
        ep = EmployerProfile.objects.filter(employer_code=bss_id).first()
        if not ep:
            return None
        return {
            "id": ep.user_id,
            "name": _d(ep.employer_name),
            "company": _d(ep.trade_name),
            "bssId": _d(ep.employer_code),
            "verified": bool(ep.approval_status == "APPROVED"),
        }
    if bss_id.upper().startswith("BSS-C") or bss_id.upper().startswith("BSSC"):
        try:
            cp = ContractorProfile.objects.get(contractor_code=bss_id)
        except ContractorProfile.DoesNotExist:
            return None
        return {
            "id": cp.user_id,
            "name": _d(cp.contractor_name),
            "company": _d(cp.trade_name),
            "bssId": _d(cp.contractor_code),
            "verified": bool(cp.is_verified_badge),
        }
    wi = WorkerIdentity.objects.filter(bss_worker_id=bss_id).first()
    if not wi:
        return None
    sk = WorkerSkillsEmployability.objects.filter(user=wi.user).first()
    return {
        "identity": {
            "name": _d(wi.name), "bssId": _d(wi.bss_worker_id),
            "category": "", "aadhaarVerified": bool(wi.aadhaar),
            "photoUrl": _d(wi.photo),
        },
        "employment": {"status": ""},
        "skills": {
            "primary": {
                "name": _d(sk.primary_skill if sk else ""),
                "level": "novice",
                "experienceYears": _d(sk.skill_experience_years if sk else ""),
            }
        },
    }


__all__ = [
    "build_identity_verify",
]
