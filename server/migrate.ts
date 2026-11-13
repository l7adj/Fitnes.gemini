import { Pool } from 'pg';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required');

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: true } : undefined,
});
const here = path.dirname(fileURLToPath(import.meta.url));
const migrationPath = path.resolve(here,'../db/migrations/001_initial_schema.sql');

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())');
    const existing = await client.query('SELECT version FROM schema_migrations WHERE version=$1',['001_initial_schema']);
    if (existing.rowCount) {
      console.log('Migration 001_initial_schema already applied.');
      await client.query('COMMIT');
      return;
    }
    const sql = await readFile(migrationPath,'utf8');
    await client.query(sql);
    await client.query('INSERT INTO schema_migrations (version) VALUES ($1)',['001_initial_schema']);
    await client.query('COMMIT');
    console.log('Migration 001_initial_schema applied successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}
migrate().catch((error) => {
  console.error('Database migration failed:',error);
  process.exitCode = 1;
});
