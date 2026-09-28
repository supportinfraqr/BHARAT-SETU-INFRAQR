"""API Setu (apisetu.gov.in) client — GST identity verification.

Two ways to prove a contractor/employer entity against GSTN:

1. Tax Payer Details (no OTP) — GET /gstn/{v1,v2}/taxpayers/{gstin}
   fetches legal/trade name, constitution, status, registration date.
2. Registration Certificate (OTP) — initiate OTP to the Primary Authorized
   Signatory, then validate to fetch the RC details + PDF.

Configuration (env):
    BSS_APISETU_BASE_URL            RC API base (default https://beta.api-setu.in)
    BSS_APISETU_TAXPAYER_BASE_URL   taxpayer API base (default https://apisetu.gov.in)
    BSS_APISETU_CLIENT_ID           X-APISETU-CLIENTID
    BSS_APISETU_API_KEY             X-APISETU-APIKEY
    BSS_APISETU_TOKEN               optional Authorization: Bearer <token>
    BSS_APISETU_TAXPAYER_VERSION    v1 | v2 (default v2)
    BSS_APISETU_MOCK=1              dev only: skip the network (no creds)
"""
import base64
import json
import os
import time
import uuid

import requests

INITIATE_PATH = "/mof/gst/srv/govtapiext/v1.0/rc/initiate"
VALIDATE_PATH = "/mof/gst/srv/govtapiext/v1.0/rc/validate"
TAXPAYER_PATHS = {
    "v1": "/gstn/v1/taxpayers/{gstin}",
    "v2": "/gstn/v2/taxpayers/{gstin}",
}


class ApiSetuError(Exception):
    def __init__(self, message, status_code=502):
        super().__init__(message)
        self.status_code = status_code


def _mock_enabled():
    return str(os.environ.get("BSS_APISETU_MOCK") or "").strip().lower() in ("1", "true", "yes", "on")


def _rc_base_url():
    return (os.environ.get("BSS_APISETU_BASE_URL") or "https://beta.api-setu.in").rstrip("/")


def _taxpayer_base_url():
    return (os.environ.get("BSS_APISETU_TAXPAYER_BASE_URL")
            or os.environ.get("BSS_APISETU_BASE_URL") or "https://apisetu.gov.in").rstrip("/")


def _auth_headers():
    client_id = (os.environ.get("BSS_APISETU_CLIENT_ID") or "").strip()
    api_key = (os.environ.get("BSS_APISETU_API_KEY") or "").strip()
    token = (os.environ.get("BSS_APISETU_TOKEN") or "").strip()
    if not (client_id or api_key or token):
        raise ApiSetuError(
            "API Setu is not configured — set BSS_APISETU_CLIENT_ID / BSS_APISETU_API_KEY "
            "(and/or BSS_APISETU_TOKEN).", 503)
    headers = {"Content-Type": "application/json"}
    if client_id:
        headers["X-APISETU-CLIENTID"] = client_id
    if api_key:
        headers["X-APISETU-APIKEY"] = api_key
    if token:
        headers["Authorization"] = token if token.lower().startswith("bearer ") else f"Bearer {token}"
    return headers


def _request(method, url, *, params=None, payload=None, action=None, timeout=30, retries=1):
    headers = _auth_headers()
    if action:
        headers["action"] = action
    response = None
    for attempt in range(retries + 1):
        try:
            response = requests.request(method, url, params=params,
                                        data=json.dumps(payload) if payload is not None else None,
                                        headers=headers, timeout=timeout)
            break
        except requests.RequestException as exc:
            if attempt < retries:
                time.sleep(1.5 * (attempt + 1))
                continue
            raise ApiSetuError(f"API Setu unreachable: {exc}", 502)
    try:
        body = response.json()
    except ValueError:
        raise ApiSetuError(f"API Setu returned a non-JSON response (HTTP {response.status_code}).", 502)
    if response.status_code >= 400 or str(body.get("status_cd")) == "0":
        message = (body.get("error_description") or body.get("error") or {}).get("message") if isinstance(body.get("error"), dict) else None
        message = message or body.get("error_description") or body.get("error") or f"API Setu error (HTTP {response.status_code})."
        raise ApiSetuError(str(message), 400 if response.status_code < 500 else 502)
    return body


def gstn_taxpayer(gstin, version=None):
    """Fetch GST tax-payer details by GSTIN (no OTP). Returns normalised fields."""
    version = (version or os.environ.get("BSS_APISETU_TAXPAYER_VERSION") or "v2").lower()
    path = (TAXPAYER_PATHS.get(version) or TAXPAYER_PATHS["v2"]).format(gstin=gstin)
    if _mock_enabled():
        return {"gstin": gstin, "legal_name": "MOCK LEGAL NAME", "trade_name": "Mock Trade",
                "constitution": "Proprietorship", "status": "Active",
                "registration_date": "", "taxpayer_type": "Regular", "raw": {}}
    body = _request("GET", f"{_taxpayer_base_url()}{path}", timeout=40, retries=1)
    if version == "v1":
        return {
            "gstin": body.get("gstin") or gstin,
            "legal_name": body.get("legalName") or "",
            "trade_name": "",
            "constitution": body.get("constitution") or "",
            "status": body.get("status") or "",
            "registration_date": body.get("registrationDate") or "",
            "taxpayer_type": body.get("taxPayerType") or "",
            "raw": body,
        }
    return {
        "gstin": body.get("gstIdentificationNumber") or gstin,
        "legal_name": body.get("legalNameOfBusiness") or "",
        "trade_name": body.get("tradeName") or "",
        "constitution": body.get("constitutionOfBusiness") or "",
        "status": body.get("gstnStatus") or "",
        "registration_date": body.get("dateOfRegistration") or "",
        "taxpayer_type": body.get("taxpayerType") or "",
        "raw": body,
    }


def gst_initiate(gstin, legal_name, email):
    """RC flow: send an OTP to the GST primary authorized signatory."""
    if _mock_enabled():
        return {"txn_id": str(uuid.uuid4()), "message": "MOCK: OTP sent."}
    body = _request("POST", f"{_rc_base_url()}{INITIATE_PATH}", action="INITIATE",
                    payload={"gstin": gstin, "legalName": legal_name, "emailId_pas": email})
    data = body.get("data") or {}
    txn_id = data.get("txnId")
    if not txn_id:
        raise ApiSetuError("API Setu did not return a transaction id.", 502)
    return {"txn_id": txn_id, "message": data.get("message", "")}


def gst_validate(gstin, otp, txn_id):
    """RC flow: validate the OTP and fetch the Registration Certificate + PDF."""
    if _mock_enabled():
        return {"gstin": gstin, "legal_name": "", "trade_name": "", "constitution": "",
                "rc_pdf_base64": None, "txn_id": txn_id}
    body = _request("POST", f"{_rc_base_url()}{VALIDATE_PATH}", action="VALIDATE",
                    payload={"gstin": gstin, "otp": str(otp), "txnId": txn_id})
    data = body.get("data") or {}
    details = data.get("data") or {}
    return {
        "gstin": details.get("gstin") or gstin,
        "legal_name": details.get("legalName") or "",
        "trade_name": details.get("tradeName") or "",
        "constitution": details.get("constitutionOfBusiness") or "",
        "rc_pdf_base64": data.get("rcPdf"),
        "txn_id": data.get("txnId") or txn_id,
    }
