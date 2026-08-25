"""Consent, fallback, and profile-visibility logic from GUIDE.MD.

Implements:
- Dual-handshake consent: both parties must explicitly consent (APP / SMS_OTP / IVR / VOICE).
- SMS OTP + voice fallback for network-delay consent (Case II).
- IVR 'Press 1/0' fallback for worker physical-card scanning (Case I).
- Fetch_Profile_Data interceptor: full profile if bound, general info if not.
"""
import secrets

from django.utils import timezone

from .models import Binding, Contractor, Employer, Worker

CONSENT_TIMEOUT_SECONDS = 60

GENERAL_PROFILE_FIELDS = {
    "Name", "Age", "Sex", "Company", "BloodGroup",
}


def _party_entity(binding: Binding, party: str):
    """The entity whose consent is being requested ('initiator' or 'approver')."""
    scanner, target = _party_entities(binding)
    return scanner if party == "initiator" else target


def consent_sequence(binding: Binding, party: str = "approver"):
    """Escalation ladder for a consenting party.

    Case I  (worker consents, physical card / keypad phone): APP -> IVR.
    Case II (employer/contractor consents, app-to-app):      APP -> SMS_OTP -> VOICE.
    """
    entity = _party_entity(binding, party)
    if isinstance(entity, Worker):
        return ["APP", "IVR"]
    return ["APP", "SMS_OTP", "VOICE"]


def next_consent_channel(binding: Binding, party: str = "approver"):
    """Next channel after the current one on the escalation ladder (None if exhausted)."""
    seq = consent_sequence(binding, party)
    cur = binding.consent_channel
    state_field = "initiator_consent" if party == "initiator" else "approver_consent"
    if getattr(binding, state_field) != "TIMEOUT":
        # Fresh or in-flight attempt -> start at APP (or keep current channel)
        return cur or seq[0]
    if not cur:
        return seq[0]
    if cur in seq:
        idx = seq.index(cur)
        if idx + 1 < len(seq):
            return seq[idx + 1]
    return None


def _otp_store():
    """Simple in-memory OTP store (replace with Redis in production)."""
    from django.core.cache import cache
    return cache


def _party_entities(binding: Binding):
    """Return (scanner_entity, target_entity) describing the two consenting parties."""
    if binding.binding_type == "EMPLOYER_CONTRACTOR":
        return (binding.contractor, binding.employer)
    if binding.binding_type == "WORKER_CONTRACTOR":
        return (binding.worker, binding.contractor)
    return (None, None)


def _party_phone(entity) -> str:
    if isinstance(entity, Employer):
        return entity.contact_mobile or ""
    if isinstance(entity, Contractor):
        return entity.contact_mobile or ""
    if isinstance(entity, Worker):
        return entity.mobile or ""
    return ""


def _party_name(entity) -> str:
    if entity is None:
        return ""
    if isinstance(entity, Worker):
        return entity.full_name
    return entity.name or ""


def request_consent(binding: Binding, party: str, channel: str = "APP") -> dict:
    """Begin a consent request for the given party ('initiator' or 'approver').

    channel may be 'APP' / 'SMS_OTP' / 'IVR' / 'VOICE', or 'AUTO' to advance
    automatically along the escalation ladder (APP -> SMS_OTP -> VOICE for
    employer/contractor targets; APP -> IVR for worker targets).
    """
    if channel == "AUTO":
        channel = next_consent_channel(binding, party) or "APP"
    now = timezone.now()
    if party == "initiator":
        binding.initiator_consent = "PENDING"
        binding.initiator_consent_at = now
    else:
        binding.approver_consent = "PENDING"
        binding.approver_consent_at = now
    binding.consent_channel = channel
    binding.consent_expires_at = now + timezone.timedelta(seconds=CONSENT_TIMEOUT_SECONDS)
    binding.save()

    # The OTP/IVR goes to the party whose consent is being requested.
    party_entity = _party_entity(binding, party)
    phone = _party_phone(party_entity)
    result = {
        "binding_id": binding.pk,
        "party": party,
        "channel": channel,
        "status": "PENDING",
        "expires_at": binding.consent_expires_at,
        "consent_timeout_seconds": CONSENT_TIMEOUT_SECONDS,
    }
    # Channel-specific dispatch
    if channel == "SMS_OTP" and phone:
        otp = send_sms_otp(phone, binding.pk)
        result["otp_sent"] = True
        result["otp"] = otp  # dev convenience; real flow sends SMS
        result["phone"] = phone
    elif channel == "IVR" and phone:
        result["ivr_sent"] = True
        result["phone"] = phone
        result["ivr_prompt"] = "Press 1 to accept, Press 0 to decline"
    return result


