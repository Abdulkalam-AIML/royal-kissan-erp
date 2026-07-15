const { Client } = require('pg');

const hosts = [
  'db.oweutcivgpmzldlcmkvd.supabase.co',
  'aws-0-ap-south-1.pooler.supabase.com',
  'aws-0-us-west-2.pooler.supabase.com'
];

async function testHost(host) {
  console.log(`\nTesting connection to host: ${host}...`);
  const client = new Client({
    connectionString: `postgresql://postgres.oweutcivgpmzldlcmkvd:Admin%40123@${host}:5432/postgres`, // try standard port 5432 first
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000
  });

  try {
    await client.connect();
    console.log(`✅ Success on ${host}:5432!`);
    await client.end();
    return;
  } catch (err) {
    console.log(`❌ Failed on ${host}:5432: ${err.message}`);
  }

  const client6543 = new Client({
    connectionString: `postgresql://postgres.oweutcivgpmzldlcmkvd:Admin%40123@${host}:6543/postgres`, // try pooler port 6543
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000
  });

  try {
    await client6543.connect();
    console.log(`✅ Success on ${host}:6543!`);
    await client6543.end();
    return;
  } catch (err) {
    console.log(`❌ Failed on ${host}:6543: ${err.message}`);
  }
}

async function run() {
  for (const host of hosts) {
    await testHost(host);
  }
}

run();
