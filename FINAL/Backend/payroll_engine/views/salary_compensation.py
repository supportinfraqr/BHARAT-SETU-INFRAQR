"""Port of ``controller/payroll/salaryCompensation.js`` (salary component master).

One ``SalaryCompensation`` row per (org, category) holds the ``components`` array.
Mongoose casting / validation of ``componentSchema`` (strict keys, enums, required
``name``/``type``, Number/Boolean casts) is reproduced by ``cast_component`` so stored
documents and error messages match the legacy ones.
"""

import math
import re

from django.db import transaction

from ..context import PayrollError, payroll_view, send_response
from ..models import SalaryCompensation
from ..models.base import materialise, new_subdoc_id
from ..models.salary_compensation import CATEGORIES, COMPONENT
from ..services.audit_log import log_payroll_action
from ..services.jsmath import js_str, js_truthy, parse_int, to_number

ENUMS = {
    "type": ["earning", "deduction", "benefit", "reimbursement"],
    "calculationType": ["fixed", "variable", "percentage"],
    "basedOn": ["basic", "gross", "ctc", "manual", "none"],
    "frequency": ["one-time", "recurring", "monthly", "yearly"],
    "status": ["active", "inactive"],
}
NUMBER_KEYS = ("value", "maxLimit")
BOOL_KEYS = ("considerForEPF", "considerForESI", "calculateOnProRata", "taxable")
STRING_KEYS = ("name", "code", "description", "type", "calculationType", "basedOn",
               "frequency", "paymentMonth", "status")
SCHEMA_KEYS = ("_id",) + tuple(COMPONENT.fields.keys())

_TRUE = (True, 1, "1", "true", "yes")
_FALSE = (False, 0, "0", "false", "no")


class _ValidationError(Exception):
    pass


def _cast_value(key, value, path):
    if value is None:
        return None
    if key in NUMBER_KEYS:
        n = to_number(value) if not isinstance(value, (dict, list)) else float("nan")
        if isinstance(value, str) and value.strip() == "":
            return None
        if math.isnan(n):
            raise _ValidationError(
                f'{path}{key}: Cast to Number failed for value "{js_str(value)}" '
                f'(type {type(value).__name__}) at path "{key}"')
        return int(n) if n.is_integer() else n
    if key in BOOL_KEYS:
        if value in _TRUE and not (isinstance(value, float) and value != 1):
            return True
        if value in _FALSE:
            return False
        raise _ValidationError(
            f'{path}{key}: Cast to Boolean failed for value "{js_str(value)}" at path "{key}"')
    if key in STRING_KEYS:
        if isinstance(value, (dict, list)):
            raise _ValidationError(
                f'{path}{key}: Cast to string failed for value "{js_str(value)}" at path "{key}"')
        return js_str(value)
    return value


def cast_component(raw, index=0, base=None):
    """Mongoose cast + validate one component (``base`` = existing subdoc for updates)."""
    path = f"components.{index}."
    out = dict(base) if base is not None else {"_id": new_subdoc_id(), **materialise(COMPONENT)}
    if isinstance(raw, dict):
        for key, value in raw.items():
            if key not in SCHEMA_KEYS or key == "_id" and base is not None:
                continue
            if key == "_id":
                out["_id"] = js_str(value) if value else out["_id"]
                continue
            cast = _cast_value(key, value, path)
            if cast is None:
                out.pop(key, None)
            else:
                out[key] = cast
    errors = []
    for key in ("name", "type"):
        if out.get(key) in (None, ""):
            errors.append(f"{path}{key}: Path `{key}` is required.")
    for key, allowed in ENUMS.items():
        val = out.get(key)
        if val not in (None, "") and val not in allowed:
            errors.append(f"{path}{key}: `{val}` is not a valid enum value for path `{key}`.")
    if errors:
        raise _ValidationError(", ".join(errors))
    return out


def _validation_failed(err):
    return PayrollError(f"SalaryCompensation validation failed: {err}", 500)


def _check_category(category):
    if category not in CATEGORIES:
        raise PayrollError(
            f"SalaryCompensation validation failed: category: `{category}` is not a valid enum "
            "value for path `category`.", 500)


def _paginate(items, page, limit):
    """Legacy in-memory pagination with ``parseInt`` (NaN / Infinity -> JSON null)."""
    p, lim = parse_int(page), parse_int(limit)
    total = len(items)
    p_nan, lim_nan = isinstance(p, float), isinstance(lim, float)
    if lim_nan or lim == 0:
        total_pages = None          # NaN / Infinity
    else:
        total_pages = math.ceil(total / lim)
    if p_nan or lim_nan:
        sliced = []
    else:
        skip = (p - 1) * lim
        sliced = _js_slice(items, skip, skip + lim)
    return sliced, {"total": total, "page": None if p_nan else p,
                    "limit": None if lim_nan else lim, "totalPages": total_pages}


def _js_slice(items, start, end):
    n = len(items)
    start = max(n + start, 0) if start < 0 else min(start, n)
    end = max(n + end, 0) if end < 0 else min(end, n)
    return items[start:end] if end > start else []


def _search_filter(components, search):
    if not js_truthy(search):
        return components
    try:
        rx = re.compile(js_str(search), re.IGNORECASE)
    except re.error as err:
        raise PayrollError(f"Invalid regular expression: /{search}/i: {err}", 500) from err

    def field(c, key):
        return js_str(c[key]) if key in c else "undefined"

    return [c for c in components
            if rx.search(field(c, "name")) or rx.search(field(c, "label"))
            or rx.search(field(c, "componentType"))]


