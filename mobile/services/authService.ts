import { api } from './api';
import { AuthUser } from '../store/authStore';

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  role: 'teacher' | 'student';
  rollNumber?: string;
  enrollmentNo?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthResponseData {
  user: AuthUser;
  token: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export const authService = {
  /**
   * Registers a new student or teacher account.
   */
  async register(payload: RegisterPayload): Promise<AuthResponseData> {
    const response = (await api.post('/auth/register', payload)) as unknown as ApiResponse<AuthResponseData>;
    return response.data;
  },

  /**
   * Logs in with email and password.
   */
  async login(payload: LoginPayload): Promise<AuthResponseData> {
    const response = (await api.post('/auth/login', payload)) as unknown as ApiResponse<AuthResponseData>;
    return response.data;
  },

  /**
   * Fetches current authenticated user profile.
   */
  async getMe(): Promise<AuthUser> {
    const response = (await api.get('/auth/me')) as unknown as ApiResponse<{ user: AuthUser }>;
    return response.data.user;
  },

  /**
   * Notifies backend of logout.
   */
  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      // Best-effort logout notification; even if request fails, client clears token
      console.warn('Backend logout error (stateless):', err);
    }
  },
};
