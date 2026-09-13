-- ============================================================================
-- KISAN SETU — Cancellation Flow Fixes Migration
-- File: supabase/migrations/20260913_cancellation_fixes.sql
-- Purpose: Fix slot cancellation, realtime state, and duplicate booking bugs
-- ============================================================================

-- ============================================================================
-- 1. FIX: cancel_procurement_slot — Add cancellation confirmation notification
--    to the farmer, and release slots by looking up booked_by (not relying on
--    the potentially-NULL slot_id in queue_tickets)
-- ============================================================================

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
    v_released_slot_id UUID;
BEGIN
    -- Lock ticket row to prevent race conditions
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
    --    Strategy: Try slot_id from ticket first; if NULL, fall back to
    --    looking up the slot by booked_by farmer ID (the booking service
    --    may not have stored slot_id in the ticket row)
    v_released_slot_id := v_ticket.slot_id;

    IF v_released_slot_id IS NOT NULL THEN
        UPDATE public.slots
        SET is_booked = false,
            booked_by = NULL
        WHERE id = v_released_slot_id;
    ELSE
        -- Fallback: find the slot booked by this farmer for this centre
        SELECT id INTO v_released_slot_id
        FROM public.slots
        WHERE booked_by = p_cancelled_by
          AND centre_id = v_ticket.centre_id
          AND is_booked = true
        LIMIT 1
        FOR UPDATE;

        IF v_released_slot_id IS NOT NULL THEN
            UPDATE public.slots
            SET is_booked = false,
                booked_by = NULL
            WHERE id = v_released_slot_id;
        END IF;
    END IF;

    -- 3. Decrement centre queue length and recalculate stats
    UPDATE public.procurement_centres
    SET queue_length = GREATEST(0, queue_length - 1),
        updated_at = NOW()
    WHERE id = v_ticket.centre_id;

    -- 4. Send CANCELLATION CONFIRMATION notification to the farmer who cancelled
    INSERT INTO public.notifications (
        user_id, title, body, is_read, created_at
    )
    VALUES (
        p_cancelled_by,
        '✓ स्लॉट रद्द (Slot Cancelled)',
        'आपका टोकन ' || v_ticket.token || ' (' || COALESCE(v_ticket.slot_window, '') || ') सफलतापूर्वक रद्द कर दिया गया। अब आप पुनः नया स्लॉट बुक कर सकते हैं। Your booking has been cancelled. You may book a new slot.',
        false,
        NOW()
    );

    -- 5. Record cancellation in Audit Logs
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
            'slot_id', v_released_slot_id,
            'reason', p_reason
        ),
        NOW()
    );

    -- 6. Trigger Slot Rescue Vacancy (notify other eligible farmers)
    v_rescue_res := public.create_slot_rescue_vacancy(
        p_centre_id => v_ticket.centre_id,
        p_slot_id => v_released_slot_id,
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

-- ============================================================================
-- 2. FIX: recalculate_centre_stats — Include 'cancelled' in exclusion list
--    so cancelled tickets don't inflate queue_length / wait / capacity stats
-- ============================================================================

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
    WHERE centre_id = p_centre_id AND stage NOT IN ('done', 'rejected', 'cancelled');

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
