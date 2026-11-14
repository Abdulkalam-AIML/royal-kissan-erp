import { Client } from 'pg'

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
const client = new Client({
  connectionString: 'postgres://postgres.oweutcivgpmzldlcmkvd:24ME1A42ABDULKALAM@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
})

async function test() {
  await client.connect()
  console.log('Connected to PostgreSQL.')

  // 1. Get or create a test driver
  let driverRes = await client.query("SELECT id, name FROM public.drivers WHERE is_active = true LIMIT 1;")
  let driverId: string
  let driverName: string

  if (driverRes.rows.length === 0) {
    const ins = await client.query(`
      INSERT INTO public.drivers (name, phone, vehicle_number, salary, is_active, status)
      VALUES ('Chintalapudi Driver Test', '9848011223', 'AP 16 AB 9999', 18000, true, 'AVAILABLE')
      RETURNING id, name;
    `)
    driverId = ins.rows[0].id
    driverName = ins.rows[0].name
  } else {
    driverId = driverRes.rows[0].id
    driverName = driverRes.rows[0].name
  }

  // 2. Get a test product
  let prodRes = await client.query("SELECT id, name, default_rate, stock_quantity FROM public.products LIMIT 1;")
  const prodId = prodRes.rows[0].id
  const prodName = prodRes.rows[0].name
  const prodRate = Number(prodRes.rows[0].default_rate || 70)

  console.log(`Driver: ${driverName} (${driverId}), Product: ${prodName} (${prodId})`)

  // 3. Test start_driver_route RPC
  const dispatchPayload = {
    driver_id: driverId,
    driver_name: driverName,
    vehicle_number: 'AP 16 AB 9999',
    route_name: 'Chintalapudi Route',
    dispatch_date: new Date().toISOString().split('T')[0],
    start_time: '08:30 AM',
    start_location: 'Main Factory Plant',
    destination_areas: 'Chintalapudi Town & Rural',
    notes: 'Test active route'
  }

  const itemsPayload = [
    {
      product_id: prodId,
      product_name: prodName,
      unit: 'cans',
      loaded_quantity: 100,
      rate: prodRate,
      amount: 100 * prodRate
    }
  ]

  console.log('Testing start_driver_route...')
  const startRes = await client.query(
    'SELECT public.start_driver_route($1, $2) as res;',
    [JSON.stringify(dispatchPayload), JSON.stringify(itemsPayload)]
  )
  const dispatchData = startRes.rows[0].res
  console.log('Route Started successfully! Dispatch Number:', dispatchData.dispatch_number, 'Status:', dispatchData.status)

  // Verify driver is ON_ROUTE
  const drvCheck = await client.query('SELECT status FROM public.drivers WHERE id = $1;', [driverId])
  console.log('Driver status in DB:', drvCheck.rows[0].status)

  // 4. Record Customer Sales on this route
  const customerSales = [
    {
      customer_name: 'Customer A (Hotel Swagath)',
      customer_phone: '9391234567',
      product_name: prodName,
      quantity: 2,
      unit: 'cans',
      rate: prodRate,
      total_amount: 2 * prodRate,
      paid_amount: 2 * prodRate,
      cash_paid: 2 * prodRate,
      upi_paid: 0,
      payment_method: 'CASH'
    },
    {
      customer_name: 'Customer B (Kirana Store)',
      customer_phone: '9848098765',
      product_name: prodName,
      quantity: 5,
      unit: 'cans',
      rate: prodRate,
      total_amount: 5 * prodRate,
      paid_amount: 0,
      cash_paid: 0,
      upi_paid: 0,
      payment_method: 'CREDIT'
    }
  ]

  // 5. Test finalize_route_and_generate_bills RPC
  const settlementPayload = {
    load_dispatch_id: dispatchData.id,
    driver_id: driverId,
    route_name: 'Chintalapudi Route',
    settlement_date: new Date().toISOString().split('T')[0],
    total_loaded_qty: 100,
    total_sold_qty: 7,
    total_returned_qty: 90,
    total_leaked_qty: 3,
    unaccounted_qty: 0,
    cash_collected: 2 * prodRate,
    upi_collected: 0,
    credit_sales_amount: 5 * prodRate,
    route_expenses_amount: 200,
    expected_collection: 7 * prodRate,
    actual_collection: 2 * prodRate,
    collection_difference: 0,
    discrepancy_reason: null,
    confirmed_by: 'Operations Supervisor'
  }

  const settlementItems = [
    {
      product_id: prodId,
      product_name: prodName,
      loaded_qty: 100,
      sold_qty: 7,
      returned_good_qty: 90,
      leaked_damaged_qty: 3,
      rate: prodRate,
      condition: 'good'
    }
  ]

  console.log('Testing finalize_route_and_generate_bills...')
  const finalizeRes = await client.query(
    'SELECT public.finalize_route_and_generate_bills($1, $2, $3) as res;',
    [JSON.stringify(settlementPayload), JSON.stringify(settlementItems), JSON.stringify(customerSales)]
  )
  const settlementData = finalizeRes.rows[0].res
  console.log('Route Finalized! Settlement Number:', settlementData.settlement_number, 'Bills Generated:', settlementData.bills_generated_count)

  // Verify bills created in bills table
  const billsRes = await client.query('SELECT invoice_number, customer_name, grand_total, due_amount FROM public.bills WHERE dispatch_id = $1;', [dispatchData.id])
  console.log('Generated Bills in DB:', billsRes.rows)

  // Verify driver status is back to AVAILABLE
  const drvAfter = await client.query('SELECT status, total_completed_routes FROM public.drivers WHERE id = $1;', [driverId])
  console.log('Driver status after route end:', drvAfter.rows[0].status, 'Completed routes:', drvAfter.rows[0].total_completed_routes)

  // Clean up test data
  console.log('Cleaning up test run...')
  await client.query('DELETE FROM public.bill_items WHERE bill_id IN (SELECT id FROM public.bills WHERE dispatch_id = $1);', [dispatchData.id])
  await client.query('DELETE FROM public.bills WHERE dispatch_id = $1;', [dispatchData.id])
  await client.query('DELETE FROM public.driver_route_settlement_items WHERE settlement_id = $1;', [settlementData.id])
  await client.query('DELETE FROM public.driver_route_settlements WHERE id = $1;', [settlementData.id])
  await client.query('DELETE FROM public.driver_load_items WHERE load_dispatch_id = $1;', [dispatchData.id])
  await client.query('DELETE FROM public.driver_load_dispatches WHERE id = $1;', [dispatchData.id])
  console.log('Cleaned up successfully!')

  await client.end()
}

test().catch(err => {
  console.error('Test error:', err)
  process.exit(1)
})
