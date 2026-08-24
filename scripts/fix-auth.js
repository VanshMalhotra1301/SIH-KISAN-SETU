import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

const fixAuthSql = `
-- Populate auth.identities for each user so GoTrue recognizes email identity provider
INSERT INTO auth.identities (
  id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, provider_id
)
SELECT
  u.id,
  u.id,
  json_build_object('sub', u.id::text, 'email', u.email)::jsonb,
  'email',
  now(),
  now(),
  now(),
  u.id::text
FROM auth.users u
ON CONFLICT (provider, provider_id) DO UPDATE SET
  identity_data = EXCLUDED.identity_data,
  last_sign_in_at = now();

-- Grant schema usage to supabase auth roles
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;
`;

async function fixAuth() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    await client.query(fixAuthSql);
    console.log('Auth identities & permissions granted!');
    await client.end();
  } catch (err) {
    console.error('Fix failed:', err);
  }
}

fixAuth();
