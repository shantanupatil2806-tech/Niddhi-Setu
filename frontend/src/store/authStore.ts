import { create } from 'zustand';
import { User } from '../types';
import { authApi } from '../api/auth';
import toast from 'react-hot-toast';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  initAuth: () => void;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,

  initAuth: () => {
    try {
      const token = localStorage.getItem('fdr_sentinel_token');
      const userStr = localStorage.getItem('fdr_sentinel_user');

      if (token && userStr) {
        const user = JSON.parse(userStr);
        set({
          token,
          user,
          isAuthenticated: true,
          isLoading: false,
        });
        return;
      }
    } catch {
      localStorage.removeItem('fdr_sentinel_token');
      localStorage.removeItem('fdr_sentinel_user');
    }

    set({
      token: null,
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },

  login: async (email: string, password: string): Promise<boolean> => {
    try {
      set({ isLoading: true });
      const { token, user } = await authApi.login(email, password);

      localStorage.setItem('fdr_sentinel_token', token);
      localStorage.setItem('fdr_sentinel_user', JSON.stringify(user));

      set({
        token,
        user,
        isAuthenticated: true,
        isLoading: false,
      });

      toast.success(`Welcome back, ${user.name}`);
      return true;
    } catch (err: any) {
      set({ isLoading: false });
      const message = err?.response?.data?.message || 'Invalid credentials. Please verify your email & password.';
      toast.error(message);
      return false;
    }
  },

  logout: async () => {
    try {
      await authApi.logout();
    } catch {
      // Continue client cleanup
    } finally {
      localStorage.removeItem('fdr_sentinel_token');
      localStorage.removeItem('fdr_sentinel_user');
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      });
      toast.success('Signed out successfully');
    }
  },

  setUser: (user: User) => {
    localStorage.setItem('fdr_sentinel_user', JSON.stringify(user));
    set({ user });
  },
}));
