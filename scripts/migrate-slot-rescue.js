import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Connecting to Supabase PostgreSQL...');
    await client.connect();
    console.log('Connected! Reading migration SQL...');
    const sqlPath = path.join(__dirname, '../supabase/migrations/20260913_slot_rescue.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Executing Slot Rescue migration...');
    await client.query(sql);
    console.log('✅ Slot Rescue migration applied successfully!');

    // Check tables and functions
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name IN ('slot_vacancies', 'slot_rescue_recipients');
    `);
    console.log('Created tables:', tables.rows.map(r => r.table_name));

    const routines = await client.query(`
      SELECT routine_name 
      FROM information_schema.routines 
      WHERE routine_schema = 'public' AND routine_name IN ('cancel_procurement_slot', 'create_slot_rescue_vacancy', 'claim_slot_rescue');
    `);
    console.log('Created RPC functions:', routines.rows.map(r => r.routine_name));

    await client.end();
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

runMigration();
