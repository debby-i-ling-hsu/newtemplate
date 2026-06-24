const fallbackApiBaseUrl = "http://localhost:8000/api/v1";

export const config = {
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || fallbackApiBaseUrl,
};
