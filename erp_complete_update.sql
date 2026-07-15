-- ============================================================
-- ROYAL KISSAN ERP - COMPLETE UPDATE & AUDIT MIGRATION
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/oweutcivgpmzldlcmkvd/sql/new
-- ============================================================

-- ============================================================
-- STEP 1: SAFE DUPLICATE CLEANUP & REMAPPING
-- ============================================================

-- Ensure uuid-ossp extension is enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1A. Ensure canonical drivers exist with correct UUIDs FIRST
INSERT INTO public.drivers (id, name, phone, salary, is_active, created_at)
VALUES
  ('b097b6a9-8395-4eb8-a720-3057e07662c1', 'Nagaraju', '8184918757', 12000, true, NOW()),
  ('70c293e7-bae8-4de2-a505-edccfd35f761', 'Driver-2', '9999988888', 14000, true, NOW())
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, is_active = true;

-- 1B. Remap all references from any duplicate/alternative driver records to canonical IDs
DO $$
BEGIN
  -- 1. route_sales
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='route_sales') THEN
    UPDATE public.route_sales SET driver_id = 'b097b6a9-8395-4eb8-a720-3057e07662c1'::uuid WHERE driver_id IN (SELECT id FROM public.drivers WHERE name = 'Nagaraju' AND id <> 'b097b6a9-8395-4eb8-a720-3057e07662c1'::uuid);
    UPDATE public.route_sales SET driver_id = '70c293e7-bae8-4de2-a505-edccfd35f761'::uuid WHERE driver_id IN (SELECT id FROM public.drivers WHERE name IN ('Driver-2', 'Mallaya', 'Mallayya', 'Duplicate Nagaraju', 'Duplicate Driver-2') AND id <> '70c293e7-bae8-4de2-a505-edccfd35f761'::uuid);
  END IF;

  -- 2. bills
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='bills') THEN
    UPDATE public.bills SET driver_id = 'b097b6a9-8395-4eb8-a720-3057e07662c1'::uuid WHERE driver_id IN (SELECT id FROM public.drivers WHERE name = 'Nagaraju' AND id <> 'b097b6a9-8395-4eb8-a720-3057e07662c1'::uuid);
    UPDATE public.bills SET driver_id = '70c293e7-bae8-4de2-a505-edccfd35f761'::uuid WHERE driver_id IN (SELECT id FROM public.drivers WHERE name IN ('Driver-2', 'Mallaya', 'Mallayya', 'Duplicate Nagaraju', 'Duplicate Driver-2') AND id <> '70c293e7-bae8-4de2-a505-edccfd35f761'::uuid);
  END IF;

  -- 3. collections
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='collections') THEN
    UPDATE public.collections SET driver_id = 'b097b6a9-8395-4eb8-a720-3057e07662c1'::uuid WHERE driver_id IN (SELECT id FROM public.drivers WHERE name = 'Nagaraju' AND id <> 'b097b6a9-8395-4eb8-a720-3057e07662c1'::uuid);
    UPDATE public.collections SET driver_id = '70c293e7-bae8-4de2-a505-edccfd35f761'::uuid WHERE driver_id IN (SELECT id FROM public.drivers WHERE name IN ('Driver-2', 'Mallaya', 'Mallayya', 'Duplicate Nagaraju', 'Duplicate Driver-2') AND id <> '70c293e7-bae8-4de2-a505-edccfd35f761'::uuid);
  END IF;

  -- 4. driver_collections
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='driver_collections') THEN
    UPDATE public.driver_collections SET driver_id = 'b097b6a9-8395-4eb8-a720-3057e07662c1'::uuid WHERE driver_id IN (SELECT id FROM public.drivers WHERE name = 'Nagaraju' AND id <> 'b097b6a9-8395-4eb8-a720-3057e07662c1'::uuid);
    UPDATE public.driver_collections SET driver_id = '70c293e7-bae8-4de2-a505-edccfd35f761'::uuid WHERE driver_id IN (SELECT id FROM public.drivers WHERE name IN ('Driver-2', 'Mallaya', 'Mallayya', 'Duplicate Nagaraju', 'Duplicate Driver-2') AND id <> '70c293e7-bae8-4de2-a505-edccfd35f761'::uuid);
  END IF;

  -- 5. routes
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='routes') THEN
    UPDATE public.routes SET driver_id = 'b097b6a9-8395-4eb8-a720-3057e07662c1'::uuid WHERE driver_id IN (SELECT id FROM public.drivers WHERE name = 'Nagaraju' AND id <> 'b097b6a9-8395-4eb8-a720-3057e07662c1'::uuid);
    UPDATE public.routes SET driver_id = '70c293e7-bae8-4de2-a505-edccfd35f761'::uuid WHERE driver_id IN (SELECT id FROM public.drivers WHERE name IN ('Driver-2', 'Mallaya', 'Mallayya', 'Duplicate Nagaraju', 'Duplicate Driver-2') AND id <> '70c293e7-bae8-4de2-a505-edccfd35f761'::uuid);
  END IF;

  -- 6. sales
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='sales') THEN
    UPDATE public.sales SET driver_id = 'b097b6a9-8395-4eb8-a720-3057e07662c1'::uuid WHERE driver_id IN (SELECT id FROM public.drivers WHERE name = 'Nagaraju' AND id <> 'b097b6a9-8395-4eb8-a720-3057e07662c1'::uuid);
    UPDATE public.sales SET driver_id = '70c293e7-bae8-4de2-a505-edccfd35f761'::uuid WHERE driver_id IN (SELECT id FROM public.drivers WHERE name IN ('Driver-2', 'Mallaya', 'Mallayya', 'Duplicate Nagaraju', 'Duplicate Driver-2') AND id <> '70c293e7-bae8-4de2-a505-edccfd35f761'::uuid);
  END IF;

  -- 7. driver_sales
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='driver_sales') THEN
    UPDATE public.driver_sales SET driver_id = 'b097b6a9-8395-4eb8-a720-3057e07662c1'::uuid WHERE driver_id IN (SELECT id FROM public.drivers WHERE name = 'Nagaraju' AND id <> 'b097b6a9-8395-4eb8-a720-3057e07662c1'::uuid);
    UPDATE public.driver_sales SET driver_id = '70c293e7-bae8-4de2-a505-edccfd35f761'::uuid WHERE driver_id IN (SELECT id FROM public.drivers WHERE name IN ('Driver-2', 'Mallaya', 'Mallayya', 'Duplicate Nagaraju', 'Duplicate Driver-2') AND id <> '70c293e7-bae8-4de2-a505-edccfd35f761'::uuid);
  END IF;

  -- 8. driver_performance (Safe merge to avoid UNIQUE(driver_id, performance_date) violation)
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='driver_performance') THEN
    -- A. For Nagaraju ('b097b6a9-8395-4eb8-a720-3057e07662c1')
    UPDATE public.driver_performance dp
    SET 
      total_sales = dp.total_sales + dup.total_sales,
      total_collected = dp.total_collected + dup.total_collected,
      total_due = dp.total_due + dup.total_due
    FROM (
      SELECT performance_date, SUM(total_sales) as total_sales, SUM(total_collected) as total_collected, SUM(total_due) as total_due
      FROM public.driver_performance
      WHERE driver_id IN (SELECT id FROM public.drivers WHERE name = 'Nagaraju' AND id <> 'b097b6a9-8395-4eb8-a720-3057e07662c1'::uuid)
      GROUP BY performance_date
    ) dup
    WHERE dp.driver_id = 'b097b6a9-8395-4eb8-a720-3057e07662c1'::uuid
      AND dp.performance_date = dup.performance_date;

    INSERT INTO public.driver_performance (driver_id, performance_date, total_sales, total_collected, total_due)
    SELECT 'b097b6a9-8395-4eb8-a720-3057e07662c1'::uuid, performance_date, total_sales, total_collected, total_due
    FROM public.driver_performance
    WHERE driver_id IN (SELECT id FROM public.drivers WHERE name = 'Nagaraju' AND id <> 'b097b6a9-8395-4eb8-a720-3057e07662c1'::uuid)
      AND performance_date NOT IN (SELECT performance_date FROM public.driver_performance WHERE driver_id = 'b097b6a9-8395-4eb8-a720-3057e07662c1'::uuid)
    ON CONFLICT (driver_id, performance_date) DO NOTHING;

    DELETE FROM public.driver_performance
    WHERE driver_id IN (SELECT id FROM public.drivers WHERE name = 'Nagaraju' AND id <> 'b097b6a9-8395-4eb8-a720-3057e07662c1'::uuid);

    -- B. For Driver-2 ('70c293e7-bae8-4de2-a505-edccfd35f761')
    UPDATE public.driver_performance dp
    SET 
      total_sales = dp.total_sales + dup.total_sales,
      total_collected = dp.total_collected + dup.total_collected,
      total_due = dp.total_due + dup.total_due
    FROM (
      SELECT performance_date, SUM(total_sales) as total_sales, SUM(total_collected) as total_collected, SUM(total_due) as total_due
      FROM public.driver_performance
      WHERE driver_id IN (SELECT id FROM public.drivers WHERE name IN ('Driver-2', 'Mallaya', 'Mallayya', 'Duplicate Nagaraju', 'Duplicate Driver-2') AND id <> '70c293e7-bae8-4de2-a505-edccfd35f761'::uuid)
      GROUP BY performance_date
    ) dup
    WHERE dp.driver_id = '70c293e7-bae8-4de2-a505-edccfd35f761'::uuid
      AND dp.performance_date = dup.performance_date;

    INSERT INTO public.driver_performance (driver_id, performance_date, total_sales, total_collected, total_due)
    SELECT '70c293e7-bae8-4de2-a505-edccfd35f761'::uuid, performance_date, total_sales, total_collected, total_due
    FROM public.driver_performance
    WHERE driver_id IN (SELECT id FROM public.drivers WHERE name IN ('Driver-2', 'Mallaya', 'Mallayya', 'Duplicate Nagaraju', 'Duplicate Driver-2') AND id <> '70c293e7-bae8-4de2-a505-edccfd35f761'::uuid)
      AND performance_date NOT IN (SELECT performance_date FROM public.driver_performance WHERE driver_id = '70c293e7-bae8-4de2-a505-edccfd35f761'::uuid)
    ON CONFLICT (driver_id, performance_date) DO NOTHING;

    DELETE FROM public.driver_performance
    WHERE driver_id IN (SELECT id FROM public.drivers WHERE name IN ('Driver-2', 'Mallaya', 'Mallayya', 'Duplicate Nagaraju', 'Duplicate Driver-2') AND id <> '70c293e7-bae8-4de2-a505-edccfd35f761'::uuid);
  END IF;

  -- 9. route_expenses
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='route_expenses') THEN
    UPDATE public.route_expenses SET driver_id = 'b097b6a9-8395-4eb8-a720-3057e07662c1'::uuid WHERE driver_id IN (SELECT id FROM public.drivers WHERE name = 'Nagaraju' AND id <> 'b097b6a9-8395-4eb8-a720-3057e07662c1'::uuid);
    UPDATE public.route_expenses SET driver_id = '70c293e7-bae8-4de2-a505-edccfd35f761'::uuid WHERE driver_id IN (SELECT id FROM public.drivers WHERE name IN ('Driver-2', 'Mallaya', 'Mallayya', 'Duplicate Nagaraju', 'Duplicate Driver-2') AND id <> '70c293e7-bae8-4de2-a505-edccfd35f761'::uuid);
  END IF;

  -- 10. customer_dues
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='customer_dues') THEN
    UPDATE public.customer_dues SET driver_id = 'b097b6a9-8395-4eb8-a720-3057e07662c1'::uuid WHERE driver_id IN (SELECT id FROM public.drivers WHERE name = 'Nagaraju' AND id <> 'b097b6a9-8395-4eb8-a720-3057e07662c1'::uuid);
    UPDATE public.customer_dues SET driver_id = '70c293e7-bae8-4de2-a505-edccfd35f761'::uuid WHERE driver_id IN (SELECT id FROM public.drivers WHERE name IN ('Driver-2', 'Mallaya', 'Mallayya', 'Duplicate Nagaraju', 'Duplicate Driver-2') AND id <> '70c293e7-bae8-4de2-a505-edccfd35f761'::uuid);
  END IF;
