"""BSS Admin masters & employer mappings — generic CRUD for the admin portal.

The admin UI is schema-driven (``src/data/adminMasters.tsx``). Each master key
maps to a model here: scalar UI fields map to real columns, and any extra UI
field is round-tripped through the model's ``details`` JSON column so nothing is
lost between the form and the database.
"""

# ruff: noqa: F401,F403
import os
import re
import uuid

from django.db import IntegrityError

from .common import *


# ── value coercion helpers ───────────────────────────────────────────────────
def _as_bool(value):
    return str(value or "").strip().lower() in ("yes", "true", "1", "active")


def _active_label(value):
    return "Active" if value else "Inactive"


_CYCLE_TO_CODE = {"Monthly": "MONTHLY", "Quarterly": "QUARTERLY",
                  "Half Yearly": "HALF_YEARLY", "Yearly": "ANNUAL", "Annual": "ANNUAL"}
_CYCLE_TO_LABEL = {"MONTHLY": "Monthly", "QUARTERLY": "Quarterly",
                   "HALF_YEARLY": "Half Yearly", "ANNUAL": "Yearly"}

_ROLE_TO_CODE = {"Worker": "worker", "Contractor": "contractor", "Employer": "employer",
                 "Government": "government", "BSS Staff": "bss_staff", "BSS Admin": "bss_admin"}
_ROLE_TO_LABEL = {code: label for label, code in _ROLE_TO_CODE.items()}

_RATETYPE_TO_LABEL = {"PERCENT": "Percent of wages", "FIXED": "Fixed amount", "DAYS": "Days"}
_RATETYPE_TO_CODE = {label: code for code, label in _RATETYPE_TO_LABEL.items()}


def _num(value):
    """Decimal-ish value or None (blank / non-numeric such as 'Unlimited')."""
    text = str(value if value is not None else "").strip().replace(",", "").replace("₹", "")
    if not text:
        return None
    try:
        return float(text)
    except ValueError:
        return None


def _date(value):
    text = str(value or "").strip()[:10]
    if not text:
        return None
    try:
        return datetime.strptime(text, "%Y-%m-%d").date()
    except ValueError:
        return None


def _get_field(obj, kind, attr):
    value = getattr(obj, attr, None)
    if kind == "yesno":
        return "Yes" if value else "No"
    if kind == "active":
        return _active_label(bool(value))
    if kind == "role":
        return _ROLE_TO_LABEL.get(str(value or ""), str(value or ""))
    if kind == "status":
        if not getattr(obj, "is_active", True):
            return "Inactive"
        return "Active" if getattr(obj, "account_active", True) else "Pending"
    if kind == "cycle":
        return _CYCLE_TO_LABEL.get(str(value or "").upper(), str(value or ""))
    if kind == "ratetype":
        return _RATETYPE_TO_LABEL.get(str(value or "").upper(), str(value or ""))
    if kind == "number":
        return float(value) if value is not None else ""
    if kind == "date":
        return value.isoformat() if value else ""
    return "" if value is None else str(value)


def _set_field(obj, kind, attr, value, length=255):
    if kind == "yesno":
        setattr(obj, attr, _as_bool(value))
    elif kind == "active":
        setattr(obj, attr, _as_bool(value))
    elif kind == "role":
        setattr(obj, attr, _ROLE_TO_CODE.get(str(value or "").strip(), "worker"))
    elif kind == "status":
        label = str(value or "").strip()
        obj.is_active = label != "Inactive"
        obj.account_active = label == "Active"
    elif kind == "cycle":
        setattr(obj, attr, _CYCLE_TO_CODE.get(str(value or "").strip(), "MONTHLY"))
    elif kind == "ratetype":
        setattr(obj, attr, _RATETYPE_TO_CODE.get(str(value or "").strip(), "PERCENT"))
    elif kind == "number":
        setattr(obj, attr, _num(value))
    elif kind == "date":
        setattr(obj, attr, _date(value))
    else:
        setattr(obj, attr, str(value or "")[:length])


