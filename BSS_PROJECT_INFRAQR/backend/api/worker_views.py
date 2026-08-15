"""Phase 6 — Worker + Contractor flows (WorkerController.cs, ContractorController.cs,
RetailSectionController.cs worker/contractor actions) integrated with the QR layer.

Legacy response contract (mirrors what the Angular frontend reads via
`response.data.Result`):
  * data-table style actions -> {"Result": [row, ...], "Message": ""}
  * IUD / scalar actions      -> {"Result": "<message>"}
  * file uploads              -> {"Status": bool, "Result": ..., "Message": ...}
  * worker creation           -> {"status": True, "Result": {...}}

Key integration: registering a worker writes to qr.Worker and immediately
generates the static QR reference via qr.services.create_qr_for_entity(
"WORKER", worker.pk).
"""
import base64
import json
import os
import re
import uuid

from django.conf import settings
from django.db import transaction
from django.db.models import Q
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt

from legacy.models import (
    ContractorBillingOrder,
    ContractorLicenseMaster,
    EmployeeMaster,
    JobDetailHistory,
    LegacySiteManager,
    LoginTable,
    PartyMaster,
    ReleaseWorkerByContractor,
    VendorRegistration,
)
from qr.models import Binding, Contractor, Employer, Worker
from qr.services import create_qr_for_entity, notify, write_audit

from .views import _login_id, _to_bool, session_expired


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------


def _body(request):
    """Loose legacy body parser.

    The legacy frontend POSTs:
      * '{obj:' + JSON.stringify(obj) + '}'  ->  {obj:{...}} (invalid JSON)
      * JSON.stringify(obj)                  ->  {...}       (valid JSON)
      * multipart/form-data (file uploads)
    """
    if getattr(request, "POST", None) and len(request.POST):
        raw_obj = request.POST.get("obj")
        if raw_obj:
            try:
                data = json.loads(raw_obj)
                if isinstance(data, dict):
                    return data
            except Exception:
                pass
        return {k: v for k, v in request.POST.items() if k != "obj"}
    raw = request.body or b""
    if isinstance(raw, bytes):
        raw = raw.decode("utf-8", errors="replace")
    raw = raw.strip().lstrip("\ufeff").strip()
    if not raw:
        return {}
    try:
        data = json.loads(raw)
        if isinstance(data, dict):
            if isinstance(data.get("obj"), dict):
                data = data["obj"]
            return data
    except Exception:
        pass
    m = re.search(r"\{\s*obj\s*:\s*(\{.*\})\s*\}", raw, re.DOTALL)
    if m:
        try:
            data = json.loads(m.group(1))
            return data if isinstance(data, dict) else {}
        except Exception:
            pass
    return {}


def _int(value):
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _login_row(login_id):
    return LoginTable.objects.filter(LoginId=login_id).first()


def _employee_for_login(login_id):
    if not login_id:
        return None
    return EmployeeMaster.objects.filter(UserId=login_id).order_by("-Id").first()


def _worker_for_login(login_id):
    em = _employee_for_login(login_id)
    worker = None
    if em:
        worker = (
            Worker.objects.filter(legacy_employee_id=em.Id).first()
            or Worker.objects.filter(legacy_employee_code=em.EmployeeCode).first()
        )
    if worker is None and em and em.MobileNumber:
        worker = Worker.objects.filter(mobile=em.MobileNumber).first()
    return em, worker


def _worker_qr(worker):
    if worker is None:
        return None
    return create_qr_for_entity("WORKER", worker.pk)


def _worker_qr_reference(worker):
    qr = _worker_qr(worker)
    return qr.qr_reference if qr else ""


def _party(party_id):
    if not party_id:
        return None
    return PartyMaster.objects.filter(PartyId=party_id).first()


def _save_upload(upload, subfolder):
    folder = os.path.join(settings.MEDIA_ROOT, subfolder)
    os.makedirs(folder, exist_ok=True)
    ext = os.path.splitext(upload.name or "")[1].lower() or ".png"
    filename = f"{uuid.uuid4().hex}{ext}"
    with open(os.path.join(folder, filename), "wb") as f:
        for chunk in upload.chunks():
            f.write(chunk)
    return f"/media/{subfolder}/{filename}"


def _save_data_uri(data_uri, subfolder):
    if not data_uri or not str(data_uri).startswith("data:"):
        return None
    m = re.match(r"data:([^;]+);base64,(.*)$", str(data_uri), re.DOTALL)
    if not m:
        return None
    mime = m.group(1)
    ext = (mime.split("/")[-1] or "bin").lower()
    try:
        data = base64.b64decode(m.group(2))
    except Exception:
        return None
    folder = os.path.join(settings.MEDIA_ROOT, subfolder)
    os.makedirs(folder, exist_ok=True)
    filename = f"{uuid.uuid4().hex}.{ext}"
    with open(os.path.join(folder, filename), "wb") as f:
        f.write(data)
    return f"/media/{subfolder}/{filename}"


# ---------------------------------------------------------------------------
# OCR parsing helpers (ported from WorkerController.cs)
# ---------------------------------------------------------------------------

_AADHAAR_RE = re.compile(r"\b\d{4}\s\d{4}\s\d{4}\b")
_AADHAAR_RE2 = re.compile(r"\b\d{12}\b")
_DOB_RE = re.compile(r"\b\d{2}/\d{2}/\d{4}\b")
_PAN_RE = re.compile(r"\b[A-Z]{5}\d{4}[A-Z]\b")
_UAN_RE = re.compile(
    r"(?:UAN|Universal\s+Account\s+Number)[^\d]{0,30}(\d{12})",
    re.IGNORECASE | re.DOTALL,
)
_UAN_RE2 = re.compile(r"\b\d{12}\b")
_ESIC_RE = re.compile(
    r"(?:Insurance\s*No|IP\s*Number|Insured\s*Person\s*No|ESIC)[^\d]{0,30}(\d{10,17})",
    re.IGNORECASE | re.DOTALL,
)
_ESIC_RE2 = re.compile(r"\b\d{10,17}\b")
_NAME_SKIP_RE = re.compile(
    r"INCOME TAX|DEPARTMENT|GOVT|GOVERNMENT|INDIA|CARD|PERMANENT|ACCOUNT NUMBER|QR CODE|"
    r"AADHAAR|UIDAI|VID|DOB|DATE OF BIRTH|ESIC|EMPLOYEES|INSURANCE|CORPORATION|"
    r"UAN|UNIVERSAL|EPFO|AUTHORITY|MALE|FEMALE|MERI PEHCHAN|मेरी पहचान|HELP|CARE",
    re.IGNORECASE,
)


def _normalize_name(name):
    if not name:
        return ""
    s = str(name).upper().strip()
    s = re.sub(r"[.\-']", "", s)
    return re.sub(r"\s+", " ", s)


def _levenshtein(s, t):
    n, m = len(s), len(t)
    if n == 0:
        return m
    if m == 0:
        return n
    d = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(n + 1):
        d[i][0] = i
    for j in range(m + 1):
        d[0][j] = j
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            cost = 0 if s[i - 1] == t[j - 1] else 1
            d[i][j] = min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost)
    return d[n][m]


def _similarity(s1, s2):
    if not s1 and not s2:
        return 1.0
    if not s1 or not s2:
        return 0.0
    maxlen = max(len(s1), len(s2))
    return 1.0 - _levenshtein(s1, s2) / maxlen


