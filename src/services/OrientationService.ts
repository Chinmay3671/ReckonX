export interface HeadingFusionInputs {
  magnetometerHeading: number | null;
  gnssTrackBearing: number | null;
  trajectoryBearing: number | null;
  gyroZRate: number | null; // Gyroscope angular rate around Z axis (deg/sec)
  speedKmH: number;
  isGnssAvailable: boolean;
  deltaTimeSec: number;
  previousHeading: number;
}

export const OrientationService = {
  /**
   * Calculate forward azimuth / bearing from (lat1, lng1) to (lat2, lng2) in degrees (0..360)
   * using spherical trigonometry (haversine forward bearing formula).
   */
  calculateBearing(start: [number, number], end: [number, number]): number {
    const [lat1, lng1] = start;
    const [lat2, lng2] = end;

    if (Math.abs(lat1 - lat2) < 1e-7 && Math.abs(lng1 - lng2) < 1e-7) {
      return 0;
    }

    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const lambda1 = (lng1 * Math.PI) / 180;
    const lambda2 = (lng2 * Math.PI) / 180;
    const dLambda = lambda2 - lambda1;

    const y = Math.sin(dLambda) * Math.cos(phi2);
    const x =
      Math.cos(phi1) * Math.sin(phi2) -
      Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLambda);

    const theta = Math.atan2(y, x);
    const bearing = ((theta * 180) / Math.PI + 360) % 360;

    return Math.round(bearing * 10) / 10;
  },

  /**
   * Normalize any angle in degrees to [0, 360)
   */
  normalizeAngle(angle: number): number {
    const mod = angle % 360;
    return mod < 0 ? mod + 360 : mod;
  },

  /**
   * Shortest-path angular interpolation (prevents 355° -> 5° wrap-around spinning glitch)
   * @param currentHeading Current smoothed heading (0-360)
   * @param targetHeading Target raw heading (0-360)
   * @param alpha Interpolation factor (0..1, e.g. 0.2 for 10Hz smoothing)
   */
  smoothHeading(
    currentHeading: number,
    targetHeading: number,
    alpha: number = 0.2
  ): number {
    const normCurrent = OrientationService.normalizeAngle(currentHeading);
    const normTarget = OrientationService.normalizeAngle(targetHeading);

    let diff = normTarget - normCurrent;

    // Adjust diff to find shortest rotational arc (-180 to +180)
    if (diff > 180) {
      diff -= 360;
    } else if (diff < -180) {
      diff += 360;
    }

    const smoothed = normCurrent + alpha * diff;
    return OrientationService.normalizeAngle(smoothed);
  },

  /**
   * Format numerical heading in degrees into string with cardinal direction
   * Example: 127.4 -> "127° SE", 0 -> "0° N", 225 -> "225° SW"
   */
  formatCardinalHeading(headingDeg: number): string {
    const norm = Math.round(OrientationService.normalizeAngle(headingDeg));
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(norm / 45) % 8;
    return `${norm}° ${directions[index]}`;
  },

  /**
   * Multi-Source Heading Fusion Pipeline
   * Combines Magnetometer, GNSS Track Bearing, Trajectory Azimuth, and Gyro Angular Rate.
   */
  fuseHeading(inputs: HeadingFusionInputs): number {
    const {
      magnetometerHeading,
      gnssTrackBearing,
      trajectoryBearing,
      gyroZRate,
      speedKmH,
      isGnssAvailable,
      deltaTimeSec,
      previousHeading,
    } = inputs;

    let targetHeading = previousHeading;

    if (isGnssAvailable) {
      if (speedKmH > 5) {
        // High Speed (> 5 km/h): Rely primarily on GNSS Track Bearing & Trajectory Bearing
        if (gnssTrackBearing !== null && !isNaN(gnssTrackBearing)) {
          if (trajectoryBearing !== null && !isNaN(trajectoryBearing)) {
            // Blend 70% GNSS Track + 30% Trajectory Bearing
            const diff = OrientationService.normalizeAngle(
              trajectoryBearing - gnssTrackBearing
            );
            const shortestDiff = diff > 180 ? diff - 360 : diff;
            targetHeading = OrientationService.normalizeAngle(
              gnssTrackBearing + 0.3 * shortestDiff
            );
          } else {
            targetHeading = gnssTrackBearing;
          }
        } else if (trajectoryBearing !== null && !isNaN(trajectoryBearing)) {
          targetHeading = trajectoryBearing;
        } else if (magnetometerHeading !== null && !isNaN(magnetometerHeading)) {
          targetHeading = magnetometerHeading;
        }
      } else if (speedKmH > 2) {
        // Medium/Low Speed (2 - 5 km/h): Blend Compass and Trajectory
        const baseCompass = magnetometerHeading ?? previousHeading;
        const baseTrajectory = trajectoryBearing ?? gnssTrackBearing ?? baseCompass;

        const diff = OrientationService.normalizeAngle(baseTrajectory - baseCompass);
        const shortestDiff = diff > 180 ? diff - 360 : diff;
        targetHeading = OrientationService.normalizeAngle(
          baseCompass + 0.5 * shortestDiff
        );
      } else {
        // Stationary / Stopped (<= 2 km/h): Transition smoothly to Hardware Compass
        if (magnetometerHeading !== null && !isNaN(magnetometerHeading)) {
          targetHeading = magnetometerHeading;
        } else if (trajectoryBearing !== null && !isNaN(trajectoryBearing)) {
          targetHeading = trajectoryBearing;
        }
      }
    } else {
      // GNSS Outage Mode (Tunnel or Lost Signal): Dead Reckoning + Gyro Integration
      if (gyroZRate !== null && !isNaN(gyroZRate) && Math.abs(gyroZRate) > 0.1) {
        // Integrate gyro Z rate (deg/sec * dt)
        const integratedHeading = previousHeading + gyroZRate * deltaTimeSec;
        if (trajectoryBearing !== null && !isNaN(trajectoryBearing)) {
          targetHeading = OrientationService.smoothHeading(
            integratedHeading,
            trajectoryBearing,
            0.15
          );
        } else {
          targetHeading = OrientationService.normalizeAngle(integratedHeading);
        }
      } else if (trajectoryBearing !== null && !isNaN(trajectoryBearing)) {
        targetHeading = trajectoryBearing;
      } else if (magnetometerHeading !== null && !isNaN(magnetometerHeading)) {
        targetHeading = magnetometerHeading;
      }
    }

    // Apply shortest-path 10 Hz angular filter
    return OrientationService.smoothHeading(previousHeading, targetHeading, 0.2);
  },

  /**
   * Subscribe to native browser deviceorientation events to ingest compass heading
   */
  subscribeOrientationEvents(
    onHeading: (heading: number) => void
  ): () => void {
    if (typeof window === 'undefined') return () => {};

    const handleOrientation = (event: DeviceOrientationEvent) => {
      let compassHeading: number | null = null;

      // iOS WebKit compass heading
      const webkitEvent = event as unknown as { webkitCompassHeading?: number };
      if (
        webkitEvent.webkitCompassHeading !== undefined &&
        webkitEvent.webkitCompassHeading !== null &&
        !isNaN(webkitEvent.webkitCompassHeading)
      ) {
        compassHeading = webkitEvent.webkitCompassHeading;
      } else if (event.alpha !== null && event.alpha !== undefined && !isNaN(event.alpha)) {
        // Android / standard orientation (alpha = 0..360, 360 - alpha for true compass orientation)
        compassHeading = (360 - event.alpha) % 360;
      }

      if (compassHeading !== null) {
        onHeading(OrientationService.normalizeAngle(compassHeading));
      }
    };

    window.addEventListener('deviceorientationabsolute', handleOrientation as EventListener, true);
    window.addEventListener('deviceorientation', handleOrientation as EventListener, true);

    return () => {
      window.removeEventListener('deviceorientationabsolute', handleOrientation as EventListener, true);
      window.removeEventListener('deviceorientation', handleOrientation as EventListener, true);
    };
  },
};
