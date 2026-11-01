-- =========================================================================
-- ROYAL KISSAN ERP — CENTRALIZED PRICING ENGINE & RATE ACCURACY SCHEMA
-- Authoritative Master Migration for Multi-Tier Deterministic Pricing
-- =========================================================================

-- 1. Create pricing_rules Table
CREATE TABLE IF NOT EXISTS public.pricing_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_type TEXT NOT NULL CHECK (rule_type IN ('customer', 'dealer', 'route', 'category', 'default')),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
    dealer_id UUID REFERENCES public.dealers(id) ON DELETE CASCADE,
    route_id UUID REFERENCES public.routes(id) ON DELETE CASCADE,
    category TEXT, -- e.g., 'wholesale', 'retail', 'commercial', 'household', 'regular'
    unit TEXT NOT NULL DEFAULT 'piece',
    selling_rate NUMERIC(12,2) NOT NULL CHECK (selling_rate >= 0),
    min_quantity NUMERIC(12,2) NOT NULL DEFAULT 1 CHECK (min_quantity >= 1),
    is_tax_inclusive BOOLEAN NOT NULL DEFAULT false,
    gst_rate NUMERIC(5,2), -- NULL means inherit from product
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_to DATE, -- NULL indicates indefinitely valid
    priority INTEGER NOT NULL DEFAULT 100, -- lower number = higher precedence
    is_active BOOLEAN NOT NULL DEFAULT true,
    notes TEXT,
    created_by TEXT DEFAULT 'Admin',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create pricing_audit_logs Table
CREATE TABLE IF NOT EXISTS public.pricing_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id UUID REFERENCES public.pricing_rules(id) ON DELETE SET NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('product', 'dealer', 'customer', 'route', 'category', 'bill_override')),
    entity_id UUID,
    entity_name TEXT,
    action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete', 'override', 'activate', 'deactivate')),
    old_rate NUMERIC(12,2),
    new_rate NUMERIC(12,2) NOT NULL,
    reason TEXT NOT NULL,
    changed_by TEXT NOT NULL DEFAULT 'Admin',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Extend public.bill_items for Complete Financial Snapshot & Audit Visibility
ALTER TABLE public.bill_items
    ADD COLUMN IF NOT EXISTS rate_source TEXT DEFAULT 'Default Product Rate',
    ADD COLUMN IF NOT EXISTS rate_rule_id UUID,
    ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'piece',
    ADD COLUMN IF NOT EXISTS is_tax_inclusive BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS original_rate NUMERIC(12,2),
    ADD COLUMN IF NOT EXISTS override_reason TEXT,
    ADD COLUMN IF NOT EXISTS overridden_by TEXT;

-- 4. Create Indexes for High-Performance Rate Resolution
CREATE INDEX IF NOT EXISTS idx_pricing_rules_lookup 
    ON public.pricing_rules (product_id, rule_type, is_active, effective_from, effective_to);

CREATE INDEX IF NOT EXISTS idx_pricing_rules_customer 
    ON public.pricing_rules (customer_id, product_id) WHERE customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pricing_rules_dealer 
    ON public.pricing_rules (dealer_id, product_id) WHERE dealer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pricing_rules_route 
    ON public.pricing_rules (route_id, product_id) WHERE route_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pricing_audit_logs_prod 
    ON public.pricing_audit_logs (product_id, created_at DESC);

-- 5. Correct Any 0.00 Default Product Rates from Verified System Constants
UPDATE public.products SET default_rate = 140.00, updated_at = NOW() WHERE name = '500ml Bottle' AND default_rate = 0;
UPDATE public.products SET default_rate = 120.00, updated_at = NOW() WHERE name = '1L Bottle' AND default_rate = 0;
UPDATE public.products SET default_rate = 150.00, updated_at = NOW() WHERE name = '2L Bottle' AND default_rate = 0;
UPDATE public.products SET default_rate = 80.00, updated_at = NOW() WHERE name = 'Water Packets (500ml)' AND default_rate = 0;

-- 6. Initial Seed of pricing_rules from Verified Existing Data (Idempotent)

-- A. Default Product Selling Rates (Priority 40)
INSERT INTO public.pricing_rules (
    rule_type, product_id, unit, selling_rate, is_tax_inclusive, priority, is_active, notes, created_by
)
SELECT 
    'default', p.id, COALESCE(p.unit, 'piece'), p.default_rate, false, 40, true, 'Seeded from Master Products default_rate', 'System Migration'
FROM public.products p
WHERE p.default_rate > 0
  AND NOT EXISTS (
      SELECT 1 FROM public.pricing_rules pr 
      WHERE pr.product_id = p.id AND pr.rule_type = 'default'
  );

