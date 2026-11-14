-- Migration 011: Driver, Route Management, Route Customer Billing & Settlement Redesign
-- Preserves existing tables, billing engine, and financial records.

-- 1. Enhance drivers table
ALTER TABLE public.drivers 
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS joining_date DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS employment_status TEXT DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'AVAILABLE',
  ADD COLUMN IF NOT EXISTS assigned_vehicle TEXT,
  ADD COLUMN IF NOT EXISTS total_completed_routes INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_sales NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_collections NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Enhance driver_load_dispatches table
ALTER TABLE public.driver_load_dispatches
  ADD COLUMN IF NOT EXISTS start_time TEXT DEFAULT '08:30 AM',
  ADD COLUMN IF NOT EXISTS end_time TEXT,
  ADD COLUMN IF NOT EXISTS start_location TEXT DEFAULT 'Main Plant / Warehouse',
  ADD COLUMN IF NOT EXISTS destination_areas TEXT,
  ADD COLUMN IF NOT EXISTS total_sold_qty NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_returned_qty NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_leaked_qty NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unaccounted_qty NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_sales_amount NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cash_collected NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS upi_collected NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS credit_amount NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS expenses_amount NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bills_generated BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS bills_count INTEGER DEFAULT 0;

-- 3. Enhance route_sales table
ALTER TABLE public.route_sales
  ADD COLUMN IF NOT EXISTS dispatch_id UUID REFERENCES public.driver_load_dispatches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS customer_phone TEXT,
  ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'cans',
  ADD COLUMN IF NOT EXISTS discount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gst_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_type TEXT DEFAULT 'CASH',
  ADD COLUMN IF NOT EXISTS remarks TEXT;

-- 4. Enhance route_expenses table
ALTER TABLE public.route_expenses
  ADD COLUMN IF NOT EXISTS dispatch_id UUID REFERENCES public.driver_load_dispatches(id) ON DELETE SET NULL;

-- 5. Atomic Procedure to Start a Route
CREATE OR REPLACE FUNCTION public.start_driver_route(
  p_dispatch JSONB,
  p_items JSONB
) RETURNS JSONB AS $$
DECLARE
  v_dispatch_id UUID;
  v_dispatch_number TEXT;
  v_driver_id UUID;
  v_item JSONB;
  v_prod_id UUID;
  v_qty NUMERIC;
  v_rate NUMERIC;
  v_amount NUMERIC;
  v_total_qty NUMERIC := 0;
  v_total_val NUMERIC := 0;
  v_curr_stock INTEGER;
  v_result JSONB;
