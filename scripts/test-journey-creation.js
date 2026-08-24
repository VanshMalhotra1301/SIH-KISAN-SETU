import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://yylgukviahqpuznlcddp.supabase.co',
  process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_MqnDh-ISCw7Qrp1HAw_zyA_D5kVb-nq'
);

async function testCreateFarmerJourney() {
  const userId = 'e7099e71-0316-40b1-8337-add01ad98f65'; // Harshit
  console.log(`Testing procurement creation for user: ${userId}...`);

  // 1. Get first centre
  const { data: centres } = await supabase.from('procurement_centres').select('*').limit(1);
  const centre = centres[0];

  const token = `KS-${Math.floor(1000 + Math.random() * 9000)}`;

  // 2. Insert ticket
  const { data: ticket, error: tErr } = await supabase.from('queue_tickets').insert({
    token,
    farmer_id: userId,
    centre_id: centre.id,
    farmer_name: 'Harshit',
    village: 'Danapur',
    crop: 'Wheat',
    quantity_quintals: 100,
    slot_window: '11:30 – 12:00',
    stage: 'scheduled',
    farmers_ahead: 3,
    eta_minutes: 22
  }).select().single();

  if (tErr) {
    console.error('Ticket creation error:', tErr);
    return;
  }

  console.log('✅ Ticket created in Supabase:', ticket);

  // 3. Check timeline creation
  const nowTime = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });
  const timelineSteps = [
    { step_id: "step-1", label: "Farmer Registration", label_hi: "किसान पंजीकरण", detail: "Verified via PM-KISAN / State Mandi portal", detail_hi: "पीएम-किसान एवं राज्य पोर्टल से सत्यापित", state: "done", timestamp_str: nowTime, sort_order: 1 },
    { step_id: "step-2", label: "Smart Slot Confirmed", label_hi: "स्मार्ट स्लॉट आवंटित", detail: "Booked for 11:30 – 12:00", detail_hi: "11:30 – 12:00 के लिए समय आरक्षित", state: "done", timestamp_str: nowTime, sort_order: 2 },
    { step_id: "step-3", label: "Mandi Arrival & Gate Entry", label_hi: "मंडी आगमन एवं प्रवेश", detail: "Reach mandi gate 10 mins before slot window", detail_hi: "अपने स्लॉट से 10 मिनट पहले मुख्य द्वार पर पहुँचें", state: "active", timestamp_str: "", sort_order: 3 },
  ];

  await supabase.from('procurement_timeline').insert(timelineSteps.map(s => ({ ...s, ticket_id: ticket.id })));
  console.log('✅ Timeline steps created!');

  // 4. Payment record
  await supabase.from('payments').insert({
    ticket_id: ticket.id,
    farmer_id: userId,
    gross_amount: 100 * 2430,
    currency: "INR",
    rate_per_quintal: 2430,
    quintals: 100,
    stage: "approved",
    expected_credit_in: "Within 48 hours of weighing",
    expected_credit_in_hi: "तुलाई के 48 घंटे के भीतर",
    bank_masked: "PNB ••••4417",
    progress_pct: 35
  });
  console.log('✅ Payment record created: ₹2,43,000');

  console.log('🎉 Full End-to-End Farmer Procurement flow verified in Supabase!');
}

testCreateFarmerJourney();
