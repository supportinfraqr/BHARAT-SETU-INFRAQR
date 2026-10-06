# Contractor Uploads & File Management Architecture Analysis

## 1. Executive Summary & Scope

The Bharat Shramik Setu (BSS) platform requires a robust, secure, and production-ready document upload and compliance submission pipeline. In the existing prototype:
- The contractor submissions UI at `src/app/contractor/submissions/page.tsx` and worker document/leave modules post multipart form data to `/api/portal/uploads`.
- `/api/portal/uploads/route.ts` contains partial client-type and signature checks, but in `demo` mode it simply hashes file bytes in memory and returns a mock object (`DEMO-...`) without writing to disk or database. In `remote` mode, it proxies requests upstream to an external API URL.
- No local database schema exists yet to record upload metadata, tracking status, or audit trails, and no secure retrieval/download endpoint exists to serve uploaded files back to authorised contractors, principal employers, or BSS staff reviewers.

This document provides a comprehensive technical investigation and implementation blueprint covering:
1. Complete frontend and backend contracts across all 5 upload entry points.
2. High-security multipart parsing, validation (size, MIME, deep magic-byte inspection), and filename sanitization.
3. Private local disk storage architecture (directory structure, permissions, streaming, and atomic writes).
4. Prisma / SQLite database schema models and cross-role lifecycle mapping (Contractor upload -> Employer review -> Verification).
5. Secure file retrieval / streaming endpoints with fine-grained access control and security headers.

---

## 2. Frontend Submissions & Upload Inventory

### 2.1 Contractor Compliance Submissions (`src/app/contractor/submissions/page.tsx`)

#### User Workflow & Interactions
- **Role**: `Contractor`
- **Component Entry**: `ComplianceSubmissionPage` (`src/app/contractor/submissions/page.tsx:21-104`)
- **Key Actions**:
  1. Contractor opens the upload modal via "Upload compliance data" button.
  2. Selects **Employer** from `contractor.employers` (`L&T Construction`, `Shapoorji Pallonji`, etc.).
  3. Selects **Site** filtered by selected employer from `contractor.sites`.
  4. Selects **Document type** from `['PF Challan','ESIC Return','Wage Register','Attendance Register','Safety Audit','Medical & Insurance']`.
  5. Selects **Compliance period** (month picker: `YYYY-MM`, capped at current month).
  6. Selects or drag-and-drops file evidence (`.pdf`, `.jpg`, `.jpeg`, `.png`, max 10MB).
  7. Clicks "Submit for verification".

#### Form Payload Contract
The frontend constructs a `FormData` object with:
```typescript
const form = new FormData();
form.set('employer', selectedEmployer); // e.g. "L&T Construction"
form.set('site', selectedSite);         // e.g. "Mumbai Metro Line 3"
form.set('type', selectedType);         // e.g. "PF Challan"
form.set('period', compliancePeriod);   // e.g. "2026-07"
form.set('file', fileObject);           // File instance
```

#### HTTP Request
- **Endpoint**: `POST /api/portal/uploads`
- **Headers**: Standard browser `multipart/form-data; boundary=...` (credentials/cookie sent automatically)

#### Expected Response Contract
```typescript
type DocumentRow = {
  id: string;                 // Unique identifier e.g. "DOC-2026-0801" or "UPL-..."
  type: string;               // e.g. "PF Challan"
  employer: string;           // e.g. "L&T Construction"
  site: string;               // e.g. "Mumbai Metro Line 3"
  period: string;             // e.g. "2026-07"
  status: string;             // e.g. "Pending review" | "Pending verification" | "Verified" | "Returned"
  submittedAt: string;        // ISO 8601 string e.g. "2026-08-31T12:00:00.000Z"
  fileName?: string;          // e.g. "pf_challan_jul2026.pdf"
  checksum?: string;          // e.g. "sha256:7f83b165..."
};

type UploadApiResponse = {
  data?: DocumentRow;
  error?: string;
};
```

#### Client State Mutation
Upon receiving `result.data`:
```typescript
replaceContractor({
  ...contractor,
  submissions: {
    ...contractor.submissions,
    documents: [result.data, ...contractor.submissions.documents]
  }
});
```

---

### 2.2 Other Upload Callers Across the Application