BEGIN
  v_driver_id := (p_dispatch->>'driver_id')::UUID;
  IF v_driver_id IS NULL THEN
    RAISE EXCEPTION 'Driver ID is required to start a route';
  END IF;

  v_dispatch_number := COALESCE(
    p_dispatch->>'dispatch_number',
    'RK-ROT-' || TO_CHAR(CURRENT_TIMESTAMP, 'YYYYMMDD-HH24MISS') || '-' || LPAD(FLOOR(RANDOM()*1000)::TEXT, 3, '0')
  );

  -- 1. Create load dispatch with status = 'IN_PROGRESS'
  INSERT INTO public.driver_load_dispatches (
    dispatch_number,
    driver_id,
    driver_name,
    vehicle_number,
    route_id,
    route_name,
    dispatch_date,
    start_time,
    start_location,
    destination_areas,
    total_loaded_qty,
    total_load_value,
    status,
    notes,
    created_by
  ) VALUES (
    v_dispatch_number,
    v_driver_id,
    p_dispatch->>'driver_name',
    p_dispatch->>'vehicle_number',
    (p_dispatch->>'route_id')::UUID,
    p_dispatch->>'route_name',
    COALESCE((p_dispatch->>'dispatch_date')::DATE, CURRENT_DATE),
    COALESCE(p_dispatch->>'start_time', TO_CHAR(NOW(), 'HH12:MI AM')),
    COALESCE(p_dispatch->>'start_location', 'Main Factory Plant'),
    p_dispatch->>'destination_areas',
    0,
    0,
    'IN_PROGRESS',
    p_dispatch->>'notes',
    COALESCE(p_dispatch->>'created_by', 'Operations Admin')
  ) RETURNING id INTO v_dispatch_id;

  -- 2. Process Load Line Items & Deduct Inventory exactly once
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_prod_id := NULL;
    IF (v_item->>'product_id') IS NOT NULL AND (v_item->>'product_id') <> '' THEN
      v_prod_id := (v_item->>'product_id')::UUID;
    END IF;

    v_qty := COALESCE((v_item->>'loaded_quantity')::NUMERIC, (v_item->>'loaded_qty')::NUMERIC, 0);
    v_rate := COALESCE((v_item->>'rate')::NUMERIC, (v_item->>'selling_rate')::NUMERIC, 0);
    v_amount := COALESCE((v_item->>'amount')::NUMERIC, v_qty * v_rate);
    v_total_qty := v_total_qty + v_qty;
    v_total_val := v_total_val + v_amount;

    INSERT INTO public.driver_load_items (
      load_dispatch_id,
      product_id,
      product_name,
      unit,
      loaded_quantity,
      rate,
      amount
    ) VALUES (
      v_dispatch_id,
      v_prod_id,
      v_item->>'product_name',
      COALESCE(v_item->>'unit', 'cans'),
      v_qty,
      v_rate,
      v_amount
    );

    -- Decrement stock from warehouse at load issue time
    IF v_prod_id IS NOT NULL THEN
      SELECT stock_quantity INTO v_curr_stock FROM public.products WHERE id = v_prod_id FOR UPDATE;
      IF v_curr_stock IS NOT NULL THEN
        UPDATE public.products 
        SET stock_quantity = GREATEST(0, stock_quantity - v_qty::INT),
            updated_at = NOW()
        WHERE id = v_prod_id;

        INSERT INTO public.stock_transactions (
          product_id,
          transaction_type,
          quantity,
          quantity_before,
          quantity_after,
          reason,
          reference_id,
          reference_type,
          notes
        ) VALUES (
          v_prod_id,
          'out',
          v_qty::INT,
          v_curr_stock,
          GREATEST(0, v_curr_stock - v_qty::INT),
          'Route Load Dispatch Stock Deduction',
          v_dispatch_id,
          'route_load_dispatch',
          'Products loaded for route ' || COALESCE(p_dispatch->>'route_name', v_dispatch_number)
        );
      END IF;
    END IF;
  END LOOP;

  -- 3. Update total loaded quantity and value
  UPDATE public.driver_load_dispatches
  SET total_loaded_qty = v_total_qty,
      total_load_value = v_total_val
  WHERE id = v_dispatch_id;

  -- 4. Update Driver Status to ON_ROUTE
  UPDATE public.drivers
  SET status = 'ON_ROUTE'
  WHERE id = v_driver_id;

  SELECT row_to_json(d.*)::JSONB INTO v_result 
  FROM public.driver_load_dispatches d 
  WHERE d.id = v_dispatch_id;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 6. Atomic Procedure to Finalize Route, Reconcile, and Generate Customer Invoices
CREATE OR REPLACE FUNCTION public.finalize_route_and_generate_bills(
  p_settlement JSONB,
  p_items JSONB,
  p_customer_sales JSONB DEFAULT '[]'::JSONB
) RETURNS JSONB AS $$
DECLARE
  v_settlement_id UUID;
  v_settlement_number TEXT;
  v_load_dispatch_id UUID;
  v_driver_id UUID;
  v_route_id UUID;
  v_item JSONB;
  v_sale JSONB;
  v_sale_line JSONB;
  v_prod_id UUID;
  v_loaded NUMERIC;
  v_sold NUMERIC;
  v_ret_good NUMERIC;
  v_leaked NUMERIC;
  v_rate NUMERIC;
  v_curr_stock INTEGER;
  v_bills_count INT := 0;
  v_bill_id UUID;
  v_inv_no TEXT;
  v_sale_subtotal NUMERIC;
  v_sale_paid NUMERIC;
  v_sale_due NUMERIC;
  v_sale_cash NUMERIC;
  v_sale_upi NUMERIC;
  v_sale_payment_mode TEXT;
  v_sale_payment_status TEXT;
  v_result JSONB;
  v_total_sales_amount NUMERIC := 0;
  v_total_cash_collected NUMERIC := 0;
  v_total_upi_collected NUMERIC := 0;
  v_total_credit_amount NUMERIC := 0;
