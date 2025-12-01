import { Router } from 'express';
import {
  login,
  createAdminUser,
  getProfile,
  authenticateToken
} from '../controllers/admin';

const router = Router();

// POST /api/admin/login - Admin login
router.post('/login', login);

// POST /api/admin/users - Create new admin user (protected)
router.post('/users', authenticateToken, createAdminUser);

// GET /api/admin/profile - Get current user profile (protected)
router.get('/profile', authenticateToken, getProfile);

export default router;