def _detect_name(text, doc_name, expected_name):
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    candidates = []
    for line in lines:
        if _NAME_SKIP_RE.search(line):
            continue
        if re.search(r"\d", line):
            continue
        if re.match(r"^[A-Za-z .&]+$", line):
            candidates.append(line)
    if not candidates:
        return ""
    if expected_name:
        best, best_score = "", 0.0
        exp = _normalize_name(expected_name)
        for cand in candidates:
            score = _similarity(exp, _normalize_name(cand))
            if score > best_score:
                best_score, best = score, cand
        return best or candidates[0]
    return max(candidates, key=len)


def _extract_document_info(text, doc_name):
    info = {
        "AadhaarNo": "",
        "PANNumber": "",
        "DOB": "",
        "PreviousUAN": "",
        "PreviousESI": "",
    }
    doc = (doc_name or "").lower()
    if doc in ("aadhaar", "aadhar"):
        m = _AADHAAR_RE.search(text)
        if m:
            info["AadhaarNo"] = m.group(0).replace(" ", "")
        else:
            m = _AADHAAR_RE2.search(text)
            info["AadhaarNo"] = m.group(0) if m else ""
    elif doc == "pan":
        m = _PAN_RE.search(text)
        info["PANNumber"] = m.group(0) if m else ""
        m = _DOB_RE.search(text)
        info["DOB"] = m.group(0) if m else ""
    elif doc == "uan":
        m = _UAN_RE.search(text)
        info["PreviousUAN"] = m.group(1) if m else ""
        if not info["PreviousUAN"]:
            m = _UAN_RE2.search(text)
            info["PreviousUAN"] = m.group(0) if m else ""
    elif doc in ("esic", "esicno"):
        m = _ESIC_RE.search(text)
        info["PreviousESI"] = m.group(1) if m else ""
        if not info["PreviousESI"]:
            m = _ESIC_RE2.search(text)
            info["PreviousESI"] = m.group(0) if m else ""
    return info


def _verify_document(text, doc_name, em, expected_name):
    """Port of WorkerController.Verification(). Returns (message, {}); message
    is 'SUCCESS' when the document validates against the worker's login record."""
    up = text.upper()
    doc = (doc_name or "").upper().replace("AADHAR", "AADHAAR")
    doc_number = ""
    doc_display = ""
    if doc in ("AADHAAR", "AADHAR"):
        if not any(k in up for k in (
            "GOVERNMENT OF INDIA", "UNIQUE IDENTIFICATION AUTHORITY OF INDIA",
            "AADHAAR", "MERI PEHCHAN", "मेरी पहचान")):
            return "Uploaded document is not a valid Aadhaar Card.", {}
        doc_number = (em.AdharCardNumber if em else "") or ""
        doc_display = "Aadhaar"
    elif doc == "PAN":
        if not ("INCOME TAX DEPARTMENT" in up or "PERMANENT ACCOUNT NUMBER" in up):
            return "Uploaded document is not a valid PAN Card.", {}
        doc_number = (em.PANNumber if em else "") or ""
        doc_display = "PAN"
    elif doc == "UAN":
        if not any(k in up for k in ("UNIVERSAL ACCOUNT NUMBER", "EMPLOYEES PROVIDENT FUND", "EPFO")):
            return "Uploaded document is not a valid UAN Document.", {}
        doc_number = (em.PreviousUAN if em else "") or ""
        doc_display = "UAN"
    elif doc in ("ESIC", "ESICNO"):
        if not any(k in up for k in (
            "EMPLOYEES STATE INSURANCE", "EMPLOYEES STATE INSURANCE CORPORATION", "ESIC")):
            return "Uploaded document is not a valid ESIC Card.", {}
        doc_number = (em.PreviousESI if em else "") or ""
        doc_display = "ESIC"
    else:
        return "Invalid document type.", {}

    if expected_name and _normalize_name(expected_name):
        if _normalize_name(expected_name) not in up:
            return f"Name not verified in {doc_display} document.", {}
    if doc_number and _normalize_name(doc_number):
        needle = _normalize_name(doc_number)
        if needle not in up:
            # OCR text often formats numbers with spaces (e.g. aadhaar 1234 5678 9012)
            if needle not in re.sub(r"\s+", "", up):
                return f"{doc_display} Number not verified.", {}
    return "SUCCESS", {}


def _apply_document_update(em, worker, info, ocr_name):
    """Persist extracted KYC fields to the legacy employee row + qr worker."""
    name = ocr_name or (em.EmployeeName if em else "")
    if em:
        upd = {}
        if info.get("AadhaarNo"):
            upd["AdharCardNumber"] = info["AadhaarNo"]
            upd["AadharName"] = name
        if info.get("PANNumber"):
            upd["PANNumber"] = info["PANNumber"]
            upd["PanCardName"] = name
        if info.get("DOB"):
            upd["DateOfBirth"] = info["DOB"]
        if info.get("PreviousUAN"):
            upd["PreviousUAN"] = info["PreviousUAN"]
            upd["UanName"] = name
        if info.get("PreviousESI"):
            upd["PreviousESI"] = info["PreviousESI"]
            upd["ESICName"] = name
        if upd:
            EmployeeMaster.objects.filter(Id=em.Id).update(**upd)
    if worker:
        wupd = {}
        if info.get("AadhaarNo"):
            wupd["aadhaar_no"] = info["AadhaarNo"]
        if info.get("PANNumber"):
            wupd["pan_no"] = info["PANNumber"]
        if wupd:
            Worker.objects.filter(pk=worker.pk).update(**wupd)


# ---------------------------------------------------------------------------
# WorkerController.cs
# ---------------------------------------------------------------------------


@csrf_exempt
def worker_save_photo(request):
    """POST /api/Worker/SavePhoto — multipart, field 'Photo'."""
    if not request.user.is_authenticated:
        return session_expired()
    photo = request.FILES.get("Photo")
    if not photo:
        return JsonResponse({"Status": False, "Message": "Photo not found."})
    login_id = _login_id(request)
    path = _save_upload(photo, "ProfilePhoto")
    if login_id:
        LoginTable.objects.filter(LoginId=login_id).update(Photo=path)
    em, worker = _worker_for_login(login_id) if login_id else (None, None)
    if worker:
        Worker.objects.filter(pk=worker.pk).update(photo=path)
    if em:
        EmployeeMaster.objects.filter(Id=em.Id).update(EmployeePhotos=path)
    write_audit(request, "WORKER_PHOTO_UPLOADED", "WORKER", worker.pk if worker else None)
    return JsonResponse({"Result": "Success", "Message": "Upload successful"})


