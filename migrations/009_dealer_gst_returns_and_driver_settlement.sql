-- ============================================================================
-- MIGRATION 009: DEALER GST, NEXT-DAY RETURNS & DRIVER ROUTE SETTLEMENT
-- Royal Kissan ERP — Enterprise Accounting, GST & Inventory Engine
-- ============================================================================

-- PART 1: Extend dealers table with GST attributes
ALTER TABLE public.dealers 
  ADD COLUMN IF NOT EXISTS is_gst_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS default_gst_rate NUMERIC(5,2) DEFAULT 18.00,
  ADD COLUMN IF NOT EXISTS state_code TEXT DEFAULT '37',
  ADD COLUMN IF NOT EXISTS pan_number TEXT;

-- PART 2: Dealer Dispatches (Load Dispatch Note, distinct from Sales Invoice)
CREATE TABLE IF NOT EXISTS public.dealer_dispatches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispatch_number TEXT NOT NULL UNIQUE,
  dealer_id UUID NOT NULL REFERENCES public.dealers(id) ON DELETE RESTRICT,
  dealer_name TEXT NOT NULL,
  dealer_gstin TEXT,
  is_gst_enabled BOOLEAN NOT NULL DEFAULT false,
  is_interstate BOOLEAN NOT NULL DEFAULT false,
  dispatch_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_quantity NUMERIC(12,2) NOT NULL DEFAULT 0,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  taxable_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  gst_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  gst_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  cgst_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  sgst_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  igst_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_value NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'DISPATCHED', -- 'DISPATCHED', 'PARTIALLY_RETURNED', 'SETTLED', 'CANCELLED'
  responsible_staff TEXT DEFAULT 'Operations Admin',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.dealer_dispatch_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispatch_id UUID NOT NULL REFERENCES public.dealer_dispatches(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'cans',
  quantity NUMERIC(12,2) NOT NULL,
  rate NUMERIC(12,2) NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  returned_quantity NUMERIC(12,2) NOT NULL DEFAULT 0,
  leaked_quantity NUMERIC(12,2) NOT NULL DEFAULT 0,
  accepted_quantity NUMERIC(12,2) NOT NULL DEFAULT 0,
  gst_rate NUMERIC(5,2) DEFAULT 0,
  gst_amount NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- PART 3: Dealer Returns & Leakage Entries (Next-day adjustments)
CREATE TABLE IF NOT EXISTS public.dealer_return_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_number TEXT NOT NULL UNIQUE,
  dealer_id UUID NOT NULL REFERENCES public.dealers(id) ON DELETE RESTRICT,
  dispatch_id UUID NOT NULL REFERENCES public.dealer_dispatches(id) ON DELETE RESTRICT,
  dispatch_date DATE NOT NULL,
  return_date DATE NOT NULL DEFAULT CURRENT_DATE, -- The reporting date e.g. 14-11-2026
  condition TEXT NOT NULL DEFAULT 'good', -- 'good', 'damaged', 'leaked', 'unsellable'
  total_returned_qty NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_leaked_qty NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_credit_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  recorded_by TEXT DEFAULT 'Admin',
  approved_by TEXT DEFAULT 'Admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.dealer_return_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_entry_id UUID NOT NULL REFERENCES public.dealer_return_entries(id) ON DELETE CASCADE,
  dispatch_item_id UUID REFERENCES public.dealer_dispatch_items(id) ON DELETE SET NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'pcs',
  original_quantity NUMERIC(12,2) NOT NULL,
  previously_returned_qty NUMERIC(12,2) NOT NULL DEFAULT 0,
  previously_leaked_qty NUMERIC(12,2) NOT NULL DEFAULT 0,
  returned_quantity NUMERIC(12,2) NOT NULL DEFAULT 0,
  leaked_quantity NUMERIC(12,2) NOT NULL DEFAULT 0,
  original_rate NUMERIC(12,2) NOT NULL,
  adjustment_rate NUMERIC(12,2) NOT NULL, -- Preserves original dispatch rate by default
  override_reason TEXT,
  return_credit_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  leakage_credit_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  condition TEXT NOT NULL DEFAULT 'good',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- PART 4: Dealer Credit Adjustments
CREATE TABLE IF NOT EXISTS public.dealer_credit_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id UUID NOT NULL REFERENCES public.dealers(id) ON DELETE CASCADE,
  dispatch_id UUID REFERENCES public.dealer_dispatches(id) ON DELETE SET NULL,
  return_entry_id UUID REFERENCES public.dealer_return_entries(id) ON DELETE SET NULL,
  adjustment_date DATE NOT NULL DEFAULT CURRENT_DATE, -- Strictly dated the reporting day!
  adjustment_type TEXT NOT NULL, -- 'return_credit', 'leakage_credit', 'other'
  amount NUMERIC(12,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'APPLIED',
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- PART 5: Dealer Daily Settlements
CREATE TABLE IF NOT EXISTS public.dealer_daily_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id UUID NOT NULL REFERENCES public.dealers(id) ON DELETE RESTRICT,
  settlement_date DATE NOT NULL DEFAULT CURRENT_DATE,
  opening_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  today_dispatches_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  previous_returns_credit NUMERIC(12,2) NOT NULL DEFAULT 0,
  previous_leakage_credit NUMERIC(12,2) NOT NULL DEFAULT 0,
  collections_received NUMERIC(12,2) NOT NULL DEFAULT 0,
  other_adjustments NUMERIC(12,2) NOT NULL DEFAULT 0,
  closing_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'CONFIRMED',
  notes TEXT,
  confirmed_by TEXT DEFAULT 'Admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_dealer_daily_settlement UNIQUE (dealer_id, settlement_date)
);

-- PART 6: Driver Load Dispatches & Settlements
CREATE TABLE IF NOT EXISTS public.driver_load_dispatches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispatch_number TEXT NOT NULL UNIQUE,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE RESTRICT,
  driver_name TEXT NOT NULL,
  vehicle_number TEXT,
  route_id UUID REFERENCES public.routes(id) ON DELETE SET NULL,
  route_name TEXT,
  dispatch_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_loaded_qty NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_load_value NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ISSUED', -- 'ISSUED', 'SETTLED', 'CANCELLED'
  notes TEXT,
  created_by TEXT DEFAULT 'Operations Admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.driver_load_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  load_dispatch_id UUID NOT NULL REFERENCES public.driver_load_dispatches(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'cans',
  loaded_quantity NUMERIC(12,2) NOT NULL,
  rate NUMERIC(12,2) NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  sold_quantity NUMERIC(12,2) NOT NULL DEFAULT 0,
  returned_quantity NUMERIC(12,2) NOT NULL DEFAULT 0,
  leaked_quantity NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.driver_route_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_number TEXT NOT NULL UNIQUE,
  load_dispatch_id UUID NOT NULL REFERENCES public.driver_load_dispatches(id) ON DELETE RESTRICT,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE RESTRICT,
  route_id UUID REFERENCES public.routes(id) ON DELETE SET NULL,
  settlement_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_loaded_qty NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_sold_qty NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_returned_qty NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_leaked_qty NUMERIC(12,2) NOT NULL DEFAULT 0,
  unaccounted_qty NUMERIC(12,2) NOT NULL DEFAULT 0,
  cash_collected NUMERIC(12,2) NOT NULL DEFAULT 0,
  upi_collected NUMERIC(12,2) NOT NULL DEFAULT 0,
  credit_sales_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  route_expenses_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  expected_collection NUMERIC(12,2) NOT NULL DEFAULT 0,
  actual_collection NUMERIC(12,2) NOT NULL DEFAULT 0,
  collection_difference NUMERIC(12,2) NOT NULL DEFAULT 0,
  bills_generated_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'CONFIRMED',
  discrepancy_reason TEXT,
  confirmed_by TEXT DEFAULT 'Operations Admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.driver_route_settlement_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_id UUID NOT NULL REFERENCES public.driver_route_settlements(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  loaded_qty NUMERIC(12,2) NOT NULL,
  sold_qty NUMERIC(12,2) NOT NULL,
  returned_good_qty NUMERIC(12,2) NOT NULL DEFAULT 0,
  leaked_damaged_qty NUMERIC(12,2) NOT NULL DEFAULT 0,
  rate NUMERIC(12,2) NOT NULL,
  sold_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  condition TEXT NOT NULL DEFAULT 'good',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- PART 7: Indexes for Performance & Idempotency
CREATE INDEX IF NOT EXISTS idx_dealer_dispatches_dealer ON public.dealer_dispatches(dealer_id, dispatch_date);
CREATE INDEX IF NOT EXISTS idx_dealer_return_entries_dealer ON public.dealer_return_entries(dealer_id, return_date);
CREATE INDEX IF NOT EXISTS idx_dealer_return_entries_dispatch ON public.dealer_return_entries(dispatch_id);
CREATE INDEX IF NOT EXISTS idx_dealer_credit_adj_dealer ON public.dealer_credit_adjustments(dealer_id, adjustment_date);
CREATE INDEX IF NOT EXISTS idx_dealer_daily_settlement_date ON public.dealer_daily_settlements(dealer_id, settlement_date);
CREATE INDEX IF NOT EXISTS idx_driver_load_driver_date ON public.driver_load_dispatches(driver_id, dispatch_date);
CREATE INDEX IF NOT EXISTS idx_driver_route_settlement_date ON public.driver_route_settlements(driver_id, settlement_date);

-- ============================================================================
-- ATOMIC BUSINESS LOGIC FUNCTIONS
-- ============================================================================

-- FUNCTION 1: Record Dealer Load Dispatch (Inventory deduction + Dealer balance update)
CREATE OR REPLACE FUNCTION public.record_dealer_dispatch(
  p_dispatch JSONB,
  p_items JSONB
) RETURNS JSONB AS $$
DECLARE
  v_dispatch_id UUID;
  v_dispatch_number TEXT;
  v_dealer_id UUID;
  v_item JSONB;
  v_prod_id UUID;
  v_qty NUMERIC;
  v_rate NUMERIC;
  v_amount NUMERIC;
  v_total_qty NUMERIC := 0;
  v_total_val NUMERIC := 0;
  v_taxable NUMERIC := 0;
  v_gst NUMERIC := 0;
  v_cgst NUMERIC := 0;
  v_sgst NUMERIC := 0;
  v_igst NUMERIC := 0;
  v_is_gst BOOLEAN;
  v_is_interstate BOOLEAN;
  v_gst_rate NUMERIC;
  v_curr_stock INTEGER;
  v_result JSONB;
BEGIN
  v_dealer_id := (p_dispatch->>'dealer_id')::UUID;
  IF v_dealer_id IS NULL THEN
    RAISE EXCEPTION 'Dealer ID is required for dispatch';
  END IF;

  v_dispatch_number := COALESCE(
    p_dispatch->>'dispatch_number', 
    'RK-DLD-' || TO_CHAR(CURRENT_TIMESTAMP, 'YYYYMMDD-HH24MISS') || '-' || LPAD(FLOOR(RANDOM()*1000)::TEXT, 3, '0')
  );

  v_is_gst := COALESCE((p_dispatch->>'is_gst_enabled')::BOOLEAN, false);
  v_is_interstate := COALESCE((p_dispatch->>'is_interstate')::BOOLEAN, false);
  v_gst_rate := COALESCE((p_dispatch->>'gst_rate')::NUMERIC, 0);

  -- 1. Insert Master Dispatch Record
  INSERT INTO public.dealer_dispatches (
    dispatch_number,
    dealer_id,
    dealer_name,
    dealer_gstin,
    is_gst_enabled,
    is_interstate,
    dispatch_date,
    total_quantity,
    subtotal,
    discount_amount,
    taxable_amount,
    gst_rate,
    gst_amount,
    cgst_amount,
    sgst_amount,
    igst_amount,
    total_value,
    status,
    responsible_staff,
    notes
  ) VALUES (
    v_dispatch_number,
    v_dealer_id,
    p_dispatch->>'dealer_name',
    p_dispatch->>'dealer_gstin',
    v_is_gst,
    v_is_interstate,
    COALESCE((p_dispatch->>'dispatch_date')::DATE, CURRENT_DATE),
    COALESCE((p_dispatch->>'total_quantity')::NUMERIC, 0),
    COALESCE((p_dispatch->>'subtotal')::NUMERIC, 0),
    COALESCE((p_dispatch->>'discount_amount')::NUMERIC, 0),
    COALESCE((p_dispatch->>'taxable_amount')::NUMERIC, 0),
    v_gst_rate,
    COALESCE((p_dispatch->>'gst_amount')::NUMERIC, 0),
    COALESCE((p_dispatch->>'cgst_amount')::NUMERIC, 0),
    COALESCE((p_dispatch->>'sgst_amount')::NUMERIC, 0),
    COALESCE((p_dispatch->>'igst_amount')::NUMERIC, 0),
    COALESCE((p_dispatch->>'total_value')::NUMERIC, 0),
    'DISPATCHED',
    COALESCE(p_dispatch->>'responsible_staff', 'Operations Admin'),
    p_dispatch->>'notes'
  ) RETURNING id INTO v_dispatch_id;

  -- 2. Process Items & Inventory Deductions
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_prod_id := NULL;
    IF (v_item->>'product_id') IS NOT NULL AND (v_item->>'product_id') <> '' THEN
      v_prod_id := (v_item->>'product_id')::UUID;
    END IF;

    v_qty := (v_item->>'quantity')::NUMERIC;
    v_rate := (v_item->>'rate')::NUMERIC;
    v_amount := COALESCE((v_item->>'amount')::NUMERIC, v_qty * v_rate);
    v_total_qty := v_total_qty + v_qty;
    v_total_val := v_total_val + v_amount;

    INSERT INTO public.dealer_dispatch_items (
      dispatch_id,
      product_id,
      product_name,
      unit,
      quantity,
      rate,
      amount,
      accepted_quantity,
      gst_rate,
      gst_amount
    ) VALUES (
      v_dispatch_id,
      v_prod_id,
      v_item->>'product_name',
      COALESCE(v_item->>'unit', 'cans'),
      v_qty,
      v_rate,
      v_amount,
      v_qty, -- Initially all quantity is issued to dealer
      COALESCE((v_item->>'gst_rate')::NUMERIC, 0),
      COALESCE((v_item->>'gst_amount')::NUMERIC, 0)
    );

    -- Decrement Warehouse Product Inventory
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
          'Dealer Load Dispatch',
          v_dispatch_id,
          'dealer_dispatch',
          'Dispatched to dealer: ' || (p_dispatch->>'dealer_name')
        );
      END IF;
    END IF;
  END LOOP;

  -- Update header totals if calculated dynamically from items
  UPDATE public.dealer_dispatches
  SET total_quantity = v_total_qty,
      subtotal = v_total_val,
      taxable_amount = v_total_val,
      total_value = v_total_val
  WHERE id = v_dispatch_id;

  -- 3. Update dealer outstanding balance and ledger
  UPDATE public.dealers 
  SET outstanding_amount = COALESCE(outstanding_amount, 0) + v_total_val,
      total_purchases = COALESCE(total_purchases, 0) + v_total_val,
      last_purchase_date = COALESCE((p_dispatch->>'dispatch_date')::DATE, CURRENT_DATE),
      updated_at = NOW()
  WHERE id = v_dealer_id;

  INSERT INTO public.dealer_ledger (
    dealer_id,
    transaction_type,
    amount,
    reference_id,
    created_at
  ) VALUES (
    v_dealer_id,
    'dispatch',
    v_total_val,
    v_dispatch_id,
    NOW()
  );

  SELECT row_to_json(d.*)::JSONB INTO v_result 
  FROM public.dealer_dispatches d 
  WHERE d.id = v_dispatch_id;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- FUNCTION 2: Record Dealer Return & Leakage (Next-Day Adjustments)
