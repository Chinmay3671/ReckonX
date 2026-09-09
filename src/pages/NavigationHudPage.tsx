import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapView } from '../components/MapView';
import { useNavigationContext } from '../context/NavigationContext';
import {
  CornerUpRight,
  Volume2,
  VolumeX,
  Compass,
  Navigation as NavigationIcon,
  AlertTriangle,
  LogOut,
  CheckCircle2,
  Radio,
  RotateCw,
  Wifi,
  WifiOff,
  Database,
  Satellite,
  Maximize2,
  Plus,
  Minus,
} from 'lucide-react';
import { MobileShell } from '../components/MobileShell';
import { DeadReckoningEngine } from '../services/deadReckoningEngine';
import { OrientationService } from '../services/OrientationService';
import { SensorService } from '../services/sensorService';
import { formatKmDistance } from '../utils/distanceFormatter';
import { calculateRemainingRoadDistance } from '../utils/routeProgress';
import type { OperationalMatrixScenario } from '../types/navigation';

const LiveMetricsOverlay: React.FC<{
  remainingKm: number;
  drDrift: number;
  isGnssActive: boolean;
  liveHeading: number;
  cameraMode: 'north-up' | 'head-up';
  onToggleCameraMode: () => void;
  onEndNavigation: () => void;
}> = ({
  remainingKm,
  drDrift,
  isGnssActive,
  liveHeading,
  cameraMode,
  onToggleCameraMode,
  onEndNavigation,
}) => {
  const { settings, telemetry, sensorStatus, isOnline, matrixScenario, cachedTilesCount } = useNavigationContext();
  const [showExitModal, setShowExitModal] = useState(false);

  const isHeadingValid = isGnssActive || sensorStatus.compass || liveHeading > 0;
  const formattedHeading = OrientationService.formatCardinalHeading(liveHeading, isHeadingValid);

  const scenarioBadges: Record<
    OperationalMatrixScenario,
    { label: string; bg: string; border: string; text: string }
  > = {
    scenario1: {
      label: 'Scenario 1: [GPS ON + Net ON] Online Nav',
      bg: 'bg-emerald-50',
      border: 'border-emerald-600/40',
      text: 'text-emerald-800',
    },
    scenario2: {
      label: 'Scenario 2: [GPS OFF + Net ON] Tunnel DR Mode',
      bg: 'bg-amber-50',
      border: 'border-amber-600/40',
      text: 'text-amber-800',
    },
    scenario3: {
      label: 'Scenario 3: [GPS ON + Net OFF] Offline Satellite',
      bg: 'bg-blue-50',
      border: 'border-blue-600/40',
      text: 'text-blue-800',
    },
    scenario4: {
      label: 'Scenario 4: [GPS OFF + Net OFF] Pure Offline DR',
      bg: 'bg-purple-50',
      border: 'border-purple-600/40',
      text: 'text-purple-800',
    },
  };

  const currentBadge = scenarioBadges[matrixScenario];

  return (
    <>
      {/* 4/4 Operational Matrix Status Bar (Automatically detected from real hardware & network) */}
      <div
        className={`w-full ${currentBadge.bg} border-b ${currentBadge.border} px-3 py-1.5 flex items-center justify-between z-20 relative`}
      >
        <div className={`flex items-center gap-1.5 text-xs font-bold ${currentBadge.text} truncate`}>
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="truncate">
            {currentBadge.label} {drDrift > 0 ? `(±${drDrift.toFixed(1)}m drift)` : ''}
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
          {/* Tile Cache Badge */}
          <div
            className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-slate-900 text-white font-mono"
            title="Cached Leaflet Tiles in IndexedDB"
          >
            <Database className="w-3 h-3 text-emerald-400" />
            <span>{cachedTilesCount} Tiles</span>
          </div>

          {/* Real GNSS / DR Indicator */}
          <div
            className={`text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 font-mono border ${
              isGnssActive
                ? 'bg-emerald-600 text-white border-emerald-700'
                : 'bg-amber-600 text-white border-amber-700'
            }`}
          >
            {isGnssActive ? (
              <>
                <Satellite className="w-3 h-3" />
                <span>GNSS</span>
              </>
            ) : (
              <>
                <Radio className="w-3 h-3 animate-pulse" />
                <span>DR ENGAGED</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Docked HUD Panel */}
      <div className="absolute bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200 p-3 space-y-2.5 shadow-lg">
        <div className="flex items-center justify-between gap-2">
          {/* Speedometer & Heading Readout */}
          <div className="flex flex-col">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
              Speed & Heading
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold font-mono text-slate-900 leading-tight">
                {telemetry.speed > 0 ? telemetry.speed.toFixed(1) : '0.0'}{' '}
                <span className="text-xs font-normal text-slate-500 font-sans">
                  {settings.speedUnit || 'km/h'}
                </span>
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-mono">
                {formattedHeading}
              </span>
            </div>
          </div>

          {/* Trip Progress / ETA with Dynamic Distance Formatter */}
          <div className="text-center">
            <div className="text-sm font-bold text-slate-900 font-mono">
              {remainingKm > 0
                ? `${formatKmDistance(remainingKm, settings.distanceUnit)} left`
                : 'Arrived'}
            </div>
            <button
              onClick={onToggleCameraMode}
              className="text-[11px] text-slate-500 font-mono mt-0.5 hover:text-blue-600 hover:underline cursor-pointer flex items-center justify-center gap-1"
              title="Click to toggle camera orientation"
            >
              <span>{cameraMode === 'north-up' ? 'North-Up' : 'Head-Up (Follow)'}</span>
              <span>•</span>
              {isOnline ? (
                <span className="flex items-center gap-0.5 text-emerald-600">
                  <Wifi className="w-3 h-3" /> Online
                </span>
              ) : (
                <span className="flex items-center gap-0.5 text-red-500">
                  <WifiOff className="w-3 h-3" /> Offline
                </span>
              )}
            </button>
          </div>

          {/* Exit Button */}
          <button
            onClick={() => setShowExitModal(true)}
            className="px-3 py-1.5 text-xs font-bold text-red-600 border border-red-600 hover:bg-red-50 rounded-md transition-colors flex items-center gap-1 flex-shrink-0 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Exit</span>
          </button>
        </div>

        {/* Complete Trip & View Genuine Analytics */}
        <button
          onClick={onEndNavigation}
          className="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold py-2 px-3 rounded-md transition-colors text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Complete Navigation & View Trip Summary</span>
        </button>
      </div>

      {/* Inline Exit Confirmation Dialog */}
      {showExitModal && (
        <div className="absolute inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-md p-4 w-full max-w-xs space-y-3 shadow-xl">
            <h3 className="text-sm font-bold text-slate-900">Exit Navigation Session?</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Active turn-by-turn guidance and dead reckoning tracking will conclude.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowExitModal(false)}
                className="flex-1 py-1.5 text-xs font-bold border border-slate-300 text-slate-700 rounded-md hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowExitModal(false);
                  onEndNavigation();
                }}
                className="flex-1 py-1.5 text-xs font-bold bg-red-600 text-white rounded-md hover:bg-red-700 cursor-pointer"
              >
                End & View Summary
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export const NavigationHudPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    routeState,
    telemetry,
    sensorStatus,
    showToast,
    recordSessionPoint,
    stopTrackingSession,
  } = useNavigationContext();

  const [muted, setMuted] = useState(false);
  const [cameraMode, setCameraMode] = useState<'north-up' | 'head-up'>('north-up');

  // Navigation Vehicle Positioning & Orientation
  const [currentVehiclePos, setCurrentVehiclePos] = useState<[number, number] | null>(
    routeState.startCoords || (routeState.routeCoordinates[0] ?? null)
  );
  const [liveHeading, setLiveHeading] = useState<number>(0);
  const [remainingKm, setRemainingKm] = useState<number>(routeState.distanceKm || 0);
  const [drDrift, setDrDrift] = useState<number>(0.0);
  const [isGnssLocked, setIsGnssLocked] = useState<boolean>(sensorStatus.gnss);

  // Multi-Trajectory Overlays State
  const [deadReckoningPath, setDeadReckoningPath] = useState<[number, number][]>([]);

  // Internal Sensor Fusion References
  const magnetometerHeadingRef = useRef<number | null>(null);
  const gnssTrackHeadingRef = useRef<number | null>(null);
  const gyroZRateRef = useRef<number | null>(null);
  const fusedHeadingRef = useRef<number>(0);
  const prevVehiclePosRef = useRef<[number, number] | null>(null);
  const currentVehiclePosRef = useRef<[number, number] | null>(currentVehiclePos);
  const accumulatedDriftRef = useRef<number>(0);
  const lastGnssFixTimeRef = useRef<number>(0);

  useEffect(() => {
    lastGnssFixTimeRef.current = Date.now();
  }, []);

  useEffect(() => {
    currentVehiclePosRef.current = currentVehiclePos;
  }, [currentVehiclePos]);

  // 1. Hardware Sensor Listeners for Compass & Gyroscope Fusion
  useEffect(() => {
    const unsubOrientation = OrientationService.subscribeOrientationEvents((heading) => {
      magnetometerHeadingRef.current = heading;
    });

    const unsubMotion = SensorService.subscribeMotion((data) => {
      gyroZRateRef.current = data.az ? (data.az - 9.8) * 5 : 0;
    });

    return () => {
      unsubOrientation();
      unsubMotion();
    };
  }, []);

  // 2. Shortest-Path Angular Fusion & 10 Hz Ticker
  useEffect(() => {
    const dt = 0.1; // 100 ms = 10 Hz ticker
    const intervalId = setInterval(() => {
      const prevHeading = fusedHeadingRef.current;
      const prevPos = prevVehiclePosRef.current;
      const currPos = currentVehiclePosRef.current;

      let trajBearing: number | null = null;
      if (prevPos && currPos) {
        const dist = DeadReckoningEngine.calculateHaversineDistance(prevPos, currPos);
        if (dist > 0.0005) {
          trajBearing = OrientationService.calculateBearing(prevPos, currPos);
        }
      }

      const fused = OrientationService.fuseHeading({
        magnetometerHeading: magnetometerHeadingRef.current,
        gnssTrackBearing: gnssTrackHeadingRef.current,
        trajectoryBearing: trajBearing,
        gyroZRate: gyroZRateRef.current,
        speedKmH: telemetry.speed || 0,
        isGnssAvailable: isGnssLocked,
        deltaTimeSec: dt,
        previousHeading: prevHeading,
      });

      fusedHeadingRef.current = fused;
      setLiveHeading(fused);
      prevVehiclePosRef.current = currPos;

      // If GNSS has been lost for > 3 seconds, engage Dead Reckoning kinematic stepping
      const timeSinceLastGnss = Date.now() - lastGnssFixTimeRef.current;
      if (timeSinceLastGnss > 3000 && currPos) {
        setIsGnssLocked(false);

        // Execute Dead Reckoning kinematic step with actual sensor linear acceleration
        const accelMag = Math.sqrt(
          telemetry.ax * telemetry.ax +
          telemetry.ay * telemetry.ay
        );

        const drStep = DeadReckoningEngine.stepKinematics(
          currPos,
          telemetry.speed || 0,
          accelMag,
          fused,
          dt,
          accumulatedDriftRef.current
        );

        accumulatedDriftRef.current = drStep.driftErrorMeters;
        setDrDrift(drStep.driftErrorMeters);
        setCurrentVehiclePos(drStep.position);
        setDeadReckoningPath((prev) => [...prev.slice(-100), drStep.position]);

        // Record DR point to session
        recordSessionPoint({
          timestamp: Date.now(),
          lat: drStep.position[0],
          lng: drStep.position[1],
          speedKmH: drStep.velocitySpeedKmH,
          headingDeg: fused,
          isDeadReckoning: true,
        });

        if (routeState.routeCoordinates && routeState.routeCoordinates.length > 0) {
          const { remainingDistanceKm } = calculateRemainingRoadDistance(
            drStep.position,
            routeState.routeCoordinates
          );
          setRemainingKm(remainingDistanceKm);
        } else if (routeState.destCoords) {
          const dist = DeadReckoningEngine.calculateHaversineDistance(drStep.position, routeState.destCoords);
          setRemainingKm(Math.round(dist * 10) / 10);
        }
      }
    }, 100);

    return () => clearInterval(intervalId);
  }, [telemetry.speed, telemetry.ax, telemetry.ay, isGnssLocked, routeState.destCoords, routeState.routeCoordinates, recordSessionPoint]);

  // 3. Real Hardware GPS Tracking Mode (`navigator.geolocation.watchPosition`)
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const newPos: [number, number] = [lat, lng];

        lastGnssFixTimeRef.current = Date.now();
        setIsGnssLocked(true);
        accumulatedDriftRef.current = 0; // Reset drift on GPS fix
        setDrDrift(0.0);

        setCurrentVehiclePos(newPos);

        if (position.coords.heading != null && !isNaN(position.coords.heading)) {
          gnssTrackHeadingRef.current = position.coords.heading;
        }

        const speedKmH = position.coords.speed != null ? position.coords.speed * 3.6 : telemetry.speed;

        // Record real GPS point into session history
        recordSessionPoint({
          timestamp: position.timestamp || Date.now(),
          lat,
          lng,
          accuracyMeters: position.coords.accuracy,
          speedKmH,
          headingDeg: position.coords.heading || liveHeading,
          altitudeMeters: position.coords.altitude,
          isDeadReckoning: false,
        });

        if (routeState.routeCoordinates && routeState.routeCoordinates.length > 0) {
          const { remainingDistanceKm } = calculateRemainingRoadDistance(
            newPos,
            routeState.routeCoordinates
          );
          setRemainingKm(remainingDistanceKm);
        } else if (routeState.destCoords) {
          const dist = DeadReckoningEngine.calculateHaversineDistance(newPos, routeState.destCoords);
          setRemainingKm(Math.round(dist * 10) / 10);
        }
      },
      (error) => {
        console.warn('Real GPS watch error / loss:', error.message);
        setIsGnssLocked(false);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 1000,
        timeout: 8000,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [routeState.destCoords, routeState.routeCoordinates, liveHeading, telemetry.speed, recordSessionPoint]);

  const handleEndNavigation = () => {
    stopTrackingSession();
    navigate('/summary');
  };

  const handleRecenter = () => {
    if (!currentVehiclePos && !routeState.startCoords) {
      showToast('Location unavailable');
      return;
    }
    (window as any).__mapRecenter?.();
  };

  const handleViewFullRoute = () => {
    if (!routeState.routeCoordinates || routeState.routeCoordinates.length === 0) {
      showToast('No active route coordinates');
      return;
    }
    (window as any).__mapViewFullRoute?.();
  };

  const activeStepInstruction =
    routeState.steps && routeState.steps.length > 0
      ? routeState.steps[0].instruction
      : routeState.via || 'Follow active road route';

  const topBanner = (
    <div className="w-full flex items-center justify-between">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 bg-emerald-600 text-white rounded-md flex items-center justify-center flex-shrink-0">
          <CornerUpRight className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-slate-900 leading-tight truncate">
            {activeStepInstruction}
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5 truncate">
            {routeState.origin || 'Start'} → {routeState.destination || 'Destination'}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
        <span className="text-[11px] font-extrabold px-2 py-1 rounded bg-slate-900 text-white font-mono shadow-xs">
          {OrientationService.formatCardinalHeading(liveHeading, isGnssLocked || sensorStatus.compass || liveHeading > 0)}
        </span>
      </div>
    </div>
  );

  return (
    <MobileShell header={topBanner} hideHeaderPadding hideFooterPadding>
      <div className="relative h-full w-full bg-slate-50 overflow-hidden">
        {/* Map Viewport rendering multi-trajectory overlays & live vehicle position */}
        <div className="w-full h-full pt-14 pb-28">
          <MapView
            mode="navigation"
            zoom={16}
            showRoute={true}
            startCoords={routeState.startCoords}
            destCoords={routeState.destCoords}
            routes={routeState.routes}
            selectedRouteIndex={routeState.selectedRouteIndex}
            routeCoordinates={routeState.routeCoordinates}
            deadReckoningPath={deadReckoningPath}
            rawInsPath={[]}
            liveVehiclePos={currentVehiclePos}
            liveHeading={liveHeading}
            cameraMode={cameraMode}
            onToggleCameraMode={() =>
              setCameraMode((prev) => (prev === 'north-up' ? 'head-up' : 'north-up'))
            }
          />
        </div>

        {/* Floating Right Controls */}
        <div className="absolute right-3 top-16 z-20 flex flex-col gap-2">
          {/* Audio Mute Toggle */}
          <button
            onClick={() => setMuted(!muted)}
            className={`w-9 h-9 bg-white border border-slate-200 rounded-md flex items-center justify-center transition-colors shadow-xs cursor-pointer ${
              muted ? 'text-red-600' : 'text-slate-900'
            }`}
            title="Toggle Mute"
            aria-label="Toggle Mute"
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Compass / Camera Mode Switcher (North-Up vs Head-Up) */}
          <button
            onClick={() => setCameraMode((prev) => (prev === 'north-up' ? 'head-up' : 'north-up'))}
            className={`w-9 h-9 bg-white border border-slate-200 rounded-md flex items-center justify-center transition-colors shadow-xs cursor-pointer ${
              cameraMode === 'head-up' ? 'text-blue-700 bg-blue-50 border-blue-300' : 'text-slate-600'
            }`}
            title={`Current Camera: ${cameraMode === 'north-up' ? 'North-Up' : 'Head-Up (Follow Vehicle)'}`}
            aria-label="Toggle Camera Mode"
          >
            {cameraMode === 'north-up' ? (
              <Compass className="w-4 h-4" />
            ) : (
              <RotateCw className="w-4 h-4 text-blue-700 animate-spin-slow" />
            )}
          </button>

          {/* Zoom In */}
          <button
            onClick={() => (window as any).__mapZoomIn?.()}
            className="w-9 h-9 bg-white border border-slate-200 rounded-md flex items-center justify-center text-slate-800 shadow-xs cursor-pointer hover:bg-slate-50"
            title="Zoom In"
            aria-label="Zoom In"
          >
            <Plus className="w-4 h-4" />
          </button>

          {/* Zoom Out */}
          <button
            onClick={() => (window as any).__mapZoomOut?.()}
            className="w-9 h-9 bg-white border border-slate-200 rounded-md flex items-center justify-center text-slate-800 shadow-xs cursor-pointer hover:bg-slate-50"
            title="Zoom Out"
            aria-label="Zoom Out"
          >
            <Minus className="w-4 h-4" />
          </button>

          {/* View Full Route Control */}
          <button
            onClick={handleViewFullRoute}
            className="w-9 h-9 bg-white border border-slate-200 rounded-md flex items-center justify-center text-slate-800 shadow-xs cursor-pointer hover:bg-slate-50"
            title="View Full Route"
            aria-label="View Full Route"
          >
            <Maximize2 className="w-4 h-4" />
          </button>

          {/* Recenter Map Button */}
          <button
            onClick={handleRecenter}
            className="w-9 h-9 bg-white border border-slate-200 rounded-md flex items-center justify-center text-blue-700 shadow-xs cursor-pointer hover:bg-blue-50"
            title="Recenter Vehicle & Follow"
            aria-label="Recenter Vehicle"
          >
            <NavigationIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Live Metrics HUD Overlay */}
        <LiveMetricsOverlay
          remainingKm={remainingKm}
          drDrift={drDrift}
          isGnssActive={isGnssLocked}
          liveHeading={liveHeading}
          cameraMode={cameraMode}
          onToggleCameraMode={() =>
            setCameraMode((prev) => (prev === 'north-up' ? 'head-up' : 'north-up'))
          }
          onEndNavigation={handleEndNavigation}
        />
      </div>
    </MobileShell>
  );
};
