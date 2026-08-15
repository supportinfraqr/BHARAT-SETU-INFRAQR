"""Phase 8 — Business modules ported from legacy ASP.NET controllers.

Ported controllers (data actions):
  * GrievancesController.cs      -> GrievanceMaste / GrievanceCommunication / GrivanceTracking
  * DocumentMasterController.cs  -> USP_Mapping, USP_DocumentMaster, USP_OneTimeDocument,
                                    USP_AuditorCompliance, USP_Conversation, SaveValidation
  * VenInvoiceController.cs      -> EVM.USP_TBL_VENDOR_INVOICE, USP_InvoiceRegister, Usp_Conversation
  * SkillController.cs           -> USP_SkillTrainingProgram (course / module / video)
  * RozgarController.cs          -> RTL.USP_Rozgar, RTL.USP_ApplyJobPost
  * RatingController.cs          -> USP_Rating, USP_AuditorCompliance (GetValues)

Response contract mirrors the rest of the Django port:
  * list actions -> legacy_json_string([{col: value, ...}])   (JSON array text)
  * IUD actions  -> legacy_status_result(scalar)              ({status: True, Result: ...})
"""
import base64
import json
import os
import re
import uuid
from datetime import date, datetime

from django.conf import settings
from django.http import HttpResponse, JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt

from legacy.models import (
    ApplyPostJob,
    AuditorCompliance,
    AuditorComplianceFiles,
    ComplianceMaster,
    ConversationDocument,
    DocumentMaster,
    EmployeeMaster,
    GrievanceCommunication,
    GrievanceMaster,
    GrivanceTracking,
    InvoiceRegister,
    LoginTable,
    Mapping,
    OneTimeDocument,
    OneTimeDocumentRegistration,
    PartyMaster,
    Rating,
    Rozgar,
    SkillModuleVideos,
    SkillTrainingProgram,
    TrainingCourseModule,
    ValidationDocument,
    VendorInvoice,
)

from .views import (
    _int_or_none,
    _login_id,
    _parse_date,
    _request_params,
    _to_bool,
    legacy_json_string,
    legacy_status_result,
    session_expired,
)


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------


def _params(request):
    """Body params for both JSON POST and multipart/form-data POSTs."""
    if getattr(request, "POST", None) and len(request.POST):
        data = {k: v for k, v in request.POST.items()}
        obj = data.pop("obj", None)
        if obj:
            try:
                extra = json.loads(obj)
                if isinstance(extra, dict):
                    data.update(extra)
            except Exception:
                pass
        return data
    return _request_params(request)


def _save_upload_file(upload, subfolder):
    folder = os.path.join(settings.MEDIA_ROOT, subfolder)
    os.makedirs(folder, exist_ok=True)
    ext = os.path.splitext(upload.name or "")[1].lower() or ".bin"
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


def _maybe_file(value, subfolder):
    if value and str(value).startswith("data:"):
        return _save_data_uri(value, subfolder)
    return value


def _tf(value):
    return "true" if _to_bool(value) else "false"


def _parse_datetime(value):
    if not value:
        return None
    d = _parse_date(value)
    if not d:
        return None
    return datetime.combine(d, datetime.min.time()).replace(tzinfo=timezone.get_current_timezone())


def _next_job_no():
    max_id = Rozgar.objects.order_by("-id").values_list("id", flat=True).first() or 0
    return f"{max_id + 1:05d}"


def _next_reg_invoice_no():
    max_id = InvoiceRegister.objects.order_by("-Id").values_list("Id", flat=True).first() or 0
    return f"{max_id + 1:05d}"


# ---------------------------------------------------------------------------
# GrievancesController.cs  (GrievanceMaste stored proc)
# ---------------------------------------------------------------------------


def _grievance_row(g):
    return {
        "Id": g["Id"],
        "LoginId": g["LoginId"],
        "Subject": g["Subject"],
        "AiText": g["AiText"],
        "AudioFileName": g["AudioFileName"],
        "Documents": g["Documents"],
        "CreatedOn": g["CreatedOn"],
        "Status": g["Status"],
        "UpdateOn": g["UpdateOn"],
        "VendorReaction": g["VendorReaction"],
        "ClientReaction": g["ClientReaction"],
        "Letter": g["Letter"],
        "approveletter": g["approveletter"],
        "approvedt": g["approvedt"],
    }


_GRIEVANCE_FIELDS = (
    "Id", "LoginId", "Subject", "AiText", "AudioFileName", "Documents", "CreatedOn",
    "Status", "UpdateOn", "VendorReaction", "ClientReaction", "Letter",
    "approveletter", "approvedt",
)


@csrf_exempt
def grievances_upload_documents(request):
    """POST /api/Grievances/UploadDocuments — create grievance (GrievanceMaste @Action=1)."""
    if not request.user.is_authenticated:
        return session_expired()
    params = _params(request)
    login_id = _int_or_none(params.get("LoginId")) or _login_id(request)

    docs = []
    audio = ""
    if request.FILES:
        for _name, f in request.FILES.items():
            ext = os.path.splitext(f.name or "")[1].lower()
            path = _save_upload_file(f, "GrievancesDocuments")
            if ext in (".webm", ".mp3", ".wav"):
                audio = path
            else:
                docs.append(os.path.basename(path))
    documents = params.get("Documents") or (",".join(docs) if docs else None)

    g = GrievanceMaster.objects.create(
        LoginId=login_id,
        Subject=params.get("Subject"),
        AiText=params.get("AiText"),
        AudioFileName=params.get("AudioFileName") or audio or None,
        Documents=documents,
        CreatedOn=timezone.now(),
        Status="Process Start",
    )
    GrivanceTracking.objects.create(
        GId=g.Id, CreatedOn=timezone.now(), CStatus="Process Start"
    )
    return JsonResponse({"status": True, "Result": str(g.Id)})


def _grievance_mark(grievance_id, status, now):
    g = GrievanceMaster.objects.filter(Id=grievance_id).first()
    if not g:
        return legacy_json_string([{"Message": "0"}])
    if g.Status == status:
        return legacy_json_string([{"Message": "-1"}])
    GrievanceMaster.objects.filter(Id=grievance_id).update(Status=status, UpdateOn=now)
    GrivanceTracking.objects.create(GId=grievance_id, CreatedOn=now, CStatus=status)
    return legacy_json_string([{"Message": "1"}])


