global.WebSocket = class {};
const { createClient } = require('/Users/abdulkalam/Desktop/ROLLY ERP/royal-kissan-erp/node_modules/@supabase/supabase-js');

const supabaseUrl = 'https://oweutcivgpmzldlcmkvd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93ZXV0Y2l2Z3BtemxkbGNta3ZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4NDgxMTQsImV4cCI6MjA5NjQyNDExNH0.sT3jrcRa3TkcVT5vXFoOQXDG6zREdl_wV0YZs3kBEAo';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  try {
    console.log('Logging in...');
    await supabase.auth.signInWithPassword({
      email: 'owner@royalkissan.com',
      password: 'Admin@123'
    });
    console.log('✅ Auth successful!');

    // 1. Test Products Save
    console.log('Testing Products save...');
    const productPayload = {
      name: 'Test Product ' + Date.now().toString().slice(-4),
      category: 'bottle',
      unit: 'piece',
      default_rate: 15.00,
      gst_rate: 18.00,
      is_active: true
    };
    const { data: product, error: prodErr } = await supabase.from('products').insert(productPayload).select().single();
    if (prodErr) {
      console.error('❌ Products save failed:', prodErr.message);
    } else {
      console.log('✅ Products save successful! ID:', product.id);
      
      // 2. Test Stock update/save
      console.log('Testing Stock update/save...');
      const stockPayload = {
        product_id: product.id,
        current_quantity: 100,
        updated_at: new Date().toISOString()
      };
      const { data: stock, error: stockErr } = await supabase.from('stock').upsert(stockPayload, { onConflict: 'product_id' }).select().single();
      if (stockErr) {
        console.error('❌ Stock save failed:', stockErr.message);
      } else {
        console.log('✅ Stock save successful! ID:', stock.id);
        await supabase.from('stock').delete().eq('id', stock.id);
      }
      
      await supabase.from('products').delete().eq('id', product.id);
    }

    // 3. Test Drivers Save
    console.log('Testing Drivers save...');
    const driverPayload = {
      name: 'Test Driver ' + Date.now().toString().slice(-4),
      phone: '9876543201',
      license_number: 'DL-TEST-' + Date.now().toString().slice(-4),
      is_active: true
    };
    const { data: driver, error: driverErr } = await supabase.from('drivers').insert(driverPayload).select().single();
    if (driverErr) {
      console.error('❌ Drivers save failed:', driverErr.message);
    } else {
      console.log('✅ Drivers save successful! ID:', driver.id);
      await supabase.from('drivers').delete().eq('id', driver.id);
    }

    // 4. Test Dealers Save
    console.log('Testing Dealers save...');
    const dealerPayload = {
      name: 'Test Dealer ' + Date.now().toString().slice(-4),
      phone: '9876543202',
      address: 'Test Address',
      is_active: true
    };
    const { data: dealer, error: dealerErr } = await supabase.from('dealers').insert(dealerPayload).select().single();
    if (dealerErr) {
      console.error('❌ Dealers save failed:', dealerErr.message);
    } else {
      console.log('✅ Dealers save successful! ID:', dealer.id);
      await supabase.from('dealers').delete().eq('id', dealer.id);
    }

    // 5. Test Employees Save
    console.log('Testing Employees save...');
    const employeePayload = {
      name: 'Test Employee ' + Date.now().toString().slice(-4),
      phone: '9876543203',
      role: 'worker',
      salary: 15000.00,
      is_active: true
    };
    const { data: employee, error: empErr } = await supabase.from('employees').insert(employeePayload).select().single();
    if (empErr) {
      console.error('❌ Employees save failed:', empErr.message);
    } else {
      console.log('✅ Employees save successful! ID:', employee.id);
      await supabase.from('employees').delete().eq('id', employee.id);
    }

    // 6. Test Routes Save
    console.log('Testing Routes save...');
    const routePayload = {
      name: 'Test Route ' + Date.now().toString().slice(-4),
      description: 'Test description',
      is_active: true
    };
    const { data: route, error: routeErr } = await supabase.from('routes').insert(routePayload).select().single();
    if (routeErr) {
      console.error('❌ Routes save failed:', routeErr.message);
    } else {
      console.log('✅ Routes save successful! ID:', route.id);
      await supabase.from('routes').delete().eq('id', route.id);
    }

  } catch (err) {
    console.error('Unhandled script error:', err);
  }
}

run();