def resolve_consent(binding: Binding, party: str, decision: bool, otp: str = "") -> dict:
    """Resolve a pending consent. Returns updated binding + whether binding is now complete."""
    now = timezone.now()
    expired = binding.consent_expires_at and now > binding.consent_expires_at
    if expired:
        field = "initiator_consent" if party == "initiator" else "approver_consent"
        setattr(binding, field, "TIMEOUT")
        binding.save()
        result = {"binding_id": binding.pk, "party": party, "decision": False, "timed_out": True, "binding_complete": False}
        # Automatic fallback orchestration: escalate to the next channel in the ladder.
        nxt = next_consent_channel(binding, party)
        if nxt:
            escalated = request_consent(binding, party, nxt)
            result["escalated_to"] = nxt
            result["escalated"] = True
            result["status"] = "PENDING"
            result["expires_at"] = escalated.get("expires_at")
            if nxt == "SMS_OTP" and escalated.get("otp"):
                result["otp"] = escalated["otp"]
                result["otp_sent"] = True
            if nxt in ("IVR", "VOICE"):
                result["ivr_sent"] = escalated.get("ivr_sent", True)
                result["prompt"] = escalated.get("ivr_prompt") or escalated.get("prompt")
        return result

    # If channel was SMS_OTP, validate the OTP first
    if binding.consent_channel == "SMS_OTP":
        party_entity = _party_entity(binding, party)
        phone = _party_phone(party_entity)
        valid = verify_sms_otp(phone, binding.pk, otp)
        if not valid:
            return {"binding_id": binding.pk, "party": party, "decision": False, "invalid_otp": True, "binding_complete": False}

    field = "initiator_consent" if party == "initiator" else "approver_consent"
    value = "APPROVED" if decision else "REJECTED"
    setattr(binding, field, value)
    if decision and party == "initiator":
        binding.initiator_consent_at = now
    if decision and party == "approver":
        binding.approver_consent_at = now
    binding.save()

    complete = binding.initiator_consent == "APPROVED" and binding.approver_consent == "APPROVED"
    return {
        "binding_id": binding.pk,
        "party": party,
        "decision": decision,
        "binding_complete": complete,
    }


def finalize_binding(binding: Binding) -> None:
    """Activate a binding once both parties have consented, assigning hierarchy + site."""
    from .models import ContractorEmployment, Site
    if binding.binding_type == "EMPLOYER_CONTRACTOR" and binding.contractor_id:
        contractor = Contractor.objects.filter(pk=binding.contractor_id).first()
        if contractor:
            # GOLDEN RULE: create a many-to-many employment record (C -> E at Site)
            empl, _ = ContractorEmployment.objects.get_or_create(
                contractor=contractor, employer_id=binding.employer_id, site=binding.site,
                defaults={"status": "ACTIVE", "started_at": timezone.now()},
            )
            # If the employment already existed (e.g. ended earlier), reactivate it.
            if empl.status != "ACTIVE":
                empl.status = "ACTIVE"
                empl.started_at = timezone.now()
                empl.ended_at = None
                empl.save(update_fields=["status", "started_at", "ended_at"])
            # Keep primary employer in sync
            Contractor.objects.filter(pk=binding.contractor_id).update(employer=binding.employer)
            if binding.site:
                Contractor.objects.filter(pk=binding.contractor_id).update(site=binding.site)
    if binding.binding_type == "WORKER_CONTRACTOR" and binding.worker_id:
        worker = Worker.objects.filter(pk=binding.worker_id).first()
        contractor = Contractor.objects.filter(pk=binding.contractor_id).first()
        if worker and contractor:
            # Worker -> contractor at the binding's site; employer derived from site
            site = binding.site or contractor.site
            from .hierarchy import assign_worker_to_system
            try:
                if site:
                    assign_worker_to_system(worker, contractor, site)
                else:
                    worker.contractor = contractor
                    worker.employer = contractor.employer
                    worker.save(update_fields=["contractor", "employer"])
            except ValueError:
                worker.contractor = contractor
                worker.employer = contractor.employer
                worker.save(update_fields=["contractor", "employer"])
    binding.status = "ACTIVE"
    binding.started_at = timezone.now()
    binding.save()


def send_sms_otp(phone: str, binding_id: int) -> str:
    """Send an SMS OTP via the configured channel provider."""
    from .channels import send_sms

    otp = f"{secrets.randbelow(10000):04d}"
    store = _otp_store()
    store.set(f"consent_otp:{binding_id}:{phone}", otp, timeout=300)
    send_sms(phone, f"Your BSS binding consent OTP is {otp}. Valid for 5 minutes.")
    return otp