@csrf_exempt
def grievances_get(request):
    """POST /api/Grievances/getGrivances — GrievanceMaste SELECT.

    Actions: 5=list by login, 6=detail, 7=mark resolved, 8=reopen, 9=tracking,
    10=tiles, 11=vendor reaction, 12=communication, 13=client reaction, 15=letter."""
    if not request.user.is_authenticated:
        return session_expired()
    params = _params(request)
    action = str(params.get("Action") or "5")
    id_param = _int_or_none(params.get("Id"))
    user_id = (
        _int_or_none(params.get("UserId"))
        or _int_or_none(params.get("LoginId"))
        or _login_id(request)
    )
    gid = _int_or_none(params.get("GId"))
    reaction = params.get("Reaction")
    documents = params.get("Documents")
    now = timezone.now()

    # Action 5/10 use Id as the *login id*; all others use Id as grievance id.
    if action in ("5", "10"):
        login_for_list = id_param or _login_id(request)
    else:
        login_for_list = None
    grievance_id = id_param if action not in ("5", "10", "12") else None

    if action == "12":  # insert communication + return thread
        sender = id_param or _login_id(request)
        receiver = user_id or sender
        if reaction:
            GrievanceCommunication.objects.create(
                Gid=gid, Sender=sender, Receiver=receiver,
                CommunicationText=reaction, IsRead=False, CreatedOn=now,
            )
        rows = list(GrievanceCommunication.objects.filter(Gid=gid).order_by("Id").values(
            "Id", "Gid", "Sender", "Receiver", "CommunicationText", "IsRead", "CreatedOn"))
        return legacy_json_string(rows)

    if action == "9":  # tracking
        rows = list(GrivanceTracking.objects.filter(GId=grievance_id).order_by("Id").values(
            "Id", "GId", "CreatedOn", "CStatus", "Letter", "Reaction"))
        return legacy_json_string(rows)

    if action == "7":
        return _grievance_mark(grievance_id, "Complete", now)
    if action == "8":
        return _grievance_mark(grievance_id, "ReOpen", now)

    if action == "11":  # vendor reaction + letter upload
        g = GrievanceMaster.objects.filter(Id=grievance_id).first()
        if not g:
            return legacy_json_string([{"Message": "0"}])
        letter = g.Letter
        if documents and str(documents).startswith("data:"):
            letter = _save_data_uri(documents, "Grievance")
        GrievanceMaster.objects.filter(Id=grievance_id).update(
            VendorReaction=reaction,
            Letter=letter or None,
            Documents=documents if not str(documents or "").startswith("data:") else g.Documents,
            UpdateOn=now,
            Status="Contractor Reply",
        )
        GrivanceTracking.objects.create(
            GId=grievance_id, CreatedOn=now, CStatus="Contractor Reply",
            Letter=letter, Reaction=reaction,
        )
        return legacy_json_string([{"Message": "1"}])

    if action == "13":  # client reaction
        g = GrievanceMaster.objects.filter(Id=grievance_id).first()
        if not g:
            return legacy_json_string([{"Message": "0"}])
        GrievanceMaster.objects.filter(Id=grievance_id).update(
            ClientReaction=reaction, UpdateOn=now, Status="Principle Reply")
        GrivanceTracking.objects.create(
            GId=grievance_id, CreatedOn=now, CStatus="Principle Reply", Reaction=reaction)
        return legacy_json_string([{"Message": "1"}])

    if action == "10":  # dashboard tiles
        qs = GrievanceMaster.objects.all()
        if login_for_list:
            qs = qs.filter(LoginId=login_for_list)
        tracks = {t.GId: t for t in GrivanceTracking.objects.order_by("-Id")}
        rows = []
        for g in qs.order_by("-Id")[:500]:
            t = tracks.get(g.Id)
            rows.append({
                "Id": g.Id,
                "LoginId": g.LoginId,
                "Subject": g.Subject,
                "AiText": g.AiText,
                "CreatedOn": g.CreatedOn,
                "Status": g.Status,
                "CStatus": (t.CStatus if t else None) or g.Status or "",
            })
        return legacy_json_string(rows)

    if action == "6":  # grievance detail
        rows = list(GrievanceMaster.objects.filter(Id=grievance_id).values(*_GRIEVANCE_FIELDS))
        return legacy_json_string(rows)

    if action == "15":  # view letter
        g = GrievanceMaster.objects.filter(Id=grievance_id).first()
        if not g:
            return legacy_json_string([])
        return legacy_json_string([{
            "Id": g.Id,
            "Subject": g.Subject,
            "Details": g.AiText or g.Subject or "",
            "Letter": g.Letter,
            "Status": g.Status,
            "CreatedOn": g.CreatedOn,
        }])

    # default Action 5 — list grievances by login
    qs = GrievanceMaster.objects.all()
    if login_for_list:
        qs = qs.filter(LoginId=login_for_list)
    rows = list(qs.order_by("-Id")[:500].values(*_GRIEVANCE_FIELDS))
    return legacy_json_string(rows)


@csrf_exempt
def grievances_approve_letter(request):
    """POST /api/Grievances/ApproveLetter — GrievanceMaste @Action=14."""
    if not request.user.is_authenticated:
        return session_expired()
    params = _params(request)
    grievance_id = _int_or_none(params.get("Id"))
    g = GrievanceMaster.objects.filter(Id=grievance_id).first()
    if not g:
        return HttpResponse(json.dumps("0"), content_type="application/json")
    GrievanceMaster.objects.filter(Id=grievance_id).update(
        approveletter=1, approvedt=date.today(), UpdateOn=timezone.now())
    return HttpResponse(json.dumps("1"), content_type="application/json")


# ---------------------------------------------------------------------------
# DocumentMasterController.cs  (USP_Mapping, USP_DocumentMaster, USP_OneTimeDocument,
# USP_AuditorCompliance, USP_Conversation, SaveValidation)
# ---------------------------------------------------------------------------


@csrf_exempt
def document_get_mapping(request):
    """POST /api/DocumentMaster/GetMapping — USP_Mapping select."""
    if not request.user.is_authenticated:
        return session_expired()
    rows = list(Mapping.objects.order_by("Id").values(
        "Id", "Sno", "ClientId", "ClientSiteId", "VendorId", "AuditorId", "Createdby"))
    return legacy_json_string(rows)


@csrf_exempt
def document_insert_update_del_mapping(request):
    """POST /api/DocumentMaster/InsertUpdateDelMapping — USP_Mapping IUD."""
    if not request.user.is_authenticated:
        return session_expired()
    params = _params(request)
    action = str(params.get("Action") or "1")
    created_by = _int_or_none(params.get("Createdby")) or _login_id(request)
    items = params.get("MapListSet") or []
    if isinstance(items, str):
        try:
            items = json.loads(items)
        except Exception:
            items = []
    if not isinstance(items, list):
        return legacy_status_result("0")
    for item in items:
        if not isinstance(item, dict):
            continue
        mid = _int_or_none(item.get("Id"))
        data = {
            "Sno": _int_or_none(item.get("Srno")),
            "ClientId": _int_or_none(item.get("ClientId")),
            "ClientSiteId": _int_or_none(item.get("ClientSiteId")),
            "VendorId": _int_or_none(item.get("VendorId")),
            "AuditorId": _int_or_none(item.get("AuditorId")),
            "Createdby": _int_or_none(item.get("Createdby")) or created_by,
        }
        if action == "2" and mid:
            Mapping.objects.filter(Id=mid).update(**data)
        elif action == "3" and mid:
            Mapping.objects.filter(Id=mid).delete()
        else:
            Mapping.objects.create(**data)
    return legacy_status_result("1")


