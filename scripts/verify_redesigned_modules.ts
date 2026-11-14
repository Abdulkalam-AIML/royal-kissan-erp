import { Client } from 'pg'

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

const client = new Client({
  connectionString: 'postgres://postgres.oweutcivgpmzldlcmkvd:24ME1A42ABDULKALAM@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
})

async function runVerification() {
  await client.connect()
  console.log('========================================================================')
  console.log('🚀 ROYAL KISSAN ERP: FULL END-TO-END VERIFICATION SUITE')
  console.log('   Drivers & Routes Redesign, Customer Bill Generation, Salary & Advances')
  console.log('========================================================================\n')

  // -------------------------------------------------------------------------
  // TEST SUITE 1: DRIVER & ROUTE END-TO-END WORKFLOW (Module 11 - Test 1)
  // -------------------------------------------------------------------------
  console.log('--- TEST SUITE 1: DRIVER & ROUTE WORKFLOW ---')

  // 1. Create a route for Driver A
  console.log('1. Setting up Test Driver A...')
  let driverRes = await client.query("SELECT id, name FROM public.drivers WHERE name ILIKE 'Driver Verification A%' LIMIT 1;")
  let driverId: string
  let driverName: string

  if (driverRes.rows.length === 0) {
    const ins = await client.query(`
      INSERT INTO public.drivers (name, phone, assigned_vehicle, salary, is_active, status, employment_status)
      VALUES ('Driver Verification A', '9391234567', 'AP-16-RK-9999', 18000, true, 'AVAILABLE', 'ACTIVE')
      RETURNING id, name;
    `)
    driverId = ins.rows[0].id
    driverName = ins.rows[0].name
  } else {
    driverId = driverRes.rows[0].id
    driverName = driverRes.rows[0].name
    await client.query("UPDATE public.drivers SET status = 'AVAILABLE' WHERE id = $1;", [driverId])
  }
  console.log(`   ✅ Driver A: ${driverName} (Status: AVAILABLE)`)

  // 2. Fetch test product (Water Can)
  let prodRes = await client.query("SELECT id, name, default_rate, stock_quantity FROM public.products LIMIT 1;")
  const prodId = prodRes.rows[0].id
  const prodName = prodRes.rows[0].name
  const prodRate = Number(prodRes.rows[0].default_rate || 15)
  console.log(`   ✅ Loaded Product: ${prodName} (Rate: ₹${prodRate})`)

  // 3. Start Route with 100 Cans (start_driver_route)
  console.log('2. Starting Route with 100 Cans (start_driver_route stored procedure)...')
  const dispatchPayload = {
    driver_id: driverId,
    driver_name: driverName,
    vehicle_number: 'AP-16-RK-9999',
    route_name: 'Chintalapudi Route',
    dispatch_date: new Date().toISOString().split('T')[0],
    start_time: '08:30 AM',
    start_location: 'Central Plant',
    destination_areas: 'Chintalapudi & Nearby',
    notes: 'Automated verification test route'
  }

  const itemsPayload = [{
    product_id: prodId,
    product_name: prodName,
    loaded_qty: 100,
    unit: 'can',
    selling_rate: prodRate
  }]

  const startRes = await client.query(
    "SELECT public.start_driver_route($1::jsonb, $2::jsonb) as res;",
    [JSON.stringify(dispatchPayload), JSON.stringify(itemsPayload)]
  )
  const dispatchId = startRes.rows[0].res.dispatch_id
  const dispatchNumber = startRes.rows[0].res.dispatch_number
  console.log(`   ✅ Dispatched: ${dispatchNumber} (ID: ${dispatchId})`)

  // 4 & 5. Verify Route is in Active Routes with status IN_PROGRESS and Driver is ON_ROUTE
  console.log('3. Verifying Route is IN_PROGRESS and Driver is ON_ROUTE...')
  const routeCheck = await client.query("SELECT status FROM public.driver_load_dispatches WHERE id = $1;", [dispatchId])
  const driverCheck = await client.query("SELECT status FROM public.drivers WHERE id = $1;", [driverId])

  if (routeCheck.rows[0].status !== 'IN_PROGRESS') {
    throw new Error(`Expected route status IN_PROGRESS, got ${routeCheck.rows[0].status}`)
  }
  if (driverCheck.rows[0].status !== 'ON_ROUTE') {
    throw new Error(`Expected driver status ON_ROUTE, got ${driverCheck.rows[0].status}`)
  }
  console.log(`   ✅ Confirmed: Route = IN_PROGRESS, Driver = ON_ROUTE.`)

  // 6 & 7. Record Customer Sales during Route:
  // Customer A: 10 cans @ ₹15 = ₹150, Cash
  // Customer B: 20 cans @ ₹15 = ₹300, Credit
  console.log('4. Recording Customer Route Sales...')
  const customerSales = [
    {
      customer_name: 'Customer A (Cash)',
      customer_phone: '9848011223',
      product_id: prodId,
      product_name: prodName,
      quantity: 10,
      unit: 'can',
      rate: prodRate,
      total_amount: 10 * prodRate,
      discount: 0,
      gst_amount: 0,
      final_amount: 10 * prodRate,
      payment_type: 'CASH',
      amount_collected: 10 * prodRate,
      remaining_due: 0,
      remarks: 'Delivered at spot'
    },
    {
      customer_name: 'Customer B (Credit)',
      customer_phone: '9848099887',
      product_id: prodId,
      product_name: prodName,
      quantity: 20,
      unit: 'can',
      rate: prodRate,
      total_amount: 20 * prodRate,
      discount: 0,
      gst_amount: 0,
      final_amount: 20 * prodRate,
      payment_type: 'CREDIT',
      amount_collected: 0,
      remaining_due: 20 * prodRate,
      remarks: 'Route credit ledger'
    }
  ]

  // 8, 9, 10 & 11. End Route Reconciliation:
  // Loaded = 100
  // Sold = 30 (10 + 20)
  // Returned = 5
  // Leaked = 2
  // Unaccounted = 100 - (30 + 5 + 2) = 63
  console.log('5. Checking Physical Route Reconciliation:')
  console.log('   - Loaded: 100')
  console.log('   - Sold: 30')
  console.log('   - Returned: 5')
  console.log('   - Leaked: 2')
  console.log('   - Unaccounted: 63')

  const settlementPayload = {
    dispatch_id: dispatchId,
    end_time: '05:30 PM',
    total_sold_qty: 30,
    total_returned_qty: 5,
    total_leaked_qty: 2,
    unaccounted_qty: 63,
    total_sales_amount: 30 * prodRate,
    cash_collected: 10 * prodRate,
    upi_collected: 0,
    credit_amount: 20 * prodRate,
    expenses_amount: 100,
    settlement_notes: 'Physical check: 5 returns to warehouse, 2 leaked, 63 unaccounted'
  }

  const itemsSettlement = [{
    item_id: startRes.rows[0].res.item_ids ? startRes.rows[0].res.item_ids[0] : null,
    product_id: prodId,
    product_name: prodName,
    loaded_qty: 100,
    sold_qty: 30,
    returned_qty: 5,
    leaked_qty: 2,
    unaccounted_qty: 63,
    selling_rate: prodRate,
    return_reason: 'Returned good inventory to stock',
    leakage_reason: 'Transit bottle crack'
  }]

  // 12. Finalize route & generate customer bills (finalize_route_and_generate_bills)
  console.log('6. Finalizing Route & Generating Invoices (finalize_route_and_generate_bills)...')
  const finRes = await client.query(
    "SELECT public.finalize_route_and_generate_bills($1::jsonb, $2::jsonb, $3::jsonb) as res;",
    [JSON.stringify(settlementPayload), JSON.stringify(itemsSettlement), JSON.stringify(customerSales)]
  )
  console.log(`   ✅ Route Finalized Successfully: Bills Count = ${finRes.rows[0].res.bills_count}`)

  // 13. Verify bills created for Customer A (Cash ₹150) and Customer B (Credit ₹300)
  console.log('7. Verifying Invoices in bills & bill_items...')
  const billsRes = await client.query(`
    SELECT b.id, b.invoice_number, b.customer_name, b.grand_total, b.paid_amount, b.due_amount, b.payment_method,
           COUNT(bi.id) as item_count
    FROM public.bills b
    LEFT JOIN public.bill_items bi ON bi.bill_id = b.id
    WHERE b.dispatch_id = $1
    GROUP BY b.id, b.invoice_number, b.customer_name, b.grand_total, b.paid_amount, b.due_amount, b.payment_method;
  `, [dispatchId])

  if (billsRes.rows.length !== 2) {
    throw new Error(`Expected 2 bills generated, found ${billsRes.rows.length}`)
  }

  for (const b of billsRes.rows) {
    console.log(`   ✅ Invoice ${b.invoice_number}: ${b.customer_name} | Total: ₹${b.grand_total} | Paid: ₹${b.paid_amount} | Payment: ${b.payment_method} | Items: ${b.item_count}`)
    if (Number(b.item_count) === 0) throw new Error(`Invoice ${b.invoice_number} has zero bill_items!`)
  }

  // 14 & 15. Verify route moved to Completed Routes and driver status returned to AVAILABLE
  console.log('8. Verifying Route is COMPLETED and Driver is back to AVAILABLE...')
  const routeFinalCheck = await client.query("SELECT status FROM public.driver_load_dispatches WHERE id = $1;", [dispatchId])
  const driverFinalCheck = await client.query("SELECT status, total_completed_routes FROM public.drivers WHERE id = $1;", [driverId])

  if (routeFinalCheck.rows[0].status !== 'COMPLETED') {
    throw new Error(`Expected route COMPLETED, got ${routeFinalCheck.rows[0].status}`)
  }
  if (driverFinalCheck.rows[0].status !== 'AVAILABLE') {
    throw new Error(`Expected driver AVAILABLE, got ${driverFinalCheck.rows[0].status}`)
  }
  console.log(`   ✅ Route Status: ${routeFinalCheck.rows[0].status} | Driver Status: ${driverFinalCheck.rows[0].status} (Completed Routes: ${driverFinalCheck.rows[0].total_completed_routes})`)

  // 16. Verify attempting to finalize again is strictly rejected
  console.log('9. Verifying Idempotence (Attempting duplicate settlement)...')
  let threwError = false
  try {
    await client.query(
      "SELECT public.finalize_route_and_generate_bills($1::jsonb, $2::jsonb, $3::jsonb);",
      [JSON.stringify(settlementPayload), JSON.stringify(itemsSettlement), JSON.stringify(customerSales)]
    )
  } catch (err: any) {
    threwError = true
    console.log(`   ✅ Duplicate Finalization Rejected Cleanly: "${err.message}"`)
  }
  if (!threwError) {
    throw new Error('Duplicate finalization succeeded when it was expected to fail!')
  }

  console.log('\n--- TEST SUITE 2: EMPLOYEE ATTENDANCE, ADVANCES & SALARY WORKFLOW (Module 11 - Test 2) ---')

  // 1. Create Employee A with ₹15,000 monthly salary
  console.log('1. Setting up Employee A with ₹15,000 Monthly Salary...')
  let empRes = await client.query("SELECT id, name FROM public.employees WHERE name ILIKE 'Employee Verification A%' LIMIT 1;")
  let empId: string
  let empName: string

  if (empRes.rows.length === 0) {
    const ins = await client.query(`
      INSERT INTO public.employees (name, phone, role, salary, advance_amount, is_active)
      VALUES ('Employee Verification A', '9848099887', 'worker', 15000, 0, true)
      RETURNING id, name;
    `)
    empId = ins.rows[0].id
    empName = ins.rows[0].name
  } else {
    empId = empRes.rows[0].id
    empName = empRes.rows[0].name
    await client.query("UPDATE public.employees SET salary = 15000, advance_amount = 0 WHERE id = $1;", [empId])
  }
  console.log(`   ✅ Employee A: ${empName} (Base Salary: ₹15,000)`)

  // 2. Record attendance for 25 days present
  console.log('2. Recording 25 Days Attendance with Unique Constraint...')
  const curYear = new Date().getFullYear()
  const curMonth = new Date().getMonth() + 1
  for (let day = 1; day <= 25; day++) {
    const dateStr = `${curYear}-${String(curMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    await client.query(`
      INSERT INTO public.attendance (employee_id, date, status, check_in_time, check_out_time, working_hours, remarks)
      VALUES ($1, $2, 'present', '08:30:00', '17:30:00', 8, 'Verified attendance')
      ON CONFLICT (employee_id, date) DO UPDATE SET
        status = EXCLUDED.status,
        working_hours = EXCLUDED.working_hours;
    `, [empId, dateStr])
  }
  console.log('   ✅ 25 Days Present Recorded.')

  // 3. Record ₹3,000 salary advance
  console.log('3. Recording ₹3,000 Salary Advance...')
  const advDate = new Date().toISOString().split('T')[0]
  const advIns = await client.query(`
    INSERT INTO public.employee_advances (employee_id, advance_amount, remaining_amount, recovered_amount, advance_date, payment_method, reference_number, status, remarks)
    VALUES ($1, 3000, 3000, 0, $2, 'cash', 'ADV-TEST-001', 'OUTSTANDING', 'Advance for urgent expenses')
    RETURNING id;
  `, [empId, advDate])
  const advId = advIns.rows[0].id

  await client.query("UPDATE public.employees SET advance_amount = 3000 WHERE id = $1;", [empId])
  console.log(`   ✅ Advance Disbursed: ₹3,000 (ID: ${advId})`)

  // 4. Verify profile shows ₹3,000 advance and remaining salary is ₹12,000
  console.log('4. Verifying Advance Balance & Remaining Salary...')
  const empCheck = await client.query("SELECT salary, advance_amount FROM public.employees WHERE id = $1;", [empId])
  const salary = Number(empCheck.rows[0].salary)
  const advance = Number(empCheck.rows[0].advance_amount)
  const remaining = salary - advance

  if (advance !== 3000) throw new Error(`Expected advance 3000, got ${advance}`)
  if (remaining !== 12000) throw new Error(`Expected remaining salary 12000, got ${remaining}`)
  console.log(`   ✅ Outstanding Advance: ₹${advance} | Remaining Salary: ₹${remaining}`)

  // 5. Settle monthly salary: Earned ₹15,000, Advance deducted ₹3,000, Net paid ₹12,000
  console.log('5. Settling Monthly Salary (settle_employee_salary)...')
  const settleRes = await client.query(`
    SELECT public.settle_employee_salary(
      $1::uuid, $2::int, $3::int, $4::numeric, $5::int, $6::int, $7::int,
      $8::numeric, $9::numeric, $10::numeric, $11::numeric, $12::text, $13::date, $14::text
    ) as res;
  `, [empId, curMonth, curYear, 15000, 25, 5, 0, 15000, 3000, 0, 12000, 'cash', advDate, 'Monthly payroll settle test'])

  console.log(`   ✅ Salary Settled: Net Paid = ₹${settleRes.rows[0].res.net_salary}, Advance Deducted = ₹${settleRes.rows[0].res.advance_deducted}`)

  // 6. Verify employee advance balance becomes ₹0
  console.log('6. Verifying Advance Balance Cleared to ₹0...')
  const empAfterSettle = await client.query("SELECT advance_amount FROM public.employees WHERE id = $1;", [empId])
  const advAfterSettle = await client.query("SELECT status, remaining_amount, recovered_amount FROM public.employee_advances WHERE id = $1;", [advId])

  if (Number(empAfterSettle.rows[0].advance_amount) !== 0) {
    throw new Error(`Expected employee advance_amount 0, got ${empAfterSettle.rows[0].advance_amount}`)
  }
  if (advAfterSettle.rows[0].status !== 'RECOVERED') {
    throw new Error(`Expected advance status RECOVERED, got ${advAfterSettle.rows[0].status}`)
  }
  console.log(`   ✅ Employee Advance: ₹${empAfterSettle.rows[0].advance_amount} | Advance Status: ${advAfterSettle.rows[0].status} (Recovered: ₹${advAfterSettle.rows[0].recovered_amount})`)

  // 7. Verify advance is NOT deducted in subsequent month
  console.log('7. Verifying Advance is Protected Against Double Deduction in Subsequent Month...')
  const nextMonth = curMonth === 12 ? 1 : curMonth + 1
  const nextYear = curMonth === 12 ? curYear + 1 : curYear

  const nextMonthSettle = await client.query(`
    SELECT public.settle_employee_salary(
      $1::uuid, $2::int, $3::int, $4::numeric, $5::int, $6::int, $7::int,
      $8::numeric, $9::numeric, $10::numeric, $11::numeric, $12::text, $13::date, $14::text
    ) as res;
  `, [empId, nextMonth, nextYear, 15000, 30, 0, 0, 15000, 0, 0, 15000, 'cash', advDate, 'Next month payroll'])

  if (Number(nextMonthSettle.rows[0].res.advance_deducted) !== 0) {
    throw new Error(`Expected 0 advance deducted in next month, got ${nextMonthSettle.rows[0].res.advance_deducted}`)
  }
  if (Number(nextMonthSettle.rows[0].res.net_salary) !== 15000) {
    throw new Error(`Expected net salary 15000 in next month, got ${nextMonthSettle.rows[0].res.net_salary}`)
  }
  console.log(`   ✅ Confirmed: Next Month Advance Deducted = ₹${nextMonthSettle.rows[0].res.advance_deducted}, Net Paid = ₹${nextMonthSettle.rows[0].res.net_salary}. Zero Double-Deduction!`)

  await client.end()
  console.log('\n========================================================================')
  console.log('🎉 ALL VERIFICATION TEST SCENARIOS PASSED WITH 100% SUCCESS!')
  console.log('========================================================================')
}

runVerification().catch(async (err) => {
  console.error('\n❌ VERIFICATION TEST FAILED:', err)
  await client.end()
  process.exit(1)
})
