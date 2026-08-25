"""Phase 10 — legacy portal controller ports (SiteManager / TimePeriod / CDM /
ClientActMapping / Chat / ChangePasscode / Payment).

Replicates the ASP.NET MVC + WebApi controllers against the migrated Postgres
tables. Response contract matches the rest of the api app:
  * data-table actions -> legacy_json_string(list_of_dicts)
  * IUD / scalar       -> legacy_status_result(<scalar or message>)
"""
import base64
import json
import os
import re
import uuid

from django.db import transaction
from django.db.models import Max
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt

from legacy.models import (
    CDMMaster,
    Chatbot,
    City,
    ClientActMapping,
    ComplianceMaster,
    Conversation,
    Country,
    DocumentMaster,
    LegacySiteManager,
    Location,
    LoginTable,
    Mapping,
    MenuPermission,
    PartyMaster,
    PaymentRequestLog,
    State,
    TimePeriod,
    UserPasswordHistory,
)

from .views import (
    _fmt_date,
    _int_or_none,
    _login_id,
    _request_params,
    legacy_json_string,
    legacy_status_result,
    session_expired,
)


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------


def _body_params(request):
    """Parse POST body / GET params, handling JSON, wrapped obj, and multipart."""
    if getattr(request, "POST", None) and len(request.POST):
        data = {k: v for k, v in request.POST.items() if k != "obj"}
        raw_obj = request.POST.get("obj")
        if raw_obj:
            try:
                obj = json.loads(raw_obj)
                if isinstance(obj, dict):
                    data.update(obj)
            except Exception:
                pass
        return data
    return _request_params(request)


def _parse_doc_list(value):
    """Legacy `DocumentList` format: "id1,id2|id3,id4" (pipe = group, comma = col)."""
    ids = []
    if not value:
        return ids
    for group in str(value).split("|"):
        for chunk in group.split(","):
            chunk = chunk.strip()
            if chunk and chunk != "0":
                ids.append(chunk)
    return ids


def _generate_ticket_no():
    """Replicate dbo.UDF_GENERATEID('EZ', max right(ticketno,5)) + 1."""
    seq = Chatbot.objects.aggregate(m=Max("TicketNo"))["m"]
    try:
        last = int(str(seq).split("EZ")[-1][-5:]) if seq else 0
    except Exception:
        last = 0
    return "EZ" + str(last + 1).zfill(7)


def _generate_conversation_id():
    """Replicate dbo.VoucherCreation('CON', max right(ConversationId,5)) + 1."""
    seq = Conversation.objects.aggregate(m=Max("ConversationId"))["m"]
    try:
        last = int(str(seq).split("CON")[-1][-5:]) if seq else 0
    except Exception:
        last = 0
    return "CON" + str(last + 1).zfill(5)


_STATE_CODES = {
    "ANDHRA PRADESH": "AP", "ARUNACHAL PRADESH": "AR", "ASSAM": "AS",
    "BIHAR": "BR", "CHHATTISGARH": "CG", "DELHI": "DL", "GOA": "GA",
    "GUJARAT": "GJ", "HARYANA": "HR", "HIMACHAL PRADESH": "HP",
    "JHARKHAND": "JH", "KARNATAKA": "KA", "KERALA": "KL",
    "MADHYA PRADESH": "MP", "MAHARASHTRA": "MH", "MANIPUR": "MN",
    "MEGHALAYA": "ML", "MIZORAM": "MZ", "NAGALAND": "NL", "ODISHA": "OD",
    "ORISSA": "OD", "PUNJAB": "PB", "RAJASTHAN": "RJ", "SIKKIM": "SK",
    "TAMIL NADU": "TN", "TELANGANA": "TS", "TRIPURA": "TR",
    "UTTAR PRADESH": "UP", "UTTARAKHAND": "UK", "WEST BENGAL": "WB",
    "ANDAMAN AND NICOBAR ISLANDS": "AN", "CHANDIGARH": "CH",
    "DADRA AND NAGAR HAVELI AND DAMAN AND DIU": "DN",
    "JAMMU AND KASHMIR": "JK", "LADAKH": "LA", "LAKSHADWEEP": "LD",
    "PUDUCHERRY": "PY",
}


def _site_code(site_name, state_name, seq):
    """Replicate dbo.GenerateCode(name, state, 'Site', seq)."""
    site_name = (site_name or "").strip().upper()
    if " " in site_name:
        prefix = site_name[0] + site_name.rsplit(" ", 1)[-1][0]
    else:
        prefix = site_name[:1]
    prefix = "SI" + prefix
    state_code = _STATE_CODES.get((state_name or "").upper(), "NA")
    now = timezone.now()
    return f"{prefix}{now.month:02d}{str(now.year)[-2:]}{state_code}{seq}"


