"""Replicated legacy endpoints (contract-compatible with the ASP.NET backend).

Response convention: most legacy actions return a JSON *string* that is itself an
array of row objects (keys = column names). We reproduce the same payload shape
so the existing frontend keeps working.
"""
import json
from datetime import date, datetime

from django.db.models import Max
from django.http import HttpResponse, JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.views.decorators.http import require_POST

from legacy.models import (
    AssignExecuter,
    CircleMaster,
    City,
    Country,
    EmployeeMaster,
    Industry,
    LicenseDetailsMaster,
    LicenseManagementCompliance,
    LicenseMaster,
    LicenceRequest,
    Location,
    LoginTable,
    LWFCompliance,
    MenuMaster,
    MenuPermission,
    MinimumWageCompliance,
    ModuleMaster,
    Newsletter,
    NewsletterClientMapping,
    PagesSectionMaster,
    PagesSectionRolePermission,
    PartyMaster,
    ProfessionalTaxCompliance,
    PtComplianceSlab,
    RegionMaster,
    RoleMaster,
    SiteManager,
    State,
    StatusMaster,
    StoreComplianceDocument,
    StoreComplianceStatusMaster,
    StoreLicences,
    StoreMapping,
    StoreMaster,
    StorePrefix,
    SubMenuMaster,
    Subsidiary,
)

from .legacy_auth import generate_captcha, legacy_login_user


def legacy_json_string(rows):
    """Return HTTP body = JSON array text (like JsonConvert.SerializeObject(DataTable))."""
    return HttpResponse(json.dumps(rows, default=str), content_type="application/json")


def session_expired():
    return HttpResponse(
        json.dumps({"Result": "SessionExpired", "Message": "Session Expire"}),
        content_type="application/json",
        status=401,
    )


def legacy_status_result(result):
    """Legacy IUD contract: {'status': True, 'Result': <scalar>}."""
    return JsonResponse({"status": True, "Result": result})


def _request_params(request):
    """Collect request params. Legacy frontend POSTs JSON (sometimes wrapped
    as '{obj: {...}}' raw strings); also accept querystring params on GET."""
    params = {}
    if request.method == "POST":
        raw = request.body or b"{}"
        try:
            data = json.loads(raw)
        except Exception:
            data = {}
        if isinstance(data, dict):
            obj = data.get("obj")
            if isinstance(obj, str):
                try:
                    data.update(json.loads(obj))
                except Exception:
                    pass
            elif isinstance(obj, dict):
                data.update(obj)
            params.update(data)
    else:
        params.update(request.GET.dict())
    return params


def _int_or_none(value):
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _to_bool(value, default=None):
    if value is None:
        return default
    s = str(value).strip().lower()
    if s in ("1", "true", "t", "yes", "y"):
        return True
    if s in ("0", "false", "f", "no", "n"):
        return False
    return default


def _parse_date(value):
    """Best-effort date parse (legacy sends datepicker/string dates)."""
    if not value:
        return None
    s = str(value).strip()
    for fmt in ("%Y-%m-%d", "%Y/%m/%d", "%d/%m/%Y", "%m/%d/%Y", "%d-%m-%Y", "%d %b %Y"):
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            continue
    return None


def _yes_no(value):
    return "Yes" if value else "No"


def _login_id(request):
    return getattr(request, "legacy_login_id", None)


def _login(request):
    """POST /api/Login/GetUserId — legacy login contract (bcrypt + CAPTCHA)."""
    body = json.loads(request.body or b"{}")
    username = body.get("UserName") or body.get("username")
    password = body.get("Password") or body.get("password")
    captcha_token = body.get("CaptchaToken")
    captcha = body.get("Captcha")
    code, user = legacy_login_user(request, username, password, captcha_token, captcha)
    if code:
        return HttpResponse(code, content_type="text/plain")
    if user == []:
        return HttpResponse("[]", content_type="text/plain")
    return legacy_json_string([user])


login_view = csrf_exempt(require_POST(_login))


def v_login_verify(request):
    """POST /api/Login/VLoginVerify — legacy action-based auth flow.

    Replicates the legacy LoginController/VLoginVerify (USP_LoginTable) actions:
      Action 8  -> login OTP request (returns user + Otp)
      Action 43 -> secure login with OTP
      Action 44 -> MPIN login
      Action 45 -> username/password login
      Action 46 -> registration OTP request (PassWord = LoginType)
      Action 47 -> confirm registration (Password = OTP)
      Action 49 -> resend registration OTP
    """
    try:
        body = json.loads(request.body or b"{}")
    except Exception:
        body = {}
    # legacy frontend sends {obj: {...}}
    if isinstance(body, dict) and "obj" in body and isinstance(body["obj"], dict):
        body = body["obj"]

    action = str(body.get("Action") or body.get("action") or "")
    username = body.get("Username") or body.get("UserName") or body.get("username") or ""
    password = body.get("Password") or body.get("password") or ""

    lt = LoginTable.objects.filter(UserName__iexact=username).first()
    login_id = lt.LoginId if lt else None

    # Action 8: login OTP request
    if action == "8":
        if not lt:
            return legacy_json_string([])
        # generate OTP, store it
        otp = _generate_otp()
        LoginTable.objects.filter(LoginId=login_id).update(Otp=str(otp))
        return legacy_json_string([{
            "LoginId": str(login_id), "Otp": str(otp),
            "UserName": lt.UserName, "Name": lt.Name or "", "LoginType": str(lt.LoginType or ""),
        }])

    # Action 43: secure login with OTP
    if action == "43":
        if not lt or not password:
            return legacy_json_string([])
        if str(lt.Otp or "") != str(password):
            return legacy_json_string([])
        LoginTable.objects.filter(LoginId=login_id).update(Otp="")
        return _legacy_session_response(lt)

    # Action 44: MPIN login
    if action == "44":
        if not lt or not password:
            return legacy_json_string([])
        if str(lt.MPIN or "") != str(password):
            return legacy_json_string([])
        return _legacy_session_response(lt)

    # Action 45: username/password login
    if action == "45":
        legacy_ok = False
        if lt and password and str(lt.Password or "") == str(password):
            legacy_ok = True
        if not legacy_ok:
            # Fall back to Django auth user (admin/employer/contractor/worker created via Django)
            from django.contrib.auth import get_user_model
            User = get_user_model()
            u = User.objects.filter(username__iexact=username).first()
            if not u:
                u = User.objects.filter(email__iexact=username).first()
            if u and u.check_password(password) and u.is_active:
                # Block EMPLOYER accounts whose employer isn't approved yet.
                if getattr(u, "role", "") == "EMPLOYER":
                    from qr.models import Employer as QREmployer
                    emp = None
                    if u.employer_id:
                        emp = QREmployer.objects.filter(pk=u.employer_id).first()
                    if emp is None and u.email:
                        emp = QREmployer.objects.filter(email__iexact=u.email).first()
                    if emp is None or emp.approval_status != "APPROVED":
                        return legacy_json_string([])
                role_login_type = {"SUPER_ADMIN": "1", "EMPLOYER": "5", "PRIMARY_CONTRACTOR": "2", "SECONDARY_CONTRACTOR": "6", "WORKER": "7"}.get(u.role, "1")
                # Persist legacy_login_id so the legacy X-Legacy-Login-Id header auth
                # (LegacyHeaderAuthentication) can resolve this user on later calls.
                if not u.legacy_login_id:
                    u.legacy_login_id = u.pk
                    try:
                        u.save(update_fields=["legacy_login_id"])
                    except Exception:
                        pass
                return legacy_json_string([{
                    "LoginId": str(u.legacy_login_id or u.pk),
                    "UserName": u.username,
                    "Name": u.get_full_name() or u.username,
                    "LoginType": role_login_type,
                    "SessionId": "S" + str(u.pk),
                    "EmailId": u.email or "",
                    "BranchCode": "",
                    "ContactNo": u.mobile or "",
                    "LastLogin": "",
                    "CurrentLogin": "",
                    "RPath": "/Dashboard/CommonDashboard",
                }])
            return legacy_json_string([])
        return _legacy_session_response(lt)

    # Action 46: registration OTP request
    if action == "46":
        # legacy sends PassWord = LoginType (5/6/7)
        login_type = body.get("PassWord") or body.get("Password") or "7"
        if lt:
            return legacy_json_string([{"LoginId": "-1"}])
        otp = _generate_otp()
        new_id = _new_login_id()
        # create a pending user with OTP; record LoginType in MPIN column temporarily
        LoginTable.objects.create(
            LoginId=new_id, UserName=username, Password="", Otp=str(otp),
            LoginType=int(login_type) if str(login_type).isdigit() else 7,
            IsActive="0", MPIN="",
        )
        return legacy_json_string([{"LoginId": str(new_id), "Otp": str(otp)}])

    # Action 47: confirm registration (Password = OTP)
    if action == "47":
        if not lt or not password:
            return legacy_json_string([])
        if str(lt.Otp or "") != str(password):
            return legacy_json_string([])
        LoginTable.objects.filter(LoginId=login_id).update(Otp="", IsActive="1")
        # If this is a Principal Employer registration, create a PENDING Employer in the QR system
        try:
            login_type = int(lt.LoginType or 7)
        except (TypeError, ValueError):
            login_type = 7
        if login_type == 5:
            from qr.models import Employer as QREmployer
            from qr.services import create_qr_for_entity
            emp, created = QREmployer.objects.get_or_create(
                email=(lt.EmailId or None),
                defaults={
                    "name": lt.Name or lt.UserName or f"Employer {lt.LoginId}",
                    "contact_person": lt.Name or "",
                    "contact_mobile": lt.ContactNo or "",
                    "approval_status": "PENDING",
                    "is_active": False,
                },
            )
            if created:
                create_qr_for_entity("EMPLOYER", emp.pk)
        return _legacy_session_response(lt)

    # Action 49: resend registration OTP
    if action == "49":
        if not lt:
            return legacy_json_string([{"LoginId": "-1"}])
        otp = _generate_otp()
        LoginTable.objects.filter(LoginId=login_id).update(Otp=str(otp))
        return legacy_json_string([{"LoginId": str(login_id), "Otp": str(otp)}])

    return legacy_json_string([])