@csrf_exempt
def document_verify_map(request):
    """POST /api/DocumentMaster/VerifyMap — USP_Mapping verify/create."""
    if not request.user.is_authenticated:
        return session_expired()
    params = _params(request)
    Mapping.objects.create(
        ClientId=_int_or_none(params.get("ClientId")),
        ClientSiteId=_int_or_none(params.get("ClientSiteId")),
        VendorId=_int_or_none(params.get("VendorId")),
        AuditorId=_int_or_none(params.get("AuditorId")),
        Createdby=_login_id(request),
    )
    return legacy_status_result("1")


@csrf_exempt
def document_get_master(request):
    """POST /api/DocumentMaster/GetDocumentMaster — USP_DocumentMaster select."""
    if not request.user.is_authenticated:
        return session_expired()
    params = _params(request)
    qs = DocumentMaster.objects.all()
    doc_id = params.get("Id")
    if doc_id:
        qs = qs.filter(Id=doc_id)
    rows = list(qs.order_by("Id").values(
        "Id", "DocumentName", "Oid", "DocumentType", "Frequency", "FormatType", "Note",
        "IsDefault", "CreatedOn", "Createdby", "Updatedby", "UpdatedON", "Isdelete",
        "FormNo", "StateId", "Criticality", "Act"))
    return legacy_json_string(rows)


@csrf_exempt
def document_iud_master(request):
    """POST /api/DocumentMaster/IUDDocumentMaster — USP_DocumentMaster IUD."""
    if not request.user.is_authenticated:
        return session_expired()
    params = _params(request)
    action = str(params.get("Action") or "1")
    doc_id = _int_or_none(params.get("Id"))
    login = _login_id(request)
    created_by = params.get("Createdby") or (str(login) if login else None)
    data = {
        "DocumentName": params.get("DocumentName"),
        "DocumentType": params.get("DocumentType"),
        "Frequency": params.get("Frequency"),
        "FormatType": params.get("FormatType"),
        "Note": params.get("Note"),
        "IsDefault": _to_bool(params.get("IsDefault")),
        "Act": params.get("Act"),
        "FormNo": params.get("FormNo"),
        "Criticality": params.get("Criticality"),
        "StateId": params.get("StateId"),
        "Updatedby": params.get("Updatedby") or (str(login) if login else None),
        "UpdatedON": timezone.now(),
    }
    if action == "2" and doc_id:
        DocumentMaster.objects.filter(Id=doc_id).update(**data)
        return legacy_status_result(str(doc_id))
    if action == "3" and doc_id:
        DocumentMaster.objects.filter(Id=doc_id).update(
            Isdelete=True, Updatedby=params.get("Updatedby") or (str(login) if login else None),
            UpdatedON=timezone.now())
        return legacy_status_result("1")
    row = DocumentMaster.objects.create(
        CreatedOn=timezone.now(), Createdby=created_by, **data)
    return legacy_status_result(str(row.Id))


@csrf_exempt
def document_save_validation(request):
    """POST /api/DocumentMaster/VIUDDocumentMaster — SaveValidation (USP_DocumentMaster @Action=11)."""
    if not request.user.is_authenticated:
        return session_expired()
    params = _params(request)
    doc_id = _int_or_none(params.get("Id"))
    items = params.get("ValidationList") or []
    if isinstance(items, str):
        try:
            items = json.loads(items)
        except Exception:
            items = []
    if not isinstance(items, list):
        return legacy_status_result("0")
    ValidationDocument.objects.filter(DocumentId=doc_id).delete()
    for item in items:
        if not isinstance(item, dict):
            continue
        ValidationDocument.objects.create(
            DocumentId=doc_id,
            ValdationId=str(item.get("Col1") or ""),
            Value=str(item.get("Col2") or ""),
        )
    return legacy_status_result("1")


@csrf_exempt
def document_get_one_time(request):
    """POST /api/DocumentMaster/GetOneTimeDocumentMaster — USP_OneTimeDocument select."""
    if not request.user.is_authenticated:
        return session_expired()
    params = _params(request)
    qs = OneTimeDocument.objects.all()
    doc_id = params.get("Id")
    if doc_id:
        qs = qs.filter(Id=doc_id)
    rows = list(qs.order_by("Orderby").values(
        "Id", "DocumentName", "PartyType", "AllowExpire", "AllowFileUpload",
        "CreatedOn", "Createdby", "Updatedby", "UpdatedON", "Isdelete", "Orderby"))
    return legacy_json_string(rows)


@csrf_exempt
def document_iud_one_time(request):
    """POST /api/DocumentMaster/IUDOneTimeDocumentMaster — USP_OneTimeDocument registration IUD."""
    if not request.user.is_authenticated:
        return session_expired()
    params = _params(request)
    action = str(params.get("Action") or "1")
    doc_id = _int_or_none(params.get("Id"))
    login = _login_id(request)
    file_doc = _maybe_file(params.get("FileDoc"), "ProfileDoc")
    data = {
        "DocumentId": doc_id,
        "UserId": login,
        "FileDoc": file_doc,
        "Description": params.get("Description"),
        "VaildFrom": _parse_datetime(params.get("VaildFrom")),
        "VaildTo": _parse_datetime(params.get("VaildTo")),
        "Updatedby": params.get("Updatedby") or (str(login) if login else None),
        "UpdatedON": timezone.now(),
    }
    reg = OneTimeDocumentRegistration.objects.filter(
        DocumentId=doc_id, UserId=login).first()
    if action == "2" and reg:
        OneTimeDocumentRegistration.objects.filter(Id=reg.Id).update(**data)
        return legacy_status_result(str(reg.Id))
    if action == "3" and reg:
        OneTimeDocumentRegistration.objects.filter(Id=reg.Id).update(
            Isdelete=True, UpdatedON=timezone.now())
        return legacy_status_result("1")
    row = OneTimeDocumentRegistration.objects.create(
        CreatedOn=timezone.now(),
        Createdby=params.get("Createdby") or (str(login) if login else None),
        Status=1,
        **data,
    )
    return legacy_status_result(str(row.Id))


@csrf_exempt
def document_iud_compliance_master(request):
    """POST /api/DocumentMaster/IUDComplianceMaster — USP_AuditorCompliance (compliancemaster IUD)."""
    if not request.user.is_authenticated:
        return session_expired()
    params = _params(request)
    action = str(params.get("Action") or "1")
    cid = _int_or_none(params.get("Id"))
    data = {
        "Act": params.get("Act"),
        "Form": params.get("Form"),
        "Nature": params.get("Nature"),
        "REMARK": params.get("Remark"),
        "Score": params.get("Score"),
    }
    if action == "2" and cid:
        ComplianceMaster.objects.filter(Id=cid).update(**data)
        return legacy_status_result(str(cid))
    if action == "3" and cid:
        ComplianceMaster.objects.filter(Id=cid).delete()
        return legacy_status_result("1")
    row = ComplianceMaster.objects.create(**data)
    return legacy_status_result(str(row.Id))


