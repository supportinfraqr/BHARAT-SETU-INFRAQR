"""Employer compliance-staff worker KYC and bank register."""

# ruff: noqa: F401,F403
from .common import *


def _party_name(user):
    if user is None:
        return ""
    profile = getattr(user, "contractor_profile", None) or getattr(user, "employer_profile", None)
    if profile is not None:
        return str(getattr(profile, "contractor_name", "") or getattr(profile, "employer_name", "")
                   or getattr(profile, "trade_name", "") or user.username)
    return str(getattr(user, "full_name", "") or user.username or "")


def _mask(value, keep=4):
    raw = str(value or "").strip()
    if not raw:
        return ""
    return "X" * max(0, len(raw) - keep) + raw[-keep:] if len(raw) > keep else raw


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def employer_worker_kyc(request):
    from bss_core.models import (WorkerBanking, WorkerContractorBinding,
                                 WorkerDocument, WorkerIdentity,
                                 WorkerSocialSecurity)
    if request.user.role != "employer":
        return Response({"error": "Employers only."}, status=status.HTTP_403_FORBIDDEN)
    _require_permission(request, "compliance")

    bindings = (WorkerContractorBinding.objects
                .filter(site__employer=request.user, binding_status="ACCEPTED")
                .select_related("worker", "site", "contractor")
                .order_by("worker_id", "-created_at"))
    workers = {}
    for binding in bindings:
        worker = binding.worker
        item = workers.setdefault(worker.id, {
            "id": worker.id,
            "sites": set(),
            "contractors": set(),
            "siteId": binding.site_id,
            "site": binding.site.site_name if binding.site else "",
            "contractor": _party_name(binding.contractor) if binding.contractor else "",
        })
        if binding.site:
            item["sites"].add(binding.site.site_name)
        if binding.contractor:
            item["contractors"].add(_party_name(binding.contractor))
    if not workers:
        return Response({"rows": []}, status=status.HTTP_200_OK)

    worker_ids = list(workers)
    identities = {w.user_id: w for w in WorkerIdentity.objects.filter(user_id__in=worker_ids)}
    social = {s.user_id: s for s in WorkerSocialSecurity.objects.filter(user_id__in=worker_ids)}
    banking = {b.user_id: b for b in WorkerBanking.objects.filter(user_id__in=worker_ids)}
    docs = {}
    wanted = {"AADHAR", "WM01", "PAN", "WM02", "BANK", "UAN", "ESIC"}
    for doc in (WorkerDocument.objects
                .filter(user_id__in=worker_ids, document__code__in=wanted)
                .select_related("document").order_by("user_id", "-updated_at")):
        bucket = docs.setdefault(doc.user_id, {})
        bucket.setdefault(doc.document.code, doc)

    rows = []
    for worker_id, meta in workers.items():
        wi = identities.get(worker_id)
        ss = social.get(worker_id)
        bank = banking.get(worker_id)
        doc_map = docs.get(worker_id, {})
        aadhaar_doc = doc_map.get("AADHAR") or doc_map.get("WM01")
        pan_doc = doc_map.get("PAN") or doc_map.get("WM02")
        bank_doc = doc_map.get("BANK")
        rows.append({
            "id": worker_id,
            "name": payloads._d(wi.name if wi else ""),
            "bssId": payloads._d(wi.bss_worker_id if wi else ""),
            "mobile": payloads._d(wi.mobile_number if wi else ""),
            "sites": sorted(meta["sites"]),
            "site": ", ".join(sorted(meta["sites"])),
            "contractors": sorted(meta["contractors"]),
            "contractor": ", ".join(sorted(meta["contractors"])),
            "aadhaar": _mask(wi.aadhaar if wi else ""),
            "aadhaarVerified": bool(wi and str(wi.aadhaar or "").strip()),
            "pan": payloads._d(wi.pan if wi else ""),
            "panVerified": bool(wi and wi.pan_verified),
            "uan": payloads._d(ss.epfo_uan if ss else ""),
            "uanVerified": bool(ss and ss.uan_verified),
            "esic": payloads._d(ss.esic_ip_number if ss else ""),
            "esicVerified": bool(ss and ss.esic_verified),
            "bankName": payloads._d(bank.bank_name if bank else ""),
            "accountHolder": payloads._d(bank.bank_account_holder_name if bank else ""),
            "bankAccount": _mask(bank.bank_account_number if bank else ""),
            "ifsc": payloads._d(bank.ifsc_code if bank else ""),
            "bankVerified": bool(bank and str(bank.bank_verification_status or "").strip().lower() == "verified"),
            "documents": [{
                "id": doc.id,
                "code": doc.document.code,
                "name": doc.document.document_name,
                "status": doc.status,
                "fileName": payloads._d(doc.file_name),
                "uploadedAt": payloads._dts(doc.uploaded_at) if doc.uploaded_at else "",
                "hasFile": bool(doc.file or doc.file_path),
            } for doc in (aadhaar_doc, pan_doc, bank_doc) if doc is not None],
        })
    rows.sort(key=lambda row: (row["name"].lower(), row["bssId"]))
    return Response({"rows": rows}, status=status.HTTP_200_OK)


__all__ = ["employer_worker_kyc"]
