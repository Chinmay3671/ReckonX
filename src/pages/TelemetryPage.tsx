import React from 'react';
import { useNavigate } from 'react-router-dom';
import { TopHeader } from '../components/TopHeader';
import { BottomNav } from '../components/BottomNav';
import { TelemetryChart } from '../components/TelemetryChart';
import { useNavigationContext } from '../context/NavigationContext';
import { RotateCw, Navigation as NavIcon, Radio } from 'lucide-react';
import { MobileShell } from '../components/MobileShell';

export const TelemetryPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    telemetry,
    sensorStatus,
    sensorEventsStream,
    resetSensorZeroPoint,
  } = useNavigationContext();

  const header = (
    <TopHeader
      title="Hardware Sensor Stream"
      subtitle={
        telemetry.sampleRateHz > 0
          ? `Live Stream: ${telemetry.sampleRateHz} Hz`
          : 'Waiting for hardware sensor events'
      }
      backTo="/navigation"
    />
  );

  const hasMotion = sensorStatus.hasMotionHardware;
  const hasOrientation = sensorStatus.hasOrientationHardware;

  return (
    <MobileShell header={header} footer={<BottomNav />}>
      <div className="h-full flex flex-col justify-between p-4 pb-20">
        <div className="space-y-4">
          {/* Diagnostic HTML Table */}
          <div className="bg-white border border-slate-200 rounded-md p-4 space-y-3 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Physical Device Sensors
              </h2>
              <span className="text-[10px] font-mono text-slate-500 font-bold">
                {telemetry.sampleRateHz > 0 ? `${telemetry.sampleRateHz} Hz` : 'IDLE'}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-500 font-bold border-b border-slate-100">
                    <th className="pb-2 font-mono">SENSOR</th>
                    <th className="pb-2 font-mono">RATE</th>
                    <th className="pb-2 text-right font-mono">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {/* Accelerometer */}
                  <tr>
                    <td className="py-2 font-bold text-slate-900">3-Axis Accelerometer</td>
                    <td className="py-2 font-mono text-slate-500">
                      {telemetry.isStreamingMotion ? `${telemetry.sampleRateHz} Hz` : '0 Hz'}
                    </td>
                    <td className="py-2 text-right font-semibold">
                      {telemetry.isStreamingMotion ? (
                        <span className="text-emerald-600 flex items-center justify-end gap-1 font-mono">
                          <span className="w-2 h-2 rounded-full bg-emerald-600" /> Streaming
                        </span>
                      ) : hasMotion ? (
                        <span className="text-amber-600 flex items-center justify-end gap-1 font-mono">
                          <span className="w-2 h-2 rounded-full bg-amber-600" /> Waiting...
                        </span>
                      ) : (
                        <span className="text-slate-400 flex items-center justify-end gap-1 font-mono">
                          Unsupported
                        </span>
                      )}
                    </td>
                  </tr>

                  {/* Gyroscope */}
                  <tr>
                    <td className="py-2 font-bold text-slate-900">3-Axis Gyroscope</td>
                    <td className="py-2 font-mono text-slate-500">
                      {telemetry.isStreamingMotion ? `${telemetry.sampleRateHz} Hz` : '0 Hz'}
                    </td>
                    <td className="py-2 text-right font-semibold">
                      {telemetry.isStreamingMotion ? (
                        <span className="text-emerald-600 flex items-center justify-end gap-1 font-mono">
                          <span className="w-2 h-2 rounded-full bg-emerald-600" /> Streaming
                        </span>
                      ) : hasMotion ? (
                        <span className="text-amber-600 flex items-center justify-end gap-1 font-mono">
                          <span className="w-2 h-2 rounded-full bg-amber-600" /> Waiting...
                        </span>
                      ) : (
                        <span className="text-slate-400 flex items-center justify-end gap-1 font-mono">
                          Unsupported
                        </span>
                      )}
                    </td>
                  </tr>

                  {/* Magnetometer */}
                  <tr>
                    <td className="py-2 font-bold text-slate-900">Magnetometer (Compass)</td>
                    <td className="py-2 font-mono text-slate-500">
                      {telemetry.isStreamingOrientation ? 'Active' : '0 Hz'}
                    </td>
                    <td className="py-2 text-right font-semibold">
                      {telemetry.isStreamingOrientation ? (
                        <span className="text-emerald-600 flex items-center justify-end gap-1 font-mono">
                          <span className="w-2 h-2 rounded-full bg-emerald-600" /> Ready
                        </span>
                      ) : hasOrientation ? (
                        <span className="text-amber-600 flex items-center justify-end gap-1 font-mono">
                          <span className="w-2 h-2 rounded-full bg-amber-600" /> Waiting...
                        </span>
                      ) : (
                        <span className="text-slate-400 flex items-center justify-end gap-1 font-mono">
                          Unsupported
                        </span>
                      )}
                    </td>
                  </tr>

                  {/* GPS Satellite Lock */}
                  <tr>
                    <td className="py-2 font-bold text-slate-900">GNSS GPS Fix</td>
                    <td className="py-2 font-mono text-slate-500">1 Hz</td>
                    <td className="py-2 text-right font-semibold">
                      {sensorStatus.gnss ? (
                        <span className="text-emerald-600 flex items-center justify-end gap-1 font-mono">
                          <span className="w-2 h-2 rounded-full bg-emerald-600" /> Locked
                        </span>
                      ) : (
                        <span className="text-amber-600 flex items-center justify-end gap-1 font-mono">
                          <span className="w-2 h-2 rounded-full bg-amber-600" /> Dead Reckoning
                        </span>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Monospace Vector Box */}
          <div className="bg-slate-900 text-white border border-slate-800 rounded-md p-3.5 font-mono text-xs space-y-2 shadow-xs">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-1.5 flex justify-between">
              <span>REAL SENSOR VECTORS</span>
              <span className="text-emerald-400 font-mono">
                {telemetry.sampleRateHz > 0 ? `● ${telemetry.sampleRateHz} Hz` : '● IDLE'}
              </span>
            </div>

            <div className="space-y-1.5 pt-1">
              <div>
                <span className="text-slate-400">Linear Accel:</span>{' '}
                <span className="text-blue-400 font-bold">
                  X: {telemetry.ax > 0 ? `+${telemetry.ax.toFixed(2)}` : telemetry.ax.toFixed(2)}
                </span>{' '}
                |{' '}
                <span className="text-amber-400 font-bold">
                  Y: {telemetry.ay > 0 ? `+${telemetry.ay.toFixed(2)}` : telemetry.ay.toFixed(2)}
                </span>{' '}
                |{' '}
                <span className="text-emerald-400 font-bold">
                  Z: {telemetry.az > 0 ? `+${telemetry.az.toFixed(2)}` : telemetry.az.toFixed(2)} m/s²
                </span>
              </div>

              <div>
                <span className="text-slate-400">Orientation:</span>{' '}
                <span className="text-slate-200">Pitch: {telemetry.pitch.toFixed(1)}°</span> |{' '}
                <span className="text-slate-200">Roll: {telemetry.roll.toFixed(1)}°</span> |{' '}
                <span className="text-slate-200">Yaw: {telemetry.yaw.toFixed(1)}°</span>
              </div>

              <div className="pt-1 border-t border-slate-800 flex items-center justify-between text-amber-200 text-[11px]">
                <span className="text-slate-400">Integration Drift:</span>
                <span className="font-bold text-amber-400 font-mono">
                  ±{telemetry.drift.toFixed(2)} m (ZUPT Active)
                </span>
              </div>
            </div>
          </div>

          {/* Real Canvas Waveform */}
          <TelemetryChart />

          {/* Real Live Sensor Events Stream Log */}
          <div className="bg-white border border-slate-200 rounded-md p-3.5 space-y-2 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-blue-700" />
                <span>Live Event Ingestion Stream</span>
              </h3>
              <span className="text-[10px] text-slate-400 font-mono">
                {sensorEventsStream.length} Events Logged
              </span>
            </div>

            {sensorEventsStream.length === 0 ? (
              <div className="py-4 text-center text-xs text-slate-400 font-medium">
                Waiting for incoming sensor events from device...
              </div>
            ) : (
              <div className="max-h-36 overflow-y-auto divide-y divide-slate-100 font-mono text-[11px]">
                {sensorEventsStream.slice(0, 8).map((evt) => (
                  <div key={evt.id} className="py-1.5 flex items-center justify-between gap-2">
                    <span className="text-slate-400 text-[10px] shrink-0">
                      {new Date(evt.timestamp).toLocaleTimeString().slice(3)}
                    </span>
                    <span className="text-slate-700 truncate">{evt.summary}</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 shrink-0">
                      {evt.type}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={resetSensorZeroPoint}
              className="flex-1 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold py-2.5 px-3 rounded-md transition-colors text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            >
              <RotateCw className="w-3.5 h-3.5 text-slate-600" />
              <span>Calibrate Zero-Point</span>
            </button>

            <button
              onClick={() => navigate('/navigation')}
              className="flex-1 bg-blue-700 hover:bg-blue-800 text-white font-bold py-2.5 px-3 rounded-md transition-colors text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            >
              <NavIcon className="w-3.5 h-3.5" />
              <span>Live Navigation HUD</span>
            </button>
          </div>
        </div>
      </div>
    </MobileShell>
  );
};
