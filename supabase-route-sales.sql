-- ============================================================
-- ROYAL KISSAN ERP - DRIVER ROUTE SALES SCHEMA & SEED DATA
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. DROP CONFLICTING VIEW IF EXISTS
-- This view conflicts with the table we need to create below
DROP VIEW IF EXISTS public.customer_dues CASCADE;

-- 2. PRE-CLEANUP: Safe remap and delete duplicate drivers/routes
DO $$
BEGIN
  -- Remap driver_id references in existing tables to prevent foreign key errors
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'sales') THEN
    UPDATE public.sales SET driver_id = 'b097b6a9-8395-4eb8-a720-3057e07662c1'::uuid WHERE driver_id IN (SELECT id FROM public.drivers WHERE name = 'Nagaraju' AND id <> 'b097b6a9-8395-4eb8-a720-3057e07662c1'::uuid);
    UPDATE public.sales SET driver_id = '70c293e7-bae8-4de2-a505-edccfd35f761'::uuid WHERE driver_id IN (SELECT id FROM public.drivers WHERE name = 'Driver-2' AND id <> '70c293e7-bae8-4de2-a505-edccfd35f761'::uuid);
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'bills') THEN
    UPDATE public.bills SET driver_id = 'b097b6a9-8395-4eb8-a720-3057e07662c1'::uuid WHERE driver_id IN (SELECT id FROM public.drivers WHERE name = 'Nagaraju' AND id <> 'b097b6a9-8395-4eb8-a720-3057e07662c1'::uuid);
    UPDATE public.bills SET driver_id = '70c293e7-bae8-4de2-a505-edccfd35f761'::uuid WHERE driver_id IN (SELECT id FROM public.drivers WHERE name = 'Driver-2' AND id <> '70c293e7-bae8-4de2-a505-edccfd35f761'::uuid);
  END IF;

  -- Delete duplicate routes first to prevent driver foreign key deletion constraint issues
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'routes') THEN
    DELETE FROM public.routes WHERE name IN ('Local Route', 'Local Route A', 'Raghavapuram Route', 'Non-Local Highway Route', 'Mukkinavarigudem Route', 'Dammapeta Route') AND id NOT IN ('a1111111-1111-1111-1111-111111111111'::uuid, 'a2222222-2222-2222-2222-222222222222'::uuid, 'a3333333-3333-3333-3333-333333333333'::uuid, 'a4444444-4444-4444-4444-444444444444'::uuid);
  END IF;

  -- Delete non-hardcoded duplicate drivers
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'drivers') THEN
    DELETE FROM public.drivers WHERE name IN ('Nagaraju', 'Driver-2', 'Mallaya') AND id NOT IN ('b097b6a9-8395-4eb8-a720-3057e07662c1'::uuid, '70c293e7-bae8-4de2-a505-edccfd35f761'::uuid);
  END IF;

  -- Delete duplicate employees
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'employees') THEN
    -- Remap referencing tables to keep the oldest employee of the same name
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'drivers') THEN
      WITH employees_kept AS (
        SELECT id, name, ROW_NUMBER() OVER (PARTITION BY name ORDER BY created_at ASC NULLS LAST) AS rn
        FROM public.employees
      ),
      dup_mappings AS (
        SELECT e.id AS old_id, ek.id AS new_id
        FROM public.employees e
        JOIN employees_kept ek ON e.name = ek.name
        WHERE ek.rn = 1 AND e.id <> ek.id
      )
      UPDATE public.drivers d
      SET employee_id = m.new_id
      FROM dup_mappings m
      WHERE d.employee_id = m.old_id;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'attendance') THEN
      WITH employees_kept AS (
        SELECT id, name, ROW_NUMBER() OVER (PARTITION BY name ORDER BY created_at ASC NULLS LAST) AS rn
        FROM public.employees
      ),
      dup_mappings AS (
        SELECT e.id AS old_id, ek.id AS new_id
        FROM public.employees e
        JOIN employees_kept ek ON e.name = ek.name
        WHERE ek.rn = 1 AND e.id <> ek.id
      )
      UPDATE public.attendance a
      SET employee_id = m.new_id
      FROM dup_mappings m
      WHERE a.employee_id = m.old_id;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'salary_payments') THEN
      WITH employees_kept AS (
        SELECT id, name, ROW_NUMBER() OVER (PARTITION BY name ORDER BY created_at ASC NULLS LAST) AS rn
        FROM public.employees
      ),
      dup_mappings AS (
        SELECT e.id AS old_id, ek.id AS new_id
        FROM public.employees e
        JOIN employees_kept ek ON e.name = ek.name
        WHERE ek.rn = 1 AND e.id <> ek.id
      )
      UPDATE public.salary_payments s
      SET employee_id = m.new_id
      FROM dup_mappings m
      WHERE s.employee_id = m.old_id;
    END IF;

    WITH duplicates AS (
      SELECT id, ROW_NUMBER() OVER (PARTITION BY name ORDER BY created_at ASC NULLS LAST) AS rn
      FROM public.employees
    )
    DELETE FROM public.employees
    WHERE id IN (
      SELECT id FROM duplicates WHERE rn > 1
    );
  END IF;