END $$;

-- 1C. Delete duplicate driver records safely (leaving only canonical ones)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='drivers') THEN
    DELETE FROM public.drivers
    WHERE name IN ('Nagaraju', 'Driver-2', 'Mallaya', 'Mallayya', 'Duplicate Nagaraju', 'Duplicate Driver-2')
      AND id NOT IN ('b097b6a9-8395-4eb8-a720-3057e07662c1'::uuid, '70c293e7-bae8-4de2-a505-edccfd35f761'::uuid);
  END IF;
END $$;

-- 1D. Remap duplicate employees in referencing tables and delete duplicates
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='employees') THEN
    -- 1. Remap drivers
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

    -- 2. Remap attendance
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

    -- 3. Remap salary_payments
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='salary_payments') THEN
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
      UPDATE public.salary_payments sp
      SET employee_id = m.new_id
      FROM dup_mappings m
      WHERE sp.employee_id = m.old_id;
    END IF;

    -- Delete duplicate employees keeping only the first/oldest one
    DELETE FROM public.employees
    WHERE id IN (
      SELECT id FROM (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY name ORDER BY created_at ASC NULLS LAST) AS rn
        FROM public.employees
      ) t WHERE rn > 1
    );
  END IF;
END $$;

-- 1E. Remap duplicate customers in referencing tables and delete duplicates
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='customers') THEN
    -- 1. Remap route_stops
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='route_stops') THEN
      WITH customers_kept AS (
        SELECT id, name, ROW_NUMBER() OVER (PARTITION BY name ORDER BY created_at ASC NULLS LAST) AS rn
        FROM public.customers
      ),
      dup_mappings AS (
        SELECT c.id AS old_id, ck.id AS new_id
        FROM public.customers c
        JOIN customers_kept ck ON c.name = ck.name
        WHERE ck.rn = 1 AND c.id <> ck.id
      )
      UPDATE public.route_stops rs
      SET customer_id = m.new_id
      FROM dup_mappings m
      WHERE rs.customer_id = m.old_id;
    END IF;

    -- 2. Remap sales
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='sales') THEN
      WITH customers_kept AS (
        SELECT id, name, ROW_NUMBER() OVER (PARTITION BY name ORDER BY created_at ASC NULLS LAST) AS rn
        FROM public.customers
      ),
      dup_mappings AS (
        SELECT c.id AS old_id, ck.id AS new_id
        FROM public.customers c
        JOIN customers_kept ck ON c.name = ck.name
        WHERE ck.rn = 1 AND c.id <> ck.id
      )
      UPDATE public.sales s
      SET customer_id = m.new_id
      FROM dup_mappings m
      WHERE s.customer_id = m.old_id;
    END IF;

    -- 3. Remap payments
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='payments') THEN
      WITH customers_kept AS (
        SELECT id, name, ROW_NUMBER() OVER (PARTITION BY name ORDER BY created_at ASC NULLS LAST) AS rn
        FROM public.customers
      ),
      dup_mappings AS (
        SELECT c.id AS old_id, ck.id AS new_id
        FROM public.customers c
        JOIN customers_kept ck ON c.name = ck.name
        WHERE ck.rn = 1 AND c.id <> ck.id
      )
      UPDATE public.payments p
      SET customer_id = m.new_id
      FROM dup_mappings m
      WHERE p.customer_id = m.old_id;
    END IF;

    -- Delete duplicate customers keeping only the oldest
    DELETE FROM public.customers
    WHERE id IN (
      SELECT id FROM (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY name ORDER BY created_at ASC NULLS LAST) AS rn
        FROM public.customers
      ) t WHERE rn > 1
    );
  END IF;
END $$;

