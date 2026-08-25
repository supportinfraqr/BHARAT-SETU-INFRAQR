"""Ported DashboardController.cs data actions (legacy-compatible).

Each action mirrors the stored procedure the ASP.NET controller called, but is
implemented with the Django ORM against the migrated PostgreSQL tables
(bss_legacy_*). Response contract matches api/views.py:
  - list actions  -> legacy_json_string([{col: value}, ...])
  - IUD actions   -> legacy_status_result(scalar)
"""
import random
import string

import bcrypt
from django.db.models import Max
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt

from legacy.models import (
    BranchMaster,
    BranchMenuPermission,
    ContractorGatePass,
    DocumentMaster,
    EmployeeMaster,
    IUDVendorClientDocument,
    LoginTable,
    ManageReportHeader,
    MenuPermission,
    ModuleMaster,
    PagesSectionMaster,
    PagesSectionRolePermission,
    PartyMaster,
    ReportHeader,
    RoleMaster,
    SiteManager,
)

from .views import (
    _int_or_none,
    _login_id,
    _request_params,
    _to_bool,
    legacy_json_string,
    legacy_status_result,
    session_expired,
)


def _bcrypt_hash(password):
    if not password:
        return None
    return bcrypt.hashpw(str(password).encode(), bcrypt.gensalt(rounds=12)).decode()


def _active_label(value):
    return "Active User" if value else "Inactive User"


def _next_sequence(model, pk_field, prefix="0001", width=7):
    """Legacy menu/report ids look like '<branch4><seq7>' e.g. 00010000001."""
    max_pk = model.objects.aggregate(m=Max(pk_field))["m"]
    seq = 1
    if max_pk:
        digits = "".join(ch for ch in str(max_pk) if ch.isdigit())
        try:
            seq = int(digits[-width:]) + 1 if digits else 1
        except ValueError:
            seq = 1
    return f"{prefix}{seq:0{width}d}"


# ---------------------------------------------------------------------------
# Company / Branch master + LoginTable users (USP_LoginTable)
# ---------------------------------------------------------------------------


@csrf_exempt
def get_company_and_branch_master(request):
    """POST /api/Dashboard/GetCompanyAndBranchMaster — USP_LoginTable.

    Returns the login users (optionally scoped to a BranchCode) with their
    company/branch name resolved from BranchMaster. Frontend uses Action=6 to
    fill the nav-menu-permission user dropdown.
    """
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    branch = body.get("BranchCode")
    branch_map = {b.BranchCode: b for b in BranchMaster.objects.all()}

    qs = LoginTable.objects.all()
    if branch:
        qs = qs.filter(BranchCode=branch)
    rows = []
    for r in qs.order_by("LoginId"):
        bm = branch_map.get(r.BranchCode)
        rows.append({
            "LoginId": r.LoginId,
            "EmployeeCode": str(r.LoginId),
            "UserName": r.UserName,
            "Name": r.Name or r.UserName,
            "LoginType": r.LoginType,
            "MapId": r.MapId,
            "BranchCode": r.BranchCode,
            "BranchName": bm.BranchName if bm else None,
            "CompanyName": bm.BranchName if bm else None,
            "IsActive": "Active" if r.IsActive else "InActive",
        })
    return legacy_json_string(rows)


@csrf_exempt
def insert_update_delete_company_branch_user_permission(request):
    """POST /api/Dashboard/InsertUpdateDeleteCompanyBranchUserPermission —
    USP_LoginTable. Assigns/updates/removes the BranchCode on login users.

    Action 1/2 = assign BranchCode from PermitedData to user(s) in TransID,
    Action 3 = clear the branch permission.
    """
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    action = _int_or_none(body.get("Action"))
    trans_id = body.get("TransID") or body.get("LoginId")
    branch = body.get("BranchCode")
    permitted = body.get("PermitedData") or body.get("Documents")

    if action in (1, 2) and permitted:
        ids = [i.strip() for i in str(permitted).split(",") if i.strip()]
        target = [t.strip() for t in str(trans_id).split(",") if t.strip()]
        if target:
            qs = LoginTable.objects.filter(LoginId__in=target)
        else:
            qs = LoginTable.objects.all()
            if branch:
                qs = qs.filter(BranchCode=branch)
        qs.update(BranchCode=permitted if not ids else ids[0])
        return legacy_status_result("1")

    if action == 3:
        LoginTable.objects.filter(LoginId=trans_id).update(BranchCode=None)
        return legacy_status_result("1")

    return legacy_status_result("1")


# ---------------------------------------------------------------------------
# Login authentication members (USP_LoginAuthentication)
# ---------------------------------------------------------------------------