| Module / Path | Role | Upload Type | Form Fields | Response Usage |
| :--- | :--- | :--- | :--- | :--- |
| `src/app/contractor/salaries/page.tsx:45-58` | Contractor | Wage Proof (`Salary / Wage`) | `type`, `site`, `period`, `file` | Reads `result.data.fileName` and assigns to `ContractorSalaryRecord.fileName` |
| `src/app/contractor/benefits/page.tsx:46-60` | Contractor | Benefit Evidence (`Worker Benefits`) | `type`, `site`, `period`, `file` | Reads `result.data.fileName` and assigns to `ContractorBenefitRecord.fileName` |
| `src/app/worker/Documents/page.tsx:2` | Worker | KYC / Worker Document | `type` (e.g. 'Aadhaar Card'), `site`, `period`, `file` | Updates worker document status to `'Under Verification'` |
| `src/app/worker/Leave/page.tsx:3` | Worker | Leave Attachment (`Leave evidence`) | `type`, `site`, `period`, `file` | Extracts `result.data.id` as `attachmentId` for subsequent `POST /api/portal/leave` |

---

### 2.3 Review & Verification Lifecycle (`src/app/employer/compliance-submission/page.tsx`)

Principal Employers review contractor submissions:
- **Role**: `Employer`
- **Page**: `src/app/employer/compliance-submission/page.tsx`
- **Action**: Employer clicks "Verify" or "Return" on pending submissions.
- **Mutation Contract**:
  - `PATCH /api/portal/submissions` with JSON payload `{ id: row.id, status: 'Verified' | 'Returned' }`.
  - Backend validation in `src/server/portal-validation.ts:142-145`:
    ```typescript
    if (role === 'Employer' && resource === 'submissions' && method === 'PATCH') {
      requiredString(body, 'id', 120);
      if (!['Verified', 'Returned'].includes(String(body.status))) fail('Select a valid submission decision.');
    }
    ```
- **Lifecycle Loop**:
  1. Contractor uploads document -> creates database `Upload` record with status `Pending review`.
  2. Document appears in Contractor submissions table (`/contractor/submissions`) and recent submissions on `/contractor/dashboard`.
  3. Document simultaneously appears in Employer submissions table (`/employer/compliance-submission`) and pending actions counter on `/employer/dashboard`.
  4. Employer reviews and executes `PATCH /api/portal/submissions` -> database record updated to `Verified` or `Returned`.
  5. Both Contractor and Employer interfaces reflect the verified status.

---

## 3. Analysis of Existing Upload Backend (`src/app/api/portal/uploads/route.ts`)

### 3.1 Existing Flow & Safeguards
Currently, `route.ts` provides:
1. `assertTrustedMutation(request)`: Checks `sec-fetch-site` and `origin`.
2. `requireApiSession()`: Validates session cookie, checks role is `'Worker'` or `'Contractor'`.
3. `assertRateLimit(\`uploads:${session.sessionId}\`, 20, 60_000)`: Restricts to 20 uploads/minute.
4. `content-length` check: Rejects if `> 11 * 1024 * 1024` bytes (11 MB).
5. `request.formData()` extraction of `file` and metadata fields (`type`, `site`, `period`, `employer`).
6. Magic-byte signature verification (`hasValidSignature` for PDF, JPEG, PNG).

### 3.2 Critical Gaps to Reach Production Readiness
1. **No Disk Persistence**: In `demo` mode, `Buffer.from(await file.arrayBuffer())` is hashed and discarded. No file is written to local disk storage.
2. **No Database Persistence**: No record is inserted into SQLite/Prisma. On page refresh, newly uploaded submissions disappear or fail to persist.
3. **No File Retrieval Endpoint**: There is no route (e.g. `/api/portal/uploads/[id]` or `/api/portal/uploads/download`) to view or download uploaded evidence.
4. **Missing Directory Security**: No isolated, private `/uploads` or `.data/uploads` directory exists with `0o700` / `0o600` permissions.
5. **No Contractor Identity Association**: In demo mode, employer name defaults to `'Worker self-service'` if missing, but contractor subject ID (`session.subject`) is not linked to employer portal visibility.

---

## 4. File Ingestion, Parsing & Validation Architecture

