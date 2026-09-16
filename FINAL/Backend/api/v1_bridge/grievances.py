"""Worker grievance creation, actions and attachment serving."""

# ruff: noqa: F401,F403
from .common import *  # noqa: F401,F403


def _grievance_can_access(user, grievance):
    """Worker owner, or the contractor/employer of the ticket (snapshot or binding)."""
    if user.role == "worker":
        return grievance.worker_id == user.id
    contractor, employer, _site = payloads._grievance_context(grievance)
    if user.role == "contractor":
        return contractor is not None and contractor.id == user.id
    if user.role == "employer":
        return employer is not None and employer.id == user.id
    return False


def _grievance_notify(grievance, actor, action):
    """Notify every other party (worker / contractor / employer) about an action."""
    worker, contractor, employer = (grievance.worker, *payloads._grievance_context(grievance)[:2])
    verb = _GRIEVANCE_ACTION_WORDS.get(action, action)
    body = f"{payloads._notification_actor_name(actor)} {verb} grievance {grievance.ticket_no}."
    seen = set()
    for party, link in ((worker, "/worker/grievances"), (contractor, "/contractor/grievances"),
                        (employer, "/employer/grievances")):
        if party is None or party.id == actor.id or party.id in seen:
            continue
        seen.add(party.id)
        _create_notification(user=party, title="Grievance update", body=body,
                             notif_type="INFO", link=link)


def _grievance_apply_action(user, grievance, action, data, attachment=None):
    """Apply a lifecycle action. Shared by every portal so the rules are identical.

    reply (all) · resolve (contractor/employer) · confirm (worker) · reopen (all) · view (all)."""
    from bss_core.models import GrievanceResponse

    action = str(action or "").strip().lower()
    now = timezone.now()
    if action in ("reply", "respond"):
        text = str(data.get("body") or "").strip()[:2000]
        if not text and attachment is None:
            raise PortalMutationError("Write a reply or attach a file before sending.", 400)
        response = GrievanceResponse(grievance=grievance, actor=user, actor_role=user.role, body=text)
        if attachment is not None:
            response.attachment.save(os.path.basename(attachment.name or "attachment"), attachment, save=False)
            response.attachment_file = response.attachment.name
        response.save()
        if grievance.status not in ("RESOLVED", "CLOSED"):
            grievance.status = "IN_PROGRESS"
            grievance.save(update_fields=["status", "updated_at"])
    elif action == "resolve":
        if user.role == "worker":
            raise PortalMutationError("Only the contractor or principal employer can mark a grievance resolved.", 403)
        grievance.status = "RESOLVED"
        grievance.resolved_at = now
        grievance.resolution_confirmed = False
        grievance.save(update_fields=["status", "resolved_at", "resolution_confirmed", "updated_at"])
    elif action == "confirm":
        if user.role != "worker":
            raise PortalMutationError("Only the worker confirms resolution.", 403)
        if grievance.status != "RESOLVED":
            raise PortalMutationError("This grievance is not awaiting your confirmation.", 400)
        grievance.status = "CLOSED"
        grievance.resolution_confirmed = True
        grievance.confirmed_at = now
        grievance.save(update_fields=["status", "resolution_confirmed", "confirmed_at", "updated_at"])
    elif action == "reopen":
        if grievance.status not in ("RESOLVED", "CLOSED", "REOPENED"):
            raise PortalMutationError("Only a resolved or closed grievance can be reopened.", 400)
        grievance.status = "REOPENED"
        grievance.reopened_at = now
        grievance.resolution_confirmed = False
        grievance.save(update_fields=["status", "reopened_at", "resolution_confirmed", "updated_at"])
    elif action == "view":
        if grievance.status in ("RECORDED", "SUBMITTED"):
            grievance.status = "VIEWED_ON_DASHBOARD"
            grievance.save(update_fields=["status", "updated_at"])
    else:
        raise PortalMutationError("Unknown grievance action.", 400)
    _grievance_notify(grievance, user, action)
    return grievance


