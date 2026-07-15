-- ============================================================
-- ROYAL KISSAN ERP - DATABASE SECURITY HARDENING SQL
-- Run this in your Supabase SQL Editor (https://supabase.com)
-- ============================================================

-- ------------------------------------------------------------
-- TASK 1: FIX SECURITY DEFINER VIEWS
-- Rebuild views with explicit "security_invoker = true"
-- ------------------------------------------------------------

-- 1. stock_status view
DROP VIEW IF EXISTS public.stock_status;
CREATE OR REPLACE VIEW public.stock_status 
WITH (security_invoker = true) AS
SELECT
  p.id,
  p.name,
  p.category,
  COALESCE(s.current_quantity, 0) AS current_quantity,
  p.low_stock_threshold,
  CASE WHEN COALESCE(s.current_quantity, 0) <= p.low_stock_threshold THEN TRUE ELSE FALSE END AS is_low_stock
FROM public.products p
LEFT JOIN public.stock s ON s.product_id = p.id
WHERE p.is_active = TRUE;

-- 2. customer_dues view (Dropped to prevent namespace collision with route dues table)
DROP VIEW IF EXISTS public.customer_dues CASCADE;


-- 3. daily_sales_summary view
DROP VIEW IF EXISTS public.daily_sales_summary;
CREATE OR REPLACE VIEW public.daily_sales_summary 
WITH (security_invoker = true) AS
SELECT
  sale_date,
  COUNT(*) AS total_bills,
  SUM(total_amount) AS total_sales,
  SUM(paid_amount) AS total_collected,
  SUM(due_amount) AS total_due
FROM public.sales
GROUP BY sale_date
ORDER BY sale_date DESC;


-- ------------------------------------------------------------
-- TASK 2 & 3: FIX MUTABLE SEARCH PATH & SECURE PUBLIC FUNCTIONS
-- ------------------------------------------------------------

-- 1. update_updated_at helper function
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql 
SECURITY INVOKER 
SET search_path = public;

-- 2. get_user_role helper function
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT r.name FROM public.user_profiles up
  JOIN public.roles r ON r.id = up.role_id
  WHERE up.id = auth.uid()
$$ LANGUAGE SQL 
SECURITY DEFINER 
SET search_path = public;

-- Revoke direct execute privileges on get_user_role from PUBLIC and anon
REVOKE EXECUTE ON FUNCTION public.get_user_role() FROM PUBLIC, anon, authenticated;
-- Grant execute strictly to authenticated users (needed for RLS checks)
GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated;

-- 3. sync_bills_data trigger function
CREATE OR REPLACE FUNCTION public.sync_bills_data()
RETURNS TRIGGER AS $$
DECLARE
  v_month INTEGER;
  v_year INTEGER;
  v_paid_amount NUMERIC(10,2);
BEGIN
  v_month := EXTRACT(MONTH FROM NEW.date);
  v_year := EXTRACT(YEAR FROM NEW.date);
  v_paid_amount := NEW.total_amount - NEW.due_amount;

  -- A. Sync Daily Reports
  UPDATE public.daily_reports
  SET total_sales = total_sales + NEW.total_amount,
      total_cash = total_cash + CASE WHEN NEW.payment_method = 'cash' THEN v_paid_amount ELSE 0 END,
      total_upi = total_upi + CASE WHEN NEW.payment_method = 'upi' THEN v_paid_amount ELSE 0 END,
      total_due = total_due + NEW.due_amount
  WHERE report_date = NEW.date;

  IF NOT FOUND THEN
    BEGIN
      INSERT INTO public.daily_reports (report_date, total_sales, total_cash, total_upi, total_due)
      VALUES (
        NEW.date, 
        NEW.total_amount, 
        CASE WHEN NEW.payment_method = 'cash' THEN v_paid_amount ELSE 0 END,
        CASE WHEN NEW.payment_method = 'upi' THEN v_paid_amount ELSE 0 END,
        NEW.due_amount
      );
    EXCEPTION WHEN unique_violation THEN
      UPDATE public.daily_reports
      SET total_sales = total_sales + NEW.total_amount,
          total_cash = total_cash + CASE WHEN NEW.payment_method = 'cash' THEN v_paid_amount ELSE 0 END,
          total_upi = total_upi + CASE WHEN NEW.payment_method = 'upi' THEN v_paid_amount ELSE 0 END,
          total_due = total_due + NEW.due_amount
      WHERE report_date = NEW.date;
    END;
  END IF;

  -- B. Sync Monthly Reports
  UPDATE public.monthly_reports
  SET total_sales = total_sales + NEW.total_amount,
      total_cash = total_cash + CASE WHEN NEW.payment_method = 'cash' THEN v_paid_amount ELSE 0 END,
      total_upi = total_upi + CASE WHEN NEW.payment_method = 'upi' THEN v_paid_amount ELSE 0 END,
      total_due = total_due + NEW.due_amount
  WHERE month = v_month AND year = v_year;

  IF NOT FOUND THEN
    BEGIN
      INSERT INTO public.monthly_reports (month, year, total_sales, total_cash, total_upi, total_due)
      VALUES (
        v_month, 
        v_year, 
        NEW.total_amount, 
        CASE WHEN NEW.payment_method = 'cash' THEN v_paid_amount ELSE 0 END,
        CASE WHEN NEW.payment_method = 'upi' THEN v_paid_amount ELSE 0 END,
        NEW.due_amount
      );
    EXCEPTION WHEN unique_violation THEN
      UPDATE public.monthly_reports
      SET total_sales = total_sales + NEW.total_amount,
          total_cash = total_cash + CASE WHEN NEW.payment_method = 'cash' THEN v_paid_amount ELSE 0 END,
          total_upi = total_upi + CASE WHEN NEW.payment_method = 'upi' THEN v_paid_amount ELSE 0 END,
          total_due = total_due + NEW.due_amount
      WHERE month = v_month AND year = v_year;
    END;
  END IF;

  -- C. Dealer Billing Integration
  IF NEW.bill_type = 'dealer_invoice' AND NEW.dealer_id IS NOT NULL THEN
    -- Update dealer_sales
    INSERT INTO public.dealer_sales (bill_id, dealer_id, total_amount, paid_amount, due_amount, sale_date)
    VALUES (NEW.id, NEW.dealer_id, NEW.total_amount, v_paid_amount, NEW.due_amount, NEW.date);

    -- Update dealer_ledger
    INSERT INTO public.dealer_ledger (dealer_id, transaction_type, amount, reference_id)
    VALUES (NEW.dealer_id, 'invoice', NEW.total_amount, NEW.id);

    IF v_paid_amount > 0 THEN
      INSERT INTO public.dealer_ledger (dealer_id, transaction_type, amount, reference_id)
      VALUES (NEW.dealer_id, 'payment', v_paid_amount, NEW.id);
    END IF;

    -- Update outstanding_amount in dealers
    UPDATE public.dealers 
    SET outstanding_amount = COALESCE(outstanding_amount, 0) + NEW.due_amount
    WHERE id = NEW.dealer_id;
  END IF;

  -- D. Driver Billing Integration
  IF NEW.bill_type = 'driver_sale' AND NEW.driver_id IS NOT NULL THEN
    -- Update driver_sales
    INSERT INTO public.driver_sales (bill_id, driver_id, total_amount, paid_amount, due_amount, sale_date)
    VALUES (NEW.id, NEW.driver_id, NEW.total_amount, v_paid_amount, NEW.due_amount, NEW.date);

    -- Update route_reports
    IF NEW.route_id IS NOT NULL THEN
      INSERT INTO public.route_reports (route_id, report_date, total_sales, total_due)
      VALUES (NEW.route_id, NEW.date, NEW.total_amount, NEW.due_amount);
    END IF;

    -- Update driver_performance
    UPDATE public.driver_performance
    SET total_sales = total_sales + NEW.total_amount,
        total_collected = total_collected + v_paid_amount,
        total_due = total_due + NEW.due_amount
    WHERE driver_id = NEW.driver_id AND performance_date = NEW.date;

    IF NOT FOUND THEN
      BEGIN
        INSERT INTO public.driver_performance (driver_id, performance_date, total_sales, total_collected, total_due)
        VALUES (NEW.driver_id, NEW.date, NEW.total_amount, v_paid_amount, NEW.due_amount);
      EXCEPTION WHEN unique_violation THEN
        UPDATE public.driver_performance
        SET total_sales = total_sales + NEW.total_amount,
            total_collected = total_collected + v_paid_amount,
            total_due = total_due + NEW.due_amount
        WHERE driver_id = NEW.driver_id AND performance_date = NEW.date;
      END;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public;

-- 4. sync_route_sales_data trigger function
CREATE OR REPLACE FUNCTION public.sync_route_sales_data()
RETURNS TRIGGER AS $$
DECLARE
  v_month INTEGER;
  v_year INTEGER;
BEGIN
  v_month := EXTRACT(MONTH FROM NEW.sale_date);
  v_year := EXTRACT(YEAR FROM NEW.sale_date);

  -- A. Sync Daily Report
  UPDATE public.daily_reports
  SET total_sales = total_sales + NEW.total_amount,
      total_cash = total_cash + NEW.cash_paid,
      total_upi = total_upi + NEW.upi_paid,
      total_due = total_due + NEW.due_amount
  WHERE report_date = NEW.sale_date;

  IF NOT FOUND THEN
    BEGIN
      INSERT INTO public.daily_reports (report_date, total_sales, total_cash, total_upi, total_due)
      VALUES (NEW.sale_date, NEW.total_amount, NEW.cash_paid, NEW.upi_paid, NEW.due_amount);
    EXCEPTION WHEN unique_violation THEN
      UPDATE public.daily_reports
      SET total_sales = total_sales + NEW.total_amount,
          total_cash = total_cash + NEW.cash_paid,
          total_upi = total_upi + NEW.upi_paid,
          total_due = total_due + NEW.due_amount
      WHERE report_date = NEW.sale_date;
    END;
  END IF;

  -- B. Sync Monthly Report
  UPDATE public.monthly_reports
  SET total_sales = total_sales + NEW.total_amount,
      total_cash = total_cash + NEW.cash_paid,
      total_upi = total_upi + NEW.upi_paid,
      total_due = total_due + NEW.due_amount
  WHERE month = v_month AND year = v_year;

  IF NOT FOUND THEN
    BEGIN
      INSERT INTO public.monthly_reports (month, year, total_sales, total_cash, total_upi, total_due)
      VALUES (v_month, v_year, NEW.total_amount, NEW.cash_paid, NEW.upi_paid, NEW.due_amount);
    EXCEPTION WHEN unique_violation THEN
      UPDATE public.monthly_reports
      SET total_sales = total_sales + NEW.total_amount,
          total_cash = total_cash + NEW.cash_paid,
          total_upi = total_upi + NEW.upi_paid,
          total_due = total_due + NEW.due_amount
      WHERE month = v_month AND year = v_year;
    END;
  END IF;

  -- C. Sync Driver Performance
  UPDATE public.driver_performance
  SET total_sales = total_sales + NEW.total_amount,
      total_collected = total_collected + (NEW.cash_paid + NEW.upi_paid),
      total_due = total_due + NEW.due_amount
  WHERE driver_id = NEW.driver_id AND performance_date = NEW.sale_date;

  IF NOT FOUND THEN
    BEGIN
      INSERT INTO public.driver_performance (driver_id, performance_date, total_sales, total_collected, total_due)
      VALUES (NEW.driver_id, NEW.sale_date, NEW.total_amount, (NEW.cash_paid + NEW.upi_paid), NEW.due_amount);
    EXCEPTION WHEN unique_violation THEN
      UPDATE public.driver_performance
      SET total_sales = total_sales + NEW.total_amount,
          total_collected = total_collected + (NEW.cash_paid + NEW.upi_paid),
          total_due = total_due + NEW.due_amount
      WHERE driver_id = NEW.driver_id AND performance_date = NEW.sale_date;
    END;
  END IF;

  -- D. Sync Route Performance
  UPDATE public.route_performance
  SET total_sales = total_sales + NEW.total_amount,
      total_collected = total_collected + (NEW.cash_paid + NEW.upi_paid),
      total_due = total_due + NEW.due_amount
  WHERE route_id = NEW.route_id AND performance_date = NEW.sale_date;

  IF NOT FOUND THEN
    BEGIN
      INSERT INTO public.route_performance (route_id, performance_date, total_sales, total_collected, total_due)
      VALUES (NEW.route_id, NEW.sale_date, NEW.total_amount, (NEW.cash_paid + NEW.upi_paid), NEW.due_amount);
    EXCEPTION WHEN unique_violation THEN
      UPDATE public.route_performance
      SET total_sales = total_sales + NEW.total_amount,
          total_collected = total_collected + (NEW.cash_paid + NEW.upi_paid),
          total_due = total_due + NEW.due_amount
      WHERE route_id = NEW.route_id AND performance_date = NEW.sale_date;
    END;
  END IF;

  -- E. Sync Customer Dues
  IF NEW.due_amount > 0 THEN
    UPDATE public.customer_dues
    SET due_amount = due_amount + NEW.due_amount,
        status = 'pending',
        last_updated = NOW(),
        route_id = NEW.route_id,
        driver_id = NEW.driver_id
    WHERE customer_name = NEW.customer_name;

    IF NOT FOUND THEN
      BEGIN
        INSERT INTO public.customer_dues (customer_name, route_id, driver_id, due_amount, status, last_updated)
        VALUES (NEW.customer_name, NEW.route_id, NEW.driver_id, NEW.due_amount, 'pending', NOW());
      EXCEPTION WHEN unique_violation THEN
        UPDATE public.customer_dues
        SET due_amount = due_amount + NEW.due_amount,
            status = 'pending',
            last_updated = NOW(),
            route_id = NEW.route_id,
            driver_id = NEW.driver_id
        WHERE customer_name = NEW.customer_name;
      END;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public;

-- 5. Revoke execution privileges from public/anon/authenticated on internal helper functions
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'rls_auto_enable') THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated';
  END IF;
