"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, Copy, Download, FilePlus2, FileSpreadsheet, Loader2, Pencil, Plus, RotateCcw, Search, X } from 'lucide-react';
import EnterpriseDataTable, { type DataColumn } from '@/components/worker/EnterpriseDataTable';

type FieldMapping = { column: string; fieldKey: string };
type CalcRule = { targetField: string; label: string; formula: string };
type AiCheck = { key?: string; type: string; label: string; value?: string; required?: boolean };

type FormField = {
  section: string; label: string; dataType: string; dataSource: string;
  sourceField: string; mandatory: boolean; readOnly: boolean;
  signature: boolean; approval: boolean;
};

type TemplateRow = {
  id: number; state: string; formCode: string; title: string; templateType: string;
  status: string; act: string; frequency: string; criticality?: string; isMandatory?: boolean;
  sourceFormat: string; outputFormat?: string;
  columns: string[]; fields: FormField[]; meta: { lines?: string[]; file?: string };
  html: string; active: boolean; fieldMappings?: FieldMapping[]; calculationRules?: CalcRule[];
  aiChecks?: AiCheck[];
  formatAvailable?: boolean; version: number; fileName: string; hasFile: boolean; authored?: boolean;
  perRow?: boolean;
};

type BuilderDraft = {
  id: number | null;
  state: string; formCode: string; title: string;
  templateType: string; status: string; act: string; frequency: string;
  criticality: string; isMandatory: boolean; outputFormat: string; sourceFormat: string;
  columns: string[]; columnInput: string;
  fields: FormField[];
  html: string; perRow: boolean;
  fieldMappings: FieldMapping[]; calcRules: CalcRule[];
  aiChecks: AiCheck[];
};

const FIELD_KEYS = [
  'bss_id', 'bssId', 'sl', 'name', 'fatherName', 'gender', 'designation', 'department', 'doj', 'mobile', 'site', 'location',
  'Employee_Code', 'Employee_Name', 'Gender', 'Father_Name', 'Date_of_Birth', 'Age', 'Date_Of_Joining', 'Date_Of_Leaving',
  'Designation', 'Department', 'Shift', 'Branch_Address', 'Address', 'Location', 'State', 'Month', 'Account_No', 'Bank_Name',
  'Name_of_contractor', 'Address_of_contractor', 'Nature_ofWork_contractor', 'Tenure_of_Employement', 'Bank_transaction_ID',
  'UAN_No', 'ESIC_No', 'Name_of_Dispensary', 'Wage_Paid', 'Month_end_to', 'Month_Starts_From', 'NO_ofunit_Per_Piece',
  'Total_Days_Worked', 'Interval_From', 'Interval_To', 'Payment_Mode', 'Festival', 'Absent_Days', 'Weekoff', 'Arrears_Days',
  'Total_workhours', 'Work_Hours_from', 'Work_Hours_to', 'Loss_of_pay_LOP', 'Fixed_Basic_Wages', 'House_rent_Allowance',
  'Dearness_Allowance', 'Special_Allowance', 'Statutory_Bonus', 'Medical', 'Other_allowance', 'Fixed_Gross',
  'Earned_Basic_Wages', 'Arrear_of_Basic_Wages', 'Earned_Dearness_Allowance', 'Arrear_of_Dearness_Allowance',
  'Earned_House_Rent_Allowance', 'Arrear_of_House_rent_Allowance', 'Earned_Special_Allowance', 'Arr_of_Special_Allowance',
  'Overtime_Allowance', 'Other_Allowances', 'EarnedCity_Compensation_Allowance', 'Meal_Payouts', 'Earned_Gratuity', 'Gross_Wages',
  'PF_Deductions', 'Arrear_of_PF', 'VPF_Deduction', 'Arr_VPF', 'ESIC_Deductions', 'Arrear_of_ESIC', 'PT_Deductions',
  'Lwf_Deductions', 'TDS_Deductions', 'Medical_Deduction', 'Society', 'Insurance', 'Fine_Deduction', 'Overtime_deduction',
  'Salary_Advance', 'Other_Deduction', 'Total_Deductions', 'Recoveries', 'Net_Salary', 'Recovery_Type', 'Particulars',
  'Date_of_Damage', 'Recovery_Amount', 'Show_Cause_Issued', 'Explanation_Heard_By', 'Installments_Count', 'First_Month_Year',
  'Last_Month_Year', 'Recovery_Complete_Date', 'Date', 'Time', 'Place', 'Accident_Cause', 'Injury_Nature', 'Injured_Person_Activity',
  'Notice_Given_Name', 'Witness_Name', 'Witness_Address', 'Witness_Occupation', 'Injured_Return_Date', 'Injured_Absent_Days',
  'Fine_Offence_Nature', 'Fine_Offence_Date', 'Fine_Show_Cause_Date', 'Fine_Realised_Date', 'Fine_Amount', 'Fine_heardBY',
  'Deduction_Amount', 'Loss_Caused', 'Deduction_Show_Cause_Date', 'Deduction_Date', 'Deduction_Installments', 'Deduction_Realised_Date',
  'Overtime_from', 'Overtime_To', 'Overtime_Date', 'Overtime_Extent', 'Overtime_Total', 'Normal_Hours', 'Normal_Rate',
  'Overtime_Rate', 'Normal_Earnings', 'Overtime_Earnings', 'Total_Earnings', 'Overtime_Payment_Date', 'Advance_Amount',
  'Advance_Date', 'Advance_Purpose', 'Advance_Installments', 'Advance_Postponements', 'Advance_Repaid_Date', 'Advance_Repaid_Amount',
  'Day1', 'Day2', 'Day3', 'Day4', 'Day5', 'Day6', 'Day7', 'Day8', 'Day9', 'Day10', 'Day11', 'Day12', 'Day13', 'Day14', 'Day15',
  'Day16', 'Day17', 'Day18', 'Day19', 'Day20', 'Day21', 'Day22', 'Day23', 'Day24', 'Day25', 'Day26', 'Day27', 'Day28', 'Day29', 'Day30', 'Day31',
  'Date_of_Application', 'Leave_starts_From', 'TO_Leave', 'Annual_Leave', 'Paternity_Leave', 'Sick_Leaves', 'Casual_Leaves',
  'Privilieged_Leaves', 'if_Leave_Refuses', 'Reason_LeaveRefuses', 'Previous_Balance_Leave', 'Credit_Leave', 'Earned_Leave',
  'Nature_of_Leave', 'Total_Leave', 'Balance_Leave', 'Maternity', 'Maternity_Leave_Type', 'Maternity_From', 'Maternity_To',
  'Date_Women_notice_Under_Sec6', 'Date_of_Discharge', 'Date_proofof_pregnancy', 'Birth_date_of_child', 'Date_of_Miscarriage',
  'Date_of_illness', 'Date_and_Amount_inadvance_Delievery', 'Date_and_Amount_for_maternity_Beneift', 'Amount_ifpaid_section8',
  'Amountof_wages_Paid_section9', 'Amountof_wages_Paidleave_section10', 'Nominated_person', 'Women_dies_Date_and_beneift_person',
  'if_mother_dies_child_survive_beneift', 'Deduction_Incentive', 'Holiday_List', 'Holiday_Day', 'Holiday_Date',
  'Earned_Statutory_Bonus', 'Earned_Medical', 'Name_of_Employer', 'SiteCode', 'ComplianceCategory', 'Years', 'Insurance_No', 'Payment_Date'
];
const BACKEND_FIELD_KEYS = ['contractor', 'employer', 'site', 'siteCode', 'state', 'month', 'year', 'financialYear', 'recordCount', 'generatedOn'];

const FREQUENCY_CHOICES = ['Monthly', 'Quarterly', 'Half Yearly', 'Yearly'];

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Central', 'Chhattisgarh', 'Goa', 'Gujarat',
  'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh',
  'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan',
  'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi',
  'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
];

// Standard CLRA form/register codes (from the PAN-India register library).
const FORM_CODES = [
  'FORM I', 'FORM II', 'FORM III', 'FORM IV', 'FORM V', 'FORM VI', 'FORM VI A', 'FORM VI-B',
  'FORM VII', 'FORM VIII', 'FORM IX', 'FORM X', 'FORM XI', 'FORM XII', 'FORM XIII', 'FORM XIV',
  'FORM XV', 'FORM XVI', 'FORM XVII', 'FORM XVIII', 'FORM XIX', 'FORM XX', 'FORM XXI', 'FORM XXII',
  'FORM XXIII', 'FORM XXIV', 'FORM XXV', 'FORM XXVI', 'FORM XXVII', 'FORM XXVIII', 'FORM XXIX',
  'Form A', 'Form B', 'Form C', 'Form D',
];

function blankField(over = {}): FormField {
  return {
    section: 'General', label: '', dataType: 'text', dataSource: 'master',
    sourceField: '', mandatory: false, readOnly: false, signature: false, approval: false,
    ...over,
  };
}

function draftFromRow(row: TemplateRow): BuilderDraft {
  return {
    id: row.id, state: row.state, formCode: row.formCode, title: row.title,
    templateType: row.templateType || 'register', status: row.status || 'draft',
    act: row.act || '', frequency: row.frequency || '',
    criticality: row.criticality || '', isMandatory: row.isMandatory ?? false,
    outputFormat: row.outputFormat || (row.templateType === 'register' ? 'xlsx' : 'pdf'),
    sourceFormat: row.sourceFormat || 'html',
    columns: row.columns, columnInput: '',
    fields: (row.fields || []).map(f => ({ ...blankField(), ...f })),
    html: row.html || '',
    perRow: row.perRow ?? false,
    fieldMappings: row.fieldMappings ?? [],
    calcRules: row.calculationRules ?? [],
    aiChecks: row.aiChecks ?? [],
  };
}

function blankDraft(): BuilderDraft {
  return {
    id: null, state: '', formCode: '', title: '', templateType: 'register',
    status: 'draft', act: '', frequency: '', criticality: '', isMandatory: false,
    outputFormat: 'xlsx',
    sourceFormat: 'html',
    columns: [], columnInput: '',
    fields: [], html: '', perRow: false,
    fieldMappings: [], calcRules: [], aiChecks: [],
  };
}

const DOC_STARTER = [
  '<h1>{{TITLE}}</h1>',
  '<div class="sub">{{FORM_CODE}} &middot; {{STATE}}</div>',
  '<p>Contractor: {{CONTRACTOR_NAME}} &nbsp;&middot;&nbsp; Site: {{SITE_NAME}} ({{SITE_CODE}})</p>',
  '<p>Wage period: {{MONTH}} {{YEAR}}</p>',
  '<p><br></p>',
  '<p style="display:flex;justify-content:space-between"><span>Authorised Signatory: ____________________</span><span>Date: ____________________</span></p>',
].join('');