def _member_rows(qs):
    branch_map = {b.BranchCode: b for b in BranchMaster.objects.all()}
    rows = []
    for r in qs:
        bm = branch_map.get(r.BranchCode)
        rows.append({
            "Id": r.LoginId,
            "LoginId": r.LoginId,
            "UserName": r.UserName,
            "Name": r.Name,
            "Password": r.Password,
            "LoginType": r.LoginType,
            "MapId": r.MapId,
            "Designation": r.Designation,
            "ContactNo": r.ContactNo,
            "EmailId": r.EmailId,
            "BranchCode": r.BranchCode,
            "BranchName": bm.BranchName if bm else None,
            "IsActive": _active_label(r.IsActive),
            "CreatedOn": r.CreatedOn,
        })
    return rows


@csrf_exempt
def get_login_member_details(request):
    """POST /api/Dashboard/GetLoginMemberDetails — USP_LoginAuthentication @Action=4."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    qs = LoginTable.objects.all()
    branch = body.get("BranchCode")
    if branch:
        qs = qs.filter(BranchCode=branch)
    active = body.get("IsActive")
    if active not in (None, ""):
        qs = qs.filter(IsActive=_to_bool(active))
    return legacy_json_string(_member_rows(qs))


@csrf_exempt
def get_details(request):
    """POST /api/Dashboard/GetDetails — USP_LoginAuthentication (generic list)."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    qs = LoginTable.objects.all()
    branch = body.get("BranchCode")
    if branch:
        qs = qs.filter(BranchCode=branch)
    login_id = body.get("LoginId")
    if login_id:
        qs = qs.filter(LoginId=login_id)
    return legacy_json_string(_member_rows(qs))


@csrf_exempt
def update_all_members(request):
    """POST /api/Dashboard/UpdateAllMembers — USP_LoginAuthentication @Action=2.

    Activates/deactivates every member of the branch in one shot. A BranchCode
    (and an IsActive flag) is required — with no branch the call is a no-op so
    an empty payload can never blanket-update the whole login table.
    """
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    branch = body.get("BranchCode")
    is_active = body.get("IsActive")
    if not branch or is_active in (None, ""):
        return legacy_status_result("1")
    LoginTable.objects.filter(BranchCode=branch).update(
        IsActive=_to_bool(is_active, default=True))
    return legacy_status_result("1")


@csrf_exempt
def seprate_update_members(request):
    """POST /api/Dashboard/SeprateUpdateMembers — USP_LoginAuthentication @Action=3.

    Activates/deactivates a single member.
    """
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    login_id = body.get("LoginId")
    if login_id is not None:
        LoginTable.objects.filter(LoginId=login_id).update(
            IsActive=_to_bool(body.get("IsActive"), default=True)
        )
    return legacy_status_result("1")


# ---------------------------------------------------------------------------
# Menu permission (USP_SetMenuPermission)
# ---------------------------------------------------------------------------


@csrf_exempt
def insert_menu_permission(request):
    """POST /api/Dashboard/InsertMenuPermission — USP_SetMenuPermission.

    Action 1 = replace a user's menu permissions for a module with the posted
    MenuList; Action 3 = delete them all.
    """
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    action = _int_or_none(body.get("Action"))
    module_id = body.get("ModuleId")
    login_id = body.get("EmployeeCode") or body.get("LoginId")
    branch = body.get("BranchCode")
    created_by = _int_or_none(body.get("CreatedBy")) or _login_id(request)

    if action == 1:
        items = body.get("MenuList") or []
        if not items:
            return legacy_status_result("0")
        MenuPermission.objects.filter(
            EmpId=str(login_id), ModuleId=module_id).delete()
        perm_id = _next_sequence(MenuPermission, "MenuPermissionId",
                                 prefix=(branch or "0001")[:4])
        now = timezone.now()
        for item in items:
            MenuPermission.objects.create(
                MenuPermissionId=perm_id,
                ModuleId=_int_or_none(module_id),
                MenuId=_int_or_none(item.get("MenuId")),
                SubMenuId=_int_or_none(item.get("SubMenuId")),
                EmpId=str(login_id),
                IsAdd=_to_bool(item.get("Add"), default=True),
                IsEdit=_to_bool(item.get("Edit")),
                IsDelete=_to_bool(item.get("Delete")),
                IsPrint=_to_bool(item.get("Print")),
                IsActive=True,
                BranchCode=branch,
                CreatedOn=now,
                CreatedBy=created_by,
                IsDeleted=False,
            )
        return legacy_status_result("1")

    if action == 3:
        MenuPermission.objects.filter(
            EmpId=str(login_id), ModuleId=module_id).delete()
        return legacy_status_result("1")

    return legacy_status_result("1")


