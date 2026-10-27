import apiClient from './client';
import { RelationshipGraphData, ApiResponse } from '../types';
import { MOCK_GRAPH_DATA } from './mockData';

export const graphApi = {
  getInstitutionGraph: async (institutionId: string): Promise<RelationshipGraphData> => {
    try {
      const response = await apiClient.get<ApiResponse<RelationshipGraphData>>(`/graph/institution/${institutionId}`);
      return response.data.data;
    } catch {
      return MOCK_GRAPH_DATA;
    }
  },

  getFDRGraph: async (fdrId: string): Promise<RelationshipGraphData> => {
    try {
      const response = await apiClient.get<ApiResponse<RelationshipGraphData>>(`/graph/fdr/${fdrId}`);
      return response.data.data;
    } catch {
      return MOCK_GRAPH_DATA;
    }
  },
};
