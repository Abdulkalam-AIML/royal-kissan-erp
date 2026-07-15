-- ============================================================
-- ROYAL KISSAN ERP — BILLING FIX MIGRATION
-- Adds missing columns to bills table and fixes sync trigger
-- Safe to run multiple times (IF NOT EXISTS / OR REPLACE)
-- ============================================================

-- 1. Add missing columns to bills table
ALTER TABLE public.bills
  ADD COLUMN IF NOT EXISTS cash_amount      NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS upi_amount       NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paid_amount      NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS customer_address TEXT,
  ADD COLUMN IF NOT EXISTS payment_status   TEXT DEFAULT 'due'
    CHECK (payment_status IN ('paid', 'partial', 'due'));

-- 2. Backfill paid_amount for any existing rows (total - due)
UPDATE public.bills
SET paid_amount = GREATEST(0, total_amount - due_amount)
WHERE paid_amount IS NULL OR paid_amount = 0;

-- 3. Replace the sync trigger to use real paid_amount, cash_amount, upi_amount
CREATE OR REPLACE FUNCTION public.sync_bills_data()
RETURNS TRIGGER AS $$
DECLARE
  v_month       INTEGER;
  v_year        INTEGER;
  v_paid_amount NUMERIC(10,2);
  v_cash        NUMERIC(10,2);
  v_upi         NUMERIC(10,2);
BEGIN
  v_month       := EXTRACT(MONTH FROM NEW.date);
  v_year        := EXTRACT(YEAR FROM NEW.date);
  v_paid_amount := COALESCE(NEW.paid_amount, NEW.total_amount - NEW.due_amount, 0);
  v_cash        := COALESCE(NEW.cash_amount, 0);
  v_upi         := COALESCE(NEW.upi_amount, 0);

  -- ── A. Daily Reports ──────────────────────────────────────
  INSERT INTO public.daily_reports (report_date, total_sales, total_cash, total_upi, total_due)
  VALUES (NEW.date, NEW.total_amount, v_cash, v_upi, NEW.due_amount)
  ON CONFLICT (report_date) DO UPDATE SET
    total_sales = public.daily_reports.total_sales + EXCLUDED.total_sales,
    total_cash  = public.daily_reports.total_cash  + EXCLUDED.total_cash,
    total_upi   = public.daily_reports.total_upi   + EXCLUDED.total_upi,
    total_due   = public.daily_reports.total_due   + EXCLUDED.total_due;

  -- ── B. Monthly Reports ────────────────────────────────────
  INSERT INTO public.monthly_reports (month, year, total_sales, total_cash, total_upi, total_due)
  VALUES (v_month, v_year, NEW.total_amount, v_cash, v_upi, NEW.due_amount)
  ON CONFLICT (month, year) DO UPDATE SET
    total_sales = public.monthly_reports.total_sales + EXCLUDED.total_sales,
    total_cash  = public.monthly_reports.total_cash  + EXCLUDED.total_cash,
    total_upi   = public.monthly_reports.total_upi   + EXCLUDED.total_upi,
    total_due   = public.monthly_reports.total_due   + EXCLUDED.total_due;

  -- ── C. Dealer Invoice Integration ────────────────────────
  IF NEW.bill_type = 'dealer_invoice' AND NEW.dealer_id IS NOT NULL THEN
    INSERT INTO public.dealer_sales (bill_id, dealer_id, total_amount, paid_amount, due_amount, sale_date)
    VALUES (NEW.id, NEW.dealer_id, NEW.total_amount, v_paid_amount, NEW.due_amount, NEW.date);

    INSERT INTO public.dealer_ledger (dealer_id, transaction_type, amount, reference_id)
    VALUES (NEW.dealer_id, 'invoice', NEW.total_amount, NEW.id);

    IF v_paid_amount > 0 THEN
      INSERT INTO public.dealer_ledger (dealer_id, transaction_type, amount, reference_id)
      VALUES (NEW.dealer_id, 'payment', v_paid_amount, NEW.id);
    END IF;

    UPDATE public.dealers
    SET outstanding_amount = COALESCE(outstanding_amount, 0) + NEW.due_amount
    WHERE id = NEW.dealer_id;
  END IF;

  -- ── D. Driver Sale Integration ────────────────────────────
  IF NEW.bill_type = 'driver_sale' AND NEW.driver_id IS NOT NULL THEN
    INSERT INTO public.driver_sales (bill_id, driver_id, total_amount, paid_amount, due_amount, sale_date)
    VALUES (NEW.id, NEW.driver_id, NEW.total_amount, v_paid_amount, NEW.due_amount, NEW.date);

    IF NEW.route_id IS NOT NULL THEN
      INSERT INTO public.route_reports (route_id, report_date, total_sales, total_due)
      VALUES (NEW.route_id, NEW.date, NEW.total_amount, NEW.due_amount);
    END IF;

    INSERT INTO public.driver_performance (driver_id, performance_date, total_sales, total_collected, total_due)
    VALUES (NEW.driver_id, NEW.date, NEW.total_amount, v_paid_amount, NEW.due_amount)
    ON CONFLICT (driver_id, performance_date) DO UPDATE SET
      total_sales      = public.driver_performance.total_sales      + EXCLUDED.total_sales,
      total_collected  = public.driver_performance.total_collected  + EXCLUDED.total_collected,
      total_due        = public.driver_performance.total_due        + EXCLUDED.total_due;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger (DROP first in case function signature changed)