@csrf_exempt
def search_menu_permission(request):
    """POST /api/Dashboard/SearchMenuPermission — USP_SetMenuPermission @Action=4."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    branch = body.get("BranchCode")
    qs = MenuPermission.objects.all()
    if branch:
        qs = qs.filter(BranchCode=branch)
    module_map = {m.ModuleId: m.Name for m in ModuleMaster.objects.all()}
    user_map = {l.LoginId: l for l in LoginTable.objects.all()}
    rows = []
    for i, r in enumerate(qs.order_by("MenuPermissionId"), 1):
        user = user_map.get(_int_or_none(r.EmpId))
        rows.append({
            "Id": i,
            "MenuPermissionId": r.MenuPermissionId,
            "ModuleId": r.ModuleId,
            "ModuleName": module_map.get(r.ModuleId),
            "MenuId": r.MenuId,
            "SubMenuId": r.SubMenuId,
            "EmpId": r.EmpId,
            "Name": user.Name if user else r.EmpId,
            "UserName": user.UserName if user else None,
            "BranchCode": r.BranchCode,
            "IsActive": "Active" if r.IsActive else "InActive",
            "IsAdd": bool(r.IsAdd),
            "IsEdit": bool(r.IsEdit),
            "IsDelete": bool(r.IsDelete),
            "IsPrint": bool(r.IsPrint),
        })
    return legacy_json_string(rows)


# ---------------------------------------------------------------------------
# Branch menu permission (USP_SetBranchMenuPermission)
# ---------------------------------------------------------------------------


@csrf_exempt
def insert_branch_menu_permission(request):
    """POST /api/Dashboard/InsertBranchMenuPermission — USP_SetBranchMenuPermission.

    Action 1 = replace the branch's menu set for a module; Action 3 = delete.
    """
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    action = _int_or_none(body.get("Action"))
    module_id = body.get("ModuleId")
    branch = body.get("BranchCode")
    created_by = _int_or_none(body.get("CreatedBy")) or _login_id(request)

    if action == 1:
        items = body.get("MenuList") or []
        if not items:
            return legacy_status_result("0")
        BranchMenuPermission.objects.filter(
            BranchModuleId=module_id, BranchCode=branch).delete()
        perm_id = _next_sequence(BranchMenuPermission, "BranchMenuPermissionId",
                                 prefix=(branch or "Tale")[:4])
        now = timezone.now()
        for item in items:
            BranchMenuPermission.objects.create(
                BranchMenuPermissionId=perm_id,
                BranchModuleId=_int_or_none(module_id),
                BranchMenuId=_int_or_none(item.get("MenuId")),
                BranchSubMenuId=_int_or_none(item.get("SubMenuId")),
                IsActive=True,
                BranchCode=branch,
                CreatedOn=now,
                CreatedBy=created_by,
                IsInsertUpdate=True,
                IsDeleted=False,
            )
        return legacy_status_result("1")

    if action == 3:
        BranchMenuPermission.objects.filter(
            BranchModuleId=module_id, BranchCode=branch).delete()
        return legacy_status_result("1")

    return legacy_status_result("1")


@csrf_exempt
def search_branch_menu_permission(request):
    """POST /api/Dashboard/SearchBranchMenuPermission — USP_SetBranchMenuPermission @Action=4."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    branch = body.get("BranchCode")
    qs = BranchMenuPermission.objects.all()
    if branch:
        qs = qs.filter(BranchCode=branch)
    module_map = {m.ModuleId: m.Name for m in ModuleMaster.objects.all()}
    branch_map = {b.BranchCode: b for b in BranchMaster.objects.all()}
    rows = []
    for i, r in enumerate(qs.order_by("BranchMenuPermissionId"), 1):
        bm = branch_map.get(r.BranchCode)
        rows.append({
            "Id": i,
            "BranchMenuPermissionId": r.BranchMenuPermissionId,
            "ModuleId": r.BranchModuleId,
            "ModuleName": module_map.get(r.BranchModuleId),
            "MenuId": r.BranchMenuId,
            "SubMenuId": r.BranchSubMenuId,
            "BranchCode": r.BranchCode,
            "Name": bm.BranchName if bm else r.BranchCode,
            "IsActive": "Active" if r.IsActive else "InActive",
        })
    return legacy_json_string(rows)


# ---------------------------------------------------------------------------
# Page-section role permission (USP_SetSectionPermissionForRole / USP_GetPagesSectionList)
# ---------------------------------------------------------------------------


