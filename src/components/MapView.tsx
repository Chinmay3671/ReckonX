import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

export const SOLAPUR_COORDS: [number, number] = [17.6599, 75.9064];
export const PUNE_COORDS: [number, number] = [18.5204, 73.8567];

export const ROUTE_WAYPOINTS: [number, number][] = [
  [17.6599, 75.9064],
  [17.8200, 75.4500],
  [18.0100, 74.9800],
  [18.1100, 74.5800],
  [18.1400, 74.4800],
  [18.2800, 74.1200],
  [18.4200, 73.9800],
  [18.5204, 73.8567],
];

export const TUNNEL_WAYPOINTS: [number, number][] = [
  [18.1100, 74.5800],
  [18.1250, 74.5300],
  [18.1400, 74.4800],
];

interface MapViewProps {
  mode?: 'explore' | 'navigation' | 'summary';
  center?: [number, number];
  zoom?: number;
  showRoute?: boolean;
}

const MapViewComponent: React.FC<MapViewProps> = ({
  mode = 'explore',
  center = [18.1000, 74.8000],
  zoom = 9,
  showRoute = true,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: center,
      zoom: zoom,
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    const solapurIcon = L.divIcon({
      className: 'custom-solapur-icon',
      html: `
        <div style="width: 18px; height: 18px; background: #1D4ED8; border: 2.5px solid #FFFFFF; border-radius: 50%;"></div>
      `,
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });

    const destinationIcon = L.divIcon({
      className: 'custom-dest-icon',
      html: `
        <div style="width: 18px; height: 18px; background: #DC2626; border: 2.5px solid #FFFFFF; border-radius: 50%;"></div>
      `,
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });

    const chevronIcon = L.divIcon({
      className: 'custom-chevron-icon',
      html: `
        <div style="width: 28px; height: 28px; background: #1D4ED8; border: 2.5px solid #FFFFFF; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
          <div style="width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-bottom: 10px solid #FFFFFF;"></div>
        </div>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });

    L.marker(SOLAPUR_COORDS, { icon: solapurIcon })
      .addTo(map)
      .bindPopup('<b>Solapur Operations Hub</b>');

    L.marker(PUNE_COORDS, { icon: destinationIcon })
      .addTo(map)
      .bindPopup('<b>Pune Logistics Depot</b>');

    if (showRoute) {
      const segment1: [number, number][] = ROUTE_WAYPOINTS.slice(0, 4);
      L.polyline(segment1, {
        color: mode === 'summary' ? '#16A34A' : '#1D4ED8',
        weight: 5,
        opacity: 0.9,
      }).addTo(map);

      L.polyline(TUNNEL_WAYPOINTS, {
        color: '#D97706',
        weight: 5,
        dashArray: '8, 8',
        opacity: 1,
      }).addTo(map);

      const segment2: [number, number][] = ROUTE_WAYPOINTS.slice(4);
      L.polyline(segment2, {
        color: mode === 'summary' ? '#16A34A' : '#1D4ED8',
        weight: 5,
        opacity: 0.9,
      }).addTo(map);
    }

    if (mode === 'navigation') {
      const liveVehiclePos: [number, number] = [18.1200, 74.5500];
      L.marker(liveVehiclePos, { icon: chevronIcon }).addTo(map);
      map.setView(liveVehiclePos, 13);
    }

    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    (window as any).__mapZoomIn = () => {
      if (mapInstanceRef.current) mapInstanceRef.current.zoomIn();
    };
    (window as any).__mapZoomOut = () => {
      if (mapInstanceRef.current) mapInstanceRef.current.zoomOut();
    };
    (window as any).__mapRecenter = () => {
      if (mapInstanceRef.current) {
        if (mode === 'navigation') {
          mapInstanceRef.current.setView([18.1200, 74.5500], 13);
        } else {
          mapInstanceRef.current.fitBounds(L.latLngBounds(SOLAPUR_COORDS, PUNE_COORDS), {
            padding: [40, 40],
          });
        }
      }
    };
  }, [mode]);

  return <div ref={mapContainerRef} className="w-full h-full relative z-0" />;
};

// Memoize component to prevent unneeded Leaflet re-renders and map flickering
export const MapView = React.memo(MapViewComponent);
