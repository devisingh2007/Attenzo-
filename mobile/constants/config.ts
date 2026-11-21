const rawApiUrl = process.env.EXPO_PUBLIC_API_URL;

if (!rawApiUrl) {
  throw new Error(
    'Missing required environment variable EXPO_PUBLIC_API_URL. Please define it in your mobile/.env file.'
  );
}

export const API_URL = rawApiUrl;

// Base server URL (removes trailing /api or /api/)
export const SERVER_BASE_URL = rawApiUrl.replace(/\/api\/?$/, '');
