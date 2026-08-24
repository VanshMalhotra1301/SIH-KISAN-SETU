import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://yylgukviahqpuznlcddp.supabase.co',
  process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_MqnDh-ISCw7Qrp1HAw_zyA_D5kVb-nq'
);

async function testAuth() {
  const testEmail = `farmer_${Date.now()}@kisansetu.in`;
  const testPassword = 'Password123!';

  console.log(`Testing SignUp with ${testEmail}...`);
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: testEmail,
    password: testPassword,
    options: {
      data: {
        role: 'farmer',
        full_name: 'Test Farmer',
        full_name_hi: 'परीक्षण किसान',
        phone: '+91 99999 88888',
        district: 'Karnal',
        village: 'Bahadurgarh',
        crop: 'Wheat',
        quantity_quintals: 150,
      }
    }
  });

  if (signUpError) {
    console.error('SignUp Error:', signUpError);
  } else {
    console.log('SignUp Success! User ID:', signUpData.user?.id);
    console.log('Session created?', !!signUpData.session);
  }

  // Now test sign in
  console.log(`Testing SignIn with ${testEmail}...`);
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: testPassword
  });

  if (signInError) {
    console.error('SignIn Error:', signInError);
  } else {
    console.log('SignIn Success! User ID:', signInData.user?.id);
    console.log('Access token:', signInData.session?.access_token?.slice(0, 25) + '...');

    // Fetch profile
    const { data: profile, error: pError } = await supabase
      .from('profiles')
      .select('*, farmers(*)')
      .eq('id', signInData.user.id)
      .single();
    console.log('Profile from DB:', profile);
  }
}

testAuth();
