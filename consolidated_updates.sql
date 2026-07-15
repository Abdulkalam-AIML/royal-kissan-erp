-- ============================================================
-- ROYAL KISSAN ERP - CONSOLIDATED DATABASE SCHEMAS, SEED DATA & SECURITY HARDENING
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/oweutcivgpmzldlcmkvd/sql/new
-- ============================================================

-- 1. PRE-CLEANUP: Safe remap and delete duplicate drivers/routes
DO $$
BEGIN
  -- A. REMAP KNOWN DRIVER REFERENCES
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'sales') THEN
    UPDATE public.sales SET driver_id = 'b097b6a9-8395-4eb8-a720-3057e07662c1'::uuid WHERE driver_id IN (SELECT id FROM public.drivers WHERE name = 'Nagaraju' AND id <> 'b097b6a9-8395-4eb8-a720-3057e07662c1'::uuid);
    UPDATE public.sales SET driver_id = '70c293e7-bae8-4de2-a505-edccfd35f761'::uuid WHERE driver_id IN (SELECT id FROM public.drivers WHERE (name = 'Driver-2' OR name = 'Mallaya') AND id <> '70c293e7-bae8-4de2-a505-edccfd35f761'::uuid);
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'bills') THEN
    UPDATE public.bills SET driver_id = 'b097b6a9-8395-4eb8-a720-3057e07662c1'::uuid WHERE driver_id IN (SELECT id FROM public.drivers WHERE name = 'Nagaraju' AND id <> 'b097b6a9-8395-4eb8-a720-3057e07662c1'::uuid);
    UPDATE public.bills SET driver_id = '70c293e7-bae8-4de2-a505-edccfd35f761'::uuid WHERE driver_id IN (SELECT id FROM public.drivers WHERE (name = 'Driver-2' OR name = 'Mallaya') AND id <> '70c293e7-bae8-4de2-a505-edccfd35f761'::uuid);
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'routes') THEN
    UPDATE public.routes SET driver_id = 'b097b6a9-8395-4eb8-a720-3057e07662c1'::uuid WHERE driver_id IN (SELECT id FROM public.drivers WHERE name = 'Nagaraju' AND id <> 'b097b6a9-8395-4eb8-a720-3057e07662c1'::uuid);
    UPDATE public.routes SET driver_id = '70c293e7-bae8-4de2-a505-edccfd35f761'::uuid WHERE driver_id IN (SELECT id FROM public.drivers WHERE (name = 'Driver-2' OR name = 'Mallaya') AND id <> '70c293e7-bae8-4de2-a505-edccfd35f761'::uuid);
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'route_sales') THEN
    UPDATE public.route_sales SET driver_id = 'b097b6a9-8395-4eb8-a720-3057e07662c1'::uuid WHERE driver_id IN (SELECT id FROM public.drivers WHERE name = 'Nagaraju' AND id <> 'b097b6a9-8395-4eb8-a720-3057e07662c1'::uuid);
    UPDATE public.route_sales SET driver_id = '70c293e7-bae8-4de2-a505-edccfd35f761'::uuid WHERE driver_id IN (SELECT id FROM public.drivers WHERE (name = 'Driver-2' OR name = 'Mallaya') AND id <> '70c293e7-bae8-4de2-a505-edccfd35f761'::uuid);
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'driver_collections') THEN
    UPDATE public.driver_collections SET driver_id = 'b097b6a9-8395-4eb8-a720-3057e07662c1'::uuid WHERE driver_id IN (SELECT id FROM public.drivers WHERE name = 'Nagaraju' AND id <> 'b097b6a9-8395-4eb8-a720-3057e07662c1'::uuid);
    UPDATE public.driver_collections SET driver_id = '70c293e7-bae8-4de2-a505-edccfd35f761'::uuid WHERE driver_id IN (SELECT id FROM public.drivers WHERE (name = 'Driver-2' OR name = 'Mallaya') AND id <> '70c293e7-bae8-4de2-a505-edccfd35f761'::uuid);
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'collections') THEN
    UPDATE public.collections SET driver_id = 'b097b6a9-8395-4eb8-a720-3057e07662c1'::uuid WHERE driver_id IN (SELECT id FROM public.drivers WHERE name = 'Nagaraju' AND id <> 'b097b6a9-8395-4eb8-a720-3057e07662c1'::uuid);
    UPDATE public.collections SET driver_id = '70c293e7-bae8-4de2-a505-edccfd35f761'::uuid WHERE driver_id IN (SELECT id FROM public.drivers WHERE (name = 'Driver-2' OR name = 'Mallaya') AND id <> '70c293e7-bae8-4de2-a505-edccfd35f761'::uuid);
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'driver_sales') THEN
    UPDATE public.driver_sales SET driver_id = 'b097b6a9-8395-4eb8-a720-3057e07662c1'::uuid WHERE driver_id IN (SELECT id FROM public.drivers WHERE name = 'Nagaraju' AND id <> 'b097b6a9-8395-4eb8-a720-3057e07662c1'::uuid);
    UPDATE public.driver_sales SET driver_id = '70c293e7-bae8-4de2-a505-edccfd35f761'::uuid WHERE driver_id IN (SELECT id FROM public.drivers WHERE (name = 'Driver-2' OR name = 'Mallaya') AND id <> '70c293e7-bae8-4de2-a505-edccfd35f761'::uuid);
  END IF;

  -- B. REMAP KNOWN ROUTE REFERENCES
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'sales') THEN
    UPDATE public.sales SET route_id = 'a1111111-1111-1111-1111-111111111111'::uuid WHERE route_id IN (SELECT id FROM public.routes WHERE (name = 'Local Route A' OR name = 'Local Route') AND id <> 'a1111111-1111-1111-1111-111111111111'::uuid);
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'bills') THEN
    UPDATE public.bills SET route_id = 'a1111111-1111-1111-1111-111111111111'::uuid WHERE route_id IN (SELECT id FROM public.routes WHERE (name = 'Local Route A' OR name = 'Local Route') AND id <> 'a1111111-1111-1111-1111-111111111111'::uuid);
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'route_sales') THEN
    UPDATE public.route_sales SET route_id = 'a1111111-1111-1111-1111-111111111111'::uuid WHERE route_id IN (SELECT id FROM public.routes WHERE (name = 'Local Route A' OR name = 'Local Route') AND id <> 'a1111111-1111-1111-1111-111111111111'::uuid);
    UPDATE public.route_sales SET route_id = 'a2222222-2222-2222-2222-222222222222'::uuid WHERE route_id IN (SELECT id FROM public.routes WHERE (name = 'Raghavapuram Route' OR name = 'Non-Local Highway Route') AND id <> 'a2222222-2222-2222-2222-222222222222'::uuid);
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'collections') THEN
    UPDATE public.collections SET route_id = 'a1111111-1111-1111-1111-111111111111'::uuid WHERE route_id IN (SELECT id FROM public.routes WHERE (name = 'Local Route A' OR name = 'Local Route') AND id <> 'a1111111-1111-1111-1111-111111111111'::uuid);
    UPDATE public.collections SET route_id = 'a2222222-2222-2222-2222-222222222222'::uuid WHERE route_id IN (SELECT id FROM public.routes WHERE (name = 'Raghavapuram Route' OR name = 'Non-Local Highway Route') AND id <> 'a2222222-2222-2222-2222-222222222222'::uuid);
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'route_reports') THEN
    UPDATE public.route_reports SET route_id = 'a1111111-1111-1111-1111-111111111111'::uuid WHERE route_id IN (SELECT id FROM public.routes WHERE (name = 'Local Route A' OR name = 'Local Route') AND id <> 'a1111111-1111-1111-1111-111111111111'::uuid);
    UPDATE public.route_reports SET route_id = 'a2222222-2222-2222-2222-222222222222'::uuid WHERE route_id IN (SELECT id FROM public.routes WHERE (name = 'Raghavapuram Route' OR name = 'Non-Local Highway Route') AND id <> 'a2222222-2222-2222-2222-222222222222'::uuid);
    UPDATE public.route_reports SET route_id = 'a3333333-3333-3333-3333-333333333333'::uuid WHERE route_id IN (SELECT id FROM public.routes WHERE name = 'Mukkinavarigudem Route' AND id <> 'a3333333-3333-3333-3333-333333333333'::uuid);
    UPDATE public.route_reports SET route_id = 'a4444444-4444-4444-4444-444444444444'::uuid WHERE route_id IN (SELECT id FROM public.routes WHERE name = 'Dammapeta Route' AND id <> 'a4444444-4444-4444-4444-444444444444'::uuid);
  END IF;

  -- C. SET DRIVER/ROUTE TO NULL FOR ANY OTHER REFERENCE THAT IS NOT HARDCODED (PREVENTS FK VIOLATIONS)
  -- Drivers:
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'sales') THEN
    UPDATE public.sales SET driver_id = NULL WHERE driver_id NOT IN ('b097b6a9-8395-4eb8-a720-3057e07662c1'::uuid, '70c293e7-bae8-4de2-a505-edccfd35f761'::uuid);
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'bills') THEN
    UPDATE public.bills SET driver_id = NULL WHERE driver_id NOT IN ('b097b6a9-8395-4eb8-a720-3057e07662c1'::uuid, '70c293e7-bae8-4de2-a505-edccfd35f761'::uuid);
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'route_expenses') THEN
    UPDATE public.route_expenses SET driver_id = NULL WHERE driver_id NOT IN ('b097b6a9-8395-4eb8-a720-3057e07662c1'::uuid, '70c293e7-bae8-4de2-a505-edccfd35f761'::uuid);
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'route_sales') THEN
    UPDATE public.route_sales SET driver_id = NULL WHERE driver_id NOT IN ('b097b6a9-8395-4eb8-a720-3057e07662c1'::uuid, '70c293e7-bae8-4de2-a505-edccfd35f761'::uuid);
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'collections') THEN
    UPDATE public.collections SET driver_id = NULL WHERE driver_id NOT IN ('b097b6a9-8395-4eb8-a720-3057e07662c1'::uuid, '70c293e7-bae8-4de2-a505-edccfd35f761'::uuid);
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'customer_dues') THEN
    UPDATE public.customer_dues SET driver_id = NULL WHERE driver_id NOT IN ('b097b6a9-8395-4eb8-a720-3057e07662c1'::uuid, '70c293e7-bae8-4de2-a505-edccfd35f761'::uuid);
  END IF;

  -- Routes:
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'sales') THEN
    UPDATE public.sales SET route_id = NULL WHERE route_id NOT IN ('a1111111-1111-1111-1111-111111111111'::uuid, 'a2222222-2222-2222-2222-222222222222'::uuid, 'a3333333-3333-3333-3333-333333333333'::uuid, 'a4444444-4444-4444-4444-444444444444'::uuid);
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'bills') THEN
    UPDATE public.bills SET route_id = NULL WHERE route_id NOT IN ('a1111111-1111-1111-1111-111111111111'::uuid, 'a2222222-2222-2222-2222-222222222222'::uuid, 'a3333333-3333-3333-3333-333333333333'::uuid, 'a4444444-4444-4444-4444-444444444444'::uuid);
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'route_expenses') THEN
    UPDATE public.route_expenses SET route_id = NULL WHERE route_id NOT IN ('a1111111-1111-1111-1111-111111111111'::uuid, 'a2222222-2222-2222-2222-222222222222'::uuid, 'a3333333-3333-3333-3333-333333333333'::uuid, 'a4444444-4444-4444-4444-444444444444'::uuid);
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'route_sales') THEN
    UPDATE public.route_sales SET route_id = NULL WHERE route_id NOT IN ('a1111111-1111-1111-1111-111111111111'::uuid, 'a2222222-2222-2222-2222-222222222222'::uuid, 'a3333333-3333-3333-3333-333333333333'::uuid, 'a4444444-4444-4444-4444-444444444444'::uuid);
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'collections') THEN
    UPDATE public.collections SET route_id = NULL WHERE route_id NOT IN ('a1111111-1111-1111-1111-111111111111'::uuid, 'a2222222-2222-2222-2222-222222222222'::uuid, 'a3333333-3333-3333-3333-333333333333'::uuid, 'a4444444-4444-4444-4444-444444444444'::uuid);
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'customer_dues') THEN
    UPDATE public.customer_dues SET route_id = NULL WHERE route_id NOT IN ('a1111111-1111-1111-1111-111111111111'::uuid, 'a2222222-2222-2222-2222-222222222222'::uuid, 'a3333333-3333-3333-3333-333333333333'::uuid, 'a4444444-4444-4444-4444-444444444444'::uuid);
  END IF;

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

  -- Delete duplicate employees keeping the oldest one
  WITH duplicates AS (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY name ORDER BY created_at ASC NULLS LAST) AS rn
    FROM public.employees
  )
  DELETE FROM public.employees
  WHERE id IN (
    SELECT id FROM duplicates WHERE rn > 1
  );

  -- D. DELETE ORPHANED ROWS IN NON-NULLABLE REFERENCING TABLES
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'driver_sales') THEN
    DELETE FROM public.driver_sales WHERE driver_id NOT IN ('b097b6a9-8395-4eb8-a720-3057e07662c1'::uuid, '70c293e7-bae8-4de2-a505-edccfd35f761'::uuid);
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'route_reports') THEN
    DELETE FROM public.route_reports WHERE route_id NOT IN ('a1111111-1111-1111-1111-111111111111'::uuid, 'a2222222-2222-2222-2222-222222222222'::uuid, 'a3333333-3333-3333-3333-333333333333'::uuid, 'a4444444-4444-4444-4444-444444444444'::uuid);
  END IF;
