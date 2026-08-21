-- =========================================================================
-- ROYAL KISSAN ERP - COMPREHENSIVE BILLS & POS SCHEMA SYNCHRONIZATION
-- Master Migration: Ensures all bill, item, collection & due fields exist
-- =========================================================================

-- 1. Ensure public.bills table exists and contains ALL required fields
CREATE TABLE IF NOT EXISTS public.bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number TEXT NOT NULL,
    bill_type TEXT DEFAULT 'company_sale',
    customer_name TEXT DEFAULT 'Walk-in Customer',
    customer_phone TEXT,
    customer_address TEXT,
    customer_gstin TEXT,
    customer_id UUID,
    dealer_id UUID,
    driver_id UUID,
    items_count INTEGER DEFAULT 0,
    subtotal NUMERIC(12,2) DEFAULT 0,
    taxable_amount NUMERIC(12,2) DEFAULT 0,
    cgst_amount NUMERIC(12,2) DEFAULT 0,
    sgst_amount NUMERIC(12,2) DEFAULT 0,
    igst_amount NUMERIC(12,2) DEFAULT 0,
    gst_amount NUMERIC(12,2) DEFAULT 0,
    discount_amount NUMERIC(12,2) DEFAULT 0,
    round_off NUMERIC(12,2) DEFAULT 0,
    grand_total NUMERIC(12,2) DEFAULT 0,
    total_amount NUMERIC(12,2) DEFAULT 0,
    cash_amount NUMERIC(12,2) DEFAULT 0,
    upi_amount NUMERIC(12,2) DEFAULT 0,
    card_amount NUMERIC(12,2) DEFAULT 0,
    wallet_amount NUMERIC(12,2) DEFAULT 0,
    bank_amount NUMERIC(12,2) DEFAULT 0,
    mixed_amount NUMERIC(12,2) DEFAULT 0,
    paid_amount NUMERIC(12,2) DEFAULT 0,
    due_amount NUMERIC(12,2) DEFAULT 0,
    payment_mode TEXT DEFAULT 'cash',
    payment_status TEXT DEFAULT 'paid',
    status TEXT DEFAULT 'active',
    invoice_type TEXT DEFAULT 'thermal',
    coupon_code TEXT,
    notes TEXT,
    created_by TEXT,
    updated_by TEXT,
    date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Safely add any missing columns if bills table already exists
ALTER TABLE public.bills
  ADD COLUMN IF NOT EXISTS items_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS subtotal NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS taxable_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cgst_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sgst_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS igst_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gst_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS round_off NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS grand_total NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cash_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS upi_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS card_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS wallet_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bank_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS mixed_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS due_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS customer_name TEXT DEFAULT 'Walk-in Customer',
  ADD COLUMN IF NOT EXISTS customer_phone TEXT,
  ADD COLUMN IF NOT EXISTS customer_address TEXT,
  ADD COLUMN IF NOT EXISTS customer_gstin TEXT,
  ADD COLUMN IF NOT EXISTS customer_id UUID,
  ADD COLUMN IF NOT EXISTS dealer_id UUID,
  ADD COLUMN IF NOT EXISTS driver_id UUID,
  ADD COLUMN IF NOT EXISTS payment_mode TEXT DEFAULT 'cash',
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'paid',
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS invoice_type TEXT DEFAULT 'thermal',
  ADD COLUMN IF NOT EXISTS coupon_code TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS created_by TEXT,
  ADD COLUMN IF NOT EXISTS updated_by TEXT;

