const mongoose = require('mongoose');
const { initModels } = require('../models/indexModel');

/**
 * Admin Dashboard Summary
 * GET /dashboard/adminSummary
 * Optional query: employeeId, startDate, endDate (YYYY-MM-DD)
 *
 * Returns:
 *  - attendance (logged-in / given employee, current month by default)
 *  - genderDistribution
 *  - leaveRequests
 *  - employeeStatus
 */
exports.getAdminDashboardSummary = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return res.status(400).json({
        status: 'error',
        message: 'Organization UUID not found',
      });
    }

    const {
      EmployeeModel,
      AttendanceModel,
      LeaveRequestModel,
      HolidayModel,
    } = await initModels(org_uuid);

    const employeeId = req.query.employeeId || req.empId || null;

    const now = new Date();
    const startDate = req.query.startDate
      ? new Date(req.query.startDate)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = req.query.endDate
      ? new Date(req.query.endDate)
      : new Date(now.getFullYear(), now.getMonth() + 1, 0);
    endDate.setHours(23, 59, 59, 999);
    startDate.setHours(0, 0, 0, 0);

    const [genderStats, statusStats, leaveStats, attendance] = await Promise.all([
      buildGenderDistribution(EmployeeModel),
      buildEmployeeStatus(EmployeeModel),
      buildLeaveRequestCounts(LeaveRequestModel),
      buildAttendanceSummary({
        employeeId,
        startDate,
        endDate,
        AttendanceModel,
        LeaveRequestModel,
        HolidayModel,
      }),
    ]);

    return res.status(200).json({
      status: 'success',
      message: 'Admin dashboard summary fetched successfully',
      data: {
        period: {
          startDate: startDate.toISOString().slice(0, 10),
          endDate: endDate.toISOString().slice(0, 10),
        },
        attendance,
        genderDistribution: genderStats,
        leaveRequests: leaveStats,
        employeeStatus: statusStats,
      },
    });
  } catch (error) {
    console.error('adminDashboardSummary error:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to fetch admin dashboard summary',
    });
  }
};

async function buildGenderDistribution(EmployeeModel) {
  const employees = await EmployeeModel.find({
    status: { $in: ['Active', 'Probation'] },
  })
    .select('demographics.gender')
    .lean();

  let male = 0;
  let female = 0;
  let other = 0;

  for (const emp of employees) {
    const g = String(emp?.demographics?.gender || '')
      .trim()
      .toLowerCase();
    if (g === 'male' || g === 'm') male += 1;
    else if (g === 'female' || g === 'f') female += 1;
    else other += 1;
  }

  return {
    male,
    female,
    other,
    total: male + female + other,
  };
}

async function buildEmployeeStatus(EmployeeModel) {
  const users = await EmployeeModel.find({}).select('status').lean();
  const counts = {
    active: 0,
    inactive: 0,
    probation: 0,
    terminated: 0,
    total: users.length,
  };

  for (const { status } of users) {
    if (status === 'Active') counts.active += 1;
    else if (status === 'Inactive') counts.inactive += 1;
    else if (status === 'Probation') counts.probation += 1;
    else if (status === 'Terminated') counts.terminated += 1;
  }

  return counts;
}

async function buildLeaveRequestCounts(LeaveRequestModel) {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [byStatus, newToday] = await Promise.all([
    LeaveRequestModel.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]),
    LeaveRequestModel.countDocuments({
      status: 'Pending',
      createdAt: { $gte: startOfToday },
    }),
  ]);

  const map = { Pending: 0, Approved: 0, Rejected: 0, Cancelled: 0 };
  for (const row of byStatus) {
    if (row?._id && map[row._id] !== undefined) {
      map[row._id] = row.count;
    }
  }

  return {
    new: newToday,
    pending: map.Pending,
    approved: map.Approved,
    rejected: map.Rejected,
    cancelled: map.Cancelled,
  };
}

async function buildAttendanceSummary({
  employeeId,
  startDate,
  endDate,
  AttendanceModel,
  LeaveRequestModel,
  HolidayModel,
  org_uuid,
}) {
  const empty = {
    totalDays: 0,
    workingDays: 0,
    presentDays: 0,
    halfDays: 0,
    leaveDays: 0,
    holidays: 0,
    absentDays: 0,
  };

  const totalDays =
    Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

  // Holiday schema uses `location` (not organizationId); org DB is already scoped
  const holidays = await HolidayModel.find({
    date: { $gte: startDate, $lte: endDate },
    status: { $ne: 'Inactive' },
    type: { $ne: 'weekoff' },
  })
    .select('date type status')
    .lean();

  const holidayDates = new Set(
    holidays
      .map((h) => {
        if (!h?.date) return null;
        return new Date(h.date).toISOString().slice(0, 10);
      })
      .filter(Boolean)
  );
  const holidaysCount = holidayDates.size;

  // Weekends as rough week-offs (Sat/Sun)
  let weekendCount = 0;
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const day = d.getDay();
    if (day === 0 || day === 6) weekendCount += 1;
  }

  const workingDays = Math.max(totalDays - holidaysCount - weekendCount, 0);

  // Personal leave/present/absent only when employeeId is available
  let present = 0;
  let halfDay = 0;
  let leaveDays = 0;
  let absentDays = 0;

  if (employeeId && mongoose.Types.ObjectId.isValid(employeeId)) {
    const [leaves, attendance] = await Promise.all([
      LeaveRequestModel.find({
        employeeId,
        status: 'Approved',
        startDate: { $lte: endDate },
        endDate: { $gte: startDate },
      })
        .select('startDate endDate')
        .lean(),
      AttendanceModel.find({
        employeeId,
        date: { $gte: startDate, $lte: endDate },
      })
        .select('status')
        .lean(),
    ]);

    const leaveDates = new Set();
    for (const l of leaves) {
      const s = new Date(Math.max(new Date(l.startDate), startDate));
      const e = new Date(Math.min(new Date(l.endDate), endDate));
      for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
        leaveDates.add(d.toISOString().slice(0, 10));
      }
    }
    leaveDays = leaveDates.size;

    attendance.forEach((a) => {
      if (a.status === 'Present') present += 1;
      if (a.status === 'HalfDay') halfDay += 0.5;
    });

    const workedDays = present + halfDay + leaveDays;
    absentDays = Math.max(workingDays - workedDays, 0);
  }

  return {
    totalDays,
    workingDays,
    presentDays: present,
    halfDays: halfDay,
    leaveDays,
    holidays: holidaysCount,
    absentDays,
  };
}
