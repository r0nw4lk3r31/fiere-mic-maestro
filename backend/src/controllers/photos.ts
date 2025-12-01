import { Request, Response, NextFunction } from 'express';
import { db } from '../models';
import { photos, albums, settings } from '../models/schema';
import { eq, and, desc } from 'drizzle-orm';
import { createApiError } from '../middleware/errorHandler';
import { emitToPhotos } from '../services/socketService';
import { Photo } from '../types';
import path from 'path';
import fs from 'fs/promises';
import { randomUUID } from 'crypto';

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';

export const getPhotos = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { album_id, approved } = req.query;

    let whereClause = undefined;

    if (album_id) {
      whereClause = eq(photos.album_id, album_id as string);
    }

    if (approved !== undefined) {
      const approvedFilter = eq(photos.is_approved, approved === 'true');
      whereClause = whereClause ? and(whereClause, approvedFilter) : approvedFilter;
    }

    const result = await db
      .select({
        id: photos.id,
        album_id: photos.album_id,
        filename: photos.filename,
        original_name: photos.original_name,
        mime_type: photos.mime_type,
        size: photos.size,
        url: photos.url,
        is_approved: photos.is_approved,
        is_visible: photos.is_visible,
        uploaded_by: photos.uploaded_by,
        created_at: photos.created_at,
        updated_at: photos.updated_at,
        album_name: albums.name
      })
      .from(photos)
      .leftJoin(albums, eq(photos.album_id, albums.id))
      .where(whereClause)
      .orderBy(desc(photos.created_at));

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(createApiError('Failed to fetch photos', 500));
  }
};

export const getPhoto = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const result = await db
      .select()
      .from(photos)
      .where(eq(photos.id, id))
      .limit(1);

    if (result.length === 0) {
      return next(createApiError('Photo not found', 404));
    }

    res.json({
      success: true,
      data: result[0]
    });
  } catch (error) {
    next(createApiError('Failed to fetch photo', 500));
  }
};

export const uploadPhoto = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { album_id } = req.body;
    const file = req.file;

    if (!file) {
      return next(createApiError('No file uploaded', 400));
    }

    if (!album_id) {
      return next(createApiError('Album ID is required', 400));
    }

    // Verify album exists
    const albumExists = await db
      .select()
      .from(albums)
      .where(eq(albums.id, album_id))
      .limit(1);

    if (albumExists.length === 0) {
      return next(createApiError('Album not found', 404));
    }

    // Generate unique filename
    const fileExtension = path.extname(file.originalname);
    const filename = `${randomUUID()}${fileExtension}`;
    const fileUrl = `/uploads/${filename}`;

    // Move file to uploads directory
    const uploadPath = path.join(UPLOAD_DIR, filename);
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    await fs.writeFile(uploadPath, file.buffer);

    // Check if approval is required (default: false - photos visible immediately)
    const approvalSetting = await db
      .select()
      .from(settings)
      .where(eq(settings.key, 'require_photo_approval'))
      .limit(1);
    
    const requireApproval = approvalSetting.length > 0 && approvalSetting[0].value === 'true';

    // Save to database
    const result = await db
      .insert(photos)
      .values({
        album_id,
        filename,
        original_name: file.originalname,
        mime_type: file.mimetype,
        size: file.size,
        url: fileUrl,
        is_approved: !requireApproval, // Auto-approve if setting is off
        uploaded_by: req.ip || 'unknown'
      })
      .returning();

    const newPhoto = result[0];

    // Emit real-time update
    emitToPhotos('photo:uploaded', newPhoto);

    res.status(201).json({
      success: true,
      data: newPhoto
    });
  } catch (error) {
    next(createApiError('Failed to upload photo', 500));
  }
};