@csrf_exempt
def worker_save_document(request):
    """POST /api/Worker/SaveDocument — multipart; fields Photo, DocName,
    FinalName/Name/EmpName and optional raw_text (OCR output)."""
    if not request.user.is_authenticated:
        return session_expired()
    photo = request.FILES.get("Photo")
    if not photo:
        return JsonResponse({"Status": False, "Message": "Photo not found."})
    doc_name = (request.POST.get("DocName") or "").strip()
    expected_name = (
        request.POST.get("FinalName") or request.POST.get("Name")
        or request.POST.get("EmpName") or ""
    ).strip()
    raw_text = (request.POST.get("raw_text") or "").strip()
    _save_upload(photo, "DocumentOCR")
    login_id = _login_id(request)
    em, worker = _worker_for_login(login_id) if login_id else (None, None)

    if raw_text:
        status_msg, _ = _verify_document(raw_text, doc_name, em, expected_name)
        if status_msg != "SUCCESS":
            return JsonResponse({
                "Status": False, "NameMismatch": True, "OCRName": status_msg,
                "Message": "The name on the uploaded document does not match the entered name.",
            })
        info = _extract_document_info(raw_text, doc_name)
        ocr_name = _detect_name(raw_text, doc_name, expected_name) or expected_name
        if expected_name and ocr_name and _normalize_name(ocr_name) != _normalize_name(expected_name):
            return JsonResponse({
                "Status": False, "NameMismatch": True, "OCRName": ocr_name,
                "Message": "The name on the uploaded document does not match the entered name.",
            })
        info["Name"] = ocr_name
        _apply_document_update(em, worker, info, ocr_name)
    else:
        # No external OCR text supplied — accept the upload, record the file.
        _apply_document_update(em, worker, {}, expected_name)

    write_audit(request, "WORKER_DOCUMENT_UPLOADED", "WORKER", worker.pk if worker else None, new=doc_name)
    return JsonResponse({"Status": True, "Result": "Success", "OCR": {"raw_text": raw_text}})


@csrf_exempt
def worker_again_save_document(request):
    """POST /api/Worker/AgainSaveDocument — same as SaveDocument but always saves."""
    if not request.user.is_authenticated:
        return session_expired()
    photo = request.FILES.get("Photo")
    if not photo:
        return JsonResponse({"Status": False, "Message": "Photo not found."})
    doc_name = (request.POST.get("DocName") or "").strip()
    expected_name = (
        request.POST.get("FinalName") or request.POST.get("Name")
        or request.POST.get("EmpName") or ""
    ).strip()
    raw_text = (request.POST.get("raw_text") or "").strip()
    _save_upload(photo, "DocumentOCR")
    login_id = _login_id(request)
    em, worker = _worker_for_login(login_id) if login_id else (None, None)

    info = {}
    if raw_text:
        _verify_document(raw_text, doc_name, em, expected_name)
        info = _extract_document_info(raw_text, doc_name)
        ocr_name = _detect_name(raw_text, doc_name, expected_name) or expected_name
        info["Name"] = ocr_name
        _apply_document_update(em, worker, info, ocr_name)

    write_audit(request, "WORKER_DOCUMENT_REUPLOADED", "WORKER", worker.pk if worker else None, new=doc_name)
    return JsonResponse({"Status": True, "Result": "Success", "OCR": {"raw_text": raw_text}})


@csrf_exempt
def worker_getdetailocr(request):
    """POST /api/Worker/getdetailocr — worker registration progress detail."""
    if not request.user.is_authenticated:
        return session_expired()
    login_id = _login_id(request)
    lt = _login_row(login_id)
    em, worker = _worker_for_login(login_id) if login_id else (None, None)
    row = {
        "Name": (lt.Name if lt else "") or (em.EmployeeName if em else ""),
        "photo": (lt.Photo if lt else "") or (worker.photo if worker and worker.photo else ""),
        "PANNumber": em.PANNumber if em else "",
        "AdharCardNumber": em.AdharCardNumber if em else "",
        "PreviousUAN": em.PreviousUAN if em else "",
        "PreviousESI": em.PreviousESI if em else "",
        "DOB": em.DateOfBirth if em else "",
        "Address": lt.Address if lt else "",
        "EmployeeCode": em.EmployeeCode if em else (worker.worker_id if worker else ""),
        "UserId": login_id or "",
        "PartyId": em.PartyId if em else (worker.contractor.legacy_party_id if worker and worker.contractor else ""),
        "status": "Active" if (em and str(em.IsActive or "") == "1") else ("Pending" if em else ""),
        "qr_reference": _worker_qr_reference(worker) if worker else "",
    }
    return JsonResponse({"Result": [row], "Message": ""})


@csrf_exempt
def worker_upload_name(request):
    """POST /api/Worker/UploadName — manual KYC entry (name/aadhaar/pan/uan/esic)."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _body(request)
    login_id = _login_id(request)
    name = body.get("Name") or ""
    aadhaar = body.get("AdharCardNumber") or ""
    pan = body.get("PANNumber") or ""
    uan = body.get("PreviousUAN") or ""
    esic = body.get("PreviousESI") or ""
    state = body.get("state") or body.get("State") or ""

    em, worker = _worker_for_login(login_id) if login_id else (None, None)
    if em:
        upd = {}
        if name:
            upd["EmployeeName"] = name
        if aadhaar:
            upd["AdharCardNumber"] = aadhaar
            upd["AadharName"] = name
        if pan:
            upd["PANNumber"] = pan
            upd["PanCardName"] = name
        if uan:
            upd["PreviousUAN"] = uan
            upd["UanName"] = name
        if esic:
            upd["PreviousESI"] = esic
            upd["ESICName"] = name
        if state:
            upd["State"] = state
        if upd:
            EmployeeMaster.objects.filter(Id=em.Id).update(**upd)
    if worker:
        wupd = {}
        if name:
            wupd["full_name"] = name
        if aadhaar:
            wupd["aadhaar_no"] = aadhaar
        if pan:
            wupd["pan_no"] = pan
        if wupd:
            Worker.objects.filter(pk=worker.pk).update(**wupd)

    write_audit(request, "WORKER_NAME_UPLOADED", "WORKER", worker.pk if worker else None)
    return JsonResponse({"Result": "Success", "Message": "Uploaded"})


# ---------------------------------------------------------------------------
# ContractorController.cs
# ---------------------------------------------------------------------------


@csrf_exempt
def contractor_save_billing_order(request):
    """POST /api/Contractor/SaveBillingOrder."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _body(request)
    login_id = _login_id(request)
    order_copy = _save_data_uri(body.get("OrderCopy"), "ContractorDoc")
    ContractorBillingOrder.objects.create(
        Site=body.get("Site"),
        OrderNumber=body.get("OrderNumber"),
        OrderQty=body.get("OrderQty"),
        OrderValue=body.get("OrderValue"),
        OrderValidityFrom=body.get("OrderValidityFrom"),
        OrderValidityTo=body.get("OrderValidityTo"),
        OrderCopy=order_copy,
        LoginId=str(login_id) if login_id else None,
        CreatedBy=str(login_id) if login_id else None,
        CreatedOn=timezone.now(),
        IsActive="1",
    )
    write_audit(request, "CONTRACTOR_BILLING_ORDER_SAVED", "CONTRACTOR",
                new=body.get("OrderNumber") or "")
    return JsonResponse({"Result": "Billing order saved successfully"})


