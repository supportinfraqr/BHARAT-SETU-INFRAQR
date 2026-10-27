const express = require("express");
const router = express.Router();
const { authJWT } = require("../middleware/authVerify");
const holiday = require("../controller/holiday");
const { uploadEmployeeFile } = require('../service/multer/employeeMulter');
const uploadConfig = require('../service/multer/indexMulter');

//holiday type api

router.post("/addHoliday", authJWT, holiday.addHoliday);
router.put('/updateHoliday/:holidayId', authJWT, holiday.updateHoliday);
router.get('/getHolidayById/:holidayId', authJWT, holiday.getHolidayById);
router.get('/getAllHolidays', authJWT, holiday.getAllHolidays);
router.delete('/deleteHoliday/:holidayId', authJWT, holiday.deleteHoliday);
router.post('/bulkAddHolidays',authJWT, uploadConfig.single,holiday.bulkAddHolidays);
router.post("/generateWeekoffs", authJWT, holiday.generateWeekoffs);




module.exports = router