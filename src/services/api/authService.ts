import { API_CONFIG } from '../../config/apiConfig';
import { apiClient } from './apiClient';

export interface LoginCredentials {
  email: string;
  pinOrPassword?: string;
  rememberDevice?: boolean;
}

export interface AuthSession {
  token: string;
  refreshToken?: string;
  expiresAt: number;
  user: {
    id: string;
    email: string;
    name?: string;
    role?: string;
  };
}

export interface AuthState {
  isAuthenticated: boolean;
  isBackendConnected: boolean;
  session: AuthSession | null;
  statusMessage: string;
}

const AUTH_STORAGE_KEY = 'reckonx_auth_session';

export const AuthService = {
  /**
   * Check local saved session token
   */
  getLocalSession(): AuthSession | null {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (!stored) return null;
      const session = JSON.parse(stored) as AuthSession;
      if (session.expiresAt && Date.now() > session.expiresAt) {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        return null;
      }
      return session;
    } catch {
      return null;
    }
  },

  /**
   * Attempt login with future backend API.
   * If backend is not connected, returns honest pending state without faking credentials.
   */
  async login(credentials: LoginCredentials): Promise<AuthSession> {
    const result = await apiClient<AuthSession>(API_CONFIG.ENDPOINTS.AUTH_LOGIN, {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    if (credentials.rememberDevice && result.token) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(result));
    }

    return result;
  },

  /**
   * End session and revoke tokens
   */
  async logout(): Promise<void> {
    try {
      const session = AuthService.getLocalSession();
      if (session?.token) {
        await apiClient(API_CONFIG.ENDPOINTS.AUTH_LOGOUT, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.token}`,
          },
        }).catch(() => {
          // Ignore network errors during logout
        });
      }
    } finally {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  },

  /**
   * Refresh session token with backend
   */
  async refreshToken(): Promise<AuthSession | null> {
    const session = AuthService.getLocalSession();
    if (!session?.refreshToken) return null;

    try {
      const refreshed = await apiClient<AuthSession>(API_CONFIG.ENDPOINTS.AUTH_REFRESH, {
        method: 'POST',
        body: JSON.stringify({ refreshToken: session.refreshToken }),
      });
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(refreshed));
      return refreshed;
    } catch {
      return null;
    }
  },
};
