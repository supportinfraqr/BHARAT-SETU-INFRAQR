"""Occupational health & safety bridge.

  * BSS Admin authors the state/Central health-examination form (Form-VIII/IX),
    freezes a version and dispatches it to an employer's sites in that state.
  * Employers (Medical Officer / Safety Office) record per-worker medical
    examinations and PPE/training safety records; both mirror onto
    WorkerWelfareSafety so gate-pass eligibility stays consistent.

The template HTML defaults to the Gazette replica held on the client
(oshFormTemplate.ts): an absent template row returns html="" and the client
renders its default. Edits are stored once the admin saves.
"""

# ruff: noqa: F401,F403
from .common import *  # noqa: F401,F403

_CENTRAL = "Central"
_ADMIN_ROLES = ("bss_admin", "admin")
# Fixed mandatory core (not admin-configurable): a check is "done" only when
# every one of these is completed/issued. The rest are optional records.
MANDATORY_TRAINING_KEYS = ("fire", "ppe")
MANDATORY_KIT_KEYS = ("helmet", "shoes", "gloves", "vest")
# Human labels for the kit keys (used when mirroring issued PPE to the worker's
# welfare record so the worker portal shows readable names).
KIT_LABELS = {
    "helmet": "Safety Helmet", "goggles": "Safety Goggles", "earplugs": "Ear Plugs / Muffs",
    "mask": "N95 / Dust Mask", "respirator": "Respirator", "gloves": "Safety Gloves",
    "shoes": "Safety Shoes / Boots", "vest": "High-Visibility Vest", "harness": "Full Body Harness",
    "fr": "Fire Retardant Coverall", "faceshield": "Face Shield", "apron": "Leather Apron",
}
TRAIN_LABELS = {
    "induction": "Site Induction & Orientation", "fire": "Fire Safety & Evacuation",
    "firstaid": "First Aid & CPR", "ppe": "PPE Usage & Care", "mmh": "Manual Material Handling",
    "height": "Work at Height", "confined": "Confined Space Entry",
    "chemical": "Chemical Handling / MSDS", "electrical": "Electrical Safety / LOTO",
    "emergency": "Emergency Response", "hazard": "Hazard Identification", "toolbox": "Toolbox Talk",
}


def _states():
    try:
        names = list(payloads.GEOGRAPHY.keys())
    except Exception:  # noqa: BLE001
        names = []
    return [*names, _CENTRAL]


def _norm_state(value, jurisdiction=None):
    state = (value or "").strip()
    if jurisdiction == "central" or state.lower() == "central":
        return _CENTRAL, "central"
    return state, "state"


def _form_row(row, state, jurisdiction, form_type="VIII"):
    if row is None:
        return {"state": state, "jurisdiction": jurisdiction, "formType": form_type,
                "templateId": "osh-form-viii-ix-2026", "name": "", "html": "", "status": "default",
                "version": 0, "updatedAt": None, "updatedBy": ""}
    return {"state": row.state, "jurisdiction": row.jurisdiction, "formType": row.form_type,
            "templateId": row.template_id, "name": row.name, "html": row.html,
            "status": row.status, "version": row.version,
            "updatedAt": payloads._dts(row.updated_at),
            "updatedBy": payloads._party_name(row.created_by) if row.created_by_id else ""}


def _is_admin(user):
    return getattr(user, "role", "") in _ADMIN_ROLES


# ── medical exam (de)serialisation ───────────────────────────────────────────
def _exam_row(e):
    return {
        "id": e.id, "workerId": e.worker_id, "siteId": e.site_id, "state": e.state,
        "formType": e.form_type, "dispatchId": e.dispatch_id, "formVersion": e.form_version,
        "partA": e.part_a or {}, "tests": e.tests or [], "doctor": e.doctor or {},
        "examDate": payloads._d(e.exam_date), "intervalMonths": e.interval_months,
        "nextDue": payloads._d(e.next_due), "remarks": e.remarks or "",
        "heightWork": e.height_work or {}, "overall": e.overall, "restrictions": e.restrictions or "",
        "altFit": e.alt_fit or {}, "unfit": e.unfit or {},
        "customFields": e.custom_fields or {},
        "recordedAt": payloads._dts(e.recorded_at),
    }


