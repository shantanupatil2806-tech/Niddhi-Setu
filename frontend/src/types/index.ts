export type FDRStatus =
  | 'submitted'
  | 'under_review'
  | 'clarification_required'
  | 'verified'
  | 'rejected'
  | 'matured'
  | 'released';

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

export type VerificationSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type VerificationPriority = 'high' | 'medium' | 'low';

export interface User {
  id: string;
  _id?: string;
  name: string;
  email: string;
  role: UserRole;
  institutionId?: string | Institution;
  isActive: boolean;
  createdAt?: string;
}

export interface Institution {
  id: string;
  _id?: string;
  name: string;
  code: string;
  type: string;
  address: {
    street?: string;
    city: string;
    state: string;
    pincode?: string;
  } | string;
  city?: string;
  state?: string;
  contactEmail: string;
  contactPhone?: string;
  status: 'active' | 'pending' | 'suspended';
  approvalDate?: string;
  totalFDRs?: number;
  totalAmount?: number;
  createdAt?: string;
}

export interface FDRExtractedMetadata {
  extractedAmount?: number;
  extractedMaturityDate?: string;
  extractedBankName?: string;
  extractedRefNumber?: string;
  lienMarked?: boolean;
  jointWithAICTE?: boolean;
  confidenceScore?: number;
  [key: string]: unknown;
}

export interface FDR {
  id: string;
  _id?: string;
  institutionId: string | Institution;
  institution?: Institution;
  refNumber: string;
  bankName: string;
  branch: string;
  amount: number;
  currency: string;
  issueDate: string;
  maturityDate: string;
  status: FDRStatus;
  verificationStatus?: string;
  docHash?: string;
  docPath?: string;
  docOriginalName?: string;
  parentFdrId?: string | FDR;
  jointWithAICTE?: boolean;
  lienMarkedToAICTE?: boolean;
  metadata?: FDRExtractedMetadata;
  createdAt?: string;
  updatedAt?: string;
  daysToMaturity?: number;
  depositPeriodMonths?: number;
  interestRate?: number;
  compoundingFrequency?: 'quarterly' | 'monthly' | 'half_yearly' | 'annual' | 'simple';
  interestPayoutType?: 'cumulative' | 'periodic_payout';
  maturityAmount?: number;
  accruedInterest?: number;
  tdsApplicable?: boolean;
}

export interface VerificationFinding {
  id: string;
  _id?: string;
  caseId?: string;
  fdrId?: string;
  rule: string;
  ruleId?: string;
  category:
    | 'Date Validity'
    | 'Document Integrity'
    | 'Lineage Completeness'
    | 'Reference Uniqueness'
    | 'Amount Consistency'
    | 'Maturity Status'
    | string;
  severity: VerificationSeverity;
  description: string;
  evidence?: string;
  suggestedAction?: string;
  isOfficerReviewRequired?: boolean;
  passed?: boolean;
  resolvedAt?: string;
}

export interface VerificationCase {
  id: string;
  _id?: string;
  fdrId: string | FDR;
  fdr?: FDR;
  officerId?: string | User;
  officer?: User;
  assignedTo?: string | User;
  status: 'pending' | 'under_review' | 'clarification_required' | 'verified' | 'rejected';
  priority: VerificationPriority;
  findings: VerificationFinding[];
  passportId?: string;
  notes?: string;
  officerDecision?: string;
  daysOpen?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface RenewalOrReplacement {
  id: string;
  _id?: string;
  fdrId: string | FDR;
  fdr?: FDR;
  previousFdrId?: string | FDR;
  type: 'renewal' | 'replacement';
  newRefNumber: string;
  newMaturityDate: string;
  newAmount?: number;
  docHash?: string;
  docPath?: string;
  status: 'submitted' | 'approved' | 'rejected' | 'pending';
  createdAt: string;
}

export interface ReleaseRequest {
  id: string;
  _id?: string;
  fdrId: string | FDR;
  fdr?: FDR;
  institutionId: string | Institution;
  institution?: Institution;
  requestedBy: string | User;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  officerDecision?: {
    decision: 'approved' | 'rejected';
    decidedBy?: string | User;
    notes?: string;
    decidedAt?: string;
  };
  documents?: Array<{
    name: string;
    path: string;
    hash?: string;
  }>;
  createdAt: string;
  updatedAt?: string;
}

export interface AuditEvent {
  id: string;
  _id?: string;
  entityType: 'FDR' | 'VerificationCase' | 'Institution' | 'ReleaseRequest' | 'User' | string;
  entityId: string;
  actor: string | { name: string; email: string; role?: string };
  actorRole: 'institution' | 'officer' | 'admin' | 'system';
  action: string;
  payload?: Record<string, unknown>;
  previousHash?: string;
  currentHash?: string;
  timestamp: string;
}

export interface ExtractedFieldMatch {
  field: string;
  label: string;
  submittedValue: string | number;
  extractedValue: string | number;
  match: boolean;
  confidence: number;
}

export interface PassportDecisionRecord {
  decision: string;
  decidedBy: string;
  role: string;
  timestamp: string;
  notes?: string;
}

export interface AuditChainLink {
  step: number;
  action: string;
  timestamp: string;
  actor: string;
  currentHash: string;
  previousHash: string;
  verified: boolean;
}

export interface VerificationPassport {
  caseId: string;
  fdrId: string | FDR;
  fdr?: FDR;
  originalDocHash: string;
  submittedMetadata: Record<string, unknown>;
  extractedFields: ExtractedFieldMatch[];
  findings: VerificationFinding[];
  decisions: PassportDecisionRecord[];
  auditChain: AuditChainLink[];
  integrityStatus?: 'valid' | 'compromised';
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export interface DashboardSummary {
  totalFdrs: number;
  activeFdrs: number;
  approachingMaturity: number;
  overdueFdrs: number;
  pendingVerification: number;
  needsClarification: number;
  renewedFdrs: number;
  releasePending: number;
  totalDepositValue: number;
  totalMaturityValue?: number;
  totalAccruedInterest?: number;
}

export interface MaturityTrendItem {
  month: string;
  count: number;
  amount: number;
}

export interface StatusDistributionItem {
  name: string;
  value: number;
  color: string;
}

export interface RelationshipGraphData {
  nodes: Array<{
    id: string;
    type: 'institution' | 'fdr' | 'renewal' | 'case' | 'release';
    data: {
      label: string;
      title?: string;
      subtitle?: string;
      status?: string;
      amount?: number;
      refNumber?: string;
      details?: Record<string, unknown>;
    };
    position: { x: number; y: number };
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    label?: string;
    animated?: boolean;
    style?: Record<string, unknown>;
  }>;
}

export interface LineageChainNode {
  fdr: FDR;
  relationType?: 'original' | 'renewal' | 'replacement';
  relationDate?: string;
}

export interface LineageValidationRule {
  id: string;
  rule: string;
  status: 'passed' | 'failed' | 'warning';
  description: string;
  details?: string;
}

export interface LineageData {
  chain: LineageChainNode[];
  validations: LineageValidationRule[];
}

export interface RadarCategoryScore {
  category: string;
  score: number;
  fullMark: number;
  findingsCount: number;
}

export interface ComplianceRadarData {
  fdrId?: string;
  institutionId?: string;
  overallScore: number;
  categories: RadarCategoryScore[];
  findings: VerificationFinding[];
}
