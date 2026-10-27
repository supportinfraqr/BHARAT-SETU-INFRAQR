const express = require("express");
const router = express.Router();
const { authJWT } = require("../middleware/authVerify");
const RegularizationMethod = require("../controller/regularizationMethod");
const RegularizationRequest = require("../controller/regularizationRequest");
const uploadConfig = require('../service/multer/indexMulter');


router.post("/createRegularizationMethod", authJWT, RegularizationMethod.createRegularizationMethod);
router.put('/updateRegularizationMethod/:methodId', authJWT, RegularizationMethod.updateRegularizationMethod);
router.get('/getRegularizationMethodById/:methodId', authJWT, RegularizationMethod.getRegularizationMethodById);
router.get('/getAllRegularizationMethods', authJWT, RegularizationMethod.getRegularizationMethods);
router.get('/getRegularizationMethodsByCategory', authJWT, RegularizationMethod.getRegularizationMethodsByCategory);
router.delete('/deleteRegularizationMethod/:methodId', authJWT, RegularizationMethod.deleteRegularizationMethod);


// Regularization request APIs
router.post("/applyRegularization", authJWT, RegularizationRequest.applyRegularization);
router.put('/updateRegularizationRequest/:requestId', authJWT, RegularizationRequest.updateRegularizationRequest);
router.put('/cancelRegularizationRequest/:requestId', authJWT, RegularizationRequest.cancelRegularizationRequest);
router.delete('/deleteRegularizationRequest/:requestId', authJWT, RegularizationRequest.deleteRegularizationRequest);
router.put('/approveRejectRegularization/:requestId', authJWT, RegularizationRequest.approveRejectRegularization);
router.get('/getMyRegularizationRequests/:employeeId', authJWT, RegularizationRequest.getMyRegularizationRequests);
router.get('/getAllRegularizations', authJWT, RegularizationRequest.getAllRegularizations);




module.exports = router