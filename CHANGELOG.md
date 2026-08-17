# CHANGELOG

Append-only. Most recent entries first.

Use short, telegraphic style:
- verb + object
- no articles
- concise lines

One entry per task.

## 2026-08-16 — Fix dark theme blue-on-black contrast and token luminance

Redefine dark mode primary blue tokens to high-contrast sky blue (#38bdf8, 8.6:1 contrast ratio) and replace hardcoded dark blue backgrounds with tokenized linear gradients
Files/Modules: web/src/tokens.css, web/src/components/Button/Button.css, web/src/pages/Dashboard.tsx, web/src/pages/Dashboard.css
Impact: Ultra-high contrast legibility for all headers, links, topbar titles, icons, and filled buttons in dark theme
Reason: Eliminate low-contrast dark blue on dark slate/black background issues reported by user

## 2026-08-16 — Polish Login surface accessibility and component interaction

Verify craft floor quality standards across authentication, role radio options, form field states, and responsive hero alignment
Files/Modules: web/src/pages/Login.tsx, web/src/assets/legacy-login.css
Impact: Explicit label bindings, 48px touch targets, `:focus-visible` focus rings, dark theme compatibility, and 0 anti-patterns
Reason: Complete production polish pass for Login authentication surface

## 2026-08-16 — Harden network error handling and boundary resilience

Implement API error boundaries, retry callbacks, fallback properties, and submission guards
Files/Modules: Workers.tsx, Dashboard.tsx, QRScan.tsx
Impact: Added user-facing error state recovery, retry buttons, robust empty data fallbacks, and double-submit guards
Reason: Prevent unhandled runtime exceptions and stranded interface states during network failures

## 2026-08-16 — Clarify UX microcopy, validation, and error messaging

Refine input placeholders, button action labels, empty state guidance, and site location warning copy
Files/Modules: QRScan.tsx, Login.tsx, ModuleScreen.tsx
Impact: Actionable recovery instructions for attendance verification, explicit field guidance, and non-blaming error messages
Reason: Improve microcopy clarity, user wayfinding, and accessibility

## 2026-08-16 — Implement dark theme color tokens and semantic palette roles

Add media query and data-theme dark mode color token mappings for surfaces, borders, text, and semantic status indicators
Files/Modules: web/src/tokens.css
Impact: First-class dark mode support adhering to WCAG AA contrast minimums (4.5:1 text, 3:1 controls)
Reason: Complete design system colorization and theme adaptation

## 2026-08-16 — Perform final design polish and anti-pattern cleanup

Resolve font inheritance anti-pattern and verify technical quality floor across all web views
Files/Modules: web/public/legacy/NewLogin/style.css, BSS_PROJECT_INFRAQR/web
Impact: Clean mechanical detector scan (0 anti-patterns), production build validation, unified typography
Reason: Complete final quality polish pass before release

## 2026-08-16 — Optimize bundle size, code splitting, and image decoding

Implement route-level React code splitting, image aspect dimensions, and async decoding
Files/Modules: App.tsx, Login.tsx, Dashboard.tsx
Impact: Main initial bundle size reduced from 298kB to 230kB (-23%); route chunks lazy loaded on demand; eliminated CLS image reflows
Reason: Accelerate First Contentful Paint (FCP) and Largest Contentful Paint (LCP) performance

## 2026-08-16 — Refactor spatial rhythm and layout hierarchy

Establish clear reading order, container boundaries, table data rhythm, and module view structure
Files/Modules: ModuleScreen.tsx, ModuleScreen.css, Dashboard.css, Workers.css
Impact: Standardized table headers, sticky columns, clear visual hierarchy, and container spacing
Reason: Eliminate unformatted layout blocks and align data display with spatial design scale

## 2026-08-16 — Adapt responsive layouts for mobile and touch devices

Implement mobile safe-area insets, fluid grid layouts, coarse touch target adaptation, and responsive navigation
Files/Modules: index.html, web/src/tokens.css, Dashboard.css, Workers.css, QRScan.css
Impact: Viewport-fit cover, notch safe-area handling, touch target expansion, mobile sidebar drawer accessibility
Reason: Ensure seamless usability and native touch support across phone, tablet, and desktop viewports

## 2026-08-16 — Extract design system tokens and reusable UI components

Extract central design tokens into web/src/tokens.css and reusable UI components
Files/Modules: web/src/tokens.css, web/src/components (Button, Card, Badge), Workers, Login, QRScan
Impact: Standardized colors, spacing, typography, touch targets, focus states, and card containers
Reason: Eliminate hard-coded hex colors, inconsistent card borders, and inaccessible form controls

## 2026-08-16 — Integrate Django API v1 boundary

Implement normalized authentication, session, logout, and grievance operations
Files/Modules: Django API/authentication, OpenAPI contract, React web, Expo client
Impact: Versioned identity and grievance workflows now use JWT authentication without client-authoritative identity
Reason: Align existing Django and React/Expo migration with decoupled frontend contract

## 2026-08-16 — Decouple frontend/backend boundary

Add versioned contracts, shared client, session adapter, and ASP.NET compatibility routes
Files/Modules: API contracts, login/session, worker layout, worker grievances, MVC routing
Impact: Authentication, session lifecycle, and worker grievance transport
Reason: Enable incremental Django and React Native migration without breaking ASP.NET workflow

## 2026-08-16 — Harden worker grievance flow

Improve accessible recording, validation, uploads, and submission recovery
Files/Modules: Worker grievance Razor view, script, and styles
Impact: Worker grievance recording and submission
Reason: Prevent ambiguous controls, duplicate DOM identities, unsafe filenames, repeated submissions, and unrecoverable errors
