"""AI provider credentials for the admin AI-assisted audit.

Admins store one API key per provider (OpenAI, Anthropic, Gemini, …) and pick
the active provider + model used for audit analysis. Keys are encrypted at rest
and never returned to the browser (only a masked preview).
"""

from django.db import models

from bss_core.crypto import decrypt_secret, encrypt_secret, mask_secret

# Provider id -> display + default base URL. Model lists live in the frontend
# picker; the backend accepts any model string so new models work immediately.
AI_PROVIDERS = {
    "openai": {"label": "OpenAI", "baseUrl": "https://api.openai.com/v1"},
    "anthropic": {"label": "Anthropic", "baseUrl": "https://api.anthropic.com"},
    "google": {"label": "Google Gemini", "baseUrl": "https://generativelanguage.googleapis.com"},
    "azure": {"label": "Azure OpenAI", "baseUrl": ""},
    "deepseek": {"label": "DeepSeek", "baseUrl": "https://api.deepseek.com/v1"},
    "groq": {"label": "Groq", "baseUrl": "https://api.groq.com/openai/v1"},
    "mistral": {"label": "Mistral", "baseUrl": "https://api.mistral.ai/v1"},
    "openrouter": {"label": "OpenRouter", "baseUrl": "https://openrouter.ai/api/v1"},
    "custom": {"label": "Custom / self-hosted", "baseUrl": ""},
}

PROVIDER_CHOICES = [(key, value["label"]) for key, value in AI_PROVIDERS.items()]


class AiProviderCredential(models.Model):
    """One stored API key for an AI provider used by the audit engine."""

    provider = models.CharField(max_length=30, choices=PROVIDER_CHOICES)
    label = models.CharField(max_length=120, blank=True)
    model = models.CharField(max_length=120, blank=True)
    api_key_enc = models.CharField(max_length=600, blank=True, default="")
    base_url = models.CharField(max_length=300, blank=True)
    enabled = models.BooleanField(default=True)
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "ai_provider_credential"
        ordering = ["provider", "id"]

    def __str__(self):
        return f"{self.provider}:{self.model or '-'}"

    def set_api_key(self, raw: str) -> None:
        self.api_key_enc = encrypt_secret(raw)

    def get_api_key(self) -> str:
        return decrypt_secret(self.api_key_enc)

    @property
    def has_key(self) -> bool:
        return bool(self.api_key_enc)

    @property
    def masked_key(self) -> str:
        return mask_secret(self.get_api_key())


# ── Level-2 report prompt (admin-editable) ───────────────────────────────────
# Used by the submission "AI executive assessment". Placeholders are
# ``{{token}}`` (filled by compliance_verification._ai_assessment). Level 1
# (per-file) prompts are hardcoded in api/v1_bridge/ai_audit.py.
DEFAULT_REPORT_SYSTEM_PROMPT = (
    "You are a senior Indian labour-law compliance auditor for the Bharat Shram Setu (BSS) portal. "
    "Assess a contractor's submitted CLRA compliance package and reply with ONLY a compact JSON "
    "object — no prose, no markdown, no code fences. Ground every statement strictly in the numbers "
    "provided and never invent data. Use the C1-C8 classification (C1 compliant … C5 critical … "
    "C6 pending). Assign a realistic remediation owner from: Contractor, Compliance, HR, Payroll, "
    "Operations, Site Admin, Safety; and a due date within 30 days (YYYY-MM-DD)."
)

DEFAULT_REPORT_USER_PROMPT = (
    "Contractor: {{contractor}} · Principal employer: {{employer}}\n"
    "Site: {{site}} · Period: {{period}} · FY: {{fy}} · Ref: {{refNo}}\n\n"
    "Verification summary: applicable {{applicable}}, verified {{verified}}; "
    "coverage {{coverage}}%, overall compliance {{compliance}}%, exception rate "
    "{{exception}}%, critical rate {{critical}}%, pending {{pending}}%. "
    "Classification counts: {{counts}}.\n\n"
    "Per-parameter results:\n{{params}}\n\n"
    "File-level level-1 AI audits:\n{{files}}\n\n"
    "Return JSON with EXACTLY these keys: "
    '{"executive_summary": "board-ready 4-6 sentences", '
    '"key_findings": ["..."], '
    '"material_exceptions": [{"parameter": "", "classification": "C3|C4|C5", "issue": "", '
    '"corrective_action": "", "owner": "", "due_date": "YYYY-MM-DD"}], '
    '"recommendations": ["..."], '
    '"verdict": "Passed|Passed with observations|Needs attention"}. '
    "Only list a material exception where the parameter actually shows C3/C4/C5."
)


class AiReportPrompt(models.Model):
    """Admin-editable prompt for the Level-2 submission executive assessment.

    Blank fields fall back to the defaults above."""

    system_prompt = models.TextField(blank=True, default="")
    user_prompt = models.TextField(blank=True, default="")
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "ai_report_prompt"
        ordering = ["id"]

    @classmethod
    def load(cls):
        return cls.objects.order_by("id").first()

    def effective(self):
        system = (self.system_prompt or "").strip() or DEFAULT_REPORT_SYSTEM_PROMPT
        user = (self.user_prompt or "").strip() or DEFAULT_REPORT_USER_PROMPT
        return system, user

    def __str__(self):
        return "AI report prompt"

