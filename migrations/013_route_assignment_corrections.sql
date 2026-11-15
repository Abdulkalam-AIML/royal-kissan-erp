-- ============================================================================
-- MIGRATION 013: ROUTE ASSIGNMENT FORM CORRECTIONS & STORED PROCEDURES
-- 1. Route Name Mandatory from saved routes (public.routes)
-- 2. Vehicle Number Optional (nullable, no fake vehicle numbers)
-- 3. Edit Route Procedure for active dispatches
-- ============================================================================

-- Step 1: Ensure standard delivery routes exist in public.routes
INSERT INTO public.routes (name, area, is_active)
VALUES
  ('Chintalapudi Route', 'Chintalapudi', true),
  ('Local Route', 'Local Factory & Town', true),
  ('Raghavapuram Route', 'Raghavapuram', true),
  ('Mukkinavarigudem Route', 'Mukkinavarigudem', true),
  ('Dammapeta Route', 'Dammapeta', true),
  ('Koyyalagudem Route', 'Koyyalagudem', true),
  ('Jangareddygudem Route', 'Jangareddygudem', true)
ON CONFLICT (name) DO UPDATE SET is_active = true;

-- Step 2: Update start_driver_route stored procedure
CREATE OR REPLACE FUNCTION public.start_driver_route(p_dispatch jsonb, p_items jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_dispatch_id UUID;
  v_dispatch_number TEXT;
  v_driver_id UUID;
  v_driver_name TEXT;
  v_route_id UUID;
  v_route_name TEXT;
  v_default_area TEXT;
  v_item JSONB;
  v_prod_id UUID;
  v_qty NUMERIC;
  v_rate NUMERIC;
  v_amount NUMERIC;
  v_total_qty NUMERIC := 0;
  v_total_val NUMERIC := 0;
  v_curr_stock INTEGER;
  v_item_ids UUID[] := ARRAY[]::UUID[];
  v_item_id UUID;
  v_result JSONB;
  v_vehicle_id UUID := NULL;
  v_vehicle_number TEXT := NULL;
  v_vehicle_status TEXT;
BEGIN
  -- 1. Validate Driver
  v_driver_id := (p_dispatch->>'driver_id')::UUID;
  v_driver_name := p_dispatch->>'driver_name';

  IF v_driver_id IS NULL THEN
    RAISE EXCEPTION 'Driver ID is required to start a route';
  END IF;

  IF v_driver_name IS NULL OR TRIM(v_driver_name) = '' THEN
    SELECT name INTO v_driver_name FROM public.drivers WHERE id = v_driver_id;
  END IF;

  -- 2. Validate Route Name from Saved Routes (MANDATORY)
  IF (p_dispatch->>'route_id') IS NOT NULL AND (p_dispatch->>'route_id') <> '' AND (p_dispatch->>'route_id') <> 'null' THEN
    v_route_id := (p_dispatch->>'route_id')::UUID;
    SELECT name, area INTO v_route_name, v_default_area FROM public.routes WHERE id = v_route_id;
    IF v_route_name IS NULL THEN
      RAISE EXCEPTION 'Selected route ID % does not exist in saved routes list', v_route_id;
    END IF;
  ELSIF (p_dispatch->>'route_name') IS NOT NULL AND (p_dispatch->>'route_name') <> '' THEN
    SELECT id, name, area INTO v_route_id, v_route_name, v_default_area 
    FROM public.routes 
    WHERE name ILIKE TRIM(p_dispatch->>'route_name') LIMIT 1;
    
    IF v_route_id IS NULL THEN
      RAISE EXCEPTION 'Route "%" is not in the saved routes list. Route Name must be selected from saved routes.', p_dispatch->>'route_name';
    END IF;
  ELSE
    RAISE EXCEPTION 'Route Name is mandatory and must be selected from the saved routes list';
  END IF;

  -- 3. Vehicle selection (OPTIONAL)
  IF (p_dispatch->>'vehicle_id') IS NOT NULL 
    AND (p_dispatch->>'vehicle_id') <> '' 
    AND (p_dispatch->>'vehicle_id') <> 'null' THEN
    v_vehicle_id := (p_dispatch->>'vehicle_id')::UUID;
    SELECT registration_number, status INTO v_vehicle_number, v_vehicle_status 
    FROM public.vehicles WHERE id = v_vehicle_id;
  ELSIF (p_dispatch->>'vehicle_number') IS NOT NULL 
    AND (p_dispatch->>'vehicle_number') <> '' 
    AND (p_dispatch->>'vehicle_number') <> 'Not Assigned'
    AND (p_dispatch->>'vehicle_number') <> 'null' THEN
    SELECT id, registration_number, status INTO v_vehicle_id, v_vehicle_number, v_vehicle_status 
    FROM public.vehicles WHERE registration_number ILIKE TRIM(p_dispatch->>'vehicle_number') LIMIT 1;
    IF v_vehicle_number IS NULL THEN
      v_vehicle_number := TRIM(p_dispatch->>'vehicle_number');
    END IF;
  ELSE
    v_vehicle_id := NULL;
    v_vehicle_number := NULL;
  END IF;

  -- If vehicle was selected, ensure it's not under maintenance or inactive
  IF v_vehicle_status IN ('MAINTENANCE', 'INACTIVE') THEN
    RAISE EXCEPTION 'Selected vehicle % is currently under % and cannot be dispatched', v_vehicle_number, v_vehicle_status;
  END IF;

  v_dispatch_number := COALESCE(
    p_dispatch->>'dispatch_number',
    'RK-ROT-' || TO_CHAR(CURRENT_TIMESTAMP, 'YYYYMMDD-HH24MISS') || '-' || LPAD(FLOOR(RANDOM()*1000)::TEXT, 3, '0')
  );

  -- 4. Create Dispatch Header
  INSERT INTO public.driver_load_dispatches (
    dispatch_number,
    driver_id,
    driver_name,
    vehicle_id,
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
    v_driver_name,
    v_vehicle_id,
    v_vehicle_number,
    v_route_id,
    v_route_name,
    COALESCE((p_dispatch->>'dispatch_date')::DATE, CURRENT_DATE),
    COALESCE(p_dispatch->>'start_time', TO_CHAR(CURRENT_TIMESTAMP, 'HH12:MI AM')),
    COALESCE(p_dispatch->>'start_location', 'Main Factory Warehouse'),
    COALESCE(NULLIF(TRIM(p_dispatch->>'destination_areas'), ''), v_default_area),
    COALESCE((p_dispatch->>'total_loaded_qty')::NUMERIC, 0),
    COALESCE((p_dispatch->>'total_load_value')::NUMERIC, 0),
    'IN_PROGRESS',
    p_dispatch->>'notes',
    COALESCE(p_dispatch->>'created_by', 'Admin')
  ) RETURNING id INTO v_dispatch_id;

  -- 5. Insert Load Items and deduct stock
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
    ) RETURNING id INTO v_item_id;

    v_item_ids := array_append(v_item_ids, v_item_id);

    IF v_prod_id IS NOT NULL AND v_qty > 0 THEN
      SELECT stock_quantity INTO v_curr_stock FROM public.products WHERE id = v_prod_id;
      IF v_curr_stock IS NOT NULL THEN
        UPDATE public.products
        SET stock_quantity = GREATEST(0, v_curr_stock - v_qty::INT),
            updated_at = NOW()
        WHERE id = v_prod_id;

        INSERT INTO public.stock_transactions (
          product_id,
          transaction_type,
          quantity,
          quantity_before,
          quantity_after,
          reference_id,
          reference_type,
          reason,
          notes
        ) VALUES (
          v_prod_id,
          'dispatch',
          v_qty::INT,
          v_curr_stock,
          GREATEST(0, v_curr_stock - v_qty::INT),
          v_dispatch_id,
          'driver_load_dispatch',
          'Route load stock deduction',
          'Route load: ' || v_dispatch_number
        );
      END IF;
    END IF;
  END LOOP;

  UPDATE public.driver_load_dispatches
  SET total_loaded_qty = v_total_qty,
      total_load_value = v_total_val,
      updated_at = NOW()
  WHERE id = v_dispatch_id;

  -- 6. Update Driver Status to ON_ROUTE
  UPDATE public.drivers
  SET status = 'ON_ROUTE',
      updated_at = NOW()
  WHERE id = v_driver_id;

  -- 7. If vehicle is assigned, mark vehicle as IN_USE
  IF v_vehicle_id IS NOT NULL THEN
    UPDATE public.vehicles
    SET status = 'IN_USE', assigned_driver_id = v_driver_id, assigned_driver_name = v_driver_name, updated_at = NOW()
    WHERE id = v_vehicle_id;
  ELSIF v_vehicle_number IS NOT NULL AND v_vehicle_number <> '' AND v_vehicle_number <> 'Not Assigned' THEN
    UPDATE public.vehicles
    SET status = 'IN_USE', assigned_driver_id = v_driver_id, assigned_driver_name = v_driver_name, updated_at = NOW()
    WHERE registration_number ILIKE v_vehicle_number;
  END IF;

  v_result := jsonb_build_object(
    'dispatch_id', v_dispatch_id,
    'dispatch_number', v_dispatch_number,
    'route_id', v_route_id,
    'route_name', v_route_name,
    'driver_id', v_driver_id,
    'driver_name', v_driver_name,
    'vehicle_id', v_vehicle_id,
    'vehicle_number', v_vehicle_number,
    'total_loaded_qty', v_total_qty,
    'total_load_value', v_total_val,
    'status', 'IN_PROGRESS',
    'item_ids', v_item_ids
  );

  RETURN v_result;
