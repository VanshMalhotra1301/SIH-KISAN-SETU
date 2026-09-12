import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Client } = pg;

async function upgradeBidding() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  console.log("Connected to PostgreSQL database...");

  // 1. Update bidding_windows_select_policy so all active buyers can view open windows across centres
  await client.query(`
    DROP POLICY IF EXISTS "bidding_windows_select_policy" ON public.bidding_windows;
    CREATE POLICY "bidding_windows_select_policy" ON public.bidding_windows
        FOR SELECT TO authenticated USING (
            farmer_id = auth.uid()
            OR
            EXISTS (
                SELECT 1 FROM public.buyers b
                WHERE b.user_id = auth.uid()
                AND b.is_active = TRUE
            )
            OR
            EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.id = auth.uid()
                AND (
                    p.role IN ('district_admin', 'super_admin')
                    OR (p.role = 'centre_operator' AND p.centre_id = bidding_windows.centre_id)
                )
            )
        );
  `);
  console.log("✓ Updated bidding_windows_select_policy");

  // 2. Update bids_select_policy so buyers can view bids on windows they are viewing
  await client.query(`
    DROP POLICY IF EXISTS "bids_select_policy" ON public.bids;
    CREATE POLICY "bids_select_policy" ON public.bids
        FOR SELECT TO authenticated USING (
            buyer_id = auth.uid()
            OR
            EXISTS (
                SELECT 1 FROM public.bidding_windows bw
                WHERE bw.id = bids.window_id
                AND bw.farmer_id = auth.uid()
            )
            OR
            EXISTS (
                SELECT 1 FROM public.buyers b
                WHERE b.user_id = auth.uid()
                AND b.is_active = TRUE
            )
            OR
            EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.id = auth.uid()
                AND p.role IN ('district_admin', 'super_admin')
            )
        );
  `);
  console.log("✓ Updated bids_select_policy");

  // 3. Update submit_bid RPC to allow authorized active buyers to place bids on any open window
  await client.query(`
    CREATE OR REPLACE FUNCTION public.submit_bid(
        p_window_id UUID,
        p_buyer_id UUID,
        p_bid_amount NUMERIC,
        p_quantity NUMERIC
    )
    RETURNS UUID
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    DECLARE
        v_window RECORD;
        v_buyer RECORD;
        v_bid_id UUID;
        v_existing_bid UUID;
    BEGIN
        SELECT * INTO v_window
        FROM public.bidding_windows
        WHERE id = p_window_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Bidding window % not found', p_window_id;
        END IF;

        IF v_window.status != 'open' THEN
            RAISE EXCEPTION 'Bidding window is no longer open (status: %)', v_window.status;
        END IF;

        IF NOW() > v_window.closes_at THEN
            UPDATE public.bidding_windows SET status = 'expired', updated_at = NOW()
            WHERE id = p_window_id;
            RAISE EXCEPTION 'Bidding window has expired';
        END IF;

        SELECT * INTO v_buyer
        FROM public.buyers
        WHERE user_id = p_buyer_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Buyer profile not found for user %', p_buyer_id;
        END IF;

        IF NOT v_buyer.is_active THEN
            RAISE EXCEPTION 'Buyer account is not active';
        END IF;

        IF p_bid_amount < v_window.msp_rate THEN
            RAISE EXCEPTION 'Bid amount (%) must be at least MSP rate (%)', p_bid_amount, v_window.msp_rate;
        END IF;

        -- Check if buyer already has an active bid on this window
        SELECT id INTO v_existing_bid
        FROM public.bids
        WHERE window_id = p_window_id
        AND buyer_id = p_buyer_id
        AND status IN ('active', 'negotiating')
        LIMIT 1;

        IF v_existing_bid IS NOT NULL THEN
            UPDATE public.bids SET
                bid_amount = p_bid_amount,
                quantity_quintals = p_quantity,
                status = 'active',
                updated_at = NOW()
            WHERE id = v_existing_bid
            RETURNING id INTO v_bid_id;
        ELSE
            INSERT INTO public.bids (
                window_id, buyer_id, bid_amount, quantity_quintals, status
            )
            VALUES (
                p_window_id, p_buyer_id, p_bid_amount, p_quantity, 'active'
            )
            RETURNING id INTO v_bid_id;
        END IF;

        INSERT INTO public.notifications (user_id, title, body, is_read)
        VALUES (
            v_window.farmer_id,
            'नई बोली प्राप्त हुई (New Bid Placed)',
            'व्यापारी ' || COALESCE(v_buyer.business_name, 'Buyer') || ' ने ₹' || p_bid_amount::text || '/qtl की बोली लगाई।',
            FALSE
        );

        RETURN v_bid_id;
    END;
    $$;
  `);
  console.log("✓ Updated submit_bid RPC function");

  // 4. Ensure publication contains bidding_windows
  await client.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'bidding_windows') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.bidding_windows;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'bids') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.bids;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'deal_messages') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.deal_messages;
      END IF;
    END $$;
  `);
  console.log("✓ Verified supabase_realtime publications for bidding_windows, bids, deal_messages");

  await client.end();
  console.log("🚀 All database permissions and RPCs upgraded successfully!");
}

upgradeBidding().catch(console.error);
