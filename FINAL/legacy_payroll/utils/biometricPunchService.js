const moment = require('moment');
const attendanceValidator = require('./attendanceValidator');
const { initModels } = require('../models/indexModel');

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseDeviceDateTime(value) {
  if (!value) return null;
  if (value instanceof Date && !isNaN(value.getTime())) return value;

  const original = String(value).trim();
  if (/[zZ]$/.test(original) || /[+-]\d{2}:?\d{2}$/.test(original)) {
    const instant = new Date(original);
    return isNaN(instant.getTime()) ? null : instant;
  }

  const raw = original.replace('T', ' ');
  const parsed = moment(raw, ['YYYY-MM-DD HH:mm:ss', 'YYYY-MM-DD HH:mm', 'DD/MM/YYYY HH:mm:ss'], true);
  if (!parsed.isValid()) {
    const fallback = new Date(value);
    return isNaN(fallback.getTime()) ? null : fallback;
  }
  return new Date(`${parsed.format('YYYY-MM-DDTHH:mm:ss')}+05:30`);
}

function attendanceDateKey(punchTime) {
  return moment(punchTime).utcOffset(330).format('YYYY-MM-DD');
}

function parseShiftTimeOnDate(dateStr, timeStr) {
  if (!timeStr) return null;
  const parts = String(timeStr).split(':');
  if (parts.length < 2) return null;
  const [h, m, s = '00'] = parts;
  const hour = String(h).padStart(2, '0');
  const min = String(m).padStart(2, '0');
  const sec = String(s).padStart(2, '0');
  const dt = new Date(`${dateStr}T${hour}:${min}:${sec}+05:30`);
  return isNaN(dt.getTime()) ? null : dt;
}

function calculateNetWorkedHours(checkIn, checkOut, breaks = [], excludeBreak = false) {
  if (!checkIn || !checkOut || checkOut <= checkIn) {
    return { grossHours: 0, breakHours: 0, netHours: 0, netMinutes: 0 };
  }

  const grossMs = checkOut - checkIn;
  let breakMs = 0;
  for (const b of breaks) {
    if (b.breakIn && b.breakOut && b.breakOut > b.breakIn) {
      breakMs += (new Date(b.breakOut) - new Date(b.breakIn));
    }
  }

  const netMs = excludeBreak ? Math.max(0, grossMs - breakMs) : grossMs;
  return {
    grossHours: grossMs / (1000 * 60 * 60),
    breakHours: breakMs / (1000 * 60 * 60),
    netHours: netMs / (1000 * 60 * 60),
    netMinutes: Math.round(netMs / (1000 * 60))
  };
}

async function findEmployeeByDevicePin(EmployeeModel, pin) {
  const raw = String(pin || '').trim();
  if (!raw) return null;

  const stripped = raw.replace(/^0+/, '') || raw;
  const variants = [...new Set([raw, stripped])];
  const or = [];

  for (const value of variants) {
    const exact = new RegExp(`^${escapeRegex(value)}$`, 'i');
    or.push({ uniqueId: exact });
    or.push({ customId: exact });
    or.push({ 'payrollInfo.employeeCode': exact });
  }

  return EmployeeModel.findOne({ $or: or });
}

function isBiometricAllowed(reportingMethod) {
  if (!reportingMethod) return true;
  if (reportingMethod.isActive === false) return false;
  if (reportingMethod.allowedChannels && reportingMethod.allowedChannels.biometric === false) {
    return false;
  }
  return true;
}

async function applyCheckIn({ attendance, employee, punchTime, dateKey, ShiftModel, AttendancePolicyModel }) {
  const shift = employee.shiftId ? await ShiftModel.findById(employee.shiftId) : null;
  const policy = employee.attendancePolicyId
    ? await AttendancePolicyModel.findById(employee.attendancePolicyId)
    : null;

  const shiftStart = shift?.startTime ? parseShiftTimeOnDate(dateKey, shift.startTime) : null;
  const lateStatus = attendanceValidator.checkLateStatus({
    checkInTime: punchTime,
    shiftStartTime: shiftStart,
    lateMarkMinutes: policy?.lateMarkMinutes || 0
  });

  attendance.checkIn = punchTime;
  attendance.arrivalStatus = lateStatus.isLate ? 'late' : 'onTime';
  attendance.status = 'Present';
  attendance.trackStatus = 'checkIn';
  attendance.reportingChannel = 'biometric';
  attendance.checkOutMissing = false;
  return attendance;
}

