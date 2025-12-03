# 🏗️ System Architecture - Fiere Mic Maestro

## Overview

Fiere Mic Maestro is a full-stack open mic management system built with a modern web stack, designed for live event management at Fiere Margriet venue.

**Purpose:** Streamline open mic night operations with real-time artist lineup management, customer engagement, photo sharing, and admin moderation.

---

## Technology Stack

### Frontend
- **Framework:** React 18.3 with TypeScript
- **Build Tool:** Vite 5.4
- **UI Library:** shadcn/ui + Radix UI primitives
- **Styling:** TailwindCSS with custom vintage theme
- **State Management:** React hooks + TanStack Query
- **Routing:** React Router v6
- **Real-time:** Socket.io Client 4.8
- **Forms:** React Hook Form + Zod validation

### Backend
- **Runtime:** Node.js
- **Framework:** Express.js 4.18
- **Language:** TypeScript
- **Database:** PostgreSQL 13+
- **ORM:** Drizzle ORM 0.29
- **Real-time:** Socket.io 4.7
- **Authentication:** JWT (jsonwebtoken 9.0)
- **File Upload:** Multer 1.4.5-lts
- **Password Hashing:** bcryptjs 2.4
- **Security:** Helmet + CORS

### Infrastructure
- **Database Container:** Docker (PostgreSQL 13)
- **Frontend Hosting:** Vercel (Free Tier)
- **Backend Hosting:** Local + ngrok tunnel
- **File Storage:** Local filesystem (`/uploads`)

---

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Customer   │  │    Artist    │  │    Admin     │          │
│  │    View      │  │   Sign-up    │  │  Dashboard   │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                  │                  │                   │
│         └──────────────────┴──────────────────┘                   │
│                            │                                      │
│                   ┌────────▼────────┐                            │
│                   │  React Router   │                            │
│                   │   (Navigation)  │                            │
│                   └────────┬────────┘                            │
│                            │                                      │
│         ┌──────────────────┼──────────────────┐                 │
│         │                  │                  │                  │
│  ┌──────▼────────┐  ┌─────▼──────┐  ┌───────▼────────┐        │
│  │  Photo Pages  │  │   Index    │  │ Performance    │        │
│  │  Management   │  │   (Home)   │  │    History     │        │
│  └──────┬────────┘  └─────┬──────┘  └───────┬────────┘        │
│         │                  │                  │                  │
│         └──────────────────┴──────────────────┘                 │
│                            │                                      │
└────────────────────────────┼──────────────────────────────────────┘
                             │
                ┌────────────▼───────────┐
                │  OpenMicDataService    │
                │  (Data Layer)          │
                └────────────┬───────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        │                    │                    │
┌───────▼────────┐   ┌──────▼──────┐   ┌────────▼────────┐
│  REST API      │   │  Socket.io  │   │  File Upload    │
│  (HTTP/HTTPS)  │   │  (WebSocket)│   │  (FormData)     │
└───────┬────────┘   └──────┬──────┘   └────────┬────────┘
        │                    │                    │
        └────────────────────┼────────────────────┘
                             │
┌────────────────────────────▼──────────────────────────────────┐
│                      SERVER LAYER                              │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │              Express.js Server (Port 3001)                │ │
│  └──────────────────────────┬───────────────────────────────┘ │
│                             │                                  │
│          ┌──────────────────┼──────────────────┐              │
│          │                  │                  │               │
│  ┌───────▼────────┐  ┌─────▼──────┐  ┌───────▼────────┐     │
│  │   Middleware   │  │   Routes   │  │    Socket.io   │     │
│  │  - CORS        │  │  - Artists │  │    Handlers    │     │
│  │  - Helmet      │  │  - Albums  │  │  - Rooms       │     │
│  │  - JWT Auth    │  │  - Photos  │  │  - Emit Events │     │
│  │  - Multer      │  │  - Admin   │  └───────┬────────┘     │
│  └───────┬────────┘  └─────┬──────┘          │               │
│          │                  │                  │               │
│          └──────────────────┼──────────────────┘               │
│                             │                                  │
│                     ┌───────▼────────┐                         │
│                     │  Controllers   │                         │
│                     │  (Business     │                         │
│                     │   Logic)       │                         │
│                     └───────┬────────┘                         │
│                             │                                  │
│          ┌──────────────────┼──────────────────┐              │
│          │                  │                  │               │
│  ┌───────▼────────┐  ┌─────▼──────┐  ┌───────▼────────┐     │
│  │    Services    │  │   Models   │  │   Utilities    │     │
│  │  - Socket      │  │  - Drizzle │  │  - Error       │     │
│  │  - Cleanup     │  │  - Schema  │  │  - Validation  │     │
│  └────────────────┘  └─────┬──────┘  └────────────────┘     │
│                             │                                  │
└─────────────────────────────┼──────────────────────────────────┘
                              │
                      ┌───────▼────────┐
                      │   PostgreSQL   │
                      │   Database     │
                      │   (Docker)     │
                      └────────────────┘
