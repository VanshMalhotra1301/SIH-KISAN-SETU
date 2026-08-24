import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://yylgukviahqpuznlcddp.supabase.co',
  process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_MqnDh-ISCw7Qrp1HAw_zyA_D5kVb-nq'
);

async function testUserSignupFromScreenshot() {
  const email = 'sarrafharshit411@gmail.com';
  console.log(`Registering user from screenshot: ${email}...`);

  const { data, error } = await supabase.rpc('register_user_account', {
    p_email: email,
    p_password: 'Password123!',
    p_role: 'farmer',
    p_full_name: 'Harshit',
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
    console.log('✅ User registered successfully:', data);

    // Test sign in
    const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
      email,
      password: 'Password123!'
    });

    if (authErr) {
      console.error('Auth Error:', authErr);
    } else {
      console.log('✅ Instant Sign In Success! ID:', auth.user.id);
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', auth.user.id).single();
      console.log('✅ Database profile verified:', profile);
    }
  }
}

testUserSignupFromScreenshot();