END $$;

-- Delete non-hardcoded duplicate routes
DELETE FROM public.routes 
WHERE id NOT IN (
  'a1111111-1111-1111-1111-111111111111'::uuid,
  'a2222222-2222-2222-2222-222222222222'::uuid,
  'a3333333-3333-3333-3333-333333333333'::uuid,
  'a4444444-4444-4444-4444-444444444444'::uuid
);

-- Delete non-hardcoded duplicate drivers
DELETE FROM public.drivers
WHERE id NOT IN (
  'b097b6a9-8395-4eb8-a720-3057e07662c1'::uuid,
  '70c293e7-bae8-4de2-a505-edccfd35f761'::uuid
);

-- 2. SEED DEFAULT SYSTEM ROLES
INSERT INTO roles (name, description, permissions) VALUES
  ('admin', 'Full access owner with delete permissions', '{"all": true}'),
  ('worker', 'Billing operator with restricted access (no delete permissions)', '{"billing": true, "sales": true, "deliveries": true}')
ON CONFLICT (name) DO NOTHING;

-- 3. SEED SYSTEM PRODUCTS
INSERT INTO products (name, category, unit, default_rate, gst_rate, hsn_code)
SELECT name, category, unit, default_rate, gst_rate, hsn_code
FROM (VALUES
  ('Water Can (20L)', 'can', 'piece', 15.00, 18.00, '2201'),
  ('Cooling Can (20L)', 'can', 'piece', 30.00, 18.00, '2201'),
  ('Water Packets (500ml)', 'packet', 'piece', 5.00, 12.00, '2201'),
  ('500ml Bottle', 'bottle', 'piece', 10.00, 18.00, '2201'),
  ('1L Bottle', 'bottle', 'piece', 20.00, 18.00, '2201'),
  ('2L Bottle', 'bottle', 'piece', 35.00, 18.00, '2201')
) AS new_prods(name, category, unit, default_rate, gst_rate, hsn_code)
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE products.name = new_prods.name
);

