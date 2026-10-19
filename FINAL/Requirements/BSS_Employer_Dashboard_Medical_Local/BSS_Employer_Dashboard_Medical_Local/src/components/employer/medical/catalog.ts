/** Static catalogues for the Medical and Health & Safety Training workspaces:
 *  Indian states / UTs, the Part-B test panel, the PPE kit and training programmes.
 *  Values follow "Medical Final.html" and "Health and Safety Training.html". */

export const INDIAN_STATES: Array<{ name: string; code: string; kind: 'State' | 'UT' }> = [
  { name: 'Andhra Pradesh', code: 'AP', kind: 'State' },
  { name: 'Arunachal Pradesh', code: 'AR', kind: 'State' },
  { name: 'Assam', code: 'AS', kind: 'State' },
  { name: 'Bihar', code: 'BR', kind: 'State' },
  { name: 'Chhattisgarh', code: 'CG', kind: 'State' },
  { name: 'Goa', code: 'GA', kind: 'State' },
  { name: 'Gujarat', code: 'GJ', kind: 'State' },
  { name: 'Haryana', code: 'HR', kind: 'State' },
  { name: 'Himachal Pradesh', code: 'HP', kind: 'State' },
  { name: 'Jharkhand', code: 'JH', kind: 'State' },
  { name: 'Karnataka', code: 'KA', kind: 'State' },
  { name: 'Kerala', code: 'KL', kind: 'State' },
  { name: 'Madhya Pradesh', code: 'MP', kind: 'State' },
  { name: 'Maharashtra', code: 'MH', kind: 'State' },
  { name: 'Manipur', code: 'MN', kind: 'State' },
  { name: 'Meghalaya', code: 'ML', kind: 'State' },
  { name: 'Mizoram', code: 'MZ', kind: 'State' },
  { name: 'Nagaland', code: 'NL', kind: 'State' },
  { name: 'Odisha', code: 'OD', kind: 'State' },
  { name: 'Punjab', code: 'PB', kind: 'State' },
  { name: 'Rajasthan', code: 'RJ', kind: 'State' },
  { name: 'Sikkim', code: 'SK', kind: 'State' },
  { name: 'Tamil Nadu', code: 'TN', kind: 'State' },
  { name: 'Telangana', code: 'TS', kind: 'State' },
  { name: 'Tripura', code: 'TR', kind: 'State' },
  { name: 'Uttar Pradesh', code: 'UP', kind: 'State' },
  { name: 'Uttarakhand', code: 'UK', kind: 'State' },
  { name: 'West Bengal', code: 'WB', kind: 'State' },
  { name: 'Andaman and Nicobar Islands', code: 'AN', kind: 'UT' },
  { name: 'Chandigarh', code: 'CH', kind: 'UT' },
  { name: 'Dadra and Nagar Haveli and Daman and Diu', code: 'DH', kind: 'UT' },
  { name: 'Delhi', code: 'DL', kind: 'UT' },
  { name: 'Jammu and Kashmir', code: 'JK', kind: 'UT' },
  { name: 'Ladakh', code: 'LA', kind: 'UT' },
  { name: 'Lakshadweep', code: 'LD', kind: 'UT' },
  { name: 'Puducherry', code: 'PY', kind: 'UT' },
];

/** Site state strings come from the employer master; match them loosely ("NCT of Delhi" → "Delhi"). */
export function normaliseState(value: string | undefined | null): string {
  const v = (value ?? '').trim().toLowerCase().replace(/^nct of\s+/, '').replace(/&/g, 'and');
  const hit = INDIAN_STATES.find(s => s.name.toLowerCase() === v || s.code.toLowerCase() === v);
  return hit ? hit.name : (value ?? '').trim();
}

export type TestDef = { key: string; name: string; unit: string; ph: string; auto?: boolean };
export const DEFAULT_TESTS: TestDef[] = [
  { key: 'height', name: 'Height', unit: 'cm', ph: 'e.g. 172' },
  { key: 'weight', name: 'Weight', unit: 'kg', ph: 'e.g. 68' },
  { key: 'chest', name: 'Chest Measurement (Inspiration / Expiration)', unit: 'cm', ph: 'e.g. 92 / 86' },
  { key: 'waist', name: 'Waist Circumference', unit: 'cm', ph: 'e.g. 84' },
  { key: 'bmi', name: 'Body Mass Index (BMI)', unit: 'kg/m²', ph: 'auto-calculated', auto: true },
  { key: 'vision', name: 'Visual Acuity — Right / Left Eye', unit: 'Snellen', ph: 'e.g. 6/6, 6/6' },
  { key: 'colour', name: 'Colour Vision (Ishihara Plates)', unit: '—', ph: 'Normal' },
  { key: 'bp', name: 'Blood Pressure', unit: 'mm Hg', ph: 'e.g. 120/80' },
  { key: 'cbc', name: 'Complete Blood Count (Hb, TLC, DLC, Platelets)', unit: '—', ph: 'e.g. Hb 14.2 g/dL' },
  { key: 'fbs', name: 'Fasting Blood Sugar', unit: 'mg/dL', ph: 'e.g. 92' },
  { key: 'ppbs', name: 'Post Prandial Blood Sugar', unit: 'mg/dL', ph: 'e.g. 118' },
  { key: 'hba1c', name: 'HbA1c (Glycosylated Haemoglobin)', unit: '%', ph: 'e.g. 5.4' },
  { key: 'spo2', name: 'SpO₂ (Oxygen Saturation)', unit: '%', ph: 'e.g. 98' },
  { key: 'urea', name: 'Blood Urea', unit: 'mg/dL', ph: 'e.g. 28' },
  { key: 'creatinine', name: 'S. Creatinine', unit: 'mg/dL', ph: 'e.g. 0.9' },
  { key: 'bilirubin', name: 'S. Bilirubin (Total + Direct)', unit: 'mg/dL', ph: 'e.g. 0.8 / 0.2' },
  { key: 'sgot', name: 'SGOT (AST)', unit: 'U/L', ph: 'e.g. 24' },
  { key: 'sgpt', name: 'SGPT (ALT)', unit: 'U/L', ph: 'e.g. 28' },
  { key: 'lipid', name: 'Lipid Profile (Cholesterol / TG / HDL)', unit: 'mg/dL', ph: 'e.g. 172 / 130 / 46' },
  { key: 'tsh', name: 'S. TSH', unit: 'µIU/mL', ph: 'e.g. 2.1' },
  { key: 'audiometry', name: 'Audiometry (Hearing — Right / Left Ear)', unit: 'dB', ph: 'Normal' },
  { key: 'spirometry', name: 'Lung Function Test — Spirometry (FVC / FEV1)', unit: '—', ph: 'e.g. FVC 3.6 L, FEV1 3.0 L' },
  { key: 'xray', name: 'X-ray Chest (PA View)', unit: '—', ph: 'Normal' },
  { key: 'ecg', name: 'ECG (12 Lead)', unit: '—', ph: 'Normal' },
  { key: 'urine', name: 'Urine Routine (Albumin / Sugar)', unit: '—', ph: 'Normal' },
  { key: 'stool', name: 'Stool Routine', unit: '—', ph: 'Normal' },
];

