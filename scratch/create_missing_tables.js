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
    -- Create Dealer collections
    CREATE TABLE IF NOT EXISTS public.dealer_collections (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      dealer_id UUID REFERENCES public.dealers(id) ON DELETE CASCADE,
      amount NUMERIC(12,2) NOT NULL DEFAULT 0,
      payment_mode TEXT DEFAULT 'cash' CHECK (payment_mode IN ('cash','upi')),
      notes TEXT,
      collected_date DATE NOT NULL DEFAULT CURRENT_DATE,
      collected_by TEXT DEFAULT 'Admin',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Create Customer ledger
    CREATE TABLE IF NOT EXISTS public.customer_ledger (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      customer_name TEXT NOT NULL,
      transaction_type TEXT NOT NULL CHECK (transaction_type IN ('bill','payment','adjustment')),
      bill_id UUID REFERENCES public.bills(id) ON DELETE SET NULL,
      debit NUMERIC(12,2) DEFAULT 0,
      credit NUMERIC(12,2) DEFAULT 0,
      balance NUMERIC(12,2) DEFAULT 0,
      description TEXT,
      transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Ensure dealers outstanding columns are present
    ALTER TABLE public.dealers
      ADD COLUMN IF NOT EXISTS outstanding_amount NUMERIC(12,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS total_sales NUMERIC(12,2) DEFAULT 0;

    -- Enable RLS on new tables
    ALTER TABLE public.dealer_collections ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.customer_ledger ENABLE ROW LEVEL SECURITY;

    -- Re-create policies for dealer_collections
    DROP POLICY IF EXISTS dealer_collections_select ON public.dealer_collections;
    DROP POLICY IF EXISTS dealer_collections_insert ON public.dealer_collections;
    DROP POLICY IF EXISTS dealer_collections_update ON public.dealer_collections;
    DROP POLICY IF EXISTS dealer_collections_delete ON public.dealer_collections;

    CREATE POLICY dealer_collections_select ON public.dealer_collections FOR SELECT TO authenticated USING (TRUE);
    CREATE POLICY dealer_collections_insert ON public.dealer_collections FOR INSERT TO authenticated WITH CHECK (TRUE);
    CREATE POLICY dealer_collections_update ON public.dealer_collections FOR UPDATE TO authenticated USING (get_user_role() = 'admin');
    CREATE POLICY dealer_collections_delete ON public.dealer_collections FOR DELETE TO authenticated USING (get_user_role() = 'admin');

    -- Re-create policies for customer_ledger
    DROP POLICY IF EXISTS customer_ledger_select ON public.customer_ledger;
    DROP POLICY IF EXISTS customer_ledger_insert ON public.customer_ledger;
    DROP POLICY IF EXISTS customer_ledger_update ON public.customer_ledger;
    DROP POLICY IF EXISTS customer_ledger_delete ON public.customer_ledger;

    CREATE POLICY customer_ledger_select ON public.customer_ledger FOR SELECT TO authenticated USING (TRUE);
    CREATE POLICY customer_ledger_insert ON public.customer_ledger FOR INSERT TO authenticated WITH CHECK (TRUE);
    CREATE POLICY customer_ledger_update ON public.customer_ledger FOR UPDATE TO authenticated USING (get_user_role() = 'admin');
    CREATE POLICY customer_ledger_delete ON public.customer_ledger FOR DELETE TO authenticated USING (get_user_role() = 'admin');

    -- Create/Replace trigger functions
    CREATE OR REPLACE FUNCTION public.sync_dealer_collections_data()
    RETURNS TRIGGER AS $$
    BEGIN
      -- 1. Update outstanding_amount in dealers (reduce outstanding balance by collected amount)
      UPDATE public.dealers 
      SET outstanding_amount = GREATEST(0, COALESCE(outstanding_amount, 0) - NEW.amount)
      WHERE id = NEW.dealer_id;

      -- 2. Update dealer_ledger
      INSERT INTO public.dealer_ledger (dealer_id, transaction_type, amount, reference_id)
      VALUES (NEW.dealer_id, 'payment', NEW.amount, NEW.id);

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql 
    SECURITY DEFINER 
    SET search_path = public;

    -- Attach dealer collections trigger
    DROP TRIGGER IF EXISTS trg_sync_dealer_collections ON public.dealer_collections;
    CREATE TRIGGER trg_sync_dealer_collections
      AFTER INSERT ON public.dealer_collections
      FOR EACH ROW
      EXECUTE FUNCTION public.sync_dealer_collections_data();
  `;

  try {
    console.log("Connecting to database to create missing tables...");
    await client.connect();
    console.log("✅ Connected successfully!");
    
    await client.query(sql);
    console.log("✅ Deployed missing tables and triggers successfully!");
  } catch (err) {
    console.error("❌ Failed to deploy missing tables:", err.message);
  } finally {
    await client.end();
  }
}

run();