const FORM_XV_STARTER = `
<div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; color: #111; line-height: 1.6;">
  <div style="text-align: center; margin-bottom: 20px;">
    <h2 style="font-size: 16px; font-weight: bold; margin: 0; text-transform: uppercase;">FORM XV</h2>
    <div style="font-size: 12px; font-weight: bold; margin-top: 4px;">[See Rule 75]</div>
    <h1 style="font-size: 18px; font-weight: bold; margin: 8px 0;">EMPLOYMENT CARD</h1>
  </div>

  <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 20px;">
    <tr>
      <td style="padding: 4px 0; width: 45%; vertical-align: top;">Name and address of Contractor:</td>
      <td style="padding: 4px 0; border-bottom: 1px dotted #444; font-weight: bold;">{{Name_of_contractor}}, {{Address_of_contractor}}</td>
    </tr>
    <tr>
      <td style="padding: 4px 0; vertical-align: top;">Name and address of establishment in/under which contract is carried on:</td>
      <td style="padding: 4px 0; border-bottom: 1px dotted #444; font-weight: bold;">{{Name_of_Employer}}, {{Branch_Address}}</td>
    </tr>
    <tr>
      <td style="padding: 4px 0; vertical-align: top;">Nature and location of work:</td>
      <td style="padding: 4px 0; border-bottom: 1px dotted #444; font-weight: bold;">{{Nature_ofWork_contractor}}, {{Location}}</td>
    </tr>
    <tr>
      <td style="padding: 4px 0; vertical-align: top;">Name and address of the workman:</td>
      <td style="padding: 4px 0; border-bottom: 1px dotted #444; font-weight: bold;">{{Employee_Name}}, {{Address}}</td>
    </tr>
    <tr>
      <td style="padding: 4px 0; vertical-align: top;">Age or Date of Birth:</td>
      <td style="padding: 4px 0; border-bottom: 1px dotted #444; font-weight: bold;">{{Age}} / {{Date_of_Birth}}</td>
    </tr>
    <tr>
      <td style="padding: 4px 0; vertical-align: top;">Identification Marks:</td>
      <td style="padding: 4px 0; border-bottom: 1px dotted #444; font-weight: bold;">{{Identity_Marks}}</td>
    </tr>
    <tr>
      <td style="padding: 4px 0; vertical-align: top;">Father’s / Husband’s Name:</td>
      <td style="padding: 4px 0; border-bottom: 1px dotted #444; font-weight: bold;">{{Father_Name}}</td>
    </tr>
    <tr>
      <td style="padding: 4px 0; vertical-align: top;">Name and address of establishment in/under which contract is carried on:</td>
      <td style="padding: 4px 0; border-bottom: 1px dotted #444; font-weight: bold;">{{Name_of_Employer}}, {{Branch_Address}}</td>
    </tr>
    <tr>
      <td style="padding: 4px 0; vertical-align: top;">Name and address of Principal Employer:</td>
      <td style="padding: 4px 0; border-bottom: 1px dotted #444; font-weight: bold;">{{Name_of_Employer}}</td>
    </tr>
  </table>

  <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 15px; text-align: center;" border="1">
    <thead>
      <tr style="background-color: #f1f5f9;">
        <th style="padding: 8px; border: 1px solid #000; width: 8%;" rowspan="2">Sl. No.</th>
        <th style="padding: 8px; border: 1px solid #000;" colspan="2">Total period for which employed</th>
        <th style="padding: 8px; border: 1px solid #000; width: 22%;" rowspan="2">Nature of work done</th>
        <th style="padding: 8px; border: 1px solid #000; width: 28%;" rowspan="2">Rate of wages (with particulars of unit in case of Piece work)</th>
        <th style="padding: 8px; border: 1px solid #000; width: 14%;" rowspan="2">Remarks</th>
      </tr>
      <tr style="background-color: #f1f5f9;">
        <th style="padding: 6px; border: 1px solid #000; width: 14%;">From</th>
        <th style="padding: 6px; border: 1px solid #000; width: 14%;">To</th>
      </tr>
      <tr style="background-color: #e2e8f0; font-weight: bold;">
        <td style="border: 1px solid #000; padding: 4px;">1</td>
        <td style="border: 1px solid #000; padding: 4px;">2</td>
        <td style="border: 1px solid #000; padding: 4px;">3</td>
        <td style="border: 1px solid #000; padding: 4px;">4</td>
        <td style="border: 1px solid #000; padding: 4px;">5</td>
        <td style="border: 1px solid #000; padding: 4px;">6</td>
      </tr>
    </thead>
    <tbody>
      {{#rows}}
      <tr>
        <td style="border: 1px solid #000; padding: 8px;">{{sl}}</td>
        <td style="border: 1px solid #000; padding: 8px;">{{Date_Of_Joining}}</td>
        <td style="border: 1px solid #000; padding: 8px;">{{Date_Of_Leaving}}</td>
        <td style="border: 1px solid #000; padding: 8px;">{{Designation}}</td>
        <td style="border: 1px solid #000; padding: 8px;">{{Fixed_Basic_Wages}}</td>
        <td style="border: 1px solid #000; padding: 8px;">{{Remarks}}</td>
      </tr>
      {{/rows}}
    </tbody>
  </table>

  <div style="margin-top: 40px; text-align: right; font-size: 12px; font-weight: bold;">
    <span>Signature ____________________</span>
  </div>
</div>
`;

const FORM_XXII_STARTER = `
<div style="font-family: Arial, sans-serif; max-width: 950px; margin: 0 auto; padding: 20px; color: #111; line-height: 1.5;">
  <div style="text-align: center; margin-bottom: 24px;">
    <h1 style="font-size: 20px; font-weight: bold; margin: 0; text-transform: uppercase;">FORM XXII</h1>
    <div style="font-size: 13px; font-weight: bold; margin-top: 4px;">[See rule 78 (1)(a)(ii)]</div>
    <h2 style="font-size: 16px; font-weight: bold; margin: 6px 0;">Register of Advances</h2>
  </div>

  <div style="font-size: 12px; margin-bottom: 20px; line-height: 1.8;">
    <p><b>1. Name and Address of Contractor:</b> <span style="border-bottom: 1px dotted #333; font-weight: bold; padding-bottom: 2px;">{{Name_of_contractor}}, {{Address_of_contractor}}</span></p>
    <p><b>2. Name and Address of establishment in/under which contract is carried on:</b> <span style="border-bottom: 1px dotted #333; font-weight: bold; padding-bottom: 2px;">{{Name_of_Employer}}, {{Branch_Address}}</span></p>
    <p><b>3. Nature and location of work:</b> <span style="border-bottom: 1px dotted #333; font-weight: bold; padding-bottom: 2px;">{{Nature_ofWork_contractor}}, {{Location}}</span></p>
    <p><b>4. Name and address of Principal Employer:</b> <span style="border-bottom: 1px dotted #333; font-weight: bold; padding-bottom: 2px;">{{Name_of_Employer}}</span></p>
  </div>

  <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 15px; text-align: center;" border="1">
    <thead>
      <tr style="background-color: #f8fafc; font-weight: bold;">
        <th style="padding: 8px; border: 1px solid #000; width: 5%;">Sl No.</th>
        <th style="padding: 8px; border: 1px solid #000; width: 14%;">Name of workmen</th>
        <th style="padding: 8px; border: 1px solid #000; width: 12%;">Father's/Husband's name</th>
        <th style="padding: 8px; border: 1px solid #000; width: 12%;">Nature of employment/Designation</th>
        <th style="padding: 8px; border: 1px solid #000; width: 11%;">Wage period and wages payable</th>
        <th style="padding: 8px; border: 1px solid #000; width: 11%;">Date and amount of advance given</th>
        <th style="padding: 8px; border: 1px solid #000; width: 11%;">Purpose(s) for which advance made</th>
        <th style="padding: 8px; border: 1px solid #000; width: 9%;">No. of instalments by which advance to be repaid</th>
        <th style="padding: 8px; border: 1px solid #000; width: 9%;">Date and amount of each instalment repaid</th>
        <th style="padding: 8px; border: 1px solid #000; width: 9%;">Date on which last instalment was repaid</th>
        <th style="padding: 8px; border: 1px solid #000; width: 7%;">Remarks</th>
      </tr>
      <tr style="background-color: #e2e8f0; font-weight: bold; font-size: 10px;">
        <td style="border: 1px solid #000; padding: 4px;">1</td>
        <td style="border: 1px solid #000; padding: 4px;">2</td>
        <td style="border: 1px solid #000; padding: 4px;">3</td>
        <td style="border: 1px solid #000; padding: 4px;">4</td>
        <td style="border: 1px solid #000; padding: 4px;">5</td>
        <td style="border: 1px solid #000; padding: 4px;">6</td>
        <td style="border: 1px solid #000; padding: 4px;">7</td>
        <td style="border: 1px solid #000; padding: 4px;">8</td>
        <td style="border: 1px solid #000; padding: 4px;">9</td>
        <td style="border: 1px solid #000; padding: 4px;">10</td>
        <td style="border: 1px solid #000; padding: 4px;">11</td>
      </tr>
    </thead>
    <tbody>
      {{#rows}}
      <tr>
        <td style="border: 1px solid #000; padding: 8px;">{{sl}}</td>
        <td style="border: 1px solid #000; padding: 8px;">{{Employee_Name}}</td>
        <td style="border: 1px solid #000; padding: 8px;">{{Father_Name}}</td>
        <td style="border: 1px solid #000; padding: 8px;">{{Designation}}</td>
        <td style="border: 1px solid #000; padding: 8px;">{{Month}} / {{Fixed_Basic_Wages}}</td>
        <td style="border: 1px solid #000; padding: 8px;">{{Advance_Date}} / {{Advance_Amount}}</td>
        <td style="border: 1px solid #000; padding: 8px;">{{Advance_Purpose}}</td>
        <td style="border: 1px solid #000; padding: 8px;">{{Advance_Installments}}</td>
        <td style="border: 1px solid #000; padding: 8px;">{{Advance_Repaid_Date}} / {{Advance_Repaid_Amount}}</td>
        <td style="border: 1px solid #000; padding: 8px;">{{Advance_Repaid_Date}}</td>
        <td style="border: 1px solid #000; padding: 8px;">{{Remarks}}</td>
      </tr>
      {{/rows}}
    </tbody>
  </table>
</div>
`;

function extractBody(html: string): string {
  if (!html) return '';
  try {
    return new DOMParser().parseFromString(html, 'text/html').body?.innerHTML ?? '';
  } catch {
    return '';
  }
}

const REGISTER_STARTER = [
  '<h1>{{TITLE}}</h1>',
  '<table><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table>',
].join('');

