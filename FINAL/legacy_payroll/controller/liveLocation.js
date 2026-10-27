const mongoose = require('mongoose');
const { initModels } = require('../models/indexModel');
const { sendResponse, handleError } = require('../utils/responce');
const { getIO } = require('../config/socket');
const { emitEmployeeLocation } = require('../config/liveLocationSocket');
const {
    getIstDateString,
    formatEmployeeLocation,
    isOnline,
    getGeofenceStatus,
    getTodayCheckedInEmployeeIds,
    processLocationUpdate,
    markEmployeeOffline
} = require('../utils/liveLocationHelper');

function broadcastLocation(org_uuid, data) {
    try {
        emitEmployeeLocation(getIO(), org_uuid, data);
    } catch (err) {
        console.error('live location broadcast error:', err.message);
    }
}

exports.updateLocation = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid || req.body.org_uuid;
        const result = await processLocationUpdate({
            org_uuid,
            employeeId: req.body.employeeId,
            lat: req.body.lat,
            lng: req.body.lng,
            accuracy: req.body.accuracy,
            source: req.body.source || 'web'
        });

        if (!result.ok) {
            const messages = {
                invalid_payload: 'Invalid location payload',
                invalid_coords: 'Valid lat/lng required',
                employee_not_found: 'Employee not found'
            };
            return sendResponse(res, 400, false, messages[result.reason] || 'Location update failed');
        }

        broadcastLocation(org_uuid, result.data);
        return sendResponse(res, 200, true, 'Location updated', result.data);
    } catch (err) {
        console.error('updateLocation error:', err);
        return handleError(res, err);
    }
};

exports.stopLocation = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid || req.body.org_uuid;
        const employeeId = req.body.employeeId;
        if (!org_uuid) return sendResponse(res, 400, false, 'org_uuid not found');
        if (!employeeId || !mongoose.Types.ObjectId.isValid(employeeId)) {
            return sendResponse(res, 400, false, 'Valid employeeId is required');
        }

        const { LiveLocationModel, EmployeeModel } = await initModels(org_uuid);
        const doc = await markEmployeeOffline(LiveLocationModel, employeeId);
        if (!doc) return sendResponse(res, 200, true, 'Location already offline');

        const employee = await EmployeeModel.findById(employeeId)
            .select('firstName lastName displayName uniqueId photoUrl');
        const data = formatEmployeeLocation({ ...doc.toObject(), isOnline: false }, employee);
        broadcastLocation(org_uuid, data);
        return sendResponse(res, 200, true, 'Location tracking stopped', data);
    } catch (err) {
        console.error('stopLocation error:', err);
        return handleError(res, err);
    }
};

exports.getLiveLocations = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) return sendResponse(res, 400, false, 'org_uuid not found');

        const date = req.query.date || getIstDateString();
        const {
            LiveLocationModel,
            EmployeeModel,
            ReportingMethodModel,
            AttendanceModel
        } = await initModels(org_uuid);

        const locations = await LiveLocationModel.find({ date })
            .sort({ lastUpdatedAt: -1 })
            .lean();

        const checkedInIds = await getTodayCheckedInEmployeeIds(AttendanceModel);
        const locationEmpIds = locations.map((loc) => loc.employeeId?.toString()).filter(Boolean);
        const employeeIds = [...new Set([...locationEmpIds, ...checkedInIds])];

        const employees = employeeIds.length
            ? await EmployeeModel.find({ _id: { $in: employeeIds } })
                .select('firstName lastName displayName uniqueId photoUrl reportingMethodId')
            : [];

        const employeeMap = Object.fromEntries(employees.map((emp) => [emp._id.toString(), emp]));
        const methodIds = [...new Set(employees.map((emp) => emp.reportingMethodId).filter(Boolean))];
        const methods = methodIds.length
            ? await ReportingMethodModel.find({ _id: { $in: methodIds } })
            : [];
        const methodMap = Object.fromEntries(methods.map((method) => [method._id.toString(), method]));

        const geofenceMethods = await ReportingMethodModel.find({ type: 'geofencing', isActive: true });
        const geofences = geofenceMethods.flatMap((method) => (method.locations || []).map((loc) => ({
            name: loc.name || method.name,
            latitude: loc.latitude,
            longitude: loc.longitude,
            radiusMeters: loc.radiusMeters ?? loc.radiusKm,
            radiusKm: loc.radiusKm
        })));

        const checkedInSet = new Set(checkedInIds);

        const data = locations.map((loc) => {
            const empId = loc.employeeId?.toString();
            const employee = employeeMap[empId];
            const reportingMethod = employee?.reportingMethodId
                ? methodMap[employee.reportingMethodId.toString()]
                : null;
            const geofence = getGeofenceStatus(reportingMethod, loc.lat, loc.lng);
            return formatEmployeeLocation(
                { ...loc, isCheckedIn: checkedInSet.has(empId) },
                employee,
                geofence
            );
        }).filter(Boolean);

        const seen = new Set(data.map((item) => item.employeeId));
        checkedInIds.forEach((id) => {
            if (seen.has(id)) return;
            const employee = employeeMap[id];
            if (!employee) return;
            data.push(formatEmployeeLocation({
                employeeId: id,
                lat: null,
                lng: null,
                accuracy: null,
                source: 'web',
                isOnline: false,
                isCheckedIn: true,
                lastUpdatedAt: null,
                date
            }, employee));
        });

        const onlineCount = data.filter((item) => item.isOnline).length;

        return sendResponse(res, 200, true, 'Live locations fetched successfully', {
            date,
            onlineCount,
            total: data.length,
            locations: data,
            geofences
        });
    } catch (err) {
        console.error('getLiveLocations error:', err);
        return handleError(res, err);
    }
};

exports.getLocationHistory = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) return sendResponse(res, 400, false, 'org_uuid not found');

        const { employeeId } = req.params;
        if (!employeeId || !mongoose.Types.ObjectId.isValid(employeeId)) {
            return sendResponse(res, 400, false, 'Valid employeeId is required');
        }

        const date = req.query.date || getIstDateString();
        const { LiveLocationModel, EmployeeModel, ReportingMethodModel } = await initModels(org_uuid);

        const doc = await LiveLocationModel.findOne({ employeeId, date }).lean();
        if (!doc) return sendResponse(res, 404, false, 'Location history not found');

        const employee = await EmployeeModel.findById(employeeId)
            .select('firstName lastName displayName uniqueId photoUrl reportingMethodId');

        let geofence = null;
        if (employee?.reportingMethodId) {
            const reportingMethod = await ReportingMethodModel.findById(employee.reportingMethodId);
            geofence = getGeofenceStatus(reportingMethod, doc.lat, doc.lng);
        }

        return sendResponse(res, 200, true, 'Location history fetched successfully', {
            ...formatEmployeeLocation(doc, employee, geofence),
            isOnline: isOnline(doc.lastUpdatedAt, doc.isOnline),
            trail: doc.trail || []
        });
    } catch (err) {
        console.error('getLocationHistory error:', err);
        return handleError(res, err);
    }
};
