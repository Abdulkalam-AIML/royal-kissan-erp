-- ==========================================================
-- ROYAL KISSAN ERP: COMPREHENSIVE DATABASE PERSISTENCE FIX
-- ==========================================================

-- 1. DROP OBSOLETE RESTRICTIVE CONSTRAINTS
-- Fix: customer_dues UNIQUE constraint on customer_name caused all subsequent due bills to fail with 23505!
ALTER TABLE public.customer_dues DROP CONSTRAINT IF EXISTS customer_dues_cust_name_key;

-- 2. ENSURE SALARY PAYMENTS HAS UNIQUE CONSTRAINT FOR UPSERT
-- Fix: salary_payments lacked UNIQUE (employee_id, month, year) constraint causing 42P10 on markPaid!
ALTER TABLE public.salary_payments DROP CONSTRAINT IF EXISTS salary_payments_emp_month_year_key;
ALTER TABLE public.salary_payments ADD CONSTRAINT salary_payments_emp_month_year_key UNIQUE (employee_id, month, year);

-- 3. ENSURE ALL REQUIRED COLUMNS EXIST ON TABLES
ALTER TABLE public.bills
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
  ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS due_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cash_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS upi_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS card_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS wallet_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bank_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS mixed_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_mode TEXT DEFAULT 'cash',
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'paid',
  ADD COLUMN IF NOT EXISTS invoice_type TEXT DEFAULT '80mm',
  ADD COLUMN IF NOT EXISTS items_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS date DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS coupon_code TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS created_by TEXT;

ALTER TABLE public.bill_items
  ADD COLUMN IF NOT EXISTS mrp NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS item_discount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_type TEXT DEFAULT 'flat',
  ADD COLUMN IF NOT EXISTS taxable_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gst_rate NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gst_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total NUMERIC(12,2) DEFAULT 0;

ALTER TABLE public.customer_dues
  ADD COLUMN IF NOT EXISTS customer_id UUID,
  ADD COLUMN IF NOT EXISTS customer_phone TEXT,
  ADD COLUMN IF NOT EXISTS invoice_number TEXT,
  ADD COLUMN IF NOT EXISTS bill_id UUID,
  ADD COLUMN IF NOT EXISTS total_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS due_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS date DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS expense_date DATE DEFAULT CURRENT_DATE;

ALTER TABLE public.stock_transactions
  ADD COLUMN IF NOT EXISTS product_id UUID,
  ADD COLUMN IF NOT EXISTS product_name TEXT,
  ADD COLUMN IF NOT EXISTS item_name TEXT,
  ADD COLUMN IF NOT EXISTS transaction_type TEXT,
  ADD COLUMN IF NOT EXISTS quantity NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reference_id UUID,
  ADD COLUMN IF NOT EXISTS reference_type TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE public.route_sales
  ADD COLUMN IF NOT EXISTS sale_date DATE DEFAULT CURRENT_DATE;

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_bills_inv_no ON public.bills(invoice_number);
CREATE INDEX IF NOT EXISTS idx_bills_date ON public.bills(date DESC);
CREATE INDEX IF NOT EXISTS idx_bill_items_bid ON public.bill_items(bill_id);
CREATE INDEX IF NOT EXISTS idx_cust_dues_bid ON public.customer_dues(bill_id);
CREATE INDEX IF NOT EXISTS idx_cust_dues_cid ON public.customer_dues(customer_id);
CREATE INDEX IF NOT EXISTS idx_stock_tx_pid ON public.stock_transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_tx_ref ON public.stock_transactions(reference_id);

-- 4. ATOMIC STORED PROCEDURE process_pos_bill (Production Grade)
CREATE OR REPLACE FUNCTION public.process_pos_bill(
    p_bill jsonb,
    p_items jsonb
) RETURNS jsonb AS $$
DECLARE
    v_bill_id UUID;
    v_item JSONB;
    v_product_id UUID;
    v_qty NUMERIC;
    v_amt NUMERIC;
    v_inv_no TEXT;
    v_cust_name TEXT;
    v_cust_id UUID;
    v_dlr_id UUID;
    v_drv_id UUID;
    v_paid NUMERIC;
    v_due NUMERIC;
    v_tot NUMERIC;
    v_created_bill JSONB;
