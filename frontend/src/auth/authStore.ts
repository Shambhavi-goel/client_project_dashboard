import { create } from 'zustand';
import { User } from '../types';
import axios from 'axios';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (user: User, accessToken: string) => void;
  clearAuth: () => void;
  checkAuth: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: true,

  setAuth: (user, accessToken) =>
    set({
      user,
      accessToken,
      isAuthenticated: true,
      isLoading: false,
    }),

  clearAuth: () =>
    set({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
    }),

  checkAuth: async () => {
    try {
      // Call /api/auth/refresh using credentials so browser sends HttpOnly cookie
      const res = await axios.post(
        '/api/auth/refresh',
        {},
        { withCredentials: true }
      );

      if (res.data?.success && res.data?.data) {
        const { user, accessToken } = res.data.data;
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

    set({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
    });
    return false;
  },
}));
