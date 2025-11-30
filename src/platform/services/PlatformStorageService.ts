/**
 * Platform Storage Service
 * Service layer for PlatformStorage operations
 */

import { PlatformStorage, StorageTier, StorageOptions, StorageStats } from '../../storage/core/PlatformStorage';

export interface StorageServiceConfig {
  defaultTier: StorageTier;
  enableCaching: boolean;
  cacheTimeout: number; // milliseconds
}

export class PlatformStorageService {
  private storage: PlatformStorage;
  private config: StorageServiceConfig;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();

  constructor(config: Partial<StorageServiceConfig> = {}) {
    this.config = {
      defaultTier: 'cold',
      enableCaching: true,
      cacheTimeout: 5 * 60 * 1000, // 5 minutes
      ...config
    };

    this.storage = new PlatformStorage();
  }

  /**
   * Initialize the storage service
   */
  async initialize(): Promise<void> {
    await this.storage.initialize();
    console.log('✅ PlatformStorageService initialized');
  }

  /**
   * Store data with optional tier specification
   */
  async set(key: string, data: any, tier?: StorageTier): Promise<void> {
    const targetTier = tier || this.config.defaultTier;

    // Update cache if enabled
    if (this.config.enableCaching) {
      this.cache.set(`${targetTier}:${key}`, {
        data,
        timestamp: Date.now()
      });
    }

    await this.storage.save(key, data, targetTier);
  }

  /**
   * Retrieve data with caching
   */
  async get(key: string, tier?: StorageTier): Promise<any> {
    const targetTier = tier || this.config.defaultTier;
    const cacheKey = `${targetTier}:${key}`;

    // Check cache first
    if (this.config.enableCaching) {
      const cached = this.cache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp) < this.config.cacheTimeout) {
        return cached.data;
      }
    }

    // Load from storage
    const data = await this.storage.load(key, targetTier);

    // Update cache
    if (this.config.enableCaching && data !== null) {
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });
    }

    return data;
  }

  /**
   * Delete data
   */
  async delete(key: string, tier?: StorageTier): Promise<void> {
    const targetTier = tier || this.config.defaultTier;

    // Clear from cache
    if (this.config.enableCaching) {
      this.cache.delete(`${targetTier}:${key}`);
    }

    await this.storage.delete(key, targetTier);
  }

  /**
   * Check if key exists
   */
  async exists(key: string, tier?: StorageTier): Promise<boolean> {
    const targetTier = tier || this.config.defaultTier;
    return await this.storage.exists(key, targetTier);
  }

  /**
   * List all keys in a tier
   */
  async listKeys(tier?: StorageTier): Promise<string[]> {
    const targetTier = tier || this.config.defaultTier;
    return await this.storage.listKeys(targetTier);
  }

  /**
   * Clear all data in a tier
   */
  async clearTier(tier?: StorageTier): Promise<void> {
    const targetTier = tier || this.config.defaultTier;

    // Clear cache for this tier
    if (this.config.enableCaching) {
      for (const [key] of this.cache) {
        if (key.startsWith(`${targetTier}:`)) {
          this.cache.delete(key);
        }
      }
    }

    await this.storage.clearTier(targetTier);
  }

  /**
   * Get storage statistics
   */
  async getStats(tier?: StorageTier): Promise<StorageStats> {
    const targetTier = tier || this.config.defaultTier;
    return await this.storage.getStats(targetTier);
  }

  /**
   * Move data between tiers
   */
  async move(key: string, fromTier: StorageTier, toTier: StorageTier): Promise<void> {
    await this.storage.move(key, fromTier, toTier);

    // Update cache
    if (this.config.enableCaching) {
      const cacheKey = `${fromTier}:${key}`;
      const cached = this.cache.get(cacheKey);
      if (cached) {
        this.cache.delete(cacheKey);
        this.cache.set(`${toTier}:${key}`, cached);
      }
    }
  }

  /**
   * Clear expired cache entries
   */
  clearExpiredCache(): void {
    const now = Date.now();
    for (const [key, value] of this.cache) {
      if ((now - value.timestamp) >= this.config.cacheTimeout) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  /**
   * Update service configuration
   */
  updateConfig(config: Partial<StorageServiceConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): StorageServiceConfig {
    return { ...this.config };
  }
}

// Singleton instance
let globalStorageService: PlatformStorageService | null = null;

export function getGlobalStorageService(): PlatformStorageService {
  if (!globalStorageService) {
    globalStorageService = new PlatformStorageService();
  }
  return globalStorageService;
}

export async function initializeGlobalStorageService(config?: Partial<StorageServiceConfig>): Promise<PlatformStorageService> {
  globalStorageService = new PlatformStorageService(config);
  await globalStorageService.initialize();
  return globalStorageService;
}