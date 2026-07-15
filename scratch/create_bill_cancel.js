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
    -- CREATE ARCHIVE TABLES FOR BILLS & ITEMS
    -- =========================================================================
    CREATE TABLE IF NOT EXISTS archive_bills (LIKE bills INCLUDING ALL);
    CREATE TABLE IF NOT EXISTS archive_bill_items (LIKE bill_items INCLUDING ALL);

    -- =========================================================================
    -- CANCEL & ARCHIVE BILL DATABASE FUNCTION
    -- =========================================================================
    CREATE OR REPLACE FUNCTION cancel_and_archive_bill(p_bill_id UUID)
    RETURNS BOOLEAN AS $$
    DECLARE
      v_bill public.bills%ROWTYPE;
    BEGIN
      -- 1. Fetch the bill
      SELECT * INTO v_bill FROM public.bills WHERE id = p_bill_id;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Bill not found';
      END IF;
      
      -- 2. Copy to archive_bills & archive_bill_items
      INSERT INTO archive_bills SELECT * FROM public.bills WHERE id = p_bill_id ON CONFLICT (id) DO NOTHING;
      INSERT INTO archive_bill_items SELECT * FROM public.bill_items WHERE bill_id = p_bill_id ON CONFLICT (id) DO NOTHING;
      
      -- 3. Adjust dealer outstanding if it was a dealer invoice
      IF v_bill.bill_type = 'dealer_invoice' AND v_bill.dealer_id IS NOT NULL THEN
        UPDATE public.dealers 
        SET outstanding_amount = GREATEST(0, COALESCE(outstanding_amount, 0) - v_bill.due_amount),
            total_sales = GREATEST(0, COALESCE(total_sales, 0) - v_bill.total_amount)
        WHERE id = v_bill.dealer_id;
      END IF;
      
      -- 4. Revert stock values
      UPDATE public.stock s
      SET current_quantity = s.current_quantity + bi.quantity
      FROM public.bill_items bi
      WHERE bi.bill_id = p_bill_id AND s.product_id = bi.product_id;
      
      -- 5. Delete from customer_ledger
      DELETE FROM public.customer_ledger WHERE bill_id = p_bill_id;
      
      -- 6. Delete from main bills table (will cascade delete bill_items)
      DELETE FROM public.bills WHERE id = p_bill_id;
      
      -- 7. Add audit log
      INSERT INTO public.audit_logs (action, table_name, description)
      VALUES ('CANCEL_BILL', 'bills', 'Cancelled and archived Bill ID ' || p_bill_id || ', Invoice #' || v_bill.invoice_number);
      
      RETURN TRUE;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
  `;

  try {
    console.log("Connecting to database to deploy bill cancel system...");
    await client.connect();
    console.log("✅ Connected successfully!");
    
    await client.query(sql);
    console.log("✅ Deployed bill cancellation functions successfully!");
  } catch (err) {
    console.error("❌ Failed to deploy functions:", err.message);
  } finally {
    await client.end();
  }
}

run();
