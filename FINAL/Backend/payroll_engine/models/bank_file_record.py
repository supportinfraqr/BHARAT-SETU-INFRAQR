"""Port of ``models/payroll/bankFileRecord.js`` (schema ``BankFileRecord``).

The legacy schema has no ``organizationId`` (it lived in the per-org database); here the
owning org is the inherited ``org`` FK. ``content`` (Mongo ``Buffer``) is a
``BinaryField``; ``to_dict()`` serialises it like ``JSON.stringify(Buffer)``
(``{"type": "Buffer", "data": [...]}``) — the legacy list endpoint excludes it anyway.
``fileName`` has ``trim: true`` (applied on save).
"""

from django.db import models

from .base import DocModel

BANK_FILE_FORMATS = ["CSV", "NEFT", "RTGS", "UNKNOWN"]


class BankFileRecord(DocModel):
    file_name = models.CharField(max_length=255, blank=True, default="")    # required
    format = models.CharField(max_length=16, choices=[(c, c) for c in BANK_FILE_FORMATS],
                              default="UNKNOWN")
    month = models.CharField(max_length=32, blank=True, default="")
    year = models.FloatField(null=True, blank=True, default=None)
    total_amount = models.FloatField(default=0)
    employee_count = models.FloatField(default=0)
    status = models.CharField(max_length=32, default="generated")
    mime_type = models.CharField(max_length=128, default="application/octet-stream")
    size = models.FloatField(default=0)
    content = models.BinaryField(default=bytes)                               # required

    TRIM_FIELDS = ("file_name",)

    DOC_FIELDS = {
        "fileName": "file_name", "format": "format", "month": "month", "year": "year",
        "totalAmount": "total_amount", "employeeCount": "employee_count", "status": "status",
        "mimeType": "mime_type", "size": "size", "content": "content",
    }

    class Meta:
        db_table = "pe_bank_file_record"
        indexes = [models.Index(fields=["org", "-created_at"], name="idx_pe_bankfile_org_created")]

    @property
    def content_bytes(self):
        return bytes(self.content) if self.content is not None else b""

    def to_dict(self, **extra):
        out = super().to_dict(**extra)
        if "content" not in extra:
            out["content"] = {"type": "Buffer", "data": list(self.content_bytes)}
        return out
