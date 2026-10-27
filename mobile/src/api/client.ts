import axios from 'axios';
import { Platform } from 'react-native';
import { FDR, DashboardStats, NotificationItem, User } from '../types';

// Default smart fallback based on platform
export const getDefaultServerUrl = (): string => {
  if (Platform.OS === 'web') {
    return 'http://localhost:5000/api';
  }
  // Physical mobile device on local Wi-Fi network
  return 'http://192.168.1.35:5000/api';
};

let currentBaseUrl = getDefaultServerUrl();
let authToken: string | null = null;

export const api = axios.create({
  baseURL: currentBaseUrl,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const setServerUrl = (url: string) => {
  let cleanUrl = url.trim();
  if (!cleanUrl.endsWith('/api')) {
    cleanUrl = cleanUrl.replace(/\/+$/, '') + '/api';
  }
  currentBaseUrl = cleanUrl;
  api.defaults.baseURL = cleanUrl;
};

export const getServerUrl = () => currentBaseUrl;

export const setAuthToken = (token: string | null) => {
  authToken = token;
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

export const getAuthToken = () => authToken;

// API Methods
export const apiService = {
  // Auth
  async login(email: string, password: string): Promise<{ token: string; user: User }> {
    const res = await api.post('/auth/login', { email, password });
    const { token, user } = res.data;
    setAuthToken(token);
    return { token, user };
  },

  // Health
  async checkHealth(): Promise<boolean> {
    try {
      const res = await api.get('/health');
      return res.status === 200;
    } catch {
      return false;
    }
  },

  // Dashboard Stats
  async getDashboardSummary(): Promise<DashboardStats> {
    const res = await api.get('/dashboard/summary');
    const data = res.data?.data || res.data;
    return {
      totalFdrs: data.totalFdrs || data.total || 0,
      activeFdrs: data.activeFdrs || data.active || 0,
      approachingMaturity: data.approachingMaturity || data.approaching_maturity || 0,
      pendingVerification: data.pendingVerification || data.pending_verification || 0,
      needsClarification: data.needsClarification || data.clarification_required || 0,
      releasePending: data.releasePending || data.release_pending || 0,
      totalDepositValue: data.totalDepositValue || data.total_guarantee_amount || 0,
    };
  },

  // FDRs
  async getFDRs(params?: { status?: string; search?: string }): Promise<FDR[]> {
    const res = await api.get('/fdrs', { params: { limit: 100, ...params } });
    const items = res.data?.items || res.data?.data || [];
    return items.map((item: any) => ({
      ...item,
      id: item._id || item.id,
    }));
  },

  async getFDRById(id: string): Promise<FDR> {
    const res = await api.get(`/fdrs/${id}`);
    const data = res.data?.data || res.data;
    return {
      ...data,
      id: data._id || data.id,
    };
  },

  // Upload FDR with Document
  async submitFDR(formData: FormData): Promise<any> {
    const res = await api.post('/fdrs', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },

  // Notifications
  async getNotifications(): Promise<{ items: NotificationItem[]; unreadCount: number }> {
    const res = await api.get('/notifications');
    const items = res.data?.data || [];
    return {
      items,
      unreadCount: res.data?.unreadCount || items.filter((n: any) => !n.read).length,
    };
  },

  // Release Requests
  async createReleaseRequest(fdrId: string, reason: string): Promise<any> {
    const res = await api.post('/releases', { fdrId, reason });
    return res.data;
  },
};
