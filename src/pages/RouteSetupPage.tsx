import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { TopHeader } from '../components/TopHeader';
import { BottomNav } from '../components/BottomNav';
import { useNavigationContext } from '../context/NavigationContext';
import {
  ArrowUpDown,
  AlertTriangle,
  CheckCircle2,
  LocateFixed,
  Loader2,
  MapPin,
  Search,
  Navigation,
} from 'lucide-react';
import { MobileShell } from '../components/MobileShell';
import { LocationService } from '../services/locationService';
import type { SearchResult } from '../services/locationService';
import { formatKmDistance } from '../utils/distanceFormatter';

export const RouteSetupPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    routeState,
    settings,
    acquireLiveLocation,
    setDestCoordsAndAddress,
    swapLocations,
    selectRoute,
    startTrackingSession,
  } = useNavigationContext();

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

  const handleStartLiveNavigation = () => {
    if (!routeState.startCoords || !routeState.destCoords) {
      alert('Please set both start and destination locations before starting navigation.');
      return;
    }
    startTrackingSession();
    navigate('/navigation');
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
                      className="text-[10px] font-bold text-blue-700 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
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
                    placeholder="Tap 'Use My Location' or select on map"
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
                    <span className="text-[9px] text-slate-400 font-medium">Search city, street or POI</span>
                  </div>
                  <div className="relative flex items-center gap-1.5">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={destQuery}
                        onChange={handleDestChange}
                        onKeyDown={handleKeyDown}
                        onFocus={() => setShowDropdown(true)}
                        placeholder="Search destination (e.g. Pune)..."
                        className="w-full text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:border-blue-700 truncate pr-7"
                      />
                      {isSearching && (
                        <Loader2 className="w-3.5 h-3.5 text-blue-700 animate-spin absolute right-2.5 top-2.5" />
                      )}
                    </div>
                    <button
                      onClick={() => performSearchAndSelectTop(destQuery)}
                      className="bg-blue-700 hover:bg-blue-800 text-white p-2 rounded-md transition-colors flex-shrink-0 flex items-center justify-center cursor-pointer"
                      title="Search & Calculate Route"
                      aria-label="Search"
                    >
                      <Search className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Dropdown Menu */}
                  {showDropdown && searchResults.length > 0 && (
                    <div className="absolute left-0 right-0 z-50 bg-white border border-slate-200 rounded-md divide-y divide-slate-100 mt-1 max-h-52 overflow-y-auto shadow-xl">
                      <div className="px-3 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50">
                        Select Destination:
                      </div>
                      {searchResults.map((item, idx) => {
                        const tag = item.type || item.addresstype || item.class;
                        return (
                          <button
                            key={idx}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              handleSelectDest(item);
                            }}
                            className="w-full text-left px-3 py-2 text-xs font-medium text-slate-900 hover:bg-blue-50 flex items-start justify-between gap-2 transition-colors cursor-pointer"
                          >
                            <div className="flex items-start gap-2 min-w-0">
                              <MapPin className="w-3.5 h-3.5 text-red-600 flex-shrink-0 mt-0.5" />
                              <span className="line-clamp-2 leading-snug">{item.display_name}</span>
                            </div>
                            {tag && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 uppercase font-mono font-bold flex-shrink-0">
                                {tag}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Swap Button */}
            <button
              onClick={swapLocations}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-white border border-slate-300 rounded-md flex items-center justify-center text-slate-900 hover:bg-slate-50 transition-colors shadow-xs cursor-pointer"
              title="Swap Start & Destination"
              aria-label="Swap Locations"
            >
              <ArrowUpDown className="w-4 h-4 text-slate-900" />
            </button>
          </div>

          {/* Loading Indicator */}
          {routeState.isCalculating && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3 flex items-center justify-center gap-2 text-xs font-bold text-blue-700">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Calculating drivable road route via OSRM...</span>
            </div>
          )}

          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              {routeState.routes.length > 1
                ? `Available Routes (${routeState.routes.length})`
                : 'Selected Route & Profile'}
            </h2>
            {routeState.routes.length > 1 && (
              <span className="text-[10px] text-blue-700 font-bold">Tap route to select</span>
            )}
          </div>

          {/* Real Drivable Route Cards / Error State */}
          {routeState.routes && routeState.routes.length > 0 ? (
            <div className="space-y-2.5">
              {routeState.routes.map((r, idx) => {
                const isSelected = idx === routeState.selectedRouteIndex;
                const hrs = Math.floor(r.durationMin / 60);
                const mins = r.durationMin % 60;
                const durStr = hrs > 0 ? `${hrs}h ${mins}m` : `${mins} min`;
                const distStr = formatKmDistance(r.distanceKm, settings.distanceUnit);

                let badgeColor = 'bg-slate-100 text-slate-700 border-slate-200';
                if (r.label === 'Recommended') {
                  badgeColor = 'bg-blue-100 text-blue-800 border-blue-300';
                } else if (r.label === 'Fastest') {
                  badgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-300';
                } else if (r.label === 'Shortest') {
                  badgeColor = 'bg-purple-100 text-purple-800 border-purple-300';
                }

                return (
                  <div
                    key={r.id || idx}
                    onClick={() => selectRoute(idx)}
                    className={`bg-white rounded-md p-3.5 border-2 transition-all cursor-pointer shadow-xs ${
                      isSelected
                        ? 'border-blue-700 bg-blue-50/30 ring-1 ring-blue-700'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1 pr-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[9px] font-extrabold px-2 py-0.5 rounded border uppercase font-mono tracking-wide ${badgeColor}`}
                          >
                            {r.label}
                          </span>
                          <span className="text-xs text-slate-500 font-medium truncate">
                            {r.summary}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-slate-900 font-mono">
                          {durStr}{' '}
                          <span className="text-xs font-normal text-slate-500 font-sans">
                            ({distStr})
                          </span>
                        </h3>
                      </div>
                      <div className="flex items-center pt-1">
                        {isSelected ? (
                          <CheckCircle2 className="w-5 h-5 text-blue-700 flex-shrink-0" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border-2 border-slate-300 flex-shrink-0" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : routeState.error && !routeState.isCalculating ? (
            <div className="bg-amber-50/80 border border-amber-300 rounded-md p-4 space-y-2 shadow-xs">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>ROAD ROUTE UNAVAILABLE</span>
              </div>
              <p className="text-xs text-amber-800 leading-relaxed font-medium">
                {routeState.error}
              </p>
              <p className="text-[11px] text-amber-700/80">
                Tip: Choose a specific road-accessible city, street, or landmark.
              </p>
            </div>
          ) : !routeState.isCalculating ? (
            <div className="bg-slate-50 border border-slate-200 border-dashed rounded-md p-4 text-center space-y-1">
              <p className="text-xs font-bold text-slate-700">No active route</p>
              <p className="text-[11px] text-slate-500">
                Enter a destination above to calculate turn-by-turn road navigation via OSRM.
              </p>
            </div>
          ) : null}

          {/* Dead Reckoning Readiness Strip */}
          <div className="bg-amber-50 border border-amber-300/60 rounded-md p-2.5 flex items-start gap-2 shadow-xs">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs font-semibold text-amber-800 leading-tight">
              GNSS Outage Safe: Dead Reckoning engine automatically takes over if GPS signal drops in tunnels.
            </p>
          </div>
        </div>

        {/* Start Live Navigation HUD Button */}
        {(() => {
          const isNavReady =
            routeState.calculated &&
            !routeState.isCalculating &&
            !routeState.error &&
            routeState.routes.length > 0;
          return (
            <button
              onClick={handleStartLiveNavigation}
              disabled={!isNavReady}
              className={`w-full text-white font-bold py-3 px-4 rounded-md transition-colors text-xs mt-4 flex items-center justify-center gap-2 ${
                isNavReady
                  ? 'bg-blue-700 hover:bg-blue-800 cursor-pointer shadow-xs'
                  : 'bg-slate-400 cursor-not-allowed'
              }`}
            >
              <Navigation className="w-4 h-4" />
              <span>Start Live Navigation HUD</span>
            </button>
          );
        })()}
      </div>
    </MobileShell>
  );
};