### 4.1 Request Processing Pipeline
```
[ Incoming HTTP POST ]
         │
         ▼
[ 1. assertTrustedMutation(request) ] ── (Origin & Sec-Fetch-Site Check)
         │
         ▼
[ 2. requireApiSession(['Contractor', 'Worker']) ] ── (Auth & Role Check)
         │
         ▼
[ 3. assertRateLimit(session.sessionId, 20/min) ] ── (Rate Limiting)
         │
         ▼
[ 4. Content-Length Header Guard (<= 11MB) ] ── (Early payload size reject)
         │
         ▼
[ 5. request.formData() Parsing ]
         │
         ▼
[ 6. Field & Format Validation ] ── (type, site, period, employer)
         │
         ▼
[ 7. File Size & MIME Whitelist Guard (<= 10MB; PDF/JPEG/PNG) ]
         │
         ▼
[ 8. Binary Magic-Byte Inspection ] ── (Verify actual file header bytes)
         │
         ▼
[ 9. Filename Sanitization & UUID Storage Path Generation ]
         │
         ▼
[ 10. Atomic Disk Streaming & SHA-256 Checksum Calculation ]
         │
         ▼
[ 11. Prisma / SQLite Transaction (Insert Upload & Submission records) ]
         │
         ▼
[ 12. HTTP 201 Response with Standard DocumentRow Schema ]
```

### 4.2 Strict Binary Magic-Number Verification
Client MIME types in `file.type` can easily be forged. Magic-byte verification must be strictly enforced:

```typescript
export async function verifyFileSignature(file: File): Promise<{ valid: boolean; detectedMime: string | null }> {
  // Read first 16 bytes for header signatures
  const headerBytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());

  // PDF check: %PDF- (0x25 0x50 0x44 0x46 0x2D)
  if (
    file.type === 'application/pdf' &&
    headerBytes[0] === 0x25 &&
    headerBytes[1] === 0x50 &&
    headerBytes[2] === 0x44 &&
    headerBytes[3] === 0x46 &&
    headerBytes[4] === 0x2D
  ) {
    return { valid: true, detectedMime: 'application/pdf' };
  }

  // JPEG check: 0xFF 0xD8 0xFF
  if (
    (file.type === 'image/jpeg' || file.type === 'image/jpg') &&
    headerBytes[0] === 0xFF &&
    headerBytes[1] === 0xD8 &&
    headerBytes[2] === 0xFF
  ) {
    return { valid: true, detectedMime: 'image/jpeg' };
  }

  // PNG check: 0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A
  if (
    file.type === 'image/png' &&
    headerBytes[0] === 0x89 &&
    headerBytes[1] === 0x50 &&
    headerBytes[2] === 0x4E &&
    headerBytes[3] === 0x47 &&
    headerBytes[4] === 0x0D &&
    headerBytes[5] === 0x0A &&
    headerBytes[6] === 0x1A &&
    headerBytes[7] === 0x0A
  ) {
    return { valid: true, detectedMime: 'image/png' };
  }

  return { valid: false, detectedMime: null };
}
```

### 4.3 Filename Sanitization & Path Traversal Prevention
1. **Never use user-supplied names as filesystem paths**: User-supplied filenames may contain directory traversal sequences (`../../`), null bytes (`\0`), control characters, or executable extensions.
2. **Dual-name storage strategy**:
   - `originalFileName`: Sanitized version of user's declared name (for download display).
   - `storageFileName`: System-generated collision-free name e.g. `${uploadId}.${extension}`.
3. **Sanitization implementation**:
   ```typescript
   export function sanitizeFileName(rawName: string): { safeDisplayName: string; safeExtension: string } {
     const base = path.basename(rawName).trim();
     const ext = path.extname(base).toLowerCase();
     const validExts: Record<string, string> = {
       '.pdf': '.pdf',
       '.jpg': '.jpg',
       '.jpeg': '.jpeg',
       '.png': '.png',
     };
     const safeExt = validExts[ext] ?? '.bin';
     const nameWithoutExt = base.slice(0, base.length - ext.length);
     const safeStem = nameWithoutExt
       .replace(/[\u0000-\u001f\u007f/\\?%*:|"<>]/g, '_')
       .replace(/\s+/g, '_')
       .slice(0, 120) || 'document';
     return {
       safeDisplayName: `${safeStem}${safeExt}`,
       safeExtension: safeExt,
     };
   }
   ```

---

## 5. Local Disk Storage Architecture

### 5.1 Directory Layout & Permission Strategy
- **Location**: Private storage directory outside web-accessible roots:
  - Default: `path.join(process.cwd(), '.data', 'uploads')` (configurable via `BSS_UPLOADS_DIR` env).
  - Never placed inside `public/` or `src/app/`.
