const { initModels } = require('../../models/indexModel');
const { sendResponse, handleError } = require('../../utils/responce');
const {
  syncAutoPayrollRegistry,
  normalizeAutoProcessTime,
} = require('../../utils/payroll/autoPayrollRunner');

exports.createOrUpdateSchedule = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid)
      return sendResponse(res, 400, false, 'org uuid not found');

    const { PayrollScheduleModel } = await initModels(org_uuid);
    const {
      payFrequency,
      workingDays,
      payDay,
      firstPayPeriod,
      status,
      autoProcessEnabled,
      autoProcessTime,
    } = req.body;

    if (!payFrequency || !payDay || !firstPayPeriod) {
      return sendResponse(res, 400, false, 'Pay frequency, pay day, and first pay period are required');
    }

    const upcomingPayrolls = generateUpcomingPayrolls(
      payFrequency,
      payDay,
      firstPayPeriod
    );

    const normalizedStatus =
      status === 'inactive' ? 'inactive' : 'active';

    const schedule = await PayrollScheduleModel.findOneAndUpdate(
      { organizationId: org_uuid },
      {
        organizationId: org_uuid,
        payFrequency,
        workingDays: workingDays || [],
        payDay,
        firstPayPeriod,
        upcomingPayrolls,
        status: normalizedStatus,
        ...(typeof autoProcessEnabled === 'boolean'
          ? { autoProcessEnabled }
          : {}),
        ...(autoProcessTime != null && String(autoProcessTime).trim() !== ''
          ? { autoProcessTime: normalizeAutoProcessTime(autoProcessTime) }
          : {}),
      },
      { new: true, upsert: true }
    );

    try {
      await syncAutoPayrollRegistry(org_uuid, schedule);
    } catch (syncErr) {
      console.error('[AutoPayroll] Registry sync failed:', syncErr.message);
    }

    return sendResponse(res, 200, true, 'Payroll schedule saved successfully', schedule);
  } catch (err) {
    return handleError(res, err);
  }
};

exports.getPayrollSchedule = async (req, res) => {
  try {
    const { org_uuid } = req.headers;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }
    const { PayrollScheduleModel } = await initModels(org_uuid);

    const data = await PayrollScheduleModel.findOne({ organizationId: org_uuid });
    return sendResponse(res, 200, true, 'Schedule fetched successfully', data || {});
  } catch (err) {
    return handleError(res, err);
  }
};

exports.getUpcomingPayrollDates = async (req, res) => {
  try {
    const { org_uuid } = req.headers;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }
    const { PayrollScheduleModel } = await initModels(org_uuid);

    const schedule = await PayrollScheduleModel.findOne({ organizationId: org_uuid });

    if (!schedule) {
      return sendResponse(res, 404, false, 'Payroll schedule not found');
    }

    return sendResponse(res, 200, true, 'Upcoming payroll dates fetched successfully', schedule.upcomingPayrolls || []);
  } catch (err) {
    return handleError(res, err);
  }
};

exports.calculatePayPeriod = async (req, res) => {
  try {
    const { org_uuid } = req.headers;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }
    const { date } = req.query;
    const { PayrollScheduleModel } = await initModels(org_uuid);

    if (!date) {
      return sendResponse(res, 400, false, 'Date is required');
    }

    const schedule = await PayrollScheduleModel.findOne({ organizationId: org_uuid });

    if (!schedule) {
      return sendResponse(res, 404, false, 'Payroll schedule not found');
    }

    const inputDate = new Date(date);
    const payPeriod = calculatePayPeriodForDate(
      inputDate,
      schedule.payFrequency,
      schedule.firstPayPeriod
    );

    return sendResponse(res, 200, true, 'Pay period calculated successfully', payPeriod);
  } catch (err) {
    return handleError(res, err);
  }
};

