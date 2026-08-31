import React, { useState } from 'react';
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
} from 'lucide-react';
import { MobileShell } from '../components/MobileShell';

// Separate Child Component for dynamic speed & drift overlay to prevent map re-renders
const LiveMetricsOverlay: React.FC = () => {
  const navigate = useNavigate();
  const { telemetry } = useNavigationContext();
  const [showExitModal, setShowExitModal] = useState(false);

  return (
    <>
      {/* Automated Alert Strip */}
      <button
        onClick={() => navigate('/telemetry')}
        className="w-full bg-amber-50 border-b border-amber-600/40 px-3 py-1.5 text-left flex items-center justify-between hover:bg-amber-100 transition-colors"
      >
        <div className="flex items-center gap-2 text-xs font-bold text-amber-600 truncate">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">
            ● GPS Lost in Tunnel • Motion Sensor Navigation Active (±{telemetry.drift} m drift)
          </span>
        </div>
        <span className="text-[10px] font-bold text-blue-700 bg-white border border-blue-700/30 px-2 py-0.5 rounded flex-shrink-0 ml-2">
          VIEW STREAM →
        </span>
      </button>

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
            <div className="text-sm font-bold text-slate-900">1 hr 12 min</div>
            <div className="text-xs text-slate-500 font-mono mt-0.5">
              {telemetry.remainingKm} km left • {telemetry.eta} ETA
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
  const [muted, setMuted] = useState(false);
  const [northUp, setNorthUp] = useState(true);

  const topBanner = (
    <div className="w-full flex items-center gap-3">
      <div className="w-9 h-9 bg-emerald-600 text-white rounded-md flex items-center justify-center flex-shrink-0">
        <CornerUpRight className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <h2 className="text-sm font-bold text-slate-900 leading-tight truncate">
          In 300 m turn right into Expressway Tunnel
        </h2>
        <p className="text-[11px] text-slate-500 mt-0.5 truncate">
          Then stay straight for 3.4 km on NH 65
        </p>
      </div>
    </div>
  );

  return (
    <MobileShell header={topBanner} hideHeaderPadding hideFooterPadding>
      <div className="relative h-full w-full bg-slate-50 overflow-hidden">
        {/* Isolated Map Viewport (85% height) */}
        <div className="w-full h-full pt-14 pb-28">
          <MapView mode="navigation" zoom={13} />
        </div>

        {/* Floating Right Controls */}
        <div className="absolute right-3 top-16 z-20 flex flex-col gap-2">
          <button
            onClick={() => setMuted(!muted)}
            className={`w-9 h-9 bg-white border border-slate-200 rounded-md flex items-center justify-center transition-colors ${
              muted ? 'text-red-600' : 'text-slate-900'
            }`}
            title="Toggle Mute"
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setNorthUp(!northUp)}
            className={`w-9 h-9 bg-white border border-slate-200 rounded-md flex items-center justify-center transition-colors ${
              northUp ? 'text-blue-700' : 'text-slate-500'
            }`}
            title="Compass Mode"
          >
            <Compass className="w-4 h-4" />
          </button>

          <button
            onClick={() => (window as any).__mapRecenter?.()}
            className="w-9 h-9 bg-white border border-slate-200 rounded-md flex items-center justify-center text-blue-700"
            title="Recenter Vehicle"
          >
            <NavigationIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Isolated Live Metrics Overlay */}
        <LiveMetricsOverlay />
      </div>
    </MobileShell>
  );
};
