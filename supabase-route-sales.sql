-- ============================================================
-- ROYAL KISSAN ERP - DRIVER ROUTE SALES SCHEMA & SEED DATA
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. CLEAN UP EXISTING DRIVERS & ROUTES IF NEEDED
-- (Be careful: this clears existing data to match the "only 2 default drivers" requirement)
DELETE FROM public.routes;
DELETE FROM public.drivers;

-- 2. INSERT DEFAULT DRIVERS
INSERT INTO public.drivers (id, name, phone, salary, is_active) VALUES
  ('b097b6a9-8395-4eb8-a720-3057e07662c1', 'Nagaraju', '8184918757', 12000.00, TRUE),
  ('c097b6a9-8395-4eb8-a720-3057e07662c2', 'Mallaya', NULL, 16000.00, TRUE)
ON CONFLICT (id) DO NOTHING;

-- 3. INSERT ROUTES
INSERT INTO public.routes (id, name, driver_id, area, is_active) VALUES
  ('a1111111-1111-1111-1111-111111111111', 'Local Route', 'b097b6a9-8395-4eb8-a720-3057e07662c1', 'Local Area', TRUE),
  ('a2222222-2222-2222-2222-222222222222', 'Raghavapuram Route', 'c097b6a9-8395-4eb8-a720-3057e07662c2', 'Raghavapuram', TRUE),
  ('a3333333-3333-3333-3333-333333333333', 'Mukkinavarigudem Route', 'c097b6a9-8395-4eb8-a720-3057e07662c2', 'Mukkinavarigudem', TRUE),
  ('a4444444-4444-4444-4444-444444444444', 'Dammapeta Route', 'c097b6a9-8395-4eb8-a720-3057e07662c2', 'Dammapeta', TRUE)
ON CONFLICT (id) DO NOTHING;

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
  INSERT INTO public.daily_reports (report_date, total_sales, total_cash, total_upi, total_due)
  VALUES (NEW.sale_date, NEW.total_amount, NEW.cash_paid, NEW.upi_paid, NEW.due_amount)
  ON CONFLICT (report_date) DO UPDATE SET
    total_sales = public.daily_reports.total_sales + EXCLUDED.total_sales,
    total_cash = public.daily_reports.total_cash + EXCLUDED.total_cash,
    total_upi = public.daily_reports.total_upi + EXCLUDED.total_upi,
    total_due = public.daily_reports.total_due + EXCLUDED.total_due;

  -- B. Sync Monthly Report
  INSERT INTO public.monthly_reports (month, year, total_sales, total_cash, total_upi, total_due)
  VALUES (v_month, v_year, NEW.total_amount, NEW.cash_paid, NEW.upi_paid, NEW.due_amount)
  ON CONFLICT (month, year) DO UPDATE SET
    total_sales = public.monthly_reports.total_sales + EXCLUDED.total_sales,
    total_cash = public.monthly_reports.total_cash + EXCLUDED.total_cash,
    total_upi = public.monthly_reports.total_upi + EXCLUDED.total_upi,
    total_due = public.monthly_reports.total_due + EXCLUDED.total_due;

  -- C. Sync Driver Performance
  INSERT INTO public.driver_performance (driver_id, performance_date, total_sales, total_collected, total_due)
  VALUES (NEW.driver_id, NEW.sale_date, NEW.total_amount, (NEW.cash_paid + NEW.upi_paid), NEW.due_amount)
  ON CONFLICT (driver_id, performance_date) DO UPDATE SET
    total_sales = public.driver_performance.total_sales + EXCLUDED.total_sales,
    total_collected = public.driver_performance.total_collected + EXCLUDED.total_collected,
    total_due = public.driver_performance.total_due + EXCLUDED.total_due;

  -- D. Sync Route Performance
  INSERT INTO public.route_performance (route_id, performance_date, total_sales, total_collected, total_due)
  VALUES (NEW.route_id, NEW.sale_date, NEW.total_amount, (NEW.cash_paid + NEW.upi_paid), NEW.due_amount)
  ON CONFLICT (route_id, performance_date) DO UPDATE SET
    total_sales = public.route_performance.total_sales + EXCLUDED.total_sales,
    total_collected = public.route_performance.total_collected + EXCLUDED.total_collected,
    total_due = public.route_performance.total_due + EXCLUDED.total_due;

  -- E. Sync Customer Dues
  IF NEW.due_amount > 0 THEN
    INSERT INTO public.customer_dues (customer_name, route_id, driver_id, due_amount, status, last_updated)
    VALUES (NEW.customer_name, NEW.route_id, NEW.driver_id, NEW.due_amount, 'pending', NOW())
    ON CONFLICT (customer_name) DO UPDATE SET
      due_amount = public.customer_dues.due_amount + EXCLUDED.due_amount,
      status = 'pending',
      last_updated = NOW();
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

