const express = require("express");
const router = express.Router();
const { authJWT } = require("../middleware/authVerify");
const employee = require("../controller/employee");
const { uploadEmployeeFile } = require('../service/multer/employeeMulter');
const uploadConfig = require('../service/multer/indexMulter');

router.post("/addEmployee", authJWT, employee.addEmployee);
router.put('/updateEmployee/:employeeId', authJWT, employee.updateEmployee);
router.get('/getEmployeeById/:employeeId', authJWT, employee.getEmployeeById);
router.get('/getAllEmployees', authJWT, employee.getAllEmployees);
router.delete('/deleteEmployee/:employeeId', authJWT, employee.deleteEmployee);
router.post('/bulkAddEmployees', authJWT, uploadConfig.single, employee.bulkAddEmployees);
router.post("/changeEmployeePasswords", authJWT, employee.changeEmployeePasswords);
router.get("/passwordChangeHistory", authJWT, employee.getPasswordChangeHistory);
router.post("/employeeImg/:employeeId", authJWT, uploadConfig.single, employee.employeeImg);
router.get("/employeeDashboardData", authJWT, employee.employeeDashboardData);
router.get("/getFullEmployeeTree/:managerId", authJWT, employee.getFullEmployeeTree);
router.post("/exportEmployeesToExcel", authJWT, employee.exportEmployeesToExcel);
router.get("/getEmployeeInterviewsByDate/:employeeId", authJWT, employee.getEmployeeInterviewsByDate);
router.get("/getFreeEmployeesForInterview", authJWT, employee.getFreeEmployeesForInterview);
router.get("/getEmployeeDemographics", authJWT, employee.getEmployeeDemographics);
router.get("/getEmployeeHighlights", authJWT, employee.getEmployeeHighlights);
router.post("/changeEmployeeEmail", authJWT, employee.changeEmployeeEmail);
router.put('/exitEmployee/:employeeId', authJWT, employee.exitEmployee);
router.put('/toggleProfileLock/:employeeId', authJWT, employee.toggleProfileLock);

router.post(
  "/addJoiningFormDocuments/:employeeId",
  authJWT,
  uploadConfig.fields,       // <-- multi-field multer config
  employee.addJoiningFormDocuments  // <-- controller function we created
);

// 🔥 NEW: Calculate Payroll Info from Organization Settings
router.post("/calculatePayrollInfo", authJWT, employee.calculatePayrollInfo);

router.get("/employeesList", authJWT, employee.employeesList);

router.post("/candidateJoiningForm", authJWT, employee.candidateJoiningForm);
router.get("/getTempEmployeeDetails/:tempEmployeeId", authJWT, employee.getTempEmployeeDetails);
router.get("/getAllTempEmployees", authJWT, employee.getAllTempEmployees);
router.post('/approvedCandidateJoiningForm/:tempEmployeeId', authJWT, employee.approvedCandidateJoiningForm);


module.exports = router