import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../models';
import { adminUsers } from '../models/schema';
import { eq } from 'drizzle-orm';
import { createApiError } from '../middleware/errorHandler';
import { LoginRequest, AuthResponse } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
const SALT_ROUNDS = 12;

// Middleware to verify JWT token
export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return next(createApiError('Access token required', 401));
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      return next(createApiError('Invalid token', 403));
    }
    (req as any).user = user;
    next();
  });
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, password }: LoginRequest = req.body;

    if (!username || !password) {
      return next(createApiError('Username and password are required', 400));
    }

    // Find user
    const users = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.username, username))
      .limit(1);

    if (users.length === 0) {
      return next(createApiError('Invalid credentials', 401));
    }

    const user = users[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return next(createApiError('Invalid credentials', 401));
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    const response: AuthResponse = {
      token,
      user: {
        id: user.id,
        username: user.username
      }
    };

    res.json({
      success: true,
      data: response
    });
  } catch (error) {
    next(createApiError('Login failed', 500));
  }
};

export const createAdminUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return next(createApiError('Username and password are required', 400));
    }

    if (password.length < 8) {
      return next(createApiError('Password must be at least 8 characters', 400));
    }

    // Check if user already exists
    const existingUser = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.username, username))
      .limit(1);

    if (existingUser.length > 0) {
      return next(createApiError('Username already exists', 409));
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Create user
    const result = await db
      .insert(adminUsers)
      .values({
        username,
        password_hash: passwordHash
      })
      .returning();

    const newUser = result[0];

    res.status(201).json({
      success: true,
      data: {
        id: newUser.id,
        username: newUser.username,
        created_at: newUser.created_at
      }
    });
  } catch (error) {
    next(createApiError('Failed to create admin user', 500));
  }
};

export const getProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;

    res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username
      }
    });
  } catch (error) {
    next(createApiError('Failed to get profile', 500));
  }
};