-- 2. Ensure public.archive_bills table exists with matching columns
CREATE TABLE IF NOT EXISTS public.archive_bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number TEXT NOT NULL,
    bill_type TEXT DEFAULT 'company_sale',
    customer_name TEXT DEFAULT 'Walk-in Customer',
    customer_phone TEXT,
    customer_address TEXT,
    customer_gstin TEXT,
    customer_id UUID,
    dealer_id UUID,
    driver_id UUID,
    items_count INTEGER DEFAULT 0,
    subtotal NUMERIC(12,2) DEFAULT 0,
    taxable_amount NUMERIC(12,2) DEFAULT 0,
    cgst_amount NUMERIC(12,2) DEFAULT 0,
    sgst_amount NUMERIC(12,2) DEFAULT 0,
    igst_amount NUMERIC(12,2) DEFAULT 0,
    gst_amount NUMERIC(12,2) DEFAULT 0,
    discount_amount NUMERIC(12,2) DEFAULT 0,
    round_off NUMERIC(12,2) DEFAULT 0,
    grand_total NUMERIC(12,2) DEFAULT 0,
    total_amount NUMERIC(12,2) DEFAULT 0,
    cash_amount NUMERIC(12,2) DEFAULT 0,
    upi_amount NUMERIC(12,2) DEFAULT 0,
    card_amount NUMERIC(12,2) DEFAULT 0,
    wallet_amount NUMERIC(12,2) DEFAULT 0,
    bank_amount NUMERIC(12,2) DEFAULT 0,
    mixed_amount NUMERIC(12,2) DEFAULT 0,
    paid_amount NUMERIC(12,2) DEFAULT 0,
    due_amount NUMERIC(12,2) DEFAULT 0,
    payment_mode TEXT DEFAULT 'cash',
    payment_status TEXT DEFAULT 'paid',
    status TEXT DEFAULT 'active',
    invoice_type TEXT DEFAULT 'thermal',
    coupon_code TEXT,
    notes TEXT,
    created_by TEXT,
    updated_by TEXT,
    date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.archive_bills
  ADD COLUMN IF NOT EXISTS items_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS subtotal NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS taxable_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cgst_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sgst_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS igst_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gst_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS round_off NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS grand_total NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cash_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS upi_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS card_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS wallet_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bank_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS mixed_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS due_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS customer_name TEXT DEFAULT 'Walk-in Customer',
  ADD COLUMN IF NOT EXISTS customer_phone TEXT,
  ADD COLUMN IF NOT EXISTS customer_address TEXT,
  ADD COLUMN IF NOT EXISTS customer_gstin TEXT,
  ADD COLUMN IF NOT EXISTS customer_id UUID,
  ADD COLUMN IF NOT EXISTS dealer_id UUID,
  ADD COLUMN IF NOT EXISTS driver_id UUID,
  ADD COLUMN IF NOT EXISTS payment_mode TEXT DEFAULT 'cash',
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'paid',
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS invoice_type TEXT DEFAULT 'thermal',
  ADD COLUMN IF NOT EXISTS coupon_code TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS created_by TEXT,
  ADD COLUMN IF NOT EXISTS updated_by TEXT;

