# Backend Architecture & Data Store Survey: SQLite + Prisma Migration

**Project:** Bharat Shram Setu (BSS) Next.js Platform  
**Author:** Backend Data Explorer (`teamwork_preview_explorer`)  
**Date:** 2026-08-31  
**Status:** Completed Investigation  

---

## 1. Executive Summary

The Bharat Shram Setu (BSS) platform currently operates with an in-memory simulation layer (`demoStore()` in `src/server/operations.ts` and static fixtures in `src/server/demo-data.ts`, `src/data/workerPortalData.ts`, `src/data/governmentData.ts`). While client routes and contexts for all six roles (`Worker`, `Contractor`, `Employer`, `IT Help Desk`, `BSS Staff`, `Government`) are functionally connected to backend API routes (`/api/portal`, `/api/portal/[resource]`, `/api/portal/uploads`, `/api/operations`, `/api/notifications`, `/api/auth/*`), state changes are either lost on memory flush or simulated through ephemeral UUIDs without persistence.

This document details the complete backend data architecture, models, relationships, API contract mappings, file upload pipelines, seed data requirements, and Prisma + SQLite schema specifications required to transform BSS into a fully persistent, production-grade local database system.

---

## 2. Codebase Inventory & Current State Analysis

### 2.1 Backend Server Modules (`src/server/`)

| File Path | Line Count | Key Responsibilities & Observations | Current Limitations |
|---|---|---|---|
| `src/server/operations.ts` | 217 | Manages `OperationsStore` (`services`, `logs`, `tickets`, `cases`). Handles `getOperationsSnapshot()` and `performOperationsAction()`. Provides terminal commands (`help`, `health`, `services`, `queues`, `sessions`, `bindings`, `probe`, `retry-binding`). | Stored on `globalThis.__bssOperationsStore` (in-memory only). Data resets on server restart. No real disk or DB writes. |
| `src/server/portal.ts` | 65 | Role data aggregation for `Worker`, `Contractor`, `Employer`, `Government`. Handles `mutatePortal()` for `card-orders`, `leave`, `grievances`, `benefits`, `salaries`, `workers`, `compliances`. | In `demo` mode, returns structured clones of static variables. Mutations synthesize fake IDs (`DEMO-LEAVE-...`) and return them without updating any store. |
| `src/server/demo-data.ts` | 298 | Defines monolithic fixtures: `demoWorkerPortal`, `demoContractorPortal`, `demoEmployerPortal`. | Hardcoded static TypeScript objects; modifications by users do not persist. |
| `src/server/portal-validation.ts` | 147 | Validates mutation payloads for 13 resources across roles (`availability`, `applications`, `leave`, `workers`, `compliances`, `salaries`, `gate-passes`, `benefits`, `job-postings`, `contractors`, `sites`, `approvals`, `submissions`). | Robust runtime validation, already enforces exact boundaries, regexes, and bounds. Ready for DB direct hookup. |
| `src/server/auth.ts` | 49 | `authenticate()` and `requestOtp()` for 6 roles. In demo mode, checks fixed credentials (`123456` OTP, `1234` MPIN/password) and maps fixed subjects (`BSS234567890124`, `BSSC198200000001`, `BSSE100210000001`, `BSSIT2026HDK00001`, `BSSST2026STF00001`, `BSSGOV2026ADM00001`). | Auth subjects are hardcoded; newly registered workers cannot authenticate with persistent passwords/MPINs. |
| `src/server/session.ts` | 78 | AES-256-GCM encrypted cookie session (`bss_session` / `__Host-bss_session`). Enforces 8-hour TTL, role verification, and subject extraction. | Secure and production-ready. Interoperates seamlessly with SQLite session/user records. |
| `src/server/config.ts` | 48 | Environment variable loader (`BSS_DATA_MODE`, `BSS_API_BASE_URL`, `BSS_SESSION_SECRET`, etc.). | `BSS_DATA_MODE` defaults to `demo`. Must support local SQLite mode cleanly. |
| `src/server/api.ts` | 59 | Helper functions: `apiError`, `readJsonObject`, `assertTrustedMutation` (CSRF/Origin protection), `assertRateLimit` (token bucket in memory). | Production-ready security controls. |
| `src/server/http.ts` | 39 | `upstreamRequest()` client with timeout and correlation ID injection for remote mode. | Retained for hybrid/remote mode. |
| `src/server/role-path.ts` | 17 | Maps `PortalRole` enum to URL slugs (`worker`, `contractor`, `employer`, `it-helpdesk`, `bss-staff`, `government`). | Well-defined. |

### 2.2 Core API Route Inventory (`src/app/api/`)

