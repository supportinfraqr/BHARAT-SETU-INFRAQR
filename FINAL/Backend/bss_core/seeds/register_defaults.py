# -*- coding: utf-8 -*-
# GENERATED CODE — do not edit by hand.
#
# Canonical default CLRA register library. Produced by
# `python manage.py dump_register_defaults`; restored by
# `python manage.py seed_register_config --reset`.
# Every row is keyed by (state, purpose, form_code) and the restore
# reproduces the identical library (templates + field mappings +
# calculation rules) on any environment, every run.

TEMPLATES = [
    {
        'state': 'Andhra Pradesh',
'purpose': 'Deductions for Damage or Loss',
'form_code': 'FORM XX',
'title': 'Register of Deductions for Damage or Loss',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Deductions for Damage or Loss FORM XX</h1>\n<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[See rule 78 (1)(a)(ii)]</h2>\n<p style="margin:4px 0;font-size:12px;"><b>1. Name and Address of Contractor:</b> {{CONTRACTOR_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>2. Name and Address of establishment in/under which:</b> {{EMPLOYER_NAME}}</p>\n<p>contract is carried on.</p>\n<p style="margin:4px 0;font-size:12px;"><b>3. Nature and location of work:</b> {{SITE_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>4. Name and address of Principal Employer:</b> {{EMPLOYER_NAME}}</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>There is no deduction for damage or Loss during the month of {{MONTH}} {{YEAR}}</p>\n<p>\\</p>\n</body></html>',
'columns': [
            'SI No.',
'Name of workmen',
"Father's/Husband's name",
'Designation',
'Particulars of damage or loss',
'Date of damage or loss',
'Whether workman showed cause against deduction',
"Name of person in whose presence employee's was heard",
'Amount of deduction imposed',
'No. of instalments',
'First Instalments',
'Last Instalments',
'Remarks'
        ],
'field_mappings': {
            'SI No.': 'sl',
'Name of workmen': 'Employee_Name',
"Father's/Husband's name": 'Father_Name',
'Designation': 'Designation',
'Particulars of damage or loss': 'Loss_Caused',
'Date of damage or loss': 'Date_of_Damage',
'Amount of deduction imposed': 'Deduction_Amount',
'No. of instalments': 'Deduction_Installments',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Andhra Pradesh',
'purpose': 'MusterRoll',
'form_code': 'FORM XVI',
'title': 'Muster Roll cum Wage Register',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">See Rule 78(1)(a)(i FORM XVI</h1>\n<p>Muster Roll</p>\n<p>Name and address of Contractor</p>\n<p>Name and address of establishment in/under which contract is carried on</p>\n<p>Nature and location of work</p>\n<p>Name and address of Principal Employer</p>\n<p>For the month of</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>1…… 31</p>\n</body></html>',
'columns': [
            'Sl. No.',
'Name of workmen',
'Father’s/Husband’s name',
'Sex',
'Dates',
'Remarks'
        ],
'field_mappings': {
            'Father’s/Husband’s name': 'Father_Name',
'Name of workmen': 'Employee_Name',
'Sl. No.': 'sl',
'Sex': 'Gender',
'Dates': 'Date_Of_Joining',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Andhra Pradesh',
'purpose': 'Register of Advances',
'form_code': 'FORM XXII',
'title': 'Register of Advances',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Advances FORM XXII</h1>\n<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[See rule 78 (1)(a)(ii)]</h2>\n<p style="margin:4px 0;font-size:12px;"><b>1. Name and Address of Contractor:</b> {{CONTRACTOR_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>2. Name and Address of establishment in/under which:</b> {{EMPLOYER_NAME}}</p>\n<p>contract is carried on.</p>\n<p style="margin:4px 0;font-size:12px;"><b>3. Nature and location of work:</b> {{SITE_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>4. Name and address of Principal Employer:</b> {{EMPLOYER_NAME}}</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>No Advance is given during the month of {{MONTH}} {{YEAR}}</p>\n</body></html>',
'columns': [
            'SI No.',
'Name of workmen',
"Father's/Husband's name",
'Nature of employment/Designation',
'Wage period and wages payable',
'Date and amount of advance given',
'Purpose(s) for which advance made',
'No. of instalments by which advance to be repaid',
'Date and amount of each instalments repaid',
'Date on which last instalments was repaid',
'Remarks'
        ],
'field_mappings': {
            'SI No.': 'sl',
'Name of workmen': 'Employee_Name',
"Father's/Husband's name": 'Father_Name',
'Nature of employment/Designation': 'Designation',
'Date and amount of advance given': 'Advance_Amount',
'Purpose(s) for which advance made': 'Advance_Purpose',
'No. of instalments by which advance to be repaid': 'Advance_Installments',
'Date and amount of each instalments repaid': 'Advance_Repaid_Amount',
'Date on which last instalments was repaid': 'Advance_Repaid_Date',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Andhra Pradesh',
'purpose': 'Register of Fines',
'form_code': 'FORM XXI',
'title': 'Register of Fines',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Fines FORM XXI</h1>\n<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[See rule 78 (1)(a)(ii)]</h2>\n<p style="margin:4px 0;font-size:12px;"><b>1. Name and Address of Contractor:</b> {{CONTRACTOR_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>2. Name and Address of establishment in/under which:</b> {{EMPLOYER_NAME}}</p>\n<p>contract is carried on.</p>\n<p style="margin:4px 0;font-size:12px;"><b>3. Nature and location of work:</b> {{SITE_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>4. Name and address of Principal Employer:</b> {{EMPLOYER_NAME}}</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>No fine imposed during the month of {{MONTH}} {{YEAR}}</p>\n</body></html>',
'columns': [
            'SI No.',
'Name of workmen',
"Father's/Husband's name",
'Designation/nature for fine imposed',
'Act/Ommission for which imposed',
'Date of Offence',
'Whether workman showed cause against fine',
"Name of person in whose presence employee's was heard",
'Wage periods and wages payable',
'Amount of fine imposed',
'Date on which fine realised',
'Remarks'
        ],
'field_mappings': {
            'SI No.': 'sl',
'Name of workmen': 'Employee_Name',
"Father's/Husband's name": 'Father_Name',
'Act/Ommission for which imposed': 'Fine_Offence_Nature',
'Date of Offence': 'Fine_Offence_Date',
'Amount of fine imposed': 'Fine_Amount',
'Date on which fine realised': 'Fine_Realised_Date',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Andhra Pradesh',
'purpose': 'Register of Overtime',
'form_code': 'FORM XXIII',
'title': 'Register of Overtime',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Overtime FORM XXIII</h1>\n<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[See rule 78 (1)(a)(iii)]</h2>\n<p style="margin:4px 0;font-size:12px;"><b>1. Name and Address of Contractor:</b> {{CONTRACTOR_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>2. Name and Address of establishment in/under which:</b> {{EMPLOYER_NAME}}</p>\n<p>contract is carried on.</p>\n<p style="margin:4px 0;font-size:12px;"><b>3. Nature and location of work:</b> {{SITE_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>4. Name and address of Principal Employer:</b> {{EMPLOYER_NAME}}</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>No overtime work is done during the month of {{MONTH}} {{YEAR}}</p>\n</body></html>',
'columns': [
            'SI No.',
'Name of workman',
"Father's/Husband's name",
'Sex',
'Designation/nature of employment',
'Date on which overtime worked',
'Total overtime worked',
'Normal rate of wages',
'Overtime rate of wages',
'Overtime earnings',
'Date on which overtime wages paid',
'Remarks'
        ],
'field_mappings': {
            'SI No.': 'sl',
'Name of workman': 'Employee_Name',
"Father's/Husband's name": 'Father_Name',
'Sex': 'Gender',
'Designation/nature of employment': 'Designation',
'Date on which overtime worked': 'Overtime_Date',
'Total overtime worked': 'Overtime_Extent',
'Normal rate of wages': 'Normal_Rate',
'Overtime rate of wages': 'Overtime_Rate',
'Overtime earnings': 'Overtime_Earnings',
'Date on which overtime wages paid': 'Overtime_Payment_Date',
'Remarks': 'Remarks'
        },
'calculation_rules': [
            {
                'target': 'otEarnings',
'label': 'Overtime wages',
'formula': 'otHours * otRate'
            }
        ]
    },
{
        'state': 'Andhra Pradesh',
'purpose': 'Register of Workmen',
'form_code': 'FORM XIII',
'title': 'Register of Workmen',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  p.formtitle { text-align: center; font-weight: bold; font-size: 15px; margin-bottom: 2px; }\n  p.rule { text-align: center; font-size: 11px; color: #333; margin-bottom: 8px; }\n  p.title { text-align: center; font-weight: bold; font-size: 15px; margin-bottom: 12px; }\n  p.lead { font-weight: 600; margin-top: 8px; }\n  .gap { height: 10px; }\n  .field { display: flex; gap: 8px; align-items: baseline; margin: 6px 0; font-size: 13px; }\n  .field .label { flex: none; }\n  .field .fill { flex: 1; border-bottom: 1px solid #000; min-height: 1.2em; display: inline-block; }\n  .field .value b { font-weight: 600; }\n  .sign { margin-top: 18px; text-align: right; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <p class="formtitle">FORM XIII</p>\n<p class="title">[ See Rule 75 ]</p>\n<p class="lead">Register of Workmen Employed by Contractor</p>\n<p>Name and address of Contractor …………………………………………………………………………………………....................................................................................</p>\n<p>………………………………………………………………………………………………………………………………………………………………………………………………………………………………</p>\n<p>Nature and location of work ………………………………………………………………………………………………………………………………………………………………………………..</p>\n<p>Name and address of establishment in/under which contract is carried on …………………………………………………………………………………………………………</p>\n<p>……………………………………………………………………………………………………………………………………………………………………………………………………………………………… Name and address of Principal Employer ……………………………………………………………………………………………………………………………………………………………..</p>\n<p>……………………………………………………………………………………………………………………………………………………………………………………………………………………………..</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<div class="gap"></div>\n</body></html>',
'columns': [
            'SI. No.',
'Name and surname of workmen',
'Age and Sex',
'Father’s/ Husband’s name',
'Nature of Employment/ Designation',
'Permanent house a ddress of workman (Village and t e hsil/ t aluk and d istrict)',
'Local Address',
'Date of commencement of employment',
'Signature or thumb impression of workman`',
'Date of termination of employment',
'Reason for termination',
'Remarks'
        ],
'field_mappings': {
            'Permanent house a ddress of workman (Village and t e hsil/ t aluk and d istrict)': 'Address',
'Date of termination of employment': 'Date_Of_Leaving',
'SI. No.': 'sl',
'Name and surname of workmen': 'Employee_Name',
'Age and Sex': 'Gender',
'Father’s/ Husband’s name': 'Father_Name',
'Local Address': 'Address',
'Date of commencement of employment': 'Date_Of_Joining',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Andhra Pradesh',
'purpose': 'Wage Register',
'form_code': 'FORM XVII',
'title': 'Wage Register',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">See Rule 78(I)(a)(i)] FORM XVII</h1>\n<p>Register of Wages</p>\n<p>Name and address of the Contractor</p>\n<p>Name and address of Establishment in/under which contract is carried on</p>\n<p>Name and location of work</p>\n<p>Name and address of Principal Employer</p>\n<p>Wage Period: Monthly</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>Basic wages Dearness Allowance Overtime Other cash payments (Nature of payments to be indicated) Total</p>\n<p>Wage Period: Monthly ………………………………………………………………………………………………………………………………………………………………………………………....</p>\n</body></html>',
'columns': [
            'Sl. No.',
'Name of workmen',
'Sl. No. in the register of workmen',
'Designation/ Nature of employment',
'No. of days worked',
'Unit of work done',
'Daily-rate of wages/piece-rate',
'Amount of wages earned',
'Deductions if any (indicate nature)',
'Net amount paid',
'Signature/Thumb impression of workmen',
'Initial of contractor or his representative'
        ],
'field_mappings': {
            'Unit of work done': 'NO_ofunit_Per_Piece',
'Sl. No.': 'sl',
'Name of workmen': 'Employee_Name',
'Sl. No. in the register of workmen': 'sl',
'Designation/ Nature of employment': 'Designation',
'No. of days worked': 'Total_Days_Worked',
'Daily-rate of wages/piece-rate': 'Normal_Rate',
'Amount of wages earned': 'Gross_Wages',
'Deductions if any (indicate nature)': 'Total_Deductions',
'Net amount paid': 'Net_Salary'
        },
'calculation_rules': [
            {
                'target': 'grossWages',
'label': 'Gross wages',
'formula': 'daysWorked * dailyRate'
            },
{
                'target': 'netSalary',
'label': 'Net amount paid',
'formula': 'grossWages - totalDeductions'
            }
        ]
    },
{
        'state': 'Arunachal Pradesh',
'purpose': 'Deductions for Damage or Loss',
'form_code': 'FORM XX',
'title': 'Register of Deductions for Damage or Loss',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Deductions for Damage or Loss FORM XX</h1>\n<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[See rule 78 (1)(a)(ii)]</h2>\n<p style="margin:4px 0;font-size:12px;"><b>1. Name and Address of Contractor:</b> {{CONTRACTOR_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>2. Name and Address of establishment in/under which:</b> {{EMPLOYER_NAME}}</p>\n<p>contract is carried on.</p>\n<p style="margin:4px 0;font-size:12px;"><b>3. Nature and location of work:</b> {{SITE_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>4. Name and address of Principal Employer:</b> {{EMPLOYER_NAME}}</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>There is no deduction for damage or Loss during the month of {{MONTH}} {{YEAR}}</p>\n<p>\\</p>\n</body></html>',
'columns': [
            'SI No.',
'Name of workmen',
"Father's/Husband's name",
'Designation',
'Particulars of damage or loss',
'Date of damage or loss',
'Whether workman showed cause against deduction',
"Name of person in whose presence employee's was heard",
'Amount of deduction imposed',
'No. of instalments',
'First Instalments',
'Last Instalments',
'Remarks'
        ],
'field_mappings': {
            'SI No.': 'sl',
'Name of workmen': 'Employee_Name',
"Father's/Husband's name": 'Father_Name',
'Designation': 'Designation',
'Particulars of damage or loss': 'Loss_Caused',
'Date of damage or loss': 'Date_of_Damage',
'Amount of deduction imposed': 'Deduction_Amount',
'No. of instalments': 'Deduction_Installments',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Arunachal Pradesh',
'purpose': 'MusterRoll',
'form_code': 'FORM XVI',
'title': 'Muster Roll cum Wage Register',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">See Rule 78(1)(a)(i FORM XVI</h1>\n<p>Muster Roll</p>\n<p>Name and address of Contractor</p>\n<p>Name and address of establishment in/under which contract is carried on</p>\n<p>Nature and location of work</p>\n<p>Name and address of Principal Employer</p>\n<p>For the month of</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>1…… 31</p>\n</body></html>',
'columns': [
            'Sl. No.',
'Name of workmen',
'Father’s/Husband’s name',
'Sex',
'Dates',
'Remarks'
        ],
'field_mappings': {
            'Name of workmen': 'Employee_Name',
'Sl. No.': 'sl',
'Father’s/Husband’s name': 'Father_Name',
'Sex': 'Gender',
'Dates': 'Date_Of_Joining',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Arunachal Pradesh',
'purpose': 'Register of Advances',
'form_code': 'FORM XXII',
'title': 'Register of Advances',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Advances FORM XXII</h1>\n<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[See rule 78 (1)(a)(ii)]</h2>\n<p style="margin:4px 0;font-size:12px;"><b>1. Name and Address of Contractor:</b> {{CONTRACTOR_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>2. Name and Address of establishment in/under which:</b> {{EMPLOYER_NAME}}</p>\n<p>contract is carried on.</p>\n<p style="margin:4px 0;font-size:12px;"><b>3. Nature and location of work:</b> {{SITE_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>4. Name and address of Principal Employer:</b> {{EMPLOYER_NAME}}</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>No Advance is given during the month of {{MONTH}} {{YEAR}}</p>\n</body></html>',
'columns': [
            'SI No.',
'Name of workmen',
"Father's/Husband's name",
'Nature of employment/Designation',
'Wage period and wages payable',
'Date and amount of advance given',
'Purpose(s) for which advance made',
'No. of instalments by which advance to be repaid',
'Date and amount of each instalments repaid',
'Date on which last instalments was repaid',
'Remarks'
        ],
'field_mappings': {
            'No. of instalments by which advance to be repaid': 'Advance_Installments',
'SI No.': 'sl',
'Name of workmen': 'Employee_Name',
"Father's/Husband's name": 'Father_Name',
'Nature of employment/Designation': 'Designation',
'Date and amount of advance given': 'Advance_Amount',
'Purpose(s) for which advance made': 'Advance_Purpose',
'Date and amount of each instalments repaid': 'Advance_Repaid_Amount',
'Date on which last instalments was repaid': 'Advance_Repaid_Date',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Arunachal Pradesh',
'purpose': 'Register of Fines',
'form_code': 'FORM XXI',
'title': 'Register of Fines',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Fines FORM XXI</h1>\n<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[See rule 78 (1)(a)(ii)]</h2>\n<p style="margin:4px 0;font-size:12px;"><b>1. Name and Address of Contractor:</b> {{CONTRACTOR_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>2. Name and Address of establishment in/under which:</b> {{EMPLOYER_NAME}}</p>\n<p>contract is carried on.</p>\n<p style="margin:4px 0;font-size:12px;"><b>3. Nature and location of work:</b> {{SITE_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>4. Name and address of Principal Employer:</b> {{EMPLOYER_NAME}}</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>No fine imposed during the month of {{MONTH}} {{YEAR}}</p>\n</body></html>',
'columns': [
            'SI No.',
'Name of workmen',
"Father's/Husband's name",
'Designation/nature for fine imposed',
'Act/Ommission for which imposed',
'Date of Offence',
'Whether workman showed cause against fine',
"Name of person in whose presence employee's was heard",
'Wage periods and wages payable',
'Amount of fine imposed',
'Date on which fine realised',
'Remarks'
        ],
'field_mappings': {
            'SI No.': 'sl',
'Name of workmen': 'Employee_Name',
"Father's/Husband's name": 'Father_Name',
'Act/Ommission for which imposed': 'Fine_Offence_Nature',
'Date of Offence': 'Fine_Offence_Date',
'Amount of fine imposed': 'Fine_Amount',
'Date on which fine realised': 'Fine_Realised_Date',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Arunachal Pradesh',
'purpose': 'Register of Overtime',
'form_code': 'FORM XXIII',
'title': 'Register of Overtime',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Overtime FORM XXIII</h1>\n<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[See rule 78 (1)(a)(iii)]</h2>\n<p style="margin:4px 0;font-size:12px;"><b>1. Name and Address of Contractor:</b> {{CONTRACTOR_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>2. Name and Address of establishment in/under which:</b> {{EMPLOYER_NAME}}</p>\n<p>contract is carried on.</p>\n<p style="margin:4px 0;font-size:12px;"><b>3. Nature and location of work:</b> {{SITE_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>4. Name and address of Principal Employer:</b> {{EMPLOYER_NAME}}</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>No overtime work is done during the month of {{MONTH}} {{YEAR}}</p>\n</body></html>',
'columns': [
            'SI No.',
'Name of workman',
"Father's/Husband's name",
'Sex',
'Designation/nature of employment',
'Date on which overtime worked',
'Total overtime worked',
'Normal rate of wages',
'Overtime rate of wages',
'Overtime earnings',
'Date on which overtime wages paid',
'Remarks'
        ],
'field_mappings': {
            'Date on which overtime wages paid': 'Overtime_Payment_Date',
'SI No.': 'sl',
'Name of workman': 'Employee_Name',
"Father's/Husband's name": 'Father_Name',
'Sex': 'Gender',
'Designation/nature of employment': 'Designation',
'Date on which overtime worked': 'Overtime_Date',
'Total overtime worked': 'Overtime_Extent',
'Normal rate of wages': 'Normal_Rate',
'Overtime rate of wages': 'Overtime_Rate',
'Overtime earnings': 'Overtime_Earnings',
'Remarks': 'Remarks'
        },
'calculation_rules': [
            {
                'target': 'otEarnings',
'label': 'Overtime wages',
'formula': 'otHours * otRate'
            }
        ]
    },
{
        'state': 'Arunachal Pradesh',
'purpose': 'Register of Workmen',
'form_code': 'FORM XIII',
'title': 'Register of Workmen',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  p.formtitle { text-align: center; font-weight: bold; font-size: 15px; margin-bottom: 2px; }\n  p.rule { text-align: center; font-size: 11px; color: #333; margin-bottom: 8px; }\n  p.title { text-align: center; font-weight: bold; font-size: 15px; margin-bottom: 12px; }\n  p.lead { font-weight: 600; margin-top: 8px; }\n  .gap { height: 10px; }\n  .field { display: flex; gap: 8px; align-items: baseline; margin: 6px 0; font-size: 13px; }\n  .field .label { flex: none; }\n  .field .fill { flex: 1; border-bottom: 1px solid #000; min-height: 1.2em; display: inline-block; }\n  .field .value b { font-weight: 600; }\n  .sign { margin-top: 18px; text-align: right; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <p class="formtitle">FORM XIII</p>\n<p class="title">[ See Rule 75 ]</p>\n<p class="lead">Register of Workmen Employed by Contractor</p>\n<p>Name and address of Contractor …………………………………………………………………………………………....................................................................................</p>\n<p>………………………………………………………………………………………………………………………………………………………………………………………………………………………………</p>\n<p>Nature and location of work ………………………………………………………………………………………………………………………………………………………………………………..</p>\n<p>Name and address of establishment in/under which contract is carried on …………………………………………………………………………………………………………</p>\n<p>……………………………………………………………………………………………………………………………………………………………………………………………………………………………… Name and address of Principal Employer ……………………………………………………………………………………………………………………………………………………………..</p>\n<p>……………………………………………………………………………………………………………………………………………………………………………………………………………………………..</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<div class="gap"></div>\n</body></html>',
'columns': [
            'SI. No.',
'Name and surname of workmen',
'Age and Sex',
'Father’s/ Husband’s name',
'Nature of Employment/ Designation',
'Permanent house a ddress of workman (Village and t e hsil/ t aluk and d istrict)',
'Local Address',
'Date of commencement of employment',
'Signature or thumb impression of workman`',
'Date of termination of employment',
'Reason for termination',
'Remarks'
        ],
'field_mappings': {
            'Date of termination of employment': 'Date_Of_Leaving',
'SI. No.': 'sl',
'Name and surname of workmen': 'Employee_Name',
'Age and Sex': 'Gender',
'Father’s/ Husband’s name': 'Father_Name',
'Permanent house a ddress of workman (Village and t e hsil/ t aluk and d istrict)': 'Address',
'Local Address': 'Address',
'Date of commencement of employment': 'Date_Of_Joining',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Arunachal Pradesh',
'purpose': 'Wage Register',
'form_code': 'FORM XVII',
'title': 'Wage Register',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">See Rule 78(I)(a)(i)] FORM XVII</h1>\n<p>Register of Wages</p>\n<p>Name and address of the Contractor</p>\n<p>Name and address of Establishment in/under which contract is carried on</p>\n<p>Name and location of work</p>\n<p>Name and address of Principal Employer</p>\n<p>Wage Period: Monthly</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>Basic wages Dearness Allowance Overtime Other cash payments (Nature of payments to be indicated) Total</p>\n<p>Wage Period: Monthly ………………………………………………………………………………………………………………………………………………………………………………………....</p>\n</body></html>',
'columns': [
            'Sl. No.',
'Name of workmen',
'Sl. No. in the register of workmen',
'Designation/ Nature of employment',
'No. of days worked',
'Unit of work done',
'Daily-rate of wages/piece-rate',
'Amount of wages earned',
'Deductions if any (indicate nature)',
'Net amount paid',
'Signature/Thumb impression of workmen',
'Initial of contractor or his representative'
        ],
'field_mappings': {
            'Unit of work done': 'NO_ofunit_Per_Piece',
'Sl. No.': 'sl',
'Name of workmen': 'Employee_Name',
'Sl. No. in the register of workmen': 'sl',
'Designation/ Nature of employment': 'Designation',
'No. of days worked': 'Total_Days_Worked',
'Daily-rate of wages/piece-rate': 'Normal_Rate',
'Amount of wages earned': 'Gross_Wages',
'Deductions if any (indicate nature)': 'Total_Deductions',
'Net amount paid': 'Net_Salary'
        },
'calculation_rules': [
            {
                'target': 'grossWages',
'label': 'Gross wages',
'formula': 'daysWorked * dailyRate'
            },
{
                'target': 'netSalary',
'label': 'Net amount paid',
'formula': 'grossWages - totalDeductions'
            }
        ]
    },
{
        'state': 'Assam',
'purpose': 'Deductions for Damage or Loss',
'form_code': 'FORM XX',
'title': 'Register of Deductions for Damage or Loss',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Deductions for Damage or Loss FORM XX</h1>\n<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[See rule 78 (1)(a)(ii)]</h2>\n<p style="margin:4px 0;font-size:12px;"><b>1. Name and Address of Contractor:</b> {{CONTRACTOR_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>2. Name and Address of establishment in/under which:</b> {{EMPLOYER_NAME}}</p>\n<p>contract is carried on.</p>\n<p style="margin:4px 0;font-size:12px;"><b>3. Nature and location of work:</b> {{SITE_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>4. Name and address of Principal Employer:</b> {{EMPLOYER_NAME}}</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>There is no deduction for damage or Loss during the month of {{MONTH}} {{YEAR}}</p>\n<p>\\</p>\n</body></html>',
'columns': [
            'SI No.',
'Name of workmen',
"Father's/Husband's name",
'Designation',
'Particulars of damage or loss',
'Date of damage or loss',
'Whether workman showed cause against deduction',
"Name of person in whose presence employee's was heard",
'Amount of deduction imposed',
'No. of instalments',
'First Instalments',
'Last Instalments',
'Remarks'
        ],
'field_mappings': {
            'SI No.': 'sl',
'Name of workmen': 'Employee_Name',
"Father's/Husband's name": 'Father_Name',
'Designation': 'Designation',
'Particulars of damage or loss': 'Loss_Caused',
'Date of damage or loss': 'Date_of_Damage',
'Amount of deduction imposed': 'Deduction_Amount',
'No. of instalments': 'Deduction_Installments',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Assam',
'purpose': 'MusterRoll',
'form_code': 'FORM XVI',
'title': 'Muster Roll cum Wage Register',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">See Rule 78(1)(a)(i FORM XVI</h1>\n<p>Muster Roll</p>\n<p>Name and address of Contractor</p>\n<p>Name and address of establishment in/under which contract is carried on</p>\n<p>Nature and location of work</p>\n<p>Name and address of Principal Employer</p>\n<p>For the month of</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>1…… 31</p>\n</body></html>',
'columns': [
            'Sl. No.',
'Name of workmen',
'Father’s/Husband’s name',
'Sex',
'Dates',
'Remarks'
        ],
'field_mappings': {
            'Sl. No.': 'sl',
'Name of workmen': 'Employee_Name',
'Father’s/Husband’s name': 'Father_Name',
'Sex': 'Gender',
'Dates': 'Date_Of_Joining',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Assam',
'purpose': 'Register of Advances',
'form_code': 'FORM XXII',
'title': 'Register of Advances',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Advances FORM XXII</h1>\n<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[See rule 78 (1)(a)(ii)]</h2>\n<p style="margin:4px 0;font-size:12px;"><b>1. Name and Address of Contractor:</b> {{CONTRACTOR_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>2. Name and Address of establishment in/under which:</b> {{EMPLOYER_NAME}}</p>\n<p>contract is carried on.</p>\n<p style="margin:4px 0;font-size:12px;"><b>3. Nature and location of work:</b> {{SITE_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>4. Name and address of Principal Employer:</b> {{EMPLOYER_NAME}}</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>No Advance is given during the month of {{MONTH}} {{YEAR}}</p>\n</body></html>',
'columns': [
            'SI No.',
'Name of workmen',
"Father's/Husband's name",
'Nature of employment/Designation',
'Wage period and wages payable',
'Date and amount of advance given',
'Purpose(s) for which advance made',
'No. of instalments by which advance to be repaid',
'Date and amount of each instalments repaid',
'Date on which last instalments was repaid',
'Remarks'
        ],
'field_mappings': {
            'No. of instalments by which advance to be repaid': 'Advance_Installments',
'SI No.': 'sl',
'Name of workmen': 'Employee_Name',
"Father's/Husband's name": 'Father_Name',
'Nature of employment/Designation': 'Designation',
'Date and amount of advance given': 'Advance_Amount',
'Purpose(s) for which advance made': 'Advance_Purpose',
'Date and amount of each instalments repaid': 'Advance_Repaid_Amount',
'Date on which last instalments was repaid': 'Advance_Repaid_Date',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Assam',
'purpose': 'Register of Fines',
'form_code': 'FORM XXI',
'title': 'Register of Fines',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Fines FORM XXI</h1>\n<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[See rule 78 (1)(a)(ii)]</h2>\n<p style="margin:4px 0;font-size:12px;"><b>1. Name and Address of Contractor:</b> {{CONTRACTOR_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>2. Name and Address of establishment in/under which:</b> {{EMPLOYER_NAME}}</p>\n<p>contract is carried on.</p>\n<p style="margin:4px 0;font-size:12px;"><b>3. Nature and location of work:</b> {{SITE_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>4. Name and address of Principal Employer:</b> {{EMPLOYER_NAME}}</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>No fine imposed during the month of {{MONTH}} {{YEAR}}</p>\n</body></html>',
'columns': [
            'SI No.',
'Name of workmen',
"Father's/Husband's name",
'Designation/nature for fine imposed',
'Act/Ommission for which imposed',
'Date of Offence',
'Whether workman showed cause against fine',
"Name of person in whose presence employee's was heard",
'Wage periods and wages payable',
'Amount of fine imposed',
'Date on which fine realised',
'Remarks'
        ],
'field_mappings': {
            'Date on which fine realised': 'Fine_Realised_Date',
'SI No.': 'sl',
'Name of workmen': 'Employee_Name',
"Father's/Husband's name": 'Father_Name',
'Act/Ommission for which imposed': 'Fine_Offence_Nature',
'Date of Offence': 'Fine_Offence_Date',
'Amount of fine imposed': 'Fine_Amount',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Assam',
'purpose': 'Register of Overtime',
'form_code': 'FORM XXIII',
'title': 'Register of Overtime',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Overtime FORM XXIII</h1>\n<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[See rule 78 (1)(a)(iii)]</h2>\n<p style="margin:4px 0;font-size:12px;"><b>1. Name and Address of Contractor:</b> {{CONTRACTOR_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>2. Name and Address of establishment in/under which:</b> {{EMPLOYER_NAME}}</p>\n<p>contract is carried on.</p>\n<p style="margin:4px 0;font-size:12px;"><b>3. Nature and location of work:</b> {{SITE_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>4. Name and address of Principal Employer:</b> {{EMPLOYER_NAME}}</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>No overtime work is done during the month of {{MONTH}} {{YEAR}}</p>\n</body></html>',
'columns': [
            'SI No.',
'Name of workman',
"Father's/Husband's name",
'Sex',
'Designation/nature of employment',
'Date on which overtime worked',
'Total overtime worked',
'Normal rate of wages',
'Overtime rate of wages',
'Overtime earnings',
'Date on which overtime wages paid',
'Remarks'
        ],
'field_mappings': {
            'Name of workman': 'Employee_Name',
"Father's/Husband's name": 'Father_Name',
'SI No.': 'sl',
'Sex': 'Gender',
'Designation/nature of employment': 'Designation',
'Date on which overtime worked': 'Overtime_Date',
'Total overtime worked': 'Overtime_Extent',
'Normal rate of wages': 'Normal_Rate',
'Overtime rate of wages': 'Overtime_Rate',
'Overtime earnings': 'Overtime_Earnings',
'Date on which overtime wages paid': 'Overtime_Payment_Date',
'Remarks': 'Remarks'
        },
'calculation_rules': [
            {
                'target': 'otEarnings',
'label': 'Overtime wages',
'formula': 'otHours * otRate'
            }
        ]
    },
{
        'state': 'Assam',
'purpose': 'Register of Workmen',
'form_code': 'FORM XIII',
'title': 'Register of Workmen',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  p.formtitle { text-align: center; font-weight: bold; font-size: 15px; margin-bottom: 2px; }\n  p.rule { text-align: center; font-size: 11px; color: #333; margin-bottom: 8px; }\n  p.title { text-align: center; font-weight: bold; font-size: 15px; margin-bottom: 12px; }\n  p.lead { font-weight: 600; margin-top: 8px; }\n  .gap { height: 10px; }\n  .field { display: flex; gap: 8px; align-items: baseline; margin: 6px 0; font-size: 13px; }\n  .field .label { flex: none; }\n  .field .fill { flex: 1; border-bottom: 1px solid #000; min-height: 1.2em; display: inline-block; }\n  .field .value b { font-weight: 600; }\n  .sign { margin-top: 18px; text-align: right; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <p class="formtitle">FORM XIII</p>\n<p class="title">[ See Rule 75 ]</p>\n<p class="lead">Register of Workmen Employed by Contractor</p>\n<p>Name and address of Contractor …………………………………………………………………………………………....................................................................................</p>\n<p>………………………………………………………………………………………………………………………………………………………………………………………………………………………………</p>\n<p>Nature and location of work ………………………………………………………………………………………………………………………………………………………………………………..</p>\n<p>Name and address of establishment in/under which contract is carried on …………………………………………………………………………………………………………</p>\n<p>……………………………………………………………………………………………………………………………………………………………………………………………………………………………… Name and address of Principal Employer ……………………………………………………………………………………………………………………………………………………………..</p>\n<p>……………………………………………………………………………………………………………………………………………………………………………………………………………………………..</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<div class="gap"></div>\n</body></html>',
'columns': [
            'SI. No.',
'Name and surname of workmen',
'Age and Sex',
'Father’s/ Husband’s name',
'Nature of Employment/ Designation',
'Permanent house a ddress of workman (Village and t e hsil/ t aluk and d istrict)',
'Local Address',
'Date of commencement of employment',
'Signature or thumb impression of workman`',
'Date of termination of employment',
'Reason for termination',
'Remarks'
        ],
'field_mappings': {
            'Date of termination of employment': 'Date_Of_Leaving',
'SI. No.': 'sl',
'Name and surname of workmen': 'Employee_Name',
'Age and Sex': 'Gender',
'Father’s/ Husband’s name': 'Father_Name',
'Permanent house a ddress of workman (Village and t e hsil/ t aluk and d istrict)': 'Address',
'Local Address': 'Address',
'Date of commencement of employment': 'Date_Of_Joining',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Assam',
'purpose': 'Wage Register',
'form_code': 'FORM XVII',
'title': 'Wage Register',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">See Rule 78(I)(a)(i)] FORM XVII</h1>\n<p>Register of Wages</p>\n<p>Name and address of the Contractor</p>\n<p>Name and address of Establishment in/under which contract is carried on</p>\n<p>Name and location of work</p>\n<p>Name and address of Principal Employer</p>\n<p>Wage Period: Monthly</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>Basic wages Dearness Allowance Overtime Other cash payments (Nature of payments to be indicated) Total</p>\n<p>Wage Period: Monthly ………………………………………………………………………………………………………………………………………………………………………………………....</p>\n</body></html>',
'columns': [
            'Sl. No.',
'Name of workmen',
'Sl. No. in the register of workmen',
'Designation/ Nature of employment',
'No. of days worked',
'Unit of work done',
'Daily-rate of wages/piece-rate',
'Amount of wages earned',
'Deductions if any (indicate nature)',
'Net amount paid',
'Signature/Thumb impression of workmen',
'Initial of contractor or his representative'
        ],
'field_mappings': {
            'Unit of work done': 'NO_ofunit_Per_Piece',
'Sl. No.': 'sl',
'Name of workmen': 'Employee_Name',
'Sl. No. in the register of workmen': 'sl',
'Designation/ Nature of employment': 'Designation',
'No. of days worked': 'Total_Days_Worked',
'Daily-rate of wages/piece-rate': 'Normal_Rate',
'Amount of wages earned': 'Gross_Wages',
'Deductions if any (indicate nature)': 'Total_Deductions',
'Net amount paid': 'Net_Salary'
        },
'calculation_rules': [
            {
                'target': 'grossWages',
'label': 'Gross wages',
'formula': 'daysWorked * dailyRate'
            },
{
                'target': 'netSalary',
'label': 'Net amount paid',
'formula': 'grossWages - totalDeductions'
            }
        ]
    },
{
        'state': 'Bihar',
'purpose': 'Deductions for Damage or Loss',
'form_code': 'FORM XX',
'title': 'Register of Deductions for Damage or Loss',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Deductions for Damage or Loss FORM XX</h1>\n<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[See rule 78 (1)(a)(ii)]</h2>\n<p style="margin:4px 0;font-size:12px;"><b>1. Name and Address of Contractor:</b> {{CONTRACTOR_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>2. Name and Address of establishment in/under which:</b> {{EMPLOYER_NAME}}</p>\n<p>contract is carried on.</p>\n<p style="margin:4px 0;font-size:12px;"><b>3. Nature and location of work:</b> {{SITE_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>4. Name and address of Principal Employer:</b> {{EMPLOYER_NAME}}</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>There is no deduction for damage or Loss during the month of {{MONTH}} {{YEAR}}</p>\n<p>\\</p>\n</body></html>',
'columns': [
            'SI No.',
'Name of workmen',
"Father's/Husband's name",
'Designation',
'Particulars of damage or loss',
'Date of damage or loss',
'Whether workman showed cause against deduction',
"Name of person in whose presence employee's was heard",
'Amount of deduction imposed',
'No. of instalments',
'First Instalments',
'Last Instalments',
'Remarks'
        ],
'field_mappings': {
            'SI No.': 'sl',
'Name of workmen': 'Employee_Name',
"Father's/Husband's name": 'Father_Name',
'Designation': 'Designation',
'Particulars of damage or loss': 'Loss_Caused',
'Date of damage or loss': 'Date_of_Damage',
'Amount of deduction imposed': 'Deduction_Amount',
'No. of instalments': 'Deduction_Installments',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Bihar',
'purpose': 'MusterRoll',
'form_code': 'FORM XVI',
'title': 'Muster Roll cum Wage Register',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">See Rule 78(1)(a)(i FORM XVI</h1>\n<p>Muster Roll</p>\n<p>Name and address of Contractor</p>\n<p>Name and address of establishment in/under which contract is carried on</p>\n<p>Nature and location of work</p>\n<p>Name and address of Principal Employer</p>\n<p>For the month of</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>1…… 31</p>\n</body></html>',
'columns': [
            'Sl. No.',
'Name of workmen',
'Father’s/Husband’s name',
'Sex',
'Dates',
'Remarks'
        ],
'field_mappings': {
            'Sl. No.': 'sl',
'Name of workmen': 'Employee_Name',
'Father’s/Husband’s name': 'Father_Name',
'Sex': 'Gender',
'Dates': 'Date_Of_Joining',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Bihar',
'purpose': 'Register of Advances',
'form_code': 'FORM XXII',
'title': 'Register of Advances',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Advances FORM XXII</h1>\n<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[See rule 78 (1)(a)(ii)]</h2>\n<p style="margin:4px 0;font-size:12px;"><b>1. Name and Address of Contractor:</b> {{CONTRACTOR_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>2. Name and Address of establishment in/under which:</b> {{EMPLOYER_NAME}}</p>\n<p>contract is carried on.</p>\n<p style="margin:4px 0;font-size:12px;"><b>3. Nature and location of work:</b> {{SITE_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>4. Name and address of Principal Employer:</b> {{EMPLOYER_NAME}}</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>No Advance is given during the month of {{MONTH}} {{YEAR}}</p>\n</body></html>',
'columns': [
            'SI No.',
'Name of workmen',
"Father's/Husband's name",
'Nature of employment/Designation',
'Wage period and wages payable',
'Date and amount of advance given',
'Purpose(s) for which advance made',
'No. of instalments by which advance to be repaid',
'Date and amount of each instalments repaid',
'Date on which last instalments was repaid',
'Remarks'
        ],
'field_mappings': {
            'SI No.': 'sl',
'Name of workmen': 'Employee_Name',
"Father's/Husband's name": 'Father_Name',
'Nature of employment/Designation': 'Designation',
'Date and amount of advance given': 'Advance_Amount',
'Purpose(s) for which advance made': 'Advance_Purpose',
'No. of instalments by which advance to be repaid': 'Advance_Installments',
'Date and amount of each instalments repaid': 'Advance_Repaid_Amount',
'Date on which last instalments was repaid': 'Advance_Repaid_Date',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Bihar',
'purpose': 'Register of Fines',
'form_code': 'FORM XXI',
'title': 'Register of Fines',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Fines FORM XXI</h1>\n<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[See rule 78 (1)(a)(ii)]</h2>\n<p style="margin:4px 0;font-size:12px;"><b>1. Name and Address of Contractor:</b> {{CONTRACTOR_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>2. Name and Address of establishment in/under which:</b> {{EMPLOYER_NAME}}</p>\n<p>contract is carried on.</p>\n<p style="margin:4px 0;font-size:12px;"><b>3. Nature and location of work:</b> {{SITE_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>4. Name and address of Principal Employer:</b> {{EMPLOYER_NAME}}</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>No fine imposed during the month of {{MONTH}} {{YEAR}}</p>\n</body></html>',
'columns': [
            'SI No.',
'Name of workmen',
"Father's/Husband's name",
'Designation/nature for fine imposed',
'Act/Ommission for which imposed',
'Date of Offence',
'Whether workman showed cause against fine',
"Name of person in whose presence employee's was heard",
'Wage periods and wages payable',
'Amount of fine imposed',
'Date on which fine realised',
'Remarks'
        ],
'field_mappings': {
            'SI No.': 'sl',
'Name of workmen': 'Employee_Name',
"Father's/Husband's name": 'Father_Name',
'Act/Ommission for which imposed': 'Fine_Offence_Nature',
'Date of Offence': 'Fine_Offence_Date',
'Amount of fine imposed': 'Fine_Amount',
'Date on which fine realised': 'Fine_Realised_Date',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Bihar',
'purpose': 'Register of Overtime',
'form_code': 'FORM XXIII',
'title': 'Register of Overtime',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Overtime FORM XXIII</h1>\n<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[See rule 78 (1)(a)(iii)]</h2>\n<p style="margin:4px 0;font-size:12px;"><b>1. Name and Address of Contractor:</b> {{CONTRACTOR_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>2. Name and Address of establishment in/under which:</b> {{EMPLOYER_NAME}}</p>\n<p>contract is carried on.</p>\n<p style="margin:4px 0;font-size:12px;"><b>3. Nature and location of work:</b> {{SITE_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>4. Name and address of Principal Employer:</b> {{EMPLOYER_NAME}}</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>No overtime work is done during the month of {{MONTH}} {{YEAR}}</p>\n</body></html>',
'columns': [
            'SI No.',
'Name of workman',
"Father's/Husband's name",
'Sex',
'Designation/nature of employment',
'Date on which overtime worked',
'Total overtime worked',
'Normal rate of wages',
'Overtime rate of wages',
'Overtime earnings',
'Date on which overtime wages paid',
'Remarks'
        ],
'field_mappings': {
            'SI No.': 'sl',
'Name of workman': 'Employee_Name',
"Father's/Husband's name": 'Father_Name',
'Sex': 'Gender',
'Designation/nature of employment': 'Designation',
'Date on which overtime worked': 'Overtime_Date',
'Total overtime worked': 'Overtime_Extent',
'Normal rate of wages': 'Normal_Rate',
'Overtime rate of wages': 'Overtime_Rate',
'Overtime earnings': 'Overtime_Earnings',
'Date on which overtime wages paid': 'Overtime_Payment_Date',
'Remarks': 'Remarks'
        },
'calculation_rules': [
            {
                'target': 'otEarnings',
'label': 'Overtime wages',
'formula': 'otHours * otRate'
            }
        ]
    },
{
        'state': 'Bihar',
'purpose': 'Register of Workmen',
'form_code': 'FORM XIII',
'title': 'Register of Workmen',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  p.formtitle { text-align: center; font-weight: bold; font-size: 15px; margin-bottom: 2px; }\n  p.rule { text-align: center; font-size: 11px; color: #333; margin-bottom: 8px; }\n  p.title { text-align: center; font-weight: bold; font-size: 15px; margin-bottom: 12px; }\n  p.lead { font-weight: 600; margin-top: 8px; }\n  .gap { height: 10px; }\n  .field { display: flex; gap: 8px; align-items: baseline; margin: 6px 0; font-size: 13px; }\n  .field .label { flex: none; }\n  .field .fill { flex: 1; border-bottom: 1px solid #000; min-height: 1.2em; display: inline-block; }\n  .field .value b { font-weight: 600; }\n  .sign { margin-top: 18px; text-align: right; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <p class="formtitle">FORM XIII</p>\n<p class="title">[ See Rule 75 ]</p>\n<p class="lead">Register of Workmen Employed by Contractor</p>\n<p>Name and address of Contractor …………………………………………………………………………………………....................................................................................</p>\n<p>………………………………………………………………………………………………………………………………………………………………………………………………………………………………</p>\n<p>Nature and location of work ………………………………………………………………………………………………………………………………………………………………………………..</p>\n<p>Name and address of establishment in/under which contract is carried on …………………………………………………………………………………………………………</p>\n<p>……………………………………………………………………………………………………………………………………………………………………………………………………………………………… Name and address of Principal Employer ……………………………………………………………………………………………………………………………………………………………..</p>\n<p>……………………………………………………………………………………………………………………………………………………………………………………………………………………………..</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<div class="gap"></div>\n</body></html>',
'columns': [
            'SI. No.',
'Name and surname of workmen',
'Age and Sex',
'Father’s/ Husband’s name',
'Nature of Employment/ Designation',
'Permanent house a ddress of workman (Village and t e hsil/ t aluk and d istrict)',
'Local Address',
'Date of commencement of employment',
'Signature or thumb impression of workman`',
'Date of termination of employment',
'Reason for termination',
'Remarks'
        ],
'field_mappings': {
            'Date of termination of employment': 'Date_Of_Leaving',
'SI. No.': 'sl',
'Name and surname of workmen': 'Employee_Name',
'Age and Sex': 'Gender',
'Father’s/ Husband’s name': 'Father_Name',
'Permanent house a ddress of workman (Village and t e hsil/ t aluk and d istrict)': 'Address',
'Local Address': 'Address',
'Date of commencement of employment': 'Date_Of_Joining',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Bihar',
'purpose': 'Wage Register',
'form_code': 'FORM XVII',
'title': 'Wage Register',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">See Rule 78(I)(a)(i)] FORM XVII</h1>\n<p>Register of Wages</p>\n<p>Name and address of the Contractor</p>\n<p>Name and address of Establishment in/under which contract is carried on</p>\n<p>Name and location of work</p>\n<p>Name and address of Principal Employer</p>\n<p>Wage Period: Monthly</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>Basic wages Dearness Allowance Overtime Other cash payments (Nature of payments to be indicated) Total</p>\n<p>Wage Period: Monthly ………………………………………………………………………………………………………………………………………………………………………………………....</p>\n</body></html>',
'columns': [
            'Sl. No.',
'Name of workmen',
'Sl. No. in the register of workmen',
'Designation/ Nature of employment',
'No. of days worked',
'Unit of work done',
'Daily-rate of wages/piece-rate',
'Amount of wages earned',
'Deductions if any (indicate nature)',
'Net amount paid',
'Signature/Thumb impression of workmen',
'Initial of contractor or his representative'
        ],
'field_mappings': {
            'Unit of work done': 'NO_ofunit_Per_Piece',
'Sl. No.': 'sl',
'Name of workmen': 'Employee_Name',
'Sl. No. in the register of workmen': 'sl',
'Designation/ Nature of employment': 'Designation',
'No. of days worked': 'Total_Days_Worked',
'Daily-rate of wages/piece-rate': 'Normal_Rate',
'Amount of wages earned': 'Gross_Wages',
'Deductions if any (indicate nature)': 'Total_Deductions',
'Net amount paid': 'Net_Salary'
        },
'calculation_rules': [
            {
                'target': 'grossWages',
'label': 'Gross wages',
'formula': 'daysWorked * dailyRate'
            },
{
                'target': 'netSalary',
'label': 'Net amount paid',
'formula': 'grossWages - totalDeductions'
            }
        ]
    },
{
        'state': 'Central',
'purpose': 'Deductions for Damage or Loss',
'form_code': 'FORM XX',
'title': 'Register of Deductions for Damage or Loss',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Deductions for Damage or Loss FORM XX</h1>\n<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[See rule 78 (1)(a)(ii)]</h2>\n<p style="margin:4px 0;font-size:12px;"><b>1. Name and Address of Contractor:</b> {{CONTRACTOR_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>2. Name and Address of establishment in/under which:</b> {{EMPLOYER_NAME}}</p>\n<p>contract is carried on.</p>\n<p style="margin:4px 0;font-size:12px;"><b>3. Nature and location of work:</b> {{SITE_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>4. Name and address of Principal Employer:</b> {{EMPLOYER_NAME}}</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>There is no deduction for damage or Loss during the month of {{MONTH}} {{YEAR}}</p>\n<p>\\</p>\n</body></html>',
'columns': [
            'SI No.',
'Name of workmen',
"Father's/Husband's name",
'Designation',
'Particulars of damage or loss',
'Date of damage or loss',
'Whether workman showed cause against deduction',
"Name of person in whose presence employee's was heard",
'Amount of deduction imposed',
'No. of instalments',
'First Instalments',
'Last Instalments',
'Remarks'
        ],
'field_mappings': {
            'SI No.': 'sl',
'Name of workmen': 'Employee_Name',
"Father's/Husband's name": 'Father_Name',
'Designation': 'Designation',
'Particulars of damage or loss': 'Loss_Caused',
'Date of damage or loss': 'Date_of_Damage',
'Amount of deduction imposed': 'Deduction_Amount',
'No. of instalments': 'Deduction_Installments',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Central',
'purpose': 'MusterRoll',
'form_code': 'FORM XVI',
'title': 'Muster Roll cum Wage Register',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">See Rule 78(1)(a)(i FORM XVI</h1>\n<p>Muster Roll</p>\n<p>Name and address of Contractor</p>\n<p>Name and address of establishment in/under which contract is carried on</p>\n<p>Nature and location of work</p>\n<p>Name and address of Principal Employer</p>\n<p>For the month of</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>1…… 31</p>\n</body></html>',
'columns': [
            'Sl. No.',
'Name of workmen',
'Father’s/Husband’s name',
'Sex',
'Dates',
'Remarks'
        ],
'field_mappings': {
            'Sl. No.': 'sl',
'Name of workmen': 'Employee_Name',
'Father’s/Husband’s name': 'Father_Name',
'Sex': 'Gender',
'Dates': 'Date_Of_Joining',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Central',
'purpose': 'Register of Advances',
'form_code': 'FORM XXII',
'title': 'Register of Advances',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Advances FORM XXII</h1>\n<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">*[See Rule 78(1)(a)(ii)]</h2>\n<p>Name and address of the Contractor</p>\n<p>Name and location of work</p>\n<p>Name and address of Establishment in/under which contract is carried on</p>\n<p>Name and address of Principal Employer</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>* Substituted for the brackets, words, figures and letter “[See Rule 78(2) (d)]” by GSR948 dated 12-7-1978, w.e.f. 22-7-1978.</p>\n</body></html>',
'columns': [
            'Sl. No',
'Name',
'Father’s/Husband’s name',
'Nature of employment/ Designation',
'Wage period and wages payable',
'Date and amount of advance given',
'Purpose (s) for which advance made',
'No. of instalments by which advance to be repaid',
'Date and amount of each instalment repaid',
'Date on which last instalment was repaid',
'Remarks'
        ],
'field_mappings': {
            'Date and amount of each instalment repaid': 'Advance_Repaid_Amount',
'Date on which last instalment was repaid': 'Advance_Repaid_Date',
'Sl. No': 'sl',
'Father’s/Husband’s name': 'Father_Name',
'Date and amount of advance given': 'Advance_Amount',
'No. of instalments by which advance to be repaid': 'Advance_Installments',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Central',
'purpose': 'Register of Fines',
'form_code': 'FORM XXI',
'title': 'Register of Fines',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Fines FORM XXI</h1>\n<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[See rule 78 (1)(a)(ii)]</h2>\n<p style="margin:4px 0;font-size:12px;"><b>1. Name and Address of Contractor:</b> {{CONTRACTOR_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>2. Name and Address of establishment in/under which:</b> {{EMPLOYER_NAME}}</p>\n<p>contract is carried on.</p>\n<p style="margin:4px 0;font-size:12px;"><b>3. Nature and location of work:</b> {{SITE_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>4. Name and address of Principal Employer:</b> {{EMPLOYER_NAME}}</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>No fine imposed during the month of {{MONTH}} {{YEAR}}</p>\n</body></html>',
'columns': [
            'SI No.',
'Name of workmen',
"Father's/Husband's name",
'Designation/nature for fine imposed',
'Act/Ommission for which imposed',
'Date of Offence',
'Whether workman showed cause against fine',
"Name of person in whose presence employee's was heard",
'Wage periods and wages payable',
'Amount of fine imposed',
'Date on which fine realised',
'Remarks'
        ],
'field_mappings': {
            'SI No.': 'sl',
'Name of workmen': 'Employee_Name',
"Father's/Husband's name": 'Father_Name',
'Act/Ommission for which imposed': 'Fine_Offence_Nature',
'Date of Offence': 'Fine_Offence_Date',
'Amount of fine imposed': 'Fine_Amount',
'Date on which fine realised': 'Fine_Realised_Date',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Central',
'purpose': 'Register of Overtime',
'form_code': 'FORM XXIII',
'title': 'Register of Overtime',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Overtime FORM XXIII</h1>\n<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[See rule 78 (1)(a)(iii)]</h2>\n<p style="margin:4px 0;font-size:12px;"><b>1. Name and Address of Contractor:</b> {{CONTRACTOR_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>2. Name and Address of establishment in/under which:</b> {{EMPLOYER_NAME}}</p>\n<p>contract is carried on.</p>\n<p style="margin:4px 0;font-size:12px;"><b>3. Nature and location of work:</b> {{SITE_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>4. Name and address of Principal Employer:</b> {{EMPLOYER_NAME}}</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>No overtime work is done during the month of {{MONTH}} {{YEAR}}</p>\n</body></html>',
'columns': [
            'SI No.',
'Name of workman',
"Father's/Husband's name",
'Sex',
'Designation/nature of employment',
'Date on which overtime worked',
'Total overtime worked',
'Normal rate of wages',
'Overtime rate of wages',
'Overtime earnings',
'Date on which overtime wages paid',
'Remarks'
        ],
'field_mappings': {
            'SI No.': 'sl',
'Name of workman': 'Employee_Name',
"Father's/Husband's name": 'Father_Name',
'Sex': 'Gender',
'Designation/nature of employment': 'Designation',
'Date on which overtime worked': 'Overtime_Date',
'Total overtime worked': 'Overtime_Extent',
'Normal rate of wages': 'Normal_Rate',
'Overtime rate of wages': 'Overtime_Rate',
'Overtime earnings': 'Overtime_Earnings',
'Date on which overtime wages paid': 'Overtime_Payment_Date',
'Remarks': 'Remarks'
        },
'calculation_rules': [
            {
                'target': 'otEarnings',
'label': 'Overtime wages',
'formula': 'otHours * otRate'
            }
        ]
    },
{
        'state': 'Central',
'purpose': 'Register of Workmen',
'form_code': 'FORM XIII',
'title': 'Register of Workmen',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  p.formtitle { text-align: center; font-weight: bold; font-size: 15px; margin-bottom: 2px; }\n  p.rule { text-align: center; font-size: 11px; color: #333; margin-bottom: 8px; }\n  p.title { text-align: center; font-weight: bold; font-size: 15px; margin-bottom: 12px; }\n  p.lead { font-weight: 600; margin-top: 8px; }\n  .gap { height: 10px; }\n  .field { display: flex; gap: 8px; align-items: baseline; margin: 6px 0; font-size: 13px; }\n  .field .label { flex: none; }\n  .field .fill { flex: 1; border-bottom: 1px solid #000; min-height: 1.2em; display: inline-block; }\n  .field .value b { font-weight: 600; }\n  .sign { margin-top: 18px; text-align: right; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <p class="formtitle">FORM XIII</p>\n<p class="title">[ See Rule 75 ]</p>\n<p class="lead">Register of Workmen Employed by Contractor</p>\n<p>Name and address of Contractor …………………………………………………………………………………………....................................................................................</p>\n<p>………………………………………………………………………………………………………………………………………………………………………………………………………………………………</p>\n<p>Nature and location of work ………………………………………………………………………………………………………………………………………………………………………………..</p>\n<p>Name and address of establishment in/under which contract is carried on …………………………………………………………………………………………………………</p>\n<p>……………………………………………………………………………………………………………………………………………………………………………………………………………………………… Name and address of Principal Employer ……………………………………………………………………………………………………………………………………………………………..</p>\n<p>……………………………………………………………………………………………………………………………………………………………………………………………………………………………..</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<div class="gap"></div>\n</body></html>',
'columns': [
            'SI. No.',
'Name and surname of workmen',
'Age and Sex',
'Father’s/ Husband’s name',
'Nature of Employment/ Designation',
'Permanent house a ddress of workman (Village and t e hsil/ t aluk and d istrict)',
'Local Address',
'Date of commencement of employment',
'Signature or thumb impression of workman`',
'Date of termination of employment',
'Reason for termination',
'Remarks'
        ],
'field_mappings': {
            'Permanent house a ddress of workman (Village and t e hsil/ t aluk and d istrict)': 'Address',
'Date of commencement of employment': 'Date_Of_Joining',
'Date of termination of employment': 'Date_Of_Leaving',
'SI. No.': 'sl',
'Name and surname of workmen': 'Employee_Name',
'Age and Sex': 'Gender',
'Father’s/ Husband’s name': 'Father_Name',
'Local Address': 'Address',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Central',
'purpose': 'Wage Register',
'form_code': 'FORM XVII',
'title': 'Wage Register',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">See Rule 78(I)(a)(i)] FORM XVII</h1>\n<p>Register of Wages</p>\n<p>Name and address of the Contractor</p>\n<p>Name and address of Establishment in/under which contract is carried on</p>\n<p>Name and location of work</p>\n<p>Name and address of Principal Employer</p>\n<p>Wage Period: Monthly</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>Basic wages Dearness Allowance Overtime Other cash payments (Nature of payments to be indicated) Total</p>\n<p>Wage Period: Monthly ………………………………………………………………………………………………………………………………………………………………………………………....</p>\n</body></html>',
'columns': [
            'Sl. No.',
'Name of workmen',
'Sl. No. in the register of workmen',
'Designation/ Nature of employment',
'No. of days worked',
'Unit of work done',
'Daily-rate of wages/piece-rate',
'Amount of wages earned',
'Deductions if any (indicate nature)',
'Net amount paid',
'Signature/Thumb impression of workmen',
'Initial of contractor or his representative'
        ],
'field_mappings': {
            'Unit of work done': 'NO_ofunit_Per_Piece',
'Sl. No.': 'sl',
'Name of workmen': 'Employee_Name',
'Sl. No. in the register of workmen': 'sl',
'Designation/ Nature of employment': 'Designation',
'No. of days worked': 'Total_Days_Worked',
'Daily-rate of wages/piece-rate': 'Normal_Rate',
'Amount of wages earned': 'Gross_Wages',
'Deductions if any (indicate nature)': 'Total_Deductions',
'Net amount paid': 'Net_Salary'
        },
'calculation_rules': [
            {
                'target': 'grossWages',
'label': 'Gross wages',
'formula': 'daysWorked * dailyRate'
            },
{
                'target': 'netSalary',
'label': 'Net amount paid',
'formula': 'grossWages - totalDeductions'
            }
        ]
    },
{
        'state': 'Chandigarh',
'purpose': 'Deductions for Damage or Loss',
'form_code': 'FORM XX',
'title': 'Register of Deductions for Damage or Loss',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Deductions for Damage or Loss FORM XX</h1>\n<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[See rule 78 (1)(a)(ii)]</h2>\n<p style="margin:4px 0;font-size:12px;"><b>1. Name and Address of Contractor:</b> {{CONTRACTOR_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>2. Name and Address of establishment in/under which:</b> {{EMPLOYER_NAME}}</p>\n<p>contract is carried on.</p>\n<p style="margin:4px 0;font-size:12px;"><b>3. Nature and location of work:</b> {{SITE_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>4. Name and address of Principal Employer:</b> {{EMPLOYER_NAME}}</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>There is no deduction for damage or Loss during the month of {{MONTH}} {{YEAR}}</p>\n<p>\\</p>\n</body></html>',
'columns': [
            'SI No.',
'Name of workmen',
"Father's/Husband's name",
'Designation',
'Particulars of damage or loss',
'Date of damage or loss',
'Whether workman showed cause against deduction',
"Name of person in whose presence employee's was heard",
'Amount of deduction imposed',
'No. of instalments',
'First Instalments',
'Last Instalments',
'Remarks'
        ],
'field_mappings': {
            'SI No.': 'sl',
'Name of workmen': 'Employee_Name',
"Father's/Husband's name": 'Father_Name',
'Designation': 'Designation',
'Particulars of damage or loss': 'Loss_Caused',
'Date of damage or loss': 'Date_of_Damage',
'Amount of deduction imposed': 'Deduction_Amount',
'No. of instalments': 'Deduction_Installments',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Chandigarh',
'purpose': 'MusterRoll',
'form_code': 'FORM XVI',
'title': 'Muster Roll cum Wage Register',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">See Rule 78(1)(a)(i FORM XVI</h1>\n<p>Muster Roll</p>\n<p>Name and address of Contractor</p>\n<p>Name and address of establishment in/under which contract is carried on</p>\n<p>Nature and location of work</p>\n<p>Name and address of Principal Employer</p>\n<p>For the month of</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>1…… 31</p>\n</body></html>',
'columns': [
            'Sl. No.',
'Name of workmen',
'Father’s/Husband’s name',
'Sex',
'Dates',
'Remarks'
        ],
'field_mappings': {
            'Sl. No.': 'sl',
'Name of workmen': 'Employee_Name',
'Father’s/Husband’s name': 'Father_Name',
'Sex': 'Gender',
'Dates': 'Date_Of_Joining',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Chandigarh',
'purpose': 'Register of Advances',
'form_code': 'FORM XXII',
'title': 'Register of Advances',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Advances FORM XXII</h1>\n<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[See rule 78 (1)(a)(ii)]</h2>\n<p style="margin:4px 0;font-size:12px;"><b>1. Name and Address of Contractor:</b> {{CONTRACTOR_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>2. Name and Address of establishment in/under which:</b> {{EMPLOYER_NAME}}</p>\n<p>contract is carried on.</p>\n<p style="margin:4px 0;font-size:12px;"><b>3. Nature and location of work:</b> {{SITE_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>4. Name and address of Principal Employer:</b> {{EMPLOYER_NAME}}</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>No Advance is given during the month of {{MONTH}} {{YEAR}}</p>\n</body></html>',
'columns': [
            'SI No.',
'Name of workmen',
"Father's/Husband's name",
'Nature of employment/Designation',
'Wage period and wages payable',
'Date and amount of advance given',
'Purpose(s) for which advance made',
'No. of instalments by which advance to be repaid',
'Date and amount of each instalments repaid',
'Date on which last instalments was repaid',
'Remarks'
        ],
'field_mappings': {
            'Date and amount of advance given': 'Advance_Amount',
'SI No.': 'sl',
'Name of workmen': 'Employee_Name',
"Father's/Husband's name": 'Father_Name',
'Nature of employment/Designation': 'Designation',
'Purpose(s) for which advance made': 'Advance_Purpose',
'No. of instalments by which advance to be repaid': 'Advance_Installments',
'Date and amount of each instalments repaid': 'Advance_Repaid_Amount',
'Date on which last instalments was repaid': 'Advance_Repaid_Date',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Chandigarh',
'purpose': 'Register of Fines',
'form_code': 'FORM XXI',
'title': 'Register of Fines',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Fines FORM XXI</h1>\n<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[See rule 78 (1)(a)(ii)]</h2>\n<p style="margin:4px 0;font-size:12px;"><b>1. Name and Address of Contractor:</b> {{CONTRACTOR_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>2. Name and Address of establishment in/under which:</b> {{EMPLOYER_NAME}}</p>\n<p>contract is carried on.</p>\n<p style="margin:4px 0;font-size:12px;"><b>3. Nature and location of work:</b> {{SITE_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>4. Name and address of Principal Employer:</b> {{EMPLOYER_NAME}}</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>No fine imposed during the month of {{MONTH}} {{YEAR}}</p>\n</body></html>',
'columns': [
            'SI No.',
'Name of workmen',
"Father's/Husband's name",
'Designation/nature for fine imposed',
'Act/Ommission for which imposed',
'Date of Offence',
'Whether workman showed cause against fine',
"Name of person in whose presence employee's was heard",
'Wage periods and wages payable',
'Amount of fine imposed',
'Date on which fine realised',
'Remarks'
        ],
'field_mappings': {
            'SI No.': 'sl',
'Name of workmen': 'Employee_Name',
"Father's/Husband's name": 'Father_Name',
'Act/Ommission for which imposed': 'Fine_Offence_Nature',
'Date of Offence': 'Fine_Offence_Date',
'Amount of fine imposed': 'Fine_Amount',
'Date on which fine realised': 'Fine_Realised_Date',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Chandigarh',
'purpose': 'Register of Overtime',
'form_code': 'FORM XXIII',
'title': 'Register of Overtime',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Overtime FORM XXIII</h1>\n<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[See rule 78 (1)(a)(iii)]</h2>\n<p style="margin:4px 0;font-size:12px;"><b>1. Name and Address of Contractor:</b> {{CONTRACTOR_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>2. Name and Address of establishment in/under which:</b> {{EMPLOYER_NAME}}</p>\n<p>contract is carried on.</p>\n<p style="margin:4px 0;font-size:12px;"><b>3. Nature and location of work:</b> {{SITE_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>4. Name and address of Principal Employer:</b> {{EMPLOYER_NAME}}</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>No overtime work is done during the month of {{MONTH}} {{YEAR}}</p>\n</body></html>',
'columns': [
            'SI No.',
'Name of workman',
"Father's/Husband's name",
'Sex',
'Designation/nature of employment',
'Date on which overtime worked',
'Total overtime worked',
'Normal rate of wages',
'Overtime rate of wages',
'Overtime earnings',
'Date on which overtime wages paid',
'Remarks'
        ],
'field_mappings': {
            'SI No.': 'sl',
'Name of workman': 'Employee_Name',
"Father's/Husband's name": 'Father_Name',
'Sex': 'Gender',
'Designation/nature of employment': 'Designation',
'Date on which overtime worked': 'Overtime_Date',
'Total overtime worked': 'Overtime_Extent',
'Normal rate of wages': 'Normal_Rate',
'Overtime rate of wages': 'Overtime_Rate',
'Overtime earnings': 'Overtime_Earnings',
'Date on which overtime wages paid': 'Overtime_Payment_Date',
'Remarks': 'Remarks'
        },
'calculation_rules': [
            {
                'target': 'otEarnings',
'label': 'Overtime wages',
'formula': 'otHours * otRate'
            }
        ]
    },
{
        'state': 'Chandigarh',
'purpose': 'Register of Workmen',
'form_code': 'FORM XIII',
'title': 'Register of Workmen',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  p.formtitle { text-align: center; font-weight: bold; font-size: 15px; margin-bottom: 2px; }\n  p.rule { text-align: center; font-size: 11px; color: #333; margin-bottom: 8px; }\n  p.title { text-align: center; font-weight: bold; font-size: 15px; margin-bottom: 12px; }\n  p.lead { font-weight: 600; margin-top: 8px; }\n  .gap { height: 10px; }\n  .field { display: flex; gap: 8px; align-items: baseline; margin: 6px 0; font-size: 13px; }\n  .field .label { flex: none; }\n  .field .fill { flex: 1; border-bottom: 1px solid #000; min-height: 1.2em; display: inline-block; }\n  .field .value b { font-weight: 600; }\n  .sign { margin-top: 18px; text-align: right; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <p class="formtitle">FORM XIII</p>\n<p class="title">[ See Rule 75 ]</p>\n<p class="lead">Register of Workmen Employed by Contractor</p>\n<p>Name and address of Contractor …………………………………………………………………………………………....................................................................................</p>\n<p>………………………………………………………………………………………………………………………………………………………………………………………………………………………………</p>\n<p>Nature and location of work ………………………………………………………………………………………………………………………………………………………………………………..</p>\n<p>Name and address of establishment in/under which contract is carried on …………………………………………………………………………………………………………</p>\n<p>……………………………………………………………………………………………………………………………………………………………………………………………………………………………… Name and address of Principal Employer ……………………………………………………………………………………………………………………………………………………………..</p>\n<p>……………………………………………………………………………………………………………………………………………………………………………………………………………………………..</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<div class="gap"></div>\n</body></html>',
'columns': [
            'SI. No.',
'Name and surname of workmen',
'Age and Sex',
'Father’s/ Husband’s name',
'Nature of Employment/ Designation',
'Permanent house a ddress of workman (Village and t e hsil/ t aluk and d istrict)',
'Local Address',
'Date of commencement of employment',
'Signature or thumb impression of workman`',
'Date of termination of employment',
'Reason for termination',
'Remarks'
        ],
'field_mappings': {
            'Date of termination of employment': 'Date_Of_Leaving',
'SI. No.': 'sl',
'Name and surname of workmen': 'Employee_Name',
'Age and Sex': 'Gender',
'Father’s/ Husband’s name': 'Father_Name',
'Permanent house a ddress of workman (Village and t e hsil/ t aluk and d istrict)': 'Address',
'Local Address': 'Address',
'Date of commencement of employment': 'Date_Of_Joining',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Chandigarh',
'purpose': 'Wage Register',
'form_code': 'FORM XVII',
'title': 'Wage Register',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">See Rule 78(I)(a)(i)] FORM XVII</h1>\n<p>Register of Wages</p>\n<p>Name and address of the Contractor</p>\n<p>Name and address of Establishment in/under which contract is carried on</p>\n<p>Name and location of work</p>\n<p>Name and address of Principal Employer</p>\n<p>Wage Period: Monthly</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>Basic wages Dearness Allowance Overtime Other cash payments (Nature of payments to be indicated) Total</p>\n<p>Wage Period: Monthly ………………………………………………………………………………………………………………………………………………………………………………………....</p>\n</body></html>',
'columns': [
            'Sl. No.',
'Name of workmen',
'Sl. No. in the register of workmen',
'Designation/ Nature of employment',
'No. of days worked',
'Unit of work done',
'Daily-rate of wages/piece-rate',
'Amount of wages earned',
'Deductions if any (indicate nature)',
'Net amount paid',
'Signature/Thumb impression of workmen',
'Initial of contractor or his representative'
        ],
'field_mappings': {
            'Name of workmen': 'Employee_Name',
'Designation/ Nature of employment': 'Designation',
'Unit of work done': 'NO_ofunit_Per_Piece',
'Sl. No.': 'sl',
'Sl. No. in the register of workmen': 'sl',
'No. of days worked': 'Total_Days_Worked',
'Daily-rate of wages/piece-rate': 'Normal_Rate',
'Amount of wages earned': 'Gross_Wages',
'Deductions if any (indicate nature)': 'Total_Deductions',
'Net amount paid': 'Net_Salary'
        },
'calculation_rules': [
            {
                'target': 'grossWages',
'label': 'Gross wages',
'formula': 'daysWorked * dailyRate'
            },
{
                'target': 'netSalary',
'label': 'Net amount paid',
'formula': 'grossWages - totalDeductions'
            }
        ]
    },
{
        'state': 'Daman & Diu',
'purpose': 'Deductions for Damage or Loss',
'form_code': 'FORM XVI',
'title': 'Register of Deductions for Damage or Loss',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">See Rule 78(1)(a)(i FORM XVI</h1>\n<p>Muster Roll</p>\n<p>Name and address of Contractor</p>\n<p>Name and address of establishment in/under which contract is carried on</p>\n<p>Nature and location of work</p>\n<p>Name and address of Principal Employer</p>\n<p>For the month of</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>1…… 31</p>\n</body></html>',
'columns': [
            'Sl. No.',
'Name of workmen',
'Father’s/Husband’s name',
'Sex',
'Dates',
'Remarks'
        ],
'field_mappings': {
            'Sl. No.': 'sl',
'Name of workmen': 'Employee_Name',
'Father’s/Husband’s name': 'Father_Name',
'Sex': 'Gender',
'Dates': 'Date_Of_Joining',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Daman & Diu',
'purpose': 'Register of Advances',
'form_code': 'FORM XVIII',
'title': 'Register of Advances',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Advances FORM XVIII</h1>\n<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[See rule 78 (1)(a)(ii)]</h2>\n<p style="margin:4px 0;font-size:12px;"><b>1. Name and Address of Contractor:</b> {{CONTRACTOR_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>2. Name and Address of establishment in/under which:</b> {{EMPLOYER_NAME}}</p>\n<p>contract is carried on.</p>\n<p style="margin:4px 0;font-size:12px;"><b>3. Nature and location of work:</b> {{SITE_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>4. Name and address of Principal Employer:</b> {{EMPLOYER_NAME}}</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>No Advance is given during the month of {{MONTH}} {{YEAR}}</p>\n</body></html>',
'columns': [
            'SI No.',
'Name of workmen',
"Father's/Husband's name",
'Nature of employment/Designation',
'Wage period and wages payable',
'Date and amount of advance given',
'Purpose(s) for which advance made',
'No. of instalments by which advance to be repaid',
'Date and amount of each instalments repaid',
'Date on which last instalments was repaid',
'Remarks'
        ],
'field_mappings': {
            'SI No.': 'sl',
'Name of workmen': 'Employee_Name',
"Father's/Husband's name": 'Father_Name',
'Nature of employment/Designation': 'Designation',
'Date and amount of advance given': 'Advance_Amount',
'Purpose(s) for which advance made': 'Advance_Purpose',
'No. of instalments by which advance to be repaid': 'Advance_Installments',
'Date and amount of each instalments repaid': 'Advance_Repaid_Amount',
'Date on which last instalments was repaid': 'Advance_Repaid_Date',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Daman & Diu',
'purpose': 'Register of Fines',
'form_code': 'FORM XVII',
'title': 'Register of Fines',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">See Rule 78(I)(a)(i)] FORM XVII</h1>\n<p>Register of Wages</p>\n<p>Name and address of the Contractor</p>\n<p>Name and address of Establishment in/under which contract is carried on</p>\n<p>Name and location of work</p>\n<p>Name and address of Principal Employer</p>\n<p>Wage Period: Monthly</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>Basic wages Dearness Allowance Overtime Other cash payments (Nature of payments to be indicated) Total</p>\n<p>Wage Period: Monthly ………………………………………………………………………………………………………………………………………………………………………………………....</p>\n</body></html>',
'columns': [
            'Sl. No.',
'Name of workmen',
'Sl. No. in the register of workmen',
'Designation/ Nature of employment',
'No. of days worked',
'Unit of work done',
'Daily-rate of wages/piece-rate',
'Amount of wages earned',
'Deductions if any (indicate nature)',
'Net amount paid',
'Signature/Thumb impression of workmen',
'Initial of contractor or his representative'
        ],
'field_mappings': {
            'Name of workmen': 'Employee_Name',
'Designation/ Nature of employment': 'Designation',
'Unit of work done': 'NO_ofunit_Per_Piece',
'Sl. No.': 'sl',
'Sl. No. in the register of workmen': 'sl',
'No. of days worked': 'Total_Days_Worked',
'Daily-rate of wages/piece-rate': 'Normal_Rate',
'Amount of wages earned': 'Gross_Wages',
'Deductions if any (indicate nature)': 'Total_Deductions',
'Net amount paid': 'Net_Salary'
        },
'calculation_rules': [
            {
                'target': 'grossWages',
'label': 'Gross wages',
'formula': 'daysWorked * dailyRate'
            },
{
                'target': 'netSalary',
'label': 'Net amount paid',
'formula': 'grossWages - totalDeductions'
            }
        ]
    },
{
        'state': 'Daman & Diu',
'purpose': 'Register of Overtime',
'form_code': 'FORM XIX',
'title': 'Register of Overtime',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  p.formtitle { text-align: center; font-weight: bold; font-size: 15px; }\n  p.title { text-align: center; font-weight: bold; font-size: 15px; margin-bottom: 10px; }\n  .field { display: flex; gap: 8px; margin: 6px 0; font-size: 13px; }\n  .field .label { flex: none; }\n  .field .fill { flex: 1; border-bottom: 1px solid #000; min-height: 1.2em; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 4px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <p class="formtitle">FORM XIX</p>\n<p class="rule">*[See Rule 78(1) (b)]</p>\n<p class="title">Wage Slip</p>\n<div class="field"><span class="label">Name and Address of Contractor:</span><span class="fill"></span></div>\n<div class="field"><span class="label">Nature and location of work:</span><span class="fill"></span></div>\n<div class="field"><span class="label">Name and Father’s/Husband’s name of the workman:</span><span class="fill"></span></div>\n<div class="field"><span class="label">For the Week/Fortnight/Month ending:</span><span class="fill"></span></div>\n<div class="field"><span class="label">1. No. of days worked:</span><span class="fill"></span></div>\n<div class="field"><span class="label">2. No. of unit worked in case of piece-rate workers:</span><span class="fill"></span></div>\n<div class="field"><span class="label">3. Rate of daily wages/piece-rate:</span><span class="fill"></span></div>\n<div class="field"><span class="label">4. Amount of overtime wages:</span><span class="fill"></span></div>\n<div class="field"><span class="label">5. Gross wages payable:</span><span class="fill"></span></div>\n<div class="field"><span class="label">6. Deductions, if any:</span><span class="fill"></span></div>\n<div class="field"><span class="label">7. Net amount of wages paid:</span><span class="fill"></span></div>\n<div class="field"><span class="label">Initials of the Contractor or his:</span><span class="fill"></span></div>\n<div class="field"><span class="label">Representative:</span><span class="fill"></span></div>\n<p>*Substituted for the brackets, words, figures and letter “[See Rule 78(2) (b)]” by GSR 948, dated 12-7-1978, w.e.f. 22-7-1978.</p>\n</body></html>',
'columns': [],
'field_mappings': {
            
        },
'calculation_rules': []
    },
{
        'state': 'Daman & Diu',
'purpose': 'Wage Register',
'form_code': 'FORM XIII',
'title': 'Wage Register',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  p.formtitle { text-align: center; font-weight: bold; font-size: 15px; margin-bottom: 2px; }\n  p.rule { text-align: center; font-size: 11px; color: #333; margin-bottom: 8px; }\n  p.title { text-align: center; font-weight: bold; font-size: 15px; margin-bottom: 12px; }\n  p.lead { font-weight: 600; margin-top: 8px; }\n  .gap { height: 10px; }\n  .field { display: flex; gap: 8px; align-items: baseline; margin: 6px 0; font-size: 13px; }\n  .field .label { flex: none; }\n  .field .fill { flex: 1; border-bottom: 1px solid #000; min-height: 1.2em; display: inline-block; }\n  .field .value b { font-weight: 600; }\n  .sign { margin-top: 18px; text-align: right; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <p class="formtitle">FORM XIII</p>\n<p class="title">[ See Rule 75 ]</p>\n<p class="lead">Register of Workmen Employed by Contractor</p>\n<p>Name and address of Contractor …………………………………………………………………………………………....................................................................................</p>\n<p>………………………………………………………………………………………………………………………………………………………………………………………………………………………………</p>\n<p>Nature and location of work ………………………………………………………………………………………………………………………………………………………………………………..</p>\n<p>Name and address of establishment in/under which contract is carried on …………………………………………………………………………………………………………</p>\n<p>……………………………………………………………………………………………………………………………………………………………………………………………………………………………… Name and address of Principal Employer ……………………………………………………………………………………………………………………………………………………………..</p>\n<p>……………………………………………………………………………………………………………………………………………………………………………………………………………………………..</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<div class="gap"></div>\n</body></html>',
'columns': [
            'SI. No.',
'Name and surname of workmen',
'Age and Sex',
'Father’s/ Husband’s name',
'Nature of Employment/ Designation',
'Permanent house a ddress of workman (Village and t e hsil/ t aluk and d istrict)',
'Local Address',
'Date of commencement of employment',
'Signature or thumb impression of workman`',
'Date of termination of employment',
'Reason for termination',
'Remarks'
        ],
'field_mappings': {
            'Date of termination of employment': 'Date_Of_Leaving',
'SI. No.': 'sl',
'Name and surname of workmen': 'Employee_Name',
'Age and Sex': 'Gender',
'Father’s/ Husband’s name': 'Father_Name',
'Permanent house a ddress of workman (Village and t e hsil/ t aluk and d istrict)': 'Address',
'Local Address': 'Address',
'Date of commencement of employment': 'Date_Of_Joining',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Delhi',
'purpose': 'Deductions for Damage or Loss',
'form_code': 'FORM XX',
'title': 'Register of Deductions for Damage or Loss',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Deductions for Damage or Loss FORM XX</h1>\n<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[See rule 78 (1)(a)(ii)]</h2>\n<p style="margin:4px 0;font-size:12px;"><b>1. Name and Address of Contractor:</b> {{CONTRACTOR_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>2. Name and Address of establishment in/under which:</b> {{EMPLOYER_NAME}}</p>\n<p>contract is carried on.</p>\n<p style="margin:4px 0;font-size:12px;"><b>3. Nature and location of work:</b> {{SITE_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>4. Name and address of Principal Employer:</b> {{EMPLOYER_NAME}}</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>There is no deduction for damage or Loss during the month of {{MONTH}} {{YEAR}}</p>\n<p>\\</p>\n</body></html>',
'columns': [
            'SI No.',
'Name of workmen',
"Father's/Husband's name",
'Designation',
'Particulars of damage or loss',
'Date of damage or loss',
'Whether workman showed cause against deduction',
"Name of person in whose presence employee's was heard",
'Amount of deduction imposed',
'No. of instalments',
'First Instalments',
'Last Instalments',
'Remarks'
        ],
'field_mappings': {
            'SI No.': 'sl',
'Name of workmen': 'Employee_Name',
"Father's/Husband's name": 'Father_Name',
'Designation': 'Designation',
'Particulars of damage or loss': 'Loss_Caused',
'Date of damage or loss': 'Date_of_Damage',
'Amount of deduction imposed': 'Deduction_Amount',
'No. of instalments': 'Deduction_Installments',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Delhi',
'purpose': 'MusterRoll',
'form_code': 'FORM XVI',
'title': 'Muster Roll cum Wage Register',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">See Rule 78(1)(a)(i FORM XVI</h1>\n<p>Muster Roll</p>\n<p>Name and address of Contractor</p>\n<p>Name and address of establishment in/under which contract is carried on</p>\n<p>Nature and location of work</p>\n<p>Name and address of Principal Employer</p>\n<p>For the month of</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>1…… 31</p>\n</body></html>',
'columns': [
            'Sl. No.',
'Name of workmen',
'Father’s/Husband’s name',
'Sex',
'Dates',
'Remarks'
        ],
'field_mappings': {
            'Sl. No.': 'sl',
'Name of workmen': 'Employee_Name',
'Father’s/Husband’s name': 'Father_Name',
'Sex': 'Gender',
'Dates': 'Date_Of_Joining',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Delhi',
'purpose': 'Register of Advances',
'form_code': 'FORM XXII',
'title': 'Register of Advances',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Advances FORM XXII</h1>\n<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[See rule 78 (1)(a)(ii)]</h2>\n<p style="margin:4px 0;font-size:12px;"><b>1. Name and Address of Contractor:</b> {{CONTRACTOR_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>2. Name and Address of establishment in/under which:</b> {{EMPLOYER_NAME}}</p>\n<p>contract is carried on.</p>\n<p style="margin:4px 0;font-size:12px;"><b>3. Nature and location of work:</b> {{SITE_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>4. Name and address of Principal Employer:</b> {{EMPLOYER_NAME}}</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>No Advance is given during the month of {{MONTH}} {{YEAR}}</p>\n</body></html>',
'columns': [
            'SI No.',
'Name of workmen',
"Father's/Husband's name",
'Nature of employment/Designation',
'Wage period and wages payable',
'Date and amount of advance given',
'Purpose(s) for which advance made',
'No. of instalments by which advance to be repaid',
'Date and amount of each instalments repaid',
'Date on which last instalments was repaid',
'Remarks'
        ],
'field_mappings': {
            'SI No.': 'sl',
'Name of workmen': 'Employee_Name',
"Father's/Husband's name": 'Father_Name',
'Nature of employment/Designation': 'Designation',
'Date and amount of advance given': 'Advance_Amount',
'Purpose(s) for which advance made': 'Advance_Purpose',
'No. of instalments by which advance to be repaid': 'Advance_Installments',
'Date and amount of each instalments repaid': 'Advance_Repaid_Amount',
'Date on which last instalments was repaid': 'Advance_Repaid_Date',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Delhi',
'purpose': 'Register of Fines',
'form_code': 'FORM XXI',
'title': 'Register of Fines',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Fines FORM XXI</h1>\n<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[See rule 78 (1)(a)(ii)]</h2>\n<p style="margin:4px 0;font-size:12px;"><b>1. Name and Address of Contractor:</b> {{CONTRACTOR_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>2. Name and Address of establishment in/under which:</b> {{EMPLOYER_NAME}}</p>\n<p>contract is carried on.</p>\n<p style="margin:4px 0;font-size:12px;"><b>3. Nature and location of work:</b> {{SITE_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>4. Name and address of Principal Employer:</b> {{EMPLOYER_NAME}}</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>No fine imposed during the month of {{MONTH}} {{YEAR}}</p>\n</body></html>',
'columns': [
            'SI No.',
'Name of workmen',
"Father's/Husband's name",
'Designation/nature for fine imposed',
'Act/Ommission for which imposed',
'Date of Offence',
'Whether workman showed cause against fine',
"Name of person in whose presence employee's was heard",
'Wage periods and wages payable',
'Amount of fine imposed',
'Date on which fine realised',
'Remarks'
        ],
'field_mappings': {
            'SI No.': 'sl',
'Name of workmen': 'Employee_Name',
"Father's/Husband's name": 'Father_Name',
'Act/Ommission for which imposed': 'Fine_Offence_Nature',
'Date of Offence': 'Fine_Offence_Date',
'Amount of fine imposed': 'Fine_Amount',
'Date on which fine realised': 'Fine_Realised_Date',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Delhi',
'purpose': 'Register of Overtime',
'form_code': 'FORM XXIII',
'title': 'Register of Overtime',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Overtime FORM XXIII</h1>\n<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[See rule 78 (1)(a)(iii)]</h2>\n<p style="margin:4px 0;font-size:12px;"><b>1. Name and Address of Contractor:</b> {{CONTRACTOR_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>2. Name and Address of establishment in/under which:</b> {{EMPLOYER_NAME}}</p>\n<p>contract is carried on.</p>\n<p style="margin:4px 0;font-size:12px;"><b>3. Nature and location of work:</b> {{SITE_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>4. Name and address of Principal Employer:</b> {{EMPLOYER_NAME}}</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>No overtime work is done during the month of {{MONTH}} {{YEAR}}</p>\n</body></html>',
'columns': [
            'SI No.',
'Name of workman',
"Father's/Husband's name",
'Sex',
'Designation/nature of employment',
'Date on which overtime worked',
'Total overtime worked',
'Normal rate of wages',
'Overtime rate of wages',
'Overtime earnings',
'Date on which overtime wages paid',
'Remarks'
        ],
'field_mappings': {
            'Date on which overtime wages paid': 'Overtime_Payment_Date',
'SI No.': 'sl',
'Name of workman': 'Employee_Name',
"Father's/Husband's name": 'Father_Name',
'Sex': 'Gender',
'Designation/nature of employment': 'Designation',
'Date on which overtime worked': 'Overtime_Date',
'Total overtime worked': 'Overtime_Extent',
'Normal rate of wages': 'Normal_Rate',
'Overtime rate of wages': 'Overtime_Rate',
'Overtime earnings': 'Overtime_Earnings',
'Remarks': 'Remarks'
        },
'calculation_rules': [
            {
                'target': 'otEarnings',
'label': 'Overtime wages',
'formula': 'otHours * otRate'
            }
        ]
    },
{
        'state': 'Delhi',
'purpose': 'Register of Workmen',
'form_code': 'FORM XIII',
'title': 'Register of Workmen',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  p.formtitle { text-align: center; font-weight: bold; font-size: 15px; margin-bottom: 2px; }\n  p.rule { text-align: center; font-size: 11px; color: #333; margin-bottom: 8px; }\n  p.title { text-align: center; font-weight: bold; font-size: 15px; margin-bottom: 12px; }\n  p.lead { font-weight: 600; margin-top: 8px; }\n  .gap { height: 10px; }\n  .field { display: flex; gap: 8px; align-items: baseline; margin: 6px 0; font-size: 13px; }\n  .field .label { flex: none; }\n  .field .fill { flex: 1; border-bottom: 1px solid #000; min-height: 1.2em; display: inline-block; }\n  .field .value b { font-weight: 600; }\n  .sign { margin-top: 18px; text-align: right; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <p class="formtitle">FORM XIII</p>\n<p class="title">[ See Rule 75 ]</p>\n<p class="lead">Register of Workmen Employed by Contractor</p>\n<p>Name and address of Contractor …………………………………………………………………………………………....................................................................................</p>\n<p>………………………………………………………………………………………………………………………………………………………………………………………………………………………………</p>\n<p>Nature and location of work ………………………………………………………………………………………………………………………………………………………………………………..</p>\n<p>Name and address of establishment in/under which contract is carried on …………………………………………………………………………………………………………</p>\n<p>……………………………………………………………………………………………………………………………………………………………………………………………………………………………… Name and address of Principal Employer ……………………………………………………………………………………………………………………………………………………………..</p>\n<p>……………………………………………………………………………………………………………………………………………………………………………………………………………………………..</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<div class="gap"></div>\n</body></html>',
'columns': [
            'SI. No.',
'Name and surname of workmen',
'Age and Sex',
'Father’s/ Husband’s name',
'Nature of Employment/ Designation',
'Permanent house a ddress of workman (Village and t e hsil/ t aluk and d istrict)',
'Local Address',
'Date of commencement of employment',
'Signature or thumb impression of workman`',
'Date of termination of employment',
'Reason for termination',
'Remarks'
        ],
'field_mappings': {
            'Date of termination of employment': 'Date_Of_Leaving',
'SI. No.': 'sl',
'Name and surname of workmen': 'Employee_Name',
'Age and Sex': 'Gender',
'Father’s/ Husband’s name': 'Father_Name',
'Permanent house a ddress of workman (Village and t e hsil/ t aluk and d istrict)': 'Address',
'Local Address': 'Address',
'Date of commencement of employment': 'Date_Of_Joining',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Delhi',
'purpose': 'Wage Register',
'form_code': 'FORM XVII',
'title': 'Wage Register',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">See Rule 78(I)(a)(i)] FORM XVII</h1>\n<p>Register of Wages</p>\n<p>Name and address of the Contractor</p>\n<p>Name and address of Establishment in/under which contract is carried on</p>\n<p>Name and location of work</p>\n<p>Name and address of Principal Employer</p>\n<p>Wage Period: Monthly</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>Basic wages Dearness Allowance Overtime Other cash payments (Nature of payments to be indicated) Total</p>\n<p>Wage Period: Monthly ………………………………………………………………………………………………………………………………………………………………………………………....</p>\n</body></html>',
'columns': [
            'Sl. No.',
'Name of workmen',
'Sl. No. in the register of workmen',
'Designation/ Nature of employment',
'No. of days worked',
'Unit of work done',
'Daily-rate of wages/piece-rate',
'Amount of wages earned',
'Deductions if any (indicate nature)',
'Net amount paid',
'Signature/Thumb impression of workmen',
'Initial of contractor or his representative'
        ],
'field_mappings': {
            'Unit of work done': 'NO_ofunit_Per_Piece',
'Sl. No.': 'sl',
'Name of workmen': 'Employee_Name',
'Sl. No. in the register of workmen': 'sl',
'Designation/ Nature of employment': 'Designation',
'No. of days worked': 'Total_Days_Worked',
'Daily-rate of wages/piece-rate': 'Normal_Rate',
'Amount of wages earned': 'Gross_Wages',
'Deductions if any (indicate nature)': 'Total_Deductions',
'Net amount paid': 'Net_Salary'
        },
'calculation_rules': [
            {
                'target': 'grossWages',
'label': 'Gross wages',
'formula': 'daysWorked * dailyRate'
            },
{
                'target': 'netSalary',
'label': 'Net amount paid',
'formula': 'grossWages - totalDeductions'
            }
        ]
    },
{
        'state': 'Goa',
'purpose': 'Deductions for Damage or Loss',
'form_code': 'FORM XVI',
'title': 'Register of Deductions for Damage or Loss',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">See Rule 78(1)(a)(i FORM XVI</h1>\n<p>Muster Roll</p>\n<p>Name and address of Contractor</p>\n<p>Name and address of establishment in/under which contract is carried on</p>\n<p>Nature and location of work</p>\n<p>Name and address of Principal Employer</p>\n<p>For the month of</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>1…… 31</p>\n</body></html>',
'columns': [
            'Sl. No.',
'Name of workmen',
'Father’s/Husband’s name',
'Sex',
'Dates',
'Remarks'
        ],
'field_mappings': {
            'Sl. No.': 'sl',
'Name of workmen': 'Employee_Name',
'Father’s/Husband’s name': 'Father_Name',
'Sex': 'Gender',
'Dates': 'Date_Of_Joining',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Goa',
'purpose': 'Register of Advances',
'form_code': 'FORM XVIII',
'title': 'Register of Advances',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Advances FORM XVIII</h1>\n<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[See rule 78 (1)(a)(ii)]</h2>\n<p style="margin:4px 0;font-size:12px;"><b>1. Name and Address of Contractor:</b> {{CONTRACTOR_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>2. Name and Address of establishment in/under which:</b> {{EMPLOYER_NAME}}</p>\n<p>contract is carried on.</p>\n<p style="margin:4px 0;font-size:12px;"><b>3. Nature and location of work:</b> {{SITE_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>4. Name and address of Principal Employer:</b> {{EMPLOYER_NAME}}</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>No Advance is given during the month of {{MONTH}} {{YEAR}}</p>\n</body></html>',
'columns': [
            'SI No.',
'Name of workmen',
"Father's/Husband's name",
'Nature of employment/Designation',
'Wage period and wages payable',
'Date and amount of advance given',
'Purpose(s) for which advance made',
'No. of instalments by which advance to be repaid',
'Date and amount of each instalments repaid',
'Date on which last instalments was repaid',
'Remarks'
        ],
'field_mappings': {
            'SI No.': 'sl',
'Name of workmen': 'Employee_Name',
"Father's/Husband's name": 'Father_Name',
'Nature of employment/Designation': 'Designation',
'Date and amount of advance given': 'Advance_Amount',
'Purpose(s) for which advance made': 'Advance_Purpose',
'No. of instalments by which advance to be repaid': 'Advance_Installments',
'Date and amount of each instalments repaid': 'Advance_Repaid_Amount',
'Date on which last instalments was repaid': 'Advance_Repaid_Date',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Goa',
'purpose': 'Register of Fines',
'form_code': 'FORM XVII',
'title': 'Register of Fines',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">See Rule 78(I)(a)(i)] FORM XVII</h1>\n<p>Register of Wages</p>\n<p>Name and address of the Contractor</p>\n<p>Name and address of Establishment in/under which contract is carried on</p>\n<p>Name and location of work</p>\n<p>Name and address of Principal Employer</p>\n<p>Wage Period: Monthly</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>Basic wages Dearness Allowance Overtime Other cash payments (Nature of payments to be indicated) Total</p>\n<p>Wage Period: Monthly ………………………………………………………………………………………………………………………………………………………………………………………....</p>\n</body></html>',
'columns': [
            'Sl. No.',
'Name of workmen',
'Sl. No. in the register of workmen',
'Designation/ Nature of employment',
'No. of days worked',
'Unit of work done',
'Daily-rate of wages/piece-rate',
'Amount of wages earned',
'Deductions if any (indicate nature)',
'Net amount paid',
'Signature/Thumb impression of workmen',
'Initial of contractor or his representative'
        ],
'field_mappings': {
            'Deductions if any (indicate nature)': 'Total_Deductions',
'Unit of work done': 'NO_ofunit_Per_Piece',
'Sl. No.': 'sl',
'Name of workmen': 'Employee_Name',
'Sl. No. in the register of workmen': 'sl',
'Designation/ Nature of employment': 'Designation',
'No. of days worked': 'Total_Days_Worked',
'Daily-rate of wages/piece-rate': 'Normal_Rate',
'Amount of wages earned': 'Gross_Wages',
'Net amount paid': 'Net_Salary'
        },
'calculation_rules': [
            {
                'target': 'grossWages',
'label': 'Gross wages',
'formula': 'daysWorked * dailyRate'
            },
{
                'target': 'netSalary',
'label': 'Net amount paid',
'formula': 'grossWages - totalDeductions'
            }
        ]
    },
{
        'state': 'Goa',
'purpose': 'Register of Overtime',
'form_code': 'FORM XIX',
'title': 'Register of Overtime',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  p.formtitle { text-align: center; font-weight: bold; font-size: 15px; }\n  p.title { text-align: center; font-weight: bold; font-size: 15px; margin-bottom: 10px; }\n  .field { display: flex; gap: 8px; margin: 6px 0; font-size: 13px; }\n  .field .label { flex: none; }\n  .field .fill { flex: 1; border-bottom: 1px solid #000; min-height: 1.2em; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 4px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <p class="formtitle">FORM XIX</p>\n<p class="rule">*[See Rule 78(1) (b)]</p>\n<p class="title">Wage Slip</p>\n<div class="field"><span class="label">Name and Address of Contractor:</span><span class="fill"></span></div>\n<div class="field"><span class="label">Nature and location of work:</span><span class="fill"></span></div>\n<div class="field"><span class="label">Name and Father’s/Husband’s name of the workman:</span><span class="fill"></span></div>\n<div class="field"><span class="label">For the Week/Fortnight/Month ending:</span><span class="fill"></span></div>\n<div class="field"><span class="label">1. No. of days worked:</span><span class="fill"></span></div>\n<div class="field"><span class="label">2. No. of unit worked in case of piece-rate workers:</span><span class="fill"></span></div>\n<div class="field"><span class="label">3. Rate of daily wages/piece-rate:</span><span class="fill"></span></div>\n<div class="field"><span class="label">4. Amount of overtime wages:</span><span class="fill"></span></div>\n<div class="field"><span class="label">5. Gross wages payable:</span><span class="fill"></span></div>\n<div class="field"><span class="label">6. Deductions, if any:</span><span class="fill"></span></div>\n<div class="field"><span class="label">7. Net amount of wages paid:</span><span class="fill"></span></div>\n<div class="field"><span class="label">Initials of the Contractor or his:</span><span class="fill"></span></div>\n<div class="field"><span class="label">Representative:</span><span class="fill"></span></div>\n<p>*Substituted for the brackets, words, figures and letter “[See Rule 78(2) (b)]” by GSR 948, dated 12-7-1978, w.e.f. 22-7-1978.</p>\n</body></html>',
'columns': [],
'field_mappings': {
            
        },
'calculation_rules': []
    },
{
        'state': 'Goa',
'purpose': 'Register of Workmen',
'form_code': 'FORM IX',
'title': 'Register of Workmen',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">(See Rule 74) FORM IX</h1>\n<p>Register of workmen employed by Contractor</p>\n<p>Name and address of contractor…. Name and address of establisment in/under which contract is carried on…</p>\n<p>Nature and location of work….. Name and address of Principal Employers…..</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n</body></html>',
'columns': [
            'Sl. No.',
'Name and surname of workmen',
'Age and sex',
"Father's/husband's name",
'Nature of employment/designation',
'Permanent home address of workman (Village and Tehsil/Taluka and District)',
'Present Address',
'Date of commencement of employment',
'Date of termination of employment',
'Signature or thumb impression of workman',
'Remarks'
        ],
'field_mappings': {
            'Permanent home address of workman (Village and Tehsil/Taluka and District)': 'Address',
'Present Address': 'Address',
'Date of termination of employment': 'Date_Of_Leaving',
'Sl. No.': 'sl',
'Name and surname of workmen': 'Employee_Name',
'Age and sex': 'Gender',
"Father's/husband's name": 'Father_Name',
'Nature of employment/designation': 'Designation',
'Date of commencement of employment': 'Date_Of_Joining',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Goa',
'purpose': 'Wage Register',
'form_code': 'FORM XIII',
'title': 'Wage Register',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  p.formtitle { text-align: center; font-weight: bold; font-size: 15px; margin-bottom: 2px; }\n  p.rule { text-align: center; font-size: 11px; color: #333; margin-bottom: 8px; }\n  p.title { text-align: center; font-weight: bold; font-size: 15px; margin-bottom: 12px; }\n  p.lead { font-weight: 600; margin-top: 8px; }\n  .gap { height: 10px; }\n  .field { display: flex; gap: 8px; align-items: baseline; margin: 6px 0; font-size: 13px; }\n  .field .label { flex: none; }\n  .field .fill { flex: 1; border-bottom: 1px solid #000; min-height: 1.2em; display: inline-block; }\n  .field .value b { font-weight: 600; }\n  .sign { margin-top: 18px; text-align: right; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <p class="formtitle">FORM XIII</p>\n<p class="title">[ See Rule 75 ]</p>\n<p class="lead">Register of Workmen Employed by Contractor</p>\n<p>Name and address of Contractor …………………………………………………………………………………………....................................................................................</p>\n<p>………………………………………………………………………………………………………………………………………………………………………………………………………………………………</p>\n<p>Nature and location of work ………………………………………………………………………………………………………………………………………………………………………………..</p>\n<p>Name and address of establishment in/under which contract is carried on …………………………………………………………………………………………………………</p>\n<p>……………………………………………………………………………………………………………………………………………………………………………………………………………………………… Name and address of Principal Employer ……………………………………………………………………………………………………………………………………………………………..</p>\n<p>……………………………………………………………………………………………………………………………………………………………………………………………………………………………..</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<div class="gap"></div>\n</body></html>',
'columns': [
            'SI. No.',
'Name and surname of workmen',
'Age and Sex',
'Father’s/ Husband’s name',
'Nature of Employment/ Designation',
'Permanent house a ddress of workman (Village and t e hsil/ t aluk and d istrict)',
'Local Address',
'Date of commencement of employment',
'Signature or thumb impression of workman`',
'Date of termination of employment',
'Reason for termination',
'Remarks'
        ],
'field_mappings': {
            'Date of termination of employment': 'Date_Of_Leaving',
'SI. No.': 'sl',
'Name and surname of workmen': 'Employee_Name',
'Age and Sex': 'Gender',
'Father’s/ Husband’s name': 'Father_Name',
'Permanent house a ddress of workman (Village and t e hsil/ t aluk and d istrict)': 'Address',
'Local Address': 'Address',
'Date of commencement of employment': 'Date_Of_Joining',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Gujarat',
'purpose': 'Deductions for Damage or Loss',
'form_code': 'FORM XX',
'title': 'Register of Deductions for Damage or Loss',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Deductions for Damage or Loss FORM XX</h1>\n<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[See rule 78 (1)(a)(ii)]</h2>\n<p style="margin:4px 0;font-size:12px;"><b>1. Name and Address of Contractor:</b> {{CONTRACTOR_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>2. Name and Address of establishment in/under which:</b> {{EMPLOYER_NAME}}</p>\n<p>contract is carried on.</p>\n<p style="margin:4px 0;font-size:12px;"><b>3. Nature and location of work:</b> {{SITE_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>4. Name and address of Principal Employer:</b> {{EMPLOYER_NAME}}</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>There is no deduction for damage or Loss during the month of {{MONTH}} {{YEAR}}</p>\n<p>\\</p>\n</body></html>',
'columns': [
            'SI No.',
'Name of workmen',
"Father's/Husband's name",
'Designation',
'Particulars of damage or loss',
'Date of damage or loss',
'Whether workman showed cause against deduction',
"Name of person in whose presence employee's was heard",
'Amount of deduction imposed',
'No. of instalments',
'First Instalments',
'Last Instalments',
'Remarks'
        ],
'field_mappings': {
            'SI No.': 'sl',
'Name of workmen': 'Employee_Name',
"Father's/Husband's name": 'Father_Name',
'Designation': 'Designation',
'Particulars of damage or loss': 'Loss_Caused',
'Date of damage or loss': 'Date_of_Damage',
'Amount of deduction imposed': 'Deduction_Amount',
'No. of instalments': 'Deduction_Installments',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Gujarat',
'purpose': 'MusterRoll',
'form_code': 'FORM XVI',
'title': 'Muster Roll cum Wage Register',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">See Rule 78(1)(a)(i FORM XVI</h1>\n<p>Muster Roll</p>\n<p>Name and address of Contractor</p>\n<p>Name and address of establishment in/under which contract is carried on</p>\n<p>Nature and location of work</p>\n<p>Name and address of Principal Employer</p>\n<p>For the month of</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>1…… 31</p>\n</body></html>',
'columns': [
            'Sl. No.',
'Name of workmen',
'Father’s/Husband’s name',
'Sex',
'Dates',
'Remarks'
        ],
'field_mappings': {
            'Sl. No.': 'sl',
'Name of workmen': 'Employee_Name',
'Father’s/Husband’s name': 'Father_Name',
'Sex': 'Gender',
'Dates': 'Date_Of_Joining',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Gujarat',
'purpose': 'Register of Advances',
'form_code': 'FORM XXII',
'title': 'Register of Advances',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Advances FORM XXII</h1>\n<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[See rule 78 (1)(a)(ii)]</h2>\n<p style="margin:4px 0;font-size:12px;"><b>1. Name and Address of Contractor:</b> {{CONTRACTOR_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>2. Name and Address of establishment in/under which:</b> {{EMPLOYER_NAME}}</p>\n<p>contract is carried on.</p>\n<p style="margin:4px 0;font-size:12px;"><b>3. Nature and location of work:</b> {{SITE_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>4. Name and address of Principal Employer:</b> {{EMPLOYER_NAME}}</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>No Advance is given during the month of {{MONTH}} {{YEAR}}</p>\n</body></html>',
'columns': [
            'SI No.',
'Name of workmen',
"Father's/Husband's name",
'Nature of employment/Designation',
'Wage period and wages payable',
'Date and amount of advance given',
'Purpose(s) for which advance made',
'No. of instalments by which advance to be repaid',
'Date and amount of each instalments repaid',
'Date on which last instalments was repaid',
'Remarks'
        ],
'field_mappings': {
            'Name of workmen': 'Employee_Name',
'No. of instalments by which advance to be repaid': 'Advance_Installments',
'SI No.': 'sl',
"Father's/Husband's name": 'Father_Name',
'Nature of employment/Designation': 'Designation',
'Date and amount of advance given': 'Advance_Amount',
'Purpose(s) for which advance made': 'Advance_Purpose',
'Date and amount of each instalments repaid': 'Advance_Repaid_Amount',
'Date on which last instalments was repaid': 'Advance_Repaid_Date',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Gujarat',
'purpose': 'Register of Fines',
'form_code': 'FORM XXI',
'title': 'Register of Fines',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Fines FORM XXI</h1>\n<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[See rule 78 (1)(a)(ii)]</h2>\n<p style="margin:4px 0;font-size:12px;"><b>1. Name and Address of Contractor:</b> {{CONTRACTOR_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>2. Name and Address of establishment in/under which:</b> {{EMPLOYER_NAME}}</p>\n<p>contract is carried on.</p>\n<p style="margin:4px 0;font-size:12px;"><b>3. Nature and location of work:</b> {{SITE_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>4. Name and address of Principal Employer:</b> {{EMPLOYER_NAME}}</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>No fine imposed during the month of {{MONTH}} {{YEAR}}</p>\n</body></html>',
'columns': [
            'SI No.',
'Name of workmen',
"Father's/Husband's name",
'Designation/nature for fine imposed',
'Act/Ommission for which imposed',
'Date of Offence',
'Whether workman showed cause against fine',
"Name of person in whose presence employee's was heard",
'Wage periods and wages payable',
'Amount of fine imposed',
'Date on which fine realised',
'Remarks'
        ],
'field_mappings': {
            'SI No.': 'sl',
'Name of workmen': 'Employee_Name',
"Father's/Husband's name": 'Father_Name',
'Act/Ommission for which imposed': 'Fine_Offence_Nature',
'Date of Offence': 'Fine_Offence_Date',
'Amount of fine imposed': 'Fine_Amount',
'Date on which fine realised': 'Fine_Realised_Date',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Gujarat',
'purpose': 'Register of Overtime',
'form_code': 'FORM XXIII',
'title': 'Register of Overtime',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Overtime FORM XXIII</h1>\n<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[See rule 78 (1)(a)(iii)]</h2>\n<p style="margin:4px 0;font-size:12px;"><b>1. Name and Address of Contractor:</b> {{CONTRACTOR_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>2. Name and Address of establishment in/under which:</b> {{EMPLOYER_NAME}}</p>\n<p>contract is carried on.</p>\n<p style="margin:4px 0;font-size:12px;"><b>3. Nature and location of work:</b> {{SITE_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>4. Name and address of Principal Employer:</b> {{EMPLOYER_NAME}}</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>No overtime work is done during the month of {{MONTH}} {{YEAR}}</p>\n</body></html>',
'columns': [
            'SI No.',
'Name of workman',
"Father's/Husband's name",
'Sex',
'Designation/nature of employment',
'Date on which overtime worked',
'Total overtime worked',
'Normal rate of wages',
'Overtime rate of wages',
'Overtime earnings',
'Date on which overtime wages paid',
'Remarks'
        ],
'field_mappings': {
            'Date on which overtime wages paid': 'Overtime_Payment_Date',
'SI No.': 'sl',
'Name of workman': 'Employee_Name',
"Father's/Husband's name": 'Father_Name',
'Sex': 'Gender',
'Designation/nature of employment': 'Designation',
'Date on which overtime worked': 'Overtime_Date',
'Total overtime worked': 'Overtime_Extent',
'Normal rate of wages': 'Normal_Rate',
'Overtime rate of wages': 'Overtime_Rate',
'Overtime earnings': 'Overtime_Earnings',
'Remarks': 'Remarks'
        },
'calculation_rules': [
            {
                'target': 'otEarnings',
'label': 'Overtime wages',
'formula': 'otHours * otRate'
            }
        ]
    },
{
        'state': 'Gujarat',
'purpose': 'Register of Workmen',
'form_code': 'FORM XIII',
'title': 'Register of Workmen',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  p.formtitle { text-align: center; font-weight: bold; font-size: 15px; margin-bottom: 2px; }\n  p.rule { text-align: center; font-size: 11px; color: #333; margin-bottom: 8px; }\n  p.title { text-align: center; font-weight: bold; font-size: 15px; margin-bottom: 12px; }\n  p.lead { font-weight: 600; margin-top: 8px; }\n  .gap { height: 10px; }\n  .field { display: flex; gap: 8px; align-items: baseline; margin: 6px 0; font-size: 13px; }\n  .field .label { flex: none; }\n  .field .fill { flex: 1; border-bottom: 1px solid #000; min-height: 1.2em; display: inline-block; }\n  .field .value b { font-weight: 600; }\n  .sign { margin-top: 18px; text-align: right; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <p class="formtitle">FORM XIII</p>\n<p class="title">[ See Rule 75 ]</p>\n<p class="lead">Register of Workmen Employed by Contractor</p>\n<p>Name and address of Contractor …………………………………………………………………………………………....................................................................................</p>\n<p>………………………………………………………………………………………………………………………………………………………………………………………………………………………………</p>\n<p>Nature and location of work ………………………………………………………………………………………………………………………………………………………………………………..</p>\n<p>Name and address of establishment in/under which contract is carried on …………………………………………………………………………………………………………</p>\n<p>……………………………………………………………………………………………………………………………………………………………………………………………………………………………… Name and address of Principal Employer ……………………………………………………………………………………………………………………………………………………………..</p>\n<p>……………………………………………………………………………………………………………………………………………………………………………………………………………………………..</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<div class="gap"></div>\n</body></html>',
'columns': [
            'SI. No.',
'Name and surname of workmen',
'Age and Sex',
'Father’s/ Husband’s name',
'Nature of Employment/ Designation',
'Permanent house a ddress of workman (Village and t e hsil/ t aluk and d istrict)',
'Local Address',
'Date of commencement of employment',
'Signature or thumb impression of workman`',
'Date of termination of employment',
'Reason for termination',
'Remarks'
        ],
'field_mappings': {
            'Permanent house a ddress of workman (Village and t e hsil/ t aluk and d istrict)': 'Address',
'Date of termination of employment': 'Date_Of_Leaving',
'SI. No.': 'sl',
'Name and surname of workmen': 'Employee_Name',
'Age and Sex': 'Gender',
'Father’s/ Husband’s name': 'Father_Name',
'Local Address': 'Address',
'Date of commencement of employment': 'Date_Of_Joining',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Gujarat',
'purpose': 'Wage Register',
'form_code': 'FORM XVII',
'title': 'Wage Register',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">See Rule 78(I)(a)(i)] FORM XVII</h1>\n<p>Register of Wages</p>\n<p>Name and address of the Contractor</p>\n<p>Name and address of Establishment in/under which contract is carried on</p>\n<p>Name and location of work</p>\n<p>Name and address of Principal Employer</p>\n<p>Wage Period: Monthly</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>Basic wages Dearness Allowance Overtime Other cash payments (Nature of payments to be indicated) Total</p>\n<p>Wage Period: Monthly ………………………………………………………………………………………………………………………………………………………………………………………....</p>\n</body></html>',
'columns': [
            'Sl. No.',
'Name of workmen',
'Sl. No. in the register of workmen',
'Designation/ Nature of employment',
'No. of days worked',
'Unit of work done',
'Daily-rate of wages/piece-rate',
'Amount of wages earned',
'Deductions if any (indicate nature)',
'Net amount paid',
'Signature/Thumb impression of workmen',
'Initial of contractor or his representative'
        ],
'field_mappings': {
            'Unit of work done': 'NO_ofunit_Per_Piece',
'Sl. No.': 'sl',
'Name of workmen': 'Employee_Name',
'Sl. No. in the register of workmen': 'sl',
'Designation/ Nature of employment': 'Designation',
'No. of days worked': 'Total_Days_Worked',
'Daily-rate of wages/piece-rate': 'Normal_Rate',
'Amount of wages earned': 'Gross_Wages',
'Deductions if any (indicate nature)': 'Total_Deductions',
'Net amount paid': 'Net_Salary'
        },
'calculation_rules': [
            {
                'target': 'grossWages',
'label': 'Gross wages',
'formula': 'daysWorked * dailyRate'
            },
{
                'target': 'netSalary',
'label': 'Net amount paid',
'formula': 'grossWages - totalDeductions'
            }
        ]
    },
{
        'state': 'Haryana',
'purpose': 'Deductions for Damage or Loss',
'form_code': 'FORM XVI',
'title': 'Register of Deductions for Damage or Loss',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">See Rule 78(1)(a)(i FORM XVI</h1>\n<p>Muster Roll</p>\n<p>Name and address of Contractor</p>\n<p>Name and address of establishment in/under which contract is carried on</p>\n<p>Nature and location of work</p>\n<p>Name and address of Principal Employer</p>\n<p>For the month of</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>1…… 31</p>\n</body></html>',
'columns': [
            'Sl. No.',
'Name of workmen',
'Father’s/Husband’s name',
'Sex',
'Dates',
'Remarks'
        ],
'field_mappings': {
            'Sl. No.': 'sl',
'Name of workmen': 'Employee_Name',
'Father’s/Husband’s name': 'Father_Name',
'Sex': 'Gender',
'Dates': 'Date_Of_Joining',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Haryana',
'purpose': 'Register of Advances',
'form_code': 'FORM XVIII',
'title': 'Register of Advances',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Advances FORM XVIII</h1>\n<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[See rule 78 (1)(a)(ii)]</h2>\n<p style="margin:4px 0;font-size:12px;"><b>1. Name and Address of Contractor:</b> {{CONTRACTOR_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>2. Name and Address of establishment in/under which:</b> {{EMPLOYER_NAME}}</p>\n<p>contract is carried on.</p>\n<p style="margin:4px 0;font-size:12px;"><b>3. Nature and location of work:</b> {{SITE_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>4. Name and address of Principal Employer:</b> {{EMPLOYER_NAME}}</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>No Advance is given during the month of {{MONTH}} {{YEAR}}</p>\n</body></html>',
'columns': [
            'SI No.',
'Name of workmen',
"Father's/Husband's name",
'Nature of employment/Designation',
'Wage period and wages payable',
'Date and amount of advance given',
'Purpose(s) for which advance made',
'No. of instalments by which advance to be repaid',
'Date and amount of each instalments repaid',
'Date on which last instalments was repaid',
'Remarks'
        ],
'field_mappings': {
            'No. of instalments by which advance to be repaid': 'Advance_Installments',
"Father's/Husband's name": 'Father_Name',
'SI No.': 'sl',
'Name of workmen': 'Employee_Name',
'Nature of employment/Designation': 'Designation',
'Date and amount of advance given': 'Advance_Amount',
'Purpose(s) for which advance made': 'Advance_Purpose',
'Date and amount of each instalments repaid': 'Advance_Repaid_Amount',
'Date on which last instalments was repaid': 'Advance_Repaid_Date',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Haryana',
'purpose': 'Register of Fines',
'form_code': 'FORM XVII',
'title': 'Register of Fines',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">See Rule 78(I)(a)(i)] FORM XVII</h1>\n<p>Register of Wages</p>\n<p>Name and address of the Contractor</p>\n<p>Name and address of Establishment in/under which contract is carried on</p>\n<p>Name and location of work</p>\n<p>Name and address of Principal Employer</p>\n<p>Wage Period: Monthly</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>Basic wages Dearness Allowance Overtime Other cash payments (Nature of payments to be indicated) Total</p>\n<p>Wage Period: Monthly ………………………………………………………………………………………………………………………………………………………………………………………....</p>\n</body></html>',
'columns': [
            'Sl. No.',
'Name of workmen',
'Sl. No. in the register of workmen',
'Designation/ Nature of employment',
'No. of days worked',
'Unit of work done',
'Daily-rate of wages/piece-rate',
'Amount of wages earned',
'Deductions if any (indicate nature)',
'Net amount paid',
'Signature/Thumb impression of workmen',
'Initial of contractor or his representative'
        ],
'field_mappings': {
            'Unit of work done': 'NO_ofunit_Per_Piece',
'Sl. No.': 'sl',
'Name of workmen': 'Employee_Name',
'Sl. No. in the register of workmen': 'sl',
'Designation/ Nature of employment': 'Designation',
'No. of days worked': 'Total_Days_Worked',
'Daily-rate of wages/piece-rate': 'Normal_Rate',
'Amount of wages earned': 'Gross_Wages',
'Deductions if any (indicate nature)': 'Total_Deductions',
'Net amount paid': 'Net_Salary'
        },
'calculation_rules': [
            {
                'target': 'grossWages',
'label': 'Gross wages',
'formula': 'daysWorked * dailyRate'
            },
{
                'target': 'netSalary',
'label': 'Net amount paid',
'formula': 'grossWages - totalDeductions'
            }
        ]
    },
{
        'state': 'Haryana',
'purpose': 'Register of Overtime',
'form_code': 'FORM XIX',
'title': 'Register of Overtime',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  p.formtitle { text-align: center; font-weight: bold; font-size: 15px; }\n  p.title { text-align: center; font-weight: bold; font-size: 15px; margin-bottom: 10px; }\n  .field { display: flex; gap: 8px; margin: 6px 0; font-size: 13px; }\n  .field .label { flex: none; }\n  .field .fill { flex: 1; border-bottom: 1px solid #000; min-height: 1.2em; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 4px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <p class="formtitle">FORM XIX</p>\n<p class="rule">*[See Rule 78(1) (b)]</p>\n<p class="title">Wage Slip</p>\n<div class="field"><span class="label">Name and Address of Contractor:</span><span class="fill"></span></div>\n<div class="field"><span class="label">Nature and location of work:</span><span class="fill"></span></div>\n<div class="field"><span class="label">Name and Father’s/Husband’s name of the workman:</span><span class="fill"></span></div>\n<div class="field"><span class="label">For the Week/Fortnight/Month ending:</span><span class="fill"></span></div>\n<div class="field"><span class="label">1. No. of days worked:</span><span class="fill"></span></div>\n<div class="field"><span class="label">2. No. of unit worked in case of piece-rate workers:</span><span class="fill"></span></div>\n<div class="field"><span class="label">3. Rate of daily wages/piece-rate:</span><span class="fill"></span></div>\n<div class="field"><span class="label">4. Amount of overtime wages:</span><span class="fill"></span></div>\n<div class="field"><span class="label">5. Gross wages payable:</span><span class="fill"></span></div>\n<div class="field"><span class="label">6. Deductions, if any:</span><span class="fill"></span></div>\n<div class="field"><span class="label">7. Net amount of wages paid:</span><span class="fill"></span></div>\n<div class="field"><span class="label">Initials of the Contractor or his:</span><span class="fill"></span></div>\n<div class="field"><span class="label">Representative:</span><span class="fill"></span></div>\n<p>*Substituted for the brackets, words, figures and letter “[See Rule 78(2) (b)]” by GSR 948, dated 12-7-1978, w.e.f. 22-7-1978.</p>\n</body></html>',
'columns': [],
'field_mappings': {
            
        },
'calculation_rules': []
    },
{
        'state': 'Haryana',
'purpose': 'Register of Workmen',
'form_code': 'FORM IX',
'title': 'Register of Workmen',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">(See Rule 74) FORM IX</h1>\n<p>Register of workmen employed by Contractor</p>\n<p>Name and address of contractor…. Name and address of establisment in/under which contract is carried on…</p>\n<p>Nature and location of work….. Name and address of Principal Employers…..</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n</body></html>',
'columns': [
            'Sl. No.',
'Name and surname of workmen',
'Age and sex',
"Father's/husband's name",
'Nature of employment/designation',
'Permanent home address of workman (Village and Tehsil/Taluka and District)',
'Present Address',
'Date of commencement of employment',
'Date of termination of employment',
'Signature or thumb impression of workman',
'Remarks'
        ],
'field_mappings': {
            'Permanent home address of workman (Village and Tehsil/Taluka and District)': 'Address',
'Present Address': 'Address',
'Date of termination of employment': 'Date_Of_Leaving',
'Sl. No.': 'sl',
'Name and surname of workmen': 'Employee_Name',
'Age and sex': 'Gender',
"Father's/husband's name": 'Father_Name',
'Nature of employment/designation': 'Designation',
'Date of commencement of employment': 'Date_Of_Joining',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Haryana',
'purpose': 'Wage Register',
'form_code': 'FORM XIII',
'title': 'Wage Register',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  p.formtitle { text-align: center; font-weight: bold; font-size: 15px; margin-bottom: 2px; }\n  p.rule { text-align: center; font-size: 11px; color: #333; margin-bottom: 8px; }\n  p.title { text-align: center; font-weight: bold; font-size: 15px; margin-bottom: 12px; }\n  p.lead { font-weight: 600; margin-top: 8px; }\n  .gap { height: 10px; }\n  .field { display: flex; gap: 8px; align-items: baseline; margin: 6px 0; font-size: 13px; }\n  .field .label { flex: none; }\n  .field .fill { flex: 1; border-bottom: 1px solid #000; min-height: 1.2em; display: inline-block; }\n  .field .value b { font-weight: 600; }\n  .sign { margin-top: 18px; text-align: right; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <p class="formtitle">FORM XIII</p>\n<p class="title">[ See Rule 75 ]</p>\n<p class="lead">Register of Workmen Employed by Contractor</p>\n<p>Name and address of Contractor …………………………………………………………………………………………....................................................................................</p>\n<p>………………………………………………………………………………………………………………………………………………………………………………………………………………………………</p>\n<p>Nature and location of work ………………………………………………………………………………………………………………………………………………………………………………..</p>\n<p>Name and address of establishment in/under which contract is carried on …………………………………………………………………………………………………………</p>\n<p>……………………………………………………………………………………………………………………………………………………………………………………………………………………………… Name and address of Principal Employer ……………………………………………………………………………………………………………………………………………………………..</p>\n<p>……………………………………………………………………………………………………………………………………………………………………………………………………………………………..</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<div class="gap"></div>\n</body></html>',
'columns': [
            'SI. No.',
'Name and surname of workmen',
'Age and Sex',
'Father’s/ Husband’s name',
'Nature of Employment/ Designation',
'Permanent house a ddress of workman (Village and t e hsil/ t aluk and d istrict)',
'Local Address',
'Date of commencement of employment',
'Signature or thumb impression of workman`',
'Date of termination of employment',
'Reason for termination',
'Remarks'
        ],
'field_mappings': {
            'Permanent house a ddress of workman (Village and t e hsil/ t aluk and d istrict)': 'Address',
'Date of termination of employment': 'Date_Of_Leaving',
'SI. No.': 'sl',
'Name and surname of workmen': 'Employee_Name',
'Age and Sex': 'Gender',
'Father’s/ Husband’s name': 'Father_Name',
'Local Address': 'Address',
'Date of commencement of employment': 'Date_Of_Joining',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Himachal Pradesh',
'purpose': 'Deductions for Damage or Loss',
'form_code': 'FORM XX',
'title': 'Register of Deductions for Damage or Loss',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Deductions for Damage or Loss FORM XX</h1>\n<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[See rule 78 (1)(a)(ii)]</h2>\n<p style="margin:4px 0;font-size:12px;"><b>1. Name and Address of Contractor:</b> {{CONTRACTOR_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>2. Name and Address of establishment in/under which:</b> {{EMPLOYER_NAME}}</p>\n<p>contract is carried on.</p>\n<p style="margin:4px 0;font-size:12px;"><b>3. Nature and location of work:</b> {{SITE_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>4. Name and address of Principal Employer:</b> {{EMPLOYER_NAME}}</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>There is no deduction for damage or Loss during the month of {{MONTH}} {{YEAR}}</p>\n<p>\\</p>\n</body></html>',
'columns': [
            'SI No.',
'Name of workmen',
"Father's/Husband's name",
'Designation',
'Particulars of damage or loss',
'Date of damage or loss',
'Whether workman showed cause against deduction',
"Name of person in whose presence employee's was heard",
'Amount of deduction imposed',
'No. of instalments',
'First Instalments',
'Last Instalments',
'Remarks'
        ],
'field_mappings': {
            "Father's/Husband's name": 'Father_Name',
'SI No.': 'sl',
'Name of workmen': 'Employee_Name',
'Designation': 'Designation',
'Particulars of damage or loss': 'Loss_Caused',
'Date of damage or loss': 'Date_of_Damage',
'Amount of deduction imposed': 'Deduction_Amount',
'No. of instalments': 'Deduction_Installments',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Himachal Pradesh',
'purpose': 'MusterRoll',
'form_code': 'FORM XVI',
'title': 'Muster Roll cum Wage Register',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">See Rule 78(1)(a)(i FORM XVI</h1>\n<p>Muster Roll</p>\n<p>Name and address of Contractor</p>\n<p>Name and address of establishment in/under which contract is carried on</p>\n<p>Nature and location of work</p>\n<p>Name and address of Principal Employer</p>\n<p>For the month of</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>1…… 31</p>\n</body></html>',
'columns': [
            'Sl. No.',
'Name of workmen',
'Father’s/Husband’s name',
'Sex',
'Dates',
'Remarks'
        ],
'field_mappings': {
            'Sl. No.': 'sl',
'Name of workmen': 'Employee_Name',
'Father’s/Husband’s name': 'Father_Name',
'Sex': 'Gender',
'Dates': 'Date_Of_Joining',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Himachal Pradesh',
'purpose': 'Register of Advances',
'form_code': 'FORM XXII',
'title': 'Register of Advances',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Advances FORM XXII</h1>\n<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[See rule 78 (1)(a)(ii)]</h2>\n<p style="margin:4px 0;font-size:12px;"><b>1. Name and Address of Contractor:</b> {{CONTRACTOR_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>2. Name and Address of establishment in/under which:</b> {{EMPLOYER_NAME}}</p>\n<p>contract is carried on.</p>\n<p style="margin:4px 0;font-size:12px;"><b>3. Nature and location of work:</b> {{SITE_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>4. Name and address of Principal Employer:</b> {{EMPLOYER_NAME}}</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>No Advance is given during the month of {{MONTH}} {{YEAR}}</p>\n</body></html>',
'columns': [
            'SI No.',
'Name of workmen',
"Father's/Husband's name",
'Nature of employment/Designation',
'Wage period and wages payable',
'Date and amount of advance given',
'Purpose(s) for which advance made',
'No. of instalments by which advance to be repaid',
'Date and amount of each instalments repaid',
'Date on which last instalments was repaid',
'Remarks'
        ],
'field_mappings': {
            'SI No.': 'sl',
'Name of workmen': 'Employee_Name',
"Father's/Husband's name": 'Father_Name',
'Nature of employment/Designation': 'Designation',
'Date and amount of advance given': 'Advance_Amount',
'Purpose(s) for which advance made': 'Advance_Purpose',
'No. of instalments by which advance to be repaid': 'Advance_Installments',
'Date and amount of each instalments repaid': 'Advance_Repaid_Amount',
'Date on which last instalments was repaid': 'Advance_Repaid_Date',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Himachal Pradesh',
'purpose': 'Register of Fines',
'form_code': 'FORM XXI',
'title': 'Register of Fines',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Fines FORM XXI</h1>\n<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[See rule 78 (1)(a)(ii)]</h2>\n<p style="margin:4px 0;font-size:12px;"><b>1. Name and Address of Contractor:</b> {{CONTRACTOR_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>2. Name and Address of establishment in/under which:</b> {{EMPLOYER_NAME}}</p>\n<p>contract is carried on.</p>\n<p style="margin:4px 0;font-size:12px;"><b>3. Nature and location of work:</b> {{SITE_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>4. Name and address of Principal Employer:</b> {{EMPLOYER_NAME}}</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>No fine imposed during the month of {{MONTH}} {{YEAR}}</p>\n</body></html>',
'columns': [
            'SI No.',
'Name of workmen',
"Father's/Husband's name",
'Designation/nature for fine imposed',
'Act/Ommission for which imposed',
'Date of Offence',
'Whether workman showed cause against fine',
"Name of person in whose presence employee's was heard",
'Wage periods and wages payable',
'Amount of fine imposed',
'Date on which fine realised',
'Remarks'
        ],
'field_mappings': {
            'SI No.': 'sl',
'Name of workmen': 'Employee_Name',
"Father's/Husband's name": 'Father_Name',
'Act/Ommission for which imposed': 'Fine_Offence_Nature',
'Date of Offence': 'Fine_Offence_Date',
'Amount of fine imposed': 'Fine_Amount',
'Date on which fine realised': 'Fine_Realised_Date',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Himachal Pradesh',
'purpose': 'Register of Overtime',
'form_code': 'FORM XXIII',
'title': 'Register of Overtime',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Overtime FORM XXIII</h1>\n<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[See rule 78 (1)(a)(iii)]</h2>\n<p style="margin:4px 0;font-size:12px;"><b>1. Name and Address of Contractor:</b> {{CONTRACTOR_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>2. Name and Address of establishment in/under which:</b> {{EMPLOYER_NAME}}</p>\n<p>contract is carried on.</p>\n<p style="margin:4px 0;font-size:12px;"><b>3. Nature and location of work:</b> {{SITE_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>4. Name and address of Principal Employer:</b> {{EMPLOYER_NAME}}</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>No overtime work is done during the month of {{MONTH}} {{YEAR}}</p>\n</body></html>',
'columns': [
            'SI No.',
'Name of workman',
"Father's/Husband's name",
'Sex',
'Designation/nature of employment',
'Date on which overtime worked',
'Total overtime worked',
'Normal rate of wages',
'Overtime rate of wages',
'Overtime earnings',
'Date on which overtime wages paid',
'Remarks'
        ],
'field_mappings': {
            'SI No.': 'sl',
'Name of workman': 'Employee_Name',
"Father's/Husband's name": 'Father_Name',
'Sex': 'Gender',
'Designation/nature of employment': 'Designation',
'Date on which overtime worked': 'Overtime_Date',
'Total overtime worked': 'Overtime_Extent',
'Normal rate of wages': 'Normal_Rate',
'Overtime rate of wages': 'Overtime_Rate',
'Overtime earnings': 'Overtime_Earnings',
'Date on which overtime wages paid': 'Overtime_Payment_Date',
'Remarks': 'Remarks'
        },
'calculation_rules': [
            {
                'target': 'otEarnings',
'label': 'Overtime wages',
'formula': 'otHours * otRate'
            }
        ]
    },
{
        'state': 'Himachal Pradesh',
'purpose': 'Register of Workmen',
'form_code': 'FORM XIII',
'title': 'Register of Workmen',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  p.formtitle { text-align: center; font-weight: bold; font-size: 15px; margin-bottom: 2px; }\n  p.rule { text-align: center; font-size: 11px; color: #333; margin-bottom: 8px; }\n  p.title { text-align: center; font-weight: bold; font-size: 15px; margin-bottom: 12px; }\n  p.lead { font-weight: 600; margin-top: 8px; }\n  .gap { height: 10px; }\n  .field { display: flex; gap: 8px; align-items: baseline; margin: 6px 0; font-size: 13px; }\n  .field .label { flex: none; }\n  .field .fill { flex: 1; border-bottom: 1px solid #000; min-height: 1.2em; display: inline-block; }\n  .field .value b { font-weight: 600; }\n  .sign { margin-top: 18px; text-align: right; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <p class="formtitle">FORM XIII</p>\n<p class="title">[ See Rule 75 ]</p>\n<p class="lead">Register of Workmen Employed by Contractor</p>\n<p>Name and address of Contractor …………………………………………………………………………………………....................................................................................</p>\n<p>………………………………………………………………………………………………………………………………………………………………………………………………………………………………</p>\n<p>Nature and location of work ………………………………………………………………………………………………………………………………………………………………………………..</p>\n<p>Name and address of establishment in/under which contract is carried on …………………………………………………………………………………………………………</p>\n<p>……………………………………………………………………………………………………………………………………………………………………………………………………………………………… Name and address of Principal Employer ……………………………………………………………………………………………………………………………………………………………..</p>\n<p>……………………………………………………………………………………………………………………………………………………………………………………………………………………………..</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<div class="gap"></div>\n</body></html>',
'columns': [
            'SI. No.',
'Name and surname of workmen',
'Age and Sex',
'Father’s/ Husband’s name',
'Nature of Employment/ Designation',
'Permanent house a ddress of workman (Village and t e hsil/ t aluk and d istrict)',
'Local Address',
'Date of commencement of employment',
'Signature or thumb impression of workman`',
'Date of termination of employment',
'Reason for termination',
'Remarks'
        ],
'field_mappings': {
            'Date of termination of employment': 'Date_Of_Leaving',
'SI. No.': 'sl',
'Name and surname of workmen': 'Employee_Name',
'Age and Sex': 'Gender',
'Father’s/ Husband’s name': 'Father_Name',
'Permanent house a ddress of workman (Village and t e hsil/ t aluk and d istrict)': 'Address',
'Local Address': 'Address',
'Date of commencement of employment': 'Date_Of_Joining',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Himachal Pradesh',
'purpose': 'Wage Register',
'form_code': 'FORM XVII',
'title': 'Wage Register',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">See Rule 78(I)(a)(i)] FORM XVII</h1>\n<p>Register of Wages</p>\n<p>Name and address of the Contractor</p>\n<p>Name and address of Establishment in/under which contract is carried on</p>\n<p>Name and location of work</p>\n<p>Name and address of Principal Employer</p>\n<p>Wage Period: Monthly</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>Basic wages Dearness Allowance Overtime Other cash payments (Nature of payments to be indicated) Total</p>\n<p>Wage Period: Monthly ………………………………………………………………………………………………………………………………………………………………………………………....</p>\n</body></html>',
'columns': [
            'Sl. No.',
'Name of workmen',
'Sl. No. in the register of workmen',
'Designation/ Nature of employment',
'No. of days worked',
'Unit of work done',
'Daily-rate of wages/piece-rate',
'Amount of wages earned',
'Deductions if any (indicate nature)',
'Net amount paid',
'Signature/Thumb impression of workmen',
'Initial of contractor or his representative'
        ],
'field_mappings': {
            'Unit of work done': 'NO_ofunit_Per_Piece',
'Sl. No.': 'sl',
'Name of workmen': 'Employee_Name',
'Sl. No. in the register of workmen': 'sl',
'Designation/ Nature of employment': 'Designation',
'No. of days worked': 'Total_Days_Worked',
'Daily-rate of wages/piece-rate': 'Normal_Rate',
'Amount of wages earned': 'Gross_Wages',
'Deductions if any (indicate nature)': 'Total_Deductions',
'Net amount paid': 'Net_Salary'
        },
'calculation_rules': [
            {
                'target': 'grossWages',
'label': 'Gross wages',
'formula': 'daysWorked * dailyRate'
            },
{
                'target': 'netSalary',
'label': 'Net amount paid',
'formula': 'grossWages - totalDeductions'
            }
        ]
    },
{
        'state': 'Jammu & Kashmir',
'purpose': 'Deductions for Damage or Loss',
'form_code': 'FORM XX',
'title': 'Register of Deductions for Damage or Loss',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Deductions for Damage or Loss FORM XX</h1>\n<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[See rule 78 (1)(a)(ii)]</h2>\n<p style="margin:4px 0;font-size:12px;"><b>1. Name and Address of Contractor:</b> {{CONTRACTOR_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>2. Name and Address of establishment in/under which:</b> {{EMPLOYER_NAME}}</p>\n<p>contract is carried on.</p>\n<p style="margin:4px 0;font-size:12px;"><b>3. Nature and location of work:</b> {{SITE_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>4. Name and address of Principal Employer:</b> {{EMPLOYER_NAME}}</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>There is no deduction for damage or Loss during the month of {{MONTH}} {{YEAR}}</p>\n<p>\\</p>\n</body></html>',
'columns': [
            'SI No.',
'Name of workmen',
"Father's/Husband's name",
'Designation',
'Particulars of damage or loss',
'Date of damage or loss',
'Whether workman showed cause against deduction',
"Name of person in whose presence employee's was heard",
'Amount of deduction imposed',
'No. of instalments',
'First Instalments',
'Last Instalments',
'Remarks'
        ],
'field_mappings': {
            'Name of workmen': 'Employee_Name',
'SI No.': 'sl',
"Father's/Husband's name": 'Father_Name',
'Designation': 'Designation',
'Particulars of damage or loss': 'Loss_Caused',
'Date of damage or loss': 'Date_of_Damage',
'Amount of deduction imposed': 'Deduction_Amount',
'No. of instalments': 'Deduction_Installments',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Jammu & Kashmir',
'purpose': 'MusterRoll',
'form_code': 'FORM XVI',
'title': 'Muster Roll cum Wage Register',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">See Rule 78(1)(a)(i FORM XVI</h1>\n<p>Muster Roll</p>\n<p>Name and address of Contractor</p>\n<p>Name and address of establishment in/under which contract is carried on</p>\n<p>Nature and location of work</p>\n<p>Name and address of Principal Employer</p>\n<p>For the month of</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>1…… 31</p>\n</body></html>',
'columns': [
            'Sl. No.',
'Name of workmen',
'Father’s/Husband’s name',
'Sex',
'Dates',
'Remarks'
        ],
'field_mappings': {
            'Sl. No.': 'sl',
'Name of workmen': 'Employee_Name',
'Father’s/Husband’s name': 'Father_Name',
'Sex': 'Gender',
'Dates': 'Date_Of_Joining',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Jammu & Kashmir',
'purpose': 'Register of Advances',
'form_code': 'FORM XXII',
'title': 'Register of Advances',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Advances FORM XXII</h1>\n<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[See rule 78 (1)(a)(ii)]</h2>\n<p style="margin:4px 0;font-size:12px;"><b>1. Name and Address of Contractor:</b> {{CONTRACTOR_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>2. Name and Address of establishment in/under which:</b> {{EMPLOYER_NAME}}</p>\n<p>contract is carried on.</p>\n<p style="margin:4px 0;font-size:12px;"><b>3. Nature and location of work:</b> {{SITE_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>4. Name and address of Principal Employer:</b> {{EMPLOYER_NAME}}</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>No Advance is given during the month of {{MONTH}} {{YEAR}}</p>\n</body></html>',
'columns': [
            'SI No.',
'Name of workmen',
"Father's/Husband's name",
'Nature of employment/Designation',
'Wage period and wages payable',
'Date and amount of advance given',
'Purpose(s) for which advance made',
'No. of instalments by which advance to be repaid',
'Date and amount of each instalments repaid',
'Date on which last instalments was repaid',
'Remarks'
        ],
'field_mappings': {
            'No. of instalments by which advance to be repaid': 'Advance_Installments',
'SI No.': 'sl',
'Name of workmen': 'Employee_Name',
"Father's/Husband's name": 'Father_Name',
'Nature of employment/Designation': 'Designation',
'Date and amount of advance given': 'Advance_Amount',
'Purpose(s) for which advance made': 'Advance_Purpose',
'Date and amount of each instalments repaid': 'Advance_Repaid_Amount',
'Date on which last instalments was repaid': 'Advance_Repaid_Date',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Jammu & Kashmir',
'purpose': 'Register of Fines',
'form_code': 'FORM XXI',
'title': 'Register of Fines',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Fines FORM XXI</h1>\n<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[See rule 78 (1)(a)(ii)]</h2>\n<p style="margin:4px 0;font-size:12px;"><b>1. Name and Address of Contractor:</b> {{CONTRACTOR_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>2. Name and Address of establishment in/under which:</b> {{EMPLOYER_NAME}}</p>\n<p>contract is carried on.</p>\n<p style="margin:4px 0;font-size:12px;"><b>3. Nature and location of work:</b> {{SITE_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>4. Name and address of Principal Employer:</b> {{EMPLOYER_NAME}}</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>No fine imposed during the month of {{MONTH}} {{YEAR}}</p>\n</body></html>',
'columns': [
            'SI No.',
'Name of workmen',
"Father's/Husband's name",
'Designation/nature for fine imposed',
'Act/Ommission for which imposed',
'Date of Offence',
'Whether workman showed cause against fine',
"Name of person in whose presence employee's was heard",
'Wage periods and wages payable',
'Amount of fine imposed',
'Date on which fine realised',
'Remarks'
        ],
'field_mappings': {
            'SI No.': 'sl',
'Name of workmen': 'Employee_Name',
"Father's/Husband's name": 'Father_Name',
'Act/Ommission for which imposed': 'Fine_Offence_Nature',
'Date of Offence': 'Fine_Offence_Date',
'Amount of fine imposed': 'Fine_Amount',
'Date on which fine realised': 'Fine_Realised_Date',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Jammu & Kashmir',
'purpose': 'Register of Overtime',
'form_code': 'FORM XXIII',
'title': 'Register of Overtime',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Overtime FORM XXIII</h1>\n<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[See rule 78 (1)(a)(iii)]</h2>\n<p style="margin:4px 0;font-size:12px;"><b>1. Name and Address of Contractor:</b> {{CONTRACTOR_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>2. Name and Address of establishment in/under which:</b> {{EMPLOYER_NAME}}</p>\n<p>contract is carried on.</p>\n<p style="margin:4px 0;font-size:12px;"><b>3. Nature and location of work:</b> {{SITE_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>4. Name and address of Principal Employer:</b> {{EMPLOYER_NAME}}</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>No overtime work is done during the month of {{MONTH}} {{YEAR}}</p>\n</body></html>',
'columns': [
            'SI No.',
'Name of workman',
"Father's/Husband's name",
'Sex',
'Designation/nature of employment',
'Date on which overtime worked',
'Total overtime worked',
'Normal rate of wages',
'Overtime rate of wages',
'Overtime earnings',
'Date on which overtime wages paid',
'Remarks'
        ],
'field_mappings': {
            'SI No.': 'sl',
'Name of workman': 'Employee_Name',
"Father's/Husband's name": 'Father_Name',
'Sex': 'Gender',
'Designation/nature of employment': 'Designation',
'Date on which overtime worked': 'Overtime_Date',
'Total overtime worked': 'Overtime_Extent',
'Normal rate of wages': 'Normal_Rate',
'Overtime rate of wages': 'Overtime_Rate',
'Overtime earnings': 'Overtime_Earnings',
'Date on which overtime wages paid': 'Overtime_Payment_Date',
'Remarks': 'Remarks'
        },
'calculation_rules': [
            {
                'target': 'otEarnings',
'label': 'Overtime wages',
'formula': 'otHours * otRate'
            }
        ]
    },
{
        'state': 'Jammu & Kashmir',
'purpose': 'Register of Workmen',
'form_code': 'FORM XIII',
'title': 'Register of Workmen',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  p.formtitle { text-align: center; font-weight: bold; font-size: 15px; margin-bottom: 2px; }\n  p.rule { text-align: center; font-size: 11px; color: #333; margin-bottom: 8px; }\n  p.title { text-align: center; font-weight: bold; font-size: 15px; margin-bottom: 12px; }\n  p.lead { font-weight: 600; margin-top: 8px; }\n  .gap { height: 10px; }\n  .field { display: flex; gap: 8px; align-items: baseline; margin: 6px 0; font-size: 13px; }\n  .field .label { flex: none; }\n  .field .fill { flex: 1; border-bottom: 1px solid #000; min-height: 1.2em; display: inline-block; }\n  .field .value b { font-weight: 600; }\n  .sign { margin-top: 18px; text-align: right; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <p class="formtitle">FORM XIII</p>\n<p class="title">[ See Rule 75 ]</p>\n<p class="lead">Register of Workmen Employed by Contractor</p>\n<p>Name and address of Contractor …………………………………………………………………………………………....................................................................................</p>\n<p>………………………………………………………………………………………………………………………………………………………………………………………………………………………………</p>\n<p>Nature and location of work ………………………………………………………………………………………………………………………………………………………………………………..</p>\n<p>Name and address of establishment in/under which contract is carried on …………………………………………………………………………………………………………</p>\n<p>……………………………………………………………………………………………………………………………………………………………………………………………………………………………… Name and address of Principal Employer ……………………………………………………………………………………………………………………………………………………………..</p>\n<p>……………………………………………………………………………………………………………………………………………………………………………………………………………………………..</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<div class="gap"></div>\n</body></html>',
'columns': [
            'SI. No.',
'Name and surname of workmen',
'Age and Sex',
'Father’s/ Husband’s name',
'Nature of Employment/ Designation',
'Permanent house a ddress of workman (Village and t e hsil/ t aluk and d istrict)',
'Local Address',
'Date of commencement of employment',
'Signature or thumb impression of workman`',
'Date of termination of employment',
'Reason for termination',
'Remarks'
        ],
'field_mappings': {
            'Permanent house a ddress of workman (Village and t e hsil/ t aluk and d istrict)': 'Address',
'Date of termination of employment': 'Date_Of_Leaving',
'SI. No.': 'sl',
'Name and surname of workmen': 'Employee_Name',
'Age and Sex': 'Gender',
'Father’s/ Husband’s name': 'Father_Name',
'Local Address': 'Address',
'Date of commencement of employment': 'Date_Of_Joining',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Jammu & Kashmir',
'purpose': 'Wage Register',
'form_code': 'FORM XVII',
'title': 'Wage Register',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">See Rule 78(I)(a)(i)] FORM XVII</h1>\n<p>Register of Wages</p>\n<p>Name and address of the Contractor</p>\n<p>Name and address of Establishment in/under which contract is carried on</p>\n<p>Name and location of work</p>\n<p>Name and address of Principal Employer</p>\n<p>Wage Period: Monthly</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>Basic wages Dearness Allowance Overtime Other cash payments (Nature of payments to be indicated) Total</p>\n<p>Wage Period: Monthly ………………………………………………………………………………………………………………………………………………………………………………………....</p>\n</body></html>',
'columns': [
            'Sl. No.',
'Name of workmen',
'Sl. No. in the register of workmen',
'Designation/ Nature of employment',
'No. of days worked',
'Unit of work done',
'Daily-rate of wages/piece-rate',
'Amount of wages earned',
'Deductions if any (indicate nature)',
'Net amount paid',
'Signature/Thumb impression of workmen',
'Initial of contractor or his representative'
        ],
'field_mappings': {
            'Unit of work done': 'NO_ofunit_Per_Piece',
'Sl. No.': 'sl',
'Name of workmen': 'Employee_Name',
'Sl. No. in the register of workmen': 'sl',
'Designation/ Nature of employment': 'Designation',
'No. of days worked': 'Total_Days_Worked',
'Daily-rate of wages/piece-rate': 'Normal_Rate',
'Amount of wages earned': 'Gross_Wages',
'Deductions if any (indicate nature)': 'Total_Deductions',
'Net amount paid': 'Net_Salary'
        },
'calculation_rules': [
            {
                'target': 'grossWages',
'label': 'Gross wages',
'formula': 'daysWorked * dailyRate'
            },
{
                'target': 'netSalary',
'label': 'Net amount paid',
'formula': 'grossWages - totalDeductions'
            }
        ]
    },
{
        'state': 'Jharkhand',
'purpose': 'Deductions for Damage or Loss',
'form_code': 'FORM XX',
'title': 'Register of Deductions for Damage or Loss',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Deductions for Damage or Loss FORM XX</h1>\n<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[See rule 78 (1)(a)(ii)]</h2>\n<p style="margin:4px 0;font-size:12px;"><b>1. Name and Address of Contractor:</b> {{CONTRACTOR_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>2. Name and Address of establishment in/under which:</b> {{EMPLOYER_NAME}}</p>\n<p>contract is carried on.</p>\n<p style="margin:4px 0;font-size:12px;"><b>3. Nature and location of work:</b> {{SITE_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>4. Name and address of Principal Employer:</b> {{EMPLOYER_NAME}}</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>There is no deduction for damage or Loss during the month of {{MONTH}} {{YEAR}}</p>\n<p>\\</p>\n</body></html>',
'columns': [
            'SI No.',
'Name of workmen',
"Father's/Husband's name",
'Designation',
'Particulars of damage or loss',
'Date of damage or loss',
'Whether workman showed cause against deduction',
"Name of person in whose presence employee's was heard",
'Amount of deduction imposed',
'No. of instalments',
'First Instalments',
'Last Instalments',
'Remarks'
        ],
'field_mappings': {
            'SI No.': 'sl',
'Name of workmen': 'Employee_Name',
"Father's/Husband's name": 'Father_Name',
'Designation': 'Designation',
'Particulars of damage or loss': 'Loss_Caused',
'Date of damage or loss': 'Date_of_Damage',
'Amount of deduction imposed': 'Deduction_Amount',
'No. of instalments': 'Deduction_Installments',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Jharkhand',
'purpose': 'MusterRoll',
'form_code': 'FORM XVI',
'title': 'Muster Roll cum Wage Register',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">See Rule 78(1)(a)(i FORM XVI</h1>\n<p>Muster Roll</p>\n<p>Name and address of Contractor</p>\n<p>Name and address of establishment in/under which contract is carried on</p>\n<p>Nature and location of work</p>\n<p>Name and address of Principal Employer</p>\n<p>For the month of</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>1…… 31</p>\n</body></html>',
'columns': [
            'Sl. No.',
'Name of workmen',
'Father’s/Husband’s name',
'Sex',
'Dates',
'Remarks'
        ],
'field_mappings': {
            'Sl. No.': 'sl',
'Name of workmen': 'Employee_Name',
'Father’s/Husband’s name': 'Father_Name',
'Sex': 'Gender',
'Dates': 'Date_Of_Joining',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Jharkhand',
'purpose': 'Register of Advances',
'form_code': 'FORM XXII',
'title': 'Register of Advances',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Advances FORM XXII</h1>\n<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[See rule 78 (1)(a)(ii)]</h2>\n<p style="margin:4px 0;font-size:12px;"><b>1. Name and Address of Contractor:</b> {{CONTRACTOR_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>2. Name and Address of establishment in/under which:</b> {{EMPLOYER_NAME}}</p>\n<p>contract is carried on.</p>\n<p style="margin:4px 0;font-size:12px;"><b>3. Nature and location of work:</b> {{SITE_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>4. Name and address of Principal Employer:</b> {{EMPLOYER_NAME}}</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>No Advance is given during the month of {{MONTH}} {{YEAR}}</p>\n</body></html>',
'columns': [
            'SI No.',
'Name of workmen',
"Father's/Husband's name",
'Nature of employment/Designation',
'Wage period and wages payable',
'Date and amount of advance given',
'Purpose(s) for which advance made',
'No. of instalments by which advance to be repaid',
'Date and amount of each instalments repaid',
'Date on which last instalments was repaid',
'Remarks'
        ],
'field_mappings': {
            'SI No.': 'sl',
'Name of workmen': 'Employee_Name',
"Father's/Husband's name": 'Father_Name',
'Nature of employment/Designation': 'Designation',
'Date and amount of advance given': 'Advance_Amount',
'Purpose(s) for which advance made': 'Advance_Purpose',
'No. of instalments by which advance to be repaid': 'Advance_Installments',
'Date and amount of each instalments repaid': 'Advance_Repaid_Amount',
'Date on which last instalments was repaid': 'Advance_Repaid_Date',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Jharkhand',
'purpose': 'Register of Fines',
'form_code': 'FORM XXI',
'title': 'Register of Fines',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Fines FORM XXI</h1>\n<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[See rule 78 (1)(a)(ii)]</h2>\n<p style="margin:4px 0;font-size:12px;"><b>1. Name and Address of Contractor:</b> {{CONTRACTOR_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>2. Name and Address of establishment in/under which:</b> {{EMPLOYER_NAME}}</p>\n<p>contract is carried on.</p>\n<p style="margin:4px 0;font-size:12px;"><b>3. Nature and location of work:</b> {{SITE_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>4. Name and address of Principal Employer:</b> {{EMPLOYER_NAME}}</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>No fine imposed during the month of {{MONTH}} {{YEAR}}</p>\n</body></html>',
'columns': [
            'SI No.',
'Name of workmen',
"Father's/Husband's name",
'Designation/nature for fine imposed',
'Act/Ommission for which imposed',
'Date of Offence',
'Whether workman showed cause against fine',
"Name of person in whose presence employee's was heard",
'Wage periods and wages payable',
'Amount of fine imposed',
'Date on which fine realised',
'Remarks'
        ],
'field_mappings': {
            'Act/Ommission for which imposed': 'Fine_Offence_Nature',
'SI No.': 'sl',
'Name of workmen': 'Employee_Name',
"Father's/Husband's name": 'Father_Name',
'Date of Offence': 'Fine_Offence_Date',
'Amount of fine imposed': 'Fine_Amount',
'Date on which fine realised': 'Fine_Realised_Date',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Jharkhand',
'purpose': 'Register of Overtime',
'form_code': 'FORM XXIII',
'title': 'Register of Overtime',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Overtime FORM XXIII</h1>\n<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[See rule 78 (1)(a)(iii)]</h2>\n<p style="margin:4px 0;font-size:12px;"><b>1. Name and Address of Contractor:</b> {{CONTRACTOR_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>2. Name and Address of establishment in/under which:</b> {{EMPLOYER_NAME}}</p>\n<p>contract is carried on.</p>\n<p style="margin:4px 0;font-size:12px;"><b>3. Nature and location of work:</b> {{SITE_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>4. Name and address of Principal Employer:</b> {{EMPLOYER_NAME}}</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>No overtime work is done during the month of {{MONTH}} {{YEAR}}</p>\n</body></html>',
'columns': [
            'SI No.',
'Name of workman',
"Father's/Husband's name",
'Sex',
'Designation/nature of employment',
'Date on which overtime worked',
'Total overtime worked',
'Normal rate of wages',
'Overtime rate of wages',
'Overtime earnings',
'Date on which overtime wages paid',
'Remarks'
        ],
'field_mappings': {
            'SI No.': 'sl',
'Name of workman': 'Employee_Name',
"Father's/Husband's name": 'Father_Name',
'Sex': 'Gender',
'Designation/nature of employment': 'Designation',
'Date on which overtime worked': 'Overtime_Date',
'Total overtime worked': 'Overtime_Extent',
'Normal rate of wages': 'Normal_Rate',
'Overtime rate of wages': 'Overtime_Rate',
'Overtime earnings': 'Overtime_Earnings',
'Date on which overtime wages paid': 'Overtime_Payment_Date',
'Remarks': 'Remarks'
        },
'calculation_rules': [
            {
                'target': 'otEarnings',
'label': 'Overtime wages',
'formula': 'otHours * otRate'
            }
        ]
    },
{
        'state': 'Jharkhand',
'purpose': 'Register of Workmen',
'form_code': 'FORM XIII',
'title': 'Register of Workmen',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  p.formtitle { text-align: center; font-weight: bold; font-size: 15px; margin-bottom: 2px; }\n  p.rule { text-align: center; font-size: 11px; color: #333; margin-bottom: 8px; }\n  p.title { text-align: center; font-weight: bold; font-size: 15px; margin-bottom: 12px; }\n  p.lead { font-weight: 600; margin-top: 8px; }\n  .gap { height: 10px; }\n  .field { display: flex; gap: 8px; align-items: baseline; margin: 6px 0; font-size: 13px; }\n  .field .label { flex: none; }\n  .field .fill { flex: 1; border-bottom: 1px solid #000; min-height: 1.2em; display: inline-block; }\n  .field .value b { font-weight: 600; }\n  .sign { margin-top: 18px; text-align: right; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <p class="formtitle">FORM XIII</p>\n<p class="title">[ See Rule 75 ]</p>\n<p class="lead">Register of Workmen Employed by Contractor</p>\n<p>Name and address of Contractor …………………………………………………………………………………………....................................................................................</p>\n<p>………………………………………………………………………………………………………………………………………………………………………………………………………………………………</p>\n<p>Nature and location of work ………………………………………………………………………………………………………………………………………………………………………………..</p>\n<p>Name and address of establishment in/under which contract is carried on …………………………………………………………………………………………………………</p>\n<p>……………………………………………………………………………………………………………………………………………………………………………………………………………………………… Name and address of Principal Employer ……………………………………………………………………………………………………………………………………………………………..</p>\n<p>……………………………………………………………………………………………………………………………………………………………………………………………………………………………..</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<div class="gap"></div>\n</body></html>',
'columns': [
            'SI. No.',
'Name and surname of workmen',
'Age and Sex',
'Father’s/ Husband’s name',
'Nature of Employment/ Designation',
'Permanent house a ddress of workman (Village and t e hsil/ t aluk and d istrict)',
'Local Address',
'Date of commencement of employment',
'Signature or thumb impression of workman`',
'Date of termination of employment',
'Reason for termination',
'Remarks'
        ],
'field_mappings': {
            'Date of termination of employment': 'Date_Of_Leaving',
'SI. No.': 'sl',
'Name and surname of workmen': 'Employee_Name',
'Age and Sex': 'Gender',
'Father’s/ Husband’s name': 'Father_Name',
'Permanent house a ddress of workman (Village and t e hsil/ t aluk and d istrict)': 'Address',
'Local Address': 'Address',
'Date of commencement of employment': 'Date_Of_Joining',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Jharkhand',
'purpose': 'Wage Register',
'form_code': 'FORM XVII',
'title': 'Wage Register',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">See Rule 78(I)(a)(i)] FORM XVII</h1>\n<p>Register of Wages</p>\n<p>Name and address of the Contractor</p>\n<p>Name and address of Establishment in/under which contract is carried on</p>\n<p>Name and location of work</p>\n<p>Name and address of Principal Employer</p>\n<p>Wage Period: Monthly</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>Basic wages Dearness Allowance Overtime Other cash payments (Nature of payments to be indicated) Total</p>\n<p>Wage Period: Monthly ………………………………………………………………………………………………………………………………………………………………………………………....</p>\n</body></html>',
'columns': [
            'Sl. No.',
'Name of workmen',
'Sl. No. in the register of workmen',
'Designation/ Nature of employment',
'No. of days worked',
'Unit of work done',
'Daily-rate of wages/piece-rate',
'Amount of wages earned',
'Deductions if any (indicate nature)',
'Net amount paid',
'Signature/Thumb impression of workmen',
'Initial of contractor or his representative'
        ],
'field_mappings': {
            'Unit of work done': 'NO_ofunit_Per_Piece',
'Sl. No.': 'sl',
'Name of workmen': 'Employee_Name',
'Sl. No. in the register of workmen': 'sl',
'Designation/ Nature of employment': 'Designation',
'No. of days worked': 'Total_Days_Worked',
'Daily-rate of wages/piece-rate': 'Normal_Rate',
'Amount of wages earned': 'Gross_Wages',
'Deductions if any (indicate nature)': 'Total_Deductions',
'Net amount paid': 'Net_Salary'
        },
'calculation_rules': [
            {
                'target': 'grossWages',
'label': 'Gross wages',
'formula': 'daysWorked * dailyRate'
            },
{
                'target': 'netSalary',
'label': 'Net amount paid',
'formula': 'grossWages - totalDeductions'
            }
        ]
    },
{
        'state': 'Karnataka',
'purpose': 'Deductions for Damage or Loss',
'form_code': 'FORM XX',
'title': 'Register of Deductions for Damage or Loss',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Deductions for Damage or Loss FORM XX</h1>\n<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[See rule 78 (1)(a)(ii)]</h2>\n<p style="margin:4px 0;font-size:12px;"><b>1. Name and Address of Contractor:</b> {{CONTRACTOR_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>2. Name and Address of establishment in/under which:</b> {{EMPLOYER_NAME}}</p>\n<p>contract is carried on.</p>\n<p style="margin:4px 0;font-size:12px;"><b>3. Nature and location of work:</b> {{SITE_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>4. Name and address of Principal Employer:</b> {{EMPLOYER_NAME}}</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>There is no deduction for damage or Loss during the month of {{MONTH}} {{YEAR}}</p>\n<p>\\</p>\n</body></html>',
'columns': [
            'SI No.',
'Name of workmen',
"Father's/Husband's name",
'Designation',
'Particulars of damage or loss',
'Date of damage or loss',
'Whether workman showed cause against deduction',
"Name of person in whose presence employee's was heard",
'Amount of deduction imposed',
'No. of instalments',
'First Instalments',
'Last Instalments',
'Remarks'
        ],
'field_mappings': {
            'SI No.': 'sl',
'Name of workmen': 'Employee_Name',
"Father's/Husband's name": 'Father_Name',
'Designation': 'Designation',
'Particulars of damage or loss': 'Loss_Caused',
'Date of damage or loss': 'Date_of_Damage',
'Amount of deduction imposed': 'Deduction_Amount',
'No. of instalments': 'Deduction_Installments',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Karnataka',
'purpose': 'MusterRoll',
'form_code': 'FORM XVI',
'title': 'Muster Roll cum Wage Register',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">See Rule 78(1)(a)(i FORM XVI</h1>\n<p>Muster Roll</p>\n<p>Name and address of Contractor</p>\n<p>Name and address of establishment in/under which contract is carried on</p>\n<p>Nature and location of work</p>\n<p>Name and address of Principal Employer</p>\n<p>For the month of</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>1…… 31</p>\n</body></html>',
'columns': [
            'Sl. No.',
'Name of workmen',
'Father’s/Husband’s name',
'Sex',
'Dates',
'Remarks'
        ],
'field_mappings': {
            'Sl. No.': 'sl',
'Name of workmen': 'Employee_Name',
'Father’s/Husband’s name': 'Father_Name',
'Sex': 'Gender',
'Dates': 'Date_Of_Joining',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Karnataka',
'purpose': 'Register of Advances',
'form_code': 'FORM XXII',
'title': 'Register of Advances',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Advances FORM XXII</h1>\n<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[See rule 78 (1)(a)(ii)]</h2>\n<p style="margin:4px 0;font-size:12px;"><b>1. Name and Address of Contractor:</b> {{CONTRACTOR_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>2. Name and Address of establishment in/under which:</b> {{EMPLOYER_NAME}}</p>\n<p>contract is carried on.</p>\n<p style="margin:4px 0;font-size:12px;"><b>3. Nature and location of work:</b> {{SITE_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>4. Name and address of Principal Employer:</b> {{EMPLOYER_NAME}}</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>No Advance is given during the month of {{MONTH}} {{YEAR}}</p>\n</body></html>',
'columns': [
            'SI No.',
'Name of workmen',
"Father's/Husband's name",
'Nature of employment/Designation',
'Wage period and wages payable',
'Date and amount of advance given',
'Purpose(s) for which advance made',
'No. of instalments by which advance to be repaid',
'Date and amount of each instalments repaid',
'Date on which last instalments was repaid',
'Remarks'
        ],
'field_mappings': {
            'SI No.': 'sl',
'Name of workmen': 'Employee_Name',
"Father's/Husband's name": 'Father_Name',
'Nature of employment/Designation': 'Designation',
'Date and amount of advance given': 'Advance_Amount',
'Purpose(s) for which advance made': 'Advance_Purpose',
'No. of instalments by which advance to be repaid': 'Advance_Installments',
'Date and amount of each instalments repaid': 'Advance_Repaid_Amount',
'Date on which last instalments was repaid': 'Advance_Repaid_Date',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Karnataka',
'purpose': 'Register of Fines',
'form_code': 'FORM XXI',
'title': 'Register of Fines',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Fines FORM XXI</h1>\n<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[See rule 78 (1)(a)(ii)]</h2>\n<p style="margin:4px 0;font-size:12px;"><b>1. Name and Address of Contractor:</b> {{CONTRACTOR_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>2. Name and Address of establishment in/under which:</b> {{EMPLOYER_NAME}}</p>\n<p>contract is carried on.</p>\n<p style="margin:4px 0;font-size:12px;"><b>3. Nature and location of work:</b> {{SITE_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>4. Name and address of Principal Employer:</b> {{EMPLOYER_NAME}}</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>No fine imposed during the month of {{MONTH}} {{YEAR}}</p>\n</body></html>',
'columns': [
            'SI No.',
'Name of workmen',
"Father's/Husband's name",
'Designation/nature for fine imposed',
'Act/Ommission for which imposed',
'Date of Offence',
'Whether workman showed cause against fine',
"Name of person in whose presence employee's was heard",
'Wage periods and wages payable',
'Amount of fine imposed',
'Date on which fine realised',
'Remarks'
        ],
'field_mappings': {
            'SI No.': 'sl',
'Name of workmen': 'Employee_Name',
"Father's/Husband's name": 'Father_Name',
'Act/Ommission for which imposed': 'Fine_Offence_Nature',
'Date of Offence': 'Fine_Offence_Date',
'Amount of fine imposed': 'Fine_Amount',
'Date on which fine realised': 'Fine_Realised_Date',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Karnataka',
'purpose': 'Register of Overtime',
'form_code': 'FORM XXIII',
'title': 'Register of Overtime',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Overtime FORM XXIII</h1>\n<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[See rule 78 (1)(a)(iii)]</h2>\n<p style="margin:4px 0;font-size:12px;"><b>1. Name and Address of Contractor:</b> {{CONTRACTOR_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>2. Name and Address of establishment in/under which:</b> {{EMPLOYER_NAME}}</p>\n<p>contract is carried on.</p>\n<p style="margin:4px 0;font-size:12px;"><b>3. Nature and location of work:</b> {{SITE_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>4. Name and address of Principal Employer:</b> {{EMPLOYER_NAME}}</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>No overtime work is done during the month of {{MONTH}} {{YEAR}}</p>\n</body></html>',
'columns': [
            'SI No.',
'Name of workman',
"Father's/Husband's name",
'Sex',
'Designation/nature of employment',
'Date on which overtime worked',
'Total overtime worked',
'Normal rate of wages',
'Overtime rate of wages',
'Overtime earnings',
'Date on which overtime wages paid',
'Remarks'
        ],
'field_mappings': {
            'Overtime earnings': 'Overtime_Earnings',
'SI No.': 'sl',
'Name of workman': 'Employee_Name',
"Father's/Husband's name": 'Father_Name',
'Sex': 'Gender',
'Designation/nature of employment': 'Designation',
'Date on which overtime worked': 'Overtime_Date',
'Total overtime worked': 'Overtime_Extent',
'Normal rate of wages': 'Normal_Rate',
'Overtime rate of wages': 'Overtime_Rate',
'Date on which overtime wages paid': 'Overtime_Payment_Date',
'Remarks': 'Remarks'
        },
'calculation_rules': [
            {
                'target': 'otEarnings',
'label': 'Overtime wages',
'formula': 'otHours * otRate'
            }
        ]
    },
{
        'state': 'Karnataka',
'purpose': 'Register of Workmen',
'form_code': 'FORM XIII',
'title': 'Register of Workmen',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  p.formtitle { text-align: center; font-weight: bold; font-size: 15px; margin-bottom: 2px; }\n  p.rule { text-align: center; font-size: 11px; color: #333; margin-bottom: 8px; }\n  p.title { text-align: center; font-weight: bold; font-size: 15px; margin-bottom: 12px; }\n  p.lead { font-weight: 600; margin-top: 8px; }\n  .gap { height: 10px; }\n  .field { display: flex; gap: 8px; align-items: baseline; margin: 6px 0; font-size: 13px; }\n  .field .label { flex: none; }\n  .field .fill { flex: 1; border-bottom: 1px solid #000; min-height: 1.2em; display: inline-block; }\n  .field .value b { font-weight: 600; }\n  .sign { margin-top: 18px; text-align: right; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <p class="formtitle">FORM XIII</p>\n<p class="title">[ See Rule 75 ]</p>\n<p class="lead">Register of Workmen Employed by Contractor</p>\n<p>Name and address of Contractor …………………………………………………………………………………………....................................................................................</p>\n<p>………………………………………………………………………………………………………………………………………………………………………………………………………………………………</p>\n<p>Nature and location of work ………………………………………………………………………………………………………………………………………………………………………………..</p>\n<p>Name and address of establishment in/under which contract is carried on …………………………………………………………………………………………………………</p>\n<p>……………………………………………………………………………………………………………………………………………………………………………………………………………………………… Name and address of Principal Employer ……………………………………………………………………………………………………………………………………………………………..</p>\n<p>……………………………………………………………………………………………………………………………………………………………………………………………………………………………..</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<div class="gap"></div>\n</body></html>',
'columns': [
            'SI. No.',
'Name and surname of workmen',
'Age and Sex',
'Father’s/ Husband’s name',
'Nature of Employment/ Designation',
'Permanent house a ddress of workman (Village and t e hsil/ t aluk and d istrict)',
'Local Address',
'Date of commencement of employment',
'Signature or thumb impression of workman`',
'Date of termination of employment',
'Reason for termination',
'Remarks'
        ],
'field_mappings': {
            'Date of termination of employment': 'Date_Of_Leaving',
'SI. No.': 'sl',
'Name and surname of workmen': 'Employee_Name',
'Age and Sex': 'Gender',
'Father’s/ Husband’s name': 'Father_Name',
'Permanent house a ddress of workman (Village and t e hsil/ t aluk and d istrict)': 'Address',
'Local Address': 'Address',
'Date of commencement of employment': 'Date_Of_Joining',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Karnataka',
'purpose': 'Wage Register',
'form_code': 'FORM XVII',
'title': 'Wage Register',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">See Rule 78(I)(a)(i)] FORM XVII</h1>\n<p>Register of Wages</p>\n<p>Name and address of the Contractor</p>\n<p>Name and address of Establishment in/under which contract is carried on</p>\n<p>Name and location of work</p>\n<p>Name and address of Principal Employer</p>\n<p>Wage Period: Monthly</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>Basic wages Dearness Allowance Overtime Other cash payments (Nature of payments to be indicated) Total</p>\n<p>Wage Period: Monthly ………………………………………………………………………………………………………………………………………………………………………………………....</p>\n</body></html>',
'columns': [
            'Sl. No.',
'Name of workmen',
'Sl. No. in the register of workmen',
'Designation/ Nature of employment',
'No. of days worked',
'Unit of work done',
'Daily-rate of wages/piece-rate',
'Amount of wages earned',
'Deductions if any (indicate nature)',
'Net amount paid',
'Signature/Thumb impression of workmen',
'Initial of contractor or his representative'
        ],
'field_mappings': {
            'Designation/ Nature of employment': 'Designation',
'Unit of work done': 'NO_ofunit_Per_Piece',
'Sl. No.': 'sl',
'Name of workmen': 'Employee_Name',
'Sl. No. in the register of workmen': 'sl',
'No. of days worked': 'Total_Days_Worked',
'Daily-rate of wages/piece-rate': 'Normal_Rate',
'Amount of wages earned': 'Gross_Wages',
'Deductions if any (indicate nature)': 'Total_Deductions',
'Net amount paid': 'Net_Salary'
        },
'calculation_rules': [
            {
                'target': 'grossWages',
'label': 'Gross wages',
'formula': 'daysWorked * dailyRate'
            },
{
                'target': 'netSalary',
'label': 'Net amount paid',
'formula': 'grossWages - totalDeductions'
            }
        ]
    },
{
        'state': 'Kerala',
'purpose': 'Deductions for Damage or Loss',
'form_code': 'FORM XX',
'title': 'Register of Deductions for Damage or Loss',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Deductions for Damage or Loss FORM XX</h1>\n<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[See rule 78 (1)(a)(ii)]</h2>\n<p style="margin:4px 0;font-size:12px;"><b>1. Name and Address of Contractor:</b> {{CONTRACTOR_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>2. Name and Address of establishment in/under which:</b> {{EMPLOYER_NAME}}</p>\n<p>contract is carried on.</p>\n<p style="margin:4px 0;font-size:12px;"><b>3. Nature and location of work:</b> {{SITE_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>4. Name and address of Principal Employer:</b> {{EMPLOYER_NAME}}</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>There is no deduction for damage or Loss during the month of {{MONTH}} {{YEAR}}</p>\n<p>\\</p>\n</body></html>',
'columns': [
            'SI No.',
'Name of workmen',
"Father's/Husband's name",
'Designation',
'Particulars of damage or loss',
'Date of damage or loss',
'Whether workman showed cause against deduction',
"Name of person in whose presence employee's was heard",
'Amount of deduction imposed',
'No. of instalments',
'First Instalments',
'Last Instalments',
'Remarks'
        ],
'field_mappings': {
            'Name of workmen': 'Employee_Name',
"Father's/Husband's name": 'Father_Name',
'SI No.': 'sl',
'Designation': 'Designation',
'Particulars of damage or loss': 'Loss_Caused',
'Date of damage or loss': 'Date_of_Damage',
'Amount of deduction imposed': 'Deduction_Amount',
'No. of instalments': 'Deduction_Installments',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Kerala',
'purpose': 'MusterRoll',
'form_code': 'FORM XVI',
'title': 'Muster Roll cum Wage Register',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">See Rule 78(1)(a)(i FORM XVI</h1>\n<p>Muster Roll</p>\n<p>Name and address of Contractor</p>\n<p>Name and address of establishment in/under which contract is carried on</p>\n<p>Nature and location of work</p>\n<p>Name and address of Principal Employer</p>\n<p>For the month of</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>1…… 31</p>\n</body></html>',
'columns': [
            'Sl. No.',
'Name of workmen',
'Father’s/Husband’s name',
'Sex',
'Dates',
'Remarks'
        ],
'field_mappings': {
            'Sl. No.': 'sl',
'Name of workmen': 'Employee_Name',
'Father’s/Husband’s name': 'Father_Name',
'Sex': 'Gender',
'Dates': 'Date_Of_Joining',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Kerala',
'purpose': 'Register of Advances',
'form_code': 'FORM XXII',
'title': 'Register of Advances',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Advances FORM XXII</h1>\n<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[See rule 78 (1)(a)(ii)]</h2>\n<p style="margin:4px 0;font-size:12px;"><b>1. Name and Address of Contractor:</b> {{CONTRACTOR_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>2. Name and Address of establishment in/under which:</b> {{EMPLOYER_NAME}}</p>\n<p>contract is carried on.</p>\n<p style="margin:4px 0;font-size:12px;"><b>3. Nature and location of work:</b> {{SITE_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>4. Name and address of Principal Employer:</b> {{EMPLOYER_NAME}}</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>No Advance is given during the month of {{MONTH}} {{YEAR}}</p>\n</body></html>',
'columns': [
            'SI No.',
'Name of workmen',
"Father's/Husband's name",
'Nature of employment/Designation',
'Wage period and wages payable',
'Date and amount of advance given',
'Purpose(s) for which advance made',
'No. of instalments by which advance to be repaid',
'Date and amount of each instalments repaid',
'Date on which last instalments was repaid',
'Remarks'
        ],
'field_mappings': {
            'No. of instalments by which advance to be repaid': 'Advance_Installments',
'SI No.': 'sl',
'Name of workmen': 'Employee_Name',
"Father's/Husband's name": 'Father_Name',
'Nature of employment/Designation': 'Designation',
'Date and amount of advance given': 'Advance_Amount',
'Purpose(s) for which advance made': 'Advance_Purpose',
'Date and amount of each instalments repaid': 'Advance_Repaid_Amount',
'Date on which last instalments was repaid': 'Advance_Repaid_Date',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Kerala',
'purpose': 'Register of Fines',
'form_code': 'FORM XXI',
'title': 'Register of Fines',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Fines FORM XXI</h1>\n<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[See rule 78 (1)(a)(ii)]</h2>\n<p style="margin:4px 0;font-size:12px;"><b>1. Name and Address of Contractor:</b> {{CONTRACTOR_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>2. Name and Address of establishment in/under which:</b> {{EMPLOYER_NAME}}</p>\n<p>contract is carried on.</p>\n<p style="margin:4px 0;font-size:12px;"><b>3. Nature and location of work:</b> {{SITE_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>4. Name and address of Principal Employer:</b> {{EMPLOYER_NAME}}</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>No fine imposed during the month of {{MONTH}} {{YEAR}}</p>\n</body></html>',
'columns': [
            'SI No.',
'Name of workmen',
"Father's/Husband's name",
'Designation/nature for fine imposed',
'Act/Ommission for which imposed',
'Date of Offence',
'Whether workman showed cause against fine',
"Name of person in whose presence employee's was heard",
'Wage periods and wages payable',
'Amount of fine imposed',
'Date on which fine realised',
'Remarks'
        ],
'field_mappings': {
            'SI No.': 'sl',
'Name of workmen': 'Employee_Name',
"Father's/Husband's name": 'Father_Name',
'Act/Ommission for which imposed': 'Fine_Offence_Nature',
'Date of Offence': 'Fine_Offence_Date',
'Amount of fine imposed': 'Fine_Amount',
'Date on which fine realised': 'Fine_Realised_Date',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Kerala',
'purpose': 'Register of Overtime',
'form_code': 'FORM XXIII',
'title': 'Register of Overtime',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Overtime FORM XXIII</h1>\n<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[See rule 78 (1)(a)(iii)]</h2>\n<p style="margin:4px 0;font-size:12px;"><b>1. Name and Address of Contractor:</b> {{CONTRACTOR_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>2. Name and Address of establishment in/under which:</b> {{EMPLOYER_NAME}}</p>\n<p>contract is carried on.</p>\n<p style="margin:4px 0;font-size:12px;"><b>3. Nature and location of work:</b> {{SITE_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>4. Name and address of Principal Employer:</b> {{EMPLOYER_NAME}}</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>No overtime work is done during the month of {{MONTH}} {{YEAR}}</p>\n</body></html>',
'columns': [
            'SI No.',
'Name of workman',
"Father's/Husband's name",
'Sex',
'Designation/nature of employment',
'Date on which overtime worked',
'Total overtime worked',
'Normal rate of wages',
'Overtime rate of wages',
'Overtime earnings',
'Date on which overtime wages paid',
'Remarks'
        ],
'field_mappings': {
            'SI No.': 'sl',
'Name of workman': 'Employee_Name',
"Father's/Husband's name": 'Father_Name',
'Sex': 'Gender',
'Designation/nature of employment': 'Designation',
'Date on which overtime worked': 'Overtime_Date',
'Total overtime worked': 'Overtime_Extent',
'Normal rate of wages': 'Normal_Rate',
'Overtime rate of wages': 'Overtime_Rate',
'Overtime earnings': 'Overtime_Earnings',
'Date on which overtime wages paid': 'Overtime_Payment_Date',
'Remarks': 'Remarks'
        },
'calculation_rules': [
            {
                'target': 'otEarnings',
'label': 'Overtime wages',
'formula': 'otHours * otRate'
            }
        ]
    },
{
        'state': 'Kerala',
'purpose': 'Register of Workmen',
'form_code': 'FORM XIII',
'title': 'Register of Workmen',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  p.formtitle { text-align: center; font-weight: bold; font-size: 15px; margin-bottom: 2px; }\n  p.rule { text-align: center; font-size: 11px; color: #333; margin-bottom: 8px; }\n  p.title { text-align: center; font-weight: bold; font-size: 15px; margin-bottom: 12px; }\n  p.lead { font-weight: 600; margin-top: 8px; }\n  .gap { height: 10px; }\n  .field { display: flex; gap: 8px; align-items: baseline; margin: 6px 0; font-size: 13px; }\n  .field .label { flex: none; }\n  .field .fill { flex: 1; border-bottom: 1px solid #000; min-height: 1.2em; display: inline-block; }\n  .field .value b { font-weight: 600; }\n  .sign { margin-top: 18px; text-align: right; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <p class="formtitle">FORM XIII</p>\n<p class="title">[ See Rule 75 ]</p>\n<p class="lead">Register of Workmen Employed by Contractor</p>\n<p>Name and address of Contractor …………………………………………………………………………………………....................................................................................</p>\n<p>………………………………………………………………………………………………………………………………………………………………………………………………………………………………</p>\n<p>Nature and location of work ………………………………………………………………………………………………………………………………………………………………………………..</p>\n<p>Name and address of establishment in/under which contract is carried on …………………………………………………………………………………………………………</p>\n<p>……………………………………………………………………………………………………………………………………………………………………………………………………………………………… Name and address of Principal Employer ……………………………………………………………………………………………………………………………………………………………..</p>\n<p>……………………………………………………………………………………………………………………………………………………………………………………………………………………………..</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<div class="gap"></div>\n</body></html>',
'columns': [
            'SI. No.',
'Name and surname of workmen',
'Age and Sex',
'Father’s/ Husband’s name',
'Nature of Employment/ Designation',
'Permanent house a ddress of workman (Village and t e hsil/ t aluk and d istrict)',
'Local Address',
'Date of commencement of employment',
'Signature or thumb impression of workman`',
'Date of termination of employment',
'Reason for termination',
'Remarks'
        ],
'field_mappings': {
            'Permanent house a ddress of workman (Village and t e hsil/ t aluk and d istrict)': 'Address',
'Date of termination of employment': 'Date_Of_Leaving',
'SI. No.': 'sl',
'Name and surname of workmen': 'Employee_Name',
'Age and Sex': 'Gender',
'Father’s/ Husband’s name': 'Father_Name',
'Local Address': 'Address',
'Date of commencement of employment': 'Date_Of_Joining',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Kerala',
'purpose': 'Wage Register',
'form_code': 'FORM XVII',
'title': 'Wage Register',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">See Rule 78(I)(a)(i)] FORM XVII</h1>\n<p>Register of Wages</p>\n<p>Name and address of the Contractor</p>\n<p>Name and address of Establishment in/under which contract is carried on</p>\n<p>Name and location of work</p>\n<p>Name and address of Principal Employer</p>\n<p>Wage Period: Monthly</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>Basic wages Dearness Allowance Overtime Other cash payments (Nature of payments to be indicated) Total</p>\n<p>Wage Period: Monthly ………………………………………………………………………………………………………………………………………………………………………………………....</p>\n</body></html>',
'columns': [
            'Sl. No.',
'Name of workmen',
'Sl. No. in the register of workmen',
'Designation/ Nature of employment',
'No. of days worked',
'Unit of work done',
'Daily-rate of wages/piece-rate',
'Amount of wages earned',
'Deductions if any (indicate nature)',
'Net amount paid',
'Signature/Thumb impression of workmen',
'Initial of contractor or his representative'
        ],
'field_mappings': {
            'Unit of work done': 'NO_ofunit_Per_Piece',
'Sl. No.': 'sl',
'Name of workmen': 'Employee_Name',
'Sl. No. in the register of workmen': 'sl',
'Designation/ Nature of employment': 'Designation',
'No. of days worked': 'Total_Days_Worked',
'Daily-rate of wages/piece-rate': 'Normal_Rate',
'Amount of wages earned': 'Gross_Wages',
'Deductions if any (indicate nature)': 'Total_Deductions',
'Net amount paid': 'Net_Salary'
        },
'calculation_rules': [
            {
                'target': 'grossWages',
'label': 'Gross wages',
'formula': 'daysWorked * dailyRate'
            },
{
                'target': 'netSalary',
'label': 'Net amount paid',
'formula': 'grossWages - totalDeductions'
            }
        ]
    },
{
        'state': 'Madhya Pradesh',
'purpose': 'Deductions for Damage or Loss',
'form_code': 'FORM XX',
'title': 'Register of Deductions for Damage or Loss',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Deductions for Damage or Loss FORM XX</h1>\n<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[See rule 78 (1)(a)(ii)]</h2>\n<p style="margin:4px 0;font-size:12px;"><b>1. Name and Address of Contractor:</b> {{CONTRACTOR_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>2. Name and Address of establishment in/under which:</b> {{EMPLOYER_NAME}}</p>\n<p>contract is carried on.</p>\n<p style="margin:4px 0;font-size:12px;"><b>3. Nature and location of work:</b> {{SITE_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>4. Name and address of Principal Employer:</b> {{EMPLOYER_NAME}}</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>There is no deduction for damage or Loss during the month of {{MONTH}} {{YEAR}}</p>\n<p>\\</p>\n</body></html>',
'columns': [
            'SI No.',
'Name of workmen',
"Father's/Husband's name",
'Designation',
'Particulars of damage or loss',
'Date of damage or loss',
'Whether workman showed cause against deduction',
"Name of person in whose presence employee's was heard",
'Amount of deduction imposed',
'No. of instalments',
'First Instalments',
'Last Instalments',
'Remarks'
        ],
'field_mappings': {
            'SI No.': 'sl',
'Name of workmen': 'Employee_Name',
"Father's/Husband's name": 'Father_Name',
'Designation': 'Designation',
'Particulars of damage or loss': 'Loss_Caused',
'Date of damage or loss': 'Date_of_Damage',
'Amount of deduction imposed': 'Deduction_Amount',
'No. of instalments': 'Deduction_Installments',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Madhya Pradesh',
'purpose': 'MusterRoll',
'form_code': 'FORM XVI',
'title': 'Muster Roll cum Wage Register',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">See Rule 78(1)(a)(i FORM XVI</h1>\n<p>Muster Roll</p>\n<p>Name and address of Contractor</p>\n<p>Name and address of establishment in/under which contract is carried on</p>\n<p>Nature and location of work</p>\n<p>Name and address of Principal Employer</p>\n<p>For the month of</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>1…… 31</p>\n</body></html>',
'columns': [
            'Sl. No.',
'Name of workmen',
'Father’s/Husband’s name',
'Sex',
'Dates',
'Remarks'
        ],
'field_mappings': {
            'Father’s/Husband’s name': 'Father_Name',
'Sl. No.': 'sl',
'Name of workmen': 'Employee_Name',
'Sex': 'Gender',
'Dates': 'Date_Of_Joining',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Madhya Pradesh',
'purpose': 'Register of Advances',
'form_code': 'FORM XXII',
'title': 'Register of Advances',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Advances FORM XXII</h1>\n<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[See rule 78 (1)(a)(ii)]</h2>\n<p style="margin:4px 0;font-size:12px;"><b>1. Name and Address of Contractor:</b> {{CONTRACTOR_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>2. Name and Address of establishment in/under which:</b> {{EMPLOYER_NAME}}</p>\n<p>contract is carried on.</p>\n<p style="margin:4px 0;font-size:12px;"><b>3. Nature and location of work:</b> {{SITE_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>4. Name and address of Principal Employer:</b> {{EMPLOYER_NAME}}</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>No Advance is given during the month of {{MONTH}} {{YEAR}}</p>\n</body></html>',
'columns': [
            'SI No.',
'Name of workmen',
"Father's/Husband's name",
'Nature of employment/Designation',
'Wage period and wages payable',
'Date and amount of advance given',
'Purpose(s) for which advance made',
'No. of instalments by which advance to be repaid',
'Date and amount of each instalments repaid',
'Date on which last instalments was repaid',
'Remarks'
        ],
'field_mappings': {
            "Father's/Husband's name": 'Father_Name',
'No. of instalments by which advance to be repaid': 'Advance_Installments',
'SI No.': 'sl',
'Name of workmen': 'Employee_Name',
'Nature of employment/Designation': 'Designation',
'Date and amount of advance given': 'Advance_Amount',
'Purpose(s) for which advance made': 'Advance_Purpose',
'Date and amount of each instalments repaid': 'Advance_Repaid_Amount',
'Date on which last instalments was repaid': 'Advance_Repaid_Date',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Madhya Pradesh',
'purpose': 'Register of Fines',
'form_code': 'FORM XXI',
'title': 'Register of Fines',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Fines FORM XXI</h1>\n<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[See rule 78 (1)(a)(ii)]</h2>\n<p style="margin:4px 0;font-size:12px;"><b>1. Name and Address of Contractor:</b> {{CONTRACTOR_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>2. Name and Address of establishment in/under which:</b> {{EMPLOYER_NAME}}</p>\n<p>contract is carried on.</p>\n<p style="margin:4px 0;font-size:12px;"><b>3. Nature and location of work:</b> {{SITE_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>4. Name and address of Principal Employer:</b> {{EMPLOYER_NAME}}</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>No fine imposed during the month of {{MONTH}} {{YEAR}}</p>\n</body></html>',
'columns': [
            'SI No.',
'Name of workmen',
"Father's/Husband's name",
'Designation/nature for fine imposed',
'Act/Ommission for which imposed',
'Date of Offence',
'Whether workman showed cause against fine',
"Name of person in whose presence employee's was heard",
'Wage periods and wages payable',
'Amount of fine imposed',
'Date on which fine realised',
'Remarks'
        ],
'field_mappings': {
            'Date on which fine realised': 'Fine_Realised_Date',
'SI No.': 'sl',
'Name of workmen': 'Employee_Name',
"Father's/Husband's name": 'Father_Name',
'Act/Ommission for which imposed': 'Fine_Offence_Nature',
'Date of Offence': 'Fine_Offence_Date',
'Amount of fine imposed': 'Fine_Amount',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Madhya Pradesh',
'purpose': 'Register of Overtime',
'form_code': 'FORM XXIII',
'title': 'Register of Overtime',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Overtime FORM XXIII</h1>\n<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[See rule 78 (1)(a)(iii)]</h2>\n<p style="margin:4px 0;font-size:12px;"><b>1. Name and Address of Contractor:</b> {{CONTRACTOR_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>2. Name and Address of establishment in/under which:</b> {{EMPLOYER_NAME}}</p>\n<p>contract is carried on.</p>\n<p style="margin:4px 0;font-size:12px;"><b>3. Nature and location of work:</b> {{SITE_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>4. Name and address of Principal Employer:</b> {{EMPLOYER_NAME}}</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>No overtime work is done during the month of {{MONTH}} {{YEAR}}</p>\n</body></html>',
'columns': [
            'SI No.',
'Name of workman',
"Father's/Husband's name",
'Sex',
'Designation/nature of employment',
'Date on which overtime worked',
'Total overtime worked',
'Normal rate of wages',
'Overtime rate of wages',
'Overtime earnings',
'Date on which overtime wages paid',
'Remarks'
        ],
'field_mappings': {
            'Date on which overtime wages paid': 'Overtime_Payment_Date',
'SI No.': 'sl',
'Name of workman': 'Employee_Name',
"Father's/Husband's name": 'Father_Name',
'Sex': 'Gender',
'Designation/nature of employment': 'Designation',
'Date on which overtime worked': 'Overtime_Date',
'Total overtime worked': 'Overtime_Extent',
'Normal rate of wages': 'Normal_Rate',
'Overtime rate of wages': 'Overtime_Rate',
'Overtime earnings': 'Overtime_Earnings',
'Remarks': 'Remarks'
        },
'calculation_rules': [
            {
                'target': 'otEarnings',
'label': 'Overtime wages',
'formula': 'otHours * otRate'
            }
        ]
    },
{
        'state': 'Madhya Pradesh',
'purpose': 'Register of Workmen',
'form_code': 'FORM XIII',
'title': 'Register of Workmen',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  p.formtitle { text-align: center; font-weight: bold; font-size: 15px; margin-bottom: 2px; }\n  p.rule { text-align: center; font-size: 11px; color: #333; margin-bottom: 8px; }\n  p.title { text-align: center; font-weight: bold; font-size: 15px; margin-bottom: 12px; }\n  p.lead { font-weight: 600; margin-top: 8px; }\n  .gap { height: 10px; }\n  .field { display: flex; gap: 8px; align-items: baseline; margin: 6px 0; font-size: 13px; }\n  .field .label { flex: none; }\n  .field .fill { flex: 1; border-bottom: 1px solid #000; min-height: 1.2em; display: inline-block; }\n  .field .value b { font-weight: 600; }\n  .sign { margin-top: 18px; text-align: right; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <p class="formtitle">FORM XIII</p>\n<p class="title">[ See Rule 75 ]</p>\n<p class="lead">Register of Workmen Employed by Contractor</p>\n<p>Name and address of Contractor …………………………………………………………………………………………....................................................................................</p>\n<p>………………………………………………………………………………………………………………………………………………………………………………………………………………………………</p>\n<p>Nature and location of work ………………………………………………………………………………………………………………………………………………………………………………..</p>\n<p>Name and address of establishment in/under which contract is carried on …………………………………………………………………………………………………………</p>\n<p>……………………………………………………………………………………………………………………………………………………………………………………………………………………………… Name and address of Principal Employer ……………………………………………………………………………………………………………………………………………………………..</p>\n<p>……………………………………………………………………………………………………………………………………………………………………………………………………………………………..</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<div class="gap"></div>\n</body></html>',
'columns': [
            'SI. No.',
'Name and surname of workmen',
'Age and Sex',
'Father’s/ Husband’s name',
'Nature of Employment/ Designation',
'Permanent house a ddress of workman (Village and t e hsil/ t aluk and d istrict)',
'Local Address',
'Date of commencement of employment',
'Signature or thumb impression of workman`',
'Date of termination of employment',
'Reason for termination',
'Remarks'
        ],
'field_mappings': {
            'Date of termination of employment': 'Date_Of_Leaving',
'SI. No.': 'sl',
'Name and surname of workmen': 'Employee_Name',
'Age and Sex': 'Gender',
'Father’s/ Husband’s name': 'Father_Name',
'Permanent house a ddress of workman (Village and t e hsil/ t aluk and d istrict)': 'Address',
'Local Address': 'Address',
'Date of commencement of employment': 'Date_Of_Joining',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Madhya Pradesh',
'purpose': 'Wage Register',
'form_code': 'FORM XVII',
'title': 'Wage Register',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">See Rule 78(I)(a)(i)] FORM XVII</h1>\n<p>Register of Wages</p>\n<p>Name and address of the Contractor</p>\n<p>Name and address of Establishment in/under which contract is carried on</p>\n<p>Name and location of work</p>\n<p>Name and address of Principal Employer</p>\n<p>Wage Period: Monthly</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>Basic wages Dearness Allowance Overtime Other cash payments (Nature of payments to be indicated) Total</p>\n<p>Wage Period: Monthly ………………………………………………………………………………………………………………………………………………………………………………………....</p>\n</body></html>',
'columns': [
            'Sl. No.',
'Name of workmen',
'Sl. No. in the register of workmen',
'Designation/ Nature of employment',
'No. of days worked',
'Unit of work done',
'Daily-rate of wages/piece-rate',
'Amount of wages earned',
'Deductions if any (indicate nature)',
'Net amount paid',
'Signature/Thumb impression of workmen',
'Initial of contractor or his representative'
        ],
'field_mappings': {
            'Unit of work done': 'NO_ofunit_Per_Piece',
'Sl. No.': 'sl',
'Name of workmen': 'Employee_Name',
'Sl. No. in the register of workmen': 'sl',
'Designation/ Nature of employment': 'Designation',
'No. of days worked': 'Total_Days_Worked',
'Daily-rate of wages/piece-rate': 'Normal_Rate',
'Amount of wages earned': 'Gross_Wages',
'Deductions if any (indicate nature)': 'Total_Deductions',
'Net amount paid': 'Net_Salary'
        },
'calculation_rules': [
            {
                'target': 'grossWages',
'label': 'Gross wages',
'formula': 'daysWorked * dailyRate'
            },
{
                'target': 'netSalary',
'label': 'Net amount paid',
'formula': 'grossWages - totalDeductions'
            }
        ]
    },
{
        'state': 'Maharashtra',
'purpose': 'Deductions for Damage or Loss',
'form_code': 'FORM II',
'title': 'Register of Deductions for Damage or Loss',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8"><style>* { box-sizing: border-box; } body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; } p { margin: 4px 0; font-size: 13px; } table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; } table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; } @media print { body { margin: 8mm; } }</style></head><body><h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Deductions for Damage or Loss — FORM II</h1><h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[M. W. Rules under Maharashtra Contract Labour (Regulation and Abolition) 1963 Rule 27 (1)]</h2><p><b>Name and Address of Contractor:</b> {{CONTRACTOR_NAME}}</p><p><b>Name and Address of Principal Employer:</b> {{EMPLOYER_NAME}}</p><p><b>Site:</b> {{SITE_NAME}} ({{SITE_BSS_ID}})</p><table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table><p style="margin-top:12px;font-style:italic;">There is no deduction for damage or loss during the month of {{MONTH}} {{YEAR}}</p></body></html>',
'columns': [
            'Sl.No.',
'Name of workmen',
"Father's/Husband's name",
'Designation / Department',
'Particulars of damage or loss',
'Date of damage or loss',
'Whether workman showed cause against deduction',
"Name of person in whose presence employee's explanation was heard",
'Amount of deduction imposed',
'No. of instalments',
'Date on which total amount recovered - First Instalment',
'Date on which total amount recovered - Last Instalment',
'Remarks'
        ],
'field_mappings': {
            'Sl.No.': 'sl',
'Name of workmen': 'Employee_Name',
"Father's/Husband's name": 'Father_Name',
'Designation / Department': 'Designation',
'Particulars of damage or loss': 'Loss_Caused',
'Date of damage or loss': 'Date_of_Damage',
'Amount of deduction imposed': 'Deduction_Amount',
'No. of instalments': 'Deduction_Installments',
'Overtime Earnings': 'Overtime_Allowance',
'Gross Wages Payable': 'Gross_Wages',
'Net Wages Paid': 'Net_Salary'
        },
'calculation_rules': []
    },
{
        'state': 'Maharashtra',
'purpose': 'MusterRoll',
'form_code': 'FORM II',
'title': 'Muster Roll cum Wage Register',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Form No. II FORM II</h1>\n<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[M. W. Rules under Maharashtra Contract Labour (Regulation and Abolition)1963 Rule 27 (I)]</h2>\n<p>Muster Roll cum Wages Register for the month of……………………………..2015</p>\n<p>Name and Address of Contractor : Name and Address of Principal Employer :</p>\n<p>Deductions Leave with Wages</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n</body></html>',
'columns': [
            'Sl.No.',
'Deputy ID',
'Employee Code',
'Name of the Workmen',
'Minimum Rate of Wages Payable Basic',
'Actual Rate of Wages Payable HRA',
'Conveyance',
'Bonus',
'Total Production in Case of Piece Rate Other Allow',
'Bonus',
'Normal Earnings',
'Overtime Earnings',
'Gross Wages Payable',
'Income Tax',
'Other Deduction',
'Proff / Income Tax',
'PF',
'ESIC',
'Total Deduction',
'Net Wages Paid',
'Previous Balance',
'Further Enjoyed',
'Refused',
'Accumulated',
'Date Payment of Wages',
'Signature or the Thumb Impression of the Employee'
        ],
'field_mappings': {
            'Sl.No.': 'sl',
'Employee Code': 'Employee_Code',
'Name of the Workmen': 'Employee_Name',
'Minimum Rate of Wages Payable Basic': 'Fixed_Basic_Wages',
'Normal Earnings': 'Normal_Earnings',
'Income Tax': 'TDS_Deductions',
'Other Deduction': 'Other_Deduction',
'Proff / Income Tax': 'PT_Deductions',
'PF': 'PF_Deductions',
'ESIC': 'ESIC_Deductions',
'Total Deduction': 'Total_Deductions',
'Date Payment of Wages': 'Payment_Date',
'Actual Rate of Wages Payable HRA': 'House_rent_Allowance',
'Overtime Earnings': 'Overtime_Earnings',
'Gross Wages Payable': 'Gross_Wages',
'Net Wages Paid': 'Net_Salary'
        },
'calculation_rules': [
            {
                'target': 'netSalary',
'label': 'Net amount paid',
'formula': 'grossWages - totalDeductions'
            }
        ]
    },
{
        'state': 'Maharashtra',
'purpose': 'Register of Advances',
'form_code': 'FORM II',
'title': 'Register of Advances',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8"><style>* { box-sizing: border-box; } body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; } p { margin: 4px 0; font-size: 13px; } table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; } table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; } @media print { body { margin: 8mm; } }</style></head><body><h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Advances — FORM II</h1><h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[M. W. Rules under Maharashtra Contract Labour (Regulation and Abolition) 1963 Rule 27 (1)]</h2><p><b>Name and Address of Contractor:</b> {{CONTRACTOR_NAME}}</p><p><b>Name and Address of Principal Employer:</b> {{EMPLOYER_NAME}}</p><p><b>Site:</b> {{SITE_NAME}} ({{SITE_BSS_ID}})</p><table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table><p style="margin-top:12px;font-style:italic;">No advance has been given during the month of {{MONTH}} {{YEAR}}</p></body></html>',
'columns': [
            'Sl.No.',
'Name of workmen',
"Father's/Husband's name",
'Designation / Department',
'Date and amount of advance given',
'Purpose(s) for which advance made',
'No. of instalments by which advance to be repaid',
'Date and amount of each instalment repaid',
'Date on which last instalment was repaid',
'Remarks'
        ],
'field_mappings': {
            'Sl.No.': 'sl',
'Name of workmen': 'Employee_Name',
"Father's/Husband's name": 'Father_Name',
'Designation / Department': 'Designation',
'Date and amount of advance given': 'Advance_Amount',
'Purpose(s) for which advance made': 'Advance_Purpose',
'No. of instalments by which advance to be repaid': 'Advance_Installments',
'Date and amount of each instalment repaid': 'Advance_Repaid_Amount',
'Date on which last instalment was repaid': 'Advance_Repaid_Date',
'Overtime Earnings': 'Overtime_Allowance',
'Gross Wages Payable': 'Gross_Wages',
'Net Wages Paid': 'Net_Salary'
        },
'calculation_rules': []
    },
{
        'state': 'Maharashtra',
'purpose': 'Register of Fines',
'form_code': 'FORM II',
'title': 'Register of Fines',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8"><style>* { box-sizing: border-box; } body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; } p { margin: 4px 0; font-size: 13px; } table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; } table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; } @media print { body { margin: 8mm; } }</style></head><body><h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Fines — FORM II</h1><h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[M. W. Rules under Maharashtra Contract Labour (Regulation and Abolition) 1963 Rule 27 (1)]</h2><p><b>Name and Address of Contractor:</b> {{CONTRACTOR_NAME}}</p><p><b>Name and Address of Principal Employer:</b> {{EMPLOYER_NAME}}</p><p><b>Site:</b> {{SITE_NAME}} ({{SITE_BSS_ID}})</p><table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table><p style="margin-top:12px;font-style:italic;">No fine has been imposed during the month of {{MONTH}} {{YEAR}}</p></body></html>',
'columns': [
            'Sl.No.',
'Name of workmen',
"Father's/Husband's name",
'Designation / Department',
'Act or omission for which fine imposed',
'Date of offence',
'Whether workman showed cause against fine',
"Name of person in whose presence employee's explanation was heard",
'Rate of wages',
'Amount of fine imposed',
'Date on which fine realized',
'Remarks'
        ],
'field_mappings': {
            'Sl.No.': 'sl',
'Name of workmen': 'Employee_Name',
"Father's/Husband's name": 'Father_Name',
'Designation / Department': 'Designation',
'Act or omission for which fine imposed': 'Fine_Offence_Nature',
'Date of offence': 'Fine_Offence_Date',
'Rate of wages': 'Normal_Rate',
'Amount of fine imposed': 'Fine_Amount',
'Date on which fine realized': 'Fine_Realised_Date',
'Overtime Earnings': 'Overtime_Allowance',
'Gross Wages Payable': 'Gross_Wages',
'Net Wages Paid': 'Net_Salary'
        },
'calculation_rules': []
    },
{
        'state': 'Maharashtra',
'purpose': 'Register of Overtime',
'form_code': 'FORM II',
'title': 'Register of Overtime',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8"><style>* { box-sizing: border-box; } body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; } p { margin: 4px 0; font-size: 13px; } table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; } table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; } @media print { body { margin: 8mm; } }</style></head><body><h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Overtime — FORM II</h1><h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[M. W. Rules under Maharashtra Contract Labour (Regulation and Abolition) 1963 Rule 27 (1)]</h2><p><b>Name and Address of Contractor:</b> {{CONTRACTOR_NAME}}</p><p><b>Name and Address of Principal Employer:</b> {{EMPLOYER_NAME}}</p><p><b>Site:</b> {{SITE_NAME}} ({{SITE_BSS_ID}})</p><table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table><p style="margin-top:12px;font-style:italic;">No overtime worked during the month of {{MONTH}} {{YEAR}}</p></body></html>',
'columns': [
            'Sl.No.',
'Name of workmen',
"Father's/Husband's name",
'Sex / Gender',
'Designation / Department',
'Dates on which overtime worked',
'Total overtime worked or production in case of piece rate',
'Normal rates of wages',
'Overtime rate of wages',
'Overtime earnings',
'Date on which overtime wages paid',
'Remarks'
        ],
'field_mappings': {
            'Sl.No.': 'sl',
'Name of workmen': 'Employee_Name',
"Father's/Husband's name": 'Father_Name',
'Sex / Gender': 'Gender',
'Designation / Department': 'Designation',
'Dates on which overtime worked': 'Overtime_Date',
'Total overtime worked or production in case of piece rate': 'Overtime_Extent',
'Normal rates of wages': 'Normal_Rate',
'Overtime rate of wages': 'Overtime_Rate',
'Overtime earnings': 'Overtime_Earnings',
'Date on which overtime wages paid': 'Overtime_Payment_Date',
'Overtime Earnings': 'Overtime_Allowance',
'Gross Wages Payable': 'Gross_Wages',
'Net Wages Paid': 'Net_Salary'
        },
'calculation_rules': [
            {
                'target': 'otEarnings',
'label': 'Overtime wages',
'formula': 'otHours * otRate'
            }
        ]
    },
{
        'state': 'Maharashtra',
'purpose': 'Wage Register',
'form_code': 'FORM II',
'title': 'Wage Register',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Form No. II FORM II</h1>\n<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[M. W. Rules under Maharashtra Contract Labour (Regulation and Abolition)1963 Rule 27 (I)]</h2>\n<p>Muster Roll cum Wages Register for the month of……………………………..2015</p>\n<p>Name and Address of Contractor : Name and Address of Principal Employer :</p>\n<p>Deductions Leave with Wages</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n</body></html>',
'columns': [
            'Sl.No.',
'Deputy ID',
'Employee Code',
'Name of the Workmen',
'Minimum Rate of Wages Payable Basic',
'Actual Rate of Wages Payable HRA',
'Conveyance',
'Bonus',
'Total Production in Case of Piece Rate Other Allow',
'Bonus',
'Normal Earnings',
'Overtime Earnings',
'Gross Wages Payable',
'Income Tax',
'Other Deduction',
'Proff / Income Tax',
'PF',
'ESIC',
'Total Deduction',
'Net Wages Paid',
'Previous Balance',
'Further Enjoyed',
'Refused',
'Accumulated',
'Date Payment of Wages',
'Signature or the Thumb Impression of the Employee'
        ],
'field_mappings': {
            'Sl.No.': 'sl',
'Employee Code': 'Employee_Code',
'Name of the Workmen': 'Employee_Name',
'Minimum Rate of Wages Payable Basic': 'Fixed_Basic_Wages',
'Actual Rate of Wages Payable HRA': 'House_rent_Allowance',
'Normal Earnings': 'Normal_Earnings',
'Income Tax': 'TDS_Deductions',
'Other Deduction': 'Other_Deduction',
'Proff / Income Tax': 'PT_Deductions',
'PF': 'PF_Deductions',
'ESIC': 'ESIC_Deductions',
'Date Payment of Wages': 'Payment_Date',
'Total Deduction': 'Total_Deductions',
'Overtime Earnings': 'Overtime_Earnings',
'Gross Wages Payable': 'Gross_Wages',
'Net Wages Paid': 'Net_Salary'
        },
'calculation_rules': [
            {
                'target': 'netSalary',
'label': 'Net amount paid',
'formula': 'grossWages - totalDeductions'
            }
        ]
    },
{
        'state': 'Manipur',
'purpose': 'Deductions for Damage or Loss',
'form_code': 'FORM XX',
'title': 'Register of Deductions for Damage or Loss',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Deductions for Damage or Loss FORM XX</h1>\n<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[See rule 78 (1)(a)(ii)]</h2>\n<p style="margin:4px 0;font-size:12px;"><b>1. Name and Address of Contractor:</b> {{CONTRACTOR_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>2. Name and Address of establishment in/under which:</b> {{EMPLOYER_NAME}}</p>\n<p>contract is carried on.</p>\n<p style="margin:4px 0;font-size:12px;"><b>3. Nature and location of work:</b> {{SITE_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>4. Name and address of Principal Employer:</b> {{EMPLOYER_NAME}}</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>There is no deduction for damage or Loss during the month of {{MONTH}} {{YEAR}}</p>\n<p>\\</p>\n</body></html>',
'columns': [
            'SI No.',
'Name of workmen',
"Father's/Husband's name",
'Designation',
'Particulars of damage or loss',
'Date of damage or loss',
'Whether workman showed cause against deduction',
"Name of person in whose presence employee's was heard",
'Amount of deduction imposed',
'No. of instalments',
'First Instalments',
'Last Instalments',
'Remarks'
        ],
'field_mappings': {
            'SI No.': 'sl',
'Name of workmen': 'Employee_Name',
"Father's/Husband's name": 'Father_Name',
'Designation': 'Designation',
'Particulars of damage or loss': 'Loss_Caused',
'Date of damage or loss': 'Date_of_Damage',
'Amount of deduction imposed': 'Deduction_Amount',
'No. of instalments': 'Deduction_Installments',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Manipur',
'purpose': 'MusterRoll',
'form_code': 'FORM XVI',
'title': 'Muster Roll cum Wage Register',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">See Rule 78(1)(a)(i FORM XVI</h1>\n<p>Muster Roll</p>\n<p>Name and address of Contractor</p>\n<p>Name and address of establishment in/under which contract is carried on</p>\n<p>Nature and location of work</p>\n<p>Name and address of Principal Employer</p>\n<p>For the month of</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>1…… 31</p>\n</body></html>',
'columns': [
            'Sl. No.',
'Name of workmen',
'Father’s/Husband’s name',
'Sex',
'Dates',
'Remarks'
        ],
'field_mappings': {
            'Sl. No.': 'sl',
'Name of workmen': 'Employee_Name',
'Father’s/Husband’s name': 'Father_Name',
'Sex': 'Gender',
'Dates': 'Date_Of_Joining',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Manipur',
'purpose': 'Register of Advances',
'form_code': 'FORM XXII',
'title': 'Register of Advances',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Advances FORM XXII</h1>\n<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[See rule 78 (1)(a)(ii)]</h2>\n<p style="margin:4px 0;font-size:12px;"><b>1. Name and Address of Contractor:</b> {{CONTRACTOR_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>2. Name and Address of establishment in/under which:</b> {{EMPLOYER_NAME}}</p>\n<p>contract is carried on.</p>\n<p style="margin:4px 0;font-size:12px;"><b>3. Nature and location of work:</b> {{SITE_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>4. Name and address of Principal Employer:</b> {{EMPLOYER_NAME}}</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>No Advance is given during the month of {{MONTH}} {{YEAR}}</p>\n</body></html>',
'columns': [
            'SI No.',
'Name of workmen',
"Father's/Husband's name",
'Nature of employment/Designation',
'Wage period and wages payable',
'Date and amount of advance given',
'Purpose(s) for which advance made',
'No. of instalments by which advance to be repaid',
'Date and amount of each instalments repaid',
'Date on which last instalments was repaid',
'Remarks'
        ],
'field_mappings': {
            'Nature of employment/Designation': 'Designation',
'SI No.': 'sl',
'Name of workmen': 'Employee_Name',
"Father's/Husband's name": 'Father_Name',
'Date and amount of advance given': 'Advance_Amount',
'Purpose(s) for which advance made': 'Advance_Purpose',
'No. of instalments by which advance to be repaid': 'Advance_Installments',
'Date and amount of each instalments repaid': 'Advance_Repaid_Amount',
'Date on which last instalments was repaid': 'Advance_Repaid_Date',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Manipur',
'purpose': 'Register of Fines',
'form_code': 'FORM XXI',
'title': 'Register of Fines',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Fines FORM XXI</h1>\n<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[See rule 78 (1)(a)(ii)]</h2>\n<p style="margin:4px 0;font-size:12px;"><b>1. Name and Address of Contractor:</b> {{CONTRACTOR_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>2. Name and Address of establishment in/under which:</b> {{EMPLOYER_NAME}}</p>\n<p>contract is carried on.</p>\n<p style="margin:4px 0;font-size:12px;"><b>3. Nature and location of work:</b> {{SITE_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>4. Name and address of Principal Employer:</b> {{EMPLOYER_NAME}}</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>No fine imposed during the month of {{MONTH}} {{YEAR}}</p>\n</body></html>',
'columns': [
            'SI No.',
'Name of workmen',
"Father's/Husband's name",
'Designation/nature for fine imposed',
'Act/Ommission for which imposed',
'Date of Offence',
'Whether workman showed cause against fine',
"Name of person in whose presence employee's was heard",
'Wage periods and wages payable',
'Amount of fine imposed',
'Date on which fine realised',
'Remarks'
        ],
'field_mappings': {
            'SI No.': 'sl',
'Name of workmen': 'Employee_Name',
"Father's/Husband's name": 'Father_Name',
'Act/Ommission for which imposed': 'Fine_Offence_Nature',
'Date of Offence': 'Fine_Offence_Date',
'Amount of fine imposed': 'Fine_Amount',
'Date on which fine realised': 'Fine_Realised_Date',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Manipur',
'purpose': 'Register of Overtime',
'form_code': 'FORM XXIII',
'title': 'Register of Overtime',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Overtime FORM XXIII</h1>\n<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[See rule 78 (1)(a)(iii)]</h2>\n<p style="margin:4px 0;font-size:12px;"><b>1. Name and Address of Contractor:</b> {{CONTRACTOR_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>2. Name and Address of establishment in/under which:</b> {{EMPLOYER_NAME}}</p>\n<p>contract is carried on.</p>\n<p style="margin:4px 0;font-size:12px;"><b>3. Nature and location of work:</b> {{SITE_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>4. Name and address of Principal Employer:</b> {{EMPLOYER_NAME}}</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>No overtime work is done during the month of {{MONTH}} {{YEAR}}</p>\n</body></html>',
'columns': [
            'SI No.',
'Name of workman',
"Father's/Husband's name",
'Sex',
'Designation/nature of employment',
'Date on which overtime worked',
'Total overtime worked',
'Normal rate of wages',
'Overtime rate of wages',
'Overtime earnings',
'Date on which overtime wages paid',
'Remarks'
        ],
'field_mappings': {
            'SI No.': 'sl',
'Name of workman': 'Employee_Name',
"Father's/Husband's name": 'Father_Name',
'Sex': 'Gender',
'Designation/nature of employment': 'Designation',
'Date on which overtime worked': 'Overtime_Date',
'Total overtime worked': 'Overtime_Extent',
'Normal rate of wages': 'Normal_Rate',
'Overtime rate of wages': 'Overtime_Rate',
'Overtime earnings': 'Overtime_Earnings',
'Date on which overtime wages paid': 'Overtime_Payment_Date',
'Remarks': 'Remarks'
        },
'calculation_rules': [
            {
                'target': 'otEarnings',
'label': 'Overtime wages',
'formula': 'otHours * otRate'
            }
        ]
    },
{
        'state': 'Manipur',
'purpose': 'Register of Workmen',
'form_code': 'FORM XIII',
'title': 'Register of Workmen',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  p.formtitle { text-align: center; font-weight: bold; font-size: 15px; margin-bottom: 2px; }\n  p.rule { text-align: center; font-size: 11px; color: #333; margin-bottom: 8px; }\n  p.title { text-align: center; font-weight: bold; font-size: 15px; margin-bottom: 12px; }\n  p.lead { font-weight: 600; margin-top: 8px; }\n  .gap { height: 10px; }\n  .field { display: flex; gap: 8px; align-items: baseline; margin: 6px 0; font-size: 13px; }\n  .field .label { flex: none; }\n  .field .fill { flex: 1; border-bottom: 1px solid #000; min-height: 1.2em; display: inline-block; }\n  .field .value b { font-weight: 600; }\n  .sign { margin-top: 18px; text-align: right; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <p class="formtitle">FORM XIII</p>\n<p class="title">[ See Rule 75 ]</p>\n<p class="lead">Register of Workmen Employed by Contractor</p>\n<p>Name and address of Contractor …………………………………………………………………………………………....................................................................................</p>\n<p>………………………………………………………………………………………………………………………………………………………………………………………………………………………………</p>\n<p>Nature and location of work ………………………………………………………………………………………………………………………………………………………………………………..</p>\n<p>Name and address of establishment in/under which contract is carried on …………………………………………………………………………………………………………</p>\n<p>……………………………………………………………………………………………………………………………………………………………………………………………………………………………… Name and address of Principal Employer ……………………………………………………………………………………………………………………………………………………………..</p>\n<p>……………………………………………………………………………………………………………………………………………………………………………………………………………………………..</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<div class="gap"></div>\n</body></html>',
'columns': [
            'SI. No.',
'Name and surname of workmen',
'Age and Sex',
'Father’s/ Husband’s name',
'Nature of Employment/ Designation',
'Permanent house a ddress of workman (Village and t e hsil/ t aluk and d istrict)',
'Local Address',
'Date of commencement of employment',
'Signature or thumb impression of workman`',
'Date of termination of employment',
'Reason for termination',
'Remarks'
        ],
'field_mappings': {
            'Date of termination of employment': 'Date_Of_Leaving',
'SI. No.': 'sl',
'Name and surname of workmen': 'Employee_Name',
'Age and Sex': 'Gender',
'Father’s/ Husband’s name': 'Father_Name',
'Permanent house a ddress of workman (Village and t e hsil/ t aluk and d istrict)': 'Address',
'Local Address': 'Address',
'Date of commencement of employment': 'Date_Of_Joining',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Manipur',
'purpose': 'Wage Register',
'form_code': 'FORM XVII',
'title': 'Wage Register',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">See Rule 78(I)(a)(i)] FORM XVII</h1>\n<p>Register of Wages</p>\n<p>Name and address of the Contractor</p>\n<p>Name and address of Establishment in/under which contract is carried on</p>\n<p>Name and location of work</p>\n<p>Name and address of Principal Employer</p>\n<p>Wage Period: Monthly</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>Basic wages Dearness Allowance Overtime Other cash payments (Nature of payments to be indicated) Total</p>\n<p>Wage Period: Monthly ………………………………………………………………………………………………………………………………………………………………………………………....</p>\n</body></html>',
'columns': [
            'Sl. No.',
'Name of workmen',
'Sl. No. in the register of workmen',
'Designation/ Nature of employment',
'No. of days worked',
'Unit of work done',
'Daily-rate of wages/piece-rate',
'Amount of wages earned',
'Deductions if any (indicate nature)',
'Net amount paid',
'Signature/Thumb impression of workmen',
'Initial of contractor or his representative'
        ],
'field_mappings': {
            'Unit of work done': 'NO_ofunit_Per_Piece',
'Sl. No.': 'sl',
'Name of workmen': 'Employee_Name',
'Sl. No. in the register of workmen': 'sl',
'Designation/ Nature of employment': 'Designation',
'No. of days worked': 'Total_Days_Worked',
'Daily-rate of wages/piece-rate': 'Normal_Rate',
'Amount of wages earned': 'Gross_Wages',
'Deductions if any (indicate nature)': 'Total_Deductions',
'Net amount paid': 'Net_Salary'
        },
'calculation_rules': [
            {
                'target': 'grossWages',
'label': 'Gross wages',
'formula': 'daysWorked * dailyRate'
            },
{
                'target': 'netSalary',
'label': 'Net amount paid',
'formula': 'grossWages - totalDeductions'
            }
        ]
    },
{
        'state': 'Meghalaya',
'purpose': 'Deductions for Damage or Loss',
'form_code': 'FORM XX',
'title': 'Register of Deductions for Damage or Loss',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Deductions for Damage or Loss FORM XX</h1>\n<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[See rule 78 (1)(a)(ii)]</h2>\n<p style="margin:4px 0;font-size:12px;"><b>1. Name and Address of Contractor:</b> {{CONTRACTOR_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>2. Name and Address of establishment in/under which:</b> {{EMPLOYER_NAME}}</p>\n<p>contract is carried on.</p>\n<p style="margin:4px 0;font-size:12px;"><b>3. Nature and location of work:</b> {{SITE_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>4. Name and address of Principal Employer:</b> {{EMPLOYER_NAME}}</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>There is no deduction for damage or Loss during the month of {{MONTH}} {{YEAR}}</p>\n<p>\\</p>\n</body></html>',
'columns': [
            'SI No.',
'Name of workmen',
"Father's/Husband's name",
'Designation',
'Particulars of damage or loss',
'Date of damage or loss',
'Whether workman showed cause against deduction',
"Name of person in whose presence employee's was heard",
'Amount of deduction imposed',
'No. of instalments',
'First Instalments',
'Last Instalments',
'Remarks'
        ],
'field_mappings': {
            'SI No.': 'sl',
'Name of workmen': 'Employee_Name',
"Father's/Husband's name": 'Father_Name',
'Designation': 'Designation',
'Particulars of damage or loss': 'Loss_Caused',
'Date of damage or loss': 'Date_of_Damage',
'Amount of deduction imposed': 'Deduction_Amount',
'No. of instalments': 'Deduction_Installments',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Meghalaya',
'purpose': 'MusterRoll',
'form_code': 'FORM XVI',
'title': 'Muster Roll cum Wage Register',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">See Rule 78(1)(a)(i FORM XVI</h1>\n<p>Muster Roll</p>\n<p>Name and address of Contractor</p>\n<p>Name and address of establishment in/under which contract is carried on</p>\n<p>Nature and location of work</p>\n<p>Name and address of Principal Employer</p>\n<p>For the month of</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>1…… 31</p>\n</body></html>',
'columns': [
            'Sl. No.',
'Name of workmen',
'Father’s/Husband’s name',
'Sex',
'Dates',
'Remarks'
        ],
'field_mappings': {
            'Sl. No.': 'sl',
'Name of workmen': 'Employee_Name',
'Father’s/Husband’s name': 'Father_Name',
'Sex': 'Gender',
'Dates': 'Date_Of_Joining',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Meghalaya',
'purpose': 'Register of Advances',
'form_code': 'FORM XXII',
'title': 'Register of Advances',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Advances FORM XXII</h1>\n<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[See rule 78 (1)(a)(ii)]</h2>\n<p style="margin:4px 0;font-size:12px;"><b>1. Name and Address of Contractor:</b> {{CONTRACTOR_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>2. Name and Address of establishment in/under which:</b> {{EMPLOYER_NAME}}</p>\n<p>contract is carried on.</p>\n<p style="margin:4px 0;font-size:12px;"><b>3. Nature and location of work:</b> {{SITE_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>4. Name and address of Principal Employer:</b> {{EMPLOYER_NAME}}</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>No Advance is given during the month of {{MONTH}} {{YEAR}}</p>\n</body></html>',
'columns': [
            'SI No.',
'Name of workmen',
"Father's/Husband's name",
'Nature of employment/Designation',
'Wage period and wages payable',
'Date and amount of advance given',
'Purpose(s) for which advance made',
'No. of instalments by which advance to be repaid',
'Date and amount of each instalments repaid',
'Date on which last instalments was repaid',
'Remarks'
        ],
'field_mappings': {
            'No. of instalments by which advance to be repaid': 'Advance_Installments',
'Date and amount of each instalments repaid': 'Advance_Repaid_Amount',
'SI No.': 'sl',
'Name of workmen': 'Employee_Name',
"Father's/Husband's name": 'Father_Name',
'Nature of employment/Designation': 'Designation',
'Date and amount of advance given': 'Advance_Amount',
'Purpose(s) for which advance made': 'Advance_Purpose',
'Date on which last instalments was repaid': 'Advance_Repaid_Date',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Meghalaya',
'purpose': 'Register of Fines',
'form_code': 'FORM XXI',
'title': 'Register of Fines',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Fines FORM XXI</h1>\n<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[See rule 78 (1)(a)(ii)]</h2>\n<p style="margin:4px 0;font-size:12px;"><b>1. Name and Address of Contractor:</b> {{CONTRACTOR_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>2. Name and Address of establishment in/under which:</b> {{EMPLOYER_NAME}}</p>\n<p>contract is carried on.</p>\n<p style="margin:4px 0;font-size:12px;"><b>3. Nature and location of work:</b> {{SITE_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>4. Name and address of Principal Employer:</b> {{EMPLOYER_NAME}}</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>No fine imposed during the month of {{MONTH}} {{YEAR}}</p>\n</body></html>',
'columns': [
            'SI No.',
'Name of workmen',
"Father's/Husband's name",
'Designation/nature for fine imposed',
'Act/Ommission for which imposed',
'Date of Offence',
'Whether workman showed cause against fine',
"Name of person in whose presence employee's was heard",
'Wage periods and wages payable',
'Amount of fine imposed',
'Date on which fine realised',
'Remarks'
        ],
'field_mappings': {
            'SI No.': 'sl',
'Name of workmen': 'Employee_Name',
"Father's/Husband's name": 'Father_Name',
'Act/Ommission for which imposed': 'Fine_Offence_Nature',
'Date of Offence': 'Fine_Offence_Date',
'Amount of fine imposed': 'Fine_Amount',
'Date on which fine realised': 'Fine_Realised_Date',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Meghalaya',
'purpose': 'Register of Overtime',
'form_code': 'FORM XXIII',
'title': 'Register of Overtime',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Overtime FORM XXIII</h1>\n<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[See rule 78 (1)(a)(iii)]</h2>\n<p style="margin:4px 0;font-size:12px;"><b>1. Name and Address of Contractor:</b> {{CONTRACTOR_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>2. Name and Address of establishment in/under which:</b> {{EMPLOYER_NAME}}</p>\n<p>contract is carried on.</p>\n<p style="margin:4px 0;font-size:12px;"><b>3. Nature and location of work:</b> {{SITE_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>4. Name and address of Principal Employer:</b> {{EMPLOYER_NAME}}</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>No overtime work is done during the month of {{MONTH}} {{YEAR}}</p>\n</body></html>',
'columns': [
            'SI No.',
'Name of workman',
"Father's/Husband's name",
'Sex',
'Designation/nature of employment',
'Date on which overtime worked',
'Total overtime worked',
'Normal rate of wages',
'Overtime rate of wages',
'Overtime earnings',
'Date on which overtime wages paid',
'Remarks'
        ],
'field_mappings': {
            'SI No.': 'sl',
'Name of workman': 'Employee_Name',
"Father's/Husband's name": 'Father_Name',
'Sex': 'Gender',
'Designation/nature of employment': 'Designation',
'Date on which overtime worked': 'Overtime_Date',
'Total overtime worked': 'Overtime_Extent',
'Normal rate of wages': 'Normal_Rate',
'Overtime rate of wages': 'Overtime_Rate',
'Overtime earnings': 'Overtime_Earnings',
'Date on which overtime wages paid': 'Overtime_Payment_Date',
'Remarks': 'Remarks'
        },
'calculation_rules': [
            {
                'target': 'otEarnings',
'label': 'Overtime wages',
'formula': 'otHours * otRate'
            }
        ]
    },
{
        'state': 'Meghalaya',
'purpose': 'Register of Workmen',
'form_code': 'FORM XIII',
'title': 'Register of Workmen',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  p.formtitle { text-align: center; font-weight: bold; font-size: 15px; margin-bottom: 2px; }\n  p.rule { text-align: center; font-size: 11px; color: #333; margin-bottom: 8px; }\n  p.title { text-align: center; font-weight: bold; font-size: 15px; margin-bottom: 12px; }\n  p.lead { font-weight: 600; margin-top: 8px; }\n  .gap { height: 10px; }\n  .field { display: flex; gap: 8px; align-items: baseline; margin: 6px 0; font-size: 13px; }\n  .field .label { flex: none; }\n  .field .fill { flex: 1; border-bottom: 1px solid #000; min-height: 1.2em; display: inline-block; }\n  .field .value b { font-weight: 600; }\n  .sign { margin-top: 18px; text-align: right; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <p class="formtitle">FORM XIII</p>\n<p class="title">[ See Rule 75 ]</p>\n<p class="lead">Register of Workmen Employed by Contractor</p>\n<p>Name and address of Contractor …………………………………………………………………………………………....................................................................................</p>\n<p>………………………………………………………………………………………………………………………………………………………………………………………………………………………………</p>\n<p>Nature and location of work ………………………………………………………………………………………………………………………………………………………………………………..</p>\n<p>Name and address of establishment in/under which contract is carried on …………………………………………………………………………………………………………</p>\n<p>……………………………………………………………………………………………………………………………………………………………………………………………………………………………… Name and address of Principal Employer ……………………………………………………………………………………………………………………………………………………………..</p>\n<p>……………………………………………………………………………………………………………………………………………………………………………………………………………………………..</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<div class="gap"></div>\n</body></html>',
'columns': [
            'SI. No.',
'Name and surname of workmen',
'Age and Sex',
'Father’s/ Husband’s name',
'Nature of Employment/ Designation',
'Permanent house a ddress of workman (Village and t e hsil/ t aluk and d istrict)',
'Local Address',
'Date of commencement of employment',
'Signature or thumb impression of workman`',
'Date of termination of employment',
'Reason for termination',
'Remarks'
        ],
'field_mappings': {
            'Date of termination of employment': 'Date_Of_Leaving',
'SI. No.': 'sl',
'Name and surname of workmen': 'Employee_Name',
'Age and Sex': 'Gender',
'Father’s/ Husband’s name': 'Father_Name',
'Permanent house a ddress of workman (Village and t e hsil/ t aluk and d istrict)': 'Address',
'Local Address': 'Address',
'Date of commencement of employment': 'Date_Of_Joining',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Meghalaya',
'purpose': 'Wage Register',
'form_code': 'FORM XVII',
'title': 'Wage Register',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">See Rule 78(I)(a)(i)] FORM XVII</h1>\n<p>Register of Wages</p>\n<p>Name and address of the Contractor</p>\n<p>Name and address of Establishment in/under which contract is carried on</p>\n<p>Name and location of work</p>\n<p>Name and address of Principal Employer</p>\n<p>Wage Period: Monthly</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>Basic wages Dearness Allowance Overtime Other cash payments (Nature of payments to be indicated) Total</p>\n<p>Wage Period: Monthly ………………………………………………………………………………………………………………………………………………………………………………………....</p>\n</body></html>',
'columns': [
            'Sl. No.',
'Name of workmen',
'Sl. No. in the register of workmen',
'Designation/ Nature of employment',
'No. of days worked',
'Unit of work done',
'Daily-rate of wages/piece-rate',
'Amount of wages earned',
'Deductions if any (indicate nature)',
'Net amount paid',
'Signature/Thumb impression of workmen',
'Initial of contractor or his representative'
        ],
'field_mappings': {
            'Unit of work done': 'NO_ofunit_Per_Piece',
'Sl. No.': 'sl',
'Name of workmen': 'Employee_Name',
'Sl. No. in the register of workmen': 'sl',
'Designation/ Nature of employment': 'Designation',
'No. of days worked': 'Total_Days_Worked',
'Daily-rate of wages/piece-rate': 'Normal_Rate',
'Amount of wages earned': 'Gross_Wages',
'Deductions if any (indicate nature)': 'Total_Deductions',
'Net amount paid': 'Net_Salary'
        },
'calculation_rules': [
            {
                'target': 'grossWages',
'label': 'Gross wages',
'formula': 'daysWorked * dailyRate'
            },
{
                'target': 'netSalary',
'label': 'Net amount paid',
'formula': 'grossWages - totalDeductions'
            }
        ]
    },
{
        'state': 'Mizoram',
'purpose': 'Deductions for Damage or Loss',
'form_code': 'FORM XX',
'title': 'Register of Deductions for Damage or Loss',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Deductions for Damage or Loss FORM XX</h1>\n<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[See rule 78 (1)(a)(ii)]</h2>\n<p style="margin:4px 0;font-size:12px;"><b>1. Name and Address of Contractor:</b> {{CONTRACTOR_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>2. Name and Address of establishment in/under which:</b> {{EMPLOYER_NAME}}</p>\n<p>contract is carried on.</p>\n<p style="margin:4px 0;font-size:12px;"><b>3. Nature and location of work:</b> {{SITE_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>4. Name and address of Principal Employer:</b> {{EMPLOYER_NAME}}</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>There is no deduction for damage or Loss during the month of {{MONTH}} {{YEAR}}</p>\n<p>\\</p>\n</body></html>',
'columns': [
            'SI No.',
'Name of workmen',
"Father's/Husband's name",
'Designation',
'Particulars of damage or loss',
'Date of damage or loss',
'Whether workman showed cause against deduction',
"Name of person in whose presence employee's was heard",
'Amount of deduction imposed',
'No. of instalments',
'First Instalments',
'Last Instalments',
'Remarks'
        ],
'field_mappings': {
            'SI No.': 'sl',
'Name of workmen': 'Employee_Name',
"Father's/Husband's name": 'Father_Name',
'Designation': 'Designation',
'Particulars of damage or loss': 'Loss_Caused',
'Date of damage or loss': 'Date_of_Damage',
'Amount of deduction imposed': 'Deduction_Amount',
'No. of instalments': 'Deduction_Installments',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Mizoram',
'purpose': 'MusterRoll',
'form_code': 'FORM XVI',
'title': 'Muster Roll cum Wage Register',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">See Rule 78(1)(a)(i FORM XVI</h1>\n<p>Muster Roll</p>\n<p>Name and address of Contractor</p>\n<p>Name and address of establishment in/under which contract is carried on</p>\n<p>Nature and location of work</p>\n<p>Name and address of Principal Employer</p>\n<p>For the month of</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>1…… 31</p>\n</body></html>',
'columns': [
            'Sl. No.',
'Name of workmen',
'Father’s/Husband’s name',
'Sex',
'Dates',
'Remarks'
        ],
'field_mappings': {
            'Sl. No.': 'sl',
'Name of workmen': 'Employee_Name',
'Father’s/Husband’s name': 'Father_Name',
'Sex': 'Gender',
'Dates': 'Date_Of_Joining',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Mizoram',
'purpose': 'Register of Advances',
'form_code': 'FORM XXII',
'title': 'Register of Advances',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Advances FORM XXII</h1>\n<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[See rule 78 (1)(a)(ii)]</h2>\n<p style="margin:4px 0;font-size:12px;"><b>1. Name and Address of Contractor:</b> {{CONTRACTOR_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>2. Name and Address of establishment in/under which:</b> {{EMPLOYER_NAME}}</p>\n<p>contract is carried on.</p>\n<p style="margin:4px 0;font-size:12px;"><b>3. Nature and location of work:</b> {{SITE_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>4. Name and address of Principal Employer:</b> {{EMPLOYER_NAME}}</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>No Advance is given during the month of {{MONTH}} {{YEAR}}</p>\n</body></html>',
'columns': [
            'SI No.',
'Name of workmen',
"Father's/Husband's name",
'Nature of employment/Designation',
'Wage period and wages payable',
'Date and amount of advance given',
'Purpose(s) for which advance made',
'No. of instalments by which advance to be repaid',
'Date and amount of each instalments repaid',
'Date on which last instalments was repaid',
'Remarks'
        ],
'field_mappings': {
            'SI No.': 'sl',
'Name of workmen': 'Employee_Name',
"Father's/Husband's name": 'Father_Name',
'Nature of employment/Designation': 'Designation',
'Date and amount of advance given': 'Advance_Amount',
'Purpose(s) for which advance made': 'Advance_Purpose',
'No. of instalments by which advance to be repaid': 'Advance_Installments',
'Date and amount of each instalments repaid': 'Advance_Repaid_Amount',
'Date on which last instalments was repaid': 'Advance_Repaid_Date',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Mizoram',
'purpose': 'Register of Fines',
'form_code': 'FORM XXI',
'title': 'Register of Fines',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Fines FORM XXI</h1>\n<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[See rule 78 (1)(a)(ii)]</h2>\n<p style="margin:4px 0;font-size:12px;"><b>1. Name and Address of Contractor:</b> {{CONTRACTOR_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>2. Name and Address of establishment in/under which:</b> {{EMPLOYER_NAME}}</p>\n<p>contract is carried on.</p>\n<p style="margin:4px 0;font-size:12px;"><b>3. Nature and location of work:</b> {{SITE_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>4. Name and address of Principal Employer:</b> {{EMPLOYER_NAME}}</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>No fine imposed during the month of {{MONTH}} {{YEAR}}</p>\n</body></html>',
'columns': [
            'SI No.',
'Name of workmen',
"Father's/Husband's name",
'Designation/nature for fine imposed',
'Act/Ommission for which imposed',
'Date of Offence',
'Whether workman showed cause against fine',
"Name of person in whose presence employee's was heard",
'Wage periods and wages payable',
'Amount of fine imposed',
'Date on which fine realised',
'Remarks'
        ],
'field_mappings': {
            'SI No.': 'sl',
'Name of workmen': 'Employee_Name',
"Father's/Husband's name": 'Father_Name',
'Act/Ommission for which imposed': 'Fine_Offence_Nature',
'Date of Offence': 'Fine_Offence_Date',
'Amount of fine imposed': 'Fine_Amount',
'Date on which fine realised': 'Fine_Realised_Date',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Mizoram',
'purpose': 'Register of Overtime',
'form_code': 'FORM XXIII',
'title': 'Register of Overtime',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Overtime FORM XXIII</h1>\n<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[See rule 78 (1)(a)(iii)]</h2>\n<p style="margin:4px 0;font-size:12px;"><b>1. Name and Address of Contractor:</b> {{CONTRACTOR_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>2. Name and Address of establishment in/under which:</b> {{EMPLOYER_NAME}}</p>\n<p>contract is carried on.</p>\n<p style="margin:4px 0;font-size:12px;"><b>3. Nature and location of work:</b> {{SITE_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>4. Name and address of Principal Employer:</b> {{EMPLOYER_NAME}}</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>No overtime work is done during the month of {{MONTH}} {{YEAR}}</p>\n</body></html>',
'columns': [
            'SI No.',
'Name of workman',
"Father's/Husband's name",
'Sex',
'Designation/nature of employment',
'Date on which overtime worked',
'Total overtime worked',
'Normal rate of wages',
'Overtime rate of wages',
'Overtime earnings',
'Date on which overtime wages paid',
'Remarks'
        ],
'field_mappings': {
            'SI No.': 'sl',
'Name of workman': 'Employee_Name',
"Father's/Husband's name": 'Father_Name',
'Sex': 'Gender',
'Designation/nature of employment': 'Designation',
'Date on which overtime worked': 'Overtime_Date',
'Total overtime worked': 'Overtime_Extent',
'Normal rate of wages': 'Normal_Rate',
'Overtime rate of wages': 'Overtime_Rate',
'Overtime earnings': 'Overtime_Earnings',
'Date on which overtime wages paid': 'Overtime_Payment_Date',
'Remarks': 'Remarks'
        },
'calculation_rules': [
            {
                'target': 'otEarnings',
'label': 'Overtime wages',
'formula': 'otHours * otRate'
            }
        ]
    },
{
        'state': 'Mizoram',
'purpose': 'Register of Workmen',
'form_code': 'FORM XIII',
'title': 'Register of Workmen',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  p.formtitle { text-align: center; font-weight: bold; font-size: 15px; margin-bottom: 2px; }\n  p.rule { text-align: center; font-size: 11px; color: #333; margin-bottom: 8px; }\n  p.title { text-align: center; font-weight: bold; font-size: 15px; margin-bottom: 12px; }\n  p.lead { font-weight: 600; margin-top: 8px; }\n  .gap { height: 10px; }\n  .field { display: flex; gap: 8px; align-items: baseline; margin: 6px 0; font-size: 13px; }\n  .field .label { flex: none; }\n  .field .fill { flex: 1; border-bottom: 1px solid #000; min-height: 1.2em; display: inline-block; }\n  .field .value b { font-weight: 600; }\n  .sign { margin-top: 18px; text-align: right; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <p class="formtitle">FORM XIII</p>\n<p class="title">[ See Rule 75 ]</p>\n<p class="lead">Register of Workmen Employed by Contractor</p>\n<p>Name and address of Contractor …………………………………………………………………………………………....................................................................................</p>\n<p>………………………………………………………………………………………………………………………………………………………………………………………………………………………………</p>\n<p>Nature and location of work ………………………………………………………………………………………………………………………………………………………………………………..</p>\n<p>Name and address of establishment in/under which contract is carried on …………………………………………………………………………………………………………</p>\n<p>……………………………………………………………………………………………………………………………………………………………………………………………………………………………… Name and address of Principal Employer ……………………………………………………………………………………………………………………………………………………………..</p>\n<p>……………………………………………………………………………………………………………………………………………………………………………………………………………………………..</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<div class="gap"></div>\n</body></html>',
'columns': [
            'SI. No.',
'Name and surname of workmen',
'Age and Sex',
'Father’s/ Husband’s name',
'Nature of Employment/ Designation',
'Permanent house a ddress of workman (Village and t e hsil/ t aluk and d istrict)',
'Local Address',
'Date of commencement of employment',
'Signature or thumb impression of workman`',
'Date of termination of employment',
'Reason for termination',
'Remarks'
        ],
'field_mappings': {
            'Date of termination of employment': 'Date_Of_Leaving',
'SI. No.': 'sl',
'Name and surname of workmen': 'Employee_Name',
'Age and Sex': 'Gender',
'Father’s/ Husband’s name': 'Father_Name',
'Permanent house a ddress of workman (Village and t e hsil/ t aluk and d istrict)': 'Address',
'Local Address': 'Address',
'Date of commencement of employment': 'Date_Of_Joining',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Mizoram',
'purpose': 'Wage Register',
'form_code': 'FORM XVII',
'title': 'Wage Register',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">See Rule 78(I)(a)(i)] FORM XVII</h1>\n<p>Register of Wages</p>\n<p>Name and address of the Contractor</p>\n<p>Name and address of Establishment in/under which contract is carried on</p>\n<p>Name and location of work</p>\n<p>Name and address of Principal Employer</p>\n<p>Wage Period: Monthly</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>Basic wages Dearness Allowance Overtime Other cash payments (Nature of payments to be indicated) Total</p>\n<p>Wage Period: Monthly ………………………………………………………………………………………………………………………………………………………………………………………....</p>\n</body></html>',
'columns': [
            'Sl. No.',
'Name of workmen',
'Sl. No. in the register of workmen',
'Designation/ Nature of employment',
'No. of days worked',
'Unit of work done',
'Daily-rate of wages/piece-rate',
'Amount of wages earned',
'Deductions if any (indicate nature)',
'Net amount paid',
'Signature/Thumb impression of workmen',
'Initial of contractor or his representative'
        ],
'field_mappings': {
            'Unit of work done': 'NO_ofunit_Per_Piece',
'Sl. No.': 'sl',
'Name of workmen': 'Employee_Name',
'Sl. No. in the register of workmen': 'sl',
'Designation/ Nature of employment': 'Designation',
'No. of days worked': 'Total_Days_Worked',
'Daily-rate of wages/piece-rate': 'Normal_Rate',
'Amount of wages earned': 'Gross_Wages',
'Deductions if any (indicate nature)': 'Total_Deductions',
'Net amount paid': 'Net_Salary'
        },
'calculation_rules': [
            {
                'target': 'grossWages',
'label': 'Gross wages',
'formula': 'daysWorked * dailyRate'
            },
{
                'target': 'netSalary',
'label': 'Net amount paid',
'formula': 'grossWages - totalDeductions'
            }
        ]
    },
{
        'state': 'Nagaland',
'purpose': 'Deductions for Damage or Loss',
'form_code': 'FORM XX',
'title': 'Register of Deductions for Damage or Loss',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Deductions for Damage or Loss FORM XX</h1>\n<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[See rule 78 (1)(a)(ii)]</h2>\n<p style="margin:4px 0;font-size:12px;"><b>1. Name and Address of Contractor:</b> {{CONTRACTOR_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>2. Name and Address of establishment in/under which:</b> {{EMPLOYER_NAME}}</p>\n<p>contract is carried on.</p>\n<p style="margin:4px 0;font-size:12px;"><b>3. Nature and location of work:</b> {{SITE_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>4. Name and address of Principal Employer:</b> {{EMPLOYER_NAME}}</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>There is no deduction for damage or Loss during the month of {{MONTH}} {{YEAR}}</p>\n<p>\\</p>\n</body></html>',
'columns': [
            'SI No.',
'Name of workmen',
"Father's/Husband's name",
'Designation',
'Particulars of damage or loss',
'Date of damage or loss',
'Whether workman showed cause against deduction',
"Name of person in whose presence employee's was heard",
'Amount of deduction imposed',
'No. of instalments',
'First Instalments',
'Last Instalments',
'Remarks'
        ],
'field_mappings': {
            "Father's/Husband's name": 'Father_Name',
'SI No.': 'sl',
'Name of workmen': 'Employee_Name',
'Designation': 'Designation',
'Particulars of damage or loss': 'Loss_Caused',
'Date of damage or loss': 'Date_of_Damage',
'Amount of deduction imposed': 'Deduction_Amount',
'No. of instalments': 'Deduction_Installments',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Nagaland',
'purpose': 'MusterRoll',
'form_code': 'FORM XVI',
'title': 'Muster Roll cum Wage Register',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">See Rule 78(1)(a)(i FORM XVI</h1>\n<p>Muster Roll</p>\n<p>Name and address of Contractor</p>\n<p>Name and address of establishment in/under which contract is carried on</p>\n<p>Nature and location of work</p>\n<p>Name and address of Principal Employer</p>\n<p>For the month of</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>1…… 31</p>\n</body></html>',
'columns': [
            'Sl. No.',
'Name of workmen',
'Father’s/Husband’s name',
'Sex',
'Dates',
'Remarks'
        ],
'field_mappings': {
            'Sl. No.': 'sl',
'Name of workmen': 'Employee_Name',
'Father’s/Husband’s name': 'Father_Name',
'Sex': 'Gender',
'Dates': 'Date_Of_Joining',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Nagaland',
'purpose': 'Register of Advances',
'form_code': 'FORM XXII',
'title': 'Register of Advances',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Advances FORM XXII</h1>\n<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[See rule 78 (1)(a)(ii)]</h2>\n<p style="margin:4px 0;font-size:12px;"><b>1. Name and Address of Contractor:</b> {{CONTRACTOR_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>2. Name and Address of establishment in/under which:</b> {{EMPLOYER_NAME}}</p>\n<p>contract is carried on.</p>\n<p style="margin:4px 0;font-size:12px;"><b>3. Nature and location of work:</b> {{SITE_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>4. Name and address of Principal Employer:</b> {{EMPLOYER_NAME}}</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>No Advance is given during the month of {{MONTH}} {{YEAR}}</p>\n</body></html>',
'columns': [
            'SI No.',
'Name of workmen',
"Father's/Husband's name",
'Nature of employment/Designation',
'Wage period and wages payable',
'Date and amount of advance given',
'Purpose(s) for which advance made',
'No. of instalments by which advance to be repaid',
'Date and amount of each instalments repaid',
'Date on which last instalments was repaid',
'Remarks'
        ],
'field_mappings': {
            'Date and amount of advance given': 'Advance_Amount',
'SI No.': 'sl',
'Name of workmen': 'Employee_Name',
"Father's/Husband's name": 'Father_Name',
'Nature of employment/Designation': 'Designation',
'Purpose(s) for which advance made': 'Advance_Purpose',
'No. of instalments by which advance to be repaid': 'Advance_Installments',
'Date and amount of each instalments repaid': 'Advance_Repaid_Amount',
'Date on which last instalments was repaid': 'Advance_Repaid_Date',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Nagaland',
'purpose': 'Register of Fines',
'form_code': 'FORM XXI',
'title': 'Register of Fines',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Fines FORM XXI</h1>\n<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[See rule 78 (1)(a)(ii)]</h2>\n<p style="margin:4px 0;font-size:12px;"><b>1. Name and Address of Contractor:</b> {{CONTRACTOR_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>2. Name and Address of establishment in/under which:</b> {{EMPLOYER_NAME}}</p>\n<p>contract is carried on.</p>\n<p style="margin:4px 0;font-size:12px;"><b>3. Nature and location of work:</b> {{SITE_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>4. Name and address of Principal Employer:</b> {{EMPLOYER_NAME}}</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>No fine imposed during the month of {{MONTH}} {{YEAR}}</p>\n</body></html>',
'columns': [
            'SI No.',
'Name of workmen',
"Father's/Husband's name",
'Designation/nature for fine imposed',
'Act/Ommission for which imposed',
'Date of Offence',
'Whether workman showed cause against fine',
"Name of person in whose presence employee's was heard",
'Wage periods and wages payable',
'Amount of fine imposed',
'Date on which fine realised',
'Remarks'
        ],
'field_mappings': {
            'SI No.': 'sl',
'Name of workmen': 'Employee_Name',
"Father's/Husband's name": 'Father_Name',
'Act/Ommission for which imposed': 'Fine_Offence_Nature',
'Date of Offence': 'Fine_Offence_Date',
'Amount of fine imposed': 'Fine_Amount',
'Date on which fine realised': 'Fine_Realised_Date',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Nagaland',
'purpose': 'Register of Overtime',
'form_code': 'FORM XXIII',
'title': 'Register of Overtime',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Overtime FORM XXIII</h1>\n<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[See rule 78 (1)(a)(iii)]</h2>\n<p style="margin:4px 0;font-size:12px;"><b>1. Name and Address of Contractor:</b> {{CONTRACTOR_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>2. Name and Address of establishment in/under which:</b> {{EMPLOYER_NAME}}</p>\n<p>contract is carried on.</p>\n<p style="margin:4px 0;font-size:12px;"><b>3. Nature and location of work:</b> {{SITE_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>4. Name and address of Principal Employer:</b> {{EMPLOYER_NAME}}</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>No overtime work is done during the month of {{MONTH}} {{YEAR}}</p>\n</body></html>',
'columns': [
            'SI No.',
'Name of workman',
"Father's/Husband's name",
'Sex',
'Designation/nature of employment',
'Date on which overtime worked',
'Total overtime worked',
'Normal rate of wages',
'Overtime rate of wages',
'Overtime earnings',
'Date on which overtime wages paid',
'Remarks'
        ],
'field_mappings': {
            'Date on which overtime wages paid': 'Overtime_Payment_Date',
'SI No.': 'sl',
'Name of workman': 'Employee_Name',
"Father's/Husband's name": 'Father_Name',
'Sex': 'Gender',
'Designation/nature of employment': 'Designation',
'Date on which overtime worked': 'Overtime_Date',
'Total overtime worked': 'Overtime_Extent',
'Normal rate of wages': 'Normal_Rate',
'Overtime rate of wages': 'Overtime_Rate',
'Overtime earnings': 'Overtime_Earnings',
'Remarks': 'Remarks'
        },
'calculation_rules': [
            {
                'target': 'otEarnings',
'label': 'Overtime wages',
'formula': 'otHours * otRate'
            }
        ]
    },
{
        'state': 'Nagaland',
'purpose': 'Register of Workmen',
'form_code': 'FORM XIII',
'title': 'Register of Workmen',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  p.formtitle { text-align: center; font-weight: bold; font-size: 15px; margin-bottom: 2px; }\n  p.rule { text-align: center; font-size: 11px; color: #333; margin-bottom: 8px; }\n  p.title { text-align: center; font-weight: bold; font-size: 15px; margin-bottom: 12px; }\n  p.lead { font-weight: 600; margin-top: 8px; }\n  .gap { height: 10px; }\n  .field { display: flex; gap: 8px; align-items: baseline; margin: 6px 0; font-size: 13px; }\n  .field .label { flex: none; }\n  .field .fill { flex: 1; border-bottom: 1px solid #000; min-height: 1.2em; display: inline-block; }\n  .field .value b { font-weight: 600; }\n  .sign { margin-top: 18px; text-align: right; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <p class="formtitle">FORM XIII</p>\n<p class="title">[ See Rule 75 ]</p>\n<p class="lead">Register of Workmen Employed by Contractor</p>\n<p>Name and address of Contractor …………………………………………………………………………………………....................................................................................</p>\n<p>………………………………………………………………………………………………………………………………………………………………………………………………………………………………</p>\n<p>Nature and location of work ………………………………………………………………………………………………………………………………………………………………………………..</p>\n<p>Name and address of establishment in/under which contract is carried on …………………………………………………………………………………………………………</p>\n<p>……………………………………………………………………………………………………………………………………………………………………………………………………………………………… Name and address of Principal Employer ……………………………………………………………………………………………………………………………………………………………..</p>\n<p>……………………………………………………………………………………………………………………………………………………………………………………………………………………………..</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<div class="gap"></div>\n</body></html>',
'columns': [
            'SI. No.',
'Name and surname of workmen',
'Age and Sex',
'Father’s/ Husband’s name',
'Nature of Employment/ Designation',
'Permanent house a ddress of workman (Village and t e hsil/ t aluk and d istrict)',
'Local Address',
'Date of commencement of employment',
'Signature or thumb impression of workman`',
'Date of termination of employment',
'Reason for termination',
'Remarks'
        ],
'field_mappings': {
            'Permanent house a ddress of workman (Village and t e hsil/ t aluk and d istrict)': 'Address',
'Date of termination of employment': 'Date_Of_Leaving',
'SI. No.': 'sl',
'Name and surname of workmen': 'Employee_Name',
'Age and Sex': 'Gender',
'Father’s/ Husband’s name': 'Father_Name',
'Local Address': 'Address',
'Date of commencement of employment': 'Date_Of_Joining',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Nagaland',
'purpose': 'Wage Register',
'form_code': 'FORM XVII',
'title': 'Wage Register',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">See Rule 78(I)(a)(i)] FORM XVII</h1>\n<p>Register of Wages</p>\n<p>Name and address of the Contractor</p>\n<p>Name and address of Establishment in/under which contract is carried on</p>\n<p>Name and location of work</p>\n<p>Name and address of Principal Employer</p>\n<p>Wage Period: Monthly</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>Basic wages Dearness Allowance Overtime Other cash payments (Nature of payments to be indicated) Total</p>\n<p>Wage Period: Monthly ………………………………………………………………………………………………………………………………………………………………………………………....</p>\n</body></html>',
'columns': [
            'Sl. No.',
'Name of workmen',
'Sl. No. in the register of workmen',
'Designation/ Nature of employment',
'No. of days worked',
'Unit of work done',
'Daily-rate of wages/piece-rate',
'Amount of wages earned',
'Deductions if any (indicate nature)',
'Net amount paid',
'Signature/Thumb impression of workmen',
'Initial of contractor or his representative'
        ],
'field_mappings': {
            'Unit of work done': 'NO_ofunit_Per_Piece',
'Sl. No.': 'sl',
'Name of workmen': 'Employee_Name',
'Sl. No. in the register of workmen': 'sl',
'Designation/ Nature of employment': 'Designation',
'No. of days worked': 'Total_Days_Worked',
'Daily-rate of wages/piece-rate': 'Normal_Rate',
'Amount of wages earned': 'Gross_Wages',
'Deductions if any (indicate nature)': 'Total_Deductions',
'Net amount paid': 'Net_Salary'
        },
'calculation_rules': [
            {
                'target': 'grossWages',
'label': 'Gross wages',
'formula': 'daysWorked * dailyRate'
            },
{
                'target': 'netSalary',
'label': 'Net amount paid',
'formula': 'grossWages - totalDeductions'
            }
        ]
    },
{
        'state': 'Orissa',
'purpose': 'Deductions for Damage or Loss',
'form_code': 'FORM XVI',
'title': 'Register of Deductions for Damage or Loss',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">See Rule 78(1)(a)(i FORM XVI</h1>\n<p>Muster Roll</p>\n<p>Name and address of Contractor</p>\n<p>Name and address of establishment in/under which contract is carried on</p>\n<p>Nature and location of work</p>\n<p>Name and address of Principal Employer</p>\n<p>For the month of</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>1…… 31</p>\n</body></html>',
'columns': [
            'Sl. No.',
'Name of workmen',
'Father’s/Husband’s name',
'Sex',
'Dates',
'Remarks'
        ],
'field_mappings': {
            'Sl. No.': 'sl',
'Name of workmen': 'Employee_Name',
'Father’s/Husband’s name': 'Father_Name',
'Sex': 'Gender',
'Dates': 'Date_Of_Joining',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Orissa',
'purpose': 'Register of Advances',
'form_code': 'FORM XVIII',
'title': 'Register of Advances',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Advances FORM XVIII</h1>\n<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[See rule 78 (1)(a)(ii)]</h2>\n<p style="margin:4px 0;font-size:12px;"><b>1. Name and Address of Contractor:</b> {{CONTRACTOR_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>2. Name and Address of establishment in/under which:</b> {{EMPLOYER_NAME}}</p>\n<p>contract is carried on.</p>\n<p style="margin:4px 0;font-size:12px;"><b>3. Nature and location of work:</b> {{SITE_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>4. Name and address of Principal Employer:</b> {{EMPLOYER_NAME}}</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>No Advance is given during the month of {{MONTH}} {{YEAR}}</p>\n</body></html>',
'columns': [
            'SI No.',
'Name of workmen',
"Father's/Husband's name",
'Nature of employment/Designation',
'Wage period and wages payable',
'Date and amount of advance given',
'Purpose(s) for which advance made',
'No. of instalments by which advance to be repaid',
'Date and amount of each instalments repaid',
'Date on which last instalments was repaid',
'Remarks'
        ],
'field_mappings': {
            'No. of instalments by which advance to be repaid': 'Advance_Installments',
'Date and amount of each instalments repaid': 'Advance_Repaid_Amount',
'SI No.': 'sl',
'Name of workmen': 'Employee_Name',
"Father's/Husband's name": 'Father_Name',
'Nature of employment/Designation': 'Designation',
'Date and amount of advance given': 'Advance_Amount',
'Purpose(s) for which advance made': 'Advance_Purpose',
'Date on which last instalments was repaid': 'Advance_Repaid_Date',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Orissa',
'purpose': 'Register of Fines',
'form_code': 'FORM XVII',
'title': 'Register of Fines',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">See Rule 78(I)(a)(i)] FORM XVII</h1>\n<p>Register of Wages</p>\n<p>Name and address of the Contractor</p>\n<p>Name and address of Establishment in/under which contract is carried on</p>\n<p>Name and location of work</p>\n<p>Name and address of Principal Employer</p>\n<p>Wage Period: Monthly</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>Basic wages Dearness Allowance Overtime Other cash payments (Nature of payments to be indicated) Total</p>\n<p>Wage Period: Monthly ………………………………………………………………………………………………………………………………………………………………………………………....</p>\n</body></html>',
'columns': [
            'Sl. No.',
'Name of workmen',
'Sl. No. in the register of workmen',
'Designation/ Nature of employment',
'No. of days worked',
'Unit of work done',
'Daily-rate of wages/piece-rate',
'Amount of wages earned',
'Deductions if any (indicate nature)',
'Net amount paid',
'Signature/Thumb impression of workmen',
'Initial of contractor or his representative'
        ],
'field_mappings': {
            'Unit of work done': 'NO_ofunit_Per_Piece',
'Sl. No.': 'sl',
'Name of workmen': 'Employee_Name',
'Sl. No. in the register of workmen': 'sl',
'Designation/ Nature of employment': 'Designation',
'No. of days worked': 'Total_Days_Worked',
'Daily-rate of wages/piece-rate': 'Normal_Rate',
'Amount of wages earned': 'Gross_Wages',
'Deductions if any (indicate nature)': 'Total_Deductions',
'Net amount paid': 'Net_Salary'
        },
'calculation_rules': [
            {
                'target': 'grossWages',
'label': 'Gross wages',
'formula': 'daysWorked * dailyRate'
            },
{
                'target': 'netSalary',
'label': 'Net amount paid',
'formula': 'grossWages - totalDeductions'
            }
        ]
    },
{
        'state': 'Orissa',
'purpose': 'Register of Overtime',
'form_code': 'FORM XIX',
'title': 'Register of Overtime',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  p.formtitle { text-align: center; font-weight: bold; font-size: 15px; }\n  p.title { text-align: center; font-weight: bold; font-size: 15px; margin-bottom: 10px; }\n  .field { display: flex; gap: 8px; margin: 6px 0; font-size: 13px; }\n  .field .label { flex: none; }\n  .field .fill { flex: 1; border-bottom: 1px solid #000; min-height: 1.2em; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 4px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <p class="formtitle">FORM XIX</p>\n<p class="rule">*[See Rule 78(1) (b)]</p>\n<p class="title">Wage Slip</p>\n<div class="field"><span class="label">Name and Address of Contractor:</span><span class="fill"></span></div>\n<div class="field"><span class="label">Nature and location of work:</span><span class="fill"></span></div>\n<div class="field"><span class="label">Name and Father’s/Husband’s name of the workman:</span><span class="fill"></span></div>\n<div class="field"><span class="label">For the Week/Fortnight/Month ending:</span><span class="fill"></span></div>\n<div class="field"><span class="label">1. No. of days worked:</span><span class="fill"></span></div>\n<div class="field"><span class="label">2. No. of unit worked in case of piece-rate workers:</span><span class="fill"></span></div>\n<div class="field"><span class="label">3. Rate of daily wages/piece-rate:</span><span class="fill"></span></div>\n<div class="field"><span class="label">4. Amount of overtime wages:</span><span class="fill"></span></div>\n<div class="field"><span class="label">5. Gross wages payable:</span><span class="fill"></span></div>\n<div class="field"><span class="label">6. Deductions, if any:</span><span class="fill"></span></div>\n<div class="field"><span class="label">7. Net amount of wages paid:</span><span class="fill"></span></div>\n<div class="field"><span class="label">Initials of the Contractor or his:</span><span class="fill"></span></div>\n<div class="field"><span class="label">Representative:</span><span class="fill"></span></div>\n<p>*Substituted for the brackets, words, figures and letter “[See Rule 78(2) (b)]” by GSR 948, dated 12-7-1978, w.e.f. 22-7-1978.</p>\n</body></html>',
'columns': [],
'field_mappings': {
            
        },
'calculation_rules': []
    },
{
        'state': 'Orissa',
'purpose': 'Register of Workmen',
'form_code': 'FORM IX',
'title': 'Register of Workmen',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">(See Rule 74) FORM IX</h1>\n<p>Register of workmen employed by Contractor</p>\n<p>Name and address of contractor…. Name and address of establisment in/under which contract is carried on…</p>\n<p>Nature and location of work….. Name and address of Principal Employers…..</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n</body></html>',
'columns': [
            'Sl. No.',
'Name and surname of workmen',
'Age and sex',
"Father's/husband's name",
'Nature of employment/designation',
'Permanent home address of workman (Village and Tehsil/Taluka and District)',
'Present Address',
'Date of commencement of employment',
'Date of termination of employment',
'Signature or thumb impression of workman',
'Remarks'
        ],
'field_mappings': {
            'Permanent home address of workman (Village and Tehsil/Taluka and District)': 'Address',
'Present Address': 'Address',
'Date of termination of employment': 'Date_Of_Leaving',
'Sl. No.': 'sl',
'Name and surname of workmen': 'Employee_Name',
'Age and sex': 'Gender',
"Father's/husband's name": 'Father_Name',
'Nature of employment/designation': 'Designation',
'Date of commencement of employment': 'Date_Of_Joining',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Orissa',
'purpose': 'Wage Register',
'form_code': 'FORM XIII',
'title': 'Wage Register',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  p.formtitle { text-align: center; font-weight: bold; font-size: 15px; margin-bottom: 2px; }\n  p.rule { text-align: center; font-size: 11px; color: #333; margin-bottom: 8px; }\n  p.title { text-align: center; font-weight: bold; font-size: 15px; margin-bottom: 12px; }\n  p.lead { font-weight: 600; margin-top: 8px; }\n  .gap { height: 10px; }\n  .field { display: flex; gap: 8px; align-items: baseline; margin: 6px 0; font-size: 13px; }\n  .field .label { flex: none; }\n  .field .fill { flex: 1; border-bottom: 1px solid #000; min-height: 1.2em; display: inline-block; }\n  .field .value b { font-weight: 600; }\n  .sign { margin-top: 18px; text-align: right; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <p class="formtitle">FORM XIII</p>\n<p class="title">[ See Rule 75 ]</p>\n<p class="lead">Register of Workmen Employed by Contractor</p>\n<p>Name and address of Contractor …………………………………………………………………………………………....................................................................................</p>\n<p>………………………………………………………………………………………………………………………………………………………………………………………………………………………………</p>\n<p>Nature and location of work ………………………………………………………………………………………………………………………………………………………………………………..</p>\n<p>Name and address of establishment in/under which contract is carried on …………………………………………………………………………………………………………</p>\n<p>……………………………………………………………………………………………………………………………………………………………………………………………………………………………… Name and address of Principal Employer ……………………………………………………………………………………………………………………………………………………………..</p>\n<p>……………………………………………………………………………………………………………………………………………………………………………………………………………………………..</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<div class="gap"></div>\n</body></html>',
'columns': [
            'SI. No.',
'Name and surname of workmen',
'Age and Sex',
'Father’s/ Husband’s name',
'Nature of Employment/ Designation',
'Permanent house a ddress of workman (Village and t e hsil/ t aluk and d istrict)',
'Local Address',
'Date of commencement of employment',
'Signature or thumb impression of workman`',
'Date of termination of employment',
'Reason for termination',
'Remarks'
        ],
'field_mappings': {
            'Permanent house a ddress of workman (Village and t e hsil/ t aluk and d istrict)': 'Address',
'Date of commencement of employment': 'Date_Of_Joining',
'Date of termination of employment': 'Date_Of_Leaving',
'SI. No.': 'sl',
'Local Address': 'Address',
'Name and surname of workmen': 'Employee_Name',
'Age and Sex': 'Gender',
'Father’s/ Husband’s name': 'Father_Name',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Pondicherry',
'purpose': 'Deductions for Damage or Loss',
'form_code': 'FORM XX',
'title': 'Register of Deductions for Damage or Loss',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Deductions for Damage or Loss FORM XX</h1>\n<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[See rule 78 (1)(a)(ii)]</h2>\n<p style="margin:4px 0;font-size:12px;"><b>1. Name and Address of Contractor:</b> {{CONTRACTOR_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>2. Name and Address of establishment in/under which:</b> {{EMPLOYER_NAME}}</p>\n<p>contract is carried on.</p>\n<p style="margin:4px 0;font-size:12px;"><b>3. Nature and location of work:</b> {{SITE_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>4. Name and address of Principal Employer:</b> {{EMPLOYER_NAME}}</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>There is no deduction for damage or Loss during the month of {{MONTH}} {{YEAR}}</p>\n<p>\\</p>\n</body></html>',
'columns': [
            'SI No.',
'Name of workmen',
"Father's/Husband's name",
'Designation',
'Particulars of damage or loss',
'Date of damage or loss',
'Whether workman showed cause against deduction',
"Name of person in whose presence employee's was heard",
'Amount of deduction imposed',
'No. of instalments',
'First Instalments',
'Last Instalments',
'Remarks'
        ],
'field_mappings': {
            'SI No.': 'sl',
'Name of workmen': 'Employee_Name',
"Father's/Husband's name": 'Father_Name',
'Designation': 'Designation',
'Particulars of damage or loss': 'Loss_Caused',
'Date of damage or loss': 'Date_of_Damage',
'Amount of deduction imposed': 'Deduction_Amount',
'No. of instalments': 'Deduction_Installments',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Pondicherry',
'purpose': 'MusterRoll',
'form_code': 'FORM XVI',
'title': 'Muster Roll cum Wage Register',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">See Rule 78(1)(a)(i FORM XVI</h1>\n<p>Muster Roll</p>\n<p>Name and address of Contractor</p>\n<p>Name and address of establishment in/under which contract is carried on</p>\n<p>Nature and location of work</p>\n<p>Name and address of Principal Employer</p>\n<p>For the month of</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>1…… 31</p>\n</body></html>',
'columns': [
            'Sl. No.',
'Name of workmen',
'Father’s/Husband’s name',
'Sex',
'Dates',
'Remarks'
        ],
'field_mappings': {
            'Sl. No.': 'sl',
'Name of workmen': 'Employee_Name',
'Father’s/Husband’s name': 'Father_Name',
'Sex': 'Gender',
'Dates': 'Date_Of_Joining',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Pondicherry',
'purpose': 'Register of Advances',
'form_code': 'FORM XXII',
'title': 'Register of Advances',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Advances FORM XXII</h1>\n<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[See rule 78 (1)(a)(ii)]</h2>\n<p style="margin:4px 0;font-size:12px;"><b>1. Name and Address of Contractor:</b> {{CONTRACTOR_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>2. Name and Address of establishment in/under which:</b> {{EMPLOYER_NAME}}</p>\n<p>contract is carried on.</p>\n<p style="margin:4px 0;font-size:12px;"><b>3. Nature and location of work:</b> {{SITE_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>4. Name and address of Principal Employer:</b> {{EMPLOYER_NAME}}</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>No Advance is given during the month of {{MONTH}} {{YEAR}}</p>\n</body></html>',
'columns': [
            'SI No.',
'Name of workmen',
"Father's/Husband's name",
'Nature of employment/Designation',
'Wage period and wages payable',
'Date and amount of advance given',
'Purpose(s) for which advance made',
'No. of instalments by which advance to be repaid',
'Date and amount of each instalments repaid',
'Date on which last instalments was repaid',
'Remarks'
        ],
'field_mappings': {
            'Date on which last instalments was repaid': 'Advance_Repaid_Date',
'SI No.': 'sl',
'Name of workmen': 'Employee_Name',
"Father's/Husband's name": 'Father_Name',
'Nature of employment/Designation': 'Designation',
'Date and amount of advance given': 'Advance_Amount',
'Purpose(s) for which advance made': 'Advance_Purpose',
'No. of instalments by which advance to be repaid': 'Advance_Installments',
'Date and amount of each instalments repaid': 'Advance_Repaid_Amount',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Pondicherry',
'purpose': 'Register of Fines',
'form_code': 'FORM XXI',
'title': 'Register of Fines',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Fines FORM XXI</h1>\n<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[See rule 78 (1)(a)(ii)]</h2>\n<p style="margin:4px 0;font-size:12px;"><b>1. Name and Address of Contractor:</b> {{CONTRACTOR_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>2. Name and Address of establishment in/under which:</b> {{EMPLOYER_NAME}}</p>\n<p>contract is carried on.</p>\n<p style="margin:4px 0;font-size:12px;"><b>3. Nature and location of work:</b> {{SITE_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>4. Name and address of Principal Employer:</b> {{EMPLOYER_NAME}}</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>No fine imposed during the month of {{MONTH}} {{YEAR}}</p>\n</body></html>',
'columns': [
            'SI No.',
'Name of workmen',
"Father's/Husband's name",
'Designation/nature for fine imposed',
'Act/Ommission for which imposed',
'Date of Offence',
'Whether workman showed cause against fine',
"Name of person in whose presence employee's was heard",
'Wage periods and wages payable',
'Amount of fine imposed',
'Date on which fine realised',
'Remarks'
        ],
'field_mappings': {
            'SI No.': 'sl',
'Name of workmen': 'Employee_Name',
"Father's/Husband's name": 'Father_Name',
'Act/Ommission for which imposed': 'Fine_Offence_Nature',
'Date of Offence': 'Fine_Offence_Date',
'Amount of fine imposed': 'Fine_Amount',
'Date on which fine realised': 'Fine_Realised_Date',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Pondicherry',
'purpose': 'Register of Overtime',
'form_code': 'FORM XXIII',
'title': 'Register of Overtime',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Overtime FORM XXIII</h1>\n<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[See rule 78 (1)(a)(iii)]</h2>\n<p style="margin:4px 0;font-size:12px;"><b>1. Name and Address of Contractor:</b> {{CONTRACTOR_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>2. Name and Address of establishment in/under which:</b> {{EMPLOYER_NAME}}</p>\n<p>contract is carried on.</p>\n<p style="margin:4px 0;font-size:12px;"><b>3. Nature and location of work:</b> {{SITE_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>4. Name and address of Principal Employer:</b> {{EMPLOYER_NAME}}</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>No overtime work is done during the month of {{MONTH}} {{YEAR}}</p>\n</body></html>',
'columns': [
            'SI No.',
'Name of workman',
"Father's/Husband's name",
'Sex',
'Designation/nature of employment',
'Date on which overtime worked',
'Total overtime worked',
'Normal rate of wages',
'Overtime rate of wages',
'Overtime earnings',
'Date on which overtime wages paid',
'Remarks'
        ],
'field_mappings': {
            'SI No.': 'sl',
'Name of workman': 'Employee_Name',
"Father's/Husband's name": 'Father_Name',
'Sex': 'Gender',
'Designation/nature of employment': 'Designation',
'Date on which overtime worked': 'Overtime_Date',
'Total overtime worked': 'Overtime_Extent',
'Normal rate of wages': 'Normal_Rate',
'Overtime rate of wages': 'Overtime_Rate',
'Overtime earnings': 'Overtime_Earnings',
'Date on which overtime wages paid': 'Overtime_Payment_Date',
'Remarks': 'Remarks'
        },
'calculation_rules': [
            {
                'target': 'otEarnings',
'label': 'Overtime wages',
'formula': 'otHours * otRate'
            }
        ]
    },
{
        'state': 'Pondicherry',
'purpose': 'Register of Workmen',
'form_code': 'FORM XIII',
'title': 'Register of Workmen',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  p.formtitle { text-align: center; font-weight: bold; font-size: 15px; margin-bottom: 2px; }\n  p.rule { text-align: center; font-size: 11px; color: #333; margin-bottom: 8px; }\n  p.title { text-align: center; font-weight: bold; font-size: 15px; margin-bottom: 12px; }\n  p.lead { font-weight: 600; margin-top: 8px; }\n  .gap { height: 10px; }\n  .field { display: flex; gap: 8px; align-items: baseline; margin: 6px 0; font-size: 13px; }\n  .field .label { flex: none; }\n  .field .fill { flex: 1; border-bottom: 1px solid #000; min-height: 1.2em; display: inline-block; }\n  .field .value b { font-weight: 600; }\n  .sign { margin-top: 18px; text-align: right; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <p class="formtitle">FORM XIII</p>\n<p class="title">[ See Rule 75 ]</p>\n<p class="lead">Register of Workmen Employed by Contractor</p>\n<p>Name and address of Contractor …………………………………………………………………………………………....................................................................................</p>\n<p>………………………………………………………………………………………………………………………………………………………………………………………………………………………………</p>\n<p>Nature and location of work ………………………………………………………………………………………………………………………………………………………………………………..</p>\n<p>Name and address of establishment in/under which contract is carried on …………………………………………………………………………………………………………</p>\n<p>……………………………………………………………………………………………………………………………………………………………………………………………………………………………… Name and address of Principal Employer ……………………………………………………………………………………………………………………………………………………………..</p>\n<p>……………………………………………………………………………………………………………………………………………………………………………………………………………………………..</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<div class="gap"></div>\n</body></html>',
'columns': [
            'SI. No.',
'Name and surname of workmen',
'Age and Sex',
'Father’s/ Husband’s name',
'Nature of Employment/ Designation',
'Permanent house a ddress of workman (Village and t e hsil/ t aluk and d istrict)',
'Local Address',
'Date of commencement of employment',
'Signature or thumb impression of workman`',
'Date of termination of employment',
'Reason for termination',
'Remarks'
        ],
'field_mappings': {
            'Permanent house a ddress of workman (Village and t e hsil/ t aluk and d istrict)': 'Address',
'Date of termination of employment': 'Date_Of_Leaving',
'SI. No.': 'sl',
'Name and surname of workmen': 'Employee_Name',
'Age and Sex': 'Gender',
'Father’s/ Husband’s name': 'Father_Name',
'Local Address': 'Address',
'Date of commencement of employment': 'Date_Of_Joining',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Pondicherry',
'purpose': 'Wage Register',
'form_code': 'FORM XVII',
'title': 'Wage Register',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">See Rule 78(I)(a)(i)] FORM XVII</h1>\n<p>Register of Wages</p>\n<p>Name and address of the Contractor</p>\n<p>Name and address of Establishment in/under which contract is carried on</p>\n<p>Name and location of work</p>\n<p>Name and address of Principal Employer</p>\n<p>Wage Period: Monthly</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>Basic wages Dearness Allowance Overtime Other cash payments (Nature of payments to be indicated) Total</p>\n<p>Wage Period: Monthly ………………………………………………………………………………………………………………………………………………………………………………………....</p>\n</body></html>',
'columns': [
            'Sl. No.',
'Name of workmen',
'Sl. No. in the register of workmen',
'Designation/ Nature of employment',
'No. of days worked',
'Unit of work done',
'Daily-rate of wages/piece-rate',
'Amount of wages earned',
'Deductions if any (indicate nature)',
'Net amount paid',
'Signature/Thumb impression of workmen',
'Initial of contractor or his representative'
        ],
'field_mappings': {
            'Unit of work done': 'NO_ofunit_Per_Piece',
'Sl. No.': 'sl',
'Name of workmen': 'Employee_Name',
'Sl. No. in the register of workmen': 'sl',
'Designation/ Nature of employment': 'Designation',
'No. of days worked': 'Total_Days_Worked',
'Daily-rate of wages/piece-rate': 'Normal_Rate',
'Amount of wages earned': 'Gross_Wages',
'Deductions if any (indicate nature)': 'Total_Deductions',
'Net amount paid': 'Net_Salary'
        },
'calculation_rules': [
            {
                'target': 'grossWages',
'label': 'Gross wages',
'formula': 'daysWorked * dailyRate'
            },
{
                'target': 'netSalary',
'label': 'Net amount paid',
'formula': 'grossWages - totalDeductions'
            }
        ]
    },
{
        'state': 'Punjab',
'purpose': 'Deductions for Damage or Loss',
'form_code': 'FORM XX',
'title': 'Register of Deductions for Damage or Loss',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Deductions for Damage or Loss FORM XX</h1>\n<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[See rule 78 (1)(a)(ii)]</h2>\n<p style="margin:4px 0;font-size:12px;"><b>1. Name and Address of Contractor:</b> {{CONTRACTOR_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>2. Name and Address of establishment in/under which:</b> {{EMPLOYER_NAME}}</p>\n<p>contract is carried on.</p>\n<p style="margin:4px 0;font-size:12px;"><b>3. Nature and location of work:</b> {{SITE_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>4. Name and address of Principal Employer:</b> {{EMPLOYER_NAME}}</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>There is no deduction for damage or Loss during the month of {{MONTH}} {{YEAR}}</p>\n<p>\\</p>\n</body></html>',
'columns': [
            'SI No.',
'Name of workmen',
"Father's/Husband's name",
'Designation',
'Particulars of damage or loss',
'Date of damage or loss',
'Whether workman showed cause against deduction',
"Name of person in whose presence employee's was heard",
'Amount of deduction imposed',
'No. of instalments',
'First Instalments',
'Last Instalments',
'Remarks'
        ],
'field_mappings': {
            'SI No.': 'sl',
'Name of workmen': 'Employee_Name',
"Father's/Husband's name": 'Father_Name',
'Designation': 'Designation',
'Particulars of damage or loss': 'Loss_Caused',
'Date of damage or loss': 'Date_of_Damage',
'Amount of deduction imposed': 'Deduction_Amount',
'No. of instalments': 'Deduction_Installments',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Punjab',
'purpose': 'MusterRoll',
'form_code': 'FORM XVI',
'title': 'Muster Roll cum Wage Register',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">See Rule 78(1)(a)(i FORM XVI</h1>\n<p>Muster Roll</p>\n<p>Name and address of Contractor</p>\n<p>Name and address of establishment in/under which contract is carried on</p>\n<p>Nature and location of work</p>\n<p>Name and address of Principal Employer</p>\n<p>For the month of</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>1…… 31</p>\n</body></html>',
'columns': [
            'Sl. No.',
'Name of workmen',
'Father’s/Husband’s name',
'Sex',
'Dates',
'Remarks'
        ],
'field_mappings': {
            'Sl. No.': 'sl',
'Name of workmen': 'Employee_Name',
'Father’s/Husband’s name': 'Father_Name',
'Sex': 'Gender',
'Dates': 'Date_Of_Joining',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Punjab',
'purpose': 'Register of Advances',
'form_code': 'FORM XXII',
'title': 'Register of Advances',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Advances FORM XXII</h1>\n<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[See rule 78 (1)(a)(ii)]</h2>\n<p style="margin:4px 0;font-size:12px;"><b>1. Name and Address of Contractor:</b> {{CONTRACTOR_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>2. Name and Address of establishment in/under which:</b> {{EMPLOYER_NAME}}</p>\n<p>contract is carried on.</p>\n<p style="margin:4px 0;font-size:12px;"><b>3. Nature and location of work:</b> {{SITE_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>4. Name and address of Principal Employer:</b> {{EMPLOYER_NAME}}</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>No Advance is given during the month of {{MONTH}} {{YEAR}}</p>\n</body></html>',
'columns': [
            'SI No.',
'Name of workmen',
"Father's/Husband's name",
'Nature of employment/Designation',
'Wage period and wages payable',
'Date and amount of advance given',
'Purpose(s) for which advance made',
'No. of instalments by which advance to be repaid',
'Date and amount of each instalments repaid',
'Date on which last instalments was repaid',
'Remarks'
        ],
'field_mappings': {
            'SI No.': 'sl',
'Name of workmen': 'Employee_Name',
"Father's/Husband's name": 'Father_Name',
'Nature of employment/Designation': 'Designation',
'Date and amount of advance given': 'Advance_Amount',
'Purpose(s) for which advance made': 'Advance_Purpose',
'No. of instalments by which advance to be repaid': 'Advance_Installments',
'Date and amount of each instalments repaid': 'Advance_Repaid_Amount',
'Date on which last instalments was repaid': 'Advance_Repaid_Date',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Punjab',
'purpose': 'Register of Fines',
'form_code': 'FORM XXI',
'title': 'Register of Fines',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Fines FORM XXI</h1>\n<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[See rule 78 (1)(a)(ii)]</h2>\n<p style="margin:4px 0;font-size:12px;"><b>1. Name and Address of Contractor:</b> {{CONTRACTOR_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>2. Name and Address of establishment in/under which:</b> {{EMPLOYER_NAME}}</p>\n<p>contract is carried on.</p>\n<p style="margin:4px 0;font-size:12px;"><b>3. Nature and location of work:</b> {{SITE_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>4. Name and address of Principal Employer:</b> {{EMPLOYER_NAME}}</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>No fine imposed during the month of {{MONTH}} {{YEAR}}</p>\n</body></html>',
'columns': [
            'SI No.',
'Name of workmen',
"Father's/Husband's name",
'Designation/nature for fine imposed',
'Act/Ommission for which imposed',
'Date of Offence',
'Whether workman showed cause against fine',
"Name of person in whose presence employee's was heard",
'Wage periods and wages payable',
'Amount of fine imposed',
'Date on which fine realised',
'Remarks'
        ],
'field_mappings': {
            'SI No.': 'sl',
'Name of workmen': 'Employee_Name',
"Father's/Husband's name": 'Father_Name',
'Act/Ommission for which imposed': 'Fine_Offence_Nature',
'Date of Offence': 'Fine_Offence_Date',
'Amount of fine imposed': 'Fine_Amount',
'Date on which fine realised': 'Fine_Realised_Date',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Punjab',
'purpose': 'Register of Overtime',
'form_code': 'FORM XXIII',
'title': 'Register of Overtime',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Overtime FORM XXIII</h1>\n<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[See rule 78 (1)(a)(iii)]</h2>\n<p style="margin:4px 0;font-size:12px;"><b>1. Name and Address of Contractor:</b> {{CONTRACTOR_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>2. Name and Address of establishment in/under which:</b> {{EMPLOYER_NAME}}</p>\n<p>contract is carried on.</p>\n<p style="margin:4px 0;font-size:12px;"><b>3. Nature and location of work:</b> {{SITE_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>4. Name and address of Principal Employer:</b> {{EMPLOYER_NAME}}</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>No overtime work is done during the month of {{MONTH}} {{YEAR}}</p>\n</body></html>',
'columns': [
            'SI No.',
'Name of workman',
"Father's/Husband's name",
'Sex',
'Designation/nature of employment',
'Date on which overtime worked',
'Total overtime worked',
'Normal rate of wages',
'Overtime rate of wages',
'Overtime earnings',
'Date on which overtime wages paid',
'Remarks'
        ],
'field_mappings': {
            'SI No.': 'sl',
'Name of workman': 'Employee_Name',
"Father's/Husband's name": 'Father_Name',
'Sex': 'Gender',
'Designation/nature of employment': 'Designation',
'Date on which overtime worked': 'Overtime_Date',
'Total overtime worked': 'Overtime_Extent',
'Normal rate of wages': 'Normal_Rate',
'Overtime rate of wages': 'Overtime_Rate',
'Overtime earnings': 'Overtime_Earnings',
'Date on which overtime wages paid': 'Overtime_Payment_Date',
'Remarks': 'Remarks'
        },
'calculation_rules': [
            {
                'target': 'otEarnings',
'label': 'Overtime wages',
'formula': 'otHours * otRate'
            }
        ]
    },
{
        'state': 'Punjab',
'purpose': 'Register of Workmen',
'form_code': 'FORM XIII',
'title': 'Register of Workmen',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  p.formtitle { text-align: center; font-weight: bold; font-size: 15px; margin-bottom: 2px; }\n  p.rule { text-align: center; font-size: 11px; color: #333; margin-bottom: 8px; }\n  p.title { text-align: center; font-weight: bold; font-size: 15px; margin-bottom: 12px; }\n  p.lead { font-weight: 600; margin-top: 8px; }\n  .gap { height: 10px; }\n  .field { display: flex; gap: 8px; align-items: baseline; margin: 6px 0; font-size: 13px; }\n  .field .label { flex: none; }\n  .field .fill { flex: 1; border-bottom: 1px solid #000; min-height: 1.2em; display: inline-block; }\n  .field .value b { font-weight: 600; }\n  .sign { margin-top: 18px; text-align: right; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <p class="formtitle">FORM XIII</p>\n<p class="title">[ See Rule 75 ]</p>\n<p class="lead">Register of Workmen Employed by Contractor</p>\n<p>Name and address of Contractor …………………………………………………………………………………………....................................................................................</p>\n<p>………………………………………………………………………………………………………………………………………………………………………………………………………………………………</p>\n<p>Nature and location of work ………………………………………………………………………………………………………………………………………………………………………………..</p>\n<p>Name and address of establishment in/under which contract is carried on …………………………………………………………………………………………………………</p>\n<p>……………………………………………………………………………………………………………………………………………………………………………………………………………………………… Name and address of Principal Employer ……………………………………………………………………………………………………………………………………………………………..</p>\n<p>……………………………………………………………………………………………………………………………………………………………………………………………………………………………..</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<div class="gap"></div>\n</body></html>',
'columns': [
            'SI. No.',
'Name and surname of workmen',
'Age and Sex',
'Father’s/ Husband’s name',
'Nature of Employment/ Designation',
'Permanent house a ddress of workman (Village and t e hsil/ t aluk and d istrict)',
'Local Address',
'Date of commencement of employment',
'Signature or thumb impression of workman`',
'Date of termination of employment',
'Reason for termination',
'Remarks'
        ],
'field_mappings': {
            'Permanent house a ddress of workman (Village and t e hsil/ t aluk and d istrict)': 'Address',
'Date of commencement of employment': 'Date_Of_Joining',
'Date of termination of employment': 'Date_Of_Leaving',
'SI. No.': 'sl',
'Name and surname of workmen': 'Employee_Name',
'Age and Sex': 'Gender',
'Father’s/ Husband’s name': 'Father_Name',
'Local Address': 'Address',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Punjab',
'purpose': 'Wage Register',
'form_code': 'FORM XVII',
'title': 'Wage Register',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">See Rule 78(I)(a)(i)] FORM XVII</h1>\n<p>Register of Wages</p>\n<p>Name and address of the Contractor</p>\n<p>Name and address of Establishment in/under which contract is carried on</p>\n<p>Name and location of work</p>\n<p>Name and address of Principal Employer</p>\n<p>Wage Period: Monthly</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>Basic wages Dearness Allowance Overtime Other cash payments (Nature of payments to be indicated) Total</p>\n<p>Wage Period: Monthly ………………………………………………………………………………………………………………………………………………………………………………………....</p>\n</body></html>',
'columns': [
            'Sl. No.',
'Name of workmen',
'Sl. No. in the register of workmen',
'Designation/ Nature of employment',
'No. of days worked',
'Unit of work done',
'Daily-rate of wages/piece-rate',
'Amount of wages earned',
'Deductions if any (indicate nature)',
'Net amount paid',
'Signature/Thumb impression of workmen',
'Initial of contractor or his representative'
        ],
'field_mappings': {
            'Unit of work done': 'NO_ofunit_Per_Piece',
'Sl. No.': 'sl',
'Name of workmen': 'Employee_Name',
'Sl. No. in the register of workmen': 'sl',
'Designation/ Nature of employment': 'Designation',
'No. of days worked': 'Total_Days_Worked',
'Daily-rate of wages/piece-rate': 'Normal_Rate',
'Amount of wages earned': 'Gross_Wages',
'Deductions if any (indicate nature)': 'Total_Deductions',
'Net amount paid': 'Net_Salary'
        },
'calculation_rules': [
            {
                'target': 'grossWages',
'label': 'Gross wages',
'formula': 'daysWorked * dailyRate'
            },
{
                'target': 'netSalary',
'label': 'Net amount paid',
'formula': 'grossWages - totalDeductions'
            }
        ]
    },
{
        'state': 'Rajasthan',
'purpose': 'Deductions for Damage or Loss',
'form_code': 'FORM XVI',
'title': 'Register of Deductions for Damage or Loss',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">See Rule 78(1)(a)(i FORM XVI</h1>\n<p>Muster Roll</p>\n<p>Name and address of Contractor</p>\n<p>Name and address of establishment in/under which contract is carried on</p>\n<p>Nature and location of work</p>\n<p>Name and address of Principal Employer</p>\n<p>For the month of</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>1…… 31</p>\n</body></html>',
'columns': [
            'Sl. No.',
'Name of workmen',
'Father’s/Husband’s name',
'Sex',
'Dates',
'Remarks'
        ],
'field_mappings': {
            'Sl. No.': 'sl',
'Name of workmen': 'Employee_Name',
'Father’s/Husband’s name': 'Father_Name',
'Sex': 'Gender',
'Dates': 'Date_Of_Joining',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Rajasthan',
'purpose': 'Register of Advances',
'form_code': 'FORM XVIII',
'title': 'Register of Advances',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Advances FORM XVIII</h1>\n<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[See rule 78 (1)(a)(ii)]</h2>\n<p style="margin:4px 0;font-size:12px;"><b>1. Name and Address of Contractor:</b> {{CONTRACTOR_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>2. Name and Address of establishment in/under which:</b> {{EMPLOYER_NAME}}</p>\n<p>contract is carried on.</p>\n<p style="margin:4px 0;font-size:12px;"><b>3. Nature and location of work:</b> {{SITE_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>4. Name and address of Principal Employer:</b> {{EMPLOYER_NAME}}</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>No Advance is given during the month of {{MONTH}} {{YEAR}}</p>\n</body></html>',
'columns': [
            'SI No.',
'Name of workmen',
"Father's/Husband's name",
'Nature of employment/Designation',
'Wage period and wages payable',
'Date and amount of advance given',
'Purpose(s) for which advance made',
'No. of instalments by which advance to be repaid',
'Date and amount of each instalments repaid',
'Date on which last instalments was repaid',
'Remarks'
        ],
'field_mappings': {
            'SI No.': 'sl',
'Name of workmen': 'Employee_Name',
"Father's/Husband's name": 'Father_Name',
'Nature of employment/Designation': 'Designation',
'Date and amount of advance given': 'Advance_Amount',
'Purpose(s) for which advance made': 'Advance_Purpose',
'No. of instalments by which advance to be repaid': 'Advance_Installments',
'Date and amount of each instalments repaid': 'Advance_Repaid_Amount',
'Date on which last instalments was repaid': 'Advance_Repaid_Date',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Rajasthan',
'purpose': 'Register of Fines',
'form_code': 'FORM XVII',
'title': 'Register of Fines',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">See Rule 78(I)(a)(i)] FORM XVII</h1>\n<p>Register of Wages</p>\n<p>Name and address of the Contractor</p>\n<p>Name and address of Establishment in/under which contract is carried on</p>\n<p>Name and location of work</p>\n<p>Name and address of Principal Employer</p>\n<p>Wage Period: Monthly</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>Basic wages Dearness Allowance Overtime Other cash payments (Nature of payments to be indicated) Total</p>\n<p>Wage Period: Monthly ………………………………………………………………………………………………………………………………………………………………………………………....</p>\n</body></html>',
'columns': [
            'Sl. No.',
'Name of workmen',
'Sl. No. in the register of workmen',
'Designation/ Nature of employment',
'No. of days worked',
'Unit of work done',
'Daily-rate of wages/piece-rate',
'Amount of wages earned',
'Deductions if any (indicate nature)',
'Net amount paid',
'Signature/Thumb impression of workmen',
'Initial of contractor or his representative'
        ],
'field_mappings': {
            'Unit of work done': 'NO_ofunit_Per_Piece',
'Sl. No.': 'sl',
'Name of workmen': 'Employee_Name',
'Sl. No. in the register of workmen': 'sl',
'Designation/ Nature of employment': 'Designation',
'No. of days worked': 'Total_Days_Worked',
'Daily-rate of wages/piece-rate': 'Normal_Rate',
'Amount of wages earned': 'Gross_Wages',
'Deductions if any (indicate nature)': 'Total_Deductions',
'Net amount paid': 'Net_Salary'
        },
'calculation_rules': [
            {
                'target': 'grossWages',
'label': 'Gross wages',
'formula': 'daysWorked * dailyRate'
            },
{
                'target': 'netSalary',
'label': 'Net amount paid',
'formula': 'grossWages - totalDeductions'
            }
        ]
    },
{
        'state': 'Rajasthan',
'purpose': 'Register of Overtime',
'form_code': 'FORM XIX',
'title': 'Register of Overtime',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  p.formtitle { text-align: center; font-weight: bold; font-size: 15px; }\n  p.title { text-align: center; font-weight: bold; font-size: 15px; margin-bottom: 10px; }\n  .field { display: flex; gap: 8px; margin: 6px 0; font-size: 13px; }\n  .field .label { flex: none; }\n  .field .fill { flex: 1; border-bottom: 1px solid #000; min-height: 1.2em; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 4px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <p class="formtitle">FORM XIX</p>\n<p class="rule">*[See Rule 78(1) (b)]</p>\n<p class="title">Wage Slip</p>\n<div class="field"><span class="label">Name and Address of Contractor:</span><span class="fill"></span></div>\n<div class="field"><span class="label">Nature and location of work:</span><span class="fill"></span></div>\n<div class="field"><span class="label">Name and Father’s/Husband’s name of the workman:</span><span class="fill"></span></div>\n<div class="field"><span class="label">For the Week/Fortnight/Month ending:</span><span class="fill"></span></div>\n<div class="field"><span class="label">1. No. of days worked:</span><span class="fill"></span></div>\n<div class="field"><span class="label">2. No. of unit worked in case of piece-rate workers:</span><span class="fill"></span></div>\n<div class="field"><span class="label">3. Rate of daily wages/piece-rate:</span><span class="fill"></span></div>\n<div class="field"><span class="label">4. Amount of overtime wages:</span><span class="fill"></span></div>\n<div class="field"><span class="label">5. Gross wages payable:</span><span class="fill"></span></div>\n<div class="field"><span class="label">6. Deductions, if any:</span><span class="fill"></span></div>\n<div class="field"><span class="label">7. Net amount of wages paid:</span><span class="fill"></span></div>\n<div class="field"><span class="label">Initials of the Contractor or his:</span><span class="fill"></span></div>\n<div class="field"><span class="label">Representative:</span><span class="fill"></span></div>\n<p>*Substituted for the brackets, words, figures and letter “[See Rule 78(2) (b)]” by GSR 948, dated 12-7-1978, w.e.f. 22-7-1978.</p>\n</body></html>',
'columns': [],
'field_mappings': {
            
        },
'calculation_rules': []
    },
{
        'state': 'Rajasthan',
'purpose': 'Register of Workmen',
'form_code': 'FORM IX',
'title': 'Register of Workmen',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">(See Rule 74) FORM IX</h1>\n<p>Register of workmen employed by Contractor</p>\n<p>Name and address of contractor…. Name and address of establisment in/under which contract is carried on…</p>\n<p>Nature and location of work….. Name and address of Principal Employers…..</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n</body></html>',
'columns': [
            'Sl. No.',
'Name and surname of workmen',
'Age and sex',
"Father's/husband's name",
'Nature of employment/designation',
'Permanent home address of workman (Village and Tehsil/Taluka and District)',
'Present Address',
'Date of commencement of employment',
'Date of termination of employment',
'Signature or thumb impression of workman',
'Remarks'
        ],
'field_mappings': {
            'Permanent home address of workman (Village and Tehsil/Taluka and District)': 'Address',
'Present Address': 'Address',
'Date of termination of employment': 'Date_Of_Leaving',
'Sl. No.': 'sl',
'Name and surname of workmen': 'Employee_Name',
'Age and sex': 'Gender',
"Father's/husband's name": 'Father_Name',
'Nature of employment/designation': 'Designation',
'Date of commencement of employment': 'Date_Of_Joining',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Rajasthan',
'purpose': 'Wage Register',
'form_code': 'FORM XIII',
'title': 'Wage Register',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  p.formtitle { text-align: center; font-weight: bold; font-size: 15px; margin-bottom: 2px; }\n  p.rule { text-align: center; font-size: 11px; color: #333; margin-bottom: 8px; }\n  p.title { text-align: center; font-weight: bold; font-size: 15px; margin-bottom: 12px; }\n  p.lead { font-weight: 600; margin-top: 8px; }\n  .gap { height: 10px; }\n  .field { display: flex; gap: 8px; align-items: baseline; margin: 6px 0; font-size: 13px; }\n  .field .label { flex: none; }\n  .field .fill { flex: 1; border-bottom: 1px solid #000; min-height: 1.2em; display: inline-block; }\n  .field .value b { font-weight: 600; }\n  .sign { margin-top: 18px; text-align: right; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <p class="formtitle">FORM XIII</p>\n<p class="title">[ See Rule 75 ]</p>\n<p class="lead">Register of Workmen Employed by Contractor</p>\n<p>Name and address of Contractor …………………………………………………………………………………………....................................................................................</p>\n<p>………………………………………………………………………………………………………………………………………………………………………………………………………………………………</p>\n<p>Nature and location of work ………………………………………………………………………………………………………………………………………………………………………………..</p>\n<p>Name and address of establishment in/under which contract is carried on …………………………………………………………………………………………………………</p>\n<p>……………………………………………………………………………………………………………………………………………………………………………………………………………………………… Name and address of Principal Employer ……………………………………………………………………………………………………………………………………………………………..</p>\n<p>……………………………………………………………………………………………………………………………………………………………………………………………………………………………..</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<div class="gap"></div>\n</body></html>',
'columns': [
            'SI. No.',
'Name and surname of workmen',
'Age and Sex',
'Father’s/ Husband’s name',
'Nature of Employment/ Designation',
'Permanent house a ddress of workman (Village and t e hsil/ t aluk and d istrict)',
'Local Address',
'Date of commencement of employment',
'Signature or thumb impression of workman`',
'Date of termination of employment',
'Reason for termination',
'Remarks'
        ],
'field_mappings': {
            'Date of termination of employment': 'Date_Of_Leaving',
'SI. No.': 'sl',
'Name and surname of workmen': 'Employee_Name',
'Age and Sex': 'Gender',
'Father’s/ Husband’s name': 'Father_Name',
'Permanent house a ddress of workman (Village and t e hsil/ t aluk and d istrict)': 'Address',
'Local Address': 'Address',
'Date of commencement of employment': 'Date_Of_Joining',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Sikkim',
'purpose': 'Deductions for Damage or Loss',
'form_code': 'FORM XX',
'title': 'Register of Deductions for Damage or Loss',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Deductions for Damage or Loss FORM XX</h1>\n<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[See rule 78 (1)(a)(ii)]</h2>\n<p style="margin:4px 0;font-size:12px;"><b>1. Name and Address of Contractor:</b> {{CONTRACTOR_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>2. Name and Address of establishment in/under which:</b> {{EMPLOYER_NAME}}</p>\n<p>contract is carried on.</p>\n<p style="margin:4px 0;font-size:12px;"><b>3. Nature and location of work:</b> {{SITE_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>4. Name and address of Principal Employer:</b> {{EMPLOYER_NAME}}</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>There is no deduction for damage or Loss during the month of {{MONTH}} {{YEAR}}</p>\n<p>\\</p>\n</body></html>',
'columns': [
            'SI No.',
'Name of workmen',
"Father's/Husband's name",
'Designation',
'Particulars of damage or loss',
'Date of damage or loss',
'Whether workman showed cause against deduction',
"Name of person in whose presence employee's was heard",
'Amount of deduction imposed',
'No. of instalments',
'First Instalments',
'Last Instalments',
'Remarks'
        ],
'field_mappings': {
            'SI No.': 'sl',
'Name of workmen': 'Employee_Name',
"Father's/Husband's name": 'Father_Name',
'Designation': 'Designation',
'Particulars of damage or loss': 'Loss_Caused',
'Date of damage or loss': 'Date_of_Damage',
'Amount of deduction imposed': 'Deduction_Amount',
'No. of instalments': 'Deduction_Installments',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Sikkim',
'purpose': 'MusterRoll',
'form_code': 'FORM XVI',
'title': 'Muster Roll cum Wage Register',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">See Rule 78(1)(a)(i FORM XVI</h1>\n<p>Muster Roll</p>\n<p>Name and address of Contractor</p>\n<p>Name and address of establishment in/under which contract is carried on</p>\n<p>Nature and location of work</p>\n<p>Name and address of Principal Employer</p>\n<p>For the month of</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>1…… 31</p>\n</body></html>',
'columns': [
            'Sl. No.',
'Name of workmen',
'Father’s/Husband’s name',
'Sex',
'Dates',
'Remarks'
        ],
'field_mappings': {
            'Sl. No.': 'sl',
'Name of workmen': 'Employee_Name',
'Father’s/Husband’s name': 'Father_Name',
'Sex': 'Gender',
'Dates': 'Date_Of_Joining',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Sikkim',
'purpose': 'Register of Advances',
'form_code': 'FORM XXII',
'title': 'Register of Advances',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Advances FORM XXII</h1>\n<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[See rule 78 (1)(a)(ii)]</h2>\n<p style="margin:4px 0;font-size:12px;"><b>1. Name and Address of Contractor:</b> {{CONTRACTOR_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>2. Name and Address of establishment in/under which:</b> {{EMPLOYER_NAME}}</p>\n<p>contract is carried on.</p>\n<p style="margin:4px 0;font-size:12px;"><b>3. Nature and location of work:</b> {{SITE_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>4. Name and address of Principal Employer:</b> {{EMPLOYER_NAME}}</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>No Advance is given during the month of {{MONTH}} {{YEAR}}</p>\n</body></html>',
'columns': [
            'SI No.',
'Name of workmen',
"Father's/Husband's name",
'Nature of employment/Designation',
'Wage period and wages payable',
'Date and amount of advance given',
'Purpose(s) for which advance made',
'No. of instalments by which advance to be repaid',
'Date and amount of each instalments repaid',
'Date on which last instalments was repaid',
'Remarks'
        ],
'field_mappings': {
            'SI No.': 'sl',
'Name of workmen': 'Employee_Name',
"Father's/Husband's name": 'Father_Name',
'Nature of employment/Designation': 'Designation',
'Date and amount of advance given': 'Advance_Amount',
'Purpose(s) for which advance made': 'Advance_Purpose',
'No. of instalments by which advance to be repaid': 'Advance_Installments',
'Date and amount of each instalments repaid': 'Advance_Repaid_Amount',
'Date on which last instalments was repaid': 'Advance_Repaid_Date',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Sikkim',
'purpose': 'Register of Fines',
'form_code': 'FORM XXI',
'title': 'Register of Fines',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Fines FORM XXI</h1>\n<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[See rule 78 (1)(a)(ii)]</h2>\n<p style="margin:4px 0;font-size:12px;"><b>1. Name and Address of Contractor:</b> {{CONTRACTOR_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>2. Name and Address of establishment in/under which:</b> {{EMPLOYER_NAME}}</p>\n<p>contract is carried on.</p>\n<p style="margin:4px 0;font-size:12px;"><b>3. Nature and location of work:</b> {{SITE_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>4. Name and address of Principal Employer:</b> {{EMPLOYER_NAME}}</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>No fine imposed during the month of {{MONTH}} {{YEAR}}</p>\n</body></html>',
'columns': [
            'SI No.',
'Name of workmen',
"Father's/Husband's name",
'Designation/nature for fine imposed',
'Act/Ommission for which imposed',
'Date of Offence',
'Whether workman showed cause against fine',
"Name of person in whose presence employee's was heard",
'Wage periods and wages payable',
'Amount of fine imposed',
'Date on which fine realised',
'Remarks'
        ],
'field_mappings': {
            'SI No.': 'sl',
'Name of workmen': 'Employee_Name',
"Father's/Husband's name": 'Father_Name',
'Act/Ommission for which imposed': 'Fine_Offence_Nature',
'Date of Offence': 'Fine_Offence_Date',
'Amount of fine imposed': 'Fine_Amount',
'Date on which fine realised': 'Fine_Realised_Date',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Sikkim',
'purpose': 'Register of Overtime',
'form_code': 'FORM XXIII',
'title': 'Register of Overtime',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Overtime FORM XXIII</h1>\n<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[See rule 78 (1)(a)(iii)]</h2>\n<p style="margin:4px 0;font-size:12px;"><b>1. Name and Address of Contractor:</b> {{CONTRACTOR_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>2. Name and Address of establishment in/under which:</b> {{EMPLOYER_NAME}}</p>\n<p>contract is carried on.</p>\n<p style="margin:4px 0;font-size:12px;"><b>3. Nature and location of work:</b> {{SITE_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>4. Name and address of Principal Employer:</b> {{EMPLOYER_NAME}}</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>No overtime work is done during the month of {{MONTH}} {{YEAR}}</p>\n</body></html>',
'columns': [
            'SI No.',
'Name of workman',
"Father's/Husband's name",
'Sex',
'Designation/nature of employment',
'Date on which overtime worked',
'Total overtime worked',
'Normal rate of wages',
'Overtime rate of wages',
'Overtime earnings',
'Date on which overtime wages paid',
'Remarks'
        ],
'field_mappings': {
            'SI No.': 'sl',
'Name of workman': 'Employee_Name',
"Father's/Husband's name": 'Father_Name',
'Sex': 'Gender',
'Designation/nature of employment': 'Designation',
'Date on which overtime worked': 'Overtime_Date',
'Total overtime worked': 'Overtime_Extent',
'Normal rate of wages': 'Normal_Rate',
'Overtime rate of wages': 'Overtime_Rate',
'Overtime earnings': 'Overtime_Earnings',
'Date on which overtime wages paid': 'Overtime_Payment_Date',
'Remarks': 'Remarks'
        },
'calculation_rules': [
            {
                'target': 'otEarnings',
'label': 'Overtime wages',
'formula': 'otHours * otRate'
            }
        ]
    },
{
        'state': 'Sikkim',
'purpose': 'Register of Workmen',
'form_code': 'FORM XIII',
'title': 'Register of Workmen',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  p.formtitle { text-align: center; font-weight: bold; font-size: 15px; margin-bottom: 2px; }\n  p.rule { text-align: center; font-size: 11px; color: #333; margin-bottom: 8px; }\n  p.title { text-align: center; font-weight: bold; font-size: 15px; margin-bottom: 12px; }\n  p.lead { font-weight: 600; margin-top: 8px; }\n  .gap { height: 10px; }\n  .field { display: flex; gap: 8px; align-items: baseline; margin: 6px 0; font-size: 13px; }\n  .field .label { flex: none; }\n  .field .fill { flex: 1; border-bottom: 1px solid #000; min-height: 1.2em; display: inline-block; }\n  .field .value b { font-weight: 600; }\n  .sign { margin-top: 18px; text-align: right; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <p class="formtitle">FORM XIII</p>\n<p class="title">[ See Rule 75 ]</p>\n<p class="lead">Register of Workmen Employed by Contractor</p>\n<p>Name and address of Contractor …………………………………………………………………………………………....................................................................................</p>\n<p>………………………………………………………………………………………………………………………………………………………………………………………………………………………………</p>\n<p>Nature and location of work ………………………………………………………………………………………………………………………………………………………………………………..</p>\n<p>Name and address of establishment in/under which contract is carried on …………………………………………………………………………………………………………</p>\n<p>……………………………………………………………………………………………………………………………………………………………………………………………………………………………… Name and address of Principal Employer ……………………………………………………………………………………………………………………………………………………………..</p>\n<p>……………………………………………………………………………………………………………………………………………………………………………………………………………………………..</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<div class="gap"></div>\n</body></html>',
'columns': [
            'SI. No.',
'Name and surname of workmen',
'Age and Sex',
'Father’s/ Husband’s name',
'Nature of Employment/ Designation',
'Permanent house a ddress of workman (Village and t e hsil/ t aluk and d istrict)',
'Local Address',
'Date of commencement of employment',
'Signature or thumb impression of workman`',
'Date of termination of employment',
'Reason for termination',
'Remarks'
        ],
'field_mappings': {
            'Date of termination of employment': 'Date_Of_Leaving',
'SI. No.': 'sl',
'Name and surname of workmen': 'Employee_Name',
'Age and Sex': 'Gender',
'Father’s/ Husband’s name': 'Father_Name',
'Permanent house a ddress of workman (Village and t e hsil/ t aluk and d istrict)': 'Address',
'Local Address': 'Address',
'Date of commencement of employment': 'Date_Of_Joining',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Sikkim',
'purpose': 'Wage Register',
'form_code': 'FORM XVII',
'title': 'Wage Register',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">See Rule 78(I)(a)(i)] FORM XVII</h1>\n<p>Register of Wages</p>\n<p>Name and address of the Contractor</p>\n<p>Name and address of Establishment in/under which contract is carried on</p>\n<p>Name and location of work</p>\n<p>Name and address of Principal Employer</p>\n<p>Wage Period: Monthly</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>Basic wages Dearness Allowance Overtime Other cash payments (Nature of payments to be indicated) Total</p>\n<p>Wage Period: Monthly ………………………………………………………………………………………………………………………………………………………………………………………....</p>\n</body></html>',
'columns': [
            'Sl. No.',
'Name of workmen',
'Sl. No. in the register of workmen',
'Designation/ Nature of employment',
'No. of days worked',
'Unit of work done',
'Daily-rate of wages/piece-rate',
'Amount of wages earned',
'Deductions if any (indicate nature)',
'Net amount paid',
'Signature/Thumb impression of workmen',
'Initial of contractor or his representative'
        ],
'field_mappings': {
            'Unit of work done': 'NO_ofunit_Per_Piece',
'Sl. No.': 'sl',
'Name of workmen': 'Employee_Name',
'Sl. No. in the register of workmen': 'sl',
'Designation/ Nature of employment': 'Designation',
'No. of days worked': 'Total_Days_Worked',
'Daily-rate of wages/piece-rate': 'Normal_Rate',
'Amount of wages earned': 'Gross_Wages',
'Deductions if any (indicate nature)': 'Total_Deductions',
'Net amount paid': 'Net_Salary'
        },
'calculation_rules': [
            {
                'target': 'grossWages',
'label': 'Gross wages',
'formula': 'daysWorked * dailyRate'
            },
{
                'target': 'netSalary',
'label': 'Net amount paid',
'formula': 'grossWages - totalDeductions'
            }
        ]
    },
{
        'state': 'Tamil Nadu',
'purpose': 'Deductions for Damage or Loss',
'form_code': 'FORM XXIX',
'title': 'Register of Deductions for Damage or Loss',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  p.formtitle { text-align: center; font-weight: bold; font-size: 15px; margin-bottom: 2px; }\n  p.rule { text-align: center; font-size: 11px; color: #333; margin-bottom: 8px; }\n  p.title { text-align: center; font-weight: bold; font-size: 15px; margin-bottom: 12px; }\n  p.lead { font-weight: 600; margin-top: 8px; }\n  .gap { height: 10px; }\n  .field { display: flex; gap: 8px; align-items: baseline; margin: 6px 0; font-size: 13px; }\n  .field .label { flex: none; }\n  .field .fill { flex: 1; border-bottom: 1px solid #000; min-height: 1.2em; display: inline-block; }\n  .field .value b { font-weight: 600; }\n  .sign { margin-top: 18px; text-align: right; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <p class="formtitle">FORM XXIX</p>\n<p class="formtitle">[See Rule 78 (1) (d)]</p>\n<p class="lead">Register Of Advances Deductions For Damages Or Loss And Fines</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<div class="gap"></div>\n<table class="grid"><tr><td>Serial Number</td><td>Name of the Workman</td><td>Father’s/ Husband’s Name</td><td>Employee Number</td><td>Designation</td><td>Advance Paid</td></tr><tr><td>Date of Payment</td><td>Amount Paid</td><td>Number of Instalments to be recovered</td><td>Date on which recovery completed</td></tr><tr><td>(1)</td><td>(2)</td><td>(3)</td><td>(4)</td><td>(5)</td><td>(6)</td><td>(7)</td><td>(8)</td><td>(9)</td></tr></table>\n<div class="gap"></div>\n<table class="grid"><tr><td>Deduction for Damage/ Loss</td><td>Fines</td><td>Signature or Thumb Impression of the Wo rk man</td><td>Remarks</td></tr><tr><td>Damage or/ loss caused</td><td>Date of Show Cause Notice</td><td>Total amount of deduction imposed</td><td>Number of instalments to be recovered</td><td>Date on which deduction completed</td><td>Act or Omission</td><td>Date of S how Cause Notice</td><td>Amount of fine imposed</td><td>Date on which fine recovery completed</td></tr><tr><td>(100</td><td>(11)</td><td>(12)</td><td>(13)</td><td>(14)</td><td>(15)</td><td>(16)</td><td>(17)</td><td>(18)</td><td>(19)</td><td>(20)</td></tr></table>\n<div class="gap"></div>\n</body></html>',
'columns': [
            'Serial Number',
'Name of the Workman',
'Father’s/ Husband’s Name',
'Employee Number',
'Designation',
'Advance Paid'
        ],
'field_mappings': {
            'Employee Number': 'Employee_Code',
'Advance Paid': 'Advance_Amount',
'Serial Number': 'sl',
'Name of the Workman': 'Employee_Name',
'Father’s/ Husband’s Name': 'Father_Name',
'Designation': 'Designation'
        },
'calculation_rules': []
    },
{
        'state': 'Tamil Nadu',
'purpose': 'MusterRoll',
'form_code': 'FORM XXVI',
'title': 'Muster Roll cum Wage Register',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  p.formtitle { text-align: center; font-weight: bold; font-size: 15px; margin-bottom: 2px; }\n  p.rule { text-align: center; font-size: 11px; color: #333; margin-bottom: 8px; }\n  p.title { text-align: center; font-weight: bold; font-size: 15px; margin-bottom: 12px; }\n  p.lead { font-weight: 600; margin-top: 8px; }\n  .gap { height: 10px; }\n  .field { display: flex; gap: 8px; align-items: baseline; margin: 6px 0; font-size: 13px; }\n  .field .label { flex: none; }\n  .field .fill { flex: 1; border-bottom: 1px solid #000; min-height: 1.2em; display: inline-block; }\n  .field .value b { font-weight: 600; }\n  .sign { margin-top: 18px; text-align: right; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <p class="title">FORM No. XXVI</p>\n<p class="rule">[See Rule 75]</p>\n<p class="lead">Register Of Employment Of Contract Labour</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<div class="gap"></div>\n<table class="grid"><tr><td>Serial Number</td><td>Name of the Workman</td><td>Age and Sex (Male/ Female)</td><td>Permanent Home Address</td><td>Local Address</td><td>Designation (Nature of Work)</td><td>Father’s/ Husband’s Name</td></tr><tr><td>(1)</td><td>(2)</td><td>(3)</td><td>(4)</td><td>(5)</td><td>(6)</td><td>(7)</td></tr></table>\n<div class="gap"></div>\n<table class="grid"><tr><td>Date of Entry into service</td><td>Rate of Wages</td><td>Daily Hours of Work done (1, 2, 3………., 29, 30, 31)</td><td>Number of Days Worked</td><td>Signature or Thumb impression of the Workman</td><td>Date of Termination of Employment</td><td>Signature of Contractor/ Representative)</td></tr><tr><td>(8)</td><td>(9)</td><td>(10)</td><td>(11)</td><td>(12)</td><td>(13)</td><td>(14)</td></tr></table>\n<div class="gap"></div>\n</body></html>',
'columns': [
            'Date of Entry into service',
'Rate of Wages',
'Daily Hours of Work done (1, 2, 3………., 29, 30, 31)',
'Number of Days Worked',
'Signature or Thumb impression of the Workman',
'Date of Termination of Employment',
'Signature of Contractor/ Representative)'
        ],
'field_mappings': {
            'Date of Termination of Employment': 'Date_Of_Leaving',
'Date of Entry into service': 'Date_Of_Joining',
'Rate of Wages': 'Normal_Rate',
'Number of Days Worked': 'Total_Days_Worked'
        },
'calculation_rules': []
    },
{
        'state': 'Tamil Nadu',
'purpose': 'Register of Advances',
'form_code': 'FORM XXIX',
'title': 'Register of Advances',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  p.formtitle { text-align: center; font-weight: bold; font-size: 15px; margin-bottom: 2px; }\n  p.rule { text-align: center; font-size: 11px; color: #333; margin-bottom: 8px; }\n  p.title { text-align: center; font-weight: bold; font-size: 15px; margin-bottom: 12px; }\n  p.lead { font-weight: 600; margin-top: 8px; }\n  .gap { height: 10px; }\n  .field { display: flex; gap: 8px; align-items: baseline; margin: 6px 0; font-size: 13px; }\n  .field .label { flex: none; }\n  .field .fill { flex: 1; border-bottom: 1px solid #000; min-height: 1.2em; display: inline-block; }\n  .field .value b { font-weight: 600; }\n  .sign { margin-top: 18px; text-align: right; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <p class="formtitle">FORM XXIX</p>\n<p class="formtitle">[See Rule 78 (1) (d)]</p>\n<p class="lead">Register Of Advances Deductions For Damages Or Loss And Fines</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<div class="gap"></div>\n<table class="grid"><tr><td>Serial Number</td><td>Name of the Workman</td><td>Father’s/ Husband’s Name</td><td>Employee Number</td><td>Designation</td><td>Advance Paid</td></tr><tr><td>Date of Payment</td><td>Amount Paid</td><td>Number of Instalments to be recovered</td><td>Date on which recovery completed</td></tr><tr><td>(1)</td><td>(2)</td><td>(3)</td><td>(4)</td><td>(5)</td><td>(6)</td><td>(7)</td><td>(8)</td><td>(9)</td></tr></table>\n<div class="gap"></div>\n<table class="grid"><tr><td>Deduction for Damage/ Loss</td><td>Fines</td><td>Signature or Thumb Impression of the Wo rk man</td><td>Remarks</td></tr><tr><td>Damage or/ loss caused</td><td>Date of Show Cause Notice</td><td>Total amount of deduction imposed</td><td>Number of instalments to be recovered</td><td>Date on which deduction completed</td><td>Act or Omission</td><td>Date of S how Cause Notice</td><td>Amount of fine imposed</td><td>Date on which fine recovery completed</td></tr><tr><td>(100</td><td>(11)</td><td>(12)</td><td>(13)</td><td>(14)</td><td>(15)</td><td>(16)</td><td>(17)</td><td>(18)</td><td>(19)</td><td>(20)</td></tr></table>\n<div class="gap"></div>\n</body></html>',
'columns': [
            'Serial Number',
'Name of the Workman',
'Father’s/ Husband’s Name',
'Employee Number',
'Designation',
'Advance Paid'
        ],
'field_mappings': {
            'Employee Number': 'Employee_Code',
'Advance Paid': 'Advance_Amount',
'Serial Number': 'sl',
'Name of the Workman': 'Employee_Name',
'Father’s/ Husband’s Name': 'Father_Name',
'Designation': 'Designation'
        },
'calculation_rules': []
    },
{
        'state': 'Tamil Nadu',
'purpose': 'Register of Fines',
'form_code': 'FORM XXIX',
'title': 'Register of Fines',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  p.formtitle { text-align: center; font-weight: bold; font-size: 15px; margin-bottom: 2px; }\n  p.rule { text-align: center; font-size: 11px; color: #333; margin-bottom: 8px; }\n  p.title { text-align: center; font-weight: bold; font-size: 15px; margin-bottom: 12px; }\n  p.lead { font-weight: 600; margin-top: 8px; }\n  .gap { height: 10px; }\n  .field { display: flex; gap: 8px; align-items: baseline; margin: 6px 0; font-size: 13px; }\n  .field .label { flex: none; }\n  .field .fill { flex: 1; border-bottom: 1px solid #000; min-height: 1.2em; display: inline-block; }\n  .field .value b { font-weight: 600; }\n  .sign { margin-top: 18px; text-align: right; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <p class="formtitle">FORM XXIX</p>\n<p class="formtitle">[See Rule 78 (1) (d)]</p>\n<p class="lead">Register Of Advances Deductions For Damages Or Loss And Fines</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<div class="gap"></div>\n<table class="grid"><tr><td>Serial Number</td><td>Name of the Workman</td><td>Father’s/ Husband’s Name</td><td>Employee Number</td><td>Designation</td><td>Advance Paid</td></tr><tr><td>Date of Payment</td><td>Amount Paid</td><td>Number of Instalments to be recovered</td><td>Date on which recovery completed</td></tr><tr><td>(1)</td><td>(2)</td><td>(3)</td><td>(4)</td><td>(5)</td><td>(6)</td><td>(7)</td><td>(8)</td><td>(9)</td></tr></table>\n<div class="gap"></div>\n<table class="grid"><tr><td>Deduction for Damage/ Loss</td><td>Fines</td><td>Signature or Thumb Impression of the Wo rk man</td><td>Remarks</td></tr><tr><td>Damage or/ loss caused</td><td>Date of Show Cause Notice</td><td>Total amount of deduction imposed</td><td>Number of instalments to be recovered</td><td>Date on which deduction completed</td><td>Act or Omission</td><td>Date of S how Cause Notice</td><td>Amount of fine imposed</td><td>Date on which fine recovery completed</td></tr><tr><td>(100</td><td>(11)</td><td>(12)</td><td>(13)</td><td>(14)</td><td>(15)</td><td>(16)</td><td>(17)</td><td>(18)</td><td>(19)</td><td>(20)</td></tr></table>\n<div class="gap"></div>\n</body></html>',
'columns': [
            'Serial Number',
'Name of the Workman',
'Father’s/ Husband’s Name',
'Employee Number',
'Designation',
'Advance Paid'
        ],
'field_mappings': {
            'Employee Number': 'Employee_Code',
'Advance Paid': 'Advance_Amount',
'Serial Number': 'sl',
'Name of the Workman': 'Employee_Name',
'Father’s/ Husband’s Name': 'Father_Name',
'Designation': 'Designation'
        },
'calculation_rules': []
    },
{
        'state': 'Tamil Nadu',
'purpose': 'Register of Workmen',
'form_code': 'FORM XXVI',
'title': 'Register of Workmen',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  p.formtitle { text-align: center; font-weight: bold; font-size: 15px; margin-bottom: 2px; }\n  p.rule { text-align: center; font-size: 11px; color: #333; margin-bottom: 8px; }\n  p.title { text-align: center; font-weight: bold; font-size: 15px; margin-bottom: 12px; }\n  p.lead { font-weight: 600; margin-top: 8px; }\n  .gap { height: 10px; }\n  .field { display: flex; gap: 8px; align-items: baseline; margin: 6px 0; font-size: 13px; }\n  .field .label { flex: none; }\n  .field .fill { flex: 1; border-bottom: 1px solid #000; min-height: 1.2em; display: inline-block; }\n  .field .value b { font-weight: 600; }\n  .sign { margin-top: 18px; text-align: right; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <p class="title">FORM No. XXVI</p>\n<p class="rule">[See Rule 75]</p>\n<p class="lead">Register Of Employment Of Contract Labour</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<div class="gap"></div>\n<table class="grid"><tr><td>Serial Number</td><td>Name of the Workman</td><td>Age and Sex (Male/ Female)</td><td>Permanent Home Address</td><td>Local Address</td><td>Designation (Nature of Work)</td><td>Father’s/ Husband’s Name</td></tr><tr><td>(1)</td><td>(2)</td><td>(3)</td><td>(4)</td><td>(5)</td><td>(6)</td><td>(7)</td></tr></table>\n<div class="gap"></div>\n<table class="grid"><tr><td>Date of Entry into service</td><td>Rate of Wages</td><td>Daily Hours of Work done (1, 2, 3………., 29, 30, 31)</td><td>Number of Days Worked</td><td>Signature or Thumb impression of the Workman</td><td>Date of Termination of Employment</td><td>Signature of Contractor/ Representative)</td></tr><tr><td>(8)</td><td>(9)</td><td>(10)</td><td>(11)</td><td>(12)</td><td>(13)</td><td>(14)</td></tr></table>\n<div class="gap"></div>\n</body></html>',
'columns': [
            'Date of Entry into service',
'Rate of Wages',
'Daily Hours of Work done (1, 2, 3………., 29, 30, 31)',
'Number of Days Worked',
'Signature or Thumb impression of the Workman',
'Date of Termination of Employment',
'Signature of Contractor/ Representative)'
        ],
'field_mappings': {
            'Date of Termination of Employment': 'Date_Of_Leaving',
'Date of Entry into service': 'Date_Of_Joining',
'Rate of Wages': 'Normal_Rate',
'Number of Days Worked': 'Total_Days_Worked'
        },
'calculation_rules': []
    },
{
        'state': 'Tamil Nadu',
'purpose': 'Wage Register',
'form_code': 'FORM XXVII',
'title': 'Wage Register',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  p.formtitle { text-align: center; font-weight: bold; font-size: 15px; margin-bottom: 2px; }\n  p.rule { text-align: center; font-size: 11px; color: #333; margin-bottom: 8px; }\n  p.title { text-align: center; font-weight: bold; font-size: 15px; margin-bottom: 12px; }\n  p.lead { font-weight: 600; margin-top: 8px; }\n  .gap { height: 10px; }\n  .field { display: flex; gap: 8px; align-items: baseline; margin: 6px 0; font-size: 13px; }\n  .field .label { flex: none; }\n  .field .fill { flex: 1; border-bottom: 1px solid #000; min-height: 1.2em; display: inline-block; }\n  .field .value b { font-weight: 600; }\n  .sign { margin-top: 18px; text-align: right; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <p class="title">FORM No. XXVII</p>\n<p class="rule">[See rule 78(1) (a)]</p>\n<p class="lead">Register of Wages</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<div class="gap"></div>\n<table class="grid"><tr><td>Serial Number</td><td>Name of the Workman</td><td>Sex</td><td>Designation/ Nature of Work</td><td>Daily rated/ piece-rated/ Monthly rated</td><td>Wages Period- Week/FN/ Month</td><td>Total No. of days worked during the Week/FN/ Month.</td><td>Units of work done/ Number of days worked</td></tr><tr><td>(1)</td><td>(2)</td><td>(3)</td><td>(4)</td><td>(5)</td><td>(6)</td><td>(7)</td><td>(8)</td></tr></table>\n<div class="gap"></div>\n<table class="grid"><tr><td>Daily rate of wages/ Piece rate</td><td>Overtime Rate</td><td>Wages Earned</td><td>Gross Wages</td></tr><tr><td>Basic Wages</td><td>Dearness Allowance</td><td>Other Allowances/ Cash Payment Nature to be specified</td><td>Overtime earned</td><td>Leave w ages including cash in lieu of k inds</td></tr><tr><td>(9)</td><td>(10)</td><td>(11)</td><td>(12)</td><td>(13)</td><td>(14)</td><td>(15)</td><td>(16)</td></tr></table>\n<div class="gap"></div>\n<table class="grid"><tr><td>Deductions</td><td>Net wages</td><td>Signature with Date or Thumb Impression/ Cheque No. and Date in case of Payment through Bank/ Advice of the Bank to be appended</td><td>Total unpaid amounts accumulated</td></tr><tr><td>Provident Fund</td><td>E.S.I.</td><td>Other deduction (indicate Nature)</td><td>Fines (if any)</td><td>Total Deductions</td></tr><tr><td>(17)</td><td>(18)</td><td>(19)</td><td>(20)</td><td>(21)</td><td>(22)</td><td>(23)</td><td>(24)</td></tr><tr><td>Grand Total:</td></tr></table>\n<div class="gap"></div>\n<p>Certified that the wages have been paid to all the workers employed for the month of</p>\n<p>……………….../ for the week ending ……………/ for the F.N ending ……………… on ……………</p>\n<div class="sign">Signature of Employer/ Manager/ Contract/ Authorised Person.</div>\n</body></html>',
'columns': [
            'Serial Number',
'Name of the Workman',
'Sex',
'Designation/ Nature of Work',
'Daily rated/ piece-rated/ Monthly rated',
'Wages Period- Week/FN/ Month',
'Total No. of days worked during the Week/FN/ Month.',
'Units of work done/ Number of days worked'
        ],
'field_mappings': {
            'Serial Number': 'sl',
'Name of the Workman': 'Employee_Name',
'Sex': 'Gender'
        },
'calculation_rules': []
    },
{
        'state': 'Telengana',
'purpose': 'Deductions for Damage or Loss',
'form_code': 'FORM XX',
'title': 'Register of Deductions for Damage or Loss',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Deductions for Damage or Loss FORM XX</h1>\n<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[See rule 78 (1)(a)(ii)]</h2>\n<p style="margin:4px 0;font-size:12px;"><b>1. Name and Address of Contractor:</b> {{CONTRACTOR_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>2. Name and Address of establishment in/under which:</b> {{EMPLOYER_NAME}}</p>\n<p>contract is carried on.</p>\n<p style="margin:4px 0;font-size:12px;"><b>3. Nature and location of work:</b> {{SITE_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>4. Name and address of Principal Employer:</b> {{EMPLOYER_NAME}}</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>There is no deduction for damage or Loss during the month of {{MONTH}} {{YEAR}}</p>\n<p>\\</p>\n</body></html>',
'columns': [
            'SI No.',
'Name of workmen',
"Father's/Husband's name",
'Designation',
'Particulars of damage or loss',
'Date of damage or loss',
'Whether workman showed cause against deduction',
"Name of person in whose presence employee's was heard",
'Amount of deduction imposed',
'No. of instalments',
'First Instalments',
'Last Instalments',
'Remarks'
        ],
'field_mappings': {
            'SI No.': 'sl',
'Name of workmen': 'Employee_Name',
"Father's/Husband's name": 'Father_Name',
'Designation': 'Designation',
'Particulars of damage or loss': 'Loss_Caused',
'Date of damage or loss': 'Date_of_Damage',
'Amount of deduction imposed': 'Deduction_Amount',
'No. of instalments': 'Deduction_Installments',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Telengana',
'purpose': 'MusterRoll',
'form_code': 'FORM XVI',
'title': 'Muster Roll cum Wage Register',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">See Rule 78(1)(a)(i FORM XVI</h1>\n<p>Muster Roll</p>\n<p>Name and address of Contractor</p>\n<p>Name and address of establishment in/under which contract is carried on</p>\n<p>Nature and location of work</p>\n<p>Name and address of Principal Employer</p>\n<p>For the month of</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>1…… 31</p>\n</body></html>',
'columns': [
            'Sl. No.',
'Name of workmen',
'Father’s/Husband’s name',
'Sex',
'Dates',
'Remarks'
        ],
'field_mappings': {
            'Sl. No.': 'sl',
'Name of workmen': 'Employee_Name',
'Father’s/Husband’s name': 'Father_Name',
'Sex': 'Gender',
'Dates': 'Date_Of_Joining',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Telengana',
'purpose': 'Register of Advances',
'form_code': 'FORM XXII',
'title': 'Register of Advances',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Advances FORM XXII</h1>\n<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[See rule 78 (1)(a)(ii)]</h2>\n<p style="margin:4px 0;font-size:12px;"><b>1. Name and Address of Contractor:</b> {{CONTRACTOR_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>2. Name and Address of establishment in/under which:</b> {{EMPLOYER_NAME}}</p>\n<p>contract is carried on.</p>\n<p style="margin:4px 0;font-size:12px;"><b>3. Nature and location of work:</b> {{SITE_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>4. Name and address of Principal Employer:</b> {{EMPLOYER_NAME}}</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>No Advance is given during the month of {{MONTH}} {{YEAR}}</p>\n</body></html>',
'columns': [
            'SI No.',
'Name of workmen',
"Father's/Husband's name",
'Nature of employment/Designation',
'Wage period and wages payable',
'Date and amount of advance given',
'Purpose(s) for which advance made',
'No. of instalments by which advance to be repaid',
'Date and amount of each instalments repaid',
'Date on which last instalments was repaid',
'Remarks'
        ],
'field_mappings': {
            'SI No.': 'sl',
'Name of workmen': 'Employee_Name',
"Father's/Husband's name": 'Father_Name',
'Nature of employment/Designation': 'Designation',
'Date and amount of advance given': 'Advance_Amount',
'Purpose(s) for which advance made': 'Advance_Purpose',
'No. of instalments by which advance to be repaid': 'Advance_Installments',
'Date and amount of each instalments repaid': 'Advance_Repaid_Amount',
'Date on which last instalments was repaid': 'Advance_Repaid_Date',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Telengana',
'purpose': 'Register of Fines',
'form_code': 'FORM XXI',
'title': 'Register of Fines',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Fines FORM XXI</h1>\n<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[See rule 78 (1)(a)(ii)]</h2>\n<p style="margin:4px 0;font-size:12px;"><b>1. Name and Address of Contractor:</b> {{CONTRACTOR_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>2. Name and Address of establishment in/under which:</b> {{EMPLOYER_NAME}}</p>\n<p>contract is carried on.</p>\n<p style="margin:4px 0;font-size:12px;"><b>3. Nature and location of work:</b> {{SITE_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>4. Name and address of Principal Employer:</b> {{EMPLOYER_NAME}}</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>No fine imposed during the month of {{MONTH}} {{YEAR}}</p>\n</body></html>',
'columns': [
            'SI No.',
'Name of workmen',
"Father's/Husband's name",
'Designation/nature for fine imposed',
'Act/Ommission for which imposed',
'Date of Offence',
'Whether workman showed cause against fine',
"Name of person in whose presence employee's was heard",
'Wage periods and wages payable',
'Amount of fine imposed',
'Date on which fine realised',
'Remarks'
        ],
'field_mappings': {
            'SI No.': 'sl',
'Name of workmen': 'Employee_Name',
"Father's/Husband's name": 'Father_Name',
'Act/Ommission for which imposed': 'Fine_Offence_Nature',
'Date of Offence': 'Fine_Offence_Date',
'Amount of fine imposed': 'Fine_Amount',
'Date on which fine realised': 'Fine_Realised_Date',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Telengana',
'purpose': 'Register of Overtime',
'form_code': 'FORM XXIII',
'title': 'Register of Overtime',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Overtime FORM XXIII</h1>\n<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[See rule 78 (1)(a)(iii)]</h2>\n<p style="margin:4px 0;font-size:12px;"><b>1. Name and Address of Contractor:</b> {{CONTRACTOR_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>2. Name and Address of establishment in/under which:</b> {{EMPLOYER_NAME}}</p>\n<p>contract is carried on.</p>\n<p style="margin:4px 0;font-size:12px;"><b>3. Nature and location of work:</b> {{SITE_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>4. Name and address of Principal Employer:</b> {{EMPLOYER_NAME}}</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>No overtime work is done during the month of {{MONTH}} {{YEAR}}</p>\n</body></html>',
'columns': [
            'SI No.',
'Name of workman',
"Father's/Husband's name",
'Sex',
'Designation/nature of employment',
'Date on which overtime worked',
'Total overtime worked',
'Normal rate of wages',
'Overtime rate of wages',
'Overtime earnings',
'Date on which overtime wages paid',
'Remarks'
        ],
'field_mappings': {
            'SI No.': 'sl',
'Name of workman': 'Employee_Name',
"Father's/Husband's name": 'Father_Name',
'Sex': 'Gender',
'Designation/nature of employment': 'Designation',
'Date on which overtime worked': 'Overtime_Date',
'Total overtime worked': 'Overtime_Extent',
'Normal rate of wages': 'Normal_Rate',
'Overtime rate of wages': 'Overtime_Rate',
'Overtime earnings': 'Overtime_Earnings',
'Date on which overtime wages paid': 'Overtime_Payment_Date',
'Remarks': 'Remarks'
        },
'calculation_rules': [
            {
                'target': 'otEarnings',
'label': 'Overtime wages',
'formula': 'otHours * otRate'
            }
        ]
    },
{
        'state': 'Telengana',
'purpose': 'Register of Workmen',
'form_code': 'FORM XIII',
'title': 'Register of Workmen',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  p.formtitle { text-align: center; font-weight: bold; font-size: 15px; margin-bottom: 2px; }\n  p.rule { text-align: center; font-size: 11px; color: #333; margin-bottom: 8px; }\n  p.title { text-align: center; font-weight: bold; font-size: 15px; margin-bottom: 12px; }\n  p.lead { font-weight: 600; margin-top: 8px; }\n  .gap { height: 10px; }\n  .field { display: flex; gap: 8px; align-items: baseline; margin: 6px 0; font-size: 13px; }\n  .field .label { flex: none; }\n  .field .fill { flex: 1; border-bottom: 1px solid #000; min-height: 1.2em; display: inline-block; }\n  .field .value b { font-weight: 600; }\n  .sign { margin-top: 18px; text-align: right; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <p class="formtitle">FORM XIII</p>\n<p class="title">[ See Rule 75 ]</p>\n<p class="lead">Register of Workmen Employed by Contractor</p>\n<p>Name and address of Contractor …………………………………………………………………………………………....................................................................................</p>\n<p>………………………………………………………………………………………………………………………………………………………………………………………………………………………………</p>\n<p>Nature and location of work ………………………………………………………………………………………………………………………………………………………………………………..</p>\n<p>Name and address of establishment in/under which contract is carried on …………………………………………………………………………………………………………</p>\n<p>……………………………………………………………………………………………………………………………………………………………………………………………………………………………… Name and address of Principal Employer ……………………………………………………………………………………………………………………………………………………………..</p>\n<p>……………………………………………………………………………………………………………………………………………………………………………………………………………………………..</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<div class="gap"></div>\n</body></html>',
'columns': [
            'SI. No.',
'Name and surname of workmen',
'Age and Sex',
'Father’s/ Husband’s name',
'Nature of Employment/ Designation',
'Permanent house a ddress of workman (Village and t e hsil/ t aluk and d istrict)',
'Local Address',
'Date of commencement of employment',
'Signature or thumb impression of workman`',
'Date of termination of employment',
'Reason for termination',
'Remarks'
        ],
'field_mappings': {
            'Permanent house a ddress of workman (Village and t e hsil/ t aluk and d istrict)': 'Address',
'Date of commencement of employment': 'Date_Of_Joining',
'Date of termination of employment': 'Date_Of_Leaving',
'SI. No.': 'sl',
'Name and surname of workmen': 'Employee_Name',
'Age and Sex': 'Gender',
'Father’s/ Husband’s name': 'Father_Name',
'Local Address': 'Address',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Telengana',
'purpose': 'Wage Register',
'form_code': 'FORM XVII',
'title': 'Wage Register',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">See Rule 78(I)(a)(i)] FORM XVII</h1>\n<p>Register of Wages</p>\n<p>Name and address of the Contractor</p>\n<p>Name and address of Establishment in/under which contract is carried on</p>\n<p>Name and location of work</p>\n<p>Name and address of Principal Employer</p>\n<p>Wage Period: Monthly</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>Basic wages Dearness Allowance Overtime Other cash payments (Nature of payments to be indicated) Total</p>\n<p>Wage Period: Monthly ………………………………………………………………………………………………………………………………………………………………………………………....</p>\n</body></html>',
'columns': [
            'Sl. No.',
'Name of workmen',
'Sl. No. in the register of workmen',
'Designation/ Nature of employment',
'No. of days worked',
'Unit of work done',
'Daily-rate of wages/piece-rate',
'Amount of wages earned',
'Deductions if any (indicate nature)',
'Net amount paid',
'Signature/Thumb impression of workmen',
'Initial of contractor or his representative'
        ],
'field_mappings': {
            'Name of workmen': 'Employee_Name',
'Unit of work done': 'NO_ofunit_Per_Piece',
'Sl. No.': 'sl',
'Sl. No. in the register of workmen': 'sl',
'Designation/ Nature of employment': 'Designation',
'No. of days worked': 'Total_Days_Worked',
'Daily-rate of wages/piece-rate': 'Normal_Rate',
'Amount of wages earned': 'Gross_Wages',
'Deductions if any (indicate nature)': 'Total_Deductions',
'Net amount paid': 'Net_Salary'
        },
'calculation_rules': [
            {
                'target': 'grossWages',
'label': 'Gross wages',
'formula': 'daysWorked * dailyRate'
            },
{
                'target': 'netSalary',
'label': 'Net amount paid',
'formula': 'grossWages - totalDeductions'
            }
        ]
    },
{
        'state': 'Tripura',
'purpose': 'Deductions for Damage or Loss',
'form_code': 'FORM XX',
'title': 'Register of Deductions for Damage or Loss',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Deductions for Damage or Loss FORM XX</h1>\n<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[See rule 78 (1)(a)(ii)]</h2>\n<p style="margin:4px 0;font-size:12px;"><b>1. Name and Address of Contractor:</b> {{CONTRACTOR_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>2. Name and Address of establishment in/under which:</b> {{EMPLOYER_NAME}}</p>\n<p>contract is carried on.</p>\n<p style="margin:4px 0;font-size:12px;"><b>3. Nature and location of work:</b> {{SITE_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>4. Name and address of Principal Employer:</b> {{EMPLOYER_NAME}}</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>There is no deduction for damage or Loss during the month of {{MONTH}} {{YEAR}}</p>\n<p>\\</p>\n</body></html>',
'columns': [
            'SI No.',
'Name of workmen',
"Father's/Husband's name",
'Designation',
'Particulars of damage or loss',
'Date of damage or loss',
'Whether workman showed cause against deduction',
"Name of person in whose presence employee's was heard",
'Amount of deduction imposed',
'No. of instalments',
'First Instalments',
'Last Instalments',
'Remarks'
        ],
'field_mappings': {
            "Father's/Husband's name": 'Father_Name',
'SI No.': 'sl',
'Name of workmen': 'Employee_Name',
'Designation': 'Designation',
'Particulars of damage or loss': 'Loss_Caused',
'Date of damage or loss': 'Date_of_Damage',
'Amount of deduction imposed': 'Deduction_Amount',
'No. of instalments': 'Deduction_Installments',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Tripura',
'purpose': 'MusterRoll',
'form_code': 'FORM XVI',
'title': 'Muster Roll cum Wage Register',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">See Rule 78(1)(a)(i FORM XVI</h1>\n<p>Muster Roll</p>\n<p>Name and address of Contractor</p>\n<p>Name and address of establishment in/under which contract is carried on</p>\n<p>Nature and location of work</p>\n<p>Name and address of Principal Employer</p>\n<p>For the month of</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>1…… 31</p>\n</body></html>',
'columns': [
            'Sl. No.',
'Name of workmen',
'Father’s/Husband’s name',
'Sex',
'Dates',
'Remarks'
        ],
'field_mappings': {
            'Sl. No.': 'sl',
'Name of workmen': 'Employee_Name',
'Father’s/Husband’s name': 'Father_Name',
'Sex': 'Gender',
'Dates': 'Date_Of_Joining',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Tripura',
'purpose': 'Register of Advances',
'form_code': 'FORM XXII',
'title': 'Register of Advances',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Advances FORM XXII</h1>\n<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[See rule 78 (1)(a)(ii)]</h2>\n<p style="margin:4px 0;font-size:12px;"><b>1. Name and Address of Contractor:</b> {{CONTRACTOR_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>2. Name and Address of establishment in/under which:</b> {{EMPLOYER_NAME}}</p>\n<p>contract is carried on.</p>\n<p style="margin:4px 0;font-size:12px;"><b>3. Nature and location of work:</b> {{SITE_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>4. Name and address of Principal Employer:</b> {{EMPLOYER_NAME}}</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>No Advance is given during the month of {{MONTH}} {{YEAR}}</p>\n</body></html>',
'columns': [
            'SI No.',
'Name of workmen',
"Father's/Husband's name",
'Nature of employment/Designation',
'Wage period and wages payable',
'Date and amount of advance given',
'Purpose(s) for which advance made',
'No. of instalments by which advance to be repaid',
'Date and amount of each instalments repaid',
'Date on which last instalments was repaid',
'Remarks'
        ],
'field_mappings': {
            'Nature of employment/Designation': 'Designation',
'SI No.': 'sl',
'Name of workmen': 'Employee_Name',
"Father's/Husband's name": 'Father_Name',
'Date and amount of advance given': 'Advance_Amount',
'Purpose(s) for which advance made': 'Advance_Purpose',
'No. of instalments by which advance to be repaid': 'Advance_Installments',
'Date and amount of each instalments repaid': 'Advance_Repaid_Amount',
'Date on which last instalments was repaid': 'Advance_Repaid_Date',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Tripura',
'purpose': 'Register of Fines',
'form_code': 'FORM XXI',
'title': 'Register of Fines',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Fines FORM XXI</h1>\n<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[See rule 78 (1)(a)(ii)]</h2>\n<p style="margin:4px 0;font-size:12px;"><b>1. Name and Address of Contractor:</b> {{CONTRACTOR_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>2. Name and Address of establishment in/under which:</b> {{EMPLOYER_NAME}}</p>\n<p>contract is carried on.</p>\n<p style="margin:4px 0;font-size:12px;"><b>3. Nature and location of work:</b> {{SITE_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>4. Name and address of Principal Employer:</b> {{EMPLOYER_NAME}}</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>No fine imposed during the month of {{MONTH}} {{YEAR}}</p>\n</body></html>',
'columns': [
            'SI No.',
'Name of workmen',
"Father's/Husband's name",
'Designation/nature for fine imposed',
'Act/Ommission for which imposed',
'Date of Offence',
'Whether workman showed cause against fine',
"Name of person in whose presence employee's was heard",
'Wage periods and wages payable',
'Amount of fine imposed',
'Date on which fine realised',
'Remarks'
        ],
'field_mappings': {
            'SI No.': 'sl',
'Name of workmen': 'Employee_Name',
"Father's/Husband's name": 'Father_Name',
'Act/Ommission for which imposed': 'Fine_Offence_Nature',
'Date of Offence': 'Fine_Offence_Date',
'Amount of fine imposed': 'Fine_Amount',
'Date on which fine realised': 'Fine_Realised_Date',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Tripura',
'purpose': 'Register of Overtime',
'form_code': 'FORM XXIII',
'title': 'Register of Overtime',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Overtime FORM XXIII</h1>\n<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[See rule 78 (1)(a)(iii)]</h2>\n<p style="margin:4px 0;font-size:12px;"><b>1. Name and Address of Contractor:</b> {{CONTRACTOR_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>2. Name and Address of establishment in/under which:</b> {{EMPLOYER_NAME}}</p>\n<p>contract is carried on.</p>\n<p style="margin:4px 0;font-size:12px;"><b>3. Nature and location of work:</b> {{SITE_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>4. Name and address of Principal Employer:</b> {{EMPLOYER_NAME}}</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>No overtime work is done during the month of {{MONTH}} {{YEAR}}</p>\n</body></html>',
'columns': [
            'SI No.',
'Name of workman',
"Father's/Husband's name",
'Sex',
'Designation/nature of employment',
'Date on which overtime worked',
'Total overtime worked',
'Normal rate of wages',
'Overtime rate of wages',
'Overtime earnings',
'Date on which overtime wages paid',
'Remarks'
        ],
'field_mappings': {
            'SI No.': 'sl',
'Name of workman': 'Employee_Name',
"Father's/Husband's name": 'Father_Name',
'Sex': 'Gender',
'Designation/nature of employment': 'Designation',
'Date on which overtime worked': 'Overtime_Date',
'Total overtime worked': 'Overtime_Extent',
'Normal rate of wages': 'Normal_Rate',
'Overtime rate of wages': 'Overtime_Rate',
'Overtime earnings': 'Overtime_Earnings',
'Date on which overtime wages paid': 'Overtime_Payment_Date',
'Remarks': 'Remarks'
        },
'calculation_rules': [
            {
                'target': 'otEarnings',
'label': 'Overtime wages',
'formula': 'otHours * otRate'
            }
        ]
    },
{
        'state': 'Tripura',
'purpose': 'Register of Workmen',
'form_code': 'FORM XIII',
'title': 'Register of Workmen',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  p.formtitle { text-align: center; font-weight: bold; font-size: 15px; margin-bottom: 2px; }\n  p.rule { text-align: center; font-size: 11px; color: #333; margin-bottom: 8px; }\n  p.title { text-align: center; font-weight: bold; font-size: 15px; margin-bottom: 12px; }\n  p.lead { font-weight: 600; margin-top: 8px; }\n  .gap { height: 10px; }\n  .field { display: flex; gap: 8px; align-items: baseline; margin: 6px 0; font-size: 13px; }\n  .field .label { flex: none; }\n  .field .fill { flex: 1; border-bottom: 1px solid #000; min-height: 1.2em; display: inline-block; }\n  .field .value b { font-weight: 600; }\n  .sign { margin-top: 18px; text-align: right; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <p class="formtitle">FORM XIII</p>\n<p class="title">[ See Rule 75 ]</p>\n<p class="lead">Register of Workmen Employed by Contractor</p>\n<p>Name and address of Contractor …………………………………………………………………………………………....................................................................................</p>\n<p>………………………………………………………………………………………………………………………………………………………………………………………………………………………………</p>\n<p>Nature and location of work ………………………………………………………………………………………………………………………………………………………………………………..</p>\n<p>Name and address of establishment in/under which contract is carried on …………………………………………………………………………………………………………</p>\n<p>……………………………………………………………………………………………………………………………………………………………………………………………………………………………… Name and address of Principal Employer ……………………………………………………………………………………………………………………………………………………………..</p>\n<p>……………………………………………………………………………………………………………………………………………………………………………………………………………………………..</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<div class="gap"></div>\n</body></html>',
'columns': [
            'SI. No.',
'Name and surname of workmen',
'Age and Sex',
'Father’s/ Husband’s name',
'Nature of Employment/ Designation',
'Permanent house a ddress of workman (Village and t e hsil/ t aluk and d istrict)',
'Local Address',
'Date of commencement of employment',
'Signature or thumb impression of workman`',
'Date of termination of employment',
'Reason for termination',
'Remarks'
        ],
'field_mappings': {
            'Date of termination of employment': 'Date_Of_Leaving',
'SI. No.': 'sl',
'Name and surname of workmen': 'Employee_Name',
'Age and Sex': 'Gender',
'Father’s/ Husband’s name': 'Father_Name',
'Permanent house a ddress of workman (Village and t e hsil/ t aluk and d istrict)': 'Address',
'Local Address': 'Address',
'Date of commencement of employment': 'Date_Of_Joining',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Tripura',
'purpose': 'Wage Register',
'form_code': 'FORM XVII',
'title': 'Wage Register',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">See Rule 78(I)(a)(i)] FORM XVII</h1>\n<p>Register of Wages</p>\n<p>Name and address of the Contractor</p>\n<p>Name and address of Establishment in/under which contract is carried on</p>\n<p>Name and location of work</p>\n<p>Name and address of Principal Employer</p>\n<p>Wage Period: Monthly</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>Basic wages Dearness Allowance Overtime Other cash payments (Nature of payments to be indicated) Total</p>\n<p>Wage Period: Monthly ………………………………………………………………………………………………………………………………………………………………………………………....</p>\n</body></html>',
'columns': [
            'Sl. No.',
'Name of workmen',
'Sl. No. in the register of workmen',
'Designation/ Nature of employment',
'No. of days worked',
'Unit of work done',
'Daily-rate of wages/piece-rate',
'Amount of wages earned',
'Deductions if any (indicate nature)',
'Net amount paid',
'Signature/Thumb impression of workmen',
'Initial of contractor or his representative'
        ],
'field_mappings': {
            'Unit of work done': 'NO_ofunit_Per_Piece',
'Sl. No.': 'sl',
'Name of workmen': 'Employee_Name',
'Sl. No. in the register of workmen': 'sl',
'Designation/ Nature of employment': 'Designation',
'No. of days worked': 'Total_Days_Worked',
'Daily-rate of wages/piece-rate': 'Normal_Rate',
'Amount of wages earned': 'Gross_Wages',
'Deductions if any (indicate nature)': 'Total_Deductions',
'Net amount paid': 'Net_Salary'
        },
'calculation_rules': [
            {
                'target': 'grossWages',
'label': 'Gross wages',
'formula': 'daysWorked * dailyRate'
            },
{
                'target': 'netSalary',
'label': 'Net amount paid',
'formula': 'grossWages - totalDeductions'
            }
        ]
    },
{
        'state': 'Uttar Pradesh',
'purpose': 'Deductions for Damage or Loss',
'form_code': 'FORM XX',
'title': 'Register of Deductions for Damage or Loss',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Deductions for Damage or Loss FORM XX</h1>\n<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[See rule 78 (1)(a)(ii)]</h2>\n<p style="margin:4px 0;font-size:12px;"><b>1. Name and Address of Contractor:</b> {{CONTRACTOR_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>2. Name and Address of establishment in/under which:</b> {{EMPLOYER_NAME}}</p>\n<p>contract is carried on.</p>\n<p style="margin:4px 0;font-size:12px;"><b>3. Nature and location of work:</b> {{SITE_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>4. Name and address of Principal Employer:</b> {{EMPLOYER_NAME}}</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>There is no deduction for damage or Loss during the month of {{MONTH}} {{YEAR}}</p>\n<p>\\</p>\n</body></html>',
'columns': [
            'SI No.',
'Name of workmen',
"Father's/Husband's name",
'Designation',
'Particulars of damage or loss',
'Date of damage or loss',
'Whether workman showed cause against deduction',
"Name of person in whose presence employee's was heard",
'Amount of deduction imposed',
'No. of instalments',
'First Instalments',
'Last Instalments',
'Remarks'
        ],
'field_mappings': {
            'SI No.': 'sl',
'Name of workmen': 'Employee_Name',
"Father's/Husband's name": 'Father_Name',
'Designation': 'Designation',
'Particulars of damage or loss': 'Loss_Caused',
'Date of damage or loss': 'Date_of_Damage',
'Amount of deduction imposed': 'Deduction_Amount',
'No. of instalments': 'Deduction_Installments',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Uttar Pradesh',
'purpose': 'MusterRoll',
'form_code': 'FORM XVI',
'title': 'Muster Roll cum Wage Register',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">See Rule 78(1)(a)(i FORM XVI</h1>\n<p>Muster Roll</p>\n<p>Name and address of Contractor</p>\n<p>Name and address of establishment in/under which contract is carried on</p>\n<p>Nature and location of work</p>\n<p>Name and address of Principal Employer</p>\n<p>For the month of</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>1…… 31</p>\n</body></html>',
'columns': [
            'Sl. No.',
'Name of workmen',
'Father’s/Husband’s name',
'Sex',
'Dates',
'Remarks'
        ],
'field_mappings': {
            'Sl. No.': 'sl',
'Name of workmen': 'Employee_Name',
'Father’s/Husband’s name': 'Father_Name',
'Sex': 'Gender',
'Dates': 'Date_Of_Joining',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Uttar Pradesh',
'purpose': 'Register of Advances',
'form_code': 'FORM XXII',
'title': 'Register of Advances',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Advances FORM XXII</h1>\n<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[See rule 78 (1)(a)(ii)]</h2>\n<p style="margin:4px 0;font-size:12px;"><b>1. Name and Address of Contractor:</b> {{CONTRACTOR_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>2. Name and Address of establishment in/under which:</b> {{EMPLOYER_NAME}}</p>\n<p>contract is carried on.</p>\n<p style="margin:4px 0;font-size:12px;"><b>3. Nature and location of work:</b> {{SITE_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>4. Name and address of Principal Employer:</b> {{EMPLOYER_NAME}}</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>No Advance is given during the month of {{MONTH}} {{YEAR}}</p>\n</body></html>',
'columns': [
            'SI No.',
'Name of workmen',
"Father's/Husband's name",
'Nature of employment/Designation',
'Wage period and wages payable',
'Date and amount of advance given',
'Purpose(s) for which advance made',
'No. of instalments by which advance to be repaid',
'Date and amount of each instalments repaid',
'Date on which last instalments was repaid',
'Remarks'
        ],
'field_mappings': {
            'SI No.': 'sl',
'Name of workmen': 'Employee_Name',
"Father's/Husband's name": 'Father_Name',
'Nature of employment/Designation': 'Designation',
'Date and amount of advance given': 'Advance_Amount',
'Purpose(s) for which advance made': 'Advance_Purpose',
'No. of instalments by which advance to be repaid': 'Advance_Installments',
'Date and amount of each instalments repaid': 'Advance_Repaid_Amount',
'Date on which last instalments was repaid': 'Advance_Repaid_Date',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Uttar Pradesh',
'purpose': 'Register of Fines',
'form_code': 'FORM XXI',
'title': 'Register of Fines',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Fines FORM XXI</h1>\n<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[See rule 78 (1)(a)(ii)]</h2>\n<p style="margin:4px 0;font-size:12px;"><b>1. Name and Address of Contractor:</b> {{CONTRACTOR_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>2. Name and Address of establishment in/under which:</b> {{EMPLOYER_NAME}}</p>\n<p>contract is carried on.</p>\n<p style="margin:4px 0;font-size:12px;"><b>3. Nature and location of work:</b> {{SITE_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>4. Name and address of Principal Employer:</b> {{EMPLOYER_NAME}}</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>No fine imposed during the month of {{MONTH}} {{YEAR}}</p>\n</body></html>',
'columns': [
            'SI No.',
'Name of workmen',
"Father's/Husband's name",
'Designation/nature for fine imposed',
'Act/Ommission for which imposed',
'Date of Offence',
'Whether workman showed cause against fine',
"Name of person in whose presence employee's was heard",
'Wage periods and wages payable',
'Amount of fine imposed',
'Date on which fine realised',
'Remarks'
        ],
'field_mappings': {
            'Act/Ommission for which imposed': 'Fine_Offence_Nature',
'Date on which fine realised': 'Fine_Realised_Date',
'SI No.': 'sl',
'Name of workmen': 'Employee_Name',
"Father's/Husband's name": 'Father_Name',
'Date of Offence': 'Fine_Offence_Date',
'Amount of fine imposed': 'Fine_Amount',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Uttar Pradesh',
'purpose': 'Register of Overtime',
'form_code': 'FORM XXIII',
'title': 'Register of Overtime',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Overtime FORM XXIII</h1>\n<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[See rule 78 (1)(a)(iii)]</h2>\n<p style="margin:4px 0;font-size:12px;"><b>1. Name and Address of Contractor:</b> {{CONTRACTOR_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>2. Name and Address of establishment in/under which:</b> {{EMPLOYER_NAME}}</p>\n<p>contract is carried on.</p>\n<p style="margin:4px 0;font-size:12px;"><b>3. Nature and location of work:</b> {{SITE_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>4. Name and address of Principal Employer:</b> {{EMPLOYER_NAME}}</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>No overtime work is done during the month of {{MONTH}} {{YEAR}}</p>\n</body></html>',
'columns': [
            'SI No.',
'Name of workman',
"Father's/Husband's name",
'Sex',
'Designation/nature of employment',
'Date on which overtime worked',
'Total overtime worked',
'Normal rate of wages',
'Overtime rate of wages',
'Overtime earnings',
'Date on which overtime wages paid',
'Remarks'
        ],
'field_mappings': {
            'SI No.': 'sl',
'Name of workman': 'Employee_Name',
"Father's/Husband's name": 'Father_Name',
'Sex': 'Gender',
'Designation/nature of employment': 'Designation',
'Date on which overtime worked': 'Overtime_Date',
'Total overtime worked': 'Overtime_Extent',
'Normal rate of wages': 'Normal_Rate',
'Overtime rate of wages': 'Overtime_Rate',
'Overtime earnings': 'Overtime_Earnings',
'Date on which overtime wages paid': 'Overtime_Payment_Date',
'Remarks': 'Remarks'
        },
'calculation_rules': [
            {
                'target': 'otEarnings',
'label': 'Overtime wages',
'formula': 'otHours * otRate'
            }
        ]
    },
{
        'state': 'Uttar Pradesh',
'purpose': 'Register of Workmen',
'form_code': 'FORM XIII',
'title': 'Register of Workmen',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  p.formtitle { text-align: center; font-weight: bold; font-size: 15px; margin-bottom: 2px; }\n  p.rule { text-align: center; font-size: 11px; color: #333; margin-bottom: 8px; }\n  p.title { text-align: center; font-weight: bold; font-size: 15px; margin-bottom: 12px; }\n  p.lead { font-weight: 600; margin-top: 8px; }\n  .gap { height: 10px; }\n  .field { display: flex; gap: 8px; align-items: baseline; margin: 6px 0; font-size: 13px; }\n  .field .label { flex: none; }\n  .field .fill { flex: 1; border-bottom: 1px solid #000; min-height: 1.2em; display: inline-block; }\n  .field .value b { font-weight: 600; }\n  .sign { margin-top: 18px; text-align: right; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <p class="formtitle">FORM XIII</p>\n<p class="title">[ See Rule 75 ]</p>\n<p class="lead">Register of Workmen Employed by Contractor</p>\n<p>Name and address of Contractor …………………………………………………………………………………………....................................................................................</p>\n<p>………………………………………………………………………………………………………………………………………………………………………………………………………………………………</p>\n<p>Nature and location of work ………………………………………………………………………………………………………………………………………………………………………………..</p>\n<p>Name and address of establishment in/under which contract is carried on …………………………………………………………………………………………………………</p>\n<p>……………………………………………………………………………………………………………………………………………………………………………………………………………………………… Name and address of Principal Employer ……………………………………………………………………………………………………………………………………………………………..</p>\n<p>……………………………………………………………………………………………………………………………………………………………………………………………………………………………..</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<div class="gap"></div>\n</body></html>',
'columns': [
            'SI. No.',
'Name and surname of workmen',
'Age and Sex',
'Father’s/ Husband’s name',
'Nature of Employment/ Designation',
'Permanent house a ddress of workman (Village and t e hsil/ t aluk and d istrict)',
'Local Address',
'Date of commencement of employment',
'Signature or thumb impression of workman`',
'Date of termination of employment',
'Reason for termination',
'Remarks'
        ],
'field_mappings': {
            'Date of termination of employment': 'Date_Of_Leaving',
'SI. No.': 'sl',
'Name and surname of workmen': 'Employee_Name',
'Age and Sex': 'Gender',
'Father’s/ Husband’s name': 'Father_Name',
'Permanent house a ddress of workman (Village and t e hsil/ t aluk and d istrict)': 'Address',
'Local Address': 'Address',
'Date of commencement of employment': 'Date_Of_Joining',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'Uttar Pradesh',
'purpose': 'Wage Register',
'form_code': 'FORM XVII',
'title': 'Wage Register',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">See Rule 78(I)(a)(i)] FORM XVII</h1>\n<p>Register of Wages</p>\n<p>Name and address of the Contractor</p>\n<p>Name and address of Establishment in/under which contract is carried on</p>\n<p>Name and location of work</p>\n<p>Name and address of Principal Employer</p>\n<p>Wage Period: Monthly</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>Basic wages Dearness Allowance Overtime Other cash payments (Nature of payments to be indicated) Total</p>\n<p>Wage Period: Monthly ………………………………………………………………………………………………………………………………………………………………………………………....</p>\n</body></html>',
'columns': [
            'Sl. No.',
'Name of workmen',
'Sl. No. in the register of workmen',
'Designation/ Nature of employment',
'No. of days worked',
'Unit of work done',
'Daily-rate of wages/piece-rate',
'Amount of wages earned',
'Deductions if any (indicate nature)',
'Net amount paid',
'Signature/Thumb impression of workmen',
'Initial of contractor or his representative'
        ],
'field_mappings': {
            'Unit of work done': 'NO_ofunit_Per_Piece',
'Sl. No.': 'sl',
'Name of workmen': 'Employee_Name',
'Sl. No. in the register of workmen': 'sl',
'Designation/ Nature of employment': 'Designation',
'No. of days worked': 'Total_Days_Worked',
'Daily-rate of wages/piece-rate': 'Normal_Rate',
'Amount of wages earned': 'Gross_Wages',
'Deductions if any (indicate nature)': 'Total_Deductions',
'Net amount paid': 'Net_Salary'
        },
'calculation_rules': [
            {
                'target': 'grossWages',
'label': 'Gross wages',
'formula': 'daysWorked * dailyRate'
            },
{
                'target': 'netSalary',
'label': 'Net amount paid',
'formula': 'grossWages - totalDeductions'
            }
        ]
    },
{
        'state': 'West Bengal',
'purpose': 'Deductions for Damage or Loss',
'form_code': 'FORM XX',
'title': 'Register of Deductions for Damage or Loss',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Deductions for Damage or Loss FORM XX</h1>\n<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[See rule 78 (1)(a)(ii)]</h2>\n<p style="margin:4px 0;font-size:12px;"><b>1. Name and Address of Contractor:</b> {{CONTRACTOR_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>2. Name and Address of establishment in/under which:</b> {{EMPLOYER_NAME}}</p>\n<p>contract is carried on.</p>\n<p style="margin:4px 0;font-size:12px;"><b>3. Nature and location of work:</b> {{SITE_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>4. Name and address of Principal Employer:</b> {{EMPLOYER_NAME}}</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>There is no deduction for damage or Loss during the month of {{MONTH}} {{YEAR}}</p>\n<p>\\</p>\n</body></html>',
'columns': [
            'SI No.',
'Name of workmen',
"Father's/Husband's name",
'Designation',
'Particulars of damage or loss',
'Date of damage or loss',
'Whether workman showed cause against deduction',
"Name of person in whose presence employee's was heard",
'Amount of deduction imposed',
'No. of instalments',
'First Instalments',
'Last Instalments',
'Remarks'
        ],
'field_mappings': {
            'SI No.': 'sl',
'Name of workmen': 'Employee_Name',
"Father's/Husband's name": 'Father_Name',
'Designation': 'Designation',
'Particulars of damage or loss': 'Loss_Caused',
'Date of damage or loss': 'Date_of_Damage',
'Amount of deduction imposed': 'Deduction_Amount',
'No. of instalments': 'Deduction_Installments',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'West Bengal',
'purpose': 'MusterRoll',
'form_code': 'FORM XVI',
'title': 'Muster Roll cum Wage Register',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">See Rule 78(1)(a)(i FORM XVI</h1>\n<p>Muster Roll</p>\n<p>Name and address of Contractor</p>\n<p>Name and address of establishment in/under which contract is carried on</p>\n<p>Nature and location of work</p>\n<p>Name and address of Principal Employer</p>\n<p>For the month of</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>1…… 31</p>\n</body></html>',
'columns': [
            'Sl. No.',
'Name of workmen',
'Father’s/Husband’s name',
'Sex',
'Dates',
'Remarks'
        ],
'field_mappings': {
            'Sl. No.': 'sl',
'Name of workmen': 'Employee_Name',
'Father’s/Husband’s name': 'Father_Name',
'Sex': 'Gender',
'Dates': 'Date_Of_Joining',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'West Bengal',
'purpose': 'Register of Advances',
'form_code': 'FORM XXII',
'title': 'Register of Advances',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Advances FORM XXII</h1>\n<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[See rule 78 (1)(a)(ii)]</h2>\n<p style="margin:4px 0;font-size:12px;"><b>1. Name and Address of Contractor:</b> {{CONTRACTOR_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>2. Name and Address of establishment in/under which:</b> {{EMPLOYER_NAME}}</p>\n<p>contract is carried on.</p>\n<p style="margin:4px 0;font-size:12px;"><b>3. Nature and location of work:</b> {{SITE_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>4. Name and address of Principal Employer:</b> {{EMPLOYER_NAME}}</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>No Advance is given during the month of {{MONTH}} {{YEAR}}</p>\n</body></html>',
'columns': [
            'SI No.',
'Name of workmen',
"Father's/Husband's name",
'Nature of employment/Designation',
'Wage period and wages payable',
'Date and amount of advance given',
'Purpose(s) for which advance made',
'No. of instalments by which advance to be repaid',
'Date and amount of each instalments repaid',
'Date on which last instalments was repaid',
'Remarks'
        ],
'field_mappings': {
            'Date and amount of advance given': 'Advance_Amount',
'SI No.': 'sl',
'Name of workmen': 'Employee_Name',
"Father's/Husband's name": 'Father_Name',
'Nature of employment/Designation': 'Designation',
'Purpose(s) for which advance made': 'Advance_Purpose',
'No. of instalments by which advance to be repaid': 'Advance_Installments',
'Date and amount of each instalments repaid': 'Advance_Repaid_Amount',
'Date on which last instalments was repaid': 'Advance_Repaid_Date',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'West Bengal',
'purpose': 'Register of Fines',
'form_code': 'FORM XXI',
'title': 'Register of Fines',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Fines FORM XXI</h1>\n<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[See rule 78 (1)(a)(ii)]</h2>\n<p style="margin:4px 0;font-size:12px;"><b>1. Name and Address of Contractor:</b> {{CONTRACTOR_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>2. Name and Address of establishment in/under which:</b> {{EMPLOYER_NAME}}</p>\n<p>contract is carried on.</p>\n<p style="margin:4px 0;font-size:12px;"><b>3. Nature and location of work:</b> {{SITE_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>4. Name and address of Principal Employer:</b> {{EMPLOYER_NAME}}</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>No fine imposed during the month of {{MONTH}} {{YEAR}}</p>\n</body></html>',
'columns': [
            'SI No.',
'Name of workmen',
"Father's/Husband's name",
'Designation/nature for fine imposed',
'Act/Ommission for which imposed',
'Date of Offence',
'Whether workman showed cause against fine',
"Name of person in whose presence employee's was heard",
'Wage periods and wages payable',
'Amount of fine imposed',
'Date on which fine realised',
'Remarks'
        ],
'field_mappings': {
            'SI No.': 'sl',
'Name of workmen': 'Employee_Name',
"Father's/Husband's name": 'Father_Name',
'Act/Ommission for which imposed': 'Fine_Offence_Nature',
'Date of Offence': 'Fine_Offence_Date',
'Amount of fine imposed': 'Fine_Amount',
'Date on which fine realised': 'Fine_Realised_Date',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'West Bengal',
'purpose': 'Register of Overtime',
'form_code': 'FORM XXIII',
'title': 'Register of Overtime',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">Register of Overtime FORM XXIII</h1>\n<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">[See rule 78 (1)(a)(iii)]</h2>\n<p style="margin:4px 0;font-size:12px;"><b>1. Name and Address of Contractor:</b> {{CONTRACTOR_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>2. Name and Address of establishment in/under which:</b> {{EMPLOYER_NAME}}</p>\n<p>contract is carried on.</p>\n<p style="margin:4px 0;font-size:12px;"><b>3. Nature and location of work:</b> {{SITE_NAME}}</p>\n<p style="margin:4px 0;font-size:12px;"><b>4. Name and address of Principal Employer:</b> {{EMPLOYER_NAME}}</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>No overtime work is done during the month of {{MONTH}} {{YEAR}}</p>\n</body></html>',
'columns': [
            'SI No.',
'Name of workman',
"Father's/Husband's name",
'Sex',
'Designation/nature of employment',
'Date on which overtime worked',
'Total overtime worked',
'Normal rate of wages',
'Overtime rate of wages',
'Overtime earnings',
'Date on which overtime wages paid',
'Remarks'
        ],
'field_mappings': {
            'SI No.': 'sl',
'Name of workman': 'Employee_Name',
"Father's/Husband's name": 'Father_Name',
'Sex': 'Gender',
'Designation/nature of employment': 'Designation',
'Date on which overtime worked': 'Overtime_Date',
'Total overtime worked': 'Overtime_Extent',
'Normal rate of wages': 'Normal_Rate',
'Overtime rate of wages': 'Overtime_Rate',
'Overtime earnings': 'Overtime_Earnings',
'Date on which overtime wages paid': 'Overtime_Payment_Date',
'Remarks': 'Remarks'
        },
'calculation_rules': [
            {
                'target': 'otEarnings',
'label': 'Overtime wages',
'formula': 'otHours * otRate'
            }
        ]
    },
{
        'state': 'West Bengal',
'purpose': 'Register of Workmen',
'form_code': 'FORM XIII',
'title': 'Register of Workmen',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  p.formtitle { text-align: center; font-weight: bold; font-size: 15px; margin-bottom: 2px; }\n  p.rule { text-align: center; font-size: 11px; color: #333; margin-bottom: 8px; }\n  p.title { text-align: center; font-weight: bold; font-size: 15px; margin-bottom: 12px; }\n  p.lead { font-weight: 600; margin-top: 8px; }\n  .gap { height: 10px; }\n  .field { display: flex; gap: 8px; align-items: baseline; margin: 6px 0; font-size: 13px; }\n  .field .label { flex: none; }\n  .field .fill { flex: 1; border-bottom: 1px solid #000; min-height: 1.2em; display: inline-block; }\n  .field .value b { font-weight: 600; }\n  .sign { margin-top: 18px; text-align: right; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <p class="formtitle">FORM XIII</p>\n<p class="title">[ See Rule 75 ]</p>\n<p class="lead">Register of Workmen Employed by Contractor</p>\n<p>Name and address of Contractor …………………………………………………………………………………………....................................................................................</p>\n<p>………………………………………………………………………………………………………………………………………………………………………………………………………………………………</p>\n<p>Nature and location of work ………………………………………………………………………………………………………………………………………………………………………………..</p>\n<p>Name and address of establishment in/under which contract is carried on …………………………………………………………………………………………………………</p>\n<p>……………………………………………………………………………………………………………………………………………………………………………………………………………………………… Name and address of Principal Employer ……………………………………………………………………………………………………………………………………………………………..</p>\n<p>……………………………………………………………………………………………………………………………………………………………………………………………………………………………..</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<div class="gap"></div>\n</body></html>',
'columns': [
            'SI. No.',
'Name and surname of workmen',
'Age and Sex',
'Father’s/ Husband’s name',
'Nature of Employment/ Designation',
'Permanent house a ddress of workman (Village and t e hsil/ t aluk and d istrict)',
'Local Address',
'Date of commencement of employment',
'Signature or thumb impression of workman`',
'Date of termination of employment',
'Reason for termination',
'Remarks'
        ],
'field_mappings': {
            'Date of termination of employment': 'Date_Of_Leaving',
'SI. No.': 'sl',
'Name and surname of workmen': 'Employee_Name',
'Age and Sex': 'Gender',
'Father’s/ Husband’s name': 'Father_Name',
'Permanent house a ddress of workman (Village and t e hsil/ t aluk and d istrict)': 'Address',
'Local Address': 'Address',
'Date of commencement of employment': 'Date_Of_Joining',
'Remarks': 'Remarks'
        },
'calculation_rules': []
    },
{
        'state': 'West Bengal',
'purpose': 'Wage Register',
'form_code': 'FORM XVII',
'title': 'Wage Register',
'act': '',
'html': '<!doctype html><html><head><meta charset="utf-8">\n<style>\n  * { box-sizing: border-box; }\n  body { font-family: \'Times New Roman\', Times, serif; margin: 28px; color: #000; }\n  p { margin: 4px 0; font-size: 13px; }\n  table.grid { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }\n  table.grid td, table.grid th { border: 1px solid #000; padding: 4px 6px; }\n  @media print { body { margin: 8mm; } }\n</style></head><body>\n  <h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">See Rule 78(I)(a)(i)] FORM XVII</h1>\n<p>Register of Wages</p>\n<p>Name and address of the Contractor</p>\n<p>Name and address of Establishment in/under which contract is carried on</p>\n<p>Name and location of work</p>\n<p>Name and address of Principal Employer</p>\n<p>Wage Period: Monthly</p>\n<table class="grid"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>\n<p>Basic wages Dearness Allowance Overtime Other cash payments (Nature of payments to be indicated) Total</p>\n<p>Wage Period: Monthly ………………………………………………………………………………………………………………………………………………………………………………………....</p>\n</body></html>',
'columns': [
            'Sl. No.',
'Name of workmen',
'Sl. No. in the register of workmen',
'Designation/ Nature of employment',
'No. of days worked',
'Unit of work done',
'Daily-rate of wages/piece-rate',
'Amount of wages earned',
'Deductions if any (indicate nature)',
'Net amount paid',
'Signature/Thumb impression of workmen',
'Initial of contractor or his representative'
        ],
'field_mappings': {
            'Name of workmen': 'Employee_Name',
'Designation/ Nature of employment': 'Designation',
'Unit of work done': 'NO_ofunit_Per_Piece',
'Sl. No.': 'sl',
'Sl. No. in the register of workmen': 'sl',
'No. of days worked': 'Total_Days_Worked',
'Daily-rate of wages/piece-rate': 'Normal_Rate',
'Amount of wages earned': 'Gross_Wages',
'Deductions if any (indicate nature)': 'Total_Deductions',
'Net amount paid': 'Net_Salary'
        },
'calculation_rules': [
            {
                'target': 'grossWages',
'label': 'Gross wages',
'formula': 'daysWorked * dailyRate'
            },
{
                'target': 'netSalary',
'label': 'Net amount paid',
'formula': 'grossWages - totalDeductions'
            }
        ]
    }
]
