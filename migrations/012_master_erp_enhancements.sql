-- ============================================================================
-- MIGRATION 012: VEHICLES TABLE, DRIVER-EMPLOYEE LINK & LIFECYCLE ENHANCEMENTS
-- Royal Kissan ERP Master Architecture
-- ============================================================================

-- 1. Create vehicles table
CREATE TABLE IF NOT EXISTS public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_number TEXT UNIQUE NOT NULL,
  vehicle_type TEXT DEFAULT 'Delivery Van',
  capacity NUMERIC DEFAULT 100,
  assigned_driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  assigned_driver_name TEXT,
  insurance_expiry DATE,
  fitness_expiry DATE,
  status TEXT DEFAULT 'AVAILABLE', -- 'AVAILABLE', 'IN_USE', 'MAINTENANCE', 'INACTIVE'
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add vehicle_id and contact columns to drivers
ALTER TABLE public.drivers
  ADD COLUMN IF NOT EXISTS alternate_phone TEXT,
  ADD COLUMN IF NOT EXISTS emergency_contact TEXT,
  ADD COLUMN IF NOT EXISTS remarks TEXT,
  ADD COLUMN IF NOT EXISTS vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL;

-- 3. Add department and driver_id to employees
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS department TEXT DEFAULT 'Operations',
  ADD COLUMN IF NOT EXISTS emergency_contact TEXT,
  ADD COLUMN IF NOT EXISTS driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL;

-- 4. Add vehicle_id to driver_load_dispatches
ALTER TABLE public.driver_load_dispatches
  ADD COLUMN IF NOT EXISTS vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL;

-- 5. Seed standard Royal Kissan vehicles if table is empty
INSERT INTO public.vehicles (registration_number, vehicle_type, capacity, status, remarks)
VALUES 
  ('AP 16 AB 1234', 'Water Delivery Van', 100, 'AVAILABLE', 'Main Chintalapudi delivery vehicle'),
  ('AP 16 CD 5678', 'Can Carrier Truck', 150, 'AVAILABLE', 'Heavy distribution vehicle'),
  ('AP 16 EF 9012', 'Water Bags Carrier', 120, 'AVAILABLE', 'Light commercial vehicle')
ON CONFLICT (registration_number) DO NOTHING;
