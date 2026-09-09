import React from 'react';
import { useNavigate } from 'react-router-dom';
import { TopHeader } from '../components/TopHeader';
import { BottomNav } from '../components/BottomNav';
import { TelemetryChart } from '../components/TelemetryChart';
import { useNavigationContext } from '../context/NavigationContext';
import {
  RotateCw,
  Navigation as NavIcon,
  Radio,
  Power,
  Satellite,
  Compass,
  Activity,
  RefreshCw,
} from 'lucide-react';
import { MobileShell } from '../components/MobileShell';

export const TelemetryPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    currentLocation,
    realSensors,
    systemMode,
    isSensorsEnabled,
    sensorStatus,
    sensorEventsStream,
    toggleSensors,
    refreshGpsLocation,
    resetSensorZeroPoint,
  } = useNavigationContext();

  const header = (
    <TopHeader
      title="Hardware Sensor Telemetry"
      subtitle={
        isSensorsEnabled && realSensors.sampleRateHz > 0
          ? `Live Stream: ${realSensors.sampleRateHz} Hz (${systemMode.toUpperCase()})`
          : isSensorsEnabled
          ? `Sensors ON (${systemMode.toUpperCase()})`
          : 'Sensors OFF'
      }
      backTo="/navigation"
    />
  );

  const hasMotion = sensorStatus.hasMotionHardware;
  const hasOrientation = sensorStatus.hasOrientationHardware;

  // Format timestamp
  const formatTime = (ts: number | null) => {
    if (!ts) return '--:--:--';
    const d = new Date(ts);
    return `${d.toLocaleTimeString()}.${d.getMilliseconds().toString().padStart(3, '0')}`;
  };

  return (
    <MobileShell header={header} footer={<BottomNav />}>
      <div className="flex flex-col space-y-4 p-4 pb-24">
        {/* 1. Mode Badge & Sensors Master Toggle */}
        <div className="bg-white border border-slate-200 rounded-lg p-3.5 flex items-center justify-between shadow-xs">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isSensorsEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                }`}
              />
              <span className="text-xs font-black text-slate-900 tracking-wide font-mono uppercase">
                {isSensorsEnabled ? 'SENSORS: ● ON' : 'SENSORS: ○ OFF'}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 font-medium">
              {isSensorsEnabled
                ? 'Ingesting real-time device IMU, compass & GPS events'
                : 'Sensor listeners stopped • No active background polling'}
            </p>
          </div>

          <button
            onClick={() => toggleSensors()}
            className={`px-3.5 py-2 rounded-md font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
              isSensorsEnabled
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            <span>{isSensorsEnabled ? 'Turn OFF' : 'Turn ON'}</span>
          </button>
        </div>

        {/* 2. Real-Time Hardware Sensor Cards Grid */}
        {isSensorsEnabled ? (
          <div className="space-y-3">
            {/* Accelerometer */}
            <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-xs space-y-2">
              <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                <div className="flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-blue-700" />
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    3-Axis Accelerometer
                  </span>
                </div>
                <span className="text-[10px] font-mono text-slate-500 font-bold">
                  {realSensors.sampleRateHz > 0 ? `${realSensors.sampleRateHz} Hz` : 'Active'}
                </span>
              </div>

              <div className="grid grid-cols-4 gap-2 text-center pt-1 font-mono">
                <div className="bg-slate-50 p-2 rounded border border-slate-200">
                  <span className="text-[10px] text-slate-400 block font-sans">X-AXIS</span>
                  <span className="text-xs font-bold text-blue-700">
                    {realSensors.ax > 0 ? `+${realSensors.ax.toFixed(2)}` : realSensors.ax.toFixed(2)}
                  </span>
                  <span className="text-[9px] text-slate-400 block font-sans">m/s²</span>
                </div>
                <div className="bg-slate-50 p-2 rounded border border-slate-200">
                  <span className="text-[10px] text-slate-400 block font-sans">Y-AXIS</span>
                  <span className="text-xs font-bold text-amber-700">
                    {realSensors.ay > 0 ? `+${realSensors.ay.toFixed(2)}` : realSensors.ay.toFixed(2)}
                  </span>
                  <span className="text-[9px] text-slate-400 block font-sans">m/s²</span>
                </div>
                <div className="bg-slate-50 p-2 rounded border border-slate-200">
                  <span className="text-[10px] text-slate-400 block font-sans">Z-AXIS</span>
                  <span className="text-xs font-bold text-emerald-700">
                    {realSensors.az > 0 ? `+${realSensors.az.toFixed(2)}` : realSensors.az.toFixed(2)}
                  </span>
                  <span className="text-[9px] text-slate-400 block font-sans">m/s²</span>
                </div>
                <div className="bg-blue-50/50 p-2 rounded border border-blue-200">
                  <span className="text-[10px] text-blue-700 block font-sans font-bold">MAGNITUDE</span>
                  <span className="text-xs font-black text-blue-900">
                    {realSensors.accelMag.toFixed(2)}
                  </span>
                  <span className="text-[9px] text-blue-600 block font-sans">m/s²</span>
                </div>
              </div>
            </div>

            {/* Gyroscope */}
            <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-xs space-y-2">
              <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                <div className="flex items-center gap-1.5">
                  <RotateCw className="w-4 h-4 text-purple-700" />
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    3-Axis Gyroscope (Angular Rate)
                  </span>
                </div>
                <span className="text-[10px] font-mono text-purple-700 font-bold">
                  {hasMotion ? 'Hardware Active' : 'Gyroscope unavailable'}
                </span>
              </div>

              <div className="grid grid-cols-4 gap-2 text-center pt-1 font-mono">
                <div className="bg-slate-50 p-2 rounded border border-slate-200">
                  <span className="text-[10px] text-slate-400 block font-sans">GX (Pitch)</span>
                  <span className="text-xs font-bold text-slate-900">
                    {realSensors.gx > 0 ? `+${realSensors.gx.toFixed(1)}` : realSensors.gx.toFixed(1)}
                  </span>
                  <span className="text-[9px] text-slate-400 block font-sans">°/s</span>
                </div>
                <div className="bg-slate-50 p-2 rounded border border-slate-200">
                  <span className="text-[10px] text-slate-400 block font-sans">GY (Roll)</span>
                  <span className="text-xs font-bold text-slate-900">
                    {realSensors.gy > 0 ? `+${realSensors.gy.toFixed(1)}` : realSensors.gy.toFixed(1)}
                  </span>
                  <span className="text-[9px] text-slate-400 block font-sans">°/s</span>
                </div>
                <div className="bg-slate-50 p-2 rounded border border-slate-200">
                  <span className="text-[10px] text-slate-400 block font-sans">GZ (Yaw)</span>
                  <span className="text-xs font-bold text-slate-900">
                    {realSensors.gz > 0 ? `+${realSensors.gz.toFixed(1)}` : realSensors.gz.toFixed(1)}
                  </span>
                  <span className="text-[9px] text-slate-400 block font-sans">°/s</span>
                </div>
                <div className="bg-purple-50/50 p-2 rounded border border-purple-200">
                  <span className="text-[10px] text-purple-700 block font-sans font-bold">TOTAL RATE</span>
                  <span className="text-xs font-black text-purple-900">
                    {realSensors.gyroMag.toFixed(1)}
                  </span>
                  <span className="text-[9px] text-purple-600 block font-sans">°/s</span>
                </div>
              </div>
            </div>

            {/* Orientation & Magnetometer */}
            <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-xs space-y-2">
              <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                <div className="flex items-center gap-1.5">
                  <Compass className="w-4 h-4 text-emerald-700" />
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Orientation & Compass
                  </span>
                </div>
                <span className="text-[10px] font-mono text-emerald-700 font-bold">
                  {hasOrientation ? 'Magnetic Stream' : 'Magnetometer unavailable'}
                </span>
              </div>

              <div className="grid grid-cols-4 gap-2 text-center pt-1 font-mono">
                <div className="bg-slate-50 p-2 rounded border border-slate-200">
                  <span className="text-[10px] text-slate-400 block font-sans">YAW / ALPHA</span>
                  <span className="text-xs font-bold text-slate-900">
                    {realSensors.alpha != null ? `${realSensors.alpha.toFixed(1)}°` : 'N/A'}
                  </span>
                </div>
                <div className="bg-slate-50 p-2 rounded border border-slate-200">
                  <span className="text-[10px] text-slate-400 block font-sans">PITCH / BETA</span>
                  <span className="text-xs font-bold text-slate-900">
                    {realSensors.beta != null ? `${realSensors.beta.toFixed(1)}°` : 'N/A'}
                  </span>
                </div>
                <div className="bg-slate-50 p-2 rounded border border-slate-200">
                  <span className="text-[10px] text-slate-400 block font-sans">ROLL / GAMMA</span>
                  <span className="text-xs font-bold text-slate-900">
                    {realSensors.gamma != null ? `${realSensors.gamma.toFixed(1)}°` : 'N/A'}
                  </span>
                </div>
                <div className="bg-emerald-50/50 p-2 rounded border border-emerald-200">
                  <span className="text-[10px] text-emerald-700 block font-sans font-bold">HEADING</span>
                  <span className="text-xs font-black text-emerald-900">
                    {realSensors.headingDeg != null ? `${realSensors.headingDeg.toFixed(0)}°` : 'N/A'}
                  </span>
                </div>
              </div>

              {realSensors.magX != null && (
                <div className="text-[11px] font-mono text-slate-600 bg-slate-50 p-2 rounded border border-slate-200 flex justify-around">
                  <span>Mag X: {realSensors.magX} μT</span>
                  <span>Mag Y: {realSensors.magY} μT</span>
                  <span>Mag Z: {realSensors.magZ} μT</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-slate-100 border border-slate-300 border-dashed rounded-lg p-6 text-center space-y-2">
            <Power className="w-8 h-8 text-slate-400 mx-auto" />
            <h3 className="text-xs font-bold text-slate-700">Sensors OFF</h3>
            <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
              Hardware motion and orientation event listeners are turned off. Tap "Turn ON" above to enable live real-time sensor ingestion.
            </p>
          </div>
        )}

        {/* 3. LOCATION DEBUG & REAL GPS DIAGNOSTIC PANEL */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <div className="flex items-center gap-1.5">
              <Satellite className="w-4 h-4 text-blue-700" />
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider font-mono">
                LOCATION DEBUG
              </h3>
            </div>
            <button
              onClick={() => refreshGpsLocation()}
              className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-2.5 py-1 rounded text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
              title="Force immediate high-accuracy GPS fix"
            >
              <RefreshCw className="w-3 h-3 text-blue-700" />
              <span>Refresh GPS</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="bg-slate-50 p-2 rounded border border-slate-200">
              <span className="text-[10px] text-slate-500 block font-sans">GPS Status</span>
              <span className="font-bold text-slate-900 flex items-center gap-1">
                <span
                  className={`w-2 h-2 rounded-full ${
                    sensorStatus.gnss && !currentLocation.isStale ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                />
                {sensorStatus.gnss && !currentLocation.isStale ? 'ACTIVE' : 'GPS STALE / WAITING'}
              </span>
            </div>

            <div className="bg-slate-50 p-2 rounded border border-slate-200">
              <span className="text-[10px] text-slate-500 block font-sans">Permission</span>
              <span
                className={`font-bold uppercase ${
                  sensorStatus.gpsPermission === 'granted' ? 'text-emerald-700' : 'text-amber-700'
                }`}
              >
                {sensorStatus.gpsPermission}
              </span>
            </div>

            <div className="bg-slate-50 p-2 rounded border border-slate-200">
              <span className="text-[10px] text-slate-500 block font-sans">Provider / Source</span>
              <span className="font-bold text-slate-900 uppercase">
                {currentLocation.source === 'gps'
                  ? 'Hardware GPS'
                  : currentLocation.source === 'manual'
                  ? 'Manual Map Selection'
                  : 'Dead Reckoning'}
              </span>
            </div>

            <div className="bg-slate-50 p-2 rounded border border-slate-200">
              <span className="text-[10px] text-slate-500 block font-sans">Accuracy</span>
              <span className="font-bold text-blue-700">
                {currentLocation.accuracy != null ? `±${currentLocation.accuracy} m` : 'N/A'}
              </span>
            </div>

            <div className="bg-slate-50 p-2 rounded border border-slate-200 col-span-2">
              <span className="text-[10px] text-slate-500 block font-sans">Live Coordinates</span>
              <span className="font-bold text-slate-900 text-xs break-all">
                {currentLocation.latitude != null && currentLocation.longitude != null
                  ? `Lat: ${currentLocation.latitude.toFixed(6)} | Lng: ${currentLocation.longitude.toFixed(6)}`
                  : 'No GPS coordinates acquired yet'}
              </span>
            </div>

            <div className="bg-slate-50 p-2 rounded border border-slate-200 col-span-2">
              <span className="text-[10px] text-slate-500 block font-sans">Reverse-Geocoded Address</span>
              <span className="font-medium text-slate-800 text-xs font-sans line-clamp-2">
                {currentLocation.address || 'Resolving address...'}
              </span>
            </div>

            <div className="bg-slate-50 p-2 rounded border border-slate-200">
              <span className="text-[10px] text-slate-500 block font-sans">Speed & Heading</span>
              <span className="font-bold text-slate-900">
                {currentLocation.speed != null ? `${currentLocation.speed.toFixed(1)} km/h` : '0.0 km/h'}
                {currentLocation.bearing != null ? ` • ${currentLocation.bearing.toFixed(0)}°` : ''}
              </span>
            </div>

            <div className="bg-slate-50 p-2 rounded border border-slate-200">
              <span className="text-[10px] text-slate-500 block font-sans">Last Update Age</span>
              <span
                className={`font-bold ${
                  currentLocation.ageSec <= 5 ? 'text-emerald-700' : 'text-amber-700'
                }`}
              >
                {currentLocation.timestamp ? `${currentLocation.ageSec}s ago` : 'Never'}
              </span>
            </div>
          </div>
        </div>

        {/* 4. Real Canvas Waveform */}
        {isSensorsEnabled && <TelemetryChart />}

        {/* 5. Live Event Ingestion Stream Log */}
        <div className="bg-white border border-slate-200 rounded-lg p-3.5 space-y-2 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-blue-700" />
              <span>Real Hardware Event Stream</span>
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">
              {sensorEventsStream.length} Events Ingested
            </span>
          </div>

          {sensorEventsStream.length === 0 ? (
            <div className="py-4 text-center text-xs text-slate-400 font-medium">
              Waiting for incoming sensor events from hardware...
            </div>
          ) : (
            <div className="max-h-36 overflow-y-auto divide-y divide-slate-100 font-mono text-[11px]">
              {sensorEventsStream.slice(0, 8).map((evt) => (
                <div key={evt.id} className="py-1.5 flex items-center justify-between gap-2">
                  <span className="text-slate-400 text-[10px] shrink-0">
                    {formatTime(evt.timestamp)}
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

        {/* 6. Action Buttons */}
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
    </MobileShell>
  );
};
