import { DeadReckoningEngine } from '../services/deadReckoningEngine';

/**
 * Calculate the projection of a point onto a line segment [p1, p2].
 * Returns the nearest coordinate on the segment.
 */
function projectPointOnSegment(
  p: [number, number],
  p1: [number, number],
  p2: [number, number]
): [number, number] {
  const [lat, lng] = p;
  const [lat1, lng1] = p1;
  const [lat2, lng2] = p2;

  const dx = lng2 - lng1;
  const dy = lat2 - lat1;

  if (dx === 0 && dy === 0) {
    return p1;
  }

  // Parameter t of projection onto line segment
  const t = Math.max(0, Math.min(1, ((lng - lng1) * dx + (lat - lat1) * dy) / (dx * dx + dy * dy)));

  return [lat1 + t * dy, lng1 + t * dx];
}

/**
 * Calculate the accurate remaining road distance along the polyline from current position.
 * 1. Finds the closest segment on the polyline to the vehicle position.
 * 2. Projects vehicle onto that segment.
 * 3. Sums distance from projected point to segment end + remaining polyline segments.
 */
export function calculateRemainingRoadDistance(
  currentPos: [number, number],
  routeCoordinates: [number, number][]
): { remainingDistanceKm: number; nearestSegmentIndex: number; offRouteDistanceMeters: number } {
  if (!routeCoordinates || routeCoordinates.length === 0) {
    return { remainingDistanceKm: 0, nearestSegmentIndex: 0, offRouteDistanceMeters: 0 };
  }

  if (routeCoordinates.length === 1) {
    const dist = DeadReckoningEngine.calculateHaversineDistance(currentPos, routeCoordinates[0]);
    return { remainingDistanceKm: dist, nearestSegmentIndex: 0, offRouteDistanceMeters: dist * 1000 };
  }

  let minDistanceToSegment = Infinity;
  let nearestSegmentIndex = 0;
  let nearestProjectedPoint: [number, number] = routeCoordinates[0];

  // Find the closest road segment along the route
  for (let i = 0; i < routeCoordinates.length - 1; i++) {
    const p1 = routeCoordinates[i];
    const p2 = routeCoordinates[i + 1];
    const projected = projectPointOnSegment(currentPos, p1, p2);
    const dist = DeadReckoningEngine.calculateHaversineDistance(currentPos, projected);

    if (dist < minDistanceToSegment) {
      minDistanceToSegment = dist;
      nearestSegmentIndex = i;
      nearestProjectedPoint = projected;
    }
  }

  // Distance from nearest projected point to the end of its segment
  const pNext = routeCoordinates[nearestSegmentIndex + 1];
  let remainingKm = DeadReckoningEngine.calculateHaversineDistance(nearestProjectedPoint, pNext);

  // Add all subsequent road segment lengths
  for (let i = nearestSegmentIndex + 1; i < routeCoordinates.length - 1; i++) {
    remainingKm += DeadReckoningEngine.calculateHaversineDistance(
      routeCoordinates[i],
      routeCoordinates[i + 1]
    );
  }

  return {
    remainingDistanceKm: Math.round(remainingKm * 10) / 10,
    nearestSegmentIndex,
    offRouteDistanceMeters: Math.round(minDistanceToSegment * 1000),
  };
}
