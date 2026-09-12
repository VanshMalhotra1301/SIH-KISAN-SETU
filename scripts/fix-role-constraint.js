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
  const res = await client.query(`
    SELECT conname, pg_get_constraintdef(oid) as def
    FROM pg_constraint 
    WHERE conrelid = 'public.profiles'::regclass
  `);
  console.log('Profiles constraints:', res.rows);

  console.log('Updating profiles_role_check to include buyer...');
  await client.query(`
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
      CHECK (role IN ('farmer', 'centre_operator', 'district_admin', 'super_admin', 'buyer'));
  `);
  console.log('✅ profiles_role_check updated successfully!');

  // Check audit_logs constraints as well
  const auditRes = await client.query(`
    SELECT conname, pg_get_constraintdef(oid) as def
    FROM pg_constraint 
    WHERE conrelid = 'public.audit_logs'::regclass
  `);
  console.log('Audit logs constraints:', auditRes.rows);

  await client.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
