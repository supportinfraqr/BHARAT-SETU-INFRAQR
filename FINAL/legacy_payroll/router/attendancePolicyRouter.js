const express = require("express");
const router = express.Router();
const { authJWT } = require("../middleware/authVerify");
const AttendancePolicy = require("../controller/attendancePolicy");
const uploadConfig = require('../service/multer/indexMulter');

// AttendancePolicy apis

router.post("/createAttendancePolicy", authJWT, AttendancePolicy.createAttendancePolicy);
router.put('/updateAttendancePolicy/:policyId', authJWT, AttendancePolicy.updateAttendancePolicy);
router.get('/getAttendancePolicyById/:policyId', authJWT, AttendancePolicy.getAttendancePolicyById);
router.get('/getAllAttendancePolicies', authJWT, AttendancePolicy.getAttendancePolicies);
router.delete('/deleteAttendancePolicy/:policyId', authJWT, AttendancePolicy.deleteAttendancePolicy);
router.post("/assignEmployeesToAttendancePolicy/:policyId", authJWT, AttendancePolicy.assignEmployeesToAttendancePolicy);
router.post("/removeEmployeesFromAttendancePolicy/:policyId", authJWT, AttendancePolicy.removeEmployeesFromAttendancePolicy);
router.get('/getEmployeesByAttendancePolicy/:policyId', authJWT, AttendancePolicy.getEmployeesByAttendancePolicy);
router.get('/getEmployeesNotInAttendancePolicy', authJWT, AttendancePolicy.getEmployeesNotInAttendancePolicy);

// Sandwich rule calculation
router.post('/calculateEmployeeSandwichDates/:employeeId', authJWT, AttendancePolicy.calculateEmployeeSandwichDates);

module.exports = router