# ── master specs ─────────────────────────────────────────────────────────────
def _specs():
    from bss_core.models import (ComplianceMaster, EmployerActMapping,
                                 EmployerDocumentMapping, EmployerRegisterMapping,
                                 LicenseMaster, LwfMaster, MinimumWage,
                                 PartyMaster, PtMaster, RegisterDocumentMaster,
                                 StatutoryMaster)

    party = {
        "model": PartyMaster, "order": "id", "can_delete": True,
        "fields": {
            "type": ("party_type", "text"), "name": ("party_name", "text"),
            "address": ("address", "text"), "email": ("contact_email", "text"),
            "contact": ("contact_mobile", "text"), "contactPerson": ("contact_name", "text"),
            "state": ("state", "text"), "city": ("city", "text"),
            "status": ("is_active", "active"),
            "mobile": (None, "text"), "industry": (None, "text"),
            "storeLimit": (None, "text"), "contractorLimit": (None, "text"),
            "siteLimit": (None, "text"), "userLimit": (None, "text"),
            "validDate": (None, "date"), "monthExpired": (None, "text"),
        },
    }
    pt = {
        "model": PtMaster, "order": "id",
        "fields": {
            "state": ("state", "text"), "ptNumber": ("pt_number", "text"),
            "cycle": ("payment_frequency", "cycle"), "status": ("is_active", "active"),
            "applicable": (None, "yesno"), "effectiveFrom": (None, "date"),
            "effectiveTo": (None, "date"), "govtFees": (None, "number"),
            "securityDeposit": (None, "number"), "paymentLink": (None, "text"),
            "taxSlabs": (None, "text"),
        },
    }
    lwf = {
        "model": LwfMaster, "order": "id",
        "fields": {
            "state": ("state", "text"), "minAmount": ("min_wage", "number"),
            "maxAmount": (None, "text"), "employeeShare": ("employee_share", "number"),
            "employerShare": ("employer_share", "number"), "monthType": ("payment_month", "text"),
            "designationApplicability": ("designation", "text"), "status": ("is_active", "active"),
            "effectiveFrom": (None, "date"), "effectiveTo": (None, "date"),
        },
    }
    license_m = {
        "model": LicenseMaster, "order": "id",
        "fields": {
            "name": ("license_name", "text"), "state": ("state", "text"),
            "appliesTo": ("applies_to", "text"),
            "govtFee": ("government_fee", "number"),
            "securityDeposit": ("security_deposit", "number"),
            "status": ("is_active", "active"),
            "effectiveFrom": (None, "date"), "effectiveTo": (None, "date"),
            "minWageApplicability": (None, "yesno"),
            "bonusPayoutMonth": (None, "text"),
        },
    }
    min_wage = {
        "model": MinimumWage, "order": "-id",
        "defaults": {"industry": "All Industries"},
        "unique": ("state", "wage_zone", "grade", "employment_category",
                   "effective_from", "effective_to"),
        "unique_message": "This record already exists — duplicate cannot be added",
        "file_field": "notification_file",
        "validate": _validate_min_wage,
        "fields": {
            "state": ("state", "text"), "zone": ("wage_zone", "text"),
            "industry": ("industry", "text"), "grade": ("grade", "text"),
            "employmentCategory": ("employment_category", "text"),
            "basicPerMonth": ("basic_wage", "number"), "vdaPerMonth": ("vda", "number"),
            "totalPerMonth": ("total_wage", "number"),
            "effectiveFrom": ("effective_from", "date"), "effectiveTo": ("effective_to", "date"),
            "minimumWage": (None, "number"), "floorWage": (None, "number"),
            "notificationNumber": ("notification_number", "text"),
            "status": ("is_active", "active"),
        },
    }
    register_doc = {
        "model": RegisterDocumentMaster, "order": "id", "code_prefix": "RD",
        "kind": "register", "kind_filter": "register",
        "fields": {
            "name": ("document_name", "text"), "frequency": ("frequency", "text"),
            "state": ("state", "text"), "formNumber": ("form_number", "text"),
            "criticality": ("criticality", "text"), "mandatory": ("is_mandatory", "yesno"),
            "status": ("is_active", "active"), "type": (None, "text"), "formatType": (None, "text"),
        },
    }
    compliance = {
        "model": ComplianceMaster, "order": "id", "read_only": True,
        "fields": {
            "act": ("act", "text"), "form": ("form_number", "text"),
            "nature": ("nature", "text"), "remark": ("remark", "text"),
            "maxScore": ("max_score", "number"),
        },
    }
    employer_document = {
        "model": EmployerDocumentMapping, "order": "id",
        "fields": {"status": ("is_active", "active")},
        "foreign": {
            "employer": ("employer", "employer", "employer"),
            "document": ("register_doc", "register_document", "document"),
        },
    }
    employer_register = {
        "model": EmployerRegisterMapping, "order": "id",
        "fields": {"status": ("is_active", "active")},
        "foreign": {
            "employer": ("employer", "employer", "employer"),
            "register": ("register_doc", "register_document", "document"),
        },
    }
    employer_act = {
        "model": EmployerActMapping, "order": "id",
        "fields": {"act": ("act", "text"), "status": ("is_active", "active")},
        "foreign": {"employer": ("employer", "employer", "employer")},
    }

    statutory = {
        "model": StatutoryMaster, "order": "id",
        "unique": ("label",),
        "unique_message": "This record already exists — duplicate cannot be added",
        "code_from": "label", "code_attr": "component",
        "fields": {
            "component": ("label", "text"), "rateType": ("rate_type", "ratetype"),
            "condition": ("condition", "text"), "rate": ("rate", "number"),
            "status": ("is_active", "active"),
        },
    }

    return {
        "party": party, "statutory": statutory, "professional-tax": pt, "lwf": lwf, "license": license_m,
        "minimum-wage": min_wage, "register-doc": register_doc,
        "compliance": compliance, "employer-document": employer_document,
        "employer-register": employer_register, "employer-act": employer_act,
        "users": {
            "model": User, "order": "-id", "special": "users", "can_delete": True,
            "read_only": True,  # accounts are managed via registration — admin cannot mutate
            "fields": {
                "username": ("username", "text"), "partyType": ("role", "role"),
                "status": ("account_active", "status"),
                "name": (None, "text"), "partyName": (None, "text"),
                "password": (None, "text"), "mobile": (None, "text"), "email": (None, "text"),
            },
        },
    }


