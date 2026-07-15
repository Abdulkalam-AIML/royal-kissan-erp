const { Client } = require('pg');

async function run() {
  const host = 'aws-0-ap-south-2.pooler.supabase.com';
  console.log(`Connecting to Hyderabad pooler ${host} on port 6543...`);
  
  const client = new Client({
    host: host,
    port: 6543,
    user: 'postgres.oweutcivgpmzldlcmkvd',
    password: 'Admin@123',
    database: 'postgres',
    ssl: {
      rejectUnauthorized: false
    },
    connectionTimeoutMillis: 10000
  });

  try {
    await client.connect();
    console.log('🚀 SUCCESS! Connected to Hyderabad pooler ap-south-2!');
    const res = await client.query('SELECT NOW()');
    console.log('Query result:', res.rows[0]);
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
  } finally {
    await client.end();
  }
}

run();
