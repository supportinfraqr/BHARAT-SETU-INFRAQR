"""Claims & declarations — port of ``controller/payroll/claimsDeclaration.js``.

GET / POST endpoints are ``access="any"`` (employees call them for their own row; a worker
is scoped to themselves via ``get_employee``). Status / verify / approve PUTs are HR-only.
"""

import math
import uuid

from django.db import transaction
from django.utils import timezone

from .. import bss_adapter
from ..context import PayrollError, by_method, get_employee, payroll_view, send_response
from ..models.base import iso, new_subdoc_id
from ..services.audit_log import log_payroll_action
from ..services.financial_year import _to_instant
from ..services.jsmath import clean, js_str, js_truthy, to_number
from ..services.loan_helper import js_iso

BODY_ONLY = object()


def _cast_number(value, path):
    """Mongoose ``Number`` cast of a sub-document field on save: numeric strings become
    numbers, ``''`` -> null, anything else unparsable -> CastError (legacy 500)."""
    if value is None:
        return value
    if isinstance(value, bool):
        return 1 if value else 0
    if isinstance(value, (int, float)):
        return clean(float(value))
    if isinstance(value, str) and value.strip() == "":
        return None
    n = to_number(value) if not isinstance(value, (dict, list)) else float("nan")
    if not math.isfinite(n):
        raise PayrollError(f'ClaimsDeclaration validation failed: {path}: Cast to Number failed for '
                           f'value "{js_str(value)}" (type {type(value).__name__}) at path '
                           f'"{path.rsplit(".", 1)[-1]}"', 500)
    return clean(n)


def _cast_date(value, path):
    """Mongoose ``Date`` cast -> stored ISO string (``null``/``''`` -> null)."""
    if value is None or value == "":
        return None
    inst = _to_instant(value)
    if inst is None:
        raise PayrollError(f'ClaimsDeclaration validation failed: {path}: Cast to date failed for '
                           f'value "{js_str(value)}" (type {type(value).__name__}) at path '
                           f'"{path.rsplit(".", 1)[-1]}"', 500)
    return js_iso(inst)


def _valid_uuid(value):
    try:
        uuid.UUID(str(value))
        return True
    except (TypeError, ValueError):
        return False


def _require_hr(ctx):
    if ctx.is_employee:
        raise PayrollError("Only HR can review claims and declarations", 403)


def _employee_for(ctx, employee_id, must_exist):
    """Worker -> own row only (404 otherwise). HR -> the org row, or None when absent
    (legacy GETs never checked the employee and answered with an empty list)."""
    if ctx.is_employee or must_exist:
        return get_employee(ctx, employee_id)
    from ..models import PayrollEmployee

    if not _valid_uuid(employee_id):
        return None
    return PayrollEmployee.objects.filter(org=ctx.require_org(), pk=employee_id).first()


def _claim(ctx, emp, lock=False):
    from ..models import ClaimsDeclaration

    if emp is None:
        return None
    qs = ClaimsDeclaration.objects.filter(org=ctx.require_org(), employee=emp)
    if lock:
        qs = qs.select_for_update()
    return qs.order_by("created_at").first()


def _get_or_new(ctx, emp):
    from ..models import ClaimsDeclaration

    claim = _claim(ctx, emp, lock=True)
    if claim is None:
        claim = ClaimsDeclaration(org=ctx.require_org(), employee=emp)
    return claim


def _find_sub(items, sub_id):
    return next((x for x in items or [] if str(x.get("_id")) == str(sub_id)), None)


def _audit(ctx, claim, emp, action, remarks):
    log_payroll_action(ctx, action=action, entity_type="claim", entity_id=str(claim.pk),
                       affected_employee=emp, remarks=remarks)


def _notify(emp, title, body):
    try:
        bss_adapter.notify(emp.worker, title, body)
    except Exception:  # noqa: BLE001 — notifications never block a claim update
        pass


# ------------------------------------------------------------------ flexible plan