def _apply_exam(e, body):
    from bss_core.models import MedicalFormDispatch, Site
    partA = body.get("partA") or {}
    e.part_a = partA
    e.tests = body.get("tests") or []
    e.doctor = body.get("doctor") or {}
    e.form_type = "IX" if str(body.get("formType") or "VIII").upper() == "IX" else "VIII"
    e.form_version = int(body.get("formVersion") or 1)
    e.state = str(body.get("state") or (e.site.state if e.site_id else ""))[:60]
    e.exam_date = _coerce_profile_date(body.get("examDate"))
    e.interval_months = int(body.get("intervalMonths") or 12)
    e.next_due = _coerce_profile_date(body.get("nextDue"))
    e.remarks = str(body.get("remarks") or "")[:4000]
    e.height_work = body.get("heightWork") or {}
    e.overall = str(body.get("overall") or "Fit")[:30]
    e.restrictions = str(body.get("restrictions") or "")[:2000]
    e.alt_fit = body.get("altFit") or {}
    e.unfit = body.get("unfit") or {}
    custom = body.get("customFields")
    e.custom_fields = custom if isinstance(custom, dict) else {}
    if body.get("dispatchId"):
        e.dispatch = MedicalFormDispatch.objects.filter(pk=body.get("dispatchId")).first()
    if body.get("siteId"):
        e.site = Site.objects.filter(pk=body.get("siteId")).first()


def _mirror_exam(e):
    wws, _ = WorkerWelfareSafety.objects.get_or_create(user=e.worker)
    wws.medical_examination_status = "Done"
    wws.medical_fitness_status = e.overall
    if e.exam_date:
        wws.last_medical_examination = e.exam_date
    if e.next_due:
        wws.next_medical_due = e.next_due
    wws.save(update_fields=["medical_examination_status", "medical_fitness_status",
                            "last_medical_examination", "next_medical_due", "updated_at"])


def _mirror_safety(rec):
    wws, _ = WorkerWelfareSafety.objects.get_or_create(user=rec.worker)
    today = timezone.localdate().isoformat()
    kit = rec.kit_items or {}
    trainings = rec.trainings or {}

    def _kit_satisfied(key):
        it = kit.get(key) or {}
        return bool(it.get("na") or it.get("issued"))

    # Mandatory PPE = template mandatory keys + any custom item flagged mandatory.
    mandatory_kit = list(MANDATORY_KIT_KEYS) + [
        k for k, v in kit.items() if (v or {}).get("custom") and (v or {}).get("mandatory")]
    wws.ppe_required = all(_kit_satisfied(k) for k in mandatory_kit)

    def _trn_valid(key):
        t = trainings.get(key) or {}
        if t.get("na"):
            return True
        return bool(t.get("completed") and t.get("validUntil") and str(t["validUntil"]) >= today)

    # Mandatory training = template mandatory keys + custom trainings flagged mandatory.
    mandatory_trn = list(MANDATORY_TRAINING_KEYS) + [
        k for k, v in trainings.items()
        if k != "induction" and (v or {}).get("custom") and (v or {}).get("mandatory")]
    wws.safety_training_completed = all(_trn_valid(k) for k in mandatory_trn)
    # Site induction is its own part; N/A counts as satisfied.
    wws.site_induction_status = "Done" if _trn_valid("induction") else ""
    # Surface the issued (applicable) kit item names to the worker's welfare record.
    issued_names = []
    for k, v in kit.items():
        v = v or {}
        if v.get("na") or not v.get("issued"):
            continue
        issued_names.append(str(v.get("name")) if v.get("custom") else KIT_LABELS.get(k, k))
    wws.types_of_ppe_given = ", ".join(issued_names)[:500]
    wws.save(update_fields=["ppe_required", "safety_training_completed",
                            "site_induction_status", "types_of_ppe_given", "updated_at"])


