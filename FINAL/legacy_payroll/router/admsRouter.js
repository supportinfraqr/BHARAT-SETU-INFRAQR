const express = require('express');
const router = express.Router();
const adms = require('../controller/adms');

router.all(['/cdata', '/cdata.aspx', '/iclock/cdata', '/iclock/cdata.aspx'], adms.handleCdata);
router.all(['/getrequest', '/getrequest.aspx', '/iclock/getrequest', '/iclock/getrequest.aspx'], adms.handleGetRequest);
router.all(['/devicecmd', '/devicecmd.aspx', '/iclock/devicecmd', '/iclock/devicecmd.aspx'], adms.handleDeviceCmd);
router.all(['/registry', '/ping', '/', '/iclock', '/iclock/ping'], adms.handlePing);
router.all('*', adms.handleGetRequest);

module.exports = router;
