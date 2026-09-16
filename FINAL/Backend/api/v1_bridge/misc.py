"""Licence and bank-verification mutation handlers."""

# ruff: noqa: F401,F403
from .common import *  # noqa: F401,F403


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
    """Verify the worker's salary account via Sandbox.co.in Penny Drop (NPCI)."""
    from bss_core.models import WorkerBanking

    bank = WorkerBanking.objects.filter(user=user).first()
    if bank is None or not (bank.bank_account_number or "").strip() or not (bank.ifsc_code or "").strip():
        raise PortalMutationError("Add your bank account number and IFSC in the Banking tab first.", 400)
    ifsc = bank.ifsc_code.strip().upper()
    account = bank.bank_account_number.strip()
    try:
        result = aadhaar_client.verify_bank_account(ifsc, account)
    except aadhaar_client.SandboxError as exc:
        raise PortalMutationError(f"Bank verification could not be completed: {exc}", 502)

    data = result.get("data") or {}
    exists = bool(data.get("account_exists"))
    bank.bank_verification_status = "Verified" if exists else "Failed"
    if exists and data.get("name_at_bank"):
        bank.bank_account_holder_name = str(data.get("name_at_bank"))[:120]
    bank.save(update_fields=["bank_verification_status", "bank_account_holder_name", "updated_at"])
    return {
        "verified": exists,
        "nameAtBank": data.get("name_at_bank") or "",
        "utr": data.get("utr") or "",
        "amountDeposited": data.get("amount_deposited") or "",
        "message": data.get("message") or ("Account verified" if exists else "Account not found"),
    }


__all__ = [
    "_handle_bank_verify",
    "_handle_licences",
]