@csrf_exempt
def contractor_save_license(request):
    """POST /api/Contractor/SaveLicense — LicenseCopy/AmendentCopy/ApplicationCopy/
    ChallanCopy/FeesCopy are base64 data URIs."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _body(request)
    login_id = _login_id(request)
    ContractorLicenseMaster.objects.create(
        LoginId=str(login_id) if login_id else None,
        CreatedBy=str(login_id) if login_id else None,
        CreatedOn=timezone.now(),
        LicenseName=body.get("LicenseName"),
        LicenseStatus=body.get("LicenseStatus"),
        LicenseNumber=body.get("LicenseNumber"),
        LicenseValidFrom=body.get("LicenseValidFrom"),
        LicenseValidTo=body.get("LicenseValidTo"),
        LicenseCopy=_save_data_uri(body.get("LicenseCopy"), "ContractorDoc"),
        AmendentCopy=_save_data_uri(body.get("AmendentCopy"), "ContractorDoc"),
        ApplicationCopy=_save_data_uri(body.get("ApplicationCopy"), "ContractorDoc"),
        ChallanCopy=_save_data_uri(body.get("ChallanCopy"), "ContractorDoc"),
        FeesCopy=_save_data_uri(body.get("FeesCopy"), "ContractorDoc"),
        Username=body.get("Username"),
        MobileNo=body.get("MobileNo"),
        EmailId=body.get("EmailId"),
        Siteid=body.get("Siteid"),
    )
    write_audit(request, "CONTRACTOR_LICENSE_SAVED", "CONTRACTOR",
                new=body.get("LicenseNumber") or "")
    return JsonResponse({"Result": "License saved successfully"})


@csrf_exempt
def contractor_get_site_overview(request):
    """POST /api/Contractor/GetSiteOverview — billing orders overview."""
    if not request.user.is_authenticated:
        return session_expired()
    rows = list(ContractorBillingOrder.objects.filter(IsActive="1").values()[:200])
    return JsonResponse({"Result": rows, "Message": ""})


# ---------------------------------------------------------------------------
# RetailSectionController.cs — worker/contractor data actions
# ---------------------------------------------------------------------------


def _worker_dashboard_row(em, worker, user_id):
    if em is None and worker is None:
        return None
    status = "Active"
    if em:
        if str(em.IsActive or "") == "0":
            status = "InActive"
        elif not em.IsActive:
            status = "Pending"
    return {
        "LoginId": user_id,
        "UserId": user_id,
        "Name": em.EmployeeName if em else (worker.full_name if worker else ""),
        "EmployeeCode": em.EmployeeCode if em else (worker.worker_id if worker else ""),
        "RefEmployeeCode": em.RefEmployeeCode if em else "",
        "PartyId": em.PartyId if em else (worker.contractor.legacy_party_id if worker and worker.contractor else ""),
        "MobileNumber": em.MobileNumber if em else (worker.mobile if worker else ""),
        "AdharCardNumber": em.AdharCardNumber if em else (worker.aadhaar_no if worker else ""),
        "PANNumber": em.PANNumber if em else (worker.pan_no if worker else ""),
        "PreviousUAN": em.PreviousUAN if em else "",
        "PreviousESI": em.PreviousESI if em else "",
        "DOB": em.DateOfBirth if em else "",
        "DOJ": em.DOJ if em else "",
        "status": status,
        "IsActive": em.IsActive if em else ("1" if worker else ""),
        "photo": worker.photo if worker and worker.photo else "",
        "qr_reference": _worker_qr_reference(worker) if worker else "",
    }


def _contractor_detail(user_id, party_id):
    con = None
    if party_id:
        con = Contractor.objects.filter(legacy_party_id=party_id).first()
    if con is None:
        em, worker = _worker_for_login(user_id) if user_id else (None, None)
        con = worker.contractor if worker else None
    if con is None and party_id:
        party = _party(party_id)
        if party:
            return {
                "PartyId": party_id,
                "PartyName": party.PartyName or "",
                "ContactPerson": party.ContactPerson or "",
                "ContactMobile": party.ContactMobile or "",
                "EmailId": party.EmailId or "",
                "Address": party.Address or "",
                "TotalWorker": EmployeeMaster.objects.filter(PartyId=party_id).count(),
            }
    if con is None:
        return None
    party = _party(con.legacy_party_id) if con.legacy_party_id else None
    return {
        "PartyId": con.legacy_party_id or "",
        "PartyName": con.name,
        "ContactPerson": party.ContactPerson if party else "",
        "ContactMobile": party.ContactMobile if party else (con.contact_mobile or ""),
        "EmailId": party.EmailId if party else "",
        "Address": party.Address if party else "",
        "site_name": con.site_name or "",
        "TotalWorker": Worker.objects.filter(contractor=con).count(),
    }


def _principle_detail(user_id, party_id):
    emp = None
    if party_id:
        emp = Employer.objects.filter(legacy_party_id=party_id).first()
    if emp is None:
        em, worker = _worker_for_login(user_id) if user_id else (None, None)
        emp = worker.employer if worker else None
    if emp is None and party_id:
        party = _party(party_id)
        if party:
            return {
                "PartyId": party_id,
                "PartyName": party.PartyName or "",
                "ContactPerson": party.ContactPerson or "",
                "ContactMobile": party.ContactMobile or "",
                "EmailId": party.EmailId or "",
                "Address": party.Address or "",
                "TotalContractor": 0,
            }
    if emp is None:
        return None
    party = _party(emp.legacy_party_id) if emp.legacy_party_id else None
    return {
        "PartyId": emp.legacy_party_id or "",
        "PartyName": emp.name,
        "ContactPerson": emp.contact_person or (party.ContactPerson if party else ""),
        "ContactMobile": emp.contact_mobile or (party.ContactMobile if party else ""),
        "EmailId": emp.email or (party.EmailId if party else ""),
        "Address": emp.address or (party.Address if party else ""),
        "TotalContractor": Contractor.objects.filter(employer=emp).count(),
    }


def _appointment_detail(em, worker):
    code = em.EmployeeCode if em else (worker.worker_id if worker else "")
    rel = ReleaseWorkerByContractor.objects.filter(WorkerCode=code).order_by("-id").first()
    return {
        "WorkerCode": code,
        "WorkerName": em.EmployeeName if em else (worker.full_name if worker else ""),
        "DOJ": em.DOJ if em else "",
        "Site": rel.Site if rel else "",
        "LastDate": rel.LastDate if rel else "",
        "Remarks": rel.Remarks if rel else "",
        "status": "Released" if rel else "Active",
    }


def _approval_section(em):
    def yes(value):
        return str(value or "").strip() not in ("", "0")

    return {
        "PanApprove": yes(em.PANNumber if em else None),
        "AdhaarApprove": yes(em.AdharCardNumber if em else None),
        "UANApprove": yes(em.PreviousUAN if em else None),
        "ESICApprove": yes(em.PreviousESI if em else None),
    }


@csrf_exempt
def bind_worker_detail(request):
    """POST /api/RetailSection/bindworkerdetail — WorkerDashboard stored proc port.

    ActionType 1 = worker dashboard, 2 = principle detail, 3 = contractor detail,
    5 = current appointment, 6 = worker profile, 7 = document approval section.
    """
    if not request.user.is_authenticated:
        return session_expired()
    body = _body(request)
    login_id = _login_id(request)
    action = str(body.get("ActionType") or body.get("Action") or "1")
    user_id = _int(body.get("UserId")) or login_id
    party_id = _int(body.get("Id") or body.get("PartyId"))

    if action == "2":
        row = _principle_detail(user_id, party_id)
        return JsonResponse({"Result": [row] if row else [], "Message": ""})
    if action == "3":
        row = _contractor_detail(user_id, party_id)
        return JsonResponse({"Result": [row] if row else [], "Message": ""})
    if action == "5":
        em, worker = _worker_for_login(user_id) if user_id else (None, None)
        row = _appointment_detail(em, worker)
        return JsonResponse({"Result": [row] if row else [], "Message": ""})
    if action == "6":
        em, worker = _worker_for_login(user_id) if user_id else (None, None)
        row = _worker_dashboard_row(em, worker, user_id)
        return JsonResponse({"Result": [row] if row else [], "Message": ""})
    if action == "7":
        em, worker = _worker_for_login(user_id) if user_id else (None, None)
        row = _approval_section(em)
        return JsonResponse({"Result": [row], "Message": ""})

    em, worker = _worker_for_login(user_id) if user_id else (None, None)
    row = _worker_dashboard_row(em, worker, user_id)
    return JsonResponse({"Result": [row] if row else [], "Message": ""})


def _worker_by_code(worker_code):
    if not worker_code:
        return None
    return (
        Worker.objects.filter(worker_id=worker_code).first()
        or Worker.objects.filter(legacy_employee_code=worker_code).first()
    )


@csrf_exempt
def send_req_to_worker(request):
    """POST /api/RetailSection/SendReqToWorker — worker<->contractor binding
    requests mapped onto the QR Binding model.

    ActionType 22 = worker accepts consent, 24 = contractor resends, else send.
    """
    if not request.user.is_authenticated:
        return session_expired()
    body = _body(request)
    login_id = _login_id(request)
    action = str(body.get("ActionType") or body.get("Action") or "")
    worker_code = body.get("EmployeeCode") or body.get("WorkerCode") or ""
    party_id = _int(body.get("PartyId"))
    worker = _worker_by_code(worker_code)
    contractor = Contractor.objects.filter(legacy_party_id=party_id).first() if party_id else None
    if worker is None:
        em, worker = _worker_for_login(login_id) if login_id else (None, None)
    if worker is None:
        return JsonResponse({"Result": "Worker not found."})

    with transaction.atomic():
        if action == "22":  # worker accepts the contractor's request
            binding = (
                Binding.objects.filter(
                    binding_type="WORKER_CONTRACTOR", worker=worker, status="PENDING"
                ).order_by("-created_at").first()
            )
            if binding is None:
                if contractor is None and worker.contractor_id:
                    contractor = worker.contractor
                binding = Binding.objects.create(
                    binding_type="WORKER_CONTRACTOR",
                    employer=contractor.employer if contractor else None,
                    contractor=contractor,
                    worker=worker,
                    status="ACTIVE",
                    started_at=timezone.now(),
                    site_name=contractor.site_name if contractor else "",
                )
            binding.status = "ACTIVE"
            binding.started_at = timezone.now()
            binding.save()
            if contractor:
                Worker.objects.filter(pk=worker.pk).update(
                    contractor=contractor,
                    employer_id=contractor.employer_id or worker.employer_id,
                )
            write_audit(request, "WORKER_CONSENT_ACCEPTED", "WORKER", worker.pk)
            notify("PRIMARY_CONTRACTOR", "WORKER_BOUND",
                   f"Worker {worker.full_name} accepted your request", recipient_user=request.user)
            return JsonResponse({"Result": "Consent accepted successfully."})

        if contractor is None:
            return JsonResponse({"Result": "Contractor not found."})

        if action == "24":  # resend request
            binding, _ = Binding.objects.get_or_create(
                binding_type="WORKER_CONTRACTOR", worker=worker, contractor=contractor,
                status="PENDING",
                defaults={"employer": contractor.employer, "site_name": contractor.site_name or ""},
            )
            write_audit(request, "WORKER_REQUEST_RESENT", "WORKER", worker.pk)
            return JsonResponse({"Result": "Request sent to worker successfully."})

        binding, _ = Binding.objects.get_or_create(
            binding_type="WORKER_CONTRACTOR", worker=worker, contractor=contractor,
            status="PENDING",
            defaults={"employer": contractor.employer, "site_name": contractor.site_name or ""},
        )
        write_audit(request, "WORKER_BINDING_REQUEST", "WORKER", worker.pk, new=str(contractor.pk))
        notify("WORKER", "BINDING_REQUEST",
               f"Contractor {contractor.name} requested to bind you", recipient_user=request.user)
        return JsonResponse({"Result": "Request sent to worker successfully."})


@csrf_exempt
def get_worker_job_history(request):
    """POST /api/RetailSection/GetWorkerJobHistory — USP_WorkerJobDetailHistory port."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _body(request)
    worker_code = body.get("WorkerCode") or ""
    rid = _int(body.get("id"))
    qs = JobDetailHistory.objects.all()
    if rid:
        qs = qs.filter(id=rid)
    if worker_code:
        qs = qs.filter(WorkerCode=worker_code)
        if worker_code.isdigit():
            qs = qs.filter(Q(WorkerCode=worker_code) | Q(Loginid=worker_code))
    rows = list(qs.order_by("-id").values()[:100])
    return JsonResponse({"Result": rows, "Message": ""})


