"""The role/resource mutation dispatcher (_persist_mutation)."""

# ruff: noqa: F401,F403
from .common import *  # noqa: F401,F403
from .aadhaar import *  # noqa: F401,F403
from .benefits import *  # noqa: F401,F403
from .courses import *  # noqa: F401,F403
from .documents import *  # noqa: F401,F403
from .grievances import *  # noqa: F401,F403
from .misc import *  # noqa: F401,F403
from .bindings import *  # noqa: F401,F403
from .leave import *  # noqa: F401,F403
from .sites import *  # noqa: F401,F403
from .submissions import *  # noqa: F401,F403


# Profile fields that GST verification owns. Once gst_verification_status is
# VERIFIED these can no longer be edited from the portal (SAP writes the model
# directly and is unaffected).
# Profile fields owned by the GST verification flow — never editable from the
# portal (would let a user self-declare verification). SAP writes the model
# directly and is unaffected.
_GST_SYSTEM_ATTRS = {
    "gst_verification_status", "gst_verified_at", "gst_legal_name",
    "gst_trade_name", "gst_constitution", "gst_certificate", "gst_registration_date",
}


_GST_LOCKED_PROFILE_ATTRS = {
    "employer": {
        "employer_name", "trade_name", "entity_class", "employer_category",
        "industry", "state", "district", "address", "pan_no", "incorporation_date",
        "gstin",
    },
    "contractor": {
        "contractor_name", "trade_name", "constitution", "entity_class",
        "activity", "state", "district", "address", "pan_no", "incorporation_date",
        "gstin",
    },
}