async function applyCheckOut({ attendance, employee, punchTime, dateKey, ShiftModel, AttendancePolicyModel }) {
  const shift = employee.shiftId ? await ShiftModel.findById(employee.shiftId) : null;
  const policy = employee.attendancePolicyId
    ? await AttendancePolicyModel.findById(employee.attendancePolicyId)
    : null;

  const shiftEnd = shift?.endTime ? parseShiftTimeOnDate(dateKey, shift.endTime) : null;
  const { netHours } = calculateNetWorkedHours(
    attendance.checkIn,
    punchTime,
    attendance.breaks,
    shift?.excludeBreakFromWorkingHours
  );

  const workedMinutes = netHours * 60;
  const requiredMinutes = shift?.compulsoryWorkHours || 0;

  const earlyExitStatus = attendanceValidator.checkEarlyExitStatus({
    checkOutTime: punchTime,
    shiftEndTime: shiftEnd,
    earlyExitMinutes: policy?.earlyExitMinutes || 0
  });

  const halfDayStatus = attendanceValidator.determineHalfDayStatus({
    workedMinutes,
    requiredMinutes,
    policy,
    earlyExitStatus
  });

  const overtimeStatus = attendanceValidator.calculateOvertimeStatus({
    workedMinutes,
    shiftWorkMinutes: requiredMinutes,
    policy
  });

  attendance.checkOut = punchTime;
  attendance.totalHoursWorked = netHours;
  attendance.overtimeHours = Math.max(0, overtimeStatus.overtimeMinutes / 60);
  attendance.status = halfDayStatus.isHalfDay ? 'HalfDay' : 'Present';
  attendance.isHalfDay = !!halfDayStatus.isHalfDay;
  attendance.trackStatus = 'checkOut';
  attendance.reportingChannel = 'biometric';
  attendance.checkOutMissing = false;
  return attendance;
}

/**
 * First punch of the day = checkIn. Later punches are logged only.
 * Check-out is applied at day end by the attendance scheduler (last punch).
 */
async function applyBiometricPunch({
  org_uuid,
  serialNumber,
  deviceDoc,
  pin,
  punchTimeInput,
  statusCode = '',
  raw = ''
}) {
  const {
    AttendanceModel,
    EmployeeModel,
    ShiftModel,
    AttendancePolicyModel,
    ReportingMethodModel,
    BiometricPunchLogModel,
    BiometricDeviceModel
  } = await initModels(org_uuid);

  const punchTime = parseDeviceDateTime(punchTimeInput);
  if (!punchTime) {
    return { ok: false, action: 'skipped', message: 'Invalid punch time' };
  }

  try {
    return await applyBiometricPunchInner({
      org_uuid,
      serialNumber,
      deviceDoc,
      pin,
      punchTime,
      statusCode,
      raw,
      AttendanceModel,
      EmployeeModel,
      ShiftModel,
      AttendancePolicyModel,
      ReportingMethodModel,
      BiometricPunchLogModel,
      BiometricDeviceModel
    });
  } catch (err) {
    if (err?.code === 11000) {
      return { ok: true, action: 'duplicate', message: 'Punch already processed' };
    }
    throw err;
  }
}

async function applyBiometricPunchInner({
  org_uuid,
  serialNumber,
  deviceDoc,
  pin,
  punchTime,
  statusCode,
  raw,
  AttendanceModel,
  EmployeeModel,
  ShiftModel,
  AttendancePolicyModel,
  ReportingMethodModel,
  BiometricPunchLogModel,
  BiometricDeviceModel
}) {
  const duplicate = await BiometricPunchLogModel.findOne({
    serialNumber,
    pin: String(pin),
    punchTime
  });
  if (duplicate) {
    return { ok: true, action: 'duplicate', message: 'Punch already processed', log: duplicate };
  }

  const employee = await findEmployeeByDevicePin(EmployeeModel, pin);
  const log = new BiometricPunchLogModel({
    serialNumber,
    deviceId: deviceDoc?._id || null,
    pin: String(pin),
    punchTime,
    statusCode: String(statusCode || ''),
    employeeId: employee?._id || null,
    raw: String(raw || '').slice(0, 500)
  });

  if (!employee) {
    log.action = 'unmapped';
    log.message = `No employee found for device PIN ${pin}`;
    await log.save();
    return { ok: true, action: 'unmapped', message: log.message, log };
  }

  if (employee.status === 'Inactive') {
    log.action = 'skipped';
    log.message = 'Employee is inactive';
    await log.save();
    return { ok: true, action: 'skipped', message: log.message, log };
  }

  const reportingMethod = employee.reportingMethodId
    ? await ReportingMethodModel.findById(employee.reportingMethodId)
    : null;

  if (!isBiometricAllowed(reportingMethod)) {
    log.action = 'skipped';
    log.message = 'Biometric channel not allowed for this employee';
    await log.save();
    return { ok: true, action: 'skipped', message: log.message, log };
  }

  const dateKey = attendanceDateKey(punchTime);
  let attendance = await AttendanceModel.findOne({ employeeId: employee._id, date: dateKey });

  if (!attendance) {
    attendance = new AttendanceModel({
      employeeId: employee._id,
      date: dateKey
    });
  }

  if (!attendance.checkIn) {
    await applyCheckIn({
      attendance,
      employee,
      punchTime,
      dateKey,
      ShiftModel,
      AttendancePolicyModel
    });
    await attendance.save();
    log.action = 'checkIn';
    log.attendanceId = attendance._id;
    log.message = 'Check-in';
    await log.save();
    await touchDevice(BiometricDeviceModel, deviceDoc, punchTime);
    await emitAttendance(org_uuid, employee._id, attendance);
    return { ok: true, action: 'checkIn', attendance, log };
  }

  if (punchTime <= attendance.checkIn) {
    log.action = 'skipped';
    log.attendanceId = attendance._id;
    log.message = 'Punch time is not after check-in';
    await log.save();
    return { ok: true, action: 'skipped', message: log.message, log };
  }

  log.action = 'extra';
  log.attendanceId = attendance._id;
  log.message = attendance.checkOut
    ? 'Already checked out; punch logged'
    : 'Punch logged; checkout at day end';
  await log.save();
  await touchDevice(BiometricDeviceModel, deviceDoc, punchTime);
  return { ok: true, action: 'extra', attendance, log };
}

