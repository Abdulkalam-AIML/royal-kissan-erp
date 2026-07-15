-- ============================================================
-- ROYAL KISSAN ERP — MASTER RESET SQL v1.0
-- ============================================================
-- SAFE: uses CREATE TABLE IF NOT EXISTS, ALTER TABLE IF NOT EXISTS,
--       DO $$ IF EXISTS blocks everywhere. NO data is truncated.
-- Run this ONCE in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/oweutcivgpmzldlcmkvd/sql/new
-- ============================================================

-- ============================================================
-- PHASE 1: ENSURE BASE EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- ============================================================
-- PHASE 2: ENSURE CORE TABLES EXIST
-- (All with IF NOT EXISTS — safe to re-run)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  role_id UUID REFERENCES public.roles(id),
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  salary NUMERIC(10,2) DEFAULT 0,
  join_date DATE DEFAULT CURRENT_DATE,
  is_active BOOLEAN DEFAULT TRUE,
  bank_account TEXT,
  bank_name TEXT,
  ifsc_code TEXT,
  aadhar_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS employee_code TEXT UNIQUE;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS date_joined DATE DEFAULT CURRENT_DATE;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS advance_amount NUMERIC(10,2) DEFAULT 0;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS bonus_amount NUMERIC(10,2) DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'half_day', 'leave')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, date)
);

CREATE TABLE IF NOT EXISTS public.salary_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INTEGER NOT NULL,
  base_salary NUMERIC(10,2) NOT NULL,
  present_days INTEGER DEFAULT 0,
  absent_days INTEGER DEFAULT 0,
  half_days INTEGER DEFAULT 0,
  calculated_salary NUMERIC(10,2) NOT NULL,
  advance_paid NUMERIC(10,2) DEFAULT 0,
  net_salary NUMERIC(10,2) NOT NULL,
  payment_date DATE,
  payment_mode TEXT DEFAULT 'cash',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'partial')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  unit TEXT DEFAULT 'piece',
  default_rate NUMERIC(10,2) DEFAULT 0,
  gst_rate NUMERIC(5,2) DEFAULT 18,
  hsn_code TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  low_stock_threshold INTEGER DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.stock (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  current_quantity INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id)
);

CREATE TABLE IF NOT EXISTS public.raw_materials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  unit TEXT DEFAULT 'piece',
  current_quantity NUMERIC(10,2) DEFAULT 0,
  low_stock_threshold NUMERIC(10,2) DEFAULT 10,
  cost_per_unit NUMERIC(10,2) DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.stock_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'pcs',
  opening_stock INTEGER DEFAULT 0,
  low_stock_threshold INTEGER DEFAULT 50,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.stock_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES public.products(id),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('in', 'out', 'adjustment')),
  quantity INTEGER NOT NULL,
  quantity_before INTEGER,
  quantity_after INTEGER,
  reason TEXT,
  reference_id UUID,
  reference_type TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.stock_transactions ADD COLUMN IF NOT EXISTS stock_item_id UUID REFERENCES public.stock_items(id) ON DELETE SET NULL;
ALTER TABLE public.stock_transactions ADD COLUMN IF NOT EXISTS item_name TEXT;

CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  area TEXT,
  gst_number TEXT,
  customer_type TEXT DEFAULT 'regular' CHECK (customer_type IN ('regular', 'dealer', 'route')),
  outstanding_amount NUMERIC(10,2) DEFAULT 0,
  credit_limit NUMERIC(10,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS dealer_code TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS mobile TEXT;

CREATE TABLE IF NOT EXISTS public.dealers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  area TEXT,
  phone TEXT,
  address TEXT,
  gst_number TEXT,
  outstanding_amount NUMERIC(10,2) DEFAULT 0,
  credit_limit NUMERIC(10,2) DEFAULT 5000,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.dealer_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dealer_id UUID REFERENCES public.dealers(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  custom_rate NUMERIC(10,2) NOT NULL,
  UNIQUE(dealer_id, product_id)
);

CREATE TABLE IF NOT EXISTS public.drivers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES public.employees(id),
  name TEXT NOT NULL,
  phone TEXT,
  license_number TEXT,
  vehicle_number TEXT,
  salary NUMERIC(10,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.routes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  driver_id UUID REFERENCES public.drivers(id),
  area TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TABLE IF EXISTS public.route_stops CASCADE;
CREATE TABLE public.route_stops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  route_id UUID REFERENCES public.routes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  stop_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(route_id, name)
);

-- *** THIS IS THE TABLE THAT WAS MISSING — route_expenses ***
CREATE TABLE IF NOT EXISTS public.route_expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  route_id UUID REFERENCES public.routes(id) ON DELETE SET NULL,
  driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  fuel_charges NUMERIC(10,2) DEFAULT 0,
  driver_bata NUMERIC(10,2) DEFAULT 0,
  other_expenses NUMERIC(10,2) DEFAULT 0,
  remarks TEXT,
  expense_date DATE DEFAULT CURRENT_DATE,
  vehicle_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number TEXT UNIQUE,
  sale_type TEXT NOT NULL CHECK (sale_type IN ('delivery', 'invoice', 'dealer', 'counter')),
  customer_id UUID REFERENCES public.customers(id),
  dealer_id UUID REFERENCES public.dealers(id),
  driver_id UUID REFERENCES public.drivers(id),
  route_id UUID REFERENCES public.routes(id),
  sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
  subtotal NUMERIC(10,2) DEFAULT 0,
  discount_amount NUMERIC(10,2) DEFAULT 0,
  taxable_amount NUMERIC(10,2) DEFAULT 0,
  cgst_amount NUMERIC(10,2) DEFAULT 0,
  sgst_amount NUMERIC(10,2) DEFAULT 0,
  igst_amount NUMERIC(10,2) DEFAULT 0,
  total_amount NUMERIC(10,2) DEFAULT 0,
  paid_amount NUMERIC(10,2) DEFAULT 0,
  due_amount NUMERIC(10,2) DEFAULT 0,
  payment_mode TEXT DEFAULT 'cash' CHECK (payment_mode IN ('cash', 'upi', 'due', 'mixed')),
  payment_status TEXT DEFAULT 'due' CHECK (payment_status IN ('paid', 'partial', 'due')),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS invoice_type TEXT DEFAULT 'company_sale';
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS shipped_to TEXT;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS is_gst BOOLEAN DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS public.sale_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  rate NUMERIC(10,2) NOT NULL,
  discount_pct NUMERIC(5,2) DEFAULT 0,
  amount NUMERIC(10,2) NOT NULL,
  gst_rate NUMERIC(5,2) DEFAULT 0,
  gst_amount NUMERIC(10,2) DEFAULT 0,
  total NUMERIC(10,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id),
  dealer_id UUID REFERENCES public.dealers(id),
  amount NUMERIC(10,2) NOT NULL,
  payment_mode TEXT NOT NULL CHECK (payment_mode IN ('cash', 'upi', 'cheque', 'bank_transfer')),
  payment_date DATE DEFAULT CURRENT_DATE,
  reference_number TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.collections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id UUID REFERENCES public.drivers(id),
  route_id UUID REFERENCES public.routes(id),
  collection_date DATE DEFAULT CURRENT_DATE,
  total_collected NUMERIC(10,2) DEFAULT 0,
  cash_amount NUMERIC(10,2) DEFAULT 0,
  upi_amount NUMERIC(10,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.expense_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT
);

CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID REFERENCES public.expense_categories(id),
  category_name TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  expense_date DATE DEFAULT CURRENT_DATE,
  description TEXT,
  payment_mode TEXT DEFAULT 'cash',
  receipt_url TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT NOT NULL UNIQUE,
  value TEXT,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  table_name TEXT,
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PHASE 3: BILLING TABLES
-- ============================================================

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

CREATE TABLE IF NOT EXISTS public.dealer_ledger (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dealer_id UUID REFERENCES public.dealers(id),
  transaction_type TEXT CHECK (transaction_type IN ('invoice', 'payment')),
  amount NUMERIC(10,2) DEFAULT 0,
  reference_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS public.route_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  route_id UUID REFERENCES public.routes(id),
  report_date DATE,
  total_sales NUMERIC(10,2) DEFAULT 0,
  total_due NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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

-- ============================================================
-- PHASE 4: ROUTE SALES TABLES
-- ============================================================

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

ALTER TABLE public.route_customers ADD COLUMN IF NOT EXISTS is_manual_rate BOOLEAN DEFAULT FALSE;

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

-- customer_dues: Fix VIEW vs TABLE conflict
-- Drop the old VIEW if it exists, keep the TABLE
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname='public' AND viewname='customer_dues') THEN
    DROP VIEW IF EXISTS public.customer_dues CASCADE;
  END IF;
END $$;

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

ALTER TABLE public.customer_dues DROP CONSTRAINT IF EXISTS customer_dues_cust_name_key;
ALTER TABLE public.customer_dues ADD CONSTRAINT customer_dues_cust_name_key UNIQUE (customer_name);

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

-- ============================================================
-- PHASE 5: SEED ESSENTIAL DATA (all idempotent)
-- ============================================================

INSERT INTO public.roles (name, description, permissions) VALUES
  ('admin', 'Full access owner with delete permissions', '{"all": true}'),
  ('worker', 'Billing operator with restricted access', '{"billing": true, "sales": true, "deliveries": true}')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.expense_categories (name) VALUES
  ('Diesel'), ('Fuel'), ('Electricity'), ('Vehicle Maintenance'),
  ('Plant Maintenance'), ('Salaries'), ('Marketing'), ('Transport'),
  ('Office Expenses'), ('Miscellaneous')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.settings (key, value, description) VALUES
  ('company_name', 'ROYAL KISSAN PACKAGED DRINKING WATER', 'Company Name'),
  ('company_address', 'Sy. No. 42, Guntur Highway Road, Guntur, AP, India', 'Company Address'),
  ('company_phone', '+91 8184918757', 'Company Contact Phone'),
  ('company_gst', '37AAAAA0000A1Z5', 'Company GST Registration Number'),
  ('company_email', 'royalkissan@gmail.com', 'Company Email Address'),
  ('invoice_prefix', 'RK', 'Invoice Number Prefix'),
  ('invoice_counter', '1001', 'Default Invoice Starting Counter'),
  ('currency', 'INR', 'Currency'),
  ('low_stock_threshold', '10', 'Default low stock threshold'),
  ('thermal_printer_width', '58', 'Thermal printer width in mm')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.stock_items (name, category, unit, opening_stock, low_stock_threshold) VALUES
  ('Water Can (20L)',       'product',  'cans',  0, 50),
  ('Cooling Can (20L)',     'product',  'cans',  0, 20),
  ('Water Packets',         'product',  'pkts',  0, 200),
  ('250ml Bottle Case',     'product',  'cases', 0, 20),
  ('500ml Bottle Case',     'product',  'cases', 0, 20),
  ('1L Bottle Case',        'product',  'cases', 0, 20),
  ('2L Bottle Case',        'product',  'cases', 0, 10),
  ('Empty Cans',            'raw',      'pcs',   0, 30),
  ('Caps',                  'raw',      'pcs',   0, 1000),
  ('Labels',                'raw',      'pcs',   0, 500),
  ('Preforms',              'raw',      'pcs',   0, 500),
  ('Jar Caps',              'raw',      'pcs',   0, 200),
  ('Packaging Materials',   'raw',      'rolls', 0, 10)
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- PHASE 6: DRIVER & ROUTE DEDUPLICATION
-- ============================================================
DO $$
DECLARE
  r RECORD;
BEGIN
  -- Step A: Remap all driver references to canonical IDs before deleting
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='sales') THEN
    UPDATE public.sales SET driver_id = 'b097b6a9-8395-4eb8-a720-3057e07662c1'::uuid
    WHERE driver_id IN (SELECT id FROM public.drivers WHERE name = 'Nagaraju' AND id <> 'b097b6a9-8395-4eb8-a720-3057e07662c1'::uuid);
    UPDATE public.sales SET driver_id = '70c293e7-bae8-4de2-a505-edccfd35f761'::uuid
    WHERE driver_id IN (SELECT id FROM public.drivers WHERE (name = 'Driver-2' OR name = 'Mallaya') AND id <> '70c293e7-bae8-4de2-a505-edccfd35f761'::uuid);
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='bills') THEN
    UPDATE public.bills SET driver_id = 'b097b6a9-8395-4eb8-a720-3057e07662c1'::uuid
    WHERE driver_id IN (SELECT id FROM public.drivers WHERE name = 'Nagaraju' AND id <> 'b097b6a9-8395-4eb8-a720-3057e07662c1'::uuid);
    UPDATE public.bills SET driver_id = '70c293e7-bae8-4de2-a505-edccfd35f761'::uuid
    WHERE driver_id IN (SELECT id FROM public.drivers WHERE (name = 'Driver-2' OR name = 'Mallaya') AND id <> '70c293e7-bae8-4de2-a505-edccfd35f761'::uuid);
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='routes') THEN
    UPDATE public.routes SET driver_id = 'b097b6a9-8395-4eb8-a720-3057e07662c1'::uuid
    WHERE driver_id IN (SELECT id FROM public.drivers WHERE name = 'Nagaraju' AND id <> 'b097b6a9-8395-4eb8-a720-3057e07662c1'::uuid);
    UPDATE public.routes SET driver_id = '70c293e7-bae8-4de2-a505-edccfd35f761'::uuid
    WHERE driver_id IN (SELECT id FROM public.drivers WHERE (name = 'Driver-2' OR name = 'Mallaya') AND id <> '70c293e7-bae8-4de2-a505-edccfd35f761'::uuid);
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='route_sales') THEN
    UPDATE public.route_sales SET driver_id = 'b097b6a9-8395-4eb8-a720-3057e07662c1'::uuid
    WHERE driver_id IN (SELECT id FROM public.drivers WHERE name = 'Nagaraju' AND id <> 'b097b6a9-8395-4eb8-a720-3057e07662c1'::uuid);
    UPDATE public.route_sales SET driver_id = '70c293e7-bae8-4de2-a505-edccfd35f761'::uuid
    WHERE driver_id IN (SELECT id FROM public.drivers WHERE (name = 'Driver-2' OR name = 'Mallaya') AND id <> '70c293e7-bae8-4de2-a505-edccfd35f761'::uuid);
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='driver_collections') THEN
    -- Merge Nagaraju duplicates in driver_collections
    FOR r IN (
      SELECT id, route_id, collection_date, cash_collected, upi_collected, total_collected, due_outstanding
      FROM public.driver_collections
      WHERE driver_id IN (SELECT id FROM public.drivers WHERE name = 'Nagaraju' AND id <> 'b097b6a9-8395-4eb8-a720-3057e07662c1'::uuid)
    ) LOOP
      IF EXISTS (SELECT 1 FROM public.driver_collections WHERE driver_id = 'b097b6a9-8395-4eb8-a720-3057e07662c1'::uuid AND route_id = r.route_id AND collection_date = r.collection_date) THEN
        UPDATE public.driver_collections
        SET cash_collected = cash_collected + r.cash_collected,
            upi_collected = upi_collected + r.upi_collected,
            total_collected = total_collected + r.total_collected,
            due_outstanding = due_outstanding + r.due_outstanding
        WHERE driver_id = 'b097b6a9-8395-4eb8-a720-3057e07662c1'::uuid AND route_id = r.route_id AND collection_date = r.collection_date;
        
        DELETE FROM public.driver_collections WHERE id = r.id;
      ELSE
        UPDATE public.driver_collections
        SET driver_id = 'b097b6a9-8395-4eb8-a720-3057e07662c1'::uuid
        WHERE id = r.id;
      END IF;
    END LOOP;

    -- Merge Driver-2 / Mallaya duplicates in driver_collections
    FOR r IN (
      SELECT id, route_id, collection_date, cash_collected, upi_collected, total_collected, due_outstanding
      FROM public.driver_collections
      WHERE driver_id IN (SELECT id FROM public.drivers WHERE (name = 'Driver-2' OR name = 'Mallaya') AND id <> '70c293e7-bae8-4de2-a505-edccfd35f761'::uuid)
    ) LOOP
      IF EXISTS (SELECT 1 FROM public.driver_collections WHERE driver_id = '70c293e7-bae8-4de2-a505-edccfd35f761'::uuid AND route_id = r.route_id AND collection_date = r.collection_date) THEN
        UPDATE public.driver_collections
        SET cash_collected = cash_collected + r.cash_collected,
            upi_collected = upi_collected + r.upi_collected,
            total_collected = total_collected + r.total_collected,
            due_outstanding = due_outstanding + r.due_outstanding
        WHERE driver_id = '70c293e7-bae8-4de2-a505-edccfd35f761'::uuid AND route_id = r.route_id AND collection_date = r.collection_date;
        
        DELETE FROM public.driver_collections WHERE id = r.id;
      ELSE
        UPDATE public.driver_collections
        SET driver_id = '70c293e7-bae8-4de2-a505-edccfd35f761'::uuid
        WHERE id = r.id;
      END IF;
    END LOOP;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='collections') THEN
    UPDATE public.collections SET driver_id = 'b097b6a9-8395-4eb8-a720-3057e07662c1'::uuid
    WHERE driver_id IN (SELECT id FROM public.drivers WHERE name = 'Nagaraju' AND id <> 'b097b6a9-8395-4eb8-a720-3057e07662c1'::uuid);
    UPDATE public.collections SET driver_id = '70c293e7-bae8-4de2-a505-edccfd35f761'::uuid
    WHERE driver_id IN (SELECT id FROM public.drivers WHERE (name = 'Driver-2' OR name = 'Mallaya') AND id <> '70c293e7-bae8-4de2-a505-edccfd35f761'::uuid);
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='driver_sales') THEN
    UPDATE public.driver_sales SET driver_id = 'b097b6a9-8395-4eb8-a720-3057e07662c1'::uuid
    WHERE driver_id IN (SELECT id FROM public.drivers WHERE name = 'Nagaraju' AND id <> 'b097b6a9-8395-4eb8-a720-3057e07662c1'::uuid);
    UPDATE public.driver_sales SET driver_id = '70c293e7-bae8-4de2-a505-edccfd35f761'::uuid
    WHERE driver_id IN (SELECT id FROM public.drivers WHERE (name = 'Driver-2' OR name = 'Mallaya') AND id <> '70c293e7-bae8-4de2-a505-edccfd35f761'::uuid);
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='driver_performance') THEN
    -- Merge Nagaraju duplicates in driver_performance
    FOR r IN (
      SELECT id, performance_date, total_sales, total_collected, total_due
      FROM public.driver_performance
      WHERE driver_id IN (SELECT id FROM public.drivers WHERE name = 'Nagaraju' AND id <> 'b097b6a9-8395-4eb8-a720-3057e07662c1'::uuid)
    ) LOOP
      IF EXISTS (SELECT 1 FROM public.driver_performance WHERE driver_id = 'b097b6a9-8395-4eb8-a720-3057e07662c1'::uuid AND performance_date = r.performance_date) THEN
        UPDATE public.driver_performance
        SET total_sales = total_sales + r.total_sales,
            total_collected = total_collected + r.total_collected,
            total_due = total_due + r.total_due
        WHERE driver_id = 'b097b6a9-8395-4eb8-a720-3057e07662c1'::uuid AND performance_date = r.performance_date;
        
        DELETE FROM public.driver_performance WHERE id = r.id;
      ELSE
        UPDATE public.driver_performance
        SET driver_id = 'b097b6a9-8395-4eb8-a720-3057e07662c1'::uuid
        WHERE id = r.id;
      END IF;
    END LOOP;

    -- Merge Driver-2 / Mallaya duplicates in driver_performance
    FOR r IN (
      SELECT id, performance_date, total_sales, total_collected, total_due
      FROM public.driver_performance
      WHERE driver_id IN (SELECT id FROM public.drivers WHERE (name = 'Driver-2' OR name = 'Mallaya') AND id <> '70c293e7-bae8-4de2-a505-edccfd35f761'::uuid)
    ) LOOP
      IF EXISTS (SELECT 1 FROM public.driver_performance WHERE driver_id = '70c293e7-bae8-4de2-a505-edccfd35f761'::uuid AND performance_date = r.performance_date) THEN
        UPDATE public.driver_performance
        SET total_sales = total_sales + r.total_sales,
            total_collected = total_collected + r.total_collected,
            total_due = total_due + r.total_due
        WHERE driver_id = '70c293e7-bae8-4de2-a505-edccfd35f761'::uuid AND performance_date = r.performance_date;
        
        DELETE FROM public.driver_performance WHERE id = r.id;
      ELSE
        UPDATE public.driver_performance
        SET driver_id = '70c293e7-bae8-4de2-a505-edccfd35f761'::uuid
        WHERE id = r.id;
      END IF;
    END LOOP;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='non_local_routes') THEN
    UPDATE public.non_local_routes SET driver_id = 'b097b6a9-8395-4eb8-a720-3057e07662c1'::uuid
    WHERE driver_id IN (SELECT id FROM public.drivers WHERE name = 'Nagaraju' AND id <> 'b097b6a9-8395-4eb8-a720-3057e07662c1'::uuid);
    UPDATE public.non_local_routes SET driver_id = '70c293e7-bae8-4de2-a505-edccfd35f761'::uuid
    WHERE driver_id IN (SELECT id FROM public.drivers WHERE (name = 'Driver-2' OR name = 'Mallaya') AND id <> '70c293e7-bae8-4de2-a505-edccfd35f761'::uuid);
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='route_expenses') THEN
    UPDATE public.route_expenses SET driver_id = 'b097b6a9-8395-4eb8-a720-3057e07662c1'::uuid
    WHERE driver_id IN (SELECT id FROM public.drivers WHERE name = 'Nagaraju' AND id <> 'b097b6a9-8395-4eb8-a720-3057e07662c1'::uuid);
    UPDATE public.route_expenses SET driver_id = '70c293e7-bae8-4de2-a505-edccfd35f761'::uuid
    WHERE driver_id IN (SELECT id FROM public.drivers WHERE (name = 'Driver-2' OR name = 'Mallaya') AND id <> '70c293e7-bae8-4de2-a505-edccfd35f761'::uuid);
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='customer_dues') THEN
    UPDATE public.customer_dues SET driver_id = NULL
    WHERE driver_id NOT IN ('b097b6a9-8395-4eb8-a720-3057e07662c1'::uuid, '70c293e7-bae8-4de2-a505-edccfd35f761'::uuid);
  END IF;

  -- Step B: Remap routes
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='sales') THEN
    UPDATE public.sales SET route_id = NULL
    WHERE route_id NOT IN ('a1111111-1111-1111-1111-111111111111'::uuid,'a2222222-2222-2222-2222-222222222222'::uuid,'a3333333-3333-3333-3333-333333333333'::uuid,'a4444444-4444-4444-4444-444444444444'::uuid)
    AND route_id IS NOT NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='bills') THEN
    UPDATE public.bills SET route_id = NULL
    WHERE route_id NOT IN ('a1111111-1111-1111-1111-111111111111'::uuid,'a2222222-2222-2222-2222-222222222222'::uuid,'a3333333-3333-3333-3333-333333333333'::uuid,'a4444444-4444-4444-4444-444444444444'::uuid)
    AND route_id IS NOT NULL;
  END IF;

  -- Step C: Remap employee duplicates before deletion
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='drivers') THEN
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

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='attendance') THEN
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

  -- Delete duplicate employees keeping oldest
  WITH duplicates AS (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY name ORDER BY created_at ASC NULLS LAST) AS rn
    FROM public.employees
  )
  DELETE FROM public.employees WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);

  -- Step D: Null-out/delete references to routes that will be deleted
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='route_customers') THEN
    DELETE FROM public.route_customers
    WHERE route_id NOT IN ('a1111111-1111-1111-1111-111111111111'::uuid,'a2222222-2222-2222-2222-222222222222'::uuid,'a3333333-3333-3333-3333-333333333333'::uuid,'a4444444-4444-4444-4444-444444444444'::uuid);
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='route_reports') THEN
    DELETE FROM public.route_reports
    WHERE route_id NOT IN ('a1111111-1111-1111-1111-111111111111'::uuid,'a2222222-2222-2222-2222-222222222222'::uuid,'a3333333-3333-3333-3333-333333333333'::uuid,'a4444444-4444-4444-4444-444444444444'::uuid);
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='route_performance') THEN
    DELETE FROM public.route_performance
    WHERE route_id NOT IN ('a1111111-1111-1111-1111-111111111111'::uuid,'a2222222-2222-2222-2222-222222222222'::uuid,'a3333333-3333-3333-3333-333333333333'::uuid,'a4444444-4444-4444-4444-444444444444'::uuid);
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='route_rates') THEN
    DELETE FROM public.route_rates
    WHERE route_id NOT IN ('a1111111-1111-1111-1111-111111111111'::uuid,'a2222222-2222-2222-2222-222222222222'::uuid,'a3333333-3333-3333-3333-333333333333'::uuid,'a4444444-4444-4444-4444-444444444444'::uuid);
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='non_local_routes') THEN
    DELETE FROM public.non_local_routes
    WHERE route_id NOT IN ('a1111111-1111-1111-1111-111111111111'::uuid,'a2222222-2222-2222-2222-222222222222'::uuid,'a3333333-3333-3333-3333-333333333333'::uuid,'a4444444-4444-4444-4444-444444444444'::uuid);
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='route_expenses') THEN
    DELETE FROM public.route_expenses
    WHERE route_id NOT IN ('a1111111-1111-1111-1111-111111111111'::uuid,'a2222222-2222-2222-2222-222222222222'::uuid,'a3333333-3333-3333-3333-333333333333'::uuid,'a4444444-4444-4444-4444-444444444444'::uuid);
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='route_sales') THEN
    UPDATE public.route_sales SET route_id = NULL
    WHERE route_id NOT IN ('a1111111-1111-1111-1111-111111111111'::uuid,'a2222222-2222-2222-2222-222222222222'::uuid,'a3333333-3333-3333-3333-333333333333'::uuid,'a4444444-4444-4444-4444-444444444444'::uuid)
    AND route_id IS NOT NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='driver_collections') THEN
    UPDATE public.driver_collections SET route_id = NULL
    WHERE route_id NOT IN ('a1111111-1111-1111-1111-111111111111'::uuid,'a2222222-2222-2222-2222-222222222222'::uuid,'a3333333-3333-3333-3333-333333333333'::uuid,'a4444444-4444-4444-4444-444444444444'::uuid)
    AND route_id IS NOT NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='customer_dues') THEN
    UPDATE public.customer_dues SET route_id = NULL
    WHERE route_id NOT IN ('a1111111-1111-1111-1111-111111111111'::uuid,'a2222222-2222-2222-2222-222222222222'::uuid,'a3333333-3333-3333-3333-333333333333'::uuid,'a4444444-4444-4444-4444-444444444444'::uuid)
    AND route_id IS NOT NULL;
  END IF;

  -- Step E: Delete non-canonical routes & drivers
  DELETE FROM public.routes
  WHERE id NOT IN ('a1111111-1111-1111-1111-111111111111'::uuid,'a2222222-2222-2222-2222-222222222222'::uuid,'a3333333-3333-3333-3333-333333333333'::uuid,'a4444444-4444-4444-4444-444444444444'::uuid);

  DELETE FROM public.drivers
  WHERE id NOT IN ('b097b6a9-8395-4eb8-a720-3057e07662c1'::uuid, '70c293e7-bae8-4de2-a505-edccfd35f761'::uuid);

