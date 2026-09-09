import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import { TileCacheService } from '../services/tileCacheService';
import { MAP_CONFIG } from '../config/mapConfig';
import type { RouteOption } from '../types/navigation';

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
      <div style="width: 22px; height: 22px; background: #059669; border: 3px solid #FFFFFF; border-radius: 50%; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>
    `,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });

const createDestIcon = () =>
  L.divIcon({
    className: 'custom-dest-icon',
    html: `
      <div style="width: 24px; height: 24px; background: #DC2626; border: 3px solid #FFFFFF; border-radius: 50%; box-shadow: 0 2px 6px rgba(0,0,0,0.4); cursor: grab;"></div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

// Dynamic High-Visibility Navigation Vehicle Arrow Icon
const createChevronIcon = (heading: number = 0) =>
  L.divIcon({
    className: 'custom-chevron-icon',
    html: `
      <div style="width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; position: relative;">
        <!-- Accuracy pulse halo -->
        <div style="position: absolute; width: 28px; height: 28px; border-radius: 50%; background: rgba(37, 99, 235, 0.2); border: 1.5px solid rgba(59, 130, 246, 0.5);"></div>
        <!-- Directional vehicle navigation arrow SVG with centered transform-origin -->
        <div class="chevron-arrow" style="width: 34px; height: 34px; transform: rotate(${heading}deg); transform-origin: center center; will-change: transform; display: flex; align-items: center; justify-content: center; filter: drop-shadow(0px 3px 6px rgba(0,0,0,0.45));">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L20 20.5L12 16.5L4 20.5L12 2Z" fill="#2563EB" stroke="#FFFFFF" stroke-width="2.2" stroke-linejoin="round"/>
            <path d="M12 3.5L12 15.5" stroke="#93C5FD" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </div>
      </div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });

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
            // If online fetch fails and offline, use placeholder
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
  cameraMode?: 'north-up' | 'head-up';
  isDarkMode?: boolean;
  onMapClick?: (lat: number, lng: number) => void;
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
  cameraMode = 'north-up',
  isDarkMode = false,
  onMapClick,
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
  const isProgrammaticMoveRef = useRef<boolean>(false);
  const isInitialNavCenterDoneRef = useRef<boolean>(false);

  // High-Rate 60 FPS Visual Animation References
  const targetPosRef = useRef<[number, number] | null>(liveVehiclePos || startCoords);
  const visualPosRef = useRef<[number, number] | null>(liveVehiclePos || startCoords);
  const targetHeadingRef = useRef<number>(liveHeading || 0);
  const visualHeadingRef = useRef<number>(liveHeading || 0);
  const cameraModeRef = useRef<'north-up' | 'head-up'>(cameraMode);

  // Sync targets on prop updates without re-triggering animation setup
  useEffect(() => {
    cameraModeRef.current = cameraMode;
  }, [cameraMode]);

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

  // Follow Mode State
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

  // Initialize map once
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const initialCenter = startCoords || liveVehiclePos || center;

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: zoom,
      zoomControl: false,
      attributionControl: true,
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

    // Detect user manual interactions to release Follow Mode
    const handleUserMapInteraction = () => {
      if (isProgrammaticMoveRef.current) return;
      if (followModeRef.current) {
        updateFollowMode(false);
      }
    };

    map.on('dragstart', handleUserMapInteraction);
    map.on('zoomstart', () => {
      if (!isProgrammaticMoveRef.current && followModeRef.current) {
        updateFollowMode(false);
      }
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        routeLayerGroupRef.current = null;
        markerLayerGroupRef.current = null;
        vehicleMarkerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updateFollowMode]);

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

  // 60 FPS Visual Interpolation Loop for Marker & Camera Follow
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

        // Update vehicle marker imperatively
        if (marker) {
          marker.setLatLng(vPos);
          const el = marker.getElement();
          const arrow = el?.querySelector('.chevron-arrow') as HTMLElement;
          if (arrow) {
            arrow.style.transform = `rotate(${vHead}deg)`;
          }
        } else if (markerLayerGroupRef.current) {
          const newMarker = L.marker(vPos, {
            icon: createChevronIcon(vHead),
            zIndexOffset: 1000,
          }).addTo(markerLayerGroupRef.current);
          vehicleMarkerRef.current = newMarker;
        }

        // Smooth Camera Follow: Glide camera smoothly along with marker
        if (
          followModeRef.current &&
          mode === 'navigation' &&
          map &&
          !isProgrammaticMoveRef.current
        ) {
          map.panTo(vPos, { animate: false });
        }

        // Smooth Map Orientation (Head-Up Follow vs North-Up)
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
  }, [mode]);

  // Reactive Route & Marker Overlays (Renders only when coordinates / routes change)
  useEffect(() => {
    const map = mapInstanceRef.current;
    const routeGroup = routeLayerGroupRef.current;
    if (!map || !routeGroup) return;

    routeGroup.clearLayers();

    const bounds: [number, number][] = [];

    // 1. Start Marker (Green Circle)
    if (startCoords) {
      L.marker(startCoords, { icon: createStartIcon() })
        .bindPopup('<b>Start / Current Location</b>')
        .addTo(routeGroup);
      bounds.push(startCoords);
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

      bounds.push(destCoords);
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
            }).addTo(routeGroup);

            altLine.on('click', () => {
              onSelectRoute?.(idx);
            });
            altLine.bindTooltip(`<b>${r.label}</b>: ${r.durationMin}m (${r.distanceKm} km)`, {
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

          if (mode !== 'navigation') {
            try {
              isProgrammaticMoveRef.current = true;
              map.fitBounds(mainLine.getBounds(), { padding: [40, 40] });
              setTimeout(() => {
                isProgrammaticMoveRef.current = false;
              }, 300);
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

        if (mode !== 'navigation') {
          try {
            isProgrammaticMoveRef.current = true;
            map.fitBounds(polyline.getBounds(), { padding: [40, 40] });
            setTimeout(() => {
              isProgrammaticMoveRef.current = false;
            }, 300);
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

    if (
      bounds.length === 2 &&
      mode !== 'navigation' &&
      (!routeCoordinates || routeCoordinates.length === 0) &&
      (!routes || routes.length === 0)
    ) {
      isProgrammaticMoveRef.current = true;
      map.fitBounds(L.latLngBounds(bounds), { padding: [50, 50] });
      setTimeout(() => {
        isProgrammaticMoveRef.current = false;
      }, 300);
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
    onDestinationDragEnd,
    onSelectRoute,
  ]);

  // Initial navigation centering
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || mode !== 'navigation' || isInitialNavCenterDoneRef.current) return;

    const pos = visualPosRef.current || targetPosRef.current || startCoords;
    if (pos) {
      isProgrammaticMoveRef.current = true;
      map.setView(pos, 16, { animate: false });
      isInitialNavCenterDoneRef.current = true;
      setTimeout(() => {
        isProgrammaticMoveRef.current = false;
      }, 250);
    }
  }, [mode, startCoords]);

  // Map control helper functions (exposed globally for HUD buttons)
  useEffect(() => {
    (window as any).__mapZoomIn = () => {
      const map = mapInstanceRef.current;
      if (!map) return;
      isProgrammaticMoveRef.current = true;
      map.zoomIn();
      setTimeout(() => {
        isProgrammaticMoveRef.current = false;
      }, 300);
    };

    (window as any).__mapZoomOut = () => {
      const map = mapInstanceRef.current;
      if (!map) return;
      isProgrammaticMoveRef.current = true;
      map.zoomOut();
      setTimeout(() => {
        isProgrammaticMoveRef.current = false;
      }, 300);
    };

    (window as any).__mapRecenter = () => {
      const map = mapInstanceRef.current;
      if (!map) return;

      const pos = visualPosRef.current || targetPosRef.current || startCoords;
      if (mode === 'navigation') {
        if (pos) {
          isProgrammaticMoveRef.current = true;
          map.setView(pos, 16, { animate: true });
          updateFollowMode(true);
          setTimeout(() => {
            isProgrammaticMoveRef.current = false;
          }, 400);
        }
      } else if (startCoords && destCoords) {
        isProgrammaticMoveRef.current = true;
        map.fitBounds(L.latLngBounds([startCoords, destCoords]), { padding: [40, 40] });
        setTimeout(() => {
          isProgrammaticMoveRef.current = false;
        }, 300);
      } else if (startCoords) {
        isProgrammaticMoveRef.current = true;
        map.setView(startCoords, 14);
        setTimeout(() => {
          isProgrammaticMoveRef.current = false;
        }, 300);
      }
    };

    (window as any).__mapViewFullRoute = () => {
      const map = mapInstanceRef.current;
      if (!map) return;
      const coords =
        routes && routes[selectedRouteIndex]?.coordinates.length > 0
          ? routes[selectedRouteIndex].coordinates
          : routeCoordinates;

      if (!coords || coords.length === 0) return;

      isProgrammaticMoveRef.current = true;
      updateFollowMode(false);
      map.fitBounds(L.latLngBounds(coords), { padding: [50, 50] });
      setTimeout(() => {
        isProgrammaticMoveRef.current = false;
      }, 400);
    };
  }, [
    mode,
    startCoords,
    destCoords,
    routes,
    selectedRouteIndex,
    routeCoordinates,
    updateFollowMode,
  ]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-100">
      {/* Map Container with CSS Head-Up Rotation managed via RAF */}
      <div
        ref={mapContainerRef}
        className={`w-full h-full relative z-0 ${
          isDarkMode ? 'brightness-75 invert contrast-125 hue-rotate-180' : ''
        }`}
        style={{
          transformOrigin: 'center center',
        }}
      />

      {/* Floating Camera Mode Badge / Quick Toggle */}
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

          {/* Follow Mode Status Indicator Badge */}
          {!isFollowMode && (
            <button
              onClick={() => (window as any).__mapRecenter?.()}
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
