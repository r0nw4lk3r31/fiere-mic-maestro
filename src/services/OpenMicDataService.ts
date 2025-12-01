/**
 * Open Mic Data Service - API Version
 * Manages application data using REST API and real-time Socket.io
 */

import io, { Socket } from 'socket.io-client';

export interface Artist {
  id: string;
  name: string;
  song_description?: string;
  preferred_time?: string;
  performance_order: number;
  created_at: string;
  updated_at: string;
}

export interface Album {
  id: string;
  name: string;
  description?: string;
  date: string;
  is_active: boolean;
  album_type: 'event' | 'gallery';
  allow_customer_uploads: boolean;
  created_at: string;
  updated_at: string;
  photos?: Photo[];
}

export interface Photo {
  id: string;
  album_id?: string;
  filename: string;
  original_name: string;
  mime_type: string;
  size: number;
  url: string;
  is_approved: boolean;
  is_visible: boolean;
  uploaded_by?: string;
  created_at: string;
  updated_at: string;
  album_name?: string;
}

export interface PendingPhoto extends Photo {
  // Pending photos are just unapproved photos (is_approved = false)
  status?: 'pending' | 'approved' | 'rejected';
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    username: string;
  };
}

export class OpenMicDataService {
  private apiUrl: string;
  private socket: Socket | null = null;
  private authToken: string | null = null;

  // Event listeners
  private listeners: { [event: string]: ((data: any) => void)[] } = {};

  constructor(apiUrl?: string) {
    // Use environment variable if available, otherwise default to localhost
    this.apiUrl = apiUrl || import.meta.env.VITE_API_URL || 'http://localhost:3001';
    console.log('🌐 API URL:', this.apiUrl);
    this.initializeSocket();
    this.initializeAuth();
  }

  /**
   * Initialize the data service
   */
  async initialize(): Promise<void> {
    this.initializeSocket();
  }

  /**
   * Initialize Socket.io connection
   */
  private initializeSocket(): void {
    if (this.socket) {
      this.socket.disconnect();
    }

    this.socket = io(this.apiUrl, {
      transports: ['websocket', 'polling']
    });

    this.socket.on('connect', () => {
      console.log('🔌 Connected to server');
    });

    this.socket.on('disconnect', () => {
      console.log('🔌 Disconnected from server');
    });

    // Set up event listeners
    this.setupSocketListeners();
  }

  /**
   * Set up Socket.io event listeners
   */
  private setupSocketListeners(): void {
    if (!this.socket) return;

    const events = [
      'artist:created',
      'artist:updated',
      'artist:deleted',
      'artists:reordered',
      'album:created',
      'album:updated',
      'photo:uploaded',
      'photo:approved'
    ];

    events.forEach(event => {
      this.socket!.on(event, (data: any) => {
        this.emit(event, data);
      });
    });
  }