BEGIN
    -- Extract and sanitize parameters
    v_inv_no := COALESCE(p_bill->>'invoice_number', 'RK-' || to_char(NOW(), 'YYYYMMDD') || '-' || floor(random()*9000 + 1000)::text);
    v_cust_name := COALESCE(NULLIF(p_bill->>'customer_name', ''), 'Walk-in Customer');
    v_cust_id := CASE WHEN p_bill->>'customer_id' IS NOT NULL AND p_bill->>'customer_id' != '' THEN (p_bill->>'customer_id')::UUID ELSE NULL END;
    v_dlr_id := CASE WHEN p_bill->>'dealer_id' IS NOT NULL AND p_bill->>'dealer_id' != '' THEN (p_bill->>'dealer_id')::UUID ELSE NULL END;
    v_drv_id := CASE WHEN p_bill->>'driver_id' IS NOT NULL AND p_bill->>'driver_id' != '' THEN (p_bill->>'driver_id')::UUID ELSE NULL END;
    v_paid := COALESCE((p_bill->>'paid_amount')::NUMERIC, 0);
    v_due := COALESCE((p_bill->>'due_amount')::NUMERIC, 0);
    v_tot := COALESCE((p_bill->>'total_amount')::NUMERIC, (p_bill->>'grand_total')::NUMERIC, 0);

    -- 1. Insert into bills
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
        cgst_amount,
        sgst_amount,
        igst_amount,
        gst_amount,
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
        v_cust_id,
        v_dlr_id,
        v_drv_id,
        COALESCE((p_bill->>'items_count')::INTEGER, jsonb_array_length(p_items)),
        COALESCE((p_bill->>'subtotal')::NUMERIC, 0),
        COALESCE((p_bill->>'taxable_amount')::NUMERIC, 0),
        COALESCE((p_bill->>'cgst_amount')::NUMERIC, 0),
        COALESCE((p_bill->>'sgst_amount')::NUMERIC, 0),
        COALESCE((p_bill->>'igst_amount')::NUMERIC, 0),
        COALESCE((p_bill->>'gst_amount')::NUMERIC, 0),
        COALESCE((p_bill->>'discount_amount')::NUMERIC, 0),
        COALESCE((p_bill->>'round_off')::NUMERIC, 0),
        COALESCE((p_bill->>'grand_total')::NUMERIC, v_tot),
        v_tot,
        v_paid,
        v_due,
        COALESCE((p_bill->>'cash_amount')::NUMERIC, 0),
        COALESCE((p_bill->>'upi_amount')::NUMERIC, 0),
        COALESCE((p_bill->>'card_amount')::NUMERIC, 0),
        COALESCE((p_bill->>'wallet_amount')::NUMERIC, 0),
        COALESCE((p_bill->>'bank_amount')::NUMERIC, 0),
        COALESCE((p_bill->>'mixed_amount')::NUMERIC, 0),
        COALESCE(p_bill->>'payment_mode', 'cash'),
        COALESCE(p_bill->>'payment_status', CASE WHEN v_due <= 0 THEN 'paid' WHEN v_paid > 0 THEN 'partial' ELSE 'due' END),
        COALESCE(p_bill->>'status', 'active'),
        COALESCE(p_bill->>'invoice_type', '80mm'),
        COALESCE((p_bill->>'date')::DATE, CURRENT_DATE),
        p_bill->>'coupon_code',
        p_bill->>'notes',
        COALESCE(p_bill->>'created_by', 'POS Cashier')
    )
    RETURNING id INTO v_bill_id;

    -- 2. Insert Bill Items & Update Inventory Stock
    IF p_items IS NOT NULL AND jsonb_typeof(p_items) = 'array' THEN
        FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
        LOOP
            v_product_id := CASE WHEN v_item->>'product_id' IS NOT NULL AND v_item->>'product_id' != '' THEN (v_item->>'product_id')::UUID ELSE NULL END;
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
                COALESCE(v_item->>'product_name', 'Item'),
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

            -- Deduct product stock & log transaction
            IF v_product_id IS NOT NULL THEN
                UPDATE public.products
                SET stock_quantity = GREATEST(0, COALESCE(stock_quantity, 0) - v_qty::integer),
                    updated_at = NOW()
                WHERE id = v_product_id;

                INSERT INTO public.stock_transactions (
                    product_id, product_name, item_name, transaction_type, quantity, reference_id, notes, reference_type
                ) VALUES (
                    v_product_id, COALESCE(v_item->>'product_name', 'Product'), COALESCE(v_item->>'product_name', 'Product'), 'out', v_qty::integer, v_bill_id, 'Bill ' || v_inv_no, 'sale'
                );
            END IF;
        END LOOP;
    END IF;

    -- 3. Customer Dues Ledger (Insert individual bill due record)
    IF v_due > 0 THEN
        INSERT INTO public.customer_dues (
            customer_id,
            customer_name,
            customer_phone,
            invoice_number,
            bill_id,
            total_amount,
            paid_amount,
            due_amount,
            status
        ) VALUES (
            v_cust_id,
            v_cust_name,
            p_bill->>'customer_phone',
            v_inv_no,
            v_bill_id,
            v_tot,
            v_paid,
            v_due,
            'pending'
        );

        -- Update customer outstanding balance if customer_id linked
        IF v_cust_id IS NOT NULL THEN
            UPDATE public.customers
            SET outstanding_amount = COALESCE(outstanding_amount, 0) + v_due,
                updated_at = NOW()
            WHERE id = v_cust_id;
        END IF;

        -- Update dealer outstanding balance if dealer_id linked
        IF v_dlr_id IS NOT NULL THEN
            UPDATE public.dealers
            SET outstanding_amount = COALESCE(outstanding_amount, 0) + v_due,
                total_purchases = COALESCE(total_purchases, 0) + v_tot,
                last_purchase_date = COALESCE((p_bill->>'date')::DATE, CURRENT_DATE),
                updated_at = NOW()
            WHERE id = v_dlr_id;
        END IF;
    ELSIF v_dlr_id IS NOT NULL THEN
        -- Fully paid dealer invoice
        UPDATE public.dealers
        SET total_purchases = COALESCE(total_purchases, 0) + v_tot,
            last_purchase_date = COALESCE((p_bill->>'date')::DATE, CURRENT_DATE),
            updated_at = NOW()
        WHERE id = v_dlr_id;
    END IF;

    -- 4. Payment Collection Ledger (Record collection for financial audit)
    IF v_paid > 0 THEN
        -- General collections register
        INSERT INTO public.collections (
            bill_id,
            invoice_number,
            customer_name,
            amount,
            payment_mode,
            date,
            notes
        ) VALUES (
            v_bill_id,
            v_inv_no,
            v_cust_name,
            v_paid,
            COALESCE(p_bill->>'payment_mode', 'cash'),
            COALESCE((p_bill->>'date')::DATE, CURRENT_DATE),
            'Payment for ' || v_inv_no
        );

        -- Dealer collections register
        INSERT INTO public.dealer_collections (
            dealer_id,
            amount,
            payment_mode,
            collected_date,
            date,
            notes,
            collected_by
        ) VALUES (
            v_dlr_id,
            v_paid,
            COALESCE(p_bill->>'payment_mode', 'cash'),
            COALESCE((p_bill->>'date')::DATE, CURRENT_DATE),
            COALESCE((p_bill->>'date')::DATE, CURRENT_DATE),
            'Payment ' || v_inv_no || ' (' || v_cust_name || ')',
            COALESCE(p_bill->>'created_by', 'POS Cashier')
        );
    END IF;

    -- 5. Return full bill record
    SELECT row_to_json(b) INTO v_created_bill
    FROM public.bills b WHERE b.id = v_bill_id;

    RETURN v_created_bill;
END;
$$ LANGUAGE plpgsql;

-- 5. Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
