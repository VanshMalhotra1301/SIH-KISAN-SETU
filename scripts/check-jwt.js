import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

async function checkJwtSecret() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  try {
    const res = await client.query(`
      SELECT
        current_setting('app.settings.jwt_secret', true) as jwt_secret,
        current_setting('app.settings.jwt_exp', true) as jwt_exp
    `);
    console.log('App settings JWT:', res.rows[0]);
  } catch (e) {
    console.log('Error checking jwt:', e.message);
  }

  await client.end();
}

checkJwtSecret();
