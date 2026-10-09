"""Machine translation via Google.

The default engine is the free (unofficial) Google endpoint
(``translate.googleapis.com/translate_a/single``) — the same one the worker
grievance page already uses. An admin can switch to the official Google Cloud
Translation API by storing a key (see ``TranslationSetting``).

Results are cached in the shared Redis cache (or local memory when Redis is
unset) so a given string is translated once per target language.
"""

import hashlib
import html
import logging
from concurrent.futures import ThreadPoolExecutor

import requests
from django.conf import settings
from django.core.cache import cache

logger = logging.getLogger(__name__)

# The 16 UI locales defined in the frontend (src/i18n/config.ts). Backend keeps
# its own copy so it can validate requests without importing the frontend.
SUPPORTED_LANGUAGES = {
    "en", "hi", "bn", "te", "mr", "ta", "ur", "gu",
    "kn", "or", "ml", "pa", "as", "mai", "sat", "ks",
}

FREE_ENDPOINT = "https://translate.googleapis.com/translate_a/single"
CLOUD_ENDPOINT = "https://translation.googleapis.com/language/translate/v2"

CACHE_TTL = int(getattr(settings, "BSS_TRANSLATION_CACHE_TTL_SEC", 60 * 60 * 24 * 30))
MAX_TEXTS = 200
MAX_TEXT_LEN = 2000
_FREE_WORKERS = 6


def _cache_key(target: str, source: str, text: str) -> str:
    digest = hashlib.sha1(text.encode("utf-8")).hexdigest()
    return f"tr:{target}:{source}:{digest}"


def _is_translatable(text: str) -> bool:
    """False for blanks, single characters, and pure numbers/symbols.

    Those are left untouched (IDs, amounts, punctuation) so we don't waste
    calls or mangle them.
    """
    stripped = text.strip()
    if len(stripped) < 2:
        return False
    return any(ch.isalpha() for ch in stripped)


def _setting():
    from bss_core.models import TranslationSetting

    return TranslationSetting.load()


def _free_translate(text: str, target: str, source: str) -> str:
    params = {
        "client": "gtx",
        "sl": source or "auto",
        "tl": target,
        "dt": "t",
        "q": text,
    }
    response = requests.get(FREE_ENDPOINT, params=params, timeout=10)
    response.raise_for_status()
    payload = response.json()
    segments = payload[0] or []
    return "".join(segment[0] for segment in segments if segment and segment[0])


def _cloud_translate(texts, target: str, source: str, key: str):
    body = {"q": list(texts), "target": target, "format": "text"}
    if source:
        body["source"] = source
    response = requests.post(f"{CLOUD_ENDPOINT}?key={key}", json=body, timeout=20)
    response.raise_for_status()
    payload = response.json()
    items = (payload.get("data") or {}).get("translations") or []
    # The Cloud API HTML-escapes entities (&quot;, &#39;); undo that.
    return [html.unescape(item.get("translatedText", "")) for item in items]


def translate_texts(texts, target: str, source: str = "en"):
    """Translate a list of strings, preserving order.

    Returns the original text for any item that cannot be translated (blank,
    unambiguous symbol run, disabled feature, or an upstream error).
    """
    values = [str(item if item is not None else "")[:MAX_TEXT_LEN] for item in (texts or [])][:MAX_TEXTS]
    if not values:
        return []

    target = (target or "").strip().lower()
    source = (source or "en").strip().lower() or "en"
    if target not in SUPPORTED_LANGUAGES:
        raise ValueError("Unsupported target language.")
    if target == source:
        return list(values)

    setting = _setting()
    if not setting.enabled:
        return list(values)

    results = [None] * len(values)
    pending = []
    for index, text in enumerate(values):
        if not _is_translatable(text):
            results[index] = text
            continue
        cached = cache.get(_cache_key(target, source, text))
        if cached is not None:
            results[index] = cached
        else:
            pending.append((index, text))

    if not pending:
        return results

    use_cloud = setting.mode == "google_cloud" and setting.has_key
    try:
        if use_cloud:
            translated = _cloud_translate([text for _, text in pending], target, source, setting.get_api_key())
            for (index, _), value in zip(pending, translated):
                results[index] = value
        else:
            with ThreadPoolExecutor(max_workers=_FREE_WORKERS) as pool:
                values_ = list(pool.map(lambda item: _free_translate(item[1], target, source), pending))
            for (index, _), value in zip(pending, values_):
                results[index] = value
    except Exception as exc:  # noqa: BLE001 - degrade to English, never 500
        logger.warning("Translation to %s failed: %s", target, exc)

    for index, text in pending:
        value = results[index]
        if value:
            cache.set(_cache_key(target, source, text), value, CACHE_TTL)
        else:
            results[index] = text
    return results
