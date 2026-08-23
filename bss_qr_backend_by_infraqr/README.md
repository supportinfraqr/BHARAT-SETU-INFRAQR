# BSS QR Backend (by INFRAQR) — isolated demo

QR-only Django backend integrated into the client's ASP.NET system. Separate DB.

## Stack
- Django 6.1 + DRF, PostgreSQL 16, Redis 7, JWT
- Port: `8002` (avoid clash with the main INFRAQR backend on `8001`)

## Apps (QR-only)
- `authx` — auth (JWT + legacy-login-id header)
- `qr` — QR scan/attendance, binding + dual-consent, unbind, ID cards, employer approval/plans

(The original `api` + `legacy` apps were removed — they depend on the client's full SQL Server dump, not needed for the QR demo.)

## Local run
```bash
cd /home/yasser/BSS_Project/development-demo/bss_qr_backend_by_infraqr
./venv/bin/python manage.py runserver 0.0.0.0:8002 --noreload
```

## Separate DB
- Database: `bss_qr_demo` (independent of the INFRAQR `bss_qr` DB)
- Configured in `.env` (`BSS_PG_DB`, `BSS_QR_KEY`, etc.)

## Demo users (password = username)
- admin@test.com (SUPER_ADMIN)
- employer@test.com (EMPLOYER)
- contractor@test.com (PRIMARY_CONTRACTOR)
- worker@test.com (WORKER)

## Production deploy
```bash
# install
pip install gunicorn
# run
./venv/bin/gunicorn bss_qr.wsgi:application --bind 0.0.0.0:8002 --workers 3
```
nginx (optional) reverse-proxy `/api/` -> `127.0.0.1:8002`.

## Client ASP.NET integration
- `EesassinErp/Web.config` -> `BssQrBaseUrl` = the Django backend URL.
- `EesassinErp/Api/QRBridgeApiController.cs` proxies to `/api/qr/*`.
- Razor views: `Views/QR/Scan.cshtml`, `BindingRequests.cshtml`, `IdCard.cshtml`.
- Auth: proxy forwards `X-Legacy-Login-Id` (or `Session["LoginId"]`); Django's `LegacyHeaderAuthentication` resolves the user by `legacy_login_id`.
- Admin "Attendance System" link: dashboard quick-link (added) + sidebar SQL (`AddAdminAttendanceLink.sql`).
