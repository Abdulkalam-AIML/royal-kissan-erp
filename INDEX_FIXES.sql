-- ============================================================
-- ROYAL KISSAN ERP — VIEW SECURITY & INDEX FIXES
-- PHASE 4 + 7: Fix view warnings + add missing indexes
--
-- HOW TO RUN: Paste into Supabase SQL Editor (run LAST)
-- URL: https://supabase.com/dashboard/project/oweutcivgpmzldlcmkvd/sql/new
-- ============================================================

-- ===========================================================
-- SECTION 1: VIEWS WITH SECURITY INVOKER
-- Fix "View Security Definer" warnings
-- All views must use security_invoker = true
-- ===========================================================

-- daily_sales_summary view
DROP VIEW IF EXISTS public.daily_sales_summary CASCADE;
CREATE OR REPLACE VIEW public.daily_sales_summary
  WITH (security_invoker = true)
AS
SELECT
  sale_date,
  COUNT(*) AS total_bills,
  SUM(total_amount) AS total_sales,
  SUM(paid_amount) AS total_collected,
  SUM(due_amount) AS total_due
FROM public.sales
GROUP BY sale_date
ORDER BY sale_date DESC;


-- stock_status view
DROP VIEW IF EXISTS public.stock_status CASCADE;
CREATE OR REPLACE VIEW public.stock_status
  WITH (security_invoker = true)
AS
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


-- ===========================================================
-- SECTION 2: PERFORMANCE INDEXES
-- Phase 7: Add all missing indexes
-- ===========================================================

-- bills indexes
CREATE INDEX IF NOT EXISTS idx_bills_date         ON public.bills(date);
CREATE INDEX IF NOT EXISTS idx_bills_bill_type     ON public.bills(bill_type);
CREATE INDEX IF NOT EXISTS idx_bills_driver_id     ON public.bills(driver_id);
CREATE INDEX IF NOT EXISTS idx_bills_dealer_id     ON public.bills(dealer_id);
CREATE INDEX IF NOT EXISTS idx_bills_route_id      ON public.bills(route_id);
CREATE INDEX IF NOT EXISTS idx_bills_payment_method ON public.bills(payment_method);
CREATE INDEX IF NOT EXISTS idx_bills_payment_status ON public.bills(payment_status);
CREATE INDEX IF NOT EXISTS idx_bills_invoice_number ON public.bills(invoice_number);
CREATE INDEX IF NOT EXISTS idx_bills_created_at    ON public.bills(created_at DESC);

-- bill_items indexes
CREATE INDEX IF NOT EXISTS idx_bill_items_bill_id    ON public.bill_items(bill_id);
CREATE INDEX IF NOT EXISTS idx_bill_items_product_id ON public.bill_items(product_id);

-- route_sales indexes
CREATE INDEX IF NOT EXISTS idx_route_sales_sale_date   ON public.route_sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_route_sales_driver_id   ON public.route_sales(driver_id);
CREATE INDEX IF NOT EXISTS idx_route_sales_route_id    ON public.route_sales(route_id);
CREATE INDEX IF NOT EXISTS idx_route_sales_customer    ON public.route_sales(customer_name);
CREATE INDEX IF NOT EXISTS idx_route_sales_created_at  ON public.route_sales(created_at DESC);

-- sales indexes
CREATE INDEX IF NOT EXISTS idx_sales_sale_date    ON public.sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_customer_id  ON public.sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_driver_id    ON public.sales(driver_id);
CREATE INDEX IF NOT EXISTS idx_sales_dealer_id    ON public.sales(dealer_id);
CREATE INDEX IF NOT EXISTS idx_sales_route_id     ON public.sales(route_id);
CREATE INDEX IF NOT EXISTS idx_sales_created_at   ON public.sales(created_at DESC);

-- employees indexes
CREATE INDEX IF NOT EXISTS idx_employees_name       ON public.employees USING btree(LOWER(name));
CREATE INDEX IF NOT EXISTS idx_employees_is_active  ON public.employees(is_active);
CREATE INDEX IF NOT EXISTS idx_employees_role       ON public.employees(role);
CREATE INDEX IF NOT EXISTS idx_employees_created_at ON public.employees(created_at);

