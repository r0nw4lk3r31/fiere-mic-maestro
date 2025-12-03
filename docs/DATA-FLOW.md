# 🔄 Data Flow Documentation - Fiere Mic Maestro

Complete guide to how data moves through the application.

---

## Table of Contents
1. [Artist Signup Flow](#artist-signup-flow)
2. [Photo Upload Flow](#photo-upload-flow)
3. [Real-time Update Flow](#real-time-update-flow)
4. [Authentication Flow](#authentication-flow)
5. [Admin Operations Flow](#admin-operations-flow)
6. [Date Mismatch Photo Flow](#date-mismatch-photo-flow)
7. [Performance Logging Flow](#performance-logging-flow)

---

## Artist Signup Flow

### Customer Signs Up
```
┌─────────────┐
│  Customer   │
│  Browser    │
└──────┬──────┘
       │ 1. Fill form
       │    (name, song, time)
       ▼
┌──────────────────┐
│ ArtistSignup.tsx │
└──────┬───────────┘
       │ 2. handleSubmit()
       ▼
┌──────────────────────────┐
│ OpenMicDataService       │
│ addArtist()              │
└──────┬───────────────────┘
       │ 3. POST /api/artists
       │    {
       │      name: "John",
       │      song_description: "...",
       │      preferred_time: "..."
       │    }
       ▼
┌──────────────────────────┐
│ Backend                  │
│ artistController         │
│ createArtist()           │
└──────┬───────────────────┘
       │ 4. Get last performance_order
       │    SELECT MAX(performance_order)
       ▼
┌──────────────────────────┐
│ PostgreSQL Database      │
│ artists table            │
└──────┬───────────────────┘
       │ 5. Insert new artist
       │    performance_order = lastOrder + 1
       │    is_regular = false
       ▼
┌──────────────────────────┐
│ Backend                  │
│ socketService            │
│ emitToLineup()           │
└──────┬───────────────────┘
       │ 6. Emit 'artist:created'
       │    via Socket.io
       ▼
┌─────────────────────────────────────────┐
│ All Connected Clients                   │
│ - CustomerView                          │
│ - AdminDashboard                        │
│ - Other ArtistSignup viewers            │
└──────┬──────────────────────────────────┘
       │ 7. Socket.on('artist:created')
       ▼
┌──────────────────────────┐
│ Frontend Components      │
│ fetchArtists()           │
│ - Refetch artist list    │
│ - Update UI              │
└──────────────────────────┘
```

### Key Points
- **Performance Order:** Auto-incremented based on current max
- **Real-time Sync:** All viewers see update instantly
- **Optimistic UI:** Form resets immediately, updates happen in background
- **Error Handling:** Toast notifications for success/failure

---

## Photo Upload Flow

### Normal Upload (Album Exists)
```
┌─────────────┐
│  Customer   │
└──────┬──────┘
       │ 1. Select photo file
       ▼
┌──────────────────┐
│ CustomerView.tsx │
└──────┬───────────┘
       │ 2. handlePhotoUpload()
       ▼
┌────────────────────────────────┐
│ OpenMicDataService             │
│ getTodaysEventAlbum()          │
└──────┬─────────────────────────┘
       │ 3. GET /api/albums/today-event
       ▼
┌────────────────────────────────┐
│ Backend                        │
│ albumController                │
│ getTodaysEventAlbum()          │
└──────┬─────────────────────────┘
       │ 4. Query active event albums
       │    WHERE album_type = 'event'
       │    AND is_active = true
       │    AND allow_customer_uploads = true
       ▼
┌────────────────────────────────┐
│ Filter albums by date          │
│ albumDate == todayDate         │
└──────┬─────────────────────────┘
       │ 5a. Album Found ✅
       ▼
┌────────────────────────────────┐
│ OpenMicDataService             │
│ uploadPhoto(albumId, file)     │
└──────┬─────────────────────────┘
       │ 6. POST /api/photos
       │    (multipart/form-data)
       │    {
       │      photo: File,
       │      album_id: uuid,
       │      caption: "..."
       │    }
       ▼
┌────────────────────────────────┐
│ Backend                        │
│ photoController                │
│ uploadPhoto()                  │
└──────┬─────────────────────────┘
       │ 7. Multer receives file
       │    (in-memory buffer)
       ▼
┌────────────────────────────────┐
│ Generate UUID filename         │
│ e.g., a1b2c3d4...e5f6.jpg      │
└──────┬─────────────────────────┘
       │ 8. Write to /uploads/
       ▼
┌────────────────────────────────┐
│ Check approval setting         │
│ require_photo_approval?        │
└──────┬─────────────────────────┘
       │
       ├─ 9a. Approval OFF
       │    is_approved = true
       │    (visible immediately)
       │
       └─ 9b. Approval ON
            is_approved = false
            (needs admin review)
       ▼
┌────────────────────────────────┐
│ PostgreSQL Database            │
│ INSERT INTO photos             │
│ {                              │
│   album_id: uuid,              │
│   filename: "...",             │
│   url: "/uploads/...",         │
│   is_approved: true/false,     │
│   uploaded_by: "IP or name"    │
│ }                              │
└──────┬─────────────────────────┘
       │ 10. Emit 'photo:uploaded'
       ▼
┌────────────────────────────────┐
│ All Connected Clients          │
│ Update photo galleries         │
└────────────────────────────────┘
```

### Date Mismatch Flow (No Album)
```
       │ 5b. No Album Found ❌
       ▼
┌────────────────────────────────┐
│ OpenMicDataService             │
│ uploadDateMismatchPhoto()      │
└──────┬─────────────────────────┘
       │ 6. POST /api/photos/date-mismatch
       │    (multipart/form-data)
       ▼
┌────────────────────────────────┐
│ Backend                        │
│ uploadDateMismatchPhoto()      │
└──────┬─────────────────────────┘
       │ 7. Save photo file
       ▼
┌────────────────────────────────┐
│ PostgreSQL Database            │
│ INSERT INTO photos             │
│ {                              │
│   album_id: NULL,              │
│   review_status: 'date_mismatch'│
│   is_approved: false           │
│ }                              │
└──────┬─────────────────────────┘
       │ 8. Emit 'photo:date_mismatch'
       ▼
┌────────────────────────────────┐
│ Admin PhotoManager             │
│ - Play notification sound      │
│ - Show toast notification      │
│ - Add to date mismatch queue   │
└────────────────────────────────┘
       │
       │ Admin assigns to album
       ▼
┌────────────────────────────────┐
│ PUT /api/photos/:id/assign     │
│ { album_id: uuid }             │
└──────┬─────────────────────────┘
       │ 9. Update photo
       │    album_id = uuid
       │    review_status = 'pending'
       ▼
┌────────────────────────────────┐
│ Photo now in normal flow       │
│ (needs approval if enabled)    │
└────────────────────────────────┘
```

### Key Points
- **Smart Date Matching:** Auto-detects if album exists for today
- **Graceful Fallback:** Date mismatch queue prevents data loss
- **Auto-Cleanup:** Unassigned photos deleted after 3 hours
- **Approval Toggle:** Setting controls immediate vs moderated visibility

---

## Real-time Update Flow

### Socket.io Architecture
```
┌────────────────────────────────┐
│ Client Connects to Server      │
└──────┬─────────────────────────┘
       │ 1. io('http://localhost:3001')
       ▼
┌────────────────────────────────┐
│ Socket.io Server               │
│ Establishes WebSocket          │
└──────┬─────────────────────────┘
       │ 2. connection event
       ▼
┌────────────────────────────────┐
│ Client joins rooms             │
│ socket.emit('join:lineup')     │
│ socket.emit('join:photos')     │
│ socket.emit('join:albums')     │
└──────┬─────────────────────────┘
       │ 3. Server logs joins
       ▼
┌────────────────────────────────┐
│ Server ready to broadcast      │
│ to specific rooms              │
└────────────────────────────────┘
```

### Event Broadcasting
```
┌────────────────────────────────┐
│ Admin Updates Artist Order     │
└──────┬─────────────────────────┘
       │ 1. PUT /api/artists/:id
       ▼
┌────────────────────────────────┐
│ Backend Controller             │
│ Updates database               │
└──────┬─────────────────────────┘
       │ 2. Success
       ▼
┌────────────────────────────────┐
│ socketService.emitToLineup()   │
│ io.emit('artist:updated', data)│
└──────┬─────────────────────────┘
       │ 3. Broadcast to ALL
       │    connected clients
       ▼
┌─────────────────────────────────────────┐
│ All Clients with Socket Connection     │
│                                         │
│ ┌─────────────┐  ┌──────────────┐     │
│ │ Customer 1  │  │  Customer 2  │     │
│ │ (mobile)    │  │  (desktop)   │     │
│ └─────┬───────┘  └──────┬───────┘     │
│       │                  │             │
│ ┌─────▼──────────────────▼───────┐    │
│ │ AdminDashboard                  │    │
│ └─────┬───────────────────────────┘    │
└───────┼────────────────────────────────┘
        │ 4. socket.on('artist:updated')
        ▼
┌────────────────────────────────┐
│ OpenMicDataService             │
│ emit() to local listeners      │
└──────┬─────────────────────────┘
       │ 5. Trigger callbacks
       ▼
┌────────────────────────────────┐
│ Component listeners            │
│ fetchArtists()                 │
│ Update state                   │
│ Re-render UI                   │
└────────────────────────────────┘
```

### Event Types
| Event | Trigger | Data | Consumers |
|-------|---------|------|-----------|
| `artist:created` | New signup | Full artist object | All pages showing lineup |
| `artist:updated` | Edit artist | Updated artist | All lineup viewers |
| `artist:deleted` | Delete artist | Artist ID | All lineup viewers |
| `artists:reordered` | Reorder lineup | Full artist array | All lineup viewers |
| `artist:performed` | Mark performed | { id, name } | Admin dashboard |
| `photo:uploaded` | Photo upload | Photo object | Photo galleries |
| `photo:approved` | Photo approved | Photo object | Photo galleries |
| `photo:date_mismatch` | Wrong date upload | Photo object | Admin only |
| `album:created` | New album | Album object | Photo manager |
| `album:updated` | Edit album | Album object | Photo manager |

---

## Authentication Flow

### Login Sequence
```
┌─────────────┐
│    Admin    │
└──────┬──────┘
       │ 1. Enter credentials
       │    username: "admin"
       │    password: "password"
       ▼
┌──────────────────┐
│ AdminLogin.tsx   │
└──────┬───────────┘
       │ 2. handleLogin()
       ▼
┌────────────────────────────────┐
│ OpenMicDataService             │
│ authenticateAdmin()            │
└──────┬─────────────────────────┘
       │ 3. POST /api/admin/login
       │    { username, password }
       ▼
┌────────────────────────────────┐
│ Backend                        │
│ adminController.login()        │
└──────┬─────────────────────────┘
       │ 4. Query database
       │    SELECT * FROM admin_users
       │    WHERE username = ?
       ▼
┌────────────────────────────────┐
│ PostgreSQL Database            │
│ Return user with password_hash │
└──────┬─────────────────────────┘
       │ 5. User found
       ▼
┌────────────────────────────────┐
│ bcrypt.compare()               │
│ Verify password against hash   │
└──────┬─────────────────────────┘
       │ 6a. Valid ✅
       ▼
┌────────────────────────────────┐
│ jwt.sign()                     │
│ Generate token                 │
│ Payload: { id, username }      │
│ Secret: JWT_SECRET             │
│ Expires: 24h                   │
└──────┬─────────────────────────┘
       │ 7. Return token
       ▼
┌────────────────────────────────┐
│ OpenMicDataService             │
│ - Store token in authToken     │
│ - Save to localStorage         │
└──────┬─────────────────────────┘
       │ 8. Navigate to /admin
       ▼
┌────────────────────────────────┐
│ AdminDashboard.tsx             │
│ - Check authentication         │
│ - Render admin interface       │
└────────────────────────────────┘
```

### Protected Route Check
```
┌────────────────────────────────┐
│ User navigates to /admin       │
└──────┬─────────────────────────┘
       │ 1. AdminDashboard useEffect
       ▼
┌────────────────────────────────┐
│ Check localStorage for token   │
│ const token = localStorage     │
│   .getItem('admin_token')      │
└──────┬─────────────────────────┘
       │
       ├─ 2a. No Token ❌
       │    navigate('/admin/login')
       │
       └─ 2b. Token Exists ✅
          │
          ▼
┌────────────────────────────────┐
│ OpenMicDataService             │
│ isAdminAuthenticated()         │
│ Returns: token !== null        │
└──────┬─────────────────────────┘
       │ 3. Authenticated
       ▼
┌────────────────────────────────┐
│ Render admin content           │
└────────────────────────────────┘
```

### Authenticated API Request
```
┌────────────────────────────────┐
│ Admin deletes photo            │
└──────┬─────────────────────────┘
       │ 1. DELETE /api/photos/:id
       ▼
┌────────────────────────────────┐
│ OpenMicDataService             │
│ apiRequest() helper            │
└──────┬─────────────────────────┘
       │ 2. Add headers
       │    Authorization: Bearer <token>
       │    Content-Type: application/json
       ▼
┌────────────────────────────────┐
│ Backend                        │
│ authenticateToken middleware   │
└──────┬─────────────────────────┘
       │ 3. Extract token from header
       │    authHeader.split(' ')[1]
       ▼
┌────────────────────────────────┐
│ jwt.verify(token, JWT_SECRET)  │
└──────┬─────────────────────────┘
       │
       ├─ 4a. Invalid Token ❌
       │    Return 403 Forbidden
       │
       └─ 4b. Valid Token ✅
          │ Decode payload
          │ req.user = { id, username }
          ▼
┌────────────────────────────────┐
│ Route Handler                  │
│ photoController.deletePhoto()  │
│ Access to req.user             │
└────────────────────────────────┘
```

---

## Admin Operations Flow

### Reorder Artists
```
┌─────────────┐
│    Admin    │
└──────┬──────┘
       │ 1. Drag artist up/down
       ▼
┌──────────────────┐
│ AdminDashboard   │
│ moveArtist()     │
└──────┬───────────┘
       │ 2. Calculate new order
       │    Swap array positions
       ▼
┌────────────────────────────────┐
│ Loop through updated array     │
│ For each artist:               │
│   dataService.updateArtist(    │
│     id,                        │
│     { performance_order: i }   │
│   )                            │
└──────┬─────────────────────────┘
       │ 3. Multiple PUT requests
       ▼
┌────────────────────────────────┐
│ Backend                        │
│ Updates each artist's order    │
└──────┬─────────────────────────┘
       │ 4. Emit 'artist:updated'
       │    for each change
       ▼
┌────────────────────────────────┐
│ All clients refresh            │
│ See new order immediately      │
└────────────────────────────────┘
```

**Note:** Current implementation updates one at a time. Future optimization: Batch update endpoint (`POST /api/artists/reorder`).

### Approve Photo
```
┌─────────────┐
│    Admin    │
└──────┬──────┘
       │ 1. Click "Approve"
       ▼
┌──────────────────┐
│ PhotoManager     │
│ approvePendingPhoto()│
└──────┬───────────┘
       │ 2. PUT /api/photos/:id/approve
       │    { approved: true }
       ▼
┌────────────────────────────────┐
│ Backend                        │
│ photoController.approvePhoto() │
└──────┬─────────────────────────┘
       │ 3. UPDATE photos
       │    SET is_approved = true
       │    WHERE id = ?
       ▼
┌────────────────────────────────┐
│ PostgreSQL Database            │
│ Photo now visible to customers │
└──────┬─────────────────────────┘
       │ 4. Emit 'photo:approved'
       ▼
┌────────────────────────────────┐
│ All clients refresh galleries  │
│ Photo appears in customer view │
└────────────────────────────────┘
```

---

## Date Mismatch Photo Flow

### Cleanup Job
```
┌────────────────────────────────┐
│ Server starts                  │
│ startCleanupJob()              │
└──────┬─────────────────────────┘
       │ Run immediately, then
       │ setInterval(15 minutes)
       ▼
┌────────────────────────────────┐
│ cleanupService                 │
│ cleanupOldDateMismatchPhotos() │
└──────┬─────────────────────────┘
       │ 1. Query database
       │    SELECT * FROM photos
       │    WHERE review_status = 'date_mismatch'
       │    AND created_at < (NOW() - 3 hours)
       ▼
┌────────────────────────────────┐
│ For each old photo:            │
│ 1. Delete file from /uploads/  │
│ 2. DELETE FROM photos WHERE id│
└──────┬─────────────────────────┘
       │ 2. Log results
       ▼
┌────────────────────────────────┐
│ Console:                       │
│ "[Cleanup] Deleted 3 old       │
│  date mismatch photos"         │
└────────────────────────────────┘
```

### Assignment Flow
```
┌─────────────┐
│    Admin    │
└──────┬──────┘
       │ 1. View date mismatch queue
       │    (PhotoManager)
       ▼
┌────────────────────────────────┐
│ Click "Assign" on photo        │
└──────┬─────────────────────────┘
       │ 2. Choose option:
       │
       ├─ Option A: Existing Album
       │    │
       │    ▼
       │  ┌────────────────────────┐
       │  │ Select album from list │
       │  │ PUT /api/photos/:id/assign│
       │  │ { album_id: uuid }     │
       │  └────────┬───────────────┘
       │           │
       │           ▼
       │  ┌────────────────────────┐
       │  │ UPDATE photos          │
       │  │ SET album_id = ?       │
       │  │     review_status='pending'│
       │  └────────┬───────────────┘
       │           │
       │           └─────────┐
       │                     │
       └─ Option B: New Album│
            │                │
            ▼                │
       ┌────────────────┐   │
       │ Enter album    │   │
       │ name & date    │   │
       └────────┬───────┘   │
                │           │
                ▼           │
       ┌────────────────┐   │
       │ POST /api/albums│   │
       │ Create album   │   │
       └────────┬───────┘   │
                │           │
                ▼           │
       ┌────────────────┐   │
       │ PUT /api/photos/:id/assign│
       │ Assign to new album│
       └────────┬───────┘   │
                │           │
                └───────────┘
                    │
                    ▼
       ┌────────────────────────┐
       │ Photo now in normal    │
       │ workflow (needs approval)│
       └────────────────────────┘
```

---

## Performance Logging Flow

### Mark as Performed
```
┌─────────────┐
│    Admin    │
└──────┬──────┘
       │ 1. Artist finishes performing
       │    Click "Mark as Performed"
       ▼
┌──────────────────┐
│ AdminDashboard   │
│ handleMarkAsPerformed()│
└──────┬───────────┘
       │ 2. POST /api/artists/:id/performed
       ▼
┌────────────────────────────────┐
│ Backend                        │
│ artistController               │
│ markAsPerformed()              │
└──────┬─────────────────────────┘
       │ 3. SELECT artist details
       │    FROM artists WHERE id = ?
       ▼
┌────────────────────────────────┐
│ PostgreSQL Database            │
│ Get artist record              │
└──────┬─────────────────────────┘
       │ 4. Artist found
       ▼
┌────────────────────────────────┐
│ INSERT INTO performance_log    │
│ {                              │
│   artist_name: "John Doe",     │
│   song_description: "...",     │
│   performed_at: NOW()          │
│ }                              │
└──────┬─────────────────────────┘
       │ 5. Success
       ▼
┌────────────────────────────────┐
│ DELETE FROM artists            │
│ WHERE id = ?                   │
└──────┬─────────────────────────┘
       │ 6. Artist removed from lineup
       ▼
┌────────────────────────────────┐
│ Emit 'artist:performed'        │
│ { id, name }                   │
└──────┬─────────────────────────┘
       │ 7. Real-time update
       ▼
┌────────────────────────────────┐
│ All clients refresh            │
│ Artist removed from lineup     │
│ Available in history log       │
└────────────────────────────────┘
```

### View History
```
┌─────────────┐
│    Admin    │
└──────┬──────┘
       │ 1. Navigate to /admin/history
       ▼
┌──────────────────┐
│ PerformanceHistory│
└──────┬───────────┘
       │ 2. GET /api/artists/history/list?limit=100
       ▼
┌────────────────────────────────┐
│ Backend                        │
│ getPerformanceHistory()        │
└──────┬─────────────────────────┘
       │ 3. SELECT * FROM performance_log
       │    ORDER BY performed_at DESC
       │    LIMIT 100
       ▼
┌────────────────────────────────┐
│ PostgreSQL Database            │
│ Return chronological log       │
└──────┬─────────────────────────┘
       │ 4. Return array
       ▼
┌────────────────────────────────┐
│ Frontend renders list          │
│ - Artist name                  │
│ - Song description             │
│ - Performance timestamp        │
└────────────────────────────────┘
```

---

## Data Synchronization Patterns

### Optimistic vs Pessimistic Updates

#### Optimistic Update (Used in App)
```
User Action → Update UI Immediately → API Call → On Error: Revert
```

**Example: Artist Signup**
```typescript
// 1. Show success toast immediately
toast.success('Signed up!');

// 2. Reset form
setName('');
setSongDescription('');

// 3. API call in background
await dataService.addArtist(...);

// 4. Socket.io broadcasts update
// 5. All clients refresh (including this one)
```

**Pros:**
- Feels instant to user
- Better UX

**Cons:**
- Need to handle rollback on error
- Can show stale data briefly

#### Pessimistic Update (Alternative)
```
User Action → Show Loading → API Call → Update UI → Hide Loading
```

**Example:**
```typescript
// 1. Show loading state
setSubmitting(true);

// 2. API call
await dataService.addArtist(...);

// 3. Update UI only after success
toast.success('Signed up!');
setSubmitting(false);
```

---

## Error Propagation

### Frontend Error Handling
```
Component
  ↓
try {
  OpenMicDataService
    ↓
  fetch('/api/endpoint')
    ↓
  Backend returns error
    ↓
  throw new Error(error.message)
} catch (error) {
  console.error('Error:', error);
  toast.error('Operation failed');
}
```

### Backend Error Handling
```
Route Handler
  ↓
try {
  Controller Logic
    ↓
  Database Operation
    ↓
  Error occurs
} catch (error) {
  next(createApiError('Failed to...', 500));
}
  ↓
Error Middleware
  ↓
res.json({
  success: false,
  error: {
    message: 'Failed to...',
    code: 'ERROR_CODE'
  }
})
```

---

## Database Transaction Patterns

### Artist Creation (No Transaction Needed)
```
1. INSERT INTO artists
   - Single operation
   - No dependencies
   - No rollback needed
```

### Mark as Performed (Manual Transaction)
```
1. SELECT artist details
2. INSERT INTO performance_log
3. DELETE FROM artists
   
If any step fails:
- Previous steps already committed
- Manual cleanup required
   
Future: Wrap in transaction
BEGIN;
  INSERT INTO performance_log...;
  DELETE FROM artists...;
COMMIT;
```

### Photo Upload (Multiple Steps)
```
1. Write file to disk
   - If fails: No database entry
2. INSERT INTO photos
   - If fails: File orphaned (manual cleanup)
   
Future: Implement cleanup of orphaned files
```

---

## Caching Strategy

### Current: No Caching
- All data fetched fresh on every request
- Real-time updates ensure consistency
- Small dataset (no performance issues)

### Future Optimization Options

#### Browser Caching
```typescript
// Cache artist list for 30 seconds
const [artists, setArtists] = useState([]);
const [lastFetch, setLastFetch] = useState(0);

const fetchArtists = async () => {
  const now = Date.now();
  if (now - lastFetch < 30000) {
    return; // Use cached data
  }
  
  const data = await dataService.getArtists();
  setArtists(data);
  setLastFetch(now);
};
```

#### Server-side Caching
```typescript
// Cache album list in memory
let albumCache = null;
let cacheTime = 0;

const getAlbums = async () => {
  if (albumCache && Date.now() - cacheTime < 60000) {
    return albumCache;
  }
  
  albumCache = await db.select().from(albums);
  cacheTime = Date.now();
  return albumCache;
};
```

---

## Rate Limiting (Future)

### Proposed Implementation
```typescript
// Express rate limiter
import rateLimit from 'express-rate-limit';

// Artist signup: 5 per 15 minutes
const signupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many signups, please try again later'
});

app.use('/api/artists', signupLimiter);

// Photo upload: 10 per hour
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: 'Upload limit reached, please try again later'
});

app.use('/api/photos', uploadLimiter);
```

---

## Performance Metrics

### Expected Response Times (Local)
- Artist CRUD: < 50ms
- Photo upload: 100-500ms (depends on file size)
- Album listing: < 30ms
- Real-time update propagation: < 100ms

### Database Query Performance
- Get all artists: ~10ms
- Get album with photos: ~20ms (N+1 query issue)
- Insert artist: ~5ms

### Network Latency (ngrok)
- Add ~100-200ms overhead
- Acceptable for event use case
- Customers are in venue (local WiFi preferred)

---

**Last Updated:** December 2, 2025  
**Version:** 1.0  
**Status:** Production Ready
