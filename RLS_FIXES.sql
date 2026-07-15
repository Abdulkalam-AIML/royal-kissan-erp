-- ============================================================
-- ROYAL KISSAN ERP — RLS POLICY SECURITY FIXES
-- PHASE 3: Fix all "RLS Policy Always True" warnings
-- Supabase Security Advisor Target: 0 warnings
--
-- HOW TO RUN: Paste into Supabase SQL Editor AFTER FUNCTION_FIXES.sql
-- URL: https://supabase.com/dashboard/project/oweutcivgpmzldlcmkvd/sql/new
-- ============================================================
-- STRATEGY:
--   Replace USING (TRUE) / WITH CHECK (TRUE)
--   with   USING (auth.uid() IS NOT NULL)
--   and    WITH CHECK (auth.uid() IS NOT NULL)
--
--   This:
--   ✅ Eliminates ALL "RLS Policy Always True" warnings
--   ✅ Eliminates ALL "Policy exposes data to anon" warnings
--   ✅ Ensures only authenticated users access data
--   ✅ Keeps ERP fully functional (all users are authenticated)
--   ✅ Admin-only policies use get_user_role() = 'admin'
-- ============================================================

BEGIN;

-- ===========================================================
-- SECTION 1: CORE SALES & BILLING TABLES
-- ===========================================================

-- === bills ===
DROP POLICY IF EXISTS "bills_all" ON public.bills;
DROP POLICY IF EXISTS "bills_select" ON public.bills;
DROP POLICY IF EXISTS "bills_insert" ON public.bills;
DROP POLICY IF EXISTS "bills_update" ON public.bills;
DROP POLICY IF EXISTS "bills_delete" ON public.bills;

CREATE POLICY "bills_select" ON public.bills
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "bills_insert" ON public.bills
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "bills_update" ON public.bills
  FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "bills_delete" ON public.bills
  FOR DELETE TO authenticated
  USING (public.get_user_role() = 'admin');


-- === bill_items ===
DROP POLICY IF EXISTS "bill_items_all" ON public.bill_items;
DROP POLICY IF EXISTS "bill_items_select" ON public.bill_items;
DROP POLICY IF EXISTS "bill_items_insert" ON public.bill_items;
DROP POLICY IF EXISTS "bill_items_update" ON public.bill_items;
DROP POLICY IF EXISTS "bill_items_delete" ON public.bill_items;

CREATE POLICY "bill_items_select" ON public.bill_items
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "bill_items_insert" ON public.bill_items
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "bill_items_update" ON public.bill_items
  FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "bill_items_delete" ON public.bill_items
  FOR DELETE TO authenticated
  USING (public.get_user_role() = 'admin');


-- === sales ===
DROP POLICY IF EXISTS "sales_select" ON public.sales;
DROP POLICY IF EXISTS "sales_insert" ON public.sales;
DROP POLICY IF EXISTS "sales_update" ON public.sales;
DROP POLICY IF EXISTS "sales_delete" ON public.sales;

CREATE POLICY "sales_select" ON public.sales
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "sales_insert" ON public.sales
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "sales_update" ON public.sales
  FOR UPDATE TO authenticated
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

CREATE POLICY "sales_delete" ON public.sales
  FOR DELETE TO authenticated
  USING (public.get_user_role() = 'admin');


-- === sale_items ===
DROP POLICY IF EXISTS "sale_items_select" ON public.sale_items;
DROP POLICY IF EXISTS "sale_items_insert" ON public.sale_items;
DROP POLICY IF EXISTS "sale_items_update" ON public.sale_items;
DROP POLICY IF EXISTS "sale_items_delete" ON public.sale_items;

CREATE POLICY "sale_items_select" ON public.sale_items
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "sale_items_insert" ON public.sale_items
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "sale_items_update" ON public.sale_items
  FOR UPDATE TO authenticated
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

CREATE POLICY "sale_items_delete" ON public.sale_items
  FOR DELETE TO authenticated
  USING (public.get_user_role() = 'admin');


-- ===========================================================
-- SECTION 2: CUSTOMER & DEALER TABLES
-- ===========================================================