@payroll_view(["POST"], access="any")
def create_or_update_flexible_plan(ctx, employeeId):
    ctx.require_org()
    body = ctx.body
    if not js_truthy(body.get("componentName")) or not js_truthy(body.get("amount")):
        raise PayrollError("Component name and amount are required", 400)
    emp = _employee_for(ctx, employeeId, True)
    with transaction.atomic():
        claim = _get_or_new(ctx, emp)
        item = {"_id": new_subdoc_id()}
        index = len(claim.flexible_benefit_plan or [])
        for key in ("componentId", "componentName", "amount", "month"):
            if key in body:
                item[key] = body[key]
        if "amount" in item:
            item["amount"] = _cast_number(item["amount"], f"flexibleBenefitPlan.{index}.amount")
        item["status"] = "pending"
        claim.flexible_benefit_plan = list(claim.flexible_benefit_plan or []) + [item]
        claim.save()
    _audit(ctx, claim, emp, "claim_approved", f"Flexible benefit plan submitted: {body.get('componentName')} (pending)")
    return send_response(200, True, "Flexible benefit plan added successfully", claim.to_dict())


@payroll_view(["PUT"], access="any")
def update_flexible_plan_status(ctx, employeeId, planId):
    _require_hr(ctx)
    ctx.require_org()
    body = ctx.body
    status = body.get("status")
    if status not in ("approved", "rejected", "pending"):
        raise PayrollError("Invalid status. Must be approved, rejected, or pending", 400)
    emp = _employee_for(ctx, employeeId, False)
    with transaction.atomic():
        claim = _claim(ctx, emp, lock=True)
        if claim is None:
            raise PayrollError("No claims found for this employee", 404)
        plan = _find_sub(claim.flexible_benefit_plan, planId)
        if plan is None:
            raise PayrollError("Flexible plan not found", 404)
        plan["status"] = status
        if "amount" in body:
            index = claim.flexible_benefit_plan.index(plan)
            plan["amount"] = _cast_number(body["amount"], f"flexibleBenefitPlan.{index}.amount")
        claim.save()
    _audit(ctx, claim, emp, "claim_rejected" if status == "rejected" else "claim_approved",
           f"Flexible plan {planId} -> {status}")
    _notify(emp, f"Flexible benefit plan {status}", f"Your flexible benefit plan was marked {status}.")
    return send_response(200, True, "Flexible plan status updated successfully", claim.to_dict())


@payroll_view(["GET"], access="any")
def get_flexible_plans_by_employee(ctx, employeeId):
    claim = _claim(ctx, _employee_for(ctx, employeeId, False))
    return send_response(200, True, "Flexible plans fetched successfully",
                         (claim.flexible_benefit_plan if claim else None) or [])


# ------------------------------------------------------------------ reimbursements


@payroll_view(["POST"], access="any")
def submit_reimbursement_claim(ctx, employeeId):
    ctx.require_org()
    body = ctx.body
    if not (js_truthy(body.get("name")) and js_truthy(body.get("type")) and js_truthy(body.get("claimedAmount"))):
        raise PayrollError("Name, type, and claimed amount are required", 400)
    emp = _employee_for(ctx, employeeId, True)
    with transaction.atomic():
        claim = _get_or_new(ctx, emp)
        index = len(claim.reimbursements or [])
        item = {
            "_id": new_subdoc_id(), "name": body["name"], "type": body["type"],
            "claimDate": _cast_date(body.get("claimDate"), f"reimbursements.{index}.claimDate")
            if body.get("claimDate") else iso(timezone.now()),
            "claimedAmount": _cast_number(body["claimedAmount"],
                                          f"reimbursements.{index}.claimedAmount"),
            "approvedAmount": 0,
            "proofUrl": body.get("proofUrl") or "", "attachmentUrls": [], "status": "pending",
        }
        claim.reimbursements = list(claim.reimbursements or []) + [item]
        claim.save()
    _audit(ctx, claim, emp, "claim_approved", f"Reimbursement claim submitted: {body['name']} (pending)")
    return send_response(200, True, "Reimbursement claim submitted successfully", claim.to_dict())


