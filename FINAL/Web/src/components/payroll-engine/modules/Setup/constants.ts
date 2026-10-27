/** Reference lists shared by the payroll setup / employee screens (not demo data). */

export const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana',
  'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana',
  'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Andaman and Nicobar Islands', 'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
] as const;

export const STATES_DATALIST_ID = 'pe-indian-states';

export const COMPONENT_CATEGORIES = [
  { value: 'earnings', label: 'Earnings', type: 'earning' },
  { value: 'deductions', label: 'Deductions', type: 'deduction' },
  { value: 'benefits', label: 'Benefits', type: 'benefit' },
  { value: 'reimbursements', label: 'Reimbursements', type: 'reimbursement' },
] as const;

export type ComponentCategory = typeof COMPONENT_CATEGORIES[number]['value'];

export const EMPLOYMENT_CATEGORIES = [
  { value: 'skilled', label: 'Skilled' },
  { value: 'semiSkilled', label: 'Semi-skilled' },
  { value: 'unskilled', label: 'Unskilled' },
] as const;

export const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

export function cap(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}
