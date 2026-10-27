const express = require("express");
const router = express.Router();
const { authJWT } = require("../middleware/authVerify");
const department = require("../controller/department");
const uploadConfig = require('../service/multer/indexMulter');



router.post("/createDepartment", authJWT, department.createDepartment);
router.put('/updateDepartment/:departmentId', authJWT, department.updateDepartment);
router.get('/getDepartment/:departmentId', authJWT, department.getDepartment);
router.get('/getAllDepartments', authJWT, department.getAllDepartments);
router.delete('/deleteDepartment/:departmentId', authJWT, department.deleteDepartment);
router.post("/addEmployeeToDepartment/:departmentId", authJWT, department.addEmployeeToDepartment);
router.post("/removeEmployeeFromDepartment/:departmentId", authJWT, department.removeEmployeeFromDepartment);
router.get('/getDepartmentEmployees/:departmentId', authJWT, department.getDepartmentEmployees);
router.post('/bulkAddDepartments',authJWT, uploadConfig.single,department.bulkAddDepartments);
router.get('/getEmployeesNotInDepartment', authJWT, department.getEmployeesNotInDepartment);
router.get('/getDepartmentsDropdown', authJWT, department.getDepartmentsDropdown);




module.exports = router