# ---------------------------------------------------------------------------
# SiteManagerController / SiteManagerApiController  (EVM.USP_TBL_SiteManager)
# ---------------------------------------------------------------------------


@csrf_exempt
def site_manager_list(request):
    """GET/POST /api/SiteManager/GetSiteManagerListDT.

    ActionType (Sptype): 4=all (with joins), 5=by PartyId, 6=Vendor list,
    8=by SiteId. Returns the legacy DataTable shape.
    """
    if not request.user.is_authenticated:
        return session_expired()
    body = _body_params(request)
    sptype = _int_or_none(body.get("ActionType")) or 4
    qs = LegacySiteManager.objects.all()

    if sptype == 5:
        qs = qs.filter(PartyID=_int_or_none(body.get("PartyId")),
                       IsActive__in=(None, "1"), IsDeleted__in=(None, "0"))
    elif sptype == 6:
        qs = qs.filter(PartyType="Vendor", IsActive__in=(None, "1"), IsDeleted__in=(None, "0"))
    elif sptype == 8:
        qs = qs.filter(SiteId=_int_or_none(body.get("PartyId")),
                       IsActive__in=(None, "1"), IsDeleted__in=(None, "0"))

    rows = []
    pm_map = {p.PartyId: p for p in PartyMaster.objects.all()}
    cu_map = {c.CountryId: c for c in Country.objects.all()}
    st_map = {s.SATE_CODE: s for s in State.objects.all()}
    cy_map = {}
    for c in City.objects.all():
        cy_map[(c.CITY_CODE, c.STATE_ID)] = c

    for s in qs[:500]:
        pm = pm_map.get(s.PartyID)
        cu = cu_map.get(_int_or_none(s.CountryID))
        st = st_map.get(_float_or_none(s.StateID))
        cy = cy_map.get((_float_or_none(s.CityID), _float_or_none(s.StateID)))
        rows.append({
            "SiteCode": s.SiteCode,
            "SiteId": s.SiteId,
            "PartyId": s.PartyID,
            "PartyType": s.PartyType,
            "SiteName": s.SiteName,
            "Address": s.Address,
            "CityId": s.CityID,
            "StateId": s.StateID,
            "CountryId": s.CountryID,
            "Pincode": s.Pincode,
            "LocationCode": s.LocationCode,
            "EmailId": s.EmailId,
            "ContactNo": s.ContactNo,
            "Description": s.Description,
            "IsActive": s.IsActive,
            "BankDetails": s.BankDetails,
            "AccountNo": s.AccountNo,
            "RegistrationType": s.RegistrationType,
            "PANITNO": s.PANITNO,
            "GSTINUIN": s.GSTINUIN,
            "CreatedOn": s.CreatedOn,
            "UpdateOn": s.UpdateOn,
            "LAST_LOGIN_ID": s.LAST_LOGIN_ID,
            "CREATED_BY": s.CREATED_BY,
            "LAST_UPDATE_BY": s.LAST_UPDATE_BY,
            "IsDeleted": s.IsDeleted,
            "PartyName": pm.PartyName if pm else None,
            "CountryName": cu.CountryName if cu else None,
            "STATE_NM": st.STATE_NM if st else None,
            "CITY_NAME": cy.CITY_NAME if cy else None,
            "CLRARC": s.CLRARC,
            "CLRLIC": s.CLRLIC,
            "ContactPerson": s.ContactPerson,
            "ContactMobile": s.ContactMobile,
            "Descritpion": s.Descritpion,
            "ValidFrom": s.ValidFrom,
            "ValidTo": pm.ValidTo if pm else None,
            "Manpowertype": s.Manpowertype,
            "ManPowerCount": s.ManPowerCount,
            "AdminFileDoc": s.AdminFileDoc,
            "VendorFileDoc": s.VendorFileDoc,
            "AssignColor": s.AssignColor,
            "Drinkingwater": s.Drinkingwater,
            "Washroom": s.Washroom,
            "RestShelter": s.RestShelter,
            "FirstAid": s.FirstAid,
            "TrainerName": s.TrainerName,
            "Automation": s.Automation,
        })
    return legacy_json_string(rows)


def _float_or_none(value):
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


