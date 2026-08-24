import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

const seedSql = `
-- 1. Create or ensure demo users in auth.users with encrypted passwords & confirmed email
DO $$
DECLARE
  v_farmer_id UUID := '11111111-1111-4111-8111-111111111111'::uuid;
  v_centre_id UUID := '22222222-2222-4222-8222-222222222222'::uuid;
  v_admin_id  UUID := '33333333-3333-4333-8333-333333333333'::uuid;
  v_super_id  UUID := '44444444-4444-4444-8444-444444444444'::uuid;

  v_encrypted_pw TEXT;
  v_centre_a_id UUID := 'a1111111-1111-4111-8111-111111111111'::uuid;
  v_centre_b_id UUID := 'b2222222-2222-4222-8222-222222222222'::uuid;
  v_centre_c_id UUID := 'c3333333-3333-4333-8333-333333333333'::uuid;
  v_centre_d_id UUID := 'd4444444-4444-4444-8444-444444444444'::uuid;
  v_centre_e_id UUID := 'e5555555-5555-4555-8555-555555555555'::uuid;

  v_slot_1_id UUID := '51111111-1111-4111-8111-111111111111'::uuid;
  v_ticket_id UUID := '71111111-1111-4111-8111-111111111111'::uuid;
BEGIN
  v_encrypted_pw := extensions.crypt('KisanSetu2026!', extensions.gen_salt('bf'));

  -- Clean existing demo data
  DELETE FROM public.notifications;
  DELETE FROM public.activity_feed;
  DELETE FROM public.ai_recommendations;
  DELETE FROM public.centre_alerts;
  DELETE FROM public.payments;
  DELETE FROM public.procurement_timeline;
  DELETE FROM public.queue_tickets;
  DELETE FROM public.slots;
  DELETE FROM public.procurement_centres;
  DELETE FROM public.farmers;
  DELETE FROM public.profiles;

  -- Ensure demo users exist in auth.users
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud, confirmation_token
  ) VALUES
  (
    v_farmer_id, '00000000-0000-0000-0000-000000000000', 'farmer@kisansetu.demo', v_encrypted_pw, now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"role":"farmer","full_name":"Ramesh Kumar","full_name_hi":"रमेश कुमार","village":"Bahadurgarh","village_hi":"बहादुरगढ़","district":"Karnal","phone":"+91 98765 43210","crop":"Wheat","crop_hi":"गेहूँ","quantity_quintals":120}'::jsonb,
    now(), now(), 'authenticated', 'authenticated', ''
  ) ON CONFLICT (id) DO UPDATE SET
    encrypted_password = v_encrypted_pw,
    email_confirmed_at = now(),
    raw_user_meta_data = EXCLUDED.raw_user_meta_data;

  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud, confirmation_token
  ) VALUES
  (
    v_centre_id, '00000000-0000-0000-0000-000000000000', 'centre@kisansetu.demo', v_encrypted_pw, now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"role":"centre_operator","full_name":"Balwinder Singh (In-Charge)","full_name_hi":"बलविंदर सिंह (प्रभारी)","district":"Karnal","phone":"+91 98123 45678"}'::jsonb,
    now(), now(), 'authenticated', 'authenticated', ''
  ) ON CONFLICT (id) DO UPDATE SET
    encrypted_password = v_encrypted_pw,
    email_confirmed_at = now(),
    raw_user_meta_data = EXCLUDED.raw_user_meta_data;

  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud, confirmation_token
  ) VALUES
  (
    v_admin_id, '00000000-0000-0000-0000-000000000000', 'admin@kisansetu.demo', v_encrypted_pw, now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"role":"district_admin","full_name":"Dr. Amit Verma, IAS","full_name_hi":"डॉ. अमित वर्मा, आईएएस","district":"Karnal","phone":"+91 94160 11223"}'::jsonb,
    now(), now(), 'authenticated', 'authenticated', ''
  ) ON CONFLICT (id) DO UPDATE SET
    encrypted_password = v_encrypted_pw,
    email_confirmed_at = now(),
    raw_user_meta_data = EXCLUDED.raw_user_meta_data;

  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud, confirmation_token
  ) VALUES
  (
    v_super_id, '00000000-0000-0000-0000-000000000000', 'super@kisansetu.demo', v_encrypted_pw, now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"role":"super_admin","full_name":"Haryana State Agri Directorate","full_name_hi":"हरियाणा राज्य कृषि निदेशालय","district":"Chandigarh HQ","phone":"+91 172 256 0000"}'::jsonb,
    now(), now(), 'authenticated', 'authenticated', ''
  ) ON CONFLICT (id) DO UPDATE SET
    encrypted_password = v_encrypted_pw,
    email_confirmed_at = now(),
    raw_user_meta_data = EXCLUDED.raw_user_meta_data;

  -- 2. Insert Profiles
  INSERT INTO public.profiles (id, role, full_name, full_name_hi, phone, district, village, village_hi, language)
  VALUES
  (v_farmer_id, 'farmer', 'Ramesh Kumar', 'रमेश कुमार', '+91 98765 43210', 'Karnal', 'Bahadurgarh', 'बहादुरगढ़', 'hi'),
  (v_centre_id, 'centre_operator', 'Balwinder Singh (In-Charge)', 'बलविंदर सिंह (प्रभारी)', '+91 98123 45678', 'Karnal', 'Nilokheri Mandi', 'निलोखेड़ी मंडी', 'hi'),
  (v_admin_id, 'district_admin', 'Dr. Amit Verma, IAS', 'डॉ. अमित वर्मा, आईएएस', '+91 94160 11223', 'Karnal', 'District HQ', 'जिला मुख्यालय', 'en'),
  (v_super_id, 'super_admin', 'Haryana State Agri Directorate', 'हरियाणा राज्य कृषि निदेशालय', '+91 172 256 0000', 'Chandigarh HQ', 'State HQ', 'राज्य मुख्यालय', 'en')
  ON CONFLICT (id) DO UPDATE SET
    role = EXCLUDED.role,
    full_name = EXCLUDED.full_name;

  -- 3. Insert Farmer Details
  INSERT INTO public.farmers (id, farmer_id_code, crop, crop_hi, quantity_quintals, land_area_acres, bank_name, bank_account_masked)
  VALUES (v_farmer_id, 'HR-KRN-2026-88214', 'Wheat', 'गेहूँ', 120, 8.5, 'Punjab National Bank', 'PNB ••••4417')
  ON CONFLICT (id) DO UPDATE SET
    crop = EXCLUDED.crop,
    quantity_quintals = EXCLUDED.quantity_quintals;

  -- 4. Insert Procurement Centres
  INSERT INTO public.procurement_centres (
    id, code, name, name_hi, distance_km, queue_length, predicted_wait_min, capacity_used_pct,
    daily_capacity_quintals, procured_today_quintals, active_counters, total_counters,
    processing_rate_per_hour, farmers_today, map_x, map_y, recommended,
    recommendation_reasons, recommendation_reasons_hi
  ) VALUES
  (
    v_centre_a_id, 'A', 'Mandi Centre A — Karnal City', 'मंडी केंद्र A — करनाल शहर',
    7, 42, 126, 91, 4200, 3822, 4, 6, 21, 138, 34, 38, false,
    '[]'::jsonb, '[]'::jsonb
  ),
  (
    v_centre_b_id, 'B', 'Mandi Centre B — Nilokheri', 'मंडी केंद्र B — निलोखेड़ी',
    12, 13, 41, 54, 3800, 2052, 5, 6, 24, 84, 62, 26, true,
    '["Predicted wait 41 min vs 126 min at Centre A — 85 minutes saved", "Only 54% capacity used, so your 120 quintals fit today''s window", "5 of 6 counters active — highest processing rate in the district (24 farmers/hr)", "Extra 5 km travel costs ~11 min, but saves 85 min of waiting"]'::jsonb,
    '["अनुमानित प्रतीक्षा 41 मिनट, केंद्र A पर 126 मिनट — 85 मिनट की बचत", "केवल 54% क्षमता उपयोग — आपके 120 क्विंटल आज ही तुल जाएंगे", "6 में से 5 काउंटर चालू — जिले में सबसे तेज़ (24 किसान/घंटा)", "5 किमी अतिरिक्त यात्रा में ~11 मिनट, पर 85 मिनट प्रतीक्षा बचती है"]'::jsonb
  ),
  (
    v_centre_c_id, 'C', 'Mandi Centre C — Indri', 'मंडी केंद्र C — इंद्री',
    18, 8, 48, 47, 2600, 1222, 3, 5, 16, 51, 78, 62, false,
    '[]'::jsonb, '[]'::jsonb
  ),
  (
    v_centre_d_id, 'D', 'Mandi Centre D — Gharaunda', 'मंडी केंद्र D — घरौंडा',
    22, 19, 63, 68, 3100, 2108, 4, 5, 18, 73, 22, 72, false,
    '[]'::jsonb, '[]'::jsonb
  ),
  (
    v_centre_e_id, 'E', 'Mandi Centre E — Assandh', 'मंडी केंद्र E — असंध',
    31, 27, 84, 79, 2900, 2291, 3, 4, 15, 66, 50, 82, false,
    '[]'::jsonb, '[]'::jsonb
  );

  -- 5. Insert Slots
  INSERT INTO public.slots (id, centre_id, date, "window", demand_level, ai_recommended, confidence_pct, reason, reason_hi, booked_by, is_booked)
  VALUES
  (gen_random_uuid(), v_centre_b_id, 'Today', '09:00 – 09:30', 'high', false, 75, 'Morning opening surge', 'सुबह का प्रारंभिक दबाव', NULL, false),
  (gen_random_uuid(), v_centre_b_id, 'Today', '10:00 – 10:30', 'high', false, 80, 'Peak morning arrivals', 'सुबह का मुख्य समय', NULL, false),
  (v_slot_1_id, v_centre_b_id, 'Today', '11:30 – 12:00', 'low', true, 93, 'Counter load dips after the 10:00 rush; arriving at 11:30 means near-zero idle waiting.', '10 बजे की भीड़ के बाद काउंटर खाली होते हैं; 11:30 पर पहुँचने से प्रतीक्षा लगभग शून्य।', v_farmer_id, true),
  (gen_random_uuid(), v_centre_b_id, 'Today', '12:30 – 13:00', 'moderate', false, 85, 'Stable afternoon throughput', 'दोपहर की स्थिर गति', NULL, false),
  (gen_random_uuid(), v_centre_b_id, 'Today', '13:30 – 14:00', 'low', false, 88, 'Post-lunch capacity open', 'दोपहर बाद खाली समय', NULL, false);

  -- 6. Insert Queue Ticket for Ramesh Kumar
  INSERT INTO public.queue_tickets (
    id, token, farmer_id, farmer_name, farmer_name_hi, village, centre_id, slot_id, slot_window,
    farmers_ahead, eta_minutes, stage, crop, quantity_quintals, waited_min, counter_assigned
  ) VALUES (
    v_ticket_id, 'KS-3842', v_farmer_id, 'Ramesh Kumar', 'रमेश कुमार', 'Bahadurgarh', v_centre_b_id, v_slot_1_id,
    '11:30 – 12:00', 4, 18, 'in_queue', 'Wheat', 120, 6, 3
  );

  -- Other queue tickets for Centre B live queue table
  INSERT INTO public.queue_tickets (token, farmer_id, farmer_name, village, centre_id, slot_window, farmers_ahead, eta_minutes, stage, crop, quantity_quintals, waited_min)
  VALUES
  ('KS-3838', v_farmer_id, 'Sukhbir Singh', 'Nilokheri', v_centre_b_id, '10:30 – 11:00', 0, 0, 'weighing', 'Wheat', 85, 34),
  ('KS-3839', v_farmer_id, 'Meena Devi', 'Kohand', v_centre_b_id, '11:00 – 11:30', 1, 4, 'grading', 'Wheat', 62, 26),
  ('KS-3840', v_farmer_id, 'Harpal Rana', 'Bastara', v_centre_b_id, '11:00 – 11:30', 2, 9, 'in_queue', 'Wheat', 140, 21),
  ('KS-3841', v_farmer_id, 'Jaswant Lal', 'Uchana', v_centre_b_id, '11:30 – 12:00', 3, 13, 'in_queue', 'Wheat', 96, 12),
  ('KS-3843', v_farmer_id, 'Pooja Sharma', 'Munak', v_centre_b_id, '12:00 – 12:30', 5, 23, 'in_queue', 'Wheat', 74, 0),
  ('KS-3836', v_farmer_id, 'Amar Chand', 'Nigdhu', v_centre_b_id, '10:00 – 10:30', 0, 0, 'payment', 'Wheat', 110, 48),
  ('KS-3835', v_farmer_id, 'Balwan Singh', 'Kachhwa', v_centre_b_id, '09:30 – 10:00', 0, 0, 'done', 'Wheat', 58, 52);

  -- 7. Insert Procurement Timeline for Ramesh Kumar
  INSERT INTO public.procurement_timeline (ticket_id, step_id, label, label_hi, detail, detail_hi, state, timestamp_str, sort_order)
  VALUES
  (v_ticket_id, 'registration', 'Registration verified', 'पंजीकरण सत्यापित', 'Farmer ID HR-KRN-2026-88214 · Wheat · 120 quintals', 'किसान आईडी HR-KRN-2026-88214 · गेहूँ · 120 क्विंटल', 'done', '08:12', 1),
  (v_ticket_id, 'slot', 'Smart slot allotted', 'स्मार्ट स्लॉट आवंटित', 'Centre B · 11:30 – 12:00 · 93% confidence', 'केंद्र B · 11:30 – 12:00 · 93% विश्वास', 'done', '08:14', 2),
  (v_ticket_id, 'queue', 'Virtual queue — token KS-3842', 'वर्चुअल कतार — टोकन KS-3842', '4 farmers ahead · ETA 18 min', '4 किसान आगे · अनुमानित 18 मिनट', 'active', '11:26', 3),
  (v_ticket_id, 'grading', 'Quality grading & weighing', 'गुणवत्ता जाँच और तुलाई', 'Counter 3 reserved for your token', 'आपके टोकन के लिए काउंटर 3 आरक्षित', 'upcoming', NULL, 4),
  (v_ticket_id, 'receipt', 'Digital procurement receipt', 'डिजिटल खरीद रसीद', 'Auto-generated after weighing', 'तुलाई के बाद स्वतः बनेगी', 'upcoming', NULL, 5),
  (v_ticket_id, 'payment', 'Payment credited to bank', 'भुगतान बैंक में जमा', 'Direct benefit transfer · expected in 48 hours', 'सीधा लाभ हस्तांतरण · 48 घंटे में अपेक्षित', 'upcoming', NULL, 6);

  -- 8. Insert Payment Status for Ramesh Kumar
  INSERT INTO public.payments (ticket_id, farmer_id, gross_amount, rate_per_quintal, quintals, stage, expected_credit_in, expected_credit_in_hi, bank_masked, progress_pct)
  VALUES (v_ticket_id, v_farmer_id, 291600, 2430, 120, 'approved', 'Credited within 48 hours of weighing', 'तुलाई के 48 घंटे के भीतर जमा', 'PNB ••••4417', 55);

  -- 9. Insert Operational Alerts
  INSERT INTO public.centre_alerts (centre_id, severity, title, detail, at_minutes, is_resolved)
  VALUES
  (v_centre_a_id, 'critical', 'Centre A predicted to exceed safe capacity in 42 minutes', 'Arrival rate 31/hr vs processing rate 21/hr. Projected queue 68 by 13:10.', 42, false),
  (v_centre_b_id, 'warning', 'Counter 5 & 6 idle — staff reassigned to gunny bag loading', 'Reactivating both counters lifts processing rate to 28/hr.', NULL, false),
  (v_centre_a_id, 'info', 'Moisture rejections up 4% since 09:00', 'Advise farmers to sun-dry before arrival; grading time up 1.4 min per lot.', NULL, false);

  -- 10. Insert AI Recommendations
  INSERT INTO public.ai_recommendations (
    headline, rationale, impact, confidence_pct, shift_appointments, from_centre_id, to_centre_id, status
  ) VALUES (
    'Shift 18 future appointments → Centre B',
    'Centre A crosses 95% safe capacity in 42 minutes. Centre B holds 46% headroom and 5 active counters within a 12 km radius of the affected farmers.',
    'Average wait at Centre A drops 126 → 58 min · 0 farmers turned away · 4 vehicles saved from overnight halt',
    89, 18, v_centre_a_id, v_centre_b_id, 'pending'
  );

  -- 11. Insert Live Activity Feed Events
  INSERT INTO public.activity_feed (at_time, kind, message, centre_id)
  VALUES
  ('11:26', 'queue', 'Token KS-3842 entered virtual queue at Centre B · 4 ahead', v_centre_b_id),
  ('11:24', 'ai', 'Congestion model flagged Centre A: 95% safe capacity in 42 min', v_centre_a_id),
  ('11:21', 'payment', '₹2.14 L released to 9 farmers · Centre D batch #221', v_centre_d_id),
  ('11:19', 'centre', 'Centre C opened counter 4 — processing rate 16 → 20/hr', v_centre_c_id),
  ('11:16', 'queue', 'Centre E queue crossed 25 · yellow health status', v_centre_e_id),
  ('11:12', 'admin', 'District officer viewed Centre A capacity forecast', v_centre_a_id);

  -- 12. Insert Welcome Notification
  INSERT INTO public.notifications (user_id, title, body)
  VALUES (v_farmer_id, 'टोकन जारी (Token Issued)', 'टोकन KS-3842 आवंटित। केंद्र B पर समय 11:30 – 12:00.');

END $$;
`;

async function runSeed() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected! Seeding initial data & demo accounts...');
    await client.query(seedSql);
    console.log('Database seeded successfully!');
    await client.end();
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  }
}

runSeed();
