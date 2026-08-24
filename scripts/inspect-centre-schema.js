import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Client } = pg;

async function checkSchema() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  const tables = ['procurement_centres', 'queue_tickets', 'procurement_timeline', 'payments', 'profiles', 'slots', 'notifications', 'activity_feed'];

  for (const t of tables) {
    const res = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position;
    `, [t]);
    console.log(`\n=== Table: ${t} ===`);
    console.log(res.rows.map(r => `${r.column_name} (${r.data_type})`).join(', '));
  }

  // Check some sample rows in queue_tickets
  const tickets = await client.query(`SELECT * FROM public.queue_tickets LIMIT 5;`);
  console.log("\n=== Sample queue_tickets ===", tickets.rows);

  await client.end();
}

checkSchema();
