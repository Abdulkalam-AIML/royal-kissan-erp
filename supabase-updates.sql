-- ============================================================
-- ROYAL KISSAN ERP - UPDATES SQL (supabase-updates.sql)
-- Run this in Supabase SQL Editor AFTER supabase-schema.sql
-- ============================================================

-- 1. ADD EMPLOYEE_ID COLUMN TO EMPLOYEES TABLE
ALTER TABLE employees 
  ADD COLUMN IF NOT EXISTS employee_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS date_joined DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS advance_amount NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bonus_amount NUMERIC(10,2) DEFAULT 0;

-- 2. AUTO-GENERATE BABS EMPLOYEE CODES
-- Run once to backfill existing employees
DO $$
DECLARE
  emp RECORD;
  counter INT := 1;
BEGIN
  FOR emp IN SELECT id FROM employees WHERE employee_code IS NULL ORDER BY created_at LOOP
    UPDATE employees SET employee_code = 'BABS2021' || LPAD(counter::TEXT, 2, '0') WHERE id = emp.id;
    counter := counter + 1;
  END LOOP;
END $$;

-- 3. CREATE TRIGGER FOR AUTO EMPLOYEE CODE ON INSERT
CREATE OR REPLACE FUNCTION generate_employee_code()
RETURNS TRIGGER AS $$
DECLARE
  next_num INT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(employee_code FROM 9) AS INT)), 0) + 1
  INTO next_num
  FROM employees
  WHERE employee_code LIKE 'BABS2021%';
  
  NEW.employee_code := 'BABS2021' || LPAD(next_num::TEXT, 2, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_employee_code ON employees;
CREATE TRIGGER trg_employee_code
  BEFORE INSERT ON employees
  FOR EACH ROW
  WHEN (NEW.employee_code IS NULL)
  EXECUTE FUNCTION generate_employee_code();

-- 4. UPDATE PRODUCTS TABLE WITH CORRECT RATES AND CATEGORIES
TRUNCATE TABLE products RESTART IDENTITY CASCADE;

INSERT INTO products (name, category, unit, default_rate, gst_rate, hsn_code, is_active) VALUES
  ('Water Can (20L)',     'can',    'piece', 15.00,  18.00, '2201', TRUE),
  ('Cooling Can (20L)',   'can',    'piece', 30.00,  18.00, '2201', TRUE),
  ('Water Packets',       'packet', 'piece',  0.00,  12.00, '2201', TRUE),  -- Manual price
  ('500ml Bottle Case',   'bottle', 'case', 140.00,  18.00, '2201', TRUE),
  ('250ml Bottle Case',   'bottle', 'case', 150.00,  18.00, '2201', TRUE),
  ('1L Bottle Case',      'bottle', 'case', 120.00,  18.00, '2201', TRUE),
  ('2L Bottle Case',      'bottle', 'case', 150.00,  18.00, '2201', TRUE)
ON CONFLICT DO NOTHING;

-- 5. ADD INVOICE_TYPE COLUMN TO SALES TABLE
ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS invoice_type TEXT DEFAULT 'company_sale'
    CHECK (invoice_type IN ('driver_sale','company_sale','dealer_invoice','gst_invoice','non_gst_invoice')),
  ADD COLUMN IF NOT EXISTS shipped_to TEXT,
  ADD COLUMN IF NOT EXISTS is_gst BOOLEAN DEFAULT TRUE;

-- 6. ADD INVOICE_TYPE TO ROUTE_SALES TABLE  
ALTER TABLE route_sales
  ADD COLUMN IF NOT EXISTS invoice_type TEXT DEFAULT 'driver_sale',
  ADD COLUMN IF NOT EXISTS is_gst BOOLEAN DEFAULT TRUE;

-- 7. ADD MISSING STOCK CATEGORIES (If stock_items or stock_levels table doesn't exist, use stock_transactions)
-- Add opening_stock column to track initial stock
CREATE TABLE IF NOT EXISTS stock_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'pcs',
  opening_stock INTEGER DEFAULT 0,
  low_stock_threshold INTEGER DEFAULT 50,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO stock_items (name, category, unit, opening_stock, low_stock_threshold) VALUES
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

-- 8. ADD stock_item_id TO stock_transactions FOR PROPER LINKING
ALTER TABLE stock_transactions
  ADD COLUMN IF NOT EXISTS stock_item_id UUID REFERENCES stock_items(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS item_name TEXT;

-- 9. DEALER UPDATES - Ensure dealer table has all needed columns
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS dealer_code TEXT,
  ADD COLUMN IF NOT EXISTS mobile TEXT,
  ADD COLUMN IF NOT EXISTS gst_number TEXT,
  ADD COLUMN IF NOT EXISTS credit_limit NUMERIC(10,2) DEFAULT 50000;

-- 10. ADD EMPLOYEES FROM SEED LIST (with phone numbers where known)
-- NOTE: Only run if employees table is empty or missing these records
INSERT INTO employees (name, role, salary, is_active, phone) VALUES
  ('Arifa',         'manager',   0,     true, NULL),
  ('Akhila',        'worker',    0,     true, NULL),
  ('Lakshmi',       'worker',    0,     true, NULL),
  ('Dhana Lakshmi', 'worker',    0,     true, NULL),
  ('Parvathi',      'worker',    0,     true, NULL),
  ('Swarna Latha',  'worker',    0,     true, NULL),
  ('Rama Devi',     'worker',    0,     true, NULL),
  ('Mallika',       'worker',    0,     true, NULL),
  ('Sirisha',       'worker',    0,     true, NULL),
  ('Nagaraju',      'driver',  12000,  true, '8184918757'),
  ('Mallaya',       'driver',  16000,  true, NULL),
  ('Sai Kumar',     'operator', 20000, true, NULL),
  ('Deepak',        'operator', 28000, true, NULL),
  ('Prasad',        'marketing',18000, true, NULL)
ON CONFLICT DO NOTHING;
