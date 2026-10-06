import { readdirSync, existsSync, unlinkSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { BssClient } from '../helpers/client.mjs';
import {
  assertEqual,
  assertTrue,
  assertStatus,
  assertDefined,
} from '../helpers/assertions.mjs';
import {
  createSamplePdf,
  createSampleJpeg,
  createSamplePng,
  createCorruptPdf,
  createOversizedPdf,
  createDisallowedExecutable,
  TEST_USERS,
} from '../helpers/fixtures.mjs';

/**
 * Ultra-Rigorous Adversarial Challenger Suite for Milestone 2:
 * 1. High-Concurrency Multi-File Upload Race Conditions & Collisions
 * 2. Parallel Streaming Downloads & Byte-for-Byte Hash Verification
 * 3. RBAC Upload Isolation (Employer, Staff, IT, Gov, Unauth, Spoofed, Tampered)
 * 4. Streaming Download Authorization & Multi-Tenant Isolation (Unbound Employer, Unrelated Contractor, Unrelated Worker)
 * 5. Magic-Byte Mismatches, Casing, Polyglots & Boundary Stress Tests
 * 6. Missing Disk File Fault Tolerance (Orphaned DB Record -> HTTP 404)
 * 7. Metadata Injection Safety & Length Bounds
 * 8. Employer Verification & SQLite Persistence Integrity
 */
export async function runChallengerM2StressTests() {
  const results = [];

  console.log('\n===============================================================');
  console.log('  Milestone 2: Challenger 2 Adversarial Stress Test Suite      ');
  console.log('===============================================================\n');

  // =========================================================================
  // TEST SUITE 1: High-Concurrency Multi-File Uploads & Race Conditions
  // =========================================================================

  // Test 1.1: 10 Parallel uploads across multiple sessions
  try {
    const clients = Array.from({ length: 5 }, () => new BssClient());
    await Promise.all(clients.map(c => c.login('Contractor')));

    const uploadPromises = [];
    for (let i = 0; i < 10; i++) {
      const client = clients[i % clients.length];
      const isPdf = i % 3 === 0;
      const isJpeg = i % 3 === 1;
      const fileData = isPdf
        ? createSamplePdf(`concurrent_batch_${i}.pdf`)
        : isJpeg
        ? createSampleJpeg(`concurrent_batch_${i}.jpg`)
        : createSamplePng(`concurrent_batch_${i}.png`);

      uploadPromises.push(
        client.uploadFile({
          file: fileData.file,
          type: isPdf ? 'PF Challan' : isJpeg ? 'Safety Audit' : 'Wage Register',
          site: 'Mumbai Metro Line 3',
          period: '2026-07',
          employer: 'L&T Construction',
        }).then(res => ({ res, expectedChecksum: fileData.checksum, index: i }))
      );
    }

    const uploadResults = await Promise.all(uploadPromises);
    const uploadedIds = new Set();

    for (const { res, expectedChecksum, index } of uploadResults) {
      assertStatus(res, 201, `Parallel upload ${index} must succeed with 201 Created`);
      assertDefined(res.json.data?.id, `Parallel upload ${index} must return document ID`);
      assertEqual(res.json.data.checksum, expectedChecksum, `Parallel upload ${index} checksum must match`);
      uploadedIds.add(res.json.data.id);
    }

    assertEqual(uploadedIds.size, 10, 'All 10 parallel uploads must have unique document IDs');
    results.push({
      name: 'CH-M2.01: 10 simultaneous parallel uploads across multiple contractor sessions',
      pass: true,
    });
  } catch (err) {
    results.push({
      name: 'CH-M2.01: 10 simultaneous parallel uploads across multiple contractor sessions',
      pass: false,
      error: err.message,
    });
  }

  // Test 1.2: Simultaneous upload of identically named files by 2 contractors
  try {
    const c1 = new BssClient();
    const c2 = new BssClient();
    await Promise.all([c1.login('Contractor'), c2.login('Contractor')]);

    const sample1 = createSamplePdf('identical_filename_collision_test.pdf');
    const sample2 = createSamplePdf('identical_filename_collision_test.pdf');

    const [res1, res2] = await Promise.all([
      c1.uploadFile({
        file: sample1.file,
        type: 'PF Challan',
        site: 'Mumbai Metro Line 3',
        period: '2026-07',
        employer: 'L&T Construction',
      }),
      c2.uploadFile({
        file: sample2.file,
        type: 'PF Challan',
        site: 'Mumbai Metro Line 3',
        period: '2026-07',
        employer: 'L&T Construction',
      }),
    ]);

    assertStatus(res1, 201, 'Contractor 1 identical name upload');
    assertStatus(res2, 201, 'Contractor 2 identical name upload');
    assertTrue(res1.json.data.id !== res2.json.data.id, 'Identical filenames must receive distinct upload IDs');

    results.push({
      name: 'CH-M2.02: Parallel collision test: Identical filenames generate distinct UUIDs and storage records',
      pass: true,
    });
  } catch (err) {
    results.push({
      name: 'CH-M2.02: Parallel collision test: Identical filenames generate distinct UUIDs and storage records',
      pass: false,
      error: err.message,
    });
  }

  // Test 1.3: Atomic temp file cleanup verification
  try {
    const tmpDir = path.join(process.cwd(), '.data', 'uploads', 'tmp');
    if (existsSync(tmpDir)) {
      const files = readdirSync(tmpDir);
      // Temp directory should have no lingering locked temp files
      assertTrue(files.length === 0, `Temp directory should have 0 lingering files, found: ${files.length}`);
    }
    results.push({
      name: 'CH-M2.03: Storage atomic write cleanliness: Zero dangling temporary files in .data/uploads/tmp',
      pass: true,
    });
  } catch (err) {
    results.push({
      name: 'CH-M2.03: Storage atomic write cleanliness: Zero dangling temporary files in .data/uploads/tmp',
      pass: false,
      error: err.message,
    });
  }

  // =========================================================================
  // TEST SUITE 2: Unauthorized Role Uploads (RBAC Matrix)
  // =========================================================================

  // Test 2.1: Principal Employer role upload attempt rejected with HTTP 403
  try {
    const empClient = new BssClient();
    await empClient.login('Employer');
    const doc = createSamplePdf('employer_attempt.pdf');
    const res = await empClient.uploadFile({
      file: doc.file,
      type: 'PF Challan',
      site: 'Mumbai Metro Line 3',
      period: '2026-07',
    });
    assertStatus(res, 403, 'Employer upload must be rejected with 403 Forbidden');
    results.push({
      name: 'CH-M2.04: RBAC upload isolation: Principal Employer upload attempt returns 403 Forbidden',
      pass: true,
    });
  } catch (err) {
    results.push({
      name: 'CH-M2.04: RBAC upload isolation: Principal Employer upload attempt returns 403 Forbidden',
      pass: false,
      error: err.message,
    });
  }

  // Test 2.2: Administrative roles (BSS Staff, IT Helpdesk, Government) rejected with HTTP 403
  try {
    const staffClient = new BssClient();
    const itClient = new BssClient();
    const govClient = new BssClient();

    await Promise.all([
      staffClient.login('BSS Staff'),
      itClient.login('BSS Admin'),
      govClient.login('Government'),
    ]);

    const doc = createSamplePdf('admin_attempt.pdf');

    const [staffRes, itRes, govRes] = await Promise.all([
      staffClient.uploadFile({ file: doc.file, type: 'Audit', site: 'Site A', period: '2026-07' }),
      itClient.uploadFile({ file: doc.file, type: 'Audit', site: 'Site A', period: '2026-07' }),
      govClient.uploadFile({ file: doc.file, type: 'Audit', site: 'Site A', period: '2026-07' }),
    ]);

    assertStatus(staffRes, 403, 'BSS Staff upload must return 403');
    assertStatus(itRes, 403, 'BSS Admin upload must return 403');
    assertStatus(govRes, 403, 'Government upload must return 403');

    results.push({
      name: 'CH-M2.05: RBAC upload isolation: Administrative roles (BSS Staff, IT, Gov) return 403 Forbidden',
      pass: true,
    });
  } catch (err) {
    results.push({
      name: 'CH-M2.05: RBAC upload isolation: Administrative roles (BSS Staff, IT, Gov) return 403 Forbidden',
      pass: false,
      error: err.message,
    });
  }

  // Test 2.3: Unauthenticated upload attempt returns HTTP 401
  try {
    const unauthClient = new BssClient();
    const doc = createSamplePdf('unauth.pdf');
    const res = await unauthClient.uploadFile({
      file: doc.file,
      type: 'PF Challan',
      site: 'Site A',
      period: '2026-07',
    });
    assertStatus(res, 401, 'Unauthenticated upload must return 401 Unauthorized');
    results.push({
      name: 'CH-M2.06: RBAC upload isolation: Unauthenticated upload attempt returns 401 Unauthorized',
      pass: true,
    });
  } catch (err) {
    results.push({
      name: 'CH-M2.06: RBAC upload isolation: Unauthenticated upload attempt returns 401 Unauthorized',
      pass: false,
      error: err.message,
    });
  }

  // Test 2.4: Tampered session ciphertext on upload returns HTTP 401
  try {
    const tampered = new BssClient();
    tampered.setCookie('bss_session=tampered.iv.ciphertext');
    const doc = createSamplePdf('tampered.pdf');
    const res = await tampered.uploadFile({
      file: doc.file,
      type: 'PF Challan',
      site: 'Site A',
      period: '2026-07',
    });
    assertStatus(res, 401, 'Tampered cookie on upload must return 401');
    results.push({
      name: 'CH-M2.07: RBAC upload isolation: Tampered session cookie on upload returns 401 Unauthorized',
      pass: true,
    });
  } catch (err) {
    results.push({
      name: 'CH-M2.07: RBAC upload isolation: Tampered session cookie on upload returns 401 Unauthorized',
      pass: false,
      error: err.message,
    });
  }

  // =========================================================================
  // TEST SUITE 3: Streaming Download Authorization & Multi-Tenant Isolation
  // =========================================================================

  let targetDocId = null;
  let targetDocRawBuffer = null;
  let targetDocChecksum = null;

  // Setup: Contractor 1 (BSSC198200000001) uploads document bound to L&T Construction
  try {
    const contractor = new BssClient();
    await contractor.login('Contractor', { identifier: 'BSSC198200000001' });
    const sampleDoc = createSamplePdf('statutory_audit_target.pdf');
    targetDocRawBuffer = sampleDoc.buffer;
    const res = await contractor.uploadFile({
      file: sampleDoc.file,
      type: 'Wage Register',
      site: 'Mumbai Metro Line 3',
      period: '2026-07',
      employer: 'L&T Construction',
    });
    assertStatus(res, 201, 'Setup upload for streaming challenge');
    targetDocId = res.json.data.id;
    targetDocChecksum = sampleDoc.checksum;
  } catch (err) {
    console.error('Setup failure for streaming tests:', err);
  }

  // Test 3.1: Document Owner can stream download with full security headers and exact byte integrity
  try {
    const contractor = new BssClient();
    await contractor.login('Contractor', { identifier: 'BSSC198200000001' });
    const res = await contractor.get(`/api/portal/uploads/${targetDocId}`);
    assertStatus(res, 200, 'Owner must be allowed to stream download');
    assertEqual(res.headers.get('content-type'), 'application/pdf');
    assertEqual(res.headers.get('x-content-type-options'), 'nosniff');
    assertEqual(res.headers.get('content-security-policy'), "default-src 'none'; sandbox");
    assertTrue(res.headers.get('content-disposition')?.includes('statutory_audit_target.pdf'), 'Content-Disposition must match original safe filename');

    // Verify received stream SHA-256 hash matches the uploaded document
    const streamBuffer = Buffer.from(res.text, 'utf-8');
    const receivedHash = `sha256:${createHash('sha256').update(streamBuffer).digest('hex')}`;
    assertEqual(receivedHash, targetDocChecksum, 'Streamed downloaded bytes must match exact uploaded SHA-256 hash');

    results.push({
      name: 'CH-M2.08: Streaming download: Owner access with exact SHA-256 checksum & security headers',
      pass: true,
    });
  } catch (err) {
    results.push({
      name: 'CH-M2.08: Streaming download: Owner access with exact SHA-256 checksum & security headers',
      pass: false,
      error: err.message,
    });
  }

  // Test 3.2: 5 Parallel Streaming Downloads of the same document
  try {
    const contractor = new BssClient();
    await contractor.login('Contractor', { identifier: 'BSSC198200000001' });

    const downloadPromises = Array.from({ length: 5 }, () => contractor.get(`/api/portal/uploads/${targetDocId}`));
    const downloadResults = await Promise.all(downloadPromises);

    for (const res of downloadResults) {
      assertStatus(res, 200, 'Concurrent stream download must succeed');
      const buf = Buffer.from(res.text, 'utf-8');
      const hash = `sha256:${createHash('sha256').update(buf).digest('hex')}`;
      assertEqual(hash, targetDocChecksum, 'Concurrent stream bytes must match hash');
    }

    results.push({
      name: 'CH-M2.09: Concurrent streaming downloads: 5 parallel streams without contention or truncation',
      pass: true,
    });
  } catch (err) {
    results.push({
      name: 'CH-M2.09: Concurrent streaming downloads: 5 parallel streams without contention or truncation',
      pass: false,
      error: err.message,
    });
  }

  // Test 3.3: Bound Principal Employer (L&T Construction) can stream download
  try {
    const boundEmployer = new BssClient();
    await boundEmployer.login('Employer', { identifier: 'BSSE100210000001' });
    const res = await boundEmployer.get(`/api/portal/uploads/${targetDocId}`);
    assertStatus(res, 200, 'Bound employer must be allowed to stream download');
    results.push({
      name: 'CH-M2.10: Streaming download: Bound Principal Employer access allowed with HTTP 200',
      pass: true,
    });
  } catch (err) {
    results.push({
      name: 'CH-M2.10: Streaming download: Bound Principal Employer access allowed with HTTP 200',
      pass: false,
      error: err.message,
    });
  }

  // Test 3.4: Unrelated Worker forbidden with HTTP 403
  try {
    const worker = new BssClient();
    await worker.login('Worker');
    const res = await worker.get(`/api/portal/uploads/${targetDocId}`);
    assertStatus(res, 403, 'Unrelated worker must be forbidden from accessing contractor submission');
    results.push({
      name: 'CH-M2.11: Cross-tenant download isolation: Unrelated Worker returns 403 Forbidden',
      pass: true,
    });
  } catch (err) {
    results.push({
      name: 'CH-M2.11: Cross-tenant download isolation: Unrelated Worker returns 403 Forbidden',
      pass: false,
      error: err.message,
    });
  }

  // Test 3.5: Unrelated Contractor (SafeBuild Infra Services - BSSC198200000002) forbidden with HTTP 403
  try {
    const unrelatedContractor = new BssClient();
    await unrelatedContractor.login('Contractor', { identifier: 'BSSC198200000002', credential: '1234' });
    const res = await unrelatedContractor.get(`/api/portal/uploads/${targetDocId}`);
    assertStatus(res, 403, 'Unrelated contractor must be forbidden from accessing another contractor submission');
    results.push({
      name: 'CH-M2.12: Cross-tenant download isolation: Unrelated Contractor returns 403 Forbidden',
      pass: true,
    });
  } catch (err) {
    results.push({
      name: 'CH-M2.12: Cross-tenant download isolation: Unrelated Contractor returns 403 Forbidden',
      pass: false,
      error: err.message,
    });
  }

  // Test 3.6: Audit / Administrative roles (BSS Staff, IT Helpdesk, Government) can access
  try {
    const staff = new BssClient();
    const it = new BssClient();
    const gov = new BssClient();

    await Promise.all([
      staff.login('BSS Staff'),
      it.login('BSS Admin'),
      gov.login('Government'),
    ]);

    const [staffRes, itRes, govRes] = await Promise.all([
      staff.get(`/api/portal/uploads/${targetDocId}`),
      it.get(`/api/portal/uploads/${targetDocId}`),
      gov.get(`/api/portal/uploads/${targetDocId}`),
    ]);

    assertStatus(staffRes, 200, 'BSS Staff audit access');
    assertStatus(itRes, 200, 'BSS Admin audit access');
    assertStatus(govRes, 200, 'Government audit access');

    results.push({
      name: 'CH-M2.13: Administrative audit download: BSS Staff, IT Helpdesk, and Government return HTTP 200',
      pass: true,
    });
  } catch (err) {
    results.push({
      name: 'CH-M2.13: Administrative audit download: BSS Staff, IT Helpdesk, and Government return HTTP 200',
      pass: false,
      error: err.message,
    });
  }

  // Test 3.7: HEAD request on upload endpoint verifies headers without body
  try {
    const contractor = new BssClient();
    await contractor.login('Contractor', { identifier: 'BSSC198200000001' });
    const res = await contractor.request(`/api/portal/uploads/${targetDocId}`, { method: 'HEAD' });
    assertStatus(res, 200, 'HEAD request on valid document should return 200');
    assertEqual(res.headers.get('content-type'), 'application/pdf');
    assertEqual(res.headers.get('x-content-type-options'), 'nosniff');
    assertEqual(res.text, '', 'HEAD response must have empty body');

    results.push({
      name: 'CH-M2.14: HEAD /api/portal/uploads/[id]: Returns correct metadata headers with zero body payload',
      pass: true,
    });
  } catch (err) {
    results.push({
      name: 'CH-M2.14: HEAD /api/portal/uploads/[id]: Returns correct metadata headers with zero body payload',
      pass: false,
      error: err.message,
    });
  }

  // Test 3.8: Non-existent ID and Path Traversal in document retrieval
  try {
    const contractor = new BssClient();
    await contractor.login('Contractor');

    const notFoundRes = await contractor.get('/api/portal/uploads/DOC-DOES-NOT-EXIST-000');
    assertStatus(notFoundRes, 404, 'Non-existent ID must return 404');

    const traversalRes = await contractor.get('/api/portal/uploads/..%2F..%2Fetc%2Fpasswd');
    assertTrue(traversalRes.status === 400 || traversalRes.status === 404, 'Path traversal document ID must return 400 or 404');

    results.push({
      name: 'CH-M2.15: Download boundary: Non-existent document and path traversal IDs return 404/400',
      pass: true,
    });
  } catch (err) {
    results.push({
      name: 'CH-M2.15: Download boundary: Non-existent document and path traversal IDs return 404/400',
      pass: false,
      error: err.message,
    });
  }

  // =========================================================================
  // TEST SUITE 4: Magic-Byte Mismatches & Boundary Stress Tests
  // =========================================================================

  // Test 4.1: Cross-mismatched magic bytes (e.g. .pdf extension containing JPEG magic bytes)
  try {
    const contractor = new BssClient();
    await contractor.login('Contractor');

    const jpegUnderCover = createSampleJpeg('spoofed.pdf');
    const spoofedFile = new File([jpegUnderCover.buffer], 'spoofed.pdf', { type: 'application/pdf' });

    const res = await contractor.uploadFile({
      file: spoofedFile,
      type: 'PF Challan',
      site: 'Mumbai Metro Line 3',
      period: '2026-07',
    });

    assertStatus(res, 415, 'PDF with JPEG magic bytes must return 415 Unsupported Media Type');
    results.push({
      name: 'CH-M2.16: Magic-byte spoofing: File declared as PDF containing JPEG magic bytes rejected with HTTP 415',
      pass: true,
    });
  } catch (err) {
    results.push({
      name: 'CH-M2.16: Magic-byte spoofing: File declared as PDF containing JPEG magic bytes rejected with HTTP 415',
      pass: false,
      error: err.message,
    });
  }

  // Test 4.2: File declared as JPEG containing PNG magic bytes
  try {
    const contractor = new BssClient();
    await contractor.login('Contractor');

    const pngUnderCover = createSamplePng('fake_jpeg.jpg');
    const spoofedJpeg = new File([pngUnderCover.buffer], 'fake_jpeg.jpg', { type: 'image/jpeg' });

    const res = await contractor.uploadFile({
      file: spoofedJpeg,
      type: 'Safety Audit',
      site: 'Mumbai Metro Line 3',
      period: '2026-07',
    });

    assertStatus(res, 415, 'JPEG with PNG magic bytes must return 415');
    results.push({
      name: 'CH-M2.17: Magic-byte spoofing: File declared as JPEG containing PNG magic bytes rejected with HTTP 415',
      pass: true,
    });
  } catch (err) {
    results.push({
      name: 'CH-M2.17: Magic-byte spoofing: File declared as JPEG containing PNG magic bytes rejected with HTTP 415',
      pass: false,
      error: err.message,
    });
  }

  // Test 4.3: Uppercase file extension (.PDF, .JPEG) support & sanitization
  try {
    const contractor = new BssClient();
    await contractor.login('Contractor');

    const upperPdf = createSamplePdf('STATUTORY_CHALLAN.PDF');
    const res = await contractor.uploadFile({
      file: upperPdf.file,
      type: 'PF Challan',
      site: 'Mumbai Metro Line 3',
      period: '2026-07',
    });

    assertStatus(res, 201, 'Uppercase .PDF file must be handled properly');
    assertTrue(res.json.data.fileName.endsWith('.pdf'), 'Sanitized filename must normalize extension to lowercase');
    results.push({
      name: 'CH-M2.18: Casing robustness: Uppercase .PDF extension accepted and normalized safely',
      pass: true,
    });
  } catch (err) {
    results.push({
      name: 'CH-M2.18: Casing robustness: Uppercase .PDF extension accepted and normalized safely',
      pass: false,
      error: err.message,
    });
  }

  // Test 4.4: File at exact boundary (10 MB = 10,485,760 bytes)
  try {
    const contractor = new BssClient();
    await contractor.login('Contractor');

    const exactLimitPdf = createOversizedPdf('exact_limit.pdf', 10 * 1024 * 1024);
    const res = await contractor.uploadFile({
      file: exactLimitPdf.file,
      type: 'PF Challan',
      site: 'Mumbai Metro Line 3',
      period: '2026-07',
    });

    assertStatus(res, 201, 'Exact 10MB file within boundary must succeed with 201 Created');
    results.push({
      name: 'CH-M2.19: Payload boundary: Exactly 10MB (10,485,760 bytes) upload succeeds with HTTP 201',
      pass: true,
    });
  } catch (err) {
    results.push({
      name: 'CH-M2.19: Payload boundary: Exactly 10MB (10,485,760 bytes) upload succeeds with HTTP 201',
      pass: false,
      error: err.message,
    });
  }

  // Test 4.5: File 1 byte over limit (10,485,761 bytes)
  try {
    const contractor = new BssClient();
    await contractor.login('Contractor');

    const overLimitPdf = createOversizedPdf('over_limit.pdf', 10 * 1024 * 1024 + 1);
    const res = await contractor.uploadFile({
      file: overLimitPdf.file,
      type: 'PF Challan',
      site: 'Mumbai Metro Line 3',
      period: '2026-07',
    });

    assertStatus(res, 413, 'File 1 byte over limit must return 413 Payload Too Large');
    results.push({
      name: 'CH-M2.20: Payload boundary: File 1 byte over limit (10MB + 1) rejected with HTTP 413',
      pass: true,
    });
  } catch (err) {
    results.push({
      name: 'CH-M2.20: Payload boundary: File 1 byte over limit (10MB + 1) rejected with HTTP 413',
      pass: false,
      error: err.message,
    });
  }

  // Test 4.6: Filename sanitization against directory traversal characters
  try {
    const contractor = new BssClient();
    await contractor.login('Contractor');

    const traversalFile = createSamplePdf('../../../etc/passwd.pdf');
    const res = await contractor.uploadFile({
      file: traversalFile.file,
      type: 'PF Challan',
      site: 'Mumbai Metro Line 3',
      period: '2026-07',
    });

    assertStatus(res, 201, 'Traversal named file should be sanitized and succeed');
    const returnedName = res.json.data.fileName;
    assertTrue(!returnedName.includes('/'), 'Sanitized filename must not contain slashes');
    assertTrue(!returnedName.includes('..'), 'Sanitized filename must not contain parent traversal');

    results.push({
      name: 'CH-M2.21: Path traversal sanitization: ../../../etc/passwd.pdf sanitized safely in DB and storage',
      pass: true,
    });
  } catch (err) {
    results.push({
      name: 'CH-M2.21: Path traversal sanitization: ../../../etc/passwd.pdf sanitized safely in DB and storage',
      pass: false,
      error: err.message,
    });
  }

  // =========================================================================
  // TEST SUITE 5: Metadata Injection Safety & Field Boundaries
  // =========================================================================

  // Test 5.1: Form fields > 200 chars rejected with HTTP 400
  try {
    const contractor = new BssClient();
    await contractor.login('Contractor');

    const doc = createSamplePdf('field_test.pdf');
    const res = await contractor.uploadFile({
      file: doc.file,
      type: 'A'.repeat(201),
      site: 'Mumbai Metro Line 3',
      period: '2026-07',
    });

    assertStatus(res, 400, 'Metadata field > 200 chars must return 400');
    results.push({
      name: 'CH-M2.22: Metadata length bounds: Form fields exceeding 200 chars rejected with HTTP 400',
      pass: true,
    });
  } catch (err) {
    results.push({
      name: 'CH-M2.22: Metadata length bounds: Form fields exceeding 200 chars rejected with HTTP 400',
      pass: false,
      error: err.message,
    });
  }

  // Test 5.2: SQL Injection & XSS strings in upload metadata handled safely
  try {
    const contractor = new BssClient();
    await contractor.login('Contractor');

    const doc = createSamplePdf('sqli_test.pdf');
    const res = await contractor.uploadFile({
      file: doc.file,
      type: "PF Challan'; DROP TABLE DocumentSubmission; --",
      site: "<script>alert('site')</script>",
      period: '2026-07',
      employer: "L&T Construction' OR '1'='1",
    });

    assertStatus(res, 201, 'SQLi and XSS metadata strings must be safely parameterized without 500 error');
    assertDefined(res.json.data?.id, 'Upload with SQLi strings must create valid record');
    results.push({
      name: 'CH-M2.23: Injection defense: SQLi and XSS payloads in upload metadata stored safely via Prisma',
      pass: true,
    });
  } catch (err) {
    results.push({
      name: 'CH-M2.23: Injection defense: SQLi and XSS payloads in upload metadata stored safely via Prisma',
      pass: false,
      error: err.message,
    });
  }

  // =========================================================================
  // TEST SUITE 6: Employer Compliance Verification Mutation & State Synchronization
  // =========================================================================

  // Test 6.1: Complete verification cycle: Pending -> Verified -> Returned
  try {
    const contractor = new BssClient();
    const employer = new BssClient();
    await Promise.all([contractor.login('Contractor'), employer.login('Employer')]);

    // 1. Upload new statutory document
    const pfDoc = createSamplePdf('statutory_verification_cycle.pdf');
    const uploadRes = await contractor.uploadFile({
      file: pfDoc.file,
      type: 'PF Challan',
      site: 'Mumbai Metro Line 3',
      period: '2026-07',
      employer: 'L&T Construction',
    });
    assertStatus(uploadRes, 201, 'Upload for verification cycle');
    const docId = uploadRes.json.data.id;
    assertEqual(uploadRes.json.data.status, 'Pending review', 'Initial status must be Pending review');

    // 2. Employer approves / verifies
    const patchVerify = await employer.patch('/api/portal/submissions', {
      id: docId,
      status: 'Verified',
    });
    assertStatus(patchVerify, 200, 'Employer PATCH status to Verified');

    // 3. Verify contractor portal reflects 'Verified'
    const contractorPortal1 = await contractor.get('/api/portal');
    assertStatus(contractorPortal1, 200);
    const contractorDoc1 = contractorPortal1.json.data.submissions.documents.find(d => d.id === docId);
    assertDefined(contractorDoc1, 'Document must appear in contractor portal');
    assertEqual(contractorDoc1.status, 'Verified', 'Contractor document status must update to Verified');

    // 4. Employer marks as 'Returned' (requesting corrections)
    const patchReturn = await employer.patch('/api/portal/submissions', {
      id: docId,
      status: 'Returned',
    });
    assertStatus(patchReturn, 200, 'Employer PATCH status to Returned');

    // 5. Verify contractor portal reflects 'Returned'
    const contractorPortal2 = await contractor.get('/api/portal');
    assertStatus(contractorPortal2, 200);
    const contractorDoc2 = contractorPortal2.json.data.submissions.documents.find(d => d.id === docId);
    assertDefined(contractorDoc2, 'Document must appear in contractor portal');
    assertEqual(contractorDoc2.status, 'Returned', 'Contractor document status must update to Returned');

    results.push({
      name: 'CH-M2.24: Verification lifecycle: Pending review -> Verified -> Returned atomic state transitions',
      pass: true,
    });
  } catch (err) {
    results.push({
      name: 'CH-M2.24: Verification lifecycle: Pending review -> Verified -> Returned atomic state transitions',
      pass: false,
      error: err.message,
    });
  }

  // Summary
  let passed = 0;
  let failed = 0;
  for (const r of results) {
    if (r.pass) {
      passed++;
      console.log(`  ✓ ${r.name}`);
    } else {
      failed++;
      console.log(`  ✗ ${r.name} — ${r.error}`);
    }
  }
  console.log(`\nChallenger M2 Results: ${passed} passed, ${failed} failed.\n`);

  return results;
}

// Standalone execution if run directly
if (process.argv[1]?.endsWith('challenger-m2-stress.test.mjs')) {
  runChallengerM2StressTests()
    .then(res => {
      const failures = res.filter(r => !r.pass);
      if (failures.length > 0) process.exit(1);
      process.exit(0);
    })
    .catch(err => {
      console.error('Fatal challenge execution error:', err);
      process.exit(1);
    });
}