# ── foreign-key resolution ───────────────────────────────────────────────────
def _resolve_employer(value):
    from bss_core.models import EmployerProfile, User
    text = str(value or "").strip()
    if not text:
        return None
    profile = EmployerProfile.objects.filter(employer_name__iexact=text).first()
    if profile:
        return profile.user
    return User.objects.filter(username__iexact=text, role="employer").first()


def _resolve_register_document(value):
    from bss_core.models import RegisterDocumentMaster
    text = str(value or "").strip()
    if not text:
        return None
    return (RegisterDocumentMaster.objects.filter(document_name__iexact=text).first()
            or RegisterDocumentMaster.objects.filter(code__iexact=text).first())


_RESOLVERS = {"employer": _resolve_employer, "register_document": _resolve_register_document}


def _foreign_display(obj, kind):
    if kind == "employer":
        profile = getattr(getattr(obj, "employer", None), "employer_profile", None)
        return payloads._d(profile.employer_name if profile else "") or (
            obj.employer.username if obj.employer_id else "")
    if kind == "document":
        return payloads._d(obj.register_doc.document_name) if obj.register_doc_id else ""
    return ""


# ── row <-> object ───────────────────────────────────────────────────────────
def _user_contacts(user):
    creds = {c.identity_type: c.identity_value for c in user.credentials.all()}
    return creds.get("mobile", ""), creds.get("email", "")


def _details(obj):
    """The JSON `details` bag — models that lack it (e.g. User) yield {}."""
    return getattr(obj, "details", None) or {}


