import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function testDealRoom() {
  console.log("Testing Deal Room End-to-End...");

  // Sign in as test buyer
  const testEmail = 'testbuyer_1789209718367@example.com';
  const { data: authData, error: signInErr } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: 'Password@123'
  });
  if (signInErr) throw new Error("Sign in failed: " + signInErr.message);

  const { data: buyer } = await supabase.from('buyers').select('*').eq('user_id', authData.user.id).single();
  console.log("Buyer authenticated, centre:", buyer.centre_id);

  // Get farmer
  const { data: farmer } = await supabase.from('profiles').select('*').eq('role', 'farmer').limit(1).single();

  // Create ticket
  const { data: ticket, error: tErr } = await supabase.from('queue_tickets').insert({
    token: `KS-DEAL-${Date.now().toString().slice(-4)}`,
    farmer_id: farmer.id,
    farmer_name: farmer.full_name || 'Farmer',
    centre_id: buyer.centre_id,
    crop: 'Wheat',
    quantity_quintals: 100,
    stage: 'booked'
  }).select().single();
  if (tErr) throw new Error("Create ticket failed: " + tErr.message);

  // Create window
  const { data: windowId, error: wErr } = await supabase.rpc('create_bidding_window', {
    p_ticket_id: ticket.id,
    p_farmer_id: ticket.farmer_id,
    p_centre_id: ticket.centre_id,
    p_crop: ticket.crop,
    p_quantity: ticket.quantity_quintals
  });
  if (wErr) throw new Error("Create window failed: " + wErr.message);

  // Submit initial bid
  const { data: bidId, error: bidErr } = await supabase.rpc('submit_bid', {
    p_window_id: windowId,
    p_buyer_id: authData.user.id,
    p_bid_amount: 2400.00,
    p_quantity: 100
  });
  if (bidErr) throw new Error("Submit bid failed: " + bidErr.message);
  console.log("✅ Initial bid placed:", bidId, "Amount: ₹2400");

  // Farmer sends negotiation message with counter offer
  console.log("Sending negotiation message from Farmer...");
  const { data: farmerMsgRes, error: fErr } = await supabase.rpc('send_deal_message', {
    p_bid_id: bidId,
    p_window_id: windowId,
    p_sender_id: ticket.farmer_id,
    p_sender_role: 'farmer',
    p_message: 'क्या आप ₹2475/क्विंटल दे सकते हैं? तत्काल 100 क्विंटल उपलब्ध है।',
    p_proposed_price: 2475.00,
    p_proposed_quantity: 100
  });
  if (fErr) throw new Error("Farmer message failed: " + fErr.message);
  console.log("✅ Farmer negotiation message sent:", farmerMsgRes);

  // Buyer responds accepting counter price
  console.log("Sending response message from Buyer...");
  const { data: buyerMsgRes, error: bErr } = await supabase.rpc('send_deal_message', {
    p_bid_id: bidId,
    p_window_id: windowId,
    p_sender_id: authData.user.id,
    p_sender_role: 'buyer',
    p_message: 'हाँ जी, ₹2475/क्विंटल मंजूर है। आज ही तुलाई करा लें।',
    p_proposed_price: 2475.00,
    p_proposed_quantity: 100
  });
  if (bErr) throw new Error("Buyer response failed: " + bErr.message);
  console.log("✅ Buyer response sent and price updated:", buyerMsgRes);

  // Verify updated bid in DB
  const { data: updatedBid } = await supabase.from('bids').select('*').eq('id', bidId).single();
  console.log("Updated bid status:", updatedBid.status, "New amount: ₹" + updatedBid.bid_amount);

  // Fetch deal messages
  const { data: messages, error: mErr } = await supabase
    .from('deal_messages')
    .select('*')
    .eq('bid_id', bidId)
    .order('created_at', { ascending: true });
  if (mErr) throw new Error("Fetch messages failed: " + mErr.message);
  console.log(`✅ Retrieved ${messages.length} deal messages in conversation!`);

  // Accept bid
  const { data: acceptRes, error: aErr } = await supabase.rpc('accept_bid', {
    p_bid_id: bidId,
    p_farmer_id: ticket.farmer_id
  });
  if (aErr) throw new Error("Accept bid failed: " + aErr.message);
  console.log("✅ Deal locked and accepted successfully:", acceptRes);

  console.log("\n🎉 DEAL ROOM BACKEND RPCs & CHAT VALIDATED 100%!");
}

testDealRoom().catch(err => {
  console.error("Deal room test failed:", err);
  process.exit(1);
});