END $$;


-- ------------------------------------------------------------
-- TASK 4: GRANULAR RLS POLICY AUDIT & HARDENING
-- Revoke anon access. Restrict DELETE to admins. Allow staff SELECT/INSERT/UPDATE.
-- ------------------------------------------------------------

-- Define helper MACRO/procedure to apply granular RLS to multiple tables
DO $$
DECLARE
  v_table RECORD;
  v_tables TEXT[] := ARRAY[
    'bills', 'bill_items', 'sales', 'sale_items', 'customers', 'dealers', 
    'expenses', 'attendance', 'drivers', 'routes', 'route_stops', 
    'route_customers', 'route_sales', 'driver_collections', 'driver_sales', 
    'route_reports', 'daily_reports', 'monthly_reports', 'driver_performance', 
    'route_performance', 'stock', 'stock_items', 'stock_transactions', 
    'raw_materials', 'payments', 'collections', 'dealer_products', 'dealer_sales', 'dealer_ledger', 'customer_dues'
  ];
  v_tbl TEXT;
BEGIN
  FOREACH v_tbl IN ARRAY v_tables LOOP
    -- Only apply if table exists
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = v_tbl) THEN
      -- Enable RLS
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', v_tbl);

      -- Drop any wildcard all-inclusive policies to avoid lax access
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', v_tbl || '_all', v_tbl);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'bills_all', v_tbl);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'bill_items_all', v_tbl);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'driver_sales_all', v_tbl);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'route_reports_all', v_tbl);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'daily_reports_all', v_tbl);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'monthly_reports_all', v_tbl);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'driver_perf_all', v_tbl);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'route_perf_all', v_tbl);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'customers_all', v_tbl);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'dealers_all', v_tbl);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'expenses_write', v_tbl);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'attendance_all', v_tbl);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'drivers_all', v_tbl);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'routes_all', v_tbl);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'route_stops_all', v_tbl);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'stock_write', v_tbl);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'stock_tx_all', v_tbl);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'raw_materials_all', v_tbl);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'payments_all', v_tbl);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'collections_all', v_tbl);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'dealer_products_all', v_tbl);

      -- Re-create separate granular policies restricted to authenticated users
      
      -- SELECT: All staff and admin
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', v_tbl || '_select', v_tbl);
      EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (TRUE)', v_tbl || '_select', v_tbl);

      -- INSERT: All staff and admin
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', v_tbl || '_insert', v_tbl);
      EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (TRUE)', v_tbl || '_insert', v_tbl);

      -- UPDATE: All staff and admin
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', v_tbl || '_update', v_tbl);
      EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (TRUE) WITH CHECK (TRUE)', v_tbl || '_update', v_tbl);

      -- DELETE: ONLY Admin
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', v_tbl || '_delete', v_tbl);
      EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (public.get_user_role() = %L)', v_tbl || '_delete', v_tbl, 'admin');
    END IF;
  END LOOP;
