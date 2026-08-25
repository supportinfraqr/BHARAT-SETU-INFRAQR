"""Ports of legacy data actions (ReportController.cs, SendEmailController.cs,
SendEmailApiController.cs, NewsletterController.cs, CommunicationController.cs,
NotificationReminderController.cs).

Response contract follows api/views.py:
  * data-table actions  -> legacy_json_string([{...}, ...])
  * IUD / scalar actions -> {"status": True, "Result": <scalar>}
  * email actions       -> {"status": True, "Result": <email details>}

SMTP is intentionally not wired up in this environment: every "sent" email is
persisted into the bss_legacy_dbo_emaillog table instead of being dispatched.
"""
import os
from datetime import datetime, timedelta

from django.conf import settings
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt

from legacy.models import (
    Conversation,
    ConversationDocument,
    EmailLog,
    EmailMaster,
    LicenceRequest,
    LicenseMaster,
    LoginTable,
    Mapping,
    Newsletter,
    NewsletterClientMapping,
    PartyMaster,
    RetailDepartmentMaster,
    SiteManager,
    State,
    StoreLicences,
    StoreMapping,
    StoreMaster,
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
# Helpers
# ---------------------------------------------------------------------------


def _params(request):
    """Merge request params for JSON, urlencoded and multipart/form bodies."""
    params = {}
    if request.method == "POST":
        ctype = request.content_type or ""
        if "multipart/form-data" in ctype or "application/x-www-form-urlencoded" in ctype:
            params.update(request.POST.dict())
        if "application/json" in ctype:
            params.update(_request_params(request))
    else:
        params.update(_request_params(request))
    return params


def _float_or_none(value):
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _split_ids(value):
    if isinstance(value, list):
        return [x for x in value if x not in (None, "")]
    return [x for x in str(value or "").split(",") if x]


def _email_template(action):
    tpl = EmailMaster.objects.filter(Id=_int_or_none(action)).first()
    if tpl is None:
        tpl = EmailMaster.objects.order_by("Id").first()
    return tpl


def _email_detail(tpl, to_email, reply_to, subject, msg):
    return {
        "ToEmail": to_email,
        "ReplyToList": reply_to if reply_to and reply_to != "-1" else "-1",
        "EmailName": tpl.EmailId if tpl else None,
        "EmailId": tpl.EmailId if tpl else None,
        "Password": tpl.Password if tpl else None,
        "Port": tpl.Port if tpl else 587,
        "SmtpServer": tpl.Host if tpl else None,
        "Subject": subject or (tpl.Subject if tpl else None),
        "Msg": msg or (tpl.Message if tpl else None),
    }


def _log_email(request, action, to_email, subject, msg, extra=None):
    """Persist an outbound email into bss_legacy_dbo_emaillog (no real SMTP)."""
    tpl = _email_template(action)
    extra = extra or {}
    return EmailLog.objects.create(
        Action=_int_or_none(action),
        FromEmail=tpl.EmailId if tpl else None,
        ToEmail=to_email,
        ReplyToList=extra.get("ReplyToList"),
        EmailName=tpl.EmailId if tpl else None,
        Subject=subject or (tpl.Subject if tpl else None),
        Message=msg or (tpl.Message if tpl else None),
        SmtpServer=tpl.Host if tpl else None,
        SmtpPort=tpl.Port if tpl else None,
        LicenseRequestId=extra.get("LicenseRequestId"),
        StoreCode=extra.get("StoreCode"),
        LicenseNumber=extra.get("LicenseNumber"),
        LicenseName=extra.get("LicenseName"),
        StartDate=extra.get("StartDate"),
        EndDate=extra.get("EndDate"),
        ReminderDate=extra.get("ReminderDate"),
        LED=extra.get("LED"),
        DaysOfExpire=extra.get("DaysOfExpire"),
        UserName=extra.get("UserName"),
        Status=extra.get("Status") or "Logged",
        CreatedBy=_login_id(request),
        CreatedOn=timezone.now(),
    )


def _resolve_recipient(request, params):
    to_email = params.get("ToEmail") or params.get("Receiver") or params.get("Email")
    if to_email:
        return to_email
    client_id = _int_or_none(params.get("ClientId"))
    if client_id:
        pm = PartyMaster.objects.filter(PartyId=client_id).first()
        if pm and pm.EmailId:
            return pm.EmailId
        lt = LoginTable.objects.filter(LoginId=client_id).first()
        if lt and lt.EmailId:
            return lt.EmailId
    return None


def _newsletter_recipients(newsletter_id):
    nid = _int_or_none(newsletter_id)
    if not nid:
        return []
    party_ids = list(
        NewsletterClientMapping.objects.filter(NewsLetterId=nid)
        .values_list("PartyId", flat=True)
    )
    if not party_ids:
        return []
    emails = []
    for p in PartyMaster.objects.filter(PartyId__in=party_ids):
        if p.EmailId:
            emails.append(p.EmailId)
    return emails


def _reminder_email_rows():
    """Reminder dataset (mirrors USP_ReminderEmail) built from migrated rows."""
    sl_map = {s.Id: s for s in StoreLicences.objects.all()}
    sm_map = {s.Id: s for s in StoreMaster.objects.all()}
    lm_map = {l.LicenseId: l for l in LicenseMaster.objects.all()}
    store_user = {}
    for m in StoreMapping.objects.all():
        store_user.setdefault(m.StoreId, m.UserId)
    login_map = {l.LoginId: l for l in LoginTable.objects.all()}

    rows = []
    for lr in LicenceRequest.objects.filter(LStatus__in=(1, 3)).order_by("ValidityEndDate_old"):
        sl = sl_map.get(lr.StoreLicenceId)
        if not sl:
            continue
        sm = sm_map.get(sl.StoreId)
        lm = lm_map.get(sl.LicenseId)
        if not sm or not lm:
            continue
        end = lr.ValidityEndDate_old
        end_d = end.date() if isinstance(end, datetime) else end
        doe = sm.DaysOfExpire or 0
        uid = store_user.get(sl.StoreId)
        owner = login_map.get(uid) if uid else None
        rows.append({
            "RowId": len(rows) + 1,
            "LicenseRequestId": lr.Id,
            "StoreCode": sm.StoreCode,
            "LicenseNumber": lr.LicenseNumber,
            "LicenseName": lm.LicenseName,
            "StartDate": lr.ValidityStartDate_old,
            "EndDate": end_d,
            "ReminderDate": (end_d - timedelta(days=doe)) if end_d else None,
            "Status": "",
            "ToEmail": owner.EmailId if owner else None,
            "UserName": (owner.UserName if owner else None),
            "LED": end_d,
            "DaysOfExpire": doe,
        })
    return rows


# ---------------------------------------------------------------------------
# ReportController.cs
# ---------------------------------------------------------------------------


@csrf_exempt
def search_report(request):
    """POST /api/Report/SearchReport — EVM.USP_TBL_PartyMaster equivalent:
    client / client-site / vendor / auditor search over the dbo.Mapping join."""
    if not request.user.is_authenticated:
        return session_expired()
    params = _request_params(request)
    qs = Mapping.objects.all()
    client_id = _int_or_none(params.get("ClientId"))
    site_id = _int_or_none(params.get("ClientSiteId"))
    vendor_id = _int_or_none(params.get("VendorId"))
    auditor_id = _int_or_none(params.get("AuditorId"))
    if client_id:
        qs = qs.filter(ClientId=client_id)
    if site_id:
        qs = qs.filter(ClientSiteId=site_id)
    if vendor_id:
        qs = qs.filter(VendorId=vendor_id)
    if auditor_id:
        qs = qs.filter(AuditorId=auditor_id)

    rows = list(qs[:500])
    party_ids = {
        x for r in rows for x in (r.ClientId, r.VendorId, r.AuditorId) if x
    }
    party_map = {}
    if party_ids:
        for p in PartyMaster.objects.filter(PartyId__in=party_ids):
            party_map[p.PartyId] = p.PartyName
    site_ids = {r.ClientSiteId for r in rows if r.ClientSiteId}
    site_map = {}
    if site_ids:
        for s in SiteManager.objects.filter(SiteId__in=site_ids):
            site_map[s.SiteId] = s.SiteName

    result = [{
        "Id": r.Id,
        "Client": party_map.get(r.ClientId),
        "ClientSite": site_map.get(r.ClientSiteId),
        "Vendor": party_map.get(r.VendorId),
        "Auditor": party_map.get(r.AuditorId),
    } for r in rows]
    return legacy_json_string(result)


@csrf_exempt
def search_reminder_report(request):
    """POST /api/Report/SearchReminderReport — USP_ReminderEmail equivalent."""
    if not request.user.is_authenticated:
        return session_expired()
    params = _request_params(request)
    start_date = params.get("StartDate")
    sd = None
    if start_date and str(start_date) not in ("-1", ""):
        sd = _parse_date(start_date)

    result = []
    for r in _reminder_email_rows():
        if sd is not None and r["EndDate"] and r["EndDate"] < sd:
            continue
        result.append({
            "RowId": r["RowId"],
            "StoreCode": r["StoreCode"],
            "LicenseNumber": r["LicenseNumber"],
            "LicenseName": r["LicenseName"],
            "StartDate": r["StartDate"],
            "EndDate": _fmt_date(r["EndDate"], "%m/%d/%Y"),
            "ReminderDate": _fmt_date(r["ReminderDate"], "%m/%d/%Y"),
            "Status": r["Status"],
            "ToEmail": r["ToEmail"],
            "UserName": r["UserName"],
            "LED": _fmt_date(r["LED"], "%m/%d/%Y"),
            "DaysOfExpire": r["DaysOfExpire"],
        })
    return legacy_json_string(result)


# ---------------------------------------------------------------------------
# SendEmailController.cs / SendEmailApiController.cs / NotificationReminderController.cs
# ---------------------------------------------------------------------------


@csrf_exempt
def send_email(request):
    """POST /api/SendEmail/SendEmail — FireEmail equivalent. Logs the message,
    never dispatches via SMTP."""
    if not request.user.is_authenticated:
        return session_expired()
    params = _request_params(request)
    action = params.get("Action")
    to_email = _resolve_recipient(request, params)
    subject = params.get("Subject")
    msg = params.get("Msg") or params.get("Message")
    extra = {
        "ReplyToList": params.get("ReplyToList"),
        "LicenseRequestId": params.get("LicenseRequestId") or params.get("Id"),
        "StoreCode": params.get("StoreCode"),
        "LicenseNumber": params.get("LicenseNumber"),
        "LicenseName": params.get("LicenseName"),
    }
    _log_email(request, action, to_email, subject, msg, extra)
    details = _email_detail(_email_template(action), to_email, params.get("ReplyToList"), subject, msg)
    return legacy_status_result([details])


@csrf_exempt
def send_email_for_newsletter(request):
    """POST /api/SendEmail/SendEmailForNewsletter — sends to every mapped
    client of a newsletter. Logged only."""
    if not request.user.is_authenticated:
        return session_expired()
    params = _request_params(request)
    action = params.get("Action")
    subject = "Notification, " + str(params.get("SubjectLine") or "").upper()
    msg = params.get("Msg") or params.get("Summary") or params.get("Message")
    recipients = _newsletter_recipients(params.get("Id"))
    details_list = []
    for to_email in recipients:
        _log_email(request, action, to_email, subject, msg, {"ReplyToList": "-1"})
        details_list.append(_email_detail(_email_template(action), to_email, "-1", subject, msg))
    return legacy_status_result(details_list)


@csrf_exempt
def send_email_bulk(request):
    """POST /api/SendEmailApi/SendEmailBULK — bulkemail() (USP_EmailMaster
    @Action=21) equivalent. Logs one row per recipient."""
    if not request.user.is_authenticated:
        return session_expired()
    params = _request_params(request)
    action = params.get("Action") or 21
    tpl = _email_template(action)
    login_id = _login_id(request)
    created_on = timezone.now()
    success = []
    to_create = []
    for r in _reminder_email_rows():
        to_create.append(EmailLog(
            Action=_int_or_none(action),
            FromEmail=tpl.EmailId if tpl else None,
            ToEmail=r["ToEmail"],
            ReplyToList="-1",
            EmailName=tpl.EmailId if tpl else None,
            Subject=tpl.Subject if tpl else None,
            Message=tpl.Message if tpl else None,
            SmtpServer=tpl.Host if tpl else None,
            SmtpPort=tpl.Port if tpl else None,
            LicenseRequestId=r["LicenseRequestId"],
            StoreCode=r["StoreCode"],
            LicenseNumber=r["LicenseNumber"],
            LicenseName=r["LicenseName"],
            StartDate=r["StartDate"],
            EndDate=_fmt_date(r["EndDate"]),
            ReminderDate=_fmt_date(r["ReminderDate"]),
            LED=_fmt_date(r["LED"]),
            DaysOfExpire=r["DaysOfExpire"],
            UserName=r["UserName"],
            Status="Logged",
            CreatedBy=login_id,
            CreatedOn=created_on,
        ))
        success.append(r["ToEmail"])
    EmailLog.objects.bulk_create(to_create)
    return legacy_status_result({"SuccessEmails": success, "FailedEmails": []})


@csrf_exempt
def send_remainder(request):
    """POST /api/NotificationReminder/SendRemainder — FireEmail + send loop.
    Logs all pending reminders instead of dispatching."""
    if not request.user.is_authenticated:
        return session_expired()
    params = _request_params(request)
    action = params.get("Action")
    to_email = params.get("ToEmail") or params.get("Receiver")
    if to_email:
        subject = params.get("Subject")
        msg = params.get("Msg") or params.get("Message")
        _log_email(request, action, to_email, subject, msg, {"ReplyToList": params.get("ReplyToList")})
    else:
        tpl = _email_template(action)
        login_id = _login_id(request)
        created_on = timezone.now()
        to_create = []
        for r in _reminder_email_rows():
            to_create.append(EmailLog(
                Action=_int_or_none(action),
                FromEmail=tpl.EmailId if tpl else None,
                ToEmail=r["ToEmail"],
                ReplyToList="-1",
                EmailName=tpl.EmailId if tpl else None,
                Subject=tpl.Subject if tpl else None,
                Message=tpl.Message if tpl else None,
                SmtpServer=tpl.Host if tpl else None,
                SmtpPort=tpl.Port if tpl else None,
                LicenseRequestId=r["LicenseRequestId"],
                StoreCode=r["StoreCode"],
                LicenseNumber=r["LicenseNumber"],
                LicenseName=r["LicenseName"],
                StartDate=r["StartDate"],
                EndDate=_fmt_date(r["EndDate"]),
                ReminderDate=_fmt_date(r["ReminderDate"]),
                LED=_fmt_date(r["LED"]),
                DaysOfExpire=r["DaysOfExpire"],
                UserName=r["UserName"],
                Status="Logged",
                CreatedBy=login_id,
                CreatedOn=created_on,
            ))
        EmailLog.objects.bulk_create(to_create)
    return legacy_status_result("Emails sent successfully!")


# ---------------------------------------------------------------------------
# NewsletterController.cs
# ---------------------------------------------------------------------------


def _newsletter_row(n, state_map, dep_map):
    return {
        "Id": n.Id,
        "StateCentralActtitle": n.StateCentralActtitle,
        "DateOfNotification": _fmt_date(n.DateOfNotification, "%d/%m/%Y"),
        "SATE_CODE": n.SATE_CODE,
        "STATE_NM": state_map.get(n.SATE_CODE),
        "EffectiveDateOfNotification": _fmt_date(n.EffectiveDateOfNotification, "%d/%m/%Y"),
        "NotificationNumber": n.NotificationNumber,
        "DepartmentId": n.DepartmentId,
        "DepartmentName": dep_map.get(n.DepartmentId),
        "UploadDocPath": n.UploadDocPath,
        "SubjectLine": n.SubjectLine,
        "PartyId": n.PartyId,
        "Summary": n.Summary,
        "CreatedDate": _fmt_date(n.CreatedDate, "%d/%m/%Y"),
        "newscategory": n.newscategory,
        "NewsCategory": n.newscategory,
        "NewsLetter": "No",
    }


@csrf_exempt
def get_newsletter_dt(request):
    """POST /api/Newsletter/GetNewsletterDT — USP_GetNewsletter @Id."""
    if not request.user.is_authenticated:
        return session_expired()
    params = _request_params(request)
    nid = _int_or_none(params.get("Id"))
    qs = Newsletter.objects.all()
    if nid:
        qs = qs.filter(Id=nid)
    state_map = {s.SATE_CODE: s.STATE_NM for s in State.objects.all()}
    dep_map = {d.DepartmentId: d.DepartmentName for d in RetailDepartmentMaster.objects.all()}
    rows = [_newsletter_row(n, state_map, dep_map) for n in qs.order_by("-CreatedDate")[:500]]
    return legacy_json_string(rows)


@csrf_exempt
def get_newsletter_for_search_dt(request):
    """POST /api/Newsletter/GetNewsletterForSearchDT — USP_GetNewsletterForSearch."""
    if not request.user.is_authenticated:
        return session_expired()
    newsletters = list(Newsletter.objects.order_by("-CreatedDate")[:500])
    state_map = {s.SATE_CODE: s.STATE_NM for s in State.objects.all()}
    dep_map = {d.DepartmentId: d.DepartmentName for d in RetailDepartmentMaster.objects.all()}

    party_ids = set()
    news_ids = [n.Id for n in newsletters]
    cm_by_news = {}
    for cm in NewsletterClientMapping.objects.filter(NewsLetterId__in=news_ids):
        cm_by_news.setdefault(cm.NewsLetterId, []).append(cm.PartyId)
        party_ids.add(cm.PartyId)
    party_map = {}
    if party_ids:
        for p in PartyMaster.objects.filter(PartyId__in=party_ids):
            party_map[p.PartyId] = p.PartyName

    rows = []
    for n in newsletters:
        row = _newsletter_row(n, state_map, dep_map)
        clients = [party_map.get(pid) for pid in cm_by_news.get(n.Id, [])]
        row["PartyName"] = ", ".join(name for name in clients if name)
        row["NewsLetter"] = "Yes" if cm_by_news.get(n.Id) else "No"
        rows.append(row)
    return legacy_json_string(rows)


@csrf_exempt
def get_departments(request):
    """POST /api/Newsletter/GetDepartments — RTL.USP_GetDepartment."""
    if not request.user.is_authenticated:
        return session_expired()
    rows = list(RetailDepartmentMaster.objects.values("DepartmentId", "DepartmentName"))
    return legacy_json_string(rows)


@csrf_exempt
def insert_update_newsletter(request):
    """POST /api/Newsletter/InsertUpdateNewsletter — multipart form.
    ActionType 1 = insert, 2 = update. Re-maps the selected clients."""
    if not request.user.is_authenticated:
        return session_expired()
    params = _params(request)
    action_type = _int_or_none(params.get("ActionType"))
    nid = _int_or_none(params.get("Id"))
    login_id = _login_id(request) or _int_or_none(params.get("CreatedBy"))

    upload_doc = params.get("UploadDocPath")
    uploaded = request.FILES.get("file")
    if uploaded:
        dirpath = os.path.join(settings.MEDIA_ROOT, "NewsLetter")
        os.makedirs(dirpath, exist_ok=True)
        fname = f"{params.get('SubjectLine') or 'newsletter'}_{uploaded.name}"
        dest = os.path.join(dirpath, fname)
        with open(dest, "wb") as fh:
            for chunk in uploaded.chunks():
                fh.write(chunk)
        upload_doc = f"/media/NewsLetter/{fname}"

    common = {
        "StateCentralActtitle": params.get("StateCentralActtitle"),
        "DateOfNotification": _parse_date(params.get("DateOfNotification")),
        "SATE_CODE": _float_or_none(params.get("SATE_CODE")),
        "EffectiveDateOfNotification": _parse_date(params.get("EffectiveDateOfNotification")),
        "NotificationNumber": params.get("NotificationNumber"),
        "DepartmentId": _int_or_none(params.get("DepartmentId")),
        "UploadDocPath": upload_doc,
        "SubjectLine": params.get("SubjectLine"),
        "newscategory": params.get("NewsCategory"),
        "Summary": params.get("Summary"),
    }
    selected = _split_ids(params.get("SelectedClients"))

    if action_type == 2 and nid:
        Newsletter.objects.filter(Id=nid).update(**common)
        NewsletterClientMapping.objects.filter(NewsLetterId=nid).delete()
        news_id = nid
    else:
        row = Newsletter.objects.create(PartyId=",".join(selected), CreatedDate=timezone.now(), **common)
        news_id = row.Id

    for i, client in enumerate(selected):
        NewsletterClientMapping.objects.create(
            NewsLetterId=news_id, PartyId=_int_or_none(client) or 0
        )
    return legacy_status_result(news_id)


@csrf_exempt
def update_newsletter_summary(request):
    """POST /api/Newsletter/UpdateNewsletterSummary — USP_UpdateNewsLetterSummary."""
    if not request.user.is_authenticated:
        return session_expired()
    params = _request_params(request)
    nid = _int_or_none(params.get("Id"))
    data = {"Summary": params.get("Summary")}
    dnot = _parse_date(params.get("DateOfNotification"))
    if dnot:
        data["DateOfNotification"] = dnot
    enot = _parse_date(params.get("EffectiveDateOfNotification"))
    if enot:
        data["EffectiveDateOfNotification"] = enot
    Newsletter.objects.filter(Id=nid).update(**data)
    return legacy_status_result("1")


@csrf_exempt
def get_newsletter_client_names(request):
    """POST /api/Newsletter/GetNewsletterClientNames — GetClientNames @Id."""
    if not request.user.is_authenticated:
        return session_expired()
    params = _request_params(request)
    nid = _int_or_none(params.get("Id"))
    party_ids = list(
        NewsletterClientMapping.objects.filter(NewsLetterId=nid).values_list("PartyId", flat=True)
    )
    names = []
    if party_ids:
        for p in PartyMaster.objects.filter(PartyId__in=party_ids):
            if p.PartyName:
                names.append(p.PartyName)
    return legacy_status_result(",".join(names))


# ---------------------------------------------------------------------------
# CommunicationController.cs
# ---------------------------------------------------------------------------


@csrf_exempt
def get_communication(request):
    """POST /api/Communication/GetCommunication — USP_Conversation."""
    if not request.user.is_authenticated:
        return session_expired()
    params = _request_params(request)
    qs = Conversation.objects.all()
    conv_id = params.get("ConversationId")
    if conv_id:
        qs = qs.filter(ConversationId__icontains=str(conv_id))
    invoice_no = params.get("InvoiceNo")
    if invoice_no:
        qs = qs.filter(InvoiceNo=invoice_no)
    row_id = _int_or_none(params.get("Id"))
    if row_id:
        qs = qs.filter(Id=row_id)
    updated_by = params.get("Updatedby")
    if updated_by:
        qs = qs.filter(Sender=str(updated_by)) | qs.filter(Receiver=str(updated_by))

    rows = []
    for c in qs.order_by("-Id")[:500]:
        rows.append({
            "Id": c.Id,
            "ConversationId": c.ConversationId,
            "SNO": c.SNO,
            "InvoiceNo": c.InvoiceNo,
            "Conversation": c.Conversation,
            "Detail": c.Detail,
            "Sender": c.Sender,
            "Receiver": c.Receiver,
            "DocumentName1": c.DocumentName1, "Document1": c.Document1, "DocuumentApprove1": c.DocuumentApprove1,
            "DocumentName2": c.DocumentName2, "Document2": c.Document2, "DocuumentApprove2": c.DocuumentApprove2,
            "DocumentName3": c.DocumentName3, "Document3": c.Document3, "DocuumentApprove3": c.DocuumentApprove3,
            "DocumentName4": c.DocumentName4, "Document4": c.Document4, "DocuumentApprove4": c.DocuumentApprove4,
            "DocumentName5": c.DocumentName5, "Document5": c.Document5, "DocuumentApprove5": c.DocuumentApprove5,
            "Updatedby": c.Updatedby,
            "UpdatedON": _fmt_date(c.UpdatedON),
            "Isdelete": c.Isdelete,
            "Status": c.Status,
            "IsRead": c.IsRead,
            "mtype": c.mtype,
        })
    return legacy_json_string(rows)


@csrf_exempt
def iud_communication(request):
    """POST /api/Communication/IUDCommunication — USP_Conversation.
    Action 44 = send message, 6 = approve, 7 = reject, 20 = final submission."""
    if not request.user.is_authenticated:
        return session_expired()
    params = _request_params(request)
    action = _int_or_none(params.get("Action"))
    login_id = _login_id(request)

    if action == 44:
        Conversation.objects.create(
            ConversationId=params.get("ConversationId"),
            SNO=_int_or_none(params.get("SNO")) or 1,
            InvoiceNo=params.get("InvoiceNo"),
            Conversation=params.get("Conversation"),
            Detail=params.get("Detail"),
            Sender=params.get("Sender") or (str(login_id) if login_id else None),
            Receiver=params.get("Receiver"),
            DocumentName1=params.get("DocumentName"),
            Document1=params.get("DocumentFile") or params.get("Document3"),
            Updatedby=str(login_id) if login_id else params.get("Updatedby"),
            UpdatedON=timezone.now(),
            Isdelete=0,
            Status=0,
            IsRead=0,
        )
        return legacy_status_result("1")

    if action in (6, 7):
        Conversation.objects.filter(Id=_int_or_none(params.get("Id"))).update(
            Status=1 if action == 6 else 2,
            Updatedby=str(login_id) if login_id else params.get("Updatedby"),
            UpdatedON=timezone.now(),
        )
        return legacy_status_result("1")

    if action == 20:
        Conversation.objects.filter(ConversationId=params.get("ConversationId")).update(
            Status=1,
            Updatedby=str(login_id) if login_id else params.get("Updatedby"),
            UpdatedON=timezone.now(),
        )
        return legacy_status_result("1")

    return legacy_status_result("1")


@csrf_exempt
def download_files(request):
    """POST /api/Communication/DownloadFiles — returns the requested document
    file list (legacy zipped the files; here only the paths are returned)."""
    if not request.user.is_authenticated:
        return session_expired()
    params = _request_params(request)
    items = params.get("DocumentList") or []
    if isinstance(items, list):
        result = []
        for d in items:
            if not isinstance(d, dict):
                continue
            result.append({
                "InvoiceNo": d.get("InvoiceNo"),
                "DocumentName": d.get("DocumentName"),
                "DocumentFile": d.get("DocumentFile"),
                "Status": d.get("Status"),
            })
        return legacy_json_string(result)
    conv_id = params.get("ConversationId")
    if conv_id:
        rows = [
            {
                "Id": d.Id, "ConversationId": d.ConversationId, "InvoiceNo": d.InvoiceNo,
                "DocumentName": d.DocumentName, "DocumentFile": d.DocumentFile,
                "Status": d.Status, "UpdatedOn": _fmt_date(d.UpdatedOn),
            }
            for d in ConversationDocument.objects.filter(ConversationId=conv_id)
        ]
        return legacy_json_string(rows)
    return legacy_json_string([])
