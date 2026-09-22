"""Canonical contractor master-file schema.

The single source of truth for the columns of the CLRA master file the contractor
downloads and uploads. Mirrors the audited workbook
``Requirements/ContractorMasterSheet_Audit (28).xlsx`` (214 columns).

Each column is given a canonical ``key`` (lowerCamelCase) that the parser stores
the cell under and that register templates map against. A handful of columns keep
short legacy keys (``name``, ``bssId``, ``doj`` …) so existing register mappings
and calculation rules continue to resolve.
"""

import re

# The 214 master-file columns, in sheet order (index 137 is a blank spacer column).
MASTER_COLUMNS = [
    "Employee_Code", "Employee_Name", "Gender", "Father_Name",
    "Date_of_Birth", "Age", "Date_Of_Joining", "Date_Of_Leaving",
    "Designation", "Department", "Shift", "Branch_Address",
    "Address", "Location", "State", "Month",
    "Account_No", "Bank_Name", "Name_of_contractor", "Address_of_contractor",
    "Nature_ofWork_contractor", "Tenure_of_Employement", "Bank_transaction_ID", "UAN_No",
    "ESIC_No", "Name_of_Dispensary", "Wage_Paid", "Month_end_to",
    "Month_Starts_From", "NO_ofunit_Per_Piece", "Total_Days_Worked", "Interval_From",
    "Interval_To", "Payment_Mode", "Festival", "Absent_Days",
    "Weekoff", "Arrears_Days", "Total_workhours", "Work_Hours_from",
    "Work_Hours_to", "Loss_of_pay_LOP", "Fixed_Basic_Wages", "House_rent_Allowance",
    "Dearness_Allowance", "Special_Allowance", "Statutory_Bonus", "Medical",
    "Other_allowance", "Fixed_Gross", "Earned_Basic_Wages", "Arrear_of_Basic_Wages",
    "Earned_Dearness_Allowance", "Arrear_of_Dearness_Allowance", "Earned_House_Rent_Allowance", "Arrear_of_House_rent_Allowance",
    "Earned_Special_Allowance", "Arr_of_Special_Allowance", "Overtime_Allowance", "Other_Allowances",
    "EarnedCity_Compensation_Allowance", "Meal_Payouts", "Earned_Gratuity", "Gross_Wages",
    "PF_Deductions", "Arrear_of_PF", "VPF_Deduction", "Arr_VPF",
    "ESIC_Deductions", "Arrear_of_ESIC", "PT_Deductions", "Lwf_Deductions",
    "TDS_Deductions", "Medical_Deduction", "Society", "Insurance",
    "Fine_Deduction", "Overtime_deduction", "Salary_Advance", "Other_Deduction",
    "Total_Deductions", "Recoveries", "Net_Salary", "Recovery_Type",
    "Particulars", "Date_of_Damage", "Recovery_Amount", "Show_Cause_Issued",
    "Explanation_Heard_By", "Installments_Count", "First_Month_Year", "Last_Month_Year",
    "Recovery_Complete_Date", "Date", "Time", "Place",
    "Accident_Cause", "Injury_Nature", "Injured_Person_Activity", "Notice_Given_Name",
    "Witness_Name", "Witness_Address", "Witness_Occupation", "Injured_Return_Date",
    "Injured_Absent_Days", "Fine_Offence_Nature", "Fine_Offence_Date", "Fine_Show_Cause_Date",
    "Fine_Realised_Date", "Fine_Amount", "Fine_heardBY", "Deduction_Amount",
    "Loss_Caused", "Deduction_Show_Cause_Date", "Deduction_Date", "Deduction_Installments",
    "Deduction_Realised_Date", "Overtime_from", "Overtime_To", "Overtime_Date",
    "Overtime_Extent", "Overtime_Total", "Normal_Hours", "Normal_Rate",
    "Overtime_Rate", "Normal_Earnings", "Overtime_Earnings", "Total_Earnings",
    "Overtime_Payment_Date", "Advance_Amount", "Advance_Date", "Advance_Purpose",
    "Advance_Installments", "Advance_Postponements", "Advance_Repaid_Date", "Advance_Repaid_Amount",
    "", "Day1", "Day2", "Day3",
    "Day4", "Day5", "Day6", "Day7",
    "Day8", "Day9", "Day10", "Day11",
    "Day12", "Day13", "Day14", "Day15",
    "Day16", "Day17", "Day18", "Day19",
    "Day20", "Day21", "Day22", "Day23",
    "Day24", "Day25", "Day26", "Day27",
    "Day28", "Day29", "Day30", "Day31",
    "Date_of_Application", "Leave_starts_From", "TO_Leave", "Annual_Leave",
    "Paternity_Leave", "Sick_Leaves", "Casual_Leaves", "Privilieged_Leaves",
    "if_Leave_Refuses", "Reason_LeaveRefuses", "Previous_Balance_Leave", "Credit_Leave",
    "Earned_Leave", "Nature_of_Leave", "Total_Leave", "Balance_Leave",
    "Maternity", "Maternity_Leave_Type", "Maternity_From", "Maternity_To",
    "Date_Women_notice_Under_Sec6", "Date_of_Discharge", "Date_proofof_pregnancy", "Birth_date_of_child",
    "Date_of_Miscarriage", "Date_of_illness", "Date_and_Amount_inadvance_Delievery", "Date_and_Amount_for_maternity_Beneift",
    "Amount_ifpaid_section8", "Amountof_wages_Paid_section9", "Amountof_wages_Paidleave_section10", "Nominated_person",
    "Women_dies_Date_and_beneift_person", "if_mother_dies_child_survive_beneift", "Deduction_Incentive", "Holiday_List",
    "Holiday_Day", "Holiday_Date", "Earned_Statutory_Bonus", "Earned_Medical",
    "Name_of_Employer", "SiteCode", "ComplianceCategory", "Years",
    "Insurance_No", "Payment_Date",
]

