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

const getStoredUser = (): User | null => {
  try {
    const raw = localStorage.getItem('cpd_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const initialUser = getStoredUser();

export const useAuthStore = create<AuthState>((set) => ({
  user: initialUser,
  accessToken: null,
  isAuthenticated: !!initialUser,
  isLoading: !initialUser,

  setAuth: (user, accessToken, refreshToken) => {
    try {
      localStorage.setItem('cpd_user', JSON.stringify(user));
      if (refreshToken) {
        localStorage.setItem('cpd_fallback_refresh', refreshToken);
      }
    } catch {
      // Ignore storage errors
    }
    set({
      user,
      accessToken,
      isAuthenticated: true,
      isLoading: false,
    });
  },

  clearAuth: () => {
    try {
      localStorage.removeItem('cpd_user');
      localStorage.removeItem('cpd_fallback_refresh');
    } catch {
      // Ignore storage errors
    }
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
        try {
          localStorage.setItem('cpd_user', JSON.stringify(user));
          if (refreshToken) {
            localStorage.setItem('cpd_fallback_refresh', refreshToken);
          }
        } catch {
          // Ignore storage errors
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

    try {
      localStorage.removeItem('cpd_user');
      localStorage.removeItem('cpd_fallback_refresh');
    } catch {
      // Ignore storage errors
    }
    set({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
    });
    return false;
  },
}));
