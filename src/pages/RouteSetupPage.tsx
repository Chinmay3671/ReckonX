import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { TopHeader } from '../components/TopHeader';
import { BottomNav } from '../components/BottomNav';
import { useNavigationContext } from '../context/NavigationContext';
import {
  ArrowUpDown,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  LocateFixed,
  Loader2,
  MapPin,
  Search,
} from 'lucide-react';
import { MobileShell } from '../components/MobileShell';
import { LocationService } from '../services/locationService';
import type { SearchResult } from '../services/locationService';

export const RouteSetupPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    routeState,
    acquireLiveLocation,
    setDestCoordsAndAddress,
    swapLocations,
  } = useNavigationContext();

  const [selectedOption, setSelectedOption] = useState<number>(1);
  const [destQuery, setDestQuery] = useState(routeState.destination || '');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const performSearchAndSelectTop = async (query: string) => {
    if (!query || query.trim().length < 2) return;
    setIsSearching(true);
    try {
      const results = await LocationService.searchLocation(query);
      setSearchResults(results);
      if (results && results.length > 0) {
        const top = results[0];
        const coords: [number, number] = [top.lat, top.lon];
        setDestQuery(top.display_name);
        await setDestCoordsAndAddress(coords, top.display_name);
        setShowDropdown(false);
      }
    } finally {
      setIsSearching(false);
    }
  };

  const handleDestChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setDestQuery(query);
    setShowDropdown(true);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!query || query.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      const results = await LocationService.searchLocation(query);
      setSearchResults(results);
      setIsSearching(false);
    }, 450);
  };

  const handleSelectDest = async (item: SearchResult) => {
    const coords: [number, number] = [item.lat, item.lon];
    setDestQuery(item.display_name);
    setShowDropdown(false);
    await setDestCoordsAndAddress(coords, item.display_name);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      performSearchAndSelectTop(destQuery);
    }
  };

  const header = <TopHeader title="Route Configuration" backTo="/explore" />;

  return (
    <MobileShell header={header} footer={<BottomNav />}>
      <div className="h-full flex flex-col justify-between p-4 pb-20">
        <div className="space-y-4">
          {/* Editable Route Inputs Card */}
          <div className="bg-white border border-slate-200 rounded-md p-4 space-y-3 relative shadow-xs">
            <div className="space-y-3">
              {/* Origin */}
              <div className="flex items-start gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 flex-shrink-0 mt-3" />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Start Origin</label>
                    <button
                      onClick={() => acquireLiveLocation()}
                      disabled={routeState.isAcquiringLocation}
                      className="text-[10px] font-bold text-blue-700 hover:text-blue-800 flex items-center gap-1"
                    >
                      {routeState.isAcquiringLocation ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <LocateFixed className="w-3 h-3 text-blue-700" />
                      )}
                      <span>📍 Use My Location</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    value={routeState.origin || ''}
                    readOnly
                    placeholder="Tap 'Use My Location' or select from map"
                    className="w-full text-xs font-bold text-slate-900 bg-slate-50 border border-slate-300 rounded-md px-3 py-2 focus:outline-none truncate"
                  />
                </div>
              </div>

              {/* Destination */}
              <div className="flex items-start gap-3 relative">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600 flex-shrink-0 mt-3" />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Destination</label>
                    <span className="text-[9px] text-slate-400 font-medium">Press Enter or click result to set</span>
                  </div>
                  <div className="relative flex items-center gap-1.5">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={destQuery}
                        onChange={handleDestChange}
                        onKeyDown={handleKeyDown}
                        onFocus={() => setShowDropdown(true)}
                        placeholder="Search destination city or street (e.g. Pune)..."
                        className="w-full text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:border-blue-700 truncate pr-7"
                      />
                      {isSearching && (
                        <Loader2 className="w-3.5 h-3.5 text-blue-700 animate-spin absolute right-2.5 top-2.5" />
                      )}
                    </div>
                    <button
                      onClick={() => performSearchAndSelectTop(destQuery)}
                      className="bg-blue-700 hover:bg-blue-800 text-white p-2 rounded-md transition-colors flex-shrink-0 flex items-center justify-center"
                      title="Search & Calculate Route"
                    >
                      <Search className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Dropdown Menu */}
                  {showDropdown && searchResults.length > 0 && (
                    <div className="absolute left-0 right-0 z-50 bg-white border border-slate-200 rounded-md divide-y divide-slate-100 mt-1 max-h-48 overflow-y-auto shadow-xl">
                      <div className="px-3 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50">
                        Select Destination Match:
                      </div>
                      {searchResults.map((item, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleSelectDest(item);
                          }}
                          className="w-full text-left px-3 py-2 text-xs font-medium text-slate-900 hover:bg-blue-50 flex items-start gap-2 transition-colors"
                        >
                          <MapPin className="w-3.5 h-3.5 text-red-600 flex-shrink-0 mt-0.5" />
                          <span className="line-clamp-2">{item.display_name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Swap Button */}
            <button
              onClick={swapLocations}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-white border border-slate-300 rounded-md flex items-center justify-center text-slate-900 hover:bg-slate-50 transition-colors shadow-xs"
              title="Swap Start & Destination"
            >
              <ArrowUpDown className="w-4 h-4 text-slate-900" />
            </button>
          </div>

          {/* Loading Indicator */}
          {routeState.isCalculating && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3 flex items-center justify-center gap-2 text-xs font-bold text-blue-700">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Fetching dynamic OSRM drivable route...</span>
            </div>
          )}

          {/* Error Warning */}
          {routeState.error && !routeState.isCalculating && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 flex items-center gap-2 text-xs font-semibold text-red-700">
              <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span>{routeState.error}</span>
            </div>
          )}

          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider px-1">
            Calculated Route Options
          </h2>

          {/* Dynamic Route Option Card 1 */}
          <div
            onClick={() => setSelectedOption(1)}
            className={`cursor-pointer bg-white rounded-md p-4 transition-all ${
              selectedOption === 1
                ? 'border-2 border-blue-700 shadow-xs'
                : 'border border-slate-200 hover:border-slate-900'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded uppercase">
                  RECOMMENDED (OSRM DRIVABLE ROUTE)
                </span>
                <h3 className="text-sm font-bold text-slate-900 mt-1.5">
                  {routeState.calculated ? routeState.duration : '0 min'}{' '}
                  <span className="text-xs font-mono font-normal text-slate-500">
                    ({routeState.calculated ? routeState.distance : '0 km'})
                  </span>
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Real-world road navigation via OpenStreetMap
                </p>
              </div>
              {selectedOption === 1 && <CheckCircle2 className="w-5 h-5 text-blue-700" />}
            </div>

            {/* Tunnel Alert Strip */}
            <div className="mt-3 bg-amber-50 border border-amber-600/30 rounded-md p-2.5 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs font-semibold text-amber-600 leading-tight">
                ● GNSS Outage Ready (Dead Reckoning auto-engages during signal loss)
              </p>
            </div>
          </div>

          {/* Route Option Card 2 */}
          <div
            onClick={() => setSelectedOption(2)}
            className={`cursor-pointer bg-white rounded-md p-4 transition-all ${
              selectedOption === 2
                ? 'border-2 border-blue-700 shadow-xs'
                : 'border border-slate-200 hover:border-slate-900'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded uppercase">
                  HIGHWAY SURFACE CORRIDOR
                </span>
                <h3 className="text-sm font-bold text-slate-900 mt-1.5">
                  {routeState.calculated
                    ? `${Math.round(routeState.durationMin * 1.15)} min`
                    : '0 min'}{' '}
                  <span className="text-xs font-mono font-normal text-slate-500">
                    ({routeState.calculated ? `${(routeState.distanceKm * 1.1).toFixed(1)} km` : '0 km'})
                  </span>
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Surface Bypass Route</p>
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
          onClick={() => {
            if (!routeState.startCoords || !routeState.destCoords) {
              alert('Please select both start and destination locations before starting navigation.');
              return;
            }
            navigate('/navigation');
          }}
          disabled={!routeState.calculated || routeState.isCalculating}
          className={`w-full text-white font-bold py-3 px-4 rounded-md transition-colors text-xs mt-4 ${
            routeState.calculated && !routeState.isCalculating
              ? 'bg-blue-700 hover:bg-blue-800 cursor-pointer'
              : 'bg-slate-400 cursor-not-allowed'
          }`}
        >
          Start Live Navigation
        </button>
      </div>
    </MobileShell>
  );
};
