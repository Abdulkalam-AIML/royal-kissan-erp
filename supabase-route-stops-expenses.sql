-- ============================================================
-- ROYAL KISSAN ERP - STOPS & ROUTE EXPENSES SCHEMA
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. CREATE STOPS TABLE
CREATE TABLE IF NOT EXISTS public.route_stops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  route_id UUID REFERENCES public.routes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  stop_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(route_id, name)
);

-- 2. CREATE ROUTE EXPENSES TABLE
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

-- 3. ENABLE RLS
ALTER TABLE public.route_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_expenses ENABLE ROW LEVEL SECURITY;

-- 4. CREATE RLS POLICIES
DROP POLICY IF EXISTS "route_stops_all" ON public.route_stops;
CREATE POLICY "route_stops_all" ON public.route_stops FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

DROP POLICY IF EXISTS "route_expenses_all" ON public.route_expenses;
CREATE POLICY "route_expenses_all" ON public.route_expenses FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

-- 5. SEED DATA FOR STOPS (FOR THE 3 NON-LOCAL ROUTES)
-- A. Raghavapuram Route stops
INSERT INTO public.route_stops (route_id, name, stop_order) VALUES
  ('a2222222-2222-2222-2222-222222222222', 'Raghavapuram Wines', 1),
  ('a2222222-2222-2222-2222-222222222222', 'Gandicherla', 2),
  ('a2222222-2222-2222-2222-222222222222', 'DN Rao Peta', 3),
  ('a2222222-2222-2222-2222-222222222222', 'Route Sale-1', 4),
  ('a2222222-2222-2222-2222-222222222222', 'Route Sale-2', 5)
ON CONFLICT DO NOTHING;

-- B. Mukkinavarigudem Route stops
INSERT INTO public.route_stops (route_id, name, stop_order) VALUES
  ('a3333333-3333-3333-3333-333333333333', 'Makkinavarigudem Wines', 1),
  ('a3333333-3333-3333-3333-333333333333', 'Aunty Shop (Bags)', 2),
  ('a3333333-3333-3333-3333-333333333333', 'Wine Shop (Bottles)', 3),
  ('a3333333-3333-3333-3333-333333333333', 'Aunty Shop (Bottles)', 4)
ON CONFLICT DO NOTHING;

-- C. Dammapeta Route stops
INSERT INTO public.route_stops (route_id, name, stop_order) VALUES
  ('a4444444-4444-4444-4444-444444444444', 'Wine Shop-1', 1),
  ('a4444444-4444-4444-4444-444444444444', 'Wine Shop-2', 2),
  ('a4444444-4444-4444-4444-444444444444', 'Wine Shop-3', 3)
ON CONFLICT DO NOTHING;
