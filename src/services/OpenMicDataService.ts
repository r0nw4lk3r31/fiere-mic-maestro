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

export interface Album {
  id: string;
  name: string;
  date: string; // ISO date string
  description: string | null;
  created_at: string;
  photos: Photo[];
}

export interface Photo {
  id: string;
  filename: string;
  data: string; // base64 encoded image
  caption: string | null;
  uploaded_at: string;
  album_id: string;
  order: number;
}

export interface PendingPhoto {
  id: string;
  filename: string;
  data: string; // base64 encoded image
  caption: string | null;
  uploaded_at: string;
  uploader_name: string | null;
  uploader_email: string | null;
  status: 'pending' | 'approved' | 'rejected';
}

export class OpenMicDataService {
  private storage: PlatformStorageService;
  private readonly artistsKey = 'artists';
  private readonly adminAuthKey = 'admin_authenticated';
  private readonly albumsKey = 'albums';
  private readonly photosKey = 'photos';
  private readonly pendingPhotosKey = 'pending_photos';

  constructor(storage: PlatformStorageService) {
    this.storage = storage;
  }

  /**
   * Initialize the data service
   */
  async initialize(): Promise<void> {
    // Ensure storage is initialized
    await this.storage.initialize();
    
    // Seed sample data if no artists exist (for demo purposes)
    await this.seedSampleData();
  }

