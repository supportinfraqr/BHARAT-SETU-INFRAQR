const mongoose = require('mongoose');

function getLeaveName(leaveNameId) {
  if (!leaveNameId) return '';
  if (typeof leaveNameId === 'string') return leaveNameId;
  return leaveNameId.name || leaveNameId.shortName || leaveNameId.code || '';
}

function calculateEncashableLeaves(leaveType, remaining) {
  const balance = Math.max(0, Number(remaining) || 0);
  if (!leaveType.encashed || leaveType.leaveType !== 'Paid' || leaveType.isUnlimited) {
    return 0;
  }
  if (balance <= 0) return 0;

  const cap = Number(leaveType.encashedDays) || 0;
  return cap > 0 ? Math.min(balance, cap) : balance;
}

async function fetchEmployeeLeaveBalances({
  LeaveTypeModel,
  LeaveRequestModel,
  employee,
  employeeId,
  asOfDate = new Date(),
}) {
  const refDate = new Date(asOfDate);

  const leaveTypeFilter = {
    status: 'active',
    $or: [
      { 'customFilters.employees': employeeId },
      { applicableTo: 'All' },
      { isUnlimited: true },
    ],
    $and: [
      {
        $or: [{ validityStart: null }, { validityStart: { $lte: refDate } }],
      },
      {
        $or: [{ validityEnd: null }, { validityEnd: { $gte: refDate } }],
      },
    ],
  };

  const leaveTypes = await LeaveTypeModel.find(leaveTypeFilter)
    .populate('leaveNameId', 'name code shortName description')
    .lean();

  if (!leaveTypes.length) return [];

  const usage = await LeaveRequestModel.aggregate([
    {
      $match: {
        employeeId: new mongoose.Types.ObjectId(employeeId),
        status: 'Approved',
        leaveTypeId: { $in: leaveTypes.map((l) => l._id) },
      },
    },
    {
      $group: {
        _id: '$leaveTypeId',
        usedDays: { $sum: '$leaveDays' },
        advanceDays: { $sum: '$advanceDays' },
      },
    },
  ]);

  const usageMap = {};
  usage.forEach((u) => {
    usageMap[u._id.toString()] = u;
  });

  const leaves = [];

  for (const lt of leaveTypes) {
    const usageRow = usageMap[lt._id.toString()] || {};
    const usedDays = usageRow.usedDays || 0;
    const advanceUsed = usageRow.advanceDays || 0;
    const leaveName = getLeaveName(lt.leaveNameId);

    if (lt.isUnlimited) {
      leaves.push({
        leaveTypeId: lt._id,
        leaveName,
        leaveType: lt.leaveType,
        typeOfLeave: lt.typeOfLeave,
        isUnlimited: true,
        totalAllotted: 'Unlimited',
        usedDays,
        remainingBalance: 'Unlimited',
        advanceUsed,
        encashmentPolicy: {
          encashed: Boolean(lt.encashed),
          encashedDaysLimit: lt.encashedDays || 0,
        },
        isEncashable: false,
        encashableLeaves: 0,
      });
      continue;
    }

    if (lt.typeOfLeave !== 'Monthly') {
      const totalAllotted = Number(lt.creditDays) || 0;
      const remainingBalance = totalAllotted - usedDays;
      const encashableLeaves = calculateEncashableLeaves(lt, remainingBalance);

      leaves.push({
        leaveTypeId: lt._id,
        leaveName,
        leaveType: lt.leaveType,
        typeOfLeave: lt.typeOfLeave,
        validityStart: lt.validityStart || null,
        validityEnd: lt.validityEnd || null,
        totalAllotted,
        usedDays,
        remainingBalance,
        advanceUsed,
        carryForward: Boolean(lt.carryForward),
        carryForwardLimit: lt.carryForwardLimit || 0,
        encashmentPolicy: {
          encashed: Boolean(lt.encashed),
          encashedDaysLimit: lt.encashedDays || 0,
        },
        isEncashable: encashableLeaves > 0,
        encashableLeaves,
      });
      continue;
    }

    const effectiveStartDate = lt.validityStart
      ? new Date(lt.validityStart)
      : new Date(employee.joiningDate);

    const prevMonthEnd = new Date(
      refDate.getFullYear(),
      refDate.getMonth(),
      0,
      23,
      59,
      59
    );

    let monthsEarnedTillPrev = 0;
    const tmp = new Date(effectiveStartDate);
    tmp.setDate(1);

    while (tmp <= prevMonthEnd) {
      monthsEarnedTillPrev += 1;
      tmp.setMonth(tmp.getMonth() + 1);
    }

    const earnedTillPrev = monthsEarnedTillPrev * (Number(lt.monthlyAllowed) || 0);
    const unusedPrev = earnedTillPrev - usedDays;

    let carryForward = 0;
    if (lt.carryForward && unusedPrev > 0) {
      carryForward = Math.min(unusedPrev, lt.carryForwardLimit || 0);
    }

    const totalAllotted = carryForward + (Number(lt.monthlyAllowed) || 0);
    const remainingBalance = totalAllotted - usedDays;
    const encashableLeaves = calculateEncashableLeaves(lt, remainingBalance);

    leaves.push({
      leaveTypeId: lt._id,
      leaveName,
      leaveType: lt.leaveType,
      typeOfLeave: lt.typeOfLeave,
      validityStart: lt.validityStart || null,
      validityEnd: lt.validityEnd || null,
      monthlyAllowed: lt.monthlyAllowed || 0,
      earnedTillPrev,
      carryForward,
      totalAllotted,
      usedDays,
      remainingBalance,
      advanceUsed,
      encashmentPolicy: {
        encashed: Boolean(lt.encashed),
        encashedDaysLimit: lt.encashedDays || 0,
      },
      isEncashable: encashableLeaves > 0,
      encashableLeaves,
    });
  }

  return leaves;
}

