import { db } from '../models';
import { sql } from 'drizzle-orm';
import dotenv from 'dotenv';

dotenv.config();

async function addFields() {
  try {
    console.log('Adding new fields to albums and photos tables...');

    // Add date field to albums table
    await db.execute(sql`
      ALTER TABLE albums 
      ADD COLUMN IF NOT EXISTS date TIMESTAMP NOT NULL DEFAULT NOW()
    `);
    console.log('✓ Added date field to albums table');

    // Add is_visible field to photos table
    await db.execute(sql`
      ALTER TABLE photos 
      ADD COLUMN IF NOT EXISTS is_visible BOOLEAN NOT NULL DEFAULT true
    `);
    console.log('✓ Added is_visible field to photos table');

    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

addFields();
