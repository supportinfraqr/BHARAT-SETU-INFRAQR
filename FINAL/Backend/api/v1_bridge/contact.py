"""BSS support contact form — store every C/W/E message and email a copy.

The form works before SMTP is configured: the submission is persisted as a
ContactMessage with a reference, and the email step is skipped. Once the SMTP
environment variables are set, each new message is also emailed to
BSS_CONTACT_TO_EMAIL as a styled HTML email with the sender as Reply-To.
"""

import html

from django.core.exceptions import ValidationError
from django.core.mail import EmailMultiAlternatives
from django.core.validators import validate_email
from django.utils.crypto import get_random_string

from bss_core.models import ContactMessage

from .common import *

_ROLES = {key for key, _ in ContactMessage.ROLE}
_CATEGORIES = {key for key, _ in ContactMessage.CATEGORY}
_ROLE_LABELS = dict(ContactMessage.ROLE)
_CATEGORY_LABELS = dict(ContactMessage.CATEGORY)


def _clean(value, limit):
    return str(value or "").strip()[:limit]


def _reference():
    stamp = timezone.now().strftime("%Y%m%d")
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    return f"BSS-{stamp}-{get_random_string(6, alphabet)}"


def _render_email(msg):
    """Return (plain text, HTML) for one contact message."""
    esc = html.escape
    role = _ROLE_LABELS.get(msg.role, "User")
    category = _CATEGORY_LABELS.get(msg.category, msg.category)
    created = timezone.localtime(msg.created_at).strftime("%d %b %Y, %I:%M %p IST")
    subject = esc(msg.subject)
    sender = esc(msg.name)

    fields = [
        ("Submitted by", msg.name),
        ("Role", role),
        ("BSS ID", msg.bss_id or "—"),
        ("Email", msg.email),
        ("Phone", msg.phone or "—"),
        ("Category", category),
        ("Reference", msg.reference),
        ("Submitted", created),
    ]
    rows = "".join(
        f'<tr><td style="padding:7px 0;width:148px;color:#64748b;font-size:11px;'
        f'text-transform:uppercase;letter-spacing:.09em;font-weight:700;">{esc(label)}</td>'
        f'<td style="padding:7px 0;color:#0f172a;font-size:14px;font-weight:600;">{esc(value)}</td></tr>'
        for label, value in fields
    )
    reply_href = f"mailto:{esc(msg.email)}?subject=Re%3A%20{esc(msg.reference)}"

    html_body = f"""<!doctype html>
<html>
<body style="margin:0;padding:0;background:#eef2f8;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f8;padding:28px 12px;">
    <tr><td align="center">
      <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="width:100%;max-width:640px;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 18px 40px rgba(1,24,58,.12);">
        <tr>
          <td style="background:#01183A;padding:28px 32px;">
            <div style="color:#93c5fd;font-size:11px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;">Bharat Shram Setu</div>
            <div style="color:#ffffff;font-size:25px;font-weight:700;margin-top:6px;">Support &amp; Grievance</div>
            <div style="color:rgba(255,255,255,.65);font-size:13px;margin-top:4px;">New message from a {esc(role)}</div>
            <div style="display:inline-block;margin-top:14px;padding:6px 13px;border-radius:999px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.2);color:#ffffff;font-size:11px;font-weight:700;letter-spacing:.08em;">{esc(msg.reference)}</div>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px 4px 32px;">
            <div style="color:#64748b;font-size:11px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;">Subject</div>
            <div style="color:#0f172a;font-size:18px;font-weight:700;margin-top:5px;line-height:1.35;">{subject}</div>
          </td>
        </tr>
        <tr>
          <td style="padding:18px 32px 6px 32px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;padding:8px 0;">{rows}</table>
          </td>
        </tr>
        <tr>
          <td style="padding:22px 32px 6px 32px;">
            <div style="color:#64748b;font-size:11px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;margin-bottom:8px;">Message</div>
            <div style="background:#f8fafc;border-left:4px solid #1E3A8A;border-radius:0 12px 12px 0;padding:16px 18px;color:#1e293b;font-size:14px;line-height:1.7;white-space:pre-wrap;">{esc(msg.message)}</div>
          </td>
        </tr>
        <tr>
          <td style="padding:22px 32px 28px 32px;">
            <a href="{reply_href}" style="display:inline-block;background:#1E3A8A;color:#ffffff;text-decoration:none;font-size:13px;font-weight:700;padding:12px 20px;border-radius:10px;">Reply to {sender}</a>
          </td>
        </tr>
        <tr>
          <td style="padding:0 32px 30px 32px;">
            <div style="border-top:1px solid #e2e8f0;padding-top:16px;color:#94a3b8;font-size:11px;line-height:1.6;">
              This message was submitted from the BSS {esc(role)} portal. Reference {esc(msg.reference)}. Reply directly to this email to reach the sender at {esc(msg.email)}.
            </div>
          </td>
        </tr>
      </table>
      <div style="max-width:640px;margin:16px auto 0;color:#94a3b8;font-size:10px;text-align:center;">Bharat Shram Setu · Computer-generated email · Please do not forward sensitive worker data.</div>
    </td></tr>
  </table>
</body>
</html>"""

    text_body = (
        "Bharat Shram Setu — Support & Grievance\n"
        f"Reference: {msg.reference}\n"
        f"Subject: {msg.subject}\n\n"
        f"Submitted by: {msg.name}\n"
        f"Role: {role}\n"
        f"BSS ID: {msg.bss_id or '—'}\n"
        f"Email: {msg.email}\n"
        f"Phone: {msg.phone or '—'}\n"
        f"Category: {category}\n"
        f"Submitted: {created}\n\n"
        "Message:\n"
        f"{msg.message}\n\n"
        f"Reply directly to this email to reach {msg.name} at {msg.email}.\n"
    )
    return text_body, html_body


