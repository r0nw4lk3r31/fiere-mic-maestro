# 📡 API Reference - Fiere Mic Maestro

Complete REST API documentation for backend endpoints.

---

## Base URL

```
Development: http://localhost:3001
Production:  https://your-ngrok-url.ngrok-free.app
```

---

## Authentication

### Overview
Protected endpoints require a JWT token in the Authorization header.

### Headers
```http
Authorization: Bearer <your-jwt-token>
Content-Type: application/json
ngrok-skip-browser-warning: true  # For ngrok deployments
```

### Token Acquisition
Obtain a token via the `/api/admin/login` endpoint.

---

## Response Format

### Success Response
```json
{
  "success": true,
  "data": {
    // Response data here
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE"
  }
}
```

### HTTP Status Codes
- `200` OK - Request successful
- `201` Created - Resource created successfully
- `400` Bad Request - Invalid request data
- `401` Unauthorized - Authentication required
- `403` Forbidden - Invalid token
- `404` Not Found - Resource doesn't exist
- `409` Conflict - Resource already exists
- `500` Internal Server Error - Server error

---

## Artists Endpoints

### Get All Artists
```http
GET /api/artists
```

**Description:** Retrieve all artists in tonight's lineup, ordered by performance_order.

**Auth Required:** No

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "John Doe",
      "song_description": "Original acoustic songs",
      "preferred_time": "Early",
      "performance_order": 0,
      "is_regular": false,
      "created_at": "2025-12-02T20:00:00Z",
      "updated_at": "2025-12-02T20:00:00Z"
    }
  ]
}
```

---

### Get Single Artist
```http
GET /api/artists/:id
```

**Description:** Retrieve a specific artist by ID.

**Auth Required:** No

**URL Parameters:**
- `id` (string, required) - Artist UUID

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "John Doe",
    "song_description": "Original acoustic songs",
    "preferred_time": "Early",
    "performance_order": 0,
    "is_regular": false,
    "created_at": "2025-12-02T20:00:00Z",
    "updated_at": "2025-12-02T20:00:00Z"
  }
}
```

---

### Create Artist
```http
POST /api/artists
```

**Description:** Add a new artist to the lineup.

**Auth Required:** No

**Request Body:**
```json
{
  "name": "John Doe",  // required
  "song_description": "Original acoustic songs",  // optional
  "preferred_time": "Early",  // optional
  "is_regular": false  // optional, default: false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "John Doe",
    "song_description": "Original acoustic songs",
    "preferred_time": "Early",
    "performance_order": 5,  // auto-assigned
    "is_regular": false,
    "created_at": "2025-12-02T20:00:00Z",
    "updated_at": "2025-12-02T20:00:00Z"
  }
}
```

**Socket.io Event:** Emits `artist:created` to all connected clients.

---

### Update Artist
```http
PUT /api/artists/:id
```

**Description:** Update an existing artist's information.

**Auth Required:** No (but typically used by admin)

**URL Parameters:**
- `id` (string, required) - Artist UUID

**Request Body:**
```json
{
  "name": "John Smith",  // optional
  "song_description": "Blues covers",  // optional
  "preferred_time": "Late",  // optional
  "performance_order": 2,  // optional
  "is_regular": true  // optional
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "John Smith",
    "song_description": "Blues covers",
    "preferred_time": "Late",
    "performance_order": 2,
    "is_regular": true,
    "created_at": "2025-12-02T20:00:00Z",
    "updated_at": "2025-12-02T21:00:00Z"
  }
}
```

**Socket.io Event:** Emits `artist:updated` to all connected clients.

---

### Delete Artist
```http
DELETE /api/artists/:id
```

**Description:** Remove an artist from the lineup.

**Auth Required:** No (but typically used by admin)

**URL Parameters:**
- `id` (string, required) - Artist UUID

**Response:**
```json
{
  "success": true,
  "message": "Artist deleted successfully"
}
```

**Socket.io Event:** Emits `artist:deleted` with artist ID to all connected clients.

---

### Reorder Artists
```http
POST /api/artists/reorder
```

**Description:** Update the performance order of multiple artists at once.

**Auth Required:** No (but typically used by admin)

**Request Body:**
```json
{
  "artistIds": [
    "uuid-3",  // Will be order 0
    "uuid-1",  // Will be order 1
    "uuid-2"   // Will be order 2
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-3",
      "name": "Artist 3",
      "performance_order": 0,
      ...
    },
    {
      "id": "uuid-1",
      "name": "Artist 1",
      "performance_order": 1,
      ...
    }
  ]
}
```

