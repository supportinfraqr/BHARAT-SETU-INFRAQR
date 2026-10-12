"""Worker cost-sheet rule + calculation engine.

Every worker cost is built in three layers, always in the same order:

    minimum-wage layer  (statutory, read-only)
  + statutory layer     (EPF/EPS/EDLI/ESIC/Bonus/Gratuity/LWF/leave/holidays)
  + custom cost layer   (org-added cost heads)
  = total employer cost / CTC

Contractor billing is never calculated from scratch — it starts from the
employer cost and adds the contractor-only components on top.

Reference: ``Requirements/BSS_Cost sheet template_flows.docx`` sections 4 & 5.
"""

# Statutory base + default rate table (rates always come from the template's
# statutory lines, which mirror the statutory master — never hardcoded here).
_PF_COMPONENTS = {"EPF", "EPS", "EDLI"}
_BASIC_COMPONENTS = {"BONUS", "GRATUITY", "LEAVE_RESERVE"}
_DAY_COMPONENTS = {"WEEKLY_OFF", "NATIONAL_HOLIDAYS"}
_PF_WAGE_CAP = 15000.0
_ESIC_WAGE_THRESHOLD = 21000.0


def _f(value):
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return 0.0


def _base_for(component, *, wage, basic, pf_cap, esic_threshold):
    if component in _PF_COMPONENTS:
        return min(wage, pf_cap)
    if component == "ESIC":
        return wage if wage <= esic_threshold else 0.0
    if component in _BASIC_COMPONENTS:
        return basic
    return wage


def resolve_root(template):
    """Walk up the inheritance chain to the root that owns the statutory rules.

    A level inherits its parent's statutory rules unless it opted out via
    ``inherits_parent_rules = False``. Statutory rules can only be added to or
    narrowed down the chain, never overridden from above."""
    node = template
    seen = set()
    while node.parent_id and node.inherits_parent_rules and node.id not in seen:
        seen.add(node.id)
        node = node.parent
    return node


def compute_worker_cost(template, *, basic_wage=None, vda=None, working_days=26,
                        pf_cap=_PF_WAGE_CAP, esic_threshold=_ESIC_WAGE_THRESHOLD,
                        include_contractor=False, overrides=None):
    """Compute the layered cost breakdown for one worker under a template.

    ``template`` is a CostSheetTemplate; ``overrides`` maps a custom cost-head
    name to a replacement amount (org customisation, respecting editable_by_org).
    """
    overrides = overrides or {}
    # Statutory rules + minimum wage are inherited from the root template; the
    # template's own custom cost lines are applied on top.
    statutory_source = resolve_root(template)
    minimum_wage = statutory_source.minimum_wages.first() or template.minimum_wages.first()
    basic = _f(basic_wage if basic_wage is not None
               else (minimum_wage.basic_wage if minimum_wage else 0))
    dearness = _f(vda if vda is not None else (minimum_wage.vda if minimum_wage else 0))
    wage = basic + dearness
    daily = round(wage / working_days, 2) if working_days else 0.0

    statutory_rows = []
    statutory_total = 0.0
    for line in statutory_source.statutory_lines.all():
        if not line.applicable:
            continue
        rate = _f(line.rate)
        if line.rate_type == "DAYS":
            amount = round(daily * rate, 2)
        elif line.rate_type == "FIXED":
            amount = round(rate, 2)
        else:
            base = _base_for(line.component, wage=wage, basic=basic,
                             pf_cap=pf_cap, esic_threshold=esic_threshold)
            amount = round(base * rate / 100.0, 2)
        statutory_total += amount
        statutory_rows.append({
            "component": line.component, "rate": rate, "rateType": line.rate_type,
            "applicable": True, "mandatory": line.mandatory,
            "condition": line.condition, "amount": amount,
        })

    custom_rows = []
    employer_custom = 0.0
    contractor_custom = 0.0
    for line in template.custom_lines.all():
        amount = _f(line.amount)
        if line.name in overrides and line.editable_by_org:
            amount = _f(overrides[line.name])
        if line.rate_type == "PERCENT":
            computed = round(wage * amount / 100.0, 2)
        elif line.frequency == "ANNUAL":
            computed = round(amount / 12.0, 2)
        else:
            computed = round(amount, 2)
        custom_rows.append({
            "name": line.name, "amount": amount, "rateType": line.rate_type,
            "frequency": line.frequency, "appliesTo": line.applies_to,
            "editableByOrg": line.editable_by_org, "computed": computed,
        })
        # Count each custom head exactly ONCE. Only a genuine employer-side head
        # adds to the employer cost; everything else (contractor / both) is the
        # contractor's billing — so a "both" head is never double-counted.
        if line.applies_to == "employer":
            employer_custom += computed
        else:
            contractor_custom += computed

    employer_cost = round(wage + statutory_total + employer_custom, 2)
    # Contractor billing is always derived; the final CTC to the employer is the
    # employer cost plus the contractor-applied custom heads.
    contractor_billing = round(employer_cost + contractor_custom, 2)

    return {
        "basicWage": round(basic, 2),
        "vda": round(dearness, 2),
        "minimumWage": round(wage, 2),
        "dailyWage": daily,
        "statutory": statutory_rows,
        "statutoryTotal": round(statutory_total, 2),
        "custom": custom_rows,
        "customTotal": round(employer_custom, 2),
        "contractorTotal": round(contractor_custom, 2),
        "employerCost": employer_cost,
        "contractorBilling": contractor_billing,
        "ctc": contractor_billing,
        "currency": template.currency,
        "templateCode": template.code,
        "templateName": template.name,
    }
