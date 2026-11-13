-- ============================================================================
-- MIGRATION: 008_purchase_management_and_whatsapp.sql
-- DESCRIPTION: Purchase Management Schema, Inventory Synchronization,
--              WhatsApp Cloud API Settings & Notification Delivery Tracking
-- ============================================================================

-- 1. CREATE SUPPLIERS TABLE
CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    gstin TEXT,
    outstanding_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default suppliers if empty
INSERT INTO public.suppliers (name, phone, address, gstin, outstanding_balance)
SELECT 'Sri Venkateswara Plastics & Preforms', '+919848022338', 'Industrial Area, Vijayawada', '37AABCS1234D1Z5', 0
WHERE NOT EXISTS (SELECT 1 FROM public.suppliers WHERE name = 'Sri Venkateswara Plastics & Preforms');

INSERT INTO public.suppliers (name, phone, address, gstin, outstanding_balance)
SELECT 'Balaji Caps & Closures Pvt Ltd', '+919949112233', 'Plot 42, Autonagar, Eluru', '37BBFPS4321E1Z8', 0
WHERE NOT EXISTS (SELECT 1 FROM public.suppliers WHERE name = 'Balaji Caps & Closures Pvt Ltd');

INSERT INTO public.suppliers (name, phone, address, gstin, outstanding_balance)
SELECT 'Royal Mineral Water Packaging', '+919440556677', 'Main Road, Chintalapudi', '37CCKPS9876F1Z1', 0
WHERE NOT EXISTS (SELECT 1 FROM public.suppliers WHERE name = 'Royal Mineral Water Packaging');

-- 2. CREATE PURCHASES TABLE
CREATE TABLE IF NOT EXISTS public.purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_number TEXT UNIQUE NOT NULL,
    supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
    supplier_name TEXT NOT NULL,
    supplier_phone TEXT,
    supplier_invoice_number TEXT,
    purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
    subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    gst_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    grand_total NUMERIC(12,2) NOT NULL DEFAULT 0,
    paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    due_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    payment_method TEXT NOT NULL DEFAULT 'CASH', -- 'CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'CREDIT'
    purchase_status TEXT NOT NULL DEFAULT 'COMPLETED', -- 'COMPLETED', 'RECEIVED', 'PENDING', 'CANCELLED'
    notes TEXT,
    created_by TEXT DEFAULT 'Admin',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_purchases_date ON public.purchases(purchase_date DESC);
