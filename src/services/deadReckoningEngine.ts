export interface DRPositionEstimate {
  position: [number, number];
  velocitySpeedKmH: number;
  driftErrorMeters: number;
  headingDeg: number;
}

export const DeadReckoningEngine = {
  /**
   * Haversine distance calculation between two [lat, lng] points in kilometers
   */
  calculateHaversineDistance(
    coords1: [number, number],
    coords2: [number, number]
  ): number {
    const R = 6371; // Earth radius in km
    const dLat = ((coords2[0] - coords1[0]) * Math.PI) / 180;
    const dLon = ((coords2[1] - coords1[1]) * Math.PI) / 180;
    const lat1 = (coords1[0] * Math.PI) / 180;
    const lat2 = (coords2[0] * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
  },

  /**
   * Linear Interpolation (LERP) between two coordinate points
   */
  lerpCoordinate(
    start: [number, number],
    end: [number, number],
    alpha: number
  ): [number, number] {
    const clampedAlpha = Math.max(0, Math.min(1, alpha));
    const lat = start[0] + (end[0] - start[0]) * clampedAlpha;
    const lng = start[1] + (end[1] - start[1]) * clampedAlpha;
    return [lat, lng];
  },

  /**
   * Exponential Moving Average (EMA) position smoothing filter for GNSS recovery
   */
  emaFilterPosition(
    currentEstimate: [number, number],
    gnssRawFix: [number, number],
    smoothingFactor: number = 0.25
  ): [number, number] {
    const lat = currentEstimate[0] + smoothingFactor * (gnssRawFix[0] - currentEstimate[0]);
    const lng = currentEstimate[1] + smoothingFactor * (gnssRawFix[1] - currentEstimate[1]);
    return [lat, lng];
  },

  /**
   * Integrate IMU linear acceleration & heading vector to project Dead Reckoning step:
   * v_new = v_prev + a * dt
   * pos_new = pos_prev + v * dt * bearing
   * drift_new = drift_prev + sigma * dt
   */
  stepKinematics(
    prevPos: [number, number],
    currentSpeedKmH: number,
    accelMS2: number,
    headingDeg: number,
    deltaTimeSec: number,
    accumulatedDrift: number
  ): DRPositionEstimate {
    // Convert speed to m/s
    const speedMS = (currentSpeedKmH * 1000) / 3600;
    const newSpeedMS = Math.max(0, speedMS + accelMS2 * deltaTimeSec);
    const newSpeedKmH = (newSpeedMS * 3600) / 1000;

    // Calculate displacement in meters
    const distMeters = newSpeedMS * deltaTimeSec;

    // Convert bearing to radians
    const headingRad = (headingDeg * Math.PI) / 180;

    // Convert meter offset to lat/lng degrees (approximate for local navigation)
    const deltaLat = (distMeters * Math.cos(headingRad)) / 111111;
    const deltaLng =
      (distMeters * Math.sin(headingRad)) /
      (111111 * Math.cos((prevPos[0] * Math.PI) / 180));

    const newPos: [number, number] = [
      prevPos[0] + deltaLat,
      prevPos[1] + deltaLng,
    ];

    // Accumulate sensor drift error (sigma = 0.05 meters per second)
    const newDrift = accumulatedDrift + 0.05 * deltaTimeSec;

    return {
      position: newPos,
      velocitySpeedKmH: Math.round(newSpeedKmH * 10) / 10,
      driftErrorMeters: Math.round(newDrift * 100) / 100,
      headingDeg,
    };
  },
};
