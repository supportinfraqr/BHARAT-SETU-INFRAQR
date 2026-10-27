# Payroll Compliance — End-to-End Test Guide

Server: `http://localhost:3300`

## Required Headers (every request)

```
Authorization: Bearer <YOUR_JWT>
org_uuid: <YOUR_ORG_UUID>
Content-Type: application/json
```

> JWT pehle login se nikalo (`/login` endpoint) ya Postman me jo already saved hai use kar lo.

---

## STEP 1 — Statutory Compliance setup karo

Saare flags ON karke ek baar config save karo. Yahaan har compliance ke har UI flag aaya hai.

**Endpoint**: `POST /payroll/createOrUpdateCompliance`

```json
{
  "epf": {
    "isEnabled": true,
    "epfNumber": "MH/BOM/1234567",
    "deductionCycle": "monthly",
    "employeeContributionRate": 12,
    "employerContributionRate": 12,
    "restrictedPfWage": 15000,
    "contributionPreferences": {
      "employerPfContribution": true,
      "edliContribution": true,
      "adminCharges": true
    },
    "allowEmployeeLevelOverride": true,
    "proRateRestrictedPfWage": true,
    "considerSalaryBasedOnLOP": true,
    "eligibleForAbryScheme": false
  },
  "esi": {
    "isEnabled": true,
    "esiNumber": "31-00-123456-000-0001",
    "deductionCycle": "monthly",
    "employeeContributionRate": 0.75,
    "employerContributionRate": 3.25,
    "wageLimit": 21000,
    "includeEmployerInSalaryStructure": true
  },
  "professionalTax": {
    "isEnabled": true,
    "deductionCycle": "monthly",
    "states": [
      {
        "stateName": "Maharashtra",
        "ptNumber": "MH-PT-001",
        "isApplicable": true,
        "ptSlabs": [
          { "salaryRangeFrom": 0,     "salaryRangeTo": 7500,    "taxAmount": 0 },
          { "salaryRangeFrom": 7501,  "salaryRangeTo": 10000,   "taxAmount": 175 },
          { "salaryRangeFrom": 10001, "salaryRangeTo": 9999999, "taxAmount": 200 }
        ]
      },
      {
        "stateName": "Karnataka",
        "ptNumber": "KA-PT-001",
        "isApplicable": true,
        "ptSlabs": [
          { "salaryRangeFrom": 0,     "salaryRangeTo": 14999,   "taxAmount": 0 },
          { "salaryRangeFrom": 15000, "salaryRangeTo": 9999999, "taxAmount": 200 }
        ]
      }
    ]
  },
  "labourWelfareFund": {
    "isEnabled": true,
    "deductionCycle": "half-yearly",
    "states": [
      { "stateName": "Maharashtra", "minAmount": 0, "maxAmount": 9999999, "employeeShare": 6, "employerShare": 18, "isApplicable": true },
      { "stateName": "Karnataka",   "minAmount": 0, "maxAmount": 9999999, "employeeShare": 20, "employerShare": 40, "isApplicable": true }
    ]
  },
  "statutoryBonus": {
    "isEnabled": true,
    "paymentCycle": "yearly",
    "paymentMonth": "October",
    "percentage": 8.33,
    "states": [
      { "stateName": "Maharashtra", "minWage": 8000, "formulaBase": "basicAndDA" },
      { "stateName": "Karnataka",   "minWage": 7000, "formulaBase": "basicAndDA" }
    ]
  }
}
```

**Expected**: `200 OK` with the saved compliance object.

---

## STEP 2 — Test Employee taiyaar karo

Naya banao ya existing employee update karo. Important fields:

```json
{
  "firstName": "Test",
  "lastName": "Employee",
  "email": "test.epf@example.com",
  "payrollInfo": {
    "baseSalary": 15000,
    "grossSalary": 22000,
    "salaryEffectiveFrom": "2025-04-01"
  },
  "statutoryInfo": {
    "pfAccountNumber": "MH/BOM/1234567/0001",
    "uan": "100123456789",
    "esiNumber": "31-00-123456-000-0001",
    "esiApplicable": true,
    "ptApplicable": true,
    "ptState": "Maharashtra",
    "lwfApplicable": true,
    "lwfState": "Maharashtra",
    "epfApplicable": true
  }
}
```

> **Tip**: Different employees ke liye `ptState` aur `lwfState` alag-alag rakho (Karnataka vs Maharashtra) — tab multi-state work karta hua dikhega.

---

## STEP 3 — Quick Preview Test (DB me kuch save kiye bina)

Endpoint: `POST /payroll/calculatePayrollInfo`

```json
{ "baseSalary": 15000, "state": "Maharashtra" }
```

**Expected Response** (key fields):

```json
{
  "breakdown": {
    "deductions": {
      "statutory": {
        "epf": {
          "employee": 1800,
          "employer": 1800,
          "edli": 75,
          "adminCharges": 75,
          "wage": 15000,
          "abryApplied": false
        },
        "esi": { "employee": 165, "employer": 715 },
        "professionalTax": 200,
        "lwf": { "employee": 0, "employer": 0, "state": "Maharashtra" }
      }
    },
    "statutoryBonus": {
      "applicable": false,
      "monthlyEquivalent": 583,
      "annualEquivalent": 6997,
      "paidInMonth": "Oct"
    }
  }
}
```

> Yahaan LWF=0 hai kyunki preview me month context nahi hai aur half-yearly cycle pe trigger nahi hua. Yeh sahi behavior hai.

---

