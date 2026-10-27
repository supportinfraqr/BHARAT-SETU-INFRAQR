const express = require("express");
const router = express.Router();
const { authJWT } = require("../middleware/authVerify");
const Reporting = require("../controller/reportingMethod");
const uploadConfig = require('../service/multer/indexMulter');


// ReportingMethod apis

router.post("/createReportingMethod", authJWT, Reporting.createReportingMethod);
router.put('/updateReportingMethod/:methodId', authJWT, Reporting.updateReportingMethod);
router.get('/getReportingMethodById/:methodId', authJWT, Reporting.getReportingMethodById); 
router.get('/getAllReportingMethods', authJWT, Reporting.getReportingMethods);
router.delete('/deleteReportingMethod/:methodId', authJWT, Reporting.deleteReportingMethod);
router.post("/addEmployeeToReportingMethod/:methodId", authJWT, Reporting.assignEmployeesToReportingMethod);
router.post("/removeEmployeeFromReportingMethod/:methodId", authJWT, Reporting.removeEmployeesFromReportingMethod);
router.get('/getEmployeesByReportingMethod/:methodId', authJWT, Reporting.getEmployeesByReportingMethod);
router.get('/getEmployeesNotInReportingMethod', authJWT, Reporting.getEmployeesNotInReportingMethod);


module.exports = router