def _persist_mutation(user, role_path, resource, method, body):
    """Best-effort persistence for the handful of resources backed by real
    models; returns an id for the generic/unmapped case."""
    if resource == "profile" and user.role in ("employer", "contractor") and method in ("PATCH", "POST"):
        # Employer/Contractor profile "profile" PATCH — persist the section
        # fields ({section, fields:[{label,value}]}) into the profile model.
        section = body.get("section")
        fields = body.get("fields") or []
        if section and fields:
            profile_model = (EmployerProfile if user.role == "employer" else ContractorProfile)
            label_map = _PROFILE_LABEL_MAP[user.role]
            prof, _ = profile_model.objects.get_or_create(user=user)
            # Once GST-verified, the GST-derived identity fields are locked: the
            # user can no longer edit them (only the GST flow / SAP may change
            # them). SAP writes the model directly, bypassing this handler.
            locked = set()
            if str(getattr(prof, "gst_verification_status", "") or "").upper() == "VERIFIED":
                locked = _GST_LOCKED_PROFILE_ATTRS.get(user.role, set())
            for field in fields:
                label = (field.get("label") or "").strip()
                attr = label_map.get(label)
                if not attr or not hasattr(prof, attr):
                    continue
                if attr in _GST_SYSTEM_ATTRS or attr in locked:
                    continue
                if attr == "mobile":
                    # The registered mobile is the login identity — immutable for
                    # every role. Ignore any attempt to change it.
                    continue
                value = (field.get("value") or "").strip()
                if attr in _PROFILE_DATE_FIELDS:
                    value = _coerce_profile_date(value)
                setattr(prof, attr, value)
            prof.save()
            return prof.id
        return int(uuid.uuid4().int % 10**10)
    if resource == "profile" and user.role == "worker" and method in ("PATCH", "POST"):
        # Worker portal "profile" PATCH — persist editable identity sub-fields.
        identity = WorkerIdentity.objects.filter(user=user).first()
        if not identity:
            identity = WorkerIdentity.objects.create(
                user=user, bss_worker_id=bss_ids.new_bss_worker_id(),
                qr_token=uuid.uuid4().hex + uuid.uuid4().hex[:8],
                name=user.get_full_name() or "")
        if body.get("section") == "mobility":
            values = body.get("values") or {}
            if values.get("email") is not None:
                identity.email = str(values.get("email")).strip()
            if values.get("alternateMobile") is not None:
                identity.alternate_mobile = str(values.get("alternateMobile"))
            identity.save()
            a, _ = WorkerAddressMobility.objects.get_or_create(user=user)
            ca = values.get("currentAddress") or {}
            if ca:
                a.current_address = ca.get("line", a.current_address)
                a.current_state = ca.get("state", a.current_state)
                a.current_district = ca.get("district", a.current_district)
                a.current_city = ca.get("city", a.current_city)
                a.current_locality = ca.get("locality", a.current_locality)
                a.current_pincode = ca.get("pin", a.current_pincode)
            if values.get("migrationType") is not None:
                a.migration_type = values.get("migrationType")
            if values.get("migrant") is not None:
                a.migrant_worker = bool(values.get("migrant"))
            if values.get("sameAsPermanent") is not None:
                a.current_same_as_permanent = bool(values.get("sameAsPermanent"))
            a.save()
            return identity.id
        place = body.get("placeOfBirth") or body.get("place_of_birth")
        if place is None:
            # FE gate posts value nested: saveWorker({identity:{...worker.identity, placeOfBirth}})
            idn = body.get("identity") or {}
            place = idn.get("placeOfBirth") or idn.get("place_of_birth")
        if place is not None:
            identity.place_of_birth = str(place).strip()
        idn = body.get("identity") or {}
        personal = body.get("personal") or {}
        # Manual-entry identity fields (Aadhaar-owned: name/gender/dob/aadhaar/photo NOT here).
        idn_map = {
            "alternateMobile": "alternate_mobile",
            "email": "email",
            "emergencyContactName": "emergency_contact_name",
            "emergencyContactNumber": "emergency_contact_number",
            "emergencyContactRelation": "emergency_contact_relation",
            "disabilityTypePct": "disability_type_pct",
            "pan": "pan",
        }
        for fe_key, fld in idn_map.items():
            if fe_key == "pan" and identity.pan_verified:
                # PAN fetched from DigiLocker is verified and locked (read-only).
                continue
            v = idn.get(fe_key) if fe_key in idn else body.get(fe_key)
            if v is not None:
                setattr(identity, fld, v)
        # personal section fields live on the same WorkerIdentity row.
        # Aadhaar-owned (Freeze): fatherName is NOT writable.
        personal_map = {
            "maritalStatus": "marital_status",
            "motherName": "mother_name",
            "spouseName": "spouse_name",
            "disabilityStatus": "disability_status",
            "bloodGroup": "blood_group",
            "religion": "religion",
            "caste": "caste",
        }
        for fe_key, fld in personal_map.items():
            v = personal.get(fe_key) if fe_key in personal else body.get(fe_key)
            if v is not None:
                setattr(identity, fld, v)
        identity.save()

        # Address & mobility — current side + migrant are manual entry (permanent is Aadhaar-seeded).
        addr_patch = body.get("address") or {}
        if addr_patch:
            a, _ = WorkerAddressMobility.objects.get_or_create(user=user)
            addr_map = {
                "current": "current_address",
                "currentState": "current_state",
                "currentDistrict": "current_district",
                "currentCity": "current_city",
                "currentLocality": "current_locality",
                "currentPin": "current_pincode",
                "migrationType": "migration_type",
            }
            for fe_key, fld in addr_map.items():
                if addr_patch.get(fe_key) is not None:
                    setattr(a, fld, addr_patch.get(fe_key))
            if addr_patch.get("migrant") is not None:
                a.migrant_worker = bool(addr_patch.get("migrant"))
            a.save()

        # Social security — manual entry numbers.
        ss_patch = body.get("socialSecurity") or {}
        if ss_patch:
            ss, _ = WorkerSocialSecurity.objects.get_or_create(user=user)
            ss_map = {
                "epfoUan": "epfo_uan",
                "esicIp": "esic_ip_number",
                "lwfNo": "lwf_no",
                "wcPolicyNo": "wc_policy_no",
                "eShramNo": "e_shram_no",
                "bocwRegNumber": "bocw_reg_number",
                "stateWorkerId": "state_worker_id",
            }
            for fe_key, fld in ss_map.items():
                if ss_patch.get(fe_key) is not None:
                    setattr(ss, fld, ss_patch.get(fe_key))
            ss.save()

        # Banking — the salary account is manual entry here and verified later
        # via the NPCI penny-drop API in Govt. Integrations.
        bnk_patch = body.get("banking") or {}
        if bnk_patch:
            bk, _ = WorkerBanking.objects.get_or_create(user=user)
            bnk_map = {
                "bankName": "bank_name",
                "holderName": "bank_account_holder_name",
                "accountNumber": "bank_account_number",
                "ifsc": "ifsc_code",
            }
            details_changed = False
            for fe_key, fld in bnk_map.items():
                if bnk_patch.get(fe_key) is None:
                    continue
                v = str(bnk_patch.get(fe_key)).strip()
                if getattr(bk, fld) != v:
                    setattr(bk, fld, v)
                    details_changed = True
            if bnk_patch.get("upiEnabled") is not None:
                bk.upi_enabled = bool(bnk_patch.get("upiEnabled"))
            # Changing the account invalidates a prior KYC — require re-verify.
            if details_changed:
                bk.bank_verification_status = ""
            bk.save()

        # Welfare & safety — worker self-edit is limited to the fields the sheet
        # marks "Worker Manual Entry". Gate-pass fields (Auto after Binding) are
        # NOT writable here.
        wel_patch = body.get("welfare") or {}
        if wel_patch:
            ws, _ = WorkerWelfareSafety.objects.get_or_create(user=user)
            wel_map = {
                "ppeRequired": "ppe_required",
                "typesOfPpeGiven": "types_of_ppe_given",
                "safetyTrainingCompleted": "safety_training_completed",
                "siteInductionStatus": "site_induction_status",
                "insuranceStatus": "insurance_status",
                "accommodationProvided": "accomodation_provided",
                "policeVerification": "police_verification",
                "trainerName": "trainer_name",
                "medicalExaminationStatus": "medical_examination_status",
                "medicalFitnessStatus": "medical_fitness_status",
            }
            for fe_key, fld in wel_map.items():
                if wel_patch.get(fe_key) is not None:
                    setattr(ws, fld, wel_patch.get(fe_key))
            for fe_key, fld in {"trainingDate": "training_date", "lastMedicalExamination": "last_medical_examination", "nextMedicalDue": "next_medical_due"}.items():
                if wel_patch.get(fe_key) is not None:
                    setattr(ws, fld, wel_patch.get(fe_key) or None)
            ws.save()

        # Classification — full manual-entry row.
        cls_patch = body.get("classification") or {}
        if cls_patch:
            wc, _ = WorkerClassification.objects.get_or_create(user=user)
            cls_map = {
                "workerCategory": "worker_category",
                "sector": "sector",
                "industry": "industry",
                "occupation": "occupation",
                "skill": "skill",
                "currentEmploymentStatus": "current_employment_status",
                "totalWorkerExperience": "total_worker_experience",
                "gigPlatformWorkerId": "gig_platform_worker_id",
                "gigPlatformName": "gig_platform_name",
                "gigPlatformType": "gig_platform_type",
                "gigDateJoined": "gig_date_joined_platform",
                "gigAvgHoursPerDay": "gig_avg_hours_per_day",
                "gigAvgDaysPerWeek": "gig_avg_days_per_week",
                "gigServiceArea": "gig_service_area",
                "gigVehicleType": "gig_vehicle_type",
                "gigVehicleOwnership": "gig_vehicle_ownership",
                "gigDlNumber": "gig_dl_number",
                "gigDlExpiry": "gig_dl_expiry",
                "seBusinessName": "se_business_name",
                "seEmployerName": "se_employer_or_business_name",
                "seBusinessType": "se_business_type",
                "seRegistrationStatus": "se_registration_status",
                "seStartDate": "se_start_date",
                "seLocation": "se_business_location",
                "seAvgHoursPerDay": "se_avg_hours_per_day",
                "seAvgDaysPerWeek": "se_avg_days_per_week",
                "seEmployeesCount": "se_num_employees",
                "seasonalJobType": "season_job_work_type",
                "seasonalStartDate": "season_start_date",
                "seasonalEndDate": "season_end_date",
                "seasonalAvgHoursPerDay": "season_avg_hours_per_day",
                "seasonalAvgDaysPerWeek": "season_avg_days_per_week",
                "seasonalLocation": "season_work_location",
                "seasonalExpectedIncome": "season_expected_income",
                "paymentFrequency": "season_payment_frequency",
                "paymentMode": "payment_mode",
            }
            date_fields = {"gig_date_joined_platform", "gig_dl_expiry", "se_start_date",
                           "season_start_date", "season_end_date"}
            for fe_key, fld in cls_map.items():
                v = cls_patch.get(fe_key)
                if v is None:
                    continue
                # Empty <input type="date"> posts "" — a DateField rejects that,
                # so coerce blank dates to NULL.
                if fld in date_fields:
                    v = str(v).strip() or None
                elif fld == "se_num_employees":
                    v = _coerce_int(v)
                setattr(wc, fld, v)
            wc.save()

        # Skills & education — self-declared manual entry. Certification (name/
        # number/authority/expiry/verified) is set only by the course-completion
        # system and is NOT writable from the worker profile.
        sk_patch = body.get("skills") or {}
        if sk_patch:
            sk, _ = WorkerSkillsEmployability.objects.get_or_create(user=user)
            educations = sk_patch.get("educations")
            if educations is not None:
                WorkerEducation.objects.filter(user=user).delete()
                for edu in educations:
                    WorkerEducation.objects.create(
                        user=user,
                        qualification_course=(edu.get("qualificationCourse") or "").strip(),
                        board_university=(edu.get("boardUniversity") or "").strip(),
                        passing_year=(edu.get("passingYear") or "").strip(),
                    )
            if sk_patch.get("languages") is not None:
                sk.languages_known = ", ".join(str(l).strip() for l in sk_patch.get("languages") if str(l).strip())
            items = sk_patch.get("items")
            if items is not None:
                # Replace the worker's self-declared skills; keep system-verified
                # certifications intact (they are issued by course completion).
                WorkerSkill.objects.filter(user=user, verified=False).delete()
                for it in items:
                    WorkerSkill.objects.create(
                        user=user,
                        name=(it.get("name") or "").strip(),
                        experience_years=(it.get("experienceYears") or "").strip(),
                        verified=False,
                    )
            sk.save()

        # Family & dependants — manual entry (nominees).
        fam_patch = body.get("family") or {}
        if fam_patch.get("familyMembersCount") is not None or fam_patch.get("dependantsCount") is not None:
            fam_head = WorkerFamilyDependant.objects.filter(user=user).first()
            if not fam_head:
                fam_head = WorkerFamilyDependant.objects.create(user=user)
            if fam_patch.get("familyMembersCount") is not None:
                fam_head.family_members_count = _coerce_int(fam_patch["familyMembersCount"])
            if fam_patch.get("dependantsCount") is not None:
                fam_head.dependants_count = _coerce_int(fam_patch["dependantsCount"])
            fam_head.save(update_fields=["family_members_count", "dependants_count"])
        nominees = fam_patch.get("nominees")
        if nominees is not None:
            WorkerFamilyDependant.objects.filter(user=user, nominee=True).delete()
            for nm in nominees:
                if not str(nm.get("name") or "").strip():
                    continue  # never persist a blank nominee row
                WorkerFamilyDependant.objects.create(
                    user=user, nominee=True,
                    name=str(nm.get("name") or "").strip(), dependant=nm.get("dependant", ""),
                    relation=nm.get("relation", ""), nominee_type=nm.get("nomineeType", ""),
                    nominee_dob=nm.get("dob") or None, nominee_age=_coerce_int(nm.get("age")),
                    contact=nm.get("contact", ""), address=nm.get("address", ""),
                    percent=_coerce_int(nm.get("percent")),
                    nominee_documents=list(nm.get("documents") or []),
                    # Match the doc type anywhere in the attached document's type
                    # or file name, e.g. "pan_card.pdf" -> PAN.
                    pan_copy_nominee=("PAN" in _nominee_doc_blob(nm.get("documents"))),
                    aadhaar_copy_nominee=any(k in _nominee_doc_blob(nm.get("documents"))
                                             for k in ("AADHAAR", "ADHAR")),
                )

        # Settings screen also persists privacy/QR consent + preferred channel
        # through the profile PATCH (FE: persistProfile -> saveWorker). Fold
        # those into the same UserPreference row the "settings" resource uses.
        p, _ = UserPreference.objects.get_or_create(user=user)
        prefs = body.get("preferences") or {}
        contact = body.get("contact") or {}
        privacy = dict(p.privacy_prefs or {})
        if prefs.get("consentToPublicPhoto") is not None:
            privacy["consentToPublicPhoto"] = bool(prefs.get("consentToPublicPhoto"))
        if prefs.get("consentToDataSharing") is not None:
            privacy["consentToDataSharing"] = bool(prefs.get("consentToDataSharing"))
        p.privacy_prefs = privacy
        comm = dict(p.communication_prefs or {})
        if contact.get("preferredChannel") is not None:
            comm["preferredChannel"] = str(contact.get("preferredChannel")).strip()
        p.communication_prefs = comm
        p.save()
        return identity.id
    if resource in ("notifications",) and method in ("PATCH",):
        notif_id = str(body.get("id") or "")
        action = body.get("action")
        if notif_id:
            db_id = notif_id[3:] if notif_id.startswith("db-") else notif_id
            n = (Notification.objects.filter(id=db_id, user=user).first()
                 if db_id.isdigit() else None)
            if n:
                if action in ("read", "resolve"):
                    n.is_read = True
                    n.save(update_fields=["is_read"])
                elif action == "unread":
                    n.is_read = False
                    n.save(update_fields=["is_read"])
                return notif_id
            # Derived (non-DB) notification — persist read state per user so the
            # notification centre remembers it across reloads.
            p, _ = UserPreference.objects.get_or_create(user=user)
            prefs = dict(p.notification_prefs or {})
            read_ids = set(prefs.get("readNotificationIds") or [])
            if action in ("read", "resolve"):
                read_ids.add(notif_id)
            elif action == "unread":
                read_ids.discard(notif_id)
            prefs["readNotificationIds"] = sorted(read_ids)
            p.notification_prefs = prefs
            p.save(update_fields=["notification_prefs", "updated_at"])
            return notif_id
    if resource == "settings" and user.role in ("worker", "contractor", "employer") and method in ("PATCH", "POST"):
        # Worker Portal Settings — persist every toggle/select into the real
        # UserPreference row (was silently dropped -> page reload reverted to
        # hardcoded FE defaults).
        p, _ = UserPreference.objects.get_or_create(user=user)
        if body.get("interfaceLanguage") is not None:
            p.interface_language = str(body.get("interfaceLanguage"))[:10]
        notif = dict(p.notification_prefs or {})
        for k in ("jobAlerts", "complianceAlerts", "grievanceUpdates"):
            if body.get(k) is not None:
                notif[k] = bool(body.get(k))
        p.notification_prefs = notif
        a11y = dict(p.accessibility_prefs or {})
        for k in ("largeText", "highContrast", "reduceMotion"):
            if body.get(k) is not None:
                a11y[k] = bool(body.get(k))
        p.accessibility_prefs = a11y
        privacy = dict(p.privacy_prefs or {})
        for k in ("consentToPublicPhoto", "consentToDataSharing"):
            if body.get(k) is not None:
                privacy[k] = bool(body.get(k))
        p.privacy_prefs = privacy
        if body.get("bindingEnabled") is not None:
            p.binding_enabled = bool(body.get("bindingEnabled"))
        comm = dict(p.communication_prefs or {})
        if body.get("preferredChannel") is not None:
            comm["preferredChannel"] = str(body.get("preferredChannel"))
        p.communication_prefs = comm
        p.save()
        return p.id
    if resource == "availability" and user.role == "worker":
        obj, _ = WorkerOther.objects.get_or_create(user=user)
        available = body.get("available")
        if available is not None:
            obj.available_for_work = bool(available)
            obj.save(update_fields=["available_for_work"])
        return obj.id
    if resource == "workers" and role_path == "contractor" and method == "POST":
        from rest_framework.exceptions import ValidationError
        rows = body.get("bulk") if isinstance(body.get("bulk"), list) else [body]
        created = []
        for row in rows:
            row = row if isinstance(row, dict) else {}
            bss_id = str(row.get("bssId") or "").strip().upper()
            if not bss_id:
                raise ValidationError("Enter the worker's BSS ID to bind them.")
            site_id = row.get("siteId")
            site = Site.objects.filter(pk=site_id).first() if site_id else None
            if site is None and row.get("site"):
                site_label = str(row.get("site")).strip()
                site = (Site.objects.filter(site_name=site_label).first()
                        or Site.objects.filter(site_code=site_label).first())
            # Workers are only ever created by the worker themselves. The
            # contractor can only bind an existing BSS worker by their BSS ID —
            # never create an account.
            ident = WorkerIdentity.objects.filter(bss_worker_id=bss_id).first()
            if ident is None:
                raise ValidationError(f"No worker found with BSS ID {bss_id}.")
            w = ident.user
            if user.role == "contractor" and site:
                if not _contractor_engaged_at_site(user, site.id):
                    raise ValidationError(
                        "You are not engaged at this site. Ask the employer to allot this site to you first.")
                binding = _request_worker_binding(w, user, site, initiated_by="contractor")
                if binding.binding_status != "ACCEPTED":
                    # Two-sided: the contractor consents now, the worker accepts (app/OTP).
                    binding.binding_status = "PENDING"
                    binding.consent_contractor = True
                    binding.consent_worker = False
                _apply_binding_terms(binding, row)
                _require_binding_terms(binding)
                binding.save()
            created.append(w.id)
        if isinstance(body.get("bulk"), list):
            return created
        return created[0] if created else None
    if resource == "approvals" and role_path == "employer" and method == "PATCH":
        ids = body.get("ids") or []
        new_status = body.get("status") or "APPROVED"
        for pk in ids:
            ApprovalQueue.objects.filter(id=pk).update(status=new_status)
        return ids[0] if ids else None
    if resource == "gate-passes" and method in ("POST", "PATCH"):
        return _handle_gate_pass(user, body)
    if resource == "documents" and method == "POST":
        return _handle_document_upload(user, body)
    if resource == "sites" and user.role == "employer" and method in ("POST", "PATCH"):
        return _handle_site(user, body, method)
    if resource == "sites" and user.role == "employer" and method == "DELETE":
        site_id = body.get("id")
        if not site_id:
            return None
        site = Site.objects.filter(pk=site_id, employer=user).first()
        if site is None:
            return None
        # A site with live contractor/worker associations must not be deleted —
        # release/unbind them first so no binding points at a removed site.
        has_workers = WorkerContractorBinding.objects.filter(
            site=site, binding_status__in=["PENDING", "ACCEPTED"]).exists()
        has_contractors = ContractorSiteAllotment.objects.filter(
            site=site, status__in=["PENDING", "APPROVED"]).exists()
        if has_workers or has_contractors:
            raise PortalMutationError(
                "This site still has contractors or workers attached. Release the site and unbind "
                "its workers before deleting it.", 409)
        site.delete()
        return site_id
    if resource == "default-site" and method in ("POST", "PATCH"):
        return _handle_default_site(user, body)
    if resource == "job-postings" and role_path == "contractor" and method in ("POST", "PATCH"):
        return _handle_job_posting(user, body, method)
    if resource == "applications" and role_path == "worker" and method == "POST":
        return _handle_rozgar_apply(user, body)
    if resource == "applications" and role_path == "contractor" and method in ("POST", "PATCH"):
        return _handle_rozgar_respond(user, body)
    if resource == "licences" and role_path in ("contractor", "employer") and method in ("POST", "PATCH", "DELETE"):
        return _handle_licences(user, body, method, role_path)
    if resource == "compliances" and role_path == "contractor" and method in ("POST", "PATCH", "DELETE"):
        return _handle_compliances(user, body, method)
    if resource == "restricted-holiday" and role_path == "worker" and method == "POST":
        return _handle_rh_request(user, body)
    if resource == "restricted-holiday" and role_path == "contractor" and method in ("POST", "PATCH"):
        return _handle_rh_decide(user, body)
    if resource == "attendance" and role_path == "contractor" and method in ("POST", "PATCH"):
        return _handle_mark_attendance(user, body)
    if resource == "leave" and role_path == "worker" and method == "POST":
        return _handle_leave_apply(user, body)
    if resource == "leave" and role_path == "contractor" and method in ("POST", "PATCH"):
        return _handle_leave_decide(user, body)
    if resource == "site-calendar" and role_path == "contractor" and method in ("POST", "PATCH", "DELETE"):
        return _handle_site_calendar(user, body, method)
    if resource == "worker-compliance" and role_path == "contractor" and method in ("POST", "PATCH"):
        return _handle_worker_compliance(user, body)
    if resource == "worker-cost-sheet" and role_path == "contractor" and method in ("POST", "PATCH"):
        return _handle_worker_cost_sheet(user, body)
    if resource == "worker-site" and role_path == "contractor" and method in ("POST", "PATCH"):
        return _handle_worker_site(user, body)
    if resource == "salaries" and method in ("POST", "PATCH"):
        return _handle_salaries(user, body)
    if resource == "advances" and role_path == "worker" and method in ("POST", "PATCH"):
        return _handle_advance_worker(user, body)
    if resource == "advances" and role_path == "contractor" and method in ("POST", "PATCH"):
        return _handle_advance_contractor(user, body)
    if resource == "benefits" and role_path == "contractor" and method in ("POST", "PATCH"):
        return _handle_benefits(user, body)
    if resource == "grievances" and role_path in ("contractor", "employer") and method in ("POST", "PATCH"):
        return _handle_grievance(user, body)
    if resource == "grievances" and role_path == "worker" and method in ("POST", "PATCH"):
        return _handle_grievance_worker(user, body)
    if resource == "submissions" and role_path == "employer" and method in ("PATCH",):
        return _handle_submission_review(user, body)
    if resource == "gratuity" and role_path == "worker" and method in ("POST", "PATCH"):
        return _handle_gratuity_apply(user, body)
    if resource == "bank-verify" and role_path == "worker" and method in ("POST", "PATCH"):
        return _handle_bank_verify(user, body)
    if resource == "courses" and role_path == "worker" and method in ("POST", "PATCH"):
        return _handle_course_action(user, body)
    return int(uuid.uuid4().int % 10**10)