@csrf_exempt
def site_manager_iud(request):
    """POST /api/SiteManager/InsertUpdateDelSiteManager — Sptype 1 insert,
    2 update, 3 soft-delete, 7 update VendorFileDoc, 9 insert w/ PartyIds +
    Mapping + Location, 10 delete Mapping row."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _body_params(request)
    sptype = _int_or_none(body.get("ActionType"))
    login_id = _login_id(request) or _int_or_none(body.get("CreatedBy"))

    if sptype == 1 or sptype == 9:
        dup = LegacySiteManager.objects.filter(
            SiteName=body.get("SiteName"), PartyID=_int_or_none(body.get("PartyId")),
            Address=body.get("Address"), IsDeleted__in=(None, "0")).exists()
        if dup:
            return legacy_status_result("Duplicate Record Same SiteName, Address and Party")
        state_name = None
        row = City.objects.filter(STATE_ID=_int_or_none(body.get("StateId"))).values("STATE_NAME").first()
        if row:
            state_name = row["STATE_NAME"]
        max_id = LegacySiteManager.objects.aggregate(m=Max("SiteId"))["m"] or 0
        site = LegacySiteManager.objects.create(
            SiteCode=_site_code(body.get("SiteName"), state_name, max_id + 1),
            PartyID=_int_or_none(body.get("PartyId")),
            PartyType=body.get("PartyType"),
            SiteName=body.get("SiteName"),
            Address=body.get("Address"),
            EmailId=body.get("EmailId"),
            Pincode=body.get("Pincode"),
            ContactNo=body.get("ContactNo"),
            BankDetails=body.get("BankDetails"),
            RegistrationType=body.get("RegistrationType"),
            PANITNO=body.get("Panitno"),
            GSTINUIN=body.get("Gstinuin"),
            CityID=body.get("CityId"),
            StateID=body.get("StateId"),
            CountryID=body.get("CountryId"),
            LocationCode=body.get("LocationCode"),
            Description=body.get("Description"),
            AccountNo=body.get("AccountNo"),
            CLRARC=body.get("CLRARC"),
            CLRLIC=body.get("CLRLIC"),
            ContactPerson=body.get("ContactPerson"),
            ContactMobile=body.get("ContactMobile"),
            Descritpion=body.get("Descritpion"),
            ValidFrom=body.get("ValidFrom"),
            ValidTo=body.get("ValidTo"),
            Manpowertype=body.get("Manpowertype"),
            ManPowerCount=body.get("ManPowerCount"),
            AdminFileDoc=body.get("AdminFileDoc"),
            VendorFileDoc=body.get("VendorFileDoc"),
            NLabourOffice=body.get("NLabourOffice"),
            Nature=body.get("Nature"),
            PrincipalRegistration=body.get("PrincipalRegistration"),
            IssuingAuthority=body.get("IssuingAuthority"),
            CLRA_MaxWorkers=body.get("CLRA_MaxWorkers"),
            CLRA_Validity=body.get("CLRA_Validity"),
            RCCopy=body.get("RCCopy"),
            RenewalRCCopy=body.get("RenewalRCCopy"),
            BOCW_Reg=body.get("BOCW_Reg"),
            BOCW_IssuingAuth=body.get("BOCW_IssuingAuth"),
            BOCW_MaxWorkers=body.get("BOCW_MaxWorkers"),
            BOCW_Validity=body.get("BOCW_Validity"),
            BOCWRCCopy=body.get("BOCWRCCopy"),
            RenewalBOCWRCCopy=body.get("RenewalBOCWRCCopy"),
            VendorType=body.get("VendorType"),
            MaxContractors=body.get("MaxContractors"),
            MaxWorkersSite=body.get("MaxWorkersSite"),
            PPEMandatory=body.get("PPEMandatory"),
            PPEType=body.get("PPEType"),
            SafetyTraining=body.get("SafetyTraining"),
            SiteInduction=body.get("SiteInduction"),
            PoliceVerification=body.get("PoliceVerification"),
            IDCardRequired=body.get("IDCardRequired"),
            AssignColor=body.get("AssignColor"),
            Drinkingwater=body.get("Drinkingwater"),
            Washroom=body.get("Washroom"),
            RestShelter=body.get("RestShelter"),
            FirstAid=body.get("FirstAid"),
            TrainerName=body.get("TrainerName"),
            ValidDay=body.get("ValidDay"),
            ReminderDay=body.get("ReminderDay"),
            Automation=body.get("Automation"),
            SiteType=body.get("SiteType"),
            CREATED_BY=login_id,
            CreatedOn=timezone.now(),
            IsActive="1",
            IsDeleted="0",
        )
        if sptype == 9:
            _site_insert_mapping(body, site.SiteId, login_id)
        return legacy_status_result("1")

    if sptype == 2:
        upd = {
            "SiteName": body.get("SiteName"), "Address": body.get("Address"),
            "EmailId": body.get("EmailId"), "Pincode": body.get("Pincode"),
            "ContactNo": body.get("ContactNo"), "BankDetails": body.get("BankDetails"),
            "RegistrationType": body.get("RegistrationType"),
            "PANITNO": body.get("Panitno"), "GSTINUIN": body.get("Gstinuin"),
            "UpdateOn": timezone.now(), "LAST_UPDATE_BY": str(login_id) if login_id else None,
            "LAST_LOGIN_ID": login_id,
            "LocationCode": body.get("LocationCode"), "Description": body.get("Description"),
            "AccountNo": body.get("AccountNo"), "CLRARC": body.get("CLRARC"),
            "CLRLIC": body.get("CLRLIC"), "ContactPerson": body.get("ContactPerson"),
            "ContactMobile": body.get("ContactMobile"), "Descritpion": body.get("Descritpion"),
            "ValidFrom": body.get("ValidFrom"), "ValidTo": body.get("ValidTo"),
            "Manpowertype": body.get("Manpowertype"), "ManPowerCount": body.get("ManPowerCount"),
            "AdminFileDoc": body.get("AdminFileDoc"), "VendorFileDoc": body.get("VendorFileDoc"),
            "NLabourOffice": body.get("NLabourOffice"), "Nature": body.get("Nature"),
            "PrincipalRegistration": body.get("PrincipalRegistration"),
            "IssuingAuthority": body.get("IssuingAuthority"),
            "CLRA_MaxWorkers": body.get("CLRA_MaxWorkers"),
            "CLRA_Validity": body.get("CLRA_Validity"), "RCCopy": body.get("RCCopy"),
            "RenewalRCCopy": body.get("RenewalRCCopy"), "BOCW_Reg": body.get("BOCW_Reg"),
            "BOCW_IssuingAuth": body.get("BOCW_IssuingAuth"),
            "BOCW_MaxWorkers": body.get("BOCW_MaxWorkers"),
            "BOCW_Validity": body.get("BOCW_Validity"), "BOCWRCCopy": body.get("BOCWRCCopy"),
            "RenewalBOCWRCCopy": body.get("RenewalBOCWRCCopy"),
            "VendorType": body.get("VendorType"), "MaxContractors": body.get("MaxContractors"),
            "MaxWorkersSite": body.get("MaxWorkersSite"),
            "PPEMandatory": body.get("PPEMandatory"), "PPEType": body.get("PPEType"),
            "SafetyTraining": body.get("SafetyTraining"),
            "SiteInduction": body.get("SiteInduction"),
            "PoliceVerification": body.get("PoliceVerification"),
            "IDCardRequired": body.get("IDCardRequired"),
            "AssignColor": body.get("AssignColor"), "Drinkingwater": body.get("Drinkingwater"),
            "Washroom": body.get("Washroom"), "RestShelter": body.get("RestShelter"),
            "FirstAid": body.get("FirstAid"), "TrainerName": body.get("TrainerName"),
            "ValidDay": body.get("ValidDay"), "ReminderDay": body.get("ReminderDay"),
            "Automation": body.get("Automation"), "SiteType": body.get("SiteType"),
        }
        LegacySiteManager.objects.filter(SiteId=_int_or_none(body.get("SiteId"))).update(**upd)
        return legacy_status_result("2")

    if sptype == 3:
        LegacySiteManager.objects.filter(
            PartyID=_int_or_none(body.get("PartyId")),
            SiteId=_int_or_none(body.get("SiteId"))).update(
            IsDeleted="1", LAST_UPDATE_BY=str(login_id) if login_id else None,
            UpdateOn=timezone.now())
        return legacy_status_result("3")

    if sptype == 7:
        LegacySiteManager.objects.filter(SiteId=_int_or_none(body.get("SiteId"))).update(
            VendorFileDoc=body.get("VendorFileDoc"))
        return legacy_status_result("2")

    if sptype == 10:
        Mapping.objects.filter(Id=_int_or_none(body.get("SiteId"))).delete()
        return legacy_status_result("3")

    return legacy_status_result("")


def _site_insert_mapping(body, new_site_id, login_id):
    """Sptype 9: build Mapping rows (AuditorId=392) + Location from PartyIds."""
    party_ids = _parse_doc_list(body.get("PartyIds"))
    map_id = LoginTable.objects.filter(LoginId=login_id).values_list("MapId", flat=True).first()
    if map_id is None:
        map_id = login_id
    for pid in party_ids:
        Mapping.objects.create(
            ClientId=map_id, ClientSiteId=new_site_id, VendorId=_int_or_none(pid),
            AuditorId=392, Createdby=login_id)
    Location.objects.create(
        PartyId=map_id, SiteId=new_site_id, Location=body.get("LocationCode"),
        Createdby=login_id, CreatedOn=timezone.now())


# ---------------------------------------------------------------------------
# TimePeriodController (Usp_TimePeriod)
# ---------------------------------------------------------------------------


@csrf_exempt
def time_period_iud(request):
    """POST /api/TimePeriod/IUDTimePeriod — Action 1 insert, 2 update, 3 delete."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _body_params(request)
    action = _int_or_none(body.get("Action"))

    if action == 1:
        exists = TimePeriod.objects.filter(
            ClientId=_int_or_none(body.get("ClientId")),
            VendorId=body.get("VendorId")).exists()
        if exists:
            return legacy_status_result("-1")
        TimePeriod.objects.create(
            ClientId=_int_or_none(body.get("ClientId")),
            VendorId=body.get("VendorId"),
            Year=body.get("Year"), Month=body.get("Month"),
            ClientSiteId=body.get("ClientSiteId"), Location=body.get("Location"),
            EndDate=body.get("EndDate"), createdon=timezone.now())
        return legacy_status_result("1")
    if action == 2:
        TimePeriod.objects.filter(Id=_int_or_none(body.get("Id"))).update(
            Year=body.get("Year"), Month=body.get("Month"),
            ClientSiteId=body.get("ClientSiteId"), Location=body.get("Location"),
            EndDate=body.get("EndDate"))
        return legacy_status_result("2")
    if action == 3:
        TimePeriod.objects.filter(Id=_int_or_none(body.get("Id"))).delete()
        return legacy_status_result("3")
    return legacy_status_result("")