DROP TRIGGER IF EXISTS trg_sync_bills ON public.bills;
CREATE TRIGGER trg_sync_bills
  AFTER INSERT ON public.bills
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_bills_data();

-- 4. Ensure RLS policies are permissive for authenticated users
-- Drop old narrow policies and replace with open ones
DROP POLICY IF EXISTS "bills_all"       ON public.bills;
DROP POLICY IF EXISTS "bill_items_all"  ON public.bill_items;

-- Allow all operations for authenticated users (billing staff)
CREATE POLICY "bills_all"
  ON public.bills
  FOR ALL
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "bill_items_all"
  ON public.bill_items
  FOR ALL
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

-- 5. Ensure customer_ledger table exists (used by billing page)
CREATE TABLE IF NOT EXISTS public.customer_ledger (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_name    TEXT NOT NULL,
  transaction_type TEXT,
  bill_id          UUID REFERENCES public.bills(id) ON DELETE CASCADE,
  debit            NUMERIC(10,2) DEFAULT 0,
  credit           NUMERIC(10,2) DEFAULT 0,
  balance          NUMERIC(10,2) DEFAULT 0,
  description      TEXT,
  transaction_date DATE DEFAULT CURRENT_DATE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.customer_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customer_ledger_all" ON public.customer_ledger;
CREATE POLICY "customer_ledger_all"
  ON public.customer_ledger
  FOR ALL
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

-- 6. Ensure route_sales table exists (used by driver_sale billing)
CREATE TABLE IF NOT EXISTS public.route_sales (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number  TEXT,
  driver_id       UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  route_id        UUID REFERENCES public.routes(id) ON DELETE SET NULL,
  customer_name   TEXT,
  product_name    TEXT,
  quantity        INTEGER DEFAULT 0,
  rate            NUMERIC(10,2) DEFAULT 0,
  total_amount    NUMERIC(10,2) DEFAULT 0,
  cash_paid       NUMERIC(10,2) DEFAULT 0,
  upi_paid        NUMERIC(10,2) DEFAULT 0,
  due_amount      NUMERIC(10,2) DEFAULT 0,
  payment_status  TEXT DEFAULT 'due',
  sale_date       DATE DEFAULT CURRENT_DATE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.route_sales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "route_sales_all" ON public.route_sales;
CREATE POLICY "route_sales_all"
  ON public.route_sales
  FOR ALL
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

-- 7. Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- ── VERIFICATION QUERY ─────────────────────────────────────
-- Run this after migration to confirm columns exist:
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'bills'
-- ORDER BY ordinal_position;