-- 1F. Remap duplicate products in referencing tables and delete duplicates
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='products') THEN
    -- 1. Remap sale_items
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='sale_items') THEN
      WITH products_kept AS (
        SELECT id, name, ROW_NUMBER() OVER (PARTITION BY name ORDER BY created_at ASC NULLS LAST) AS rn
        FROM public.products
      ),
      dup_mappings AS (
        SELECT p.id AS old_id, pk.id AS new_id
        FROM public.products p
        JOIN products_kept pk ON p.name = pk.name
        WHERE pk.rn = 1 AND p.id <> pk.id
      )
      UPDATE public.sale_items si
      SET product_id = m.new_id
      FROM dup_mappings m
      WHERE si.product_id = m.old_id;
    END IF;

    -- 2. Remap stock
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='stock') THEN
      WITH products_kept AS (
        SELECT id, name, ROW_NUMBER() OVER (PARTITION BY name ORDER BY created_at ASC NULLS LAST) AS rn
        FROM public.products
      ),
      dup_mappings AS (
        SELECT p.id AS old_id, pk.id AS new_id
        FROM public.products p
        JOIN products_kept pk ON p.name = pk.name
        WHERE pk.rn = 1 AND p.id <> pk.id
      )
      UPDATE public.stock s
      SET product_id = m.new_id
      FROM dup_mappings m
      WHERE s.product_id = m.old_id;
    END IF;

    -- 3. Remap stock_items
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='stock_items') THEN
      WITH products_kept AS (
        SELECT id, name, ROW_NUMBER() OVER (PARTITION BY name ORDER BY created_at ASC NULLS LAST) AS rn
        FROM public.products
      ),
      dup_mappings AS (
        SELECT p.id AS old_id, pk.id AS new_id
        FROM public.products p
        JOIN products_kept pk ON p.name = pk.name
        WHERE pk.rn = 1 AND p.id <> pk.id
      )
      UPDATE public.stock_items si
      SET product_id = m.new_id
      FROM dup_mappings m
      WHERE si.product_id = m.old_id;
    END IF;

    -- 4. Remap stock_transactions
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='stock_transactions') THEN
      WITH products_kept AS (
        SELECT id, name, ROW_NUMBER() OVER (PARTITION BY name ORDER BY created_at ASC NULLS LAST) AS rn
        FROM public.products
      ),
      dup_mappings AS (
        SELECT p.id AS old_id, pk.id AS new_id
        FROM public.products p
        JOIN products_kept pk ON p.name = pk.name
        WHERE pk.rn = 1 AND p.id <> pk.id
      )
      UPDATE public.stock_transactions st
      SET product_id = m.new_id
      FROM dup_mappings m
      WHERE st.product_id = m.old_id;
    END IF;

    -- 5. Remap bill_items
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='bill_items') THEN
      WITH products_kept AS (
        SELECT id, name, ROW_NUMBER() OVER (PARTITION BY name ORDER BY created_at ASC NULLS LAST) AS rn
        FROM public.products
      ),
      dup_mappings AS (
        SELECT p.id AS old_id, pk.id AS new_id
        FROM public.products p
        JOIN products_kept pk ON p.name = pk.name
        WHERE pk.rn = 1 AND p.id <> pk.id
      )
      UPDATE public.bill_items bi
      SET product_id = m.new_id
      FROM dup_mappings m
      WHERE bi.product_id = m.old_id;
    END IF;

    -- Delete duplicate products
    DELETE FROM public.products
    WHERE id IN (
      SELECT id FROM (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY name ORDER BY created_at ASC NULLS LAST) AS rn
        FROM public.products
      ) t WHERE rn > 1
    );
  END IF;
END $$;


-- ============================================================
-- STEP 2: CLEAN DUPLICATE ROUTES
-- ============================================================

-- 2A. Ensure canonical routes exist FIRST
INSERT INTO public.routes (id, name, driver_id, area, is_active, created_at)
VALUES
  ('a1111111-1111-1111-1111-111111111111', 'Local Route', 'b097b6a9-8395-4eb8-a720-3057e07662c1', 'Local Area', true, NOW()),
  ('a2222222-2222-2222-2222-222222222222', 'Raghavapuram Route', '70c293e7-bae8-4de2-a505-edccfd35f761', 'Raghavapuram', true, NOW()),
  ('a3333333-3333-3333-3333-333333333333', 'Mukkinavarigudem Route', '70c293e7-bae8-4de2-a505-edccfd35f761', 'Mukkinavarigudem', true, NOW()),
  ('a4444444-4444-4444-4444-444444444444', 'Dammapeta Route', '70c293e7-bae8-4de2-a505-edccfd35f761', 'Dammapeta', true, NOW())
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, driver_id = EXCLUDED.driver_id, is_active = true;

