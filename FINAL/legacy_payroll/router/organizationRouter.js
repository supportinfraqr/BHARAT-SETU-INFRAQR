const express = require("express");
const router = express.Router();
const { authJWT } = require("../middleware/authVerify");
const organization = require("../controller/organization");
const uploadConfig = require('../service/multer/indexMulter');


router.post("/addOrganization", authJWT, organization.addOrganization);
router.put('/updateOrganization/:organizationId', authJWT, organization.updateOrganization);
router.get('/getOrganization/:organizationId', authJWT, organization.getOrganization);
router.delete('/deleteOrganization/:organizationId', authJWT, organization.deleteOrganization);
router.put('/lastOrgAccessed/:organizationId', authJWT, organization.lastOrgAccessed);
router.post("/orgLogo/:organizationId", authJWT, uploadConfig.single, organization.orgLogo);
router.post("/sendEmail", authJWT, organization.sendEmailController);
router.put('/updateEmailConfig/:organizationId', authJWT, organization.updateEmailConfig);
router.get('/getEmailConfig/:organizationId', authJWT, organization.getEmailConfig);
router.get("/getOrganizationWithLocations", authJWT, organization.getOrganizationWithLocations);
router.get("/getOrganizationsDropdown", authJWT, organization.getOrganizationsDropdown);


module.exports = router