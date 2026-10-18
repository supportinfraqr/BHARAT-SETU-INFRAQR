"""DeepSeek API layer (OpenAI-compatible chat-completions endpoint). The agent's only AI dependency.

Roles (config/deepseek.json -> "models"):
  classify  : decide what each document / page is
  extract   : read every document (text layer and/or page images) into structured fields
  audit     : give the verdict on every catalogue row and Remarks sub-check
  narrative : executive summary, key messages, auditor's opinion

Images are sent as base64 `image_url` blocks to a vision-capable model (deepseek-flash). Every
response is cached on disk by a hash of (model, messages), so re-running an audit on the same
files costs nothing and gives identical results.

Key:   export DEEPSEEK_API_KEY=sk-...     or config/deepseek.json {"api_key": "..."}
Test:  python -m bss_agent.deepseek_api --ping
"""

from __future__ import annotations

import argparse
import base64
import hashlib
import json
import os
import re
import threading
import time
from pathlib import Path

import requests

AGENT_ROOT = Path(__file__).resolve().parent.parent
DEFAULTS = {
    "base_url": "https://api.deepseek.com",
    "models": {"classify": "deepseek-flash", "extract": "deepseek-flash", "vision": "deepseek-flash",
               "audit": "deepseek-v4-pro", "narrative": "deepseek-v4-pro"},
    "temperature": 0.0, "max_tokens": 65536, "timeout_s": 600, "max_retries": 6, "max_parallel": 3,
    "image_detail": "high", "cache_dir": "cache/deepseek", "session_token_budget": 0,       # 0 = no budget cap
}


class DeepSeekError(RuntimeError):
    pass


class DeepSeekAuthError(DeepSeekError):
    """Key rejected (401) or account out of balance (402): no further call can succeed."""


class DeepSeekTruncated(DeepSeekError):
    """The answer hit max_tokens — the caller should ask for less (e.g. fewer pages)."""


