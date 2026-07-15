const fs = require('fs');
const path = require('path');

const projectDir = '/Users/abdulkalam/Desktop/ROLLY ERP/royal-kissan-erp';

// 1. UPDATE seed-data.sql
const seedDataPath = path.join(projectDir, 'seed-data.sql');
if (fs.existsSync(seedDataPath)) {
  let content = fs.readFileSync(seedDataPath, 'utf8');

  // Replace employees seeding
  const oldEmpSeeding = `INSERT INTO employees (name, role, salary, is_active) VALUES
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
ON CONFLICT DO NOTHING;`;

  const newEmpSeeding = `INSERT INTO employees (name, role, salary, is_active)
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
);`;

  content = content.replace(oldEmpSeeding, newEmpSeeding);

  // Replace drivers seeding
  const oldDriverSeeding = `INSERT INTO drivers (employee_id, name, phone, salary, is_active)
SELECT id, 'Nagaraju', '8184918757', 12000, true FROM employees WHERE name = 'Nagaraju'
UNION
SELECT id, 'Driver-2', NULL, 16000, true FROM employees WHERE name = 'Driver-2'
ON CONFLICT DO NOTHING;`;

  const newDriverSeeding = `INSERT INTO drivers (employee_id, name, phone, salary, is_active)
SELECT (SELECT id FROM employees WHERE name = 'Nagaraju' LIMIT 1), 'Nagaraju', '8184918757', 12000, true
WHERE NOT EXISTS (SELECT 1 FROM drivers WHERE name = 'Nagaraju')
UNION
SELECT (SELECT id FROM employees WHERE name = 'Driver-2' LIMIT 1), 'Driver-2', NULL, 16000, true
WHERE NOT EXISTS (SELECT 1 FROM drivers WHERE name = 'Driver-2');`;

  content = content.replace(oldDriverSeeding, newDriverSeeding);

  // Replace routes seeding
  const oldRouteSeeding = `INSERT INTO routes (name, driver_id, area, description, is_active)
SELECT 'Local Route A', id, 'Main Town', 'Daily local deliveries & shops', true FROM drivers WHERE name = 'Nagaraju'
UNION
SELECT 'Non-Local Highway Route', id, 'Highway Suburbs', 'Long distance bulk dealer distribution', true FROM drivers WHERE name = 'Driver-2'
ON CONFLICT DO NOTHING;`;

  const newRouteSeeding = `INSERT INTO routes (name, driver_id, area, description, is_active)
SELECT 'Local Route A', (SELECT id FROM drivers WHERE name = 'Nagaraju' LIMIT 1), 'Main Town', 'Daily local deliveries & shops', true
WHERE NOT EXISTS (SELECT 1 FROM routes WHERE name = 'Local Route A')
UNION
SELECT 'Non-Local Highway Route', (SELECT id FROM drivers WHERE name = 'Driver-2' LIMIT 1), 'Highway Suburbs', 'Long distance bulk dealer distribution', true
WHERE NOT EXISTS (SELECT 1 FROM routes WHERE name = 'Non-Local Highway Route');`;

  content = content.replace(oldRouteSeeding, newRouteSeeding);

  // Replace customers seeding
  const oldCustSeeding = `INSERT INTO customers (name, phone, area, customer_type, outstanding_amount, credit_limit, is_active) VALUES
  ('Bismillah Dhaba', '9876543210', 'Highway Side', 'route', 125.00, 1000.00, true),
  ('Sri Krishna Hotel', '9876543211', 'Bus Stand Area', 'regular', 2100.00, 3000.00, true),
  ('Metro Water Agency', '9876543212', 'Industrial Zone', 'dealer', 5400.00, 15000.00, true)
ON CONFLICT DO NOTHING;`;

  const newCustSeeding = `INSERT INTO customers (name, phone, area, customer_type, outstanding_amount, credit_limit, is_active)
SELECT name, phone, area, customer_type, outstanding_amount, credit_limit, is_active
FROM (VALUES
  ('Bismillah Dhaba', '9876543210', 'Highway Side', 'route', 125.00, 1000.00, true),
  ('Sri Krishna Hotel', '9876543211', 'Bus Stand Area', 'regular', 2100.00, 3000.00, true),
  ('Metro Water Agency', '9876543212', 'Industrial Zone', 'dealer', 5400.00, 15000.00, true)
) AS new_custs(name, phone, area, customer_type, outstanding_amount, credit_limit, is_active)
WHERE NOT EXISTS (
  SELECT 1 FROM customers WHERE customers.name = new_custs.name
);`;

  content = content.replace(oldCustSeeding, newCustSeeding);

  fs.writeFileSync(seedDataPath, content, 'utf8');
  console.log('seed-data.sql updated.');
}