END $$;

-- 3. INSERT DEFAULT DRIVERS (Only Nagaraju and Driver-2 should exist)
INSERT INTO public.drivers (id, employee_id, name, phone, salary, is_active)
SELECT 'b097b6a9-8395-4eb8-a720-3057e07662c1'::uuid, (SELECT id FROM employees WHERE name = 'Nagaraju' LIMIT 1), 'Nagaraju', '8184918757', 12000.00, TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.drivers WHERE id = 'b097b6a9-8395-4eb8-a720-3057e07662c1'::uuid)
UNION ALL
SELECT '70c293e7-bae8-4de2-a505-edccfd35f761'::uuid, (SELECT id FROM employees WHERE name = 'Driver-2' LIMIT 1), 'Driver-2', NULL, 16000.00, TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.drivers WHERE id = '70c293e7-bae8-4de2-a505-edccfd35f761'::uuid);

-- 4. INSERT ROUTES (Assigned to Nagaraju and Driver-2)
INSERT INTO public.routes (id, name, driver_id, area, is_active)
SELECT 'a1111111-1111-1111-1111-111111111111'::uuid, 'Local Route', 'b097b6a9-8395-4eb8-a720-3057e07662c1'::uuid, 'Local Area', TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.routes WHERE id = 'a1111111-1111-1111-1111-111111111111'::uuid)
UNION ALL
SELECT 'a2222222-2222-2222-2222-222222222222'::uuid, 'Raghavapuram Route', '70c293e7-bae8-4de2-a505-edccfd35f761'::uuid, 'Raghavapuram', TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.routes WHERE id = 'a2222222-2222-2222-2222-222222222222'::uuid)
UNION ALL
SELECT 'a3333333-3333-3333-3333-333333333333'::uuid, 'Mukkinavarigudem Route', '70c293e7-bae8-4de2-a505-edccfd35f761'::uuid, 'Mukkinavarigudem', TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.routes WHERE id = 'a3333333-3333-3333-3333-333333333333'::uuid)
UNION ALL
SELECT 'a4444444-4444-4444-4444-444444444444'::uuid, 'Dammapeta Route', '70c293e7-bae8-4de2-a505-edccfd35f761'::uuid, 'Dammapeta', TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.routes WHERE id = 'a4444444-4444-4444-4444-444444444444'::uuid);

-- 4. CREATE NEW TABLES FOR SALES MANAGEMENT

-- Route Customers
CREATE TABLE IF NOT EXISTS public.route_customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  route_id UUID REFERENCES public.routes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  section TEXT NOT NULL CHECK (section IN ('cans', 'bags', 'bottles')),
  default_qty INTEGER DEFAULT 0,
  default_rate NUMERIC(10,2) DEFAULT 0,
  product_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Route Sales
CREATE TABLE IF NOT EXISTS public.route_sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number TEXT UNIQUE NOT NULL,
  driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  route_id UUID REFERENCES public.routes(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  rate NUMERIC(10,2) NOT NULL,
  total_amount NUMERIC(10,2) NOT NULL,
  cash_paid NUMERIC(10,2) DEFAULT 0,
  upi_paid NUMERIC(10,2) DEFAULT 0,
  due_amount NUMERIC(10,2) DEFAULT 0,
  invoice_type TEXT DEFAULT 'driver_sale',
  is_gst BOOLEAN DEFAULT TRUE,
  sale_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Driver Collections
CREATE TABLE IF NOT EXISTS public.driver_collections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id UUID REFERENCES public.drivers(id) ON DELETE CASCADE,
  route_id UUID REFERENCES public.routes(id) ON DELETE CASCADE,
  cash_collected NUMERIC(10,2) DEFAULT 0,
  upi_collected NUMERIC(10,2) DEFAULT 0,
  total_collected NUMERIC(10,2) DEFAULT 0,
  due_outstanding NUMERIC(10,2) DEFAULT 0,
  collection_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(driver_id, route_id, collection_date)
);