CREATE OR REPLACE FUNCTION public.record_dealer_return_and_leakage(
  p_return JSONB,
  p_items JSONB
) RETURNS JSONB AS $$
DECLARE
  v_return_id UUID;
  v_dispatch_id UUID;
  v_dealer_id UUID;
  v_return_number TEXT;
  v_return_date DATE;
  v_item JSONB;
  v_dispatch_item_id UUID;
  v_prod_id UUID;
  v_ret_qty NUMERIC;
  v_leak_qty NUMERIC;
  v_orig_rate NUMERIC;
  v_adj_rate NUMERIC;
  v_ret_credit NUMERIC;
  v_leak_credit NUMERIC;
  v_total_credit NUMERIC := 0;
  v_total_ret_qty NUMERIC := 0;
  v_total_leak_qty NUMERIC := 0;
  v_condition TEXT;
  v_curr_stock INTEGER;
  v_disp_item RECORD;
  v_result JSONB;
BEGIN
  v_dispatch_id := (p_return->>'dispatch_id')::UUID;
  v_dealer_id := (p_return->>'dealer_id')::UUID;
  v_return_date := COALESCE((p_return->>'return_date')::DATE, CURRENT_DATE);
  v_condition := COALESCE(p_return->>'condition', 'good');

  IF v_dispatch_id IS NULL OR v_dealer_id IS NULL THEN
    RAISE EXCEPTION 'Dispatch ID and Dealer ID are required';
  END IF;

  v_return_number := COALESCE(
    p_return->>'return_number',
    'RK-DLR-RET-' || TO_CHAR(CURRENT_TIMESTAMP, 'YYYYMMDD-HH24MISS') || '-' || LPAD(FLOOR(RANDOM()*1000)::TEXT, 3, '0')
  );

  -- 1. Insert Return Entry Record
  INSERT INTO public.dealer_return_entries (
    return_number,
    dealer_id,
    dispatch_id,
    dispatch_date,
    return_date,
    condition,
    notes,
    recorded_by,
    approved_by
  ) VALUES (
    v_return_number,
    v_dealer_id,
    v_dispatch_id,
    (p_return->>'dispatch_date')::DATE,
    v_return_date,
    v_condition,
    p_return->>'notes',
    COALESCE(p_return->>'recorded_by', 'Admin'),
    COALESCE(p_return->>'approved_by', 'Admin')
  ) RETURNING id INTO v_return_id;

  -- 2. Process Line Items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_dispatch_item_id := NULL;
    IF (v_item->>'dispatch_item_id') IS NOT NULL AND (v_item->>'dispatch_item_id') <> '' THEN
      v_dispatch_item_id := (v_item->>'dispatch_item_id')::UUID;
    END IF;

    v_ret_qty := COALESCE((v_item->>'returned_quantity')::NUMERIC, 0);
    v_leak_qty := COALESCE((v_item->>'leaked_quantity')::NUMERIC, 0);
    
    IF v_ret_qty <= 0 AND v_leak_qty <= 0 THEN
      CONTINUE;
    END IF;

    -- Validate against original dispatch item
    IF v_dispatch_item_id IS NOT NULL THEN
      SELECT * INTO v_disp_item FROM public.dealer_dispatch_items WHERE id = v_dispatch_item_id FOR UPDATE;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Original dispatch item not found for ID: %', v_dispatch_item_id;
      END IF;

      IF (v_disp_item.returned_quantity + v_disp_item.leaked_quantity + v_ret_qty + v_leak_qty) > v_disp_item.quantity THEN
        RAISE EXCEPTION 'Total returned (%) and leaked (%) exceeds original dispatched quantity (%) for %',
          (v_disp_item.returned_quantity + v_ret_qty),
          (v_disp_item.leaked_quantity + v_leak_qty),
          v_disp_item.quantity,
          v_disp_item.product_name;
      END IF;

      v_orig_rate := v_disp_item.rate;
      v_prod_id := v_disp_item.product_id;
    ELSE
      v_orig_rate := (v_item->>'original_rate')::NUMERIC;
      v_prod_id := NULL;
      IF (v_item->>'product_id') IS NOT NULL AND (v_item->>'product_id') <> '' THEN
        v_prod_id := (v_item->>'product_id')::UUID;
      END IF;
    END IF;

    -- Default adjustment rate preserves original dispatch rate unless approved override exists
    v_adj_rate := COALESCE((v_item->>'adjustment_rate')::NUMERIC, v_orig_rate);
    v_ret_credit := v_ret_qty * v_adj_rate;
    v_leak_credit := v_leak_qty * v_adj_rate;

    v_total_ret_qty := v_total_ret_qty + v_ret_qty;
    v_total_leak_qty := v_total_leak_qty + v_leak_qty;
    v_total_credit := v_total_credit + v_ret_credit + v_leak_credit;

    -- Insert Return Line Item
    INSERT INTO public.dealer_return_items (
      return_entry_id,
      dispatch_item_id,
      product_id,
      product_name,
      unit,
      original_quantity,
      previously_returned_qty,
      previously_leaked_qty,
      returned_quantity,
      leaked_quantity,
      original_rate,
      adjustment_rate,
      override_reason,
      return_credit_amount,
      leakage_credit_amount,
      condition
    ) VALUES (
      v_return_id,
      v_dispatch_item_id,
      v_prod_id,
      v_item->>'product_name',
      COALESCE(v_item->>'unit', 'pcs'),
      COALESCE((v_item->>'original_quantity')::NUMERIC, v_disp_item.quantity),
      COALESCE(v_disp_item.returned_quantity, 0),
      COALESCE(v_disp_item.leaked_quantity, 0),
      v_ret_qty,
      v_leak_qty,
      v_orig_rate,
      v_adj_rate,
      v_item->>'override_reason',
      v_ret_credit,
      v_leak_credit,
      v_condition
    );

    -- Update original dispatch item quantities
    IF v_dispatch_item_id IS NOT NULL THEN
      UPDATE public.dealer_dispatch_items
      SET returned_quantity = returned_quantity + v_ret_qty,
          leaked_quantity = leaked_quantity + v_leak_qty,
          accepted_quantity = GREATEST(0, quantity - (returned_quantity + v_ret_qty + leaked_quantity + v_leak_qty))
      WHERE id = v_dispatch_item_id;
    END IF;

    -- Inventory Updates:
    -- 1. Good returned stock is added back to available inventory
    IF v_prod_id IS NOT NULL AND v_ret_qty > 0 AND v_condition = 'good' THEN
      SELECT stock_quantity INTO v_curr_stock FROM public.products WHERE id = v_prod_id FOR UPDATE;
      IF v_curr_stock IS NOT NULL THEN
        UPDATE public.products 
        SET stock_quantity = stock_quantity + v_ret_qty::INT,
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
          v_ret_qty::INT,
          v_curr_stock,
          v_curr_stock + v_ret_qty::INT,
          'Dealer Return (Good Condition)',
          v_return_id,
          'dealer_return',
          'Good stock returned by dealer'
        );
      END IF;
    END IF;

    -- 2. Leaked / Damaged stock is recorded in leakages, NEVER added to sellable stock
    IF v_prod_id IS NOT NULL AND (v_leak_qty > 0 OR (v_ret_qty > 0 AND v_condition IN ('damaged', 'leaked', 'unsellable'))) THEN
      DECLARE
        v_damaged_qty NUMERIC := v_leak_qty + (CASE WHEN v_condition <> 'good' THEN v_ret_qty ELSE 0 END);
      BEGIN
        INSERT INTO public.leakages (
          date,
          product_id,
          quantity,
          source,
          financial_loss,
          notes,
          created_at
        ) VALUES (
          v_return_date,
          v_prod_id,
          v_damaged_qty::INT,
          'dealer_return',
          v_damaged_qty * v_adj_rate,
          'Dealer reported leakage/damage from dispatch ' || (p_return->>'dispatch_date'),
          NOW()
        );

        INSERT INTO public.stock_transactions (
          product_id,
          transaction_type,
          quantity,
          reason,
          reference_id,
          reference_type,
          notes
        ) VALUES (
          v_prod_id,
          'scrap',
          v_damaged_qty::INT,
          'Dealer Leakage / Damage Quarantine',
          v_return_id,
          'dealer_leakage',
          'Non-sellable damaged/leaked goods from dealer'
        );
      END;
    END IF;
  END LOOP;

  -- Update summary on return entry
  UPDATE public.dealer_return_entries 
  SET total_returned_qty = v_total_ret_qty,
      total_leaked_qty = v_total_leak_qty,
      total_credit_amount = v_total_credit
  WHERE id = v_return_id;

  -- 3. Create Credit Adjustments dated the return reporting date
  IF v_total_credit > 0 THEN
    INSERT INTO public.dealer_credit_adjustments (
      dealer_id,
      dispatch_id,
      return_entry_id,
      adjustment_date,
      adjustment_type,
      amount,
      status,
      description
    ) VALUES (
      v_dealer_id,
      v_dispatch_id,
      v_return_id,
      v_return_date,
      'return_credit',
      v_total_credit,
      'APPLIED',
      'Return & Leakage credit adjustment for dispatch ' || (p_return->>'dispatch_date')
    );

    -- Deduct from dealer outstanding balance
    UPDATE public.dealers 
    SET outstanding_amount = GREATEST(0, COALESCE(outstanding_amount, 0) - v_total_credit),
        updated_at = NOW()
    WHERE id = v_dealer_id;

    -- Add to dealer ledger as credit adjustment
    INSERT INTO public.dealer_ledger (
      dealer_id,
      transaction_type,
      amount,
      reference_id,
      created_at
    ) VALUES (
      v_dealer_id,
      'credit_adjustment',
      v_total_credit,
      v_return_id,
      NOW()
    );
  END IF;

  SELECT row_to_json(r.*)::JSONB INTO v_result 
  FROM public.dealer_return_entries r 
  WHERE r.id = v_return_id;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- FUNCTION 3: Issue Driver Load Dispatch (Warehouse load-out)
