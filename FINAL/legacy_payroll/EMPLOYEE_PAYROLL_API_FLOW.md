# 📊 Employee Payroll API - Complete Flow Guide

---

## **FLOW OVERVIEW**

```
ADMIN SETUP → PAYROLL PROCESSING → EMPLOYEE VIEWS
```

---

## **PHASE 1: ADMIN SETUP (One-time Configuration)**

### Step 1: Create Statutory Compliance Config
**Endpoint:** `POST /api/payroll/createOrUpdateCompliance`

**What it does:** Organization ke tax rules set karte ho (EPF, ESI, PT, etc.)

**Request Body:**
```json
{
  "org_uuid": "your-org-uuid",
  "epf": {
    "isEnabled": true,
    "employeeContributionRate": 12,
    "employerContributionRate": 12,
    "restrictedPfWage": 15000
  },
  "esi": {
    "isEnabled": true,
    "employeeContributionRate": 0.75,
    "employerContributionRate": 3.25,
    "wageLimit": 21000
  },
  "professionalTax": {
    "isEnabled": true,
    "states": [
      {
        "stateName": "Maharashtra",
        "isApplicable": true,
        "ptSlabs": [
          {
            "salaryRangeFrom": 0,
            "salaryRangeTo": 10000,
            "taxAmount": 0
          },
          {
            "salaryRangeFrom": 10001,
            "salaryRangeTo": 20000,
            "taxAmount": 150
          }
        ]
      }
    ]
  }
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Compliance config created/updated",
  "data": { /* config details */ }
}
```

---

### Step 2: Create Salary Components
**Endpoint:** `POST /api/payroll/createSalaryCompensation`

**What it does:** Organization ke salary structure components define karte ho (Basic, HRA, DA, etc.)

**Request Body:**
```json
{
  "org_uuid": "your-org-uuid",
  "category": "earnings",
  "components": [
    {
      "name": "Basic Salary",
      "calculationType": "fixed",
      "value": 0,
      "basedOn": "none",
      "status": "active",
      "taxable": true,
      "considerForEPF": true,
      "considerForESI": true
    },
    {
      "name": "House Rent Allowance",
      "calculationType": "percentage",
      "value": 50,
      "basedOn": "basic",
      "status": "active",
      "taxable": true,
      "considerForEPF": false,
      "considerForESI": false
    },
    {
      "name": "Dearness Allowance",
      "calculationType": "percentage",
      "value": 15,
      "basedOn": "basic",
      "status": "active",
      "taxable": true,
      "considerForEPF": true,
      "considerForESI": true
    }
  ]
}
```

**Also create Deductions component:**
```json
{
  "org_uuid": "your-org-uuid",
  "category": "deductions",
  "components": [
    {
      "name": "Professional Tax",
      "calculationType": "fixed",
      "value": 200,
      "status": "active"
    }
  ]
}
```

---

### Step 3: Set Payroll Schedule
**Endpoint:** `POST /api/payroll/createOrUpdateSchedule`

**What it does:** Payroll run schedule define karte ho (kaun se din process hoga)

**Request Body:**
```json
{
  "org_uuid": "your-org-uuid",
  "payFrequency": "monthly",
  "payDay": 28,
  "payslipGenerationDay": 26,
  "cutOffDay": 25,
  "description": "Monthly payroll on 28th"
}
```

---

## **PHASE 2: EMPLOYEE SETUP**

### Step 4: Add Payroll Info to Employee
**Endpoint:** `PUT /api/payroll/employee/:employeeId/payrollInfo`

**What it does:** Employee ka salary info store karte ho

**Request Body:**
```json
{
  "payrollInfo": {
    "employeeCode": "EMP001",
    "baseSalary": 50000,
    "department": "Engineering",
    "designation": "Senior Developer",
    "pan": "ABCDE1234F",
    "aadhaar": "1234 5678 9012"
  },
  "bankInfo": {
    "accountHolderName": "John Doe",
    "accountNumber": "123456789012",
    "bankName": "HDFC Bank",
    "ifscCode": "HDFC0000001"
  },
  "taxInfo": {
    "pan": "ABCDE1234F",
    "taxRegime": "new"
  }
}
```

---

### Step 5: Calculate Payroll Info (Optional Preview)
**Endpoint:** `POST /api/payroll/calculatePayrollInfo`

**What it does:** Preview karte ho ki 50000 basic se final salary kaise bne ga

