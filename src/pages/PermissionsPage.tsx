import React from 'react';
import { useNavigate } from 'react-router-dom';
import { TopHeader } from '../components/TopHeader';
import { useNavigationContext } from '../context/NavigationContext';
import { CheckCircle2, AlertTriangle, Lock, Navigation, Compass, Activity, Satellite } from 'lucide-react';
import { MobileShell } from '../components/MobileShell';

export const PermissionsPage: React.FC = () => {
  const navigate = useNavigate();
  const { sensorStatus, calibrateCompass, grantGnssPermission, grantAllSensors } =
    useNavigationContext();

  const handleGrantAll = () => {
    grantAllSensors();
    navigate('/explore');
  };

  const header = (
    <TopHeader
      title="Sensor Access Needed"
      subtitle="Direct access to phone motion sensors & location"
      backTo="/login"
    />
  );

  return (
    <MobileShell header={header}>
      <div className="h-full flex flex-col justify-between p-4">
        <div className="space-y-3">
          <p className="text-xs text-slate-500 leading-relaxed px-1">
            Direct access to phone motion sensors and location is required for dead reckoning
            navigation inside tunnels.
          </p>

          {/* Card 1: Accelerometer */}
          <div className="bg-white border border-slate-200 rounded-md p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-slate-100 text-slate-900 rounded-md flex items-center justify-center">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900">3-Axis Accelerometer</h3>
                <p className="text-[11px] text-slate-500">Vehicle acceleration & braking</p>
              </div>
            </div>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-600/20 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Allowed (100 Hz)
            </span>
          </div>

          {/* Card 2: Gyroscope */}
          <div className="bg-white border border-slate-200 rounded-md p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-slate-100 text-slate-900 rounded-md flex items-center justify-center">
                <Navigation className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900">3-Axis Gyroscope</h3>
                <p className="text-[11px] text-slate-500">Angular rate & vehicle heading</p>
              </div>
            </div>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-600/20 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Allowed (100 Hz)
            </span>
          </div>

          {/* Card 3: Magnetometer / Compass */}
          <div className="bg-white border border-slate-200 rounded-md p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-slate-100 text-slate-900 rounded-md flex items-center justify-center">
                <Compass className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900">Compass / Magnetometer</h3>
                <p className="text-[11px] text-slate-500">Vehicle orientation to North</p>
              </div>
            </div>

            {sensorStatus.compass ? (
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-600/20 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Calibrated
              </span>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-600/20 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Action Needed
                </span>
                <button
                  onClick={calibrateCompass}
                  className="px-2.5 py-1 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded transition-colors"
                >
                  Calibrate
                </button>
              </div>
            )}
          </div>

          {/* Card 4: GNSS GPS */}
          <div className="bg-white border border-slate-200 rounded-md p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-slate-100 text-slate-900 rounded-md flex items-center justify-center">
                <Satellite className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900">High-Precision GNSS (GPS)</h3>
                <p className="text-[11px] text-slate-500">Baseline map positioning</p>
              </div>
            </div>

            {sensorStatus.gnss ? (
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-600/20 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Allowed
              </span>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-600/20">
                  Permission Required
                </span>
                <button
                  onClick={grantGnssPermission}
                  className="px-2.5 py-1 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded transition-colors"
                >
                  Allow
                </button>
              </div>
            )}
          </div>

          {/* Flat Note Box */}
          <div className="bg-[#F1F5F9] border border-slate-200 rounded-md p-3 flex items-start gap-2 mt-3">
            <Lock className="w-4 h-4 text-slate-900 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-slate-500 leading-relaxed">
              Motion sensor data executes locally on your phone processor.
            </p>
          </div>
        </div>

        <button
          onClick={handleGrantAll}
          className="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold py-3 px-4 rounded-md transition-colors text-xs mt-4"
        >
          Grant All & Continue to Map
        </button>
      </div>
    </MobileShell>
  );
};
