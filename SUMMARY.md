# development-demo — Switchover Summary

Date: 2026-08-22

## What changed

**Stopped (BSS_PROJECT_INFRAQR):**
- Django backend on `:8001` — stopped (port free, no process)
- React frontend — no longer served (nginx repointed)
- PostgreSQL `bss_qr` database — retired (backend stopped; DB unused)

**Now running (development-demo):**
| Component | Where | Port | Status |
|---|---|---|---|
| Client ASP.NET ERP (`EesassinErp`) | mono + mod-mono + Apache | `:8091` | ✅ serving (login.aspx 200) |
| Django QR backend (`bss_qr_backend_by_infraqr`) | Django | `:8002` | ✅ serving (dashboard 200) |
| SQL Server replica (from `bss1826.rar`) | Docker `bss-sql` (2022) | `:1433` | ✅ populated (215 tables, LoginTable 588) |
| Domain `bharat-shramsetu.infraqr.com` | nginx → ERP + Django | — | ✅ live |

## SQL replica from bss1826.rar
- Extracted `bss1826.rar` → `bss1826.sql` (2.7GB)
- Imported into local SQL Server 2022 (Docker) as database `BharatSharamShetu`
- **215 tables** created; data landing (MaintainLog 212k rows, Attendance 183k, LoginTable 588, etc.)
- `retail` login/user created (db_owner) — ERP connects to **127.0.0.1** (client DB no longer hit; all `13.202.27.216` references changed to localhost)

## ERP <-> QR integration (in EesassinErp)
- `Api/QRBridgeApiController.cs` — proxies QR endpoints to Django `:8002`
- `Views/QR/Scan.cshtml`, `BindingRequests.cshtml`, `IdCard.cshtml`
- `Web.config` `BssQrBaseUrl` = `http://127.0.0.1:8002`
- Admin "Attendance System" link on dashboard + sidebar SQL

## Notes / pending
- SQL import from the dump is **still completing in the background** (large data; some batches with embedded newlines skipped — isolated).
- INFRAQR `bss_qr` PostgreSQL database drop is pending (connection lock); it is unused.
- mono hosting is dev/demo-grade — production should use Windows/IIS.