**Request Body:**
```json
{
  "baseSalary": 50000,
  "state": "Maharashtra"
}
```

**Response (Exact calculation):**
```json
{
  "status": "success",
  "data": {
    "payrollInfo": {
      "baseSalary": 50000,
      "grossSalary": 72500,
      "totalDeductions": 8330,
      "netPay": 64170,
      "ctc": 900000
    },
    "breakdown": {
      "earnings": {
        "baseSalary": 50000,
        "components": [
          {
            "name": "House Rent Allowance",
            "calculatedAmount": 25000,
            "taxable": true
          },
          {
            "name": "Dearness Allowance",
            "calculatedAmount": 7500,
            "taxable": true
          }
        ],
        "grossSalary": 82500
      },
      "deductions": {
        "epf": { "employee": 6000, "employer": 6000 },
        "esi": { "employee": 337, "employer": 1450 },
        "professionalTax": 200
      }
    }
  }
}
```

---

## **PHASE 3: ADMIN - PAYROLL PROCESSING**

### Step 6: Process Payroll (Admin)
**Endpoint:** `POST /api/payroll/processPayroll`

**What it does:** Sab employees ka salary calculate karte ho aur payslips generate hote hain

**Request Body:**
```json
{
  "org_uuid": "your-org-uuid",
  "month": "Apr",
  "year": 2026,
  "employees": [
    {
      "employeeId": "emp1",
      "attendanceDays": 26,
      "overtimeDays": 2,
      "deductions": [
        {
          "name": "Professional Tax",
          "amount": 200
        }
      ]
    },
    {
      "employeeId": "emp2",
      "attendanceDays": 26,
      "overtimeDays": 0
    }
  ]
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Payroll processed successfully",
  "data": {
    "payrollRunId": "payroll_123",
    "month": "Apr",
    "year": 2026,
    "processedEmployees": 4,
    "totalGross": 290000,
    "totalDeductions": 33320,
    "totalNetPay": 256680
  }
}
```

---

### Step 7: Generate Payslip (Admin)
**Endpoint:** `GET /api/payroll/generatePayslip/:payrollId`

**What it does:** Payslip PDF banate ho

**Response:**
```json
{
  "status": "success",
  "data": {
    "payslipUrl": "https://s3.../payslip_123.pdf",
    "payslipNumber": "PS/2026/04/001"
  }
}
```

---

### Step 8: Update Payroll Status (Admin)
**Endpoint:** `PUT /api/payroll/updatePayrollStatus/:payrollId`

**What it does:** Payroll status update karte ho (pending → approved → paid)

**Request Body:**
```json
{
  "payStatus": "approved",
  "paymentDate": "2026-04-28",
  "notes": "Payroll approved by Finance Head"
}
```

---

## **PHASE 4: EMPLOYEE - VIEW PAYROLL DATA**

### ✅ Employee APIs (Ab employee dekhe ga)

---

### API 1️⃣: Get Dashboard
**Endpoint:** `GET /api/payroll/employee/dashboard`

**What it shows:**
- Current month: Net Pay, Gross, Deductions
- YTD: Total earnings, deductions
- Hours worked
- Last payslip date

**Response:**
```json
{
  "status": "success",
  "data": {
    "employee": {
      "name": "John Doe",
      "code": "EMP001",
      "department": "Engineering",
      "designation": "Senior Developer"
    },
    "currentPeriod": {
      "month": "Apr",
      "year": 2026,
      "netPay": 64170,
      "grossEarnings": 82500,
      "totalDeductions": 18330,
      "payStatus": "approved"
    },
    "yearToDate": {
      "totalGross": 330000,
      "totalDeductions": 73320,
      "totalNetPay": 256680,
      "monthsProcessed": 4,
      "totalCTC": 990000
    },
    "attendance": {
      "hoursWorked": 208,
      "attendancePercentage": 95.24,
      "daysWorked": 26
    },
    "lastPayslipDate": "2026-04-28"
  }
}
```

---

### API 2️⃣: View All Payslips
**Endpoint:** `GET /api/payroll/employee/myPayslips?year=2026&month=Apr&limit=12`

**What it shows:** Employee ke sare payslips ka list

