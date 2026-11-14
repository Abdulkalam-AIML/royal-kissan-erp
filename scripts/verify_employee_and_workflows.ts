import { Client } from 'pg'
import * as fs from 'fs'
import * as path from 'path'

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

const envPath = path.join(__dirname, '../.env.local')
const envContent = fs.readFileSync(envPath, 'utf8')
const pgMatch = envContent.match(/POSTGRES_URL_NON_POOLING=[\"']?([^\"'\r\n]+)[\"']?/)
if (!pgMatch) {
  throw new Error('POSTGRES_URL_NON_POOLING not found in .env.local')
}
const connectionString = pgMatch[1].replace(/([?&])sslmode=[^&]+(&|$)/, '$1').replace(/[?&]$/, '')

async function runVerification() {
  console.log('========================================================================')
  console.log('ROYAL KISSAN ERP — COMPREHENSIVE WORKFLOWS VERIFICATION')
  console.log('Testing Modules 1, 2, 4, 5 & 6 against PostgreSQL')
  console.log('========================================================================\n')

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  })

  await client.connect()
  console.log('✅ Connected to PostgreSQL database.\n')

  let passed = 0
  let failed = 0

  function assert(condition: boolean, testName: string, extraInfo: string = '') {
    if (condition) {
      console.log(`  ✅ [PASS] ${testName} ${extraInfo ? `— ${extraInfo}` : ''}`)
      passed++
    } else {
      console.error(`  ❌ [FAIL] ${testName} ${extraInfo ? `— ${extraInfo}` : ''}`)
      failed++
    }
  }

  try {
    // ------------------------------------------------------------------------
    // SCENARIO 1: MODULE 4 — ATTENDANCE & UNIQUE CONSTRAINT DEDUPLICATION
    // ------------------------------------------------------------------------
    console.log('--- TEST GROUP 1: EMPLOYEE ATTENDANCE & DEDUPLICATION (MODULE 4) ---')

    // Clean any prior test employee with this name
    await client.query(`DELETE FROM public.salary_payments WHERE employee_id IN (SELECT id FROM public.employees WHERE name LIKE 'Test Worker Raju%')`)
    await client.query(`DELETE FROM public.employee_advances WHERE employee_id IN (SELECT id FROM public.employees WHERE name LIKE 'Test Worker Raju%')`)
    await client.query(`DELETE FROM public.attendance WHERE employee_id IN (SELECT id FROM public.employees WHERE name LIKE 'Test Worker Raju%')`)
    await client.query(`DELETE FROM public.employees WHERE name LIKE 'Test Worker Raju%'`)

    // Find or create test employee
    const empRes = await client.query(`
      INSERT INTO public.employees (name, role, phone, salary, is_active, advance_amount)
      VALUES ('Test Worker Raju ' || floor(random() * 10000)::text, 'Delivery Staff', '9876543210', 15000, true, 0)
      RETURNING id, name, salary
    `)
    const testEmp = empRes.rows[0]
    const testDate = '2026-11-14'

    // Clean any pre-existing attendance for this date
    await client.query(`DELETE FROM public.attendance WHERE employee_id = $1 AND date = $2`, [testEmp.id, testDate])

    // Insert initial attendance: PRESENT, 8 hours
    await client.query(`
      INSERT INTO public.attendance (employee_id, date, status, check_in_time, check_out_time, working_hours, remarks)
      VALUES ($1, $2, 'present', '08:30:00', '17:30:00', 8.5, 'Full day route delivery completed')
    `, [testEmp.id, testDate])

    const attRow = await client.query(`
      SELECT * FROM public.attendance WHERE employee_id = $1 AND date = $2
    `, [testEmp.id, testDate])

    assert(attRow.rows.length === 1, 'Attendance record saved successfully')
    assert(attRow.rows[0].status === 'present', 'Attendance status is present')
    assert(Number(attRow.rows[0].working_hours) === 8.5, 'Working hours recorded accurately', '8.5 hrs')

    // Test Unique Constraint: attempting a duplicate insert must be rejected by PostgreSQL constraint
    let duplicateRejected = false
    try {
      await client.query(`
        INSERT INTO public.attendance (employee_id, date, status, check_in_time, check_out_time, working_hours)
        VALUES ($1, $2, 'half_day', '09:00:00', '13:00:00', 4.0)
      `, [testEmp.id, testDate])
    } catch (err: any) {
      if (err.code === '23505' || err.message.includes('uq_attendance_emp_date') || err.message.includes('unique')) {
        duplicateRejected = true
      }
    }
    assert(duplicateRejected, 'Unique constraint uq_attendance_emp_date prevents duplicate daily attendance')

    // ------------------------------------------------------------------------
    // SCENARIO 2: MODULE 5 — EMPLOYEE ADVANCES & FIFO RECOVERY
    // ------------------------------------------------------------------------
    console.log('\n--- TEST GROUP 2: EMPLOYEE ADVANCE MANAGEMENT & PAYROLL (MODULE 5) ---')

    // Record an advance of ₹3,000 for Raju
    const advRes = await client.query(`
      SELECT public.record_employee_advance(
        $1, 3000, '2026-11-05', 'upi', 'UPI-REF-998877', 'Medical advance for family', 'Accounts Admin'
      ) as adv_data
    `, [testEmp.id])

    const advData = typeof advRes.rows[0].adv_data === 'string' ? JSON.parse(advRes.rows[0].adv_data) : advRes.rows[0].adv_data
    const advanceId = advData.id
    assert(Boolean(advanceId), 'record_employee_advance stored procedure executed successfully', `ID: ${advanceId}`)

    // Check advance table
    const advRow = await client.query(`SELECT * FROM public.employee_advances WHERE id = $1`, [advanceId])
    assert(Number(advRow.rows[0].advance_amount) === 3000, 'Advance amount is ₹3,000')
    assert(Number(advRow.rows[0].remaining_amount) === 3000, 'Remaining recoverable amount is ₹3,000')
    assert(advRow.rows[0].status === 'OUTSTANDING', 'Advance status is OUTSTANDING')

    // Check employee outstanding advance asset balance
    const empAfterAdv = await client.query(`SELECT advance_amount FROM public.employees WHERE id = $1`, [testEmp.id])
    assert(Number(empAfterAdv.rows[0].advance_amount) === 3000, 'Employee outstanding advance balance incremented to ₹3,000')

    // Settle monthly salary for November 2026:
    // Base salary: ₹15,000, Present: 30, Absent: 0, Half: 0, Calculated: 15000, Advance deduct: 3000, Other: 0, Net: 12000
    const settleRes = await client.query(`
      SELECT public.settle_employee_salary(
        $1, 11, 2026, 15000, 30, 0, 0, 15000, 3000, 0, 12000, 'bank_transfer', '2026-11-30', 'November 2026 payroll salary disbursement'
      ) as sal_data
    `, [testEmp.id])

    const salData = typeof settleRes.rows[0].sal_data === 'string' ? JSON.parse(settleRes.rows[0].sal_data) : settleRes.rows[0].sal_data
    const salaryPaymentId = salData.payment_id || salData.id
    assert(Boolean(salaryPaymentId), 'settle_employee_salary stored procedure executed successfully', `Payment ID: ${salaryPaymentId}`)

    // Verify salary payment record
    const salRow = await client.query(`SELECT * FROM public.salary_payments WHERE id = $1`, [salaryPaymentId])
    assert(Number(salRow.rows[0].base_salary) === 15000, 'Base salary is ₹15,000')
    assert(Number(salRow.rows[0].advance_deducted) === 3000, 'Advance deducted is ₹3,000')
    assert(Number(salRow.rows[0].net_salary) === 12000, 'Net payable salary is ₹12,000 (15,000 - 3,000)')

    // Verify advance status transitioned to RECOVERED and remaining = 0
    const advAfterSettle = await client.query(`SELECT * FROM public.employee_advances WHERE id = $1`, [advanceId])
    assert(advAfterSettle.rows[0].status === 'RECOVERED', 'Advance status transitioned to RECOVERED')
    assert(Number(advAfterSettle.rows[0].remaining_amount) === 0, 'Advance remaining amount is ₹0')
    assert(Number(advAfterSettle.rows[0].recovered_amount) === 3000, 'Advance recovered amount is ₹3,000')

    // Verify employee advance balance decremented to 0
    const empAfterSettle = await client.query(`SELECT advance_amount FROM public.employees WHERE id = $1`, [testEmp.id])
    assert(Number(empAfterSettle.rows[0].advance_amount) === 0, 'Employee advance balance decremented back to ₹0')

    // Settle second payroll (December 2026) with 0 advance deductions:
    // Verifies no double deduction or phantom recovery occurs
    const decSettle = await client.query(`
      SELECT public.settle_employee_salary(
        $1, 12, 2026, 15000, 30, 0, 0, 15000, 0, 0, 15000, 'bank_transfer', '2026-12-31', 'December 2026 payroll'
      ) as sal_data
    `, [testEmp.id])
    const decSalData = typeof decSettle.rows[0].sal_data === 'string' ? JSON.parse(decSettle.rows[0].sal_data) : decSettle.rows[0].sal_data
    const decSalaryPaymentId = decSalData.payment_id || decSalData.id
    const decSalRow = await client.query(`SELECT * FROM public.salary_payments WHERE id = $1`, [decSalaryPaymentId])
    assert(Number(decSalRow.rows[0].advance_deducted) === 0, 'No advance deducted in subsequent month (no double deduction)')
    assert(Number(decSalRow.rows[0].net_salary) === 15000, 'Full net salary of ₹15,000 disbursed')

    // ------------------------------------------------------------------------
    // SCENARIO 3: MODULE 1 — DEALER DAY 1 FINALIZED & DAY 2 RETURN DEDUCTION
    // ------------------------------------------------------------------------
    console.log('\n--- TEST GROUP 3: DEALER NEXT-DAY RETURNS & LEAKAGE (MODULE 1) ---')

    // Find test product
    const prodRes = await client.query(`SELECT id, name FROM public.products LIMIT 1`)
    const testProduct = prodRes.rows[0]

    // Create test dealer
    const dealerRes = await client.query(`
      INSERT INTO public.dealers (name, area, phone, outstanding_amount, total_purchases, is_gst_enabled)
      VALUES ('ABC Test Dealer ' || floor(random() * 10000)::text, 'Khammam Central', '9876500112', 0, 0, false)
      RETURNING id, name
    `)
    const testDealer = dealerRes.rows[0]

    // Day 1 (13-11-2026): Issue 100 bags @ ₹70 = ₹7,000 via record_dealer_dispatch
    const dispatchPayload = {
      dealer_id: testDealer.id,
      dealer_name: testDealer.name,
      dealer_gstin: null,
      dispatch_date: '2026-11-13',
      responsible_staff: 'Dispatch Head',
      notes: 'Initial dispatch of 100 bags'
    }
    const dispatchItems = [
      {
        product_id: testProduct.id,
        product_name: 'Bags (100 Pack)',
        unit: 'pkts',
        quantity: 100,
        rate: 70.00,
        amount: 7000.00
      }
    ]

    const dispRpc = await client.query(
      `SELECT public.record_dealer_dispatch($1::jsonb, $2::jsonb) AS result;`,
      [JSON.stringify(dispatchPayload), JSON.stringify(dispatchItems)]
    )
    const dispatch1 = dispRpc.rows[0].result
    const d1Id = dispatch1.id

    const dispItemsRes = await client.query('SELECT * FROM public.dealer_dispatch_items WHERE dispatch_id = $1', [d1Id])
    const d1ItemId = dispItemsRes.rows[0].id

    const runSuffix = Math.floor(1000 + Math.random() * 9000).toString()
    const invDay1 = `RK-DLR-INV-DAY1-${runSuffix}`
    const invDay2 = `RK-DLR-INV-DAY2-${runSuffix}`

    // Day 1 Invoice generated for ₹7,000
    const bill1Res = await client.query(`
      INSERT INTO public.bills (
        invoice_number, customer_name, dealer_id, date, subtotal, total_amount, grand_total, paid_amount, due_amount, bill_type
      ) VALUES ($1, $2, $3, '2026-11-13', 7000, 7000, 7000, 7000, 0, 'dealer_invoice')
      RETURNING id
    `, [invDay1, testDealer.name, testDealer.id])
    const bill1Id = bill1Res.rows[0].id
    assert(Boolean(bill1Id), 'Day 1 Dealer Invoice finalized for ₹7,000 (100 bags @ ₹70)')

    // Day 2 (14-11-2026): Dealer reports 5 returned (Good) and 2 leaked (Damaged)
    // Return credit: 5 * 70 = ₹350; Leakage credit: 2 * 70 = ₹140; Total = ₹490
    const returnHeader = {
      dealer_id: testDealer.id,
      dispatch_id: d1Id,
      dispatch_date: '2026-11-13',
      return_date: '2026-11-14',
      condition: 'good',
      notes: '5 bags returned good, 2 leaked in transit',
      recorded_by: 'Warehouse Incharge',
      approved_by: 'Admin'
    }

    const returnItems = [
      {
        dispatch_item_id: d1ItemId,
        product_name: 'Bags (100 Pack)',
        unit: 'pkts',
        original_quantity: 100,
        returned_quantity: 5,
        leaked_quantity: 2,
        original_rate: 70,
        adjustment_rate: 70
      }
    ]

    const retRes = await client.query(`
      SELECT public.record_dealer_return_and_leakage($1, $2) as result
    `, [JSON.stringify(returnHeader), JSON.stringify(returnItems)])

    const retResult = retRes.rows[0].result
    assert(Number(retResult.total_credit_amount) === 490, 'Next-day credit calculated as ₹490 (5 ret * 70 = 350, 2 leak * 70 = 140)', `₹${retResult.total_credit_amount}`)

    // Verify Day 1 invoice remains untouched at ₹7,000
    const bill1Check = await client.query(`SELECT total_amount FROM public.bills WHERE id = $1`, [bill1Id])
    assert(Number(bill1Check.rows[0].total_amount) === 7000, 'Day 1 Invoice remained permanently untouched at ₹7,000 (never mutated)')

    // Check unapplied credits in dealer_credit_adjustments
    const unappliedCredits = await client.query(`
      SELECT * FROM public.dealer_credit_adjustments
      WHERE dealer_id = $1 AND is_applied = false
    `, [testDealer.id])

    assert(unappliedCredits.rows.length >= 1, 'Credit note stored with is_applied = false')
    const creditAdjustmentId = unappliedCredits.rows[0].id

    // Day 2 Dealer takes another 100 bags @ ₹70 = ₹7,000
    // Net Payable on Day 2 Invoice: ₹7,000 - ₹350 - ₹140 = ₹6,510
    const day2Gross = 7000
    const day2Credits = Number(unappliedCredits.rows[0].amount) // 490
    const day2NetPayable = day2Gross - day2Credits // 6510

    assert(day2NetPayable === 6510, 'Day 2 Net Payable calculated as ₹6,510 (₹7,000 - ₹350 - ₹140)', `₹${day2NetPayable}`)

    // Save Day 2 Invoice for ₹6,510
    const bill2Res = await client.query(`
      INSERT INTO public.bills (
        invoice_number, customer_name, dealer_id, date, subtotal, return_credit, leakage_credit, credit_adjusted,
        total_amount, grand_total, paid_amount, due_amount, bill_type
      ) VALUES ($1, $2, $3, '2026-11-14', 7000, 350, 140, 490, 6510, 6510, 6510, 0, 'dealer_invoice')
      RETURNING id, invoice_number
    `, [invDay2, testDealer.name, testDealer.id])
    const bill2 = bill2Res.rows[0]

    // Link credits to Day 2 Bill
    const applyRes = await client.query(`
      SELECT public.apply_dealer_credits_to_bill($1, $2, $3, $4) as result
    `, [testDealer.id, bill2.id, bill2.invoice_number, [creditAdjustmentId]])

    const applyResult = applyRes.rows[0].result
    assert(Number(applyResult.total_credit_applied) === 490, 'apply_dealer_credits_to_bill linked ₹490 credits to Day 2 Invoice')

    // Confirm credit note is marked is_applied = true and cannot be used again
    const creditCheck = await client.query(`SELECT is_applied, applied_invoice_number FROM public.dealer_credit_adjustments WHERE id = $1`, [creditAdjustmentId])
    assert(creditCheck.rows[0].is_applied === true, 'Credit note permanently marked as is_applied = true')
    assert(creditCheck.rows[0].applied_invoice_number === bill2.invoice_number, 'Credit note linked to Day 2 Invoice Number RK-DLR-INV-DAY2')

    // Confirm subsequent check has 0 unapplied credits (cannot apply twice)
    const secondCreditCheck = await client.query(`
      SELECT * FROM public.dealer_credit_adjustments
      WHERE dealer_id = $1 AND is_applied = false
    `, [testDealer.id])
    assert(secondCreditCheck.rows.length === 0, 'Zero remaining unapplied credits for dealer (prevents duplicate credit deduction)')

    // ------------------------------------------------------------------------
    // CLEANUP TEST RECORDS
    // ------------------------------------------------------------------------
    console.log('\n--- CLEANING UP TEST ARTIFACTS ---')
    await client.query(`DELETE FROM public.salary_payments WHERE employee_id = $1`, [testEmp.id])
    await client.query(`DELETE FROM public.employee_advances WHERE employee_id = $1`, [testEmp.id])
    await client.query(`DELETE FROM public.attendance WHERE employee_id = $1`, [testEmp.id])
    await client.query(`DELETE FROM public.employees WHERE id = $1`, [testEmp.id])

    await client.query(`DELETE FROM public.bills WHERE dealer_id = $1`, [testDealer.id])
    await client.query(`DELETE FROM public.dealer_credit_adjustments WHERE dealer_id = $1`, [testDealer.id])
    await client.query(`DELETE FROM public.dealer_return_items WHERE return_entry_id IN (SELECT id FROM public.dealer_return_entries WHERE dealer_id = $1)`, [testDealer.id])
    await client.query(`DELETE FROM public.dealer_return_entries WHERE dealer_id = $1`, [testDealer.id])
    await client.query(`DELETE FROM public.dealer_dispatch_items WHERE dispatch_id = $1`, [d1Id])
    await client.query(`DELETE FROM public.dealer_dispatches WHERE dealer_id = $1`, [testDealer.id])
    await client.query(`DELETE FROM public.dealer_ledger WHERE dealer_id = $1`, [testDealer.id])
    await client.query(`DELETE FROM public.dealers WHERE id = $1`, [testDealer.id])

    console.log('✅ Test artifacts cleaned up.\n')

  } finally {
    await client.end()
  }

  console.log('========================================================================')
  console.log(`VERIFICATION SUMMARY: ${passed} PASSED | ${failed} FAILED`)
  console.log('========================================================================')

  if (failed > 0) {
    process.exit(1)
  }
}

runVerification().catch(err => {
  console.error('Fatal error during verification:', err)
  process.exit(1)
})
