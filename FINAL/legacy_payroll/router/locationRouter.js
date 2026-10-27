const express = require("express");
const router = express.Router();
const { authJWT } = require("../middleware/authVerify");
const location = require("../controller/location");



router.post("/addLocation", authJWT, location.addLocation);
router.get('/getAllLocation', authJWT, location.getAllLocation);
router.get('/getLocationById/:locationId', authJWT, location.getLocationById);
router.put('/updateLocation/:locationId', authJWT, location.updateLocation);




module.exports = router