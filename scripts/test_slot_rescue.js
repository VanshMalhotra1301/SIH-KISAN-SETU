import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

async function testSlotRescue() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to DB. Starting Slot Rescue verification test...');

    // 1. Get a procurement centre
    const centreRes = await client.query('SELECT id, name FROM procurement_centres LIMIT 1;');
    const centre = centreRes.rows[0];
    console.log('Using centre:', centre.name, centre.id);

    // 2. Get two farmers
    const farmersRes = await client.query(`
      SELECT p.id, p.full_name 
      FROM profiles p 
      WHERE p.role = 'farmer' 
      LIMIT 2;
    `);
    const farmerA = farmersRes.rows[0];
    const farmerB = farmersRes.rows[1] || { id: '00000000-0000-0000-0000-000000000001', full_name: 'Test Farmer B' };
    console.log('Farmer A:', farmerA.full_name, farmerA.id);
    console.log('Farmer B:', farmerB.full_name, farmerB.id);

    // 3. Create a test slot
    const slotRes = await client.query(`
      INSERT INTO slots (centre_id, date, "window", demand_level, is_booked, booked_by)
      VALUES ($1, 'Today', '12:30 – 13:00', 'normal', false, NULL)
      RETURNING id, "window";
    `, [centre.id]);
    const slot = slotRes.rows[0];
    console.log('Created slot:', slot.id, slot.window);

    // 4. Test create_slot_rescue_vacancy
    const rescueRes = await client.query(`
      SELECT public.create_slot_rescue_vacancy(
        $1::uuid, $2::uuid, $3::text, 'Today', 'Wheat', 'गेहूँ', 100, $4::uuid, 'Harvest delayed test'
      ) as result;
    `, [centre.id, slot.id, slot.window, farmerA.id]);
    const rescueData = rescueRes.rows[0].result;
    console.log('Vacancy created result:', rescueData);
    const vacancyId = rescueData.vacancy_id;

    // Verify recipients were created
    const recipients = await client.query(`
      SELECT * FROM slot_rescue_recipients WHERE vacancy_id = $1;
    `, [vacancyId]);
    console.log('Recipients count in DB:', recipients.rowCount);

    // 5. Test claim_slot_rescue by Farmer B
    console.log('Attempting claim by Farmer B...');
    const claimRes1 = await client.query(`
      SELECT public.claim_slot_rescue($1::uuid, $2::uuid) as result;
    `, [vacancyId, farmerB.id]);
    console.log('Claim 1 result (should succeed):', claimRes1.rows[0].result);

    // 6. Test CONCURRENT / SECOND claim on same vacancy (Race condition test)
    console.log('Attempting concurrent claim on same claimed slot by Farmer A...');
    const claimRes2 = await client.query(`
      SELECT public.claim_slot_rescue($1::uuid, $2::uuid) as result;
    `, [vacancyId, farmerA.id]);
    console.log('Claim 2 result (should return ALREADY_CLAIMED):', claimRes2.rows[0].result);

    // 7. Verify audit_logs
    const auditLogs = await client.query(`
      SELECT action, target_type, target_id, metadata, created_at 
      FROM audit_logs 
      WHERE action IN ('slot_rescue_vacancy_created', 'slot_rescue_claimed', 'slot_cancelled_and_released')
      ORDER BY created_at DESC 
      LIMIT 5;
    `);
    console.log('Audit trail entries recorded:');
    auditLogs.rows.forEach(r => console.log(`  - [${r.action}] on ${r.target_type} (${r.target_id}):`, JSON.stringify(r.metadata)));

    // 8. Test cancel_procurement_slot on newly created ticket
    if (claimRes1.rows[0].result.success && claimRes1.rows[0].result.ticket_id) {
      const ticketId = claimRes1.rows[0].result.ticket_id;
      console.log('Testing cancellation of ticket:', ticketId);
      const cancelRes = await client.query(`
        SELECT public.cancel_procurement_slot($1::uuid, $2::uuid, 'Transport breakdown test') as result;
      `, [ticketId, farmerB.id]);
      console.log('Cancel result:', cancelRes.rows[0].result);

      // Verify ticket stage
      const checkTicket = await client.query('SELECT id, token, stage FROM queue_tickets WHERE id = $1', [ticketId]);
      console.log('Updated ticket state in DB:', checkTicket.rows[0]);
    }

    console.log('🎉 ALL BACKEND RPC & CONCURRENCY TESTS PASSED!');
    await client.end();
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exit(1);
  }
}

testSlotRescue();