@csrf_exempt
def time_period_search(request):
    """GET/POST /api/TimePeriod/GetSearchTimePeriod — Action 4 list (with
    client/vendor party names)."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _body_params(request)
    action = _int_or_none(body.get("Action")) or 4
    if action != 4:
        return legacy_json_string([])
    pm = {p.PartyId: p.PartyName for p in PartyMaster.objects.all()}
    rows = []
    for i, t in enumerate(TimePeriod.objects.order_by("Id"), 1):
        rows.append({
            "SNO": i, "Id": t.Id,
            "Client": pm.get(t.ClientId),
            "Vendor": pm.get(_int_or_none(t.VendorId)),
            "ClientId": t.ClientId,
            "VendorId": (t.VendorId or "").strip(),
            "Year": t.Year, "Month": t.Month,
            "ClientSiteId": t.ClientSiteId, "Location": t.Location,
            "Enddate": t.EndDate,
        })
    return legacy_json_string(rows)


# ---------------------------------------------------------------------------
# ChangePassCodeController (Usp_ChangePassword / USP_LoginTable)
# ---------------------------------------------------------------------------


@csrf_exempt
def check_pass_code(request):
    """POST /api/ChangePasscode/checkPassCode — Usp_ChangePassword @Action=1."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _body_params(request)
    login_id = _int_or_none(body.get("LoginId")) or _login_id(request)
    row = LoginTable.objects.filter(LoginId=login_id).values("Password").first()
    return legacy_json_string([{"Password": (row or {}).get("Password", "")}])


