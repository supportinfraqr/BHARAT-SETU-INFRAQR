"""Admin AI provider settings for the AI-assisted audit.

Admins store one API key per provider and choose the active provider + model.
Keys are encrypted at rest and only a masked preview is returned.
"""

# ruff: noqa: F401,F403
from .common import *  # noqa: F401,F403


def _require_admin(request):
    return request.user.role == "bss_admin"


def _credential_json(cred):
    from bss_core.models import AI_PROVIDERS

    meta = AI_PROVIDERS.get(cred.provider, {})
    return {
        "id": cred.id,
        "provider": cred.provider,
        "providerLabel": meta.get("label", cred.provider),
        "label": cred.label,
        "model": cred.model,
        "baseUrl": cred.base_url,
        "enabled": cred.enabled,
        "isDefault": cred.is_default,
        "hasKey": cred.has_key,
        "maskedKey": cred.masked_key,
        "updatedAt": cred.updated_at.isoformat() if cred.updated_at else None,
    }


def _apply(cred, body):
    from bss_core.models import AI_PROVIDERS

    provider = str(body.get("provider") or cred.provider or "").strip().lower()
    if provider not in AI_PROVIDERS:
        raise ValueError("Choose a valid AI provider.")
    cred.provider = provider
    cred.label = str(body.get("label") or "").strip() if body.get("label") is not None else cred.label
    cred.model = str(body.get("model") or cred.model or "").strip()
    if provider == "openrouter" and not cred.model:
        raise ValueError("OpenRouter requires a model id (for example deepseek/deepseek-v4.1-flash or openai/gpt-4o).")
    # Base URL: explicit value wins; else fall back to the provider default.
    if body.get("baseUrl") is not None:
        cred.base_url = str(body.get("baseUrl") or "").strip()
    elif not cred.base_url:
        cred.base_url = str(AI_PROVIDERS.get(provider, {}).get("baseUrl") or "")
    if body.get("enabled") is not None:
        cred.enabled = bool(body.get("enabled"))
    if body.get("clearKey"):
        cred.api_key_enc = ""
    elif body.get("apiKey") not in (None, ""):
        cred.set_api_key(str(body.get("apiKey")))
    return cred


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def admin_ai_catalog(request):
    """Provider catalog (id + label + default base URL) for the dropdowns."""
    from bss_core.models import AI_PROVIDERS

    if not _require_admin(request):
        return Response({"error": "Admins only."}, status=status.HTTP_403_FORBIDDEN)
    rows = [{"id": key, "label": value["label"], "baseUrl": value["baseUrl"]}
            for key, value in AI_PROVIDERS.items()]
    return Response({"data": rows})


@api_view(["GET", "POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def admin_ai_providers(request):
    """List (GET) or add (POST) AI provider credentials."""
    from bss_core.models import AiProviderCredential

    if not _require_admin(request):
        return Response({"error": "Admins only."}, status=status.HTTP_403_FORBIDDEN)

    if request.method == "GET":
        rows = AiProviderCredential.objects.all().order_by("-is_default", "provider", "id")
        return Response({"data": [_credential_json(c) for c in rows]})

    body = request.data if isinstance(request.data, dict) else {}
    cred = AiProviderCredential()
    try:
        _apply(cred, body)
    except ValueError as exc:
        return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    # First credential automatically becomes the default.
    if not AiProviderCredential.objects.exists():
        cred.is_default = True
    cred.save()
    return Response({"data": _credential_json(cred)}, status=status.HTTP_201_CREATED)


@api_view(["PUT", "PATCH", "DELETE"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def admin_ai_provider_detail(request, credential_id):
    """Update or delete one AI provider credential."""
    from bss_core.models import AiProviderCredential

    if not _require_admin(request):
        return Response({"error": "Admins only."}, status=status.HTTP_403_FORBIDDEN)
    cred = AiProviderCredential.objects.filter(pk=credential_id).first()
    if cred is None:
        return Response({"error": "Provider credential not found."}, status=status.HTTP_404_NOT_FOUND)

    if request.method == "DELETE":
        was_default = cred.is_default
        cred.delete()
        if was_default:
            nxt = AiProviderCredential.objects.filter(enabled=True).first() or AiProviderCredential.objects.first()
            if nxt is not None:
                nxt.is_default = True
                nxt.save(update_fields=["is_default", "updated_at"])
        return Response({"data": {"deleted": True, "id": credential_id}})

    body = request.data if isinstance(request.data, dict) else {}
    try:
        _apply(cred, body)
    except ValueError as exc:
        return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    cred.save()
    return Response({"data": _credential_json(cred)})


@api_view(["POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def admin_ai_provider_default(request, credential_id):
    """Mark one credential (provider + model) as the active audit engine."""
    from django.db import transaction

    from bss_core.models import AiProviderCredential

    if not _require_admin(request):
        return Response({"error": "Admins only."}, status=status.HTTP_403_FORBIDDEN)
    cred = AiProviderCredential.objects.filter(pk=credential_id).first()
    if cred is None:
        return Response({"error": "Provider credential not found."}, status=status.HTTP_404_NOT_FOUND)
    with transaction.atomic():
        AiProviderCredential.objects.filter(is_default=True).update(is_default=False)
        cred.is_default = True
        cred.enabled = True
        cred.save(update_fields=["is_default", "enabled", "updated_at"])
    return Response({"data": _credential_json(cred)})