-- A. LOCAL ROUTE - CANS SECTION
INSERT INTO public.route_customers (route_id, name, section, default_qty, default_rate, product_name) VALUES
  ('a1111111-1111-1111-1111-111111111111', 'Bismillah Dhaba', 'cans', 15, 15.00, 'Water Can (20L)'),
  ('a1111111-1111-1111-1111-111111111111', 'Vamsi Mess', 'cans', 15, 15.00, 'Water Can (20L)'),
  ('a1111111-1111-1111-1111-111111111111', 'Lithu', 'cans', 15, 15.00, 'Water Can (20L)'),
  ('a1111111-1111-1111-1111-111111111111', 'Tiffin Center-1', 'cans', 4, 15.00, 'Water Can (20L)'),
  ('a1111111-1111-1111-1111-111111111111', 'Tea Stall', 'cans', 5, 15.00, 'Water Can (20L)'),
  ('a1111111-1111-1111-1111-111111111111', 'Juices Point', 'cans', 20, 15.00, 'Water Can (20L)'),
  ('a1111111-1111-1111-1111-111111111111', 'Surendra Juices Point', 'cans', 20, 20.00, 'Water Can (20L)'),
  -- 15 House Points (Individual entries)
  ('a1111111-1111-1111-1111-111111111111', 'House Point 1', 'cans', 1, 30.00, 'Water Can (20L)'),
  ('a1111111-1111-1111-1111-111111111111', 'House Point 2', 'cans', 1, 30.00, 'Water Can (20L)'),
  ('a1111111-1111-1111-1111-111111111111', 'House Point 3', 'cans', 1, 30.00, 'Water Can (20L)'),
  ('a1111111-1111-1111-1111-111111111111', 'House Point 4', 'cans', 1, 30.00, 'Water Can (20L)'),
  ('a1111111-1111-1111-1111-111111111111', 'House Point 5', 'cans', 1, 30.00, 'Water Can (20L)'),
  ('a1111111-1111-1111-1111-111111111111', 'House Point 6', 'cans', 1, 30.00, 'Water Can (20L)'),
  ('a1111111-1111-1111-1111-111111111111', 'House Point 7', 'cans', 1, 30.00, 'Water Can (20L)'),
  ('a1111111-1111-1111-1111-111111111111', 'House Point 8', 'cans', 1, 30.00, 'Water Can (20L)'),
  ('a1111111-1111-1111-1111-111111111111', 'House Point 9', 'cans', 1, 30.00, 'Water Can (20L)'),
  ('a1111111-1111-1111-1111-111111111111', 'House Point 10', 'cans', 1, 30.00, 'Water Can (20L)'),
  ('a1111111-1111-1111-1111-111111111111', 'House Point 11', 'cans', 1, 30.00, 'Water Can (20L)'),
  ('a1111111-1111-1111-1111-111111111111', 'House Point 12', 'cans', 1, 30.00, 'Water Can (20L)'),
  ('a1111111-1111-1111-1111-111111111111', 'House Point 13', 'cans', 1, 30.00, 'Water Can (20L)'),
  ('a1111111-1111-1111-1111-111111111111', 'House Point 14', 'cans', 1, 30.00, 'Water Can (20L)'),
  ('a1111111-1111-1111-1111-111111111111', 'House Point 15', 'cans', 1, 30.00, 'Water Can (20L)'),
  -- Manual entries (default_qty = 0)
  ('a1111111-1111-1111-1111-111111111111', 'State Bank of India', 'cans', 0, 30.00, 'Water Can (20L)'),
  ('a1111111-1111-1111-1111-111111111111', 'Fire Station', 'cans', 0, 30.00, 'Water Can (20L)');

-- B. LOCAL ROUTE - BAGS SECTION
INSERT INTO public.route_customers (route_id, name, section, default_qty, default_rate, product_name) VALUES
  ('a1111111-1111-1111-1111-111111111111', 'Amaravati Wines', 'bags', 0, 75.00, 'Bags (100 Pack)'),
  ('a1111111-1111-1111-1111-111111111111', 'Balaji Wines', 'bags', 0, 80.00, 'Bags (100 Pack)'),
  ('a1111111-1111-1111-1111-111111111111', 'Shop-1', 'bags', 0, 100.00, 'Bags (100 Pack)'),
  ('a1111111-1111-1111-1111-111111111111', 'Bala Sundari Shop', 'bags', 0, 95.00, 'Bags (100 Pack)'),
  ('a1111111-1111-1111-1111-111111111111', 'Shop-2', 'bags', 0, 90.00, 'Bags (100 Pack)'),
  ('a1111111-1111-1111-1111-111111111111', 'Shop-3', 'bags', 0, 90.00, 'Bags (100 Pack)'),
  ('a1111111-1111-1111-1111-111111111111', 'Shop-4', 'bags', 0, 90.00, 'Bags (100 Pack)'),
  ('a1111111-1111-1111-1111-111111111111', 'Route Sale', 'bags', 0, 100.00, 'Bags (100 Pack)');