| Route | Methods | Handler Purpose | Current Persistence Mechanism | Target SQLite Integration |
|---|---|---|---|---|
| `/api/auth/register` | `POST` | Worker registration with OTP verification, Verhoeff BSS-ID generation, and cookie session creation. | Uses file lock registry (`.data/bss-identities.json`) via `issueBssId`. | Create `WorkerProfile` and `User` records in SQLite, maintain Verhoeff BSS-ID generation. |
| `/api/auth/session` | `GET`, `POST`, `DELETE` | Login validation, OTP request challenge, session deletion (logout). | In-memory check against fixed credentials in `src/server/auth.ts`. | Authenticate against SQLite `User` / `WorkerProfile` / `ContractorProfile` / `EmployerProfile` records. |
| `/api/portal` | `GET` | Consolidated portal data fetch based on active session role. | Returns static objects from `portal.ts`. | Queries Prisma for complete aggregated role graph. |
| `/api/portal/[resource]` | `POST`, `PATCH`, `DELETE` | Role-based CRUD operations for portal resources (`profile`, `leave`, `grievances`, `salaries`, `benefits`, `compliances`, `gate-passes`, `sites`, `contractors`, `approvals`, `applications`, `submissions`, `settings`). | Generates fake demo responses with random UUIDs. | Executes transactional Prisma mutations against SQLite. |
| `/api/portal/uploads` | `POST` | Handles multipart form uploads for contractor compliance evidence and worker documents. | Validates magic bytes and computes sha256 checksum, but returns fake ID without writing file to disk. | **Requirement R2:** Writes file to private disk (`./uploads/`), records metadata + checksum in SQLite `DocumentSubmission` table. |
| `/api/operations` | `GET`, `POST` | Serves IT Help Desk & BSS Staff snapshot (`GET`) and handles actions (`POST`: `command`, `probe-service`, `ticket`, `case`). | In-memory `demoStore()` mutation. | **Requirement R4:** Queries and updates `OperationsService`, `OperationsTicket`, `SupportCase`, and inserts audit entries into `OperationsLog`. |
| `/api/card-orders` | `POST` | Worker BSS Smart Card ordering with address verification. | Mock response. | Records card order in `CardOrder` table and emits notification. |
| `/api/notifications` | `GET`, `PATCH` | Role notification feed and read/resolve status updates. | Static seeds in `src/lib/notifications.ts`. | Reads from and updates SQLite `Notification` table. |
| `/api/worker/profile` | `GET` | Fetches sanitized worker profile for current worker. | Reads static worker object. | Queries `WorkerProfile` by `session.subject`. |
| `/api/worker/profile/mobility` | `PUT` | Validates & normalizes worker address/mobility data. | Formats and returns mock payload. | Updates address and mobility fields on `WorkerProfile`. |
| `/api/identity/verify/[bssId]` | `GET` | QR identity verification endpoint for public & scanners. | Compares against static demo strings. | Queries `WorkerProfile` or `ContractorProfile` in SQLite, applying permission masking. |
| `/api/geography` | `GET` | PIN code / district / city lookup. | Reads static JSON in `workerPortalData.ts`. | Retains postal reference dictionary or serves from DB. |
| `/api/health` | `GET` | Platform health and environment configuration checks. | Checks env config. | Includes SQLite connection check in response. |

---

## 3. Comprehensive Data Model & Entity Specifications

The system spans 6 roles with shared and role-specific entities. Below is the relational architecture required for full fidelity:

```
                                  +-------------------+
                                  |    EcsBinding     |
                                  |  (E | C | S | W)  |
                                  +---------+---------+
                                            |
                  +-------------------------+-------------------------+
                  |                         |                         |
                  v                         v                         v
        +-------------------+     +-------------------+     +-------------------+
        |  EmployerProfile  |     | ContractorProfile |     |   WorkerProfile   |
        | (BSSE100210000001)|     | (BSSC198200000001)|     | (BSS234567890124) |
        +---------+---------+     +---------+---------+     +---------+---------+
                  |                         |                         |
                  |                         |                         |
                  v                         v                         v
        +-------------------+     +-------------------+     +-------------------+
        |       Site        |     |   WorkerBenefits  |     |   WageRecord /    |
        |  (SITE-001, etc.) |     | (Bonus, Encashment|     | AttendanceRecord  |
        +-------------------+     +-------------------+     +-------------------+
                  |                         |                         |
                  +------------+------------+-------------------------+
                               |
                               v
                     +--------------------+
                     | DocumentSubmission |
                     |  & File Storage    |
                     +--------------------+
```

### 3.1 Entity Breakdown by Domain

#### A. Worker Domain
1. **`WorkerProfile`**: Primary record containing `bssId` (Unique 15-char Verhoeff string), personal details, banking info, employment status, compliance summary, skills, social security IDs (EPFO UAN, ESIC IP, e-Shram, BOCW), preferences, availability flag, and gratuity calculations.
2. **`WorkerDocument`**: Document tracking (`Aadhaar`, `PAN`, `Bank Passbook`, `Photo`, `Signature`, `Medical Certificate`, `Gate Pass`) with status (`Verified`, `Missing`, `Under Verification`, `Expired`), mandatory flag, owner (`Worker` | `Contractor` | `System`), file URL, and storage path.
3. **`WageRecord`**: Monthly wage credit history (`gross`, `deductions`, `net`, `period`, `paidOn`, `status`, `reference`, `receiptUrl`).
4. **`AttendanceRecord`**: Daily punch logs (`date`, `presence`, `shift`, `site`, `checkIn`, `checkOut`, `status`).
5. **`ProvidentFundRecord`**: EPFO monthly contributions (`employeeContribution`, `employerContribution`, `creditedOn`).
6. **`BonusRecord`**: Performance/attendance bonuses (`period`, `reason`, `amount`, `paidOn`, `status`).
7. **`LeaveEncashmentRecord`**: Unutilized leave encashments (`period`, `days`, `rate`, `amount`, `paidOn`, `status`).
8. **`LeaveRecord`**: Worker leave requests (`type`, `fromDate`, `toDate`, `reason`, `attachmentId`, `submittedAt`, `status`, `approver`, `comment`).
9. **`Grievance`**: Worker dispute and grievance filings (`category`, `subject`, `description`, `status`, `submittedAt`, `updatedAt`, `attachmentId`).
10. **`JobRequest`**: Incoming job requests from employers/contractors (`designation`, `wage`, `facilities`, `status`).
11. **`CardOrder`**: Smart physical identity card orders (`requestId`, `provider`, `address`, `amount`, `status`, `checkoutUrl`).
12. **`WorkerCourseProgress`**: Learning module completions and progress tracking.

