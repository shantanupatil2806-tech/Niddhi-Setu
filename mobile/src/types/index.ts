export type UserRole =
  | 'institution'
  | 'officer'
  | 'admin'
  | 'officer_admin'
  | 'officer_finance'
  | 'officer_approval'
  | 'officer_pgrc'
  | 'officer_vigilance'
  | 'officer_cell';

export type FDRStatus =
  | 'submitted'
  | 'under_review'
  | 'clarification_required'
  | 'verified'
  | 'matured'
  | 'released'
  | 'rejected';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  institutionId?: any;
}

export interface Institution {
  id: string;
  name: string;
  code: string;
  type?: string;
  address?: string;
  contactEmail?: string;
}

export interface FDR {
  id: string;
  _id?: string;
  refNumber: string;
  bankName: string;
  branch?: string;
  amount: number;
  currency?: string;
  issueDate: string;
  maturityDate: string;
  status: FDRStatus;
  institutionId?: any;
  institution?: Institution;
  docOriginalName?: string;
  docPath?: string;
  docHash?: string;
  depositPeriodMonths?: number;
  interestRate?: number;
  compoundingFrequency?: 'quarterly' | 'monthly' | 'half_yearly' | 'annual' | 'simple';
  interestPayoutType?: 'cumulative' | 'periodic_payout';
  maturityAmount?: number;
  accruedInterest?: number;
  tdsApplicable?: boolean;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  type: 'maturity' | 'clarification' | 'release' | 'verification' | 'system';
  priority: 'urgent' | 'warning' | 'success' | 'info';
  title: string;
  message: string;
  fdrId?: string;
  refNumber?: string;
  timestamp: string;
  read: boolean;
}

export interface DashboardStats {
  totalFdrs: number;
  activeFdrs: number;
  approachingMaturity: number;
  pendingVerification: number;
  needsClarification: number;
  releasePending: number;
  totalDepositValue: number;
  totalMaturityValue?: number;
  totalAccruedInterest?: number;
}

export interface WorkflowDocumentItem {
  docType: 'request_letter' | 'affidavit_6' | 'fdr_copy' | 'payment_proof' | 'eoa_loa';
  status: 'pending_upload' | 'uploaded' | 'under_review' | 'verified' | 'clarification_required' | 'rejected';
  docPath?: string;
  docHash?: string;
  docOriginalName?: string;
  version?: number;
  observations?: string;
  checklist?: Array<{ item: string; passed: boolean; notes?: string }>;
}

export interface ClearanceTaskItem {
  taskKey: 'admin_scrutiny' | 'finance_settlement' | 'pgrc_clearance' | 'vigilance_integrity' | 'cell_summary' | 'bureau_sanction';
  name: string;
  department: 'admin' | 'finance' | 'pgrc' | 'vigilance' | 'cell' | 'approval_bureau';
  assignedRole: UserRole;
  status: 'pending' | 'in_progress' | 'cleared' | 'clarification_required' | 'rejected';
  dependsOn?: string[];
  slaHours?: number;
  observations?: string;
  decidedAt?: string;
}

export interface ClearanceWorkflow {
  _id: string;
  id?: string;
  institutionId?: any;
  fdrId?: any;
  status: 'initiated' | 'in_progress' | 'clarification_required' | 'blocked' | 'approved' | 'rejected';
  currentStage: number;
  slaDeadline?: string;
  blockedReasons?: string[];
  documents: WorkflowDocumentItem[];
  tasks: ClearanceTaskItem[];
  createdAt: string;
  updatedAt: string;
}
