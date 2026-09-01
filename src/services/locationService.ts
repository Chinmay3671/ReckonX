import { DeadReckoningEngine } from './deadReckoningEngine';

export interface SearchResult {
  display_name: string;
  lat: number;
  lon: number;
}

export interface CurrentLocationResult {
  lat: number;
  lng: number;
  address: string;
}

export interface RouteResult {
  coordinates: [number, number][];
  distanceKm: number;
  durationMin: number;
  isFallback?: boolean;
}

export const LocationService = {
  /**
   * Acquire live current GPS coordinates via HTML5 Geolocation API with high accuracy
   * and reverse geocode to a human-readable street/city name using Nominatim API.
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
              address: `Current Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
            });
          }
        },
        (error) => {
          let message = 'Failed to acquire location.';
          if (error.code === error.PERMISSION_DENIED) {
            message = 'Location permission denied by user.';
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            message = 'Location information unavailable.';
          } else if (error.code === error.TIMEOUT) {
            message = 'Location request timed out.';
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
   * Search for locations matching a text query using Nominatim API.
   */
  async searchLocation(query: string): Promise<SearchResult[]> {
    if (!query || query.trim().length < 2) {
      return [];
    }

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query.trim()
        )}&limit=5`,
        {
          headers: {
            'Accept-Language': 'en',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Nominatim search error: ${response.statusText}`);
      }

      const data = await response.json();
      return (data || []).map((item: any) => ({
        display_name: item.display_name,
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon),
      }));
    } catch (err) {
      console.warn('LocationService.searchLocation fallback:', err);
      return [];
    }
  },

  /**
   * Reverse-geocode latitude/longitude coordinates to a street/city address string.
   */
  async reverseGeocode(lat: number, lng: number): Promise<string> {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
        {
          headers: {
            'Accept-Language': 'en',
          },
        }
      );

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
   * Generate Haversine straight-line fallback route if OSRM Public Routing API is unreachable or rate limited.
   */
  generateFallbackRoute(
    start: [number, number],
    dest: [number, number]
  ): RouteResult {
    const steps = 12;
    const coordinates: [number, number][] = [];

    for (let i = 0; i <= steps; i++) {
      const alpha = i / steps;
      const point = DeadReckoningEngine.lerpCoordinate(start, dest, alpha);
      coordinates.push(point);
    }

    const distanceKm = DeadReckoningEngine.calculateHaversineDistance(start, dest);
    // Estimated driving duration assuming average speed of 60 km/h
    const durationMin = Math.max(1, Math.round((distanceKm / 60) * 60));

    return {
      coordinates,
      distanceKm,
      durationMin,
      isFallback: true,
    };
  },

  /**
   * Calculate dynamic drivable route polyline, distance (km), and ETA (min) using OSRM Public API.
   * Automatically falls back to Haversine straight-line route if OSRM is unreachable.
   */
  async calculateRoute(
    start: [number, number],
    dest: [number, number]
  ): Promise<RouteResult> {
    const [startLat, startLng] = start;
    const [destLat, destLng] = dest;

    const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${destLng},${destLat}?overview=full&geometries=geojson`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`OSRM Routing API returned status ${response.status}`);
      }

      const data = await response.json();
      if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
        throw new Error('No drivable route found between the specified locations.');
      }

      const primaryRoute = data.routes[0];
      const rawCoords: [number, number][] = primaryRoute.geometry.coordinates;

      // Convert OSRM GeoJSON format [lng, lat] to Leaflet format [lat, lng]
      const coordinates: [number, number][] = rawCoords.map(([lng, lat]) => [
        lat,
        lng,
      ]);

      const distanceKm = Math.round((primaryRoute.distance / 1000) * 10) / 10;
      const durationMin = Math.round(primaryRoute.duration / 60);

      return {
        coordinates,
        distanceKm,
        durationMin,
        isFallback: false,
      };
    } catch (err) {
      console.warn('OSRM API unavailable, generating Haversine fallback route:', err);
      return LocationService.generateFallbackRoute(start, dest);
    }
  },
};