@csrf_exempt
def modify_pass_code(request):
    """POST /api/ChangePasscode/ModifyPassCode — Usp_ChangePassword @Action=2."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _body_params(request)
    login_id = _int_or_none(body.get("LoginId")) or _login_id(request)
    new_password = body.get("NewPassword") or body.get("Password")
    history = list(UserPasswordHistory.objects.filter(LoginId=login_id)
                   .order_by("-CreatedDate")[:5].values_list("PasswordHash", flat=True))
    if new_password in history:
        return legacy_status_result("You cannot reuse last 5 passwords.")
    UserPasswordHistory.objects.create(
        LoginId=login_id, PasswordHash=new_password, CreatedDate=timezone.now())
    LoginTable.objects.filter(LoginId=login_id).update(
        Password=new_password, UpdatedOn=timezone.now().strftime("%d-%b-%Y %H:%M %p"))
    return legacy_status_result("2")


def _save_base64_file(data_uri, subfolder):
    from django.conf import settings
    m = re.match(r"data:([a-zA-Z]+)/([a-zA-Z]+);base64,(.*)", data_uri or "", re.DOTALL)
    if not m:
        return None
    ext = ".jpeg" if m.group(1) == "image" else ".pdf"
    folder = os.path.join(settings.MEDIA_ROOT, subfolder)
    os.makedirs(folder, exist_ok=True)
    filename = f"{uuid.uuid4().hex}{ext}"
    try:
        data = base64.b64decode(m.group(3))
    except Exception:
        return None
    with open(os.path.join(folder, filename), "wb") as f:
        f.write(data)
    return f"/media/{subfolder}/{filename}"


@csrf_exempt
def upload_photo(request):
    """POST /api/ChangePasscode/UploadPhoto — multipart (file + LoginId) or
    JSON {Photo(base64), LoginId}. USP_LoginTable @Action=12."""
    if not request.user.is_authenticated:
        return session_expired()
    login_id = None
    photo_path = None
    if getattr(request, "FILES", None) and request.FILES:
        login_id = _int_or_none(request.POST.get("LoginId")) or _login_id(request)
        f = request.FILES.get("file") or request.FILES.get("Photo")
        if f:
            photo_path = _save_upload_file(f, "ProfilePhoto")
        else:
            photo_path = request.POST.get("Photo")
    else:
        body = _body_params(request)
        login_id = _int_or_none(body.get("LoginId")) or _login_id(request)
        photo_path = _save_base64_file(body.get("Photo"), "ProfilePhoto")
        if not photo_path:
            photo_path = body.get("Photo")
    if photo_path:
        LoginTable.objects.filter(LoginId=login_id).update(
            Photo=photo_path, UpdatedOn=timezone.now().strftime("%d-%b-%Y %H:%M %p"))
    return legacy_status_result("2")


# ---------------------------------------------------------------------------
# CDMController / CDMApiController (USP_ClientDocumentMapping)
# ---------------------------------------------------------------------------


@csrf_exempt
def cdm_get(request):
    """GET/POST /api/CDM/GetCDM — Action 4 = documents for a client,
    Action 5 = all client mappings."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _body_params(request)
    action = _int_or_none(body.get("Action")) or 4
    client_id = body.get("ClientId")

    if action == 5:
        cdm = {(c.DocumentId, c.ClientId) for c in CDMMaster.objects.all()}
        pm = {p.PartyId: p.PartyName for p in PartyMaster.objects.all()}
        cdm_map = {}
        for c in CDMMaster.objects.all():
            cdm_map.setdefault(c.ClientId, []).append(c)
        rows = []
        for client_id_key, items in cdm_map.items():
            for c in items:
                d = DocumentMaster.objects.filter(Id=c.DocumentId).first()
                if not d:
                    continue
                rows.append({
                    "Id": len(rows) + 1,
                    "RowNo": 1,
                    "ClientName": pm.get(client_id_key),
                    "DocumentId": d.Id,
                    "DocumentName": d.DocumentName,
                    "CreatedOn": _fmt_date(c.CreatedOn, "%d-%m-%Y %I:%M %p"),
                })
        rows.sort(key=lambda r: r["ClientName"] or "", reverse=True)
        return legacy_json_string(rows)

    docs = list(DocumentMaster.objects.all())
    mapped = {(d.DocumentId, d.ClientId) for d in CDMMaster.objects.filter(ClientId=_int_or_none(client_id))}
    rows = [
        {
            "IsAllow": (d.Id, _int_or_none(client_id)) in mapped,
            "DocumentId": d.Id,
            "DocumentName": d.DocumentName,
            "DocumentType": d.DocumentType,
            "Frequency": d.Frequency,
            "FormatType": d.FormatType,
            "Note": d.Note,
            "IsDefault": d.IsDefault,
            "CreatedOn": _fmt_date(d.CreatedOn, "%d-%m-%Y %I:%M %p"),
        }
        for d in docs
    ]
    return legacy_json_string(rows)


