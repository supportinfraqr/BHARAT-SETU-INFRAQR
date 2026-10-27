const express = require("express");
const router = express.Router();
const { authJWT } = require("../middleware/authVerify");
const shift = require("../controller/shift");
const uploadConfig = require('../service/multer/indexMulter');


//shift api

router.post("/addShift", authJWT, shift.addShift);
router.put('/updateShift/:shiftId', authJWT, shift.updateShift);
router.get('/getShiftById/:shiftId', authJWT, shift.getShiftById);
router.get('/getAllShifts', authJWT, shift.getAllShifts);
router.delete('/deleteShift/:shiftId', authJWT, shift.deleteShift);
router.post("/addEmployeeToShift/:shiftId", authJWT, shift.addEmployeeToShift);
router.post("/removeEmployeeFromShift/:shiftId", authJWT, shift.removeEmployeeFromShift);
router.get('/getShiftEmployees/:shiftId', authJWT, shift.getShiftEmployees);
router.post('/transferEmployeesBetweenShifts', authJWT, shift.transferEmployeesBetweenShifts);
router.post('/bulkAddShifts', authJWT, uploadConfig.single, shift.bulkAddShifts);
router.get('/getEmployeeShiftHistory', authJWT, shift.getEmployeeShiftHistory);
router.get('/getEmployeesNotInShift', authJWT, shift.getEmployeesNotInShift);
router.get('/getShiftsDropdown', authJWT, shift.getShiftsDropdown);




module.exports = router