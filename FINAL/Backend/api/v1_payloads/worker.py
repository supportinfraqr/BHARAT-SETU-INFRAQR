"""Worker portal payload builder and its section helpers."""

# ruff: noqa: F401,F403
from .common import *  # noqa: F401,F403
from .shared import *  # noqa: F401,F403


_LETTER_MASTER_CODES = {"APPT", "EXPL"}


def _worker_identity_section(identity):
    category = ""
    if identity:
        wc = WorkerClassification.objects.filter(user=identity.user).first()
        category = _d(wc.worker_category if wc else "")
    return {
        "name": _identity_display(identity, "name"),
        "bssId": _identity_display(identity, "bss_worker_id"),
        "category": category,
        "aadhaarVerified": bool(identity and identity.aadhaar),
        "panVerified": bool(identity and identity.pan_verified),
        "photoUrl": _identity_display(identity, "photo"),
        "dob": _dts(identity.date_of_birth if identity else None),
        "gender": _identity_display(identity, "gender"),
        "aadhaar": _identity_display(identity, "aadhaar"),
        "pan": _identity_display(identity, "pan"),
        "placeOfBirth": _identity_display(identity, "place_of_birth"),
        "alternateMobile": _identity_display(identity, "alternate_mobile"),
        "email": _identity_display(identity, "email"),
        "emergencyContactName": _identity_display(identity, "emergency_contact_name"),
        "emergencyContactNumber": _identity_display(identity, "emergency_contact_number"),
        "emergencyContactRelation": _identity_display(identity, "emergency_contact_relation"),
        "disabilityTypePct": _identity_display(identity, "disability_type_pct"),
    }


def _worker_employment_section(user, identity):
    emp = WorkerEmployment.objects.filter(user=user).first()
    binding = None
    if emp and emp.assignment_id:
        binding = emp.assignment
    if binding is None:
        # No WorkerEmployment record yet — fall back to the most recent accepted
        # binding so the dashboard reflects the current employment.
        binding = (WorkerContractorBinding.objects
                   .filter(worker=user, binding_status="ACCEPTED")
                   .select_related("site", "site__employer", "contractor")
                   .order_by("-accepted_at", "-created_at").first())
    employer_name = ""
    employer_code = ""
    employer_industry = ""
    employer_email = ""
    employer_lin = ""
    
    contractor_name = ""
    contractor_code = ""
    contractor_contact = ""
    contractor_email = ""
    contractor_lin = ""

    site_name = ""
    site_code = ""
    site_location = ""
    medical_officer = ""
    officer_contact = ""
    site_colour = ""

    if binding:
        if binding.site:
            site = binding.site
            site_name = site.site_name or ""
            site_code = getattr(site, "site_code", "") or ""
            site_location = getattr(site, "location", "") or ""
            medical_officer = getattr(site, "medical_officer", "") or ""
            officer_contact = getattr(site, "officer_contact", "") or ""
            site_colour = getattr(site, "assign_color", "") or ""
        if binding.contractor:
            cp = getattr(binding.contractor, "contractor_profile", None)
            contractor_name = _org_name(binding.contractor)
            contractor_code = _bss_contractor_code(binding.contractor.id) if binding.contractor else ""
            contractor_contact = _d(getattr(cp, "mobile", "") or getattr(cp, "contact_person", "") if cp else "")
            contractor_email = _d(getattr(cp, "email", "") if cp else "")
            contractor_lin = _d(getattr(cp, "lin", "") if cp else "")
        if binding.site and binding.site.employer:
            emp_profile = getattr(binding.site.employer, "employer_profile", None)
            employer_name = _org_name(binding.site.employer)
            employer_code = _bss_employer_code(binding.site.employer.id) if binding.site.employer else ""
            employer_industry = _d(getattr(emp_profile, "industry", "") if emp_profile else "")
            employer_email = _d(getattr(emp_profile, "email", "") if emp_profile else "")
            employer_lin = _d(getattr(emp_profile, "lin", "") if emp_profile else "")

    contractor_state = ""
    contractor_address = ""
    if binding and binding.contractor:
        _cp = getattr(binding.contractor, "contractor_profile", None)
        contractor_state = _d(_cp.state if _cp else "")
        contractor_address = _d(_cp.address if _cp else "")
    employer_state = ""
    employer_address = ""
    if binding and binding.site and binding.site.employer:
        _ep = getattr(binding.site.employer, "employer_profile", None)
        employer_state = _d(_ep.state if _ep else "")
        employer_address = _d(_ep.address if _ep else "")
    site_state = getattr(binding.site, "state", "") if binding and binding.site else ""
    return {
        "status": (_d(getattr(emp, "status", "")) if emp and getattr(emp, "status", "")
                   else ("Active" if binding else "")),
        "employer": employer_name,
        "contractor": contractor_name,
        "site": site_name,
        "department": (_d(binding.department) if binding and binding.department
                       else (_d(getattr(emp, "department", "")) if emp else "")),
        "designation": (_d(binding.designation) if binding and binding.designation
                        else (_d(getattr(emp, "designation", "")) if emp else "")),
        "doj": (_dts(emp.doj) if emp and emp.doj
                else (_dts(binding.accepted_at) if binding and binding.accepted_at else "")),
        "shift": (_d(binding.shift) if binding and binding.shift
                  else (_d(getattr(emp, "shift", "")) if emp else "")),
        "campNo": _d(emp.camp_no) if emp else "",
        "refWorkerId": _d(emp.ref_worker_id) if emp else "",
        "transportFacility": _d(emp.transport_facility) if emp else "",
        "route": _d(emp.route) if emp else "",
        "busNo": _d(emp.bus_no) if emp else "",
        "pfAccount": _d(emp.pf_account) if emp else "",
        "natureOfJob": _d(emp.nature_of_job) if emp else "",
        "typeOfWork": _d(emp.type_of_work) if emp else "",
        "idCardIssueDate": _dts(emp.id_card_issue_date) if emp and emp.id_card_issue_date else "",
        "idCardValidityTill": _dts(emp.id_card_validity_till) if emp and emp.id_card_validity_till else "",
        # Cost sheet applied at binding — the worker's wage / CTC breakdown.
        "costSheet": _d(binding.cost_sheet.code) if binding and binding.cost_sheet_id else "",
        "costSheetName": _d(binding.cost_sheet.name) if binding and binding.cost_sheet_id else "",
        "offeredWage": _num(binding.offered_wage) if binding else 0,
        "ctc": _num(binding.computed_ctc) if binding else 0,
        "costBreakdown": (binding.cost_breakdown or {}) if binding else {},
        "contractorDetails": {
            "name": contractor_name,
            "code": contractor_code,
            "contact": contractor_contact,
            "email": contractor_email,
            "lin": contractor_lin,
            "state": contractor_state,
            "address": contractor_address,
        },
        "employerDetails": {
            "name": employer_name,
            "code": employer_code,
            "industry": employer_industry,
            "email": employer_email,
            "lin": employer_lin,
            "state": employer_state,
            "address": employer_address,
        },
        "siteDetails": {
            "name": site_name,
            "code": site_code,
            "location": site_location,
            "medicalOfficer": medical_officer,
            "officerContact": officer_contact,
            "state": site_state,
            "colour": site_colour,
        }
    }


