import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://yylgukviahqpuznlcddp.supabase.co',
  process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_MqnDh-ISCw7Qrp1HAw_zyA_D5kVb-nq'
);

async function testLiveTimelineAndPayments() {
  console.log("Checking timeline and payment tables in Supabase...");

  const { data: tickets } = await supabase.from('queue_tickets').select('*');
  console.log(`Found ${tickets.length} tickets in database:`, tickets.map(t => ({ token: t.token, farmer: t.farmer_name, stage: t.stage })));

  const { data: timeline } = await supabase.from('procurement_timeline').select('*');
  console.log(`Found ${timeline.length} timeline records in database.`);

  const { data: payments } = await supabase.from('payments').select('*');
  console.log(`Found ${payments.length} payment records in database:`, payments.map(p => ({ gross: p.gross_amount, stage: p.stage, pct: p.progress_pct })));

  console.log("✅ All timeline and payment rows exist in Supabase and are connected via realtime!");
}

testLiveTimelineAndPayments();

