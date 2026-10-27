import { format, formatDistanceToNow, differenceInDays, parseISO, isValid } from 'date-fns';
import { FDRStatus, VerificationSeverity } from '../types';

/**
 * Format currency in Indian numbering format (INR)
 * e.g. 5000000 -> ₹ 50,00,000 (₹ 50.00 Lakhs)
 */
export function formatCurrency(amount: number | string | undefined | null, currency = 'INR'): string {
  if (amount === undefined || amount === null || isNaN(Number(amount))) {
    return '₹ 0';
  }
  const num = Number(amount);
  const formatted = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency || 'INR',
    maximumFractionDigits: 0,
  }).format(num);

  return formatted;
}

/**
 * Format in Lakhs / Crores for compact metric display
 */
export function formatCompactCurrency(amount: number | string | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(Number(amount))) {
    return '₹ 0';
  }
  const num = Number(amount);
  if (num >= 10000000) {
    return `₹ ${(num / 10000000).toFixed(2)} Cr`;
  }
  if (num >= 100000) {
    return `₹ ${(num / 100000).toFixed(2)} L`;
  }
  if (num >= 1000) {
    return `₹ ${(num / 1000).toFixed(1)} K`;
  }
  return `₹ ${num}`;
}

/**
 * Format date string or Date object to readable string (e.g. 24 Oct 2026)
 */
export function formatDate(date: string | Date | undefined | null, pattern = 'dd MMM yyyy'): string {
  if (!date) return '—';
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(d)) return '—';
    return format(d, pattern);
  } catch {
    return '—';
  }
}

/**
 * Format relative date (e.g. "3 days ago", "in 2 months")
 */
export function formatRelativeDate(date: string | Date | undefined | null): string {
  if (!date) return '—';
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(d)) return '—';
    return formatDistanceToNow(d, { addSuffix: true });
  } catch {
    return '—';
  }
}

/**
 * Calculate days remaining until maturity
 * Negative means overdue
 */
export function getDaysToMaturity(maturityDate: string | Date | undefined | null): number {
  if (!maturityDate) return 0;
  try {
    const target = typeof maturityDate === 'string' ? parseISO(maturityDate) : maturityDate;
    if (!isValid(target)) return 0;
    const now = new Date();
    return differenceInDays(target, now);
  } catch {
    return 0;
  }
}

/**
 * Map FDR status to color styling
 */
export function getStatusColor(status: FDRStatus | string): {
  bg: string;
  text: string;
  border: string;
  dot: string;
} {
  switch (status) {
    case 'verified':
      return {
        bg: 'bg-emerald-50 text-emerald-700',
        text: 'text-emerald-700',
        border: 'border-emerald-200',
        dot: 'bg-emerald-500',
      };
    case 'under_review':
      return {
        bg: 'bg-sky-50 text-sky-700',
        text: 'text-sky-700',
        border: 'border-sky-200',
        dot: 'bg-sky-500',
      };
    case 'clarification_required':
      return {
        bg: 'bg-amber-50 text-amber-700',
        text: 'text-amber-700',
        border: 'border-amber-200',
        dot: 'bg-amber-500',
      };
    case 'rejected':
      return {
        bg: 'bg-rose-50 text-rose-700',
        text: 'text-rose-700',
        border: 'border-rose-200',
        dot: 'bg-rose-500',
      };
    case 'matured':
      return {
        bg: 'bg-purple-50 text-purple-700',
        text: 'text-purple-700',
        border: 'border-purple-200',
        dot: 'bg-purple-500',
      };
    case 'released':
      return {
        bg: 'bg-slate-100 text-slate-700',
        text: 'text-slate-700',
        border: 'border-slate-300',
        dot: 'bg-slate-500',
      };
    case 'submitted':
    default:
      return {
        bg: 'bg-blue-50 text-blue-700',
        text: 'text-blue-700',
        border: 'border-blue-200',
        dot: 'bg-blue-500',
      };
  }
}

/**
 * Map verification severity to color styling
 */
export function getSeverityColor(severity: VerificationSeverity | string): {
  bg: string;
  text: string;
  border: string;
} {
  switch (severity) {
    case 'critical':
      return {
        bg: 'bg-red-50 text-red-800',
        text: 'text-red-700',
        border: 'border-red-200',
      };
    case 'high':
      return {
        bg: 'bg-rose-50 text-rose-700',
        text: 'text-rose-700',
        border: 'border-rose-200',
      };
    case 'medium':
      return {
        bg: 'bg-amber-50 text-amber-800',
        text: 'text-amber-700',
        border: 'border-amber-200',
      };
    case 'low':
      return {
        bg: 'bg-yellow-50 text-yellow-800',
        text: 'text-yellow-700',
        border: 'border-yellow-200',
      };
    case 'info':
    default:
      return {
        bg: 'bg-blue-50 text-blue-700',
        text: 'text-blue-700',
        border: 'border-blue-200',
      };
  }
}

/**
 * Format bytes into KB/MB
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
