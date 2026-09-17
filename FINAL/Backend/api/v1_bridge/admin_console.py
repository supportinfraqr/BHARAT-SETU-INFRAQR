"""BSS Admin console — the real Activity Report (AuditLog) and Permission Page
(per-user module grants)."""

# ruff: noqa: F401,F403
from .common import *

_ACTION_LABEL = {"CREATE": "Create", "UPDATE": "Update", "DELETE": "Delete",
                 "APPROVE": "Approve", "REJECT": "Reject", "READ": "View",
                 "LOGIN": "Login", "LOGOUT": "Logout", "DOWNLOAD": "Download"}


def _display_name(user):
    """A human name for a user across roles (profile-aware)."""
    worker = getattr(user, "worker_identity", None)
    if worker and worker.name:
        return worker.name
    cp = getattr(user, "contractor_profile", None)
    if cp and (cp.contractor_name or cp.trade_name):
        return cp.contractor_name or cp.trade_name
    ep = getattr(user, "employer_profile", None)
    if ep and ep.employer_name:
        return ep.employer_name
    return user.username


def _org_name(user):
    cp = getattr(user, "contractor_profile", None)
    if cp:
        return payloads._d(cp.contractor_name or cp.trade_name)
    ep = getattr(user, "employer_profile", None)
    if ep:
        return payloads._d(ep.employer_name)
    return "Bharat Shram Setu"


def _audit_row(log):
    after = log.after if isinstance(log.after, dict) else {}
    details = after.get("summary") or after.get("note") or ""
    if not details:
        details = ", ".join(f"{k}={after[k]}" for k in list(after)[:4])[:240]
    return {
        "id": str(log.id),
        "timestamp": payloads._dts(log.created_at),
        "actor": payloads._d(log.actor.username if log.actor_id else ""),
        "role": PORTAL_ROLE.get(log.actor_role, log.actor_role) or "",
        "action": _ACTION_LABEL.get(log.action, str(log.action).title()),
        "module": payloads._d(log.entity_type),
        "entity": payloads._d(log.entity_type),
        "entityId": payloads._d(log.entity_id),
        "status": "Success",
        "details": details,
    }


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def admin_activity(request):
    """System-wide audit trail (filters: role, action, from, to)."""
    from bss_core.models import AuditLog
    if request.user.role != "bss_admin":
        return Response({"error": "BSS Admin only."}, status=status.HTTP_403_FORBIDDEN)

    qs = AuditLog.objects.select_related("actor").order_by("-created_at")
    role = (request.query_params.get("role") or "").strip()
    action = (request.query_params.get("action") or "").strip()
    date_from = (request.query_params.get("from") or "").strip()
    date_to = (request.query_params.get("to") or "").strip()
    if role:
        qs = qs.filter(actor_role__iexact=role)
    if action:
        qs = qs.filter(action__iexact=action)
    if date_from:
        qs = qs.filter(created_at__date__gte=date_from)
    if date_to:
        qs = qs.filter(created_at__date__lte=date_to)

    rows = [_audit_row(log) for log in qs[:500]]
    roles = sorted({PORTAL_ROLE.get(r, r) or r
                    for r in AuditLog.objects.values_list("actor_role", flat=True).distinct()})
    actions = sorted({_ACTION_LABEL.get(a, str(a).title())
                      for a in AuditLog.objects.values_list("action", flat=True).distinct()})
    return Response({"rows": rows, "roles": roles, "actions": actions, "total": qs.count()},
                    status=status.HTTP_200_OK)


@api_view(["GET", "POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def admin_permissions(request):
    """Per-user module → action grants (the Permission Page)."""
    from bss_core.models import User, UserMenuPermission
    if request.user.role != "bss_admin":
        return Response({"error": "BSS Admin only."}, status=status.HTTP_403_FORBIDDEN)

    if request.method == "GET":
        users = []
        qs = (User.objects
              .filter(role__in=["worker", "contractor", "employer", "bss_staff", "bss_admin"])
              .order_by("id")[:300])
        stored = {p.user_id: (p.permissions or {})
                  for p in UserMenuPermission.objects.filter(user__in=qs)}
        for user in qs:
            users.append({
                "id": user.id,
                "username": user.username,
                "name": payloads._d(_display_name(user)),
                "partyType": PORTAL_ROLE.get(user.role, user.role),
                "partyName": payloads._d(_org_name(user)),
                "status": "Active" if user.account_active else "Inactive",
                "permissions": stored.get(user.id, {}),
            })
        return Response({"users": users}, status=status.HTTP_200_OK)

    body = request.data if isinstance(request.data, dict) else {}
    user = User.objects.filter(pk=body.get("userId")).first()
    permissions = body.get("permissions")
    if user is None or not isinstance(permissions, dict):
        return Response({"error": "userId and a permissions object are required."},
                        status=status.HTTP_400_BAD_REQUEST)
    clean = {str(module)[:60]: [str(a)[:40] for a in (actions or []) if isinstance(actions, list)]
             for module, actions in permissions.items()}
    UserMenuPermission.objects.update_or_create(user=user, defaults={"permissions": clean})
    log_audit(request.user, "UPDATE", "menu_permission", user.id,
              after={"summary": f"Updated permissions for {user.username}"})
    return Response({"userId": user.id, "permissions": clean}, status=status.HTTP_200_OK)


__all__ = ["admin_activity", "admin_permissions", "log_audit"]


def log_audit(actor, action, entity_type, entity_id="", after=None, before=None):
    """Append one row to the system audit trail (never raises to the caller)."""
    from bss_core.models import AuditLog
    try:
        AuditLog.objects.create(
            actor=actor if getattr(actor, "pk", None) else None,
            actor_role=getattr(actor, "role", "") or "",
            action=str(action or "UPDATE")[:20],
            entity_type=str(entity_type or "")[:80],
            entity_id=str(entity_id or "")[:40],
            after=after if isinstance(after, dict) else {},
            before=before if isinstance(before, dict) else {},
        )
    except Exception:  # noqa: BLE001 — auditing must never break a mutation
        pass
