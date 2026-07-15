const { Client } = require('pg');

async function run() {
  // Resolved IPv6 from earlier dns check: '2406:da1c:4c7:f800:8e8a:8538:e68e:a600'
  const ip = '2406:da1c:4c7:f800:8e8a:8538:e68e:a600';
  console.log(`Connecting directly to IPv6 address [${ip}] on port 5432...`);
  
  const client = new Client({
    host: ip,
    port: 5432,
    user: 'postgres',
    password: 'Admin@123',
    database: 'postgres',
    ssl: {
      rejectUnauthorized: false
    },
    connectionTimeoutMillis: 10000
  });

  try {
    await client.connect();
    console.log('✅ Direct IPv6 Connection Successful!');
    const res = await client.query('SELECT NOW()');
    console.log('Query result:', res.rows[0]);
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
  } finally {
    await client.end();
  }
}

run();