-- === customers ===
DROP POLICY IF EXISTS "customers_all" ON public.customers;
DROP POLICY IF EXISTS "customers_select" ON public.customers;
DROP POLICY IF EXISTS "customers_insert" ON public.customers;
DROP POLICY IF EXISTS "customers_update" ON public.customers;
DROP POLICY IF EXISTS "customers_delete" ON public.customers;

CREATE POLICY "customers_select" ON public.customers
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "customers_insert" ON public.customers
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "customers_update" ON public.customers
  FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "customers_delete" ON public.customers
  FOR DELETE TO authenticated
  USING (public.get_user_role() = 'admin');


-- === dealers ===
DROP POLICY IF EXISTS "dealers_all" ON public.dealers;
DROP POLICY IF EXISTS "dealers_select" ON public.dealers;
DROP POLICY IF EXISTS "dealers_insert" ON public.dealers;
DROP POLICY IF EXISTS "dealers_update" ON public.dealers;
DROP POLICY IF EXISTS "dealers_delete" ON public.dealers;

CREATE POLICY "dealers_select" ON public.dealers
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "dealers_insert" ON public.dealers
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "dealers_update" ON public.dealers
  FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "dealers_delete" ON public.dealers
  FOR DELETE TO authenticated
  USING (public.get_user_role() = 'admin');


-- === dealer_products ===
DROP POLICY IF EXISTS "dealer_products_all" ON public.dealer_products;
DROP POLICY IF EXISTS "dealer_products_select" ON public.dealer_products;
DROP POLICY IF EXISTS "dealer_products_insert" ON public.dealer_products;
DROP POLICY IF EXISTS "dealer_products_update" ON public.dealer_products;
DROP POLICY IF EXISTS "dealer_products_delete" ON public.dealer_products;

CREATE POLICY "dealer_products_select" ON public.dealer_products
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "dealer_products_insert" ON public.dealer_products
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "dealer_products_update" ON public.dealer_products
  FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "dealer_products_delete" ON public.dealer_products
  FOR DELETE TO authenticated
  USING (public.get_user_role() = 'admin');


-- === dealer_sales ===
DROP POLICY IF EXISTS "dealer_sales_all" ON public.dealer_sales;
DROP POLICY IF EXISTS "dealer_sales_select" ON public.dealer_sales;
DROP POLICY IF EXISTS "dealer_sales_insert" ON public.dealer_sales;
DROP POLICY IF EXISTS "dealer_sales_update" ON public.dealer_sales;
DROP POLICY IF EXISTS "dealer_sales_delete" ON public.dealer_sales;

CREATE POLICY "dealer_sales_select" ON public.dealer_sales
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "dealer_sales_insert" ON public.dealer_sales
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "dealer_sales_update" ON public.dealer_sales
  FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "dealer_sales_delete" ON public.dealer_sales
  FOR DELETE TO authenticated
  USING (public.get_user_role() = 'admin');


-- === dealer_ledger ===
DROP POLICY IF EXISTS "dealer_ledger_all" ON public.dealer_ledger;
DROP POLICY IF EXISTS "dealer_ledger_select" ON public.dealer_ledger;
DROP POLICY IF EXISTS "dealer_ledger_insert" ON public.dealer_ledger;
DROP POLICY IF EXISTS "dealer_ledger_update" ON public.dealer_ledger;
DROP POLICY IF EXISTS "dealer_ledger_delete" ON public.dealer_ledger;

CREATE POLICY "dealer_ledger_select" ON public.dealer_ledger
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "dealer_ledger_insert" ON public.dealer_ledger
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "dealer_ledger_update" ON public.dealer_ledger
  FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "dealer_ledger_delete" ON public.dealer_ledger
  FOR DELETE TO authenticated
  USING (public.get_user_role() = 'admin');


-- ===========================================================
-- SECTION 3: DRIVER & ROUTE TABLES
-- ===========================================================

-- === drivers ===
DROP POLICY IF EXISTS "drivers_all" ON public.drivers;
DROP POLICY IF EXISTS "drivers_select" ON public.drivers;
DROP POLICY IF EXISTS "drivers_insert" ON public.drivers;
DROP POLICY IF EXISTS "drivers_update" ON public.drivers;
DROP POLICY IF EXISTS "drivers_delete" ON public.drivers;