def _audit(ctx, record, remarks, before=None, after=None):
    log_payroll_action(ctx, action="salary_component_updated", entity_type="salary_component",
                       entity_id=str(record.pk) if record else "", before_data=before,
                       after_data=after, remarks=remarks)


def _org(ctx):
    if ctx.org is None:
        raise PayrollError("org_uuid not found", 400)
    return ctx.org


@payroll_view(["POST"])
def create_salary_compensation(ctx):
    from ..services.salary_component_helper import sanitize_salary_component

    org = _org(ctx)
    body = ctx.body
    category, component = body.get("category"), body.get("component")
    if not js_truthy(category) or not js_truthy(component):
        raise PayrollError("category and component are required", 400)
    normalized = sanitize_salary_component(component)
    with transaction.atomic():
        record = SalaryCompensation.objects.select_for_update().filter(
            org=org, category=category).first()
        if record is None:
            _check_category(category)
            record = SalaryCompensation(org=org, category=category, components=[])
        components = list(record.components or [])
        try:
            components.append(cast_component(normalized, len(components)))
        except _ValidationError as err:
            raise _validation_failed(err) from err
        record.components = components
        record.save()
    created = record.components[-1]
    _audit(ctx, record, f"Salary component created in {category}: {created.get('name')}",
           after=created)
    return send_response(201, True, "Component created successfully", created)


@payroll_view(["PUT"])
def update_salary_compensation(ctx, category, componentId):
    from ..services.salary_component_helper import sanitize_salary_component

    org = _org(ctx)
    body = ctx.body
    with transaction.atomic():
        record = SalaryCompensation.objects.select_for_update().filter(
            org=org, category=category).first()
        if record is None:
            raise PayrollError("Category not found", 404)
        components = list(record.components or [])
        idx = next((i for i, c in enumerate(components) if str(c.get("_id")) == str(componentId)), -1)
        if idx < 0:
            raise PayrollError("Component not found", 404)
        before = dict(components[idx])
        try:
            component = cast_component(body, idx, base=components[idx])
            sanitized = sanitize_salary_component(component)
            fix = {k: sanitized.get(k) for k in ("paymentMonth", "considerForEPF", "considerForESI")}
            component = cast_component(fix, idx, base=component)
        except _ValidationError as err:
            raise _validation_failed(err) from err
        components[idx] = component
        record.components = components
        record.save()
    _audit(ctx, record, f"Salary component updated in {category}: {component.get('name')}",
           before=before, after=component)
    return send_response(200, True, "Component updated successfully", component)


@payroll_view(["GET"])
def get_salary_compensation(ctx, category, componentId):
    org = _org(ctx)
    record = SalaryCompensation.objects.filter(org=org, category=category).first()
    if record is None:
        raise PayrollError("Category not found", 404)
    component = next((c for c in (record.components or []) if str(c.get("_id")) == str(componentId)), None)
    if component is None:
        raise PayrollError("Component not found", 404)
    return send_response(200, True, "Component fetched successfully", component)


@payroll_view(["GET"])
def get_salary_compen_by_category(ctx, category):
    org = _org(ctx)
    search = ctx.query("search")
    page, limit = ctx.query("page", 1), ctx.query("limit", 10)
    record = SalaryCompensation.objects.filter(org=org, category=category).first()
    if record is None:
        _s, pagination = _paginate([], page, limit)
        pagination["totalPages"] = 0
        return send_response(200, True, f"No components found for category {category}",
                             {"data": [], "pagination": pagination})
    components = _search_filter(list(record.components or []), search)
    data, pagination = _paginate(components, page, limit)
    return send_response(200, True, "Components fetched successfully",
                         {"data": data, "pagination": pagination})


@payroll_view(["GET"])
def get_all_salary_compensations(ctx):
    org = _org(ctx)
    search = ctx.query("search")
    page, limit = ctx.query("page", 1), ctx.query("limit", 10)
    records = {r.category: r for r in SalaryCompensation.objects.filter(org=org).order_by("created_at")}
    all_components = []
    for category in CATEGORIES:
        rec = records.get(category)
        components = _search_filter(list((rec.components if rec else None) or []), search)
        all_components.extend({**c, "category": category} for c in components)
    data, pagination = _paginate(all_components, page, limit)
    return send_response(200, True, "All salary components fetched successfully",
                         {"data": data, "pagination": pagination})


@payroll_view(["DELETE"])
def delete_salary_compensation(ctx, category, componentId):
    org = _org(ctx)
    with transaction.atomic():
        record = SalaryCompensation.objects.select_for_update().filter(
            org=org, category=category).first()
        if record is None:
            raise PayrollError("Component not found", 404)
        removed = [c for c in (record.components or []) if str(c.get("_id")) == str(componentId)]
        record.components = [c for c in (record.components or [])
                             if str(c.get("_id")) != str(componentId)]
        record.save()
    _audit(ctx, record, f"Salary component deleted from {category}: {componentId}",
           before=removed[0] if removed else None)
    return send_response(200, True, "Component deleted successfully", record.to_dict())


ROUTES = [
    ("createSalaryCompensation", create_salary_compensation, "create_salary_compensation"),
    ("updateSalaryCompensation/<str:category>/<str:componentId>", update_salary_compensation,
     "update_salary_compensation"),
    ("getSalaryCompensation/<str:category>/<str:componentId>", get_salary_compensation,
     "get_salary_compensation"),
    ("getSalaryCompenBYCategory/<str:category>", get_salary_compen_by_category,
     "get_salary_compen_by_category"),
    ("getAllSalaryCompensations", get_all_salary_compensations, "get_all_salary_compensations"),
    ("deleteSalaryCompensation/<str:category>/<str:componentId>", delete_salary_compensation,
     "delete_salary_compensation"),
]
