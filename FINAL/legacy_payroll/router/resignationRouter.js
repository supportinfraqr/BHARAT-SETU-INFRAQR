const express = require("express");
const router = express.Router();
const { authJWT } = require("../middleware/authVerify");
const resignation = require("../controller/resignation");


//PreResignation api

router.post("/addPreResignation", authJWT, resignation.addPreResignation);
router.put('/updatePreResignation/:preResignationId', authJWT, resignation.updatePreResignation);
router.get('/getPreResignationById/:preResignationId', authJWT, resignation.getPreResignationById);
router.get('/getAllPreResignations', authJWT, resignation.getAllPreResignations);
router.delete('/deletePreResignation/:preResignationId', authJWT, resignation.deletePreResignation);

//Resignation api

router.post("/addResignation", authJWT, resignation.addResignation);
router.put('/updateResignation/:resignationId', authJWT, resignation.updateResignation);
router.get('/getResignationById/:resignationId', authJWT, resignation.getResignationById);
router.get('/getAllResignations', authJWT, resignation.getAllResignations);
router.delete('/deleteResignation/:resignationId', authJWT, resignation.deleteResignation);

//dashboard
router.get('/getResignationAnalytics', authJWT, resignation.getResignationAnalytics);
router.get('/getPreResignationAnalytics', authJWT, resignation.getPreResignationAnalytics);
router.get('/getResignationAnalyticsYearly', authJWT, resignation.getResignationAnalyticsYearly);




module.exports = router