@csrf_exempt
def document_get_auditor_compliance(request):
    """POST /api/DocumentMaster/GetAuditorCompliance — USP_AuditorCompliance select."""
    if not request.user.is_authenticated:
        return session_expired()
    params = _params(request)
    qs = AuditorCompliance.objects.all()
    if params.get("InvoiceNo"):
        qs = qs.filter(InvoiceNo=params.get("InvoiceNo"))
    if params.get("VendorId"):
        qs = qs.filter(ClientId=_int_or_none(params.get("VendorId")))
    if params.get("Id"):
        qs = qs.filter(Id=_int_or_none(params.get("Id")))
    rows = list(qs.order_by("SNO").values(
        "Id", "SNO", "InvoiceNo", "ComplianceId", "ActId", "ClientId", "Form",
        "ComlianceScore", "ComplianceScoreAchieved", "CompalianceStatus",
        "Remark", "VendorRemark", "Createdby", "CreatedOn", "UpdatedOn",
        "Updatedby", "Status"))
    return legacy_json_string(rows)


@csrf_exempt
def document_iud_auditor_compliance(request):
    """POST /api/DocumentMaster/InsertUpdateDelAuditorCompliance — USP_AuditorCompliance IUD."""
    if not request.user.is_authenticated:
        return session_expired()
    params = _params(request)
    action = str(params.get("Action") or "1")
    inv_no = params.get("InvoiceNo")
    client_id = _int_or_none(params.get("ClientId"))
    login = _login_id(request)
    items = params.get("ComplianceDetail") or []
    if isinstance(items, str):
        try:
            items = json.loads(items)
        except Exception:
            items = []
    if not isinstance(items, list):
        return legacy_status_result("0")
    for item in items:
        if not isinstance(item, dict):
            continue
        doc_id = _int_or_none(item.get("DocId"))
        data = {
            "InvoiceNo": item.get("InvoiceNo") or inv_no,
            "ComplianceId": item.get("ComplianceId"),
            "ClientId": _int_or_none(item.get("ClientId")) or client_id,
            "Form": item.get("Form"),
            "SNO": _int_or_none(item.get("SrNo")),
            "ComlianceScore": item.get("ComplianceScore"),
            "ComplianceScoreAchieved": item.get("ComplianceScoreAchieved"),
            "CompalianceStatus": _int_or_none(item.get("CompalianceStatus")),
            "Remark": item.get("Remark"),
            "VendorRemark": item.get("VendorRemark"),
            "Createdby": str(login) if login else None,
        }
        if action == "2" and doc_id:
            AuditorCompliance.objects.filter(Id=doc_id).update(
                UpdatedOn=timezone.now(), Updatedby=str(login) if login else None, **data)
        elif action == "3" and doc_id:
            AuditorCompliance.objects.filter(Id=doc_id).delete()
        else:
            AuditorCompliance.objects.create(CreatedOn=timezone.now(), **data)
    return legacy_status_result("1")


@csrf_exempt
def document_iud_auditor_compliance_query(request):
    """POST /api/DocumentMaster/IUDAuditorComplianceQUERY — USP_AuditorCompliance query files IUD."""
    if not request.user.is_authenticated:
        return session_expired()
    params = _params(request)
    action = str(params.get("Action") or "1")
    inv_no = params.get("InvoiceNo")
    compliance_id = params.get("ComplianceId")
    vendor_query = params.get("VendorQuery")
    auditor_query = _maybe_file(params.get("AuditorQuery"), "AVQuery")
    remark = params.get("Remark")
    row = AuditorComplianceFiles.objects.filter(
        InvoiceNo=inv_no, ComplianceId=compliance_id).order_by("-Id").first()
    if action == "2" and row:
        AuditorComplianceFiles.objects.filter(Id=row.Id).update(
            RejectOn=None, VendorQuery=vendor_query, AuditorQuery=auditor_query,
            Remark=remark, Status=1)
        return legacy_status_result("1")
    if action == "3" and row:
        AuditorComplianceFiles.objects.filter(Id=row.Id).update(
            Status=0, RejectOn=timezone.now())
        return legacy_status_result("1")
    AuditorComplianceFiles.objects.create(
        InvoiceNo=inv_no, ComplianceId=compliance_id, VendorQuery=vendor_query,
        AuditorQuery=auditor_query, Remark=remark, Status=1, Createdon=timezone.now())
    return legacy_status_result("1")


@csrf_exempt
def document_update_auditor_compliance(request):
    """POST /api/DocumentMaster/updateAuditorCompliance — mark compliance done."""
    if not request.user.is_authenticated:
        return session_expired()
    params = _params(request)
    AuditorCompliance.objects.filter(
        InvoiceNo=params.get("InvoiceNo"),
        ComplianceId=params.get("ComplianceId")).update(
        Status=1, UpdatedOn=timezone.now())
    return legacy_status_result("1")


# ---------------------------------------------------------------------------
# VenInvoiceController.cs  (EVM.USP_TBL_VENDOR_INVOICE, USP_InvoiceRegister, Usp_Conversation)
# ---------------------------------------------------------------------------


_VEN_INVOICE_FIELDS = (
    "VENDOR_INV_ID", "VENDOR_INV_NUM", "DESCRIPTION", "VENDOR_ID", "VENDOR_SITE_ID",
    "VENDOR_PARTY_TYPE_ID", "INV_DATE", "INV_AMOUNT", "AUDIT_ID", "AUDIT_SITE_ID",
    "AUDIT_PARTY_TYPE_ID", "CUSTOMER_ID", "CUSTOMER_SITE_ID", "CUSTOMER_PARTY_TYPE_ID",
    "VENDOR_REMARKS", "CUSTOMER_REMARKS", "AUDIT_REMARKS", "STATUS",
    "AUDIT_APPROVE_DATE", "DOCUMENT_ID", "END_DATE", "LAST_LOGIN_ID", "CREATED_BY",
    "LAST_UPDATE_BY", "LAST_UPDATE_DATE", "CREATION_DATE", "ACTIVE_DATE",
    "ATTRIBUTE1", "ATTRIBUTE2", "ATTRIBUTE3", "ATTRIBUTE4", "ATTRIBUTE5",
    "ATTRIBUTE6", "ATTRIBUTE7", "ATTRIBUTE8", "IsActive", "IsDeleted",
)

_INVOICE_REGISTER_FIELDS = (
    "Id", "InvoiceId", "RegInvoiceNo", "Sno", "VendorInvNum", "ClientId",
    "ClientSiteId", "FYID", "Month", "InvDate", "StateId", "Location",
    "ManpowerType", "ManpowerCount", "InvoiceType", "CGST", "SGST", "IGST",
    "TaxableValue", "GrossAmount", "VendorId", "VendorSiteId", "fileupload",
    "Status", "MapId", "Createdby", "CreatedOn", "Updatedby", "UpdatedOn",
    "Isdelete", "IsFlag", "TypeInvoice", "WIEndDate", "RTimeMinute", "RTimeHour",
)


