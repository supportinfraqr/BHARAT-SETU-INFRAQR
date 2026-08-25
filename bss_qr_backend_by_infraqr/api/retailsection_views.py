"""Phase 11 — RetailSection missing endpoints (RetailSectionController.cs).

Ports the legacy RetailSection data actions that were previously 404 onto the
migrated RTL.* / dbo.* Postgres tables. Mirrors the legacy contracts:

  * Search actions -> raw JSON array body (legacy_json_string)
  * IUD actions    -> {"status": True, "Result": <scalar>}
  * All require an authenticated session (X-Legacy-Login-Id).
"""
import base64
import os
import uuid

from django.conf import settings
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt

from legacy.models import (
    ActIndustryMapping,
    ComplianceEmployeeDetail,
    DiligenceChecklist,
    DiligenceDocumentList,
    EmployeeMaster,
    EscalationMaster,
    ExecuterDocumentMaster,
    LegalCaseHearing,
    LegalCaseOrderJudgment,
    LegalCasePleading,
    LegalCasesStageOne,
    LicenceRequest,
    LicenseMaster,
    LoginTable,
    MailingConfiguration,
    NoticeInspection,
    PagesSectionMaster,
    PagesSectionRolePermission,
    PartyMaster,
    PaymentDetail,
    PayrollSalaryUpload,
    PayrollUanMasterUpload,
    ProjectManagement,
    RetailActMaster,
    RetailDepartmentMaster,
    RetailDocumentMaster,
    RouteMaster,
    StoreComplianceDocument,
    StoreLicences,
    StoreMapping,
    StoreMaster,
    TemplateMaster,
    VendorRegistration,
)

