import pg from 'pg';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const { Client } = pg;

async function diagnose() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  // Drop any trigger on auth.users
  await client.query('DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;');

  // Make sure supabase_auth_admin has all permissions
  await client.query(`
    GRANT ALL ON SCHEMA public TO supabase_auth_admin, authenticator, anon, authenticated, service_role, postgres;
    GRANT ALL ON ALL TABLES IN SCHEMA public TO supabase_auth_admin, authenticator, anon, authenticated, service_role, postgres;
    GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO supabase_auth_admin, authenticator, anon, authenticated, service_role, postgres;
    GRANT ALL ON ALL ROUTINES IN SCHEMA public TO supabase_auth_admin, authenticator, anon, authenticated, service_role, postgres;
  `);

  console.log('Granted all permissions to supabase_auth_admin & authenticator');
  await client.end();

  const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
  const res = await sb.auth.signInWithPassword({
    email: 'farmer@kisansetu.in',
    password: 'KisanSetu2026!'
  });
  console.log('Login result:', res.data.user ? '✓ SUCCESS: ' + res.data.user.email : 'FAILED: ' + JSON.stringify(res.error));
}

diagnose();