def _worker_compliance_section(user):
    ws = WorkerWelfareSafety.objects.filter(user=user).first()
    gp = WorkerGatePass.objects.filter(worker=user).order_by("-created_at").first()
    gp_status = ""
    if gp:
        gp_status = "Active" if gp.status in ("ACTIVE", "APPROVED") else ("Pending Approval" if gp.status == "PENDING" else _d(gp.status))
    elif ws and ws.permanent_gatepass_status:
        gp_status = _d(ws.permanent_gatepass_status)

    ppe = []
    given = ws.types_of_ppe_given if ws else ""
    ppe = [p.strip() for p in given.split(",") if p.strip()] if given else []
    days_left = 0
    if ws and ws.next_medical_due:
        today = timezone.now().date()
        due = ws.next_medical_due.date() if hasattr(ws.next_medical_due, "date") else ws.next_medical_due
        days_left = max(0, (due - today).days)

    return {
        "siteInduction": _d(ws.site_induction_status if ws else ""),
        "ppeIssued": ppe,
        "policeVerification": _d(ws.police_verification if ws else ""),
        "permanentGatePass": gp_status,
        "medicalFitnessDaysLeft": days_left,
        "medicalExaminationStatus": _d(ws.medical_examination_status if ws else ""),
        "medicalFitnessStatus": _d(ws.medical_fitness_status if ws else ""),
    }


def _worker_skills_section(user):
    sk = WorkerSkillsEmployability.objects.filter(user=user).first()
    languages = [s.strip() for s in (sk.languages_known or "").split(",") if s.strip()] if sk else []
    educations = [
        {
            "id": e.id,
            "qualificationCourse": _d(e.qualification_course),
            "boardUniversity": _d(e.board_university),
            "passingYear": _d(e.passing_year),
        }
        for e in WorkerEducation.objects.filter(user=user).order_by("id")
    ]
    skill_items = [
        {
            "id": s.id,
            "name": _d(s.name),
            "experienceYears": _d(s.experience_years),
            "verified": bool(s.verified),
            "certification": {
                "name": _d(s.certification_name),
                "number": _d(s.certification_number),
                "authority": _d(s.certification_authority),
                "expiry": _dts(s.certification_expiry) if s.certification_expiry else "",
            },
        }
        for s in WorkerSkill.objects.filter(user=user).order_by("id")
    ]
    if not skill_items and sk and _d(sk.primary_skill):
        skill_items = [{
            "id": None,
            "name": _d(sk.primary_skill),
            "experienceYears": _d(sk.skill_experience_years),
            "verified": bool(sk.certification_verified),
            "certification": {
                "name": _d(sk.certification_name),
                "number": _d(sk.certification_number),
                "authority": _d(sk.certification_authority),
                "expiry": _dts(sk.certification_expiry) if sk.certification_expiry else "",
            },
        }]
    first = skill_items[0] if skill_items else None
    verified_item = next((s for s in skill_items if s["verified"]), None)
    return {
        "educations": educations,
        "languages": languages,
        "items": skill_items,
        # Backward-compatible derived fields for dashboards / scan views.
        "primary": {"name": first["name"] if first else "", "experienceYears": first["experienceYears"] if first else ""},
        "secondary": [s["name"] for s in skill_items[1:]],
        "certification": {**(verified_item["certification"] if verified_item else {"name": "", "number": "", "authority": "", "expiry": ""}), "verified": bool(verified_item)},
    }


def _worker_social_security_section(user):
    ss = WorkerSocialSecurity.objects.filter(user=user).first()
    return {
        "epfoUan": _d(ss.epfo_uan) if ss else "",
        "esicIp": _d(ss.esic_ip_number) if ss else "",
        "lwfNo": _d(ss.lwf_no) if ss else "",
        "wcPolicyNo": _d(ss.wc_policy_no) if ss else "",
        "eShramNo": _d(ss.e_shram_no) if ss else "",
        "bocwRegNumber": _d(ss.bocw_reg_number) if ss else "",
        "stateWorkerId": _d(ss.state_worker_id) if ss else "",
        "eShramLinked": bool(ss and ss.e_shram_no),
        "bocwRegistered": bool(ss and ss.bocw_reg_number),
    }


def _worker_documents_section(user):
    master_docs = []
    try:
        from bss_core.models import WorkerDocumentMaster
        master_docs = list(WorkerDocumentMaster.objects.all())
    except Exception:
        master_docs = []
    required = [
        {"name": _d(m.document_name), "code": _d(m.code), "mandatory": m.is_mandatory}
        for m in master_docs if m.is_mandatory
    ]
    if not required:
        required = [
            {"name": "Aadhaar Card", "code": "AADHAAR", "mandatory": True},
            {"name": "PAN Card", "code": "PAN", "mandatory": False},
        ]
    docs = WorkerDocument.objects.filter(user=user)
    uploaded = [
        {
            "name": _d(d.document.document_name if d.document else ""),
            "status": _d(d.status),
            "date": _dts(d.uploaded_at),
        }
        for d in docs
    ]
    uploaded_names = {u["name"] for u in uploaded}
    missing = [r["name"] for r in required if r["name"] not in uploaded_names]
    return {
        "required": len(required),
        "uploaded": len(uploaded),
        "missing": missing,
    }


def _worker_wages_section(user):
    wages = WorkerWages.objects.filter(worker=user).order_by("-period_end")[:20]
    records = []
    for w in wages:
        payment = w.payments.first() if hasattr(w, "payments") else None
        records.append({
            "id": w.id,
            "period": f"{w.period_start:%d %b %Y} - {w.period_end:%d %b %Y}",
            "paidOn": _dts(payment.paid_at if payment else None),
            "employer": "",
            "contractor": _d(getattr(w.contractor, "username", "")) if w.contractor else "",
            "site": w.site.site_name if w.site else "",
            "basis": _d(w.wage_frequency),
            "gross": _num(w.gross_wage),
            "deductions": _num(w.deductions_amount),
            "net": _num(w.net_wage),
            "status": _d(w.status),
            "reference": _d(payment.transaction_ref) if payment else "",
            "receiptUrl": "",
        })
    return {
        "source": "BSS Payroll",
        "records": records,
        "syncedAt": _dts(timezone.now()),
    }


def _worker_advances(user):
    """Salary advances: worker requests → contractor approves/disburses → worker
    accepts → adjusted in payroll."""
    advances = SalaryAdvance.objects.filter(worker=user).select_related("worker")[:20]
    return [_advance_row(a) for a in advances]