def _user_name(user):
    """Display name for the User Registration master, resolved by role.

    A user-set ``full_name`` (editable in this master) takes precedence; the
    role profile supplies the fallback (worker identity / employer / contractor)."""
    if user.full_name:
        return user.full_name
    if user.role == "worker":
        identity = getattr(user, "worker_identity", None)
        return payloads._d(identity.name if identity else "")
    profile = getattr(user, "employer_profile", None) or getattr(user, "contractor_profile", None)
    if profile:
        return payloads._d(getattr(profile, "employer_name", "") or getattr(profile, "contractor_name", ""))
    return ""


def _user_party_name(user):
    """Party mapping display for the User Registration master."""
    if user.role == "employer":
        profile = getattr(user, "employer_profile", None)
        return payloads._d(profile.employer_name if profile else "")
    if user.role == "contractor":
        profile = getattr(user, "contractor_profile", None)
        return payloads._d(profile.contractor_name if profile else "")
    if user.role == "worker":
        identity = getattr(user, "worker_identity", None)
        return payloads._d(identity.name if identity else "")
    return _user_name(user)


def _set_user_display(user, body):
    """Persist the editable Name / Party Name fields for the users master.

    ``name`` stores on ``User.full_name`` (all roles). ``partyName`` maps to the
    role profile where one exists; otherwise it mirrors the display name."""
    if body.get("name") is not None:
        user.full_name = str(body["name"] or "")[:160]
    party = (body.get("partyName") if body.get("partyName") is not None else None)
    if party is None or str(party) == payloads._d(_user_party_name(user)):
        return
    party = str(party)[:120]
    if user.role == "employer":
        profile = getattr(user, "employer_profile", None)
        if profile:
            profile.employer_name = party
            profile.save(update_fields=["employer_name"])
    elif user.role == "contractor":
        profile = getattr(user, "contractor_profile", None)
        if profile:
            profile.contractor_name = party
            profile.save(update_fields=["contractor_name"])
    elif user.role == "worker":
        identity = getattr(user, "worker_identity", None)
        if identity:
            identity.name = party
            identity.save(update_fields=["name"])


def _set_user_contacts(user, mobile, email):
    from bss_core.models import UserCredential
    if mobile is not None and str(mobile or "").strip():
        mobile = _normalize_mobile(mobile) or str(mobile)
        clash = (UserCredential.objects
                 .filter(identity_type="mobile", identity_value=mobile)
                 .exclude(user=user).exists())
        if clash:
            raise PortalMutationError("This mobile is already linked to another account.", 409)
        UserCredential.objects.update_or_create(
            user=user, identity_type="mobile", defaults={"identity_value": mobile})
    if email is not None and str(email or "").strip():
        UserCredential.objects.update_or_create(
            user=user, identity_type="email", defaults={"identity_value": str(email)})


def _row(spec, obj):
    out = {"id": obj.pk}
    details = _details(obj)
    for name, (attr, kind) in spec["fields"].items():
        out[name] = _get_field(obj, kind, attr) if attr else details.get(name, "")
    for name, (_attr, _resolver, display) in spec.get("foreign", {}).items():
        out[name] = _foreign_display(obj, display)
    if spec.get("file_field"):
        stored = getattr(obj, spec["file_field"], None)
        out["notificationFile"] = os.path.basename(stored.name) if stored else ""
    if spec.get("special") == "users":
        out["mobile"], out["email"] = _user_contacts(obj)
        out["name"] = _user_name(obj)
        out["partyName"] = _user_party_name(obj)
        out["password"] = ""
    return out


def _apply(spec, obj, body):
    details = _details(obj)
    for name, (attr, kind) in spec["fields"].items():
        if name not in body:
            continue
        if attr:
            _set_field(obj, kind, attr, body.get(name))
        elif hasattr(obj, "details"):
            details[name] = body.get(name)
    if hasattr(obj, "details"):
        obj.details = details
    for name, (attr, resolver, _display) in spec.get("foreign", {}).items():
        if name in body:
            setattr(obj, attr, _RESOLVERS[resolver](body.get(name)))
    if spec.get("special") == "users":
        if body.get("password"):
            obj.set_password(str(body["password"]))
        _set_user_display(obj, body)


