/**
 * Browser-Compatible PlatformStorage for Aether 4TSS
 * Multi-tier storage system using browser storage APIs
 *
 * Tiers:
 * - 'hot': sessionStorage (temporary, cleared on tab close)
 * - 'cold': localStorage (persistent across sessions)
 * - 'archive': IndexedDB (for larger data, persistent)
 */

export type StorageTier = 'hot' | 'cold' | 'archive';

export interface StorageOptions {
  enableCompression?: boolean;
  maxItemSize?: number; // in bytes
  enableEncryption?: boolean;
}

export interface StorageStats {
  tier: StorageTier;
  itemCount: number;
  totalSize: number; // in bytes
  lastModified: number;
}

export class PlatformStorage {
  private options: StorageOptions;
  private dbName = 'aether_platform_storage';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;

  constructor(options: StorageOptions = {}) {
    this.options = {
      enableCompression: false,
      maxItemSize: 5 * 1024 * 1024, // 5MB default
      enableEncryption: false,
      ...options
    };
  }

  /**
   * Initialize the storage system
   */
  async initialize(): Promise<void> {
    // Initialize IndexedDB for archive tier
    await this.initIndexedDB();

    console.log('✅ PlatformStorage initialized');
  }

  /**
   * Initialize IndexedDB
   */
  private async initIndexedDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.warn('IndexedDB not available, falling back to localStorage for archive tier');
        resolve();
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('archive')) {
          db.createObjectStore('archive');
        }
      };
    });
  }

  /**
   * Save data to specified tier
   */
  async save(key: string, data: any, tier: StorageTier = 'cold'): Promise<void> {
    const serializedData = JSON.stringify(data);
    const prefixedKey = `${tier}:${key}`;

    try {
      switch (tier) {
        case 'hot':
          sessionStorage.setItem(prefixedKey, serializedData);
          break;

        case 'cold':
          localStorage.setItem(prefixedKey, serializedData);
          break;

        case 'archive':
          await this.saveToIndexedDB(prefixedKey, data);
          break;

        default:
          throw new Error(`Unknown storage tier: ${tier}`);
      }
    } catch (error) {
      console.error(`Failed to save to ${tier} tier:`, error);
      throw error;
    }
  }

  /**
   * Load data from specified tier
   */
  async load(key: string, tier: StorageTier = 'cold'): Promise<any> {
    const prefixedKey = `${tier}:${key}`;

    try {
      switch (tier) {
        case 'hot':
          const hotData = sessionStorage.getItem(prefixedKey);
          return hotData ? JSON.parse(hotData) : null;

        case 'cold':
          const coldData = localStorage.getItem(prefixedKey);
          return coldData ? JSON.parse(coldData) : null;

        case 'archive':
          return await this.loadFromIndexedDB(prefixedKey);

        default:
          throw new Error(`Unknown storage tier: ${tier}`);
      }
    } catch (error) {
      console.error(`Failed to load from ${tier} tier:`, error);
      return null;
    }
  }

  /**
   * Delete data from specified tier
   */
  async delete(key: string, tier: StorageTier = 'cold'): Promise<void> {
    const prefixedKey = `${tier}:${key}`;

    try {
      switch (tier) {
        case 'hot':
          sessionStorage.removeItem(prefixedKey);
          break;

        case 'cold':
          localStorage.removeItem(prefixedKey);
          break;

        case 'archive':
          await this.deleteFromIndexedDB(prefixedKey);
          break;

        default:
          throw new Error(`Unknown storage tier: ${tier}`);
      }
    } catch (error) {
      console.error(`Failed to delete from ${tier} tier:`, error);
      throw error;
    }
  }

  /**
   * List all keys in specified tier
   */
  async listKeys(tier: StorageTier = 'cold'): Promise<string[]> {
    try {
      switch (tier) {
        case 'hot':
          return this.getKeysFromStorage(sessionStorage, `${tier}:`);

        case 'cold':
          return this.getKeysFromStorage(localStorage, `${tier}:`);

        case 'archive':
          return await this.listKeysFromIndexedDB(`${tier}:`);

        default:
          throw new Error(`Unknown storage tier: ${tier}`);
      }
    } catch (error) {
      console.error(`Failed to list keys from ${tier} tier:`, error);
      return [];
    }
  }

  /**
   * Clear all data in specified tier
   */
  async clearTier(tier: StorageTier): Promise<void> {
    try {
      const keys = await this.listKeys(tier);
      await Promise.all(keys.map(key => this.delete(key, tier)));
    } catch (error) {
      console.error(`Failed to clear ${tier} tier:`, error);
      throw error;
    }
  }

  /**
   * Get storage statistics for a tier
   */
  async getStats(tier: StorageTier = 'cold'): Promise<StorageStats> {
    const keys = await this.listKeys(tier);
    let totalSize = 0;

    for (const key of keys) {
      const data = await this.load(key, tier);
      if (data) {
        totalSize += JSON.stringify(data).length;
      }
    }

    return {
      tier,
      itemCount: keys.length,
      totalSize,
      lastModified: Date.now()
    };
  }

  /**
   * Check if data exists in specified tier
   */
  async exists(key: string, tier: StorageTier = 'cold'): Promise<boolean> {
    const data = await this.load(key, tier);
    return data !== null;
  }

  /**
   * Move data between tiers
   */
  async move(key: string, fromTier: StorageTier, toTier: StorageTier): Promise<void> {
    const data = await this.load(key, fromTier);
    if (data === null) {
      throw new Error(`Key ${key} not found in ${fromTier} tier`);
    }

    await this.save(key, data, toTier);
    await this.delete(key, fromTier);
  }

  // Private helper methods

  private getKeysFromStorage(storage: Storage, prefix: string): string[] {
    const keys: string[] = [];
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key && key.startsWith(prefix)) {
        keys.push(key.substring(prefix.length));
      }
    }
    return keys;
  }

  private async saveToIndexedDB(key: string, data: any): Promise<void> {
    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['archive'], 'readwrite');
      const store = transaction.objectStore('archive');
      const request = store.put(data, key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async loadFromIndexedDB(key: string): Promise<any> {
    if (!this.db) {
      return null;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['archive'], 'readonly');
      const store = transaction.objectStore('archive');
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  private async deleteFromIndexedDB(key: string): Promise<void> {
    if (!this.db) {
      return;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['archive'], 'readwrite');
      const store = transaction.objectStore('archive');
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async listKeysFromIndexedDB(prefix: string): Promise<string[]> {
    if (!this.db) {
      return [];
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['archive'], 'readonly');
      const store = transaction.objectStore('archive');
      const request = store.getAllKeys();

      request.onsuccess = () => {
        const keys = (request.result as string[])
          .filter(key => key.startsWith(prefix))
          .map(key => key.substring(prefix.length));
        resolve(keys);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Close storage connections
   */
  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

// Singleton instance for global access
let globalStorage: PlatformStorage | null = null;

export function getGlobalStorage(): PlatformStorage {
  if (!globalStorage) {
    globalStorage = new PlatformStorage();
  }
  return globalStorage;
}

export async function initializeGlobalStorage(options?: StorageOptions): Promise<PlatformStorage> {
  globalStorage = new PlatformStorage(options);
  await globalStorage.initialize();
  return globalStorage;
}