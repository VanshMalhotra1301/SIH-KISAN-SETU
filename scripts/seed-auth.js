import pg from 'pg';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const { Client } = pg;

const accounts = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'farmer@kisansetu.in',
    role: 'farmer',
    full_name: 'Ramesh Kumar',
    full_name_hi: 'रमेश कुमार',
    village: 'Bahadurgarh',
    village_hi: 'बहादुरगढ़',
    district: 'Karnal',
    phone: '+91 98765 43210'
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    email: 'centre@kisansetu.in',
    role: 'centre_operator',
    full_name: 'Balwinder Singh',
    full_name_hi: 'बलविंदर सिंह',
    village: 'Nilokheri Mandi',
    village_hi: 'निलोखेड़ी मंडी',
    district: 'Karnal',
    phone: '+91 98123 45678'
  },
  {
    id: '33333333-3333-4333-8333-333333333333',
    email: 'admin@kisansetu.in',
    role: 'district_admin',
    full_name: 'Dr. Amit Verma, IAS',
    full_name_hi: 'डॉ. अमित वर्मा, आईएएस',
    village: 'District HQ',
    village_hi: 'जिला मुख्यालय',
    district: 'Karnal',
    phone: '+91 94160 11223'
  },
  {
    id: '44444444-4444-4444-8444-444444444444',
    email: 'superadmin@kisansetu.in',
    role: 'super_admin',
    full_name: 'Haryana State Agri Directorate',
    full_name_hi: 'हरियाणा राज्य कृषि निदेशालय',
    village: 'Chandigarh HQ',
    village_hi: 'चंडीगढ़ मुख्यालय',
    district: 'State HQ',
    phone: '+91 172 256 0000'
  }
];

async function seedAuth() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  for (const acc of accounts) {
    const userMeta = JSON.stringify({
      role: acc.role,
      full_name: acc.full_name,
      full_name_hi: acc.full_name_hi,
      village: acc.village,
      village_hi: acc.village_hi,
      district: acc.district,
      phone: acc.phone,
      crop: 'Wheat',
      crop_hi: 'गेहूँ',
      quantity_quintals: 120
    });

    const appMeta = JSON.stringify({ provider: 'email', providers: ['email'] });
    const identityData = JSON.stringify({ sub: acc.id, email: acc.email });

    await client.query(`
      INSERT INTO auth.users (
        id, instance_id, aud, role, email, encrypted_password,
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at, confirmation_token, email_change, email_change_token_new,
        recovery_token, is_super_admin, is_sso_user, is_anonymous
      ) VALUES (
        $1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', $2,
        extensions.crypt('KisanSetu2026!', extensions.gen_salt('bf', 10)),
        now(), $3::jsonb, $4::jsonb,
        now(), now(), '', '', '', '', false, false, false
      )
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        encrypted_password = extensions.crypt('KisanSetu2026!', extensions.gen_salt('bf', 10)),
        email_confirmed_at = now(),
        raw_user_meta_data = $4::jsonb;
    `, [acc.id, acc.email, appMeta, userMeta]);

    await client.query(`
      INSERT INTO auth.identities (
        id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
      ) VALUES (
        $1::uuid, $1::uuid, $2::jsonb, 'email', $1::text, now(), now(), now()
      )
      ON CONFLICT (provider, provider_id) DO UPDATE SET
        identity_data = $2::jsonb,
        last_sign_in_at = now();
    `, [acc.id, identityData]);

    await client.query(`
      INSERT INTO public.profiles (
        id, role, full_name, full_name_hi, district, village, village_hi, phone
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8
      )
      ON CONFLICT (id) DO UPDATE SET
        role = EXCLUDED.role,
        full_name = EXCLUDED.full_name,
        full_name_hi = EXCLUDED.full_name_hi;
    `, [acc.id, acc.role, acc.full_name, acc.full_name_hi, acc.district, acc.village, acc.village_hi, acc.phone]);
  }

  // Ensure farmer table has Ramesh Kumar linked
  await client.query(`
    INSERT INTO public.farmers (id, farmer_id_code, crop, crop_hi, quantity_quintals)
    VALUES ('11111111-1111-4111-8111-111111111111', 'HR-KRN-2026-88214', 'Wheat', 'गेहूँ', 120)
    ON CONFLICT (id) DO NOTHING;
  `);

  console.log('All auth users and identities synced!');
  await client.end();

  // Test login with Supabase SDK
  const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
  for (const acc of accounts) {
    const res = await sb.auth.signInWithPassword({
      email: acc.email,
      password: 'KisanSetu2026!'
    });
    console.log(`Test login for ${acc.email} (${acc.role}):`, res.data.user ? '✓ SUCCESS' : `FAILED: ${res.error?.message}`);
  }
}

seedAuth();
