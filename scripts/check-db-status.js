import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Client } = pg;
const client = new Client({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:SIH2026KISANSETU@db.yylgukviahqpuznlcddp.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await client.connect();
  console.log('Connected to DB');
  
  const tables = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name");
  console.log('Public tables:', tables.rows.map(r => r.table_name));

  const funcs = await client.query(`
    SELECT routine_name, routine_type, data_type 
    FROM information_schema.routines 
    WHERE routine_schema = 'public' AND routine_name = 'register_user_account'
  `);
  console.log('register_user_account routines:', funcs.rows);

  const params = await client.query(`
    SELECT parameter_name, data_type, parameter_mode, ordinal_position
    FROM information_schema.parameters
    WHERE specific_schema = 'public' 
      AND specific_name LIKE 'register_user_account%'
    ORDER BY specific_name, ordinal_position
  `);
  console.log('register_user_account parameters:', params.rows);

  await client.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
