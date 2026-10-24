"""Compliance submissions, review and file download endpoints."""

# ruff: noqa: F401,F403
from .common import *  # noqa: F401,F403
from .bindings import *  # noqa: F401,F403


@api_view(["POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def worker_submissions(request):
    return _submissions(request)


@api_view(["POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def contractor_submissions(request):
    return _submissions(request)


@api_view(["POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def worker_verify_document(request):
    """Verify an uploaded PAN/UAN/ESIC/Aadhaar document via OCR + keyword match.

    Multipart fields: file, docType (aadhaar|pan|uan|esic), number, name.
    Ported from the EesassinErp WorkerController.cs VerifyDoc logic. On success
    the matched number is persisted to the worker's record. This is an OCR
    keyword match, not a DigiLocker fetch, so it never sets the "Verified"
    badge (only DigiLocker-sourced PAN does).
    """
    user = request.user
    file_obj = request.FILES.get("file")
    doc_type = (request.data.get("docType") or "").strip().lower()
    number = (request.data.get("number") or "").strip()
    name = (request.data.get("name") or "").strip()

    if not file_obj:
        return Response({"error": "Choose a document to verify."}, status=status.HTTP_400_BAD_REQUEST)
    if doc_type not in ("aadhaar", "pan", "uan", "esic"):
        return Response({"error": "Unsupported document type."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        text = ocr_client.extract_text(file_obj.read(), file_obj.name)
    except ocr_client.OcrError as exc:
        return Response({"error": str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    ok, message = ocr_client.verify_document_text(doc_type, text, expected_number=number, expected_name=name)
    if not ok:
        return Response({"verified": False, "docType": doc_type, "message": message},
                        status=status.HTTP_200_OK)

    # Auto-read fields from the OCR text so the UI can offer a pre-fill
    # (name / DOB / gender / number / address) from the uploaded card.
    fields = ocr_client.extract_fields(doc_type, text)

    # Persist the verified number.
    if doc_type in ("aadhaar", "pan"):
        identity = WorkerIdentity.objects.filter(user=user).first()
        if identity is None:
            identity = WorkerIdentity.objects.create(
                user=user, bss_worker_id=bss_ids.new_bss_worker_id(),
                qr_token=uuid.uuid4().hex + uuid.uuid4().hex[:8],
                name=user.get_full_name() or "")
        if number:
            # A DigiLocker-verified PAN is authoritative and locked; OCR must not
            # overwrite it (and never marks a manual PAN as DigiLocker-verified).
            if not (doc_type == "pan" and identity.pan_verified):
                setattr(identity, "aadhaar" if doc_type == "aadhaar" else "pan", number)
        identity.save()
    else:  # uan / esic
        ss, _ = WorkerSocialSecurity.objects.get_or_create(user=user)
        if number:
            setattr(ss, "epfo_uan" if doc_type == "uan" else "esic_ip_number", number)
        ss.save()

    return Response({"verified": True, "docType": doc_type, "message": message,
                     "fields": fields},
                    status=status.HTTP_200_OK)


def _submissions(request):
    file_obj = request.FILES.get("file")
    ftype = (request.data.get("type") or "").strip()
    site = (request.data.get("site") or "").strip()
    period = (request.data.get("period") or "").strip()
    employer = (request.data.get("employer") or "").strip()
    state = (request.data.get("state") or "").strip()
    financial_year = (request.data.get("financialYear") or request.data.get("financial_year") or "").strip()
    month = (request.data.get("month") or "").strip()
    # Calendar year used in the OCR-checkpoint context (derived when the client
    # only sends a financial year / period, e.g. "FY 2026-27" or "Jul 2026").
    year = (request.data.get("year") or "").strip()
    if not year:
        _digits = "".join(ch for ch in (financial_year or period) if ch.isdigit())
        year = _digits[:4] if len(_digits) >= 4 else ""
    location = (request.data.get("location") or "").strip()
    document_type = (request.data.get("documentType") or request.data.get("document_type") or "").strip()
    frequency = (request.data.get("frequency") or "").strip()
    is_mandatory = str(request.data.get("mandatory") or "").strip().lower() in ("1", "true", "yes", "on")
    # Additional / principal-employer forms are evidence records — OCR does not
    # apply (the document has no expected statutory text), so the caller can ask
    # to skip OCR and just store the file.
    no_ocr = str(request.data.get("noOcr") or request.data.get("no_ocr") or "").strip().lower() in ("1", "true", "yes", "on")
    user = request.user

    checksum = ""
    confidence = None
    ai_status = ""
    findings = []
    checkpoint_results = []
    checkpoints = []
    required_format = (request.data.get("requiredFormat") or request.data.get("required_format") or "").strip()
    if file_obj:
        checksum = payloads.sha256_checksum(file_obj)
    # When the caller asks to skip OCR (additional forms — the client runs the AI
    # audit as a separate, dedicated call), only persist the file here. Running
    # OCR + the AI audit inline made this call exceed the proxy timeout on real
    # PDFs and surfaced as "The BSS service timed out".
    if file_obj and not no_ocr:
        from bss_core.models import CustomFormName, RegisterTemplate

        from . import ai_audit
        # A document can carry an AI audit checklist: additional forms from the
        # form name (CustomFormName), manual CLRA register uploads from the
        # register template (RegisterTemplate). Registers are additionally
        # verified against the template columns. OCR is only a text source for
        # the AI — never the verdict.
        form_key = (document_type or ftype).strip()
        form_name = form_key
        form = None
        template = None
        if form_key:
            form = (CustomFormName.objects.filter(is_active=True, name__iexact=form_key)
                    .filter(Q(state__iexact=state) | Q(state="")).first())
            if form and form.ai_checks:
                checkpoints = list(form.ai_checks)
                form_name = form.name
            else:
                template = (RegisterTemplate.objects.filter(is_active=True)
                            .filter(Q(form_code__iexact=form_key) | Q(title__iexact=form_key)).first())
                if template is None:
                    # Manual register uploads send "<form code> — <title>".
                    code = form_key.replace("\u2014", "-").split(" - ")[0].strip()
                    template = RegisterTemplate.objects.filter(is_active=True, form_code__iexact=code).first()
                if template:
                    if template.ai_checks:
                        checkpoints = list(template.ai_checks)
                    form_name = template.title or template.form_code

        text = ""
        try:
            file_obj.seek(0)
            text = ai_audit._extract_text(file_obj.read(), file_obj.name)
        except Exception:  # noqa: BLE001
            text = ""
        finally:
            try:
                file_obj.seek(0)
            except (AttributeError, OSError):
                pass
        if text.startswith("__EXTRACT_ERROR__"):
            text = ""

        is_register = template is not None
        extra = {
            "docKind": "register" if is_register else "",
            "templateTitle": (template.title if is_register else form_name),
            "templateColumns": list(template.columns or []) if is_register else [],
            "fieldMappings": [{"column": m.column, "fieldKey": m.field_key}
                              for m in template.field_mappings.all()] if is_register else [],
            "period": f"{month} {year}".strip() or period,
            "state": state,
            "aiChecks": checkpoints,
        }
        audit = ai_audit._run_ai_audit(form_name, text, required_format, site, extra)
        ai_status = str(audit.get("status") or "")
        if isinstance(audit.get("confidence"), (int, float)):
            confidence = audit["confidence"]
        checkpoint_results = audit.get("checkpointResults") or []
        collected = []
        if audit.get("summary"):
            collected.append(str(audit["summary"]))
        collected += [str(x) for x in (audit.get("findings") or [])]
        collected += [f"Issue: {x}" for x in (audit.get("issues") or [])]
        collected += [f"Missing: {x}" for x in (audit.get("missing") or [])]
        if ai_status == "unavailable" and audit.get("message"):
            collected = [str(audit["message"])]
        findings = collected

    submission_id = (request.data.get("submissionId") or "").strip()
    if submission_id:
        original = SubmissionEvidence.objects.filter(pk=submission_id, user_id=user.id).first()
        if original is None:
            return Response({"error": "submission not found"}, status=status.HTTP_404_NOT_FOUND)
        if str(original.status).upper() in ("RETURNED", "REJECTED"):
            return Response({"error": "Rejected submissions cannot be re-uploaded. Please submit a new compliance document."},
                            status=status.HTTP_400_BAD_REQUEST)
    role_value = "worker" if user.role == "worker" else "contractor"
    if submission_id:
        submission = original
    else:
        # Re-uploading the same document type for the same site + period replaces
        # the existing pending submission instead of creating a duplicate.
        submission = (SubmissionEvidence.objects
                      .filter(user=user, doc_type=ftype, site=site, period=period)
                      .exclude(status__in=("RETURNED", "REJECTED"))
                      .order_by("-created_at").first())
        if submission is None:
            submission = SubmissionEvidence(user=user, role=role_value, doc_type=ftype)
    submission.role = role_value
    submission.site = site
    submission.period = period
    submission.employer = employer
    submission.state = state[:60]
    submission.financial_year = financial_year[:12]
    submission.month = month[:20]
    submission.location = location[:120]
    submission.document_type = document_type[:40]
    submission.frequency = frequency[:40]
    submission.is_mandatory = is_mandatory
    submission.original_name = file_obj.name if file_obj else ""
    submission.file_size = file_obj.size if file_obj else 0
    submission.mime_type = file_obj.content_type if file_obj else ""
    submission.checksum_sha256 = checksum
    submission.ocr_accuracy = confidence
    submission.ai_status = ai_status
    submission.validation_findings = findings
    submission.checkpoint_results = checkpoint_results
    submission.status = "PENDING"
    if file_obj:
        safe_name = os.path.basename(file_obj.name or "evidence")
        submission.file.save(safe_name, file_obj, save=False)
    submission.save()

    return Response({
        "data": {
            "id": submission.id, "type": ftype, "employer": employer,
            "site": site, "period": period, "status": "PENDING",
            "state": state, "financialYear": financial_year, "month": month,
            "location": location, "documentType": document_type,
            "frequency": frequency, "mandatory": is_mandatory,
            "submittedAt": payloads._dts(timezone.now()),
            "fileName": submission.original_name, "checksum": checksum,
            "accuracy": confidence,
            "aiStatus": ai_status,
            "noOcr": no_ocr,
            "checkpoints": checkpoint_results,
            "requiredChecks": checkpoints,
            "validated": ai_status == "passed",
            "findings": findings,
        }
    }, status=status.HTTP_201_CREATED)


@api_view(["POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def submission_file_token(request, role_path, submission_id):
    """Issue a single-use, 5-minute token to view submission evidence inline in a new tab."""
    _require_permission(request, "compliance")
    import hashlib
    import secrets
    from bss_core.models import DocumentAccessToken

    submission = SubmissionEvidence.objects.filter(pk=submission_id).first()
    if submission is None:
        return Response({"error": "submission not found"}, status=status.HTTP_404_NOT_FOUND)

    user = request.user
    allowed = False
    if user.is_superuser or user.role in ("government", "bss_staff", "admin"):
        allowed = True
    elif submission.user_id == user.id:
        allowed = True
    elif user.role == "employer":
        from bss_core.models import Site, ContractorEmployerBinding
        my_sites = set(Site.objects.filter(employer=user).values_list("site_name", flat=True))
        cids = set(ContractorEmployerBinding.objects.filter(employer=user, binding_status="ACCEPTED").values_list("contractor_id", flat=True))
        allowed = (submission.user_id in cids) or (bool(submission.site) and submission.site in my_sites)
    if not allowed:
        return Response({"error": "not authorized"}, status=status.HTTP_403_FORBIDDEN)
    if not submission.file:
        return Response({"error": "file missing"}, status=status.HTTP_404_NOT_FOUND)

    raw = secrets.token_urlsafe(32)
    token = DocumentAccessToken.objects.create(
        token_type="SUBMISSION_VIEW", requester=user, submission=submission,
        token_hash=hashlib.sha256(raw.encode()).hexdigest(),
        expires_at=timezone.now() + timedelta(minutes=5), max_uses=1,
    )
    return Response({
        "token": raw, "expiresAt": payloads._dts(token.expires_at),
        "fileName": submission.original_name,
    }, status=status.HTTP_200_OK)


@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def submission_file_serve(request, token):
    """Exchange a single-use submission-view token → stream the evidence inline."""
    import hashlib
    from bss_core.models import DocumentAccessToken

    hashed = hashlib.sha256(str(token).encode()).hexdigest()
    tok = (DocumentAccessToken.objects.filter(token_hash=hashed, token_type="SUBMISSION_VIEW")
           .select_related("submission").first())
    if tok is None:
        return Response({"error": "Unknown or invalid link."}, status=status.HTTP_404_NOT_FOUND)
    if not tok.is_valid:
        return Response({"error": "This link has expired or was already used."},
                        status=status.HTTP_410_GONE)
    submission = tok.submission
    if submission is None or not submission.file:
        return Response({"error": "File is unavailable."}, status=status.HTTP_404_NOT_FOUND)
    tok.used_at = timezone.now()
    tok.use_count += 1
    if tok.use_count >= tok.max_uses:
        tok.status = "USED"
    tok.save(update_fields=["used_at", "use_count", "status"])
    try:
        response = FileResponse(submission.file.open("rb"), as_attachment=False,
                                filename=submission.original_name or os.path.basename(submission.file.name))
    except Exception:
        return Response({"error": "Stored file is unavailable."}, status=status.HTTP_404_NOT_FOUND)
    response["Content-Type"] = submission.mime_type or "application/octet-stream"
    response["X-Content-Type-Options"] = "nosniff"
    response["Cache-Control"] = "private, no-store, max-age=0"
    response["Content-Security-Policy"] = "default-src 'none'; sandbox"
    return response


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def submission_file_download(request, role_path, submission_id):
    _require_permission(request, "compliance")
    submission = SubmissionEvidence.objects.filter(pk=submission_id).first()
    if submission is None:
        return Response({"error": "submission not found"}, status=status.HTTP_404_NOT_FOUND)

    user = request.user
    allowed = False
    if user.is_superuser or user.role in ("government", "bss_staff", "admin"):
        allowed = True
    elif submission.user_id == user.id:
        allowed = True
    elif user.role == "employer":
        from bss_core.models import Site, ContractorEmployerBinding
        my_sites = set(Site.objects.filter(employer=user).values_list("site_name", flat=True))
        cids = set(ContractorEmployerBinding.objects.filter(employer=user, binding_status="ACCEPTED").values_list("contractor_id", flat=True))
        allowed = (submission.user_id in cids) or (bool(submission.site) and submission.site in my_sites)
    if not allowed:
        return Response({"error": "not authorized"}, status=status.HTTP_403_FORBIDDEN)

    if not submission.file:
        return Response({"error": "file missing"}, status=status.HTTP_404_NOT_FOUND)
    return FileResponse(
        submission.file.open("rb"),
        as_attachment=False,
        filename=submission.original_name or f"evidence-{submission.id}",
    )


def _handle_submission_review(user, body):
    """Employer marks a connected contractor/worker evidence submission — or a
    contractor CLRA register submission (ComplianceBatch) — Verified or Rejected."""
    if user.role != "employer":
        raise PortalMutationError("Only employers can review submissions.", 403)
    raw_id = str(body.get("id") or "").strip()
    decision = str(body.get("status") or "").strip().upper()
    if not raw_id.startswith("pkg-"):
        raise PortalMutationError("Approve or reject the whole submission package.", 403)

    if raw_id.startswith("batch-"):
        from bss_core.models import ComplianceBatch
        batch = (ComplianceBatch.objects.filter(pk=raw_id.split("-", 1)[1],
                                                site__employer=user).first())
        if batch is None:
            raise PortalMutationError("Submission not found.", 404)
        if decision == "VERIFIED":
            batch.status = "VERIFIED"
        elif decision in ("REJECTED", "RETURNED"):
            batch.status = "RETURNED"
        else:
            raise PortalMutationError("Select a valid submission decision.", 422)
        batch.save(update_fields=["status", "updated_at"])
        return batch.id

    if raw_id.startswith("pkg-"):
        # One contractor + period: accept/reject the CLRA registers AND the
        # additional forms together, storing the employer's note on return.
        from django.db.models import Q

        from bss_core.models import ComplianceBatch
        parts = raw_id.split("-", 3)
        if len(parts) != 4:
            raise PortalMutationError("Submission not found.", 404)
        _, cid, year, month = parts
        note = str(body.get("note") or "").strip()[:500]
        batches = (ComplianceBatch.objects
                   .filter(contractor_id=cid, year=year, month=month, site__employer=user,
                           is_current=True))
        evidence = (SubmissionEvidence.objects
                    .filter(user_id=cid, month=month)
                    .filter(Q(financial_year__icontains=year) | Q(period__icontains=year)))
        if not batches.exists() and not evidence.exists():
            raise PortalMutationError("Submission not found.", 404)
        if decision == "VERIFIED":
            batches.update(status="VERIFIED", review_note="", updated_at=timezone.now())
            evidence.update(status="VERIFIED", review_note="")
        elif decision in ("REJECTED", "RETURNED"):
            batches.update(status="RETURNED", review_note=note, updated_at=timezone.now())
            evidence.update(status="RETURNED", review_note=note)
        else:
            raise PortalMutationError("Select a valid submission decision.", 422)
        return raw_id

    if raw_id.startswith("grp-"):
        # A grouped register submission: contractor + year + month across sites.
        from bss_core.models import ComplianceBatch
        parts = raw_id.split("-", 3)
        if len(parts) != 4:
            raise PortalMutationError("Submission not found.", 404)
        _, cid, year, month = parts
        batches = (ComplianceBatch.objects
                   .filter(contractor_id=cid, year=year, month=month, site__employer=user,
                           is_current=True))
        if not batches.exists():
            raise PortalMutationError("Submission not found.", 404)
        if decision == "VERIFIED":
            new_status = "VERIFIED"
        elif decision in ("REJECTED", "RETURNED"):
            new_status = "RETURNED"
        else:
            raise PortalMutationError("Select a valid submission decision.", 422)
        batches.update(status=new_status, updated_at=timezone.now())
        return raw_id

    submission = SubmissionEvidence.objects.filter(pk=raw_id).first()
    if submission is None:
        raise PortalMutationError("Submission not found.", 404)
    from bss_core.models import Site, ContractorEmployerBinding
    my_sites = set(Site.objects.filter(employer=user).values_list("site_name", flat=True))
    cids = set(ContractorEmployerBinding.objects.filter(employer=user, binding_status="ACCEPTED").values_list("contractor_id", flat=True))
    connected = (submission.user_id in cids) or (bool(submission.site) and submission.site in my_sites)
    if not connected:
        raise PortalMutationError("not authorized", 403)
    decision = str(body.get("status") or "").strip().upper()
    if decision == "VERIFIED":
        submission.status = "VERIFIED"
    elif decision in ("REJECTED", "RETURNED"):
        submission.status = "RETURNED"
    else:
        raise PortalMutationError("Select a valid submission decision.", 422)
    submission.save(update_fields=["status", "updated_at"])
    return submission.id


@api_view(["POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def contractor_compliance_batches(request):
    """Generate CLRA statutory registers from an uploaded master file.

    Multipart fields: master (CSV/XLSX), signature (optional), site, state,
    financialYear, month, year.
    """
    from django.core.files.base import ContentFile
    from bss_core.models import ComplianceBatch, RegisterDocumentMaster

    user = request.user
    if user.role != "contractor":
        return Response({"error": "Only contractors can generate registers."},
                        status=status.HTTP_403_FORBIDDEN)
    master = request.FILES.get("master")
    if master is None:
        return Response({"error": "Choose a master file."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        rows = clra.parse_master(master)
    except clra.MasterFileError as exc:
        return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    if not rows:
        return Response({"error": "No worker rows found in the master file."},
                        status=status.HTTP_400_BAD_REQUEST)

    # CLRA registers are generated per site, so one master file may carry many
    # sites. Split the rows by site (falling back to location), resolve and gate
    # every site first, then generate one batch per site — a bad site blocks the
    # whole run rather than leaving a half-finished set of batches.
    from collections import Counter

    from .register_templates import (applicable_templates, employer_adopted_ids,
                                     gate_templates_by_adoption)

    site_ids = _contractor_site_ids(user)

    groups: dict = {}
    for r in rows:
        label = str(r.get("site") or r.get("location") or "").strip()
        groups.setdefault(label, []).append(r)

    month = (request.data.get("month") or "").strip()
    year = (request.data.get("year") or "").strip()
    fy = (request.data.get("financialYear") or "").strip()
    if not fy and year.isdigit():
        fy = f"{year}-{str((int(year) + 1) % 100).zfill(2)}"

    # Future months cannot be generated — a register can only be produced for a
    # period that has already begun.
    if period_in_future(month, year, fy):
        return Response(
            {"error": f"{month or 'That period'} {year} is a future period — CLRA registers "
                      f"can only be generated for months that have already started."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    registers = [
        {"name": m.document_name, "formNo": m.form_number, "frequency": m.frequency}
        for m in RegisterDocumentMaster.objects.filter(kind="register", is_active=True)
        .order_by("sort_order")
    ]

    # Frequency-aware: only generate forms due in the chosen month (monthly always;
    # quarterly/half-yearly/yearly at their period end) unless the caller overrides.
    include_non_due = str(request.data.get("includeNonDue") or "").lower() in ("1", "true", "yes")

    # Optional frequency filter: when the caller picks Quarterly / Half Yearly /
    # Yearly, generate only forms of that frequency for the chosen period.
    def _norm_freq(value):
        text = str(value or "").strip().lower()
        if text.startswith("quarter"):
            return "quarterly"
        if text.startswith("half"):
            return "half"
        if text.startswith(("year", "annual")):
            return "yearly"
        if text.startswith("month"):
            return "monthly"
        return ""

    freq_filter = _norm_freq(request.data.get("frequency"))

    # Pre-flight every site group. Any failure blocks the whole upload.
    plans, failures = [], []
    for label, group_rows in sorted(groups.items()):
        site = (Site.objects.filter(id__in=site_ids, site_name=label).first()
                or Site.objects.filter(id__in=site_ids, bss_site_id=label).first())
        if site is None:
            failures.append(f"Site \u201c{label or '(blank)'}\u201d is not one of your allotted sites.")
            continue
        state = (site.state or "").strip()
        if not state:
            candidates = [str(r.get("state") or "").strip() for r in group_rows if str(r.get("state") or "").strip()]
            state = Counter(candidates).most_common(1)[0][0] if candidates else ""
        if not state:
            failures.append(f"Site \u201c{site.site_name}\u201d has no state — cannot choose registers.")
            continue
        # Every BSS ID in this site's rows must be a worker bound to THIS
        # contractor at THIS site (not any worker, not another site).
        unlinked = _unlinked_bss_ids(user, site, group_rows)
        if unlinked:
            failures.append(f"{len(unlinked)} worker BSS ID(s) in the master for site "
                            f"\u201c{site.site_name}\u201d are not linked to you at that site "
                            f"(e.g., {', '.join(unlinked[:5])}).")
            continue
        # Only generate for a state where the principal employer has adopted the
        # CLRA register forms for its sites.
        adopted_ids = employer_adopted_ids(site.employer, state, site=site) if site.employer_id else set()
        if not adopted_ids:
            failures.append(f"The principal employer has not adopted CLRA register forms for {state} "
                            f"(site \u201c{site.site_name}\u201d).")
            continue
        site_templates = gate_templates_by_adoption(applicable_templates(state, site.jurisdiction)[0], site.employer, state, site=site)
        if freq_filter:
            site_templates = [t for t in site_templates if (_norm_freq(t.frequency) or "monthly") == freq_filter]
        selected, skipped = [], []
        for template in site_templates:
            period = clra.reporting_period(month, year, template.frequency)
            if period["due"] or include_non_due:
                selected.append(template)
            else:
                skipped.append({"formCode": template.form_code, "title": template.title,
                                "frequency": template.frequency or "Monthly", "period": period["label"]})
        if not selected:
            failures.append(f"No register template is due for {state} (site \u201c{site.site_name}\u201d) "
                            f"in {month} {year}.")
            continue
        # Version history: every regeneration of the same site + period creates a
        # new version. Older versions — even submitted/verified ones — are kept
        # for audit and marked non-current; the newest is the active version.
        existing = list(ComplianceBatch.objects
                        .filter(contractor=user, site=site, month=month[:20], year=year[:4]))
        next_version = (max((b.version or 1) for b in existing) + 1) if existing else 1
        plans.append({"site": site, "state": state, "rows": group_rows,
                      "templates": selected, "skipped": skipped, "supersede": existing,
                      "version": next_version})

    if failures:
        return Response({"error": " ".join(failures), "failures": failures},
                        status=status.HTTP_400_BAD_REQUEST)

    generated_on = timezone.localdate()
    signature = request.FILES.get("signature")
    # Embed a small signature image on every generated sheet, when one is given.
    signature_img = None
    if signature is not None:
        _ext = os.path.splitext(signature.name or "")[1].lstrip(".").lower()
        if _ext in ("png", "jpg", "jpeg", "webp", "gif"):
            try:
                signature.seek(0)
                _data = signature.read()
                signature_img = {"ext": _ext, "data": _data} if _data else None
            except Exception:  # noqa: BLE001
                signature_img = None
    created = []
    for plan in plans:
        site, state, group_rows = plan["site"], plan["state"], plan["rows"]
        templates = [
            {"id": t.id,
             "formCode": t.form_code, "title": t.title, "state": t.state,
             "frequency": t.frequency or "Monthly",
             "period": clra.reporting_period(month, year, t.frequency)["label"],
             "columns": list(t.columns or []), "html": t.html or "",
             "perRow": t.per_row,
             "act": t.act, "calculationRules": [
                 {"targetField": r.target_field, "formula": r.formula}
                 for r in t.calculation_rules.all()],
             "fieldMappings": {m.column: m.field_key for m in t.field_mappings.all()}}
            for t in plan["templates"]
        ]
        register_count = len(templates) or len(registers)
        data = clra.build_workbook(
            group_rows, contractor=payloads._party_name(user),
            employer=(payloads._party_name(site.employer) if site.employer_id else ""),
            site=site.site_name, site_bss_id=site.bss_site_id, state=state,
            financial_year=fy, month=month, year=year, registers=registers,
            generated_on=str(generated_on), templates=templates,
            signature=signature_img,
            **_letterhead_ctx(user, site, group_rows),
        )
        skipped = plan["skipped"]
        batch = ComplianceBatch(
            contractor=user, site=site,
            financial_year=fy[:12], month=month[:20], year=year[:4], state=state[:60],
            frequency=str(request.data.get("frequency") or "Monthly").strip()[:20] or "Monthly",
            employee_count=len(group_rows),
            location_count=len({r.get("location", "") for r in group_rows if r.get("location")}) or 1,
            generated_on=generated_on, generated_by=payloads._party_name(user),
            rows_count=len(group_rows),
            notes=(f"{register_count} register(s) generated from {len(group_rows)} worker row(s)"
                   + (f"; {len(skipped)} not due this period: "
                      + ", ".join(f"{s['formCode']} ({s['frequency']})" for s in skipped[:6]) if skipped else "")),
            status="GENERATED",
            version=plan.get("version", 1),
            is_current=True,
        )
        stamp = f"{year or generated_on.year}-{month or generated_on.strftime('%b')}".replace(" ", "")
        batch.generated_file.save(
            f"clra-{stamp}-{site.bss_site_id or 'site'}.xlsx", ContentFile(data), save=False)
        master.seek(0)
        batch.master_file.save(os.path.basename(master.name or "master.xlsx"), master, save=False)
        if signature is not None:
            signature.seek(0)
            batch.signature_file.save(os.path.basename(signature.name or "signature"), signature, save=False)
        batch.save()
        # Keep the previous versions as history: mark them non-current and chain
        # them forward. Their original status is preserved for the audit trail.
        for old in plan.get("supersede", []):
            old.is_current = False
            fields = ["is_current", "updated_at"]
            if old.superseded_by_id is None:
                old.superseded_by = batch
                fields.append("superseded_by")
            old.save(update_fields=fields)
        created.append(payloads._contractor_compliance_batch_row(batch))
        _schedule_register_audits(
            batch.id, templates, group_rows, site.site_name, site.bss_site_id, state,
            month, year, fy, payloads._party_name(user),
            (payloads._org_name(site.employer) if site.employer_id else ""),
            str(generated_on))

    return Response({"data": created}, status=status.HTTP_201_CREATED)


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def compliance_batch_download(request, role_path, batch_id):
    _require_permission(request, "compliance")
    from bss_core.models import ComplianceBatch
    batch = ComplianceBatch.objects.filter(pk=batch_id).first()
    if batch is None:
        return Response({"error": "batch not found"}, status=status.HTTP_404_NOT_FOUND)
    user = request.user
    allowed = (user.is_superuser
               or user.role in ("government", "bss_staff", "admin", "employer")
               or batch.contractor_id == user.id)
    if not allowed:
        return Response({"error": "not authorized"}, status=status.HTTP_403_FORBIDDEN)
    if not batch.generated_file:
        return Response({"error": "No generated file for this batch."},
                        status=status.HTTP_404_NOT_FOUND)
    return FileResponse(batch.generated_file.open("rb"), as_attachment=True,
                        filename=os.path.basename(batch.generated_file.name))


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def contractor_compliance_batches_zip(request):
    """Bundle every document a generated CLRA batch owns — the generated register
    workbook, the source master file and the signature — into one ZIP (per batch
    folder when several batches are included)."""
    import io
    import zipfile

    from django.http import HttpResponse

    from bss_core.models import ComplianceBatch

    user = request.user
    batch_id = request.query_params.get("batchId")
    site = request.query_params.get("site")
    year = request.query_params.get("year")
    period = request.query_params.get("period")

    qs = ComplianceBatch.objects.filter(contractor=user)
    if batch_id:
        qs = qs.filter(pk=batch_id)
    if site and site != "all":
        qs = qs.filter(site=site)
    if year:
        fy_key = year.replace("FY ", "")
        qs = qs.filter(financial_year=fy_key)
    if period:
        # Filter by month matching period
        period_clean = period.split()[0] if " " in period else period
        qs = qs.filter(month__iexact=period_clean)

    qs = qs.exclude(generated_file="").order_by("-year", "-id")
    if not qs.exists():
        return Response({"error": "No generated register files to download yet."},
                        status=status.HTTP_404_NOT_FOUND)

    buf = io.BytesIO()
    count = 0
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as archive:
        for batch in qs:
            folder = (f"{batch.state or 'state'}_{batch.month or ''}_{batch.year or ''}"
                      f"_batch{batch.id}").replace(" ", "_")
            for field in ("generated_file", "master_file", "signature_file"):
                stored = getattr(batch, field, None)
                if not stored:
                    continue
                try:
                    with stored.open("rb") as handle:
                        data = handle.read()
                except Exception:  # noqa: BLE001
                    continue
                base = os.path.basename(stored.name) or f"{field}-{batch.id}"
                archive.writestr(f"{folder}/{base}", data)
                count += 1
    if not count:
        return Response({"error": "No generated register files to download yet."},
                        status=status.HTTP_404_NOT_FOUND)
    buf.seek(0)
    filename = "clra-documents.zip" if not batch_id else f"clra-documents-{batch_id}.zip"
    response = HttpResponse(buf.read(), content_type="application/zip")
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def contractor_submissions_zip(request):
    """Bundle uploaded evidence documents for all sites (or a specific site) into
    folders named after their respective site into a single downloadable ZIP."""
    import io
    import zipfile
    from django.http import HttpResponse
    from bss_core.models import SubmissionEvidence, Site, ContractorEmployerBinding

    user = request.user
    site_name = request.query_params.get("site")
    year = request.query_params.get("year")
    period = request.query_params.get("period")

    qs = SubmissionEvidence.objects.exclude(file="")
    if user.role == "contractor":
        qs = qs.filter(user=user)
    elif user.role == "employer":
        my_sites = set(Site.objects.filter(employer=user).values_list("site_name", flat=True))
        cids = set(ContractorEmployerBinding.objects.filter(employer=user, binding_status="ACCEPTED").values_list("contractor_id", flat=True))
        qs = qs.filter(Q(site__in=my_sites) | Q(user_id__in=cids))

    if site_name and site_name != "all" and site_name != "All Sites":
        qs = qs.filter(site__icontains=site_name)
    if year:
        fy_key = year.replace("FY ", "")
        qs = qs.filter(Q(financial_year__icontains=fy_key) | Q(period__icontains=fy_key))
    if period:
        qs = qs.filter(period__icontains=period)

    if not qs.exists():
        return Response({"error": "No submitted evidence documents found for this selection."},
                        status=status.HTTP_404_NOT_FOUND)

    buf = io.BytesIO()
    count = 0
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as archive:
        for sub in qs:
            if not sub.file:
                continue
            try:
                with sub.file.open("rb") as handle:
                    data = handle.read()
            except Exception:  # noqa: BLE001
                continue
            site_folder = (sub.site or "General_Site").replace(" ", "_")
            period_folder = (sub.period or "period").replace(" ", "_")
            folder = f"{site_folder}/{period_folder}"
            doc_name = (sub.document_type or sub.doc_type or "Document").replace(" ", "_")
            ext = os.path.splitext(sub.file.name)[1] or ".pdf"
            base_filename = f"{doc_name}_{sub.id}{ext}"
            archive.writestr(f"{folder}/{base_filename}", data)
            count += 1

    if not count:
        return Response({"error": "No valid files found to package."}, status=status.HTTP_404_NOT_FOUND)

    buf.seek(0)
    zip_name = f"additional-forms-{year or 'all'}-{period or 'all'}.zip".replace(" ", "_")
    response = HttpResponse(buf.read(), content_type="application/zip")
    response["Content-Disposition"] = f'attachment; filename="{zip_name}"'
    return response


def _unlinked_bss_ids(contractor, site, rows):
    """BSS IDs in ``rows`` that are NOT an ACCEPTED worker↔contractor binding at
    ``site``. A BSS ID in a master file must be a worker bound to this contractor
    **at that site** — not merely any registered worker."""
    from bss_core.models import WorkerContractorBinding
    codes = {str(r.get("bssId") or "").strip() for r in rows}
    codes.discard("")
    if not codes:
        return []
    linked = set(
        WorkerContractorBinding.objects
        .filter(contractor=contractor, site=site, binding_status="ACCEPTED",
                worker__worker_identity__bss_worker_id__in=codes)
        .values_list("worker__worker_identity__bss_worker_id", flat=True))
    return sorted(codes - linked)


@api_view(["POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def contractor_clra_validate(request):
    """Validate an uploaded CLRA master file and return a full report:
    field/BSS-ID checks, the derived state, employer adoption, and per-template
    column→master-field coverage (does the data flow into the right template)."""
    from collections import Counter
    from django.contrib.auth import get_user_model
    from api import clra
    from bss_core.models import Site, WorkerIdentity
    from .bindings import _contractor_site_ids
    from .register_templates import (applicable_templates, employer_adopted_ids,
                                     gate_templates_by_adoption)

    user = request.user
    if user.role != "contractor":
        return Response({"error": "Only contractors can validate master files."},
                        status=status.HTTP_403_FORBIDDEN)
    master = request.FILES.get("master")
    if master is None:
        return Response({"error": "Choose a master file."}, status=status.HTTP_400_BAD_REQUEST)
    try:
        rows = clra.parse_master(master)
    except clra.MasterFileError as exc:
        return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    month = (request.data.get("month") or "").strip()
    year = (request.data.get("year") or "").strip()
    states = [str(r.get("state") or "").strip() for r in rows if str(r.get("state") or "").strip()]
    state = (request.data.get("state") or "").strip() or (Counter(states).most_common(1)[0][0] if states else "")

    report = clra.validate_master(rows, state=state, month=month, year=year)
    report["state"] = state

    # Employer adoption + template coverage (data flowing into the right template).
    site_ids = _contractor_site_ids(user)
    site = None
    if state:
        site = Site.objects.filter(id__in=site_ids, state__iexact=state).first()
    if site is None:
        site = Site.objects.filter(id__in=site_ids).order_by("id").first()
    employer = site.employer if site else None

    # Site-code validation: every Site value in the master file must reference a
    # site allotted to the contractor. Generation reads the sites from the sheet
    # (no site is selected at generation time), so this is what catches a master
    # built for a wrong / foreign BSS site ID.
    labels = [str(r.get("site") or r.get("location") or "").strip() for r in rows]
    distinct_labels = sorted({label for label in labels if label})
    if not distinct_labels:
        report["errors"].append({"row": 0, "field": "site",
                                 "message": "The master file has no Site values — it cannot be matched to a site."})
    else:
        allotted = set()
        for s in Site.objects.filter(id__in=site_ids):
            for key in (str(s.site_name or "").strip(), str(s.bss_site_id or "").strip()):
                if key:
                    allotted.add(key.casefold())
        foreign = [lbl for lbl in distinct_labels if lbl.casefold() not in allotted]
        if foreign:
            shown = ", ".join(foreign[:8]) + ("…" if len(foreign) > 8 else "")
            report["errors"].append({"row": 0, "field": "site",
                                     "message": f"{len(foreign)} Site value(s) in the master file are not among your allotted sites: {shown}."})

    adopted = employer_adopted_ids(employer, state, site=site) if (employer is not None and state) else set()
    if state and not adopted:
        report["errors"].append({"row": 0, "field": "adoption",
                                 "message": f"The principal employer has not adopted CLRA registers for this site — generation is blocked."})
    site_templates = (gate_templates_by_adoption(applicable_templates(state, site.jurisdiction if site else None)[0], employer, state, site=site)
                      if state else [])
    if state and not site_templates:
        report["errors"].append({"row": 0, "field": "template",
                                 "message": f"No active register template is available for {state}."})

    template_rows = []
    for template in site_templates:
        columns = [str(c) for c in (template.columns or [])]
        field_map = {m.column: m.field_key for m in template.field_mappings.all()}
        unmapped = [c for c in columns if not (field_map.get(c) or clra.match_column(c))]
        coverage = round((len(columns) - len(unmapped)) / len(columns) * 100) if columns else 0
        template_rows.append({
            "formCode": template.form_code, "title": template.title,
            "columns": len(columns), "unmapped": unmapped, "coverage": coverage,
        })
        if unmapped:
            shown = ", ".join(unmapped[:6]) + ("…" if len(unmapped) > 6 else "")
            report["warnings"].append({"row": 0, "field": template.form_code,
                                       "message": f"{len(unmapped)} column(s) have no master-file mapping: {shown}."})
    report["templates"] = template_rows

    # BSS ID existence against the worker master.
    codes = [str(r.get("bssId") or "").strip() for r in rows]
    codes = [c for c in codes if c]
    if codes:
        known = set(WorkerIdentity.objects.filter(bss_worker_id__in=codes)
                    .values_list("bss_worker_id", flat=True))
        unknown = [c for c in codes if c not in known]
        report["bss"] = {"checked": len(codes), "known": len(codes) - len(unknown),
                         "unknown": len(unknown), "unknownSample": unknown[:10]}
        if unknown:
            report["warnings"].append({"row": 0, "field": "bssId",
                                       "message": f"{len(unknown)} BSS ID(s) are not registered in BSS (e.g., {', '.join(unknown[:5])})."})
    else:
        report["bss"] = {"checked": 0, "known": 0, "unknown": 0, "unknownSample": []}

    # Each BSS ID must be a worker bound to THIS contractor at the master's site
    # (not just any registered worker, and not at a different site).
    label_site = {}
    for s in Site.objects.filter(id__in=site_ids):
        for key in (str(s.site_name or "").strip(), str(s.bss_site_id or "").strip()):
            if key:
                label_site[key.casefold()] = s
    by_site: dict = {}
    for r in rows:
        if not str(r.get("bssId") or "").strip():
            continue
        s = label_site.get(str(r.get("site") or r.get("location") or "").strip().casefold())
        if s is None:
            continue
        by_site.setdefault(s.id, (s, []))[1].append(r)
    for _sid, (s, srows) in by_site.items():
        unlinked = _unlinked_bss_ids(user, s, srows)
        if unlinked:
            report["errors"].append({"row": 0, "field": "bssId",
                                     "message": f"{len(unlinked)} worker BSS ID(s) are not linked to you at "
                                                f"{s.site_name or s.bss_site_id} (e.g., {', '.join(unlinked[:5])})."})

    return Response({"data": report}, status=status.HTTP_200_OK)


def _batch_master_rows(batch):
    """Re-parse the batch's stored master file into rows (best effort)."""
    from api import clra
    if not batch.master_file:
        return []
    try:
        batch.master_file.open("rb")
        return clra.parse_master(batch.master_file)
    except Exception:  # noqa: BLE001 — a missing/corrupt file just yields no rows
        return []


def _batch_rows(batch):
    """The master-file rows that belong to THIS batch's site.

    A batch is generated per site (see ``contractor_compliance_batches``), so the
    stored master file may carry many sites. Everything that renders a batch —
    the drill-down summary and the per-register HTML/Excel/PDF/audit — must use
    only this site's rows, matching the grouping done at generation time
    (``label = row.site or row.location``, resolved to the batch's site by name
    or code)."""
    rows = _batch_master_rows(batch)
    site = batch.site
    if site is None:
        return rows
    labels = {str(site.site_name or "").strip().casefold(),
              str(site.bss_site_id or "").strip().casefold()} - {""}
    if not labels:
        return rows

    def key(row):
        return str(row.get("site") or row.get("location") or "").strip().casefold()

    return [row for row in rows if key(row) in labels]


def _letterhead_ctx(contractor, site, rows):
    """Header values for register letterhead blocks (contractor/employer
    name+address, nature of work, location). The contractor address and nature
    are read from the master file (falling back to the contractor profile); the
    establishment / principal-employer address comes from the employer profile."""
    first = rows[0] if rows else {}

    def row(*keys):
        for key in keys:
            value = str(first.get(key) or "").strip()
            if value:
                return value
        return ""

    cp = getattr(contractor, "contractor_profile", None) if contractor else None
    employer_user = site.employer if (site and getattr(site, "employer_id", None)) else None
    ep = getattr(employer_user, "employer_profile", None) if employer_user else None

    contractor_address = row("Address_of_contractor") or getattr(cp, "address", "") or ""
    if not contractor_address and cp:
        contractor_address = ", ".join(p for p in [getattr(cp, "district", ""), getattr(cp, "state", "")] if p)
    employer_address = getattr(ep, "address", "") or ""
    if not employer_address and ep:
        employer_address = ", ".join(p for p in [getattr(ep, "district", ""), getattr(ep, "state", "")] if p)
    return {
        "contractor_address": contractor_address,
        "employer_address": employer_address,
        "nature_of_work": row("Nature_ofWork_contractor") or getattr(cp, "activity", "") or "",
        "location": row("Location") or (site.site_name if site else ""),
    }


def _html_to_text(html):
    import re as _re
    from html import unescape

    text = _re.sub(r"<(style|script)\b.*?</\1>", " ", str(html or ""), flags=_re.S | _re.I)
    text = _re.sub(r"<[^>]+>", " ", text)
    text = unescape(text).replace("\xa0", " ")
    return _re.sub(r"[ \t]+", " ", text).strip()


def _run_register_audits(batch_id, templates, rows, site_name, site_bss_id, state,
                         month, year, financial_year, contractor, employer, generated_on):
    """Background: AI-audit each generated register and store the result on the
    batch (best effort — never raises into the request that spawned it)."""
    from django.db import connections

    try:
        from bss_core.models import ComplianceBatch

        from api import clra

        from . import ai_audit
        batch = ComplianceBatch.objects.filter(pk=batch_id).first()
        if batch is None:
            return
        results = dict(batch.register_audits or {})
        for template in templates:
            template_id = template.get("id")
            if template_id is None:
                continue
            try:
                html = clra.render_register_html(
                    template, rows, contractor=contractor, employer=employer,
                    site=site_name, site_bss_id=site_bss_id, state=state, month=month,
                    year=year, financial_year=financial_year, generated_on=generated_on,
                    **_letterhead_ctx(batch.contractor, batch.site, rows))
                audit = ai_audit._run_ai_audit(
                    form_name=template.get("title") or template.get("formCode") or "Register",
                    text=_html_to_text(html), required_format="Excel", site_name=site_name,
                    extra={"docKind": "register", "templateTitle": template.get("title"),
                           "templateColumns": template.get("columns") or [],
                           "fieldMappings": [{"column": c, "fieldKey": k}
                                             for c, k in (template.get("fieldMappings") or {}).items()],
                           "period": f"{month} {year}", "state": state})
            except Exception as exc:  # noqa: BLE001
                audit = {"status": "error", "message": f"AI audit failed: {exc}"}
            results[str(template_id)] = audit
            batch.register_audits = results
            batch.save(update_fields=["register_audits", "updated_at"])
    except Exception:  # noqa: BLE001 — background job: swallow everything
        pass
    finally:
        connections.close_all()


def _schedule_register_audits(*args):
    """Kick off the register audits in a daemon thread once the batch is committed."""
    import threading

    from django.db import transaction

    def _start():
        threading.Thread(target=_run_register_audits, args=args, daemon=True).start()

    transaction.on_commit(_start)


def _visible_batch(user, batch_id):
    """A ComplianceBatch the caller may inspect: their own as the contractor, or
    one generated for a site they own as the principal employer."""
    from bss_core.models import ComplianceBatch
    batch = (ComplianceBatch.objects.select_related("site", "site__employer")
             .filter(pk=batch_id).first())
    if batch is None:
        return None
    if batch.contractor_id == user.id:
        return batch
    if batch.site and batch.site.employer_id == user.id:
        return batch
    return None


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def compliance_batch_summary(request, batch_id):
    """State/Site-wise drill-down of a generated batch."""
    _require_permission(request, "compliance")
    batch = _visible_batch(request.user, batch_id)
    if batch is None:
        return Response({"error": "batch not found"}, status=status.HTTP_404_NOT_FOUND)
    rows = _batch_rows(batch)
    # A batch is one site; the master file's rows are that site's locations. Group
    # by site so the drill-down shows the single site once (not one entry per
    # location), with its total headcount and location count.
    grouped = {}
    locations = set()
    for row in rows:
        label = (row.get("site") or row.get("location") or "").strip()
        grouped[label] = grouped.get(label, 0) + 1
        loc = (row.get("location") or "").strip()
        if loc:
            locations.add(loc)
    sites = [{"site": label, "location": "", "employees": count}
             for label, count in sorted(grouped.items())]
    return Response({"data": {
        "id": str(batch.id), "state": batch.state, "month": batch.month,
        "year": batch.year, "site": batch.site.site_name if batch.site else "",
        "siteBssId": batch.site.bss_site_id if batch.site else "",
        "employees": len(rows), "locations": len(locations), "sites": sites,
    }}, status=status.HTTP_200_OK)


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def compliance_batch_master_download(request, batch_id):
    """Download the master file a batch was generated from."""
    _require_permission(request, "compliance")
    from django.http import FileResponse
    batch = _visible_batch(request.user, batch_id)
    if batch is None:
        return Response({"error": "batch not found"}, status=status.HTTP_404_NOT_FOUND)
    if not batch.master_file:
        return Response({"error": "No master file was stored for this batch."},
                        status=status.HTTP_404_NOT_FOUND)
    batch.master_file.open("rb")
    name = os.path.basename(batch.master_file.name or "master.xlsx")
    return FileResponse(batch.master_file, as_attachment=True, filename=name)


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def compliance_batch_site_documents(request, batch_id):
    """Documents applicable to one site of a batch: employer mapping + state templates."""
    _require_permission(request, "compliance")
    from bss_core.models import EmployerDocumentMapping
    batch = _visible_batch(request.user, batch_id)
    if batch is None:
        return Response({"error": "batch not found"}, status=status.HTTP_404_NOT_FOUND)
    site_name = (request.query_params.get("site") or "").strip()
    site = None
    if site_name:
        site = (Site.objects.filter(site_name__iexact=site_name).first()
                or Site.objects.filter(bss_site_id__iexact=site_name).first())
    if site is None:
        site = batch.site
    state = (site.state if site and site.state else batch.state)
    employer = site.employer if site else None

    # The applicability matrix is the authority on which forms apply in a state;
    # the templates are filtered to it (fallback: every template in the folder).
    from .register_templates import applicable_templates, employer_adopted_ids, state_strength
    templates_list, mapped_forms = applicable_templates(state, site.jurisdiction if site else None)
    # Hard gate: once the site's employer has adopted CLRA forms for this state,
    # the site only sees the adopted ones (site-wise contractor availability).
    adopted = employer_adopted_ids(employer, state, site=site)
    if adopted:
        templates_list = [t for t in templates_list if t.id in adopted]
    by_form = {t.form_code.strip().upper(): t for t in templates_list}

    # Employer document mapping (which documents this employer is subject to).
    mapped_docs = {}
    if employer is not None:
        for mapping in (EmployerDocumentMapping.objects
                        .filter(employer=employer, is_active=True)
                        .select_related("register_doc")):
            doc = mapping.register_doc
            mapped_docs[(doc.form_number or "").strip().upper()] = bool(
                doc.is_mandatory or mapping.is_mandatory)

    # Applicable purposes from the matrix → the documents the site must file.
    from bss_core.models import StateFormApplicability
    documents = []
    for row in StateFormApplicability.objects.filter(state__iexact=state).order_by("purpose"):
        label = (row.form_label or "").strip().upper()
        if not label.startswith("FORM"):
            continue
        if adopted and label not in by_form:
            continue
        template = by_form.get(label)
        documents.append({
            "purpose": row.purpose,
            "form": row.form_label,
            "templateId": template.id if template else None,
            "mandatory": mapped_docs.get(label, False),
            "frequency": (template.title if template else ""),
            "outputFormat": template.resolved_output_format() if template else "",
        })
    # Extra form names with no register template (submitted directly).
    # Admin catalog forms are non-mandatory and appear only when the employer
    # selected them; the employer's own forms always appear.
    from bss_core.models import CustomFormName, EmployerFormSelection
    from .form_names import catalog_for_state
    catalog = catalog_for_state(state)
    if employer is not None:
        # Adopted for THIS site (the site-specific selection wins over the
        # legacy site-less one; its is_active decides whether it applies).
        selections = {}
        for s in EmployerFormSelection.objects.filter(
                employer=employer, form_name__in=catalog, is_active=True, site__isnull=True):
            selections.setdefault(s.form_name_id, s)
        if site is not None:
            for s in EmployerFormSelection.objects.filter(employer=employer, form_name__in=catalog, site=site):
                selections[s.form_name_id] = s
        for obj in catalog:
            selection = selections.get(obj.id)
            if selection is None or not selection.is_active:
                continue
            documents.append({
                "purpose": obj.name, "form": obj.name, "templateId": None,
                "mandatory": bool(selection.is_mandatory), "frequency": obj.frequency,
                "outputFormat": "", "custom": True, "scope": "admin",
                "requiresDocument": bool(obj.requires_document),
            })
        for obj in (CustomFormName.objects.filter(is_active=True, state__iexact=state,
                                                  employer=employer)
                    .filter(Q(site=site) | Q(site__isnull=True)).order_by("sort_order", "name")):
            documents.append({
                "purpose": obj.name, "form": obj.name, "templateId": None,
                "mandatory": bool(obj.is_mandatory), "frequency": obj.frequency,
                "outputFormat": "", "custom": True, "scope": "employer",
                "requiresDocument": bool(obj.requires_document),
            })
    else:
        for obj in catalog:
            documents.append({
                "purpose": obj.name, "form": obj.name, "templateId": None,
                "mandatory": False, "frequency": obj.frequency,
                "outputFormat": "", "custom": True, "scope": "admin",
                "requiresDocument": bool(obj.requires_document),
            })
    templates = [{
        "id": t.id, "formCode": t.form_code, "title": t.title,
        "columns": len(t.columns or []), "hasFile": bool(t.source_file),
        "outputFormat": t.resolved_output_format(),
    } for t in templates_list]
    # Attach the AI audit of each generated register (produced at generation time).
    audits = batch.register_audits or {}
    for doc in documents:
        if doc.get("templateId") is not None:
            doc["audit"] = audits.get(str(doc["templateId"]))
    for t in templates:
        t["audit"] = audits.get(str(t["id"]))
    return Response({"data": {
        "site": site.site_name if site else site_name, "siteBssId": site.bss_site_id if site else "",
        "state": state, "documents": documents, "templates": templates,
        "mappedForms": sorted(mapped_forms), "strength": state_strength(state),
    }}, status=status.HTTP_200_OK)


def _required_format(requires_document):
    """"Required Format" column: what the contractor must upload for a form."""
    return "PDF / JPEG / PNG" if requires_document else "Submission only"


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def contractor_site_documents(request):
    """Additional (template-less) documents the employer requires for a site.

    Same list as the batch endpoint but **without needing a generated register
    batch**, so a contractor can see/upload the extra forms even before any CLRA
    registers are generated for the period. Site defaults to the contractor's
    first allotted site; ``?siteId=`` narrows it."""
    from .bindings import _contractor_site_ids
    from bss_core.models import CustomFormName, EmployerFormSelection
    if request.user.role != "contractor":
        return Response({"error": "Contractors only."}, status=status.HTTP_403_FORBIDDEN)
    site_ids = _contractor_site_ids(request.user)
    site_id = (request.query_params.get("siteId") or "").strip()
    site = (Site.objects.filter(id=site_id, id__in=site_ids).first()
            if site_id.isdigit() else None)
    if site is None:
        site = Site.objects.filter(id__in=site_ids).order_by("id").first()
    if site is None or not site.state:
        return Response({"data": {"site": site.site_name if site else "",
                                  "siteBssId": site.bss_site_id if site else "",
                                  "state": site.state if site else "", "documents": []}},
                        status=status.HTTP_200_OK)
    state, employer = site.state, site.employer
    documents = []
    if employer is not None:
        from .form_names import catalog_for_state
        catalog = catalog_for_state(state)
        # Adopted for THIS site (the site-specific selection wins over the
        # legacy site-less one; its is_active decides whether it applies).
        selections = {}
        for s in EmployerFormSelection.objects.filter(
                employer=employer, form_name__in=catalog, is_active=True, site__isnull=True):
            selections.setdefault(s.form_name_id, s)
        if site is not None:
            for s in EmployerFormSelection.objects.filter(employer=employer, form_name__in=catalog, site=site):
                selections[s.form_name_id] = s
        for obj in catalog:
            selection = selections.get(obj.id)
            if selection is None or not selection.is_active:
                continue
            documents.append({"purpose": obj.name, "form": obj.name, "templateId": None,
                              "mandatory": bool(selection.is_mandatory), "frequency": obj.frequency,
                              "outputFormat": "", "custom": True, "scope": "admin",
                              "requiresDocument": bool(obj.requires_document),
                              "type": "Admin", "requiredFormat": _required_format(obj.requires_document),
                              "note": obj.description, "aiChecks": list(obj.ai_checks or [])})
        for obj in (CustomFormName.objects.filter(is_active=True, state__iexact=state,
                                                  employer=employer)
                    .filter(Q(site=site) | Q(site__isnull=True)).order_by("sort_order", "name")):
            documents.append({"purpose": obj.name, "form": obj.name, "templateId": None,
                              "mandatory": bool(obj.is_mandatory), "frequency": obj.frequency,
                              "outputFormat": "", "custom": True, "scope": "employer",
                              "requiresDocument": bool(obj.requires_document),
                              "type": "Employer", "requiredFormat": _required_format(obj.requires_document),
                              "note": obj.description, "aiChecks": list(obj.ai_checks or [])})
        # Only the ad-hoc form names above are "additional forms". The statutory
        # matrix (FORM II, FORM VII, …) is the register side — generated or not —
        # and must never be listed here, or registers appear twice on the page.
    return Response({"data": {"site": site.site_name, "siteBssId": site.bss_site_id or "",
                              "state": state, "documents": documents}},
                    status=status.HTTP_200_OK)


@api_view(["POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def compliance_batch_run_audits(request, batch_id):
    """(Re)run the AI audit for every register in a batch (in the background).

    Useful when the audit ran before an AI provider was configured."""
    _require_permission(request, "compliance")
    batch = _visible_batch(request.user, batch_id)
    if batch is None:
        return Response({"error": "batch not found"}, status=status.HTTP_404_NOT_FOUND)
    from bss_core.models import RegisterTemplate

    from .register_templates import applicable_templates, employer_adopted_ids
    state = batch.state
    templates_list, _ = applicable_templates(state, batch.site.jurisdiction if batch.site else None)
    if batch.site and batch.site.employer_id:
        adopted = employer_adopted_ids(batch.site.employer, state, site=batch.site)
        if adopted:
            templates_list = [t for t in templates_list if t.id in adopted]
    templates = [{
        "id": t.id, "formCode": t.form_code, "title": t.title, "state": t.state,
        "frequency": t.frequency or "Monthly", "period": "",
        "columns": list(t.columns or []), "html": t.html or "", "perRow": t.per_row,
        "act": t.act,
        "calculationRules": [{"targetField": r.target_field, "formula": r.formula}
                             for r in t.calculation_rules.all()],
        "fieldMappings": {m.column: m.field_key for m in t.field_mappings.all()},
    } for t in templates_list]
    rows = _batch_rows(batch)
    employer_name = payloads._org_name(batch.site.employer) if (batch.site and batch.site.employer) else ""
    _schedule_register_audits(
        batch.id, templates, rows, batch.site.site_name if batch.site else "",
        batch.site.bss_site_id if batch.site else "", state, batch.month, batch.year,
        batch.financial_year, payloads._party_name(batch.contractor), employer_name,
        payloads._dts(timezone.now())[:10])
    return Response({"data": {"status": "scheduled"}}, status=status.HTTP_202_ACCEPTED)


def _batch_signature(batch):
    """The batch's signature upload as an embeddable image, or None.

    Only raster images (png/jpg/webp/gif) can be stamped onto the registers — a
    PDF signature is left in the bundle untouched."""
    f = getattr(batch, "signature_file", None)
    name = getattr(f, "name", "") if f else ""
    if not name:
        return None
    ext = os.path.splitext(name)[1].lstrip(".").lower()
    if ext not in ("png", "jpg", "jpeg", "webp", "gif"):
        return None
    try:
        f.open("rb")
        try:
            data = f.read()
        finally:
            f.close()
    except Exception:  # noqa: BLE001
        return None
    return {"ext": ext, "data": data} if data else None


def _signature_data_uri(signature):
    """A ``data:`` URI for a signature image dict (or "")."""
    import base64
    if not signature or not signature.get("data"):
        return ""
    mime = "image/jpeg" if signature["ext"] in ("jpg", "jpeg") else f"image/{signature['ext']}"
    return f"data:{mime};base64,{base64.b64encode(signature['data']).decode('ascii')}"


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def compliance_batch_register(request, batch_id, template_id):
    """Render one register (a State+Form template) from a generated batch."""
    _require_permission(request, "compliance")
    from api import clra
    from bss_core.models import RegisterTemplate
    batch = _visible_batch(request.user, batch_id)
    if batch is None:
        return Response({"error": "batch not found"}, status=status.HTTP_404_NOT_FOUND)
    template = RegisterTemplate.objects.filter(pk=template_id).first()
    if template is None:
        return Response({"error": "template not found"}, status=status.HTTP_404_NOT_FOUND)
    rows = _batch_rows(batch)
    employer_name = payloads._org_name(batch.site.employer) if (batch.site and batch.site.employer) else ""
    html = clra.render_register_html(
        {"formCode": template.form_code, "title": template.title, "state": template.state,
         "columns": list(template.columns or []), "html": template.html or "",
         "perRow": template.per_row,
         "fieldMappings": {m.column: m.field_key for m in template.field_mappings.all()},
         "calculationRules": [{"targetField": r.target_field, "formula": r.formula}
                              for r in template.calculation_rules.all()]},
        rows,
        contractor=payloads._party_name(batch.contractor),
        employer=employer_name,
        site=(batch.site.site_name if batch.site else ""),
        site_bss_id=(batch.site.bss_site_id if batch.site else ""),
        state=batch.state, month=batch.month, year=batch.year,
        financial_year=batch.financial_year, generated_on=payloads._dts(timezone.now())[:10],
        signature_data_uri=_signature_data_uri(_batch_signature(batch)),
        **_letterhead_ctx(batch.contractor, batch.site, rows),
    )
    return Response({"data": {"html": html, "title": f"{template.state} · {template.form_code}"}},
                    status=status.HTTP_200_OK)


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def compliance_batch_register_export(request, batch_id, template_id):
    """Export one register (State+Form template) from a batch as XLSX."""
    _require_permission(request, "compliance")
    import io

    from django.http import FileResponse

    from api import clra
    from bss_core.models import RegisterTemplate
    batch = _visible_batch(request.user, batch_id)
    if batch is None:
        return Response({"error": "batch not found"}, status=status.HTTP_404_NOT_FOUND)
    template = RegisterTemplate.objects.filter(pk=template_id).first()
    if template is None:
        return Response({"error": "template not found"}, status=status.HTTP_404_NOT_FOUND)
    if template.resolved_output_format() != "xlsx":
        return Response({"error": "This template outputs PDF — open the register view to print/save it as PDF."},
                        status=status.HTTP_400_BAD_REQUEST)
    rows = _batch_rows(batch)
    employer_name = payloads._org_name(batch.site.employer) if (batch.site and batch.site.employer) else ""
    context = clra.backend_context(
        contractor=payloads._party_name(batch.contractor), employer=employer_name,
        site=(batch.site.site_name if batch.site else ""),
        site_bss_id=(batch.site.bss_site_id if batch.site else ""), state=batch.state,
        month=batch.month, year=batch.year, financial_year=batch.financial_year,
        record_count=len(rows), generated_on=payloads._dts(timezone.now())[:10],
        **_letterhead_ctx(batch.contractor, batch.site, rows))
    data = clra.build_register_workbook(
        {"formCode": template.form_code, "title": template.title, "state": template.state,
         "columns": list(template.columns or []), "html": template.html or "",
         "act": template.act,
         "fieldMappings": {m.column: m.field_key for m in template.field_mappings.all()},
         "calculationRules": [{"targetField": r.target_field, "formula": r.formula}
                              for r in template.calculation_rules.all()]},
        rows, context=context, signature=_batch_signature(batch))
    filename = f"{template.state}-{template.form_code}.xlsx".replace(" ", "_")
    return FileResponse(io.BytesIO(data), as_attachment=True, filename=filename)


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def compliance_batch_register_pdf(request, batch_id, template_id):
    """Render one register (State+Form template) from a batch as a PDF download."""
    _require_permission(request, "compliance")
    import io

    from django.http import FileResponse

    from api import clra
    from bss_core.models import RegisterTemplate
    batch = _visible_batch(request.user, batch_id)
    if batch is None:
        return Response({"error": "batch not found"}, status=status.HTTP_404_NOT_FOUND)
    template = RegisterTemplate.objects.filter(pk=template_id).first()
    if template is None:
        return Response({"error": "template not found"}, status=status.HTTP_404_NOT_FOUND)
    rows = _batch_rows(batch)
    employer_name = payloads._org_name(batch.site.employer) if (batch.site and batch.site.employer) else ""
    html = clra.render_register_html(
        {"formCode": template.form_code, "title": template.title, "state": template.state,
         "columns": list(template.columns or []), "html": template.html or "",
         "perRow": template.per_row,
         "fieldMappings": {m.column: m.field_key for m in template.field_mappings.all()},
         "calculationRules": [{"targetField": r.target_field, "formula": r.formula}
                              for r in template.calculation_rules.all()]},
        rows,
        contractor=payloads._party_name(batch.contractor),
        employer=employer_name,
        site=(batch.site.site_name if batch.site else ""),
        site_bss_id=(batch.site.bss_site_id if batch.site else ""),
        state=batch.state, month=batch.month, year=batch.year,
        financial_year=batch.financial_year, generated_on=payloads._dts(timezone.now())[:10],
        signature_data_uri=_signature_data_uri(_batch_signature(batch)),
        **_letterhead_ctx(batch.contractor, batch.site, rows),
    )
    try:
        from weasyprint import HTML

        pdf = HTML(string=html, base_url="https://login.bharatshramsetu.com/").write_pdf()
    except Exception as exc:  # noqa: BLE001
        return Response({"error": f"PDF could not be generated: {exc}"},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    filename = f"{template.state}-{template.form_code}.pdf".replace(" ", "_")
    return FileResponse(io.BytesIO(pdf), as_attachment=True, filename=filename)


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def compliance_batch_register_issues(request, batch_id, template_id):
    """Download the AI-audit problems for one register (Excel)."""
    _require_permission(request, "compliance")
    import io

    from django.http import FileResponse

    from bss_core.models import RegisterTemplate

    from .audit_issues import build_issues_xlsx, problems_from_audit
    batch = _visible_batch(request.user, batch_id)
    if batch is None:
        return Response({"error": "batch not found"}, status=status.HTTP_404_NOT_FOUND)
    template = RegisterTemplate.objects.filter(pk=template_id).first()
    audit = (batch.register_audits or {}).get(str(template_id)) or {}
    name = (template.title if template else f"Register {template_id}")
    form = (template.form_code if template else "")
    meta = [
        ("Contractor", payloads._party_name(batch.contractor)),
        ("Principal employer", payloads._org_name(batch.site.employer) if (batch.site and batch.site.employer_id) else ""),
        ("Site", batch.site.site_name if batch.site else ""),
        ("State", batch.state),
        ("Period", f"{batch.month} {batch.year}".strip()),
        ("Register", f"{form} · {name}".strip(" ·")),
        ("AI status", audit.get("status") or "—"),
        ("Confidence", f"{audit.get('confidence')}%" if audit.get("confidence") is not None else "—"),
    ]
    data = build_issues_xlsx(f"AI Audit Issues — {name}", meta, problems_from_audit(audit))
    filename = f"{(form or 'register')}-{name}-issues.xlsx".replace(" ", "_")
    return FileResponse(io.BytesIO(data), as_attachment=True, filename=filename)


def _visible_evidence(user, submission_id):
    """A SubmissionEvidence the caller may inspect (own / staff / employer's site)."""
    from bss_core.models import Site
    ev = SubmissionEvidence.objects.filter(pk=submission_id).first()
    if ev is None:
        return None
    if ev.user_id == user.id:
        return ev
    if user.role in ("bss_admin", "bss_staff", "government", "admin"):
        return ev
    if user.role == "employer" and ev.site:
        if Site.objects.filter(employer=user, site_name=ev.site).exists():
            return ev
    return None


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def submission_audit_issues(request, submission_id):
    """Download the AI-audit problems for one uploaded document (Excel)."""
    _require_permission(request, "compliance")
    import io

    from django.http import FileResponse

    from .audit_issues import build_issues_xlsx, problems_from_evidence
    ev = _visible_evidence(request.user, submission_id)
    if ev is None:
        return Response({"error": "submission not found"}, status=status.HTTP_404_NOT_FOUND)
    name = ev.doc_type or ev.document_type or "Document"
    meta = [
        ("Document", name),
        ("Site", ev.site), ("State", ev.state),
        ("Period", ev.period or f"{ev.month} {ev.financial_year}".strip()),
        ("AI status", ev.ai_status or "—"),
    ]
    data = build_issues_xlsx(f"AI Audit Issues — {name}", meta, problems_from_evidence(ev))
    filename = f"{name}-issues.xlsx".replace(" ", "_").replace("/", "-")
    return FileResponse(io.BytesIO(data), as_attachment=True, filename=filename)


__all__ = [
    "_handle_submission_review",
    "_submissions",
    "compliance_batch_download",
    "compliance_batch_master_download",
    "compliance_batch_register",
    "compliance_batch_register_export",
    "compliance_batch_register_issues",
    "compliance_batch_register_pdf",
    "compliance_batch_run_audits",
    "submission_audit_issues",
    "compliance_batch_site_documents",
    "compliance_batch_summary",
    "contractor_clra_validate",
    "contractor_compliance_batches",
    "contractor_compliance_batches_zip",
    "contractor_site_documents",
    "contractor_submissions",
    "contractor_submissions_zip",
    "submission_file_download",
    "submission_file_serve",
    "submission_file_token",
    "worker_submissions",
    "worker_verify_document",
]