@csrf_exempt
def invoice_get_ven_list(request):
    """POST /api/VenInvoice/GetVenInvoiceListDT — EVM.USP_TBL_VENDOR_INVOICE select."""
    if not request.user.is_authenticated:
        return session_expired()
    params = _params(request)
    qs = VendorInvoice.objects.all()
    if params.get("PartyID"):
        qs = qs.filter(VENDOR_ID=str(params.get("PartyID")))
    rows = list(qs.order_by("-VENDOR_INV_ID")[:500].values(*_VEN_INVOICE_FIELDS))
    return legacy_json_string(rows)


@csrf_exempt
def invoice_get_list(request):
    """POST /api/VenInvoice/GetInvoiceList — USP_InvoiceRegister select."""
    if not request.user.is_authenticated:
        return session_expired()
    params = _params(request)
    qs = InvoiceRegister.objects.all()
    if params.get("InvoiceId"):
        qs = qs.filter(InvoiceId=params.get("InvoiceId"))
    if params.get("CreatedBy"):
        qs = qs.filter(Createdby=str(params.get("CreatedBy")))
    rows = list(qs.order_by("-Id")[:500].values(*_INVOICE_REGISTER_FIELDS))
    return legacy_json_string(rows)


@csrf_exempt
def invoice_approve_upload_doc(request):
    """POST /api/VenInvoice/ApproveUploadDoc — Usp_Conversation approve."""
    if not request.user.is_authenticated:
        return session_expired()
    params = _params(request)
    ConversationDocument.objects.filter(
        ConversationId=params.get("ConversationId"),
        InvoiceNo=params.get("InvoiceNo")).update(
        Status=1, UpdatedOn=timezone.now(),
        Updatedby=str(_login_id(request)) if _login_id(request) else None)
    return legacy_status_result("1")


@csrf_exempt
def invoice_set_invoice_date(request):
    """POST /api/VenInvoice/SetINVOICEDATE — USP_InvoiceRegister date grid select."""
    if not request.user.is_authenticated:
        return session_expired()
    params = _params(request)
    qs = InvoiceRegister.objects.all()
    if params.get("FYID"):
        qs = qs.filter(FYID=params.get("FYID"))
    if params.get("Month"):
        qs = qs.filter(Month=str(params.get("Month")))
    rows = list(qs.order_by("-Id")[:500].values(*_INVOICE_REGISTER_FIELDS))
    return legacy_json_string(rows)


@csrf_exempt
def invoice_validate(request):
    """POST /api/VenInvoice/GetValidateInvoice — USP_InvoiceRegister duplicate check."""
    if not request.user.is_authenticated:
        return session_expired()
    params = _params(request)
    qs = InvoiceRegister.objects.all()
    if params.get("InvDate"):
        qs = qs.filter(InvDate=params.get("InvDate"))
    if params.get("VendorInvNum"):
        qs = qs.filter(VendorInvNum=params.get("VendorInvNum"))
    if params.get("VendorId"):
        qs = qs.filter(VendorId=str(params.get("VendorId")))
    rows = list(qs.order_by("-Id")[:200].values(*_INVOICE_REGISTER_FIELDS))
    return legacy_json_string(rows)


@csrf_exempt
def invoice_upload_doc(request):
    """POST /api/VenInvoice/UploadDoc — EVM.USP_TBL_VENDOR_INVOICE document upload."""
    if not request.user.is_authenticated:
        return session_expired()
    params = _params(request)
    file_doc = _maybe_file(params.get("FileDoc") or params.get("DocumentFile"), "Doc")
    row = ConversationDocument.objects.create(
        ConversationId=params.get("ConversationId"),
        SNo=_int_or_none(params.get("SNO")),
        InvoiceNo=params.get("InvoiceId") or params.get("InvoiceNo"),
        DocumentName=params.get("DocumentName"),
        DocumentId=_int_or_none(params.get("DocumentId")),
        DocumentFile=file_doc,
        Status=0,
        APercentage=params.get("Percentage"),
        Detail=params.get("Detail"),
        UpdatedOn=timezone.now(),
        Updatedby=str(_login_id(request)) if _login_id(request) else None,
    )
    return legacy_status_result(str(row.Id))


def _invoice_iud(params):
    """Shared USP_InvoiceRegister IUD core (used by JSON + multipart entry points)."""
    action = str(params.get("Action") or "1")
    inv_id = params.get("InvoiceId")
    client_id = params.get("ClientId")
    client_site = params.get("ClientSiteId")
    fyid = params.get("FYID")
    month = params.get("Month")
    created_by = params.get("CreatedBy") or str(_login_id(params.get("_request")))
    items = params.get("InvoiceDetail") or []
    if isinstance(items, str):
        try:
            items = json.loads(items)
        except Exception:
            items = []
    if not isinstance(items, list):
        return legacy_status_result("0")
    if action == "3":
        InvoiceRegister.objects.filter(InvoiceId=inv_id).update(
            Isdelete=1, UpdatedOn=timezone.now(), Updatedby=created_by)
        return legacy_status_result("1")
    for item in items:
        if not isinstance(item, dict):
            continue
        inv_num = item.get("VendorInvNum")
        reg = None
        if inv_id and inv_num:
            reg = InvoiceRegister.objects.filter(
                InvoiceId=inv_id, VendorInvNum=inv_num).first()
        data = {
            "InvoiceId": inv_id,
            "RegInvoiceNo": _next_reg_invoice_no(),
            "Sno": _int_or_none(item.get("Srno")),
            "VendorInvNum": inv_num,
            "ClientId": client_id,
            "ClientSiteId": client_site,
            "FYID": fyid,
            "Month": month,
            "InvDate": item.get("InvDate"),
            "StateId": item.get("StateId"),
            "Location": item.get("Location"),
            "ManpowerType": item.get("ManpowerType"),
            "ManpowerCount": item.get("ManpowerCount"),
            "InvoiceType": item.get("InvoiceType"),
            "TaxableValue": item.get("TaxableValue"),
            "CGST": item.get("CGST"),
            "SGST": item.get("SGST"),
            "IGST": item.get("IGST"),
            "GrossAmount": item.get("GrossAmount"),
            "VendorId": item.get("VendorId") or params.get("Vendor"),
            "VendorSiteId": item.get("VendorSiteId") or params.get("VendorSiteId"),
            "fileupload": _maybe_file(item.get("fileupload"), "Doc"),
            "Status": item.get("Status") or "1",
            "Createdby": created_by,
            "Updatedby": created_by,
            "Isdelete": 0,
        }
        if action == "2" and reg:
            InvoiceRegister.objects.filter(Id=reg.Id).update(UpdatedOn=timezone.now(), **data)
        else:
            InvoiceRegister.objects.create(CreatedOn=timezone.now(), **data)
    return legacy_status_result("1")


