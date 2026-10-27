const express = require("express");
const router = express.Router();
const { authJWT } = require("../middleware/authVerify");
const position = require("../controller/position");

//position type api

router.post("/createPosition", authJWT, position.createPosition);
router.put('/updatePosition/:positionId', authJWT, position.updatePosition);
router.get('/getPositionById/:positionId', authJWT, position.getPositionById);
router.get('/getAllPositions', authJWT, position.getAllPositions);
router.get('/getPositionDropdown', authJWT, position.getPositionDropdown);
router.delete('/deletePosition/:positionId', authJWT, position.deletePosition);




module.exports = router