#### B. Contractor Domain
1. **`ContractorProfile`**: Organization identity (`bssId` starting with `BSSC`, company name, entity type, rating, contact, registration CIN/PAN/GSTIN/EPFO/ESIC).
2. **`ContractorEmployerBinding`**: Authorized bindings between Contractor and Principal Employers.
3. **`ContractorWorker` / `WorkerAssignment`**: Workers managed by the contractor on designated sites with compliance and verification statuses.
4. **`ComplianceRecord`**: Statutory and site compliances (`item`, `category`, `reference`, `employer`, `site`, `worker`, `issueDate`, `expiryDate`, `verificationStatus`, `status`).
5. **`ComplianceReport`**: Monthly statutory compliance summaries (PF challans, ESIC returns, Wage registers).
6. **`GatePass`**: Site gate passes issued to workers (`Temporary` | `Permanent`, valid date ranges, status).
7. **`SalaryRecord`**: Uploaded wage register entries (`gross`, `deductions`, `net`, `period`, `paidOn`, `fileName`, `fileUrl`, `status`).
8. **`ContractorBenefitRecord`**: Contractor-submitted bonus and leave encashment payouts for workers.
9. **`RozgarApplication`**: Worker job applications received through the platform.
10. **`JobPosting`**: Job vacancies published by contractors for specific sites.

#### C. Employer Domain
1. **`EmployerProfile`**: Principal employer identity (`bssId` starting with `BSSE`, company name, registered address, CIN, PAN, GSTIN, EPFO Est ID).
2. **`Site`**: Infrastructure & project worksites (`code`, `name`, `location`, `state`, `startDate`, `endDate`, `status`, `details` JSON).
3. **`EmployerApproval`**: Approval queue for contractor onboarding and worker site allocation.
4. **`EmployerUser`**: Enterprise admin users, site managers, compliance officers, and viewers.
5. **`EmployerPermissionRole`**: RBAC definitions and module permissions.
6. **`EmployerAudit`**: Administrative audit log for employer-level actions.
7. **`EmployerRoute`**: Transport and crew bus route management.
8. **`EmployerActivity`**: Feed of recent employer events.
9. **`EmployerLabourCompliance`**: Evaluation of the 10 statutory labor compliance rules.

#### D. IT Help Desk & Operations Domain (Requirement R4)
1. **`OperationsService`**: Service health tracking (`identity`, `portal`, `benefits`, `otp`, `voice`, `notifications`) with host, state (`Operational`, `Degraded`, `Outage`, `Maintenance`), latency (ms), uptime (%), and last checked timestamp.
2. **`OperationsTicket`**: Incidents and service requests (`id` e.g. `INC-2026-081`, `title`, `service`, `priority` P1-P4, `status` Open/In progress/Monitoring/Resolved/Escalated, `assignee`, timestamps).
3. **`OperationsLog`**: Live application operational logs (`level` info/warning/error/audit, `source`, `message`, `correlationId`, `timestamp`).
4. **`OperationsCommandAudit`**: Audit trail of commands executed in the restricted terminal.

#### E. BSS Staff Workbench Domain (Requirement R4)
1. **`SupportCase`**: Unified case queue (`id` e.g. `BC-1039`, `DOC-2048`, `DSP-201`, `WRK-881`, `type` Binding/Document/Dispute/Worker record, `subject`, `party`, `owner`, `priority` Urgent/High/Normal/Low, `status` Open/In progress/Waiting for evidence/Resolved/Escalated, `assignee`, `summary`, timestamps).

#### F. Government Analytics Domain
1. **`GovernmentWorker`**: Demographic, geographic, and statutory linkage records (108+ records across 12 states) powering the dynamic policy dashboard filters and distributions.

#### G. Cross-Cutting & Storage Domain (Requirement R2)
1. **`DocumentSubmission`**: Uploaded evidence files (PF Challan, ESIC Return, Wage Register, Medical Certificate, Leave Evidence) with metadata, storage path (`./uploads/...`), mime type, file size, sha256 checksum, and verification status.
2. **`Notification`**: System notifications for all 6 roles with action routing and read/resolve flags.
3. **`EcsBinding`**: Formal `E-C-S-W` hierarchical consent tuples (`employerId`, `contractorId`, `siteId`, `workerId`, `tuple`, `state`, `consent` JSON).

---

## 4. Prisma Schema Architecture (`prisma/schema.prisma`)

Below is the concrete schema definition tailored for SQLite:

