const express = require("express");
const router = express.Router();
const { authJWT } = require("../middleware/authVerify");
const event = require("../controller/event");

//event type api

router.post("/addEvent", authJWT, event.addEvent);
router.put('/updateEvent/:eventId', authJWT, event.updateEvent);
router.get('/getEventById/:eventId', authJWT, event.getEventById);
router.get('/getAllEvents', authJWT, event.getAllEvents);
router.delete('/deleteEvent/:eventId', authJWT, event.deleteEvent);




module.exports = router