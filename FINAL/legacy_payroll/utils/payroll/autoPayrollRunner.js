/**
 * Auto payroll — birthday-style start, main-DB gate, tenant DB only on match.
 */

const AutoPayrollRegistry = require('../../models/autoPayrollRegistryModel');
const { initModels } = require('../../models/indexModel');
const { processPayroll } = require('../../controller/payroll/payrollRun');

const MONTH_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function getTodayParts(timeZone = 'Asia/Kolkata') {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());

  const get = (type) => parts.find((p) => p.type === type)?.value;
  const year = Number(get('year'));
  const month = Number(get('month'));
  const day = Number(get('day'));
  const hour = Number(get('hour'));
  const minute = Number(get('minute'));
  const key = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const timeHm = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  return { year, month, day, hour, minute, key, timeHm };
}

function normalizeAutoProcessTime(value) {
  if (value == null || String(value).trim() === '') return '13:00';
  const match = String(value)
    .trim()
    .match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) return '13:00';
  const hour = Math.min(23, Math.max(0, parseInt(match[1], 10)));
  const minute = Math.min(59, Math.max(0, parseInt(match[2], 10)));
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function sameCalendarDay(dateVal, today) {
  if (!dateVal) return false;
  const d = new Date(dateVal);
  if (Number.isNaN(d.getTime())) return false;
  return (
    d.getFullYear() === today.year &&
    d.getMonth() + 1 === today.month &&
    d.getDate() === today.day
  );
}

function resolvePeriodFromSchedule(schedule, today) {
  const upcoming = Array.isArray(schedule.upcomingPayrolls)
    ? schedule.upcomingPayrolls
    : [];

  const matched = upcoming.find((row) => sameCalendarDay(row.payDate, today));
  if (matched?.payDate) {
    const d = new Date(matched.payDate);
    return {
      month: MONTH_SHORT[d.getMonth()],
      year: d.getFullYear(),
      periodLabel:
        matched.period || `${MONTH_SHORT[d.getMonth()]} ${d.getFullYear()}`,
      source: 'upcomingPayrolls',
    };
  }

  if (String(schedule.payFrequency || 'monthly') === 'monthly') {
    const payDay = Math.min(
      31,
      Math.max(1, parseInt(String(schedule.payDay || '7'), 10) || 7)
    );
    if (today.day === payDay) {
      return {
        month: MONTH_SHORT[today.month - 1],
        year: today.year,
        periodLabel: `${MONTH_SHORT[today.month - 1]} ${today.year}`,
        source: 'monthlyPayDay',
      };
    }
  }

  return null;
}

function toRegistryPayload(org_uuid, scheduleDoc, orgName = '') {
  const id = String(org_uuid);
  if (!scheduleDoc) {
    return {
      org_uuid: id,
      organizationName: orgName || id,
      status: 'inactive',
      autoProcessEnabled: false,
    };
  }

  return {
    org_uuid: id,
    organizationName: orgName || id,
    status: scheduleDoc.status === 'inactive' ? 'inactive' : 'active',
    autoProcessEnabled: scheduleDoc.autoProcessEnabled !== false,
    autoProcessTime: normalizeAutoProcessTime(scheduleDoc.autoProcessTime),
    payFrequency: scheduleDoc.payFrequency || 'monthly',
    payDay: String(scheduleDoc.payDay ?? '7'),
    firstPayPeriod: scheduleDoc.firstPayPeriod || null,
    upcomingPayrolls: Array.isArray(scheduleDoc.upcomingPayrolls)
      ? scheduleDoc.upcomingPayrolls.map((row) => ({
          period: row.period,
          payDate: row.payDate,
        }))
      : [],
    lastAutoRunKey: scheduleDoc.lastAutoRunKey || '',
  };
}

