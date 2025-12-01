import { db } from '../models';
import { sql } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

async function addAlbumTypes() {
  try {
    console.log('Adding album_type and allow_customer_uploads columns...');

    const sqlContent = fs.readFileSync(
      path.join(__dirname, 'add_album_types.sql'),
      'utf-8'
    );

    await db.execute(sql.raw(sqlContent));

    console.log('✅ Successfully added album type columns');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding album types:', error);
    process.exit(1);
  }
}

addAlbumTypes();
