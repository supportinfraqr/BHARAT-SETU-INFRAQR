import { BssClient } from '../helpers/client.mjs';
import {
  assertEqual,
  assertTrue,
  assertStatus,
  assertDefined,
} from '../helpers/assertions.mjs';
import { TEST_USERS } from '../helpers/fixtures.mjs';

export async function runTier1WorkerTests() {
  const results = [];
  const client = new BssClient();

  // Test 1.1: Worker Authentication
  try {
    const loginRes = await client.login('Worker');
    assertStatus(loginRes, 200, 'Worker login should return 200 OK');
    assertTrue(loginRes.json.authenticated, 'Worker session should be authenticated');
    assertEqual(loginRes.json.role, 'Worker', 'Session role must be Worker');
    assertEqual(loginRes.json.redirectTo, '/worker', 'Worker redirect should be /worker');
    results.push({ name: 'T1.1.1: Worker authentication via OTP', pass: true });
  } catch (err) {
    results.push({ name: 'T1.1.1: Worker authentication via OTP', pass: false, error: err.message });
  }

  // Test 1.2: Worker Portal Retrieval
  try {
    const portalRes = await client.get('/api/portal');
    assertStatus(portalRes, 200, 'Worker portal fetch should return 200 OK');
    assertDefined(portalRes.json.data, 'Portal response must contain data');
    const data = portalRes.json.data;
    const workerIdentity = data.worker?.identity || data.identity;
    assertDefined(workerIdentity, 'Worker portal must contain identity object');
    assertDefined(data.wages, 'Worker portal must contain wages dataset');
    assertDefined(data.attendance, 'Worker portal must contain attendance dataset');
    assertDefined(data.documents, 'Worker portal must contain documents array');
    results.push({ name: 'T1.2: Worker portal profile, wages, and compliance retrieval', pass: true });
  } catch (err) {
    results.push({ name: 'T1.2: Worker portal profile, wages, and compliance retrieval', pass: false, error: err.message });
  }

  // Test 1.3: Worker Leave Application Submission
  try {
    const leavePayload = {
      type: 'Medical leave',
      from: '2026-09-05',
      to: '2026-09-07',
      reason: 'Undergoing routine medical checkup at primary health center',
    };
    const leaveRes = await client.post('/api/portal/leave', leavePayload);
    assertStatus(leaveRes, 201, 'Worker leave application should return 201 Created');
    assertDefined(leaveRes.json.data || leaveRes.json.id, 'Leave submission must return created record');
    results.push({ name: 'T1.3: Worker statutory leave application submission', pass: true });
  } catch (err) {
    results.push({ name: 'T1.3: Worker statutory leave application submission', pass: false, error: err.message });
  }

  // Test 1.4: Worker Grievance Filing
  try {
    const grievancePayload = {
      category: 'Wage / Payment',
      subject: 'Delay in monthly wage credit for July 2026',
      description: 'The contractor has delayed transferring July wage payment beyond the 7th of August.',
    };
    const grievanceRes = await client.post('/api/portal/grievances', grievancePayload);
    assertStatus(grievanceRes, 201, 'Worker grievance filing should return 201 Created');
    assertDefined(grievanceRes.json.data || grievanceRes.json.id, 'Grievance submission must return created grievance');
    results.push({ name: 'T1.4: Worker grievance filing and dispute registration', pass: true });
  } catch (err) {
    results.push({ name: 'T1.4: Worker grievance filing and dispute registration', pass: false, error: err.message });
  }

  // Test 1.5: Worker Availability Toggle
  try {
    const availRes = await client.post('/api/portal/availability', { available: true });
    assertStatus(availRes, 201, 'Worker availability toggle should return 201 Created');
    results.push({ name: 'T1.5: Worker employment availability status toggle', pass: true });
  } catch (err) {
    results.push({ name: 'T1.5: Worker employment availability status toggle', pass: false, error: err.message });
  }

  // Test 1.6: Worker Smart Card Order Creation
  try {
    const cardRes = await client.post('/api/card-orders', {
      provider: 'razorpay',
      addressConfirmed: true,
      address: {
        line: 'Flat 402, Shramik Vihar',
        district: 'Patna',
        state: 'Bihar',
        city: 'Patna',
        pin: '800001',
        mobile: '9876543210',
      },
    });
    assertStatus(cardRes, 201, 'Card order creation should return 201 Created');
    assertDefined(cardRes.json.requestId || cardRes.json.id, 'Card order response must include order identifier');
    results.push({ name: 'T1.6: Worker physical BSS Smart Card order initiation', pass: true });
  } catch (err) {
    results.push({ name: 'T1.6: Worker physical BSS Smart Card order initiation', pass: false, error: err.message });
  }

  // Test 1.7: Worker Mobility Profile Update
  try {
    const mobilityPayload = {
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
    };
    const mobilityRes = await client.put('/api/worker/profile/mobility', mobilityPayload);
    assertStatus(mobilityRes, 200, 'Worker mobility update should return 200 OK');
    assertTrue(mobilityRes.json.success, 'Mobility update must indicate success');
    assertEqual(mobilityRes.json.data.migrationType, 'Inter-State Migrant Worker', 'Cross-state addresses must derive Inter-State Migrant Worker');
    assertTrue(mobilityRes.json.data.migrant, 'Inter-state worker must be flagged as migrant: true');
    results.push({ name: 'T1.7: Worker mobility profile update with migration type derivation', pass: true });
  } catch (err) {
    results.push({ name: 'T1.7: Worker mobility profile update with migration type derivation', pass: false, error: err.message });
  }

  return results;
}
