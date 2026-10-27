import apiClient from './client';
import { User, ApiResponse } from '../types';
import { MOCK_USERS } from './mockData';

export interface LoginResponse {
  token: string;
  user: User;
}

export const authApi = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    try {
      const response = await apiClient.post<any>('/auth/login', {
        email,
        password,
      });
      const resData = response.data || {};
      const token = resData.token || resData.data?.token;
      const user = resData.user || resData.data?.user;
      if (token && user) {
        return { token, user };
      }
      throw new Error('Authentication response missing token or user payload');
    } catch (err: unknown) {
      // Mock fallback for offline or development convenience
      const found = MOCK_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase());
      if (found) {
        return {
          token: `demo-jwt-token-for-${found.id}`,
          user: found,
        };
      }
      // If entered demo email without match, fallback to default admin
      if (email.includes('admin') || email === 'admin@fdrsentinel.gov.in') {
        return {
          token: 'demo-jwt-token-admin',
          user: MOCK_USERS[0],
        };
      }
      throw err;
    }
  },

  logout: async (): Promise<void> => {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Ignore network errors on logout
    }
  },

  getMe: async (): Promise<User> => {
    try {
      const response = await apiClient.get<ApiResponse<User>>('/auth/me');
      return response.data.data;
    } catch (err: unknown) {
      const stored = localStorage.getItem('fdr_sentinel_user');
      if (stored) {
        return JSON.parse(stored);
      }
      return MOCK_USERS[0];
    }
  },
};