@csrf_exempt
def release_worker_by_contractor(request):
    """POST /api/RetailSection/ReleaseWorkerByContractor — ends the worker's
    active binding and records the release reason."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _body(request)
    login_id = _login_id(request)
    worker_code = body.get("WorkerCode") or body.get("EmployeeCode") or ""
    party_id = body.get("Partyid") or body.get("PartyId") or ""
    worker = _worker_by_code(worker_code)
    contractor = Contractor.objects.filter(legacy_party_id=_int(party_id)).first() if party_id else None

    reason = next(
        (k for k in (
            "completionProject", "completionContract", "OtherReason", "fixedTerm",
            "resignation", "transfer", "retirement", "Disciplinary")
         if _to_bool(body.get(k), False)),
        "OtherReason",
    )
    ReleaseWorkerByContractor.objects.create(
        WorkerCode=worker_code,
        Partyid=str(party_id) if party_id else None,
        Userid=str(login_id) if login_id else None,
        CreatedBy=str(login_id) if login_id else None,
        CreatedOn=timezone.now(),
        completionProject=body.get("completionProject"),
        completionContract=body.get("completionContract"),
        OtherReason=body.get("OtherReason"),
        fixedTerm=body.get("fixedTerm"),
        resignation=body.get("resignation"),
        transfer=body.get("transfer"),
        retirement=body.get("retirement"),
        LastDate=body.get("LastDate"),
        Settlement=body.get("Settlement"),
        DuesClear=body.get("DuesClear"),
        Disciplinary=body.get("Disciplinary"),
        Rehiring=body.get("Rehiring"),
        Remarks=body.get("Remarks"),
        flag="1",
    )
    with transaction.atomic():
        if worker:
            Binding.objects.filter(
                binding_type="WORKER_CONTRACTOR", worker=worker, status="ACTIVE"
            ).update(status="ENDED", ended_at=timezone.now())
            Worker.objects.filter(pk=worker.pk).update(contractor=None)
            write_audit(request, "WORKER_RELEASED", "WORKER", worker.pk, new=reason)
        if contractor:
            notify("EMPLOYER", "WORKER_RELEASED",
                   f"Worker {worker_code} released by contractor")
    return JsonResponse({"Result": "Worker released successfully."})


@csrf_exempt
def approve_reject_request(request):
    """POST /api/RetailSection/ApproveorRejectRequest — approve/reject a
    worker-contractor binding request."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _body(request)
    action = str(body.get("Action") or "").upper()
    binding_id = _int(body.get("Id"))
    party_id = _int(body.get("PartyId"))
    worker_code = body.get("WorkerCode") or body.get("EmployeeCode") or ""

    binding = Binding.objects.filter(pk=binding_id).first() if binding_id else None
    if binding is None and worker_code:
        worker = _worker_by_code(worker_code)
        if worker:
            binding = (
                Binding.objects.filter(
                    binding_type="WORKER_CONTRACTOR", worker=worker, status="PENDING"
                ).order_by("-created_at").first()
            )
    if binding is None and party_id:
        binding = (
            Binding.objects.filter(
                binding_type="WORKER_CONTRACTOR", contractor__legacy_party_id=party_id,
                status="PENDING",
            ).order_by("-created_at").first()
        )
    if binding is None:
        return JsonResponse({"Result": "Request not found."})

    if action in ("APPROVE", "1", "ACCEPT", "TRUE"):
        binding.status = "ACTIVE"
        binding.started_at = timezone.now()
        binding.save()
        con = binding.contractor
        if con:
            Worker.objects.filter(pk=binding.worker_id).update(
                contractor=con,
                employer_id=con.employer_id if con.employer_id else binding.employer_id,
            )
            Binding.objects.filter(
                binding_type="WORKER_CONTRACTOR", worker_id=binding.worker_id,
                status="ACTIVE",
            ).exclude(pk=binding.pk).update(status="ENDED", ended_at=timezone.now())
        write_audit(request, "WORKER_REQUEST_APPROVED", "BINDING", binding.pk)
        return JsonResponse({"Result": "Request approved successfully."})

    binding.status = "REJECTED"
    binding.save()
    write_audit(request, "WORKER_REQUEST_REJECTED", "BINDING", binding.pk)
    return JsonResponse({"Result": "Request rejected."})


