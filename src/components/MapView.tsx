import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import { TileCacheService } from '../services/tileCacheService';
import { MAP_CONFIG } from '../config/mapConfig';
import type { RouteOption, VehicleType } from '../types/navigation';
import { Plus, Minus, Locate, Maximize2 } from 'lucide-react';

import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

// Custom Marker Icons
const createStartIcon = () =>
  L.divIcon({
    className: 'custom-start-icon',
    html: `
      <div style="width: 22px; height: 22px; background: #059669; border: 3px solid #FFFFFF; border-radius: 50%; box-shadow: 0 2px 6px rgba(0,0,0,0.35);"></div>
    `,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });

const createDestIcon = () =>
  L.divIcon({
    className: 'custom-dest-icon',
    html: `
      <div style="width: 24px; height: 24px; background: #DC2626; border: 3px solid #FFFFFF; border-radius: 50%; box-shadow: 0 2px 6px rgba(0,0,0,0.45); cursor: grab;"></div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

// Dynamic High-Visibility Navigation Vehicle Arrow Icon with Profile Awareness
const createChevronIcon = (heading: number = 0, vehicleType: 'car' | 'bike' | 'walking' = 'car') => {
  let primaryColor = '#2563EB'; // Car Blue
  let strokeColor = '#93C5FD';
  let haloColor = 'rgba(37, 99, 235, 0.2)';
  let haloBorder = 'rgba(59, 130, 246, 0.5)';
  let iconSvg = `
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L20 20.5L12 16.5L4 20.5L12 2Z" fill="${primaryColor}" stroke="#FFFFFF" stroke-width="2.2" stroke-linejoin="round"/>
      <path d="M12 3.5L12 15.5" stroke="${strokeColor}" stroke-width="1.5" stroke-linecap="round"/>
    </svg>
  `;

  if (vehicleType === 'bike') {
    primaryColor = '#059669'; // Emerald
    strokeColor = '#A7F3D0';
    haloColor = 'rgba(5, 150, 105, 0.2)';
    haloBorder = 'rgba(16, 185, 129, 0.5)';
    iconSvg = `
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10.5" fill="${primaryColor}" stroke="#FFFFFF" stroke-width="2"/>
        <path d="M12 5L16 14L12 11.5L8 14L12 5Z" fill="#FFFFFF"/>
        <circle cx="12" cy="17" r="1.5" fill="${strokeColor}"/>
      </svg>
    `;
  } else if (vehicleType === 'walking') {
    primaryColor = '#D97706'; // Amber/Orange
    strokeColor = '#FDE68A';
    haloColor = 'rgba(217, 119, 6, 0.2)';
    haloBorder = 'rgba(245, 158, 11, 0.5)';
    iconSvg = `
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10.5" fill="${primaryColor}" stroke="#FFFFFF" stroke-width="2"/>
        <path d="M12 5L15.5 13L12 11L8.5 13L12 5Z" fill="#FFFFFF"/>
        <circle cx="12" cy="16.5" r="1.5" fill="${strokeColor}"/>
      </svg>
    `;
  }

  return L.divIcon({
    className: `custom-chevron-icon custom-chevron-${vehicleType}`,
    html: `
      <div style="width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; position: relative;">
        <!-- Accuracy pulse halo -->
        <div style="position: absolute; width: 30px; height: 30px; border-radius: 50%; background: ${haloColor}; border: 1.5px solid ${haloBorder};"></div>
        <!-- Directional vehicle navigation arrow SVG with centered transform-origin -->
        <div class="chevron-arrow" style="width: 34px; height: 34px; transform: rotate(${heading}deg); transform-origin: center center; will-change: transform; display: flex; align-items: center; justify-content: center; filter: drop-shadow(0px 3px 6px rgba(0,0,0,0.45));">
          ${iconSvg}
        </div>
      </div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
};

// Custom Leaflet TileLayer with IndexedDB Offline Persistence Interceptor
const IndexedDBTileLayer = L.TileLayer.extend({
  createTile(coords: L.Coords, done: L.DoneCallback) {
    const tile = document.createElement('img');

    L.DomEvent.on(tile, 'load', L.Util.bind((this as any)._tileOnLoad, this, done, tile));
    L.DomEvent.on(tile, 'error', L.Util.bind((this as any)._tileOnError, this, done, tile));

    if (this.options.crossOrigin || this.options.crossOrigin === '') {
      tile.crossOrigin = this.options.crossOrigin === true ? '' : this.options.crossOrigin;
    }

    tile.alt = '';
    tile.setAttribute('role', 'presentation');

    const url = this.getTileUrl(coords);

    // Fetch from IndexedDB cache or network
    TileCacheService.getTile(url).then((cachedDataUrl) => {
      if (cachedDataUrl) {
        tile.src = cachedDataUrl;
      } else {
        fetch(url)
          .then((res) => {
            if (!res.ok) throw new Error('Tile fetch failed');
            return res.blob();
          })
          .then((blob) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const dataUrl = reader.result as string;
              tile.src = dataUrl;
              TileCacheService.saveTile(url, dataUrl);
            };
            reader.readAsDataURL(blob);
          })
          .catch(() => {
            const placeholder = TileCacheService.getPlaceholderTile();
            tile.src = placeholder;
          });
      }
    });

    return tile;
  },
});