def _generate_otp():
    import random
    return "".join([str(random.randint(0, 9)) for _ in range(4)])


def _new_login_id():
    from django.db.models import Max
    return (LoginTable.objects.aggregate(m=Max("LoginId"))["m"] or 0) + 1


def _legacy_session_response(lt):
    """Build the legacy login session row (matches GetUserId/NGetUserId shape)."""
    user = {
        "LoginId": str(lt.LoginId),
        "UserName": lt.UserName or "",
        "Name": lt.Name or "",
        "LoginType": str(lt.LoginType or ""),
        "SessionId": str(lt.SessionId or ""),
        "EmailId": lt.EmailId or "",
        "BranchCode": str(lt.BranchCode or ""),
        "ContactNo": lt.ContactNo or "",
        "LastLogin": lt.LastLogin or "",
        "CurrentLogin": "",
        "RPath": "/Dashboard/CommonDashboard",
    }
    # keep SessionId stable for the session (reuse if set, else generate)
    session_id = lt.SessionId or "S" + str(lt.LoginId)
    LoginTable.objects.filter(LoginId=lt.LoginId).update(SessionId=session_id, Session="1")
    user["SessionId"] = session_id
    return legacy_json_string([user])


v_login_verify_view = csrf_exempt(require_POST(v_login_verify))


def captcha_view(request):
    """GET /api/Login/CaptchaImage — returns {image, token}."""
    token, answer, image = generate_captcha()
    return JsonResponse({"image": image, "token": token})


captcha_view = csrf_exempt(captcha_view)


@csrf_exempt
def employee_master(request):
    """GET/POST /api/RetailSection/GetEmployeeMaster — read-only from legacy SQL Server."""
    if not request.user.is_authenticated:
        return session_expired()
    rows = list(EmployeeMaster.objects.values(
        "Id", "EmployeeCode", "RefEmployeeCode", "EmployeeName",
        "EmployeeDesignation", "EmployeeDepartment", "Father_Husband_Name",
        "Gendar", "MaritalStatus", "DateOfBirth", "DOJ", "MobileNumber",
        "PANNumber", "AdharCardNumber", "StoreCode", "UserId", "IsActive",
    )[:200])
    return legacy_json_string(rows)


@csrf_exempt
def store_master(request):
    if not request.user.is_authenticated:
        return session_expired()
    rows = list(StoreMaster.objects.values(
        "Id", "StoreCode", "RefStoreCode", "StoreName", "Category", "IsActive",
        "StoreLocation", "CompleteAddress", "CreatedBy"
    )[:200])
    return legacy_json_string(rows)


@csrf_exempt
def maintain_log(request):
    """Logged activity — sanitized output (legacy had SQL-injection artifact rows)."""
    from legacy.models import MaintainLog
    rows = list(MaintainLog.objects.order_by("-Id").values(
        "Id", "UserId", "Activity", "MachineName", "SystemUserName", "CreatedOn"
    )[:100])
    return legacy_json_string(rows)


@csrf_exempt
def menu_list(request):
    """POST /Dashboard/NavMenuList — nested module→menu→submenu tree scoped by LoginId/LoginType/BranchCode.

    Matches the legacy USP_GetModule/USP_GetMenu/USP_GetSubMenu contract.
    """
    if not request.user.is_authenticated:
        return session_expired()
    body = json.loads(request.body or b"{}") if request.method == "POST" else {}
    login_type = body.get("LoginType")
    modules = list(ModuleMaster.objects.order_by("DisplayOrder", "ModuleId").values(
        "ModuleId", "Name", "Icon"
    ))
    tree = []
    for m in modules:
        menus = list(MenuMaster.objects.filter(ModuleId=m["ModuleId"]).order_by("DisplayOrder", "MenuId").values(
            "MenuId", "Name", "Url", "Icon"
        ))
        menu_list_out = []
        for men in menus:
            subs = list(SubMenuMaster.objects.filter(MenuId=men["MenuId"]).order_by("DisplayOrder", "SubMenuId").values(
                "SubMenuId", "Name", "Url", "Icon", "SAAccess", "AdminAccess", "StaffAccess", "UserFor"
            ))
            menu_list_out.append({
                "MenuId": str(men["MenuId"]),
                "MenuName": men["Name"],
                "MenuIcon": men["Icon"],
                "submenu": [{
                    "SubMenuId": str(s["SubMenuId"]),
                    "SubMenuName": s["Name"],
                    "SubMenuIcon": s["Icon"],
                    "SubMenuUrl": s["Url"],
                } for s in subs],
            })
        tree.append({
            "EmployeeCode": None,
            "ModuleName": m["Name"],
            "LoginType": None,
            "LoginId": None,
            "UserId": None,
            "BranchCode": None,
            "ModuleIcon": m["Icon"],
            "ModuleId": str(m["ModuleId"]),
            "PartyId": 0,
            "PartyType": 0,
            "RoleId": 0,
            "menu": menu_list_out,
        })
    return legacy_json_string(tree)


@csrf_exempt
def module_list(request):
    """POST /Dashboard/ModuleList — modules with ModuleName/ModuleIcon keys (legacy contract)."""
    if not request.user.is_authenticated:
        return session_expired()
    body = json.loads(request.body or b"{}") if request.method == "POST" else {}
    rows = list(ModuleMaster.objects.order_by("DisplayOrder", "ModuleId").values(
        "ModuleId", "Name", "Icon"
    ))
    out = [{"ModuleId": r["ModuleId"], "ModuleName": r["Name"], "ModuleIcon": r["Icon"]} for r in rows]
    return legacy_json_string(out)


@csrf_exempt
def submenu_list(request):
    """GET/POST /Dashboard/SubMenuList — submenus by menu."""
    if not request.user.is_authenticated:
        return session_expired()
    body = json.loads(request.body or b"{}") if request.method == "POST" else {}
    menu_id = body.get("MenuId")
    qs = SubMenuMaster.objects.all()
    if menu_id:
        qs = qs.filter(MenuId=menu_id)
    rows = list(qs.values(
        "SubMenuId", "MenuId", "DisplayName", "Name", "HostedFolder", "Url",
        "DisplayOrder", "Icon", "PermissionFor", "NameForMobile",
        "SAAccess", "AdminAccess", "StaffAccess", "UserFor",
    ))
    return legacy_json_string(rows)


@csrf_exempt
def role_list(request):
    """GET/POST /Dashboard/RoleList — roles."""
    if not request.user.is_authenticated:
        return session_expired()
    rows = list(RoleMaster.objects.values("Id", "Name", "Description", "StartDate", "EndDate"))
    return legacy_json_string(rows)


# ---------------------------------------------------------------------------
# Phase 5 — PartyMaster (PartyMasterController.cs)
# ---------------------------------------------------------------------------


def _party_row(row, emp_map, ind_map):
    """Party master row dict shaped like the legacy USP_TBL_PartyMaster DataTable."""
    emp = emp_map.get(row.EmpId)
    industry = row.Industry
    return {
        "PartyId": row.PartyId,
        "PartyCode": row.PartyCode,
        "PartyType": row.PartyType,
        "PartyName": row.PartyName,
        "Address": row.Address,
        "EmailId": row.EmailId,
        "Pincode": row.Pincode,
        "ContactNo": row.ContactNo,
        "IsActive": _yes_no(row.IsActive),
        "IsActived": _yes_no(row.IsActive),
        "BankDetails": row.BankDetails,
        "RegistrationType": row.RegistrationType,
        "PANITNO": row.PANITNO,
        "GSTINUIN": row.GSTINUIN,
        "ContactPerson": row.ContactPerson,
        "ContactMobile": row.ContactMobile,
        "Descritpion": row.Descritpion,
        "VendorId": row.VendorId,
        "EmpId": row.EmpId,
        "StoreLimit": row.StoreLimit,
        "UserLimit": row.UserLimit,
        "ValidTo": row.ValidTo,
        "PartyDate": row.PartyDate,
        "Industry": industry,
        "IndustryName": ind_map.get(str(industry)) if industry else None,
        "MonthExpired": row.MonthExpired,
        "ContractorLimit": row.ContractorLimit,
        "Sitelimit": row.Sitelimit,
        "State": row.State,
        "City": row.City,
        "CreatedOn": row.CreatedOn,
        "EmployeeCode": emp.EmployeeCode if emp else None,
        "EmployeeName": emp.EmployeeName if emp else None,
    }


