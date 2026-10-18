-- =========================================================================
-- ROYAL KISSAN ERP — UNIFIED BILLING SYSTEM MASTER MIGRATION
-- Single Canonical Billing Architecture for Counter, Customer, Dealer & Route
-- =========================================================================

-- 1. Schema Extensions on public.bills
ALTER TABLE public.bills
  ADD COLUMN IF NOT EXISTS route_customer_id UUID,
  ADD COLUMN IF NOT EXISTS assignment_id UUID,
  ADD COLUMN IF NOT EXISTS dispatch_id UUID,
  ADD COLUMN IF NOT EXISTS total_cogs NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gross_profit NUMERIC(12,2) DEFAULT 0;

-- 2. Schema Extensions on public.bill_items
ALTER TABLE public.bill_items
  ADD COLUMN IF NOT EXISTS cost_per_unit_at_sale NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cogs_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- 3. Schema Extensions on public.products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS cost_price NUMERIC(12,2) DEFAULT 0;

-- 4. Schema Extensions on public.route_sales
ALTER TABLE public.route_sales
  ADD COLUMN IF NOT EXISTS bill_id UUID REFERENCES public.bills(id) ON DELETE SET NULL;

-- 5. Schema Extensions on public.payments
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS bill_id UUID REFERENCES public.bills(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reference TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed',
  ADD COLUMN IF NOT EXISTS driver_id UUID,
  ADD COLUMN IF NOT EXISTS invoice_number TEXT;

-- 6. Schema Extensions on public.customer_dues
ALTER TABLE public.customer_dues
  ADD COLUMN IF NOT EXISTS dealer_id UUID;

-- 7. Schema Extensions on public.returns
ALTER TABLE public.returns
  ADD COLUMN IF NOT EXISTS bill_id UUID REFERENCES public.bills(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS driver_id UUID,
  ADD COLUMN IF NOT EXISTS route_id UUID;

-- 8. Schema Extensions on public.leakages
ALTER TABLE public.leakages
  ADD COLUMN IF NOT EXISTS bill_id UUID REFERENCES public.bills(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS driver_id UUID,
  ADD COLUMN IF NOT EXISTS route_id UUID;

-- 9. Performance B-Tree Indexes
CREATE INDEX IF NOT EXISTS idx_bills_bill_type ON public.bills(bill_type);
CREATE INDEX IF NOT EXISTS idx_bills_customer_id ON public.bills(customer_id);
CREATE INDEX IF NOT EXISTS idx_bills_dealer_id ON public.bills(dealer_id);
CREATE INDEX IF NOT EXISTS idx_bills_driver_id ON public.bills(driver_id);
CREATE INDEX IF NOT EXISTS idx_bills_route_id ON public.bills(route_id);
CREATE INDEX IF NOT EXISTS idx_route_sales_bill_id ON public.route_sales(bill_id);
CREATE INDEX IF NOT EXISTS idx_payments_bill_id ON public.payments(bill_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON public.payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_dealer_id ON public.payments(dealer_id);
CREATE INDEX IF NOT EXISTS idx_bill_items_product_id ON public.bill_items(product_id);

-- 10. Historical Backfill for Dealer bills lacking dealer_id
UPDATE public.bills b
SET dealer_id = d.id
FROM public.dealers d
WHERE b.dealer_id IS NULL
  AND (b.bill_type LIKE '%dealer%' OR b.notes LIKE '%Dealer%')
  AND LOWER(TRIM(b.customer_name)) = LOWER(TRIM(d.name));

-- 11. Safe Reconciliation of Historical route_sales records (Zero revenue double count)
DO $$
DECLARE
    r RECORD;
    v_new_bill_id UUID;
    v_prod_id UUID;
    v_cost NUMERIC;
BEGIN
    FOR r IN 
        SELECT rs.id, rs.invoice_number, rs.driver_id, rs.route_id, rs.customer_name,
               rs.product_name, rs.quantity, rs.rate, rs.total_amount, rs.cash_paid,
               rs.upi_paid, rs.due_amount, rs.sale_date, rs.created_at
        FROM public.route_sales rs
        WHERE rs.bill_id IS NULL
    LOOP
        -- Check if bill already exists with this invoice number
        SELECT id INTO v_new_bill_id FROM public.bills WHERE invoice_number = r.invoice_number;

        IF v_new_bill_id IS NULL THEN
            -- Find product_id if exists
            SELECT id, COALESCE(cost_price, 0) INTO v_prod_id, v_cost 
            FROM public.products 
            WHERE LOWER(TRIM(name)) = LOWER(TRIM(r.product_name)) 
            LIMIT 1;

            -- Create canonical bill
            INSERT INTO public.bills (
                invoice_number,
                bill_type,
                customer_name,
                driver_id,
                route_id,
                items_count,
                subtotal,
                taxable_amount,
                gst_amount,
                total_amount,
                grand_total,
                paid_amount,
                due_amount,
                cash_amount,
                upi_amount,
                payment_mode,
                payment_status,
                status,
                invoice_type,
                date,
                created_at,
                notes,
                created_by
            ) VALUES (
                r.invoice_number,
                'route',
                r.customer_name,
                r.driver_id,
                r.route_id,
                1,
                COALESCE(r.total_amount, 0),
                COALESCE(r.total_amount, 0),
                0,
                COALESCE(r.total_amount, 0),
                COALESCE(r.total_amount, 0),
                COALESCE(r.cash_paid, 0) + COALESCE(r.upi_paid, 0),
                COALESCE(r.due_amount, 0),
                COALESCE(r.cash_paid, 0),
                COALESCE(r.upi_paid, 0),
                CASE 
                    WHEN COALESCE(r.cash_paid, 0) > 0 AND COALESCE(r.upi_paid, 0) > 0 THEN 'mixed'
                    WHEN COALESCE(r.upi_paid, 0) > 0 THEN 'upi'
                    WHEN COALESCE(r.due_amount, 0) >= COALESCE(r.total_amount, 0) THEN 'due'
                    ELSE 'cash'
                END,
                CASE 
                    WHEN COALESCE(r.due_amount, 0) <= 0 THEN 'paid'
                    WHEN (COALESCE(r.cash_paid, 0) + COALESCE(r.upi_paid, 0)) > 0 THEN 'partial'
                    ELSE 'due'
                END,
                'active',
                'thermal',
                COALESCE(r.sale_date, r.created_at::date, CURRENT_DATE),
                COALESCE(r.created_at, NOW()),
                'Historical Route Sale ' || r.invoice_number,
                'Historical Route Sync'
            ) RETURNING id INTO v_new_bill_id;

            -- Create canonical bill_item
            INSERT INTO public.bill_items (
                bill_id,
                product_id,
                product_name,
                quantity,
                rate,
                mrp,
                amount,
                total,
                cost_per_unit_at_sale,
                cogs_amount,
                created_at
            ) VALUES (
                v_new_bill_id,
                v_prod_id,
                r.product_name,
                COALESCE(r.quantity, 1),
                COALESCE(r.rate, 0),
                COALESCE(r.rate, 0),
                COALESCE(r.total_amount, 0),
                COALESCE(r.total_amount, 0),
                COALESCE(v_cost, 0),
                COALESCE(v_cost, 0) * COALESCE(r.quantity, 1),
                COALESCE(r.created_at, NOW())
            );
        END IF;

        -- Link route_sale record to canonical bill
        UPDATE public.route_sales
        SET bill_id = v_new_bill_id
        WHERE id = r.id;
    END LOOP;
END;
$$;

-- 12. Master Production-Grade Stored Procedure: process_pos_bill (v2 Unified)
CREATE OR REPLACE FUNCTION public.process_pos_bill(
    p_bill jsonb,
    p_items jsonb
) RETURNS jsonb AS $$
DECLARE
    v_bill_id UUID;
    v_item JSONB;
    v_ret JSONB;
    v_leak JSONB;
    v_product_id UUID;
    v_qty NUMERIC;
    v_rate NUMERIC;
    v_amt NUMERIC;
    v_cost NUMERIC;
    v_item_cogs NUMERIC;
    v_total_cogs NUMERIC := 0;
    v_inv_no TEXT;
    v_bill_type TEXT;
    v_cust_name TEXT;
    v_cust_id UUID;
    v_dlr_id UUID;
    v_drv_id UUID;
    v_rte_id UUID;
    v_rte_cust_id UUID;
    v_assign_id UUID;
    v_disp_id UUID;
    v_paid NUMERIC;
    v_due NUMERIC;
    v_tot NUMERIC;
    v_taxable NUMERIC;
    v_payment_mode TEXT;
    v_payment_status TEXT;
    v_date DATE;
    v_created_by TEXT;
    v_created_bill JSONB;
BEGIN
    -- 1. Extract and sanitize parameters
    v_inv_no := COALESCE(NULLIF(p_bill->>'invoice_number', ''), 'RK-' || to_char(NOW(), 'YYYYMMDD') || '-' || floor(random()*9000 + 1000)::text);
    v_bill_type := COALESCE(NULLIF(p_bill->>'bill_type', ''), 'counter');
    v_cust_name := COALESCE(NULLIF(p_bill->>'customer_name', ''), 'Walk-in Customer');
    
    v_cust_id := CASE WHEN p_bill->>'customer_id' IS NOT NULL AND p_bill->>'customer_id' != '' THEN (p_bill->>'customer_id')::UUID ELSE NULL END;
    v_dlr_id := CASE WHEN p_bill->>'dealer_id' IS NOT NULL AND p_bill->>'dealer_id' != '' THEN (p_bill->>'dealer_id')::UUID ELSE NULL END;
    v_drv_id := CASE WHEN p_bill->>'driver_id' IS NOT NULL AND p_bill->>'driver_id' != '' THEN (p_bill->>'driver_id')::UUID ELSE NULL END;
    v_rte_id := CASE WHEN p_bill->>'route_id' IS NOT NULL AND p_bill->>'route_id' != '' THEN (p_bill->>'route_id')::UUID ELSE NULL END;
    v_rte_cust_id := CASE WHEN p_bill->>'route_customer_id' IS NOT NULL AND p_bill->>'route_customer_id' != '' THEN (p_bill->>'route_customer_id')::UUID ELSE NULL END;
    v_assign_id := CASE WHEN p_bill->>'assignment_id' IS NOT NULL AND p_bill->>'assignment_id' != '' THEN (p_bill->>'assignment_id')::UUID ELSE NULL END;
    v_disp_id := CASE WHEN p_bill->>'dispatch_id' IS NOT NULL AND p_bill->>'dispatch_id' != '' THEN (p_bill->>'dispatch_id')::UUID ELSE NULL END;

    v_paid := COALESCE((p_bill->>'paid_amount')::NUMERIC, 0);
    v_due := COALESCE((p_bill->>'due_amount')::NUMERIC, 0);
    v_tot := COALESCE((p_bill->>'total_amount')::NUMERIC, (p_bill->>'grand_total')::NUMERIC, 0);
    v_taxable := COALESCE((p_bill->>'taxable_amount')::NUMERIC, v_tot);
    v_payment_mode := COALESCE(NULLIF(p_bill->>'payment_mode', ''), 'cash');
    v_payment_status := CASE 
        WHEN v_due <= 0 THEN 'paid' 
        WHEN v_paid > 0 THEN 'partial' 
        ELSE 'due' 
    END;
    v_date := COALESCE((p_bill->>'date')::DATE, CURRENT_DATE);
    v_created_by := COALESCE(NULLIF(p_bill->>'created_by', ''), 'ERP Billing System');

    -- Safety check: Ensure items exist
    IF p_items IS NULL OR jsonb_typeof(p_items) != 'array' OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'A bill must have at least one bill item. Empty bill items rejected.';
    END IF;

    -- Safety check: For dealer bill, ensure dealer_id or valid dealer reference
    IF v_bill_type = 'dealer' AND v_dlr_id IS NULL THEN
        SELECT id INTO v_dlr_id FROM public.dealers WHERE LOWER(TRIM(name)) = LOWER(TRIM(v_cust_name)) LIMIT 1;
    END IF;

    -- 2. Insert into public.bills
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
        route_id,
        route_customer_id,
        assignment_id,
        dispatch_id,
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
        created_by,
        total_cogs,
        gross_profit
    ) VALUES (
        v_inv_no,
        v_bill_type,
        v_cust_name,
        p_bill->>'customer_phone',
        p_bill->>'customer_address',
        p_bill->>'customer_gstin',
        v_cust_id,
        v_dlr_id,
        v_drv_id,
        v_rte_id,
        v_rte_cust_id,
        v_assign_id,
        v_disp_id,
        jsonb_array_length(p_items),
        COALESCE((p_bill->>'subtotal')::NUMERIC, 0),
        v_taxable,
        COALESCE((p_bill->>'cgst_amount')::NUMERIC, 0),
        COALESCE((p_bill->>'sgst_amount')::NUMERIC, 0),
        COALESCE((p_bill->>'igst_amount')::NUMERIC, 0),
        COALESCE((p_bill->>'gst_amount')::NUMERIC, (p_bill->>'tax_amount')::NUMERIC, 0),
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
        v_payment_mode,
        v_payment_status,
        'active',
        COALESCE(p_bill->>'invoice_type', 'thermal'),
        v_date,
        p_bill->>'coupon_code',
        p_bill->>'notes',
        v_created_by,
        0,
        0
    )
    RETURNING id INTO v_bill_id;

    -- 3. Insert Bill Items, Calculate COGS, & Update Inventory
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := CASE WHEN v_item->>'product_id' IS NOT NULL AND v_item->>'product_id' != '' THEN (v_item->>'product_id')::UUID ELSE NULL END;
        v_qty := COALESCE((v_item->>'quantity')::NUMERIC, 1);
        v_rate := COALESCE((v_item->>'rate')::NUMERIC, (v_item->>'selling_rate')::NUMERIC, 0);
        v_amt := COALESCE((v_item->>'amount')::NUMERIC, (v_item->>'total_amount')::NUMERIC, (v_item->>'total')::NUMERIC, (v_qty * v_rate));
        
        -- Determine historical cost per unit at sale (Never mutate product default_rate!)
        v_cost := COALESCE((v_item->>'cost_per_unit_at_sale')::NUMERIC, (v_item->>'cost_price')::NUMERIC, NULL);
        IF v_cost IS NULL AND v_product_id IS NOT NULL THEN
            SELECT COALESCE(cost_price, 0) INTO v_cost FROM public.products WHERE id = v_product_id;
        END IF;
        v_cost := COALESCE(v_cost, 0);
        v_item_cogs := v_qty * v_cost;
        v_total_cogs := v_total_cogs + v_item_cogs;

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
            total,
            cost_per_unit_at_sale,
            cogs_amount
        ) VALUES (
            v_bill_id,
            v_product_id,
            COALESCE(v_item->>'product_name', 'Product Item'),
            v_qty,
            v_rate,
            COALESCE((v_item->>'mrp')::NUMERIC, v_rate),
            COALESCE((v_item->>'item_discount')::NUMERIC, 0),
            COALESCE(v_item->>'discount_type', 'flat'),
            COALESCE((v_item->>'gst_rate')::NUMERIC, 0),
            COALESCE((v_item->>'taxable_amount')::NUMERIC, v_amt),
            COALESCE((v_item->>'gst_amount')::NUMERIC, 0),
            v_amt,
            COALESCE((v_item->>'total')::NUMERIC, v_amt),
            v_cost,
            v_item_cogs
        );

        -- Inventory stock deduction & movement log
        IF v_product_id IS NOT NULL THEN
            UPDATE public.products
            SET stock_quantity = GREATEST(0, COALESCE(stock_quantity, 0) - v_qty::integer),
                updated_at = NOW()
            WHERE id = v_product_id;

            INSERT INTO public.stock_transactions (
                product_id, product_name, item_name, transaction_type, quantity, reference_id, reference_type, notes
            ) VALUES (
                v_product_id,
                COALESCE(v_item->>'product_name', 'Product Item'),
                COALESCE(v_item->>'product_name', 'Product Item'),
                'out',
                v_qty::integer,
                v_bill_id,
                'sale',
                'Sale ' || v_inv_no || ' (' || v_bill_type || ')'
            );
        END IF;
    END LOOP;

    -- Update bills with calculated total_cogs and gross_profit
    UPDATE public.bills
    SET total_cogs = v_total_cogs,
        gross_profit = v_taxable - v_total_cogs
    WHERE id = v_bill_id;

    -- 4. Process Returns and Leakages if provided in bill payload
    IF p_bill ? 'returns' AND jsonb_typeof(p_bill->'returns') = 'array' THEN
        FOR v_ret IN SELECT * FROM jsonb_array_elements(p_bill->'returns')
        LOOP
            IF COALESCE((v_ret->>'quantity')::NUMERIC, 0) > 0 THEN
                INSERT INTO public.returns (
                    date, product_id, quantity, reason, source, reference_id, bill_id, driver_id, route_id, notes
                ) VALUES (
                    v_date,
                    CASE WHEN v_ret->>'product_id' IS NOT NULL AND v_ret->>'product_id' != '' THEN (v_ret->>'product_id')::UUID ELSE NULL END,
                    (v_ret->>'quantity')::INTEGER,
                    COALESCE(v_ret->>'reason', 'Customer Return'),
                    'Route Sale ' || v_inv_no,
                    v_bill_id,
                    v_bill_id,
                    v_drv_id,
                    v_rte_id,
                    v_ret->>'notes'
                );

                -- Increment inventory for returned goods if valid product
                IF v_ret->>'product_id' IS NOT NULL AND v_ret->>'product_id' != '' THEN
                    UPDATE public.products
                    SET stock_quantity = COALESCE(stock_quantity, 0) + (v_ret->>'quantity')::INTEGER,
                        updated_at = NOW()
                    WHERE id = (v_ret->>'product_id')::UUID;

                    INSERT INTO public.stock_transactions (
                        product_id, product_name, item_name, transaction_type, quantity, reference_id, reference_type, notes
                    ) VALUES (
                        (v_ret->>'product_id')::UUID,
                        COALESCE(v_ret->>'product_name', 'Returned Item'),
                        COALESCE(v_ret->>'product_name', 'Returned Item'),
                        'in',
                        (v_ret->>'quantity')::INTEGER,
                        v_bill_id,
                        'route_return',
                        'Return from ' || v_inv_no
                    );
                END IF;
            END IF;
        END LOOP;
    END IF;

    IF p_bill ? 'leakages' AND jsonb_typeof(p_bill->'leakages') = 'array' THEN
        FOR v_leak IN SELECT * FROM jsonb_array_elements(p_bill->'leakages')
        LOOP
            IF COALESCE((v_leak->>'quantity')::NUMERIC, 0) > 0 THEN
                INSERT INTO public.leakages (
                    date, product_id, quantity, source, financial_loss, bill_id, driver_id, route_id, notes
                ) VALUES (
                    v_date,
                    CASE WHEN v_leak->>'product_id' IS NOT NULL AND v_leak->>'product_id' != '' THEN (v_leak->>'product_id')::UUID ELSE NULL END,
                    (v_leak->>'quantity')::INTEGER,
                    COALESCE(v_leak->>'source', 'Transport'),
                    COALESCE((v_leak->>'financial_loss')::NUMERIC, 0),
                    v_bill_id,
                    v_drv_id,
                    v_rte_id,
                    COALESCE(v_leak->>'notes', 'Leakage on ' || v_inv_no)
                );

                IF v_leak->>'product_id' IS NOT NULL AND v_leak->>'product_id' != '' THEN
                    INSERT INTO public.stock_transactions (
                        product_id, product_name, item_name, transaction_type, quantity, reference_id, reference_type, notes
                    ) VALUES (
                        (v_leak->>'product_id')::UUID,
                        COALESCE(v_leak->>'product_name', 'Leaked Item'),
                        COALESCE(v_leak->>'product_name', 'Leaked Item'),
                        'out',
                        (v_leak->>'quantity')::INTEGER,
                        v_bill_id,
                        'route_leakage',
                        'Leakage on ' || v_inv_no
                    );
                END IF;
            END IF;
        END LOOP;
    END IF;

    -- 5. Operational Linkage for Route Bills (Prevents Double Counting!)
    IF v_bill_type = 'route' THEN
        INSERT INTO public.route_sales (
            invoice_number,
            driver_id,
            route_id,
            customer_name,
            product_name,
            quantity,
            rate,
            total_amount,
            cash_paid,
            upi_paid,
            due_amount,
            sale_date,
            bill_id
        ) VALUES (
            v_inv_no,
            v_drv_id,
            v_rte_id,
            v_cust_name,
            COALESCE(p_items->0->>'product_name', 'Route Delivery Products'),
            COALESCE((p_items->0->>'quantity')::INTEGER, 1),
            COALESCE((p_items->0->>'rate')::NUMERIC, v_tot),
            v_tot,
            COALESCE((p_bill->>'cash_amount')::NUMERIC, 0),
            COALESCE((p_bill->>'upi_amount')::NUMERIC, 0),
            v_due,
            v_date,
            v_bill_id
        );
    END IF;

    -- 6. Unified Payment Ledger & Collections
    IF v_paid > 0 THEN
        -- Authoritative public.payments table
        INSERT INTO public.payments (
            bill_id,
            customer_id,
            dealer_id,
            driver_id,
            amount,
            payment_mode,
            payment_date,
            reference_number,
            reference,
            invoice_number,
            notes,
            status,
            created_at
        ) VALUES (
            v_bill_id,
            v_cust_id,
            v_dlr_id,
            v_drv_id,
            v_paid,
            v_payment_mode,
            v_date,
            v_inv_no,
            v_inv_no,
            v_inv_no,
            'Payment for ' || v_inv_no,
            'completed',
            NOW()
        );

        -- Collections ledger (maintains compatibility with existing collections listeners)
        INSERT INTO public.collections (
            bill_id,
            driver_id,
            route_id,
            invoice_number,
            customer_name,
            amount,
            payment_mode,
            date,
            collection_date,
            cash_amount,
            upi_amount,
            notes
        ) VALUES (
            v_bill_id,
            v_drv_id,
            v_rte_id,
            v_inv_no,
            v_cust_name,
            v_paid,
            v_payment_mode,
            v_date,
            v_date,
            COALESCE((p_bill->>'cash_amount')::NUMERIC, 0),
            COALESCE((p_bill->>'upi_amount')::NUMERIC, 0),
            'Payment for ' || v_inv_no
        );
    END IF;

    -- 7. Receivables / Dues Ledger
    IF v_due > 0 THEN
        INSERT INTO public.customer_dues (
            customer_id,
            dealer_id,
            driver_id,
            route_id,
            customer_name,
            customer_phone,
            invoice_number,
            bill_id,
            total_amount,
            paid_amount,
            due_amount,
            status,
            last_updated
        ) VALUES (
            v_cust_id,
            v_dlr_id,
            v_drv_id,
            v_rte_id,
            v_cust_name,
            p_bill->>'customer_phone',
            v_inv_no,
            v_bill_id,
            v_tot,
            v_paid,
            v_due,
            'pending',
            NOW()
        );
    END IF;

    -- 8. Synchronize Customer Profile & Ledger
    IF v_cust_id IS NOT NULL THEN
        UPDATE public.customers
        SET outstanding_amount = COALESCE(outstanding_amount, 0) + v_due,
            updated_at = NOW()
        WHERE id = v_cust_id;

        INSERT INTO public.customer_ledger (
            customer_name,
            transaction_type,
            bill_id,
            debit,
            credit,
            balance,
            description,
            transaction_date
        ) VALUES (
            v_cust_name,
            'bill',
            v_bill_id,
            v_tot,
            v_paid,
            COALESCE((SELECT outstanding_amount FROM public.customers WHERE id = v_cust_id), 0),
            'Invoice ' || v_inv_no,
            v_date
        );
    END IF;

    -- 9. Synchronize Dealer Profile & Ledger
    IF v_dlr_id IS NOT NULL THEN
        UPDATE public.dealers
        SET outstanding_amount = COALESCE(outstanding_amount, 0) + v_due,
            total_purchases = COALESCE(total_purchases, 0) + v_tot,
            total_sales = COALESCE(total_sales, 0) + v_tot,
            last_purchase_date = v_date,
            updated_at = NOW()
        WHERE id = v_dlr_id;

        INSERT INTO public.dealer_ledger (
            dealer_id,
            transaction_type,
            amount,
            reference_id
        ) VALUES (
            v_dlr_id,
            'invoice',
            v_tot,
            v_bill_id
        );

        IF v_paid > 0 THEN
            INSERT INTO public.dealer_ledger (
                dealer_id,
                transaction_type,
                amount,
                reference_id
            ) VALUES (
                v_dlr_id,
                'payment',
                v_paid,
                v_bill_id
            );
        END IF;
    END IF;

    -- 10. Return complete newly created canonical bill record
    SELECT row_to_json(b) INTO v_created_bill
    FROM public.bills b WHERE b.id = v_bill_id;

    RETURN v_created_bill;
END;
$$ LANGUAGE plpgsql;

-- 13. Schema Reload Notification
NOTIFY pgrst, 'reload schema';
