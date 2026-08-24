import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://yylgukviahqpuznlcddp.supabase.co',
  process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_MqnDh-ISCw7Qrp1HAw_zyA_D5kVb-nq'
);

async function testSignIn() {
  console.log('Testing Supabase Auth signInWithPassword...');
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'farmer@kisansetu.in',
    password: 'KisanSetu2026!'
  });

  if (error) {
    console.error('Sign in error:', error);
  } else {
    console.log('✅ SIGN IN WORKED VIA REAL SUPABASE AUTH!');
    console.log('User ID:', data.user.id);
    console.log('Email:', data.user.email);
    console.log('Access Token:', data.session.access_token.slice(0, 30) + '...');

    // Fetch user profile
    const { data: profile, error: pErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();
    console.log('Fetched Profile from DB:', profile);
  }
}

testSignIn();
