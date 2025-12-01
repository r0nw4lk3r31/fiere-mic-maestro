import { db } from '../models';
import { photos } from '../models/schema';
import { eq, and, lt } from 'drizzle-orm';
import path from 'path';
import fs from 'fs/promises';

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const CLEANUP_INTERVAL_MS = 15 * 60 * 1000; // Run every 15 minutes
const MAX_AGE_MS = 3 * 60 * 60 * 1000; // 3 hours

/**
 * Delete date_mismatch photos older than 3 hours
 */
export async function cleanupOldDateMismatchPhotos() {
  try {
    const threeHoursAgo = new Date(Date.now() - MAX_AGE_MS);

    // Find old date_mismatch photos
    const oldPhotos = await db
      .select()
      .from(photos)
      .where(
        and(
          eq(photos.review_status, 'date_mismatch'),
          lt(photos.created_at, threeHoursAgo)
        )
      );

    if (oldPhotos.length === 0) {
      console.log('[Cleanup] No old date mismatch photos to delete');
      return;
    }

    console.log(`[Cleanup] Deleting ${oldPhotos.length} old date mismatch photos`);

    // Delete files and database entries
    for (const photo of oldPhotos) {
      // Delete file
      const filePath = path.join(UPLOAD_DIR, photo.filename);
      try {
        await fs.unlink(filePath);
        console.log(`[Cleanup] Deleted file: ${photo.filename}`);
      } catch (fileError) {
        console.warn(`[Cleanup] Could not delete file ${filePath}:`, fileError);
      }

      // Delete from database
      await db
        .delete(photos)
        .where(eq(photos.id, photo.id));
    }

    console.log(`[Cleanup] Successfully deleted ${oldPhotos.length} old date mismatch photos`);
  } catch (error) {
    console.error('[Cleanup] Error during cleanup:', error);
  }
}

/**
 * Start the cleanup job (runs every 15 minutes)
 */
export function startCleanupJob() {
  console.log('[Cleanup] Starting date mismatch photo cleanup job (runs every 15 minutes)');
  
  // Run immediately on startup
  cleanupOldDateMismatchPhotos();

  // Then run every 15 minutes
  setInterval(cleanupOldDateMismatchPhotos, CLEANUP_INTERVAL_MS);
}