def _send_email(msg):
    recipients = [a.strip() for a in str(settings.BSS_CONTACT_TO_EMAIL or "").replace(";", ",").split(",")
                  if a.strip()]
    if not recipients:
        return False, "No recipient configured (BSS_CONTACT_TO_EMAIL)."
    if not settings.EMAIL_HOST:
        return False, "SMTP is not configured yet (BSS_SMTP_HOST)."
    cc = [a.strip() for a in str(getattr(settings, "BSS_CONTACT_CC_EMAIL", "") or "")
          .replace(";", ",").split(",") if a.strip()]
    role = _ROLE_LABELS.get(msg.role, "User")
    category = _CATEGORY_LABELS.get(msg.category, msg.category)
    subject = f"[BSS Grievance] {category} — {msg.subject} ({role} · {msg.reference})"
    text_body, html_body = _render_email(msg)
    email = EmailMultiAlternatives(
        subject=subject,
        body=text_body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=recipients,
        cc=cc or None,
        reply_to=[msg.email],
    )
    email.attach_alternative(html_body, "text/html")
    try:
        email.send(fail_silently=False)
    except Exception as exc:  # noqa: BLE001 — surface the reason on the row, never 500
        logger.warning("Contact email could not be sent for %s: %s", msg.reference, exc)
        return False, str(exc)[:500]
    return True, ""


def _client_ip(request):
    forwarded = (request.META.get("HTTP_X_FORWARDED_FOR") or "").split(",")[0].strip()
    return forwarded or request.META.get("REMOTE_ADDR") or None


@api_view(["POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([AllowAny])
def contact_message(request):
    """Store a support/grievance message and email a formatted copy."""
    body = request.data or {}
    user = request.user if getattr(request.user, "is_authenticated", False) else None
    name = _clean(body.get("name"), 120)
    role = _clean(body.get("role"), 20).lower()
    bss_id = _clean(body.get("bssId") or body.get("bss_id"), 40)
    email = _clean(body.get("email"), 254)
    phone = _clean(body.get("phone"), 20)
    category = _clean(body.get("category"), 20).lower()
    subject = _clean(body.get("subject"), 160)
    message = _clean(body.get("message"), 5000)

    if role not in _ROLES:
        role = user.role if user is not None and user.role in _ROLES else "worker"
    if category not in _CATEGORIES:
        category = "other"
    if len(name) < 2:
        return Response({"error": "Enter your full name."}, status=status.HTTP_400_BAD_REQUEST)
    if not email:
        return Response({"error": "Enter your email address so we can reply."},
                        status=status.HTTP_400_BAD_REQUEST)
    try:
        validate_email(email)
    except ValidationError:
        return Response({"error": "Enter a valid email address."},
                        status=status.HTTP_400_BAD_REQUEST)
    if len(subject) < 3:
        return Response({"error": "Add a short subject."}, status=status.HTTP_400_BAD_REQUEST)
    if len(message) < 10:
        return Response({"error": "Describe your grievance in at least 10 characters."},
                        status=status.HTTP_400_BAD_REQUEST)

    ip = _client_ip(request)
    rate_key = f"bss-contact:{ip or 'unknown'}"
    if (cache.get(rate_key) or 0) >= 5:
        return Response({"error": "Too many messages from this device. Please try again later."},
                        status=status.HTTP_429_TOO_MANY_REQUESTS)
    cache.set(rate_key, (cache.get(rate_key) or 0) + 1, 10 * 60)

    reference = _reference()
    while ContactMessage.objects.filter(reference=reference).exists():
        reference = _reference()

    msg = ContactMessage.objects.create(
        user=user, reference=reference, name=name, role=role, bss_id=bss_id,
        email=email, phone=phone, category=category, subject=subject,
        message=message, ip_address=ip,
        user_agent=(request.META.get("HTTP_USER_AGENT") or "")[:255],
    )
    sent, error = _send_email(msg)
    if sent:
        msg.emailed = True
        msg.save(update_fields=["emailed"])
    elif error:
        msg.email_error = error
        msg.save(update_fields=["email_error"])

    return Response({
        "success": True,
        "reference": msg.reference,
        "emailed": sent,
        "message": "Your message has been received. Our team will reply to your email.",
    }, status=status.HTTP_201_CREATED)


__all__ = ["contact_message"]
