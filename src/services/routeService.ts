/**
 * Centralized Route Service
 * 
 * Provides dedicated, genuine profile routing for:
 * - 🚗 Car: Driving routes using highway/road networks, one-way & turn restriction awareness.
 * - 🚲 Bike: Bicycle routes prioritizing cycle paths, secondary streets, and bike accessibility.
 * - 🚶 Walking: Pedestrian routes utilizing walkways, footpaths, sidewalks, and avoiding motorways.
 * 
 * Features:
 * - Request ID & AbortSignal concurrency management (prevents race conditions).
 * - Profile-aware route cache (key includes vehicleProfile).
 * - Normalized response format across all providers.
 * - Strict profile enforcement (NEVER fall back to Car when Bike/Walking is requested).
 */

import { MAP_CONFIG } from '../config/mapConfig';
import { DeadReckoningEngine } from './deadReckoningEngine';
import type { VehicleType, RouteStep, RouteOption, NormalizedRouteResult } from '../types/navigation';

export interface RouteRequestOptions {
  origin: [number, number]; // [lat, lng]
  destination: [number, number]; // [lat, lng]
  vehicleProfile: VehicleType; // 'car' | 'bike' | 'walking'
  alternatives?: boolean;
  signal?: AbortSignal;
  requestId?: number;
}

export class RouteService {
  private static routeCache = new Map<string, { result: NormalizedRouteResult; timestamp: number }>();
  private static CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

  /**
   * Main entry point for all route calculations.
   */
  public static async calculateRoute(options: RouteRequestOptions): Promise<NormalizedRouteResult> {
    const { origin, destination, vehicleProfile, alternatives = true, signal, requestId = 0 } = options;
    const [startLat, startLng] = origin;
    const [destLat, destLng] = destination;

    // 1. Coordinate Validation
    if (!this.isValidCoordinate(startLat, startLng) || !this.isValidCoordinate(destLat, destLng)) {
      throw new Error('Invalid coordinate range provided for route calculation.');
    }

    const straightDistKm = DeadReckoningEngine.calculateHaversineDistance(origin, destination);
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

    if (!isOnline) {
      throw new Error(
        `Route unavailable while offline. (Straight-line distance: ${straightDistKm.toFixed(1)} km)`
      );
    }

    // 2. Profile-Aware Route Cache Check
    const cacheKey = `${startLat.toFixed(5)},${startLng.toFixed(5)}->${destLat.toFixed(5)},${destLng.toFixed(5)}:${vehicleProfile}`;
    const cached = this.routeCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      return {
        ...cached.result,
        requestId,
      };
    }

    // 3. Dispatch to profile-specific calculation methods
    let result: NormalizedRouteResult;
    switch (vehicleProfile) {
      case 'car':
        result = await this.calculateCarRoute(origin, destination, alternatives, signal, requestId, straightDistKm);
        break;
      case 'bike':
        result = await this.calculateBikeRoute(origin, destination, alternatives, signal, requestId, straightDistKm);
        break;
      case 'walking':
        result = await this.calculateWalkingRoute(origin, destination, alternatives, signal, requestId, straightDistKm);
        break;
      default:
        result = await this.calculateCarRoute(origin, destination, alternatives, signal, requestId, straightDistKm);
    }

    // 4. Save to cache
    this.routeCache.set(cacheKey, { result, timestamp: Date.now() });

