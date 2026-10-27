const express = require("express");
const router = express.Router();
const { authJWT } = require("../middleware/authVerify");

// Import all payroll controllers
const statutoryCompliance = require("../controller/payroll/statutoryCompliance");
const salaryCompensation = require("../controller/payroll/salaryCompensation");
const payrollSchedule = require("../controller/payroll/payrollSchedule");
const payrollRun = require("../controller/payroll/payrollRun");
const claimsDeclaration = require("../controller/payroll/claimsDeclaration");
const staffPortal = require("../controller/payroll/staffPortal");
const fullAndFinal = require("../controller/payroll/fullAndFinal");
const employeePayroll = require("../controller/payroll/employeePayroll");
const tdsManagement = require("../controller/payroll/tdsManagement");
const uploadConfig = require("../service/multer/indexMulter")


// =====================================================
// STATUTORY COMPLIANCE APIs
// =====================================================

router.post("/createOrUpdateCompliance", authJWT, statutoryCompliance.createOrUpdateCompliance);
router.get("/getCompliance", authJWT, statutoryCompliance.getCompliance);

// =====================================================
// SALARY COMPENSATION APIs (Earnings, Deductions, Benefits, Reimbursements)
// =====================================================

router.post("/createSalaryCompensation", authJWT, salaryCompensation.createSalaryCompensation);
router.put("/updateSalaryCompensation/:category/:componentId", authJWT, salaryCompensation.updateSalaryCompensation);
router.get("/getSalaryCompensation/:category/:componentId", authJWT, salaryCompensation.getSalaryCompensation);
router.get("/getSalaryCompenBYCategory/:category", authJWT, salaryCompensation.getSalaryCompenBYCategory);
router.get("/getAllSalaryCompensations", authJWT, salaryCompensation.getAllSalaryCompensations);
router.delete("/deleteSalaryCompensation/:category/:componentId", authJWT, salaryCompensation.deleteSalaryCompensation);

// =====================================================
// PAYROLL SCHEDULE APIs
// =====================================================

router.post("/createOrUpdateSchedule", authJWT, payrollSchedule.createOrUpdateSchedule);
router.get("/getPayrollSchedule", authJWT, payrollSchedule.getPayrollSchedule);
router.get("/getUpcomingPayrollDates", authJWT, payrollSchedule.getUpcomingPayrollDates);
router.get("/calculatePayPeriod", authJWT, payrollSchedule.calculatePayPeriod);

// =====================================================
// HR PAYROLL DASHBOARD APIs
// =====================================================

const hrDashboard = require("../controller/payroll/hrDashboard");

router.get("/hrDashboard", authJWT, hrDashboard.getHrDashboard);

// =====================================================
// PAYROLL RUN & PROCESSING APIs
// =====================================================

router.post("/processPayroll", authJWT, payrollRun.processPayroll);
router.get("/getPayRunMonthlyData", authJWT, payrollRun.getPayRunMonthlyData);
router.get("/getPayrollHistory", authJWT, payrollRun.getPayrollHistory);
router.get("/getMonthlyPayrollHistroy", authJWT, payrollRun.getMonthlyPayrollHistroy);
router.get("/getPayroll/:payrollId", authJWT, payrollRun.getPayrollById);
router.put("/recalculatePayroll/:payrollId", authJWT, payrollRun.recalculatePayroll);
router.put("/updatePayrollStatus/:payrollId", authJWT, payrollRun.updatePayrollStatus);
router.put("/updatePayrollStatusBulk", authJWT, payrollRun.bulkUpdatePayrollStatus);
router.get("/generatePayslip/:payrollId", authJWT, payrollRun.generatePayslip);
router.get("/downloadPayslipPdf/:payrollId", authJWT, payrollRun.downloadPayslipPdf);

router.delete("/deletePayrollRun/:payrollId", authJWT, payrollRun.deletePayrollRun);

// =====================================================
// CLAIMS & DECLARATION APIs
// =====================================================