function generateUpcomingPayrolls(frequency, payDay, firstPayPeriod) {
  const payrolls = [];
  const startDate = new Date(firstPayPeriod);
  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  // Generate next 12 payroll cycles
  for (let i = 0; i < 12; i++) {
    let payDate;

    switch (frequency) {
      case 'monthly':
        payDate = new Date(startDate);
        payDate.setMonth(startDate.getMonth() + i);
        payDate.setDate(parseInt(payDay) || 7);

        payrolls.push({
          period: `${months[payDate.getMonth()]} ${payDate.getFullYear()}`,
          payDate: payDate,
        });
        break;

      case 'semi-monthly':
        // Two pay dates per month: 15th and last day
        const date1 = new Date(startDate);
        date1.setMonth(startDate.getMonth() + Math.floor(i / 2));
        date1.setDate(i % 2 === 0 ? 15 : new Date(date1.getFullYear(), date1.getMonth() + 1, 0).getDate());

        payrolls.push({
          period: `${months[date1.getMonth()]} ${date1.getFullYear()} - ${i % 2 === 0 ? '1st Half' : '2nd Half'}`,
          payDate: date1,
        });
        break;

      case 'bi-weekly':
        // Every 2 weeks
        payDate = new Date(startDate);
        payDate.setDate(startDate.getDate() + i * 14);

        payrolls.push({
          period: `Week ${i * 2 + 1} - ${payDate.getFullYear()}`,
          payDate: payDate,
        });
        break;

      case 'weekly':
        // Every week
        payDate = new Date(startDate);
        payDate.setDate(startDate.getDate() + i * 7);

        payrolls.push({
          period: `Week ${i + 1} - ${payDate.getFullYear()}`,
          payDate: payDate,
        });
        break;

      default:
        break;
    }

    // Limit to 12 cycles for display
    if (payrolls.length >= 12) break;
  }

  return payrolls;
}

/**
 * Calculate pay period for a given date
 */
function calculatePayPeriodForDate(date, frequency, firstPayPeriod) {
  const inputDate = new Date(date);
  const startDate = new Date(firstPayPeriod);

  let periodStart, periodEnd;

  switch (frequency) {
    case 'monthly':
      periodStart = new Date(inputDate.getFullYear(), inputDate.getMonth(), 1);
      periodEnd = new Date(inputDate.getFullYear(), inputDate.getMonth() + 1, 0);
      break;

    case 'semi-monthly':
      if (inputDate.getDate() <= 15) {
        periodStart = new Date(inputDate.getFullYear(), inputDate.getMonth(), 1);
        periodEnd = new Date(inputDate.getFullYear(), inputDate.getMonth(), 15);
      } else {
        periodStart = new Date(inputDate.getFullYear(), inputDate.getMonth(), 16);
        periodEnd = new Date(inputDate.getFullYear(), inputDate.getMonth() + 1, 0);
      }
      break;

    case 'bi-weekly':
      const daysDiff = Math.floor((inputDate - startDate) / (1000 * 60 * 60 * 24));
      const weekNumber = Math.floor(daysDiff / 14);
      periodStart = new Date(startDate);
      periodStart.setDate(startDate.getDate() + weekNumber * 14);
      periodEnd = new Date(periodStart);
      periodEnd.setDate(periodStart.getDate() + 13);
      break;

    case 'weekly':
      const days = Math.floor((inputDate - startDate) / (1000 * 60 * 60 * 24));
      const week = Math.floor(days / 7);
      periodStart = new Date(startDate);
      periodStart.setDate(startDate.getDate() + week * 7);
      periodEnd = new Date(periodStart);
      periodEnd.setDate(periodStart.getDate() + 6);
      break;

    default:
      periodStart = new Date(inputDate.getFullYear(), inputDate.getMonth(), 1);
      periodEnd = new Date(inputDate.getFullYear(), inputDate.getMonth() + 1, 0);
  }

  return {
    periodStart,
    periodEnd,
    frequency,
    workingDays: calculateWorkingDays(periodStart, periodEnd),
  };
}

/**
 * Calculate working days between two dates
 */
function calculateWorkingDays(startDate, endDate) {
  let count = 0;
  const current = new Date(startDate);

  while (current <= endDate) {
    const day = current.getDay();
    // Exclude Sunday (0) and Saturday (6) - adjust as needed
    if (day !== 0 && day !== 6) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
}

module.exports.generateUpcomingPayrolls = generateUpcomingPayrolls;

