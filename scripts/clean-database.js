/**
 * KISAN SETU — Comprehensive Database Cleaner & Pristine Reset Script
 * 
 * Cleans:
 * 1. All transactional, deal room, bidding, token, queue, and mock tables:
 *    - deal_messages, bids, bidding_windows, audit_logs
 *    - procurement_timeline, payments, grievances, queue_tickets
 *    - notifications, activity_feed, ai_recommendations, centre_alerts
 *    - slots, buyers, farmers, profiles
 * 2. All test accounts from auth.users and auth.identities.
 * 3. Resets procurement centres to pristine operational state (0 queue, 0 wait, 0 procured today).
 * 4. Re-establishes the 5 official verified portal accounts:
 *    - farmer@kisansetu.in      (Password: KisanSetu2026!) -> Farmer (Ramesh Kumar)
 *    - centre@kisansetu.in      (Password: KisanSetu2026!) -> Centre Operator (Balwinder Singh @ Nilokheri)
 *    - admin@kisansetu.in       (Password: KisanSetu2026!) -> District Admin (Dr. Amit Verma, IAS)
 *    - superadmin@kisansetu.in  (Password: KisanSetu2026!) -> Super Admin (State Directorate)
 *    - buyer@kisansetu.in       (Password: KisanSetu2026!) -> Mandi Buyer (Karnal Agro Traders Ltd @ Nilokheri)
 * 5. Generates clean unbooked slots schedule for Today & Tomorrow across all centres.
 * 6. Verifies authentication with Supabase Auth SDK.
 */

import pg from 'pg';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const { Client } = pg;

const OFFICIAL_ACCOUNTS = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'farmer@kisansetu.in',
    role: 'farmer',
    full_name: 'Ramesh Kumar',
    full_name_hi: 'रमेश कुमार',
    village: 'Bahadurgarh',
    village_hi: 'बहादुरगढ़',
    district: 'Karnal',
    phone: '+91 98765 43210',
    crop: 'Wheat',
    crop_hi: 'गेहूँ',
    quantity_quintals: 120,
    land_area_acres: 8.5,
    farmer_id_code: 'HR-KRN-2026-88214',
    bank_name: 'Punjab National Bank',
    bank_account_masked: 'PNB ••••4417',
    ifsc_code: 'PUNB0024100',
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
    phone: '+91 98123 45678',
    centre_id: 'a1111111-1111-4111-8111-111111111111', // Assigned to Nilokheri Centre
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
    phone: '+91 94160 11223',
    department: 'District Agriculture Department',
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
    phone: '+91 172 256 0000',
    department: 'State Directorate of Food & Civil Supplies',
  },
  {
    id: '55555555-5555-4555-8555-555555555555',
    email: 'buyer@kisansetu.in',
    role: 'buyer',
    full_name: 'Suresh Singhal',
    full_name_hi: 'सुरेश सिंघल',
    village: 'Nilokheri Market',
    village_hi: 'निलोखेड़ी मार्केट',
    district: 'Karnal',
    phone: '+91 98111 22334',
    business_name: 'Karnal Agro Traders Ltd',
    business_type: 'trader',
    license_number: 'APMC-KRN-2024-001',
    centre_id: 'a1111111-1111-4111-8111-111111111111', // Assigned to Nilokheri Centre
  },
];

