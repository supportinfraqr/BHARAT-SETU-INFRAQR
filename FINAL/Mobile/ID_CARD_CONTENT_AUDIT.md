# BSS Identity Cards — Role-Specific Content Update Audit

Scope: content-model only. Contractor + Employer cards changed from photo-centric person identity to **organization identity**. Worker card untouched. Card styling (colors, artwork, watermark, dimensions, QR, RFID, typography, back design, export) unchanged.

## Files

| Change | File |
|---|---|
| **NEW — shared organization identity card** (role-configured: contractor = standard layout, employer = compact layout; same shell/artwork/QR/RFID/export) | `src/components/idcard/OrganizationIdentityCard.tsx` |
| **MODIFIED — Contractor card content** (org schema) | `src/app/contractor/idcard/page.tsx` |
| **MODIFIED — Employer card content** (org schema) | `src/app/employer/idcard/page.tsx` |
| **UNCHANGED — Worker card** | `src/app/worker/idcard/page.tsx` (byte-for-byte untouched) |

## WORKER — person identity (unchanged)

| Check | Status |
|---|---|
| Person photo retained | ✅ `/worker-profile.png` |
| Worker Name | ✅ |
| Worker BSS ID | ✅ |
| DOB retained | ✅ `1990-08-15` |
| Gender retained | ✅ |
| Existing visual design unchanged | ✅ (page untouched) |

## CONTRACTOR — organization identity

| Check | Status |
|---|---|
| Human photo removed | ✅ (no `/contractor-passport.jpg`, no owner portrait) |
| Emblem visibility | ✅ initials `RK` rendered with inline `color:#0A192F` + `font-size` + `font-weight` (immune to Tailwind class-generation/caching) |
| Company/entity emblem used | ✅ initials `RK` (acronym-aware, stopword-free) in the approved photo zone |
| Contractor Name primary | ✅ `RK BUILDCON PVT. LTD.` under `CONTRACTOR NAME` |
| BSS Contractor ID present | ✅ `BSSC198200000001` |
| Entity Type present | ✅ `PRIVATE LIMITED COMPANY` (from profile) |
| DOB removed | ✅ |
| Gender removed | ✅ |
| Date of Incorporation used | ✅ `12/05/2010` (from `identity.incorpDate`) |
| Registration field used | ✅ `REGISTRATION NO.` = CIN `U45200MH2010PTC123456` (single identifier) |
| QR still works | ✅ same `WorkerQr`, same position/style |
| Original colors/style unchanged | ✅ same shell, watermark, tricolour edge, RFID, footer |
| Back side org wording | ✅ tagline `Your Company. Your Compliance. Your Security.` · badge `Verified Organization` |

## EMPLOYER — organization identity

| Check | Status |
|---|---|
| Human photo removed | ✅ (initials `LT` emblem; no person photo) |
| Emblem visibility | ✅ inline `color:#0A192F` + `font-size:30px` + `font-weight:800` on the initials |
| Authorised signatory / HR user removed | ✅ (not rendered on card; portal user never used as identity) |
| Employer Name primary | ✅ `L&T CONSTRUCTION` under `EMPLOYER NAME` |
| BSS Employer ID present | ✅ `BSSE100210000001` |
| Entity Type present | ✅ `PUBLIC LIMITED COMPANY` |
| DOB removed | ✅ |
| Gender removed | ✅ |
| Date of Incorporation used | ✅ `07/12/1946` (from profile) |
| Registration field used | ✅ `REGISTRATION NO.` = CIN `L99999MH1946PLC004768` |
| QR still works | ✅ same `WorkerQr`, same position/style |
| Original colors/style unchanged | ✅ same compact employer layout, shell, tricolour edge, RFID |
| Back side org wording | ✅ tagline `Your Workforce. Your Sites. Your Governance.` · badge `Verified Organization` |

## Regression audit

| Check | Status |
|---|---|
| Worker card unchanged | ✅ |
| Card dimensions (400×252 · 85.60×53.98 mm) | ✅ unchanged |
| Color palette / watermark / artwork | ✅ unchanged |
| QR generation + scanner | ✅ unchanged (`WorkerQr`, `/verify` route, scan pages) |
| Identity-card downloads / PDF / print layout | ✅ export logic retained per page; shared capture options identical |
| RFID indicator | ✅ unchanged |
| Back-side visual design | ✅ unchanged (only org wording/badges) |
| Binding system | ✅ untouched |
| PAY/statutory identifiers printed? | ✅ no PAN/GSTIN/EPFO printed — only one registration identifier (CIN); sensitive IDs stay behind QR/profile |

## Demo data (clearly development values)

- Contractor: `RK Buildcon Pvt. Ltd.` · `BSSC198200000001` · Private Limited Company · DOI `12/05/2010` · CIN `U45200MH2010PTC123456` · emblem `RK`
- Employer: `L&T Construction` · `BSSE100210000001` · Public Limited Company · DOI `07/12/1946` · CIN `L99999MH1946PLC004768` · emblem `LT`

## Verification

- `tsc` ✅ · `next build` ✅ (83 routes)
- Runtime (authenticated): Contractor card renders `Contractor Name / BSS Contractor ID / Entity Type / Date of Incorporation / Registration No.` with initials `RK`, no photo/DOB/Gender; Employer card renders org schema with initials `LT`, no person fields; Worker card renders person schema unchanged.
