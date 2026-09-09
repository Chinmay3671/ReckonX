import { MAP_CONFIG } from '../config/mapConfig';
import { DeadReckoningEngine } from './deadReckoningEngine';

export interface SearchResult {
  display_name: string;
  lat: number;
  lon: number;
  type?: string;
  class?: string;
  addresstype?: string;
}

export interface CurrentLocationResult {
  lat: number;
  lng: number;
  address: string;
}

import type { RouteOption, RouteStep } from '../types/navigation';

export interface RouteResult {
  coordinates: [number, number][];
  distanceKm: number;
  durationMin: number;
  isFallback?: boolean;
  routeName?: string;
  steps?: RouteStep[];
}

export interface MultiRouteResult {
  routes: RouteOption[];
  selectedRoute: RouteOption;
  isFallback?: boolean;
  straightLineDistanceKm?: number;
}

// In-Memory LRU Cache for Nominatim Search Queries (Limit: 50 items)
const lruSearchCache = new Map<string, SearchResult[]>();
const MAX_LRU_SIZE = 50;

// Debounce timer handle for Nominatim API calls
let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

// Offline POI Database Fallback (Scenarios 3 & 4 - Pure Offline Modes)
const OFFLINE_POI_DATABASE: SearchResult[] = [
  {
    display_name: 'Chhatrapati Shivaji Maharaj International Airport (BOM), Mumbai',
    lat: 19.0896,
    lon: 72.8656,
    type: 'aerodrome',
  },
  {
    display_name: 'Gateway of India, Colaba, Mumbai, Maharashtra',
    lat: 18.922,
    lon: 72.8347,
    type: 'monument',
  },
  {
    display_name: 'Bandra Kurla Complex (BKC), Bandra East, Mumbai',
    lat: 19.0657,
    lon: 72.8687,
    type: 'commercial',
  },
  {
    display_name: 'Marine Drive, Netaji Subhash Chandra Bose Road, Mumbai',
    lat: 18.944,
    lon: 72.823,
    type: 'highway',
  },
  {
    display_name: 'Dadar Central Railway Station, Mumbai',
    lat: 19.0178,
    lon: 72.8478,
    type: 'station',
  },
  {
    display_name: 'Pune Junction Railway Station, Pune, Maharashtra',
    lat: 18.5289,
    lon: 73.8744,
    type: 'station',
  },
  {
    display_name: 'Thane Railway Station, Thane West, Maharashtra',
    lat: 19.186,
    lon: 72.9759,
    type: 'station',
  },
  {
    display_name: 'Navi Mumbai International Airport Site, Panvel',
    lat: 18.99,
    lon: 73.078,
    type: 'aerodrome',
  },
];