# Column header -> canonical key where the auto-slug is not what the app uses.
MASTER_KEY_OVERRIDES = {
    "Employee_Code": "bssId",
    "Employee_Name": "name",
    "Gender": "gender",
    "Father_Name": "fatherName",
    "Date_of_Birth": "dob",
    "Date_Of_Joining": "doj",
    "Date_Of_Leaving": "dol",
    "Designation": "designation",
    "Department": "department",
    "SiteCode": "site",
    "Location": "location",
    "State": "state",
    "Name_of_Employer": "employer",
    "UAN_No": "uan",
    "ESIC_No": "esic",
    "Total_Days_Worked": "daysWorked",
    "Normal_Rate": "dailyRate",
    "Fixed_Basic_Wages": "basicWages",
    "Gross_Wages": "grossWages",
    "Total_Deductions": "totalDeductions",
    "Net_Salary": "netSalary",
    "Overtime_Extent": "otHours",
    "Overtime_Rate": "otRate",
    "Overtime_Earnings": "otEarnings",
}


def _slug_key(header):
    """lowerCamelCase a header: split on non-alphanumerics, lower the first word."""
    text = re.sub(r"[^0-9A-Za-z]+", " ", str(header or "")).strip()
    if not text:
        return ""
    words = text.split()
    return words[0].lower() + "".join(w[:1].upper() + w[1:].lower() for w in words[1:])


MASTER_HEADER_KEYS = {
    header: MASTER_KEY_OVERRIDES.get(header, _slug_key(header))
    for header in MASTER_COLUMNS
    if header
}

MASTER_FIELD_KEYS = sorted({key for key in MASTER_HEADER_KEYS.values() if key})

# Values resolved from the backend context at render time (not from the uploaded
# master file). A mapping targets one of these as "backend:<key>".
BACKEND_FIELDS = [
    ("contractor", "Contractor name"),
    ("employer", "Principal employer"),
    ("site", "Site name"),
    ("siteCode", "Site code"),
    ("state", "State"),
    ("month", "Month"),
    ("year", "Year"),
    ("financialYear", "Financial year"),
    ("recordCount", "Record count"),
    ("generatedOn", "Generated on"),
]

BACKEND_FIELD_KEYS = [key for key, _label in BACKEND_FIELDS]

__all__ = ["MASTER_COLUMNS", "MASTER_HEADER_KEYS", "MASTER_FIELD_KEYS",
           "BACKEND_FIELDS", "BACKEND_FIELD_KEYS"]
