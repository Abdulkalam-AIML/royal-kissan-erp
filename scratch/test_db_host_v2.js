const { Client } = require('pg');

async function testConnection() {
  const connectionString = 'postgresql://postgres:Admin%40123@db.oweutcivgpmzldlcmkvd.supabase.co:5432/postgres';
  console.log('Testing connection with simple postgres user on port 5432...');
  
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000
  });

  try {
    await client.connect();
    console.log('✅ Connected successfully!');
    const res = await client.query('SELECT NOW()');
    console.log('NOW:', res.rows[0].now);
    await client.end();
  } catch (err) {
    console.error('❌ Failed:', err.message);
  }
}

testConnection();