```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// ---------------------------------------------------------
// User & Authentication
// ---------------------------------------------------------
model User {
  id           String   @id @default(cuid())
  subject      String   @unique // BSS ID (Worker, Contractor, Employer, Staff, IT, Gov)
  role         String   // Worker, Contractor, Employer, IT Help Desk, BSS Staff, Government
  contact      String?  // Mobile number or Email
  mpinHash     String?
  passwordHash String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

// ---------------------------------------------------------
// Worker Domain
// ---------------------------------------------------------
model WorkerProfile {
  id                     String    @id @default(cuid())
  bssId                  String    @unique
  name                   String
  category               String    @default("Construction Worker")
  dob                    String?
  gender                 String?
  photoUrl               String?   @default("/worker-profile.png")
  aadhaar                String?
  pan                    String?
  aadhaarVerified        Boolean   @default(false)
  panVerified            Boolean   @default(false)
  
  // Employment Details
  employmentStatus       String    @default("Active")
  employerName           String?
  contractorName         String?
  siteName               String?
  department             String?
  designation            String?
  doj                    String?
  shift                  String?   @default("General")
  
  // Compliance
  siteInduction          Boolean   @default(false)
  ppeIssued              String    @default("[]") // JSON string array
  policeVerification     String    @default("Under Process")
  permanentGatePass      String    @default("Pending Approval")
  medicalFitnessDaysLeft Int       @default(0)
  
  // Skills & Social Security
  skillsJson             String    @default("{}") // JSON for primary, secondary, cert
  epfoUan                String?
  esicIp                 String?
  eShramLinked           Boolean   @default(false)
  bocwRegistered         Boolean   @default(false)
  
  // Contact & Address
  mobile                 String?
  alternateMobile        String?
  email                  String?
  preferredLanguage      String    @default("Hindi")
  preferredChannel       String    @default("SMS")
  
  currentAddress         String?
  currentState           String?
  currentDistrict        String?
  currentCity            String?
  currentPin             String?
  
  permanentAddress       String?
  permanentState         String?
  permanentDistrict      String?
  permanentCity          String?
  permanentPin           String?
  
  migrant                Boolean   @default(false)
  migrationType          String    @default("Non-Migrant / Local")
  
  // Personal & Banking
  personalJson           String    @default("{}") // Marital, BloodGroup, Parents, etc.
  bankingJson            String    @default("{}") // BankName, Account, IFSC, verified
  preferencesJson        String    @default("{}") // Photo, data sharing, accessibility
  
  availability           Boolean   @default(false)
  gratuityJson           String    @default("{}")
  
  createdAt              DateTime  @default(now())
  updatedAt              DateTime  @updatedAt

  // Relationships
  documents              WorkerDocument[]
  wages                  WageRecord[]
  attendance             AttendanceRecord[]
  pfRecords              ProvidentFundRecord[]
  bonuses                BonusRecord[]
  leaveEncashments       LeaveEncashmentRecord[]
  leaves                 LeaveRecord[]
  grievances             Grievance[]
  jobRequests            JobRequest[]
  cardOrders             CardOrder[]
}

model WorkerDocument {
  id             String        @id @default(cuid())
  workerBssId    String
  name           String
  mandatory      Boolean       @default(false)
  owner          String        @default("Worker") // Worker, Contractor, System
  status         String        @default("Missing") // Verified, Missing, Under Verification, Expired, Rejected
  date           String?
  downloadUrl    String?
  storagePath    String?
  worker         WorkerProfile @relation(fields: [workerBssId], references: [bssId], onDelete: Cascade)
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt

  @@index([workerBssId])
}

model WageRecord {
  id             String        @id @default(cuid())
  workerBssId    String
  period         String
  paidOn         String
  employer       String
  contractor     String
  site           String
  basis          String        @default("Monthly")
  gross          Float
  deductions     Float
  net            Float
  status         String        @default("Credited") // Credited, Processing, Failed
  reference      String?
  receiptUrl     String?
  worker         WorkerProfile @relation(fields: [workerBssId], references: [bssId], onDelete: Cascade)
  createdAt      DateTime      @default(now())

  @@index([workerBssId])
}

model AttendanceRecord {
  id             String        @id @default(cuid())
  workerBssId    String
  date           String
  presence       String        // Present, Absent, Leave, Holiday, Weekly Off
  shift          String?       @default("General")
  site           String
  checkIn        String?
  checkOut       String?
  status         String        @default("On time") // On time, Late, Half Day, Recorded
  worker         WorkerProfile @relation(fields: [workerBssId], references: [bssId], onDelete: Cascade)
  createdAt      DateTime      @default(now())

  @@index([workerBssId, date])
}

model ProvidentFundRecord {
  id                   String        @id @default(cuid())
  workerBssId          String
  period               String
  employeeContribution Float
  employerContribution Float
  creditedOn           String
  worker               WorkerProfile @relation(fields: [workerBssId], references: [bssId], onDelete: Cascade)
  createdAt            DateTime      @default(now())

  @@index([workerBssId])
}

model BonusRecord {
  id             String        @id @default(cuid())
  workerBssId    String
  period         String
  reason         String
  amount         Float
  paidOn         String
  status         String        @default("Credited")
  worker         WorkerProfile @relation(fields: [workerBssId], references: [bssId], onDelete: Cascade)
  createdAt      DateTime      @default(now())

  @@index([workerBssId])
}

model LeaveEncashmentRecord {
  id             String        @id @default(cuid())
  workerBssId    String
  period         String
  days           Int
  rate           Float
  amount         Float
  paidOn         String
  status         String        @default("Credited")
  worker         WorkerProfile @relation(fields: [workerBssId], references: [bssId], onDelete: Cascade)
  createdAt      DateTime      @default(now())

  @@index([workerBssId])
}

model LeaveRecord {
  id             String        @id @default(cuid())
  workerBssId    String
  type           String
  fromDate       String
  toDate         String
  reason         String
  attachmentId   String?
  submitted      String
  status         String        @default("Pending") // Pending, Approved, Rejected, Cancelled
  approver       String?
  comment        String?
  worker         WorkerProfile @relation(fields: [workerBssId], references: [bssId], onDelete: Cascade)
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt

  @@index([workerBssId])
}

model Grievance {
  id             String        @id @default(cuid())
  workerBssId    String
  category       String
  subject        String
  description    String
  status         String        @default("Submitted") // Submitted, Under Review, In Progress, Resolved
  attachmentId   String?
  submittedAt    DateTime      @default(now())
  updatedAt      DateTime      @updatedAt
  worker         WorkerProfile @relation(fields: [workerBssId], references: [bssId], onDelete: Cascade)

  @@index([workerBssId])
}

model JobRequest {
  id             String        @id @default(cuid())
  workerBssId    String
  employer       String
  contractor     String
  site           String
  designation    String
  wage           Float
  currency       String        @default("INR")
  payPeriod      String        @default("month")
  duration       String
  facilities     String        @default("[]") // JSON string array
  status         String        @default("Pending") // Pending, Accepted, Rejected, Expired
  dateReceived   String
  worker         WorkerProfile @relation(fields: [workerBssId], references: [bssId], onDelete: Cascade)
  createdAt      DateTime      @default(now())

  @@index([workerBssId])
}

model CardOrder {
  id               String        @id @default(cuid())
  requestId        String        @unique
  workerBssId      String
  provider         String        // razorpay, payu
  amount           Float         @default(19900)
  deliveryAddress  String        // JSON object
  addressConfirmed Boolean       @default(false)
  status           String        @default("awaiting_payment") // awaiting_payment, paid, processing, dispatched
  checkoutUrl      String?
  createdAt        DateTime      @default(now())
  worker           WorkerProfile @relation(fields: [workerBssId], references: [bssId], onDelete: Cascade)

  @@index([workerBssId])
}

// ---------------------------------------------------------
// Contractor Domain
// ---------------------------------------------------------
model ContractorProfile {
  id             String   @id @default(cuid())
  bssId          String   @unique
  name           String
  company        String
  incorpDate     String?
  entity         String   @default("Private Limited Company")
  verified       Boolean  @default(true)
  rating         Float    @default(4.8)
  contact        String?
  email          String?
  profileSections String  @default("{}") // JSON string
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}

model ContractorWorkerAssignment {
  id             String   @id @default(cuid())
  contractorBssId String
  workerBssId    String
  name           String
  mobile         String
  site           String
  employer       String
  designation    String
  doj            String
  compliance     String   @default("Compliant") // Compliant, Expiring, Non-compliant
  status         String   @default("Active") // Active, Inactive
  verified       Boolean  @default(true)
  attendance     Int      @default(95)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([contractorBssId])
  @@index([workerBssId])
}

model ComplianceRecord {
  id             String   @id @default(cuid())
  contractorBssId String?
  item           String
  category       String
  reference      String
  employer       String
  site           String
  worker         String?
  issueDate      String
  expiryDate     String
  verification   String   @default("Pending") // Verified, Pending, Rejected
  status         String   @default("Active")  // Active, Expiring, Expired
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([contractorBssId])
  @@index([site])
}

model GatePass {
  id             String   @id @default(cuid())
  workerName     String
  workerId       String
  contractor     String?
  employer       String
  site           String
  siteId         String?
  type           String   // Permanent, Temporary
  requestedAt    DateTime @default(now())
  validFrom      String
  validTo        String
  status         String   @default("Pending") // Pending, Approved, Rejected
  updatedAt      DateTime @updatedAt

  @@index([workerId])
  @@index([site])
}

model ContractorBenefitRecord {
  id             String   @id @default(cuid())
  contractorBssId String
  type           String   // bonus, leaveEncashment
  worker         String
  workerId       String
  employer       String
  period         String
  amount         Float
  days           Int?
  reason         String?
  paidOn         String
  fileName       String?
  fileUrl        String?
  status         String   @default("Pending verification")
  source         String   @default("contractor")
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([contractorBssId])
}

model SalaryRecord {
  id             String   @id @default(cuid())
  contractorBssId String
  worker         String
  workerId       String
  employer       String
  site           String
  period         String
  gross          Float
  deductions     Float
  net            Float
  paidOn         String
  fileName       String?
  fileUrl        String?
  status         String   @default("Pending verification")
  source         String   @default("contractor")
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([contractorBssId])
}

model RozgarApplication {
  id             String   @id @default(cuid())
  contractorBssId String?
  workerName     String
  workerId       String
  employer       String
  trade          String
  experience     String
  expectedWage   Float
  location       String
  status         String   @default("Pending") // Pending, Shortlisted, Hired, Rejected
  dateApplied    String
  matchScore     Int      @default(80)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([contractorBssId])
  @@index([workerId])
}

model JobPosting {
  id             String   @id @default(cuid())
  contractorBssId String
  title          String
  trade          String
  site           String
  vacancies      Int
  wage           Float
  createdAt      DateTime @default(now())

  @@index([contractorBssId])
}

// ---------------------------------------------------------
// Employer Domain
// ---------------------------------------------------------
model EmployerProfile {
  id             String   @id @default(cuid())
  bssId          String   @unique
  name           String
  company        String
  entity         String   @default("Public Limited Company")
  verified       Boolean  @default(true)
  contact        String?
  email          String?
  address        String?
  canAccessAdmin Boolean  @default(true)
  govtScope      String   @default("central")
  profileSections String  @default("{}")
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}

model Site {
  id             String   @id @default(cuid())
  employerBssId  String
  code           String   @unique
  name           String
  location       String
  state          String
  startDate      String
  endDate        String
  status         String   @default("Active") // Active, Planned, Completed
  contractorIds  String   @default("[]")     // JSON string array
  workers        Int      @default(0)
  compliance     Int      @default(90)
  detailsJson    String   @default("{}")     // Operational, contacts, facilities
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([employerBssId])
}

model EmployerApproval {
  id             String   @id @default(cuid())
  employerBssId  String
  entityType     String   // Contractor, Worker
  entityId       String
  name           String
  bssId          String
  contractor     String?
  site           String
  submittedAt    DateTime @default(now())
  checks         String   @default("[]") // JSON string array
  status         String   @default("Pending") // Pending, Approved, Rejected
  updatedAt      DateTime @updatedAt

  @@index([employerBssId])
}

model EmployerComplianceReport {
  id             String   @id @default(cuid())
  employerBssId  String?
  contractorId   String
  contractor     String
  siteId         String
  site           String
  period         String
  pf             String   @default("Filed") // Filed, Pending, Overdue
  esic           String   @default("Filed")
  wage           String   @default("Filed")
  safety         String   @default("Compliant") // Compliant, Review, Non-compliant
  score          Int      @default(95)
  status         String   @default("Compliant") // Compliant, Pending, Non-compliant
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}

model EmployerUser {
  id             String   @id @default(cuid())
  employerBssId  String
  name           String
  contact        String
  role           String   // Admin, Site Manager, Compliance Officer, Viewer
  scope          String   // All sites, or specific site name
  status         String   @default("Active")
  lastLogin      String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([employerBssId])
}

model EmployerAudit {
  id             String   @id @default(cuid())
  employerBssId  String
  timestamp      DateTime @default(now())
  actor          String
  action         String
  entity         String
  status         String   @default("Success") // Success, Failed, Pending

  @@index([employerBssId])
}

model EmployerRoute {
  id             String   @id @default(cuid())
  employerBssId  String
  name           String
  reference      String
  vehicle        String
  route          String
  workers        Int      @default(0)
  shifts         String
  status         String   @default("Active") // Active, Suspended
  createdAt      DateTime @default(now())

  @@index([employerBssId])
}

// ---------------------------------------------------------
// IT Help Desk & Operations Domain (Requirement R4)
// ---------------------------------------------------------
model OperationsService {
  id            String   @id // identity, portal, benefits, otp, voice, notifications
  name          String
  host          String
  status        String   @default("Operational") // Operational, Degraded, Outage, Maintenance
  latencyMs     Int      @default(30)
  uptime        Float    @default(99.9)
  lastCheckedAt DateTime @default(now())
}

model OperationsTicket {
  id            String   @id // INC-2026-081, etc.
  title         String
  service       String
  priority      String   @default("P3") // P1, P2, P3, P4
  status        String   @default("Open") // Open, In progress, Monitoring, Resolved, Escalated
  assignee      String?
  openedAt      DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model OperationsLog {
  id            String   @id @default(cuid())
  timestamp     DateTime @default(now())
  level         String   @default("info") // info, warning, error, audit
  source        String
  message       String
  correlationId String
}

// ---------------------------------------------------------
// BSS Staff Domain (Requirement R4)
// ---------------------------------------------------------
model SupportCase {
  id            String   @id // BC-1039, DOC-2048, DSP-201, WRK-881
  type          String   // Binding, Document, Dispute, Worker record
  subject       String
  party         String
  owner         String
  priority      String   @default("Normal") // Urgent, High, Normal, Low
  status        String   @default("Open")   // Open, In progress, Waiting for evidence, Resolved, Escalated
  assignee      String?
  summary       String
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

// ---------------------------------------------------------
// Cross-Cutting & Storage (Requirement R2)
// ---------------------------------------------------------
model DocumentSubmission {
  id             String   @id @default(cuid())
  submittedByRole String  // Worker, Contractor, Employer
  submittedByBssId String
  type           String   // PF Challan, ESIC Return, Wage Register, Medical Certificate, etc.
  employer       String
  site           String
  period         String
  fileName       String
  fileSize       Int
  mimeType       String
  storagePath    String
  checksum       String
  status         String   @default("Pending verification") // Pending verification, Verified, Returned
  submittedAt    DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([submittedByBssId])
  @@index([status])
}

model Notification {
  id             String   @id @default(cuid())
  recipientRole  String   // Worker, Contractor, Employer, IT Help Desk, BSS Staff, Government
  recipientBssId String?
  entityId       String?
  category       String   // Jobs, Documents, Compliance, Leave, Payments, Benefits, Grievances, Cards, Announcements, Approvals
  title          String
  message        String
  href           String
  actionLabel    String   @default("View")
  priority       String   @default("normal") // critical, high, normal, low
  requiresAction Boolean  @default(false)
  read           Boolean  @default(false)
  resolved       Boolean  @default(false)
  createdAt      DateTime @default(now())

  @@index([recipientRole, recipientBssId])
}

model EcsBinding {
  id             String   @id @default(cuid())
  employerId     String
  contractorId   String
  siteId         String
  workerId       String
  tuple          String   @unique // employerId|contractorId|siteId|workerId
  state          String   @default("unbound") // unbound, pending, bound, rejected
  consentJson    String   @default("{\"employer\":false,\"contractor\":false,\"worker\":false}")
  requestedBy    String   // employer, contractor, worker
  requestedAt    DateTime @default(now())
  boundAt        DateTime?
}

// ---------------------------------------------------------
// Government Analytics Domain
// ---------------------------------------------------------
model GovernmentWorker {
  id             String   @id // GW-001 ... GW-108
  state          String
  district       String
  city           String
  age            Int
  gender         String   // Male, Female, Transgender
  category       String
  occupation     String
  site           String
  siteType       String
  employer       String
  contractor     String
  migrant        Boolean  @default(false)
  stateOfOrigin  String
  attendance     Int
  compliance     String   // Compliant, Pending, Non-compliant
  epfoLinked     Boolean  @default(false)
  esicLinked     Boolean  @default(false)
  wage           Float
}
```