-- C. LOCAL ROUTE - BOTTLES SECTION
INSERT INTO public.route_customers (route_id, name, section, default_qty, default_rate, product_name) VALUES
  ('a1111111-1111-1111-1111-111111111111', 'Healthy Plate', 'bottles', 0, 140.00, '500ml Bottle'),
  ('a1111111-1111-1111-1111-111111111111', 'Bismillah Dhaba', 'bottles', 0, 130.00, '1L Bottle'),
  ('a1111111-1111-1111-1111-111111111111', 'Bismillah Front Tiffin (1L)', 'bottles', 0, 130.00, '1L Bottle'),
  ('a1111111-1111-1111-1111-111111111111', 'Bismillah Front Tiffin (500ml)', 'bottles', 0, 145.00, '500ml Bottle'),
  ('a1111111-1111-1111-1111-111111111111', 'Shop-1 (1L)', 'bottles', 0, 130.00, '1L Bottle'),
  ('a1111111-1111-1111-1111-111111111111', 'Shop-1 (500ml)', 'bottles', 0, 140.00, '500ml Bottle'),
  ('a1111111-1111-1111-1111-111111111111', 'Shop-2 (1L)', 'bottles', 0, 130.00, '1L Bottle'),
  ('a1111111-1111-1111-1111-111111111111', 'Shop-2 (500ml)', 'bottles', 0, 140.00, '500ml Bottle'),
  ('a1111111-1111-1111-1111-111111111111', 'Shop-3 (1L)', 'bottles', 0, 130.00, '1L Bottle'),
  ('a1111111-1111-1111-1111-111111111111', 'Shop-3 (500ml)', 'bottles', 0, 150.00, '500ml Bottle'),
  ('a1111111-1111-1111-1111-111111111111', 'Shop-4 (500ml)', 'bottles', 0, 135.00, '500ml Bottle');

-- D. RAGHAVAPURAM ROUTE (NON-LOCAL)
INSERT INTO public.route_customers (route_id, name, section, default_qty, default_rate, product_name) VALUES
  ('a2222222-2222-2222-2222-222222222222', 'Raghavapuram Wines', 'bags', 0, 80.00, 'Bags (100 Pack)'),
  ('a2222222-2222-2222-2222-222222222222', 'Gandicherla', 'bags', 0, 90.00, 'Bags (100 Pack)'),
  ('a2222222-2222-2222-2222-222222222222', 'DN Rao Peta', 'bags', 0, 90.00, 'Bags (100 Pack)'),
  ('a2222222-2222-2222-2222-222222222222', 'Route Sale-1', 'bags', 0, 100.00, 'Bags (100 Pack)'),
  ('a2222222-2222-2222-2222-222222222222', 'Route Sale-2', 'bags', 0, 90.00, 'Bags (100 Pack)'),
  ('a2222222-2222-2222-2222-222222222222', 'Water Can', 'cans', 0, 30.00, 'Water Can (20L)'),
  ('a2222222-2222-2222-2222-222222222222', '1L Cases', 'bottles', 0, 120.00, '1L Bottle'),
  ('a2222222-2222-2222-2222-222222222222', '500ML Cases', 'bottles', 0, 140.00, '500ml Bottle');

-- E. MUKKINAVARIGUDEM ROUTE (NON-LOCAL)
INSERT INTO public.route_customers (route_id, name, section, default_qty, default_rate, product_name) VALUES
  ('a3333333-3333-3333-3333-333333333333', 'Makkinavarigudem Wines', 'bags', 0, 75.00, 'Bags (100 Pack)'),
  ('a3333333-3333-3333-3333-333333333333', 'Aunty Shop (Bags)', 'bags', 0, 80.00, 'Bags (100 Pack)'),
  ('a3333333-3333-3333-3333-333333333333', 'Wine Shop (Bottles)', 'bottles', 0, 110.00, '500ml Bottle'),
  ('a3333333-3333-3333-3333-333333333333', 'Aunty Shop (Bottles)', 'bottles', 0, 120.00, '500ml Bottle');

-- F. DAMMAPETA ROUTE (NON-LOCAL)
INSERT INTO public.route_customers (route_id, name, section, default_qty, default_rate, product_name) VALUES
  ('a4444444-4444-4444-4444-444444444444', 'Wine Shop-1', 'bags', 0, 75.00, 'Bags (100 Pack)'),
  ('a4444444-4444-4444-4444-444444444444', 'Wine Shop-2', 'bags', 0, 75.00, 'Bags (100 Pack)'),
  ('a4444444-4444-4444-4444-444444444444', 'Wine Shop-3', 'bags', 0, 75.00, 'Bags (100 Pack)');