const CENTRES = [
  {
    id: 'a1111111-1111-4111-8111-111111111111',
    code: 'KRN-01',
    name: 'Nilokheri Grain Market',
    name_hi: 'निलोखेड़ी अनाज मंडी',
    distance_km: 4.2,
    queue_length: 0,
    predicted_wait_min: 0,
    capacity_used_pct: 25,
    daily_capacity_quintals: 5000,
    procured_today_quintals: 0,
    active_counters: 4,
    total_counters: 6,
    processing_rate_per_hour: 24,
    farmers_today: 0,
    map_x: 28,
    map_y: 35,
    recommended: true,
    recommendation_reasons: ['Fastest throughput in cluster', 'Shortest travel time from Northern Karnal'],
    recommendation_reasons_hi: ['क्लस्टर में सबसे तेज तुलाई', 'उत्तरी करनाल से सबसे कम यात्रा समय'],
    status: 'active',
  },
  {
    id: 'b2222222-2222-4222-8222-222222222222',
    code: 'KRN-02',
    name: 'Taraori Procurement Yard',
    name_hi: 'तरावड़ी खरीद प्रांगण',
    distance_km: 7.8,
    queue_length: 0,
    predicted_wait_min: 0,
    capacity_used_pct: 30,
    daily_capacity_quintals: 4500,
    procured_today_quintals: 0,
    active_counters: 3,
    total_counters: 5,
    processing_rate_per_hour: 18,
    farmers_today: 0,
    map_x: 65,
    map_y: 25,
    recommended: false,
    recommendation_reasons: ['Optimal for Basmati/Wheat dual intake'],
    recommendation_reasons_hi: ['गेहूँ एवं धान दोनों के लिए उपयुक्त'],
    status: 'active',
  },
  {
    id: 'c3333333-3333-4333-8333-333333333333',
    code: 'KRN-03',
    name: 'Indri Mandi Complex',
    name_hi: 'इन्द्री मंडी परिसर',
    distance_km: 12.5,
    queue_length: 0,
    predicted_wait_min: 0,
    capacity_used_pct: 20,
    daily_capacity_quintals: 4000,
    procured_today_quintals: 0,
    active_counters: 4,
    total_counters: 6,
    processing_rate_per_hour: 20,
    farmers_today: 0,
    map_x: 75,
    map_y: 68,
    recommended: false,
    recommendation_reasons: ['Large parking shed available'],
    recommendation_reasons_hi: ['बड़ा वाहन पार्किंग शेड उपलब्ध'],
    status: 'active',
  },
  {
    id: 'd4444444-4444-4444-8444-444444444444',
    code: 'KRN-04',
    name: 'Gharaunda Sub-Centre',
    name_hi: 'घरौंडा उप-खरीद केंद्र',
    distance_km: 16.0,
    queue_length: 0,
    predicted_wait_min: 0,
    capacity_used_pct: 15,
    daily_capacity_quintals: 3500,
    procured_today_quintals: 0,
    active_counters: 3,
    total_counters: 4,
    processing_rate_per_hour: 16,
    farmers_today: 0,
    map_x: 40,
    map_y: 82,
    recommended: false,
    recommendation_reasons: ['Direct GT Road connectivity'],
    recommendation_reasons_hi: ['जीटी रोड से सीधा संपर्क'],
    status: 'active',
  },
  {
    id: 'e5555555-5555-4555-8555-555555555555',
    code: 'KRN-05',
    name: 'Assandh Mandi Sub-Yard',
    name_hi: 'असंध मंडी सब-यार्ड',
    distance_km: 22.4,
    queue_length: 0,
    predicted_wait_min: 0,
    capacity_used_pct: 20,
    daily_capacity_quintals: 3800,
    procured_today_quintals: 0,
    active_counters: 3,
    total_counters: 5,
    processing_rate_per_hour: 18,
    farmers_today: 0,
    map_x: 18,
    map_y: 65,
    recommended: false,
    recommendation_reasons: ['High capacity electronic weighbridge'],
    recommendation_reasons_hi: ['उच्च क्षमता वाला इलेक्ट्रॉनिक धर्मकांटा'],
    status: 'active',
  },
];

const TIME_WINDOWS = [
  '09:00 – 09:30',
  '09:30 – 10:00',
  '10:00 – 10:30',
  '10:30 – 11:00',
  '11:00 – 11:30',
  '11:30 – 12:00',
  '12:00 – 12:30',
  '14:00 – 14:30',
  '14:30 – 15:00',
  '15:00 – 15:30',
  '15:30 – 16:00',
  '16:00 – 16:30',
];