def _worker_attendance_section(user):
    rows = Attendance.objects.filter(worker=user).order_by("-attendance_date")[:60]
    title = {"PRESENT": "Present", "ABSENT": "Absent", "LEAVE": "Leave",
             "HOLIDAY": "Holiday", "EXPECTED": "Present", "LATE": "Late",
             "HALF_DAY": "Half Day"}
    method_label = {"QR": "QR Scan", "NFC": "RFID", "CAMERA": "CCTV"}

    def clock(value):
        if not value:
            return None
        try:
            return timezone.localtime(value).strftime("%H:%M")
        except Exception:
            return _dts(value)

    records = []
    for a in rows:
        raw = _d(a.status)
        records.append({
            "date": _dts(a.attendance_date),
            "presence": title.get(raw, raw),
            "shift": "",
            "site": a.site.site_name if a.site else "",
            "checkIn": clock(a.check_in_time),
            "checkOut": clock(a.check_out_time),
            "status": raw,
            "method": method_label.get(_d(a.capture_method), _d(a.capture_method)),
        })
    return {"source": "BSS Attendance", "records": records, "syncedAt": _dts(timezone.now())}


def _worker_financial_records(user, kind):
    """Real PF / Bonus / Leave-Encashment records for the worker.

    PF is autofetched (source EPFO); Bonus and Leave Encashment are uploaded by
    the contractor.
    """
    if kind == "providentFund":
        rows = []
        for r in WorkerBenefitRecord.objects.filter(worker=user, kind="PF").order_by("-period", "-id")[:24]:
            rows.append({
                "period": _d(r.period),
                "employeeContribution": _num(r.employee_contribution),
                "employerContribution": _num(r.employer_contribution),
                "creditedOn": _dts(r.credited_on) if r.credited_on else _dts(r.created_at.date()),
            })
        return {"source": "EPFO", "records": rows, "syncedAt": _dts(timezone.now())}
    if kind == "bonus":
        rows = []
        for r in WorkerBenefitRecord.objects.filter(worker=user, kind="BONUS").order_by("-period", "-id")[:24]:
            rows.append({
                "id": r.id, "period": _d(r.period), "reason": _d(r.reason),
                "amount": _num(r.amount), "paidOn": _dts(r.paid_on) if r.paid_on else "",
                "status": {"RECORDED": "Recorded", "CREDITED": "Credited",
                           "PROCESSING": "Processing", "PAID": "Paid"}.get(r.status, r.status),
            })
        return {"source": "Contractor", "records": rows, "syncedAt": _dts(timezone.now())}
    if kind == "leaveEncashment":
        rows = []
        for r in WorkerBenefitRecord.objects.filter(worker=user, kind="LEAVE_ENCASHMENT").order_by("-period", "-id")[:24]:
            rows.append({
                "id": r.id, "period": _d(r.period), "days": _num(r.days),
                "rate": _num(r.rate), "amount": _num(r.amount),
                "paidOn": _dts(r.paid_on) if r.paid_on else "",
                "status": {"RECORDED": "Recorded", "CREDITED": "Credited",
                           "PROCESSING": "Processing", "PAID": "Paid"}.get(r.status, r.status),
            })
        return {"source": "Contractor", "records": rows, "syncedAt": _dts(timezone.now())}
    return {"source": "", "records": [], "syncedAt": _dts(timezone.now())}


def _worker_gratuity(user):
    """Gratuity: service derived from the accepted binding + latest application."""
    binding = (WorkerContractorBinding.objects.filter(worker=user, binding_status="ACCEPTED")
               .select_related("site", "site__employer").first())
    service_start = None
    if binding:
        service_start = (binding.accepted_at.date() if binding.accepted_at else binding.created_at.date())
    years = 0
    if service_start:
        today = timezone.localdate()
        years = (today - service_start).days // 365
    latest_wage = WorkerWages.objects.filter(worker=user).order_by("-period_end").first()
    monthly = float(latest_wage.net_wage or 0) if latest_wage else 0
    indicative = round(monthly * 15 / 26 * years) if years else 0
    application = (GratuityApplication.objects.filter(worker=user).order_by("-submitted_on").first())
    scheme_status = "Enabled" if binding else "Non-enabled"
    return {
        "serviceStart": _dts(service_start) if service_start else "",
        "completedService": years,
        "calculationBasis": "15 days' wages per completed year of service",
        "indicativeAmount": indicative,
        "eligibilityStatus": ("eligible" if years >= 5 else ("not_eligible" if binding else "no_binding")),
        "lastUpdated": _dts(timezone.now()),
        "schemeStatus": scheme_status,
        "application": ({
            "reference": _d(application.reference),
            "submittedOn": _dts(application.submitted_on),
            "status": {"SUBMITTED": "Submitted", "UNDER_EXAMINATION": "Under examination",
                       "APPROVED": "Approved", "DISBURSED": "Disbursed",
                       "REJECTED": "Rejected"}.get(application.status, application.status),
        } if application else None),
    }


def _worker_contact_section(user, identity):
    p = UserPreference.objects.filter(user=user).first()
    comm = (p.communication_prefs or {}) if p else {}
    return {
        "mobile": _identity_display(identity, "mobile_number"),
        "alternateMobile": _identity_display(identity, "alternate_mobile"),
        "email": _identity_display(identity, "email"),
        "preferredLanguage": (p.interface_language or "hi") if p else "hi",
        "preferredChannel": comm.get("preferredChannel", "sms"),
    }


def _worker_address_section(user):
    a = WorkerAddressMobility.objects.filter(user=user).first()
    return {
        "current": _d(a.current_address) if a else "",
        "currentState": _d(a.current_state) if a else "",
        "currentDistrict": _d(a.current_district) if a else "",
        "currentCity": _d(a.current_city) if a else "",
        "currentLocality": _d(a.current_locality) if a else "",
        "currentPin": _d(a.current_pincode) if a else "",
        "permanent": _d(a.permanent_address) if a else "",
        "permanentState": _d(a.permanent_state) if a else "",
        "permanentDistrict": _d(a.permanent_district) if a else "",
        "permanentCity": _d(a.permanent_city) if a else "",
        "permanentLocality": _d(a.permanent_locality) if a else "",
        "permanentPin": _d(a.permanent_pincode) if a else "",
        "migrant": bool(a and a.migrant_worker),
        "migrationType": _d(a.migration_type) if a else "",
        "sameAsPermanent": bool(a and a.current_same_as_permanent),
    }


def _worker_personal_section(user, identity):
    return {
        "maritalStatus": _identity_display(identity, "marital_status"),
        "bloodGroup": _identity_display(identity, "blood_group"),
        "fatherName": _identity_display(identity, "father_name"),
        "motherName": _identity_display(identity, "mother_name"),
        "spouseName": _identity_display(identity, "spouse_name"),
        "disabilityStatus": _identity_display(identity, "disability_status"),
        "religion": _identity_display(identity, "religion"),
        "caste": _identity_display(identity, "caste"),
    }


