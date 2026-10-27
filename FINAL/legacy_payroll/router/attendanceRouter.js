const express = require("express");
const router = express.Router();
const { authJWT } = require("../middleware/authVerify");
const attendance = require("../controller/attendance");
const { uploadAttendanceFile } = require('../service/multer/attendanceMulter');
const uploadConfig = require('../service/multer/indexMulter');


router.post("/addAttendance", authJWT, attendance.addAttendance);
router.post("/checkIn", authJWT, attendance.checkIn);
router.post("/checkOut", authJWT, attendance.checkOut);
router.post("/breakIn", authJWT, attendance.breakIn);
router.post("/breakOut", authJWT, attendance.breakOut);
router.put('/updateAttendance/:attendanceId', authJWT, attendance.updateAttendance);
router.get('/getAttendanceById/:attendanceId', authJWT, attendance.getAttendanceById);
router.delete('/deleteAttendance/:attendanceId', authJWT, attendance.deleteAttendance);
router.get('/getAttendanceByDateRange/:employeeId', authJWT, attendance.getAttendanceByDateRange);
router.post('/bulkAddAttendance', authJWT, uploadConfig.single, attendance.bulkAddAttendance);
router.get('/getAllEmployeesAttendanceByDateRange', authJWT, attendance.getAllEmployeesAttendanceByDateRange);
router.get('/getMonthlyAttendanceSummary/:employeeId', authJWT, attendance.getMonthlyAttendanceSummary);
router.get('/todayAttendanceByEmployeeId/:employeeId', authJWT, attendance.todayAttendanceByEmployeeId);
router.get('/getAttendanceRateChart', authJWT, attendance.getAttendanceRateChart);
router.post("/markAbsentEmployees", attendance.markAbsentEmployees);
router.get('/getEmployeeAttendanceByDateRange', authJWT, attendance.getEmployeeAttendanceByDateRange);
router.get('/getEodReports', authJWT, attendance.getEodReports);
router.get('/getEodEmployees', authJWT, attendance.getEodEmployees);
router.put('/updateMyEod', authJWT, attendance.updateMyEod);



module.exports = router