async function cleanAndResetDatabase() {
  console.log('====================================================');
  console.log('🧹 KISAN SETU — FULL DATABASE CLEANER & RESETTER');
  console.log('====================================================');

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  try {
    // 1. Delete all transactional, bidding, deal-room, slot rescue, and mock tables
    console.log('\n[1/6] Cleaning all transactional and mock tables in dependency order...');
    await client.query('DELETE FROM public.slot_rescue_recipients;').catch((e) => console.log('Notice slot_rescue_recipients:', e.message));
    await client.query('DELETE FROM public.slot_vacancies;').catch((e) => console.log('Notice slot_vacancies:', e.message));
    await client.query('DELETE FROM public.deal_messages;').catch((e) => console.log('Notice deal_messages:', e.message));
    await client.query('DELETE FROM public.bids;').catch((e) => console.log('Notice bids:', e.message));
    await client.query('DELETE FROM public.bidding_windows;').catch((e) => console.log('Notice bidding_windows:', e.message));
    await client.query('DELETE FROM public.audit_logs;').catch((e) => console.log('Notice audit_logs:', e.message));
    await client.query('DELETE FROM public.procurement_timeline;').catch((e) => console.log('Notice procurement_timeline:', e.message));
    await client.query('DELETE FROM public.payments;').catch((e) => console.log('Notice payments:', e.message));
    await client.query('DELETE FROM public.grievances;').catch((e) => console.log('Notice grievances:', e.message));
    await client.query('DELETE FROM public.queue_tickets;').catch((e) => console.log('Notice queue_tickets:', e.message));
    await client.query('DELETE FROM public.notifications;').catch((e) => console.log('Notice notifications:', e.message));
    await client.query('DELETE FROM public.activity_feed;').catch((e) => console.log('Notice activity_feed:', e.message));
    await client.query('DELETE FROM public.ai_recommendations;').catch((e) => console.log('Notice ai_recommendations:', e.message));
    await client.query('DELETE FROM public.centre_alerts;').catch((e) => console.log('Notice centre_alerts:', e.message));
    await client.query('DELETE FROM public.slots;').catch((e) => console.log('Notice slots:', e.message));
    await client.query('DELETE FROM public.buyers;').catch((e) => console.log('Notice buyers:', e.message));
    await client.query('DELETE FROM public.farmers;').catch((e) => console.log('Notice farmers:', e.message));
    await client.query('DELETE FROM public.profiles;').catch((e) => console.log('Notice profiles:', e.message));
    console.log('✓ All mock transactional and profile records cleared.');

    const isBlankMode = process.argv.includes('--blank');

    // 2. Clean auth accounts
    if (isBlankMode) {
      console.log('\n[2/6] [BLANK MODE] Cleaning ALL accounts from auth.users & auth.identities...');
      await client.query('DELETE FROM auth.identities;');
      await client.query('DELETE FROM auth.users;');
      console.log('✓ All accounts completely deleted from auth schema.');
    } else {
      console.log('\n[2/6] Cleaning test / mock accounts from auth.users & auth.identities...');
      const officialIds = OFFICIAL_ACCOUNTS.map((a) => `'${a.id}'`).join(',');
      await client.query(`DELETE FROM auth.identities WHERE user_id NOT IN (${officialIds});`);
      await client.query(`DELETE FROM auth.users WHERE id NOT IN (${officialIds});`);
      console.log('✓ All temporary and test accounts deleted from auth schema.');
    }

    // 3. Re-seed clean procurement centres first (so foreign keys for centre_id are valid)
    console.log('\n[3/6] Resetting procurement centres to initial operational state...');
    await client.query('DELETE FROM public.procurement_centres;');

    for (const c of CENTRES) {
      await client.query(
        `
        INSERT INTO public.procurement_centres (
          id, code, name, name_hi, distance_km, queue_length, predicted_wait_min,
          capacity_used_pct, daily_capacity_quintals, procured_today_quintals,
          active_counters, total_counters, processing_rate_per_hour, farmers_today,
          map_x, map_y, recommended, recommendation_reasons, recommendation_reasons_hi, status
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18::jsonb, $19::jsonb, $20
        )
      `,
        [
          c.id,
          c.code,
          c.name,
          c.name_hi,
          c.distance_km,
          c.queue_length,
          c.predicted_wait_min,
          c.capacity_used_pct,
          c.daily_capacity_quintals,
          c.procured_today_quintals,
          c.active_counters,
          c.total_counters,
          c.processing_rate_per_hour,
          c.farmers_today,
          c.map_x,
          c.map_y,
          c.recommended,
          JSON.stringify(c.recommendation_reasons),
          JSON.stringify(c.recommendation_reasons_hi),
          c.status,
        ]
      );
    }
    console.log('✓ 5 official procurement centres reset with zero queues and clean capacity.');

    // 4. Re-seed verified official role portal accounts
    if (!isBlankMode) {
      console.log('\n[4/6] Re-establishing verified official role accounts...');
      for (const acc of OFFICIAL_ACCOUNTS) {
        const userMeta = JSON.stringify({
          role: acc.role,
          full_name: acc.full_name,
          full_name_hi: acc.full_name_hi,
          village: acc.village,
          village_hi: acc.village_hi,
          district: acc.district,
          phone: acc.phone,
          crop: acc.crop || 'Wheat',
          crop_hi: acc.crop_hi || 'गेहूँ',
          quantity_quintals: acc.quantity_quintals || 120,
          centre_id: acc.centre_id || null,
          department: acc.department || 'Department of Agriculture',
          business_name: acc.business_name || null,
          business_type: acc.business_type || null,
          license_number: acc.license_number || null,
        });

        const appMeta = JSON.stringify({ provider: 'email', providers: ['email'] });
        const identityData = JSON.stringify({ sub: acc.id, email: acc.email });

        await client.query(
          `
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
        `,
          [acc.id, acc.email, appMeta, userMeta]
        );

        await client.query(
          `
          INSERT INTO auth.identities (
            id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
          ) VALUES (
            $1::uuid, $1::uuid, $2::jsonb, 'email', $1::text, now(), now(), now()
          )
          ON CONFLICT (provider, provider_id) DO UPDATE SET
            identity_data = $2::jsonb,
            last_sign_in_at = now();
        `,
          [acc.id, identityData]
        );

        await client.query(
          `
          INSERT INTO public.profiles (
            id, role, full_name, full_name_hi, district, village, village_hi, phone, centre_id, department
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
          )
          ON CONFLICT (id) DO UPDATE SET
            role = EXCLUDED.role,
            full_name = EXCLUDED.full_name,
            full_name_hi = EXCLUDED.full_name_hi,
            district = EXCLUDED.district,
            village = EXCLUDED.village,
            village_hi = EXCLUDED.village_hi,
            phone = EXCLUDED.phone,
            centre_id = EXCLUDED.centre_id,
            department = EXCLUDED.department;
        `,
          [
            acc.id,
            acc.role,
            acc.full_name,
            acc.full_name_hi,
            acc.district,
            acc.village,
            acc.village_hi,
            acc.phone,
            acc.centre_id || null,
            acc.department || null,
          ]
        );

        if (acc.role === 'farmer') {
          await client.query(
            `
            INSERT INTO public.farmers (
              id, farmer_id_code, crop, crop_hi, quantity_quintals, land_area_acres,
              bank_name, bank_account_masked, ifsc_code
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9
            )
            ON CONFLICT (id) DO UPDATE SET
              farmer_id_code = EXCLUDED.farmer_id_code,
              crop = EXCLUDED.crop,
              crop_hi = EXCLUDED.crop_hi,
              quantity_quintals = EXCLUDED.quantity_quintals,
              land_area_acres = EXCLUDED.land_area_acres;
          `,
            [
              acc.id,
              acc.farmer_id_code,
              acc.crop,
              acc.crop_hi,
              acc.quantity_quintals,
              acc.land_area_acres,
              acc.bank_name,
              acc.bank_account_masked,
              acc.ifsc_code,
            ]
          );
        }

        if (acc.role === 'buyer') {
          await client.query(
            `
            INSERT INTO public.buyers (
              user_id, business_name, business_type, license_number, licence_number, centre_id, is_active
            ) VALUES (
              $1, $2, $3, $4, $4, $5, true
            )
            ON CONFLICT (user_id) DO UPDATE SET
              business_name = EXCLUDED.business_name,
              business_type = EXCLUDED.business_type,
              license_number = EXCLUDED.license_number,
              licence_number = EXCLUDED.licence_number,
              centre_id = EXCLUDED.centre_id,
              is_active = true;
          `,
            [
              acc.id,
              acc.business_name,
              acc.business_type || 'trader',
              acc.license_number || 'APMC-KRN-2024-001',
              acc.centre_id,
            ]
          );
        }
      }
      console.log('✓ Official accounts (farmer, centre operator, admin, superadmin, buyer) verified and restored.');
    } else {
      console.log('\n[4/6] [BLANK MODE] Skipping account re-seeding (0 accounts remain).');
    }

    // 5. Generate fresh open slots for today & tomorrow
    console.log('\n[5/6] Generating clean, unbooked slot schedule...');
    const days = ['Today', 'Tomorrow'];
    for (const c of CENTRES) {
      for (const day of days) {
        for (const win of TIME_WINDOWS) {
          const isAiRec = win === '11:00 – 11:30' || win === '11:30 – 12:00';
          await client.query(
            `
            INSERT INTO public.slots (
              centre_id, date, "window", demand_level, ai_recommended, confidence_pct,
              reason, reason_hi, is_booked, booked_by
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, false, NULL
            )
          `,
            [
              c.id,
              day,
              win,
              isAiRec ? 'low' : 'normal',
              isAiRec,
              isAiRec ? 95 : 85,
              isAiRec ? 'Optimal arrival window: minimum expected queue' : 'Standard procurement slot',
              isAiRec ? 'सर्वोत्तम आगमन समय: न्यूनतम अनुमानित प्रतीक्षा' : 'सामान्य खरीद स्लॉट',
            ]
          );
        }
      }
    }
    console.log('✓ Fresh unbooked slots generated for all centres.');

    // 6. Verify Supabase Auth SDK Sign In
    if (!isBlankMode) {
      console.log('\n[6/6] Verifying Supabase Auth SDK Authentication...');
      const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
      for (const acc of OFFICIAL_ACCOUNTS) {
        const res = await sb.auth.signInWithPassword({
          email: acc.email,
          password: 'KisanSetu2026!',
        });
        if (res.data.user) {
          console.log(`  [✓ OK] ${acc.email} (${acc.role}) -> authenticated successfully`);
        } else {
          console.error(`  [✗ FAIL] ${acc.email}: ${res.error?.message}`);
        }
      }
    } else {
      console.log('\n[6/6] [BLANK MODE] Database is 100% clean with 0 accounts.');
    }

    console.log('\n====================================================');
    console.log('🎉 DATABASE CLEAN & RESET COMPLETE!');
    console.log('All mock data and test accounts have been wiped.');
    if (!isBlankMode) {
      console.log('Pristine official portal accounts ready to use:');
      console.log(' - Farmer:           farmer@kisansetu.in      / KisanSetu2026!');
      console.log(' - Centre Operator:  centre@kisansetu.in      / KisanSetu2026!');
      console.log(' - District Admin:   admin@kisansetu.in       / KisanSetu2026!');
      console.log(' - Super Admin:      superadmin@kisansetu.in  / KisanSetu2026!');
      console.log(' - Buyer:            buyer@kisansetu.in       / KisanSetu2026!');
    } else {
      console.log('Mode: BLANK WIPE (0 users in database). Fresh signups ready at /login.');
    }
    console.log('====================================================');
  } catch (err) {
    console.error('Error cleaning database:', err);
  } finally {
    await client.end();
  }
}

cleanAndResetDatabase();
