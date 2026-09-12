import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Client } = pg;
const client = new Client({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:SIH2026KISANSETU@db.yylgukviahqpuznlcddp.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

const migrationSql = `
-- ============================================================================
-- 1. EXTEND PROFILES TABLE
-- ============================================================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS department TEXT;

-- ============================================================================
-- 2. MSP RATES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.msp_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crop TEXT NOT NULL UNIQUE,
    rate_per_quintal NUMERIC(10, 2) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.msp_rates (crop, rate_per_quintal)
VALUES 
    ('Wheat', 2275.00),
    ('Paddy', 2183.00),
    ('Mustard', 5650.00),
    ('Gram', 5440.00),
    ('Cotton', 6620.00),
    ('Maize', 2090.00),
    ('Bajra', 2500.00),
    ('Soybean', 4600.00)
ON CONFLICT (crop) DO NOTHING;

-- ============================================================================
-- 3. BUYERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.buyers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    business_name TEXT NOT NULL,
    business_type TEXT NOT NULL DEFAULT 'trader'
        CHECK (business_type IN ('trader', 'processor', 'exporter', 'miller', 'cooperative')),
    license_number TEXT NOT NULL DEFAULT '',
    licence_number TEXT DEFAULT '',
    centre_id UUID NOT NULL REFERENCES public.procurement_centres(id) ON DELETE RESTRICT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_buyers_user_id ON public.buyers(user_id);
CREATE INDEX IF NOT EXISTS idx_buyers_centre_id ON public.buyers(centre_id);

-- ============================================================================
-- 4. BIDDING WINDOWS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.bidding_windows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL UNIQUE,
    farmer_id UUID NOT NULL,
    centre_id UUID NOT NULL,
    crop VARCHAR(100) NOT NULL,
    quantity_quintals NUMERIC(12, 2) NOT NULL,
    msp_rate NUMERIC(10, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'accepted', 'expired', 'cancelled')),
    accepted_bid_id UUID,
    accepted_buyer_id UUID,
    opens_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closes_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '2 hours'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT bidding_windows_farmer_id_fkey FOREIGN KEY (farmer_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
    CONSTRAINT bidding_windows_centre_id_fkey FOREIGN KEY (centre_id) REFERENCES public.procurement_centres(id) ON DELETE RESTRICT,
    CONSTRAINT bidding_windows_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.queue_tickets(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_bidding_windows_farmer_id ON public.bidding_windows(farmer_id);
CREATE INDEX IF NOT EXISTS idx_bidding_windows_centre_status ON public.bidding_windows(centre_id, status);
CREATE INDEX IF NOT EXISTS idx_bidding_windows_ticket_id ON public.bidding_windows(ticket_id);
CREATE INDEX IF NOT EXISTS idx_bidding_windows_status ON public.bidding_windows(status);

-- ============================================================================
-- 5. BIDS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.bids (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    window_id UUID NOT NULL,
    buyer_id UUID NOT NULL,
    bid_amount NUMERIC(10, 2) NOT NULL,
    quantity_quintals NUMERIC(12, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'outbid', 'accepted', 'rejected', 'withdrawn')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_active_bid_per_buyer_per_window UNIQUE (window_id, buyer_id),
    CONSTRAINT bids_window_id_fkey FOREIGN KEY (window_id) REFERENCES public.bidding_windows(id) ON DELETE CASCADE,
    CONSTRAINT bids_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES public.buyers(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_bids_window_id ON public.bids(window_id);
CREATE INDEX IF NOT EXISTS idx_bids_buyer_id ON public.bids(buyer_id);
CREATE INDEX IF NOT EXISTS idx_bids_status ON public.bids(status);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_accepted_bid'
  ) THEN
    ALTER TABLE public.bidding_windows
      ADD CONSTRAINT fk_accepted_bid
      FOREIGN KEY (accepted_bid_id) REFERENCES public.bids(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================================
-- 6. ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE public.buyers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bidding_windows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;

-- Buyers policies
DROP POLICY IF EXISTS "buyers_select_policy" ON public.buyers;
CREATE POLICY "buyers_select_policy" ON public.buyers
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "buyers_insert_policy" ON public.buyers;
CREATE POLICY "buyers_insert_policy" ON public.buyers
    FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "buyers_update_policy" ON public.buyers;
CREATE POLICY "buyers_update_policy" ON public.buyers
    FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "buyers_admin_all" ON public.buyers;
CREATE POLICY "buyers_admin_all" ON public.buyers
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('super_admin', 'district_admin')
        )
    );

-- Bidding windows policies
DROP POLICY IF EXISTS "bidding_windows_select_policy" ON public.bidding_windows;
CREATE POLICY "bidding_windows_select_policy" ON public.bidding_windows
    FOR SELECT TO authenticated USING (
        farmer_id = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM public.buyers b
            WHERE b.user_id = auth.uid()
            AND b.centre_id = bidding_windows.centre_id
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

DROP POLICY IF EXISTS "bidding_windows_farmer_insert" ON public.bidding_windows;
CREATE POLICY "bidding_windows_farmer_insert" ON public.bidding_windows
    FOR INSERT TO authenticated WITH CHECK (
        farmer_id = auth.uid()
    );

DROP POLICY IF EXISTS "bidding_windows_farmer_update" ON public.bidding_windows;
CREATE POLICY "bidding_windows_farmer_update" ON public.bidding_windows
    FOR UPDATE TO authenticated USING (
        farmer_id = auth.uid()
    ) WITH CHECK (
        farmer_id = auth.uid()
    );

-- Bids policies
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
            SELECT 1 FROM public.bidding_windows bw
            JOIN public.buyers b ON b.centre_id = bw.centre_id
            WHERE bw.id = bids.window_id
            AND b.user_id = auth.uid()
            AND b.is_active = TRUE
        )
        OR
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.role IN ('district_admin', 'super_admin')
        )
    );

DROP POLICY IF EXISTS "bids_insert_policy" ON public.bids;
CREATE POLICY "bids_insert_policy" ON public.bids
    FOR INSERT TO authenticated WITH CHECK (
        buyer_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.bidding_windows bw
            JOIN public.buyers b ON b.centre_id = bw.centre_id
            WHERE bw.id = window_id
            AND b.user_id = auth.uid()
            AND b.is_active = TRUE
            AND bw.status = 'open'
        )
    );

DROP POLICY IF EXISTS "bids_update_policy" ON public.bids;
CREATE POLICY "bids_update_policy" ON public.bids
    FOR UPDATE TO authenticated USING (
        buyer_id = auth.uid()
    ) WITH CHECK (
        buyer_id = auth.uid()
    );

-- ============================================================================
-- 7. CLEANUP OLD OVERLOADS OF register_user_account
-- ============================================================================
DROP FUNCTION IF EXISTS public.register_user_account(text, text, text, text, text, text, text, text, numeric, uuid, text);
DROP FUNCTION IF EXISTS public.register_user_account(text, text, text, text, text, text, text, text, numeric, uuid, text, text, text, text, numeric, text);
DROP FUNCTION IF EXISTS public.register_user_account(text, text, text, text, text, text, text, text, numeric, uuid, text, text, text, text, numeric, text, text, text, text);

-- ============================================================================
-- 8. UNIFIED register_user_account STORED PROCEDURE (ALL 5 ROLES)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.register_user_account(
  p_email TEXT,
  p_password TEXT,
  p_role TEXT,
  p_full_name TEXT,
  p_phone TEXT,
  p_district TEXT DEFAULT 'Karnal',
  p_village TEXT DEFAULT 'Bahadurgarh',
  p_crop TEXT DEFAULT 'Wheat',
  p_quantity NUMERIC DEFAULT 120,
  p_centre_id UUID DEFAULT NULL,
  p_department TEXT DEFAULT 'Department of Agriculture',
  p_bank_name TEXT DEFAULT 'State Bank of India',
  p_bank_account TEXT DEFAULT NULL,
  p_ifsc_code TEXT DEFAULT 'SBIN0001234',
  p_land_area NUMERIC DEFAULT 5.0,
  p_aadhaar_number TEXT DEFAULT NULL,
  p_business_name TEXT DEFAULT NULL,
  p_business_type TEXT DEFAULT 'trader',
  p_license_number TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_encrypted_pw TEXT;
  v_clean_email TEXT;
  v_existing_id UUID;
  v_masked_acc TEXT;
  v_masked_aadhaar TEXT;
  v_farmer_code TEXT;
BEGIN
  v_clean_email := lower(trim(p_email));
  
  -- Check if user already exists
  SELECT id INTO v_existing_id FROM auth.users WHERE email = v_clean_email;
  IF v_existing_id IS NOT NULL THEN
    RAISE EXCEPTION 'An account with email % already exists. Please sign in.', v_clean_email;
  END IF;

  v_user_id := gen_random_uuid();
  v_encrypted_pw := crypt(p_password, gen_salt('bf', 10));

  -- Mask bank account and aadhaar
  IF p_bank_account IS NOT NULL AND length(trim(p_bank_account)) >= 4 THEN
    v_masked_acc := coalesce(p_bank_name, 'Bank') || ' ••••' || right(trim(p_bank_account), 4);
  ELSE
    v_masked_acc := coalesce(p_bank_name, 'Bank') || ' ••••4417';
  END IF;

  IF p_aadhaar_number IS NOT NULL AND length(trim(p_aadhaar_number)) >= 4 THEN
    v_masked_aadhaar := '•••• •••• ' || right(trim(p_aadhaar_number), 4);
  ELSE
    v_masked_aadhaar := '•••• •••• ' || to_char(floor(1000 + random() * 8999)::int, 'FM9999');
  END IF;

  v_farmer_code := 'HR-' || upper(coalesce(substring(p_district from 1 for 3), 'KRN')) || '-2026-' || upper(substring(v_user_id::text from 1 for 5));

  -- 1. Insert into auth.users (instantly confirmed, active)
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) VALUES (
    v_user_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    v_clean_email, v_encrypted_pw, now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object(
      'role', p_role,
      'full_name', p_full_name,
      'phone', p_phone,
      'district', p_district,
      'village', p_village,
      'crop', p_crop,
      'quantity_quintals', p_quantity,
      'centre_id', p_centre_id,
      'department', p_department,
      'bank_name', p_bank_name,
      'bank_account_masked', v_masked_acc,
      'ifsc_code', p_ifsc_code,
      'land_area_acres', p_land_area,
      'farmer_id_code', v_farmer_code,
      'business_name', p_business_name,
      'business_type', p_business_type,
      'license_number', p_license_number
    ),
    false, now(), now(), '', '', '', ''
  );

  -- 2. Insert into auth.identities
  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), v_user_id,
    jsonb_build_object('sub', v_user_id, 'email', v_clean_email),
    'email', v_user_id::text, now(), now(), now()
  );

  -- 3. Insert into public.profiles
  INSERT INTO public.profiles (
    id, email, role, full_name, full_name_hi, phone, district, village, village_hi, language, centre_id, department, created_at, updated_at
  ) VALUES (
    v_user_id, v_clean_email, p_role, p_full_name, p_full_name, p_phone, p_district, p_village, p_village, 'hi', p_centre_id, p_department, now(), now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    district = EXCLUDED.district,
    village = EXCLUDED.village,
    centre_id = EXCLUDED.centre_id,
    department = EXCLUDED.department,
    updated_at = now();

  -- 4. If role is farmer, insert into public.farmers
  IF p_role = 'farmer' THEN
    INSERT INTO public.farmers (
      id, farmer_id_code, crop, crop_hi, quantity_quintals, land_area_acres,
      bank_name, bank_account_masked, bank_account_number, ifsc_code, aadhaar_number_masked
    ) VALUES (
      v_user_id,
      v_farmer_code,
      p_crop,
      CASE WHEN p_crop = 'Wheat' THEN 'गेहूँ' WHEN p_crop = 'Paddy' THEN 'धान' WHEN p_crop = 'Mustard' THEN 'सरसों' ELSE 'चना' END,
      p_quantity,
      coalesce(p_land_area, 5.0),
      coalesce(p_bank_name, 'State Bank of India'),
      v_masked_acc,
      p_bank_account,
      coalesce(p_ifsc_code, 'SBIN0001234'),
      v_masked_aadhaar
    )
    ON CONFLICT (id) DO UPDATE SET
      crop = EXCLUDED.crop,
      crop_hi = EXCLUDED.crop_hi,
      quantity_quintals = EXCLUDED.quantity_quintals,
      land_area_acres = EXCLUDED.land_area_acres,
      bank_name = EXCLUDED.bank_name,
      bank_account_masked = EXCLUDED.bank_account_masked,
      ifsc_code = EXCLUDED.ifsc_code;
  END IF;

  -- 5. If role is buyer, insert into public.buyers
  IF p_role = 'buyer' THEN
    INSERT INTO public.buyers (
      user_id, business_name, business_type, license_number, licence_number, centre_id, is_active, created_at, updated_at
    ) VALUES (
      v_user_id,
      coalesce(p_business_name, 'Unnamed Business'),
      coalesce(p_business_type, 'trader'),
      coalesce(p_license_number, ''),
      coalesce(p_license_number, ''),
      p_centre_id,
      true,
      now(),
      now()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      business_name = EXCLUDED.business_name,
      business_type = EXCLUDED.business_type,
      license_number = EXCLUDED.license_number,
      licence_number = EXCLUDED.licence_number,
      centre_id = EXCLUDED.centre_id,
      updated_at = now();
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'email', v_clean_email,
    'role', p_role,
    'farmer_id_code', v_farmer_code
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 9. BIDDING WORKFLOW STORED PROCEDURES (RPCs)
-- ============================================================================

-- A. Create Bidding Window
CREATE OR REPLACE FUNCTION public.create_bidding_window(
    p_ticket_id UUID,
    p_farmer_id UUID,
    p_centre_id UUID,
    p_crop TEXT,
    p_quantity NUMERIC
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_window_id UUID;
    v_msp_rate NUMERIC;
    v_existing UUID;
BEGIN
    SELECT id INTO v_existing
    FROM public.bidding_windows
    WHERE ticket_id = p_ticket_id
    LIMIT 1;

    IF v_existing IS NOT NULL THEN
        RETURN v_existing;
    END IF;

    SELECT rate_per_quintal INTO v_msp_rate
    FROM public.msp_rates
    WHERE crop = p_crop AND is_active = TRUE
    LIMIT 1;

    IF v_msp_rate IS NULL THEN
        v_msp_rate := 2275.00;
    END IF;

    INSERT INTO public.bidding_windows (
        ticket_id, farmer_id, centre_id, crop, quantity_quintals,
        msp_rate, status, opens_at, closes_at
    )
    VALUES (
        p_ticket_id, p_farmer_id, p_centre_id, p_crop, p_quantity,
        v_msp_rate, 'open', NOW(), NOW() + INTERVAL '2 hours'
    )
    RETURNING id INTO v_window_id;

    INSERT INTO public.audit_logs (actor_id, actor_role, action, target_type, target_id, metadata, created_at)
    VALUES (
        p_farmer_id, 'farmer', 'bidding_window_created', 'bidding_windows', v_window_id::text,
        jsonb_build_object('crop', p_crop, 'quantity', p_quantity, 'msp_rate', v_msp_rate, 'centre_id', p_centre_id),
        NOW()
    );

    RETURN v_window_id;
END;
$$;

-- B. Submit Bid
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

    IF v_buyer.centre_id != v_window.centre_id THEN
        RAISE EXCEPTION 'Buyer is not authorised for this mandi (centre)';
    END IF;

    IF p_bid_amount < v_window.msp_rate THEN
        RAISE EXCEPTION 'Bid amount (%) must be at least MSP rate (%)', p_bid_amount, v_window.msp_rate;
    END IF;

    SELECT id INTO v_existing_bid
    FROM public.bids
    WHERE window_id = p_window_id AND buyer_id = p_buyer_id;

    IF v_existing_bid IS NOT NULL THEN
        UPDATE public.bids
        SET bid_amount = p_bid_amount,
            quantity_quintals = p_quantity,
            status = 'active',
            updated_at = NOW()
        WHERE id = v_existing_bid;
        v_bid_id := v_existing_bid;
    ELSE
        INSERT INTO public.bids (window_id, buyer_id, bid_amount, quantity_quintals, status)
        VALUES (p_window_id, p_buyer_id, p_bid_amount, p_quantity, 'active')
        RETURNING id INTO v_bid_id;
    END IF;

    INSERT INTO public.audit_logs (actor_id, actor_role, action, target_type, target_id, metadata, created_at)
    VALUES (
        p_buyer_id, 'buyer', 'bid_submitted', 'bids', v_bid_id::text,
        jsonb_build_object('window_id', p_window_id, 'amount', p_bid_amount, 'quantity', p_quantity),
        NOW()
    );

    INSERT INTO public.notifications (user_id, title, body, is_read)
    VALUES (
        v_window.farmer_id,
        'नई बोली प्राप्त (New Bid Received)',
        'आपकी फ़सल पर ₹' || p_bid_amount || '/क्विंटल की बोली प्राप्त हुई है। A bid of ₹' || p_bid_amount || '/qtl has been placed on your produce.',
        FALSE
    );

    RETURN v_bid_id;
END;
$$;

-- C. Accept Bid
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
    SELECT * INTO v_bid
    FROM public.bids
    WHERE id = p_bid_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Bid % not found', p_bid_id;
    END IF;

    SELECT * INTO v_window
    FROM public.bidding_windows
    WHERE id = v_bid.window_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Bidding window not found for bid %', p_bid_id;
    END IF;

    IF v_window.farmer_id != p_farmer_id THEN
        RAISE EXCEPTION 'Unauthorized: you are not the owner of this bidding window';
    END IF;

    IF v_window.status != 'open' THEN
        RAISE EXCEPTION 'Bidding window is no longer open (status: %)', v_window.status;
    END IF;

    IF v_bid.status != 'active' THEN
        RAISE EXCEPTION 'This bid is no longer active (status: %)', v_bid.status;
    END IF;

    UPDATE public.bids SET status = 'accepted', updated_at = NOW()
    WHERE id = p_bid_id;

    UPDATE public.bids SET status = 'rejected', updated_at = NOW()
    WHERE window_id = v_bid.window_id AND id != p_bid_id;

    UPDATE public.bidding_windows
    SET status = 'accepted',
        accepted_bid_id = p_bid_id,
        accepted_buyer_id = v_bid.buyer_id,
        updated_at = NOW()
    WHERE id = v_bid.window_id;

    SELECT * INTO v_buyer FROM public.buyers WHERE user_id = v_bid.buyer_id;

    INSERT INTO public.notifications (user_id, title, body, is_read)
    VALUES (
        v_bid.buyer_id,
        'बोली स्वीकृत! (Bid Accepted!)',
        'किसान ने आपकी ₹' || v_bid.bid_amount || '/क्विंटल की बोली स्वीकार कर ली है। Your bid of ₹' || v_bid.bid_amount || '/qtl for ' || v_window.crop || ' has been accepted.',
        FALSE
    );

    INSERT INTO public.notifications (user_id, title, body, is_read)
    VALUES (
        p_farmer_id,
        'बोली स्वीकृत (Bid Accepted)',
        'आपने ₹' || v_bid.bid_amount || '/क्विंटल की बोली स्वीकार कर ली है। ' || COALESCE(v_buyer.business_name, 'Buyer') || ' से खरीदारी तय हुई।',
        FALSE
    );

    INSERT INTO public.notifications (user_id, title, body, is_read)
    SELECT
        b.buyer_id,
        'बोली अस्वीकृत (Bid Not Accepted)',
        'किसान ने ' || v_window.crop || ' की दूसरी बोली स्वीकार कर ली है। Your bid on ' || v_window.crop || ' was not selected.',
        FALSE
    FROM public.bids b
    WHERE b.window_id = v_bid.window_id
    AND b.id != p_bid_id
    AND b.buyer_id != v_bid.buyer_id;

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

-- ============================================================================
-- 10. GRANTS
-- ============================================================================
GRANT EXECUTE ON FUNCTION public.register_user_account TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_bidding_window TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.submit_bid TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.accept_bid TO anon, authenticated, service_role;

GRANT ALL ON TABLE public.msp_rates TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.buyers TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.bidding_windows TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.bids TO anon, authenticated, service_role;

-- ============================================================================
-- 11. SUPABASE REALTIME PUBLICATION
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'bidding_windows') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.bidding_windows;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'bids') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.bids;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'buyers') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.buyers;
  END IF;
END $$;

-- ============================================================================
-- 12. RELOAD POSTGREST SCHEMA CACHE
-- ============================================================================
NOTIFY pgrst, 'reload schema';
`;

async function run() {
  console.log('Connecting to database...');
  await client.connect();
  console.log('Running Buyer & Bidding Migration...');
  await client.query(migrationSql);
  console.log('✅ Migration executed successfully!');
  await client.end();
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
