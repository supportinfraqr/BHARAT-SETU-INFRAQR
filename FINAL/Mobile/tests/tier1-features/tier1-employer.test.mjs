import { BssClient } from '../helpers/client.mjs';
import {
  assertEqual,
  assertTrue,
  assertStatus,
  assertDefined,
} from '../helpers/assertions.mjs';

export async function runTier1EmployerTests() {
  const results = [];
  const client = new BssClient();

  // Test 1.3.1: Employer Authentication
  try {
    const loginRes = await client.login('Employer');
    assertStatus(loginRes, 200, 'Employer login should return 200 OK');
    assertTrue(loginRes.json.authenticated, 'Employer session must be authenticated');
    assertEqual(loginRes.json.role, 'Employer', 'Session role must be Employer');
    assertEqual(loginRes.json.redirectTo, '/employer/dashboard', 'Employer redirect should be /employer/dashboard');
    results.push({ name: 'T1.3.1: Principal Employer authentication via credential challenge', pass: true });
  } catch (err) {
    results.push({ name: 'T1.3.1: Principal Employer authentication via credential challenge', pass: false, error: err.message });
  }

  // Test 1.3.2: Employer Portal Graph & Site Hierarchy Fetch
  try {
    const portalRes = await client.get('/api/portal');
    assertStatus(portalRes, 200, 'Employer portal fetch should return 200 OK');
    assertDefined(portalRes.json.data, 'Portal response must contain data');
    const employer = portalRes.json.data.employer || portalRes.json.data;
    assertDefined(employer.identity, 'Employer portal must include identity');
    assertDefined(employer.sites, 'Employer portal must include sites array');
    assertDefined(employer.contractors, 'Employer portal must include contractors array');
    assertDefined(employer.approvals, 'Employer portal must include approvals queue');
    results.push({ name: 'T1.3.2: Principal Employer site hierarchy and portal metrics fetch', pass: true });
  } catch (err) {
    results.push({ name: 'T1.3.2: Principal Employer site hierarchy and portal metrics fetch', pass: false, error: err.message });
  }

  // Test 1.3.3: Employer Site Creation
  try {
    const sitePayload = {
      code: `SITE-${Date.now().toString().slice(-4)}`,
      name: 'Bengaluru Airport Terminal 3 Expansion',
      location: 'Devanahalli, Bengaluru',
      state: 'Karnataka',
      startDate: '2026-09-01',
      endDate: '2028-12-31',
      status: 'Active',
    };
    const siteRes = await client.post('/api/portal/sites', sitePayload);
    assertStatus(siteRes, 201, 'Site creation should return 201 Created');
    assertDefined(siteRes.json.data || siteRes.json.id, 'Response must include created site record');
    results.push({ name: 'T1.3.3: Principal Employer project site registration', pass: true });
  } catch (err) {
    results.push({ name: 'T1.3.3: Principal Employer project site registration', pass: false, error: err.message });
  }

  // Test 1.3.4: Employer Contractor Approval Decision
  try {
    const approvalPayload = {
      ids: ['APR-2026-001'],
      status: 'Approved',
      notes: 'All KYC and statutory documents verified against EPFO/ESIC portal.',
    };
    const appRes = await client.patch('/api/portal/approvals', approvalPayload);
    assertStatus(appRes, 200, 'Contractor approval mutation should return 200 OK');
    results.push({ name: 'T1.3.4: Principal Employer contractor onboarding approval decision', pass: true });
  } catch (err) {
    results.push({ name: 'T1.3.4: Principal Employer contractor onboarding approval decision', pass: false, error: err.message });
  }

  // Test 1.3.5: Employer Contractor Submission Verification
  try {
    const subPayload = {
      id: 'SUB-02',
      status: 'Verified',
    };
    const subRes = await client.patch('/api/portal/submissions', subPayload);
    assertStatus(subRes, 200, 'Submission verification mutation should return 200 OK');
    results.push({ name: 'T1.3.5: Principal Employer contractor compliance submission verification', pass: true });
  } catch (err) {
    results.push({ name: 'T1.3.5: Principal Employer contractor compliance submission verification', pass: false, error: err.message });
  }

  // Test 1.3.6: Employer Gate Pass Authorization
  try {
    const gpPayload = {
      ids: ['GP-2026-001'],
      status: 'Approved',
    };
    const gpRes = await client.patch('/api/portal/gate-passes', gpPayload);
    assertStatus(gpRes, 200, 'Gate pass approval mutation should return 200 OK');
    results.push({ name: 'T1.3.6: Principal Employer site gate pass review and authorization', pass: true });
  } catch (err) {
    results.push({ name: 'T1.3.6: Principal Employer site gate pass review and authorization', pass: false, error: err.message });
  }

  return results;
}
