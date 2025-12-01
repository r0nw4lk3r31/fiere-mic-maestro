import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { adminUsers } from '../models/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const SALT_ROUNDS = 12;

async function seed() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('❌ DATABASE_URL environment variable is required');
    process.exit(1);
  }

  console.log('🌱 Starting database seeding...');

  const client = postgres(connectionString, { prepare: false });
  const db = drizzle(client);

  try {
    // Check if admin user already exists
    const existingAdmin = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.username, 'admin'))
      .limit(1);

    if (existingAdmin.length > 0) {
      console.log('ℹ️  Admin user already exists');
      return;
    }

    // Create default admin user
    const passwordHash = await bcrypt.hash('admin123', SALT_ROUNDS);

    await db.insert(adminUsers).values({
      username: 'admin',
      password_hash: passwordHash
    });

    console.log('✅ Default admin user created');
    console.log('   Username: admin');
    console.log('   Password: admin123');
    console.log('⚠️  Please change the default password after first login!');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run seeding
seed();