// Flexible Benefit Plans
router.post("/flexiblePlan/:employeeId", authJWT, claimsDeclaration.createOrUpdateFlexiblePlan);
router.put("/flexiblePlan/:employeeId/:planId/status", authJWT, claimsDeclaration.updateFlexiblePlanStatus);
router.get("/flexiblePlan/:employeeId", authJWT, claimsDeclaration.getFlexiblePlansByEmployee);

// Reimbursement Claims
router.post("/reimbursement/:employeeId", authJWT, claimsDeclaration.submitReimbursementClaim);
router.put("/reimbursement/:employeeId/:claimId/status", authJWT, claimsDeclaration.updateReimbursementStatus);
router.get("/reimbursement/:employeeId", authJWT, claimsDeclaration.getReimbursementsByEmployee);

// Income Tax Declaration
router.post("/taxDeclaration/:employeeId", authJWT, claimsDeclaration.saveIncomeTaxDeclaration);
router.put("/taxDeclaration/:employeeId/:declarationId", authJWT, claimsDeclaration.updateIncomeTaxDeclaration);
router.get("/taxDeclaration/:employeeId", authJWT, claimsDeclaration.getIncomeTaxDeclarationsByEmployee);

// Investment Proof
router.post("/investmentProof/:employeeId", authJWT, claimsDeclaration.uploadInvestmentProof);
router.put("/investmentProof/:employeeId/:proofId/verify", authJWT, claimsDeclaration.verifyInvestmentProof);
router.get("/investmentProof/:employeeId", authJWT, claimsDeclaration.getInvestmentProofsByEmployee);

// Get All Claims
router.get("/allClaims/:employeeId", authJWT, claimsDeclaration.getAllClaimsByEmployee);

// =====================================================
// STAFF PORTAL APIs
// =====================================================

// Portal Settings
router.post("/staffPortal/settings", authJWT, staffPortal.updateStaffPortalSettings);
router.get("/staffPortal/settings", authJWT, staffPortal.getStaffPortalSettings);

// Web Tabs
router.post("/staffPortal/webTab", authJWT, staffPortal.addWebTab);
router.put("/staffPortal/webTab/:tabId", authJWT, staffPortal.updateWebTab);
router.delete("/staffPortal/webTab/:tabId", authJWT, staffPortal.deleteWebTab);
router.get("/staffPortal/webTabs", authJWT, staffPortal.getAllWebTabs);

// Employee Preferences
router.put("/staffPortal/preferences/:employeeId", authJWT, staffPortal.updateEmployeePreferences);
router.get("/staffPortal/preferences/:employeeId", authJWT, staffPortal.getEmployeePreferences);

// =====================================================
// FULL & FINAL SETTLEMENT APIs
// =====================================================

router.post("/fullAndFinal/initiate", authJWT, fullAndFinal.initiateFullAndFinal);
router.put("/fullAndFinal/:settlementId/salaryDues", authJWT, fullAndFinal.updateSalaryDues);
router.put("/fullAndFinal/:settlementId/leaveEncashment", authJWT, fullAndFinal.updateLeaveEncashment);
router.put("/fullAndFinal/:settlementId/bonusIncentives", authJWT, fullAndFinal.updateBonusIncentives);
router.put("/fullAndFinal/:settlementId/deductions", authJWT, fullAndFinal.updateDeductions);
router.put("/fullAndFinal/:settlementId/gratuity", authJWT, fullAndFinal.updateGratuity);
router.post("/fullAndFinal/:settlementId/calculate", authJWT, fullAndFinal.calculateFinalSettlement);
router.post("/fullAndFinal/:settlementId/finalize", authJWT, fullAndFinal.finalizeSettlement);
router.post("/fullAndFinal/:settlementId/approval", authJWT, fullAndFinal.addApproval);
router.put("/fullAndFinal/:settlementId/payment", authJWT, fullAndFinal.updatePaymentDetails);
router.get("/fullAndFinal/exitedEmployees", authJWT, fullAndFinal.getExitedEmployees);
router.get("/fullAndFinal/preview/:employeeId", authJWT, fullAndFinal.getSettlementPreview);
router.get("/fullAndFinal/employee/:employeeId/leaveEncashmentDetails", authJWT, fullAndFinal.getEmployeeLeaveEncashmentDetails);
router.get("/fullAndFinal/employee/:employeeId", authJWT, fullAndFinal.getSettlementByEmployee);
router.get("/fullAndFinal/:settlementId", authJWT, fullAndFinal.getSettlementById);
router.get("/fullAndFinal", authJWT, fullAndFinal.getAllSettlements);

