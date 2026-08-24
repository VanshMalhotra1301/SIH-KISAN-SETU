import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

const schemaSql = `
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop existing tables if needed in reverse dependency order
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.activity_feed CASCADE;
DROP TABLE IF EXISTS public.ai_recommendations CASCADE;
DROP TABLE IF EXISTS public.centre_alerts CASCADE;
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.procurement_timeline CASCADE;
DROP TABLE IF EXISTS public.queue_tickets CASCADE;
DROP TABLE IF EXISTS public.slots CASCADE;
DROP TABLE IF EXISTS public.procurement_centres CASCADE;
DROP TABLE IF EXISTS public.farmers CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 1. Profiles Table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('farmer', 'centre_operator', 'district_admin', 'super_admin')),
  full_name TEXT NOT NULL,
  full_name_hi TEXT,
  phone TEXT,
  district TEXT DEFAULT 'Karnal',
  village TEXT,
  village_hi TEXT,
  language TEXT DEFAULT 'hi',
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Farmers Table
CREATE TABLE public.farmers (
  id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  farmer_id_code TEXT UNIQUE NOT NULL,
  crop TEXT NOT NULL DEFAULT 'Wheat',
  crop_hi TEXT DEFAULT 'गेहूँ',
  quantity_quintals NUMERIC NOT NULL DEFAULT 120,
  land_area_acres NUMERIC DEFAULT 8.5,
  bank_name TEXT DEFAULT 'Punjab National Bank',
  bank_account_masked TEXT DEFAULT 'PNB ••••4417',
  ifsc_code TEXT DEFAULT 'PUNB0024100',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Procurement Centres Table
CREATE TABLE public.procurement_centres (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  name_hi TEXT NOT NULL,
  distance_km NUMERIC NOT NULL DEFAULT 10,
  queue_length INTEGER NOT NULL DEFAULT 0,
  predicted_wait_min INTEGER NOT NULL DEFAULT 0,
  capacity_used_pct INTEGER NOT NULL DEFAULT 50,
  daily_capacity_quintals NUMERIC NOT NULL DEFAULT 4000,
  procured_today_quintals NUMERIC NOT NULL DEFAULT 0,
  active_counters INTEGER NOT NULL DEFAULT 4,
  total_counters INTEGER NOT NULL DEFAULT 6,
  processing_rate_per_hour INTEGER NOT NULL DEFAULT 20,
  farmers_today INTEGER NOT NULL DEFAULT 0,
  map_x NUMERIC NOT NULL DEFAULT 50,
  map_y NUMERIC NOT NULL DEFAULT 50,
  recommended BOOLEAN DEFAULT false,
  recommendation_reasons JSONB DEFAULT '[]'::jsonb,
  recommendation_reasons_hi JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Slots Table
CREATE TABLE public.slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id UUID REFERENCES public.procurement_centres(id) ON DELETE CASCADE,
  date TEXT NOT NULL DEFAULT 'Today',
  "window" TEXT NOT NULL,
  demand_level TEXT DEFAULT 'normal',
  ai_recommended BOOLEAN DEFAULT false,
  confidence_pct INTEGER DEFAULT 90,
  reason TEXT,
  reason_hi TEXT,
  booked_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_booked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Queue Tickets Table
CREATE TABLE public.queue_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL,
  farmer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  farmer_name TEXT,
  farmer_name_hi TEXT,
  village TEXT,
  centre_id UUID REFERENCES public.procurement_centres(id) ON DELETE CASCADE,
  slot_id UUID REFERENCES public.slots(id) ON DELETE SET NULL,
  slot_window TEXT NOT NULL DEFAULT '11:30 – 12:00',
  farmers_ahead INTEGER NOT NULL DEFAULT 4,
  eta_minutes INTEGER NOT NULL DEFAULT 18,
  stage TEXT NOT NULL DEFAULT 'in_queue',
  crop TEXT DEFAULT 'Wheat',
  quantity_quintals NUMERIC DEFAULT 120,
  waited_min INTEGER DEFAULT 0,
  counter_assigned INTEGER DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Procurement Timeline Table
CREATE TABLE public.procurement_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES public.queue_tickets(id) ON DELETE CASCADE,
  step_id TEXT NOT NULL,
  label TEXT NOT NULL,
  label_hi TEXT NOT NULL,
  detail TEXT,
  detail_hi TEXT,
  state TEXT NOT NULL DEFAULT 'upcoming',
  timestamp_str TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Payments Table
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES public.queue_tickets(id) ON DELETE CASCADE,
  farmer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  gross_amount NUMERIC NOT NULL DEFAULT 291600,
  currency TEXT DEFAULT 'INR',
  rate_per_quintal NUMERIC NOT NULL DEFAULT 2430,
  quintals NUMERIC NOT NULL DEFAULT 120,
  stage TEXT NOT NULL DEFAULT 'approved',
  expected_credit_in TEXT DEFAULT 'Credited within 48 hours of weighing',
  expected_credit_in_hi TEXT DEFAULT 'तुलाई के 48 घंटे के भीतर जमा',
  bank_masked TEXT DEFAULT 'PNB ••••4417',
  progress_pct INTEGER DEFAULT 55,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Centre Alerts Table
CREATE TABLE public.centre_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id UUID REFERENCES public.procurement_centres(id) ON DELETE CASCADE,
  severity TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  detail TEXT NOT NULL,
  at_minutes INTEGER,
  is_resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. AI Recommendations Table
CREATE TABLE public.ai_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  headline TEXT NOT NULL,
  rationale TEXT NOT NULL,
  impact TEXT NOT NULL,
  confidence_pct INTEGER DEFAULT 89,
  shift_appointments INTEGER DEFAULT 18,
  from_centre_id UUID REFERENCES public.procurement_centres(id) ON DELETE SET NULL,
  to_centre_id UUID REFERENCES public.procurement_centres(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  decided_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 10. Activity Feed Table
CREATE TABLE public.activity_feed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  at_time TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'queue',
  message TEXT NOT NULL,
  centre_id UUID REFERENCES public.procurement_centres(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 11. Notifications Table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farmers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procurement_centres ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queue_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procurement_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.centre_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Permissive demo policies (allows public read & authenticated write / demo simulation write)
CREATE POLICY "Public profiles read" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "User profiles update" ON public.profiles FOR ALL USING (true);

CREATE POLICY "Public farmers read" ON public.farmers FOR SELECT USING (true);
CREATE POLICY "Farmers update" ON public.farmers FOR ALL USING (true);

CREATE POLICY "Public centres read" ON public.procurement_centres FOR SELECT USING (true);
CREATE POLICY "Centres update" ON public.procurement_centres FOR ALL USING (true);

CREATE POLICY "Public slots read" ON public.slots FOR SELECT USING (true);
CREATE POLICY "Slots update" ON public.slots FOR ALL USING (true);

CREATE POLICY "Public tickets read" ON public.queue_tickets FOR SELECT USING (true);
CREATE POLICY "Tickets update" ON public.queue_tickets FOR ALL USING (true);

CREATE POLICY "Public timeline read" ON public.procurement_timeline FOR SELECT USING (true);
CREATE POLICY "Timeline update" ON public.procurement_timeline FOR ALL USING (true);

CREATE POLICY "Public payments read" ON public.payments FOR SELECT USING (true);
CREATE POLICY "Payments update" ON public.payments FOR ALL USING (true);

CREATE POLICY "Public alerts read" ON public.centre_alerts FOR SELECT USING (true);
CREATE POLICY "Alerts update" ON public.centre_alerts FOR ALL USING (true);

CREATE POLICY "Public recommendations read" ON public.ai_recommendations FOR SELECT USING (true);
CREATE POLICY "Recommendations update" ON public.ai_recommendations FOR ALL USING (true);

CREATE POLICY "Public activity read" ON public.activity_feed FOR SELECT USING (true);
CREATE POLICY "Activity update" ON public.activity_feed FOR ALL USING (true);

CREATE POLICY "Public notifications read" ON public.notifications FOR SELECT USING (true);
CREATE POLICY "Notifications update" ON public.notifications FOR ALL USING (true);

-- Enable Realtime
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.queue_tickets;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.procurement_centres;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.procurement_timeline;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.centre_alerts;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_recommendations;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_feed;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Trigger to create profile when auth.users is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, role, full_name, full_name_hi, phone, district, village, village_hi, language)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'role', 'farmer'),
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    COALESCE(new.raw_user_meta_data->>'full_name_hi', new.raw_user_meta_data->>'full_name'),
    COALESCE(new.raw_user_meta_data->>'phone', '+91 98000 00000'),
    COALESCE(new.raw_user_meta_data->>'district', 'Karnal'),
    COALESCE(new.raw_user_meta_data->>'village', 'Bahadurgarh'),
    COALESCE(new.raw_user_meta_data->>'village_hi', 'बहादुरगढ़'),
    COALESCE(new.raw_user_meta_data->>'language', 'hi')
  )
  ON CONFLICT (id) DO UPDATE SET
    role = EXCLUDED.role,
    full_name = EXCLUDED.full_name;

  IF COALESCE(new.raw_user_meta_data->>'role', 'farmer') = 'farmer' THEN
    INSERT INTO public.farmers (id, farmer_id_code, crop, crop_hi, quantity_quintals)
    VALUES (
      new.id,
      COALESCE(new.raw_user_meta_data->>'farmer_id_code', 'HR-KRN-2026-' || SUBSTRING(new.id::text, 1, 5)),
      COALESCE(new.raw_user_meta_data->>'crop', 'Wheat'),
      COALESCE(new.raw_user_meta_data->>'crop_hi', 'गेहूँ'),
      COALESCE((new.raw_user_meta_data->>'quantity_quintals')::numeric, 120)
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
`;

async function runMigration() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected! Executing schema DDL...');
    await client.query(schemaSql);
    console.log('Schema created successfully!');
    await client.end();
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

runMigration();