- **Directory Hierarchy**:
  ```
  .data/uploads/
  ├── tmp/                              # Temporary streaming chunks
  ├── contractor/
  │   └── 2026/
  │       └── 08/
  │           └── UPL-20260831-abc123.pdf
  └── worker/
      └── 2026/
          └── 08/
              └── UPL-20260831-xyz789.png
  ```
- **Filesystem Permissions**:
  - Directories: `0o700` (`rwx------`) — only the Node.js server process owner can traverse or list.
  - Files: `0o600` (`rw-------`) — only the Node.js server process owner can read/write.

### 5.2 Atomic Write & Checksum Pipeline
```typescript
import { createHash } from 'node:crypto';
import { mkdir, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

export async function saveUploadedFileToDisk(
  file: File,
  role: string,
  uploadId: string,
  safeExtension: string
): Promise<{ storagePath: string; checksumSha256: string; fileSizeBytes: number }> {
  const uploadsBase = process.env.BSS_UPLOADS_DIR ?? path.join(process.cwd(), '.data', 'uploads');
  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, '0');
  
  const targetDir = path.join(uploadsBase, role.toLowerCase(), year, month);
  const tmpDir = path.join(uploadsBase, 'tmp');
  
  await mkdir(targetDir, { recursive: true, mode: 0o700 });
  await mkdir(tmpDir, { recursive: true, mode: 0o700 });

  const finalFileName = `${uploadId}${safeExtension}`;
  const finalStoragePath = path.join(targetDir, finalFileName);
  const tmpStoragePath = path.join(tmpDir, `${uploadId}.${process.pid}.${Date.now()}.tmp`);

  const buffer = Buffer.from(await file.arrayBuffer());
  const hash = createHash('sha256').update(buffer).digest('hex');
  const checksumSha256 = `sha256:${hash}`;

  try {
    // Write atomically to tmp, then rename
    await writeFile(tmpStoragePath, buffer, { mode: 0o600 });
    await rename(tmpStoragePath, finalStoragePath);
  } catch (error) {
    await unlink(tmpStoragePath).catch(() => undefined);
    throw error;
  }

  return {
    storagePath: finalStoragePath,
    checksumSha256,
    fileSizeBytes: buffer.byteLength,
  };
}
```

---

## 6. Database Schema & Metadata Recording (Prisma / SQLite)

### 6.1 Proposed Prisma Schema (`prisma/schema.prisma`)

```prisma
model Upload {
  id               String    @id @default(cuid())
  uploadId         String    @unique // e.g. "UPL-20260831-xxxx" or "DOC-xxxx"
  role             String    // 'Contractor' | 'Worker'
  uploadedBy       String    // session.subject e.g. "BSSC198200000001" or "BSS234567890124"
  contractorId     String?   // BSS ID of contractor
  contractorName   String?   // Company name of contractor
  employerName     String?   // Principal employer name e.g. "L&T Construction"
  employerId       String?   // Principal employer ID e.g. "BSSE100210000001"
  siteName         String    // Site name e.g. "Mumbai Metro Line 3"
  siteId           String?   // Optional site code / ID
  documentType     String    // 'PF Challan', 'ESIC Return', 'Wage Register', etc.
  compliancePeriod String    // '2026-07'
  originalFileName String    // Original safe filename e.g. "pf_challan.pdf"
  storagePath      String    // Absolute disk path on server
  mimeType         String    // 'application/pdf', 'image/jpeg', 'image/png'
  fileSizeBytes    Int
  checksumSha256   String    // 'sha256:xxxx'
  status           String    @default("Pending review") // 'Pending review' | 'Verified' | 'Returned'
  submittedAt      DateTime  @default(now())
  reviewedBy       String?   // Subject ID of employer reviewer
  reviewedAt       DateTime?
  reviewComment    String?
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt

  @@index([uploadedBy])
  @@index([employerName])
  @@index([status])
  @@index([compliancePeriod])
}
```

### 6.2 Full Data Life-Cycle Flow
1. **Contractor Uploads (`POST /api/portal/uploads`)**:
   - Stores file on disk at `.data/uploads/contractor/YYYY/MM/${uploadId}.pdf`.
   - Inserts record into `Upload` table in SQLite.
   - Responds with:
     ```json
     {
       "data": {
         "id": "UPL-20260831-001",
         "type": "PF Challan",
         "employer": "L&T Construction",
         "site": "Mumbai Metro Line 3",
         "period": "2026-07",
         "status": "Pending review",
         "submittedAt": "2026-08-31T12:30:00.000Z",
         "fileName": "pf_challan_july.pdf",
         "checksum": "sha256:7f83b165..."
       }
     }
     ```
