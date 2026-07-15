-- ============================================================
-- ROYAL KISSAN ERP — FUNCTION SEARCH PATH FIXES
-- PHASE 2: Fix all "Function Search Path Mutable" warnings
-- Supabase Security Advisor Target: 0 warnings
--
-- HOW TO RUN: Paste into Supabase SQL Editor
-- URL: https://supabase.com/dashboard/project/oweutcivgpmzldlcmkvd/sql/new
-- ============================================================
-- This fixes every custom function by adding:
--   SECURITY INVOKER (where safe) or SECURITY DEFINER (where required)
--   SET search_path = ''  (pinned empty — Supabase's recommended best practice)
--   Explicit schema prefixes on all internal references
-- ============================================================

-- ============================================================
-- FUNCTION 1: update_updated_at  (used by 5 triggers)
-- Category: Trigger helper — SECURITY INVOKER safe
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


-- ============================================================
-- FUNCTION 2: get_user_role  (used by RLS policies)
-- Category: Auth helper — must remain SECURITY DEFINER
-- Pinned search_path prevents schema injection attacks
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT r.name
  FROM public.user_profiles up
  JOIN public.roles r ON r.id = up.role_id
  WHERE up.id = auth.uid();
$$;

-- Revoke public/anon execute; grant only to authenticated
REVOKE EXECUTE ON FUNCTION public.get_user_role() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_role() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated;


-- ============================================================
-- FUNCTION 3: handle_new_user  (auth trigger — must be SECURITY DEFINER)
-- Called by auth.users INSERT trigger — needs elevated access
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  default_role_id UUID;
  user_role TEXT;
BEGIN
  -- Get role name from metadata, default to 'worker'
  user_role := COALESCE(new.raw_user_meta_data->>'role', 'worker');

  -- Get the role_id from roles table
  SELECT id INTO default_role_id
  FROM public.roles
  WHERE name = user_role
  LIMIT 1;

  -- If role doesn't exist, default to worker role
  IF default_role_id IS NULL THEN
    SELECT id INTO default_role_id
    FROM public.roles
    WHERE name = 'worker'
    LIMIT 1;
  END IF;

  INSERT INTO public.user_profiles (id, full_name, phone, role_id, is_active)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.phone,
    default_role_id,
    TRUE
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN new;
END;
$$;


-- ============================================================
-- FUNCTION 4: sync_bills_data  (trigger — SECURITY DEFINER required)
-- Writes to multiple tables from a trigger context
-- ============================================================
CREATE OR REPLACE FUNCTION public.sync_bills_data()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_month INTEGER;
  v_year INTEGER;
  v_paid_amount NUMERIC(10,2);
BEGIN
  v_month := EXTRACT(MONTH FROM NEW.date);
  v_year := EXTRACT(YEAR FROM NEW.date);
  v_paid_amount := NEW.total_amount - NEW.due_amount;

  -- A. Sync Daily Reports
  INSERT INTO public.daily_reports (report_date, total_sales, total_cash, total_upi, total_due)
  VALUES (
    NEW.date,
    NEW.total_amount,
    CASE WHEN NEW.payment_method = 'cash' THEN v_paid_amount ELSE 0 END,
    CASE WHEN NEW.payment_method = 'upi' THEN v_paid_amount ELSE 0 END,
    NEW.due_amount
  )
  ON CONFLICT (report_date) DO UPDATE SET
    total_sales = public.daily_reports.total_sales + EXCLUDED.total_sales,
    total_cash  = public.daily_reports.total_cash  + EXCLUDED.total_cash,
    total_upi   = public.daily_reports.total_upi   + EXCLUDED.total_upi,
    total_due   = public.daily_reports.total_due   + EXCLUDED.total_due;

  -- B. Sync Monthly Reports
  INSERT INTO public.monthly_reports (month, year, total_sales, total_cash, total_upi, total_due)
  VALUES (
    v_month, v_year,
    NEW.total_amount,
    CASE WHEN NEW.payment_method = 'cash' THEN v_paid_amount ELSE 0 END,
    CASE WHEN NEW.payment_method = 'upi' THEN v_paid_amount ELSE 0 END,
    NEW.due_amount
  )
  ON CONFLICT (month, year) DO UPDATE SET
    total_sales = public.monthly_reports.total_sales + EXCLUDED.total_sales,
    total_cash  = public.monthly_reports.total_cash  + EXCLUDED.total_cash,
    total_upi   = public.monthly_reports.total_upi   + EXCLUDED.total_upi,
    total_due   = public.monthly_reports.total_due   + EXCLUDED.total_due;

  -- C. Dealer Billing Integration
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

  -- D. Driver Billing Integration
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
      total_sales     = public.driver_performance.total_sales     + EXCLUDED.total_sales,
      total_collected = public.driver_performance.total_collected + EXCLUDED.total_collected,
      total_due       = public.driver_performance.total_due       + EXCLUDED.total_due;
  END IF;

  RETURN NEW;
END;
$$;


-- ============================================================
-- FUNCTION 5: sync_route_sales_data  (trigger — SECURITY DEFINER required)
-- ============================================================
CREATE OR REPLACE FUNCTION public.sync_route_sales_data()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_month INTEGER;
  v_year INTEGER;
BEGIN
  v_month := EXTRACT(MONTH FROM NEW.sale_date);
  v_year := EXTRACT(YEAR FROM NEW.sale_date);

  -- A. Sync Daily Report
  UPDATE public.daily_reports
  SET total_sales = total_sales + NEW.total_amount,
      total_cash  = total_cash  + NEW.cash_paid,
      total_upi   = total_upi   + NEW.upi_paid,
      total_due   = total_due   + NEW.due_amount
  WHERE report_date = NEW.sale_date;

  IF NOT FOUND THEN
    BEGIN
      INSERT INTO public.daily_reports (report_date, total_sales, total_cash, total_upi, total_due)
      VALUES (NEW.sale_date, NEW.total_amount, NEW.cash_paid, NEW.upi_paid, NEW.due_amount);
    EXCEPTION WHEN unique_violation THEN
      UPDATE public.daily_reports
      SET total_sales = total_sales + NEW.total_amount,
          total_cash  = total_cash  + NEW.cash_paid,
          total_upi   = total_upi   + NEW.upi_paid,
          total_due   = total_due   + NEW.due_amount
      WHERE report_date = NEW.sale_date;
    END;
  END IF;

  -- B. Sync Monthly Report
  UPDATE public.monthly_reports
  SET total_sales = total_sales + NEW.total_amount,
      total_cash  = total_cash  + NEW.cash_paid,
      total_upi   = total_upi   + NEW.upi_paid,
      total_due   = total_due   + NEW.due_amount
  WHERE month = v_month AND year = v_year;

  IF NOT FOUND THEN
    BEGIN
      INSERT INTO public.monthly_reports (month, year, total_sales, total_cash, total_upi, total_due)
      VALUES (v_month, v_year, NEW.total_amount, NEW.cash_paid, NEW.upi_paid, NEW.due_amount);
    EXCEPTION WHEN unique_violation THEN
      UPDATE public.monthly_reports
      SET total_sales = total_sales + NEW.total_amount,
          total_cash  = total_cash  + NEW.cash_paid,
          total_upi   = total_upi   + NEW.upi_paid,
          total_due   = total_due   + NEW.due_amount
      WHERE month = v_month AND year = v_year;
    END;
  END IF;

  -- C. Sync Driver Performance
  UPDATE public.driver_performance
  SET total_sales     = total_sales     + NEW.total_amount,
      total_collected = total_collected + (NEW.cash_paid + NEW.upi_paid),
      total_due       = total_due       + NEW.due_amount
  WHERE driver_id = NEW.driver_id AND performance_date = NEW.sale_date;

  IF NOT FOUND THEN
    BEGIN
      INSERT INTO public.driver_performance (driver_id, performance_date, total_sales, total_collected, total_due)
      VALUES (NEW.driver_id, NEW.sale_date, NEW.total_amount, (NEW.cash_paid + NEW.upi_paid), NEW.due_amount);
    EXCEPTION WHEN unique_violation THEN
      UPDATE public.driver_performance
      SET total_sales     = total_sales     + NEW.total_amount,
          total_collected = total_collected + (NEW.cash_paid + NEW.upi_paid),
          total_due       = total_due       + NEW.due_amount
      WHERE driver_id = NEW.driver_id AND performance_date = NEW.sale_date;
    END;
  END IF;

  -- D. Sync Route Performance
  UPDATE public.route_performance
  SET total_sales     = total_sales     + NEW.total_amount,
      total_collected = total_collected + (NEW.cash_paid + NEW.upi_paid),
      total_due       = total_due       + NEW.due_amount
  WHERE route_id = NEW.route_id AND performance_date = NEW.sale_date;

  IF NOT FOUND THEN
    BEGIN
      INSERT INTO public.route_performance (route_id, performance_date, total_sales, total_collected, total_due)
      VALUES (NEW.route_id, NEW.sale_date, NEW.total_amount, (NEW.cash_paid + NEW.upi_paid), NEW.due_amount);
    EXCEPTION WHEN unique_violation THEN
      UPDATE public.route_performance
      SET total_sales     = total_sales     + NEW.total_amount,
          total_collected = total_collected + (NEW.cash_paid + NEW.upi_paid),
          total_due       = total_due       + NEW.due_amount
      WHERE route_id = NEW.route_id AND performance_date = NEW.sale_date;
    END;
  END IF;

  -- E. Sync Customer Dues
  IF NEW.due_amount > 0 THEN
    UPDATE public.customer_dues
    SET due_amount   = due_amount + NEW.due_amount,
        status       = 'pending',
        last_updated = NOW(),
        route_id     = NEW.route_id,
        driver_id    = NEW.driver_id
    WHERE customer_name = NEW.customer_name;

    IF NOT FOUND THEN
      BEGIN
        INSERT INTO public.customer_dues (customer_name, route_id, driver_id, due_amount, status, last_updated)
        VALUES (NEW.customer_name, NEW.route_id, NEW.driver_id, NEW.due_amount, 'pending', NOW());
      EXCEPTION WHEN unique_violation THEN
        UPDATE public.customer_dues
        SET due_amount   = due_amount + NEW.due_amount,
            status       = 'pending',
            last_updated = NOW(),
            route_id     = NEW.route_id,
            driver_id    = NEW.driver_id
        WHERE customer_name = NEW.customer_name;
      END;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


-- ============================================================
-- FUNCTION 6: generate_employee_code  (if it exists)
-- ============================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'generate_employee_code' AND pronamespace = 'public'::regnamespace) THEN
    EXECUTE $func$
      CREATE OR REPLACE FUNCTION public.generate_employee_code()
      RETURNS TRIGGER
      LANGUAGE plpgsql
      SECURITY INVOKER
      SET search_path = ''
      AS $inner$
      DECLARE
        v_count INTEGER;
        v_code TEXT;
      BEGIN
        SELECT COUNT(*) INTO v_count FROM public.employees;
        v_code := 'EMP-' || LPAD((v_count + 1)::TEXT, 4, '0');
        NEW.employee_code := v_code;
        RETURN NEW;
      END;
      $inner$
    $func$;
  END IF;
END $$;


-- ============================================================
-- VERIFICATION: List all functions and their search_path setting
-- Run this AFTER applying fixes to confirm 0 mutable paths remain
-- ============================================================
-- SELECT
--   proname AS function_name,
--   prosecdef AS security_definer,
--   proconfig AS config_settings
-- FROM pg_proc
-- WHERE pronamespace = 'public'::regnamespace
--   AND prokind = 'f'
-- ORDER BY proname;
