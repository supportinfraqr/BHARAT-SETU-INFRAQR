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
from django.utils import timezone


def iso(value):
    """Serialise a date/datetime the way ``JSON.stringify`` did for Mongo dates."""
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.isoformat().replace("+00:00", "Z")
    if isinstance(value, date):
        return datetime(value.year, value.month, value.day).isoformat() + "Z"
    return value


def new_subdoc_id():
    """Id for an element of a legacy subdocument array (Mongoose ``_id``).

    Usage: every element of a JSON subdocument array whose legacy schema kept
    ``_id`` (the Mongoose default for arrays of objects) carries ``"_id"``. The
    models fill it automatically on ``save()`` (see ``SchemaMixin``); code that
    needs the id *before* saving (e.g. to return it) calls this directly.
    """
    return uuid.uuid4().hex


def now_iso():
    """``Date.now`` default for dates stored inside JSON sub-documents."""
    return iso(timezone.now())


# --------------------------------------------------------------------------------------
# Mini schema DSL for nested JSON columns.
#
# Mongoose materialises defaults of nested objects and of array sub-documents, gives
# array sub-documents an ``_id`` and trims ``trim: true`` strings. The Django port stores
# those structures in JSONFields, so each model declares the legacy shape once with the
# helpers below; ``materialise(node)`` builds the column default and ``normalise(value,
# node)`` (run from ``save()``) fills missing defaults / ``_id`` and trims strings, the way
# Mongoose casts a document on save / on hydrate.
#
#   Obj(key=<default> | NO | Trim(<default>) | Obj(...) | Arr(...))
#   Arr(Obj(...), _id=True)   array of sub-documents (``_id=False`` like ``{ _id: false }``)
#   Arr()                     array of primitives (``[String]``)
#   NO                        no default -> key absent until set (Mongoose ``undefined``)
#                             (a nested Obj with no defaults is absent too: ``minimize``)
#   a callable default        evaluated per document (``Date.now`` -> ``now_iso``)
#
# Unknown keys are kept (not stripped like Mongoose ``strict``) and values are not cast.
# --------------------------------------------------------------------------------------

NO = object()


class Trim:
    """String field with ``trim: true``; ``default`` may be ``NO``."""

    __slots__ = ("default",)

    def __init__(self, default=NO):
        self.default = default


class Obj:
    """Nested object (or sub-document schema) — ordered ``key -> spec``."""

    __slots__ = ("fields",)

    def __init__(self, **fields):
        self.fields = fields


class Arr:
    """Array; ``item`` is an ``Obj`` for sub-documents or ``None`` for primitives."""

    __slots__ = ("item", "_id")

    def __init__(self, item=None, _id=True):
        self.item = item
        self._id = _id if item is not None else False


def _default_of(spec):
    if isinstance(spec, Obj):
        # Mongoose ``minimize`` drops nested objects that end up empty.
        return materialise(spec) or NO
    if isinstance(spec, Arr):
        return []
    if isinstance(spec, Trim):
        spec = spec.default
    if spec is NO:
        return NO
    return spec() if callable(spec) else spec


def materialise(node):
    """Dict Mongoose would materialise for a new nested object / sub-document."""
    out = {}
    for key, spec in node.fields.items():
        value = _default_of(spec)
        if value is not NO:
            out[key] = value
    return out


def new_subdoc(node, _id=True, **values):
    """Build one array element: ``_id`` + sub-document defaults + ``values``."""
    out = {"_id": new_subdoc_id()} if _id else {}
    out.update(materialise(node))
    out.update(values)
    return normalise(out, node)


def normalise(value, node):
    """Fill missing defaults / ``_id``s and trim strings in-place; returns ``value``."""
    if isinstance(node, Arr):
        if not isinstance(value, list) or node.item is None:
            return value
        for i, item in enumerate(value):
            if not isinstance(item, dict):
                continue
            if node._id and not item.get("_id"):
                item = {"_id": new_subdoc_id(), **item}
                value[i] = item
            normalise(item, node.item)
        return value
    if not isinstance(node, Obj) or not isinstance(value, dict):
        return value
    for key, spec in node.fields.items():
        if key not in value:
            default = _default_of(spec)
            if default is not NO:
                value[key] = default
            continue
        if isinstance(spec, Trim):
            if isinstance(value[key], str):
                value[key] = value[key].strip()
        elif isinstance(spec, (Obj, Arr)):
            normalise(value[key], spec)
    return value


class SchemaMixin:
    """Applies the legacy Mongoose casting on ``save()``.

    * ``JSON_SCHEMAS``  — ``attr -> Obj | Arr`` for nested JSON columns.
    * ``TRIM_FIELDS``   — top-level ``trim: true`` string attributes.

    ``bulk_create`` / ``QuerySet.update`` bypass ``save()``: call ``apply_schema()`` on
    each instance first when parity matters.
    """

    JSON_SCHEMAS: dict = {}
    TRIM_FIELDS: tuple = ()

    def apply_schema(self):
        for attr in self.TRIM_FIELDS:
            val = getattr(self, attr)
            if isinstance(val, str):
                setattr(self, attr, val.strip())
        for attr, node in self.JSON_SCHEMAS.items():
            val = getattr(self, attr)
            if val is not None:
                setattr(self, attr, normalise(val, node))

    def save(self, *args, **kwargs):
        self.apply_schema()
        return super().save(*args, **kwargs)


class DocModel(SchemaMixin, models.Model):
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


class GlobalDocModel(SchemaMixin, models.Model):
    """Abstract cross-org document (legacy main-DB collections, no ``organizationId``).

    Same ``DOC_FIELDS`` / ``to_dict`` conventions as ``DocModel`` minus the ``org`` FK.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    DOC_FIELDS: dict = {}

    class Meta:
        abstract = True

    @property
    def oid(self):
        return str(self.id)

    def to_dict(self, **extra):
        out = {"_id": str(self.id), "id": str(self.id)}
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