export const uploadDateMismatchPhoto = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { uploaded_by } = req.body;
    const file = req.file;

    if (!file) {
      return next(createApiError('No file uploaded', 400));
    }

    // Generate unique filename
    const fileExtension = path.extname(file.originalname);
    const filename = `${randomUUID()}${fileExtension}`;
    const fileUrl = `/uploads/${filename}`;

    // Move file to uploads directory
    const uploadPath = path.join(UPLOAD_DIR, filename);
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    await fs.writeFile(uploadPath, file.buffer);

    // Save to database with date_mismatch status and null album_id for now
    const result = await db
      .insert(photos)
      .values({
        album_id: null, // Will be assigned by admin
        filename,
        original_name: file.originalname,
        mime_type: file.mimetype,
        size: file.size,
        url: fileUrl,
        is_approved: false,
        review_status: 'date_mismatch',
        uploaded_by: uploaded_by || req.ip || 'unknown'
      })
      .returning();

    const newPhoto = result[0];

    // Emit real-time update for admin notification
    emitToPhotos('photo:date_mismatch', newPhoto);

    res.status(201).json({
      success: true,
      data: newPhoto
    });
  } catch (error) {
    next(createApiError('Failed to upload photo', 500));
  }
};

export const getDateMismatchPhotos = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await db
      .select()
      .from(photos)
      .where(eq(photos.review_status, 'date_mismatch'))
      .orderBy(desc(photos.created_at));

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(createApiError('Failed to fetch date mismatch photos', 500));
  }
};

export const assignDateMismatchPhoto = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { album_id } = req.body;

    if (!album_id) {
      return next(createApiError('Album ID is required', 400));
    }

    // Verify album exists
    const albumExists = await db
      .select()
      .from(albums)
      .where(eq(albums.id, album_id))
      .limit(1);

    if (albumExists.length === 0) {
      return next(createApiError('Album not found', 404));
    }

    // Update photo
    const result = await db
      .update(photos)
      .set({
        album_id,
        review_status: 'pending',
        updated_at: new Date()
      })
      .where(eq(photos.id, id))
      .returning();

    if (result.length === 0) {
      return next(createApiError('Photo not found', 404));
    }

    const updatedPhoto = result[0];

    // Emit real-time update
    emitToPhotos('photo:updated', updatedPhoto);

    res.json({
      success: true,
      data: updatedPhoto
    });
  } catch (error) {
    next(createApiError('Failed to assign photo to album', 500));
  }
};

export const updatePhoto = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { is_approved, is_visible } = req.body;

    const updateData: any = { updated_at: new Date() };
    if (is_approved !== undefined) updateData.is_approved = is_approved;
    if (is_visible !== undefined) updateData.is_visible = is_visible;

    const result = await db
      .update(photos)
      .set(updateData)
      .where(eq(photos.id, id))
      .returning();

    if (result.length === 0) {
      return next(createApiError('Photo not found', 404));
    }

    const updatedPhoto = result[0];

    // Emit real-time update
    emitToPhotos('photo:updated', updatedPhoto);

    res.json({
      success: true,
      data: updatedPhoto
    });
  } catch (error) {
    next(createApiError('Failed to update photo', 500));
  }
};

export const approvePhoto = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { approved } = req.body;

    const result = await db
      .update(photos)
      .set({
        is_approved: approved,
        updated_at: new Date()
      })
      .where(eq(photos.id, id))
      .returning();

    if (result.length === 0) {
      return next(createApiError('Photo not found', 404));
    }

    const updatedPhoto = result[0];

    // Emit real-time update
    emitToPhotos('photo:approved', updatedPhoto);

    res.json({
      success: true,
      data: updatedPhoto
    });
  } catch (error) {
    next(createApiError('Failed to update photo approval', 500));
  }
};

export const deletePhoto = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Get photo info first
    const photo = await db
      .select()
      .from(photos)
      .where(eq(photos.id, id))
      .limit(1);

    if (photo.length === 0) {
      return next(createApiError('Photo not found', 404));
    }

    // Delete file from filesystem
    const filePath = path.join(UPLOAD_DIR, photo[0].filename);
    try {
      await fs.unlink(filePath);
    } catch (fileError) {
      console.warn(`Could not delete file ${filePath}:`, fileError);
    }

    // Delete from database
    await db
      .delete(photos)
      .where(eq(photos.id, id));

    res.json({
      success: true,
      message: 'Photo deleted successfully'
    });
  } catch (error) {
    next(createApiError('Failed to delete photo', 500));
  }
};