export type UserRole = 'institution' | 'officer' | 'admin';

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
}