@csrf_exempt
def invoice_iud(request):
    """POST /api/VenInvoice/InsertUpdateDelVenInvoice — USP_InvoiceRegister IUD."""
    if not request.user.is_authenticated:
        return session_expired()
    params = _params(request)
    params["_request"] = request
    return _invoice_iud(params)


@csrf_exempt
def invoice_iud_without_ven(request):
    """POST /api/VenInvoice/InsertUpdateDelWithoutVenInvoice — USP_InvoiceRegister (no vendor)."""
    if not request.user.is_authenticated:
        return session_expired()
    params = _params(request)
    action = str(params.get("Action") or "1")
    client_id = params.get("ClientId")
    created_by = params.get("CreatedBy") or str(_login_id(request))
    data = {
        "ClientId": client_id,
        "ClientSiteId": params.get("ClientSiteId"),
        "StateId": params.get("StateId"),
        "FYID": params.get("FYID"),
        "Month": params.get("Month"),
        "TypeInvoice": params.get("TypeInvoice"),
        "Location": params.get("Location"),
        "InvDate": params.get("InvDate"),
        "Createdby": created_by,
        "Updatedby": created_by,
        "Isdelete": 0,
    }
    if action == "2":
        InvoiceRegister.objects.filter(
            ClientId=client_id, TypeInvoice=params.get("TypeInvoice")).update(
            UpdatedOn=timezone.now(), **data)
        return legacy_status_result("1")
    if action == "3":
        InvoiceRegister.objects.filter(
            ClientId=client_id, TypeInvoice=params.get("TypeInvoice")).update(
            Isdelete=1, UpdatedOn=timezone.now())
        return legacy_status_result("1")
    row = InvoiceRegister.objects.create(CreatedOn=timezone.now(), **data)
    return legacy_status_result(str(row.Id))


@csrf_exempt
def invoice_new_iud(request):
    """POST /api/VenInvoice/NewInsertUpdateDelVenInvoice — multipart invoice IUD."""
    if not request.user.is_authenticated:
        return session_expired()
    params = _params(request)
    items = []
    for key, value in request.POST.items():
        if key.startswith("InvoiceDetail") and value:
            try:
                obj = json.loads(value)
                if isinstance(obj, dict):
                    items.append(obj)
            except Exception:
                continue
    if request.FILES:
        for file_key, f in request.FILES.items():
            m = re.match(r"files\[(\d+)\]", file_key)
            if m:
                idx = int(m.group(1))
                if idx < len(items):
                    items[idx]["fileupload"] = _save_upload_file(f, "Doc")
    params["InvoiceDetail"] = items
    params["_request"] = request
    return _invoice_iud(params)


# ---------------------------------------------------------------------------
# SkillController.cs  (USP_SkillTrainingProgram)
# ---------------------------------------------------------------------------


_SKILL_COURSE_FIELDS = (
    "id", "isflag", "Title", "CourseDesc", "CourseCoverPage", "Loginid",
    "CreatedOn", "CreatedBy", "Lessonorder", "VideoOrder", "OnlyPublished",
    "AutoCertificate", "BroserVisibility", "MobileVisibility", "Status",
)

_SKILL_MODULE_FIELDS = (
    "id", "CourseId", "Modulename", "ModuleDesc", "Sequence", "Publish",
    "Loginid", "CreatedBy", "CreatedOn", "Thumbnail",
)

_SKILL_VIDEO_FIELDS = (
    "id", "CourseId", "moduleid", "Title", "Description", "Thumbnail",
    "Videos", "Loginid", "CreatedOn", "Status",
)


@csrf_exempt
def skill_add_course(request):
    """POST /api/Skill/AddCourse — USP_SkillTrainingProgram IUD.

    Actions: 1=insert course, 2=insert module, 3=module thumbnail,
    6=delete video, 10=delete course, 12=module publish, 15=course publish."""
    if not request.user.is_authenticated:
        return session_expired()
    params = _params(request)
    action = str(params.get("Action") or "1")
    login = _int_or_none(params.get("Loginid")) or _login_id(request)
    cid = _int_or_none(params.get("CourseId"))
    rid = _int_or_none(params.get("id"))
    cover = _maybe_file(params.get("CourseCoverPage_Preview"), "Skill")

    if action == "1":
        row = SkillTrainingProgram.objects.create(
            Title=params.get("Title"),
            CourseDesc=params.get("CourseDesc"),
            CourseCoverPage=cover,
            Loginid=login,
            CreatedBy=login,
            CreatedOn=timezone.now(),
            isflag=False,
            Status="1",
        )
        return legacy_status_result(str(row.id))
    if action == "2":
        row = TrainingCourseModule.objects.create(
            CourseId=cid,
            Modulename=params.get("Modulename"),
            ModuleDesc=params.get("ModuleDesc"),
            Sequence=params.get("Sequence"),
            Publish=_to_bool(params.get("Publish")),
            Loginid=login,
            CreatedBy=login,
            CreatedOn=timezone.now(),
        )
        return legacy_status_result(str(row.id))
    if action == "3":
        if rid:
            TrainingCourseModule.objects.filter(id=rid).update(Thumbnail=cover)
        return legacy_status_result("1")
    if action == "6":
        if rid:
            SkillModuleVideos.objects.filter(id=rid).delete()
        return legacy_status_result("1")
    if action == "10":
        target = cid or rid
        if target:
            SkillTrainingProgram.objects.filter(id=target).delete()
            TrainingCourseModule.objects.filter(CourseId=target).delete()
            SkillModuleVideos.objects.filter(CourseId=target).delete()
        return legacy_status_result("1")
    if action == "12":
        if cid:
            TrainingCourseModule.objects.filter(id=cid).update(
                Publish=_to_bool(params.get("Publish")))
        return legacy_status_result("1")
    if action == "15":
        if cid:
            SkillTrainingProgram.objects.filter(id=cid).update(
                Status="1" if _to_bool(params.get("Publish")) else "0")
        return legacy_status_result("1")
    return legacy_status_result("0")


@csrf_exempt
def skill_update_flags(request):
    """POST /api/Skill/UpdateFlags — USP_SkillTrainingProgram @Action=7 course flags."""
    if not request.user.is_authenticated:
        return session_expired()
    params = _params(request)
    cid = _int_or_none(params.get("id"))
    if cid:
        SkillTrainingProgram.objects.filter(id=cid).update(
            Lessonorder=_tf(params.get("Lessonorder")),
            VideoOrder=_tf(params.get("VideoOrder")),
            OnlyPublished=_tf(params.get("OnlyPublished")),
            AutoCertificate=_tf(params.get("AutoCertificate")),
            BroserVisibility=_tf(params.get("BroserVisibility")),
            MobileVisibility=_tf(params.get("MobileVisibility")),
        )
    return legacy_status_result("1")


