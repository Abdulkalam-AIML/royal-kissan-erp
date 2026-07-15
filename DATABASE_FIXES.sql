-- ============================================================
-- ROYAL KISSAN ERP - MASTER DATABASE FIX SCRIPT v3.0
-- Run this ENTIRE SCRIPT in Supabase SQL Editor
-- URL: https://supabase.com/dashboard/project/oweutcivgpmzldlcmkvd/sql/new
-- Date: 15 June 2026
-- ============================================================
-- WHAT THIS SCRIPT DOES:
-- 1. Seeds the roles table (CRITICAL: auth system was broken)
-- 2. Deletes duplicate drivers (9 → 2 canonical)
-- 3. Deletes duplicate routes (31 → 4 canonical)
-- 4. Deduplicates employees (57 → unique names)
-- 5. Deduplicates products (27 → 7 canonical)
-- 6. Ensures correct routes exist with proper UUIDs
-- 7. Ensures correct drivers exist with proper UUIDs
-- 8. Links user_profiles to correct role IDs
-- 9. Adds all missing performance indexes
-- 10. Adds missing stock opening balances
-- ============================================================

BEGIN;

-- ===========================================================
-- STEP 1: RESEED ROLES TABLE (CRITICAL - auth was broken)
-- ===========================================================
INSERT INTO public.roles (name, description, permissions) VALUES
  ('admin', 'Full access — owner level', '{"all": true, "billing": true, "sales": true, "stock": true, "employees": true, "reports": true, "settings": true, "delete": true}'),
  ('worker', 'Billing operator — limited access', '{"billing": true, "sales": true, "drivers": true, "stock": false, "employees": false, "reports": false, "settings": false, "delete": false}')
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  permissions = EXCLUDED.permissions;

-- Verify roles were inserted
DO $$
DECLARE v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.roles;
  IF v_count < 2 THEN
    RAISE EXCEPTION 'ROLES SEED FAILED: Only % rows in roles table', v_count;
  END IF;
  RAISE NOTICE 'SUCCESS: roles table has % rows', v_count;
END $$;


-- ===========================================================
-- STEP 2: LINK USER_PROFILES TO CORRECT ROLES
-- ===========================================================
-- Update the first user (likely owner/admin) to admin role
UPDATE public.user_profiles
SET role_id = (SELECT id FROM public.roles WHERE name = 'admin' LIMIT 1)
WHERE role_id IS NULL
  AND id = (SELECT id FROM public.user_profiles ORDER BY created_at LIMIT 1);

-- Update remaining users to worker role
UPDATE public.user_profiles
SET role_id = (SELECT id FROM public.roles WHERE name = 'worker' LIMIT 1)
WHERE role_id IS NULL;

RAISE NOTICE 'User profiles linked to roles';


-- ===========================================================
-- STEP 3: DELETE DUPLICATE DRIVERS
-- Keep ONLY Nagaraju (b097b6a9...) and Driver-2 (70c293e7...)
-- ===========================================================

-- First: clean up any references to duplicate driver IDs in child tables
-- Safe delete — only targets non-canonical driver IDs

DELETE FROM public.route_expenses
WHERE driver_id NOT IN (
  'b097b6a9-8395-4eb8-a720-3057e07662c1'::uuid,
  '70c293e7-bae8-4de2-a505-edccfd35f761'::uuid
);

DELETE FROM public.route_sales
WHERE driver_id NOT IN (
  'b097b6a9-8395-4eb8-a720-3057e07662c1'::uuid,
  '70c293e7-bae8-4de2-a505-edccfd35f761'::uuid
);

DELETE FROM public.driver_performance
WHERE driver_id NOT IN (
  'b097b6a9-8395-4eb8-a720-3057e07662c1'::uuid,
  '70c293e7-bae8-4de2-a505-edccfd35f761'::uuid
);

DELETE FROM public.driver_collections
WHERE driver_id NOT IN (
  'b097b6a9-8395-4eb8-a720-3057e07662c1'::uuid,
  '70c293e7-bae8-4de2-a505-edccfd35f761'::uuid
);

-- Safe delete non-canonical routes (route_id in route_customers)
-- We'll handle this in Step 4

