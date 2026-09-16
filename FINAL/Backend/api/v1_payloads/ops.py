"""Government / operations / admin payroll payload builders."""

# ruff: noqa: F401,F403
from .common import *  # noqa: F401,F403
from .shared import *  # noqa: F401,F403
from .worker import *  # noqa: F401,F403
from .contractor import *  # noqa: F401,F403
from .employer import *  # noqa: F401,F403


def build_government_portal():
    workers = []
    for b in WorkerContractorBinding.objects.filter(binding_status="ACCEPTED")[:50]:
        wi = WorkerIdentity.objects.filter(user=b.worker).first()
        site = b.site
        employer_profile = getattr(site.employer, "employer_profile", None) if site else None
        contractor_profile = getattr(b.contractor, "contractor_profile", None)
        ss = WorkerSocialSecurity.objects.filter(user=b.worker).first()
        workers.append({
            "id": b.worker_id,
            "state": site.state if site else "",
            "district": site.district if site else "",
            "city": site.city if site else "",
            "age": wi.age if wi and wi.age else None,
            "gender": _d(wi.gender if wi else ""),
            "category": "",
            "occupation": "",
            "site": site.site_name if site else "",
            "siteType": site.site_type if site else "",
            "employer": _d(employer_profile.employer_name if employer_profile else ""),
            "contractor": _d(contractor_profile.contractor_name if contractor_profile else b.contractor.username),
            "migrant": False,
            "stateOfOrigin": "",
            "attendance": "PRESENT",
            "compliance": 100,
            "epfoLinked": bool(ss and ss.epfo_uan),
            "esicLinked": bool(ss and ss.esic_ip_number),
            "wage": 0,
        })
    return {
        "generatedAt": _dts(timezone.now()),
        "source": "BSS Registry",
        "states": list(GEOGRAPHY.keys()),
        "workers": workers,
    }


def build_operations(role):
    return {
        "generatedAt": _dts(timezone.now()),
        "role": role,
        "metrics": {"uptime": "99.99%", "activeSessions": 0, "queueDepth": 0,
                    "failedJobs": 0, "openTickets": 0, "openCases": 0},
        "services": [],
        "logs": [],
        "tickets": [],
        "cases": [],
    }


def build_admin_payroll(user):
    employers = []
    for ep in EmployerProfile.objects.select_related("user").all():
        employers.append({
            "bssId": _d(ep.employer_code),
            "name": _d(ep.employer_name) or ep.user.username,
        })

    contractors = []
    for cp in ContractorProfile.objects.select_related("user").all():
        contractors.append({
            "bssId": _d(cp.contractor_code),
            "name": _d(cp.contractor_name) or cp.user.username,
        })

    site_names = list(Site.objects.exclude(site_name="").values_list("site_name", flat=True))

    admin_workers = []
    seen = set()
    for b in WorkerContractorBinding.objects.filter(binding_status="ACCEPTED"):
        if b.worker_id in seen:
            continue
        seen.add(b.worker_id)
        wi = WorkerIdentity.objects.filter(user_id=b.worker_id).first()
        cp = getattr(b.contractor, "contractor_profile", None)
        ep = getattr(b.site.employer, "employer_profile", None) if b.site else None
        admin_workers.append({
            "bssId": _d(wi.bss_worker_id if wi else ""),
            "name": _d(wi.name if wi else b.worker.username),
            "employer": _d(ep.employer_name if ep else ""),
            "site": b.site.site_name if b.site else "",
            "contractor": _d(cp.contractor_name if cp else ""),
            "designation": _d(b.designation),
        })

    payroll_user = User.objects.filter(employer_profile__isnull=False,
                                       payroll_config__isnull=False).order_by("id").first()
    config = _contractor_payroll_config(payroll_user) if payroll_user else _contractor_payroll_config(None)

    records = []
    for w in WorkerWages.objects.select_related("worker", "site", "contractor").order_by("-period_start"):
        wi = WorkerIdentity.objects.filter(user_id=w.worker_id).first()
        binding = WorkerContractorBinding.objects.filter(worker_id=w.worker_id,
                                                         binding_status="ACCEPTED").first()
        site = w.site or (binding.site if binding else None)
        contractor_user = w.contractor or (binding.contractor if binding else None)
        cp = getattr(contractor_user, "contractor_profile", None) if contractor_user else None
        ep = getattr(site.employer, "employer_profile", None) if site else None

        gross = _num(w.gross_wage)
        basic = gross if not w.base_wage else float(w.base_wage)
        employee_pf = round(basic * 0.12, 2)
        employer_pf = round(basic * 0.12, 2)
        eps = round(basic * 0.0833, 2)
        edli = round(basic * 0.005, 2)
        admin = round(basic * 0.005, 2)
        employee_esi = round(gross * 0.0075, 2)
        employer_esi = round(gross * 0.0325, 2)
        employee_pt = 200.0
        employer_pt = 200.0
        lwf_employee = 12.0
        lwf_employer = 12.0
        total_deductions = _num(w.deductions_amount)
        net = _num(w.net_wage)
        employer_cost = round(gross + employer_pf + employer_esi + employer_pt + lwf_employer + admin, 2)

        status_map = {"DRAFT": "Draft", "APPROVED": "Reviewed", "PAID": "Verified",
                      "CANCELLED": "Exception"}
        status_label = status_map.get(w.status, "Draft")

        records.append({
            "id": f"PW{w.id}",
            "workerId": _d(wi.bss_worker_id if wi else ""),
            "workerName": _d(wi.name if wi else w.worker.username),
            "employer": _d(ep.employer_name if ep else ""),
            "site": site.site_name if site else "",
            "period": w.period_start.strftime("%b %Y") if w.period_start else "",
            "status": status_label,
            "attendanceDays": _num(w.days_present),
            "lopDays": _num(w.days_absent),
            "pfWage": round(basic, 2),
            "earnings": [{"component": "Basic + Allowances", "amount": round(gross, 2)}],
            "deductions": [{"component": "Statutory Deductions", "amount": round(total_deductions, 2)}],
            "contributions": {
                "employeePF": employee_pf, "employerPF": employer_pf, "eps": eps, "edli": edli,
                "admin": admin, "employeeESI": employee_esi, "employerESI": employer_esi,
                "employeePT": employee_pt, "employerPT": employer_pt,
                "lwfEmployee": lwf_employee, "lwfEmployer": lwf_employer,
            },
            "gross": round(gross, 2),
            "totalDeductions": round(total_deductions, 2),
            "netPay": round(net, 2),
            "employerCost": employer_cost,
            "updatedAt": _dts(w.updated_at),
            "updatedBy": _d(cp.contractor_name if cp else "") or _d(ep.employer_name if ep else "") or "System",
            "source": "Contractor" if contractor_user else "Employer",
            "matchState": "Needs Review",
            "contractor": _d(cp.contractor_name if cp else ""),
        })

    return {
        "dataMode": "remote",
        "generatedAt": _dts(timezone.now()),
        "employers": employers,
        "contractors": contractors,
        "sites": site_names,
        "workers": admin_workers,
        "payroll": {
            "config": config,
            "records": records,
            "templateColumns": ["id", "workerId", "workerName", "employer", "site", "contractor",
                                "period", "status", "gross", "netPay"],
        },
        "sourceNote": "Live database — DB-driven worker payroll across all employers",
    }


__all__ = [
    "build_admin_payroll",
    "build_government_portal",
    "build_operations",
]
