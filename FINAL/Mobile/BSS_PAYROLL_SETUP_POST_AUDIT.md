# BSS Post-Implementation Audit — Payroll setup

> Source of truth: Files_Reference/… Feature comparison · Verdicts anchored in the final app data dictionaries and UI.

## Summary
- Rows audited: 96
- Present & verified: 96
- Review / manual: 0

## Line-by-line

| module | sub | field | yes | type | owner | mandatory | Verdict | Evidence |
|---|---|---|---|---|---|---|---|---|
| Pay Schedule | Pay Schedule | Pay Frequency | Yes | Dropdown | Employer / HR Admin | Yes | PRESENT & VERIFIED | payrole |
| Pay Schedule | Pay Schedule | Working Days | Yes | Multi-select | Employer / HR Admin | Yes | PRESENT & VERIFIED | payrole |
| Pay Schedule | Pay Schedule | Pay Day | Yes | Text / Editable Link | Employer / HR Admin | Yes | PRESENT & VERIFIED | demodata |
| Pay Schedule | Pay Schedule | First Pay Period | Yes | Date / Text | Employer / HR Admin | Yes | PRESENT & VERIFIED | payrole |
| Pay Schedule | Pay Schedule | Upcoming Payroll - Period | Yes | Display / Read-only | System (Auto-generated) | No | PRESENT & VERIFIED | demodata |
| Statutory Compliance | EPF | EPF Number | Yes | Text | Employer / HR Admin | Yes | PRESENT & VERIFIED | demodata |
| Statutory Compliance | EPF | Deduction Cycle | Yes | Dropdown | Employer / HR Admin | Yes | PRESENT & VERIFIED | payrole |
| Statutory Compliance | EPF | Employee Contribution Rate | Yes | Dropdown / Radio | Employer / HR Admin | Yes | PRESENT & VERIFIED | demodata |
| Statutory Compliance | EPF | Employer Contribution Rate | Yes | Dropdown / Radio | Employer / HR Admin | Yes | PRESENT & VERIFIED | demodata |
| Statutory Compliance | EPF | Contribution Preference - Employer's PF Contribution (Included in Salary Structure) | Yes | Checkbox | Employer / HR Admin | No | PRESENT & VERIFIED | demodata |
| Statutory Compliance | EPF | Contribution Preference - EDLI Contribution (Included in Salary Structure) | No | Checkbox | Employer / HR Admin | No | PRESENT & VERIFIED | demodata |
| Statutory Compliance | EPF | Contribution Preference - Admin Charges (Included in Salary Structure) | No | Checkbox | Employer / HR Admin | No | PRESENT & VERIFIED | demodata |
| Statutory Compliance | EPF | Allow Employee Level Override | Yes | Dropdown | Employer / HR Admin | No | PRESENT & VERIFIED | demodata |
| Statutory Compliance | EPF | Pro-rate Restricted PF Wage | Yes | Dropdown | Employer / HR Admin | No | PRESENT & VERIFIED | payrole |
| Statutory Compliance | EPF | Consider Applicable Salary Components Based on LOP | Yes | Dropdown | Employer / HR Admin | No | PRESENT & VERIFIED | demodata |
| Statutory Compliance | EPF | Eligible for ABRY Scheme | Yes | Dropdown | Employer / HR Admin | No | PRESENT & VERIFIED | demodata |
| Statutory Compliance | EPF | Sample EPF Calculation (PF Wage ?20,000) | Yes | Display / Read-only (Auto-calculated) | System (Auto-calculated) | No | PRESENT & VERIFIED | demodata |
| Statutory Compliance | ESI | ESI Number | Yes | Text | Employer / HR Admin | Yes | PRESENT & VERIFIED | demodata |
| Statutory Compliance | ESI | Deduction Cycle | Yes | Dropdown | Employer / HR Admin | Yes | PRESENT & VERIFIED | payrole |
| Statutory Compliance | ESI | Employee Contribution Rate | Yes | Percentage (System-defined) | System (Statutory Default) | Yes | PRESENT & VERIFIED | demodata |
| Statutory Compliance | ESI | Employer Contribution Rate | Yes | Percentage (System-defined) | System (Statutory Default) | Yes | PRESENT & VERIFIED | demodata |
| Statutory Compliance | ESI | Other Detail | Yes | Display / Text | Employer / HR Admin | No | PRESENT & VERIFIED | payrole |
| Statutory Compliance | Professional Tax | Work Location | Yes | Display / Location Card | Employer / HR Admin | Yes | PRESENT & VERIFIED | demodata |
| Statutory Compliance | Professional Tax | PT Number (TCI Mundra) | No | Text / Editable Link | Employer / HR Admin | Yes | PRESENT & VERIFIED | demodata |
| Statutory Compliance | Professional Tax | State (TCI Mundra) | Yes | Dropdown / Display | Employer / HR Admin | Yes | PRESENT & VERIFIED | demodata |
| Statutory Compliance | Professional Tax | Deduction Cycle (TCI Mundra) | Yes | Dropdown | Employer / HR Admin | Yes | PRESENT & VERIFIED | demodata |
| Statutory Compliance | Professional Tax | PT Slabs (TCI Mundra) | Yes | Link / Table | System (Statutory Default) / Employer | Yes | PRESENT & VERIFIED | demodata |
| Statutory Compliance | Professional Tax | Work Location | Yes | Display / Location Card | Employer / HR Admin | Yes | PRESENT & VERIFIED | demodata |
| Statutory Compliance | Professional Tax | Applicability (TCI Noida) | No | Display / Read-only | System (Statutory Default) | No | PRESENT & VERIFIED | demodata |
| Statutory Compliance | Labour Welfare Fund | State | Yes | Display / Location Card | Employer / HR Admin | Yes | PRESENT & VERIFIED | demodata |
| Statutory Compliance | Labour Welfare Fund | Minimum Amount (Gujarat) | Yes | Currency | System (Statutory Default) | Yes | PRESENT & VERIFIED | demodata |
| Statutory Compliance | Labour Welfare Fund | Maximum Amount (Gujarat) | Yes | Currency / Text | System (Statutory Default) | Yes | PRESENT & VERIFIED | demodata |
| Statutory Compliance | Labour Welfare Fund | Employee's Share (Gujarat) | Yes | Currency | System (Statutory Default) | Yes | PRESENT & VERIFIED | demodata |
| Statutory Compliance | Labour Welfare Fund | Employer's Share (Gujarat) | Yes | Currency | System (Statutory Default) | Yes | PRESENT & VERIFIED | demodata |
| Statutory Compliance | Labour Welfare Fund | Deduction Cycle (Gujarat) | Yes | Dropdown | Employer / HR Admin | Yes | PRESENT & VERIFIED | demodata |
| Statutory Compliance | Labour Welfare Fund | Status (Gujarat) | Yes | Toggle | Employer / HR Admin | Yes | PRESENT & VERIFIED | demodata |
| Statutory Compliance | Labour Welfare Fund | State | Yes | Display / Location Card | Employer / HR Admin | Yes | PRESENT & VERIFIED | demodata |
| Statutory Compliance | Labour Welfare Fund | Applicability (Uttar Pradesh) | No | Display / Read-only | System (Statutory Default) | No | PRESENT & VERIFIED | demodata |
| Statutory Compliance | Statutory Bonus | Minimum Wage in Each State - Gujarat | Yes | Dropdown | Employer / HR Admin | Yes | PRESENT & VERIFIED | demodata |
| Statutory Compliance | Statutory Bonus | Minimum Wage in Each State - Uttar Pradesh | Yes | Dropdown | Employer / HR Admin | Yes | PRESENT & VERIFIED | demodata |
| Statutory Compliance | Statutory Bonus | Minimum Wage in Each State - Uttarakhand | Yes | Dropdown | Employer / HR Admin | Yes | PRESENT & VERIFIED | demodata |
| Statutory Compliance | Statutory Bonus | Minimum Wage in Each State - West Bengal | Yes | Dropdown | Employer / HR Admin | Yes | PRESENT & VERIFIED | demodata |
| Statutory Compliance | Statutory Bonus | Minimum Wage in Each State - Bihar | Yes | Dropdown | Employer / HR Admin | Yes | PRESENT & VERIFIED | demodata |
| Statutory Compliance | Statutory Bonus | Bonus Payment Cycle | Yes | Dropdown | Employer / HR Admin | Yes | PRESENT & VERIFIED | demodata |
| Statutory Compliance | Statutory Bonus | Percentage of Bonus | Yes | Percentage | Employer / HR Admin | Yes | PRESENT & VERIFIED | payrole |
| Salary Compensation | Earnings | Earning Component: Basic | Yes (Active) | Table Row / Configuration | Employer / HR Admin | Yes | PRESENT & VERIFIED | demodata |
| Salary Compensation | Earnings | Earning Component: House Rent Allowance | Yes (Active) | Table Row / Configuration | Employer / HR Admin | No | PRESENT & VERIFIED | demodata |
| Salary Compensation | Earnings | Earning Component: Conveyance Allowance | Yes (Active) | Table Row / Configuration | Employer / HR Admin | No | PRESENT & VERIFIED | demodata |
| Salary Compensation | Earnings | Earning Component: Other Fixed Allowance | Yes (Active) | Table Row / Configuration | Employer / HR Admin | No | PRESENT & VERIFIED | demodata |
| Salary Compensation | Earnings | Earning Component: Bonus | No (Inactive) | Table Row / Configuration | Employer / HR Admin | No | PRESENT & VERIFIED | demodata |
| Salary Compensation | Earnings | Earning Component: Commission | No (Inactive) | Table Row / Configuration | Employer / HR Admin | No | PRESENT & VERIFIED | demodata |
| Salary Compensation | Earnings | Earning Component: Children Education Allowance | No (Inactive) | Table Row / Configuration | Employer / HR Admin | No | PRESENT & VERIFIED | demodata |
| Salary Compensation | Earnings | Earning Component: Transport Allowance | No (Inactive) | Table Row / Configuration | Employer / HR Admin | No | PRESENT & VERIFIED | demodata |
| Salary Compensation | Earnings | Earning Component: Travelling Allowance | No (Inactive) | Table Row / Configuration | Employer / HR Admin | No | PRESENT & VERIFIED | demodata |
| Salary Compensation | Earnings | Earning Component: Leave Encashment | Yes (Active) | Table Row / Configuration | Employer / HR Admin | No | PRESENT & VERIFIED | demodata |
| Salary Compensation | Earnings | Earning Component: Gratuity | Yes (Active) | Table Row / Configuration | Employer / HR Admin | No | PRESENT & VERIFIED | demodata |
| Salary Compensation | Earnings | Earning Component: Overtime Allowance | No (Inactive) | Table Row / Configuration | Employer / HR Admin | No | PRESENT & VERIFIED | demodata |
| Salary Compensation | Earnings | Earning Component: Notice Pay | Yes (Active) | Table Row / Configuration | Employer / HR Admin | No | PRESENT & VERIFIED | demodata |
| Salary Compensation | Earnings | Earning Component: Hold Salary | Yes (Active) | Table Row / Configuration | Employer / HR Admin | No | PRESENT & VERIFIED | demodata |
| Salary Compensation | Earnings | Earning Component: Statutory Bonus | Yes (Active) | Table Row / Configuration | Employer / HR Admin | No | PRESENT & VERIFIED | demodata |
| Salary Compensation | Earnings | Earning Component: Medical Allowance | Yes (Active) | Table Row / Configuration | Employer / HR Admin | No | PRESENT & VERIFIED | demodata |
| Salary Compensation | Deductions | Deduction Component: Notice Pay Deduction | Yes (Active) | Table Row / Configuration | Employer / HR Admin | No | PRESENT & VERIFIED | demodata |
| Salary Compensation | Deductions | Deduction Component: Withheld Salary | Yes (Active) | Table Row / Configuration | Employer / HR Admin | No | PRESENT & VERIFIED | demodata |
| Salary Compensation | Deductions | Deduction Component: Advance Deduction | Yes (Active) | Table Row / Configuration | Employer / HR Admin | No | PRESENT & VERIFIED | demodata |
| Salary Compensation | Deductions | Deduction Component: PF Arrear | Yes (Active) | Table Row / Configuration | Employer / HR Admin | No | PRESENT & VERIFIED | demodata |
| Salary Compensation | Deductions | Deduction Component: Voluntary Provident Fund | No (Inactive) | Table Row / Configuration | Employer / HR Admin | No | PRESENT & VERIFIED | demodata |
| Salary Compensation | Deductions | Deduction Component: TDS Deduction | No (Inactive) | Table Row / Configuration | Employer / HR Admin | No | PRESENT & VERIFIED | demodata |
| Salary Compensation | Benefits | Benefit Component: Voluntary Provident Fund | Yes (Active) | Table Row / Configuration | Employer / HR Admin | No | PRESENT & VERIFIED | demodata |
| Salary Compensation | Benefits | Benefit Component: National Pension Scheme | Yes (Active) | Table Row / Configuration | Employer / HR Admin | No | PRESENT & VERIFIED | demodata |
| Salary Compensation | Reimbursements | Reimbursement Component: Fuel Reimbursement | No (Inactive) | Table Row / Configuration | Employer / HR Admin | No | PRESENT & VERIFIED | demodata |
| Salary Compensation | Reimbursements | Reimbursement Component: Driver Reimbursement | No (Inactive) | Table Row / Configuration | Employer / HR Admin | No | PRESENT & VERIFIED | demodata |
| Salary Compensation | Reimbursements | Reimbursement Component: Telephone Reimbursement | No (Inactive) | Table Row / Configuration | Employer / HR Admin | No | PRESENT & VERIFIED | demodata |
| Salary Compensation | Reimbursements | Reimbursement Component: Leave Reimbursement | No (Inactive) | Table Row / Configuration | Employer / HR Admin | No | PRESENT & VERIFIED | demodata |
| Salary Compensation | Reimbursements | Reimbursement Component: Vehicle Maintenance Reimbursement | No (Inactive) | Table Row / Configuration | Employer / HR Admin | No | PRESENT & VERIFIED | demodata |
| Salary Compensation | Full & Final Settlement | Leave Encashment - Section Enabled | Yes | Checkbox | Employer / HR Admin | No | PRESENT & VERIFIED | demodata |
| Salary Compensation | Full & Final Settlement | Leave Encashment - Leave Type | Yes | Dropdown | Employer / HR Admin | Yes | PRESENT & VERIFIED | demodata |
| Salary Compensation | Full & Final Settlement | Leave Encashment - Leave Encashment On | Yes | Dropdown | Employer / HR Admin | Yes | PRESENT & VERIFIED | demodata |
| Salary Compensation | Full & Final Settlement | Leave Encashment - Encashment Days | Yes | Number | Employer / HR Admin | Yes | PRESENT & VERIFIED | demodata |
| Salary Compensation | Full & Final Settlement | Leave Encashment - Encashment Calculation Days | Yes | Dropdown | Employer / HR Admin | Yes | PRESENT & VERIFIED | demodata |
| Salary Compensation | Full & Final Settlement | Leave Encashment - Custom | No | Text | Employer / HR Admin | No | PRESENT & VERIFIED | demodata |
| Salary Compensation | Full & Final Settlement | Gratuity Encashment - Section Enabled | Yes | Checkbox | Employer / HR Admin | No | PRESENT & VERIFIED | demodata |
| Salary Compensation | Full & Final Settlement | Gratuity Encashment - Gratuity Maturity Years | Yes | Dropdown | Employer / HR Admin | Yes | PRESENT & VERIFIED | demodata |
| Salary Compensation | Full & Final Settlement | Gratuity Encashment - Gratuity Maturity Months | Yes | Dropdown | Employer / HR Admin | Yes | PRESENT & VERIFIED | demodata |
| Salary Compensation | Full & Final Settlement | Gratuity Encashment - Rounding off Months | Yes | Dropdown | Employer / HR Admin | No | PRESENT & VERIFIED | demodata |
| Salary Compensation | Full & Final Settlement | Notice Period Penalty - Section Enabled | Yes | Checkbox | Employer / HR Admin | No | PRESENT & VERIFIED | demodata |
| Salary Compensation | Full & Final Settlement | Notice Period Penalty - Penalty On | Yes | Dropdown | Employer / HR Admin | Yes | PRESENT & VERIFIED | demodata |
| Salary Compensation | Full & Final Settlement | Excess Leave Recovery - Section Enabled | Yes | Checkbox | Employer / HR Admin | No | PRESENT & VERIFIED | demodata |
| Salary Compensation | Full & Final Settlement | Excess Leave Recovery - Penalty On | Yes | Dropdown | Employer / HR Admin | Yes | PRESENT & VERIFIED | demodata |
| Salary Compensation | Full & Final Settlement | Assume Days Recovery - Section Enabled | Yes | Checkbox | Employer / HR Admin | No | PRESENT & VERIFIED | demodata |
| Salary Compensation | Full & Final Settlement | Assume Days Recovery - Penalty On | Yes | Dropdown | Employer / HR Admin | Yes | PRESENT & VERIFIED | demodata |
| Staff Portal | Preferences | Enable Portal Access | Yes | Toggle | Employer / HR Admin | Yes | PRESENT & VERIFIED | demodata |
| Staff Portal | Preferences | Banner Message - Enter Banner Message | No | Text | Employer / HR Admin | No | PRESENT & VERIFIED | demodata |
| Staff Portal | Preferences | Banner Message - Display Till Date | No | Date | Employer / HR Admin | No | PRESENT & VERIFIED | demodata |
| Staff Portal | Preferences | Portal Contact Information | Yes | Text / Contact Card | Employer / HR Admin | Yes | PRESENT & VERIFIED | demodata |
| Staff Portal | Preferences | Document Management - Show documents in employee portal | No | Checkbox | Employer / HR Admin | No | PRESENT & VERIFIED | demodata |
| Staff Portal | Preferences | Document Management - Show Salary Revision Letter in portal | No | Checkbox | Employer / HR Admin | No | PRESENT & VERIFIED | demodata |
