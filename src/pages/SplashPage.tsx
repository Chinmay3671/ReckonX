import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Compass, CheckCircle2 } from 'lucide-react';
import { MobileShell } from '../components/MobileShell';

export const SplashPage: React.FC = () => {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);
  const [checklistVisible, setChecklistVisible] = useState([false, false, false]);

  useEffect(() => {
    const startTime = Date.now();
    const duration = 1500;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const currentProgress = Math.min(100, Math.floor((elapsed / duration) * 100));
      setProgress(currentProgress);

      if (currentProgress > 30) setChecklistVisible((prev) => [true, prev[1], prev[2]]);
      if (currentProgress > 65) setChecklistVisible((prev) => [prev[0], true, prev[2]]);
      if (currentProgress >= 95) setChecklistVisible([true, true, true]);

      if (elapsed >= duration) {
        clearInterval(interval);
      }
    }, 30);

    return () => clearInterval(interval);
  }, []);

  return (
    <MobileShell>
      <div className="h-full flex flex-col justify-between p-5 my-auto">
        <div className="w-full my-auto flex flex-col items-center">
          {/* Centered Brand Block */}
          <div className="w-full text-center mb-6">
            <div className="w-14 h-14 bg-blue-700 rounded-md flex items-center justify-center mx-auto mb-3 text-white">
              <Compass className="w-8 h-8" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">ReckonX Navigation</h1>
            <p className="text-xs text-slate-500 mt-1">Checking Phone Sensors</p>
          </div>

          {/* Diagnostic Checklist Card */}
          <div className="bg-white border border-slate-200 rounded-md p-4 w-full space-y-3 mb-6">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 border-b border-slate-200 pb-2">
              Hardware Diagnostic Status
            </h2>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-900 font-medium">3-Axis Accelerometer & Gyro (100 Hz)</span>
              {checklistVisible[0] ? (
                <span className="flex items-center gap-1 font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-600/20 text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5" /> OK
                </span>
              ) : (
                <span className="text-slate-400 font-mono text-[10px]">Testing...</span>
              )}
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-900 font-medium">Kalman Filter Dead Reckoning Engine</span>
              {checklistVisible[1] ? (
                <span className="flex items-center gap-1 font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-600/20 text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5" /> OK
                </span>
              ) : (
                <span className="text-slate-400 font-mono text-[10px]">Testing...</span>
              )}
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-900 font-medium">Offline Vector Map Tiles</span>
              {checklistVisible[2] ? (
                <span className="flex items-center gap-1 font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-600/20 text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5" /> OK
                </span>
              ) : (
                <span className="text-slate-400 font-mono text-[10px]">Testing...</span>
              )}
            </div>
          </div>

          {/* 4px Progress bar track */}
          <div className="w-full bg-white border border-slate-200 rounded-md p-3">
            <div className="flex justify-between items-center text-xs mb-1.5 font-mono">
              <span className="text-slate-500">HARDWARE INIT</span>
              <span className="font-bold text-blue-700">{progress}%</span>
            </div>
            <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
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
          className="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold py-3 px-4 rounded-md transition-colors text-xs mt-6"
        >
          Continue to Sign-In
        </button>
      </div>
    </MobileShell>
  );
};
