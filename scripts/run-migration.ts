import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runMigration() {
  const migrationPath = process.argv[2];
  if (!migrationPath) {
    console.error('Usage: tsx scripts/run-migration.ts <path-to-sql-file>');
    process.exit(1);
  }

  const sql = fs.readFileSync(migrationPath, 'utf8');
  console.log(`Running migration: ${migrationPath}`);

  // Split SQL by semicolons to run statements individually if needed, 
  // but Supabase JS client doesn't expose raw SQL execution easily via postgrest 
  // unless we use rpc or have direct PG access.
  // Actually, for migrations we usually need direct PG access.
  // If we can't use psql, we might have to use `postgres` node module.
  
  // Let's try to use the `postgres` library which I installed.
  const postgres = require('postgres');
  
  const sqlConnection = postgres(process.env.DATABASE_URL); // Needs DATABASE_URL

  try {
    await sqlConnection.unsafe(sql);
    console.log('Migration completed successfully');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await sqlConnection.end();
  }
}

runMigration();

