const { Client } = require('pg');

async function test(uri) {
  console.log(`Testing with URI: ${uri}`);
  const client = new Client({
    connectionString: uri,
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
  // Try Ap-South-1 (Mumbai) with options
  await test('postgresql://postgres:Admin%40123@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?options=project%3Doweutcivgpmzldlcmkvd');
  // Try Ap-Southeast-2 (Sydney) with options
  await test('postgresql://postgres:Admin%40123@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres?options=project%3Doweutcivgpmzldlcmkvd');
  // Try Ap-Southeast-1 (Singapore) with options
  await test('postgresql://postgres:Admin%40123@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?options=project%3Doweutcivgpmzldlcmkvd');
}

run();