-- 3. Ensure bill_items table exists with discount and tax fields
CREATE TABLE IF NOT EXISTS public.bill_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id UUID REFERENCES public.bills(id) ON DELETE CASCADE,
    product_id UUID,
    product_name TEXT NOT NULL,
    quantity NUMERIC(12,2) NOT NULL DEFAULT 1,
    rate NUMERIC(12,2) NOT NULL DEFAULT 0,
    mrp NUMERIC(12,2) DEFAULT 0,
    item_discount NUMERIC(12,2) DEFAULT 0,
    discount_type TEXT DEFAULT 'flat',
    gst_rate NUMERIC(5,2) DEFAULT 0,
    taxable_amount NUMERIC(12,2) DEFAULT 0,
    gst_amount NUMERIC(12,2) DEFAULT 0,
    amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    total NUMERIC(12,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.bill_items
  ADD COLUMN IF NOT EXISTS mrp NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS item_discount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_type TEXT DEFAULT 'flat',
  ADD COLUMN IF NOT EXISTS taxable_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total NUMERIC(12,2) DEFAULT 0;

ALTER TABLE public.bill_items ALTER COLUMN total DROP NOT NULL;

-- 4. Align auxiliary tables: collections, customer_dues, stock_transactions
ALTER TABLE public.collections
  ADD COLUMN IF NOT EXISTS bill_id UUID,
  ADD COLUMN IF NOT EXISTS invoice_number TEXT,
  ADD COLUMN IF NOT EXISTS customer_name TEXT,
  ADD COLUMN IF NOT EXISTS amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_mode TEXT DEFAULT 'cash',
  ADD COLUMN IF NOT EXISTS date DATE DEFAULT CURRENT_DATE;

ALTER TABLE public.customer_dues
  ADD COLUMN IF NOT EXISTS customer_id UUID,
  ADD COLUMN IF NOT EXISTS customer_phone TEXT,
  ADD COLUMN IF NOT EXISTS invoice_number TEXT,
  ADD COLUMN IF NOT EXISTS bill_id UUID,
  ADD COLUMN IF NOT EXISTS total_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(12,2) DEFAULT 0;

ALTER TABLE public.stock_transactions
  ADD COLUMN IF NOT EXISTS product_name TEXT;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_bills_invoice_num ON public.bills(invoice_number);
CREATE INDEX IF NOT EXISTS idx_bills_date ON public.bills(date DESC);
CREATE INDEX IF NOT EXISTS idx_bill_items_bill_id ON public.bill_items(bill_id);

-- 5. Create Transactional Stored Procedure process_pos_bill
CREATE OR REPLACE FUNCTION process_pos_bill(
    p_bill jsonb,
    p_items jsonb
) RETURNS jsonb AS $$
DECLARE
    v_bill_id UUID;
    v_created_bill jsonb;
    v_item jsonb;
    v_product_id UUID;
    v_qty NUMERIC;
    v_due NUMERIC;
    v_paid NUMERIC;
    v_cust_name TEXT;
    v_inv_no TEXT;
    v_amt NUMERIC;
BEGIN
    v_inv_no := p_bill->>'invoice_number';
    v_cust_name := COALESCE(p_bill->>'customer_name', 'Walk-in Customer');
    v_paid := COALESCE((p_bill->>'paid_amount')::NUMERIC, 0);
    v_due := COALESCE((p_bill->>'due_amount')::NUMERIC, 0);

    -- Insert Bill Header
    INSERT INTO public.bills (
        invoice_number,
        bill_type,
        customer_name,
        customer_phone,
        customer_address,
        customer_gstin,
        customer_id,
        dealer_id,
        driver_id,
        items_count,
        subtotal,
        taxable_amount,
        gst_amount,
        cgst_amount,
        sgst_amount,
        igst_amount,
        discount_amount,
        round_off,
        grand_total,
        total_amount,
        paid_amount,
        due_amount,
        cash_amount,
        upi_amount,
        card_amount,
        wallet_amount,
        bank_amount,
        mixed_amount,
        payment_mode,
        payment_status,
        status,
        invoice_type,
        date,
        coupon_code,
        notes,
        created_by
    ) VALUES (
        v_inv_no,
        COALESCE(p_bill->>'bill_type', 'company_sale'),
        v_cust_name,
        p_bill->>'customer_phone',
        p_bill->>'customer_address',
        p_bill->>'customer_gstin',
        (p_bill->>'customer_id')::UUID,
        (p_bill->>'dealer_id')::UUID,
        (p_bill->>'driver_id')::UUID,
        COALESCE((p_bill->>'items_count')::INTEGER, jsonb_array_length(p_items)),
        COALESCE((p_bill->>'subtotal')::NUMERIC, 0),
        COALESCE((p_bill->>'taxable_amount')::NUMERIC, 0),
        COALESCE((p_bill->>'gst_amount')::NUMERIC, 0),
        COALESCE((p_bill->>'cgst_amount')::NUMERIC, 0),
        COALESCE((p_bill->>'sgst_amount')::NUMERIC, 0),
        COALESCE((p_bill->>'igst_amount')::NUMERIC, 0),
        COALESCE((p_bill->>'discount_amount')::NUMERIC, 0),
        COALESCE((p_bill->>'round_off')::NUMERIC, 0),
        COALESCE((p_bill->>'grand_total')::NUMERIC, (p_bill->>'total_amount')::NUMERIC, 0),
        COALESCE((p_bill->>'total_amount')::NUMERIC, 0),
        v_paid,
        v_due,
        COALESCE((p_bill->>'cash_amount')::NUMERIC, 0),
        COALESCE((p_bill->>'upi_amount')::NUMERIC, 0),
        COALESCE((p_bill->>'card_amount')::NUMERIC, 0),
        COALESCE((p_bill->>'wallet_amount')::NUMERIC, 0),
        COALESCE((p_bill->>'bank_amount')::NUMERIC, 0),
        COALESCE((p_bill->>'mixed_amount')::NUMERIC, 0),
        COALESCE(p_bill->>'payment_mode', 'cash'),
        COALESCE(p_bill->>'payment_status', 'paid'),
        COALESCE(p_bill->>'status', 'active'),
        COALESCE(p_bill->>'invoice_type', 'thermal'),
        COALESCE((p_bill->>'date')::DATE, CURRENT_DATE),
        p_bill->>'coupon_code',
        p_bill->>'notes',
        p_bill->>'created_by'
    )
    RETURNING id INTO v_bill_id;

    -- Insert Bill Items & Update Inventory Stock
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := (v_item->>'product_id')::UUID;
        v_qty := COALESCE((v_item->>'quantity')::NUMERIC, 1);
        v_amt := COALESCE((v_item->>'amount')::NUMERIC, 0);

        INSERT INTO public.bill_items (
            bill_id,
            product_id,
            product_name,
            quantity,
            rate,
            mrp,
            item_discount,
            discount_type,
            gst_rate,
            taxable_amount,
            gst_amount,
            amount,
            total
        ) VALUES (
            v_bill_id,
            v_product_id,
            v_item->>'product_name',
            v_qty,
            COALESCE((v_item->>'rate')::NUMERIC, 0),
            COALESCE((v_item->>'mrp')::NUMERIC, 0),
            COALESCE((v_item->>'item_discount')::NUMERIC, 0),
            COALESCE(v_item->>'discount_type', 'flat'),
            COALESCE((v_item->>'gst_rate')::NUMERIC, 0),
            COALESCE((v_item->>'taxable_amount')::NUMERIC, 0),
            COALESCE((v_item->>'gst_amount')::NUMERIC, 0),
            v_amt,
            COALESCE((v_item->>'total')::NUMERIC, v_amt)
        );

        -- Decrement stock if product_id is valid
        IF v_product_id IS NOT NULL THEN
            UPDATE public.products
            SET stock_quantity = GREATEST(0, COALESCE(stock_quantity, 0) - v_qty),
                updated_at = NOW()
            WHERE id = v_product_id;

            INSERT INTO public.stock_transactions (
                product_id, product_name, transaction_type, quantity, reference_id, notes
            ) VALUES (
                v_product_id, v_item->>'product_name', 'sale', v_qty, v_bill_id, 'POS Sale ' || v_inv_no
            );
        END IF;
    END LOOP;

    -- Update Customer Dues if due_amount > 0
    IF v_due > 0 THEN
        INSERT INTO public.customer_dues (
            customer_id, customer_name, customer_phone, invoice_number, bill_id, total_amount, paid_amount, due_amount, status
        ) VALUES (
            (p_bill->>'customer_id')::UUID, v_cust_name, p_bill->>'customer_phone', v_inv_no, v_bill_id, COALESCE((p_bill->>'grand_total')::NUMERIC, (p_bill->>'total_amount')::NUMERIC), v_paid, v_due, 'due'
        );
    END IF;

    -- Update Collections Record if paid_amount > 0
    IF v_paid > 0 THEN
        INSERT INTO public.collections (
            bill_id, invoice_number, customer_name, amount, payment_mode, date, notes
        ) VALUES (
            v_bill_id, v_inv_no, v_cust_name, v_paid, COALESCE(p_bill->>'payment_mode', 'cash'), COALESCE((p_bill->>'date')::DATE, CURRENT_DATE), 'POS Bill Payment'
        );
    END IF;

    -- Select inserted bill record
    SELECT row_to_json(b) INTO v_created_bill
    FROM public.bills b WHERE b.id = v_bill_id;

    RETURN v_created_bill;
END;
$$ LANGUAGE plpgsql;

-- 6. Force refresh Supabase schema cache
NOTIFY pgrst, 'reload schema';