// 2. UPDATE supabase-route-sales.sql
const routeSalesPath = path.join(projectDir, 'supabase-route-sales.sql');
if (fs.existsSync(routeSalesPath)) {
  let content = fs.readFileSync(routeSalesPath, 'utf8');

  // Add Truncate route_customers
  const targetStr = `-- 8. PRE-SEED ROUTE CUSTOMERS`;
  if (content.includes(targetStr) && !content.includes('TRUNCATE TABLE public.route_customers')) {
    content = content.replace(targetStr, `${targetStr}\nTRUNCATE TABLE public.route_customers CASCADE;`);
  }

  fs.writeFileSync(routeSalesPath, content, 'utf8');
  console.log('supabase-route-sales.sql updated.');
}

// 3. UPDATE supabase-updates.sql
const updatesPath = path.join(projectDir, 'supabase-updates.sql');
if (fs.existsSync(updatesPath)) {
  let content = fs.readFileSync(updatesPath, 'utf8');

  // Replace employees seeding
  const oldEmpSeeding = `INSERT INTO employees (name, role, salary, is_active, phone) VALUES
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
  ('Driver-2',      'driver',  16000,  true, NULL),
  ('Sai Kumar',     'operator', 20000, true, NULL),
  ('Deepak',        'operator', 28000, true, NULL),
  ('Prasad',        'marketing',18000, true, NULL)
ON CONFLICT DO NOTHING;`;

  const newEmpSeeding = `INSERT INTO employees (name, role, salary, is_active, phone)
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
);`;

  content = content.replace(oldEmpSeeding, newEmpSeeding);
  fs.writeFileSync(updatesPath, content, 'utf8');
  console.log('supabase-updates.sql updated.');
}

