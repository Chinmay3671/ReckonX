import type { RecordedGPSPoint } from '../services/api/trackingService';

export type OperationalMatrixScenario =
  | 'scenario1' // [GPS ON + Net ON] — Standard Online Navigation
  | 'scenario2' // [GPS OFF + Net ON] — GNSS Outage / Tunnel Mode
  | 'scenario3' // [GPS ON + Net OFF] — Pure Offline Satellite Mode
  | 'scenario4'; // [GPS OFF + Net OFF] — Pure Offline Dead Reckoning

export interface SensorStatus {
  accel: boolean;
  gyro: boolean;
  compass: boolean;
  gnss: boolean;
  hasMotionHardware?: boolean;
  hasOrientationHardware?: boolean;
}

export interface RouteStep {
  maneuverType: string;
  modifier?: string;
  name: string;
  distanceMeters: number;
  durationSec: number;
  instruction: string;
}

export interface RouteOption {
  id: string;
  index: number;
  coordinates: [number, number][];
  distanceKm: number;
  durationMin: number;
  label: 'Recommended' | 'Fastest' | 'Shortest' | 'Alternative';
  summary: string;
  steps: RouteStep[];
}

export interface RouteState {
  origin: string;
  destination: string;
  startCoords: [number, number] | null;
  destCoords: [number, number] | null;
  routes: RouteOption[];
  selectedRouteIndex: number;
  routeCoordinates: [number, number][];
  calculated: boolean;
  distance: string;
  duration: string;
  distanceKm: number;
  durationMin: number;
  tunnelLength: string;
  via?: string;
  steps?: RouteStep[];
  isCalculating: boolean;
  isAcquiringLocation: boolean;
  error?: string | null;
  isFallbackRoute?: boolean;
}

export interface TelemetryData {
  speed: number;
  drift: number;
  eta: string;
  remainingKm: number;
  ax: number;
  ay: number;
  az: number;
  pitch: number;
  roll: number;
  yaw: number;
  sampleRateHz: number;
  isStreamingMotion: boolean;
  isStreamingOrientation: boolean;
  lastEventTimestamp: number | null;
}

export interface SettingsState {
  highSpeedPolling: boolean;
  mapMatching: boolean;
  keepScreenAwake: boolean;
  autoCenterVehicle: boolean;
  speedUnit: 'km/h' | 'mph';
  distanceUnit: 'km' | 'mi';
  offlineLogs: string;
}

export interface UserProfile {
  name: string;
  role: string;
  id: string;
  email: string;
  isBackendConnected: boolean;
  avatar: string;
  stats?: {
    driven: string;
    tunnels: number;
    uptime: string;
  };
}

export interface SensorEventLogEntry {
  id: string;
  timestamp: number;
  type: 'devicemotion' | 'deviceorientation' | 'geolocation';
  summary: string;
  details: Record<string, any>;
}

export interface ActiveTrackingSession {
  isActive: boolean;
  sessionId: string;
  startTime: number | null;
  endTime: number | null;
  points: RecordedGPSPoint[];
  totalDistanceKm: number;
  maxSpeedKmH: number;
  averageSpeedKmH: number;
  gnssPointsCount: number;
  drPointsCount: number;
  gnssOutageDurationSec: number;
}

export interface ToastState {
  show: boolean;
  message: string;
}

export interface NavigationContextType {
  sensorStatus: SensorStatus;
  routeState: RouteState;
  telemetry: TelemetryData;
  settings: SettingsState;
  user: UserProfile;
  toast: ToastState;
  isLoggedIn: boolean;
  isOnline: boolean;
  matrixScenario: OperationalMatrixScenario;
  cachedTilesCount: number;
  sensorEventsStream: SensorEventLogEntry[];
  trackingSession: ActiveTrackingSession;

  // Actions
  setMatrixScenario: (scenario: OperationalMatrixScenario) => void;
  calibrateCompass: () => Promise<void>;
  grantGnssPermission: () => void;
  grantAllSensors: () => Promise<void>;
  acquireLiveLocation: () => Promise<void>;
  setStartCoordsAndAddress: (coords: [number, number], address: string) => Promise<void>;
  setDestCoordsAndAddress: (coords: [number, number], address: string) => Promise<void>;
  setRouteDestination: (destination: string) => void;
  updateOriginDestination: (origin: string, destination: string) => void;
  calculateDynamicRoute: (start?: [number, number], dest?: [number, number]) => Promise<void>;
  selectRoute: (index: number) => void;
  swapLocations: () => void;
  clearRoute: () => void;
  toggleSetting: (key: keyof SettingsState) => void;
  updateSettingValue: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void;
  clearOfflineLogs: () => void;
  clearTileCache: () => Promise<void>;
  showToast: (msg: string) => void;
  loginUser: (email?: string) => void;
  logoutUser: () => void;
  startTrackingSession: () => void;
  stopTrackingSession: () => void;
  recordSessionPoint: (point: RecordedGPSPoint) => void;
  exportCurrentSessionLogs: () => { success: boolean; message: string };
  resetSensorZeroPoint: () => void;
}