```

---

## Data Flow

### 1. Artist Signup Flow
```
Customer → Artist Signup Page → OpenMicDataService
    → POST /api/artists → Artists Controller
    → Insert into DB → Emit 'artist:created' via Socket.io
    → All connected clients update in real-time
```

### 2. Photo Upload Flow
```
Customer → Upload Photo → OpenMicDataService
    → Check for today's event album
    ├─ Album exists: POST /api/photos with album_id
    └─ No album: POST /api/photos/date-mismatch
    → Multer processes file → Save to /uploads/
    → Insert into DB with review_status
    ├─ Approval OFF: is_approved = true (visible immediately)
    └─ Approval ON: is_approved = false (needs admin review)
    → Emit 'photo:uploaded' or 'photo:date_mismatch' via Socket.io
```

### 3. Real-time Update Flow
```
Admin action (e.g., reorder artists)
    → Controller processes request
    → Update database
    → Emit event via Socket.io ('artists:reordered')
    → All connected clients receive event
    → OpenMicDataService triggers local listeners
    → React components re-fetch data
    → UI updates across all devices
```

---

## Database Schema

### Tables

#### `artists`
```sql
- id: uuid (PK, auto-generated)
- name: text (required)
- song_description: text (nullable)
- preferred_time: text (nullable)
- performance_order: integer (default: 0)
- is_regular: boolean (default: false)
- created_at: timestamp (default: now())
- updated_at: timestamp (default: now())
```

**Purpose:** Stores both tonight's playlist and saved regular artists.
- `is_regular = false`: Current lineup
- `is_regular = true`: Saved artists for quick access

---

#### `performance_log`
```sql
- id: uuid (PK, auto-generated)
- artist_name: text (required)
- song_description: text (nullable)
- performed_at: timestamp (required, default: now())
- created_at: timestamp (default: now())
```

**Purpose:** Historical record of all performances. Artists are logged here when marked as "performed" and removed from active lineup.

---

#### `albums`
```sql
- id: uuid (PK, auto-generated)
- name: text (required)
- description: text (nullable)
- date: timestamp (required, default: now())
- is_active: boolean (default: true)
- album_type: text (default: 'event')  -- 'event' or 'gallery'
- allow_customer_uploads: boolean (default: true)
- created_at: timestamp (default: now())
- updated_at: timestamp (default: now())
```

**Purpose:** Photo albums organized by event date.
- `album_type = 'event'`: Date-specific open mic nights
- `album_type = 'gallery'`: Admin-only collections
- `is_active`: Controls customer visibility

---

#### `photos`
```sql
- id: uuid (PK, auto-generated)
- album_id: uuid (FK → albums.id, nullable, cascade delete)
- filename: text (required)  -- UUID filename on server
- original_name: text (required)  -- Original upload name
- mime_type: text (required)
- size: integer (required)  -- Bytes
- url: text (required)  -- Relative path: /uploads/filename
- is_approved: boolean (default: false)
- is_visible: boolean (default: true)
- uploaded_by: text (nullable)  -- Uploader name or IP
- review_status: text (default: 'pending')  -- 'pending', 'approved', 'rejected', 'date_mismatch'
- created_at: timestamp (default: now())
- updated_at: timestamp (default: now())
```

**Purpose:** Photo metadata and approval workflow.
- `review_status = 'date_mismatch'`: No album for upload date (auto-deleted after 3 hours)
- `is_approved`: Moderation flag (bypassed if approval setting is OFF)
- `is_visible`: Admin can hide specific photos

---

#### `admin_users`
```sql
- id: uuid (PK, auto-generated)
- username: text (required, unique)
- password_hash: text (required)  -- bcrypt hash
- created_at: timestamp (default: now())
- updated_at: timestamp (default: now())
```

**Purpose:** Admin authentication. Passwords hashed with bcrypt (12 rounds).

---

#### `settings`
```sql
- id: uuid (PK, auto-generated)
- key: text (required, unique)
- value: text (required)
- created_at: timestamp (default: now())
- updated_at: timestamp (default: now())
```

**Purpose:** App configuration key-value store.

**Current Settings:**
- `require_photo_approval`: 'true' or 'false' (default: false)

---

## API Architecture

### Authentication
- **Method:** JWT (JSON Web Tokens)
- **Storage:** localStorage (client-side)
- **Header:** `Authorization: Bearer <token>`
- **Expiration:** 24 hours
- **Protected Routes:** All `/api/admin/*` endpoints

### Endpoints Structure
```
/api/
  ├─ artists/
  │  ├─ GET    /              - List all artists
  │  ├─ POST   /              - Create artist
  │  ├─ GET    /:id           - Get single artist
  │  ├─ PUT    /:id           - Update artist
  │  ├─ DELETE /:id           - Delete artist
  │  ├─ POST   /reorder       - Reorder lineup
  │  ├─ GET    /regulars/list - Get saved regular artists
  │  ├─ POST   /:id/performed - Mark as performed (logs to history)
  │  └─ GET    /history/list  - Get performance history
  │
  ├─ albums/
  │  ├─ GET    /              - List active albums
  │  ├─ POST   /              - Create album
  │  ├─ GET    /:id           - Get album with photos
  │  ├─ PUT    /:id           - Update album
  │  ├─ DELETE /:id           - Soft delete (set is_active = false)
  │  └─ GET    /today-event   - Get today's event album for uploads
  │
  ├─ photos/
  │  ├─ GET    /              - List photos (filterable by album_id, approved)
  │  ├─ POST   /              - Upload photo to album
  │  ├─ GET    /:id           - Get single photo
  │  ├─ PUT    /:id           - Update photo metadata
  │  ├─ PUT    /:id/approve   - Approve/reject photo
  │  ├─ DELETE /:id           - Delete photo (and file)
  │  ├─ POST   /date-mismatch - Upload date mismatch photo
  │  ├─ GET    /date-mismatch/list - List date mismatch photos (admin)
  │  └─ PUT    /:id/assign    - Assign date mismatch photo to album
  │
  ├─ admin/
  │  ├─ POST   /login         - Admin login (returns JWT)
  │  ├─ POST   /users         - Create admin user
  │  └─ GET    /profile       - Get current admin profile (protected)
  │
  └─ settings/
     ├─ GET    /:key          - Get setting value
     └─ PUT    /:key          - Update setting value (protected)
```

### Response Format
```json
{
  "success": true,
  "data": { ... },
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE"
  }
}
```

---

## Socket.io Real-time Events

### Rooms
- `lineup` - Artist lineup updates
- `photos` - Photo upload/approval events
- `albums` - Album creation/updates

### Events Emitted by Server
```javascript
// Artist events
'artist:created' → { id, name, song_description, ... }
'artist:updated' → { id, name, ... }
'artist:deleted' → artistId
'artists:reordered' → [artist1, artist2, ...]
'artist:performed' → { id, name }

// Photo events
'photo:uploaded' → { id, album_id, url, ... }
'photo:approved' → { id, is_approved, ... }
'photo:updated' → { id, ... }
'photo:date_mismatch' → { id, uploaded_by, ... }

// Album events
'album:created' → { id, name, date, ... }
'album:updated' → { id, ... }
```

### Client Connection Flow
```javascript
// 1. Connect to server
const socket = io('http://localhost:3001');

// 2. Join rooms for updates
socket.emit('join:lineup');
socket.emit('join:photos');
socket.emit('join:albums');

// 3. Listen for events
socket.on('artist:created', (artist) => {
  // Update UI with new artist
});

// 4. Automatic reconnection on disconnect
socket.on('disconnect', () => {
  console.log('Disconnected, will auto-reconnect');
});
```

---

## Frontend Architecture

### Component Hierarchy
```
App.tsx (Root)
├─ React Router
│  ├─ Index (/)
│  ├─ ArtistSignup (/artist-signup)
│  ├─ CustomerView (/customer-view)
│  ├─ AdminLogin (/admin/login)
│  ├─ AdminDashboard (/admin)
│  │  └─ ArtistManagement (component)
│  ├─ PhotoManager (/admin/photos)
│  ├─ PerformanceHistory (/admin/history)
│  └─ NotFound (*)
└─ Global Providers
   ├─ QueryClientProvider (TanStack Query)
   ├─ TooltipProvider
   ├─ Toaster (Notifications)
   └─ Sonner (Toast notifications)
```

### State Management Strategy
- **Local State:** React `useState` for component-level state
- **Server State:** TanStack Query (minimal use - mostly direct OpenMicDataService)
- **Global State:** OpenMicDataService singleton instance
- **Real-time State:** Socket.io event listeners trigger data refetch

### OpenMicDataService (Data Layer)
```typescript
class OpenMicDataService {
  // Properties
  private apiUrl: string;
  private socket: Socket;
  private authToken: string | null;
  private listeners: { [event: string]: Function[] };

  // Methods
  // Artists
  getArtists(): Promise<Artist[]>
  addArtist(data): Promise<Artist>
  updateArtist(id, updates): Promise<void>
  deleteArtist(id): Promise<void>
  reorderArtists(ids): Promise<void>
  getRegularArtists(): Promise<Artist[]>
  markAsPerformed(id): Promise<void>
  getPerformanceHistory(limit): Promise<any[]>

  // Albums
  getAlbums(): Promise<Album[]>
  getAlbum(id): Promise<Album>
  createAlbum(data): Promise<Album>
  updateAlbum(id, updates): Promise<void>
  deleteAlbum(id): Promise<void>
  getTodaysEventAlbum(): Promise<Album | null>

  // Photos
  getPhotos(albumId?): Promise<Photo[]>
  uploadPhoto(albumId, file, caption?): Promise<Photo>
  updatePhoto(id, updates): Promise<void>
  approvePhoto(id, approved): Promise<void>
  deletePhoto(id): Promise<void>
  uploadDateMismatchPhoto(file, name, caption?): Promise<Photo>
  getDateMismatchPhotos(): Promise<Photo[]>
  assignDateMismatchPhoto(photoId, albumId): Promise<void>

  // Pending Photos (legacy)
  getPendingPhotos(): Promise<Photo[]>
  approvePendingPhoto(id): Promise<void>
  rejectPendingPhoto(id): Promise<void>

  // Settings
  getSetting(key): Promise<string | null>
  updateSetting(key, value): Promise<void>

  // Admin
  authenticateAdmin(username, password): Promise<boolean>
  logoutAdmin(): Promise<void>
  isAdminAuthenticated(): Promise<boolean>

  // Utilities
  exportData(): Promise<object>
  getApiHealth(): Promise<object>

  // Event System
  on(event, callback): void
  off(event, callback?): void
  private emit(event, data): void
}
```

---

## Security Measures

### Backend Security
1. **Helmet.js** - HTTP security headers
2. **CORS** - Restricted to specific origins (Vercel + ngrok patterns)
3. **JWT Authentication** - Protected admin routes
4. **Password Hashing** - bcryptjs with 12 salt rounds
5. **Input Validation** - Required fields checked
6. **File Upload Limits** - 10MB max, image types only
7. **Error Handling** - Generic error messages to clients

### Frontend Security
1. **JWT Storage** - localStorage with expiration
2. **Route Protection** - Admin routes check authentication
3. **CORS Headers** - Included in all API requests
4. **XSS Protection** - React's built-in escaping
5. **File Validation** - Client-side type and size checks before upload

### Database Security
1. **No Public Access** - PostgreSQL runs in Docker, not exposed
2. **Parameterized Queries** - Drizzle ORM prevents SQL injection
3. **UUID Primary Keys** - Non-sequential, hard to guess
4. **Cascade Deletes** - Photos deleted with albums (data integrity)

---

## Background Services

### Cleanup Service (`cleanupService.ts`)
**Purpose:** Auto-delete date mismatch photos older than 3 hours

**Configuration:**
- Interval: Every 15 minutes
- Max Age: 3 hours (10,800,000 ms)
- Target: `photos` where `review_status = 'date_mismatch'`

**Process:**
1. Query for old date mismatch photos
2. Delete physical files from `/uploads/`
3. Delete database records
4. Log results

**Started:** On server startup (`server.ts`)

---

## File Storage

### Structure
```
backend/
└── uploads/
    ├── {uuid-1}.jpg
    ├── {uuid-2}.png
    └── {uuid-3}.jpeg
```

### File Naming
- **Pattern:** `{UUID v4}.{extension}`
- **Example:** `a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg`
- **Original Name:** Stored in `photos.original_name` column

### Upload Flow
1. Multer receives file in memory buffer
2. Generate UUID filename
3. Write to `/uploads/` directory
4. Store metadata in database
5. Return URL: `/uploads/{filename}`

### Serving Files
- **Endpoint:** `GET /uploads/:filename`
- **Static Middleware:** `express.static('uploads')`
- **Headers:**
  - `Access-Control-Allow-Origin: *` (for images)
  - `ngrok-skip-browser-warning: true` (bypass ngrok interstitial)
  - `Cross-Origin-Resource-Policy: cross-origin`

---

## Deployment Architecture

### Current Production Setup

```
┌─────────────────────────────────────────────────────────────┐
│                    CUSTOMERS / ADMIN                         │
│                  (Mobile / Desktop Browsers)                 │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           │ HTTPS
                           ▼
┌──────────────────────────────────────────────────────────────┐
│              Vercel CDN (Global Distribution)                │
│          https://fiere-mic-maestro-*.vercel.app             │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │          Frontend (Static React Build)                  │ │
│  │  - HTML, CSS, JS bundles                               │ │
│  │  - Serverless Functions (optional, unused)             │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           │ API Requests (HTTPS)
                           │ WebSocket (WSS)
                           ▼
┌──────────────────────────────────────────────────────────────┐
│                ngrok Tunnel (Free Tier)                      │
│       https://{random-subdomain}.ngrok-free.app             │
│                                                              │
│  Forwards to: http://localhost:3001                         │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           │ HTTP (Local)
                           ▼
┌──────────────────────────────────────────────────────────────┐
│              Local Machine (Event Laptop)                    │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │       Express.js Backend (Port 3001)                    │ │
│  │  - REST API                                             │ │
│  │  - Socket.io Server                                     │ │
│  │  - File Serving (/uploads)                              │ │
│  └────────────────────┬───────────────────────────────────┘ │
│                       │                                      │
│                       │ PostgreSQL Protocol                  │
│                       ▼                                      │
│  ┌────────────────────────────────────────────────────────┐ │
│  │     Docker Container: PostgreSQL 13                     │ │
│  │  - Database: fiere_mic_maestro                          │ │
│  │  - Port: 5432 (exposed to host)                         │ │
│  │  - Volume: Persistent storage                           │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

### Deployment Workflow

**Pre-Event (30 minutes before):**
1. Start Docker PostgreSQL: `docker start fiere-postgres`
2. Start Backend: `cd backend && npm run dev`
3. Start ngrok: `ngrok http 3001` (copy URL)
4. Update Vercel env: `vercel env add VITE_API_URL production`
5. Deploy Frontend: `vercel --prod`
6. Update backend CORS with new Vercel URL
7. Test from mobile device

**During Event:**
- Keep all terminals running
- Monitor for errors
- Approve photos if moderation is ON

**Post-Event:**
- Stop ngrok (optional)
- Keep database running for data access
- Servers can be stopped

---

## Error Handling Strategy

### Backend Error Handling
```typescript
// Custom error middleware
export const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.statusCode || 500).json({
    success: false,
    error: {
      message: err.message || 'Internal server error',
      code: err.code
    }
  });
};

// Usage in controllers
try {
  // ... operation
} catch (error) {
  next(createApiError('Operation failed', 500));
}
```

### Frontend Error Handling
```typescript
try {
  await dataService.someOperation();
  toast.success('Operation successful!');
} catch (error) {
  console.error('Error:', error);
  toast.error('Operation failed. Please try again.');
}
```

### Global Error Catchers
```typescript
// Backend (server.ts)
process.on('uncaughtException', (err) => {
  console.error('uncaughtException:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('unhandledRejection:', reason);
});
```

---

## Performance Considerations

### Database
- **Indexes:** UUID primary keys (automatic B-tree indexes)
- **Query Optimization:** Drizzle ORM generates efficient queries
- **Connection Pooling:** postgres library handles connections

### File Uploads
- **Max Size:** 10MB per file
- **Processing:** In-memory buffer (Multer)
- **Storage:** Local filesystem (fast reads)
- **Delivery:** Express static middleware with caching headers

### Real-time Updates
- **Socket.io Rooms:** Clients join specific rooms (lineup, photos, albums)
- **Event Broadcasting:** Only to relevant rooms (not global broadcast)
- **Reconnection:** Automatic with exponential backoff

### Frontend
- **Code Splitting:** Vite automatic chunking
- **Image Optimization:** Client-side validation before upload
- **Lazy Loading:** React.lazy for route components (not implemented yet)

---

## Scalability & Limitations

### Current Limitations (Free Tier)
- **ngrok:** 40 requests/minute, random URLs on restart
- **Vercel:** 100GB bandwidth/month, unlimited requests
- **Local Backend:** Single machine, no load balancing
- **Database:** Docker container, single instance

### Scaling Options (Future)
1. **Backend Hosting:** Deploy to Railway, Heroku, or DigitalOcean
2. **Database:** Managed PostgreSQL (Supabase, Railway, AWS RDS)
3. **File Storage:** S3, Cloudinary, or Vercel Blob
4. **ngrok Alternative:** Reserved domain ($8/month) or proper hosting
5. **Load Balancing:** Multiple backend instances with sticky sessions

### Expected Load (Current Use Case)
- **Concurrent Users:** 20-50 (small venue)
- **Photo Uploads:** 10-30 per event
- **API Requests:** < 1000 per event
- **Verdict:** ✅ Free tier is sufficient

---

## Development Workflow

### Local Development
```bash
# Terminal 1: Database
docker start fiere-postgres

# Terminal 2: Backend
cd backend
npm run dev  # Watch mode with tsx

# Terminal 3: Frontend
npm run dev  # Vite dev server
```

### Environment Variables

**Backend (`.env`):**
```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/fiere_mic_maestro
JWT_SECRET=your-super-secret-key
PORT=3001
FRONTEND_URL=http://localhost:8080
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760
```

**Frontend (`.env`):**
```env
VITE_API_URL=http://localhost:3001
```

### Build Process
```bash
# Backend
cd backend
npm run build  # TypeScript → JavaScript (dist/)
npm start      # Run production build

# Frontend
npm run build  # Vite build → dist/
npm run preview  # Preview production build
```

---

## Monitoring & Debugging

### Backend Logs
```bash
# View server logs
tail -f backend/logs/server.log  # (if implemented)

# Or console output
npm run dev  # Shows all logs in terminal
```

### Health Checks
```bash
# Backend health
curl http://localhost:3001/health

# Response:
# { "status": "OK", "timestamp": "2025-12-02T..." }
```

### Database Inspection
```bash
# Connect to PostgreSQL
docker exec -it fiere-postgres psql -U postgres -d fiere_mic_maestro

# Useful queries
\dt                    # List tables
SELECT COUNT(*) FROM artists WHERE is_regular = true;
SELECT * FROM photos WHERE review_status = 'date_mismatch';
SELECT * FROM performance_log ORDER BY performed_at DESC LIMIT 10;
```

### Frontend Debugging
- **React DevTools:** Browser extension for component inspection
- **Network Tab:** Monitor API requests and WebSocket connections
- **Console:** OpenMicDataService logs API calls and Socket.io events

---

## Testing Strategy

### Current State
- **Manual Testing:** Primary testing method during development
- **Unit Tests:** Not implemented (future enhancement)
- **Integration Tests:** Not implemented
- **E2E Tests:** Not implemented

### Future Testing Recommendations
1. **Unit Tests:** Jest + Testing Library for components
2. **API Tests:** Supertest for Express routes
3. **Integration Tests:** Test OpenMicDataService with mock backend
4. **E2E Tests:** Playwright for full user flows

---

## Known Issues & TODOs

See `docs/OPEN-ISSUES.md` for detailed list.

**High Priority:**
- Regular artists not persisting (`is_regular` field issue)

**Medium Priority:**
- Add bulk delete for regular artists
- Add search/filter functionality
- Add edit functionality for existing regular artists

**Low Priority:**
- Implement proper logging system
- Add unit tests
- Optimize image thumbnails

---

## Conventions & Best Practices

### Naming Conventions
- **Variables:** camelCase (`artistId`, `isApproved`)
- **Components:** PascalCase (`ArtistManagement`, `PhotoManager`)
- **Files:** PascalCase for components, lowercase for utilities
- **API Routes:** kebab-case (`/api/date-mismatch`)
- **Database Tables:** snake_case (`performance_log`, `admin_users`)

### Code Organization
- **Backend:** Feature-based folders (controllers, models, routes, services)
- **Frontend:** Type-based folders (pages, components, services, hooks)
- **Shared Types:** Defined in backend, exported from data service

### Git Workflow
- **Main Branch:** `main` (production-ready)
- **Commit Messages:** Descriptive, present tense
- **Example:** "Add date mismatch photo handling"

---

**Last Updated:** December 2, 2025  
**Version:** 1.0  
**Author:** r0nw4lk3r31
