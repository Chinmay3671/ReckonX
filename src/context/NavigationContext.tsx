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
  SensorEventLogEntry,
  ActiveTrackingSession,
  VehicleType,
  CurrentLocationData,
  RealSensorData,
  SystemDataMode,
} from '../types/navigation';
import { LocationService } from '../services/locationService';
import { RouteService } from '../services/routeService';
import { SensorService } from '../services/sensorService';
import { TileCacheService } from '../services/tileCacheService';
import { LogExportService } from '../services/logExportService';
import { formatKmDistance } from '../utils/distanceFormatter';
import type { RecordedGPSPoint } from '../services/api/trackingService';

const SETTINGS_STORAGE_KEY = 'reckonx_user_settings';

const defaultSettings: SettingsState = {
  highSpeedPolling: true,
  mapMatching: true,
  keepScreenAwake: true,
  autoCenterVehicle: true,
  speedUnit: 'km/h',
  distanceUnit: 'km',
  offlineLogs: '0 KB',
};

function loadStoredSettings(): SettingsState {
  try {
    const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (stored) {
      return { ...defaultSettings, ...JSON.parse(stored) };
    }
  } catch {
    // Ignore storage parse errors
  }
  return defaultSettings;
}

const initialSensorStatus: SensorStatus = {
  accel: false,
  gyro: false,
  compass: false,
  gnss: false,
  hasMotionHardware: typeof window !== 'undefined' ? SensorService.hasMotionSupport() : false,
  hasOrientationHardware: typeof window !== 'undefined' ? SensorService.hasOrientationSupport() : false,
  sensorsEnabled: true,
  gpsPermission: 'prompt',
};

const initialCurrentLocation: CurrentLocationData = {
  latitude: null,
  longitude: null,
  accuracy: null,
  altitude: null,
  speed: null,
  bearing: null,
  timestamp: null,
  address: 'Acquiring GPS fix...',
  source: 'gps',
  isStale: true,
  ageSec: 0,
};

const initialRealSensors: RealSensorData = {
  ax: 0,
  ay: 0,
  az: 0,
  accelMag: 0,
  gx: 0,
  gy: 0,
  gz: 0,
  gyroMag: 0,
  alpha: null,
  beta: null,
  gamma: null,
  headingDeg: null,
  magX: null,
  magY: null,
  magZ: null,
  timestamp: null,
  intervalMs: 16,
  sampleRateHz: 0,
};

const initialRouteState: RouteState = {
  origin: '',
  destination: '',
  startCoords: null,
  destCoords: null,
  vehicleType: 'car',
  routes: [],
  selectedRouteIndex: 0,
  routeCoordinates: [],
  calculated: false,
  distance: '0 km',
  duration: '0 min',
  distanceKm: 0,
  durationMin: 0,
  tunnelLength: '0 km',
  via: 'OSRM Driving Route',
  routeType: 'Normal Road Route',
  steps: [],
  isCalculating: false,
  isAcquiringLocation: false,
  error: null,
  isFallbackRoute: false,
};

const initialTelemetry: TelemetryData = {
  speed: 0,
  drift: 0.0,
  eta: '--:--',
  remainingKm: 0,
  ax: 0,
  ay: 0,
  az: 0,
  pitch: 0.0,
  roll: 0.0,
  yaw: 0.0,
  sampleRateHz: 0,
  isStreamingMotion: false,
  isStreamingOrientation: false,
  lastEventTimestamp: null,
};

const initialUser: UserProfile = {
  name: 'Local Operator',
  role: 'Autonomous / Telematics Driver',
  id: '#LOCAL-EDGE',
  email: 'operator@local-device.internal',
  isBackendConnected: false,
  avatar: 'RX',
};

