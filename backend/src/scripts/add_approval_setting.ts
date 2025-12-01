import { db } from '../models';
import { settings } from '../models/schema';
import { eq } from 'drizzle-orm';
import dotenv from 'dotenv';

dotenv.config();

async function addApprovalSetting() {
  try {
    console.log('Adding photo approval setting...');

    // Check if setting already exists
    const existing = await db
      .select()
      .from(settings)
      .where(eq(settings.key, 'require_photo_approval'))
      .limit(1);

    if (existing.length > 0) {
      console.log('Setting already exists, updating...');
      await db
        .update(settings)
        .set({ value: 'false' }) // Off by default
        .where(eq(settings.key, 'require_photo_approval'));
    } else {
      console.log('Creating new setting...');
      await db
        .insert(settings)
        .values({
          key: 'require_photo_approval',
          value: 'false' // Off by default - photos are visible immediately
        });
    }

    console.log('✓ Photo approval setting added/updated');
    console.log('Default: OFF (photos visible immediately, admin can toggle on for moderation)');
    process.exit(0);
  } catch (error) {
    console.error('Failed to add setting:', error);
    process.exit(1);
  }
}

addApprovalSetting();