---

## 5. Subsystem-by-Subsystem Implementation Architecture

### 5.1 Requirement R1: Replacing `demoStore()` with Prisma Database Operations

1. **Database Client Singleton (`src/lib/prisma.ts`)**:
   - Standard Next.js development singleton pattern avoiding connection exhaustion during hot reloads:
   ```ts
   import { PrismaClient } from '@prisma/client';

   const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

   export const prisma =
     globalForPrisma.prisma ??
     new PrismaClient({
       log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
     });

   if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
   ```

2. **Portal Aggregation Refactor (`src/server/portal.ts`)**:
   - Replace static `structuredClone(demoWorkerPortal)` with `getWorkerPortalFromDb(session.subject)`:
     - Fetches `WorkerProfile` and includes related `WorkerDocument[]`, `WageRecord[]`, `AttendanceRecord[]`, `BonusRecord[]`, `LeaveRecord[]`, etc.
   - Replace `demoContractorPortal` with `getContractorPortalFromDb(session.subject)`:
     - Fetches `ContractorProfile`, `ContractorWorkerAssignment[]`, `ComplianceRecord[]`, `GatePass[]`, `SalaryRecord[]`, etc.
   - Replace `demoEmployerPortal` with `getEmployerPortalFromDb(session.subject)`:
     - Fetches `EmployerProfile`, `Site[]`, `EmployerApproval[]`, `EmployerUser[]`, etc.
   - Replace `governmentWorkers` with `prisma.governmentWorker.findMany()`.

