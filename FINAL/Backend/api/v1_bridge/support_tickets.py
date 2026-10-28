"""BSS Admin support-ticket desk for ContactMessage threads."""

# ruff: noqa: F401,F403
from .common import *

import html

from django.conf import settings
from django.core.mail import EmailMultiAlternatives

from bss_core.models import ContactMessage, ContactMessageReply

from .admin_console import log_audit


def _admin_only(user):
    return getattr(user, "role", "") in ("bss_admin", "admin")


def _reply_row(reply):
    return {
        "id": reply.id,
        "body": reply.body,
        "author": payloads._party_name(reply.author) if reply.author_id else "BSS Support",
        "emailed": reply.emailed,
        "emailError": reply.email_error or "",
        "createdAt": payloads._dts(reply.created_at),
    }


def _ticket_row(msg, with_thread=True):
    row = {
        "id": msg.id,
        "reference": msg.reference,
        "name": msg.name,
        "role": msg.role,
        "roleLabel": msg.get_role_display(),
        "bssId": msg.bss_id,
        "email": msg.email,
        "phone": msg.phone,
        "category": msg.category,
        "categoryLabel": msg.get_category_display(),
        "subject": msg.subject,
        "message": msg.message,
        "status": msg.status,
        "statusLabel": msg.get_status_display(),
        "emailed": msg.emailed,
        "emailError": msg.email_error or "",
        "createdAt": payloads._dts(msg.created_at),
        "replies": [],
    }
    if with_thread:
        row["replies"] = [_reply_row(reply) for reply in msg.replies.select_related("author")]
        row["updatedAt"] = row["replies"][-1]["createdAt"] if row["replies"] else row["createdAt"]
    return row


def _send_reply_email(msg, reply):
    recipients = [msg.email] if msg.email else []
    if not recipients:
        return False, "The ticket has no requester email."
    if not settings.EMAIL_HOST:
        return False, "SMTP is not configured yet (BSS_SMTP_HOST)."
    support_email = str(settings.BSS_CONTACT_TO_EMAIL or "").strip()
    subject = f"Re: [BSS Support] {msg.subject} ({msg.reference})"
    text_body = (
        "Bharat Shram Setu — Support reply\n"
        f"Reference: {msg.reference}\n"
        f"Subject: {msg.subject}\n\n"
        f"{reply.body}\n\n"
        "Your original message:\n"
        f"{msg.message}\n"
    )
    esc = html.escape
    html_body = f"""<!doctype html>
<html><body style="margin:0;background:#eef2f8;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f8;padding:28px 12px;"><tr><td align="center">
<table role="presentation" width="640" cellpadding="0" cellspacing="0" style="width:100%;max-width:640px;background:#fff;border-radius:18px;overflow:hidden;">
<tr><td style="background:#01183A;padding:26px 32px;color:#fff;">
<div style="color:#93c5fd;font-size:11px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;">Bharat Shram Setu</div>
<div style="font-size:24px;font-weight:700;margin-top:6px;">Support reply</div>
<div style="color:rgba(255,255,255,.65);font-size:13px;margin-top:4px;">{esc(msg.reference)}</div>
</td></tr>
<tr><td style="padding:28px 32px 6px 32px;">
<div style="color:#64748b;font-size:11px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;">Subject</div>
<div style="color:#0f172a;font-size:18px;font-weight:700;margin-top:5px;">{esc(msg.subject)}</div>
</td></tr>
<tr><td style="padding:18px 32px 6px 32px;">
<div style="background:#f8fafc;border-left:4px solid #1E3A8A;border-radius:0 12px 12px 0;padding:16px 18px;color:#1e293b;font-size:14px;line-height:1.7;white-space:pre-wrap;">{esc(reply.body)}</div>
</td></tr>
<tr><td style="padding:20px 32px 28px 32px;">
<div style="border-top:1px solid #e2e8f0;padding-top:16px;color:#64748b;font-size:12px;line-height:1.7;">
Your original message:<br><span style="color:#334155;white-space:pre-wrap;">{esc(msg.message)}</span>
</div>
</td></tr>
</table>
<div style="max-width:640px;margin:16px auto 0;color:#94a3b8;font-size:10px;text-align:center;">Bharat Shram Setu · Computer-generated email</div>
</td></tr></table></body></html>"""
    email = EmailMultiAlternatives(
        subject=subject, body=text_body, from_email=settings.DEFAULT_FROM_EMAIL,
        to=recipients, reply_to=[support_email] if support_email else None)
    email.attach_alternative(html_body, "text/html")
    try:
        email.send(fail_silently=False)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Support reply email failed for %s: %s", msg.reference, exc)
        return False, str(exc)[:500]
    return True, ""


