"""Employer → contractor SAP populate endpoints.

* ``GET  /v1/employer/sap/config``  — whether SAP is configured + the field map.
* ``POST /v1/employer/contractors/<id>/sap-sync`` — pull the contractor's master
  data from SAP (live OData) or from an uploaded SAP export (``sap`` file) and
  map it onto the contractor profile.
"""

# ruff: noqa: F401,F403
import re

from .common import *


def _profile_payload(profile):
    return {
        "contractorCode": profile.contractor_code,
        "contractorName": profile.contractor_name,
        "tradeName": profile.trade_name,
        "gstin": profile.gstin,
        "panNo": profile.pan_no,
        "cin": profile.cin,
        "mobile": profile.mobile,
        "email": profile.email,
        "address": profile.address,
        "district": profile.district,
        "state": profile.state,
        "clraLicenceNo": profile.clra_licence_no,
        "registrationSource": profile.registration_source,
    }


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def employer_sap_config(request):
    """SAP integration status + the SAP→profile field map (for the UI)."""
    from api import sap_client
    if request.user.role != "employer":
        return Response({"error": "Employers only."}, status=status.HTTP_403_FORBIDDEN)
    cfg = sap_client.sap_config()
    return Response({"data": {
        "configured": sap_client.is_configured(),
        "mode": cfg["mode"],
        "entity": cfg["entity"] if sap_client.is_configured() else "",
        "companyDb": cfg["companyDb"],
        "allowlistIps": sap_client.allowlist_ips(),
        "fieldMap": sap_client.field_map_payload(),
    }}, status=status.HTTP_200_OK)


def _setup_document_html(employer_name, cfg, ips, field_map):
    """Printable setup + IP-whitelisting guide for one employer."""
    from html import escape
    rows = "".join(
        f"<tr><td>{escape(m['label'])}</td><td><code>{escape(m['field'])}</code></td>"
        f"<td>{escape(', '.join(m['sapFields']))}</td></tr>" for m in field_map)
    ip_list = "".join(f"<li><code>{escape(ip)}</code></li>" for ip in ips) or "<li><em>not detected</em></li>"
    mode = cfg["mode"]
    sap_hint = ("SAP Business One <strong>Service Layer</strong> (usually port <code>50000</code>, "
                "e.g. <code>https://sap-host:50000/b1s/v1</code>)"
                if mode == "b1" else
                "SAP Gateway <strong>OData</strong> service (e.g. <code>/sap/opu/odata/sap/API_BUSINESS_PARTNER</code>)")
    return f"""<!doctype html><html><head><meta charset="utf-8"><title>BSS SAP Setup — {escape(employer_name)}</title>
<style>
 body {{ font-family: Arial, Helvetica, sans-serif; margin: 32px; color:#111; line-height:1.5; }}
 h1 {{ font-size:20px; margin:0 0 4px; }} h2 {{ font-size:14px; margin:22px 0 6px; text-transform:uppercase; letter-spacing:.04em; }}
 .sub {{ color:#666; font-size:12px; margin-bottom:16px; }}
 code, pre {{ font-family: ui-monospace, Menlo, Consolas, monospace; }}
 pre {{ background:#f4f6f8; border:1px solid #d7dde3; border-radius:6px; padding:10px; font-size:12px; white-space:pre-wrap; }}
 table {{ width:100%; border-collapse:collapse; font-size:12px; }} th,td {{ border:1px solid #cfd6dd; padding:6px 8px; text-align:left; vertical-align:top; }}
 th {{ background:#0A192F; color:#fff; }}
 ul {{ margin:6px 0 0 18px; }}
 .tag {{ display:inline-block; font-size:11px; font-weight:700; padding:2px 6px; border-radius:4px; background:#e8f0fb; color:#0b4a8b; }}
 .warn {{ background:#fff7ed; border:1px solid #fed7aa; color:#9a3412; padding:8px 10px; border-radius:6px; font-size:12px; }}
</style></head><body>
 <h1>SAP Integration — Setup &amp; IP Whitelisting</h1>
 <div class="sub">Prepared for <strong>{escape(employer_name)}</strong> · Generated {escape(str(__import__('datetime').date.today()))} · Bharat Shram Setu</div>

 <h2>1. Allow-list the BSS server IP(s) at your SAP</h2>
 <p>Add the following outbound IP{'' if len(ips)==1 else 's'} to the firewall / reverse proxy / SAP access rules that protect your SAP API, so the BSS platform can call it:</p>
 <ul>{ip_list}</ul>
 <div class="warn">If your SAP sits behind a VPN/Tailscale or an SAP Cloud Connector, enable that path for these IPs instead of a public firewall rule. Allow the SAP port (B1 Service Layer default <code>50000</code>; Gateway <code>443</code>).</div>

 <h2>2. Provide a SAP API user</h2>
 <p>Create a technical/communication user with read access to Business Partners (B1) / the OData service, and share:</p>
 <pre>CompanyDB (if SAP B1): {escape(cfg['companyDb'] or '&lt;company database&gt;')}
Username: {escape(cfg['username'] or '&lt;api user&gt;')}
Password: (shared separately, never over email)
Service base URL: {escape(cfg['baseUrl'] or '&lt;https://sap-host:50000/b1s/v1&gt;')}</pre>

 <h2>3. Enable the API service</h2>
 <p>Target: {sap_hint}. Mode configured: <span class="tag">{escape(mode)}</span>.</p>
 <p>BSS will log in and read a Business Partner by its identifier (CardCode / Vendor number / BusinessPartner). Typical call:</p>
 <pre>POST {escape(cfg['baseUrl'] or '&lt;base&gt;')}/{ 'Login' if mode=='b1' else cfg['entity'] }
GET  {escape(cfg['baseUrl'] or '&lt;base&gt;')}/{ "BusinessPartners('VEND01519')" if mode=='b1' else (cfg['entity'] + "?$filter=" + cfg['idField'] + " eq '<id>'") }</pre>

 <h2>4. Field mapping (SAP → BSS contractor profile)</h2>
 <table><thead><tr><th>BSS field</th><th>Key</th><th>SAP field(s) accepted</th></tr></thead><tbody>{rows}</tbody></table>

 <h2>5. How to populate</h2>
 <p>In BSS: <strong>Employer → My Contractors → Populate from SAP</strong> → enter the contractor&rsquo;s CardCode/Vendor number (or upload a SAP export CSV/XLSX). The mapped fields are written into the contractor profile.</p>
</body></html>"""


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def employer_sap_setup_document(request):
    """Download the SAP setup & IP-whitelisting document for this employer."""
    from django.http import HttpResponse
    from api import sap_client
    user = request.user
    if user.role != "employer":
        return Response({"error": "Employers only."}, status=status.HTTP_403_FORBIDDEN)
    emp_profile = getattr(user, "employer_profile", None)
    employer_name = (emp_profile.employer_name if emp_profile else "") or str(user)
    html = _setup_document_html(employer_name, sap_client.sap_config(),
                                sap_client.allowlist_ips(), sap_client.field_map_payload())
    filename = f"bss-sap-setup-{re.sub(r'[^A-Za-z0-9]+', '-', employer_name).strip('-') or 'employer'}.html"
    response = HttpResponse(html, content_type="text/html; charset=utf-8")
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response