function htmlShell(body: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; margin: 24px; color: #111; line-height: 1.5; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  h2 { font-size: 14px; margin: 16px 0 6px; text-transform: uppercase; letter-spacing: .04em; }
  .sub { font-size: 11px; color: #555; margin-bottom: 14px; }
  p { margin: 6px 0; font-size: 12px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; margin: 10px 0; }
  th { background: #0A192F; color: #fff; }
  td, th { border: 1px solid #999; padding: 5px 7px; text-align: left; vertical-align: top; }
  .label { width: 38%; font-weight: 600; background: #f5f7fa; }
  .req { color: #b91c1c; }
  .sign-row { display: flex; justify-content: space-between; margin-top: 22px; font-size: 11px; }
  @media print { body { margin: 8mm; } }
  </style></head><body>${body}</body></html>`;
}

const getTodayFormatted = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const getTodayReadable = () => {
  return new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const getTodaySlash = () => {
  return new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const getCurrentTime = () => {
  return new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
};

const SAMPLE_TOKENS: Record<string, string> = {
  CONTRACTOR_NAME: 'Contractor Pvt Ltd', EMPLOYER_NAME: 'Principal Employer Ltd',
  SITE_NAME: 'Gurgaon Site', SITE_CODE: 'HR001', ACT: 'CLRA Act, 1970',
  MONTH: 'August', YEAR: '2026', FINANCIAL_YEAR: '2026-27',
  GENERATED_ON: getTodayFormatted(),
  TODAY_DATE: getTodayFormatted(),
  TODAY: getTodayReadable(),
  CURRENT_DATE: getTodaySlash(),
  DATE: getTodayFormatted(),
  TIME: getCurrentTime(),
  RECORD_COUNT: '3',

  // Worker BSS ID & Demographic Tokens
  'worker.bss_id': 'BSSW000001', 'worker_bssid': 'BSSW000001',
  'worker_bssid.dob': '1995-08-15', 'worker.dob': '1995-08-15',
  'worker_bssid.name': 'Rahul Kumar', 'worker.name': 'Rahul Kumar',
  'worker_bssid.gender': 'Male', 'worker.gender': 'Male',
  'worker_bssid.father_name': 'Suresh Kumar', 'worker.father_name': 'Suresh Kumar',
  'worker_bssid.mobile': '9876543210', 'worker.mobile': '9876543210',
  'worker_bssid.address': 'H.No 123, Sector 14, Gurgaon', 'worker.address': 'H.No 123, Sector 14, Gurgaon',
  'worker_bssid.uan': '100908070605', 'worker.uan': '100908070605',
  'worker_bssid.esic': '31009876543210001', 'worker.esic': '31009876543210001',
  'worker_bssid.doj': '2025-01-15', 'worker.doj': '2025-01-15',
  'worker_bssid.designation': 'Senior Mason', 'worker.designation': 'Senior Mason',
  'worker_bssid.department': 'Civil Works', 'worker.department': 'Civil Works',
  'worker_bssid.aadhaar': 'XXXX-XXXX-4321', 'worker.aadhaar': 'XXXX-XXXX-4321',

  // Contractor BSS ID & Master Tokens
  'contractor.bss_id': 'BSSC000044', 'contractor_bssid': 'BSSC000044',
  'contractor_bssid.dob': '1982-04-10', 'contractor.dob': '1982-04-10',
  'contractor_bssid.name': 'Contractor Pvt Ltd', 'contractor.name': 'Contractor Pvt Ltd',
  'contractor.code': 'CONT4444', 'contractor.pan': 'ABCDE1234F',
  'contractor.gstin': '06ABCDE1234F1Z5', 'contractor.cin': 'U74999HR2020PTC085123',
  'contractor.mobile': '9988776655', 'contractor.email': 'compliance@contractor.com',
  'contractor.address': 'Plot 45, Udyog Vihar Phase 4, Gurgaon, HR',
  'contractor.pf_code': 'GNBGN0012345000', 'contractor.esic_code': '12000345670000101',
  'contractor.license_no': 'CLRA/HR/2025/9876',

  // Employer & Site Master Tokens
  'employer.name': 'Principal Employer Ltd', 'employer.cin': 'L12345DL2010PLC200000',
  'employer.pan': 'AAACE5432G', 'employer.gstin': '07AAACE5432G1Z8',
  'employer.address': 'Cyber City, Tower B, Floor 10, Gurgaon',
  'site.name': 'Gurgaon Industrial Site', 'site.code': 'HR001',
  'site.address': 'Sector 37, Industrial Estate, Gurgaon', 'site.state': 'Haryana',
  'site.manager': 'Amit Verma',
};

const SYS_SAMPLE: Record<string, string> = {
  contractor: 'Contractor Pvt Ltd', employer: 'Principal Employer Ltd', site: 'Gurgaon Site',
  siteCode: 'HR001', state: 'Haryana', month: 'August', year: '2026',
  financialYear: '2026-27', recordCount: '3',
  generatedOn: getTodayFormatted(),
  todayDate: getTodayFormatted(),
  today: getTodayReadable(),
  currentDate: getTodaySlash(),
  date: getTodayFormatted(),
  time: getCurrentTime(),
  ...SAMPLE_TOKENS,
};

const ROW_SAMPLE: Record<string, string> = {
  sl: '1', name: 'Rahul Kumar', bssId: 'BSSW000001', fatherName: 'Suresh Kumar', gender: 'Male',
  designation: 'Mason', department: 'Civil', doj: '2025-01-15', mobile: '98XXXXXX01',
  site: 'HR001', location: 'Gurgaon', grossWages: '13000', basicWages: '9000',
  totalDeductions: '1000', netSalary: '12000', daysWorked: '26', otHours: '10', otRate: '50', otEarnings: '500',
  ...SAMPLE_TOKENS,
};

function sampleHeadRows(columns: string[], mappings: FieldMapping[]): { head: string; rows: string } {
  const esc = (v: string) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const head = columns.map(c => `<th>${esc(c)}</th>`).join('');
  const chip = (val: string) => `<span style="background:#e0f2fe;color:#0369a1;padding:1px 6px;border-radius:4px;font-family:monospace;font-size:11px;font-weight:600;border:1px solid #bae6fd;display:inline-block;">[${esc(val)}]</span>`;
  const sample = columns.map(col => {
    const key = mappings.find(m => m.column === col)?.fieldKey || '';
    if (key === 'sl') return '1';
    if (key.startsWith('backend:')) return chip(key.slice('backend:'.length));
    return key ? chip(key) : '—';
  });
  const rows = [1, 2, 3].map(() => '<tr>' + sample.map(v => `<td>${v}</td>`).join('') + '</tr>').join('');
  return { head, rows };
}

// Fill data placeholders for a live preview: {{#rows}} blocks, {{sys.key}},
// bare master-file {{fieldKey}}, then the uppercase {{TOKENS}}.
function renderPreview(mode: 'doc' | 'register', body: string, b: BuilderDraft): string {
  let rawContent = body && body.trim() ? body : (mode === 'register' ? REGISTER_STARTER : DOC_STARTER);
  // Per-worker documents repeat once per master row (no explicit {{#rows}} block).
  if (b.perRow && !/\{\{#\s*rows\s*\}\}/i.test(rawContent)) {
    rawContent = `{{#rows}}\n${rawContent}\n<div style="page-break-after:always" aria-hidden="true"></div>\n{{/rows}}`;
  }
  let out = rawContent;

  const tokens: Record<string, string> = {
    TITLE: b.title || b.formCode || '{{TITLE}}',
    FORM_CODE: b.formCode || '{{FORM_CODE}}',
    STATE: b.state || '{{STATE}}',
    ACT: b.act || '{{ACT}}',
    TODAY_DATE: getTodayFormatted(),
    TODAY: getTodayReadable(),
    CURRENT_DATE: getTodaySlash(),
    DATE: getTodayFormatted(),
    TIME: getCurrentTime(),
    GENERATED_ON: getTodayFormatted(),
  };
  if (mode === 'register') {
    const { head, rows } = sampleHeadRows(b.columns, b.fieldMappings);
    tokens.HEAD = head || '<th>Column Header</th>';
    tokens.ROWS = rows || '<tr><td>Column Data</td></tr>';
  }
  for (const [key, value] of Object.entries(tokens)) {
    out = out.replaceAll(`{{${key}}}`, value).replaceAll(`{{ ${key} }}`, value);
  }

  const fieldVal = (k: string) => {
    let val = `[${k.replace(/_/g, ' ')}]`;
    if (k.startsWith('sys.')) val = SYS_SAMPLE[k.slice(4)] ?? `[${k.slice(4)}]`;
    else if (ROW_SAMPLE[k]) val = ROW_SAMPLE[k];
    else if (SAMPLE_TOKENS[k]) val = SAMPLE_TOKENS[k];
    return `<span style="background:#e0f2fe;color:#0369a1;padding:1px 5px;border-radius:4px;font-family:monospace;font-size:11px;font-weight:600;border:1px solid #bae6fd;display:inline;vertical-align:baseline;">${val}</span>`;
  };

  out = out.replace(/\{\{#\s*rows\s*\}\}([\s\S]*?)\{\{\s*\/\s*rows\s*\}\}/gi,
    (_m, inner: string) => [1, 2, 3].map(() => inner.replace(/\{\{\s*([\w.]+)\s*\}\}/g,
      (_x: string, k: string) => fieldVal(k))).join(''));

  out = out.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (m: string, k: string) => fieldVal(k));

  return htmlShell(out);
}

// Searchable variable picker: an interactive combobox with floating filtered dropdown menu.
type PickerOption = { value: string; label: string; category?: 'master_list' | 'master_entity' | 'master_column' | 'self_contractor' | 'system' };

function SearchableSelect({ value, options, onSelect, placeholder = 'Search…', width = 'w-44' }: {
  value?: string; options: PickerOption[]; onSelect: (value: string) => void; placeholder?: string; width?: string;
}) {
  const [q, setQ] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setDropUp(spaceBelow < 240);
    }
  }, [isOpen]);

  const selectedOpt = options.find(o => o.value === value);
  const term = q.toLowerCase().trim();
  const matches = term
    ? options.filter(o => o.label.toLowerCase().includes(term) || o.value.toLowerCase().includes(term))
    : options;

  const masterColumnMatches = matches.filter(o => o.category === 'master_column' || o.category === 'master_list');
  const masterEntityMatches = matches.filter(o => o.category === 'master_entity');
  const selfContractorMatches = matches.filter(o => o.category === 'self_contractor');
  const systemMatches = matches.filter(o => o.category === 'system' || !o.category);

  const displayVal = isOpen ? q : (selectedOpt ? selectedOpt.label : (value || ''));

  return (
    <div ref={containerRef} className="relative inline-block text-xs text-slate-800">
      <div className="relative flex items-center">
        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
        <input
          type="text"
          value={displayVal}
          onFocus={() => {
            if (typeof window !== 'undefined') {
              const sel = window.getSelection();
              if (sel && sel.rangeCount > 0) {
                // Keep active selection snapshot
              }
            }
            setIsOpen(true);
            setQ('');
          }}
          onChange={e => { setQ(e.target.value); setIsOpen(true); }}
          placeholder={placeholder}
          className={`h-8 border border-slate-300 rounded-lg pl-7 pr-6 text-xs bg-white focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-500 font-mono ${width}`}
        />
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 font-bold text-[10px]"
        >
          {isOpen ? '▲' : '▼'}
        </button>
      </div>

      {isOpen && (
        <div className={`absolute z-[9999] left-0 ${dropUp ? 'bottom-full mb-1' : 'top-full mt-1'} w-84 max-h-72 overflow-y-auto bg-white border border-slate-300 rounded-lg shadow-2xl divide-y divide-slate-100`}>
          {matches.length === 0 ? (
            <div className="p-2.5 text-slate-400 text-[11px] italic text-center">No matching tokens found</div>
          ) : (
            <div className="py-1">
              {/* 1. Master Sheet Columns */}
              {masterColumnMatches.length > 0 && (
                <div>
                  <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-900 bg-blue-50 border-y border-blue-200 sticky top-0 backdrop-blur-xs">
                    📊 Master Sheet Columns ({masterColumnMatches.length})
                  </div>
                  {masterColumnMatches.map(o => (
                    <div
                      key={o.value}
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => {
                        onSelect(o.value);
                        setQ('');
                        setIsOpen(false);
                      }}
                      className={`p-2 hover:bg-blue-50 cursor-pointer transition-colors flex flex-col gap-0.5 ${o.value === value ? 'bg-blue-50/90 font-bold text-blue-900 border-l-2 border-blue-600' : 'text-slate-800'}`}
                    >
                      <span className="font-mono text-[11px] font-semibold text-blue-700">{o.value}</span>
                      {o.label !== o.value && (
                        <span className="text-[10px] text-slate-500">{o.label}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* 2. Master BSS ID Lookups (master_col_bss) */}
              {masterEntityMatches.length > 0 && (
                <div>
                  <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-900 bg-emerald-50 border-y border-emerald-200 sticky top-0 backdrop-blur-xs">
                    🔗 Master BSS ID Lookups (master_col_bss) ({masterEntityMatches.length})
                  </div>
                  {masterEntityMatches.map(o => (
                    <div
                      key={o.value}
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => {
                        onSelect(o.value);
                        setQ('');
                        setIsOpen(false);
                      }}
                      className={`p-2 hover:bg-emerald-50 cursor-pointer transition-colors flex flex-col gap-0.5 ${o.value === value ? 'bg-emerald-50/90 font-bold text-emerald-900 border-l-2 border-emerald-600' : 'text-slate-800'}`}
                    >
                      <span className="font-mono text-[11px] font-semibold text-emerald-700">{o.value}</span>
                      {o.label !== o.value && (
                        <span className="text-[10px] text-slate-500">{o.label}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* 3. Logged-In Contractor Session Tokens (self.*) */}
              {selfContractorMatches.length > 0 && (
                <div>
                  <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-purple-900 bg-purple-50 border-y border-purple-200 sticky top-0 backdrop-blur-xs">
                    👤 Logged-In Contractor Session (self.*) ({selfContractorMatches.length})
                  </div>
                  {selfContractorMatches.map(o => (
                    <div
                      key={o.value}
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => {
                        onSelect(o.value);
                        setQ('');
                        setIsOpen(false);
                      }}
                      className={`p-2 hover:bg-purple-50 cursor-pointer transition-colors flex flex-col gap-0.5 ${o.value === value ? 'bg-purple-50/90 font-bold text-purple-900 border-l-2 border-purple-600' : 'text-slate-800'}`}
                    >
                      <span className="font-mono text-[11px] font-semibold text-purple-700">{o.value}</span>
                      {o.label !== o.value && (
                        <span className="text-[10px] text-slate-500">{o.label}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* 3. Operational System Tokens */}
              {systemMatches.length > 0 && (
                <div>
                  <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-indigo-900 bg-indigo-50 border-y border-indigo-200 sticky top-0 backdrop-blur-xs">
                    ⚙️ Operational System Tokens ({systemMatches.length})
                  </div>
                  {systemMatches.map(o => (
                    <div
                      key={o.value}
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => {
                        onSelect(o.value);
                        setQ('');
                        setIsOpen(false);
                      }}
                      className={`p-2 hover:bg-indigo-50/50 cursor-pointer transition-colors flex flex-col gap-0.5 ${o.value === value ? 'bg-indigo-50/90 font-bold text-indigo-900 border-l-2 border-indigo-600' : 'text-slate-800'}`}
                    >
                      <span className="font-mono text-[11px] font-semibold text-indigo-700">{o.value}</span>
                      {o.label !== o.value && (
                        <span className="text-[10px] text-slate-500">{o.label}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Advanced Interactive Document & Spreadsheet Studio Suite
function AdvancedStudioEditor({ mode, initialHtml, draft, fieldKeys, backendKeys, onChange, onPatchDraft }: {
  mode: 'doc' | 'register'; initialHtml: string; draft: BuilderDraft;
  fieldKeys: string[]; backendKeys: string[];
  onChange: (html: string) => void;
  onPatchDraft: (key: keyof BuilderDraft, value: unknown) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const seeded = useRef(false);
  const [tab, setTab] = useState<'visual' | 'code'>('visual');
  const [zoom, setZoom] = useState<'100' | '125' | '75'>('100');
  const defaultStarter = mode === 'register'
    ? REGISTER_STARTER
    : (draft.formCode === 'FORM XXII' || draft.title?.toUpperCase().includes('ADVANCE') || draft.title?.toUpperCase().includes('FORM XXII')
        ? FORM_XXII_STARTER
        : (draft.formCode === 'FORM XV' || draft.title?.toUpperCase().includes('FORM XV') ? FORM_XV_STARTER : DOC_STARTER));
  const [body, setBody] = useState(() => extractBody(initialHtml) || defaultStarter);
  const [foreColor, setForeColor] = useState('#111827');
  const [selectedCol, setSelectedCol] = useState<number | null>(0);

  useEffect(() => {
    if (seeded.current) return;
    seeded.current = true;
    if (ref.current) ref.current.innerHTML = body;
    onChange(htmlShell(body));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (tab === 'visual' && ref.current) ref.current.innerHTML = body;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const savedRangeRef = useRef<Range | null>(null);

  function saveSelection() {
    if (typeof window === 'undefined') return;
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && ref.current?.contains(sel.anchorNode)) {
      savedRangeRef.current = sel.getRangeAt(0);
    }
  }

  useEffect(() => {
    function handleSelectionChange() {
      if (typeof window === 'undefined') return;
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0 && ref.current?.contains(sel.anchorNode)) {
        savedRangeRef.current = sel.getRangeAt(0);
      }
    }
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, []);

  function restoreSelection() {
    if (typeof window === 'undefined' || !ref.current) return;
    const sel = window.getSelection();
    if (!sel) return;
    let range: Range | null = null;
    if (sel && sel.rangeCount > 0) {
      const r = sel.getRangeAt(0);
      if (r.startContainer && r.startContainer.isConnected && ref.current.contains(r.startContainer)) {
        range = r;
      }
    }
    if (!range) {
      const saved = savedRangeRef.current;
      if (saved && saved.startContainer && saved.startContainer.isConnected && ref.current.contains(saved.startContainer)) {
        range = saved;
      }
    }
    if (!range) {
      range = document.createRange();
      range.selectNodeContents(ref.current);
      range.collapse(false);
    }
    sel.removeAllRanges();
    sel.addRange(range);
    savedRangeRef.current = range;
  }

  function highlightTokensForCanvas(html: string): string {
    if (!html) return '';
    return html.replace(/<span[^>]*contenteditable=["']false["'][^>]*>(\{\{[^}]+\}\})<\/span>|(\{\{[^}]+\}\})/gi, (match, badgeToken, rawToken) => {
      const tok = badgeToken || rawToken;
      if (!tok || tok.toLowerCase().includes('logourl')) return match;
      return `<span style="background:#0284c7;color:#ffffff;padding:2px 7px;border-radius:12px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;font-weight:700;letter-spacing:0.3px;display:inline-block;vertical-align:baseline;box-shadow:0 1px 2px rgba(0,0,0,0.1);" contenteditable="false">${tok}</span>`;
    });
  }

  function cleanHtmlForExport(html: string): string {
    return html.replace(/<span[^>]*contenteditable=["']false["'][^>]*>(\{\{[^}]+\}\})<\/span>/gi, '$1');
  }

  const hasCanvas = mode === 'doc';

  useEffect(() => {
    if (tab === 'visual' && ref.current && hasCanvas) {
      const highlighted = highlightTokensForCanvas(body);
      if (ref.current.innerHTML !== highlighted) {
        ref.current.innerHTML = highlighted;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  function commit(next: string, syncCanvas = true) {
    setBody(next);
    if (syncCanvas && hasCanvas && tab === 'visual' && ref.current && ref.current.innerHTML !== next) {
      ref.current.innerHTML = highlightTokensForCanvas(next);
    }
    onChange(htmlShell(cleanHtmlForExport(next)));
  }

  function emitRich() {
    const raw = ref.current?.innerHTML ?? '';
    commit(raw, false);
  }

  function cmd(command: string, value?: string) {
    if (!hasCanvas || !ref.current) return;
    restoreSelection();
    ref.current.focus();
    document.execCommand(command, false, value);
    saveSelection();
    emitRich();
  }

  function badgeSpan(tok: string): string {
    return `<span style="background:#0284c7;color:#ffffff;padding:2px 7px;border-radius:12px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;font-weight:700;letter-spacing:0.3px;display:inline-block;vertical-align:baseline;box-shadow:0 1px 2px rgba(0,0,0,0.1);" contenteditable="false">${tok}</span>&nbsp;`;
  }

  function docTokenAtCaret(tok: string): boolean {
    const canvas = ref.current;
    const sel = window.getSelection();
    if (!canvas || !sel) return false;
    restoreSelection();
    const range = sel.rangeCount > 0 && sel.getRangeAt(0).startContainer.isConnected && canvas.contains(sel.getRangeAt(0).startContainer)
      ? sel.getRangeAt(0)
      : null;
    if (!range) return false;
    const div = document.createElement('div');
    div.innerHTML = badgeSpan(tok);
    const node = div.firstElementChild;
    if (!node) return false;
    range.deleteContents();
    range.insertNode(node);
    const caret = document.createRange();
    caret.setStartAfter(node);
    caret.collapse(true);
    sel.removeAllRanges();
    sel.addRange(caret);
    savedRangeRef.current = caret;
    emitRich();
    return true;
  }

  function insertToken(tok: string) {
    if (hasCanvas && tab === 'visual' && ref.current) {
      if (tok.toLowerCase().includes('logourl')) {
        cmd('insertHTML', `<img src="{{logoUrl}}" alt="Logo" style="max-height:50px;width:auto;display:inline-block;vertical-align:middle;margin:4px 8px 4px 0;" />&nbsp;`);
        return;
      }
      if (docTokenAtCaret(tok)) return;
      ref.current.focus();
      restoreSelection();
      cmd('insertHTML', badgeSpan(tok));
      return;
    }
    // Excel visual / code tab: insert into the body text (keep the table last).
    if (mode === 'register') {
      const idx = body.indexOf('<table');
      commit(idx !== -1 ? body.slice(0, idx) + tok + body.slice(idx) : body + tok);
      return;
    }
    commit(body + tok);
  }

  const toolBtn = 'h-7 px-2 rounded border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-100 flex items-center justify-center bg-white shadow-xs';
  const tabBtn = (active: boolean) => `h-7 px-3 rounded text-xs font-bold transition-all ${active ? 'bg-[#073B67] text-white shadow-xs' : 'text-gray-600 hover:bg-gray-100'}`;
  const tokens = [
    '{{TITLE}}', '{{FORM_CODE}}', '{{STATE}}',
    '{{TODAY_DATE}}', '{{TODAY}}', '{{CURRENT_DATE}}', '{{DATE}}', '{{TIME}}',
    '{{CONTRACTOR_NAME}}', '{{EMPLOYER_NAME}}', '{{SITE_NAME}}', '{{SITE_CODE}}',
    '{{MONTH}}', '{{YEAR}}', '{{FINANCIAL_YEAR}}', '{{GENERATED_ON}}', '{{RECORD_COUNT}}'
  ];

  const systemTokenOptions: PickerOption[] = [
    // Operational System Tokens
    { value: '{{TODAY_DATE}}', label: '{{TODAY_DATE}} · Today (YYYY-MM-DD)', category: 'system' },
    { value: '{{TODAY}}', label: '{{TODAY}} · Today (DD MMM YYYY)', category: 'system' },
    { value: '{{CURRENT_DATE}}', label: '{{CURRENT_DATE}} · Today (DD/MM/YYYY)', category: 'system' },
    { value: '{{DATE}}', label: '{{DATE}} · Current Date', category: 'system' },
    { value: '{{TIME}}', label: '{{TIME}} · Current Time', category: 'system' },
    { value: '{{GENERATED_ON}}', label: '{{GENERATED_ON}} · Generation Date', category: 'system' },
    { value: '{{MONTH}}', label: '{{MONTH}} · Current Month', category: 'system' },
    { value: '{{YEAR}}', label: '{{YEAR}} · Current Year', category: 'system' },
    { value: '{{FINANCIAL_YEAR}}', label: '{{FINANCIAL_YEAR}} · Financial Year', category: 'system' },

    // BSS ID System Lookup Tokens (master_col_bss concept — CLRA resolution engine)
    { value: '{{master_col_bss.contractor_name}}', label: '{{master_col_bss.contractor_name}} · Contractor Company Name', category: 'master_entity' },
    { value: '{{master_col_bss.contractor_bssid}}', label: '{{master_col_bss.contractor_bssid}} · Contractor BSS ID', category: 'master_entity' },
    { value: '{{master_col_bss.contractor_address}}', label: '{{master_col_bss.contractor_address}} · Contractor Registered Address', category: 'master_entity' },
    { value: '{{master_col_bss.contractor_license_no}}', label: '{{master_col_bss.contractor_license_no}} · Contractor CLRA License Number', category: 'master_entity' },
    { value: '{{master_col_bss.contractor_pf_code}}', label: '{{master_col_bss.contractor_pf_code}} · Contractor PF Establishment Code', category: 'master_entity' },
    { value: '{{master_col_bss.contractor_esic_code}}', label: '{{master_col_bss.contractor_esic_code}} · Contractor ESIC Code Number', category: 'master_entity' },
    { value: '{{master_col_bss.contractor_pan}}', label: '{{master_col_bss.contractor_pan}} · Contractor PAN Number', category: 'master_entity' },

    { value: '{{master_col_bss.employer_name}}', label: '{{master_col_bss.employer_name}} · Principal Employer Name', category: 'master_entity' },
    { value: '{{master_col_bss.employer_bssid}}', label: '{{master_col_bss.employer_bssid}} · Employer BSS ID', category: 'master_entity' },
    { value: '{{master_col_bss.employer_address}}', label: '{{master_col_bss.employer_address}} · Employer Address', category: 'master_entity' },
    { value: '{{master_col_bss.employer_cin}}', label: '{{master_col_bss.employer_cin}} · Employer Corporate CIN', category: 'master_entity' },

    { value: '{{master_col_bss.site_name}}', label: '{{master_col_bss.site_name}} · Work Site Name', category: 'master_entity' },
    { value: '{{master_col_bss.site_code}}', label: '{{master_col_bss.site_code}} · Work Site Code', category: 'master_entity' },
    { value: '{{master_col_bss.site_address}}', label: '{{master_col_bss.site_address}} · Work Site Address', category: 'master_entity' },
    { value: '{{master_col_bss.site_state}}', label: '{{master_col_bss.site_state}} · Work Site State', category: 'master_entity' },

    { value: '{{master_col_bss.worker_name}}', label: '{{master_col_bss.worker_name}} · Worker Full Name', category: 'master_entity' },
    { value: '{{master_col_bss.worker_bssid}}', label: '{{master_col_bss.worker_bssid}} · Worker BSS ID', category: 'master_entity' },
    { value: '{{master_col_bss.worker_dob}}', label: '{{master_col_bss.worker_dob}} · Worker Date of Birth', category: 'master_entity' },
    { value: '{{master_col_bss.worker_gender}}', label: '{{master_col_bss.worker_gender}} · Worker Gender', category: 'master_entity' },
    { value: '{{master_col_bss.worker_father_name}}', label: '{{master_col_bss.worker_father_name}} · Worker Father/Spouse Name', category: 'master_entity' },
    { value: '{{master_col_bss.worker_mobile}}', label: '{{master_col_bss.worker_mobile}} · Worker Mobile Number', category: 'master_entity' },
    { value: '{{master_col_bss.worker_uan}}', label: '{{master_col_bss.worker_uan}} · Worker UAN Number', category: 'master_entity' },
    { value: '{{master_col_bss.worker_esic}}', label: '{{master_col_bss.worker_esic}} · Worker ESIC IP Number', category: 'master_entity' },
    { value: '{{master_col_bss.worker_designation}}', label: '{{master_col_bss.worker_designation}} · Worker Designation / Trade', category: 'master_entity' },
    { value: '{{master_col_bss.worker_doj}}', label: '{{master_col_bss.worker_doj}} · Worker Date of Joining', category: 'master_entity' },

    // Logged-In Contractor Session Tokens (self.* concept — current contractor user context)
    { value: '{{self.bss_id}}', label: '{{self.bss_id}} · Current Contractor BSS ID (Logged-in)', category: 'self_contractor' },
    { value: '{{self.name}}', label: '{{self.name}} · Current Contractor Name (Logged-in)', category: 'self_contractor' },
    { value: '{{self.company_name}}', label: '{{self.company_name}} · Current Contractor Company Name', category: 'self_contractor' },
    { value: '{{self.license_no}}', label: '{{self.license_no}} · Current Contractor CLRA License No.', category: 'self_contractor' },
    { value: '{{self.pan}}', label: '{{self.pan}} · Current Contractor PAN Number', category: 'self_contractor' },
    { value: '{{self.gstin}}', label: '{{self.gstin}} · Current Contractor GSTIN Number', category: 'self_contractor' },
    { value: '{{self.email}}', label: '{{self.email}} · Current Contractor Email Address', category: 'self_contractor' },
    { value: '{{self.mobile}}', label: '{{self.mobile}} · Current Contractor Mobile Number', category: 'self_contractor' },
    { value: '{{self.address}}', label: '{{self.address}} · Current Contractor Registered Address', category: 'self_contractor' },
    { value: '{{self.pf_code}}', label: '{{self.pf_code}} · Current Contractor PF Establishment Code', category: 'self_contractor' },
    { value: '{{self.esic_code}}', label: '{{self.esic_code}} · Current Contractor ESIC Code', category: 'self_contractor' },
  ];

  const allTokenOptions: PickerOption[] = [
    ...systemTokenOptions,
    ...fieldKeys.map(k => ({ value: `{{${k}}}`, label: `{{${k}}}`, category: 'master_column' as const })),
  ];

  const [tokenSearch, setTokenSearch] = useState('');
  const filteredTokens = fieldKeys.filter(k => k.toLowerCase().includes(tokenSearch.toLowerCase().trim()));

  // Inline popovers / forms state (replacing native browser prompts)
  const [showAddTitle, setShowAddTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(draft.title || draft.formCode || '');
  const [subtitleInput, setSubtitleInput] = useState('');
  const [showAddKv, setShowAddKv] = useState(false);
  const [kvKeyInput, setKvKeyInput] = useState('');
  const [kvValInput, setKvValInput] = useState('');
  const [showAddCol, setShowAddCol] = useState(false);
  const [colNameInput, setColNameInput] = useState('');

  return <div className="space-y-4">
    {/* Studio Header Bar */}
    <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-gradient-to-r from-slate-900 to-[#073B67] rounded-xl text-white shadow-md">
      <div className="flex items-center gap-2">
        <div className={`p-2 rounded-lg ${mode === 'register' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-blue-500/20 text-blue-300'}`}>
          <FileSpreadsheet size={18}/>
        </div>
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider">{mode === 'register' ? 'Excel Spreadsheet Studio' : 'Word Document Studio'}</h3>
          <p className="text-[11px] text-slate-300">{mode === 'register' ? 'Register Table Grid & Column Mapping' : 'Form Layout & Smart Document Template'}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            const prompt = `Available Variable Tokens for Bharat Shram Setu Register / Form Template (${mode.toUpperCase()} MODE):\n\n` +
              allTokenOptions.map(t => `- ${t.label}: ${t.value} [Category: ${t.category || 'general'}]`).join('\n') +
              `\n\nPlease construct a clean, valid HTML layout for a CLRA statutory form / register template using these tokens.`;
            navigator.clipboard.writeText(prompt);
            alert('Copied token prompt for ChatGPT / LLM to clipboard!');
          }}
          className="h-8 px-2.5 rounded-lg bg-emerald-600 text-white text-[11px] font-bold flex items-center gap-1 hover:bg-emerald-700 shadow-sm"
        >
          <Copy size={13} /> Copy for GPT
        </button>
        <button
          type="button"
          onClick={() => {
            const content = `AVAILABLE VARIABLE TOKENS FOR BHARAT SHRAM SETU REGISTER TEMPLATE (${mode.toUpperCase()} MODE):\n\n` +
              allTokenOptions.map(t => `[${(t.category || 'general').toUpperCase()}] ${t.label} => ${t.value}`).join('\n');
            const blob = new Blob([content], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `bss_register_tokens_${mode}.txt`;
            a.click();
            URL.revokeObjectURL(url);
          }}
          className="h-8 px-2.5 rounded-lg bg-sky-700 text-white text-[11px] font-bold flex items-center gap-1 hover:bg-sky-800 shadow-sm"
        >
          <Download size={13} /> Download Fields (.txt)
        </button>
        <div className="flex items-center gap-0.5 bg-white/10 backdrop-blur-md p-1 rounded-lg">
          <button type="button" className={tabBtn(tab === 'visual')} onClick={() => setTab('visual')}>{mode === 'register' ? 'Sheet Grid & Designer' : 'Word Canvas'}</button>
          <button type="button" className={tabBtn(tab === 'code')} onClick={() => setTab('code')}>HTML Code</button>
        </div>
        <div className="flex items-center gap-1 bg-white/10 backdrop-blur-md px-2 py-1 rounded-lg text-xs font-mono">
          <span>Zoom:</span>
          <select value={zoom} onChange={e => setZoom(e.target.value as '100')} className="bg-transparent text-white font-bold outline-none cursor-pointer"><option value="75" className="text-black">75%</option><option value="100" className="text-black">100%</option><option value="125" className="text-black">125%</option></select>
        </div>
      </div>
    </div>

    {/* EXCEL SPREADSHEET STUDIO MODE */}
    {mode === 'register' && tab === 'visual' && (
      <div className="border border-slate-200 rounded-xl overflow-visible bg-white shadow-sm space-y-3 p-3">
        {/* 1. Centered Header Title Row Section */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">1. Centered Register Title &amp; Secondary Heading</span>
            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">CENTERED ALIGNMENT</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <input type="text" value={titleInput} onChange={e => {
              const val = e.target.value;
              setTitleInput(val);
              const curHtml = body || REGISTER_STARTER;
              const subHtml = subtitleInput.trim() ? `<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">${subtitleInput.trim()}</h2>` : '';
              const mainTitle = val.trim() || draft.title || draft.formCode;
              const titleHtml = `<h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">${mainTitle}</h1>${subHtml}`;

              if (/<h1[\s\S]*?<\/h1>/i.test(curHtml)) {
                // Keep everything after h1 and h2
                const afterHeader = curHtml.replace(/^[\s\S]*?<h1[\s\S]*?<\/h1>\s*(<h2[\s\S]*?<\/h2>)?/i, '');
                commit(titleHtml + afterHeader);
              } else {
                commit(titleHtml + curHtml);
              }
            }} placeholder="Primary Header Title (e.g., FORM XXII)" className="h-8 px-2.5 text-xs font-bold bg-white border border-slate-300 rounded focus:outline-none focus:border-emerald-600" />

            <input type="text" value={subtitleInput} onChange={e => {
              const val = e.target.value;
              setSubtitleInput(val);
              const curHtml = body || REGISTER_STARTER;
              const subHtml = val.trim() ? `<h2 style="text-align:center;font-size:14px;font-weight:600;margin:2px 0 8px;color:#475569;">${val.trim()}</h2>` : '';
              const mainTitle = titleInput.trim() || draft.title || draft.formCode;
              const titleHtml = `<h1 style="text-align:center;font-size:18px;font-weight:bold;margin:8px 0;">${mainTitle}</h1>${subHtml}`;

              if (/<h1[\s\S]*?<\/h1>/i.test(curHtml)) {
                const afterHeader = curHtml.replace(/^[\s\S]*?<h1[\s\S]*?<\/h1>\s*(<h2[\s\S]*?<\/h2>)?/i, '');
                commit(titleHtml + afterHeader);
              } else {
                commit(titleHtml + curHtml);
              }
            }} placeholder="Secondary Heading (e.g., [See Rule 78 (1)(a)(ii)] · Register of Advances)" className="h-8 px-2.5 text-xs font-semibold bg-white border border-slate-300 rounded focus:outline-none focus:border-emerald-600" />
          </div>
        </div>

          <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg space-y-2">
            <span className="text-[11px] font-bold text-blue-900 uppercase tracking-wider">+ Add Custom Header Key-Value Line</span>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
              <input type="text" value={kvKeyInput} onChange={e => setKvKeyInput(e.target.value)} placeholder="Key Label (e.g., 1. Name and Address of Contractor)" className="md:col-span-5 h-8 px-2.5 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:border-blue-600" />

              <div className="md:col-span-5 flex gap-1">
                <input type="text" value={kvValInput} onChange={e => setKvValInput(e.target.value)} placeholder="Token / Value (e.g., {{CONTRACTOR_NAME}})" className="flex-1 h-8 px-2.5 text-xs font-mono bg-white border border-slate-300 rounded focus:outline-none focus:border-blue-600" />
                <SearchableSelect options={allTokenOptions} onSelect={val => { if (val) setKvValInput(val); }} placeholder="Search token…" width="w-36"/>
              </div>

              <button type="button" disabled={!kvKeyInput.trim()} onClick={() => {
                if (!kvKeyInput.trim()) return;
                const curHtml = body || REGISTER_STARTER;
                const lineHtml = `<p style="margin: 4px 0; font-size: 12px;"><b>${kvKeyInput.trim()}:</b> ${kvValInput || ''}</p>`;
                const idx = curHtml.indexOf('<table');
                const nextHtml = idx !== -1 ? (curHtml.slice(0, idx) + lineHtml + curHtml.slice(idx)) : (curHtml + lineHtml);
                commit(nextHtml);
                setKvKeyInput('');
                setKvValInput('');
                previewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
              }} className="md:col-span-2 h-8 px-3 rounded bg-blue-700 text-white font-bold text-xs hover:bg-blue-800 shadow-xs disabled:opacity-40 disabled:cursor-not-allowed">+ Add Line</button>
            </div>

            {/* List of Added Custom Key-Value Lines */}
            {(() => {
              const lines: { raw: string; key: string; val: string }[] = [];
              const matches = (body || '').matchAll(/<p[^>]*?><b>(.*?):<\/b>\s*(.*?)<\/p>/gi);
              for (const m of matches) {
                lines.push({ raw: m[0], key: m[1], val: m[2] });
              }
              if (!lines.length) return null;
              return (
                <div className="mt-2 space-y-1.5 pt-2 border-t border-blue-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Added Header Lines ({lines.length}):</span>
                  <div className="space-y-1">
                    {lines.map((l, i) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-white rounded border border-blue-200 text-xs shadow-xs">
                        <div className="font-mono text-slate-800">
                          <span className="font-bold text-slate-900">{l.key}: </span>
                          <span className="text-emerald-700 font-semibold">{l.val || '—'}</span>
                        </div>
                        <button type="button" onClick={() => {
                          commit(body.replace(l.raw, ''));
                        }} className="text-red-500 hover:text-red-700 font-bold px-1.5 py-0.5 text-xs rounded hover:bg-red-50" title="Delete Line">✕</button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>

        {/* Excel Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs">
          <div className="flex items-center gap-1 font-mono font-semibold text-slate-700">
            <span className="px-2 py-1 bg-emerald-100 text-emerald-800 rounded font-bold">Sheet1</span>
            <span>Total Columns: {draft.columns.length}</span>
          </div>
          <div className="flex items-center gap-1.5">
            {showAddCol ? (
              <div className="flex items-center gap-1 bg-white p-1 rounded border border-emerald-400">
                <input type="text" value={colNameInput} onChange={e => setColNameInput(e.target.value)} placeholder="Column header name..." className="h-6 px-2 text-xs border border-slate-300 rounded focus:outline-none" />
                <button type="button" onClick={() => {
                  const name = colNameInput.trim();
                  if (name) {
                    const nextCols = [...draft.columns, name];
                    onPatchDraft('columns', nextCols);
                    setSelectedCol(nextCols.length - 1);

                    // Auto-map matching field if available
                    const match = fieldKeys.find(k => k.toLowerCase() === name.toLowerCase() || name.toLowerCase().includes(k.toLowerCase()));
                    if (match) {
                      const others = draft.fieldMappings.filter(m => m.column !== name);
                      onPatchDraft('fieldMappings', [...others, { column: name, fieldKey: match }]);
                    }

                    setColNameInput('');
                    setShowAddCol(false);
                  }
                }} className="h-6 px-2 rounded bg-emerald-700 text-white font-bold text-[11px]">Add</button>
                <button type="button" onClick={() => setShowAddCol(false)} className="h-6 px-1.5 text-slate-500 hover:text-slate-700 text-xs">✕</button>
              </div>
            ) : (
              <button type="button" className="h-7 px-2.5 rounded bg-emerald-700 text-white font-semibold text-[11px] hover:bg-emerald-800 flex items-center gap-1" onClick={() => setShowAddCol(true)}>+ Add Column</button>
            )}
          </div>
        </div>

        {/* Excel Interactive Grid */}
        <div className="overflow-x-auto border border-slate-300 rounded-lg shadow-inner bg-slate-100">
          <table className="w-full text-xs font-sans border-collapse">
            <thead>
              {/* Column Index Row (A, B, C...) */}
              <tr className="bg-slate-200 text-slate-600 font-mono text-[10px] text-center border-b border-slate-300">
                <th className="w-10 py-1 border-r border-slate-300 bg-slate-300 font-bold">#</th>
                {draft.columns.map((_, idx) => (
                  <th key={idx} className="px-3 py-1 border-r border-slate-300 font-bold">
                    {String.fromCharCode(65 + (idx % 26))}
                  </th>
                ))}
              </tr>
              {/* Header Row */}
              <tr className="bg-[#073B67] text-white font-bold border-b border-slate-400">
                <td className="w-10 py-2 text-center bg-slate-800 border-r border-slate-600 font-mono text-[10px]">HDR</td>
                {draft.columns.map((col, idx) => (
                  <th key={idx} onClick={() => setSelectedCol(idx)} className={`px-3 py-2 text-left border-r border-slate-600 cursor-pointer transition-colors ${selectedCol === idx ? 'bg-blue-600 outline outline-2 outline-yellow-400' : 'hover:bg-[#0A4D88]'}`}>
                    <div className="flex items-center justify-between gap-1">
                      <span className="truncate max-w-[120px]">{col}</span>
                      <button type="button" onClick={(e) => { e.stopPropagation(); onPatchDraft('columns', draft.columns.filter((_, j) => j !== idx)); if (selectedCol === idx) setSelectedCol(null); }} className="text-slate-300 hover:text-red-300">×</button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white font-mono text-[11px] divide-y divide-slate-200">
              {[1, 2, 3].map((rowNum) => (
                <tr key={rowNum} className="hover:bg-blue-50/50">
                  <td className="w-10 text-center bg-slate-100 text-slate-500 font-bold border-r border-slate-300 py-1.5">{rowNum}</td>
                  {draft.columns.map((col, idx) => {
                    const mappedKey = draft.fieldMappings.find(m => m.column === col)?.fieldKey || '';
                    return (
                      <td key={idx} className={`px-3 py-1.5 border-r border-slate-200 text-slate-700 ${selectedCol === idx ? 'bg-blue-50/80 font-semibold' : ''}`}>
                        {rowNum === 1 ? (mappedKey ? <span className="text-emerald-700 font-bold">[{mappedKey}]</span> : <span className="text-slate-400 italic">Sample Val {rowNum}</span>) : `Data_${rowNum}_${idx + 1}`}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Column Mapping Inspector Panel */}
        {selectedCol !== null && draft.columns[selectedCol] && (
          <div className="relative z-20 p-3 bg-blue-50/70 border border-blue-200 rounded-lg flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#073B67]">Selected Column ({String.fromCharCode(65 + (selectedCol % 26))}):</span>
              <span className="font-semibold px-2 py-0.5 bg-white border border-blue-300 rounded font-mono text-slate-800">{draft.columns[selectedCol]}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-600">Map to Master/Backend Field:</span>
              <SearchableSelect
                value={draft.fieldMappings.find(m => m.column === draft.columns[selectedCol])?.fieldKey ?? ''}
                options={[
                  ...fieldKeys.map(k => {
                    if (k.startsWith('master_col_bss.') || k.startsWith('worker_bssid.') || k.startsWith('contractor_bssid.')) {
                      return { value: k, label: k, category: 'master_entity' as const };
                    }
                    if (k.startsWith('self.') || k.startsWith('contractor.')) {
                      return { value: k, label: k, category: 'self_contractor' as const };
                    }
                    return { value: k, label: k, category: 'master_column' as const };
                  }),
                  ...backendKeys.map(k => ({ value: `backend:${k}`, label: `backend · ${k}`, category: 'system' as const })),
                  { value: 'self.bss_id', label: 'self.bss_id · Current Contractor BSS ID', category: 'self_contractor' },
                  { value: 'self.name', label: 'self.name · Current Contractor Name', category: 'self_contractor' },
                  { value: 'self.license_no', label: 'self.license_no · Current Contractor CLRA License No', category: 'self_contractor' },
                  { value: 'self.pf_code', label: 'self.pf_code · Current Contractor PF Code', category: 'self_contractor' },
                  { value: 'self.esic_code', label: 'self.esic_code · Current Contractor ESIC Code', category: 'self_contractor' },
                  { value: 'self.address', label: 'self.address · Current Contractor Address', category: 'self_contractor' },
                  { value: 'master_col_bss.contractor_name', label: 'master_col_bss.contractor_name · Contractor Name Lookup', category: 'master_entity' },
                  { value: 'master_col_bss.employer_name', label: 'master_col_bss.employer_name · Employer Name Lookup', category: 'master_entity' },
                  { value: 'master_col_bss.site_name', label: 'master_col_bss.site_name · Site Name Lookup', category: 'master_entity' },
                ]}
                onSelect={val => {
                  const colName = draft.columns[selectedCol];
                  const others = draft.fieldMappings.filter(m => m.column !== colName);
                  onPatchDraft('fieldMappings', val ? [...others, { column: colName, fieldKey: val }] : others);
                }}
                placeholder="Search field…"
              />
            </div>
          </div>
        )}
      </div>
    )}

    {/* WORD DOCUMENT STUDIO MODE */}
    {mode === 'doc' && tab === 'visual' && (
      <div className="border border-slate-200 rounded-xl overflow-visible bg-slate-100 shadow-sm space-y-3 p-3">
        {/* WYSIWYG Ribbon Bar */}
        <div className="flex flex-wrap items-center gap-1.5 p-2 bg-white border border-slate-200 rounded-lg shadow-xs">
          <select onChange={e => cmd('formatBlock', e.target.value)} className="h-7 border border-slate-200 rounded px-1 text-xs font-semibold bg-slate-50 cursor-pointer">
            <option value="P">Normal Text</option>
            <option value="H1">Heading 1</option>
            <option value="H2">Heading 2</option>
            <option value="H3">Heading 3</option>
          </select>
          <div className="h-4 w-px bg-slate-300 mx-1"/>
          <button type="button" className={toolBtn} onClick={() => cmd('bold')}><b>B</b></button>
          <button type="button" className={toolBtn} onClick={() => cmd('italic')}><i>I</i></button>
          <button type="button" className={toolBtn} onClick={() => cmd('underline')}><u>U</u></button>
          <button type="button" className={toolBtn} onClick={() => cmd('strikeThrough')}><s>S</s></button>
          <div className="h-4 w-px bg-slate-300 mx-1"/>
          <button type="button" className={toolBtn} onClick={() => cmd('justifyLeft')}>Left</button>
          <button type="button" className={toolBtn} onClick={() => cmd('justifyCenter')}>Center</button>
          <button type="button" className={toolBtn} onClick={() => cmd('justifyRight')}>Right</button>
          <button type="button" className={toolBtn} onClick={() => cmd('justifyFull')}>Justify</button>
          <div className="h-4 w-px bg-slate-300 mx-1"/>
          <button type="button" className={toolBtn} onClick={() => cmd('insertUnorderedList')}>• Bullet List</button>
          <button type="button" className={toolBtn} onClick={() => cmd('insertOrderedList')}>1. Numbered List</button>
          <div className="h-4 w-px bg-slate-300 mx-1"/>
          <input type="color" value={foreColor} onChange={e => { setForeColor(e.target.value); cmd('foreColor', e.target.value); }} className="w-7 h-7 p-0 border border-slate-200 rounded cursor-pointer" title="Text Color"/>
          <button type="button" className={toolBtn} onClick={() => cmd('insertHTML', '<table style="width:100%;border-collapse:collapse;margin:10px 0;text-align:left;" border="1"><thead><tr style="background:#f1f5f9;"><th style="padding:6px;border:1px solid #999;">Sl. No.</th><th style="padding:6px;border:1px solid #999;">Header / Designation</th><th style="padding:6px;border:1px solid #999;">Wages / Rate</th></tr></thead><tbody><tr><td style="padding:6px;border:1px solid #999;">{{sl}}</td><td style="padding:6px;border:1px solid #999;">{{Designation}}</td><td style="padding:6px;border:1px solid #999;">{{Fixed_Basic_Wages}}</td></tr></tbody></table><p><br></p>')}>+ Table</button>
          <button type="button" className={toolBtn} onClick={() => cmd('insertHTML', '<div style="display:flex;justify-content:space-between;margin-top:40px;padding-top:10px;border-top:1px border #ccc;"><div><b>Authorised Signatory</b><br><small>Seal & Signature</small></div><div><b>Date:</b> ____________</div></div><p><br></p>')}>+ Signature Block</button>
          <div className="h-4 w-px bg-slate-300 mx-1"/>
          <SearchableSelect options={allTokenOptions} onSelect={val => { if (val) insertToken(val); }} placeholder="Search master field…" width="w-44"/>
        </div>

        {/* Paper Canvas Container */}
        <div className="flex justify-center overflow-auto py-4">
          <div className="bg-white border border-slate-300 shadow-xl rounded-sm p-8 min-h-[500px] w-full max-w-[700px] transition-transform origin-top" style={{ transform: `scale(${Number(zoom) / 100})` }}>
            <div
              ref={ref}
              contentEditable
              suppressContentEditableWarning
              onInput={emitRich}
              onMouseUp={saveSelection}
              onKeyUp={saveSelection}
              onFocus={saveSelection}
              className="focus:outline-none min-h-[450px] leading-relaxed text-slate-900 text-sm font-sans"
            />
          </div>
        </div>
      </div>
    )}

    {/* RAW HTML CODE TAB */}
    {tab === 'code' && (
      <textarea value={body} onChange={e => commit(e.target.value)} spellCheck={false} className="w-full h-96 rounded-xl border border-slate-300 p-4 font-mono text-xs leading-relaxed bg-slate-900 text-emerald-400 shadow-inner focus:outline-none" />
    )}



    {/* Live Preview Panel */}
    <div ref={previewRef}>
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">Live Output Document Preview</p>
      <iframe title="Live preview" srcDoc={renderPreview(mode, body, draft)} className="w-full h-80 rounded-xl border border-slate-300 bg-white shadow-sm" />
    </div>
  </div>;
}

export default function RegisterTemplatesPage() {
  const [rows, setRows] = useState<TemplateRow[]>([]);
  const [states, setStates] = useState<string[]>([]);
  const [fieldKeys, setFieldKeys] = useState<string[]>(FIELD_KEYS);
  const [backendKeys, setBackendKeys] = useState<string[]>(BACKEND_FIELD_KEYS);
  const [state, setState] = useState('all');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [view, setView] = useState<TemplateRow | null>(null);
  const [builder, setBuilder] = useState<BuilderDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [cpCatalog, setCpCatalog] = useState<AiCheck[]>([]);
  const [customLabel, setCustomLabel] = useState('');

  // The AI checkpoint catalog (same list the Additional Forms admin uses).
  useEffect(() => {
    let active = true;
    void fetch('/api/admin/form-names', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then((body: { checkpoints?: AiCheck[] } | null) => { if (active) setCpCatalog(body?.checkpoints ?? []); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (state !== 'all') params.set('state', state);
      if (query.trim()) params.set('q', query.trim());
      const response = await fetch(`/api/admin/register-templates${params.toString() ? `?${params}` : ''}`, { cache:'no-store' });
      const body = await response.json().catch(() => ({})) as { rows?:TemplateRow[]; states?:string[]; fieldKeys?:string[]; backendKeys?:string[]; error?:string };
      if (!response.ok) throw new Error(body.error ?? 'Templates could not be loaded.');
      setRows(body.rows ?? []);
      if (body.states) setStates(body.states);
      if (body.fieldKeys?.length) setFieldKeys(body.fieldKeys);
      if (body.backendKeys?.length) setBackendKeys(body.backendKeys);
      setError('');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Templates could not be loaded.'); }
    finally { setLoading(false); }
  }, [state, query]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial + filter reload
  useEffect(() => { void load(); }, [load]);

  function patch(field: string, value: unknown) {
    setBuilder(b => (b ? { ...b, [field]: value } : b));
  }

  function addColumn() {
    if (!builder) return;
    const trimmed = builder.columnInput.split(',').map(c => c.trim()).filter(Boolean);
    const merged = [...builder.columns];
    for (const col of trimmed) if (!merged.includes(col)) merged.push(col);
    setBuilder({ ...builder, columns: merged, columnInput: '' });
  }

  async function saveBuilder() {
    if (!builder) return;
    if (!builder.state.trim() || !builder.formCode.trim()) {
      setError('State and Form / Register code are required.');
      return;
    }
    setBusy(true); setError('');
    try {
      const outputFmt = (builder.outputFormat || (builder.templateType === 'register' ? 'xlsx' : 'pdf')).toLowerCase();
      const payload = {
        state: builder.state.trim(), formCode: builder.formCode.trim().toUpperCase(),
        title: builder.title.trim(), templateType: builder.templateType,
        status: builder.status, act: builder.act.trim(), frequency: builder.frequency.trim(),
        criticality: builder.criticality, isMandatory: builder.isMandatory,
        outputFormat: outputFmt,
        sourceFormat: builder.sourceFormat || 'html',
        columns: builder.columns, fields: builder.fields,
        html: builder.html,
        perRow: builder.perRow,
        fieldMappings: builder.fieldMappings, calculationRules: builder.calcRules,
        aiChecks: builder.aiChecks,
      };
      const isNew = builder.id === null;
      const response = await fetch(isNew ? '/api/admin/register-templates' : `/api/admin/register-templates/${builder.id}`, {
        method: isNew ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? 'Save failed.');
      setBuilder(null);
      setNotice(isNew ? 'New form created.' : 'Form updated.');
      void load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Save failed.'); }
    finally { setBusy(false); }
  }

  async function removeTemplate(row: TemplateRow) {
    if (!window.confirm(`Delete form template ${row.state} \u00b7 ${row.formCode}?`)) return;
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/admin/register-templates/${row.id}`, { method: 'DELETE' });
      const body = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? 'Delete failed.');
      setNotice(`Deleted ${row.state} \u00b7 ${row.formCode}.`);
      void load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Delete failed.'); }
    finally { setBusy(false); }
  }

  async function removeStateTemplates(targetState: string) {
    if (!targetState || targetState === 'all') return;
    if (!window.confirm(`Are you sure you want to delete ALL CLRA templates for ${targetState}? This action cannot be undone.`)) return;
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/admin/register-templates?state=${encodeURIComponent(targetState)}`, { method: 'DELETE' });
      const body = await response.json().catch(() => ({})) as { error?: string; count?: number; message?: string };
      if (!response.ok) throw new Error(body.error ?? 'State deletion failed.');
      setNotice(body.message ?? `Deleted all templates for ${targetState}.`);
      setState('all');
      void load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'State deletion failed.'); }
    finally { setBusy(false); }
  }

  async function resetDefaults() {
    if (!window.confirm('Reset ALL register templates to their default layout from the source files? '
      + 'Any HTML/column/field edits you made will be discarded.')) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/admin/register-templates/reset-defaults', { method: 'POST' });
      const body = await response.json().catch(() => ({})) as { error?: string; count?: number; summary?: string };
      if (!response.ok) throw new Error(body.error ?? 'Reset failed.');
      setNotice(body.summary ?? `Reset ${body.count ?? 0} template(s) to default.`);
      void load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Reset failed.'); }
    finally { setBusy(false); }
  }

  const columns: DataColumn<TemplateRow>[] = [
    { id:'state', header:'State / Region', value:r => r.state },
    { id:'form', header:'Form', value:r => r.formCode, render:r => <div className="flex items-center gap-2"><span className="font-mono text-xs font-semibold text-gray-800">{r.formCode}</span>{r.formatAvailable === false && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700" title="The source matrix lists no official register format for this state">No format</span>}{r.authored ? <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">Authored</span> : null}</div> },
    { id:'title', header:'Title', value:r => r.title || '—' },
    { id:'type', header:'Type', value:r => r.templateType || 'register' },
    { id:'status', header:'Status', value:r => r.status || '—' },
    { id:'criticality', header:'Criticality', value:r => r.criticality || '—', render:r => r.criticality ? <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${r.criticality === 'High' ? 'bg-red-50 text-red-700' : r.criticality === 'Medium' ? 'bg-orange-50 text-orange-700' : 'bg-gray-100 text-gray-600'}`}>{r.criticality}</span> : null },
    { id:'mandatory', header:'Mandatory', value:r => (r.isMandatory ? 'Yes' : 'No'), render:r => r.isMandatory ? <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-green-50 text-green-700">Yes</span> : <span className="text-gray-300 text-xs">—</span> },
    { id:'cols', header:'Columns', value:r => r.columns.length, render:r => <span className={r.columns.length ? 'font-semibold text-green-700' : 'text-gray-400'}>{r.columns.length}</span> },
    { id:'fields', header:'Fields / Layout', value:r => (r.fields?.length || (r.html ? 1 : 0)), render:r => (
      <div className="flex flex-wrap items-center gap-1">
      {r.html ? <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700" title="Authored Word HTML Document Template">HTML Layout</span>
      : <span className={r.fields?.length ? 'font-semibold text-blue-700' : 'text-gray-400'}>{r.fields?.length ?? 0}</span>}
      {r.perRow ? <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-violet-50 text-violet-700" title="Renders once per worker (Identity Card / Wage Slip style)">Per worker</span> : null}
      </div>
    ) },
    { id:'version', header:'Version', value:r => r.version },
    { id:'actions', header:'Actions', filterable:false, value:r => r.id, render:r => (
      <div className="flex items-center gap-2">
        <button onClick={() => { setBuilder(draftFromRow(r)); setError(''); }} className="inline-flex items-center gap-1 text-xs font-semibold text-[#073B67] hover:underline"><Pencil size={13}/>Edit</button>
        <button onClick={() => setView(r)} className="text-xs font-semibold text-blue-700 hover:underline">View fields</button>
        {r.hasFile && <a href={`/api/register-templates/${r.id}/file`} download className="inline-flex items-center gap-1 text-xs font-semibold text-gray-600 hover:text-[#073B67]"><Download size={13}/>Source</a>}
        <button onClick={() => void removeTemplate(r)} className="text-xs font-semibold text-red-600 hover:underline">Delete</button>
      </div>
    ) },
  ];

  const isRegister = builder?.templateType === 'register';
  const stateChoices = Array.from(new Set([...INDIAN_STATES, ...states])).sort((a, b) => a.localeCompare(b));
  const formCodeChoices = Array.from(new Set([...FORM_CODES, ...rows.map(r => r.formCode)])).filter(Boolean).sort((a, b) => a.localeCompare(b));

  return <div className="space-y-6 pb-10">
    <header>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.12em]">BSS Admin · Masters</p>
      <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-gray-950 mt-1">CLRA Register &amp; Form Templates</h1>
      <p className="text-sm text-gray-500 mt-1">Pan-India CLRA register &amp; form studio — manage state-wise tabular registers (Excel grid mapping), register cards, and authored form layouts.</p>
    </header>

    {error && <p role="alert" className="bss-alert bss-alert-error">{error}</p>}
    {notice && <p role="status" className="bss-alert bss-alert-success">{notice}</p>}

    <div className="flex flex-wrap items-center gap-3">
      <label className="text-xs font-semibold text-gray-600">State
        <select value={state} onChange={e => setState(e.target.value)} className="ml-2 h-9 rounded-lg border border-gray-200 px-3 text-xs bg-white"><option value="all">All states / regions</option>{states.map(s => <option key={s} value={s}>{s}</option>)}</select>
      </label>
      {state !== 'all' && (
        <button type="button" onClick={() => void removeStateTemplates(state)} className="h-9 px-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-xs font-bold hover:bg-red-100 transition-colors">
          Delete All {state} Templates
        </button>
      )}
      <label className="relative"><Search size={14} className="absolute left-3 top-2.5 text-gray-400"/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search form or title…" className="h-9 rounded-lg border border-gray-200 pl-9 pr-3 text-xs w-64"/></label>
      <span className="text-xs text-gray-400">{rows.length} template{rows.length === 1 ? '' : 's'}</span>
      <a href="/admin/masters/form-names" className="ml-auto inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50"><FileSpreadsheet size={14}/>Additional Forms</a>
      <button type="button" disabled={busy} onClick={() => void resetDefaults()} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-xs font-bold hover:bg-amber-100 transition-colors disabled:opacity-50"><RotateCcw size={14}/>Reset to default</button>
      <button onClick={() => { setBuilder(blankDraft()); setError(''); }} className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-[#073B67] text-white text-xs font-bold shadow-sm hover:bg-[#052d50] transition-colors"><FilePlus2 size={14}/>+ New Template</button>
    </div>

    {loading ? <p className="flex items-center gap-2 text-sm text-gray-500 py-10"><Loader2 size={16} className="animate-spin"/>Loading templates…</p>
      : <EnterpriseDataTable title="Register templates" rows={rows} columns={columns} rowKey={r => String(r.id)} filename="register-templates"/>}

    {view && <div className="fixed inset-0 z-[95] bg-black/50 flex justify-end" role="presentation"><section role="dialog" aria-modal="true" aria-label="Register template fields" className="bg-white w-full max-w-lg h-full overflow-y-auto">
      <header className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-start justify-between gap-3">
        <div><p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Register template</p><h2 className="font-semibold text-gray-950 mt-0.5 flex items-center gap-2"><FileSpreadsheet size={16} className="text-[#073B67]"/>{view.state} · {view.formCode}</h2>{view.title && <p className="text-xs text-gray-500 mt-0.5">{view.title}</p>}
          <div className="mt-2 flex flex-wrap items-center gap-1">
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${view.perRow ? 'bg-violet-50 text-violet-700' : 'bg-slate-100 text-slate-600'}`} title={view.perRow ? 'Renders once per worker in the master file' : 'Renders once for the whole batch'}>{view.perRow ? '👤 Per worker' : 'Whole batch'}</span>
          </div>
        </div>
        <button onClick={() => setView(null)} aria-label="Close" className="w-8 h-8 grid place-items-center rounded-lg hover:bg-gray-50"><X size={16}/></button>
      </header>
      <div className="p-5 space-y-5">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Form fields ({view.fields?.length ?? 0})</p>
          {(view.fields?.length) ? <ol className="space-y-2">{view.fields.map((f, i) => <li key={i} className="rounded-lg border border-gray-100 px-3 py-2 text-xs"><div className="flex justify-between gap-2"><span className="font-semibold text-gray-800">{f.label}</span><span className="text-gray-400 uppercase text-[10px]">{f.dataType}{f.mandatory ? ' · required' : ''}</span></div><div className="text-gray-400 text-[11px] mt-0.5">{f.section}{f.dataSource !== 'manual' ? ` · from ${f.dataSource}` : ''}{f.signature ? ' · signed' : ''}{f.approval ? ' · approved' : ''}</div></li>)}</ol>
            : <p className="text-xs text-gray-400">No field-dictionary fields defined.</p>}
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Columns ({view.columns.length})</p>
          {view.columns.length
            ? <ol className="space-y-1.5">{view.columns.map((col, i) => <li key={`${col}-${i}`} className="flex gap-3 rounded-lg border border-gray-100 px-3 py-2 text-xs"><span className="text-gray-400 w-6">{i + 1}</span><span className="text-gray-800 font-medium">{col}</span></li>)}</ol>
            : <p className="text-xs text-gray-400">No tabular columns parsed — this is a form-style register.</p>}
        </div>
        {view.meta?.lines && view.meta.lines.length > 0 && <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Header / form fields</p>
          <ul className="space-y-1 text-xs text-gray-600">{view.meta.lines.map((line, i) => <li key={i} className="rounded-lg bg-gray-50 px-3 py-1.5">{line}</li>)}</ul>
        </div>}
        {view.hasFile && <a href={`/api/register-templates/${view.id}/file`} download className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-[#073B67] text-white text-xs font-bold"><Download size={14}/>Download source ({view.sourceFormat.toUpperCase()})</a>}
      </div>
    </section></div>}

    {builder && <div className="fixed inset-0 z-[96] bg-black/50 grid place-items-center p-4">
      <section role="dialog" aria-modal="true" aria-label="Register form builder" className="w-full max-w-4xl bg-white rounded-2xl overflow-hidden max-h-[94vh] flex flex-col">
        <header className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div><h2 className="text-sm font-semibold">{builder.id ? `Edit form · ${builder.state} · ${builder.formCode}` : 'New form / register'}</h2><p className="text-[11px] text-gray-500 mt-0.5">Pick a <b>Format</b> first: <b>Excel</b> = a column register (map each column to a master-file field or a backend value); <b>Doc</b> = a form where you type each field/question and choose its source.</p></div>
          <button onClick={() => setBuilder(null)} aria-label="Close"><X size={16}/></button>
        </header>
        <div className="overflow-y-auto">
          <div className="p-5 grid md:grid-cols-2 xl:grid-cols-4 gap-3 border-b border-gray-100">
            <label className="text-[11px] font-semibold text-gray-600">State *<select value={builder.state} onChange={e => patch('state', e.target.value)} className="mt-1 w-full h-9 rounded-lg border border-gray-200 px-2 text-xs bg-white"><option value="">— select state —</option>{stateChoices.map(s => <option key={s} value={s}>{s}</option>)}{builder.state && !stateChoices.includes(builder.state) ? <option value={builder.state}>{builder.state}</option> : null}</select></label>
            <label className="text-[11px] font-semibold text-gray-600">Form / Register code *<input value={builder.formCode} onChange={e => patch('formCode', e.target.value)} list="bss-form-codes" placeholder="e.g. FORM XXVI-A" className="mt-1 w-full h-9 rounded-lg border border-gray-200 px-3 text-xs font-mono"/><datalist id="bss-form-codes">{formCodeChoices.map(c => <option key={c} value={c}/>)}</datalist></label>
            <label className="text-[11px] font-semibold text-gray-600">Title<input value={builder.title} onChange={e => patch('title', e.target.value)} placeholder="Register of Contractors engaged" className="mt-1 w-full h-9 rounded-lg border border-gray-200 px-3 text-xs"/></label>
            <label className="text-[11px] font-semibold text-gray-600">Format *<select value={builder.outputFormat} onChange={e => { const v = e.target.value; setBuilder(b => b ? { ...b, outputFormat: v, templateType: v === 'xlsx' ? 'register' : 'form' } : b); }} className="mt-1 w-full h-9 rounded-lg border border-gray-200 px-2 text-xs bg-white"><option value="xlsx">Excel — column register</option><option value="pdf">Doc — form / application</option></select></label>
            <label className="text-[11px] font-semibold text-gray-600">Act / Legal framework<input value={builder.act} onChange={e => patch('act', e.target.value)} placeholder="e.g. CLRA Act, 1970" className="mt-1 w-full h-9 rounded-lg border border-gray-200 px-3 text-xs"/></label>
            <label className="text-[11px] font-semibold text-gray-600">Criticality<select value={builder.criticality} onChange={e => patch('criticality', e.target.value)} className="mt-1 w-full h-9 rounded-lg border border-gray-200 px-2 text-xs bg-white"><option value="">—</option><option>High</option><option>Medium</option><option>Low</option></select></label>
            <label className="text-[11px] font-semibold text-gray-600 flex flex-col">Mandatory<label className="mt-3 inline-flex items-center gap-2 text-xs text-gray-700 cursor-pointer"><input type="checkbox" checked={builder.isMandatory} onChange={e => patch('isMandatory', e.target.checked)} className="accent-[#073B67]"/>Yes</label></label>
            <label className="text-[11px] font-semibold text-gray-600">Frequency<select value={builder.frequency} onChange={e => patch('frequency', e.target.value)} className="mt-1 w-full h-9 rounded-lg border border-gray-200 px-2 text-xs bg-white"><option value="">—</option>{FREQUENCY_CHOICES.map(f => <option key={f} value={f}>{f}</option>)}{builder.frequency && !FREQUENCY_CHOICES.includes(builder.frequency) ? <option value={builder.frequency}>{builder.frequency}</option> : null}</select></label>
            {!isRegister && <label className="text-[11px] font-semibold text-gray-600 flex flex-col" title="Identity Cards, Wage Slips and per-employee documents render one copy per worker in the master file.">Per worker<label className="mt-3 inline-flex items-center gap-2 text-xs text-gray-700 cursor-pointer"><input type="checkbox" checked={builder.perRow} onChange={e => patch('perRow', e.target.checked)} className="accent-[#073B67]"/>One per worker</label></label>}
          </div>

          <div className="p-5 space-y-5">
            <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl">
              <p className="text-[10px] font-bold uppercase tracking-wider text-blue-900">AI checkpoints</p>
              <p className="mt-0.5 text-[11px] text-gray-500">Tick the conditions the AI must verify when the contractor uploads this register/form. The AI also checks the register matches the template columns.</p>
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {cpCatalog.map(cp => {
                  const key = cp.key ?? cp.type;
                  const selected = builder.aiChecks.find(c => (c.key ?? c.type) === key);
                  return (
                    <div key={key} className="flex items-center gap-2 text-xs">
                      <label className="flex items-center gap-1.5 flex-1 min-w-0">
                        <input type="checkbox" checked={!!selected} onChange={e => {
                          const rest = builder.aiChecks.filter(c => (c.key ?? c.type) !== key);
                          patch('aiChecks', e.target.checked ? [...rest, { key: cp.key, type: cp.type, label: cp.label, required: true }] : rest);
                        }} className="accent-[#073B67]"/>
                        <span className="truncate text-gray-700">{cp.label}</span>
                      </label>
                      {selected && <label className="flex items-center gap-1 text-[10px] text-gray-500 whitespace-nowrap"><input type="checkbox" checked={selected.required !== false} onChange={e => patch('aiChecks', builder.aiChecks.map(c => (c.key ?? c.type) === key ? { ...c, required: e.target.checked } : c))} className="accent-[#073B67]"/>required</label>}
                    </div>
                  );
                })}
              </div>
              {builder.aiChecks.filter(c => c.type === 'custom').length > 0 && (
                <ul className="mt-2 space-y-1">
                  {builder.aiChecks.filter(c => c.type === 'custom').map((c, i) => (
                    <li key={`${c.label}-${i}`} className="flex items-center justify-between gap-2 rounded-lg border border-blue-200 bg-white px-2 py-1 text-[11px]">
                      <span className="text-gray-800 truncate">{c.label}</span>
                      <button type="button" onClick={() => patch('aiChecks', builder.aiChecks.filter(x => x !== c))} className="text-gray-400 hover:text-red-600" aria-label="Remove checkpoint"><X size={12}/></button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-2 flex items-center gap-2">
                <input value={customLabel} onChange={e => setCustomLabel(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); const label = customLabel.trim(); if (label) { patch('aiChecks', [...builder.aiChecks, { type: 'custom', label, required: true }]); setCustomLabel(''); } } }} placeholder="Add a custom checkpoint the AI must verify (free text)" className="flex-1 h-9 border border-gray-200 rounded-lg px-2 text-xs"/>
                <button type="button" onClick={() => { const label = customLabel.trim(); if (!label) return; patch('aiChecks', [...builder.aiChecks, { type: 'custom', label, required: true }]); setCustomLabel(''); }} disabled={!customLabel.trim()} className="h-9 px-3 rounded-lg border border-[#073B67] text-[#073B67] text-xs font-bold disabled:opacity-50">Add</button>
              </div>
              <p className="mt-2 text-[11px] text-gray-500">{builder.aiChecks.length} checkpoint(s) selected{builder.aiChecks.length === 0 ? ' — uploads use integrity checks only.' : '.'}</p>
            </div>

            {isRegister && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">Columns ({builder.columns.length}) — Excel register columns</p>
                <div className="flex flex-wrap gap-1.5 items-center">
                  {builder.columns.map((col, i) => <span key={`${col}-${i}`} className="inline-flex items-center gap-1 text-[11px] font-mono rounded-lg bg-white border border-slate-300 px-2.5 py-1 text-slate-800 font-semibold">{col}<button type="button" onClick={() => patch('columns', builder.columns.filter((_, j) => j !== i))} className="text-slate-400 hover:text-red-600"><X size={12}/></button></span>)}
                  <input value={builder.columnInput} onChange={e => patch('columnInput', e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addColumn(); } }} placeholder="HEADER, HEADER2" className="h-8 rounded-lg border border-slate-300 px-2.5 text-[11px] font-mono w-56 bg-white"/>
                  <button type="button" onClick={addColumn} className="h-8 px-3 rounded-lg bg-[#073B67] text-white text-xs font-semibold hover:bg-slate-800">Add Column</button>
                </div>
              </div>
            )}

            <div>
              <AdvancedStudioEditor key={builder.id ?? 'new'} mode={isRegister ? 'register' : 'doc'} initialHtml={builder.html} draft={builder} fieldKeys={fieldKeys} backendKeys={backendKeys} onChange={html => patch('html', html)} onPatchDraft={(k, v) => patch(k as string, v)} />
            </div>
          </div>
        </div>
        <footer className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={() => setBuilder(null)} className="h-10 px-4 rounded-lg border border-gray-200 text-xs font-bold text-gray-600">Cancel</button>
          <button disabled={busy} onClick={() => void saveBuilder()} className="h-10 px-4 rounded-lg bg-[#073B67] text-white text-xs font-bold disabled:opacity-60 inline-flex items-center gap-1.5"><CheckCircle2 size={14}/>{busy ? 'Saving…' : builder.id ? 'Save changes' : 'Create form'}</button>
        </footer>
      </section>
    </div>}
  </div>;
}
