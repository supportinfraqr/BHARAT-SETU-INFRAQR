"""Side-by-side contract diff — extended with correct params and findings report.

Documents every mismatch between old .NET backend and Django port.
Run while BOTH backends are up (old on :8080, new on :8001).
"""
import json
import urllib.request
import urllib.error

OLD = "http://localhost:8080"
NEW = "http://localhost:8001"
HEADERS = {"Content-Type": "application/json"}
LOGIN_PARAMS = {"UserName": "SAdmin", "Password": "Admin@123", "Action": 1}

# (route, payload) — payloads use the params the OLD system actually needs
CASES = [
    ("/Dashboard/NavMenuList", {"LoginId": 3, "LoginType": 1, "BranchCode": "1"}),
    ("/Dashboard/ModuleList", {"LoginId": 3, "LoginType": 1}),
    ("/Dashboard/RoleList", {"LoginId": 3}),
    ("/RetailSection/GetMasters", {"Action": 1}),
    ("/RetailSection/GetStoreCodeNumber", {}),
    ("/RetailSection/GetStatusMaster", {}),
    ("/RetailSection/GetEmployeeMaster", {"ActionType": 1, "UserId": 3}),
    ("/RetailSection/GetStoreMaster", {"LoginId": 3}),
]


def get_session_cookie():
    import http.cookiejar
    cj = http.cookiejar.CookieJar()
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
    req = urllib.request.Request(f"{OLD}/Login/NGetUserId",
                                 data=json.dumps(LOGIN_PARAMS).encode(), headers=HEADERS)
    try:
        opener.open(req, timeout=30)
    except Exception as e:
        print("login:", e)
    return "; ".join(f"{c.name}={c.value}" for c in cj)


def call_old(url, payload, cookie):
    req = urllib.request.Request(url, data=json.dumps(payload).encode(), headers=HEADERS)
    req.add_header("Cookie", cookie)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, r.read().decode(errors="replace")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode(errors="replace")


def call_new(url, payload):
    req = urllib.request.Request(url, data=json.dumps(payload).encode(),
                                 headers={**HEADERS, "X-Legacy-Login-Id": "3"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, r.read().decode(errors="replace")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode(errors="replace")


def main():
    findings = []

    for route, payload in CASES:
        cookie = get_session_cookie()
        st_old, body_old = call_old(f"{OLD}{route}", payload, cookie)
        st_new, body_new = call_new(f"{NEW}/api{route}", payload)

        old_data = json.loads(body_old) if body_old.startswith(("{", "[")) else body_old
        if isinstance(old_data, dict) and "Result" in old_data:
            old_data = old_data["Result"]
        try:
            new_data = json.loads(body_new)
        except Exception:
            new_data = body_new
        if isinstance(new_data, dict) and "Result" in new_data:
            new_data = new_data["Result"]

        same = json.dumps(old_data, sort_keys=True, default=str) == json.dumps(new_data, sort_keys=True, default=str)
        tag = "MATCH" if same else "DIFF"
        findings.append((route, tag))
        print(f"[{tag}] {route}  (payload={json.dumps(payload)})")
        if not same:
            print(f"   OLD({st_old}): {json.dumps(old_data, default=str)[:220]}")
            print(f"   NEW({st_new}): {json.dumps(new_data, default=str)[:220]}")
        print()

    matches = sum(1 for _, t in findings if t == "MATCH")
    print(f"=== {len(findings)} cases: {matches} MATCH, {len(findings)-matches} DIFF ===")


if __name__ == "__main__":
    main()
