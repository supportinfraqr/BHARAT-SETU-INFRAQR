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
    accuracy = None
    findings = []
    checkpoint_results = []
    checkpoints = []
    if file_obj:
        checksum = payloads.sha256_checksum(file_obj)
        # A document can carry an OCR verification checklist: additional forms
        # from the form name (CustomFormName), manual CLRA register uploads from
        # the register template (RegisterTemplate).
        from bss_core.models import CustomFormName, RegisterTemplate
        form_key = (document_type or ftype).strip()
        form_name = form_key
        if form_key:
            form = (CustomFormName.objects.filter(is_active=True, name__iexact=form_key)
                    .filter(Q(state__iexact=state) | Q(state="")).first())
            if form and form.ocr_checkpoints:
                checkpoints = list(form.ocr_checkpoints)
                form_name = form.name
            else:
                template = (RegisterTemplate.objects.filter(is_active=True)
                            .filter(Q(form_code__iexact=form_key) | Q(title__iexact=form_key)).first())
                if template is None:
                    # Manual register uploads send "<form code> — <title>".
                    code = form_key.replace("\u2014", "-").split(" - ")[0].strip()
                    template = RegisterTemplate.objects.filter(is_active=True, form_code__iexact=code).first()
                if template and template.ocr_checkpoints:
                    checkpoints = list(template.ocr_checkpoints)
                    form_name = template.title or template.form_code
        has_checkpoints = bool(checkpoints)
        if has_checkpoints or not no_ocr:
            ocr_text = None
            try:
                file_obj.seek(0)
                ocr_text = ocr_client.extract_text(file_obj.read(), file_obj.name, timeout=25)
            except Exception:  # OCR service down/slow — fall back to integrity checks
                ocr_text = None
            finally:
                try:
                    file_obj.seek(0)
                except (AttributeError, OSError):
                    pass
            if has_checkpoints:
                accuracy, checkpoint_results, findings = ocr_client.verify_checkpoints(
                    checkpoints, ocr_text or "",
                    context={"contractor": payloads._party_name(user), "employer": employer,
                             "site": site, "month": month, "year": year, "period": period,
                             "worker": "", "form_name": form_name})
            else:
                accuracy, findings = compliance.validate_evidence(file_obj, ftype, ocr_text=ocr_text)

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
    submission.ocr_accuracy = accuracy
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
            "accuracy": accuracy,
            "noOcr": no_ocr,
            "checkpoints": checkpoint_results,
            "requiredCheckpoints": checkpoints,
            "validated": no_ocr or (accuracy is not None and accuracy >= 100),
            "findings": findings,
        }
    }, status=status.HTTP_201_CREATED)


