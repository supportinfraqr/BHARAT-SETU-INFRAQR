import { stat, readFile, unlink } from 'node:fs/promises';
import { createHash, randomBytes } from 'node:crypto';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { BssClient } from './helpers/client.mjs';
import { assertEqual, assertTrue, assertStatus, assertDefined } from './helpers/assertions.mjs';
import {
  createSamplePdf,
  createSampleJpeg,
  createSamplePng,
  createCorruptPdf,
  createOversizedPdf,
  createDisallowedExecutable,
  TEST_USERS,
} from './helpers/fixtures.mjs';

const prisma = new PrismaClient();

async function runMilestone2AdversarialSuite() {
  console.log('\n======================================================================');
  console.log('  EMPIRICAL CHALLENGER: Milestone 2 Deep Adversarial & Stress Suite   ');
  console.log('======================================================================\n');

  const contractorClient = new BssClient();
  const employerClient = new BssClient();
  const workerClient = new BssClient();
  const staffClient = new BssClient();
  const itClient = new BssClient();
  const govClient = new BssClient();
  const unauthClient = new BssClient();
  const secondContractor = new BssClient();

  let passed = 0;
  let failed = 0;
  const testResults = [];

  function record(name, isPass, detail = '') {
    if (isPass) {
      passed++;
      console.log(`  ✓ ${name}`);
      testResults.push({ name, pass: true });
    } else {
      failed++;
      console.log(`  ✗ ${name} — ${detail}`);
      testResults.push({ name, pass: false, detail });
    }
  }

  // --- 0. Authenticate test personas ---
  console.log('--> Authenticating test roles...');
  const cLogin = await contractorClient.login('Contractor');
  assertStatus(cLogin, 200, 'Contractor login');
  const eLogin = await employerClient.login('Employer');
  assertStatus(eLogin, 200, 'Employer login');
  const wLogin = await workerClient.login('Worker');
  assertStatus(wLogin, 200, 'Worker login');
  const sLogin = await staffClient.login('BSS Staff');
  assertStatus(sLogin, 200, 'BSS Staff login');
  const itLogin = await itClient.login('BSS Admin');
  assertStatus(itLogin, 200, 'BSS Admin login');
  const gLogin = await govClient.login('Government');
  assertStatus(gLogin, 200, 'Government login');
  
  // Use distinct contractor profile BSSC198200000002 seeded in SQLite
  const c2Login = await secondContractor.login('Contractor', { identifier: 'BSSC198200000002' });
  assertStatus(c2Login, 200, 'Second contractor login');

  console.log('--> Persona authentication completed.\n');

  // =========================================================================
  // SECTION 1: Magic Byte Verification & Mismatch Permutations
  // =========================================================================
  console.log('--- SECTION 1: Magic Byte Verification & Header Mismatch Permutations ---');

  // 1.1 Valid PDF
  let uploadedPdfId = null;
  let uploadedPdfSample = null;
  try {
    uploadedPdfSample = createSamplePdf('statutory_audit_pf.pdf');
    const res = await contractorClient.uploadFile({
      file: uploadedPdfSample.file,
      type: 'PF Challan',
      site: 'Mumbai Metro Line 3',
      period: '2026-08',
      employer: 'L&T Construction',
    });
    assertStatus(res, 201);
    uploadedPdfId = res.json.data.id;
    assertEqual(res.json.data.checksum, uploadedPdfSample.checksum);
    assertEqual(res.json.data.status, 'Pending review');
    record('1.1 Valid PDF with %PDF- (0x25 0x50 0x44 0x46 0x2D) accepted', true);
  } catch (err) {
    record('1.1 Valid PDF with %PDF- (0x25 0x50 0x44 0x46 0x2D) accepted', false, err.message);
  }

  // 1.2 Valid JPEG
  let uploadedJpegId = null;
  let uploadedJpegSample = null;
  try {
    uploadedJpegSample = createSampleJpeg('safety_helmet_inspection.jpg');
    const res = await contractorClient.uploadFile({
      file: uploadedJpegSample.file,
      type: 'Safety Audit',
      site: 'Mumbai Metro Line 3',
      period: '2026-08',
      employer: 'L&T Construction',
    });
    assertStatus(res, 201);
    uploadedJpegId = res.json.data.id;
    assertEqual(res.json.data.checksum, uploadedJpegSample.checksum);
    record('1.2 Valid JPEG with 0xFF 0xD8 0xFF accepted', true);
  } catch (err) {
    record('1.2 Valid JPEG with 0xFF 0xD8 0xFF accepted', false, err.message);
  }

  // 1.3 Valid PNG
  let uploadedPngId = null;
  let uploadedPngSample = null;
  try {
    uploadedPngSample = createSamplePng('worker_badge_qr.png');
    const res = await contractorClient.uploadFile({
      file: uploadedPngSample.file,
      type: 'Wage Register',
      site: 'Mumbai Metro Line 3',
      period: '2026-08',
      employer: 'L&T Construction',
    });
    assertStatus(res, 201);
    uploadedPngId = res.json.data.id;
    assertEqual(res.json.data.checksum, uploadedPngSample.checksum);
    record('1.3 Valid PNG with 0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A accepted', true);
  } catch (err) {
    record('1.3 Valid PNG with 0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A accepted', false, err.message);
  }

  // 1.4 Spoofed PDF: Plain text disguised as PDF
  try {
    const fakePdf = createCorruptPdf('fake_text.pdf');
    const res = await contractorClient.uploadFile({
      file: fakePdf.file,
      type: 'PF Challan',
      site: 'Mumbai Metro Line 3',
      period: '2026-08',
    });
    assertStatus(res, 415);
    record('1.4 Text disguised as PDF rejected with HTTP 415', true);
  } catch (err) {
    record('1.4 Text disguised as PDF rejected with HTTP 415', false, err.message);
  }

  // 1.5 Spoofed PDF: ELF binary executable disguised as PDF
  try {
    const elfHeader = Buffer.from([0x7F, 0x45, 0x4C, 0x46, 0x02, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
    const elfFile = new File([elfHeader], 'malicious_elf.pdf', { type: 'application/pdf' });
    const res = await contractorClient.uploadFile({
      file: elfFile,
      type: 'PF Challan',
      site: 'Mumbai Metro Line 3',
      period: '2026-08',
    });
    assertStatus(res, 415);
    record('1.5 ELF executable disguised as PDF rejected with HTTP 415', true);
  } catch (err) {
    record('1.5 ELF executable disguised as PDF rejected with HTTP 415', false, err.message);
  }

  // 1.6 Spoofed PDF: ZIP / DOCX archive disguised as PDF (PK\x03\x04)
  try {
    const zipHeader = Buffer.from([0x50, 0x4B, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00]);
    const zipFile = new File([zipHeader], 'archive.pdf', { type: 'application/pdf' });
    const res = await contractorClient.uploadFile({
      file: zipFile,
      type: 'PF Challan',
      site: 'Mumbai Metro Line 3',
      period: '2026-08',
    });
    assertStatus(res, 415);
    record('1.6 ZIP / DOCX archive disguised as PDF rejected with HTTP 415', true);
  } catch (err) {
    record('1.6 ZIP / DOCX archive disguised as PDF rejected with HTTP 415', false, err.message);
  }

  // 1.7 Spoofed JPEG: Truncated / corrupt JPEG header (0xFF, 0xD8, 0x00)
  try {
    const badJpgHeader = Buffer.from([0xFF, 0xD8, 0x00, 0x10, 0x00, 0x00]);
    const badJpgFile = new File([badJpgHeader], 'corrupt.jpg', { type: 'image/jpeg' });
    const res = await contractorClient.uploadFile({
      file: badJpgFile,
      type: 'Safety Audit',
      site: 'Mumbai Metro Line 3',
      period: '2026-08',
    });
    assertStatus(res, 415);
    record('1.7 Corrupt JPEG header (0xFF 0xD8 0x00) rejected with HTTP 415', true);
  } catch (err) {
    record('1.7 Corrupt JPEG header (0xFF 0xD8 0x00) rejected with HTTP 415', false, err.message);
  }

  // 1.8 Spoofed PNG: Truncated 7-byte PNG header (missing 8th byte)
  try {
    const badPngHeader = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A]);
    const badPngFile = new File([badPngHeader], 'corrupt.png', { type: 'image/png' });
    const res = await contractorClient.uploadFile({
      file: badPngFile,
      type: 'Wage Register',
      site: 'Mumbai Metro Line 3',
      period: '2026-08',
    });
    assertStatus(res, 415);
    record('1.8 Truncated PNG header (7 bytes) rejected with HTTP 415', true);
  } catch (err) {
    record('1.8 Truncated PNG header (7 bytes) rejected with HTTP 415', false, err.message);
  }

  // 1.9 Cross-MIME Spoofing: Valid PDF magic bytes with image/png MIME
  try {
    const pdfBytes = Buffer.from('%PDF-1.5 test document bytes', 'utf-8');
    const crossFile = new File([pdfBytes], 'pdf_as_png.png', { type: 'image/png' });
    const res = await contractorClient.uploadFile({
      file: crossFile,
      type: 'Wage Register',
      site: 'Mumbai Metro Line 3',
      period: '2026-08',
    });
    assertStatus(res, 415);
    record('1.9 Cross-MIME spoofing (PDF bytes with image/png MIME) rejected with HTTP 415', true);
  } catch (err) {
    record('1.9 Cross-MIME spoofing (PDF bytes with image/png MIME) rejected with HTTP 415', false, err.message);
  }

  // 1.10 Disallowed Shell Executable
  try {
    const shFile = createDisallowedExecutable('deploy.sh');
    const res = await contractorClient.uploadFile({
      file: shFile.file,
      type: 'PF Challan',
      site: 'Mumbai Metro Line 3',
      period: '2026-08',
    });
    assertStatus(res, 415);
    record('1.10 Disallowed executable MIME (application/x-sh) rejected with HTTP 415', true);
  } catch (err) {
    record('1.10 Disallowed executable MIME (application/x-sh) rejected with HTTP 415', false, err.message);
  }

  // =========================================================================
  // SECTION 2: Size Boundaries & Stream Truncation
  // =========================================================================
  console.log('\n--- SECTION 2: Size Boundaries & Edge Cases ---');

  // 2.1 Zero-byte file
  try {
    const emptyFile = new File([], 'zero.pdf', { type: 'application/pdf' });
    const res = await contractorClient.uploadFile({
      file: emptyFile,
      type: 'PF Challan',
      site: 'Mumbai Metro Line 3',
      period: '2026-08',
    });
    assertStatus(res, 400);
    record('2.1 Zero-byte empty file upload rejected with HTTP 400', true);
  } catch (err) {
    record('2.1 Zero-byte empty file upload rejected with HTTP 400', false, err.message);
  }

  // 2.2 Exactly 10MB file boundary (10 * 1024 * 1024 bytes)
  let maxBoundaryUploadId = null;
  try {
    const exact10Mb = createOversizedPdf('exact_10mb.pdf', 10 * 1024 * 1024);
    const res = await contractorClient.uploadFile({
      file: exact10Mb.file,
      type: 'PF Challan',
      site: 'Mumbai Metro Line 3',
      period: '2026-08',
    });
    assertStatus(res, 201);
    maxBoundaryUploadId = res.json.data.id;
    record('2.2 Boundary: Exactly 10MB payload accepted with HTTP 201', true);
  } catch (err) {
    record('2.2 Boundary: Exactly 10MB payload accepted with HTTP 201', false, err.message);
  }

  // 2.3 10MB + 1 Byte file (10485761 bytes)
  try {
    const over1Byte = createOversizedPdf('over_1byte.pdf', 10 * 1024 * 1024 + 1);
    const res = await contractorClient.uploadFile({
      file: over1Byte.file,
      type: 'PF Challan',
      site: 'Mumbai Metro Line 3',
      period: '2026-08',
    });
    assertStatus(res, 413);
    record('2.3 Boundary: 10MB + 1 byte payload rejected with HTTP 413', true);
  } catch (err) {
    record('2.3 Boundary: 10MB + 1 byte payload rejected with HTTP 413', false, err.message);
  }

  // 2.4 Oversized file upload (>10.5MB)
  try {
    const oversizedPdf = createOversizedPdf('oversized_11mb.pdf', 11.2 * 1024 * 1024);
    const res = await contractorClient.uploadFile({
      file: oversizedPdf.file,
      type: 'PF Challan',
      site: 'Mumbai Metro Line 3',
      period: '2026-08',
    });
    assertStatus(res, 413);
    record('2.4 Oversized upload (>10MB) rejected with HTTP 413', true);
  } catch (err) {
    record('2.4 Oversized upload (>10MB) rejected with HTTP 413', false, err.message);
  }

  // =========================================================================
  // SECTION 3: Metadata Validation & Path Traversal Sanitization
  // =========================================================================
  console.log('\n--- SECTION 3: Metadata Validation & Path Traversal Sanitization ---');

  // 3.1 Missing metadata fields
  try {
    const sample = createSamplePdf();
    const res = await contractorClient.uploadFile({
      file: sample.file,
      type: '', // missing type
      site: 'Mumbai Metro Line 3',
      period: '2026-08',
    });
    assertStatus(res, 400);
    record('3.1 Missing required metadata field (type) rejected with HTTP 400', true);
  } catch (err) {
    record('3.1 Missing required metadata field (type) rejected with HTTP 400', false, err.message);
  }

  // 3.2 Excessively long metadata field (>200 chars)
  try {
    const sample = createSamplePdf();
    const res = await contractorClient.uploadFile({
      file: sample.file,
      type: 'PF Challan',
      site: 'A'.repeat(201),
      period: '2026-08',
    });
    assertStatus(res, 400);
    record('3.2 Metadata field exceeding 200 characters rejected with HTTP 400', true);
  } catch (err) {
    record('3.2 Metadata field exceeding 200 characters rejected with HTTP 400', false, err.message);
  }

  // 3.3 Path traversal filename attempt
  let traversalUploadId = null;
  try {
    const pdf = createSamplePdf('..\\..\\..\\..\\etc\\passwd.pdf');
    const res = await contractorClient.uploadFile({
      file: pdf.file,
      type: 'PF Challan',
      site: 'Mumbai Metro Line 3',
      period: '2026-08',
    });
    assertStatus(res, 201);
    traversalUploadId = res.json.data.id;

    // Check DB record and storage path
    const dbRec = await prisma.documentSubmission.findUnique({ where: { id: traversalUploadId } });
    assertDefined(dbRec, 'DB record must exist');
    assertTrue(!dbRec.fileName.includes('/'), 'Sanitized filename must not contain slashes');
    assertTrue(!dbRec.fileName.includes('\\'), 'Sanitized filename must not contain backslashes');
    assertTrue(!dbRec.storagePath.includes('..'), 'Storage path must not contain dot-dots');
    record('3.3 Path traversal in filename sanitized and constrained to upload dir', true);
  } catch (err) {
    record('3.3 Path traversal in filename sanitized and constrained to upload dir', false, err.message);
  }

  // =========================================================================
  // SECTION 4: Disk Storage, File Permissions, & Hash Verification
  // =========================================================================
  console.log('\n--- SECTION 4: Disk Storage, File Permissions & Hash Verification ---');

  try {
    if (!uploadedPdfId) throw new Error('PDF upload ID missing');
    const doc = await prisma.documentSubmission.findUnique({ where: { id: uploadedPdfId } });
    assertDefined(doc, 'Document record must exist in SQLite');

    // Verify disk file exists
    const fileStats = await stat(doc.storagePath);
    assertTrue(fileStats.isFile(), 'Storage path must be a regular file');
    assertEqual(fileStats.size, uploadedPdfSample.buffer.length, 'File size on disk must match original buffer');

    // Verify file POSIX permissions (0o600 on POSIX)
    const fileMode = fileStats.mode & 0o777;
    assertEqual(fileMode, 0o600, `File permissions must be 0o600 (actual: 0o${fileMode.toString(8)})`);

    // Verify directory POSIX permissions (0o700 on POSIX)
    const dirStats = await stat(path.dirname(doc.storagePath));
    const dirMode = dirStats.mode & 0o777;
    assertEqual(dirMode, 0o700, `Directory permissions must be 0o700 (actual: 0o${dirMode.toString(8)})`);

    // Read file bytes from disk and verify SHA-256 hash
    const diskBytes = await readFile(doc.storagePath);
    const diskHash = `sha256:${createHash('sha256').update(diskBytes).digest('hex')}`;
    assertEqual(diskHash, uploadedPdfSample.checksum, 'Disk file SHA-256 matches original checksum');
    assertEqual(doc.checksum, diskHash, 'SQLite checksum matches disk file SHA-256');

    record('4.1 Disk storage permissions (0o700 dir, 0o600 file) & SHA-256 hash integrity', true);
  } catch (err) {
    record('4.1 Disk storage permissions (0o700 dir, 0o600 file) & SHA-256 hash integrity', false, err.message);
  }

  // =========================================================================
  // SECTION 5: Retrieval, Streaming Download, & Security Headers
  // =========================================================================
  console.log('\n--- SECTION 5: Retrieval, Streaming Download & Security Headers ---');

  // 5.1 Owner download (GET)
  try {
    if (!uploadedPdfId) throw new Error('PDF upload ID missing');
    const res = await contractorClient.get(`/api/portal/uploads/${uploadedPdfId}`);
    assertStatus(res, 200);
    assertEqual(res.headers.get('content-type'), 'application/pdf');
    assertEqual(res.headers.get('x-content-type-options'), 'nosniff');
    assertEqual(res.headers.get('content-security-policy'), "default-src 'none'; sandbox");
    assertEqual(res.headers.get('cache-control'), 'private, no-store, max-age=0');
    assertTrue(res.headers.get('content-disposition')?.includes('inline'), 'Content-Disposition must be inline');
    record('5.1 Uploader file streaming GET with strict security headers', true);
  } catch (err) {
    record('5.1 Uploader file streaming GET with strict security headers', false, err.message);
  }

  // 5.2 HEAD request
  try {
    if (!uploadedPdfId) throw new Error('PDF upload ID missing');
    const res = await contractorClient.request(`/api/portal/uploads/${uploadedPdfId}`, { method: 'HEAD' });
    assertStatus(res, 200);
    assertEqual(res.headers.get('content-type'), 'application/pdf');
    assertEqual(res.headers.get('x-content-type-options'), 'nosniff');
    record('5.2 HEAD request returns headers without body', true);
  } catch (err) {
    record('5.2 HEAD request returns headers without body', false, err.message);
  }

  // 5.3 Bound Employer download
  try {
    if (!uploadedPdfId) throw new Error('PDF upload ID missing');
    const res = await employerClient.get(`/api/portal/uploads/${uploadedPdfId}`);
    assertStatus(res, 200);
    record('5.3 Bound Principal Employer authorized to retrieve contractor document', true);
  } catch (err) {
    record('5.3 Bound Principal Employer authorized to retrieve contractor document', false, err.message);
  }

  // 5.4 Audit roles download (Staff, IT, Gov)
  try {
    if (!uploadedPdfId) throw new Error('PDF upload ID missing');
    const staffRes = await staffClient.get(`/api/portal/uploads/${uploadedPdfId}`);
    assertStatus(staffRes, 200);
    const itRes = await itClient.get(`/api/portal/uploads/${uploadedPdfId}`);
    assertStatus(itRes, 200);
    const govRes = await govClient.get(`/api/portal/uploads/${uploadedPdfId}`);
    assertStatus(govRes, 200);
    record('5.4 Global audit roles (BSS Staff, BSS Admin, Government) authorized to retrieve', true);
  } catch (err) {
    record('5.4 Global audit roles (BSS Staff, BSS Admin, Government) authorized to retrieve', false, err.message);
  }

  // 5.5 Unrelated Worker forbidden (403)
  try {
    if (!uploadedPdfId) throw new Error('PDF upload ID missing');
    const res = await workerClient.get(`/api/portal/uploads/${uploadedPdfId}`);
    assertStatus(res, 403);
    record('5.5 Unrelated worker forbidden from downloading contractor submission (HTTP 403)', true);
  } catch (err) {
    record('5.5 Unrelated worker forbidden from downloading contractor submission (HTTP 403)', false, err.message);
  }

  // 5.6 Unrelated Contractor forbidden (403)
  try {
    if (!uploadedPdfId) throw new Error('PDF upload ID missing');
    const res = await secondContractor.get(`/api/portal/uploads/${uploadedPdfId}`);
    assertStatus(res, 403);
    record('5.6 Unrelated contractor forbidden from downloading contractor submission (HTTP 403)', true);
  } catch (err) {
    record('5.6 Unrelated contractor forbidden from downloading contractor submission (HTTP 403)', false, err.message);
  }

  // 5.7 Unauthenticated download forbidden (401)
  try {
    if (!uploadedPdfId) throw new Error('PDF upload ID missing');
    const res = await unauthClient.get(`/api/portal/uploads/${uploadedPdfId}`);
    assertStatus(res, 401);
    record('5.7 Unauthenticated client rejected with HTTP 401', true);
  } catch (err) {
    record('5.7 Unauthenticated client rejected with HTTP 401', false, err.message);
  }

  // 5.8 Missing Document in DB (404)
  try {
    const res = await contractorClient.get('/api/portal/uploads/DOC-DOESNOTEXIST-0000');
    assertStatus(res, 404);
    record('5.8 Non-existent document ID returns HTTP 404', true);
  } catch (err) {
    record('5.8 Non-existent document ID returns HTTP 404', false, err.message);
  }

  // 5.9 Missing file on disk handling (DB record exists, file deleted)
  try {
    const ghostId = `DOC-GHOST-${Date.now()}`;
    await prisma.documentSubmission.create({
      data: {
        id: ghostId,
        submittedByRole: 'Contractor',
        submittedByBssId: TEST_USERS.Contractor.subject,
        type: 'PF Challan',
        employer: 'L&T Construction',
        site: 'Mumbai Metro Line 3',
        period: '2026-08',
        fileName: 'ghost.pdf',
        fileSize: 100,
        mimeType: 'application/pdf',
        storagePath: '/tmp/non_existent_ghost_file_12345.pdf',
        checksum: 'sha256:0000000000000000000000000000000000000000000000000000000000000000',
        status: 'Pending review',
      },
    });

    const res = await contractorClient.get(`/api/portal/uploads/${ghostId}`);
    assertStatus(res, 404);
    assertEqual(res.json.error, 'Document file is missing from storage.');

    // Clean up ghost record
    await prisma.documentSubmission.delete({ where: { id: ghostId } });
    record('5.9 Missing file on disk gracefully handled with HTTP 404 without crashing', true);
  } catch (err) {
    record('5.9 Missing file on disk gracefully handled with HTTP 404 without crashing', false, err.message);
  }

  // =========================================================================
  // SECTION 6: Employer Verification Loop & Multi-Portal Sync
  // =========================================================================
  console.log('\n--- SECTION 6: Employer Verification Loop & State Transitions ---');

  // 6.1 Employer marks submission "Verified"
  try {
    if (!uploadedPdfId) throw new Error('PDF upload ID missing');
    const patchRes = await employerClient.patch('/api/portal/submissions', {
      id: uploadedPdfId,
      status: 'Verified',
    });
    assertStatus(patchRes, 200);
    assertEqual(patchRes.json.data.status, 'Verified');

    // Check DB directly
    const dbDoc = await prisma.documentSubmission.findUnique({ where: { id: uploadedPdfId } });
    assertEqual(dbDoc?.status, 'Verified', 'DB status must be Verified');

    // Check Employer portal query
    const empPortal = await employerClient.get('/api/portal');
    assertStatus(empPortal, 200);
    const empSub = empPortal.json.data.submissions.find(s => s.id === uploadedPdfId);
    assertDefined(empSub, 'Employer portal submissions must contain document');
    assertEqual(empSub.status, 'Verified', 'Employer portal status must be Verified');

    // Check Contractor portal query
    const contPortal = await contractorClient.get('/api/portal');
    assertStatus(contPortal, 200);
    const contSub = contPortal.json.data.submissions.documents.find(d => d.id === uploadedPdfId);
    assertDefined(contSub, 'Contractor portal submissions must contain document');
    assertEqual(contSub.status, 'Verified', 'Contractor portal status must be Verified');

    record('6.1 Employer transition to "Verified" updates DB & syncs across portals', true);
  } catch (err) {
    record('6.1 Employer transition to "Verified" updates DB & syncs across portals', false, err.message);
  }

  // 6.2 Employer marks submission "Returned"
  try {
    if (!uploadedPdfId) throw new Error('PDF upload ID missing');
    const patchRes = await employerClient.patch('/api/portal/submissions', {
      id: uploadedPdfId,
      status: 'Returned',
    });
    assertStatus(patchRes, 200);
    assertEqual(patchRes.json.data.status, 'Returned');

    const dbDoc = await prisma.documentSubmission.findUnique({ where: { id: uploadedPdfId } });
    assertEqual(dbDoc?.status, 'Returned', 'DB status must be Returned');
    record('6.2 Employer transition to "Returned" updates DB correctly', true);
  } catch (err) {
    record('6.2 Employer transition to "Returned" updates DB correctly', false, err.message);
  }

  // 6.3 Employer supplies invalid transition status
  try {
    if (!uploadedPdfId) throw new Error('PDF upload ID missing');
    const patchRes = await employerClient.patch('/api/portal/submissions', {
      id: uploadedPdfId,
      status: 'Approved-Hacked',
    });
    assertTrue(patchRes.status === 400 || patchRes.status === 422, `Invalid status should return 400/422 (received: ${patchRes.status})`);
    record('6.3 Invalid status value rejected by Employer portal validation (HTTP 422/400)', true);
  } catch (err) {
    record('6.3 Invalid status value rejected by Employer portal validation (HTTP 422/400)', false, err.message);
  }

  // 6.4 Unauthorized role (Worker) attempts to patch submission status
  try {
    if (!uploadedPdfId) throw new Error('PDF upload ID missing');
    const patchRes = await workerClient.patch('/api/portal/submissions', {
      id: uploadedPdfId,
      status: 'Verified',
    });
    assertStatus(patchRes, 403);
    record('6.4 Worker forbidden from executing PATCH /api/portal/submissions (HTTP 403)', true);
  } catch (err) {
    record('6.4 Worker forbidden from executing PATCH /api/portal/submissions (HTTP 403)', false, err.message);
  }

  // 6.5 Unauthorized role (Government) attempts to patch submission status
  try {
    if (!uploadedPdfId) throw new Error('PDF upload ID missing');
    const patchRes = await govClient.patch('/api/portal/submissions', {
      id: uploadedPdfId,
      status: 'Verified',
    });
    assertStatus(patchRes, 403);
    record('6.5 Government forbidden from executing PATCH /api/portal/submissions (HTTP 403)', true);
  } catch (err) {
    record('6.5 Government forbidden from executing PATCH /api/portal/submissions (HTTP 403)', false, err.message);
  }

  // =========================================================================
  // SECTION 7: Worker Leave Attachment Upload
  // =========================================================================
  console.log('\n--- SECTION 7: Worker Upload Capabilities ---');

  try {
    const workerLeavePdf = createSamplePdf('medical_certificate.pdf');
    const res = await workerClient.uploadFile({
      file: workerLeavePdf.file,
      type: 'Medical Certificate',
      site: 'Navi Mumbai Airport Works',
      period: '2026-08',
      employer: 'Shapoorji Pallonji',
    });
    assertStatus(res, 201);
    assertEqual(res.json.data.type, 'Medical Certificate');

    // Worker can download their own attachment
    const dlRes = await workerClient.get(`/api/portal/uploads/${res.json.data.id}`);
    assertStatus(dlRes, 200);

    record('7.1 Worker upload and self-retrieval flow verified', true);
  } catch (err) {
    record('7.1 Worker upload and self-retrieval flow verified', false, err.message);
  }

  // =========================================================================
  // Summary
  // =========================================================================
  console.log('\n======================================================================');
  console.log(`  EMPIRICAL CHALLENGER RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================================\n');

  await prisma.$disconnect();

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runMilestone2AdversarialSuite().catch(async (err) => {
  console.error('Fatal challenge error:', err);
  await prisma.$disconnect();
  process.exit(1);
});
