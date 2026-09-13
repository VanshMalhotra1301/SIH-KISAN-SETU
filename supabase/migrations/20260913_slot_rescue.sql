-- ============================================================================
-- KISAN SETU — Procurement Slot Rescue Migration
-- File: supabase/migrations/20260913_slot_rescue.sql
-- ============================================================================

-- 1. SLOT VACANCIES TABLE
CREATE TABLE IF NOT EXISTS public.slot_vacancies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slot_id UUID REFERENCES public.slots(id) ON DELETE SET NULL,
    centre_id UUID NOT NULL REFERENCES public.procurement_centres(id) ON DELETE CASCADE,
    centre_name TEXT NOT NULL,
    centre_name_hi TEXT,
    slot_date TEXT NOT NULL DEFAULT 'Today',
    slot_window TEXT NOT NULL,
    crop TEXT NOT NULL DEFAULT 'Wheat',
    crop_hi TEXT DEFAULT 'गेहूँ',
    quantity_quintals NUMERIC DEFAULT 100,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'claimed', 'expired', 'cancelled')),
    released_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    claimed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    claimed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '10 minutes'),
    cancellation_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. SLOT RESCUE RECIPIENTS TABLE
CREATE TABLE IF NOT EXISTS public.slot_rescue_recipients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vacancy_id UUID NOT NULL REFERENCES public.slot_vacancies(id) ON DELETE CASCADE,
    farmer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    distance_km NUMERIC DEFAULT 10,
    status TEXT NOT NULL DEFAULT 'offered' CHECK (status IN ('offered', 'viewed', 'claimed', 'claimed_by_other', 'expired')),
    offered_at TIMESTAMPTZ DEFAULT NOW(),
    claimed_at TIMESTAMPTZ,
    CONSTRAINT unique_vacancy_farmer UNIQUE (vacancy_id, farmer_id)
);

-- Indexes for ultra-fast query and Realtime lookups
CREATE INDEX IF NOT EXISTS idx_vacancies_status_expires ON public.slot_vacancies(status, expires_at DESC);
CREATE INDEX IF NOT EXISTS idx_vacancies_centre ON public.slot_vacancies(centre_id);
CREATE INDEX IF NOT EXISTS idx_rescue_recipients_farmer ON public.slot_rescue_recipients(farmer_id, status);

-- 3. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.slot_vacancies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slot_rescue_recipients ENABLE ROW LEVEL SECURITY;

-- Permissive Select Policies (RLS read enforcement)
DROP POLICY IF EXISTS "vacancies_select" ON public.slot_vacancies;
CREATE POLICY "vacancies_select" ON public.slot_vacancies
    FOR SELECT TO public USING (
        status = 'open' 
        OR released_by = auth.uid() 
        OR claimed_by = auth.uid()
        OR auth.uid() IS NULL -- allow public/anon demo viewing
    );

DROP POLICY IF EXISTS "recipients_select" ON public.slot_rescue_recipients;
CREATE POLICY "recipients_select" ON public.slot_rescue_recipients
    FOR SELECT TO public USING (
        farmer_id = auth.uid() 
        OR auth.uid() IS NULL
    );

-- Allow updates via authenticated service/RPC
DROP POLICY IF EXISTS "vacancies_all" ON public.slot_vacancies;
CREATE POLICY "vacancies_all" ON public.slot_vacancies
    FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "recipients_all" ON public.slot_rescue_recipients;
CREATE POLICY "recipients_all" ON public.slot_rescue_recipients
    FOR ALL TO public USING (true) WITH CHECK (true);

-- 4. ENABLE REALTIME BROADCASTING
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.slot_vacancies;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.slot_rescue_recipients;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- ============================================================================
-- 5. ATOMIC STORED PROCEDURES
-- ============================================================================

