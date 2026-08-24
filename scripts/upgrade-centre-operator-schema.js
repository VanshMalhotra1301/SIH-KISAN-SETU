import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Client } = pg;

const schemaSql = `
-- 1. Add operational columns to queue_tickets
ALTER TABLE public.queue_tickets ADD COLUMN IF NOT EXISTS actual_quintals NUMERIC;
ALTER TABLE public.queue_tickets ADD COLUMN IF NOT EXISTS tare_weight_quintals NUMERIC;
ALTER TABLE public.queue_tickets ADD COLUMN IF NOT EXISTS gross_weight_quintals NUMERIC;
ALTER TABLE public.queue_tickets ADD COLUMN IF NOT EXISTS quality_grade TEXT DEFAULT 'FAQ';
ALTER TABLE public.queue_tickets ADD COLUMN IF NOT EXISTS moisture_pct NUMERIC DEFAULT 11.5;
ALTER TABLE public.queue_tickets ADD COLUMN IF NOT EXISTS foreign_matter_pct NUMERIC DEFAULT 0.5;
ALTER TABLE public.queue_tickets ADD COLUMN IF NOT EXISTS j_form_no TEXT;
ALTER TABLE public.queue_tickets ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE public.queue_tickets ADD COLUMN IF NOT EXISTS operator_notes TEXT;
ALTER TABLE public.queue_tickets ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- 2. Create Stored Procedure for Atomic Ticket Processing
CREATE OR REPLACE FUNCTION public.operator_process_ticket(
  p_ticket_id UUID,
  p_action TEXT, -- 'call' | 'weigh' | 'grade' | 'accept' | 'reject' | 'complete'
  p_counter INT DEFAULT NULL,
  p_gross NUMERIC DEFAULT NULL,
  p_tare NUMERIC DEFAULT NULL,
  p_actual_quintals NUMERIC DEFAULT NULL,
  p_quality_grade TEXT DEFAULT NULL,
  p_moisture NUMERIC DEFAULT NULL,
  p_foreign_matter NUMERIC DEFAULT NULL,
  p_j_form_no TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_rejection_reason TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_ticket RECORD;
  v_centre RECORD;
  v_farmer RECORD;
  v_new_stage TEXT;
  v_rate NUMERIC := 2430;
  v_gross_amount NUMERIC := 0;
  v_now_str TEXT := to_char(now(), 'HH12:MI AM');
  v_jf TEXT;
BEGIN
  -- Fetch current ticket
  SELECT * INTO v_ticket FROM public.queue_tickets WHERE id = p_ticket_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ticket not found: %', p_ticket_id;
  END IF;

  SELECT * INTO v_centre FROM public.procurement_centres WHERE id = v_ticket.centre_id;

  -- Determine crop MSP rate
  IF v_ticket.crop ILIKE '%wheat%' OR v_ticket.crop ILIKE '%गेहूं%' THEN
    v_rate := 2430;
  ELSIF v_ticket.crop ILIKE '%paddy%' OR v_ticket.crop ILIKE '%धान%' THEN
    v_rate := 2300;
  ELSIF v_ticket.crop ILIKE '%mustard%' OR v_ticket.crop ILIKE '%सरसों%' THEN
    v_rate := 5650;
  ELSE
    v_rate := 2430;
  END IF;

  -- ─── ACTION 1: CALL NEXT FARMER (GATE ENTRY) ───
  IF p_action = 'call' THEN
    v_new_stage := 'arrived';
    UPDATE public.queue_tickets SET
      stage = v_new_stage,
      counter_assigned = coalesce(p_counter, counter_assigned, 1),
      updated_at = now()
    WHERE id = p_ticket_id;

    -- Update Timeline Step 3 (Mandi Arrival) to done, Step 4 (Weighing) to active
    UPDATE public.procurement_timeline SET state = 'done', timestamp_str = v_now_str WHERE ticket_id = p_ticket_id AND step_id IN ('step-1', 'step-2', 'step-3');
    UPDATE public.procurement_timeline SET state = 'active', timestamp_str = v_now_str WHERE ticket_id = p_ticket_id AND step_id = 'step-4';

    -- Insert notification for farmer
    IF v_ticket.farmer_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, body, is_read)
      VALUES (
        v_ticket.farmer_id,
        '📢 काउंटर पर उपस्थित हों / Proceed to Counter',
        format('टोकन %s: कृपया तुलाई के लिए काउंटर #%s पर तुरंत पहुँचें। (%s)', v_ticket.token, coalesce(p_counter, 1), v_centre.name),
        false
      );
    END IF;

    -- Log activity
    INSERT INTO public.activity_feed (at_time, kind, message, centre_id)
    VALUES (v_now_str, 'call', format('[%s] %s (Token %s) called to Counter %s', v_centre.code, v_ticket.farmer_name, v_ticket.token, coalesce(p_counter, 1)), v_ticket.centre_id);

  -- ─── ACTION 2: ELECTRONIC WEIGHBRIDGE ───
  ELSIF p_action = 'weigh' THEN
    v_new_stage := 'weighing';
    UPDATE public.queue_tickets SET
      stage = v_new_stage,
      gross_weight_quintals = p_gross,
      tare_weight_quintals = p_tare,
      actual_quintals = coalesce(p_actual_quintals, p_gross - coalesce(p_tare, 0), quantity_quintals),
      quantity_quintals = coalesce(p_actual_quintals, p_gross - coalesce(p_tare, 0), quantity_quintals),
      updated_at = now()
    WHERE id = p_ticket_id;

    -- Update Timeline Step 4 (Weighing) to done, Step 5 (Quality Check) to active
    UPDATE public.procurement_timeline SET state = 'done', timestamp_str = v_now_str WHERE ticket_id = p_ticket_id AND step_id IN ('step-1', 'step-2', 'step-3', 'step-4');
    UPDATE public.procurement_timeline SET state = 'active', timestamp_str = v_now_str WHERE ticket_id = p_ticket_id AND step_id = 'step-5';

    -- Log activity
    INSERT INTO public.activity_feed (at_time, kind, message, centre_id)
    VALUES (v_now_str, 'weigh', format('[%s] Token %s weighed: %s quintals net recorded.', v_centre.code, v_ticket.token, coalesce(p_actual_quintals, v_ticket.quantity_quintals)), v_ticket.centre_id);

  -- ─── ACTION 3: FAQ QUALITY GRADING ───
  ELSIF p_action = 'grade' THEN
    v_new_stage := 'grading';
    UPDATE public.queue_tickets SET
      stage = v_new_stage,
      quality_grade = coalesce(p_quality_grade, 'FAQ'),
      moisture_pct = coalesce(p_moisture, 11.5),
      foreign_matter_pct = coalesce(p_foreign_matter, 0.5),
      operator_notes = p_notes,
      updated_at = now()
    WHERE id = p_ticket_id;

    -- Update Timeline Step 5 (Quality Check) to done, Step 6 (Acceptance) to active
    UPDATE public.procurement_timeline SET state = 'done', timestamp_str = v_now_str WHERE ticket_id = p_ticket_id AND step_id IN ('step-1', 'step-2', 'step-3', 'step-4', 'step-5');
    UPDATE public.procurement_timeline SET state = 'active', timestamp_str = v_now_str WHERE ticket_id = p_ticket_id AND step_id = 'step-6';

    -- Log activity
    INSERT INTO public.activity_feed (at_time, kind, message, centre_id)
    VALUES (v_now_str, 'grade', format('[%s] Token %s quality inspected: Grade %s (Moisture %s%%).', v_centre.code, v_ticket.token, coalesce(p_quality_grade, 'FAQ'), coalesce(p_moisture, 11.5)), v_ticket.centre_id);

  -- ─── ACTION 4: REJECT LOT (BELOW FAQ) ───
  ELSIF p_action = 'reject' THEN
    v_new_stage := 'rejected';
    UPDATE public.queue_tickets SET
      stage = v_new_stage,
      rejection_reason = coalesce(p_rejection_reason, 'Moisture / Foreign Matter exceeded standard limit'),
      operator_notes = p_notes,
      updated_at = now()
    WHERE id = p_ticket_id;

    IF v_ticket.farmer_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, body, is_read)
      VALUES (
        v_ticket.farmer_id,
        '⚠️ खरीद अस्वीकृत / Procurement Not Accepted',
        format('टोकन %s: आपकी उपज मानक FAQ गुणवत्ता के अनुरूप नहीं पाई गई। कारण: %s', v_ticket.token, coalesce(p_rejection_reason, 'गुणवत्ता मानक अपूर्ण')),
        false
      );
    END IF;

  -- ─── ACTION 5: COMPLETE & ISSUE DIGITAL J-FORM ───
  ELSIF p_action = 'complete' OR p_action = 'accept' THEN
    v_new_stage := 'done';
    v_jf := coalesce(p_j_form_no, format('JF-2026-%s-%s', v_centre.code, upper(substring(p_ticket_id::text from 1 for 4))));
    
    UPDATE public.queue_tickets SET
      stage = v_new_stage,
      actual_quintals = coalesce(p_actual_quintals, actual_quintals, quantity_quintals),
      j_form_no = v_jf,
      completed_at = now(),
      updated_at = now()
    WHERE id = p_ticket_id;

    -- Calculate total MSP payout
    v_gross_amount := coalesce(p_actual_quintals, v_ticket.actual_quintals, v_ticket.quantity_quintals) * v_rate;

    -- Upsert payment record
    INSERT INTO public.payments (
      ticket_id, farmer_id, gross_amount, currency, rate_per_quintal, quintals, stage,
      expected_credit_in, expected_credit_in_hi, bank_masked, progress_pct, updated_at
    )
    VALUES (
      p_ticket_id,
      v_ticket.farmer_id,
      v_gross_amount,
      'INR',
      v_rate,
      coalesce(p_actual_quintals, v_ticket.actual_quintals, v_ticket.quantity_quintals),
      'approved',
      'Within 48 hours via DBT',
      'तुलाई के 48 घंटे के भीतर DBT द्वारा',
      'PNB ••••4417',
      55,
      now()
    )
    ON CONFLICT (ticket_id) DO UPDATE SET
      gross_amount = EXCLUDED.gross_amount,
      quintals = EXCLUDED.quintals,
      stage = 'approved',
      progress_pct = 55,
      updated_at = now();

    -- Update all steps in procurement timeline to DONE
    UPDATE public.procurement_timeline SET
      state = 'done',
      timestamp_str = v_now_str
    WHERE ticket_id = p_ticket_id;

    -- Emit notification to farmer
    IF v_ticket.farmer_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, body, is_read)
      VALUES (
        v_ticket.farmer_id,
        '🎉 खरीद पूर्ण एवं जे-फॉर्म जारी / J-Form Generated',
        format('टोकन %s: %s क्विंटल %s की खरीद पूर्ण हुई। जे-फॉर्म नं: %s। कुल राशि ₹%s DBT द्वारा बैंक खाते में 48 घंटे में जमा होगी।',
          v_ticket.token,
          coalesce(p_actual_quintals, v_ticket.quantity_quintals),
          v_ticket.crop,
          v_jf,
          to_char(v_gross_amount, 'FM99,99,99,999')
        ),
        false
      );
    END IF;

    -- Log activity feed
    INSERT INTO public.activity_feed (at_time, kind, message, centre_id)
    VALUES (
      v_now_str,
      'complete',
      format('[%s] J-Form %s issued to %s (%s qtl %s). Payout ₹%s queued for DBT.',
        v_centre.code,
        v_jf,
        v_ticket.farmer_name,
        coalesce(p_actual_quintals, v_ticket.quantity_quintals),
        v_ticket.crop,
        to_char(v_gross_amount, 'FM99,99,99,999')
      ),
      v_ticket.centre_id
    );
  END IF;

  -- Recompute live metrics across centres
  PERFORM public.recalculate_centre_stats();

  RETURN jsonb_build_object(
    'success', true,
    'ticket_id', p_ticket_id,
    'action', p_action,
    'new_stage', v_new_stage,
    'j_form_no', v_jf,
    'gross_amount', v_gross_amount
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
`;

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  console.log("Upgrading Centre Operator schema and installing atomic stored procedure...");
  await client.query(schemaSql);
  console.log("✅ Schema upgraded and operator_process_ticket procedure installed!");
  await client.end();
}

run();
