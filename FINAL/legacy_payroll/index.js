const express = require('express');
require('dotenv').config();
const { connectDB } = require('./config/mongo');
const { port } = require('./config/systemConfig');
const app = express();
// LiteSpeed/nginx terminate HTTPS and forward plain HTTP. Trust the proxy
// so socket and redirects still see the public https scheme.
app.set('trust proxy', 1);
const path = require('path');
const cors = require('cors');
const { scheduleAttendanceCheck, scheduleAutoLeaveReassign, deleteNotifications, birthdayNotification, scheduleAutoPayroll } = require('./config/scheduler');
const hbs = require("hbs");
const http = require("http");
const server = http.createServer(app);
const { initSocket } = require("./config/socket");
const { orgUuidHeaderMiddleware } = require('./middleware/orgUuidHeader');
const admsRouter = require("./router/admsRouter");

function mountAdms(basePath) {
    app.use(
        basePath,
        (req, res, next) => {
            res.removeHeader("Content-Security-Policy");
            next();
        },
        express.raw({ type: () => true, limit: "5mb" }),
        (req, res, next) => {
            if (Buffer.isBuffer(req.body)) {
                req.admsBody = req.body.toString("utf8");
            } else if (typeof req.body === "string") {
                req.admsBody = req.body;
            } else {
                req.admsBody = "";
            }
            next();
        },
        admsRouter
    );
}

// ADMS devices POST raw ATTLOG over HTTP. Mount before json/CSP so punches are not consumed
// and browsers/devices are not told to upgrade /iclock to HTTPS.
mountAdms("/iclock");
mountAdms("/iclock/iclock");

// App Setup
app.use(express.json());
// Default cors reflects preflight headers (required for Accept, custom org headers, etc.)
app.use(cors({
    origin: true,
    credentials: true,
    exposedHeaders: ['org_uuid', 'x-org-uuid'],
}));
app.use(orgUuidHeaderMiddleware);
app.use(express.static(path.join(__dirname, '/public')));

// Error middleware
app.use((err, req, res, next) => {
    console.log(err.stack);
    res.status(500).json({ message: 'Something went wrong!' });
});

// Initialize socket with the HTTP server
initSocket(server);

// Set view engine
app.set("view engine", "hbs");

// Set views directory
app.set("views", path.join(__dirname, "views"));

// cache control — upgrade http subresources so HTTPS pages never hit mixed-content blocks
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    if (!String(req.path || '').startsWith('/iclock')) {
        res.set('Content-Security-Policy', 'upgrade-insecure-requests');
    }
    next();
});

// db conect 
connectDB()

//scheduler

scheduleAttendanceCheck()
scheduleAutoLeaveReassign()
deleteNotifications()
birthdayNotification()
scheduleAutoPayroll()

//router

// Routes
app.get("/", (req, res) => {
    res.render("index", { title: "Welcome", message: "Hello from HBS!" });
});

const systemUserRouter = require("./router/systemUserRouter");
app.use("/systemUser", systemUserRouter);

const organizationRouter = require("./router/organizationRouter");
app.use("/organization", organizationRouter);

const employeeRouter = require("./router/employeeRouter");
app.use("/employee", employeeRouter);

const categoryRouter = require("./router/userCategoryRouter");
app.use("/category", categoryRouter);

const userAuthRouter = require("./router/userAuthRouter");
app.use("/auth", userAuthRouter);

const leaveRouter = require("./router/leaveRouter");
app.use("/leave", leaveRouter);

const departmentRouter = require("./router/departmentRouter");
app.use("/department", departmentRouter);

const attendanceRouter = require("./router/attendanceRouter");
app.use("/attendance", attendanceRouter);

const biometricDeviceRouter = require("./router/biometricDeviceRouter");
app.use("/biometric", biometricDeviceRouter);

const holidayRouter = require("./router/holidayRouter");
app.use("/holiday", holidayRouter);

const documentRouter = require("./router/documentRouter");
app.use("/document", documentRouter);

const shiftRouter = require("./router/shiftRouter");
app.use("/shift", shiftRouter);

const settingRouter = require("./router/settingRouter");
app.use("/setting", settingRouter);

const payRollRouter = require("./router/payRollRouter");
app.use("/payRoll", payRollRouter);

const eventRouter = require("./router/eventRouter");
app.use("/event", eventRouter);

const positionRouter = require("./router/positionRouter");
app.use("/position", positionRouter);

const locationRouter = require("./router/locationRouter");
app.use("/location", locationRouter);

const liveLocationRouter = require("./router/liveLocationRouter");
app.use("/liveLocation", liveLocationRouter);

const recruitmentRouter = require("./router/recruitmentRouter");
app.use("/recruitment", recruitmentRouter);

const templateRouter = require("./router/templateRouter");
app.use("/template", templateRouter);

const resignationRouter = require("./router/resignationRouter");
app.use("/resignation", resignationRouter);

const notificationRouter = require("./router/notificationRouter");
app.use("/notification", notificationRouter);

const attendancePolicyRouter = require("./router/attendancePolicyRouter");
app.use("/attendancePolicy", attendancePolicyRouter);

const reportingMethodRouter = require("./router/reportingMethodRouter");
app.use("/reportingMethod", reportingMethodRouter);

const regularizationMethodRouter = require("./router/regularizationMethodRouter");
app.use("/regularizationMethod", regularizationMethodRouter);

const adminDashboardRouter = require("./router/adminDashboardRouter");
app.use("/dashboard", adminDashboardRouter);


server.listen(port, (err) => {
    if (err) {
        console.log(err);
    } else {
        console.log(`✅ Server is running on http://localhost:${port}`);
    }
});
