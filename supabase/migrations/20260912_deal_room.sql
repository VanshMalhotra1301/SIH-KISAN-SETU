-- ============================================================================
-- KISAN SETU — Deal Room & Negotiation Chat Migration
-- File: supabase/migrations/20260912_deal_room.sql
-- Purpose: Adds deal_messages table, updates bids status check constraint,
--          sets up RLS policies, atomic negotiation RPCs, and Realtime publication.
-- ============================================================================

-- 1. UPDATE bids.status CHECK CONSTRAINT TO INCLUDE 'negotiating'
DO $$
BEGIN
  -- Drop existing status check if present
  ALTER TABLE public.bids DROP CONSTRAINT IF EXISTS bids_status_check;
  ALTER TABLE public.bids ADD CONSTRAINT bids_status_check
    CHECK (status IN ('active', 'negotiating', 'outbid', 'accepted', 'rejected', 'withdrawn'));
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- 2. CREATE deal_messages TABLE
CREATE TABLE IF NOT EXISTS public.deal_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bid_id UUID NOT NULL REFERENCES public.bids(id) ON DELETE CASCADE,
    window_id UUID NOT NULL REFERENCES public.bidding_windows(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    sender_role TEXT NOT NULL CHECK (sender_role IN ('farmer', 'buyer')),
    message TEXT NOT NULL,
    proposed_price NUMERIC(10, 2) DEFAULT NULL,
    proposed_quantity NUMERIC(12, 2) DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deal_messages_bid_id ON public.deal_messages(bid_id);
CREATE INDEX IF NOT EXISTS idx_deal_messages_window_id ON public.deal_messages(window_id);
CREATE INDEX IF NOT EXISTS idx_deal_messages_sender_id ON public.deal_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_deal_messages_created_at ON public.deal_messages(created_at);

-- 3. ROW LEVEL SECURITY
ALTER TABLE public.deal_messages ENABLE ROW LEVEL SECURITY;

-- SELECT: Farmers see messages for their windows; Buyers see messages for their bids; Admins see all
DROP POLICY IF EXISTS "deal_messages_select_policy" ON public.deal_messages;
CREATE POLICY "deal_messages_select_policy" ON public.deal_messages
FOR SELECT TO authenticated USING (
    -- Farmer owns the window
    EXISTS (
        SELECT 1 FROM public.bidding_windows bw
        WHERE bw.id = deal_messages.window_id
        AND bw.farmer_id = auth.uid()
    )
    OR
    -- Buyer owns the bid
    EXISTS (
        SELECT 1 FROM public.bids b
        WHERE b.id = deal_messages.bid_id
        AND b.buyer_id = auth.uid()
    )
    OR
    -- Admins
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
        AND p.role IN ('district_admin', 'super_admin')
    )
);

-- INSERT: Authenticated users can insert if they are the farmer for that window or buyer for that bid
DROP POLICY IF EXISTS "deal_messages_insert_policy" ON public.deal_messages;
CREATE POLICY "deal_messages_insert_policy" ON public.deal_messages
FOR INSERT TO authenticated WITH CHECK (
    sender_id = auth.uid()
    AND (
        (sender_role = 'farmer' AND EXISTS (
            SELECT 1 FROM public.bidding_windows bw
            WHERE bw.id = window_id AND bw.farmer_id = auth.uid()
        ))
        OR
        (sender_role = 'buyer' AND EXISTS (
            SELECT 1 FROM public.bids b
            WHERE b.id = bid_id AND b.buyer_id = auth.uid()
        ))
    )
);

-- 4. ATOMIC STORED PROCEDURES (RPCs)

