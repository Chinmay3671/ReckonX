/**
 * Centralized Map & Geocoding Provider Configuration
 * Allows easy modification of tile, routing, and geocoding providers.
 */

export const MAP_CONFIG = {
  OSM_TILE_URL: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  OSM_ATTRIBUTION: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>',
  NOMINATIM_BASE_URL: 'https://nominatim.openstreetmap.org',
  OSRM_BASE_URL: 'https://router.project-osrm.org',
  MAX_ZOOM: 19,
  DEFAULT_CENTER: [19.0760, 72.8777] as [number, number], // Mumbai default
  DEFAULT_ZOOM: 13,
};
