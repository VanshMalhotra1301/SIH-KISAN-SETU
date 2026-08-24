import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Client } = pg;

async function checkAuthUsers() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  const res = await client.query(`
    SELECT id, email, encrypted_password, email_confirmed_at, raw_user_meta_data
    FROM auth.users
    ORDER BY created_at DESC
    LIMIT 10;
  `);

  console.log('Existing auth.users in Postgres:');
  console.log(res.rows);

  await client.end();
}

checkAuthUsers();
