const express = require('express');
const router = express.Router();
const { authJWT } = require('../middleware/authVerify');
const liveLocation = require('../controller/liveLocation');

router.post('/updateLocation', authJWT, liveLocation.updateLocation);
router.post('/stopLocation', authJWT, liveLocation.stopLocation);
router.get('/getLiveLocations', authJWT, liveLocation.getLiveLocations);
router.get('/getLocationHistory/:employeeId', authJWT, liveLocation.getLocationHistory);

module.exports = router;
