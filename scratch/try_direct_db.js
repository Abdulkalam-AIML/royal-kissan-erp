const { Client } = require('pg');

async function run() {
  const client = new Client({
    connectionString: 'postgresql://postgres:Admin%40123@db.oweutcivgpmzldlcmkvd.supabase.co:5432/postgres',
    ssl: {
      rejectUnauthorized: false
    },
    connectionTimeoutMillis: 5000
  });

  try {
    console.log('Connecting to direct database...');
    await client.connect();
    console.log('✅ Connected successfully!');
    
    console.log('Testing a query...');
    const res = await client.query('SELECT NOW()');
    console.log('Query result:', res.rows[0]);
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
  } finally {
    await client.end();
  }
}

run();
