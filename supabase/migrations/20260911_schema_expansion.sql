-- ============================================================================
-- KISAN SETU — Supabase Schema Expansion Migration
-- File: supabase/migrations/20260911_schema_expansion.sql
-- Purpose: Creates production tables, indexes, RLS policies, seed data & RPCs
-- ============================================================================

-- 1. MSP RATES TABLE
-- Statutory Minimum Support Price rates per crop and season
CREATE TABLE IF NOT EXISTS public.msp_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crop VARCHAR(100) NOT NULL,
    crop_hi VARCHAR(100) NOT NULL,
    variety VARCHAR(100) DEFAULT 'Common',
    rate_per_quintal NUMERIC(10, 2) NOT NULL,
    effective_season VARCHAR(50) NOT NULL,
    effective_year VARCHAR(10) NOT NULL,
    bonus_per_quintal NUMERIC(10, 2) DEFAULT 0.00,
    faq_moisture_max_pct NUMERIC(4, 2) DEFAULT 12.00,
    faq_foreign_matter_max_pct NUMERIC(4, 2) DEFAULT 0.75,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_crop_season_variety UNIQUE (crop, effective_season, effective_year, variety)
);

-- Seed Official 2026-27 Rabi & Kharif MSP Rates
INSERT INTO public.msp_rates (crop, crop_hi, variety, rate_per_quintal, effective_season, effective_year, bonus_per_quintal, faq_moisture_max_pct, faq_foreign_matter_max_pct)
VALUES 
    ('Wheat', 'गेहूँ', 'FAQ Standard', 2425.00, 'Rabi', '2026-27', 0.00, 12.00, 0.75),
    ('Paddy', 'धान', 'Common', 2300.00, 'Kharif', '2026-27', 0.00, 17.00, 1.00),
    ('Paddy', 'धान', 'Grade A', 2320.00, 'Kharif', '2026-27', 0.00, 17.00, 1.00),
    ('Mustard', 'सरसों', 'Standard FAQ', 5950.00, 'Rabi', '2026-27', 0.00, 8.00, 1.00),
    ('Gram', 'चना', 'Standard Desi', 5650.00, 'Rabi', '2026-27', 0.00, 12.00, 1.00),
    ('Barley', 'जौ', 'Feed/Malt Grade', 1980.00, 'Rabi', '2026-27', 0.00, 12.00, 1.00)
ON CONFLICT (crop, effective_season, effective_year, variety) DO UPDATE 
SET rate_per_quintal = EXCLUDED.rate_per_quintal,
    updated_at = NOW();

-- 2. PROCUREMENT TARGETS TABLE
-- District & Centre targets for season tracking (Target vs Actual)
CREATE TABLE IF NOT EXISTS public.procurement_targets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    district VARCHAR(100) NOT NULL,
    centre_id UUID REFERENCES public.procurement_centres(id) ON DELETE SET NULL,
    crop VARCHAR(100) NOT NULL,
    season VARCHAR(50) NOT NULL,
    target_quintals NUMERIC(12, 2) NOT NULL,
    achieved_quintals NUMERIC(12, 2) DEFAULT 0.00,
    farmers_enrolled INTEGER DEFAULT 0,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_district_centre_crop_season UNIQUE (district, centre_id, crop, season)
);

-- 3. INTERVENTIONS AUDIT TABLE
-- Immutable log of administrative decisions, what-if applications & measured results
CREATE TABLE IF NOT EXISTS public.interventions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recommendation_id VARCHAR(100),
    type VARCHAR(50) NOT NULL CHECK (type IN ('rebalance', 'add_counter', 'extend_hours', 'redirect_traffic', 'manual')),
    description TEXT NOT NULL,
    applied_by VARCHAR(200) NOT NULL,
    district VARCHAR(100),
    applied_at TIMESTAMPTZ DEFAULT NOW(),
    affected_centre_ids JSONB DEFAULT '[]'::jsonb,
    metrics_before JSONB NOT NULL DEFAULT '{"avgWaitMin": 0, "avgCapacityPct": 0, "queueLength": 0}'::jsonb,
    metrics_after JSONB,
    status VARCHAR(50) DEFAULT 'applied' CHECK (status IN ('applied', 'measuring', 'measured', 'failed')),
    measured_result TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_interventions_district ON public.interventions(district);
CREATE INDEX IF NOT EXISTS idx_interventions_applied_at ON public.interventions(applied_at DESC);

-- 4. CONGESTION PREDICTIONS TABLE
-- Time-series projections recorded for model drift and accuracy tracking
CREATE TABLE IF NOT EXISTS public.congestion_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    centre_id UUID NOT NULL REFERENCES public.procurement_centres(id) ON DELETE CASCADE,
    centre_name VARCHAR(200) NOT NULL,
    district VARCHAR(100),
    current_capacity_pct INTEGER NOT NULL,
    predicted_capacity_pct INTEGER NOT NULL,
    predicted_breach_time VARCHAR(50),
    confidence INTEGER NOT NULL,
    factors JSONB DEFAULT '[]'::jsonb,
    recommendation TEXT,
    snapshot_timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_predictions_centre_timestamp ON public.congestion_predictions(centre_id, snapshot_timestamp DESC);