    return result;
  }

  /**
   * 🚗 1. CAR ROUTING (Driving profile)
   */
  public static async calculateCarRoute(
    origin: [number, number],
    destination: [number, number],
    alternatives: boolean = true,
    signal?: AbortSignal,
    requestId: number = 0,
    straightDistKm?: number
  ): Promise<NormalizedRouteResult> {
    const [startLat, startLng] = origin;
    const [destLat, destLng] = destination;
    const coordsStr = `${startLng},${startLat};${destLng},${destLat}`;
    const distKm = straightDistKm || DeadReckoningEngine.calculateHaversineDistance(origin, destination);

    const primaryUrl = `${MAP_CONFIG.ROUTING.CAR_BASE_URL}/route/v1/driving/${coordsStr}?overview=full&geometries=geojson&alternatives=${alternatives}&steps=true`;
    const fallbackUrl = `${MAP_CONFIG.ROUTING.CAR_FALLBACK_URL}/route/v1/driving/${coordsStr}?overview=full&geometries=geojson&alternatives=${alternatives}&steps=true`;

    let data: any = null;
    let providerUsed = MAP_CONFIG.ROUTING.CAR_BASE_URL;

    // Try primary car router (routing.openstreetmap.de)
    try {
      const response = await fetch(primaryUrl, { signal });
      if (response.ok) {
        data = await response.json();
      }
    } catch (err: any) {
      if (err.name === 'AbortError') throw err;
    }

    // If primary failed, try fallback (router.project-osrm.org)
    if (!data || data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      try {
        const fbRes = await fetch(fallbackUrl, { signal });
        if (fbRes.ok) {
          data = await fbRes.json();
          providerUsed = MAP_CONFIG.ROUTING.CAR_FALLBACK_URL;
        }
      } catch (fbErr: any) {
        if (fbErr.name === 'AbortError') throw fbErr;
      }
    }

    if (!data || data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      throw new Error(
        `Driving route unavailable between locations. (Straight-line distance: ${distKm.toFixed(1)} km)`
      );
    }

    return this.normalizeOsrmResponse({
      data,
      vehicleProfile: 'car',
      profileLabel: '🚗 Car / Driving',
      routeTypeLabel: 'Driving Route',
      providerUrl: providerUsed,
      source: 'OSRM Car Network',
      requestId,
      defaultSpeedKmH: 50,
    });
  }

  /**
   * 🚲 2. BIKE ROUTING (Cycling profile)
   * Uses bicycle routing rules (prefers cycleways, secondary roads; avoids non-bike expressways).
   */
  public static async calculateBikeRoute(
    origin: [number, number],
    destination: [number, number],
    alternatives: boolean = true,
    signal?: AbortSignal,
    requestId: number = 0,
    straightDistKm?: number
  ): Promise<NormalizedRouteResult> {
    const [startLat, startLng] = origin;
    const [destLat, destLng] = destination;
    const coordsStr = `${startLng},${startLat};${destLng},${destLat}`;
    const distKm = straightDistKm || DeadReckoningEngine.calculateHaversineDistance(origin, destination);

    const bikeUrl = `${MAP_CONFIG.ROUTING.BIKE_BASE_URL}/route/v1/driving/${coordsStr}?overview=full&geometries=geojson&alternatives=${alternatives}&steps=true`;

    let data: any = null;
    try {
      const response = await fetch(bikeUrl, { signal });
      if (response.ok) {
        data = await response.json();
      }
    } catch (err: any) {
      if (err.name === 'AbortError') throw err;
      throw new Error(`Bike route connection error. (Straight-line: ${distKm.toFixed(1)} km)`);
    }

    // STRICT: Do NOT silently fall back to Car routing!
    if (!data || data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      throw new Error('Bike route unavailable for this destination.');
    }

    return this.normalizeOsrmResponse({
      data,
      vehicleProfile: 'bike',
      profileLabel: '🚲 Bike / Cycling',
      routeTypeLabel: 'Cycling Route',
      providerUrl: MAP_CONFIG.ROUTING.BIKE_BASE_URL,
      source: 'OSRM Cycling Network',
      requestId,
      defaultSpeedKmH: 18,
    });
  }

  /**
   * 🚶 3. WALKING ROUTING (Pedestrian profile)
   * Uses pedestrian routing rules (prefers footpaths, sidewalks, pedestrian zones; avoids motorways).
   */
  public static async calculateWalkingRoute(
    origin: [number, number],
    destination: [number, number],
    alternatives: boolean = true,
    signal?: AbortSignal,
    requestId: number = 0,
    straightDistKm?: number
  ): Promise<NormalizedRouteResult> {
    const [startLat, startLng] = origin;
    const [destLat, destLng] = destination;
    const coordsStr = `${startLng},${startLat};${destLng},${destLat}`;
    const distKm = straightDistKm || DeadReckoningEngine.calculateHaversineDistance(origin, destination);

    const footUrl = `${MAP_CONFIG.ROUTING.FOOT_BASE_URL}/route/v1/driving/${coordsStr}?overview=full&geometries=geojson&alternatives=${alternatives}&steps=true`;

    let data: any = null;
    try {
      const response = await fetch(footUrl, { signal });
      if (response.ok) {
        data = await response.json();
      }
    } catch (err: any) {
      if (err.name === 'AbortError') throw err;
      throw new Error(`Walking route connection error. (Straight-line: ${distKm.toFixed(1)} km)`);
    }

    // STRICT: Do NOT silently fall back to Car routing!
    if (!data || data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      throw new Error('Walking route unavailable for this destination.');
    }

    return this.normalizeOsrmResponse({
      data,
      vehicleProfile: 'walking',
      profileLabel: '🚶 Walking / Pedestrian',
      routeTypeLabel: 'Walking Route',
      providerUrl: MAP_CONFIG.ROUTING.FOOT_BASE_URL,
      source: 'OSRM Pedestrian Network',
      requestId,
      defaultSpeedKmH: 4.8,
    });
  }

  /**
   * Normalizes raw OSRM responses into a unified structure
   */
  private static normalizeOsrmResponse(params: {
    data: any;
    vehicleProfile: VehicleType;
    profileLabel: string;
    routeTypeLabel: string;
    providerUrl: string;
    source: string;
    requestId: number;
    defaultSpeedKmH: number;
  }): NormalizedRouteResult {
    const { data, vehicleProfile, profileLabel, routeTypeLabel, providerUrl, source, requestId, defaultSpeedKmH } = params;

    const routes: RouteOption[] = data.routes.map((r: any, idx: number) => {
      const rawCoords = r.geometry?.coordinates || [];
      // Convert OSRM [lng, lat] to Leaflet [lat, lng]
      const coordinates: [number, number][] = rawCoords.map((c: [number, number]) => [c[1], c[0]]);

      const distanceMeters = r.distance || 0;
      const distanceKm = Math.round((distanceMeters / 1000) * 10) / 10;

      // Extract duration from engine or use profile-specific fallback speed
      let durationSeconds = r.duration;
      if (durationSeconds == null || durationSeconds <= 0) {
        durationSeconds = Math.round((distanceKm / defaultSpeedKmH) * 3600);
      }
      const durationMin = Math.max(1, Math.round(durationSeconds / 60));

      // Extract Steps
      const steps: RouteStep[] = [];
      if (r.legs && r.legs.length > 0) {
        for (const leg of r.legs) {
          if (leg.steps) {
            for (const step of leg.steps) {
              steps.push({
                maneuverType: step.maneuver?.type || 'turn',
                modifier: step.maneuver?.modifier,
                name: step.name || 'Unnamed Street',
                distanceMeters: Math.round(step.distance || 0),
                durationSec: Math.round(step.duration || 0),
                instruction: this.formatStepInstruction(step, vehicleProfile),
              });
            }
          }
        }
      }

      // Determine label
      let label: 'Recommended' | 'Fastest' | 'Shortest' | 'Alternative' = 'Alternative';
      if (idx === 0) {
        label = 'Recommended';
      }

      const summary = r.legs?.[0]?.summary || `Via ${steps[0]?.name || 'Standard Route'}`;

      return {
        id: `route-${vehicleProfile}-${idx}-${Date.now()}`,
        index: idx,
        coordinates,
        distanceKm,
        durationMin,
        label,
        summary,
        routeType: routeTypeLabel,
        steps,
      };
    });

    // Tag fastest / shortest if multiple routes
    if (routes.length > 1) {
      let minDurIdx = 0;
      let minDur = routes[0].durationMin;
      let minDisIdx = 0;
      let minDis = routes[0].distanceKm;

      routes.forEach((rt, i) => {
        if (rt.durationMin < minDur) {
          minDur = rt.durationMin;
          minDurIdx = i;
        }
        if (rt.distanceKm < minDis) {
          minDis = rt.distanceKm;
          minDisIdx = i;
        }
      });

      routes[0].label = 'Recommended';
      if (minDurIdx !== 0 && routes[minDurIdx]) {
        routes[minDurIdx].label = 'Fastest';
      }
      if (minDisIdx !== 0 && minDisIdx !== minDurIdx && routes[minDisIdx]) {
        routes[minDisIdx].label = 'Shortest';
      }
    }

    const primaryRoute = routes[0];
    const primaryDistanceMeters = Math.round(data.routes[0].distance || primaryRoute.distanceKm * 1000);
    const primaryDurationSeconds = Math.round(data.routes[0].duration || primaryRoute.durationMin * 60);

    return {
      vehicleProfile,
      distanceMeters: primaryDistanceMeters,
      durationSeconds: primaryDurationSeconds,
      distanceKm: primaryRoute.distanceKm,
      durationMin: primaryRoute.durationMin,
      geometry: primaryRoute.coordinates,
      steps: primaryRoute.steps,
      alternatives: routes.slice(1),
      selectedRoute: primaryRoute,
      routes,
      summary: primaryRoute.summary,
      source,
      providerUrl,
      requestId,
      profileLabel,
      routeTypeLabel,
    };
  }

  /**
   * Formats human-friendly turn instruction for the vehicle mode
   */
  private static formatStepInstruction(step: any, vehicle: VehicleType): string {
    const maneuver = step.maneuver?.type;
    const modifier = step.maneuver?.modifier;
    const name = step.name || 'path';

    if (maneuver === 'depart') {
      return vehicle === 'walking'
        ? `Start walking on ${name}`
        : vehicle === 'bike'
        ? `Head out cycling on ${name}`
        : `Head on ${name}`;
    }

    if (maneuver === 'arrive') {
      return `Arrive at destination (${name})`;
    }

    if (maneuver === 'turn' || maneuver === 'end of road') {
      const dir = modifier ? modifier.replace('-', ' ') : 'ahead';
      return `Turn ${dir} onto ${name}`;
    }

    if (maneuver === 'fork') {
      return `Take the ${modifier || 'slight'} fork onto ${name}`;
    }

    if (maneuver === 'roundabout' || maneuver === 'rotary') {
      return `Enter roundabout and take exit onto ${name}`;
    }

    if (maneuver === 'continue') {
      return `Continue on ${name}`;
    }

    return `${maneuver || 'Proceed'} onto ${name}`;
  }

  /**
   * Helper coordinate range validation
   */
  private static isValidCoordinate(lat: number, lng: number): boolean {
    return (
      typeof lat === 'number' &&
      typeof lng === 'number' &&
      !isNaN(lat) &&
      !isNaN(lng) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180 &&
      (lat !== 0 || lng !== 0)
    );
  }

  /**
   * Clears cached routes
   */
  public static clearCache(): void {
    this.routeCache.clear();
  }
}
