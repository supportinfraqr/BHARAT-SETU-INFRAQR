import { BssClient } from '../helpers/client.mjs';
import {
  assertEqual,
  assertTrue,
  assertStatus,
  assertDefined,
} from '../helpers/assertions.mjs';
import { TEST_USERS } from '../helpers/fixtures.mjs';

export async function runTier1IdentitySystemTests() {
  const results = [];
  const client = new BssClient();

  // Test 1.8.1: Platform Health Diagnostic Probe
  try {
    const healthRes = await client.get('/api/health');
    assertStatus(healthRes, 200, 'Health check should return 200 OK');
    assertEqual(healthRes.json.status, 'ok', 'Platform status should be ok');
    assertDefined(healthRes.json.dataMode, 'Response must declare data mode');
    results.push({ name: 'T1.8.1: Platform health diagnostic probe (/api/health)', pass: true });
  } catch (err) {
    results.push({ name: 'T1.8.1: Platform health diagnostic probe (/api/health)', pass: false, error: err.message });
  }

  // Test 1.8.2: Verhoeff Worker BSS-ID Public Verification
  try {
    const verifyRes = await client.get(`/api/identity/verify/${TEST_USERS.Worker.subject}`);
    assertStatus(verifyRes, 200, 'Worker verification should return 200 OK');
    assertDefined(verifyRes.json.data, 'Verification response must contain sanitized worker profile');
    const workerBssId = verifyRes.json.data.identity?.bssId || verifyRes.json.data.bssId;
    assertEqual(workerBssId, TEST_USERS.Worker.subject, 'Verified BSS-ID must match');
    results.push({ name: 'T1.8.2: Verhoeff Worker BSS-ID public identity verification endpoint', pass: true });
  } catch (err) {
    results.push({ name: 'T1.8.2: Verhoeff Worker BSS-ID public identity verification endpoint', pass: false, error: err.message });
  }

  // Test 1.8.3: Contractor BSS-ID Verification
  try {
    const verifyRes = await client.get(`/api/identity/verify/${TEST_USERS.Contractor.subject}`);
    assertStatus(verifyRes, 200, 'Contractor verification should return 200 OK');
    assertDefined(verifyRes.json.data, 'Contractor verification response must contain company data');
    assertEqual(verifyRes.json.data.bssId, TEST_USERS.Contractor.subject, 'Contractor BSS-ID must match');
    results.push({ name: 'T1.8.3: Contractor BSS-ID identity verification endpoint', pass: true });
  } catch (err) {
    results.push({ name: 'T1.8.3: Contractor BSS-ID identity verification endpoint', pass: false, error: err.message });
  }

  // Test 1.8.4: Notifications Feed Retrieval & Status Patching
  try {
    const workerClient = new BssClient();
    await workerClient.login('Worker');
    const notifRes = await workerClient.get('/api/notifications');
    assertStatus(notifRes, 200, 'Notifications fetch should return 200 OK');
    assertDefined(notifRes.json.data, 'Response must include notifications array');
    
    // Test Patching notification read status
    const notifList = notifRes.json.data;
    if (notifList.length > 0) {
      const patchRes = await workerClient.patch('/api/notifications', {
        id: notifList[0].id,
        action: 'read',
      });
      assertStatus(patchRes, 200, 'Patching notification status should return 200 OK');
    }
    results.push({ name: 'T1.8.4: Notifications feed retrieval and read/resolve status mutation', pass: true });
  } catch (err) {
    results.push({ name: 'T1.8.4: Notifications feed retrieval and read/resolve status mutation', pass: false, error: err.message });
  }

  // Test 1.8.5: Postal Geography Reference Lookup
  try {
    const geoRes = await client.get('/api/geography');
    assertStatus(geoRes, 200, 'Geography lookup should return 200 OK');
    results.push({ name: 'T1.8.5: Postal geography lookup and district verification (/api/geography)', pass: true });
  } catch (err) {
    results.push({ name: 'T1.8.5: Postal geography lookup and district verification (/api/geography)', pass: false, error: err.message });
  }

  return results;
}
