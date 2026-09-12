"use client";

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { MapPin, X } from 'lucide-react';
import type { SiteGeo } from '@/components/employer/SiteMap';

const SiteMapPicker = dynamic(() => import('@/components/employer/SiteMap').then(m => m.default), { ssr: false });

type FieldType = 'text' | 'date' | 'number' | 'checkbox' | 'select';
interface SiteField { name: string; label: string; type?: FieldType; options?: string[] }
interface SiteSection { title: string; fields: SiteField[] }

// Mirrors the "Site Detail" sheet (BSS Employer Site Creation Master) field -> model column.
export const SECTIONS: SiteSection[] = [
  {
    title: 'Basic Site Identification',
    fields: [
      { name: 'site_display_name', label: 'Site Display Name' },
      { name: 'internal_location_code', label: 'Internal Location Code' },
      { name: 'parent_company', label: 'Parent Company' },
      { name: 'business_unit', label: 'Business Unit' },
      { name: 'division', label: 'Division' },
      { name: 'department', label: 'Department' },
      { name: 'cost_centre', label: 'Cost Centre' },
      { name: 'profit_centre', label: 'Profit Centre' },
      { name: 'project_code', label: 'Project Code' },
      { name: 'erp_site_code', label: 'ERP Site Code' },
      { name: 'site_status', label: 'Site Status', type: 'select', options: ['Active', 'Planned', 'Completed', 'Suspended'] },
      { name: 'site_creation_type', label: 'Site Creation Type' },
      { name: 'required_automation', label: 'Required Automation' },
      { name: 'assign_color', label: 'Assign Color' },
      { name: 'site_start_date', label: 'Site Start Date', type: 'date' },
      { name: 'expected_end_date', label: 'Expected End Date', type: 'date' },
      { name: 'actual_start_date', label: 'Actual Start Date', type: 'date' },
      { name: 'actual_completion_date', label: 'Actual Completion Date', type: 'date' },
    ],
  },
  {
    title: 'Site Classification',
    fields: [
      { name: 'primary_industry', label: 'Primary Industry' },
      { name: 'sub_industry', label: 'Sub Industry' },
      { name: 'site_type', label: 'Site Type' },
      { name: 'site_category', label: 'Site Category' },
      { name: 'site_nature', label: 'Site Nature (Permanent/Temporary/Project/…)' },
    ],
  },
  {
    title: 'Location & Jurisdiction',
    fields: [
      { name: 'country', label: 'Country' },
      { name: 'tehsil_taluka', label: 'Tehsil / Taluka' },
      { name: 'village', label: 'Village' },
      { name: 'landmark', label: 'Landmark' },
      { name: 'geo_fence_radius', label: 'Geo-Fence Radius (m)', type: 'number' },
      { name: 'labour_jurisdiction', label: 'Labour Jurisdiction' },
      { name: 'labour_office', label: 'Labour Office' },
      { name: 'pf_office', label: 'PF Office' },
      { name: 'esic_office', label: 'ESIC Office' },
      { name: 'police_station', label: 'Police Station' },
      { name: 'fire_department', label: 'Fire Department' },
    ],
  },
  {
    title: 'Principal Employer Details',
    fields: [
      { name: 'legal_entity_name', label: 'Legal Entity Name' },
      { name: 'employer_trade_name', label: 'Trade Name' },
      { name: 'employer_code', label: 'Employer Code' },
      { name: 'employer_cin', label: 'CIN' },
      { name: 'employer_pan', label: 'PAN' },
      { name: 'employer_gstin', label: 'GSTIN' },
      { name: 'employer_lin', label: 'LIN' },
      { name: 'epfo_establishment_code', label: 'EPFO Establishment Code' },
      { name: 'esic_employer_code', label: 'ESIC Employer Code' },
      { name: 'factory_registration_number', label: 'Factory Registration Number' },
      { name: 'labour_registration_number', label: 'Labour Registration Number' },
      { name: 'authorized_signatory', label: 'Authorized Signatory' },
    ],
  },
  {
    title: 'Site Management Team',
    fields: [
      { name: 'site_head', label: 'Site Head' },
      { name: 'hr_head', label: 'HR Head' },
      { name: 'admin_head', label: 'Admin Head' },
      { name: 'ehs_head', label: 'EHS Head' },
      { name: 'security_head', label: 'Security Head' },
      { name: 'compliance_officer', label: 'Compliance Officer' },
      { name: 'payroll_spoc', label: 'Payroll SPOC' },
      { name: 'contractor_management_spoc', label: 'Contractor Management SPOC' },
      { name: 'medical_officer', label: 'Medical Officer' },
      { name: 'emergency_coordinator', label: 'Emergency Coordinator' },
      { name: 'fire_safety_officer', label: 'Fire & Safety Officer' },
      { name: 'plant_head', label: 'Plant Head' },
    ],
  },
  {
    title: 'Workforce Configuration',
    fields: [
      { name: 'direct_employees', label: 'Direct Employees', type: 'number' },
      { name: 'contract_workers', label: 'Contract Workers', type: 'number' },
      { name: 'apprentices', label: 'Apprentices', type: 'number' },
      { name: 'trainees', label: 'Trainees', type: 'number' },
      { name: 'interns', label: 'Interns', type: 'number' },
      { name: 'consultants', label: 'Consultants', type: 'number' },
      { name: 'temporary_workers', label: 'Temporary Workers', type: 'number' },
      { name: 'casual_workers', label: 'Casual Workers', type: 'number' },
      { name: 'daily_wage_workers', label: 'Daily Wage Workers', type: 'number' },
      { name: 'migrant_workers', label: 'Migrant Workers', type: 'number' },
      { name: 'interstate_migrant_workers', label: 'Interstate Migrant Workers', type: 'number' },
      { name: 'foreign_workers', label: 'Foreign Workers', type: 'number' },
      { name: 'gig_workers', label: 'Gig Workers', type: 'number' },
      { name: 'women_workers', label: 'Women Workers', type: 'number' },
      { name: 'night_shift_workers', label: 'Night Shift Workers', type: 'number' },
      { name: 'minimum_workforce', label: 'Minimum Workforce', type: 'number' },
      { name: 'average_workforce', label: 'Average Workforce', type: 'number' },
      { name: 'maximum_workforce', label: 'Maximum Workforce', type: 'number' },
    ],
  },
  {
    title: 'Contractor & Vendor Configuration',
    fields: [
      { name: 'contractors_deployed', label: 'Contractors Deployed', type: 'checkbox' },
      { name: 'expected_active_contractors', label: 'Expected Active Contractors', type: 'number' },
      { name: 'maximum_contractors', label: 'Maximum Contractors', type: 'number' },
      { name: 'labour_contractors', label: 'Labour Contractors', type: 'number' },
      { name: 'service_contractors', label: 'Service Contractors', type: 'number' },
      { name: 'manpower_suppliers', label: 'Manpower Suppliers', type: 'number' },
      { name: 'subcontractors_allowed', label: 'Subcontractors Allowed', type: 'checkbox' },
      { name: 'contractor_prequalification', label: 'Contractor Prequalification', type: 'checkbox' },
      { name: 'compliance_audit_required', label: 'Compliance Audit Required', type: 'checkbox' },
      { name: 'worker_approval_required', label: 'Worker Approval Required', type: 'checkbox' },
      { name: 'document_verification_required', label: 'Document Verification Required', type: 'checkbox' },
      { name: 'site_induction_mandatory', label: 'Site Induction Mandatory', type: 'checkbox' },
      { name: 'medical_fitness_mandatory', label: 'Medical Fitness Mandatory', type: 'checkbox' },
      { name: 'training_mandatory', label: 'Training Mandatory', type: 'checkbox' },
      { name: 'insurance_verification_required', label: 'Insurance Verification Required', type: 'checkbox' },
      { name: 'monthly_compliance_submission', label: 'Monthly Compliance Submission', type: 'checkbox' },
    ],
  },
  {
    title: 'Contractor Controls',
    fields: [
      { name: 'contractor_types_allowed', label: 'Types of Contractors Allowed' },
      { name: 'maximum_contractors_allowed', label: 'Maximum Contractors Allowed', type: 'number' },
      { name: 'maximum_workers_at_site', label: 'Maximum Workers at Site', type: 'number' },
    ],
  },
  {
    title: 'Safety & Security',
    fields: [
      { name: 'ppe_mandatory', label: 'PPE Mandatory', type: 'checkbox' },
      { name: 'types_of_ppe', label: 'Types of PPE' },
      { name: 'safety_training_required', label: 'Safety Training Required', type: 'checkbox' },
      { name: 'police_verification_required', label: 'Police Verification Required', type: 'checkbox' },
      { name: 'id_card_issuance_required', label: 'ID Card Issuance Required', type: 'checkbox' },
    ],
  },
  {
    title: 'Project & Construction Details',
    fields: [
      { name: 'project_name', label: 'Project Name' },
      { name: 'project_owner', label: 'Project Owner' },
      { name: 'pmc_consultant', label: 'PMC / Consultant' },
      { name: 'epc_contractor', label: 'EPC Contractor' },
      { name: 'main_contractor', label: 'Main Contractor' },
      { name: 'project_value', label: 'Project Value', type: 'number' },
      { name: 'estimated_labour_cost', label: 'Estimated Labour Cost', type: 'number' },
      { name: 'work_order_number', label: 'Work Order Number' },
      { name: 'work_order_date', label: 'Work Order Date', type: 'date' },
      { name: 'contract_start_date', label: 'Contract Start Date', type: 'date' },
      { name: 'contract_end_date', label: 'Contract End Date', type: 'date' },
      { name: 'nature_of_work', label: 'Nature of Work' },
      { name: 'built_up_area', label: 'Built-Up Area', type: 'number' },
      { name: 'number_of_floors', label: 'Number of Floors', type: 'number' },
      { name: 'building_height', label: 'Building Height', type: 'number' },
      { name: 'excavation_depth', label: 'Excavation Depth', type: 'number' },
    ],
  },
  {
    title: 'Industry Specific Details',
    fields: [
      { name: 'manufacturing_process', label: 'Manufacturing Process' },
      { name: 'product_manufactured', label: 'Product Manufactured' },
      { name: 'production_capacity', label: 'Production Capacity' },
      { name: 'hazardous_process', label: 'Hazardous Process', type: 'checkbox' },
      { name: 'factory_occupier', label: 'Factory Occupier' },
      { name: 'factory_manager', label: 'Factory Manager' },
      { name: 'mine_type', label: 'Mine Type' },
      { name: 'mineral', label: 'Mineral' },
      { name: 'mine_lease_number', label: 'Mine Lease Number' },
      { name: 'warehouse_area', label: 'Warehouse Area', type: 'number' },
      { name: 'storage_capacity', label: 'Storage Capacity' },
      { name: 'hazardous_goods', label: 'Hazardous Goods', type: 'checkbox' },
      { name: 'power_plant_capacity_mw', label: 'Power Plant Capacity (MW)', type: 'number' },
      { name: 'oil_gas_facility_type', label: 'Oil & Gas Facility Type' },
      { name: 'hospital_beds', label: 'Hospital Beds', type: 'number' },
      { name: 'office_seating_capacity', label: 'Office Seating Capacity', type: 'number' },
    ],
  },
  {
    title: 'Shift & Working Hours',
    fields: [
      { name: 'shift_applicable', label: 'Shift Applicable', type: 'checkbox' },
      { name: 'general_shift_start', label: 'General Shift Start', type: 'text' },
      { name: 'general_shift_end', label: 'General Shift End', type: 'text' },
      { name: 'morning_shift', label: 'Morning Shift' },
      { name: 'evening_shift', label: 'Evening Shift' },
      { name: 'night_shift', label: 'Night Shift' },
      { name: 'weekly_off_pattern', label: 'Weekly Off Pattern' },
      { name: 'overtime_allowed', label: 'Overtime Allowed', type: 'checkbox' },
      { name: 'ot_approval_required', label: 'OT Approval Required', type: 'checkbox' },
      { name: 'maximum_ot_hours', label: 'Maximum OT Hours', type: 'number' },
    ],
  },
  {
    title: 'Gate & Access Configuration',
    fields: [{ name: 'number_of_gates', label: 'Number of Gates', type: 'number' }],
  },
  {
    title: 'Attendance Configuration',
    fields: [
      { name: 'geo_fencing', label: 'Geo-Fencing', type: 'checkbox' },
      { name: 'grace_period', label: 'Grace Period (min)', type: 'number' },
      { name: 'late_coming_rule', label: 'Late Coming Rule' },
      { name: 'early_exit_rule', label: 'Early Exit Rule' },
      { name: 'missing_punch_rule', label: 'Missing Punch Rule' },
      { name: 'half_day_rule', label: 'Half Day Rule' },
      { name: 'ot_attendance_rule', label: 'OT Attendance Rule' },
    ],
  },
  {
    title: 'Gate Pass Configuration',
    fields: [
      { name: 'temporary_gate_pass', label: 'Temporary Gate Pass', type: 'checkbox' },
      { name: 'permanent_gate_pass', label: 'Permanent Gate Pass', type: 'checkbox' },
      { name: 'project_gate_pass', label: 'Project Gate Pass', type: 'checkbox' },
      { name: 'contractor_based_pass', label: 'Contractor Based Pass', type: 'checkbox' },
      { name: 'gatepass_worker_verification_required', label: 'Worker Verification Required', type: 'checkbox' },
      { name: 'gatepass_site_induction_required', label: 'Site Induction Required', type: 'checkbox' },
      { name: 'gatepass_medical_fitness_required', label: 'Medical Fitness Required', type: 'checkbox' },
      { name: 'gatepass_safety_training_required', label: 'Safety Training Required', type: 'checkbox' },
      { name: 'ppe_required_before_entry', label: 'PPE Required Before Entry', type: 'checkbox' },
      { name: 'pass_validity', label: 'Pass Validity' },
    ],
  },
  {
    title: 'Safety & EHS',
    fields: [
      { name: 'risk_category', label: 'Risk Category' },
      { name: 'work_at_height', label: 'Work at Height', type: 'checkbox' },
      { name: 'confined_space', label: 'Confined Space', type: 'checkbox' },
      { name: 'hot_work', label: 'Hot Work', type: 'checkbox' },
      { name: 'electrical_work', label: 'Electrical Work', type: 'checkbox' },
      { name: 'excavation', label: 'Excavation', type: 'checkbox' },
      { name: 'lifting_operations', label: 'Lifting Operations', type: 'checkbox' },
      { name: 'chemical_handling', label: 'Chemical Handling', type: 'checkbox' },
      { name: 'hazardous_material', label: 'Hazardous Material', type: 'checkbox' },
      { name: 'ppe_requirements', label: 'PPE Requirements' },
      { name: 'permit_to_work_required', label: 'Permit to Work Required', type: 'checkbox' },
    ],
  },
  {
    title: 'Training & Induction',
    fields: [
      { name: 'safety_induction', label: 'Safety Induction', type: 'checkbox' },
      { name: 'fire_safety', label: 'Fire Safety', type: 'checkbox' },
      { name: 'emergency_response_training', label: 'Emergency Response Training', type: 'checkbox' },
      { name: 'ppe_training', label: 'PPE Training', type: 'checkbox' },
      { name: 'job_specific_training', label: 'Job Specific Training', type: 'checkbox' },
      { name: 'training_validity', label: 'Training Validity (months)', type: 'number' },
      { name: 'refresher_period', label: 'Refresher Period (months)', type: 'number' },
      { name: 'assessment_required', label: 'Assessment Required', type: 'checkbox' },
      { name: 'minimum_passing_score', label: 'Minimum Passing Score (%)', type: 'number' },
      { name: 'digital_certificate', label: 'Digital Certificate', type: 'checkbox' },
    ],
  },
  {
    title: 'Medical & Welfare',
    fields: [
      { name: 'pre_employment_medical', label: 'Pre-Employment Medical', type: 'checkbox' },
      { name: 'periodic_medical', label: 'Periodic Medical', type: 'checkbox' },
      { name: 'ambulance', label: 'Ambulance', type: 'checkbox' },
      { name: 'first_aid_facility', label: 'First Aid Facility', type: 'checkbox' },
      { name: 'drinking_water', label: 'Drinking Water', type: 'checkbox' },
      { name: 'rest_area', label: 'Rest Area', type: 'checkbox' },
      { name: 'toilets', label: 'Toilets', type: 'checkbox' },
      { name: 'separate_toilets', label: 'Separate Toilets', type: 'checkbox' },
      { name: 'changing_room', label: 'Changing Room', type: 'checkbox' },
      { name: 'creche', label: 'Creche', type: 'checkbox' },
      { name: 'transport', label: 'Transport', type: 'checkbox' },
    ],
  },
  {
    title: 'Labour Compliance',
    fields: [
      { name: 'applicable_state', label: 'Applicable State' },
      { name: 'scheduled_employment', label: 'Scheduled Employment' },
      { name: 'minimum_wage_zone', label: 'Minimum Wage Zone' },
      { name: 'epfo_applicable', label: 'EPFO Applicable', type: 'checkbox' },
      { name: 'esic_applicable', label: 'ESIC Applicable', type: 'checkbox' },
      { name: 'clra_applicable', label: 'CLRA Applicable', type: 'checkbox' },
      { name: 'bocw_applicable', label: 'BOCW Applicable', type: 'checkbox' },
      { name: 'factory_compliance_applicable', label: 'Factory Compliance Applicable', type: 'checkbox' },
      { name: 'shops_establishment_applicable', label: 'Shops & Establishment Applicable', type: 'checkbox' },
      { name: 'interstate_migrant_compliance', label: 'Interstate Migrant Compliance', type: 'checkbox' },
      { name: 'compliance_frequency', label: 'Compliance Frequency' },
    ],
  },
  {
    title: 'Site Documents',
    fields: [
      { name: 'contractor_upload_restriction', label: 'Contractor Upload Restriction', type: 'checkbox' },
      { name: 'site_document_submission_day', label: 'Document Submission Day' },
      { name: 'site_document_reminder_days', label: 'Reminder / Alert Days', type: 'number' },
      { name: 'nearest_labour_office', label: 'Nearest Labour Office' },
    ],
  },
  {
    title: 'Emergency Management',
    fields: [
      { name: 'emergency_control_room', label: 'Emergency Control Room' },
      { name: 'emergency_contact', label: 'Emergency Contact' },
      { name: 'nearest_hospital', label: 'Nearest Hospital' },
      { name: 'ambulance_provider', label: 'Ambulance Provider' },
      { name: 'muster_points', label: 'Muster Points' },
      { name: 'fire_emergency', label: 'Fire Emergency', type: 'checkbox' },
      { name: 'medical_emergency', label: 'Medical Emergency', type: 'checkbox' },
      { name: 'industrial_accident', label: 'Industrial Accident', type: 'checkbox' },
      { name: 'chemical_gas_leak', label: 'Chemical / Gas Leak', type: 'checkbox' },
      { name: 'natural_disaster', label: 'Natural Disaster', type: 'checkbox' },
    ],
  },
  {
    title: 'BSS Module Activation',
    fields: [
      { name: 'module_worker_onboarding', label: 'Worker Onboarding', type: 'checkbox' },
      { name: 'module_contractor_management', label: 'Contractor Management', type: 'checkbox' },
      { name: 'module_universal_worker_id', label: 'Universal Worker ID', type: 'checkbox' },
      { name: 'module_worker_qr_card', label: 'Worker QR Card', type: 'checkbox' },
      { name: 'module_contractor_qr_scanner', label: 'Contractor QR Scanner', type: 'checkbox' },
      { name: 'module_attendance', label: 'Attendance', type: 'checkbox' },
      { name: 'module_gate_pass', label: 'Gate Pass', type: 'checkbox' },
      { name: 'module_dynamic_qr', label: 'Dynamic QR', type: 'checkbox' },
      { name: 'module_face_verification', label: 'Face Verification', type: 'checkbox' },
      { name: 'module_document_management', label: 'Document Management', type: 'checkbox' },
      { name: 'module_compliance_management', label: 'Compliance Management', type: 'checkbox' },
      { name: 'module_payroll_integration', label: 'Payroll Integration', type: 'checkbox' },
      { name: 'module_wage_validation', label: 'Wage Validation', type: 'checkbox' },
      { name: 'module_skill_training', label: 'Skill & Training', type: 'checkbox' },
      { name: 'module_medical_management', label: 'Medical Management', type: 'checkbox' },
      { name: 'module_grievance_management', label: 'Grievance Management', type: 'checkbox' },
      { name: 'module_safety_ehs', label: 'Safety & EHS', type: 'checkbox' },
      { name: 'module_audit_management', label: 'Audit Management', type: 'checkbox' },
      { name: 'module_reports_analytics', label: 'Reports & Analytics', type: 'checkbox' },
    ],
  },
  {
    title: 'Approval & Go-Live',
    fields: [
      { name: 'created_by', label: 'Created By' },
      { name: 'go_live_date', label: 'Go-Live Date', type: 'date' },
    ],
  },
];

