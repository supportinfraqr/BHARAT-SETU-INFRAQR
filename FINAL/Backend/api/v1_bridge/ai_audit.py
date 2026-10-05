"""AI-assisted document audit for contractor compliance evidence.

When a contractor uploads an evidence document, instead of OCR checkpoints we:
  1. check the file FORMAT matches what the form requires (PDF/DOC for
     registers & forms, Excel/CSV for data sheets);
  2. extract the document's text (spreadsheets natively, everything else via the
     existing OCR pipeline);
  3. ask the AI provider configured in Admin -> AI Audit Settings to audit the
     content and return structured findings.

The result is shown in the UI; the contractor then saves/submits.
"""

# ruff: noqa: F401,F403
import io
import json
import re

from .common import *  # noqa: F401,F403


def _allowed_exts(spec):
    """Parse a required-format hint into a set of extensions (None = any)."""
    s = str(spec or "").lower().strip()
    if not s or s in ("-", "—", "none"):
        return None
    exts = set()
    if "excel" in s or "xls" in s or "spreadsheet" in s:
        exts |= {"xlsx", "xlsm", "xls", "csv"}
    if "pdf" in s:
        exts.add("pdf")
    if "doc" in s or "word" in s:
        exts |= {"doc", "docx"}
    if "jpg" in s or "jpeg" in s or "png" in s or "image" in s:
        exts |= {"jpg", "jpeg", "png"}
    return exts or None


def _extract_text(data, name):
    """Best-effort text extraction: spreadsheets natively, else OCR."""
    n = str(name or "").lower()
    try:
        if n.endswith((".xlsx", ".xlsm")):
            import openpyxl

            wb = openpyxl.load_workbook(io.BytesIO(data), read_only=True, data_only=True)
            parts = []
            for ws in wb.worksheets:
                parts.append(f"# Sheet: {ws.title}")
                for row in ws.iter_rows(values_only=True):
                    cells = [str(c) for c in row if c is not None]
                    if cells:
                        parts.append(" | ".join(cells))
            return "\n".join(parts)[:20000]
        if n.endswith(".csv"):
            return data.decode("utf-8", "ignore")[:20000]
        if n.endswith(".docx"):
            import zipfile

            with zipfile.ZipFile(io.BytesIO(data)) as z:
                xml = z.read("word/document.xml").decode("utf-8", "ignore")
            return re.sub(r"<[^>]+>", " ", xml)[:20000]
        # pdf / images -> OCR
        from .. import ocr_client

        return ocr_client.extract_text(data, name)[:20000]
    except Exception as exc:  # noqa: BLE001
        return f"__EXTRACT_ERROR__{exc}"


def _default_credential():
    from bss_core.models import AiProviderCredential

    return (AiProviderCredential.objects.filter(is_default=True, enabled=True).first()
            or AiProviderCredential.objects.filter(enabled=True).order_by("id").first())


def _call_provider(cred, system, prompt, timeout=60):
    import requests

    from bss_core.models import AI_PROVIDERS

    provider = cred.provider
    key = cred.get_api_key()
    model = cred.model
    base = (cred.base_url or AI_PROVIDERS.get(provider, {}).get("baseUrl", "")).rstrip("/")
    if provider == "anthropic":
        url = f"{base or 'https://api.anthropic.com'}/v1/messages"
        resp = requests.post(url, headers={
            "x-api-key": key, "anthropic-version": "2023-06-01", "Content-Type": "application/json",
        }, json={"model": model, "max_tokens": 1200, "system": system,
                 "messages": [{"role": "user", "content": prompt}]}, timeout=timeout)
        resp.raise_for_status()
        return resp.json()["content"][0]["text"]
    if provider == "google":
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"
        resp = requests.post(url, json={
            "system_instruction": {"parts": [{"text": system}]},
            "contents": [{"parts": [{"text": prompt}]}],
        }, timeout=timeout)
        resp.raise_for_status()
        return resp.json()["candidates"][0]["content"]["parts"][0]["text"]
    if provider == "azure":
        url = f"{base}/openai/deployments/{model}/chat/completions?api-version=2024-02-15-preview"
        headers = {"api-key": key, "Content-Type": "application/json"}
    else:  # openai / groq / mistral / openrouter / custom (OpenAI-compatible)
        url = f"{base}/chat/completions"
        headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}
    resp = requests.post(url, headers=headers, json={
        "model": model, "temperature": 0,
        "messages": [{"role": "system", "content": system}, {"role": "user", "content": prompt}],
    }, timeout=timeout)
    resp.raise_for_status()
    return resp.json()["choices"][0]["message"]["content"]


