-- =========================================================================
-- MIGRATION: ADD MISSING BILLING FIELDS TO BILLS & ARCHIVE_BILLS
-- DESCRIPTION: Restores fields used in UI payload to database columns
-- =========================================================================

ALTER TABLE public.bills
  ADD COLUMN IF NOT EXISTS customer_address TEXT,
  ADD COLUMN IF NOT EXISTS cash_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS upi_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'due',
  ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE public.archive_bills
  ADD COLUMN IF NOT EXISTS customer_address TEXT,
  ADD COLUMN IF NOT EXISTS cash_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS upi_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'due',
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