const BOOLEAN_NAMES = new Set(
  SECTIONS.flatMap(s => s.fields).filter(f => f.type === 'checkbox').map(f => f.name)
);

export default function SiteCreateForm({ busy, error, onSubmit, onClose, initial }: {
  busy: boolean;
  error: string;
  onSubmit: (payload: Record<string, unknown>) => void;
  onClose: () => void;
  initial?: Record<string, unknown> | null;
}) {
  const [geo, setGeo] = useState<SiteGeo | null>(() => initial && initial.latitude ? { lat: Number(initial.latitude), lng: Number(initial.longitude), label: 'Saved site location' } : null);
  const [location, setLocation] = useState(String(initial?.location ?? ''));
  const [state, setState] = useState(String(initial?.state ?? ''));
  const [geography, setGeography] = useState<Record<string, Record<string, { city: string; pins: string[] }[]>>>({});
  const [tab, setTab] = useState(SECTIONS[0].title);
  const section = useMemo(() => SECTIONS.find(s => s.title === tab) ?? SECTIONS[0], [tab]);

  useEffect(() => {
    let active = true;
    fetch('/api/geography')
      .then(response => response.json())
      .then((result: { data?: Record<string, Record<string, { city: string; pins: string[] }[]>> }) => { if (active && result.data) setGeography(result.data); })
      .catch(() => { /* suggestions are optional */ });
    return () => { active = false; };
  }, []);

  const stateOptions = useMemo(() => Object.keys(geography), [geography]);
  const cityOptions = useMemo(() => {
    const districts = geography[state] ?? {};
    const cities = new Set<string>();
    for (const key of Object.keys(districts)) for (const place of districts[key]) cities.add(place.city);
    return [...cities].sort((a, b) => a.localeCompare(b));
  }, [geography, state]);

  // Pin/search on the map auto-fills City/location + State.
  function handleGeoPick(place: SiteGeo) {
    setGeo(place);
    if (place.city || place.label) setLocation(place.city || place.label);
    if (place.state) setState(place.state);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload: Record<string, unknown> = {};
    if (initial?.id !== undefined && initial.id !== null && initial.id !== '') payload.id = initial.id;
    payload.name = String(form.get('name') || '');
    payload.code = String(form.get('code') || '').toUpperCase();
    payload.location = location.trim();
    payload.state = state.trim() || geo?.state || '';
    payload.startDate = String(form.get('startDate') || '');
    payload.endDate = String(form.get('endDate') || '');
    payload.status = String(form.get('status') || 'Active');
    if (geo) {
      payload.latitude = String(geo.lat);
      payload.longitude = String(geo.lng);
      payload.district = geo.district ?? '';
      payload.city = geo.city ?? '';
      payload.pincode = geo.pin ?? '';
      payload.country = 'India';
    }
    for (const s of SECTIONS) {
      for (const f of s.fields) {
        if (BOOLEAN_NAMES.has(f.name)) {
          payload[f.name] = form.get(f.name) === 'on';
        } else {
          const v = String(form.get(f.name) ?? '').trim();
          if (v !== '') payload[f.name] = v;
        }
      }
    }
    onSubmit(payload);
  }

  return (
    <div className="fixed inset-0 z-[80] bg-black/50 p-4 grid place-items-center overflow-y-auto">
      <section role="dialog" aria-modal="true" aria-labelledby="add-site-title" className="w-full max-w-3xl bg-white rounded-2xl overflow-hidden my-4">
        <header className="p-5 border-b border-gray-100 flex justify-between items-start">
          <div>
            <h2 id="add-site-title" className="font-semibold">{initial ? 'Edit site' : 'Register a project site'}</h2>
            <p className="text-xs text-gray-500 mt-1 max-w-lg">A site is the E·C·S·W anchor. Fill the identity + location basics, then complete the site master fields across the sections below.</p>
          </div>
          <button onClick={onClose} aria-label="Close"><X /></button>
        </header>

        <form onSubmit={handleSubmit} className="p-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="text-xs font-semibold text-gray-700">Site name<input required name="name" defaultValue={String(initial?.site_name ?? initial?.name ?? '')} className="mt-1 w-full h-10 border border-gray-200 rounded-lg px-3 text-sm" /></label>
            <label className="text-xs font-semibold text-gray-700">Site code<input required name="code" defaultValue={String(initial?.site_code ?? initial?.code ?? '')} className="mt-1 w-full h-10 border border-gray-200 rounded-lg px-3 text-sm" /></label>
            <label className="text-xs font-semibold text-gray-700">City / location<input list="site-city-options" name="location" value={location} onChange={event => setLocation(event.target.value)} className="mt-1 w-full h-10 border border-gray-200 rounded-lg px-3 text-sm" /></label>
            <label className="text-xs font-semibold text-gray-700">State (auto-filled from map if you pin)<input list="site-state-options" name="state" value={state} onChange={event => setState(event.target.value)} className="mt-1 w-full h-10 border border-gray-200 rounded-lg px-3 text-sm" /></label>
            <datalist id="site-city-options">{cityOptions.map(city => <option key={city} value={city} />)}</datalist>
            <datalist id="site-state-options">{stateOptions.map(name => <option key={name} value={name} />)}</datalist>
            <label className="text-xs font-semibold text-gray-700">Start date<input name="startDate" type="date" defaultValue={String(initial?.site_start_date ?? '')} className="mt-1 w-full h-10 border border-gray-200 rounded-lg px-3 text-sm" /></label>
            <label className="text-xs font-semibold text-gray-700">End date<input name="endDate" type="date" defaultValue={String(initial?.expected_end_date ?? '')} className="mt-1 w-full h-10 border border-gray-200 rounded-lg px-3 text-sm" /></label>
            <label className="text-xs font-semibold text-gray-700">Status<select name="status" defaultValue={String(initial?.site_status ?? 'Active')} className="mt-1 w-full h-10 border border-gray-200 rounded-lg px-3 bg-white text-sm"><option>Active</option><option>Planned</option></select></label>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-2 mb-3"><MapPin size={15} className="text-[#073B67]" /><p className="text-xs font-bold uppercase tracking-wider text-gray-500">Identify site on OpenStreetMap</p></div>
            <SiteMapPicker initial={geo ? { lat: geo.lat, lng: geo.lng } : undefined} onPick={handleGeoPick} />
          </div>

          <div className="mt-5 border-t border-gray-100 pt-4">
            <div className="flex flex-wrap gap-1.5">
              {SECTIONS.map(s => (
                <button key={s.title} type="button" onClick={() => setTab(s.title)} className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap ${tab === s.title ? 'bg-gray-950 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{s.title}</button>
              ))}
            </div>
            <div className="grid sm:grid-cols-2 gap-4 mt-4">
              {section.fields.map(f => f.type === 'checkbox' ? (
                <label key={f.name} className="flex items-center gap-2 text-xs font-semibold text-gray-700 py-1">
                  <input name={f.name} type="checkbox" defaultChecked={Boolean(initial?.[f.name])} className="w-4 h-4 rounded border-gray-300" />
                  {f.label}
                </label>
              ) : (
                <label key={f.name} className="text-xs font-semibold text-gray-700">
                  {f.label}
                  {f.type === 'select' ? (
                    <select name={f.name} defaultValue={String(initial?.[f.name] ?? '')} className="mt-1 w-full h-10 border border-gray-200 rounded-lg px-3 bg-white text-sm">{(f.options ?? []).map(o => <option key={o}>{o}</option>)}</select>
                  ) : (
                    <input name={f.name} type={f.type ?? 'text'} step={f.type === 'number' ? 'any' : undefined} defaultValue={initial?.[f.name] == null ? undefined : String(initial[f.name])} className="mt-1 w-full h-10 border border-gray-200 rounded-lg px-3 text-sm" />
                  )}
                </label>
              ))}
            </div>
          </div>

          {error && <p role="alert" className="mt-4 text-sm text-red-700 bg-red-50 rounded-lg p-3">{error}</p>}
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm">Cancel</button>
            <button disabled={busy} className="px-4 py-2 bg-blue-700 text-white rounded-lg text-sm font-semibold">{busy ? 'Saving…' : initial ? 'Save changes' : 'Register site'}</button>
          </div>
        </form>
      </section>
    </div>
  );
}