CREATE OR REPLACE FUNCTION public.issue_driver_load(
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
    RAISE EXCEPTION 'Driver ID is required for load issue';
  END IF;

  v_dispatch_number := COALESCE(
    p_dispatch->>'dispatch_number', 
    'RK-DRV-' || TO_CHAR(CURRENT_TIMESTAMP, 'YYYYMMDD-HH24MISS') || '-' || LPAD(FLOOR(RANDOM()*1000)::TEXT, 3, '0')
  );

  INSERT INTO public.driver_load_dispatches (
    dispatch_number,
    driver_id,
    driver_name,
    vehicle_number,
    route_id,
    route_name,
    dispatch_date,
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
    COALESCE((p_dispatch->>'total_loaded_qty')::NUMERIC, 0),
    COALESCE((p_dispatch->>'total_load_value')::NUMERIC, 0),
    'ISSUED',
    p_dispatch->>'notes',
    COALESCE(p_dispatch->>'created_by', 'Operations Admin')
  ) RETURNING id INTO v_dispatch_id;

  -- Process line items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_prod_id := NULL;
    IF (v_item->>'product_id') IS NOT NULL AND (v_item->>'product_id') <> '' THEN
      v_prod_id := (v_item->>'product_id')::UUID;
    END IF;

    v_qty := (v_item->>'loaded_quantity')::NUMERIC;
    v_rate := (v_item->>'rate')::NUMERIC;
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
          'Driver Route Load Issue',
          v_dispatch_id,
          'driver_load_issue',
          'Loaded for driver: ' || (p_dispatch->>'driver_name')
        );
      END IF;
    END IF;
  END LOOP;

  UPDATE public.driver_load_dispatches
  SET total_loaded_qty = v_total_qty,
      total_load_value = v_total_val
  WHERE id = v_dispatch_id;

  SELECT row_to_json(d.*)::JSONB INTO v_result 
  FROM public.driver_load_dispatches d 
  WHERE d.id = v_dispatch_id;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- FUNCTION 4: Settle Driver Route (Reconcile loaded = sold + returned + leaked, generate bills, inventory check-in)
