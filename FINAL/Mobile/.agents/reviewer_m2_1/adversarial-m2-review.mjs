import { stat, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { BssClient } from '../../tests/helpers/client.mjs';

const prisma = new PrismaClient();

async function runAdversarialM2Audit() {
  console.log('===============================================================');
  console.log('   Adversarial & Integrity Audit: Milestone 2 (Uploads/Storage)');
  console.log('===============================================================\n');

  const contractor = new BssClient();
  const employer = new BssClient();
  const worker = new BssClient();
  const staff = new BssClient();
  const itDesk = new BssClient();
  const govt = new BssClient();

  await contractor.login('Contractor');
  await employer.login('Employer');
  await worker.login('Worker');
  await staff.login('BSS Staff');
  await itDesk.login('IT Help Desk');
  await govt.login('Government');

  let passed = 0;
  let failed = 0;
  const findings = [];

  function record(name, isPass, detail = '') {
    if (isPass) {
      passed++;
      console.log(`  ✓ PASS: ${name}`);
    } else {
      failed++;
      console.error(`  ✗ FAIL: ${name} — ${detail}`);
      findings.push({ name, detail });
    }
  }

  // -------------------------------------------------------------
  // Test 1: Exact 10MB file boundary (10 * 1024 * 1024 bytes)
  // -------------------------------------------------------------
  let boundaryDocId = null;
  try {
    const exact10MbBuf = Buffer.alloc(10 * 1024 * 1024);
    exact10MbBuf.write('%PDF-1.7\n', 0);
    for (let i = 10; i < 1000; i++) exact10MbBuf[i] = (i % 256);
    const exact10MbFile = new File([exact10MbBuf], 'exact_10mb.pdf', { type: 'application/pdf' });

    const res = await contractor.uploadFile({
      file: exact10MbFile,
      type: 'PF Challan',
      site: 'Mumbai Metro Line 3',
      period: '2026-07',
      employer: 'L&T Construction',
    });

    if (res.status !== 201) throw new Error(`Expected 201 Created for exact 10MB file, got ${res.status}`);
    boundaryDocId = res.json.data.id;
    const computedHash = `sha256:${createHash('sha256').update(exact10MbBuf).digest('hex')}`;
    if (res.json.data.checksum !== computedHash) {
      throw new Error(`Checksum mismatch: expected ${computedHash}, got ${res.json.data.checksum}`);
    }
    record('Exact 10MB payload upload accepted & exact SHA-256 computed', true);
  } catch (err) {
    record('Exact 10MB payload upload accepted & exact SHA-256 computed', false, err.message);
  }

  // -------------------------------------------------------------
  // Test 2: 10MB + 1 Byte boundary rejection
  // -------------------------------------------------------------
  try {
    const over10MbBuf = Buffer.alloc(10 * 1024 * 1024 + 1);
    over10MbBuf.write('%PDF-1.7\n', 0);
    const over10MbFile = new File([over10MbBuf], 'over_10mb.pdf', { type: 'application/pdf' });

    const res = await contractor.uploadFile({
      file: over10MbFile,
      type: 'PF Challan',
      site: 'Mumbai Metro Line 3',
      period: '2026-07',
      employer: 'L&T Construction',
    });

    if (res.status !== 413) throw new Error(`Expected 413 Payload Too Large for 10MB+1B, got ${res.status}`);
    record('10MB + 1 byte boundary rejection with HTTP 413', true);
  } catch (err) {
    record('10MB + 1 byte boundary rejection with HTTP 413', false, err.message);
  }

  // -------------------------------------------------------------
  // Test 3: Magic byte spoofing: PNG disguised as PDF
  // -------------------------------------------------------------
  try {
    const pngMagicHeader = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D]);
    const spoofedFile = new File([pngMagicHeader], 'fake_contract.pdf', { type: 'application/pdf' });

    const res = await contractor.uploadFile({
      file: spoofedFile,
      type: 'Wage Register',
      site: 'Mumbai Metro Line 3',
      period: '2026-07',
      employer: 'L&T Construction',
    });

    if (res.status !== 415) throw new Error(`Expected 415 Unsupported Media Type for mismatched magic bytes, got ${res.status}`);
    record('Magic-byte spoofing rejection (PNG declared as application/pdf)', true);
  } catch (err) {
    record('Magic-byte spoofing rejection (PNG declared as application/pdf)', false, err.message);
  }

  // -------------------------------------------------------------
  // Test 4: Truncated magic bytes (< 5 bytes)
  // -------------------------------------------------------------
  try {
    const shortHeader = Buffer.from([0x25, 0x50, 0x44]); // "%PD" without "F-"
    const truncatedFile = new File([shortHeader], 'truncated.pdf', { type: 'application/pdf' });

    const res = await contractor.uploadFile({
      file: truncatedFile,
      type: 'Wage Register',
      site: 'Mumbai Metro Line 3',
      period: '2026-07',
      employer: 'L&T Construction',
    });

    if (res.status !== 415) throw new Error(`Expected 415 for incomplete %PDF- magic bytes, got ${res.status}`);
    record('Truncated magic-byte rejection (< 5 bytes)', true);
  } catch (err) {
    record('Truncated magic-byte rejection (< 5 bytes)', false, err.message);
  }

  // -------------------------------------------------------------
  // Test 5: Path traversal attack in filename
  // -------------------------------------------------------------
  let traversalDocId = null;
  try {
    const validPdfBuf = Buffer.from('%PDF-1.7\nAdversarial Path Traversal Test\n%%EOF');
    const maliciousName = '../../../../../../etc/cron.d/malicious_payload.pdf';
    const traversalFile = new File([validPdfBuf], maliciousName, { type: 'application/pdf' });

    const res = await contractor.uploadFile({
      file: traversalFile,
      type: 'Safety Audit',
      site: 'Mumbai Metro Line 3',
      period: '2026-07',
      employer: 'L&T Construction',
    });

    if (res.status !== 201) throw new Error(`Upload failed with status ${res.status}`);
    traversalDocId = res.json.data.id;

    const dbRecord = await prisma.documentSubmission.findUnique({ where: { id: traversalDocId } });
    if (!dbRecord) throw new Error('DB record not found for traversal test');

    const resolvedPath = path.resolve(dbRecord.storagePath);
    const uploadsBase = path.resolve(process.cwd(), '.data', 'uploads');
    if (!resolvedPath.startsWith(uploadsBase)) {
      throw new Error(`Path traversal vulnerability! Storage path ${resolvedPath} is outside ${uploadsBase}`);
    }

    if (dbRecord.fileName.includes('/') || dbRecord.fileName.includes('\\')) {
      throw new Error(`Sanitized display name contains path separators: ${dbRecord.fileName}`);
    }

    record('Path traversal filename neutralization and strict containment in .data/uploads', true);
  } catch (err) {
    record('Path traversal filename neutralization and strict containment in .data/uploads', false, err.message);
  }

  // -------------------------------------------------------------
  // Test 6: Filesystem Permissions Verification (0o700 dir, 0o600 file)
  // -------------------------------------------------------------
  try {
    if (!boundaryDocId) throw new Error('No uploaded doc available for permissions check');
    const dbRecord = await prisma.documentSubmission.findUnique({ where: { id: boundaryDocId } });
    if (!dbRecord) throw new Error('DB record missing');

    const fileStat = await stat(dbRecord.storagePath);
    const dirStat = await stat(path.dirname(dbRecord.storagePath));

    const fileMode = (fileStat.mode & 0o777).toString(8);
    const dirMode = (dirStat.mode & 0o777).toString(8);

    if (fileMode !== '600') {
      throw new Error(`File permissions must be 0600, found 0${fileMode}`);
    }
    if (dirMode !== '700') {
      throw new Error(`Directory permissions must be 0700, found 0${dirMode}`);
    }

    record('POSIX file permissions (0600 file, 0700 directory) verification', true);
  } catch (err) {
    record('POSIX file permissions (0600 file, 0700 directory) verification', false, err.message);
  }

  // -------------------------------------------------------------
  // Test 7: Binary Stream Retrieval Content Integrity & Security Headers
  // -------------------------------------------------------------
  try {
    if (!boundaryDocId) throw new Error('No uploaded doc for streaming test');
    
    // Direct raw fetch to inspect binary body
    const rawRes = await fetch(`${contractor.baseUrl}/api/portal/uploads/${boundaryDocId}`, {
      headers: {
        Origin: contractor.baseUrl,
        'Sec-Fetch-Site': 'same-origin',
        Cookie: contractor.getCookieHeader(),
      },
    });

    if (rawRes.status !== 200) throw new Error(`GET /api/portal/uploads/${boundaryDocId} returned ${rawRes.status}`);

    const ct = rawRes.headers.get('content-type');
    const cl = rawRes.headers.get('content-length');
    const nosniff = rawRes.headers.get('x-content-type-options');
    const csp = rawRes.headers.get('content-security-policy');
    const cd = rawRes.headers.get('content-disposition');

    if (ct !== 'application/pdf') throw new Error(`Content-Type must be application/pdf, got ${ct}`);
    if (cl !== String(10 * 1024 * 1024)) throw new Error(`Content-Length must be exact size, got ${cl}`);
    if (nosniff !== 'nosniff') throw new Error(`X-Content-Type-Options must be nosniff, got ${nosniff}`);
    if (!csp?.includes("default-src 'none'")) throw new Error(`CSP must include default-src 'none', got ${csp}`);
    if (!cd?.includes('inline; filename=')) throw new Error(`Content-Disposition must be inline, got ${cd}`);

    const arrayBuffer = await rawRes.arrayBuffer();
    const downloadedHash = `sha256:${createHash('sha256').update(Buffer.from(arrayBuffer)).digest('hex')}`;
    const dbRecord = await prisma.documentSubmission.findUnique({ where: { id: boundaryDocId } });
    if (downloadedHash !== dbRecord.checksum) {
      throw new Error(`Streamed content hash ${downloadedHash} does not match DB checksum ${dbRecord.checksum}`);
    }

    record('Streaming file retrieval with security headers and bit-for-bit SHA-256 integrity', true);
  } catch (err) {
    record('Streaming file retrieval with security headers and bit-for-bit SHA-256 integrity', false, err.message);
  }

  // -------------------------------------------------------------
  // Test 8: HEAD Request Support on /api/portal/uploads/[id]
  // -------------------------------------------------------------
  try {
    if (!boundaryDocId) throw new Error('No doc for HEAD test');
    const headRes = await contractor.request(`/api/portal/uploads/${boundaryDocId}`, { method: 'HEAD' });
    if (headRes.status !== 200) throw new Error(`HEAD returned ${headRes.status}`);
    if (headRes.headers.get('content-type') !== 'application/pdf') throw new Error('HEAD missing Content-Type');
    if (headRes.headers.get('x-content-type-options') !== 'nosniff') throw new Error('HEAD missing nosniff');
    record('HEAD request verification on /api/portal/uploads/[id]', true);
  } catch (err) {
    record('HEAD request verification on /api/portal/uploads/[id]', false, err.message);
  }

  // -------------------------------------------------------------
  // Test 9: Complete 6-Role Upload Permission Matrix (RBAC)
  // -------------------------------------------------------------
  try {
    const samplePdf = () => new File([Buffer.from('%PDF-1.7\nRBAC test\n%%EOF')], 'test.pdf', { type: 'application/pdf' });

    // Worker: ALLOWED
    const wRes = await worker.uploadFile({ file: samplePdf(), type: 'Leave evidence', site: 'Site A', period: '2026-07' });
    if (wRes.status !== 201) throw new Error(`Worker upload expected 201, got ${wRes.status}`);

    // Contractor: ALLOWED
    const cRes = await contractor.uploadFile({ file: samplePdf(), type: 'PF Challan', site: 'Site A', period: '2026-07', employer: 'L&T Construction' });
    if (cRes.status !== 201) throw new Error(`Contractor upload expected 201, got ${cRes.status}`);

    // Employer: FORBIDDEN
    const eRes = await employer.uploadFile({ file: samplePdf(), type: 'PF Challan', site: 'Site A', period: '2026-07' });
    if (eRes.status !== 403) throw new Error(`Employer upload expected 403, got ${eRes.status}`);

    // BSS Staff: FORBIDDEN
    const sRes = await staff.uploadFile({ file: samplePdf(), type: 'PF Challan', site: 'Site A', period: '2026-07' });
    if (sRes.status !== 403) throw new Error(`BSS Staff upload expected 403, got ${sRes.status}`);

    // IT Help Desk: FORBIDDEN
    const itRes = await itDesk.uploadFile({ file: samplePdf(), type: 'PF Challan', site: 'Site A', period: '2026-07' });
    if (itRes.status !== 403) throw new Error(`IT Help Desk upload expected 403, got ${itRes.status}`);

    // Government: FORBIDDEN
    const gRes = await govt.uploadFile({ file: samplePdf(), type: 'PF Challan', site: 'Site A', period: '2026-07' });
    if (gRes.status !== 403) throw new Error(`Government upload expected 403, got ${gRes.status}`);

    record('Complete 6-role upload RBAC enforcement matrix (Worker/Contractor allowed; others 403)', true);
  } catch (err) {
    record('Complete 6-role upload RBAC enforcement matrix (Worker/Contractor allowed; others 403)', false, err.message);
  }

  // -------------------------------------------------------------
  // Test 10: Complete 6-Role Document Retrieval Authorization Matrix
  // -------------------------------------------------------------
  try {
    if (!boundaryDocId) throw new Error('No doc for retrieval RBAC');

    // 1. Contractor Owner: ALLOWED (200)
    const cGet = await contractor.get(`/api/portal/uploads/${boundaryDocId}`);
    if (cGet.status !== 200) throw new Error(`Contractor owner expected 200, got ${cGet.status}`);

    // 2. Bound Principal Employer: ALLOWED (200)
    const eGet = await employer.get(`/api/portal/uploads/${boundaryDocId}`);
    if (eGet.status !== 200) throw new Error(`Bound employer expected 200, got ${eGet.status}`);

    // 3. Staff Audit Role: ALLOWED (200)
    const sGet = await staff.get(`/api/portal/uploads/${boundaryDocId}`);
    if (sGet.status !== 200) throw new Error(`Staff expected 200, got ${sGet.status}`);

    // 4. IT Helpdesk Audit Role: ALLOWED (200)
    const itGet = await itDesk.get(`/api/portal/uploads/${boundaryDocId}`);
    if (itGet.status !== 200) throw new Error(`IT Help Desk expected 200, got ${itGet.status}`);

    // 5. Government Audit Role: ALLOWED (200)
    const gGet = await govt.get(`/api/portal/uploads/${boundaryDocId}`);
    if (gGet.status !== 200) throw new Error(`Government expected 200, got ${gGet.status}`);

    // 6. Unrelated Worker: FORBIDDEN (403)
    const wGet = await worker.get(`/api/portal/uploads/${boundaryDocId}`);
    if (wGet.status !== 403) throw new Error(`Unrelated worker expected 403, got ${wGet.status}`);

    // 7. Unauthenticated: UNAUTHORIZED (401)
    const anon = new BssClient();
    const anonGet = await anon.get(`/api/portal/uploads/${boundaryDocId}`);
    if (anonGet.status !== 401) throw new Error(`Anonymous expected 401, got ${anonGet.status}`);

    record('Complete 6-role fine-grained retrieval access control matrix (Owner, Employer, Staff, IT, Govt vs Worker, Anon)', true);
  } catch (err) {
    record('Complete 6-role fine-grained retrieval access control matrix (Owner, Employer, Staff, IT, Govt vs Worker, Anon)', false, err.message);
  }

  // -------------------------------------------------------------
  // Test 11: Direct Database Verification of Document Status Transitions
  // -------------------------------------------------------------
  try {
    if (!boundaryDocId) throw new Error('No doc for transition verification');

    // 1. Initial State: "Pending review"
    let row = await prisma.documentSubmission.findUnique({ where: { id: boundaryDocId } });
    if (row.status !== 'Pending review') throw new Error(`Initial status should be 'Pending review', got '${row.status}'`);

    // 2. Employer marks 'Verified'
    const patchRes1 = await employer.patch('/api/portal/submissions', { id: boundaryDocId, status: 'Verified' });
    if (patchRes1.status !== 200) throw new Error(`PATCH Verified returned ${patchRes1.status}`);

    row = await prisma.documentSubmission.findUnique({ where: { id: boundaryDocId } });
    if (row.status !== 'Verified') throw new Error(`DB status after verify should be 'Verified', got '${row.status}'`);

    // 3. Employer marks 'Returned'
    const patchRes2 = await employer.patch('/api/portal/submissions', { id: boundaryDocId, status: 'Returned' });
    if (patchRes2.status !== 200) throw new Error(`PATCH Returned returned ${patchRes2.status}`);

    row = await prisma.documentSubmission.findUnique({ where: { id: boundaryDocId } });
    if (row.status !== 'Returned') throw new Error(`DB status after return should be 'Returned', got '${row.status}'`);

    record('Full compliance verification lifecycle with direct SQLite persistence verification', true);
  } catch (err) {
    record('Full compliance verification lifecycle with direct SQLite persistence verification', false, err.message);
  }

  // -------------------------------------------------------------
  // Test 12: Missing File Handling on Disk
  // -------------------------------------------------------------
  try {
    const res = await contractor.get('/api/portal/uploads/DOC-DOES-NOT-EXIST-000');
    if (res.status !== 404) throw new Error(`Expected 404 for missing DB document, got ${res.status}`);
    record('Missing document record returns HTTP 404', true);
  } catch (err) {
    record('Missing document record returns HTTP 404', false, err.message);
  }

  // -------------------------------------------------------------
  // Test 13: Integrity Check: No Mock Facades in Uploads/Storage
  // -------------------------------------------------------------
  try {
    const rawFiles = await readFile(path.join(process.cwd(), 'src/server/storage.ts'), 'utf8');
    if (rawFiles.includes('mockStorage') || rawFiles.includes('fakeUpload')) {
      throw new Error('Integrity violation: found mockStorage or fakeUpload facade in storage.ts');
    }
    const routeCode = await readFile(path.join(process.cwd(), 'src/app/api/portal/uploads/route.ts'), 'utf8');
    if (routeCode.includes('mockResponse') || routeCode.includes('dummySubmission')) {
      throw new Error('Integrity violation: found mock response facade in uploads route');
    }
    record('Integrity audit: Zero dummy facades or fake storage implementations detected', true);
  } catch (err) {
    record('Integrity audit: Zero dummy facades or fake storage implementations detected', false, err.message);
  }

  console.log('\n===============================================================');
  console.log(`  Audit Completed: ${passed} Passed, ${failed} Failed`);
  console.log('===============================================================\n');

  await prisma.$disconnect();

  if (failed > 0) {
    process.exit(1);
  }
}

runAdversarialM2Audit().catch(err => {
  console.error('Fatal audit runner error:', err);
  process.exit(1);
});
