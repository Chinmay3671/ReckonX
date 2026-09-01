export interface DRPositionEstimate {
  position: [number, number];
  velocitySpeedKmH: number;
  driftErrorMeters: number;
  headingDeg: number;
  isZuptActive?: boolean;
}

export interface SyntheticIMUData {
  ax: number;
  ay: number;
  az: number;
  gx: number;
  gy: number;
  gz: number;
}

// Internal ZUPT (Zero Velocity Update) stationary timer accumulator
let zuptStationaryDurationSec = 0;

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
   * Zero Velocity Update (ZUPT) Filter Algorithm:
   * Suppresses integration drift when vehicle is stationary (|a| < 0.25 m/s² for > 0.5 sec)
   */
  checkZuptStationary(accelMS2: number, deltaTimeSec: number): boolean {
    const absAccel = Math.abs(accelMS2);
    if (absAccel < 0.25) {
      zuptStationaryDurationSec += deltaTimeSec;
    } else {
      zuptStationaryDurationSec = 0;
    }
    return zuptStationaryDurationSec >= 0.5;
  },

  /**
   * Generate synthetic desktop IMU sensor data when running on PC without physical sensors
   */
  generateSyntheticDesktopIMU(speedKmH: number): SyntheticIMUData {
    const noiseX = (Math.random() - 0.5) * 0.03;
    const noiseY = (Math.random() - 0.5) * 0.03;
    const noiseZ = (Math.random() - 0.5) * 0.02;

    const baseAccelX = speedKmH > 2 ? 0.15 + noiseX : noiseX;
    const baseAccelY = noiseY;
    const baseAccelZ = 9.80 + noiseZ;

    return {
      ax: Math.round(baseAccelX * 100) / 100,
      ay: Math.round(baseAccelY * 100) / 100,
      az: Math.round(baseAccelZ * 100) / 100,
      gx: Math.round((Math.random() - 0.5) * 0.5 * 10) / 10,
      gy: Math.round((Math.random() - 0.5) * 0.5 * 10) / 10,
      gz: Math.round((Math.random() - 0.5) * 1.0 * 10) / 10,
    };
  },

  /**
   * Integrate IMU linear acceleration & heading vector to project Dead Reckoning step:
   * Includes ZUPT stationary drift suppression.
   */
  stepKinematics(
    prevPos: [number, number],
    currentSpeedKmH: number,
    accelMS2: number,
    headingDeg: number,
    deltaTimeSec: number,
    accumulatedDrift: number
  ): DRPositionEstimate {
    const isStationary = DeadReckoningEngine.checkZuptStationary(accelMS2, deltaTimeSec);

    // Convert speed to m/s
    const speedMS = isStationary ? 0 : (currentSpeedKmH * 1000) / 3600;
    const newSpeedMS = isStationary ? 0 : Math.max(0, speedMS + accelMS2 * deltaTimeSec);
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

    // Accumulate sensor drift error (suppressed during ZUPT stationary state)
    const driftIncrement = isStationary ? 0 : 0.05 * deltaTimeSec;
    const newDrift = accumulatedDrift + driftIncrement;

    return {
      position: newPos,
      velocitySpeedKmH: Math.round(newSpeedKmH * 10) / 10,
      driftErrorMeters: Math.round(newDrift * 100) / 100,
      headingDeg,
      isZuptActive: isStationary,
    };
  },
};