// =====================================================
// EMPLOYEE PAYROLL APIs (Employee-facing - My Payroll Section)
// =====================================================

// Employee payroll dashboard & Form 16
router.get("/employee/dashboard", authJWT, employeePayroll.getMyPayrollDashboard);
router.get("/employee/form16", authJWT, employeePayroll.getMyForm16);
router.get("/employee/form16/part-a/download", authJWT, employeePayroll.downloadMyForm16PartAPdf);
router.get("/employee/form16/part-b/download", authJWT, employeePayroll.downloadMyForm16PartBPdf);
router.get("/employee/form16/download", authJWT, employeePayroll.downloadMyForm16Pdf);
router.get("/employee/tax-report/download", authJWT, tdsManagement.downloadMyTaxReportPdf);
router.get("/employee/tax-report", authJWT, tdsManagement.getMyTaxReport);

// My Payslips / Salary History
router.get("/employee/myPayslips", authJWT, employeePayroll.getMyPayslips);
router.get("/employee/myPayslips/:payrollId", authJWT, employeePayroll.getMyPayslipDetail);
router.get("/employee/salarySummary", authJWT, employeePayroll.getMySalarySummary);
router.get("/employee/annualSalaryStatement", authJWT, employeePayroll.getMyAnnualSalaryStatement);
router.get("/employee/:employeeId/annualSalaryStatement", authJWT, employeePayroll.getEmployeeAnnualSalaryStatement);
router.get("/employee/getMySalaryPdfdownload/:payrollId", authJWT, employeePayroll.getMySalaryPdfdownload);

// My Claims
router.get("/employee/myClaimsSummary", authJWT, employeePayroll.getMyClaimsSummary);
router.get("/employee/reimbursementHeads", authJWT, employeePayroll.getMyReimbursementHeads);
router.post("/employee/submitClaim", authJWT,uploadConfig.fields,employeePayroll.submitMyClaim);
router.get("/employee/getAllClaimsSummary", authJWT, employeePayroll.getAllClaimsSummary);

// VPF (stored on employee.payrollPreferences — no separate collection)
const vpfManagement = require("../controller/payroll/vpfManagement");
router.get("/employee/vpf", authJWT, vpfManagement.getMyVpf);
router.post("/employee/vpf/start", authJWT, vpfManagement.startVpf);
router.post("/employee/vpf/stop", authJWT, vpfManagement.stopVpf);
router.get("/vpf/all", authJWT, vpfManagement.getAllVpfRequests);

// =====================================================
// 🔥 PAYROLL INFO MANAGEMENT APIs (NEW)
// =====================================================

// Calculate Payroll Info (Preview before creating employee)
router.post("/calculatePayrollInfo", authJWT, employeePayroll.calculatePayrollInfo);

// Get Employee Payroll Information
router.get("/employee/:employeeId/payrollInfo", authJWT, employeePayroll.getEmployeePayrollInfo);

// Salary structure preview (org rules + employee overrides) — use on salary revision screen
router.get(
  "/employee/:employeeId/salary-structure-preview",
  authJWT,
  employeePayroll.getSalaryStructurePreview
);

// Save per-employee component overrides (e.g. bonus 1000 → 100 for one employee)
router.put(
  "/employee/:employeeId/component-overrides",
  authJWT,
  employeePayroll.saveEmployeeComponentOverrides
);

