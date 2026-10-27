const BiometricDeviceRegistry = require('../models/biometricDeviceRegistryModel');
const BiometricUnmappedLog = require('../models/biometricUnmappedLogModel');
const { initModels } = require('../models/indexModel');
const { applyBiometricPunch, parseAttLogBody } = require('../utils/biometricPunchService');

function sendPlain(res, body) {
  const text = body == null ? 'OK' : String(body);
  const buf = Buffer.from(text, 'ascii');
  if (!res.headersSent) {
    res.removeHeader('Content-Security-Policy');
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Length', String(buf.length));
    res.setHeader('Connection', 'close');
  }
  res.statusCode = 200;
  return res.end(buf);
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getAdmsBody(req) {
  if (typeof req.admsBody === 'string') return req.admsBody;
  if (Buffer.isBuffer(req.body)) return req.body.toString('utf8');
  if (typeof req.body === 'string') return req.body;
  if (req.body && typeof req.body === 'object') return JSON.stringify(req.body);
  return '';
}

function getSerial(req) {
  const fromQuery = String(
    req.query.SN ||
    req.query.sn ||
    req.query.serialNumber ||
    ''
  ).trim();
  if (fromQuery) return fromQuery;

  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body) && req.body.SN) {
    return String(req.body.SN).trim();
  }

  const url = String(req.originalUrl || req.url || '');
  const urlMatch = url.match(/[?&]SN=([^&]+)/i);
  if (urlMatch) {
    try {
      return decodeURIComponent(urlMatch[1]).trim();
    } catch {
      return urlMatch[1].trim();
    }
  }

  const bodyMatch = getAdmsBody(req).match(/(?:^|[&\n\r])SN=([^\s&]+)/i);
  return bodyMatch ? bodyMatch[1].trim() : '';
}

function getTable(req) {
  return String(req.query.table || req.query.Table || req.query.TABLENAME || '').trim().toUpperCase();
}

function istNowString() {
  return new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
}

function handshakeOptions(serial) {
  return [
    `GET OPTION FROM: ${serial}`,
    'Stamp=9999',
    'OpStamp=9999',
    'PhotoStamp=9999',
    'ATTLOGStamp=9999',
    'OPERLOGStamp=9999',
    'ATTPHOTOStamp=9999',
    'ErrorDelay=30',
    'Delay=10',
    'TransTimes=00:00;23:59',
    'TransInterval=1',
    'TransFlag=TransData AttLog\tOpLog\tAttPhoto\tEnrollUser\tChgUser\tEnrollFP\tChgFP\tUserPic',
    'TimeZone=330',
    `DateTime=${istNowString()}`,
    'Realtime=1',
    'Encrypt=0'
  ].join('\r\n') + '\r\n';
}

function timeSyncCommand() {
  const cmdId = Date.now() % 100000000;
  const now = istNowString();
  return [
    `C:${cmdId}:DATA UPDATE TIME ${now}`,
    `C:${cmdId + 1}:SET OPTION TimeZone=330`
  ].join('\r\n') + '\r\n';
}

async function findRegisteredDevice(serial) {
  if (!serial) return null;
  const registry = await BiometricDeviceRegistry.findOne({
    serialNumber: new RegExp(`^${escapeRegex(serial)}$`, 'i')
  });
  if (!registry) return null;

  try {
    const { BiometricDeviceModel } = await initModels(registry.org_uuid);
    const device = await BiometricDeviceModel.findOne({
      serialNumber: new RegExp(`^${escapeRegex(serial)}$`, 'i')
    });
    return { registry, device };
  } catch (err) {
    console.error('findRegisteredDevice tenant db failed:', err.message);
    return { registry, device: null };
  }
}