def _parse_json_block(raw):
    if not raw:
        return None
    match = re.search(r"\{.*\}", raw, re.S)
    if not match:
        return None
    try:
        return json.loads(match.group(0))
    except Exception:  # noqa: BLE001
        return None


def _format_checks(checkpoints):
    """Render an admin AI checklist into prompt lines."""
    lines = []
    for cp in checkpoints or []:
        if not isinstance(cp, dict):
            continue
        label = str(cp.get("label") or cp.get("key") or cp.get("type") or "").strip()
        if not label:
            continue
        value = str(cp.get("value") or "").strip()
        required = "required" if cp.get("required", True) else "optional"
        lines.append(f"- {label}" + (f" (expected: {value})" if value else "") + f" [{required}]")
    return "\n".join(lines)


def _run_ai_audit(form_name, text, required_format, site_name="", extra=None):
    from bss_core.models import AI_PROVIDERS

    extra = extra or {}
    cred = _default_credential()
    if cred is None or not cred.has_key:
        return {"status": "unavailable",
                "message": "No AI provider is configured. Add one in Admin → AI Audit Settings."}
    if not text.strip():
        return {"status": "unavailable", "message": "No readable text could be extracted from this document."}

    checks = _format_checks(extra.get("aiChecks"))
    if str(extra.get("docKind") or "").lower() == "register":
        system = (
            "You are a strict Indian labour-law compliance auditor for the Bharat Shram Setu (BSS) portal. "
            "You verify that an uploaded statutory REGISTER is the correct register, that it MATCHES the "
            "required template (headings + structure), that its rows are consistent with the employer's "
            "master data, and that every listed condition is met. Reply ONLY with a compact JSON object."
        )
        columns = extra.get("templateColumns") or []
        if isinstance(columns, list):
            columns = ", ".join(str(c) for c in columns)
        mappings = extra.get("fieldMappings") or []
        mapped = "; ".join(f"{m.get('column')} ← {m.get('fieldKey')}" for m in mappings if isinstance(m, dict))
        prompt = (
            f"Required register: {extra.get('templateTitle') or form_name}\n"
            f"Table: Master file (site data) × {extra.get('period') or ''} ({extra.get('state') or ''})\n"
            f"Template columns (the register MUST contain these headings): {columns or 'not specified'}\n"
            f"Master-data field mapping: {mapped or 'not specified'}\n"
            f"Required conditions (verify each):\n{checks or '- none specified'}\n"
            f"Site: {site_name or 'n/a'}\n"
            f"Expected file format: {required_format or 'PDF / Excel'}\n\n"
            "Compare the uploaded register to the template (columns + structure) AND to the employer's "
            "master data. Verify:\n"
            " - it is the correct register/form for this state & period,\n"
            " - it MATCHES the template: the required column headings are present (list any missing),\n"
            " - each required condition above is met (report per condition),\n"
            " - the rows look like the site's master data (worker names / BSS IDs / wages / dates),\n"
            " - totals/period/state are consistent.\n"
            'Set "templateConformant" false if any required template column heading is missing.\n'
            "Return JSON with exactly these keys: "
            '{"valid": true|false, "templateConformant": true|false, "confidence": 0-100, '
            '"summary": "one line", "matchedColumns": ["..."], "missing": ["..."], "issues": ["..."], '
            '"findings": ["..."], "checkpointResults": [{"label": "...", "passed": true|false, "detail": "..."}]}.\n\n'
            "----- UPLOADED REGISTER TEXT (may be OCR, ignore minor noise) -----\n"
            f"{text}"
        )
    else:
        system = (
            "You are a strict Indian labour-law compliance auditor for the Bharat Shram Setu (BSS) portal. "
            "You verify that an uploaded document genuinely is the required statutory form, that its content "
            "looks correct and complete, and that every listed condition is met. Reply ONLY with a compact "
            "JSON object."
        )
        prompt = (
            f"Required document: {form_name}\n"
            f"Expected file format: {required_format or 'not specified'}\n"
            f"Required conditions (verify each):\n{checks or '- none specified'}\n"
            f"Site: {site_name or 'n/a'}\n\n"
            "Audit the extracted document text below. Decide whether it is the correct document, whether its "
            "content is plausible/complete, and whether each required condition is met (report per condition).\n"
            "Return JSON with exactly these keys: "
            '{"valid": true|false, "confidence": 0-100, "summary": "one line", '
            '"findings": ["..."], "missing": ["..."], "issues": ["..."], '
            '"checkpointResults": [{"label": "...", "passed": true|false, "detail": "..."}]}.\n\n'
            "----- DOCUMENT TEXT (may be OCR, so ignore minor noise) -----\n"
            f"{text}"
        )
    try:
        raw = _call_provider(cred, system, prompt)
    except Exception as exc:  # noqa: BLE001
        return {"status": "error", "message": f"AI audit failed: {exc}",
                "provider": cred.provider, "model": cred.model}
    parsed = _parse_json_block(raw) or {}
    results = parsed.get("checkpointResults") or []
    # Enforce the checklist: a failed REQUIRED checkpoint (or a missing required
    # template column) fails the file regardless of what the model set `valid` to.
    required_labels = {
        str(cp.get("label") or "").strip().lower()
        for cp in (extra.get("aiChecks") or [])
        if isinstance(cp, dict) and cp.get("required", True) and str(cp.get("label") or "").strip()
    }
    required_failed = any(
        isinstance(r, dict) and r.get("passed") is False
        and str(r.get("label") or "").strip().lower() in required_labels
        for r in results
    )
    valid = parsed.get("valid")
    if required_failed or parsed.get("templateConformant") is False:
        valid = False
    status = "passed" if valid is True else "failed" if valid is False else "review"
    if status == "review" and parsed.get("templateConformant") is False:
        status = "failed"
    return {
        "status": status,
        "valid": valid,
        "templateConformant": parsed.get("templateConformant"),
        "confidence": parsed.get("confidence"),
        "summary": parsed.get("summary") or (raw[:400] if raw else ""),
        "findings": parsed.get("findings") or [],
        "matchedColumns": parsed.get("matchedColumns") or [],
        "missing": parsed.get("missing") or [],
        "issues": parsed.get("issues") or [],
        "checkpointResults": results,
        "provider": cred.provider,
        "providerLabel": AI_PROVIDERS.get(cred.provider, {}).get("label", cred.provider),
        "model": cred.model,
    }