**Response:**
```json
{
  "status": "success",
  "data": {
    "total": 4,
    "data": [
      {
        "_id": "payroll_123",
        "month": "Apr",
        "year": 2026,
        "grossEarnings": 82500,
        "totalDeductions": 18330,
        "netPay": 64170,
        "payStatus": "approved"
      },
      {
        "_id": "payroll_122",
        "month": "Mar",
        "year": 2026,
        "grossEarnings": 82500,
        "totalDeductions": 18330,
        "netPay": 64170,
        "payStatus": "paid"
      }
    ]
  }
}
```

---

### API 3️⃣: View Single Payslip Details
**Endpoint:** `GET /api/payroll/employee/myPayslips/:payrollId`

**What it shows:** Ek payslip ki detailed breakdown

**Response:**
```json
{
  "status": "success",
  "data": {
    "organization": {
      "name": "Tech Corp",
      "address": "Mumbai",
      "logo": "url"
    },
    "employee": {
      "name": "John Doe",
      "code": "EMP001",
      "email": "john@tech.com",
      "department": "Engineering",
      "designation": "Senior Developer"
    },
    "payPeriod": {
      "month": "Apr",
      "year": 2026
    },
    "earnings": [
      { "name": "Basic Salary", "amount": 50000 },
      { "name": "HRA", "amount": 25000 },
      { "name": "DA", "amount": 7500 }
    ],
    "deductions": [
      { "name": "EPF (Employee)", "amount": 6000 },
      { "name": "ESI (Employee)", "amount": 337 },
      { "name": "Professional Tax", "amount": 200 }
    ],
    "summary": {
      "grossEarnings": 82500,
      "totalDeductions": 18330,
      "netPay": 64170
    },
    "payStatus": "approved",
    "processedDate": "2026-04-28"
  }
}
```

---

### API 4️⃣: Get Salary Summary
**Endpoint:** `GET /api/payroll/employee/salarySummary`

**What it shows:** Current month + YTD summary

**Response:**
```json
{
  "status": "success",
  "data": {
    "currentMonth": {
      "month": "Apr",
      "year": 2026,
      "grossEarnings": 82500,
      "totalDeductions": 18330,
      "netPay": 64170,
      "payStatus": "approved"
    },
    "yearToDate": {
      "year": 2026,
      "totalGross": 330000,
      "totalDeductions": 73320,
      "totalNetPay": 256680,
      "monthsProcessed": 4
    }
  }
}
```

---

### API 5️⃣: Get Annual Salary Statement
**Endpoint:** `GET /api/payroll/employee/annualSalaryStatement?year=2026`

**What it shows:** Pura saal ka month-wise breakdown

**Response:**
```json
{
  "status": "success",
  "data": {
    "organization": { "name": "Tech Corp" },
    "employee": {
      "name": "John Doe",
      "code": "EMP001",
      "department": "Engineering"
    },
    "year": 2026,
    "monthlyBreakdown": [
      {
        "month": "Jan",
        "year": 2026,
        "basicSalary": 50000,
        "grossEarnings": 82500,
        "totalDeductions": 18330,
        "netPay": 64170,
        "payStatus": "paid"
      },
      {
        "month": "Feb",
        "year": 2026,
        "basicSalary": 50000,
        "grossEarnings": 82500,
        "totalDeductions": 18330,
        "netPay": 64170,
        "payStatus": "paid"
      },
      {
        "month": "Mar",
        "year": 2026,
        "basicSalary": 50000,
        "grossEarnings": 82500,
        "totalDeductions": 18330,
        "netPay": 64170,
        "payStatus": "paid"
      },
      {
        "month": "Apr",
        "year": 2026,
        "basicSalary": 50000,
        "grossEarnings": 82500,
        "totalDeductions": 18330,
        "netPay": 64170,
        "payStatus": "approved"
      }
    ],
    "annualSummary": {
      "totalGross": 330000,
      "totalDeductions": 73320,
      "totalNetPay": 256680,
      "monthsProcessed": 4,
      "averageMonthlyGross": 82500,
      "averageMonthlyNetPay": 64170
    }
  }
}
```

---

### API 6️⃣: Get Dashboard Overview
**Endpoint:** `GET /api/payroll/employee/dashboard`

**Already covered in API 1️⃣**

---

### API 7️⃣: Get CTC Claims & Balance
**Endpoint:** `GET /api/payroll/employee/myCTCClaims`

**What it shows:** CTC breakdown aur kitna use ho gya aur kitna bacha

