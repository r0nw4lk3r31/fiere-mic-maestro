/**
 * Open Mic Data Service
 * Manages application data using PlatformStorageService
 */

import { PlatformStorageService } from '../platform/services/PlatformStorageService';

export interface Artist {
  id: string;
  name: string;
  song_description: string | null;
  preferred_time: string | null;
  performance_order: number | null;
  status: string;
  created_at: string;
}

export class OpenMicDataService {
  private storage: PlatformStorageService;
  private readonly artistsKey = 'artists';
  private readonly adminAuthKey = 'admin_authenticated';

  constructor(storage: PlatformStorageService) {
    this.storage = storage;
  }

  /**
   * Initialize the data service
   */
  async initialize(): Promise<void> {
    // Ensure storage is initialized
    await this.storage.initialize();
  }

  // Artist Management

  /**
   * Get all artists
   */
  async getArtists(): Promise<Artist[]> {
    const artists = await this.storage.get(this.artistsKey, 'cold');
    if (!artists) return [];

    // Sort by performance order
    return artists.sort((a: Artist, b: Artist) =>
      (a.performance_order || 0) - (b.performance_order || 0)
    );
  }

  /**
   * Add a new artist
   */
  async addArtist(artistData: Omit<Artist, 'id' | 'performance_order' | 'created_at'>): Promise<Artist> {
    const existingArtists = await this.getArtists();

    const newArtist: Artist = {
      ...artistData,
      id: Date.now().toString(),
      performance_order: existingArtists.length,
      created_at: new Date().toISOString()
    };

    const updatedArtists = [...existingArtists, newArtist];
    await this.storage.set(this.artistsKey, updatedArtists, 'cold');

    return newArtist;
  }

  /**
   * Update an artist
   */
  async updateArtist(id: string, updates: Partial<Artist>): Promise<void> {
    const artists = await this.getArtists();
    const updatedArtists = artists.map(artist =>
      artist.id === id ? { ...artist, ...updates } : artist
    );

    await this.storage.set(this.artistsKey, updatedArtists, 'cold');
  }

  /**
   * Delete an artist
   */
  async deleteArtist(id: string): Promise<void> {
    const artists = await this.getArtists();
    const filteredArtists = artists.filter(artist => artist.id !== id);

    // Reorder remaining artists
    const reorderedArtists = filteredArtists.map((artist, index) => ({
      ...artist,
      performance_order: index
    }));

    await this.storage.set(this.artistsKey, reorderedArtists, 'cold');
  }

  /**
   * Reorder artists
   */
  async reorderArtists(artistIds: string[]): Promise<void> {
    const artists = await this.getArtists();
    const reorderedArtists = artistIds.map((id, index) => {
      const artist = artists.find(a => a.id === id);
      if (!artist) throw new Error(`Artist ${id} not found`);
      return { ...artist, performance_order: index };
    });

    await this.storage.set(this.artistsKey, reorderedArtists, 'cold');
  }

  // Admin Authentication

  /**
   * Check admin authentication
   */
  async isAdminAuthenticated(): Promise<boolean> {
    const auth = await this.storage.get(this.adminAuthKey, 'hot'); // Use hot tier for session
    return auth === true;
  }

  /**
   * Authenticate admin
   */
  async authenticateAdmin(email: string, password: string): Promise<boolean> {
    // Simple hardcoded check (same as before)
    if (email === "admin@fieremargriet.com" && password === "admin123") {
      await this.storage.set(this.adminAuthKey, true, 'hot');
      return true;
    }
    return false;
  }

  /**
   * Logout admin
   */
  async logoutAdmin(): Promise<void> {
    await this.storage.delete(this.adminAuthKey, 'hot');
  }

  // Utility methods

  /**
   * Clear all data
   */
  async clearAllData(): Promise<void> {
    await this.storage.clearTier('cold');
    await this.storage.clearTier('hot');
  }

  /**
   * Get storage statistics
   */
  async getStorageStats() {
    const coldStats = await this.storage.getStats('cold');
    const hotStats = await this.storage.getStats('hot');

    return {
      cold: coldStats,
      hot: hotStats,
      cache: this.storage.getCacheStats()
    };
  }

  /**
   * Export all data
   */
  async exportData(): Promise<{ artists: Artist[]; adminAuthenticated: boolean }> {
    const artists = await this.getArtists();
    const adminAuthenticated = await this.isAdminAuthenticated();

    return {
      artists,
      adminAuthenticated
    };
  }

  /**
   * Import data
   */
  async importData(data: { artists: Artist[]; adminAuthenticated?: boolean }): Promise<void> {
    await this.storage.set(this.artistsKey, data.artists, 'cold');

    if (data.adminAuthenticated) {
      await this.storage.set(this.adminAuthKey, true, 'hot');
    }
  }
}

// Singleton instance
let globalDataService: OpenMicDataService | null = null;

export function getGlobalDataService(): OpenMicDataService {
  if (!globalDataService) {
    const storageService = new PlatformStorageService();
    globalDataService = new OpenMicDataService(storageService);
  }
  return globalDataService;
}

export async function initializeGlobalDataService(): Promise<OpenMicDataService> {
  const storageService = new PlatformStorageService();
  await storageService.initialize();

  globalDataService = new OpenMicDataService(storageService);
  await globalDataService.initialize();

  return globalDataService;
}