const express = require("express");
const router = express.Router();
const userAuth = require("../controller/userAuth");
const{authJWT}= require("../middleware/authVerify");


router.post('/login',userAuth.login);
router.post('/logOut',authJWT,userAuth.logOut);


module.exports=router