// 4. UPDATE consolidated_updates.sql
const consolidatedPath = path.join(projectDir, 'consolidated_updates.sql');
if (fs.existsSync(consolidatedPath)) {
  let content = fs.readFileSync(consolidatedPath, 'utf8');

  // A. Add employee cleanup in pre-cleanup DO block (delete duplicates keeping the oldest)
  const preCleanupPlaceholder = `  -- D. DELETE ORPHANED ROWS IN NON-NULLABLE REFERENCING TABLES`;
  if (content.includes(preCleanupPlaceholder) && !content.includes('DELETE FROM public.employees WHERE id NOT IN')) {
    const employeeCleanup = `  -- Delete duplicate employees keeping the oldest one
  DELETE FROM public.employees
  WHERE id NOT IN (
    SELECT MIN(id) FROM public.employees GROUP BY name
  );

  -- D. DELETE ORPHANED ROWS IN NON-NULLABLE REFERENCING TABLES`;
    content = content.replace(preCleanupPlaceholder, employeeCleanup);
  }

  // B. Replace employees seeding
  const oldEmpSeeding = `INSERT INTO employees (name, role, salary, is_active) VALUES
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
ON CONFLICT DO NOTHING;`;

  const newEmpSeeding = `INSERT INTO employees (name, role, salary, is_active)
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
);`;

  content = content.replace(oldEmpSeeding, newEmpSeeding);

  // C. Replace drivers seeding
  const oldDriverSeeding = `INSERT INTO drivers (id, employee_id, name, phone, salary, is_active)
SELECT 'b097b6a9-8395-4eb8-a720-3057e07662c1'::uuid, id, 'Nagaraju', '8184918757', 12000, true FROM employees WHERE name = 'Nagaraju'
UNION
SELECT '70c293e7-bae8-4de2-a505-edccfd35f761'::uuid, id, 'Driver-2', NULL, 16000, true FROM employees WHERE name = 'Driver-2'
ON CONFLICT (id) DO UPDATE SET
  employee_id = EXCLUDED.employee_id,
  name = EXCLUDED.name,
  phone = EXCLUDED.phone,
  salary = EXCLUDED.salary,
  is_active = EXCLUDED.is_active;`;

  const newDriverSeeding = `INSERT INTO drivers (id, employee_id, name, phone, salary, is_active)
SELECT 'b097b6a9-8395-4eb8-a720-3057e07662c1'::uuid, (SELECT id FROM employees WHERE name = 'Nagaraju' LIMIT 1), 'Nagaraju', '8184918757', 12000, true
UNION
SELECT '70c293e7-bae8-4de2-a505-edccfd35f761'::uuid, (SELECT id FROM employees WHERE name = 'Driver-2' LIMIT 1), 'Driver-2', NULL, 16000, true
ON CONFLICT (id) DO UPDATE SET
  employee_id = EXCLUDED.employee_id,
  name = EXCLUDED.name,
  phone = EXCLUDED.phone,
  salary = EXCLUDED.salary,
  is_active = EXCLUDED.is_active;`;

  content = content.replace(oldDriverSeeding, newDriverSeeding);

  // D. Replace routes seeding
  const oldRouteSeeding = `INSERT INTO routes (id, name, driver_id, area, is_active)
SELECT 'a1111111-1111-1111-1111-111111111111'::uuid, 'Local Route', id, 'Local Area', true FROM drivers WHERE name = 'Nagaraju'
UNION
SELECT 'a2222222-2222-2222-2222-222222222222'::uuid, 'Raghavapuram Route', id, 'Raghavapuram', true FROM drivers WHERE name = 'Driver-2'
UNION
SELECT 'a3333333-3333-3333-3333-333333333333'::uuid, 'Mukkinavarigudem Route', id, 'Mukkinavarigudem', true FROM drivers WHERE name = 'Driver-2'
UNION
SELECT 'a4444444-4444-4444-4444-444444444444'::uuid, 'Dammapeta Route', id, 'Dammapeta', true FROM drivers WHERE name = 'Driver-2'
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  driver_id = EXCLUDED.driver_id,
  area = EXCLUDED.area,
  is_active = EXCLUDED.is_active;`;

  const newRouteSeeding = `INSERT INTO routes (id, name, driver_id, area, is_active)
SELECT 'a1111111-1111-1111-1111-111111111111'::uuid, 'Local Route', (SELECT id FROM drivers WHERE name = 'Nagaraju' LIMIT 1), 'Local Area', true
UNION
SELECT 'a2222222-2222-2222-2222-222222222222'::uuid, 'Raghavapuram Route', (SELECT id FROM drivers WHERE name = 'Driver-2' LIMIT 1), 'Raghavapuram', true
UNION
SELECT 'a3333333-3333-3333-3333-333333333333'::uuid, 'Mukkinavarigudem Route', (SELECT id FROM drivers WHERE name = 'Driver-2' LIMIT 1), 'Mukkinavarigudem', true
UNION
SELECT 'a4444444-4444-4444-4444-444444444444'::uuid, 'Dammapeta Route', (SELECT id FROM drivers WHERE name = 'Driver-2' LIMIT 1), 'Dammapeta', true
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  driver_id = EXCLUDED.driver_id,
  area = EXCLUDED.area,
  is_active = EXCLUDED.is_active;`;

  content = content.replace(oldRouteSeeding, newRouteSeeding);

  // E. Replace customers seeding
  const oldCustSeeding = `INSERT INTO customers (name, phone, area, customer_type, outstanding_amount, credit_limit, is_active) VALUES
  ('Bismillah Dhaba', '9876543210', 'Highway Side', 'route', 125.00, 1000.00, true),
  ('Sri Krishna Hotel', '9876543211', 'Bus Stand Area', 'regular', 2100.00, 3000.00, true),
  ('Metro Water Agency', '9876543212', 'Industrial Zone', 'dealer', 5400.00, 15000.00, true)
ON CONFLICT DO NOTHING;`;

  const newCustSeeding = `INSERT INTO customers (name, phone, area, customer_type, outstanding_amount, credit_limit, is_active)
SELECT name, phone, area, customer_type, outstanding_amount, credit_limit, is_active
FROM (VALUES
  ('Bismillah Dhaba', '9876543210', 'Highway Side', 'route', 125.00, 1000.00, true),
  ('Sri Krishna Hotel', '9876543211', 'Bus Stand Area', 'regular', 2100.00, 3000.00, true),
  ('Metro Water Agency', '9876543212', 'Industrial Zone', 'dealer', 5400.00, 15000.00, true)
) AS new_custs(name, phone, area, customer_type, outstanding_amount, credit_limit, is_active)
WHERE NOT EXISTS (
  SELECT 1 FROM customers WHERE customers.name = new_custs.name
);`;

  content = content.replace(oldCustSeeding, newCustSeeding);

  // F. Add Truncate route_customers
  const routeCustPlaceholder = `-- 14. PRE-SEED ROUTE CUSTOMERS`;
  if (content.includes(routeCustPlaceholder) && !content.includes('TRUNCATE TABLE public.route_customers')) {
    content = content.replace(routeCustPlaceholder, `${routeCustPlaceholder}\nTRUNCATE TABLE public.route_customers CASCADE;`);
  }

  // G. Updates employees seeding in updates section
  const oldEmpSeeding2 = `INSERT INTO employees (name, role, salary, is_active, phone) VALUES
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
  ('Driver-2',      'driver',  16000,  true, NULL),
  ('Sai Kumar',     'operator', 20000, true, NULL),
  ('Deepak',        'operator', 28000, true, NULL),
  ('Prasad',        'marketing',18000, true, NULL)
ON CONFLICT DO NOTHING;`;

  const newEmpSeeding2 = `INSERT INTO employees (name, role, salary, is_active, phone)
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
);`;

  content = content.replace(oldEmpSeeding2, newEmpSeeding2);

  fs.writeFileSync(consolidatedPath, content, 'utf8');
  console.log('consolidated_updates.sql updated.');
}