-- 5. SYSTEM CONFIGURATION TABLE
-- Key-value operational parameters (SLA thresholds, moisture caps, slot minutes)
CREATE TABLE IF NOT EXISTS public.system_config (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_by VARCHAR(100),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.system_config (key, value, description)
VALUES 
    ('dbt_sla_hours', '48'::jsonb, 'Statutory PFMS treasury credit window in hours'),
    ('slot_window_minutes', '45'::jsonb, 'Standard time slot duration per farmer appointment'),
    ('grace_period_minutes', '15'::jsonb, 'Late arrival buffer window before rerouting to hourly buffer queue'),
    ('congestion_threshold_pct', '85'::jsonb, 'Yard capacity threshold triggering automated load balancing advice'),
    ('max_daily_intake_quintals_per_scale', '750'::jsonb, 'Rated daily operational intake per electronic weighbridge scale')
ON CONFLICT (key) DO UPDATE 
SET value = EXCLUDED.value,
    updated_at = NOW();

-- ============================================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE public.msp_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procurement_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.congestion_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

-- MSP Rates: Public Read for all authenticated, Write for Super Admins only
CREATE POLICY "msp_rates_select_all" ON public.msp_rates
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "msp_rates_admin_all" ON public.msp_rates
    FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin')
    );

-- Procurement Targets: Read for authenticated, Write for District & Super Admins
CREATE POLICY "procurement_targets_select" ON public.procurement_targets
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "procurement_targets_modify" ON public.procurement_targets
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('district_admin', 'super_admin')
        )
    );

-- Interventions: Read for authenticated, Insert/Update for District & Super Admins
CREATE POLICY "interventions_select" ON public.interventions
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "interventions_insert" ON public.interventions
    FOR INSERT TO authenticated WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('district_admin', 'super_admin')
        )
    );

-- Congestion Predictions: Read for authenticated
CREATE POLICY "predictions_select" ON public.congestion_predictions
    FOR SELECT TO authenticated USING (true);

-- System Config: Read for authenticated, Write for Super Admins only
CREATE POLICY "system_config_select" ON public.system_config
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "system_config_admin" ON public.system_config
    FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin')
    );

-- ============================================================================
-- 7. ATOMIC STORED PROCEDURES (RPCs)
-- ============================================================================

