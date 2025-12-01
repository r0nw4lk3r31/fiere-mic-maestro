import { pgTable, text, integer, timestamp, uuid, boolean } from 'drizzle-orm/pg-core';

// Artists table
export const artists = pgTable('artists', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  song_description: text('song_description'),
  preferred_time: text('preferred_time'),
  performance_order: integer('performance_order').default(0),
  is_regular: boolean('is_regular').default(false), // Saved artist vs one-time signup
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

// Performance log table - tracks who played when
export const performanceLog = pgTable('performance_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  artist_name: text('artist_name').notNull(),
  song_description: text('song_description'),
  performed_at: timestamp('performed_at').defaultNow().notNull(),
  created_at: timestamp('created_at').defaultNow(),
});

// Albums table
export const albums = pgTable('albums', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  date: timestamp('date').notNull().defaultNow(), // Date of the event/open mic night
  is_active: boolean('is_active').default(true),
  album_type: text('album_type').default('event'), // 'event' or 'gallery'
  allow_customer_uploads: boolean('allow_customer_uploads').default(true),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

// Photos table
export const photos = pgTable('photos', {
  id: uuid('id').primaryKey().defaultRandom(),
  album_id: uuid('album_id').references(() => albums.id, { onDelete: 'cascade' }),
  filename: text('filename').notNull(),
  original_name: text('original_name').notNull(),
  mime_type: text('mime_type').notNull(),
  size: integer('size').notNull(),
  url: text('url').notNull(),
  is_approved: boolean('is_approved').default(false),
  is_visible: boolean('is_visible').default(true), // Admin can hide specific photos
  uploaded_by: text('uploaded_by'), // IP address or identifier
  review_status: text('review_status').default('pending'), // 'pending', 'approved', 'rejected', 'date_mismatch'
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

// Admin users table
export const adminUsers = pgTable('admin_users', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: text('username').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

// Settings table for app configuration
export const settings = pgTable('settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: text('key').notNull().unique(),
  value: text('value').notNull(),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});