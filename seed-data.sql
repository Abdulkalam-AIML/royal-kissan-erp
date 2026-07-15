-- ============================================================
-- ROYAL KISSAN ERP - DATABASE SEED DATA (seed-data.sql)
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. SEED DEFAULT SYSTEM ROLES (If not already present)
INSERT INTO roles (name, description, permissions) VALUES
  ('admin', 'Full access owner with delete permissions', '{"all": true}'),
  ('worker', 'Billing operator with restricted access (no delete permissions)', '{"billing": true, "sales": true, "deliveries": true}')
ON CONFLICT (name) DO NOTHING;

-- 2. SEED SYSTEM PRODUCTS
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

-- 3. SEED EMPLOYEES (Pre-defined staff members)
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

-- 4. SEED DRIVERS (Linked to employees)
INSERT INTO drivers (id, employee_id, name, phone, salary, is_active)
SELECT 'b097b6a9-8395-4eb8-a720-3057e07662c1'::uuid, (SELECT id FROM employees WHERE name = 'Nagaraju' LIMIT 1), 'Nagaraju', '8184918757', 12000, true
WHERE NOT EXISTS (SELECT 1 FROM drivers WHERE id = 'b097b6a9-8395-4eb8-a720-3057e07662c1'::uuid)
UNION ALL
SELECT '70c293e7-bae8-4de2-a505-edccfd35f761'::uuid, (SELECT id FROM employees WHERE name = 'Driver-2' LIMIT 1), 'Driver-2', NULL, 16000, true
WHERE NOT EXISTS (SELECT 1 FROM drivers WHERE id = '70c293e7-bae8-4de2-a505-edccfd35f761'::uuid);

-- 5. SEED PREDEFINED ROUTES
INSERT INTO routes (id, name, driver_id, area, description, is_active)
SELECT 'a1111111-1111-1111-1111-111111111111'::uuid, 'Local Route', 'b097b6a9-8395-4eb8-a720-3057e07662c1'::uuid, 'Local Area', 'Daily local deliveries & shops', true
WHERE NOT EXISTS (SELECT 1 FROM routes WHERE id = 'a1111111-1111-1111-1111-111111111111'::uuid)
UNION ALL
SELECT 'a2222222-2222-2222-2222-222222222222'::uuid, 'Raghavapuram Route', '70c293e7-bae8-4de2-a505-edccfd35f761'::uuid, 'Raghavapuram', 'Long distance bulk dealer distribution', true
WHERE NOT EXISTS (SELECT 1 FROM routes WHERE id = 'a2222222-2222-2222-2222-222222222222'::uuid)
UNION ALL
SELECT 'a3333333-3333-3333-3333-333333333333'::uuid, 'Mukkinavarigudem Route', '70c293e7-bae8-4de2-a505-edccfd35f761'::uuid, 'Mukkinavarigudem', 'Makkinavarigudem route deliveries', true
WHERE NOT EXISTS (SELECT 1 FROM routes WHERE id = 'a3333333-3333-3333-3333-333333333333'::uuid)
UNION ALL
SELECT 'a4444444-4444-4444-4444-444444444444'::uuid, 'Dammapeta Route', '70c293e7-bae8-4de2-a505-edccfd35f761'::uuid, 'Dammapeta', 'Dammapeta route deliveries', true
WHERE NOT EXISTS (SELECT 1 FROM routes WHERE id = 'a4444444-4444-4444-4444-444444444444'::uuid);

-- 6. SEED FIRST OUTSTANDING CUSTOMER DUES (e.g. Bismillah Dhaba)
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

-- 7. SEED COMPANY SETTINGS (Default Setup)
INSERT INTO settings (key, value, description) VALUES
  ('company_name', 'ROYAL KISSAN PACKAGED DRINKING WATER', 'Company Name'),
  ('company_address', 'Sy. No. 42, Guntur Highway Road, Guntur, AP, India', 'Company Address'),
  ('company_phone', '+91 8184918757', 'Company Contact Phone'),
  ('company_gst', '37AAAAA0000A1Z5', 'Company GST Registration Number'),
  ('company_email', 'royalkissan@gmail.com', 'Company Email Address'),
  ('invoice_prefix', 'RK', 'Invoice Number Prefix'),
  ('invoice_counter', '1001', 'Default Invoice Starting Counter')
ON CONFLICT (key) DO NOTHING;
