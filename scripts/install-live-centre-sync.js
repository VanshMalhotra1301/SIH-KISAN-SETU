import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Client } = pg;

const syncSql = `
-- Ensure updated_at column exists
ALTER TABLE public.procurement_centres ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Create function to dynamically compute real-time operational stats for all procurement centres
CREATE OR REPLACE FUNCTION public.recalculate_centre_stats(p_centre_id UUID DEFAULT NULL)
RETURNS VOID AS $$
DECLARE
  r RECORD;
  v_active_queue INT;
  v_procured_today NUMERIC;
  v_farmers_today INT;
  v_wait_min INT;
  v_cap_pct INT;
  v_lowest_score NUMERIC := 999999;
  v_best_centre_id UUID;
  v_score NUMERIC;
BEGIN
  -- For all centres
  FOR r IN SELECT * FROM public.procurement_centres LOOP
    -- 1. Count live active queue tickets
    SELECT count(*) INTO v_active_queue
    FROM public.queue_tickets
    WHERE centre_id = r.id AND stage NOT IN ('done', 'cancelled');

    -- 2. Count total farmers served today
    SELECT count(*) INTO v_farmers_today
    FROM public.queue_tickets
    WHERE centre_id = r.id;

    -- 3. Sum total procured quintals today
    SELECT coalesce(sum(quantity_quintals), 0) INTO v_procured_today
    FROM public.queue_tickets
    WHERE centre_id = r.id AND stage IN ('weighing', 'grading', 'accepted', 'payment', 'done');

    -- 4. Calculate real wait time: (queue / active_counters) * avg processing time per counter (~10 mins)
    v_wait_min := GREATEST(10, ROUND((v_active_queue::NUMERIC / GREATEST(1, r.active_counters)) * 10));

    -- 5. Calculate capacity percentage
    v_cap_pct := LEAST(98, GREATEST(15, ROUND((v_procured_today / GREATEST(100, r.daily_capacity_quintals)) * 100)));
    IF v_active_queue > 0 THEN
      v_cap_pct := GREATEST(v_cap_pct, LEAST(95, 30 + (v_active_queue * 4)));
    END IF;

    -- Update centre live metrics
    UPDATE public.procurement_centres SET
      queue_length = v_active_queue,
      predicted_wait_min = v_wait_min,
      capacity_used_pct = v_cap_pct,
      procured_today_quintals = v_procured_today,
      farmers_today = v_farmers_today,
      updated_at = now()
    WHERE id = r.id;

    -- Compute smart recommendation score (distance * 0.35 + wait_min * 0.65)
    v_score := (r.distance_km * 0.35) + (v_wait_min * 0.65);
    IF v_score < v_lowest_score THEN
      v_lowest_score := v_score;
      v_best_centre_id := r.id;
    END IF;
  END LOOP;

  -- Mark the best optimal centre as recommended
  IF v_best_centre_id IS NOT NULL THEN
    UPDATE public.procurement_centres SET recommended = false WHERE id != v_best_centre_id;
    UPDATE public.procurement_centres SET recommended = true WHERE id = v_best_centre_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on queue_tickets to automatically recalculate centre metrics on any ticket change
CREATE OR REPLACE FUNCTION public.trg_queue_ticket_sync()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.recalculate_centre_stats();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_queue_tickets_centre_sync ON public.queue_tickets;
CREATE TRIGGER trg_queue_tickets_centre_sync
AFTER INSERT OR UPDATE OR DELETE ON public.queue_tickets
FOR EACH STATEMENT
EXECUTE FUNCTION public.trg_queue_ticket_sync();

-- Run initial sync
SELECT public.recalculate_centre_stats();
`;

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  console.log("Installing real-time centre synchronization triggers...");
  await client.query(syncSql);
  console.log("✅ Live centre metrics and recommendation triggers installed!");

  const res = await client.query(`SELECT code, name, distance_km, queue_length, predicted_wait_min, capacity_used_pct, recommended FROM public.procurement_centres ORDER BY code;`);
  console.log("Current Live Centres in DB:", res.rows);

  await client.end();
}

run();
