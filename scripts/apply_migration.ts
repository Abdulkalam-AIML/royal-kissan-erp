import { Client } from 'pg'
import * as fs from 'fs'
import * as path from 'path'

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

const rawConnectionString = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL || ''
const connectionString = rawConnectionString.replace(/([?&])sslmode=[^&]+(&|$)/, '$1').replace(/[?&]$/, '')

async function applyMigration() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  })

  await client.connect()
  console.log('Connected to Supabase PostgreSQL.')

  const migrationSql = `
    -- =====================================================================
    -- 1. PRINTER DEVICES TABLE
    -- =====================================================================
    CREATE TABLE IF NOT EXISTS public.printer_devices (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id TEXT NOT NULL DEFAULT 'default_org',
        device_name TEXT NOT NULL,
        printer_model TEXT NOT NULL DEFAULT 'TVS RP 3230 ABW',
        connection_type TEXT NOT NULL DEFAULT 'bluetooth',
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

    -- Seed default printer records if not exists
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

    -- =====================================================================
    -- 2. PRINT JOBS TABLE
    -- =====================================================================
    CREATE TABLE IF NOT EXISTS public.print_jobs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id TEXT NOT NULL DEFAULT 'default_org',
        invoice_id TEXT,
        invoice_number TEXT NOT NULL,
        printer_device_id UUID REFERENCES public.printer_devices(id) ON DELETE SET NULL,
        connection_type TEXT NOT NULL DEFAULT 'bluetooth',
        status TEXT NOT NULL DEFAULT 'PENDING',
        idempotency_key TEXT UNIQUE,
        payload_json JSONB NOT NULL,
        copy_type TEXT NOT NULL DEFAULT 'customer',
        retry_count INTEGER NOT NULL DEFAULT 0,
        error_message TEXT,
        created_by TEXT DEFAULT 'ERP Web POS',
        claimed_by TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        claimed_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ
    );

    CREATE INDEX IF NOT EXISTS idx_print_jobs_status_created ON public.print_jobs(status, created_at ASC);
    CREATE INDEX IF NOT EXISTS idx_print_jobs_invoice_number ON public.print_jobs(invoice_number);
    CREATE INDEX IF NOT EXISTS idx_print_jobs_idempotency ON public.print_jobs(idempotency_key);

    -- =====================================================================
    -- 3. UPGRADE PRINTER SETTINGS TABLE SAFELY
    -- =====================================================================
    CREATE TABLE IF NOT EXISTS public.printer_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    ALTER TABLE public.printer_settings ADD COLUMN IF NOT EXISTS organization_id TEXT NOT NULL DEFAULT 'default_org';
    ALTER TABLE public.printer_settings ADD COLUMN IF NOT EXISTS default_printer_id UUID REFERENCES public.printer_devices(id) ON DELETE SET NULL;
    ALTER TABLE public.printer_settings ADD COLUMN IF NOT EXISTS preferred_connection TEXT NOT NULL DEFAULT 'bluetooth';
    ALTER TABLE public.printer_settings ADD COLUMN IF NOT EXISTS automatic_fallback BOOLEAN NOT NULL DEFAULT true;
    ALTER TABLE public.printer_settings ADD COLUMN IF NOT EXISTS receipt_width TEXT NOT NULL DEFAULT '80mm';
    ALTER TABLE public.printer_settings ADD COLUMN IF NOT EXISTS character_width INTEGER NOT NULL DEFAULT 48;
    ALTER TABLE public.printer_settings ADD COLUMN IF NOT EXISTS print_logo BOOLEAN NOT NULL DEFAULT true;
    ALTER TABLE public.printer_settings ADD COLUMN IF NOT EXISTS print_qr BOOLEAN NOT NULL DEFAULT true;
    ALTER TABLE public.printer_settings ADD COLUMN IF NOT EXISTS auto_cut BOOLEAN NOT NULL DEFAULT true;
    ALTER TABLE public.printer_settings ADD COLUMN IF NOT EXISTS cash_drawer BOOLEAN NOT NULL DEFAULT true;
    ALTER TABLE public.printer_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

    -- Ensure unique index on organization_id
    CREATE UNIQUE INDEX IF NOT EXISTS idx_printer_settings_org ON public.printer_settings(organization_id);

    -- =====================================================================
    -- 4. ATOMIC CLAIM RPC FUNCTION
    -- =====================================================================
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

    -- =====================================================================
    -- 5. ROW LEVEL SECURITY (RLS) POLICIES
    -- =====================================================================
    ALTER TABLE public.printer_devices ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.print_jobs ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.printer_settings ENABLE ROW LEVEL SECURITY;

    -- Drop existing policies if any to avoid collision
    DROP POLICY IF EXISTS "Allow authenticated read printer_devices" ON public.printer_devices;
    DROP POLICY IF EXISTS "Allow authenticated manage printer_devices" ON public.printer_devices;
    DROP POLICY IF EXISTS "Allow authenticated read print_jobs" ON public.print_jobs;
    DROP POLICY IF EXISTS "Allow authenticated insert/update print_jobs" ON public.print_jobs;
    DROP POLICY IF EXISTS "Allow authenticated read printer_settings" ON public.printer_settings;
    DROP POLICY IF EXISTS "Allow authenticated update printer_settings" ON public.printer_settings;
    DROP POLICY IF EXISTS "public_all_print_jobs" ON public.print_jobs;
    DROP POLICY IF EXISTS "public_all_printer_devices" ON public.printer_devices;
    DROP POLICY IF EXISTS "public_all_printer_settings" ON public.printer_settings;

    -- Permissive policies for authorized ERP and Android Bridge operations
    CREATE POLICY "public_all_printer_devices" ON public.printer_devices FOR ALL USING (true) WITH CHECK (true);
    CREATE POLICY "public_all_print_jobs" ON public.print_jobs FOR ALL USING (true) WITH CHECK (true);
    CREATE POLICY "public_all_printer_settings" ON public.printer_settings FOR ALL USING (true) WITH CHECK (true);

    -- =====================================================================
    -- 6. REFRESH POSTGREST SCHEMA CACHE
    -- =====================================================================
    NOTIFY pgrst, 'reload schema';
  `

  console.log('Applying migration in transaction...')
  await client.query('BEGIN;')
  await client.query(migrationSql)
  await client.query('COMMIT;')
  console.log('✅ Migration applied successfully and schema cache reloaded!')

  // Verify to_regclass
  const verifyRes = await client.query("SELECT to_regclass('public.print_jobs') as regclass;")
  console.log('Verification to_regclass(public.print_jobs):', verifyRes.rows[0])

  await client.end()
}

applyMigration().catch(err => {
  console.error('Migration failed:', err)
  process.exit(1)
})
