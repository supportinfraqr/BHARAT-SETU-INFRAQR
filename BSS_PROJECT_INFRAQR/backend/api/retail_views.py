"""Phase 7 — Compliance calendar + statutory family (RetailController.cs).

Ports the legacy compliance/statutory/factory/labour/secretarial/financial
data actions on top of the migrated RTL.* Postgres tables. Mirrors the legacy
contracts:

  * Search actions -> raw JSON array body (legacy_json_string)
  * IUD actions    -> {"status": True, "Result": <scalar>}
  * All require an authenticated session (X-Legacy-Login-Id).
"""
from datetime import datetime, timezone as dt_timezone

from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt

from legacy.models import (
    BoardingMapping,
    ClientFactoryStatutoryInternal,
    ClientFactoryStatutoryInternalEvent,
    ClientFinancialStatutoryInternal,
    ClientFinancialStatutoryInternalNewEvent,
    ClientLabourCodeInternal,
    ClientSecretarialStatutoryInternal,
    ClientStatutoryInternal,
    ClientStatutoryInternalEvents,
    Industry,
    IndustryMapping,
    LoginTable,
    PartyMaster,
    RetailActCalender,
    RetailActMaster,
    RetailFactoryCompliance,
    RetailFinacialActCalender,
    RetailLabourCodeCompliance,
    State,
    StatutoryFinancialSetup,
    StatutorySecretarialSetup,
    StatutorySetup,
    Subsidiary,
)

from .views import (
    _fmt_date,
    _int_or_none,
    _login_id,
    _parse_date,
    _request_params,
    legacy_json_string,
    legacy_status_result,
    session_expired,
)


# ---------------------------------------------------------------------------
# shared helpers
# ---------------------------------------------------------------------------


def _month_name(value):
    names = ["", "January", "February", "March", "April", "May", "June",
             "July", "August", "September", "October", "November", "December"]
    try:
        idx = int(value)
        return names[idx] if 1 <= idx <= 12 else value
    except (TypeError, ValueError):
        return value


def _local_date(value):
    """Format a calendar datetime as YYYY-MM-DD. Columns are stored as
    `timestamp without time zone`, so values read back naive (already local).
    Aware values (from _parse_date writes) are converted to Asia/Kolkata."""
    if value is None:
        return None
    if isinstance(value, datetime) and timezone.is_aware(value):
        value = timezone.localtime(value)
    return _fmt_date(value, "%Y-%m-%d")


def _state_name_map():
    return {s.SATE_CODE: s.STATE_NM for s in State.objects.all()}


def _act_calendar_row(r, state_map=None):
    """One search row for a compliance-calendar record."""
    if state_map is None:
        state_map = _state_name_map()
    return {
        "CACId": r.Id,
        "ROWId": r.Id,
        "Id": r.Id,
        "State": r.State,
        "STATE_NM": state_map.get(r.State) if r.State is not None else None,
        "Act": r.Act,
        "ActName": r.Act,
        "Constitution": r.Constitution,
        "Department": r.Department,
        "Month": r.Month,
        "MonthName": _month_name(r.Month),
        "Year": r.Year,
        "Frequency": r.Frequency,
        "Ministry": r.Ministry,
        "ComplianceName": r.ComplianceName,
        "Calendartype": r.Calendartype,
        "Risk": r.Risk,
        "ComplianceType": r.ComplianceType,
        "Description": r.Description,
        "Expire": r.Expire,
        "DueDate": _local_date(r.DueDate),
        "DueDay": r.DueDay,
        "selectedCategory": r.selectedCategory,
        "selectedSubcategory": r.selectedSubcategory,
        "ComplianceLevel": r.ComplianceLevel,
        "Rules": getattr(r, "Rules", None),
        "Section": getattr(r, "Section", None),
        "FormNo": getattr(r, "FormNo", None),
        "IndustryId": r.Industry,
        "Industry": r.Industry,
        "ExcelFile": r.excelFile,
        "UploadFile": r.UploadFile,
        "ActOverview": r.ActOverview,
    }


def _model_fields_only(model, data):
    """Keep only keys that are actual columns on the model."""
    allowed = {f.name for f in model._meta.fields}
    return {k: v for k, v in data.items() if k in allowed}


def _statutory_row(r, cal, state_map):
    """One search row for a client statutory-internal record, enriched from
    the linked act-calendar row (Act/ComplianceName/State/Month/Year)."""
    row = {
        "Id": r.Id,
        "CACId": r.CACId,
        "SetupId": r.SetupId,
        "ASD": _fmt_date(r.ASD, "%Y-%m-%d") if r.ASD else None,
        "ActualSubmissionDate": _fmt_date(r.ASD, "%Y-%m-%d") if r.ASD else None,
        "CSD": _fmt_date(r.CSD, "%Y-%m-%d") if r.CSD else None,
        "ComplianceSubmissionDate": _fmt_date(r.CSD, "%Y-%m-%d") if r.CSD else None,
        "RegNo": r.RegNo,
        "RegistrationNumber": r.RegNo,
        "DelayDay": r.DelayDay,
        "DelayDays": r.DelayDay,
        "UploadFile": r.UploadFile,
        "Status": r.Status,
        "CStatus": r.Status,
        "VRemark": r.VRemark,
        "VRemark1": r.VRemark,
        "CRemark": r.CRemark,
        "CRemark1": r.CRemark,
        "IsVerified": r.IsVerified,
        "Createdby": r.Createdby,
        "CreateOn": r.CreateOn,
    }
    if cal is not None:
        row.update({
            "State": cal.State,
            "STATE_NM": state_map.get(cal.State) if cal.State is not None else None,
            "Act": cal.Act,
            "ComplianceName": cal.ComplianceName,
            "Month": cal.Month,
            "Year": cal.Year,
            "DueDate": _local_date(cal.DueDate),
            "Rules": getattr(cal, "Rules", None),
            "Section": getattr(cal, "Section", None),
            "FormNo": getattr(cal, "FormNo", None),
            "Risk": cal.Risk,
            "Description": cal.Description,
            "selectedCategory": cal.selectedCategory,
            "selectedSubcategory": cal.selectedSubcategory,
        })
    return row