**Response:**
```json
{
  "status": "success",
  "data": {
    "ctcBreakdown": {
      "monthlyCTC": 82500,
      "annualCTC": 990000,
      "ctcUtilized": 330000,
      "ctcBalance": 660000
    },
    "claims": {
      "ltaReimburse": 50000,
      "otherReimburse": 15000,
      "flexBenefits": 25000,
      "fullReimburse": 10000,
      "newspaperPeriodical": 5000,
      "totalClaimed": 105000
    },
    "balanceAvailable": 555000
  }
}
```

---

### API 8️⃣: Get Form 16
**Endpoint:** `GET /api/payroll/employee/form16?financialYear=2025-26`

**What it shows:** Income Tax Form 16 for filing returns

**Response:**
```json
{
  "status": "success",
  "data": {
    "partA": {
      "employeeName": "JOHN DOE",
      "pan": "ABCDE1234F",
      "employeeCode": "EMP001",
      "designation": "Senior Developer",
      "period": "2025-26"
    },
    "partB": {
      "grossSalary": 990000,
      "basic": 600000,
      "hra": 300000,
      "allowances": 90000,
      "lessAllowances": {
        "standardDeduction": 50000,
        "professionalTax": 2400,
        "hraExemption": 0
      },
      "incomeChargeableUnderSalaryHead": 937600
    },
    "partC": {
      "section80C": 150000,
      "section80D": 25000,
      "section80E": 0,
      "section80G": 0,
      "section24": 0,
      "totalDeductions": 175000
    },
    "taxCalculation": {
      "taxableIncome": 762600,
      "totalTaxDeducted": 120000,
      "cessOnIncome": 0,
      "totalTaxAndCess": 120000
    },
    "organization": {
      "name": "Tech Corp"
    },
    "generatedDate": "2026-04-27T10:30:00Z"
  }
}
```

---

### API 9️⃣: Get Taxation Report
**Endpoint:** `GET /api/payroll/employee/taxationReport?financialYear=2025-26`

**What it shows:** Tax summary aur refund/payable

**Response:**
```json
{
  "status": "success",
  "data": {
    "employee": {
      "name": "John Doe",
      "pan": "ABCDE1234F",
      "email": "john@tech.com"
    },
    "financialYear": "2025-26",
    "incomeDetails": {
      "grossIncome": 990000,
      "allowances": 90000,
      "standardDeduction": 50000,
      "otherIncome": 0
    },
    "deductionsUnderChapter6A": {
      "section80C": 150000,
      "section80D": 25000,
      "section80E": 0,
      "section80G": 0,
      "section24": 0,
      "total": 175000
    },
    "taxCalculation": {
      "taxableIncome": 762600,
      "estimatedTax": 130000,
      "totalTDSDeducted": 120000,
      "cess": 0,
      "totalTaxAndCess": 120000
    },
    "refundOrPayable": {
      "type": "Tax Due",
      "amount": 10000
    }
  }
}
```

---

### API 🔟: Get My Claims Summary
**Endpoint:** `GET /api/payroll/employee/myClaimsSummary`

**What it shows:** Reimbursement claims ka summary

**Response:**
```json
{
  "status": "success",
  "data": {
    "reimbursements": [
      {
        "_id": "claim_1",
        "claimNo": "CLM0001",
        "name": "Medical Expense",
        "type": "medical",
        "claimDate": "2026-04-15",
        "claimedAmount": 5000,
        "approvedAmount": 4500,
        "status": "approved",
        "submittedOn": "2026-04-16"
      },
      {
        "_id": "claim_2",
        "claimNo": "CLM0002",
        "name": "Travel Expense",
        "type": "travel",
        "claimedAmount": 3000,
        "approvedAmount": 0,
        "status": "pending",
        "submittedOn": "2026-04-20"
      }
    ],
    "stats": {
      "total": 2,
      "approved": 1,
      "pending": 1,
      "rejected": 0,
      "totalClaimed": 8000,
      "totalApproved": 4500
    }
  }
}
```

---

### API 1️⃣1️⃣: Get Detailed Claims List
**Endpoint:** `GET /api/payroll/employee/detailedClaims?status=approved&limit=10&skip=0`

**What it shows:** Sab claims ka paginated list