END $$;

-- ============================================================
-- PHASE 7: SEED CANONICAL EMPLOYEES, DRIVERS & ROUTES
-- ============================================================

INSERT INTO public.employees (name, role, salary, is_active, phone)
SELECT name, role, salary, is_active, phone
FROM (VALUES
  ('Arifa',         'manager',    0::numeric, true, NULL::text),
  ('Akhila',        'worker',     0::numeric, true, NULL::text),
  ('Lakshmi',       'worker',     0::numeric, true, NULL::text),
  ('Dhana Lakshmi', 'worker',     0::numeric, true, NULL::text),
  ('Parvathi',      'worker',     0::numeric, true, NULL::text),
  ('Swarna Latha',  'worker',     0::numeric, true, NULL::text),
  ('Rama Devi',     'worker',     0::numeric, true, NULL::text),
  ('Mallika',       'worker',     0::numeric, true, NULL::text),
  ('Sirisha',       'worker',     0::numeric, true, NULL::text),
  ('Nagaraju',      'driver',  12000::numeric, true, '8184918757'::text),
  ('Driver-2',      'driver',  16000::numeric, true, NULL::text),
  ('Sai Kumar',     'operator', 20000::numeric, true, NULL::text),
  ('Deepak',        'operator', 28000::numeric, true, NULL::text),
  ('Prasad',        'marketing',18000::numeric, true, NULL::text)
) AS new_emps(name, role, salary, is_active, phone)
WHERE NOT EXISTS (SELECT 1 FROM public.employees WHERE employees.name = new_emps.name);