@api_view(["POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def submission_file_token(request, role_path, submission_id):
    """Issue a single-use, 5-minute token to view submission evidence inline in a new tab."""
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
        allowed = SubmissionEvidence.objects.filter(
            Q(user__worker_bindings__site__employer=user)
            | Q(user__contractor_bindings__site__employer=user),
            pk=submission.id,
        ).exists()
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
        allowed = SubmissionEvidence.objects.filter(
            Q(user__worker_bindings__site__employer=user)
            | Q(user__contractor_bindings__site__employer=user),
            pk=submission.id,
        ).exists()
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

    if raw_id.startswith("grp-"):
        # A grouped register submission: contractor + year + month across sites.
        from bss_core.models import ComplianceBatch
        parts = raw_id.split("-", 3)
        if len(parts) != 4:
            raise PortalMutationError("Submission not found.", 404)
        _, cid, year, month = parts
        batches = (ComplianceBatch.objects
                   .filter(contractor_id=cid, year=year, month=month, site__employer=user)
                   .exclude(status="SUPERSEDED"))
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
    connected = (
        SubmissionEvidence.objects
        .filter(
            Q(user__worker_bindings__site__employer=user)
            | Q(user__contractor_bindings__site__employer=user),
            pk=submission.id,
        )
        .exists()
    )
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
                or Site.objects.filter(id__in=site_ids, site_code=label).first())
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
        # Only generate for a state where the principal employer has adopted the
        # CLRA register forms for its sites.
        adopted_ids = employer_adopted_ids(site.employer, state, site=site) if site.employer_id else set()
        if not adopted_ids:
            failures.append(f"The principal employer has not adopted CLRA register forms for {state} "
                            f"(site \u201c{site.site_name}\u201d).")
            continue
        site_templates = gate_templates_by_adoption(applicable_templates(state)[0], site.employer, state, site=site)
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
        # One current register per site + period. A submitted/verified register
        # cannot be regenerated (that would erase the employer's review); anything
        # else for this site+period is superseded by the new one.
        existing = list(ComplianceBatch.objects
                        .filter(contractor=user, site=site, month=month[:20], year=year[:4])
                        .exclude(status="SUPERSEDED"))
        if any(str(b.status).upper() in ("SUBMITTED", "VERIFIED") for b in existing):
            failures.append(f"A register for \u201c{site.site_name}\u201d {month} {year} is already "
                            f"submitted or verified \u2014 it cannot be regenerated.")
            continue
        plans.append({"site": site, "state": state, "rows": group_rows,
                      "templates": selected, "skipped": skipped, "supersede": existing})

    if failures:
        return Response({"error": " ".join(failures), "failures": failures},
                        status=status.HTTP_400_BAD_REQUEST)

    generated_on = timezone.localdate()
    signature = request.FILES.get("signature")
    created = []
    for plan in plans:
        site, state, group_rows = plan["site"], plan["state"], plan["rows"]
        templates = [
            {"formCode": t.form_code, "title": t.title, "state": t.state,
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
            site=site.site_name, site_code=site.site_code, state=state,
            financial_year=fy, month=month, year=year, registers=registers,
            generated_on=str(generated_on), templates=templates,
        )
        skipped = plan["skipped"]
        batch = ComplianceBatch(
            contractor=user, site=site,
            financial_year=fy[:12], month=month[:20], year=year[:4], state=state[:60],
            employee_count=len(group_rows),
            location_count=len({r.get("location", "") for r in group_rows if r.get("location")}) or 1,
            generated_on=generated_on, generated_by=payloads._party_name(user),
            rows_count=len(group_rows),
            notes=(f"{register_count} register(s) generated from {len(group_rows)} worker row(s)"
                   + (f"; {len(skipped)} not due this period: "
                      + ", ".join(f"{s['formCode']} ({s['frequency']})" for s in skipped[:6]) if skipped else "")),
            status="GENERATED",
        )
        stamp = f"{year or generated_on.year}-{month or generated_on.strftime('%b')}".replace(" ", "")
        batch.generated_file.save(
            f"clra-{stamp}-{site.site_code or 'site'}.xlsx", ContentFile(data), save=False)
        master.seek(0)
        batch.master_file.save(os.path.basename(master.name or "master.xlsx"), master, save=False)
        if signature is not None:
            signature.seek(0)
            batch.signature_file.save(os.path.basename(signature.name or "signature"), signature, save=False)
        batch.save()
        # Supersede the previous current register(s) for this site+period.
        for old in plan.get("supersede", []):
            old.status = "SUPERSEDED"
            old.superseded_by = batch
            old.save(update_fields=["status", "superseded_by", "updated_at"])
        created.append(payloads._contractor_compliance_batch_row(batch))

    return Response({"data": created}, status=status.HTTP_201_CREATED)


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def compliance_batch_download(request, role_path, batch_id):
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
    """Bundle every generated CLRA register file the contractor owns into one ZIP."""
    import io
    import zipfile

    from django.http import HttpResponse

    from bss_core.models import ComplianceBatch

    user = request.user
    batch_id = request.query_params.get("batchId")
    qs = ComplianceBatch.objects.filter(contractor=user)
    if batch_id:
        qs = qs.filter(pk=batch_id)
    qs = qs.exclude(generated_file="").order_by("-year", "-id")
    if not qs.exists():
        return Response({"error": "No generated register files to download yet."},
                        status=status.HTTP_404_NOT_FOUND)

    buf = io.BytesIO()
    count = 0
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as archive:
        for batch in qs:
            try:
                with batch.generated_file.open("rb") as handle:
                    data = handle.read()
            except Exception:  # noqa: BLE001
                continue
            base = os.path.basename(batch.generated_file.name) or f"registers-{batch.id}.xlsx"
            label = f"{batch.state or 'state'}_{batch.month or ''}_{batch.year or ''}_{base}".replace(" ", "_")
            archive.writestr(label, data)
            count += 1
    if not count:
        return Response({"error": "No generated register files to download yet."},
                        status=status.HTTP_404_NOT_FOUND)
    buf.seek(0)
    filename = "clra-registers.zip" if not batch_id else f"clra-registers-{batch_id}.zip"
    response = HttpResponse(buf.read(), content_type="application/zip")
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response


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
    adopted = employer_adopted_ids(employer, state, site=site) if (employer is not None and state) else set()
    if state and not adopted:
        report["errors"].append({"row": 0, "field": "adoption",
                                 "message": f"The principal employer has not adopted CLRA registers for this site — generation is blocked."})
    site_templates = (gate_templates_by_adoption(applicable_templates(state)[0], employer, state, site=site)
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
    batch = _visible_batch(request.user, batch_id)
    if batch is None:
        return Response({"error": "batch not found"}, status=status.HTTP_404_NOT_FOUND)
    rows = _batch_master_rows(batch)
    grouped = {}
    for row in rows:
        key = ((row.get("site") or "").strip(), (row.get("location") or "").strip())
        grouped[key] = grouped.get(key, 0) + 1
    sites = [{"site": site, "location": location, "employees": count}
             for (site, location), count in sorted(grouped.items())]
    return Response({"data": {
        "id": str(batch.id), "state": batch.state, "month": batch.month,
        "year": batch.year, "site": batch.site.site_name if batch.site else "",
        "employees": len(rows), "sites": sites,
    }}, status=status.HTTP_200_OK)


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def compliance_batch_master_download(request, batch_id):
    """Download the master file a batch was generated from."""
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
    from bss_core.models import EmployerDocumentMapping
    batch = _visible_batch(request.user, batch_id)
    if batch is None:
        return Response({"error": "batch not found"}, status=status.HTTP_404_NOT_FOUND)
    site_name = (request.query_params.get("site") or "").strip()
    site = (Site.objects.filter(site_name__iexact=site_name).first() if site_name else batch.site)
    state = (site.state if site and site.state else batch.state)
    employer = site.employer if site else None

    # The applicability matrix is the authority on which forms apply in a state;
    # the templates are filtered to it (fallback: every template in the folder).
    from .register_templates import applicable_templates, employer_adopted_ids, state_strength
    templates_list, mapped_forms = applicable_templates(state)
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
    catalog = list(CustomFormName.objects.filter(is_active=True, state__iexact=state,
                                                 employer__isnull=True).order_by("sort_order", "name"))
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
    return Response({"data": {
        "site": site.site_name if site else site_name, "siteCode": site.site_code if site else "",
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
                                  "siteCode": site.site_code if site else "",
                                  "state": site.state if site else "", "documents": []}},
                        status=status.HTTP_200_OK)
    state, employer = site.state, site.employer
    documents = []
    if employer is not None:
        catalog = list(CustomFormName.objects.filter(is_active=True, state__iexact=state,
                                                     employer__isnull=True).order_by("sort_order", "name"))
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
                              "note": obj.description, "ocrCheckpoints": list(obj.ocr_checkpoints or [])})
        for obj in (CustomFormName.objects.filter(is_active=True, state__iexact=state,
                                                  employer=employer)
                    .filter(Q(site=site) | Q(site__isnull=True)).order_by("sort_order", "name")):
            documents.append({"purpose": obj.name, "form": obj.name, "templateId": None,
                              "mandatory": bool(obj.is_mandatory), "frequency": obj.frequency,
                              "outputFormat": "", "custom": True, "scope": "employer",
                              "requiresDocument": bool(obj.requires_document),
                              "type": "Employer", "requiredFormat": _required_format(obj.requires_document),
                              "note": obj.description, "ocrCheckpoints": list(obj.ocr_checkpoints or [])})
        # Only the ad-hoc form names above are "additional forms". The statutory
        # matrix (FORM II, FORM VII, …) is the register side — generated or not —
        # and must never be listed here, or registers appear twice on the page.
    return Response({"data": {"site": site.site_name, "siteCode": site.site_code or "",
                              "state": state, "documents": documents}},
                    status=status.HTTP_200_OK)


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def compliance_batch_register(request, batch_id, template_id):
    """Render one register (a State+Form template) from a generated batch."""
    from api import clra
    from bss_core.models import RegisterTemplate
    batch = _visible_batch(request.user, batch_id)
    if batch is None:
        return Response({"error": "batch not found"}, status=status.HTTP_404_NOT_FOUND)
    template = RegisterTemplate.objects.filter(pk=template_id).first()
    if template is None:
        return Response({"error": "template not found"}, status=status.HTTP_404_NOT_FOUND)
    rows = _batch_master_rows(batch)
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
        site_code=(batch.site.site_code if batch.site else ""),
        state=batch.state, month=batch.month, year=batch.year,
        financial_year=batch.financial_year, generated_on=payloads._dts(timezone.now())[:10],
    )
    return Response({"data": {"html": html, "title": f"{template.state} · {template.form_code}"}},
                    status=status.HTTP_200_OK)


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def compliance_batch_register_export(request, batch_id, template_id):
    """Export one register (State+Form template) from a batch as XLSX."""
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
    rows = _batch_master_rows(batch)
    employer_name = payloads._org_name(batch.site.employer) if (batch.site and batch.site.employer) else ""
    context = clra.backend_context(
        contractor=payloads._party_name(batch.contractor), employer=employer_name,
        site=(batch.site.site_name if batch.site else ""),
        site_code=(batch.site.site_code if batch.site else ""), state=batch.state,
        month=batch.month, year=batch.year, financial_year=batch.financial_year,
        record_count=len(rows), generated_on=payloads._dts(timezone.now())[:10])
    data = clra.build_register_workbook(
        {"formCode": template.form_code, "title": template.title, "state": template.state,
         "columns": list(template.columns or []), "html": template.html or "",
         "act": template.act,
         "fieldMappings": {m.column: m.field_key for m in template.field_mappings.all()},
         "calculationRules": [{"targetField": r.target_field, "formula": r.formula}
                              for r in template.calculation_rules.all()]},
        rows, context=context)
    filename = f"{template.state}-{template.form_code}.xlsx".replace(" ", "_")
    return FileResponse(io.BytesIO(data), as_attachment=True, filename=filename)


__all__ = [
    "_handle_submission_review",
    "_submissions",
    "compliance_batch_download",
    "compliance_batch_master_download",
    "compliance_batch_register",
    "compliance_batch_register_export",
    "compliance_batch_site_documents",
    "compliance_batch_summary",
    "contractor_clra_validate",
    "contractor_compliance_batches",
    "contractor_compliance_batches_zip",
    "contractor_site_documents",
    "contractor_submissions",
    "submission_file_download",
    "submission_file_serve",
    "submission_file_token",
    "worker_submissions",
    "worker_verify_document",
]