def _contractor_by_login(login_id, body):
    party_id = _int(body.get("PartyId") or body.get("Id"))
    if party_id:
        return Contractor.objects.filter(legacy_party_id=party_id).first()
    party = (
        PartyMaster.objects.filter(CREATED_BY=login_id)
        .exclude(PartyType__iexact="Client")
        .order_by("-PartyId")
        .first()
    )
    if party:
        return Contractor.objects.filter(legacy_party_id=party.PartyId).first()
    vr = VendorRegistration.objects.filter(LoginId=str(login_id)).order_by("-Id").first()
    if vr and vr.Partyid:
        return Contractor.objects.filter(legacy_party_id=_int(vr.Partyid)).first()
    return None


def _site_row(s):
    return {
        "SiteId": s.SiteId,
        "SiteCode": s.SiteCode or "",
        "SiteName": s.SiteName or "",
        "Address": s.Address or "",
        "City": s.CityID or "",
        "State": s.StateID or "",
        "Pincode": s.Pincode or "",
        "ContactPerson": s.ContactPerson or "",
        "ContactMobile": s.ContactMobile or "",
        "EmailId": s.EmailId or "",
        "ManPowerCount": s.ManPowerCount or "",
        "Manpowertype": s.Manpowertype or "",
        "ValidFrom": s.ValidFrom or "",
        "ValidTo": s.ValidTo or "",
        "IsActive": s.IsActive or "",
    }


def _contractor_sites(con):
    if con is None or not con.legacy_party_id:
        return []
    return [
        _site_row(s)
        for s in LegacySiteManager.objects.filter(PartyID=con.legacy_party_id)[:200]
    ]


def _contractor_profile(con, login_id):
    if con is None:
        return None
    vr = (
        VendorRegistration.objects.filter(Partyid=str(con.legacy_party_id)).order_by("-Id").first()
        if con.legacy_party_id else None
    )
    if vr is None:
        vr = VendorRegistration.objects.filter(LoginId=str(login_id)).order_by("-Id").first()
    party = _party(con.legacy_party_id) if con.legacy_party_id else None

    def g(field):
        return getattr(vr, field, None) if vr else None

    return {
        "PartyId": con.legacy_party_id or "",
        "PartyCode": party.PartyCode if party else (g("PartyCode") or ""),
        "PartyName": con.name,
        "AgencyName": g("AgencyName") or con.name,
        "RegisteredAddress": g("RegisteredAddress") or "",
        "CorporateAddress": g("CorporateAddress") or "",
        "ContactPerson": g("ContactPerson") or (con.contact_mobile or ""),
        "Designation": g("Designation") or "",
        "Mobile": g("Mobile") or (con.contact_mobile or ""),
        "Email": g("Email") or "",
        "Website": g("Website") or "",
        "PanNo": g("PanNo") or "",
        "Tan": g("Tan") or "",
        "GSTIN": g("GSTIN") or "",
        "CIN": g("CIN") or "",
        "SHOPREGI": g("SHOPREGI") or "",
        "MSME": g("MSME") or "",
        "EPFREGNO": g("EPFREGNO") or "",
        "ESICREGNO": g("ESICREGNO") or "",
        "LabourREGNO": g("LabourREGNO") or "",
        "ProfessionalREGNO": g("ProfessionalREGNO") or "",
        "ContractREGNO": g("ContractREGNO") or "",
        "LabourLicenseNO": g("LabourLicenseNO") or "",
        "State": g("State") or "",
        "City": g("City") or "",
        "Pincode": g("Pincode") or "",
        "Country": g("Country") or "",
        "LIN": g("LIN") or "",
        "Industry": g("Industry") or "",
        "LicenseValidity": g("LicenseValidity") or "",
        "LicenseEmployeeCount": g("LicenseEmployeeCount") or "",
    }


def _binding_requests(con, only_pending):
    if con is None:
        return []
    qs = Binding.objects.filter(binding_type="WORKER_CONTRACTOR", contractor=con)
    if only_pending:
        qs = qs.filter(status="PENDING")
    rows = []
    for b in qs[:100]:
        w = b.worker
        rows.append({
            "Id": b.pk,
            "WorkerCode": w.worker_id if w else "",
            "WorkerName": w.full_name if w else "",
            "MobileNumber": w.mobile if w else "",
            "AadhaarNo": w.aadhaar_no if w else "",
            "status": b.status,
            "site_name": b.site_name or "",
            "created_at": b.created_at,
        })
    return rows