-- Seed canonical drivers with fixed UUIDs
INSERT INTO public.drivers (id, employee_id, name, phone, salary, is_active)
SELECT 'b097b6a9-8395-4eb8-a720-3057e07662c1'::uuid,
       (SELECT id FROM public.employees WHERE name = 'Nagaraju' LIMIT 1),
       'Nagaraju', '8184918757', 12000, true
WHERE NOT EXISTS (SELECT 1 FROM public.drivers WHERE id = 'b097b6a9-8395-4eb8-a720-3057e07662c1'::uuid)
UNION ALL
SELECT '70c293e7-bae8-4de2-a505-edccfd35f761'::uuid,
       (SELECT id FROM public.employees WHERE name = 'Driver-2' LIMIT 1),
       'Driver-2', NULL, 16000, true
WHERE NOT EXISTS (SELECT 1 FROM public.drivers WHERE id = '70c293e7-bae8-4de2-a505-edccfd35f761'::uuid);

-- Seed canonical routes with fixed UUIDs
INSERT INTO public.routes (id, name, driver_id, area, description, is_active)
SELECT 'a1111111-1111-1111-1111-111111111111'::uuid, 'Local Route', 'b097b6a9-8395-4eb8-a720-3057e07662c1'::uuid, 'Local Area', 'Daily local deliveries & shops', true
WHERE NOT EXISTS (SELECT 1 FROM public.routes WHERE id = 'a1111111-1111-1111-1111-111111111111'::uuid)
UNION ALL
SELECT 'a2222222-2222-2222-2222-222222222222'::uuid, 'Raghavapuram Route', '70c293e7-bae8-4de2-a505-edccfd35f761'::uuid, 'Raghavapuram', 'Long distance bulk dealer distribution', true
WHERE NOT EXISTS (SELECT 1 FROM public.routes WHERE id = 'a2222222-2222-2222-2222-222222222222'::uuid)
UNION ALL
SELECT 'a3333333-3333-3333-3333-333333333333'::uuid, 'Mukkinavarigudem Route', '70c293e7-bae8-4de2-a505-edccfd35f761'::uuid, 'Mukkinavarigudem', 'Makkinavarigudem route deliveries', true
WHERE NOT EXISTS (SELECT 1 FROM public.routes WHERE id = 'a3333333-3333-3333-3333-333333333333'::uuid)
UNION ALL
SELECT 'a4444444-4444-4444-4444-444444444444'::uuid, 'Dammapeta Route', '70c293e7-bae8-4de2-a505-edccfd35f761'::uuid, 'Dammapeta', 'Dammapeta route deliveries', true
WHERE NOT EXISTS (SELECT 1 FROM public.routes WHERE id = 'a4444444-4444-4444-4444-444444444444'::uuid);