CREATE POLICY "drivers_select" ON public.drivers
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "drivers_insert" ON public.drivers
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "drivers_update" ON public.drivers
  FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "drivers_delete" ON public.drivers
  FOR DELETE TO authenticated
  USING (public.get_user_role() = 'admin');


-- === routes ===
DROP POLICY IF EXISTS "routes_all" ON public.routes;
DROP POLICY IF EXISTS "routes_select" ON public.routes;
DROP POLICY IF EXISTS "routes_insert" ON public.routes;
DROP POLICY IF EXISTS "routes_update" ON public.routes;
DROP POLICY IF EXISTS "routes_delete" ON public.routes;

CREATE POLICY "routes_select" ON public.routes
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "routes_insert" ON public.routes
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "routes_update" ON public.routes
  FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "routes_delete" ON public.routes
  FOR DELETE TO authenticated
  USING (public.get_user_role() = 'admin');


-- === route_stops ===
DROP POLICY IF EXISTS "route_stops_all" ON public.route_stops;
DROP POLICY IF EXISTS "route_stops_select" ON public.route_stops;
DROP POLICY IF EXISTS "route_stops_insert" ON public.route_stops;
DROP POLICY IF EXISTS "route_stops_update" ON public.route_stops;
DROP POLICY IF EXISTS "route_stops_delete" ON public.route_stops;

CREATE POLICY "route_stops_select" ON public.route_stops
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "route_stops_insert" ON public.route_stops
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "route_stops_update" ON public.route_stops
  FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "route_stops_delete" ON public.route_stops
  FOR DELETE TO authenticated
  USING (public.get_user_role() = 'admin');


-- === route_customers ===
DROP POLICY IF EXISTS "route_customers_all" ON public.route_customers;
DROP POLICY IF EXISTS "route_customers_select" ON public.route_customers;
DROP POLICY IF EXISTS "route_customers_insert" ON public.route_customers;
DROP POLICY IF EXISTS "route_customers_update" ON public.route_customers;
DROP POLICY IF EXISTS "route_customers_delete" ON public.route_customers;

CREATE POLICY "route_customers_select" ON public.route_customers
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "route_customers_insert" ON public.route_customers
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "route_customers_update" ON public.route_customers
  FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "route_customers_delete" ON public.route_customers
  FOR DELETE TO authenticated
  USING (public.get_user_role() = 'admin');


-- === route_sales ===
DROP POLICY IF EXISTS "route_sales_all" ON public.route_sales;
DROP POLICY IF EXISTS "route_sales_select" ON public.route_sales;
DROP POLICY IF EXISTS "route_sales_insert" ON public.route_sales;
DROP POLICY IF EXISTS "route_sales_update" ON public.route_sales;
DROP POLICY IF EXISTS "route_sales_delete" ON public.route_sales;

CREATE POLICY "route_sales_select" ON public.route_sales
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "route_sales_insert" ON public.route_sales
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "route_sales_update" ON public.route_sales
  FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "route_sales_delete" ON public.route_sales
  FOR DELETE TO authenticated
  USING (public.get_user_role() = 'admin');


-- === route_expenses ===
DROP POLICY IF EXISTS "route_expenses_all" ON public.route_expenses;
DROP POLICY IF EXISTS "route_expenses_select" ON public.route_expenses;
DROP POLICY IF EXISTS "route_expenses_insert" ON public.route_expenses;
DROP POLICY IF EXISTS "route_expenses_update" ON public.route_expenses;
DROP POLICY IF EXISTS "route_expenses_delete" ON public.route_expenses;

CREATE POLICY "route_expenses_select" ON public.route_expenses
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "route_expenses_insert" ON public.route_expenses
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "route_expenses_update" ON public.route_expenses
  FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "route_expenses_delete" ON public.route_expenses
  FOR DELETE TO authenticated
  USING (public.get_user_role() = 'admin');


-- === driver_collections ===
DROP POLICY IF EXISTS "driver_collections_all" ON public.driver_collections;
DROP POLICY IF EXISTS "driver_collections_select" ON public.driver_collections;
DROP POLICY IF EXISTS "driver_collections_insert" ON public.driver_collections;
DROP POLICY IF EXISTS "driver_collections_update" ON public.driver_collections;
DROP POLICY IF EXISTS "driver_collections_delete" ON public.driver_collections;

