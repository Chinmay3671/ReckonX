import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Compass, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { MobileShell } from '../components/MobileShell';
import { SensorService } from '../services/sensorService';

export const SplashPage: React.FC = () => {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);

  const hasMotion = typeof window !== 'undefined' && SensorService.hasMotionSupport();
  const hasOrientation = typeof window !== 'undefined' && SensorService.hasOrientationSupport();
  const hasGeolocation = typeof navigator !== 'undefined' && !!navigator.geolocation;
  const hasIndexedDB = typeof window !== 'undefined' && !!window.indexedDB;

  useEffect(() => {
    const startTime = Date.now();
    const duration = 1200;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const currentProgress = Math.min(100, Math.floor((elapsed / duration) * 100));
      setProgress(currentProgress);

      if (elapsed >= duration) {
        clearInterval(interval);
      }
    }, 25);

    return () => clearInterval(interval);
  }, []);

  return (
    <MobileShell>
      <div className="h-full flex flex-col justify-between p-5 my-auto">
        <div className="w-full my-auto flex flex-col items-center">
          {/* Centered Brand Block */}
          <div className="w-full text-center mb-6">
            <div className="w-14 h-14 bg-blue-700 rounded-md flex items-center justify-center mx-auto mb-3 text-white shadow-xs">
              <Compass className="w-8 h-8" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">ReckonX Navigation</h1>
            <p className="text-xs text-slate-500 mt-1">Autonomous Dead Reckoning System</p>
          </div>

          {/* Diagnostic Checklist Card */}
          <div className="bg-white border border-slate-200 rounded-md p-4 w-full space-y-3 mb-6 shadow-xs">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 border-b border-slate-200 pb-2 flex items-center justify-between">
              <span>Hardware & API Diagnostics</span>
              {progress < 100 ? (
                <Loader2 className="w-3.5 h-3.5 text-blue-700 animate-spin" />
              ) : (
                <span className="text-emerald-600 text-[10px] font-mono">READY</span>
              )}
            </h2>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-900 font-medium">GPS Geolocation API</span>
              {hasGeolocation ? (
                <span className="flex items-center gap-1 font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-600/20 text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Supported
                </span>
              ) : (
                <span className="flex items-center gap-1 font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-600/20 text-[11px]">
                  <AlertCircle className="w-3.5 h-3.5" /> Unavailable
                </span>
              )}
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-900 font-medium">Device Motion (Accelerometer)</span>
              {hasMotion ? (
                <span className="flex items-center gap-1 font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-600/20 text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Supported
                </span>
              ) : (
                <span className="flex items-center gap-1 font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                  <AlertCircle className="w-3.5 h-3.5 text-slate-400" /> Sensor Unsupported
                </span>
              )}
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-900 font-medium">Device Orientation (Compass)</span>
              {hasOrientation ? (
                <span className="flex items-center gap-1 font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-600/20 text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Supported
                </span>
              ) : (
                <span className="flex items-center gap-1 font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                  <AlertCircle className="w-3.5 h-3.5 text-slate-400" /> Sensor Unsupported
                </span>
              )}
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-900 font-medium">IndexedDB Tile Cache Store</span>
              {hasIndexedDB ? (
                <span className="flex items-center gap-1 font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-600/20 text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Available
                </span>
              ) : (
                <span className="flex items-center gap-1 font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200 text-[11px]">
                  <AlertCircle className="w-3.5 h-3.5" /> Disabled
                </span>
              )}
            </div>
          </div>

          {/* Progress bar track */}
          <div className="w-full bg-white border border-slate-200 rounded-md p-3 shadow-xs">
            <div className="flex justify-between items-center text-xs mb-1.5 font-mono">
              <span className="text-slate-500">HARDWARE INITIALIZATION</span>
              <span className="font-bold text-blue-700">{progress}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
              <div
                className="h-full bg-blue-700 transition-all duration-75"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Primary Action Button */}
        <button
          onClick={() => navigate('/login')}
          className="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold py-3 px-4 rounded-md transition-colors text-xs mt-6 cursor-pointer"
        >
          Continue to Sign-In →
        </button>
      </div>
    </MobileShell>
  );
};