**Response:**
```json
{
  "status": "success",
  "data": {
    "claims": [
      {
        "_id": "claim_1",
        "claimNo": "CLM0001",
        "name": "Medical Expense",
        "type": "medical",
        "claimDate": "2026-04-15",
        "claimedAmount": 5000,
        "approvedAmount": 4500,
        "status": "approved",
        "submittedOn": "2026-04-16",
        "description": "Hospital bills",
        "proofUrl": "https://..."
      }
    ],
    "pagination": {
      "total": 1,
      "limit": 10,
      "skip": 0,
      "pages": 1
    },
    "stats": {
      "approved": 1,
      "pending": 0,
      "rejected": 0,
      "totalAmount": 5000,
      "totalApproved": 4500
    }
  }
}
```

---

### API 1️⃣2️⃣: Submit New Claim
**Endpoint:** `POST /api/payroll/employee/submitClaim`

**What it does:** Employee naya claim submit karta hai

**Request Body:**
```json
{
  "name": "Medical Expense",
  "type": "medical",
  "claimDate": "2026-04-15",
  "claimedAmount": 5000,
  "proofUrl": "https://s3.../medical_bill.pdf",
  "description": "Hospital bills for family"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Claim submitted successfully",
  "data": {
    "claimNo": "CLM0001",
    "status": "pending"
  }
}
```

---

### API 1️⃣3️⃣: Get Investment Declarations
**Endpoint:** `GET /api/payroll/employee/myInvestments?financialYear=2025-26`

**What it shows:** Investment proofs submitted

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "_id": "inv_1",
      "section": "80C",
      "description": "Life Insurance Premium",
      "amount": 50000,
      "proofUrl": "https://s3.../policy.pdf",
      "financialYear": "2025-26",
      "status": "verified",
      "uploadedOn": "2026-03-15"
    },
    {
      "_id": "inv_2",
      "section": "80D",
      "description": "Health Insurance",
      "amount": 25000,
      "proofUrl": "https://s3.../health_policy.pdf",
      "financialYear": "2025-26",
      "status": "pending",
      "uploadedOn": "2026-04-10"
    }
  ]
}
```

---

### API 1️⃣4️⃣: Submit Investment Proof
**Endpoint:** `POST /api/payroll/employee/submitInvestmentProof`

**What it does:** Employee investment proof upload karta hai

**Request Body:**
```json
{
  "section": "80C",
  "description": "Life Insurance Premium - LIC",
  "amount": 50000,
  "proofUrl": "https://s3.../policy_proof.pdf",
  "financialYear": "2025-26"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Investment proof submitted successfully"
}
```

---

## **COMPLETE FLOW SEQUENCE FOR 4 EMPLOYEES**

### **Week 1: Admin Setup (One-time)**
```
1. POST /api/payroll/createOrUpdateCompliance
2. POST /api/payroll/createSalaryCompensation (earnings)
3. POST /api/payroll/createSalaryCompensation (deductions)
4. POST /api/payroll/createOrUpdateSchedule
```

### **Week 2: Add Employees**
```
For each of 4 employees:
  1. PUT /api/payroll/employee/:employeeId/payrollInfo
  2. (Optional) POST /api/payroll/calculatePayrollInfo (preview)
```

### **Month End: Payroll Processing (Admin)**
```
1. POST /api/payroll/processPayroll
   - 4 employees ka salary calculate ho jaega
   - Payslips auto generate
   
2. GET /api/payroll/getPayrollHistory
   - All payslips check karte ho
   
3. GET /api/payroll/getPayroll/:payrollId
   - Individual payroll check karte ho
   
4. GET /api/payroll/generatePayslip/:payrollId
   - PDF payslip banate ho
   
5. PUT /api/payroll/updatePayrollStatus/:payrollId
   - Status: pending → approved → paid
```

### **After Payroll is Processed: Employee Visibility**
```
Employee 1:
  1. GET /api/payroll/employee/dashboard
     → Sees Apr salary: Net 64170, Gross 82500
     
  2. GET /api/payroll/employee/myPayslips
     → Sees all 4 months payslips
     
  3. GET /api/payroll/employee/myPayslips/:payrollId
     → Sees detailed breakdown
     
  4. GET /api/payroll/employee/salarySummary
     → Sees YTD summary
     
  5. GET /api/payroll/employee/annualSalaryStatement?year=2026
     → Sees all 4 months statement
     
  6. GET /api/payroll/employee/myCTCClaims
     → Sees CTC utilization
     
  7. GET /api/payroll/employee/form16?financialYear=2025-26
     → Tax return filing ke liye
     
  8. GET /api/payroll/employee/taxationReport?financialYear=2025-26
     → Tax details dekhe
     
  9. GET /api/payroll/employee/myClaimsSummary
     → Reimbursement claims check
     
  10. POST /api/payroll/employee/submitClaim
      → Medical/travel claim submit kare
      
  11. GET /api/payroll/employee/detailedClaims?status=approved
      → Approved claims dekhe
      
  12. GET /api/payroll/employee/myInvestments?financialYear=2025-26
      → Investment proofs check kare
      
  13. POST /api/payroll/employee/submitInvestmentProof
      → Investment proof upload kare

