import React from 'react';
import { useNavigate } from 'react-router-dom';
import { TopHeader } from '../components/TopHeader';
import { MapView } from '../components/MapView';
import { useNavigationContext } from '../context/NavigationContext';
import { Download, CheckCircle2 } from 'lucide-react';
import { MobileShell } from '../components/MobileShell';

export const SummaryPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useNavigationContext();

  const handleExportCsv = () => {
    showToast('CSV Telemetry Log Downloaded ✓ (idr_telemetry_log_98241.csv)');
  };

  const header = (
    <TopHeader
      title="Trip Summary Report"
      subtitle="Solapur Hub → Pune Logistics Terminal (NH 65)"
      backTo="/explore"
    />
  );

  return (
    <MobileShell header={header}>
      <div className="h-full flex flex-col justify-between p-4">
        <div className="space-y-4">
          {/* Static Route Map Card */}
          <div className="bg-white border border-slate-200 rounded-md p-3 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-900">
              <span>Completed Route Trajectory</span>
              <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-600/20 text-[11px]">
                PASSED ✓
              </span>
            </div>

            <div className="w-full h-40 rounded-md overflow-hidden border border-slate-200">
              <MapView mode="summary" />
            </div>

            {/* Map Legend */}
            <div className="flex items-center justify-around pt-1 text-[11px] font-medium border-t border-slate-200">
              <div className="flex items-center gap-1.5 text-emerald-600">
                <span className="w-3 h-1 bg-emerald-600 rounded" />
                <span>GNSS Locked (139.0 km)</span>
              </div>
              <div className="flex items-center gap-1.5 text-amber-600">
                <span className="w-3 h-1 bg-amber-600 rounded border border-dashed border-amber-600" />
                <span>Dead Reckoning (3.4 km)</span>
              </div>
            </div>
          </div>

          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider px-1">
            Telemetry Benchmark Grid
          </h2>

          {/* 2x2 Benchmark Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white border border-slate-200 rounded-md p-3.5 space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Total Distance</span>
              <div className="text-lg font-bold text-slate-900">142.4 km</div>
              <span className="text-[10px] text-slate-500">NH 65 Corridor</span>
            </div>

            <div className="bg-white border border-slate-200 rounded-md p-3.5 space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Tunnel Outage Time</span>
              <div className="text-lg font-bold text-slate-900">06 min 18 sec</div>
              <span className="text-[10px] text-amber-600 font-semibold">Zero GNSS Signal</span>
            </div>

            <div className="bg-white border border-slate-200 rounded-md p-3.5 space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Max Position Drift</span>
              <div className="text-lg font-bold font-mono text-slate-900">1.2 m</div>
              <span className="text-[10px] text-slate-500">Kalman Filtered</span>
            </div>

            <div className="bg-white border border-slate-200 rounded-md p-3.5 space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase">DR Accuracy</span>
              <div className="text-lg font-bold text-emerald-600">98.6%</div>
              <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Target Met
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="pt-4 flex gap-3 border-t border-slate-200">
          <button
            onClick={handleExportCsv}
            className="flex-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold py-2.5 px-3 rounded-md transition-colors text-xs flex items-center justify-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV Log</span>
          </button>

          <button
            onClick={() => navigate('/explore')}
            className="flex-1 bg-blue-700 hover:bg-blue-800 text-white font-bold py-2.5 px-3 rounded-md transition-colors text-xs"
          >
            Done
          </button>
        </div>
      </div>
    </MobileShell>
  );
};