const initialTrackingSession: ActiveTrackingSession = {
  isActive: false,
  sessionId: '',
  startTime: null,
  endTime: null,
  points: [],
  totalDistanceKm: 0,
  maxSpeedKmH: 0,
  averageSpeedKmH: 0,
  gnssPointsCount: 0,
  drPointsCount: 0,
  gnssOutageDurationSec: 0,
};

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Central Data Sources
  const [currentLocation, setCurrentLocation] = useState<CurrentLocationData>(initialCurrentLocation);
  const [realSensors, setRealSensors] = useState<RealSensorData>(initialRealSensors);
  const [systemMode, setSystemMode] = useState<SystemDataMode>('live');
  const [isSensorsEnabled, setIsSensorsEnabled] = useState<boolean>(true);

  const [sensorStatus, setSensorStatus] = useState<SensorStatus>(initialSensorStatus);
  const [routeState, setRouteState] = useState<RouteState>(initialRouteState);
  const [telemetry, setTelemetry] = useState<TelemetryData>(initialTelemetry);
  const [settings, setSettings] = useState<SettingsState>(loadStoredSettings);
  const [user, setUser] = useState<UserProfile>(initialUser);
  const [toast, setToast] = useState<ToastState>({ show: false, message: '' });
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [sensorEventsStream, setSensorEventsStream] = useState<SensorEventLogEntry[]>([]);
  const [trackingSession, setTrackingSession] = useState<ActiveTrackingSession>(initialTrackingSession);

  // Network Online & Operational Matrix Scenario State
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [matrixScenario, setMatrixScenario] = useState<OperationalMatrixScenario>('scenario1');
  const [cachedTilesCount, setCachedTilesCount] = useState<number>(0);

  // Sensor zero-point calibration offsets
  const accelOffsetRef = useRef<{ ax: number; ay: number; az: number }>({ ax: 0, ay: 0, az: 0 });

  // Event frequency counter
  const eventTimestampsRef = useRef<number[]>([]);

  // Track if origin was set manually by user
  const isOriginManualRef = useRef<boolean>(false);

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
      setToast({ show: true, message: 'Network Restored: Online Routing & OSM Active ✓' });
    };

    const handleOffline = () => {
      setIsOnline(false);
      setToast({ show: true, message: 'Network Offline: IndexedDB Tiles & Dead Reckoning Active ⚠' });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sync real matrixScenario automatically based on actual network and GPS state
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

  const showToast = useCallback((message: string) => {
    setToast({ show: true, message });
    setTimeout(() => {
      setToast({ show: false, message: '' });
    }, 3500);
  }, []);

  // Save settings to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Ignore storage write errors
    }
  }, [settings]);

  // =========================================================================
  // 1. REAL HARDWARE SENSOR PIPELINE (Strictly Real Sensor Events)
  // =========================================================================
  useEffect(() => {
    if (!isSensorsEnabled) {
      setSensorStatus((prev) => ({
        ...prev,
        accel: false,
        gyro: false,
        compass: false,
        sensorsEnabled: false,
      }));
      setTelemetry((prev) => ({
        ...prev,
        sampleRateHz: 0,
        isStreamingMotion: false,
        isStreamingOrientation: false,
      }));
      return;
    }

    setSensorStatus((prev) => ({
      ...prev,
      sensorsEnabled: true,
      hasMotionHardware: SensorService.hasMotionSupport(),
      hasOrientationHardware: SensorService.hasOrientationSupport(),
    }));

    // Motion Sensor (3-Axis Accel + 3-Axis Gyro)
    const unsubMotion = SensorService.subscribeMotion((data) => {
      const now = Date.now();
      const offset = accelOffsetRef.current;
      const rawAx = data.ax - offset.ax;
      const rawAy = data.ay - offset.ay;
      const rawAz = data.az - offset.az;

      eventTimestampsRef.current.push(now);
      const oneSecAgo = now - 1000;
      eventTimestampsRef.current = eventTimestampsRef.current.filter((t) => t > oneSecAgo);
      const currentRate = eventTimestampsRef.current.length;

      setRealSensors((prev) => ({
        ...prev,
        ax: rawAx,
        ay: rawAy,
        az: rawAz,
        accelMag: data.accelMag,
        gx: data.gx,
        gy: data.gy,
        gz: data.gz,
        gyroMag: data.gyroMag,
        intervalMs: data.intervalMs,
        sampleRateHz: currentRate,
        timestamp: now,
      }));

      setTelemetry((prev) => ({
        ...prev,
        ax: Math.round(rawAx * 100) / 100,
        ay: Math.round(rawAy * 100) / 100,
        az: Math.round(rawAz * 100) / 100,
        sampleRateHz: currentRate,
        isStreamingMotion: true,
        lastEventTimestamp: now,
      }));

      setSensorStatus((prev) => ({ ...prev, accel: true, gyro: true }));

      // Add to rolling sensor event stream (limit 20 entries)
      setSensorEventsStream((prev) => [
        {
          id: `motion-${now}-${Math.floor(Math.random() * 1000)}`,
          timestamp: now,
          type: 'devicemotion',
          summary: `Accel X:${rawAx.toFixed(2)} Y:${rawAy.toFixed(2)} Z:${rawAz.toFixed(2)} m/s² | Gyro ${data.gyroMag.toFixed(2)}°/s`,
          details: { ax: rawAx, ay: rawAy, az: rawAz, gx: data.gx, gy: data.gy, gz: data.gz },
        },
        ...prev.slice(0, 19),
      ]);
    });

    // Orientation Sensor (Pitch, Roll, Yaw, Heading)
    const unsubOrientation = SensorService.subscribeOrientation((data) => {
      const now = Date.now();

      setRealSensors((prev) => ({
        ...prev,
        alpha: data.alpha,
        beta: data.beta,
        gamma: data.gamma,
        headingDeg: data.headingDeg,
        timestamp: now,
      }));

      setTelemetry((prev) => ({
        ...prev,
        yaw: data.alpha != null ? data.alpha : prev.yaw,
        pitch: data.beta != null ? data.beta : prev.pitch,
        roll: data.gamma != null ? data.gamma : prev.roll,
        isStreamingOrientation: true,
        lastEventTimestamp: now,
      }));

      if (data.alpha !== null || data.headingDeg !== null) {
        setSensorStatus((prev) => ({ ...prev, compass: true }));
      }

      setSensorEventsStream((prev) => [
        {
          id: `orient-${now}-${Math.floor(Math.random() * 1000)}`,
          timestamp: now,
          type: 'deviceorientation',
          summary: `Yaw:${data.alpha != null ? data.alpha.toFixed(1) : 'N/A'}° Pitch:${data.beta != null ? data.beta.toFixed(1) : 'N/A'}° Roll:${data.gamma != null ? data.gamma.toFixed(1) : 'N/A'}°`,
          details: { alpha: data.alpha, beta: data.beta, gamma: data.gamma, heading: data.headingDeg },
        },
        ...prev.slice(0, 19),
      ]);
    });

    // Magnetometer Sensor
    const unsubMagnetometer = SensorService.subscribeMagnetometer((mag) => {
      setRealSensors((prev) => ({
        ...prev,
        magX: mag.x,
        magY: mag.y,
        magZ: mag.z,
      }));
    });

    return () => {
      unsubMotion();
      unsubOrientation();
      unsubMagnetometer();
    };
  }, [isSensorsEnabled]);

  const toggleSensors = useCallback(
    async (enable?: boolean): Promise<boolean> => {
      const targetState = enable !== undefined ? enable : !isSensorsEnabled;

      if (targetState) {
        // Request hardware permissions
        await SensorService.requestMotionPermission();
        await SensorService.requestOrientationPermission();
        setIsSensorsEnabled(true);
        showToast('Real Device Sensors: Active ● ON');
        return true;
      } else {
        setIsSensorsEnabled(false);
        showToast('Real Device Sensors: OFF');
        return false;
      }
    },
    [isSensorsEnabled, showToast]
  );

  const resetSensorZeroPoint = useCallback(() => {
    accelOffsetRef.current = {
      ax: telemetry.ax,
      ay: telemetry.ay,
      az: telemetry.az,
    };
    showToast('Zero-point calibrated: Offsets applied ✓');
  }, [telemetry.ax, telemetry.ay, telemetry.az, showToast]);

  // =========================================================================
  // 2. CONTINUOUS REAL GPS LOCATION WATCHER & CENTRAL SOURCE OF TRUTH
  // =========================================================================
  useEffect(() => {
    const unsubGps = LocationService.startLocationWatch(
      (pos: CurrentLocationData) => {
        setCurrentLocation(pos);
        setSensorStatus((prev) => ({
          ...prev,
          gnss: true,
          gpsPermission: 'granted',
        }));

        // If route origin is not manually overridden, sync startCoords with real GPS
        if (!isOriginManualRef.current && pos.latitude !== null && pos.longitude !== null) {
          const newStart: [number, number] = [pos.latitude, pos.longitude];
          setRouteState((prev) => ({
            ...prev,
            startCoords: newStart,
            origin: pos.address,
          }));
        }

        if (pos.speed !== null && pos.speed >= 0) {
          setTelemetry((prev) => ({ ...prev, speed: pos.speed || 0 }));
        }
      },
      (error) => {
        console.warn('GPS watch status:', error.message);
        if (error.message.includes('denied')) {
          setSensorStatus((prev) => ({ ...prev, gnss: false, gpsPermission: 'denied' }));
        } else {
          setSensorStatus((prev) => ({ ...prev, gnss: false }));
        }
      }
    );

    return () => {
      unsubGps();
    };
  }, []);

  // GPS Staleness Monitor (Updates location age and detects stale GPS)
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentLocation((prev) => {
        if (!prev.timestamp) return prev;
        const ageSec = Math.round((Date.now() - prev.timestamp) / 1000);
        const isStale = ageSec > 10;
        if (isStale && sensorStatus.gnss) {
          setSensorStatus((s) => ({ ...s, gnss: false })); // Trigger DR fallback if GPS stale
        }
        return {
          ...prev,
          ageSec,
          isStale,
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [sensorStatus.gnss]);

  // One-click Refresh GPS Action
  const refreshGpsLocation = useCallback(async (): Promise<CurrentLocationData | null> => {
    try {
      showToast('Refreshing real GPS fix...');
      const loc = await LocationService.getCurrentLocation();
      const updated: CurrentLocationData = {
        latitude: loc.lat,
        longitude: loc.lng,
        accuracy: loc.accuracy,
        altitude: loc.altitude,
        speed: loc.speed,
        bearing: loc.heading,
        timestamp: loc.timestamp,
        address: loc.address,
        source: 'gps',
        isStale: false,
        ageSec: 0,
      };

      setCurrentLocation(updated);
      setSensorStatus((prev) => ({ ...prev, gnss: true, gpsPermission: 'granted' }));

      if (!isOriginManualRef.current) {
        setRouteState((prev) => ({
          ...prev,
          startCoords: [loc.lat, loc.lng],
          origin: loc.address,
        }));
      }

      showToast(`GPS Refreshed (${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}) ±${loc.accuracy || '?'}m ✓`);
      return updated;
    } catch (err: any) {
      showToast(`GPS: ${err.message}`);
      return null;
    }
  }, [showToast]);

  const selectRoute = useCallback(
    (index: number) => {
      const current = routeStateRef.current;
      if (!current.routes || !current.routes[index]) return;

      const chosen = current.routes[index];
      const hrs = Math.floor(chosen.durationMin / 60);
      const mins = chosen.durationMin % 60;
      const formattedDuration = hrs > 0 ? `${hrs}h ${mins}m` : `${mins} min`;

      setRouteState((prev) => ({
        ...prev,
        selectedRouteIndex: index,
        routeCoordinates: chosen.coordinates,
        distanceKm: chosen.distanceKm,
        durationMin: chosen.durationMin,
        distance: formatKmDistance(chosen.distanceKm, settings.distanceUnit),
        duration: formattedDuration,
        steps: chosen.steps,
        via: chosen.summary,
      }));

      setTelemetry((prev) => ({
        ...prev,
        remainingKm: chosen.distanceKm,
        eta: formattedDuration,
      }));

      showToast(`Selected: ${chosen.label} (${formatKmDistance(chosen.distanceKm, settings.distanceUnit)}, ${formattedDuration})`);
    },
    [settings.distanceUnit, showToast]
  );

  // Ref to cancel in-flight route requests if destination or vehicle changes rapidly
  const activeRouteAbortControllerRef = useRef<AbortController | null>(null);
  const routeRequestIdRef = useRef<number>(0);

  const calculateDynamicRoute = useCallback(
    async (
      overrideStart?: [number, number],
      overrideDest?: [number, number],
      overrideVehicleType?: VehicleType
    ) => {
      if (activeRouteAbortControllerRef.current) {
        activeRouteAbortControllerRef.current.abort();
      }
      const abortController = new AbortController();
      activeRouteAbortControllerRef.current = abortController;

      const currentReqId = ++routeRequestIdRef.current;

      let start = overrideStart || routeStateRef.current.startCoords;
      const dest = overrideDest || routeStateRef.current.destCoords;
      const vehicleType = overrideVehicleType || routeStateRef.current.vehicleType || 'car';

      // If start is missing, acquire live location
      if (!start) {
        try {
          const loc = await LocationService.getCurrentLocation();
          start = [loc.lat, loc.lng];
          setRouteState((prev) => ({
            ...prev,
            startCoords: start,
            origin: loc.address,
          }));
          setSensorStatus((prev) => ({ ...prev, gnss: true }));
        } catch {
          // Handled below
        }
      }

      if (!start || !dest) {
        setRouteState((prev) => ({
          ...prev,
          routes: [],
          routeCoordinates: [],
          error: !start ? 'Unable to acquire current location. Please check GPS permissions.' : 'Please set a destination.',
          calculated: false,
          isCalculating: false,
        }));
        return;
      }

      setRouteState((prev) => ({
        ...prev,
        startCoords: start,
        destCoords: dest,
        vehicleType,
        routes: [],
        routeCoordinates: [],
        isCalculating: true,
        calculated: false,
        error: null,
      }));

      try {
        const result = await RouteService.calculateRoute({
          origin: start,
          destination: dest,
          vehicleProfile: vehicleType,
          alternatives: true,
          signal: abortController.signal,
          requestId: currentReqId,
        });

        // Guard against race conditions from out-of-order responses
        if (currentReqId !== routeRequestIdRef.current) {
          return;
        }

        const primary = result.selectedRoute;
        const hrs = Math.floor(primary.durationMin / 60);
        const mins = primary.durationMin % 60;
        const formattedDuration = hrs > 0 ? `${hrs}h ${mins}m` : `${mins} min`;

        setRouteState((prev) => ({
          ...prev,
          startCoords: start,
          destCoords: dest,
          vehicleType,
          routes: result.routes,
          selectedRouteIndex: 0,
          routeCoordinates: primary.coordinates,
          distanceKm: primary.distanceKm,
          durationMin: primary.durationMin,
          distance: formatKmDistance(primary.distanceKm, settings.distanceUnit),
          duration: formattedDuration,
          steps: primary.steps,
          via: primary.summary,
          routeType: result.routeTypeLabel,
          profileLabel: result.profileLabel,
          calculated: true,
          isCalculating: false,
          error: null,
          isFallbackRoute: false,
          routingDebug: {
            vehicle: vehicleType,
            profile: result.profileLabel,
            provider: result.providerUrl,
            requestId: currentReqId,
            distanceKm: primary.distanceKm,
            durationMin: primary.durationMin,
            source: result.source,
            timestamp: Date.now(),
          },
        }));

        setTelemetry((prev) => ({
          ...prev,
          remainingKm: primary.distanceKm,
          eta: formattedDuration,
        }));

        const readyMsg =
          vehicleType === 'walking'
            ? 'Walking route ready ✓'
            : vehicleType === 'bike'
            ? 'Cycling route ready ✓'
            : 'Driving route ready ✓';
        showToast(readyMsg);
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          return;
        }
        if (currentReqId !== routeRequestIdRef.current) {
          return;
        }

        const errMsg =
          err?.message || 'Unable to calculate route. Check your internet connection or destination.';
        setRouteState((prev) => ({
          ...prev,
          routes: [],
          routeCoordinates: [],
          isCalculating: false,
          calculated: false,
          error: errMsg,
        }));
        setTelemetry((prev) => ({
          ...prev,
          remainingKm: 0,
          eta: '--:--',
        }));
        showToast(errMsg);
      }
    },
    [showToast, settings.distanceUnit]
  );

  const setVehicleType = useCallback(
    async (type: VehicleType) => {
      setRouteState((prev) => ({
        ...prev,
        vehicleType: type,
        routes: [],
        routeCoordinates: [],
        calculated: false,
        isCalculating: true,
        error: null,
      }));
      const currentStart = routeStateRef.current.startCoords;
      const currentDest = routeStateRef.current.destCoords;
      if (currentStart && currentDest) {
        await calculateDynamicRoute(currentStart, currentDest, type);
      }
    },
    [calculateDynamicRoute]
  );

  const acquireLiveLocation = useCallback(async () => {
    setRouteState((prev) => ({ ...prev, isAcquiringLocation: true, error: null }));
    isOriginManualRef.current = false;
    try {
      const location = await LocationService.getCurrentLocation();
      const newStart: [number, number] = [location.lat, location.lng];

      setCurrentLocation({
        latitude: location.lat,
        longitude: location.lng,
        accuracy: location.accuracy,
        altitude: location.altitude,
        speed: location.speed,
        bearing: location.heading,
        timestamp: location.timestamp,
        address: location.address,
        source: 'gps',
        isStale: false,
        ageSec: 0,
      });

      setSensorStatus((prev) => ({ ...prev, gnss: true, gpsPermission: 'granted' }));

      const currentDest = routeStateRef.current.destCoords;

      setRouteState((prev) => ({
        ...prev,
        startCoords: newStart,
        origin: location.address,
        isAcquiringLocation: false,
      }));

      showToast(`GPS Acquired: ${location.address.slice(0, 30)}... ✓`);

      if (currentDest) {
        await calculateDynamicRoute(newStart, currentDest);
      }
    } catch (err: any) {
      const errMsg = err?.message || 'Could not acquire GPS position.';
      setRouteState((prev) => ({ ...prev, isAcquiringLocation: false }));
      setSensorStatus((prev) => ({ ...prev, gnss: false }));
      showToast(`GPS: ${errMsg}`);
    }
  }, [calculateDynamicRoute, showToast]);

  const setStartCoordsAndAddress = async (coords: [number, number], address: string, isManual = true) => {
    isOriginManualRef.current = isManual;
    const currentDest = routeStateRef.current.destCoords;
    setRouteState((prev) => ({
      ...prev,
      startCoords: coords,
      origin: address,
    }));
    if (isManual) {
      setCurrentLocation((prev) => ({
        ...prev,
        latitude: coords[0],
        longitude: coords[1],
        address,
        source: 'manual',
      }));
    }
    if (currentDest) {
      await calculateDynamicRoute(coords, currentDest);
    }
  };

  const setDestCoordsAndAddress = async (coords: [number, number], address: string) => {
    let currentStart = routeStateRef.current.startCoords;
    setRouteState((prev) => ({
      ...prev,
      destCoords: coords,
      destination: address,
    }));

    if (!currentStart) {
      try {
        const loc = await LocationService.getCurrentLocation();
        currentStart = [loc.lat, loc.lng];
        setRouteState((prev) => ({
          ...prev,
          startCoords: currentStart,
          origin: loc.address,
        }));
        setSensorStatus((prev) => ({ ...prev, gnss: true }));
      } catch {
        // Handled in calculateDynamicRoute
      }
    }

    await calculateDynamicRoute(currentStart || undefined, coords);
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
    showToast(granted ? 'Compass Hardware Active ✓' : 'Compass Permission Denied / Unsupported');
  };

  const grantGnssPermission = async () => {
    await acquireLiveLocation();
  };

  const grantAllSensors = async () => {
    await SensorService.requestMotionPermission();
    await SensorService.requestOrientationPermission();
    setIsSensorsEnabled(true);
    await acquireLiveLocation();
    showToast('Real Hardware Sensor Permissions Requested ✓');
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
    setSettings((prev) => {
      const next = {
        ...prev,
        [key]: typeof prev[key] === 'boolean' ? !prev[key] : prev[key],
      };
      try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignore storage errors
      }
      return next;
    });
    showToast('Setting updated ✓');
  };

  const updateSettingValue = <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => {
    setSettings((prev) => {
      const next = {
        ...prev,
        [key]: value,
      };
      try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignore storage errors
      }
      return next;
    });

    if (key === 'distanceUnit') {
      const unit = value as 'km' | 'mi';
      setRouteState((prev) => ({
        ...prev,
        distance: prev.calculated ? formatKmDistance(prev.distanceKm, unit) : (unit === 'mi' ? '0.0 mi' : '0.0 km'),
      }));
    }

    showToast('Setting saved ✓');
  };

  const clearOfflineLogs = () => {
    setSettings((prev) => ({ ...prev, offlineLogs: '0 KB' }));
    setSensorEventsStream([]);
    showToast('Offline logs cleared (0 KB) ✓');
  };

  const clearTileCache = async () => {
    await TileCacheService.clearCache();
    setCachedTilesCount(0);
    showToast('IndexedDB tile cache cleared (0 tiles) ✓');
  };

  const loginUser = (email?: string) => {
    setIsLoggedIn(true);
    setUser((prev) => ({
      ...prev,
      name: 'Local Operator',
      email: email || prev.email,
      isBackendConnected: false,
    }));
    showToast('Signed in (Local Mode) ✓');
  };

  const logoutUser = () => {
    setIsLoggedIn(false);
    showToast('Logged out');
  };

  // Tracking Session Lifecycle
  const startTrackingSession = useCallback(() => {
    const sessionId = `session-${Date.now()}`;
    setTrackingSession({
      isActive: true,
      sessionId,
      startTime: Date.now(),
      endTime: null,
      points: [],
      totalDistanceKm: 0,
      maxSpeedKmH: 0,
      averageSpeedKmH: 0,
      gnssPointsCount: 0,
      drPointsCount: 0,
      gnssOutageDurationSec: 0,
    });
    showToast('Live navigation tracking session started');
  }, [showToast]);

  const stopTrackingSession = useCallback(() => {
    setTrackingSession((prev) => {
      const endTime = Date.now();
      const count = prev.points.length;
      let totalSpeed = 0;
      let maxSpeed = 0;

      for (const p of prev.points) {
        const spd = p.speedKmH || 0;
        totalSpeed += spd;
        if (spd > maxSpeed) maxSpeed = spd;
      }

      const avgSpeed = count > 0 ? Math.round((totalSpeed / count) * 10) / 10 : 0;

      return {
        ...prev,
        isActive: false,
        endTime,
        maxSpeedKmH: maxSpeed,
        averageSpeedKmH: avgSpeed,
      };
    });
    showToast('Tracking session concluded');
  }, [showToast]);

  const recordSessionPoint = useCallback((point: RecordedGPSPoint) => {
    setTrackingSession((prev) => {
      if (!prev.isActive) return prev;
      const updatedPoints = [...prev.points, point];
      const isDR = !!point.isDeadReckoning;
      return {
        ...prev,
        points: updatedPoints,
        gnssPointsCount: isDR ? prev.gnssPointsCount : prev.gnssPointsCount + 1,
        drPointsCount: isDR ? prev.drPointsCount + 1 : prev.drPointsCount,
        maxSpeedKmH: Math.max(prev.maxSpeedKmH, point.speedKmH || 0),
      };
    });
  }, []);

  const exportCurrentSessionLogs = useCallback(() => {
    const result = LogExportService.exportSessionToCSV(trackingSession.points, {
      origin: routeState.origin,
      destination: routeState.destination,
      startTime: trackingSession.startTime || undefined,
      endTime: trackingSession.endTime || Date.now(),
      totalDistanceKm: trackingSession.totalDistanceKm,
    });
    showToast(result.message);
    return result;
  }, [trackingSession, routeState.origin, routeState.destination, showToast]);

  return (
    <NavigationContext.Provider
      value={{
        currentLocation,
        realSensors,
        systemMode,
        isSensorsEnabled,
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
        sensorEventsStream,
        trackingSession,
        toggleSensors,
        setSystemMode,
        refreshGpsLocation,
        setMatrixScenario,
        calibrateCompass,
        grantGnssPermission,
        grantAllSensors,
        acquireLiveLocation,
        setStartCoordsAndAddress,
        setDestCoordsAndAddress,
        setVehicleType,
        calculateDynamicRoute,
        selectRoute,
        swapLocations,
        setRouteDestination,
        updateOriginDestination,
        clearRoute,
        toggleSetting,
        updateSettingValue,
        clearOfflineLogs,
        clearTileCache,
        showToast,
        loginUser,
        logoutUser,
        startTrackingSession,
        stopTrackingSession,
        recordSessionPoint,
        exportCurrentSessionLogs,
        resetSensorZeroPoint,
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