CREATE OR REPLACE FUNCTION public.settle_driver_route(
  p_settlement JSONB,
  p_items JSONB,
  p_customer_sales JSONB DEFAULT '[]'::JSONB
) RETURNS JSONB AS $$
DECLARE
  v_settlement_id UUID;
  v_settlement_number TEXT;
  v_load_dispatch_id UUID;
  v_driver_id UUID;
  v_item JSONB;
  v_sale JSONB;
  v_sale_item JSONB;
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
  v_result JSONB;
BEGIN
  v_load_dispatch_id := (p_settlement->>'load_dispatch_id')::UUID;
  v_driver_id := (p_settlement->>'driver_id')::UUID;

  IF v_load_dispatch_id IS NULL OR v_driver_id IS NULL THEN
    RAISE EXCEPTION 'Load Dispatch ID and Driver ID are required';
  END IF;

  v_settlement_number := COALESCE(
    p_settlement->>'settlement_number',
    'RK-DRS-' || TO_CHAR(CURRENT_TIMESTAMP, 'YYYYMMDD-HH24MISS') || '-' || LPAD(FLOOR(RANDOM()*1000)::TEXT, 3, '0')
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
    (p_settlement->>'route_id')::UUID,
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
    'CONFIRMED',
    p_settlement->>'discrepancy_reason',
    COALESCE(p_settlement->>'confirmed_by', 'Operations Admin')
  ) RETURNING id INTO v_settlement_id;

  -- 2. Process Settlement Line Items
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

    -- Inventory Reconciliations:
    -- (A) Good returned products are checked back into warehouse sellable stock
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
          'Driver Route Unsold Return (Good Condition)',
          v_settlement_id,
          'driver_unsold_return',
          'Returned unsold goods from driver settlement'
        );
      END IF;
    END IF;

    -- (B) Leaked / damaged products are recorded in leakages table as loss
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
        'Driver route leakage/damage recorded during settlement ' || v_settlement_number,
        NOW()
      );

      INSERT INTO public.stock_transactions (
        product_id,
        transaction_type,
        quantity,
        reason,
        reference_id,
        reference_type,
        notes
      ) VALUES (
        v_prod_id,
        'scrap',
        v_leaked::INT,
        'Driver Route Damage / Leakage',
        v_settlement_id,
        'driver_leakage',
        'Damaged or leaked during driver transit'
      );
    END IF;
  END LOOP;

  -- 3. Generate Final Customer Bills for actual recorded sales
  FOR v_sale IN SELECT * FROM jsonb_array_elements(p_customer_sales)
  LOOP
    v_inv_no := 'RK-DRV-BILL-' || TO_CHAR(CURRENT_TIMESTAMP, 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM()*10000)::TEXT, 4, '0');
    v_sale_subtotal := COALESCE((v_sale->>'total_amount')::NUMERIC, 0);
    v_sale_paid := COALESCE((v_sale->>'paid_amount')::NUMERIC, 0);
    v_sale_due := GREATEST(0, v_sale_subtotal - v_sale_paid);

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
      payment_method,
      cash_amount,
      upi_amount,
      payment_status,
      items_count,
      notes,
      created_by
    ) VALUES (
      v_inv_no,
      'driver_customer_invoice',
      v_sale->>'customer_name',
      v_sale->>'customer_phone',
      v_driver_id,
      (p_settlement->>'route_id')::UUID,
      v_load_dispatch_id,
      COALESCE((p_settlement->>'settlement_date')::DATE, CURRENT_DATE),
      v_sale_subtotal,
      v_sale_subtotal,
      v_sale_subtotal,
      v_sale_paid,
      v_sale_due,
      COALESCE(v_sale->>'payment_method', 'CASH'),
      COALESCE((v_sale->>'cash_amount')::NUMERIC, 0),
      COALESCE((v_sale->>'upi_amount')::NUMERIC, 0),
      CASE WHEN v_sale_due <= 0 THEN 'paid' WHEN v_sale_paid > 0 THEN 'partial' ELSE 'due' END,
      1,
      'Settled bill from Driver Route ' || v_settlement_number,
      'Driver Route Settlement'
    ) RETURNING id INTO v_bill_id;

    v_bills_count := v_bills_count + 1;
  END LOOP;

  -- Record route expenses if any
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
      'Driver Route Fuel & Expenses',
      'cash',
      'Driver route expenses for settlement ' || v_settlement_number,
      COALESCE((p_settlement->>'settlement_date')::DATE, CURRENT_DATE),
      COALESCE((p_settlement->>'settlement_date')::DATE, CURRENT_DATE)
    );
  END IF;

  -- 4. Mark Driver Load Dispatch as SETTLED
  UPDATE public.driver_load_dispatches
  SET status = 'SETTLED',
      updated_at = NOW()
  WHERE id = v_load_dispatch_id;

  UPDATE public.driver_route_settlements
  SET bills_generated_count = v_bills_count
  WHERE id = v_settlement_id;

  SELECT row_to_json(s.*)::JSONB INTO v_result 
  FROM public.driver_route_settlements s 
  WHERE s.id = v_settlement_id;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

