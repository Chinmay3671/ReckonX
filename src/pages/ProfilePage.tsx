import React from 'react';
import { useNavigate } from 'react-router-dom';
import { TopHeader } from '../components/TopHeader';
import { BottomNav } from '../components/BottomNav';
import { useNavigationContext } from '../context/NavigationContext';
import {
  LogOut,
  Trash2,
  Database,
  Settings as SettingsIcon,
  Sparkles,
} from 'lucide-react';
import { MobileShell } from '../components/MobileShell';

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const {
    user,
    settings,
    cachedTilesCount,
    toggleSetting,
    updateSettingValue,
    clearOfflineLogs,
    clearTileCache,
    logoutUser,
  } = useNavigationContext();

  const handleLogout = () => {
    // TEMPORARY LOCAL AUTH — replace with backend AuthService.logout() when API is available
    logoutUser();
    navigate('/login');
  };

  const header = <TopHeader title="Profile & Preferences" backTo="/explore" />;

  return (
    <MobileShell header={header} footer={<BottomNav />}>
      <div className="h-full flex flex-col justify-between p-4 pb-20">
        <div className="space-y-4">
          {/* Clean Local Profile Card */}
          <div className="bg-white border border-slate-200 rounded-md p-4 space-y-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-blue-700 text-white rounded-full flex items-center justify-center font-bold text-xs shadow-xs">
                {user.avatar || 'RX'}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-bold text-slate-900 truncate">
                  {user.name || 'Local Operator'}
                </h2>
                <p className="text-xs text-slate-500 font-medium truncate">
                  {user.role || 'Autonomous / Telematics Driver'} • {user.id || '#LOCAL-EDGE'}
                </p>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-blue-50 text-blue-700 border-blue-200 font-mono">
                LOCAL MODE
              </span>
            </div>
          </div>

          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider px-1 flex items-center gap-1.5">
            <SettingsIcon className="w-3.5 h-3.5 text-blue-700" />
            <span>Frontend System Settings</span>
          </h2>

          {/* Settings List Card */}
          <div className="bg-white border border-slate-200 rounded-md divide-y divide-slate-100 shadow-xs">
            {/* Setting 1: High-speed sensor reading */}
            <div className="p-3.5 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-900">
                  High-speed IMU sampling (100 Hz)
                </div>
                <div className="text-[11px] text-slate-500">
                  Real-time acceleration & gyro stream
                </div>
              </div>
              <button
                onClick={() => toggleSetting('highSpeedPolling')}
                className={`w-10 h-5 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                  settings.highSpeedPolling ? 'bg-blue-700' : 'bg-slate-300'
                }`}
                aria-label="Toggle High-speed IMU sampling"
              >
                <div
                  className={`w-4 h-4 bg-white rounded-full transition-transform ${
                    settings.highSpeedPolling ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Setting 2: Map matching */}
            <div className="p-3.5 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-900">Snap vehicle to road route</div>
                <div className="text-[11px] text-slate-500">Kalman-assisted polyline matching</div>
              </div>
              <button
                onClick={() => toggleSetting('mapMatching')}
                className={`w-10 h-5 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                  settings.mapMatching ? 'bg-blue-700' : 'bg-slate-300'
                }`}
                aria-label="Toggle Map matching"
              >
                <div
                  className={`w-4 h-4 bg-white rounded-full transition-transform ${
                    settings.mapMatching ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Setting 3: Keep screen awake */}
            <div className="p-3.5 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-900">Keep screen awake while navigating</div>
                <div className="text-[11px] text-slate-500">Prevent display sleep during HUD</div>
              </div>
              <button
                onClick={() => toggleSetting('keepScreenAwake')}
                className={`w-10 h-5 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                  settings.keepScreenAwake ? 'bg-blue-700' : 'bg-slate-300'
                }`}
                aria-label="Toggle Keep Screen Awake"
              >
                <div
                  className={`w-4 h-4 bg-white rounded-full transition-transform ${
                    settings.keepScreenAwake ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Setting 4: Speed Unit Selector */}
            <div className="p-3.5 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-900">Speedometer Display Unit</div>
                <div className="text-[11px] text-slate-500 font-mono">Current: {settings.speedUnit}</div>
              </div>
              <div className="flex bg-slate-100 p-0.5 rounded border border-slate-200">
                <button
                  onClick={() => updateSettingValue('speedUnit', 'km/h')}
                  className={`px-2 py-1 text-[11px] font-bold rounded cursor-pointer ${
                    settings.speedUnit === 'km/h' ? 'bg-blue-700 text-white' : 'text-slate-600'
                  }`}
                >
                  km/h
                </button>
                <button
                  onClick={() => updateSettingValue('speedUnit', 'mph')}
                  className={`px-2 py-1 text-[11px] font-bold rounded cursor-pointer ${
                    settings.speedUnit === 'mph' ? 'bg-blue-700 text-white' : 'text-slate-600'
                  }`}
                >
                  mph
                </button>
              </div>
            </div>

            {/* Setting 5: Distance Unit Selector (KM / Miles) */}
            <div className="p-3.5 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-900">Distance Display Unit</div>
                <div className="text-[11px] text-slate-500 font-mono">
                  Current: {settings.distanceUnit === 'mi' ? 'Miles (mi)' : 'Kilometers (km)'}
                </div>
              </div>
              <div className="flex bg-slate-100 p-0.5 rounded border border-slate-200">
                <button
                  onClick={() => updateSettingValue('distanceUnit', 'km')}
                  className={`px-2 py-1 text-[11px] font-bold rounded cursor-pointer ${
                    settings.distanceUnit === 'km' ? 'bg-blue-700 text-white' : 'text-slate-600'
                  }`}
                >
                  km
                </button>
                <button
                  onClick={() => updateSettingValue('distanceUnit', 'mi')}
                  className={`px-2 py-1 text-[11px] font-bold rounded cursor-pointer ${
                    settings.distanceUnit === 'mi' ? 'bg-blue-700 text-white' : 'text-slate-600'
                  }`}
                >
                  mi
                </button>
              </div>
            </div>

            {/* Setting 6: IndexedDB Tile Cache */}
            <div className="p-3.5 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-900">IndexedDB Map Tile Cache</div>
                <div className="text-[11px] text-slate-500 font-mono">
                  {cachedTilesCount} Tiles stored locally
                </div>
              </div>
              <button
                onClick={clearTileCache}
                className="px-2.5 py-1 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Database className="w-3.5 h-3.5 text-slate-500" />
                <span>Clear Cache</span>
              </button>
            </div>

            {/* Setting 7: Clear saved offline logs */}
            <div className="p-3.5 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-900">Clear offline telemetry logs</div>
                <div className="text-[11px] text-slate-500 font-mono">Reset live sensor event history</div>
              </div>
              <button
                onClick={clearOfflineLogs}
                className="px-2.5 py-1 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 text-slate-500" />
                <span>Clear</span>
              </button>
            </div>
          </div>

          {/* Solution Page Quick Access */}
          <button
            onClick={() => navigate('/solution')}
            className="w-full bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 font-bold py-2.5 px-4 rounded-md transition-colors text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            <Sparkles className="w-4 h-4 text-blue-700" />
            <span>View ReckonX Architecture & Pipeline</span>
          </button>

          {/* Logout Action */}
          <button
            onClick={handleLogout}
            className="w-full bg-white border border-red-600 text-red-600 hover:bg-red-50 font-bold py-2.5 px-4 rounded-md transition-colors text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out Session</span>
          </button>
        </div>
      </div>
    </MobileShell>
  );
};