def _statutory_search(model, params, cal_model=RetailActCalender):
    """Join client statutory-internal rows to their act-calendar entries and
    apply the legacy Action/Year/Month/State/CACId/UserId filters."""
    action = _int_or_none(params.get("Action"))
    user_id = _int_or_none(params.get("Id")) or _int_or_none(params.get("UserId"))
    year = params.get("Year")
    month = params.get("Month")
    state = params.get("State")
    cac_id = params.get("CACId")
    qs = model.objects.all()
    if user_id:
        qs = qs.filter(Createdby=user_id)
    if cac_id:
        qs = qs.filter(CACId=cac_id)
    rows = list(qs)
    cac_ids = {r.CACId for r in rows if r.CACId}
    cal_map = {}
    if cac_ids:
        for c in cal_model.objects.filter(Id__in=cac_ids):
            cal_map[c.Id] = c
    state_map = _state_name_map()
    out = []
    for r in rows:
        c = cal_map.get(r.CACId)
        if c:
            if state and str(c.State) != str(state):
                continue
            if year and str(c.Year) != str(year):
                continue
            if month and str(c.Month) != str(month):
                continue
        elif state or year or month:
            continue
        out.append(_statutory_row(r, c, state_map))
    return out


def _iud_internal(model, body, login_id):
    """IUD for the client statutory-internal tables (usp_Client*Statutory*)."""
    action = _int_or_none(body.get("Action")) or 1
    row_id = body.get("Id")
    created_by = _int_or_none(body.get("Createdby")) or login_id
    user_id = _int_or_none(body.get("UserId")) or created_by
    data = {
        "CACId": _int_or_none(body.get("CACId")),
        "ASD": _parse_date(body.get("ASD")),
        "CSD": _parse_date(body.get("CSD")),
        "RegNo": body.get("RegNo"),
        "DelayDay": _int_or_none(body.get("DelayDay")),
        "UploadFile": body.get("UploadFile"),
        "Status": body.get("Status"),
        "VRemark": body.get("VRemark"),
        "CRemark": body.get("CRemark"),
        "IsVerified": body.get("IsVerified"),
        "Createdby": created_by,
        "ClientId": user_id,
    }
    if action == 1:
        row = model.objects.create(CreateOn=timezone.now(), **data)
        return legacy_status_result(str(row.Id))
    if action == 2:
        if row_id:
            model.objects.filter(Id=row_id).update(**data)
            return legacy_status_result("1")
        model.objects.filter(CACId=data["CACId"], Createdby=created_by).update(**data)
        return legacy_status_result("1")
    if row_id:
        model.objects.filter(Id=row_id).delete()
    return legacy_status_result("")


def _calendar_base_data(body):
    """Common field map for the compliance-calendar IUD actions."""
    due = _parse_date(body.get("DueDate"))
    if due is not None:
        # Legacy stores the wall-clock midnight verbatim in the
        # `timestamp without time zone` column; write it as the UTC value so
        # Django stores exactly that wall time (no +5:30 shift).
        due = timezone.make_aware(
            datetime.combine(due, datetime.min.time()), dt_timezone.utc)
    return {
        "State": _int_or_none(body.get("State")),
        "Act": body.get("Act"),
        "Constitution": body.get("Constitution"),
        "Department": body.get("Department"),
        "Month": body.get("Month"),
        "Year": body.get("Year"),
        "Frequency": body.get("Frequency"),
        "Ministry": body.get("Ministry"),
        "ComplianceName": body.get("ComplianceName"),
        "Calendartype": body.get("Calendartype"),
        "Risk": body.get("Risk"),
        "ComplianceType": body.get("ComplianceType"),
        "Description": body.get("Description"),
        "ActOverview": body.get("ActOverview"),
        "DueDate": due,
        "UploadFile": body.get("UploadFile"),
        "excelFile": body.get("excelFile") or body.get("ExcelFile"),
        "Industry": _int_or_none(body.get("Industry")),
        "selectedCategory": body.get("selectedCategory"),
        "selectedSubcategory": body.get("selectedSubcategory"),
        "DueDay": body.get("DueDay"),
        "Expire": body.get("Expire"),
        "ComplianceLevel": body.get("ComplianceLevel"),
        "Rules": body.get("Rule") or body.get("Rules"),
        "Section": body.get("Section"),
        "FormNo": body.get("FormNo"),
        "currDate": body.get("currDate"),
    }


def _iud_calendar(model, body, login_id):
    """Insert (1) / update (2) / delete (3) on a compliance-calendar table."""
    action = _int_or_none(body.get("Action")) or 1
    row_id = _int_or_none(body.get("Id"))
    data = _model_fields_only(model, _calendar_base_data(body))
    if action == 1:
        row = model.objects.create(Createdon=timezone.now(), **data)
        return legacy_status_result(str(row.Id))
    if action == 2:
        if row_id:
            model.objects.filter(Id=row_id).update(**data)
            return legacy_status_result("1")
        return legacy_status_result("")
    if row_id:
        model.objects.filter(Id=row_id).delete()
    return legacy_status_result("")


# ---------------------------------------------------------------------------
# RetailCreateActCalender family (RTL.USP_CreateActCalender)
# ---------------------------------------------------------------------------


