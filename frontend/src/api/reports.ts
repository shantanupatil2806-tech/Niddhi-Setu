import apiClient from './client';
import { ApiResponse, AuditEvent, ComplianceRadarData } from '../types';
import { MOCK_AUDIT_EVENTS, MOCK_RADAR_DATA } from './mockData';

export const reportsApi = {
  getAuditLogs: async (): Promise<AuditEvent[]> => {
    try {
      const response = await apiClient.get<ApiResponse<AuditEvent[]>>('/reports/audit-logs');
      return response.data.data;
    } catch {
      return MOCK_AUDIT_EVENTS;
    }
  },

  getComplianceRadar: async (params?: { institutionId?: string; fdrId?: string }): Promise<ComplianceRadarData> => {
    try {
      const response = await apiClient.get<ApiResponse<ComplianceRadarData>>('/compliance/radar', {
        params,
      });
      return response.data.data;
    } catch {
      return MOCK_RADAR_DATA;
    }
  },

  exportReportCsv: async (reportType: string, _filters?: Record<string, unknown>): Promise<Blob> => {
    try {
      const response = await apiClient.get(`/reports/export?type=${reportType}&format=csv`, {
        responseType: 'blob',
      });
      return response.data;
    } catch {
      // Mock CSV generation
      const csvContent =
        `ID,Reference Number,Institution,Bank,Amount,Issue Date,Maturity Date,Status\n` +
        `1,SBI-FDR-2024-09823,COEP Technological University,State Bank of India,5000000,2024-03-15,2027-03-15,verified\n` +
        `2,BOB-FDR-2025-11042,COEP Technological University,Bank of Baroda,3500000,2025-01-10,2026-11-15,under_review\n` +
        `3,PNB-FDR-2023-88219,Delhi Technological University,Punjab National Bank,10000000,2023-08-01,2026-08-01,clarification_required\n`;
      return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    }
  },
};