END $$;


-- ------------------------------------------------------------
-- SPECIAL ADMIN-ONLY TABLES (WRITE operations restricted to Admin)
-- ------------------------------------------------------------

-- 1. employees
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "employees_select" ON public.employees;
DROP POLICY IF EXISTS "employees_write" ON public.employees;
CREATE POLICY "employees_select" ON public.employees FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "employees_insert" ON public.employees FOR INSERT TO authenticated WITH CHECK (public.get_user_role() = 'admin');
CREATE POLICY "employees_update" ON public.employees FOR UPDATE TO authenticated USING (public.get_user_role() = 'admin');
CREATE POLICY "employees_delete" ON public.employees FOR DELETE TO authenticated USING (public.get_user_role() = 'admin');

-- 2. salary_payments (often mapped as salary in some modules)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'salary_payments') THEN
    ALTER TABLE public.salary_payments ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "salary_select" ON public.salary_payments;
    DROP POLICY IF EXISTS "salary_write" ON public.salary_payments;
    EXECUTE 'CREATE POLICY salary_select ON public.salary_payments FOR SELECT TO authenticated USING (TRUE)';
    EXECUTE 'CREATE POLICY salary_insert ON public.salary_payments FOR INSERT TO authenticated WITH CHECK (public.get_user_role() = ''admin'')';
    EXECUTE 'CREATE POLICY salary_update ON public.salary_payments FOR UPDATE TO authenticated USING (public.get_user_role() = ''admin'')';
    EXECUTE 'CREATE POLICY salary_delete ON public.salary_payments FOR DELETE TO authenticated USING (public.get_user_role() = ''admin'')';
  END IF;
