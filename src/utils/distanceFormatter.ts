/**
 * Centralized Distance Formatter for ReckonX Navigation.
 * Formats distance values accurately based on user's selected unit (km or mi).
 * 
 * Invariants:
 * - 1 Kilometer = 1,000 meters
 * - 1 Mile = 1,609.344 meters
 * - Underlying route and GPS tracking calculations always remain in real SI units (meters/km).
 */

/**
 * Format a distance given in meters according to the specified unit ('km' | 'mi').
 * @param distanceInMeters Distance in meters.
 * @param unit 'km' | 'mi' (default 'km').
 * @param decimals Number of decimal digits to display (default 1).
 * @returns Formatted string with unit suffix, e.g. "5.0 km" or "3.1 mi"
 */
export function formatDistanceMeters(
  distanceInMeters: number,
  unit: 'km' | 'mi' = 'km',
  decimals: number = 1
): string {
  if (distanceInMeters == null || isNaN(distanceInMeters) || distanceInMeters < 0) {
    return unit === 'mi' ? `0.${'0'.repeat(Math.max(0, decimals - 1))} mi` : `0.${'0'.repeat(Math.max(0, decimals - 1))} km`;
  }

  if (unit === 'mi') {
    const miles = distanceInMeters / 1609.344;
    return `${miles.toFixed(decimals)} mi`;
  } else {
    const km = distanceInMeters / 1000;
    return `${km.toFixed(decimals)} km`;
  }
}

/**
 * Format a distance given in kilometers according to the specified unit ('km' | 'mi').
 * @param distanceInKm Distance in kilometers.
 * @param unit 'km' | 'mi' (default 'km').
 * @param decimals Number of decimal digits to display (default 1).
 * @returns Formatted string with unit suffix, e.g. "5.0 km" or "3.1 mi"
 */
export function formatKmDistance(
  distanceInKm: number,
  unit: 'km' | 'mi' = 'km',
  decimals: number = 1
): string {
  return formatDistanceMeters((distanceInKm || 0) * 1000, unit, decimals);
}

/**
 * Return the display label for the selected distance unit ('km' or 'mi').
 */
export function getDistanceUnitLabel(unit: 'km' | 'mi' = 'km'): string {
  return unit === 'mi' ? 'mi' : 'km';
}