def _worker_banking_section(user):
    b = WorkerBanking.objects.filter(user=user).first()
    return {
        "bankName": _d(b.bank_name) if b else "",
        "holderName": _d(b.bank_account_holder_name) if b else "",
        "accountNumber": _d(b.bank_account_number) if b else "",
        "ifsc": _d(b.ifsc_code) if b else "",
        "verificationStatus": _d(b.bank_verification_status) if b else "",
        "upiEnabled": bool(b and b.upi_enabled),
    }


def _worker_gate_passes(user):
    """The worker's own gate passes. A pass is only visible once the principal
    employer dispatches it — until then it stays undispatched (the employer
    creates and dispatches it from their Gate Pass register)."""
    rows = []
    for g in WorkerGatePass.objects.filter(worker=user, dispatched=True).order_by("-created_at"):
        label = _GP_TYPE_LABEL.get(_d(g.gate_pass_type), _d(g.gate_pass_type))
        blocked = _is_gate_pass_blocked(g.worker, g.site.employer if g.site else None)
        rows.append({
            "id": g.id,
            "type": label,
            "number": _d(g.gate_pass_no),
            "site": g.site.site_name if g.site else "",
            "validFrom": _dts(g.start_date), "validTo": _dts(g.end_date),
            "status": "Blocked" if blocked else _GP_STATUS_LABEL.get(_d(g.status), _d(g.status)),
            "blocked": blocked,
            "dispatched": True,
            "requestedAt": _dts(g.created_at),
            "requestedBy": _party_name(g.issued_by),
            "approvedBy": _party_name(g.approved_by),
            "approvedAt": _dts(g.approved_at),
            "branding": _gate_pass_branding(g.site),
        })
    return rows


def _worker_compliance_records(user):
    """Historical compliance records derived from the worker's own records
    (gate passes + medical / training on the welfare record)."""
    rows = []
    for g in WorkerGatePass.objects.filter(worker=user).order_by("-created_at"):
        label = "Permanent Gate Pass" if g.gate_pass_type == "PGP" else "Temporary Gate Pass"
        event_date = (g.approved_at.date() if g.approved_at else g.created_at.date())
        rows.append({
            "date": _dts(event_date),
            "record": f"{label} issued" if g.status == "ACTIVE" else f"{label} {_GP_STATUS_LABEL.get(_d(g.status), g.status).lower()}",
            "detail": f"{_d(g.gate_pass_no)}" + (f" · {g.site.site_name}" if g.site else ""),
            "ref": _d(g.gate_pass_no),
            "result": _GP_STATUS_LABEL.get(_d(g.status), _d(g.status)),
        })
    ws = WorkerWelfareSafety.objects.filter(user=user).first()
    if ws:
        if ws.last_medical_examination:
            rows.append({
                "date": _dts(ws.last_medical_examination),
                "record": "Medical examination",
                "detail": _d(ws.medical_fitness_status or ws.medical_examination_status) or "Fitness check",
                "ref": "",
                "result": _d(ws.medical_fitness_status or ws.medical_examination_status or "Done"),
            })
        if ws.training_date:
            rows.append({
                "date": _dts(ws.training_date),
                "record": "Safety training",
                "detail": _d(ws.trainer_name) or "Safety training",
                "ref": "",
                "result": "Completed" if ws.safety_training_completed else "Pending",
            })
    rows.sort(key=lambda r: r["date"] or "", reverse=True)
    return rows


def _worker_welfare_section(user):
    ws = WorkerWelfareSafety.objects.filter(user=user).first()
    tgp = _latest_gate_pass(user, "TGP")
    pgp = _latest_gate_pass(user, "PGP")
    return {
        "ppeRequired": bool(ws and ws.ppe_required),
        "typesOfPpeGiven": _d(ws.types_of_ppe_given) if ws else "",
        "safetyTrainingCompleted": bool(ws and ws.safety_training_completed),
        "siteInductionStatus": _d(ws.site_induction_status) if ws else "",
        "insuranceStatus": _d(ws.insurance_status) if ws else "",
        "accommodationProvided": _d(ws.accomodation_provided) if ws else "",
        "policeVerification": _d(ws.police_verification) if ws else "",
        "trainingDate": _dts(ws.training_date) if ws and ws.training_date else "",
        "trainerName": _d(ws.trainer_name) if ws else "",
        "tempGatePassStatus": _GP_WELFARE_LABEL.get(tgp.status, "") if tgp else (_d(ws.temp_gatepass_status) if ws else ""),
        "tgpNo": _d(tgp.gate_pass_no) if tgp else (_d(ws.tgp_no) if ws else ""),
        "tempGatePassStart": _dts(tgp.start_date) if tgp and tgp.start_date else (_dts(ws.temp_gatepass_start_date) if ws and ws.temp_gatepass_start_date else ""),
        "tempGatePassEnd": _dts(tgp.end_date) if tgp and tgp.end_date else (_dts(ws.temp_gatepass_end_date) if ws and ws.temp_gatepass_end_date else ""),
        "permanentGatePassStatus": _GP_WELFARE_LABEL.get(pgp.status, "") if pgp else (_d(ws.permanent_gatepass_status) if ws else ""),
        "pgpNo": _d(pgp.gate_pass_no) if pgp else (_d(ws.pgp_no) if ws else ""),
        "permanentGatePassStart": _dts(pgp.start_date) if pgp and pgp.start_date else (_dts(ws.permanent_gatepass_start_date) if ws and ws.permanent_gatepass_start_date else ""),
        "permanentGatePassEnd": _dts(pgp.end_date) if pgp and pgp.end_date else (_dts(ws.permanent_gatepass_end_date) if ws and ws.permanent_gatepass_end_date else ""),
        "medicalExaminationStatus": _d(ws.medical_examination_status) if ws else "",
        "lastMedicalExamination": _dts(ws.last_medical_examination) if ws and ws.last_medical_examination else "",
        "medicalFitnessStatus": _d(ws.medical_fitness_status) if ws else "",
        "nextMedicalDue": _dts(ws.next_medical_due) if ws and ws.next_medical_due else "",
    }