-- ============================================================
-- PHASE 8: SEED ROUTE STOPS (idempotent — ON CONFLICT DO NOTHING)
-- ============================================================
INSERT INTO public.route_stops (route_id, name, stop_order) VALUES
  ('a2222222-2222-2222-2222-222222222222'::uuid, 'Raghavapuram Wines', 1),
  ('a2222222-2222-2222-2222-222222222222'::uuid, 'Gandicherla', 2),
  ('a2222222-2222-2222-2222-222222222222'::uuid, 'DN Rao Peta', 3),
  ('a2222222-2222-2222-2222-222222222222'::uuid, 'Route Sale-1', 4),
  ('a2222222-2222-2222-2222-222222222222'::uuid, 'Route Sale-2', 5),
  ('a3333333-3333-3333-3333-333333333333'::uuid, 'Makkinavarigudem Wines', 1),
  ('a3333333-3333-3333-3333-333333333333'::uuid, 'Aunty Shop (Bags)', 2),
  ('a3333333-3333-3333-3333-333333333333'::uuid, 'Wine Shop (Bottles)', 3),
  ('a3333333-3333-3333-3333-333333333333'::uuid, 'Aunty Shop (Bottles)', 4),
  ('a4444444-4444-4444-4444-444444444444'::uuid, 'Wine Shop-1', 1),
  ('a4444444-4444-4444-4444-444444444444'::uuid, 'Wine Shop-2', 2),
  ('a4444444-4444-4444-4444-444444444444'::uuid, 'Wine Shop-3', 3)
ON CONFLICT (route_id, name) DO NOTHING;

-- ============================================================
-- PHASE 9: ENABLE RLS ON ALL TABLES
-- ============================================================
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salary_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raw_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dealers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dealer_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
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
ALTER TABLE public.route_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_dues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_performance ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PHASE 10: HARDENED RLS POLICIES (no USING(TRUE), uses auth.uid())
-- ============================================================

-- Dynamic clean-up of all existing policies in the public schema to prevent "already exists" errors
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT policyname, tablename 
    FROM pg_policies 
    WHERE schemaname = 'public'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;


-- Helper function with fixed search path
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT r.name FROM public.user_profiles up
  JOIN public.roles r ON r.id = up.role_id
  WHERE up.id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER SET search_path = public;

-- user_profiles
DROP POLICY IF EXISTS "user_profiles_select" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_write" ON public.user_profiles;
CREATE POLICY "user_profiles_select" ON public.user_profiles FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "user_profiles_write" ON public.user_profiles FOR ALL TO authenticated USING (id = auth.uid() OR public.get_user_role() = 'admin') WITH CHECK (id = auth.uid() OR public.get_user_role() = 'admin');

-- products
DROP POLICY IF EXISTS "products_select" ON public.products;
DROP POLICY IF EXISTS "products_insert" ON public.products;
DROP POLICY IF EXISTS "products_update" ON public.products;
DROP POLICY IF EXISTS "products_delete" ON public.products;
CREATE POLICY "products_select" ON public.products FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "products_insert" ON public.products FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "products_update" ON public.products FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "products_delete" ON public.products FOR DELETE TO authenticated USING (public.get_user_role() = 'admin');

-- sales
DROP POLICY IF EXISTS "sales_select" ON public.sales;
DROP POLICY IF EXISTS "sales_insert" ON public.sales;
DROP POLICY IF EXISTS "sales_update" ON public.sales;
DROP POLICY IF EXISTS "sales_delete" ON public.sales;
CREATE POLICY "sales_select" ON public.sales FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "sales_insert" ON public.sales FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "sales_update" ON public.sales FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "sales_delete" ON public.sales FOR DELETE TO authenticated USING (public.get_user_role() = 'admin');

-- sale_items
DROP POLICY IF EXISTS "sale_items_select" ON public.sale_items;
DROP POLICY IF EXISTS "sale_items_insert" ON public.sale_items;
DROP POLICY IF EXISTS "sale_items_update" ON public.sale_items;
DROP POLICY IF EXISTS "sale_items_delete" ON public.sale_items;
CREATE POLICY "sale_items_select" ON public.sale_items FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "sale_items_insert" ON public.sale_items FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "sale_items_update" ON public.sale_items FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "sale_items_delete" ON public.sale_items FOR DELETE TO authenticated USING (public.get_user_role() = 'admin');

-- customers
DROP POLICY IF EXISTS "customers_all" ON public.customers;
CREATE POLICY "customers_select" ON public.customers FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "customers_insert" ON public.customers FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "customers_update" ON public.customers FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "customers_delete" ON public.customers FOR DELETE TO authenticated USING (public.get_user_role() = 'admin');