@payroll_view(["PUT"], access="any")
def update_reimbursement_status(ctx, employeeId, claimId):
    _require_hr(ctx)
    ctx.require_org()
    body = ctx.body
    status = body.get("status")
    if status not in ("approved", "rejected", "pending"):
        raise PayrollError("Invalid status", 400)
    emp = _employee_for(ctx, employeeId, False)
    with transaction.atomic():
        claim = _claim(ctx, emp, lock=True)
        if claim is None:
            raise PayrollError("No claims found for this employee", 404)
        item = _find_sub(claim.reimbursements, claimId)
        if item is None:
            raise PayrollError("Reimbursement claim not found", 404)
        item["status"] = status
        if "approvedAmount" in body:
            index = claim.reimbursements.index(item)
            item["approvedAmount"] = _cast_number(body["approvedAmount"],
                                                  f"reimbursements.{index}.approvedAmount")
        claim.save()
    _audit(ctx, claim, emp, "claim_rejected" if status == "rejected" else "claim_approved",
           f"Reimbursement {claimId} -> {status}")
    _notify(emp, f"Reimbursement claim {status}", f"Your reimbursement claim was marked {status}.")
    return send_response(200, True, "Reimbursement status updated successfully", claim.to_dict())


@payroll_view(["GET"], access="any")
def get_reimbursements_by_employee(ctx, employeeId):
    claim = _claim(ctx, _employee_for(ctx, employeeId, False))
    return send_response(200, True, "Reimbursements fetched successfully",
                         (claim.reimbursements if claim else None) or [])


# ------------------------------------------------------------------ income tax declarations


@payroll_view(["POST"], access="any")
def save_income_tax_declaration(ctx, employeeId):
    ctx.require_org()
    body = ctx.body
    if not js_truthy(body.get("section")) or not js_truthy(body.get("amountDeclared")):
        raise PayrollError("Section and amount declared are required", 400)
    emp = _employee_for(ctx, employeeId, True)
    with transaction.atomic():
        claim = _get_or_new(ctx, emp)
        index = len(claim.income_tax_declarations or [])
        item = {"_id": new_subdoc_id(), "section": body["section"], "subSection": body.get("subSection") or "",
                "amountDeclared": _cast_number(body["amountDeclared"],
                                               f"incomeTaxDeclarations.{index}.amountDeclared"),
                "amountApproved": 0}
        claim.income_tax_declarations = list(claim.income_tax_declarations or []) + [item]
        claim.save()
    _audit(ctx, claim, emp, "claim_approved", f"Income tax declaration submitted: {body['section']} (pending)")
    return send_response(200, True, "Income tax declaration saved successfully", claim.to_dict())


@payroll_view(["PUT"], access="any")
def update_income_tax_declaration(ctx, employeeId, declarationId):
    _require_hr(ctx)
    ctx.require_org()
    body = ctx.body
    emp = _employee_for(ctx, employeeId, False)
    with transaction.atomic():
        claim = _claim(ctx, emp, lock=True)
        if claim is None:
            raise PayrollError("No claims found for this employee", 404)
        item = _find_sub(claim.income_tax_declarations, declarationId)
        if item is None:
            raise PayrollError("Declaration not found", 404)
        if "amountApproved" in body:
            index = claim.income_tax_declarations.index(item)
            item["amountApproved"] = _cast_number(body["amountApproved"],
                                                  f"incomeTaxDeclarations.{index}.amountApproved")
        else:
            item.pop("amountApproved", None)  # legacy assigned undefined
        claim.save()
    _audit(ctx, claim, emp, "claim_approved", f"Income tax declaration {declarationId} approved amount updated")
    return send_response(200, True, "Income tax declaration updated successfully", claim.to_dict())


@payroll_view(["GET"], access="any")
def get_income_tax_declarations_by_employee(ctx, employeeId):
    claim = _claim(ctx, _employee_for(ctx, employeeId, False))
    return send_response(200, True, "Income tax declarations fetched successfully",
                         (claim.income_tax_declarations if claim else None) or [])


