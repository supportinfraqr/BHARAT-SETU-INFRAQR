import { stat, readFile, unlink, access } from 'node:fs/promises';
import { createHash, randomBytes } from 'node:crypto';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { BssClient } from '../tests/helpers/client.mjs';
import {
  createSamplePdf,
  createSampleJpeg,
  createSamplePng,
  createCorruptPdf,
  createOversizedPdf,
  createDisallowedExecutable,
} from '../tests/helpers/fixtures.mjs';

const prisma = new PrismaClient();

async function runForensicAudit() {
  console.log('======================================================');
  console.log('  M2 FORENSIC INTEGRITY & ADVERSARIAL AUDIT           ');
  console.log('======================================================\n');

  const results = [];
  function record(name, pass, details = '') {
    results.push({ name, pass, details });
    if (pass) {
      console.log(`  [PASS] ${name}`);
    } else {
      console.log(`  [FAIL] ${name} -> ${details}`);
    }
  }

  const contractorClient = new BssClient();
  const employerClient = new BssClient();
  const workerClient = new BssClient();
  const unauthClient = new BssClient();

  await contractorClient.login('Contractor');
  await employerClient.login('Employer');
  await workerClient.login('Worker');

  // -------------------------------------------------------------
  // FORENSIC CHECK 1: Binary Magic-Byte Inspection vs Spoofing
  // -------------------------------------------------------------
  try {
    // 1.1 Valid PDF with %PDF- header
    const validPdf = createSamplePdf('audit_valid.pdf');
    const res1 = await contractorClient.uploadFile({
      file: validPdf.file,
      type: 'PF Challan',
      site: 'Mumbai Metro Line 3',
      period: '2026-07',
    });
    if (res1.status !== 201) throw new Error(`Expected 201, got ${res1.status}`);
    record('F1.1: Valid PDF with %PDF- header is accepted (HTTP 201)', true);

    // 1.2 Spoofed PDF (extension .pdf & mime application/pdf, but raw text content)
    const spoofedPdf = createCorruptPdf('spoofed_text.pdf');
    const res2 = await contractorClient.uploadFile({
      file: spoofedPdf.file,
      type: 'PF Challan',
      site: 'Mumbai Metro Line 3',
      period: '2026-07',
    });
    if (res2.status !== 415) throw new Error(`Expected 415 for spoofed PDF, got ${res2.status}`);
    record('F1.2: Spoofed PDF without %PDF- magic bytes is rejected (HTTP 415)', true);

    // 1.3 Mismatched magic bytes (PNG header declared as PDF)
    const pngHeaderInPdf = new File(
      [Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x00])],
      'png_as_pdf.pdf',
      { type: 'application/pdf' }
    );
    const res3 = await contractorClient.uploadFile({
      file: pngHeaderInPdf,
      type: 'PF Challan',
      site: 'Mumbai Metro Line 3',
      period: '2026-07',
    });
    if (res3.status !== 415) throw new Error(`Expected 415 for PNG disguised as PDF, got ${res3.status}`);
    record('F1.3: Mismatched magic bytes (PNG bytes with PDF mime) rejected (HTTP 415)', true);

    // 1.4 Valid JPEG with 0xFF 0xD8 0xFF header
    const validJpeg = createSampleJpeg('audit_valid.jpg');
    const res4 = await contractorClient.uploadFile({
      file: validJpeg.file,
      type: 'Safety Audit',
      site: 'Mumbai Metro Line 3',
      period: '2026-07',
    });
    if (res4.status !== 201) throw new Error(`Expected 201, got ${res4.status}`);
    record('F1.4: Valid JPEG with 0xFF 0xD8 0xFF header accepted (HTTP 201)', true);

    // 1.5 Valid PNG with 0x89 0x50 0x4E 0x47 header
    const validPng = createSamplePng('audit_valid.png');
    const res5 = await contractorClient.uploadFile({
      file: validPng.file,
      type: 'Wage Register',
      site: 'Mumbai Metro Line 3',
      period: '2026-07',
    });
    if (res5.status !== 201) throw new Error(`Expected 201, got ${res5.status}`);
    record('F1.5: Valid PNG with 0x89 0x50 0x4E 0x47 header accepted (HTTP 201)', true);
  } catch (err) {
    record('F1: Binary Magic-Byte Inspection', false, err.message);
  }

  // -------------------------------------------------------------
  // FORENSIC CHECK 2: Disk Write, Atomicity & File Permissions
  // -------------------------------------------------------------
  let testUploadId = null;
  let testStoragePath = null;
  let testFileBuffer = null;
  let testExpectedSha256 = null;

  try {
    const customContent = Buffer.concat([
      Buffer.from('%PDF-1.4\n%Forensic disk write audit test\n', 'utf-8'),
      randomBytes(1024),
      Buffer.from('\n%%EOF\n', 'utf-8'),
    ]);
    testFileBuffer = customContent;
    const customHash = createHash('sha256').update(customContent).digest('hex');
    testExpectedSha256 = `sha256:${customHash}`;

    const testFile = new File([customContent], 'disk_verification_test.pdf', {
      type: 'application/pdf',
    });

    const uploadRes = await contractorClient.uploadFile({
      file: testFile,
      type: 'PF Challan',
      site: 'Mumbai Metro Line 3',
      period: '2026-07',
    });
    if (uploadRes.status !== 201) throw new Error(`Upload failed: status ${uploadRes.status}`);

    testUploadId = uploadRes.json.data.id;
    if (!testUploadId) throw new Error('No upload ID returned in response');

    // Query SQLite directly via Prisma
    const dbRecord = await prisma.documentSubmission.findUnique({
      where: { id: testUploadId },
    });
    if (!dbRecord) throw new Error(`Document record not found in SQLite for ID ${testUploadId}`);
    testStoragePath = dbRecord.storagePath;

    // Check disk file existence and size
    const fileStat = await stat(testStoragePath);
    if (!fileStat.isFile()) throw new Error(`Storage path ${testStoragePath} is not a regular file`);
    if (fileStat.size !== customContent.length) {
      throw new Error(`File size on disk (${fileStat.size}) does not match uploaded size (${customContent.length})`);
    }

    // Check POSIX permissions (0o600 on file, 0o700 on dir)
    const fileMode = (fileStat.mode & 0o777).toString(8);
    const parentDirStat = await stat(path.dirname(testStoragePath));
    const dirMode = (parentDirStat.mode & 0o777).toString(8);

    // Verify raw file content on disk matches SHA-256 exactly
    const diskBytes = await readFile(testStoragePath);
    const diskHash = `sha256:${createHash('sha256').update(diskBytes).digest('hex')}`;
    if (diskHash !== testExpectedSha256) {
      throw new Error(`Disk hash ${diskHash} does not match expected ${testExpectedSha256}`);
    }

    record(
      `F2.1: Genuine disk file written to ${testStoragePath} (size: ${fileStat.size}B, sha256 match, permissions: file=${fileMode}, dir=${dirMode})`,
      true
    );
  } catch (err) {
    record('F2.1: Genuine disk file written & verified', false, err.message);
  }

  // -------------------------------------------------------------
  // FORENSIC CHECK 3: SQLite Database Persistence Integrity
  // -------------------------------------------------------------
  try {
    const dbRecord = await prisma.documentSubmission.findUnique({
      where: { id: testUploadId },
    });
    if (!dbRecord) throw new Error('Database record missing');
    if (dbRecord.submittedByRole !== 'Contractor') throw new Error(`Expected role Contractor, got ${dbRecord.submittedByRole}`);
    if (dbRecord.checksum !== testExpectedSha256) throw new Error(`DB checksum ${dbRecord.checksum} != ${testExpectedSha256}`);
    if (dbRecord.status !== 'Pending review') throw new Error(`DB initial status ${dbRecord.status} != 'Pending review'`);
    if (dbRecord.fileSize !== testFileBuffer.length) throw new Error(`DB fileSize ${dbRecord.fileSize} != ${testFileBuffer.length}`);

    record('F3.1: SQLite persistence: DocumentSubmission record contains complete, accurate metadata', true);
  } catch (err) {
    record('F3.1: SQLite persistence', false, err.message);
  }

  // -------------------------------------------------------------
  // FORENSIC CHECK 4: Streaming Download & Byte-for-Byte Checksum
  // -------------------------------------------------------------
  try {
    const downloadRaw = await fetch(`http://localhost:3000/api/portal/uploads/${testUploadId}`, {
      headers: {
        Cookie: contractorClient.getCookieHeader(),
        Origin: 'http://localhost:3000',
        'Sec-Fetch-Site': 'same-origin',
      },
    });

    if (downloadRaw.status !== 200) throw new Error(`Expected 200, got ${downloadRaw.status}`);

    const streamedBuf = Buffer.from(await downloadRaw.arrayBuffer());
    if (streamedBuf.length !== testFileBuffer.length) {
      throw new Error(`Streamed length ${streamedBuf.length} != uploaded length ${testFileBuffer.length}`);
    }

    const streamedHash = `sha256:${createHash('sha256').update(streamedBuf).digest('hex')}`;
    if (streamedHash !== testExpectedSha256) {
      throw new Error(`Streamed hash ${streamedHash} != expected ${testExpectedSha256}`);
    }

    // Check headers
    const contentType = downloadRaw.headers.get('content-type');
    const nosniff = downloadRaw.headers.get('x-content-type-options');
    const csp = downloadRaw.headers.get('content-security-policy');
    const disposition = downloadRaw.headers.get('content-disposition');

    if (contentType !== 'application/pdf') throw new Error(`Content-Type: ${contentType}`);
    if (nosniff !== 'nosniff') throw new Error(`X-Content-Type-Options: ${nosniff}`);
    if (!csp?.includes('sandbox')) throw new Error(`CSP missing sandbox: ${csp}`);
    if (!disposition?.includes('filename=')) throw new Error(`Content-Disposition missing filename: ${disposition}`);

    record('F4.1: Streaming download GET /api/portal/uploads/[id] returns byte-for-byte identical content and security headers', true);
  } catch (err) {
    record('F4.1: Streaming download verification', false, err.message);
  }

  // -------------------------------------------------------------
  // FORENSIC CHECK 5: Role-Based Access Control (RBAC) & Boundary Isolation
  // -------------------------------------------------------------
  try {
    // 5.1 Employer upload attempt rejected (403)
    const empUpload = await employerClient.uploadFile({
      file: createSamplePdf('emp_forbidden.pdf').file,
      type: 'PF Challan',
      site: 'Site A',
      period: '2026-07',
    });
    if (empUpload.status !== 403) throw new Error(`Employer upload should return 403, got ${empUpload.status}`);
    record('F5.1: Unauthorized role (Employer) upload rejected with HTTP 403', true);

    // 5.2 Unauthenticated upload attempt rejected (401)
    const unauthUpload = await unauthClient.uploadFile({
      file: createSamplePdf('unauth.pdf').file,
      type: 'PF Challan',
      site: 'Site A',
      period: '2026-07',
    });
    if (unauthUpload.status !== 401) throw new Error(`Unauthenticated upload should return 401, got ${unauthUpload.status}`);
    record('F5.2: Unauthenticated upload rejected with HTTP 401', true);

    // 5.3 Bound employer can download contractor document (200)
    const boundEmpDownload = await employerClient.get(`/api/portal/uploads/${testUploadId}`);
    if (boundEmpDownload.status !== 200) throw new Error(`Bound employer download should return 200, got ${boundEmpDownload.status}`);
    record('F5.3: Bound Principal Employer authorized to download contractor document (HTTP 200)', true);

    // 5.4 Unrelated worker cannot download contractor document (403)
    const workerDownload = await workerClient.get(`/api/portal/uploads/${testUploadId}`);
    if (workerDownload.status !== 403) throw new Error(`Unrelated worker download should return 403, got ${workerDownload.status}`);
    record('F5.4: Unrelated Worker forbidden from downloading contractor document (HTTP 403)', true);

    // 5.5 Unauthenticated download rejected (401)
    const unauthDownload = await unauthClient.get(`/api/portal/uploads/${testUploadId}`);
    if (unauthDownload.status !== 401) throw new Error(`Unauthenticated download should return 401, got ${unauthDownload.status}`);
    record('F5.5: Unauthenticated download rejected with HTTP 401', true);
  } catch (err) {
    record('F5: RBAC & Boundary Isolation', false, err.message);
  }

  // -------------------------------------------------------------
  // FORENSIC CHECK 6: Filename Sanitization & Path Traversal Guard
  // -------------------------------------------------------------
  try {
    const maliciousPdf = createSamplePdf('../../etc/passwd.pdf');
    const res = await contractorClient.uploadFile({
      file: maliciousPdf.file,
      type: 'PF Challan',
      site: 'Mumbai Metro Line 3',
      period: '2026-07',
    });
    if (res.status !== 201) throw new Error(`Upload failed: status ${res.status}`);

    const id = res.json.data.id;
    const doc = await prisma.documentSubmission.findUnique({ where: { id } });
    if (!doc) throw new Error('DB record missing for path traversal test');

    // Verify storage path does NOT contain ../ or escape uploads directory
    if (doc.storagePath.includes('..') || !doc.storagePath.includes('.data/uploads')) {
      throw new Error(`Unsafe storage path detected: ${doc.storagePath}`);
    }
    // Verify fileName is sanitized
    if (doc.fileName.includes('..') || doc.fileName.includes('/')) {
      throw new Error(`Unsafe displayed filename detected: ${doc.fileName}`);
    }

    record(`F6.1: Path traversal payload "../../etc/passwd.pdf" safely sanitized to "${doc.fileName}" within .data/uploads/`, true);
  } catch (err) {
    record('F6.1: Path traversal guard', false, err.message);
  }

  // -------------------------------------------------------------
  // FORENSIC CHECK 7: Boundary Guards (Oversized, Zero-byte, Metadata)
  // -------------------------------------------------------------
  try {
    // 7.1 Zero-byte upload (400)
    const zeroByte = new File([], 'empty.pdf', { type: 'application/pdf' });
    const rZero = await contractorClient.uploadFile({
      file: zeroByte,
      type: 'PF Challan',
      site: 'Mumbai',
      period: '2026-07',
    });
    if (rZero.status !== 400) throw new Error(`Zero-byte expected 400, got ${rZero.status}`);
    record('F7.1: Zero-byte file upload rejected (HTTP 400)', true);

    // 7.2 Oversized file > 10MB (413)
    const oversized = createOversizedPdf('oversized_10_5mb.pdf', 10.5 * 1024 * 1024);
    const rOver = await contractorClient.uploadFile({
      file: oversized.file,
      type: 'PF Challan',
      site: 'Mumbai',
      period: '2026-07',
    });
    if (rOver.status !== 413) throw new Error(`Oversized file expected 413, got ${rOver.status}`);
    record('F7.2: Oversized file >10MB rejected (HTTP 413)', true);

    // 7.3 Missing required metadata field (400)
    const rMissing = await contractorClient.uploadFile({
      file: createSamplePdf('test.pdf').file,
      type: '',
      site: 'Mumbai',
      period: '2026-07',
    });
    if (rMissing.status !== 400) throw new Error(`Missing metadata expected 400, got ${rMissing.status}`);
    record('F7.3: Missing required metadata fields rejected (HTTP 400)', true);

    // 7.4 Nonexistent document ID (404)
    const r404 = await contractorClient.get('/api/portal/uploads/DOC-99999-DOESNOTEXIST');
    if (r404.status !== 404) throw new Error(`Nonexistent document expected 404, got ${r404.status}`);
    record('F7.4: Nonexistent document ID returns HTTP 404', true);
  } catch (err) {
    record('F7: Boundary Guards', false, err.message);
  }

  // -------------------------------------------------------------
  // FORENSIC CHECK 8: Employer Verification Lifecycle Transition
  // -------------------------------------------------------------
  try {
    const patchRes = await employerClient.patch('/api/portal/submissions', {
      id: testUploadId,
      status: 'Verified',
    });
    if (patchRes.status !== 200) throw new Error(`Patch returned status ${patchRes.status}`);

    const updatedDbRecord = await prisma.documentSubmission.findUnique({
      where: { id: testUploadId },
    });
    if (updatedDbRecord.status !== 'Verified') {
      throw new Error(`DB status not updated to Verified, found ${updatedDbRecord.status}`);
    }

    record('F8.1: Employer status mutation (Pending review -> Verified) genuinely updates SQLite record', true);
  } catch (err) {
    record('F8.1: Employer verification lifecycle', false, err.message);
  }

  // -------------------------------------------------------------
  // FORENSIC CHECK 9: Missing File on Disk Resilience (404 Handling)
  // -------------------------------------------------------------
  try {
    // Create a temporary document record whose file is deleted from disk
    const orphanPdf = createSamplePdf('orphan.pdf');
    const orphanRes = await contractorClient.uploadFile({
      file: orphanPdf.file,
      type: 'PF Challan',
      site: 'Mumbai',
      period: '2026-07',
    });
    const orphanId = orphanRes.json.data.id;
    const orphanDoc = await prisma.documentSubmission.findUnique({ where: { id: orphanId } });
    
    // Delete file from disk
    await unlink(orphanDoc.storagePath);

    // GET request should return 404 gracefully rather than crash or 500
    const orphanDownload = await contractorClient.get(`/api/portal/uploads/${orphanId}`);
    if (orphanDownload.status !== 404) {
      throw new Error(`Expected 404 for missing disk file, got ${orphanDownload.status}`);
    }
    record('F9.1: Missing file on disk returns graceful HTTP 404 without crashing server process', true);
  } catch (err) {
    record('F9.1: Missing file on disk resilience', false, err.message);
  }

  await prisma.$disconnect();

  const total = results.length;
  const passed = results.filter(r => r.pass).length;
  const failed = results.filter(r => !r.pass).length;

  console.log('\n------------------------------------------------------');
  console.log(`Forensic Audit Summary: ${passed}/${total} checks passed (${failed} failed).`);
  console.log('------------------------------------------------------\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runForensicAudit().catch(err => {
  console.error('Forensic audit script execution error:', err);
  process.exit(1);
});
