const express = require("express");
const router = express.Router();
const { authJWT } = require("../middleware/authVerify");
const category = require("../controller/userCategory");


//role api

router.post("/createCategory", authJWT, category.createCategory);
router.put('/updateCategory/:categoryId', authJWT, category.updateCategory);
router.get('/getCategoryById/:categoryId', authJWT, category.getCategoryById);
router.get('/getAllCategories', authJWT, category.getAllCategories);
router.get('/getCategoryDropdown', authJWT, category.getCategoryDropdown);
router.delete('/deleteCategory/:categoryId', authJWT, category.deleteCategory);
router.post("/changeEmployeeCategory", authJWT, category.changeEmployeeCategory);



module.exports = router