@csrf_exempt
def party_master_dt(request):
    """GET/POST /api/PartyMaster/GetPartyMasterDT — list parties (ActionType=4
    default); also serves country/state/city lookups (ActionType 27/28/29)."""
    if not request.user.is_authenticated:
        return session_expired()
    params = _request_params(request)
    action_type = str(params.get("ActionType") or "")

    if action_type == "27":
        rows = list(Country.objects.values("CountryId", "CountryName", "CountryCode", "IsActive"))
        return legacy_json_string(rows)
    if action_type == "28":
        rows = list(State.objects.values("SATE_CODE", "COUNTRY_CODE", "STATE_NM"))
        return legacy_json_string(rows)
    if action_type == "29":
        rows = list(City.objects.values("CITY_CODE", "CITY_NAME", "STATE_NAME", "STATE_ID"))
        return legacy_json_string(rows)

    qs = PartyMaster.objects.all()
    party_id = params.get("PartyId")
    if party_id:
        qs = qs.filter(PartyId=party_id)
    party_type = params.get("PartyType")
    if party_type:
        qs = qs.filter(PartyType=party_type)
    created_by = params.get("CreatedBy")
    if created_by:
        qs = qs.filter(CREATED_BY=created_by)
    rows = list(qs[:500])

    emp_ids = {r.EmpId for r in rows if r.EmpId}
    ind_ids = {r.Industry for r in rows if r.Industry and str(r.Industry).isdigit()}
    emp_map = {}
    if emp_ids:
        for e in EmployeeMaster.objects.filter(Id__in=emp_ids):
            emp_map[e.Id] = e
    ind_map = {}
    if ind_ids:
        for i in Industry.objects.filter(Id__in=ind_ids):
            ind_map[str(i.Id)] = i.Industry

    return legacy_json_string([_party_row(r, emp_map, ind_map) for r in rows])


@csrf_exempt
def insert_update_del_party_master(request):
    """POST /api/PartyMaster/InsertUpdateDelPartyMaster — ActionType 1=insert,
    2=update, else soft-delete. Mirrors EVM.USP_TBL_PartyMaster."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    action_type = _int_or_none(body.get("ActionType"))
    login_id = _login_id(request) or _int_or_none(body.get("CreatedBy"))

    common = {
        "PartyName": body.get("PartyName"),
        "Address": body.get("Address"),
        "EmailId": body.get("EmailId"),
        "Pincode": body.get("Pincode"),
        "ContactNo": body.get("ContactNo"),
        "BankDetails": body.get("BankDetails"),
        "RegistrationType": body.get("RegistrationType"),
        "PANITNO": body.get("Panitno"),
        "GSTINUIN": body.get("Gstinuin"),
        "Descritpion": body.get("Descritpion"),
        "ContactMobile": body.get("ContactMobile"),
        "ContactPerson": body.get("ContactPerson"),
        "VendorId": body.get("VendorId"),
        "Industry": body.get("Industry"),
        "State": body.get("State"),
        "City": body.get("City"),
        "ValidTo": body.get("ValidTo"),
        "PartyDate": body.get("PartyDate"),
        "ContractorLimit": body.get("Contractorlimit"),
        "Sitelimit": body.get("Sitelimit"),
        "StoreLimit": _int_or_none(body.get("StoreLimit")),
        "UserLimit": _int_or_none(body.get("UserLimit")),
        "MonthExpired": _int_or_none(body.get("MonthExpired")),
        "EmpId": _int_or_none(body.get("EmployeeId")),
        "IsActive": _to_bool(body.get("IsActive"), default=True),
    }
    if action_type == 1:
        row = PartyMaster.objects.create(
            PartyType=body.get("PartyType"),
            PartyCode=body.get("PartyCode"),
            CREATED_BY=login_id,
            CreatedOn=timezone.now(),
            IsDeleted=False,
            **common,
        )
        return legacy_status_result(row.PartyId)
    if action_type == 2:
        PartyMaster.objects.filter(PartyId=body.get("PartyId")).update(
            UpdateOn=timezone.now(),
            LAST_UPDATE_BY=str(login_id) if login_id else None,
            **common,
        )
        return legacy_status_result(body.get("PartyId") or "1")
    # soft delete / deactivate
    PartyMaster.objects.filter(PartyId=body.get("PartyId")).update(
        IsDeleted=True, IsActive=False, UpdateOn=timezone.now()
    )
    return legacy_status_result("1")


@csrf_exempt
def get_search_location(request):
    """GET/POST /api/PartyMaster/GetSearchLocation — location list w/ party+site names."""
    if not request.user.is_authenticated:
        return session_expired()
    params = _request_params(request)
    qs = Location.objects.all()
    party_id = params.get("PartyId")
    if party_id:
        qs = qs.filter(PartyId=party_id)
    rows = list(qs[:500])

    party_ids = {r.PartyId for r in rows if r.PartyId}
    site_ids = {r.SiteId for r in rows if r.SiteId}
    party_map = {}
    if party_ids:
        for p in PartyMaster.objects.filter(PartyId__in=party_ids):
            party_map[p.PartyId] = p.PartyName
    site_map = {}
    if site_ids:
        for s in SiteManager.objects.filter(SiteId__in=site_ids):
            site_map[s.SiteId] = s.SiteName

    result = [
        {
            "Id": r.Id,
            "PartyId": r.PartyId,
            "SiteId": r.SiteId,
            "Location": r.Location,
            "PartyName": party_map.get(r.PartyId),
            "SiteName": site_map.get(r.SiteId),
            "CreatedBy": r.Createdby,
            "CreatedOn": r.CreatedOn,
        }
        for r in rows
    ]
    return legacy_json_string(result)


@csrf_exempt
def insert_update_del_location(request):
    """POST /api/PartyMaster/InsertUpdateDelLocation — ActionType 1=insert,
    2=update, else delete. Mirrors Usp_Location."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    action_type = _int_or_none(body.get("ActionType"))
    login_id = _login_id(request) or _int_or_none(body.get("CreatedBy"))

    if action_type == 1:
        row = Location.objects.create(
            PartyId=_int_or_none(body.get("PartyId")),
            SiteId=_int_or_none(body.get("ClientSiteId")),
            Location=body.get("Location"),
            Createdby=login_id,
            CreatedOn=timezone.now(),
        )
        return legacy_status_result(row.Id)
    if action_type == 2:
        Location.objects.filter(Id=body.get("Id")).update(
            PartyId=_int_or_none(body.get("PartyId")),
            SiteId=_int_or_none(body.get("ClientSiteId")),
            Location=body.get("Location"),
            Createdby=login_id,
        )
        return legacy_status_result(body.get("Id") or "1")
    Location.objects.filter(Id=body.get("Id")).delete()
    return legacy_status_result("1")


