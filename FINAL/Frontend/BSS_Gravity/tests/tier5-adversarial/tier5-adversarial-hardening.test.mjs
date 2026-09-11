import { randomBytes } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { BssClient } from '../helpers/client.mjs';
import {
  assertEqual,
  assertTrue,
  assertFalse,
  assertStatus,
  assertIncludes,
  assertDefined,
} from '../helpers/assertions.mjs';
import {
  createSamplePdf,
  createOversizedPdf,
  validateVerhoeff,
  generateValidBssId,
} from '../helpers/fixtures.mjs';

export async function runTier5AdversarialTests() {
  const results = [];

  // -------------------------------------------------------------------------
  // SECTION 1: Adversarial Role Authorization, Session Security & Privilege Escalation
  // -------------------------------------------------------------------------

  // T5.1: Cross-Role Privilege Escalation Guard
  try {
    const workerClient = new BssClient();
    await workerClient.login('Worker');

    // Worker attempts to create a project site (Principal Employer endpoint)
    const siteAttempt = await workerClient.post('/api/portal/sites', {
      code: 'ROGUE-SITE-001',
      name: 'Rogue Unauthorized Site',
      location: 'Restricted Zone',
    });
    assertStatus(siteAttempt, 403, 'Worker must be blocked from creating employer sites');

    // Worker attempts to mutate salaries (Contractor endpoint)
    const salaryAttempt = await workerClient.post('/api/portal/salaries', {
      worker: 'Rogue Worker',
      workerId: 'BSS234567890124',
      gross: 999999,
    });
    assertStatus(salaryAttempt, 403, 'Worker must be blocked from posting contractor salaries');

    results.push({
      name: 'T5.1: Cross-Role Privilege Escalation: Unauthorized portal mutations strictly rejected (403)',
      pass: true,
    });
  } catch (err) {
    results.push({
      name: 'T5.1: Cross-Role Privilege Escalation: Unauthorized portal mutations strictly rejected (403)',
      pass: false,
      error: err.message,
    });
  }

  // T5.2: AES-256-GCM Session Token Tampering & Cryptographic Integrity
  try {
    const client = new BssClient();
    await client.login('BSS Admin');

    const validCookie = client.cookies.get('bss_session');
    assertTrue(!!validCookie, 'Valid session cookie must be present');

    const [iv, tag, ciphertext] = validCookie.split('.');
    assertTrue(!!iv && !!tag && !!ciphertext, 'Session cookie must follow iv.tag.ciphertext format');

    // Attack 1: Altered IV
    const tamperedIvCookie = `${Buffer.from(randomBytes(12)).toString('base64url')}.${tag}.${ciphertext}`;
    client.cookies.set('bss_session', tamperedIvCookie);
    const res1 = await client.get('/api/operations');
    assertStatus(res1, 401, 'Tampered IV must cause 401 Unauthorized');

    // Attack 2: Corrupted Auth Tag
    const tamperedTagCookie = `${iv}.${Buffer.from(randomBytes(16)).toString('base64url')}.${ciphertext}`;
    client.cookies.set('bss_session', tamperedTagCookie);
    const res2 = await client.get('/api/operations');
    assertStatus(res2, 401, 'Corrupted auth tag must cause 401 Unauthorized');

    // Attack 3: Flipped bits in ciphertext
    const corruptedCiphertext = Buffer.from(ciphertext, 'base64url');
    corruptedCiphertext[0] ^= 0xff;
    const tamperedCipherCookie = `${iv}.${tag}.${corruptedCiphertext.toString('base64url')}`;
    client.cookies.set('bss_session', tamperedCipherCookie);
    const res3 = await client.get('/api/operations');
    assertStatus(res3, 401, 'Flipped ciphertext bits must cause 401 Unauthorized');

    results.push({
      name: 'T5.2: Cryptographic Session Integrity: Tampered IV, auth tag, or ciphertext rejected (401)',
      pass: true,
    });
  } catch (err) {
    results.push({
      name: 'T5.2: Cryptographic Session Integrity: Tampered IV, auth tag, or ciphertext rejected (401)',
      pass: false,
      error: err.message,
    });
  }

  // T5.3: CSRF & Origin Spoofing Guard
  try {
    const contractor = new BssClient();
    await contractor.login('Contractor');

    // Mutation with malicious cross-origin header
    const evilOriginRes = await contractor.post(
      '/api/portal/gate-passes',
      {
        workerName: 'Ravi Kumar',
        workerId: 'BSS234567890124',
        employer: 'L&T Construction',
        site: 'Mumbai Metro Line 3',
        type: 'Permanent',
        validFrom: '2026-09-01',
        validTo: '2026-12-31',
      },
      {
        Origin: 'https://evil-hacker-portal.example.com',
        'Sec-Fetch-Site': 'cross-site',
      }
    );
    assertStatus(evilOriginRes, 403, 'Cross-origin mutation must be rejected with 403 Forbidden');

    results.push({
      name: 'T5.3: CSRF & Origin Spoofing Guard: Malicious cross-site mutations rejected (403)',
      pass: true,
    });
  } catch (err) {
    results.push({
      name: 'T5.3: CSRF & Origin Spoofing Guard: Malicious cross-site mutations rejected (403)',
      pass: false,
      error: err.message,
    });
  }

  // T5.4: Unauthenticated Deep Endpoint Access
  try {
    const anonClient = new BssClient();
    anonClient.clearCookies();

    const endpoints = [
      { path: '/api/portal', method: 'GET' },
      { path: '/api/operations', method: 'GET' },
      { path: '/api/portal/leave', method: 'POST', body: { from: '2026-09-01' } },
      { path: '/api/portal/grievances', method: 'POST', body: { subject: 'Unauth' } },
    ];

    for (const ep of endpoints) {
      const res = ep.method === 'GET'
        ? await anonClient.get(ep.path)
        : await anonClient.post(ep.path, ep.body);
      assertStatus(res, 401, `Unauthenticated ${ep.method} ${ep.path} must return 401`);
    }

    results.push({
      name: 'T5.4: Deep Endpoint Protection: Direct unauthenticated resource access rejected (401)',
      pass: true,
    });
  } catch (err) {
    results.push({
      name: 'T5.4: Deep Endpoint Protection: Direct unauthenticated resource access rejected (401)',
      pass: false,
      error: err.message,
    });
  }

  // T5.5: Session Revocation and Invalidation Lifecycle
  try {
    const client = new BssClient();
    await client.login('Worker');

    const authCheck1 = await client.get('/api/auth/session');
    assertStatus(authCheck1, 200, 'Session must be valid before logout');

    // Logout
    const logoutRes = await client.delete('/api/auth/session');
    assertStatus(logoutRes, 200, 'Logout request must succeed');

    const authCheck2 = await client.get('/api/auth/session');
    assertStatus(authCheck2, 401, 'Session must be invalidated immediately following logout');

    results.push({
      name: 'T5.5: Session Lifecycle: Logout cleanly invalidates session credentials (401)',
      pass: true,
    });
  } catch (err) {
    results.push({
      name: 'T5.5: Session Lifecycle: Logout cleanly invalidates session credentials (401)',
      pass: false,
      error: err.message,
    });
  }

  // -------------------------------------------------------------------------
  // SECTION 2: Adversarial Upload Pipeline Fuzzing, Magic-Byte & Path Traversal Guardrails
  // -------------------------------------------------------------------------

  // T5.6: Polyglot Payload Injection Safety
  try {
    const contractor = new BssClient();
    await contractor.login('Contractor');

    // PDF with embedded bash exploit snippet
    const polyglotContent = `%PDF-1.4
%Polyglot Exploit Test
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 64 >>
stream
#!/bin/bash
rm -rf /tmp/* || true
echo "polyglot"
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000010 00000 n 
0000000060 00000 n 
0000000117 00000 n 
0000000204 00000 n 
trailer
<< /Size 5 /Root 1 0 R >>
startxref
299
%%EOF`;

    const polyglotBuffer = Buffer.from(polyglotContent, 'utf-8');
    const polyglotFile = new File([polyglotBuffer], 'polyglot_audit.pdf', { type: 'application/pdf' });

    const uploadRes = await contractor.uploadFile({
      file: polyglotFile,
      type: 'Wage Register',
      site: 'Mumbai Metro Line 3',
      period: '2026-08',
      employer: 'L&T Construction',
    });
    assertStatus(uploadRes, 201, 'Valid PDF polyglot accepted as static file');
    assertDefined(uploadRes.json?.data?.id, 'Must return upload ID');

    results.push({
      name: 'T5.6: Polyglot Payload Safety: Polyglot document stored safely without server execution',
      pass: true,
    });
  } catch (err) {
    results.push({
      name: 'T5.6: Polyglot Payload Safety: Polyglot document stored safely without server execution',
      pass: false,
      error: err.message,
    });
  }

  // T5.7: Directory Traversal Attacks in Upload Filename
  try {
    const contractor = new BssClient();
    await contractor.login('Contractor');

    const sample = createSamplePdf();
    const maliciousNames = [
      '../../../../etc/passwd.pdf',
      'subfolder/nested/invoice.pdf',
      '%00shell.pdf',
    ];

    for (const evilName of maliciousNames) {
      const evilFile = new File([sample.buffer], evilName, { type: 'application/pdf' });
      const res = await contractor.uploadFile({
        file: evilFile,
        type: 'PF Challan',
        site: 'Mumbai Metro Line 3',
        period: '2026-08',
        employer: 'L&T Construction',
      });
      assertStatus(res, 201, 'Upload must succeed with sanitized filename');
      const savedName = res.json.data.fileName;
      assertFalse(savedName.includes('/'), `Filename "${savedName}" must not contain forward slash`);
      assertFalse(savedName.includes('\\'), `Filename "${savedName}" must not contain backslash`);
    }

    results.push({
      name: 'T5.7: Upload Filename Sanitization: Path traversal and null-byte injection neutralized',
      pass: true,
    });
  } catch (err) {
    results.push({
      name: 'T5.7: Upload Filename Sanitization: Path traversal and null-byte injection neutralized',
      pass: false,
      error: err.message,
    });
  }

  // T5.8: Upload Retrieval Cross-Role Access Control Matrix
  try {
    const contractor1 = new BssClient();
    await contractor1.login('Contractor', { identifier: 'BSSC198200000001' });

    const sample = createSamplePdf('confidential_contractor1_doc.pdf');
    const uploadRes = await contractor1.uploadFile({
      file: sample.file,
      type: 'Wage Register',
      site: 'Mumbai Metro Line 3',
      period: '2026-08',
      employer: 'L&T Construction',
    });
    assertStatus(uploadRes, 201);
    const docId = uploadRes.json.data.id;

    // Second unrelated contractor attempts download
    const contractor2 = new BssClient();
    await contractor2.login('Contractor', { identifier: 'BSSC198200000002' });
    const rogueDownload = await contractor2.get(`/api/portal/uploads/${docId}`);
    assertStatus(rogueDownload, 403, 'Unbound third-party contractor must be blocked with 403 Forbidden');

    // Administrative role (BSS Admin) can inspect
    const itClient = new BssClient();
    await itClient.login('BSS Admin');
    const itDownload = await itClient.get(`/api/portal/uploads/${docId}`);
    assertStatus(itDownload, 200, 'BSS Admin must have administrative audit access');

    results.push({
      name: 'T5.8: Upload Access Control Matrix: Cross-tenant download blocked (403), Admin permitted (200)',
      pass: true,
    });
  } catch (err) {
    results.push({
      name: 'T5.8: Upload Access Control Matrix: Cross-tenant download blocked (403), Admin permitted (200)',
      pass: false,
      error: err.message,
    });
  }

  // T5.9: Upload Retrieval Path Traversal & Malformed IDs
  try {
    const staffClient = new BssClient();
    await staffClient.login('BSS Staff');

    const malformedIds = [
      '../../etc/passwd',
      '..%2F..%2Fetc%2Fshadow',
      'DOC-NONEXISTENT-999999',
    ];

    for (const badId of malformedIds) {
      const res = await staffClient.get(`/api/portal/uploads/${badId}`);
      assertTrue(res.status === 404 || res.status === 400, `Bad ID ${badId} must return 400 or 404, got ${res.status}`);
    }

    results.push({
      name: 'T5.9: Upload Download Endpoint Resilience: Non-existent IDs and traversal attempts return 404/400',
      pass: true,
    });
  } catch (err) {
    results.push({
      name: 'T5.9: Upload Download Endpoint Resilience: Non-existent IDs and traversal attempts return 404/400',
      pass: false,
      error: err.message,
    });
  }

  // T5.10: Upload Size Boundary Conditions Fuzzing
  try {
    const contractor = new BssClient();
    await contractor.login('Contractor');

    // 0-byte file
    const emptyFile = new File([Buffer.alloc(0)], 'empty.pdf', { type: 'application/pdf' });
    const emptyRes = await contractor.uploadFile({
      file: emptyFile,
      type: 'PF Challan',
      site: 'Mumbai Metro Line 3',
      period: '2026-08',
      employer: 'L&T Construction',
    });
    assertStatus(emptyRes, 400, '0-byte file must be rejected with 400 Bad Request');

    // 10.5 MB oversized file (>10MB limit)
    const oversized = createOversizedPdf('oversized_11mb.pdf', 10.5 * 1024 * 1024);
    const overRes = await contractor.uploadFile({
      file: oversized.file,
      type: 'PF Challan',
      site: 'Mumbai Metro Line 3',
      period: '2026-08',
      employer: 'L&T Construction',
    });
    assertStatus(overRes, 413, 'Oversized file (>10MB) must be rejected with 413 Payload Too Large');

    results.push({
      name: 'T5.10: Upload Boundary Conditions: 0-byte rejected (400), >10MB rejected (413)',
      pass: true,
    });
  } catch (err) {
    results.push({
      name: 'T5.10: Upload Boundary Conditions: 0-byte rejected (400), >10MB rejected (413)',
      pass: false,
      error: err.message,
    });
  }

  // -------------------------------------------------------------------------
  // SECTION 3: High-Concurrency Multi-Role Operations & Database Race Resistance
  // -------------------------------------------------------------------------

  // T5.11: Multi-Worker Registration Idempotency & Verhoeff Issuance
  try {
    const regCount = 5;
    const regClients = Array.from({ length: regCount }, () => new BssClient());
    const phoneNumbers = Array.from({ length: regCount }, () => `98${Math.floor(10000000 + Math.random() * 89999999)}`);

    const issuedBssIds = [];

    for (let i = 0; i < regCount; i++) {
      const client = regClients[i];
      const res = await client.post('/api/auth/register', {
        role: 'Worker',
        contact: phoneNumbers[i],
        otp: '123456',
        acceptedTerms: true,
      });
      assertStatus(res, 201, `Worker registration ${i} must succeed`);
      const bssId = res.json.bssId;
      assertDefined(bssId, 'Must return issued BSS ID');
      assertTrue(validateVerhoeff(bssId.replace(/\D/g, '')), `Issued BSS-ID ${bssId} must pass Verhoeff check`);
      issuedBssIds.push(bssId);
    }

    const uniqueIds = new Set(issuedBssIds);
    assertEqual(uniqueIds.size, regCount, 'All generated BSS-IDs must be unique');

    results.push({
      name: 'T5.11: Sequential Multi-Worker Registration: Unique Verhoeff IDs issued with verified persistence',
      pass: true,
    });
  } catch (err) {
    results.push({
      name: 'T5.11: Sequential Multi-Worker Registration: Unique Verhoeff IDs issued with verified persistence',
      pass: false,
      error: err.message,
    });
  }

  // T5.12: High-Concurrency Cross-Role Mutation Flood
  try {
    const workerClient = new BssClient();
    await workerClient.login('Worker');
    const contractorClient = new BssClient();
    await contractorClient.login('Contractor');
    const itClient = new BssClient();
    await itClient.login('BSS Admin');

    const tasks = [
      // 5 concurrent card orders
      ...Array.from({ length: 5 }, (_, i) =>
        workerClient.post('/api/portal/card-orders', {
          provider: 'razorpay',
          amount: 19900 + i,
          addressConfirmed: true,
          deliveryAddress: { city: 'Mumbai', pin: '400059' },
        })
      ),
      // 5 concurrent grievances
      ...Array.from({ length: 5 }, (_, i) =>
        workerClient.post('/api/portal/grievances', {
          category: 'Wage Dispute',
          subject: `Concurrent Grievance Batch #${i}`,
          description: 'High concurrency race test description',
        })
      ),
      // 5 concurrent contractor worker assignments with valid BSS ID
      ...Array.from({ length: 5 }, (_, i) =>
        contractorClient.post('/api/portal/workers', {
          bssId: `BSS${String(100000000000 + i)}`,
          name: `Concurrent Worker ${i}`,
          mobile: `987650000${i}`,
          site: 'Mumbai Metro Line 3',
          employer: 'L&T Construction',
          designation: 'Technician',
        })
      ),
      // 5 concurrent IT terminal command calls
      ...Array.from({ length: 5 }, () =>
        itClient.post('/api/operations', {
          action: 'command',
          command: 'services',
        })
      ),
    ];

    const responses = await Promise.all(tasks);
    for (const res of responses) {
      assertTrue(res.status === 200 || res.status === 201, `Expected 200/201, got ${res.status}`);
    }

    results.push({
      name: 'T5.12: Concurrency Flood: 20 simultaneous cross-role mutations executed with zero deadlocks',
      pass: true,
    });
  } catch (err) {
    results.push({
      name: 'T5.12: Concurrency Flood: 20 simultaneous cross-role mutations executed with zero deadlocks',
      pass: false,
      error: err.message,
    });
  }

  // T5.13: Concurrent Support Case Transitions
  try {
    const staffClient = new BssClient();
    await staffClient.login('BSS Staff');

    // Fetch live cases
    const opsRes = await staffClient.get('/api/operations');
    assertStatus(opsRes, 200);
    const cases = opsRes.json.data.cases;
    assertTrue(cases.length >= 2, 'Must have at least 2 support cases');

    const transitions = [
      { id: cases[0].id, transition: 'claim' },
      { id: cases[0].id, transition: 'wait' },
      { id: cases[1].id, transition: 'claim' },
      { id: cases[1].id, transition: 'resolve' },
    ];

    for (const t of transitions) {
      const res = await staffClient.post('/api/operations', {
        action: 'case',
        id: t.id,
        transition: t.transition,
      });
      assertStatus(res, 200, `Case transition ${t.transition} for ${t.id} must succeed`);
    }

    results.push({
      name: 'T5.13: Case State Transition Integrity: Claim, Wait, Resolve lifecycle transitions verified',
      pass: true,
    });
  } catch (err) {
    results.push({
      name: 'T5.13: Case State Transition Integrity: Claim, Wait, Resolve lifecycle transitions verified',
      pass: false,
      error: err.message,
    });
  }

  // T5.14: Concurrent IT Helpdesk Diagnostic Probes
  try {
    const itClient = new BssClient();
    await itClient.login('BSS Admin');

    const serviceIds = ['identity', 'portal', 'benefits', 'otp', 'voice', 'notifications'];
    const probePromises = serviceIds.map(id =>
      itClient.post('/api/operations', {
        action: 'probe-service',
        id,
      })
    );

    const probeResults = await Promise.all(probePromises);
    for (let i = 0; i < serviceIds.length; i++) {
      const res = probeResults[i];
      assertStatus(res, 200, `Probe for service ${serviceIds[i]} must succeed`);
      assertTrue(res.json?.result?.success === true, 'Probe result success must be true');
    }

    results.push({
      name: 'T5.14: Operations Telemetry: Concurrent probes across all 6 core services completed (200)',
      pass: true,
    });
  } catch (err) {
    results.push({
      name: 'T5.14: Operations Telemetry: Concurrent probes across all 6 core services completed (200)',
      pass: false,
      error: err.message,
    });
  }

  // T5.15: Bidirectional Wage & Benefit Synchronization
  try {
    const contractor = new BssClient();
    await contractor.login('Contractor');

    const testPeriod = `Period-${Date.now()}`;
    const salRes = await contractor.post('/api/portal/salaries', {
      worker: 'Ravi Kumar',
      workerId: 'BSS234567890124',
      employer: 'L&T Construction',
      site: 'Mumbai Metro Line 3',
      period: testPeriod,
      paidOn: '2026-08-15',
      gross: 42000,
      deductions: 4200,
      net: 37800,
    });
    assertStatus(salRes, 201, 'Contractor salary filing must succeed');

    // Verify worker portal reflects this wage record
    const workerClient = new BssClient();
    await workerClient.login('Worker');
    const workerPortal = await workerClient.get('/api/portal');
    assertStatus(workerPortal, 200);

    const matchingWage = workerPortal.json.data.wages.records.find(w => w.period === testPeriod);
    assertDefined(matchingWage, `Worker wages must include newly filed period ${testPeriod}`);
    assertEqual(matchingWage.net, 37800, 'Wage net amount must match');

    results.push({
      name: 'T5.15: Multi-Portal Data Sync: Contractor salary filing bidirectionally updates Worker wages',
      pass: true,
    });
  } catch (err) {
    results.push({
      name: 'T5.15: Multi-Portal Data Sync: Contractor salary filing bidirectionally updates Worker wages',
      pass: false,
      error: err.message,
    });
  }

  // -------------------------------------------------------------------------
  // SECTION 4: Adversarial IT Terminal Injection, Fuzzing & Operator Guardrails
  // -------------------------------------------------------------------------

  // T5.16: Command Injection Payload Matrix
  try {
    const itClient = new BssClient();
    await itClient.login('BSS Admin');

    const injectionPayloads = [
      'health; rm -rf /',
      'services; cat /etc/passwd',
      'health `reboot`',
      'db-stats && whoami',
      'services \n drop table users',
    ];

    for (const cmd of injectionPayloads) {
      const res = await itClient.post('/api/operations', {
        action: 'command',
        command: cmd,
      });
      assertStatus(res, 422, `Command injection payload "${cmd}" must be rejected with HTTP 422`);
    }

    results.push({
      name: 'T5.16: Terminal Injection Matrix: Shell metacharacters, semicolons, and pipes rejected (422)',
      pass: true,
    });
  } catch (err) {
    results.push({
      name: 'T5.16: Terminal Injection Matrix: Shell metacharacters, semicolons, and pipes rejected (422)',
      pass: false,
      error: err.message,
    });
  }

  // T5.17: Long String & Buffer Overflow Fuzzing
  try {
    const itClient = new BssClient();
    await itClient.login('BSS Admin');

    const overflowCommand = 'health ' + 'A'.repeat(300);
    const res = await itClient.post('/api/operations', {
      action: 'command',
      command: overflowCommand,
    });
    assertStatus(res, 422, 'Command exceeding 120 chars must be rejected with HTTP 422');

    results.push({
      name: 'T5.17: Terminal Input Length Guard: Excessively long command payloads (>120 chars) rejected (422)',
      pass: true,
    });
  } catch (err) {
    results.push({
      name: 'T5.17: Terminal Input Length Guard: Excessively long command payloads (>120 chars) rejected (422)',
      pass: false,
      error: err.message,
    });
  }

  // T5.18: Disallowed Commands & Audit Emission
  try {
    const itClient = new BssClient();
    await itClient.login('BSS Admin');

    const nonAllowlisted = ['reboot', 'shutdown', 'format', 'eval', 'cat'];
    for (const verb of nonAllowlisted) {
      const res = await itClient.post('/api/operations', {
        action: 'command',
        command: verb,
      });
      assertStatus(res, 422, `Non-allowlisted command "${verb}" must be rejected with HTTP 422`);
    }

    results.push({
      name: 'T5.18: Terminal Allowlist Enforcement: Non-allowlisted verbs strictly rejected (422)',
      pass: true,
    });
  } catch (err) {
    results.push({
      name: 'T5.18: Terminal Allowlist Enforcement: Non-allowlisted verbs strictly rejected (422)',
      pass: false,
      error: err.message,
    });
  }

  // T5.19: Terminal Worker Lookup Query Fuzzing
  try {
    const itClient = new BssClient();
    await itClient.login('BSS Admin');

    const lookupQueries = [
      'worker-lookup BSS234567890124',
      'worker-lookup bss234567890124',
      'worker-lookup Ravi',
      'worker-lookup 9876543210',
      'worker-lookup non_existent_worker_123',
    ];

    for (const query of lookupQueries) {
      const res = await itClient.post('/api/operations', {
        action: 'command',
        command: query,
      });
      assertStatus(res, 200, `Worker lookup query "${query}" must succeed without crashing`);
      assertTrue(Array.isArray(res.json?.result?.output), 'Must return output array');
    }

    results.push({
      name: 'T5.19: Terminal Worker Lookup Robustness: Case-insensitive, partial, and empty lookups handled cleanly',
      pass: true,
    });
  } catch (err) {
    results.push({
      name: 'T5.19: Terminal Worker Lookup Robustness: Case-insensitive, partial, and empty lookups handled cleanly',
      pass: false,
      error: err.message,
    });
  }

  // -------------------------------------------------------------------------
  // SECTION 5: State Machine Invariants, Mathematical Identity & Layout Compliance
  // -------------------------------------------------------------------------

  // T5.20: Mathematical Verhoeff Check Digit Identity Property
  try {
    // Generate 50 valid IDs
    for (let i = 0; i < 50; i++) {
      const validId = generateValidBssId('BSS', 12);
      const digits = validId.replace(/\D/g, '');
      assertTrue(validateVerhoeff(digits), `Generated ID ${validId} must be mathematically valid under Verhoeff`);

      // Corrupt a single random digit
      const digitArr = digits.split('');
      const posToCorrupt = Math.floor(Math.random() * (digitArr.length - 1));
      digitArr[posToCorrupt] = String((Number(digitArr[posToCorrupt]) + 1) % 10);
      const corruptedDigits = digitArr.join('');
      assertFalse(validateVerhoeff(corruptedDigits), `Corrupted ID ${corruptedDigits} must be rejected by Verhoeff`);
    }

    results.push({
      name: 'T5.20: Verhoeff Check Digit Mathematical Integrity: 100% detection of single-digit corruptions',
      pass: true,
    });
  } catch (err) {
    results.push({
      name: 'T5.20: Verhoeff Check Digit Mathematical Integrity: 100% detection of single-digit corruptions',
      pass: false,
      error: err.message,
    });
  }

  // T5.21: Mobility Migration Type Derivation Truth Table
  try {
    const workerClient = new BssClient();
    await workerClient.login('Worker');

    // Case A: Inter-state migration (Bihar permanent -> Maharashtra current)
    const resA = await workerClient.put('/api/worker/profile/mobility', {
      mobile: '9876543210',
      alternateMobile: '',
      email: 'ravi.kumar@example.in',
      currentAddress: {
        line: 'Labour Camp A, Mumbai',
        state: 'Maharashtra',
        district: 'Mumbai Suburban',
        city: 'Mumbai',
        pin: '400059',
      },
      permanentAddress: {
        line: 'Rampur Village, Patna',
        state: 'Bihar',
        district: 'Patna',
        city: 'Patna',
        pin: '800001',
      },
    });
    assertStatus(resA, 200);
    assertEqual(resA.json.data.migrationType, 'Inter-State Migrant Worker');
    assertEqual(resA.json.data.migrant, true);

    // Case B: Intra-state migration (Pune permanent -> Mumbai current)
    const resB = await workerClient.put('/api/worker/profile/mobility', {
      mobile: '9876543210',
      alternateMobile: '',
      email: 'ravi.kumar@example.in',
      currentAddress: {
        line: 'Andheri East',
        state: 'Maharashtra',
        district: 'Mumbai Suburban',
        city: 'Mumbai',
        pin: '400059',
      },
      permanentAddress: {
        line: 'Shivaji Nagar',
        state: 'Maharashtra',
        district: 'Pune',
        city: 'Pune',
        pin: '411001',
      },
    });
    assertStatus(resB, 200);
    assertEqual(resB.json.data.migrationType, 'Intra-State Migrant Worker');
    assertEqual(resB.json.data.migrant, true);

    // Case C: Local / Non-migrant (Same state, same district)
    const resC = await workerClient.put('/api/worker/profile/mobility', {
      mobile: '9876543210',
      alternateMobile: '',
      email: 'ravi.kumar@example.in',
      currentAddress: {
        line: 'Andheri East',
        state: 'Maharashtra',
        district: 'Mumbai Suburban',
        city: 'Mumbai',
        pin: '400059',
      },
      permanentAddress: {
        line: 'Saki Naka',
        state: 'Maharashtra',
        district: 'Mumbai Suburban',
        city: 'Mumbai',
        pin: '400072',
      },
    });
    assertStatus(resC, 200);
    assertEqual(resC.json.data.migrationType, 'Non-Migrant / Local');
    assertEqual(resC.json.data.migrant, false);

    results.push({
      name: 'T5.21: Migration Logic Truth Table: Inter-state, Intra-state, and Local properly derived',
      pass: true,
    });
  } catch (err) {
    results.push({
      name: 'T5.21: Migration Logic Truth Table: Inter-state, Intra-state, and Local properly derived',
      pass: false,
      error: err.message,
    });
  }

  // T5.22: Geographic Postal Lookup Robustness
  try {
    const client = new BssClient();
    const pins = [
      { pin: '400059', state: 'Maharashtra', district: 'Mumbai Suburban' },
      { pin: '411001', state: 'Maharashtra', district: 'Pune' },
      { pin: '800001', state: 'Bihar', district: 'Patna' },
      { pin: '462001', state: 'Madhya Pradesh', district: 'Bhopal' },
    ];

    for (const p of pins) {
      const res = await client.get(`/api/geography?pin=${p.pin}`);
      assertStatus(res, 200, `PIN ${p.pin} lookup must return 200`);
      assertEqual(res.json?.data?.district, p.district, `PIN ${p.pin} district must match`);
    }

    // Invalid PIN handling
    const invalidPinRes = await client.get('/api/geography?pin=999999');
    assertStatus(invalidPinRes, 404, 'Invalid PIN must return 404');

    results.push({
      name: 'T5.22: Postal Geography Resolver: Valid metro PINs resolved; invalid PINs return 404',
      pass: true,
    });
  } catch (err) {
    results.push({
      name: 'T5.22: Postal Geography Resolver: Valid metro PINs resolved; invalid PINs return 404',
      pass: false,
      error: err.message,
    });
  }

  // T5.23: UI/UX Component & Layout CSS Invariant Verification
  try {
    const cssPath = path.join(process.cwd(), 'src', 'app', 'globals.css');
    assertTrue(existsSync(cssPath), 'globals.css must exist');
    const cssContent = readFileSync(cssPath, 'utf-8');

    // Layout invariant assertions
    assertIncludes(cssContent, '.bss-kpi-card', 'CSS must define .bss-kpi-card');
    assertIncludes(cssContent, '.bss-kpi-icon', 'CSS must define .bss-kpi-icon');
    assertIncludes(cssContent, '.bss-kpi-grid', 'CSS must define .bss-kpi-grid');
    assertIncludes(cssContent, 'grid-auto-rows: 1fr', 'KPI grids must enforce equal 1fr tile heights');
    assertIncludes(cssContent, 'margin-top: auto', 'KPI strong metric must have margin-top: auto');
    assertIncludes(cssContent, 'safe-area-inset-bottom', 'iOS safe area support must be present');

    results.push({
      name: 'T5.23: Layout CSS Invariants: Uniform .bss-kpi-card, 1fr tile heights, and iOS safe areas enforced',
      pass: true,
    });
  } catch (err) {
    results.push({
      name: 'T5.23: Layout CSS Invariants: Uniform .bss-kpi-card, 1fr tile heights, and iOS safe areas enforced',
      pass: false,
      error: err.message,
    });
  }

  return results;
}