def _worker_classification_section(user):
    wc = WorkerClassification.objects.filter(user=user).first()
    if not wc:
        return {}
    return {
        "workerCategory": _d(wc.worker_category),
        "sector": _d(wc.sector),
        "industry": _d(wc.industry),
        "occupation": _d(wc.occupation),
        "skill": _d(wc.skill),
        "currentEmploymentStatus": _d(wc.current_employment_status),
        "totalWorkerExperience": _d(wc.total_worker_experience),
        "gigPlatformWorkerId": _d(wc.gig_platform_worker_id),
        "gigPlatformName": _d(wc.gig_platform_name),
        "gigPlatformType": _d(wc.gig_platform_type),
        "gigDateJoined": _dts(wc.gig_date_joined_platform) if wc.gig_date_joined_platform else "",
        "gigAvgHoursPerDay": _d(wc.gig_avg_hours_per_day),
        "gigAvgDaysPerWeek": _d(wc.gig_avg_days_per_week),
        "gigServiceArea": _d(wc.gig_service_area),
        "gigVehicleType": _d(wc.gig_vehicle_type),
        "gigVehicleOwnership": _d(wc.gig_vehicle_ownership),
        "gigDlNumber": _d(wc.gig_dl_number),
        "gigDlExpiry": _dts(wc.gig_dl_expiry) if wc.gig_dl_expiry else "",
        "seBusinessName": _d(wc.se_business_name),
        "seBusinessType": _d(wc.se_business_type),
        "seRegistrationStatus": _d(wc.se_registration_status),
        "seStartDate": _dts(wc.se_start_date) if wc.se_start_date else "",
        "seLocation": _d(wc.se_business_location),
        "seAvgHoursPerDay": _d(wc.se_avg_hours_per_day),
        "seAvgDaysPerWeek": _d(wc.se_avg_days_per_week),
        "seEmployeesCount": wc.se_num_employees,
        "seEmployerName": _d(wc.se_employer_or_business_name),
        "seasonalJobType": _d(wc.season_job_work_type),
        "seasonalStartDate": _dts(wc.season_start_date) if wc.season_start_date else "",
        "seasonalEndDate": _dts(wc.season_end_date) if wc.season_end_date else "",
        "seasonalAvgHoursPerDay": _d(wc.season_avg_hours_per_day),
        "seasonalAvgDaysPerWeek": _d(wc.season_avg_days_per_week),
        "seasonalLocation": _d(wc.season_work_location),
         "seasonalExpectedIncome": _d(wc.season_expected_income),
         "paymentFrequency": _d(wc.season_payment_frequency),
         "paymentMode": _d(wc.payment_mode),
    }


def _worker_family_section(user):
    fam = WorkerFamilyDependant.objects.filter(user=user)
    # The non-nominee "head" row carries the family/dependants counts; nominee
    # rows are the actual nominees. Keep them separate so the head row never
    # leaks into the nominee list as a blank row.
    head = fam.exclude(nominee=True).first()
    return {
        "familyMembersCount": head.family_members_count if head else 0,
        "dependantsCount": head.dependants_count if head else 0,
        "nominees": [
            {
                "id": n.id,
                "name": _d(n.name),
                "dependant": _d(n.dependant),
                "relation": _d(n.relation),
                "nomineeType": _d(n.nominee_type),
                "dob": _dts(n.nominee_dob) if n.nominee_dob else "",
                "age": n.nominee_age,
                "contact": _d(n.contact),
                "address": _d(n.address),
                "documents": (n.nominee_documents
                              or [d for d in (["PAN"] if n.pan_copy_nominee else []) + (["Aadhaar"] if n.aadhaar_copy_nominee else [])]),
                "percent": n.percent if n.percent is not None else 0,
            }
            for n in fam.filter(nominee=True)
        ],
    }


def _worker_preferences_section(user):
    p = UserPreference.objects.filter(user=user).first()
    privacy = (p.privacy_prefs or {}) if p else {}
    return {
        "consentToPublicPhoto": bool(privacy.get("consentToPublicPhoto", False)),
        "consentToDataSharing": bool(privacy.get("consentToDataSharing", False)),
    }


def _worker_settings_section(user):
    """Worker portal Settings screen (Excel worker settings rows 282-290) —
    real values from the UserPreference table, so the page never falls back to
    hardcoded defaults. False/null-safe for first visit."""
    p = UserPreference.objects.filter(user=user).first()
    notif = (p.notification_prefs or {}) if p else {}
    comm = (p.communication_prefs or {}) if p else {}
    a11y = (p.accessibility_prefs or {}) if p else {}
    privacy = (p.privacy_prefs or {}) if p else {}
    return {
        "interfaceLanguage": (p.interface_language if p else "") or "en",
        "preferredChannel": comm.get("preferredChannel", "sms"),
        "jobAlerts": bool(notif.get("jobAlerts", True)),
        "complianceAlerts": bool(notif.get("complianceAlerts", True)),
        "grievanceUpdates": bool(notif.get("grievanceUpdates", True)),
        "largeText": bool(a11y.get("largeText", False)),
        "highContrast": bool(a11y.get("highContrast", False)),
        "reduceMotion": bool(a11y.get("reduceMotion", False)),
        "consentToPublicPhoto": bool(privacy.get("consentToPublicPhoto", False)),
        "consentToDataSharing": bool(privacy.get("consentToDataSharing", False)),
        "bindingEnabled": bool(p.binding_enabled) if p else True,
    }


def _worker_other_section(user):
    o = WorkerOther.objects.filter(user=user).first()
    return {
        "registrationSource": _d(o.registration_source) if o else "",
        "registeredBy": _d(o.registered_by) if o else "",
        "registrationDate": _dts(o.registration_date) if o and o.registration_date else "",
        "consentDate": _dts(o.consent_date) if o and o.consent_date else "",
        "consentRegistration": bool(o and o.consent_registration),
        "consentVerification": bool(o and o.consent_verification),
    }


def _worker_labour_law():
    # No labour-law master rows exist yet (see gap analysis §D ComplianceMaster).
    return []


def _worker_holidays(user=None):
    """Holiday calendar the worker inherits from their bound site."""
    site = _worker_bound_site(user)
    if site is None:
        return []
    rows = []
    for h in SiteHoliday.objects.filter(site=site).order_by("date"):
        rows.append({
            "date": _dts(h.date),
            "name": _d(h.name),
            "type": h.get_holiday_type_display(),
            "typeCode": h.holiday_type,
            "appliesTo": _d(site.site_name),
            "isPaid": h.is_paid,
        })
    return rows


def _worker_weekly_off_days(user=None):
    """The bound site's weekly off day codes (MON..SUN)."""
    site = _worker_bound_site(user)
    if site is None:
        return []
    return [d for d in (site.weekly_off_days or "").split(",") if d]


def _worker_restricted_holidays(user):
    """The worker's Restricted Holiday (RH) quota + their requests.

    ``allotment`` is the actual number of Restricted Holidays published on the
    site calendar (not a typed-in number), so it always matches what the worker
    sees on the calendar."""
    site = _worker_bound_site(user)
    if site is None:
        return {"allotment": 0, "maxAvail": 0, "used": 0, "requests": []}
    reqs = (RestrictedHolidayRequest.objects
            .filter(worker=user, site=site).select_related("site", "worker"))
    used = reqs.filter(status__in=("PENDING", "APPROVED")).count()
    offered = SiteHoliday.objects.filter(site=site, holiday_type="RESTRICTED").count()
    # You cannot avail more restricted holidays than are actually offered.
    max_avail = min(site.restricted_holiday_max_avail, offered)
    return {
        "allotment": offered,
        "maxAvail": max_avail,
        "used": used,
        "requests": [_rh_request_row(r) for r in reqs[:20]],
    }


def _worker_announcements():
    # No announcement table exists yet (gap analysis §D).
    return []


