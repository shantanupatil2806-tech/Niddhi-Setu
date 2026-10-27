import apiClient from './client';
import { Institution, PaginatedResponse, ApiResponse, FDR } from '../types';
import { MOCK_INSTITUTIONS, MOCK_FDRS } from './mockData';

export interface InstitutionFilterParams {
  type?: string;
  status?: string;
  city?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export const institutionsApi = {
  getInstitutions: async (params: InstitutionFilterParams = {}): Promise<PaginatedResponse<Institution>> => {
    try {
      const response = await apiClient.get<any>('/institutions', {
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
      const normalizedItems: Institution[] = rawList.map((inst: any) => ({
        ...inst,
        id: inst._id || inst.id,
      }));
      return {
        items: normalizedItems,
        total: pagination?.total ?? normalizedItems.length,
        page: pagination?.page ?? (params.page || 1),
        limit: pagination?.limit ?? (params.limit || 10),
        totalPages: (pagination?.pages ?? Math.ceil(normalizedItems.length / (params.limit || 10))) || 1,
      };
    } catch {
      let items = [...MOCK_INSTITUTIONS];
      if (params.type && params.type !== 'all') {
        items = items.filter((inst) => inst.type === params.type);
      }
      if (params.status && params.status !== 'all') {
        items = items.filter((inst) => inst.status === params.status);
      }
      if (params.city && params.city !== 'all') {
        items = items.filter((inst) => {
          const city = typeof inst.address === 'object' ? inst.address.city : inst.city;
          return city?.toLowerCase() === params.city?.toLowerCase();
        });
      }
      if (params.search) {
        const query = params.search.toLowerCase();
        items = items.filter(
          (inst) =>
            inst.name.toLowerCase().includes(query) ||
            inst.code.toLowerCase().includes(query) ||
            inst.contactEmail.toLowerCase().includes(query)
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

  getInstitutionById: async (id: string): Promise<Institution> => {
    try {
      const response = await apiClient.get<any>(`/institutions/${id}`);
      const data = response.data?.data || response.data;
      return { ...data, id: data?._id || data?.id };
    } catch {
      const found = MOCK_INSTITUTIONS.find((inst) => inst.id === id || inst._id === id);
      if (found) return found;
      return MOCK_INSTITUTIONS[0];
    }
  },

  createInstitution: async (data: Partial<Institution>): Promise<Institution> => {
    try {
      const response = await apiClient.post<any>('/institutions', data);
      const res = response.data?.data || response.data;
      return { ...res, id: res?._id || res?.id };
    } catch {
      const newInst: Institution = {
        id: `inst-${Date.now()}`,
        name: data.name || 'New College of Technology',
        code: data.code || `AICTE-RO-1-${Math.floor(1000000 + Math.random() * 9000000)}`,
        type: data.type || 'Engineering & Technology',
        address: data.address || {
          street: 'Main Campus',
          city: 'Pune',
          state: 'Maharashtra',
        },
        contactEmail: data.contactEmail || 'admin@newcollege.edu',
        status: 'active',
        approvalDate: new Date().toISOString(),
        totalFDRs: 0,
        totalAmount: 0,
        createdAt: new Date().toISOString(),
      };
      MOCK_INSTITUTIONS.push(newInst);
      return newInst;
    }
  },

  updateInstitution: async (id: string, data: Partial<Institution>): Promise<Institution> => {
    try {
      const response = await apiClient.patch<any>(`/institutions/${id}`, data);
      const res = response.data?.data || response.data;
      return { ...res, id: res?._id || res?.id };
    } catch {
      const inst = MOCK_INSTITUTIONS.find((i) => i.id === id || i._id === id);
      if (inst) {
        Object.assign(inst, data);
        return inst;
      }
      return MOCK_INSTITUTIONS[0];
    }
  },

  getInstitutionFdrs: async (id: string): Promise<FDR[]> => {
    try {
      const response = await apiClient.get<any>(`/institutions/${id}/fdrs`);
      const data = response.data?.data || response.data;
      const list = Array.isArray(data) ? data : data?.items || [];
      return list.map((f: any) => ({ ...f, id: f._id || f.id }));
    } catch {
      return MOCK_FDRS.filter(
        (f) => f.institutionId === id || (typeof f.institutionId === 'object' && f.institutionId?.id === id)
      );
    }
  },
};
