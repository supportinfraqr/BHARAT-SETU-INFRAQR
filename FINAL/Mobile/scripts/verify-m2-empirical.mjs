import { stat } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { BssClient } from '../tests/helpers/client.mjs';
import { assertEqual, assertTrue, assertStatus, assertDefined } from '../tests/helpers/assertions.mjs';
import { createSamplePdf, createSampleJpeg, createSamplePng, createCorruptPdf, createOversizedPdf, createDisallowedExecutable, TEST_USERS } from '../tests/helpers/fixtures.mjs';

async function runEmpiricalM2Verification() {
  console.log('\n======================================================');
  console.log('  Milestone 2: Empirical Verification & Deep Audit    ');
  console.log('======================================================\n');

  const contractorClient = new BssClient();
  const employerClient = new BssClient();
  const workerClient = new BssClient();

  let passed = 0;
  let failed = 0;

  function record(name, isPass, detail = '') {
    if (isPass) {
      passed++;
      console.log(`  ✓ ${name}`);
    } else {
      failed++;
      console.log(`  ✗ ${name} — ${detail}`);
    }
  }

  // 1. Authenticate roles
  await contractorClient.login('Contractor');
  await employerClient.login('Employer');
  await workerClient.login('Worker');

  // --- Step 1: Upload PDF, JPEG, and PNG files ---
  let pdfRecord = null;
  let jpegRecord = null;
  let pngRecord = null;

  try {
    const samplePdf = createSamplePdf('statutory_pf_ecr_challan.pdf');
    const res = await contractorClient.uploadFile({
      file: samplePdf.file,
      type: 'PF Challan',
      site: 'Mumbai Metro Line 3',
      period: '2026-07',
      employer: 'L&T Construction',
    });
    assertStatus(res, 201);
    pdfRecord = res.json.data;
    assertEqual(pdfRecord.type, 'PF Challan');
    assertEqual(pdfRecord.employer, 'L&T Construction');
    assertEqual(pdfRecord.period, '2026-07');
    assertEqual(pdfRecord.checksum, samplePdf.checksum);
    record('Contractor PDF upload with %PDF- header & SHA-256 calculation', true);
  } catch (err) {
    record('Contractor PDF upload with %PDF- header & SHA-256 calculation', false, err.message);
  }

  try {
    const sampleJpeg = createSampleJpeg('site_safety_photo.jpg');
    const res = await contractorClient.uploadFile({
      file: sampleJpeg.file,
      type: 'Safety Audit',
      site: 'Mumbai Metro Line 3',
      period: '2026-07',
      employer: 'L&T Construction',
    });
    assertStatus(res, 201);
    jpegRecord = res.json.data;
    assertEqual(jpegRecord.type, 'Safety Audit');
    assertEqual(jpegRecord.checksum, sampleJpeg.checksum);
    record('Contractor JPEG upload with 0xFF 0xD8 0xFF header & SHA-256 calculation', true);
  } catch (err) {
    record('Contractor JPEG upload with 0xFF 0xD8 0xFF header & SHA-256 calculation', false, err.message);
  }

  try {
    const samplePng = createSamplePng('worker_badge.png');
    const res = await contractorClient.uploadFile({
      file: samplePng.file,
      type: 'Wage Register',
      site: 'Mumbai Metro Line 3',
      period: '2026-07',
      employer: 'L&T Construction',
    });
    assertStatus(res, 201);
    pngRecord = res.json.data;
    assertEqual(pngRecord.type, 'Wage Register');
    assertEqual(pngRecord.checksum, samplePng.checksum);
    record('Contractor PNG upload with 0x89 PNG header & SHA-256 calculation', true);
  } catch (err) {
    record('Contractor PNG upload with 0x89 PNG header & SHA-256 calculation', false, err.message);
  }

  // --- Step 2: Verify Disk Storage Permissions & Filesystem Integrity ---
  try {
    if (!pdfRecord || !pdfRecord.id) throw new Error('PDF record missing for disk verification');
    
    // Check file download to inspect streaming
    const downloadRes = await contractorClient.get(`/api/portal/uploads/${pdfRecord.id}`);
    assertStatus(downloadRes, 200);
    assertEqual(downloadRes.headers.get('content-type'), 'application/pdf');
    assertEqual(downloadRes.headers.get('x-content-type-options'), 'nosniff');
    assertTrue(downloadRes.headers.get('content-disposition')?.includes('filename='), 'Content-Disposition must include filename');
    
    record('Secure file retrieval GET /api/portal/uploads/[id] streaming and security headers', true);
  } catch (err) {
    record('Secure file retrieval GET /api/portal/uploads/[id] streaming and security headers', false, err.message);
  }

  // --- Step 3: Authorization Matrix on /api/portal/uploads/[id] ---
  try {
    if (!pdfRecord || !pdfRecord.id) throw new Error('PDF record missing for ACL verification');

    // 1. Employer bound to contractor can retrieve
    const empDownload = await employerClient.get(`/api/portal/uploads/${pdfRecord.id}`);
    assertStatus(empDownload, 200, 'Bound employer should be able to view upload evidence');

    // 2. Unrelated worker cannot retrieve contractor document
    const workerDownload = await workerClient.get(`/api/portal/uploads/${pdfRecord.id}`);
    assertStatus(workerDownload, 403, 'Unrelated worker should be forbidden from downloading contractor submission');

    // 3. Nonexistent document returns 404
    const notFoundDownload = await contractorClient.get('/api/portal/uploads/DOC-NONEXISTENT-9999');
    assertStatus(notFoundDownload, 404, 'Nonexistent upload ID should return 404');

    record('Fine-grained RBAC authorization on /api/portal/uploads/[id]', true);
  } catch (err) {
    record('Fine-grained RBAC authorization on /api/portal/uploads/[id]', false, err.message);
  }

  // --- Step 4: Employer Verification Transition Loop ---
  try {
    if (!pdfRecord || !pdfRecord.id) throw new Error('PDF record missing for transition test');

    // Employer verifies submission
    const patchRes = await employerClient.patch('/api/portal/submissions', {
      id: pdfRecord.id,
      status: 'Verified',
    });
    assertStatus(patchRes, 200, 'Employer verification patch should succeed');

    // Verify status reflected in Employer portal
    const empPortalRes = await employerClient.get('/api/portal');
    assertStatus(empPortalRes, 200);
    const empSub = empPortalRes.json.data.submissions.find(s => s.id === pdfRecord.id);
    assertDefined(empSub, 'Employer submissions list must include uploaded doc');
    assertEqual(empSub.status, 'Verified', 'Employer submission status must be Verified');

    // Verify status reflected in Contractor portal
    const contractorPortalRes = await contractorClient.get('/api/portal');
    assertStatus(contractorPortalRes, 200);
    const contSub = contractorPortalRes.json.data.submissions.documents.find(d => d.id === pdfRecord.id);
    assertDefined(contSub, 'Contractor submissions list must include uploaded doc');
    assertEqual(contSub.status, 'Verified', 'Contractor document status must be Verified');

    record('Cross-role lifecycle: Contractor upload -> Employer verification -> Multi-portal synchronization', true);
  } catch (err) {
    record('Cross-role lifecycle: Contractor upload -> Employer verification -> Multi-portal synchronization', false, err.message);
  }

  // --- Step 5: Security Bounds & Error Guards ---
  try {
    // Oversized > 10MB
    const oversized = createOversizedPdf('oversized.pdf', 10.5 * 1024 * 1024);
    const res1 = await contractorClient.uploadFile({
      file: oversized.file,
      type: 'PF Challan',
      site: 'Mumbai Metro Line 3',
      period: '2026-07',
    });
    assertStatus(res1, 413);

    // Spoofed magic bytes
    const corrupt = createCorruptPdf('fake.pdf');
    const res2 = await contractorClient.uploadFile({
      file: corrupt.file,
      type: 'PF Challan',
      site: 'Mumbai Metro Line 3',
      period: '2026-07',
    });
    assertStatus(res2, 415);

    // Disallowed extension
    const disallowed = createDisallowedExecutable('bad.sh');
    const res3 = await contractorClient.uploadFile({
      file: disallowed.file,
      type: 'PF Challan',
      site: 'Mumbai Metro Line 3',
      period: '2026-07',
    });
    assertStatus(res3, 415);

    // Zero-byte file
    const emptyFile = new File([], 'empty.pdf', { type: 'application/pdf' });
    const res4 = await contractorClient.uploadFile({
      file: emptyFile,
      type: 'PF Challan',
      site: 'Mumbai Metro Line 3',
      period: '2026-07',
    });
    assertStatus(res4, 400);

    // Employer role upload attempt
    const empUpload = await employerClient.uploadFile({
      file: createSamplePdf().file,
      type: 'PF Challan',
      site: 'Mumbai Metro Line 3',
      period: '2026-07',
    });
    assertStatus(empUpload, 403);

    record('Security & boundary guards (oversized, magic-byte spoofing, disallowed extensions, empty file, RBAC)', true);
  } catch (err) {
    record('Security & boundary guards (oversized, magic-byte spoofing, disallowed extensions, empty file, RBAC)', false, err.message);
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed.\n`);
  if (failed > 0) process.exit(1);
}

runEmpiricalM2Verification().catch(err => {
  console.error('Empirical verification failed:', err);
  process.exit(1);
});
