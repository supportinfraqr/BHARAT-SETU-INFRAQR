const express = require("express");
const router = express.Router();
const { authJWT } = require("../middleware/authVerify");
const setting = require("../controller/setting");
const { bulckTemplateFile } = require('../service/multer/documentMulter');


//bulckTemplate api

router.post("/uploadBulckTemplate", authJWT, bulckTemplateFile.single('file'), setting.uploadBulckTemplate);
router.get('/getBulckTemplateId/:documentId', authJWT, setting.getBulckTemplateId);
router.get('/getAllBulckTemplate', authJWT, setting.getAllBulckTemplate);
router.delete('/deleteBulckTemplate/:documentId', authJWT, setting.deleteBulckTemplate);
router.get('/downloadBulckTemplate/:documentId', authJWT, setting.downloadBulckTemplate);


module.exports = router