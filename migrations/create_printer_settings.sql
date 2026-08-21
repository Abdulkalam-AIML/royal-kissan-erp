-- =====================================================================
-- ROYAL KISSAN ERP - PRINTER SETTINGS & PRINT LOGS MIGRATION
-- TVS RP3230ABW ESC/POS THERMAL PRINTING SYSTEM
-- =====================================================================

-- 1. Create printer_settings table
CREATE TABLE IF NOT EXISTS public.printer_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    printer_name TEXT NOT NULL DEFAULT 'TVS RP3230ABW (WiFi)',
    printer_ip TEXT NOT NULL DEFAULT '192.168.0.2',
    printer_port INTEGER NOT NULL DEFAULT 9100,
    paper_width TEXT NOT NULL DEFAULT '80mm',
    character_width INTEGER NOT NULL DEFAULT 48,
    auto_cut BOOLEAN NOT NULL DEFAULT true,
    drawer_enabled BOOLEAN NOT NULL DEFAULT true,
    is_default BOOLEAN NOT NULL DEFAULT true,
    local_agent_url TEXT NOT NULL DEFAULT 'http://localhost:3002/print',
    use_local_agent BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default row if empty
INSERT INTO public.printer_settings (
    printer_name, printer_ip, printer_port, paper_width, character_width, auto_cut, drawer_enabled, is_default
)
SELECT 'TVS RP3230ABW (WiFi)', '192.168.1.1', 9100, '80mm', 48, true, true, true
WHERE NOT EXISTS (SELECT 1 FROM public.printer_settings);

-- 2. Create print_logs table
CREATE TABLE IF NOT EXISTS public.print_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number TEXT,
    bill_id UUID,
    copy_type TEXT DEFAULT 'customer',
    status TEXT NOT NULL, -- 'success', 'failed', 'retried', 'pending'
    error_message TEXT,
    duration_ms INTEGER,
    bytes_sent INTEGER,
    printed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast queries
CREATE INDEX IF NOT EXISTS idx_print_logs_created ON public.print_logs(printed_at DESC);
CREATE INDEX IF NOT EXISTS idx_print_logs_invoice ON public.print_logs(invoice_number);

-- Enable RLS
ALTER TABLE public.printer_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.print_logs ENABLE ROW LEVEL SECURITY;

-- Permissive public policies for ERP operations
CREATE POLICY "Allow public select printer_settings" ON public.printer_settings FOR SELECT USING (true);
CREATE POLICY "Allow public insert/update printer_settings" ON public.printer_settings FOR ALL USING (true);

CREATE POLICY "Allow public select print_logs" ON public.print_logs FOR SELECT USING (true);
CREATE POLICY "Allow public insert print_logs" ON public.print_logs FOR INSERT WITH CHECK (true);