@csrf_exempt
def contractor_dashboard(request):
    """POST /api/RetailSection/ContractorDashboard — RTL.ContractorDashboard port.

    Action 1 = dashboard tile, 2 = sites, 4 = profile, 5 = worker certificates,
    6 = worker compliance, 7 = invoice/billing orders, 8 = pending worker requests,
    9 = principle detail, 15 = all worker requests.
    """
    if not request.user.is_authenticated:
        return session_expired()
    body = _body(request)
    login_id = _login_id(request)
    action = str(body.get("Action") or "1")
    con = _contractor_by_login(login_id, body)

    if action == "2":
        return JsonResponse({"Result": _contractor_sites(con), "Message": ""})
    if action == "4":
        row = _contractor_profile(con, login_id)
        return JsonResponse({"Result": [row] if row else [], "Message": ""})
    if action == "5":
        rows = []
        if con:
            workers = list(Worker.objects.filter(contractor=con, is_active=True)[:500])
            total = len(workers)

            def pct(match):
                return round(match / total * 100, 2) if total else 0.0

            pan = sum(1 for w in workers if w.pan_no)
            aadhaar = sum(1 for w in workers if w.aadhaar_no)
            photo = sum(1 for w in workers if w.photo)
            rows.append({
                "TotalEmployee": total,
                "PANCardPercentage": pct(pan),
                "AdhaarFrontPercentage": pct(aadhaar),
                "AdhaarBackPercentage": pct(aadhaar),
                "UANPercentage": pct(aadhaar),
                "Photo1Percentage": pct(photo),
                "Photo2Percentage": pct(photo),
                "Photo3Percentage": pct(photo),
                "Photo4Percentage": pct(photo),
                "ChequePassbookPercentage": 0.0,
                "EducationCertificatePercentage": 0.0,
                "ExperienceCertificatePercentage": 0.0,
                "RelievingLetterPercentage": 0.0,
                "PayslipPercentage": 0.0,
            })
        return JsonResponse({"Result": rows, "Message": ""})
    if action == "6":
        rows = []
        if con:
            workers = list(Worker.objects.filter(contractor=con, is_active=True)[:500])
            rows.append({
                "SiteId": "",
                "SiteName": (con.site_name or "All Sites"),
                "TotalWorker": len(workers),
                "PANVerified": sum(1 for w in workers if w.pan_no),
                "AadhaarVerified": sum(1 for w in workers if w.aadhaar_no),
                "WorkerList": [
                    {
                        "WorkerCode": w.worker_id or "",
                        "WorkerName": w.full_name,
                        "PANNumber": w.pan_no or "",
                        "AdharCardNumber": w.aadhaar_no or "",
                        "mobile": w.mobile or "",
                    }
                    for w in workers
                ],
            })
        return JsonResponse({"Result": rows, "Message": ""})
    if action == "7":
        rows = list(ContractorBillingOrder.objects.filter(IsActive="1").values()[:200])
        return JsonResponse({"Result": rows, "Message": ""})
    if action == "8":
        return JsonResponse({"Result": _binding_requests(con, True), "Message": ""})
    if action == "15":
        return JsonResponse({"Result": _binding_requests(con, False), "Message": ""})
    if action == "9":
        row = None
        if con and con.employer_id:
            e = con.employer
            row = {
                "PartyId": e.legacy_party_id or e.pk,
                "PartyName": e.name,
                "ContactPerson": e.contact_person or "",
                "ContactMobile": e.contact_mobile or "",
                "EmailId": e.email or "",
                "Address": e.address or "",
            }
        return JsonResponse({"Result": [row] if row else [], "Message": ""})

    if con is None:
        return JsonResponse({"Result": [], "Message": ""})
    workers = Worker.objects.filter(contractor=con)
    row = {
        "PartyId": con.legacy_party_id or "",
        "PartyName": con.name,
        "AgencyName": con.name,
        "site_name": con.site_name or "",
        "TotalEmployee": workers.count(),
        "ActiveEmployee": workers.filter(is_active=True).count(),
        "TotalSite": len(_contractor_sites(con)),
        "PendingRequest": len(_binding_requests(con, True)),
        "TotalRequest": len(_binding_requests(con, False)),
    }
    return JsonResponse({"Result": [row], "Message": ""})


def _employer_by_login(login_id, body):
    pid = _int(body.get("Id") or body.get("PartyId"))
    if pid:
        return Employer.objects.filter(legacy_party_id=pid).first()
    party = (
        PartyMaster.objects.filter(PartyType__iexact="Client")
        .filter(Q(CREATED_BY=login_id) | Q(LAST_LOGIN_ID=login_id))
        .order_by("-PartyId")
        .first()
    )
    if party:
        return Employer.objects.filter(legacy_party_id=party.PartyId).first()
    vr = VendorRegistration.objects.filter(LoginId=str(login_id)).order_by("-Id").first()
    if vr and vr.Partyid:
        return Employer.objects.filter(legacy_party_id=_int(vr.Partyid)).first()
    return None


def _employer_sites(emp, party_id):
    qs = LegacySiteManager.objects.all()
    if party_id:
        qs = qs.filter(PartyID=party_id)
    elif emp and emp.legacy_party_id:
        qs = qs.filter(PartyID=emp.legacy_party_id)
    else:
        qs = qs.none()
    return [_site_row(s) for s in qs[:200]]


def _employer_profile(emp, login_id):
    if emp is None:
        return None
    party = _party(emp.legacy_party_id) if emp.legacy_party_id else None
    vr = (
        VendorRegistration.objects.filter(Partyid=str(emp.legacy_party_id)).order_by("-Id").first()
        if emp.legacy_party_id else None
    )
    if vr is None:
        vr = VendorRegistration.objects.filter(LoginId=str(login_id)).order_by("-Id").first()

    def g(field):
        return getattr(vr, field, None) if vr else None

    return {
        "PartyId": emp.legacy_party_id or "",
        "PartyCode": party.PartyCode if party else (g("PartyCode") or ""),
        "PartyName": emp.name,
        "AgencyName": g("AgencyName") or emp.name,
        "ContactPerson": emp.contact_person or (g("ContactPerson") or ""),
        "ContactMobile": emp.contact_mobile or (g("Mobile") or ""),
        "EmailId": emp.email or (g("Email") or ""),
        "Address": emp.address or (g("RegisteredAddress") or ""),
        "Mobile": g("Mobile") or (emp.contact_mobile or ""),
        "Email": g("Email") or emp.email,
        "PanNo": g("PanNo") or "",
        "Tan": g("Tan") or "",
        "GSTIN": g("GSTIN") or "",
        "CIN": g("CIN") or "",
        "LIN": g("LIN") or "",
        "Industry": g("Industry") or "",
        "State": g("State") or "",
        "City": g("City") or "",
        "Pincode": g("Pincode") or "",
        "Country": g("Country") or "",
        "TotalContractor": Contractor.objects.filter(employer=emp).count(),
        "TotalSite": (
            LegacySiteManager.objects.filter(PartyID=emp.legacy_party_id).count()
            if emp.legacy_party_id else 0
        ),
        "TotalWorker": Worker.objects.filter(employer=emp).count(),
    }


