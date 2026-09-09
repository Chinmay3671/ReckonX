/**
 * Centralized Backend API Configuration
 * Used by backend-ready services (Auth, Profile, Tracking, Telemetry, Analytics).
 */

export const API_CONFIG = {
  // Configurable base URL for future backend integration (supports Vite env)
  BASE_URL:
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) ||
    'https://api.reckonx-navigation.local/v1',
  TIMEOUT_MS: 10000,
  ENDPOINTS: {
    AUTH_LOGIN: '/auth/login',
    AUTH_LOGOUT: '/auth/logout',
    AUTH_REFRESH: '/auth/refresh',
    AUTH_SESSION: '/auth/session',
    PROFILE_GET: '/profile',
    PROFILE_UPDATE: '/profile',
    TRACKING_START: '/tracking/start',
    TRACKING_POINTS: '/tracking/points',
    TRACKING_END: '/tracking/end',
    TRACKING_HISTORY: '/tracking/history',
    TELEMETRY_STREAM: '/telemetry/stream',
    ANALYTICS_SUMMARY: '/analytics/summary',
  },
};
