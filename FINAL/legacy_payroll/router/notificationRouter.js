const express = require("express");
const router = express.Router();
const { authJWT } = require("../middleware/authVerify");
const notification = require("../controller/notification");



router.get('/getNotification/:employeeId', authJWT, notification.getNotification);
router.put('/notificationStatus', authJWT, notification.notificationStatus);




module.exports = router