3. **Mutation Handler Refactor (`mutatePortal()`)**:
   - `resource === 'leave'`: `prisma.leaveRecord.create({...})`
   - `resource === 'grievances'`: `prisma.grievance.create({...})`
   - `resource === 'availability'`: `prisma.workerProfile.update({ where: { bssId }, data: { availability } })`
   - `resource === 'salaries'`: `prisma.salaryRecord.createMany({...})`
   - `resource === 'compliances'`: `prisma.complianceRecord.createMany({...})`
   - `resource === 'gate-passes'`: `prisma.gatePass.updateMany({...})` / `prisma.gatePass.create({...})`
   - `resource === 'approvals'`: `prisma.employerApproval.updateMany({...})`
   - `resource === 'submissions'`: `prisma.documentSubmission.update({...})`

### 5.2 Requirement R2: Contractor Secure Data Upload Pipeline

The upload endpoint `/api/portal/uploads` must handle files securely from upload through database indexing:

1. **Storage Location**:
   - Root directory: `./uploads` (or configurable via `BSS_UPLOAD_DIR` env, default: `path.join(process.cwd(), 'uploads')`).
   - Organized subdirectories by role and entity: `./uploads/submissions/<period>/`.

2. **File Processing Flow**:
   - **Step 1:** Verify session role (`Worker` or `Contractor`).
   - **Step 2:** Validate content length (max 10 MB) and MIME types (`application/pdf`, `image/jpeg`, `image/png`).
   - **Step 3:** Validate magic byte signature (`%PDF-`, `0xFF 0xD8 0xFF`, `\x89PNG\r\n\x1a\n`).
   - **Step 4:** Calculate SHA-256 hash from file buffer.
   - **Step 5:** Sanitize file name: remove control chars, path traversal delimiters, limit to 180 chars.
   - **Step 6:** Write buffer to disk using `node:fs/promises.writeFile` with atomic temporary file renaming.
   - **Step 7:** Insert record into `prisma.documentSubmission.create(...)`:
     ```ts
     const submission = await prisma.documentSubmission.create({
       data: {
         submittedByRole: session.role,
         submittedByBssId: session.subject,
         type: metadata.type,
         employer: session.role === 'Contractor' ? metadata.employer : 'Worker self-service',
         site: metadata.site,
         period: metadata.period,
         fileName: safeFileName,
         fileSize: file.size,
         mimeType: file.type,
         storagePath: targetDiskPath,
         checksum: `sha256:${checksum}`,
         status: 'Pending verification',
       },
     });
     ```
   - **Step 8:** Also update corresponding `WorkerDocument` if submitted by a Worker.
   - **Step 9:** Return standard response matching `DocumentRow` type for instant UI consumption.