async function touchDevice(BiometricDeviceModel, deviceDoc, punchTime) {
  if (!deviceDoc?._id) return;
  await BiometricDeviceModel.updateOne(
    { _id: deviceDoc._id },
    { $set: { lastPunchAt: punchTime, lastError: '' } }
  );
}

/**
 * End-of-day: if still open (In, no Out), use last biometric punch after check-in as Out.
 * Does not overwrite an existing checkOut (web Punch Out).
 */
async function applyLastBiometricPunchCheckouts({
  org_uuid,
  AttendanceModel,
  BiometricPunchLogModel,
  ShiftModel,
  AttendancePolicyModel,
  dateStr,
  missingCheckoutRecords
}) {
  const closedIds = new Set();
  if (!missingCheckoutRecords?.length) return closedIds;

  const dayStart = new Date(`${dateStr}T00:00:00.000+05:30`);
  const dayEnd = new Date(`${dateStr}T23:59:59.999+05:30`);

  for (const record of missingCheckoutRecords) {
    const emp = record.employeeId;
    const empId = emp?._id || emp;
    if (!empId) continue;

    const lastPunch = await BiometricPunchLogModel.findOne({
      employeeId: empId,
      punchTime: {
        $gt: record.checkIn,
        $gte: dayStart,
        $lte: dayEnd
      }
    }).sort({ punchTime: -1 });

    if (!lastPunch) continue;

    const attendance = await AttendanceModel.findById(record._id);
    if (!attendance || attendance.checkOut) continue;

    const employee = {
      shiftId: emp.shiftId || record.shiftId,
      attendancePolicyId: emp.attendancePolicyId || record.attendancePolicyId
    };

    await applyCheckOut({
      attendance,
      employee,
      punchTime: lastPunch.punchTime,
      dateKey: dateStr,
      ShiftModel,
      AttendancePolicyModel
    });
    attendance.remarks = `${attendance.remarks || ''} [Checkout from last biometric punch]`.trim();
    await attendance.save();

    lastPunch.action = 'checkOut';
    lastPunch.attendanceId = attendance._id;
    lastPunch.message = 'Check-out from last punch (end of day)';
    await lastPunch.save();

    if (org_uuid) {
      await emitAttendance(org_uuid, empId, attendance);
    }

    closedIds.add(String(record._id));
  }

  return closedIds;
}

async function emitAttendance(org_uuid, employeeId, attendance) {
  try {
    const attendanceController = require('../controller/attendance');
    if (typeof attendanceController.sendAttendanceToUser === 'function') {
      await attendanceController.sendAttendanceToUser(org_uuid, employeeId, attendance);
    }
  } catch (err) {
    console.error('biometric socket emit failed:', err.message);
  }
}

function parseAttLogBody(body) {
  const lines = String(body || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const punches = [];
  for (const line of lines) {
    if (/^(GET OPTION FROM|C:|OK)/i.test(line)) continue;

    let parts = line.split(/\t/).map((p) => p.trim()).filter((p) => p !== '');
    if (parts.length < 2) {
      parts = line.split(',').map((p) => p.trim()).filter(Boolean);
    }
    if (parts.length < 2) {
      const spaced = line.split(/\s+/);
      if (spaced.length >= 3 && /^\d{4}-\d{2}-\d{2}$/.test(spaced[1])) {
        punches.push({
          pin: spaced[0],
          time: `${spaced[1]} ${spaced[2]}`,
          status: spaced[3] || '0',
          raw: line
        });
      }
      continue;
    }

    punches.push({
      pin: parts[0],
      time: parts[1],
      status: parts[2] || '0',
      raw: line
    });
  }
  return punches;
}

module.exports = {
  applyBiometricPunch,
  applyLastBiometricPunchCheckouts,
  parseAttLogBody,
  parseDeviceDateTime,
  findEmployeeByDevicePin
};
