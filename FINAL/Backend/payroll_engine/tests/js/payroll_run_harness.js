/*
 * Differential-test harness for the legacy pay-run engine (payrollRun.js,
 * payrollSchedule.js, autoPayrollRunner.js, salarySlipPdf.js).
 *
 * Loads the legacy controller source with its internal (non-exported) helpers exposed and
 * runs them against in-memory mock Mongoose models built from a "world" JSON
 * (the same BSS data the Django port reads). Usage:
 *   node payroll_run_harness.js <LEGACY_DIR>  < calls.json  > results.json
 * calls: [{target, fn, args, world?}]
 */
const fs = require('fs');
const path = require('path');
const Module = require('module');

const root = process.argv[2];

function stubModule(rel, exportsObj) {
  const file = require.resolve(path.join(root, rel));
  const m = new Module(file, module);
  m.filename = file;
  m.loaded = true;
  m.exports = exportsObj;
  require.cache[file] = m;
}

function loadWithInternals(rel, names) {
  const file = path.join(root, rel);
  const src = fs.readFileSync(file, 'utf8') +
    `\nmodule.exports.__internals = { ${names.join(', ')} };\n`;
  const m = new Module(file, module);
  m.filename = file;
  m.paths = Module._nodeModulePaths(path.dirname(file));
  m._compile(src, file);
  return m.exports;
}

let currentWorld = {};
function q(result) {
  const p = {
    select() { return p; }, populate() { return p; }, lean() { return p; }, sort() { return p; },
    exec() { return Promise.resolve(result); },
    then(res, rej) { return Promise.resolve(result).then(res, rej); },
  };
  return p;
}
const localDate = (s) => {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s));
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(s);
};
const inRange = (d, r) => (!r || ((!r.$gte || d >= r.$gte) && (!r.$lte || d <= r.$lte)));

stubModule('models/indexModel', {
  initModels: async () => ({
    SalaryRevisionModel: { findOne: () => q(currentWorld.firstRevision || null) },
  }),
});

const PR = loadWithInternals('controller/payroll/payrollRun.js', [
  'calculateEmployeeSalaryImproved', 'calculateEmployeeSalary', 'buildPaidDaysBreakdown',
  'normalizePayrollMonth', 'prorateSalaryLines', 'applyBenefitsProration',
  'preserveExistingPayrollExtras', 'mapPayrollRunToEmployeeSummary', 'buildPayRunPeriodSummary',
  'calculateWorkingDaysInMonth', 'calculateLeaveOverlapDays', 'getPayrollTdsAmount',
  'formatPayDay', 'formatPayDayFromDate', 'resolveEmployeeStatutoryState', 'sumTaxes',
  'getCalendarDaysInPayrollMonth', 'buildPayrollCalculatorPayload', 'roundCurrency',
]).__internals;
const PS = loadWithInternals('controller/payroll/payrollSchedule.js', [
  'generateUpcomingPayrolls', 'calculatePayPeriodForDate', 'calculateWorkingDays',
]).__internals;
const AR = loadWithInternals('utils/payroll/autoPayrollRunner.js', [
  'evaluateRow', 'resolvePeriodFromSchedule', 'toRegistryPayload', 'normalizeAutoProcessTime',
]).__internals;
const PDF = require(path.join(root, 'utils/salarySlipPdf'));