BEGIN
  v_load_dispatch_id := COALESCE((p_settlement->>'load_dispatch_id')::UUID, (p_settlement->>'dispatch_id')::UUID);
  v_driver_id := (p_settlement->>'driver_id')::UUID;
  v_route_id := (p_settlement->>'route_id')::UUID;

  IF v_load_dispatch_id IS NULL THEN
    RAISE EXCEPTION 'Load Dispatch ID is required to finalize route';
  END IF;

  IF v_driver_id IS NULL THEN
    SELECT driver_id, route_id INTO v_driver_id, v_route_id
    FROM public.driver_load_dispatches
    WHERE id = v_load_dispatch_id;
  END IF;

  -- Idempotency check: strictly reject duplicate finalization
  IF EXISTS (SELECT 1 FROM public.driver_route_settlements WHERE load_dispatch_id = v_load_dispatch_id) THEN
    RAISE EXCEPTION 'Route dispatch % is already settled and finalized!', v_load_dispatch_id;
  END IF;

  v_settlement_number := COALESCE(
    p_settlement->>'settlement_number',
    'RK-SETT-' || TO_CHAR(CURRENT_TIMESTAMP, 'YYYYMMDD-HH24MISS') || '-' || LPAD(FLOOR(RANDOM()*1000)::TEXT, 3, '0')
  );

  -- 1. Insert Master Settlement Record
  INSERT INTO public.driver_route_settlements (
    settlement_number,
    load_dispatch_id,
    driver_id,
    route_id,
    settlement_date,
    total_loaded_qty,
    total_sold_qty,
    total_returned_qty,
    total_leaked_qty,
    unaccounted_qty,
    cash_collected,
    upi_collected,
    credit_sales_amount,
    route_expenses_amount,
    expected_collection,
    actual_collection,
    collection_difference,
    status,
    discrepancy_reason,
    confirmed_by
  ) VALUES (
    v_settlement_number,
    v_load_dispatch_id,
    v_driver_id,
    v_route_id,
    COALESCE((p_settlement->>'settlement_date')::DATE, CURRENT_DATE),
    COALESCE((p_settlement->>'total_loaded_qty')::NUMERIC, 0),
    COALESCE((p_settlement->>'total_sold_qty')::NUMERIC, 0),
    COALESCE((p_settlement->>'total_returned_qty')::NUMERIC, 0),
    COALESCE((p_settlement->>'total_leaked_qty')::NUMERIC, 0),
    COALESCE((p_settlement->>'unaccounted_qty')::NUMERIC, 0),
    COALESCE((p_settlement->>'cash_collected')::NUMERIC, 0),
    COALESCE((p_settlement->>'upi_collected')::NUMERIC, 0),
    COALESCE((p_settlement->>'credit_sales_amount')::NUMERIC, 0),
    COALESCE((p_settlement->>'route_expenses_amount')::NUMERIC, 0),
    COALESCE((p_settlement->>'expected_collection')::NUMERIC, 0),
    COALESCE((p_settlement->>'actual_collection')::NUMERIC, 0),
    COALESCE((p_settlement->>'collection_difference')::NUMERIC, 0),
    'COMPLETED',
    p_settlement->>'discrepancy_reason',
    COALESCE(p_settlement->>'confirmed_by', 'Operations Admin')
  ) RETURNING id INTO v_settlement_id;

  -- 2. Process Settlement Line Items & Reconcile Physical Goods
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_prod_id := NULL;
    IF (v_item->>'product_id') IS NOT NULL AND (v_item->>'product_id') <> '' THEN
      v_prod_id := (v_item->>'product_id')::UUID;
    END IF;

    v_loaded := (v_item->>'loaded_qty')::NUMERIC;
    v_sold := (v_item->>'sold_qty')::NUMERIC;
    v_ret_good := COALESCE((v_item->>'returned_good_qty')::NUMERIC, 0);
    v_leaked := COALESCE((v_item->>'leaked_damaged_qty')::NUMERIC, 0);
    v_rate := (v_item->>'rate')::NUMERIC;

    INSERT INTO public.driver_route_settlement_items (
      settlement_id,
      product_id,
      product_name,
      loaded_qty,
      sold_qty,
      returned_good_qty,
      leaked_damaged_qty,
      rate,
      sold_amount,
      condition
    ) VALUES (
      v_settlement_id,
      v_prod_id,
      v_item->>'product_name',
      v_loaded,
      v_sold,
      v_ret_good,
      v_leaked,
      v_rate,
      v_sold * v_rate,
      COALESCE(v_item->>'condition', 'good')
    );

    -- (A) Check back GOOD returned items into warehouse stock
    IF v_prod_id IS NOT NULL AND v_ret_good > 0 THEN
      SELECT stock_quantity INTO v_curr_stock FROM public.products WHERE id = v_prod_id FOR UPDATE;
      IF v_curr_stock IS NOT NULL THEN
        UPDATE public.products 
        SET stock_quantity = stock_quantity + v_ret_good::INT,
            updated_at = NOW()
        WHERE id = v_prod_id;

        INSERT INTO public.stock_transactions (
          product_id,
          transaction_type,
          quantity,
          quantity_before,
          quantity_after,
          reason,
          reference_id,
          reference_type,
          notes
        ) VALUES (
          v_prod_id,
          'in',
          v_ret_good::INT,
          v_curr_stock,
          v_curr_stock + v_ret_good::INT,
          'Route Return (Good Unsold Goods Checked-In)',
          v_settlement_id,
          'route_settlement_return',
          'Returned unsold products from route ' || v_settlement_number
        );
      END IF;
    END IF;

    -- (B) Record LEAKED/DAMAGED items in leakages
    IF v_prod_id IS NOT NULL AND v_leaked > 0 THEN
      INSERT INTO public.leakages (
        date,
        product_id,
        quantity,
        source,
        financial_loss,
        notes,
        created_at
      ) VALUES (
        COALESCE((p_settlement->>'settlement_date')::DATE, CURRENT_DATE),
        v_prod_id,
        v_leaked::INT,
        'driver_route',
        v_leaked * v_rate,
        'Route damage/leakage reported during settlement ' || v_settlement_number,
        NOW()
      );
    END IF;
  END LOOP;

  -- 3. Generate Official Customer Bills in bills AND bill_items
  FOR v_sale IN SELECT * FROM jsonb_array_elements(p_customer_sales)
  LOOP
    v_sale_subtotal := COALESCE((v_sale->>'total_amount')::NUMERIC, 0);
    v_sale_paid := COALESCE((v_sale->>'paid_amount')::NUMERIC, 0);
    v_sale_cash := COALESCE((v_sale->>'cash_paid')::NUMERIC, 0);
    v_sale_upi := COALESCE((v_sale->>'upi_paid')::NUMERIC, 0);
    v_sale_due := GREATEST(0, v_sale_subtotal - v_sale_paid);

    v_total_sales_amount := v_total_sales_amount + v_sale_subtotal;
    v_total_cash_collected := v_total_cash_collected + v_sale_cash;
    v_total_upi_collected := v_total_upi_collected + v_sale_upi;
    v_total_credit_amount := v_total_credit_amount + v_sale_due;

    v_sale_payment_mode := CASE 
      WHEN v_sale_paid >= v_sale_subtotal THEN 
        CASE WHEN v_sale_cash > 0 AND v_sale_upi > 0 THEN 'mixed'
             WHEN v_sale_cash > 0 THEN 'cash'
             ELSE 'upi' END
      WHEN v_sale_paid > 0 THEN 'partial'
      ELSE 'credit'
    END;

    v_sale_payment_status := CASE 
      WHEN v_sale_due <= 0 THEN 'paid'
      WHEN v_sale_paid > 0 THEN 'partial'
      ELSE 'due'
    END;

    v_inv_no := 'RK-ROTBILL-' || TO_CHAR(CURRENT_TIMESTAMP, 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM()*10000)::TEXT, 4, '0');

    -- Insert Master Customer Bill
    INSERT INTO public.bills (
      invoice_number,
      bill_type,
      customer_name,
      customer_phone,
      driver_id,
      route_id,
      dispatch_id,
      date,
      subtotal,
      total_amount,
      grand_total,
      paid_amount,
      due_amount,
      cash_amount,
      upi_amount,
      payment_method,
      payment_mode,
      payment_status,
      items_count,
      notes,
      created_by
    ) VALUES (
      v_inv_no,
      'route_customer_invoice',
      v_sale->>'customer_name',
      v_sale->>'customer_phone',
      v_driver_id,
      v_route_id,
      v_load_dispatch_id,
      COALESCE((p_settlement->>'settlement_date')::DATE, CURRENT_DATE),
      v_sale_subtotal,
      v_sale_subtotal,
      v_sale_subtotal,
      v_sale_paid,
      v_sale_due,
      v_sale_cash,
      v_sale_upi,
      v_sale_payment_mode,
      v_sale_payment_mode,
      v_sale_payment_status,
      1,
      'Customer Bill generated from route ' || v_settlement_number,
      'Route Settlement Engine'
    ) RETURNING id INTO v_bill_id;

    -- Insert into bill_items so printable PDF and WhatsApp detail are complete
    INSERT INTO public.bill_items (
      bill_id,
      product_name,
      quantity,
      unit,
      rate,
      amount,
      total
    ) VALUES (
      v_bill_id,
      COALESCE(v_sale->>'product_name', 'Water Can 20L'),
      COALESCE((v_sale->>'quantity')::NUMERIC, 1)::INT,
      COALESCE(v_sale->>'unit', 'cans'),
      COALESCE((v_sale->>'rate')::NUMERIC, v_sale_subtotal),
      v_sale_subtotal,
      v_sale_subtotal
    );

    -- Update route_sales linking bill_id
    IF (v_sale->>'id') IS NOT NULL THEN
      UPDATE public.route_sales
      SET bill_id = v_bill_id
      WHERE id = (v_sale->>'id')::UUID;
    END IF;

    -- If customer has due balance, record in customer_dues
    IF v_sale_due > 0 AND (v_sale->>'customer_name') IS NOT NULL THEN
      INSERT INTO public.customer_dues (
        customer_name,
        customer_phone,
        route_id,
        driver_id,
        due_amount,
        total_amount,
        paid_amount,
        bill_id,
        invoice_number,
        status,
        last_updated
      ) VALUES (
        v_sale->>'customer_name',
        v_sale->>'customer_phone',
        v_route_id,
        v_driver_id,
        v_sale_due,
        v_sale_subtotal,
        v_sale_paid,
        v_bill_id,
        v_inv_no,
        'unpaid',
        NOW()
      );
    END IF;

    v_bills_count := v_bills_count + 1;
  END LOOP;

  -- 4. Record Route Expenses in expenses table
  IF COALESCE((p_settlement->>'route_expenses_amount')::NUMERIC, 0) > 0 THEN
    INSERT INTO public.expenses (
      amount,
      category_name,
      payment_mode,
      description,
      expense_date,
      date
    ) VALUES (
      (p_settlement->>'route_expenses_amount')::NUMERIC,
      'Driver Route Expenses',
      'cash',
      'Route fuel & expenses for settlement ' || v_settlement_number,
      COALESCE((p_settlement->>'settlement_date')::DATE, CURRENT_DATE),
      COALESCE((p_settlement->>'settlement_date')::DATE, CURRENT_DATE)
    );
  END IF;

  -- 5. Update Load Dispatch status to COMPLETED
  UPDATE public.driver_load_dispatches
  SET status = 'COMPLETED',
      end_time = COALESCE(p_settlement->>'end_time', TO_CHAR(NOW(), 'HH12:MI AM')),
      total_sold_qty = COALESCE((p_settlement->>'total_sold_qty')::NUMERIC, 0),
      total_returned_qty = COALESCE((p_settlement->>'total_returned_qty')::NUMERIC, 0),
      total_leaked_qty = COALESCE((p_settlement->>'total_leaked_qty')::NUMERIC, 0),
      unaccounted_qty = COALESCE((p_settlement->>'unaccounted_qty')::NUMERIC, 0),
      total_sales_amount = v_total_sales_amount,
      cash_collected = v_total_cash_collected,
      upi_collected = v_total_upi_collected,
      credit_amount = v_total_credit_amount,
      expenses_amount = COALESCE((p_settlement->>'route_expenses_amount')::NUMERIC, 0),
      bills_generated = TRUE,
      bills_count = v_bills_count,
      updated_at = NOW()
  WHERE id = v_load_dispatch_id;

  -- 6. Update Driver Status to AVAILABLE & Increment performance stats
  UPDATE public.drivers
  SET status = 'AVAILABLE',
      total_completed_routes = COALESCE(total_completed_routes, 0) + 1,
      total_sales = COALESCE(total_sales, 0) + v_total_sales_amount,
      total_collections = COALESCE(total_collections, 0) + (v_total_cash_collected + v_total_upi_collected)
  WHERE id = v_driver_id;

  -- 7. Update Settlement record with final bills count
  UPDATE public.driver_route_settlements
  SET bills_generated_count = v_bills_count
  WHERE id = v_settlement_id;

  SELECT row_to_json(s.*)::JSONB INTO v_result 
  FROM public.driver_route_settlements s 
  WHERE s.id = v_settlement_id;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