END $$;

-- 3. settings
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "settings_select" ON public.settings;
DROP POLICY IF EXISTS "settings_write" ON public.settings;
CREATE POLICY "settings_select" ON public.settings FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "settings_insert" ON public.settings FOR INSERT TO authenticated WITH CHECK (public.get_user_role() = 'admin');
CREATE POLICY "settings_update" ON public.settings FOR UPDATE TO authenticated USING (public.get_user_role() = 'admin');
CREATE POLICY "settings_delete" ON public.settings FOR DELETE TO authenticated USING (public.get_user_role() = 'admin');

-- 4. user_profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_profiles_select" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_write" ON public.user_profiles;
CREATE POLICY "user_profiles_select" ON public.user_profiles FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "user_profiles_insert" ON public.user_profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid() OR public.get_user_role() = 'admin');
CREATE POLICY "user_profiles_update" ON public.user_profiles FOR UPDATE TO authenticated USING (id = auth.uid() OR public.get_user_role() = 'admin');
CREATE POLICY "user_profiles_delete" ON public.user_profiles FOR DELETE TO authenticated USING (public.get_user_role() = 'admin');

-- 5. audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audit_logs_select" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert" ON public.audit_logs;
CREATE POLICY "audit_logs_select" ON public.audit_logs FOR SELECT TO authenticated USING (public.get_user_role() = 'admin');
CREATE POLICY "audit_logs_insert" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (TRUE);
