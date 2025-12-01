# Fiere Mic Maestro - Backend API

Backend API server for the Open Mic management system with real-time updates.

## Features

- 🎤 **Artist Management** - CRUD operations for artists and lineup management
- 📸 **Photo Albums** - Upload, approve, and manage community photos
- 🔐 **Admin Authentication** - JWT-based authentication for admin users
- 📡 **Real-time Updates** - Socket.io for live synchronization across devices
- 🗄️ **PostgreSQL Database** - Robust data storage with Drizzle ORM

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL with Drizzle ORM
- **Real-time**: Socket.io
- **Authentication**: JWT
- **File Uploads**: Multer
- **TypeScript**: Full type safety

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 12+
- npm or yarn

### Installation

1. **Clone and navigate to backend:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your database connection:
   ```env
   DATABASE_URL=postgresql://username:password@localhost:5432/fiere_mic_maestro
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   ```

4. **Set up database:**
   ```bash
   # Create PostgreSQL database
   createdb fiere_mic_maestro

   # Run migrations
   npm run db:migrate

   # Seed initial data
   npm run db:seed
   ```

5. **Start development server:**
   ```bash
   npm run dev
   ```

The API will be available at `http://localhost:3001`

## API Endpoints

### Artists
- `GET /api/artists` - Get all artists
- `POST /api/artists` - Create artist
- `PUT /api/artists/:id` - Update artist
- `DELETE /api/artists/:id` - Delete artist
- `POST /api/artists/reorder` - Reorder lineup

### Albums
- `GET /api/albums` - Get all albums
- `POST /api/albums` - Create album
- `PUT /api/albums/:id` - Update album
- `DELETE /api/albums/:id` - Delete album

### Photos
- `GET /api/photos` - Get photos (with filters)
- `POST /api/photos` - Upload photo
- `PUT /api/photos/:id/approve` - Approve/reject photo
- `DELETE /api/photos/:id` - Delete photo

### Admin
- `POST /api/admin/login` - Admin login
- `POST /api/admin/users` - Create admin user
- `GET /api/admin/profile` - Get profile

## Real-time Events

Connect to the Socket.io server for live updates:

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3001');

// Join rooms for updates
socket.emit('join:lineup');
socket.emit('join:photos');
socket.emit('join:albums');

// Listen for events
socket.on('artist:created', (artist) => {
  console.log('New artist:', artist);
});

socket.on('photo:uploaded', (photo) => {
  console.log('New photo:', photo);
});
```

## Development

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run db:migrate` - Run database migrations
- `npm run db:seed` - Seed database with initial data

### Project Structure

```
backend/
├── src/
│   ├── controllers/     # Route handlers
│   ├── middleware/      # Express middleware
│   ├── models/          # Database models & schema
│   ├── routes/          # API routes
│   ├── services/        # Business logic & socket service
│   ├── types/           # TypeScript type definitions
│   ├── utils/           # Utility functions
│   └── scripts/         # Database scripts
├── uploads/             # File uploads directory
├── package.json
├── tsconfig.json
└── README.md
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `PORT` | Server port | 3001 |
| `JWT_SECRET` | JWT signing secret | Required |
| `NODE_ENV` | Environment mode | development |
| `FRONTEND_URL` | Frontend URL for CORS | http://localhost:8080 |
| `UPLOAD_DIR` | File upload directory | ./uploads |
| `MAX_FILE_SIZE` | Max upload size in bytes | 10485760 (10MB) |

## Deployment

1. Build the application:
   ```bash
   npm run build
   ```

2. Set production environment variables

3. Start the server:
   ```bash
   npm start
   ```

## License

MIT