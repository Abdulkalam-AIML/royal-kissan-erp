const { Client } = require('pg');

const hosts = [
  'aws-1-ap-southeast-2.pooler.supabase.com',
  'aws-1-ap-south-1.pooler.supabase.com',
  'aws-0-ap-southeast-2.pooler.supabase.com',
  'aws-0-ap-south-1.pooler.supabase.com'
];

async function test(host) {
  console.log(`Connecting to ${host} on port 6543...`);
  const client = new Client({
    host: host,
    port: 6543,
    user: 'postgres.oweutcivgpmzldlcmkvd',
    password: 'Admin@123',
    database: 'postgres',
    ssl: {
      rejectUnauthorized: false,
      servername: host
    },
    connectionTimeoutMillis: 5000
  });

  try {
    await client.connect();
    console.log(`🚀 SUCCESS! Connected to ${host}!`);
    const res = await client.query('SELECT NOW()');
    console.log('Query result:', res.rows[0]);
    return true;
  } catch (err) {
    console.log(`❌ Failed for ${host}:`, err.message);
    return false;
  } finally {
    await client.end();
  }
}

async function run() {
  for (const h of hosts) {
    const ok = await test(h);
    if (ok) break;
  }
}

run();
