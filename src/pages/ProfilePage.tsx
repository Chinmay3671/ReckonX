import React from 'react';
import { useNavigate } from 'react-router-dom';
import { TopHeader } from '../components/TopHeader';
import { BottomNav } from '../components/BottomNav';
import { useNavigationContext } from '../context/NavigationContext';
import { LogOut, Trash2 } from 'lucide-react';
import { MobileShell } from '../components/MobileShell';

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, settings, toggleSetting, clearOfflineLogs, logoutUser } = useNavigationContext();

  const handleLogout = () => {
    logoutUser();
    navigate('/login');
  };

  const header = <TopHeader title="Driver Profile & Settings" backTo="/explore" />;

  return (
    <MobileShell header={header} footer={<BottomNav />}>
      <div className="h-full flex flex-col justify-between p-4 pb-20">
        <div className="space-y-4">
          {/* Profile Card */}
          <div className="bg-white border border-slate-200 rounded-md p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-blue-700 text-white rounded-full flex items-center justify-center font-bold text-xs">
                {user.avatar}
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">{user.name}</h2>
                <p className="text-xs text-slate-500 font-medium">
                  {user.role} • ID: {user.id}
                </p>
              </div>
            </div>

            {/* Driving Stats Row */}
            <div className="bg-slate-50 border border-slate-200 rounded p-2.5 flex items-center justify-between text-center text-xs font-mono">
              <div>
                <div className="font-bold text-slate-900">{user.stats.driven}</div>
                <div className="text-[10px] text-slate-500 font-sans">Driven</div>
              </div>
              <div className="w-px h-6 bg-slate-200" />
              <div>
                <div className="font-bold text-slate-900">{user.stats.tunnels}</div>
                <div className="text-[10px] text-slate-500 font-sans">Tunnels Cleared</div>
              </div>
              <div className="w-px h-6 bg-slate-200" />
              <div>
                <div className="font-bold text-emerald-600">{user.stats.uptime}</div>
                <div className="text-[10px] text-slate-500 font-sans">Sensor Uptime</div>
              </div>
            </div>
          </div>

          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider px-1">
            Navigation System Settings
          </h2>

          {/* Settings List Card */}
          <div className="bg-white border border-slate-200 rounded-md divide-y divide-slate-100">
            {/* Setting 1: High-speed sensor reading */}
            <div className="p-3.5 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-900">
                  High-speed sensor reading (100 Hz)
                </div>
                <div className="text-[11px] text-slate-500">
                  Real-time acceleration & gyro sampling
                </div>
              </div>
              <button
                onClick={() => toggleSetting('highSpeedPolling')}
                className={`w-10 h-5 rounded-full transition-colors relative p-0.5 ${
                  settings.highSpeedPolling ? 'bg-blue-700' : 'bg-slate-300'
                }`}
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
                <div className="text-xs font-bold text-slate-900">Snap position to road map</div>
                <div className="text-[11px] text-slate-500">Kalman map-matching filter</div>
              </div>
              <button
                onClick={() => toggleSetting('mapMatching')}
                className={`w-10 h-5 rounded-full transition-colors relative p-0.5 ${
                  settings.mapMatching ? 'bg-blue-700' : 'bg-slate-300'
                }`}
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
                <div className="text-xs font-bold text-slate-900">Keep screen on while driving</div>
                <div className="text-[11px] text-slate-500">Prevent screen lock during HUD</div>
              </div>
              <button
                onClick={() => toggleSetting('keepScreenAwake')}
                className={`w-10 h-5 rounded-full transition-colors relative p-0.5 ${
                  settings.keepScreenAwake ? 'bg-blue-700' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`w-4 h-4 bg-white rounded-full transition-transform ${
                    settings.keepScreenAwake ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Setting 4: Clear saved offline logs */}
            <div className="p-3.5 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-900">Clear saved offline logs</div>
                <div className="text-[11px] text-slate-500 font-mono">
                  Stored size: {settings.offlineLogs}
                </div>
              </div>
              <button
                onClick={clearOfflineLogs}
                className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded transition-colors flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5 text-slate-500" />
                Clear
              </button>
            </div>
          </div>

          {/* Danger Action */}
          <button
            onClick={handleLogout}
            className="w-full bg-white border border-red-600 text-red-600 hover:bg-red-50 font-bold py-2.5 px-4 rounded-md transition-colors text-xs flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            <span>Log Out</span>
          </button>
        </div>
      </div>
    </MobileShell>
  );
};