@csrf_exempt
def insert_update_del_lwf_compliance(request):
    """POST /api/PartyMaster/InsertUpdateDelLWFCompliance — multi-purpose action
    mirroring USP_LWFCompliances:
      Action 1/2 -> LWF compliance, 5/6 -> License, 8/9 -> Professional Tax
    (Action 8 returns the new PT compliance Id so the frontend can attach slabs)."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    action = _int_or_none(body.get("Action"))
    login_id = _login_id(request) or _int_or_none(body.get("CreatedBy"))
    compliance_id = body.get("Id")

    if action in (8, 9):  # Professional Tax
        data = {
            "State": body.get("State"),
            "Status": body.get("Status"),
            "DeductionCycle": body.get("DeductionCycle"),
            "PTNumber": body.get("PTNumber"),
            "Applicability": body.get("Applicability"),
            "Payment": body.get("Payment"),
            "ApplicationLink": body.get("ApplicationLink"),
            "GovtFees": body.get("GovtFees"),
            "DepositeAmt": body.get("DepositeAmt"),
            "EffectiveFrom": _parse_date(body.get("EffectiveFrom")),
            "Effectiveto": _parse_date(body.get("Effectiveto")),
            "CreatedBy": login_id,
        }
        if action == 8:
            row = ProfessionalTaxCompliance.objects.create(CreatedOn=timezone.now(), **data)
            return legacy_status_result(row.Id)
        ProfessionalTaxCompliance.objects.filter(Id=compliance_id).update(
            UpdatedBy=login_id, UpdateOn=timezone.now(), **data
        )
        return legacy_status_result(compliance_id or "1")

    if action in (5, 6):  # License management
        data = {
            "State": body.get("State"),
            "LicensesName": body.get("LicenseName"),
            "ApplicabilityCount": body.get("ApplicabilityCount"),
            "GovtFee": body.get("GovtFees"),
            "SecuritydepositeAmt": body.get("DepositeAmt"),
            "Createdby": login_id,
        }
        if action == 5:
            row = LicenseManagementCompliance.objects.create(CreatedOn=timezone.now(), **data)
            return legacy_status_result(row.Id)
        LicenseManagementCompliance.objects.filter(Id=compliance_id).update(
            UpdatedBy=login_id, UpdatedOn=timezone.now(), **data
        )
        return legacy_status_result(compliance_id or "1")

    # LWF compliance (Action 1/2)
    data = {
        "State": body.get("State"),
        "Status": body.get("Status"),
        "MinAmt": body.get("MinAmount"),
        "MaxAmt": body.get("MaxAmount"),
        "EmployeeShare": body.get("EmployeeShare"),
        "EmployerShare": body.get("EmployerShare"),
        "Month": body.get("Month"),
        "Type": body.get("Type"),
        "DesignationAvail": body.get("DesignationType"),
        "Designation": body.get("Designation"),
        "Effectivefrom": _parse_date(body.get("EffectiveFrom")),
        "Effectiveto": _parse_date(body.get("Effectiveto")),
        "CreatedBy": login_id,
    }
    if action == 1:
        row = LWFCompliance.objects.create(CreatedOn=timezone.now(), **data)
        return legacy_status_result(row.Id)
    LWFCompliance.objects.filter(Id=compliance_id).update(
        UpdatedBy=login_id, Updatedon=timezone.now().date(), **data
    )
    return legacy_status_result(compliance_id or "1")


@csrf_exempt
def get_new_compliances_data(request):
    """GET/POST /api/PartyMaster/GetNewCompliancesData — Action 4=LWF list,
    7=License list, 10=Professional Tax list (with slabs)."""
    if not request.user.is_authenticated:
        return session_expired()
    params = _request_params(request)
    action = str(params.get("Action") or "4")
    compliance_id = params.get("Id")
    state = params.get("State")

    if action == "10":  # Professional Tax + slabs
        qs = ProfessionalTaxCompliance.objects.all()
        if compliance_id:
            qs = qs.filter(Id=compliance_id)
        if state:
            qs = qs.filter(State=state)
        rows = list(qs)
        slabs = list(PtComplianceSlab.objects.filter(Pid__in=[r.Id for r in rows]))
        result = []
        for r in rows:
            row_slabs = [s for s in slabs if s.Pid == r.Id] or [None]
            for s in row_slabs:
                result.append({
                    "Id": r.Id,
                    "State": r.State,
                    "Status": r.Status,
                    "DeductionCycle": r.DeductionCycle,
                    "PTNumber": r.PTNumber,
                    "Applicability": r.Applicability,
                    "Payment": r.Payment,
                    "ApplicationLink": r.ApplicationLink,
                    "GovtFees": r.GovtFees,
                    "DepositeAmt": r.DepositeAmt,
                    "EffectiveFrom": r.EffectiveFrom,
                    "Effectiveto": r.Effectiveto,
                    "StartAmt": s.StartAmt if s else None,
                    "EndAmt": s.EndAmt if s else None,
                    "MonthlyAmt": s.MonthlyAmt if s else None,
                })
        return legacy_json_string(result)

    if action == "7":  # License management
        qs = LicenseManagementCompliance.objects.all()
        if compliance_id:
            qs = qs.filter(Id=compliance_id)
        if state:
            qs = qs.filter(State=state)
        result = [
            {
                "Id": r.Id,
                "State": r.State,
                "LicensesName": r.LicensesName,
                "ApplicabilityCount": r.ApplicabilityCount,
                "GovtFee": r.GovtFee,
                "SecuritydepositeAmt": r.SecuritydepositeAmt,
            }
            for r in qs
        ]
        return legacy_json_string(result)

    # LWF (default / Action 4)
    qs = LWFCompliance.objects.all()
    if compliance_id:
        qs = qs.filter(Id=compliance_id)
    if state:
        qs = qs.filter(State=state)
    result = [
        {
            "Id": r.Id,
            "State": r.State,
            "Status": r.Status,
            "MinAmt": r.MinAmt,
            "MaxAmt": r.MaxAmt,
            "EmployeeShare": r.EmployeeShare,
            "EmployerShare": r.EmployerShare,
            "Month": r.Month,
            "Type": r.Type,
            "DesignationAvail": r.DesignationAvail,
            "Designation": r.Designation,
            "EffectiveFrom": r.Effectivefrom,
            "Effectiveto": r.Effectiveto,
        }
        for r in qs
    ]
    return legacy_json_string(result)


@csrf_exempt
def insert_update_del_minimum_wage_compliance(request):
    """POST /api/PartyMaster/InsertUpdateDelMinimumWageCompliance — Action 1=insert,
    2=update. Mirrors USP_MinimumWagesCompliance."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    action = _int_or_none(body.get("Action"))
    login_id = _login_id(request) or _int_or_none(body.get("CreatedBy"))

    data = {
        "State": body.get("State"),
        "Status": body.get("Status"),
        "Industry": body.get("Industry"),
        "PaymentFrequency": body.get("PaymentFrequency"),
        "YearlyperBonus": body.get("PercentageBonus"),
        "PayoutMonth": body.get("PayoutMonth"),
        "Grade": body.get("Grade"),
        "EmploymentCategory": body.get("EmploymentCategory"),
        "Zone": body.get("Zone"),
        "BasicPermonth": body.get("BasicPerMonth"),
        "VDAPerMonth": body.get("VDAPerMonth"),
        "TotalPermonth": body.get("TotalPerMonth"),
        "MinWage": body.get("MinimumWage"),
        "Floorwage": body.get("FloorWage"),
        "EffectiveFrom": _parse_date(body.get("EffectiveFrom")),
        "EffectiveTo": _parse_date(body.get("Effectiveto")),
        "CreatedBy": login_id,
    }
    if action == 1:
        row = MinimumWageCompliance.objects.create(CreatedOn=timezone.now().date(), **data)
        return legacy_status_result(row.Id)
    MinimumWageCompliance.objects.filter(Id=body.get("Id")).update(
        UpdatedBy=login_id, UpdatedOn=timezone.now(), **data
    )
    return legacy_status_result(body.get("Id") or "1")


@csrf_exempt
def get_new_c_minimum_wages(request):
    """GET/POST /api/PartyMaster/GetNewCMinmumWages — minimum wage compliance list."""
    if not request.user.is_authenticated:
        return session_expired()
    params = _request_params(request)
    qs = MinimumWageCompliance.objects.all()
    if params.get("Id"):
        qs = qs.filter(Id=params.get("Id"))
    if params.get("State"):
        qs = qs.filter(State=params.get("State"))
    result = [
        {
            "Id": r.Id,
            "State": r.State,
            "Industry": r.Industry,
            "Status": r.Status,
            "PaymentFrequency": r.PaymentFrequency,
            "YearlyperBonus": r.YearlyperBonus,
            "PayoutMonth": r.PayoutMonth,
            "Grade": r.Grade,
            "EmploymentCategory": r.EmploymentCategory,
            "Zone": r.Zone,
            "BasicPerMonth": r.BasicPermonth,
            "VDAPerMonth": r.VDAPerMonth,
            "TotalPerMonth": r.TotalPermonth,
            "MinWage": r.MinWage,
            "FloorWage": r.Floorwage,
            "EffectiveFrom": r.EffectiveFrom,
            "Effectiveto": r.EffectiveTo,
        }
        for r in qs
    ]
    return legacy_json_string(result)


@csrf_exempt
def save_dynamic_rows(request):
    """POST /api/PartyMaster/SaveDynamicRows — insert/update Professional Tax slabs
    (USP_ProfessionalTaxSlabs)."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    items = body.get("DynamicRows") or []
    if not isinstance(items, list):
        return legacy_status_result("1")
    login_id = _login_id(request)
    for item in items:
        row_id = _int_or_none(item.get("Id"))
        created_by = _int_or_none(item.get("CreatedBy")) or login_id
        data = {
            "Pid": _int_or_none(item.get("PtId")),
            "StartAmt": str(item.get("Value1") or "0"),
            "EndAmt": str(item.get("Value2") or "0"),
            "MonthlyAmt": str(item.get("Value3") or "0"),
            "CreatedBy": created_by,
        }
        if row_id:
            PtComplianceSlab.objects.filter(Id=row_id).update(
                Updatedby=created_by, UpdatedOn=timezone.now(), **data
            )
        else:
            PtComplianceSlab.objects.create(CreatedOn=timezone.now(), **data)
    return legacy_status_result("1")


# ---------------------------------------------------------------------------
# Phase 6 — RetailSection masters (RetailSectionController.cs)
# ---------------------------------------------------------------------------


def _fmt_date(value, fmt="%d/%m/%Y"):
    if not value:
        return None
    if isinstance(value, datetime):
        return value.strftime(fmt)
    if isinstance(value, date):
        return value.strftime(fmt)
    return str(value)


def _expiry_status(valid_end, days_of_expire):
    """Legacy ExpiryStatus helper: 'Expired' / 'Expiring Soon' / 'Vaild'."""
    end = None
    if isinstance(valid_end, datetime):
        end = valid_end.date()
    elif isinstance(valid_end, date):
        end = valid_end
    else:
        s = str(valid_end or "").strip()
        if s and s not in ("1900-01-01", "01/01/1900"):
            end = _parse_date(s)
    if end is None:
        return "Vaild"
    try:
        days = (end - date.today()).days
        doe = int(days_of_expire or 0)
    except (TypeError, ValueError):
        return "Vaild"
    if end < date.today():
        return "Expired"
    if days <= doe:
        return "Expiring Soon"
    return "Vaild"


def _login_scope(user_id):
    """Return (login_type, allowed_store_ids) replicating the legacy
    StoreMapping/AssignExecuter scoping used by the dashboards."""
    lt = LoginTable.objects.filter(LoginId=user_id).values("LoginType").first()
    login_type = (lt or {}).get("LoginType")
    if str(login_type) == "1":
        return login_type, None
    qs = StoreMapping.objects.all()
    if str(login_type) == "5":
        map_ids = list(LoginTable.objects.filter(LoginId=user_id).values_list("MapId", flat=True))
        qs = qs.filter(PartyId__in=map_ids)
    elif AssignExecuter.objects.filter(ExecuterId=user_id).exists():
        party_ids = list(AssignExecuter.objects.filter(ExecuterId=user_id).values_list("PartyId", flat=True))
        qs = qs.filter(PartyId__in=party_ids)
    else:
        qs = qs.filter(UserId=user_id)
    return login_type, list(qs.values_list("StoreId", flat=True))


@csrf_exempt
def update_emp_status(request):
    """POST /api/RetailSection/UpdateEmpStatus — USP_EmployeeMaster @Action=9."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    emp_id = _int_or_none(body.get("Id"))
    status = body.get("Status")
    if emp_id is not None:
        EmployeeMaster.objects.filter(Id=emp_id).update(IsActive=str(status))
    return legacy_status_result("")


