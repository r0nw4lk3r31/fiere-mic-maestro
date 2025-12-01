import { Request, Response, NextFunction } from 'express';
import { db } from '../models';
import { artists } from '../models/schema';
import { eq, asc, desc } from 'drizzle-orm';
import { createApiError } from '../middleware/errorHandler';
import { emitToLineup } from '../services/socketService';
import { Artist, CreateArtistRequest, UpdateArtistRequest } from '../types';

export const getArtists = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await db
      .select()
      .from(artists)
      .orderBy(asc(artists.performance_order), asc(artists.created_at));

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(createApiError('Failed to fetch artists', 500));
  }
};

export const getArtist = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const result = await db
      .select()
      .from(artists)
      .where(eq(artists.id, id))
      .limit(1);

    if (result.length === 0) {
      return next(createApiError('Artist not found', 404));
    }

    res.json({
      success: true,
      data: result[0]
    });
  } catch (error) {
    next(createApiError('Failed to fetch artist', 500));
  }
};

export const createArtist = async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log('createArtist invoked');
    const { name, song_description, preferred_time }: CreateArtistRequest = req.body;

    if (!name) {
      return next(createApiError('Name is required', 400));
    }

    // Get the highest performance order
    const lastArtist = await db
      .select({ performance_order: artists.performance_order })
      .from(artists)
      .orderBy(desc(artists.performance_order))
      .limit(1);

    const nextOrder = lastArtist.length > 0 ? (lastArtist[0].performance_order ?? 0) + 1 : 0;

    console.log('Creating artist:', { name, song_description, preferred_time, performance_order: nextOrder });

    const result = await db
      .insert(artists)
      .values({
        name,
        song_description,
        preferred_time,
        performance_order: nextOrder
      })
      .returning();

    console.log('Insert result:', result);

    const newArtist = result[0];

    // Emit real-time update
    emitToLineup('artist:created', newArtist);

    res.status(201).json({
      success: true,
      data: newArtist
    });
  } catch (error) {
    console.error('Database error in createArtist:', error);
    try {
      console.error('Error stack:', (error as any).stack);
    } catch (e) {}
    next(createApiError('Failed to create artist', 500));
  }
};

export const updateArtist = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const updates: UpdateArtistRequest = req.body;

    console.log('updateArtist called:', { id, updates });

    // Only allow specific fields to be updated, exclude id and timestamps
    const { name, song_description, preferred_time, performance_order } = updates;
    const updateData: any = {};
    
    if (name !== undefined) updateData.name = name;
    if (song_description !== undefined) updateData.song_description = song_description;
    if (preferred_time !== undefined) updateData.preferred_time = preferred_time;
    if (performance_order !== undefined) updateData.performance_order = performance_order;
    
    // Always set updated_at to current time
    updateData.updated_at = new Date();

    const result = await db
      .update(artists)
      .set(updateData)
      .where(eq(artists.id, id))
      .returning();

    if (result.length === 0) {
      return next(createApiError('Artist not found', 404));
    }

    const updatedArtist = result[0];

    // Emit real-time update
    emitToLineup('artist:updated', updatedArtist);

    res.json({
      success: true,
      data: updatedArtist
    });
  } catch (error) {
    console.error('Error in updateArtist:', error);
    console.error('Error stack:', (error as any).stack);
    next(createApiError('Failed to update artist', 500));
  }
};

export const deleteArtist = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const result = await db
      .delete(artists)
      .where(eq(artists.id, id))
      .returning();

    if (result.length === 0) {
      return next(createApiError('Artist not found', 404));
    }

    // Emit real-time update
    emitToLineup('artist:deleted', id);

    res.json({
      success: true,
      message: 'Artist deleted successfully'
    });
  } catch (error) {
    next(createApiError('Failed to delete artist', 500));
  }
};

export const reorderArtists = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { artistIds }: { artistIds: string[] } = req.body;

    if (!Array.isArray(artistIds)) {
      return next(createApiError('artistIds must be an array', 400));
    }

    // Update performance order for each artist
    const updates = artistIds.map((id, index) =>
      db
        .update(artists)
        .set({
          performance_order: index,
          updated_at: new Date()
        })
        .where(eq(artists.id, id))
    );

    await Promise.all(updates);

    // Fetch updated artists
    const result = await db
      .select()
      .from(artists)
      .orderBy(asc(artists.performance_order));

    // Emit real-time update
    emitToLineup('artists:reordered', result);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(createApiError('Failed to reorder artists', 500));
  }
};