@csrf_exempt
def cdm_iud(request):
    """POST /api/CDM/IUDCDM — Action 1: replace client document mapping."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _body_params(request)
    client_id = _int_or_none(body.get("ClientId"))
    login_id = _login_id(request) or _int_or_none(body.get("Createdby"))
    with transaction.atomic():
        CDMMaster.objects.filter(ClientId=client_id).delete()
        for doc_id in _parse_doc_list(body.get("DocumentList")):
            if _int_or_none(doc_id):
                CDMMaster.objects.create(
                    ClientId=client_id, DocumentId=_int_or_none(doc_id),
                    Createdby=login_id, CreatedOn=timezone.now())
    return legacy_status_result("1")


# ---------------------------------------------------------------------------
# ClientActMappingController (USP_ClientActMapping)
# ---------------------------------------------------------------------------


@csrf_exempt
def client_act_mapping_iud(request):
    """POST /api/ClientActMapping/IUDClientActMapping — Action 1: replace the
    client's act mapping."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _body_params(request)
    client_id = _int_or_none(body.get("ClientId"))
    login_id = _login_id(request) or _int_or_none(body.get("Createdby"))
    with transaction.atomic():
        ClientActMapping.objects.filter(ClientId=client_id).delete()
        for act_id in _parse_doc_list(body.get("DocumentList")):
            if _int_or_none(act_id):
                ClientActMapping.objects.create(
                    ClientId=client_id, ActId=_int_or_none(act_id),
                    Createdby=login_id, CreatedOn=timezone.now())
    return legacy_status_result("1")


