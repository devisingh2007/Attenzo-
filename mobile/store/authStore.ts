import { create } from 'zustand';
import { tokenStorage } from '../services/tokenStorage';
import { authService, LoginPayload, RegisterPayload } from '../services/authService';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'teacher' | 'student';
  rollNumber?: string;
  enrollmentNo?: string;
  department?: string;
  createdAt?: string;
}

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated';

export interface AuthState {
  user: AuthUser | null;
  token: string | null;
  status: AuthStatus;
  bootstrap: () => Promise<void>;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: AuthUser, token: string) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  status: 'idle',

  /**
   * Initializes auth on app startup. Reads token from SecureStore and verifies via GET /auth/me.
   */
  bootstrap: async () => {
    set({ status: 'loading' });
    try {
      const token = await tokenStorage.getToken();
      if (!token) {
        set({ user: null, token: null, status: 'unauthenticated' });
        return;
      }

      // Validate token with live backend
      const user = await authService.getMe();
      set({ user, token, status: 'authenticated' });
    } catch (err) {
      console.warn('Auth bootstrap failed or token expired:', err);
      try {
        await tokenStorage.deleteToken();
      } catch (deleteErr) {
        console.warn('Could not delete invalid token:', deleteErr);
      }
      set({ user: null, token: null, status: 'unauthenticated' });
    }
  },

  /**
   * Logs in with email and password via POST /auth/login.
   */
  login: async (payload: LoginPayload) => {
    const data = await authService.login(payload);
    await tokenStorage.saveToken(data.token);
    set({
      user: data.user,
      token: data.token,
      status: 'authenticated',
    });
  },

  /**
   * Registers a new account via POST /auth/register.
   */
  register: async (payload: RegisterPayload) => {
    const data = await authService.register(payload);
    await tokenStorage.saveToken(data.token);
    set({
      user: data.user,
      token: data.token,
      status: 'authenticated',
    });
  },

  /**
   * Logs out: notifies server, clears SecureStore, and resets auth store.
   */
  logout: async () => {
    try {
      await authService.logout();
    } catch (err) {
      console.warn('Backend logout request failed:', err);
    }
    try {
      await tokenStorage.deleteToken();
    } catch (err) {
      console.warn('Failed to delete token from SecureStore:', err);
    }
    set({
      user: null,
      token: null,
      status: 'unauthenticated',
    });
  },

  /**
   * Directly sets user and token in state.
   */
  setUser: (user: AuthUser, token: string) =>
    set({
      user,
      token,
      status: 'authenticated',
    }),
}));
