import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Client } = pg;

async function seedForecast() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  const { rows: centres } = await client.query('SELECT id, code, name FROM public.procurement_centres');
  console.log(`Found ${centres.length} centres to seed forecast points for`);

  await client.query('DELETE FROM public.forecast_points;');

  const hours = [
    { hour: '08:00', actual: 8, pred: 8 },
    { hour: '09:00', actual: 16, pred: 18 },
    { hour: '10:00', actual: 29, pred: 31 },
    { hour: '11:00', actual: 44, pred: 42 },
    { hour: '12:00', actual: 38, pred: 52 },
    { hour: '13:00', actual: 22, pred: 28 },
    { hour: '14:00', actual: 34, pred: 46 },
    { hour: '15:00', actual: 41, pred: 48 },
    { hour: '16:00', actual: 19, pred: 22 },
  ];

  for (const c of centres) {
    const scale = c.code === 'KRN-01' ? 1.0 : c.code === 'KRN-02' ? 0.8 : c.code === 'KRN-03' ? 0.7 : 0.6;
    for (const h of hours) {
      await client.query(`
        INSERT INTO public.forecast_points (centre_id, hour_label, queue_actual, queue_predicted, capacity_line, date)
        VALUES ($1, $2, $3, $4, $5, CURRENT_DATE);
      `, [
        c.id,
        h.hour,
        Math.round(h.actual * scale),
        Math.round(h.pred * scale),
        55
      ]);
    }
  }

  const { rows: count } = await client.query('SELECT COUNT(*) as total FROM public.forecast_points');
  console.log(`✅ Seeded ${count[0].total} forecast points into public.forecast_points`);

  await client.end();
}

seedForecast().catch(console.error);