@csrf_exempt
def iud_retail_create_act_calender(request):
    """POST /api/Retail/IUDRetailCreateActCalender — compliance calendar IUD."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    login_id = _login_id(request)
    return _iud_calendar(RetailActCalender, body, login_id)


@csrf_exempt
def iud_actoverview(request):
    """POST /api/Retail/IUDActoverview — same USP as the calendar IUD. Action 9
    saves the ActOverview (frontend posts it as Description), Action 3 deletes."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    login_id = _login_id(request)
    action = _int_or_none(body.get("Action"))
    if action == 9:
        row_id = _int_or_none(body.get("Id"))
        RetailActCalender.objects.filter(Id=row_id).update(
            ActOverview=body.get("Description") or body.get("ActOverview"),
        )
        return legacy_status_result("1")
    if action == 3:
        RetailActCalender.objects.filter(Id=body.get("Id")).delete()
        return legacy_status_result("")
    return _iud_calendar(RetailActCalender, body, login_id)


@csrf_exempt
def search_retail_create_act_calender(request):
    """POST /api/Retail/SearchRetailCreateActCalender — calendar list (Action 4
    returns all; other actions filter by UserId)."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    action = _int_or_none(body.get("Action"))
    user_id = _int_or_none(body.get("UserId")) or _login_id(request)
    state_map = _state_name_map()
    qs = RetailActCalender.objects.all()
    if user_id:
        qs = qs.filter(Createdon__isnull=False)
    if action == 4:
        qs = qs.order_by("-Id")
    rows = [_act_calendar_row(r, state_map) for r in qs[:1000]]
    return legacy_json_string(rows)


@csrf_exempt
def search_retail_create_industry(request):
    """POST /api/Retail/SearchRetailCreateIndustry — Action 8 = industry list,
    Action 11 = financial-year list."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    action = str(body.get("Action") or "8")
    if action == "11":
        years = (RetailActCalender.objects.order_by("Year")
                 .values_list("Year", flat=True).distinct()[:20])
        return legacy_json_string([{"FyId": y} for y in years if y])
    rows = list(Industry.objects.values("Id", "Industry", "Act"))
    return legacy_json_string(rows)


@csrf_exempt
def insert_retail_create_industry(request):
    """POST /api/Retail/InsertRetailCreateIndustry — upsert Industry/Act on a
    calendar record (or insert a bare record when Id is absent)."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    action = _int_or_none(body.get("Action")) or 1
    row_id = _int_or_none(body.get("Id"))
    industry = _int_or_none(body.get("Industry"))
    act = body.get("Act")
    if action == 1 and not row_id:
        row = RetailActCalender.objects.create(
            Industry=industry, Act=act, Createdon=timezone.now())
        return legacy_status_result(str(row.Id))
    if row_id:
        RetailActCalender.objects.filter(Id=row_id).update(
            Industry=industry, Act=act)
        return legacy_status_result("1")
    return legacy_status_result("")


@csrf_exempt
def insert_create_overview(request):
    """POST /api/Retail/InsertCreateOverview — write ActOverview on a calendar
    record (frontend posts Id + Description/ActOverview)."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    row_id = _int_or_none(body.get("Id"))
    if row_id:
        RetailActCalender.objects.filter(Id=row_id).update(
            ActOverview=body.get("ActOverview") or body.get("Description"))
        return legacy_status_result("1")
    return legacy_status_result("")


# ---------------------------------------------------------------------------
# Industry mapping (RTL.USP_IndustryMapping)
# ---------------------------------------------------------------------------


@csrf_exempt
def inu_industry_mapping(request):
    """POST /api/Retail/INUIndustryMapping — Action 1=insert, 2=update,
    3=delete on the party/user <-> industry mapping."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    action = _int_or_none(body.get("Action")) or 1
    row_id = _int_or_none(body.get("Id"))
    party_id = _int_or_none(body.get("ClientId")) or _int_or_none(body.get("PartyId"))
    user_id = _int_or_none(body.get("UserId"))
    industry = _int_or_none(body.get("Industry"))
    if action == 1:
        row = IndustryMapping.objects.create(
            PartyId=party_id, UserId=user_id, Industry=industry)
        return legacy_status_result(str(row.Id))
    if action == 2:
        IndustryMapping.objects.filter(Id=row_id).update(
            PartyId=party_id, UserId=user_id, Industry=industry)
        return legacy_status_result("1")
    IndustryMapping.objects.filter(Id=row_id).delete()
    return legacy_status_result("")


@csrf_exempt
def search_mapping(request):
    """POST /api/Retail/SearchMapping — list industry mappings with party/user
    names (Action 4)."""
    if not request.user.is_authenticated:
        return session_expired()
    rows = list(IndustryMapping.objects.all())
    party_map = {p.PartyId: p.PartyName for p in PartyMaster.objects.all()}
    login_map = {l.LoginId: l for l in LoginTable.objects.all()}
    ind_map = {i.Id: i.Industry for i in Industry.objects.all()}
    result = []
    for r in rows:
        lt = login_map.get(r.UserId)
        result.append({
            "Id": r.Id,
            "PartyId": r.PartyId,
            "PartyName": party_map.get(r.PartyId),
            "LoginId": r.UserId,
            "UserName": lt.UserName if lt else None,
            "IndustryId": r.Industry,
            "Industry": ind_map.get(r.Industry),
        })
    return legacy_json_string(result)


# ---------------------------------------------------------------------------
# Statutory family (RTL.USP_Statutory / USP_StatutoryInternal)
# ---------------------------------------------------------------------------


@csrf_exempt
def iud_statutory(request):
    """POST /api/Retail/IUDStatutory — insert/update/delete client statutory
    internal rows (usp_ClientStatutoryInternal)."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    return _iud_internal(ClientStatutoryInternal, body, _login_id(request))


