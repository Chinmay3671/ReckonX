const DB_NAME = 'IDR_Tile_Cache_DB';
const DB_VERSION = 1;
const STORE_NAME = 'tiles';

let dbInstance: IDBDatabase | null = null;

async function getDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;
  if (typeof window === 'undefined' || !window.indexedDB) {
    throw new Error('IndexedDB is not supported in this browser environment.');
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'url' });
      }
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onerror = () => {
      reject(new Error('Failed to open IndexedDB tile cache store.'));
    };
  });
}

/**
 * Generate a clean 256x256 SVG Canvas Data URL placeholder tile for offline tile cache misses.
 */
function createPlaceholderTileDataUrl(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
    <rect width="256" height="256" fill="#F8FAFC"/>
    <path d="M0 64h256M0 128h256M0 192h256M64 0v256M128 0v256M192 0v256" stroke="#E2E8F0" stroke-width="1"/>
    <rect x="68" y="108" width="120" height="40" rx="6" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1"/>
    <text x="128" y="128" font-family="sans-serif" font-size="10" font-weight="bold" fill="#64748B" text-anchor="middle" dominant-baseline="central">OFFLINE TILE MISS</text>
  </svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export const TileCacheService = {
  /**
   * Save a map tile (data URL / base64) to IndexedDB tile cache
   */
  async saveTile(url: string, dataUrl: string): Promise<void> {
    try {
      const db = await getDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put({ url, dataUrl, timestamp: Date.now() });
    } catch (err) {
      console.warn('TileCacheService.saveTile error:', err);
    }
  },

  /**
   * Fetch a map tile (data URL) from IndexedDB tile cache.
   * If missing and network is offline, returns clean SVG placeholder URL instead of null/error.
   */
  async getTile(url: string): Promise<string | null> {
    try {
      const db = await getDB();
      const cached = await new Promise<string | null>((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.get(url);

        request.onsuccess = () => {
          if (request.result && request.result.dataUrl) {
            resolve(request.result.dataUrl);
          } else {
            resolve(null);
          }
        };

        request.onerror = () => resolve(null);
      });

      if (cached) return cached;

      // If offline and cache missed, serve clean SVG placeholder tile
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      if (!isOnline) {
        return createPlaceholderTileDataUrl();
      }

      return null;
    } catch {
      return null;
    }
  },

  /**
   * Get total cached tiles count
   */
  async getCacheCount(): Promise<number> {
    try {
      const db = await getDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.count();

        request.onsuccess = () => resolve(request.result || 0);
        request.onerror = () => resolve(0);
      });
    } catch {
      return 0;
    }
  },

  /**
   * Clear all cached tiles from IndexedDB
   */
  async clearCache(): Promise<void> {
    try {
      const db = await getDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.clear();
    } catch (err) {
      console.warn('TileCacheService.clearCache error:', err);
    }
  },

  /**
   * Get SVG placeholder data URL directly
   */
  getPlaceholderTile(): string {
    return createPlaceholderTileDataUrl();
  },
};