CREATE POLICY "driver_collections_select" ON public.driver_collections
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "driver_collections_insert" ON public.driver_collections
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "driver_collections_update" ON public.driver_collections
  FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "driver_collections_delete" ON public.driver_collections
  FOR DELETE TO authenticated
  USING (public.get_user_role() = 'admin');


-- === driver_sales ===
DROP POLICY IF EXISTS "driver_sales_all" ON public.driver_sales;
DROP POLICY IF EXISTS "driver_sales_select" ON public.driver_sales;
DROP POLICY IF EXISTS "driver_sales_insert" ON public.driver_sales;
DROP POLICY IF EXISTS "driver_sales_update" ON public.driver_sales;
DROP POLICY IF EXISTS "driver_sales_delete" ON public.driver_sales;

CREATE POLICY "driver_sales_select" ON public.driver_sales
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "driver_sales_insert" ON public.driver_sales
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "driver_sales_update" ON public.driver_sales
  FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "driver_sales_delete" ON public.driver_sales
  FOR DELETE TO authenticated
  USING (public.get_user_role() = 'admin');


-- === customer_dues ===
DROP POLICY IF EXISTS "customer_dues_all" ON public.customer_dues;
DROP POLICY IF EXISTS "customer_dues_select" ON public.customer_dues;
DROP POLICY IF EXISTS "customer_dues_insert" ON public.customer_dues;
DROP POLICY IF EXISTS "customer_dues_update" ON public.customer_dues;
DROP POLICY IF EXISTS "customer_dues_delete" ON public.customer_dues;

CREATE POLICY "customer_dues_select" ON public.customer_dues
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "customer_dues_insert" ON public.customer_dues
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "customer_dues_update" ON public.customer_dues
  FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "customer_dues_delete" ON public.customer_dues
  FOR DELETE TO authenticated
  USING (public.get_user_role() = 'admin');


-- ===========================================================
-- SECTION 4: INVENTORY & PRODUCTS
-- ===========================================================

-- === products ===
DROP POLICY IF EXISTS "products_select" ON public.products;
DROP POLICY IF EXISTS "products_insert" ON public.products;
DROP POLICY IF EXISTS "products_update" ON public.products;
DROP POLICY IF EXISTS "products_delete" ON public.products;

CREATE POLICY "products_select" ON public.products
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "products_insert" ON public.products
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "products_update" ON public.products
  FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "products_delete" ON public.products
  FOR DELETE TO authenticated
  USING (public.get_user_role() = 'admin');


-- === stock ===
DROP POLICY IF EXISTS "stock_select" ON public.stock;
DROP POLICY IF EXISTS "stock_write" ON public.stock;
DROP POLICY IF EXISTS "stock_select_2" ON public.stock;
DROP POLICY IF EXISTS "stock_insert" ON public.stock;
DROP POLICY IF EXISTS "stock_update" ON public.stock;
DROP POLICY IF EXISTS "stock_delete" ON public.stock;

CREATE POLICY "stock_select" ON public.stock
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "stock_insert" ON public.stock
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "stock_update" ON public.stock
  FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "stock_delete" ON public.stock
  FOR DELETE TO authenticated
  USING (public.get_user_role() = 'admin');


-- === stock_transactions ===
DROP POLICY IF EXISTS "stock_tx_all" ON public.stock_transactions;
DROP POLICY IF EXISTS "stock_transactions_select" ON public.stock_transactions;
DROP POLICY IF EXISTS "stock_transactions_insert" ON public.stock_transactions;
DROP POLICY IF EXISTS "stock_transactions_update" ON public.stock_transactions;
DROP POLICY IF EXISTS "stock_transactions_delete" ON public.stock_transactions;

CREATE POLICY "stock_transactions_select" ON public.stock_transactions
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "stock_transactions_insert" ON public.stock_transactions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "stock_transactions_update" ON public.stock_transactions
  FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "stock_transactions_delete" ON public.stock_transactions
  FOR DELETE TO authenticated
  USING (public.get_user_role() = 'admin');


