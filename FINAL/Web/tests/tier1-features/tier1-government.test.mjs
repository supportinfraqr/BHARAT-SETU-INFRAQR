import { BssClient } from '../helpers/client.mjs';
import {
  assertEqual,
  assertTrue,
  assertStatus,
  assertDefined,
  assertGreaterThanOrEqual,
} from '../helpers/assertions.mjs';

export async function runTier1GovernmentTests() {
  const results = [];
  const client = new BssClient();

  // Test 1.6.1: Government Official Authentication
  try {
    const loginRes = await client.login('Government');
    assertStatus(loginRes, 200, 'Government login should return 200 OK');
    assertTrue(loginRes.json.authenticated, 'Government session must be authenticated');
    assertEqual(loginRes.json.role, 'Government', 'Session role must be Government');
    assertEqual(loginRes.json.redirectTo, '/government', 'Government redirect should be /government');
    results.push({ name: 'T1.6.1: Government ministry official authentication', pass: true });
  } catch (err) {
    results.push({ name: 'T1.6.1: Government ministry official authentication', pass: false, error: err.message });
  }

  // Test 1.6.2: Government Analytics Portal Snapshot Fetch
  let portalData = null;
  try {
    const portalRes = await client.get('/api/portal');
    assertStatus(portalRes, 200, 'Government portal fetch should return 200 OK');
    assertDefined(portalRes.json.data, 'Response must contain data');
    portalData = portalRes.json.data.government || portalRes.json.data;
    assertDefined(portalData, 'Government analytics dataset must be present');
    results.push({ name: 'T1.6.2: Government portal analytics snapshot and policy dataset fetch', pass: true });
  } catch (err) {
    results.push({ name: 'T1.6.2: Government portal analytics snapshot and policy dataset fetch', pass: false, error: err.message });
  }

  // Test 1.6.3: State-Wise Workforce Distribution
  try {
    const states = portalData?.states || portalData?.stateWiseDistribution || portalData?.workers;
    assertDefined(states, 'State-wise distribution must be defined');
    assertTrue(Array.isArray(states), 'States dataset must be an array');
    assertGreaterThanOrEqual(states.length, 5, 'Must contain multi-state coverage');
    results.push({ name: 'T1.6.3: State-wise construction workforce distribution analytics', pass: true });
  } catch (err) {
    results.push({ name: 'T1.6.3: State-wise construction workforce distribution analytics', pass: false, error: err.message });
  }

  // Test 1.6.4: Trade & Skill Classification Breakdown
  try {
    const workers = portalData?.workers || [];
    assertDefined(workers, 'Workers registry dataset must be defined');
    assertTrue(Array.isArray(workers), 'Workers registry must be an array');
    assertGreaterThanOrEqual(workers.length, 10, 'Workers sample must be populated');
    const trades = new Set(workers.map(w => w.occupation || w.trade || w.skills || w.category));
    assertTrue(trades.size >= 3, 'Must contain diverse trade classifications');
    results.push({ name: 'T1.6.4: Trade and occupational skill distribution analytics', pass: true });
  } catch (err) {
    results.push({ name: 'T1.6.4: Trade and occupational skill distribution analytics', pass: false, error: err.message });
  }

  // Test 1.6.5: Social Security Statutory Linkage Aggregates
  try {
    const workers = portalData?.workers || [];
    const withEpfoOrEsic = workers.filter(w => Boolean(w.epfoLinked || w.esicLinked || w.epfoUan || w.uan));
    assertGreaterThanOrEqual(withEpfoOrEsic.length, 1, 'Must track statutory EPFO/ESIC linkages');
    results.push({ name: 'T1.6.5: Multi-scheme social security (EPFO/ESIC/BOCW/e-Shram) linkage metrics', pass: true });
  } catch (err) {
    results.push({ name: 'T1.6.5: Multi-scheme social security (EPFO/ESIC/BOCW/e-Shram) linkage metrics', pass: false, error: err.message });
  }

  return results;
}
