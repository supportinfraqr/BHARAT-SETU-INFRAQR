import { BssClient } from '../helpers/client.mjs';
import {
  assertEqual,
  assertTrue,
  assertStatus,
  assertDefined,
  assertIncludes,
  assertGreaterThanOrEqual,
} from '../helpers/assertions.mjs';
import { TEST_USERS } from '../helpers/fixtures.mjs';

export async function runTier1ItHelpdeskTests() {
  const results = [];
  const client = new BssClient();

  // Test 1.5.1: IT Helpdesk Authentication
  try {
    const loginRes = await client.login('BSS Admin');
    assertStatus(loginRes, 200, 'BSS Admin login should return 200 OK');
    assertTrue(loginRes.json.authenticated, 'BSS Admin session must be authenticated');
    assertEqual(loginRes.json.role, 'BSS Admin', 'Session role must be BSS Admin');
    assertEqual(loginRes.json.redirectTo, '/admin', 'BSS Admin redirect should be /admin');
    results.push({ name: 'T1.5.1: IT Helpdesk engineer authentication', pass: true });
  } catch (err) {
    results.push({ name: 'T1.5.1: IT Helpdesk engineer authentication', pass: false, error: err.message });
  }

  // Test 1.5.2: IT Operations Snapshot & Service Telemetry Fetch
  try {
    const opsRes = await client.get('/api/operations');
    assertStatus(opsRes, 200, 'IT Operations snapshot fetch should return 200 OK');
    assertDefined(opsRes.json.data, 'Response must include operations data');
    const { services, tickets, logs, metrics } = opsRes.json.data;
    assertDefined(services, 'Snapshot must contain services list');
    assertDefined(tickets, 'Snapshot must contain tickets list');
    assertDefined(logs, 'Snapshot must contain logs list');
    assertDefined(metrics, 'Snapshot must contain system metrics');
    assertGreaterThanOrEqual(services.length, 5, 'Must track at least 5 core platform microservices');
    results.push({ name: 'T1.5.2: IT Helpdesk platform health, queues, and service telemetry fetch', pass: true });
  } catch (err) {
    results.push({ name: 'T1.5.2: IT Helpdesk platform health, queues, and service telemetry fetch', pass: false, error: err.message });
  }

  // Test 1.5.3: Restricted Terminal Command: `health`
  try {
    const cmdRes = await client.post('/api/operations', {
      action: 'command',
      command: 'health',
    });
    assertStatus(cmdRes, 200, 'Terminal health command should return 200 OK');
    assertTrue(cmdRes.json.result.success, 'Command execution must succeed');
    assertDefined(cmdRes.json.result.output, 'Command execution must return stdout output lines');
    const joined = cmdRes.json.result.output.join(' ');
    assertIncludes(joined, 'services operational', 'Health output must report operational service count');
    results.push({ name: 'T1.5.3: IT Helpdesk restricted terminal: "health" diagnostic check', pass: true });
  } catch (err) {
    results.push({ name: 'T1.5.3: IT Helpdesk restricted terminal: "health" diagnostic check', pass: false, error: err.message });
  }

  // Test 1.5.4: Restricted Terminal Command: `services`
  try {
    const cmdRes = await client.post('/api/operations', {
      action: 'command',
      command: 'services',
    });
    assertStatus(cmdRes, 200, 'Terminal services command should return 200 OK');
    assertTrue(cmdRes.json.result.success, 'Services command must succeed');
    assertDefined(cmdRes.json.result.output, 'Services command must return output list');
    const joined = cmdRes.json.result.output.join(' ');
    assertIncludes(joined, 'identity', 'Output must include identity service');
    assertIncludes(joined, 'portal', 'Output must include portal service');
    results.push({ name: 'T1.5.4: IT Helpdesk restricted terminal: "services" status inspection', pass: true });
  } catch (err) {
    results.push({ name: 'T1.5.4: IT Helpdesk restricted terminal: "services" status inspection', pass: false, error: err.message });
  }

  // Test 1.5.5: Restricted Terminal Command: `probe <service-id>`
  try {
    const cmdRes = await client.post('/api/operations', {
      action: 'command',
      command: 'probe identity',
    });
    assertStatus(cmdRes, 200, 'Terminal probe command should return 200 OK');
    assertTrue(cmdRes.json.result.success, 'Probe command must succeed');
    const joined = cmdRes.json.result.output.join(' ');
    assertIncludes(joined, 'latency', 'Probe output must report measured latency in ms');
    results.push({ name: 'T1.5.5: IT Helpdesk restricted terminal: "probe identity" dynamic latency probe', pass: true });
  } catch (err) {
    results.push({ name: 'T1.5.5: IT Helpdesk restricted terminal: "probe identity" dynamic latency probe', pass: false, error: err.message });
  }

  // Test 1.5.6: Restricted Terminal Command: `retry-binding <binding-id>`
  try {
    const cmdRes = await client.post('/api/operations', {
      action: 'command',
      command: 'retry-binding BC-1039',
    });
    assertStatus(cmdRes, 200, 'Terminal retry-binding command should return 200 OK');
    assertTrue(cmdRes.json.result.success, 'Retry-binding command must succeed');
    const joined = cmdRes.json.result.output.join(' ');
    assertIncludes(joined, 'Retry accepted for BC-1039', 'Output must confirm job placement on retry queue');
    results.push({ name: 'T1.5.6: IT Helpdesk restricted terminal: "retry-binding BC-1039" queue action', pass: true });
  } catch (err) {
    results.push({ name: 'T1.5.6: IT Helpdesk restricted terminal: "retry-binding BC-1039" queue action', pass: false, error: err.message });
  }

  // Test 1.5.7: Incident Ticket Transition (Resolve)
  try {
    const ticketRes = await client.post('/api/operations', {
      action: 'ticket',
      id: 'INC-2026-081',
      transition: 'resolve',
    });
    assertStatus(ticketRes, 200, 'Incident ticket resolution should return 200 OK');
    assertTrue(ticketRes.json.result.success, 'Ticket resolution must be successful');
    assertIncludes(ticketRes.json.result.message, 'Resolved', 'Message must reflect Resolved status');
    results.push({ name: 'T1.5.7: IT Helpdesk incident ticket resolution and lifecycle mutation', pass: true });
  } catch (err) {
    results.push({ name: 'T1.5.7: IT Helpdesk incident ticket resolution and lifecycle mutation', pass: false, error: err.message });
  }

  return results;
}