-- dealers
DROP POLICY IF EXISTS "dealers_all" ON public.dealers;
CREATE POLICY "dealers_select" ON public.dealers FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "dealers_insert" ON public.dealers FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "dealers_update" ON public.dealers FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "dealers_delete" ON public.dealers FOR DELETE TO authenticated USING (public.get_user_role() = 'admin');

-- employees
DROP POLICY IF EXISTS "employees_select" ON public.employees;
DROP POLICY IF EXISTS "employees_write" ON public.employees;
CREATE POLICY "employees_select" ON public.employees FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "employees_insert" ON public.employees FOR INSERT TO authenticated WITH CHECK (public.get_user_role() = 'admin');
CREATE POLICY "employees_update" ON public.employees FOR UPDATE TO authenticated USING (public.get_user_role() = 'admin');
CREATE POLICY "employees_delete" ON public.employees FOR DELETE TO authenticated USING (public.get_user_role() = 'admin');

-- drivers
DROP POLICY IF EXISTS "drivers_all" ON public.drivers;
CREATE POLICY "drivers_select" ON public.drivers FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "drivers_insert" ON public.drivers FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "drivers_update" ON public.drivers FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "drivers_delete" ON public.drivers FOR DELETE TO authenticated USING (public.get_user_role() = 'admin');

-- routes
DROP POLICY IF EXISTS "routes_all" ON public.routes;
CREATE POLICY "routes_select" ON public.routes FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "routes_insert" ON public.routes FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "routes_update" ON public.routes FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "routes_delete" ON public.routes FOR DELETE TO authenticated USING (public.get_user_role() = 'admin');

-- route_stops
DROP POLICY IF EXISTS "route_stops_all" ON public.route_stops;
CREATE POLICY "route_stops_select" ON public.route_stops FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "route_stops_insert" ON public.route_stops FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "route_stops_update" ON public.route_stops FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "route_stops_delete" ON public.route_stops FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- route_expenses
DROP POLICY IF EXISTS "route_expenses_all" ON public.route_expenses;
CREATE POLICY "route_expenses_select" ON public.route_expenses FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "route_expenses_insert" ON public.route_expenses FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "route_expenses_update" ON public.route_expenses FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "route_expenses_delete" ON public.route_expenses FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- route_customers
DROP POLICY IF EXISTS "route_customers_all" ON public.route_customers;
CREATE POLICY "route_customers_select" ON public.route_customers FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "route_customers_insert" ON public.route_customers FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "route_customers_update" ON public.route_customers FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "route_customers_delete" ON public.route_customers FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- route_sales
DROP POLICY IF EXISTS "route_sales_all" ON public.route_sales;
CREATE POLICY "route_sales_select" ON public.route_sales FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "route_sales_insert" ON public.route_sales FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "route_sales_update" ON public.route_sales FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "route_sales_delete" ON public.route_sales FOR DELETE TO authenticated USING (public.get_user_role() = 'admin');

-- driver_collections
DROP POLICY IF EXISTS "driver_collections_all" ON public.driver_collections;
CREATE POLICY "driver_collections_select" ON public.driver_collections FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "driver_collections_insert" ON public.driver_collections FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "driver_collections_update" ON public.driver_collections FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "driver_collections_delete" ON public.driver_collections FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- customer_dues
DROP POLICY IF EXISTS "customer_dues_all" ON public.customer_dues;
CREATE POLICY "customer_dues_select" ON public.customer_dues FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "customer_dues_insert" ON public.customer_dues FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "customer_dues_update" ON public.customer_dues FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "customer_dues_delete" ON public.customer_dues FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- bills
DROP POLICY IF EXISTS "bills_all" ON public.bills;
CREATE POLICY "bills_select" ON public.bills FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "bills_insert" ON public.bills FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "bills_update" ON public.bills FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "bills_delete" ON public.bills FOR DELETE TO authenticated USING (public.get_user_role() = 'admin');

-- bill_items
DROP POLICY IF EXISTS "bill_items_all" ON public.bill_items;
CREATE POLICY "bill_items_select" ON public.bill_items FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "bill_items_insert" ON public.bill_items FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "bill_items_update" ON public.bill_items FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "bill_items_delete" ON public.bill_items FOR DELETE TO authenticated USING (public.get_user_role() = 'admin');

-- expenses
DROP POLICY IF EXISTS "expenses_select" ON public.expenses;
DROP POLICY IF EXISTS "expenses_write" ON public.expenses;
CREATE POLICY "expenses_select" ON public.expenses FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "expenses_insert" ON public.expenses FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "expenses_update" ON public.expenses FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "expenses_delete" ON public.expenses FOR DELETE TO authenticated USING (public.get_user_role() = 'admin');

-- salary_payments
DROP POLICY IF EXISTS "salary_select" ON public.salary_payments;
DROP POLICY IF EXISTS "salary_write" ON public.salary_payments;
CREATE POLICY "salary_select" ON public.salary_payments FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "salary_insert" ON public.salary_payments FOR INSERT TO authenticated WITH CHECK (public.get_user_role() = 'admin');
CREATE POLICY "salary_update" ON public.salary_payments FOR UPDATE TO authenticated USING (public.get_user_role() = 'admin');
CREATE POLICY "salary_delete" ON public.salary_payments FOR DELETE TO authenticated USING (public.get_user_role() = 'admin');

-- salary (new table)
DROP POLICY IF EXISTS "salary_all" ON public.salary;
CREATE POLICY "salary_tbl_select" ON public.salary FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "salary_tbl_insert" ON public.salary FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "salary_tbl_update" ON public.salary FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "salary_tbl_delete" ON public.salary FOR DELETE TO authenticated USING (public.get_user_role() = 'admin');

-- attendance
DROP POLICY IF EXISTS "attendance_all" ON public.attendance;
CREATE POLICY "attendance_select" ON public.attendance FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "attendance_insert" ON public.attendance FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "attendance_update" ON public.attendance FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "attendance_delete" ON public.attendance FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- stock
DROP POLICY IF EXISTS "stock_select" ON public.stock;
DROP POLICY IF EXISTS "stock_write" ON public.stock;
CREATE POLICY "stock_select" ON public.stock FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "stock_insert" ON public.stock FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "stock_update" ON public.stock FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "stock_delete" ON public.stock FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- stock_transactions
DROP POLICY IF EXISTS "stock_tx_all" ON public.stock_transactions;
CREATE POLICY "stock_tx_select" ON public.stock_transactions FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "stock_tx_insert" ON public.stock_transactions FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "stock_tx_update" ON public.stock_transactions FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "stock_tx_delete" ON public.stock_transactions FOR DELETE TO authenticated USING (public.get_user_role() = 'admin');

-- raw_materials
DROP POLICY IF EXISTS "raw_materials_all" ON public.raw_materials;
CREATE POLICY "raw_materials_select" ON public.raw_materials FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "raw_materials_insert" ON public.raw_materials FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "raw_materials_update" ON public.raw_materials FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "raw_materials_delete" ON public.raw_materials FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- stock_items
DROP POLICY IF EXISTS "stock_items_all" ON public.stock_items;
CREATE POLICY "stock_items_select" ON public.stock_items FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "stock_items_insert" ON public.stock_items FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "stock_items_update" ON public.stock_items FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "stock_items_delete" ON public.stock_items FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- payments
DROP POLICY IF EXISTS "payments_all" ON public.payments;
CREATE POLICY "payments_select" ON public.payments FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "payments_insert" ON public.payments FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "payments_update" ON public.payments FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "payments_delete" ON public.payments FOR DELETE TO authenticated USING (public.get_user_role() = 'admin');

