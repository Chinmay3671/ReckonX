import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapView } from '../components/MapView';
import { BottomNav } from '../components/BottomNav';
import { useNavigationContext } from '../context/NavigationContext';
import {
  Plus,
  Minus,
  Navigation,
  X,
  Search,
  ChevronRight,
  MapPin,
  Loader2,
  LocateFixed,
} from 'lucide-react';
import { MobileShell } from '../components/MobileShell';
import { LocationService } from '../services/locationService';
import type { SearchResult } from '../services/locationService';

export const ExplorePage: React.FC = () => {
  const navigate = useNavigate();
  const {
    routeState,
    acquireLiveLocation,
    setDestCoordsAndAddress,
    clearRoute,
  } = useNavigationContext();

  const [searchInput, setSearchInput] = useState<string>(routeState.destination || '');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync search input when route state updates
  useEffect(() => {
    if (routeState.destination) {
      setSearchInput(routeState.destination);
    }
  }, [routeState.destination]);

  const performSearchAndSelectTop = async (query: string) => {
    if (!query || query.trim().length < 2) return;
    setIsSearching(true);
    try {
      const results = await LocationService.searchLocation(query);
      setSearchResults(results);
      if (results && results.length > 0) {
        const top = results[0];
        const coords: [number, number] = [top.lat, top.lon];
        setSearchInput(top.display_name);
        await setDestCoordsAndAddress(coords, top.display_name);
        setShowDropdown(false);
      }
    } finally {
      setIsSearching(false);
    }
  };

  // Handle 400ms debounced destination search
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchInput(query);
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
    }, 400);
  };

  const handleSelectResult = async (result: SearchResult) => {
    const coords: [number, number] = [result.lat, result.lon];
    setSearchInput(result.display_name);
    setShowDropdown(false);
    await setDestCoordsAndAddress(coords, result.display_name);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      performSearchAndSelectTop(searchInput);
    }
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setSearchResults([]);
    clearRoute();
  };

  // Direct Map Tap / Pin Placement handler (Method B)
  const handleMapClick = async (lat: number, lng: number) => {
    const address = await LocationService.reverseGeocode(lat, lng);
    const coords: [number, number] = [lat, lng];
    setSearchInput(address);
    await setDestCoordsAndAddress(coords, address);
  };

  // Draggable Destination Marker handler
  const handleDestinationDragEnd = async (lat: number, lng: number) => {
    const address = await LocationService.reverseGeocode(lat, lng);
    const coords: [number, number] = [lat, lng];
    setSearchInput(address);
    await setDestCoordsAndAddress(coords, address);
  };

  return (
    <MobileShell footer={<BottomNav />} hideFooterPadding>
      <div className="relative h-full w-full bg-slate-50 overflow-hidden">
        {/* Top Search & GPS Trigger Header */}
        <div className="absolute top-0 left-0 right-0 z-20 bg-white border-b border-slate-200 p-3 space-y-2">
          {/* Search Input Field */}
          <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-md px-3 py-2 relative shadow-xs">
            <button onClick={() => performSearchAndSelectTop(searchInput)}>
              <Search className="w-4 h-4 text-slate-500 hover:text-blue-700 flex-shrink-0" />
            </button>
            <input
              type="text"
              value={searchInput}
              onFocus={() => setShowDropdown(true)}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              className="w-full text-xs font-bold text-slate-900 bg-transparent focus:outline-none placeholder:font-normal placeholder:text-slate-400 truncate"
              placeholder="Search destination (e.g. Pune) or drag red pin..."
            />
            {isSearching ? (
              <Loader2 className="w-4 h-4 text-blue-700 animate-spin flex-shrink-0" />
            ) : (
              searchInput && (
                <button
                  onClick={handleClearSearch}
                  className="text-slate-400 hover:text-slate-900 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )
            )}
          </div>

          {/* Quick GPS Action Button & Status */}
          <div className="flex items-center justify-between pt-0.5">
            <button
              onClick={() => acquireLiveLocation()}
              disabled={routeState.isAcquiringLocation}
              className="text-[11px] font-bold text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-md border border-blue-200 transition-colors flex items-center gap-1.5"
            >
              {routeState.isAcquiringLocation ? (
                <Loader2 className="w-3 h-3 animate-spin text-blue-700" />
              ) : (
                <LocateFixed className="w-3.5 h-3.5 text-blue-700" />
              )}
              <span>📍 Use My Current Location</span>
            </button>

            <span className="text-[10px] text-slate-500 font-medium truncate max-w-[140px]">
              {routeState.origin ? `Start: ${routeState.origin}` : 'Tap map or drag pin'}
            </span>
          </div>

          {/* Search Results Dropdown */}
          {showDropdown && searchResults.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-md divide-y divide-slate-100 py-1 z-50 max-h-48 overflow-y-auto shadow-xl">
              <div className="px-3 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50">
                Select Location Match:
              </div>
              {searchResults.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelectResult(item);
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-medium text-slate-900 hover:bg-blue-50 flex items-start gap-2 transition-colors"
                >
                  <MapPin className="w-3.5 h-3.5 text-red-600 flex-shrink-0 mt-0.5" />
                  <span className="line-clamp-2 leading-snug">{item.display_name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Dynamic Leaflet Map Viewport */}
        <div className="w-full h-full pt-28 pb-16">
          <MapView
            mode="explore"
            showRoute={routeState.calculated}
            startCoords={routeState.startCoords}
            destCoords={routeState.destCoords}
            routeCoordinates={routeState.routeCoordinates}
            onMapClick={handleMapClick}
            onDestinationDragEnd={handleDestinationDragEnd}
          />
        </div>

        {/* Floating Map Control Buttons */}
        <div className="absolute right-3 bottom-20 z-20 flex flex-col gap-2">
          <button
            onClick={() => (window as any).__mapZoomIn?.()}
            className="w-9 h-9 bg-white border border-slate-200 rounded-md flex items-center justify-center text-slate-900 hover:bg-slate-50 shadow-xs"
            aria-label="Zoom In"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={() => (window as any).__mapZoomOut?.()}
            className="w-9 h-9 bg-white border border-slate-200 rounded-md flex items-center justify-center text-slate-900 hover:bg-slate-50 shadow-xs"
            aria-label="Zoom Out"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            onClick={() => (window as any).__mapRecenter?.()}
            className="w-9 h-9 bg-white border border-slate-200 rounded-md flex items-center justify-center text-blue-700 hover:bg-slate-50 shadow-xs"
            aria-label="Recenter"
          >
            <Navigation className="w-4 h-4" />
          </button>
        </div>

        {/* Dynamic Bottom Route Card */}
        {routeState.calculated && (
          <div className="absolute bottom-16 left-0 right-0 z-20 bg-white border-t border-slate-200 p-4 shadow-lg space-y-2">
            <div className="flex items-center justify-between">
              <div className="min-w-0 pr-2">
                <h3 className="text-xs font-bold text-slate-900 truncate">
                  {routeState.origin || 'Start'} → {routeState.destination || 'Destination'}
                </h3>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                  {routeState.distance} • {routeState.duration} ETA • OSRM Dynamic Route
                </p>
              </div>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-600/20 flex-shrink-0">
                GPS ACTIVE
              </span>
            </div>

            <button
              onClick={() => navigate('/route-setup')}
              className="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold py-2.5 px-4 rounded-md transition-colors text-xs flex items-center justify-center gap-1.5"
            >
              <span>Configure & Start Route</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </MobileShell>
  );
};
