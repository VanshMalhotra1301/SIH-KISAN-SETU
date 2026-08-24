import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Client } = pg;

async function checkIndex() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  await client.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_ticket_id ON public.payments (ticket_id);
  `);
  console.log("✅ Unique index on payments.ticket_id ensured!");
  await client.end();
}

checkIndex();
