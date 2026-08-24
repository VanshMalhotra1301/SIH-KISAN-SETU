import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Client } = pg;

const migrationSql = `
-- 1. Create grievances table
CREATE TABLE IF NOT EXISTS public.grievances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES public.queue_tickets(id) ON DELETE SET NULL,
  farmer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  farmer_name TEXT NOT NULL,
  farmer_phone TEXT,
  centre_id UUID REFERENCES public.procurement_centres(id) ON DELETE SET NULL,
  centre_name TEXT,
  district TEXT NOT NULL,
  category TEXT NOT NULL, -- 'weighing', 'delay', 'payment', 'quality_rejection', 'staff_conduct', 'portal_bug', 'other'
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium', -- 'critical', 'high', 'medium', 'low'
  status TEXT NOT NULL DEFAULT 'new', -- 'new', 'pending', 'escalated', 'resolved', 'reopened'
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_to_name TEXT,
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Enable RLS & Policies
ALTER TABLE public.grievances ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "grievances_select" ON public.grievances;
CREATE POLICY "grievances_select" ON public.grievances FOR SELECT USING (true);

DROP POLICY IF EXISTS "grievances_modify" ON public.grievances;
CREATE POLICY "grievances_modify" ON public.grievances FOR ALL USING (true);

-- 3. Add to Realtime
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.grievances;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;
`;

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  console.log("Applying Grievances schema to Postgres...");
  await client.query(migrationSql);
  console.log("✅ Grievances table and Realtime publication created!");

  // Check if any grievances exist, if not, seed realistic initial complaints
  const { rows: existing } = await client.query("SELECT count(*) FROM public.grievances");
  if (parseInt(existing[0].count) === 0) {
    console.log("Seeding initial government grievances...");
    const { rows: centres } = await client.query("SELECT id, name FROM public.procurement_centres LIMIT 4");
    const { rows: farmers } = await client.query("SELECT id, full_name, phone, district FROM public.profiles WHERE role = 'farmer' LIMIT 4");

    const sampleFarmer = farmers[0] || { id: null, full_name: 'Balwinder Singh', phone: '+91 98765 43210', district: 'Karnal' };
    const sampleFarmer2 = farmers[1] || { id: null, full_name: 'Rajinder Kumar', phone: '+91 98123 45678', district: 'Kurukshetra' };
    const sampleFarmer3 = farmers[2] || { id: null, full_name: 'Sukhvinder Kaur', phone: '+91 98987 12345', district: 'Kaithal' };

    const c1 = centres[0] || { id: null, name: 'Main Procurement Centre 1', district: 'Karnal' };
    const c2 = centres[1] || { id: null, name: 'Procurement Centre 2', district: 'Karnal' };
    const c3 = centres[2] || { id: null, name: 'Procurement Centre 3', district: 'Kurukshetra' };

    const seedQueries = [
      `INSERT INTO public.grievances (farmer_id, farmer_name, farmer_phone, centre_id, centre_name, district, category, subject, description, priority, status, assigned_to_name, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'weighing', 'Weighbridge tare weight mismatch', 'Discrepancy of 1.8 quintals between tractor tare on outer scale and official electronic weighbridge.', 'critical', 'escalated', 'District Food & Supplies Controller', now() - interval '2 hours');`,
      `INSERT INTO public.grievances (farmer_id, farmer_name, farmer_phone, centre_id, centre_name, district, category, subject, description, priority, status, assigned_to_name, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'delay', 'Counter #2 processing halted over 45 minutes', 'Tractor line extending to highway due to printer toner outage at documentation counter.', 'high', 'pending', 'Centre Superintendent', now() - interval '4 hours');`,
      `INSERT INTO public.grievances (farmer_id, farmer_name, farmer_phone, centre_id, centre_name, district, category, subject, description, priority, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'payment', 'PFMS direct bank credit pending past 48h SLA', 'Digital invoice JF-2026-A-4102 approved 52 hours ago; DBT credit not reflected in PNB account.', 'high', 'new', now() - interval '1 day');`,
      `INSERT INTO public.grievances (farmer_id, farmer_name, farmer_phone, centre_id, centre_name, district, category, subject, description, priority, status, assigned_to_name, resolution_notes, resolved_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'quality_rejection', 'Moisture meter recalibration requested', 'Farmer contested 13.2% moisture reading. Secondary lab re-inspection passed at 11.4% FAQ.', 'medium', 'resolved', 'Assistant Food Supply Officer', 'Sample re-tested in district quality lab. Passed FAQ specifications. Lot accepted and weighed.', now() - interval '3 hours', now() - interval '6 hours');`
    ];

    if (sampleFarmer.id) {
      await client.query(seedQueries[0], [sampleFarmer.id, sampleFarmer.full_name, sampleFarmer.phone, c1.id, c1.name, c1.district || 'Karnal']);
      await client.query(seedQueries[1], [sampleFarmer2.id || sampleFarmer.id, sampleFarmer2.full_name, sampleFarmer2.phone, c2.id, c2.name, c2.district || 'Karnal']);
      await client.query(seedQueries[2], [sampleFarmer3.id || sampleFarmer.id, sampleFarmer3.full_name, sampleFarmer3.phone, c3.id, c3.name, c3.district || 'Kurukshetra']);
      await client.query(seedQueries[3], [sampleFarmer.id, sampleFarmer.full_name, sampleFarmer.phone, c1.id, c1.name, c1.district || 'Karnal']);
      console.log("✅ 4 realistic sample grievances seeded successfully!");
    }
  }

  await client.end();
}

run().catch(console.error);
