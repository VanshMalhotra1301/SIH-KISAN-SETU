import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Client } = pg;
const client = new Client({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:SIH2026KISANSETU@db.yylgukviahqpuznlcddp.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function inspectColumns() {
  await client.connect();
  const tables = ['profiles', 'farmers', 'audit_logs', 'procurement_centres', 'queue_tickets', 'notifications'];
  for (const table of tables) {
    const res = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position
    `, [table]);
    console.log(`\nTable ${table}:`);
    console.log(res.rows.map(r => `${r.column_name} (${r.data_type})`).join(', '));
  }
  await client.end();
}

inspectColumns().catch(err => {
  console.error(err);
  process.exit(1);
});
