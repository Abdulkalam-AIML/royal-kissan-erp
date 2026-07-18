-- ============================================================
-- Royal Kissan ERP — Dispatch & Reconciliation Database Schema
-- ============================================================

-- 1. Create route_dispatches table
CREATE TABLE IF NOT EXISTS public.route_dispatches (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    route_id uuid NOT NULL REFERENCES public.routes(id) ON DELETE CASCADE,
    driver_id uuid NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
    date date NOT NULL DEFAULT CURRENT_DATE,
    items jsonb NOT NULL, -- list of {"product_name": string, "quantity": number}
    issued_by text NOT NULL DEFAULT 'Admin',
    status text NOT NULL DEFAULT 'dispatched' CHECK (status IN ('dispatched', 'reconciled')),
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 2. Create route_runs table
CREATE TABLE IF NOT EXISTS public.route_runs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    route_id uuid NOT NULL REFERENCES public.routes(id) ON DELETE CASCADE,
    driver_id uuid NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
    date date NOT NULL DEFAULT CURRENT_DATE,
    dispatch_id uuid REFERENCES public.route_dispatches(id) ON DELETE SET NULL,
    stops jsonb NOT NULL, -- stop-by-stop details
    total_sales numeric NOT NULL DEFAULT 0,
    total_returned numeric NOT NULL DEFAULT 0,
    total_leaked numeric NOT NULL DEFAULT 0,
    total_expenses numeric NOT NULL DEFAULT 0,
    net_collection numeric NOT NULL DEFAULT 0,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 3. Enable Row-Level Security (RLS)
ALTER TABLE public.route_dispatches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_runs ENABLE ROW LEVEL SECURITY;

-- 4. Drop existing policies to prevent conflicts
DROP POLICY IF EXISTS "route_dispatches_select" ON public.route_dispatches;
DROP POLICY IF EXISTS "route_runs_select" ON public.route_runs;
DROP POLICY IF EXISTS "route_dispatches_insert" ON public.route_dispatches;
DROP POLICY IF EXISTS "route_runs_insert" ON public.route_runs;
DROP POLICY IF EXISTS "route_dispatches_modify_admin" ON public.route_dispatches;
DROP POLICY IF EXISTS "route_runs_modify_admin" ON public.route_runs;

-- 5. Create Select policies for all authenticated users
CREATE POLICY "route_dispatches_select" ON public.route_dispatches
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "route_runs_select" ON public.route_runs
    FOR SELECT TO authenticated USING (true);

-- 6. Create Insert policies for all authenticated users (workers can dispatch/reconcile runs)
CREATE POLICY "route_dispatches_insert" ON public.route_dispatches
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "route_runs_insert" ON public.route_runs
    FOR INSERT TO authenticated WITH CHECK (true);

-- 7. Create admin-only Modify policies (only admin can UPDATE/DELETE dispatches and runs)
CREATE POLICY "route_dispatches_modify_admin" ON public.route_dispatches
    FOR ALL TO authenticated
    USING (public.get_user_role() = 'admin')
    WITH CHECK (public.get_user_role() = 'admin');

CREATE POLICY "route_runs_modify_admin" ON public.route_runs
    FOR ALL TO authenticated
    USING (public.get_user_role() = 'admin')
    WITH CHECK (public.get_user_role() = 'admin');