def _resolve_ticket(body):
    raw_id = body.get("id")
    reference = str(body.get("reference") or "").strip()
    if raw_id not in (None, ""):
        try:
            return ContactMessage.objects.filter(pk=int(raw_id)).first()
        except (TypeError, ValueError):
            return None
    if reference:
        return ContactMessage.objects.filter(reference=reference).first()
    return None


@api_view(["GET", "POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def admin_support_tickets(request):
    """BSS Admin: list, reply to, and close support tickets."""
    if not _admin_only(request.user):
        return Response({"error": "BSS Admin only."}, status=status.HTTP_403_FORBIDDEN)

    if request.method == "GET":
        qs = ContactMessage.objects.prefetch_related("replies__author").order_by("-created_at")
        status_q = str(request.query_params.get("status") or "").strip().upper()
        if status_q in dict(ContactMessage.STATUS):
            qs = qs.filter(status=status_q)
        rows = [_ticket_row(msg) for msg in qs[:500]]
        open_count = ContactMessage.objects.exclude(status__in=("RESOLVED", "CLOSED")).count()
        return Response({"data": rows, "openCount": open_count}, status=status.HTTP_200_OK)

    body = request.data or {}
    action = str(body.get("action") or "reply").strip().lower()
    msg = _resolve_ticket(body)
    if msg is None:
        return Response({"error": "Ticket not found."}, status=status.HTTP_404_NOT_FOUND)

    if action == "reply":
        text = str(body.get("message") or "").strip()
        if len(text) < 2:
            return Response({"error": "Write a reply before sending it."},
                            status=status.HTTP_400_BAD_REQUEST)
        reply = ContactMessageReply.objects.create(
            message=msg, author=request.user, body=text[:5000])
        sent, error = _send_reply_email(msg, reply)
        reply.emailed = sent
        reply.email_error = "" if sent else error
        reply.save(update_fields=["emailed", "email_error"])
        if msg.status in ("NEW", "RESOLVED", "CLOSED"):
            msg.status = "READ"
            msg.save(update_fields=["status"])
        log_audit(request.user, "REPLY", "contact_message", msg.id,
                  after={"summary": f"Replied to {msg.reference}",
                         "emailed": sent})
        return Response({"data": _ticket_row(msg, with_thread=False),
                         "reply": _reply_row(reply), "emailed": sent,
                         "emailError": error}, status=status.HTTP_200_OK)

    if action == "status":
        new_status = str(body.get("status") or "").strip().upper()
        if new_status not in dict(ContactMessage.STATUS):
            return Response({"error": "Unknown ticket status."},
                            status=status.HTTP_400_BAD_REQUEST)
        msg.status = new_status
        msg.save(update_fields=["status"])
        log_audit(request.user, "UPDATE", "contact_message", msg.id,
                  after={"summary": f"Ticket {msg.reference} → {new_status}"})
        return Response({"data": _ticket_row(msg, with_thread=False)},
                        status=status.HTTP_200_OK)

    return Response({"error": "Unknown ticket action."}, status=status.HTTP_400_BAD_REQUEST)


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def my_support_tickets(request):
    """Authenticated user: their own support tickets and replies."""
    qs = (ContactMessage.objects
          .filter(user=request.user)
          .prefetch_related("replies__author")
          .order_by("-created_at"))
    rows = [_ticket_row(msg) for msg in qs[:200]]
    return Response({"data": rows}, status=status.HTTP_200_OK)


__all__ = ["admin_support_tickets", "my_support_tickets"]