-- Now ensure the 2 canonical drivers exist with the right UUIDs
INSERT INTO public.drivers (id, name, phone, salary, is_active)
VALUES
  ('b097b6a9-8395-4eb8-a720-3057e07662c1'::uuid, 'Nagaraju', '8184918757', 12000, true),
  ('70c293e7-bae8-4de2-a505-edccfd35f761'::uuid, 'Driver-2', '9999988888', 14000, true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  phone = EXCLUDED.phone,
  salary = EXCLUDED.salary,
  is_active = EXCLUDED.is_active;

-- Delete all duplicate drivers (not the canonical 2)
DELETE FROM public.drivers
WHERE id NOT IN (
  'b097b6a9-8395-4eb8-a720-3057e07662c1'::uuid,
  '70c293e7-bae8-4de2-a505-edccfd35f761'::uuid
);

DO $$
DECLARE v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.drivers;
  RAISE NOTICE 'Drivers table now has % rows (expected: 2)', v_count;
  IF v_count != 2 THEN
    RAISE WARNING 'UNEXPECTED DRIVER COUNT: % (check foreign key constraints)', v_count;
  END IF;
END $$;


-- ===========================================================
-- STEP 4: DELETE DUPLICATE ROUTES
-- Keep ONLY 4 canonical routes with fixed UUIDs
-- ===========================================================

-- First: ensure canonical routes exist with correct UUIDs
INSERT INTO public.routes (id, name, driver_id, area, is_active)
VALUES
  ('a1111111-1111-1111-1111-111111111111'::uuid, 'Local Route', 'b097b6a9-8395-4eb8-a720-3057e07662c1'::uuid, 'Local Area (Guntur Town)', true),
  ('a2222222-2222-2222-2222-222222222222'::uuid, 'Raghavapuram Route', '70c293e7-bae8-4de2-a505-edccfd35f761'::uuid, 'Raghavapuram', true),
  ('a3333333-3333-3333-3333-333333333333'::uuid, 'Mukkinavarigudem Route', '70c293e7-bae8-4de2-a505-edccfd35f761'::uuid, 'Mukkinavarigudem', true),
  ('a4444444-4444-4444-4444-444444444444'::uuid, 'Dammapeta Route', '70c293e7-bae8-4de2-a505-edccfd35f761'::uuid, 'Dammapeta', true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  driver_id = EXCLUDED.driver_id,
  area = EXCLUDED.area,
  is_active = EXCLUDED.is_active;

-- Remap any route_customers pointing to non-canonical route IDs to canonical ones
-- Local-ish routes → Local Route
UPDATE public.route_customers
SET route_id = 'a1111111-1111-1111-1111-111111111111'::uuid
WHERE route_id NOT IN (
  'a1111111-1111-1111-1111-111111111111'::uuid,
  'a2222222-2222-2222-2222-222222222222'::uuid,
  'a3333333-3333-3333-3333-333333333333'::uuid,
  'a4444444-4444-4444-4444-444444444444'::uuid
)
AND route_id IN (
  SELECT id FROM public.routes WHERE name ILIKE '%local%'
);

-- Delete route_customers with no valid route_id mapping
DELETE FROM public.route_customers
WHERE route_id NOT IN (
  'a1111111-1111-1111-1111-111111111111'::uuid,
  'a2222222-2222-2222-2222-222222222222'::uuid,
  'a3333333-3333-3333-3333-333333333333'::uuid,
  'a4444444-4444-4444-4444-444444444444'::uuid
);

-- Clean up route_sales with non-canonical route_ids
UPDATE public.route_sales
SET route_id = 'a1111111-1111-1111-1111-111111111111'::uuid
WHERE route_id IS NOT NULL
  AND route_id NOT IN (
    'a1111111-1111-1111-1111-111111111111'::uuid,
    'a2222222-2222-2222-2222-222222222222'::uuid,
    'a3333333-3333-3333-3333-333333333333'::uuid,
    'a4444444-4444-4444-4444-444444444444'::uuid
  );

-- Delete non-canonical routes
DELETE FROM public.routes
WHERE id NOT IN (
  'a1111111-1111-1111-1111-111111111111'::uuid,
  'a2222222-2222-2222-2222-222222222222'::uuid,
  'a3333333-3333-3333-3333-333333333333'::uuid,
  'a4444444-4444-4444-4444-444444444444'::uuid
);

DO $$
DECLARE v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.routes;
  RAISE NOTICE 'Routes table now has % rows (expected: 4)', v_count;
END $$;


-- ===========================================================
-- STEP 5: DEDUPLICATE EMPLOYEES
-- Keep only the oldest record for each unique name
-- ===========================================================
DELETE FROM public.employees
WHERE id NOT IN (
  SELECT DISTINCT ON (LOWER(TRIM(name))) id
  FROM public.employees
  ORDER BY LOWER(TRIM(name)), created_at ASC NULLS LAST
);

DO $$
DECLARE v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.employees;
  RAISE NOTICE 'Employees table now has % rows after dedup', v_count;
END $$;


-- ===========================================================
-- STEP 6: DEDUPLICATE PRODUCTS
-- Keep only the first product per unique name
-- ===========================================================
DELETE FROM public.products
WHERE id NOT IN (
  SELECT DISTINCT ON (LOWER(TRIM(name))) id
  FROM public.products
  ORDER BY LOWER(TRIM(name)), created_at ASC NULLS LAST
);

-- Ensure the 7 canonical products exist with correct rates
INSERT INTO public.products (name, category, default_rate, gst_rate, unit, is_active)
VALUES
  ('Water Can (20L)', 'can', 15.00, 18, 'piece', true),
  ('Cooling Can (20L)', 'can', 30.00, 18, 'piece', true),
  ('Bags (100 Pack)', 'bag', 80.00, 12, 'pack', true),
  ('500ml Bottle Case', 'bottle', 140.00, 18, 'case', true),
  ('1L Bottle Case', 'bottle', 120.00, 18, 'case', true),
  ('2L Bottle Case', 'bottle', 150.00, 18, 'case', true),
  ('Water Packets (250ml)', 'packet', 60.00, 12, 'pack', true)
ON CONFLICT (name) DO UPDATE SET
  default_rate = EXCLUDED.default_rate,
  gst_rate = EXCLUDED.gst_rate,
  is_active = EXCLUDED.is_active;

DO $$
DECLARE v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.products;
  RAISE NOTICE 'Products table now has % rows after dedup', v_count;
END $$;


-- ===========================================================
-- STEP 7: DEDUPLICATE DEALERS
-- ===========================================================
DELETE FROM public.dealers
WHERE id NOT IN (
  SELECT DISTINCT ON (LOWER(TRIM(name))) id
  FROM public.dealers
  ORDER BY LOWER(TRIM(name)), created_at ASC NULLS LAST
);

DO $$
DECLARE v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.dealers;
  RAISE NOTICE 'Dealers table now has % rows after dedup', v_count;
END $$;


-- ===========================================================
-- STEP 8: ADD MISSING PERFORMANCE INDEXES
-- ===========================================================

-- bills table indexes
CREATE INDEX IF NOT EXISTS idx_bills_date ON public.bills(date);
CREATE INDEX IF NOT EXISTS idx_bills_bill_type ON public.bills(bill_type);
CREATE INDEX IF NOT EXISTS idx_bills_driver_id ON public.bills(driver_id);
CREATE INDEX IF NOT EXISTS idx_bills_dealer_id ON public.bills(dealer_id);
CREATE INDEX IF NOT EXISTS idx_bills_payment_status ON public.bills(payment_status);
CREATE INDEX IF NOT EXISTS idx_bills_invoice_number ON public.bills(invoice_number);

-- route_sales table indexes
CREATE INDEX IF NOT EXISTS idx_route_sales_sale_date ON public.route_sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_route_sales_driver_id ON public.route_sales(driver_id);
CREATE INDEX IF NOT EXISTS idx_route_sales_route_id ON public.route_sales(route_id);
CREATE INDEX IF NOT EXISTS idx_route_sales_customer ON public.route_sales(customer_name);

-- sales table indexes  
CREATE INDEX IF NOT EXISTS idx_sales_sale_date ON public.sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON public.sales(customer_id);

-- employees table
CREATE INDEX IF NOT EXISTS idx_employees_name ON public.employees USING btree(LOWER(name));
CREATE INDEX IF NOT EXISTS idx_employees_is_active ON public.employees(is_active);

-- drivers table
CREATE INDEX IF NOT EXISTS idx_drivers_name ON public.drivers USING btree(LOWER(name));
CREATE INDEX IF NOT EXISTS idx_drivers_is_active ON public.drivers(is_active);

-- routes table
CREATE INDEX IF NOT EXISTS idx_routes_driver_id ON public.routes(driver_id);
CREATE INDEX IF NOT EXISTS idx_routes_is_active ON public.routes(is_active);

-- dealers table
CREATE INDEX IF NOT EXISTS idx_dealers_name ON public.dealers USING btree(LOWER(name));
CREATE INDEX IF NOT EXISTS idx_dealers_area ON public.dealers(area);

-- customers table
CREATE INDEX IF NOT EXISTS idx_customers_name ON public.customers USING btree(LOWER(name));

-- products table
CREATE INDEX IF NOT EXISTS idx_products_name ON public.products USING btree(LOWER(name));
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON public.products(is_active);

-- daily_reports table
CREATE INDEX IF NOT EXISTS idx_daily_reports_date ON public.daily_reports(report_date);

-- monthly_reports table
CREATE INDEX IF NOT EXISTS idx_monthly_reports_month_year ON public.monthly_reports(year, month);

-- customer_dues table
CREATE INDEX IF NOT EXISTS idx_customer_dues_amount ON public.customer_dues(due_amount DESC);
CREATE INDEX IF NOT EXISTS idx_customer_dues_status ON public.customer_dues(status);

-- attendance table
CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_employee ON public.attendance(employee_id);

-- route_customers table
CREATE INDEX IF NOT EXISTS idx_route_customers_route_id ON public.route_customers(route_id);
CREATE INDEX IF NOT EXISTS idx_route_customers_section ON public.route_customers(section);

-- route_expenses table
CREATE INDEX IF NOT EXISTS idx_route_expenses_driver_id ON public.route_expenses(driver_id);
CREATE INDEX IF NOT EXISTS idx_route_expenses_date ON public.route_expenses(created_at);

-- bill_items table
CREATE INDEX IF NOT EXISTS idx_bill_items_bill_id ON public.bill_items(bill_id);

-- driver_performance table (already has unique constraint but add explicit index)
CREATE INDEX IF NOT EXISTS idx_driver_perf_driver ON public.driver_performance(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_perf_date ON public.driver_performance(performance_date);

-- route_performance table
CREATE INDEX IF NOT EXISTS idx_route_perf_route ON public.route_performance(route_id);
CREATE INDEX IF NOT EXISTS idx_route_perf_date ON public.route_performance(performance_date);

RAISE NOTICE 'All missing indexes created successfully';


-- ===========================================================
-- STEP 9: ADD STOCK OPENING BALANCES (if stock table is empty)
-- ===========================================================
DO $$
DECLARE v_stock_count INT;
BEGIN
  SELECT COUNT(*) INTO v_stock_count FROM public.stock;
  IF v_stock_count = 0 THEN
    -- Seed stock opening balances for main products
    INSERT INTO public.stock (product_id, current_quantity, low_stock_threshold)
    SELECT p.id, 
      CASE 
        WHEN p.name = 'Water Can (20L)' THEN 200
        WHEN p.name = 'Cooling Can (20L)' THEN 50
        WHEN p.name = 'Bags (100 Pack)' THEN 30
        WHEN p.name = '500ml Bottle Case' THEN 20
        WHEN p.name = '1L Bottle Case' THEN 20
        WHEN p.name = '2L Bottle Case' THEN 10
        ELSE 50
      END,
      CASE 
        WHEN p.name = 'Water Can (20L)' THEN 20
        WHEN p.name = 'Bags (100 Pack)' THEN 5
        ELSE 5
      END
    FROM public.products p
    WHERE p.is_active = true
    ON CONFLICT (product_id) DO NOTHING;
    RAISE NOTICE 'Stock opening balances seeded for % products', (SELECT COUNT(*) FROM public.products WHERE is_active = true);
  ELSE
    RAISE NOTICE 'Stock table already has % rows — skipping seed', v_stock_count;
  END IF;
END $$;


-- ===========================================================
-- STEP 10: ENSURE ROUTE_CUSTOMERS ARE CORRECTLY SEEDED
-- ===========================================================
-- If route_customers are empty for canonical routes, seed defaults
DO $$
DECLARE v_local_count INT;
BEGIN
  SELECT COUNT(*) INTO v_local_count 
  FROM public.route_customers 
  WHERE route_id = 'a1111111-1111-1111-1111-111111111111'::uuid;
  
  IF v_local_count = 0 THEN
    -- Seed Local Route customers
    INSERT INTO public.route_customers (route_id, name, section, default_qty, default_rate, product_name, is_active)
    VALUES
      -- CANS @ ₹15
      ('a1111111-1111-1111-1111-111111111111'::uuid, 'Bismillah Daba', 'cans', 10, 15.00, 'Water Can (20L)', true),
      ('a1111111-1111-1111-1111-111111111111'::uuid, 'Vamsi Mess', 'cans', 10, 15.00, 'Water Can (20L)', true),
      ('a1111111-1111-1111-1111-111111111111'::uuid, 'Lithu', 'cans', 5, 15.00, 'Water Can (20L)', true),
      ('a1111111-1111-1111-1111-111111111111'::uuid, 'Tiffin Center-1', 'cans', 4, 15.00, 'Water Can (20L)', true),
      ('a1111111-1111-1111-1111-111111111111'::uuid, 'Tea Stall', 'cans', 5, 15.00, 'Water Can (20L)', true),
      ('a1111111-1111-1111-1111-111111111111'::uuid, 'Juice Point', 'cans', 10, 15.00, 'Water Can (20L)', true),
      -- CANS @ ₹20
      ('a1111111-1111-1111-1111-111111111111'::uuid, 'Surendra Juice Point', 'cans', 10, 20.00, 'Water Can (20L)', true),
      -- CANS @ ₹30 (House Points)
      ('a1111111-1111-1111-1111-111111111111'::uuid, 'House Point 1', 'cans', 1, 30.00, 'Water Can (20L)', true),
      ('a1111111-1111-1111-1111-111111111111'::uuid, 'House Point 2', 'cans', 1, 30.00, 'Water Can (20L)', true),
      ('a1111111-1111-1111-1111-111111111111'::uuid, 'House Point 3', 'cans', 1, 30.00, 'Water Can (20L)', true),
      ('a1111111-1111-1111-1111-111111111111'::uuid, 'House Point 4', 'cans', 1, 30.00, 'Water Can (20L)', true),
      ('a1111111-1111-1111-1111-111111111111'::uuid, 'House Point 5', 'cans', 1, 30.00, 'Water Can (20L)', true),
      -- CANS manual rate
      ('a1111111-1111-1111-1111-111111111111'::uuid, 'SBI', 'cans', 1, 0, 'Water Can (20L)', true),
      ('a1111111-1111-1111-1111-111111111111'::uuid, 'Fire Station', 'cans', 1, 0, 'Water Can (20L)', true),
      -- BAGS
      ('a1111111-1111-1111-1111-111111111111'::uuid, 'Amaravati Wines', 'bags', 5, 75.00, 'Bags (100 Pack)', true),
      ('a1111111-1111-1111-1111-111111111111'::uuid, 'Balaji Wines', 'bags', 5, 80.00, 'Bags (100 Pack)', true),
      ('a1111111-1111-1111-1111-111111111111'::uuid, 'Shop 1', 'bags', 5, 100.00, 'Bags (100 Pack)', true),
      ('a1111111-1111-1111-1111-111111111111'::uuid, 'Bala Sundari Shop', 'bags', 5, 95.00, 'Bags (100 Pack)', true),
      ('a1111111-1111-1111-1111-111111111111'::uuid, 'Shop 2', 'bags', 5, 90.00, 'Bags (100 Pack)', true),
      ('a1111111-1111-1111-1111-111111111111'::uuid, 'Shop 3', 'bags', 5, 90.00, 'Bags (100 Pack)', true),
      ('a1111111-1111-1111-1111-111111111111'::uuid, 'Shop 4', 'bags', 5, 90.00, 'Bags (100 Pack)', true),
      ('a1111111-1111-1111-1111-111111111111'::uuid, 'Route Sale', 'bags', 10, 100.00, 'Bags (100 Pack)', true),
      -- BOTTLES
      ('a1111111-1111-1111-1111-111111111111'::uuid, 'Healthy Plate', 'bottles', 5, 140.00, '500ml Bottle Case', true),
      ('a1111111-1111-1111-1111-111111111111'::uuid, 'Tiffin Shop', 'bottles', 5, 145.00, '500ml Bottle Case', true),
      ('a1111111-1111-1111-1111-111111111111'::uuid, 'Bottle Shop 1', 'bottles', 5, 140.00, '500ml Bottle Case', true),
      ('a1111111-1111-1111-1111-111111111111'::uuid, 'Bottle Shop 4', 'bottles', 5, 150.00, '500ml Bottle Case', true)
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE 'Local Route customers seeded';
  ELSE
    RAISE NOTICE 'Local Route already has % customers — skipping seed', v_local_count;
  END IF;
END $$;

-- Seed Raghavapuram route if empty
DO $$
DECLARE v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count 
  FROM public.route_customers 
  WHERE route_id = 'a2222222-2222-2222-2222-222222222222'::uuid;
  
  IF v_count = 0 THEN
    INSERT INTO public.route_customers (route_id, name, section, default_qty, default_rate, product_name, is_active)
    VALUES
      ('a2222222-2222-2222-2222-222222222222'::uuid, 'Raghavapuram Wines', 'bags', 10, 80.00, 'Bags (100 Pack)', true),
      ('a2222222-2222-2222-2222-222222222222'::uuid, 'Gandicherla', 'bags', 8, 90.00, 'Bags (100 Pack)', true),
      ('a2222222-2222-2222-2222-222222222222'::uuid, 'DN Rao Peta', 'bags', 8, 90.00, 'Bags (100 Pack)', true),
      ('a2222222-2222-2222-2222-222222222222'::uuid, 'Route Sale-1', 'bags', 10, 100.00, 'Bags (100 Pack)', true),
      ('a2222222-2222-2222-2222-222222222222'::uuid, 'Route Sale-2', 'bags', 10, 90.00, 'Bags (100 Pack)', true),
      ('a2222222-2222-2222-2222-222222222222'::uuid, 'Raghavapuram Can Customer', 'cans', 5, 30.00, 'Water Can (20L)', true),
      ('a2222222-2222-2222-2222-222222222222'::uuid, 'Raghavapuram Bottle', 'bottles', 5, 140.00, '500ml Bottle Case', true)
    ON CONFLICT DO NOTHING;
    RAISE NOTICE 'Raghavapuram Route customers seeded';
  END IF;
END $$;

-- Seed Mukkinavarigudem route if empty
DO $$
DECLARE v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count 
  FROM public.route_customers 
  WHERE route_id = 'a3333333-3333-3333-3333-333333333333'::uuid;
  
  IF v_count = 0 THEN
    INSERT INTO public.route_customers (route_id, name, section, default_qty, default_rate, product_name, is_active)
    VALUES
      ('a3333333-3333-3333-3333-333333333333'::uuid, 'Wine Shop', 'bags', 10, 75.00, 'Bags (100 Pack)', true),
      ('a3333333-3333-3333-3333-333333333333'::uuid, 'Aunty Shop', 'bags', 10, 80.00, 'Bags (100 Pack)', true),
      ('a3333333-3333-3333-3333-333333333333'::uuid, 'Wine Shop Bottles', 'bottles', 5, 110.00, '1L Bottle Case', true),
      ('a3333333-3333-3333-3333-333333333333'::uuid, 'Aunty Shop Bottles', 'bottles', 5, 120.00, '1L Bottle Case', true)
    ON CONFLICT DO NOTHING;
    RAISE NOTICE 'Mukkinavarigudem Route customers seeded';
  END IF;
END $$;

-- Seed Dammapeta route if empty
DO $$
DECLARE v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count 
  FROM public.route_customers 
  WHERE route_id = 'a4444444-4444-4444-4444-444444444444'::uuid;
  
  IF v_count = 0 THEN
    INSERT INTO public.route_customers (route_id, name, section, default_qty, default_rate, product_name, is_active)
    VALUES
      ('a4444444-4444-4444-4444-444444444444'::uuid, 'Wine Shop 1', 'bags', 10, 75.00, 'Bags (100 Pack)', true),
      ('a4444444-4444-4444-4444-444444444444'::uuid, 'Wine Shop 2', 'bags', 10, 80.00, 'Bags (100 Pack)', true),
      ('a4444444-4444-4444-4444-444444444444'::uuid, 'Wine Shop 3', 'bags', 10, 75.00, 'Bags (100 Pack)', true)
    ON CONFLICT DO NOTHING;
    RAISE NOTICE 'Dammapeta Route customers seeded';
  END IF;
END $$;


-- ===========================================================
-- STEP 11: ENSURE SETTINGS TABLE IS CORRECTLY POPULATED
-- ===========================================================
INSERT INTO public.settings (key, value, description) VALUES
  ('company_name', 'Royal Kissan Drinking Water', 'Company name for invoices'),
  ('company_address', 'Guntur Highway Road, Guntur, Andhra Pradesh', 'Company billing address'),
  ('company_phone', '8184918757', 'Primary contact number'),
  ('company_gst', '37BABS2021G1Z3', 'GSTIN number'),
  ('nagaraju_id', 'b097b6a9-8395-4eb8-a720-3057e07662c1', 'Canonical UUID for Nagaraju'),
  ('driver2_id', '70c293e7-bae8-4de2-a505-edccfd35f761', 'Canonical UUID for Driver-2'),
  ('local_route_id', 'a1111111-1111-1111-1111-111111111111', 'Canonical UUID for Local Route'),
  ('raghavapuram_route_id', 'a2222222-2222-2222-2222-222222222222', 'Canonical UUID for Raghavapuram Route'),
  ('makkina_route_id', 'a3333333-3333-3333-3333-333333333333', 'Canonical UUID for Mukkinavarigudem Route'),
  ('dammapeta_route_id', 'a4444444-4444-4444-4444-444444444444', 'Canonical UUID for Dammapeta Route')
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description;


-- ===========================================================
-- STEP 12: FINAL VERIFICATION SUMMARY
-- ===========================================================
DO $$
DECLARE 
  v_roles INT; v_drivers INT; v_routes INT; v_employees INT; 
  v_products INT; v_dealers INT; v_route_customers INT;
  v_stock INT;
BEGIN
  SELECT COUNT(*) INTO v_roles FROM public.roles;
  SELECT COUNT(*) INTO v_drivers FROM public.drivers;
  SELECT COUNT(*) INTO v_routes FROM public.routes;
  SELECT COUNT(*) INTO v_employees FROM public.employees;
  SELECT COUNT(*) INTO v_products FROM public.products;
  SELECT COUNT(*) INTO v_dealers FROM public.dealers;
  SELECT COUNT(*) INTO v_route_customers FROM public.route_customers;
  SELECT COUNT(*) INTO v_stock FROM public.stock;
  
  RAISE NOTICE '===================================================';
  RAISE NOTICE '  ROYAL KISSAN ERP DATABASE FIX COMPLETE';
  RAISE NOTICE '===================================================';
  RAISE NOTICE '  roles:            % rows (expected: 2)', v_roles;
  RAISE NOTICE '  drivers:          % rows (expected: 2)', v_drivers;
  RAISE NOTICE '  routes:           % rows (expected: 4)', v_routes;
  RAISE NOTICE '  employees:        % rows (after dedup)', v_employees;
  RAISE NOTICE '  products:         % rows (after dedup)', v_products;
  RAISE NOTICE '  dealers:          % rows (after dedup)', v_dealers;
  RAISE NOTICE '  route_customers:  % rows', v_route_customers;
  RAISE NOTICE '  stock:            % rows (should be > 0)', v_stock;
  RAISE NOTICE '===================================================';
  
  IF v_roles < 2 THEN RAISE WARNING 'ROLES STILL EMPTY — check seed step!'; END IF;
  IF v_drivers != 2 THEN RAISE WARNING 'DRIVER COUNT WRONG: % (expected 2)', v_drivers; END IF;
  IF v_routes != 4 THEN RAISE WARNING 'ROUTE COUNT WRONG: % (expected 4)', v_routes; END IF;
END $$;

COMMIT;

-- ============================================================
-- POST-COMMIT VERIFICATION QUERIES
-- Run these individually to verify the fix worked:
-- ============================================================

-- 1. Verify roles:
-- SELECT * FROM public.roles;

-- 2. Verify drivers:
-- SELECT id, name, phone, salary FROM public.drivers ORDER BY name;

-- 3. Verify routes:
-- SELECT id, name, driver_id, area FROM public.routes ORDER BY name;

-- 4. Verify route_customers per route:
-- SELECT r.name, COUNT(rc.id) AS customer_count 
-- FROM public.routes r 
-- LEFT JOIN public.route_customers rc ON rc.route_id = r.id 
-- GROUP BY r.name ORDER BY r.name;

-- 5. Verify products:
-- SELECT name, category, default_rate FROM public.products WHERE is_active = true ORDER BY name;

-- 6. Verify stock:
-- SELECT p.name, s.current_quantity FROM public.products p JOIN public.stock s ON s.product_id = p.id;

-- 7. Verify user_profiles linked to roles:
-- SELECT up.id, r.name as role FROM public.user_profiles up JOIN public.roles r ON r.id = up.role_id;