from .views import (
    _fmt_date,
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
# shared helpers
# ---------------------------------------------------------------------------


def _date_only(value):
    if value is None:
        return None
    return _fmt_date(value, "%Y-%m-%d")


def _save_data_uri(data_uri, folder):
    """Persist a base64 data-URI file under MEDIA_ROOT; return a media path."""
    if not data_uri or not isinstance(data_uri, str):
        return data_uri
    if "," not in data_uri or "base64," not in data_uri:
        return data_uri
    try:
        meta, b64 = data_uri.split(",", 1)
        ext = "pdf"
        if "image/" in meta:
            ext = "jpeg"
        elif "png" in meta:
            ext = "png"
        raw = base64.b64decode(b64)
        dirpath = os.path.join(settings.MEDIA_ROOT, folder)
        os.makedirs(dirpath, exist_ok=True)
        fname = f"{uuid.uuid4().hex[:8]}{timezone.now():%Y%m%d%H%M%S%f}.{ext}"
        with open(os.path.join(dirpath, fname), "wb") as fh:
            fh.write(raw)
        return f"/media/{folder}/{fname}"
    except Exception:
        return data_uri


def _act_list_param(body):
    """Normalise an ActList param to a list of act values."""
    raw = body.get("ActList")
    if isinstance(raw, list):
        acts = []
        for item in raw:
            if isinstance(item, dict):
                acts.append(item.get("Act") or item.get("ActId"))
            else:
                acts.append(item)
        return [a for a in acts if a not in (None, "")]
    return [a for a in str(raw or "").split(",") if a]


def next_id(model, field="Id"):
    """Next integer PK for bulk-migrated tables whose sequences are behind."""
    try:
        last = model.objects.order_by("-" + field).values_list(field, flat=True).first()
        return (last or 0) + 1
    except Exception:
        return 1


# ---------------------------------------------------------------------------
# Notice (RTL.USP_Notice)
# ---------------------------------------------------------------------------


@csrf_exempt
def get_notice_list(request):
    """POST /api/RetailSection/GetNoticeList — notice & inspection list."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    user_id = _int_or_none(body.get("Id"))
    qs = NoticeInspection.objects.all()
    if body.get("StoreId"):
        qs = qs.filter(StoreId=_int_or_none(body.get("StoreId")))
    if body.get("DepartmentId"):
        qs = qs.filter(DepartmentId=_int_or_none(body.get("DepartmentId")))
    if user_id:
        qs = qs.filter(UserId=user_id)
    store_map = {s.Id: s for s in StoreMaster.objects.all()}
    dep_map = {d.DepartmentId: d for d in RetailDepartmentMaster.objects.all()}
    rows = []
    for r in qs.order_by("-Id")[:1000]:
        st = store_map.get(r.StoreId)
        dp = dep_map.get(r.DepartmentId)
        rows.append({
            "Id": r.Id,
            "StoreId": r.StoreId,
            "StoreCode": st.StoreCode if st else None,
            "DepartmentId": r.DepartmentId,
            "DepartmentName": dp.DepartmentName if dp else None,
            "NoticeUpload": r.NoticeUpload,
            "ReceiptDate": _fmt_date(r.ReceiptDate, "%d/%m/%Y") if r.ReceiptDate else None,
            "ExecuterId": r.ExecuterId,
            "ExecuterStoreId": r.ExecuterStoreId,
            "ExecuterDepartmentId": r.ExecuterDepartmentId,
            "ExecuterNoticeUpload": r.ExecuterNoticeUpload,
            "ExecuterReceiptDate": _fmt_date(r.ExecuterReceiptDate, "%d/%m/%Y") if r.ExecuterReceiptDate else None,
            "FinalReceiptDate": _fmt_date(r.FinalReceiptDate, "%d/%m/%Y") if r.FinalReceiptDate else None,
            "FinalSubmittionbyExecuter": r.FinalSubmittionbyExecuter,
            "Status": r.Status,
            "Submitions": r.FinalSubmittionbyExecuter,
            "NoticeDate": _fmt_date(r.NoticeDate, "%d/%m/%Y") if r.NoticeDate else None,
            "NoticeMode": r.NoticeMode,
            "HearingDate": _fmt_date(r.HearingDate, "%d/%m/%Y") if r.HearingDate else None,
            "OfficerName": r.OfficerName,
            "Address": r.Address,
            "RepresentativeName": r.RepresentativeName,
            "RepresentativeEmail": r.RepresentativeEmail,
            "Description": r.Description,
            "Probability": r.Probability,
            "Interest": r.Interest,
            "LateFee": r.LateFee,
            "Fines": r.Fines,
            "Penalities": r.Penalities,
            "Other": r.Other,
        })
    return legacy_json_string(rows)


@csrf_exempt
def insert_update_notice(request):
    """POST /api/RetailSection/InsertUpdateNotice — RTL.USP_Notice IUD.
    Action 1=insert, 2=update, 3=delete."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    action = _int_or_none(body.get("Action")) or 1
    row_id = _int_or_none(body.get("Id"))
    login_id = _login_id(request) or _int_or_none(body.get("UserId"))
    notice_upload = _save_data_uri(body.get("NoticeUpload"), "NoticeDoc")

    common = {
        "UserId": _int_or_none(body.get("UserId")) or login_id,
        "StoreId": _int_or_none(body.get("StoreId")),
        "DepartmentId": _int_or_none(body.get("DepartmentId")),
        "NoticeUpload": notice_upload,
        "ReceiptDate": _parse_date(body.get("ReceiptDate")),
        "ExecuterId": _int_or_none(body.get("ExecuterId")),
        "ExecuterStoreId": _int_or_none(body.get("ExecuterStoreId")),
        "ExecuterDepartmentId": _int_or_none(body.get("ExecuterDepartmentId")),
        "ExecuterReceiptDate": _parse_date(body.get("ExecuterReceiptDate")),
        "FinalSubmittionbyExecuter": body.get("FinalSubmittionbyExecuter"),
        "NoticeDate": _parse_date(body.get("NoticeDate")),
        "NoticeMode": body.get("NoticeMode"),
        "HearingDate": _parse_date(body.get("HearingDate")),
        "OfficerName": body.get("OfficerName"),
        "Address": body.get("Address"),
        "RepresentativeName": body.get("RepresentativeName"),
        "RepresentativeEmail": body.get("RepresentativeEmail"),
        "Description": body.get("Description"),
        "Probability": body.get("Probability"),
        "Interest": body.get("Interest"),
        "LateFee": body.get("LateFee"),
        "Fines": body.get("Fines"),
        "Penalities": body.get("Penalities"),
        "Other": body.get("Other"),
    }
    if action == 1:
        row = NoticeInspection.objects.create(CreatedOn=timezone.now(), Createdby=login_id, **common)
        return legacy_status_result(str(row.Id))
    if action == 2 and row_id:
        NoticeInspection.objects.filter(Id=row_id).update(**common)
        return legacy_status_result("1")
    if row_id:
        NoticeInspection.objects.filter(Id=row_id).delete()
    return legacy_status_result("")


# ---------------------------------------------------------------------------
# Compliance (RTL.USP_Compliance)
# ---------------------------------------------------------------------------


def _exec_doc_row(r, store_map, act_map):
    st = store_map.get(r.StoreId)
    return {
        "Id": r.Id,
        "DocId": r.DocId,
        "ExecuterId": r.ExecuterId,
        "StoreId": r.StoreId,
        "StoreCode": st.StoreCode if st else None,
        "StoreName": st.StoreName if st else None,
        "ActId": r.ActId,
        "Act": r.Act or act_map.get(_int_or_none(r.ActId)),
        "FY": r.FY,
        "CMonth": r.CMonth,
        "DocumentName": r.DocumentName,
        "DocumentType": r.DocumentType,
        "Frequency": r.Frequency,
        "FormatType": r.FormatType,
        "Note": r.Note,
        "DocumentPath": r.DocumentPath,
        "IsDefault": r.IsDefault,
        "FormNo": r.FormNo,
        "StateId": r.StateId,
        "Criticality": r.Criticality,
        "CreatedOn": r.CreatedOn,
        "Createdby": r.Createdby,
        "Updatedby": r.Updatedby,
        "UpdatedON": _fmt_date(r.UpdatedON, "%d/%m/%Y") if r.UpdatedON else None,
        "Isdelete": r.Isdelete,
    }


@csrf_exempt
def search_compliance(request):
    """POST /api/RetailSection/SearchCompliance — RTL.USP_Compliance.
    ActionType 3/5 = store list, 4 = act list, 14 = document report list."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    action_type = _int_or_none(body.get("ActionType"))
    store_code = body.get("StoreCode")

    if action_type in (3, 5):
        rows = list(StoreMaster.objects.all()[:1000])
        return legacy_json_string([
            {"Id": s.Id, "StoreCode": s.StoreCode, "StoreName": s.StoreName,
             "RefStoreCode": s.RefStoreCode}
            for s in rows
        ])

    if action_type == 4:
        qs = ExecuterDocumentMaster.objects.all()
        if store_code:
            qs = qs.filter(StoreId=_int_or_none(store_code))
        seen, rows = set(), []
        for r in qs[:5000]:
            if r.Act in seen:
                continue
            seen.add(r.Act)
            rows.append({"Id": r.Act, "Act": r.Act})
        return legacy_json_string(rows)

    # ActionType 14 / default — compliance document report list
    qs = ExecuterDocumentMaster.objects.all()
    store_id = body.get("StoreId") or store_code
    if store_id:
        qs = qs.filter(StoreId=_int_or_none(store_id))
    if body.get("FY"):
        qs = qs.filter(FY=body.get("FY"))
    if body.get("CMonth"):
        qs = qs.filter(CMonth=body.get("CMonth"))
    store_map = {s.Id: s for s in StoreMaster.objects.all()}
    act_map = {a.ActId: a.Act for a in RetailActMaster.objects.all()}
    rows = [_exec_doc_row(r, store_map, act_map) for r in qs.order_by("-Id")[:2000]]
    return legacy_json_string(rows)


@csrf_exempt
def search_store_compliance(request):
    """POST /api/RetailSection/SearchStoreCompliance — RTL.USP_Compliance
    scoped to a user (UserId)."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    qs = ExecuterDocumentMaster.objects.all()
    store_id = body.get("StoreId") or body.get("Ids")
    if store_id:
        qs = qs.filter(StoreId=_int_or_none(store_id))
    if body.get("StoreCode"):
        qs = qs.filter(StoreId=_int_or_none(body.get("StoreCode")))
    user_id = _int_or_none(body.get("UserId"))
    if user_id:
        qs = qs.filter(ExecuterId=user_id)
    store_map = {s.Id: s for s in StoreMaster.objects.all()}
    act_map = {a.ActId: a.Act for a in RetailActMaster.objects.all()}
    rows = [_exec_doc_row(r, store_map, act_map) for r in qs.order_by("-Id")[:2000]]
    return legacy_json_string(rows)


@csrf_exempt
def upload_compliance_doc(request):
    """POST /api/RetailSection/UploadComplianceDoc — RTL.USP_ROLEMANAGE
    document upsert on RTL.StoreComplianceDocument."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    d_id = _int_or_none(body.get("Id") or body.get("DId"))
    store_id = _int_or_none(body.get("StoreId"))
    user_id = _int_or_none(body.get("LoginId")) or _int_or_none(body.get("UserId"))
    path = _save_data_uri(body.get("UFile") or body.get("DocumentPath"), "CDoc")
    verify = _int_or_none(body.get("Verify"))
    emp_code = body.get("EmpCode")
    if not d_id and body.get("DId"):
        d_id = _int_or_none(body.get("DId"))

    existing = StoreComplianceDocument.objects.filter(
        StoreId=store_id, DId=d_id).first()
    if existing:
        StoreComplianceDocument.objects.filter(Id=existing.Id).update(
            DocumentPath=path or existing.DocumentPath,
            Verify=verify,
            UserId=user_id,
        )
        return legacy_status_result(str(existing.Id))
    row = StoreComplianceDocument.objects.create(
        StoreId=store_id, DId=d_id, DocumentPath=path, Verify=verify,
        UserId=user_id, CreatedOn=timezone.now(),
    )
    return legacy_status_result(str(row.Id))


@csrf_exempt
def iud_retail_compliance(request):
    """POST /api/RetailSection/IUDRetailcompliance — RTL.USP_Compliance IUD on
    RTL.ExecuterDocumentMaster. Action 1=insert, 2=update, 3=delete."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    return _iud_exec_doc(request, body)


@csrf_exempt
def iud_retail_update_compliance(request):
    """POST /api/RetailSection/IUDRetailUpdatecompliance — same USP as
    IUDRetailcompliance but with file upload."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    return _iud_exec_doc(request, body)


def _iud_exec_doc(request, body):
    action = _int_or_none(body.get("Action") or body.get("ActionType")) or 1
    row_id = _int_or_none(body.get("Id"))
    login_id = _login_id(request)
    doc_path = _save_data_uri(body.get("DocumentPath"), "CDoc")
    data = {
        "ExecuterId": _int_or_none(body.get("ExecuterId") or body.get("LoginId")) or login_id,
        "StoreId": _int_or_none(body.get("StoreId")),
        "ActId": body.get("ActId"),
        "Act": body.get("Act"),
        "FY": body.get("FY"),
        "CMonth": body.get("CMonth"),
        "DocumentName": body.get("DocumentName"),
        "DocumentPath": doc_path,
        "StateId": body.get("StateId"),
        "Updatedby": str(login_id) if login_id else body.get("Updatedby"),
        "UpdatedON": timezone.now(),
    }
    if action == 1:
        row = ExecuterDocumentMaster.objects.create(
            CreatedOn=timezone.now(), Createdby=str(login_id) if login_id else None, **data)
        return legacy_status_result(str(row.Id))
    if action == 2 and row_id:
        ExecuterDocumentMaster.objects.filter(Id=row_id).update(**data)
        return legacy_status_result("1")
    if row_id:
        ExecuterDocumentMaster.objects.filter(Id=row_id).update(Isdelete=True)
        return legacy_status_result("")
    return legacy_status_result("")


@csrf_exempt
def search_retail_compliance(request):
    """POST /api/RetailSection/SearchRETAILCompliance — document list for a
    store/FY/month (RTL.USP_Compliance @Action=9)."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    qs = ExecuterDocumentMaster.objects.all()
    store_id = _int_or_none(body.get("StoreId"))
    if store_id:
        qs = qs.filter(StoreId=store_id)
    acts = _act_list_param(body)
    if acts:
        qs = qs.filter(Act__in=acts)
    if body.get("FY"):
        qs = qs.filter(FY=body.get("FY"))
    if body.get("CMonth"):
        qs = qs.filter(CMonth=body.get("CMonth"))
    if body.get("LoginId"):
        qs = qs.filter(ExecuterId=_int_or_none(body.get("LoginId")))
    store_map = {s.Id: s for s in StoreMaster.objects.all()}
    act_map = {a.ActId: a.Act for a in RetailActMaster.objects.all()}
    rows = [_exec_doc_row(r, store_map, act_map) for r in qs.order_by("-Id")[:2000]]
    return legacy_json_string(rows)


@csrf_exempt
def bulk_act_save(request):
    """POST /api/RetailSection/BulkActSave — create compliance documents for a
    store across the selected acts (RTL.USP_Compliance @Action=6/15)."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    store_id = _int_or_none(body.get("StoreId"))
    acts = _act_list_param(body)
    fy = body.get("FY")
    cmonth = body.get("CMonth")
    login_id = _login_id(request)
    state_id = body.get("StateId")
    store_map = {s.Id: s for s in StoreMaster.objects.all()}
    act_map = {a.ActId: a.Act for a in RetailActMaster.objects.all()}

    created = []
    for act in acts:
        row = ExecuterDocumentMaster.objects.create(
            StoreId=store_id,
            Act=act,
            ActId=act,
            FY=fy,
            CMonth=cmonth,
            StateId=state_id,
            ExecuterId=_int_or_none(body.get("LoginId")) or login_id,
            CreatedOn=timezone.now(),
            Createdby=str(login_id) if login_id else None,
            UpdatedON=timezone.now(),
            Isdelete=False,
        )
        created.append(_exec_doc_row(row, store_map, act_map))
    return legacy_json_string(created)


@csrf_exempt
def iud_excel(request):
    """POST /api/RetailSection/IUDExcel — persist the ComplianceMaster list
    (RTL.USP_Compliance @ComplianceMaster)."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    items = body.get("ComplianceMaster") or body.get("ComplianceList") or []
    if not isinstance(items, list):
        return legacy_status_result("1")
    login_id = _login_id(request)
    store_code = body.get("StoreCode")
    for item in items:
        if not isinstance(item, dict):
            continue
        ExecuterDocumentMaster.objects.create(
            ExecuterId=_int_or_none(body.get("ExecuterId")) or login_id,
            StoreId=_int_or_none(store_code) or _int_or_none(item.get("StoreId")),
            Act=item.get("Act") or body.get("Act"),
            ActId=item.get("Act"),
            FY=body.get("FY"),
            CMonth=body.get("CMonth"),
            DocumentName=item.get("DocumentName"),
            DocumentType=item.get("Type"),
            Frequency=item.get("Frequency"),
            DocumentPath=_save_data_uri(item.get("FilePath"), "CDoc"),
            CreatedOn=timezone.now(),
            Createdby=str(login_id) if login_id else None,
            Isdelete=False,
        )
    return legacy_status_result("1")


# ---------------------------------------------------------------------------
# Bulk masters (Usp_StoreMaster / USP_EmployeeMaster)
# ---------------------------------------------------------------------------


@csrf_exempt
def iud_bulk_store_master(request):
    """POST /api/RetailSection/IUDBulkStoreMaster — bulk insert stores."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    items = body.get("StoreMaster") or []
    if not isinstance(items, list):
        return legacy_status_result("1")
    login_id = _login_id(request)
    for item in items:
        if not isinstance(item, dict):
            continue
        StoreMaster.objects.create(
            RefStoreCode=item.get("RefStoreCode"),
            StoreName=item.get("StoreName"),
            CompleteAddress=item.get("CompleteAddress"),
            ProposedDate=_parse_date(item.get("ProposedDate")),
            StoreLocation=item.get("StoreLocation"),
            Category=item.get("Category"),
            IsActive=item.get("IsActive") or "1",
            CreatedBy=login_id,
        )
    return legacy_status_result("1")


@csrf_exempt
def iud_bulk_employeee(request):
    """POST /api/RetailSection/IUDBulkEmployeee — bulk insert employees."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    items = body.get("EmployeeMaster") or []
    if not isinstance(items, list):
        return legacy_status_result("1")
    for item in items:
        if not isinstance(item, dict):
            continue
        EmployeeMaster.objects.create(
            RefEmployeeCode=item.get("RefEmployeeCode"),
            EmployeeCode=item.get("RefEmployeeCode"),
            EmployeeName=item.get("EmployeeName"),
            EmployeeDesignation=item.get("EmployeeDesignation"),
            EmployeeDepartment=item.get("EmployeeDepartment"),
            Father_Husband_Name=item.get("Father_Husband_Name"),
            Gendar=item.get("Gendar"),
            MaritalStatus=item.get("MaritalStatus"),
            DateOfBirth=item.get("DateOfBirth"),
            DOJ=item.get("DOJ"),
            PresentAddress=item.get("PresentAddress"),
            MobileNumber=item.get("MobileNumber"),
            PANNumber=item.get("PANNumber"),
            AdharCardNumber=item.get("AdharCardNumber"),
            PreviousUAN=item.get("PreviousUAN"),
            PFAccount=item.get("PFAccount"),
            BankAccountNumber=item.get("BankAccountNumber"),
            GrossSalary=item.get("GrossSalary"),
            StoreCode=item.get("StoreCode"),
            IsActive=item.get("IsActive") or "1",
            UserId=_int_or_none(body.get("UserId")),
            PartyId=body.get("PartyId"),
        )
    return legacy_status_result("1")


@csrf_exempt
def new_iud_bulk_employeee(request):
    """POST /api/RetailSection/NewIUDBulkEmployeee — bulk insert employees
    (structured-table variant of IUDBulkEmployeee)."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    items = body.get("EmployeeMaster") or []
    if not isinstance(items, list) or not items:
        return legacy_status_result("No data found to insert")
    for item in items:
        if not isinstance(item, dict):
            continue
        EmployeeMaster.objects.create(
            RefEmployeeCode=item.get("RefEmployeeCode"),
            EmployeeCode=item.get("RefEmployeeCode"),
            EmployeeName=item.get("EmployeeName"),
            EmployeeDesignation=item.get("EmployeeDesignation"),
            EmployeeDepartment=item.get("EmployeeDepartment"),
            Father_Husband_Name=item.get("Father_Husband_Name"),
            Gendar=item.get("Gendar"),
            MaritalStatus=item.get("MaritalStatus"),
            DateOfBirth=item.get("DateOfBirth"),
            DOJ=item.get("DOJ"),
            PresentAddress=item.get("PresentAddress"),
            MobileNumber=item.get("MobileNumber"),
            PANNumber=item.get("PANNumber"),
            AdharCardNumber=item.get("AdharCardNumber"),
            PreviousUAN=item.get("PreviousUAN") or item.get("UAN"),
            PFAccount=item.get("PFAccount"),
            BankAccountNumber=item.get("BankAccountNumber"),
            GrossSalary=item.get("GrossSalary"),
            StoreCode=item.get("SiteName"),
            IsActive=item.get("IsActive") or "1",
            UserId=_int_or_none(body.get("UserId")),
            PartyId=body.get("PartyId"),
        )
    return legacy_status_result("Success")


@csrf_exempt
def update_status(request):
    """POST /api/RetailSection/UpdateStatus — RTL.Usp_StoreMaster additional
    document upload + status update."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    action = _int_or_none(body.get("Action") or body.get("ActionType"))
    store_code = body.get("StoreCode")
    if body.get("IsActive") is not None and store_code:
        StoreMaster.objects.filter(StoreCode=store_code).update(IsActive=str(body.get("IsActive")))
    if store_code and body.get("UFile"):
        from legacy.models import AdditionalStoreDoc
        AdditionalStoreDoc.objects.create(
            StoreCode=store_code,
            AdditionalDocName=body.get("DocumentName"),
            AdditionalDoc=_save_data_uri(body.get("UFile"), "StoreLicDocument"),
            Createdby=_int_or_none(body.get("LoginId")) or _login_id(request),
            CreatedOn=timezone.now(),
        )
    return legacy_status_result("1")


# ---------------------------------------------------------------------------
# Bulk compliance excel (RTL.USP_ComplianceBulk)
# ---------------------------------------------------------------------------


@csrf_exempt
def get_comlist(request):
    """POST /api/RetailSection/GetComlist — RTL.USP_ComplianceBulk.
    Action 6 = document master list, 4/5 = payroll/attendance rows."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    action = _int_or_none(body.get("Action"))
    if action == 6:
        rows = list(RetailDocumentMaster.objects.all()[:1000])
        return legacy_json_string([
            {"Id": r.Id, "DocumentName": r.DocumentName, "Act": r.Act,
             "Frequency": r.Frequency, "DocumentType": r.DocumentType}
            for r in rows
        ])
    qs = ComplianceEmployeeDetail.objects.all()
    if body.get("State"):
        qs = qs.filter(State=body.get("State"))
    if body.get("Month"):
        qs = qs.filter(Month=body.get("Month"))
    if body.get("Year"):
        qs = qs.filter(Date_Of_Joining__icontains=str(body.get("Year")))
    rows = [
        {
            "Uid": r.Uid,
            "Employee_Code": r.Employee_Code,
            "Employee_Name": r.Employee_Name,
            "Gender": r.Gender,
            "Father_Name": r.Father_Name,
            "Date_of_Birth": r.Date_of_Birth,
            "Date_Of_Joining": r.Date_Of_Joining,
            "Designation": r.Designation,
            "Department": r.Department,
            "Branch_Address": r.Branch_Address,
            "State": r.State,
            "Month": r.Month,
            "UAN_No": r.UAN_No,
            "ESIC_No": r.ESIC_No,
            "StoreCode": r.StoreCode,
            "ComplianceCategory": r.ComplianceCategory,
        }
        for r in qs[:2000]
    ]
    return legacy_json_string(rows)


@csrf_exempt
def iud_bulk_compliance_excel(request):
    """POST /api/RetailSection/IUDBulkComplianceExcel — persist bulk
    attendance compliance rows (RTL.USP_ComplianceBulk)."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    items = body.get("AttendanceList") or []
    if not isinstance(items, list):
        return legacy_status_result("1")
    login_id = _login_id(request)
    for item in items:
        if not isinstance(item, dict):
            continue
        employee_id = item.get("EmployeeId")
        month = item.get("Month")
        year = item.get("Year")
        state = item.get("State")
        uid = f"{employee_id}-{month}-{year}-{state}-{login_id or 0}"
        ComplianceEmployeeDetail.objects.update_or_create(
            Uid=uid,
            defaults={
                "Employee_Code": str(employee_id),
                "Employee_Name": item.get("EmployeeName"),
                "Designation": item.get("Designation"),
                "Month": month,
                "State": state,
                "ComplianceCategory": item.get("ComplianceCategory"),
            },
        )
    return legacy_status_result("1")


@csrf_exempt
def get_reportlist(request):
    """POST /api/RetailSection/GetReportlist — RTL.USP_ComplianceBulk report
    rows (payroll / establishment detail)."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    rows = _compliance_report_rows(body)
    return legacy_json_string(rows)


@csrf_exempt
def get_bulk_reportlist(request):
    """POST /api/RetailSection/GetBulkReportlist — same data wrapped as a
    DataSet-shaped response ({Table: [...]})."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    rows = _compliance_report_rows(body)
    return legacy_json_string({"Table": rows})


def _compliance_report_rows(body):
    qs = ComplianceEmployeeDetail.objects.all()
    store_code = body.get("StoreCode")
    store_id = body.get("StoreId")
    if store_id:
        store = StoreMaster.objects.filter(Id=_int_or_none(store_id)).first()
        store_code = store.StoreCode if store else store_code
    if store_code:
        qs = qs.filter(StoreCode=store_code)
    category = body.get("ComplianceCategory")
    if category:
        qs = qs.filter(ComplianceCategory=category)
    rows = [
        {
            "DocumentId": r.Uid,
            "DocumentName": r.Employee_Name,
            "HeaderHtml": r.Employee_Name,
            "Employee_Code": r.Employee_Code,
            "Employee_Name": r.Employee_Name,
            "Designation": r.Designation,
            "Department": r.Department,
            "Gender": r.Gender,
            "Father_Name": r.Father_Name,
            "Date_of_Birth": r.Date_of_Birth,
            "Date_Of_Joining": r.Date_Of_Joining,
            "Branch_Address": r.Branch_Address,
            "State": r.State,
            "STATE_NM": r.State,
            "Month": r.Month,
            "UAN_No": r.UAN_No,
            "ESIC_No": r.ESIC_No,
            "StoreCode": r.StoreCode,
            "StoreId": store_id,
            "ComplianceCategory": r.ComplianceCategory,
        }
        for r in qs[:2000]
    ]
    return rows


# ---------------------------------------------------------------------------
# Payroll (RTL.usp_PayRoll)
# ---------------------------------------------------------------------------


@csrf_exempt
def get_payroll_detail(request):
    """POST /api/RetailSection/GetPAYROLLDetail — payroll salary + UAN rows."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    store_code = body.get("StoreCode")
    year = body.get("Year")
    month = body.get("Month")
    mode = body.get("Mode")
    payroll_type = body.get("PayRollType")

    sal_qs = PayrollSalaryUpload.objects.all()
    uan_qs = PayrollUanMasterUpload.objects.all()
    if store_code:
        sal_qs = sal_qs.filter(StoreCode=store_code)
        uan_qs = uan_qs.filter(StoreCode=store_code)
    if year:
        sal_qs = sal_qs.filter(Year=str(year))
        uan_qs = uan_qs.filter(Year=str(year))
    if month:
        sal_qs = sal_qs.filter(Month=str(month))
        uan_qs = uan_qs.filter(Month=str(month))

    salaries = [
        {
            "Id": r.Id, "uid": r.uid, "EmployeeCode": r.EmployeeCode,
            "EmployeeName": r.EmployeeName, "DOJ": r.DOJ,
            "Designation": r.Designation, "UANNumber": r.UANNumber,
            "TotalWorkingDays": r.TotalWorkingDays,
            "EarnedGrossSalary": r.EarnedGrossSalary,
            "TotalDeduction": r.TotalDeduction,
            "NetPayableSalary": r.NetPayableSalary,
            "StoreCode": r.StoreCode, "Year": r.Year, "Month": r.Month,
            "Status": r.Status,
        }
        for r in sal_qs[:2000]
    ]
    uans = [
        {
            "Id": r.Id, "UID": r.UID, "EmployeeCode": r.EmployeeCode,
            "UAN": r.UAN, "MemberID": r.MemberID, "Name": r.Name,
            "Gender": r.Gender, "DoB": r.DoB, "DoJ": r.DoJ,
            "FatherHusbandName": r.FatherHusbandName, "Relation": r.Relation,
            "MaritalStatus": r.MaritalStatus, "Mobile": r.Mobile,
            "EmailID": r.EmailID, "AADHAAR": r.AADHAAR, "PAN": r.PAN,
            "BankAccountNo": r.BankAccountNo, "IFSCCode": r.IFSCCode,
            "StoreCode": r.StoreCode, "Year": r.Year, "Month": r.Month,
            "Status": r.Status,
        }
        for r in uan_qs[:2000]
    ]
    return legacy_json_string({"Table": salaries, "Table1": salaries, "Table2": uans})


@csrf_exempt
def update_error_list(request):
    """POST /api/RetailSection/UpdateerrorList — correct a payroll row column."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    emp_id = body.get("EmpId")
    columnname = body.get("columnname")
    new_value = body.get("Newvalue")
    if emp_id and columnname:
        field_map = {
            "EmployeeCode": "EmployeeCode",
            "EmployeeName": "EmployeeName",
            "Designation": "Designation",
            "UANNumber": "UANNumber",
            "TotalWorkingDays": "TotalWorkingDays",
            "EarnedGrossSalary": "EarnedGrossSalary",
        }
        fname = field_map.get(str(columnname))
        if fname:
            PayrollSalaryUpload.objects.filter(Id=_int_or_none(emp_id)).update(**{fname: new_value})
    return legacy_status_result("1")


@csrf_exempt
def save_excel_data(request):
    """POST /api/RetailSection/SaveExcelData — ingest payroll salary + UAN
    excel rows (RTL.usp_PayRoll)."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    login_id = body.get("LoginId") or (_login_id(request) or 0)
    store_code = body.get("StoreCode") or ""
    year = body.get("Year") or ""
    month = body.get("Month") or ""
    payroll_type = body.get("PayRollType") or ""
    mode = body.get("Mode") or ""

    def _items(value):
        if isinstance(value, list):
            return value
        if isinstance(value, str):
            import json
            try:
                return json.loads(value)
            except Exception:
                return []
        return []

    for item in _items(body.get("ExcelData1")):
        if not isinstance(item, dict):
            continue
        PayrollSalaryUpload.objects.create(
            uid=str(item.get("Uid") or item.get("uid") or ""),
            EmployeeCode=str(item.get("EmployeeCode") or ""),
            EmployeeName=str(item.get("EmployeeName") or ""),
            DOJ=str(item.get("DOJ") or item.get("DoJ") or ""),
            Designation=str(item.get("Designation") or ""),
            UANNumber=str(item.get("UANNumber") or ""),
            TotalWorkingDays=str(item.get("TotalWorkingDays") or ""),
            EarnedGrossSalary=str(item.get("EarnedGrossSalary") or ""),
            TotalDeduction=str(item.get("TotalDeduction") or ""),
            NetPayableSalary=str(item.get("NetPayableSalary") or ""),
            StoreCode=store_code, Year=year, Month=month,
            PayRollType=payroll_type, Mode=mode,
            LoginId=str(login_id),
            CreatedDate=timezone.now(),
            Status=1,
        )
    for item in _items(body.get("ExcelData2")):
        if not isinstance(item, dict):
            continue
        PayrollUanMasterUpload.objects.create(
            UID=str(item.get("UID") or item.get("Uid") or ""),
            EmployeeCode=str(item.get("EmployeeCode") or ""),
            UAN=str(item.get("UAN") or ""),
            MemberID=str(item.get("MemberID") or ""),
            Name=str(item.get("Name") or ""),
            Gender=str(item.get("Gender") or ""),
            DoB=str(item.get("DoB") or ""),
            DoJ=str(item.get("DoJ") or ""),
            FatherHusbandName=str(item.get("FatherHusbandName") or ""),
            Relation=str(item.get("Relation") or ""),
            MaritalStatus=str(item.get("MaritalStatus") or ""),
            Mobile=str(item.get("Mobile") or ""),
            EmailID=str(item.get("EmailID") or ""),
            AADHAAR=str(item.get("AADHAAR") or ""),
            PAN=str(item.get("PAN") or ""),
            BankAccountNo=str(item.get("BankAccountNo") or ""),
            IFSCCode=str(item.get("IFSCCode") or ""),
            StoreCode=store_code, Year=year, Month=month,
            PayRollType=payroll_type, Mode=mode,
            LoginId=str(login_id),
            CreatedDate=timezone.now(),
            Status=1,
        )
    from django.http import JsonResponse
    return JsonResponse({"Result": "SUCCESS", "Message": "Upload successful"})


# ---------------------------------------------------------------------------
# Escalation (RTL.Escalation)
# ---------------------------------------------------------------------------


@csrf_exempt
def search_escalation(request):
    """POST /api/RetailSection/SearchEscalation — RTL.Escalation list for a
    client."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    qs = EscalationMaster.objects.all()
    client_id = _int_or_none(body.get("UserId") or body.get("ClientId"))
    if client_id:
        qs = qs.filter(ClientId=client_id)
    rows = [
        {
            "Id": r.Id, "ClientId": r.ClientId, "Escalation1": r.Escalation1,
            "Escalation2": r.Escalation2, "StoreCode": r.StoreCode,
            "LicenceId": r.LicenceId, "Remark": r.Remark,
            "Escalation1Remark": r.Escalation1Remark,
            "IsEscalate2": r.IsEscalate2,
            "Escalation2Remark": r.Escalation2Remark,
            "Status": r.Status,
            "CreatedOn": r.CreatedOn,
            "Closedby": r.Closedby,
        }
        for r in qs.order_by("-Id")[:1000]
    ]
    return legacy_json_string(rows)


@csrf_exempt
def iud_escalation(request):
    """POST /api/RetailSection/IUDEscalation — RTL.Escalation IUD."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    action = _int_or_none(body.get("ActionType") or body.get("Action")) or 1
    row_id = _int_or_none(body.get("Id"))
    common = {
        "ClientId": _int_or_none(body.get("ClientId")),
        "Escalation1": _int_or_none(body.get("Escalation1")),
        "Escalation2": _int_or_none(body.get("Escalation2")),
        "StoreCode": _int_or_none(body.get("StoreCode")),
        "LicenceId": _int_or_none(body.get("LicenceId")),
        "Remark": body.get("Remark"),
        "Status": _int_or_none(body.get("Status")),
    }
    if action == 1:
        row = EscalationMaster.objects.create(CreatedOn=timezone.now(), **common)
        return legacy_status_result(str(row.Id))
    if action == 2 and row_id:
        EscalationMaster.objects.filter(Id=row_id).update(**common)
        return legacy_status_result("1")
    if row_id:
        EscalationMaster.objects.filter(Id=row_id).delete()
    return legacy_status_result("")


# ---------------------------------------------------------------------------
# Payment (RTL.USP_Payment)
# ---------------------------------------------------------------------------


@csrf_exempt
def search_payment(request):
    """POST /api/RetailSection/SearchPayment — RTL.USP_Payment list."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    qs = PaymentDetail.objects.all()
    row_id = _int_or_none(body.get("Id"))
    if row_id:
        qs = qs.filter(Id=row_id)
    rows = [
        {
            "Id": r.Id, "LId": r.LId, "StoreId": r.StoreId,
            "LicenceId": r.LicenceId, "OrderId": r.OrderId, "TransId": r.TransId,
            "Amount": r.Amount, "TotalAmount": r.TotalAmount, "Name": r.Name,
            "MobileNo": r.MobileNo, "EmailId": r.EmailId,
            "PaymentMode": r.PaymentMode, "PaymentStatus": r.PaymentStatus,
            "CreatedOn": r.CreatedOn, "Createdby": r.Createdby,
        }
        for r in qs.order_by("-Id")[:1000]
    ]
    return legacy_json_string(rows)


def _iud_payment_common(request, body):
    action = _int_or_none(body.get("Action")) or 1
    row_id = _int_or_none(body.get("Id"))
    login_id = _login_id(request)
    common = {
        "LId": _int_or_none(body.get("LicenceReqId")),
        "StoreId": body.get("StoreCode"),
        "LicenceId": body.get("LicenceId"),
        "Amount": body.get("Amount"),
        "TotalAmount": body.get("TotalAmount"),
        "PaymentStatus": body.get("PaymentStatus"),
        "PaymentMode": body.get("PaymentMode"),
        "Createdby": login_id,
    }
    if action == 1:
        row = PaymentDetail.objects.create(CreatedOn=timezone.now(), **common)
        return legacy_status_result(str(row.Id))
    if action == 2 and row_id:
        PaymentDetail.objects.filter(Id=row_id).update(**common)
        return legacy_status_result("1")
    if row_id:
        PaymentDetail.objects.filter(Id=row_id).delete()
    return legacy_status_result("")


@csrf_exempt
def iud_payment(request):
    """POST /api/RetailSection/IUDPayment — RTL.USP_Payment IUD."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    return _iud_payment_common(request, body)


@csrf_exempt
def iud_manual_payment(request):
    """POST /api/RetailSection/IUDManualPayment — same USP as IUDPayment."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    return _iud_payment_common(request, body)


# ---------------------------------------------------------------------------
# Act master (SaveRetailData)
# ---------------------------------------------------------------------------


@csrf_exempt
def search_act_master(request):
    """POST /api/RetailSection/SearchActMaster — act master list."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    qs = RetailActMaster.objects.all()
    row_id = _int_or_none(body.get("Id"))
    if row_id:
        qs = qs.filter(ActId=row_id)
    rows = [
        {
            "ActId": r.ActId, "Act": r.Act,
            "selectedCategory": r.selectedCategory,
            "selectedSubcategory": r.selectedSubcategory,
            "CreatedOn": r.CreatedOn,
        }
        for r in qs[:1000]
    ]
    return legacy_json_string(rows)


@csrf_exempt
def iud_act_master(request):
    """POST /api/RetailSection/IUDActMaster — SaveRetailData act IUD."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    action = _int_or_none(body.get("Action")) or 1
    row_id = _int_or_none(body.get("Id"))
    act = body.get("Act")
    login_id = _login_id(request)
    if action == 1:
        from django.db.models import Max as _Max
        next_id = (RetailActMaster.objects.aggregate(m=_Max("ActId"))["m"] or 0) + 1
        row = RetailActMaster.objects.create(
            ActId=next_id,
            Act=act,
            selectedCategory=body.get("selectedCategory"),
            selectedSubcategory=body.get("selectedSubcategory"),
            CreatedOn=timezone.now(),
        )
        _save_act_industries(row.ActId, body.get("IndustryList"))
        return legacy_status_result(str(row.ActId))
    if action == 2 and row_id:
        RetailActMaster.objects.filter(ActId=row_id).update(
            Act=act,
            selectedCategory=body.get("selectedCategory"),
            selectedSubcategory=body.get("selectedSubcategory"),
        )
        ActIndustryMapping.objects.filter(ActId=row_id).delete()
        _save_act_industries(row_id, body.get("IndustryList"))
        return legacy_status_result("1")
    if row_id:
        RetailActMaster.objects.filter(ActId=row_id).delete()
        ActIndustryMapping.objects.filter(ActId=row_id).delete()
    return legacy_status_result("")


def _save_act_industries(act_id, industry_list):
    if not act_id:
        return
    if isinstance(industry_list, str):
        import json
        try:
            industry_list = json.loads(industry_list)
        except Exception:
            industry_list = [industry_list]
    if not isinstance(industry_list, list):
        industry_list = [industry_list]
    for ind in industry_list:
        ind_id = _int_or_none(ind)
        if ind_id:
            ActIndustryMapping.objects.get_or_create(
                ActId=act_id, IndustryId=ind_id)


# ---------------------------------------------------------------------------
# Litigation (Usp_ManageLegalDashboard / Usp_ManageLegalCaseData)
# ---------------------------------------------------------------------------


def _legal_case_row(r):
    return {
        "CaseID": r.CaseID, "CaseCode": r.CaseCode, "CaseTitle": r.CaseTitle,
        "CaseType": r.CaseType, "ForumCourtName": r.ForumCourtName,
        "CaseNumber": r.CaseNumber,
        "FilingDate": _date_only(r.FilingDate),
        "OppositionParty": r.OppositionParty,
        "AdvocateOrLegalCounsel": r.AdvocateOrLegalCounsel,
        "ExternalFirm": r.ExternalFirm, "ExternalFirmName": r.ExternalFirmName,
        "SeniorRepName": r.SeniorRepName, "SeniorRepMobile": r.SeniorRepMobile,
        "SeniorRepEmail": r.SeniorRepEmail,
        "JuniorRepName": r.JuniorRepName, "JuniorRepMobile": r.JuniorRepMobile,
        "JuniorRepEmail": r.JuniorRepEmail,
        "ExternalCounselInitialOpinion": r.ExternalCounselInitialOpinion,
        "RepName": r.RepName, "RepMobile": r.RepMobile, "RepEmail": r.RepEmail,
        "InHouseCounselInitialOpinion": r.InHouseCounselInitialOpinion,
        "State": r.State, "FileUploadPath": r.FileUploadPath,
        "FileUploadDate": _date_only(r.FileUploadDate),
        "Createby": r.Createby, "CreatedOn": r.CreatedOn,
        "AppealStatus": r.AppealStatus, "Appealby": r.Appealby,
        "ACaseStatus": r.ACaseStatus, "Interest": r.Interest,
        "LateFee": r.LateFee, "Fines": r.Fines, "Penalities": r.Penalities,
        "Other": r.Other, "Probability": r.Probability,
    }


@csrf_exempt
def search_litigation_master(request):
    """POST /api/RetailSection/SearchLitigationMaster — legal case list."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    qs = LegalCasesStageOne.objects.all()
    row_id = _int_or_none(body.get("Id"))
    if row_id:
        qs = qs.filter(CaseID=row_id)
    if body.get("CaseCode"):
        qs = qs.filter(CaseCode=body.get("CaseCode"))
    if body.get("State"):
        qs = qs.filter(State=body.get("State"))
    rows = [_legal_case_row(r) for r in qs.order_by("-CaseID")[:500]]
    return legacy_json_string(rows)


@csrf_exempt
def search_litigation_management(request):
    """POST /api/RetailSection/SearchLitigationManagement — legal dashboard
    list (same backing data as SearchLitigationMaster)."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    qs = LegalCasesStageOne.objects.all()
    row_id = _int_or_none(body.get("Id"))
    if row_id:
        qs = qs.filter(CaseID=row_id)
    if body.get("CaseCode"):
        qs = qs.filter(CaseCode=body.get("CaseCode"))
    if body.get("State"):
        qs = qs.filter(State=body.get("State"))
    rows = [_legal_case_row(r) for r in qs.order_by("-CaseID")[:500]]
    return legacy_json_string(rows)


@csrf_exempt
def search_litigation_master_by_case_code(request):
    """POST /api/RetailSection/SearchLitigationMasterBYCaseCode — a case with
    its hearings / pleadings / judgments."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    case_code = body.get("CaseCode")
    case = LegalCasesStageOne.objects.filter(CaseCode=case_code).order_by("-CaseID").first()
    rows = []
    if case:
        row = _legal_case_row(case)
        row["Hearings"] = [
            {
                "HearingID": h.HearingID, "SNO": h.SNO, "CaseID": h.CaseID,
                "CaseCode": h.CaseCode,
                "DateOfHearing": _date_only(h.DateOfHearing),
                "PurposeOfHearing": h.PurposeOfHearing,
                "OutcomeOfHearing": h.OutcomeOfHearing,
                "CaseStatus": h.CaseStatus,
                "DateOfUpload": _date_only(h.DateOfUpload),
                "HearingFilePath": h.HearingFilePath,
            }
            for h in LegalCaseHearing.objects.filter(CaseCode=case_code).order_by("SNO")
        ]
        row["Pleadings"] = [
            {
                "PID": p.PID, "CaseID": p.CaseID, "CaseCode": p.CaseCode,
                "PleadingsType": p.PleadingsType,
                "DateOfFilling": _date_only(p.DateOfFilling),
                "Note": p.Note, "DateOfUpload": _date_only(p.DateOfUpload),
                "File1": p.File1, "File2": p.File2, "File3": p.File3,
            }
            for p in LegalCasePleading.objects.filter(CaseCode=case_code).order_by("PID")
        ]
        row["Judgments"] = [
            {
                "JudgmentID": j.JudgmentID, "CaseId": j.CaseId,
                "CaseCode": j.CaseCode, "JudgmentPassed": j.JudgmentPassed,
                "JudiciaryName": j.JudiciaryName,
                "SummaryOfJudgment": j.SummaryOfJudgment,
                "JudgmentTime": _date_only(j.JudgmentTime),
                "ExecutionStatus": j.ExecutionStatus,
                "CondonationFiled": j.CondonationFiled,
                "CondonationStatus": j.CondonationStatus,
                "JudgmentCopyPath": j.JudgmentCopyPath,
            }
            for j in LegalCaseOrderJudgment.objects.filter(CaseCode=case_code).order_by("JudgmentID")
        ]
        rows.append(row)
    return legacy_json_string(rows)


# ---------------------------------------------------------------------------
# Project management (RTL.USP_ProjectManagement)
# ---------------------------------------------------------------------------


@csrf_exempt
def search_p_management(request):
    """POST /api/RetailSection/SearchPManagement — project management list."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    qs = ProjectManagement.objects.all()
    row_id = _int_or_none(body.get("Id"))
    if row_id:
        qs = qs.filter(Id=row_id)
    party_id = body.get("PartyId")
    if party_id:
        qs = qs.filter(PartyId=party_id)
    rows = [
        {
            "Id": r.Id, "PartyId": r.PartyId, "SiteId": r.SiteId,
            "ProjectName": r.ProjectName, "SizeCapacity": r.SizeCapacity,
            "GovtPrivate": r.GovtPrivate, "EndUserParty": r.EndUserParty,
            "CommissioningDate": r.CommissioningDate,
            "ExecutionDate": r.ExecutionDate,
            "AggregatorFees": r.AggregatorFees, "LandConversion": r.LandConversion,
            "ActualCost": r.ActualCost, "RegistryValue": r.RegistryValue,
            "Variance": r.Variance, "MortgageProperty": r.MortgageProperty,
            "LoanAgreements": r.LoanAgreements, "MortgageAmount": r.MortgageAmount,
            "Miscellaenous": r.Miscellaenous, "AnyOtherDetail": r.AnyOtherDetail,
            "CreatedOn": r.CreatedOn, "UpdatedOn": r.UpdatedOn,
            "CreatedBy": r.CreatedBy,
        }
        for r in qs.order_by("-Id")[:500]
    ]
    return legacy_json_string(rows)


# ---------------------------------------------------------------------------
# Mailing (RTL.Usp_Mailing)
# ---------------------------------------------------------------------------


@csrf_exempt
def iud_mailing(request):
    """POST /api/RetailSection/iudMailing — mail mapping / template IUD."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    action = _int_or_none(body.get("Action")) or 1
    login_id = _login_id(request)
    template_name = body.get("TemplateName")
    template_id = _int_or_none(body.get("TemplateId"))
    party_id = _int_or_none(body.get("PartyId"))

    if action == 1 and template_name:
        tpl = TemplateMaster.objects.create(
            TemplateName=template_name,
            Subject=body.get("Subject"),
            Detail=body.get("Detail"),
            IsActive=True,
            CreatedOn=timezone.now(),
            UpdatedOn=timezone.now(),
        )
        template_id = tpl.TemplateId
    elif action == 2 and template_id:
        TemplateMaster.objects.filter(TemplateId=template_id).update(
            TemplateName=template_name,
            Subject=body.get("Subject"),
            Detail=body.get("Detail"),
            UpdatedOn=timezone.now(),
        )

    if party_id:
        mailing_id = _int_or_none(body.get("MailingId") or body.get("Id"))
        if mailing_id:
            MailingConfiguration.objects.filter(MailingId=mailing_id).update(
                PartyId=party_id,
                MailFor=body.get("MailFor"),
                TemplateId=template_id,
                To=body.get("To"),
                CC=body.get("CC"),
                BCC=body.get("BCC"),
                IsActive=True,
                ModifiedBy=login_id,
                ModifiedOn=timezone.now(),
            )
        else:
            MailingConfiguration.objects.create(
                PartyId=party_id,
                MailFor=body.get("MailFor"),
                TemplateId=template_id,
                To=body.get("To"),
                CC=body.get("CC"),
                BCC=body.get("BCC"),
                IsActive=True,
                CreatedBy=login_id,
                CreatedOn=timezone.now(),
            )
    return legacy_status_result("1")


@csrf_exempt
def mailing_searching(request):
    """POST /api/RetailSection/MailingSearching — mailing config + templates."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    mailing_id = _int_or_none(body.get("Id"))
    mail_rows = MailingConfiguration.objects.all()
    if mailing_id:
        mail_rows = mail_rows.filter(MailingId=mailing_id)
    party_map = {p.PartyId: p for p in PartyMaster.objects.all()}
    tpl_map = {t.TemplateId: t for t in TemplateMaster.objects.all()}
    rows = [
        {
            "MailingId": m.MailingId, "PartyId": m.PartyId,
            "PartyName": party_map.get(m.PartyId).PartyName if party_map.get(m.PartyId) else None,
            "MailFor": m.MailFor, "TemplateId": m.TemplateId,
            "TemplateName": tpl_map.get(m.TemplateId).TemplateName if tpl_map.get(m.TemplateId) else None,
            "Subject": tpl_map.get(m.TemplateId).Subject if tpl_map.get(m.TemplateId) else None,
            "To": m.To, "CC": m.CC, "BCC": m.BCC,
            "IsActive": m.IsActive, "CreatedOn": m.CreatedOn,
        }
        for m in mail_rows[:500]
    ]
    return legacy_json_string(rows)


# ---------------------------------------------------------------------------
# Route master (RTL.USP_RouteMaster)
# ---------------------------------------------------------------------------


@csrf_exempt
def search_route(request):
    """POST /api/RetailSection/SearchRoute — route master list."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    qs = RouteMaster.objects.all()
    row_id = _int_or_none(body.get("Id"))
    if row_id:
        qs = qs.filter(Id=row_id)
    login_id = _int_or_none(body.get("UserId") or body.get("LoginId"))
    if login_id:
        qs = qs.filter(CreatedBy=login_id) | qs.filter(PartyId=login_id)
    rows = [
        {
            "Id": r.Id, "RouteID": r.RouteID, "RouteName": r.RouteName,
            "CompanyName": r.CompanyName, "Location": r.Location,
            "RouteStartLocation": r.RouteStartLocation,
            "RouteEndLocation": r.RouteEndLocation,
            "Status": r.Status, "BusNumber": r.BusNumber, "RCNO": r.RCNO,
            "SeatingCapacity": r.SeatingCapacity, "BusType": r.BusType,
            "DriverName": r.DriverName,
            "DriverContactNumber": r.DriverContactNumber,
            "DriverAddress": r.DriverAddress, "LicenseNumber": r.LicenseNumber,
            "ConductorName": r.ConductorName,
            "ConductorContact": r.ConductorContact,
            "ConductorAddress": r.ConductorAddress,
            "LicenseCopy": r.LicenseCopy, "AadharCardCopy": r.AadharCardCopy,
            "ConductorAadhaarCard": r.ConductorAadhaarCard, "BusRC": r.BusRC,
            "PollutionCertificate": r.PollutionCertificate,
            "FitnessCertificate": r.FitnessCertificate,
            "InsuranceCopy": r.InsuranceCopy, "PartyId": r.PartyId,
            "CreatedBy": r.CreatedBy, "CreatedDate": r.CreatedDate,
            "UpdatedBy": r.UpdatedBy, "UpdatedDate": r.UpdatedDate,
        }
        for r in qs.order_by("-Id")[:1000]
    ]
    return legacy_json_string(rows)


@csrf_exempt
def insert_update_route_master(request):
    """POST /api/RetailSection/InsertUpdateRouteMaster — route master IUD
    (multipart/form or JSON)."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    action = body.get("ActionType") or body.get("Action") or "1"
    row_id = _int_or_none(body.get("Id") or body.get("RouteID"))
    login_id = _int_or_none(body.get("UserId") or body.get("LoginId")) or _login_id(request)
    party_id = body.get("PartyId")
    if body.get("RouteID") and str(body.get("RouteID")).isdigit() and not row_id:
        row_id = _int_or_none(body.get("RouteID"))

    def _field(*names):
        for n in names:
            if body.get(n) is not None:
                return body.get(n)
        return None

    common = {
        "RouteID": body.get("RouteID"),
        "RouteName": _field("RouteName"),
        "CompanyName": _field("CompanyName"),
        "Location": _field("Location"),
        "RouteStartLocation": _field("RouteStartLocation"),
        "RouteEndLocation": _field("RouteEndLocation"),
        "Status": _field("Status"),
        "BusNumber": _field("BusNumber"),
        "RCNO": _field("RCNO"),
        "SeatingCapacity": _int_or_none(_field("SeatingCapacity")),
        "BusType": _field("BusType"),
        "DriverName": _field("DriverName"),
        "DriverContactNumber": _field("DriverContactNumber"),
        "DriverAddress": _field("DriverAddress"),
        "LicenseNumber": _field("LicenseNumber"),
        "ConductorName": _field("ConductorName"),
        "ConductorContact": _field("ConductorContact"),
        "ConductorAddress": _field("ConductorAddress"),
        "LicenseCopy": _field("LicenseCopy"),
        "AadharCardCopy": _field("AadharCardCopy"),
        "ConductorAadhaarCard": _field("ConductorAadhaarCard"),
        "BusRC": _field("BusRC"),
        "PollutionCertificate": _field("PollutionCertificate"),
        "FitnessCertificate": _field("FitnessCertificate"),
        "InsuranceCopy": _field("InsuranceCopy"),
        "PartyId": _int_or_none(party_id),
    }
    if str(action) == "1":
        row = RouteMaster.objects.create(
            CreatedBy=login_id, CreatedDate=timezone.now(), **common)
        return legacy_status_result(str(row.Id))
    if str(action) == "2":
        match = None
        if row_id:
            match = RouteMaster.objects.filter(Id=row_id).first()
        if match is None and common["RouteID"]:
            match = RouteMaster.objects.filter(RouteID=common["RouteID"]).first()
        if match:
            RouteMaster.objects.filter(Id=match.Id).update(
                UpdatedBy=login_id, UpdatedDate=timezone.now(), **common)
            return legacy_status_result("1")
        return legacy_status_result("")
    if row_id:
        RouteMaster.objects.filter(Id=row_id).delete()
    return legacy_status_result("")


# ---------------------------------------------------------------------------
# Diligence (RTL.Usp_Diligence)
# ---------------------------------------------------------------------------


@csrf_exempt
def diligence_check_list(request):
    """POST /api/RetailSection/DiligenceCheckList — diligence rows for a
    store."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    qs = DiligenceChecklist.objects.all()
    store_code = body.get("StoreCode")
    if store_code:
        qs = qs.filter(StoreCode=store_code)
    row_id = _int_or_none(body.get("Id"))
    if row_id:
        qs = qs.filter(Id=row_id)
    docs = {}
    for d in DiligenceDocumentList.objects.all():
        docs.setdefault(d.DiligenceId, []).append(d)
    rows = [
        {
            "Id": r.Id, "StoreCode": r.StoreCode,
            "DiligenceName": r.DiligenceName,
            "DiligenceAssigned": r.DiligenceAssigned,
            "Diligencedate": r.Diligencedate,
            "Note": r.Note,
            "Documents": [
                {
                    "Id": d.Id, "DocumentName": d.DocumentName,
                    "UploadFile": d.UploadFile, "uploadOn": d.uploadOn,
                    "uploadedby": d.uploadedby, "Status": d.Status,
                }
                for d in docs.get(r.Id, [])
            ],
        }
        for r in qs.order_by("-Id")[:1000]
    ]
    return legacy_json_string(rows)


@csrf_exempt
def iud_diligence_check_list(request):
    """POST /api/RetailSection/IUDDiligenceCheckList — RTL.Usp_Diligence IUD."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    action = _int_or_none(body.get("Action")) or 1
    row_id = _int_or_none(body.get("Id"))
    login_id = _login_id(request)
    store_code = body.get("StoreCode")
    doc_name = body.get("DocumentName")

    common = {
        "StoreCode": store_code,
        "DiligenceName": body.get("DiligenceName"),
        "DiligenceAssigned": body.get("DiligenceAssigned"),
        "Diligencedate": body.get("Diligencedate"),
    }
    if action == 1:
        row = DiligenceChecklist.objects.create(**common)
        if doc_name:
            DiligenceDocumentList.objects.create(
                StoreCode=store_code, DocumentName=doc_name,
                DiligenceId=row.Id, uploadedby=login_id,
                UploadFile=body.get("UploadFile"),
                Status=body.get("Status") or "Pending",
            )
        return legacy_status_result(str(row.Id))
    if action == 2 and row_id:
        DiligenceChecklist.objects.filter(Id=row_id).update(**common)
        if doc_name:
            DiligenceDocumentList.objects.create(
                StoreCode=store_code, DocumentName=doc_name,
                DiligenceId=row_id, uploadedby=login_id,
                UploadFile=body.get("UploadFile"),
                Status=body.get("Status") or "Pending",
            )
        return legacy_status_result("1")
    if row_id:
        DiligenceChecklist.objects.filter(Id=row_id).delete()
        DiligenceDocumentList.objects.filter(DiligenceId=row_id).delete()
    return legacy_status_result("")


# ---------------------------------------------------------------------------
# Vendor registration (USP_VendorRegistration)
# ---------------------------------------------------------------------------


def _vendor_register(request, body):
    action = str(body.get("Action") or "1")
    row_id = _int_or_none(body.get("Id"))
    login_raw = body.get("UserId") or body.get("LoginId") or _login_id(request)
    try:
        login_id = int(login_raw)
    except (TypeError, ValueError):
        login_id = None
    file_fields = [f"File{i}" for i in range(1, 22)] + ["file22", "file23", "file24"]
    data = {
        "AgencyName": body.get("AgencyName"),
        "RegisteredAddress": body.get("RegisteredAddress"),
        "CorporateAddress": body.get("CorporateAddress"),
        "ContactPerson": body.get("ContactPerson"),
        "Designation": body.get("Designation"),
        "Mobile": body.get("Mobile"),
        "Email": body.get("Email"),
        "Website": body.get("Website"),
        "YearEstablishment": body.get("Year"),
        "Organization": body.get("Organization"),
        "PanNo": body.get("PanNo"),
        "Tan": body.get("Tan"),
        "GSTIN": body.get("GSTIN"),
        "CIN": body.get("CIN"),
        "SHOPREGI": body.get("SHOPREGI"),
        "MSME": body.get("MSME"),
        "EPFREGNO": body.get("EPFREGNO"),
        "ESICREGNO": body.get("ESICREGNO"),
        "ProfessionalREGNO": body.get("ProfessionalREGNO"),
        "LabourREGNO": body.get("LabourREGNO"),
        "ContractREGNO": body.get("ContractREGNO"),
        "LabourLicenseNO": body.get("LabourLicenseNO"),
        "LicenseValidity": body.get("LicenseValidity"),
        "LicenseEmployeeCount": body.get("LicenseEmployeeCount"),
        "BankName": body.get("BankName"),
        "AccountNumber": body.get("AccountNumber"),
        "IFSCCode": body.get("IFSCCode"),
        "Service": body.get("Service"),
        "Industries": body.get("Industries"),
        "TotalEmployees": body.get("TotalEmployees"),
        "OperationalLocations": body.get("OperationalLocations"),
        "YearsOfExperience": body.get("YearsOfExperience"),
        "KeyClients": body.get("KeyClients"),
        "SimilarContracts": body.get("SimilarContracts"),
        "NameOrganization1": body.get("NameOrganization1"),
        "ServiceType1": body.get("ServiceType1"),
        "ConcernPerson1": body.get("ConcernPerson1"),
        "Designation1": body.get("Designation1"),
        "MobileNo1": body.get("MobileNo1"),
        "EmailId1": body.get("EmailId1"),
        "NameOrganization2": body.get("NameOrganization2"),
        "ServiceType2": body.get("ServiceType2"),
        "ConcernPerson2": body.get("ConcernPerson2"),
        "Designation2": body.get("Designation2"),
        "MobileNo2": body.get("MobileNo2"),
        "EmailId2": body.get("EmailId2"),
        "NameOrganization3": body.get("NameOrganization3"),
        "ServiceType3": body.get("ServiceType3"),
        "ConcernPerson3": body.get("ConcernPerson3"),
        "Designation3": body.get("Designation3"),
        "MobileNo3": body.get("MobileNo3"),
        "EmailId3": body.get("EmailId3"),
        "SignatoryName": body.get("SignatoryName"),
        "SignatoryDesignation": body.get("SignatoryDesignation"),
        "GeneralDate": body.get("GeneralDate"),
        "Country": body.get("Country"),
        "State": body.get("State"),
        "City": body.get("City"),
        "Pincode": body.get("Pincode"),
        "LIN": body.get("LIN"),
        "Industry": body.get("Industry"),
        "Representativename": body.get("Representativename"),
        "RepresentativeDesignation": body.get("RepresentativeDesignation"),
        "RepresentativeMobile": body.get("RepresentativeMobile"),
        "RepresentativeEmail": body.get("RepresentativeEmail"),
    }
    for f in file_fields:
        val = body.get(f)
        if val:
            data[f] = _save_data_uri(val, "VendorRegister")
    uploaded = request.FILES.get("File1")
    if uploaded:
        data["File1"] = _save_upload(request, uploaded, "VendorRegister")
    if action == "1":
        from django.db.models import Max as _Max
        max_id = VendorRegistration.objects.aggregate(m=_Max("Id"))["m"] or 0
        row = VendorRegistration.objects.create(
            Id=max_id + 1,
            LoginId=str(login_id) if login_id is not None else None,
            Createdby=str(login_id) if login_id is not None else None,
            CreatedOn=timezone.now().strftime("%Y-%m-%d %H:%M:%S"), **data)
        return legacy_status_result(str(row.Id))
    if action == "2":
        if not row_id:
            match = VendorRegistration.objects.filter(LoginId=str(login_id)).order_by("-Id").first()
            row_id = match.Id if match else None
        if row_id:
            VendorRegistration.objects.filter(Id=row_id).update(**data)
            return legacy_status_result("1")
    return legacy_status_result("1")


def _save_upload(request, uploaded, folder):
    dirpath = os.path.join(settings.MEDIA_ROOT, folder)
    os.makedirs(dirpath, exist_ok=True)
    fname = f"{uuid.uuid4().hex[:8]}_{uploaded.name}"
    with open(os.path.join(dirpath, fname), "wb") as fh:
        for chunk in uploaded.chunks():
            fh.write(chunk)
    return f"/media/{folder}/{fname}"


@csrf_exempt
def insert_register(request):
    """POST /api/RetailSection/InsertRegister — vendor registration IUD."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    return _vendor_register(request, body)


@csrf_exempt
def upload_vfile(request):
    """POST /api/RetailSection/UploadVfile — vendor registration with an
    uploaded file (InsertRegister + File1)."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    return _vendor_register(request, body)


@csrf_exempt
def search_registration(request):
    """POST /api/RetailSection/SearchRegistration — vendor registration list."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    qs = VendorRegistration.objects.all()
    row_id = _int_or_none(body.get("Id"))
    if row_id:
        qs = qs.filter(Id=row_id)
    login_id = body.get("LoginId") or body.get("UserId")
    if login_id:
        qs = qs.filter(LoginId=str(login_id))
    rows = [
        {
            "Id": r.Id, "AgencyName": r.AgencyName,
            "RegisteredAddress": r.RegisteredAddress,
            "CorporateAddress": r.CorporateAddress,
            "ContactPerson": r.ContactPerson, "Designation": r.Designation,
            "Mobile": r.Mobile, "Email": r.Email, "Website": r.Website,
            "YearEstablishment": r.YearEstablishment,
            "Organization": r.Organization, "PanNo": r.PanNo, "Tan": r.Tan,
            "GSTIN": r.GSTIN, "CIN": r.CIN, "SHOPREGI": r.SHOPREGI,
            "MSME": r.MSME, "EPFREGNO": r.EPFREGNO, "ESICREGNO": r.ESICREGNO,
            "ProfessionalREGNO": r.ProfessionalREGNO,
            "LabourREGNO": r.LabourREGNO, "ContractREGNO": r.ContractREGNO,
            "LabourLicenseNO": r.LabourLicenseNO,
            "LicenseValidity": r.LicenseValidity,
            "LicenseEmployeeCount": r.LicenseEmployeeCount,
            "BankName": r.BankName, "AccountNumber": r.AccountNumber,
            "IFSCCode": r.IFSCCode, "Service": r.Service,
            "Industries": r.Industries, "TotalEmployees": r.TotalEmployees,
            "OperationalLocations": r.OperationalLocations,
            "YearsOfExperience": r.YearsOfExperience,
            "KeyClients": r.KeyClients, "SimilarContracts": r.SimilarContracts,
            "File1": r.File1, "LoginId": r.LoginId, "Createdby": r.Createdby,
            "CreatedOn": r.CreatedOn, "Country": r.Country, "State": r.State,
            "City": r.City, "Pincode": r.Pincode, "LIN": r.LIN,
            "Industry": r.Industry,
        }
        for r in qs.order_by("-Id")[:500]
    ]
    return legacy_json_string(rows)


# ---------------------------------------------------------------------------
# Login redirect (USP_LoginTable LoginVerify)
# ---------------------------------------------------------------------------


@csrf_exempt
def get_redirect(request):
    """POST /api/RetailSection/getredirect — legacy LoginVerify (Action 20
    checks for an active session). Returns an empty array when no active
    session exists for the user."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    action = str(body.get("Action") or "20")
    if action == "20":
        user_id = _int_or_none(body.get("Password"))
        active = False
        if user_id:
            sessions = list(
                LoginTable.objects.filter(LoginId=user_id).values_list("Session", flat=True)[:1]
            )
            if sessions and sessions[0] not in (None, ""):
                active = True
        if active:
            lt = LoginTable.objects.filter(LoginId=user_id).first()
            return legacy_json_string([{"LoginId": "-11", "UserName": lt.UserName if lt else None}])
    return legacy_json_string([])


# ---------------------------------------------------------------------------
# Permission (GetUserPermissionSectionRoll)
# ---------------------------------------------------------------------------


@csrf_exempt
def get_user_permission_section_roll(request):
    """POST /api/RetailSection/GetUserPermissionSectionRoll — page-section
    role permission rows for a user (Id + Action + MapId)."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    user_id = _int_or_none(body.get("Id")) or _login_id(request)
    perms = {p.SectionId: p for p in PagesSectionRolePermission.objects.filter(UserId=user_id)}
    sections = list(PagesSectionMaster.objects.filter(IsDelete=0).order_by("-Id"))
    rows = []
    for s in sections:
        p = perms.get(s.Id)
        rows.append({
            "Id": s.Id,
            "SectionName": s.SectionName,
            "SectionId": s.Id,
            "PageName": s.PageName,
            "Url": s.Url,
            "ViewFlag": bool(p.ViewFlag) if p else False,
            "EditFlag": bool(p.EditFlag) if p else False,
            "DeleteFlag": bool(p.DeleteFlag) if p else False,
            "UploadFlag": bool(p.UploadFlag) if p else False,
            "DownloadFlag": bool(p.DownloadFlag) if p else False,
            "NewStoreFlag": bool(p.NewStoreFlag) if p else False,
            "NewEmployeeFlag": bool(p.NewEmployeeFlag) if p else False,
            "Checkbox1Flag": bool(p.Checkbox1Flag) if p else False,
            "Checkbox2Flag": bool(p.Checkbox2Flag) if p else False,
            "VerifyFlag": bool(p.VerifyFlag) if p else False,
        })
    rows.sort(key=lambda r: r["SectionId"])
    return legacy_json_string(rows)


# ---------------------------------------------------------------------------
# Store licence documents (RTL.Usp_StoreLicences) — InsertUpdateDelStoreDocumentMaster,
# GetStoreDocumentDetails, ApproveLicense, oldUploadDoc.
# ---------------------------------------------------------------------------


def _store_licence_row(r):
    return {
        "Id": r.Id,
        "StoreId": r.StoreId,
        "LicenseId": r.LicenseId,
        "Status": r.Status,
        "IsActive": r.IsActive,
        "DName": r.Dire_Name,
        "DFatherName": r.Dire_FatherName,
        "DAddress": r.Dire_Address,
        "DAadhaarNo": r.Dire_AadhaarNo,
        "DPanNo": r.Dire_PanNo,
        "DDateOfBirth": _fmt_date(r.Dire_DateOfBirth, "%Y-%m-%d") if r.Dire_DateOfBirth else None,
        "DEmailId": r.Dire_EmailId,
        "DMobileNo": r.Dire_MobileNo,
        "AName": r.Auth_Name,
        "AFatherName": r.Auth_FatherName,
        "AAddress": r.Auth_Address,
        "AAadhaarNo": r.Auth_AadhaarNo,
        "APanNo": r.Auth_PanNo,
        "ADateOfBirth": _fmt_date(r.Auth_DateOfBirth, "%Y-%m-%d") if r.Auth_DateOfBirth else None,
        "AEmailId": r.Auth_EmailId,
        "AMobileNo": r.Auth_MobileNo,
        "NatureofBusiness": r.NatureofBusiness,
        "DateofCommencement": _fmt_date(r.DateofCommencement, "%Y-%m-%d") if r.DateofCommencement else None,
        "ProductCategory": r.ProductCategory,
        "AadhaarRegisteredofficeAddressNo": r.AadhaarRegisteredofficeAddressNo,
        "AadhaarCardofDirector": r.AadhaarCardofDirector,
        "PANCardofDirector": r.PANCardofDirector,
        "PassportSizePhoto1": r.PassportSizePhoto1,
        "AuthorizationLetter": r.AuthorizationLetter,
        "AadhaarCardofAuthorized": r.AadhaarCardofAuthorized,
        "PANCard": r.PANCard,
        "PassportSizePhoto2": r.PassportSizePhoto2,
        "ElectricityBill": r.ElectricityBill,
        "SaledeedRentAgreement": r.SaledeedRentAgreement,
        "FSMSPlan": r.FSMSPlan,
        "FormIX": r.FormIX,
        "WaterTestReport": r.WaterTestReport,
        "RequestedDate": r.RequestedDate,
        "CreatedBy": r.CreatedBy,
        "Createdon": r.Createdon,
        "ValidLicense": r.ValidLicense,
    }


@csrf_exempt
def insert_update_del_store_document_master(request):
    """POST /api/RetailSection/InsertUpdateDelStoreDocumentMaster —
    RTL.Usp_StoreLicences IUD (store licence director/authorisation data).
    ActionType 1/2=save, 3=delete."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    action = _int_or_none(body.get("ActionType")) or 1
    row_id = _int_or_none(body.get("Id"))
    store_id = _int_or_none(body.get("StoreId"))
    license_id = _int_or_none(body.get("LicenseId"))
    login_id = _login_id(request) or _int_or_none(body.get("LoginId"))
    data = {
        "StoreId": store_id,
        "LicenseId": license_id,
        "Dire_Name": body.get("DName"),
        "Dire_FatherName": body.get("DFatherName"),
        "Dire_Address": body.get("DAddress"),
        "Dire_AadhaarNo": body.get("DAadhaarNo"),
        "Dire_PanNo": body.get("DPanNo"),
        "Dire_DateOfBirth": _parse_date(body.get("DDateOfBirth")),
        "Dire_EmailId": body.get("DEmailId"),
        "Dire_MobileNo": body.get("DMobileNo"),
        "Auth_Name": body.get("AName"),
        "Auth_FatherName": body.get("AFatherName"),
        "Auth_Address": body.get("AAddress"),
        "Auth_AadhaarNo": body.get("AAadhaarNo"),
        "Auth_PanNo": body.get("APanNo"),
        "Auth_DateOfBirth": _parse_date(body.get("ADateOfBirth")),
        "Auth_EmailId": body.get("AEmailId"),
        "Auth_MobileNo": body.get("AMobileNo"),
        "NatureofBusiness": body.get("NatureofBusiness"),
        "DateofCommencement": _parse_date(body.get("DateofCommencement")),
        "ProductCategory": body.get("ProductCategory"),
        "AadhaarRegisteredofficeAddressNo": body.get("AadhaarRegisteredofficeAddressNo"),
        "AadhaarCardofDirector": body.get("AadhaarCardofDirector"),
        "PANCardofDirector": body.get("PANCardofDirector"),
        "PassportSizePhoto1": body.get("PassportSizePhoto1"),
        "AuthorizationLetter": body.get("AuthorizationLetter"),
        "AadhaarCardofAuthorized": body.get("AadhaarCardofAuthorized"),
        "PANCard": body.get("PANCard"),
        "PassportSizePhoto2": body.get("PassportSizePhoto2"),
        "ElectricityBill": body.get("ElectricityBill"),
        "SaledeedRentAgreement": body.get("SaledeedRentAgreement"),
        "FSMSPlan": body.get("FSMSPlan"),
        "FormIX": body.get("FormIX"),
        "WaterTestReport": body.get("WaterTestReport"),
        "IsActive": _to_bool(body.get("IsActive"), True),
    }
    if action in (1, 2):
        if row_id and StoreLicences.objects.filter(Id=row_id).exists():
            StoreLicences.objects.filter(Id=row_id).update(
                ModifiedBy=login_id, ModifiedOn=timezone.now(), **data)
            return legacy_status_result(str(row_id))
        row = StoreLicences.objects.create(
            Id=next_id(StoreLicences),
            CreatedBy=login_id, Createdon=timezone.now(), RequestedDate=timezone.now(),
            **data)
        return legacy_status_result(str(row.Id))
    if row_id:
        StoreLicences.objects.filter(Id=row_id).delete()
    return legacy_status_result("")


@csrf_exempt
def get_store_document_details(request):
    """POST /api/RetailSection/GetStoreDocumentDetails — RTL.Usp_StoreLicences
    detail (store licence document rows)."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    qs = StoreLicences.objects.all()
    row_id = _int_or_none(body.get("Id"))
    store_id = _int_or_none(body.get("StoreId"))
    license_id = _int_or_none(body.get("LicenseId"))
    if row_id:
        qs = qs.filter(Id=row_id)
    if store_id:
        qs = qs.filter(StoreId=store_id)
    if license_id:
        qs = qs.filter(LicenseId=license_id)
    return legacy_json_string([_store_licence_row(r) for r in qs[:1000]])


@csrf_exempt
def approve_license(request):
    """POST /api/RetailSection/ApproveLicense — RTL.Usp_StoreLicences approve."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    row_id = _int_or_none(body.get("Id"))
    store_id = _int_or_none(body.get("StoreId"))
    license_id = _int_or_none(body.get("LicenseId"))
    qs = StoreLicences.objects.all()
    if row_id:
        qs = qs.filter(Id=row_id)
    elif store_id:
        qs = qs.filter(StoreId=store_id, LicenseId=license_id)
    qs.update(Status=1, IsActive=True, ModifiedOn=timezone.now())
    return legacy_status_result("1")


@csrf_exempt
def old_upload_doc(request):
    """POST /api/RetailSection/oldUploadDoc — RTL.Usp_StoreLicences upload.
    ActionType 10 verifies the store-license link (returns '1' if valid)."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    action = _int_or_none(body.get("ActionType"))
    store_id = _int_or_none(body.get("StoreId"))
    license_id = _int_or_none(body.get("LicenseId"))
    row_id = _int_or_none(body.get("Id"))
    ufile = _save_data_uri(body.get("UFile"), "StoreLicDocument")
    qs = StoreLicences.objects.all()
    if row_id:
        qs = qs.filter(Id=row_id)
    elif store_id:
        qs = qs.filter(StoreId=store_id)
    if action == 10:
        return legacy_status_result("1" if qs.exists() else "0")
    if action == 1:
        if ufile:
            qs.update(ModifiedOn=timezone.now())
        return legacy_status_result("1")
    if action == 2 and ufile:
        qs.update(ModifiedOn=timezone.now())
        return legacy_status_result("1")
    return legacy_status_result("")


# ---------------------------------------------------------------------------
# License request (RTL.USP_LicenceRequest) — InsertUpdateDelLicenseRequest,
# LicenseRequestData, ReportLicenseRequestData, ApprovalUpdate.
# ---------------------------------------------------------------------------


def _licence_request_row(r):
    return {
        "Id": r.Id,
        "LicenceRequestId": r.Id,
        "StoreLicenceId": r.StoreLicenceId,
        "ApplicationStatus": r.ApplicationStatus,
        "ApplicationDate": r.ApplicationDate,
        "UploadApplicationCopy": r.UploadApplicationCopy,
        "UploadChallanCopy": r.UploadChallanCopy,
        "UploadFeesCopy": r.UploadFeesCopy,
        "LicenseStatus": r.LicenseStatus,
        "LicenseDate": r.LicenseDate,
        "LicenseNumber": r.LicenseNumber,
        "MachineNumber": r.MachineNumber,
        "ValidityStartDate": r.ValidityStartDate,
        "ValidityEndDate": r.ValidityEndDate,
        "UploadLicenseCopy": r.UploadLicenseCopy,
        "RenewalStatus": r.RenewalStatus,
        "RenewalStartDate": r.RenewalStartDate,
        "RenewalEndDate": r.RenewalEnddate,
        "UploadRenewedCopy": r.UploadRenewedCopy,
        "UserName": r.UserName,
        "Remark": r.Remark,
        "UserPassword": r.UserPassword,
        "MobileNumber": r.MobileNumber,
        "EmailId": r.EmailId,
        "TentativeDateofComp": r.TentativeDateofComp,
        "InvoiceStatus": r.InvoiceStatus,
        "InvoiceDate": r.InvoiceDate,
        "InvoiceNo": r.InvoiceNo,
        "InvoiceAmount": r.InvoiceAmount,
        "UploadInvoice": r.UploadInvoice,
        "PaymentStatus": r.PaymentStatus,
        "PaymentTAT": r.PaymentTAT,
        "PaymentDuedate": r.PaymentDuedate,
        "PaymentOverDueDate": r.PaymentOverDueDate,
        "ActualCost": r.ActualCost,
        "GovtFees": r.GovtFees,
        "LicenseCategory": r.LicenseCategory,
        "UploadAcknowledgement": r.UploadAcknowledgement,
        "UploadAmendmentCopy": r.UploadAmendmentCopy,
        "LStatus": r.LStatus,
    }


@csrf_exempt
def insert_update_del_license_request(request):
    """POST /api/RetailSection/InsertUpdateDelLicenseRequest —
    RTL.USP_LicenceRequest IUD (Action 1=insert, 2=update, 3=delete)."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    action = _int_or_none(body.get("Action")) or 1
    row_id = _int_or_none(body.get("LicenceRequestId")) or _int_or_none(body.get("Id"))
    user_id = _int_or_none(body.get("UserId")) or _login_id(request)
    data = {
        "ApplicationStatus": body.get("ApplicationStatus"),
        "ApplicationDate": body.get("ApplicationDate"),
        "UploadApplicationCopy": body.get("UploadApplicationCopy"),
        "UploadChallanCopy": body.get("UploadChallanCopy"),
        "UploadFeesCopy": body.get("UploadFeesCopy"),
        "LicenseStatus": body.get("LicenseStatus"),
        "LicenseDate": body.get("LicenseDate") or body.get("IssuedDate"),
        "LicenseNumber": body.get("LicenseNumber"),
        "MachineNumber": body.get("MachineNumber"),
        "ValidityStartDate": body.get("ValidityStartDate"),
        "ValidityEndDate": body.get("ValidityEndDate"),
        "LicenseCategory": body.get("LicenseCategory"),
        "UploadLicenseCopy": body.get("UploadLicenseCopy"),
        "UploadAcknowledgement": body.get("UploadAcknowledgement"),
        "UploadAmendmentCopy": body.get("UploadAmendmentCopy"),
        "RenewalStatus": body.get("RenewalStatus"),
        "RenewalStartDate": body.get("RenewalStartDate"),
        "RenewalEnddate": body.get("RenewalEndDate") or body.get("RenewalEnddate"),
        "UploadRenewedCopy": body.get("UploadRenewedCopy"),
        "UserName": body.get("UserName"),
        "Remark": body.get("Remark"),
        "UserPassword": body.get("UserPassword"),
        "MobileNumber": body.get("MobileNumber"),
        "EmailId": body.get("EmailId"),
        "TentativeDateofComp": body.get("TentativeDateofComp"),
        "InvoiceStatus": body.get("InvoiceStatus"),
        "InvoiceDate": body.get("InvoiceDate"),
        "InvoiceNo": body.get("InvoiceNo"),
        "InvoiceAmount": body.get("InvoiceAmount"),
        "UploadInvoice": body.get("UploadInvoice"),
        "PaymentStatus": body.get("PaymentStatus"),
        "PaymentTAT": body.get("PaymentTAT"),
        "ActualCost": body.get("ActualCost"),
        "GovtFees": body.get("GovtFees"),
    }
    if action == 1:
        row = LicenceRequest.objects.create(
            Id=next_id(LicenceRequest),
            StoreLicenceId=_int_or_none(body.get("StoreLicenceId")) or store_licence_id(body, user_id),
            ModifiedOn=timezone.now(), **data)
        return legacy_status_result(str(row.Id))
    if action == 2 and row_id:
        LicenceRequest.objects.filter(Id=row_id).update(
            ModifyBy=user_id, ModifiedOn=timezone.now(), **data)
        return legacy_status_result("1")
    if row_id:
        LicenceRequest.objects.filter(Id=row_id).delete()
    return legacy_status_result("")


def store_licence_id(body, user_id):
    return _int_or_none(body.get("StoreLicenceId"))


@csrf_exempt
def license_request_data(request):
    """POST /api/RetailSection/LicenseRequestData — RTL.USP_LicenceRequest list.
    Action 4/6/11/12/13 = searches."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    action = _int_or_none(body.get("Action"))
    user_id = _int_or_none(body.get("UserId")) or _login_id(request)
    qs = LicenceRequest.objects.all()
    if body.get("LicenceId") or body.get("LicenceRequestId"):
        qs = qs.filter(Id=_int_or_none(body.get("LicenceId")) or _int_or_none(body.get("LicenceRequestId")))
    if body.get("Searchby"):
        qs = qs.filter(LicenseNumber__icontains=body.get("Searchby"))
    if action in (11, 12, 13):
        qs = qs.filter(ApplicationStatus=str(action))
    rows = list(qs.order_by("-Id")[:2000])
    return legacy_json_string([_licence_request_row(r) for r in rows])


@csrf_exempt
def report_license_request_data(request):
    """POST /api/RetailSection/ReportLicenseRequestData — RTL.USP_LicenceRequest
    report list filtered by status codes."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    qs = LicenceRequest.objects.all()
    if body.get("ApplicationStatus"):
        qs = qs.filter(ApplicationStatus=body.get("ApplicationStatus"))
    if body.get("LicenseStatus"):
        qs = qs.filter(LicenseStatus=body.get("LicenseStatus"))
    if body.get("RenewalStatus"):
        qs = qs.filter(RenewalStatus=body.get("RenewalStatus"))
    rows = list(qs.order_by("-Id")[:2000])
    return legacy_json_string([_licence_request_row(r) for r in rows])


@csrf_exempt
def approval_update(request):
    """POST /api/RetailSection/ApprovalUpdate — RTL.USP_LicenceRequest
    approval status update (Action 5 approve, 9 reject)."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    action = _int_or_none(body.get("Action"))
    row_id = _int_or_none(body.get("LicenceRequestId")) or _int_or_none(body.get("Id"))
    if row_id:
        status = "Approved" if action in (5, 9) else None
        LicenceRequest.objects.filter(Id=row_id).update(
            ApplicationStatus=status if status else None,
            LStatus=action,
            ModifiedOn=timezone.now(),
        )
    return legacy_status_result("1")


# ---------------------------------------------------------------------------
# CrossCheck (RTL.USP_ROLEMANAGE) — compliance-doc cross check.
# ---------------------------------------------------------------------------


@csrf_exempt
def cross_check(request):
    """POST /api/RetailSection/CrossCheck — RTL.USP_ROLEMANAGE document cross
    check (StoreComplianceDocument rows for a store/licence)."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    row_id = _int_or_none(body.get("Id"))
    store_id = _int_or_none(body.get("StoreId"))
    qs = StoreComplianceDocument.objects.all()
    if row_id:
        qs = qs.filter(Id=row_id)
    if store_id:
        qs = qs.filter(StoreId=store_id)
    return legacy_json_string([
        {
            "Id": r.Id,
            "StoreId": r.StoreId,
            "DId": r.DId,
            "StatusYN": r.StatusYN,
            "UserId": r.UserId,
            "DocumentPath": r.DocumentPath,
            "Verify": r.Verify,
            "CreatedOn": r.CreatedOn,
            "IsDefault": r.IsDefault,
        }
        for r in qs[:1000]
    ])
