import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Client } = pg;

async function testWorkflow() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  console.log("=== Testing Full Centre Operator Operational Lifecycle ===");

  // 1. Find or create a test ticket in Centre A
  const centreRes = await client.query(`SELECT id, code, name FROM public.procurement_centres LIMIT 1;`);
  const centreA = centreRes.rows[0];

  // Cleanup any leftover from previous failed test runs
  await client.query(`DELETE FROM public.payments WHERE ticket_id IN (SELECT id FROM public.queue_tickets WHERE token = 'TEST-9999');`);
  await client.query(`DELETE FROM public.procurement_timeline WHERE ticket_id IN (SELECT id FROM public.queue_tickets WHERE token = 'TEST-9999');`);
  await client.query(`DELETE FROM public.audit_logs WHERE target_id IN (SELECT id::text FROM public.queue_tickets WHERE token = 'TEST-9999');`);
  await client.query(`DELETE FROM public.queue_tickets WHERE token = 'TEST-9999';`);

  const ticketRes = await client.query(`
    INSERT INTO public.queue_tickets (
      token, farmer_name, village, centre_id, slot_window, stage, crop, quantity_quintals
    )
    VALUES (
      'TEST-9999', 'Balwan Singh', 'Karnal City', $1, '12:00 – 12:30', 'in_queue', 'Wheat', 100
    )
    RETURNING id, token, stage;
  `, [centreA.id]);

  const ticketId = ticketRes.rows[0].id;
  console.log(`\n1. Created Test Ticket: ${ticketRes.rows[0].token} (ID: ${ticketId}) in stage: ${ticketRes.rows[0].stage}`);

  // Create initial timeline for this ticket
  await client.query(`
    INSERT INTO public.procurement_timeline (ticket_id, step_id, label, label_hi, state, sort_order)
    VALUES
      ($1, 'step-1', 'Farmer Registration', 'किसान पंजीकरण', 'done', 1),
      ($1, 'step-2', 'Smart Slot Confirmed', 'स्मार्ट स्लॉट आवंटित', 'done', 2),
      ($1, 'step-3', 'Mandi Arrival & Gate Entry', 'मंडी आगमन एवं प्रवेश', 'active', 3),
      ($1, 'step-4', 'Electronic Weighbridge Weighing', 'इलेक्ट्रॉनिक धर्मकांटा तुलाई', 'todo', 4),
      ($1, 'step-5', 'Quality Check (FAQ Standards)', 'गुणवत्ता जांच एवं ग्रेडिंग', 'todo', 5),
      ($1, 'step-6', 'Procurement Acceptance & MSP Voucher', 'उपज स्वीकृति एवं एमएसपी दर', 'todo', 6),
      ($1, 'step-7', 'Digital J-Form Bill Generation', 'डिजिटल जे-फॉर्म पर्ची', 'todo', 7),
      ($1, 'step-8', 'Direct Bank Transfer (DBT) Payment', 'डीबीटी बैंक खाता भुगतान', 'todo', 8);
  `, [ticketId]);

  // 2. Action: CALL FARMER TO COUNTER 2
  console.log("\n2. Calling farmer to Counter #2...");
  const callRes = await client.query(`
    SELECT public.operator_process_ticket(
      p_ticket_id => $1,
      p_action => 'call',
      p_counter => 2
    );
  `, [ticketId]);
  console.log("Call result:", callRes.rows[0].operator_process_ticket);

  // Check ticket stage & timeline step 3 & 4
  const t1 = await client.query(`SELECT stage, counter_assigned FROM public.queue_tickets WHERE id = $1;`, [ticketId]);
  console.log("Ticket updated stage:", t1.rows[0]);

  // 3. Action: WEIGHBRIDGE RECORDING (Gross: 125 qtl, Tare: 25 qtl => Net: 100 qtl)
  console.log("\n3. Recording Weighbridge (Gross 125 qtl, Tare 25 qtl => Net 100 qtl)...");
  const weighRes = await client.query(`
    SELECT public.operator_process_ticket(
      p_ticket_id => $1,
      p_action => 'weigh',
      p_gross => 125,
      p_tare => 25,
      p_actual_quintals => 100
    );
  `, [ticketId]);
  console.log("Weigh result:", weighRes.rows[0].operator_process_ticket);

  // 4. Action: FAQ QUALITY GRADING
  console.log("\n4. Recording Quality Grading (Grade FAQ, Moisture 11.2%, Foreign Matter 0.4%)...");
  const gradeRes = await client.query(`
    SELECT public.operator_process_ticket(
      p_ticket_id => $1,
      p_action => 'grade',
      p_quality_grade => 'FAQ',
      p_moisture => 11.2,
      p_foreign_matter => 0.4,
      p_notes => 'Standard FAQ wheat lot verified by APMC Grader.'
    );
  `, [ticketId]);
  console.log("Grade result:", gradeRes.rows[0].operator_process_ticket);

  // 5. Action: COMPLETE PROCUREMENT & ISSUE J-FORM
  console.log("\n5. Completing procurement & generating Digital J-Form...");
  const completeRes = await client.query(`
    SELECT public.operator_process_ticket(
      p_ticket_id => $1,
      p_action => 'complete',
      p_actual_quintals => 100,
      p_j_form_no => 'JF-2026-KRN-TEST99'
    );
  `, [ticketId]);
  console.log("Complete result:", completeRes.rows[0].operator_process_ticket);

  // 6. Verify payments table
  const payRes = await client.query(`SELECT * FROM public.payments WHERE ticket_id = $1;`, [ticketId]);
  console.log("\n6. Generated Payment Row:", payRes.rows[0]);

  // 7. Clean up test ticket
  await client.query(`DELETE FROM public.payments WHERE ticket_id = $1;`, [ticketId]);
  await client.query(`DELETE FROM public.procurement_timeline WHERE ticket_id = $1;`, [ticketId]);
  await client.query(`DELETE FROM public.queue_tickets WHERE id = $1;`, [ticketId]);
  console.log("\n✅ Test completed and cleaned up successfully!");

  await client.end();
}

testWorkflow();