### 5.3 Requirement R4: IT Task Team & BSS Staff Live Upgrades

1. **Live IT Operations Terminal**:
   - `ItOperationsDashboard` commands will execute real database queries:
     - `health`: counts operational services and non-resolved tickets from Prisma.
     - `services`: lists all `OperationsService` records from Prisma with current latency and uptime.
     - `queues`: queries pending cases count (`SupportCase.count({ where: { status: 'Open' } })`), pending submissions, pending card orders.
     - `sessions`: queries active user counts.
     - `bindings`: queries `EcsBinding` counts (`bound`, `pending`, `rejected`).
     - `probe <service-id>`: updates `lastCheckedAt = new Date()` and adjusts `latencyMs` in `OperationsService`, then writes an `OperationsLog` audit entry.
     - `retry-binding <binding-id>`: logs audit entry in `OperationsLog` and transitions `SupportCase` or `EcsBinding`.
   - Any terminal command writes an `OperationsLog` entry (`level: 'audit'`, `source: 'ops-terminal'`, `message: '${session.subject} ran ${cmd}'`).

2. **Live Service Health Probes**:
   - Probe action updates `OperationsService` row in SQLite and returns new snapshot.

3. **Live Incident & Support Ticket Transitions**:
   - Transition actions (`claim`, `monitor`, `resolve`, `escalate`) update `OperationsTicket` in SQLite (`status`, `assignee`, `updatedAt`) and write to `OperationsLog`.