export interface MapViewProps {
  mode?: 'explore' | 'navigation' | 'summary';
  center?: [number, number];
  zoom?: number;
  showRoute?: boolean;
  startCoords?: [number, number] | null;
  destCoords?: [number, number] | null;
  routes?: RouteOption[];
  selectedRouteIndex?: number;
  routeCoordinates?: [number, number][];
  deadReckoningPath?: [number, number][];
  rawInsPath?: [number, number][];
  liveVehiclePos?: [number, number] | null;
  liveHeading?: number;
  vehicleType?: VehicleType;
  cameraMode?: 'north-up' | 'head-up';
  isDarkMode?: boolean;
  hideControls?: boolean;
  onMapClick?: (lat: number, lng: number) => void;
  onStartDragEnd?: (lat: number, lng: number) => void;
  onDestinationDragEnd?: (lat: number, lng: number) => void;
  onSelectRoute?: (index: number) => void;
  onToggleCameraMode?: () => void;
  onFollowModeChange?: (isFollow: boolean) => void;
}

const MapViewComponent: React.FC<MapViewProps> = ({
  mode = 'explore',
  center = MAP_CONFIG.DEFAULT_CENTER,
  zoom = MAP_CONFIG.DEFAULT_ZOOM,
  showRoute = true,
  startCoords = null,
  destCoords = null,
  routes = [],
  selectedRouteIndex = 0,
  routeCoordinates = [],
  deadReckoningPath = [],
  rawInsPath = [],
  liveVehiclePos = null,
  liveHeading = 0,
  vehicleType = 'car',
  cameraMode = 'north-up',
  isDarkMode = false,
  hideControls = false,
  onMapClick,
  onStartDragEnd,
  onDestinationDragEnd,
  onSelectRoute,
  onToggleCameraMode,
  onFollowModeChange,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const routeLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const markerLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const vehicleMarkerRef = useRef<L.Marker | null>(null);
  const vehicleTypeRef = useRef<VehicleType>(vehicleType);
  const isProgrammaticMoveRef = useRef<boolean>(false);
  const isInitialCenterDoneRef = useRef<boolean>(false);
  const lastFittedRouteKeyRef = useRef<string>('');

  useEffect(() => {
    vehicleTypeRef.current = vehicleType;
    if (vehicleMarkerRef.current) {
      vehicleMarkerRef.current.setIcon(createChevronIcon(visualHeadingRef.current, vehicleType));
    }
  }, [vehicleType]);

  // High-Rate 60 FPS Visual Animation References
  const targetPosRef = useRef<[number, number] | null>(liveVehiclePos || startCoords);
  const visualPosRef = useRef<[number, number] | null>(liveVehiclePos || startCoords);
  const targetHeadingRef = useRef<number>(liveHeading || 0);
  const visualHeadingRef = useRef<number>(liveHeading || 0);
  const cameraModeRef = useRef<'north-up' | 'head-up'>(cameraMode);

  // Follow Mode State (OFF by default in explore/route-setup; ON in navigation)
  const [isFollowMode, setIsFollowMode] = useState<boolean>(mode === 'navigation');
  const followModeRef = useRef<boolean>(mode === 'navigation');

  const updateFollowMode = useCallback(
    (val: boolean) => {
      followModeRef.current = val;
      setIsFollowMode(val);
      onFollowModeChange?.(val);
    },
    [onFollowModeChange]
  );

  useEffect(() => {
    cameraModeRef.current = cameraMode;
  }, [cameraMode]);

  // Keep targetPosRef updated without triggering map camera updates
  useEffect(() => {
    if (liveVehiclePos) {
      targetPosRef.current = liveVehiclePos;
      if (!visualPosRef.current) {
        visualPosRef.current = [...liveVehiclePos];
      }
    } else if (startCoords && !visualPosRef.current) {
      targetPosRef.current = startCoords;
      visualPosRef.current = [...startCoords];
    }
  }, [liveVehiclePos, startCoords]);

  useEffect(() => {
    targetHeadingRef.current = liveHeading;
  }, [liveHeading]);

  // Initialize Leaflet Map once
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const initialCenter = startCoords || liveVehiclePos || center;

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: zoom,
      minZoom: 3,
      maxZoom: 19,
      zoomControl: false,
      attributionControl: true,
      fadeAnimation: true,
      zoomAnimation: true,
    });

    new (IndexedDBTileLayer as any)(MAP_CONFIG.OSM_TILE_URL, {
      maxZoom: MAP_CONFIG.MAX_ZOOM,
      crossOrigin: true,
      attribution: MAP_CONFIG.OSM_ATTRIBUTION,
    }).addTo(map);

    const routeGroup = L.layerGroup().addTo(map);
    const markerGroup = L.layerGroup().addTo(map);
    routeLayerGroupRef.current = routeGroup;
    markerLayerGroupRef.current = markerGroup;
    mapInstanceRef.current = map;

    // Detect user manual interaction (drag, zoom, pan) to immediately deactivate follow mode
    const handleUserMapInteraction = () => {
      if (isProgrammaticMoveRef.current) return;
      if (followModeRef.current) {
        updateFollowMode(false);
      }
    };

    map.on('dragstart', handleUserMapInteraction);
    map.on('zoomstart', handleUserMapInteraction);
    map.on('movestart', handleUserMapInteraction);

    // ResizeObserver to ensure tiles render cleanly without container clipping
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    if (mapContainerRef.current) {
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        routeLayerGroupRef.current = null;
        markerLayerGroupRef.current = null;
        vehicleMarkerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // One-time initial camera center
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || isInitialCenterDoneRef.current) return;

    const initialPos = startCoords || liveVehiclePos;
    if (initialPos) {
      isProgrammaticMoveRef.current = true;
      map.setView(initialPos, zoom, { animate: false });
      isInitialCenterDoneRef.current = true;
      setTimeout(() => {
        isProgrammaticMoveRef.current = false;
        map.invalidateSize();
      }, 200);
    }
  }, [startCoords, liveVehiclePos, zoom]);

  // Map click listener
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const handleMapClick = (e: L.LeafletMouseEvent) => {
      if (onMapClick) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    };

    map.on('click', handleMapClick);
    return () => {
      map.off('click', handleMapClick);
    };
  }, [onMapClick]);

  // 60 FPS Visual Interpolation Loop for Vehicle Marker & Optional Camera Follow
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const tick = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      const targetPos = targetPosRef.current;
      const targetHeading = targetHeadingRef.current;
      const map = mapInstanceRef.current;
      const marker = vehicleMarkerRef.current;

      if (targetPos) {
        if (!visualPosRef.current) {
          visualPosRef.current = [targetPos[0], targetPos[1]];
        } else {
          // Smooth exponential LERP factor for position
          const factor = Math.min(1, dt * 10);
          visualPosRef.current[0] += (targetPos[0] - visualPosRef.current[0]) * factor;
          visualPosRef.current[1] += (targetPos[1] - visualPosRef.current[1]) * factor;
        }

        // Shortest-path angular heading LERP
        const diff = ((targetHeading - visualHeadingRef.current + 540) % 360) - 180;
        visualHeadingRef.current += diff * Math.min(1, dt * 12);

        const vPos: [number, number] = [visualPosRef.current[0], visualPosRef.current[1]];
        const vHead = visualHeadingRef.current;

        // Update vehicle marker imperatively (DOES NOT MOVE CAMERA)
        if (marker) {
          marker.setLatLng(vPos);
          const el = marker.getElement();
          const arrow = el?.querySelector('.chevron-arrow') as HTMLElement;
          if (arrow) {
            arrow.style.transform = `rotate(${vHead}deg)`;
          }
        } else if (markerLayerGroupRef.current) {
          const newMarker = L.marker(vPos, {
            icon: createChevronIcon(vHead, vehicleTypeRef.current || 'car'),
            zIndexOffset: 1000,
          }).addTo(markerLayerGroupRef.current);
          vehicleMarkerRef.current = newMarker;
        }

        // ONLY glide camera if Follow Mode is explicitly ON (e.g. active navigation)
        if (
          followModeRef.current &&
          map &&
          !isProgrammaticMoveRef.current
        ) {
          map.panTo(vPos, { animate: false });
        }

        // Head-Up Camera Rotation if enabled
        if (mapContainerRef.current) {
          if (cameraModeRef.current === 'head-up') {
            mapContainerRef.current.style.transform = `rotate(${-vHead}deg)`;
          } else {
            mapContainerRef.current.style.transform = 'rotate(0deg)';
          }
        }
      }

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Reactive Route & Marker Overlays (Renders polylines & markers; does NOT auto-recenter continuously)
  useEffect(() => {
    const map = mapInstanceRef.current;
    const routeGroup = routeLayerGroupRef.current;
    if (!map || !routeGroup) return;

    routeGroup.clearLayers();

    // 1. Start Marker (Green Circle)
    if (startCoords) {
      const startMarker = L.marker(startCoords, {
        icon: createStartIcon(),
        draggable: !!onStartDragEnd,
      })
        .bindPopup('<b>Start / Current Location</b>')
        .addTo(routeGroup);

      if (onStartDragEnd) {
        startMarker.on('dragend', (event: L.DragEndEvent) => {
          const target = event.target as L.Marker;
          const pos = target.getLatLng();
          onStartDragEnd(pos.lat, pos.lng);
        });
      }
    }

    // 2. Destination Marker (Red Circle - Draggable)
    if (destCoords) {
      const destMarker = L.marker(destCoords, {
        icon: createDestIcon(),
        draggable: true,
      })
        .bindPopup('<b>Destination</b>')
        .addTo(routeGroup);

      if (onDestinationDragEnd) {
        destMarker.on('dragend', (event: L.DragEndEvent) => {
          const target = event.target as L.Marker;
          const pos = target.getLatLng();
          onDestinationDragEnd(pos.lat, pos.lng);
        });
      }
    }

    // 3. Multi-Route Layer Rendering (OSRM Alternatives + Active Selection)
    if (showRoute) {
      if (routes && routes.length > 0) {
        // Draw unselected alternative routes underneath
        routes.forEach((r, idx) => {
          if (idx !== selectedRouteIndex && r.coordinates.length > 0) {
            const altLine = L.polyline(r.coordinates, {
              color: '#94A3B8',
              weight: 5,
              opacity: 0.8,
              dashArray: '6, 6',
              lineCap: 'round',
              className: 'cursor-pointer hover:opacity-100',
            }).addTo(routeGroup);

            altLine.on('click', () => {
              onSelectRoute?.(idx);
            });
            altLine.bindTooltip(`<b>${r.label || `Option ${idx + 1}`}</b>: ${r.durationMin} min (${r.distanceKm} km)`, {
              sticky: true,
            });
          }
        });

        // Draw primary active route on top
        const activeRoute = routes[selectedRouteIndex] || routes[0];
        if (activeRoute && activeRoute.coordinates.length > 0) {
          const mainLine = L.polyline(activeRoute.coordinates, {
            color: mode === 'summary' ? '#16A34A' : '#2563EB',
            weight: 6,
            opacity: 0.95,
            lineCap: 'round',
            lineJoin: 'round',
          }).addTo(routeGroup);

          // Fit bounds ONLY ONCE when a brand new route is calculated
          const routeKey = `${activeRoute.id || 'route'}_${activeRoute.distanceKm}_${activeRoute.coordinates.length}`;
          if (lastFittedRouteKeyRef.current !== routeKey && mode !== 'navigation') {
            lastFittedRouteKeyRef.current = routeKey;
            try {
              isProgrammaticMoveRef.current = true;
              map.fitBounds(mainLine.getBounds(), { padding: [40, 40] });
              setTimeout(() => {
                isProgrammaticMoveRef.current = false;
              }, 400);
            } catch {
              // Ignore zero bound errors
            }
          }
        }
      } else if (routeCoordinates && routeCoordinates.length > 0) {
        const polyline = L.polyline(routeCoordinates, {
          color: mode === 'summary' ? '#16A34A' : '#2563EB',
          weight: 6,
          opacity: 0.95,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(routeGroup);

        const routeKey = `coords_${routeCoordinates.length}`;
        if (lastFittedRouteKeyRef.current !== routeKey && mode !== 'navigation') {
          lastFittedRouteKeyRef.current = routeKey;
          try {
            isProgrammaticMoveRef.current = true;
            map.fitBounds(polyline.getBounds(), { padding: [40, 40] });
            setTimeout(() => {
              isProgrammaticMoveRef.current = false;
            }, 400);
          } catch {
            // Ignore zero bound errors
          }
        }
      }
    }

    // 4. Dead Reckoning Path (Amber Dashed Line)
    if (deadReckoningPath && deadReckoningPath.length > 0) {
      L.polyline(deadReckoningPath, {
        color: '#CA8A04',
        weight: 4,
        dashArray: '8, 8',
        opacity: 0.95,
        lineCap: 'round',
      }).addTo(routeGroup);
    }

    // 5. Raw INS Path (Red Transparent Line)
    if (rawInsPath && rawInsPath.length > 0) {
      L.polyline(rawInsPath, {
        color: '#DC2626',
        weight: 3,
        dashArray: '4, 4',
        opacity: 0.5,
        lineCap: 'round',
      }).addTo(routeGroup);
    }
  }, [
    mode,
    startCoords,
    destCoords,
    routes,
    selectedRouteIndex,
    routeCoordinates,
    deadReckoningPath,
    rawInsPath,
    showRoute,
    onStartDragEnd,
    onDestinationDragEnd,
    onSelectRoute,
  ]);

  // Explicit User Camera Actions
  const handleZoomIn = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    isProgrammaticMoveRef.current = true;
    map.zoomIn();
    setTimeout(() => {
      isProgrammaticMoveRef.current = false;
    }, 300);
  };

  const handleZoomOut = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    isProgrammaticMoveRef.current = true;
    map.zoomOut();
    setTimeout(() => {
      isProgrammaticMoveRef.current = false;
    }, 300);
  };

  const handleRecenterOnLocation = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const pos = visualPosRef.current || targetPosRef.current || startCoords;
    if (pos) {
      isProgrammaticMoveRef.current = true;
      map.flyTo(pos, Math.max(map.getZoom(), 15), { duration: 0.8 });
      updateFollowMode(true);
      setTimeout(() => {
        isProgrammaticMoveRef.current = false;
      }, 900);
    }
  };

  const handleShowEntireRoute = () => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const activeCoords =
      routes && routes[selectedRouteIndex]?.coordinates.length > 0
        ? routes[selectedRouteIndex].coordinates
        : routeCoordinates;

    if (activeCoords && activeCoords.length > 0) {
      isProgrammaticMoveRef.current = true;
      updateFollowMode(false);
      map.fitBounds(L.latLngBounds(activeCoords), { padding: [40, 40] });
      setTimeout(() => {
        isProgrammaticMoveRef.current = false;
      }, 400);
    } else if (startCoords && destCoords) {
      isProgrammaticMoveRef.current = true;
      updateFollowMode(false);
      map.fitBounds(L.latLngBounds([startCoords, destCoords]), { padding: [40, 40] });
      setTimeout(() => {
        isProgrammaticMoveRef.current = false;
      }, 400);
    }
  };

  // Expose global methods for HUD buttons
  useEffect(() => {
    (window as any).__mapZoomIn = handleZoomIn;
    (window as any).__mapZoomOut = handleZoomOut;
    (window as any).__mapRecenter = handleRecenterOnLocation;
    (window as any).__mapViewFullRoute = handleShowEntireRoute;
  });

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-100 touch-pan-x touch-pan-y">
      {/* Map Viewport Container */}
      <div
        ref={mapContainerRef}
        className={`w-full h-full relative z-0 cursor-grab active:cursor-grabbing ${
          isDarkMode ? 'brightness-75 invert contrast-125 hue-rotate-180' : ''
        }`}
        style={{
          transformOrigin: 'center center',
        }}
      />

      {/* Floating Google-Maps-Style Action Controls */}
      {!hideControls && (
        <div className="absolute right-3 bottom-3 z-20 flex flex-col gap-1.5 shadow-md rounded-lg overflow-hidden border border-slate-200 bg-white/95 backdrop-blur-xs">
          {/* Zoom In */}
          <button
            onClick={handleZoomIn}
            className="w-8 h-8 flex items-center justify-center text-slate-800 hover:bg-slate-100 transition-colors border-b border-slate-100 cursor-pointer"
            title="Zoom In"
            aria-label="Zoom In"
          >
            <Plus className="w-4 h-4" />
          </button>

          {/* Zoom Out */}
          <button
            onClick={handleZoomOut}
            className="w-8 h-8 flex items-center justify-center text-slate-800 hover:bg-slate-100 transition-colors border-b border-slate-100 cursor-pointer"
            title="Zoom Out"
            aria-label="Zoom Out"
          >
            <Minus className="w-4 h-4" />
          </button>

          {/* Center on My Location (◎) */}
          <button
            onClick={handleRecenterOnLocation}
            className={`w-8 h-8 flex items-center justify-center transition-colors border-b border-slate-100 cursor-pointer ${
              isFollowMode ? 'text-blue-700 bg-blue-50' : 'text-slate-700 hover:bg-slate-100'
            }`}
            title="Center on My Location (◎)"
            aria-label="Center on Location"
          >
            <Locate className="w-4 h-4" />
          </button>

          {/* Show Entire Route */}
          {(routeCoordinates.length > 0 || routes.length > 0) && (
            <button
              onClick={handleShowEntireRoute}
              className="w-8 h-8 flex items-center justify-center text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Show Entire Route"
              aria-label="Show Entire Route"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Floating Camera Mode Quick Toggle in Navigation */}
      {mode === 'navigation' && onToggleCameraMode && (
        <div className="absolute left-3 top-16 z-20 flex flex-col gap-1.5">
          <button
            onClick={onToggleCameraMode}
            className="bg-white/95 backdrop-blur-xs border border-slate-200 shadow-md px-2.5 py-1.5 rounded-full flex items-center gap-1.5 text-xs font-bold text-slate-800 hover:bg-slate-50 transition-all active:scale-95 cursor-pointer"
            title="Toggle Camera Orientation Mode"
          >
            <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
            <span>{cameraMode === 'north-up' ? 'North-Up' : 'Head-Up (Follow)'}</span>
          </button>

          {!isFollowMode && (
            <button
              onClick={handleRecenterOnLocation}
              className="bg-amber-500 text-white shadow-md px-2.5 py-1 rounded-full text-[10px] font-extrabold flex items-center gap-1 hover:bg-amber-600 transition-all active:scale-95 cursor-pointer"
              title="Map is in free pan mode. Tap to re-center on vehicle."
            >
              <span>Free Pan • Tap to Follow</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export const MapView = React.memo(MapViewComponent);
