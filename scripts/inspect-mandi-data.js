import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Client } = pg;

async function check() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:SIH2026KISANSETU@db.yylgukviahqpuznlcddp.supabase.co:5432/postgres',
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  const tickets = await client.query(`
    SELECT t.id, t.token, t.farmer_id, t.farmer_name, t.centre_id, c.name as centre_name, c.code as centre_code, t.stage, t.crop, t.quantity_quintals
    FROM public.queue_tickets t
    LEFT JOIN public.procurement_centres c ON c.id = t.centre_id
    ORDER BY t.created_at DESC LIMIT 10;
  `);
  console.log("=== QUEUE TICKETS ===");
  console.log(tickets.rows);

  const windows = await client.query(`
    SELECT bw.id, bw.ticket_id, bw.farmer_id, bw.centre_id, bw.crop, bw.quantity_quintals, bw.status, bw.msp_rate, pc.name as centre_name, pc.code as centre_code
    FROM public.bidding_windows bw
    LEFT JOIN public.procurement_centres pc ON pc.id = bw.centre_id
    ORDER BY bw.created_at DESC;
  `);
  console.log("\n=== BIDDING WINDOWS ===");
  console.log(windows.rows);

  await client.end();
}

check().catch(console.error);