-- 4. SEED EMPLOYEES
INSERT INTO employees (name, role, salary, is_active)
SELECT name, role, salary, is_active
FROM (VALUES
  ('Arifa', 'manager', 0, true),
  ('Akhila', 'worker', 0, true),
  ('Lakshmi', 'worker', 0, true),
  ('Dhana Lakshmi', 'worker', 0, true),
  ('Parvathi', 'worker', 0, true),
  ('Swarna Latha', 'worker', 0, true),
  ('Rama Devi', 'worker', 0, true),
  ('Mallika', 'worker', 0, true),
  ('Sirisha', 'worker', 0, true),
  ('Nagaraju', 'driver', 12000, true),
  ('Driver-2', 'driver', 16000, true),
  ('Sai Kumar', 'operator', 20000, true),
  ('Deepak', 'operator', 28000, true),
  ('Prasad', 'marketing', 18000, true)
) AS new_emps(name, role, salary, is_active)
WHERE NOT EXISTS (
  SELECT 1 FROM employees WHERE employees.name = new_emps.name
);

-- 5. SEED DRIVERS (Linked to employees with correct UUIDs)
INSERT INTO drivers (id, employee_id, name, phone, salary, is_active)
SELECT 'b097b6a9-8395-4eb8-a720-3057e07662c1'::uuid, (SELECT id FROM employees WHERE name = 'Nagaraju' LIMIT 1), 'Nagaraju', '8184918757', 12000, true
WHERE NOT EXISTS (SELECT 1 FROM drivers WHERE id = 'b097b6a9-8395-4eb8-a720-3057e07662c1'::uuid)
UNION ALL
SELECT '70c293e7-bae8-4de2-a505-edccfd35f761'::uuid, (SELECT id FROM employees WHERE name = 'Driver-2' LIMIT 1), 'Driver-2', NULL, 16000, true
WHERE NOT EXISTS (SELECT 1 FROM drivers WHERE id = '70c293e7-bae8-4de2-a505-edccfd35f761'::uuid);

