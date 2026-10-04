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
