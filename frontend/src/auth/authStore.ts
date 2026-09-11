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
    const sessionRaw = sessionStorage.getItem('cpd_user');
    if (sessionRaw) return JSON.parse(sessionRaw);
    const localRaw = localStorage.getItem('cpd_user');
    return localRaw ? JSON.parse(localRaw) : null;
  } catch {
    return null;
  }
};

const getStoredAccessToken = (): string | null => {
  try {
    return sessionStorage.getItem('cpd_access_token') || null;
  } catch {
    return null;
  }
};

const initialUser = getStoredUser();
const initialAccessToken = getStoredAccessToken();

export const useAuthStore = create<AuthState>((set) => ({
  user: initialUser,
  accessToken: initialAccessToken,
  isAuthenticated: !!initialUser,
  isLoading: !initialUser,

  setAuth: (user, accessToken, refreshToken) => {
    try {
      sessionStorage.setItem('cpd_user', JSON.stringify(user));
      sessionStorage.setItem('cpd_access_token', accessToken);
      localStorage.setItem('cpd_user', JSON.stringify(user));
      if (refreshToken) {
        sessionStorage.setItem('cpd_fallback_refresh', refreshToken);
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
      sessionStorage.removeItem('cpd_user');
      sessionStorage.removeItem('cpd_access_token');
      sessionStorage.removeItem('cpd_fallback_refresh');
      const localRaw = localStorage.getItem('cpd_user');
      if (localRaw) {
        try {
          const u = JSON.parse(localRaw);
          if (u.id === useAuthStore.getState().user?.id) {
            localStorage.removeItem('cpd_user');
            localStorage.removeItem('cpd_fallback_refresh');
          }
        } catch {
          localStorage.removeItem('cpd_user');
          localStorage.removeItem('cpd_fallback_refresh');
        }
      }
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

      // Prioritize tab-isolated refresh token from sessionStorage over shared localStorage
      const fallbackRefresh =
        sessionStorage.getItem('cpd_fallback_refresh') ||
        localStorage.getItem('cpd_fallback_refresh');

      // Call /api/auth/refresh passing this tab's own refresh token in the body
      const res = await axios.post(
        `${authBase}/auth/refresh`,
        { refreshToken: fallbackRefresh || undefined },
        { withCredentials: true }
      );

      if (res.data?.success && res.data?.data) {
        const { user, accessToken, refreshToken } = res.data.data;
        try {
          sessionStorage.setItem('cpd_user', JSON.stringify(user));
          sessionStorage.setItem('cpd_access_token', accessToken);
          localStorage.setItem('cpd_user', JSON.stringify(user));
          if (refreshToken) {
            sessionStorage.setItem('cpd_fallback_refresh', refreshToken);
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
      sessionStorage.removeItem('cpd_user');
      sessionStorage.removeItem('cpd_access_token');
      sessionStorage.removeItem('cpd_fallback_refresh');
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