CREATE INDEX IF NOT EXISTS idx_purchases_supplier ON public.purchases(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchases_number ON public.purchases(purchase_number);

-- 3. CREATE PURCHASE_ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.purchase_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_id UUID NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    quantity NUMERIC(12,2) NOT NULL CHECK (quantity > 0),
    unit TEXT NOT NULL DEFAULT 'pcs',
    rate NUMERIC(12,2) NOT NULL CHECK (rate >= 0),
    amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
    gst_rate NUMERIC(5,2) DEFAULT 0,
    gst_amount NUMERIC(12,2) DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase ON public.purchase_items(purchase_id);
CREATE INDEX IF NOT EXISTS idx_purchase_items_product ON public.purchase_items(product_id);

-- 4. CREATE WHATSAPP SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.whatsapp_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id TEXT NOT NULL DEFAULT 'default_org' UNIQUE,
    enabled BOOLEAN NOT NULL DEFAULT true,
    phone_number_id TEXT,
    whatsapp_business_account_id TEXT,
    access_token TEXT,
    default_recipient_phone TEXT NOT NULL DEFAULT '+919347662554',
    recipient_type TEXT NOT NULL DEFAULT 'owner', -- 'owner', 'admin', 'supplier', 'custom'
    send_to_supplier BOOLEAN NOT NULL DEFAULT false,
    webhook_verify_token TEXT DEFAULT 'royal_kissan_webhook_token_2026',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default WhatsApp settings if empty
INSERT INTO public.whatsapp_settings (
    organization_id, enabled, default_recipient_phone, recipient_type, send_to_supplier
)
SELECT 'default_org', true, '+919347662554', 'owner', false
WHERE NOT EXISTS (SELECT 1 FROM public.whatsapp_settings WHERE organization_id = 'default_org');

-- 5. CREATE WHATSAPP NOTIFICATIONS TABLE (DELIVERY HISTORY)
CREATE TABLE IF NOT EXISTS public.whatsapp_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_id UUID REFERENCES public.purchases(id) ON DELETE CASCADE,
    purchase_number TEXT,
    recipient_phone TEXT NOT NULL,
    recipient_name TEXT,
    recipient_type TEXT DEFAULT 'owner',
    message_type TEXT NOT NULL DEFAULT 'purchase_confirmation',
    message_content TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'QUEUED', -- 'QUEUED', 'SENT', 'DELIVERED', 'READ', 'FAILED'
    meta_message_id TEXT,
    idempotency_key TEXT UNIQUE,
    error_message TEXT,
    retry_count INTEGER NOT NULL DEFAULT 0,
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_notif_purchase ON public.whatsapp_notifications(purchase_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_notif_status ON public.whatsapp_notifications(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_notif_idempotency ON public.whatsapp_notifications(idempotency_key);

-- 6. ATOMIC PURCHASE RECORDING & INVENTORY SYNCHRONIZATION RPC
CREATE OR REPLACE FUNCTION public.record_purchase_with_inventory(
    p_purchase JSONB,
    p_items JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_purchase_id UUID;
    v_item JSONB;
    v_prod_id UUID;
    v_prod_name TEXT;
    v_qty NUMERIC;
    v_rate NUMERIC;
    v_amt NUMERIC;
    v_unit TEXT;
    v_gst_rate NUMERIC;
    v_gst_amt NUMERIC;
    v_pur_number TEXT;
    v_supp_id UUID;
    v_supp_name TEXT;
    v_supp_phone TEXT;
    v_supp_inv TEXT;
    v_subtotal NUMERIC;
    v_discount NUMERIC;
    v_gst NUMERIC;
    v_grand_total NUMERIC;
    v_paid NUMERIC;
    v_due NUMERIC;
    v_pay_method TEXT;
    v_status TEXT;
    v_date DATE;
    v_notes TEXT;
    v_created_by TEXT;
    v_created_purchase JSONB;
    v_cur_stock INTEGER;
BEGIN
    -- 1. Validate items
    IF p_items IS NULL OR jsonb_typeof(p_items) != 'array' OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'A purchase must have at least one product line item.';
    END IF;

    -- 2. Extract and sanitize purchase attributes
    v_pur_number := COALESCE(NULLIF(p_purchase->>'purchase_number', ''), 'PUR-' || to_char(NOW(), 'YYYYMMDD') || '-' || floor(random()*9000 + 1000)::text);
    v_supp_name := COALESCE(NULLIF(p_purchase->>'supplier_name', ''), 'General Supplier');
    v_supp_phone := NULLIF(p_purchase->>'supplier_phone', '');
    v_supp_inv := NULLIF(p_purchase->>'supplier_invoice_number', '');
    
    v_supp_id := CASE 
        WHEN p_purchase->>'supplier_id' IS NOT NULL AND p_purchase->>'supplier_id' != '' 
        THEN (p_purchase->>'supplier_id')::UUID 
        ELSE NULL 
    END;

    -- Auto-link supplier if found by name and not explicitly passed
    IF v_supp_id IS NULL AND v_supp_name IS NOT NULL THEN
        SELECT id INTO v_supp_id FROM public.suppliers WHERE LOWER(TRIM(name)) = LOWER(TRIM(v_supp_name)) LIMIT 1;
    END IF;

    v_subtotal := COALESCE((p_purchase->>'subtotal')::NUMERIC, 0);
    v_discount := COALESCE((p_purchase->>'discount_amount')::NUMERIC, 0);
    v_gst := COALESCE((p_purchase->>'gst_amount')::NUMERIC, 0);
    v_grand_total := COALESCE((p_purchase->>'grand_total')::NUMERIC, v_subtotal - v_discount + v_gst);
    v_paid := COALESCE((p_purchase->>'paid_amount')::NUMERIC, 0);
    v_due := COALESCE((p_purchase->>'due_amount')::NUMERIC, GREATEST(0, v_grand_total - v_paid));
    v_pay_method := COALESCE(NULLIF(p_purchase->>'payment_method', ''), 'CASH');
    v_status := COALESCE(NULLIF(p_purchase->>'purchase_status', ''), 'COMPLETED');
    v_date := COALESCE((p_purchase->>'purchase_date')::DATE, CURRENT_DATE);
    v_notes := NULLIF(p_purchase->>'notes', '');
    v_created_by := COALESCE(NULLIF(p_purchase->>'created_by', ''), 'Admin');

    -- 3. Insert Purchase
    INSERT INTO public.purchases (
        purchase_number,
        supplier_id,
        supplier_name,
        supplier_phone,
        supplier_invoice_number,
        purchase_date,
        subtotal,
        discount_amount,
        gst_amount,
        grand_total,
        paid_amount,
        due_amount,
        payment_method,
        purchase_status,
        notes,
        created_by
    ) VALUES (
        v_pur_number,
        v_supp_id,
        v_supp_name,
        v_supp_phone,
        v_supp_inv,
        v_date,
        v_subtotal,
        v_discount,
        v_gst,
        v_grand_total,
        v_paid,
        v_due,
        v_pay_method,
        v_status,
        v_notes,
        v_created_by
    )
    RETURNING id INTO v_purchase_id;

    -- 4. Insert Items & Synchronize Inventory
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_prod_id := CASE 
            WHEN v_item->>'product_id' IS NOT NULL AND v_item->>'product_id' != '' 
            THEN (v_item->>'product_id')::UUID 
            ELSE NULL 
        END;
        v_prod_name := COALESCE(NULLIF(v_item->>'product_name', ''), 'Purchased Item');
        v_qty := COALESCE((v_item->>'quantity')::NUMERIC, 1);
        v_rate := COALESCE((v_item->>'rate')::NUMERIC, 0);
        v_amt := COALESCE((v_item->>'amount')::NUMERIC, v_qty * v_rate);
        v_unit := COALESCE(NULLIF(v_item->>'unit', ''), 'pcs');
        v_gst_rate := COALESCE((v_item->>'gst_rate')::NUMERIC, 0);
        v_gst_amt := COALESCE((v_item->>'gst_amount')::NUMERIC, 0);

        -- If product_id is null, attempt to match existing product by name
        IF v_prod_id IS NULL THEN
            SELECT id INTO v_prod_id FROM public.products WHERE LOWER(TRIM(name)) = LOWER(TRIM(v_prod_name)) LIMIT 1;
        END IF;

        INSERT INTO public.purchase_items (
            purchase_id,
            product_id,
            product_name,
            quantity,
            unit,
            rate,
            amount,
            gst_rate,
            gst_amount
        ) VALUES (
            v_purchase_id,
            v_prod_id,
            v_prod_name,
            v_qty,
            v_unit,
            v_rate,
            v_amt,
            v_gst_rate,
            v_gst_amt
        );

        -- Update Inventory Stock (Stock IN) if matching product
        IF v_prod_id IS NOT NULL THEN
            SELECT COALESCE(stock_quantity, 0) INTO v_cur_stock FROM public.products WHERE id = v_prod_id;

            UPDATE public.products
            SET stock_quantity = COALESCE(stock_quantity, 0) + v_qty::INTEGER,
                cost_price = CASE WHEN v_rate > 0 THEN v_rate ELSE cost_price END,
                updated_at = NOW()
            WHERE id = v_prod_id;

            INSERT INTO public.stock_transactions (
                product_id,
                product_name,
                item_name,
                transaction_type,
                quantity,
                quantity_before,
                quantity_after,
                reference_id,
                reference_type,
                notes
            ) VALUES (
                v_prod_id,
                v_prod_name,
                v_prod_name,
                'in',
                v_qty::INTEGER,
                v_cur_stock,
                v_cur_stock + v_qty::INTEGER,
                v_purchase_id,
                'purchase',
                'Purchase ' || v_pur_number || ' from ' || v_supp_name
            );
        END IF;
    END LOOP;

    -- 5. Update Supplier Outstanding Balance
    IF v_supp_id IS NOT NULL AND v_due > 0 THEN
        UPDATE public.suppliers
        SET outstanding_balance = COALESCE(outstanding_balance, 0) + v_due,
            updated_at = NOW()
        WHERE id = v_supp_id;
    END IF;

    -- 6. Fetch complete created purchase JSON for client
    SELECT jsonb_build_object(
        'id', p.id,
        'purchase_number', p.purchase_number,
        'supplier_id', p.supplier_id,
        'supplier_name', p.supplier_name,
        'supplier_phone', p.supplier_phone,
        'supplier_invoice_number', p.supplier_invoice_number,
        'purchase_date', p.purchase_date,
        'subtotal', p.subtotal,
        'discount_amount', p.discount_amount,
        'gst_amount', p.gst_amount,
        'grand_total', p.grand_total,
        'paid_amount', p.paid_amount,
        'due_amount', p.due_amount,
        'payment_method', p.payment_method,
        'purchase_status', p.purchase_status,
        'notes', p.notes,
        'created_at', p.created_at,
        'items_count', jsonb_array_length(p_items)
    ) INTO v_created_purchase
    FROM public.purchases p
    WHERE p.id = v_purchase_id;

    RETURN v_created_purchase;
END;
$$;

-- 7. ENABLE ROW LEVEL SECURITY & PUBLIC POLICIES
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_all_suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "public_all_purchases" ON public.purchases;
DROP POLICY IF EXISTS "public_all_purchase_items" ON public.purchase_items;
DROP POLICY IF EXISTS "public_all_whatsapp_settings" ON public.whatsapp_settings;
DROP POLICY IF EXISTS "public_all_whatsapp_notifications" ON public.whatsapp_notifications;

CREATE POLICY "public_all_suppliers" ON public.suppliers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all_purchases" ON public.purchases FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all_purchase_items" ON public.purchase_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all_whatsapp_settings" ON public.whatsapp_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all_whatsapp_notifications" ON public.whatsapp_notifications FOR ALL USING (true) WITH CHECK (true);

-- 8. RELOAD SCHEMA CACHE
NOTIFY pgrst, 'reload schema';