@csrf_exempt
def iud_statutory_internal(request):
    """POST /api/Retail/IUDStatutoryInternal — USP_StatutoryInternal IUD."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    return _iud_internal(ClientStatutoryInternal, body, _login_id(request))


@csrf_exempt
def search_statutory(request):
    """POST /api/Retail/SearchStatutory — client statutory list (Action 11)."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    return legacy_json_string(_statutory_search(ClientStatutoryInternal, body))


@csrf_exempt
def search_statutory_internal(request):
    """POST /api/Retail/SearchStatutoryInternal — USP_StatutoryInternal list."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    return legacy_json_string(_statutory_search(ClientStatutoryInternal, body))


@csrf_exempt
def category_statutory(request):
    """POST /api/Retail/CategoryStatutory — Action 7 with Id=CACId returns the
    act-calendar detail for the selected compliance."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    action = _int_or_none(body.get("Action"))
    if action == 7:
        c = RetailActCalender.objects.filter(Id=body.get("Id")).first()
        if c:
            return legacy_json_string([{
                "CACId": c.Id,
                "Act": c.Act,
                "ComplianceName": c.ComplianceName,
                "Rules": c.Rules,
                "Section": c.Section,
                "FormNo": c.FormNo,
                "Risk": c.Risk,
                "UploadFile": c.UploadFile,
                "Description": c.Description,
            }])
        return legacy_json_string([])
    return legacy_json_string(_statutory_search(ClientStatutoryInternal, body))


@csrf_exempt
def iud_secretarial_statutory(request):
    """POST /api/Retail/IUDSecretarialStatutory —
    usp_ClientSecretarialStatutoryInternal IUD."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    return _iud_internal(ClientSecretarialStatutoryInternal, body, _login_id(request))


@csrf_exempt
def search_secretarial_statutory(request):
    """POST /api/Retail/SearchSecretarialStatutory — secretarial statutory list."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    return legacy_json_string(
        _statutory_search(ClientSecretarialStatutoryInternal, body))


# ---------------------------------------------------------------------------
# Statutory Setup (USP_StatutorySetup / USP_StatutorySecretarialSetup)
# ---------------------------------------------------------------------------


def _setup_search(model, body, login_id):
    """Action 6 = states, 7 = acts for a state, 9 = compliance names for an
    act+state, 8/default = full setup rows for the login user."""
    action = _int_or_none(body.get("Action"))
    login_id = _int_or_none(body.get("Id")) or login_id
    state_val = body.get("Createdby") or body.get("state")
    act_val = body.get("Id")
    qs = model.objects.all()
    if login_id:
        qs = qs.filter(CreatedBy=login_id)
    state_map = {s.SATE_CODE: s.STATE_NM for s in State.objects.all()}
    act_map = {a.ActId: a.Act for a in RetailActMaster.objects.all()}

    if action == 6:
        seen, rows = set(), []
        for r in qs:
            if r.State in seen:
                continue
            seen.add(r.State)
            rows.append({
                "SATE_CODE": r.State,
                "STATE_NM": state_map.get(_float(r.State)) or r.State,
            })
        return legacy_json_string(rows)
    if action == 7:
        seen, rows = set(), []
        for r in qs.filter(State=state_val):
            if r.Act in seen:
                continue
            seen.add(r.Act)
            rows.append({"ActId": r.Act, "Act": act_map.get(_int(r.Act), r.Act)})
        return legacy_json_string(rows)
    if action == 9:
        seen, rows = set(), []
        for r in qs.filter(State=state_val, Act=act_val):
            if r.ComplianceName in seen:
                continue
            seen.add(r.ComplianceName)
            rows.append({"CName": r.ComplianceName})
        return legacy_json_string(rows)
    return legacy_json_string([
        {
            "ID": r.ID,
            "State": r.State,
            "Act": act_map.get(_int(r.Act), r.Act),
            "ComplianceName": r.ComplianceName,
            "RegistrationNumber": r.RegistrationNumber,
            "ValidFrom": _fmt_date(r.ValidFrom, "%Y-%m-%d") if r.ValidFrom else None,
            "ValidTo": _fmt_date(r.ValidTo, "%Y-%m-%d") if r.ValidTo else None,
            "TypeCode": r.TypeCode,
            "RegistrationType": r.RegistrationType,
            "Upoad": r.Upoad,
            "CreatedBy": r.CreatedBy,
            "CACID": r.CACID,
        }
        for r in qs[:1000]
    ])


def _float(value):
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _int(value):
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return value


def _iud_setup(model, body, login_id):
    """USP_StatutorySetup / USP_StatutorySecretarialSetup IUD. Accepts either
    Map1ListSet (array) or the legacy pipe/comma-delimited MapListSet string."""
    action = _int_or_none(body.get("Action")) or 1
    created_by = _int_or_none(body.get("Createdby")) or login_id or 1
    items = body.get("Map1ListSet")
    if isinstance(items, str):
        try:
            import json as _json
            items = _json.loads(items)
        except Exception:
            items = None
    if not isinstance(items, list):
        items = []
    created = []
    for item in items:
        if not isinstance(item, dict):
            continue
        row = model.objects.create(
            State=item.get("State"),
            Act=item.get("Act"),
            ComplianceName=item.get("ComplianceName"),
            RegistrationNumber=item.get("RegistrationNumber"),
            ValidFrom=_parse_date(item.get("ValidFrom")),
            ValidTo=_parse_date(item.get("ValidTo")),
            TypeCode=item.get("TypeCode"),
            RegistrationType=item.get("RegistrationType"),
            Upoad=item.get("Upload") or item.get("Upoad"),
            CreatedBy=created_by,
            CreatedOn=timezone.now(),
        )
        created.append(str(row.ID))
    if not created and action == 1:
        # single-row insert (frontend sends flat fields)
        row = model.objects.create(
            State=body.get("State"),
            Act=body.get("Act"),
            ComplianceName=body.get("ComplianceName"),
            RegistrationNumber=body.get("RegistrationNumber"),
            ValidFrom=_parse_date(body.get("ValidFrom")),
            ValidTo=_parse_date(body.get("ValidTo")),
            TypeCode=body.get("TypeCode"),
            RegistrationType=body.get("RegistrationType"),
            Upoad=body.get("Upload"),
            CreatedBy=created_by,
            CreatedOn=timezone.now(),
        )
        return legacy_status_result(str(row.ID))
    return legacy_status_result("1")