def verify_sms_otp(phone: str, binding_id: int, otp: str) -> bool:
    store = _otp_store()
    expected = store.get(f"consent_otp:{binding_id}:{phone}")
    if not expected or not otp:
        return False
    return secrets.compare_digest(str(expected), str(otp))


def initiate_ivr(phone: str) -> dict:
    """Initiate an IVR 'Press 1 / Press 0' call (Case I fallback)."""
    from .channels import place_ivr

    return place_ivr(phone, "Press 1 to accept binding, Press 0 to decline")


def initiate_voice(phone: str) -> dict:
    """Initiate a voice prompt call as the final fallback (Case II)."""
    from .channels import place_voice

    return place_voice(phone, "Press 1 to confirm app binding")


def fetch_profile_data(viewer, target, bound: bool) -> dict:
    """GUIDE.MD Rule 5 & 6: 100% view if bound, else general info only.

    viewer: the requesting user (has .role). target: Employer/Contractor/Worker.
    bound: whether viewer and target share an active binding.
    """
    if bound:
        return full_profile(target)
    return general_profile(target)


def general_profile(target) -> dict:
    """The safe, general attributes shown to unbound viewers."""
    if isinstance(target, Worker):
        return {
            "Name": target.full_name or "",
            "Age": target.date_of_birth or "",
            "Sex": target.gender or "",
            "Company": None,
            "BloodGroup": target.blood_group or "",
        }
    if isinstance(target, Contractor) or isinstance(target, Employer):
        return {
            "Name": target.name or "",
            "Age": "",
            "Sex": "",
            "Company": target.name or "",
            "BloodGroup": "",
        }
    return {}


def full_profile(target) -> dict:
    """The full database view for bound parties."""
    if isinstance(target, Worker):
        return {
            "Name": target.full_name or "",
            "Worker ID": target.worker_id or "",
            "Mobile": target.mobile or "",
            "Aadhaar": target.aadhaar_no or "",
            "PAN": target.pan_no or "",
            "Father": target.father_name or "",
            "DOB": target.date_of_birth or "",
            "Designation": target.designation or "",
            "Sex": target.gender or "",
            "BloodGroup": target.blood_group or "",
            "Address": target.present_address or "",
            "State": target.state or "",
            "City": target.city or "",
            "Pincode": target.pincode or "",
        }
    if isinstance(target, Contractor):
        return {
            "Name": target.name or "",
            "Contact Person": target.contact_person or "",
            "Mobile": target.contact_mobile or "",
            "Email": target.email or "",
            "Industry": target.industry or "",
            "State": target.state or "",
            "City": target.city or "",
            "GSTIN": target.gstin or "",
            "PAN": target.pan_no or "",
            "Site": target.site_name or "",
        }
    if isinstance(target, Employer):
        return {
            "Name": target.name or "",
            "Contact Person": target.contact_person or "",
            "Mobile": target.contact_mobile or "",
            "Email": target.email or "",
            "Industry": target.industry or "",
            "State": target.state or "",
            "City": target.city or "",
            "GSTIN": target.gstin or "",
            "PAN": target.pan_no or "",
        }
    return {}


def is_bound(viewer, target) -> bool:
    """Check whether viewer and target share an active binding."""
    if viewer is None or target is None:
        return False
    v_role = getattr(viewer, "role", "")
    # Admin/staff have full visibility (resolve_scope: no scope restrictions)
    if v_role in ("SUPER_ADMIN", "BSS_STAFF"):
        return True
    # Resolve the viewer's own entity
    viewer_entity = None
    if v_role == "EMPLOYER":
        emp_id = getattr(viewer, "employer_id", None)
        if emp_id:
            viewer_entity = Employer.objects.filter(pk=emp_id).first()
    elif v_role in ("PRIMARY_CONTRACTOR", "SECONDARY_CONTRACTOR"):
        con_id = getattr(viewer, "contractor_id", None)
        if con_id:
            viewer_entity = Contractor.objects.filter(pk=con_id).first()
    elif v_role == "WORKER":
        viewer_entity = Worker.objects.filter(legacy_employee_code=getattr(viewer, "username", "")).first()
    if viewer_entity is None:
        return False

    if isinstance(target, Employer):
        return target.pk == getattr(viewer_entity, "employer_id", None)
    if isinstance(target, Contractor):
        return target.pk == getattr(viewer_entity, "contractor_id", None)
    if isinstance(target, Worker):
        if isinstance(viewer_entity, Employer):
            return target.employer_id == viewer_entity.pk
        if isinstance(viewer_entity, Contractor):
            return target.contractor_id == viewer_entity.pk
        if isinstance(viewer_entity, Worker):
            return target.pk == viewer_entity.pk
    return False
