export interface SensorStatus {
  accel: boolean;
  gyro: boolean;
  compass: boolean;
  gnss: boolean;
}

export interface RouteState {
  origin: string;
  destination: string;
  calculated: boolean;
  distance: string;
  duration: string;
  tunnelLength: string;
  via?: string;
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
  setRouteDestination: (destination: string) => void;
  updateOriginDestination: (origin: string, destination: string) => void;
  clearRoute: () => void;
  toggleSetting: (key: keyof SettingsState) => void;
  clearOfflineLogs: () => void;
  showToast: (msg: string) => void;
  loginUser: () => void;
  logoutUser: () => void;
}
