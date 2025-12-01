import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import dotenv from 'dotenv';

// Ensure env vars are loaded when this module is imported (models are imported early)
dotenv.config();

// Database connection
const connectionString = process.env.DATABASE_URL || 'postgresql://localhost:5432/fiere_mic_maestro';

// Log the connection string to help debug IPv4/IPv6 resolution issues
try {
	console.log('PG connectionString (models/index.ts):', connectionString);
} catch (e) {
	// ignore logging failures in constrained environments
}

// Create the connection
const client = postgres(connectionString, { prepare: false });

// Create the database instance
export const db = drizzle(client, { schema });

// Export types
export type Database = typeof db;