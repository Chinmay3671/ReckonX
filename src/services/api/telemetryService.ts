import { API_CONFIG } from '../../config/apiConfig';
import { apiClient } from './apiClient';
import { AuthService } from './authService';

export interface SensorTelemetryBatch {
  sessionId?: string;
  timestamp: number;
  sampleRateHz: number;
  accel: { ax: number; ay: number; az: number };
  gyro: { gx?: number; gy?: number; gz?: number };
  orientation: { alpha: number | null; beta: number | null; gamma: number | null };
}

export interface SessionAnalyticsSummary {
  sessionId: string;
  totalDistanceKm: number;
  durationSeconds: number;
  averageSpeedKmH: number;
  maxSpeedKmH: number;
  gnssOutageDurationSeconds: number;
  drAccuracyScore: number;
  totalPointsLogged: number;
}

export const TelemetryService = {
  /**
   * Send high-rate sensor readings batch to backend
   */
  async streamSensorBatch(batch: SensorTelemetryBatch): Promise<{ status: string }> {
    const session = AuthService.getLocalSession();
    return apiClient<{ status: string }>(API_CONFIG.ENDPOINTS.TELEMETRY_STREAM, {
      method: 'POST',
      headers: session?.token ? { Authorization: `Bearer ${session.token}` } : {},
      body: JSON.stringify(batch),
    });
  },
};

export const AnalyticsService = {
  /**
   * Fetch session analytics summary
   */
  async getSummary(sessionId: string): Promise<SessionAnalyticsSummary> {
    const session = AuthService.getLocalSession();
    return apiClient<SessionAnalyticsSummary>(`${API_CONFIG.ENDPOINTS.ANALYTICS_SUMMARY}?sessionId=${sessionId}`, {
      headers: session?.token ? { Authorization: `Bearer ${session.token}` } : {},
    });
  },
};
