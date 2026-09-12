import pg from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

const { Client } = pg;
const client = new Client({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:SIH2026KISANSETU@db.yylgukviahqpuznlcddp.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  console.log('Connecting to database...');
  await client.connect();
  const sqlPath = path.resolve('./supabase/migrations/20260912_deal_room.sql');
  const sql = fs.readFileSync(sqlPath, 'utf-8');
  console.log('Running Deal Room Migration...');
  await client.query(sql);
  console.log('✅ Deal Room Migration executed successfully!');
  await client.end();
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
