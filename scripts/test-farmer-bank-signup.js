import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://yylgukviahqpuznlcddp.supabase.co',
  process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5bGd1a3ZpYWhxcHV6bmxjZGRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAzODU0NDYsImV4cCI6MjA1NTk2MTQ0Nn0.74XJd01G10gK7iA5lYgL0e-hX8d0z4e7f8g9h1j2k3l'
);

async function testFarmerBankSignup() {
  const testEmail = `test.farmer.${Date.now()}@kisansetu.in`;
  const testPassword = 'KisanPassword123!';

  console.log(`Testing farmer registration with bank details for: ${testEmail}...`);

  // Call RPC
  const { data: rpcData, error: rpcError } = await supabase.rpc('register_user_account', {
    p_email: testEmail,
    p_password: testPassword,
    p_role: 'farmer',
    p_full_name: 'Baldev Singh Dhillon',
    p_phone: '+91 98123 45678',
    p_district: 'Karnal',
    p_village: 'Nilokheri',
    p_crop: 'Wheat',
    p_quantity: 160,
    p_centre_id: null,
    p_department: 'Department of Agriculture',
    p_bank_name: 'Punjab National Bank',
    p_bank_account: '0241000100234567',
    p_ifsc_code: 'PUNB0024100',
    p_land_area: 12.5,
    p_aadhaar_number: '784512369874'
  });

  if (rpcError) {
    console.error('RPC Error:', rpcError);
    process.exit(1);
  }

  console.log('✅ RPC Returned:', rpcData);

  // Authenticate to check token
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  });

  if (authError) {
    console.error('Auth Sign In Error:', authError);
    process.exit(1);
  }

  console.log('✅ Sign in successful. User ID:', authData.user.id);

  // Fetch full profile and farmer record
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('*, farmers(*)')
    .eq('id', authData.user.id)
    .single();

  if (profileError) {
    console.error('Profile fetch error:', profileError);
    process.exit(1);
  }

  console.log('✅ Verified Profile & Farmer in Database:');
  console.log(JSON.stringify(profileData, null, 2));

  // Clean up the test user
  const pg = (await import('pg')).default;
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();
  await client.query(`DELETE FROM auth.identities WHERE user_id = '${authData.user.id}';`);
  await client.query(`DELETE FROM auth.users WHERE id = '${authData.user.id}';`);
  await client.end();
  console.log('✅ Cleaned up temporary test user.');
}

testFarmerBankSignup().catch(console.error);
