-- ============================================================================
-- MIGRATION 010: EMPLOYEE ATTENDANCE, ADVANCES, PAYROLL & WORKFLOW ENHANCEMENTS
-- Royal Kissan ERP
-- ============================================================================

-- PART 1: Enhance attendance table
ALTER TABLE public.attendance
  ADD COLUMN IF NOT EXISTS check_in_time TIME,
  ADD COLUMN IF NOT EXISTS check_out_time TIME,
  ADD COLUMN IF NOT EXISTS working_hours NUMERIC(4,2),
  ADD COLUMN IF NOT EXISTS remarks TEXT;

-- Deduplicate attendance rows before adding unique constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_attendance_emp_date'
  ) THEN
    DELETE FROM public.attendance a
    WHERE a.id NOT IN (
      SELECT DISTINCT ON (employee_id, date) id
      FROM public.attendance
      ORDER BY employee_id, date, created_at DESC
    );
    ALTER TABLE public.attendance ADD CONSTRAINT uq_attendance_emp_date UNIQUE (employee_id, date);
  END IF;
END $$;

-- PART 2: Employee Advances Table
CREATE TABLE IF NOT EXISTS public.employee_advances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  advance_date DATE NOT NULL DEFAULT CURRENT_DATE,
  advance_amount NUMERIC(12,2) NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'cash', -- 'cash', 'upi', 'bank_transfer', 'cheque'
  reference_number TEXT,
  remarks TEXT,
  recorded_by TEXT DEFAULT 'Admin',
  status TEXT NOT NULL DEFAULT 'OUTSTANDING', -- 'OUTSTANDING', 'RECOVERED', 'PARTIALLY_RECOVERED', 'WAIVED'
  recovered_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  remaining_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  salary_payment_id UUID REFERENCES public.salary_payments(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_employee_advances_emp ON public.employee_advances(employee_id, advance_date);
CREATE INDEX IF NOT EXISTS idx_employee_advances_status ON public.employee_advances(status);

-- PART 3: Enhance salary_payments table
ALTER TABLE public.salary_payments
  ADD COLUMN IF NOT EXISTS advance_deducted NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS other_deductions NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS remarks TEXT,
  ADD COLUMN IF NOT EXISTS advance_ids UUID[];

-- PART 4: Enhance dealer_credit_adjustments
ALTER TABLE public.dealer_credit_adjustments
  ADD COLUMN IF NOT EXISTS is_applied BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS applied_bill_id UUID REFERENCES public.bills(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS applied_invoice_number TEXT;

-- PART 5: Atomic Stored Procedure — Record Employee Advance
CREATE OR REPLACE FUNCTION public.record_employee_advance(
  p_employee_id UUID,
  p_amount NUMERIC,
  p_date DATE DEFAULT CURRENT_DATE,
  p_payment_method TEXT DEFAULT 'cash',
  p_reference_number TEXT DEFAULT NULL,
  p_remarks TEXT DEFAULT NULL,
  p_recorded_by TEXT DEFAULT 'Admin'
) RETURNS JSONB AS $$
DECLARE
  v_advance_id UUID;
  v_current_advance NUMERIC;
  v_emp_name TEXT;
  v_result JSONB;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Advance amount must be greater than zero.';
  END IF;

  SELECT name, COALESCE(advance_amount, 0)
  INTO v_emp_name, v_current_advance
  FROM public.employees
  WHERE id = p_employee_id;

  IF v_emp_name IS NULL THEN
    RAISE EXCEPTION 'Employee with ID % not found.', p_employee_id;
  END IF;

  INSERT INTO public.employee_advances (
    employee_id,
    advance_date,
    advance_amount,
    payment_method,
    reference_number,
    remarks,
    recorded_by,
    status,
    recovered_amount,
    remaining_amount
  ) VALUES (
    p_employee_id,
    p_date,
    p_amount,
    p_payment_method,
    p_reference_number,
    p_remarks,
    p_recorded_by,
    'OUTSTANDING',
    0,
    p_amount
  ) RETURNING id INTO v_advance_id;

  UPDATE public.employees
  SET advance_amount = v_current_advance + p_amount,
      updated_at = NOW()
  WHERE id = p_employee_id;

  v_result := jsonb_build_object(
    'id', v_advance_id,
    'employee_id', p_employee_id,
    'employee_name', v_emp_name,
    'advance_amount', p_amount,
    'total_outstanding_advance', v_current_advance + p_amount,
    'advance_date', p_date,
    'status', 'OUTSTANDING'
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- PART 6: Atomic Stored Procedure — Settle Employee Salary & Recover Advances
CREATE OR REPLACE FUNCTION public.settle_employee_salary(
  p_employee_id UUID,
  p_month INT,
  p_year INT,
  p_base_salary NUMERIC,
  p_present_days INT,
  p_absent_days INT,
  p_half_days INT,
  p_calculated_salary NUMERIC,
  p_advance_to_deduct NUMERIC,
  p_other_deductions NUMERIC,
  p_net_salary NUMERIC,
  p_payment_mode TEXT,
  p_payment_date DATE DEFAULT CURRENT_DATE,
  p_notes TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_payment_id UUID;
  v_total_outstanding NUMERIC;
  v_deductible NUMERIC;
  v_adv_rec RECORD;
  v_to_recover_from_this NUMERIC;
  v_remaining_to_deduct NUMERIC;
  v_result JSONB;
BEGIN
  SELECT COALESCE(advance_amount, 0)
  INTO v_total_outstanding
  FROM public.employees
  WHERE id = p_employee_id;

  v_deductible := LEAST(COALESCE(p_advance_to_deduct, 0), v_total_outstanding);

  INSERT INTO public.salary_payments (
    employee_id,
    month,
    year,
    base_salary,
    present_days,
    absent_days,
    half_days,
    calculated_salary,
    advance_paid,
    advance_deducted,
    other_deductions,
    net_salary,
    payment_date,
    payment_mode,
    status,
    notes
  ) VALUES (
    p_employee_id,
    p_month,
    p_year,
    p_base_salary,
    p_present_days,
    p_absent_days,
    p_half_days,
    p_calculated_salary,
    v_total_outstanding,
    v_deductible,
    p_other_deductions,
    p_net_salary,
    p_payment_date,
    p_payment_mode,
    'paid',
    p_notes
  )
  ON CONFLICT (employee_id, month, year)
  DO UPDATE SET
    base_salary = EXCLUDED.base_salary,
    present_days = EXCLUDED.present_days,
    absent_days = EXCLUDED.absent_days,
    half_days = EXCLUDED.half_days,
    calculated_salary = EXCLUDED.calculated_salary,
    advance_deducted = EXCLUDED.advance_deducted,
    other_deductions = EXCLUDED.other_deductions,
    net_salary = EXCLUDED.net_salary,
    payment_date = EXCLUDED.payment_date,
    payment_mode = EXCLUDED.payment_mode,
    status = 'paid',
    notes = EXCLUDED.notes
  RETURNING id INTO v_payment_id;

  v_remaining_to_deduct := v_deductible;
  IF v_remaining_to_deduct > 0 THEN
    FOR v_adv_rec IN 
      SELECT id, remaining_amount, recovered_amount 
      FROM public.employee_advances 
      WHERE employee_id = p_employee_id AND status IN ('OUTSTANDING', 'PARTIALLY_RECOVERED')
      ORDER BY advance_date ASC, created_at ASC
    LOOP
      IF v_remaining_to_deduct <= 0 THEN
        EXIT;
      END IF;

      v_to_recover_from_this := LEAST(v_remaining_to_deduct, v_adv_rec.remaining_amount);
      
      UPDATE public.employee_advances
      SET recovered_amount = v_adv_rec.recovered_amount + v_to_recover_from_this,
          remaining_amount = v_adv_rec.remaining_amount - v_to_recover_from_this,
          status = CASE WHEN (v_adv_rec.remaining_amount - v_to_recover_from_this) <= 0 THEN 'RECOVERED' ELSE 'PARTIALLY_RECOVERED' END,
          salary_payment_id = v_payment_id,
          updated_at = NOW()
      WHERE id = v_adv_rec.id;

      v_remaining_to_deduct := v_remaining_to_deduct - v_to_recover_from_this;
    END LOOP;

    UPDATE public.employees
    SET advance_amount = GREATEST(0, v_total_outstanding - v_deductible),
        updated_at = NOW()
    WHERE id = p_employee_id;
  END IF;

  v_result := jsonb_build_object(
    'payment_id', v_payment_id,
    'employee_id', p_employee_id,
    'month', p_month,
    'year', p_year,
    'net_salary', p_net_salary,
    'advance_deducted', v_deductible,
    'remaining_advance_balance', GREATEST(0, v_total_outstanding - v_deductible),
    'status', 'paid'
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- PART 7: Atomic Stored Procedure — Apply Dealer Credits to Bill
CREATE OR REPLACE FUNCTION public.apply_dealer_credits_to_bill(
  p_dealer_id UUID,
  p_bill_id UUID,
  p_invoice_number TEXT,
  p_credit_adjustment_ids UUID[]
) RETURNS JSONB AS $$
DECLARE
  v_total_credit_applied NUMERIC := 0;
  v_adj RECORD;
BEGIN
  FOR v_adj IN 
    SELECT id, amount, is_applied
    FROM public.dealer_credit_adjustments
    WHERE id = ANY(p_credit_adjustment_ids)
      AND dealer_id = p_dealer_id
      AND (is_applied IS FALSE OR is_applied IS NULL)
  LOOP
    UPDATE public.dealer_credit_adjustments
    SET is_applied = TRUE,
        applied_bill_id = p_bill_id,
        applied_invoice_number = p_invoice_number
    WHERE id = v_adj.id;

    v_total_credit_applied := v_total_credit_applied + v_adj.amount;
  END LOOP;

  RETURN jsonb_build_object(
    'dealer_id', p_dealer_id,
    'bill_id', p_bill_id,
    'invoice_number', p_invoice_number,
    'total_credit_applied', v_total_credit_applied
  );
END;
$$ LANGUAGE plpgsql;

-- PART 8: Add Return & Leakage Credit Columns to Bills Table
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS return_credit NUMERIC(12, 2) DEFAULT 0;
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS leakage_credit NUMERIC(12, 2) DEFAULT 0;
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS credit_adjusted NUMERIC(12, 2) DEFAULT 0;

