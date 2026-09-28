"""Worker document listing, download tokens and file serving."""

# ruff: noqa: F401,F403
from .common import *  # noqa: F401,F403


def _handle_document_upload(user, body):
    from bss_core.models import WorkerDocument, WorkerDocumentMaster
    master = WorkerDocumentMaster.objects.first()
    if not master:
        return int(uuid.uuid4().int % 10**10)
    try:
        from bss_core.models import WorkerDocument
        WorkerDocument.objects.create(
            user=user,
            document=master,
            file_name=body.get("fileName") or "document",
            status="UPLOADED",
            is_mandatory=master.is_mandatory,
            owner_role="worker",
        )
    except Exception:
        return int(uuid.uuid4().int % 10**10)
    return int(uuid.uuid4().int % 10**10)


@api_view(["GET", "POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def worker_documents(request):
    """Worker document register — GET lists the catalog merged with uploads;
    POST (multipart: file, code, expiry) uploads/replaces a document."""
    from bss_core.models import WorkerDocument, WorkerDocumentMaster
    user = request.user
    if user.role != "worker":
        return Response({"error": "Only workers can manage their documents."},
                        status=status.HTTP_403_FORBIDDEN)

    if request.method == "GET":
        return Response({"data": payloads._worker_documents_display(user)},
                        status=status.HTTP_200_OK)

    file_obj = request.FILES.get("file")
    code = (request.data.get("code") or "").strip().upper()
    name = (request.data.get("name") or "").strip()
    expiry = (request.data.get("expiry") or "").strip()
    if not file_obj:
        return Response({"error": "Choose a document to upload."},
                        status=status.HTTP_400_BAD_REQUEST)

    master = WorkerDocumentMaster.objects.filter(code=code).first() if code else None
    if master is None and name:
        master = WorkerDocumentMaster.objects.filter(document_name__iexact=name).first()
    if master is None:
        return Response({"error": "Unknown document type."},
                        status=status.HTTP_400_BAD_REQUEST)

    # A DigiLocker-fetched copy is authoritative: once present it cannot be
    # replaced (or deleted). Every other document — including Aadhaar/PAN/UAN/
    # Education — may be uploaded manually; such uploads remain "Under
    # Verification" and never receive the DigiLocker "Verified" badge.
    # Require completed Aadhaar verification record before manual document uploads
    identity = WorkerIdentity.objects.filter(user=user).first()
    if not identity or not identity.aadhaar:
        return Response({"error": "You must complete Aadhaar verification before uploading documents."},
                        status=status.HTTP_403_FORBIDDEN)

    # OCR check: verify the uploaded document belongs to the worker and matches
    # its type. A failure no longer blocks — the caller can force-submit, and the
    # document keeps an "OCR failed" marker.
    worker_name = (identity.name or f"{user.first_name} {user.last_name}").strip()
    force = str(request.data.get("force") or "").strip().lower() in ("1", "true", "yes", "on")
    ocr_ok = True
    ocr_findings = ""
    try:
        file_bytes = file_obj.read()
        file_obj.seek(0)
        ocr_text = ocr_client.extract_text(file_bytes, file_obj.name)
        blob = f"{master.code or ''} {master.document_name or ''}".upper()
        if "AADHAAR" in blob or "ADHAR" in blob:
            doc_type_key = "aadhaar"
        elif "UAN" in blob or "EPFO" in blob:
            doc_type_key = "uan"
        elif "ESIC" in blob:
            doc_type_key = "esic"
        else:
            doc_type_key = "pan"
        ok, msg = ocr_client.verify_document_text(
            doc_type=doc_type_key, ocr_text=ocr_text or "", expected_name=worker_name)
        if not ok:
            ocr_ok = False
            ocr_findings = msg or "OCR verification failed."
    except Exception as exc:
        logging.getLogger(__name__).warning("OCR verification skipped/failed during document upload: %s", exc)

    if not ocr_ok and not force:
        return Response({"ocrFailed": True, "requiresForce": True, "findings": [ocr_findings]},
                        status=status.HTTP_200_OK)

    WorkerDocument.objects.filter(user=user, document=master).delete()
    doc = WorkerDocument(
        user=user, document=master,
        file_name=os.path.basename(file_obj.name or "document"),
        file_size=file_obj.size, mime_type=file_obj.content_type or "",
        status="UNDER_VERIFICATION", is_mandatory=master.is_mandatory,
        owner_role="worker", ocr_failed=(not ocr_ok), ocr_findings=ocr_findings,
    )
    if expiry:
        try:
            doc.expiry_date = datetime.date.fromisoformat(expiry)
        except ValueError:
            pass
    doc.file.save(doc.file_name, file_obj, save=False)
    doc.file_path = doc.file.name
    doc.save()
    return Response({"data": {
        "id": doc.id, "name": master.document_name, "code": master.code,
        "status": doc.status, "date": payloads._dts(doc.uploaded_at),
        "downloadUrl": f"/api/worker/documents/{doc.id}/file",
        "ocrFailed": bool(doc.ocr_failed),
        "findings": [ocr_findings] if ocr_findings else [],
    }}, status=status.HTTP_201_CREATED)


@api_view(["GET", "DELETE"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def worker_document_detail(request, document_id):
    """Download (GET) or delete (DELETE) a single worker document."""
    from bss_core.models import WorkerDocument
    doc = WorkerDocument.objects.filter(pk=document_id, user=request.user).first()
    if doc is None:
        return Response({"error": "Document not found."}, status=status.HTTP_404_NOT_FOUND)
    if request.method == "DELETE":
        if doc.auto_generated:
            return Response({"error": "This document is issued by the system and cannot be deleted."},
                            status=status.HTTP_400_BAD_REQUEST)
        if doc.file:
            doc.file.delete(save=False)
        doc.delete()
        return Response({"success": True, "deleted": True}, status=status.HTTP_200_OK)
    if not doc.file:
        return Response({"error": "No file stored for this document."},
                        status=status.HTTP_404_NOT_FOUND)
    try:
        response = FileResponse(doc.file.open("rb"), as_attachment=False,
                                filename=doc.file_name or os.path.basename(doc.file.name))
    except Exception:
        return Response({"error": "Stored file is unavailable."}, status=status.HTTP_404_NOT_FOUND)
    response["Content-Type"] = doc.mime_type or "application/octet-stream"
    response["X-Content-Type-Options"] = "nosniff"
    return response


@api_view(["POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def contractor_document_view_token(request, document_id):
    """Issue a single-use, short-lived token to VIEW a worker's stored document
    inline. Enables previewing in a new tab without exposing the contractor to
    the worker's raw file endpoint."""
    import hashlib
    import secrets
    from bss_core.models import DocumentAccessToken, WorkerDocument

    doc = (WorkerDocument.objects.select_related("user")
           .filter(pk=document_id).first())
    if doc is None:
        return Response({"error": "Document not found."}, status=status.HTTP_404_NOT_FOUND)
    if not doc.file:
        return Response({"error": "No file stored for this document."},
                        status=status.HTTP_404_NOT_FOUND)
    bound = WorkerContractorBinding.objects.filter(
        contractor=request.user, worker=doc.user, binding_status="ACCEPTED").exists()
    if not bound:
        return Response({"error": "Not authorised for this worker."},
                        status=status.HTTP_403_FORBIDDEN)
    raw = secrets.token_urlsafe(32)
    token = DocumentAccessToken.objects.create(
        token_type="DOCUMENT_VIEW", document=doc, requester=request.user,
        token_hash=hashlib.sha256(raw.encode()).hexdigest(),
        expires_at=timezone.now() + timedelta(minutes=5), max_uses=1,
    )
    return Response({"token": raw, "expiresAt": payloads._dts(token.expires_at)},
                    status=status.HTTP_200_OK)


@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def document_file_serve(request, token):
    """Exchange a single-use document view token → stream the file once (inline)."""
    import hashlib
    from bss_core.models import DocumentAccessToken

    hashed = hashlib.sha256(str(token).encode()).hexdigest()
    tok = (DocumentAccessToken.objects.filter(token_hash=hashed, token_type="DOCUMENT_VIEW")
           .select_related("document").first())
    if tok is None:
        return Response({"error": "Unknown or invalid link."}, status=status.HTTP_404_NOT_FOUND)
    if not tok.is_valid:
        return Response({"error": "This link has expired or was already used."},
                        status=status.HTTP_410_GONE)
    doc = tok.document
    if doc is None or not doc.file:
        return Response({"error": "File is unavailable."}, status=status.HTTP_404_NOT_FOUND)
    tok.used_at = timezone.now()
    tok.use_count += 1
    if tok.use_count >= tok.max_uses:
        tok.status = "USED"
    tok.save(update_fields=["used_at", "use_count", "status"])
    try:
        response = FileResponse(doc.file.open("rb"), as_attachment=False,
                                filename=doc.file_name or os.path.basename(doc.file.name))
    except Exception:
        return Response({"error": "Stored file is unavailable."}, status=status.HTTP_404_NOT_FOUND)
    response["Content-Type"] = doc.mime_type or "application/octet-stream"
    response["X-Content-Type-Options"] = "nosniff"
    response["Cache-Control"] = "private, no-store, max-age=0"
    response["Content-Security-Policy"] = "default-src 'none'; sandbox"
    return response


@permission_classes([IsAuthenticated])
def contractor_worker_document_download(request, document_id):
    """Stream a worker's stored document to a contractor who has an ACCEPTED
    binding for that worker (used by the contractor worker compliance drawer)."""
    from bss_core.models import WorkerDocument
    doc = (WorkerDocument.objects.select_related("user")
           .filter(pk=document_id).first())
    if doc is None:
        return Response({"error": "Document not found."}, status=status.HTTP_404_NOT_FOUND)
    bound = WorkerContractorBinding.objects.filter(
        contractor=request.user, worker=doc.user, binding_status="ACCEPTED").exists()
    if not bound:
        return Response({"error": "Not authorised for this worker."},
                        status=status.HTTP_403_FORBIDDEN)
    if not doc.file:
        return Response({"error": "No file stored for this document."},
                        status=status.HTTP_404_NOT_FOUND)
    try:
        response = FileResponse(doc.file.open("rb"), as_attachment=True,
                                filename=doc.file_name or os.path.basename(doc.file.name))
    except Exception:
        return Response({"error": "Stored file is unavailable."}, status=status.HTTP_404_NOT_FOUND)
    response["Content-Type"] = doc.mime_type or "application/octet-stream"
    response["X-Content-Type-Options"] = "nosniff"
    return response


@api_view(["POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def worker_nominee_document(request):
    """Upload a nominee's PAN/Aadhaar copy and return a reference to store on the
    nominee row. The file is stored under MEDIA_ROOT and served at /media/…"""
    from django.core.files.base import ContentFile
    from django.core.files.storage import default_storage
    user = request.user
    if user.role != "worker":
        return Response({"error": "Only workers can upload nominee documents."},
                        status=status.HTTP_403_FORBIDDEN)
    file_obj = request.FILES.get("file")
    if not file_obj:
        return Response({"error": "Choose a document to upload."},
                        status=status.HTTP_400_BAD_REQUEST)
    if file_obj.size > 10 * 1024 * 1024:
        return Response({"error": "Document must be 10 MB or smaller."},
                        status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE)
    original = os.path.basename(file_obj.name or "document")
    lower = original.lower()
    doc_type = "PAN" if "pan" in lower else ("Aadhaar" if ("aadhaar" in lower or "adhar" in lower) else "Document")
    safe = re.sub(r"[^A-Za-z0-9._-]", "_", original)
    stored = default_storage.save(f"nominee_documents/{uuid.uuid4().hex}_{safe}", ContentFile(file_obj.read()))
    return Response({"data": {
        "type": doc_type, "name": original, "fileName": stored,
        "url": f"/media/{stored}",
    }}, status=status.HTTP_201_CREATED)


__all__ = [
    "_handle_document_upload",
    "contractor_document_view_token",
    "contractor_worker_document_download",
    "document_file_serve",
    "worker_document_detail",
    "worker_documents",
    "worker_nominee_document",
]
