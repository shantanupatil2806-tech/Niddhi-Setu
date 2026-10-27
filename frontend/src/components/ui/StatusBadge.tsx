import React from 'react';
import { Badge } from './Badge';
import { FDRStatus, VerificationSeverity } from '../../types';
import { FDR_STATUS_LABELS, SEVERITY_LABELS } from '../../utils/constants';

interface StatusBadgeProps {
  status: FDRStatus | string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  const normalized = status?.toLowerCase();

  switch (normalized) {
    case 'verified':
    case 'active':
    case 'approved':
    case 'valid':
      return (
        <Badge variant="success" dot className={className}>
          {FDR_STATUS_LABELS[status as FDRStatus] || 'Verified'}
        </Badge>
      );
    case 'under_review':
    case 'in_progress':
    case 'in_review':
      return (
        <Badge variant="info" dot className={className}>
          {FDR_STATUS_LABELS[status as FDRStatus] || 'Under Review'}
        </Badge>
      );
    case 'clarification_required':
    case 'clarification_sent':
    case 'warning':
      return (
        <Badge variant="warning" dot className={className}>
          {FDR_STATUS_LABELS[status as FDRStatus] || 'Clarification Required'}
        </Badge>
      );
    case 'rejected':
    case 'critical':
    case 'failed':
    case 'suspended':
      return (
        <Badge variant="danger" dot className={className}>
          {FDR_STATUS_LABELS[status as FDRStatus] || 'Rejected'}
        </Badge>
      );
    case 'matured':
      return (
        <Badge variant="neutral" dot className={className}>
          {FDR_STATUS_LABELS[status as FDRStatus] || 'Matured'}
        </Badge>
      );
    case 'released':
      return (
        <Badge variant="teal" dot className={className}>
          {FDR_STATUS_LABELS[status as FDRStatus] || 'Released'}
        </Badge>
      );
    case 'submitted':
    case 'pending':
    case 'open':
    default:
      return (
        <Badge variant="default" dot className={className}>
          {FDR_STATUS_LABELS[status as FDRStatus] || 'Submitted'}
        </Badge>
      );
  }
};

interface SeverityBadgeProps {
  severity: VerificationSeverity | string;
  className?: string;
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({ severity, className }) => {
  const norm = severity?.toLowerCase();
  const label = SEVERITY_LABELS[severity as VerificationSeverity] || severity;

  switch (norm) {
    case 'critical':
      return (
        <Badge variant="danger" dot className={className}>
          {label}
        </Badge>
      );
    case 'high':
      return (
        <Badge variant="danger" dot className={className}>
          {label}
        </Badge>
      );
    case 'medium':
      return (
        <Badge variant="warning" dot className={className}>
          {label}
        </Badge>
      );
    case 'low':
      return (
        <Badge variant="info" dot className={className}>
          {label}
        </Badge>
      );
    case 'info':
    default:
      return (
        <Badge variant="neutral" dot className={className}>
          {label}
        </Badge>
      );
  }
};
