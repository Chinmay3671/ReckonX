import { API_CONFIG } from '../../config/apiConfig';
import { apiClient } from './apiClient';
import { AuthService } from './authService';

export interface RecordedGPSPoint {
  timestamp: number;
  lat: number;
  lng: number;
  accuracyMeters?: number;
  speedKmH?: number;
  headingDeg?: number;
  altitudeMeters?: number | null;
  isDeadReckoning?: boolean;
}

export interface TrackingSessionPayload {
  sessionId: string;
  startTime: number;
  endTime?: number;
  originAddress: string;
  destAddress: string;
  startCoords: [number, number];
  destCoords: [number, number];
  points: RecordedGPSPoint[];
  totalDistanceKm: number;
  durationSeconds: number;
  gnssPointsCount: number;
  drPointsCount: number;
}

export const TrackingService = {
  /**
   * Start a tracking session on the backend
   */
  async startSession(origin: string, destination: string, start: [number, number], dest: [number, number]): Promise<{ sessionId: string }> {
    const session = AuthService.getLocalSession();
    return apiClient<{ sessionId: string }>(API_CONFIG.ENDPOINTS.TRACKING_START, {
      method: 'POST',
      headers: session?.token ? { Authorization: `Bearer ${session.token}` } : {},
      body: JSON.stringify({ origin, destination, start, dest, timestamp: Date.now() }),
    });
  },

  /**
   * Stream a batch of recorded GPS & DR points to the backend
   */
  async sendPointsBatch(sessionId: string, points: RecordedGPSPoint[]): Promise<{ received: number }> {
    const session = AuthService.getLocalSession();
    return apiClient<{ received: number }>(API_CONFIG.ENDPOINTS.TRACKING_POINTS, {
      method: 'POST',
      headers: session?.token ? { Authorization: `Bearer ${session.token}` } : {},
      body: JSON.stringify({ sessionId, points }),
    });
  },

  /**
   * Conclude tracking session on backend
   */
  async endSession(payload: TrackingSessionPayload): Promise<{ success: boolean; summaryId?: string }> {
    const session = AuthService.getLocalSession();
    return apiClient<{ success: boolean; summaryId?: string }>(API_CONFIG.ENDPOINTS.TRACKING_END, {
      method: 'POST',
      headers: session?.token ? { Authorization: `Bearer ${session.token}` } : {},
      body: JSON.stringify(payload),
    });
  },
};