  /**
   * Seed sample data for demonstration
   */
  private async seedSampleData(): Promise<void> {
    const existingArtists = await this.getArtists();
    const existingAlbums = await this.getAlbums();
    const existingPhotos = await this.getPhotos();
    
    console.log('📊 Current data status:', {
      artists: existingArtists.length,
      albums: existingAlbums.length, 
      photos: existingPhotos.length
    });
    
    // Only seed if there's literally no data at all
    if (existingArtists.length === 0 && existingAlbums.length === 0 && existingPhotos.length === 0) {
      console.log('🌱 Seeding sample data for demonstration...');

      // Sample artists
      const sampleArtists = [
        {
          id: '1',
          name: 'Sarah Johnson',
          song_description: 'Original folk song about city lights',
          preferred_time: '8:00 PM',
          performance_order: 0,
          status: 'confirmed',
          created_at: new Date().toISOString()
        },
        {
          id: '2', 
          name: 'Mike Chen',
          song_description: 'Acoustic cover of indie rock hits',
          preferred_time: '8:15 PM',
          performance_order: 1,
          status: 'confirmed',
          created_at: new Date().toISOString()
        },
        {
          id: '3',
          name: 'Elena Rodriguez',
          song_description: 'Jazz standards with modern twist',
          preferred_time: '8:30 PM', 
          performance_order: 2,
          status: 'confirmed',
          created_at: new Date().toISOString()
        }
      ];

      // Sample album
      const sampleAlbum = {
        id: 'album-1',
        name: 'Open Mic Night - November 2025',
        date: '2025-11-30',
        description: 'Memorable performances from our monthly open mic night',
        created_at: new Date().toISOString(),
        photos: []
      };

      // Sample photos (small base64 encoded images for demo)
      const samplePhotos = [
        {
          id: 'photo-1',
          filename: 'performance-1.jpg',
          data: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R+IRjWjBqO6O2mhP//Z',
          caption: 'Sarah performing her original folk song',
          uploaded_at: new Date().toISOString(),
          album_id: 'album-1',
          order: 0
        },
        {
          id: 'photo-2',
          filename: 'performance-2.jpg', 
          data: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R+IRjWjBqO6O2mhP//Z',
          caption: 'Mike rocking the acoustic set',
          uploaded_at: new Date().toISOString(),
          album_id: 'album-1',
          order: 1
        }
      ];

      // Save sample data
      await this.storage.set(this.artistsKey, sampleArtists, 'cold');
      await this.storage.set(this.albumsKey, [sampleAlbum], 'cold');
      await this.storage.set(this.photosKey, samplePhotos, 'archive');

      console.log('✅ Sample data seeded successfully!');
    } else {
      console.log('📋 Using existing data - no seeding needed');
      if (existingArtists.length > 0) {
        console.log('👥 Existing artists:', existingArtists.map(a => `${a.name} (${a.song_description})`));
      }
      if (existingAlbums.length > 0) {
        console.log('📸 Existing albums:', existingAlbums.map(a => `${a.name} (${a.photos?.length || 0} photos)`));
      }
    }
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

  // Album Management

  /**
   * Get all albums
   */
  async getAlbums(): Promise<Album[]> {
    const albums = await this.storage.get(this.albumsKey, 'cold');
    if (!albums) return [];

    // Sort by date (newest first)
    return albums.sort((a: Album, b: Album) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }

  /**
   * Get a specific album with photos
   */
  async getAlbum(id: string): Promise<Album | null> {
    const albums = await this.getAlbums();
    const album = albums.find(a => a.id === id);
    if (!album) return null;

    // Load photos for this album
    const allPhotos = await this.getPhotos();
    album.photos = allPhotos.filter(p => p.album_id === id)
      .sort((a, b) => a.order - b.order);

    return album;
  }

  /**
   * Create a new album
   */
  async createAlbum(albumData: Omit<Album, 'id' | 'created_at' | 'photos'>): Promise<Album> {
    const existingAlbums = await this.getAlbums();

    const newAlbum: Album = {
      ...albumData,
      id: Date.now().toString(),
      created_at: new Date().toISOString(),
      photos: []
    };

    const updatedAlbums = [...existingAlbums, newAlbum];
    await this.storage.set(this.albumsKey, updatedAlbums, 'cold');

    return newAlbum;
  }

  /**
   * Update an album
   */
  async updateAlbum(id: string, updates: Partial<Omit<Album, 'id' | 'created_at' | 'photos'>>): Promise<void> {
    const albums = await this.getAlbums();
    const updatedAlbums = albums.map(album =>
      album.id === id ? { ...album, ...updates } : album
    );

    await this.storage.set(this.albumsKey, updatedAlbums, 'cold');
  }

  /**
   * Delete an album and all its photos
   */
  async deleteAlbum(id: string): Promise<void> {
    // Delete all photos in the album
    const photos = await this.getPhotos();
    const photosToDelete = photos.filter(p => p.album_id === id);
    for (const photo of photosToDelete) {
      await this.deletePhoto(photo.id);
    }

    // Delete the album
    const albums = await this.getAlbums();
    const filteredAlbums = albums.filter(album => album.id !== id);
    await this.storage.set(this.albumsKey, filteredAlbums, 'cold');
  }

  // Photo Management

  /**
   * Get all photos
   */
  async getPhotos(): Promise<Photo[]> {
    const photos = await this.storage.get(this.photosKey, 'archive'); // Use archive for larger data
    if (!photos) return [];

    return photos.sort((a: Photo, b: Photo) => a.order - b.order);
  }

  /**
   * Upload a new photo
   */
  async uploadPhoto(photoData: Omit<Photo, 'id' | 'uploaded_at' | 'order'>): Promise<Photo> {
    const existingPhotos = await this.getPhotos();
    const albumPhotos = existingPhotos.filter(p => p.album_id === photoData.album_id);

    const newPhoto: Photo = {
      ...photoData,
      id: Date.now().toString(),
      uploaded_at: new Date().toISOString(),
      order: albumPhotos.length
    };

    const updatedPhotos = [...existingPhotos, newPhoto];
    await this.storage.set(this.photosKey, updatedPhotos, 'archive');

    return newPhoto;
  }

  /**
   * Update a photo
   */
  async updatePhoto(id: string, updates: Partial<Omit<Photo, 'id' | 'uploaded_at'>>): Promise<void> {
    const photos = await this.getPhotos();
    const updatedPhotos = photos.map(photo =>
      photo.id === id ? { ...photo, ...updates } : photo
    );

    await this.storage.set(this.photosKey, updatedPhotos, 'archive');
  }

  /**
   * Delete a photo
   */
  async deletePhoto(id: string): Promise<void> {
    const photos = await this.getPhotos();
    const filteredPhotos = photos.filter(photo => photo.id !== id);

    // Reorder remaining photos in the same album
    const photoToDelete = photos.find(p => p.id === id);
    if (photoToDelete) {
      const albumPhotos = filteredPhotos.filter(p => p.album_id === photoToDelete.album_id);
      const reorderedPhotos = albumPhotos.map((photo, index) => ({
        ...photo,
        order: index
      }));

      // Update the filtered photos with reordered ones
      const otherPhotos = filteredPhotos.filter(p => p.album_id !== photoToDelete.album_id);
      const finalPhotos = [...otherPhotos, ...reorderedPhotos];

      await this.storage.set(this.photosKey, finalPhotos, 'archive');
    } else {
      await this.storage.set(this.photosKey, filteredPhotos, 'archive');
    }
  }

  /**
   * Reorder photos in an album
   */
  async reorderPhotos(albumId: string, photoIds: string[]): Promise<void> {
    const photos = await this.getPhotos();
    const updatedPhotos = photos.map(photo => {
      if (photo.album_id === albumId) {
        const newOrder = photoIds.indexOf(photo.id);
        if (newOrder !== -1) {
          return { ...photo, order: newOrder };
        }
      }
      return photo;
    });

    await this.storage.set(this.photosKey, updatedPhotos, 'archive');
  }

  // Pending Photo Management

  /**
   * Get all pending photos
   */
  async getPendingPhotos(): Promise<PendingPhoto[]> {
    const pendingPhotos = await this.storage.get(this.pendingPhotosKey, 'archive');
    if (!pendingPhotos) return [];

    return pendingPhotos.sort((a: PendingPhoto, b: PendingPhoto) =>
      new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime()
    );
  }

  /**
   * Submit a pending photo for review
   */
  async submitPendingPhoto(photoData: Omit<PendingPhoto, 'id' | 'uploaded_at' | 'status'>): Promise<PendingPhoto> {
    const existingPendingPhotos = await this.getPendingPhotos();

    const newPendingPhoto: PendingPhoto = {
      ...photoData,
      id: Date.now().toString(),
      uploaded_at: new Date().toISOString(),
      status: 'pending'
    };

    const updatedPendingPhotos = [...existingPendingPhotos, newPendingPhoto];
    await this.storage.set(this.pendingPhotosKey, updatedPendingPhotos, 'archive');

    return newPendingPhoto;
  }

  /**
   * Approve a pending photo and add it to an album
   */
  async approvePendingPhoto(pendingPhotoId: string, albumId: string, caption?: string): Promise<Photo> {
    const pendingPhotos = await this.getPendingPhotos();
    const pendingPhoto = pendingPhotos.find(p => p.id === pendingPhotoId);

    if (!pendingPhoto) {
      throw new Error('Pending photo not found');
    }

    // Create the approved photo
    const photoData = {
      filename: pendingPhoto.filename,
      data: pendingPhoto.data,
      caption: caption || pendingPhoto.caption,
      album_id: albumId
    };

    const approvedPhoto = await this.uploadPhoto(photoData);

    // Update pending photo status
    await this.updatePendingPhoto(pendingPhotoId, { status: 'approved' });

    return approvedPhoto;
  }

  /**
   * Reject a pending photo
   */
  async rejectPendingPhoto(pendingPhotoId: string): Promise<void> {
    await this.updatePendingPhoto(pendingPhotoId, { status: 'rejected' });
  }

  /**
   * Update a pending photo
   */
  async updatePendingPhoto(id: string, updates: Partial<Omit<PendingPhoto, 'id' | 'uploaded_at'>>): Promise<void> {
    const pendingPhotos = await this.getPendingPhotos();
    const updatedPendingPhotos = pendingPhotos.map(pendingPhoto =>
      pendingPhoto.id === id ? { ...pendingPhoto, ...updates } : pendingPhoto
    );

    await this.storage.set(this.pendingPhotosKey, updatedPendingPhotos, 'archive');
  }

  /**
   * Delete a pending photo
   */
  async deletePendingPhoto(id: string): Promise<void> {
    const pendingPhotos = await this.getPendingPhotos();
    const filteredPendingPhotos = pendingPhotos.filter(pendingPhoto => pendingPhoto.id !== id);

    await this.storage.set(this.pendingPhotosKey, filteredPendingPhotos, 'archive');
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
  async exportData(): Promise<{ artists: Artist[]; albums: Album[]; photos: Photo[]; pendingPhotos: PendingPhoto[]; adminAuthenticated: boolean }> {
    const artists = await this.getArtists();
    const albums = await this.getAlbums();
    const photos = await this.getPhotos();
    const pendingPhotos = await this.getPendingPhotos();
    const adminAuthenticated = await this.isAdminAuthenticated();

    return {
      artists,
      albums,
      photos,
      pendingPhotos,
      adminAuthenticated
    };
  }

  /**
   * Import data
   */
  async importData(data: { artists: Artist[]; albums?: Album[]; photos?: Photo[]; pendingPhotos?: PendingPhoto[]; adminAuthenticated?: boolean }): Promise<void> {
    await this.storage.set(this.artistsKey, data.artists, 'cold');

    if (data.albums) {
      await this.storage.set(this.albumsKey, data.albums, 'cold');
    }

    if (data.photos) {
      await this.storage.set(this.photosKey, data.photos, 'archive');
    }

    if (data.pendingPhotos) {
      await this.storage.set(this.pendingPhotosKey, data.pendingPhotos, 'archive');
    }

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