@csrf_exempt
def iud_statutory_setup(request):
    """POST /api/Retail/IUDStatutorySetup — USP_StatutorySetup IUD."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    return _iud_setup(StatutorySetup, body, _login_id(request))


@csrf_exempt
def search_statutory_setup(request):
    """POST /api/Retail/SearchStatutorySetup — USP_StatutorySetup search."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    return _setup_search(StatutorySetup, body, _login_id(request))


@csrf_exempt
def iud_secretarial_statutory_setup(request):
    """POST /api/Retail/IUDSecretarialStatutorySetup —
    USP_StatutorySecretarialSetup IUD."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    return _iud_setup(StatutorySecretarialSetup, body, _login_id(request))


@csrf_exempt
def search_secretarial_statutory_setup(request):
    """POST /api/Retail/SearchSecretarialStatutorySetup — search."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    return _setup_search(StatutorySecretarialSetup, body, _login_id(request))


@csrf_exempt
def iud_financial_statutory_setup(request):
    """POST /api/Retail/IUDFinancialStatutorySetup — USP_FinancialSetup IUD."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    return _iud_setup(StatutoryFinancialSetup, body, _login_id(request))


@csrf_exempt
def search_financial_statutory_setup(request):
    """POST /api/Retail/SearchFinancialStatutorySetup — USP_FinancialSetup
    search."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    return _setup_search(StatutoryFinancialSetup, body, _login_id(request))


# ---------------------------------------------------------------------------
# Financial family (RTL.USP_FinacialCreateActCalender / USP_FinancialStatutory)
# ---------------------------------------------------------------------------


def _financial_calendar_data(body):
    data = _calendar_base_data(body)
    data["Forms"] = body.get("Forms")
    data["Applicability"] = body.get("Applicability")
    return _model_fields_only(RetailFinacialActCalender, data)


@csrf_exempt
def iud_retail_finacial_create_act_calender(request):
    """POST /api/Retail/IUDRetailFinacialCreateActCalender — financial calendar
    IUD (USP_FinacialCreateActCalender)."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    action = _int_or_none(body.get("Action")) or 1
    row_id = _int_or_none(body.get("Id"))
    data = _financial_calendar_data(body)
    if action == 1:
        row = RetailFinacialActCalender.objects.create(Createdon=timezone.now(), **data)
        return legacy_status_result(str(row.Id))
    if action == 2:
        if row_id:
            RetailFinacialActCalender.objects.filter(Id=row_id).update(**data)
            return legacy_status_result("1")
        return legacy_status_result("")
    if row_id:
        RetailFinacialActCalender.objects.filter(Id=row_id).delete()
    return legacy_status_result("")


@csrf_exempt
def search_retail_finacial_create_act_calender(request):
    """POST /api/Retail/SearchRetailFinacialCreateActCalender — financial
    statutory list (legacy delegates to USP_FinancialStatutory)."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    return legacy_json_string(
        _statutory_search(ClientFinancialStatutoryInternal, body, RetailFinacialActCalender))


@csrf_exempt
def search_financial_create_act_calender(request):
    """POST /api/Retail/SearchFinancialCreateActCalender —
    USP_FinacialCreateActCalender list."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    state_map = _state_name_map()
    qs = RetailFinacialActCalender.objects.all()
    if body.get("Id"):
        qs = qs.filter(Id=body.get("Id"))
    if body.get("State"):
        qs = qs.filter(State=body.get("State"))
    rows = [_act_calendar_row(r, state_map) for r in qs[:1000]]
    return legacy_json_string(rows)


@csrf_exempt
def iud_financial_statutory(request):
    """POST /api/Retail/IUDFinancialStatutory —
    usp_ClientFinancialStatutoryInternal IUD."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    return _iud_internal(ClientFinancialStatutoryInternal, body, _login_id(request))


@csrf_exempt
def search_finacial_statutory(request):
    """POST /api/Retail/SearchFinacialStatutory — financial statutory list."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    return legacy_json_string(
        _statutory_search(ClientFinancialStatutoryInternal, body, RetailFinacialActCalender))


@csrf_exempt
def search_finacial_statutory_event(request):
    """POST /api/Retail/SearchFinacialStatutoryEvent —
    USP_FinancialStatutoryEvent list (event compliance rows)."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    return legacy_json_string(_statutory_search(
        ClientFinancialStatutoryInternalNewEvent, body, RetailFinacialActCalender))