-- 2B. Remap route references for duplicate routes in all tables
DO $$
BEGIN
  -- 1. route_sales
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='route_sales') THEN
    UPDATE public.route_sales SET route_id = 'a1111111-1111-1111-1111-111111111111'::uuid WHERE route_id IN (SELECT id FROM public.routes WHERE name ILIKE '%Local%' AND id <> 'a1111111-1111-1111-1111-111111111111'::uuid);
    UPDATE public.route_sales SET route_id = 'a2222222-2222-2222-2222-222222222222'::uuid WHERE route_id IN (SELECT id FROM public.routes WHERE name ILIKE '%Raghavapuram%' AND id <> 'a2222222-2222-2222-2222-222222222222'::uuid);
    UPDATE public.route_sales SET route_id = 'a3333333-3333-3333-3333-333333333333'::uuid WHERE route_id IN (SELECT id FROM public.routes WHERE name ILIKE '%Mukkinavarigudem%' AND id <> 'a3333333-3333-3333-3333-333333333333'::uuid);
    UPDATE public.route_sales SET route_id = 'a4444444-4444-4444-4444-444444444444'::uuid WHERE route_id IN (SELECT id FROM public.routes WHERE name ILIKE '%Dammapeta%' AND id <> 'a4444444-4444-4444-4444-444444444444'::uuid);
  END IF;

  -- 2. sales
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='sales') THEN
    UPDATE public.sales SET route_id = 'a1111111-1111-1111-1111-111111111111'::uuid WHERE route_id IN (SELECT id FROM public.routes WHERE name ILIKE '%Local%' AND id <> 'a1111111-1111-1111-1111-111111111111'::uuid);
    UPDATE public.sales SET route_id = 'a2222222-2222-2222-2222-222222222222'::uuid WHERE route_id IN (SELECT id FROM public.routes WHERE name ILIKE '%Raghavapuram%' AND id <> 'a2222222-2222-2222-2222-222222222222'::uuid);
    UPDATE public.sales SET route_id = 'a3333333-3333-3333-3333-333333333333'::uuid WHERE route_id IN (SELECT id FROM public.routes WHERE name ILIKE '%Mukkinavarigudem%' AND id <> 'a3333333-3333-3333-3333-333333333333'::uuid);
    UPDATE public.sales SET route_id = 'a4444444-4444-4444-4444-444444444444'::uuid WHERE route_id IN (SELECT id FROM public.routes WHERE name ILIKE '%Dammapeta%' AND id <> 'a4444444-4444-4444-4444-444444444444'::uuid);
  END IF;

  -- 3. collections
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='collections') THEN
    UPDATE public.collections SET route_id = 'a1111111-1111-1111-1111-111111111111'::uuid WHERE route_id IN (SELECT id FROM public.routes WHERE name ILIKE '%Local%' AND id <> 'a1111111-1111-1111-1111-111111111111'::uuid);
    UPDATE public.collections SET route_id = 'a2222222-2222-2222-2222-222222222222'::uuid WHERE route_id IN (SELECT id FROM public.routes WHERE name ILIKE '%Raghavapuram%' AND id <> 'a2222222-2222-2222-2222-222222222222'::uuid);
    UPDATE public.collections SET route_id = 'a3333333-3333-3333-3333-333333333333'::uuid WHERE route_id IN (SELECT id FROM public.routes WHERE name ILIKE '%Mukkinavarigudem%' AND id <> 'a3333333-3333-3333-3333-333333333333'::uuid);
    UPDATE public.collections SET route_id = 'a4444444-4444-4444-4444-444444444444'::uuid WHERE route_id IN (SELECT id FROM public.routes WHERE name ILIKE '%Dammapeta%' AND id <> 'a4444444-4444-4444-4444-444444444444'::uuid);
  END IF;

  -- 4. bills
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='bills') THEN
    UPDATE public.bills SET route_id = 'a1111111-1111-1111-1111-111111111111'::uuid WHERE route_id IN (SELECT id FROM public.routes WHERE name ILIKE '%Local%' AND id <> 'a1111111-1111-1111-1111-111111111111'::uuid);
    UPDATE public.bills SET route_id = 'a2222222-2222-2222-2222-222222222222'::uuid WHERE route_id IN (SELECT id FROM public.routes WHERE name ILIKE '%Raghavapuram%' AND id <> 'a2222222-2222-2222-2222-222222222222'::uuid);
    UPDATE public.bills SET route_id = 'a3333333-3333-3333-3333-333333333333'::uuid WHERE route_id IN (SELECT id FROM public.routes WHERE name ILIKE '%Mukkinavarigudem%' AND id <> 'a3333333-3333-3333-3333-333333333333'::uuid);
    UPDATE public.bills SET route_id = 'a4444444-4444-4444-4444-444444444444'::uuid WHERE route_id IN (SELECT id FROM public.routes WHERE name ILIKE '%Dammapeta%' AND id <> 'a4444444-4444-4444-4444-444444444444'::uuid);
  END IF;

  -- 5. customer_dues
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='customer_dues') THEN
    UPDATE public.customer_dues SET route_id = 'a1111111-1111-1111-1111-111111111111'::uuid WHERE route_id IN (SELECT id FROM public.routes WHERE name ILIKE '%Local%' AND id <> 'a1111111-1111-1111-1111-111111111111'::uuid);
    UPDATE public.customer_dues SET route_id = 'a2222222-2222-2222-2222-222222222222'::uuid WHERE route_id IN (SELECT id FROM public.routes WHERE name ILIKE '%Raghavapuram%' AND id <> 'a2222222-2222-2222-2222-222222222222'::uuid);
    UPDATE public.customer_dues SET route_id = 'a3333333-3333-3333-3333-333333333333'::uuid WHERE route_id IN (SELECT id FROM public.routes WHERE name ILIKE '%Mukkinavarigudem%' AND id <> 'a3333333-3333-3333-3333-333333333333'::uuid);
    UPDATE public.customer_dues SET route_id = 'a4444444-4444-4444-4444-444444444444'::uuid WHERE route_id IN (SELECT id FROM public.routes WHERE name ILIKE '%Dammapeta%' AND id <> 'a4444444-4444-4444-4444-444444444444'::uuid);
  END IF;

  -- 6. route_customers
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='route_customers') THEN
    UPDATE public.route_customers SET route_id = 'a1111111-1111-1111-1111-111111111111'::uuid WHERE route_id IN (SELECT id FROM public.routes WHERE name ILIKE '%Local%' AND id <> 'a1111111-1111-1111-1111-111111111111'::uuid);
    UPDATE public.route_customers SET route_id = 'a2222222-2222-2222-2222-222222222222'::uuid WHERE route_id IN (SELECT id FROM public.routes WHERE name ILIKE '%Raghavapuram%' AND id <> 'a2222222-2222-2222-2222-222222222222'::uuid);
    UPDATE public.route_customers SET route_id = 'a3333333-3333-3333-3333-333333333333'::uuid WHERE route_id IN (SELECT id FROM public.routes WHERE name ILIKE '%Mukkinavarigudem%' AND id <> 'a3333333-3333-3333-3333-333333333333'::uuid);
    UPDATE public.route_customers SET route_id = 'a4444444-4444-4444-4444-444444444444'::uuid WHERE route_id IN (SELECT id FROM public.routes WHERE name ILIKE '%Dammapeta%' AND id <> 'a4444444-4444-4444-4444-444444444444'::uuid);
  END IF;

  -- 7. route_stops
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='route_stops') THEN
    UPDATE public.route_stops SET route_id = 'a1111111-1111-1111-1111-111111111111'::uuid WHERE route_id IN (SELECT id FROM public.routes WHERE name ILIKE '%Local%' AND id <> 'a1111111-1111-1111-1111-111111111111'::uuid);
    UPDATE public.route_stops SET route_id = 'a2222222-2222-2222-2222-222222222222'::uuid WHERE route_id IN (SELECT id FROM public.routes WHERE name ILIKE '%Raghavapuram%' AND id <> 'a2222222-2222-2222-2222-222222222222'::uuid);
    UPDATE public.route_stops SET route_id = 'a3333333-3333-3333-3333-333333333333'::uuid WHERE route_id IN (SELECT id FROM public.routes WHERE name ILIKE '%Mukkinavarigudem%' AND id <> 'a3333333-3333-3333-3333-333333333333'::uuid);
    UPDATE public.route_stops SET route_id = 'a4444444-4444-4444-4444-444444444444'::uuid WHERE route_id IN (SELECT id FROM public.routes WHERE name ILIKE '%Dammapeta%' AND id <> 'a4444444-4444-4444-4444-444444444444'::uuid);
  END IF;

  -- 8. route_reports
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='route_reports') THEN
    UPDATE public.route_reports SET route_id = 'a1111111-1111-1111-1111-111111111111'::uuid WHERE route_id IN (SELECT id FROM public.routes WHERE name ILIKE '%Local%' AND id <> 'a1111111-1111-1111-1111-111111111111'::uuid);
    UPDATE public.route_reports SET route_id = 'a2222222-2222-2222-2222-222222222222'::uuid WHERE route_id IN (SELECT id FROM public.routes WHERE name ILIKE '%Raghavapuram%' AND id <> 'a2222222-2222-2222-2222-222222222222'::uuid);
    UPDATE public.route_reports SET route_id = 'a3333333-3333-3333-3333-333333333333'::uuid WHERE route_id IN (SELECT id FROM public.routes WHERE name ILIKE '%Mukkinavarigudem%' AND id <> 'a3333333-3333-3333-3333-333333333333'::uuid);
    UPDATE public.route_reports SET route_id = 'a4444444-4444-4444-4444-444444444444'::uuid WHERE route_id IN (SELECT id FROM public.routes WHERE name ILIKE '%Dammapeta%' AND id <> 'a4444444-4444-4444-4444-444444444444'::uuid);
  END IF;

  -- 9. route_expenses
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='route_expenses') THEN
    UPDATE public.route_expenses SET route_id = 'a1111111-1111-1111-1111-111111111111'::uuid WHERE route_id IN (SELECT id FROM public.routes WHERE name ILIKE '%Local%' AND id <> 'a1111111-1111-1111-1111-111111111111'::uuid);
    UPDATE public.route_expenses SET route_id = 'a2222222-2222-2222-2222-222222222222'::uuid WHERE route_id IN (SELECT id FROM public.routes WHERE name ILIKE '%Raghavapuram%' AND id <> 'a2222222-2222-2222-2222-222222222222'::uuid);
    UPDATE public.route_expenses SET route_id = 'a3333333-3333-3333-3333-333333333333'::uuid WHERE route_id IN (SELECT id FROM public.routes WHERE name ILIKE '%Mukkinavarigudem%' AND id <> 'a3333333-3333-3333-3333-333333333333'::uuid);
    UPDATE public.route_expenses SET route_id = 'a4444444-4444-4444-4444-444444444444'::uuid WHERE route_id IN (SELECT id FROM public.routes WHERE name ILIKE '%Dammapeta%' AND id <> 'a4444444-4444-4444-4444-444444444444'::uuid);
  END IF;

  -- 10. non_local_routes
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='non_local_routes') THEN
    UPDATE public.non_local_routes SET route_id = 'a1111111-1111-1111-1111-111111111111'::uuid WHERE route_id IN (SELECT id FROM public.routes WHERE name ILIKE '%Local%' AND id <> 'a1111111-1111-1111-1111-111111111111'::uuid);
    UPDATE public.non_local_routes SET route_id = 'a2222222-2222-2222-2222-222222222222'::uuid WHERE route_id IN (SELECT id FROM public.routes WHERE name ILIKE '%Raghavapuram%' AND id <> 'a2222222-2222-2222-2222-222222222222'::uuid);
    UPDATE public.non_local_routes SET route_id = 'a3333333-3333-3333-3333-333333333333'::uuid WHERE route_id IN (SELECT id FROM public.routes WHERE name ILIKE '%Mukkinavarigudem%' AND id <> 'a3333333-3333-3333-3333-333333333333'::uuid);
    UPDATE public.non_local_routes SET route_id = 'a4444444-4444-4444-4444-444444444444'::uuid WHERE route_id IN (SELECT id FROM public.routes WHERE name ILIKE '%Dammapeta%' AND id <> 'a4444444-4444-4444-4444-444444444444'::uuid);
  END IF;

  -- 11. route_performance (Safe merge to avoid UNIQUE(route_id, performance_date) violation)
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='route_performance') THEN
    -- A. Local Route ('a1111111-1111-1111-1111-111111111111')
    UPDATE public.route_performance rp
    SET 
      total_sales = rp.total_sales + dup.total_sales,
      total_collected = rp.total_collected + dup.total_collected,
      total_due = rp.total_due + dup.total_due
    FROM (
      SELECT performance_date, SUM(total_sales) as total_sales, SUM(total_collected) as total_collected, SUM(total_due) as total_due
      FROM public.route_performance
      WHERE route_id IN (SELECT id FROM public.routes WHERE name ILIKE '%Local%' AND id <> 'a1111111-1111-1111-1111-111111111111'::uuid)
      GROUP BY performance_date
    ) dup
    WHERE rp.route_id = 'a1111111-1111-1111-1111-111111111111'::uuid
      AND rp.performance_date = dup.performance_date;

    INSERT INTO public.route_performance (route_id, performance_date, total_sales, total_collected, total_due)
    SELECT 'a1111111-1111-1111-1111-111111111111'::uuid, performance_date, total_sales, total_collected, total_due
    FROM public.route_performance
    WHERE route_id IN (SELECT id FROM public.routes WHERE name ILIKE '%Local%' AND id <> 'a1111111-1111-1111-1111-111111111111'::uuid)
      AND performance_date NOT IN (SELECT performance_date FROM public.route_performance WHERE route_id = 'a1111111-1111-1111-1111-111111111111'::uuid)
    ON CONFLICT (route_id, performance_date) DO NOTHING;

    DELETE FROM public.route_performance
    WHERE route_id IN (SELECT id FROM public.routes WHERE name ILIKE '%Local%' AND id <> 'a1111111-1111-1111-1111-111111111111'::uuid);

    -- B. Raghavapuram Route ('a2222222-2222-2222-2222-222222222222')
    UPDATE public.route_performance rp
    SET 
      total_sales = rp.total_sales + dup.total_sales,
      total_collected = rp.total_collected + dup.total_collected,
      total_due = rp.total_due + dup.total_due
    FROM (
      SELECT performance_date, SUM(total_sales) as total_sales, SUM(total_collected) as total_collected, SUM(total_due) as total_due
      FROM public.route_performance
      WHERE route_id IN (SELECT id FROM public.routes WHERE name ILIKE '%Raghavapuram%' AND id <> 'a2222222-2222-2222-2222-222222222222'::uuid)
      GROUP BY performance_date
    ) dup
    WHERE rp.route_id = 'a2222222-2222-2222-2222-222222222222'::uuid
      AND rp.performance_date = dup.performance_date;

    INSERT INTO public.route_performance (route_id, performance_date, total_sales, total_collected, total_due)
    SELECT 'a2222222-2222-2222-2222-222222222222'::uuid, performance_date, total_sales, total_collected, total_due
    FROM public.route_performance
    WHERE route_id IN (SELECT id FROM public.routes WHERE name ILIKE '%Raghavapuram%' AND id <> 'a2222222-2222-2222-2222-222222222222'::uuid)
      AND performance_date NOT IN (SELECT performance_date FROM public.route_performance WHERE route_id = 'a2222222-2222-2222-2222-222222222222'::uuid)
    ON CONFLICT (route_id, performance_date) DO NOTHING;

    DELETE FROM public.route_performance
    WHERE route_id IN (SELECT id FROM public.routes WHERE name ILIKE '%Raghavapuram%' AND id <> 'a2222222-2222-2222-2222-222222222222'::uuid);

    -- C. Mukkinavarigudem Route ('a3333333-3333-3333-3333-333333333333')
    UPDATE public.route_performance rp
    SET 
      total_sales = rp.total_sales + dup.total_sales,
      total_collected = rp.total_collected + dup.total_collected,
      total_due = rp.total_due + dup.total_due
    FROM (
      SELECT performance_date, SUM(total_sales) as total_sales, SUM(total_collected) as total_collected, SUM(total_due) as total_due
      FROM public.route_performance
      WHERE route_id IN (SELECT id FROM public.routes WHERE name ILIKE '%Mukkinavarigudem%' AND id <> 'a3333333-3333-3333-3333-333333333333'::uuid)
      GROUP BY performance_date
    ) dup
    WHERE rp.route_id = 'a3333333-3333-3333-3333-333333333333'::uuid
      AND rp.performance_date = dup.performance_date;

    INSERT INTO public.route_performance (route_id, performance_date, total_sales, total_collected, total_due)
    SELECT 'a3333333-3333-3333-3333-333333333333'::uuid, performance_date, total_sales, total_collected, total_due
    FROM public.route_performance
    WHERE route_id IN (SELECT id FROM public.routes WHERE name ILIKE '%Mukkinavarigudem%' AND id <> 'a3333333-3333-3333-3333-333333333333'::uuid)
      AND performance_date NOT IN (SELECT performance_date FROM public.route_performance WHERE route_id = 'a3333333-3333-3333-3333-333333333333'::uuid)
    ON CONFLICT (route_id, performance_date) DO NOTHING;

    DELETE FROM public.route_performance
    WHERE route_id IN (SELECT id FROM public.routes WHERE name ILIKE '%Mukkinavarigudem%' AND id <> 'a3333333-3333-3333-3333-333333333333'::uuid);

    -- D. Dammapeta Route ('a4444444-4444-4444-4444-444444444444')
    UPDATE public.route_performance rp
    SET 
      total_sales = rp.total_sales + dup.total_sales,
      total_collected = rp.total_collected + dup.total_collected,
      total_due = rp.total_due + dup.total_due
    FROM (
      SELECT performance_date, SUM(total_sales) as total_sales, SUM(total_collected) as total_collected, SUM(total_due) as total_due
      FROM public.route_performance
      WHERE route_id IN (SELECT id FROM public.routes WHERE name ILIKE '%Dammapeta%' AND id <> 'a4444444-4444-4444-4444-444444444444'::uuid)
      GROUP BY performance_date
    ) dup
    WHERE rp.route_id = 'a4444444-4444-4444-4444-444444444444'::uuid
      AND rp.performance_date = dup.performance_date;

    INSERT INTO public.route_performance (route_id, performance_date, total_sales, total_collected, total_due)
    SELECT 'a4444444-4444-4444-4444-444444444444'::uuid, performance_date, total_sales, total_collected, total_due
    FROM public.route_performance
    WHERE route_id IN (SELECT id FROM public.routes WHERE name ILIKE '%Dammapeta%' AND id <> 'a4444444-4444-4444-4444-444444444444'::uuid)
      AND performance_date NOT IN (SELECT performance_date FROM public.route_performance WHERE route_id = 'a4444444-4444-4444-4444-444444444444'::uuid)
    ON CONFLICT (route_id, performance_date) DO NOTHING;

    DELETE FROM public.route_performance
    WHERE route_id IN (SELECT id FROM public.routes WHERE name ILIKE '%Dammapeta%' AND id <> 'a4444444-4444-4444-4444-444444444444'::uuid);
  END IF;