-- attendance indexes
CREATE INDEX IF NOT EXISTS idx_attendance_date        ON public.attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_employee_id ON public.attendance(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_status      ON public.attendance(status);

-- salary_payments indexes
CREATE INDEX IF NOT EXISTS idx_salary_employee_id ON public.salary_payments(employee_id);
CREATE INDEX IF NOT EXISTS idx_salary_month_year  ON public.salary_payments(year, month);
CREATE INDEX IF NOT EXISTS idx_salary_status      ON public.salary_payments(status);

-- drivers indexes
CREATE INDEX IF NOT EXISTS idx_drivers_name      ON public.drivers USING btree(LOWER(name));
CREATE INDEX IF NOT EXISTS idx_drivers_is_active ON public.drivers(is_active);

-- routes indexes
CREATE INDEX IF NOT EXISTS idx_routes_driver_id  ON public.routes(driver_id);
CREATE INDEX IF NOT EXISTS idx_routes_is_active  ON public.routes(is_active);
CREATE INDEX IF NOT EXISTS idx_routes_name       ON public.routes USING btree(LOWER(name));

-- route_customers indexes
CREATE INDEX IF NOT EXISTS idx_route_customers_route_id ON public.route_customers(route_id);
CREATE INDEX IF NOT EXISTS idx_route_customers_section  ON public.route_customers(section);
CREATE INDEX IF NOT EXISTS idx_route_customers_name     ON public.route_customers USING btree(LOWER(name));

-- route_expenses indexes
CREATE INDEX IF NOT EXISTS idx_route_expenses_driver_id    ON public.route_expenses(driver_id);
CREATE INDEX IF NOT EXISTS idx_route_expenses_route_id     ON public.route_expenses(route_id);
CREATE INDEX IF NOT EXISTS idx_route_expenses_expense_date ON public.route_expenses(expense_date);

-- driver_collections indexes
CREATE INDEX IF NOT EXISTS idx_driver_collections_driver_id ON public.driver_collections(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_collections_route_id  ON public.driver_collections(route_id);
CREATE INDEX IF NOT EXISTS idx_driver_collections_date      ON public.driver_collections(collection_date);

-- customer_dues indexes
CREATE INDEX IF NOT EXISTS idx_customer_dues_status      ON public.customer_dues(status);
CREATE INDEX IF NOT EXISTS idx_customer_dues_amount      ON public.customer_dues(due_amount DESC);
CREATE INDEX IF NOT EXISTS idx_customer_dues_driver_id   ON public.customer_dues(driver_id);
CREATE INDEX IF NOT EXISTS idx_customer_dues_route_id    ON public.customer_dues(route_id);

-- products indexes
CREATE INDEX IF NOT EXISTS idx_products_name      ON public.products USING btree(LOWER(name));
CREATE INDEX IF NOT EXISTS idx_products_category  ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON public.products(is_active);

-- stock indexes
CREATE INDEX IF NOT EXISTS idx_stock_product_id ON public.stock(product_id);

-- stock_transactions indexes
CREATE INDEX IF NOT EXISTS idx_stock_tx_product_id   ON public.stock_transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_tx_created_at   ON public.stock_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_tx_type         ON public.stock_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_stock_tx_reference_id ON public.stock_transactions(reference_id);

-- customers indexes
CREATE INDEX IF NOT EXISTS idx_customers_name      ON public.customers USING btree(LOWER(name));
CREATE INDEX IF NOT EXISTS idx_customers_area      ON public.customers(area);
CREATE INDEX IF NOT EXISTS idx_customers_is_active ON public.customers(is_active);

-- dealers indexes
CREATE INDEX IF NOT EXISTS idx_dealers_name      ON public.dealers USING btree(LOWER(name));
CREATE INDEX IF NOT EXISTS idx_dealers_area      ON public.dealers(area);
CREATE INDEX IF NOT EXISTS idx_dealers_is_active ON public.dealers(is_active);

-- dealer_sales indexes
CREATE INDEX IF NOT EXISTS idx_dealer_sales_dealer_id ON public.dealer_sales(dealer_id);
CREATE INDEX IF NOT EXISTS idx_dealer_sales_bill_id   ON public.dealer_sales(bill_id);
CREATE INDEX IF NOT EXISTS idx_dealer_sales_date      ON public.dealer_sales(sale_date);

-- dealer_ledger indexes
CREATE INDEX IF NOT EXISTS idx_dealer_ledger_dealer_id ON public.dealer_ledger(dealer_id);
CREATE INDEX IF NOT EXISTS idx_dealer_ledger_created_at ON public.dealer_ledger(created_at DESC);

-- driver_sales indexes
CREATE INDEX IF NOT EXISTS idx_driver_sales_driver_id ON public.driver_sales(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_sales_bill_id   ON public.driver_sales(bill_id);
CREATE INDEX IF NOT EXISTS idx_driver_sales_date      ON public.driver_sales(sale_date);

-- daily_reports indexes
CREATE INDEX IF NOT EXISTS idx_daily_reports_date ON public.daily_reports(report_date);

-- monthly_reports indexes
CREATE INDEX IF NOT EXISTS idx_monthly_reports_month_year ON public.monthly_reports(year, month);

-- driver_performance indexes
CREATE INDEX IF NOT EXISTS idx_driver_perf_driver_id ON public.driver_performance(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_perf_date      ON public.driver_performance(performance_date);

-- route_performance indexes
CREATE INDEX IF NOT EXISTS idx_route_perf_route_id ON public.route_performance(route_id);
CREATE INDEX IF NOT EXISTS idx_route_perf_date     ON public.route_performance(performance_date);

-- route_reports indexes
CREATE INDEX IF NOT EXISTS idx_route_reports_route_id ON public.route_reports(route_id);
CREATE INDEX IF NOT EXISTS idx_route_reports_date     ON public.route_reports(report_date);

-- audit_logs indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id    ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON public.audit_logs(table_name);

-- expenses indexes
CREATE INDEX IF NOT EXISTS idx_expenses_expense_date  ON public.expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_category_id   ON public.expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_created_at    ON public.expenses(created_at DESC);

-- payments indexes
CREATE INDEX IF NOT EXISTS idx_payments_sale_id      ON public.payments(sale_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer_id  ON public.payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_dealer_id    ON public.payments(dealer_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON public.payments(payment_date);

-- user_profiles indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_role_id ON public.user_profiles(role_id);

-- settings indexes (key is already UNIQUE, adding for text search)
CREATE INDEX IF NOT EXISTS idx_settings_key ON public.settings(key);

RAISE NOTICE 'All indexes and view security fixes applied successfully';
