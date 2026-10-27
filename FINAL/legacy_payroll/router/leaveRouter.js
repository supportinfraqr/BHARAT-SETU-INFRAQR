const express = require("express");
const router = express.Router();
const { authJWT } = require("../middleware/authVerify");
const leaveName = require("../controller/leaveController/leaveName");
const leaveReason = require("../controller/leaveController/leaveReason");
const leaveType = require("../controller/leaveController/leaveType");
const leaveBalance = require("../controller/leaveController/leaveBalance");
const leaveRequest = require("../controller/leaveController/leaveRequest");


// leaveName api
router.post("/createLeaveName", authJWT, leaveName.createLeaveName);
router.put('/updateLeaveName/:leaveNameId', authJWT, leaveName.updateLeaveName);
router.get('/getLeaveName/:leaveNameId', authJWT, leaveName.getLeaveNameById);
router.get('/getAllLeaveNames', authJWT, leaveName.getLeaveNames);
router.delete('/deleteLeaveName/:leaveNameId', authJWT, leaveName.deleteLeaveName);

// leave reason api
router.post("/createLeaveReason", authJWT, leaveReason.createLeaveReason);
router.put('/updateLeaveReason/:leaveReasonId', authJWT, leaveReason.updateLeaveReason);
router.get('/getLeaveReasonById/:leaveReasonId', authJWT, leaveReason.getLeaveReasonById);
router.get('/getAllLeaveReasons', authJWT, leaveReason.getLeaveReasons);
router.get('/getLeaveReasonsByLeaveType/:leaveTypeId', authJWT, leaveReason.getLeaveReasonsByLeaveType);
router.delete('/deleteLeaveReason/:leaveReasonId', authJWT, leaveReason.deleteLeaveReason);

// leave type api
router.post("/createLeaveType", authJWT, leaveType.createLeaveType);
router.post("/createLOPManually", authJWT, leaveType.createLOPManually);
router.put('/updateLeaveType/:leaveTypeId', authJWT, leaveType.updateLeaveType);
router.get('/getLeaveTypeById/:leaveTypeId', authJWT, leaveType.getLeaveTypeById);
router.get('/getAllLeaveTypes', authJWT, leaveType.getLeaveTypes);
router.delete('/deleteLeaveType/:leaveTypeId', authJWT, leaveType.deleteLeaveType);
router.post("/assignLeaveTypes/:leaveTypeId", authJWT, leaveType.assignLeaveTypes);
router.post("/processYearEndLeaveRenewal", authJWT, leaveType.processYearEndLeaveRenewal);
router.get("/getLeaveYearEndHistory/:employeeId", authJWT, leaveType.getLeaveYearEndHistory);

// leave balance api
router.get('/getAllLeaveBalancesByEmployee/:employeeId', authJWT, leaveBalance.getAllLeaveBalancesByEmployee);
router.get('/getYearlyLeaveBalanceReport/:employeeId', authJWT, leaveBalance.getYearlyLeaveBalanceReport);

// leave request api
router.post("/createLeaveRequest", authJWT, leaveRequest.applyLeaveRequest);
router.put('/updateLeaveRequest/:leaveRequestId', authJWT, leaveRequest.updateLeaveRequest);
router.delete('/deleteLeaveRequest/:leaveRequestId', authJWT, leaveRequest.deleteLeaveRequest);
router.get('/getLeaveRequest/:leaveRequestId', authJWT, leaveRequest.getLeaveRequestById);
router.post('/approveLeaveRequest/:leaveRequestId', authJWT, leaveRequest.approveLeaveRequest);
router.post('/rejectLeaveRequest/:leaveRequestId', authJWT, leaveRequest.rejectLeaveRequest);
router.post('/cancelLeaveRequest/:leaveRequestId', authJWT, leaveRequest.cancelLeaveRequest);
router.get('/getAllLeaveRequests', authJWT, leaveRequest.getAllLeaveRequests);
router.get('/getAllLeaveRequestsForEmployee/:employeeId', authJWT, leaveRequest.getMyLeaveRequests);
router.get('/getTodaysLeaves', authJWT, leaveRequest.getTodaysLeaves);
router.get('/getTodaysLeaves', authJWT, leaveRequest.getTodaysLeaves);

module.exports = router