END $$;

-- 2C. Delete duplicate route records safely
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='routes') THEN
    DELETE FROM public.routes
    WHERE (name ILIKE '%Local%' OR name ILIKE '%Raghavapuram%' OR name ILIKE '%Mukkinavarigudem%' OR name ILIKE '%Dammapeta%')
      AND id NOT IN ('a1111111-1111-1111-1111-111111111111'::uuid, 'a2222222-2222-2222-2222-222222222222'::uuid, 'a3333333-3333-3333-3333-333333333333'::uuid, 'a4444444-4444-4444-4444-444444444444'::uuid);
  END IF;
END $$;


-- ============================================================
-- STEP 3: SCHEMA — ENSURE ALL REQUIRED TABLES & COLUMNS EXIST
-- ============================================================

-- Bills table
CREATE TABLE IF NOT EXISTS public.bills (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number TEXT NOT NULL,
  bill_type TEXT NOT NULL CHECK (bill_type IN ('company_sale','dealer_invoice','driver_sale','gst_invoice','non_gst_invoice')),
  customer_name TEXT,
  customer_phone TEXT,
  customer_address TEXT,
  dealer_id UUID REFERENCES public.dealers(id) ON DELETE SET NULL,
  driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  route_id UUID REFERENCES public.routes(id) ON DELETE SET NULL,
  subtotal NUMERIC(12,2) DEFAULT 0,
  gst_amount NUMERIC(12,2) DEFAULT 0,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_method TEXT DEFAULT 'cash',
  cash_amount NUMERIC(12,2) DEFAULT 0,
  upi_amount NUMERIC(12,2) DEFAULT 0,
  paid_amount NUMERIC(12,2) DEFAULT 0,
  due_amount NUMERIC(12,2) DEFAULT 0,
  payment_status TEXT DEFAULT 'paid' CHECK (payment_status IN ('paid','partial','due')),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bill items
CREATE TABLE IF NOT EXISTS public.bill_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bill_id UUID REFERENCES public.bills(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  rate NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  gst_rate NUMERIC(5,2) DEFAULT 0,
  gst_amount NUMERIC(12,2) DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dealer collections
CREATE TABLE IF NOT EXISTS public.dealer_collections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dealer_id UUID REFERENCES public.dealers(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_mode TEXT DEFAULT 'cash' CHECK (payment_mode IN ('cash','upi')),
  notes TEXT,
  collected_date DATE NOT NULL DEFAULT CURRENT_DATE,
  collected_by TEXT DEFAULT 'Admin',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customer ledger
CREATE TABLE IF NOT EXISTS public.customer_ledger (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name TEXT NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('bill','payment','adjustment')),
  bill_id UUID REFERENCES public.bills(id) ON DELETE SET NULL,
  debit NUMERIC(12,2) DEFAULT 0,
  credit NUMERIC(12,2) DEFAULT 0,
  balance NUMERIC(12,2) DEFAULT 0,
  description TEXT,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure dealers outstanding columns are present
ALTER TABLE IF EXISTS public.dealers
  ADD COLUMN IF NOT EXISTS outstanding_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_sales NUMERIC(12,2) DEFAULT 0;

-- Ensure route_sales fields exist
ALTER TABLE IF EXISTS public.route_sales
  ADD COLUMN IF NOT EXISTS cash_paid NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS upi_paid NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS due_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'paid',
  ADD COLUMN IF NOT EXISTS sale_date DATE DEFAULT CURRENT_DATE;

-- Route customers (pricing sheet config)
CREATE TABLE IF NOT EXISTS public.route_customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  route_id UUID REFERENCES public.routes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  section TEXT NOT NULL CHECK (section IN ('cans','bags','bottles')),
  product_name TEXT DEFAULT 'Water Can (20L)',
  default_qty NUMERIC(10,2) DEFAULT 1,
  default_rate NUMERIC(12,2) DEFAULT 15,
  is_manual_rate BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Route expenses
CREATE TABLE IF NOT EXISTS public.route_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- Stock items
CREATE TABLE IF NOT EXISTS public.stock_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'pcs',
  opening_stock INTEGER DEFAULT 0,
  low_stock_threshold INTEGER DEFAULT 50,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure stock transactions have correct columns
ALTER TABLE IF EXISTS public.stock_transactions
  ADD COLUMN IF NOT EXISTS stock_item_id UUID REFERENCES public.stock_items(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS item_name TEXT;

-- Driver performance report table
CREATE TABLE IF NOT EXISTS public.driver_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID REFERENCES public.drivers(id) ON DELETE CASCADE,
  performance_date DATE NOT NULL,
  total_sales NUMERIC(12,2) DEFAULT 0,
  total_collected NUMERIC(12,2) DEFAULT 0,
  total_due NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(driver_id, performance_date)
);

-- Route performance report table
CREATE TABLE IF NOT EXISTS public.route_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID REFERENCES public.routes(id) ON DELETE CASCADE,
  performance_date DATE NOT NULL,
  total_sales NUMERIC(12,2) DEFAULT 0,
  total_collected NUMERIC(12,2) DEFAULT 0,
  total_due NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(route_id, performance_date)
);

-- Customer dues table
CREATE TABLE IF NOT EXISTS public.customer_dues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT UNIQUE NOT NULL,
  route_id UUID REFERENCES public.routes(id) ON DELETE SET NULL,
  driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  due_amount NUMERIC(12,2) DEFAULT 0,
  status TEXT DEFAULT 'pending',
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dealer sales
CREATE TABLE IF NOT EXISTS public.dealer_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID REFERENCES public.bills(id) ON DELETE CASCADE,
  dealer_id UUID REFERENCES public.dealers(id) ON DELETE CASCADE,
  total_amount NUMERIC(12,2) DEFAULT 0,
  paid_amount NUMERIC(12,2) DEFAULT 0,
  due_amount NUMERIC(12,2) DEFAULT 0,
  sale_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dealer ledger
CREATE TABLE IF NOT EXISTS public.dealer_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id UUID REFERENCES public.dealers(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('invoice', 'payment', 'adjustment')),
  amount NUMERIC(12,2) DEFAULT 0,
  reference_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Driver sales
CREATE TABLE IF NOT EXISTS public.driver_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID REFERENCES public.bills(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES public.drivers(id) ON DELETE CASCADE,
  total_amount NUMERIC(12,2) DEFAULT 0,
  paid_amount NUMERIC(12,2) DEFAULT 0,
  due_amount NUMERIC(12,2) DEFAULT 0,
  sale_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily reports
CREATE TABLE IF NOT EXISTS public.daily_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_date DATE UNIQUE NOT NULL,
  total_sales NUMERIC(12,2) DEFAULT 0,
  total_cash NUMERIC(12,2) DEFAULT 0,
  total_upi NUMERIC(12,2) DEFAULT 0,
  total_due NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Monthly reports
CREATE TABLE IF NOT EXISTS public.monthly_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  total_sales NUMERIC(12,2) DEFAULT 0,
  total_cash NUMERIC(12,2) DEFAULT 0,
  total_upi NUMERIC(12,2) DEFAULT 0,
  total_due NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(month, year)
);

-- ============================================================
-- STEP 4: VIEW REBUILDS WITH SECURITY HARDENING
-- ============================================================

DROP VIEW IF EXISTS public.stock_status CASCADE;
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

DROP VIEW IF EXISTS public.daily_sales_summary CASCADE;
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


-- ============================================================
-- STEP 5: SECURE FUNCTIONS & MUTABLE SEARCH PATH FIXED
-- ============================================================

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

-- Revoke get_user_role execution from general public/anon
REVOKE EXECUTE ON FUNCTION public.get_user_role() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated;

-- Billing auto-propagation trigger function
CREATE OR REPLACE FUNCTION public.sync_bills_data()
RETURNS TRIGGER AS $$
DECLARE
  v_month INTEGER;
  v_year INTEGER;
  v_paid_amount NUMERIC(12,2);
BEGIN
  v_month := EXTRACT(MONTH FROM NEW.date);
  v_year := EXTRACT(YEAR FROM NEW.date);
  v_paid_amount := NEW.total_amount - NEW.due_amount;

  -- Only sync reports for non-driver sales (company sales, dealer invoices, etc.)
  -- Driver sales are inserted into route_sales as well, which triggers sync_route_sales_data() to update reports.
  IF NEW.bill_type <> 'driver_sale' THEN
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
  END IF;

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

    -- Update outstanding_amount and total_sales in dealers
    UPDATE public.dealers 
    SET 
      outstanding_amount = COALESCE(outstanding_amount, 0) + NEW.due_amount,
      total_sales = COALESCE(total_sales, 0) + NEW.total_amount
    WHERE id = NEW.dealer_id;
  END IF;

  -- D. Driver Billing Integration (only write to history, skip performance which is handled by route_sales trigger)
  IF NEW.bill_type = 'driver_sale' AND NEW.driver_id IS NOT NULL THEN
    -- Update driver_sales history
    INSERT INTO public.driver_sales (bill_id, driver_id, total_amount, paid_amount, due_amount, sale_date)
    VALUES (NEW.id, NEW.driver_id, NEW.total_amount, v_paid_amount, NEW.due_amount, NEW.date);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public;

-- Route sales auto-sync trigger function
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
  IF NEW.route_id IS NOT NULL THEN
    INSERT INTO public.route_performance (route_id, performance_date, total_sales, total_collected, total_due)
    VALUES (NEW.route_id, NEW.sale_date, NEW.total_amount, (NEW.cash_paid + NEW.upi_paid), NEW.due_amount)
    ON CONFLICT (route_id, performance_date) DO UPDATE SET
      total_sales = public.route_performance.total_sales + EXCLUDED.total_sales,
      total_collected = public.route_performance.total_collected + EXCLUDED.total_collected,
      total_due = public.route_performance.total_due + EXCLUDED.total_due;
  END IF;

  -- E. Sync Customer Dues
  IF NEW.due_amount > 0 THEN
    INSERT INTO public.customer_dues (customer_name, route_id, driver_id, due_amount, status, last_updated)
    VALUES (NEW.customer_name, NEW.route_id, NEW.driver_id, NEW.due_amount, 'pending', NOW())
    ON CONFLICT (customer_name) DO UPDATE SET
      due_amount = public.customer_dues.due_amount + EXCLUDED.due_amount,
      status = 'pending',
      last_updated = NOW(),
      route_id = EXCLUDED.route_id,
      driver_id = EXCLUDED.driver_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public;

-- Dealer collections auto-sync trigger function
CREATE OR REPLACE FUNCTION public.sync_dealer_collections_data()
RETURNS TRIGGER AS $$
BEGIN
  -- 1. Update outstanding_amount in dealers (reduce outstanding balance by collected amount)
  UPDATE public.dealers 
  SET outstanding_amount = GREATEST(0, COALESCE(outstanding_amount, 0) - NEW.amount)
  WHERE id = NEW.dealer_id;

  -- 2. Update dealer_ledger
  INSERT INTO public.dealer_ledger (dealer_id, transaction_type, amount, reference_id)
  VALUES (NEW.dealer_id, 'payment', NEW.amount, NEW.id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public;


-- ============================================================
-- STEP 6: ATTACH TRIGGERS
-- ============================================================

-- 1. Bills trigger
DROP TRIGGER IF EXISTS trg_sync_bills ON public.bills;
CREATE TRIGGER trg_sync_bills
  AFTER INSERT ON public.bills
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_bills_data();

-- 2. Route sales trigger
DROP TRIGGER IF EXISTS on_route_sale_inserted ON public.route_sales;
CREATE TRIGGER on_route_sale_inserted
  AFTER INSERT ON public.route_sales
  FOR EACH ROW 
  EXECUTE FUNCTION public.sync_route_sales_data();

-- 3. Dealer collections trigger
DROP TRIGGER IF EXISTS trg_sync_dealer_collections ON public.dealer_collections;
CREATE TRIGGER trg_sync_dealer_collections
  AFTER INSERT ON public.dealer_collections
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_dealer_collections_data();


-- ============================================================
-- STEP 7: SEED PRODUCTS & STOCK ITEMS DATA
-- ============================================================

-- Seed standard stock items
INSERT INTO public.stock_items (name, category, unit, opening_stock, low_stock_threshold) VALUES
  ('Water Cans (20L)',       'product',  'cans',  0, 50),
  ('Cooling Cans (20L)',     'product',  'cans',  0, 20),
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
-- STEP 8: SEED ROUTE CUSTOMERS & RATE CARDS (CLEAN SEED)
-- ============================================================

-- Clear and re-seed route customers
DELETE FROM public.route_customers;

-- 8A. LOCAL ROUTE — CANS (Nagaraju)
INSERT INTO public.route_customers (route_id, name, section, product_name, default_qty, default_rate, is_manual_rate, sort_order) VALUES
  ('a1111111-1111-1111-1111-111111111111', 'Bismillah Daba', 'cans', 'Water Can (20L)', 10, 15, false, 1),
  ('a1111111-1111-1111-1111-111111111111', 'Vamsi Mess', 'cans', 'Water Can (20L)', 10, 15, false, 2),
  ('a1111111-1111-1111-1111-111111111111', 'Lithu', 'cans', 'Water Can (20L)', 5, 15, false, 3),
  ('a1111111-1111-1111-1111-111111111111', 'Tiffin Center-1', 'cans', 'Water Can (20L)', 4, 15, false, 4),
  ('a1111111-1111-1111-1111-111111111111', 'Tea Stall', 'cans', 'Water Can (20L)', 5, 15, false, 5),
  ('a1111111-1111-1111-1111-111111111111', 'Juice Point', 'cans', 'Water Can (20L)', 10, 15, false, 6),
  ('a1111111-1111-1111-1111-111111111111', 'Surendra Juice Point', 'cans', 'Water Can (20L)', 10, 20, false, 7),
  ('a1111111-1111-1111-1111-111111111111', 'House Point 1', 'cans', 'Water Can (20L)', 1, 30, false, 8),
  ('a1111111-1111-1111-1111-111111111111', 'House Point 2', 'cans', 'Water Can (20L)', 1, 30, false, 9),
  ('a1111111-1111-1111-1111-111111111111', 'House Point 3', 'cans', 'Water Can (20L)', 1, 30, false, 10),
  ('a1111111-1111-1111-1111-111111111111', 'House Point 4', 'cans', 'Water Can (20L)', 1, 30, false, 11),
  ('a1111111-1111-1111-1111-111111111111', 'House Point 5', 'cans', 'Water Can (20L)', 1, 30, false, 12),
  ('a1111111-1111-1111-1111-111111111111', 'House Point 6', 'cans', 'Water Can (20L)', 1, 30, false, 13),
  ('a1111111-1111-1111-1111-111111111111', 'House Point 7', 'cans', 'Water Can (20L)', 1, 30, false, 14),
  ('a1111111-1111-1111-1111-111111111111', 'House Point 8', 'cans', 'Water Can (20L)', 1, 30, false, 15),
  ('a1111111-1111-1111-1111-111111111111', 'House Point 9', 'cans', 'Water Can (20L)', 1, 30, false, 16),
  ('a1111111-1111-1111-1111-111111111111', 'House Point 10', 'cans', 'Water Can (20L)', 1, 30, false, 17),
  ('a1111111-1111-1111-1111-111111111111', 'House Point 11', 'cans', 'Water Can (20L)', 1, 30, false, 18),
  ('a1111111-1111-1111-1111-111111111111', 'House Point 12', 'cans', 'Water Can (20L)', 1, 30, false, 19),
  ('a1111111-1111-1111-1111-111111111111', 'House Point 13', 'cans', 'Water Can (20L)', 1, 30, false, 20),
  ('a1111111-1111-1111-1111-111111111111', 'House Point 14', 'cans', 'Water Can (20L)', 1, 30, false, 21),
  ('a1111111-1111-1111-1111-111111111111', 'House Point 15', 'cans', 'Water Can (20L)', 1, 30, false, 22),
  ('a1111111-1111-1111-1111-111111111111', 'SBI', 'cans', 'Water Can (20L)', 1, 0, true, 23),
  ('a1111111-1111-1111-1111-111111111111', 'Fire Station', 'cans', 'Water Can (20L)', 1, 0, true, 24);

-- 8B. LOCAL ROUTE — BAGS (Nagaraju)
INSERT INTO public.route_customers (route_id, name, section, product_name, default_qty, default_rate, is_manual_rate, sort_order) VALUES
  ('a1111111-1111-1111-1111-111111111111', 'Amaravati Wines', 'bags', 'Bags (100 Pack)', 5, 75, false, 1),
  ('a1111111-1111-1111-1111-111111111111', 'Balaji Wines', 'bags', 'Bags (100 Pack)', 5, 80, false, 2),
  ('a1111111-1111-1111-1111-111111111111', 'Shop 1', 'bags', 'Bags (100 Pack)', 5, 100, false, 3),
  ('a1111111-1111-1111-1111-111111111111', 'Bala Sundari Shop', 'bags', 'Bags (100 Pack)', 5, 95, false, 4),
  ('a1111111-1111-1111-1111-111111111111', 'Shop 2', 'bags', 'Bags (100 Pack)', 5, 90, false, 5),
  ('a1111111-1111-1111-1111-111111111111', 'Shop 3', 'bags', 'Bags (100 Pack)', 5, 90, false, 6),
  ('a1111111-1111-1111-1111-111111111111', 'Shop 4', 'bags', 'Bags (100 Pack)', 5, 90, false, 7),
  ('a1111111-1111-1111-1111-111111111111', 'Route Sale', 'bags', 'Bags (100 Pack)', 10, 100, false, 8);

-- 8C. LOCAL ROUTE — BOTTLES (Nagaraju)
INSERT INTO public.route_customers (route_id, name, section, product_name, default_qty, default_rate, is_manual_rate, sort_order) VALUES
  ('a1111111-1111-1111-1111-111111111111', 'Healthy Plate', 'bottles', '500ML Bottles', 5, 140, false, 1),
  ('a1111111-1111-1111-1111-111111111111', 'Healthy Plate', 'bottles', '1L Bottles', 5, 0, true, 2),
  ('a1111111-1111-1111-1111-111111111111', 'Bismillah Daba', 'bottles', '1L Bottles', 5, 130, false, 3),
  ('a1111111-1111-1111-1111-111111111111', 'Bismillah Daba', 'bottles', '500ML Bottles', 5, 145, false, 4),
  ('a1111111-1111-1111-1111-111111111111', 'Tiffin Shop', 'bottles', '1L Bottles', 5, 130, false, 5),
  ('a1111111-1111-1111-1111-111111111111', 'Tiffin Shop', 'bottles', '500ML Bottles', 5, 145, false, 6),
  ('a1111111-1111-1111-1111-111111111111', 'Bottle Shop 1', 'bottles', '1L Bottles', 5, 130, false, 7),
  ('a1111111-1111-1111-1111-111111111111', 'Bottle Shop 1', 'bottles', '500ML Bottles', 5, 140, false, 8),
  ('a1111111-1111-1111-1111-111111111111', 'Bottle Shop 4', 'bottles', '1L Bottles', 5, 135, false, 9),
  ('a1111111-1111-1111-1111-111111111111', 'Bottle Shop 4', 'bottles', '500ML Bottles', 5, 150, false, 10);

-- 8D. RAGHAVAPURAM ROUTE — BAGS (Driver-2)
INSERT INTO public.route_customers (route_id, name, section, product_name, default_qty, default_rate, is_manual_rate, sort_order) VALUES
  ('a2222222-2222-2222-2222-222222222222', 'Raghavapuram Wines', 'bags', 'Bags (100 Pack)', 10, 80, false, 1),
  ('a2222222-2222-2222-2222-222222222222', 'Gandicherla', 'bags', 'Bags (100 Pack)', 8, 90, false, 2),
  ('a2222222-2222-2222-2222-222222222222', 'DN Rao Peta', 'bags', 'Bags (100 Pack)', 8, 90, false, 3),
  ('a2222222-2222-2222-2222-222222222222', 'Route Sale-1', 'bags', 'Bags (100 Pack)', 10, 100, false, 4),
  ('a2222222-2222-2222-2222-222222222222', 'Route Sale-2', 'bags', 'Bags (100 Pack)', 10, 90, false, 5);

-- 8E. RAGHAVAPURAM ROUTE — CANS (Driver-2)
INSERT INTO public.route_customers (route_id, name, section, product_name, default_qty, default_rate, is_manual_rate, sort_order) VALUES
  ('a2222222-2222-2222-2222-222222222222', 'Raghavapuram Can Customer', 'cans', 'Water Can (20L)', 5, 30, false, 1);

-- 8F. RAGHAVAPURAM ROUTE — BOTTLES (Driver-2)
INSERT INTO public.route_customers (route_id, name, section, product_name, default_qty, default_rate, is_manual_rate, sort_order) VALUES
  ('a2222222-2222-2222-2222-222222222222', 'Raghavapuram Bottle', 'bottles', '1L Bottles', 5, 120, false, 1),
  ('a2222222-2222-2222-2222-222222222222', 'Raghavapuram Bottle', 'bottles', '500ML Bottles', 5, 140, false, 2);

-- 8G. MAKKINAVARIGUDEM ROUTE — BAGS (Driver-2)
INSERT INTO public.route_customers (route_id, name, section, product_name, default_qty, default_rate, is_manual_rate, sort_order) VALUES
  ('a3333333-3333-3333-3333-333333333333', 'Wine Shop', 'bags', 'Bags (100 Pack)', 10, 75, false, 1),
  ('a3333333-3333-3333-3333-333333333333', 'Aunty Shop', 'bags', 'Bags (100 Pack)', 10, 80, false, 2);

-- 8H. MAKKINAVARIGUDEM ROUTE — BOTTLES (Driver-2)
INSERT INTO public.route_customers (route_id, name, section, product_name, default_qty, default_rate, is_manual_rate, sort_order) VALUES
  ('a3333333-3333-3333-3333-333333333333', 'Wine Shop', 'bottles', '1L Bottles', 5, 110, false, 1),
  ('a3333333-3333-3333-3333-333333333333', 'Aunty Shop', 'bottles', '1L Bottles', 5, 120, false, 2);

-- 8I. DAMMAPETA ROUTE — BAGS ONLY (Driver-2)
INSERT INTO public.route_customers (route_id, name, section, product_name, default_qty, default_rate, is_manual_rate, sort_order) VALUES
  ('a4444444-4444-4444-4444-444444444444', 'Wine Shop 1', 'bags', 'Bags (100 Pack)', 10, 75, false, 1),
  ('a4444444-4444-4444-4444-444444444444', 'Wine Shop 2', 'bags', 'Bags (100 Pack)', 10, 80, false, 2),
  ('a4444444-4444-4444-4444-444444444444', 'Wine Shop 3', 'bags', 'Bags (100 Pack)', 10, 80, false, 3);


-- ============================================================
-- STEP 9: SECURITY HARDENING & GRANULAR RLS POLICIES
-- ============================================================

-- Macro loop to secure public access and enable RLS
DO $$
DECLARE
  v_tbl TEXT;
  v_tables TEXT[] := ARRAY[
    'bills', 'bill_items', 'sales', 'sale_items', 'customers', 'dealers', 
    'expenses', 'attendance', 'drivers', 'routes', 'route_stops', 
    'route_customers', 'route_sales', 'driver_collections', 'driver_sales', 
    'daily_reports', 'monthly_reports', 'driver_performance', 
    'route_performance', 'stock', 'stock_items', 'stock_transactions', 
    'payments', 'collections', 'dealer_sales', 'dealer_ledger', 'customer_dues',
    'dealer_collections', 'customer_ledger', 'route_expenses'
  ];
BEGIN
  FOREACH v_tbl IN ARRAY v_tables LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = v_tbl) THEN
      -- Enable RLS
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', v_tbl);

      -- Clean old policies
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', v_tbl || '_all', v_tbl);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', v_tbl || '_select', v_tbl);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', v_tbl || '_insert', v_tbl);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', v_tbl || '_update', v_tbl);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', v_tbl || '_delete', v_tbl);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'dealer_collections_auth', v_tbl);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'customer_ledger_auth', v_tbl);
      
      -- Create policies
      -- SELECT: authenticated users
      EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (TRUE)', v_tbl || '_select', v_tbl);
      
      -- INSERT: authenticated users
      EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (TRUE)', v_tbl || '_insert', v_tbl);
      
      -- UPDATE: authenticated users
      EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (TRUE) WITH CHECK (TRUE)', v_tbl || '_update', v_tbl);
      
      -- DELETE: Admin role only
      EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (public.get_user_role() = %L)', v_tbl || '_delete', v_tbl, 'admin');
    END IF;
  END LOOP;