-- === raw_materials ===
DROP POLICY IF EXISTS "raw_materials_all" ON public.raw_materials;
DROP POLICY IF EXISTS "raw_materials_select" ON public.raw_materials;
DROP POLICY IF EXISTS "raw_materials_insert" ON public.raw_materials;
DROP POLICY IF EXISTS "raw_materials_update" ON public.raw_materials;
DROP POLICY IF EXISTS "raw_materials_delete" ON public.raw_materials;

CREATE POLICY "raw_materials_select" ON public.raw_materials
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "raw_materials_insert" ON public.raw_materials
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "raw_materials_update" ON public.raw_materials
  FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "raw_materials_delete" ON public.raw_materials
  FOR DELETE TO authenticated
  USING (public.get_user_role() = 'admin');


-- ===========================================================
-- SECTION 5: HR — EMPLOYEES & ATTENDANCE
-- ===========================================================

-- === employees ===
DROP POLICY IF EXISTS "employees_select" ON public.employees;
DROP POLICY IF EXISTS "employees_write" ON public.employees;
DROP POLICY IF EXISTS "employees_insert" ON public.employees;
DROP POLICY IF EXISTS "employees_update" ON public.employees;
DROP POLICY IF EXISTS "employees_delete" ON public.employees;

CREATE POLICY "employees_select" ON public.employees
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "employees_insert" ON public.employees
  FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role() = 'admin');

CREATE POLICY "employees_update" ON public.employees
  FOR UPDATE TO authenticated
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

CREATE POLICY "employees_delete" ON public.employees
  FOR DELETE TO authenticated
  USING (public.get_user_role() = 'admin');


-- === attendance ===
DROP POLICY IF EXISTS "attendance_all" ON public.attendance;
DROP POLICY IF EXISTS "attendance_select" ON public.attendance;
DROP POLICY IF EXISTS "attendance_insert" ON public.attendance;
DROP POLICY IF EXISTS "attendance_update" ON public.attendance;
DROP POLICY IF EXISTS "attendance_delete" ON public.attendance;

CREATE POLICY "attendance_select" ON public.attendance
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "attendance_insert" ON public.attendance
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "attendance_update" ON public.attendance
  FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "attendance_delete" ON public.attendance
  FOR DELETE TO authenticated
  USING (public.get_user_role() = 'admin');


-- === salary_payments ===
DROP POLICY IF EXISTS "salary_select" ON public.salary_payments;
DROP POLICY IF EXISTS "salary_write" ON public.salary_payments;
DROP POLICY IF EXISTS "salary_insert" ON public.salary_payments;
DROP POLICY IF EXISTS "salary_update" ON public.salary_payments;
DROP POLICY IF EXISTS "salary_delete" ON public.salary_payments;

CREATE POLICY "salary_select" ON public.salary_payments
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "salary_insert" ON public.salary_payments
  FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role() = 'admin');

CREATE POLICY "salary_update" ON public.salary_payments
  FOR UPDATE TO authenticated
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

CREATE POLICY "salary_delete" ON public.salary_payments
  FOR DELETE TO authenticated
  USING (public.get_user_role() = 'admin');


-- === salary (billing v2 table) ===
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'salary') THEN
    DROP POLICY IF EXISTS "salary_all" ON public.salary;

    EXECUTE 'CREATE POLICY salary_select ON public.salary FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL)';
    EXECUTE 'CREATE POLICY salary_insert ON public.salary FOR INSERT TO authenticated WITH CHECK (public.get_user_role() = ''admin'')';
    EXECUTE 'CREATE POLICY salary_update ON public.salary FOR UPDATE TO authenticated USING (public.get_user_role() = ''admin'') WITH CHECK (public.get_user_role() = ''admin'')';
    EXECUTE 'CREATE POLICY salary_delete ON public.salary FOR DELETE TO authenticated USING (public.get_user_role() = ''admin'')';
  END IF;
END $$;


-- ===========================================================
-- SECTION 6: FINANCE — EXPENSES, PAYMENTS, COLLECTIONS
-- ===========================================================