  /**
   * Make authenticated API request
   */
  private async apiRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.apiUrl}${endpoint}`;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true', // Skip ngrok interstitial page
      ...options.headers
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    const response = await fetch(url, {
      ...options,
      headers
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Network error' }));
      throw new Error(errorData.error?.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  /**
   * Event system for real-time updates
   */
  on(event: string, callback: (data: any) => void): void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  off(event: string, callback?: (data: any) => void): void {
    if (!this.listeners[event]) return;

    if (callback) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    } else {
      delete this.listeners[event];
    }
  }

  private emit(event: string, data: any): void {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data));
    }
  }

  // Artist Management

  /**
   * Get all artists
   */
  async getArtists(): Promise<Artist[]> {
    const response = await this.apiRequest<ApiResponse<Artist[]>>('/api/artists');
    return response.data || [];
  }

  /**
   * Add a new artist
   */
  async addArtist(artistData: Omit<Artist, 'id' | 'performance_order' | 'created_at' | 'updated_at'>): Promise<Artist> {
    const response = await this.apiRequest<ApiResponse<Artist>>('/api/artists', {
      method: 'POST',
      body: JSON.stringify(artistData)
    });
    return response.data!;
  }

  /**
   * Update an artist
   */
  async updateArtist(id: string, updates: Partial<Omit<Artist, 'id' | 'created_at'>>): Promise<void> {
    await this.apiRequest(`/api/artists/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }

  /**
   * Delete an artist
   */
  async deleteArtist(id: string): Promise<void> {
    await this.apiRequest(`/api/artists/${id}`, {
      method: 'DELETE'
    });
  }

  /**
   * Reorder artists
   */
  async reorderArtists(artistIds: string[]): Promise<void> {
    await this.apiRequest('/api/artists/reorder', {
      method: 'POST',
      body: JSON.stringify({ artistIds })
    });
  }

  // Album Management

  /**
   * Get all albums
   */
  async getAlbums(): Promise<Album[]> {
    const response = await this.apiRequest<ApiResponse<Album[]>>('/api/albums');
    return response.data || [];
  }

  /**
   * Get a specific album with photos
   */
  async getAlbum(id: string): Promise<Album | null> {
    try {
      const response = await this.apiRequest<ApiResponse<Album>>(`/api/albums/${id}`);
      const album = response.data;
      if (!album) return null;

      // Load photos for this album
      const photosResponse = await this.apiRequest<ApiResponse<Photo[]>>(`/api/photos?album_id=${id}`, {
        method: 'GET'
      });
      album.photos = (photosResponse.data || []).map(p => {
        let photoUrl = p.url.startsWith('http') ? p.url : `${this.apiUrl}${p.url}`;
        // Add ngrok-skip-browser-warning as query param for image loading
        if (photoUrl.includes('ngrok')) {
          photoUrl += (photoUrl.includes('?') ? '&' : '?') + 'ngrok-skip-browser-warning=true';
        }
        return {
          ...p,
          url: photoUrl
        };
      });

      return album;
    } catch (error) {
      return null;
    }
  }

  /**
   * Create a new album
   */
  async createAlbum(albumData: Omit<Album, 'id' | 'created_at' | 'updated_at' | 'photos'>): Promise<Album> {
    const response = await this.apiRequest<ApiResponse<Album>>('/api/albums', {
      method: 'POST',
      body: JSON.stringify(albumData)
    });
    return response.data!;
  }

  /**
   * Update an album
   */
  async updateAlbum(id: string, updates: Partial<Omit<Album, 'id' | 'created_at' | 'photos'>>): Promise<void> {
    await this.apiRequest(`/api/albums/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }

  /**
   * Delete an album
   */
  async deleteAlbum(id: string): Promise<void> {
    await this.apiRequest(`/api/albums/${id}`, {
      method: 'DELETE'
    });
  }

  /**
   * Get today's event album for customer uploads
   */
  async getTodaysEventAlbum(): Promise<Album | null> {
    try {
      const response = await this.apiRequest<ApiResponse<Album | null>>('/api/albums/today-event');
      return response.data || null;
    } catch (error) {
      console.error('Error fetching today\'s event album:', error);
      return null;
    }
  }

  // Photo Management

  /**
   * Get all photos
   */
  async getPhotos(albumId?: string): Promise<Photo[]> {
    const url = albumId ? `/api/photos?album_id=${albumId}` : '/api/photos';
    const response = await this.apiRequest<ApiResponse<Photo[]>>(url);
    return response.data || [];
  }

  /**
   * Upload a new photo
   */
  async uploadPhoto(albumId: string, file: File, caption?: string): Promise<Photo> {
    const formData = new FormData();
    formData.append('photo', file);
    formData.append('album_id', albumId);
    if (caption) {
      formData.append('caption', caption);
    }

    const response = await fetch(`${this.apiUrl}/api/photos`, {
      method: 'POST',
      headers: this.authToken ? { 'Authorization': `Bearer ${this.authToken}` } : {},
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Upload failed' }));
      throw new Error(errorData.error?.message || `HTTP ${response.status}`);
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * Update a photo
   */
  async updatePhoto(id: string, updates: { is_approved?: boolean; is_visible?: boolean }): Promise<void> {
    await this.apiRequest(`/api/photos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }

  /**
   * Approve a photo
   */
  async approvePhoto(id: string, approved: boolean): Promise<void> {
    await this.apiRequest(`/api/photos/${id}/approve`, {
      method: 'PUT',
      body: JSON.stringify({ approved })
    });
  }

  /**
   * Delete a photo
   */
  async deletePhoto(id: string): Promise<void> {
    await this.apiRequest(`/api/photos/${id}`, {
      method: 'DELETE'
    });
  }

  /**
   * Upload photo when no date match (date mismatch queue)
   */
  async uploadDateMismatchPhoto(file: File, uploaderName: string, caption?: string): Promise<Photo> {
    const formData = new FormData();
    formData.append('photo', file);
    formData.append('uploaded_by', uploaderName);
    if (caption) {
      formData.append('caption', caption);
    }

    const response = await fetch(`${this.apiUrl}/api/photos/date-mismatch`, {
      method: 'POST',
      headers: this.authToken ? { 'Authorization': `Bearer ${this.authToken}` } : {},
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Upload failed' }));
      throw new Error(errorData.error?.message || `HTTP ${response.status}`);
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * Get all date mismatch photos (admin only)
   */
  async getDateMismatchPhotos(): Promise<Photo[]> {
    const response = await this.apiRequest<ApiResponse<Photo[]>>('/api/photos/date-mismatch/list');
    return (response.data || []).map(p => ({
      ...p,
      url: p.url.startsWith('http') ? p.url : `${this.apiUrl}${p.url}`
    }));
  }

  /**
   * Assign date mismatch photo to an album
   */
  async assignDateMismatchPhoto(photoId: string, albumId: string): Promise<void> {
    await this.apiRequest(`/api/photos/${photoId}/assign`, {
      method: 'PUT',
      body: JSON.stringify({ album_id: albumId })
    });
  }

  // Pending Photo Management (Legacy - now handled by backend)

  /**
   * Get all pending photos (for admin review)
   */
  async getPendingPhotos(): Promise<Photo[]> {
    const response = await this.apiRequest<ApiResponse<Photo[]>>('/api/photos?approved=false');
    return response.data || [];
  }

  /**
   * Submit a pending photo for review (now uploads directly to backend)
   */
  async submitPendingPhoto(albumId: string, file: File, caption?: string): Promise<Photo> {
    return this.uploadPhoto(albumId, file, caption);
  }

  /**
   * Approve a pending photo
   */
  async approvePendingPhoto(pendingPhotoId: string): Promise<void> {
    await this.approvePhoto(pendingPhotoId, true);
  }

  /**
   * Reject a pending photo
   */
  async rejectPendingPhoto(pendingPhotoId: string): Promise<void> {
    await this.approvePhoto(pendingPhotoId, false);
  }

  // Settings Management

  /**
   * Get a setting value
   */
  async getSetting(key: string): Promise<string | null> {
    try {
      const response = await this.apiRequest<ApiResponse<{ key: string; value: string } | null>>(`/api/settings/${key}`);
      return response.data?.value || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Update a setting
   */
  async updateSetting(key: string, value: string): Promise<void> {
    await this.apiRequest(`/api/settings/${key}`, {
      method: 'PUT',
      body: JSON.stringify({ value })
    });
  }

  // Admin Authentication

  /**
   * Check admin authentication
   */
  async isAdminAuthenticated(): Promise<boolean> {
    return this.authToken !== null;
  }

  /**
   * Authenticate admin
   */
  async authenticateAdmin(username: string, password: string): Promise<boolean> {
    try {
      const response = await this.apiRequest<ApiResponse<AuthResponse>>('/api/admin/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });

      if (response.data) {
        this.authToken = response.data.token;
        // Store token in localStorage for persistence
        localStorage.setItem('admin_token', this.authToken);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Authentication failed:', error);
      return false;
    }
  }

  /**
   * Logout admin
   */
  async logoutAdmin(): Promise<void> {
    this.authToken = null;
    localStorage.removeItem('admin_token');
  }

  /**
   * Initialize auth from stored token
   */
  private initializeAuth(): void {
    const token = localStorage.getItem('admin_token');
    if (token) {
      this.authToken = token;
    }
  }

  // Utility methods

  /**
   * Export all data (for backup/sync)
   */
  async exportData(): Promise<{ artists: Artist[]; albums: Album[]; photos: Photo[] }> {
    const [artists, albums, photos] = await Promise.all([
      this.getArtists(),
      this.getAlbums(),
      this.getPhotos()
    ]);

    return { artists, albums, photos };
  }

  /**
   * Import data (for restore/sync)
   */
  async importData(data: { artists?: Artist[]; albums?: Album[]; photos?: Photo[] }): Promise<void> {
    // This would require admin privileges and special import endpoints
    // For now, we'll skip this as the backend handles data persistence
    console.warn('Import functionality requires backend admin access');
  }

  /**
   * Get API health status
   */
  async getApiHealth(): Promise<{ status: string; timestamp: string }> {
    const response = await this.apiRequest<{ status: string; timestamp: string }>('/health');
    return response;
  }
}

// Singleton instance
let globalDataService: OpenMicDataService | null = null;

export function getGlobalDataService(): OpenMicDataService {
  if (!globalDataService) {
    globalDataService = new OpenMicDataService();
  }
  return globalDataService;
}

export async function initializeGlobalDataService(): Promise<OpenMicDataService> {
  globalDataService = new OpenMicDataService();
  await globalDataService.initialize();
  return globalDataService;
}