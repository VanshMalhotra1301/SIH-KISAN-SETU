import pg from 'pg';

const regions = ['ap-south-1', 'eu-central-1', 'us-east-1', 'us-west-1', 'ap-southeast-1'];
const { Client } = pg;

async function testPoolers() {
  for (const reg of regions) {
    for (const port of [6543, 5432]) {
      const conn = `postgresql://postgres.yylgukviahqpuznlcddp:SIH2026KISANSETU@aws-0-${reg}.pooler.supabase.com:${port}/postgres`;
      const client = new Client({
        connectionString: conn,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 4000
      });
      try {
        await client.connect();
        console.log(`SUCCESS with region: ${reg} on port ${port}! Connection: ${conn}`);
        const res = await client.query('SELECT NOW()');
        console.log('Result:', res.rows[0]);
        await client.end();
        return conn;
      } catch (err) {
        console.log(`Failed ${reg}:${port} -> ${err.message}`);
      }
    }
  }
}

testPoolers();