async function syncAutoPayrollRegistry(org_uuid, scheduleDoc, orgName = '') {
  if (!org_uuid) return null;
  const payload = toRegistryPayload(org_uuid, scheduleDoc, orgName);
  return AutoPayrollRegistry.findOneAndUpdate(
    { org_uuid: String(org_uuid) },
    { $set: payload },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

function evaluateRow(row, today) {
  if (!row) return { skipped: true, reason: 'no_schedule' };
  if (row.status !== 'active') return { skipped: true, reason: 'inactive' };
  if (row.autoProcessEnabled === false) {
    return { skipped: true, reason: 'auto_disabled' };
  }

  if (row.firstPayPeriod) {
    const first = new Date(row.firstPayPeriod);
    const firstKey = `${first.getFullYear()}-${String(first.getMonth() + 1).padStart(2, '0')}-${String(first.getDate()).padStart(2, '0')}`;
    if (today.key < firstKey) {
      return { skipped: true, reason: 'before_first_period' };
    }
  }

  const period = resolvePeriodFromSchedule(row, today);
  if (!period) return { skipped: true, reason: 'not_pay_day' };

  const runKey = `${period.year}-${period.month}`;
  if (row.lastAutoRunKey === runKey) {
    return {
      skipped: true,
      reason: 'already_auto_run',
      period: period.periodLabel,
    };
  }

  const configuredTime = normalizeAutoProcessTime(row.autoProcessTime);
  if (today.timeHm !== configuredTime) {
    return {
      skipped: true,
      reason: 'not_auto_time',
      period: period.periodLabel,
      configuredTime,
      now: today.timeHm,
    };
  }

  return { skipped: false, period, configuredTime, runKey };
}

function buildMockRes() {
  const result = { statusCode: 200, body: null };
  const res = {
    status(code) {
      result.statusCode = code;
      return this;
    },
    json(data) {
      result.body = data;
      return this;
    },
  };
  return { res, result };
}

async function invokeProcessPayroll(org_uuid, month, year) {
  const req = {
    headers: { org_uuid },
    body: { month, year, employeeIds: [], excludeEmployeeIds: [] },
  };
  const { res, result } = buildMockRes();
  await processPayroll(req, res);
  return result;
}

async function refreshUpcomingPayrolls(PayrollScheduleModel, schedule) {
  const {
    generateUpcomingPayrolls,
  } = require('../../controller/payroll/payrollSchedule');
  if (typeof generateUpcomingPayrolls !== 'function') return schedule;
  schedule.upcomingPayrolls = generateUpcomingPayrolls(
    schedule.payFrequency,
    schedule.payDay,
    schedule.firstPayPeriod
  );
  await schedule.save();
  return schedule;
}

async function processMatchedOrg(org_uuid, orgName = '') {
  const label = orgName || org_uuid;
  const today = getTodayParts(process.env.TIME_ZONE || 'Asia/Kolkata');

  try {
    const { PayrollScheduleModel } = await initModels(org_uuid);
    const schedule = await PayrollScheduleModel.findOne({
      organizationId: org_uuid,
    });

    if (!schedule) {
      await syncAutoPayrollRegistry(org_uuid, null, label);
      return { org: label, skipped: true, reason: 'no_schedule' };
    }

    const live = evaluateRow(toRegistryPayload(org_uuid, schedule, label), today);
    if (live.skipped) {
      await syncAutoPayrollRegistry(org_uuid, schedule, label);
      return { org: label, ...live };
    }

    const { period, configuredTime, runKey } = live;
    console.log(
      `[AutoPayroll] ${label}: ${configuredTime} matched → ${period.month} ${period.year}`
    );

    const result = await invokeProcessPayroll(
      org_uuid,
      period.month,
      period.year
    );
    const success =
      result?.body?.success === true || result?.statusCode === 200;

    schedule.lastAutoRunAt = new Date();
    schedule.lastAutoRunKey = runKey;
    schedule.lastAutoRunStatus = success ? 'success' : 'failed';
    schedule.lastAutoRunMessage =
      result?.body?.message ||
      (success ? 'Auto payroll processed' : 'Auto payroll failed');
    await schedule.save();

    try {
      await refreshUpcomingPayrolls(PayrollScheduleModel, schedule);
    } catch (e) {
      console.error(`[AutoPayroll] ${label}: upcoming refresh failed`, e.message);
    }

    await syncAutoPayrollRegistry(org_uuid, schedule, label);

    return {
      org: label,
      skipped: false,
      success,
      period: period.periodLabel,
      message: result?.body?.message,
    };
  } catch (err) {
    console.error(`[AutoPayroll] ${label}:`, err);
    return { org: label, skipped: false, success: false, error: err.message };
  }
}

/**
 * Cron entry: main DB only for gate; tenant DB only when matched.
 * No backfill loop — org must Save Pay Schedule once (syncs registry).
 */
async function runAutoPayrollForAllOrganizations(createOrg = []) {
  const today = getTodayParts(process.env.TIME_ZONE || 'Asia/Kolkata');
  const summary = [];

  const nameById = new Map();
  for (const org of createOrg) {
    if (org.databaseName) {
      nameById.set(String(org.databaseName), org.organizationName || '');
    }
  }

  const rows = await AutoPayrollRegistry.find({}).lean();

  for (const row of rows) {
    const orgName =
      row.organizationName ||
      nameById.get(String(row.org_uuid)) ||
      row.org_uuid;
    const gate = evaluateRow(row, today);

    if (gate.skipped) {
      summary.push({ org: orgName, ...gate });
      continue;
    }

    summary.push(await processMatchedOrg(row.org_uuid, orgName));
  }

  return summary;
}

module.exports = {
  getTodayParts,
  normalizeAutoProcessTime,
  resolvePeriodFromSchedule,
  syncAutoPayrollRegistry,
  runAutoPayrollForAllOrganizations,
};