-- Function 1: Create Slot Rescue Vacancy & Dispatch to Eligible Farmers
CREATE OR REPLACE FUNCTION public.create_slot_rescue_vacancy(
    p_centre_id UUID,
    p_slot_id UUID,
    p_slot_window TEXT,
    p_slot_date TEXT DEFAULT 'Today',
    p_crop TEXT DEFAULT 'Wheat',
    p_crop_hi TEXT DEFAULT 'गेहूँ',
    p_quantity_quintals NUMERIC DEFAULT 100,
    p_released_by UUID DEFAULT NULL,
    p_reason TEXT DEFAULT 'Slot released by farmer'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_centre RECORD;
    v_vacancy_id UUID;
    v_eligible RECORD;
    v_count INTEGER := 0;
BEGIN
    -- Fetch centre details
    SELECT id, name, name_hi, distance_km INTO v_centre 
    FROM public.procurement_centres 
    WHERE id = p_centre_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Procurement centre % not found', p_centre_id;
    END IF;

    -- Insert open slot vacancy (valid for 10 minutes)
    INSERT INTO public.slot_vacancies (
        slot_id, centre_id, centre_name, centre_name_hi,
        slot_date, slot_window, crop, crop_hi, quantity_quintals,
        status, released_by, expires_at, cancellation_reason, created_at, updated_at
    )
    VALUES (
        p_slot_id, p_centre_id, v_centre.name, v_centre.name_hi,
        COALESCE(p_slot_date, 'Today'), p_slot_window, COALESCE(p_crop, 'Wheat'), COALESCE(p_crop_hi, 'गेहूँ'),
        COALESCE(p_quantity_quintals, 100), 'open', p_released_by,
        NOW() + INTERVAL '10 minutes', p_reason, NOW(), NOW()
    )
    RETURNING id INTO v_vacancy_id;

    -- Identify eligible farmers:
    -- 1. Must be farmer role
    -- 2. Must not be the farmer who just released the slot
    -- 3. Must not have an active uncompleted booking (stage NOT IN ('done', 'rejected', 'cancelled'))
    FOR v_eligible IN (
        SELECT p.id as farmer_id, COALESCE(f.crop, 'Wheat') as farmer_crop
        FROM public.profiles p
        LEFT JOIN public.farmers f ON f.id = p.id
        WHERE p.role = 'farmer'
          AND (p_released_by IS NULL OR p.id <> p_released_by)
          AND NOT EXISTS (
              SELECT 1 FROM public.queue_tickets qt
              WHERE qt.farmer_id = p.id
                AND qt.stage NOT IN ('done', 'rejected', 'cancelled')
          )
        ORDER BY p.created_at ASC
        LIMIT 10
    ) LOOP
        -- Create rescue offer record
        INSERT INTO public.slot_rescue_recipients (
            vacancy_id, farmer_id, distance_km, status, offered_at
        )
        VALUES (
            v_vacancy_id, v_eligible.farmer_id, COALESCE(v_centre.distance_km, 10), 'offered', NOW()
        )
        ON CONFLICT (vacancy_id, farmer_id) DO NOTHING;

        -- Send realtime notification to eligible farmer
        INSERT INTO public.notifications (
            user_id, title, body, is_read, created_at
        )
        VALUES (
            v_eligible.farmer_id,
            '⚡ तत्काल स्लॉट उपलब्ध (Procurement Slot Rescue!)',
            v_centre.name || ' में ' || p_slot_window || ' का स्लॉट उपलब्ध हुआ है। पहले आओ-पहले पाओ के आधार पर तुरंत बुक करें!',
            false,
            NOW()
        );

        v_count := v_count + 1;
    END LOOP;

    -- Record in Audit Trail
    INSERT INTO public.audit_logs (
        actor_id, actor_role, action, target_type, target_id, metadata, created_at
    )
    VALUES (
        p_released_by,
        'system',
        'slot_rescue_vacancy_created',
        'slot_vacancies',
        v_vacancy_id::text,
        jsonb_build_object(
            'centre_id', p_centre_id,
            'centre_name', v_centre.name,
            'slot_window', p_slot_window,
            'slot_id', p_slot_id,
            'notified_farmers_count', v_count,
            'reason', p_reason
        ),
        NOW()
    );

    RETURN jsonb_build_object(
        'success', true,
        'vacancy_id', v_vacancy_id,
        'notified_count', v_count,
        'centre_name', v_centre.name,
        'slot_window', p_slot_window
    );
END;
$$;

-- Function 2: Cancel Booked Slot and Trigger Rescue Flow
CREATE OR REPLACE FUNCTION public.cancel_procurement_slot(
    p_ticket_id UUID,
    p_cancelled_by UUID,
    p_reason TEXT DEFAULT 'Farmer requested cancellation'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_ticket RECORD;
    v_slot RECORD;
    v_rescue_res JSONB;
BEGIN
    -- Lock ticket row
    SELECT * INTO v_ticket 
    FROM public.queue_tickets 
    WHERE id = p_ticket_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'TICKET_NOT_FOUND', 'message', 'Queue ticket not found');
    END IF;

    IF v_ticket.stage IN ('done', 'rejected', 'cancelled') THEN
        RETURN jsonb_build_object('success', false, 'error', 'ALREADY_FINALIZED', 'message', 'Ticket is already finalized or cancelled');
    END IF;

    -- 1. Mark ticket as cancelled
    UPDATE public.queue_tickets
    SET stage = 'cancelled',
        rejection_reason = p_reason,
        updated_at = NOW()
    WHERE id = p_ticket_id;

    -- 2. Release slot in slots table
    IF v_ticket.slot_id IS NOT NULL THEN
        UPDATE public.slots
        SET is_booked = false,
            booked_by = NULL
        WHERE id = v_ticket.slot_id;
    END IF;

    -- 3. Decrement centre queue length
    UPDATE public.procurement_centres
    SET queue_length = GREATEST(0, queue_length - 1),
        updated_at = NOW()
    WHERE id = v_ticket.centre_id;

    -- 4. Record cancellation in Audit Logs
    INSERT INTO public.audit_logs (
        actor_id, actor_role, action, target_type, target_id, metadata, created_at
    )
    VALUES (
        p_cancelled_by,
        'farmer',
        'slot_cancelled_and_released',
        'queue_tickets',
        p_ticket_id::text,
        jsonb_build_object(
            'token', v_ticket.token,
            'centre_id', v_ticket.centre_id,
            'slot_window', v_ticket.slot_window,
            'slot_id', v_ticket.slot_id,
            'reason', p_reason
        ),
        NOW()
    );

    -- 5. Trigger Slot Rescue Vacancy
    v_rescue_res := public.create_slot_rescue_vacancy(
        p_centre_id => v_ticket.centre_id,
        p_slot_id => v_ticket.slot_id,
        p_slot_window => v_ticket.slot_window,
        p_slot_date => 'Today',
        p_crop => COALESCE(v_ticket.crop, 'Wheat'),
        p_crop_hi => 'गेहूँ',
        p_quantity_quintals => COALESCE(v_ticket.quantity_quintals, 100),
        p_released_by => p_cancelled_by,
        p_reason => p_reason
    );

    RETURN jsonb_build_object(
        'success', true,
        'ticket_id', p_ticket_id,
        'token', v_ticket.token,
        'rescue', v_rescue_res
    );
END;
$$;

-- Function 3: Claim Slot Rescue (Atomic FOR UPDATE First-Confirmed-Wins)
CREATE OR REPLACE FUNCTION public.claim_slot_rescue(
    p_vacancy_id UUID,
    p_farmer_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_vacancy RECORD;
    v_farmer RECORD;
    v_profile RECORD;
    v_centre RECORD;
    v_token TEXT;
    v_ticket_id UUID;
    v_rate NUMERIC;
    v_gross_amount NUMERIC;
    v_now_time TEXT;
BEGIN
    -- 1. ATOMIC LOCK ON VACANCY ROW
    SELECT * INTO v_vacancy 
    FROM public.slot_vacancies 
    WHERE id = p_vacancy_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error_code', 'NOT_FOUND', 'message', 'Rescue slot vacancy not found');
    END IF;

    -- Check if already claimed
    IF v_vacancy.status <> 'open' THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error_code', 'ALREADY_CLAIMED', 
            'message', 'This rescued slot has already been claimed by another fast-acting farmer.'
        );
    END IF;

    -- Check if expired
    IF v_vacancy.expires_at < NOW() THEN
        UPDATE public.slot_vacancies SET status = 'expired', updated_at = NOW() WHERE id = p_vacancy_id;
        RETURN jsonb_build_object(
            'success', false, 
            'error_code', 'EXPIRED', 
            'message', 'This rescue offer has expired.'
        );
    END IF;

    -- Verify farmer does not have an active booking
    IF EXISTS (
        SELECT 1 FROM public.queue_tickets 
        WHERE farmer_id = p_farmer_id 
          AND stage NOT IN ('done', 'rejected', 'cancelled')
    ) THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error_code', 'ALREADY_HAS_ACTIVE_BOOKING', 
            'message', 'You already have an active procurement ticket. Complete or cancel it first.'
        );
    END IF;

    -- Fetch farmer profile & centre
    SELECT * INTO v_profile FROM public.profiles WHERE id = p_farmer_id;
    SELECT * INTO v_farmer FROM public.farmers WHERE id = p_farmer_id;
    SELECT * INTO v_centre FROM public.procurement_centres WHERE id = v_vacancy.centre_id;

    -- 2. CLOSE VACANCY ATOMICALLY
    UPDATE public.slot_vacancies
    SET status = 'claimed',
        claimed_by = p_farmer_id,
        claimed_at = NOW(),
        updated_at = NOW()
    WHERE id = p_vacancy_id;

    -- 3. UPDATE RECIPIENT RECORDS
    UPDATE public.slot_rescue_recipients
    SET status = 'claimed', claimed_at = NOW()
    WHERE vacancy_id = p_vacancy_id AND farmer_id = p_farmer_id;

    UPDATE public.slot_rescue_recipients
    SET status = 'claimed_by_other'
    WHERE vacancy_id = p_vacancy_id AND farmer_id <> p_farmer_id;

    -- 4. BOOK THE CORRESPONDING SLOT
    IF v_vacancy.slot_id IS NOT NULL THEN
        UPDATE public.slots
        SET is_booked = true,
            booked_by = p_farmer_id
        WHERE id = v_vacancy.slot_id;
    END IF;

    -- 5. GENERATE RESCUE TOKEN & CREATE QUEUE TICKET
    v_token := 'T-' || to_char(NOW(), 'YYYYMMDD') || '-R' || upper(substr(md5(random()::text), 1, 3));
    v_now_time := to_char(NOW(), 'HH24:MI');

    INSERT INTO public.queue_tickets (
        token,
        farmer_id,
        centre_id,
        slot_id,
        slot_window,
        stage,
        crop,
        quantity_quintals,
        farmer_name,
        farmer_name_hi,
        village,
        farmers_ahead,
        eta_minutes,
        counter_assigned,
        created_at,
        updated_at
    )
    VALUES (
        v_token,
        p_farmer_id,
        v_vacancy.centre_id,
        v_vacancy.slot_id,
        v_vacancy.slot_window,
        'scheduled',
        v_vacancy.crop,
        COALESCE(v_farmer.quantity_quintals, 100),
        COALESCE(v_profile.full_name, 'Verified Farmer'),
        COALESCE(v_profile.full_name_hi, v_profile.full_name, 'सत्यापित किसान'),
        COALESCE(v_profile.village, 'Bahadurgarh'),
        COALESCE(v_centre.queue_length, 2),
        GREATEST(5, ROUND((COALESCE(v_centre.queue_length, 2)::NUMERIC / GREATEST(1, COALESCE(v_centre.active_counters, 2))) * 15)),
        1,
        NOW(),
        NOW()
    )
    RETURNING id INTO v_ticket_id;

    -- 6. CREATE 8-STAGE PROCUREMENT TIMELINE
    INSERT INTO public.procurement_timeline (
        ticket_id, step_id, label, label_hi, detail, detail_hi, state, timestamp_str, sort_order, created_at
    )
    VALUES
        (v_ticket_id, 'step-1', 'Farmer Registration', 'किसान पंजीकरण', 'Verified via PM-KISAN / State Agri portal', 'पीएम-किसान एवं राज्य पोर्टल से सत्यापित', 'done', v_now_time, 1, NOW()),
        (v_ticket_id, 'step-2', 'Rescue Slot Confirmed', 'तत्काल स्लॉट आवंटित', 'Rescued for ' || v_vacancy.slot_window, v_vacancy.slot_window || ' के लिए तत्काल आरक्षित', 'done', v_now_time, 2, NOW()),
        (v_ticket_id, 'step-3', 'Centre Arrival & Gate Entry', 'केंद्र आगमन एवं प्रवेश', 'Reach centre gate 10 mins before slot window', 'अपने स्लॉट से 10 मिनट पहले मुख्य द्वार पर पहुँचें', 'active', '', 3, NOW()),
        (v_ticket_id, 'step-4', 'Electronic Weighing', 'इलेक्ट्रॉनिक तुलाई', 'Automated weighbridge tare & gross weight', 'स्वचालित धर्मकांटे पर वाहन सहित तुलाई', 'upcoming', '', 4, NOW()),
        (v_ticket_id, 'step-5', 'Quality Check & FAQ Grading', 'गुणवत्ता जाँच (FAQ)', 'Moisture < 12% & grain purity certification', 'नमी 12% से कम एवं मानक गुणवत्ता प्रमाणन', 'upcoming', '', 5, NOW()),
        (v_ticket_id, 'step-6', 'Procurement Acceptance', 'खरीद स्वीकृति', 'MSP confirmation voucher generated', 'न्यूनतम समर्थन मूल्य (MSP) वाउचर स्वीकृत', 'upcoming', '', 6, NOW()),
        (v_ticket_id, 'step-7', 'Digital Invoice Generation', 'डिजिटल बिल निर्माण', 'Official tax invoice & weighing certificate', 'डिजिटल बिल एवं तुलाई प्रमाणपत्र जारी', 'upcoming', '', 7, NOW()),
        (v_ticket_id, 'step-8', 'DBT Direct Bank Payment', 'बैंक खाता भुगतान (DBT)', 'PFMS Direct Benefit Transfer in 48 hours', 'पीएफएमएस द्वारा 48 घंटे में सीधे बैंक खाते में', 'upcoming', '', 8, NOW());

    -- 7. LOOK UP MSP RATE AND CREATE PAYMENT RECORD
    SELECT rate_per_quintal INTO v_rate 
    FROM public.msp_rates 
    WHERE crop = v_vacancy.crop AND is_active = TRUE 
    LIMIT 1;

    IF v_rate IS NULL THEN
        v_rate := 2425.00;
    END IF;

    v_gross_amount := COALESCE(v_farmer.quantity_quintals, 100) * v_rate;

    INSERT INTO public.payments (
        ticket_id, farmer_id, gross_amount, currency, rate_per_quintal,
        quintals, stage, expected_credit_in, expected_credit_in_hi, bank_masked, progress_pct, created_at, updated_at
    )
    VALUES (
        v_ticket_id, p_farmer_id, v_gross_amount, 'INR', v_rate,
        COALESCE(v_farmer.quantity_quintals, 100), 'pending_verification',
        'Within 48 hours of weighing', 'तुलाई के 48 घंटे के भीतर',
        COALESCE(v_farmer.bank_account_masked, 'Verified PNB Account'), 10, NOW(), NOW()
    );

    -- 8. UPDATE CENTRE QUEUE LENGTH
    UPDATE public.procurement_centres
    SET queue_length = queue_length + 1,
        farmers_today = farmers_today + 1,
        updated_at = NOW()
    WHERE id = v_vacancy.centre_id;

    -- 9. SEND CONFIRMATION NOTIFICATION TO WINNING FARMER
    INSERT INTO public.notifications (
        user_id, title, body, is_read, created_at
    )
    VALUES (
        p_farmer_id,
        '🎉 तत्काल स्लॉट आरक्षित! (Slot Rescue Confirmed)',
        v_vacancy.centre_name || ' में ' || v_vacancy.slot_window || ' का स्लॉट सफलतापूर्वक आपके नाम आरक्षित हो गया। टोकन: ' || v_token,
        false,
        NOW()
    );

    -- 10. AUDIT TRAIL LOG
    INSERT INTO public.audit_logs (
        actor_id, actor_role, action, target_type, target_id, metadata, created_at
    )
    VALUES (
        p_farmer_id,
        'farmer',
        'slot_rescue_claimed',
        'slot_vacancies',
        p_vacancy_id::text,
        jsonb_build_object(
            'ticket_id', v_ticket_id,
            'token', v_token,
            'centre_id', v_vacancy.centre_id,
            'centre_name', v_vacancy.centre_name,
            'slot_window', v_vacancy.slot_window,
            'crop', v_vacancy.crop,
            'quantity_quintals', COALESCE(v_farmer.quantity_quintals, 100),
            'gross_amount', v_gross_amount
        ),
        NOW()
    );

    RETURN jsonb_build_object(
        'success', true,
        'ticket_id', v_ticket_id,
        'token', v_token,
        'centre_id', v_vacancy.centre_id,
        'centre_name', v_vacancy.centre_name,
        'slot_window', v_vacancy.slot_window,
        'crop', v_vacancy.crop
    );
END;
$$;
