-- =====================================================================
-- ROYAL KISSAN ERP — TVS RP 3230 ABW PRINT QUEUE & PRINTER MANAGEMENT
-- Migration: 005_thermal_print_queue.sql
-- =====================================================================

-- 1. PRINTER DEVICES TABLE
CREATE TABLE IF NOT EXISTS public.printer_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id TEXT NOT NULL DEFAULT 'default_org',
    device_name TEXT NOT NULL,
    printer_model TEXT NOT NULL DEFAULT 'TVS RP 3230 ABW',
    connection_type TEXT NOT NULL DEFAULT 'bluetooth', -- 'bluetooth' | 'wifi' | 'auto'
    bluetooth_mac TEXT,
    bluetooth_device_name TEXT,
    wifi_ip TEXT,
    wifi_port INTEGER NOT NULL DEFAULT 9100,
    is_default BOOLEAN NOT NULL DEFAULT true,
    is_active BOOLEAN NOT NULL DEFAULT true,
    registered_device_id TEXT UNIQUE,
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default TVS RP 3230 ABW printer records if empty
INSERT INTO public.printer_devices (
    device_name, printer_model, connection_type, bluetooth_mac, bluetooth_device_name, wifi_ip, wifi_port, is_default, is_active, registered_device_id
)
SELECT 
    'TVS RP 3230 ABW (Bluetooth)', 'TVS RP 3230 ABW', 'bluetooth', '2B:04:E1:72:1B:54', 'RP3230ABW-1B54', NULL, 9100, true, true, 'tvs-rp3230-bt-primary'
WHERE NOT EXISTS (SELECT 1 FROM public.printer_devices WHERE registered_device_id = 'tvs-rp3230-bt-primary');

INSERT INTO public.printer_devices (
    device_name, printer_model, connection_type, bluetooth_mac, bluetooth_device_name, wifi_ip, wifi_port, is_default, is_active, registered_device_id
)
SELECT 
    'TVS RP 3230 ABW (Wi-Fi RAW)', 'TVS RP 3230 ABW', 'wifi', NULL, NULL, '192.168.1.1', 9100, false, true, 'tvs-rp3230-wifi-primary'
WHERE NOT EXISTS (SELECT 1 FROM public.printer_devices WHERE registered_device_id = 'tvs-rp3230-wifi-primary');

-- 2. PRINT JOBS TABLE
CREATE TABLE IF NOT EXISTS public.print_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id TEXT NOT NULL DEFAULT 'default_org',
    invoice_id TEXT,
    invoice_number TEXT NOT NULL,
    printer_device_id UUID REFERENCES public.printer_devices(id) ON DELETE SET NULL,
    connection_type TEXT NOT NULL DEFAULT 'bluetooth',
    status TEXT NOT NULL DEFAULT 'PENDING', 
    -- Status Enum: 'PENDING', 'CLAIMED', 'SENDING', 'SENT', 'COMPLETED', 'FAILED', 'UNKNOWN_OUTCOME'
    idempotency_key TEXT UNIQUE,
    payload_json JSONB NOT NULL,
    copy_type TEXT NOT NULL DEFAULT 'customer', -- 'customer' | 'dealer' | 'kitchen' | 'duplicate'
    retry_count INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    created_by TEXT DEFAULT 'ERP Web POS',
    claimed_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    claimed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

-- Fast Indexing for real-time polling and claiming
CREATE INDEX IF NOT EXISTS idx_print_jobs_status_created ON public.print_jobs(status, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_print_jobs_invoice_number ON public.print_jobs(invoice_number);
CREATE INDEX IF NOT EXISTS idx_print_jobs_idempotency ON public.print_jobs(idempotency_key);

-- 3. PRINTER SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.printer_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id TEXT NOT NULL DEFAULT 'default_org' UNIQUE,
    default_printer_id UUID REFERENCES public.printer_devices(id) ON DELETE SET NULL,
    preferred_connection TEXT NOT NULL DEFAULT 'bluetooth', -- 'bluetooth' | 'wifi' | 'auto'
    automatic_fallback BOOLEAN NOT NULL DEFAULT true,
    receipt_width TEXT NOT NULL DEFAULT '80mm',
    character_width INTEGER NOT NULL DEFAULT 48,
    print_logo BOOLEAN NOT NULL DEFAULT true,
    print_qr BOOLEAN NOT NULL DEFAULT true,
    auto_cut BOOLEAN NOT NULL DEFAULT true,
    cash_drawer BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default settings
INSERT INTO public.printer_settings (
    organization_id, preferred_connection, automatic_fallback, receipt_width, character_width, print_logo, print_qr, auto_cut, cash_drawer
)
VALUES (
    'default_org', 'bluetooth', true, '80mm', 48, true, true, true, true
)
ON CONFLICT (organization_id) DO NOTHING;

-- 4. ATOMIC JOB CLAIMING RPC FUNCTION
-- Concurrently claims the oldest PENDING job safely using FOR UPDATE SKIP LOCKED
CREATE OR REPLACE FUNCTION public.claim_next_print_job(
    p_worker_id TEXT DEFAULT 'android-worker',
    p_preferred_transport TEXT DEFAULT NULL
)
RETURNS SETOF public.print_jobs
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_job public.print_jobs;
BEGIN
    SELECT *
    INTO v_job
    FROM public.print_jobs
    WHERE status = 'PENDING'
      AND (p_preferred_transport IS NULL OR connection_type = p_preferred_transport OR connection_type = 'auto')
    ORDER BY created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    IF v_job.id IS NOT NULL THEN
        UPDATE public.print_jobs
        SET status = 'CLAIMED',
            claimed_by = p_worker_id,
            claimed_at = NOW(),
            retry_count = retry_count + 1
        WHERE id = v_job.id;

        v_job.status := 'CLAIMED';
        v_job.claimed_by := p_worker_id;
        v_job.claimed_at := NOW();
        RETURN NEXT v_job;
    END IF;

    RETURN;
END;
$$;

-- 5. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.printer_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.print_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.printer_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read printer_devices" 
    ON public.printer_devices FOR SELECT USING (true);
CREATE POLICY "Allow authenticated manage printer_devices" 
    ON public.printer_devices FOR ALL USING (true);

CREATE POLICY "Allow authenticated read print_jobs" 
    ON public.print_jobs FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert/update print_jobs" 
    ON public.print_jobs FOR ALL USING (true);

CREATE POLICY "Allow authenticated read printer_settings" 
    ON public.printer_settings FOR SELECT USING (true);
CREATE POLICY "Allow authenticated update printer_settings" 
    ON public.printer_settings FOR ALL USING (true);