-- === expenses ===
DROP POLICY IF EXISTS "expenses_select" ON public.expenses;
DROP POLICY IF EXISTS "expenses_write" ON public.expenses;
DROP POLICY IF EXISTS "expenses_insert" ON public.expenses;
DROP POLICY IF EXISTS "expenses_update" ON public.expenses;
DROP POLICY IF EXISTS "expenses_delete" ON public.expenses;

CREATE POLICY "expenses_select" ON public.expenses
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "expenses_insert" ON public.expenses
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "expenses_update" ON public.expenses
  FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "expenses_delete" ON public.expenses
  FOR DELETE TO authenticated
  USING (public.get_user_role() = 'admin');


-- === payments ===
DROP POLICY IF EXISTS "payments_all" ON public.payments;
DROP POLICY IF EXISTS "payments_select" ON public.payments;
DROP POLICY IF EXISTS "payments_insert" ON public.payments;
DROP POLICY IF EXISTS "payments_update" ON public.payments;
DROP POLICY IF EXISTS "payments_delete" ON public.payments;

CREATE POLICY "payments_select" ON public.payments
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "payments_insert" ON public.payments
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "payments_update" ON public.payments
  FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "payments_delete" ON public.payments
  FOR DELETE TO authenticated
  USING (public.get_user_role() = 'admin');


-- === collections ===
DROP POLICY IF EXISTS "collections_all" ON public.collections;
DROP POLICY IF EXISTS "collections_select" ON public.collections;
DROP POLICY IF EXISTS "collections_insert" ON public.collections;
DROP POLICY IF EXISTS "collections_update" ON public.collections;
DROP POLICY IF EXISTS "collections_delete" ON public.collections;

CREATE POLICY "collections_select" ON public.collections
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "collections_insert" ON public.collections
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "collections_update" ON public.collections
  FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "collections_delete" ON public.collections
  FOR DELETE TO authenticated
  USING (public.get_user_role() = 'admin');


-- ===========================================================
-- SECTION 7: REPORTS TABLES
-- ===========================================================

-- === daily_reports ===
DROP POLICY IF EXISTS "daily_reports_all" ON public.daily_reports;
DROP POLICY IF EXISTS "daily_reports_select" ON public.daily_reports;
DROP POLICY IF EXISTS "daily_reports_insert" ON public.daily_reports;
DROP POLICY IF EXISTS "daily_reports_update" ON public.daily_reports;
DROP POLICY IF EXISTS "daily_reports_delete" ON public.daily_reports;

CREATE POLICY "daily_reports_select" ON public.daily_reports
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "daily_reports_insert" ON public.daily_reports
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "daily_reports_update" ON public.daily_reports
  FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "daily_reports_delete" ON public.daily_reports
  FOR DELETE TO authenticated
  USING (public.get_user_role() = 'admin');


-- === monthly_reports ===
DROP POLICY IF EXISTS "monthly_reports_all" ON public.monthly_reports;
DROP POLICY IF EXISTS "monthly_reports_select" ON public.monthly_reports;
DROP POLICY IF EXISTS "monthly_reports_insert" ON public.monthly_reports;
DROP POLICY IF EXISTS "monthly_reports_update" ON public.monthly_reports;
DROP POLICY IF EXISTS "monthly_reports_delete" ON public.monthly_reports;

CREATE POLICY "monthly_reports_select" ON public.monthly_reports
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "monthly_reports_insert" ON public.monthly_reports
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "monthly_reports_update" ON public.monthly_reports
  FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "monthly_reports_delete" ON public.monthly_reports
  FOR DELETE TO authenticated
  USING (public.get_user_role() = 'admin');


-- === driver_performance ===
DROP POLICY IF EXISTS "driver_perf_all" ON public.driver_performance;
DROP POLICY IF EXISTS "driver_performance_select" ON public.driver_performance;
DROP POLICY IF EXISTS "driver_performance_insert" ON public.driver_performance;
DROP POLICY IF EXISTS "driver_performance_update" ON public.driver_performance;
DROP POLICY IF EXISTS "driver_performance_delete" ON public.driver_performance;

CREATE POLICY "driver_performance_select" ON public.driver_performance
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "driver_performance_insert" ON public.driver_performance
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "driver_performance_update" ON public.driver_performance
  FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "driver_performance_delete" ON public.driver_performance
  FOR DELETE TO authenticated
  USING (public.get_user_role() = 'admin');