export type KitDef = { key: string; name: string; replMonths: number; mandatory: boolean };
export const KIT_TEMPLATE: KitDef[] = [
  { key: 'helmet', name: 'Safety Helmet', replMonths: 24, mandatory: true },
  { key: 'goggles', name: 'Safety Goggles', replMonths: 12, mandatory: true },
  { key: 'earplugs', name: 'Ear Plugs / Muffs', replMonths: 3, mandatory: true },
  { key: 'mask', name: 'N95 / Dust Mask', replMonths: 3, mandatory: true },
  { key: 'respirator', name: 'Respirator', replMonths: 6, mandatory: false },
  { key: 'gloves', name: 'Safety Gloves', replMonths: 3, mandatory: true },
  { key: 'shoes', name: 'Safety Shoes / Boots', replMonths: 12, mandatory: true },
  { key: 'vest', name: 'High-Visibility Vest', replMonths: 12, mandatory: true },
  { key: 'harness', name: 'Full Body Harness', replMonths: 24, mandatory: false },
  { key: 'fr', name: 'Fire Retardant Coverall', replMonths: 12, mandatory: false },
  { key: 'faceshield', name: 'Face Shield', replMonths: 12, mandatory: false },
  { key: 'apron', name: 'Leather Apron', replMonths: 12, mandatory: false },
];

export type TrainingDef = { key: string; name: string; validityMonths: number; mandatory: boolean; duration: string };
export const TRAINING_TEMPLATE: TrainingDef[] = [
  { key: 'induction', name: 'Induction & Orientation', validityMonths: 12, mandatory: true, duration: '2 hrs' },
  { key: 'fire', name: 'Fire Safety & Evacuation', validityMonths: 12, mandatory: true, duration: '4 hrs' },
  { key: 'firstaid', name: 'First Aid & CPR', validityMonths: 24, mandatory: true, duration: '8 hrs' },
  { key: 'ppe', name: 'PPE Usage & Care', validityMonths: 12, mandatory: true, duration: '2 hrs' },
  { key: 'mmh', name: 'Manual Material Handling', validityMonths: 24, mandatory: true, duration: '3 hrs' },
  { key: 'height', name: 'Work at Height', validityMonths: 12, mandatory: false, duration: '6 hrs' },
  { key: 'confined', name: 'Confined Space Entry', validityMonths: 12, mandatory: false, duration: '8 hrs' },
  { key: 'chemical', name: 'Chemical Handling / MSDS', validityMonths: 12, mandatory: false, duration: '4 hrs' },
  { key: 'electrical', name: 'Electrical Safety / LOTO', validityMonths: 12, mandatory: false, duration: '4 hrs' },
  { key: 'emergency', name: 'Emergency Response', validityMonths: 12, mandatory: false, duration: '4 hrs' },
  { key: 'hazard', name: 'Hazard Identification', validityMonths: 12, mandatory: false, duration: '2 hrs' },
  { key: 'toolbox', name: 'Toolbox Talk', validityMonths: 3, mandatory: false, duration: '30 min' },
];

/* ── date helpers (ISO yyyy-mm-dd, local) ── */
export function todayIso() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
export function addMonths(iso: string | undefined, months: number) {
  if (!iso) return '';
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return '';
  d.setMonth(d.getMonth() + months);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function daysUntil(iso: string | undefined) {
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00`).getTime();
  if (Number.isNaN(d)) return null;
  return Math.round((d - new Date(`${todayIso()}T00:00:00`).getTime()) / 86_400_000);
}
export function fmtDate(iso: string | undefined) {
  if (!iso) return '—';
  const d = new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
export function fmtDateTime(iso: string | undefined) {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
export function ageFrom(dob: string | undefined) {
  if (!dob) return '';
  const b = new Date(`${dob}T00:00:00`), n = new Date();
  if (Number.isNaN(b.getTime())) return '';
  let a = n.getFullYear() - b.getFullYear();
  if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--;
  return String(a);
}
