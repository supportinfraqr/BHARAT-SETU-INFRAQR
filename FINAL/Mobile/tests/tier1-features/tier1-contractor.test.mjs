import { BssClient } from '../helpers/client.mjs';
import {
  assertEqual,
  assertTrue,
  assertStatus,
  assertDefined,
} from '../helpers/assertions.mjs';
import { TEST_USERS } from '../helpers/fixtures.mjs';

export async function runTier1ContractorTests() {
  const results = [];
  const client = new BssClient();

  // Test 1.2.1: Contractor Authentication
  try {
    const loginRes = await client.login('Contractor');
    assertStatus(loginRes, 200, 'Contractor login should return 200 OK');
    assertTrue(loginRes.json.authenticated, 'Contractor session must be authenticated');
    assertEqual(loginRes.json.role, 'Contractor', 'Session role must be Contractor');
    assertEqual(loginRes.json.redirectTo, '/contractor/dashboard', 'Contractor redirect should be /contractor/dashboard');
    results.push({ name: 'T1.2.1: Contractor authentication via credential challenge', pass: true });
  } catch (err) {
    results.push({ name: 'T1.2.1: Contractor authentication via credential challenge', pass: false, error: err.message });
  }

  // Test 1.2.2: Contractor Portal Graph Fetch
  try {
    const portalRes = await client.get('/api/portal');
    assertStatus(portalRes, 200, 'Contractor portal fetch should return 200 OK');
    assertDefined(portalRes.json.data, 'Portal response must contain data');
    const contractor = portalRes.json.data.contractor || portalRes.json.data;
    assertDefined(contractor.identity, 'Contractor portal must include identity');
    assertDefined(contractor.workers, 'Contractor portal must include workers array');
    assertDefined(contractor.compliances, 'Contractor portal must include compliances array');
    assertDefined(contractor.salaries, 'Contractor portal must include salaries array');
    assertDefined(contractor.gatePasses, 'Contractor portal must include gate passes array');
    results.push({ name: 'T1.2.2: Contractor portal graph and workforce registry fetch', pass: true });
  } catch (err) {
    results.push({ name: 'T1.2.2: Contractor portal graph and workforce registry fetch', pass: false, error: err.message });
  }

  // Test 1.2.3: Contractor Worker Assignment
  try {
    const workerPayload = {
      bssId: 'BSS234567890124',
      name: 'Manoj Verma',
      mobile: '9876543222',
      site: 'Mumbai Metro Line 3',
      employer: 'L&T Construction',
      designation: 'Mason',
    };
    const workerRes = await client.post('/api/portal/workers', workerPayload);
    assertStatus(workerRes, 201, 'Worker assignment should return 201 Created');
    assertDefined(workerRes.json.data || workerRes.json.id, 'Response must include created worker assignment record');
    results.push({ name: 'T1.2.3: Contractor worker onboarding and site assignment', pass: true });
  } catch (err) {
    results.push({ name: 'T1.2.3: Contractor worker onboarding and site assignment', pass: false, error: err.message });
  }

  // Test 1.2.4: Contractor Statutory Compliance Entry
  try {
    const compliancePayload = {
      item: 'EPFO Monthly Return & ECR Challan',
      category: 'Statutory / PF',
      reference: 'EPFO-CR-2026-08-001',
      employer: 'L&T Construction',
      site: 'Mumbai Metro Line 3',
      issue: '2026-08-10',
      expiry: '2026-09-15',
    };
    const compRes = await client.post('/api/portal/compliances', compliancePayload);
    assertStatus(compRes, 201, 'Compliance submission should return 201 Created');
    assertDefined(compRes.json.data || compRes.json.id, 'Response must include created compliance record');
    results.push({ name: 'T1.2.4: Contractor statutory compliance register filing', pass: true });
  } catch (err) {
    results.push({ name: 'T1.2.4: Contractor statutory compliance register filing', pass: false, error: err.message });
  }

  // Test 1.2.5: Contractor Salary Register Upload Record
  try {
    const salaryPayload = {
      worker: 'Ravi Kumar',
      workerId: 'BSS234567890124',
      employer: 'L&T Construction',
      site: 'Mumbai Metro Line 3',
      period: '2026-07',
      gross: 24500,
      deductions: 2850,
      net: 21650,
      paidOn: '2026-08-07',
      fileName: 'wage_register_jul2026.pdf',
    };
    const salaryRes = await client.post('/api/portal/salaries', salaryPayload);
    assertStatus(salaryRes, 201, 'Salary register entry should return 201 Created');
    assertDefined(salaryRes.json.data || salaryRes.json.id, 'Response must include created salary record');
    results.push({ name: 'T1.2.5: Contractor wage/salary register entry creation', pass: true });
  } catch (err) {
    results.push({ name: 'T1.2.5: Contractor wage/salary register entry creation', pass: false, error: err.message });
  }

  // Test 1.2.6: Contractor Gate Pass Issuance
  try {
    const gatePassPayload = {
      workerName: 'Ravi Kumar',
      workerId: 'BSS234567890124',
      employer: 'L&T Construction',
      site: 'Mumbai Metro Line 3',
      type: 'Permanent',
      validFrom: '2026-08-01',
      validTo: '2026-12-31',
    };
    const gpRes = await client.post('/api/portal/gate-passes', gatePassPayload);
    assertStatus(gpRes, 201, 'Gate pass issuance should return 201 Created');
    assertDefined(gpRes.json.data || gpRes.json.id, 'Response must include created gate pass record');
    results.push({ name: 'T1.2.6: Contractor site gate pass issuance request', pass: true });
  } catch (err) {
    results.push({ name: 'T1.2.6: Contractor site gate pass issuance request', pass: false, error: err.message });
  }

  // Test 1.2.7: Contractor Benefit Record Submission
  try {
    const benefitPayload = {
      type: 'bonus',
      worker: 'Ravi Kumar',
      workerId: 'BSS234567890124',
      employer: 'L&T Construction',
      period: '2026-07',
      amount: 3500,
      reason: 'Safety and attendance incentive',
      paidOn: '2026-08-10',
    };
    const benefitRes = await client.post('/api/portal/benefits', benefitPayload);
    assertStatus(benefitRes, 201, 'Benefit record creation should return 201 Created');
    results.push({ name: 'T1.2.7: Contractor worker benefit & bonus payout filing', pass: true });
  } catch (err) {
    results.push({ name: 'T1.2.7: Contractor worker benefit & bonus payout filing', pass: false, error: err.message });
  }

  return results;
}