-- 6. SEED PREDEFINED ROUTES
INSERT INTO routes (id, name, driver_id, area, is_active)
SELECT 'a1111111-1111-1111-1111-111111111111'::uuid, 'Local Route', 'b097b6a9-8395-4eb8-a720-3057e07662c1'::uuid, 'Local Area', true
WHERE NOT EXISTS (SELECT 1 FROM routes WHERE id = 'a1111111-1111-1111-1111-111111111111'::uuid)
UNION ALL
SELECT 'a2222222-2222-2222-2222-222222222222'::uuid, 'Raghavapuram Route', '70c293e7-bae8-4de2-a505-edccfd35f761'::uuid, 'Raghavapuram', true
WHERE NOT EXISTS (SELECT 1 FROM routes WHERE id = 'a2222222-2222-2222-2222-222222222222'::uuid)
UNION ALL
SELECT 'a3333333-3333-3333-3333-333333333333'::uuid, 'Mukkinavarigudem Route', '70c293e7-bae8-4de2-a505-edccfd35f761'::uuid, 'Mukkinavarigudem', true
WHERE NOT EXISTS (SELECT 1 FROM routes WHERE id = 'a3333333-3333-3333-3333-333333333333'::uuid)
UNION ALL
SELECT 'a4444444-4444-4444-4444-444444444444'::uuid, 'Dammapeta Route', '70c293e7-bae8-4de2-a505-edccfd35f761'::uuid, 'Dammapeta', true
WHERE NOT EXISTS (SELECT 1 FROM routes WHERE id = 'a4444444-4444-4444-4444-444444444444'::uuid);

-- 7. SEED FIRST OUTSTANDING CUSTOMER DUES
INSERT INTO customers (name, phone, area, customer_type, outstanding_amount, credit_limit, is_active)
SELECT name, phone, area, customer_type, outstanding_amount, credit_limit, is_active
FROM (VALUES
  ('Bismillah Dhaba', '9876543210', 'Highway Side', 'route', 125.00, 1000.00, true),
  ('Sri Krishna Hotel', '9876543211', 'Bus Stand Area', 'regular', 2100.00, 3000.00, true),
  ('Metro Water Agency', '9876543212', 'Industrial Zone', 'dealer', 5400.00, 15000.00, true)
) AS new_custs(name, phone, area, customer_type, outstanding_amount, credit_limit, is_active)
WHERE NOT EXISTS (
  SELECT 1 FROM customers WHERE customers.name = new_custs.name
);

-- 8. SEED COMPANY SETTINGS
INSERT INTO settings (key, value, description) VALUES
  ('company_name', 'ROYAL KISSAN PACKAGED DRINKING WATER', 'Company Name'),
  ('company_address', 'Sy. No. 42, Guntur Highway Road, Guntur, AP, India', 'Company Address'),
  ('company_phone', '+91 8184918757', 'Company Contact Phone'),
  ('company_gst', '37AAAAA0000A1Z5', 'Company GST Registration Number'),
  ('company_email', 'royalkissan@gmail.com', 'Company Email Address'),
  ('invoice_prefix', 'RK', 'Invoice Number Prefix'),
  ('invoice_counter', '1001', 'Default Invoice Starting Counter')
