import React from 'react';
import { useNavigate } from 'react-router-dom';
import { TopHeader } from '../components/TopHeader';
import { MapView } from '../components/MapView';
import { useNavigationContext } from '../context/NavigationContext';
import { Download, AlertCircle } from 'lucide-react';
import { MobileShell } from '../components/MobileShell';
import { DeadReckoningEngine } from '../services/deadReckoningEngine';
import { formatKmDistance } from '../utils/distanceFormatter';

export const SummaryPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    routeState,
    settings,
    trackingSession,
    exportCurrentSessionLogs,
  } = useNavigationContext();

  const handleExportCsv = () => {
    exportCurrentSessionLogs();
  };

  const header = (
    <TopHeader
      title="Trip Summary & Benchmark"
      subtitle={
        routeState.destination
          ? `${routeState.origin || 'Start'} → ${routeState.destination}`
          : 'Completed Navigation Session'
      }
      backTo="/explore"
    />
  );

  const points = trackingSession.points;
  const hasPoints = points.length > 0;

  // Calculate genuine metrics strictly from real collected session points
  let calculatedDistanceKm = 0;
  if (points.length > 1) {
    for (let i = 1; i < points.length; i++) {
      const p1: [number, number] = [points[i - 1].lat, points[i - 1].lng];
      const p2: [number, number] = [points[i].lat, points[i].lng];
      calculatedDistanceKm += DeadReckoningEngine.calculateHaversineDistance(p1, p2);
    }
  }

  const durationSec = trackingSession.startTime && trackingSession.endTime
    ? Math.max(1, Math.round((trackingSession.endTime - trackingSession.startTime) / 1000))
    : points.length > 1
    ? Math.max(1, Math.round((points[points.length - 1].timestamp - points[0].timestamp) / 1000))
    : 0;

  const durationMins = Math.floor(durationSec / 60);
  const durationRemainingSec = durationSec % 60;
  const formattedDuration = durationSec > 0 ? `${durationMins}m ${durationRemainingSec}s` : 'N/A';

  const totalPointsCount = points.length;
  const gnssCount = trackingSession.gnssPointsCount;
  const drCount = trackingSession.drPointsCount;
  const drRatio = totalPointsCount > 0 ? Math.round((drCount / totalPointsCount) * 100) : 0;
  const gnssRatio = totalPointsCount > 0 ? Math.round((gnssCount / totalPointsCount) * 100) : 0;

  const sessionRouteCoords: [number, number][] = points.map((p) => [p.lat, p.lng]);

  return (
    <MobileShell header={header}>
      <div className="h-full flex flex-col justify-between p-4">
        <div className="space-y-4">
          {/* Dynamic Route Map Card */}
          <div className="bg-white border border-slate-200 rounded-md p-3 space-y-2 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold text-slate-900">
              <span>Actual Tracked Trajectory</span>
              {hasPoints ? (
                <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-600/20 text-[10px] font-mono">
                  {totalPointsCount} POINTS LOGGED
                </span>
              ) : (
                <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-600/20 text-[10px] font-mono">
                  NO SESSION POINTS
                </span>
              )}
            </div>

            <div className="w-full h-44 rounded-md overflow-hidden border border-slate-200 relative">
              <MapView
                mode="summary"
                showRoute={true}
                startCoords={routeState.startCoords}
                destCoords={routeState.destCoords}
                routeCoordinates={
                  sessionRouteCoords.length > 0 ? sessionRouteCoords : routeState.routeCoordinates
                }
              />
              {!hasPoints && !routeState.calculated && (
                <div className="absolute inset-0 bg-slate-50/80 backdrop-blur-2xs flex flex-col items-center justify-center p-3 text-center">
                  <AlertCircle className="w-5 h-5 text-slate-400 mb-1" />
                  <span className="text-xs font-bold text-slate-700">No telemetry recorded</span>
                  <span className="text-[10px] text-slate-400 mt-0.5">
                    Start live navigation to log genuine GPS and DR points
                  </span>
                </div>
              )}
            </div>

            {/* Map Legend */}
            <div className="flex items-center justify-around pt-1 text-[11px] font-medium border-t border-slate-100">
              <div className="flex items-center gap-1.5 text-emerald-600">
                <span className="w-3 h-1 bg-emerald-600 rounded" />
                <span>GNSS ({gnssRatio}%)</span>
              </div>
              <div className="flex items-center gap-1.5 text-amber-600">
                <span className="w-3 h-1 bg-amber-600 rounded border border-dashed border-amber-600" />
                <span>Dead Reckoning ({drRatio}%)</span>
              </div>
            </div>
          </div>

          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider px-1">
            Genuine Session Telemetrics
          </h2>

          {/* 2x2 Benchmark Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Total Distance */}
            <div className="bg-white border border-slate-200 rounded-md p-3.5 space-y-1 shadow-xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Actual Distance</span>
              <div className="text-base font-bold text-slate-900 font-mono">
                {hasPoints
                  ? formatKmDistance(calculatedDistanceKm, settings.distanceUnit, 2)
                  : routeState.calculated
                  ? formatKmDistance(routeState.distanceKm, settings.distanceUnit, 2)
                  : 'N/A'}
              </div>
              <span className="text-[10px] text-slate-500 truncate block">
                {hasPoints ? `${totalPointsCount} GPS/DR fixes` : 'No points collected'}
              </span>
            </div>

            {/* Duration */}
            <div className="bg-white border border-slate-200 rounded-md p-3.5 space-y-1 shadow-xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Session Duration</span>
              <div className="text-base font-bold text-slate-900 font-mono">{formattedDuration}</div>
              <span className="text-[10px] text-slate-500 font-medium">Elapsed time</span>
            </div>

            {/* Average Speed */}
            <div className="bg-white border border-slate-200 rounded-md p-3.5 space-y-1 shadow-xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Average Speed</span>
              <div className="text-base font-bold font-mono text-slate-900">
                {hasPoints && trackingSession.averageSpeedKmH > 0
                  ? `${trackingSession.averageSpeedKmH.toFixed(1)} km/h`
                  : 'N/A'}
              </div>
              <span className="text-[10px] text-slate-500">
                Max: {trackingSession.maxSpeedKmH > 0 ? `${trackingSession.maxSpeedKmH.toFixed(1)} km/h` : 'N/A'}
              </span>
            </div>

            {/* DR Points Count */}
            <div className="bg-white border border-slate-200 rounded-md p-3.5 space-y-1 shadow-xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase">DR Outage Ratio</span>
              <div className="text-base font-bold text-amber-600 font-mono">
                {hasPoints ? `${drCount} points` : 'N/A'}
              </div>
              <span className="text-[10px] text-slate-500">
                {hasPoints ? `${drRatio}% of session` : 'Zero DR engagement'}
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="pt-4 flex gap-3 border-t border-slate-200">
          <button
            onClick={handleExportCsv}
            disabled={!hasPoints}
            className={`flex-1 font-bold py-2.5 px-3 rounded-md transition-colors text-xs flex items-center justify-center gap-1.5 shadow-xs ${
              hasPoints
                ? 'bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 cursor-pointer'
                : 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV Log</span>
          </button>

          <button
            onClick={() => navigate('/explore')}
            className="flex-1 bg-blue-700 hover:bg-blue-800 text-white font-bold py-2.5 px-3 rounded-md transition-colors text-xs cursor-pointer shadow-xs"
          >
            New Route
          </button>
        </div>
      </div>
    </MobileShell>
  );
};
