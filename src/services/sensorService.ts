export interface MotionData {
  ax: number;
  ay: number;
  az: number;
  interval: number;
}

export interface OrientationData {
  alpha: number | null; // Yaw (0-360)
  beta: number | null;  // Pitch (-180 to 180)
  gamma: number | null; // Roll (-90 to 90)
}

export const SensorService = {
  /**
   * Check if current browser execution environment is a Secure Context (HTTPS or localhost)
   */
  isSecureContext(): boolean {
    return typeof window !== 'undefined' && (window.isSecureContext || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
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
        console.warn('iOS DeviceMotion permission error:', err);
        return false;
      }
    }
    return true; // Non-iOS browsers do not require explicit permission call
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
        console.warn('iOS DeviceOrientation permission error:', err);
        return false;
      }
    }
    return true;
  },

  /**
   * Subscribe to real devicemotion event stream
   */
  subscribeMotion(onData: (data: MotionData) => void): () => void {
    if (!SensorService.hasMotionSupport()) return () => {};

    const handler = (event: DeviceMotionEvent) => {
      const accel = event.accelerationIncludingGravity || event.acceleration;
      if (accel) {
        onData({
          ax: Math.round((accel.x || 0) * 100) / 100,
          ay: Math.round((accel.y || 0) * 100) / 100,
          az: Math.round((accel.z || 9.8) * 100) / 100,
          interval: event.interval || 16,
        });
      }
    };

    window.addEventListener('devicemotion', handler, true);
    return () => window.removeEventListener('devicemotion', handler, true);
  },

  /**
   * Subscribe to real deviceorientation event stream
   */
  subscribeOrientation(onData: (data: OrientationData) => void): () => void {
    if (!SensorService.hasOrientationSupport()) return () => {};

    const handler = (event: DeviceOrientationEvent) => {
      onData({
        alpha: event.alpha != null ? Math.round(event.alpha) : null,
        beta: event.beta != null ? Math.round(event.beta) : null,
        gamma: event.gamma != null ? Math.round(event.gamma) : null,
      });
    };

    window.addEventListener('deviceorientation', handler, true);
    return () => window.removeEventListener('deviceorientation', handler, true);
  },
};
