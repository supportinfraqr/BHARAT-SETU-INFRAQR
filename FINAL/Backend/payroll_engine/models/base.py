"""Base document model for the payroll engine.

The legacy payroll stored every entity as a MongoDB document scoped to one
organisation database. Each Django model here keeps that shape:

* ``id``      — UUID primary key, serialised as both ``_id`` and ``id``.
* ``org``     — the BSS user that owns the payroll (contractor or employer).
* scalar columns for anything that is filtered / sorted / unique-constrained.
* ``JSONField`` columns for nested legacy sub-documents, stored in the exact
  camelCase shape the legacy API returned, so business logic ports 1:1.

Money is stored as ``FloatField`` on purpose: the legacy engine computed with
JavaScript numbers and ``Math.round``; Decimal would change rounding results.
"""

import uuid
from datetime import date, datetime

from django.conf import settings
from django.db import models


def iso(value):
    """Serialise a date/datetime the way ``JSON.stringify`` did for Mongo dates."""
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.isoformat().replace("+00:00", "Z")
    if isinstance(value, date):
        return datetime(value.year, value.month, value.day).isoformat() + "Z"
    return value


class DocModel(models.Model):
    """Abstract org-scoped document.

    Subclasses declare ``DOC_FIELDS``: an ordered mapping of legacy camelCase key
    -> model attribute name. ``to_dict`` serialises those plus the common keys.
    Foreign keys are emitted as the related id string (``<attr>_id``).
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    org = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                            related_name="+", db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    DOC_FIELDS: dict = {}

    class Meta:
        abstract = True

    @property
    def oid(self):
        return str(self.id)

    def to_dict(self, **extra):
        out = {"_id": str(self.id), "id": str(self.id), "organizationId": str(self.org_id)}
        for key, attr in self.DOC_FIELDS.items():
            field = self._meta.get_field(attr)
            if field.is_relation:
                raw = getattr(self, f"{attr}_id")
                out[key] = str(raw) if raw is not None else None
            else:
                out[key] = iso(getattr(self, attr))
        out["createdAt"] = iso(self.created_at)
        out["updatedAt"] = iso(self.updated_at)
        out.update(extra)
        return out