// Update Employee Payroll Information
router.put("/employee/:employeeId/payrollInfo", authJWT, employeePayroll.updateEmployeePayrollInfo);

// Get Organization Salary Components/Rules
router.get("/salaryComponents", authJWT, employeePayroll.getSalaryComponents);

// Bulk Update Payroll Info for Multiple Employees
router.post("/bulkUpdatePayrollInfo", authJWT, employeePayroll.bulkUpdatePayrollInfo);

// =====================================================
// PAYROLL IMPORT APIs
// =====================================================

const payrollImportRouter = require("./payrollImportRouter");
router.use("/import", payrollImportRouter);

// =====================================================
// TDS MANAGEMENT APIs
// =====================================================

// TDS Configuration
router.post("/tds/config", authJWT, tdsManagement.createOrUpdateTDSConfig);
router.get("/tds/config", authJWT, tdsManagement.getTDSConfig);

// Employee TDS
router.post("/tds/calculate/:employeeId", authJWT, tdsManagement.calculateEmployeeTDS);
router.get("/tds/employee/:employeeId", authJWT, tdsManagement.getEmployeeTDS);
router.get("/tds/hra-details/:employeeId", authJWT, tdsManagement.getEmployeeHRAForTDS);
// Employee ESS aliases (must be before :employeeId routes)
router.get("/tds/tax-report/download", authJWT, tdsManagement.downloadMyTaxReportPdf);
router.get("/tds/tax-report", authJWT, tdsManagement.getMyTaxReport);
router.get("/tds/tax-report/:employeeId/download", authJWT, tdsManagement.downloadEmployeeTaxReportPdf);
router.get("/tds/tax-report/:employeeId", authJWT, tdsManagement.getEmployeeTaxReport);
router.get("/tds/list", authJWT, tdsManagement.getEmployeeTDSList);
router.delete("/tds/record/:tdsRecordId", authJWT, tdsManagement.deleteEmployeeTDS);
router.put("/tds/declaration/:employeeId", authJWT, tdsManagement.updateTDSDeclaration);
router.put("/tds/investment-declaration", authJWT, tdsManagement.saveInvestmentDeclarationDetails);
router.delete("/tds/investment-declaration", authJWT, tdsManagement.deleteMyInvestmentDeclaration);
router.put("/tds/submitInvestmentproof", authJWT, uploadConfig.fields, tdsManagement.submitInvestmentproof);
router.put("/tds/proof-status/:employeeId", authJWT, tdsManagement.updateInvestmentProofStatus);
router.put("/tds/lock/:employeeId", authJWT, tdsManagement.lockUnlockTDS);
router.post("/tds/bulkCalculate", authJWT, tdsManagement.bulkCalculateTDS);

// =====================================================
// SALARY REVISION APIs
// =====================================================

const salaryRevision = require("../controller/payroll/salaryRevision");

router.post("/revision/create", authJWT, salaryRevision.createSalaryRevision);
router.put("/revision/:revisionId/approve", authJWT, salaryRevision.approveSalaryRevision);
router.post("/revision/:revisionId/implement", authJWT, salaryRevision.implementSalaryRevision);
router.delete("/revision/:revisionId", authJWT, salaryRevision.deleteSalaryRevision);
router.get("/revision", authJWT, salaryRevision.getAllSalaryRevisions);
router.get("/revision/employee/:employeeId", authJWT, salaryRevision.getEmployeeRevisionHistory);
router.get("/revision/:revisionId", authJWT, salaryRevision.getSalaryRevisionById);

// =====================================================
// ARREARS MANAGEMENT APIs
// =====================================================

const arrearsManagement = require("../controller/payroll/arrearsManagement");

