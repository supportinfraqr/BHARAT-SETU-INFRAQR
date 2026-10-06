import type { PortalRole } from '@/types/portal';

export type NotificationCategory = 'Jobs' | 'Documents' | 'Compliance' | 'Leave' | 'Payments' | 'Benefits' | 'Grievances' | 'Cards' | 'Announcements' | 'Approvals' | 'Contractors' | 'Sites';
export type NotificationPriority = 'critical' | 'high' | 'normal' | 'low';

export type WorkerNotification = {
  id: string;
  entityId?: string;
  category: NotificationCategory;
  title: string;
  message: string;
  createdAt: string;
  href: string;
  actionLabel: string;
  priority: NotificationPriority;
  requiresAction: boolean;
  read: boolean;
  resolved: boolean;
};

export const notificationSeeds: WorkerNotification[] = [
  { id:'job-REQ-9921-A', entityId:'REQ-9921-A', category:'Jobs', title:'Employment request awaiting response', message:'Review the binding request from Shapoorji Pallonji for Navi Mumbai Airport.', createdAt:'2026-08-29T10:15:00+05:30', href:'/worker/binding', actionLabel:'Review request', priority:'critical', requiresAction:true, read:false, resolved:false },
  { id:'doc-pan', entityId:'PAN Card', category:'Documents', title:'PAN Card is required', message:'Upload your PAN Card to complete mandatory worker documentation.', createdAt:'2026-08-29T09:40:00+05:30', href:'/worker/Documents#missing-documents', actionLabel:'Upload document', priority:'high', requiresAction:true, read:false, resolved:false },
  { id:'doc-medical', entityId:'Medical Certificate', category:'Documents', title:'Medical Certificate is required', message:'Upload the current Medical Certificate required for your employment record.', createdAt:'2026-08-29T09:35:00+05:30', href:'/worker/Documents#missing-documents', actionLabel:'Upload document', priority:'high', requiresAction:true, read:false, resolved:false },
  { id:'compliance-medical', entityId:'medical-fitness', category:'Compliance', title:'Medical fitness expires in 5 days', message:'Review the examination details and start the renewal process.', createdAt:'2026-08-29T09:20:00+05:30', href:'/worker/Compliance#medical-fitness', actionLabel:'Review compliance', priority:'critical', requiresAction:true, read:false, resolved:false },
  { id:'compliance-gate-pass', entityId:'permanent-gate-pass', category:'Compliance', title:'Gate pass approval is pending', message:'Your permanent gate pass remains pending approval.', createdAt:'2026-08-28T16:45:00+05:30', href:'/worker/Compliance#gate-pass', actionLabel:'View status', priority:'normal', requiresAction:false, read:false, resolved:false },
  { id:'grievance-GRV-2026-9123', entityId:'GRV-2026-9123', category:'Grievances', title:'Grievance remains under review', message:'Open the grievance to review its latest status.', createdAt:'2026-08-28T14:10:00+05:30', href:'/worker/grievances#GRV-2026-9123', actionLabel:'Track grievance', priority:'normal', requiresAction:false, read:false, resolved:false },
  { id:'announcement-safety-104', entityId:'ANN-104', category:'Announcements', title:'Important safety briefing', message:'Monsoon safety briefing is scheduled for 1 September.', createdAt:'2026-08-28T11:30:00+05:30', href:'/worker/Announcements#ANN-104', actionLabel:'Read announcement', priority:'high', requiresAction:false, read:false, resolved:false },
];

const contractorNotificationSeeds: WorkerNotification[] = [
  { id:'contractor-compliance-expiry', category:'Compliance', title:'Compliance record expires soon', message:'A work-at-height permit for Coastal Road Project expires in two days.', createdAt:'2026-08-29T09:20:00+05:30', href:'/contractor/compliance', actionLabel:'Review compliance', priority:'critical', requiresAction:true, read:false, resolved:false },
  { id:'contractor-worker-verification', category:'Documents', title:'Worker verification pending', message:'Suresh Patel requires document verification before site access can be restored.', createdAt:'2026-08-28T15:10:00+05:30', href:'/contractor/workers', actionLabel:'Review worker', priority:'high', requiresAction:true, read:false, resolved:false },
];

const employerNotificationSeeds: WorkerNotification[] = [
  { id:'employer-approval-contractor', entityId:'APR-001', category:'Approvals', title:'Contractor approval required', message:'Metro Civil Works requested access to Mumbai Metro Line 3.', createdAt:'2026-08-29T10:15:00+05:30', href:'/employer/qr/requests', actionLabel:'Review request', priority:'critical', requiresAction:true, read:false, resolved:false },
  { id:'employer-approval-worker', entityId:'APR-004', category:'Approvals', title:'Worker compliance approval required', message:'Naveen Yadav submitted a medical renewal and work permit.', createdAt:'2026-08-29T09:30:00+05:30', href:'/employer/qr/requests', actionLabel:'Review worker', priority:'high', requiresAction:true, read:false, resolved:false },
  { id:'employer-compliance-overdue', entityId:'ECR-005', category:'Compliance', title:'Statutory filing overdue', message:'SafeBuild Infra has an overdue PF filing for Pune Industrial Campus.', createdAt:'2026-08-28T16:00:00+05:30', href:'/employer/compliance-submission', actionLabel:'Open compliance', priority:'critical', requiresAction:true, read:false, resolved:false },
];

export function notificationSeedsForRole(role: PortalRole): WorkerNotification[] {
  if (role === 'Employer') return employerNotificationSeeds;
  if (role === 'Contractor') return contractorNotificationSeeds;
  return notificationSeeds;
}

export function isSafeNotificationHref(href: string) {
  return href.startsWith('/') && !href.startsWith('//') && !href.includes('\\');
}