def _worker_courses(user=None):
    """Course catalog + the worker's progress.

    Shape: course -> modules -> (video lessons + assignments with pass marks).
    A module is complete when every lesson is watched and every assignment is
    passed; the course is complete (certificate issued) when all modules are.
    """
    enrollments = {}
    if user is not None:
        enrollments = {e.course_id: e for e in CourseEnrollment.objects.filter(worker=user)}
    rows = []
    for c in Course.objects.filter(is_active=True).prefetch_related(
            "modules__lessons", "modules__readings", "modules__assignments__questions"):
        enrollment = enrollments.get(c.id)
        completed_ids = {str(x) for x in (enrollment.completed_lesson_ids or [])} if enrollment else set()
        scores = {str(k): v for k, v in (enrollment.assignment_scores or {}).items()} if enrollment else {}
        submissions = ({s.assignment_id: s for s in CourseSubmission.objects.filter(worker=user)}
                       if user is not None else {})

        modules = []
        total_items = done_items = 0
        for m in c.modules.all():
            lessons = list(m.lessons.all())
            assignments = list(m.assignments.all())
            lesson_rows = [{
                "id": str(l.id), "title": _d(l.title), "duration": _d(l.duration),
                "completed": str(l.id) in completed_ids, "videoUrl": _d(l.youtube_url),
            } for l in lessons]
            assignment_rows = []
            for a in assignments:
                score = scores.get(str(a.id))
                passed = score is not None and score >= a.pass_score
                submission = submissions.get(a.id)
                assignment_rows.append({
                    "id": str(a.id), "title": _d(a.title), "passScore": a.pass_score,
                    "type": a.assignment_type, "instructions": _d(a.instructions),
                    "score": score, "passed": passed,
                    # Correct answers are never sent to the client (server-side grading).
                    "questions": [{"id": str(q.id), "question": _d(q.question),
                                   "options": list(q.options or [])} for q in a.questions.all()],
                    "submission": ({
                        "content": _d(submission.content), "fileUrl": _d(submission.file_url),
                        "status": submission.get_status_display(), "score": submission.score,
                        "feedback": _d(submission.feedback),
                        "submittedAt": _dts(submission.submitted_at),
                    } if submission else None),
                })
            lessons_done = all(str(l.id) in completed_ids for l in lessons) if lessons else True
            assignments_passed = all(
                scores.get(str(a.id)) is not None and scores[str(a.id)] >= a.pass_score
                for a in assignments) if assignments else True
            module_complete = bool(lessons or assignments) and lessons_done and assignments_passed
            total_items += len(lessons) + len(assignments)
            done_items += (sum(1 for l in lessons if str(l.id) in completed_ids)
                           + sum(1 for a in assignments if scores.get(str(a.id)) is not None
                                 and scores[str(a.id)] >= a.pass_score))
            reading_rows = [{
                "id": str(r.id), "title": _d(r.title), "body": _d(r.body),
                "url": _d(r.resource_url), "duration": _d(r.duration),
            } for r in m.readings.all()]
            modules.append({
                "id": str(m.id), "title": _d(m.title),
                "lessons": lesson_rows, "assignments": assignment_rows,
                "readings": reading_rows,
                "completed": module_complete,
            })

        completed = bool(enrollment and enrollment.status == "COMPLETED")
        progress = 100 if completed else (round(done_items / total_items * 100) if total_items else 0)
        rows.append({
            "id": str(c.id),
            "title": _d(c.title),
            "provider": _d(c.provider),
            "duration": _d(c.duration),
            "rating": float(c.rating or 0),
            "progress": progress,
            "image": _d(c.image_url),
            "badge": _d(c.badge),
            "category": _d(c.category),
            "description": _d(c.description),
            "instructor": _d(c.instructor),
            "certification": _d(c.certification),
            "skillAwarded": _d(c.skill_name or c.title),
            "status": ("Completed" if completed else ("In progress" if progress > 0 else "Not started")),
            "certificateReady": completed,
            "certificateNo": _d(enrollment.certificate_no) if enrollment else "",
            "modules": modules,
        })
    return rows


def _worker_documents_display(user):
    """The worker's document register: the master catalog merged with the
    worker's own uploads (uploads override catalog rows). Duplicate catalog
    entries with the same document name are collapsed to one row."""
    # One row per document master. Auto-issued letters (appointment /
    # experience) keep the EARLIEST snapshot so a later site transfer never
    # replaces the worker's original engagement letter; worker uploads keep the
    # most recent copy.
    uploads = {}
    for d in (WorkerDocument.objects.select_related("document")
              .filter(user=user).order_by("id")):
        if d.document_id in uploads:
            code = (d.document.code if d.document else "") or ""
            if d.auto_generated and code in _LETTER_MASTER_CODES:
                continue
        uploads[d.document_id] = d
    rows = []
    masters = list(WorkerDocumentMaster.objects.all().order_by("sort_order", "id"))
    seen = set()
    for m in masters:
        d = uploads.get(m.id)
        if d:
            seen.add(d.id)
            rows.append({
                "id": d.id,
                "name": _d(m.document_name),
                "code": _d(m.code),
                "mandatory": bool(d.is_mandatory or m.is_mandatory),
                "owner": _doc_owner_label(d.owner_role or m.uploaded_by),
                "status": ("ISSUED"
                           if bool(d.auto_generated) and _d(m.code) not in _DIGILOCKER_DOC_CODES
                           else _d(d.status, "UPLOADED")),
                "date": _dts(d.uploaded_at) if d.uploaded_at else None,
                "expiry": _dts(d.expiry_date) if d.expiry_date else None,
                "fileName": _d(d.file_name),
                "downloadUrl": f"/api/worker/documents/{d.id}/file" if d.file else "",
                "locked": bool(d.auto_generated),
                "source": _doc_source_label(_d(m.code), bool(d.auto_generated)),
            })
        else:
            rows.append({
                "id": None,
                "name": _d(m.document_name),
                "code": _d(m.code),
                "mandatory": bool(m.is_mandatory),
                "owner": _doc_owner_label(m.uploaded_by),
                "status": "MISSING",
                "date": None,
                "expiry": None,
                "fileName": "",
                "downloadUrl": "",
                "locked": False,
                "source": "",
            })
    for d in uploads.values():
        if d.id in seen:
            continue
        rows.append({
            "id": d.id,
            "name": _d(d.document.document_name if d.document else ""),
            "code": _d(d.document.code if d.document else ""),
            "mandatory": bool(d.is_mandatory),
            "owner": _doc_owner_label(d.owner_role),
            "status": ("ISSUED"
                       if bool(d.auto_generated)
                       and _d(d.document.code if d.document else "") not in _DIGILOCKER_DOC_CODES
                       else _d(d.status, "UPLOADED")),
            "date": _dts(d.uploaded_at) if d.uploaded_at else None,
            "expiry": _dts(d.expiry_date) if d.expiry_date else None,
            "fileName": _d(d.file_name),
            "downloadUrl": f"/api/worker/documents/{d.id}/file" if d.file else "",
            "locked": bool(d.auto_generated),
            "source": _doc_source_label(_d(d.document.code if d.document else ""), bool(d.auto_generated)),
        })

    # Collapse duplicate names, keeping the best row in its original position.
    best = {}
    order = []
    for row in rows:
        key = _doc_name_key(row["name"])
        if key not in best:
            best[key] = row
            order.append(key)
        elif _doc_row_rank(row) > _doc_row_rank(best[key]):
            best[key] = row
    return [best[k] for k in order]