def _apply_user_contacts(spec, obj, body):
    """User mobile/email credentials — must run after the row is saved (FK)."""
    if spec.get("special") == "users":
        _set_user_contacts(obj, body.get("mobile"), body.get("email"))


def _queryset(spec):
    """The spec's records — filtered by kind where one model backs two masters."""
    qs = spec["model"].objects
    if spec.get("kind_filter") and hasattr(spec["model"], "kind"):
        qs = qs.filter(kind=spec["kind_filter"])
    return qs


def _derive_code(spec, obj):
    """Fill a unique machine-readable code (e.g. ``component``) from a human
    field (e.g. ``label``) when a master opts in via ``code_from``/``code_attr``."""
    attr = spec.get("code_attr")
    source_field = spec.get("code_from")
    if not attr or not source_field:
        return
    if str(getattr(obj, attr, "") or "").strip():
        return  # a code already exists — keep it
    source = str(getattr(obj, source_field, "") or "").strip()
    base = re.sub(r"[^A-Z0-9]+", "_", source.upper()).strip("_")[:20] or "COMPONENT"
    code, n = base, 1
    queryset = type(obj).objects
    while queryset.filter(**{attr: code}).exists():
        code, n = f"{base}_{n}", n + 1
    setattr(obj, attr, code)


def _unique_conflict(spec, obj, exclude_pk=None):
    """An existing record that shares the spec's declared unique key, if any.

    Masters opt in by setting ``unique`` to a tuple of model attributes; most
    masters leave it unset and are unrestricted."""
    fields = spec.get("unique")
    if not fields:
        return None
    qs = _queryset(spec)
    if exclude_pk is not None:
        qs = qs.exclude(pk=exclude_pk)
    return qs.filter(**{attr: getattr(obj, attr, None) for attr in fields}).first()


def _reject_duplicate(spec, obj, exclude_pk=None):
    message = spec.get("unique_message") or "A record with the same key already exists."
    conflict = _unique_conflict(spec, obj, exclude_pk)
    if conflict is not None:
        # Hand back the existing row so the UI can open it for editing/reactivation.
        raise PortalMutationError(message, 409, extra={"conflictRow": _row(spec, conflict)})


def _validate_min_wage(obj):
    """Server-side Minimum Wage rules (mirrors the UI: required + consistency)."""
    from decimal import Decimal
    required = {
        "State": obj.state, "Wage Zone": obj.wage_zone, "Grade": obj.grade,
        "Employment Category": obj.employment_category,
        "Effective From": obj.effective_from,
    }
    missing = [label for label, value in required.items() if not str(value or "").strip()]
    if missing:
        raise PortalMutationError(f"Required: {', '.join(missing)}.", 400)
    if obj.basic_wage is None or obj.vda is None or obj.total_wage is None:
        raise PortalMutationError("Basic, VDA and Total amounts are required.", 400)
    basic, vda, total = (Decimal(str(obj.basic_wage)), Decimal(str(obj.vda)),
                         Decimal(str(obj.total_wage)))
    if basic < 0 or vda < 0 or total < 0:
        raise PortalMutationError("Amounts must be non-negative.", 400)
    if total != basic + vda:
        raise PortalMutationError("Total Per Month must equal Basic + VDA.", 400)
    if obj.effective_from and obj.effective_to and obj.effective_to < obj.effective_from:
        raise PortalMutationError("Effective To cannot be before Effective From.", 400)
    _reject_min_wage_overlap(obj)


