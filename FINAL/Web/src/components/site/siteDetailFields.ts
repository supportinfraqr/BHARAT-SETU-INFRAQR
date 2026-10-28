import { Building2, HardHat, Info, MapPin, Settings, ShieldCheck, Users } from 'lucide-react';
import { SECTIONS } from '@/components/employer/SiteCreateForm';

/** Shared site-detail tab/field metadata, used by the employer site detail/edit
 *  page and the contractor's read-only allotted-site view. */
export const tabs = [
  ['basic', 'Basic Info', Info],
  ['address', 'Address & Location', MapPin],
  ['team', 'Management Team', Users],
  ['workforce', 'Workforce', HardHat],
  ['compliance', 'Compliance & Statutory', ShieldCheck],
  ['operational', 'Operational', Settings],
  ['safety', 'Safety & Welfare', ShieldCheck],
  ['modules', 'Module Activation', Building2],
] as const;

export type Tab = typeof tabs[number][0];

export const TAB_FIELDS: Record<Tab, string[]> = {
  basic: ['bss_site_id', 'site_name', 'site_display_name', 'internal_location_code', 'parent_company', 'business_unit', 'division', 'department', 'cost_centre', 'profit_centre', 'project_code', 'erp_site_code', 'site_status', 'site_start_date', 'actual_start_date', 'actual_completion_date', 'primary_industry', 'sub_industry', 'site_type', 'site_category', 'site_nature', 'assign_color'],
  address: ['country', 'tehsil_taluka', 'village', 'landmark', 'geo_fence_radius', 'location', 'state', 'district', 'city', 'pincode', 'latitude', 'longitude', 'labour_jurisdiction', 'labour_office', 'pf_office', 'esic_office', 'police_station', 'fire_department'],
  team: ['site_head', 'hr_head', 'admin_head', 'ehs_head', 'security_head', 'compliance_officer', 'payroll_spoc', 'contractor_management_spoc', 'medical_officer', 'emergency_coordinator', 'fire_safety_officer'],
  workforce: ['direct_employees', 'contract_workers', 'apprentices', 'trainees', 'interns', 'consultants', 'temporary_workers', 'casual_workers', 'daily_wage_workers', 'migrant_workers', 'interstate_migrant_workers', 'foreign_workers', 'gig_workers', 'women_workers', 'night_shift_workers', 'minimum_workforce', 'average_workforce', 'maximum_workforce'],
  compliance: ['epfo_applicable', 'esic_applicable', 'clra_applicable', 'bocw_applicable', 'factory_compliance_applicable', 'shops_establishment_applicable', 'interstate_migrant_compliance', 'applicable_state', 'scheduled_employment', 'minimum_wage_zone', 'compliance_frequency', 'compliance_client', 'statutory_applicability'],
  operational: ['shift_model', 'working_days', 'gate_timing', 'workforce_model', 'reporting_period', 'preferred_calendar', 'project_name', 'project_owner', 'pmc_consultant', 'epc_contractor', 'main_contractor', 'work_order_number', 'nature_of_work'],
  safety: ['risk_category', 'work_at_height', 'confined_space', 'hot_work', 'electrical_work', 'excavation', 'lifting_operations', 'chemical_handling', 'hazardous_material', 'ppe_requirements', 'permit_to_work_required', 'first_aid_facility', 'drinking_water', 'rest_area', 'toilets', 'creche', 'transport', 'ambulance'],
  modules: ['module_worker_onboarding', 'module_contractor_management', 'module_universal_worker_id', 'module_worker_qr_card', 'module_attendance', 'module_gate_pass', 'module_document_management', 'module_compliance_management', 'module_payroll_integration', 'module_wage_validation', 'module_skill_training', 'module_medical_management', 'module_grievance_management', 'module_safety_ehs', 'module_audit_management', 'module_reports_analytics'],
};

export const LABELS: Record<string, string> = Object.fromEntries(SECTIONS.flatMap(s => s.fields).map(f => [f.name, f.label]));
export const FIELD_DEFS: Record<string, { label?: string; type?: string; options?: string[] }> = Object.fromEntries(
  SECTIONS.flatMap(s => s.fields).map(f => [f.name, { label: f.label, type: f.type, options: f.options }]),
);
