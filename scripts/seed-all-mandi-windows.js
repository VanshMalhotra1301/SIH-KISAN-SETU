import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Client } = pg;

async function seedAll() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:SIH2026KISANSETU@db.yylgukviahqpuznlcddp.supabase.co:5432/postgres',
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  const centresRes = await client.query(`SELECT id, name, code FROM public.procurement_centres ORDER BY code;`);
  const centres = centresRes.rows;

  const farmersRes = await client.query(`SELECT id, full_name FROM public.profiles WHERE role = 'farmer' LIMIT 5;`);
  const farmers = farmersRes.rows;

  if (farmers.length === 0) {
    throw new Error("No farmers found in profiles");
  }

  const now = new Date();
  const closesAt = new Date(now.getTime() + 48 * 60 * 60 * 1000); // 48 hours

  console.log(`Seeding active open bidding windows across ${centres.length} mandis...`);

  for (let i = 0; i < centres.length; i++) {
    const centre = centres[i];
    const farmer = farmers[i % farmers.length];

    // Check if there is already an open window for this centre
    const existingOpen = await client.query(`
      SELECT id FROM public.bidding_windows 
      WHERE centre_id = $1 AND status = 'open';
    `, [centre.id]);

    if (existingOpen.rows.length > 0) {
      console.log(`✓ Centre ${centre.code} (${centre.name}) already has ${existingOpen.rows.length} open window(s).`);
      // Update closes_at to ensure it's not expired
      await client.query(`
        UPDATE public.bidding_windows 
        SET closes_at = $1, updated_at = NOW() 
        WHERE centre_id = $2 AND status = 'open';
      `, [closesAt, centre.id]);
      continue;
    }

    // Create queue ticket
    const crop = i % 2 === 0 ? "Wheat" : "Mustard";
    const msp = crop === "Wheat" ? 2430.00 : 5650.00;
    const qty = 80 + (i * 15);
    const token = `KS-MND-${1000 + i}`;

    const ticketRes = await client.query(`
      INSERT INTO public.queue_tickets (
        farmer_id, farmer_name, centre_id, crop, quantity_quintals, stage, slot_window, token
      ) VALUES (
        $1, $2, $3, $4, $5, 'scheduled', '10:30 – 11:15', $6
      ) RETURNING id;
    `, [farmer.id, farmer.full_name, centre.id, crop, qty, token]);

    const ticketId = ticketRes.rows[0].id;

    // Create open bidding window
    const winRes = await client.query(`
      INSERT INTO public.bidding_windows (
        ticket_id, farmer_id, centre_id, crop, quantity_quintals, msp_rate, status, opens_at, closes_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, 'open', $7, $8
      ) RETURNING id;
    `, [ticketId, farmer.id, centre.id, crop, qty, msp, now, closesAt]);

    console.log(`+ Created OPEN window for ${centre.code} (${centre.name}): ${crop} ${qty} qtl (Window ID: ${winRes.rows[0].id})`);
  }

  // Also add a second open lot specifically for Nilokheri Grain Market so Nilokheri buyers have multiple choices
  const nilokheri = centres.find(c => c.code === 'KRN-01');
  if (nilokheri) {
    const niloCount = await client.query(`SELECT count(*) FROM public.bidding_windows WHERE centre_id = $1 AND status = 'open';`, [nilokheri.id]);
    if (parseInt(niloCount.rows[0].count) < 2) {
      const ticket2 = await client.query(`
        INSERT INTO public.queue_tickets (
          farmer_id, farmer_name, centre_id, crop, quantity_quintals, stage, slot_window, token
        ) VALUES (
          $1, 'Vikas Singh', $2, 'Mustard', 95.00, 'scheduled', '12:00 – 12:45', 'KS-MND-9901'
        ) RETURNING id;
      `, [farmers[0].id, nilokheri.id]);

      await client.query(`
        INSERT INTO public.bidding_windows (
          ticket_id, farmer_id, centre_id, crop, quantity_quintals, msp_rate, status, opens_at, closes_at
        ) VALUES (
          $1, $2, $3, 'Mustard', 95.00, 5650.00, 'open', $4, $5
        );
      `, [ticket2.rows[0].id, farmers[0].id, nilokheri.id, now, closesAt]);
      console.log(`+ Added second open lot (Mustard 95 qtl) for Nilokheri Grain Market.`);
    }
  }

  console.log("\nAll mandis have active open windows ready for buyer bidding!");
  await client.end();
}

seedAll().catch(console.error);
