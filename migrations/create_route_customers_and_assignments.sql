-- =========================================================================
-- MIGRATION: CREATE ROUTE CUSTOMERS AND DAILY ROUTE ASSIGNMENTS TABLES
-- DESCRIPTION: Introduces persistent route_customers stop list and daily_route_assignments
-- =========================================================================

-- 1. Create route_customers table
CREATE TABLE IF NOT EXISTS public.route_customers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    route_id uuid NOT NULL REFERENCES public.routes(id) ON DELETE CASCADE,
    customer_name text NOT NULL,
    section text NOT NULL DEFAULT 'cans' CHECK (section IN ('cans', 'bags', 'bottles')),
    default_product text,
    default_quantity numeric NOT NULL DEFAULT 0,
    default_rate numeric NOT NULL DEFAULT 0,
    sort_order integer NOT NULL DEFAULT 0,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 2. Create daily_route_assignments table
CREATE TABLE IF NOT EXISTS public.daily_route_assignments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id uuid NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
    route_id uuid NOT NULL REFERENCES public.routes(id) ON DELETE CASCADE,
    vehicle_number text,
    date date NOT NULL DEFAULT CURRENT_DATE,
    products_loaded jsonb NOT NULL DEFAULT '[]'::jsonb,
    status text NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned', 'in_progress', 'completed')),
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 3. Add assignment_id link to existing route_dispatches and route_runs without modifying old records
ALTER TABLE public.route_dispatches 
    ADD COLUMN IF NOT EXISTS assignment_id uuid REFERENCES public.daily_route_assignments(id) ON DELETE SET NULL;

ALTER TABLE public.route_runs 
    ADD COLUMN IF NOT EXISTS assignment_id uuid REFERENCES public.daily_route_assignments(id) ON DELETE SET NULL;

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.route_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_route_assignments ENABLE ROW LEVEL SECURITY;

-- Drop policies if existing to avoid conflicts
DROP POLICY IF EXISTS "route_customers_select" ON public.route_customers;
DROP POLICY IF EXISTS "daily_route_assignments_select" ON public.daily_route_assignments;
DROP POLICY IF EXISTS "route_customers_insert" ON public.route_customers;
DROP POLICY IF EXISTS "daily_route_assignments_insert" ON public.daily_route_assignments;
DROP POLICY IF EXISTS "daily_route_assignments_update" ON public.daily_route_assignments;
DROP POLICY IF EXISTS "route_customers_modify_admin" ON public.route_customers;
DROP POLICY IF EXISTS "daily_route_assignments_modify_admin" ON public.daily_route_assignments;

-- SELECT policies
CREATE POLICY "route_customers_select" ON public.route_customers
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "daily_route_assignments_select" ON public.daily_route_assignments
    FOR SELECT TO authenticated USING (true);

-- INSERT & UPDATE policies
CREATE POLICY "route_customers_insert" ON public.route_customers
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "daily_route_assignments_insert" ON public.daily_route_assignments
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "daily_route_assignments_update" ON public.daily_route_assignments
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Admin Modify policies
CREATE POLICY "route_customers_modify_admin" ON public.route_customers
    FOR ALL TO authenticated
    USING (public.get_user_role() = 'admin')
    WITH CHECK (public.get_user_role() = 'admin');

CREATE POLICY "daily_route_assignments_modify_admin" ON public.daily_route_assignments
    FOR ALL TO authenticated
    USING (public.get_user_role() = 'admin')
    WITH CHECK (public.get_user_role() = 'admin');

-- 5. Seed Route Customers from existing route names (Local Route, Raghavapuram, Mukkinavarigudem, Dammapeta)
DO $$
DECLARE
    v_local_route_id uuid;
    v_raghava_route_id uuid;
    v_mukkina_route_id uuid;
    v_damma_route_id uuid;
