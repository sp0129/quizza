import fs from 'fs';
import path from 'path';
import pool from './index';

async function migrate() {
  const sql = fs.readFileSync(
    path.join(__dirname, '../migrations/001_initial.sql'),
    'utf8'
  );
  try {
    await pool.query(sql);
    console.log('Migrations applied successfully.');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