@csrf_exempt
def client_act_mapping_search(request):
    """GET/POST /api/ClientActMapping/SearchClientActMapping — Actions 2..7:
    2=months, 3=financial years, 4=compliance master per client, 5=all client
    mappings, 6=timeperiod status, 7=menu permission buttons."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _body_params(request)
    action = _int_or_none(body.get("Action")) or 4
    client_id = body.get("ClientId")

    if action == 2:
        months = [("January", 1), ("February", 2), ("March", 3), ("April", 4),
                  ("May", 5), ("June", 6), ("July", 7), ("August", 8),
                  ("September", 9), ("October", 10), ("November", 11), ("December", 12)]
        return legacy_json_string([{"MonthName": n, "MonthNumber": i} for n, i in months])

    if action == 3:
        return legacy_json_string(_financial_years())

    if action == 5:
        cam_map = {}
        for c in ClientActMapping.objects.all():
            cam_map.setdefault(c.ClientId, set()).add(c.ActId)
        pm = {p.PartyId: p.PartyName for p in PartyMaster.objects.all()}
        rows = []
        for client_key, act_ids in cam_map.items():
            for a in ComplianceMaster.objects.filter(Id__in=act_ids).order_by("Act"):
                rows.append({
                    "Id": len(rows) + 1, "RowNo": 1,
                    "IsAllow": True, "Id2": a.Id, "Act": a.Act, "Form": a.Form,
                    "Nature": a.Nature, "REMARK": a.REMARK, "Score": a.Score,
                    "ClientName": pm.get(client_key),
                })
        rows.sort(key=lambda r: r["ClientName"] or "", reverse=True)
        return legacy_json_string(rows)

    if action == 6:
        vendor_id = body.get("VendorId")
        exists = TimePeriod.objects.filter(
            ClientId=_int_or_none(client_id), VendorId=vendor_id).exists()
        return legacy_json_string([{"IStatus": 1 if exists else 0}])

    if action == 7:
        vendor_id = body.get("VendorId")
        sub10 = MenuPermission.objects.filter(
            EmpId=str(vendor_id), SubMenuId=10, IsActive=True).exists()
        sub51 = MenuPermission.objects.filter(
            EmpId=str(vendor_id), SubMenuId=51, IsActive=True).exists()
        if sub10 and sub51:
            perm = "3"
        elif sub10:
            perm = "1"
        elif sub51:
            perm = "2"
        else:
            perm = "0"
        return legacy_json_string([{"PERBTN": perm}])

    # Action 4 — compliance master with mapping status for this client
    mapped = set(ClientActMapping.objects.filter(
        ClientId=_int_or_none(client_id)).values_list("ActId", flat=True))
    rows = [
        {
            "IsAllow": c.Id in mapped,
            "Id": c.Id, "Act": c.Act, "Form": c.Form,
            "Nature": c.Nature, "REMARK": c.REMARK, "Score": c.Score,
        }
        for c in ComplianceMaster.objects.order_by("Id")
    ]
    return legacy_json_string(rows)


def _financial_years():
    """Replicate USP_ClientActMapping @Action=3 financial-year list."""
    today = timezone.localdate()
    date_from = today.replace(year=today.year - 5)
    date_to = today if today.month >= 3 else today.replace(year=today.year - 1)
    fy = (date_from.year - 1) if date_from.month <= 3 else date_from.year
    end_year = date_to.year
    rows = []
    seen = set()
    while end_year >= fy:
        key = fy
        if key not in seen:
            seen.add(key)
            rows.append({
                "FyId": str(fy),
                "FinancialName": f"{fy}-{fy + 1}",
                "startdate": f"{fy}-04-01",
                "enddate": f"{fy + 1}-03-31",
            })
        fy += 1
    return rows


# ---------------------------------------------------------------------------
# ChatController (RTL.USP_Chatbot)
# ---------------------------------------------------------------------------


def _save_upload_file(upload, subfolder):
    from django.conf import settings
    folder = os.path.join(settings.MEDIA_ROOT, subfolder)
    os.makedirs(folder, exist_ok=True)
    ext = os.path.splitext(upload.name or "")[1].lower() or ".png"
    filename = f"{uuid.uuid4().hex}{ext}"
    with open(os.path.join(folder, filename), "wb") as f:
        for chunk in upload.chunks():
            f.write(chunk)
    return f"/media/{subfolder}/{filename}"


@csrf_exempt
def chat_save_message(request):
    """POST /api/Chat/SaveChatMessage — multipart (message, LoginId, Action, file)."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _body_params(request)
    login_id = _int_or_none(body.get("LoginId")) or _login_id(request)
    file_path = ""
    f = (request.FILES or {}).get("file")
    if f:
        file_path = _save_upload_file(f, "Chatbot/Uploads")
    ticket = _generate_ticket_no()
    Chatbot.objects.create(
        TicketNo=ticket, FileUpload=file_path or body.get("FileUpload"),
        Detail=body.get("message") or body.get("Detail"),
        Createdby=login_id, createdon=timezone.now(), Status=0)
    return legacy_status_result(ticket)