-- Customer Dues (Table to persist outstanding dues)
CREATE TABLE IF NOT EXISTS public.customer_dues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_name TEXT NOT NULL,
  route_id UUID REFERENCES public.routes(id) ON DELETE SET NULL,
  driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  due_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  resolved_amount NUMERIC(10,2) DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'resolved')),
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily Reports
CREATE TABLE IF NOT EXISTS public.daily_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_date DATE UNIQUE NOT NULL,
  total_sales NUMERIC(10,2) DEFAULT 0,
  total_cash NUMERIC(10,2) DEFAULT 0,
  total_upi NUMERIC(10,2) DEFAULT 0,
  total_due NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Monthly Reports
CREATE TABLE IF NOT EXISTS public.monthly_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  total_sales NUMERIC(10,2) DEFAULT 0,
  total_cash NUMERIC(10,2) DEFAULT 0,
  total_upi NUMERIC(10,2) DEFAULT 0,
  total_due NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(month, year)
);

-- Driver Performance
CREATE TABLE IF NOT EXISTS public.driver_performance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id UUID REFERENCES public.drivers(id) ON DELETE CASCADE,
  performance_date DATE NOT NULL,
  total_sales NUMERIC(10,2) DEFAULT 0,
  total_collected NUMERIC(10,2) DEFAULT 0,
  total_due NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(driver_id, performance_date)
);

-- Route Performance
CREATE TABLE IF NOT EXISTS public.route_performance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  route_id UUID REFERENCES public.routes(id) ON DELETE CASCADE,
  performance_date DATE NOT NULL,
  total_sales NUMERIC(10,2) DEFAULT 0,
  total_collected NUMERIC(10,2) DEFAULT 0,
  total_due NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(route_id, performance_date)
);

-- 5. ENABLE ROW LEVEL SECURITY (RLS) ON ALL NEW TABLES
ALTER TABLE public.route_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_dues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_performance ENABLE ROW LEVEL SECURITY;

-- 6. CREATE RLS POLICIES FOR NEW TABLES
CREATE POLICY "route_customers_all" ON public.route_customers FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "route_sales_all" ON public.route_sales FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "driver_collections_all" ON public.driver_collections FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "customer_dues_all" ON public.customer_dues FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "daily_reports_all" ON public.daily_reports FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "monthly_reports_all" ON public.monthly_reports FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "driver_perf_all" ON public.driver_performance FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "route_perf_all" ON public.route_performance FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

-- 7. DATABASE TRIGGERS TO AUTO-UPDATE REPORTS & OUTSTANDING DUES ON SALES INSERTS

-- Trigger Function: Update all reports & performance tables
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on route_sales
CREATE OR REPLACE TRIGGER on_route_sale_inserted
  AFTER INSERT ON public.route_sales
  FOR EACH ROW EXECUTE FUNCTION public.sync_route_sales_data();

-- Make customer_name unique in customer_dues to support Upsert easily
ALTER TABLE public.customer_dues ADD CONSTRAINT customer_dues_cust_name_key UNIQUE (customer_name);


-- 8. PRE-SEED ROUTE CUSTOMERS
TRUNCATE TABLE public.route_customers CASCADE;

