export interface SensorStatus {
  accel: boolean;
  gyro: boolean;
  compass: boolean;
  gnss: boolean;
}

export interface RouteState {
  origin: string;
  destination: string;
  startCoords: [number, number] | null;
  destCoords: [number, number] | null;
  routeCoordinates: [number, number][];
  calculated: boolean;
  distance: string;
  duration: string;
  distanceKm: number;
  durationMin: number;
  tunnelLength: string;
  via?: string;
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
}

export interface SettingsState {
  highSpeedPolling: boolean;
  mapMatching: boolean;
  keepScreenAwake: boolean;
  offlineLogs: string;
}

export interface UserProfile {
  name: string;
  role: string;
  id: string;
  avatar: string;
  stats: {
    driven: string;
    tunnels: number;
    uptime: string;
  };
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

  // Actions
  calibrateCompass: () => void;
  grantGnssPermission: () => void;
  grantAllSensors: () => void;
  acquireLiveLocation: () => Promise<void>;
  setStartCoordsAndAddress: (coords: [number, number], address: string) => Promise<void>;
  setDestCoordsAndAddress: (coords: [number, number], address: string) => Promise<void>;
  setRouteDestination: (destination: string) => void;
  updateOriginDestination: (origin: string, destination: string) => void;
  calculateDynamicRoute: (start?: [number, number], dest?: [number, number]) => Promise<void>;
  swapLocations: () => void;
  clearRoute: () => void;
  toggleSetting: (key: keyof SettingsState) => void;
  clearOfflineLogs: () => void;
  showToast: (msg: string) => void;
  loginUser: () => void;
  logoutUser: () => void;
}
