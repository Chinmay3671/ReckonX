import React, { createContext, useContext, useState, useEffect } from 'react';
import type {
  SensorStatus,
  RouteState,
  TelemetryData,
  SettingsState,
  UserProfile,
  ToastState,
  NavigationContextType,
} from '../types/navigation';

const initialSensorStatus: SensorStatus = {
  accel: true,
  gyro: true,
  compass: false,
  gnss: false,
};

const initialRouteState: RouteState = {
  origin: '',
  destination: '',
  calculated: false,
  distance: '142.4 km',
  duration: '1h 54m',
  tunnelLength: '3.4 km',
  via: 'NH 65',
};

const initialTelemetry: TelemetryData = {
  speed: 54,
  drift: 0.6,
  eta: '4:38 PM',
  remainingKm: 86,
  ax: 0.24,
  ay: -0.08,
  az: 9.80,
  pitch: 0.0,
  roll: 1.2,
  yaw: -0.4,
};

const initialSettings: SettingsState = {
  highSpeedPolling: true,
  mapMatching: true,
  keepScreenAwake: true,
  offlineLogs: '18.4 MB',
};

const initialUser: UserProfile = {
  name: 'Alex Mercer',
  role: 'Fleet Driver',
  id: '#98241',
  avatar: 'AM',
  stats: {
    driven: '1,248 km',
    tunnels: 342,
    uptime: '99.1%',
  },
};

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sensorStatus, setSensorStatus] = useState<SensorStatus>(initialSensorStatus);
  const [routeState, setRouteState] = useState<RouteState>(initialRouteState);
  const [telemetry, setTelemetry] = useState<TelemetryData>(initialTelemetry);
  const [settings, setSettings] = useState<SettingsState>(initialSettings);
  const [user] = useState<UserProfile>(initialUser);
  const [toast, setToast] = useState<ToastState>({ show: false, message: '' });
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(true);

  // Real-time telemetry tick simulation (keeps speed & vectors responsive)
  useEffect(() => {
    const interval = setInterval(() => {
      setTelemetry((prev) => {
        const noiseX = (Math.random() - 0.5) * 0.04;
        const noiseY = (Math.random() - 0.5) * 0.04;
        const noiseZ = (Math.random() - 0.5) * 0.02;
        const speedNoise = (Math.random() - 0.5) * 0.6;
        const driftNoise = (Math.random() - 0.5) * 0.02;

        return {
          ...prev,
          speed: Math.max(0, Math.round((prev.speed + speedNoise) * 10) / 10),
          drift: Math.max(0.1, Math.round((prev.drift + driftNoise) * 100) / 100),
          ax: Math.round((0.24 + noiseX) * 100) / 100,
          ay: Math.round((-0.08 + noiseY) * 100) / 100,
          az: Math.round((9.80 + noiseZ) * 100) / 100,
          roll: Math.round((1.2 + noiseX * 2) * 10) / 10,
          yaw: Math.round((-0.4 + noiseY * 2) * 10) / 10,
        };
      });
    }, 250);

    return () => clearInterval(interval);
  }, []);

  const calibrateCompass = () => {
    setSensorStatus((prev) => ({ ...prev, compass: true }));
    showToast('Compass / Magnetometer Calibrated ✓');
  };

  const grantGnssPermission = () => {
    setSensorStatus((prev) => ({ ...prev, gnss: true }));
    showToast('High-Precision GNSS Access Granted ✓');
  };

  const grantAllSensors = () => {
    setSensorStatus({ accel: true, gyro: true, compass: true, gnss: true });
    showToast('All Hardware Sensors Granted & Active ✓');
  };

  const setRouteDestination = (destination: string) => {
    setRouteState({
      origin: 'Live Location: Solapur Operations Hub, MH',
      destination,
      calculated: true,
      distance: '142.4 km',
      duration: '1h 54m',
      tunnelLength: '3.4 km',
      via: 'NH 65',
    });
    showToast('Route Calculated (Solapur → Pune) ✓');
  };

  const updateOriginDestination = (origin: string, destination: string) => {
    setRouteState((prev) => ({
      ...prev,
      origin,
      destination,
      calculated: true,
    }));
  };

  const clearRoute = () => {
    setRouteState({
      origin: '',
      destination: '',
      calculated: false,
      distance: '142.4 km',
      duration: '1h 54m',
      tunnelLength: '3.4 km',
      via: 'NH 65',
    });
  };

  const toggleSetting = (key: keyof SettingsState) => {
    setSettings((prev) => ({
      ...prev,
      [key]: typeof prev[key] === 'boolean' ? !prev[key] : prev[key],
    }));
    showToast('Setting updated ✓');
  };

  const clearOfflineLogs = () => {
    setSettings((prev) => ({ ...prev, offlineLogs: '0 KB' }));
    showToast('Saved offline logs cleared (0 KB) ✓');
  };

  const showToast = (message: string) => {
    setToast({ show: true, message });
    setTimeout(() => {
      setToast({ show: false, message: '' });
    }, 3000);
  };

  const loginUser = () => {
    setIsLoggedIn(true);
    showToast('Logged in successfully ✓');
  };

  const logoutUser = () => {
    setIsLoggedIn(false);
    showToast('Logged out successfully');
  };

  return (
    <NavigationContext.Provider
      value={{
        sensorStatus,
        routeState,
        telemetry,
        settings,
        user,
        toast,
        isLoggedIn,
        calibrateCompass,
        grantGnssPermission,
        grantAllSensors,
        setRouteDestination,
        updateOriginDestination,
        clearRoute,
        toggleSetting,
        clearOfflineLogs,
        showToast,
        loginUser,
        logoutUser,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigationContext = (): NavigationContextType => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigationContext must be used within a NavigationProvider');
  }
  return context;
};