@api_view(["POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def contractor_audit_document(request):
    """Check format, read the content and AI-audit one uploaded evidence file."""
    if request.user.role != "contractor":
        return Response({"error": "Only contractors can audit compliance documents."},
                        status=status.HTTP_403_FORBIDDEN)
    upload = request.FILES.get("file") or request.FILES.get("document")
    if upload is None:
        return Response({"error": "Choose a document to audit."}, status=status.HTTP_400_BAD_REQUEST)
    form_name = str(request.data.get("formName") or request.data.get("documentType") or "").strip()
    required_format = str(request.data.get("requiredFormat") or "").strip()
    site_name = str(request.data.get("site") or "").strip()

    name = upload.name or "document"
    ext = name.rsplit(".", 1)[-1].lower() if "." in name else ""
    allowed = _allowed_exts(required_format)
    format_ok = True if allowed is None else (ext in allowed)

    data = upload.read()
    text = _extract_text(data, name)
    extract_error = ""
    if text.startswith("__EXTRACT_ERROR__"):
        extract_error = text.replace("__EXTRACT_ERROR__", "")
        text = ""

    def _json_list(value):
        try:
            parsed = json.loads(value) if isinstance(value, str) else value
            return parsed if isinstance(parsed, list) else []
        except Exception:  # noqa: BLE001
            return []

    extra = {
        "docKind": request.data.get("docKind"),
        "templateTitle": request.data.get("templateTitle"),
        "templateColumns": _json_list(request.data.get("templateColumns")),
        "fieldMappings": _json_list(request.data.get("fieldMappings")),
        "period": request.data.get("period"),
        "state": request.data.get("state"),
        "aiChecks": _json_list(request.data.get("aiChecks")) or _json_list(request.data.get("ocrCheckpoints")),
    }
    audit = _run_ai_audit(form_name, text, required_format, site_name, extra)
    return Response({"data": {
        "file": name,
        "format": ext,
        "formatOk": format_ok,
        "allowedFormats": sorted(allowed) if allowed else [],
        "chars": len(text),
        "extractError": extract_error,
        "ai": audit,
    }}, status=status.HTTP_200_OK)
