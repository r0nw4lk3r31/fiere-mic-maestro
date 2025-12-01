// Load backend .env explicitly so tests run from repo root
require('dotenv').config({ path: __dirname + '/../.env' });
const postgres = require('postgres');

const connectionString = process.env.DATABASE_URL;
console.log('Using DATABASE_URL:', connectionString);

const sql = postgres(connectionString, { prepare: false });

(async () => {
  try {
    const res = await sql`SELECT 1 as ok`;
    console.log('DB test result:', res);
    await sql.end();
    process.exit(0);
  } catch (err) {
    console.error('DB test error:', err);
    try { await sql.end(); } catch(e) {}
    process.exit(1);
  }
})();
