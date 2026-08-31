import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapView } from '../components/MapView';
import { BottomNav } from '../components/BottomNav';
import { useNavigationContext } from '../context/NavigationContext';
import { Plus, Minus, Navigation, X, Search, ChevronRight } from 'lucide-react';
import { MobileShell } from '../components/MobileShell';

export const ExplorePage: React.FC = () => {
  const navigate = useNavigate();
  const { routeState, setRouteDestination, clearRoute } = useNavigationContext();

  const [searchInput, setSearchInput] = useState<string>(routeState.destination || '');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('All India');

  const suggestions = [
    'Pune Logistics Depot, MH (NH 65 Expressway)',
    'Mumbai JNPT Port Terminal, MH',
    'Hyderabad Freight Hub, TS',
    'Bengaluru Logistics Corridor, KA',
  ];

  const handleSelectSuggestion = (item: string) => {
    setSearchInput(item);
    setRouteDestination(item);
    setShowDropdown(false);
  };

  const handleClearSearch = () => {
    setSearchInput('');
    clearRoute();
  };

  return (
    <MobileShell footer={<BottomNav />} hideFooterPadding>
      <div className="relative h-full w-full bg-slate-50 overflow-hidden">
        {/* Top Docked Search Bar (inside map screen) */}
        <div className="absolute top-0 left-0 right-0 z-20 bg-white border-b border-slate-200 p-3 space-y-2">
          {/* Search Input Field (Blank by default) */}
          <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-md px-3 py-2 relative">
            <Search className="w-4 h-4 text-slate-500 flex-shrink-0" />
            <input
              type="text"
              value={searchInput}
              onFocus={() => setShowDropdown(true)}
              onChange={(e) => {
                setSearchInput(e.target.value);
                if (!e.target.value) clearRoute();
              }}
              className="w-full text-xs font-bold text-slate-900 bg-transparent focus:outline-none placeholder:font-normal placeholder:text-slate-400"
              placeholder="Search destination (e.g. Pune Logistics Depot)..."
            />
            {searchInput && (
              <button onClick={handleClearSearch} className="text-slate-500 hover:text-slate-900 p-0.5">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Autocomplete Suggestions Dropdown */}
          {showDropdown && (
            <div className="bg-white border border-slate-200 rounded-md divide-y divide-slate-100 py-1 z-30 max-h-44 overflow-y-auto">
              <div className="px-3 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Suggested Logistics Hubs
              </div>
              {suggestions.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectSuggestion(item)}
                  className="w-full text-left px-3 py-2 text-xs font-medium text-slate-900 hover:bg-slate-50 flex items-center gap-2"
                >
                  <Search className="w-3.5 h-3.5 text-slate-500" />
                  <span>{item}</span>
                </button>
              ))}
            </div>
          )}

          {/* Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pt-0.5 no-scrollbar">
            {['All India', 'Active NH 65 Route', 'Tunnel Corridors'].map((chip) => {
              const isSelected = selectedFilter === chip;
              return (
                <button
                  key={chip}
                  onClick={() => setSelectedFilter(chip)}
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-full border transition-colors flex-shrink-0 ${
                    isSelected
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-500 border-slate-200 hover:border-slate-900'
                  }`}
                >
                  [{chip}]
                </button>
              );
            })}
          </div>
        </div>

        {/* Map Viewport */}
        <div className="w-full h-full pt-28 pb-16">
          <MapView mode="explore" showRoute={routeState.calculated} />
        </div>

        {/* Floating Map Controls */}
        <div className="absolute right-3 bottom-20 z-20 flex flex-col gap-2">
          <button
            onClick={() => (window as any).__mapZoomIn?.()}
            className="w-9 h-9 bg-white border border-slate-200 rounded-md flex items-center justify-center text-slate-900 hover:bg-slate-50"
            aria-label="Zoom In"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={() => (window as any).__mapZoomOut?.()}
            className="w-9 h-9 bg-white border border-slate-200 rounded-md flex items-center justify-center text-slate-900 hover:bg-slate-50"
            aria-label="Zoom Out"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            onClick={() => (window as any).__mapRecenter?.()}
            className="w-9 h-9 bg-white border border-slate-200 rounded-md flex items-center justify-center text-blue-700 hover:bg-slate-50"
            aria-label="Recenter"
          >
            <Navigation className="w-4 h-4" />
          </button>
        </div>

        {/* Bottom Drawer (Visible ONLY when destination is selected / route calculated) */}
        {routeState.calculated && (
          <div className="absolute bottom-16 left-0 right-0 z-20 bg-white border-t border-slate-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-xs font-bold text-slate-900">
                  Route Corridor: Solapur → Pune (NH 65)
                </h3>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                  142.4 km • 1 hr 54 min • 2 Tunnel Sections
                </p>
              </div>
              <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-600/20">
                IMU ACTIVE
              </span>
            </div>

            <button
              onClick={() => navigate('/route-setup')}
              className="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold py-2.5 px-4 rounded-md transition-colors text-xs flex items-center justify-center gap-1.5"
            >
              <span>Configure Route</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </MobileShell>
  );
};