-- A. LOCAL ROUTE - CANS SECTION
INSERT INTO public.route_customers (route_id, name, section, default_qty, default_rate, product_name) VALUES
  ('a1111111-1111-1111-1111-111111111111'::uuid, 'Bismillah Dhaba', 'cans', 15, 15.00, 'Water Can (20L)'),
  ('a1111111-1111-1111-1111-111111111111'::uuid, 'Vamsi Mess', 'cans', 15, 15.00, 'Water Can (20L)'),
  ('a1111111-1111-1111-1111-111111111111'::uuid, 'Lithu', 'cans', 15, 15.00, 'Water Can (20L)'),
  ('a1111111-1111-1111-1111-111111111111'::uuid, 'Tiffin Center-1', 'cans', 4, 15.00, 'Water Can (20L)'),
  ('a1111111-1111-1111-1111-111111111111'::uuid, 'Tea Stall', 'cans', 5, 15.00, 'Water Can (20L)'),
  ('a1111111-1111-1111-1111-111111111111'::uuid, 'Juices Point', 'cans', 20, 15.00, 'Water Can (20L)'),
  ('a1111111-1111-1111-1111-111111111111'::uuid, 'Surendra Juices Point', 'cans', 20, 20.00, 'Water Can (20L)'),
  -- 15 House Points (Individual entries)
  ('a1111111-1111-1111-1111-111111111111'::uuid, 'House Point 1', 'cans', 1, 30.00, 'Water Can (20L)'),
  ('a1111111-1111-1111-1111-111111111111'::uuid, 'House Point 2', 'cans', 1, 30.00, 'Water Can (20L)'),
  ('a1111111-1111-1111-1111-111111111111'::uuid, 'House Point 3', 'cans', 1, 30.00, 'Water Can (20L)'),
  ('a1111111-1111-1111-1111-111111111111'::uuid, 'House Point 4', 'cans', 1, 30.00, 'Water Can (20L)'),
  ('a1111111-1111-1111-1111-111111111111'::uuid, 'House Point 5', 'cans', 1, 30.00, 'Water Can (20L)'),
  ('a1111111-1111-1111-1111-111111111111'::uuid, 'House Point 6', 'cans', 1, 30.00, 'Water Can (20L)'),
  ('a1111111-1111-1111-1111-111111111111'::uuid, 'House Point 7', 'cans', 1, 30.00, 'Water Can (20L)'),
  ('a1111111-1111-1111-1111-111111111111'::uuid, 'House Point 8', 'cans', 1, 30.00, 'Water Can (20L)'),
  ('a1111111-1111-1111-1111-111111111111'::uuid, 'House Point 9', 'cans', 1, 30.00, 'Water Can (20L)'),
  ('a1111111-1111-1111-1111-111111111111'::uuid, 'House Point 10', 'cans', 1, 30.00, 'Water Can (20L)'),
  ('a1111111-1111-1111-1111-111111111111'::uuid, 'House Point 11', 'cans', 1, 30.00, 'Water Can (20L)'),
  ('a1111111-1111-1111-1111-111111111111'::uuid, 'House Point 12', 'cans', 1, 30.00, 'Water Can (20L)'),
  ('a1111111-1111-1111-1111-111111111111'::uuid, 'House Point 13', 'cans', 1, 30.00, 'Water Can (20L)'),
  ('a1111111-1111-1111-1111-111111111111'::uuid, 'House Point 14', 'cans', 1, 30.00, 'Water Can (20L)'),
  ('a1111111-1111-1111-1111-111111111111'::uuid, 'House Point 15', 'cans', 1, 30.00, 'Water Can (20L)'),
  -- Manual entries (default_qty = 0)
  ('a1111111-1111-1111-1111-111111111111'::uuid, 'State Bank of India', 'cans', 0, 30.00, 'Water Can (20L)'),
  ('a1111111-1111-1111-1111-111111111111'::uuid, 'Fire Station', 'cans', 0, 30.00, 'Water Can (20L)');

-- B. LOCAL ROUTE - BAGS SECTION
INSERT INTO public.route_customers (route_id, name, section, default_qty, default_rate, product_name) VALUES
  ('a1111111-1111-1111-1111-111111111111'::uuid, 'Amaravati Wines', 'bags', 0, 75.00, 'Bags (100 Pack)'),
  ('a1111111-1111-1111-1111-111111111111'::uuid, 'Balaji Wines', 'bags', 0, 80.00, 'Bags (100 Pack)'),
  ('a1111111-1111-1111-1111-111111111111'::uuid, 'Shop-1', 'bags', 0, 100.00, 'Bags (100 Pack)'),
  ('a1111111-1111-1111-1111-111111111111'::uuid, 'Bala Sundari Shop', 'bags', 0, 95.00, 'Bags (100 Pack)'),
  ('a1111111-1111-1111-1111-111111111111'::uuid, 'Shop-2', 'bags', 0, 90.00, 'Bags (100 Pack)'),
  ('a1111111-1111-1111-1111-111111111111'::uuid, 'Shop-3', 'bags', 0, 90.00, 'Bags (100 Pack)'),
  ('a1111111-1111-1111-1111-111111111111'::uuid, 'Shop-4', 'bags', 0, 90.00, 'Bags (100 Pack)'),
  ('a1111111-1111-1111-1111-111111111111'::uuid, 'Route Sale', 'bags', 0, 100.00, 'Bags (100 Pack)');

