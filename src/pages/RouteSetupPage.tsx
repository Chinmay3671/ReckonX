import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TopHeader } from '../components/TopHeader';
import { BottomNav } from '../components/BottomNav';
import { useNavigationContext } from '../context/NavigationContext';
import { ArrowUpDown, AlertTriangle, CheckCircle2, ShieldCheck } from 'lucide-react';
import { MobileShell } from '../components/MobileShell';

export const RouteSetupPage: React.FC = () => {
  const navigate = useNavigate();
  const { routeState, updateOriginDestination } = useNavigationContext();

  const [origin, setOrigin] = useState(
    routeState.origin || 'Solapur Operations Hub, MH'
  );
  const [destination, setDestination] = useState(
    routeState.destination || 'Pune Logistics Depot, MH'
  );
  const [selectedOption, setSelectedOption] = useState<number>(1);

  const handleSwap = () => {
    const temp = origin;
    setOrigin(destination);
    setDestination(temp);
    updateOriginDestination(destination, temp);
  };

  const header = <TopHeader title="Route Configuration" backTo="/explore" />;

  return (
    <MobileShell header={header} footer={<BottomNav />}>
      <div className="h-full flex flex-col justify-between p-4 pb-20">
        <div className="space-y-4">
          {/* Editable Route Inputs Card */}
          <div className="bg-white border border-slate-200 rounded-md p-4 space-y-3 relative">
            <div className="space-y-3">
              {/* Origin */}
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 flex-shrink-0" />
                <div className="flex-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Start Origin</label>
                  <input
                    type="text"
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    className="w-full text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:border-blue-700"
                  />
                </div>
              </div>

              {/* Destination */}
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600 flex-shrink-0" />
                <div className="flex-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Destination</label>
                  <input
                    type="text"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    className="w-full text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:border-blue-700"
                  />
                </div>
              </div>
            </div>

            {/* Swap Button */}
            <button
              onClick={handleSwap}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-white border border-slate-300 rounded-md flex items-center justify-center text-slate-900 hover:bg-slate-50 transition-colors"
              title="Swap Locations"
            >
              <ArrowUpDown className="w-4 h-4 text-slate-900" />
            </button>
          </div>

          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider px-1">
            Available Route Options
          </h2>

          {/* Route Option Card 1 */}
          <div
            onClick={() => setSelectedOption(1)}
            className={`cursor-pointer bg-white rounded-md p-4 transition-all ${
              selectedOption === 1
                ? 'border-2 border-blue-700'
                : 'border border-slate-200 hover:border-slate-900'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded uppercase">
                  RECOMMENDED (FASTEST)
                </span>
                <h3 className="text-sm font-bold text-slate-900 mt-1.5">
                  1 hr 54 min <span className="text-xs font-mono font-normal text-slate-500">(142.4 km)</span>
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Fastest via NH 65 Expressway</p>
              </div>
              {selectedOption === 1 && <CheckCircle2 className="w-5 h-5 text-blue-700" />}
            </div>

            {/* Amber Tunnel Alert Strip */}
            <div className="mt-3 bg-amber-50 border border-amber-600/30 rounded-md p-2.5 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs font-semibold text-amber-600 leading-tight">
                ● Includes 3.4 km Tunnel (Dead Reckoning auto-engages)
              </p>
            </div>
          </div>

          {/* Route Option Card 2 */}
          <div
            onClick={() => setSelectedOption(2)}
            className={`cursor-pointer bg-white rounded-md p-4 transition-all ${
              selectedOption === 2
                ? 'border-2 border-blue-700'
                : 'border border-slate-200 hover:border-slate-900'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded uppercase">
                  SURFACE BYPASS
                </span>
                <h3 className="text-sm font-bold text-slate-900 mt-1.5">
                  2 hr 20 min <span className="text-xs font-mono font-normal text-slate-500">(168 km)</span>
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Surface Bypass (No Tunnels)</p>
              </div>
              {selectedOption === 2 && <CheckCircle2 className="w-5 h-5 text-blue-700" />}
            </div>

            <div className="mt-3 bg-slate-100 border border-slate-200 rounded p-2 text-[11px] text-slate-500 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Continuous 100% GNSS GPS satellite coverage
            </div>
          </div>
        </div>

        <button
          onClick={() => navigate('/navigation')}
          className="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold py-3 px-4 rounded-md transition-colors text-xs mt-4"
        >
          Start Navigation
        </button>
      </div>
    </MobileShell>
  );
};
