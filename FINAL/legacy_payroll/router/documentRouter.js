const express = require("express");
const router = express.Router();
const { authJWT } = require("../middleware/authVerify");
const document = require("../controller/document");
const { uploadDocumentFile } = require('../service/multer/documentMulter');
const uploadConfig = require('../service/multer/indexMulter');


//folder api

router.post("/createFolder", authJWT, document.createFolder);
router.put('/updateFolder/:folderId', authJWT, document.updateFolder);
router.get('/getFolderById/:folderId', authJWT, document.getFolderById);
router.get('/getFoldersAndDocuments', authJWT, document.getFoldersAndDocuments);
router.delete('/deleteFolder/:folderId', authJWT, document.deleteFolder);

//document api

router.post("/uploadDocument", authJWT, uploadConfig.single, document.uploadDocument);
router.put('/updateDocument/:documentId', authJWT, document.updateDocument);
router.get('/getDocumentById/:documentId', authJWT, document.getDocumentById);
router.delete('/deleteDocument/:documentId', authJWT, document.deleteDocument);
router.get('/downloadDocument/:documentId', authJWT, document.downloadDocument);


module.exports = router