@api_view(["POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def contractor_profile_image(request):
    """Upload the contractor's own profile image (avatar)."""
    import os
    import uuid

    from django.core.files.base import ContentFile
    from django.core.files.storage import default_storage

    from bss_core.models import ContractorProfile

    if request.user.role != "contractor":
        return Response({"error": "Only contractors can set a profile image."},
                        status=status.HTTP_403_FORBIDDEN)
    upload = request.FILES.get("file") or request.FILES.get("image")
    if upload is None:
        return Response({"error": "No image uploaded."}, status=status.HTTP_400_BAD_REQUEST)
    ext = os.path.splitext(upload.name or "")[1].lower().lstrip(".")
    if ext not in ("png", "jpg", "jpeg", "webp", "gif"):
        return Response({"error": "Upload a PNG, JPG, WEBP or GIF image."},
                        status=status.HTTP_400_BAD_REQUEST)
    data = upload.read()
    if len(data) > 3 * 1024 * 1024:
        return Response({"error": "Image must be under 3 MB."},
                        status=status.HTTP_400_BAD_REQUEST)
    stored = default_storage.save(f"contractor_profile/{uuid.uuid4().hex}.{ext}", ContentFile(data))
    cp, _ = ContractorProfile.objects.get_or_create(user=request.user)
    cp.profile_image = f"/media/{stored}"
    cp.save(update_fields=["profile_image"])
    return Response({"data": {"url": cp.profile_image}}, status=status.HTTP_201_CREATED)


__all__ = [
    "_persist_mutation",
    "contractor_profile_image",
]
