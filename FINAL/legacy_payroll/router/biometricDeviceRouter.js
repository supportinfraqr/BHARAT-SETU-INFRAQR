const express = require('express');
const router = express.Router();
const { authJWT } = require('../middleware/authVerify');
const biometric = require('../controller/biometricDevice');

router.post('/createDevice', authJWT, biometric.createDevice);
router.put('/updateDevice/:deviceId', authJWT, biometric.updateDevice);
router.get('/getDevices', authJWT, biometric.getDevices);
router.get('/getDevice/:deviceId', authJWT, biometric.getDeviceById);
router.delete('/deleteDevice/:deviceId', authJWT, biometric.deleteDevice);
router.get('/getPunches', authJWT, biometric.getPunches);
router.post('/testPunch', authJWT, biometric.testPunch);

module.exports = router;