@csrf_exempt
def get_masters(request):
    """POST /api/RetailSection/GetMasters — RTL.GetMasters (city/circle/region/state)."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    action = _int_or_none(body.get("Action"))
    parent_id = body.get("ParentId")
    rows = []
    if action == 1:
        for r in City.objects.order_by("CITY_CODE").values("CITY_CODE", "CITY_NAME", "STATE_NAME"):
            rows.append({"Id": r["CITY_CODE"], "Name": r["CITY_NAME"], "StateName": r["STATE_NAME"]})
    elif action == 2:
        for r in CircleMaster.objects.filter(CityId=parent_id).values("Id", "Name"):
            rows.append({"Id": r["Id"], "Name": r["Name"]})
    elif action == 3:
        for r in RegionMaster.objects.values("Id", "Name"):
            rows.append({"Id": r["Id"], "Name": r["Name"]})
    elif action == 4:
        r = City.objects.filter(CITY_CODE=parent_id).values("STATE_NAME", "STATE_ID").first()
        if r:
            rows.append({"Name": r["STATE_NAME"], "StateId": r["STATE_ID"]})
    return legacy_json_string(rows)


@csrf_exempt
def get_store_code_number(request):
    """POST /api/RetailSection/GetStoreCodeNumber — RTL.USP_GetStoreCodeNumber."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    party_id = _int_or_none(body.get("PartyTypeId")) or _int_or_none(body.get("PartyId")) or 0
    seq = StoreMaster.objects.filter(PartyTypeId=str(party_id)).aggregate(m=Max("SequenceNumber"))["m"]
    seq = (seq or 0) + 1
    prefix = suffix = ""
    sp = StorePrefix.objects.filter(PartyId=party_id).first()
    if sp:
        prefix = sp.Prefix or ""
        suffix = sp.Suffix or ""
    return legacy_json_string([{"SeqNumber": f"{prefix}{seq:08d}{suffix}"}])


@csrf_exempt
def update_stores_status(request):
    """POST /api/RetailSection/UpdateStoresStatus — bulk IsActive update + UTA flag."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    selected = body.get("selectedStores") or body.get("StoreIds")
    is_active = body.get("isActive")
    if not selected:
        return legacy_status_result({"success": False, "message": "No stores were provided for update."})
    ids = [int(i) for i in selected]
    if is_active is not None:
        to_mark = list(StoreMaster.objects.filter(Id__in=ids, IsActive="2").values_list("Id", flat=True))
        if to_mark:
            StoreMaster.objects.filter(Id__in=to_mark).update(UTA=1)
        updated = StoreMaster.objects.filter(Id__in=ids).update(IsActive=str(is_active))
        if updated:
            return legacy_status_result({"success": True, "message": "Store status updated successfully."})
    return legacy_status_result({"success": False, "message": "No stores were updated."})


@csrf_exempt
def generate_employee_code(request):
    """POST /api/RetailSection/GenerateEmployeeCode — VoucherCreation('EM', maxId)."""
    if not request.user.is_authenticated:
        return session_expired()
    max_id = EmployeeMaster.objects.aggregate(m=Max("Id"))["m"] or 0
    return legacy_json_string([{"": f"EM{max_id + 1:05d}"}])


@csrf_exempt
def get_status_master(request):
    """POST /api/RetailSection/GetStatusMaster — RTL.USP_GetStatusMaster."""
    if not request.user.is_authenticated:
        return session_expired()
    rows = list(StatusMaster.objects.values("Id", "KeyName", "AttributeValue"))
    return legacy_json_string(rows)


@csrf_exempt
def store_compliance_status_master(request):
    """POST /api/RetailSection/StoreComplianceStatusMaster — RTL.Usp_StoreComplianceStatusMaster.

    Actions: 1=insert, 2=update, 3=delete (master Type rows); 4=store compliance
    document progress; 5/51=store license upload progress."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    action = _int_or_none(body.get("Action"))
    scs_id = _int_or_none(body.get("Id"))
    sc_type = body.get("StoreComplinaceStatusType") or body.get("Type")
    store_id = _int_or_none(body.get("StoreId")) or scs_id
    login_id = _login_id(request) or _int_or_none(body.get("Createdby")) or 1

    if action == 1:
        if scs_id and StoreComplianceStatusMaster.objects.filter(Id=scs_id).exists():
            return legacy_status_result("-1")
        StoreComplianceStatusMaster.objects.create(
            Type=sc_type, CreatedOn=timezone.now(), Createdby=login_id,
            Updatedby=login_id, UpdatedOn=timezone.now(),
        )
        return legacy_status_result("1")
    if action == 2:
        StoreComplianceStatusMaster.objects.filter(Id=scs_id).update(
            Type=sc_type, Updatedby=login_id, UpdatedOn=timezone.now()
        )
        return legacy_status_result("2")
    if action == 3:
        StoreComplianceStatusMaster.objects.filter(Id=scs_id).delete()
        return legacy_status_result("")
    if action == 4:
        total_upload = StoreComplianceDocument.objects.filter(
            StoreId=store_id, DocumentPath__isnull=False).count()
        total_verify = StoreComplianceDocument.objects.filter(
            StoreId=store_id, Verify=1).count()
        tot_per = round(total_verify * 100.0 / total_upload, 2) if total_upload else 0
        docs = {d.DId: d for d in StoreComplianceDocument.objects.filter(StoreId=store_id)}
        rows = []
        for i, scs in enumerate(StoreComplianceStatusMaster.objects.order_by("-Id"), 1):
            d = docs.get(scs.Id)
            path = d.DocumentPath if d else None
            rows.append({
                "SRNO": i,
                "Id": scs.Id,
                "Type": scs.Type,
                "DocumentPath": path,
                "TotalUpload": total_upload,
                "TotalVerify": total_verify,
                "TotPer": tot_per,
                "Dstatus": 1 if (path and path != "0") else 0,
                "Verify": d.Verify if d else None,
                "IsVerify": 1 if (d and d.Verify) else 0,
                "StatusYN": (d.StatusYN or 0) if d else 0,
            })
        return legacy_json_string(rows)
    if action in (5, 51):
        sl_ids = list(StoreLicences.objects.filter(StoreId=store_id).values_list("Id", flat=True))
        lrs = list(LicenceRequest.objects.filter(StoreLicenceId__in=sl_ids))
        store = StoreMaster.objects.filter(Id=store_id).first()
        total = len(lrs)
        uploaded = sum(1 for lr in lrs if lr.UploadLicenseCopy and lr.UploadLicenseCopy.strip())
        tot_licence = round(uploaded * 100.0 / total, 2) if total else 0
        lm_map = {l.LicenseId: l.LicenseName for l in LicenseMaster.objects.all()}
        sl_map = {s.Id: s for s in StoreLicences.objects.filter(Id__in=sl_ids)}
        by_license = {}
        for lr in lrs:
            sl = sl_map.get(lr.StoreLicenceId)
            if not sl:
                continue
            key = lm_map.get(sl.LicenseId)
            by_license.setdefault(key, []).append(lr)
        rows = []
        for name, items in by_license.items():
            lr = max(items, key=lambda x: x.Id or 0)
            rows.append({
                "LicenceRequstId": lr.Id,
                "lstatus": lr.LStatus,
                "StoreCode": store.StoreCode if store else None,
                "LicenseName": name,
                "StoreId": store_id,
                "ModifiedOn": _fmt_date(lr.ModifiedOn, "%d-%b-%Y") if lr.ModifiedOn else "",
                "ISUPLOAD": "-1" if not (lr.UploadLicenseCopy and lr.UploadLicenseCopy.strip()) else lr.UploadLicenseCopy,
                "UploadLicenseCopy": lr.UploadRenewedCopy if lr.LStatus == 3 else lr.UploadLicenseCopy,
                "TotLicence": tot_licence,
                "rn": 1,
                "UploadRenewedCopy": lr.UploadRenewedCopy,
                "LicenseC": lr.UploadLicenseCopy,
            })
        return legacy_json_string(rows)
    return legacy_json_string([])


