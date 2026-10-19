# BSS Employer Dashboard: Medical + Health & Safety Training

This is the runnable version of the Employer Dashboard that was hosted at http://localhost:3210. It adds:
- a **Medical** tab, used by the employer's Medical Officer;
- a **Health & Safety Training** tab, used by the Safety Office;
- an **Employer | BSS Staff** switch that opens the state health-form studio.

## Run
```bash
npm install
npm run dev        # http://localhost:3210/employer/dashboard
# or: npm run build && npm start
```
Requires Node 20 or newer.

## Where things are
| Path | Status |
|---|---|
| `src/app/employer/dashboard/page.tsx` | Dashboard page with the 2 new tabs and the role switch |
| `src/components/employer/medical/` | New UI: `MedicalFormStudio` (BSS Staff), `MedicalTab`, `SafetyTrainingTab`, `oshFormTemplate.ts` (HTML replica of the Form-VIII/IX PDF), `formEngine.ts` (fills the `data-field` slots into the certificate) |
| `src/app/api/bss-staff/*`, `src/app/api/employer/{medical-forms,medical-exams,safety-records}` | New API routes |
| `src/server/medical/store.ts` | **Demo store** (writes `.data/bss-medical-store.json`). Replace its functions with real backend calls, keeping the same signatures. In production, take `employerId` from the session. |
| `src/contexts/*`, `src/types/portal.ts`, `src/lib/*`, `src/i18n`, `src/locales`, `src/app/layout.tsx`, `src/app/employer/layout.tsx`, `src/app/api/employer/{analytics,licenses,attendance,workforce}`, `src/data/employer.ts` | **Mock / preview only.** These stand in for the real app's contexts, session and APIs. Do not copy them over the production versions. |

## Flow
1. BSS Staff picks a state or UT. The form HTML is locked by default.
2. Unlock to edit. The code and the live render are side by side, and edits auto-save as a draft.
3. Lock to freeze a version.
4. Select an employer and that employer's sites in the same state, then Send.
5. The employer sees only the rendered form. The Medical Officer records exams per worker, and the certificate is generated on that site's state form.

To reset the demo data, delete `.data/`.
