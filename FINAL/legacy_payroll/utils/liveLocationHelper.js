const moment = require('moment');
const mongoose = require('mongoose');
const { validateMultipleLocations } = require('./reportingValidator');
const { initModels } = require('../models/indexModel');

const ONLINE_WINDOW_MS = 5 * 60 * 1000;
const MAX_TRAIL_POINTS = 200;
const MIN_MOVE_METERS = 15;
// Indoors a phone falls back to wifi/cell positioning, where a fix can be off by
// hundreds of metres in a random direction. Such a fix cannot prove movement.
const MAX_TRAIL_ACCURACY_METERS = 100;

function getIstDateString(date = new Date()) {
    return moment(date).utcOffset('+05:30').format('YYYY-MM-DD');
}

function getIstDayRange(date = new Date()) {
    const m = moment(date).utcOffset('+05:30');
    return {
        startOfDay: m.clone().startOf('day').toDate(),
        endOfDay: m.clone().endOf('day').toDate()
    };
}

function toRadians(value) {
    return (value * Math.PI) / 180;
}

function getDistanceInMeters(lat1, lng1, lat2, lng2) {
    const R = 6371000;
    const dLat = toRadians(lat2 - lat1);
    const dLng = toRadians(lng2 - lng1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function isOnline(lastUpdatedAt, explicitOnline = true) {
    if (!explicitOnline || !lastUpdatedAt) return false;
    return Date.now() - new Date(lastUpdatedAt).getTime() <= ONLINE_WINDOW_MS;
}

function getGeofenceStatus(reportingMethod, lat, lng) {
    if (!reportingMethod || reportingMethod.type !== 'geofencing') {
        return { insideGeofence: null, geofenceName: null, distanceKm: null };
    }

    const result = validateMultipleLocations(reportingMethod.locations || [], lat, lng);
    const inside = (result.withinLocations || []).length > 0;

    return {
        insideGeofence: inside,
        geofenceName: inside
            ? result.withinLocations[0]?.name
            : result.nearestLocation?.name || null,
        distanceKm: result.nearestLocation?.distance ?? null,
        distanceMeters: result.nearestLocation?.distanceMeters ?? null
    };
}

function formatEmployeeLocation(doc, employee, geofence = null) {
    if (!doc) return null;

    const emp = employee || doc.employeeId || {};
    const firstName = emp.firstName || '';
    const lastName = emp.lastName || '';

    return {
        employeeId: String(emp._id || doc.employeeId),
        name: `${firstName} ${lastName}`.trim() || emp.displayName || 'Employee',
        uniqueId: emp.uniqueId || '',
        photoUrl: emp.photoUrl || '',
        lat: doc.lat,
        lng: doc.lng,
        accuracy: doc.accuracy,
        source: doc.source || 'web',
        isOnline: isOnline(doc.lastUpdatedAt, doc.isOnline),
        isCheckedIn: !!doc.isCheckedIn,
        lastUpdatedAt: doc.lastUpdatedAt,
        date: doc.date,
        insideGeofence: geofence?.insideGeofence ?? null,
        geofenceName: geofence?.geofenceName ?? null,
        distanceKm: geofence?.distanceKm ?? null,
        distanceMeters: geofence?.distanceMeters ?? null
    };
}

function getTodayAttendanceFilter(employeeId) {
    const today = getIstDateString();
    const { startOfDay, endOfDay } = getIstDayRange();
    const filter = {
        $and: [
            {
                $or: [
                    { date: today },
                    { date: new Date(`${today}T00:00:00.000Z`) },
                    { date: { $gte: startOfDay, $lte: endOfDay } }
                ]
            },
            { checkIn: { $exists: true, $ne: null } },
            { $or: [{ checkOut: { $exists: false } }, { checkOut: null }] }
        ]
    };

    if (employeeId && mongoose.Types.ObjectId.isValid(employeeId)) {
        filter.employeeId = new mongoose.Types.ObjectId(employeeId);
    }

    return filter;
}

async function getTodayCheckedInAttendance(AttendanceModel, employeeId) {
    return AttendanceModel.findOne(getTodayAttendanceFilter(employeeId));
}

async function getTodayCheckedInEmployeeIds(AttendanceModel) {
    const rows = await AttendanceModel.find(getTodayAttendanceFilter()).select('employeeId').lean();
    return [...new Set(rows.map((row) => row.employeeId?.toString()).filter(Boolean))];
}

async function processLocationUpdate(payload = {}) {
    const org_uuid = payload.org_uuid;
    const employeeId = payload.employeeId;
    const lat = Number(payload.lat);
    const lng = Number(payload.lng);
    const accuracy = payload.accuracy != null ? Number(payload.accuracy) : null;
    const source = payload.source || 'web';

    if (!org_uuid || !employeeId || !mongoose.Types.ObjectId.isValid(employeeId)) {
        return { ok: false, reason: 'invalid_payload' };
    }
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return { ok: false, reason: 'invalid_coords' };
    }

    const { AttendanceModel, LiveLocationModel, EmployeeModel, ReportingMethodModel } = await initModels(org_uuid);

    const employee = await EmployeeModel.findById(employeeId)
        .select('firstName lastName displayName uniqueId photoUrl reportingMethodId');
    if (!employee) {
        return { ok: false, reason: 'employee_not_found' };
    }

    // Tracking follows the login session, so check-in state is recorded as a label only
    // and never blocks a location update.
    const attendance = await getTodayCheckedInAttendance(AttendanceModel, employeeId);

    const { doc, trailUpdated } = await upsertLiveLocation(LiveLocationModel, {
        employeeId,
        lat,
        lng,
        accuracy: Number.isFinite(accuracy) ? accuracy : null,
        source,
        isCheckedIn: !!attendance
    });

    let geofence = null;
    if (employee.reportingMethodId) {
        const reportingMethod = await ReportingMethodModel.findById(employee.reportingMethodId);
        geofence = getGeofenceStatus(reportingMethod, lat, lng);
    }

    return {
        ok: true,
        data: { ...formatEmployeeLocation(doc, employee, geofence), trailUpdated }
    };
}

/**
 * Decides whether a fix is trustworthy enough to extend the employee's trail.
 * Distance is measured from the last recorded trail point (not the last reported
 * position) so that slow, genuine movement still accumulates into a new point.
 */
function shouldRecordTrailPoint(existing, lat, lng, accuracy) {
    if (!existing) return true;

    if (Number.isFinite(accuracy) && accuracy > MAX_TRAIL_ACCURACY_METERS) return false;

    const trail = existing.trail || [];
    const reference = trail.length ? trail[trail.length - 1] : existing;
    if (!Number.isFinite(reference?.lat) || !Number.isFinite(reference?.lng)) return true;

    const moved = getDistanceInMeters(reference.lat, reference.lng, lat, lng);

    // Movement has to beat the reading's own margin of error, otherwise it is noise.
    const threshold = Math.max(MIN_MOVE_METERS, Number.isFinite(accuracy) ? accuracy : 0);
    return moved >= threshold;
}

async function upsertLiveLocation(LiveLocationModel, payload) {
    const {
        employeeId,
        lat,
        lng,
        accuracy = null,
        source = 'web',
        isCheckedIn = false
    } = payload;

    const date = getIstDateString();
    const now = new Date();
    const existing = await LiveLocationModel.findOne({ employeeId, date });

    const shouldPushTrail = shouldRecordTrailPoint(existing, lat, lng, accuracy);
    const trailPoint = { lat, lng, accuracy, at: now };
    const update = {
        $set: {
            lat,
            lng,
            accuracy,
            source,
            isOnline: true,
            isCheckedIn: !!isCheckedIn,
            lastUpdatedAt: now
        }
    };

    if (shouldPushTrail) {
        update.$push = {
            trail: {
                $each: [trailPoint],
                $slice: -MAX_TRAIL_POINTS
            }
        };
    }

    const doc = await LiveLocationModel.findOneAndUpdate(
        { employeeId, date },
        update,
        { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true }
    );

    return { doc, trailUpdated: shouldPushTrail };
}

async function markEmployeeOffline(LiveLocationModel, employeeId) {
    if (!employeeId || !mongoose.Types.ObjectId.isValid(employeeId)) return null;
    const date = getIstDateString();
    return LiveLocationModel.findOneAndUpdate(
        { employeeId, date },
        { $set: { isOnline: false, lastUpdatedAt: new Date() } },
        { returnDocument: 'after' }
    );
}

module.exports = {
    ONLINE_WINDOW_MS,
    MAX_TRAIL_ACCURACY_METERS,
    shouldRecordTrailPoint,
    getIstDateString,
    getIstDayRange,
    getDistanceInMeters,
    isOnline,
    formatEmployeeLocation,
    getGeofenceStatus,
    getTodayAttendanceFilter,
    getTodayCheckedInAttendance,
    getTodayCheckedInEmployeeIds,
    processLocationUpdate,
    upsertLiveLocation,
    markEmployeeOffline
};
