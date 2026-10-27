const multer = require('multer');
const path = require('path');

// Set up multer storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/document/');
    },
    filename: (req, file, cb) => {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

const storageBulck = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/bulckTemplate/');
    },
    filename: (req, file, cb) => {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    // Accept all file types
    cb(null, true);
};

// Upload middleware
const uploadDocumentFile = multer({ storage: storage, fileFilter: fileFilter });
const bulckTemplateFile = multer({ storage: storageBulck, fileFilter: fileFilter });


module.exports = { uploadDocumentFile, bulckTemplateFile };