@csrf_exempt
def skill_get_course_detail(request):
    """POST /api/Skill/GetCourseDetail — USP_SkillTrainingProgram select.

    Actions: 4=modules of course, 9=course detail, 11=user courses,
    13=videos of module, 16=worker album, 17=worker module album, 18=videos of course."""
    if not request.user.is_authenticated:
        return session_expired()
    params = _params(request)
    action = str(params.get("Action") or "4")
    login = _int_or_none(params.get("Loginid")) or _login_id(request)
    cid = _int_or_none(params.get("CourseId"))
    rid = _int_or_none(params.get("id"))

    if action == "4":
        rows = list(TrainingCourseModule.objects.filter(CourseId=cid).order_by("Sequence")
                    .values(*_SKILL_MODULE_FIELDS))
        return legacy_json_string(rows)
    if action == "9":
        rows = list(SkillTrainingProgram.objects.filter(id=cid).values(*_SKILL_COURSE_FIELDS))
        return legacy_json_string(rows)
    if action == "11":
        rows = list(SkillTrainingProgram.objects.filter(Loginid=login).order_by("-id")
                    .values(*_SKILL_COURSE_FIELDS))
        return legacy_json_string(rows)
    if action == "13":
        rows = list(SkillModuleVideos.objects.filter(moduleid=rid).order_by("id")
                    .values(*_SKILL_VIDEO_FIELDS))
        return legacy_json_string(rows)
    if action == "16":
        rows = list(SkillTrainingProgram.objects.filter(Loginid=login, Status="1")
                    .order_by("-id").values(*_SKILL_COURSE_FIELDS))
        return legacy_json_string(rows)
    if action == "17":
        rows = list(TrainingCourseModule.objects.filter(CourseId=rid).order_by("Sequence")
                    .values(*_SKILL_MODULE_FIELDS))
        return legacy_json_string(rows)
    if action == "18":
        rows = list(SkillModuleVideos.objects.filter(CourseId=rid).order_by("id")
                    .values(*_SKILL_VIDEO_FIELDS))
        return legacy_json_string(rows)
    return legacy_json_string([])


@csrf_exempt
def skill_save_video(request):
    """POST /api/Skill/SaveVideo — multipart video IUD (USP_SkillTrainingProgram)."""
    if not request.user.is_authenticated:
        return session_expired()
    params = _params(request)
    action = str(params.get("Action") or "5")
    login = _int_or_none(params.get("Loginid")) or _login_id(request)
    cid = _int_or_none(params.get("CourseId"))
    mid = _int_or_none(params.get("moduleid"))
    vid = _int_or_none(params.get("id"))

    video_path = ""
    if request.FILES.get("VideoFile"):
        video_path = _save_upload_file(request.FILES["VideoFile"], "Skill")
    thumb = _maybe_file(params.get("ThumbnailFile_Preview"), "Skill")

    if action == "6":
        if vid:
            SkillModuleVideos.objects.filter(id=vid).delete()
        return legacy_status_result("1")
    data = {
        "CourseId": cid,
        "moduleid": mid,
        "Title": params.get("Title"),
        "Description": params.get("Description"),
        "Thumbnail": thumb,
        "Videos": video_path or params.get("VideoFile_Preview"),
        "Loginid": login,
    }
    if vid:
        SkillModuleVideos.objects.filter(id=vid).update(**data)
        return legacy_status_result(str(vid))
    row = SkillModuleVideos.objects.create(CreatedOn=timezone.now(), **data)
    return legacy_status_result(str(row.id))


# ---------------------------------------------------------------------------
# RozgarController.cs  (RTL.USP_Rozgar, RTL.USP_ApplyJobPost)
# ---------------------------------------------------------------------------


_ROZGAR_FIELDS = (
    "id", "isflag", "JobTitle", "JobCaegory", "WorkType", "Location", "Description",
    "RequiredSkills", "MinSallery", "MaxSallery", "Loginid", "Mapid", "CreatedOn",
    "CreatedBy", "saveflag", "Jobno", "State", "City", "Experience",
)

_APPLY_FIELDS = (
    "id", "isflag", "JobTitle", "Fullname", "jobno", "WorkType", "EmailID",
    "Mobileno", "CurrentLocation", "Loginid", "Mapid", "CreatedBy", "CreatedOn",
)


@csrf_exempt
def rozgar_save_job_post(request):
    """POST /api/Rozgar/SavejobPost — RTL.USP_Rozgar (Action 1=insert, 2=close)."""
    if not request.user.is_authenticated:
        return session_expired()
    params = _params(request)
    action = str(params.get("Action") or "1")
    login = _int_or_none(params.get("Loginid")) or _login_id(request)
    rid = _int_or_none(params.get("id"))

    if action == "2":
        qs = Rozgar.objects.all()
        if params.get("Jobno"):
            qs = qs.filter(Jobno=params.get("Jobno"))
        elif rid:
            qs = qs.filter(id=rid)
        qs.update(isflag=1)
        return legacy_status_result("1")

    jobno = _next_job_no()
    row = Rozgar.objects.create(
        JobTitle=params.get("JobTitle"),
        JobCaegory=params.get("JobCategory"),
        WorkType=params.get("WorkType"),
        Location=params.get("Location"),
        Description=params.get("Description"),
        RequiredSkills=params.get("RequiredSkills"),
        MinSallery=params.get("MinSallery") or None,
        MaxSallery=params.get("MaxSallery") or None,
        State=params.get("State"),
        City=params.get("City"),
        Experience=params.get("Experience"),
        Loginid=login,
        Mapid=_int_or_none(params.get("Mapid")),
        CreatedBy=login,
        CreatedOn=timezone.now(),
        isflag=0,
        saveflag=_int_or_none(params.get("saveflag")) or 1,
        Jobno=jobno,
    )
    return legacy_status_result(jobno)


def _rozgar_with_counts(qs):
    rows = list(qs.order_by("-id").values(*_ROZGAR_FIELDS))
    jobnos = [r["Jobno"] for r in rows if r["Jobno"]]
    apps = list(ApplyPostJob.objects.filter(jobno__in=jobnos))
    total_app = len(apps)
    total_hires = sum(1 for a in apps if a.isflag == 1)
    total_post = len(rows)
    for r in rows:
        r["TotalPost"] = total_post
        r["TotalApplication"] = total_app
        r["TotalHires"] = total_hires
    return rows


@csrf_exempt
def rozgar_get_detail(request):
    """POST /api/Rozgar/GetRozgarDetail — RTL.USP_Rozgar select.

    Actions: 4=job by no, 5=job history (contractor), 6=all open jobs (worker),
    9=employer list, 10=search by job no."""
    if not request.user.is_authenticated:
        return session_expired()
    params = _params(request)
    action = str(params.get("Action") or "4")
    login = (
        _int_or_none(params.get("LoginId"))
        or _int_or_none(params.get("Loginid"))
        or _login_id(request)
    )
    jobno = params.get("Jobno")
    rid = _int_or_none(params.get("id"))

    if action == "5":
        return legacy_json_string(_rozgar_with_counts(Rozgar.objects.filter(Loginid=login)))
    if action == "6":
        rows = list(Rozgar.objects.filter(isflag=0).order_by("-id").values(*_ROZGAR_FIELDS))
        return legacy_json_string(rows)
    if action == "9":
        rows = list(LoginTable.objects.filter(LoginType__in=["2", "5"])
                    .values("LoginId", "UserName", "Name")[:200])
        return legacy_json_string(rows)
    # Actions 4 / 10 — job by number
    qs = Rozgar.objects.all()
    if jobno:
        qs = qs.filter(Jobno=jobno)
    elif rid:
        qs = qs.filter(id=rid)
    rows = list(qs.order_by("-id").values(*_ROZGAR_FIELDS))
    return legacy_json_string(rows)


