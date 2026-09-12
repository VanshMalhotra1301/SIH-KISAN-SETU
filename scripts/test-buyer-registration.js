import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testBuyerRegistration() {
  console.log("Testing Buyer Registration via Supabase Client...");

  // 1. Fetch a valid centre
  const { data: centres, error: cErr } = await supabase.from('procurement_centres').select('id, name').limit(1);
  if (cErr || !centres || centres.length === 0) {
    throw new Error("Failed to fetch procurement centre: " + (cErr?.message || "none found"));
  }
  const centre = centres[0];
  console.log(`Using centre: ${centre.name} (${centre.id})`);

  const testEmail = `testbuyer_${Date.now()}@example.com`;
  const testPassword = "Password@123";

  // 2. Call register_user_account RPC
  console.log(`Calling register_user_account for ${testEmail}...`);
  const { data: rpcData, error: rpcError } = await supabase.rpc("register_user_account", {
    p_email: testEmail,
    p_password: testPassword,
    p_role: "buyer",
    p_full_name: "Test Buyer Agency",
    p_phone: "9876543210",
    p_district: "Karnal",
    p_village: "",
    p_crop: "Wheat",
    p_quantity: 100,
    p_centre_id: centre.id,
    p_department: "",
    p_bank_name: null,
    p_bank_account: null,
    p_ifsc_code: null,
    p_land_area: null,
    p_aadhaar_number: null,
    p_business_name: "Karnal Grain Traders Ltd",
    p_business_type: "trader",
    p_license_number: "APMC-KRN-TEST-001"
  });

  if (rpcError) {
    console.error("RPC Error:", rpcError);
    process.exit(1);
  }
  console.log("✅ RPC succeeded! Returned:", rpcData);

  // 3. Test sign in
  console.log("Testing sign in with credentials...");
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: testPassword
  });

  if (authError) {
    console.error("Sign in failed:", authError);
    process.exit(1);
  }
  console.log("✅ Authenticated successfully as user ID:", authData.user?.id);

  // 4. Verify buyer profile in public.buyers
  const { data: buyerRow, error: buyerErr } = await supabase
    .from("buyers")
    .select("*")
    .eq("user_id", authData.user?.id)
    .single();

  if (buyerErr) {
    console.error("Failed to query public.buyers:", buyerErr);
    process.exit(1);
  }

  console.log("✅ public.buyers record verified:", buyerRow);
  console.log("\n🎉 TEST PASSED! Buyer registration and authentication works flawlessly.");
}

testBuyerRegistration().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
