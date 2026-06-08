-- ============================================================
-- ROYAL KISSAN ERP - SUPABASE DATABASE SCHEMA
-- Run this in Supabase SQL Editor
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- ============================================================
-- ROLES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE, -- 'admin', 'worker'
  description TEXT,
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO roles (name, description, permissions) VALUES
  ('admin', 'Full access owner', '{"all": true}'),
  ('worker', 'Billing operator', '{"billing": true, "sales": true, "deliveries": true}')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- USERS EXTENDED PROFILE TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  role_id UUID REFERENCES roles(id),
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- EMPLOYEES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  role TEXT NOT NULL, -- 'manager', 'worker', 'driver', 'operator', 'marketing'
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

-- Pre-seed employees
INSERT INTO employees (name, role, salary) VALUES
  ('Arifa', 'manager', 0),
  ('Akhila', 'worker', 0),
  ('Lakshmi', 'worker', 0),
  ('Dhana Lakshmi', 'worker', 0),
  ('Parvathi', 'worker', 0),
  ('Swarna Latha', 'worker', 0),
  ('Rama Devi', 'worker', 0),
  ('Mallika', 'worker', 0),
  ('Sirisha', 'worker', 0),
  ('Nagaraju', 'driver', 12000),
  ('Mallaya', 'driver', 16000),
  ('Sai Kumar', 'operator', 20000),
  ('Deepak', 'operator', 28000),
  ('Prasad', 'marketing', 18000)
ON CONFLICT DO NOTHING;

-- ============================================================
-- ATTENDANCE TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'half_day', 'leave')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, date)
);

-- ============================================================
-- SALARY PAYMENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS salary_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
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

-- ============================================================
-- PRODUCTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- 'can', 'bottle', 'packet'
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

-- Pre-seed products
INSERT INTO products (name, category, unit, default_rate, hsn_code) VALUES
  ('Water Can (20L)', 'can', 'piece', 15.00, '2201'),
  ('Cooling Can (20L)', 'can', 'piece', 30.00, '2201'),
  ('Water Packets (500ml)', 'packet', 'piece', 0, '2201'),
  ('500ml Bottle', 'bottle', 'piece', 0, '2201'),
  ('1L Bottle', 'bottle', 'piece', 0, '2201'),
  ('2L Bottle', 'bottle', 'piece', 0, '2201')
ON CONFLICT DO NOTHING;

-- ============================================================
-- STOCK TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS stock (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  current_quantity INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id)
);

-- Raw materials stock
CREATE TABLE IF NOT EXISTS raw_materials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  unit TEXT DEFAULT 'piece',
  current_quantity NUMERIC(10,2) DEFAULT 0,
  low_stock_threshold NUMERIC(10,2) DEFAULT 10,
  cost_per_unit NUMERIC(10,2) DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO raw_materials (name, unit) VALUES
  ('Caps', 'piece'),
  ('Labels', 'piece'),
  ('Packaging Material', 'kg'),
  ('Water Cans (Empty)', 'piece'),
  ('PET Preforms', 'piece')
ON CONFLICT DO NOTHING;