@csrf_exempt
def pages_section_master_list(request):
    """POST /api/Dashboard/PagesSectionMasterList — USP_GetPagesSectionList.

    Page sections with the flag values already granted to the posted
    UserId/RoleId/PartyId (so the frontend can pre-check its matrix).
    """
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    user_id = _int_or_none(body.get("UserId"))
    role_id = _int_or_none(body.get("RoleId"))
    party_id = body.get("PartyId")

    perms = PagesSectionRolePermission.objects.all()
    if user_id:
        perms = perms.filter(UserId=user_id)
    perm_map = {}
    for p in perms:
        perm_map.setdefault(p.SectionId, []).append(p)

    rows = []
    for s in PagesSectionMaster.objects.filter(IsDelete=0).order_by("Ordering", "Id"):
        p = None
        for cand in perm_map.get(s.Id, []):
            if role_id and cand.RoleId == role_id:
                p = cand
                break
        if p is None and perm_map.get(s.Id):
            p = perm_map[s.Id][0]
        rows.append({
            "Id": s.Id,
            "SectionId": s.Id,
            "PageName": s.PageName,
            "SectionName": s.SectionName,
            "Url": s.Url,
            "Type": s.Type,
            "Ismenu": s.Ismenu,
            "Ordering": s.Ordering,
            "PartyType": body.get("PartyType"),
            "PartyId": party_id,
            "RoleId": role_id,
            "View": bool(p.ViewFlag) if p else False,
            "Edit": bool(p.EditFlag) if p else False,
            "Delete": bool(p.DeleteFlag) if p else False,
            "Upload": bool(p.UploadFlag) if p else False,
            "Download": bool(p.DownloadFlag) if p else False,
            "NewStore": bool(p.NewStoreFlag) if p else False,
            "NewEmployee": bool(p.NewEmployeeFlag) if p else False,
            "Checkbox1": bool(p.Checkbox1Flag) if p else False,
            "Checkbox2": bool(p.Checkbox2Flag) if p else False,
            "Verify": bool(p.VerifyFlag) if p else False,
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
    return legacy_json_string(rows)


@csrf_exempt
def insert_section_permission_for_role(request):
    """POST /api/Dashboard/InsertSectionPermissionForRole — USP_SetSectionPermissionForRole.

    Action 1 = replace a user's page-section permissions with the posted
    SectionList; Action 3 = delete them.
    """
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    action = _int_or_none(body.get("Action"))
    user_id = _int_or_none(body.get("UserId"))
    party_id = body.get("LoginId") or body.get("PartyId")
    role_id = body.get("BranchCode") or body.get("RoleId")
    party_type = body.get("PartyType") or body.get("ModuleType")
    created_by = _int_or_none(body.get("CreatedBy")) or _login_id(request)

    if action == 1:
        items = body.get("SectionList") or []
        if not items:
            return legacy_status_result("0")
        qs = PagesSectionRolePermission.objects.all()
        if user_id:
            qs = qs.filter(UserId=user_id)
        elif party_id:
            qs = qs.filter(PartyId=party_id)
        qs.delete()
        now = timezone.now()
        for item in items:
            PagesSectionRolePermission.objects.create(
                PartyType=str(party_type) if party_type else None,
                PartyId=_int_or_none(party_id),
                UserId=user_id,
                RoleId=_int_or_none(role_id),
                SectionId=_int_or_none(item.get("SectionId")),
                ViewFlag=_to_bool(item.get("View")),
                EditFlag=_to_bool(item.get("Edit")),
                DeleteFlag=_to_bool(item.get("Delete")),
                UploadFlag=_to_bool(item.get("Upload")),
                DownloadFlag=_to_bool(item.get("Download")),
                NewStoreFlag=_to_bool(item.get("NewStore")),
                NewEmployeeFlag=_to_bool(item.get("NewEmployee")),
                Checkbox1Flag=_to_bool(item.get("Checkbox1")),
                Checkbox2Flag=_to_bool(item.get("Checkbox2")),
                VerifyFlag=_to_bool(item.get("Verify")),
                IsActive=True,
                IsDeleted=False,
                CreatedOn=now,
                Createdby=created_by,
            )
        return legacy_status_result("1")

    if action == 3:
        qs = PagesSectionRolePermission.objects.all()
        if user_id:
            qs = qs.filter(UserId=user_id)
        elif party_id:
            qs = qs.filter(PartyId=party_id)
        qs.delete()
        return legacy_status_result("1")

    return legacy_status_result("1")


@csrf_exempt
def search_section_and_role_menu_permission(request):
    """POST /api/Dashboard/SearchSectionandRoleMenuPermission —
    USP_SetSectionPermissionForRole @Action=4 (joined listing)."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    branch = body.get("BranchCode")
    login_id = body.get("LoginId")
    qs = PagesSectionRolePermission.objects.all()
    if branch:
        qs = qs.filter(RoleId=branch)
    if login_id:
        qs = qs.filter(PartyId=login_id)

    section_map = {s.Id: s for s in PagesSectionMaster.objects.all()}
    party_map = {p.PartyId: p for p in PartyMaster.objects.all()}
    user_map = {l.LoginId: l for l in LoginTable.objects.all()}
    role_map = {r.Id: r.Name for r in RoleMaster.objects.all()}

    rows = []
    for i, p in enumerate(qs.order_by("SectionId"), 1):
        s = section_map.get(p.SectionId)
        party = party_map.get(p.PartyId)
        user = user_map.get(p.UserId)
        rows.append({
            "Id": i,
            "PageName": s.PageName if s else None,
            "SectionName": s.SectionName if s else None,
            "SectionId": p.SectionId,
            "PartyName": party.PartyName if party else None,
            "User": user.Name if user else p.UserId,
            "UserId": p.UserId,
            "RoleName": role_map.get(p.RoleId),
            "RoleId": p.RoleId,
            "PartyType": p.PartyType,
            "PartyId": p.PartyId,
            "ViewFlag": bool(p.ViewFlag),
            "EditFlag": bool(p.EditFlag),
            "DeleteFlag": bool(p.DeleteFlag),
            "UploadFlag": bool(p.UploadFlag),
            "DownloadFlag": bool(p.DownloadFlag),
            "NewStoreFlag": bool(p.NewStoreFlag),
            "NewEmployeeFlag": bool(p.NewEmployeeFlag),
            "Checkbox1Flag": bool(p.Checkbox1Flag),
            "Checkbox2Flag": bool(p.Checkbox2Flag),
            "VerifyFlag": bool(p.VerifyFlag),
            "IsActive": "Active" if p.IsActive else "InActive",
        })
    return legacy_json_string(rows)


# ---------------------------------------------------------------------------
# User registration (USP_LoginTable)
# ---------------------------------------------------------------------------


def _user_registration_rows(qs):
    party_map = {p.PartyId: p for p in PartyMaster.objects.all()}
    rows = []
    for r in qs:
        party = party_map.get(r.MapId)
        rows.append({
            "Id": r.LoginId,
            "LoginId": r.LoginId,
            "PartyType": party.PartyType if party else None,
            "PartyName": party.PartyName if party else None,
            "PartyIds": party.PartyId if party else None,
            "Name": r.Name,
            "UserName": r.UserName,
            "Password": r.Password,
            "LoginType": r.LoginType,
            "MapId": r.MapId,
            "ContactNo": r.ContactNo,
            "EmailId": r.EmailId,
            "BranchCode": r.BranchCode,
            "LoginCreatedOn": r.CreatedOn,
            "CreatedOn": r.CreatedOn,
            "IsActive": "Active User" if r.IsActive else "Inactive User",
        })
    return rows


@csrf_exempt
def get_user_registration(request):
    """POST /api/Dashboard/GetUserRegistration — USP_LoginTable.

    Action 4 = registration grid (joins LoginTable + PartyMaster); other
    actions return the same joined rows (optionally scoped to a LoginId).
    """
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    login_id = body.get("LoginId")
    qs = LoginTable.objects.all()
    if login_id:
        qs = qs.filter(LoginId=login_id)
    else:
        branch = body.get("BranchCode")
        if branch:
            qs = qs.filter(BranchCode=branch)
    return legacy_json_string(_user_registration_rows(qs))


@csrf_exempt
def get_emp_registration(request):
    """POST /api/Dashboard/GetempRegistration — USP_LoginTable.

    Action 31 = vendor document-mapping grid; other actions return the
    registration rows (optionally scoped by LoginId/Id).
    """
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    action = _int_or_none(body.get("Action"))
    login_id = body.get("LoginId")

    if action == 31:
        vendor_id = body.get("Id")
        mapped = set(
            IUDVendorClientDocument.objects.filter(VendorId=vendor_id)
            .values_list("DocumentId", flat=True))
        rows = []
        for d in DocumentMaster.objects.order_by("Id"):
            rows.append({
                "Id": d.Id,
                "DocumentId": d.DocumentId if hasattr(d, "DocumentId") else d.Id,
                "DocumentName": d.DocumentName,
                "IsCheck": d.Id in mapped,
            })
        return legacy_json_string(rows)

    qs = LoginTable.objects.all()
    if login_id:
        qs = qs.filter(LoginId=login_id)
    return legacy_json_string(_user_registration_rows(qs))


@csrf_exempt
def iud_user_registration(request):
    """POST /api/Dashboard/IUDUserRegistration — USP_LoginTable.

    Action 7 = insert a login (bcrypt password), Action 2 = update,
    Action 3 = deactivate. Passwords always stored bcrypt-hashed.
    """
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    action = _int_or_none(body.get("Action"))
    login_id = _int_or_none(body.get("LoginId"))
    login_type = body.get("LoginType")
    branch = body.get("BranchCode") or "001"
    is_active = _to_bool(body.get("IsActive"), default=True)
    now = timezone.now()

    if action == 7:
        username = body.get("UserName")
        if username:
            new_id = (LoginTable.objects.aggregate(m=Max("LoginId"))["m"] or 0) + 1
            LoginTable.objects.create(
                LoginId=new_id,
                UserName=username,
                Password=_bcrypt_hash(body.get("Password")),
                Name=body.get("Name"),
                FatherName=body.get("FatherName"),
                Gender=body.get("Gender"),
                Designation=body.get("Designation"),
                Address=body.get("Address"),
                ContactNo=body.get("ContactNo"),
                EmailId=body.get("EmailId"),
                MapId=_int_or_none(body.get("MapId")),
                LoginType=str(login_type) if login_type else None,
                BranchCode=branch,
                IsActive=is_active,
                CreatedOn=now,
            )
            return legacy_status_result(str(new_id))
        return legacy_status_result("1")

    if action == 2:
        data = {
            "UserName": body.get("UserName"),
            "Name": body.get("Name"),
            "ContactNo": body.get("ContactNo"),
            "EmailId": body.get("EmailId"),
            "MapId": _int_or_none(body.get("MapId")),
            "BranchCode": body.get("BranchCode") or branch,
            "IsActive": is_active,
            "UpdatedOn": now,
        }
        password = body.get("Password")
        if password:
            data["Password"] = _bcrypt_hash(password)
        login_type = body.get("LoginType")
        if login_type:
            data["LoginType"] = str(login_type)
        LoginTable.objects.filter(LoginId=login_id).update(**data)
        return legacy_status_result(str(login_id) if login_id else "1")

    if action == 3:
        LoginTable.objects.filter(LoginId=login_id).update(IsActive=False, UpdatedOn=now)
        return legacy_status_result("1")

    # Other actions (document uploads etc.) — no-op success like the legacy
    # scalar returned by the stored procedure.
    return legacy_status_result("1")


@csrf_exempt
def iud_employee_doc(request):
    """POST /api/Dashboard/IUDEmployeeDoc — USP_LoginTable.

    Action 33 = replace a vendor's document mapping from the comma separated
    Documents list; other actions return success (the legacy scalar).
    """
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    action = _int_or_none(body.get("Action"))
    vendor_id = body.get("VendorId")
    documents = body.get("Documents")

    if action == 33 and vendor_id:
        IUDVendorClientDocument.objects.filter(VendorId=vendor_id).delete()
        doc_ids = [d.strip() for d in str(documents or "").split(",") if d.strip()]
        for doc_id in doc_ids:
            IUDVendorClientDocument.objects.create(
                DocumentId=_int_or_none(doc_id), VendorId=_int_or_none(vendor_id))
        return legacy_status_result("1")

    return legacy_status_result("1")


# ---------------------------------------------------------------------------
# Report header (USP_ReportHeader / usp_ManageReportHeader)
# ---------------------------------------------------------------------------


@csrf_exempt
def get_report_header(request):
    """POST /api/Dashboard/GetReportHeader — USP_ReportHeader.

    Action 4 = full list; Action 5 = list filtered by ReportCategoryName.
    """
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    action = _int_or_none(body.get("Action")) or 4
    qs = ReportHeader.objects.all()
    branch = body.get("BranchCode")
    if branch:
        qs = qs.filter(BranchCode=branch)
    if action == 5:
        category = body.get("ReportCategoryName")
        if not category:
            return legacy_json_string([])
        qs = qs.filter(ReportCategoryName=category)
    rows = [{
        "ReportHeaderId": r.ReportHeaderId,
        "ReportCategoryName": r.ReportCategoryName,
        "HeaderHtml": r.HeaderHtml,
        "IsActive": "Yes" if r.IsActive else "No",
        "BranchCode": r.BranchCode,
        "CreatedOn": r.CreatedOn,
        "UpdatedOn": r.UpdatedOn,
    } for r in qs]
    return legacy_json_string(rows)


@csrf_exempt
def insert_update_delete_report_header(request):
    """POST /api/Dashboard/InsertUpdateDeleteReportHeader — USP_ReportHeader.

    Action 1 = insert, Action 2 = update, Action 3 = delete.
    """
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    action = _int_or_none(body.get("Action"))
    branch = body.get("BranchCode") or "0001"
    login_id = _int_or_none(body.get("CreatedBy")) or _login_id(request)
    now = timezone.now()
    header_id = body.get("ReportHeaderId")

    if action == 1:
        if not header_id:
            header_id = _next_sequence(ReportHeader, "ReportHeaderId",
                                       prefix=(branch or "0001")[:4])
        ReportHeader.objects.create(
            ReportHeaderId=header_id,
            ReportCategoryName=body.get("ReportCategoryName"),
            HeaderHtml=body.get("HeaderHtml"),
            IsActive=_to_bool(body.get("IsActive"), default=True),
            BranchCode=branch,
            CreatedBy=login_id,
            CreatedOn=now,
        )
        return legacy_status_result("1")

    if action == 2 and header_id:
        ReportHeader.objects.filter(ReportHeaderId=header_id).update(
            ReportCategoryName=body.get("ReportCategoryName"),
            HeaderHtml=body.get("HeaderHtml"),
            IsActive=_to_bool(body.get("IsActive"), default=True),
            BranchCode=branch,
            UpdatedBy=login_id,
            UpdatedOn=now,
        )
        return legacy_status_result("1")

    if action == 3 and header_id:
        ReportHeader.objects.filter(ReportHeaderId=header_id).delete()
        return legacy_status_result("1")

    return legacy_status_result("1")


@csrf_exempt
def get_manage_report_header(request):
    """POST /api/Dashboard/GetManageReportHeader — usp_ManageReportHeader."""
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    doc_id = body.get("DocumentId")
    qs = ManageReportHeader.objects.all()
    if doc_id:
        qs = qs.filter(DocumentId=doc_id)
    rows = [{
        "Id": r.Id,
        "DocumentId": r.DocumentId,
        "StateId": r.StateId,
        "Allowed": r.Allowed,
        "BackupHeaderHtml": r.BackupHeaderHtml,
        "HeaderHtml": r.HeaderHtml,
    } for r in qs]
    return legacy_json_string(rows)


@csrf_exempt
def iud_manage_report_header(request):
    """POST /api/Dashboard/IUDManageReportHeader — usp_ManageReportHeader.

    Action 1 = insert, Action 2 = update, Action 3 = delete.
    """
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    action = _int_or_none(body.get("Action"))
    row_id = _int_or_none(body.get("Id"))

    if action == 1:
        row = ManageReportHeader.objects.create(
            DocumentId=_int_or_none(body.get("DocumentId")),
            StateId=_int_or_none(body.get("StateId")),
            HeaderHtml=body.get("HeaderHtml"),
        )
        return legacy_status_result(str(row.Id))

    if action == 2 and row_id:
        ManageReportHeader.objects.filter(Id=row_id).update(
            DocumentId=_int_or_none(body.get("DocumentId")),
            StateId=_int_or_none(body.get("StateId")),
            HeaderHtml=body.get("HeaderHtml"),
        )
        return legacy_status_result(str(row_id))

    if action == 3 and row_id:
        ManageReportHeader.objects.filter(Id=row_id).delete()
        return legacy_status_result("1")

    return legacy_status_result("1")


# ---------------------------------------------------------------------------
# Contractor gate pass (usp_ContractorGatePass)
# ---------------------------------------------------------------------------


def _gate_pass_status(value):
    return {1: "Approved", 2: "Rejected"}.get(value, "Pending")


def _gate_pass_rows(rows):
    site_map = {s.SiteId: s for s in SiteManager.objects.all()}
    out = []
    for gp, emp in rows:
        age = None
        if emp and emp.DateOfBirth:
            dob = emp.DateOfBirth
            try:
                age = (timezone.now().date() - dob).days // 365
            except Exception:
                age = None
        out.append({
            "Id": gp.Id,
            "EmployeeId": gp.EmployeeId,
            "EmployeeName": emp.EmployeeName if emp else None,
            "EmployeeCode": emp.EmployeeCode if emp else None,
            "EmployeeDesignation": emp.EmployeeDesignation if emp else None,
            "EmployeePhotos": emp.EmployeePhotos if emp else None,
            "DateOfBirth": emp.DateOfBirth if emp else None,
            "Age": age,
            "PermanemtAddress": emp.PresentAddress if emp else None,
            "BloodGroup": None,
            "SiteName": emp.Site if emp else None,
            "ContractMobileNumber": emp.MobileNumber if emp else None,
            "GatePassID": gp.GatePassID,
            "GatePassType": gp.GatePassType,
            "GatePassDays": gp.GatePassDays,
            "GatePassExpiryDate": gp.GatePassExpiryDate,
            "CreatedOn": gp.CreatedOn,
            "Approvaldate": gp.Approvaldate,
            "Status": gp.Status,
            "GSTATUS": _gate_pass_status(gp.Status),
        })
    return out


@csrf_exempt
def get_contractor_gate_pass(request):
    """POST /api/Dashboard/GetContractorGatePass — usp_ContractorGatePass.

    Actions: 5/9 = worker list for a contractor, 6/8 = party gate passes,
    7 = tile counts, 10/11 = permanent / temporary gate pass of the login's
    employees.
    """
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    action = _int_or_none(body.get("Action")) or 5
    login_id = _int_or_none(body.get("LoginId")) or _login_id(request)
    party_id = body.get("Id")
    gate_type = body.get("Id")

    gps = ContractorGatePass.objects.all()
    emp_ids = []
    if action in (5, 9):
        if login_id:
            emp_ids = list(EmployeeMaster.objects.filter(
                UserId=login_id).values_list("Id", flat=True))
            gps = gps.filter(EmployeeId__in=emp_ids)
        if gate_type in ("P", "T"):
            gps = gps.filter(GatePassType=gate_type)
    elif action in (10, 11):
        gptype = "P" if action == 10 else "T"
        if login_id:
            emp_ids = list(EmployeeMaster.objects.filter(
                UserId=login_id).values_list("Id", flat=True))
        gps = gps.filter(GatePassType=gptype)
        if emp_ids:
            gps = gps.filter(EmployeeId__in=emp_ids)
    elif action == 6:
        if login_id:
            emp_ids = list(EmployeeMaster.objects.filter(
                UserId=login_id).values_list("Id", flat=True))
            gps = gps.filter(EmployeeId__in=emp_ids)
    elif action == 8:
        if party_id:
            emp_ids = list(EmployeeMaster.objects.filter(
                PartyId=party_id).values_list("Id", flat=True))
            gps = gps.filter(EmployeeId__in=emp_ids)
    else:
        gps = gps.none()

    emp_map = {e.Id: e for e in EmployeeMaster.objects.filter(
        Id__in=list(gps.values_list("EmployeeId", flat=True)))}
    rows = _gate_pass_rows((gp, emp_map.get(gp.EmployeeId)) for gp in gps.order_by("-Id")[:500])

    if action == 7:
        total = len(rows)
        pending = sum(1 for r in rows if r["GSTATUS"] == "Pending")
        approved = sum(1 for r in rows if r["GSTATUS"] == "Approved")
        rejected = sum(1 for r in rows if r["GSTATUS"] == "Rejected")
        return legacy_json_string([{
            "TotalWorker": total,
            "TotalGatePass": total,
            "Pending": pending,
            "Approved": approved,
            "Rejected": rejected,
        }])
    return legacy_json_string(rows)


@csrf_exempt
def iud_contractor_gate_pass(request):
    """POST /api/Dashboard/IUDContractorGatePass — usp_ContractorGatePass.

    Action 1 = create gate passes for the comma-separated employee ids
    (GatePassType P/T + GatePassDays); Action 2 = approve/reject the given
    ids (GatePassType 1=approve, 2=reject).
    """
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    action = _int_or_none(body.get("Action"))
    ids = [i.strip() for i in str(body.get("Id") or "").split(",") if i.strip()]
    gate_type = body.get("GatePassType")
    days = _int_or_none(body.get("GatePassDays")) or 0
    now = timezone.now()

    if action == 1:
        if not ids:
            return legacy_status_result("0")
        seq = (ContractorGatePass.objects.aggregate(m=Max("Id"))["m"] or 0) + 1
        company = random.sample(string.ascii_uppercase, 3)
        for emp_id in ids:
            expiry = now
            if days:
                from datetime import timedelta
                expiry = now + timedelta(days=days)
            ContractorGatePass.objects.create(
                EmployeeId=_int_or_none(emp_id),
                GatePassType=str(gate_type)[:1].upper(),
                GatePassDays=days,
                GatePassExpiryDate=expiry,
                Status=0,
                GatePassID=f"{str(gate_type)[:1].upper()}GP{''.join(company)}{seq:06d}",
                CreatedOn=now,
            )
            seq += 1
        return legacy_status_result("1")

    if action == 2:
        status = 1 if str(gate_type) == "1" else 2
        ContractorGatePass.objects.filter(Id__in=ids).update(
            Status=status, Approvaldate=now)
        return legacy_status_result("1")

    return legacy_status_result("1")


# ---------------------------------------------------------------------------
# Contractor detail (USP_LoginTable)
# ---------------------------------------------------------------------------


@csrf_exempt
def get_contractor_detail(request):
    """POST /api/Dashboard/GetContractorDetail — USP_LoginTable.

    Action 60 = look up a party by PartyCode (contractor ID). Returns the
    party row plus isFlag used by the frontend consent button.
    """
    if not request.user.is_authenticated:
        return session_expired()
    body = _request_params(request)
    action = _int_or_none(body.get("Action")) or 60
    party_code = body.get("PartyCode")
    qs = PartyMaster.objects.all()
    if party_code:
        qs = qs.filter(PartyCode=party_code)
    rows = [{
        "partyid": p.PartyId,
        "PartyId": p.PartyId,
        "PartyCode": p.PartyCode,
        "PartyName": p.PartyName,
        "PartyType": p.PartyType,
        "ContactPerson": p.ContactPerson,
        "ContactNo": p.ContactNo,
        "ContactMobile": p.ContactMobile,
        "EmailId": p.EmailId,
        "Address": p.Address,
        "isFlag": p.isFlagg or "Send Consent",
        "isFlagg": p.isFlagg,
    } for p in qs[:50]]
    return legacy_json_string(rows)