@csrf_exempt
def rozgar_apply_form(request):
    """POST /api/Rozgar/ApplyForm — RTL.USP_ApplyJobPost (Action 1=apply, 2=update flag)."""
    if not request.user.is_authenticated:
        return session_expired()
    params = _params(request)
    action = str(params.get("Action") or "1")
    login = _int_or_none(params.get("Loginid")) or _login_id(request)

    if action == "2":
        app_id = _int_or_none(params.get("id"))
        jobno = params.get("Jobno")
        isflag = _int_or_none(params.get("isflag"))
        qs = ApplyPostJob.objects.all()
        if app_id:
            qs = qs.filter(id=app_id)
        elif jobno:
            qs = qs.filter(jobno=jobno, Loginid=login)
        if isflag is not None:
            qs.update(isflag=isflag)
        return legacy_status_result("1")

    row = ApplyPostJob.objects.create(
        JobTitle=params.get("JobTitle"),
        Fullname=params.get("Fullname"),
        jobno=params.get("Jobno"),
        WorkType=params.get("WorkType"),
        EmailID=params.get("EmailID"),
        Mobileno=params.get("Mobileno"),
        CurrentLocation=params.get("CurrentLocation"),
        Loginid=login,
        Mapid=_int_or_none(params.get("Mapid")),
        CreatedBy=login,
        CreatedOn=timezone.now(),
        isflag=0,
    )
    return legacy_status_result(str(row.id))


@csrf_exempt
def rozgar_search_apply_form(request):
    """POST /api/Rozgar/SearchApplyForm — RTL.USP_ApplyJobPost select.

    Actions: 4=worker applications, 5=job applicants, 6=worker detail."""
    if not request.user.is_authenticated:
        return session_expired()
    params = _params(request)
    action = str(params.get("Action") or "4")
    login = (
        _int_or_none(params.get("LoginId"))
        or _int_or_none(params.get("Loginid"))
        or _login_id(request)
    )
    jobno = params.get("Jobno")

    if action == "5":
        rows = list(ApplyPostJob.objects.filter(jobno=jobno).order_by("-id")
                    .values(*_APPLY_FIELDS))
        if rows:
            total = len(rows)
            hires = sum(1 for r in rows if r["isflag"] == 1)
            under = sum(1 for r in rows if r["isflag"] == 0)
            for r in rows:
                r["TotalApplication"] = total
                r["TotalHires"] = hires
                r["UnderProcess"] = under
        return legacy_json_string(rows)

    if action == "6":
        em = EmployeeMaster.objects.filter(UserId=login).order_by("-Id").first()
        if not em:
            return legacy_json_string([])
        return legacy_json_string([{
            "EmployeeName": em.EmployeeName,
            "PresentAddress": em.PresentAddress,
            "MobileNumber": em.MobileNumber,
            "EmployeeEmailID": em.PresentAddress or "",
            "EmployeeCode": em.EmployeeCode,
            "Flag": em.Flag,
        }])

    rows = list(ApplyPostJob.objects.filter(Loginid=login).order_by("-id")
                .values(*_APPLY_FIELDS))
    return legacy_json_string(rows)


# ---------------------------------------------------------------------------
# RatingController.cs  (USP_Rating, USP_AuditorCompliance GetValues)
# ---------------------------------------------------------------------------


@csrf_exempt
def rating_search(request):
    """POST /api/Rating/SearchRating — USP_Rating select (Action 4=ratings, 5=party list)."""
    if not request.user.is_authenticated:
        return session_expired()
    params = _params(request)
    action = str(params.get("Action") or "4")
    if action == "5":
        rows = list(PartyMaster.objects.values(
            "PartyId", "PartyCode", "PartyType", "PartyName", "ContactNo",
            "EmailId", "ContactPerson", "ContactMobile")[:500])
        return legacy_json_string(rows)
    rows = list(Rating.objects.order_by("-Id").values("Id", "UserId", "Rating", "Certificate"))
    return legacy_json_string(rows)


@csrf_exempt
def rating_iud(request):
    """POST /api/Rating/IUDRating — USP_Rating (Action 1=insert, 2=update, 3=delete)."""
    if not request.user.is_authenticated:
        return session_expired()
    params = _params(request)
    action = str(params.get("Action") or "1")
    user_id = _int_or_none(params.get("UserId"))
    rating = _int_or_none(params.get("Rating"))
    cert = _maybe_file(params.get("Certificate"), "Certificate")

    if action == "2":
        Rating.objects.filter(UserId=user_id).update(Rating=rating, Certificate=cert)
        return legacy_status_result("1")
    if action == "3":
        Rating.objects.filter(UserId=user_id).delete()
        return legacy_status_result("1")
    Rating.objects.filter(UserId=user_id).delete()
    Rating.objects.create(UserId=user_id, Rating=rating, Certificate=cert)
    return legacy_status_result("1")


@csrf_exempt
def rating_get_values(request):
    """POST /api/Rating/GetValues — USP_AuditorCompliance @Action=7 month totals."""
    if not request.user.is_authenticated:
        return session_expired()
    params = _params(request)
    today = date.today()
    year = today.year - (1 if today.month < 4 else 0)
    fy = f"{year}-{year + 1}"

    counts = {m: 0 for m in range(1, 13)}
    for month in InvoiceRegister.objects.filter(FYID=fy).values_list("Month", flat=True):
        try:
            counts[int(month)] += 1
        except (TypeError, ValueError):
            continue

    # Calendar month -> financial-year column label (April = first).
    calendar = {
        12: "TCAprail", 1: "TCMay", 2: "TCJune", 3: "TCJuly", 4: "TCAug",
        5: "TCSep", 6: "TCOCT", 7: "TCNOV", 8: "TCDEC", 9: "TCJAN",
        10: "TCFEB", 11: "TCMAR",
    }
    row = {"year": fy, "TCAprail": 0, "TCMay": 0, "TCJune": 0, "TCJuly": 0,
           "TCAug": 0, "TCSep": 0, "TCOCT": 0, "TCNOV": 0, "TCDEC": 0,
           "TCJAN": 0, "TCFEB": 0, "TCMAR": 0}
    for month, count in counts.items():
        key = calendar.get(month)
        if key:
            row[key] += count
    return legacy_json_string([row])
