-- 0. Create daily_reports, monthly_reports, and driver_performance tables
CREATE TABLE IF NOT EXISTS public.daily_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_date DATE UNIQUE NOT NULL,
  total_sales NUMERIC(10,2) DEFAULT 0,
  total_cash NUMERIC(10,2) DEFAULT 0,
  total_upi NUMERIC(10,2) DEFAULT 0,
  total_due NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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

-- 1. Create bills table
CREATE TABLE IF NOT EXISTS public.bills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number TEXT UNIQUE NOT NULL,
  bill_type TEXT NOT NULL CHECK (bill_type IN ('driver_sale', 'company_sale', 'dealer_invoice', 'gst_invoice', 'non_gst_invoice')),
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  dealer_id UUID REFERENCES public.dealers(id) ON DELETE SET NULL,
  driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  route_id UUID REFERENCES public.routes(id) ON DELETE SET NULL,
  subtotal NUMERIC(10,2) DEFAULT 0,
  gst_amount NUMERIC(10,2) DEFAULT 0,
  total_amount NUMERIC(10,2) DEFAULT 0,
  payment_method TEXT DEFAULT 'cash' CHECK (payment_method IN ('cash', 'upi', 'due', 'mixed')),
  due_amount NUMERIC(10,2) DEFAULT 0,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create bill_items table
CREATE TABLE IF NOT EXISTS public.bill_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bill_id UUID REFERENCES public.bills(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  rate NUMERIC(10,2) NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  gst_rate NUMERIC(5,2) DEFAULT 0,
  gst_amount NUMERIC(10,2) DEFAULT 0,
  total NUMERIC(10,2) NOT NULL
);

-- 3. Create non_local_routes table
CREATE TABLE IF NOT EXISTS public.non_local_routes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  route_id UUID REFERENCES public.routes(id) ON DELETE CASCADE,
  vehicle_number TEXT,
  driver_id UUID REFERENCES public.drivers(id),
  trip_date DATE,
  total_sales NUMERIC(10,2) DEFAULT 0,
  total_expenses NUMERIC(10,2) DEFAULT 0,
  due_outstanding NUMERIC(10,2) DEFAULT 0,
  net_collection NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create salary table