router.post("/arrears/create", authJWT, arrearsManagement.createArrears);
router.put("/arrears/:arrearsId/approve", authJWT, arrearsManagement.approveArrears);
router.put("/arrears/:arrearsId/pay", authJWT, arrearsManagement.payArrears);
router.delete("/arrears/:arrearsId", authJWT, arrearsManagement.deleteArrears);
router.get("/arrears", authJWT, arrearsManagement.getAllArrears);
router.get("/arrears/employee/:employeeId", authJWT, arrearsManagement.getEmployeeArrears);
router.get("/arrears/pending/:employeeId", authJWT, arrearsManagement.calculatePendingArrears);

// =====================================================
// LOAN MANAGEMENT APIs
// =====================================================

const loanManagement = require("../controller/payroll/loanManagement");

router.post("/loan/create-loan-type", authJWT, loanManagement.createLoanType);
router.get("/loan/get-loan-types", authJWT, loanManagement.getLoanTypes);
router.get("/loan/get-loan-typeById/:loanTypeId", authJWT, loanManagement.getLoanTypeById);
router.put( "/loan/upadte-loan-type/:loanTypeId", authJWT, loanManagement.updateLoanType);
router.delete("/loan/delete-loan-type/:loanTypeId", authJWT, loanManagement.deleteLoanType);

router.post("/loan/create-loan", authJWT, loanManagement.createLoan);
router.get("/loan/get-loans", authJWT, loanManagement.getLoans);
router.get("/loan/get-loanById/:loanId", authJWT, loanManagement.getLoanById);
router.post("/loan/record-repayment/:loanId", authJWT, loanManagement.recordRepayment);

// =====================================================
// CTC CALCULATOR APIs
// =====================================================

const ctcCalculator = require("../controller/payroll/ctcCalculator");

router.post("/ctc/fromGross", authJWT, ctcCalculator.calculateCTCFromGross);
router.post("/ctc/fromCTC", authJWT, ctcCalculator.calculateGrossFromCTC);
router.post("/ctc/buildStructure", authJWT, ctcCalculator.buildSalaryStructure);
router.post("/ctc/takeHome", authJWT, ctcCalculator.calculateTakeHome);

// =====================================================
// PAYROLL REPORTS & ANALYTICS APIs
// =====================================================

const payrollReports = require("../controller/payroll/payrollReports");

router.get("/reports/summary", authJWT, payrollReports.getPayrollSummary);
router.get("/reports/ytd", authJWT, payrollReports.getYTDReport);
router.get("/reports/statutory", authJWT, payrollReports.getStatutoryReport);
router.get("/reports/tds", authJWT, payrollReports.getTDSReport);
router.get("/reports/ctc", authJWT, payrollReports.getCTCReport);
router.get("/reports/variance", authJWT, payrollReports.getVarianceReport);

// =====================================================
// BANK FILE GENERATION APIs
// =====================================================

const bankFileGeneration = require("../controller/payroll/bankFileGeneration");

router.post("/bank/generateFile", authJWT, bankFileGeneration.generateBankFile);
router.get("/bank/history", authJWT, bankFileGeneration.getBankFileHistory);
router.get("/bank/download/:fileId", authJWT, bankFileGeneration.downloadBankFile);
router.delete("/bank/:fileId", authJWT, bankFileGeneration.deleteBankFile);
router.get("/bank/validate", authJWT, bankFileGeneration.validateBankDetails);

// =====================================================
// FORM 16 GENERATION APIs
// =====================================================

const form16 = require("../controller/payroll/form16");

router.get("/form16/summary", authJWT, form16.getForm16Summary);
router.post("/form16/bulk", authJWT, form16.bulkGenerateForm16);
router.get("/form16/:employeeId/download", authJWT, form16.downloadForm16Pdf);
router.get("/form16/:employeeId", authJWT, form16.generateForm16);

// =====================================================
// AUDIT LOG APIs
// =====================================================

const auditLog = require("../controller/payroll/auditLog");

router.get("/audit/logs", authJWT, auditLog.getAuditLogs);
router.get("/audit/log/:logId", authJWT, auditLog.getAuditLogById);
router.get("/audit/employee/:employeeId", authJWT, auditLog.getEmployeeAuditHistory);

module.exports = router;