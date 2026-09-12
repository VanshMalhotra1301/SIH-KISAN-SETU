import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Client } = pg;

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:SIH2026KISANSETU@db.yylgukviahqpuznlcddp.supabase.co:5432/postgres',
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  console.log("Installing generate_demo_lot_for_centre RPC...");

  await client.query(`
    CREATE OR REPLACE FUNCTION public.generate_demo_lot_for_centre(p_centre_id UUID)
    RETURNS UUID
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    DECLARE
        v_farmer_id UUID;
        v_farmer_name TEXT;
        v_ticket_id UUID;
        v_window_id UUID;
        v_crop TEXT;
        v_msp NUMERIC;
        v_qty NUMERIC;
        v_rand INT;
    BEGIN
        -- Pick a farmer
        SELECT id, full_name INTO v_farmer_id, v_farmer_name
        FROM public.profiles
        WHERE role = 'farmer'
        LIMIT 1;

        IF v_farmer_id IS NULL THEN
            RAISE EXCEPTION 'No registered farmer found to associate with lot';
        END IF;

        v_rand := floor(random() * 2)::int;
        IF v_rand = 0 THEN
            v_crop := 'Wheat';
            v_msp := 2430.00;
            v_qty := 120.00;
        ELSE
            v_crop := 'Mustard';
            v_msp := 5650.00;
            v_qty := 95.00;
        END IF;

        -- Create queue ticket
        INSERT INTO public.queue_tickets (
            farmer_id, farmer_name, centre_id, crop, quantity_quintals, stage, slot_window, token
        ) VALUES (
            v_farmer_id, v_farmer_name, p_centre_id, v_crop, v_qty, 'scheduled', '11:00 – 11:45',
            'KS-DEMO-' || floor(1000 + random() * 9000)::text
        ) RETURNING id INTO v_ticket_id;

        -- Create open bidding window
        INSERT INTO public.bidding_windows (
            ticket_id, farmer_id, centre_id, crop, quantity_quintals, msp_rate, status, opens_at, closes_at
        ) VALUES (
            v_ticket_id, v_farmer_id, p_centre_id, v_crop, v_qty, v_msp, 'open',
            NOW(), NOW() + INTERVAL '48 hours'
        ) RETURNING id INTO v_window_id;

        RETURN v_window_id;
    END;
    $$;

    GRANT EXECUTE ON FUNCTION public.generate_demo_lot_for_centre(UUID) TO authenticated, anon;
    NOTIFY pgrst, 'reload schema';
  `);

  console.log("✅ generate_demo_lot_for_centre RPC installed successfully!");
  await client.end();
}

run().catch(console.error);