@csrf_exempt
def get_store_data_by_search(request):
    """POST /api/RetailSection/GetStoreDataBySearch — RTL.Usp_GetStoreDataBySearch."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    party_type = body.get("PartyType") or body.get("Id")
    party_id = body.get("LoginType") or body.get("PartyId")
    store_code = body.get("Attribute1") or body.get("StoreCode") or ""
    qs = StoreMapping.objects.values_list("StoreId", flat=True)
    if party_type == "Client":
        qs = qs.filter(UserId=party_id)
    store_ids = list(qs)
    rows = list(StoreMaster.objects.filter(Id__in=store_ids, StoreCode__startswith=store_code)
                .order_by("-Id").values("Id", "StoreCode").distinct())
    return legacy_json_string(rows)


@csrf_exempt
def get_newsletter(request):
    """POST /api/RetailSection/GetNewsletter — dbo.USP_GetNewsletter."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    nid = body.get("Id")
    if str(nid) == "1":
        return legacy_json_string(list(
            Newsletter.objects.order_by("-CreatedDate").values(
                "Id", "StateCentralActtitle", "DateOfNotification", "SATE_CODE",
                "EffectiveDateOfNotification", "NotificationNumber", "DepartmentId",
                "UploadDocPath", "SubjectLine", "PartyId", "Summary", "CreatedDate",
                "newscategory")))

    map_ids = list(LoginTable.objects.filter(LoginId=nid).values_list("MapId", flat=True))
    news_ids = list(NewsletterClientMapping.objects.filter(PartyId__in=map_ids)
                    .values_list("NewsLetterId", flat=True))
    state_map = {s.SATE_CODE: s.STATE_NM for s in State.objects.all()}
    cm_map = {n.NewsLetterId: n for n in NewsletterClientMapping.objects.filter(NewsLetterId__in=news_ids)}
    rows = []
    for n in Newsletter.objects.filter(Id__in=news_ids).order_by("-CreatedDate"):
        cm = cm_map.get(n.Id)
        rows.append({
            "STATE_NM": state_map.get(n.SATE_CODE),
            "Id": n.Id,
            "StateCentralActtitle": n.StateCentralActtitle,
            "DateOfNotification": n.DateOfNotification,
            "SATE_CODE": n.SATE_CODE,
            "EffectiveDateOfNotification": n.EffectiveDateOfNotification,
            "NotificationNumber": n.NotificationNumber,
            "DepartmentId": n.DepartmentId,
            "UploadDocPath": n.UploadDocPath,
            "SubjectLine": n.SubjectLine,
            "PartyId": n.PartyId,
            "Summary": n.Summary,
            "CreatedDate": n.CreatedDate,
            "newscategory": n.newscategory,
            "NewsLetterId": cm.NewsLetterId if cm else None,
        })
    return legacy_json_string(rows)


