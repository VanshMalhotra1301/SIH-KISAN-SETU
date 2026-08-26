import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Client } = pg;

async function inspectDb() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  console.log("=== 1. AUTH USERS ===");
  const authUsers = await client.query(`
    SELECT id, email, created_at, raw_user_meta_data->>'role' as role, raw_user_meta_data->>'full_name' as name
    FROM auth.users
    ORDER BY created_at DESC;
  `);
  console.table(authUsers.rows);

  console.log("\n=== 2. PUBLIC TABLES ROW COUNTS ===");
  const tables = [
    'profiles',
    'farmers',
    'procurement_centres',
    'slots',
    'queue_tickets',
    'procurement_timeline',
    'payments',
    'grievances',
    'notifications',
    'activity_feed',
    'centre_alerts',
    'ai_recommendations'
  ];

  for (const t of tables) {
    try {
      const res = await client.query(`SELECT count(*) FROM public.${t}`);
      console.log(`- public.${t}: ${res.rows[0].count} rows`);
    } catch (err) {
      console.log(`- public.${t}: Error or table does not exist (${err.message})`);
    }
  }

  await client.end();
}

inspectDb().catch(console.error);
