# Milestone 2 Challenge Report: Contractor Uploads & Storage Pipeline

**Agent**: `challenger_m2_1`  
**Milestone**: Milestone 2 (Contractor Uploads & Storage Pipeline)  
**Parent Conversation**: `76d34cfe-4c33-4e01-a296-a09cfced21d5`  
**Date**: 2026-08-31T14:27:00Z  
**Verdict**: **APPROVE**  

---

## 1. Observation

Direct empirical investigation and adversarial test execution against Milestone 2 yielded the following verified facts:

### 1.1 Magic-Byte Verification & Format Mismatch Defense
- **Implementation**: `src/server/storage.ts:23-68` verifies the initial 16 binary magic bytes:
  - PDF: `%PDF-` (`0x25, 0x50, 0x44, 0x46, 0x2D`)
  - JPEG: `0xFF, 0xD8, 0xFF`
  - PNG: `0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A`
- **Adversarial Stress Results (`tests/adversarial-m2-empirical.mjs:71-182`)**:
  - `1.1 Valid PDF with %PDF-`: Returns HTTP `201 Created` with valid SHA-256 hash.
  - `1.2 Valid JPEG with 0xFF 0xD8 0xFF`: Returns HTTP `201 Created`.
  - `1.3 Valid PNG with 0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A`: Returns HTTP `201 Created`.
  - `1.4 Text disguised as PDF`: Rejected with HTTP `415 Unsupported Media Type`.
  - `1.5 ELF binary disguised as PDF`: Rejected with HTTP `415`.
  - `1.6 ZIP / DOCX archive disguised as PDF`: Rejected with HTTP `415`.
  - `1.7 Corrupt JPEG header (0xFF 0xD8 0x00)`: Rejected with HTTP `415`.
  - `1.8 Truncated PNG header (7 bytes)`: Rejected with HTTP `415`.
  - `1.9 Cross-MIME spoofing (PDF bytes declared as image/png)`: Rejected with HTTP `415`.
  - `1.10 Disallowed executable MIME (application/x-sh)`: Rejected with HTTP `415`.

### 1.2 Boundary Conditions & Payload Size Limits
- **Implementation**: `src/server/storage.ts:14-15` & `src/app/api/portal/uploads/route.ts:33-56`:
  - `MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024` (10 MB)
  - `MAX_CONTENT_LENGTH_BYTES = 11 * 1024 * 1024` (11 MB)
- **Adversarial Stress Results (`tests/adversarial-m2-empirical.mjs:188-239`)**:
  - `2.1 Zero-byte empty file`: Rejected with HTTP `400 Bad Request`.
  - `2.2 Boundary: Exactly 10MB payload`: Accepted with HTTP `201 Created`.
  - `2.3 Boundary: 10MB + 1 byte payload`: Rejected with HTTP `413 Payload Too Large`.
  - `2.4 Oversized upload (>10MB)`: Rejected with HTTP `413 Payload Too Large`.

### 1.3 Filename Sanitization & Directory Traversal Prevention
- **Implementation**: `src/server/storage.ts:73-94`:
  - Strips path separators, Windows backslashes, control characters, and reserved symbols.
  - Sanitizes stem to alphanumeric/underscores up to 120 chars.
  - Generates storage path: `.data/uploads/{role}/{year}/{month}/{uploadId}.{ext}`.
- **Adversarial Stress Results (`tests/adversarial-m2-empirical.mjs:245-290`)**:
  - `3.1 Missing metadata field ('type')`: Rejected with HTTP `400 Bad Request`.
  - `3.2 Metadata field exceeding 200 chars`: Rejected with HTTP `400 Bad Request`.
  - `3.3 Path traversal in filename ('../../../../etc/passwd.pdf')`: Stored safely with sanitized filename and isolated inside `.data/uploads/contractor/...` without directory escape.

### 1.4 POSIX Filesystem Storage & Permissions Audit
- **Implementation**: `src/server/storage.ts:123-140`:
  - Directory permissions: `0o700` (`rwx------`)
  - File permissions: `0o600` (`rw-------`)
  - Temporary write to `.data/uploads/tmp/{uploadId}...tmp` and atomic `rename()` to target path.
- **Adversarial Stress Results (`tests/adversarial-m2-empirical.mjs:296-324`)**:
  - Verified directory POSIX mode: `(stat.mode & 0o777) === 0o700`.
  - Verified file POSIX mode: `(stat.mode & 0o777) === 0o600`.
  - Direct binary read of disk file matched exact raw uploaded buffer; `sha256:{hex}` matched SQLite `DocumentSubmission.checksum` column byte-for-byte.

### 1.5 Retrieval, Streaming Download, & Security Headers
- **Implementation**: `src/app/api/portal/uploads/[id]/route.ts`:
  - Node `createReadStream` piped to Web `ReadableStream`.
  - Fine-grained RBAC matrix (`authorizeDocumentAccess`).