ON CONFLICT (key) DO NOTHING;

-- 9. DROP CONFLICTING VIEW IF EXISTS
DROP VIEW IF EXISTS public.customer_dues CASCADE;

-- 10. CREATE NEW TABLES FOR SALES MANAGEMENT
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

-- Make customer_name unique in customer_dues to support Upsert easily
ALTER TABLE public.customer_dues DROP CONSTRAINT IF EXISTS customer_dues_cust_name_key;
ALTER TABLE public.customer_dues ADD CONSTRAINT customer_dues_cust_name_key UNIQUE (customer_name);

-- 11. ENABLE ROW LEVEL SECURITY (RLS) ON ALL NEW TABLES
ALTER TABLE public.route_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_dues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_performance ENABLE ROW LEVEL SECURITY;

-- 12. CREATE RLS POLICIES FOR NEW TABLES
DROP POLICY IF EXISTS route_customers_all ON public.route_customers;
CREATE POLICY "route_customers_all" ON public.route_customers FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

DROP POLICY IF EXISTS route_sales_all ON public.route_sales;
CREATE POLICY "route_sales_all" ON public.route_sales FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

DROP POLICY IF EXISTS driver_collections_all ON public.driver_collections;
CREATE POLICY "driver_collections_all" ON public.driver_collections FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

DROP POLICY IF EXISTS customer_dues_all ON public.customer_dues;
CREATE POLICY "customer_dues_all" ON public.customer_dues FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

DROP POLICY IF EXISTS daily_reports_all ON public.daily_reports;
CREATE POLICY "daily_reports_all" ON public.daily_reports FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

DROP POLICY IF EXISTS monthly_reports_all ON public.monthly_reports;
CREATE POLICY "monthly_reports_all" ON public.monthly_reports FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

DROP POLICY IF EXISTS driver_perf_all ON public.driver_performance;
CREATE POLICY "driver_perf_all" ON public.driver_performance FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

DROP POLICY IF EXISTS route_perf_all ON public.route_performance;
CREATE POLICY "route_perf_all" ON public.route_performance FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

-- 13. DATABASE TRIGGERS TO AUTO-UPDATE REPORTS & OUTSTANDING DUES ON SALES INSERTS
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
DROP TRIGGER IF EXISTS on_route_sale_inserted ON public.route_sales;
CREATE TRIGGER on_route_sale_inserted
  AFTER INSERT ON public.route_sales
  FOR EACH ROW EXECUTE FUNCTION public.sync_route_sales_data();

-- 14. PRE-SEED ROUTE CUSTOMERS
TRUNCATE TABLE public.route_customers CASCADE;
-- Local Route (Cans, Bags, Bottles)
INSERT INTO public.route_customers (route_id, name, section, default_qty, default_rate, product_name) VALUES
  ('a1111111-1111-1111-1111-111111111111'::uuid, 'Bismillah Dhaba', 'cans', 15, 15.00, 'Water Can (20L)'),
  ('a1111111-1111-1111-1111-111111111111'::uuid, 'Vamsi Mess', 'cans', 15, 15.00, 'Water Can (20L)'),
  ('a1111111-1111-1111-1111-111111111111'::uuid, 'Lithu', 'cans', 15, 15.00, 'Water Can (20L)'),
  ('a1111111-1111-1111-1111-111111111111'::uuid, 'Tiffin Center-1', 'cans', 4, 15.00, 'Water Can (20L)'),
  ('a1111111-1111-1111-1111-111111111111'::uuid, 'Tea Stall', 'cans', 5, 15.00, 'Water Can (20L)'),
  ('a1111111-1111-1111-1111-111111111111'::uuid, 'Juices Point', 'cans', 20, 15.00, 'Water Can (20L)'),
  ('a1111111-1111-1111-1111-111111111111'::uuid, 'Surendra Juices Point', 'cans', 20, 20.00, 'Water Can (20L)'),
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
  ('a1111111-1111-1111-1111-111111111111'::uuid, 'State Bank of India', 'cans', 0, 30.00, 'Water Can (20L)'),
  ('a1111111-1111-1111-1111-111111111111'::uuid, 'Fire Station', 'cans', 0, 30.00, 'Water Can (20L)'),
  ('a1111111-1111-1111-1111-111111111111'::uuid, 'Amaravati Wines', 'bags', 0, 75.00, 'Bags (100 Pack)'),
  ('a1111111-1111-1111-1111-111111111111'::uuid, 'Balaji Wines', 'bags', 0, 80.00, 'Bags (100 Pack)'),
  ('a1111111-1111-1111-1111-111111111111'::uuid, 'Shop-1', 'bags', 0, 100.00, 'Bags (100 Pack)'),
  ('a1111111-1111-1111-1111-111111111111'::uuid, 'Bala Sundari Shop', 'bags', 0, 95.00, 'Bags (100 Pack)'),
  ('a1111111-1111-1111-1111-111111111111'::uuid, 'Shop-2', 'bags', 0, 90.00, 'Bags (100 Pack)'),
  ('a1111111-1111-1111-1111-111111111111'::uuid, 'Shop-3', 'bags', 0, 90.00, 'Bags (100 Pack)'),
  ('a1111111-1111-1111-1111-111111111111'::uuid, 'Shop-4', 'bags', 0, 90.00, 'Bags (100 Pack)'),
  ('a1111111-1111-1111-1111-111111111111'::uuid, 'Route Sale', 'bags', 0, 100.00, 'Bags (100 Pack)'),
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
  ('a1111111-1111-1111-1111-111111111111'::uuid, 'Shop-4 (500ml)', 'bottles', 0, 135.00, '500ml Bottle')
