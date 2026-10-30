import { FDRStatus, UserRole, VerificationSeverity } from '../types';

export const FDR_STATUS_LABELS: Record<FDRStatus, string> = {
  submitted: 'Submitted',
  under_review: 'Under Review',
  clarification_required: 'Clarification Required',
  verified: 'Verified',
  rejected: 'Rejected',
  matured: 'Matured',
  released: 'Released',
};

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'AICTE Administrator',
  officer: 'Verification Officer',
  institution: 'Institution Nodal Officer',
  officer_admin: 'Administrative Officer',
  officer_finance: 'Finance / FDR Officer',
  officer_approval: 'Approval Bureau Officer',
  officer_pgrc: 'PGRC Officer',
  officer_vigilance: 'Vigilance Officer (CVO)',
  officer_cell: 'Authorized Cell Officer',
};

export const SEVERITY_LABELS: Record<VerificationSeverity, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  info: 'Informational',
};

export const INDIAN_BANKS = [
  'State Bank of India',
  'Punjab National Bank',
  'Bank of Baroda',
  'Canara Bank',
  'Union Bank of India',
  'Bank of India',
  'Indian Bank',
  'Central Bank of India',
  'HDFC Bank',
  'ICICI Bank',
  'Axis Bank',
  'Kotak Mahindra Bank',
  'IndusInd Bank',
  'Federal Bank',
  'IDBI Bank',
];

export const INSTITUTION_TYPES = [
  'Engineering & Technology',
  'Management (MBA/PGDM)',
  'Pharmacy',
  'Architecture & Planning',
  'Polytechnic / Diploma',
  'Applied Arts & Crafts',
  'Hotel Management & Catering',
  'MCA / Computer Applications',
];

export const INDIAN_STATES = [
  'Andhra Pradesh',
  'Assam',
  'Bihar',
  'Chandigarh',
  'Chhattisgarh',
  'Delhi (NCT)',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Tamil Nadu',
  'Telangana',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
];

export const DEFAULT_PAGE_SIZE = 10;
export const MAX_FILE_SIZE_MB = 15;
export const ALLOWED_FILE_TYPES = ['.pdf', '.jpg', '.jpeg', '.png'];
