const { Client } = require('pg');

async function test(user, database, port) {
  console.log(`Testing with user=${user}, database=${database}, port=${port}...`);
  const client = new Client({
    host: 'aws-0-ap-south-1.pooler.supabase.com',
    port: port,
    user: user,
    password: 'Admin@123',
    database: database,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000
  });

  try {
    await client.connect();
    console.log('✅ Connected successfully!');
    const res = await client.query('SELECT NOW()');
    console.log('Query result:', res.rows[0]);
    return true;
  } catch (err) {
    console.log('❌ Failed:', err.message);
    return false;
  } finally {
    await client.end();
  }
}

async function run() {
  await test('postgres.oweutcivgpmzldlcmkvd', 'postgres', 6543);
  await test('postgres', 'postgres', 6543);
  await test('postgres', 'postgres', 5432);
}

run();