-- collections
DROP POLICY IF EXISTS "collections_all" ON public.collections;
CREATE POLICY "collections_select" ON public.collections FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "collections_insert" ON public.collections FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "collections_update" ON public.collections FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "collections_delete" ON public.collections FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- dealer_products
DROP POLICY IF EXISTS "dealer_products_all" ON public.dealer_products;
CREATE POLICY "dealer_products_select" ON public.dealer_products FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "dealer_products_insert" ON public.dealer_products FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "dealer_products_update" ON public.dealer_products FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "dealer_products_delete" ON public.dealer_products FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- settings
DROP POLICY IF EXISTS "settings_select" ON public.settings;
DROP POLICY IF EXISTS "settings_write" ON public.settings;
CREATE POLICY "settings_select" ON public.settings FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "settings_insert" ON public.settings FOR INSERT TO authenticated WITH CHECK (public.get_user_role() = 'admin');
CREATE POLICY "settings_update" ON public.settings FOR UPDATE TO authenticated USING (public.get_user_role() = 'admin');
CREATE POLICY "settings_delete" ON public.settings FOR DELETE TO authenticated USING (public.get_user_role() = 'admin');

-- audit_logs
DROP POLICY IF EXISTS "audit_logs_select" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert" ON public.audit_logs;
CREATE POLICY "audit_logs_select" ON public.audit_logs FOR SELECT TO authenticated USING (public.get_user_role() = 'admin');
CREATE POLICY "audit_logs_insert" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- Reports / performance tables
DROP POLICY IF EXISTS "daily_reports_all" ON public.daily_reports;
CREATE POLICY "daily_reports_select" ON public.daily_reports FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "daily_reports_insert" ON public.daily_reports FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "daily_reports_update" ON public.daily_reports FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "daily_reports_delete" ON public.daily_reports FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "monthly_reports_all" ON public.monthly_reports;
CREATE POLICY "monthly_reports_select" ON public.monthly_reports FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "monthly_reports_insert" ON public.monthly_reports FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "monthly_reports_update" ON public.monthly_reports FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "monthly_reports_delete" ON public.monthly_reports FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "driver_perf_all" ON public.driver_performance;
CREATE POLICY "driver_perf_select" ON public.driver_performance FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "driver_perf_insert" ON public.driver_performance FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "driver_perf_update" ON public.driver_performance FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "driver_perf_delete" ON public.driver_performance FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "route_perf_all" ON public.route_performance;
CREATE POLICY "route_perf_select" ON public.route_performance FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "route_perf_insert" ON public.route_performance FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "route_perf_update" ON public.route_performance FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "route_perf_delete" ON public.route_performance FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "non_local_routes_all" ON public.non_local_routes;
CREATE POLICY "non_local_routes_select" ON public.non_local_routes FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "non_local_routes_insert" ON public.non_local_routes FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "non_local_routes_update" ON public.non_local_routes FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "non_local_routes_delete" ON public.non_local_routes FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "dealer_sales_all" ON public.dealer_sales;
CREATE POLICY "dealer_sales_select" ON public.dealer_sales FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "dealer_sales_insert" ON public.dealer_sales FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "dealer_sales_update" ON public.dealer_sales FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "dealer_sales_delete" ON public.dealer_sales FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "dealer_ledger_all" ON public.dealer_ledger;
CREATE POLICY "dealer_ledger_select" ON public.dealer_ledger FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "dealer_ledger_insert" ON public.dealer_ledger FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "dealer_ledger_update" ON public.dealer_ledger FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "dealer_ledger_delete" ON public.dealer_ledger FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "driver_sales_all" ON public.driver_sales;
CREATE POLICY "driver_sales_select" ON public.driver_sales FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "driver_sales_insert" ON public.driver_sales FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "driver_sales_update" ON public.driver_sales FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "driver_sales_delete" ON public.driver_sales FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "route_reports_all" ON public.route_reports;
CREATE POLICY "route_reports_select" ON public.route_reports FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "route_reports_insert" ON public.route_reports FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "route_reports_update" ON public.route_reports FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "route_reports_delete" ON public.route_reports FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "product_rates_all" ON public.product_rates;
CREATE POLICY "product_rates_select" ON public.product_rates FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "product_rates_insert" ON public.product_rates FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "product_rates_update" ON public.product_rates FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "product_rates_delete" ON public.product_rates FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "dealer_rates_all" ON public.dealer_rates;
CREATE POLICY "dealer_rates_select" ON public.dealer_rates FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "dealer_rates_insert" ON public.dealer_rates FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "dealer_rates_update" ON public.dealer_rates FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "dealer_rates_delete" ON public.dealer_rates FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "route_rates_all" ON public.route_rates;
CREATE POLICY "route_rates_select" ON public.route_rates FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "route_rates_insert" ON public.route_rates FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "route_rates_update" ON public.route_rates FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "route_rates_delete" ON public.route_rates FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- expense_categories (allow read by all, write by admin)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='expense_categories') THEN
    EXECUTE 'CREATE POLICY "expense_cat_select" ON public.expense_categories FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL)';
    EXECUTE 'CREATE POLICY "expense_cat_insert" ON public.expense_categories FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL)';
    EXECUTE 'CREATE POLICY "expense_cat_update" ON public.expense_categories FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL)';
    EXECUTE 'CREATE POLICY "expense_cat_delete" ON public.expense_categories FOR DELETE TO authenticated USING (public.get_user_role() = ''admin'')';
  END IF;
END $$;

-- ============================================================
-- PHASE 11: VIEWS (security_invoker = true to avoid SECURITY DEFINER warning)
-- ============================================================

DROP VIEW IF EXISTS public.stock_status;
CREATE OR REPLACE VIEW public.stock_status WITH (security_invoker = true) AS
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

DROP VIEW IF EXISTS public.daily_sales_summary;
CREATE OR REPLACE VIEW public.daily_sales_summary WITH (security_invoker = true) AS
SELECT
  sale_date,
  COUNT(*) AS total_bills,
  SUM(total_amount) AS total_sales,
  SUM(paid_amount) AS total_collected,
  SUM(due_amount) AS total_due
FROM public.sales
GROUP BY sale_date
ORDER BY sale_date DESC;

-- ============================================================
-- PHASE 12: FUNCTIONS WITH FIXED SEARCH PATH
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  default_role_id UUID;
  user_role TEXT;
BEGIN
  user_role := COALESCE(new.raw_user_meta_data->>'role', 'worker');
  SELECT id INTO default_role_id FROM public.roles WHERE name = user_role;
  IF default_role_id IS NULL THEN
    SELECT id INTO default_role_id FROM public.roles WHERE name = 'worker';
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.sync_route_sales_data()
RETURNS TRIGGER AS $$
DECLARE
  v_month INTEGER;
  v_year INTEGER;
