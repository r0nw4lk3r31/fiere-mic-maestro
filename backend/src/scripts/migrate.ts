import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../models/schema';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function migrate() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('❌ DATABASE_URL environment variable is required');
    process.exit(1);
  }

  console.log('🚀 Starting database migration...');

  const client = postgres(connectionString, { prepare: false });
  const db = drizzle(client, { schema });

  try {
    // Enable UUID extension
    console.log('🔧 Enabling UUID extension...');
    await client`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`;

    // Create tables
    console.log('📋 Creating tables...');

    // Artists table
    await client`
      CREATE TABLE IF NOT EXISTS artists (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        song_description TEXT,
        preferred_time TEXT,
        performance_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `;

    // Albums table
    await client`
      CREATE TABLE IF NOT EXISTS albums (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `;

    // Photos table
    await client`
      CREATE TABLE IF NOT EXISTS photos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        album_id UUID REFERENCES albums(id) ON DELETE CASCADE,
        filename TEXT NOT NULL,
        original_name TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        size INTEGER NOT NULL,
        url TEXT NOT NULL,
        is_approved BOOLEAN DEFAULT FALSE,
        uploaded_by TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `;

    // Admin users table
    await client`
      CREATE TABLE IF NOT EXISTS admin_users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `;

    // Settings table
    await client`
      CREATE TABLE IF NOT EXISTS settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        key TEXT NOT NULL UNIQUE,
        value TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `;

    console.log('✅ Tables created successfully');

    // Create indexes
    console.log('🔍 Creating indexes...');

    await client`CREATE INDEX IF NOT EXISTS idx_artists_performance_order ON artists(performance_order);`;
    await client`CREATE INDEX IF NOT EXISTS idx_photos_album_id ON photos(album_id);`;
    await client`CREATE INDEX IF NOT EXISTS idx_photos_is_approved ON photos(is_approved);`;
    await client`CREATE INDEX IF NOT EXISTS idx_albums_is_active ON albums(is_active);`;

    console.log('✅ Indexes created successfully');

    console.log('🎉 Database migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run migration
migrate();