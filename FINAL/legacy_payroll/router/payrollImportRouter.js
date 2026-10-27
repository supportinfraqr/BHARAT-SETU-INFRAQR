const express = require('express');
const router = express.Router();
const { authJWT } = require('../middleware/authVerify');
const uploadConfig = require('../service/multer/indexMulter');
const payrollImport = require('../controller/payroll/payrollImport');

// One-time earnings & deductions import (per pay period)
router.post(
  '/one-time-earnings-deductions/preview',
  authJWT,
  uploadConfig.single,
  payrollImport.previewOneTimeEarningsDeductions
);
router.post(
  '/one-time-earnings-deductions/confirm',
  authJWT,
  payrollImport.confirmOneTimeEarningsDeductions
);
router.get('/one-time-earnings-deductions', authJWT, payrollImport.getOneTimeEarningsDeductions);
router.delete(
  '/one-time-earnings-deductions/:importBatchId',
  authJWT,
  payrollImport.cancelOneTimeEarningsDeductions
);

// Salary revision bulk import (creates SalaryRevision records + optional approve/implement)
router.post(
  '/salary-revision/preview',
  authJWT,
  uploadConfig.single,
  payrollImport.previewSalaryRevisionImport
);
router.post('/salary-revision/confirm', authJWT, payrollImport.confirmSalaryRevisionImport);
router.get('/salary-revision', authJWT, payrollImport.getSalaryRevisionImport);
router.delete(
  '/salary-revision/:importBatchId',
  authJWT,
  payrollImport.cancelSalaryRevisionImport
);

module.exports = router;