# ------------------------------------------------------------------ investment proofs


@payroll_view(["POST"], access="any")
def upload_investment_proof(ctx, employeeId):
    ctx.require_org()
    body = ctx.body
    if not js_truthy(body.get("declarationId")) or not js_truthy(body.get("fileUrl")):
        raise PayrollError("Declaration ID and file URL are required", 400)
    emp = _employee_for(ctx, employeeId, True)
    with transaction.atomic():
        claim = _get_or_new(ctx, emp)
        item = {"_id": new_subdoc_id(), "declarationId": body["declarationId"], "fileUrl": body["fileUrl"],
                "verifiedBy": "", "status": "pending"}
        claim.investment_proofs = list(claim.investment_proofs or []) + [item]
        claim.save()
    _audit(ctx, claim, emp, "claim_approved", "Investment proof uploaded (pending)")
    return send_response(200, True, "Investment proof uploaded successfully", claim.to_dict())


@payroll_view(["PUT"], access="any")
def verify_investment_proof(ctx, employeeId, proofId):
    _require_hr(ctx)
    ctx.require_org()
    body = ctx.body
    status = body.get("status")
    if status not in ("verified", "rejected", "pending"):
        raise PayrollError("Invalid status", 400)
    emp = _employee_for(ctx, employeeId, False)
    with transaction.atomic():
        claim = _claim(ctx, emp, lock=True)
        if claim is None:
            raise PayrollError("No claims found for this employee", 404)
        proof = _find_sub(claim.investment_proofs, proofId)
        if proof is None:
            raise PayrollError("Investment proof not found", 404)
        proof["status"] = status
        if js_truthy(body.get("verifiedBy")):
            proof["verifiedBy"] = body["verifiedBy"]
        claim.save()
    _audit(ctx, claim, emp, "claim_rejected" if status == "rejected" else "claim_approved",
           f"Investment proof {proofId} -> {status}")
    _notify(emp, f"Investment proof {status}", f"Your investment proof was marked {status}.")
    return send_response(200, True, "Investment proof verified successfully", claim.to_dict())


@payroll_view(["GET"], access="any")
def get_investment_proofs_by_employee(ctx, employeeId):
    claim = _claim(ctx, _employee_for(ctx, employeeId, False))
    return send_response(200, True, "Investment proofs fetched successfully",
                         (claim.investment_proofs if claim else None) or [])


@payroll_view(["GET"], access="any")
def get_all_claims_by_employee(ctx, employeeId):
    claim = _claim(ctx, _employee_for(ctx, employeeId, False))
    return send_response(200, True, "Claims data fetched successfully", claim.to_dict() if claim else {})


ROUTES = [
    ("flexiblePlan/<str:employeeId>", by_method(POST=create_or_update_flexible_plan,
                                                  GET=get_flexible_plans_by_employee), "flexible_plan"),
    ("flexiblePlan/<str:employeeId>/<str:planId>/status", update_flexible_plan_status, "flexible_plan_status"),
    ("reimbursement/<str:employeeId>", by_method(POST=submit_reimbursement_claim,
                                                   GET=get_reimbursements_by_employee), "reimbursement"),
    ("reimbursement/<str:employeeId>/<str:claimId>/status", update_reimbursement_status, "reimbursement_status"),
    ("taxDeclaration/<str:employeeId>", by_method(POST=save_income_tax_declaration,
                                                    GET=get_income_tax_declarations_by_employee), "tax_declaration"),
    ("taxDeclaration/<str:employeeId>/<str:declarationId>", update_income_tax_declaration,
     "tax_declaration_update"),
    ("investmentProof/<str:employeeId>", by_method(POST=upload_investment_proof,
                                                     GET=get_investment_proofs_by_employee), "investment_proof"),
    ("investmentProof/<str:employeeId>/<str:proofId>/verify", verify_investment_proof, "investment_proof_verify"),
    ("allClaims/<str:employeeId>", get_all_claims_by_employee, "all_claims"),
]
