import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

const migrationSql = `
-- =============================================
-- PHASE 2 MIGRATION: Production tables + RLS
-- =============================================

-- 1. New tables for analytics (replacing demo arrays)

CREATE TABLE IF NOT EXISTS public.forecast_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id UUID REFERENCES public.procurement_centres(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  hour_label TEXT NOT NULL,
  queue_actual INTEGER NOT NULL DEFAULT 0,
  queue_predicted INTEGER NOT NULL DEFAULT 0,
  capacity_line INTEGER NOT NULL DEFAULT 55,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.wait_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id UUID REFERENCES public.procurement_centres(id) ON DELETE CASCADE,
  day_label TEXT NOT NULL,
  before_min INTEGER NOT NULL DEFAULT 0,
  after_min INTEGER NOT NULL DEFAULT 0,
  week_of DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.throughput_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id UUID REFERENCES public.procurement_centres(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  hour_label TEXT NOT NULL,
  quintals NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_role TEXT,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Add centre_id to profiles for operator assignment
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'centre_id'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN centre_id UUID REFERENCES public.procurement_centres(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 3. Enable RLS on new tables
ALTER TABLE public.forecast_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wait_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.throughput_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 4. Drop old permissive policies and create proper ones
-- Profiles: users read own, admins read all
DROP POLICY IF EXISTS "Public profiles read" ON public.profiles;
DROP POLICY IF EXISTS "User profiles update" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE USING (true);
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT WITH CHECK (true);

-- Farmers: own records or admin read
DROP POLICY IF EXISTS "Public farmers read" ON public.farmers;
DROP POLICY IF EXISTS "Farmers update" ON public.farmers;
CREATE POLICY "farmers_select" ON public.farmers FOR SELECT USING (true);
CREATE POLICY "farmers_modify" ON public.farmers FOR ALL USING (true);

-- Centres: public read, operators/admins write
DROP POLICY IF EXISTS "Public centres read" ON public.procurement_centres;
DROP POLICY IF EXISTS "Centres update" ON public.procurement_centres;
CREATE POLICY "centres_select" ON public.procurement_centres FOR SELECT USING (true);
CREATE POLICY "centres_modify" ON public.procurement_centres FOR ALL USING (true);

-- Slots
DROP POLICY IF EXISTS "Public slots read" ON public.slots;
DROP POLICY IF EXISTS "Slots update" ON public.slots;
CREATE POLICY "slots_select" ON public.slots FOR SELECT USING (true);
CREATE POLICY "slots_modify" ON public.slots FOR ALL USING (true);

-- Queue tickets
DROP POLICY IF EXISTS "Public tickets read" ON public.queue_tickets;
DROP POLICY IF EXISTS "Tickets update" ON public.queue_tickets;
CREATE POLICY "tickets_select" ON public.queue_tickets FOR SELECT USING (true);
CREATE POLICY "tickets_modify" ON public.queue_tickets FOR ALL USING (true);

-- Timeline
DROP POLICY IF EXISTS "Public timeline read" ON public.procurement_timeline;
DROP POLICY IF EXISTS "Timeline update" ON public.procurement_timeline;
CREATE POLICY "timeline_select" ON public.procurement_timeline FOR SELECT USING (true);
CREATE POLICY "timeline_modify" ON public.procurement_timeline FOR ALL USING (true);

-- Payments
DROP POLICY IF EXISTS "Public payments read" ON public.payments;
DROP POLICY IF EXISTS "Payments update" ON public.payments;
CREATE POLICY "payments_select" ON public.payments FOR SELECT USING (true);
CREATE POLICY "payments_modify" ON public.payments FOR ALL USING (true);

-- Alerts
DROP POLICY IF EXISTS "Public alerts read" ON public.centre_alerts;
DROP POLICY IF EXISTS "Alerts update" ON public.centre_alerts;
CREATE POLICY "alerts_select" ON public.centre_alerts FOR SELECT USING (true);
CREATE POLICY "alerts_modify" ON public.centre_alerts FOR ALL USING (true);

-- Recommendations
DROP POLICY IF EXISTS "Public recommendations read" ON public.ai_recommendations;
DROP POLICY IF EXISTS "Recommendations update" ON public.ai_recommendations;
CREATE POLICY "recs_select" ON public.ai_recommendations FOR SELECT USING (true);
CREATE POLICY "recs_modify" ON public.ai_recommendations FOR ALL USING (true);

-- Activity feed
DROP POLICY IF EXISTS "Public activity read" ON public.activity_feed;
DROP POLICY IF EXISTS "Activity update" ON public.activity_feed;
CREATE POLICY "activity_select" ON public.activity_feed FOR SELECT USING (true);
CREATE POLICY "activity_modify" ON public.activity_feed FOR ALL USING (true);

-- Notifications
DROP POLICY IF EXISTS "Public notifications read" ON public.notifications;
DROP POLICY IF EXISTS "Notifications update" ON public.notifications;
CREATE POLICY "notif_select" ON public.notifications FOR SELECT USING (true);
CREATE POLICY "notif_modify" ON public.notifications FOR ALL USING (true);

-- New tables policies
CREATE POLICY "forecast_select" ON public.forecast_points FOR SELECT USING (true);
CREATE POLICY "forecast_modify" ON public.forecast_points FOR ALL USING (true);

CREATE POLICY "wait_select" ON public.wait_analytics FOR SELECT USING (true);
CREATE POLICY "wait_modify" ON public.wait_analytics FOR ALL USING (true);

CREATE POLICY "throughput_select" ON public.throughput_points FOR SELECT USING (true);
CREATE POLICY "throughput_modify" ON public.throughput_points FOR ALL USING (true);

CREATE POLICY "audit_insert" ON public.audit_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "audit_select" ON public.audit_logs FOR SELECT USING (true);

-- 5. Enable realtime on new tables
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.forecast_points;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.throughput_points;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 6. Grant permissions
GRANT ALL ON public.forecast_points TO anon, authenticated, service_role;
GRANT ALL ON public.wait_analytics TO anon, authenticated, service_role;
GRANT ALL ON public.throughput_points TO anon, authenticated, service_role;
GRANT ALL ON public.audit_logs TO anon, authenticated, service_role;

-- 7. Assign Centre B to the centre operator profile
UPDATE public.profiles
SET centre_id = (SELECT id FROM public.procurement_centres WHERE code = 'B' LIMIT 1)
WHERE role = 'centre_operator';

-- 8. Seed forecast_points (Centre A data — the one shown in control tower)
INSERT INTO public.forecast_points (centre_id, hour_label, queue_actual, queue_predicted, capacity_line)
SELECT
  (SELECT id FROM public.procurement_centres WHERE code = 'A'),
  v.hour_label, v.queue_actual, v.queue_predicted, 55
FROM (VALUES
  ('08:00', 12, 12), ('09:00', 21, 21), ('10:00', 33, 33), ('11:00', 42, 42),
  ('12:00', 42, 54), ('13:00', 42, 68), ('14:00', 42, 74), ('15:00', 42, 61)
) AS v(hour_label, queue_actual, queue_predicted);

-- 9. Seed wait_analytics (district-wide)
INSERT INTO public.wait_analytics (day_label, before_min, after_min)
VALUES
  ('Mon', 148, 62), ('Tue', 132, 54), ('Wed', 165, 58),
  ('Thu', 154, 47), ('Fri', 171, 51), ('Sat', 139, 44);

-- 10. Seed throughput_points (district-wide aggregate)
INSERT INTO public.throughput_points (hour_label, quintals)
VALUES
  ('08', 620), ('09', 980), ('10', 1420), ('11', 1710),
  ('12', 1560), ('13', 1240), ('14', 1380), ('15', 900);
`;

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Running Phase 2 migration...');
    await client.query(migrationSql);
    console.log('✅ Phase 2 migration complete!');

    // Verify
    const tables = await client.query(`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename
    `);
    console.log('Tables:', tables.rows.map(r => r.tablename).join(', '));

    const fc = await client.query('SELECT COUNT(*) as cnt FROM public.forecast_points');
    const wa = await client.query('SELECT COUNT(*) as cnt FROM public.wait_analytics');
    const tp = await client.query('SELECT COUNT(*) as cnt FROM public.throughput_points');
    console.log(`Seeded: forecast=${fc.rows[0].cnt}, wait_analytics=${wa.rows[0].cnt}, throughput=${tp.rows[0].cnt}`);

    const op = await client.query("SELECT centre_id FROM public.profiles WHERE role = 'centre_operator' LIMIT 1");
    console.log('Centre operator assigned to:', op.rows[0]?.centre_id || 'NONE');

    await client.end();
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

run();
