-- ============================================================================
-- MIGRATION: 006_bridge_workers_heartbeat.sql
-- DESCRIPTION: Android Print Bridge Heartbeat, Worker Status & Wi-Fi Priority
-- ============================================================================

-- 1. UPDATE DEFAULT SETTINGS TO PREFER WI-FI RAW PRINTING
ALTER TABLE public.printer_settings 
    ALTER COLUMN preferred_connection SET DEFAULT 'wifi';

UPDATE public.printer_settings 
SET preferred_connection = 'wifi' 
WHERE preferred_connection = 'bluetooth' OR preferred_connection IS NULL;

-- 2. SET WI-FI AS DEFAULT DEVICE IN PRINTER_DEVICES
UPDATE public.printer_devices
SET is_default = CASE 
    WHEN connection_type = 'wifi' THEN true 
    ELSE false 
END;

-- 3. CREATE PRINT BRIDGE WORKERS & HEARTBEAT TABLE
CREATE TABLE IF NOT EXISTS public.print_bridge_workers (
    worker_id TEXT PRIMARY KEY,
    device_name TEXT NOT NULL DEFAULT 'Android Print Bridge',
    app_version TEXT DEFAULT '1.0.0',
    preferred_transport TEXT NOT NULL DEFAULT 'wifi',
    status TEXT NOT NULL DEFAULT 'ONLINE', -- ONLINE, OFFLINE, BUSY
    ip_address TEXT,
    last_heartbeat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_print_bridge_workers_heartbeat ON public.print_bridge_workers(last_heartbeat DESC);

-- Enable RLS
ALTER TABLE public.print_bridge_workers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_all_print_bridge_workers" ON public.print_bridge_workers;
CREATE POLICY "public_all_print_bridge_workers" ON public.print_bridge_workers 
    FOR ALL USING (true) WITH CHECK (true);

-- 4. HEARTBEAT RPC
CREATE OR REPLACE FUNCTION public.record_bridge_heartbeat(
    p_worker_id TEXT,
    p_device_name TEXT DEFAULT 'Android Print Bridge',
    p_preferred_transport TEXT DEFAULT 'wifi',
    p_ip_address TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.print_bridge_workers (
        worker_id, 
        device_name, 
        preferred_transport, 
        ip_address, 
        status, 
        last_heartbeat, 
        updated_at
    )
    VALUES (
        p_worker_id, 
        p_device_name, 
        COALESCE(p_preferred_transport, 'wifi'), 
        p_ip_address, 
        'ONLINE', 
        NOW(), 
        NOW()
    )
    ON CONFLICT (worker_id)
    DO UPDATE SET
        device_name = EXCLUDED.device_name,
        preferred_transport = EXCLUDED.preferred_transport,
        ip_address = COALESCE(EXCLUDED.ip_address, print_bridge_workers.ip_address),
        status = 'ONLINE',
        last_heartbeat = NOW(),
        updated_at = NOW();

    -- Also update printer_devices last_seen_at if matching registered_device_id
    UPDATE public.printer_devices
    SET last_seen_at = NOW(), is_active = true
    WHERE registered_device_id = p_worker_id;

    RETURN jsonb_build_object('success', true, 'heartbeat_at', NOW());
END;
$$;

-- 5. UPGRADED ATOMIC JOB CLAIMING RPC WITH HEARTBEAT INTEGRATION
CREATE OR REPLACE FUNCTION public.claim_next_print_job(
    p_worker_id TEXT DEFAULT 'android-worker',
    p_preferred_transport TEXT DEFAULT 'wifi'
)
RETURNS SETOF public.print_jobs
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_job public.print_jobs;
BEGIN
    -- Automatically record bridge heartbeat on polling attempt
    PERFORM public.record_bridge_heartbeat(
        p_worker_id, 
        'Android Print Bridge', 
        COALESCE(p_preferred_transport, 'wifi')
    );

    SELECT *
    INTO v_job
    FROM public.print_jobs
    WHERE status = 'PENDING'
    ORDER BY 
        -- Prioritize jobs matching preferred transport (e.g. Wi-Fi), then auto, then other transports
        CASE 
            WHEN p_preferred_transport IS NOT NULL AND connection_type = p_preferred_transport THEN 0
            WHEN connection_type = 'auto' THEN 1
            ELSE 2
        END,
        created_at ASC
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

-- 6. RELOAD POSTGREST SCHEMA CACHE
NOTIFY pgrst, 'reload schema';
