import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('DATABASE_URL:', process.env.DATABASE_URL);

// Global error handlers to capture unhandled errors and rejections
process.on('uncaughtException', (err) => {
  console.error('uncaughtException:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('unhandledRejection:', reason);
});

import { db } from './models';
import artistRoutes from './routes/artists';
import photoRoutes from './routes/photos';
import albumRoutes from './routes/albums';
import adminRoutes from './routes/admin';
import settingsRoutes from './routes/settings';
import { errorHandler } from './middleware/errorHandler';
import { setupSocketHandlers } from './services/socketService';

const app = express();
const server = createServer(app);

// Allow multiple frontend origins (local dev + production)
// Use wildcard pattern for Vercel preview deployments
const allowedOrigins: (string | RegExp)[] = [
  "http://localhost:8080",
  "http://localhost:8081", // Vite alternate port
  /^https:\/\/fiere-mic-maestro-.*\.vercel\.app$/, // All Vercel deployments
  process.env.FRONTEND_URL
].filter(Boolean);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files for uploads with CORS and ngrok headers
app.use('/uploads', (req, res, next) => {
  // CORS headers for images
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  // ngrok bypass header
  res.setHeader('ngrok-skip-browser-warning', 'true');
  next();
}, express.static('uploads'));

// Routes
app.use('/api/artists', artistRoutes);
app.use('/api/photos', photoRoutes);
app.use('/api/albums', albumRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/settings', settingsRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling
app.use(errorHandler);

// Socket.io setup
setupSocketHandlers(io);

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Socket.io enabled`);
  console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || "http://localhost:8080"}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

export { app, server, io };