-- =========================================================================
-- MIGRATION: ADD PERFORMANCE INDEXES FOR HIGH-VOLUME QUERIES
-- DESCRIPTION: Creates composite B-tree indexes on frequent date, driver, and customer filter columns
-- =========================================================================

-- 1. Route Sales index (frequently filtered by sale_date and driver_id)
CREATE INDEX IF NOT EXISTS idx_route_sales_date_driver 
    ON public.route_sales (sale_date, driver_id);

-- 2. Route Runs index (filtered by date and driver_id)
CREATE INDEX IF NOT EXISTS idx_route_runs_date_driver 
    ON public.route_runs (date, driver_id);

-- 3. Route Dispatches index (filtered by date and driver_id)
CREATE INDEX IF NOT EXISTS idx_route_dispatches_date_driver 
    ON public.route_dispatches (date, driver_id);

-- 4. Bills index (filtered by date and created_at)
CREATE INDEX IF NOT EXISTS idx_bills_created_date 
    ON public.bills (date, created_at);

-- 5. Bills Customer Name index
CREATE INDEX IF NOT EXISTS idx_bills_customer_name 
    ON public.bills (customer_name);

-- 6. Customer Dues index (filtered by customer_name and status)
CREATE INDEX IF NOT EXISTS idx_customer_dues_customer_name 
    ON public.customer_dues (customer_name, status);

-- 7. Stock Transactions index (filtered by created_at)
CREATE INDEX IF NOT EXISTS idx_stock_transactions_created 
    ON public.stock_transactions (created_at DESC);

-- 8. Route Customers index (filtered by route_id and section)
CREATE INDEX IF NOT EXISTS idx_route_customers_route_section 
    ON public.route_customers (route_id, section);

-- 9. Daily Route Assignments index (filtered by date and driver_id)
CREATE INDEX IF NOT EXISTS idx_daily_assignments_date_driver 
    ON public.daily_route_assignments (date, driver_id);

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
