import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Client } = pg;

async function checkIdentities() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  const res = await client.query(`
    SELECT id, user_id, provider, identity_data
    FROM auth.identities;
  `);

  console.log('auth.identities:', res.rows);

  // Let's set the password for all users to 'KisanSetu2026!' using crypt
  await client.query(`
    UPDATE auth.users
    SET
      encrypted_password = crypt('KisanSetu2026!', gen_salt('bf', 10)),
      email_confirmed_at = now(),
      confirmation_token = '',
      recovery_token = '',
      email_change_token_new = '',
      email_change = '',
      is_sso_user = false,
      aud = 'authenticated',
      role = 'authenticated'
    WHERE email IN ('farmer@kisansetu.in', 'centre@kisansetu.in', 'admin@kisansetu.in', 'superadmin@kisansetu.in');
  `);

  console.log('Updated passwords to KisanSetu2026!');

  await client.end();
}

checkIdentities();
