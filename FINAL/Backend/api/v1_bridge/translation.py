"""Machine-translation bridge + admin settings.

The web/mobile frontends POST the English strings that are not covered by a
curated dictionary entry to ``/v1/translate``; the backend translates them via
Google and caches the result. Admins choose the engine (free endpoint or the
official Google Cloud Translation API with an API key).
"""

# ruff: noqa: F401,F403
from .common import *  # noqa: F401,F403

from .. import translation_client


def _require_admin(request):
    return getattr(request.user, "role", None) == "bss_admin"


def _client_ip(request):
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR") or ""
    return (forwarded.split(",")[0] or request.META.get("REMOTE_ADDR") or "unknown").strip()


def _rate_limited(request):
    """Cheap per-IP throttle so the public endpoint can't be abused as a free
    translation proxy."""
    key = f"tr:rl:{_client_ip(request)}"
    try:
        count = cache.get(key, 0)
    except Exception:  # noqa: BLE001 - never fail the request on cache issues
        return False
    if count >= 600:
        return True
    try:
        cache.set(key, count + 1, 60)
    except Exception:  # noqa: BLE001
        pass
    return False


def _settings_json(setting):
    return {
        "mode": setting.mode,
        "enabled": setting.enabled,
        "hasKey": setting.has_key,
        "maskedKey": setting.masked_key,
        "languages": sorted(translation_client.SUPPORTED_LANGUAGES),
    }


@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def translate_config(request):
    """Public engine info (no key) so the client can pick a strategy."""
    from bss_core.models import TranslationSetting

    setting = TranslationSetting.load()
    return Response({"data": {"mode": setting.mode, "enabled": setting.enabled}})


@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def translate(request):
    """Translate a batch of UI strings into a target language."""
    if _rate_limited(request):
        return Response({"error": "Too many translation requests. Try again shortly."}, status=status.HTTP_429_TOO_MANY_REQUESTS)
    body = request.data if isinstance(request.data, dict) else {}
    target = str(body.get("target") or "").strip().lower()
    source = str(body.get("source") or "en").strip().lower() or "en"
    texts = body.get("texts")
    if target not in translation_client.SUPPORTED_LANGUAGES:
        return Response({"error": "Unsupported target language."}, status=status.HTTP_400_BAD_REQUEST)
    if not isinstance(texts, list) or not texts:
        return Response({"error": "Provide a list of texts to translate."}, status=status.HTTP_400_BAD_REQUEST)
    try:
        translations = translation_client.translate_texts(texts, target, source)
    except ValueError as exc:
        return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    return Response({"data": translations})


@api_view(["GET", "PUT"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def admin_translation_settings(request):
    """Read (GET) or update (PUT) the machine-translation engine settings."""
    from bss_core.models import TranslationSetting

    if not _require_admin(request):
        return Response({"error": "Admins only."}, status=status.HTTP_403_FORBIDDEN)

    setting = TranslationSetting.load()
    if request.method == "GET":
        return Response({"data": _settings_json(setting)})

    body = request.data if isinstance(request.data, dict) else {}
    mode = str(body.get("mode") or setting.mode or "free").strip().lower()
    if mode not in {"free", "google_cloud"}:
        return Response({"error": "Choose a valid translation engine."}, status=status.HTTP_400_BAD_REQUEST)
    setting.mode = mode
    if body.get("enabled") is not None:
        setting.enabled = bool(body.get("enabled"))
    if body.get("clearKey"):
        setting.api_key_enc = ""
    elif body.get("apiKey") not in (None, ""):
        setting.set_api_key(str(body.get("apiKey")))
    setting.save()
    return Response({"data": _settings_json(setting)})
