import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'smartpresence_jwt_token';

/**
 * Token storage manager using Expo SecureStore.
 * Note: Under no circumstances should AsyncStorage be used for JWT tokens.
 */
export const tokenStorage = {
  /**
   * Securely saves the authentication token.
   */
  async saveToken(token: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(TOKEN_KEY, token);
        }
        return;
      }
      await SecureStore.setItemAsync(TOKEN_KEY, token);
    } catch (err) {
      console.error('Failed to save token to SecureStore:', err);
      throw err;
    }
  },

  /**
   * Retrieves the stored authentication token.
   */
  async getToken(): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          return window.localStorage.getItem(TOKEN_KEY);
        }
        return null;
      }
      return await SecureStore.getItemAsync(TOKEN_KEY);
    } catch (err) {
      console.error('Failed to get token from SecureStore:', err);
      return null;
    }
  },

  /**
   * Deletes the stored authentication token.
   */
  async deleteToken(): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(TOKEN_KEY);
        }
        return;
      }
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    } catch (err) {
      console.error('Failed to delete token from SecureStore:', err);
      throw err;
    }
  },
};
