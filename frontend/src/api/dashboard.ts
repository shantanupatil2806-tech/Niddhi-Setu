import apiClient from './client';
import { DashboardSummary, MaturityTrendItem, AuditEvent, ApiResponse, FDR } from '../types';
import { MOCK_DASHBOARD_SUMMARY, MOCK_MATURITY_TREND, MOCK_AUDIT_EVENTS, MOCK_FDRS } from './mockData';

export const dashboardApi = {
  getSummary: async (): Promise<DashboardSummary> => {
    try {
      const response = await apiClient.get<any>('/dashboard/summary');
      const d = response.data.data || response.data || {};
      return {
        totalFdrs: d.totalFdrs ?? d.total ?? MOCK_DASHBOARD_SUMMARY.totalFdrs,
        activeFdrs: d.activeFdrs ?? d.active ?? MOCK_DASHBOARD_SUMMARY.activeFdrs,
        approachingMaturity: d.approachingMaturity ?? d.approaching_maturity ?? MOCK_DASHBOARD_SUMMARY.approachingMaturity,
        overdueFdrs: d.overdueFdrs ?? d.overdue ?? MOCK_DASHBOARD_SUMMARY.overdueFdrs,
        pendingVerification: d.pendingVerification ?? d.pending_verification ?? MOCK_DASHBOARD_SUMMARY.pendingVerification,
        needsClarification: d.needsClarification ?? d.clarification_required ?? MOCK_DASHBOARD_SUMMARY.needsClarification,
        renewedFdrs: d.renewedFdrs ?? d.renewed ?? MOCK_DASHBOARD_SUMMARY.renewedFdrs,
        releasePending: d.releasePending ?? d.release_pending ?? MOCK_DASHBOARD_SUMMARY.releasePending,
        totalDepositValue: d.totalDepositValue ?? d.total_guarantee_amount ?? MOCK_DASHBOARD_SUMMARY.totalDepositValue,
      };
    } catch {
      return MOCK_DASHBOARD_SUMMARY;
    }
  },

  getMaturityTrend: async (): Promise<MaturityTrendItem[]> => {
    try {
      const response = await apiClient.get<any>('/dashboard/maturity-trend');
      const raw = response.data.data || response.data || [];
      if (Array.isArray(raw) && raw.length > 0) {
        return raw.map((item: any) => ({
          month: item.month || item.label || item.monthKey || 'Month',
          count: item.count || 0,
          amount: item.amount ?? item.totalAmount ?? 0,
        }));
      }
      return MOCK_MATURITY_TREND;
    } catch {
      return MOCK_MATURITY_TREND;
    }
  },

  getRecentActivity: async (): Promise<AuditEvent[]> => {
    try {
      const response = await apiClient.get<ApiResponse<AuditEvent[]>>('/dashboard/recent-activity');
      return response.data.data;
    } catch {
      return MOCK_AUDIT_EVENTS;
    }
  },

  getHighPriorityCases: async (): Promise<FDR[]> => {
    try {
      const response = await apiClient.get<ApiResponse<FDR[]>>('/dashboard/high-priority');
      return response.data.data;
    } catch {
      return MOCK_FDRS.filter((f) => f.status === 'clarification_required' || f.status === 'under_review');
    }
  },
};
