# Payroll API Quick Reference Guide

## Base URL
```
http://localhost:5000/api/payroll
```

## Headers Required
```javascript
{
  "org_uuid": "your-organization-uuid",
  "Authorization": "Bearer your-jwt-token"
}
```

---

## 🔥 Most Used APIs

### 1. Process Monthly Payroll
```http
POST /processPayroll
Content-Type: application/json

{
  "month": "Feb",
  "year": 2026,
  "employeeIds": [] // Empty for all employees
}
```

### 2. Get Payroll Summary
```http
GET /reports/summary?month=Feb&year=2026
```

### 3. Calculate Employee TDS
```http
POST /tds/calculate/:employeeId
Content-Type: application/json

{
  "financialYear": "2025-2026",
  "taxRegime": "new",
  "declaredDeductions": {
    "section80C": 150000,
    "section80D": 25000
  }
}
```

### 4. Generate Bank File
```http
POST /bank/generateFile
Content-Type: application/json

{
  "month": "Feb",
  "year": 2026,
  "bankFormat": "NEFT"
}
```

### 5. Generate Payslip
```http
GET /generatePayslip/:payrollId
```

---

## 📋 API Categories

### STATUTORY COMPLIANCE
```http
POST   /createOrUpdateCompliance      # Setup EPF, ESI, PT
GET    /getCompliance                 # Get compliance config
```

### SALARY COMPONENTS
```http
POST   /createSalaryCompensation              # Create component
PUT    /updateSalaryCompensation/:category/:componentId
GET    /getSalaryCompenBYCategory/:category   # List by category
GET    /getAllSalaryCompensations             # List all
DELETE /deleteSalaryCompensation/:category/:componentId
```

### PAYROLL SCHEDULE
```http
POST   /createOrUpdateSchedule         # Set payroll frequency
GET    /getPayrollSchedule             # Get schedule
GET    /getUpcomingPayrollDates        # Next 12 cycles
GET    /calculatePayPeriod             # Calculate for date
```

### PAYROLL PROCESSING
```http
POST   /processPayroll                 # Run payroll
GET    /getPayrollHistory              # History
GET    /getPayroll/:payrollId          # Get by ID
PUT    /updatePayrollStatus/:payrollId # Approve/Reject
GET    /generatePayslip/:payrollId     # Generate slip
DELETE /deletePayrollRun/:payrollId    # Delete
```

### TDS MANAGEMENT
```http
POST   /tds/config                     # Setup TDS slabs
GET    /tds/config?financialYear=2025-2026
POST   /tds/calculate/:employeeId      # Calculate TDS
GET    /tds/employee/:employeeId       # Get TDS record
PUT    /tds/declaration/:employeeId    # Update deductions
PUT    /tds/lock/:employeeId           # Lock TDS
POST   /tds/bulkCalculate              # Bulk for all
```

### SALARY REVISION
```http
POST   /revision/create                      # New revision
PUT    /revision/:revisionId/approve         # Approve
POST   /revision/:revisionId/implement       # Implement
GET    /revision                             # List all
GET    /revision/:revisionId                 # Get by ID
GET    /revision/employee/:employeeId        # Employee history
```

### ARREARS
```http
POST   /arrears/create                 # Create arrears
PUT    /arrears/:arrearsId/approve     # Approve
PUT    /arrears/:arrearsId/pay         # Mark paid
GET    /arrears                        # List all
GET    /arrears/employee/:employeeId   # Employee arrears
GET    /arrears/pending/:employeeId    # Pending only
```

### CTC CALCULATOR
```http
POST   /ctc/fromGross                  # CTC from gross
POST   /ctc/fromCTC                    # Gross from CTC
POST   /ctc/buildStructure             # Build structure
POST   /ctc/takeHome                   # Take-home calc
```

### REPORTS
```http
GET    /reports/summary?month=Feb&year=2026       # Summary
GET    /reports/ytd?year=2026                     # Year-to-date
GET    /reports/statutory?month=Feb&year=2026     # EPF/ESI/PT
GET    /reports/tds?financialYear=2025-2026       # TDS
GET    /reports/ctc                               # CTC
GET    /reports/variance?month1=Jan&year1=2026&month2=Feb&year2=2026
```

### BANK FILES
```http
POST   /bank/generateFile              # Generate file
GET    /bank/history                   # File history
GET    /bank/download/:fileName        # Download
GET    /bank/validate?month=Feb&year=2026  # Validate
```

### FORM 16
```http
GET    /form16/:employeeId?financialYear=2025-2026
POST   /form16/bulk                    # Bulk generate
GET    /form16/summary?financialYear=2025-2026
```

### CLAIMS & DECLARATIONS
```http
# Flexible Benefits
POST   /flexiblePlan/:employeeId
PUT    /flexiblePlan/:employeeId/:planId/status
GET    /flexiblePlan/:employeeId

# Reimbursements
POST   /reimbursement/:employeeId
PUT    /reimbursement/:employeeId/:claimId/status
GET    /reimbursement/:employeeId

# Tax Declarations
POST   /taxDeclaration/:employeeId
PUT    /taxDeclaration/:employeeId/:declarationId
GET    /taxDeclaration/:employeeId

# Investment Proofs
POST   /investmentProof/:employeeId
PUT    /investmentProof/:employeeId/:proofId/verify
GET    /investmentProof/:employeeId

# All Claims
GET    /allClaims/:employeeId
```

