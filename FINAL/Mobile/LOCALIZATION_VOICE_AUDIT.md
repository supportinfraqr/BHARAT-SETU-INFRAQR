# Localization & Voice-Assistant Audit — Six Roles, Indian Languages

Date: 30 August 2026 · Mode: demo · Server: http://localhost:3000

## What was implemented

### 1. Uniform language switching across all six roles (not just the header)
The i18n framework already persisted the language (`bss-lang` cookie) and applied `document.documentElement.lang`,
but only the **worker** pages and the nav shells used `t()`. The **Contractor, Employer, Government, BSS Staff and
IT Help Desk** pages hard-coded English in the body, so switching language changed only the header/nav.

Added a shared role-neutral dictionary `src/locales/uiTranslations.ts` (English source + full **Hindi**)
and registered it in the i18n engine. Then wired the visible chrome of **all six dashboards** to `t()`:
- **Page headers** (eyebrow, title, subtitle, portal pill)
- **KPI card labels** (contractors, workers, sites, compliance score, pending, etc.)
- **Section titles** (contractor oversight, site performance, approval queue, expiry alerts, workforce health,
  action required, recent activity, service status, consent & binding audit, entity lookup, permission-filtered access…)
- **Table/column headers & filter labels** on the Government dashboard (State, Gender, Occupation, Migrant, Site type,
  Employer, Contractor, and all chart card titles + KPI labels + the E-C-S-W hierarchy drill-down header)
- **Buttons** (view all, clear all, etc.)

Result: switching to Hindi now updates headers, subheadings, KPI labels, section titles and data-field headers
uniformly across Worker, Contractor, Employer, Government, BSS Staff and IT Help Desk. Verified at runtime by
requesting each dashboard with `bss-lang=hi` (e.g. Employer → "ठेकेदार", "ठेकेदार निगरानी", "कार्यस्थल प्रदर्शन";
Government → "राज्य", "नियोक्ता", "राष्ट्रीय कार्यबल अवलोकन"; Contractor → "कुल श्रमिक", "अनुपालन स्कोर"; IT Help Desk →
"आईटी हेल्प डेस्क"; Worker → "स्वागत", "श्रमिक पोर्टल").

### 2. Page-reading / voice assistant for other languages
Root cause: tutorial text was English for every route except a handful of Hindi worker pages, and the speech
`lang`/voice were chosen from the selected locale, so non-English selections read English text with a mismatched
voice.

Fixed in `src/data/tutorialContent.ts` + `src/components/worker/VoiceGuide.tsx`:
- `getTutorial()` now returns `{ title, steps, lang }` where `lang` is the **actual language of the text**
  (`hi` when Hindi content exists, else `en`).
- Expanded **Hindi** tutorial content to cover **all six roles** (worker routes + `/contractor/*`, `/employer/*`,
  `/government`, `/bss-staff`, `/it-helpdesk`) and shared pages (`/register`, `/data-sharing`, `/policy`, `/terms`),
  so Hindi reading works everywhere.
- VoiceGuide now picks the utterance `lang` and the matching installed voice from `tutorial.lang` (not the UI locale),
  so **Hindi reads in Hindi** and, for locales without translated text, it reads the English content with
  `en-IN` (no voice/language mismatch). Added an English fallback for unknown routes.

Result: the voice assistant no longer mispronounces — it performs in the language of the tutorial text it reads.

## Coverage & honest limitations
- **Hindi** is fully covered for all six-role dashboards and tutorial reading.
- **English** is the source language and the automatic fallback for every key not yet translated.
- **All 15 Indian languages** are selectable and the plumbing applies to them; if a given `ui.*` or tutorial key has
  no translation, the engine falls back to English (this is the documented design). Genuine per-language coverage
  (Bengali, Tamil, Telugu, Marathi, etc.) requires professional/community translation — the architecture makes that
  a dictionary-only addition (add keys to `uiTranslations.ts` / `tutorialContent.ts`); it is **not** fabricated here.

## Verification
- `npx tsc --noEmit` (src): **clean**. ESLint on changed files: **0 errors** (a few pre-existing `exhaustive-deps`
  and `<img>` warnings).
- `npm run i18n:check`: **passed for 16 locales**.
- Runtime: switching to Hindi translates the header + KPI labels + section titles + table/filter headers on all six
  dashboards; all six portals return **200**; no new runtime errors in the dev log.
