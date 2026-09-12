import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function testFullBiddingFlow() {
  console.log("Testing Full Bidding Flow with Fresh Ticket...");

  // Sign in as our test buyer
  const testEmail = 'testbuyer_1789209718367@example.com';
  const { data: authData, error: signInErr } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: 'Password@123'
  });
  if (signInErr) throw new Error("Sign in failed: " + signInErr.message);

  const { data: buyer } = await supabase.from('buyers').select('*').eq('user_id', authData.user.id).single();
  console.log("Buyer centre:", buyer.centre_id);

  // Get a farmer profile
  const { data: farmer } = await supabase.from('profiles').select('*').eq('role', 'farmer').limit(1).single();

  // Create a brand new ticket at this centre
  const { data: ticket, error: tErr } = await supabase.from('queue_tickets').insert({
    token: `KS-TEST-${Date.now().toString().slice(-4)}`,
    farmer_id: farmer.id,
    farmer_name: farmer.full_name || 'Farmer',
    centre_id: buyer.centre_id,
    crop: 'Wheat',
    quantity_quintals: 150,
    stage: 'booked'
  }).select().single();

  if (tErr) throw new Error("Create fresh ticket failed: " + tErr.message);
  console.log(`Created fresh ticket ${ticket.token} at centre ${ticket.centre_id}`);

  // Create bidding window
  const { data: windowId, error: wErr } = await supabase.rpc('create_bidding_window', {
    p_ticket_id: ticket.id,
    p_farmer_id: ticket.farmer_id,
    p_centre_id: ticket.centre_id,
    p_crop: ticket.crop,
    p_quantity: ticket.quantity_quintals
  });
  if (wErr) throw new Error("Create window failed: " + wErr.message);
  console.log("✅ Bidding window created:", windowId);

  // Submit bid
  const { data: bidId, error: bidErr } = await supabase.rpc('submit_bid', {
    p_window_id: windowId,
    p_buyer_id: authData.user.id,
    p_bid_amount: 2500.00,
    p_quantity: 150
  });
  if (bidErr) throw new Error("Submit bid failed: " + bidErr.message);
  console.log("✅ Bid submitted successfully! Bid ID:", bidId);

  // Accept bid
  const { data: acceptRes, error: aErr } = await supabase.rpc('accept_bid', {
    p_bid_id: bidId,
    p_farmer_id: ticket.farmer_id
  });
  if (aErr) throw new Error("Accept bid failed: " + aErr.message);
  console.log("✅ Bid accepted successfully! Result:", acceptRes);

  console.log("\n🎉 FULL END-TO-END BIDDING LIFECYCLE 100% VERIFIED!");
}

testFullBiddingFlow().catch(err => {
  console.error("Workflow test error:", err);
  process.exit(1);
});