**Socket.io Event:** Emits `artists:reordered` with full artist list to all connected clients.

---

### Get Regular Artists
```http
GET /api/artists/regulars/list
```

**Description:** Retrieve all saved regular artists (is_regular = true).

**Auth Required:** No (but typically used by admin)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Jane Regular",
      "song_description": "Folk music",
      "preferred_time": "Anytime",
      "performance_order": 0,
      "is_regular": true,
      "created_at": "2025-11-01T20:00:00Z",
      "updated_at": "2025-11-01T20:00:00Z"
    }
  ]
}
```

---

### Mark Artist as Performed
```http
POST /api/artists/:id/performed
```

**Description:** Log artist performance to history and remove from active lineup.

**Auth Required:** No (but typically used by admin)

**URL Parameters:**
- `id` (string, required) - Artist UUID

**Response:**
```json
{
  "success": true,
  "message": "Artist marked as performed and logged"
}
```

**Side Effects:**
1. Inserts record into `performance_log` table
2. Deletes artist from `artists` table
3. Emits `artist:performed` socket event

**Socket.io Event:** Emits `artist:performed` with `{ id, name }`.

---

### Get Performance History
```http
GET /api/artists/history/list?limit=50
```

**Description:** Retrieve historical performance log.

**Auth Required:** No (but typically used by admin)

**Query Parameters:**
- `limit` (number, optional) - Max results, default: 50

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "artist_name": "John Doe",
      "song_description": "Original acoustic songs",
      "performed_at": "2025-12-02T22:30:00Z",
      "created_at": "2025-12-02T22:30:00Z"
    }
  ]
}
```

---

## Albums Endpoints

### Get All Albums
```http
GET /api/albums
```

**Description:** Retrieve all active albums (is_active = true).

**Auth Required:** No

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Open Mic Night - December 2",
      "description": "Great performances tonight!",
      "date": "2025-12-02T00:00:00Z",
      "is_active": true,
      "album_type": "event",
      "allow_customer_uploads": true,
      "created_at": "2025-12-02T18:00:00Z",
      "updated_at": "2025-12-02T18:00:00Z"
    }
  ]
}
```

---

### Get Single Album
```http
GET /api/albums/:id
```

**Description:** Retrieve a specific album by ID (without photos).

**Auth Required:** No

**URL Parameters:**
- `id` (string, required) - Album UUID

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Open Mic Night - December 2",
    "description": "Great performances tonight!",
    "date": "2025-12-02T00:00:00Z",
    "is_active": true,
    "album_type": "event",
    "allow_customer_uploads": true,
    "created_at": "2025-12-02T18:00:00Z",
    "updated_at": "2025-12-02T18:00:00Z"
  }
}
```

**Note:** To get photos, use `GET /api/photos?album_id=<album_id>`

---

### Create Album
```http
POST /api/albums
```

**Description:** Create a new photo album.

**Auth Required:** Yes (admin)

**Request Body:**
```json
{
  "name": "Open Mic Night - December 2",  // required
  "description": "Great performances tonight!",  // optional
  "date": "2025-12-02T00:00:00Z",  // optional, default: now
  "album_type": "event",  // optional, default: "event"
  "allow_customer_uploads": true  // optional, default: true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Open Mic Night - December 2",
    "description": "Great performances tonight!",
    "date": "2025-12-02T00:00:00Z",
    "is_active": true,
    "album_type": "event",
    "allow_customer_uploads": true,
    "created_at": "2025-12-02T18:00:00Z",
    "updated_at": "2025-12-02T18:00:00Z"
  }
}
```

**Socket.io Event:** Emits `album:created` to all connected clients.

---

### Update Album
```http
PUT /api/albums/:id
```

**Description:** Update an existing album's information.

**Auth Required:** Yes (admin)

**URL Parameters:**
- `id` (string, required) - Album UUID

**Request Body:**
```json
{
  "name": "Open Mic Night - December 2 (Updated)",  // optional
  "description": "Amazing night!",  // optional
  "is_active": false,  // optional
  "allow_customer_uploads": false  // optional
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Open Mic Night - December 2 (Updated)",
    "description": "Amazing night!",
    "date": "2025-12-02T00:00:00Z",
    "is_active": false,
    "album_type": "event",
    "allow_customer_uploads": false,
    "created_at": "2025-12-02T18:00:00Z",
    "updated_at": "2025-12-02T21:00:00Z"
  }
}
```

**Socket.io Event:** Emits `album:updated` to all connected clients.