-- A. Register User Account RPC
CREATE OR REPLACE FUNCTION public.register_user_account(
    p_email TEXT,
    p_password TEXT,
    p_role TEXT,
    p_full_name TEXT,
    p_phone TEXT,
    p_district TEXT,
    p_village TEXT DEFAULT '',
    p_crop TEXT DEFAULT 'Wheat',
    p_quantity NUMERIC DEFAULT 100,
    p_centre_id UUID DEFAULT NULL,
    p_department TEXT DEFAULT '',
    p_bank_name TEXT DEFAULT NULL,
    p_bank_account TEXT DEFAULT NULL,
    p_ifsc_code TEXT DEFAULT NULL,
    p_land_area NUMERIC DEFAULT NULL,
    p_aadhaar_number TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Note: Supabase auth.users row is usually created via supabase.auth.signUp or Admin API.
    -- If invoking directly inside trigger or RPC:
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        -- Generate new UUID if invoked prior to initial session
        v_user_id := gen_random_uuid();
    END IF;

    -- Upsert profile record
    INSERT INTO public.profiles (
        id, email, role, full_name, phone, district, centre_id, department, created_at, updated_at
    )
    VALUES (
        v_user_id, p_email, p_role, p_full_name, p_phone, p_district, p_centre_id, p_department, NOW(), NOW()
    )
    ON CONFLICT (id) DO UPDATE
    SET role = EXCLUDED.role,
        full_name = EXCLUDED.full_name,
        phone = EXCLUDED.phone,
        district = EXCLUDED.district,
        centre_id = EXCLUDED.centre_id,
        department = EXCLUDED.department,
        updated_at = NOW();

    -- If farmer role, upsert farmers details
    IF p_role = 'farmer' THEN
        INSERT INTO public.farmers (
            user_id, name, name_hi, phone, district, village, crop, quantity_quintals,
            land_area_acres, bank_name, bank_account_masked, ifsc_code, aadhaar_number, created_at, updated_at
        )
        VALUES (
            v_user_id,
            p_full_name,
            p_full_name,
            p_phone,
            p_district,
            p_village,
            p_crop,
            p_quantity,
            p_land_area,
            p_bank_name,
            CASE 
                WHEN p_bank_account IS NOT NULL AND length(p_bank_account) >= 4 
                THEN '••••' || right(p_bank_account, 4) 
                ELSE NULL 
            END,
            p_ifsc_code,
            p_aadhaar_number,
            NOW(),
            NOW()
        )
        ON CONFLICT (user_id) DO UPDATE
        SET village = EXCLUDED.village,
            crop = EXCLUDED.crop,
            quantity_quintals = EXCLUDED.quantity_quintals,
            bank_name = EXCLUDED.bank_name,
            bank_account_masked = EXCLUDED.bank_account_masked,
            ifsc_code = EXCLUDED.ifsc_code,
            updated_at = NOW();
    END IF;

    RETURN v_user_id;
END;
$$;

-- B. Operator Process Ticket Stage Transition RPC
CREATE OR REPLACE FUNCTION public.operator_process_ticket(
    p_ticket_id UUID,
    p_target_stage TEXT,
    p_operator_id UUID,
    p_counter INTEGER DEFAULT NULL,
    p_gross_weight NUMERIC DEFAULT NULL,
    p_tare_weight NUMERIC DEFAULT NULL,
    p_net_weight NUMERIC DEFAULT NULL,
    p_moisture_pct NUMERIC DEFAULT NULL,
    p_foreign_matter_pct NUMERIC DEFAULT NULL,
    p_grade TEXT DEFAULT NULL,
    p_rejection_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_ticket RECORD;
    v_centre RECORD;
    v_farmer RECORD;
    v_rate NUMERIC;
    v_total_payout NUMERIC;
BEGIN
    SELECT * INTO v_ticket FROM public.queue_tickets WHERE id = p_ticket_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Queue ticket % not found', p_ticket_id;
    END IF;

    SELECT * INTO v_centre FROM public.procurement_centres WHERE id = v_ticket.centre_id;

    -- Update Queue Ticket
    UPDATE public.queue_tickets
    SET stage = p_target_stage,
        counter_assigned = COALESCE(p_counter, counter_assigned),
        updated_at = NOW()
    WHERE id = p_ticket_id;

    -- Handle Final Acceptance & PFMS DBT Trigger
    IF p_target_stage IN ('accepted', 'done') THEN
        -- Look up active MSP rate
        SELECT rate_per_quintal INTO v_rate 
        FROM public.msp_rates 
        WHERE crop = v_ticket.crop AND is_active = TRUE 
        LIMIT 1;

        IF v_rate IS NULL THEN
            v_rate := 2425.00; -- Default Wheat MSP
        END IF;

        v_total_payout := COALESCE(p_net_weight, v_ticket.quantity_quintals, 100) * v_rate;

        -- Create or update official Payment voucher
        INSERT INTO public.payments (
            ticket_id, farmer_id, gross_amount, rate_per_quintal, quintals, stage, 
            expected_credit_in, expected_credit_in_hi, pfms_reference, created_at, updated_at
        )
        VALUES (
            p_ticket_id,
            v_ticket.farmer_id,
            v_total_payout,
            v_rate,
            COALESCE(p_net_weight, v_ticket.quantity_quintals, 100),
            'verified',
            'Within 48 hours',
            '48 घंटे के भीतर खाते में जमा',
            'PFMS-' || upper(substr(md5(random()::text), 1, 10)),
            NOW(),
            NOW()
        )
        ON CONFLICT (ticket_id) DO UPDATE
        SET stage = 'verified',
            gross_amount = EXCLUDED.gross_amount,
            quintals = EXCLUDED.quintals,
            updated_at = NOW();

        -- Update centre day metrics
        UPDATE public.procurement_centres
        SET procured_today_quintals = procured_today_quintals + COALESCE(p_net_weight, 100),
            farmers_today = farmers_today + 1
        WHERE id = v_ticket.centre_id;
    END IF;

    -- Audit log entry
    INSERT INTO public.audit_logs (
        user_id, action, target_type, target_id, metadata, created_at
    )
    VALUES (
        p_operator_id,
        'operator_stage_transition',
        'queue_tickets',
        p_ticket_id::text,
        jsonb_build_object(
            'target_stage', p_target_stage,
            'counter', p_counter,
            'net_weight', p_net_weight,
            'grade', p_grade,
            'rejection_reason', p_rejection_reason
        ),
        NOW()
    );

    RETURN jsonb_build_object(
        'success', true,
        'ticketId', p_ticket_id,
        'stage', p_target_stage
    );
END;
$$;

-- C. Recalculate Centre Stats RPC
CREATE OR REPLACE FUNCTION public.recalculate_centre_stats(p_centre_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_queue_count INTEGER;
    v_avg_wait INTEGER;
    v_capacity_pct INTEGER;
    v_rate NUMERIC;
    v_counters INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_queue_count 
    FROM public.queue_tickets 
    WHERE centre_id = p_centre_id AND stage NOT IN ('done', 'rejected');

    SELECT processing_rate_per_hour, active_counters INTO v_rate, v_counters
    FROM public.procurement_centres
    WHERE id = p_centre_id;

    v_rate := COALESCE(v_rate, 30);
    v_counters := GREATEST(1, COALESCE(v_counters, 2));

    v_avg_wait := ROUND((v_queue_count::NUMERIC / (v_rate * v_counters)) * 60);
    v_capacity_pct := LEAST(100, ROUND((v_queue_count::NUMERIC / 30.0) * 100));

    UPDATE public.procurement_centres
    SET queue_length = v_queue_count,
        predicted_wait_min = GREATEST(5, v_avg_wait),
        capacity_used_pct = v_capacity_pct,
        updated_at = NOW()
    WHERE id = p_centre_id;
END;
$$;
