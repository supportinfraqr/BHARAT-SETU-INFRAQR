"""BSS Admin masters & employer mappings — generic CRUD for the admin portal.

The admin UI is schema-driven (``src/data/adminMasters.tsx``). Each master key
maps to a model here: scalar UI fields map to real columns, and any extra UI
field is round-tripped through the model's ``details`` JSON column so nothing is
lost between the form and the database.
"""

# ruff: noqa: F401,F403
import uuid

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
                                 PartyMaster, PtMaster, RegisterDocumentMaster)

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
            "industry": ("industry", "text"), "govtFee": ("government_fee", "number"),
            "securityDeposit": ("security_deposit", "number"),
            "paymentFrequency": ("payment_frequency", "text"),
            "bonusPercent": ("bonus_pct", "number"), "wageZone": ("wage_zone", "text"),
            "status": ("is_active", "active"),
            "applicabilityCount": (None, "number"), "effectiveFrom": (None, "date"),
            "effectiveTo": (None, "date"), "minWageApplicability": (None, "yesno"),
            "bonusPayoutMonth": (None, "text"), "grade": (None, "text"),
            "employmentCategory": (None, "text"),
        },
    }
    min_wage = {
        "model": MinimumWage, "order": "id",
        "defaults": {"industry": "All Industries"},
        "fields": {
            "state": ("state", "text"), "zone": ("wage_zone", "text"),
            "grade": ("grade", "text"), "employmentCategory": ("employment_category", "text"),
            "basicPerMonth": ("basic_wage", "number"), "vdaPerMonth": ("vda", "number"),
            "totalPerMonth": ("total_wage", "number"),
            "effectiveFrom": ("effective_from", "date"), "effectiveTo": ("effective_to", "date"),
            "minimumWage": (None, "number"), "floorWage": (None, "number"),
        },
    }
    document = {
        "model": RegisterDocumentMaster, "order": "id", "code_prefix": "DM",
        "kind": "document", "kind_filter": "document",
        "fields": {
            "name": ("document_name", "text"), "frequency": ("frequency", "text"),
            "state": ("state", "text"), "formNumber": ("form_number", "text"),
            "criticality": ("criticality", "text"), "act": ("act", "text"),
            "mandatory": ("is_mandatory", "yesno"), "status": ("is_active", "active"),
            "type": (None, "text"), "formatType": (None, "text"),
            "note": (None, "text"), "validationMapping": (None, "text"),
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
        "model": ComplianceMaster, "order": "id",
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

    return {
        "party": party, "professional-tax": pt, "lwf": lwf, "license": license_m,
        "minimum-wage": min_wage, "document": document, "register-doc": register_doc,
        "compliance": compliance, "employer-document": employer_document,
        "employer-register": employer_register, "employer-act": employer_act,
        "users": {
            "model": User, "order": "-id", "special": "users", "can_delete": True,
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


def _set_user_contacts(user, mobile, email):
    from bss_core.models import UserCredential
    if mobile is not None:
        UserCredential.objects.update_or_create(
            user=user, identity_type="mobile", defaults={"identity_value": str(mobile)})
    if email is not None:
        UserCredential.objects.update_or_create(
            user=user, identity_type="email", defaults={"identity_value": str(email)})


def _row(spec, obj):
    out = {"id": obj.pk}
    for name, (attr, kind) in spec["fields"].items():
        out[name] = _get_field(obj, kind, attr) if attr else (obj.details or {}).get(name, "")
    for name, (_attr, _resolver, display) in spec.get("foreign", {}).items():
        out[name] = _foreign_display(obj, display)
    if spec.get("special") == "users":
        out["mobile"], out["email"] = _user_contacts(obj)
    return out


def _apply(spec, obj, body):
    details = dict(obj.details or {})
    for name, (attr, kind) in spec["fields"].items():
        if name not in body:
            continue
        if attr:
            _set_field(obj, kind, attr, body.get(name))
        else:
            details[name] = body.get(name)
    obj.details = details
    for name, (attr, resolver, _display) in spec.get("foreign", {}).items():
        if name in body:
            setattr(obj, attr, _RESOLVERS[resolver](body.get(name)))
    if spec.get("special") == "users":
        if body.get("password"):
            obj.set_password(str(body["password"]))
        _set_user_contacts(obj, body.get("mobile"), body.get("email"))


def _queryset(spec):
    """The spec's records — filtered by kind where one model backs two masters."""
    qs = spec["model"].objects
    if spec.get("kind_filter") and hasattr(spec["model"], "kind"):
        qs = qs.filter(kind=spec["kind_filter"])
    return qs


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
    # POST — create
    body = request.data if isinstance(request.data, dict) else {}
    obj = model()
    for field, value in (spec.get("defaults") or {}).items():
        if hasattr(obj, field):
            setattr(obj, field, value)
    _apply(spec, obj, body)
    if spec.get("kind") and hasattr(obj, "kind"):
        obj.kind = spec["kind"]
    if spec.get("code_prefix") and hasattr(obj, "code"):
        obj.code = f"{spec['code_prefix']}-{uuid.uuid4().hex[:6].upper()}"
    if hasattr(obj, "industry") and not (getattr(obj, "industry", "") or "").strip():
        obj.industry = "All Industries"
    obj.save()
    return {"row": _row(spec, obj)}


def _master_detail(request, key, pk):
    spec = _specs().get(key)
    if spec is None:
        return None
    obj = _queryset(spec).filter(pk=pk).first()
    if obj is None:
        raise PortalMutationError("Record not found.", 404)
    if request.method in ("PATCH", "POST"):
        body = request.data if isinstance(request.data, dict) else {}
        _apply(spec, obj, body)
        obj.save()
        return {"row": _row(spec, obj)}
    if request.method == "DELETE":
        if not spec.get("can_delete", True):
            raise PortalMutationError("This master record cannot be deleted.", 403)
        obj.delete()
        return {"id": pk}
    return {"row": _row(spec, obj)}


__all__ = ["_masters", "_master_detail", "_counts"]
