import apiClient from './client';
import { VerificationCase, PaginatedResponse, ApiResponse, VerificationFinding } from '../types';
import { MOCK_CASES, MOCK_FINDINGS } from './mockData';

export interface VerificationQueueParams {
  status?: string;
  priority?: string;
  assignedTo?: string;
  page?: number;
  limit?: number;
}

export interface DecisionPayload {
  decision: 'verified' | 'rejected' | 'clarification_required';
  notes: string;
}

export const verificationApi = {
  getQueue: async (params: VerificationQueueParams = {}): Promise<PaginatedResponse<VerificationCase>> => {
    try {
      const response = await apiClient.get<any>(
        '/verification/queue',
        { params }
      );
      const resData = response.data;
      const rawList = Array.isArray(resData?.data)
        ? resData.data
        : Array.isArray(resData?.items)
        ? resData.items
        : Array.isArray(resData?.data?.items)
        ? resData.data.items
        : [];
      const pagination = resData?.pagination || resData?.data?.pagination;
      const normalizedItems: VerificationCase[] = rawList.map((c: any) => ({
        ...c,
        id: c._id || c.id,
      }));
      return {
        items: normalizedItems,
        total: pagination?.total ?? normalizedItems.length,
        page: pagination?.page ?? (params.page || 1),
        limit: pagination?.limit ?? (params.limit || 10),
        totalPages: (pagination?.pages ?? Math.ceil(normalizedItems.length / (params.limit || 10))) || 1,
      };
    } catch {
      let items = [...MOCK_CASES];
      if (params.status && params.status !== 'all') {
        items = items.filter((c) => c.status === params.status);
      }
      if (params.priority && params.priority !== 'all') {
        items = items.filter((c) => c.priority === params.priority);
      }
      const page = params.page || 1;
      const limit = params.limit || 10;
      const start = (page - 1) * limit;
      const paginatedItems = items.slice(start, start + limit);

      return {
        items: paginatedItems,
        total: items.length,
        page,
        limit,
        totalPages: Math.ceil(items.length / limit) || 1,
      };
    }
  },

  getCaseById: async (id: string): Promise<VerificationCase> => {
    try {
      const response = await apiClient.get<any>(`/verification/cases/${id}`);
      const data = response.data?.data || response.data;
      return { ...data, id: data?._id || data?.id };
    } catch {
      const found = MOCK_CASES.find((c) => c.id === id || c._id === id);
      if (found) return found;
      return MOCK_CASES[0];
    }
  },

  submitDecision: async (id: string, payload: DecisionPayload): Promise<VerificationCase> => {
    try {
      const response = await apiClient.patch<ApiResponse<VerificationCase>>(
        `/verification/cases/${id}/decision`,
        payload
      );
      return response.data.data;
    } catch {
      const found = MOCK_CASES.find((c) => c.id === id || c._id === id);
      if (found) {
        found.status = payload.decision as any;
        found.notes = payload.notes;
        found.officerDecision = payload.decision;
        return found;
      }
      return MOCK_CASES[0];
    }
  },

  addFinding: async (caseId: string, finding: Partial<VerificationFinding>): Promise<VerificationFinding> => {
    try {
      const response = await apiClient.post<ApiResponse<VerificationFinding>>(
        `/verification/cases/${caseId}/findings`,
        finding
      );
      return response.data.data;
    } catch {
      const newFinding: VerificationFinding = {
        id: `fnd-${Date.now()}`,
        caseId,
        rule: finding.rule || 'RULE_CUSTOM',
        ruleId: finding.ruleId || 'RULE_CUSTOM',
        category: finding.category || 'Lineage Completeness',
        severity: finding.severity || 'medium',
        description: finding.description || 'Custom officer audit annotation',
        evidence: finding.evidence || 'Discovered during manual scrutiny check',
        suggestedAction: finding.suggestedAction || 'Verify with bank authority',
        isOfficerReviewRequired: true,
        passed: false,
      };
      MOCK_FINDINGS.push(newFinding);
      return newFinding;
    }
  },
};
