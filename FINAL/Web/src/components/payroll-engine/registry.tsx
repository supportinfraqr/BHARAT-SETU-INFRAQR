"use client";

/** Module registry for the payroll app. One file per module (./modules = HR, ./employee = self-service). */

import { Banknote, BarChart3, Calculator, FileCheck2, FileText, History, IndianRupee, Landmark, LayoutDashboard, LogOut, PiggyBank, PlayCircle, Receipt, Settings2, ShieldCheck, TrendingUp, Upload, Users } from 'lucide-react';
import type { ModuleProps } from '@/lib/payroll-engine/types';
import HrDashboard from './modules/HrDashboard';
import Employees from './modules/Employees';
import Setup from './modules/Setup';
import PayRuns from './modules/PayRuns';
import Imports from './modules/Imports';
import Revisions from './modules/Revisions';
import Arrears from './modules/Arrears';
import Loans from './modules/Loans';
import Claims from './modules/Claims';
import Tds from './modules/Tds';
import Form16 from './modules/Form16';
import Vpf from './modules/Vpf';
import FullAndFinal from './modules/FullAndFinal';
import BankFiles from './modules/BankFiles';
import Reports from './modules/Reports';
import CtcCalculator from './modules/CtcCalculator';
import AuditLog from './modules/AuditLog';
import MyDashboard from './employee/MyDashboard';
import MyPayslips from './employee/MyPayslips';
import MySalary from './employee/MySalary';
import MyClaims from './employee/MyClaims';
import MyTax from './employee/MyTax';
import MyForm16 from './employee/MyForm16';
import MyVpf from './employee/MyVpf';
import MyPreferences from './employee/MyPreferences';

export type ModuleDef = { key: string; label: string; group: string; icon: React.ComponentType<{ size?: number }>; component: React.ComponentType<ModuleProps> };

export const HR_MODULES: ModuleDef[] = [
  { key: 'dashboard', label: 'Dashboard', group: 'Overview', icon: LayoutDashboard, component: HrDashboard },
  { key: 'employees', label: 'Employees & Salary', group: 'Overview', icon: Users, component: Employees },
  { key: 'setup', label: 'Payroll Setup', group: 'Setup', icon: Settings2, component: Setup },
  { key: 'payrun', label: 'Pay Runs', group: 'Run Payroll', icon: PlayCircle, component: PayRuns },
  { key: 'imports', label: 'Imports', group: 'Run Payroll', icon: Upload, component: Imports },
  { key: 'revisions', label: 'Salary Revisions', group: 'Changes', icon: TrendingUp, component: Revisions },
  { key: 'arrears', label: 'Arrears', group: 'Changes', icon: History, component: Arrears },
  { key: 'loans', label: 'Loans & Advances', group: 'Changes', icon: Landmark, component: Loans },
  { key: 'claims', label: 'Claims & Declarations', group: 'Tax & Claims', icon: Receipt, component: Claims },
  { key: 'tds', label: 'TDS / Income Tax', group: 'Tax & Claims', icon: Calculator, component: Tds },
  { key: 'form16', label: 'Form 16', group: 'Tax & Claims', icon: FileText, component: Form16 },
  { key: 'vpf', label: 'VPF Requests', group: 'Tax & Claims', icon: PiggyBank, component: Vpf },
  { key: 'fnf', label: 'Full & Final', group: 'Exits', icon: LogOut, component: FullAndFinal },
  { key: 'bank', label: 'Bank Files', group: 'Payouts', icon: Banknote, component: BankFiles },
  { key: 'reports', label: 'Reports', group: 'Insights', icon: BarChart3, component: Reports },
  { key: 'ctc', label: 'CTC Calculator', group: 'Insights', icon: IndianRupee, component: CtcCalculator },
  { key: 'audit', label: 'Audit Log', group: 'Insights', icon: ShieldCheck, component: AuditLog },
];

export const EMPLOYEE_MODULES: ModuleDef[] = [
  { key: 'myDashboard', label: 'Overview', group: 'My Payroll', icon: LayoutDashboard, component: MyDashboard },
  { key: 'myPayslips', label: 'Payslips', group: 'My Payroll', icon: FileText, component: MyPayslips },
  { key: 'mySalary', label: 'Salary & Statement', group: 'My Payroll', icon: IndianRupee, component: MySalary },
  { key: 'myClaims', label: 'Claims', group: 'Requests', icon: Receipt, component: MyClaims },
  { key: 'myTax', label: 'Tax Declaration', group: 'Requests', icon: Calculator, component: MyTax },
  { key: 'myForm16', label: 'Form 16 & Tax Report', group: 'Requests', icon: FileCheck2, component: MyForm16 },
  { key: 'myVpf', label: 'VPF', group: 'Requests', icon: PiggyBank, component: MyVpf },
  { key: 'myPreferences', label: 'Preferences', group: 'Settings', icon: Settings2, component: MyPreferences },
];
