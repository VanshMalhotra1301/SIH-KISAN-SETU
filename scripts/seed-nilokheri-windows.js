import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Client } = pg;

async function seed() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:SIH2026KISANSETU@db.yylgukviahqpuznlcddp.supabase.co:5432/postgres',
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  // Find a farmer
  const farmersRes = await client.query(`SELECT id, full_name FROM public.profiles WHERE role = 'farmer' LIMIT 3;`);
  console.log("Farmers found:", farmersRes.rows);
  const farmer = farmersRes.rows[0];
  if (!farmer) throw new Error("No farmer found");

  const nilokheriId = 'a1111111-1111-4111-8111-111111111111';

  // Check if a queue ticket exists or create one
  let ticketId;
  const ticketRes = await client.query(`
    SELECT id FROM public.queue_tickets 
    WHERE centre_id = $1 AND stage IN ('scheduled', 'waiting', 'booked') 
    LIMIT 1;
  `, [nilokheriId]);

  if (ticketRes.rows.length > 0) {
    ticketId = ticketRes.rows[0].id;
  } else {
    // Insert a new queue ticket for Nilokheri
    const newTicket = await client.query(`
      INSERT INTO public.queue_tickets (
        farmer_id, farmer_name, centre_id, crop, quantity_quintals, stage, slot_window, token, vehicle_number
      ) VALUES (
        $1, $2, $3, 'Wheat', 120.00, 'scheduled', '11:00 – 11:45', 'KS-8821', 'HR-05-T-8821'
      ) RETURNING id;
    `, [farmer.id, farmer.full_name, nilokheriId]);
    ticketId = newTicket.rows[0].id;
  }

  // Create an open bidding window for Nilokheri
  const now = new Date();
  const closesAt = new Date(now.getTime() + 4 * 60 * 60 * 1000); // 4 hours from now

  const insertWindow = await client.query(`
    INSERT INTO public.bidding_windows (
      ticket_id, farmer_id, centre_id, crop, quantity_quintals, msp_rate, status, opens_at, closes_at
    ) VALUES (
      $1, $2, $3, 'Wheat', 120.00, 2430.00, 'open', $4, $5
    ) RETURNING id, crop, quantity_quintals, msp_rate, status;
  `, [ticketId, farmer.id, nilokheriId, now, closesAt]);

  console.log("✅ Seeded Open Bidding Window for Nilokheri:", insertWindow.rows[0]);

  // Create a second lot (Mustard) as well
  const closesAt2 = new Date(now.getTime() + 5 * 60 * 60 * 1000);
  const ticket2 = await client.query(`
    INSERT INTO public.queue_tickets (
      farmer_id, farmer_name, centre_id, crop, quantity_quintals, stage, slot_window, token
    ) VALUES (
      $1, $2, $3, 'Mustard', 85.00, 'scheduled', '12:00 – 12:45', 'KS-8822'
    ) RETURNING id;
  `, [farmer.id, farmer.full_name, nilokheriId]);

  const insertWindow2 = await client.query(`
    INSERT INTO public.bidding_windows (
      ticket_id, farmer_id, centre_id, crop, quantity_quintals, msp_rate, status, opens_at, closes_at
    ) VALUES (
      $1, $2, $3, 'Mustard', 85.00, 5650.00, 'open', $4, $5
    ) RETURNING id, crop, quantity_quintals, msp_rate, status;
  `, [ticket2.rows[0].id, farmer.id, nilokheriId, now, closesAt2]);

  console.log("✅ Seeded Second Open Bidding Window for Nilokheri:", insertWindow2.rows[0]);

  await client.end();
}

seed().catch(console.error);
