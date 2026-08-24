import { createClient } from '@supabase/supabase-js';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const sb = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

const { Client } = pg;

const demoUsers = [
  {
    email: 'farmer@gmail.com',
    password: 'KisanSetu2026!',
    role: 'farmer',
    full_name: 'Ramesh Kumar',
    full_name_hi: 'रमेश कुमार',
    village: 'Bahadurgarh',
    village_hi: 'बहादुरगढ़',
    district: 'Karnal',
    phone: '+91 98765 43210',
    crop: 'Wheat',
    crop_hi: 'गेहूँ',
    quantity: 120
  },
  {
    email: 'centre@gmail.com',
    password: 'KisanSetu2026!',
    role: 'centre_operator',
    full_name: 'Balwinder Singh',
    full_name_hi: 'बलविंदर सिंह',
    village: 'Nilokheri',
    village_hi: 'निलोखेड़ी',
    district: 'Karnal',
    phone: '+91 98123 45678'
  },
  {
    email: 'admin@gmail.com',
    password: 'KisanSetu2026!',
    role: 'district_admin',
    full_name: 'Dr. Amit Verma, IAS',
    full_name_hi: 'डॉ. अमित वर्मा, आईएएस',
    village: 'District HQ',
    village_hi: 'जिला मुख्यालय',
    district: 'Karnal',
    phone: '+91 94160 11223'
  },
  {
    email: 'superadmin@gmail.com',
    password: 'KisanSetu2026!',
    role: 'super_admin',
    full_name: 'State Agri Directorate',
    full_name_hi: 'राज्य कृषि निदेशालय',
    village: 'Chandigarh HQ',
    village_hi: 'चंडीगढ़ मुख्यालय',
    district: 'State HQ',
    phone: '+91 172 256 0000'
  }
];

async function setupUsers() {
  console.log('Setting up demo users...');

  for (const u of demoUsers) {
    try {
      const res = await sb.auth.signUp({
        email: u.email,
        password: u.password,
        options: {
          data: {
            role: u.role,
            full_name: u.full_name,
            full_name_hi: u.full_name_hi,
            district: u.district,
            village: u.village,
            village_hi: u.village_hi,
            phone: u.phone
          }
        }
      });
      console.log(`Registered ${u.email}:`, res.data.user?.id || res.error?.message);
    } catch (e) {
      console.error(`Error for ${u.email}:`, e.message);
    }
  }

  // Connect via direct pg and confirm all emails + update profile roles
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  await client.query("UPDATE auth.users SET email_confirmed_at = now()");

  for (const u of demoUsers) {
    await client.query(`
      UPDATE public.profiles p
      SET
        role = $1,
        full_name = $2,
        full_name_hi = $3,
        district = $4,
        village = $5,
        village_hi = $6,
        phone = $7
      FROM auth.users u
      WHERE p.id = u.id AND u.email = $8
    `, [u.role, u.full_name, u.full_name_hi, u.district, u.village, u.village_hi, u.phone, u.email]);

    if (u.role === 'farmer') {
      await client.query(`
        INSERT INTO public.farmers (id, farmer_id_code, crop, crop_hi, quantity_quintals)
        SELECT u.id, 'HR-KRN-2026-88214', 'Wheat', 'गेहूँ', 120
        FROM auth.users u WHERE u.email = $1
        ON CONFLICT (id) DO UPDATE SET crop = 'Wheat', quantity_quintals = 120
      `, [u.email]);

      // Connect queue_tickets and payment to this actual farmer id
      await client.query(`
        UPDATE public.queue_tickets q
        SET farmer_id = u.id
        FROM auth.users u WHERE u.email = $1;

        UPDATE public.payments p
        SET farmer_id = u.id
        FROM auth.users u WHERE u.email = $1;
      `, [u.email]);
    }
  }

  console.log('All demo users confirmed and linked to live profiles!');
  await client.end();
}

setupUsers();
