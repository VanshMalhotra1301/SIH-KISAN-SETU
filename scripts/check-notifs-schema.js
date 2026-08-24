import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Client } = pg;

async function checkNotificationsSchema() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  const res = await client.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'notifications';
  `);

  console.log('notifications table columns:', res.rows);

  const notifs = await client.query(`SELECT * FROM public.notifications LIMIT 5;`);
  console.log('notifications rows:', notifs.rows);

  await client.end();
}

checkNotificationsSchema();
