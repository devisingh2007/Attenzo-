import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { API_URL } from '../constants/config';
import { tokenStorage } from './tokenStorage';
import { useAuthStore } from '../store/authStore';

export interface ApiErrorDetail {
  field: string;
  message: string;
}

export interface NormalizedApiError {
  status: number;
  code: string;
  message: string;
  details?: ApiErrorDetail[];
}

/**
 * Global Axios instance configured with 15s timeout and baseURL.
 */
export const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach Authorization Bearer token from SecureStore
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      const token = await tokenStorage.getToken();
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (err) {
      console.warn('Could not read auth token for request:', err);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Unwrap data & normalize errors
api.interceptors.response.use(
  (response) => {
    // Return backend payload directly (typically { success: true, data: ... })
    return response.data;
  },
  async (error: AxiosError<any>) => {
    let normalizedError: NormalizedApiError;

    if (!error.response) {
      // Network failure, DNS issue, or timeout
      const isTimeout = error.code === 'ECONNABORTED' || error.message.includes('timeout');
      normalizedError = {
        status: 0,
        code: isTimeout ? 'TIMEOUT_ERROR' : 'NETWORK_ERROR',
        message: isTimeout
          ? 'Request timed out after 15 seconds. Please try again.'
          : 'Unable to connect to server. Please check your internet connection.',
      };
    } else {
      const { status, data } = error.response;
      const errorData = data?.error;

      normalizedError = {
        status,
        code: errorData?.code || 'UNKNOWN_ERROR',
        message: errorData?.message || error.message || 'An unexpected error occurred.',
        details: Array.isArray(errorData?.details) ? errorData.details : undefined,
      };

      // Handle 401 Unauthorized (unless from login endpoint which represents bad credentials)
      const isLoginRequest = error.config?.url?.includes('/auth/login');
      if (status === 401 && !isLoginRequest) {
        try {
          await tokenStorage.deleteToken();
        } catch (err) {
          console.warn('Failed to delete token on 401:', err);
        }
        // Reset auth store (triggers root layout redirection to /login)
        useAuthStore.getState().logout();
      }
    }

    return Promise.reject(normalizedError);
  }
);