class DeepSeekClient:
    def __init__(self, api_key: str | None = None, cfg_path: Path | None = None, **opts):
        cfg_file = cfg_path or AGENT_ROOT / "config" / "deepseek.json"
        file_cfg = json.loads(cfg_file.read_text(encoding="utf-8")) if cfg_file.exists() else {}
        self.cfg = {**DEFAULTS, **{k: v for k, v in file_cfg.items() if k != "api_key"}, **opts}
        self.cfg["models"] = {**DEFAULTS["models"], **file_cfg.get("models", {}), **opts.get("models", {})}
        env_base = os.environ.get("DEEPSEEK_BASE_URL")
        if env_base:
            self.cfg["base_url"] = env_base
        env_model = os.environ.get("DEEPSEEK_MODEL")
        if env_model:
            self.cfg["models"] = {role: env_model for role in self.cfg["models"]}
        self.api_key = (api_key or os.environ.get("DEEPSEEK_API_KEY") or file_cfg.get("api_key") or "").strip()
        if self.api_key.startswith("sk-REPLACE"):
            self.api_key = ""
        env_cache = os.environ.get("DEEPSEEK_CACHE_DIR")
        if env_cache:
            self.cfg["cache_dir"] = env_cache
        cache = Path(self.cfg["cache_dir"])
        self.cache_dir = cache if cache.is_absolute() else AGENT_ROOT / cache
        self.usage = {"calls": 0, "cached": 0, "prompt_tokens": 0, "completion_tokens": 0, "errors": 0}
        self.use_cache = True
        self.fatal: str | None = None          # set on 401 / 402: every later call fails fast
        self._lock = threading.Lock()
        self.log: list[dict] = []

    @property
    def available(self) -> bool:
        return bool(self.api_key)

    def model(self, role: str) -> str:
        return self.cfg["models"].get(role, DEFAULTS["models"]["extract"])

    # ------------------------------------------------------------------ low level
    def _cache_path(self, payload: dict) -> Path:
        # max_tokens is not part of the key: a complete answer (finish_reason "stop") is valid whatever the limit was
        key = {k: v for k, v in payload.items() if k != "max_tokens"}
        h = hashlib.sha256(json.dumps(key, sort_keys=True, ensure_ascii=False).encode()).hexdigest()
        return self.cache_dir / h[:2] / f"{h}.json"

    def _cache_get(self, cp: Path):
        try:
            return json.loads(cp.read_text(encoding="utf-8"))["content"]
        except (OSError, ValueError, KeyError, TypeError):
            return None                       # missing or corrupt cache entry -> ask again

    def _cache_put(self, cp: Path, tag: str, content: str):
        try:
            cp.parent.mkdir(parents=True, exist_ok=True)
            tmp = cp.with_suffix(f".{os.getpid()}.{threading.get_ident()}.tmp")
            tmp.write_text(json.dumps({"tag": tag, "content": content}, ensure_ascii=False), encoding="utf-8")
            os.replace(tmp, cp)
        except OSError:
            pass                              # an unwritable cache must never fail an audit

    @staticmethod
    def _retry_after(r, attempt: int) -> float:
        try:
            return min(120.0, float(r.headers.get("Retry-After")))
        except (TypeError, ValueError):       # absent, or an HTTP-date
            return float(min(60, 2 ** attempt))

    def _post(self, payload: dict, tag: str, validate=None) -> str:
        """POST to chat/completions. `validate(content)` must succeed before the answer is cached,
        so a malformed answer is never replayed from the cache."""
        cp = self._cache_path(payload)
        if self.use_cache and cp.exists():
            content = self._cache_get(cp)
            if content is not None:
                try:
                    if validate:
                        validate(content)
                    with self._lock:
                        self.usage["cached"] += 1
                    return content
                except DeepSeekError:
                    pass                      # bad cached answer -> ask again
        if not self.available:
            raise DeepSeekError("No DeepSeek API key (set DEEPSEEK_API_KEY or config/deepseek.json).")
        if self.fatal:
            raise DeepSeekAuthError(self.fatal)
        budget = int(self.cfg.get("session_token_budget") or 0)
        if budget and self.usage["prompt_tokens"] + self.usage["completion_tokens"] > budget:
            raise DeepSeekError("Session token budget exhausted (config/deepseek.json: session_token_budget).")
        url = self.cfg["base_url"].rstrip("/") + "/chat/completions"
        headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}
        last = ""
        for attempt in range(self.cfg["max_retries"] + 1):
            t0 = time.time()
            try:
                r = requests.post(url, headers=headers, json=payload, timeout=self.cfg["timeout_s"])
            except requests.RequestException as exc:
                last = f"network error: {type(exc).__name__}"
                time.sleep(min(60, 2 ** attempt))
                continue
            if r.status_code == 401:
                self.fatal = f"DeepSeek rejected the API key ending …{self.api_key[-4:]} (401) — create a new key at platform.deepseek.com."
                raise DeepSeekAuthError(self.fatal)
            if r.status_code == 402:
                self.fatal = "DeepSeek account has insufficient balance (402) — top up at platform.deepseek.com."
                raise DeepSeekAuthError(self.fatal)
            if r.status_code == 400 and "response_format" in payload and "json" in r.text.lower():
                payload = {k: v for k, v in payload.items() if k != "response_format"}  # model refuses JSON mode
                continue
            if r.status_code in (408, 409, 425, 429, 500, 502, 503, 504):
                last = f"HTTP {r.status_code}"
                time.sleep(self._retry_after(r, attempt))
                continue
            if r.status_code != 200:
                raise DeepSeekError(f"DeepSeek HTTP {r.status_code}: {r.text[:300]}")
            try:
                body = r.json()
                choice = body["choices"][0]
                content = (choice.get("message") or {}).get("content") or ""
            except (ValueError, KeyError, IndexError, TypeError, AttributeError):
                last = "malformed response body"
                time.sleep(min(30, 2 ** attempt))
                continue
            u = body.get("usage") if isinstance(body.get("usage"), dict) else {}
            with self._lock:
                self.usage["calls"] += 1
                self.usage["prompt_tokens"] += int(u.get("prompt_tokens") or 0)
                self.usage["completion_tokens"] += int(u.get("completion_tokens") or 0)
                self.log.append({"tag": tag, "model": payload["model"], "seconds": round(time.time() - t0, 1),
                                 "prompt_tokens": u.get("prompt_tokens", 0), "completion_tokens": u.get("completion_tokens", 0),
                                 "finish_reason": choice.get("finish_reason")})
            if choice.get("finish_reason") == "length":
                raise DeepSeekTruncated(f"answer truncated at max_tokens ({payload.get('max_tokens')})")
            if validate:
                validate(content)             # raises DeepSeekError -> not cached
            if self.use_cache:
                self._cache_put(cp, tag, content)
            return content
        with self._lock:
            self.usage["errors"] += 1
        raise DeepSeekError(f"DeepSeek: retries exhausted ({last})")

    def chat(self, role: str, system: str, user: str | list, *, json_mode=True, max_tokens: int | None = None,
             tag: str = "", validate=None) -> str:
        payload = {"model": self.model(role), "temperature": self.cfg["temperature"],
                   "max_tokens": max_tokens or self.cfg["max_tokens"],
                   "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}]}
        if json_mode:
            payload["response_format"] = {"type": "json_object"}
        think = (self.cfg.get("thinking") or {}).get(role)          # "enabled" / "disabled"; absent = model default
        if think in ("enabled", "disabled"):
            payload["thinking"] = {"type": think}
        effort = (self.cfg.get("reasoning_effort") or {}).get(role)  # "low" / "high" / "max"
        if effort and think != "disabled":
            payload["reasoning_effort"] = effort
        return self._post(payload, tag or role, validate)

    def chat_json(self, role: str, system: str, user: str | list, **kw) -> dict:
        """Always returns a dict (DeepSeekError otherwise); invalid answers are never cached."""
        txt = self.chat(role, system, user, json_mode=True, validate=parse_json, **kw)
        return parse_json(txt)

    # ------------------------------------------------------------------ helpers
    def image_block(self, path: str, max_side: int | None = None) -> dict:
        from .ingest import image_bytes
        b64 = base64.b64encode(image_bytes(path, max_side)).decode()
        return {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64}", "detail": self.cfg["image_detail"]}}

    def check_key(self) -> dict:
        """Free checks (no tokens): GET /models and /user/balance. Returns {ok, message, models, balance}."""
        if not self.available:
            return {"ok": False, "message": "No API key saved or entered."}
        base = self.cfg["base_url"].rstrip("/")
        h = {"Authorization": f"Bearer {self.api_key}"}
        try:
            r = requests.get(base + "/models", headers=h, timeout=30)
        except requests.RequestException as exc:
            return {"ok": False, "message": f"Cannot reach {base}: {type(exc).__name__}"}
        if r.status_code == 401:
            return {"ok": False, "message": f"DeepSeek says the key ending …{self.api_key[-4:]} is invalid (401). Create a new key at platform.deepseek.com/api_keys."}
        if r.status_code != 200:
            return {"ok": False, "message": f"DeepSeek HTTP {r.status_code}: {r.text[:200]}"}
        try:
            models = [m.get("id") for m in r.json().get("data", [])]
        except ValueError:
            models = []
        bal = ""
        try:
            b = requests.get(base + "/user/balance", headers=h, timeout=30)
            if b.status_code == 200:
                j = b.json()
                infos = j.get("balance_infos") or []
                bal = ", ".join(f"{x.get('total_balance')} {x.get('currency')}" for x in infos) or ""
                if j.get("is_available") is False:
                    return {"ok": False, "message": f"Key is valid but the account balance is not available ({bal or 'no balance'}) — top up.", "models": models}
        except (requests.RequestException, ValueError):
            pass
        missing = [m for m in set(self.cfg["models"].values()) if models and m not in models]
        msg = f"Key …{self.api_key[-4:]} valid · models: {', '.join(models) or 'n/a'}" + (f" · balance {bal}" if bal else "")
        if missing:
            msg += f" · WARNING: configured model(s) not offered by this account: {', '.join(missing)}"
        return {"ok": not missing, "message": msg, "models": models, "balance": bal}

    def ping(self) -> str:
        return self.chat("extract", "Reply with JSON {\"ok\": true}.", "ping", max_tokens=2000, tag="ping")


def parse_json(txt: str) -> dict:
    """The answer as a JSON object. Lists, strings, numbers or broken JSON raise DeepSeekError."""
    txt = re.sub(r"^```(?:json)?\s*|\s*```$", "", (txt or "").strip())
    obj = None
    try:
        obj = json.loads(txt)
    except json.JSONDecodeError:
        m = re.search(r"\{.*\}", txt, re.S)
        if m:
            try:
                obj = json.loads(m.group(0))
            except json.JSONDecodeError:
                obj = None
    if not isinstance(obj, dict):
        raise DeepSeekError("DeepSeek did not return a valid JSON object")
    return obj


def as_dict(v) -> dict:
    return v if isinstance(v, dict) else {}


def as_list(v) -> list:
    return v if isinstance(v, list) else []


def as_str(v) -> str:
    return "" if v is None else v if isinstance(v, str) else json.dumps(v, ensure_ascii=False) if isinstance(v, (dict, list)) else str(v)


def main(argv=None):
    ap = argparse.ArgumentParser(description="DeepSeek connectivity test")
    ap.add_argument("--ping", action="store_true")
    ap.add_argument("--image", help="send one image and ask DeepSeek to read it (vision test)")
    a = ap.parse_args(argv)
    c = DeepSeekClient()
    if not c.available:
        print("No key: set DEEPSEEK_API_KEY or create config/deepseek.json")
        return 1
    if a.image:
        out = c.chat_json("vision", "Read the document image. Return JSON {\"document\": str, \"text\": str}.",
                          [{"type": "text", "text": "Transcribe this page."}, c.image_block(a.image)], tag="vision-test")
        print(json.dumps(out, indent=2, ensure_ascii=False))
    else:
        print("DeepSeek replied:", c.ping())
    print("usage:", c.usage)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
