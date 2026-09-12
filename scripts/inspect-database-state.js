import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Client } = pg;

async function checkTables() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  const res = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `);

  console.log("All base tables in public schema:");
  for (const row of res.rows) {
    const countRes = await client.query(`SELECT count(*) FROM public."${row.table_name}";`).catch(() => ({ rows: [{ count: 'ERROR' }] }));
    console.log(`- ${row.table_name}: ${countRes.rows[0].count} rows`);
  }

  await client.end();
}

checkTables().catch(console.error);