Same for Employee 2, 3, 4
```

---

## **TESTING ORDER (Step-by-step)**

### **Test 1: Admin Setup**
```bash
# 1. Create compliance
POST http://localhost:3000/api/payroll/createOrUpdateCompliance
Headers: { org_uuid: "your-org", Authorization: "Bearer admin-token" }

# 2. Create components
POST http://localhost:3000/api/payroll/createSalaryCompensation
Headers: { org_uuid: "your-org", Authorization: "Bearer admin-token" }

# 3. Set schedule
POST http://localhost:3000/api/payroll/createOrUpdateSchedule
Headers: { org_uuid: "your-org", Authorization: "Bearer admin-token" }
```

### **Test 2: Add Employees Payroll Info**
```bash
# For each employee
PUT http://localhost:3000/api/payroll/employee/emp1/payrollInfo
Headers: { org_uuid: "your-org", Authorization: "Bearer admin-token" }
```

### **Test 3: Calculate Payroll**
```bash
POST http://localhost:3000/api/payroll/calculatePayrollInfo
Headers: { org_uuid: "your-org" }
Body: { baseSalary: 50000, state: "Maharashtra" }
```

### **Test 4: Process Payroll**
```bash
POST http://localhost:3000/api/payroll/processPayroll
Headers: { org_uuid: "your-org", Authorization: "Bearer admin-token" }
```

### **Test 5: Generate Payslips**
```bash
GET http://localhost:3000/api/payroll/generatePayslip/payroll_id
Headers: { org_uuid: "your-org", Authorization: "Bearer admin-token" }
```

### **Test 6: Update Status**
```bash
PUT http://localhost:3000/api/payroll/updatePayrollStatus/payroll_id
Headers: { org_uuid: "your-org", Authorization: "Bearer admin-token" }
Body: { payStatus: "approved", paymentDate: "2026-04-28" }
```

### **Test 7: Employee Views Dashboard**
```bash
GET http://localhost:3000/api/payroll/employee/dashboard
Headers: { org_uuid: "your-org", Authorization: "Bearer employee-token" }
```

### **Test 8: Employee Views Payslips**
```bash
GET http://localhost:3000/api/payroll/employee/myPayslips
Headers: { org_uuid: "your-org", Authorization: "Bearer employee-token" }
```

### **Test 9: Employee Views Form 16**
```bash
GET http://localhost:3000/api/payroll/employee/form16?financialYear=2025-26
Headers: { org_uuid: "your-org", Authorization: "Bearer employee-token" }
```

### **Test 10: Employee Submits Claim**
```bash
POST http://localhost:3000/api/payroll/employee/submitClaim
Headers: { org_uuid: "your-org", Authorization: "Bearer employee-token" }
Body: {
  "name": "Medical",
  "type": "medical",
  "claimedAmount": 5000,
  "proofUrl": "...",
  "description": "..."
}
```

---

## **POSTMAN COLLECTION URLs**

All endpoints ka base URL:
```
http://localhost:3000/api/payroll
```

Required Headers (hamesha):
```
{
  "Authorization": "Bearer YOUR_JWT_TOKEN",
  "org_uuid": "YOUR_ORG_UUID",
  "Content-Type": "application/json"
}
```

---

## **4 EMPLOYEES KI EXAMPLE DATA**

```
Employee 1: emp001 (John Doe)
  - Basic: 50000
  - Status: Approved payroll
  
Employee 2: emp002 (Jane Smith)
  - Basic: 55000
  - Status: Approved payroll
  
Employee 3: emp003 (Mike Johnson)
  - Basic: 60000
  - Status: Pending payroll
  
Employee 4: emp004 (Sarah Williams)
  - Basic: 45000
  - Status: Pending payroll
```

---

**Ab step-by-step test karte ho aur pehle se pehle payslips approve karte ho! 🚀**