ON CONFLICT DO NOTHING;

-- Raghavapuram Route (Non-Local)
INSERT INTO public.route_customers (route_id, name, section, default_qty, default_rate, product_name) VALUES
  ('a2222222-2222-2222-2222-222222222222'::uuid, 'Raghavapuram Wines', 'bags', 0, 80.00, 'Bags (100 Pack)'),
  ('a2222222-2222-2222-2222-222222222222'::uuid, 'Gandicherla', 'bags', 0, 90.00, 'Bags (100 Pack)'),
  ('a2222222-2222-2222-2222-222222222222'::uuid, 'DN Rao Peta', 'bags', 0, 90.00, 'Bags (100 Pack)'),
  ('a2222222-2222-2222-2222-222222222222'::uuid, 'Route Sale-1', 'bags', 0, 100.00, 'Bags (100 Pack)'),
  ('a2222222-2222-2222-2222-222222222222'::uuid, 'Route Sale-2', 'bags', 0, 90.00, 'Bags (100 Pack)'),
  ('a2222222-2222-2222-2222-222222222222'::uuid, 'Water Can', 'cans', 0, 30.00, 'Water Can (20L)'),
  ('a2222222-2222-2222-2222-222222222222'::uuid, '1L Cases', 'bottles', 0, 120.00, '1L Bottle'),
  ('a2222222-2222-2222-2222-222222222222'::uuid, '500ML Cases', 'bottles', 0, 140.00, '500ml Bottle')
ON CONFLICT DO NOTHING;

-- Mukkinavarigudem Route (Non-Local)
INSERT INTO public.route_customers (route_id, name, section, default_qty, default_rate, product_name) VALUES
  ('a3333333-3333-3333-3333-333333333333'::uuid, 'Makkinavarigudem Wines', 'bags', 0, 75.00, 'Bags (100 Pack)'),
  ('a3333333-3333-3333-3333-333333333333'::uuid, 'Aunty Shop (Bags)', 'bags', 0, 80.00, 'Bags (100 Pack)'),
  ('a3333333-3333-3333-3333-333333333333'::uuid, 'Wine Shop (Bottles)', 'bottles', 0, 110.00, '500ml Bottle'),
  ('a3333333-3333-3333-3333-333333333333'::uuid, 'Aunty Shop (Bottles)', 'bottles', 0, 120.00, '500ml Bottle')
ON CONFLICT DO NOTHING;

-- Dammapeta Route (Non-Local)
INSERT INTO public.route_customers (route_id, name, section, default_qty, default_rate, product_name) VALUES
  ('a4444444-4444-4444-4444-444444444444'::uuid, 'Wine Shop-1', 'bags', 0, 75.00, 'Bags (100 Pack)'),
  ('a4444444-4444-4444-4444-444444444444'::uuid, 'Wine Shop-2', 'bags', 0, 75.00, 'Bags (100 Pack)'),
  ('a4444444-4444-4444-4444-444444444444'::uuid, 'Wine Shop-3', 'bags', 0, 75.00, 'Bags (100 Pack)')
ON CONFLICT DO NOTHING;

-- 15. CREATE STOPS TABLE
DROP TABLE IF EXISTS public.route_stops CASCADE;
CREATE TABLE public.route_stops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  route_id UUID REFERENCES public.routes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  stop_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(route_id, name)
);

-- 16. CREATE ROUTE EXPENSES TABLE
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

-- ENABLE RLS on stops and expenses
ALTER TABLE public.route_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_expenses ENABLE ROW LEVEL SECURITY;

-- CREATE RLS POLICIES
DROP POLICY IF EXISTS route_stops_all ON public.route_stops;
CREATE POLICY "route_stops_all" ON public.route_stops FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

DROP POLICY IF EXISTS route_expenses_all ON public.route_expenses;
CREATE POLICY "route_expenses_all" ON public.route_expenses FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

-- SEED DATA FOR STOPS (FOR THE 3 NON-LOCAL ROUTES)
-- Raghavapuram Route stops
INSERT INTO public.route_stops (route_id, name, stop_order) VALUES
  ('a2222222-2222-2222-2222-222222222222'::uuid, 'Raghavapuram Wines', 1),
  ('a2222222-2222-2222-2222-222222222222'::uuid, 'Gandicherla', 2),
  ('a2222222-2222-2222-2222-222222222222'::uuid, 'DN Rao Peta', 3),
  ('a2222222-2222-2222-2222-222222222222'::uuid, 'Route Sale-1', 4),
  ('a2222222-2222-2222-2222-222222222222'::uuid, 'Route Sale-2', 5)