-- A. Send Deal Message & Update Negotiation Status
CREATE OR REPLACE FUNCTION public.send_deal_message(
    p_bid_id UUID,
    p_window_id UUID,
    p_sender_id UUID,
    p_sender_role TEXT,
    p_message TEXT,
    p_proposed_price NUMERIC DEFAULT NULL,
    p_proposed_quantity NUMERIC DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_bid RECORD;
    v_window RECORD;
    v_buyer RECORD;
    v_farmer RECORD;
    v_message_id UUID;
    v_recipient_id UUID;
    v_notif_title TEXT;
    v_notif_body TEXT;
BEGIN
    -- Verify window
    SELECT * INTO v_window FROM public.bidding_windows WHERE id = p_window_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Bidding window % not found', p_window_id;
    END IF;

    -- Verify bid
    SELECT * INTO v_bid FROM public.bids WHERE id = p_bid_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Bid % not found', p_bid_id;
    END IF;

    -- Verify sender authorization
    IF p_sender_role = 'farmer' AND v_window.farmer_id != p_sender_id THEN
        RAISE EXCEPTION 'Unauthorized: only the lot owner can send farmer messages';
    END IF;

    IF p_sender_role = 'buyer' AND v_bid.buyer_id != p_sender_id THEN
        RAISE EXCEPTION 'Unauthorized: only the bidding buyer can send buyer messages';
    END IF;

    -- Insert deal message
    INSERT INTO public.deal_messages (
        bid_id, window_id, sender_id, sender_role, message,
        proposed_price, proposed_quantity, created_at
    )
    VALUES (
        p_bid_id, p_window_id, p_sender_id, p_sender_role, p_message,
        p_proposed_price, p_proposed_quantity, NOW()
    )
    RETURNING id INTO v_message_id;

    -- Update bid to 'negotiating' if currently 'active'
    IF v_bid.status = 'active' THEN
        UPDATE public.bids SET status = 'negotiating', updated_at = NOW()
        WHERE id = p_bid_id;
    END IF;

    -- If buyer proposed a price and it's >= MSP, update bid_amount
    IF p_sender_role = 'buyer' AND p_proposed_price IS NOT NULL AND p_proposed_price >= v_window.msp_rate THEN
        UPDATE public.bids
        SET bid_amount = p_proposed_price,
            quantity_quintals = COALESCE(p_proposed_quantity, quantity_quintals),
            updated_at = NOW()
        WHERE id = p_bid_id;
    END IF;

    -- Send notification to counterparty
    IF p_sender_role = 'farmer' THEN
        v_recipient_id := v_bid.buyer_id;
        v_notif_title := 'किसान से बातचीत संदेश (Farmer Deal Message)';
        IF p_proposed_price IS NOT NULL THEN
            v_notif_body := 'किसान ने ₹' || p_proposed_price || '/क्विंटल का नया प्रस्ताव भेजा है: "' || substring(p_message from 1 for 60) || '"';
        ELSE
            v_notif_body := 'किसान का संदेश: "' || substring(p_message from 1 for 60) || '"';
        END IF;
    ELSE
        v_recipient_id := v_window.farmer_id;
        SELECT * INTO v_buyer FROM public.buyers WHERE user_id = v_bid.buyer_id;
        v_notif_title := 'खरीदार से नया प्रस्ताव (Buyer Deal Proposal)';
        IF p_proposed_price IS NOT NULL THEN
            v_notif_body := COALESCE(v_buyer.business_name, 'खरीदार') || ' ने ₹' || p_proposed_price || '/क्विंटल की नई दर प्रस्तावित की है।';
        ELSE
            v_notif_body := COALESCE(v_buyer.business_name, 'खरीदार') || ': "' || substring(p_message from 1 for 60) || '"';
        END IF;
    END IF;

    INSERT INTO public.notifications (user_id, title, body, is_read, created_at)
    VALUES (v_recipient_id, v_notif_title, v_notif_body, FALSE, NOW());

    -- Audit log
    INSERT INTO public.audit_logs (actor_id, actor_role, action, target_type, target_id, metadata, created_at)
    VALUES (
        p_sender_id, p_sender_role, 'deal_message_sent', 'deal_messages', v_message_id::text,
        jsonb_build_object(
            'bid_id', p_bid_id,
            'window_id', p_window_id,
            'proposed_price', p_proposed_price,
            'proposed_quantity', p_proposed_quantity
        ),
        NOW()
    );

    RETURN jsonb_build_object(
        'success', true,
        'message_id', v_message_id,
        'created_at', NOW()
    );
END;
$$;

-- B. Reject Bid by Farmer
CREATE OR REPLACE FUNCTION public.reject_bid(
    p_bid_id UUID,
    p_farmer_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_bid RECORD;
    v_window RECORD;
BEGIN
    SELECT * INTO v_bid FROM public.bids WHERE id = p_bid_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Bid % not found', p_bid_id;
    END IF;

    SELECT * INTO v_window FROM public.bidding_windows WHERE id = v_bid.window_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Bidding window % not found', v_bid.window_id;
    END IF;

    IF v_window.farmer_id != p_farmer_id THEN
        RAISE EXCEPTION 'Unauthorized: you do not own this bidding window';
    END IF;

    UPDATE public.bids
    SET status = 'rejected', updated_at = NOW()
    WHERE id = p_bid_id;

    -- Notify buyer
    INSERT INTO public.notifications (user_id, title, body, is_read, created_at)
    VALUES (
        v_bid.buyer_id,
        'बोली अस्वीकृत (Bid Rejected by Farmer)',
        'किसान ने आपकी ₹' || v_bid.bid_amount || '/क्विंटल की बोली को अस्वीकार कर दिया है। Your offer was not accepted.',
        FALSE,
        NOW()
    );

    -- Audit log
    INSERT INTO public.audit_logs (actor_id, actor_role, action, target_type, target_id, metadata, created_at)
    VALUES (
        p_farmer_id, 'farmer', 'bid_rejected', 'bids', p_bid_id::text,
        jsonb_build_object('window_id', v_bid.window_id, 'amount', v_bid.bid_amount),
        NOW()
    );

    RETURN jsonb_build_object('success', true, 'bid_id', p_bid_id, 'status', 'rejected');
END;
$$;

-- C. Continue Normal Procurement / Cancel Bidding Window
CREATE OR REPLACE FUNCTION public.cancel_bidding_window(
    p_window_id UUID,
    p_farmer_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_window RECORD;
BEGIN
    SELECT * INTO v_window FROM public.bidding_windows WHERE id = p_window_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Bidding window % not found', p_window_id;
    END IF;

    IF v_window.farmer_id != p_farmer_id THEN
        RAISE EXCEPTION 'Unauthorized: you do not own this bidding window';
    END IF;

    IF v_window.status = 'accepted' THEN
        RAISE EXCEPTION 'Cannot cancel a window that has already been accepted';
    END IF;

    -- Mark window cancelled
    UPDATE public.bidding_windows
    SET status = 'cancelled', updated_at = NOW()
    WHERE id = p_window_id;

    -- Mark any active / negotiating bids as rejected
    UPDATE public.bids
    SET status = 'rejected', updated_at = NOW()
    WHERE window_id = p_window_id AND status IN ('active', 'negotiating');

    -- Notify all active bidders
    INSERT INTO public.notifications (user_id, title, body, is_read, created_at)
    SELECT
        b.buyer_id,
        'बोली खिड़की बंद (Bidding Window Closed)',
        'किसान ने सामान्य सरकारी MSP खरीद जारी रखने का विकल्प चुना है। The lot has proceeded to standard MSP procurement.',
        FALSE,
        NOW()
    FROM public.bids b
    WHERE b.window_id = p_window_id;

    -- Audit log
    INSERT INTO public.audit_logs (actor_id, actor_role, action, target_type, target_id, metadata, created_at)
    VALUES (
        p_farmer_id, 'farmer', 'bidding_window_cancelled', 'bidding_windows', p_window_id::text,
        jsonb_build_object('reason', 'continued_normal_procurement'),
        NOW()
    );

    RETURN jsonb_build_object('success', true, 'window_id', p_window_id, 'status', 'cancelled');
END;
$$;

-- D. Update accept_bid to accept both 'active' and 'negotiating' status bids
CREATE OR REPLACE FUNCTION public.accept_bid(
    p_bid_id UUID,
    p_farmer_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_bid RECORD;
    v_window RECORD;
    v_buyer RECORD;
BEGIN
    -- Lock and fetch the bid
    SELECT * INTO v_bid
    FROM public.bids
    WHERE id = p_bid_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Bid % not found', p_bid_id;
    END IF;

    -- Lock and fetch the window
    SELECT * INTO v_window
    FROM public.bidding_windows
    WHERE id = v_bid.window_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Bidding window not found for bid %', p_bid_id;
    END IF;

    -- Verify the farmer owns this window
    IF v_window.farmer_id != p_farmer_id THEN
        RAISE EXCEPTION 'Unauthorized: you are not the owner of this bidding window';
    END IF;

    -- Verify window is still open
    IF v_window.status != 'open' THEN
        RAISE EXCEPTION 'Bidding window is no longer open (status: %)', v_window.status;
    END IF;

    -- Verify bid is active or negotiating
    IF v_bid.status NOT IN ('active', 'negotiating') THEN
        RAISE EXCEPTION 'This bid is no longer active (status: %)', v_bid.status;
    END IF;

    -- Accept the bid
    UPDATE public.bids SET status = 'accepted', updated_at = NOW()
    WHERE id = p_bid_id;

    -- Reject all other bids on this window
    UPDATE public.bids SET status = 'rejected', updated_at = NOW()
    WHERE window_id = v_bid.window_id AND id != p_bid_id;

    -- Lock the window
    UPDATE public.bidding_windows
    SET status = 'accepted',
        accepted_bid_id = p_bid_id,
        accepted_buyer_id = v_bid.buyer_id,
        updated_at = NOW()
    WHERE id = v_bid.window_id;

    -- Get buyer details for notification
    SELECT * INTO v_buyer FROM public.buyers WHERE user_id = v_bid.buyer_id;

    -- Notify the winning buyer
    INSERT INTO public.notifications (user_id, title, body, is_read, created_at)
    VALUES (
        v_bid.buyer_id,
        'बोली स्वीकृत! (Bid Accepted!)',
        'किसान ने आपकी ₹' || v_bid.bid_amount || '/क्विंटल की बोली स्वीकार कर ली है। Your bid of ₹' || v_bid.bid_amount || '/qtl for ' || v_window.crop || ' has been accepted.',
        FALSE,
        NOW()
    );

    -- Notify the farmer (confirmation)
    INSERT INTO public.notifications (user_id, title, body, is_read, created_at)
    VALUES (
        p_farmer_id,
        'बोली स्वीकृत (Bid Accepted)',
        'आपने ₹' || v_bid.bid_amount || '/क्विंटल की बोली स्वीकार कर ली है। ' || COALESCE(v_buyer.business_name, 'Buyer') || ' से खरीदारी तय हुई।',
        FALSE,
        NOW()
    );

    -- Notify rejected bidders
    INSERT INTO public.notifications (user_id, title, body, is_read, created_at)
    SELECT
        b.buyer_id,
        'बोली अस्वीकृत (Bid Not Accepted)',
        'किसान ने ' || v_window.crop || ' की दूसरी बोली स्वीकार कर ली है। Your bid on ' || v_window.crop || ' was not selected.',
        FALSE,
        NOW()
    FROM public.bids b
    WHERE b.window_id = v_bid.window_id
    AND b.id != p_bid_id
    AND b.buyer_id != v_bid.buyer_id;

    -- Audit log
    INSERT INTO public.audit_logs (actor_id, actor_role, action, target_type, target_id, metadata, created_at)
    VALUES (
        p_farmer_id, 'farmer', 'bid_accepted', 'bids', p_bid_id::text,
        jsonb_build_object(
            'window_id', v_bid.window_id,
            'buyer_id', v_bid.buyer_id,
            'amount', v_bid.bid_amount,
            'crop', v_window.crop,
            'quantity', v_bid.quantity_quintals
        ),
        NOW()
    );

    RETURN jsonb_build_object(
        'success', true,
        'bidId', p_bid_id,
        'windowId', v_bid.window_id,
        'buyerId', v_bid.buyer_id,
        'amount', v_bid.bid_amount
    );
END;
$$;
GRANT EXECUTE ON FUNCTION public.reject_bid TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cancel_bidding_window TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.deal_messages TO anon, authenticated, service_role;

-- 6. SUPABASE REALTIME PUBLICATION
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'deal_messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.deal_messages;
  END IF;
END $$;

-- 7. NOTIFY POSTGREST TO RELOAD SCHEMA CACHE
NOTIFY pgrst, 'reload schema';
