-- ============================================================================
-- MIGRATION: 007_print_status_verification.sql
-- DESCRIPTION: Accurate Print Lifecycle, Verification, Transport & Error Tracking
-- ============================================================================

-- 1. ADD AUDIT COLUMNS TO PRINT_JOBS TABLE
ALTER TABLE public.print_jobs 
    ADD COLUMN IF NOT EXISTS actual_transport TEXT,
    ADD COLUMN IF NOT EXISTS verification_method TEXT,
    ADD COLUMN IF NOT EXISTS printed_at TIMESTAMPTZ;

-- Create index for quick status queries
CREATE INDEX IF NOT EXISTS idx_print_jobs_status_transport ON public.print_jobs(status, actual_transport);

-- 2. UPDATE ATOMIC JOB CLAIMING RPC
-- Ensures only PENDING jobs are claimed (NEVER UNKNOWN_OUTCOME or FAILED)
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
    -- Record bridge worker heartbeat on poll attempt
    PERFORM public.record_bridge_heartbeat(
        p_worker_id, 
        'Android Print Bridge', 
        COALESCE(p_preferred_transport, 'wifi')
    );

    -- Atomically lock and claim exactly ONE PENDING job
    -- Jobs with UNKNOWN_OUTCOME or FAILED are strictly excluded
    SELECT *
    INTO v_job
    FROM public.print_jobs
    WHERE status = 'PENDING'
    ORDER BY 
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

-- 3. CONFIRM PHYSICAL PRINT RPC
-- Called when physical receipt is verified by hardware or operator
CREATE OR REPLACE FUNCTION public.confirm_physical_print(
    p_job_id UUID,
    p_verification_method TEXT DEFAULT 'operator_confirmed'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_found UUID;
BEGIN
    UPDATE public.print_jobs
    SET status = 'PRINTED',
        verification_method = COALESCE(p_verification_method, 'operator_confirmed'),
        printed_at = NOW(),
        completed_at = COALESCE(completed_at, NOW()),
        error_message = NULL
    WHERE id = p_job_id
    RETURNING id INTO v_found;

    IF v_found IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Print job not found');
    END IF;

    RETURN jsonb_build_object('success', true, 'job_id', v_found, 'status', 'PRINTED');
END;
$$;

-- 4. MANUAL RETRY RPC (FOR FAILED OR UNKNOWN_OUTCOME ONLY)
CREATE OR REPLACE FUNCTION public.retry_print_job(
    p_job_id UUID,
    p_requested_by TEXT DEFAULT 'Operator'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_found UUID;
BEGIN
    UPDATE public.print_jobs
    SET status = 'PENDING',
        claimed_by = NULL,
        claimed_at = NULL,
        error_message = NULL,
        verification_method = NULL,
        printed_at = NULL
    WHERE id = p_job_id
      AND status IN ('FAILED', 'UNKNOWN_OUTCOME', 'SENT')
    RETURNING id INTO v_found;

    IF v_found IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Job not eligible for retry');
    END IF;

    RETURN jsonb_build_object('success', true, 'job_id', v_found, 'status', 'PENDING');
END;
$$;

-- 5. RELOAD POSTGREST SCHEMA CACHE
NOTIFY pgrst, 'reload schema';