ON CONFLICT DO NOTHING;

-- Mukkinavarigudem Route stops
INSERT INTO public.route_stops (route_id, name, stop_order) VALUES
  ('a3333333-3333-3333-3333-333333333333'::uuid, 'Makkinavarigudem Wines', 1),
  ('a3333333-3333-3333-3333-333333333333'::uuid, 'Aunty Shop (Bags)', 2),
  ('a3333333-3333-3333-3333-333333333333'::uuid, 'Wine Shop (Bottles)', 3),
  ('a3333333-3333-3333-3333-333333333333'::uuid, 'Aunty Shop (Bottles)', 4)
ON CONFLICT DO NOTHING;

-- Dammapeta Route stops
INSERT INTO public.route_stops (route_id, name, stop_order) VALUES
  ('a4444444-4444-4444-4444-444444444444'::uuid, 'Wine Shop-1', 1),
  ('a4444444-4444-4444-4444-444444444444'::uuid, 'Wine Shop-2', 2),
  ('a4444444-4444-4444-4444-444444444444'::uuid, 'Wine Shop-3', 3)
ON CONFLICT DO NOTHING;

-- 17. ADD EMPLOYEE_ID COLUMN TO EMPLOYEES TABLE
ALTER TABLE employees 
  ADD COLUMN IF NOT EXISTS employee_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS date_joined DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS advance_amount NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bonus_amount NUMERIC(10,2) DEFAULT 0;

-- 18. AUTO-GENERATE BABS EMPLOYEE CODES
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

-- 19. CREATE TRIGGER FOR AUTO EMPLOYEE CODE ON INSERT
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

-- 20. UPDATE PRODUCTS TABLE WITH CORRECT RATES AND CATEGORIES
TRUNCATE TABLE products RESTART IDENTITY CASCADE;

INSERT INTO products (name, category, unit, default_rate, gst_rate, hsn_code, is_active) VALUES
  ('Water Can (20L)',     'can',    'piece', 15.00,  18.00, '2201', TRUE),
  ('Cooling Can (20L)',   'can',    'piece', 30.00,  18.00, '2201', TRUE),
  ('Water Packets',       'packet', 'piece',  0.00,  12.00, '2201', TRUE),  -- Manual price
  ('500ml Bottle Case',   'bottle', 'case', 140.00,  18.00, '2201', TRUE),
  ('250ml Bottle Case',   'bottle', 'case', 150.00,  18.00, '2201', TRUE),
  ('1L Bottle Case',      'bottle', 'case', 120.00,  18.00, '2201', TRUE),
  ('2L Bottle Case',      'bottle', 'case', 150.00,  18.00, '2201', TRUE)
ON CONFLICT (name) DO NOTHING;

-- 21. ADD INVOICE_TYPE COLUMN TO SALES TABLE
ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS invoice_type TEXT DEFAULT 'company_sale'
    CHECK (invoice_type IN ('driver_sale','company_sale','dealer_invoice','gst_invoice','non_gst_invoice')),
  ADD COLUMN IF NOT EXISTS shipped_to TEXT,
  ADD COLUMN IF NOT EXISTS is_gst BOOLEAN DEFAULT TRUE;

-- 22. ADD INVOICE_TYPE TO ROUTE_SALES TABLE  
ALTER TABLE route_sales
  ADD COLUMN IF NOT EXISTS invoice_type TEXT DEFAULT 'driver_sale',
  ADD COLUMN IF NOT EXISTS is_gst BOOLEAN DEFAULT TRUE;

-- 23. ADD MISSING STOCK CATEGORIES
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

-- 24. ADD stock_item_id TO stock_transactions
ALTER TABLE stock_transactions
  ADD COLUMN IF NOT EXISTS stock_item_id UUID REFERENCES stock_items(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS item_name TEXT;

-- 25. DEALER UPDATES
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS dealer_code TEXT,
  ADD COLUMN IF NOT EXISTS mobile TEXT,
  ADD COLUMN IF NOT EXISTS gst_number TEXT,
  ADD COLUMN IF NOT EXISTS credit_limit NUMERIC(10,2) DEFAULT 50000;

-- 26. ADD EMPLOYEES FROM SEED LIST
INSERT INTO employees (name, role, salary, is_active, phone)
SELECT name, role, salary, is_active, phone
FROM (VALUES
  ('Arifa',         'manager',   0::numeric,     true, NULL::text),
  ('Akhila',        'worker',    0::numeric,     true, NULL::text),
  ('Lakshmi',       'worker',    0::numeric,     true, NULL::text),
  ('Dhana Lakshmi', 'worker',    0::numeric,     true, NULL::text),
  ('Parvathi',      'worker',    0::numeric,     true, NULL::text),
  ('Swarna Latha',  'worker',    0::numeric,     true, NULL::text),
  ('Rama Devi',     'worker',    0::numeric,     true, NULL::text),
  ('Mallika',       'worker',    0::numeric,     true, NULL::text),
  ('Sirisha',       'worker',    0::numeric,     true, NULL::text),
  ('Nagaraju',      'driver',  12000::numeric,  true, '8184918757'::text),
  ('Driver-2',      'driver',  16000::numeric,  true, NULL::text),
  ('Sai Kumar',     'operator', 20000::numeric, true, NULL::text),
  ('Deepak',        'operator', 28000::numeric, true, NULL::text),
  ('Prasad',        'marketing',18000::numeric, true, NULL::text)
) AS new_emps(name, role, salary, is_active, phone)
WHERE NOT EXISTS (
  SELECT 1 FROM employees WHERE employees.name = new_emps.name
);

-- 27. TASK 1: FIX SECURITY DEFINER VIEWS
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

DROP VIEW IF EXISTS public.customer_dues CASCADE;

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

-- 28. TASK 2 & 3: FIX MUTABLE SEARCH PATH & SECURE PUBLIC FUNCTIONS
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql 
SECURITY INVOKER 
SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT r.name FROM public.user_profiles up
  JOIN public.roles r ON r.id = up.role_id
  WHERE up.id = auth.uid()
$$ LANGUAGE SQL 
SECURITY DEFINER 
SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.get_user_role() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated;

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

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'rls_auto_enable') THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated';
  END IF;
