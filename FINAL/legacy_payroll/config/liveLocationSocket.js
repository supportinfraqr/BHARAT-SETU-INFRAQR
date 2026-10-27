const { initModels } = require('../models/indexModel');
const {
    processLocationUpdate,
    markEmployeeOffline,
    formatEmployeeLocation
} = require('../utils/liveLocationHelper');

function orgTrackingRoom(org_uuid) {
    return `org-tracking:${org_uuid}`;
}

function emitEmployeeLocation(io, org_uuid, data) {
    if (!io || !org_uuid || !data) return;
    io.to(orgTrackingRoom(org_uuid)).emit('employee-location', {
        status: 'success',
        data
    });
}

function registerLiveLocationHandlers(io, socket) {
    socket.on('join-org-tracking', ({ org_uuid }) => {
        if (!org_uuid) return;
        socket.join(orgTrackingRoom(org_uuid));
    });

    socket.on('location-update', async (payload = {}) => {
        try {
            const org_uuid = payload.org_uuid || socket.handshake?.auth?.org_uuid;
            const employeeId = payload.employeeId || socket.handshake?.auth?.employeeId;
            const result = await processLocationUpdate({
                org_uuid,
                employeeId,
                lat: payload.lat,
                lng: payload.lng,
                accuracy: payload.accuracy,
                source: payload.source || 'web'
            });

            if (!result.ok) {
                console.warn(`location-update skipped (${result.reason}):`, employeeId);
                return;
            }

            socket.data.org_uuid = org_uuid;
            socket.data.employeeId = employeeId;
            emitEmployeeLocation(io, org_uuid, result.data);
        } catch (err) {
            console.error('location-update error:', err.message);
        }
    });

    socket.on('location-stop', async (payload = {}) => {
        try {
            const org_uuid = payload.org_uuid || socket.handshake?.auth?.org_uuid || socket.data?.org_uuid;
            const employeeId = payload.employeeId || socket.handshake?.auth?.employeeId || socket.data?.employeeId;
            if (!org_uuid || !employeeId) return;

            const { LiveLocationModel, EmployeeModel } = await initModels(org_uuid);
            const doc = await markEmployeeOffline(LiveLocationModel, employeeId);
            if (!doc) return;

            const employee = await EmployeeModel.findById(employeeId)
                .select('firstName lastName displayName uniqueId photoUrl');

            emitEmployeeLocation(io, org_uuid, formatEmployeeLocation({ ...doc.toObject(), isOnline: false }, employee));
        } catch (err) {
            console.error('location-stop error:', err.message);
        }
    });
}

module.exports = { registerLiveLocationHandlers, orgTrackingRoom, emitEmployeeLocation };