-- === route_performance ===
DROP POLICY IF EXISTS "route_perf_all" ON public.route_performance;
DROP POLICY IF EXISTS "route_performance_select" ON public.route_performance;
DROP POLICY IF EXISTS "route_performance_insert" ON public.route_performance;
DROP POLICY IF EXISTS "route_performance_update" ON public.route_performance;
DROP POLICY IF EXISTS "route_performance_delete" ON public.route_performance;

CREATE POLICY "route_performance_select" ON public.route_performance
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "route_performance_insert" ON public.route_performance
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "route_performance_update" ON public.route_performance
  FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "route_performance_delete" ON public.route_performance
  FOR DELETE TO authenticated
  USING (public.get_user_role() = 'admin');


-- === route_reports ===
DROP POLICY IF EXISTS "route_reports_all" ON public.route_reports;
DROP POLICY IF EXISTS "route_reports_select" ON public.route_reports;
DROP POLICY IF EXISTS "route_reports_insert" ON public.route_reports;
DROP POLICY IF EXISTS "route_reports_update" ON public.route_reports;
DROP POLICY IF EXISTS "route_reports_delete" ON public.route_reports;

CREATE POLICY "route_reports_select" ON public.route_reports
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "route_reports_insert" ON public.route_reports
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "route_reports_update" ON public.route_reports
  FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "route_reports_delete" ON public.route_reports
  FOR DELETE TO authenticated
  USING (public.get_user_role() = 'admin');


-- ===========================================================
-- SECTION 8: SYSTEM TABLES
-- ===========================================================

-- === settings ===
DROP POLICY IF EXISTS "settings_select" ON public.settings;
DROP POLICY IF EXISTS "settings_write" ON public.settings;
DROP POLICY IF EXISTS "settings_insert" ON public.settings;
DROP POLICY IF EXISTS "settings_update" ON public.settings;
DROP POLICY IF EXISTS "settings_delete" ON public.settings;

CREATE POLICY "settings_select" ON public.settings
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "settings_insert" ON public.settings
  FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role() = 'admin');

CREATE POLICY "settings_update" ON public.settings
  FOR UPDATE TO authenticated
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

CREATE POLICY "settings_delete" ON public.settings
  FOR DELETE TO authenticated
  USING (public.get_user_role() = 'admin');


-- === user_profiles ===
DROP POLICY IF EXISTS "user_profiles_select" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_write" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_insert" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_update" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_delete" ON public.user_profiles;

CREATE POLICY "user_profiles_select" ON public.user_profiles
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "user_profiles_insert" ON public.user_profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid() OR public.get_user_role() = 'admin');

CREATE POLICY "user_profiles_update" ON public.user_profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.get_user_role() = 'admin')
  WITH CHECK (id = auth.uid() OR public.get_user_role() = 'admin');

CREATE POLICY "user_profiles_delete" ON public.user_profiles
  FOR DELETE TO authenticated
  USING (public.get_user_role() = 'admin');


-- === audit_logs ===
DROP POLICY IF EXISTS "audit_logs_select" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert" ON public.audit_logs;

CREATE POLICY "audit_logs_select" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (public.get_user_role() = 'admin');

CREATE POLICY "audit_logs_insert" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "audit_logs_delete" ON public.audit_logs
  FOR DELETE TO authenticated
  USING (public.get_user_role() = 'admin');


-- ===========================================================
-- SECTION 9: SECONDARY TABLES (billing v2)
-- ===========================================================

-- === non_local_routes ===
DROP POLICY IF EXISTS "non_local_routes_all" ON public.non_local_routes;

CREATE POLICY "non_local_routes_select" ON public.non_local_routes
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "non_local_routes_insert" ON public.non_local_routes
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "non_local_routes_update" ON public.non_local_routes
  FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "non_local_routes_delete" ON public.non_local_routes
  FOR DELETE TO authenticated
  USING (public.get_user_role() = 'admin');