4. **Live BSS Staff Case Management**:
   - `BssStaffDashboard` transitions (`claim`, `wait`, `resolve`, `escalate`) update `SupportCase` in SQLite (`status`, `assignee`, `updatedAt`) and record a staff audit log in `OperationsLog`.

---

## 6. Seed Data Specifications

The seed pipeline will load the complete pre-configured domain data into SQLite on `prisma db seed` or initial startup:

| Model | Seed Source | Seed Record Count | Notes |
|---|---|---|---|
| `User` | Derived from all 6 roles | 6 primary users | `Worker`, `Contractor`, `Employer`, `IT Help Desk`, `BSS Staff`, `Government` |
| `WorkerProfile` | `src/server/demo-data.ts` (lines 8-52) | 1 full profile + 7 contractor workers | Primary subject `BSS234567890124` |
| `WorkerDocument` | `src/server/demo-data.ts` (lines 36-43) | 12 documents | Aadhaar, PAN, Bank, Gate Pass, etc. |
| `WageRecord` | `src/data/workerPortalData.ts` (lines 30-34) | 3 records | Aug, Jul, Jun 2026 |
| `AttendanceRecord` | `src/data/workerPortalData.ts` (lines 35-43) | 7 records | Daily punches with statuses |
| `ProvidentFundRecord`| `src/data/workerPortalData.ts` (lines 44-48) | 3 records | Monthly PF credits |
| `BonusRecord` | `src/data/workerPortalData.ts` (lines 52-56) | 3 records | Quarterly, attendance, safety |
| `LeaveEncashmentRecord` | `src/data/workerPortalData.ts` (lines 57-60) | 2 records | Aug, May 2026 |
| `ContractorProfile` | `src/server/demo-data.ts` (lines 54-132) | 1 primary + 2 affiliates | `BSSC198200000001` (RK Buildcon), SafeBuild, Metro Civil |
| `Site` | `src/server/demo-data.ts` (lines 146-177) | 3 detailed sites | `SITE-001`, `SITE-003`, `SITE-005` |
| `EmployerProfile` | `src/server/demo-data.ts` (lines 134-297) | 1 primary | `BSSE100210000001` (L&T Construction) |
| `OperationsService` | `src/server/operations.ts` (lines 33-40) | 6 services | `identity`, `portal`, `benefits`, `otp`, `voice`, `notifications` |
| `OperationsLog` | `src/server/operations.ts` (lines 41-47) | 5 initial logs | Audits and info logs |
| `OperationsTicket` | `src/server/operations.ts` (lines 48-53) | 4 tickets | `INC-2026-081`, `INC-2026-079`, `REQ-2026-211`, `INC-2026-074` |
| `SupportCase` | `src/server/operations.ts` (lines 54-59) | 4 cases | `BC-1039`, `DOC-2048`, `DSP-201`, `WRK-881` |
| `GovernmentWorker` | `src/data/governmentData.ts` (lines 35-63) | 108 workers | Deterministic PRNG across 12 states |
| `Notification` | `src/lib/notifications.ts` (lines 21-40) | 12 notifications | Role-scoped notification seeds |

---

## 7. Package Dependencies & Build Configuration

### 7.1 Required Package Additions
- `prisma`: `^6.4.0` (devDependencies)
- `@prisma/client`: `^6.4.0` (dependencies)
- `tsx` or `ts-node`: `^4.19.0` (devDependencies, for running TypeScript seed scripts)

### 7.2 Required `package.json` Script Updates
```json
"scripts": {
  "dev": "next dev --webpack",
  "build": "prisma generate && next build --webpack",
  "start": "next start",
  "lint": "eslint",
  "i18n:check": "node scripts/check-i18n.mjs",
  "db:generate": "prisma generate",
  "db:push": "prisma db push",
  "db:seed": "tsx prisma/seed.ts",
  "db:reset": "prisma db push --force-reset && tsx prisma/seed.ts",
  "verify": "npm run lint && npm run i18n:check && tsc --noEmit"
}
```

---

## 8. Verification Strategy & Architecture Blueprint

1. **Zero-Config Developer Experience**:
   - When the developer runs `npm run dev` or tests are executed, the database automatically initializes `prisma/dev.db` with seeded records if the database file is absent.
2. **Backward Compatibility**:
   - The UI contracts in `ContractorContext`, `EmployerContext`, `WorkerContext`, `GovernmentContext`, and `useOperations` remain 100% compliant. No breaking UI shape changes are introduced.
3. **Strict Validation & Role Isolation**:
   - All role-specific route gates (`requireSession()`, `requireApiSession()`, `assertTrustedMutation()`) remain active and enforce authorization before hitting the Prisma database layer.

---

## 9. Conclusion

The existing Next.js frontend and API route architecture is cleanly organized and strictly validated. Replacing the mock `demoStore()` and static fixtures with a normalized SQLite + Prisma database layer, implementing the disk upload pipeline, and connecting the IT Help Desk terminal and BSS Staff workbench to live database records will make the system fully functional and production-ready.
