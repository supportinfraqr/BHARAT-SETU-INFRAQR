# Bharat Shram Setu (BSS) — Test Infrastructure Architecture

## 1. Overview
The Bharat Shram Setu (BSS) automated test infrastructure provides an opaque-box, requirement-driven end-to-end (E2E) and API test suite. Built entirely with native Node.js ESM modules (`node:crypto`, `node:buffer`, `node:fs`, and standard `fetch`), it executes direct HTTP/API queries and mutations against live Next.js endpoints, SQLite database persistence via Prisma, AES-256-GCM encrypted session cookies, and multipart document ingestion pipelines.

---

## 2. Directory Structure & Layout

```
tests/
├── helpers/
│   ├── client.mjs          # BssClient HTTP agent (cookie jar, AES session, multipart upload, transient retries)
│   ├── assertions.mjs      # Zero-dependency assertion engine (type, status, equality, inclusion, regex)
│   └── fixtures.mjs        # Magic-byte file generators (PDF, JPEG, PNG), Verhoeff checksum calculation, test users
├── tier1-features/
│   ├── tier1-worker.test.mjs           # 7 Tests: Worker profile, wages, leaves, grievances, smart cards, mobility
│   ├── tier1-contractor.test.mjs       # 7 Tests: Contractor workforce, compliances, salaries, gate passes, bonuses
│   ├── tier1-employer.test.mjs         # 6 Tests: Principal Employer sites, contractors, approvals, verification
│   ├── tier1-bss-staff.test.mjs        # 7 Tests: BSS Staff case queues, claim/wait/resolve/escalate, audit logs
│   ├── tier1-it-helpdesk.test.mjs      # 7 Tests: IT Helpdesk telemetry, health, services, probe, retry-binding, tickets
│   ├── tier1-government.test.mjs       # 5 Tests: Government analytics, state distribution, trades, EPFO/ESIC
│   ├── tier1-uploads.test.mjs          # 5 Tests: Magic-byte PDF/JPEG/PNG uploads, SHA-256 integrity, leave evidence
│   └── tier1-identity-system.test.mjs  # 5 Tests: Health probe, Verhoeff QR identity check, notifications, geography
├── tier2-boundary-corner/
│   └── tier2-security-boundary.test.mjs # 20 Tests: File size (>10MB), Content-Length (>11MB), MIME/magic-byte spoofing, CSRF, RBAC, XSS/SQLi
├── tier3-combinations/
│   └── tier3-workflows.test.mjs        # 5 Tests: Cross-role lifecycles (Contractor->Employer, Worker->Staff->IT, Onboarding)
└── tier4-scenarios/
    └── tier4-real-world.test.mjs       # 3 Tests: 6-Role collaborative lifecycle, high concurrency stress, layout CSS rules

scripts/
└── run-e2e-tests.mjs       # Master test runner with CLI filters, ANSI formatted report, and exit code 0/1 handling
```

---

## 3. Core Test Infrastructure Components

### 3.1. BssClient (`tests/helpers/client.mjs`)
The `BssClient` manages stateful session cookies (`bss_session`), trusted mutation security headers (`Origin`, `Sec-Fetch-Site: same-origin`), automatic JSON parsing, multipart `FormData` uploads, dynamic identifier generation to avoid rate-limiting token bucket exhaustion, and transient compiler manifest retry guards:
- **`client.login(role, credentialOverride)`**: Authenticates against `/api/auth/session` using either OTP or password challenges.
- **`client.get(path, headers)` / `client.post(path, body, headers)` / `client.patch(path, body, headers)` / `client.put(path, body, headers)` / `client.delete(path, headers)`**: Standard HTTP primitives automatically maintaining session cookies.
- **`client.uploadFile({ file, type, site, period, employer })`**: Constructs standard `multipart/form-data` uploads.
- **`client.logout()`**: Clears in-memory session cookies.

### 3.2. Assertion Library (`tests/helpers/assertions.mjs`)
Custom zero-dependency assertion primitives producing descriptive diff outputs on mismatch:
- `assertEqual(actual, expected, message)`
- `assertStatus(response, expectedStatus, message)`
- `assertDefined(value, message)`
- `assertTrue(value, message)`
- `assertFalse(value, message)`
- `assertIncludes(haystack, needle, message)`
- `assertMatches(text, regex, message)`
- `assertGreaterThanOrEqual(actual, expected, message)`

### 3.3. Binary Fixture & Algorithm Generators (`tests/helpers/fixtures.mjs`)
- **`createSamplePdf(filename)`**: Constructs a valid `%PDF-1.4` binary stream with trailer and calculates its authoritative SHA-256 hash.
- **`createSampleJpeg(filename)`**: Constructs a valid JPEG buffer with standard `0xFF 0xD8 0xFF 0xE0` SOI markers.
- **`createSamplePng(filename)`**: Constructs a valid PNG buffer with standard `0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A` header.
- **`createOversizedPdf(filename, size)`**: Allocates buffers exceeding 10.5 MB for HTTP 413 Payload Too Large boundary testing.
- **`createCorruptPdf(filename)`**: Creates mismatched payloads (PDF extension with ASCII text) for magic-byte verification.
- **Verhoeff Checksum Engine (`validateVerhoeff`, `calcVerhoeff`, `generateValidBssId`)**: Complete multiplication (d), permutation (p), and inverse (inv) dihedral D5 permutation group implementation for validating 12-digit Indian government BSS-ID identifiers.

---

## 4. Test Execution Instructions

### 4.1. Prerequisites
Ensure the Next.js portal server is active on `http://localhost:3000` (or set `BSS_TEST_BASE_URL` to the target host):
```bash
npm run dev
```

### 4.2. Executing the Complete Test Suite
Run the full 77-test suite across all 4 tiers:
```bash
npm run test:e2e
# or
node scripts/run-e2e-tests.mjs
```

### 4.3. Filtered Test Execution
Target specific test tiers or test names using command-line arguments:
```bash
# Run only Tier 1 Feature Coverage tests
node scripts/run-e2e-tests.mjs --tier=1

# Run only Tier 2 Boundary & Security tests
node scripts/run-e2e-tests.mjs --tier=2

# Run only Tier 3 Cross-Feature Workflow tests
node scripts/run-e2e-tests.mjs --tier=3

# Run only Tier 4 Real-World Scenario tests
node scripts/run-e2e-tests.mjs --tier=4

# Filter tests by string pattern
node scripts/run-e2e-tests.mjs --filter="Contractor"
node scripts/run-e2e-tests.mjs --filter="Verhoeff"
```
