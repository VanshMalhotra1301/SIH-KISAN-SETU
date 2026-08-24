import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Client } = pg;

async function checkTickets() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  const centres = await client.query(`SELECT id, code, name FROM public.procurement_centres;`);
  console.log("Centres:", centres.rows);

  const tickets = await client.query(`
    SELECT t.id, t.token, t.farmer_name, t.centre_id, c.code as centre_code, t.stage, t.slot_window, t.quantity_quintals
    FROM public.queue_tickets t
    LEFT JOIN public.procurement_centres c ON c.id = t.centre_id
    ORDER BY t.created_at ASC;
  `);
  console.log("\nAll Tickets in DB:", tickets.rows);

  await client.end();
}

checkTickets();
