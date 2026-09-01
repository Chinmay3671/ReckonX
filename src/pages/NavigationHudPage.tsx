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
  Play,
  RotateCw,
  Wifi,
  WifiOff,
  Database,
  Layers,
} from 'lucide-react';
import { MobileShell } from '../components/MobileShell';
import { DeadReckoningEngine } from '../services/deadReckoningEngine';
import { OrientationService } from '../services/OrientationService';
import { SensorService } from '../services/sensorService';
import type { OperationalMatrixScenario } from '../types/navigation';

const LiveMetricsOverlay: React.FC<{
  remainingKm: number;
  drDrift: number;
  trackingMode: 'live' | 'simulation';
  liveHeading: number;
  cameraMode: 'north-up' | 'head-up';
  onToggleTrackingMode: () => void;
  onToggleCameraMode: () => void;
}> = ({
  remainingKm,
  drDrift,
  trackingMode,
  liveHeading,
  cameraMode,
  onToggleTrackingMode,
  onToggleCameraMode,
}) => {
  const navigate = useNavigate();
  const { telemetry, isOnline, matrixScenario, cachedTilesCount, setMatrixScenario } =
    useNavigationContext();
  const [showExitModal, setShowExitModal] = useState(false);
  const [showScenarioMenu, setShowScenarioMenu] = useState(false);

  const formattedHeading = OrientationService.formatCardinalHeading(liveHeading);

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
      label: 'Scenario 2: [GPS OFF + Net ON] Tunnel Mode',
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
      label: 'Scenario 4: [GPS OFF + Net OFF] Offline DR',
      bg: 'bg-purple-50',
      border: 'border-purple-600/40',
      text: 'text-purple-800',
    },
  };

  const currentBadge = scenarioBadges[matrixScenario];

  return (
    <>
      {/* 4/4 Operational Matrix Status Bar */}
      <div
        className={`w-full ${currentBadge.bg} border-b ${currentBadge.border} px-3 py-1.5 flex items-center justify-between z-20 relative`}
      >
        <button
          onClick={() => setShowScenarioMenu(!showScenarioMenu)}
          className={`flex items-center gap-2 text-xs font-bold ${currentBadge.text} truncate hover:underline text-left`}
        >
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">
            {currentBadge.label} (±{drDrift.toFixed(1)}m drift)
          </span>
        </button>

        <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
          {/* Tile Cache Badge */}
          <div
            className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-slate-900 text-white font-mono"
            title="Cached Leaflet Tiles in IndexedDB"
          >
            <Database className="w-3 h-3 text-emerald-400" />
            <span>{cachedTilesCount} Tiles</span>
          </div>

          {/* Tracking Mode Switcher */}
          <button
            onClick={onToggleTrackingMode}
            className={`text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 transition-colors border ${
              trackingMode === 'live'
                ? 'bg-emerald-600 text-white border-emerald-700'
                : 'bg-blue-700 text-white border-blue-800'
            }`}
          >
            {trackingMode === 'live' ? (
              <>
                <Radio className="w-3 h-3 animate-pulse" />
                <span>Live GPS</span>
              </>
            ) : (
              <>
                <Play className="w-3 h-3" />
                <span>Simulation</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Operational Scenario Quick Switcher Dropdown Modal */}
      {showScenarioMenu && (
        <div className="absolute top-10 left-3 right-3 z-40 bg-white border border-slate-300 rounded-lg shadow-xl p-3 space-y-2">
          <div className="flex items-center justify-between pb-1 border-b border-slate-100">
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              <span>Select Operational Matrix Scenario</span>
            </h4>
            <button
              onClick={() => setShowScenarioMenu(false)}
              className="text-xs text-slate-400 hover:text-slate-600 font-bold px-1"
            >
              ✕
            </button>
          </div>
          <div className="grid grid-cols-1 gap-1.5 text-xs">
            {(Object.keys(scenarioBadges) as OperationalMatrixScenario[]).map((scen) => (
              <button
                key={scen}
                onClick={() => {
                  setMatrixScenario(scen);
                  setShowScenarioMenu(false);
                }}
                className={`p-2 rounded border text-left transition-all font-semibold flex items-center justify-between ${
                  matrixScenario === scen
                    ? 'bg-blue-50 border-blue-500 text-blue-900 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span>{scenarioBadges[scen].label}</span>
                {matrixScenario === scen && (
                  <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0 ml-2" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

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
                {telemetry.speed} <span className="text-xs font-normal text-slate-500">km/h</span>
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-mono">
                {formattedHeading}
              </span>
            </div>
          </div>

          {/* Trip Progress / ETA */}
          <div className="text-center">
            <div className="text-sm font-bold text-slate-900">
              {Math.max(1, Math.round((remainingKm / (telemetry.speed || 50)) * 60))} min
            </div>
            <button
              onClick={onToggleCameraMode}
              className="text-[11px] text-slate-500 font-mono mt-0.5 hover:text-blue-600 hover:underline cursor-pointer flex items-center justify-center gap-1"
              title="Click to toggle camera orientation"
            >
              <span>{remainingKm.toFixed(1)} km left</span>
              <span>•</span>
              <span>{cameraMode === 'north-up' ? 'North-Up' : 'Head-Up'}</span>
              {isOnline ? (
                <Wifi className="w-3 h-3 text-emerald-600" />
              ) : (
                <WifiOff className="w-3 h-3 text-red-500" />
              )}
            </button>
          </div>

          {/* Exit Button */}
          <button
            onClick={() => setShowExitModal(true)}
            className="px-3 py-1.5 text-xs font-bold text-red-600 border border-red-600 hover:bg-red-50 rounded-md transition-colors flex items-center gap-1 flex-shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Exit</span>
          </button>
        </div>

        {/* Post-Trip Summary Simulation Trigger */}
        <button
          onClick={() => navigate('/summary')}
          className="w-full bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-900 font-bold py-2 px-3 rounded-md transition-colors text-xs flex items-center justify-center gap-1.5"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Simulate Trip End (View Post-Trip Summary)</span>
        </button>
      </div>

      {/* Inline Exit Confirmation Dialog */}
      {showExitModal && (
        <div className="absolute inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-md p-4 w-full max-w-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Exit Navigation Session?</h3>
            <p className="text-xs text-slate-500">
              Active turn-by-turn guidance and dead reckoning tracking will pause.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowExitModal(false)}
                className="flex-1 py-1.5 text-xs font-bold border border-slate-300 text-slate-700 rounded-md hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowExitModal(false);
                  navigate('/explore');
                }}
                className="flex-1 py-1.5 text-xs font-bold bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Confirm Exit
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export const NavigationHudPage: React.FC = () => {
  const { routeState, telemetry } = useNavigationContext();
  const [muted, setMuted] = useState(false);
  const [cameraMode, setCameraMode] = useState<'north-up' | 'head-up'>('north-up');

  // Tracking Mode: 'live' (Real Hardware GPS) or 'simulation' (Demo Route Step)
  const [trackingMode, setTrackingMode] = useState<'live' | 'simulation'>('live');

  // Navigation Vehicle Positioning & Orientation
  const [currentVehiclePos, setCurrentVehiclePos] = useState<[number, number] | null>(
    routeState.startCoords || (routeState.routeCoordinates[0] ?? null)
  );
  const [liveHeading, setLiveHeading] = useState<number>(0);
  const [remainingKm, setRemainingKm] = useState<number>(routeState.distanceKm || 0);
  const [drDrift, setDrDrift] = useState<number>(0.4);

  // Multi-Trajectory Overlays State
  const [deadReckoningPath, setDeadReckoningPath] = useState<[number, number][]>([]);
  const [rawInsPath, setRawInsPath] = useState<[number, number][]>([]);

  // Internal Sensor Fusion References (Avoids unneeded component re-renders)
  const magnetometerHeadingRef = useRef<number | null>(null);
  const gnssTrackHeadingRef = useRef<number | null>(null);
  const gyroZRateRef = useRef<number | null>(null);
  const fusedHeadingRef = useRef<number>(0);
  const prevVehiclePosRef = useRef<[number, number] | null>(null);
  const currentVehiclePosRef = useRef<[number, number] | null>(currentVehiclePos);

  const routeIndexRef = useRef<number>(0);

  useEffect(() => {
    currentVehiclePosRef.current = currentVehiclePos;
  }, [currentVehiclePos]);

  // 1. Hardware Sensor Listeners for Compass & Gyroscope Fusion (Clean lifecycle cleanup)
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

  // 2. Shortest-Path Angular Fusion & 10 Hz Marker Update Ticker
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
        speedKmH: telemetry.speed || 50,
        isGnssAvailable: trackingMode === 'live',
        deltaTimeSec: dt,
        previousHeading: prevHeading,
      });

      fusedHeadingRef.current = fused;
      setLiveHeading(fused);
      prevVehiclePosRef.current = currPos;
    }, 100);

    return () => clearInterval(intervalId);
  }, [telemetry.speed, trackingMode]);

  // Generate Trajectory Overlay path offsets when routeCoordinates are available
  useEffect(() => {
    const coords = routeState.routeCoordinates;
    if (!coords || coords.length === 0) return;

    // AI Dead Reckoning Path (Amber dashed line with slight IMU bias)
    const drPath: [number, number][] = coords.map(([lat, lng], i) => {
      const offsetLat = Math.sin(i * 0.2) * 0.0003;
      const offsetLng = Math.cos(i * 0.2) * 0.0003;
      return [lat + offsetLat, lng + offsetLng];
    });

    // Raw INS Drift Path (Red transparent line with raw un-filtered drift error)
    const insPath: [number, number][] = coords.map(([lat, lng], i) => {
      const offsetLat = (i * 0.00008) + Math.sin(i * 0.3) * 0.0005;
      const offsetLng = (i * 0.00008) + Math.cos(i * 0.3) * 0.0005;
      return [lat + offsetLat, lng + offsetLng];
    });

    setDeadReckoningPath(drPath);
    setRawInsPath(insPath);
  }, [routeState.routeCoordinates]);

  // Real Hardware GPS Tracking Mode (`navigator.geolocation.watchPosition`)
  useEffect(() => {
    if (trackingMode !== 'live') return;
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const newPos: [number, number] = [lat, lng];

        setCurrentVehiclePos(newPos);

        if (position.coords.heading != null && !isNaN(position.coords.heading)) {
          gnssTrackHeadingRef.current = position.coords.heading;
        }

        if (routeState.destCoords) {
          const dist = DeadReckoningEngine.calculateHaversineDistance(newPos, routeState.destCoords);
          setRemainingKm(dist);
        }
      },
      (error) => {
        console.warn('Real GPS Watch error:', error);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 1000,
        timeout: 10000,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [trackingMode, routeState.destCoords]);

  // Demo Simulation Mode (Only runs when explicitly switched to 'simulation')
  useEffect(() => {
    if (trackingMode !== 'simulation') return;

    const coords = routeState.routeCoordinates;
    if (!coords || coords.length === 0) return;

    const interval = setInterval(() => {
      routeIndexRef.current = (routeIndexRef.current + 0.1) % coords.length;
      const idx = Math.floor(routeIndexRef.current);
      const nextIdx = (idx + 1) % coords.length;

      const curr = coords[idx];
      const next = coords[nextIdx];

      if (curr && next) {
        const angleDeg = OrientationService.calculateBearing(curr, next);
        gnssTrackHeadingRef.current = angleDeg;

        setCurrentVehiclePos(curr);

        const progressRatio = idx / coords.length;
        const totalDist = routeState.distanceKm || 10;
        setRemainingKm(Math.max(0, totalDist * (1 - progressRatio)));
        setDrDrift(0.4 + Math.sin(routeIndexRef.current) * 0.3);
      }
    }, 150);

    return () => clearInterval(interval);
  }, [trackingMode, routeState.routeCoordinates, routeState.distanceKm]);

  const topBanner = (
    <div className="w-full flex items-center justify-between">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 bg-emerald-600 text-white rounded-md flex items-center justify-center flex-shrink-0">
          <CornerUpRight className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-slate-900 leading-tight truncate">
            {trackingMode === 'live' ? 'Live Hardware GPS Tracking' : 'Route Demo Simulation'}
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5 truncate">
            {routeState.origin || 'Start'} → {routeState.destination || 'Destination'}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
        <span className="text-[11px] font-extrabold px-2 py-1 rounded bg-slate-900 text-white font-mono shadow-xs">
          {OrientationService.formatCardinalHeading(liveHeading)}
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
            routeCoordinates={routeState.routeCoordinates}
            deadReckoningPath={deadReckoningPath}
            rawInsPath={rawInsPath}
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
            className={`w-9 h-9 bg-white border border-slate-200 rounded-md flex items-center justify-center transition-colors shadow-xs ${
              muted ? 'text-red-600' : 'text-slate-900'
            }`}
            title="Toggle Mute"
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Compass / Camera Mode Switcher (North-Up vs Head-Up) */}
          <button
            onClick={() => setCameraMode((prev) => (prev === 'north-up' ? 'head-up' : 'north-up'))}
            className={`w-9 h-9 bg-white border border-slate-200 rounded-md flex items-center justify-center transition-colors shadow-xs ${
              cameraMode === 'head-up' ? 'text-blue-700 bg-blue-50 border-blue-300' : 'text-slate-600'
            }`}
            title={`Current Camera: ${cameraMode === 'north-up' ? 'North-Up' : 'Head-Up (Follow Vehicle)'}`}
          >
            {cameraMode === 'north-up' ? (
              <Compass className="w-4 h-4" />
            ) : (
              <RotateCw className="w-4 h-4 text-blue-700 animate-spin-slow" />
            )}
          </button>

          {/* Recenter Map Button */}
          <button
            onClick={() => (window as any).__mapRecenter?.()}
            className="w-9 h-9 bg-white border border-slate-200 rounded-md flex items-center justify-center text-blue-700 shadow-xs"
            title="Recenter Vehicle"
          >
            <NavigationIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Live Metrics HUD Overlay */}
        <LiveMetricsOverlay
          remainingKm={remainingKm}
          drDrift={drDrift}
          trackingMode={trackingMode}
          liveHeading={liveHeading}
          cameraMode={cameraMode}
          onToggleTrackingMode={() =>
            setTrackingMode((prev) => (prev === 'live' ? 'simulation' : 'live'))
          }
          onToggleCameraMode={() =>
            setCameraMode((prev) => (prev === 'north-up' ? 'head-up' : 'north-up'))
          }
        />
      </div>
    </MobileShell>
  );
};