def _dispatch_row(d, with_html=False, site_map=None):
    sites = list(d.sites.select_related("site").all())
    row = {
        "id": d.id, "state": d.state, "jurisdiction": d.jurisdiction, "version": d.version,
        "employerId": d.employer_id,
        "employerName": payloads._org_name(d.employer) if d.employer_id else "",
        "siteIds": [s.site_id for s in sites],
        "siteNames": [s.site.name if hasattr(s.site, "name") else s.site.site_name for s in sites],
        "note": d.note or "", "sentAt": payloads._dts(d.sent_at),
        "sentBy": payloads._party_name(d.sent_by) if d.sent_by_id else "",
    }
    if with_html:
        row["html"] = d.html or ""
    return row


@api_view(["GET", "PUT", "DELETE"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def admin_medical_forms(request):
    """BSS Admin: list/get/save/reset the state + Central health-examination forms."""
    from bss_core.models import MedicalFormDispatch, MedicalFormTemplate
    if not _is_admin(request.user):
        return Response({"error": "BSS Admin only."}, status=status.HTTP_403_FORBIDDEN)
    state_q = (request.query_params.get("state") or (request.data or {}).get("state") or "").strip()
    form_q = (request.query_params.get("formType") or (request.data or {}).get("formType") or "VIII").upper()
    form_type = "IX" if form_q == "IX" else "VIII"

    if request.method == "GET":
        if state_q:
            state, jur = _norm_state(state_q)
            row = MedicalFormTemplate.objects.filter(state=state, form_type=form_type).first()
            return Response({"form": _form_row(row, state, jur, form_type)}, status=status.HTTP_200_OK)
        out = []
        for name in _states():
            state, jur = _norm_state(name)
            row = MedicalFormTemplate.objects.filter(state=state, form_type=form_type).first()
            disp = MedicalFormDispatch.objects.filter(state=state)
            out.append({
                "state": state, "jurisdiction": jur, "formType": form_type,
                "status": row.status if row else "default",
                "version": row.version if row else 0,
                "updatedAt": payloads._dts(row.updated_at) if row else None,
                "dispatches": disp.count(),
                "lastSentAt": payloads._dts(disp.order_by("-sent_at").first().sent_at) if disp.exists() else None,
            })
        return Response({"forms": out}, status=status.HTTP_200_OK)

    if request.method == "PUT":
        body = request.data or {}
        state, jur = _norm_state(state_q, body.get("jurisdiction"))
        if not state:
            return Response({"error": "state is required."}, status=status.HTTP_400_BAD_REQUEST)
        html = str(body.get("html") or "")
        if len(html) > 2_000_000:
            return Response({"error": "Form HTML is too large."}, status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE)
        status_val = "frozen" if str(body.get("status")) == "frozen" else "draft"
        row, created = MedicalFormTemplate.objects.get_or_create(
            state=state, form_type=form_type, defaults={"jurisdiction": jur})
        row.jurisdiction = jur
        row.form_type = form_type
        row.html = html
        if status_val == "frozen":
            # Every publish creates a new version (even if the HTML is unchanged).
            row.version = 1 if created else (row.version or 1) + 1
        row.status = status_val
        if not row.created_by_id:
            row.created_by = request.user
        row.save()
        return Response({"form": _form_row(row, state, jur, form_type)}, status=status.HTTP_200_OK)

    # DELETE — restore default (drop the stored row for this form type)
    state, jur = _norm_state(state_q)
    MedicalFormTemplate.objects.filter(state=state, form_type=form_type).delete()
    return Response({"form": _form_row(None, state, jur, form_type)}, status=status.HTTP_200_OK)


@api_view(["POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def admin_medical_forms_bulk(request):
    """BSS Admin bulk actions for a form type: publish every state, or reset all
    states back to the Gazette default."""
    from bss_core.models import MedicalFormTemplate
    from bss_core.seeders.medical_forms import _doc_for
    from bss_core.seeds.medical_form_default import MEDICAL_FORM_HTML
    if not _is_admin(request.user):
        return Response({"error": "BSS Admin only."}, status=status.HTTP_403_FORBIDDEN)
    body = request.data or {}
    action = str(body.get("action") or "").strip()
    form_type = "IX" if str(body.get("formType") or "VIII").upper() == "IX" else "VIII"

    if action == "reset-all":
        deleted, _ = MedicalFormTemplate.objects.filter(form_type=form_type).delete()
        return Response({"reset": deleted, "formType": form_type}, status=status.HTTP_200_OK)

    if action == "publish-all":
        default = _doc_for(MEDICAL_FORM_HTML, form_type)
        published = 0
        for name in _states():
            state, jur = _norm_state(name)
            row, created = MedicalFormTemplate.objects.get_or_create(
                state=state, form_type=form_type, defaults={"jurisdiction": jur})
            if not row.html:
                row.html = default
            row.jurisdiction = jur
            row.form_type = form_type
            row.status = "frozen"
            # Each publish creates a new version.
            row.version = 1 if created else (row.version or 1) + 1
            if not row.created_by_id:
                row.created_by = request.user
            row.save()
            published += 1
        return Response({"published": published, "formType": form_type}, status=status.HTTP_200_OK)

    return Response({"error": "Unknown bulk action."}, status=status.HTTP_400_BAD_REQUEST)


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def admin_employer_directory(request):
    """BSS Admin: employers + their sites (+ state) for the dispatch picker."""
    from bss_core.models import Site
    if not _is_admin(request.user):
        return Response({"error": "BSS Admin only."}, status=status.HTTP_403_FORBIDDEN)
    employers = User.objects.filter(role="employer").order_by("id")
    out = []
    for emp in employers:
        sites = Site.objects.filter(employer=emp).order_by("id")
        out.append({
            "id": emp.id,
            "name": payloads._org_name(emp),
            "sites": [{"id": s.id, "name": s.site_name, "location": s.city or "", "state": s.state or ""} for s in sites],
        })
    return Response({"employers": out}, status=status.HTTP_200_OK)


@api_view(["GET", "POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def admin_medical_form_dispatch(request):
    """BSS Admin: history / send a frozen form to an employer's same-state sites."""
    from bss_core.models import MedicalFormDispatch, MedicalFormDispatchSite, MedicalFormTemplate, Site
    if not _is_admin(request.user):
        return Response({"error": "BSS Admin only."}, status=status.HTTP_403_FORBIDDEN)
    state_q = (request.query_params.get("state") or (request.data or {}).get("state") or "").strip()
    state, jur = _norm_state(state_q)

    if request.method == "GET":
        qs = MedicalFormDispatch.objects.all()
        if state:
            qs = qs.filter(state=state)
        return Response({"dispatches": [_dispatch_row(d) for d in qs.order_by("-id")[:200]]},
                        status=status.HTTP_200_OK)

    body = request.data or {}
    tpl = MedicalFormTemplate.objects.filter(state=state, status="frozen").first()
    if tpl is None:
        return Response({"error": f"Freeze the {state} form before sending."},
                        status=status.HTTP_422_UNPROCESSABLE_ENTITY)
    employer = User.objects.filter(pk=body.get("employerId"), role="employer").first()
    if employer is None:
        return Response({"error": "Employer not found."}, status=status.HTTP_404_NOT_FOUND)
    site_ids = body.get("siteIds") or []
    sites = list(Site.objects.filter(pk__in=site_ids, employer=employer))
    if not sites:
        return Response({"error": "Pick at least one site."}, status=status.HTTP_400_BAD_REQUEST)
    if any((s.state or "") != state for s in sites):
        return Response({"error": f"All sites must be in {state}."},
                        status=status.HTTP_422_UNPROCESSABLE_ENTITY)
    dispatch = MedicalFormDispatch.objects.create(
        state=state, jurisdiction=jur, version=tpl.version, html=tpl.html,
        employer=employer, note=str(body.get("note") or "")[:400], sent_by=request.user)
    MedicalFormDispatchSite.objects.bulk_create([MedicalFormDispatchSite(dispatch=dispatch, site=s) for s in sites])
    return Response({"dispatch": _dispatch_row(dispatch)}, status=status.HTTP_201_CREATED)


def _employer_worker_ids(user):
    return set(WorkerContractorBinding.objects.filter(
        site__employer=user, binding_status="ACCEPTED").values_list("worker_id", flat=True))


@api_view(["GET", "POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def employer_medical_adoption(request):
    """Employer adoption of the published medical forms (Form-VIII / Form-IX)
    for the states of their sites."""
    from bss_core.models import EmployerMedicalFormAdoption, MedicalFormTemplate, Site
    if request.user.role != "employer":
        return Response({"error": "Employers only."}, status=status.HTTP_403_FORBIDDEN)
    _require_permission(request, "medical")

    if request.method == "POST":
        body = request.data or {}
        tpl = MedicalFormTemplate.objects.filter(pk=body.get("templateId")).first()
        if tpl is None:
            return Response({"error": "Form not found."}, status=status.HTTP_404_NOT_FOUND)
        adopt = bool(body.get("adopt"))
        if adopt:
            adoption, _ = EmployerMedicalFormAdoption.objects.get_or_create(
                employer=request.user, template=tpl,
                defaults={"state": tpl.state, "form_type": tpl.form_type})
            adoption.state = tpl.state
            adoption.form_type = tpl.form_type
            adoption.adopted_version = tpl.version or 1
            adoption.adopted_html = tpl.html or ""
            adoption.is_active = True
            adoption.save()
        else:
            EmployerMedicalFormAdoption.objects.filter(employer=request.user, template=tpl).delete()
        return Response({"ok": True, "adopted": adopt}, status=status.HTTP_200_OK)

    states = sorted({(s.state or "").strip() for s in Site.objects.filter(employer=request.user)} - {"", "Central"})
    adoption_rows = list(EmployerMedicalFormAdoption.objects
                         .filter(employer=request.user, is_active=True)
                         .select_related("template"))
    adopted_map = {a.template_id: a for a in adoption_rows}
    rows, seen = [], set()
    for st in states:
        for ft in ("VIII", "IX"):
            tpl = (MedicalFormTemplate.objects.filter(state=st, form_type=ft, status="frozen").first()
                   or MedicalFormTemplate.objects.filter(state=_CENTRAL, form_type=ft, status="frozen").first())
            if tpl is None or tpl.id in seen:
                continue
            seen.add(tpl.id)
            a = adopted_map.get(tpl.id)
            rows.append({
                "templateId": tpl.id, "state": st, "formType": ft,
                "name": payloads._d(tpl.name), "version": tpl.version,
                "adoptedVersion": a.adopted_version if a else None,
                "updateAvailable": bool(a and (a.adopted_version or 1) < (tpl.version or 1)),
                "updatedAt": payloads._dts(tpl.updated_at),
                "adopted": a is not None,
            })
    # Keep adopted versions visible even if a newer version has since been published.
    for a in adoption_rows:
        tpl = a.template
        if tpl is None or tpl.id in seen or tpl.status != "frozen":
            continue
        seen.add(tpl.id)
        rows.append({
            "templateId": tpl.id, "state": a.state or tpl.state, "formType": a.form_type or tpl.form_type,
            "name": payloads._d(tpl.name), "version": tpl.version,
            "adoptedVersion": a.adopted_version,
            "updateAvailable": (a.adopted_version or 1) < (tpl.version or 1),
            "updatedAt": payloads._dts(tpl.updated_at), "adopted": True,
        })
    return Response({"forms": rows, "adoptedCount": sum(1 for r in rows if r["adopted"]),
                     "updatesAvailable": sum(1 for r in rows if r["updateAvailable"])},
                    status=status.HTTP_200_OK)


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def employer_medical_forms(request):
    """Employer: the frozen state/Central health form for each of their site
    states — issued by the BSS Admin in the studio (no per-site dispatch)."""
    from bss_core.models import MedicalFormTemplate, Site
    if request.user.role != "employer":
        return Response({"error": "Employers only."}, status=status.HTTP_403_FORBIDDEN)
    _require_permission(request, "medical")
    from bss_core.models import EmployerMedicalFormAdoption
    adoption_rows = list(EmployerMedicalFormAdoption.objects
                         .filter(employer=request.user, is_active=True)
                         .select_related("template"))
    adoptions = {(a.state, a.form_type): a for a in adoption_rows}
    by_state: dict = {}
    for s in Site.objects.filter(employer=request.user):
        st = (s.state or "").strip()
        if (getattr(s, "jurisdiction", "") or "") == "central" or st.lower() == "central":
            st = _CENTRAL
        if st:
            by_state.setdefault(st, []).append(s)
    out = []
    for st, st_sites in by_state.items():
        forms_map = {}
        for ft in ("VIII", "IX"):
            # Adoption is required: only forms the employer has adopted are
            # available to their Medical Officers. The pinned version is used.
            a = adoptions.get((st, ft))
            if a is None or a.template is None:
                continue
            tpl = a.template
            if tpl.status != "frozen":
                continue
            forms_map[ft] = {
                "id": tpl.id, "formType": ft, "state": st, "jurisdiction": tpl.jurisdiction,
                "version": a.adopted_version or 1, "html": a.adopted_html or tpl.html or "",
                "status": tpl.status, "sentAt": payloads._dts(a.updated_at),
                "reAdoptAvailable": (a.adopted_version or 1) < (tpl.version or 1),
            }
        if not forms_map:
            continue
        primary = forms_map.get("VIII") or next(iter(forms_map.values()))
        out.append({
            "id": primary["id"], "state": st, "jurisdiction": primary["jurisdiction"],
            "formType": primary["formType"], "version": primary["version"], "html": primary["html"],
            "forms": forms_map,
            "employerId": request.user.id, "employerName": payloads._org_name(request.user),
            "siteIds": [s.id for s in st_sites], "siteNames": [s.site_name for s in st_sites],
            "note": "", "sentAt": primary["sentAt"], "sentBy": "BSS Admin",
        })
    return Response({"dispatches": out}, status=status.HTTP_200_OK)


@api_view(["GET", "POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def employer_medical_exams(request):
    """Employer Medical Officer: fetch / record worker medical examinations."""
    from bss_core.models import MedicalExam, Site
    if request.user.role != "employer":
        return Response({"error": "Employers only."}, status=status.HTTP_403_FORBIDDEN)
    _require_permission(request, "medical")
    allowed = _employer_worker_ids(request.user)

    if request.method == "GET":
        raw = (request.query_params.get("workers") or "").strip()
        ids = [int(x) for x in raw.split(",") if x.strip().isdigit()][:2000]
        ids = [i for i in ids if i in allowed]
        exams: dict = {}
        if ids:
            for e in MedicalExam.objects.filter(worker_id__in=ids).order_by("-recorded_at"):
                exams.setdefault(str(e.worker_id), []).append(_exam_row(e))
        return Response({"exams": exams}, status=status.HTTP_200_OK)

    body = request.data or {}
    worker_id = body.get("workerId")
    if not worker_id or worker_id not in allowed:
        return Response({"error": "Worker not bound to your sites."}, status=status.HTTP_403_FORBIDDEN)
    site = Site.objects.filter(pk=body.get("siteId"), employer=request.user).first()
    exam = MedicalExam(worker_id=worker_id, recorded_by=request.user)
    if site is not None:
        exam.site = site
    _apply_exam(exam, body)
    if not exam.state and site is not None:
        exam.state = site.state or ""
    exam.save()
    _mirror_exam(exam)
    return Response({"exam": _exam_row(exam)}, status=status.HTTP_201_CREATED)


@api_view(["GET", "POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def employer_safety_records(request):
    """Employer Safety Office: fetch / save worker PPE + training records.

    Records are PER WORKER + SITE (induction/PPE are site-specific): the record
    for a worker's current active site is what the tab shows and saves."""
    from bss_core.models import SafetyRecord
    if request.user.role != "employer":
        return Response({"error": "Employers only."}, status=status.HTTP_403_FORBIDDEN)
    _require_permission(request, "safety")
    allowed = _employer_worker_ids(request.user)
    bindings = WorkerContractorBinding.objects.filter(site__employer=request.user, binding_status="ACCEPTED")
    site_by_worker = {b.worker_id: b.site_id for b in bindings}

    def _row(r):
        return {
            "workerId": r.worker_id, "siteId": r.site_id, "kitItems": r.kit_items or {},
            "trainings": r.trainings or {}, "issuedBy": r.issued_by or "",
            "storeRef": r.store_ref or "", "kitCondition": r.kit_condition or "",
            "notes": r.notes or "", "updatedAt": payloads._dts(r.updated_at),
            "eligibility": payloads._gate_pass_eligibility(r.worker),
        }

    if request.method == "GET":
        raw = (request.query_params.get("workers") or "").strip()
        ids = [int(x) for x in raw.split(",") if x.strip().isdigit()][:2000]
        ids = [i for i in ids if i in allowed]
        records: dict = {}
        if ids:
            for r in SafetyRecord.objects.filter(worker_id__in=ids):
                if r.site_id != site_by_worker.get(r.worker_id):
                    continue  # only the record for the worker's current site
                records[str(r.worker_id)] = _row(r)
        return Response({"records": records}, status=status.HTTP_200_OK)

    body = request.data or {}
    worker_id = body.get("workerId")
    if not worker_id or worker_id not in allowed:
        return Response({"error": "Worker not bound to your sites."}, status=status.HTTP_403_FORBIDDEN)
    site_id = body.get("siteId") or site_by_worker.get(worker_id)
    rec, _ = SafetyRecord.objects.get_or_create(worker_id=worker_id, site_id=site_id)
    kit = dict(rec.kit_items or {})
    kit.update(body.get("kitItems") or {})
    trn = dict(rec.trainings or {})
    trn.update(body.get("trainings") or {})
    rec.kit_items = kit
    rec.trainings = trn
    for src, fld in (("issuedBy", "issued_by"), ("storeRef", "store_ref"), ("kitCondition", "kit_condition"), ("notes", "notes")):
        if body.get(src) is not None:
            setattr(rec, fld, str(body.get(src))[:400])
    rec.updated_by = request.user
    rec.save()
    _mirror_safety(rec)
    return Response({"record": {**_row(rec)}}, status=status.HTTP_200_OK)


@api_view(["POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def employer_safety_certificate(request):
    """Issue (once) the worker's Health & Safety compliance certificate and persist
    its certificate number against the worker + site."""
    from bss_core.models import SafetyCertificate
    if request.user.role != "employer":
        return Response({"error": "Employers only."}, status=status.HTTP_403_FORBIDDEN)
    _require_permission(request, "safety")
    allowed = _employer_worker_ids(request.user)
    body = request.data or {}
    worker_id = body.get("workerId")
    if not worker_id or worker_id not in allowed:
        return Response({"error": "Worker not bound to your sites."}, status=status.HTTP_403_FORBIDDEN)
    binding = (WorkerContractorBinding.objects
               .filter(worker_id=worker_id, site__employer=request.user, binding_status="ACCEPTED").first())
    site_id = body.get("siteId") or (binding.site_id if binding else None)
    cert = SafetyCertificate.objects.filter(worker_id=worker_id, site_id=site_id).first()
    if cert is None:
        identity = WorkerIdentity.objects.filter(user_id=worker_id).first()
        cert = SafetyCertificate.objects.create(
            worker_id=worker_id, site_id=site_id, employer=request.user,
            worker_bss_id=(identity.bss_worker_id if identity else ""),
            cert_no="TMP", issued_by=request.user)
        cert.cert_no = f"SAFE/{timezone.now().year}/{cert.id:05d}"
        cert.save(update_fields=["cert_no"])
    return Response({"certificate": {"certNo": cert.cert_no, "issuedAt": payloads._dts(cert.issued_at),
                                     "workerId": worker_id, "workerBssId": cert.worker_bss_id,
                                     "employerId": request.user.id, "siteId": site_id}},
                    status=status.HTTP_200_OK)


__all__ = [
    "admin_medical_forms", "admin_medical_forms_bulk", "admin_employer_directory", "admin_medical_form_dispatch",
    "employer_medical_forms", "employer_medical_adoption", "employer_medical_exams", "employer_safety_records", "employer_safety_certificate",
]