@csrf_exempt
def get_license_and_registration_by(request):
    """POST /api/RetailSection/GetLicenseAndRegistrationBy — RTL.Usp_GetLicenseDetailsById."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    party_id = body.get("PartyId")
    store_code = body.get("StoreCode")
    rows = []

    if store_code:
        store = StoreMaster.objects.filter(StoreCode=store_code).first()
        if not store:
            return legacy_json_string([])
        seen = set()
        for ldm in LicenseDetailsMaster.objects.filter(PartyTypeId=4):
            lm = LicenseMaster.objects.filter(LicenseId=ldm.LicenseId).first()
            if not lm:
                continue
            for sl in StoreLicences.objects.filter(LicenseId=lm.LicenseId):
                for lr in LicenceRequest.objects.filter(StoreLicenceId=sl.Id):
                    key = (lm.LicenseId, sl.Id, lr.Id)
                    if key in seen:
                        continue
                    seen.add(key)
                    end = _expiry_status(lr.ValidityEndDate_old, store.DaysOfExpire)
                    rows.append({
                        "StoreCode": store.StoreCode,
                        "LicenseId": lm.LicenseId,
                        "LicenseName": lm.LicenseName,
                        "LicenseNumber": lr.LicenseNumber,
                        "ValidityStartDate": lr.ValidityStartDate_old,
                        "ValidityEndDate": _fmt_date(lr.ValidityEndDate_old, "%Y-%m-%d"),
                        "DaysOfExpire": store.DaysOfExpire,
                        "ExpiryStatus": "expire soon" if end in ("Expired", "Expiring Soon") else "not expire soon",
                    })
        return legacy_json_string(rows)

    if str(party_id) == "1":
        sl_map = {s.Id: s for s in StoreLicences.objects.all()}
        sm_map = {s.Id: s for s in StoreMaster.objects.all()}
        lm_map = {l.LicenseId: l for l in LicenseMaster.objects.all()}
        for lr in LicenceRequest.objects.filter(LStatus__in=(1, 3)).order_by("ValidityEndDate_old"):
            end = lr.ValidityEndDate_old
            end_d = end.date() if isinstance(end, datetime) else end
            sl = sl_map.get(lr.StoreLicenceId)
            if not sl:
                continue
            sm = sm_map.get(sl.StoreId)
            lm = lm_map.get(sl.LicenseId)
            if not sm or not lm:
                continue
            if _expiry_status(end_d, sm.DaysOfExpire) == "Vaild":
                continue
            rows.append({
                "SrNo": len(rows) + 1,
                "Id": lr.Id,
                "StoreId": sm.Id,
                "StoreCode": f"{sm.StoreCode} [{sm.RefStoreCode}]" if sm.RefStoreCode else sm.StoreCode,
                "LicenseNumber": lr.LicenseNumber,
                "LicenseName": lm.LicenseName,
                "LicenseType": "Fresh" if lr.LStatus in (1, 2) else "Renewed",
                "ValidityStartDate": lr.ValidityStartDate_old,
                "ValidityEndDate": _fmt_date(end_d, "%m/%d/%Y"),
                "DaysOfExpire": (end_d - date.today()).days if end_d else 0,
                "ExpiryStatus": _expiry_status(end_d, sm.DaysOfExpire),
            })
        return legacy_json_string(rows)

    map_ids = list(LoginTable.objects.filter(LoginId=party_id).values_list("MapId", flat=True))
    store_ids = list(StoreMapping.objects.filter(PartyId__in=map_ids).values_list("StoreId", flat=True))
    sl_map = {s.Id: s for s in StoreLicences.objects.all()}
    sm_map = {s.Id: s for s in StoreMaster.objects.all()}
    lm_map = {l.LicenseId: l for l in LicenseMaster.objects.all()}
    for lr in LicenceRequest.objects.filter(LStatus__in=(1, 3)).order_by("ValidityEndDate_old"):
        end = lr.ValidityEndDate_old
        end_d = end.date() if isinstance(end, datetime) else end
        sl = sl_map.get(lr.StoreLicenceId)
        if not sl or sl.StoreId not in store_ids:
            continue
        sm = sm_map.get(sl.StoreId)
        lm = lm_map.get(sl.LicenseId)
        if not sm or not lm:
            continue
        if _expiry_status(end_d, sm.DaysOfExpire) == "Vaild":
            continue
        rows.append({
            "SrNo": len(rows) + 1,
            "Id": lr.Id,
            "StoreId": sm.Id,
            "StoreCode": f"{sm.StoreCode} [{sm.RefStoreCode}]" if sm.RefStoreCode else sm.StoreCode,
            "LicenseNumber": lr.LicenseNumber,
            "LicenseName": lm.LicenseName,
            "LicenseType": "Fresh" if lr.LStatus in (1, 2) else "Renewed",
            "ValidityStartDate": lr.ValidityStartDate_old,
            "ValidityEndDate": _fmt_date(end_d, "%m/%d/%Y"),
            "DaysOfExpire": (end_d - date.today()).days if end_d else 0,
            "ExpiryStatus": _expiry_status(end_d, sm.DaysOfExpire),
        })
    return legacy_json_string(rows)


@csrf_exempt
def retail_role_permission(request):
    """POST /api/RetailSection/RetailRolePermisssion — RTL.USP_ROLEMANAGE.

    Actions: 1=page-section permission matrix, 5/7=submenu permissions,
    6=URL access check."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    user_id = _int_or_none(body.get("Id"))
    action = _int_or_none(body.get("Action"))

    if action == 1:
        perms = {p.SectionId: p for p in PagesSectionRolePermission.objects.filter(UserId=user_id)}
        sections = list(PagesSectionMaster.objects.filter(IsDelete=0).order_by("-Id"))
        rows = []
        for i, s in enumerate(sections, 1):
            p = perms.get(s.Id)
            rows.append({
                "SRNO": i,
                "SectionName": s.SectionName,
                "SectionId": s.Id,
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

    if action in (5, 7):
        sub_ids = list(MenuPermission.objects.filter(EmpId=str(user_id)).values_list("SubMenuId", flat=True))
        subs = {s.SubMenuId: s for s in SubMenuMaster.objects.filter(SubMenuId__in=sub_ids)}
        rows = []
        for i, mp in enumerate(MenuPermission.objects.filter(EmpId=str(user_id)).order_by("-SubMenuId"), 1):
            s = subs.get(mp.SubMenuId)
            if not s:
                continue
            if action == 5:
                rows.append({
                    "SRNO": i, "PageName": s.HostedFolder, "SectionId": s.SubMenuId,
                    "SectionName": s.Name, "Url": s.Url,
                })
            else:
                rows.append({
                    "SRNO": i, "SectionName": s.Name, "SectionId": s.SubMenuId,
                    "PageName": s.HostedFolder,
                })
        return legacy_json_string(rows)

    if action == 6:
        url = body.get("DocumentPath")
        rm = 0
        if url in ("/RetailSection/NewLocationDashboard", "/"):
            rm = 1
        else:
            login_type = LoginTable.objects.filter(LoginId=user_id).values_list("LoginType", flat=True).first()
            if url == "/Dashboard/Board" and str(login_type) == "5":
                rm = 1
            elif PagesSectionMaster.objects.filter(
                    IsDelete=0, Url__in=[url, f"..{url}"],
                    Id__in=PagesSectionRolePermission.objects.filter(UserId=user_id).values("SectionId")).exists():
                rm = 1
            elif SubMenuMaster.objects.filter(
                    Url__in=[url, f"..{url}"],
                    SubMenuId__in=MenuPermission.objects.filter(EmpId=str(user_id)).values("SubMenuId")).exists():
                rm = 1
        return legacy_json_string([{"RM": rm}])

    return legacy_json_string([])


@csrf_exempt
def get_store_dashboard(request):
    """POST /api/RetailSection/GetStoreDashboard — RTL.USP_StoreDashboard @Action=1."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    user_id = _int_or_none(body.get("UserId")) or _login_id(request)
    _, store_ids = _login_scope(user_id)
    stores = StoreMaster.objects.all()
    if store_ids is not None:
        stores = stores.filter(Id__in=store_ids)

    today = date.today()
    year = today.year - (1 if today.month < 4 else 0)
    apr1 = date(year, 4, 1)
    days_passed = (today - apr1).days
    total_days = 366 if (year % 4 == 0 and (year % 100 != 0 or year % 400 == 0)) else 365
    remaining = total_days - days_passed

    store_rows = list(stores)
    store_ids2 = {s.Id for s in store_rows}
    deactive = sum(1 for s in store_rows if s.IsActive == "0")
    active = sum(1 for s in store_rows if s.IsActive == "1")
    upcoming = sum(1 for s in store_rows if s.IsActive == "2")
    total = len(store_rows)
    expected_doc = sum(1 for s in store_rows if s.RentAgreement and s.IsActive == "2")
    uta = sum(1 for s in store_rows if s.UTA)
    sl_ids = list(StoreLicences.objects.filter(StoreId__in=store_ids2).values_list("Id", flat=True))
    lrs = list(LicenceRequest.objects.filter(StoreLicenceId__in=sl_ids))
    sl_map = {s.Id: s for s in StoreLicences.objects.filter(Id__in=sl_ids)}
    upcoming_store_ids = {s.Id for s in store_rows if s.IsActive == "2"}
    draft = sum(1 for sl in StoreLicences.objects.filter(StoreId__in=upcoming_store_ids) if not sl.Status)
    sl_by_store = {}
    for sl in sl_map.values():
        sl_by_store.setdefault(sl.StoreId, []).append(sl)
    applied = issued = 0
    submit = 0
    for lr in lrs:
        sl = sl_map.get(lr.StoreLicenceId)
        if sl and sl.StoreId in upcoming_store_ids:
            if lr.ApplicationStatus == "Applied":
                applied += 1
            if lr.LicenseStatus == "Issued":
                issued += 1
    submit = sum(1 for sl in sl_map.values() if sl.Status == 1 and sl.StoreId in upcoming_store_ids) - applied
    applied -= issued
    tl = draft + submit + applied + issued

    rows = [{
        "PerStoredays": round((remaining * 100.0 / upcoming), 2) if upcoming else 0,
        "PerActualStoredays": round((days_passed * 100.0 / uta), 2) if uta else 0,
        "TotalDaysInYear": total_days,
        "DaysPassed": days_passed,
        "RemainingDays": remaining,
        "Storedays": round((remaining / upcoming), 2) if upcoming else 0,
        "ActualStoredays": round((days_passed / uta), 2) if uta else 0,
        "Deactive": deactive,
        "Active": active,
        "Upcoming": upcoming,
        "Total": total,
        "DeactivePercentage": round(deactive * 100.0 / total, 2) if total else 0,
        "ActivePercentage": round(active * 100.0 / total, 2) if total else 0,
        "UpcomingPercentage": round(upcoming * 100.0 / total, 2) if total else 0,
        "TotalPercentage": 100.00 if total else 0,
        "ExectedDocument": expected_doc,
        "UTA": uta,
        "TL": tl,
        "Draft": draft,
        "Submit": submit,
        "Applied": applied,
        "Issued": issued,
    }]
    return legacy_json_string(rows)


@csrf_exempt
def get_retail_main_dashboard(request):
    """POST /api/RetailSection/GetRetailMainDashboard — RTL.USP_Subcidiary @Action=8/9."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    action = _int_or_none(body.get("Action")) or 8
    user_id = _int_or_none(body.get("UserId")) or _login_id(request)

    if action == 8:
        subs = list(Subsidiary.objects.filter(GroupUserid=user_id))
        total_org = len({s.GroupId for s in subs}) + 1 if subs else 1
        party_map = {p.PartyId: p for p in PartyMaster.objects.all()}
        active_org = len({s.GroupId for s in subs if party_map.get(s.SubcidiaryId) and party_map[s.SubcidiaryId].IsActive}) + 1 if subs else 1
        login_map = {l.LoginId: l for l in LoginTable.objects.all()}
        active_users = len({s.GroupId for s in subs if login_map.get(s.SubcidiaryUserId) and login_map[s.SubcidiaryUserId].IsActive}) + 1 if subs else 1
        sub_ids = {s.SubcidiaryUserId for s in subs} | {user_id}
        total_loc = StoreMapping.objects.filter(UserId__in=sub_ids).values("StoreId").distinct().count()
        rows = [{
            "TotalOrganization": total_org,
            "TotalActiveOrganization": active_org,
            "TotalLocation": total_loc,
            "TotalUser": active_users,
        }]
        return legacy_json_string(rows)

    # Action 9 — group + subsidiary user list
    party_map = {p.PartyId: p for p in PartyMaster.objects.all()}
    login_map = {l.LoginId: l for l in LoginTable.objects.all()}
    sm_map = {}
    for sm in StoreMapping.objects.all():
        sm_map.setdefault(sm.UserId, set()).add(sm.StoreId)
    rows = []
    me = login_map.get(user_id)
    if me:
        rows.append({
            "Name": party_map.get(me.MapId).PartyName if party_map.get(me.MapId) else None,
            "SubsidiaryUser": me.UserName,
            "UserType": "Group",
            "LocationCount": len(sm_map.get(user_id, set())),
            "LastLogin": me.LastLogin,
            "USERNAME": me.UserName,
            "PASSWORD": me.Password,
            "Status": "Active" if me.IsActive else "DeActive",
            "LoginId": me.LoginId,
        })
    for s in Subsidiary.objects.filter(GroupUserid=user_id).order_by("SubcidiaryUserId"):
        l1 = login_map.get(s.SubcidiaryUserId)
        if not l1:
            continue
        rows.append({
            "Name": party_map.get(l1.MapId).PartyName if party_map.get(l1.MapId) else None,
            "SubsidiaryUser": l1.UserName,
            "UserType": "Subsidiary",
            "LocationCount": len(sm_map.get(s.SubcidiaryUserId, set())),
            "LastLogin": l1.LastLogin,
            "USERNAME": l1.UserName,
            "PASSWORD": l1.Password,
            "Status": "Active" if l1.IsActive else "DeActive",
            "LoginId": l1.LoginId,
        })
    return legacy_json_string(rows)


def _ls_base_rows(store_ids):
    """Shared licence dashboard join set → list of dicts with SP column names."""
    sl_map = {s.Id: s for s in StoreLicences.objects.all()}
    sm_map = {s.Id: s for s in StoreMaster.objects.all()}
    lm_map = {l.LicenseId: l for l in LicenseMaster.objects.all()}
    rm_map = {r.Id: r.Name for r in RegionMaster.objects.all()}
    city_map = {c.CITY_CODE: c for c in City.objects.all()}
    sm_map2 = {}
    for sm in StoreMapping.objects.all():
        sm_map2.setdefault(sm.StoreId, set()).add(sm)
    party_map = {p.PartyId: p for p in PartyMaster.objects.all()}
    rows = []
    for lr in LicenceRequest.objects.all():
        sl = sl_map.get(lr.StoreLicenceId)
        if not sl:
            continue
        if store_ids is not None and sl.StoreId not in store_ids:
            continue
        sm = sm_map.get(sl.StoreId)
        lm = lm_map.get(sl.LicenseId)
        if not sm or not lm:
            continue
        smms = list(sm_map2.get(sl.StoreId, set()))
        city = city_map.get(sm.CityId) if sm.CityId else None
        rows.append({
            "SL": sl, "LR": lr, "SM": sm, "LM": lm,
            "RegionName": rm_map.get(sm.RegionId),
            "City": city.CITY_NAME if city else None,
            "StateId": city.STATE_ID if city else None,
            "StoreMapping": smms,
            "PartyName": (party_map.get(smms[0].PartyId).PartyName if smms and party_map.get(smms[0].PartyId) else None),
        })
    return rows


def _apply_ls_filters(rows, body):
    region = body.get("RegionId")
    doc_status = body.get("DocumentStatus")
    lic_status = body.get("LicenceStatus")
    expiry_status = body.get("ExpiryStatus")
    lic_type = body.get("LicenceType")
    client = body.get("Client")
    payment = body.get("PaymentStatus")
    invoice = body.get("InvoiceStatus")
    store_id = body.get("StoreId")
    lic_id = body.get("LicenceId")
    state = body.get("State")
    address = body.get("Address")
    out = []
    for r in rows:
        sl, lr, sm, lm = r["SL"], r["LR"], r["SM"], r["LM"]
        if region not in (None, "-1") and str(sm.RegionId) != str(region):
            continue
        if doc_status not in (None, "-1"):
            st = sl.Status if sl.Status is not None else 3
            if str(st) != str(doc_status):
                continue
        if lic_status not in (None, "-1"):
            if lic_status == "Applied" and lr.ApplicationStatus != "Applied":
                continue
            if lic_status == "Not Applied" and (lr.ApplicationStatus or "Not Applied") != "Not Applied":
                continue
            if lic_status == "Issued" and lr.LicenseStatus != "Issued":
                continue
        if expiry_status not in (None, "-1"):
            es = _expiry_status(lr.ValidityEndDate_old, sm.DaysOfExpire)
            if es != expiry_status:
                continue
        if lic_type not in (None, "-1") and str(lr.LStatus) != str(lic_type):
            continue
        if client not in (None, "-1"):
            if not any(str(m.PartyId) == str(client) for m in r["StoreMapping"]):
                continue
        if payment not in (None, "-1"):
            if (lr.PaymentStatus or "UnPaid") != payment:
                continue
        if invoice not in (None, "-1") and lr.InvoiceStatus != invoice:
            continue
        if store_id not in (None, "-1") and str(sl.StoreId) != str(store_id):
            continue
        if lic_id not in (None, "-1") and lic_id and str(lm.LicenseId) not in str(lic_id).split(","):
            continue
        if state not in (None, "-1") and str(r["StateId"]) != str(state):
            continue
        if address not in (None, "-1") and address and (sm.CompleteAddress or "").find(address) < 0:
            continue
        out.append(r)
    return out


@csrf_exempt
def get_ls_dashboard(request):
    """POST /api/RetailSection/GetLSDashboard — RTL.USP_LSDashboard."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    action = _int_or_none(body.get("Action")) or 1
    party_id = body.get("PartyId") or body.get("UserId") or _login_id(request)
    _, store_ids = _login_scope(party_id)
    base = _ls_base_rows(store_ids)

    if action == 1:
        counts = {}
        for r in _apply_ls_filters(base, body):
            counts[r["LM"].LicenseName] = counts.get(r["LM"].LicenseName, 0) + 1
        return legacy_json_string([{"LicenseName": k, "Number": v} for k, v in counts.items()])

    rows = _ls_filter_lists(base, body, action)
    if rows is not None:
        return legacy_json_string(rows)

    if action == 13:
        out = []
        for r in _apply_ls_filters(base, body):
            lr, sm, lm, sl = r["LR"], r["SM"], r["LM"], r["SL"]
            st = sl.Status if sl.Status is not None else 3
            doc_status = "Pending" if st == 3 else ("Draft" if st == 0 else ("Saved" if st == 1 else st))
            lic_type = "Fresh" if lr.LStatus == 1 else ("Old" if lr.LStatus == 2 else "Renewed")
            out.append({
                "RegionName": r["RegionName"],
                "DocumentStatus": doc_status,
                "LApplicationStatus": lr.ApplicationStatus,
                "LicenseStatus": lr.LicenseStatus,
                "FreshReneval": lic_type,
                "StoreName": sm.StoreName,
                "InvoiceStatus": lr.InvoiceStatus,
                "PaymentStatus": "Paid" if lr.PaymentStatus == "SUCCESS" else "UnPaid",
                "PARTYNAME": r["PartyName"],
                "LicenseName": lm.LicenseName,
                "Address": sm.CompleteAddress,
            })
        return legacy_json_string(out)

    return legacy_json_string([])


def _ls_filter_lists(base, body, action):
    """Shared drop-down lists for LSDashboard / LDashboard (actions 2-12)."""
    if action == 2:
        seen = set()
        rows = []
        for r in base:
            key = r["SM"].RegionId
            if key in seen:
                continue
            seen.add(key)
            rows.append({"RegionId": key, "Name": r["RegionName"] if r["RegionName"] else "Blank"})
        return rows

    if action == 4:
        seen = set()
        rows = []
        for r in base:
            st = r["SL"].Status if r["SL"].Status is not None else 3
            label = "Pending" if st == 3 else ("Draft" if st == 0 else ("Saved" if st == 1 else st))
            key = st
            if key in seen:
                continue
            seen.add(key)
            rows.append({"Status": st, "DocumentStatusList": label})
        return rows

    if action == 5:
        seen = set()
        rows = []
        for r in base:
            if not r["LR"].PaymentStatus:
                continue
            ps = "Paid" if r["LR"].PaymentStatus == "SUCCESS" else "UnPaid"
            key = ps
            if key in seen:
                continue
            seen.add(key)
            rows.append({"PaymentStatus": ps, "Payment": r["LR"].PaymentStatus})
        return rows

    if action == 6:
        seen = set()
        rows = []
        for r in base:
            lt = "Fresh" if r["LR"].LStatus == 1 else ("Old" if r["LR"].LStatus == 2 else "Renewed")
            key = r["LR"].LStatus
            if key in seen:
                continue
            seen.add(key)
            rows.append({"LicenseType": lt, "LStatus": r["LR"].LStatus})
        return rows

    if action == 7:
        seen = set()
        rows = []
        for r in base:
            for m in r["StoreMapping"]:
                pm = PartyMaster.objects.filter(PartyId=m.PartyId).first()
                if not pm:
                    continue
                key = m.PartyId
                if key in seen:
                    continue
                seen.add(key)
                rows.append({"MapId": m.PartyId, "PartyName": pm.PartyName})
        return rows

    if action == 8:
        seen = set()
        rows = []
        for r in base:
            iv = r["LR"].InvoiceStatus
            if iv in (None, "", "-1"):
                continue
            val = "Pending" if not iv else iv
            if val in seen:
                continue
            seen.add(val)
            rows.append({"invoiceStatus": val})
        return rows

    if action in (9, 12):
        seen = set()
        rows = []
        for r in base:
            if action == 9:
                key = r["SL"].StoreId
                if key in seen:
                    continue
                seen.add(key)
                rows.append({"Id": r["SL"].StoreId, "StoreName": r["SM"].StoreName,
                             "CompleteAddress": r["SM"].CompleteAddress})
            else:
                key = r["SM"].CompleteAddress
                if key in seen:
                    continue
                seen.add(key)
                rows.append({"CompleteAddress": r["SM"].CompleteAddress})
        return rows

    if action == 10:
        seen = set()
        rows = []
        for r in base:
            if r["City"] is None:
                continue
            key = r["City"].STATE_NAME
            if key in seen:
                continue
            seen.add(key)
            rows.append({"STATE_NAME": r["City"].STATE_NAME, "STATE_ID": r["City"].STATE_ID})
        return rows

    if action == 11:
        seen = set()
        rows = []
        for r in base:
            key = r["LM"].LicenseId
            if key in seen:
                continue
            seen.add(key)
            rows.append({"LicenseName": r["LM"].LicenseName, "LicenseId": r["LM"].LicenseId})
        return rows

    return None


@csrf_exempt
def get_l_dashboard(request):
    """POST /api/RetailSection/GetLDashboard — RTL.USP_LicenseCommonCompliance."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    action = _int_or_none(body.get("Action")) or 1
    party_id = body.get("PartyId") or body.get("UserId") or _login_id(request)
    _, store_ids = _login_scope(party_id)
    base = _ls_base_rows(store_ids)

    if action in (1, 121):
        agg = {}
        for r in _apply_ls_filters(base, body):
            lm = r["LM"]
            if lm.LicenseId not in agg:
                agg[lm.LicenseId] = {"LicenseName": lm.LicenseName, "count": 0,
                                     "stores": set(), "regions": set(), "cities": set(),
                                     "states": set(), "codes": set()}
            a = agg[lm.LicenseId]
            a["count"] += 1
            a["stores"].add(r["SM"].StoreName)
            a["regions"].add(r["RegionName"])
            if r["City"]:
                a["cities"].add(r["City"].CITY_NAME)
                if r["City"].STATE_NAME:
                    a["states"].add(r["City"].STATE_NAME)
            code = f"{r['SM'].StoreCode} [ {r['SM'].RefStoreCode} ] " if r['SM'].RefStoreCode else r['SM'].StoreCode
            a["codes"].add(code)
        rows = [{
            "LicenseName": a["LicenseName"],
            "Number": a["count"],
            "storeName": ", ".join(x for x in a["stores"] if x),
            "RegionName": ", ".join(x for x in a["regions"] if x),
            "City": ", ".join(x for x in a["cities"] if x),
            "State": ", ".join(x for x in a["states"] if x),
            "StoreCode": ", ".join(x for x in a["codes"] if x),
        } for a in agg.values()]
        return legacy_json_string(rows)

    rows = _ls_filter_lists(base, body, action)
    if rows is not None:
        return legacy_json_string(rows)

    return legacy_json_string([])
