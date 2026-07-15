const fs = require('fs');
const { Client } = require('pg');

async function run() {
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
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log("Connected to database. Querying columns of table 'bills'...");
    
    const res = await client.query(`
      SELECT table_name, column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name IN ('bills', 'bill_items')
      ORDER BY table_name, ordinal_position;
    `);
    
    console.log("\nColumns metadata:");
    res.rows.forEach(row => {
      console.log(`- ${row.table_name}.${row.column_name}: ${row.data_type} (Nullable: ${row.is_nullable}, Default: ${row.column_default})`);
    });
  } catch (err) {
    console.error("Error querying database:", err.message);
  } finally {
    await client.end();
  }
}

run();