@csrf_exempt
def search_principle_employe(request):
    """POST /api/RetailSection/SearchPrincipleEmploye — RTL.PrincipleEmployerCode port."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _body(request)
    login_id = _login_id(request)
    action = str(body.get("Action") or "1")
    party_id = _int(body.get("Id") or body.get("PartyId"))

    if action == "2":
        emp = _employer_by_login(login_id, body)
        return JsonResponse({"Result": _employer_sites(emp, party_id), "Message": ""})
    if action == "12":
        return JsonResponse({"Result": _employer_sites(None, party_id), "Message": ""})
    if action == "10":
        rows = []
        emp = _employer_by_login(login_id, body)
        party_ids = [emp.legacy_party_id] if emp and emp.legacy_party_id else []
        if not party_ids:
            parties = PartyMaster.objects.filter(PartyType__iexact="Client").filter(
                Q(CREATED_BY=login_id) | Q(LAST_LOGIN_ID=login_id)
            )[:20]
            party_ids = [p.PartyId for p in parties]
        for em in EmployeeMaster.objects.filter(PartyId__in=party_ids, IsActive="1")[:300]:
            rows.append({
                "EmployeeCode": em.EmployeeCode or "",
                "EmployeeName": em.EmployeeName or "",
                "MobileNumber": em.MobileNumber or "",
                "AdharCardNumber": em.AdharCardNumber or "",
                "PANNumber": em.PANNumber or "",
                "DOJ": em.DOJ or "",
                "Designation": em.EmployeeDesignation or "",
            })
        return JsonResponse({"Result": rows, "Message": ""})
    if action == "11":
        site = None
        site_id = _int(body.get("SiteId"))
        if site_id:
            site = LegacySiteManager.objects.filter(SiteId=site_id).first()
        elif party_id:
            site = LegacySiteManager.objects.filter(PartyID=party_id).first()
        row = _site_row(site) if site else None
        return JsonResponse({"Result": [row] if row else [], "Message": ""})
    if action in ("9", "14"):
        emp = _employer_by_login(login_id, body)
        row = _employer_profile(emp, login_id)
        return JsonResponse({"Result": [row] if row else [], "Message": ""})
    if action in ("3", "4", "5", "6", "7", "8", "55"):
        return JsonResponse({"Result": [], "Message": ""})

    emp = _employer_by_login(login_id, body)
    row = _employer_profile(emp, login_id)
    return JsonResponse({"Result": [row] if row else [], "Message": ""})


@csrf_exempt
def save_principle_employer(request):
    """POST /api/RetailSection/SavePrincipleEmployer — USP_VendorRegistration port;
    also creates/links the QR Employer + its QR reference."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _body(request)
    login_id = _login_id(request)
    name = (body.get("AgencyName") or body.get("nameofeshtablishment") or "").strip()
    if not name:
        name = (body.get("ContactPerson") or "").strip()
    if not name:
        return JsonResponse({"Result": "Employer name is required."})

    with transaction.atomic():
        emp = None
        pid = _int(body.get("PartyId"))
        if pid:
            emp = Employer.objects.filter(legacy_party_id=pid).first()
        if emp is None:
            emp = Employer.objects.filter(name__iexact=name).first()
        if emp is None:
            emp = Employer(name=name)
            emp.contact_person = body.get("ContactPerson") or ""
            emp.contact_mobile = body.get("Mobile") or body.get("ReMobile") or ""
            emp.email = body.get("Email") or body.get("ReEmail") or ""
            emp.address = body.get("RegisteredAddress") or ""
            emp.save()
        else:
            upd = {}
            if name:
                upd["name"] = name
            if body.get("ContactPerson"):
                upd["contact_person"] = body["ContactPerson"]
            if body.get("Mobile"):
                upd["contact_mobile"] = body["Mobile"]
            if body.get("Email"):
                upd["email"] = body["Email"]
            if body.get("RegisteredAddress"):
                upd["address"] = body["RegisteredAddress"]
            Employer.objects.filter(pk=emp.pk).update(**upd)

        qr = create_qr_for_entity("EMPLOYER", emp.pk)
        VendorRegistration.objects.create(
            AgencyName=name,
            RegisteredAddress=body.get("RegisteredAddress"),
            CorporateAddress=body.get("CorporateAddress"),
            ContactPerson=body.get("ContactPerson"),
            Designation=body.get("Designation"),
            Mobile=body.get("Mobile"),
            Email=body.get("Email"),
            Website=body.get("Website"),
            PanNo=body.get("PanNo"),
            Tan=body.get("Tan"),
            GSTIN=body.get("GSTIN"),
            CIN=body.get("CIN"),
            SHOPREGI=body.get("SHOPREGI"),
            MSME=body.get("MSME"),
            EPFREGNO=body.get("EPFREGNO"),
            ESICREGNO=body.get("ESICREGNO"),
            LabourREGNO=body.get("LabourREGNO"),
            ProfessionalREGNO=body.get("ProfessionalREGNO"),
            Country=body.get("Country"),
            State=body.get("State"),
            City=body.get("City"),
            Pincode=body.get("Pincode"),
            LIN=body.get("LIN"),
            Industry=body.get("Industry"),
            nameofeshtablishment=body.get("nameofeshtablishment"),
            typeofeshtablishment=body.get("typeofeshtablishment"),
            validupto=body.get("validupto"),
            PartyCode=body.get("PartyCode"),
            LoginId=str(login_id) if login_id else None,
            Createdby=str(login_id) if login_id else None,
            CreatedOn=timezone.now(),
        )
        write_audit(request, "PRINCIPLE_EMPLOYER_SAVED", "EMPLOYER", emp.pk)
    return JsonResponse({"Result": "Principle employer saved successfully.", "qr_reference": qr.qr_reference})


@csrf_exempt
def worker_register(request):
    """POST /api/RetailSection/WorkerRegister — create a new worker.

    Writes the worker into the QR Worker table and immediately generates its
    static QR reference (create_qr_for_entity('WORKER', pk)) — the new QR card
    integration. Returns legacy {status:true, Result:...}.
    """
    if not request.user.is_authenticated:
        return session_expired()
    body = _body(request)
    login_id = _login_id(request)
    name = (body.get("EmployeeName") or body.get("Name") or body.get("FullName") or "").strip()
    mobile = (body.get("MobileNumber") or body.get("Mobile") or "").strip()
    aadhaar = (body.get("AdharCardNumber") or body.get("AadhaarNumber") or "").strip()
    pan = (body.get("PANNumber") or body.get("PanNo") or "").strip()
    code = (body.get("EmployeeCode") or "").strip()
    party_id = _int(body.get("PartyId"))
    doj = body.get("DOJ") or ""

    if not name:
        return JsonResponse({"status": False, "Result": "", "Message": "Worker name is required."})

    with transaction.atomic():
        if not code:
            code = f"WRK{timezone.now().strftime('%y%m%d%H%M%S')}"
        worker = Worker.objects.filter(worker_id=code).first()
        if worker is None:
            worker = Worker(
                worker_id=code,
                legacy_employee_code=code,
                full_name=name,
                mobile=mobile or None,
                aadhaar_no=aadhaar or None,
                pan_no=pan or None,
                is_active=True,
            )
            contractor = Contractor.objects.filter(legacy_party_id=party_id).first() if party_id else None
            if contractor:
                worker.contractor = contractor
                worker.employer = contractor.employer
            worker.save()
        else:
            upd = {"full_name": name}
            if mobile:
                upd["mobile"] = mobile
            if aadhaar:
                upd["aadhaar_no"] = aadhaar
            if pan:
                upd["pan_no"] = pan
            if party_id:
                con = Contractor.objects.filter(legacy_party_id=party_id).first()
                if con:
                    upd["contractor"] = con
                    upd["employer"] = con.employer
            Worker.objects.filter(pk=worker.pk).update(**upd)

        qr = create_qr_for_entity("WORKER", worker.pk)
        write_audit(request, "WORKER_REGISTERED", "WORKER", worker.pk, new=code)

        em = EmployeeMaster.objects.filter(EmployeeCode=code).first()
        if em is None:
            em = EmployeeMaster(
                EmployeeCode=code,
                EmployeeName=name,
                MobileNumber=mobile or None,
                AdharCardNumber=aadhaar or None,
                PANNumber=pan or None,
                DOJ=doj or None,
                UserId=_int(login_id),
                PartyId=party_id,
                IsActive="1",
            )
            em.save()

    return JsonResponse({
        "status": True,
        "Result": {
            "id": worker.pk,
            "EmployeeCode": code,
            "WorkerId": worker.worker_id,
            "EmployeeName": worker.full_name,
            "MobileNumber": worker.mobile or "",
            "AdharCardNumber": worker.aadhaar_no or "",
            "PANNumber": worker.pan_no or "",
            "legacy_employee_id": em.Id if em else None,
            "qr_reference": qr.qr_reference,
            "qr_status": qr.status,
            "status": "Active",
        },
        "Message": "Worker registered with QR card.",
    })
