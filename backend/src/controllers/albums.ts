import { Request, Response, NextFunction } from 'express';
import { db } from '../models';
import { albums } from '../models/schema';
import { eq, desc } from 'drizzle-orm';
import { createApiError } from '../middleware/errorHandler';
import { emitToAlbums } from '../services/socketService';
import { Album, CreateAlbumRequest } from '../types';

export const getAlbums = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await db
      .select()
      .from(albums)
      .where(eq(albums.is_active, true))
      .orderBy(desc(albums.created_at));

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(createApiError('Failed to fetch albums', 500));
  }
};

export const getAlbum = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const result = await db
      .select()
      .from(albums)
      .where(eq(albums.id, id))
      .limit(1);

    if (result.length === 0) {
      return next(createApiError('Album not found', 404));
    }

    res.json({
      success: true,
      data: result[0]
    });
  } catch (error) {
    next(createApiError('Failed to fetch album', 500));
  }
};

export const createAlbum = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description, date, album_type, allow_customer_uploads }: CreateAlbumRequest = req.body;

    if (!name) {
      return next(createApiError('Name is required', 400));
    }

    const result = await db
      .insert(albums)
      .values({
        name,
        description,
        date: date ? new Date(date) : new Date(),
        is_active: true,
        album_type: album_type || 'event',
        allow_customer_uploads: allow_customer_uploads !== undefined ? allow_customer_uploads : true
      })
      .returning();

    const newAlbum = result[0];

    // Emit real-time update
    emitToAlbums('album:created', newAlbum);

    res.status(201).json({
      success: true,
      data: newAlbum
    });
  } catch (error) {
    next(createApiError('Failed to create album', 500));
  }
};

export const updateAlbum = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const result = await db
      .update(albums)
      .set({
        ...updates,
        updated_at: new Date()
      })
      .where(eq(albums.id, id))
      .returning();

    if (result.length === 0) {
      return next(createApiError('Album not found', 404));
    }

    const updatedAlbum = result[0];

    // Emit real-time update
    emitToAlbums('album:updated', updatedAlbum);

    res.json({
      success: true,
      data: updatedAlbum
    });
  } catch (error) {
    next(createApiError('Failed to update album', 500));
  }
};

export const deleteAlbum = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Soft delete by setting is_active to false
    const result = await db
      .update(albums)
      .set({
        is_active: false,
        updated_at: new Date()
      })
      .where(eq(albums.id, id))
      .returning();

    if (result.length === 0) {
      return next(createApiError('Album not found', 404));
    }

    res.json({
      success: true,
      message: 'Album deleted successfully'
    });
  } catch (error) {
    next(createApiError('Failed to delete album', 500));
  }
};

export const getTodaysEventAlbum = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get most recent active event album that allows customer uploads
    const result = await db
      .select()
      .from(albums)
      .orderBy(desc(albums.date))
      .limit(10);

    // Filter for event albums that allow customer uploads
    const eventAlbums = result.filter(album => 
      album.album_type === 'event' && 
      album.is_active && 
      album.allow_customer_uploads
    );

    if (eventAlbums.length === 0) {
      return res.json({
        success: true,
        data: null,
        message: 'No event album available for uploads'
      });
    }

    res.json({
      success: true,
      data: eventAlbums[0]
    });
  } catch (error) {
    next(createApiError('Failed to fetch today\'s event album', 500));
  }
};