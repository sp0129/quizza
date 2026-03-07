import fs from 'fs';
import path from 'path';
import pool from './index';

async function migrate() {
  const migrationsDir = path.join(__dirname, '../migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort(); // runs 001_, 002_, etc. in order

  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    try {
      await pool.query(sql);
      console.log(`Migration applied: ${file}`);
    } catch (err) {
      console.error(`Migration failed: ${file}`, err);
      process.exit(1);
    }
  }

  console.log('All migrations applied.');
  await pool.end();
}

migrate();
