global.WebSocket = class {};
const { createClient } = require('/Users/abdulkalam/Desktop/ROLLY ERP/royal-kissan-erp/node_modules/@supabase/supabase-js');

const supabaseUrl = 'https://oweutcivgpmzldlcmkvd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93ZXV0Y2l2Z3BtemxkbGNta3ZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4NDgxMTQsImV4cCI6MjA5NjQyNDExNH0.sT3jrcRa3TkcVT5vXFoOQXDG6zREdl_wV0YZs3kBEAo';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runTests() {
  console.log('Logging in as Admin...');
  const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'owner@royalkissan.com',
    password: 'Admin@123'
  });

  if (authErr) {
    console.error('❌ Auth failed:', authErr.message);
    return;
  }
  console.log('✅ Auth successful!');

  const report = {
    billing: { status: 'testing', logs: [] },
    dealers: { status: 'testing', logs: [] },
    drivers: { status: 'testing', logs: [] },
    employees: { status: 'testing', logs: [] },
    routes: { status: 'testing', logs: [] },
    dashboard: { status: 'testing', logs: [] }
  };

  // ==========================================
  // 1. BILLING MODULE TESTS
  // ==========================================
  console.log('\n--- Testing Billing Module ---');
  try {
    const billTypes = ['company_sale', 'gst_invoice', 'non_gst_invoice', 'dealer_invoice', 'driver_sale'];
    let allOk = true;

    for (const type of billTypes) {
      const invNo = `TEST-BILL-${type.toUpperCase().slice(0, 4)}-${Date.now().toString().slice(-4)}`;
      const payload = {
        invoice_number: invNo,
        bill_type: type,
        customer_name: 'Test Billing Cust',
        subtotal: 100.00,
        gst_amount: 18.00,
        total_amount: 118.00,
        payment_method: 'cash',
        due_amount: 0.00,
        date: new Date().toISOString().split('T')[0]
      };

      const { data: bill, error } = await supabase.from('bills').insert(payload).select().single();
      if (error) {
        report.billing.logs.push(`❌ Failed to save ${type}: [${error.code}] ${error.message}`);
        allOk = false;
      } else {
        report.billing.logs.push(`✅ Saved ${type} successfully! ID: ${bill.id}`);
        // clean up
        await supabase.from('bills').delete().eq('id', bill.id);
      }
    }
    report.billing.status = allOk ? 'working' : 'broken';
  } catch (err) {
    report.billing.status = 'broken';
    report.billing.logs.push(`❌ Exception: ${err.message}`);
  }

  // ==========================================
  // 2. DEALERS MODULE TESTS
  // ==========================================
  console.log('\n--- Testing Dealers Module ---');
  try {
    // A. Create Dealer
    const dealerPayload = {
      name: 'Test Verification Dealer',
      phone: '9988776655',
      address: 'Dealers Lane',
      is_active: true
    };
    const { data: dealer, error: createErr } = await supabase.from('dealers').insert(dealerPayload).select().single();
    
    if (createErr) {
      report.dealers.status = 'broken';
      report.dealers.logs.push(`❌ Create Dealer failed: [${createErr.code}] ${createErr.message}`);
    } else {
      report.dealers.logs.push(`✅ Created Dealer successfully! ID: ${dealer.id}`);

      // B. Update Dealer
      const { data: updated, error: updateErr } = await supabase
        .from('dealers')
        .update({ address: 'Updated Dealers Lane' })
        .eq('id', dealer.id)
        .select()
        .single();
      
      if (updateErr) {
        report.dealers.logs.push(`❌ Update Dealer failed: [${updateErr.code}] ${updateErr.message}`);
        report.dealers.status = 'broken';
      } else {
        report.dealers.logs.push(`✅ Updated Dealer successfully! New Address: ${updated.address}`);
      }

      // C. Due Calculation / Invoice integration
      // Insert a dealer invoice with due_amount
      const invNo = `TEST-DEALER-DUE-${Date.now().toString().slice(-4)}`;
      const { data: bill, error: billErr } = await supabase.from('bills').insert({
        invoice_number: invNo,
        bill_type: 'dealer_invoice',
        customer_name: 'Test Verification Dealer', // matches name
        dealer_id: dealer.id,
        subtotal: 1000.00,
        total_amount: 1180.00,
        payment_method: 'due',
        due_amount: 1180.00,
        date: new Date().toISOString().split('T')[0]
      }).select().single();

      if (billErr) {
        report.dealers.logs.push(`❌ Dealer Invoice save failed: ${billErr.message}`);
        report.dealers.status = 'broken';
      } else {
        report.dealers.logs.push(`✅ Saved Dealer Invoice successfully. Checking outstanding dues...`);
        
        // Wait a second for trigger to execute and select dealer outstanding amount
        await new Promise(r => setTimeout(r, 1000));
        const { data: checkD, error: checkErr } = await supabase.from('dealers').select('outstanding_amount').eq('id', dealer.id).single();
        if (checkErr) {
          report.dealers.logs.push(`❌ Query dealer outstanding failed: ${checkErr.message}`);
        } else {
          report.dealers.logs.push(`✅ Dealer Outstanding Due amount is: ₹${checkD.outstanding_amount}`);
          if (Number(checkD.outstanding_amount) === 1180) {
            report.dealers.logs.push(`✅ Dealer Outstanding Due trigger works!`);
          } else {
            report.dealers.logs.push(`⚠️ Dealer Outstanding Due mismatch (expected 1180, got ${checkD.outstanding_amount})`);
          }
        }

        // Clean up bill
        await supabase.from('bills').delete().eq('id', bill.id);
      }

      // D. Ledger Check
      const { data: ledger, error: ledgerErr } = await supabase.from('dealer_ledger').select('*').eq('dealer_id', dealer.id);
      if (ledgerErr) {
        report.dealers.logs.push(`❌ Dealer ledger query failed: ${ledgerErr.message}`);
      } else {
        report.dealers.logs.push(`✅ Dealer ledger entries found: ${ledger.length}`);
      }

      // Delete dealer related test bills and ledgers first
      console.log('Cleaning up dealer ledger and sales entries...');
      await supabase.from('dealer_ledger').delete().eq('dealer_id', dealer.id);
      await supabase.from('dealer_sales').delete().eq('dealer_id', dealer.id);

      // Delete Dealer
      const { error: delErr } = await supabase.from('dealers').delete().eq('id', dealer.id);
      if (delErr) {
        report.dealers.logs.push(`❌ Delete Dealer failed: ${delErr.message}`);
        report.dealers.status = 'broken';
      } else {
        report.dealers.logs.push(`✅ Deleted Dealer successfully!`);
        if (report.dealers.status === 'testing') report.dealers.status = 'working';
      }
    }
  } catch (err) {
    report.dealers.status = 'broken';
    report.dealers.logs.push(`❌ Exception: ${err.message}`);
  }

  // ==========================================
  // 3. DRIVERS MODULE TESTS
  // ==========================================
  console.log('\n--- Testing Drivers Module ---');
  try {
    // A. Query all drivers
    const { data: allDrivers, error: drErr } = await supabase.from('drivers').select('*').order('name');
    if (drErr) {
      report.drivers.status = 'broken';
      report.drivers.logs.push(`❌ Query drivers failed: ${drErr.message}`);
    } else {
      report.drivers.logs.push(`✅ Drivers currently in DB: ${allDrivers.map(d => d.name).join(', ')}`);
      
      const hasMallaya = allDrivers.some(d => d.name.toLowerCase().includes('mallaya'));
      if (hasMallaya) {
        report.drivers.logs.push(`⚠️ Mallaya found in database! User requires: "Remove Mallaya completely".`);
        // Clean up Mallaya
        const { error: delMal } = await supabase.from('drivers').delete().ilike('name', '%mallaya%');
        if (delMal) {
          report.drivers.logs.push(`❌ Failed to delete Mallaya: ${delMal.message}`);
        } else {
          report.drivers.logs.push(`✅ Successfully deleted Mallaya from drivers.`);
        }
      } else {
        report.drivers.logs.push(`✅ Mallaya not present in database.`);
      }

      const hasNagaraju = allDrivers.some(d => d.name.toLowerCase().includes('nagaraju'));
      const hasDriver2 = allDrivers.some(d => d.name.toLowerCase().includes('driver-2') || d.name.toLowerCase().includes('driver 2'));
      
      if (!hasNagaraju) {
        report.drivers.logs.push(`⚠️ Nagaraju missing from drivers. Re-inserting...`);
        await supabase.from('drivers').insert({ name: 'Nagaraju', phone: '8184918757', salary: 12000, is_active: true });
      }
      if (!hasDriver2) {
        report.drivers.logs.push(`⚠️ Driver-2 missing from drivers. Creating Driver-2...`);
        const { error: insD2 } = await supabase.from('drivers').insert({ name: 'Driver-2', phone: '9999988888', salary: 14000, is_active: true });
        if (insD2) {
          report.drivers.logs.push(`❌ Create Driver-2 failed: ${insD2.message}`);
        } else {
          report.drivers.logs.push(`✅ Created Driver-2 successfully.`);
        }
      }

      // Check driver sales save
      const activeDriver = allDrivers.find(d => d.name.toLowerCase().includes('nagaraju')) || allDrivers[0];
      if (activeDriver) {
        const invNo = `TEST-DRV-BILL-${Date.now().toString().slice(-4)}`;
        const { data: bill, error: billErr } = await supabase.from('bills').insert({
          invoice_number: invNo,
          bill_type: 'driver_sale',
          customer_name: 'Test Route Cust',
          driver_id: activeDriver.id,
          subtotal: 500.00,
          total_amount: 500.00,
          payment_method: 'cash',
          due_amount: 0.00,
          date: new Date().toISOString().split('T')[0]
        }).select().single();

        if (billErr) {
          report.drivers.logs.push(`❌ Driver sales save failed: ${billErr.message}`);
          report.drivers.status = 'broken';
        } else {
          report.drivers.logs.push(`✅ Driver sales bill inserted successfully! ID: ${bill.id}`);
          
          // Verify if driver_sales table records it
          await new Promise(r => setTimeout(r, 1000));
          const { data: dsData, error: dsErr } = await supabase.from('driver_sales').select('*').eq('bill_id', bill.id);
          if (dsErr) {
            report.drivers.logs.push(`❌ Query driver_sales failed: ${dsErr.message}`);
          } else {
            report.drivers.logs.push(`✅ Driver sales summary rows: ${dsData.length}`);
            if (dsData.length > 0) {
              report.drivers.logs.push(`✅ Driver Sales trigger correctly synced to driver_sales table!`);
            } else {
              report.drivers.logs.push(`⚠️ Driver Sales trigger failed to sync driver_sales row!`);
            }
          }

          // Clean up
          await supabase.from('bills').delete().eq('id', bill.id);
        }
      }
      if (report.drivers.status === 'testing') report.drivers.status = 'working';
    }
  } catch (err) {
    report.drivers.status = 'broken';
    report.drivers.logs.push(`❌ Exception: ${err.message}`);
  }

  // ==========================================
  // 4. EMPLOYEES MODULE TESTS
  // ==========================================
  console.log('\n--- Testing Employees Module ---');
  try {
    // A. Create Employee
    const empPayload = {
      name: 'Test Verification Employee',
      role: 'worker',
      phone: '9900990099',
      salary: 10000.00,
      is_active: true
    };
    const { data: emp, error: empErr } = await supabase.from('employees').insert(empPayload).select().single();
    
    if (empErr) {
      report.employees.status = 'broken';
      report.employees.logs.push(`❌ Create Employee failed: [${empErr.code}] ${empErr.message}`);
    } else {
      report.employees.logs.push(`✅ Created Employee successfully! ID: ${emp.id}`);

      // B. Update Employee
      const { data: updatedEmp, error: upErr } = await supabase
        .from('employees')
        .update({ phone: '9900990011' })
        .eq('id', emp.id)
        .select()
        .single();
      
      if (upErr) {
        report.employees.logs.push(`❌ Update Employee failed: ${upErr.message}`);
        report.employees.status = 'broken';
      } else {
        report.employees.logs.push(`✅ Updated Employee successfully! New phone: ${updatedEmp.phone}`);
      }

      // C. Attendance Record Test
      const today = new Date().toISOString().split('T')[0];
      const { data: att, error: attErr } = await supabase.from('attendance').insert({
        employee_id: emp.id,
        date: today,
        status: 'present',
        notes: 'Verification test present'
      }).select().single();

      if (attErr) {
        report.employees.logs.push(`❌ Create Attendance failed: ${attErr.message}`);
        report.employees.status = 'broken';
      } else {
        report.employees.logs.push(`✅ Created Attendance successfully! ID: ${att.id}`);
        // Clean up
        await supabase.from('attendance').delete().eq('id', att.id);
      }

      // D. Salary Payment Test
      const { data: sal, error: salErr } = await supabase.from('salary').insert({
        employee_id: emp.id,
        base_salary: emp.salary,
        advance_deducted: 0,
        bonus_added: 0,
        net_paid: emp.salary,
        payment_date: today
      }).select().single();

      if (salErr) {
        report.employees.logs.push(`❌ Create Salary Record failed: ${salErr.message}`);
        report.employees.status = 'broken';
      } else {
        report.employees.logs.push(`✅ Created Salary record successfully! ID: ${sal.id}`);
        // Clean up
        await supabase.from('salary').delete().eq('id', sal.id);
      }

      // Delete employee
      await supabase.from('employees').delete().eq('id', emp.id);
      if (report.employees.status === 'testing') report.employees.status = 'working';
    }
  } catch (err) {
    report.employees.status = 'broken';
    report.employees.logs.push(`❌ Exception: ${err.message}`);
  }

  // ==========================================
  // 5. ROUTES MODULE TESTS
  // ==========================================
  console.log('\n--- Testing Routes Module ---');
  try {
    // Fetch routes
    const { data: allRoutes, error: rtErr } = await supabase.from('routes').select('*');
    if (rtErr) {
      report.routes.status = 'broken';
      report.routes.logs.push(`❌ Query routes failed: ${rtErr.message}`);
    } else {
      report.routes.logs.push(`✅ Routes in DB: ${allRoutes.map(r => r.name).join(', ')}`);
      
      // Local Route vs Non Local route
      const local = allRoutes.filter(r => !r.name.toLowerCase().includes('non-local') && r.name.toLowerCase().includes('local'));
      const nonLocal = allRoutes.filter(r => r.name.toLowerCase().includes('non-local'));
      
      report.routes.logs.push(`✅ Local routes count: ${local.length}`);
      report.routes.logs.push(`✅ Non Local routes count: ${nonLocal.length}`);

      // Test Route Sales (Insert a driver sale bill on local route)
      const localRoute = local[0] || allRoutes[0];
      const driver = await supabase.from('drivers').select('id').limit(1).single();
      const driverId = driver.data ? driver.data.id : null;

      if (localRoute && driverId) {
        const invNo = `TEST-RTE-BILL-${Date.now().toString().slice(-4)}`;
        const { data: bill, error: billErr } = await supabase.from('bills').insert({
          invoice_number: invNo,
          bill_type: 'driver_sale',
          customer_name: 'Test Route Sales Customer',
          driver_id: driverId,
          route_id: localRoute.id,
          subtotal: 300.00,
          total_amount: 300.00,
          payment_method: 'cash',
          due_amount: 0.00,
          date: new Date().toISOString().split('T')[0]
        }).select().single();

        if (billErr) {
          report.routes.logs.push(`❌ Route Sales Insert failed: ${billErr.message}`);
          report.routes.status = 'broken';
        } else {
          report.routes.logs.push(`✅ Route Sales bill saved successfully! ID: ${bill.id}`);
          
          // Verify if route_reports table records it
          await new Promise(r => setTimeout(r, 1000));
          const { data: rrData, error: rrErr } = await supabase.from('route_reports').select('*').eq('route_id', localRoute.id);
          if (rrErr) {
            report.routes.logs.push(`❌ Query route_reports failed: ${rrErr.message}`);
          } else {
            report.routes.logs.push(`✅ Route Reports summary rows found: ${rrData.length}`);
          }

          // Clean up
          await supabase.from('bills').delete().eq('id', bill.id);
        }
      } else {
        report.routes.logs.push(`⚠️ Cannot verify Route Sales because local route or driver missing.`);
      }

      // Check route_sales table existence
      const { error: rsErr } = await supabase.from('route_sales').select('*').limit(1);
      if (rsErr) {
        report.routes.logs.push(`❌ route_sales table: [${rsErr.code}] ${rsErr.message}`);
        report.routes.logs.push(`⚠️ Frontend files expect "route_sales" table to exist, but database uses "driver_sales" / "bills" instead.`);
        report.routes.status = 'partially_working';
      } else {
        report.routes.logs.push(`✅ route_sales table exists.`);
      }
      
      if (report.routes.status === 'testing') report.routes.status = 'working';
    }
  } catch (err) {
    report.routes.status = 'broken';
    report.routes.logs.push(`❌ Exception: ${err.message}`);
  }

  // ==========================================
  // 6. DASHBOARD MODULE TESTS
  // ==========================================
  console.log('\n--- Testing Dashboard Module ---');
  try {
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    const firstDayOfMonth = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;

    let dashOk = true;

    // Test dashboard table querying logic
    // A. Query today's route sales (throws error if route_sales table doesn't exist)
    const { data: routeSales, error: rsErr } = await supabase
      .from('route_sales')
      .select('total_amount, due_amount, cash_paid, upi_paid')
      .eq('sale_date', today);
    
    if (rsErr) {
      report.dashboard.logs.push(`❌ Query today's route_sales failed: ${rsErr.message}`);
      dashOk = false;
    } else {
      report.dashboard.logs.push(`✅ Query today's route_sales succeeded. Count: ${routeSales.length}`);
    }

    // B. Query today's general sales
    const { data: sales, error: sErr } = await supabase
      .from('sales')
      .select('total_amount, due_amount, paid_amount')
      .eq('sale_date', today);
    
    if (sErr) {
      report.dashboard.logs.push(`❌ Query today's sales failed: ${sErr.message}`);
      dashOk = false;
    } else {
      report.dashboard.logs.push(`✅ Query today's sales succeeded. Count: ${sales.length}`);
    }

    // C. Query customer dues (uses view customer_dues)
    const { data: dues, error: dueErr } = await supabase
      .from('customer_dues')
      .select('*')
      .limit(5);
    
    if (dueErr) {
      report.dashboard.logs.push(`❌ Query customer_dues view failed: ${dueErr.message}`);
      dashOk = false;
    } else {
      report.dashboard.logs.push(`✅ Query customer_dues view succeeded. Count: ${dues.length}`);
    }

    report.dashboard.status = dashOk ? 'working' : 'broken';
  } catch (err) {
    report.dashboard.status = 'broken';
    report.dashboard.logs.push(`❌ Exception: ${err.message}`);
  }

  // ==========================================
  // FINAL REPORT OUTPUT
  // ==========================================
  console.log('\n==========================================');
  console.log('--- VERIFICATION REPORT SUMMARY ---');
  console.log('==========================================');
  console.log(JSON.stringify(report, null, 2));
}

runTests();
