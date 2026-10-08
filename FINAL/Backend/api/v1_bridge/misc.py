"""Licence and bank-verification mutation handlers."""

# ruff: noqa: F401,F403
from .common import *  # noqa: F401,F403
from ..identity_utils import names_match


def _handle_licences(user, body, method, role_path):
    """CRUD for an entity's statutory registrations & licences (EPFO, ESIC,
    CLRA, BOCW, Factory, Shops & Est., PT, LWF...). Rows are scoped to the
    logged-in party so nobody can touch another entity's records."""
    from bss_core.models import PartyStatutoryRegistration

    def _serialise(st):
        from datetime import date as _date
        ver = str(st.verification_status or "").upper()
        if ver in ("ACTIVE", "VERIFIED", "APPROVED", "VALIDATED"):
            status = "Expired" if (st.expiry_at and st.expiry_at < _date.today()) else "Active"
        else:
            status = "Pending"
        return {
            "id": str(st.id),
            "kind": st.reg_kind,
            "name": st.get_reg_kind_display() or st.reg_kind,
            "authority": st.authority or "",
            "number": st.reg_number or "",
            "validFrom": st.issued_at.strftime("%Y-%m-%d") if st.issued_at else "",
            "validTo": st.expiry_at.strftime("%Y-%m-%d") if st.expiry_at else "",
            "status": status,
        }

    kind = str(body.get("kind") or "").strip().upper()
    known = [c[0] for c in PartyStatutoryRegistration.KIND]
    if kind and kind not in known:
        raise PortalMutationError("Select a valid registration kind.", 422)

    if user.role not in ("contractor", "employer"):
        raise PortalMutationError("Only contractors and employers manage licences.", 403)

    if method == "DELETE":
        lic = PartyStatutoryRegistration.objects.filter(
            pk=body.get("id"), party_user=user).first()
        if lic is None:
            raise PortalMutationError("Licence not found.", 404)
        lic.delete()
        return str(lic.id)

    if method == "PATCH":
        lic = PartyStatutoryRegistration.objects.filter(
            pk=body.get("id"), party_user=user).first()
        if lic is None:
            raise PortalMutationError("Licence not found.", 404)
    else:
        lic = PartyStatutoryRegistration(
            party_type=user.role, party_user=user,
            verification_status="ACTIVE", is_active=True)

    if kind:
        lic.reg_kind = kind
    if body.get("number") is not None:
        lic.reg_number = str(body.get("number")).strip()[:80]
    if body.get("authority") is not None:
        lic.authority = str(body.get("authority")).strip()[:120]
    if body.get("issuedAt"):
        lic.issued_at = _coerce_profile_date(body.get("issuedAt"))
    if body.get("expiryAt"):
        lic.expiry_at = _coerce_profile_date(body.get("expiryAt"))
    lic.save()
    return _serialise(lic)


def _handle_bank_verify(user, body):
    """Verify the worker's salary account via Sandbox.co.in (NPCI).

    The worker supplies only the **bank account number + IFSC**. The IFSC is
    verified first to auto-fill the bank name and branch details, then the Penny
    Drop (₹1 credit) confirms the account and returns the account-holder name as
    registered at the bank. Everything is persisted, so the worker never has to
    type the bank name or holder name.
    """
    import re
    from bss_core.models import WorkerBanking

    bank, _ = WorkerBanking.objects.get_or_create(user=user)
    body = body if isinstance(body, dict) else {}
    account = str(body.get("accountNumber") or bank.bank_account_number or "").strip()
    ifsc = str(body.get("ifsc") or bank.ifsc_code or "").strip().upper()
    if not account or not ifsc:
        raise PortalMutationError("Enter your bank account number and IFSC.", 400)
    if not re.fullmatch(r"[A-Z]{4}[A-Z0-9]{7}", ifsc):
        raise PortalMutationError("That IFSC code doesn't look valid (e.g. SBIN0001234).", 400)

    # 1) IFSC verification → bank name + branch details (no need to ask the user).
    try:
        ifsc_result = aadhaar_client.verify_ifsc(ifsc)
    except aadhaar_client.SandboxError as exc:
        raise PortalMutationError(f"IFSC verification could not be completed: {exc}", 502)
    branch = ifsc_result.get("data") if isinstance(ifsc_result.get("data"), dict) else ifsc_result
    bank_name = str(branch.get("BANK") or "").strip()[:120]

    # 2) Penny Drop → account existence + account-holder name (name at bank).
    try:
        result = aadhaar_client.verify_bank_account(ifsc, account)
    except aadhaar_client.SandboxError as exc:
        raise PortalMutationError(f"Bank verification could not be completed: {exc}", 502)

    data = result.get("data") or {}
    exists = bool(data.get("account_exists"))
    name_at_bank = str(data.get("name_at_bank") or "").strip()

    # 3) Account-holder name vs the worker's Aadhaar name (double-tick on match).
    from bss_core.models import WorkerIdentity
    identity = WorkerIdentity.objects.filter(user=user).first()
    aadhaar_name = (getattr(identity, "name", "") or "").strip()
    name_matches = names_match(name_at_bank, aadhaar_name)

    # 4) Persist the account + the bank data we auto-read (no branch contact).
    bank.bank_account_number = account
    bank.ifsc_code = ifsc
    if bank_name:
        bank.bank_name = bank_name
    bank.bank_branch = str(branch.get("BRANCH") or "")[:120]
    if isinstance(branch.get("UPI"), bool):
        bank.upi_enabled = branch.get("UPI")
    bank.bank_verification_status = "Verified" if exists else "Failed"
    if exists and name_at_bank:
        bank.bank_account_holder_name = name_at_bank[:120]
    bank.bank_holder_matches_aadhaar = (name_matches if exists else None)
    bank.save()

    return {
        "verified": exists,
        "bankName": bank.bank_name,
        "nameAtBank": name_at_bank,
        "holderName": bank.bank_account_holder_name,
        "branch": bank.bank_branch,
        "nameMatchesAadhaar": bool(name_matches) if exists else False,
        "upiEnabled": bool(bank.upi_enabled),
        "utr": data.get("utr") or "",
        "amountDeposited": data.get("amount_deposited") or "",
        "message": data.get("message") or ("Account verified" if exists else "Account not found"),
    }


__all__ = [
    "_handle_bank_verify",
    "_handle_licences",
]
