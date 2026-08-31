import React from 'react';
import { useNavigate } from 'react-router-dom';
import { TopHeader } from '../components/TopHeader';
import { BottomNav } from '../components/BottomNav';
import { TelemetryChart } from '../components/TelemetryChart';
import { useNavigationContext } from '../context/NavigationContext';
import { RotateCw, Navigation as NavIcon } from 'lucide-react';
import { MobileShell } from '../components/MobileShell';

export const TelemetryPage: React.FC = () => {
  const navigate = useNavigate();
  const { telemetry, showToast } = useNavigationContext();

  const handleCalibrate = () => {
    showToast('Calibrated ✓ (Sensor zero-point reset)');
  };

  const header = (
    <TopHeader
      title="Sensor Diagnostic Stream"
      subtitle="Sampling at 100 Hz Synchronized"
      backTo="/navigation"
    />
  );

  return (
    <MobileShell header={header} footer={<BottomNav />}>
      <div className="h-full flex flex-col justify-between p-4 pb-20">
        <div className="space-y-4">
          {/* Diagnostic HTML Table */}
          <div className="bg-white border border-slate-200 rounded-md p-4 space-y-3">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-2">
              Hardware Sensor Status
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-500 font-bold border-b border-slate-200">
                    <th className="pb-2 font-mono">SENSOR</th>
                    <th className="pb-2 font-mono">RATE</th>
                    <th className="pb-2 text-right font-mono">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="py-2.5 font-bold text-slate-900">Accelerometer</td>
                    <td className="py-2.5 font-mono text-slate-500">100 Hz</td>
                    <td className="py-2.5 text-right font-semibold text-emerald-600 flex items-center justify-end gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-600" /> Streaming
                    </td>
                  </tr>

                  <tr>
                    <td className="py-2.5 font-bold text-slate-900">Gyroscope</td>
                    <td className="py-2.5 font-mono text-slate-500">100 Hz</td>
                    <td className="py-2.5 text-right font-semibold text-emerald-600 flex items-center justify-end gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-600" /> Streaming
                    </td>
                  </tr>

                  <tr>
                    <td className="py-2.5 font-bold text-slate-900">Magnetometer</td>
                    <td className="py-2.5 font-mono text-slate-500">50 Hz</td>
                    <td className="py-2.5 text-right font-semibold text-emerald-600 flex items-center justify-end gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-600" /> Ready
                    </td>
                  </tr>

                  <tr>
                    <td className="py-2.5 font-bold text-slate-900">GPS Satellite Lock</td>
                    <td className="py-2.5 font-mono text-slate-500">0 Sats</td>
                    <td className="py-2.5 text-right font-semibold text-amber-600 flex items-center justify-end gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-600" /> Lost - Tunnel Mode
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Monospace Vector Box */}
          <div className="bg-slate-900 text-white border border-slate-800 rounded-md p-3.5 font-mono text-xs space-y-2">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-1.5 flex justify-between">
              <span>LIVE SENSOR VECTORS</span>
              <span className="text-emerald-500">● 100 Hz SYNC</span>
            </div>

            <div className="space-y-1 pt-1">
              <div>
                <span className="text-slate-400">Acceleration:</span>{' '}
                <span className="text-blue-400 font-bold">
                  X: {telemetry.ax > 0 ? `+${telemetry.ax}` : telemetry.ax} m/s²
                </span>{' '}
                |{' '}
                <span className="text-amber-400 font-bold">
                  Y: {telemetry.ay > 0 ? `+${telemetry.ay}` : telemetry.ay} m/s²
                </span>{' '}
                | <span className="text-emerald-400 font-bold">Z: +{telemetry.az} m/s²</span>
              </div>

              <div>
                <span className="text-slate-400">Rotation:</span>{' '}
                <span className="text-slate-200">Pitch: {telemetry.pitch.toFixed(1)}°</span> |{' '}
                <span className="text-slate-200">
                  Roll: {telemetry.roll > 0 ? `+${telemetry.roll}` : telemetry.roll}°
                </span>{' '}
                |{' '}
                <span className="text-slate-200">
                  Yaw: {telemetry.yaw > 0 ? `+${telemetry.yaw}` : telemetry.yaw}°
                </span>
              </div>

              <div className="pt-1 border-t border-slate-800 text-amber-200">
                <span className="text-slate-400">Dynamic Drift:</span>{' '}
                <span className="font-bold text-amber-400">
                  Estimated Drift: ±{telemetry.drift} m (Kalman Filter Active)
                </span>
              </div>
            </div>
          </div>

          {/* Minimalist Line Chart */}
          <TelemetryChart />

          {/* Action Buttons */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleCalibrate}
              className="flex-1 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold py-2.5 px-3 rounded-md transition-colors text-xs flex items-center justify-center gap-1.5"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Calibrate Zero-Point</span>
            </button>

            <button
              onClick={() => navigate('/navigation')}
              className="flex-1 bg-blue-700 hover:bg-blue-800 text-white font-bold py-2.5 px-3 rounded-md transition-colors text-xs flex items-center justify-center gap-1.5"
            >
              <NavIcon className="w-3.5 h-3.5" />
              <span>Back to Live Navigation</span>
            </button>
          </div>
        </div>
      </div>
    </MobileShell>
  );
};