---

### Delete Album
```http
DELETE /api/albums/:id
```

**Description:** Soft delete an album (sets is_active = false).

**Auth Required:** Yes (admin)

**URL Parameters:**
- `id` (string, required) - Album UUID

**Response:**
```json
{
  "success": true,
  "message": "Album deleted successfully"
}
```

**Note:** This is a soft delete. Photos are NOT deleted. Album is hidden from customer view.

---

### Get Today's Event Album
```http
GET /api/albums/today-event
```

**Description:** Find an active event album matching today's date (for customer uploads).

**Auth Required:** No

**Response (album found):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Open Mic Night - December 2",
    "date": "2025-12-02T00:00:00Z",
    "is_active": true,
    "album_type": "event",
    "allow_customer_uploads": true,
    ...
  }
}
```

**Response (no album found):**
```json
{
  "success": true,
  "data": null,
  "message": "No event album available for today. Please check back on the event date!"
}
```

**Logic:**
1. Fetches active albums where `album_type = 'event'`
2. Filters for albums where `date` matches today (midnight comparison)
3. Returns first match or null

---

## Photos Endpoints

### Get Photos
```http
GET /api/photos?album_id=<uuid>&approved=true
```

**Description:** Retrieve photos with optional filtering.

**Auth Required:** No

**Query Parameters:**
- `album_id` (string, optional) - Filter by album UUID
- `approved` (boolean, optional) - Filter by approval status ('true' or 'false')

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "album_id": "uuid",
      "filename": "a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg",
      "original_name": "my-photo.jpg",
      "mime_type": "image/jpeg",
      "size": 2048576,
      "url": "/uploads/a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg",
      "is_approved": true,
      "is_visible": true,
      "uploaded_by": "John Doe",
      "created_at": "2025-12-02T21:00:00Z",
      "updated_at": "2025-12-02T21:00:00Z",
      "album_name": "Open Mic Night - December 2"
    }
  ]
}
```

**Note:** Automatically excludes `date_mismatch` photos (use date-mismatch endpoint for those).

---

### Get Single Photo
```http
GET /api/photos/:id
```

**Description:** Retrieve a specific photo by ID.

**Auth Required:** No

**URL Parameters:**
- `id` (string, required) - Photo UUID

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "album_id": "uuid",
    "filename": "a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg",
    "original_name": "my-photo.jpg",
    "mime_type": "image/jpeg",
    "size": 2048576,
    "url": "/uploads/a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg",
    "is_approved": true,
    "is_visible": true,
    "uploaded_by": "John Doe",
    "created_at": "2025-12-02T21:00:00Z",
    "updated_at": "2025-12-02T21:00:00Z"
  }
}
```

---

### Upload Photo
```http
POST /api/photos
```

**Description:** Upload a photo to an album.

**Auth Required:** No

**Content-Type:** `multipart/form-data`

**Form Fields:**
- `photo` (file, required) - Image file (max 10MB)
- `album_id` (string, required) - Target album UUID
- `caption` (string, optional) - Photo caption

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "album_id": "uuid",
    "filename": "a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg",
    "original_name": "my-photo.jpg",
    "mime_type": "image/jpeg",
    "size": 2048576,
    "url": "/uploads/a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg",
    "is_approved": false,  // or true, depends on setting
    "is_visible": true,
    "uploaded_by": "192.168.1.100",
    "created_at": "2025-12-02T21:00:00Z",
    "updated_at": "2025-12-02T21:00:00Z"
  }
}
```

**Approval Logic:**
- Checks `require_photo_approval` setting
- If `false`: `is_approved = true` (visible immediately)
- If `true`: `is_approved = false` (needs admin review)

**Socket.io Event:** Emits `photo:uploaded` to all connected clients.

**Error Cases:**
- `400` - No file uploaded
- `400` - Album ID missing
- `404` - Album not found

---

### Upload Date Mismatch Photo
```http
POST /api/photos/date-mismatch
```

**Description:** Upload a photo when no matching event album exists for today.

**Auth Required:** No

**Content-Type:** `multipart/form-data`

