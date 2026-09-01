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
} from 'lucide-react';
import { MobileShell } from '../components/MobileShell';
import { DeadReckoningEngine } from '../services/deadReckoningEngine';

const LiveMetricsOverlay: React.FC<{
  remainingKm: number;
  drDrift: number;
  trackingMode: 'live' | 'simulation';
  onToggleTrackingMode: () => void;
}> = ({ remainingKm, drDrift, trackingMode, onToggleTrackingMode }) => {
  const navigate = useNavigate();
  const { telemetry } = useNavigationContext();
  const [showExitModal, setShowExitModal] = useState(false);

  return (
    <>
      {/* Automated GNSS Outage / Tracking Mode Bar */}
      <div className="w-full bg-amber-50 border-b border-amber-600/40 px-3 py-1.5 flex items-center justify-between z-20 relative">
        <button
          onClick={() => navigate('/telemetry')}
          className="flex items-center gap-2 text-xs font-bold text-amber-700 truncate hover:underline"
        >
          <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-600" />
          <span className="truncate">
            ● {trackingMode === 'live' ? 'Live Hardware GPS Active' : 'GNSS Outage Simulation'} (±{drDrift.toFixed(1)} m drift)
          </span>
        </button>

        <button
          onClick={onToggleTrackingMode}
          className={`text-[10px] font-bold px-2.5 py-1 rounded flex items-center gap-1.5 transition-colors border flex-shrink-0 ml-2 ${
            trackingMode === 'live'
              ? 'bg-emerald-600 text-white border-emerald-700'
              : 'bg-blue-700 text-white border-blue-800'
          }`}
        >
          {trackingMode === 'live' ? (
            <>
              <Radio className="w-3 h-3 animate-pulse" />
              <span>Real GPS Live</span>
            </>
          ) : (
            <>
              <Play className="w-3 h-3" />
              <span>Demo Simulation</span>
            </>
          )}
        </button>
      </div>

      {/* Bottom Docked HUD Panel */}
      <div className="absolute bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Current Speed</span>
            <span className="text-xl font-bold font-mono text-slate-900 leading-tight">
              {telemetry.speed} <span className="text-xs font-normal">km/h</span>
            </span>
          </div>

          <div className="text-center">
            <div className="text-sm font-bold text-slate-900">
              {Math.max(1, Math.round((remainingKm / (telemetry.speed || 50)) * 60))} min
            </div>
            <div className="text-xs text-slate-500 font-mono mt-0.5">
              {remainingKm.toFixed(1)} km left • {trackingMode === 'live' ? 'Live GPS' : 'OSRM Demo'}
            </div>
          </div>

          <button
            onClick={() => setShowExitModal(true)}
            className="px-3 py-1.5 text-xs font-bold text-red-600 border border-red-600 hover:bg-red-50 rounded-md transition-colors flex items-center gap-1"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Exit</span>
          </button>
        </div>

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
  const { routeState } = useNavigationContext();
  const [muted, setMuted] = useState(false);
  const [northUp, setNorthUp] = useState(true);

  // Tracking Mode: 'live' (Real Hardware GPS) or 'simulation' (Demo Route Step)
  const [trackingMode, setTrackingMode] = useState<'live' | 'simulation'>('live');

  // Navigation Vehicle Positioning
  const [currentVehiclePos, setCurrentVehiclePos] = useState<[number, number] | null>(
    routeState.startCoords || (routeState.routeCoordinates[0] ?? null)
  );
  const [liveHeading, setLiveHeading] = useState<number>(0);
  const [remainingKm, setRemainingKm] = useState<number>(routeState.distanceKm || 0);
  const [drDrift, setDrDrift] = useState<number>(0.4);

  // Multi-Trajectory Overlays State
  const [deadReckoningPath, setDeadReckoningPath] = useState<[number, number][]>([]);
  const [rawInsPath, setRawInsPath] = useState<[number, number][]>([]);

  const routeIndexRef = useRef<number>(0);

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

    let prevPos: [number, number] | null = currentVehiclePos;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const newPos: [number, number] = [lat, lng];

        if (prevPos) {
          const dLat = lat - prevPos[0];
          const dLng = lng - prevPos[1];
          if (Math.abs(dLat) > 0.00001 || Math.abs(dLng) > 0.00001) {
            const angleDeg = Math.atan2(dLng, dLat) * (180 / Math.PI);
            setLiveHeading(angleDeg);
          }
        }
        prevPos = newPos;
        setCurrentVehiclePos(newPos);

        if (position.coords.heading != null && !isNaN(position.coords.heading)) {
          setLiveHeading(position.coords.heading);
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
        const dLat = next[0] - curr[0];
        const dLng = next[1] - curr[1];
        const angleDeg = Math.atan2(dLng, dLat) * (180 / Math.PI);

        setCurrentVehiclePos(curr);
        setLiveHeading(angleDeg);

        const progressRatio = idx / coords.length;
        const totalDist = routeState.distanceKm || 10;
        setRemainingKm(Math.max(0, totalDist * (1 - progressRatio)));
        setDrDrift(0.4 + Math.sin(routeIndexRef.current) * 0.3);
      }
    }, 150);

    return () => clearInterval(interval);
  }, [trackingMode, routeState.routeCoordinates, routeState.distanceKm]);

  const topBanner = (
    <div className="w-full flex items-center gap-3">
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
  );

  return (
    <MobileShell header={topBanner} hideHeaderPadding hideFooterPadding>
      <div className="relative h-full w-full bg-slate-50 overflow-hidden">
        {/* Map Viewport rendering multi-trajectory overlays & live vehicle position */}
        <div className="w-full h-full pt-14 pb-28">
          <MapView
            mode="navigation"
            zoom={15}
            showRoute={true}
            startCoords={routeState.startCoords}
            destCoords={routeState.destCoords}
            routeCoordinates={routeState.routeCoordinates}
            deadReckoningPath={deadReckoningPath}
            rawInsPath={rawInsPath}
            liveVehiclePos={currentVehiclePos}
            liveHeading={liveHeading}
          />
        </div>

        {/* Floating Right Controls */}
        <div className="absolute right-3 top-16 z-20 flex flex-col gap-2">
          <button
            onClick={() => setMuted(!muted)}
            className={`w-9 h-9 bg-white border border-slate-200 rounded-md flex items-center justify-center transition-colors shadow-xs ${
              muted ? 'text-red-600' : 'text-slate-900'
            }`}
            title="Toggle Mute"
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setNorthUp(!northUp)}
            className={`w-9 h-9 bg-white border border-slate-200 rounded-md flex items-center justify-center transition-colors shadow-xs ${
              northUp ? 'text-blue-700' : 'text-slate-500'
            }`}
            title="Compass Mode"
          >
            <Compass className="w-4 h-4" />
          </button>

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
          onToggleTrackingMode={() =>
            setTrackingMode((prev) => (prev === 'live' ? 'simulation' : 'live'))
          }
        />
      </div>
    </MobileShell>
  );
};
