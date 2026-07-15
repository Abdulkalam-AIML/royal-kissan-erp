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
    console.log("Connecting to database...");
    await client.connect();
    console.log("✅ Connected successfully!");

    console.log("Checking if public.archive_bills exists...");
    const checkArchiveTable = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_name = 'archive_bills'
      );
    `);
    const archiveBillsExists = checkArchiveTable.rows[0].exists;
    console.log(`archive_bills exists: ${archiveBillsExists}`);

    console.log("Applying safety-net migration to public.bills...");
    await client.query(`
      ALTER TABLE public.bills
        ADD COLUMN IF NOT EXISTS invoice_number TEXT,
        ADD COLUMN IF NOT EXISTS bill_type TEXT,
        ADD COLUMN IF NOT EXISTS customer_name TEXT,
        ADD COLUMN IF NOT EXISTS customer_phone TEXT,
        ADD COLUMN IF NOT EXISTS dealer_id UUID,
        ADD COLUMN IF NOT EXISTS driver_id UUID,
        ADD COLUMN IF NOT EXISTS route_id UUID,
        ADD COLUMN IF NOT EXISTS subtotal NUMERIC(12,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS gst_amount NUMERIC(12,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS total_amount NUMERIC(12,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash',
        ADD COLUMN IF NOT EXISTS due_amount NUMERIC(12,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS date DATE DEFAULT CURRENT_DATE,
        ADD COLUMN IF NOT EXISTS customer_address TEXT,
        ADD COLUMN IF NOT EXISTS cash_amount NUMERIC(12,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS upi_amount NUMERIC(12,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(12,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'due',
        ADD COLUMN IF NOT EXISTS notes TEXT;
    `);
    console.log("✅ Migration query executed on public.bills!");

    if (archiveBillsExists) {
      console.log("Applying safety-net migration to public.archive_bills...");
      await client.query(`
        ALTER TABLE public.archive_bills
          ADD COLUMN IF NOT EXISTS invoice_number TEXT,
          ADD COLUMN IF NOT EXISTS bill_type TEXT,
          ADD COLUMN IF NOT EXISTS customer_name TEXT,
          ADD COLUMN IF NOT EXISTS customer_phone TEXT,
          ADD COLUMN IF NOT EXISTS dealer_id UUID,
          ADD COLUMN IF NOT EXISTS driver_id UUID,
          ADD COLUMN IF NOT EXISTS route_id UUID,
          ADD COLUMN IF NOT EXISTS subtotal NUMERIC(12,2) DEFAULT 0,
          ADD COLUMN IF NOT EXISTS gst_amount NUMERIC(12,2) DEFAULT 0,
          ADD COLUMN IF NOT EXISTS total_amount NUMERIC(12,2) DEFAULT 0,
          ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash',
          ADD COLUMN IF NOT EXISTS due_amount NUMERIC(12,2) DEFAULT 0,
          ADD COLUMN IF NOT EXISTS date DATE DEFAULT CURRENT_DATE,
          ADD COLUMN IF NOT EXISTS customer_address TEXT,
          ADD COLUMN IF NOT EXISTS cash_amount NUMERIC(12,2) DEFAULT 0,
          ADD COLUMN IF NOT EXISTS upi_amount NUMERIC(12,2) DEFAULT 0,
          ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(12,2) DEFAULT 0,
          ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'due',
          ADD COLUMN IF NOT EXISTS notes TEXT;
      `);
      console.log("✅ Migration query executed on public.archive_bills!");
    }

    console.log("Reloading PostgREST schema cache...");
    await client.query("NOTIFY pgrst, 'reload schema';");
    console.log("✅ PostgREST schema cache reload request sent!");

  } catch (err) {
    console.error("❌ Migration failed:", err.message);
  } finally {
    await client.end();
  }
}

run();
