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

  const userRes = await client.query(`SELECT id, email, created_at FROM auth.users WHERE email = 'sarraf@gmail.com';`);
  console.log("auth.users row:", userRes.rows);

  const buyerRes = await client.query(`SELECT * FROM public.buyers WHERE business_name ILIKE '%sarraf%';`);
  console.log("buyers row:", buyerRes.rows);

  const windowsRes = await client.query(`
    SELECT bw.id, bw.crop, bw.quantity_quintals, bw.msp_rate, bw.status, bw.centre_id, pc.name as centre_name
    FROM public.bidding_windows bw
    JOIN public.procurement_centres pc ON pc.id = bw.centre_id
    WHERE bw.centre_id = 'a1111111-1111-4111-8111-111111111111';
  `);
  console.log("Nilokheri windows:", windowsRes.rows);

  await client.end();
}

check().catch(console.error);
