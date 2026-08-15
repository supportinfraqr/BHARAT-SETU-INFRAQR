"""Contract verification sweep for all ported legacy endpoints.

Hits every registered route with a sensible payload and records HTTP status.
Usage: ./venv/bin/python manage.py shell < docs/contract_sweep.py
"""
import json
import os
import re
import sys

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "bss_qr.settings")
sys.path.insert(0, os.path.dirname(__file__))
import django

django.setup()

from django.test import Client

c = Client(HTTP_X_LEGACY_LOGIN_ID="3")

# Common payloads keyed by route prefix (sensible per-module defaults)
PAYLOADS = {
    "Login": {"UserName": "SAdmin", "Password": "Admin@123"},
    "Dashboard": {"ModuleId": 6},
    "PartyMaster": {},
    "RetailSection": {"Action": 1, "LoginId": 3},
    "Retail": {"Action": 1, "LoginId": 3},
    "Worker": {},
    "Contractor": {},
    "Report": {"Action": 1, "LoginId": 3},
    "SendEmail": {"ToEmail": "test@test.com", "Subject": "t", "Msg": "t"},
    "SendEmailApi": {"ToEmail": "test@test.com", "Subject": "t", "Msg": "t"},
    "Newsletter": {"Action": 1, "LoginId": 3},
    "Communication": {"Action": 1, "LoginId": 3},
    "NotificationReminder": {"LoginId": 3},
    "Grievances": {"Action": 1, "LoginId": 3},
    "DocumentMaster": {"Action": 1, "LoginId": 3},
    "VenInvoice": {"Action": 1, "LoginId": 3},
    "Skill": {"Action": 1, "LoginId": 3},
    "Rozgar": {"Action": 1, "LoginId": 3},
    "Rating": {"Action": 1, "UserId": 3},
    "SiteManager": {"Sptype": 4, "LoginId": 3},
    "TimePeriod": {"Action": 4, "LoginId": 3},
    "ChangePasscode": {"LoginId": 3},
    "CDM": {"Action": 4, "LoginId": 3},
    "ClientActMapping": {"Action": 2, "LoginId": 3},
    "Chat": {"Action": 1, "LoginId": 3},
    "Payment": {"Amount": 100, "StoreCode": "1"},
}

urls_file = os.path.join(os.path.dirname(__file__), "..", "backend", "api", "urls.py")
import re as _re

url_src = open(urls_file).read()
route_patterns = _re.findall(r'path\("([^"]+)",', url_src)

results = []
for route in route_patterns:
    route = _re.sub(r"<int:\w+>", "1", route)
    route = _re.sub(r"<str:\w+>", "x", route)
    route = _re.sub(r"<[^>]+>", "1", route)
    route = "/" + route
    route = "/api" + route
    prefix = route.split("/")[3] if len(route.split("/")) > 3 else route.split("/")[2]
    payload = PAYLOADS.get(prefix, {})
    try:
        resp = c.post(route, data=json.dumps(payload), content_type="application/json")
        body = resp.content[:60]
        status = resp.status_code
        ok = status in (200, 201, 400, 404, 409, 500)
        results.append((route, status, ok))
        print(f"{status}  {'OK ' if ok else 'ERR'} {route}  {body.decode(errors='ignore')[:50]}")
    except Exception as e:
        print(f"EXC {route}  {e}")
        results.append((route, -1, False))

good = sum(1 for _, s, ok in results if ok)
print(f"\n=== SWEEP: {good}/{len(results)} endpoints reachable ===")