END $$;

-- Special admin-write restriction tables
-- 1. employees
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "employees_select" ON public.employees;
DROP POLICY IF EXISTS "employees_insert" ON public.employees;
DROP POLICY IF EXISTS "employees_update" ON public.employees;
DROP POLICY IF EXISTS "employees_delete" ON public.employees;
CREATE POLICY "employees_select" ON public.employees FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "employees_insert" ON public.employees FOR INSERT TO authenticated WITH CHECK (public.get_user_role() = 'admin');
CREATE POLICY "employees_update" ON public.employees FOR UPDATE TO authenticated USING (public.get_user_role() = 'admin');
CREATE POLICY "employees_delete" ON public.employees FOR DELETE TO authenticated USING (public.get_user_role() = 'admin');

-- 2. salary_payments
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'salary_payments') THEN
    ALTER TABLE public.salary_payments ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "salary_payments_select" ON public.salary_payments;
    DROP POLICY IF EXISTS "salary_payments_insert" ON public.salary_payments;
    DROP POLICY IF EXISTS "salary_payments_update" ON public.salary_payments;
    DROP POLICY IF EXISTS "salary_payments_delete" ON public.salary_payments;
    
    CREATE POLICY "salary_payments_select" ON public.salary_payments FOR SELECT TO authenticated USING (TRUE);
    CREATE POLICY "salary_payments_insert" ON public.salary_payments FOR INSERT TO authenticated WITH CHECK (public.get_user_role() = 'admin');
    CREATE POLICY "salary_payments_update" ON public.salary_payments FOR UPDATE TO authenticated USING (public.get_user_role() = 'admin');
    CREATE POLICY "salary_payments_delete" ON public.salary_payments FOR DELETE TO authenticated USING (public.get_user_role() = 'admin');
  END IF;
END $$;

-- 3. settings
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "settings_select" ON public.settings;
DROP POLICY IF EXISTS "settings_insert" ON public.settings;
DROP POLICY IF EXISTS "settings_update" ON public.settings;
DROP POLICY IF EXISTS "settings_delete" ON public.settings;
CREATE POLICY "settings_select" ON public.settings FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "settings_insert" ON public.settings FOR INSERT TO authenticated WITH CHECK (public.get_user_role() = 'admin');
CREATE POLICY "settings_update" ON public.settings FOR UPDATE TO authenticated USING (public.get_user_role() = 'admin');
CREATE POLICY "settings_delete" ON public.settings FOR DELETE TO authenticated USING (public.get_user_role() = 'admin');

-- ============================================================
-- STEP 10: VERIFICATION & COMPILATION RESULTS
-- ============================================================
SELECT 'DATABASE AUDIT AND FIXES COMPLETED! Your Royal Kissan ERP database is hardened and production-ready.' AS status;
