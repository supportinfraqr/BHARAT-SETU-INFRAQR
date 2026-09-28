"""API Setu (apisetu.gov.in) client — GSTN Registration Certificate API.

Used for post-signup GST identity verification of employers and contractors:
initiate an OTP to the Primary Authorized Signatory, then validate it to fetch
the GST Registration Certificate (legal/trade name, constitution, RC PDF).

Configuration (env):
    BSS_APISETU_BASE_URL   default https://beta.api-setu.in
    BSS_APISETU_CLIENT_ID  X-APISETU-CLIENTID
    BSS_APISETU_API_KEY    X-APISETU-APIKEY
    BSS_APISETU_MOCK=1     dev only: skip the network (no creds needed)
"""
import base64
import json
import os
import uuid

import requests

INITIATE_PATH = "/mof/gst/srv/govtapiext/v1.0/rc/initiate"
VALIDATE_PATH = "/mof/gst/srv/govtapiext/v1.0/rc/validate"


class ApiSetuError(Exception):
    def __init__(self, message, status_code=502):
        super().__init__(message)
        self.status_code = status_code


def _base_url():
    return (os.environ.get("BSS_APISETU_BASE_URL") or "https://beta.api-setu.in").rstrip("/")


def _mock_enabled():
    return str(os.environ.get("BSS_APISETU_MOCK") or "").strip().lower() in ("1", "true", "yes", "on")


def _headers(action):
    client_id = (os.environ.get("BSS_APISETU_CLIENT_ID") or "").strip()
    api_key = (os.environ.get("BSS_APISETU_API_KEY") or "").strip()
    if not client_id or not api_key:
        raise ApiSetuError(
            "API Setu is not configured — set BSS_APISETU_CLIENT_ID and BSS_APISETU_API_KEY.", 503)
    return {
        "X-APISETU-CLIENTID": client_id,
        "X-APISETU-APIKEY": api_key,
        "action": action,
        "Content-Type": "application/json",
    }


def _post(path, action, payload, timeout=30):
    url = f"{_base_url()}{path}"
    try:
        response = requests.post(url, data=json.dumps(payload), headers=_headers(action), timeout=timeout)
    except requests.RequestException as exc:
        raise ApiSetuError(f"API Setu unreachable: {exc}", 502)
    try:
        body = response.json()
    except ValueError:
        raise ApiSetuError(f"API Setu returned a non-JSON response (HTTP {response.status_code}).", 502)
    if str(body.get("status_cd")) == "0" or response.status_code >= 400:
        error = body.get("error") or {}
        raise ApiSetuError(error.get("message") or f"API Setu error (HTTP {response.status_code}).", 400)
    return body


def gst_initiate(gstin, legal_name, email):
    """Send an OTP to the GST primary authorized signatory. Returns the txnId."""
    if _mock_enabled():
        return {"txn_id": str(uuid.uuid4()),
                "message": "MOCK: OTP sent to the registered email and mobile."}
    body = _post(INITIATE_PATH, "INITIATE",
                 {"gstin": gstin, "legalName": legal_name, "emailId_pas": email})
    data = body.get("data") or {}
    txn_id = data.get("txnId")
    if not txn_id:
        raise ApiSetuError("API Setu did not return a transaction id.", 502)
    return {"txn_id": txn_id, "message": data.get("message", "")}


def gst_validate(gstin, otp, txn_id):
    """Validate the OTP and fetch the GST Registration Certificate details + PDF."""
    if _mock_enabled():
        return {"gstin": gstin, "legal_name": "", "trade_name": "", "constitution": "",
                "rc_pdf_base64": None, "txn_id": txn_id}
    body = _post(VALIDATE_PATH, "VALIDATE",
                 {"gstin": gstin, "otp": str(otp), "txnId": txn_id})
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