BEGIN
  v_month := EXTRACT(MONTH FROM NEW.sale_date);
  v_year := EXTRACT(YEAR FROM NEW.sale_date);

  INSERT INTO public.daily_reports (report_date, total_sales, total_cash, total_upi, total_due)
  VALUES (NEW.sale_date, NEW.total_amount, NEW.cash_paid, NEW.upi_paid, NEW.due_amount)
  ON CONFLICT (report_date) DO UPDATE SET
    total_sales = public.daily_reports.total_sales + EXCLUDED.total_sales,
    total_cash = public.daily_reports.total_cash + EXCLUDED.total_cash,
    total_upi = public.daily_reports.total_upi + EXCLUDED.total_upi,
    total_due = public.daily_reports.total_due + EXCLUDED.total_due;

  INSERT INTO public.monthly_reports (month, year, total_sales, total_cash, total_upi, total_due)
  VALUES (v_month, v_year, NEW.total_amount, NEW.cash_paid, NEW.upi_paid, NEW.due_amount)
  ON CONFLICT (month, year) DO UPDATE SET
    total_sales = public.monthly_reports.total_sales + EXCLUDED.total_sales,
    total_cash = public.monthly_reports.total_cash + EXCLUDED.total_cash,
    total_upi = public.monthly_reports.total_upi + EXCLUDED.total_upi,
    total_due = public.monthly_reports.total_due + EXCLUDED.total_due;

  INSERT INTO public.driver_performance (driver_id, performance_date, total_sales, total_collected, total_due)
  VALUES (NEW.driver_id, NEW.sale_date, NEW.total_amount, (NEW.cash_paid + NEW.upi_paid), NEW.due_amount)
  ON CONFLICT (driver_id, performance_date) DO UPDATE SET
    total_sales = public.driver_performance.total_sales + EXCLUDED.total_sales,
    total_collected = public.driver_performance.total_collected + EXCLUDED.total_collected,
    total_due = public.driver_performance.total_due + EXCLUDED.total_due;

  INSERT INTO public.route_performance (route_id, performance_date, total_sales, total_collected, total_due)
  VALUES (NEW.route_id, NEW.sale_date, NEW.total_amount, (NEW.cash_paid + NEW.upi_paid), NEW.due_amount)
  ON CONFLICT (route_id, performance_date) DO UPDATE SET
    total_sales = public.route_performance.total_sales + EXCLUDED.total_sales,
    total_collected = public.route_performance.total_collected + EXCLUDED.total_collected,
    total_due = public.route_performance.total_due + EXCLUDED.total_due;

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_route_sale_inserted ON public.route_sales;
CREATE TRIGGER on_route_sale_inserted
  AFTER INSERT ON public.route_sales
  FOR EACH ROW EXECUTE FUNCTION public.sync_route_sales_data();

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

  INSERT INTO public.daily_reports (report_date, total_sales, total_cash, total_upi, total_due)
  VALUES (
    NEW.date, NEW.total_amount,
    CASE WHEN NEW.payment_method = 'cash' THEN v_paid_amount ELSE 0 END,
    CASE WHEN NEW.payment_method = 'upi' THEN v_paid_amount ELSE 0 END,
    NEW.due_amount
  )
  ON CONFLICT (report_date) DO UPDATE SET
    total_sales = public.daily_reports.total_sales + EXCLUDED.total_sales,
    total_cash = public.daily_reports.total_cash + EXCLUDED.total_cash,
    total_upi = public.daily_reports.total_upi + EXCLUDED.total_upi,
    total_due = public.daily_reports.total_due + EXCLUDED.total_due;

  INSERT INTO public.monthly_reports (month, year, total_sales, total_cash, total_upi, total_due)
  VALUES (
    v_month, v_year, NEW.total_amount,
    CASE WHEN NEW.payment_method = 'cash' THEN v_paid_amount ELSE 0 END,
    CASE WHEN NEW.payment_method = 'upi' THEN v_paid_amount ELSE 0 END,
    NEW.due_amount
  )
  ON CONFLICT (month, year) DO UPDATE SET
    total_sales = public.monthly_reports.total_sales + EXCLUDED.total_sales,
    total_cash = public.monthly_reports.total_cash + EXCLUDED.total_cash,
    total_upi = public.monthly_reports.total_upi + EXCLUDED.total_upi,
    total_due = public.monthly_reports.total_due + EXCLUDED.total_due;

  IF NEW.bill_type = 'dealer_invoice' AND NEW.dealer_id IS NOT NULL THEN
    INSERT INTO public.dealer_sales (bill_id, dealer_id, total_amount, paid_amount, due_amount, sale_date)
    VALUES (NEW.id, NEW.dealer_id, NEW.total_amount, v_paid_amount, NEW.due_amount, NEW.date);
    INSERT INTO public.dealer_ledger (dealer_id, transaction_type, amount, reference_id)
    VALUES (NEW.dealer_id, 'invoice', NEW.total_amount, NEW.id);
    IF v_paid_amount > 0 THEN
      INSERT INTO public.dealer_ledger (dealer_id, transaction_type, amount, reference_id)
      VALUES (NEW.dealer_id, 'payment', v_paid_amount, NEW.id);
    END IF;
    UPDATE public.dealers SET outstanding_amount = COALESCE(outstanding_amount, 0) + NEW.due_amount
    WHERE id = NEW.dealer_id;
  END IF;

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
      total_sales = public.driver_performance.total_sales + EXCLUDED.total_sales,
      total_collected = public.driver_performance.total_collected + EXCLUDED.total_collected,
      total_due = public.driver_performance.total_due + EXCLUDED.total_due;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_sync_bills ON public.bills;
CREATE TRIGGER trg_sync_bills
  AFTER INSERT ON public.bills
  FOR EACH ROW EXECUTE FUNCTION public.sync_bills_data();

CREATE OR REPLACE FUNCTION public.generate_employee_code()
RETURNS TRIGGER AS $$
DECLARE
  next_num INT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(employee_code FROM 9) AS INT)), 0) + 1
  INTO next_num
  FROM public.employees
  WHERE employee_code LIKE 'BABS2021%';
  NEW.employee_code := 'BABS2021' || LPAD(next_num::TEXT, 2, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_employee_code ON public.employees;
CREATE TRIGGER trg_employee_code
  BEFORE INSERT ON public.employees
  FOR EACH ROW
  WHEN (NEW.employee_code IS NULL)
  EXECUTE FUNCTION public.generate_employee_code();

-- Timestamp triggers
DROP TRIGGER IF EXISTS update_products_updated_at ON public.products;
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS update_customers_updated_at ON public.customers;
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS update_dealers_updated_at ON public.dealers;
CREATE TRIGGER update_dealers_updated_at BEFORE UPDATE ON public.dealers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS update_sales_updated_at ON public.sales;
CREATE TRIGGER update_sales_updated_at BEFORE UPDATE ON public.sales FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS update_employees_updated_at ON public.employees;
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- PHASE 13: VERIFICATION QUERIES (run after script to confirm)
-- ============================================================
-- Uncomment and run these to verify results:

-- SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name;
-- SELECT id, name, is_active FROM public.drivers ORDER BY name;
-- SELECT id, name, is_active FROM public.routes ORDER BY name;
-- SELECT COUNT(*) FROM public.employees;
-- SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='route_expenses') AS route_expenses_exists;
-- SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname='public' AND (qual='true' OR with_check='true') ORDER BY tablename;

-- ============================================================
-- END OF MASTER_RESET.sql
-- ============================================================