BEGIN
    SELECT id INTO v_local_route_id FROM public.routes WHERE name ILIKE '%local%' LIMIT 1;
    SELECT id INTO v_raghava_route_id FROM public.routes WHERE name ILIKE '%raghava%' LIMIT 1;
    SELECT id INTO v_mukkina_route_id FROM public.routes WHERE name ILIKE '%mukkina%' OR name ILIKE '%makkina%' LIMIT 1;
    SELECT id INTO v_damma_route_id FROM public.routes WHERE name ILIKE '%damma%' LIMIT 1;

    -- Seed Local Route Customers if local route exists and is empty
    IF v_local_route_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.route_customers WHERE route_id = v_local_route_id) THEN
        INSERT INTO public.route_customers (route_id, customer_name, section, default_product, default_quantity, default_rate, sort_order) VALUES
        (v_local_route_id, 'Bismillah Daba', 'cans', 'Water Can (20L)', 10, 15.00, 1),
        (v_local_route_id, 'Vamsi Mess', 'cans', 'Water Can (20L)', 10, 15.00, 2),
        (v_local_route_id, 'Lithu', 'cans', 'Water Can (20L)', 5, 15.00, 3),
        (v_local_route_id, 'Tiffin Center-1', 'cans', 'Water Can (20L)', 4, 15.00, 4),
        (v_local_route_id, 'Tea Stall', 'cans', 'Water Can (20L)', 5, 15.00, 5),
        (v_local_route_id, 'Juice Point', 'cans', 'Water Can (20L)', 10, 15.00, 6),
        (v_local_route_id, 'Surendra Juice Point', 'cans', 'Water Can (20L)', 10, 20.00, 7),
        (v_local_route_id, 'House Point 1', 'cans', 'Water Can (20L)', 1, 30.00, 8),
        (v_local_route_id, 'House Point 2', 'cans', 'Water Can (20L)', 1, 30.00, 9),
        (v_local_route_id, 'House Point 3', 'cans', 'Water Can (20L)', 1, 30.00, 10),
        (v_local_route_id, 'House Point 4', 'cans', 'Water Can (20L)', 1, 30.00, 11),
        (v_local_route_id, 'House Point 5', 'cans', 'Water Can (20L)', 1, 30.00, 12),
        (v_local_route_id, 'SBI', 'cans', 'Water Can (20L)', 1, 0, 13),
        (v_local_route_id, 'Fire Station', 'cans', 'Water Can (20L)', 1, 0, 14),
        (v_local_route_id, 'Amaravati Wines', 'bags', 'Bags (100 Pack)', 5, 75.00, 15),
        (v_local_route_id, 'Balaji Wines', 'bags', 'Bags (100 Pack)', 5, 80.00, 16),
        (v_local_route_id, 'Shop 1', 'bags', 'Bags (100 Pack)', 5, 100.00, 17),
        (v_local_route_id, 'Bala Sundari Shop', 'bags', 'Bags (100 Pack)', 5, 95.00, 18),
        (v_local_route_id, 'Shop 2', 'bags', 'Bags (100 Pack)', 5, 90.00, 19),
        (v_local_route_id, 'Shop 3', 'bags', 'Bags (100 Pack)', 5, 90.00, 20),
        (v_local_route_id, 'Shop 4', 'bags', 'Bags (100 Pack)', 5, 90.00, 21),
        (v_local_route_id, 'Route Sale', 'bags', 'Bags (100 Pack)', 10, 100.00, 22),
        (v_local_route_id, 'Healthy Plate', 'bottles', '500ml Bottle Case', 5, 140.00, 23),
        (v_local_route_id, 'Bismillah Daba', 'bottles', '500ml Bottle Case', 5, 145.00, 24),
        (v_local_route_id, 'Bismillah Daba', 'bottles', '1L Bottle Case', 5, 130.00, 25),
        (v_local_route_id, 'Tiffin Shop', 'bottles', '500ml Bottle Case', 5, 145.00, 26),
        (v_local_route_id, 'Tiffin Shop', 'bottles', '1L Bottle Case', 5, 130.00, 27),
        (v_local_route_id, 'Bottle Shop 1', 'bottles', '500ml Bottle Case', 5, 140.00, 28),
        (v_local_route_id, 'Bottle Shop 4', 'bottles', '500ml Bottle Case', 5, 150.00, 29),
        (v_local_route_id, 'Bottle Shop 4', 'bottles', '1L Bottle Case', 5, 135.00, 30);
    END IF;

    -- Seed Raghavapuram Route Customers
    IF v_raghava_route_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.route_customers WHERE route_id = v_raghava_route_id) THEN
        INSERT INTO public.route_customers (route_id, customer_name, section, default_product, default_quantity, default_rate, sort_order) VALUES
        (v_raghava_route_id, 'Raghavapuram Wines', 'bags', 'Bags (100 Pack)', 10, 80.00, 1),
        (v_raghava_route_id, 'Gandicherla', 'bags', 'Bags (100 Pack)', 8, 90.00, 2),
        (v_raghava_route_id, 'DN Rao Peta', 'bags', 'Bags (100 Pack)', 8, 90.00, 3),
        (v_raghava_route_id, 'Route Sale-1', 'bags', 'Bags (100 Pack)', 10, 100.00, 4),
        (v_raghava_route_id, 'Route Sale-2', 'bags', 'Bags (100 Pack)', 10, 90.00, 5),
        (v_raghava_route_id, 'Raghavapuram Can Customer', 'cans', 'Water Can (20L)', 5, 30.00, 6),
        (v_raghava_route_id, 'Raghavapuram Bottle', 'bottles', '1L Bottle Case', 5, 120.00, 7),
        (v_raghava_route_id, 'Raghavapuram Bottle', 'bottles', '500ml Bottle Case', 5, 140.00, 8);
    END IF;

    -- Seed Mukkinavarigudem Route Customers
    IF v_mukkina_route_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.route_customers WHERE route_id = v_mukkina_route_id) THEN
        INSERT INTO public.route_customers (route_id, customer_name, section, default_product, default_quantity, default_rate, sort_order) VALUES
        (v_mukkina_route_id, 'Wine Shop', 'bags', 'Bags (100 Pack)', 10, 75.00, 1),
        (v_mukkina_route_id, 'Aunty Shop', 'bags', 'Bags (100 Pack)', 10, 80.00, 2),
        (v_mukkina_route_id, 'Wine Shop', 'bottles', '1L Bottle Case', 5, 110.00, 3),
        (v_mukkina_route_id, 'Aunty Shop', 'bottles', '1L Bottle Case', 5, 120.00, 4);
    END IF;

    -- Seed Dammapeta Route Customers
    IF v_damma_route_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.route_customers WHERE route_id = v_damma_route_id) THEN
        INSERT INTO public.route_customers (route_id, customer_name, section, default_product, default_quantity, default_rate, sort_order) VALUES
        (v_damma_route_id, 'Wine Shop 1', 'bags', 'Bags (100 Pack)', 10, 75.00, 1),
        (v_damma_route_id, 'Wine Shop 2', 'bags', 'Bags (100 Pack)', 10, 80.00, 2),
        (v_damma_route_id, 'Wine Shop 3', 'bags', 'Bags (100 Pack)', 10, 75.00, 3);
    END IF;
END $$;

NOTIFY pgrst, 'reload schema';