@api_view(["POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def employer_contractor_sap_sync(request, contractor_id):
    """Populate a bound contractor's profile from SAP (live or uploaded export)."""
    from django.contrib.auth import get_user_model
    from api import sap_client
    from bss_core.models import ContractorEmployerBinding, ContractorProfile
    from .admin_console import log_audit

    user = request.user
    if user.role != "employer":
        return Response({"error": "Employers only."}, status=status.HTTP_403_FORBIDDEN)

    User = get_user_model()
    contractor = User.objects.filter(id=contractor_id, role="contractor").first()
    if contractor is None:
        return Response({"error": "Contractor not found."}, status=status.HTTP_404_NOT_FOUND)

    bound = (ContractorEmployerBinding.objects
             .filter(employer=user, contractor=contractor)
             .exclude(binding_status__in=["REJECTED", "CANCELLED"]).exists())
    if not bound:
        return Response({"error": "This contractor is not bound to your organisation."},
                        status=status.HTTP_403_FORBIDDEN)

    profile, _ = ContractorProfile.objects.get_or_create(user=contractor)
    identifier = str(request.data.get("identifier") or profile.contractor_code
                     or getattr(contractor, "bss_id", "") or "").strip()

    upload = request.FILES.get("sap")
    source = ""
    try:
        if upload is not None:
            record = sap_client.parse_sap_export(upload, identifier)
            source = f"file:{os.path.basename(getattr(upload, 'name', '') or 'sap-export')}"
        else:
            if not identifier:
                return Response({"error": "No Contractor code / CIN to look up in SAP."},
                                status=status.HTTP_400_BAD_REQUEST)
            record = sap_client.fetch_record(identifier)
            source = "sap-b1" if sap_client.sap_config()["mode"] == "b1" else "sap-odata"
    except RuntimeError as exc:
        return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    if not record:
        return Response({"error": "No SAP record found."}, status=status.HTTP_404_NOT_FOUND)

    mapped = sap_client.map_sap_record(record)
    if not mapped:
        return Response({"error": "The SAP record had no recognisable contractor fields."},
                        status=status.HTTP_400_BAD_REQUEST)

    for field, value in mapped.items():
        if hasattr(profile, field):
            setattr(profile, field, value)

    employer_name = ""
    emp_profile = getattr(user, "employer_profile", None)
    if emp_profile is not None:
        employer_name = emp_profile.employer_name or ""
    profile.registration_source = source[:80]
    profile.registered_by = (employer_name or str(user))[:120]
    profile.save()

    log_audit(user, "UPDATE", "contractor_profile", contractor.id,
              after={"summary": f"SAP populate for {profile.contractor_name or contractor_id} ({source})"})

    return Response({"data": {
        "profile": _profile_payload(profile),
        "mapped": sorted(mapped.keys()),
        "source": source,
    }}, status=status.HTTP_200_OK)


__all__ = ["employer_sap_config", "employer_contractor_sap_sync", "employer_sap_setup_document"]
