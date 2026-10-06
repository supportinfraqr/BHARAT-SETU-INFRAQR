export type ServiceState = 'Operational' | 'Degraded' | 'Outage' | 'Maintenance';

export type OperationsService = {
  id: string;
  name: string;
  host: string;
  status: ServiceState;
  latencyMs: number;
  uptime: number;
  lastCheckedAt: string;
};

export type OperationsLog = {
  id: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'audit';
  source: string;
  message: string;
  correlationId: string;
};

export type OperationsTicket = {
  id: string;
  title: string;
  service: string;
  priority: 'P1' | 'P2' | 'P3' | 'P4';
  status: 'Open' | 'In progress' | 'Monitoring' | 'Resolved' | 'Escalated';
  assignee: string | null;
  openedAt: string;
  updatedAt: string;
};

export type SupportCase = {
  id: string;
  type: 'Binding' | 'Document' | 'Dispute' | 'Worker record';
  subject: string;
  party: string;
  owner: string;
  priority: 'Urgent' | 'High' | 'Normal' | 'Low';
  status: 'Open' | 'In progress' | 'Waiting for evidence' | 'Resolved' | 'Escalated';
  assignee: string | null;
  createdAt: string;
  updatedAt: string;
  summary: string;
};

export type OperationsSnapshot = {
  generatedAt: string;
  role: 'BSS Admin' | 'BSS Staff';
  metrics: {
    uptime: number;
    activeSessions: number;
    queueDepth: number;
    failedJobs: number;
    openTickets: number;
    openCases: number;
  };
  services: OperationsService[];
  logs: OperationsLog[];
  tickets: OperationsTicket[];
  cases: SupportCase[];
};

export type OperationsAction =
  | { action: 'command'; command: string }
  | { action: 'probe-service'; id: string }
  | { action: 'ticket'; id: string; transition: 'claim' | 'monitor' | 'resolve' | 'escalate' }
  | { action: 'case'; id: string; transition: 'claim' | 'wait' | 'resolve' | 'escalate' };

export type OperationsActionResult = {
  success: true;
  message: string;
  output?: string[];
  completedAt: string;
};