def _reject_min_wage_overlap(obj):
    """A minimum-wage period must not overlap another row for the same worker
    group (state + zone + grade + employment category). Open-ended periods
    (null effective_to) run until superseded, so they overlap any later row."""
    from bss_core.models import MinimumWage
    qs = MinimumWage.objects.filter(
        state=obj.state, wage_zone=obj.wage_zone, grade=obj.grade,
        employment_category=obj.employment_category)
    if obj.pk:
        qs = qs.exclude(pk=obj.pk)
    candidate = list(qs.values("id", "state", "wage_zone", "grade",
                               "employment_category", "effective_from", "effective_to"))
    if not candidate:
        return
    from_open, from_to = obj.effective_from, obj.effective_to
    if from_open is None:
        # A worker group with no effective_from cannot be dated at all.
        raise PortalMutationError("Effective From is required.", 400)
    for row in candidate:
        e_from, e_to = row["effective_from"], row["effective_to"]
        if e_from is None:
            raise PortalMutationError(
                "Existing row is missing Effective From — fix the earlier record first.", 409,
                extra={"conflictRow": row["id"]})
        if e_to is not None and e_to < e_from:
            continue  # malformed earlier row; not treated as a conflict here
        # Overlap if the ranges intersect (inclusive boundaries).
        if not (from_to is not None and from_to < e_from) \
                and not (e_to is not None and e_to < from_open):
            raise PortalMutationError(
                "Period overlaps an existing {} row for {} ({}"
                "{}) in zone {}.".format(
                    row["grade"], row["state"], row["effective_from"],
                    f" to {row['effective_to']}" if row["effective_to"] else " onwards",
                    row["wage_zone"]), 409,
                extra={"conflictRow": row["id"]})


def _counts():
    """Record counts per master key (drives the admin overview KPIs)."""
    return {key: _queryset(spec).count() for key, spec in _specs().items()}


def _masters(request, key):
    spec = _specs().get(key)
    if spec is None:
        return None
    model = spec["model"]
    if request.method == "GET":
        rows = [_row(spec, obj) for obj in _queryset(spec).order_by(spec.get("order", "id"))[:500]]
        return {"rows": rows}
    if spec.get("read_only"):
        raise PortalMutationError("This master is read-only (records are managed elsewhere).", 403)
    # POST — create
    body = request.data if isinstance(request.data, dict) else {}
    obj = model()
    for field, value in (spec.get("defaults") or {}).items():
        if hasattr(obj, field):
            setattr(obj, field, value)
    _apply(spec, obj, body)
    _derive_code(spec, obj)
    if spec.get("kind") and hasattr(obj, "kind"):
        obj.kind = spec["kind"]
    if spec.get("code_prefix") and hasattr(obj, "code"):
        obj.code = f"{spec['code_prefix']}-{uuid.uuid4().hex[:6].upper()}"
    if hasattr(obj, "industry") and not (getattr(obj, "industry", "") or "").strip():
        obj.industry = "All Industries"
    if spec.get("validate"):
        spec["validate"](obj)
    _reject_duplicate(spec, obj)
    try:
        obj.save()
    except IntegrityError:
        raise PortalMutationError(
            spec.get("unique_message") or "A record with the same key already exists.", 409)
    _apply_user_contacts(spec, obj, body)
    return {"row": _row(spec, obj)}


def _master_detail(request, key, pk):
    spec = _specs().get(key)
    if spec is None:
        return None
    obj = _queryset(spec).filter(pk=pk).first()
    if obj is None:
        raise PortalMutationError("Record not found.", 404)
    if request.method in ("PATCH", "POST", "DELETE") and spec.get("read_only"):
        raise PortalMutationError("This master is read-only (records are managed elsewhere).", 403)
    if request.method in ("PATCH", "POST"):
        body = request.data if isinstance(request.data, dict) else {}
        _apply(spec, obj, body)
        if spec.get("validate"):
            spec["validate"](obj)
        _reject_duplicate(spec, obj, exclude_pk=obj.pk)
        try:
            obj.save()
        except IntegrityError:
            raise PortalMutationError(
                spec.get("unique_message") or "A record with the same key already exists.", 409)
        _apply_user_contacts(spec, obj, body)
        return {"row": _row(spec, obj)}
    if request.method == "DELETE":
        if not spec.get("can_delete", True):
            raise PortalMutationError("This master record cannot be deleted.", 403)
        obj.delete()
        return {"id": pk}
    return {"row": _row(spec, obj)}


__all__ = ["_masters", "_master_detail", "_counts"]
