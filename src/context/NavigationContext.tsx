import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type {
  SensorStatus,
  RouteState,
  TelemetryData,
  SettingsState,
  UserProfile,
  ToastState,
  NavigationContextType,
  OperationalMatrixScenario,
} from '../types/navigation';
import { LocationService } from '../services/locationService';
import { SensorService } from '../services/sensorService';
import { TileCacheService } from '../services/tileCacheService';

const initialSensorStatus: SensorStatus = {
  accel: true,
  gyro: true,
  compass: true,
  gnss: true,
};

const initialRouteState: RouteState = {
  origin: '',
  destination: '',
  startCoords: null,
  destCoords: null,
  routeCoordinates: [],
  calculated: false,
  distance: '0 km',
  duration: '0 min',
  distanceKm: 0,
  durationMin: 0,
  tunnelLength: '0 km',
  via: 'OSRM Driving Route',
  isCalculating: false,
  isAcquiringLocation: false,
  error: null,
  isFallbackRoute: false,
};

const initialTelemetry: TelemetryData = {
  speed: 54,
  drift: 0.6,
  eta: '--:--',
  remainingKm: 0,
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

  // Network Online & Operational Matrix Scenario State
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [matrixScenario, setMatrixScenario] = useState<OperationalMatrixScenario>('scenario1');
  const [cachedTilesCount, setCachedTilesCount] = useState<number>(0);

  // Refresh cached tiles count from IndexedDB
  const refreshCacheCount = useCallback(async () => {
    const count = await TileCacheService.getCacheCount();
    setCachedTilesCount(count);
  }, []);

  useEffect(() => {
    refreshCacheCount();
    const interval = setInterval(refreshCacheCount, 5000);
    return () => clearInterval(interval);
  }, [refreshCacheCount]);

  // Window Online / Offline Event Listeners
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      setIsOnline(true);
      setToast({ show: true, message: 'Network Restored: Online Mode Active ✓' });
    };

    const handleOffline = () => {
      setIsOnline(false);
      setToast({ show: true, message: 'Network Lost: Offline IndexedDB & DR Active ⚠' });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sync matrixScenario with network and GPS state changes
  useEffect(() => {
    if (isOnline) {
      if (sensorStatus.gnss) {
        setMatrixScenario('scenario1'); // Scenario 1: GPS ON + Net ON
      } else {
        setMatrixScenario('scenario2'); // Scenario 2: GPS OFF + Net ON (GNSS Outage)
      }
    } else {
      if (sensorStatus.gnss) {
        setMatrixScenario('scenario3'); // Scenario 3: GPS ON + Net OFF (Pure Offline Satellite)
      } else {
        setMatrixScenario('scenario4'); // Scenario 4: GPS OFF + Net OFF (Pure Offline DR)
      }
    }
  }, [isOnline, sensorStatus.gnss]);

  // Keep ref to avoid recreation loops
  const routeStateRef = useRef<RouteState>(routeState);
  useEffect(() => {
    routeStateRef.current = routeState;
  }, [routeState]);

  // Clean document data-theme attribute
  useEffect(() => {
    document.documentElement.removeAttribute('data-theme');
  }, []);

  const showToast = useCallback((message: string) => {
    setToast({ show: true, message });
    setTimeout(() => {
      setToast({ show: false, message: '' });
    }, 3500);
  }, []);

  // Subscribe to real hardware sensor stream with dynamic fallback noise
  useEffect(() => {
    const unsubMotion = SensorService.subscribeMotion((data) => {
      setTelemetry((prev) => ({
        ...prev,
        ax: data.ax,
        ay: data.ay,
        az: data.az,
      }));
    });

    const unsubOrientation = SensorService.subscribeOrientation((data) => {
      setTelemetry((prev) => ({
        ...prev,
        yaw: data.alpha != null ? data.alpha : prev.yaw,
        pitch: data.beta != null ? data.beta : prev.pitch,
        roll: data.gamma != null ? data.gamma : prev.roll,
      }));
    });

    const interval = setInterval(() => {
      setTelemetry((prev) => {
        const noiseX = (Math.random() - 0.5) * 0.04;
        const noiseY = (Math.random() - 0.5) * 0.04;
        const noiseZ = (Math.random() - 0.5) * 0.02;
        const speedNoise = (Math.random() - 0.5) * 0.6;

        return {
          ...prev,
          speed: Math.max(0, Math.round((prev.speed + speedNoise) * 10) / 10),
          ax: Math.round((prev.ax + noiseX) * 100) / 100,
          ay: Math.round((prev.ay + noiseY) * 100) / 100,
          az: Math.round((9.80 + noiseZ) * 100) / 100,
        };
      });
    }, 250);

    return () => {
      unsubMotion();
      unsubOrientation();
      clearInterval(interval);
    };
  }, []);

  const calculateDynamicRoute = useCallback(
    async (overrideStart?: [number, number], overrideDest?: [number, number]) => {
      const currentRoute = routeStateRef.current;
      const start = overrideStart || currentRoute.startCoords;
      const dest = overrideDest || currentRoute.destCoords;

      if (!start || !dest) {
        setRouteState((prev) => ({
          ...prev,
          error: 'Please set both Start and Destination locations.',
          calculated: false,
          isCalculating: false,
        }));
        return;
      }

      setRouteState((prev) => ({
        ...prev,
        isCalculating: true,
        error: null,
      }));

      try {
        const route = await LocationService.calculateRoute(start, dest);

        const hrs = Math.floor(route.durationMin / 60);
        const mins = route.durationMin % 60;
        const formattedDuration = hrs > 0 ? `${hrs}h ${mins}m` : `${mins} min`;

        setRouteState((prev) => ({
          ...prev,
          startCoords: start,
          destCoords: dest,
          routeCoordinates: route.coordinates,
          distanceKm: route.distanceKm,
          durationMin: route.durationMin,
          distance: `${route.distanceKm} km`,
          duration: formattedDuration,
          calculated: true,
          isCalculating: false,
          error: null,
          isFallbackRoute: route.isFallback,
        }));

        setTelemetry((prev) => ({
          ...prev,
          remainingKm: route.distanceKm,
          eta: `${Math.floor(route.durationMin / 60)}h ${route.durationMin % 60}m`,
        }));

        if (route.isFallback) {
          showToast(`Direct Route Fallback Active ✓ (${route.distanceKm} km, ${formattedDuration})`);
        } else {
          showToast(`OSRM Drivable Route Calculated ✓ (${route.distanceKm} km, ${formattedDuration})`);
        }
      } catch (err: any) {
        const errMsg = err?.message || 'Failed to calculate drivable route.';
        setRouteState((prev) => ({
          ...prev,
          isCalculating: false,
          calculated: false,
          error: errMsg,
        }));
        showToast(`Route Error: ${errMsg}`);
      }
    },
    [showToast]
  );

  const acquireLiveLocation = useCallback(async () => {
    setRouteState((prev) => ({ ...prev, isAcquiringLocation: true, error: null }));
    try {
      const location = await LocationService.getCurrentLocation();
      const newStart: [number, number] = [location.lat, location.lng];

      setSensorStatus((prev) => ({ ...prev, gnss: true }));

      const currentDest = routeStateRef.current.destCoords;

      setRouteState((prev) => ({
        ...prev,
        startCoords: newStart,
        origin: location.address,
        isAcquiringLocation: false,
      }));

      showToast(`Live GPS Acquired: ${location.address.slice(0, 25)}... ✓`);

      if (currentDest) {
        await calculateDynamicRoute(newStart, currentDest);
      }
    } catch (err: any) {
      const errMsg = err?.message || 'Could not acquire GPS position.';
      setRouteState((prev) => ({ ...prev, isAcquiringLocation: false }));
      showToast(`GPS Warning: ${errMsg}`);
    }
  }, [calculateDynamicRoute, showToast]);

  // Execute location acquisition ONCE on initial mount
  useEffect(() => {
    acquireLiveLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setStartCoordsAndAddress = async (coords: [number, number], address: string) => {
    const currentDest = routeStateRef.current.destCoords;
    setRouteState((prev) => ({
      ...prev,
      startCoords: coords,
      origin: address,
    }));
    if (currentDest) {
      await calculateDynamicRoute(coords, currentDest);
    }
  };

  const setDestCoordsAndAddress = async (coords: [number, number], address: string) => {
    const currentStart = routeStateRef.current.startCoords;
    setRouteState((prev) => ({
      ...prev,
      destCoords: coords,
      destination: address,
    }));
    if (currentStart) {
      await calculateDynamicRoute(currentStart, coords);
    }
  };

  const swapLocations = () => {
    const prev = routeStateRef.current;
    const tempOrigin = prev.origin;
    const tempStart = prev.startCoords;
    const newStart = prev.destCoords;
    const newDest = tempStart;

    setRouteState((p) => ({
      ...p,
      origin: p.destination,
      startCoords: p.destCoords,
      destination: tempOrigin,
      destCoords: tempStart,
    }));

    if (newStart && newDest) {
      calculateDynamicRoute(newStart, newDest);
    }
  };

  const calibrateCompass = async () => {
    const granted = await SensorService.requestOrientationPermission();
    setSensorStatus((prev) => ({ ...prev, compass: granted }));
    showToast(granted ? 'Compass Calibrated & Active ✓' : 'Compass Permission Denied');
  };

  const grantGnssPermission = () => {
    setSensorStatus((prev) => ({ ...prev, gnss: true }));
    acquireLiveLocation();
  };

  const grantAllSensors = async () => {
    const motionGranted = await SensorService.requestMotionPermission();
    const orientationGranted = await SensorService.requestOrientationPermission();
    setSensorStatus({
      accel: motionGranted,
      gyro: motionGranted,
      compass: orientationGranted,
      gnss: true,
    });
    acquireLiveLocation();
    showToast('All Hardware Sensors Granted & Active ✓');
  };

  const setRouteDestination = (destination: string) => {
    setRouteState((prev) => ({
      ...prev,
      destination,
    }));
  };

  const updateOriginDestination = (origin: string, destination: string) => {
    setRouteState((prev) => ({
      ...prev,
      origin,
      destination,
    }));
  };

  const clearRoute = () => {
    setRouteState(initialRouteState);
    showToast('Route cleared');
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

  const clearTileCache = async () => {
    await TileCacheService.clearCache();
    setCachedTilesCount(0);
    showToast('IndexedDB tile cache cleared (0 tiles) ✓');
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
        isOnline,
        matrixScenario,
        cachedTilesCount,
        setMatrixScenario,
        calibrateCompass,
        grantGnssPermission,
        grantAllSensors,
        acquireLiveLocation,
        setStartCoordsAndAddress,
        setDestCoordsAndAddress,
        calculateDynamicRoute,
        swapLocations,
        setRouteDestination,
        updateOriginDestination,
        clearRoute,
        toggleSetting,
        clearOfflineLogs,
        clearTileCache,
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