@csrf_exempt
def chat_update(request):
    """POST /api/Chat/updatechatbot — Action 2: rate + suggestion on a ticket."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _body_params(request)
    Chatbot.objects.filter(TicketNo=body.get("TicketNo")).update(
        Rate=body.get("Rate"), Suggestion=body.get("suggestion"), Status=0)
    return legacy_status_result("1")


@csrf_exempt
def chat_search(request):
    """GET/POST /api/Chat/SearchChatbot — Action 4: list tickets w/ user info."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _body_params(request)
    lt = {l.LoginId: l for l in LoginTable.objects.all()}
    rows = []
    for c in Chatbot.objects.order_by("-Id"):
        u = lt.get(c.Createdby)
        rows.append({
            "TicketNo": c.TicketNo,
            "FileUpload": c.FileUpload,
            "Detail": c.Detail,
            "Rate": c.Rate,
            "Suggestion": c.Suggestion,
            "createdon": _fmt_date(c.createdon, "%Y-%m-%d %I:%M %p"),
            "Status": c.Status,
            "UserName": u.UserName if u else None,
            "EmailId": u.EmailId if u else None,
            "Photo": u.Photo if u else None,
        })
    return legacy_json_string(rows)


@csrf_exempt
def chat_approve(request):
    """POST /api/Chat/Approve — Action 5: mark ticket approved + open conversation."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _body_params(request)
    ticket = body.get("TicketNo")
    chat = Chatbot.objects.filter(TicketNo=ticket).first()
    if not chat:
        return legacy_status_result("2")
    Chatbot.objects.filter(TicketNo=ticket).update(Status=1)
    conv_id = _generate_conversation_id()
    sno = Conversation.objects.filter(ConversationId=conv_id).count() + 1
    Conversation.objects.create(
        ConversationId=conv_id, SNO=sno, InvoiceNo=ticket,
        Conversation=body.get("Detail") or chat.Detail,
        Sender="1", Receiver=chat.Createdby, Updatedby="1",
        UpdatedON=timezone.now(), Isdelete=0, Status=0, IsRead=0)
    return legacy_status_result("2")


# ---------------------------------------------------------------------------
# Payment / Cashfree (stub — no real gateway call)
# ---------------------------------------------------------------------------


@csrf_exempt
def payment_create_order(request):
    """POST /api/Payment/CreateOrder — record the request in the log table and
    return a legacy success JSON. No real payment gateway is called."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _body_params(request)
    login_id = _login_id(request)
    try:
        payload = json.dumps(body)
    except Exception:
        payload = str(body)
    order_id = uuid.uuid4().hex[:12]
    PaymentRequestLog.objects.create(
        LoginId=login_id, OrderId=order_id, Amount=body.get("Amount"),
        Name=body.get("Name"), MobileNo=body.get("MobileNo"),
        EmailId=body.get("EmailId"), Payload=payload, Status="SUCCESS",
        CreatedOn=timezone.now())
    return legacy_status_result({"status": True, "Result": order_id, "OrderId": order_id})