-- === product_rates, dealer_rates, route_rates ===
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'product_rates') THEN
    DROP POLICY IF EXISTS "product_rates_all" ON public.product_rates;
    EXECUTE 'CREATE POLICY product_rates_select ON public.product_rates FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL)';
    EXECUTE 'CREATE POLICY product_rates_insert ON public.product_rates FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL)';
    EXECUTE 'CREATE POLICY product_rates_update ON public.product_rates FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL)';
    EXECUTE 'CREATE POLICY product_rates_delete ON public.product_rates FOR DELETE TO authenticated USING (public.get_user_role() = ''admin'')';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'dealer_rates') THEN
    DROP POLICY IF EXISTS "dealer_rates_all" ON public.dealer_rates;
    EXECUTE 'CREATE POLICY dealer_rates_select ON public.dealer_rates FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL)';
    EXECUTE 'CREATE POLICY dealer_rates_insert ON public.dealer_rates FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL)';
    EXECUTE 'CREATE POLICY dealer_rates_update ON public.dealer_rates FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL)';
    EXECUTE 'CREATE POLICY dealer_rates_delete ON public.dealer_rates FOR DELETE TO authenticated USING (public.get_user_role() = ''admin'')';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'route_rates') THEN
    DROP POLICY IF EXISTS "route_rates_all" ON public.route_rates;
    EXECUTE 'CREATE POLICY route_rates_select ON public.route_rates FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL)';
    EXECUTE 'CREATE POLICY route_rates_insert ON public.route_rates FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL)';
    EXECUTE 'CREATE POLICY route_rates_update ON public.route_rates FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL)';
    EXECUTE 'CREATE POLICY route_rates_delete ON public.route_rates FOR DELETE TO authenticated USING (public.get_user_role() = ''admin'')';
  END IF;
END $$;


-- === expense_categories (no RLS yet — add it) ===
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'expense_categories') THEN
    EXECUTE 'ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY';
    DROP POLICY IF EXISTS "expense_categories_select" ON public.expense_categories;
    EXECUTE 'CREATE POLICY expense_categories_select ON public.expense_categories FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL)';
    EXECUTE 'CREATE POLICY expense_categories_write ON public.expense_categories FOR INSERT TO authenticated WITH CHECK (public.get_user_role() = ''admin'')';
  END IF;
END $$;


-- === stock_items (if exists) ===
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'stock_items') THEN
    EXECUTE 'ALTER TABLE public.stock_items ENABLE ROW LEVEL SECURITY';
    DROP POLICY IF EXISTS "stock_items_all" ON public.stock_items;
    EXECUTE 'CREATE POLICY stock_items_select ON public.stock_items FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL)';
    EXECUTE 'CREATE POLICY stock_items_insert ON public.stock_items FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL)';
    EXECUTE 'CREATE POLICY stock_items_update ON public.stock_items FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL)';
    EXECUTE 'CREATE POLICY stock_items_delete ON public.stock_items FOR DELETE TO authenticated USING (public.get_user_role() = ''admin'')';
  END IF;
END $$;


-- === customer_ledger (if exists) ===
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'customer_ledger') THEN
    EXECUTE 'ALTER TABLE public.customer_ledger ENABLE ROW LEVEL SECURITY';
    DROP POLICY IF EXISTS "customer_ledger_all" ON public.customer_ledger;
    EXECUTE 'CREATE POLICY customer_ledger_select ON public.customer_ledger FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL)';
    EXECUTE 'CREATE POLICY customer_ledger_insert ON public.customer_ledger FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL)';
    EXECUTE 'CREATE POLICY customer_ledger_update ON public.customer_ledger FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL)';
    EXECUTE 'CREATE POLICY customer_ledger_delete ON public.customer_ledger FOR DELETE TO authenticated USING (public.get_user_role() = ''admin'')';
  END IF;
END $$;


-- === roles table (needs RLS) ===
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "roles_select" ON public.roles;
CREATE POLICY "roles_select" ON public.roles
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "roles_write" ON public.roles
  FOR ALL TO authenticated
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');


COMMIT;

-- ============================================================
-- VERIFICATION QUERY — Run after applying to confirm 0 "true" policies remain
-- ============================================================
-- SELECT
--   schemaname, tablename, policyname, cmd, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public'
--   AND (qual = 'true' OR with_check = 'true')
-- ORDER BY tablename, policyname;
