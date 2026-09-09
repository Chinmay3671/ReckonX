import { API_CONFIG } from '../../config/apiConfig';
import { apiClient } from './apiClient';
import { AuthService } from './authService';

export interface BackendUserProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  avatarUrl?: string;
  fleetId?: string;
  createdAt?: string;
  statistics?: {
    totalDistanceKm: number;
    totalTunnelsCompleted: number;
    totalActiveHours: number;
    drAccuracyPercentage: number;
  };
}

export const ProfileService = {
  /**
   * Fetch authenticated user profile from backend
   */
  async getProfile(): Promise<BackendUserProfile | null> {
    const session = AuthService.getLocalSession();
    if (!session?.token) {
      return null;
    }

    try {
      return await apiClient<BackendUserProfile>(API_CONFIG.ENDPOINTS.PROFILE_GET, {
        headers: {
          Authorization: `Bearer ${session.token}`,
        },
      });
    } catch {
      return null;
    }
  },

  /**
   * Update user profile settings on backend
   */
  async updateProfile(profileData: Partial<BackendUserProfile>): Promise<BackendUserProfile> {
    const session = AuthService.getLocalSession();
    if (!session?.token) {
      throw new Error('No active authentication session.');
    }

    return apiClient<BackendUserProfile>(API_CONFIG.ENDPOINTS.PROFILE_UPDATE, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${session.token}`,
      },
      body: JSON.stringify(profileData),
    });
  },
};