CREATE TABLE IF NOT EXISTS public.salary (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES public.employees(id),
  base_salary NUMERIC(10,2) DEFAULT 0,
  advance_deducted NUMERIC(10,2) DEFAULT 0,
  bonus_added NUMERIC(10,2) DEFAULT 0,
  net_paid NUMERIC(10,2) DEFAULT 0,
  payment_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create dealer_sales table
CREATE TABLE IF NOT EXISTS public.dealer_sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bill_id UUID REFERENCES public.bills(id) ON DELETE CASCADE,
  dealer_id UUID REFERENCES public.dealers(id),
  total_amount NUMERIC(10,2) DEFAULT 0,
  paid_amount NUMERIC(10,2) DEFAULT 0,
  due_amount NUMERIC(10,2) DEFAULT 0,
  sale_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Create dealer_ledger table
CREATE TABLE IF NOT EXISTS public.dealer_ledger (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dealer_id UUID REFERENCES public.dealers(id),
  transaction_type TEXT CHECK (transaction_type IN ('invoice', 'payment')),
  amount NUMERIC(10,2) DEFAULT 0,
  reference_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Create driver_sales table
CREATE TABLE IF NOT EXISTS public.driver_sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bill_id UUID REFERENCES public.bills(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES public.drivers(id),
  total_amount NUMERIC(10,2) DEFAULT 0,
  paid_amount NUMERIC(10,2) DEFAULT 0,
  due_amount NUMERIC(10,2) DEFAULT 0,
  sale_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Create route_reports table
CREATE TABLE IF NOT EXISTS public.route_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  route_id UUID REFERENCES public.routes(id),
  report_date DATE,
  total_sales NUMERIC(10,2) DEFAULT 0,
  total_due NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Create Rate Management tables
CREATE TABLE IF NOT EXISTS public.product_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  rate NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.dealer_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dealer_id UUID REFERENCES public.dealers(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  rate NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(dealer_id, product_id)
);

CREATE TABLE IF NOT EXISTS public.route_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  route_id UUID REFERENCES public.routes(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  rate NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(route_id, product_id)
);

-- 10. Enable RLS on all tables
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.non_local_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dealer_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dealer_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dealer_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_performance ENABLE ROW LEVEL SECURITY;

-- 11. Create RLS policies allowing SELECT, INSERT, UPDATE, DELETE
DROP POLICY IF EXISTS "bills_all" ON public.bills;
CREATE POLICY "bills_all" ON public.bills FOR ALL TO authenticated, anon USING (TRUE) WITH CHECK (TRUE);

DROP POLICY IF EXISTS "bill_items_all" ON public.bill_items;
CREATE POLICY "bill_items_all" ON public.bill_items FOR ALL TO authenticated, anon USING (TRUE) WITH CHECK (TRUE);

DROP POLICY IF EXISTS "non_local_routes_all" ON public.non_local_routes;
CREATE POLICY "non_local_routes_all" ON public.non_local_routes FOR ALL TO authenticated, anon USING (TRUE) WITH CHECK (TRUE);

DROP POLICY IF EXISTS "salary_all" ON public.salary;
CREATE POLICY "salary_all" ON public.salary FOR ALL TO authenticated, anon USING (TRUE) WITH CHECK (TRUE);

DROP POLICY IF EXISTS "dealer_sales_all" ON public.dealer_sales;
CREATE POLICY "dealer_sales_all" ON public.dealer_sales FOR ALL TO authenticated, anon USING (TRUE) WITH CHECK (TRUE);

DROP POLICY IF EXISTS "dealer_ledger_all" ON public.dealer_ledger;
CREATE POLICY "dealer_ledger_all" ON public.dealer_ledger FOR ALL TO authenticated, anon USING (TRUE) WITH CHECK (TRUE);

DROP POLICY IF EXISTS "driver_sales_all" ON public.driver_sales;
CREATE POLICY "driver_sales_all" ON public.driver_sales FOR ALL TO authenticated, anon USING (TRUE) WITH CHECK (TRUE);

DROP POLICY IF EXISTS "route_reports_all" ON public.route_reports;
CREATE POLICY "route_reports_all" ON public.route_reports FOR ALL TO authenticated, anon USING (TRUE) WITH CHECK (TRUE);

DROP POLICY IF EXISTS "product_rates_all" ON public.product_rates;
CREATE POLICY "product_rates_all" ON public.product_rates FOR ALL TO authenticated, anon USING (TRUE) WITH CHECK (TRUE);

DROP POLICY IF EXISTS "dealer_rates_all" ON public.dealer_rates;
CREATE POLICY "dealer_rates_all" ON public.dealer_rates FOR ALL TO authenticated, anon USING (TRUE) WITH CHECK (TRUE);

DROP POLICY IF EXISTS "route_rates_all" ON public.route_rates;
CREATE POLICY "route_rates_all" ON public.route_rates FOR ALL TO authenticated, anon USING (TRUE) WITH CHECK (TRUE);

DROP POLICY IF EXISTS "daily_reports_all" ON public.daily_reports;
CREATE POLICY "daily_reports_all" ON public.daily_reports FOR ALL TO authenticated, anon USING (TRUE) WITH CHECK (TRUE);

DROP POLICY IF EXISTS "monthly_reports_all" ON public.monthly_reports;
CREATE POLICY "monthly_reports_all" ON public.monthly_reports FOR ALL TO authenticated, anon USING (TRUE) WITH CHECK (TRUE);

DROP POLICY IF EXISTS "driver_perf_all" ON public.driver_performance;
CREATE POLICY "driver_perf_all" ON public.driver_performance FOR ALL TO authenticated, anon USING (TRUE) WITH CHECK (TRUE);

-- 12. Database trigger for auto updates on bills inserts
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
    total_cash = public.daily_reports.total_cash + EXCLUDED.total_cash,
    total_upi = public.daily_reports.total_upi + EXCLUDED.total_upi,
    total_due = public.daily_reports.total_due + EXCLUDED.total_due;

  -- B. Sync Monthly Reports
  INSERT INTO public.monthly_reports (month, year, total_sales, total_cash, total_upi, total_due)
  VALUES (
    v_month, 
    v_year, 
    NEW.total_amount, 
    CASE WHEN NEW.payment_method = 'cash' THEN v_paid_amount ELSE 0 END,
    CASE WHEN NEW.payment_method = 'upi' THEN v_paid_amount ELSE 0 END,
    NEW.due_amount
  )
  ON CONFLICT (month, year) DO UPDATE SET
    total_sales = public.monthly_reports.total_sales + EXCLUDED.total_sales,
    total_cash = public.monthly_reports.total_cash + EXCLUDED.total_cash,
    total_upi = public.monthly_reports.total_upi + EXCLUDED.total_upi,
    total_due = public.monthly_reports.total_due + EXCLUDED.total_due;

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
    INSERT INTO public.driver_performance (driver_id, performance_date, total_sales, total_collected, total_due)
    VALUES (NEW.driver_id, NEW.date, NEW.total_amount, v_paid_amount, NEW.due_amount)
    ON CONFLICT (driver_id, performance_date) DO UPDATE SET
      total_sales = public.driver_performance.total_sales + EXCLUDED.total_sales,
      total_collected = public.driver_performance.total_collected + EXCLUDED.total_collected,
      total_due = public.driver_performance.total_due + EXCLUDED.total_due;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_bills ON public.bills;
CREATE TRIGGER trg_sync_bills
  AFTER INSERT ON public.bills
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_bills_data();

-- 13. Driver Cleanups (Only keep Nagaraju and Mallaya)
DELETE FROM public.routes WHERE driver_id NOT IN (
  SELECT id FROM public.drivers WHERE name ILIKE '%Nagaraju%' OR name ILIKE '%Mallaya%'
);
DELETE FROM public.drivers WHERE name NOT ILIKE '%Nagaraju%' AND name NOT ILIKE '%Mallaya%';
DELETE FROM public.employees WHERE role = 'driver' AND name NOT ILIKE '%Nagaraju%' AND name NOT ILIKE '%Mallaya%';
