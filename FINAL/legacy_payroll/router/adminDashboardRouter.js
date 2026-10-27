const express = require('express');
const router = express.Router();
const { authJWT } = require('../middleware/authVerify');
const adminDashboard = require('../controller/adminDashboard');

router.get('/adminSummary', authJWT, adminDashboard.getAdminDashboardSummary);

module.exports = router;