END $$;

-- 29. TASK 4: GRANULAR RLS POLICY AUDIT & HARDENING
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
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = v_tbl) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', v_tbl);

      -- Drop old legacy policies to ensure only hardened policies remain
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
      
      -- Set strict policies for authenticated users
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', v_tbl || '_select', v_tbl);
      EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (TRUE)', v_tbl || '_select', v_tbl);

      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', v_tbl || '_insert', v_tbl);
      EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (TRUE)', v_tbl || '_insert', v_tbl);

      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', v_tbl || '_update', v_tbl);
      EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (TRUE) WITH CHECK (TRUE)', v_tbl || '_update', v_tbl);

      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', v_tbl || '_delete', v_tbl);
      EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (public.get_user_role() = %L)', v_tbl || '_delete', v_tbl, 'admin');
    END IF;
  END LOOP;
END $$;

-- 30. SPECIAL ADMIN-ONLY TABLES
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "employees_select" ON public.employees;
DROP POLICY IF EXISTS "employees_insert" ON public.employees;
DROP POLICY IF EXISTS "employees_update" ON public.employees;
DROP POLICY IF EXISTS "employees_delete" ON public.employees;
CREATE POLICY "employees_select" ON public.employees FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "employees_insert" ON public.employees FOR INSERT TO authenticated WITH CHECK (public.get_user_role() = 'admin');
CREATE POLICY "employees_update" ON public.employees FOR UPDATE TO authenticated USING (public.get_user_role() = 'admin');
CREATE POLICY "employees_delete" ON public.employees FOR DELETE TO authenticated USING (public.get_user_role() = 'admin');

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'salary_payments') THEN
    ALTER TABLE public.salary_payments ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "salary_select" ON public.salary_payments;
    DROP POLICY IF EXISTS "salary_insert" ON public.salary_payments;
    DROP POLICY IF EXISTS "salary_update" ON public.salary_payments;
    DROP POLICY IF EXISTS "salary_delete" ON public.salary_payments;
    EXECUTE 'CREATE POLICY salary_select ON public.salary_payments FOR SELECT TO authenticated USING (TRUE)';
    EXECUTE 'CREATE POLICY salary_insert ON public.salary_payments FOR INSERT TO authenticated WITH CHECK (public.get_user_role() = ''admin'')';
    EXECUTE 'CREATE POLICY salary_update ON public.salary_payments FOR UPDATE TO authenticated USING (public.get_user_role() = ''admin'')';
    EXECUTE 'CREATE POLICY salary_delete ON public.salary_payments FOR DELETE TO authenticated USING (public.get_user_role() = ''admin'')';
  END IF;
END $$;

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "settings_select" ON public.settings;
DROP POLICY IF EXISTS "settings_insert" ON public.settings;
DROP POLICY IF EXISTS "settings_update" ON public.settings;
DROP POLICY IF EXISTS "settings_delete" ON public.settings;
CREATE POLICY "settings_select" ON public.settings FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "settings_insert" ON public.settings FOR INSERT TO authenticated WITH CHECK (public.get_user_role() = 'admin');
CREATE POLICY "settings_update" ON public.settings FOR UPDATE TO authenticated USING (public.get_user_role() = 'admin');
CREATE POLICY "settings_delete" ON public.settings FOR DELETE TO authenticated USING (public.get_user_role() = 'admin');

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_profiles_select" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_insert" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_update" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_delete" ON public.user_profiles;
CREATE POLICY "user_profiles_select" ON public.user_profiles FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "user_profiles_insert" ON public.user_profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid() OR public.get_user_role() = 'admin');
CREATE POLICY "user_profiles_update" ON public.user_profiles FOR UPDATE TO authenticated USING (id = auth.uid() OR public.get_user_role() = 'admin');
CREATE POLICY "user_profiles_delete" ON public.user_profiles FOR DELETE TO authenticated USING (public.get_user_role() = 'admin');

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audit_logs_select" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert" ON public.audit_logs;
CREATE POLICY "audit_logs_select" ON public.audit_logs FOR SELECT TO authenticated USING (public.get_user_role() = 'admin');
CREATE POLICY "audit_logs_insert" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (TRUE);
