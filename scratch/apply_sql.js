const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function run() {
  const sqlFilePath = '/Users/abdulkalam/.gemini/antigravity-ide/brain/0a157d5d-4197-4670-9c3f-321d609fd838/PHASE_2_HARDENING.sql';
  const sql = fs.readFileSync(sqlFilePath, 'utf8');

  let connectionString;
  try {
    const envFile = fs.readFileSync('/Users/abdulkalam/Desktop/ROLLY ERP/royal-kissan-erp/.env.local', 'utf8');
    const dbUrlLine = envFile.split('\n').find(line => line.startsWith('DATABASE_URL='));
    if (dbUrlLine) {
      connectionString = dbUrlLine.split('DATABASE_URL=')[1].replace(/['"]/g, '').trim();
    }
  } catch (err) {
    console.error("Error reading .env.local:", err.message);
  }

  if (!connectionString) {
    console.error("❌ DATABASE_URL not found in .env.local!");
    process.exit(1);
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    
    console.log('Applying SQL fixes...');
    await client.query(sql);
    console.log('✅ SQL Applied Successfully!');
  } catch (err) {
    console.error('❌ Failed to apply SQL:', err.message);
  } finally {
    await client.end();
  }
}

run();
