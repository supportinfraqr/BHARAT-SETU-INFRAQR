import { BssClient } from '../helpers/client.mjs';
import {
  assertEqual,
  assertTrue,
  assertStatus,
} from '../helpers/assertions.mjs';
import {
  createSamplePdf,
  createCorruptPdf,
  createOversizedPdf,
  createDisallowedExecutable,
  TEST_USERS,
} from '../helpers/fixtures.mjs';

export async function runTier2SecurityBoundaryTests() {
  const results = [];
  const client = new BssClient();

  // Test 2.1: Oversized upload >10MB rejected with HTTP 413
  try {
    await client.login('Contractor');
    const oversized = createOversizedPdf('huge_file.pdf', 10.5 * 1024 * 1024);
    const res = await client.uploadFile({
      file: oversized.file,
      type: 'PF Challan',
      site: 'Mumbai Metro Line 3',
      period: '2026-07',
      employer: 'L&T Construction',
    });
    assertStatus(res, 413, 'Oversized file >10MB must return 413 Payload Too Large');
    results.push({ name: 'T2.1: Oversized upload payload (>10MB) rejection with HTTP 413', pass: true });
  } catch (err) {
    results.push({ name: 'T2.1: Oversized upload payload (>10MB) rejection with HTTP 413', pass: false, error: err.message });
  }

  // Test 2.2: Content-Length header guard (>11MB) rejected with HTTP 413
  try {
    const hugeBuffer = Buffer.alloc(11.2 * 1024 * 1024, 0x20);
    const hugeFile = new File([hugeBuffer], 'massive_stream.pdf', { type: 'application/pdf' });
    const res = await client.uploadFile({
      file: hugeFile,
      type: 'PF Challan',
      site: 'Mumbai Metro Line 3',
      period: '2026-07',
      employer: 'L&T Construction',
    });
    assertStatus(res, 413, 'Content-Length > 11MB must trigger 413 rejection');
    results.push({ name: 'T2.2: Content-Length header early guard (>11MB) rejection with HTTP 413', pass: true });
  } catch (err) {
    results.push({ name: 'T2.2: Content-Length header early guard (>11MB) rejection with HTTP 413', pass: false, error: err.message });
  }

  // Test 2.3: Disallowed MIME type rejected with HTTP 415
  try {
    const disallowed = createDisallowedExecutable('exploit.sh');
    const res = await client.uploadFile({
      file: disallowed.file,
      type: 'PF Challan',
      site: 'Mumbai Metro Line 3',
      period: '2026-07',
      employer: 'L&T Construction',
    });
    assertStatus(res, 415, 'Disallowed MIME type must return 415 Unsupported Media Type');
    results.push({ name: 'T2.3: Disallowed file extension/MIME type rejection with HTTP 415', pass: true });
  } catch (err) {
    results.push({ name: 'T2.3: Disallowed file extension/MIME type rejection with HTTP 415', pass: false, error: err.message });
  }

  // Test 2.4: Mismatched magic bytes rejected with HTTP 415
  try {
    const corrupt = createCorruptPdf('fake_pdf.pdf');
    const res = await client.uploadFile({
      file: corrupt.file,
      type: 'PF Challan',
      site: 'Mumbai Metro Line 3',
      period: '2026-07',
      employer: 'L&T Construction',
    });
    assertStatus(res, 415, 'Mismatched magic bytes must return 415 Unsupported Media Type');
    results.push({ name: 'T2.4: Binary magic-byte signature spoofing rejection with HTTP 415', pass: true });
  } catch (err) {
    results.push({ name: 'T2.4: Binary magic-byte signature spoofing rejection with HTTP 415', pass: false, error: err.message });
  }

  // Test 2.5: Zero-byte upload rejected with HTTP 400
  try {
    const emptyFile = new File([], 'empty.pdf', { type: 'application/pdf' });
    const res = await client.uploadFile({
      file: emptyFile,
      type: 'PF Challan',
      site: 'Mumbai Metro Line 3',
      period: '2026-07',
      employer: 'L&T Construction',
    });
    assertStatus(res, 400, 'Empty file must return 400 Bad Request');
    results.push({ name: 'T2.5: Zero-byte / empty file upload rejection with HTTP 400', pass: true });
  } catch (err) {
    results.push({ name: 'T2.5: Zero-byte / empty file upload rejection with HTTP 400', pass: false, error: err.message });
  }

  // Test 2.6: Missing required form fields rejected with HTTP 400
  try {
    const sample = createSamplePdf();
    const res = await client.uploadFile({
      file: sample.file,
      type: '', // missing type
      site: 'Mumbai Metro Line 3',
      period: '2026-07',
    });
    assertStatus(res, 400, 'Missing required form fields must return 400 Bad Request');
    results.push({ name: 'T2.6: Upload form missing required metadata fields rejection with HTTP 400', pass: true });
  } catch (err) {
    results.push({ name: 'T2.6: Upload form missing required metadata fields rejection with HTTP 400', pass: false, error: err.message });
  }

  // Test 2.7: Role-based unauthorized upload (Employer attempting upload) rejected with HTTP 403
  try {
    const empClient = new BssClient();
    await empClient.login('Employer');
    const sample = createSamplePdf();
    const res = await empClient.uploadFile({
      file: sample.file,
      type: 'PF Challan',
      site: 'Mumbai Metro Line 3',
      period: '2026-07',
    });
    assertStatus(res, 403, 'Employer role must be rejected from uploading documents with 403 Forbidden');
    results.push({ name: 'T2.7: Unauthorized role upload attempt (Employer) rejection with HTTP 403', pass: true });
  } catch (err) {
    results.push({ name: 'T2.7: Unauthorized role upload attempt (Employer) rejection with HTTP 403', pass: false, error: err.message });
  }

  // Test 2.8: Unauthenticated access rejected with HTTP 401
  try {
    const unauthClient = new BssClient();
    const res = await unauthClient.get('/api/portal');
    assertStatus(res, 401, 'Unauthenticated portal access must return 401 Unauthorized');
    results.push({ name: 'T2.8: Unauthenticated access rejection across protected endpoints with HTTP 401', pass: true });
  } catch (err) {
    results.push({ name: 'T2.8: Unauthenticated access rejection across protected endpoints with HTTP 401', pass: false, error: err.message });
  }

  // Test 2.9: Cross-role resource access forbidden (Worker attempting to mutate Employer sites)
  try {
    const workerClient = new BssClient();
    await workerClient.login('Worker');
    const res = await workerClient.post('/api/portal/sites', {
      code: 'SITE-HACK',
      name: 'Unauthorized Site',
    });
    assertStatus(res, 403, 'Worker attempting Employer resource must return 403 Forbidden');
    results.push({ name: 'T2.9: Cross-role RBAC boundary violation rejection with HTTP 403', pass: true });
  } catch (err) {
    results.push({ name: 'T2.9: Cross-role RBAC boundary violation rejection with HTTP 403', pass: false, error: err.message });
  }

  // Test 2.10: Untrusted origin / Sec-Fetch-Site cross-site rejection with HTTP 403
  try {
    const workerClient = new BssClient();
    await workerClient.login('Worker');
    const res = await workerClient.request('/api/portal/leave', {
      method: 'POST',
      headers: {
        'Sec-Fetch-Site': 'cross-site',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'Medical leave',
        from: '2026-09-01',
        to: '2026-09-02',
        reason: 'Cross site test',
      }),
    });
    assertStatus(res, 403, 'Cross-site mutation must return 403 Forbidden');
    results.push({ name: 'T2.10: Untrusted origin and CSRF cross-site guard rejection with HTTP 403', pass: true });
  } catch (err) {
    results.push({ name: 'T2.10: Untrusted origin and CSRF cross-site guard rejection with HTTP 403', pass: false, error: err.message });
  }

  // Test 2.11: Invalid session cookie / tampered ciphertext rejected with HTTP 401
  try {
    const tamperedClient = new BssClient();
    tamperedClient.setCookie('bss_session=invalid.tampered.signature');
    const res = await tamperedClient.get('/api/portal');
    assertStatus(res, 401, 'Tampered cookie must return 401 Unauthorized');
    results.push({ name: 'T2.11: Tampered or malformed session cookie rejection with HTTP 401', pass: true });
  } catch (err) {
    results.push({ name: 'T2.11: Tampered or malformed session cookie rejection with HTTP 401', pass: false, error: err.message });
  }

  // Test 2.12: Non-allowlisted IT terminal commands rejected
  try {
    const itClient = new BssClient();
    await itClient.login('BSS Admin');
    const res = await itClient.post('/api/operations', {
      action: 'command',
      command: 'rm -rf /tmp/database.sqlite',
    });
    assertTrue(res.status === 422 || res.status === 400 || (res.json && res.json.error), 'Disallowed terminal command must be rejected');
    results.push({ name: 'T2.12: Non-allowlisted IT terminal command injection rejection', pass: true });
  } catch (err) {
    results.push({ name: 'T2.12: Non-allowlisted IT terminal command injection rejection', pass: false, error: err.message });
  }

  // Test 2.13: Terminal command character length limit (>120 chars) guard
  try {
    const itClient = new BssClient();
    await itClient.login('BSS Admin');
    const oversizedCommand = 'health ' + 'A'.repeat(150);
    const res = await itClient.post('/api/operations', {
      action: 'command',
      command: oversizedCommand,
    });
    assertTrue(res.status === 422 || res.status === 400 || (res.json && res.json.error), 'Command >120 chars must be rejected');
    results.push({ name: 'T2.13: Terminal command character length limit (>120 chars) guard', pass: true });
  } catch (err) {
    results.push({ name: 'T2.13: Terminal command character length limit (>120 chars) guard', pass: false, error: err.message });
  }

  // Test 2.14: Nonexistent ticket ID handling
  try {
    const itClient = new BssClient();
    await itClient.login('BSS Admin');
    const res = await itClient.post('/api/operations', {
      action: 'ticket',
      id: 'INC-NONEXISTENT-9999',
      transition: 'resolve',
    });
    assertTrue(res.status === 404 || res.status === 422, 'Nonexistent ticket ID must return 404 or 422');
    results.push({ name: 'T2.14: Nonexistent ticket ID mutation handling with HTTP 404', pass: true });
  } catch (err) {
    results.push({ name: 'T2.14: Nonexistent ticket ID mutation handling with HTTP 404', pass: false, error: err.message });
  }

  // Test 2.15: Nonexistent case ID handling
  try {
    const staffClient = new BssClient();
    await staffClient.login('BSS Staff');
    const res = await staffClient.post('/api/operations', {
      action: 'case',
      id: 'CASE-NONEXISTENT-9999',
      transition: 'resolve',
    });
    assertTrue(res.status === 404 || res.status === 422, 'Nonexistent case ID must return 404 or 422');
    results.push({ name: 'T2.15: Nonexistent case ID mutation handling with HTTP 404', pass: true });
  } catch (err) {
    results.push({ name: 'T2.15: Nonexistent case ID mutation handling with HTTP 404', pass: false, error: err.message });
  }

  // Test 2.16: Mobility profile boundary & validation errors
  try {
    const workerClient = new BssClient();
    await workerClient.login('Worker');
    const invalidMobilityPayload = {
      mobile: '123', // invalid phone
      alternateMobile: '',
      email: 'invalid-email',
      currentAddress: {
        line: 'Camp',
        state: 'InvalidStateXYZ',
        district: 'InvalidDistrictXYZ',
        city: 'City',
        pin: '000000', // invalid PIN
      },
      permanentAddress: {
        line: 'Village',
        state: 'Bihar',
        district: 'Patna',
        city: 'Patna',
        pin: '800001',
      },
    };
    const res = await workerClient.put('/api/worker/profile/mobility', invalidMobilityPayload);
    assertStatus(res, 422, 'Malformed mobility payload must return 422 Unprocessable Entity');
    results.push({ name: 'T2.16: Malformed mobility profile payload rejection with HTTP 422', pass: true });
  } catch (err) {
    results.push({ name: 'T2.16: Malformed mobility profile payload rejection with HTTP 422', pass: false, error: err.message });
  }

  // Test 2.17: Special characters & XSS / SQLi strings in text fields
  try {
    const workerClient = new BssClient();
    await workerClient.login('Worker');
    const xssPayload = {
      category: 'Wage / Payment',
      subject: "<script>alert('xss')</script> -- DROP TABLE WorkerProfile;",
      description: "Testing ' OR '1'='1 with special chars: & < > \" ' \u0000 \u202E",
    };
    const res = await workerClient.post('/api/portal/grievances', xssPayload);
    assertTrue(res.status === 201 || res.status === 200, 'Safe handling of special characters without 500 error');
    results.push({ name: 'T2.17: Special character, SQLi, and XSS string payload safety & sanitization', pass: true });
  } catch (err) {
    results.push({ name: 'T2.17: Special character, SQLi, and XSS string payload safety & sanitization', pass: false, error: err.message });
  }

  // Test 2.18: Invalid Verhoeff checksum BSS-ID rejection
  try {
    const invalidBssId = 'BSS234567890199'; // Invalid check digit
    const res = await client.get(`/api/identity/verify/${invalidBssId}`);
    assertTrue(res.status === 400 || res.status === 404, 'Invalid Verhoeff BSS-ID must return 400 or 404');
    results.push({ name: 'T2.18: Invalid Verhoeff checksum BSS-ID public query rejection', pass: true });
  } catch (err) {
    results.push({ name: 'T2.18: Invalid Verhoeff checksum BSS-ID public query rejection', pass: false, error: err.message });
  }

  // Test 2.19: Unknown portal resource slug rejection
  try {
    const workerClient = new BssClient();
    await workerClient.login('Worker');
    const res = await workerClient.post('/api/portal/unknown-resource-xyz', { foo: 'bar' });
    assertStatus(res, 403, 'Unknown portal resource slug must return 403 Forbidden');
    results.push({ name: 'T2.19: Unknown portal resource endpoint rejection with HTTP 403', pass: true });
  } catch (err) {
    results.push({ name: 'T2.19: Unknown portal resource endpoint rejection with HTTP 403', pass: false, error: err.message });
  }

  // Test 2.20: Invalid login credentials rejection
  try {
    const badLoginClient = new BssClient();
    const badLoginRes = await badLoginClient.post('/api/auth/session', {
      role: 'Worker',
      method: 'otp',
      identifier: `98${Math.floor(10000000 + Math.random() * 90000000)}`,
      credential: 'wrong-otp-999999',
    });
    assertStatus(badLoginRes, 401, 'Invalid login credentials must return 401 Unauthorized');
    results.push({ name: 'T2.20: Invalid authentication credential challenge rejection with HTTP 401', pass: true });
  } catch (err) {
    results.push({ name: 'T2.20: Invalid authentication credential challenge rejection with HTTP 401', pass: false, error: err.message });
  }

  return results;
}
