/**
 * Centralized Map, Routing & Geocoding Provider Configuration
 * Provides dedicated endpoints for Car, Cycling, and Pedestrian routing.
 */

export const MAP_CONFIG = {
  OSM_TILE_URL: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  OSM_ATTRIBUTION: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>',
  NOMINATIM_BASE_URL: 'https://nominatim.openstreetmap.org',
  
  // Dedicated multi-profile OSRM routing providers
  ROUTING: {
    CAR_BASE_URL: 'https://routing.openstreetmap.de/routed-car',
    CAR_FALLBACK_URL: 'https://router.project-osrm.org',
    BIKE_BASE_URL: 'https://routing.openstreetmap.de/routed-bike',
    FOOT_BASE_URL: 'https://routing.openstreetmap.de/routed-foot',
  },

  MAX_ZOOM: 19,
  DEFAULT_CENTER: [19.0760, 72.8777] as [number, number], // Mumbai default
  DEFAULT_ZOOM: 13,
};
