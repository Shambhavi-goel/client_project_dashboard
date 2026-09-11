import { create } from 'zustand';
import { User } from '../types';
import axios from 'axios';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (user: User, accessToken: string, refreshToken?: string) => void;
  clearAuth: () => void;
  checkAuth: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: true,

  setAuth: (user, accessToken, refreshToken) => {
    if (refreshToken) {
      localStorage.setItem('cpd_fallback_refresh', refreshToken);
    }
    set({
      user,
      accessToken,
      isAuthenticated: true,
      isLoading: false,
    });
  },

  clearAuth: () => {
    localStorage.removeItem('cpd_fallback_refresh');
    set({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },

  checkAuth: async () => {
    try {
      const rawApi = import.meta.env.VITE_API_URL;
      const authBase = rawApi
        ? `${rawApi.replace(/\/$/, '')}/api`
        : '/api';

      const fallbackRefresh = localStorage.getItem('cpd_fallback_refresh');

      // Call /api/auth/refresh using credentials so browser sends HttpOnly cookie (or body fallback)
      const res = await axios.post(
        `${authBase}/auth/refresh`,
        { refreshToken: fallbackRefresh || undefined },
        { withCredentials: true }
      );

      if (res.data?.success && res.data?.data) {
        const { user, accessToken, refreshToken } = res.data.data;
        if (refreshToken) {
          localStorage.setItem('cpd_fallback_refresh', refreshToken);
        }
        set({
          user,
          accessToken,
          isAuthenticated: true,
          isLoading: false,
        });
        return true;
      }
    } catch {
      // No active session or expired
    }

    localStorage.removeItem('cpd_fallback_refresh');
    set({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
    });
    return false;
  },
}));
