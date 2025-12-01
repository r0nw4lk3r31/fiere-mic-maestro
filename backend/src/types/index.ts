// Artist types
export interface Artist {
  id: string;
  name: string;
  song_description?: string;
  preferred_time?: string;
  performance_order: number;
  created_at: Date;
  updated_at: Date;
}

export interface CreateArtistRequest {
  name: string;
  song_description?: string;
  preferred_time?: string;
}

export interface UpdateArtistRequest {
  name?: string;
  song_description?: string;
  preferred_time?: string;
  performance_order?: number;
}

// Photo types
export interface Photo {
  id: string;
  album_id?: string;
  filename: string;
  original_name: string;
  mime_type: string;
  size: number;
  url: string;
  is_approved: boolean;
  uploaded_by?: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreatePhotoRequest {
  album_id: string;
  file: Express.Multer.File;
}

// Album types
export interface Album {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateAlbumRequest {
  name: string;
  description?: string;
  date?: string;
}

// Admin types
export interface AdminUser {
  id: string;
  username: string;
  password_hash: string;
  created_at: Date;
  updated_at: Date;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    username: string;
  };
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
}

// Socket event types
export interface SocketEvents {
  'join:lineup': () => void;
  'join:photos': () => void;
  'join:albums': () => void;
  'artist:created': (artist: Artist) => void;
  'artist:updated': (artist: Artist) => void;
  'artist:deleted': (id: string) => void;
  'photo:uploaded': (photo: Photo) => void;
  'photo:approved': (photo: Photo) => void;
  'album:created': (album: Album) => void;
  'album:updated': (album: Album) => void;
}