-- B. Dealer-Specific Rates from dealer_products (Priority 10)
INSERT INTO public.pricing_rules (
    rule_type, product_id, dealer_id, unit, selling_rate, is_tax_inclusive, priority, is_active, notes, created_by
)
SELECT 
    'dealer', dp.product_id, dp.dealer_id, COALESCE(p.unit, 'piece'), dp.custom_rate, false, 10, true, 'Seeded from dealer_products custom_rate', 'System Migration'
FROM public.dealer_products dp
JOIN public.products p ON dp.product_id = p.id
WHERE dp.custom_rate > 0
  AND NOT EXISTS (
      SELECT 1 FROM public.pricing_rules pr 
      WHERE pr.product_id = dp.product_id AND pr.dealer_id = dp.dealer_id AND pr.rule_type = 'dealer'
  );

-- C. Route Customer Specific Rates from route_customers (Priority 20)
INSERT INTO public.pricing_rules (
    rule_type, product_id, route_id, unit, selling_rate, is_tax_inclusive, priority, is_active, notes, created_by
)
SELECT DISTINCT ON (rc.route_id, p.id)
    'route', p.id, rc.route_id, COALESCE(p.unit, 'piece'), rc.default_rate, false, 20, true, 'Seeded from route_customers for route', 'System Migration'
FROM public.route_customers rc
JOIN public.products p ON (LOWER(TRIM(p.name)) = LOWER(TRIM(rc.default_product)) OR LOWER(TRIM(p.name)) = LOWER(TRIM(rc.product_name)))
WHERE rc.default_rate > 0 AND rc.route_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM public.pricing_rules pr 
      WHERE pr.product_id = p.id AND pr.route_id = rc.route_id AND pr.rule_type = 'route'
  );

-- 7. Update PostgreSQL Master Stored Procedure process_pos_bill to Accept and Persist Rate Snapshots
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
    v_rule_id UUID;
    v_qty NUMERIC;
    v_rate NUMERIC;
    v_orig_rate NUMERIC;
    v_amt NUMERIC;
    v_cost NUMERIC;
    v_item_cogs NUMERIC;
    v_total_cogs NUMERIC := 0;
    v_rate_source TEXT;
    v_unit TEXT;
    v_is_inclusive BOOLEAN;
    v_override_reason TEXT;
    v_overridden_by TEXT;
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
    v_created_by := COALESCE(NULLIF(p_bill->>'created_by', ''), 'ERP Central Billing Engine');

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

    -- 3. Insert Bill Items with Complete Rate Accuracy Snapshot & Calculate COGS
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := CASE WHEN v_item->>'product_id' IS NOT NULL AND v_item->>'product_id' != '' THEN (v_item->>'product_id')::UUID ELSE NULL END;
        v_rule_id := CASE WHEN v_item->>'rate_rule_id' IS NOT NULL AND v_item->>'rate_rule_id' != '' THEN (v_item->>'rate_rule_id')::UUID ELSE NULL END;
        v_qty := COALESCE((v_item->>'quantity')::NUMERIC, 1);
        v_rate := COALESCE((v_item->>'rate')::NUMERIC, (v_item->>'selling_rate')::NUMERIC, 0);
        v_orig_rate := COALESCE((v_item->>'original_rate')::NUMERIC, v_rate);
        v_amt := COALESCE((v_item->>'amount')::NUMERIC, (v_item->>'total_amount')::NUMERIC, (v_item->>'total')::NUMERIC, (v_qty * v_rate));
        v_rate_source := COALESCE(v_item->>'rate_source', 'Default Product Rate');
        v_unit := COALESCE(v_item->>'unit', 'piece');
        v_is_inclusive := COALESCE((v_item->>'is_tax_inclusive')::BOOLEAN, false);
        v_override_reason := v_item->>'override_reason';
        v_overridden_by := v_item->>'overridden_by';
        
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
            cogs_amount,
            rate_source,
            rate_rule_id,
            unit,
            is_tax_inclusive,
            original_rate,
            override_reason,
            overridden_by,
            created_at
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
            v_item_cogs,
            v_rate_source,
            v_rule_id,
            v_unit,
            v_is_inclusive,
            v_orig_rate,
            v_override_reason,
            v_overridden_by,
            NOW()
        );

        -- If rate was overridden, record to pricing_audit_logs
        IF v_override_reason IS NOT NULL AND v_orig_rate != v_rate THEN
            INSERT INTO public.pricing_audit_logs (
                rule_id,
                product_id,
                entity_type,
                entity_id,
                entity_name,
                action,
                old_rate,
                new_rate,
                reason,
                changed_by
            ) VALUES (
                v_rule_id,
                v_product_id,
                'bill_override',
                v_bill_id,
                v_inv_no,
                'override',
                v_orig_rate,
                v_rate,
                v_override_reason,
                COALESCE(v_overridden_by, v_created_by)
            );
        END IF;

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

-- 8. Schema Reload Notification
NOTIFY pgrst, 'reload schema';
