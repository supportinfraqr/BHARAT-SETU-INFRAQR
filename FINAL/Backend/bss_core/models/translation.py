"""Machine-translation settings (singleton).

Controls how the UI strings that are not covered by a curated dictionary entry
are translated at runtime:

* ``free`` — the free (unofficial) Google endpoint, no key required.
* ``google_cloud`` — the official Google Cloud Translation API, using the
  admin-provided API key (stored encrypted, never returned to the browser).
"""

from django.db import models

from bss_core.crypto import decrypt_secret, encrypt_secret, mask_secret

TRANSLATION_MODES = {
    "free": "Free (unofficial) Google endpoint",
    "google_cloud": "Google Cloud Translation API",
}

MODE_CHOICES = [(key, label) for key, label in TRANSLATION_MODES.items()]


class TranslationSetting(models.Model):
    """Singleton row holding the active translation engine + optional key."""

    mode = models.CharField(max_length=20, choices=MODE_CHOICES, default="free")
    api_key_enc = models.CharField(max_length=600, blank=True, default="")
    enabled = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "translation_setting"

    def __str__(self):
        return f"translation:{self.mode}"

    @classmethod
    def load(cls) -> "TranslationSetting":
        return cls.objects.order_by("id").first() or cls()

    def set_api_key(self, raw: str) -> None:
        self.api_key_enc = encrypt_secret(raw)

    def get_api_key(self) -> str:
        return decrypt_secret(self.api_key_enc)

    @property
    def has_key(self) -> bool:
        return bool(self.api_key_enc)

    @property
    def masked_key(self) -> str:
        return mask_secret(self.get_api_key()) if self.api_key_enc else ""