def _worker_issued_letters(user):
    """Every system-issued worker letter (appointment / experience), newest
    first, each flagged with whether it belongs to the worker's CURRENT active
    engagement. Lets the UI show "current" and "older" letters as separate
    sections instead of collapsing them by document master."""
    masters = {m.code: m for m in WorkerDocumentMaster.objects.filter(
        code__in=_LETTER_MASTER_CODES)}
    if not masters:
        return []
    active_binding = (WorkerContractorBinding.objects
                      .filter(worker=user, binding_status="ACCEPTED")
                      .order_by("-accepted_at").values_list("id", flat=True).first())
    rows = []
    for d in (WorkerDocument.objects.select_related("document")
              .filter(user=user, auto_generated=True,
                      document_id__in=[m.id for m in masters.values()])
              .order_by("-uploaded_at", "-id")):
        m = masters.get(d.document.code) or d.document
        match = re.match(r"^(APPT|EXPL)-(\d+)-", d.file_name or "")
        binding_id = int(match.group(2)) if match else None
        rows.append({
            "id": d.id,
            "name": _d(m.document_name if m else ""),
            "letterType": "appointment" if (match and match.group(1) == "APPT") else "experience",
            "code": _d(d.document.code if d.document else ""),
            "date": _dts(d.uploaded_at),
            "fileName": _d(d.file_name),
            "downloadUrl": f"/api/worker/documents/{d.id}/file" if d.file else "",
            "bindingId": binding_id,
            "current": bool(binding_id and active_binding and binding_id == active_binding),
        })
    return rows


def _worker_job_requests(user):
    """Rozgar job requests (RozgarRequest) — drives the /worker/rozgar screen."""
    rows = []
    reqs = user.rozgar_applications.all()[:10] if hasattr(user, "rozgar_applications") else []
    for r in reqs:
        job = getattr(r, "job", None)
        site = job.site if job else None
        contractor_name = ""
        if job and job.contractor:
            cp = getattr(job.contractor, "contractor_profile", None)
            contractor_name = _d(cp.contractor_name if cp else job.contractor.username)
        status_map = {"PENDING": "Pending", "ACCEPTED": "Accepted", "REJECTED": "Rejected", "EXPIRED": "Expired"}
        rows.append({
            "id": str(r.id),
            "employer": _d(site.employer.username if site and site.employer else ""),
            "contractor": contractor_name,
            "site": site.site_name if site else "",
            "designation": _d(job.job_title) if job else "",
            "wage": _num(job.wage_offered if job and job.wage_offered else 0),
            "currency": "INR",
            "payPeriod": "MONTHLY",
            "duration": _dts(job.validity_until) if job and job.validity_until else "",
            "facilities": [],
            "status": status_map.get(str(r.status).upper(), "Pending"),
            "dateReceived": _dts(r.requested_at),
        })
    return rows


def _worker_available_jobs(user):
    """Active ContractorJob postings shown on /worker/rozgar (Available Jobs).

    Field set mirrors BSS_Feature_Comparison.xlsx (Worker > Rozgar Setu):
    State, City, Designation, Experience, DOB limit, Description, View/Apply.
    """
    from bss_core.models import ContractorJob
    from api import matching

    # Hide only jobs with a *live* application (pending/shortlisted/hired). A
    # rejected/cancelled/expired application frees the posting so the worker sees
    # it again in Available Jobs and can re-apply.
    applied_job_ids = set()
    if hasattr(user, "rozgar_applications"):
        applied_job_ids = set(
            user.rozgar_applications
            .filter(status__in=("PENDING", "SHORTLISTED", "ACCEPTED"))
            .values_list("job_id", flat=True)
        )

    # Compute the worker's fuzzy-match profile once; reuse it for every posting.
    profile = matching.worker_profile(user)

    qs = (
        ContractorJob.objects.filter(is_active=True)
        .exclude(status="CLOSED")
        .select_related("site", "contractor")
        .order_by("-created_at")[:50]
    )
    rows = []
    for j in qs:
        if j.id in applied_job_ids:
            continue
        cp = getattr(j.contractor, "contractor_profile", None)
        site = j.site
        state = _d(j.state or (site.state if site else ""))
        city = _d(j.city or (site.city if site else ""))
        score = matching.score(user, j, profile=profile)
        posted = j.created_at.strftime("%d %b %Y") if j.created_at else ""
        raw_wage = _d(j.wage_offered)
        try:
            wage_display = f"₹{int(float(raw_wage)):,} / month"
        except (TypeError, ValueError):
            wage_display = raw_wage
        rows.append({
            "id": f"JOB-{j.id}",
            "jobId": j.id,
            "title": _d(j.job_title),
            "subTitle": _d(j.trade or j.category),
            "employer": _d(cp.contractor_name if cp else j.contractor.username),
            "postedDate": (f"Posted {posted}" if posted else ""),
            "description": _d(j.job_description),
            "wage": wage_display,
            "state": state,
            "city": city,
            "designation": _d(j.designation or j.job_title),
            "experience": _d(j.experience),
            "dobLimit": _d(j.dob_limit),
            "vacancies": j.vacancies or 1,
            "matchScore": score,
            "matchBadge": score >= 50,
        })
    # Best matches first so the worker sees the most relevant postings up top.
    rows.sort(key=lambda r: r["matchScore"], reverse=True)
    return rows


def _worker_bindings(user):
    """Contractor binding requests (WorkerContractorBinding) — drives /worker/binding."""
    bindings = WorkerContractorBinding.objects.filter(worker=user).order_by("-created_at")[:10]
    return [_binding_row(b) for b in bindings]


def _worker_bound_site(user):
    if user is None:
        return None
    binding = (WorkerContractorBinding.objects.filter(worker=user, binding_status="ACCEPTED")
               .select_related("site").first())
    return binding.site if binding and binding.site else None


def _worker_leave_types(user=None):
    """Leave types the worker inherits — ONLY the bound site's configured policy.

    There is deliberately no global fallback: the worker must see exactly the
    leave types their contractor set up for the site (Site Calendar & Leave
    Setup). Empty when nothing is configured, so the UI can prompt them that the
    calendar has not been set up yet."""
    site = _worker_bound_site(user)
    if site is None:
        return []
    return [p.leave_type.name for p in _site_leave_policies(site)]


def _worker_leave_records(user):
    rows = (LeaveRequest.objects.filter(worker=user)
            .select_related("leave_type", "approver")[:50])
    return [_leave_row(r) for r in rows]


