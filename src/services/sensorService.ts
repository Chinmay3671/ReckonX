export interface RawMotionSample {
  ax: number;
  ay: number;
  az: number;
  accelMag: number;
  gx: number;
  gy: number;
  gz: number;
  gyroMag: number;
  intervalMs: number;
  timestamp: number;
}

export interface RawOrientationSample {
  alpha: number | null; // Yaw (0-360)
  beta: number | null;  // Pitch (-180 to 180)
  gamma: number | null; // Roll (-90 to 90)
  headingDeg: number | null;
  timestamp: number;
}

export interface RawMagnetometerSample {
  x: number;
  y: number;
  z: number;
  timestamp: number;
}

export const SensorService = {
  /**
   * Check if current browser execution environment is a Secure Context (HTTPS or localhost)
   */
  isSecureContext(): boolean {
    return (
      typeof window !== 'undefined' &&
      (window.isSecureContext ||
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        window.location.hostname.endsWith('.internal'))
    );
  },

  /**
   * Check if DeviceMotionEvent API is supported in this browser
   */
  hasMotionSupport(): boolean {
    return typeof window !== 'undefined' && 'DeviceMotionEvent' in window;
  },

  /**
   * Check if DeviceOrientationEvent API is supported in this browser
   */
  hasOrientationSupport(): boolean {
    return typeof window !== 'undefined' && 'DeviceOrientationEvent' in window;
  },

  /**
   * Check if Generic Sensor Magnetometer API is supported
   */
  hasMagnetometerSupport(): boolean {
    return typeof window !== 'undefined' && 'Magnetometer' in window;
  },

  /**
   * Request iOS/WebKit DeviceMotion permission (must be triggered from user gesture)
   */
  async requestMotionPermission(): Promise<boolean> {
    if (!SensorService.hasMotionSupport()) return false;

    const DeviceMotionEventiOS = DeviceMotionEvent as unknown as {
      requestPermission?: () => Promise<'granted' | 'denied' | 'default'>;
    };

    if (typeof DeviceMotionEventiOS.requestPermission === 'function') {
      try {
        const response = await DeviceMotionEventiOS.requestPermission();
        return response === 'granted';
      } catch (err) {
        console.warn('iOS DeviceMotion permission request:', err);
        return false;
      }
    }
    return true; // Modern Chrome/Android/Desktop which grant permission implicitly
  },

  /**
   * Request iOS/WebKit DeviceOrientation permission (must be triggered from user gesture)
   */
  async requestOrientationPermission(): Promise<boolean> {
    if (!SensorService.hasOrientationSupport()) return false;

    const DeviceOrientationEventiOS = DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<'granted' | 'denied' | 'default'>;
    };

    if (typeof DeviceOrientationEventiOS.requestPermission === 'function') {
      try {
        const response = await DeviceOrientationEventiOS.requestPermission();
        return response === 'granted';
      } catch (err) {
        console.warn('iOS DeviceOrientation permission request:', err);
        return false;
      }
    }
    return true;
  },

  /**
   * Subscribe to real hardware devicemotion stream (3-axis Accel + 3-axis Gyro)
   * Strictly reads real hardware measurements and computes physical magnitudes.
   */
  subscribeMotion(onData: (data: RawMotionSample) => void): () => void {
    if (!SensorService.hasMotionSupport()) return () => {};

    const handler = (event: DeviceMotionEvent) => {
      // 1. Accelerometer: Prefer linear acceleration, fallback to acceleration with gravity
      const accel = event.acceleration || event.accelerationIncludingGravity;
      const ax = accel?.x != null ? accel.x : 0;
      const ay = accel?.y != null ? accel.y : 0;
      const az = accel?.z != null ? accel.z : 0;
      const accelMag = Math.sqrt(ax * ax + ay * ay + az * az);

      // 2. Gyroscope: rotationRate around x (beta), y (gamma), z (alpha)
      const rot = event.rotationRate;
      const gx = rot?.beta != null ? rot.beta : 0;   // deg/s around X
      const gy = rot?.gamma != null ? rot.gamma : 0;  // deg/s around Y
      const gz = rot?.alpha != null ? rot.alpha : 0;  // deg/s around Z
      const gyroMag = Math.sqrt(gx * gx + gy * gy + gz * gz);

      const intervalMs = event.interval || 16;
      const timestamp = Date.now();

      onData({
        ax: Math.round(ax * 1000) / 1000,
        ay: Math.round(ay * 1000) / 1000,
        az: Math.round(az * 1000) / 1000,
        accelMag: Math.round(accelMag * 1000) / 1000,
        gx: Math.round(gx * 1000) / 1000,
        gy: Math.round(gy * 1000) / 1000,
        gz: Math.round(gz * 1000) / 1000,
        gyroMag: Math.round(gyroMag * 1000) / 1000,
        intervalMs,
        timestamp,
      });
    };

    window.addEventListener('devicemotion', handler, true);
    return () => {
      window.removeEventListener('devicemotion', handler, true);
    };
  },

  /**
   * Subscribe to real hardware deviceorientation stream
   */
  subscribeOrientation(onData: (data: RawOrientationSample) => void): () => void {
    if (!SensorService.hasOrientationSupport()) return () => {};

    const handler = (event: DeviceOrientationEvent) => {
      let heading: number | null = null;

      const webkitEvent = event as unknown as { webkitCompassHeading?: number };
      if (
        webkitEvent.webkitCompassHeading !== undefined &&
        webkitEvent.webkitCompassHeading !== null &&
        !isNaN(webkitEvent.webkitCompassHeading)
      ) {
        heading = webkitEvent.webkitCompassHeading;
      } else if (event.alpha !== null && event.alpha !== undefined && !isNaN(event.alpha)) {
        // Standard alpha: 0 to 360 -> heading = (360 - alpha) % 360
        heading = (360 - event.alpha) % 360;
      }

      onData({
        alpha: event.alpha != null ? Math.round(event.alpha * 10) / 10 : null,
        beta: event.beta != null ? Math.round(event.beta * 10) / 10 : null,
        gamma: event.gamma != null ? Math.round(event.gamma * 10) / 10 : null,
        headingDeg: heading != null ? Math.round(heading * 10) / 10 : null,
        timestamp: Date.now(),
      });
    };

    window.addEventListener('deviceorientationabsolute', handler as EventListener, true);
    window.addEventListener('deviceorientation', handler as EventListener, true);

    return () => {
      window.removeEventListener('deviceorientationabsolute', handler as EventListener, true);
      window.removeEventListener('deviceorientation', handler as EventListener, true);
    };
  },

  /**
   * Subscribe to real Generic Sensor Magnetometer if supported in Chromium/Android
   */
  subscribeMagnetometer(onData: (data: RawMagnetometerSample) => void): () => void {
    if (!SensorService.hasMagnetometerSupport()) return () => {};

    try {
      const MagnetometerClass = (window as any).Magnetometer;
      const mag = new MagnetometerClass({ frequency: 50 });

      mag.addEventListener('reading', () => {
        onData({
          x: Math.round((mag.x || 0) * 10) / 10,
          y: Math.round((mag.y || 0) * 10) / 10,
          z: Math.round((mag.z || 0) * 10) / 10,
          timestamp: Date.now(),
        });
      });

      mag.addEventListener('error', (err: any) => {
        console.warn('Magnetometer sensor error:', err);
      });

      mag.start();

      return () => {
        try {
          mag.stop();
        } catch {
          // Ignore stop errors
        }
      };
    } catch (e) {
      console.warn('Generic Magnetometer not available:', e);
      return () => {};
    }
  },
};