async function markDeviceSeen(org_uuid, device, serial) {
  if (!org_uuid) return;
  try {
    const { BiometricDeviceModel } = await initModels(org_uuid);
    const now = new Date();
    if (device?._id) {
      await BiometricDeviceModel.updateOne(
        { _id: device._id },
        { $set: { lastSeenAt: now } }
      );
      return;
    }
    if (serial) {
      await BiometricDeviceModel.updateOne(
        { serialNumber: new RegExp(`^${escapeRegex(serial)}$`, 'i') },
        { $set: { lastSeenAt: now } }
      );
    }
  } catch (err) {
    console.error('markDeviceSeen failed:', err.message);
  }
}

async function processAttLog({ serial, body, registry, device }) {
  const punches = parseAttLogBody(body);
  let accepted = 0;

  for (const punch of punches) {
    const result = await applyBiometricPunch({
      org_uuid: registry.org_uuid,
      serialNumber: serial,
      deviceDoc: device,
      pin: punch.pin,
      punchTimeInput: punch.time,
      statusCode: punch.status,
      raw: punch.raw
    });
    if (result?.ok) accepted += 1;
  }

  return accepted;
}

exports.handleCdata = async (req, res) => {
  try {
    const serial = getSerial(req);
    const table = getTable(req);
    const body = getAdmsBody(req);

    console.log(`[ADMS] cdata SN=${serial || '-'} table=${table || '-'} method=${req.method} ua=${req.headers['user-agent'] || '-'} ip=${req.ip || '-'}`);

    if (!serial) {
      return sendPlain(res, 'OK');
    }

    const mapped = await findRegisteredDevice(serial);
    if (mapped) {
      await markDeviceSeen(mapped.registry.org_uuid, mapped.device, serial);
    }

    if (!table && req.method === 'GET') {
      return sendPlain(res, handshakeOptions(serial));
    }

    if (table && table !== 'ATTLOG') {
      return sendPlain(res, 'OK');
    }

    const isAttLog = table === 'ATTLOG' || (req.method === 'POST' && body);
    if (!isAttLog) {
      return sendPlain(res, handshakeOptions(serial));
    }

    if (!mapped) {
      await BiometricUnmappedLog.create({
        serialNumber: serial,
        tableName: table || 'ATTLOG',
        body
      });
      console.warn(`[ADMS] Unmapped serial ${serial} — register the device in Attendance Setup`);
      return sendPlain(res, 'OK');
    }

    if (mapped.device && mapped.device.isActive === false) {
      return sendPlain(res, 'OK');
    }

    const accepted = await processAttLog({
      serial,
      body,
      registry: mapped.registry,
      device: mapped.device
    });

    return sendPlain(res, `OK:${accepted}`);
  } catch (err) {
    console.error('ADMS cdata error:', err);
    return sendPlain(res, 'OK');
  }
};

exports.handleGetRequest = async (req, res) => {
  try {
    const serial = getSerial(req);
    if (serial) {
      const mapped = await findRegisteredDevice(serial);
      if (mapped) {
        await markDeviceSeen(mapped.registry.org_uuid, mapped.device, serial);
      }
    }
    return sendPlain(res, timeSyncCommand());
  } catch (err) {
    console.error('ADMS getrequest error:', err);
    return sendPlain(res, 'OK');
  }
};

exports.handleDeviceCmd = async (req, res) => {
  try {
    const serial = getSerial(req);
    if (serial) {
      const mapped = await findRegisteredDevice(serial);
      if (mapped) {
        await markDeviceSeen(mapped.registry.org_uuid, mapped.device, serial);
      }
    }
    return sendPlain(res, 'OK');
  } catch (err) {
    return sendPlain(res, 'OK');
  }
};

exports.handlePing = async (req, res) => {
  try {
    const serial = getSerial(req);
    if (serial) {
      const mapped = await findRegisteredDevice(serial);
      if (mapped) {
        await markDeviceSeen(mapped.registry.org_uuid, mapped.device, serial);
      }
    }
    return sendPlain(res, 'OK');
  } catch (err) {
    return sendPlain(res, 'OK');
  }
};
