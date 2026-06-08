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
INSERT INTO products (name, category, unit, default_rate, gst_rate, hsn_code) VALUES
  ('Water Can (20L)', 'can', 'piece', 15.00, 18.00, '2201'),
  ('Cooling Can (20L)', 'can', 'piece', 30.00, 18.00, '2201'),
  ('Water Packets (500ml)', 'packet', 'piece', 5.00, 12.00, '2201'),
  ('500ml Bottle', 'bottle', 'piece', 10.00, 18.00, '2201'),
  ('1L Bottle', 'bottle', 'piece', 20.00, 18.00, '2201'),
  ('2L Bottle', 'bottle', 'piece', 35.00, 18.00, '2201')
ON CONFLICT DO NOTHING;

-- 3. SEED EMPLOYEES (Pre-defined staff members)
INSERT INTO employees (name, role, salary, is_active) VALUES
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
  ('Mallaya', 'driver', 16000, true),
  ('Sai Kumar', 'operator', 20000, true),
  ('Deepak', 'operator', 28000, true),
  ('Prasad', 'marketing', 18000, true)
ON CONFLICT DO NOTHING;

-- 4. SEED DRIVERS (Linked to employees)
INSERT INTO drivers (employee_id, name, phone, salary, is_active)
SELECT id, 'Nagaraju', '8184918757', 12000, true FROM employees WHERE name = 'Nagaraju'
UNION
SELECT id, 'Mallaya', NULL, 16000, true FROM employees WHERE name = 'Mallaya'
ON CONFLICT DO NOTHING;

-- 5. SEED PREDEFINED ROUTES
INSERT INTO routes (name, driver_id, area, description, is_active)
SELECT 'Local Route A', id, 'Main Town', 'Daily local deliveries & shops', true FROM drivers WHERE name = 'Nagaraju'
UNION
SELECT 'Non-Local Highway Route', id, 'Highway Suburbs', 'Long distance bulk dealer distribution', true FROM drivers WHERE name = 'Mallaya'
ON CONFLICT DO NOTHING;

-- 6. SEED FIRST OUTSTANDING CUSTOMER DUES (e.g. Bismillah Dhaba)
INSERT INTO customers (name, phone, area, customer_type, outstanding_amount, credit_limit, is_active) VALUES
  ('Bismillah Dhaba', '9876543210', 'Highway Side', 'route', 125.00, 1000.00, true),
  ('Sri Krishna Hotel', '9876543211', 'Bus Stand Area', 'regular', 2100.00, 3000.00, true),
  ('Metro Water Agency', '9876543212', 'Industrial Zone', 'dealer', 5400.00, 15000.00, true)
ON CONFLICT DO NOTHING;

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
