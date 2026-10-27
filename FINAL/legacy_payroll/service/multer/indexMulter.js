// Configuring in-memory storage with multer
const path = require('path');
const multer = require('multer');

const storage = multer.memoryStorage();

// Updated file filter to accept multiple file types
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',  // .xlsx
    'application/vnd.ms-excel',  // .xls
    'text/csv',  // .csv
    'application/pdf',  // .pdf
    'image/jpeg',  // .jpg
    'image/png',  // .png
    'image/gif',  // .gif
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);  // Accept file
  } else {
    cb(new Error('Invalid file type. Only .xlsx, .csv, .pdf, .jpg, .png, .gif files are allowed'), false);  // Reject file
  }
};

// Multer upload configurations for single, array, and mixed file uploads
const uploadConfig = {
  single: multer({
    storage,
    fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 }, // Max file size 10MB
  }).single('file'),

  array: multer({
    storage,
    fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 }, // Max file size 10MB for each file
  }).array('files', 10),

  fields: multer({
    storage,
    fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 }, // Max file size 10MB for each field
  }).fields([
    { name: 'profileImage', maxCount: 1 },
    { name: 'documents', maxCount: 5 },

      // reimbursement claim files
    { name: "proofFile", maxCount: 20 },
    { name: "attachments", maxCount: 10 },
    // investment declaration proof files
    { name: "rentAttachments", maxCount: 20 },
    { name: "homeLoanAttachment", maxCount: 1 },
    { name: "letOutPropertyAttachment", maxCount: 1 },
    { name: "investment80CAttachments", maxCount: 100 },
    { name: "investment80DAttachments", maxCount: 100 },
    { name: "otherInvestmentAttachments", maxCount: 50 },
    { name: "otherIncomeAttachment", maxCount: 1 },
    //new Fields for Joining Form
    { name: "permanentAddressProof", maxCount: 1 },
    { name: "presentAddressProof", maxCount: 1 },
    { name: "qualificationProof", maxCount: 1 },
    { name: "bloodGroupProof", maxCount: 1},
    { name: "previousEmploymentProof", maxCount: 1},
    { name: "salarySlip", maxCount: 1 },
    { name: "relievingLetter", maxCount: 1 },
    { name: "bankAccountProof", maxCount: 1 },
    { name: "aadhaar", maxCount: 1 },
    { name: "passport", maxCount: 1 },
    { name: "cancelledCheque", maxCount: 1},

 
  ]),

  emailAttachments: multer({
    storage,
    limits: { fileSize: 8 * 1024 * 1024, files: 5 },
    fileFilter: (req, file, cb) => {
      const allowedMimeTypes = new Set([
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain',
        'text/csv',
        'application/rtf',
        'text/rtf',
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
      ]);
      const allowedExtensions = new Set([
        '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
        '.txt', '.csv', '.rtf', '.jpg', '.jpeg', '.png', '.gif', '.webp',
      ]);
      const extension = path.extname(file.originalname || '').toLowerCase();
      if (allowedMimeTypes.has(file.mimetype) || allowedExtensions.has(extension)) {
        cb(null, true);
        return;
      }
      cb(new Error('Upload a PDF, Word, Excel, PowerPoint, text, or image file'));
    },
  }).array('attachments', 5),
};

module.exports = uploadConfig;
