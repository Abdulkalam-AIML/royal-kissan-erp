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

  const sql = `
    -- Add missing columns to bills table
    ALTER TABLE public.bills
      ADD COLUMN IF NOT EXISTS customer_address TEXT,
      ADD COLUMN IF NOT EXISTS cash_amount NUMERIC(12,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS upi_amount NUMERIC(12,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(12,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'due',
      ADD COLUMN IF NOT EXISTS notes TEXT;

    -- Add missing columns to archive_bills table if they aren't there
    ALTER TABLE public.archive_bills
      ADD COLUMN IF NOT EXISTS customer_address TEXT,
      ADD COLUMN IF NOT EXISTS cash_amount NUMERIC(12,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS upi_amount NUMERIC(12,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(12,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'due',
      ADD COLUMN IF NOT EXISTS notes TEXT;

    -- Notify PostgREST to reload the schema cache
    NOTIFY pgrst, 'reload schema';
  `;

  try {
    console.log("Connecting to database to add missing columns to 'bills'...");
    await client.connect();
    console.log("✅ Connected successfully!");
    
    await client.query(sql);
    console.log("✅ Successfully added missing columns and refreshed PostgREST schema cache!");
  } catch (err) {
    console.error("❌ Failed to add columns:", err.message);
  } finally {
    await client.end();
  }
}

run();
