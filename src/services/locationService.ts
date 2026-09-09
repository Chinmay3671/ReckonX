import { MAP_CONFIG } from '../config/mapConfig';
import { DeadReckoningEngine } from './deadReckoningEngine';
import { RouteService } from './routeService';
import type { RouteOption, RouteStep, VehicleType, CurrentLocationData } from '../types/navigation';

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
  accuracy: number | null;
  altitude: number | null;
  speed: number | null;
  heading: number | null;
  timestamp: number;
  address: string;
}

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

// Reverse Geocode Cache keyed by ~50m spatial hash: "lat_3dec_lng_3dec"
const reverseGeocodeCache = new Map<string, string>();
const MAX_GEOCODE_CACHE = 100;

// Debounce timer handle for Nominatim API calls
let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

// Offline POI Database Fallback for offline search only
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
   * Validate latitude and longitude coordinate integrity
   */
  isValidCoordinate(lat: number, lng: number): boolean {
    return (
      typeof lat === 'number' &&
      typeof lng === 'number' &&
      isFinite(lat) &&
      isFinite(lng) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180
    );
  },

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
          const accuracy = position.coords.accuracy != null ? Math.round(position.coords.accuracy * 10) / 10 : null;
          const altitude = position.coords.altitude != null ? Math.round(position.coords.altitude * 10) / 10 : null;
          const speed = position.coords.speed != null ? Math.round(position.coords.speed * 3.6 * 10) / 10 : null; // m/s to km/h
          const heading = position.coords.heading != null && !isNaN(position.coords.heading) ? Math.round(position.coords.heading * 10) / 10 : null;
          const timestamp = position.timestamp || Date.now();

          if (!LocationService.isValidCoordinate(lat, lng)) {
            reject(new Error('Invalid GPS coordinates received from device.'));
            return;
          }

          try {
            const address = await LocationService.reverseGeocode(lat, lng);
            resolve({ lat, lng, accuracy, altitude, speed, heading, timestamp, address });
          } catch {
            resolve({
              lat,
              lng,
              accuracy,
              altitude,
              speed,
              heading,
              timestamp,
              address: `GPS Location (${lat.toFixed(5)}, ${lng.toFixed(5)})`,
            });
          }
        },
        (error) => {
          let message = 'Failed to acquire GPS location.';
          if (error.code === error.PERMISSION_DENIED) {
            message = 'Location permission denied. Please enable GPS permissions.';
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            message = 'GPS location unavailable.';
          } else if (error.code === error.TIMEOUT) {
            message = 'GPS location request timed out.';
          }
          reject(new Error(message));
        },
        {
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 0,
        }
      );
    });
  },

  /**
   * Continuous Location Watcher with timestamp & coordinate verification.
   */
  startLocationWatch(
    onLocation: (loc: CurrentLocationData) => void,
    onError: (err: Error) => void
  ): () => void {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      onError(new Error('Geolocation is not supported in this browser.'));
      return () => {};
    }

    let lastAcceptedTimestamp = 0;

    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const ts = position.timestamp || Date.now();

        // 1. Strict coordinate bounds validation
        if (!LocationService.isValidCoordinate(lat, lng)) {
          console.warn('Rejected invalid GPS coordinate:', lat, lng);
          return;
        }

        // 2. Strict chronological order check (never accept older cached event as newer)
        if (ts < lastAcceptedTimestamp) {
          return;
        }
        lastAcceptedTimestamp = ts;

        const accuracy = position.coords.accuracy != null ? Math.round(position.coords.accuracy * 10) / 10 : null;
        const altitude = position.coords.altitude != null ? Math.round(position.coords.altitude * 10) / 10 : null;
        const speed = position.coords.speed != null ? Math.round(position.coords.speed * 3.6 * 10) / 10 : null;
        const bearing = position.coords.heading != null && !isNaN(position.coords.heading) ? Math.round(position.coords.heading * 10) / 10 : null;

        // 3. Reverse geocode asynchronously
        let address = `GPS (${lat.toFixed(5)}, ${lng.toFixed(5)})`;
        try {
          address = await LocationService.reverseGeocode(lat, lng);
        } catch {
          // Fallback to coordinates
        }

        onLocation({
          latitude: lat,
          longitude: lng,
          accuracy,
          altitude,
          speed,
          bearing,
          timestamp: ts,
          address,
          source: 'gps',
          isStale: false,
          ageSec: 0,
        });
      },
      (error) => {
        let msg = 'GPS watch error';
        if (error.code === error.PERMISSION_DENIED) {
          msg = 'Location permission denied by user.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = 'GPS signal unavailable.';
        } else if (error.code === error.TIMEOUT) {
          msg = 'GPS request timed out.';
        }
        onError(new Error(msg));
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
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
   * Search local offline POI database for offline keyword search
   */
  searchOfflinePoiDatabase(cleanQuery: string): SearchResult[] {
    return OFFLINE_POI_DATABASE.filter((poi) =>
      poi.display_name.toLowerCase().includes(cleanQuery)
    );
  },

  /**
   * Reverse-geocode latitude/longitude coordinates to a street/city address string.
   * Spatial cache precision ~50m (3 decimal places).
   */
  async reverseGeocode(lat: number, lng: number): Promise<string> {
    if (!LocationService.isValidCoordinate(lat, lng)) {
      return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    }

    const key = `${lat.toFixed(3)}_${lng.toFixed(3)}`;
    if (reverseGeocodeCache.has(key)) {
      return reverseGeocodeCache.get(key)!;
    }

    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    if (!isOnline) {
      return `Offline Coordinate (${lat.toFixed(5)}, ${lng.toFixed(5)})`;
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
        if (reverseGeocodeCache.size >= MAX_GEOCODE_CACHE) {
          const first = reverseGeocodeCache.keys().next().value;
          if (first) reverseGeocodeCache.delete(first);
        }
        reverseGeocodeCache.set(key, data.display_name);
        return data.display_name;
      }
      return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    } catch (err) {
      console.warn('Reverse geocode fallback:', err);
      return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    }
  },

  /**
   * Calculate dynamic drivable road routes, alternatives, distance (km), ETA (min), and steps using OSRM API.
   */
  async calculateRoute(
    start: [number, number],
    dest: [number, number],
    vehicleType: VehicleType = 'car',
    signal?: AbortSignal
  ): Promise<MultiRouteResult> {
    const norm = await RouteService.calculateRoute({
      origin: start,
      destination: dest,
      vehicleProfile: vehicleType,
      alternatives: true,
      signal,
    });

    const straightDist = DeadReckoningEngine.calculateHaversineDistance(start, dest);

    return {
      routes: norm.routes,
      selectedRoute: norm.selectedRoute,
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
