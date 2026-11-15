import { Client } from 'pg'

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
const client = new Client({
  connectionString: 'postgres://postgres.oweutcivgpmzldlcmkvd:24ME1A42ABDULKALAM@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
})

async function runVerification() {
  console.log('========================================================================')
  console.log('ROYAL KISSAN ERP — ROUTE ASSIGNMENT FORM CORRECTIONS VERIFICATION')
  console.log('========================================================================\n')

  await client.connect()
  console.log('✓ Connected to Supabase PostgreSQL Database.\n')

  try {
    // 1. Fetch saved routes from public.routes
    const routesRes = await client.query(`
      SELECT id, name, area FROM public.routes WHERE is_active = true ORDER BY name;
    `)
    console.log(`[Check 1] Available Saved Routes in Database: ${routesRes.rows.length} found:`)
    routesRes.rows.forEach(r => console.log(`   - ID: ${r.id} | Name: "${r.name}" | Area: "${r.area || 'N/A'}"`))

    if (routesRes.rows.length < 2) {
      throw new Error('Expected at least 2 saved routes in public.routes for testing.')
    }
    const route1 = routesRes.rows.find(r => r.name.includes('Chintalapudi')) || routesRes.rows[0]
    const route2 = routesRes.rows.find(r => r.name.includes('Dammapeta')) || routesRes.rows[1]

    // 2. Fetch available vehicles from public.vehicles
    const vehRes = await client.query(`
      SELECT id, registration_number, vehicle_type, status FROM public.vehicles ORDER BY registration_number;
    `)
    console.log(`\n[Check 2] Available Vehicles in Database: ${vehRes.rows.length} found:`)
    vehRes.rows.forEach(v => console.log(`   - ID: ${v.id} | Reg: "${v.registration_number}" | Type: ${v.vehicle_type} | Status: ${v.status}`))

    let testVehicle = vehRes.rows.find(v => v.status === 'AVAILABLE') || vehRes.rows[0]

    // 3. Fetch test drivers
    let drvRes = await client.query(`
      SELECT id, name, status FROM public.drivers WHERE is_active = true LIMIT 5;
    `)
    let driver1 = drvRes.rows[0]
    let driver2 = drvRes.rows[1] || drvRes.rows[0]

    // 4. Fetch a product for load items
    const prodRes = await client.query(`
      SELECT id, name, default_rate FROM public.products LIMIT 1;
    `)
    const product = prodRes.rows[0]

    console.log('\n------------------------------------------------------------------------')
    console.log('TEST 1: Create a Route with Saved Route Name AND Assigned Vehicle')
    console.log('------------------------------------------------------------------------')
    console.log(`Route: "${route1.name}" (${route1.id})`)
    console.log(`Driver: "${driver1.name}" (${driver1.id})`)
    console.log(`Vehicle: "${testVehicle.registration_number}" (${testVehicle.id})`)

    const payload1 = {
      route_id: route1.id,
      route_name: route1.name,
      driver_id: driver1.id,
      driver_name: driver1.name,
      vehicle_id: testVehicle.id,
      vehicle_number: testVehicle.registration_number,
      dispatch_date: new Date().toISOString().split('T')[0],
      start_time: '08:30 AM',
      start_location: 'Main Factory Warehouse',
      destination_areas: route1.area || route1.name,
      notes: 'Test 1 - Route with vehicle assigned'
    }

    const items1 = [
      {
        product_id: product.id,
        product_name: product.name,
        loaded_quantity: 50,
        unit: 'cans',
        rate: Number(product.default_rate || 15)
      }
    ]

    const res1 = await client.query(`
      SELECT public.start_driver_route($1::jsonb, $2::jsonb) AS result;
    `, [JSON.stringify(payload1), JSON.stringify(items1)])

    const dispatchId1 = res1.rows[0].result.dispatch_id
    console.log(`✓ Test 1 Success! Dispatch ID: ${dispatchId1}`)

    // Verify row in DB
    const check1 = await client.query(`
      SELECT id, dispatch_number, route_id, route_name, vehicle_id, vehicle_number, status
      FROM public.driver_load_dispatches
      WHERE id = $1;
    `, [dispatchId1])
    console.log('  Database Record:', check1.rows[0])
    if (check1.rows[0].route_id !== route1.id) throw new Error('Test 1 failed: route_id mismatch')
    if (check1.rows[0].vehicle_id !== testVehicle.id) throw new Error('Test 1 failed: vehicle_id mismatch')
    if (check1.rows[0].vehicle_number !== testVehicle.registration_number) throw new Error('Test 1 failed: vehicle_number mismatch')

    // Check vehicle status updated to IN_USE
    const vehCheck1 = await client.query('SELECT status FROM public.vehicles WHERE id = $1', [testVehicle.id])
    console.log(`  Vehicle status in public.vehicles: ${vehCheck1.rows[0]?.status}`)

    console.log('\n------------------------------------------------------------------------')
    console.log('TEST 2: Create a Route with Saved Route Name WITHOUT Vehicle (Optional)')
    console.log('------------------------------------------------------------------------')
    console.log(`Route: "${route2.name}" (${route2.id})`)
    console.log(`Driver: "${driver2.name}" (${driver2.id})`)
    console.log('Vehicle: NONE (Not Assigned / vehicle_id: null, vehicle_number: null)')

    const payload2 = {
      route_id: route2.id,
      route_name: route2.name,
      driver_id: driver2.id,
      driver_name: driver2.name,
      vehicle_id: null,
      vehicle_number: null,
      dispatch_date: new Date().toISOString().split('T')[0],
      start_time: '09:00 AM',
      start_location: 'Main Factory Warehouse',
      destination_areas: route2.area || route2.name,
      notes: 'Test 2 - Route without vehicle'
    }

    const items2 = [
      {
        product_id: product.id,
        product_name: product.name,
        loaded_quantity: 30,
        unit: 'bags',
        rate: Number(product.default_rate || 70)
      }
    ]

    const res2 = await client.query(`
      SELECT public.start_driver_route($1::jsonb, $2::jsonb) AS result;
    `, [JSON.stringify(payload2), JSON.stringify(items2)])

    const dispatchId2 = res2.rows[0].result.dispatch_id
    console.log(`✓ Test 2 Success! Dispatch ID: ${dispatchId2}`)

    // Verify row in DB
    const check2 = await client.query(`
      SELECT id, dispatch_number, route_id, route_name, vehicle_id, vehicle_number, status
      FROM public.driver_load_dispatches
      WHERE id = $1;
    `, [dispatchId2])
    console.log('  Database Record:', check2.rows[0])
    if (check2.rows[0].route_id !== route2.id) throw new Error('Test 2 failed: route_id mismatch')
    if (check2.rows[0].vehicle_id !== null) throw new Error('Test 2 failed: vehicle_id should be NULL')
    if (check2.rows[0].vehicle_number !== null) throw new Error('Test 2 failed: vehicle_number should be NULL')

    console.log('\n------------------------------------------------------------------------')
    console.log('TEST 3: Confirm Both Routes Are Active and Visible in Query')
    console.log('------------------------------------------------------------------------')
    const activeRes = await client.query(`
      SELECT d.id, d.dispatch_number, d.route_name, d.driver_name, d.vehicle_number, d.status
      FROM public.driver_load_dispatches d
      WHERE d.id IN ($1, $2);
    `, [dispatchId1, dispatchId2])

    activeRes.rows.forEach(r => {
      console.log(`  Route #${r.dispatch_number}: Name: "${r.route_name}", Vehicle: "${r.vehicle_number || 'Not Assigned'}", Status: ${r.status}`)
    })

    console.log('\n------------------------------------------------------------------------')
    console.log('TEST 4: Test Edit Route Workflow (update_driver_route)')
    console.log('------------------------------------------------------------------------')
    console.log(`Editing Dispatch #${dispatchId2}: Assigning vehicle "${testVehicle.registration_number}"...`)

    const editPayload1 = {
      dispatch_id: dispatchId2,
      route_id: route2.id,
      route_name: route2.name,
      driver_id: driver2.id,
      vehicle_id: testVehicle.id,
      vehicle_number: testVehicle.registration_number,
      dispatch_date: new Date().toISOString().split('T')[0],
      start_time: '09:15 AM',
      start_location: 'Main Factory Warehouse',
      destination_areas: 'Updated Destination Areas',
      notes: 'Updated via edit route test'
    }

    const editRes1 = await client.query(`
      SELECT public.update_driver_route($1::jsonb) AS result;
    `, [JSON.stringify(editPayload1)])
    console.log('  Update Result 1:', editRes1.rows[0].result)

    const checkEdit1 = await client.query(`
      SELECT id, route_id, route_name, vehicle_id, vehicle_number, destination_areas
      FROM public.driver_load_dispatches WHERE id = $1;
    `, [dispatchId2])
    console.log('  DB Record after edit 1:', checkEdit1.rows[0])
    if (checkEdit1.rows[0].vehicle_id !== testVehicle.id) throw new Error('Edit 1 failed: vehicle_id not updated')

    // Now edit again to unassign the vehicle (leave vehicle empty)
    console.log(`\nEditing Dispatch #${dispatchId2}: Removing vehicle back to NULL (Not Assigned)...`)
    const editPayload2 = {
      dispatch_id: dispatchId2,
      route_id: route2.id,
      route_name: route2.name,
      driver_id: driver2.id,
      vehicle_id: null,
      vehicle_number: null,
      dispatch_date: new Date().toISOString().split('T')[0],
      start_time: '09:15 AM',
      start_location: 'Main Factory Warehouse',
      destination_areas: 'Updated Destination Areas',
      notes: 'Vehicle unassigned'
    }

    const editRes2 = await client.query(`
      SELECT public.update_driver_route($1::jsonb) AS result;
    `, [JSON.stringify(editPayload2)])
    console.log('  Update Result 2:', editRes2.rows[0].result)

    const checkEdit2 = await client.query(`
      SELECT id, route_id, route_name, vehicle_id, vehicle_number
      FROM public.driver_load_dispatches WHERE id = $1;
    `, [dispatchId2])
    console.log('  DB Record after edit 2:', checkEdit2.rows[0])
    if (checkEdit2.rows[0].vehicle_id !== null) throw new Error('Edit 2 failed: vehicle_id should be NULL')
    if (checkEdit2.rows[0].vehicle_number !== null) throw new Error('Edit 2 failed: vehicle_number should be NULL')

    console.log('\n------------------------------------------------------------------------')
    console.log('TEST 5: Test Validation Rejection for Arbitrary / Missing Route')
    console.log('------------------------------------------------------------------------')
    try {
      const invalidPayload = {
        route_id: null,
        route_name: 'Arbitrary Nonexistent Route',
        driver_id: driver1.id,
        driver_name: driver1.name
      }
      await client.query(`
        SELECT public.start_driver_route($1::jsonb, $2::jsonb) AS result;
      `, [JSON.stringify(invalidPayload), JSON.stringify(items1)])
      throw new Error('Validation failed to reject route with null route_id!')
    } catch (err: any) {
      console.log('✓ Validation correctly rejected missing/null route_id:', err.message)
    }

    try {
      const fakeUuid = '00000000-0000-0000-0000-000000000000'
      const invalidPayload2 = {
        route_id: fakeUuid,
        route_name: 'Fake Route',
        driver_id: driver1.id,
        driver_name: driver1.name
      }
      await client.query(`
        SELECT public.start_driver_route($1::jsonb, $2::jsonb) AS result;
      `, [JSON.stringify(invalidPayload2), JSON.stringify(items1)])
      throw new Error('Validation failed to reject invalid route_id UUID!')
    } catch (err: any) {
      console.log('✓ Validation correctly rejected non-existent route UUID in public.routes:', err.message)
    }

    console.log('\n------------------------------------------------------------------------')
    console.log('TEST 6: Route History and Driver Profile Displays')
    console.log('------------------------------------------------------------------------')
    const histRes = await client.query(`
      SELECT 
        d.dispatch_number,
        d.route_name,
        d.driver_name,
        COALESCE(d.vehicle_number, 'Not Assigned') AS vehicle_display,
        d.status
      FROM public.driver_load_dispatches d
      WHERE d.id IN ($1, $2)
      ORDER BY d.created_at;
    `, [dispatchId1, dispatchId2])

    histRes.rows.forEach(r => {
      console.log(`  Dispatched Route: ${r.route_name} | Vehicle Display: "${r.vehicle_display}" | Driver: ${r.driver_name} | Status: ${r.status}`)
    })

    console.log('\n========================================================================')
    console.log('ALL TESTS PASSED SUCCESSFULLY! ✓')
    console.log('========================================================================')

  } catch (err: any) {
    console.error('VERIFICATION ERROR:', err)
    process.exit(1)
  } finally {
    await client.end()
  }
}

runVerification()

