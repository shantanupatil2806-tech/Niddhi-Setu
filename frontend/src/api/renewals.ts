import apiClient from './client';
import { RenewalOrReplacement, ApiResponse, PaginatedResponse } from '../types';
import { MOCK_RENEWALS } from './mockData';

export const renewalsApi = {
  getRenewals: async (): Promise<PaginatedResponse<RenewalOrReplacement>> => {
    try {
      const response = await apiClient.get<any>('/renewals');
      const resData = response.data;
      const rawList = Array.isArray(resData?.data)
        ? resData.data
        : Array.isArray(resData?.items)
        ? resData.items
        : Array.isArray(resData?.data?.items)
        ? resData.data.items
        : [];
      const pagination = resData?.pagination || resData?.data?.pagination;
      const normalizedItems: RenewalOrReplacement[] = rawList.map((r: any) => ({
        ...r,
        id: r._id || r.id,
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
        items: MOCK_RENEWALS,
        total: MOCK_RENEWALS.length,
        page: 1,
        limit: 10,
        totalPages: 1,
      };
    }
  },

  getRenewalById: async (id: string): Promise<RenewalOrReplacement> => {
    try {
      const response = await apiClient.get<any>(`/renewals/${id}`);
      const data = response.data?.data || response.data;
      return { ...data, id: data?._id || data?.id };
    } catch {
      const found = MOCK_RENEWALS.find((r) => r.id === id || r._id === id);
      return found || MOCK_RENEWALS[0];
    }
  },

  createRenewal: async (data: Partial<RenewalOrReplacement>): Promise<RenewalOrReplacement> => {
    try {
      const response = await apiClient.post<ApiResponse<RenewalOrReplacement>>('/renewals', data);
      return response.data.data;
    } catch {
      const newRenewal: RenewalOrReplacement = {
        id: `ren-${Date.now()}`,
        fdrId: data.fdrId || 'fdr-001',
        previousFdrId: data.previousFdrId,
        type: data.type || 'renewal',
        newRefNumber: data.newRefNumber || `NEW-REF-${Date.now().toString().slice(-5)}`,
        newMaturityDate: data.newMaturityDate || new Date(Date.now() + 86400000 * 365 * 3).toISOString(),
        newAmount: data.newAmount || 5000000,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };
      MOCK_RENEWALS.unshift(newRenewal);
      return newRenewal;
    }
  },
};