## STEP 4 — Actual Monthly Payroll Run karo

Endpoint: `POST /payroll/processPayroll`

```json
{
  "month": "Jun",
  "year": 2025,
  "employeeIds": ["<YOUR_TEST_EMPLOYEE_ID>"]
}
```

**Expected Response**:

```json
{
  "status": 200,
  "data": {
    "successful": 1,
    "failed": 0,
    "results": [
      { "name": "Test Employee", "netPay": 12953, "status": "success" }
    ]
  }
}
```

> **June** chuna kyunki LWF half-yearly Jun me trigger hota hai — `lwfDetails` me dikhega.

---

## STEP 5 — Saved Payroll Inspect karo

Payroll history se latest ka `payrollId` lo:

```
GET /payroll/getPayrollHistory?month=Jun&year=2025
```

Phir detail:

```
GET /payroll/getPayroll/<payrollId>
```

**Yeh sab dikhega ab saved payroll me**:

```json
{
  "deductions": [
    { "componentName": "EPF (Employee)",      "amount": 1800 },
    { "componentName": "ESI (Employee)",      "amount": 165 },
    { "componentName": "Professional Tax",    "amount": 200 },
    { "componentName": "Labour Welfare Fund", "amount": 6 }
  ],
  "employerContributions": {
    "epf": 1800,
    "edli": 75,
    "adminCharges": 75,
    "esi": 715,
    "lwf": 18,
    "total": 2683
  },
  "epfDetails": {
    "applicable": true,
    "epfWage": 15000,
    "employeeRate": 12,
    "employerRate": 12,
    "abryApplied": false,
    "overrideUsed": false
  },
  "esiDetails": {
    "applicable": true,
    "wageUsed": 22000,
    "wageLimit": 21000,
    "includeEmployerInCtc": true
  },
  "ptDetails": {
    "applicable": true,
    "stateUsed": "Maharashtra",
    "ptNumber": "MH-PT-001",
    "cycle": "monthly",
    "amount": 200
  },
  "lwfDetails": {
    "applicable": true,
    "stateUsed": "Maharashtra",
    "cycle": "half-yearly",
    "employeeShare": 6,
    "employerShare": 18
  },
  "bonusDetails": {
    "applicable": false,
    "cycle": "yearly",
    "paymentMonth": "Oct"
  }
}
```

---

## STEP 6 — Bonus Month (October) Test karo

Same employee ka October ka payroll process karo:

```json
{ "month": "Oct", "year": 2025, "employeeIds": ["<EMPLOYEE_ID>"] }
```

Saved payroll me:

- `earnings` array me **`Statutory Bonus`** appear hoga (~₹6,997 = 7000×8.33%×12)
- `bonusDetails.applicable: true`
- `bonusDetails.amount: 6997`
- LWF Oct me trigger nahi (kyunki HY cycle = Jun/Dec) — `lwfDetails.applicable: false`

---

## STEP 7 — Statutory Compliance Report

Saare employees ka combined snapshot:

```
GET /payroll/reports/statutory?month=Jun&year=2025
```

**Response**:

```json
{
  "report": {
    "epf": {
      "employees": [{ "uan": "100123456789", "epfWage": 15000, "employeeContribution": 1800, "employerContribution": 1800, "edliContribution": 75, "adminCharges": 75 }],
      "totalEmployeeContribution": 1800,
      "totalEmployerContribution": 1800,
      "totalEdliContribution": 75,
      "totalAdminCharges": 75,
      "totalEmployerCost": 1950
    },
    "esi": {
      "employees": [{ "esiNumber": "31-00-123456-000-0001", "wageUsed": 22000, "employeeContribution": 165, "employerContribution": 715 }],
      "totalEmployeeContribution": 165,
      "totalEmployerContribution": 715
    },
    "pt": {
      "employees": [{ "state": "Maharashtra", "ptNumber": "MH-PT-001", "amount": 200 }],
      "totalAmount": 200
    },
    "lwf": {
      "employees": [{ "state": "Maharashtra", "employeeShare": 6, "employerShare": 18 }],
      "totalEmployeeShare": 6,
      "totalEmployerShare": 18
    },
    "bonus": {
      "employees": [],
      "totalAmount": 0
    }
  }
}
```

Yahi report use hoti hai PF ECR file, ESIC return, PT challan, LWF return banane ke liye.

---

## Edge Case Scenarios — Optional

### A) ABRY Scheme
Compliance update karo:
```json
{ "epf": { "eligibleForAbryScheme": true } }
```
Payroll dobara process karo — `epfDetails.abryApplied: true`, `employerContributions.epf: 0` dikhega.

### B) Per-employee EPF Override
Employee update karo:
```json
{
  "statutoryInfo": {
    "epfOverride": {
      "enabled": true,
      "employeeContributionRate": 10,
      "applyCeiling": false
    }
  }
}
```
Payroll process karo — basic 15000 ka 10% = ₹1,500 katega (ceiling nahi lagega).

### C) LOP scenarios
Attendance me 5 din absent maaro. Process karo. Payroll me:
- `epfDetails.proRated: true`
- `epfDetails.consideringLop: true`
- LOP-adjusted EPF wage dikhega

### D) Multi-state PT
Karnataka wala employee banao (`ptState: Karnataka`). Process karo — Maharashtra ka slab nahi, Karnataka ka slab apply hoga.

### E) ESI Above Wage Limit
Employee ka grossSalary 25000 set karo. ESI calculate hi nahi hoga (`esiDetails.applicable: false`).