@csrf_exempt
def add_financial_event_compliance(request):
    """POST /api/Retail/AddFinancialEventcompliance — financial event IUD."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    return _iud_internal(
        ClientFinancialStatutoryInternalNewEvent, body, _login_id(request))


# ---------------------------------------------------------------------------
# Factory family (RTL.USP_FactoryCompliance / USP_FactoryStatutory)
# ---------------------------------------------------------------------------


def _factory_calendar_data(body):
    data = _calendar_base_data(body)
    data.update({
        "CompanyCategory": body.get("CompanyCategory"),
        "EntityType": body.get("EntityType"),
        "ListedStatus": body.get("ListedStatus"),
        "StockExchange": body.get("StockExchange"),
        "FundingStatus": body.get("FundingStatus"),
        "FundingType": body.get("FundingType"),
    })
    return _model_fields_only(RetailFactoryCompliance, data)


@csrf_exempt
def iud_factory_compliance(request):
    """POST /api/Retail/IUDFactoryCompliance — factory compliance calendar IUD
    (USP_FactoryCompliance)."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    action = _int_or_none(body.get("Action")) or 1
    row_id = _int_or_none(body.get("Id"))
    data = _factory_calendar_data(body)
    if action == 1:
        row = RetailFactoryCompliance.objects.create(Createdon=timezone.now(), **data)
        return legacy_status_result(str(row.Id))
    if action == 2:
        if row_id:
            RetailFactoryCompliance.objects.filter(Id=row_id).update(**data)
            return legacy_status_result("1")
        return legacy_status_result("")
    if row_id:
        RetailFactoryCompliance.objects.filter(Id=row_id).delete()
    return legacy_status_result("")


@csrf_exempt
def search_factory_compliance(request):
    """POST /api/Retail/SearchFactoryCompliance — factory compliance list."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    state_map = _state_name_map()
    qs = RetailFactoryCompliance.objects.all()
    if body.get("Id"):
        qs = qs.filter(Id=body.get("Id"))
    rows = [_act_calendar_row(r, state_map) for r in qs[:1000]]
    return legacy_json_string(rows)


@csrf_exempt
def iud_factory_statutory(request):
    """POST /api/Retail/IUDFactoryStatutory —
    usp_ClientFactoryStatutoryInternal IUD."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    return _iud_internal(ClientFactoryStatutoryInternal, body, _login_id(request))


@csrf_exempt
def search_fact_statutory(request):
    """POST /api/Retail/SearchFactStatutory — factory statutory list."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    return legacy_json_string(
        _statutory_search(ClientFactoryStatutoryInternal, body, RetailFactoryCompliance))


@csrf_exempt
def add_factory_event_compliance(request):
    """POST /api/Retail/AddFactoryEventcompliance — factory event compliance
    IUD (usp_ClientFactoryStatutoryInternalEvent)."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    return _iud_internal(
        ClientFactoryStatutoryInternalEvent, body, _login_id(request))


@csrf_exempt
def search_factory_event_compliance(request):
    """POST /api/Retail/SearchFactoryEventcompliance — factory event list."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    return legacy_json_string(_statutory_search(
        ClientFactoryStatutoryInternalEvent, body, RetailFactoryCompliance))


# ---------------------------------------------------------------------------
# Labour-code family (RTL.USP_LabourCodeCompliance / USP_LabourCode)
# ---------------------------------------------------------------------------


def _labour_calendar_data(body):
    data = _calendar_base_data(body)
    data.update({
        "CompanyCategory": body.get("CompanyCategory"),
        "EntityType": body.get("EntityType"),
        "ListedStatus": body.get("ListedStatus"),
        "StockExchange": body.get("StockExchange"),
        "FundingStatus": body.get("FundingStatus"),
        "FundingType": body.get("FundingType"),
        "DetailedCompliance": body.get("DetailedCompliance"),
        "ImpactEmployer": body.get("ImpactEmployer"),
    })
    return _model_fields_only(RetailLabourCodeCompliance, data)


@csrf_exempt
def iud_labourcode_compliance(request):
    """POST /api/Retail/IUDLabourcodeCompliance — labour-code compliance
    calendar IUD (USP_LabourCodeCompliance)."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    action = _int_or_none(body.get("Action")) or 1
    row_id = _int_or_none(body.get("Id"))
    data = _labour_calendar_data(body)
    if action == 1:
        row = RetailLabourCodeCompliance.objects.create(Createdon=timezone.now(), **data)
        return legacy_status_result(str(row.Id))
    if action == 2:
        if row_id:
            RetailLabourCodeCompliance.objects.filter(Id=row_id).update(**data)
            return legacy_status_result("1")
        return legacy_status_result("")
    if row_id:
        RetailLabourCodeCompliance.objects.filter(Id=row_id).delete()
    return legacy_status_result("")


@csrf_exempt
def search_labourcode_compliance(request):
    """POST /api/Retail/SearchLabourcodeCompliance — labour-code compliance
    list."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    state_map = _state_name_map()
    qs = RetailLabourCodeCompliance.objects.all()
    if body.get("Id"):
        qs = qs.filter(Id=body.get("Id"))
    rows = [_act_calendar_row(r, state_map) for r in qs[:1000]]
    return legacy_json_string(rows)


@csrf_exempt
def iud_labour_code_statutory(request):
    """POST /api/Retail/IUDLabourCodeStatutory —
    usp_ClientLabourCodeInternal IUD."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    return _iud_internal(ClientLabourCodeInternal, body, _login_id(request))


@csrf_exempt
def search_lc(request):
    """POST /api/Retail/SearchLc — labour-code statutory list (USP_LabourCode)."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    return legacy_json_string(_statutory_search(
        ClientLabourCodeInternal, body, RetailLabourCodeCompliance))


@csrf_exempt
def add_labour_event_compliance(request):
    """POST /api/Retail/AddLabourEventcompliance — labour event compliance IUD
    (usp_ClientLabourStatutoryInternalEvent)."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    return _iud_internal(ClientStatutoryInternalEvents, body, _login_id(request))


