import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://yylgukviahqpuznlcddp.supabase.co',
  process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_MqnDh-ISCw7Qrp1HAw_zyA_D5kVb-nq'
);

async function testProductionConnection() {
  console.log("Testing live Supabase queries across all modules...");

  const { data: centres, error: cErr } = await supabase.from('procurement_centres').select('*');
  console.log(`Centres: ${centres?.length || 0} loaded. Error: ${cErr?.message || 'none'}`);

  const { data: tickets, error: tErr } = await supabase.from('queue_tickets').select('*');
  console.log(`Queue Tickets: ${tickets?.length || 0} loaded. Error: ${tErr?.message || 'none'}`);

  const { data: profiles, error: pErr } = await supabase.from('profiles').select('*');
  console.log(`Profiles: ${profiles?.length || 0} loaded. Error: ${pErr?.message || 'none'}`);

  const { data: recs, error: rErr } = await supabase.from('ai_recommendations').select('*');
  console.log(`AI Recommendations: ${recs?.length || 0} loaded. Error: ${rErr?.message || 'none'}`);

  const { data: forecasts, error: fErr } = await supabase.from('forecast_points').select('*');
  console.log(`Forecast Points: ${forecasts?.length || 0} loaded. Error: ${fErr?.message || 'none'}`);

  const { data: wait, error: wErr } = await supabase.from('wait_analytics').select('*');
  console.log(`Wait Analytics: ${wait?.length || 0} loaded. Error: ${wErr?.message || 'none'}`);

  const { data: throughput, error: tpErr } = await supabase.from('throughput_points').select('*');
  console.log(`Throughput Points: ${throughput?.length || 0} loaded. Error: ${tpErr?.message || 'none'}`);

  const { data: audit, error: aErr } = await supabase.from('audit_logs').select('*');
  console.log(`Audit Logs: ${audit?.length || 0} loaded. Error: ${aErr?.message || 'none'}`);
}

testProductionConnection();
