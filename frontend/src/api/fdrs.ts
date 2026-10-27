import apiClient from './client';
import { FDR, PaginatedResponse, ApiResponse, LineageData, VerificationFinding } from '../types';
import { MOCK_FDRS, MOCK_FINDINGS, MOCK_LINEAGE_DATA } from './mockData';

export interface FDRFilterParams {
  status?: string;
  verificationStatus?: string;
  institutionId?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export const fdrsApi = {
  getFDRs: async (params: FDRFilterParams = {}): Promise<PaginatedResponse<FDR>> => {
    try {
      const response = await apiClient.get<any>('/fdrs', {
        params,
      });
      const resData = response.data;
      const rawList = Array.isArray(resData?.data)
        ? resData.data
        : Array.isArray(resData?.items)
        ? resData.items
        : Array.isArray(resData?.data?.items)
        ? resData.data.items
        : [];
      const pagination = resData?.pagination || resData?.data?.pagination;
      const normalizedItems: FDR[] = rawList.map((f: any) => ({
        ...f,
        id: f._id || f.id,
      }));
      return {
        items: normalizedItems,
        total: pagination?.total ?? normalizedItems.length,
        page: pagination?.page ?? (params.page || 1),
        limit: pagination?.limit ?? (params.limit || 10),
        totalPages: (pagination?.pages ?? Math.ceil(normalizedItems.length / (params.limit || 10))) || 1,
      };
    } catch {
      // Offline fallback
      let items = [...MOCK_FDRS];
      if (params.status && params.status !== 'all') {
        items = items.filter((f) => f.status === params.status);
      }
      if (params.institutionId && params.institutionId !== 'all') {
        items = items.filter(
          (f) =>
            f.institutionId === params.institutionId ||
            (typeof f.institutionId === 'object' && f.institutionId?.id === params.institutionId)
        );
      }
      if (params.search) {
        const query = params.search.toLowerCase();
        items = items.filter(
          (f) =>
            f.refNumber.toLowerCase().includes(query) ||
            f.bankName.toLowerCase().includes(query) ||
            (f.institution && f.institution.name.toLowerCase().includes(query))
        );
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

  getFDRById: async (id: string): Promise<FDR> => {
    try {
      const response = await apiClient.get<any>(`/fdrs/${id}`);
      const data = response.data?.data || response.data;
      return { ...data, id: data?._id || data?.id };
    } catch {
      const found = MOCK_FDRS.find((f) => f.id === id || f._id === id);
      if (found) return found;
      return MOCK_FDRS[0];
    }
  },

  createFDR: async (formData: FormData): Promise<FDR> => {
    try {
      const response = await apiClient.post<ApiResponse<FDR>>('/fdrs', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data.data;
    } catch {
      // Mock creation
      const refNumber = (formData.get('refNumber') as string) || `FDR-${Date.now().toString().slice(-6)}`;
      const bankName = (formData.get('bankName') as string) || 'State Bank of India';
      const branch = (formData.get('branch') as string) || 'Main Branch';
      const amount = Number(formData.get('amount')) || 5000000;
      const issueDate = (formData.get('issueDate') as string) || new Date().toISOString();
      const maturityDate = (formData.get('maturityDate') as string) || new Date(Date.now() + 86400000 * 365 * 3).toISOString();
      const institutionId = (formData.get('institutionId') as string) || 'inst-001';

      const newFdr: FDR = {
        id: `fdr-${Date.now()}`,
        institutionId,
        refNumber,
        bankName,
        branch,
        amount,
        currency: 'INR',
        issueDate,
        maturityDate,
        status: 'submitted',
        verificationStatus: 'pending',
        docHash: 'c7be8429184710db44199c011e4f9b882736109923812739182371928371928b',
        jointWithAICTE: true,
        lienMarkedToAICTE: true,
        metadata: {
          extractedRefNumber: refNumber,
          extractedAmount: amount,
          extractedBankName: bankName,
          confidenceScore: 0.96,
        },
        createdAt: new Date().toISOString(),
        daysToMaturity: 1095,
      };

      MOCK_FDRS.unshift(newFdr);
      return newFdr;
    }
  },

  updateFDRStatus: async (id: string, status: string): Promise<FDR> => {
    try {
      const response = await apiClient.patch<ApiResponse<FDR>>(`/fdrs/${id}/status`, { status });
      return response.data.data;
    } catch {
      const found = MOCK_FDRS.find((f) => f.id === id || f._id === id);
      if (found) {
        found.status = status as any;
        return found;
      }
      return MOCK_FDRS[0];
    }
  },

  getFDRLineage: async (id: string): Promise<LineageData> => {
    try {
      const response = await apiClient.get<ApiResponse<LineageData>>(`/fdrs/${id}/lineage`);
      return response.data.data;
    } catch {
      return MOCK_LINEAGE_DATA;
    }
  },

  getFDRFindings: async (id: string): Promise<VerificationFinding[]> => {
    try {
      const response = await apiClient.get<ApiResponse<VerificationFinding[]>>(`/fdrs/${id}/findings`);
      return response.data.data;
    } catch {
      const filtered = MOCK_FINDINGS.filter((f) => f.fdrId === id);
      return filtered.length > 0 ? filtered : [MOCK_FINDINGS[3], MOCK_FINDINGS[4]];
    }
  },
};
