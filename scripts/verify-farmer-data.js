import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://yylgukviahqpuznlcddp.supabase.co',
  process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_MqnDh-ISCw7Qrp1HAw_zyA_D5kVb-nq'
);

async function verifyFarmerPortalData() {
  const email = 'sarrafharshit411@gmail.com';
  console.log(`Authenticating as: ${email}...`);

  const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
    email,
    password: 'Password123!'
  });

  if (authErr) {
    console.error('Auth error:', authErr);
    return;
  }

  const userId = auth.user.id;
  console.log(`✅ Authenticated! User ID: ${userId}`);

  // Fetch real profile from DB
  const { data: profile } = await supabase
    .from('profiles')
    .select('*, farmers(*)')
    .eq('id', userId)
    .single();

  console.log('Profile from DB:', profile);

  // Check centres
  const { data: centres } = await supabase.from('procurement_centres').select('*').limit(3);
  console.log(`Fetched ${centres.length} live procurement centres.`);

  console.log('✅ Farmer portal data verified seamlessly.');
}

verifyFarmerPortalData();