-- ============================================================
-- STOCK TRANSACTIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS stock_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('in', 'out', 'adjustment')),
  quantity INTEGER NOT NULL,
  quantity_before INTEGER,
  quantity_after INTEGER,
  reason TEXT,
  reference_id UUID, -- sale_id or purchase_id
  reference_type TEXT, -- 'sale', 'purchase', 'adjustment'
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CUSTOMERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS customers (
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

-- ============================================================
-- DEALERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS dealers (
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

-- Dealer-specific product rates
CREATE TABLE IF NOT EXISTS dealer_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dealer_id UUID REFERENCES dealers(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  custom_rate NUMERIC(10,2) NOT NULL,
  UNIQUE(dealer_id, product_id)
);

-- ============================================================
-- DRIVERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS drivers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES employees(id),
  name TEXT NOT NULL,
  phone TEXT,
  license_number TEXT,
  vehicle_number TEXT,
  salary NUMERIC(10,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pre-seed drivers (linked to employees)
INSERT INTO drivers (name, phone, salary) VALUES
  ('Nagaraju', '8184918757', 12000),
  ('Mallaya', NULL, 16000)
ON CONFLICT DO NOTHING;

-- ============================================================
-- ROUTES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS routes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  driver_id UUID REFERENCES drivers(id),
  area TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Route customers/stops
CREATE TABLE IF NOT EXISTS route_stops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  route_id UUID REFERENCES routes(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  stop_order INTEGER DEFAULT 0,
  default_quantity INTEGER DEFAULT 0,
  notes TEXT
);

-- ============================================================
-- SALES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number TEXT UNIQUE,
  sale_type TEXT NOT NULL CHECK (sale_type IN ('delivery', 'invoice', 'dealer', 'counter')),
  customer_id UUID REFERENCES customers(id),
  dealer_id UUID REFERENCES dealers(id),
  driver_id UUID REFERENCES drivers(id),
  route_id UUID REFERENCES routes(id),
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

-- ============================================================
-- SALE ITEMS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS sale_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  rate NUMERIC(10,2) NOT NULL,
  discount_pct NUMERIC(5,2) DEFAULT 0,
  amount NUMERIC(10,2) NOT NULL,
  gst_rate NUMERIC(5,2) DEFAULT 0,
  gst_amount NUMERIC(10,2) DEFAULT 0,
  total NUMERIC(10,2) NOT NULL
);

-- ============================================================
-- PAYMENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id),
  dealer_id UUID REFERENCES dealers(id),
  amount NUMERIC(10,2) NOT NULL,
  payment_mode TEXT NOT NULL CHECK (payment_mode IN ('cash', 'upi', 'cheque', 'bank_transfer')),
  payment_date DATE DEFAULT CURRENT_DATE,
  reference_number TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- COLLECTIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS collections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id UUID REFERENCES drivers(id),
  route_id UUID REFERENCES routes(id),
  collection_date DATE DEFAULT CURRENT_DATE,
  total_collected NUMERIC(10,2) DEFAULT 0,
  cash_amount NUMERIC(10,2) DEFAULT 0,
  upi_amount NUMERIC(10,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- EXPENSES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS expense_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT
);

INSERT INTO expense_categories (name) VALUES
  ('Diesel'),
  ('Fuel'),
  ('Electricity'),
  ('Vehicle Maintenance'),
  ('Plant Maintenance'),
  ('Salaries'),
  ('Marketing'),
  ('Transport'),
  ('Office Expenses'),
  ('Miscellaneous')
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID REFERENCES expense_categories(id),
  category_name TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  expense_date DATE DEFAULT CURRENT_DATE,
  description TEXT,
  payment_mode TEXT DEFAULT 'cash',
  receipt_url TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SETTINGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT NOT NULL UNIQUE,
  value TEXT,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO settings (key, value, description) VALUES
  ('company_name', 'ROYAL KISSAN PACKAGED DRINKING WATER', 'Company name'),
  ('company_address', 'Your Address Here', 'Company address'),
  ('company_phone', 'Your Phone Here', 'Company phone'),
  ('company_gst', 'Your GST Number', 'Company GST number'),
  ('company_email', 'royalkissan@gmail.com', 'Company email'),
  ('invoice_prefix', 'RK', 'Invoice number prefix'),
  ('invoice_counter', '1', 'Invoice counter'),
  ('currency', 'INR', 'Currency'),
  ('low_stock_threshold', '10', 'Default low stock threshold'),
  ('thermal_printer_width', '58', 'Thermal printer width in mm')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- AUDIT LOGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
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
-- ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE dealers ENABLE ROW LEVEL SECURITY;
ALTER TABLE dealer_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Authenticated users can read all data
-- Admin (role='admin') can do everything
-- Worker (role='worker') can insert/select sales, deliveries only

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT r.name FROM user_profiles up
  JOIN roles r ON r.id = up.role_id
  WHERE up.id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER;

-- Products: all authenticated can read, admin can write
CREATE POLICY "products_select" ON products FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "products_insert" ON products FOR INSERT TO authenticated WITH CHECK (get_user_role() = 'admin');
CREATE POLICY "products_update" ON products FOR UPDATE TO authenticated USING (get_user_role() = 'admin');
CREATE POLICY "products_delete" ON products FOR DELETE TO authenticated USING (get_user_role() = 'admin');

-- Sales: all authenticated can read and insert, only admin can delete
CREATE POLICY "sales_select" ON sales FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "sales_insert" ON sales FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "sales_update" ON sales FOR UPDATE TO authenticated USING (get_user_role() = 'admin');
CREATE POLICY "sales_delete" ON sales FOR DELETE TO authenticated USING (get_user_role() = 'admin');

-- Sale items: all authenticated
CREATE POLICY "sale_items_select" ON sale_items FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "sale_items_insert" ON sale_items FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "sale_items_update" ON sale_items FOR UPDATE TO authenticated USING (get_user_role() = 'admin');
CREATE POLICY "sale_items_delete" ON sale_items FOR DELETE TO authenticated USING (get_user_role() = 'admin');

-- Customers: all authenticated
CREATE POLICY "customers_all" ON customers FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

-- Dealers: all authenticated
CREATE POLICY "dealers_all" ON dealers FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

-- Admin-only tables
CREATE POLICY "employees_select" ON employees FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "employees_write" ON employees FOR ALL TO authenticated USING (get_user_role() = 'admin') WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "expenses_select" ON expenses FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "expenses_write" ON expenses FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "salary_select" ON salary_payments FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "salary_write" ON salary_payments FOR ALL TO authenticated USING (get_user_role() = 'admin') WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "attendance_all" ON attendance FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "drivers_all" ON drivers FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "routes_all" ON routes FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "route_stops_all" ON route_stops FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "stock_select" ON stock FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "stock_write" ON stock FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "stock_tx_all" ON stock_transactions FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "raw_materials_all" ON raw_materials FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "payments_all" ON payments FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "collections_all" ON collections FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "dealer_products_all" ON dealer_products FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "settings_select" ON settings FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "settings_write" ON settings FOR ALL TO authenticated USING (get_user_role() = 'admin') WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "user_profiles_select" ON user_profiles FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "user_profiles_write" ON user_profiles FOR ALL TO authenticated USING (id = auth.uid() OR get_user_role() = 'admin') WITH CHECK (id = auth.uid() OR get_user_role() = 'admin');

CREATE POLICY "audit_logs_select" ON audit_logs FOR SELECT TO authenticated USING (get_user_role() = 'admin');
CREATE POLICY "audit_logs_insert" ON audit_logs FOR INSERT TO authenticated WITH CHECK (TRUE);

-- ============================================================
-- USEFUL VIEWS
-- ============================================================

-- Daily sales summary
CREATE OR REPLACE VIEW daily_sales_summary AS
SELECT
  sale_date,
  COUNT(*) AS total_bills,
  SUM(total_amount) AS total_sales,
  SUM(paid_amount) AS total_collected,
  SUM(due_amount) AS total_due
FROM sales
GROUP BY sale_date
ORDER BY sale_date DESC;

-- Customer outstanding dues
CREATE OR REPLACE VIEW customer_dues AS
SELECT
  c.id,
  c.name,
  c.phone,
  c.area,
  SUM(s.due_amount) AS total_due
FROM customers c
JOIN sales s ON s.customer_id = c.id
WHERE s.due_amount > 0
GROUP BY c.id, c.name, c.phone, c.area
ORDER BY total_due DESC;

-- Stock status
CREATE OR REPLACE VIEW stock_status AS
SELECT
  p.id,
  p.name,
  p.category,
  COALESCE(s.current_quantity, 0) AS current_quantity,
  p.low_stock_threshold,
  CASE WHEN COALESCE(s.current_quantity, 0) <= p.low_stock_threshold THEN TRUE ELSE FALSE END AS is_low_stock
FROM products p
LEFT JOIN stock s ON s.product_id = p.id
WHERE p.is_active = TRUE;

-- ============================================================
-- AUTO-UPDATE TIMESTAMPS TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_dealers_updated_at BEFORE UPDATE ON dealers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_sales_updated_at BEFORE UPDATE ON sales FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- AUTOMATIC USER PROFILES TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  default_role_id UUID;
  user_role TEXT;
BEGIN
  -- Get role name from metadata, default to 'worker'
  user_role := COALESCE(new.raw_user_meta_data->>'role', 'worker');
  
  -- Get the role_id from roles table
  SELECT id INTO default_role_id FROM public.roles WHERE name = user_role;
  
  -- If role doesn't exist, default to worker role
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
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call handle_new_user on auth.users insert
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Manually seed user profiles for existing auth users if they were created before trigger:
INSERT INTO public.user_profiles (id, full_name, role_id, is_active)
SELECT id, 'Owner', (SELECT id FROM public.roles WHERE name = 'admin'), TRUE
FROM auth.users
WHERE email = 'owner@royalkissan.com'
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_profiles (id, full_name, role_id, is_active)
SELECT id, 'Worker', (SELECT id FROM public.roles WHERE name = 'worker'), TRUE
FROM auth.users
WHERE email = 'worker@royalkissan.com'
ON CONFLICT (id) DO NOTHING;

