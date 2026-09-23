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
    if file_obj:
        checksum = payloads.sha256_checksum(file_obj)
        if not no_ocr:
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
            accuracy, findings = compliance.validate_evidence(file_obj, ftype, ocr_text=ocr_text)

    submission_id = (request.data.get("submissionId") or "").strip()
    if submission_id:
        original = SubmissionEvidence.objects.filter(pk=submission_id, user_id=user.id).first()
        if original is None:
            return Response({"error": "submission not found"}, status=status.HTTP_404_NOT_FOUND)
        if str(original.status).upper() in ("RETURNED", "REJECTED"):
            return Response({"error": "Rejected submissions cannot be re-uploaded. Please submit a new compliance document."},
                            status=status.HTTP_400_BAD_REQUEST)
    submission = SubmissionEvidence(
        user=user,
        role="worker" if user.role == "worker" else "contractor",
        doc_type=ftype,
        site=site,
        period=period,
        employer=employer,
        state=state[:60],
        financial_year=financial_year[:12],
        month=month[:20],
        location=location[:120],
        document_type=document_type[:40],
        frequency=frequency[:40],
        is_mandatory=is_mandatory,
        original_name=file_obj.name if file_obj else "",
        file_size=file_obj.size if file_obj else 0,
        mime_type=file_obj.content_type if file_obj else "",
        checksum_sha256=checksum,
        ocr_accuracy=accuracy,
        validation_findings=findings,
    )
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

    # State / Site are derived from the uploaded master file when not supplied
    # (the CLRA generation form only asks for Year + Month).
    state = (request.data.get("state") or "").strip()
    if not state:
        from collections import Counter
        states = [str(r.get("state") or "").strip() for r in rows]
        states = [s for s in states if s]
        if states:
            state = Counter(states).most_common(1)[0][0]

    site_label = (request.data.get("site") or "").strip()
    if not site_label:
        for r in rows:
            candidate = str(r.get("site") or r.get("location") or "").strip()
            if candidate:
                site_label = candidate
                break

    site_ids = _contractor_site_ids(user)
    site = None
    if site_label:
        site = (Site.objects.filter(site_name=site_label).first()
                or Site.objects.filter(site_code=site_label).first())
    if site is None:
        row_sites = {str(r.get("site") or "").strip() for r in rows} - {""}
        if row_sites:
            site = (Site.objects.filter(id__in=site_ids, site_code__in=row_sites).first()
                    or Site.objects.filter(id__in=site_ids, site_name__in=row_sites).first())
    if site is None:
        site = Site.objects.filter(id__in=site_ids).order_by("id").first()

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
    # Only allow upload/generation for a state where the principal employer has
    # adopted CLRA register forms for its sites in that state.
    from .register_templates import (applicable_templates, employer_adopted_ids,
                                     gate_templates_by_adoption)
    adopted_ids = employer_adopted_ids(site.employer, state) if (site and site.employer_id and state) else set()
    if state and not adopted_ids:
        return Response(
            {"error": f"The principal employer has not adopted CLRA register forms for {state}. "
                      f"Upload/generation is disabled for sites in {state} until the employer adopts the forms."},
            status=status.HTTP_400_BAD_REQUEST)
    site_templates = gate_templates_by_adoption(
        applicable_templates(state)[0], site.employer if site else None, state) if state else []

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
    if freq_filter:
        site_templates = [
            t for t in site_templates if (_norm_freq(t.frequency) or "monthly") == freq_filter
        ]

    selected, skipped = [], []
    for template in site_templates:
        period = clra.reporting_period(month, year, template.frequency)
        if period["due"] or include_non_due:
            selected.append(template)
        else:
            skipped.append({"formCode": template.form_code, "title": template.title,
                            "frequency": template.frequency or "Monthly", "period": period["label"]})
    site_templates = selected

    templates = [
        {"formCode": t.form_code, "title": t.title, "state": t.state,
         "frequency": t.frequency or "Monthly",
         "period": clra.reporting_period(month, year, t.frequency)["label"],
         "columns": list(t.columns or []), "html": t.html or "",
         "act": t.act, "calculationRules": [
             {"targetField": r.target_field, "formula": r.formula}
             for r in t.calculation_rules.all()],
         "fieldMappings": {m.column: m.field_key for m in t.field_mappings.all()}}
        for t in site_templates
    ]
    generated_on = timezone.localdate()
    data = clra.build_workbook(
        rows, contractor=payloads._party_name(user),
        site=(site.site_name if site else site_label),
        site_code=(site.site_code if site else ""), state=state,
        financial_year=fy, month=month, year=year, registers=registers,
        generated_on=str(generated_on), templates=templates,
    )

    register_count = len(templates) or len(registers)

    batch = ComplianceBatch(
        contractor=user, site=site,
        financial_year=fy[:12], month=month[:20], year=year[:4], state=state[:60],
        employee_count=len(rows),
        location_count=len({r.get("location", "") for r in rows if r.get("location")}) or 1,
        generated_on=generated_on, generated_by=payloads._party_name(user),
        rows_count=len(rows),
        notes=(f"{register_count} register(s) generated from {len(rows)} worker row(s)"
               + (f"; {len(skipped)} not due this period: "
                  + ", ".join(f"{s['formCode']} ({s['frequency']})" for s in skipped[:6]) if skipped else "")),
        status="GENERATED",
    )
    stamp = f"{year or generated_on.year}-{month or generated_on.strftime('%b')}".replace(" ", "")
    batch.generated_file.save(
        f"clra-{stamp}-{(site.site_code if site else 'site')}.xlsx",
        ContentFile(data), save=False)
    master.seek(0)
    batch.master_file.save(os.path.basename(master.name or "master.xlsx"), master, save=False)
    signature = request.FILES.get("signature")
    if signature is not None:
        signature.seek(0)
        batch.signature_file.save(os.path.basename(signature.name or "signature"), signature, save=False)
    batch.save()
    return Response({"data": payloads._contractor_compliance_batch_row(batch)},
                    status=status.HTTP_201_CREATED)


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
    adopted = employer_adopted_ids(employer, state) if (employer is not None and state) else set()
    if state and not adopted:
        report["errors"].append({"row": 0, "field": "adoption",
                                 "message": f"The principal employer has not adopted CLRA registers for {state} — generation is blocked."})
    site_templates = (gate_templates_by_adoption(applicable_templates(state)[0], employer, state)
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


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def compliance_batch_summary(request, batch_id):
    """State/Site-wise drill-down of a generated batch."""
    from bss_core.models import ComplianceBatch
    batch = ComplianceBatch.objects.filter(pk=batch_id, contractor=request.user).first()
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
def compliance_batch_site_documents(request, batch_id):
    """Documents applicable to one site of a batch: employer mapping + state templates."""
    from bss_core.models import ComplianceBatch, EmployerDocumentMapping
    batch = ComplianceBatch.objects.filter(pk=batch_id, contractor=request.user).first()
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
    adopted = employer_adopted_ids(employer, state)
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
        selections = {s.form_name_id: s for s in EmployerFormSelection.objects.filter(
            employer=employer, is_active=True, form_name__in=catalog)}
        for obj in catalog:
            selection = selections.get(obj.id)
            if selection is None:
                continue
            documents.append({
                "purpose": obj.name, "form": obj.name, "templateId": None,
                "mandatory": bool(selection.is_mandatory), "frequency": obj.frequency,
                "outputFormat": "", "custom": True, "scope": "admin",
                "requiresDocument": bool(obj.requires_document),
            })
        for obj in CustomFormName.objects.filter(is_active=True, state__iexact=state,
                                                 employer=employer).order_by("sort_order", "name"):
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


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def compliance_batch_register(request, batch_id, template_id):
    """Render one register (a State+Form template) from a generated batch."""
    from api import clra
    from bss_core.models import ComplianceBatch, RegisterTemplate
    batch = ComplianceBatch.objects.filter(pk=batch_id, contractor=request.user).first()
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
         "fieldMappings": {m.column: m.field_key for m in template.field_mappings.all()},
         "calculationRules": [{"targetField": r.target_field, "formula": r.formula}
                              for r in template.calculation_rules.all()]},
        rows,
        contractor=payloads._party_name(request.user),
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
    from bss_core.models import ComplianceBatch, RegisterTemplate
    batch = ComplianceBatch.objects.filter(pk=batch_id, contractor=request.user).first()
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
        contractor=payloads._party_name(request.user), employer=employer_name,
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
    "compliance_batch_register",
    "compliance_batch_register_export",
    "compliance_batch_site_documents",
    "compliance_batch_summary",
    "contractor_clra_validate",
    "contractor_compliance_batches",
    "contractor_submissions",
    "submission_file_download",
    "submission_file_serve",
    "submission_file_token",
    "worker_submissions",
    "worker_verify_document",
]