@csrf_exempt
def search_labour_event(request):
    """POST /api/Retail/SearchLabourEvent — labour event list."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    return legacy_json_string(_statutory_search(
        ClientStatutoryInternalEvents, body, RetailLabourCodeCompliance))


# ---------------------------------------------------------------------------
# Dashboards (USP_ComplianceDashboard / USP_BoardingMapping / USP_Subcidiary)
# ---------------------------------------------------------------------------


def _client_rows(user_id):
    """All client statutory-internal rows (across families) joined to their
    act-calendar entry."""
    models = [
        ClientStatutoryInternal,
        ClientSecretarialStatutoryInternal,
        ClientFinancialStatutoryInternal,
        ClientFactoryStatutoryInternal,
        ClientLabourCodeInternal,
    ]
    merged = []
    for m in models:
        merged.extend(m.objects.filter(Createdby=user_id))
    cac_ids = {r.CACId for r in merged if r.CACId}
    cal_map = {}
    if cac_ids:
        for c in RetailActCalender.objects.filter(Id__in=cac_ids):
            cal_map[c.Id] = c
    state_map = _state_name_map()
    ind_map = {i.Id: i.Industry for i in Industry.objects.all()}
    return [
        {
            "row": r,
            "cal": cal_map.get(r.CACId),
            "STATE_NM": state_map.get(cal_map[r.CACId].State)
            if r.CACId in cal_map and cal_map[r.CACId].State is not None else None,
            "IndustryName": ind_map.get(cal_map[r.CACId].Industry)
            if r.CACId in cal_map and cal_map[r.CACId].Industry else None,
        }
        for r in merged
    ]


@csrf_exempt
def search_client_dashboard(request):
    """POST /api/Retail/SearchClientDashboard — USP_ComplianceDashboard
    aggregation for the logged-in client.

    Actions: 1=tile summary, 2=documented %, 3=industry compliance,
    5=risk matrix, 6=status pie, 14=acts, 15=compliances,
    16=categories, 17=subcategories."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    action = _int_or_none(body.get("Action")) or 1
    user_id = _int_or_none(body.get("UserId")) or _login_id(request)
    ind_filter = body.get("Industry")
    cm_filter = body.get("currentMonth")
    cy_filter = body.get("currentYear")
    industry_name = body.get("Industry")

    items = _client_rows(user_id)
    filtered = []
    for it in items:
        cal = it["cal"]
        if cal is None:
            continue
        if industry_name and industry_name != it["IndustryName"]:
            continue
        if cm_filter and str(cal.Month) != str(cm_filter):
            continue
        if cy_filter and str(cal.Year) != str(cy_filter):
            continue
        filtered.append(it)

    if action in (14, 15, 16, 17):
        seen, rows = set(), []
        for it in filtered:
            cal = it["cal"]
            key = {"14": cal.Act, "15": cal.ComplianceName,
                   "16": cal.selectedCategory,
                   "17": cal.selectedSubcategory}.get(str(action))
            if key in seen:
                continue
            seen.add(key)
            rows.append({"Id": key, "Name": key})
        return legacy_json_string(rows)

    total = len(filtered)
    complied = sum(1 for it in filtered if (it["row"].Status or "").lower() == "complied")
    doc = sum(1 for it in filtered if it["row"].UploadFile)
    risk_counts = {}
    for it in filtered:
        risk_counts[it["cal"].Risk] = risk_counts.get(it["cal"].Risk, 0) + 1

    def pct(n):
        return round(n * 100.0 / total, 2) if total else 0.0

    if action == 2:
        return legacy_json_string([{
            "DisplayedPercentage": pct(doc),
            "NotDisplayedPercentage": pct(total - doc),
        }])
    if action == 3:
        agg = {}
        for it in filtered:
            key = it["IndustryName"] or "Other"
            agg[key] = agg.get(key, 0) + 1
        return legacy_json_string(
            [{"Industry": k, "Number": v} for k, v in agg.items()])
    if action == 5:
        high = risk_counts.get("High", 0)
        medium = risk_counts.get("Medium", 0)
        low = risk_counts.get("Low", 0)
        invalid = total - high - medium - low
        return legacy_json_string([{
            "HighPercentage": pct(high), "MediumPercentage": pct(medium),
            "LowPercentage": pct(low), "InvalidPercentage": pct(invalid),
            "HighCount": high, "MediumCount": medium,
            "LowCount": low, "InvalidCount": invalid,
        }])
    if action == 6:
        pending = sum(1 for it in filtered if not it["row"].Status)
        delayed = sum(1 for it in filtered
                      if (it["row"].Status or "").lower() in ("delaycomplied", "noncomplied", "delayed"))
        return legacy_json_string([{
            "CompletePercentage": pct(complied),
            "PendingPercentage": pct(pending),
            "DelayedPercentage": pct(delayed),
        }])
    remain = total - complied
    return legacy_json_string([{
        "TotalCompliance": total,
        "StoreCount": len({it["cal"].Id for it in filtered}),
        "Complied": complied,
        "REMAINDOC": remain,
        "CompliedPer": pct(complied),
        "NotCompliedPer": pct(remain),
    }])


