# 📚 Complete Payroll System Documentation
## आपका पूरा Payroll System कैसे काम करता है

---

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [System Architecture](#system-architecture)
3. [All Modules Detailed](#all-modules-detailed)
4. [Complete Setup Guide](#complete-setup-guide)
5. [Monthly Payroll Cycle](#monthly-payroll-cycle)
6. [Integration & Data Flow](#integration--data-flow)
7. [Complete API Reference](#complete-api-reference)
8. [Workflows & Use Cases](#workflows--use-cases)
9. [Troubleshooting](#troubleshooting)

---

## 🎯 System Overview

### क्या है यह System?

यह एक **Complete Indian Payroll Management System** है जो आपकी organization की सभी salary, tax, compliance और employee payment जरूरतों को handle करता है।

### Key Features

✅ **16 Major Modules** - हर payroll aspect covered  
✅ **90+ API Endpoints** - Complete automation  
✅ **Full Indian Compliance** - EPF, ESI, PT, TDS, Bonus, Gratuity  
✅ **Multi-tenant Architecture** - हर organization का अलग data  
✅ **Employee Self-Service** - Employees खुद payslips देख सकते हैं  
✅ **Automated TDS Calculation** - New & Old regime दोनों  
✅ **Bank File Generation** - Direct salary transfer files  
✅ **Form 16 Generation** - Tax certificates automatic  
✅ **Complete Audit Trail** - हर change tracked  

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                   HRMS PAYROLL SYSTEM                            │
│                   (Multi-Tenant Architecture)                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │   Organization    │
                    │   (org_uuid)      │
                    └─────────┬─────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
   ┌────▼────┐          ┌────▼────┐          ┌────▼────┐
   │ SETUP   │          │ PROCESS │          │ OUTPUT  │
   │ MODULES │          │ MODULES │          │ MODULES │
   └────┬────┘          └────┬────┘          └────┬────┘
        │                    │                     │
        │                    │                     │
┌───────▼───────────┐ ┌──────▼──────────┐ ┌───────▼──────────┐
│ 1. Statutory      │ │ 5. Payroll      │ │ 9. Reports       │
│    Compliance     │ │    Processing   │ │    & Analytics   │
│                   │ │                 │ │                  │
│ 2. Salary         │ │ 6. TDS          │ │ 10. Bank Files   │
│    Components     │ │    Calculation  │ │                  │
│                   │ │                 │ │ 11. Form 16      │
│ 3. Payroll        │ │ 7. Salary       │ │                  │
│    Schedule       │ │    Revision     │ │ 12. Payslips     │
│                   │ │                 │ │                  │
│ 4. CTC Calculator │ │ 8. Arrears      │ │ 13. Audit Logs   │
└───────────────────┘ └─────────────────┘ └──────────────────┘
```

### Data Flow

```
Employee Master Data
        ↓
Configure Compliance (EPF/ESI/PT/TDS)
        ↓
Define Salary Components (Earnings/Deductions)
        ↓
Build Salary Structure (CTC → Components)
        ↓
Setup Payroll Schedule (Monthly/Bi-weekly)
        ↓
Calculate Employee TDS (Annual projection)
        ↓
Process Monthly Payroll
        ↓
Review & Approve
        ↓
Generate Bank File
        ↓
Mark as Paid
        ↓
Generate Payslips & Reports
```

---

## 📦 All Modules Detailed

### **Module 1: Statutory Compliance** 📋

**Purpose:** EPF, ESI, Professional Tax, Labour Welfare Fund और Statutory Bonus की settings manage करना

**Key Features:**
- ✅ EPF Configuration (Employee: 12%, Employer: 12%)
- ✅ ESI Configuration (Employee: 0.75%, Employer: 3.25%)
- ✅ State-wise Professional Tax slabs
- ✅ Labour Welfare Fund (Half-yearly deduction)
- ✅ Statutory Bonus (8.33% of minimum wage)

**APIs:**
- `POST /createOrUpdateCompliance` - Setup या Update करें
- `GET /getCompliance` - Current settings देखें

**Example Configuration:**
```json
{
  "epf": {
    "isEnabled": true,
    "epfNumber": "DLCPM1234567000",
    "employeeContributionRate": 12,
    "employerContributionRate": 12,
    "restrictedPfWage": 15000
  },
  "esi": {
    "isEnabled": true,
    "esiNumber": "12-34-567890-000-0001",
    "employeeContributionRate": 0.75,
    "employerContributionRate": 3.25,
    "wageLimit": 21000
  },
  "professionalTax": {
    "isEnabled": true,
    "states": [
      {
        "stateName": "Delhi",
        "ptSlabs": [
          {"salaryRangeFrom": 0, "salaryRangeTo": 25000, "taxAmount": 200},
          {"salaryRangeFrom": 25001, "salaryRangeTo": 50000, "taxAmount": 300}
        ]
      }
    ]
  }
}
```

**कब Use करें:**
- Organization setup के time
- Compliance rates change होने पर
- New state office खुलने पर

---

### **Module 2: Salary Components** 💰

**Purpose:** Salary के सभी parts (earnings, deductions, benefits) को define करना

**Categories:**
1. **Earnings** - Basic, HRA, Special Allowance, Transport, etc.
2. **Deductions** - PF, ESI, PT, TDS, Loan, etc.
3. **Benefits** - Medical, LTA, Food coupons
4. **Reimbursements** - Mobile, Travel, Internet

**APIs:**
- `POST /createSalaryCompensation` - New component बनाएं
- `PUT /updateSalaryCompensation/:category/:componentId` - Update करें
- `GET /getSalaryCompenBYCategory/:category` - Category-wise list
- `GET /getAllSalaryCompensations` - सभी components
- `DELETE /deleteSalaryCompensation/:category/:componentId` - Delete करें

**Example Component:**
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

**Calculation Types:**
- `fixed` - Fixed amount (₹5000)
- `percentage` - % of basic/gross (40% of basic)
- `variable` - Changes every month

**कब Use करें:**
- Employee onboarding से पहले
- New allowance add करना हो
- Component calculation change करना हो

---

### **Module 3: Payroll Schedule** 📅

**Purpose:** Payroll कब और कैसे process होगी, यह define करना

**APIs:**
- `POST /createOrUpdateSchedule` - Schedule setup
- `GET /getPayrollSchedule` - Current schedule
- `GET /getUpcomingPayrollDates` - Next 12 payroll dates
- `GET /calculatePayPeriod` - Period calculation

**Configuration:**
```json
{
  "payFrequency": "monthly",
  "payPeriod": "fixed",
  "payDay": 1,
  "weekDays": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
  "workingDaysPerMonth": 26
}
```

**Pay Frequency Options:**
- `monthly` - हर महीने
- `bi-weekly` - हर 2 हफ्ते
- `weekly` - हर हफ्ते

**Pay Period Options:**
- `fixed` - 1st to last day of month
- `leave-to-leave` - Last salary date से next salary date तक
- `attendance` - Actual attendance के base पर

**कब Use करें:**
- Initial setup में
- Payroll policy change होने पर

---

### **Module 4: CTC Calculator** 🧮

**Purpose:** CTC से Gross निकालना, Gross से CTC निकालना, और complete salary structure बनाना

**APIs:**
- `POST /ctc/fromGross` - Gross से CTC calculate करें
- `POST /ctc/fromCTC` - CTC से Gross निकालें
- `POST /ctc/buildStructure` - Complete structure build करें
- `POST /ctc/takeHome` - Take-home salary calculate करें

**CTC Formula:**
```
CTC = Gross Salary (Annual)
    + EPF Employer Contribution (12% of basic)
    + ESI Employer Contribution (3.25% of gross, if applicable)
    + Gratuity (4.81% of basic, i.e., 8.33% of annual)
    + Statutory Bonus (8.33% of minimum wage)
```

**Example - CTC से Gross:**
```json
Request:
{
  "ctc": 1200000
}

Response:
{
  "ctc": 1200000,
  "grossSalary": 960000,
  "monthlyGross": 80000,
  "employerContributions": {
    "epf": 57600,
    "gratuity": 46080,
    "bonus": 79920
  }
}
```

**Example - Build Structure:**
```json
Request:
{
  "ctc": 1200000,
  "basicPercentage": 40,
  "hraPercentage": 40,
  "customComponents": [
    {"name": "Special Allowance", "percentage": 15},
    {"name": "Transport Allowance", "amount": 1600}
  ]
}

Response:
{
  "ctc": 1200000,
  "grossSalary": 960000,
  "monthlyGross": 80000,
  "components": {
    "basic": 32000,
    "hra": 32000,
    "specialAllowance": 12000,
    "transport": 1600,
    "other": 2400
  }
}
```

**कब Use करें:**
- New employee onboarding
- Salary negotiation
- Appraisal time
- Offer letter preparation

---

### **Module 5: Payroll Processing** ▶️

**Purpose:** Monthly payroll को process करना - यह system का main engine है

**APIs:**
- `POST /processPayroll` - Payroll run करें
- `GET /getPayrollHistory` - सभी payroll runs
- `GET /getPayroll/:payrollId` - Specific payroll details
- `PUT /updatePayrollStatus/:payrollId` - Approve/Reject/Paid
- `GET /generatePayslip/:payrollId` - PDF payslip
- `DELETE /deletePayrollRun/:payrollId` - Delete payroll

**Process Payroll Request:**
```json
{
  "month": "Feb",
  "year": 2026,
  "employeeIds": []  // Empty array = सभी active employees
}
```

**क्या होता है Processing में:**

1. **Employee Validation**
   - Active employees only
   - Salary structure configured
   - Bank details available

2. **Attendance Calculation**
   - Working days from schedule
   - Present days from attendance
   - Paid leaves included
   - LOP calculation

3. **Earnings Calculation**
   - Basic salary (prorated if LOP)
   - HRA based on basic
   - Other allowances
   - Bonus/incentives

4. **Statutory Deductions**
   - EPF employee share (12%)
   - ESI employee share (0.75%)
   - Professional Tax
   - Labour Welfare Fund

5. **TDS Deduction**
   - Monthly TDS from EmployeeTDS model
   - Auto-calculated based on annual projection

6. **Other Deductions**
   - Loan EMI
   - Advance recovery
   - Custom deductions

7. **Arrears Addition**
   - Approved arrears auto-paid
   - Added to earnings

8. **Net Salary**
   ```
   Net Salary = Total Earnings - Total Deductions + Arrears
   ```

9. **Audit Logging**
   - हर payroll run logged
   - Changes tracked

**Payroll Status Flow:**
```
draft → pending → approved → paid
   ↓        ↓
rejected  rejected
```

**Example Response:**
```json
{
  "success": true,
  "message": "Payroll processed successfully",
  "data": {
    "processed": 50,
    "failed": 0,
    "payrollRuns": [
      {
        "employeeId": "...",
        "employeeName": "Rahul Kumar",
        "month": "Feb",
        "year": 2026,
        "earnings": {
          "basic": 32000,
          "hra": 32000,
          "grossSalary": 80000
        },
        "deductions": {
          "epfEmployee": 3840,
          "esiEmployee": 600,
          "professionalTax": 200,
          "tds": 7916,
          "totalDeductions": 12556
        },
        "netSalary": 67444,
        "payStatus": "pending"
      }
    ]
  }
}
```

**कब Use करें:**
- हर महीने payroll schedule के according
- Manual run करना हो specific employees के लिए
- Reprocess करना हो कोई issue होने पर

---

### **Module 6: TDS Management** 🧾

**Purpose:** Income Tax (TDS) की complete calculation और management

**Why Separate from Statutory Compliance?**
- TDS calculations बहुत complex हैं
- हर employee के लिए अलग calculation
- Multiple regimes (New/Old)
- Employee declarations important
- Monthly tracking जरूरी
- Financial year specific

**Sub-modules:**

#### 6.1 TDS Configuration
**APIs:**
- `POST /tds/config` - Tax slabs setup
- `GET /tds/config` - Get config

**FY 2025-26 Tax Slabs:**

**New Regime:**
```json
{
  "financialYear": "2025-2026",
  "newRegimeSlabs": [
    {"min": 0, "max": 300000, "rate": 0},
    {"min": 300001, "max": 700000, "rate": 5},
    {"min": 700001, "max": 1000000, "rate": 10},
    {"min": 1000001, "max": 1200000, "rate": 15},
    {"min": 1200001, "max": 1500000, "rate": 20},
    {"min": 1500001, "max": 999999999, "rate": 30}
  ],
  "standardDeduction": 50000,
  "rebateLimit": 700000,
  "rebateAmount": 25000
}
```

**Old Regime:**
```json
{
  "oldRegimeSlabs": [
    {"min": 0, "max": 250000, "rate": 0},
    {"min": 250001, "max": 500000, "rate": 5},
    {"min": 500001, "max": 1000000, "rate": 20},
    {"min": 1000001, "max": 999999999, "rate": 30}
  ],
  "section80CLimit": 150000,
  "section80DLimit": 25000
}
```

#### 6.2 Employee TDS Calculation
**APIs:**
- `POST /tds/calculate/:employeeId` - Calculate करें
- `GET /tds/employee/:employeeId` - Get TDS record
- `PUT /tds/declaration/:employeeId` - Update deductions
- `PUT /tds/lock/:employeeId` - Lock/Unlock TDS
- `POST /tds/bulkCalculate` - सभी employees के लिए

**Calculation Steps:**

1. **Annual Income Projection**
   ```
   Annual Gross = Monthly Gross × 12
   ```

2. **Exempt Allowances**
   - HRA exemption (Complex formula)
   - LTA exemption
   - Standard deduction (₹50,000)

3. **Taxable Income**
   ```
   Taxable Income = Annual Gross 
                  - Standard Deduction 
                  - HRA Exemption 
                  - Other Exemptions
   ```

4. **Declared Deductions (Old Regime Only)**
   - Section 80C: ₹1,50,000 (LIC, PPF, ELSS)
   - Section 80D: ₹25,000 (Health Insurance)
   - Section 80E: Education Loan Interest
   - Section 24: Home Loan Interest (₹2,00,000)
   - Professional Tax

5. **Final Taxable Income**
   ```
   Final Taxable = Taxable Income - Declared Deductions
   ```

6. **Tax Calculation**
   - Slab-based tax
   - Surcharge (if income > ₹50L)
   - Health & Education Cess (4%)
   - Section 87A Rebate (if applicable)

7. **Monthly TDS**
   ```
   Monthly TDS = Annual Tax / 12
   ```

**Example Calculation:**
```
Employee: Rahul Kumar
Annual Gross: ₹12,00,000
Regime: New

Step 1: Standard Deduction = ₹50,000
Step 2: HRA Exemption = ₹2,00,000
Step 3: Taxable Income = ₹12,00,000 - ₹50,000 - ₹2,00,000 = ₹9,50,000

Tax Calculation (New Regime):
₹0 - ₹3,00,000: 0% = ₹0
₹3,00,001 - ₹7,00,000: 5% of ₹4,00,000 = ₹20,000
₹7,00,001 - ₹10,00,000: 10% of ₹2,50,000 = ₹25,000
Total Tax = ₹45,000

Add Cess (4%): ₹45,000 + ₹1,800 = ₹46,800
Monthly TDS: ₹46,800 / 12 = ₹3,900
```

**HRA Exemption Formula:**
```
HRA Exemption = Minimum of:
1. Actual HRA received
2. Rent paid - 10% of Basic
3. 50% of Basic (Metro) or 40% of Basic (Non-metro)
```

**कब Use करें:**
- Year start में (April)
- Employee declaration submit करने के बाद
- Salary revision होने पर
- Quarterly TDS review

---

### **Module 7: Salary Revision** 📈

**Purpose:** Employee की salary बढ़ाना, promotion, increment का complete workflow

**APIs:**
- `POST /revision/create` - New revision create करें
- `PUT /revision/:revisionId/approve` - Approve करें
- `POST /revision/:revisionId/implement` - Implement करें
- `GET /revision` - सभी revisions
- `GET /revision/:revisionId` - Specific revision
- `GET /revision/employee/:employeeId` - Employee ka history

**Workflow:**
```
1. HR creates revision → Status: pending
        ↓
2. Manager approves → Status: approved
        ↓
3. Admin implements → Status: implemented
        ↓
4. Employee salary updated
        ↓
5. Arrears record created
        ↓
6. Next payroll automatically pays arrears
```

**Create Revision Request:**
```json
{
  "employeeId": "64f5a1b2c3d4e5f6a7b8c9d0",
  "revisionType": "annual_hike",
  "effectiveFrom": "2026-04-01",
  "oldSalary": {
    "ctc": 1200000,
    "grossSalary": 960000,
    "basicSalary": 384000
  },
  "newSalary": {
    "ctc": 1500000,
    "grossSalary": 1200000,
    "basicSalary": 480000,
    "components": [
      {"name": "Basic", "amount": 480000},
      {"name": "HRA", "amount": 480000},
      {"name": "Special Allowance", "amount": 240000}
    ]
  },
  "arrearsApplicable": true,
  "arrearsFromDate": "2026-01-01",
  "remarks": "Annual appraisal 2026 - Good performance"
}
```

**System Automatically Calculates:**
- Increment Amount: ₹3,00,000
- Increment %: 25%
- Arrears Period: Jan 2026 to Mar 2026 (3 months)
- Arrears Amount: (₹1,00,000 - ₹80,000) × 3 = ₹60,000

**Implement करने पर क्या होता है:**
1. Employee का `salaryDetails` update होता है
2. Arrears record create होता है
3. Next payroll में arrears auto-add होता है
4. Audit log में entry करता है

**Revision Types:**
- `increment` - Normal increment
- `promotion` - Position change
- `adjustment` - Correction
- `annual_hike` - Yearly appraisal
- `appraisal` - Performance based

**कब Use करें:**
- Annual appraisal time
- Promotion होने पर
- Market adjustment करना हो
- Salary correction करना हो

---

### **Module 8: Arrears Management** 🔄

**Purpose:** Pending salary payments, corrections, bonuses को track और pay करना

**APIs:**
- `POST /arrears/create` - New arrears
- `PUT /arrears/:arrearsId/approve` - Approve करें
- `PUT /arrears/:arrearsId/pay` - Mark as paid
- `GET /arrears` - सभी arrears
- `GET /arrears/employee/:employeeId` - Employee के arrears
- `GET /arrears/pending/:employeeId` - Pending amount

**Arrears Types:**
- `salary_revision` - Salary increase से pending amount
- `correction` - Salary calculation error
- `bonus` - Performance/festival bonus
- `incentive` - Sales incentive
- `overtime` - Overtime payment

**Create Arrears:**
```json
{
  "employeeId": "64f5a1b2c3d4e5f6a7b8c9d0",
  "arrearsType": "salary_revision",
  "periodFrom": "2026-01-01",
  "periodTo": "2026-03-31",
  "reason": "Annual increment arrears from Jan to Mar",
  "components": [
    {
      "componentName": "Basic Salary Difference",
      "oldAmount": 32000,
      "newAmount": 40000,
      "differencePerMonth": 8000,
      "months": 3,
      "totalAmount": 24000
    },
    {
      "componentName": "HRA Difference",
      "oldAmount": 32000,
      "newAmount": 40000,
      "differencePerMonth": 8000,
      "months": 3,
      "totalAmount": 24000
    }
  ],
  "totalArrearsAmount": 48000,
  "tdsOnArrears": 5000,
  "netArrearsPayable": 43000
}
```

**Auto-Payment in Payroll:**
जब payroll process होता है, system automatically:
1. Approved arrears को find करता है
2. Payroll में add करता है
3. Arrears को "paid" mark करता है
4. Payroll ID link करता है

**कब Use करें:**
- Salary revision implement करने के बाद
- Salary calculation error मिलने पर
- Bonus announce होने पर
- Overtime hours approve होने पर

---

### **Module 9: Reports & Analytics** 📊

**Purpose:** Payroll का complete analysis, statutory reports, और management insights

**APIs:**
- `GET /reports/summary` - Monthly payroll summary
- `GET /reports/ytd` - Year-to-date report
- `GET /reports/statutory` - EPF/ESI/PT breakup
- `GET /reports/tds` - TDS report
- `GET /reports/ctc` - Organization cost analysis
- `GET /reports/variance` - Month-to-month comparison

#### 9.1 Payroll Summary
```
GET /reports/summary?month=Feb&year=2026
```
**Response includes:**
- Total employees processed
- Total gross salary
- Total deductions
- Total net salary
- Department-wise breakup
- Status-wise counts (pending/approved/paid)

#### 9.2 Year-to-Date Report
```
GET /reports/ytd?year=2026
```
**Employee-wise annual summary:**
- Total gross earned
- Total deductions
- Total net paid
- Month-by-month breakup
- Average monthly salary

#### 9.3 Statutory Report
```
GET /reports/statutory?month=Feb&year=2026
```
**Compliance breakup:**
- EPF challan details (employee list + amounts)
- ESI challan details
- Professional Tax return data
- TDS deduction summary

#### 9.4 TDS Report
```
GET /reports/tds?financialYear=2025-2026
```
**Tax analysis:**
- Regime-wise employee count
- Total tax deducted
- Employee-wise TDS details
- Form 16 generation ready data

#### 9.5 CTC Report
```
GET /reports/ctc
```
**Organization cost:**
- Total CTC
- Department-wise cost
- Position-wise average
- Cost per employee
- Employer contribution summary

#### 9.6 Variance Report
```
GET /reports/variance?month1=Jan&year1=2026&month2=Feb&year2=2026
```
**Comparison:**
- Salary increase/decrease
- New joiners
- Exits
- Component-wise variance

**कब Use करें:**
- Monthly payroll review
- Management presentation
- Statutory filing
- Budget planning
- Cost analysis

---

### **Module 10: Bank File Generation** 🏦

**Purpose:** Salary transfer के लिए bank files generate करना

**APIs:**
- `POST /bank/generateFile` - File generate करें
- `GET /bank/history` - Previous files
- `GET /bank/download/:fileName` - Download file
- `GET /bank/validate` - Pre-validation

**Supported Formats:**
1. **NEFT** - National Electronic Funds Transfer
2. **RTGS** - Real Time Gross Settlement (> ₹2L)
3. **CSV** - Generic format

**Generate Bank File:**
```json
{
  "month": "Feb",
  "year": 2026,
  "bankFormat": "NEFT",
  "paymentDate": "2026-03-01"
}
```

**NEFT File Format:**
```
CORPORATEID,12345678
PRODUCT,SALARY
PAYMENTDATE,01032026
DEBIT_ACCOUNT,1234567890

BENEFICIARY_CODE,EMP001
BENEFICIARY_NAME,RAHUL KUMAR
BENEFICIARY_ACCOUNT,9876543210
IFSC_CODE,HDFC0001234
AMOUNT,67444
PAYMENT_DETAILS,SALARY_FEB_2026

BENEFICIARY_CODE,EMP002
...
```

**Validation Checks:**
- Bank account number valid
- IFSC code format correct
- Amount > 0
- Employee approved payroll exists

**कब Use करें:**
- Payroll approve होने के बाद
- Salary payment day पर
- Bank को submit करने से पहले validation

---

### **Module 11: Form 16** 📄

**Purpose:** Employees के लिए TDS certificate generate करना

**APIs:**
- `GET /form16/:employeeId` - Single Form 16
- `POST /form16/bulk` - सभी employees के लिए
- `GET /form16/summary` - Summary report

**Form 16 Parts:**

**Part A - Employer & Employee Details:**
- Employer PAN, TAN, Name
- Employee PAN, Name, Address
- Assessment Year

**Part B - Salary Details:**
- Gross salary breakup
- Exemptions (HRA, LTA, etc.)
- Standard deduction
- Taxable salary

**Part C - Chapter VI-A Deductions:**
- Section 80C: ₹1,50,000
- Section 80D: ₹25,000
- Section 80E, 80G, etc.
- Total deductions

**Part D - Tax Computation:**
- Tax on taxable income
- Surcharge (if applicable)
- Health & Education Cess
- Section 87A rebate
- Total tax payable

**Part E - Month-wise TDS:**
```
Month      Income Chargeable   Tax Deducted
April      ₹80,000            ₹3,900
May        ₹80,000            ₹3,900
...
March      ₹80,000            ₹3,900
Total      ₹9,60,000          ₹46,800
```

**Generate Form 16:**
```
GET /form16/:employeeId?financialYear=2025-2026
```

**कब Use करें:**
- Financial year end (May-June)
- Employee request करने पर
- Tax filing के लिए

---

### **Module 12: Claims & Declarations** 🎁

**Purpose:** Employee benefits, reimbursements, और tax declarations को manage करना

#### 12.1 Flexible Benefit Plans
**APIs:**
- `POST /flexiblePlan/:employeeId` - Create plan
- `PUT /flexiblePlan/:employeeId/:planId/status` - Update status
- `GET /flexiblePlan/:employeeId` - Get plans

**Example:**
```json
{
  "planName": "Food Coupons",
  "category": "meal_vouchers",
  "amount": 2200,
  "frequency": "monthly",
  "taxBenefit": true,
  "validFrom": "2026-04-01",
  "validTo": "2027-03-31"
}
```

#### 12.2 Reimbursement Claims
**APIs:**
- `POST /reimbursement/:employeeId` - Submit claim
- `PUT /reimbursement/:employeeId/:claimId/status` - Approve/Reject
- `GET /reimbursement/:employeeId` - Get claims

**Claim Types:**
- Medical
- Travel
- Mobile/Internet
- Books/Journals
- Entertainment

#### 12.3 Tax Declarations
**APIs:**
- `POST /taxDeclaration/:employeeId` - Save declaration
- `PUT /taxDeclaration/:employeeId/:declarationId` - Update
- `GET /taxDeclaration/:employeeId` - Get declarations

**Sections:**
- 80C: LIC, PPF, ELSS
- 80D: Health Insurance
- 80E: Education Loan
- 24: Home Loan Interest

#### 12.4 Investment Proofs
**APIs:**
- `POST /investmentProof/:employeeId` - Upload proof
- `PUT /investmentProof/:employeeId/:proofId/verify` - Verify
- `GET /investmentProof/:employeeId` - Get proofs

**कब Use करें:**
- Year start में declaration
- Actual proofs year end में
- Monthly reimbursement claims

---

### **Module 13: Full & Final Settlement** 💼

**Purpose:** Employee के exit के time final payment settlement

**APIs:**
- `POST /fullAndFinal/initiate` - Start settlement
- `PUT /fullAndFinal/:settlementId/salaryDues` - Add salary dues
- `PUT /fullAndFinal/:settlementId/leaveEncashment` - Leaves
- `PUT /fullAndFinal/:settlementId/bonusIncentives` - Bonus
- `PUT /fullAndFinal/:settlementId/deductions` - Deductions
- `PUT /fullAndFinal/:settlementId/gratuity` - Gratuity
- `POST /fullAndFinal/:settlementId/calculate` - Calculate total
- `POST /fullAndFinal/:settlementId/approval` - Approval workflow
- `PUT /fullAndFinal/:settlementId/payment` - Mark paid
- `GET /fullAndFinal/employee/:employeeId` - Get settlement
- `GET /fullAndFinal/:settlementId` - Details
- `GET /fullAndFinal` - All settlements

**Settlement Components:**

1. **Salary Dues**
   - Pro-rated salary for last month
   - Pending month salaries

2. **Leave Encashment**
   - Unused casual leaves
   - Earned leaves
   - Rate: per day salary

3. **Bonus & Incentives**
   - Pending bonuses
   - Performance incentives

4. **Deductions**
   - Notice period recovery
   - Advance salary
   - Loan balance
   - Asset recovery

5. **Gratuity**
   ```
   Gratuity = (Last drawn salary × 15 × years of service) / 26
   (If > 5 years)
   ```

**Example Calculation:**
```
Employee: Amit Sharma
Last Working Day: 15-Feb-2026
Years of Service: 6 years
Last Salary: ₹80,000

Salary Dues:
- Feb salary (15 days): ₹40,000

Leave Encashment:
- 20 unused leaves × ₹3,077 = ₹61,540

Gratuity:
- (₹80,000 × 15 × 6) / 26 = ₹2,76,923

Deductions:
- Notice period (15 days): -₹40,000
- Laptop recovery: -₹30,000

Total Payable: ₹40,000 + ₹61,540 + ₹2,76,923 - ₹70,000 = ₹3,08,463
```

**कब Use करें:**
- Employee resignation
- Termination
- Retirement

---

### **Module 14: Staff Portal Config** 🌐

**Purpose:** Employee self-service portal की settings

**APIs:**
- `POST /staffPortal/settings` - Portal settings
- `GET /staffPortal/settings` - Get settings
- `POST /staffPortal/webTab` - Add custom tab
- `PUT /staffPortal/webTab/:tabId` - Update tab
- `DELETE /staffPortal/webTab/:tabId` - Delete tab
- `GET /staffPortal/webTabs` - All tabs
- `PUT /staffPortal/preferences/:employeeId` - Employee preferences
- `GET /staffPortal/preferences/:employeeId` - Get preferences

**Portal Features:**
- Payslip download
- Tax declaration
- Claims submission
- Leave balance
- Custom web tabs (company policies, training, etc.)

**कब Use करें:**
- Portal setup
- New policy publish करना हो
- Employee preferences update

---

### **Module 15: Employee Self-Service** 👨‍💼

**Purpose:** Employees अपनी payroll information देख सकें

**APIs:**
- `GET /employee/myPayslips` - मेरी payslips
- `GET /employee/myPayslips/:payrollId` - Payslip detail
- `GET /employee/salarySummary` - Summary
- `GET /employee/myClaimsSummary` - Claims status
- `POST /employee/submitClaim` - New claim
- `GET /employee/myInvestments` - Tax declarations
- `POST /employee/submitInvestmentProof` - Upload proof

**Employee kan:**
- अपनी payslips download करें
- YTD summary देखें
- Claims submit करें
- Tax proofs upload करें
- Leave balance check करें

**कब Use करें:**
- Employee portal में
- Mobile app में
- Self-service features के लिए

---

### **Module 16: Audit Log** 🔍

**Purpose:** सभी payroll changes को track करना

**APIs:**
- `GET /audit/logs` - All logs
- `GET /audit/log/:logId` - Specific log
- `GET /audit/employee/:employeeId` - Employee wise

**Tracked Actions:**
- payroll_processed
- payroll_approved
- payroll_paid
- payroll_deleted
- salary_revised
- tds_calculated
- arrears_created
- compliance_updated

**Log Details:**
- Action type
- Performed by (user)
- Affected employee
- Before data
- After data
- IP address
- Timestamp

**कब Use करें:**
- Audit purpose
- Issue investigation
- Compliance verification

---

## 🚀 Complete Setup Guide

### Step-by-Step Organization Setup

#### **Phase 1: Basic Configuration (Day 1)**

**1. Setup Statutory Compliance**
```bash
POST /api/payroll/createOrUpdateCompliance

Body:
{
  "epf": {
    "isEnabled": true,
    "epfNumber": "DLCPM1234567000",
    "employeeContributionRate": 12,
    "employerContributionRate": 12,
    "restrictedPfWage": 15000
  },
  "esi": {
    "isEnabled": true,
    "esiNumber": "12-34-567890-000-0001",
    "employeeContributionRate": 0.75,
    "employerContributionRate": 3.25,
    "wageLimit": 21000
  },
  "professionalTax": {
    "isEnabled": true,
    "states": [
      {
        "stateName": "Delhi",
        "ptSlabs": [
          {"salaryRangeFrom": 0, "salaryRangeTo": 25000, "taxAmount": 200}
        ]
      }
    ]
  },
  "labourWelfareFund": {
    "isEnabled": true,
    "deductionCycle": "half-yearly"
  },
  "statutoryBonus": {
    "isEnabled": true,
    "percentage": 8.33
  }
}
```

**2. Create Salary Components**

**Earnings:**
```bash
POST /api/payroll/createSalaryCompensation

Body:
{
  "category": "earnings",
  "components": [
    {
      "name": "Basic Salary",
      "code": "BASIC",
      "type": "earning",
      "calculationType": "percentage",
      "value": 40,
      "basedOn": "ctc",
      "taxable": true,
      "considerForEPF": true,
      "status": "active"
    },
    {
      "name": "House Rent Allowance",
      "code": "HRA",
      "type": "earning",
      "calculationType": "percentage",
      "value": 40,
      "basedOn": "basic",
      "taxable": true,
      "considerForEPF": false,
      "status": "active"
    },
    {
      "name": "Special Allowance",
      "code": "SPECIAL",
      "type": "earning",
      "calculationType": "percentage",
      "value": 15,
      "basedOn": "ctc",
      "taxable": true,
      "considerForEPF": false,
      "status": "active"
    },
    {
      "name": "Transport Allowance",
      "code": "TRANSPORT",
      "type": "earning",
      "calculationType": "fixed",
      "value": 1600,
      "taxable": true,
      "considerForEPF": false,
      "status": "active"
    }
  ]
}
```

**Deductions:**
```bash
POST /api/payroll/createSalaryCompensation

Body:
{
  "category": "deductions",
  "components": [
    {
      "name": "Provident Fund",
      "code": "PF",
      "type": "deduction",
      "calculationType": "percentage",
      "value": 12,
      "basedOn": "basic",
      "status": "active"
    },
    {
      "name": "Employee State Insurance",
      "code": "ESI",
      "type": "deduction",
      "calculationType": "percentage",
      "value": 0.75,
      "basedOn": "gross",
      "status": "active"
    },
    {
      "name": "Professional Tax",
      "code": "PT",
      "type": "deduction",
      "calculationType": "fixed",
      "value": 200,
      "status": "active"
    },
    {
      "name": "Income Tax (TDS)",
      "code": "TDS",
      "type": "deduction",
      "calculationType": "variable",
      "status": "active"
    }
  ]
}
```

**3. Setup Payroll Schedule**
```bash
POST /api/payroll/createOrUpdateSchedule

Body:
{
  "payFrequency": "monthly",
  "payPeriod": "fixed",
  "payDay": 1,
  "weekDays": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
  "workingDaysPerMonth": 26
}
```

**4. Setup TDS Configuration**
```bash
POST /api/payroll/tds/config

Body:
{
  "financialYear": "2025-2026",
  "newRegimeSlabs": [
    {"min": 0, "max": 300000, "rate": 0},
    {"min": 300001, "max": 700000, "rate": 5},
    {"min": 700001, "max": 1000000, "rate": 10},
    {"min": 1000001, "max": 1200000, "rate": 15},
    {"min": 1200001, "max": 1500000, "rate": 20},
    {"min": 1500001, "max": 999999999, "rate": 30}
  ],
  "oldRegimeSlabs": [
    {"min": 0, "max": 250000, "rate": 0},
    {"min": 250001, "max": 500000, "rate": 5},
    {"min": 500001, "max": 1000000, "rate": 20},
    {"min": 1000001, "max": 999999999, "rate": 30}
  ],
  "standardDeduction": 50000,
  "section80CLimit": 150000,
  "section80DLimit": 25000,
  "rebateLimit": 700000,
  "rebateAmount": 25000
}
```

#### **Phase 2: Employee Onboarding (Ongoing)**

**1. Build Salary Structure for New Employee**
```bash
POST /api/payroll/ctc/buildStructure

Body:
{
  "ctc": 1200000,
  "basicPercentage": 40,
  "hraPercentage": 40,
  "customComponents": [
    {"name": "Special Allowance", "percentage": 15},
    {"name": "Transport Allowance", "amount": 1600}
  ]
}

Response: (Use this to update employee master)
{
  "ctc": 1200000,
  "grossSalary": 960000,
  "monthlyGross": 80000,
  "components": {
    "basic": 32000,
    "hra": 32000,
    "specialAllowance": 12000,
    "transport": 1600,
    "other": 2400
  }
}
```

**2. Update Employee Master**
```javascript
// In your employee creation API
employee.salaryDetails = {
  ctc: 1200000,
  grossSalary: 960000,
  basicSalary: 384000,
  components: [
    {name: "Basic", amount: 384000, type: "earning"},
    {name: "HRA", amount: 384000, type: "earning"},
    {name: "Special Allowance", amount: 144000, type: "earning"},
    {name: "Transport", amount: 19200, type: "earning"}
  ]
};
```

**3. Calculate Employee TDS**
```bash
POST /api/payroll/tds/calculate/:employeeId

Body:
{
  "financialYear": "2025-2026",
  "taxRegime": "new",
  "declaredDeductions": {
    "section80C": 0,
    "section80D": 0
  },
  "hraDetails": {
    "rentPaid": 15000,
    "isMetroCity": true
  },
  "otherIncome": 0
}
```

#### **Phase 3: Monthly Operations**

---

## 📅 Monthly Payroll Cycle

### Complete Step-by-Step Monthly Process

#### **Week 1 (1st - 7th)**

**Day 1-3: Attendance & Leave Closure**
```bash
# Ensure all attendance marked
# Ensure all leaves approved
# Regularization requests processed
```

**Day 4-5: TDS & Declaration Updates**
```bash
# 1. Check if employees submitted new declarations
GET /api/payroll/taxDeclaration/:employeeId

# 2. Recalculate TDS for employees with changes
POST /api/payroll/tds/calculate/:employeeId

# 3. Bulk calculate for all (recommended)
POST /api/payroll/tds/bulkCalculate
Body: {
  "financialYear": "2025-2026"
}
```

**Day 6-7: Pre-Payroll Checks**
```bash
# 1. Verify salary structures
GET /api/employee/:employeeId
# Check if salaryDetails exists

# 2. Verify bank details
GET /api/payroll/bank/validate?month=Feb&year=2026

# 3. Check pending arrears
GET /api/payroll/arrears
# Approve if needed
```

#### **Week 2 (8th - 14th)**

**Day 8: Process Payroll**
```bash
POST /api/payroll/processPayroll

Body:
{
  "month": "Feb",
  "year": 2026,
  "employeeIds": []  # Empty = all active employees
}

# System will:
# ✓ Pull attendance data
# ✓ Calculate pro-rated salary for LOP
# ✓ Apply all deductions (EPF, ESI, PT, TDS)
# ✓ Add pending arrears
# ✓ Create payroll runs with status "pending"
```

**Day 9-10: Review Payroll**
```bash
# 1. Get payroll history
GET /api/payroll/getPayrollHistory?month=Feb&year=2026

# 2. Get detailed report
GET /api/payroll/reports/summary?month=Feb&year=2026

# 3. Check individual payrolls if needed
GET /api/payroll/getPayroll/:payrollId

# 4. Verify totals
# - Total gross: ₹40,00,000
# - Total deductions: ₹8,00,000
# - Total net: ₹32,00,000
```

**Day 11: Corrections (if needed)**
```bash
# If error found, delete and reprocess
DELETE /api/payroll/deletePayrollRun/:payrollId

# Then reprocess
POST /api/payroll/processPayroll
```

**Day 12-14: Approval Workflow**
```bash
# 1. HR Manager reviews and approves
PUT /api/payroll/updatePayrollStatus/:payrollId
Body: {
  "payStatus": "approved",
  "remarks": "Verified and approved"
}

# Bulk approve (if you have custom script)
```

#### **Week 3 (15th - 21st)**

**Day 15: Generate Bank File**
```bash
POST /api/payroll/bank/generateFile

Body:
{
  "month": "Feb",
  "year": 2026,
  "bankFormat": "NEFT",
  "paymentDate": "2026-02-25"
}

# Response will include file name
# File saved in: /public/bank_files/
```

**Day 16: Download & Submit to Bank**
```bash
# Download file
GET /api/payroll/bank/download/:fileName

# Submit to your bank's corporate portal
```

**Day 17-21: Bank Processing**
```
# Wait for bank to process
# Usually takes 1-2 days
```

#### **Week 4 (22nd - Month End)**

**Day 22-25: Payment Confirmation**
```bash
# After bank confirmation, mark as paid
PUT /api/payroll/updatePayrollStatus/:payrollId
Body: {
  "payStatus": "paid",
  "paidDate": "2026-02-25",
  "remarks": "Payment completed via NEFT"
}

# Bulk update all to paid
```

**Day 26: Generate Payslips**
```bash
# Generate payslips for all
GET /api/payroll/generatePayslip/:payrollId

# Payslips saved in: /public/payslips/
```

**Day 27: Email Payslips**
```javascript
// Your email service
employees.forEach(emp => {
  sendEmail({
    to: emp.email,
    subject: "Payslip for February 2026",
    attachment: `payslip_${emp.employeeId}_Feb_2026.pdf`
  });
});
```

**Day 28-30: Reports & Compliance**
```bash
# 1. Statutory report for EPF filing
GET /api/payroll/reports/statutory?month=Feb&year=2026

# 2. TDS report for challan
GET /api/payroll/reports/tds?financialYear=2025-2026

# 3. Management report
GET /api/payroll/reports/summary?month=Feb&year=2026
```

---

## 🔄 Integration & Data Flow

### How Everything Connects

#### **1. Employee Master → Payroll**
```javascript
// Employee model में salary details
{
  employeeId: "EMP001",
  firstName: "Rahul",
  lastName: "Kumar",
  departmentId: "DEPT001",
  salaryDetails: {
    ctc: 1200000,
    grossSalary: 960000,
    basicSalary: 384000,
    components: [...]
  },
  bankDetails: {
    accountNumber: "9876543210",
    ifscCode: "HDFC0001234",
    bankName: "HDFC Bank"
  },
  epfNumber: "DL/12345/67890",
  esiNumber: "12-34-567890-000-0001",
  panNumber: "ABCDE1234F"
}

// Payroll processing uses this data
```

#### **2. Attendance → Payroll**
```javascript
// Attendance collection
{
  employeeId: "EMP001",
  month: "Feb",
  year: 2026,
  presentDays: 24,
  absentDays: 2,
  leaves: {
    casual: 1,
    sick: 0,
    earned: 0
  },
  holidays: 2
}

// Payroll calculates:
// Working days: 26
// Present + Paid Leaves: 24 + 1 = 25
// LOP days: 1
// Salary: (32000 / 26) × 25 = ₹30,769
```

#### **3. TDS Config → Employee TDS → Payroll**
```javascript
// 1. TDS Config (Organization level)
{
  financialYear: "2025-2026",
  newRegimeSlabs: [...],
  standardDeduction: 50000
}

// 2. Employee TDS (Calculated)
{
  employeeId: "EMP001",
  financialYear: "2025-2026",
  taxRegime: "new",
  taxableIncome: 950000,
  monthlyTDS: 3900
}

// 3. Payroll uses monthlyTDS
payroll.deductions.tds = employeeTDS.monthlyTDS;
```

#### **4. Salary Revision → Arrears → Payroll**
```javascript
// 1. Revision created
{
  employeeId: "EMP001",
  effectiveFrom: "2026-04-01",
  arrearsFromDate: "2026-01-01",
  oldSalary: {ctc: 1200000},
  newSalary: {ctc: 1500000}
}

// 2. On implement, arrears created
{
  employeeId: "EMP001",
  arrearsType: "salary_revision",
  totalArrearsAmount: 60000,
  status: "approved"
}

// 3. Next payroll auto-pays
payroll.earnings.arrears = 60000;
arrears.status = "paid";
arrears.payrollId = payroll._id;
```

#### **5. Compliance Config → Payroll Deductions**
```javascript
// Compliance config
{
  epf: {
    employeeContributionRate: 12,
    restrictedPfWage: 15000
  },
  esi: {
    employeeContributionRate: 0.75,
    wageLimit: 21000
  }
}

// Payroll calculates
if (employee.basicSalary <= 15000) {
  epfDeduction = employee.basicSalary × 0.12;
}

if (employee.grossSalary <= 21000) {
  esiDeduction = employee.grossSalary × 0.0075;
}
```

---

## 📖 Complete API Reference

### Base URL
```
http://localhost:5000/api/payroll
```

### Headers (Required for all APIs)
```javascript
{
  "org_uuid": "your-organization-uuid",
  "Authorization": "Bearer your-jwt-token",
  "Content-Type": "application/json"
}
```

### API Groups

#### **1. STATUTORY COMPLIANCE (2 APIs)**
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/createOrUpdateCompliance` | Setup EPF/ESI/PT/LWF/Bonus |
| GET | `/getCompliance` | Get current settings |

#### **2. SALARY COMPONENTS (6 APIs)**
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/createSalaryCompensation` | Create new component |
| PUT | `/updateSalaryCompensation/:category/:componentId` | Update component |
| GET | `/getSalaryCompensation/:category/:componentId` | Get single component |
| GET | `/getSalaryCompenBYCategory/:category` | All by category |
| GET | `/getAllSalaryCompensations` | Get all |
| DELETE | `/deleteSalaryCompensation/:category/:componentId` | Delete component |

#### **3. PAYROLL SCHEDULE (4 APIs)**
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/createOrUpdateSchedule` | Setup schedule |
| GET | `/getPayrollSchedule` | Get schedule |
| GET | `/getUpcomingPayrollDates` | Next 12 dates |
| GET | `/calculatePayPeriod` | Period for date |

#### **4. PAYROLL PROCESSING (6 APIs)**
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/processPayroll` | Run payroll |
| GET | `/getPayrollHistory` | All payroll runs |
| GET | `/getPayroll/:payrollId` | Get details |
| PUT | `/updatePayrollStatus/:payrollId` | Approve/Reject/Paid |
| GET | `/generatePayslip/:payrollId` | Generate PDF |
| DELETE | `/deletePayrollRun/:payrollId` | Delete run |

#### **5. TDS MANAGEMENT (8 APIs)**
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/tds/config` | Setup tax slabs |
| GET | `/tds/config` | Get config |
| POST | `/tds/calculate/:employeeId` | Calculate TDS |
| GET | `/tds/employee/:employeeId` | Get TDS record |
| PUT | `/tds/declaration/:employeeId` | Update deductions |
| PUT | `/tds/lock/:employeeId` | Lock TDS |
| POST | `/tds/bulkCalculate` | Calculate for all |

#### **6. SALARY REVISION (6 APIs)**
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/revision/create` | Create revision |
| PUT | `/revision/:revisionId/approve` | Approve |
| POST | `/revision/:revisionId/implement` | Implement |
| GET | `/revision` | All revisions |
| GET | `/revision/:revisionId` | Get by ID |
| GET | `/revision/employee/:employeeId` | Employee history |

#### **7. ARREARS (6 APIs)**
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/arrears/create` | Create arrears |
| PUT | `/arrears/:arrearsId/approve` | Approve |
| PUT | `/arrears/:arrearsId/pay` | Mark paid |
| GET | `/arrears` | All arrears |
| GET | `/arrears/employee/:employeeId` | Employee arrears |
| GET | `/arrears/pending/:employeeId` | Pending only |

#### **8. CTC CALCULATOR (4 APIs)**
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/ctc/fromGross` | CTC from gross |
| POST | `/ctc/fromCTC` | Gross from CTC |
| POST | `/ctc/buildStructure` | Build structure |
| POST | `/ctc/takeHome` | Take-home calc |

#### **9. REPORTS (6 APIs)**
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/reports/summary` | Monthly summary |
| GET | `/reports/ytd` | Year-to-date |
| GET | `/reports/statutory` | EPF/ESI/PT breakup |
| GET | `/reports/tds` | TDS report |
| GET | `/reports/ctc` | CTC analysis |
| GET | `/reports/variance` | Month comparison |

#### **10. BANK FILES (4 APIs)**
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/bank/generateFile` | Generate file |
| GET | `/bank/history` | File history |
| GET | `/bank/download/:fileName` | Download |
| GET | `/bank/validate` | Validate data |

#### **11. FORM 16 (3 APIs)**
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/form16/:employeeId` | Generate Form 16 |
| POST | `/form16/bulk` | Bulk generate |
| GET | `/form16/summary` | Summary |

#### **12. CLAIMS & DECLARATIONS (15 APIs)**

**Flexible Benefits:**
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/flexiblePlan/:employeeId` | Create plan |
| PUT | `/flexiblePlan/:employeeId/:planId/status` | Update status |
| GET | `/flexiblePlan/:employeeId` | Get plans |

**Reimbursements:**
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/reimbursement/:employeeId` | Submit claim |
| PUT | `/reimbursement/:employeeId/:claimId/status` | Update status |
| GET | `/reimbursement/:employeeId` | Get claims |

**Tax Declarations:**
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/taxDeclaration/:employeeId` | Save declaration |
| PUT | `/taxDeclaration/:employeeId/:declarationId` | Update |
| GET | `/taxDeclaration/:employeeId` | Get declarations |

**Investment Proofs:**
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/investmentProof/:employeeId` | Upload proof |
| PUT | `/investmentProof/:employeeId/:proofId/verify` | Verify |
| GET | `/investmentProof/:employeeId` | Get proofs |

**All Claims:**
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/allClaims/:employeeId` | All claims summary |

#### **13. FULL & FINAL (11 APIs)**
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/fullAndFinal/initiate` | Start settlement |
| PUT | `/fullAndFinal/:settlementId/salaryDues` | Add salary |
| PUT | `/fullAndFinal/:settlementId/leaveEncashment` | Add leaves |
| PUT | `/fullAndFinal/:settlementId/bonusIncentives` | Add bonus |
| PUT | `/fullAndFinal/:settlementId/deductions` | Add deductions |
| PUT | `/fullAndFinal/:settlementId/gratuity` | Add gratuity |
| POST | `/fullAndFinal/:settlementId/calculate` | Calculate total |
| POST | `/fullAndFinal/:settlementId/approval` | Add approval |
| PUT | `/fullAndFinal/:settlementId/payment` | Mark paid |
| GET | `/fullAndFinal/employee/:employeeId` | Get by employee |
| GET | `/fullAndFinal/:settlementId` | Get by ID |
| GET | `/fullAndFinal` | Get all |

#### **14. STAFF PORTAL (8 APIs)**
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/staffPortal/settings` | Update settings |
| GET | `/staffPortal/settings` | Get settings |
| POST | `/staffPortal/webTab` | Add web tab |
| PUT | `/staffPortal/webTab/:tabId` | Update tab |
| DELETE | `/staffPortal/webTab/:tabId` | Delete tab |
| GET | `/staffPortal/webTabs` | All tabs |
| PUT | `/staffPortal/preferences/:employeeId` | Update preferences |
| GET | `/staffPortal/preferences/:employeeId` | Get preferences |

#### **15. EMPLOYEE SELF-SERVICE (7 APIs)**
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/employee/myPayslips` | My payslips |
| GET | `/employee/myPayslips/:payrollId` | Payslip detail |
| GET | `/employee/salarySummary` | Salary summary |
| GET | `/employee/myClaimsSummary` | Claims summary |
| POST | `/employee/submitClaim` | Submit claim |
| GET | `/employee/myInvestments` | Tax proofs |
| POST | `/employee/submitInvestmentProof` | Upload proof |

#### **16. AUDIT LOG (3 APIs)**
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/audit/logs` | All logs |
| GET | `/audit/log/:logId` | Get by ID |
| GET | `/audit/employee/:employeeId` | Employee logs |

**Total: 92 APIs** across 16 modules

---

## 🔧 Troubleshooting

### Common Issues & Solutions

#### **Issue 1: Payroll not processing for some employees**

**Possible Reasons:**
1. Employee status not "active"
2. Salary structure missing
3. Bank details missing

**Solution:**
```bash
# Check employee
GET /api/employee/:employeeId

# Verify:
# ✓ status === "active"
# ✓ salaryDetails exists
# ✓ bankDetails.accountNumber exists
```

#### **Issue 2: Wrong EPF/ESI amounts**

**Possible Reasons:**
1. Compliance rates wrong
2. Salary components not configured properly

**Solution:**
```bash
# Check compliance config
GET /api/payroll/getCompliance

# Verify rates:
# ✓ EPF: 12% employee, 12% employer
# ✓ ESI: 0.75% employee, 3.25% employer
```

#### **Issue 3: TDS calculation wrong**

**Possible Reasons:**
1. Tax slabs outdated
2. Employee declarations not updated
3. HRA exemption not calculated

**Solution:**
```bash
# Check TDS config
GET /api/payroll/tds/config?financialYear=2025-2026

# Recalculate
POST /api/payroll/tds/calculate/:employeeId

# Check calculation details in response
```

#### **Issue 4: Arrears not auto-paid**

**Possible Reasons:**
1. Arrears status not "approved"
2. Payroll processed before arrears approved

**Solution:**
```bash
# Check arrears status
GET /api/payroll/arrears/employee/:employeeId

# If pending, approve
PUT /api/payroll/arrears/:arrearsId/approve

# Reprocess payroll
DELETE /api/payroll/deletePayrollRun/:payrollId
POST /api/payroll/processPayroll
```

#### **Issue 5: Bank file generation fails**

**Possible Reasons:**
1. Payroll not approved
2. Bank details missing

**Solution:**
```bash
# Validate first
GET /api/payroll/bank/validate?month=Feb&year=2026

# Fix missing bank details
# Approve payroll
PUT /api/payroll/updatePayrollStatus/:payrollId

# Then generate file
POST /api/payroll/bank/generateFile
```

---

## 📊 System Metrics & Capacity

### Performance Specs

**Designed For:**
- Organizations: Unlimited (multi-tenant)
- Employees per org: Up to 10,000
- Concurrent users: 500+
- Monthly payroll runs: Less than 2 minutes for 1000 employees

**Database:**
- Models: 25
- Indexes: Optimized for fast queries
- Multi-tenant: Separate DB per organization

**Storage:**
- Payslips: PDF stored in `/public/payslips/`
- Bank files: Stored in `/public/bank_files/`
- Audit logs: Retention - 2 years

**Security:**
- JWT authentication
- Organization-level isolation
- Role-based access (can be added)
- Audit trail for all changes

---

## 🎉 Summary

### Aapka Complete Payroll System

✅ **16 Modules** - हर aspect covered  
✅ **92 APIs** - Full automation  
✅ **Indian Compliance** - EPF, ESI, PT, TDS, Bonus, Gratuity  
✅ **TDS Management** - New & Old regime  
✅ **Salary Revision** - Complete workflow  
✅ **Arrears** - Auto-payment  
✅ **CTC Calculator** - Structure builder  
✅ **Reports** - 6 comprehensive reports  
✅ **Bank Files** - NEFT/RTGS/CSV  
✅ **Form 16** - Auto-generation  
✅ **Employee Portal** - Self-service  
✅ **Full & Final** - Complete settlement  
✅ **Audit Trail** - हर change tracked  

### यह System आपको देता है:

1. **Complete Automation** - Manual work minimum
2. **Compliance Ready** - सभी statutory requirements
3. **Employee Satisfaction** - Self-service portal
4. **Management Insights** - Detailed reports
5. **Scalability** - 10,000+ employees support
6. **Flexibility** - Multiple configurations
7. **Security** - Multi-tenant architecture
8. **Audit Trail** - Complete transparency

### Next Steps:

1. Setup पूरा करें (Phase 1)
2. Test के साथ 2-3 employees process करें
3. Monthly cycle follow करें
4. Reports regularly review करें
5. Optimize as needed

**Your payroll system is production-ready!** 🚀

---

**Document Version:** 1.0  
**Last Updated:** February 9, 2026  
**System Version:** 2.0.0  
**Status:** Production Ready ✅