function buildLeaveEncashmentSummary(leaves = [], salaryBases = {}) {
  const numericLeaves = leaves.filter((l) => !l.isUnlimited);

  const totalAvailableLeaves = numericLeaves.reduce(
    (sum, l) => sum + Math.max(0, Number(l.remainingBalance) || 0),
    0
  );

  const totalEncashableLeaves = numericLeaves.reduce(
    (sum, l) => sum + (Number(l.encashableLeaves) || 0),
    0
  );

  const basicSalary = Number(salaryBases.baseSalary) || 0;
  const grossSalary = Number(salaryBases.grossSalary) || 0;
  const suggestedPerDayRate =
    basicSalary > 0
      ? Math.round((basicSalary / 30) * 100) / 100
      : grossSalary > 0
        ? Math.round((grossSalary / 30) * 100) / 100
        : 0;

  const suggestedTotalAmount =
    Math.round(totalEncashableLeaves * suggestedPerDayRate * 100) / 100;

  return {
    totalAvailableLeaves,
    totalEncashableLeaves,
    suggestedPerDayRate,
    suggestedTotalAmount,
    encashableLeaveTypes: numericLeaves.filter((l) => l.isEncashable),
  };
}

async function getEmployeeLeaveEncashmentDetails({
  org_uuid,
  employeeId,
  asOfDate,
  initModels,
}) {
  const { LeaveTypeModel, LeaveRequestModel, EmployeeModel } = await initModels(org_uuid);

  const employee = await EmployeeModel.findById(employeeId)
    .select('firstName lastName email joiningDate payrollInfo baseSalary grossSalary')
    .lean();

  if (!employee) {
    return { error: { status: 404, message: 'Employee not found' } };
  }

  const refDate = asOfDate ? new Date(asOfDate) : new Date();
  if (Number.isNaN(refDate.getTime())) {
    return { error: { status: 400, message: 'Invalid asOfDate' } };
  }

  const leaves = await fetchEmployeeLeaveBalances({
    LeaveTypeModel,
    LeaveRequestModel,
    employee,
    employeeId,
    asOfDate: refDate,
  });

  const salaryBases = {
    baseSalary: employee.payrollInfo?.baseSalary || employee.baseSalary || 0,
    grossSalary: employee.payrollInfo?.grossSalary || employee.grossSalary || 0,
  };

  const summary = buildLeaveEncashmentSummary(leaves, salaryBases);

  return {
    data: {
      employee: {
        id: employee._id,
        name: `${employee.firstName || ''} ${employee.lastName || ''}`.trim(),
        email: employee.email,
        joiningDate: employee.joiningDate || null,
      },
      asOfDate: refDate,
      salaryBases,
      leaves,
      summary: {
        availableLeaves: summary.totalAvailableLeaves,
        encashableLeaves: summary.totalEncashableLeaves,
        perDayRate: summary.suggestedPerDayRate,
        totalAmount: summary.suggestedTotalAmount,
      },
      leaveEncashment: {
        availableLeaves: summary.totalAvailableLeaves,
        encashableLeaves: summary.totalEncashableLeaves,
        perDayRate: summary.suggestedPerDayRate,
        totalAmount: summary.suggestedTotalAmount,
      },
      encashableLeaveTypes: summary.encashableLeaveTypes,
    },
  };
}

module.exports = {
  getEmployeeLeaveEncashmentDetails,
  fetchEmployeeLeaveBalances,
  buildLeaveEncashmentSummary,
  calculateEncashableLeaves,
};