-- C. LOCAL ROUTE - BOTTLES SECTION
INSERT INTO public.route_customers (route_id, name, section, default_qty, default_rate, product_name) VALUES
  ('a1111111-1111-1111-1111-111111111111'::uuid, 'Healthy Plate', 'bottles', 0, 140.00, '500ml Bottle'),
  ('a1111111-1111-1111-1111-111111111111'::uuid, 'Bismillah Dhaba', 'bottles', 0, 130.00, '1L Bottle'),
  ('a1111111-1111-1111-1111-111111111111'::uuid, 'Bismillah Front Tiffin (1L)', 'bottles', 0, 130.00, '1L Bottle'),
  ('a1111111-1111-1111-1111-111111111111'::uuid, 'Bismillah Front Tiffin (500ml)', 'bottles', 0, 145.00, '500ml Bottle'),
  ('a1111111-1111-1111-1111-111111111111'::uuid, 'Shop-1 (1L)', 'bottles', 0, 130.00, '1L Bottle'),
  ('a1111111-1111-1111-1111-111111111111'::uuid, 'Shop-1 (500ml)', 'bottles', 0, 140.00, '500ml Bottle'),
  ('a1111111-1111-1111-1111-111111111111'::uuid, 'Shop-2 (1L)', 'bottles', 0, 130.00, '1L Bottle'),
  ('a1111111-1111-1111-1111-111111111111'::uuid, 'Shop-2 (500ml)', 'bottles', 0, 140.00, '500ml Bottle'),
  ('a1111111-1111-1111-1111-111111111111'::uuid, 'Shop-3 (1L)', 'bottles', 0, 130.00, '1L Bottle'),
  ('a1111111-1111-1111-1111-111111111111'::uuid, 'Shop-3 (500ml)', 'bottles', 0, 150.00, '500ml Bottle'),
  ('a1111111-1111-1111-1111-111111111111'::uuid, 'Shop-4 (500ml)', 'bottles', 0, 135.00, '500ml Bottle');

-- D. RAGHAVAPURAM ROUTE (NON-LOCAL)
INSERT INTO public.route_customers (route_id, name, section, default_qty, default_rate, product_name) VALUES
  ('a2222222-2222-2222-2222-222222222222'::uuid, 'Raghavapuram Wines', 'bags', 0, 80.00, 'Bags (100 Pack)'),
  ('a2222222-2222-2222-2222-222222222222'::uuid, 'Gandicherla', 'bags', 0, 90.00, 'Bags (100 Pack)'),
  ('a2222222-2222-2222-2222-222222222222'::uuid, 'DN Rao Peta', 'bags', 0, 90.00, 'Bags (100 Pack)'),
  ('a2222222-2222-2222-2222-222222222222'::uuid, 'Route Sale-1', 'bags', 0, 100.00, 'Bags (100 Pack)'),
  ('a2222222-2222-2222-2222-222222222222'::uuid, 'Route Sale-2', 'bags', 0, 90.00, 'Bags (100 Pack)'),
  ('a2222222-2222-2222-2222-222222222222'::uuid, 'Water Can', 'cans', 0, 30.00, 'Water Can (20L)'),
  ('a2222222-2222-2222-2222-222222222222'::uuid, '1L Cases', 'bottles', 0, 120.00, '1L Bottle'),
  ('a2222222-2222-2222-2222-222222222222'::uuid, '500ML Cases', 'bottles', 0, 140.00, '500ml Bottle');

-- E. MUKKINAVARIGUDEM ROUTE (NON-LOCAL)
INSERT INTO public.route_customers (route_id, name, section, default_qty, default_rate, product_name) VALUES
  ('a3333333-3333-3333-3333-333333333333'::uuid, 'Makkinavarigudem Wines', 'bags', 0, 75.00, 'Bags (100 Pack)'),
  ('a3333333-3333-3333-3333-333333333333'::uuid, 'Aunty Shop (Bags)', 'bags', 0, 80.00, 'Bags (100 Pack)'),
  ('a3333333-3333-3333-3333-333333333333'::uuid, 'Wine Shop (Bottles)', 'bottles', 0, 110.00, '500ml Bottle'),
  ('a3333333-3333-3333-3333-333333333333'::uuid, 'Aunty Shop (Bottles)', 'bottles', 0, 120.00, '500ml Bottle');

-- F. DAMMAPETA ROUTE (NON-LOCAL)
INSERT INTO public.route_customers (route_id, name, section, default_qty, default_rate, product_name) VALUES
  ('a4444444-4444-4444-4444-444444444444'::uuid, 'Wine Shop-1', 'bags', 0, 75.00, 'Bags (100 Pack)'),
  ('a4444444-4444-4444-4444-444444444444'::uuid, 'Wine Shop-2', 'bags', 0, 75.00, 'Bags (100 Pack)'),
  ('a4444444-4444-4444-4444-444444444444'::uuid, 'Wine Shop-3', 'bags', 0, 75.00, 'Bags (100 Pack)');