@csrf_exempt
def search_compliance_dashboard(request):
    """POST /api/Retail/SearchComplianceDashboard — boarding-mapping list
    (legacy delegates to USP_BoardingMapping)."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    rows = list(BoardingMapping.objects.all())
    party_map = {p.PartyId: p.PartyName for p in PartyMaster.objects.all()}
    login_map = {l.LoginId: l for l in LoginTable.objects.all()}
    result = []
    for r in rows:
        pid = _int_or_none(r.PartyId)
        uid = _int_or_none(r.UserId)
        lt = login_map.get(uid) if uid else None
        result.append({
            "Id": r.Id,
            "PartyId": r.PartyId,
            "PartyName": party_map.get(pid),
            "LoginId": r.UserId,
            "UserName": lt.UserName if lt else None,
            "BoardingType": r.BoardingType,
            "BoardingTypeId": r.Id,
        })
    return legacy_json_string(result)


def _subcidiary_list():
    party_map = {p.PartyId: p.PartyName for p in PartyMaster.objects.all()}
    login_map = {l.LoginId: l for l in LoginTable.objects.all()}
    rows = []
    for s in Subsidiary.objects.all().order_by("Id"):
        rows.append({
            "Id": s.Id,
            "GroupId": s.GroupId,
            "GroupParty": party_map.get(s.GroupId),
            "GroupUserid": s.GroupUserid,
            "GroupUser": (login_map.get(s.GroupUserid).UserName
                          if login_map.get(s.GroupUserid) else None),
            "SubcidiaryId": s.SubcidiaryId,
            "SubsidiaryParty": party_map.get(s.SubcidiaryId),
            "SubcidiaryUserId": s.SubcidiaryUserId,
            "SubsidiaryUser": (login_map.get(s.SubcidiaryUserId).UserName
                               if login_map.get(s.SubcidiaryUserId) else None),
            "CreatedOn": s.CreatedOn,
        })
    return rows


@csrf_exempt
def search_main_retail_dashboard(request):
    """POST /api/Retail/SearchMainRetailDashboard — RTL.USP_Subcidiary lookups.
    Action 1=group parties, 2=users for a group, 3=subsidiary parties."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    action = _int_or_none(body.get("Action")) or 1
    parent = body.get("Id")
    party_map = {p.PartyId: p.PartyName for p in PartyMaster.objects.all()}
    login_map = {l.LoginId: l for l in LoginTable.objects.all()}
    if action == 1:
        group_ids = set(Subsidiary.objects.values_list("GroupId", flat=True))
        return legacy_json_string([{"PartyId": i, "PartyName": party_map.get(i)}
                                   for i in sorted(group_ids) if i])
    if action == 2:
        user_ids = set(Subsidiary.objects.filter(GroupId=parent)
                       .values_list("GroupUserid", flat=True))
        user_ids |= set(Subsidiary.objects.filter(SubcidiaryId=parent)
                        .values_list("SubcidiaryUserId", flat=True))
        rows = []
        for uid in sorted(user_ids):
            if not uid:
                continue
            lt = login_map.get(uid)
            rows.append({"LoginId": uid, "UserName": lt.UserName if lt else None,
                         "Name": lt.Name if lt else None})
        return legacy_json_string(rows)
    sub_ids = set(Subsidiary.objects.filter(GroupId=parent)
                  .values_list("SubcidiaryId", flat=True))
    return legacy_json_string([{"PartyId": i, "PartyName": party_map.get(i)}
                               for i in sorted(sub_ids) if i])


@csrf_exempt
def insert_main_retail_dashboard(request):
    """POST /api/Retail/InsertMainRetailDashboard — insert the subsidiary
    mapping set (SubcidiaryListSet array or MapListSet string)."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    items = body.get("SubcidiaryListSet")
    if isinstance(items, str):
        import json
        try:
            items = json.loads(items)
        except Exception:
            items = None
    if not isinstance(items, list):
        return legacy_status_result("1")
    created = 0
    for item in items:
        if not isinstance(item, dict):
            continue
        gid = _int_or_none(item.get("GroupId"))
        gid_u = _int_or_none(item.get("GroupUserId"))
        sid = _int_or_none(item.get("SubcidiaryId"))
        sid_u = _int_or_none(item.get("SubcidiaryUserId"))
        if Subsidiary.objects.filter(
                GroupId=gid, GroupUserid=gid_u,
                SubcidiaryId=sid, SubcidiaryUserId=sid_u).exists():
            return legacy_status_result("Duplicate Record")
        Subsidiary.objects.create(
            GroupId=gid, GroupUserid=gid_u,
            SubcidiaryId=sid, SubcidiaryUserId=sid_u,
            CreatedOn=timezone.now())
        created += 1
    return legacy_status_result("1" if created else "1")


@csrf_exempt
def verifyvalid(request):
    """POST /api/Retail/verifyvalid — RTL.USP_Subcidiary validation/list/update.
    Action 4=duplicate check, 6=list, 7=update."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    action = _int_or_none(body.get("Action")) or 4
    if action == 4:
        row_id = body.get("Id")
        dup = Subsidiary.objects.filter(
            GroupId=_int_or_none(body.get("GroupId")),
            GroupUserid=_int_or_none(body.get("GroupUserId")),
            SubcidiaryId=_int_or_none(body.get("SubcidiaryId")),
            SubcidiaryUserId=_int_or_none(body.get("SubcidiaryUserId")),
        ).exclude(Id=row_id).first()
        if dup:
            return legacy_json_string([{"msg": f"-1|{dup.Id}"}])
        return legacy_json_string([{"msg": ""}])
    if action == 6:
        return legacy_json_string(_subcidiary_list())
    if action == 7:
        Subsidiary.objects.filter(Id=body.get("Id")).update(
            GroupId=_int_or_none(body.get("GroupId")),
            GroupUserid=_int_or_none(body.get("GroupUserId")),
            SubcidiaryId=_int_or_none(body.get("SubcidiaryId")),
            SubcidiaryUserId=_int_or_none(body.get("SubcidiaryUserId")),
        )
        return legacy_json_string([{"msg": "Update Successfully"}])
    return legacy_json_string([])
