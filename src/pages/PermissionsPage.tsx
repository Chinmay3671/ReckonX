import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TopHeader } from '../components/TopHeader';
import { useNavigationContext } from '../context/NavigationContext';
import {
  CheckCircle2,
  Lock,
  Navigation,
  Compass,
  Activity,
  Satellite,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { MobileShell } from '../components/MobileShell';
import { SensorService } from '../services/sensorService';

export const PermissionsPage: React.FC = () => {
  const navigate = useNavigate();
  const { sensorStatus, calibrateCompass, grantGnssPermission, grantAllSensors } =
    useNavigationContext();

  const [isRequesting, setIsRequesting] = useState(false);

  const hasMotion = typeof window !== 'undefined' && SensorService.hasMotionSupport();
  const hasOrientation = typeof window !== 'undefined' && SensorService.hasOrientationSupport();

  const handleGrantAll = async () => {
    setIsRequesting(true);
    try {
      await grantAllSensors();
    } finally {
      setIsRequesting(false);
      navigate('/explore');
    }
  };

  const header = (
    <TopHeader
      title="Hardware Permissions"
      subtitle="Direct access to physical device sensors & GPS"
      backTo="/login"
    />
  );

  return (
    <MobileShell header={header}>
      <div className="h-full flex flex-col justify-between p-4">
        <div className="space-y-3">
          <p className="text-xs text-slate-500 leading-relaxed px-1">
            ReckonX reads your physical device sensors to calculate real-time Dead Reckoning kinematics
            when GNSS satellite signals drop in tunnels.
          </p>

          {/* Card 1: Accelerometer */}
          <div className="bg-white border border-slate-200 rounded-md p-3 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-slate-100 text-slate-900 rounded-md flex items-center justify-center">
                <Activity className="w-4 h-4 text-blue-700" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900">3-Axis Accelerometer</h3>
                <p className="text-[11px] text-slate-500">Linear acceleration & ZUPT stops</p>
              </div>
            </div>
            {hasMotion ? (
              sensorStatus.accel ? (
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-600/20 flex items-center gap-1 font-mono">
                  <CheckCircle2 className="w-3 h-3" /> STREAMING
                </span>
              ) : (
                <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  Ready (Auto)
                </span>
              )
            ) : (
              <span className="text-[10px] font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 text-slate-400" /> Unsupported
              </span>
            )}
          </div>

          {/* Card 2: Gyroscope */}
          <div className="bg-white border border-slate-200 rounded-md p-3 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-slate-100 text-slate-900 rounded-md flex items-center justify-center">
                <Navigation className="w-4 h-4 text-indigo-700" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900">3-Axis Gyroscope</h3>
                <p className="text-[11px] text-slate-500">Angular rotation & turn rates</p>
              </div>
            </div>
            {hasMotion ? (
              sensorStatus.gyro ? (
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-600/20 flex items-center gap-1 font-mono">
                  <CheckCircle2 className="w-3 h-3" /> STREAMING
                </span>
              ) : (
                <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  Ready (Auto)
                </span>
              )
            ) : (
              <span className="text-[10px] font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 text-slate-400" /> Unsupported
              </span>
            )}
          </div>

          {/* Card 3: Magnetometer / Compass */}
          <div className="bg-white border border-slate-200 rounded-md p-3 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-slate-100 text-slate-900 rounded-md flex items-center justify-center">
                <Compass className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900">Compass / Magnetometer</h3>
                <p className="text-[11px] text-slate-500">True vehicle heading & azimuth</p>
              </div>
            </div>

            {hasOrientation ? (
              sensorStatus.compass ? (
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-600/20 flex items-center gap-1 font-mono">
                  <CheckCircle2 className="w-3 h-3" /> ACTIVE
                </span>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={calibrateCompass}
                    className="px-2.5 py-1 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded transition-colors cursor-pointer"
                  >
                    Enable
                  </button>
                </div>
              )
            ) : (
              <span className="text-[10px] font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 text-slate-400" /> Unsupported
              </span>
            )}
          </div>

          {/* Card 4: GNSS GPS */}
          <div className="bg-white border border-slate-200 rounded-md p-3 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-slate-100 text-slate-900 rounded-md flex items-center justify-center">
                <Satellite className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900">GNSS High-Precision GPS</h3>
                <p className="text-[11px] text-slate-500">Baseline position & road tracking</p>
              </div>
            </div>

            {sensorStatus.gnss ? (
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-600/20 flex items-center gap-1 font-mono">
                <CheckCircle2 className="w-3 h-3" /> LOCKED
              </span>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-600/20">
                  Required
                </span>
                <button
                  onClick={grantGnssPermission}
                  className="px-2.5 py-1 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded transition-colors cursor-pointer"
                >
                  Acquire
                </button>
              </div>
            )}
          </div>

          {/* Security & Local Edge Note */}
          <div className="bg-[#F1F5F9] border border-slate-200 rounded-md p-3 flex items-start gap-2 mt-3">
            <Lock className="w-4 h-4 text-slate-700 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-slate-600 leading-relaxed">
              All sensor calculations and kinematic dead reckoning algorithms execute directly on your local device CPU.
            </p>
          </div>
        </div>

        <button
          onClick={handleGrantAll}
          disabled={isRequesting}
          className="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold py-3 px-4 rounded-md transition-colors text-xs mt-4 flex items-center justify-center gap-2 cursor-pointer shadow-xs"
        >
          {isRequesting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <span>Grant Permissions & Open Map →</span>
          )}
        </button>
      </div>
    </MobileShell>
  );
};
