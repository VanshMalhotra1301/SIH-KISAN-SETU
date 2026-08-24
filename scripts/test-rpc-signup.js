import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://yylgukviahqpuznlcddp.supabase.co',
  process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_MqnDh-ISCw7Qrp1HAw_zyA_D5kVb-nq'
);

async function testRpcSignup() {
  const testEmail = `harshit_${Date.now()}@gmail.com`;
  console.log(`Registering new user via RPC: ${testEmail}...`);

  const { data, error } = await supabase.rpc('register_user_account', {
    p_email: testEmail,
    p_password: 'Password123!',
    p_role: 'farmer',
    p_full_name: 'Harshit Sarraf',
    p_phone: '7209569335',
    p_district: 'Patna',
    p_village: 'Danapur',
    p_crop: 'Wheat',
    p_quantity: 100,
    p_centre_id: null,
    p_department: 'Farmer Community'
  });

  if (error) {
    console.error('RPC Error:', error);
  } else {
    console.log('✅ User registered successfully via RPC:', data);

    // Test immediate sign in with the new account
    console.log('Signing in with new account...');
    const { data: authData, error: signInErr } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: 'Password123!'
    });

    if (signInErr) {
      console.error('SignIn Error:', signInErr);
    } else {
      console.log('✅ SIGNED IN INSTANTLY! User ID:', authData.user.id);
      console.log('Role verified:', authData.user.user_metadata?.role);
    }
  }
}

testRpcSignup();
