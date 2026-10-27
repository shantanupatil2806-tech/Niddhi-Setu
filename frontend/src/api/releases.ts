import apiClient from './client';
import { ReleaseRequest, ApiResponse, PaginatedResponse } from '../types';
import { MOCK_RELEASES } from './mockData';

export interface ReleaseDecisionPayload {
  decision: 'approved' | 'rejected';
  notes: string;
}

export const releasesApi = {
  getReleaseRequests: async (): Promise<PaginatedResponse<ReleaseRequest>> => {
    try {
      const response = await apiClient.get<any>('/release-requests');
      const resData = response.data;
      const rawList = Array.isArray(resData?.data)
        ? resData.data
        : Array.isArray(resData?.items)
        ? resData.items
        : Array.isArray(resData?.data?.items)
        ? resData.data.items
        : [];
      const pagination = resData?.pagination || resData?.data?.pagination;
      const normalizedItems: ReleaseRequest[] = rawList.map((rel: any) => ({
        ...rel,
        id: rel._id || rel.id,
      }));
      return {
        items: normalizedItems,
        total: pagination?.total ?? normalizedItems.length,
        page: pagination?.page ?? 1,
        limit: pagination?.limit ?? 10,
        totalPages: pagination?.pages ?? 1,
      };
    } catch {
      return {
        items: MOCK_RELEASES,
        total: MOCK_RELEASES.length,
        page: 1,
        limit: 10,
        totalPages: 1,
      };
    }
  },

  getReleaseRequestById: async (id: string): Promise<ReleaseRequest> => {
    try {
      const response = await apiClient.get<any>(`/release-requests/${id}`);
      const data = response.data?.data || response.data;
      return { ...data, id: data?._id || data?.id };
    } catch {
      const found = MOCK_RELEASES.find((r) => r.id === id || r._id === id);
      return found || MOCK_RELEASES[0];
    }
  },

  createReleaseRequest: async (data: Partial<ReleaseRequest>): Promise<ReleaseRequest> => {
    try {
      const response = await apiClient.post<ApiResponse<ReleaseRequest>>('/release-requests', data);
      return response.data.data;
    } catch {
      const newRelease: ReleaseRequest = {
        id: `rel-${Date.now()}`,
        fdrId: data.fdrId || 'fdr-001',
        institutionId: data.institutionId || 'inst-001',
        requestedBy: data.requestedBy || 'usr-inst-1',
        reason: data.reason || 'Course tenure completed and approved by council.',
        status: 'pending',
        createdAt: new Date().toISOString(),
      };
      MOCK_RELEASES.unshift(newRelease);
      return newRelease;
    }
  },

  updateDecision: async (id: string, payload: ReleaseDecisionPayload): Promise<ReleaseRequest> => {
    try {
      const response = await apiClient.patch<ApiResponse<ReleaseRequest>>(
        `/release-requests/${id}/decision`,
        payload
      );
      return response.data.data;
    } catch {
      const found = MOCK_RELEASES.find((r) => r.id === id || r._id === id);
      if (found) {
        found.status = payload.decision;
        found.officerDecision = {
          decision: payload.decision,
          notes: payload.notes,
          decidedAt: new Date().toISOString(),
        };
        return found;
      }
      return MOCK_RELEASES[0];
    }
  },
};