def _handle_grievance(user, body):
    """Contractor / employer action via the portal resource (JSON, no attachment)."""
    from bss_core.models import WorkerGrievance

    grievance = WorkerGrievance.objects.filter(pk=body.get("id")).first()
    if grievance is None:
        raise PortalMutationError("Grievance not found.", 404)
    if not _grievance_can_access(user, grievance):
        raise PortalMutationError("This grievance is not linked to your account.", 403)
    action = body.get("action") or ("reply" if body.get("body") else "")
    _grievance_apply_action(user, grievance, action, body)
    return payloads._grievance_row(grievance)


def _handle_grievance_worker(user, body):
    """Worker action on their own grievance via the portal resource (JSON)."""
    from bss_core.models import WorkerGrievance

    grievance = WorkerGrievance.objects.filter(pk=body.get("id"), worker=user).first()
    if grievance is None:
        raise PortalMutationError("Grievance not found.", 404)
    action = body.get("action") or ("reply" if body.get("body") else "")
    _grievance_apply_action(user, grievance, action, body)
    return payloads._grievance_row(grievance)


@api_view(["GET", "POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def worker_grievances(request):
    """Worker grievance register — GET lists tickets; POST files a new one
    (multipart: body/category/language + optional audio recording + attachment)."""
    from bss_core.models import WorkerGrievance
    user = request.user
    if user.role != "worker":
        return Response({"error": "Only workers can manage grievances."},
                        status=status.HTTP_403_FORBIDDEN)
    if request.method == "GET":
        gs = WorkerGrievance.objects.filter(worker=user).order_by("-created_at")
        return Response({"data": [payloads._grievance_row(g) for g in gs]}, status=status.HTTP_200_OK)

    body = request.data or {}
    category = str(body.get("category") or "OTHER").strip().upper()
    if category not in dict(WorkerGrievance.CATEGORY):
        category = "OTHER"
    text = str(body.get("body") or "").strip()[:1000]
    language = str(body.get("language") or "").strip()[:40]
    audio = request.FILES.get("audio")
    attachment = request.FILES.get("attachment")
    if not text and not audio and attachment is None:
        return Response({"error": "Describe your concern, record audio or attach a file."},
                        status=status.HTTP_400_BAD_REQUEST)
    # Snapshot the parties so contractor/employer keep the audit view after unbind.
    binding = (WorkerContractorBinding.objects.filter(worker=user, binding_status="ACCEPTED")
               .select_related("contractor", "site", "site__employer").first())
    employer = binding.site.employer if binding and binding.site else None
    g = WorkerGrievance(
        worker=user, category=category, language=language, body=text,
        status="SUBMITTED", submitted_at=timezone.now(),
        assigned_to=binding.contractor if binding else None,
        contractor=binding.contractor if binding else None,
        employer=employer,
    )
    try:
        if body.get("duration") is not None:
            g.recording_duration_secs = int(body.get("duration"))
    except (TypeError, ValueError):
        pass
    if audio:
        g.audio.save(os.path.basename(audio.name or "recording.webm"), audio, save=False)
        g.recording_file = g.audio.name
    if attachment is not None:
        g.attachment.save(os.path.basename(attachment.name or "attachment"), attachment, save=False)
        g.attachment_file = g.attachment.name
    g.save()
    _grievance_notify(g, user, "submit")
    return Response({"data": payloads._grievance_row(g)}, status=status.HTTP_201_CREATED)


@api_view(["POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def grievance_action(request, grievance_id):
    """Reply / resolve / confirm / reopen / view a grievance (any role, multipart
    so replies may carry an attachment)."""
    from bss_core.models import WorkerGrievance

    grievance = WorkerGrievance.objects.filter(pk=grievance_id).first()
    if grievance is None:
        return Response({"error": "Grievance not found."}, status=status.HTTP_404_NOT_FOUND)
    if not _grievance_can_access(request.user, grievance):
        return Response({"error": "This grievance is not linked to your account."},
                        status=status.HTTP_403_FORBIDDEN)
    body = request.data or {}
    action = body.get("action") or ("reply" if body.get("body") else "")
    attachment = request.FILES.get("attachment")
    try:
        _grievance_apply_action(request.user, grievance, action, body, attachment)
    except PortalMutationError as exc:
        return Response({"error": exc.message}, status=exc.status_code)
    return Response({"data": payloads._grievance_row(grievance)}, status=status.HTTP_200_OK)


@api_view(["POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def grievance_file_token(request, grievance_id):
    """Issue a single-use, 5-minute token to read a grievance file once."""
    import hashlib
    import secrets
    from bss_core.models import GrievanceFileToken, GrievanceResponse, WorkerGrievance

    g = WorkerGrievance.objects.filter(pk=grievance_id).first()
    if g is None:
        return Response({"error": "Grievance not found."}, status=status.HTTP_404_NOT_FOUND)
    if not _grievance_can_access(request.user, g):
        return Response({"error": "This grievance is not linked to your account."},
                        status=status.HTTP_403_FORBIDDEN)
    kind = str(request.data.get("kind") or "").strip().lower()
    if kind not in ("audio", "attachment"):
        return Response({"error": "kind must be audio or attachment."},
                        status=status.HTTP_400_BAD_REQUEST)
    response_obj = None
    if kind == "audio":
        if not g.audio:
            return Response({"error": "No audio on this grievance."}, status=status.HTTP_404_NOT_FOUND)
    else:
        rid = request.data.get("responseId")
        if rid:
            response_obj = GrievanceResponse.objects.filter(pk=rid, grievance=g).first()
            if response_obj is None or not response_obj.attachment:
                return Response({"error": "Attachment not found."}, status=status.HTTP_404_NOT_FOUND)
        elif not g.attachment:
            return Response({"error": "No attachment on this grievance."}, status=status.HTTP_404_NOT_FOUND)
    raw = secrets.token_urlsafe(32)
    token = GrievanceFileToken.objects.create(
        grievance=g, response=response_obj, kind=kind, issued_by=request.user,
        token_hash=hashlib.sha256(raw.encode()).hexdigest(),
        expires_at=timezone.now() + timedelta(minutes=5),
    )
    return Response({"token": raw, "expiresAt": payloads._dts(token.expires_at)},
                    status=status.HTTP_200_OK)


@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def grievance_file_serve(request, token):
    """Exchange a single-use grievance file token → stream the file once."""
    import hashlib
    import mimetypes
    from bss_core.models import GrievanceFileToken

    hashed = hashlib.sha256(str(token).encode()).hexdigest()
    tok = (GrievanceFileToken.objects.filter(token_hash=hashed)
           .select_related("grievance", "response").first())
    if tok is None:
        return Response({"error": "Unknown or invalid link."}, status=status.HTTP_404_NOT_FOUND)
    if not tok.is_valid:
        return Response({"error": "This link has expired or was already used."},
                        status=status.HTTP_410_GONE)
    g = tok.grievance
    if tok.kind == "audio":
        file_obj = g.audio
        filename = os.path.basename(g.audio.name) if g.audio else "recording"
    else:
        src = tok.response if tok.response_id else g
        file_obj = src.attachment
        filename = os.path.basename(file_obj.name) if file_obj else "attachment"
    if not file_obj:
        return Response({"error": "File is unavailable."}, status=status.HTTP_404_NOT_FOUND)
    # Consume the token before streaming — single use.
    tok.used_at = timezone.now()
    tok.save(update_fields=["used_at"])
    try:
        response = FileResponse(file_obj.open("rb"), as_attachment=False, filename=filename)
    except Exception:
        return Response({"error": "File is unavailable."}, status=status.HTTP_404_NOT_FOUND)
    response["Content-Type"] = mimetypes.guess_type(filename)[0] or "application/octet-stream"
    response["X-Content-Type-Options"] = "nosniff"
    return response


__all__ = [
    "_grievance_apply_action",
    "_grievance_can_access",
    "_grievance_notify",
    "_handle_grievance",
    "_handle_grievance_worker",
    "grievance_action",
    "grievance_file_serve",
    "grievance_file_token",
    "worker_grievances",
]
