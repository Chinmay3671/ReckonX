import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { TopHeader } from '../components/TopHeader';
import { BottomNav } from '../components/BottomNav';
import { MapView } from '../components/MapView';
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
  Car,
  Bike,
  Footprints,
  Plus,
  Minus,
  Maximize2,
  X,
  Route as RouteIcon,
  Milestone,
  RefreshCw,
} from 'lucide-react';
import { MobileShell } from '../components/MobileShell';
import { LocationService } from '../services/locationService';
import type { SearchResult } from '../services/locationService';
import type { VehicleType } from '../types/navigation';
import { formatKmDistance } from '../utils/distanceFormatter';

export const RouteSetupPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    currentLocation,
    systemMode,
    routeState,
    settings,
    acquireLiveLocation,
    refreshGpsLocation,
    setStartCoordsAndAddress,
    setDestCoordsAndAddress,
    setVehicleType,
    swapLocations,
    selectRoute,
    startTrackingSession,
  } = useNavigationContext();

  // Origin Search State
  const [originQuery, setOriginQuery] = useState(routeState.origin || '');
  const [originResults, setOriginResults] = useState<SearchResult[]>([]);
  const [isSearchingOrigin, setIsSearchingOrigin] = useState(false);
  const [showOriginDropdown, setShowOriginDropdown] = useState(false);
  const originTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Destination Search State
  const [destQuery, setDestQuery] = useState(routeState.destination || '');
  const [destResults, setDestResults] = useState<SearchResult[]>([]);
  const [isSearchingDest, setIsSearchingDest] = useState(false);
  const [showDestDropdown, setShowDestDropdown] = useState(false);
  const destTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Synchronize input fields when routeState updates externally
  useEffect(() => {
    if (routeState.origin) {
      setOriginQuery(routeState.origin);
    }
  }, [routeState.origin]);

  useEffect(() => {
    if (routeState.destination) {
      setDestQuery(routeState.destination);
    }
  }, [routeState.destination]);

  // Origin search handlers
  const handleOriginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setOriginQuery(query);
    setShowOriginDropdown(true);

    if (originTimeoutRef.current) {
      clearTimeout(originTimeoutRef.current);
    }

    if (!query || query.trim().length < 2) {
      setOriginResults([]);
      setIsSearchingOrigin(false);
      return;
    }

    setIsSearchingOrigin(true);
    originTimeoutRef.current = setTimeout(async () => {
      const results = await LocationService.searchLocation(query);
      setOriginResults(results);
      setIsSearchingOrigin(false);
    }, 400);
  };

  const handleSelectOrigin = async (item: SearchResult) => {
    const coords: [number, number] = [item.lat, item.lon];
    setOriginQuery(item.display_name);
    setShowOriginDropdown(false);
    await setStartCoordsAndAddress(coords, item.display_name, true);
  };

  const handleOriginKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!originQuery || originQuery.trim().length < 2) return;
      setIsSearchingOrigin(true);
      try {
        const results = await LocationService.searchLocation(originQuery);
        setOriginResults(results);
        if (results && results.length > 0) {
          await handleSelectOrigin(results[0]);
        }
      } finally {
        setIsSearchingOrigin(false);
      }
    }
  };

  // Destination search handlers
  const handleDestChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setDestQuery(query);
    setShowDestDropdown(true);

    if (destTimeoutRef.current) {
      clearTimeout(destTimeoutRef.current);
    }

    if (!query || query.trim().length < 2) {
      setDestResults([]);
      setIsSearchingDest(false);
      return;
    }

    setIsSearchingDest(true);
    destTimeoutRef.current = setTimeout(async () => {
      const results = await LocationService.searchLocation(query);
      setDestResults(results);
      setIsSearchingDest(false);
    }, 400);
  };

  const handleSelectDest = async (item: SearchResult) => {
    const coords: [number, number] = [item.lat, item.lon];
    setDestQuery(item.display_name);
    setShowDestDropdown(false);
    await setDestCoordsAndAddress(coords, item.display_name);
  };

  const handleDestKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!destQuery || destQuery.trim().length < 2) return;
      setIsSearchingDest(true);
      try {
        const results = await LocationService.searchLocation(destQuery);
        setDestResults(results);
        if (results && results.length > 0) {
          await handleSelectDest(results[0]);
        }
      } finally {
        setIsSearchingDest(false);
      }
    }
  };

  // Map interactive pins / clicks
  const handleMapClick = async (lat: number, lng: number) => {
    const address = await LocationService.reverseGeocode(lat, lng);
    const coords: [number, number] = [lat, lng];
    if (!routeState.startCoords) {
      setOriginQuery(address);
      await setStartCoordsAndAddress(coords, address, true);
    } else {
      setDestQuery(address);
      await setDestCoordsAndAddress(coords, address);
    }
  };

  const handleStartDragEnd = async (lat: number, lng: number) => {
    const address = await LocationService.reverseGeocode(lat, lng);
    setOriginQuery(address);
    await setStartCoordsAndAddress([lat, lng], address, true);
  };

  const handleDestinationDragEnd = async (lat: number, lng: number) => {
    const address = await LocationService.reverseGeocode(lat, lng);
    setDestQuery(address);
    await setDestCoordsAndAddress([lat, lng], address);
  };

  const handleVehicleChange = (type: VehicleType) => {
    setVehicleType(type);
  };

  const handleStartLiveNavigation = () => {
    if (!routeState.startCoords || !routeState.destCoords || !routeState.calculated) {
      return;
    }
    startTrackingSession();
    navigate('/navigation');
  };

  const currentVehicle = routeState.vehicleType || 'car';
  const isNavReady =
    routeState.calculated &&
    !routeState.isCalculating &&
    !routeState.error &&
    routeState.routes.length > 0;

  const header = <TopHeader title="Route Configuration" backTo="/explore" />;

  const activeRoute = routeState.routes[routeState.selectedRouteIndex] || routeState.routes[0];
  const activeRouteIndex = routeState.selectedRouteIndex;

  const liveCoords: [number, number] | null =
    currentLocation.latitude !== null && currentLocation.longitude !== null
      ? [currentLocation.latitude, currentLocation.longitude]
      : routeState.startCoords;

  return (
    <MobileShell header={header} footer={<BottomNav />}>
      <div className="flex flex-col space-y-4 p-4 pb-24">
        {/* Top Mode & GPS Precision Bar */}
        <div className="flex items-center justify-between text-[10px] font-mono bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-2xs">
          <span className="flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {systemMode === 'live' ? 'LIVE DEVICE DATA' : 'SIMULATION MODE'}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-slate-600 font-semibold">
              {currentLocation.accuracy != null
                ? `GPS ±${currentLocation.accuracy}m`
                : 'GPS Searching...'}
            </span>
            <button
              onClick={() => refreshGpsLocation()}
              className="text-blue-700 hover:text-blue-900 p-0.5"
              title="Refresh GPS"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* 1. Origin & Destination Inputs Card */}
        <div className="bg-white border border-slate-200 rounded-lg p-3.5 space-y-3 relative shadow-xs">
          {/* Origin Section */}
          <div className="flex items-start gap-3 relative">
            <span className="w-3 h-3 rounded-full bg-emerald-600 flex-shrink-0 mt-3 ring-4 ring-emerald-100" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Start Origin
                </label>
                <button
                  onClick={() => acquireLiveLocation()}
                  disabled={routeState.isAcquiringLocation}
                  className="text-[10px] font-bold text-blue-700 hover:text-blue-800 flex items-center gap-1 cursor-pointer bg-blue-50 px-2 py-0.5 rounded border border-blue-200 transition-colors"
                  title="Acquire current physical device GPS location"
                >
                  {routeState.isAcquiringLocation ? (
                    <Loader2 className="w-3 h-3 animate-spin text-blue-700" />
                  ) : (
                    <LocateFixed className="w-3 h-3 text-blue-700" />
                  )}
                  <span>📍 Use My Location</span>
                </button>
              </div>

              <div className="relative flex items-center gap-1.5">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={originQuery}
                    onChange={handleOriginChange}
                    onKeyDown={handleOriginKeyDown}
                    onFocus={() => setShowOriginDropdown(true)}
                    placeholder="Search origin or tap 'Use My Location'..."
                    className="w-full text-xs font-bold text-slate-900 bg-slate-50 border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:border-blue-700 focus:bg-white truncate pr-7 transition-colors"
                  />
                  {isSearchingOrigin && (
                    <Loader2 className="w-3.5 h-3.5 text-blue-700 animate-spin absolute right-2 top-2.5" />
                  )}
                  {originQuery && !isSearchingOrigin && (
                    <button
                      onClick={() => {
                        setOriginQuery('');
                        setOriginResults([]);
                      }}
                      className="absolute right-2 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                      title="Clear Origin"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Origin Dropdown Results */}
              {showOriginDropdown && originResults.length > 0 && (
                <div className="absolute left-0 right-0 z-50 bg-white border border-slate-200 rounded-md divide-y divide-slate-100 mt-1 max-h-48 overflow-y-auto shadow-xl">
                  <div className="px-3 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50">
                    Select Origin Location:
                  </div>
                  {originResults.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelectOrigin(item);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-medium text-slate-900 hover:bg-emerald-50 flex items-start gap-2 transition-colors cursor-pointer"
                    >
                      <MapPin className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span className="line-clamp-2 leading-snug">{item.display_name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Destination Section */}
          <div className="flex items-start gap-3 relative">
            <span className="w-3 h-3 rounded-full bg-red-600 flex-shrink-0 mt-3 ring-4 ring-red-100" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Destination
                </label>
                <span className="text-[9px] text-slate-400 font-medium">Search city, street or POI</span>
              </div>

              <div className="relative flex items-center gap-1.5">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={destQuery}
                    onChange={handleDestChange}
                    onKeyDown={handleDestKeyDown}
                    onFocus={() => setShowDestDropdown(true)}
                    placeholder="Search destination (e.g. Mumbai, Pune)..."
                    className="w-full text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:border-blue-700 truncate pr-7 transition-colors"
                  />
                  {isSearchingDest && (
                    <Loader2 className="w-3.5 h-3.5 text-blue-700 animate-spin absolute right-2 top-2.5" />
                  )}
                  {destQuery && !isSearchingDest && (
                    <button
                      onClick={() => {
                        setDestQuery('');
                        setDestResults([]);
                      }}
                      className="absolute right-2 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                      title="Clear Destination"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <button
                  onClick={() => {
                    if (destQuery.trim().length >= 2) {
                      LocationService.searchLocation(destQuery).then((results) => {
                        if (results && results.length > 0) {
                          handleSelectDest(results[0]);
                        }
                      });
                    }
                  }}
                  className="bg-blue-700 hover:bg-blue-800 text-white p-2 rounded-md transition-colors flex-shrink-0 flex items-center justify-center cursor-pointer shadow-xs"
                  title="Search & Calculate Route"
                  aria-label="Search"
                >
                  <Search className="w-4 h-4" />
                </button>
              </div>

              {/* Destination Dropdown Results */}
              {showDestDropdown && destResults.length > 0 && (
                <div className="absolute left-0 right-0 z-50 bg-white border border-slate-200 rounded-md divide-y divide-slate-100 mt-1 max-h-48 overflow-y-auto shadow-xl">
                  <div className="px-3 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50">
                    Select Destination:
                  </div>
                  {destResults.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelectDest(item);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-medium text-slate-900 hover:bg-blue-50 flex items-start gap-2 transition-colors cursor-pointer"
                    >
                      <MapPin className="w-3.5 h-3.5 text-red-600 flex-shrink-0 mt-0.5" />
                      <span className="line-clamp-2 leading-snug">{item.display_name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Swap Locations Button */}
          <button
            onClick={swapLocations}
            className="absolute right-3.5 top-[38%] -translate-y-1/2 w-7 h-7 bg-white border border-slate-300 rounded-md flex items-center justify-center text-slate-700 hover:bg-slate-100 hover:text-blue-700 transition-colors shadow-2xs cursor-pointer z-10"
            title="Swap Origin & Destination"
            aria-label="Swap Locations"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 2. Vehicle Type Selection Tabs */}
        <div className="bg-white border border-slate-200 rounded-lg p-2 shadow-xs">
          <div className="flex items-center justify-between mb-1.5 px-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Vehicle Profile
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              {currentVehicle === 'car' ? 'Drivable Roads' : currentVehicle === 'bike' ? 'Cycling Routes' : 'Pedestrian Paths'}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleVehicleChange('car')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-xs font-bold transition-all cursor-pointer ${
                currentVehicle === 'car'
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Car className="w-3.5 h-3.5" />
              <span>Car</span>
            </button>
            <button
              onClick={() => handleVehicleChange('bike')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-xs font-bold transition-all cursor-pointer ${
                currentVehicle === 'bike'
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Bike className="w-3.5 h-3.5" />
              <span>Bike</span>
            </button>
            <button
              onClick={() => handleVehicleChange('walking')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-xs font-bold transition-all cursor-pointer ${
                currentVehicle === 'walking'
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Footprints className="w-3.5 h-3.5" />
              <span>Walking</span>
            </button>
          </div>
        </div>

        {/* 3. Interactive Normal Road Route Map Viewport */}
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs relative">
          <div className="h-60 sm:h-72 w-full relative">
            <MapView
              mode="explore"
              showRoute={routeState.calculated}
              startCoords={liveCoords}
              destCoords={routeState.destCoords}
              routes={routeState.routes}
              selectedRouteIndex={routeState.selectedRouteIndex}
              routeCoordinates={routeState.routeCoordinates}
              liveVehiclePos={liveCoords}
              vehicleType={currentVehicle}
              onMapClick={handleMapClick}
              onStartDragEnd={handleStartDragEnd}
              onDestinationDragEnd={handleDestinationDragEnd}
              onSelectRoute={selectRoute}
            />

            {/* Map Action Floating Controls */}
            <div className="absolute right-2.5 bottom-2.5 z-20 flex flex-col gap-1.5">
              <button
                onClick={() => (window as any).__mapZoomIn?.()}
                className="w-8 h-8 bg-white/95 backdrop-blur-xs border border-slate-300 rounded-md flex items-center justify-center text-slate-800 hover:bg-white shadow-sm cursor-pointer"
                title="Zoom In"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => (window as any).__mapZoomOut?.()}
                className="w-8 h-8 bg-white/95 backdrop-blur-xs border border-slate-300 rounded-md flex items-center justify-center text-slate-800 hover:bg-white shadow-sm cursor-pointer"
                title="Zoom Out"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => (window as any).__mapViewFullRoute?.()}
                className="w-8 h-8 bg-white/95 backdrop-blur-xs border border-slate-300 rounded-md flex items-center justify-center text-blue-700 hover:bg-white shadow-sm cursor-pointer"
                title="Fit Full Route"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Tap Map Hint Pill */}
            <div className="absolute left-2.5 top-2.5 z-20">
              <div className="bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow flex items-center gap-1.5 font-mono">
                <MapPin className="w-3 h-3 text-emerald-400" />
                <span>Tap map or drag pins to adjust</span>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Calculation State Strip */}
        {routeState.isCalculating && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-center gap-2 text-xs font-bold text-blue-700 shadow-xs animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin text-blue-700" />
            <span>
              {currentVehicle === 'walking'
                ? 'Calculating walking route...'
                : currentVehicle === 'bike'
                ? 'Calculating bike route...'
                : 'Calculating driving route...'}
            </span>
          </div>
        )}

        {/* 5. Selected Route & Profile Section */}
        {isNavReady && activeRoute ? (
          <div className="bg-white border-2 border-blue-700 rounded-lg p-4 space-y-3 shadow-xs bg-blue-50/20">
            {/* Status & Label */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded bg-blue-700 text-white font-mono uppercase tracking-wider">
                  ROUTE {activeRouteIndex + 1}
                </span>
                <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  {currentVehicle === 'walking'
                    ? 'Walking Route Ready'
                    : currentVehicle === 'bike'
                    ? 'Bike Route Ready'
                    : 'Driving Route Ready'}
                </span>
              </div>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-mono">
                {routeState.profileLabel || (currentVehicle === 'car' ? '🚗 Car / Driving' : currentVehicle === 'bike' ? '🚲 Bike / Cycling' : '🚶 Walking')}
              </span>
            </div>

            {/* Distance, ETA, Route Type summary */}
            <div className="flex items-baseline justify-between border-b border-slate-200 pb-2.5">
              <div>
                <h3 className="text-2xl font-black text-slate-900 font-mono tracking-tight">
                  {routeState.duration}
                </h3>
                <p className="text-xs font-bold text-slate-600 mt-0.5 flex items-center gap-1 font-mono">
                  <Milestone className="w-3.5 h-3.5 text-blue-700" />
                  <span>{routeState.distance}</span>
                  <span className="text-slate-400">•</span>
                  <span className="text-blue-700 font-sans font-bold">
                    {routeState.routeType || (currentVehicle === 'car' ? 'Driving Route' : currentVehicle === 'bike' ? 'Cycling Route' : 'Walking Route')}
                  </span>
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Via Corridor
                </span>
                <span className="text-xs font-bold text-slate-800 font-mono truncate max-w-[150px] block">
                  {activeRoute.summary || routeState.via || 'Primary Corridor'}
                </span>
              </div>
            </div>

            {/* 6. Route Alternatives List if Multiple Available */}
            {routeState.routes.length > 1 && (
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Compare {currentVehicle === 'walking' ? 'Walking' : currentVehicle === 'bike' ? 'Cycling' : 'Driving'} Alternatives
                  </span>
                  <span className="text-[10px] text-blue-700 font-bold">Tap to select</span>
                </div>
                <div className="space-y-2">
                  {routeState.routes.map((r, idx) => {
                    const isSelected = idx === activeRouteIndex;
                    const hrs = Math.floor(r.durationMin / 60);
                    const mins = r.durationMin % 60;
                    const durStr = hrs > 0 ? `${hrs}h ${mins}m` : `${mins} min`;
                    const distStr = formatKmDistance(r.distanceKm, settings.distanceUnit);

                    let badgeColor = 'bg-slate-100 text-slate-700 border-slate-300';
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
                        className={`rounded-md p-2.5 border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-blue-100/60 border-blue-600 ring-1 ring-blue-600'
                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className={`text-[9px] font-extrabold px-2 py-0.5 rounded border uppercase font-mono tracking-wide flex-shrink-0 ${badgeColor}`}
                          >
                            {r.label || `Route ${idx + 1}`}
                          </span>
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-slate-900 font-mono">
                              {durStr} ({distStr})
                            </span>
                            <p className="text-[11px] text-slate-500 truncate">{r.summary}</p>
                          </div>
                        </div>
                        {isSelected ? (
                          <CheckCircle2 className="w-4 h-4 text-blue-700 flex-shrink-0 ml-2" />
                        ) : (
                          <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-300 flex-shrink-0 ml-2" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : routeState.error && !routeState.isCalculating ? (
          <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 space-y-2 shadow-xs">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>ROUTING NOTICE</span>
            </div>
            <p className="text-xs text-amber-800 leading-relaxed font-medium">
              {routeState.error}
            </p>
            <p className="text-[11px] text-amber-700">
              Please choose a different destination or vehicle mode.
            </p>
          </div>
        ) : !routeState.isCalculating ? (
          <div className="bg-white border border-slate-200 border-dashed rounded-lg p-5 text-center space-y-1.5 shadow-xs">
            <RouteIcon className="w-6 h-6 text-slate-400 mx-auto" />
            <p className="text-xs font-bold text-slate-700">No active route</p>
            <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
              Select an origin and destination above or tap on the map to calculate normal road routing.
            </p>
          </div>
        ) : null}

        {/* 7. ROUTING DEBUG PANEL */}
        <div className="bg-slate-900 text-slate-100 rounded-lg p-3 font-mono text-[10px] space-y-2 border border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 font-bold border-b border-slate-800 pb-1 uppercase tracking-wider">
            <span>ROUTING DEBUG</span>
            <span className="text-emerald-400 font-bold">ACTIVE ENGINE</span>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 pt-0.5">
            <div>
              <span className="text-slate-400">Vehicle: </span>
              <span className="text-white font-bold capitalize">{currentVehicle}</span>
            </div>
            <div>
              <span className="text-slate-400">Routing Profile: </span>
              <span className="text-blue-400 font-bold">
                {currentVehicle === 'walking' ? 'walking' : currentVehicle === 'bike' ? 'cycling' : 'driving'}
              </span>
            </div>
            <div className="col-span-2 truncate">
              <span className="text-slate-400">Provider: </span>
              <span className="text-amber-300 text-[9px]">
                {routeState.routingDebug?.provider || (currentVehicle === 'car' ? 'routing.openstreetmap.de/routed-car' : currentVehicle === 'bike' ? 'routing.openstreetmap.de/routed-bike' : 'routing.openstreetmap.de/routed-foot')}
              </span>
            </div>
            <div>
              <span className="text-slate-400">Request ID: </span>
              <span className="text-purple-300">#{routeState.routingDebug?.requestId ?? 1}</span>
            </div>
            <div>
              <span className="text-slate-400">Distance: </span>
              <span className="text-emerald-300">
                {routeState.distance || (routeState.distanceKm ? `${routeState.distanceKm} km` : 'N/A')}
              </span>
            </div>
            <div>
              <span className="text-slate-400">Duration: </span>
              <span className="text-yellow-300">
                {routeState.duration || (routeState.durationMin ? `${routeState.durationMin} min` : 'N/A')}
              </span>
            </div>
            <div className="col-span-2 truncate">
              <span className="text-slate-400">Route source: </span>
              <span className="text-slate-300">
                {routeState.routingDebug?.source || (currentVehicle === 'car' ? 'OSRM Car Network' : currentVehicle === 'bike' ? 'OSRM Cycling Network' : 'OSRM Pedestrian Network')}
              </span>
            </div>
          </div>
        </div>

        {/* Dead Reckoning Readiness Strip */}
        <div className="bg-slate-900 text-white rounded-lg p-3 flex items-start gap-2.5 shadow-xs">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="text-xs font-bold text-amber-300">
              Dead Reckoning & GNSS Outage Safe
            </p>
            <p className="text-[11px] text-slate-300 leading-tight">
              INS dead reckoning engine automatically maintains continuous positioning if GPS drops in tunnels or dense urban canyons.
            </p>
          </div>
        </div>

        {/* Start Live Navigation HUD Button */}
        <button
          onClick={handleStartLiveNavigation}
          disabled={!isNavReady}
          className={`w-full font-bold py-3.5 px-4 rounded-lg transition-all text-xs flex items-center justify-center gap-2 shadow-sm ${
            isNavReady
              ? 'bg-blue-700 hover:bg-blue-800 text-white cursor-pointer active:scale-[0.99]'
              : 'bg-slate-300 text-slate-500 cursor-not-allowed'
          }`}
        >
          <Navigation className="w-4 h-4" />
          <span>Start Live Navigation HUD</span>
        </button>
      </div>
    </MobileShell>
  );
};