2. **Contractor Queries Portal (`GET /api/portal` with role `Contractor`)**:
   - `getContractorPortal(session)` queries `Upload` table where `uploadedBy = session.subject` or `contractorId = session.subject`.
   - Populates `contractor.submissions.documents`.
3. **Employer Queries Portal (`GET /api/portal` with role `Employer`)**:
   - `getEmployerPortal(session)` queries `Upload` table where `employerName = employer.identity.company` or `employerId = session.subject`.
   - Populates `employer.submissions` with `EmployerSubmission` objects:
     ```typescript
     {
       id: upload.id,
       contractor: upload.contractorName ?? upload.uploadedBy,
       contractorId: upload.contractorId ?? upload.uploadedBy,
       site: upload.siteName,
       type: upload.documentType,
       period: upload.compliancePeriod,
       submittedAt: upload.submittedAt.toISOString(),
       status: upload.status
     }
     ```
4. **Employer Reviews Submission (`PATCH /api/portal/submissions`)**:
   - Payload: `{ id: "UPL-20260831-001", status: "Verified" }`.
   - Handler updates `Upload` record: `status = "Verified"`, `reviewedBy = session.subject`, `reviewedAt = new Date()`.
   - Both Contractor and Employer portals immediately reflect updated verification status.

---

## 7. Secure File Retrieval & Download Endpoint

### 7.1 Proposed Endpoint Design: `GET /api/portal/uploads/[id]`
To allow contractors, principal employers, and authorized staff to view uploaded documents:

```typescript
// src/app/api/portal/uploads/[id]/route.ts
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { NextResponse } from 'next/server';
import { apiError } from '@/server/api';
import { requireApiSession } from '@/server/session';
import { prisma } from '@/server/db'; // or SQLite storage module

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const session = await requireApiSession();
    const { id } = await context.params;

    const record = await prisma.upload.findUnique({ where: { id } });
    if (!record) return NextResponse.json({ error: 'Document not found.' }, { status: 404 });

    // Authorization Matrix
    const isOwner = record.uploadedBy === session.subject;
    const isTargetEmployer = session.role === 'Employer' && record.employerId === session.subject;
    const isStaffOrGov = ['BSS Staff', 'IT Help Desk', 'Government'].includes(session.role);

    if (!isOwner && !isTargetEmployer && !isStaffOrGov) {
      return NextResponse.json({ error: 'You are not authorised to access this document.' }, { status: 403 });
    }

    const fileStat = await stat(record.storagePath).catch(() => null);
    if (!fileStat || !fileStat.isFile()) {
      return NextResponse.json({ error: 'Document file is missing from storage.' }, { status: 404 });
    }

    // Node ReadStream to Web ReadableStream
    const nodeStream = createReadStream(record.storagePath);
    const webStream = Readable.toWeb(nodeStream) as ReadableStream;

    return new Response(webStream, {
      status: 200,
      headers: {
        'Content-Type': record.mimeType,
        'Content-Length': String(fileStat.size),
        'Content-Disposition': `inline; filename="${encodeURIComponent(record.originalFileName)}"`,
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'; sandbox",
        'Cache-Control': 'private, no-store, max-age=0',
      },
    });
  } catch (error) {
    return apiError(error, 'Document could not be retrieved.');
  }
}
```

---

## 8. Summary of Findings & Actionable Recommendations

| Domain | Current State | Target Production Architecture |
| :--- | :--- | :--- |
| **Parsing** | `request.formData()` with in-memory parsing | Preserved `request.formData()` with strict size caps and sanitization |
| **Validation** | Basic extension & 8-byte magic checks | Deep 16-byte magic checks + content-type strict whitelist + field bounds |
| **Storage** | In-memory hash in demo mode; upstream proxy | Private `.data/uploads` storage with `0o700`/`0o600` permissions and atomic rename |
| **Database** | Mock in-memory arrays in `demo-data.ts` | SQLite / Prisma `Upload` table with cross-role queries and state persistence |
| **Lifecycle** | Disconnected mock responses | Unified lifecycle: Contractor uploads -> Employer reviews -> Verified in both portals |
| **Retrieval** | No file download/view endpoint | Secure `GET /api/portal/uploads/[id]` with role-based ACL and stream headers |

This provides a complete, clear, and unambiguous blueprint for implementing the Contractor Uploads feature.