**Form Fields:**
- `photo` (file, required) - Image file (max 10MB)
- `uploaded_by` (string, required) - Uploader name
- `caption` (string, optional) - Photo caption

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "album_id": null,  // Not assigned yet
    "filename": "a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg",
    "original_name": "my-photo.jpg",
    "mime_type": "image/jpeg",
    "size": 2048576,
    "url": "/uploads/a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg",
    "is_approved": false,
    "is_visible": true,
    "uploaded_by": "John Doe",
    "review_status": "date_mismatch",
    "created_at": "2025-12-02T21:00:00Z",
    "updated_at": "2025-12-02T21:00:00Z"
  }
}
```

**Socket.io Event:** Emits `photo:date_mismatch` to admin clients.

**Note:** Photo will be auto-deleted after 3 hours if not assigned to an album.

---

### Get Date Mismatch Photos
```http
GET /api/photos/date-mismatch/list
```

**Description:** Retrieve all photos with date_mismatch status (admin only).

**Auth Required:** Yes (admin)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "album_id": null,
      "filename": "a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg",
      "original_name": "my-photo.jpg",
      "mime_type": "image/jpeg",
      "size": 2048576,
      "url": "/uploads/a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg",
      "is_approved": false,
      "is_visible": true,
      "uploaded_by": "John Doe",
      "review_status": "date_mismatch",
      "created_at": "2025-12-02T21:00:00Z",
      "updated_at": "2025-12-02T21:00:00Z"
    }
  ]
}
```

---

### Assign Date Mismatch Photo to Album
```http
PUT /api/photos/:id/assign
```

**Description:** Assign a date mismatch photo to an album.

**Auth Required:** Yes (admin)

**URL Parameters:**
- `id` (string, required) - Photo UUID

**Request Body:**
```json
{
  "album_id": "uuid"  // required
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "album_id": "uuid",  // Now assigned
    "review_status": "pending",  // Changed from date_mismatch
    ...
  }
}
```

**Socket.io Event:** Emits `photo:updated` to all connected clients.

---

### Update Photo
```http
PUT /api/photos/:id
```

**Description:** Update photo metadata (approval, visibility).

**Auth Required:** Yes (admin)

**URL Parameters:**
- `id` (string, required) - Photo UUID

**Request Body:**
```json
{
  "is_approved": true,  // optional
  "is_visible": false   // optional
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "is_approved": true,
    "is_visible": false,
    "updated_at": "2025-12-02T22:00:00Z",
    ...
  }
}
```

**Socket.io Event:** Emits `photo:updated` to all connected clients.

---

### Approve/Reject Photo
```http
PUT /api/photos/:id/approve
```

**Description:** Approve or reject a pending photo.

**Auth Required:** Yes (admin)

**URL Parameters:**
- `id` (string, required) - Photo UUID

**Request Body:**
```json
{
  "approved": true  // required, true or false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "is_approved": true,
    "updated_at": "2025-12-02T22:00:00Z",
    ...
  }
}
```

**Socket.io Event:** Emits `photo:approved` to all connected clients.

---

### Delete Photo
```http
DELETE /api/photos/:id
```

**Description:** Permanently delete a photo and its file.

**Auth Required:** Yes (admin)

**URL Parameters:**
- `id` (string, required) - Photo UUID

**Response:**
```json
{
  "success": true,
  "message": "Photo deleted successfully"
}
```

**Side Effects:**
1. Deletes physical file from `/uploads/` directory
2. Deletes database record

---

## Admin Endpoints

### Admin Login
```http
POST /api/admin/login
```

**Description:** Authenticate admin user and receive JWT token.

**Auth Required:** No

**Request Body:**
```json
{
  "username": "admin",  // required
  "password": "password123"  // required
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid",
      "username": "admin"
    }
  }
}
```

**Token Expiration:** 24 hours

**Error Cases:**
- `400` - Username or password missing
- `401` - Invalid credentials

---

### Create Admin User
```http
POST /api/admin/users
```

**Description:** Create a new admin user account.

**Auth Required:** No (but should be protected in production)

**Request Body:**
```json
{
  "username": "newadmin",  // required
  "password": "securePassword123"  // required, min 8 characters
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "username": "newadmin",
    "created_at": "2025-12-02T22:00:00Z"
  }
}
```

**Error Cases:**
- `400` - Username or password missing
- `400` - Password less than 8 characters
- `409` - Username already exists

---

### Get Admin Profile
```http
GET /api/admin/profile
```

**Description:** Get current authenticated admin user info.

**Auth Required:** Yes

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "username": "admin"
  }
}
```

---

## Settings Endpoints

### Get Setting
```http
GET /api/settings/:key
```

**Description:** Retrieve a setting value by key.

**Auth Required:** No

**URL Parameters:**
- `key` (string, required) - Setting key

**Response (setting exists):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "key": "require_photo_approval",
    "value": "true",
    "created_at": "2025-12-01T00:00:00Z",
    "updated_at": "2025-12-02T20:00:00Z"
  }
}
```