def _worker_leave_balance(user):
    """Per-type leave ledger for the current financial year (1 Apr – 31 Mar).

    Leave is deducted as soon as it is applied for (PENDING) and released if the
    request is rejected/cancelled, so the balance reflects committed days.
    """
    today = timezone.localdate()
    fy_start_year = today.year if today.month >= 4 else today.year - 1
    fy_start = datetime.date(fy_start_year, 4, 1)
    months_elapsed = (today.year - fy_start.year) * 12 + (today.month - fy_start.month) + 1
    months_elapsed = max(1, min(12, months_elapsed))
    committed = LeaveRequest.objects.filter(worker=user, status__in=("PENDING", "APPROVED"))
    pending_qs = LeaveRequest.objects.filter(worker=user, status="PENDING")
    site = _worker_bound_site(user)
    if site is None:
        return []
    # Only the site's configured leave policies — no global fallback (mirrors
    # _worker_leave_types so balances always line up with the offered types).
    policies = _site_leave_policies(site)
    plan = [(p.leave_type, p.annual_entitlement, p.opening_balance) for p in policies]
    out = []
    for lt, annual, opening in plan:
        def days(qs):
            return sum(r.days or 0 for r in qs
                       if r.leave_type_id == lt.id and r.from_date and r.from_date >= fy_start)
        availed = days(committed)   # pending + approved are both held
        pending = days(pending_qs)
        accrued = round((annual / 12) * months_elapsed)
        out.append({
            "type": lt.name,
            "opening": opening,
            "accrued": accrued,
            "availed": availed,
            "pending": pending,
            "balance": max(0, opening + accrued - availed),
        })
    return out


def _worker_grievances(user):
    gs = WorkerGrievance.objects.filter(worker=user).order_by("-created_at")
    open_count = gs.exclude(status__in=("RESOLVED", "CLOSED")).count() if gs else 0
    recent_item = {"id": "None", "status": "No open grievances", "date": "—"}
    if gs.exists():
        first = gs.first()
        recent_item = {
            "id": _d(first.ticket_no, f"GRV-{first.id}"),
            "status": _GRIEVANCE_UI_STATUS.get(str(first.status).upper(), "Submitted"),
            "date": _dts(first.created_at.date() if hasattr(first.created_at, "date") else first.created_at),
        }
    return {"openCount": open_count, "recent": recent_item}


def _worker_geography():
    return dict(GEOGRAPHY)


def build_worker_portal(user):
    identity = _get_identity(user)
    other = WorkerOther.objects.filter(user=user).first()
    return {
        "worker": {
            "identity": _worker_identity_section(identity),
            "employment": _worker_employment_section(user, identity),
            "compliance": _worker_compliance_section(user),
            "gatePasses": _worker_gate_passes(user),
            "complianceRecords": _worker_compliance_records(user),
            "skills": _worker_skills_section(user),
            "socialSecurity": _worker_social_security_section(user),
            "documents": _worker_documents_section(user),
            "rozgarRequests": [],
            "grievances": _worker_grievances(user),
            "contact": _worker_contact_section(user, identity),
            "address": _worker_address_section(user),
            "personal": _worker_personal_section(user, identity),
            "banking": _worker_banking_section(user),
            "preferences": _worker_preferences_section(user),
            "settings": _worker_settings_section(user),
            "welfare": _worker_welfare_section(user),
            "classification": _worker_classification_section(user),
            "family": _worker_family_section(user),
            "other": _worker_other_section(user),
        },
        "govtScope": "central",
        "labourLaw": _worker_labour_law(),
        "wages": _worker_wages_section(user),
        "advances": _worker_advances(user),
        "attendance": _worker_attendance_section(user),
        "providentFund": _worker_financial_records(user, "providentFund"),
        "bonus": _worker_financial_records(user, "bonus"),
        "leaveEncashment": _worker_financial_records(user, "leaveEncashment"),
        "gratuity": _worker_gratuity(user),
        "holidays": _worker_holidays(user),
        "weeklyOffDays": _worker_weekly_off_days(user),
        "announcements": _worker_announcements(),
        "courses": _worker_courses(user),
        "documents": _worker_documents_display(user),
        "issuedLetters": _worker_issued_letters(user),
        "jobRequests": _worker_job_requests(user),
        "availableJobs": _worker_available_jobs(user),
        "bindings": _worker_bindings(user),
        "availability": bool(other and other.available_for_work),
        "leaveTypes": _worker_leave_types(user),
        "leaveRecords": _worker_leave_records(user),
        "leaveBalance": _worker_leave_balance(user),
        "leaveEnabled": _worker_bound_site(user) is not None,
        "restrictedHolidays": _worker_restricted_holidays(user),
        "cardProduct": {
            "productId": "BSS-WORKER-CARD",
            "cardFee": 0,
            "deliveryFee": 0,
            "currency": "INR",
            "paymentProviders": ["razorpay", "payu"],
        },
        "geography": _worker_geography(),
    }


def _worker_compliance_label(worker):
    """Worker compliance from the real state of their on-file documents:
    rejected/expired → Non-compliant, expiring soon or unverified → Expiring,
    no documents at all → Non-compliant, otherwise Compliant."""
    today = timezone.localdate()
    docs = WorkerDocument.objects.filter(user=worker)
    for d in docs:
        if d.status == "REJECTED":
            return "Non-compliant"
        if d.expiry_date and d.expiry_date < today:
            return "Non-compliant"
        if d.status in ("EXPIRED", "MISSING", "UNDER_VERIFICATION"):
            return "Expiring"
        if d.expiry_date and 0 <= (d.expiry_date - today).days <= 30:
            return "Expiring"
    if not docs.exists():
        return "Non-compliant"
    return "Compliant"


__all__ = [
    "_worker_address_section",
    "_worker_advances",
    "_worker_announcements",
    "_worker_attendance_section",
    "_worker_available_jobs",
    "_worker_banking_section",
    "_worker_bindings",
    "_worker_bound_site",
    "_worker_classification_section",
    "_worker_compliance_label",
    "_worker_compliance_records",
    "_worker_compliance_section",
    "_worker_contact_section",
    "_worker_courses",
    "_worker_documents_display",
    "_worker_documents_section",
    "_worker_employment_section",
    "_worker_family_section",
    "_worker_financial_records",
    "_worker_gate_passes",
    "_worker_geography",
    "_worker_gratuity",
    "_worker_grievances",
    "_worker_holidays",
    "_worker_identity_section",
    "_worker_job_requests",
    "_worker_labour_law",
    "_worker_leave_balance",
    "_worker_leave_records",
    "_worker_leave_types",
    "_worker_other_section",
    "_worker_personal_section",
    "_worker_preferences_section",
    "_worker_restricted_holidays",
    "_worker_settings_section",
    "_worker_skills_section",
    "_worker_social_security_section",
    "_worker_wages_section",
    "_worker_weekly_off_days",
    "_worker_welfare_section",
    "build_worker_portal",
]
