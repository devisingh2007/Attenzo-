const rawApiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';

if (!process.env.EXPO_PUBLIC_API_URL) {
  console.warn(
    'Warning: EXPO_PUBLIC_API_URL is not set in mobile/.env. Defaulting to http://localhost:5000/api.'
  );
}

export const API_URL = rawApiUrl;

// Base server URL (removes trailing /api or /api/)
export const SERVER_BASE_URL = rawApiUrl.replace(/\/api\/?$/, '');
