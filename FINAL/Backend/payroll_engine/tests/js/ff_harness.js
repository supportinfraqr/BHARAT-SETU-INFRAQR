// Differential-test harness for the Full & Final helpers: runs the legacy
// ffLeaveEncashmentHelper / ffSettlementPreview against in-memory fake Mongoose models.
// Loaded by tests/legacy_js.py (cwd = legacy payroll dir).
const path = require('path');

const legacy = (rel) => require(path.join(process.cwd(), rel));

function chain(value) {
  const q = {
    populate() { return q; },
    select() { return q; },
    sort() { return q; },
    lean() { return Promise.resolve(value); },
    then(res, rej) { return Promise.resolve(value).then(res, rej); },
  };
  return q;
}

function fakeModels({ employee = null, leaveTypes = [], usage = [], paidRun = null, compliance = null }) {
  return {
    EmployeeModel: { findById: () => chain(employee) },
    LeaveTypeModel: { find: () => chain(leaveTypes) },
    LeaveRequestModel: { aggregate: async () => usage },
    PayrollRunModel: { findOne: () => chain(paidRun) },
    StatutoryComplianceModel: { findOne: () => chain(compliance) },
  };
}

const reviveEmployee = (e) => (e && e.dateOfJoining ? { ...e, dateOfJoining: new Date(e.dateOfJoining) } : e);

exports.leaveBalances = async ({ leaveTypes, usage, employee, employeeId, asOfDate }) => {
  const { fetchEmployeeLeaveBalances } = legacy('utils/payroll/ffLeaveEncashmentHelper');
  const models = fakeModels({ leaveTypes, usage });
  return fetchEmployeeLeaveBalances({ ...models, employee, employeeId, asOfDate: new Date(asOfDate) });
};

exports.leaveEncashmentDetails = async (opts) => {
  const { getEmployeeLeaveEncashmentDetails } = legacy('utils/payroll/ffLeaveEncashmentHelper');
  const models = fakeModels({ ...opts, employee: reviveEmployee(opts.employee) });
  return getEmployeeLeaveEncashmentDetails({
    org_uuid: 'org', employeeId: opts.employeeId, asOfDate: opts.asOfDate, initModels: async () => models,
  });
};

exports.settlementPreview = async (opts) => {
  const { buildSettlementPreview } = legacy('utils/payroll/ffSettlementPreview');
  const models = fakeModels({ ...opts, employee: reviveEmployee(opts.employee) });
  return buildSettlementPreview({
    org_uuid: 'org', employeeId: opts.employeeId, lastWorkingDate: opts.lastWorkingDate,
    initModels: async () => models,
  });
};
