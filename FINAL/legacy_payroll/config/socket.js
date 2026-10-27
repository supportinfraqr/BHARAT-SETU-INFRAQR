const { Server } = require("socket.io");
const { initModels } = require('../models/indexModel');
const { registerLiveLocationHandlers } = require('./liveLocationSocket');
const { getIstDateString, getIstDayRange } = require('../utils/liveLocationHelper');

const getWorkedTimeData = (attendanceData) => {
    if (!attendanceData?.checkIn) return { totalWorkedTime: 0, formatted: "00:00:00" };

    const checkIn = new Date(attendanceData.checkIn);
    const checkOut = attendanceData.checkOut ? new Date(attendanceData.checkOut) : new Date();

    // Total break time in milliseconds
    const totalBreakTime = (attendanceData.breaks || []).reduce((total, brk) => {
        if (brk.breakIn) {
            const breakIn = new Date(brk.breakIn);
            const breakOut = brk.breakOut ? new Date(brk.breakOut) : new Date();
            total += breakOut - breakIn;
        }
        return total;
    }, 0);

    const totalWorkedTime = checkOut - checkIn - totalBreakTime;

    const formatTime = (ms) => {
        if (ms < 0) ms = 0;
        const totalSeconds = Math.floor(ms / 1000);
        const h = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
        const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
        const s = String(totalSeconds % 60).padStart(2, "0");
        return `${h}:${m}:${s}`;
    };

    return {
        totalWorkedTime,
        formatted: formatTime(totalWorkedTime),
    };
};


let io;

function attendanceRoom(org_uuid, employeeId) {
    if (!org_uuid || !employeeId) return null;
    return `${String(org_uuid).trim()}_${String(employeeId).trim()}`;
}

function joinAttendanceRoom(socket, org_uuid, employeeId) {
    const roomName = attendanceRoom(org_uuid, employeeId);
    if (!roomName) return null;
    socket.join(roomName);
    socket.data.org_uuid = String(org_uuid).trim();
    socket.data.employeeId = String(employeeId).trim();
    console.log(`Socket ${socket.id} joined room ${roomName}`);
    return roomName;
}

function initSocket(server) {
    io = new Server(server, {
        cors: {
            origin: true,
            credentials: true,
            methods: ["GET", "POST"],
        },
        // Polling must stay enabled: the live HTTPS proxy accepts it and drops
        // the websocket upgrade. Direct HTTP still upgrades to websocket.
        transports: ["polling", "websocket"],
        allowUpgrades: true,
        perMessageDeflate: false,
        httpCompression: false,
        pingTimeout: 60000,
        pingInterval: 25000,
    });

    io.on("connection", (socket) => {
        console.log("User connected:", socket.id, socket.conn?.transport?.name || "");
        socket.conn?.on("upgrade", (transport) => {
            console.log("Socket upgraded:", socket.id, transport?.name || "");
        });

        const auth = socket.handshake?.auth || {};
        joinAttendanceRoom(socket, auth.org_uuid, auth.employeeId);

        // 👇 New: join-user room
        socket.on("join-user", async ({ employeeId, org_uuid }) => {
            const roomName = joinAttendanceRoom(socket, org_uuid, employeeId);
            if (!roomName) return;

            try {
                const { AttendanceModel, EmployeeModel, ShiftModel } = await initModels(org_uuid);

                const today = getIstDateString();
                const { startOfDay, endOfDay } = getIstDayRange();

                const attendanceData = await AttendanceModel.findOne({
                    employeeId,
                    $or: [
                        { date: today },
                        { date: new Date(`${today}T00:00:00.000Z`) },
                        { date: { $gte: startOfDay, $lte: endOfDay } }
                    ]
                }).sort({ checkIn: -1 });

                const employee = await EmployeeModel.findById(employeeId).select("shiftId");
                const shift = await ShiftModel.findById(employee?.shiftId);

                // Get compulsory work hours (in minutes) from shift and convert to ms
                const compulsoryMinutes = shift?.compulsoryWorkHours || 0;
                const compulsoryWorkTimeMs = compulsoryMinutes * 60 * 1000;

                // Get shift start and end times
                const now = new Date();
                const [startHour, startMin] = shift?.startTime?.split(":") || [0, 0];
                const [endHour, endMin] = shift?.endTime?.split(":") || [23, 59];

                const shiftStart = new Date(now.setHours(startHour, startMin, 0, 0));
                const shiftEnd = new Date(now.setHours(endHour, endMin, 0, 0));

                // Get worked time and formatted worked time
                const { totalWorkedTime, formatted: workedTimeFormatted } = getWorkedTimeData(attendanceData);

                // Calculate progress based on compulsory work hours
                const progress = compulsoryWorkTimeMs > 0
                    ? Math.min(100, Math.round((totalWorkedTime / compulsoryWorkTimeMs) * 100))
                    : 0;

                // Emit result to frontend
                io.to(roomName).emit("attendance-update", {
                    status: "success",
                    message: "Initial attendance data with time",
                    data: attendanceData
                        ? {
                            ...attendanceData.toObject?.() || attendanceData,
                            workedTimeFormatted,
                            progress,
                        }
                        : null,
                });

            } catch (err) {
                console.error("Error in join-user:", err.message);
                io.to(roomName).emit("attendance-update", {
                    status: "error",
                    message: "Failed to fetch attendance or shift data",
                    data: null,
                });
            }
        });



        registerLiveLocationHandlers(io, socket);

        // Example listener
        socket.on("sendMessage", (data) => {
            console.log("Received message:", data);
            io.emit("receiveMessage", data); // broadcast
        });

        socket.on("disconnect", () => {
            console.log("User disconnected:", socket.id);
        });
    });

    return io;
}

function getIO() {
    if (!io) {
        throw new Error("Socket.io not initialized!");
    }
    return io;
}

module.exports = { initSocket, getIO, attendanceRoom };