- **Adversarial Stress Results (`tests/adversarial-m2-empirical.mjs:330-417`)**:
  - `5.1 Uploader file streaming GET`: Returns HTTP `200 OK` with headers:
    - `Content-Type: application/pdf`
    - `Content-Length: <size>`
    - `Content-Disposition: inline; filename="..."`
    - `X-Content-Type-Options: nosniff`
    - `Content-Security-Policy: default-src 'none'; sandbox`
    - `Cache-Control: private, no-store, max-age=0`
  - `5.2 HEAD request`: Returns HTTP `200 OK` with identical headers and null body.
  - `5.3 Bound Principal Employer`: Returns HTTP `200 OK`.
  - `5.4 Audit Roles (BSS Staff, IT Help Desk, Government)`: Return HTTP `200 OK`.
  - `5.5 Unrelated Worker`: Rejected with HTTP `403 Forbidden`.
  - `5.6 Unrelated Contractor`: Rejected with HTTP `403 Forbidden`.
  - `5.7 Unauthenticated Request`: Rejected with HTTP `401 Unauthorized`.
  - `5.8 Non-existent Document ID`: Returns HTTP `404 Not Found`.
  - `5.9 Ghost Document (DB record present, file unlinked from disk)`: Returns HTTP `404 Not Found` with message `"Document file is missing from storage."` without unhandled exceptions or crash.

### 1.6 Employer Verification Loop & Status Synchronization
- **Implementation**: `src/app/api/portal/[resource]/route.ts` & `src/server/portal.ts:1122-1132`:
  - Principal Employer issues `PATCH /api/portal/submissions` with `{ id, status: "Verified" | "Returned" }`.
- **Adversarial Stress Results (`tests/adversarial-m2-empirical.mjs:423-488`)**:
  - `6.1 Employer transition to "Verified"`: Updates SQLite record to `Verified`, synchronizes immediately across Employer portal and Contractor portal queries.
  - `6.2 Employer transition to "Returned"`: Updates SQLite record to `Returned`.
  - `6.3 Invalid status value`: Rejected with HTTP `422 Unprocessable Entity` ("Select a valid submission decision.").
  - `6.4 Unauthorized Worker PATCH`: Rejected with HTTP `403 Forbidden`.
  - `6.5 Unauthorized Government PATCH`: Rejected with HTTP `403 Forbidden`.

---

## 2. Logic Chain

1. **Security & Data Sanitization**:
   - Client MIME headers are untrusted. Requiring both `ALLOWED_MIME_TYPES.has(file.type)` and `verifyFileSignature(file)` ensures that executable scripts, binary payloads, and truncated streams cannot be uploaded under disguised extensions.
   - Restricting filenames with `sanitizeFileName()` eliminates path traversal attacks (`../`, null bytes, control characters).
2. **Storage Reliability & Concurrency**:
   - Atomic write-to-temp and POSIX `rename()` ensures partial or interrupted uploads never result in corrupt half-written files at the target destination.
   - POSIX mode `0o700` for upload directories and `0o600` for files restricts read/write access solely to the running node process.
3. **Audit Compliance & Access Control**:
   - Generating SHA-256 hash checksums during disk write and storing them in SQLite `DocumentSubmission.checksum` guarantees end-to-end statutory document provenance.
   - `authorizeDocumentAccess` enforces multi-tenant isolation: contractors cannot access other contractors' confidential wage and statutory filings; workers cannot inspect corporate contractor registers; yet bound principal employers and statutory oversight authorities (BSS Staff, IT Help Desk, Government) have verified access.
4. **Governance Life-Cycle**:
   - The Employer verification workflow enables seamless compliance review (`Pending review` -> `Verified` / `Returned`) reflected synchronously across all connected portals.

---

## 3. Caveats

- **Ephemeral Cloud Environments**: As documented in the architecture plan, local disk storage under `.data/uploads` operates on local persistent filesystems and containerized volumes. For serverless read-only container environments, `getRuntimeConfig().mode === 'remote'` routes uploads to upstream storage.
- **Strict 10MB Ceiling**: Files exceeding 10MB (even 10MB + 1 byte) are rejected by design per statutory register size constraints.

---

## 4. Conclusion

**Verdict: APPROVE**

Milestone 2 (Contractor Uploads & Storage Pipeline) is empirically robust, secure, and fully verified against all architectural requirements, boundary stress conditions, and adversarial attack vectors. All 33 empirical challenge tests, 7 empirical verification tests, and 77 multi-tier E2E tests pass with a 100% success rate.

---

## 5. Verification Method

To independently execute and verify all challenge tests:

1. **Milestone 2 Adversarial Stress Suite (33 empirical tests)**:
   ```bash
   node tests/adversarial-m2-empirical.mjs
   ```
   *Expected Result*: `EMPIRICAL CHALLENGER RESULTS: 33 PASSED, 0 FAILED` (exit code 0).

2. **Milestone 2 Empirical Deep Verification (7 tests)**:
   ```bash
   node scripts/verify-m2-empirical.mjs
   ```
   *Expected Result*: `Results: 7 passed, 0 failed` (exit code 0).

3. **Full 4-Tier E2E & Boundary Test Suite (77 tests)**:
   ```bash
   node scripts/run-e2e-tests.mjs
   ```
   *Expected Result*: `✔ ALL 77 TESTS PASSED SUCCESSFULLY!` (exit code 0).
