/**
 * FDR Sentinel — System Constants and Enumerations
 */

const FDR_STATUS = Object.freeze({
  SUBMITTED: 'submitted',
  UNDER_REVIEW: 'under_review',
  CLARIFICATION_REQUIRED: 'clarification_required',
  VERIFIED: 'verified',
  REJECTED: 'rejected',
  MATURED: 'matured',
  RELEASED: 'released'
});

const VERIFICATION_STATUS = Object.freeze({
  PENDING: 'pending',
  UNDER_REVIEW: 'under_review',
  VERIFIED: 'verified',
  REJECTED: 'rejected',
  FLAGGED: 'flagged'
});

const ROLES = Object.freeze({
  INSTITUTION: 'institution',
  OFFICER: 'officer',
  ADMIN: 'admin'
});

const FINDING_SEVERITY = Object.freeze({
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low'
});

const FINDING_CATEGORY = Object.freeze({
  DATE_SEQUENCE: 'date_sequence',
  DUPLICATE: 'duplicate',
  MISSING_INFO: 'missing_info',
  AMOUNT_MISMATCH: 'amount_mismatch',
  LINEAGE: 'lineage',
  DOCUMENT: 'document'
});

const CASE_STATUS = Object.freeze({
  OPEN: 'open',
  IN_REVIEW: 'in_review',
  CLARIFICATION_SENT: 'clarification_sent',
  DECIDED: 'decided',
  CLOSED: 'closed'
});

const CASE_PRIORITY = Object.freeze({
  CRITICAL: 'critical',
  HIGH: 'high',
  NORMAL: 'normal',
  LOW: 'low'
});

const RENEWAL_TYPE = Object.freeze({
  RENEWAL: 'renewal',
  REPLACEMENT: 'replacement'
});

const RENEWAL_STATUS = Object.freeze({
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected'
});

const RELEASE_STATUS = Object.freeze({
  PENDING: 'pending',
  UNDER_REVIEW: 'under_review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  RELEASED: 'released'
});

const INSTITUTION_TYPES = Object.freeze({
  UNIVERSITY: 'university',
  COLLEGE: 'college',
  DEEMED: 'deemed',
  AUTONOMOUS: 'autonomous',
  TECHNICAL: 'technical'
});

const INSTITUTION_STATUS = Object.freeze({
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  PENDING: 'pending'
});

const COMPLIANCE_RULES = Object.freeze({
  RULE_001: {
    id: 'RULE_001',
    name: 'Duplicate Reference Number Check',
    category: FINDING_CATEGORY.DUPLICATE,
    severity: FINDING_SEVERITY.CRITICAL,
    description: 'Reference number must be globally unique across all active FDR instruments.',
    suggestedAction: 'Verify FDR instrument serial number with issuing bank branch.'
  },
  RULE_002: {
    id: 'RULE_002',
    name: 'Mandatory Field Completeness',
    category: FINDING_CATEGORY.MISSING_INFO,
    severity: FINDING_SEVERITY.CRITICAL,
    description: 'Mandatory fields (Reference Number, Bank Name, Amount, Issue Date, Maturity Date) must be present and valid.',
    suggestedAction: 'Complete all mandatory deposit details per standard banking certificate.'
  },
  RULE_003: {
    id: 'RULE_003',
    name: 'Temporal Sequence Validity',
    category: FINDING_CATEGORY.DATE_SEQUENCE,
    severity: FINDING_SEVERITY.CRITICAL,
    description: 'FDR Issue Date must strictly precede the Maturity Date.',
    suggestedAction: 'Correct deposit timeline dates to maintain chronological integrity.'
  },
  RULE_004: {
    id: 'RULE_004',
    name: 'Expired Instrument Submission Check',
    category: FINDING_CATEGORY.DATE_SEQUENCE,
    severity: FINDING_SEVERITY.HIGH,
    description: 'FDR instrument maturity date cannot be in the past at submission time.',
    suggestedAction: 'Submit a renewed or current valid FDR certificate.'
  },
  RULE_005: {
    id: 'RULE_005',
    name: 'Lineage Amount Parity Check',
    category: FINDING_CATEGORY.AMOUNT_MISMATCH,
    severity: FINDING_SEVERITY.HIGH,
    description: 'On renewal or replacement, the new FDR amount must be greater than or equal to the predecessor FDR amount.',
    suggestedAction: 'Ensure renewal amount covers the original security deposit guarantee amount.'
  },
  RULE_006: {
    id: 'RULE_006',
    name: 'Lineage Predecessor Authenticity',
    category: FINDING_CATEGORY.LINEAGE,
    severity: FINDING_SEVERITY.HIGH,
    description: 'Renewal instrument must reference a valid, verified predecessor FDR owned by the same institution.',
    suggestedAction: 'Link renewal to the verified predecessor FDR record in the registry.'
  },
  RULE_007: {
    id: 'RULE_007',
    name: 'Maturity Threshold Alert',
    category: FINDING_CATEGORY.DATE_SEQUENCE,
    severity: FINDING_SEVERITY.LOW,
    description: 'FDR instrument maturity falls within the next 30 calendar days.',
    suggestedAction: 'Initiate timely renewal processing with issuing bank to prevent guarantee lapse.'
  },
  RULE_008: {
    id: 'RULE_008',
    name: 'Document Cryptographic Integrity',
    category: FINDING_CATEGORY.DOCUMENT,
    severity: FINDING_SEVERITY.CRITICAL,
    description: 'Cryptographic SHA-256 hash of the uploaded document must match stored integrity verification record.',
    suggestedAction: 'Re-upload the untampered original digital fixed deposit certificate PDF/image.'
  },
  RULE_009: {
    id: 'RULE_009',
    name: 'Deposit Period Inconsistency Check',
    category: FINDING_CATEGORY.DATE_SEQUENCE,
    severity: FINDING_SEVERITY.MEDIUM,
    description: 'Stated deposit period months must reconcile with the difference between issue date and maturity date.',
    suggestedAction: 'Ensure deposit period in months mathematically reflects the calendar term.'
  }
});

module.exports = {
  FDR_STATUS,
  VERIFICATION_STATUS,
  ROLES,
  FINDING_SEVERITY,
  FINDING_CATEGORY,
  CASE_STATUS,
  CASE_PRIORITY,
  RENEWAL_TYPE,
  RENEWAL_STATUS,
  RELEASE_STATUS,
  INSTITUTION_TYPES,
  INSTITUTION_STATUS,
  COMPLIANCE_RULES
};