function models(w) {
  const att = (w.attendance || []).map((r) => ({ ...r, date: localDate(r.date) }));
  const leaves = (w.leaves || []).map((l) => ({
    ...l, startDate: localDate(l.startDate), endDate: localDate(l.endDate),
  }));
  const hols = (w.holidays || []).map((h) => ({ ...h, date: localDate(h.date) }));
  return {
    AttendanceModel: {
      aggregate: async (pipeline) => {
        const r = pipeline[0].$match.date;
        const rows = att.filter((a) => inRange(a.date, r));
        if (!rows.length) return [];
        return [{ presentDays: rows.reduce((s, a) => s + (a.status === 'Present' ? 1 : a.status === 'HalfDay' ? 0.5 : 0), 0) }];
      },
      find: (f) => q(att.filter((a) => inRange(a.date, f.date))),
      countDocuments: async () => 0,
    },
    LeaveRequestModel: {
      find: (f) => q(leaves.filter((l) => l.startDate <= f.startDate.$lte && l.endDate >= f.endDate.$gte)),
    },
    ShiftModel: { findById: () => q(w.shift || null) },
    HolidayModel: { find: (f) => q(hols.filter((h) => inRange(h.date, f.date))) },
    EmployeeModel: { findById: () => q(w.employee ? { shiftId: w.employee.shiftId } : null) },
    EmployeeTDSModel: { findOne: () => q(w.tdsRecord || null) },
    ArrearsModel: { findOne: () => q(w.arrears || null) },
    ClaimsDeclarationModel: { findOne: () => q(w.claimDoc || null) },
    PayrollRunModel: { find: () => q(w.payrollRuns || []) },
  };
}

const decode = (v) => {
  if (Array.isArray(v)) return v.map(decode);
  if (v && typeof v === 'object') {
    if (v.$undefined === true && Object.keys(v).length === 1) return undefined;
    if (typeof v.$date === 'string' && Object.keys(v).length === 1) return new Date(v.$date);
    const o = {};
    for (const k of Object.keys(v)) o[k] = decode(v[k]);
    return o;
  }
  return v;
};

async function run(c) {
  const args = decode(c.args || []);
  if (c.fn === 'calcImproved' || c.fn === 'calcLegacy') {
    const w = args[0];
    currentWorld = w;
    const M = models(w);
    if (c.fn === 'calcLegacy') {
      return PR.calculateEmployeeSalary(w.employee, w.salaryComponents, w.compliance, w.month,
        w.year, w.orgId, M.AttendanceModel, M.LeaveRequestModel);
    }
    return PR.calculateEmployeeSalaryImproved(
      w.employee, w.salaryComponents, w.compliance, w.month, w.year, w.orgId,
      M.AttendanceModel, M.LeaveRequestModel, M.EmployeeTDSModel, M.ArrearsModel, w.schedule,
      M.ShiftModel, M.HolidayModel, M.ClaimsDeclarationModel, w.oneTimeRows || [], null, null,
      M.PayrollRunModel, w.options || {});
  }
  if (c.fn === 'breakdown') {
    const w = args[0];
    currentWorld = w;
    const M = models(w);
    return PR.buildPaidDaysBreakdown({
      employeeId: w.employee._id, month: w.month, year: w.year, org_uuid: w.orgId,
      EmployeeModel: M.EmployeeModel, AttendanceModel: M.AttendanceModel,
      LeaveRequestModel: M.LeaveRequestModel, ShiftModel: M.ShiftModel, HolidayModel: M.HolidayModel,
    });
  }
  if (c.fn === 'formatInr' || c.fn === 'mergePayslipEarningsColumn') return PDF[c.fn](...args);
  if (c.fn === 'preserveExistingPayrollExtras') {
    return PR.preserveExistingPayrollExtras(args[0], args[1]);
  }
  if (c.fn === 'evaluateRow' || c.fn === 'resolvePeriodFromSchedule') {
    return AR[c.fn](...args);
  }
  const table = { ...PR, ...PS, ...AR };
  if (typeof table[c.fn] !== 'function') throw new Error(`unknown fn ${c.fn}`);
  const ret = await table[c.fn](...args);
  if (c.mutated) return { ret, args: Object.fromEntries(c.mutated.map((i) => [i, args[i]])) };
  return ret;
}

let input = '';
process.stdin.on('data', (d) => { input += d; });
process.stdin.on('end', async () => {
  const calls = JSON.parse(input);
  const out = [];
  for (const c of calls) {
    try {
      const r = await run(c);
      out.push(r === undefined ? { $undefined: true } : JSON.parse(JSON.stringify(r) ?? 'null'));
    } catch (e) {
      out.push({ $error: String((e && e.stack) || e) });
    }
  }
  process.stdout.write(JSON.stringify(out));
  process.exit(0);
});
