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
    -- =========================================================================
    -- RESET & RESTORE SYSTEM SQL FUNCTIONS
    -- =========================================================================
    
    CREATE OR REPLACE FUNCTION archive_and_reset_module(p_module TEXT)
    RETURNS BOOLEAN AS $$
    BEGIN
      IF p_module = 'sales' THEN
        -- Archive sales & billing
        INSERT INTO archive_sales SELECT * FROM sales;
        INSERT INTO archive_sale_items SELECT * FROM sale_items;
        DELETE FROM sale_items;
        DELETE FROM sales;
        DELETE FROM route_sales;
        DELETE FROM bills;
        
        -- Insert into audit log
        INSERT INTO audit_logs (action, table_name, description)
        VALUES ('RESET', 'sales', 'Archived and reset Sales & Billing module data');
        
        RETURN TRUE;
      ELSIF p_module = 'payments' THEN
        -- Archive payments & collections
        INSERT INTO archive_payments SELECT * FROM payments;
        DELETE FROM payments;
        DELETE FROM dealer_collections;
        DELETE FROM collections;
        
        -- Insert into audit log
        INSERT INTO audit_logs (action, table_name, description)
        VALUES ('RESET', 'payments', 'Archived and reset Payments & Collections module data');
        
        RETURN TRUE;
      ELSIF p_module = 'expenses' THEN
        -- Archive expenses
        INSERT INTO archive_expenses SELECT * FROM expenses;
        DELETE FROM expenses;
        DELETE FROM route_expenses;
        
        -- Insert into audit log
        INSERT INTO audit_logs (action, table_name, description)
        VALUES ('RESET', 'expenses', 'Archived and reset Expenses module data');
        
        RETURN TRUE;
      ELSIF p_module = 'attendance' THEN
        -- Archive attendance
        INSERT INTO archive_attendance SELECT * FROM attendance;
        DELETE FROM attendance;
        
        -- Insert into audit log
        INSERT INTO audit_logs (action, table_name, description)
        VALUES ('RESET', 'attendance', 'Archived and reset Attendance module data');
        
        RETURN TRUE;
      ELSE
        RAISE EXCEPTION 'Invalid module name: %', p_module;
      END IF;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

    CREATE OR REPLACE FUNCTION restore_archived_module(p_module TEXT)
    RETURNS BOOLEAN AS $$
    BEGIN
      IF p_module = 'sales' THEN
        -- Restore sales & billing
        INSERT INTO sales SELECT * FROM archive_sales ON CONFLICT DO NOTHING;
        INSERT INTO sale_items SELECT * FROM archive_sale_items ON CONFLICT DO NOTHING;
        DELETE FROM archive_sales;
        DELETE FROM archive_sale_items;
        
        -- Insert into audit log
        INSERT INTO audit_logs (action, table_name, description)
        VALUES ('RESTORE', 'sales', 'Restored Sales & Billing module data from archive');
        
        RETURN TRUE;
      ELSIF p_module = 'payments' THEN
        -- Restore payments & collections
        INSERT INTO payments SELECT * FROM archive_payments ON CONFLICT DO NOTHING;
        DELETE FROM archive_payments;
        
        -- Insert into audit log
        INSERT INTO audit_logs (action, table_name, description)
        VALUES ('RESTORE', 'payments', 'Restored Payments & Collections module data from archive');
        
        RETURN TRUE;
      ELSIF p_module = 'expenses' THEN
        -- Restore expenses
        INSERT INTO expenses SELECT * FROM archive_expenses ON CONFLICT DO NOTHING;
        DELETE FROM archive_expenses;
        
        -- Insert into audit log
        INSERT INTO audit_logs (action, table_name, description)
        VALUES ('RESTORE', 'expenses', 'Restored Expenses module data from archive');
        
        RETURN TRUE;
      ELSIF p_module = 'attendance' THEN
        -- Restore attendance
        INSERT INTO attendance SELECT * FROM archive_attendance ON CONFLICT DO NOTHING;
        DELETE FROM archive_attendance;
        
        -- Insert into audit log
        INSERT INTO audit_logs (action, table_name, description)
        VALUES ('RESTORE', 'attendance', 'Restored Attendance module data from archive');
        
        RETURN TRUE;
      ELSE
        RAISE EXCEPTION 'Invalid module name: %', p_module;
      END IF;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
  `;

  try {
    console.log("Connecting to database to deploy reset functions...");
    await client.connect();
    console.log("✅ Connected successfully!");
    
    await client.query(sql);
    console.log("✅ deployed reset & restore database functions successfully!");
  } catch (err) {
    console.error("❌ Failed to deploy functions:", err.message);
  } finally {
    await client.end();
  }
}

run();