**Response (setting doesn't exist):**
```json
{
  "success": true,
  "data": null
}
```

---

### Update Setting
```http
PUT /api/settings/:key
```

**Description:** Update or create a setting.

**Auth Required:** Yes (admin)

**URL Parameters:**
- `key` (string, required) - Setting key

**Request Body:**
```json
{
  "value": "true"  // required, stored as string
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "key": "require_photo_approval",
    "value": "true",
    "created_at": "2025-12-01T00:00:00Z",
    "updated_at": "2025-12-02T22:00:00Z"
  }
}
```

**Note:** If setting doesn't exist, it will be created. If it exists, it will be updated.

---

## Static File Endpoints

### Get Uploaded File
```http
GET /uploads/:filename
```

**Description:** Serve an uploaded photo file.

**Auth Required:** No

**URL Parameters:**
- `filename` (string, required) - UUID filename with extension

**Response:** Binary image data

**Headers:**
```http
Content-Type: image/jpeg  (or png, gif, etc.)
Access-Control-Allow-Origin: *
Cross-Origin-Resource-Policy: cross-origin
ngrok-skip-browser-warning: true
```

**Error Cases:**
- `404` - File not found

---

## Health Check Endpoint

### Health Check
```http
GET /health
```

**Description:** Check if the server is running.

**Auth Required:** No

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2025-12-02T22:00:00.000Z"
}
```

---

## Socket.io Events Reference

### Connection Events
```javascript
// Client connects
socket.emit('join:lineup');
socket.emit('join:photos');
socket.emit('join:albums');

// Server acknowledges
// (no explicit response)
```

### Artist Events
```javascript
// Server → Client
socket.on('artist:created', (artist) => { ... });
socket.on('artist:updated', (artist) => { ... });
socket.on('artist:deleted', (artistId) => { ... });
socket.on('artists:reordered', (artists) => { ... });
socket.on('artist:performed', ({ id, name }) => { ... });
```

### Photo Events
```javascript
// Server → Client
socket.on('photo:uploaded', (photo) => { ... });
socket.on('photo:approved', (photo) => { ... });
socket.on('photo:updated', (photo) => { ... });
socket.on('photo:date_mismatch', (photo) => { ... });
```

### Album Events
```javascript
// Server → Client
socket.on('album:created', (album) => { ... });
socket.on('album:updated', (album) => { ... });
```

---

## Rate Limits

### Current Implementation
- No rate limiting implemented on backend
- ngrok free tier: 40 requests/minute

### Recommended for Production
- Implement express-rate-limit
- Artist signup: 5 requests/minute per IP
- Photo upload: 3 requests/minute per IP
- Admin endpoints: 100 requests/minute with JWT

---

## CORS Configuration

### Allowed Origins
```javascript
const allowedOrigins = [
  "http://localhost:8080",
  "http://localhost:8081",
  /^https:\/\/fiere-mic-maestro-.*\.vercel\.app$/,  // All Vercel deployments
  process.env.FRONTEND_URL
];
```

### Headers
```
Access-Control-Allow-Origin: <origin>
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Credentials: true
```

---

## Error Codes Reference

| Code | Message | HTTP Status |
|------|---------|-------------|
| `VALIDATION_ERROR` | Invalid request data | 400 |
| `AUTH_REQUIRED` | Access token required | 401 |
| `INVALID_TOKEN` | Invalid token | 403 |
| `NOT_FOUND` | Resource not found | 404 |
| `CONFLICT` | Resource already exists | 409 |
| `SERVER_ERROR` | Internal server error | 500 |

---

## Best Practices

### API Client Implementation
1. **Use OpenMicDataService** - Don't call endpoints directly
2. **Handle Errors Gracefully** - Always wrap in try/catch
3. **Include ngrok Header** - Add `ngrok-skip-browser-warning: true`
4. **Store JWT Securely** - Use localStorage, check expiration
5. **Listen for Socket Events** - Keep UI in sync with real-time updates

### Example Client Usage
```typescript
// Good ✅
const dataService = getGlobalDataService();
try {
  const artists = await dataService.getArtists();
  console.log(artists);
} catch (error) {
  console.error('Failed to fetch artists:', error);
  toast.error('Failed to load artists');
}

// Bad ❌
fetch('http://localhost:3001/api/artists')
  .then(res => res.json())
  .then(data => console.log(data));
```

---

**Last Updated:** December 2, 2025  
**API Version:** 1.0  
**Base URL:** http://localhost:3001 (development)
