import { BssClient } from '../helpers/client.mjs';
import {
  assertEqual,
  assertTrue,
  assertStatus,
  assertDefined,
  assertIncludes,
} from '../helpers/assertions.mjs';
import { TEST_USERS } from '../helpers/fixtures.mjs';

export async function runTier1BssStaffTests() {
  const results = [];
  const client = new BssClient();

  // Test 1.4.1: BSS Staff Authentication
  try {
    const loginRes = await client.login('BSS Staff');
    assertStatus(loginRes, 200, 'BSS Staff login should return 200 OK');
    assertTrue(loginRes.json.authenticated, 'BSS Staff session must be authenticated');
    assertEqual(loginRes.json.role, 'BSS Staff', 'Session role must be BSS Staff');
    assertEqual(loginRes.json.redirectTo, '/bss-staff', 'BSS Staff redirect should be /bss-staff');
    results.push({ name: 'T1.4.1: BSS Staff officer authentication', pass: true });
  } catch (err) {
    results.push({ name: 'T1.4.1: BSS Staff officer authentication', pass: false, error: err.message });
  }

  // Test 1.4.2: Operations Snapshot & Case Queue Fetch
  try {
    const opsRes = await client.get('/api/operations');
    assertStatus(opsRes, 200, 'Operations snapshot fetch should return 200 OK');
    assertDefined(opsRes.json.data, 'Response must include operations data');
    const cases = opsRes.json.data.cases;
    assertDefined(cases, 'Response must include cases list');
    assertTrue(Array.isArray(cases), 'Cases must be an array');
    results.push({ name: 'T1.4.2: BSS Staff unified case queue and telemetry snapshot', pass: true });
  } catch (err) {
    results.push({ name: 'T1.4.2: BSS Staff unified case queue and telemetry snapshot', pass: false, error: err.message });
  }

  // Test 1.4.3: Case Transition: Claim
  try {
    const claimRes = await client.post('/api/operations', {
      action: 'case',
      id: 'BC-1039',
      transition: 'claim',
    });
    assertStatus(claimRes, 200, 'Claiming case should return 200 OK');
    assertTrue(claimRes.json.result.success, 'Case claim must be successful');
    assertIncludes(claimRes.json.result.message, 'In progress', 'Message should indicate In progress status');
    results.push({ name: 'T1.4.3: BSS Staff case claiming transition (In progress + assignee)', pass: true });
  } catch (err) {
    results.push({ name: 'T1.4.3: BSS Staff case claiming transition (In progress + assignee)', pass: false, error: err.message });
  }

  // Test 1.4.4: Case Transition: Wait for Evidence
  try {
    const waitRes = await client.post('/api/operations', {
      action: 'case',
      id: 'BC-1039',
      transition: 'wait',
    });
    assertStatus(waitRes, 200, 'Moving case to wait should return 200 OK');
    assertTrue(waitRes.json.result.success, 'Case wait must be successful');
    assertIncludes(waitRes.json.result.message, 'Waiting for evidence', 'Message should indicate Waiting for evidence');
    results.push({ name: 'T1.4.4: BSS Staff case state transition to Waiting for evidence', pass: true });
  } catch (err) {
    results.push({ name: 'T1.4.4: BSS Staff case state transition to Waiting for evidence', pass: false, error: err.message });
  }

  // Test 1.4.5: Case Transition: Resolve
  try {
    const resolveRes = await client.post('/api/operations', {
      action: 'case',
      id: 'BC-1039',
      transition: 'resolve',
    });
    assertStatus(resolveRes, 200, 'Resolving case should return 200 OK');
    assertTrue(resolveRes.json.result.success, 'Case resolve must be successful');
    assertIncludes(resolveRes.json.result.message, 'Resolved', 'Message should indicate Resolved status');
    results.push({ name: 'T1.4.5: BSS Staff case adjudication and resolution transition', pass: true });
  } catch (err) {
    results.push({ name: 'T1.4.5: BSS Staff case adjudication and resolution transition', pass: false, error: err.message });
  }

  // Test 1.4.6: Case Transition: Escalate
  try {
    const escRes = await client.post('/api/operations', {
      action: 'case',
      id: 'DOC-2048',
      transition: 'escalate',
    });
    assertStatus(escRes, 200, 'Escalating case should return 200 OK');
    assertTrue(escRes.json.result.success, 'Case escalate must be successful');
    assertIncludes(escRes.json.result.message, 'Escalated', 'Message should indicate Escalated status');
    results.push({ name: 'T1.4.6: BSS Staff case escalation to senior supervisory desk', pass: true });
  } catch (err) {
    results.push({ name: 'T1.4.6: BSS Staff case escalation to senior supervisory desk', pass: false, error: err.message });
  }

  // Test 1.4.7: Audit Log Emission Verification
  try {
    const snapshot = await client.get('/api/operations');
    assertStatus(snapshot, 200, 'Fetching snapshot after case mutations');
    const logs = snapshot.json.data.logs || [];
    assertDefined(logs, 'Audit logs must be present');
    const hasStaffLog = logs.some(
      log => (log.source === 'staff-workbench' || log.source === 'portal') && log.level === 'audit'
    );
    assertTrue(hasStaffLog, 'An audit log entry must be created when BSS Staff modifies case state');
    results.push({ name: 'T1.4.7: BSS Staff audit log stream generation upon case mutations', pass: true });
  } catch (err) {
    results.push({ name: 'T1.4.7: BSS Staff audit log stream generation upon case mutations', pass: false, error: err.message });
  }

  return results;
}