export const LocationService = {
  /**
   * Acquire live current GPS coordinates via HTML5 Geolocation API with high accuracy
   * and reverse geocode to a human-readable street/city name.
   */
  async getCurrentLocation(): Promise<CurrentLocationResult> {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      throw new Error('Geolocation API is not supported by your browser.');
    }

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;

          try {
            const address = await LocationService.reverseGeocode(lat, lng);
            resolve({ lat, lng, address });
          } catch {
            resolve({
              lat,
              lng,
              address: `GPS Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
            });
          }
        },
        (error) => {
          let message = 'Failed to acquire GPS location.';
          if (error.code === error.PERMISSION_DENIED) {
            message = 'Location permission denied by user.';
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            message = 'GPS location unavailable.';
          } else if (error.code === error.TIMEOUT) {
            message = 'GPS location request timed out.';
          }
          reject(new Error(message));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  },

  /**
   * Search for locations using Nominatim API with 400ms debounce and LRU cache.
   * Fallbacks seamlessly to local POI database if offline or network error.
   */
  async searchLocation(query: string): Promise<SearchResult[]> {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const cleanQuery = query.trim().toLowerCase();

    // 1. Check In-Memory LRU Cache first
    if (lruSearchCache.has(cleanQuery)) {
      const cached = lruSearchCache.get(cleanQuery)!;
      // Refresh key order in LRU cache
      lruSearchCache.delete(cleanQuery);
      lruSearchCache.set(cleanQuery, cached);
      return cached;
    }

    // 2. Check network connectivity status
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    if (!isOnline) {
      return LocationService.searchOfflinePoiDatabase(cleanQuery);
    }

    // 3. 400ms Debounced Network Call to Nominatim API
    return new Promise((resolve) => {
      if (searchDebounceTimer) {
        clearTimeout(searchDebounceTimer);
      }

      searchDebounceTimer = setTimeout(async () => {
        try {
          const searchUrl = `${MAP_CONFIG.NOMINATIM_BASE_URL}/search?format=json&q=${encodeURIComponent(
            query.trim()
          )}&limit=5&addressdetails=1`;

          const response = await fetch(searchUrl, {
            headers: {
              'Accept-Language': 'en',
            },
          });

          if (!response.ok) {
            throw new Error(`Nominatim error: ${response.statusText}`);
          }

          const data = await response.json();
          const results: SearchResult[] = (data || []).map((item: any) => ({
            display_name: item.display_name,
            lat: parseFloat(item.lat),
            lon: parseFloat(item.lon),
            type: item.type,
            class: item.class,
            addresstype: item.addresstype,
          }));

          // Store in LRU cache
          if (lruSearchCache.size >= MAX_LRU_SIZE) {
            const firstKey = lruSearchCache.keys().next().value;
            if (firstKey) lruSearchCache.delete(firstKey);
          }
          lruSearchCache.set(cleanQuery, results);

          resolve(results);
        } catch (err) {
          console.warn('Nominatim API search fallback:', err);
          resolve(LocationService.searchOfflinePoiDatabase(cleanQuery));
        }
      }, 400);
    });
  },

  /**
   * Search local offline POI database for offline scenarios (Scenarios 3 & 4)
   */
  searchOfflinePoiDatabase(cleanQuery: string): SearchResult[] {
    return OFFLINE_POI_DATABASE.filter((poi) =>
      poi.display_name.toLowerCase().includes(cleanQuery)
    );
  },

  /**
   * Reverse-geocode latitude/longitude coordinates to a street/city address string.
   */
  async reverseGeocode(lat: number, lng: number): Promise<string> {
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    if (!isOnline) {
      return `Offline Coordinate (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
    }

    try {
      const reverseUrl = `${MAP_CONFIG.NOMINATIM_BASE_URL}/reverse?format=json&lat=${lat}&lon=${lng}`;
      const response = await fetch(reverseUrl, {
        headers: {
          'Accept-Language': 'en',
        },
      });

      if (!response.ok) {
        throw new Error('Reverse geocode failed');
      }

      const data = await response.json();
      if (data && data.display_name) {
        return data.display_name;
      }
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    } catch (err) {
      console.warn('Reverse geocode fallback:', err);
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
  },

  /**
   * Calculate dynamic drivable road routes, alternatives, distance (km), ETA (min), and steps using OSRM API.
   * Requests real route alternatives using OSRM `alternatives=true&steps=true`.
   * Strictly avoids fabricating fake routes or drawing straight-line road routes.
   */
  async calculateRoute(
    start: [number, number],
    dest: [number, number],
    signal?: AbortSignal
  ): Promise<MultiRouteResult> {
    const [startLat, startLng] = start;
    const [destLat, destLng] = dest;

    // 1. Strict Coordinate Validation
    if (
      !isFinite(startLat) ||
      !isFinite(startLng) ||
      !isFinite(destLat) ||
      !isFinite(destLng) ||
      startLat < -90 ||
      startLat > 90 ||
      destLat < -90 ||
      destLat > 90 ||
      startLng < -180 ||
      startLng > 180 ||
      destLng < -180 ||
      destLng > 180
    ) {
      throw new Error('Invalid coordinate range provided for road routing.');
    }

    const straightDist = DeadReckoningEngine.calculateHaversineDistance(start, dest);
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

    if (!isOnline) {
      throw new Error(
        `Road route unavailable while offline. (Straight-line distance: ${straightDist.toFixed(1)} km)`
      );
    }

    // 2. Format URL with correct Longitude,Latitude order (OSRM standard)
    const url = `${MAP_CONFIG.OSRM_BASE_URL}/route/v1/driving/${startLng},${startLat};${destLng},${destLat}?overview=full&geometries=geojson&alternatives=true&steps=true`;

    let response: Response;
    try {
      response = await fetch(url, { signal });
    } catch (fetchErr: any) {
      if (fetchErr.name === 'AbortError') {
        throw fetchErr;
      }
      throw new Error(
        `Routing service connection error. Please check your internet connection. (Straight-line distance: ${straightDist.toFixed(1)} km)`
      );
    }

    let data: any = null;
    try {
      data = await response.json();
    } catch {
      // Non-JSON response
    }

    // 3. Graceful OSRM Response & Error Code Translation
    if (!response.ok || !data || data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      if (response.status === 429) {
        throw new Error('Routing service is temporarily busy. Please wait a moment and try again.');
      }
      if (response.status >= 500) {
        throw new Error('Routing service is temporarily unavailable. Please try again later.');
      }

      const osrmCode = data?.code;
      if (
        osrmCode === 'NoRoute' ||
        osrmCode === 'ImpossibleRoute' ||
        response.status === 400 ||
        response.status === 404
      ) {
        throw new Error(
          `No continuous road route found between locations (e.g. water barrier or broad island territory). Straight-line distance: ${straightDist.toFixed(1)} km.`
        );
      }

      if (osrmCode === 'InvalidQuery' || osrmCode === 'InvalidValue') {
        throw new Error(
          `Please select a more specific road-accessible destination. (Straight-line distance: ${straightDist.toFixed(1)} km)`
        );
      }

      throw new Error(
        `Road route unavailable: ${data?.message || 'No continuous driving route was found'}. (Straight-line distance: ${straightDist.toFixed(1)} km)`
      );
    }

    const rawRoutes = data.routes as any[];
    let minDuration = Infinity;
    let minDistance = Infinity;

    rawRoutes.forEach((r) => {
      if (r.duration < minDuration) minDuration = r.duration;
      if (r.distance < minDistance) minDistance = r.distance;
    });

    const parsedRoutes: RouteOption[] = rawRoutes.map((r, idx) => {
      const rawCoords: [number, number][] = r.geometry.coordinates;
      // Coordinate Safety Invariant: Convert OSRM GeoJSON format [lng, lat] to Leaflet format [lat, lng]
      const coordinates: [number, number][] = rawCoords.map(([lng, lat]) => [lat, lng]);
      const distanceKm = Math.round((r.distance / 1000) * 10) / 10;
      const durationMin = Math.max(1, Math.round(r.duration / 60));

      // Parse turn-by-turn steps
      const steps: RouteStep[] = (r.legs?.[0]?.steps || []).map((step: any) => {
        const type = step.maneuver?.type || 'turn';
        const modifier = step.maneuver?.modifier;
        const name = step.name || (step.ref ? `Ref ${step.ref}` : 'Unnamed Road');
        const distM = Math.round(step.distance);
        const durS = Math.round(step.duration);

        return {
          maneuverType: type,
          modifier,
          name,
          distanceMeters: distM,
          durationSec: durS,
          instruction: LocationService.formatStepInstruction(step),
        };
      });

      // Determine dynamic, mathematically honest route label
      let label: 'Recommended' | 'Fastest' | 'Shortest' | 'Alternative' = 'Alternative';
      if (idx === 0) {
        label = 'Recommended';
      } else if (r.duration <= minDuration) {
        label = 'Fastest';
      } else if (r.distance <= minDistance) {
        label = 'Shortest';
      }

      const summary = r.legs?.[0]?.summary || `Via ${steps[1]?.name || steps[0]?.name || 'Road Network'}`;

      return {
        id: `osrm-route-${idx}`,
        index: idx,
        coordinates,
        distanceKm,
        durationMin,
        label,
        summary,
        steps,
      };
    });

    return {
      routes: parsedRoutes,
      selectedRoute: parsedRoutes[0],
      isFallback: false,
      straightLineDistanceKm: Math.round(straightDist * 10) / 10,
    };
  },

  /**
   * Helper to format OSRM step maneuver into clear human-readable guidance.
   */
  formatStepInstruction(step: any): string {
    const name = step.name ? `onto ${step.name}` : '';
    const type = step.maneuver?.type || 'turn';
    const modifier = step.maneuver?.modifier ? ` ${step.maneuver.modifier}` : '';

    switch (type) {
      case 'depart':
        return step.name ? `Depart on ${step.name}` : 'Head out towards destination';
      case 'arrive':
        return 'Arrive at destination';
      case 'turn':
        return `Turn${modifier} ${name}`.trim();
      case 'new name':
        return `Continue ${name}`.trim();
      case 'continue':
        return `Continue straight ${name}`.trim();
      case 'merge':
        return `Merge${modifier} ${name}`.trim();
      case 'fork':
        return `Keep${modifier} at fork ${name}`.trim();
      case 'roundabout':
      case 'rotary':
        return `Enter roundabout and take exit ${name}`.trim();
      case 'on ramp':
        return `Take ramp ${name}`.trim();
      case 'off ramp':
        return `Take exit ${name}`.trim();
      default:
        return `${type}${modifier} ${name}`.trim();
    }
  },
};