END;
$function$;

-- Step 3: Create update_driver_route procedure for Edit Route workflow
CREATE OR REPLACE FUNCTION public.update_driver_route(p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_dispatch_id UUID;
  v_route_id UUID;
  v_route_name TEXT;
  v_default_area TEXT;
  v_driver_id UUID;
  v_driver_name TEXT;
  v_old_vehicle_id UUID;
  v_old_vehicle_num TEXT;
  v_new_vehicle_id UUID := NULL;
  v_new_vehicle_num TEXT := NULL;
  v_vehicle_status TEXT;
  v_current_status TEXT;
BEGIN
  v_dispatch_id := (p_payload->>'dispatch_id')::UUID;
  IF v_dispatch_id IS NULL THEN
    RAISE EXCEPTION 'Dispatch ID is required to update route';
  END IF;

  SELECT status, vehicle_id, vehicle_number, driver_id, driver_name
  INTO v_current_status, v_old_vehicle_id, v_old_vehicle_num, v_driver_id, v_driver_name
  FROM public.driver_load_dispatches
  WHERE id = v_dispatch_id;

  IF v_current_status IN ('COMPLETED', 'SETTLED', 'CANCELLED') THEN
    RAISE EXCEPTION 'Cannot edit route % because it is already %', v_dispatch_id, v_current_status;
  END IF;

  -- 1. Validate Route Name from Saved Routes (MANDATORY)
  IF (p_payload->>'route_id') IS NOT NULL AND (p_payload->>'route_id') <> '' AND (p_payload->>'route_id') <> 'null' THEN
    v_route_id := (p_payload->>'route_id')::UUID;
    SELECT name, area INTO v_route_name, v_default_area FROM public.routes WHERE id = v_route_id;
    IF v_route_name IS NULL THEN
      RAISE EXCEPTION 'Selected route ID % does not exist in saved routes list', v_route_id;
    END IF;
  ELSIF (p_payload->>'route_name') IS NOT NULL AND (p_payload->>'route_name') <> '' THEN
    SELECT id, name, area INTO v_route_id, v_route_name, v_default_area 
    FROM public.routes 
    WHERE name ILIKE TRIM(p_payload->>'route_name') LIMIT 1;
    IF v_route_id IS NULL THEN
      RAISE EXCEPTION 'Route "%" is not in the saved routes list. Route Name must be selected from saved routes.', p_payload->>'route_name';
    END IF;
  ELSE
    RAISE EXCEPTION 'Route Name selection from saved routes list is mandatory';
  END IF;

  -- 2. Update Driver if provided
  IF (p_payload->>'driver_id') IS NOT NULL AND (p_payload->>'driver_id') <> '' THEN
    v_driver_id := (p_payload->>'driver_id')::UUID;
    SELECT name INTO v_driver_name FROM public.drivers WHERE id = v_driver_id;
  END IF;

  -- 3. Vehicle selection (OPTIONAL)
  IF (p_payload->>'vehicle_id') IS NOT NULL 
    AND (p_payload->>'vehicle_id') <> '' 
    AND (p_payload->>'vehicle_id') <> 'null' THEN
    v_new_vehicle_id := (p_payload->>'vehicle_id')::UUID;
    SELECT registration_number, status INTO v_new_vehicle_num, v_vehicle_status 
    FROM public.vehicles WHERE id = v_new_vehicle_id;
  ELSIF (p_payload->>'vehicle_number') IS NOT NULL 
    AND (p_payload->>'vehicle_number') <> '' 
    AND (p_payload->>'vehicle_number') <> 'Not Assigned'
    AND (p_payload->>'vehicle_number') <> 'null' THEN
    SELECT id, registration_number, status INTO v_new_vehicle_id, v_new_vehicle_num, v_vehicle_status 
    FROM public.vehicles WHERE registration_number ILIKE TRIM(p_payload->>'vehicle_number') LIMIT 1;
    IF v_new_vehicle_num IS NULL THEN
      v_new_vehicle_num := TRIM(p_payload->>'vehicle_number');
    END IF;
  ELSE
    v_new_vehicle_id := NULL;
    v_new_vehicle_num := NULL;
  END IF;

  -- If a new vehicle is selected, check it is not in maintenance
  IF v_new_vehicle_id IS NOT NULL AND (v_old_vehicle_id IS NULL OR v_old_vehicle_id <> v_new_vehicle_id) THEN
    IF v_vehicle_status IN ('MAINTENANCE', 'INACTIVE') THEN
      RAISE EXCEPTION 'Vehicle % is currently under % and cannot be assigned', v_new_vehicle_num, v_vehicle_status;
    END IF;
  END IF;

  -- Release old vehicle if vehicle was changed or removed
  IF v_old_vehicle_id IS NOT NULL AND (v_new_vehicle_id IS NULL OR v_new_vehicle_id <> v_old_vehicle_id) THEN
    UPDATE public.vehicles
    SET status = 'AVAILABLE', assigned_driver_id = NULL, assigned_driver_name = NULL, updated_at = NOW()
    WHERE id = v_old_vehicle_id;
  ELSIF v_old_vehicle_num IS NOT NULL AND v_old_vehicle_num <> '' AND (v_new_vehicle_num IS NULL OR v_new_vehicle_num <> v_old_vehicle_num) THEN
    UPDATE public.vehicles
    SET status = 'AVAILABLE', assigned_driver_id = NULL, assigned_driver_name = NULL, updated_at = NOW()
    WHERE registration_number ILIKE v_old_vehicle_num;
  END IF;

  -- Mark new vehicle IN_USE if one was assigned
  IF v_new_vehicle_id IS NOT NULL THEN
    UPDATE public.vehicles
    SET status = 'IN_USE', assigned_driver_id = v_driver_id, assigned_driver_name = v_driver_name, updated_at = NOW()
    WHERE id = v_new_vehicle_id;
  END IF;

  -- Update the dispatch record
  UPDATE public.driver_load_dispatches
  SET route_id = v_route_id,
      route_name = v_route_name,
      driver_id = COALESCE(v_driver_id, driver_id),
      driver_name = COALESCE(v_driver_name, driver_name),
      vehicle_id = v_new_vehicle_id,
      vehicle_number = v_new_vehicle_num,
      dispatch_date = COALESCE((p_payload->>'dispatch_date')::DATE, dispatch_date),
      start_time = COALESCE(p_payload->>'start_time', start_time),
      start_location = COALESCE(p_payload->>'start_location', start_location),
      destination_areas = COALESCE(NULLIF(TRIM(p_payload->>'destination_areas'), ''), destination_areas),
      notes = COALESCE(p_payload->>'notes', notes),
      updated_at = NOW()
  WHERE id = v_dispatch_id;

  RETURN jsonb_build_object(
    'success', true,
    'dispatch_id', v_dispatch_id,
    'route_id', v_route_id,
    'route_name', v_route_name,
    'driver_id', v_driver_id,
    'driver_name', v_driver_name,
    'vehicle_id', v_new_vehicle_id,
    'vehicle_number', v_new_vehicle_num
  );
END;
$function$;

-- Step 4: Ensure finalize_route_and_generate_bills safely releases vehicle
CREATE OR REPLACE FUNCTION public.finalize_route_and_generate_bills(p_settlement jsonb, p_items jsonb, p_customer_sales jsonb DEFAULT '[]'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_settlement_id UUID;
  v_settlement_number TEXT;
  v_load_dispatch_id UUID;
  v_driver_id UUID;
  v_route_id UUID;
  v_vehicle_id UUID;
  v_vehicle_num TEXT;
  v_item JSONB;
  v_sale JSONB;
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

  SELECT driver_id, route_id, vehicle_id, vehicle_number 
  INTO v_driver_id, v_route_id, v_vehicle_id, v_vehicle_num
  FROM public.driver_load_dispatches
  WHERE id = v_load_dispatch_id;

  -- Idempotency check: strictly reject duplicate finalization
  IF EXISTS (SELECT 1 FROM public.driver_route_settlements WHERE load_dispatch_id = v_load_dispatch_id) THEN
    RAISE EXCEPTION 'Route dispatch % is already settled and finalized!', v_load_dispatch_id;
  END IF;

  v_settlement_number := COALESCE(
    p_settlement->>'settlement_number',
    'RK-SETT-' || TO_CHAR(CURRENT_TIMESTAMP, 'YYYYMMDD-HH24MISS') || '-' || LPAD(FLOOR(RANDOM()*1000)::TEXT, 3, '0')
  );

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
    COALESCE((p_settlement->>'credit_amount')::NUMERIC, (p_settlement->>'credit_sales_amount')::NUMERIC, 0),
    COALESCE((p_settlement->>'expenses_amount')::NUMERIC, (p_settlement->>'route_expenses_amount')::NUMERIC, 0),
    COALESCE((p_settlement->>'expected_collection')::NUMERIC, 0),
    COALESCE((p_settlement->>'actual_collection')::NUMERIC, 0),
    COALESCE((p_settlement->>'collection_difference')::NUMERIC, 0),
    'COMPLETED',
    COALESCE(p_settlement->>'settlement_notes', p_settlement->>'discrepancy_reason'),
    COALESCE(p_settlement->>'confirmed_by', 'Operations Admin')
  ) RETURNING id INTO v_settlement_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_prod_id := NULL;
    IF (v_item->>'product_id') IS NOT NULL AND (v_item->>'product_id') <> '' THEN
      v_prod_id := (v_item->>'product_id')::UUID;
    END IF;

    v_loaded := COALESCE((v_item->>'loaded_qty')::NUMERIC, (v_item->>'loaded_quantity')::NUMERIC, 0);
    v_sold := COALESCE((v_item->>'sold_qty')::NUMERIC, (v_item->>'sold_quantity')::NUMERIC, 0);
    v_ret_good := COALESCE((v_item->>'returned_good_qty')::NUMERIC, (v_item->>'returned_qty')::NUMERIC, 0);
    v_leaked := COALESCE((v_item->>'leaked_damaged_qty')::NUMERIC, (v_item->>'leaked_qty')::NUMERIC, 0);
    v_rate := COALESCE((v_item->>'rate')::NUMERIC, (v_item->>'selling_rate')::NUMERIC, 0);

    INSERT INTO public.driver_route_settlement_items (
      settlement_id,
      product_id,
      product_name,
      loaded_quantity,
      sold_quantity,
      returned_quantity,
      leaked_quantity,
      unit_rate
    ) VALUES (
      v_settlement_id,
      v_prod_id,
      v_item->>'product_name',
      v_loaded,
      v_sold,
      v_ret_good,
      v_leaked,
      v_rate
    );

    UPDATE public.driver_load_items
    SET sold_quantity = v_sold,
        returned_quantity = v_ret_good,
        leaked_quantity = v_leaked
    WHERE load_dispatch_id = v_load_dispatch_id
      AND product_name = (v_item->>'product_name');

    -- Restore good returned stock to warehouse
    IF v_prod_id IS NOT NULL AND v_ret_good > 0 THEN
      SELECT stock_quantity INTO v_curr_stock FROM public.products WHERE id = v_prod_id;
      IF v_curr_stock IS NOT NULL THEN
        UPDATE public.products
        SET stock_quantity = v_curr_stock + v_ret_good::INT,
            updated_at = NOW()
        WHERE id = v_prod_id;

        INSERT INTO public.stock_transactions (
          product_id,
          transaction_type,
          quantity,
          quantity_before,
          quantity_after,
          reference_id,
          reference_type,
          reason,
          notes
        ) VALUES (
          v_prod_id,
          'return',
          v_ret_good::INT,
          v_curr_stock,
          v_curr_stock + v_ret_good::INT,
          v_load_dispatch_id,
          'driver_load_dispatch',
          'Good Route Stock Return',
          'Route returned stock: ' || v_settlement_number
        );
      END IF;
    END IF;

    -- Record route damages/leakage
    IF v_leaked > 0 THEN
      INSERT INTO public.leakages (
        date,
        product_id,
        quantity,
        source,
        financial_loss,
        recovered_amount,
        driver_id,
        route_id,
        notes
      ) VALUES (
        COALESCE((p_settlement->>'settlement_date')::DATE, CURRENT_DATE),
        v_prod_id,
        v_leaked::INT,
        'route',
        v_leaked * v_rate,
        0,
        v_driver_id,
        v_route_id,
        'Route damage logged in settlement ' || v_settlement_number || ': ' || COALESCE(v_item->>'product_name', 'Goods')
      );
    END IF;
  END LOOP;

  -- Generate Customer Bills
  FOR v_sale IN SELECT * FROM jsonb_array_elements(p_customer_sales)
  LOOP
    v_inv_no := 'RK-INV-' || TO_CHAR(CURRENT_TIMESTAMP, 'YYYYMMDD-HH24MISS') || '-' || LPAD((v_bills_count + 1)::TEXT, 3, '0');
    v_sale_subtotal := COALESCE((v_sale->>'total_amount')::NUMERIC, (COALESCE((v_sale->>'quantity')::NUMERIC, 1) * COALESCE((v_sale->>'rate')::NUMERIC, 0)));
    v_sale_cash := COALESCE((v_sale->>'cash_paid')::NUMERIC, 0);
    v_sale_upi := COALESCE((v_sale->>'upi_paid')::NUMERIC, 0);
    v_sale_paid := v_sale_cash + v_sale_upi;
    v_sale_due := COALESCE((v_sale->>'due_amount')::NUMERIC, GREATEST(0, v_sale_subtotal - v_sale_paid));
    v_sale_payment_mode := LOWER(COALESCE(v_sale->>'payment_type', 'cash'));
    
    IF v_sale_due <= 0 THEN
      v_sale_payment_status := 'PAID';
    ELSIF v_sale_paid > 0 THEN
      v_sale_payment_status := 'PARTIAL';
    ELSE
      v_sale_payment_status := 'PENDING';
    END IF;

    INSERT INTO public.bills (
      invoice_number,
      customer_name,
      customer_phone,
      subtotal,
      discount_amount,
      gst_amount,
      total_amount,
      grand_total,
      paid_amount,
      due_amount,
      payment_method,
      payment_mode,
      payment_status,
      date,
      driver_id,
      route_id,
      dispatch_id,
      notes
    ) VALUES (
      v_inv_no,
      COALESCE(v_sale->>'customer_name', 'Walk-in Route Customer'),
      v_sale->>'customer_phone',
      v_sale_subtotal,
      COALESCE((v_sale->>'discount')::NUMERIC, 0),
      COALESCE((v_sale->>'gst_amount')::NUMERIC, 0),
      v_sale_subtotal,
      v_sale_subtotal,
      v_sale_paid,
      v_sale_due,
      v_sale_payment_mode,
      v_sale_payment_mode,
      v_sale_payment_status,
      COALESCE((p_settlement->>'settlement_date')::DATE, CURRENT_DATE),
      v_driver_id,
      v_route_id,
      v_load_dispatch_id,
      'Route delivery bill: ' || v_settlement_number || ' - ' || COALESCE(v_sale->>'remarks', '')
    ) RETURNING id INTO v_bill_id;

    v_prod_id := NULL;
    IF (v_sale->>'product_id') IS NOT NULL AND (v_sale->>'product_id') <> '' THEN
      v_prod_id := (v_sale->>'product_id')::UUID;
    END IF;

    INSERT INTO public.bill_items (
      bill_id,
      product_id,
      product_name,
      unit,
      quantity,
      rate,
      amount,
      total
    ) VALUES (
      v_bill_id,
      v_prod_id,
      COALESCE(v_sale->>'product_name', 'Water Goods'),
      COALESCE(v_sale->>'unit', 'cans'),
      COALESCE((v_sale->>'quantity')::INT, 1),
      COALESCE((v_sale->>'rate')::NUMERIC, v_sale_subtotal),
      v_sale_subtotal,
      v_sale_subtotal
    );

    IF v_sale_due > 0 THEN
      INSERT INTO public.customer_dues (
        customer_name,
        customer_phone,
        total_amount,
        paid_amount,
        due_amount,
        bill_id,
        invoice_number,
        status,
        last_updated
      ) VALUES (
        COALESCE(v_sale->>'customer_name', 'Route Customer'),
        v_sale->>'customer_phone',
        v_sale_subtotal,
        v_sale_paid,
        v_sale_due,
        v_bill_id,
        v_inv_no,
        'PENDING',
        NOW()
      );
    END IF;

    v_bills_count := v_bills_count + 1;
    v_total_sales_amount := v_total_sales_amount + v_sale_subtotal;
    IF v_sale_payment_mode = 'cash' THEN
      v_total_cash_collected := v_total_cash_collected + v_sale_paid;
    ELSIF v_sale_payment_mode = 'upi' THEN
      v_total_upi_collected := v_total_upi_collected + v_sale_paid;
    END IF;
    v_total_credit_amount := v_total_credit_amount + v_sale_due;
  END LOOP;

  -- 4. Mark Driver Load Dispatch as COMPLETED
  UPDATE public.driver_load_dispatches
  SET status = 'COMPLETED',
      end_time = COALESCE(p_settlement->>'end_time', TO_CHAR(CURRENT_TIMESTAMP, 'HH12:MI AM')),
      total_sold_qty = COALESCE((p_settlement->>'total_sold_qty')::NUMERIC, 0),
      total_returned_qty = COALESCE((p_settlement->>'total_returned_qty')::NUMERIC, 0),
      total_leaked_qty = COALESCE((p_settlement->>'total_leaked_qty')::NUMERIC, 0),
      unaccounted_qty = COALESCE((p_settlement->>'unaccounted_qty')::NUMERIC, 0),
      total_sales_amount = COALESCE((p_settlement->>'total_sales_amount')::NUMERIC, v_total_sales_amount),
      cash_collected = COALESCE((p_settlement->>'cash_collected')::NUMERIC, v_total_cash_collected),
      upi_collected = COALESCE((p_settlement->>'upi_collected')::NUMERIC, v_total_upi_collected),
      credit_amount = COALESCE((p_settlement->>'credit_amount')::NUMERIC, v_total_credit_amount),
      expenses_amount = COALESCE((p_settlement->>'expenses_amount')::NUMERIC, 0),
      bills_generated = true,
      bills_count = v_bills_count,
      updated_at = NOW()
  WHERE id = v_load_dispatch_id;

  -- 5. Return Driver Status to AVAILABLE
  UPDATE public.drivers
  SET status = 'AVAILABLE',
      total_completed_routes = COALESCE(total_completed_routes, 0) + 1,
      total_sales = COALESCE(total_sales, 0) + v_total_sales_amount,
      total_collections = COALESCE(total_collections, 0) + (v_total_cash_collected + v_total_upi_collected),
      updated_at = NOW()
  WHERE id = v_driver_id;

  -- 6. Safely Return Vehicle Status to AVAILABLE if one was assigned
  IF v_vehicle_id IS NOT NULL THEN
    UPDATE public.vehicles
    SET status = 'AVAILABLE', assigned_driver_id = NULL, assigned_driver_name = NULL, updated_at = NOW()
    WHERE id = v_vehicle_id;
  ELSIF v_vehicle_num IS NOT NULL AND v_vehicle_num <> '' AND v_vehicle_num <> 'Not Assigned' THEN
    UPDATE public.vehicles
    SET status = 'AVAILABLE', assigned_driver_id = NULL, assigned_driver_name = NULL, updated_at = NOW()
    WHERE registration_number ILIKE v_vehicle_num;
  END IF;

  v_result := jsonb_build_object(
    'settlement_id', v_settlement_id,
    'settlement_number', v_settlement_number,
    'load_dispatch_id', v_load_dispatch_id,
    'bills_count', v_bills_count,
    'total_sales_amount', v_total_sales_amount,
    'status', 'COMPLETED'
  );

  RETURN v_result;
END;
$function$;

