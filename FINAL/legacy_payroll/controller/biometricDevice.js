const BiometricDeviceRegistry = require('../models/biometricDeviceRegistryModel');
const BiometricUnmappedLog = require('../models/biometricUnmappedLogModel');
const { initModels } = require('../models/indexModel');
const { sendResponse, handleError } = require('../utils/responce');
const { applyBiometricPunch, parseAttLogBody } = require('../utils/biometricPunchService');

function normalizeSerial(value) {
  return String(value || '').trim().toUpperCase();
}

exports.createDevice = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) return sendResponse(res, 400, false, 'org_uuid not found');

    const {
      serialNumber,
      deviceName,
      shortName = '',
      location = '',
      deviceType = 'Attendance + Access',
      direction = 'alternateInOut',
      connectionType = 'Tcp/IP',
      ipAddress = '',
      commKey = '',
      isActive = true
    } = req.body;

    if (!serialNumber || !deviceName) {
      return sendResponse(res, 400, false, 'serialNumber and deviceName are required');
    }

    const serial = normalizeSerial(serialNumber);
    const existing = await BiometricDeviceRegistry.findOne({ serialNumber: serial });
    if (existing && existing.org_uuid !== org_uuid) {
      return sendResponse(res, 409, false, 'This serial number is already registered to another organization');
    }

    const { BiometricDeviceModel } = await initModels(org_uuid);
    const device = await BiometricDeviceModel.create({
      serialNumber: serial,
      deviceName,
      shortName,
      location,
      deviceType,
      direction,
      connectionType,
      ipAddress,
      commKey,
      isActive
    });

    await BiometricDeviceRegistry.findOneAndUpdate(
      { serialNumber: serial },
      { serialNumber: serial, org_uuid, deviceName, isActive },
      { upsert: true, new: true }
    );

    const replayed = await replayUnmappedLogs(org_uuid, serial, device);

    return sendResponse(res, 201, true, 'Biometric device registered', {
      device,
      replayedPunches: replayed
    });
  } catch (err) {
    if (err?.code === 11000) {
      return sendResponse(res, 409, false, 'Device serial already exists');
    }
    return handleError(res, err);
  }
};

exports.updateDevice = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) return sendResponse(res, 400, false, 'org_uuid not found');

    const { deviceId } = req.params;
    const { BiometricDeviceModel } = await initModels(org_uuid);
    const current = await BiometricDeviceModel.findById(deviceId);
    if (!current) return sendResponse(res, 404, false, 'Device not found');

    const payload = { ...req.body };
    if (payload.serialNumber) {
      payload.serialNumber = normalizeSerial(payload.serialNumber);
      if (payload.serialNumber !== current.serialNumber) {
        const taken = await BiometricDeviceRegistry.findOne({ serialNumber: payload.serialNumber });
        if (taken && taken.org_uuid !== org_uuid) {
          return sendResponse(res, 409, false, 'This serial number is already registered to another organization');
        }
        await BiometricDeviceRegistry.deleteOne({ serialNumber: current.serialNumber });
      }
    }

    const updated = await BiometricDeviceModel.findByIdAndUpdate(deviceId, payload, { new: true });

    await BiometricDeviceRegistry.findOneAndUpdate(
      { serialNumber: updated.serialNumber },
      {
        serialNumber: updated.serialNumber,
        org_uuid,
        deviceName: updated.deviceName,
        isActive: updated.isActive
      },
      { upsert: true, new: true }
    );

    return sendResponse(res, 200, true, 'Device updated', updated);
  } catch (err) {
    return handleError(res, err);
  }
};

exports.getDevices = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) return sendResponse(res, 400, false, 'org_uuid not found');

    const { BiometricDeviceModel } = await initModels(org_uuid);
    const devices = await BiometricDeviceModel.find().sort({ createdAt: -1 });
    return sendResponse(res, 200, true, 'Devices fetched', devices);
  } catch (err) {
    return handleError(res, err);
  }
};

exports.getDeviceById = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) return sendResponse(res, 400, false, 'org_uuid not found');

    const { BiometricDeviceModel } = await initModels(org_uuid);
    const device = await BiometricDeviceModel.findById(req.params.deviceId);
    if (!device) return sendResponse(res, 404, false, 'Device not found');
    return sendResponse(res, 200, true, 'Device fetched', device);
  } catch (err) {
    return handleError(res, err);
  }
};

exports.deleteDevice = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) return sendResponse(res, 400, false, 'org_uuid not found');

    const { BiometricDeviceModel } = await initModels(org_uuid);
    const device = await BiometricDeviceModel.findByIdAndDelete(req.params.deviceId);
    if (!device) return sendResponse(res, 404, false, 'Device not found');

    await BiometricDeviceRegistry.deleteOne({ serialNumber: device.serialNumber });
    return sendResponse(res, 200, true, 'Device deleted', device);
  } catch (err) {
    return handleError(res, err);
  }
};

exports.getPunches = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) return sendResponse(res, 400, false, 'org_uuid not found');

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const { BiometricPunchLogModel } = await initModels(org_uuid);
    const filter = {};
    if (req.query.serialNumber) filter.serialNumber = String(req.query.serialNumber).trim().toUpperCase();
    if (req.query.action) filter.action = req.query.action;

    const [rows, total] = await Promise.all([
      BiometricPunchLogModel.find(filter)
        .populate('employeeId', 'firstName lastName uniqueId')
        .sort({ punchTime: -1 })
        .skip(skip)
        .limit(limit),
      BiometricPunchLogModel.countDocuments(filter)
    ]);

    return sendResponse(res, 200, true, 'Punches fetched', {
      rows,
      total,
      page,
      limit
    });
  } catch (err) {
    return handleError(res, err);
  }
};

exports.testPunch = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) return sendResponse(res, 400, false, 'org_uuid not found');

    const { serialNumber, pin, punchTime, statusCode } = req.body;
    if (!serialNumber || !pin || !punchTime) {
      return sendResponse(res, 400, false, 'serialNumber, pin and punchTime are required');
    }

    const serial = normalizeSerial(serialNumber);
    const { BiometricDeviceModel } = await initModels(org_uuid);
    const device = await BiometricDeviceModel.findOne({ serialNumber: serial });
    if (!device) return sendResponse(res, 404, false, 'Device not found. Register it first.');

    const result = await applyBiometricPunch({
      org_uuid,
      serialNumber: serial,
      deviceDoc: device,
      pin,
      punchTimeInput: punchTime,
      statusCode,
      raw: 'manual-test'
    });

    return sendResponse(res, 200, true, 'Punch processed', result);
  } catch (err) {
    return handleError(res, err);
  }
};

async function replayUnmappedLogs(org_uuid, serial, device) {
  const pending = await BiometricUnmappedLog.find({
    serialNumber: new RegExp(`^${serial}$`, 'i'),
    processed: false
  }).sort({ createdAt: 1 });

  let count = 0;
  for (const log of pending) {
    const punches = parseAttLogBody(log.body);
    for (const punch of punches) {
      await applyBiometricPunch({
        org_uuid,
        serialNumber: serial,
        deviceDoc: device,
        pin: punch.pin,
        punchTimeInput: punch.time,
        statusCode: punch.status,
        raw: punch.raw
      });
      count += 1;
    }
    log.processed = true;
    await log.save();
  }
  return count;
}
