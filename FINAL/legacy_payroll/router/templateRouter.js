const express = require("express");
const router = express.Router();
const { authJWT } = require("../middleware/authVerify");
const template = require("../controller/template");

//template type api

router.post("/addTemplate", authJWT, template.addTemplate);
router.put('/updateTemplate/:templateId', authJWT, template.updateTemplate);
router.get('/getTemplateById/:templateId', authJWT, template.getTemplateById);
router.get('/getAllTemplates', authJWT, template.getAllTemplates);
router.delete('/deleteTemplate/:templateId', authJWT, template.deleteTemplate);




module.exports = router