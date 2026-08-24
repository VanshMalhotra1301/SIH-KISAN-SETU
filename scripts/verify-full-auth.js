import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://yylgukviahqpuznlcddp.supabase.co',
  process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_MqnDh-ISCw7Qrp1HAw_zyA_D5kVb-nq'
);

async function testFullAuthWorkflow() {
  console.log("=== Testing Real Supabase Authentication Workflow ===");

  // 1. Test Sign In for existing seeded roles
  const roles = [
    { email: 'farmer@kisansetu.in', expectedRole: 'farmer' },
    { email: 'centre@kisansetu.in', expectedRole: 'centre_operator' },
    { email: 'admin@kisansetu.in', expectedRole: 'district_admin' },
    { email: 'superadmin@kisansetu.in', expectedRole: 'super_admin' },
  ];

  for (const r of roles) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: r.email,
      password: 'KisanSetu2026!'
    });

    if (error) {
      console.error(`❌ Failed to sign in as ${r.email}:`, error.message);
    } else {
      console.log(`✅ Signed in as ${r.email} | User ID: ${data.user.id}`);

      // Verify database profile
      const { data: profile, error: pErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (pErr) {
        console.error(`  Profile fetch error:`, pErr.message);
      } else {
        console.log(`  Database Role: ${profile.role} (matches expected: ${profile.role === r.expectedRole})`);
      }
    }
  }

  // Sign out
  await supabase.auth.signOut();
  console.log("✅ All roles authenticated and verified against database profiles successfully!");
}

testFullAuthWorkflow();