### FULL & FINAL SETTLEMENT
```http
POST   /fullAndFinal/initiate
PUT    /fullAndFinal/:settlementId/salaryDues
PUT    /fullAndFinal/:settlementId/leaveEncashment
PUT    /fullAndFinal/:settlementId/bonusIncentives
PUT    /fullAndFinal/:settlementId/deductions
PUT    /fullAndFinal/:settlementId/gratuity
POST   /fullAndFinal/:settlementId/calculate
POST   /fullAndFinal/:settlementId/approval
PUT    /fullAndFinal/:settlementId/payment
GET    /fullAndFinal/employee/:employeeId
GET    /fullAndFinal/:settlementId
GET    /fullAndFinal
```

### STAFF PORTAL
```http
POST   /staffPortal/settings           # Portal settings
GET    /staffPortal/settings
POST   /staffPortal/webTab             # Add web tab
PUT    /staffPortal/webTab/:tabId
DELETE /staffPortal/webTab/:tabId
GET    /staffPortal/webTabs
PUT    /staffPortal/preferences/:employeeId
GET    /staffPortal/preferences/:employeeId
```

### EMPLOYEE PORTAL (Self-Service)
```http
GET    /employee/myPayslips            # My payslips
GET    /employee/myPayslips/:payrollId # Payslip detail
GET    /employee/salarySummary         # Summary
GET    /employee/myClaimsSummary       # Claims
POST   /employee/submitClaim           # Submit claim
GET    /employee/myInvestments         # Tax proofs
POST   /employee/submitInvestmentProof # Upload proof
```

### AUDIT LOGS
```http
GET    /audit/logs?action=payroll_processed&page=1&limit=50
GET    /audit/log/:logId
GET    /audit/employee/:employeeId
```

---

## 🔄 Common Workflows

### Monthly Payroll Cycle
```bash
# 1. Calculate TDS for all
POST /tds/bulkCalculate

# 2. Process payroll
POST /processPayroll

# 3. Get summary
GET /reports/summary?month=Feb&year=2026

# 4. Approve all
PUT /updatePayrollStatus/:payrollId
Body: { "payStatus": "approved" }

# 5. Generate bank file
POST /bank/generateFile

# 6. Mark as paid
PUT /updatePayrollStatus/:payrollId
Body: { "payStatus": "paid" }
```

### Salary Revision Flow
```bash
# 1. Create revision
POST /revision/create

# 2. Approve
PUT /revision/:revisionId/approve
Body: { "status": "approved" }

# 3. Implement
POST /revision/:revisionId/implement

# 4. Arrears auto-created and paid in next payroll
```

### Year-End Tax Filing
```bash
# 1. Bulk TDS calculation
POST /tds/bulkCalculate

# 2. Generate Form 16 for all
POST /form16/bulk

# 3. Get TDS report
GET /reports/tds?financialYear=2025-2026
```

---

## 📝 Request Body Examples

### Create Salary Component
```json
{
  "category": "earnings",
  "component": {
    "name": "House Rent Allowance",
    "code": "HRA",
    "type": "earning",
    "calculationType": "percentage",
    "value": 40,
    "basedOn": "basic",
    "taxable": true,
    "considerForEPF": false,
    "status": "active"
  }
}
```

### Process Payroll
```json
{
  "month": "Feb",
  "year": 2026,
  "employeeIds": ["64f5...", "64f6..."] // Empty for all
}
```

### Calculate TDS
```json
{
  "financialYear": "2025-2026",
  "taxRegime": "new",
  "declaredDeductions": {
    "section80C": 150000,
    "section80D": 25000,
    "section80E": 0,
    "section80G": 0,
    "section24": 200000,
    "professionalTax": 2400
  },
  "hraDetails": {
    "rentPaid": 15000,
    "isMetroCity": true
  },
  "otherIncome": 50000
}
```

### Create Salary Revision
```json
{
  "employeeId": "64f5a1b2c3d4e5f6a7b8c9d0",
  "revisionType": "annual_hike",
  "effectiveFrom": "2026-04-01",
  "newSalary": {
    "ctc": 1500000,
    "grossSalary": 1200000,
    "basicSalary": 480000,
    "components": []
  },
  "arrearsApplicable": true,
  "arrearsFromDate": "2026-01-01",
  "remarks": "Annual appraisal 2026"
}
```

### Build Salary Structure
```json
{
  "ctc": 1200000,
  "basicPercentage": 40,
  "hraPercentage": 40,
  "customComponents": [
    {
      "name": "Special Allowance",
      "percentage": 10
    },
    {
      "name": "Transport Allowance",
      "amount": 1600
    }
  ]
}
```

---

## ⚠️ Important Notes

1. **Authentication**: All APIs require JWT token in Authorization header
2. **Organization Context**: `org_uuid` header is mandatory
3. **Financial Year Format**: "2025-2026" or "2025-26"
4. **Month Names**: Use 3-letter format: "Jan", "Feb", "Mar", etc.
5. **Dates**: ISO format: "2026-04-01"
6. **Pagination**: Default page=1, limit=10-50 depending on endpoint

---

## 🎯 Status Codes

- **200**: Success
- **201**: Created
- **400**: Bad Request (validation error)
- **401**: Unauthorized
- **404**: Not Found
- **500**: Server Error

---

## 💡 Pro Tips

1. **Always validate before processing**: Use `/bank/validate` before generating files
2. **Use bulk operations**: Save time with `/tds/bulkCalculate` and `/form16/bulk`
3. **Check audit logs**: Track all changes with `/audit/logs`
4. **Monitor reports**: Use `/reports/summary` for quick overview
5. **Test with single employee**: Pass `employeeIds` array to process specific employees first

---

**Version**: 2.0.0  
**Last Updated**: February 9, 2026
