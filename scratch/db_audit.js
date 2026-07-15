const { Client } = require('pg');

const connectionString = 'postgresql://postgres.oweutcivgpmzldlcmkvd:Admin%40123@aws-0-ap-south-1.pooler.supabase.com:6543/postgres';

async function audit() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('--- Connected to Database ---');

    // 1. List all public tables
    console.log('\n--- 1. Tables ---');
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    const tables = tablesRes.rows.map(r => r.table_name);
    console.log('Tables found:', tables.join(', '));

    // 2. Audit specific requested tables
    const requestedTables = [
      'roles', 'user_profiles', 'employees', 'attendance', 'salary_payments',
      'drivers', 'routes', 'route_customers', 'route_sales', 'route_expenses',
      'route_stops', 'driver_collections', 'customer_dues', 'products', 'stock',
      'stock_items', 'stock_transactions', 'customers', 'dealers', 'dealer_sales',
      'dealer_ledger', 'sales', 'bills', 'bill_items', 'daily_reports',
      'monthly_reports', 'driver_performance', 'route_performance', 'settings'
    ];
    console.log('\n--- 2. Requested Tables Check ---');
    requestedTables.forEach(t => {
      const exists = tables.includes(t);
      console.log(`Table "${t}": ${exists ? '✅ EXISTS' : '❌ MISSING'}`);
    });

    // 3. Count rows in main tables
    console.log('\n--- 3. Row Counts ---');
    for (const t of tables) {
      try {
        const countRes = await client.query(`SELECT COUNT(*) FROM public."${t}";`);
        console.log(`- ${t}: ${countRes.rows[0].count} rows`);
      } catch (err) {
        console.log(`- ${t}: ERROR reading count (${err.message})`);
      }
    }

    // 4. Check for duplicates in drivers
    console.log('\n--- 4. Driver Duplicates ---');
    const driversRes = await client.query(`
      SELECT name, COUNT(*), string_agg(id::text, ', ') as ids 
      FROM public.drivers 
      GROUP BY name;
    `);
    driversRes.rows.forEach(r => {
      console.log(`- Driver "${r.name}": Count = ${r.count} (IDs: ${r.ids})`);
    });

    // 5. Check for duplicates in routes
    console.log('\n--- 5. Route Duplicates ---');
    const routesRes = await client.query(`
      SELECT name, COUNT(*), string_agg(id::text, ', ') as ids 
      FROM public.routes 
      GROUP BY name;
    `);
    routesRes.rows.forEach(r => {
      console.log(`- Route "${r.name}": Count = ${r.count} (IDs: ${r.ids})`);
    });

    // 6. Check for duplicate employees
    console.log('\n--- 6. Employee Duplicates ---');
    const empRes = await client.query(`
      SELECT name, COUNT(*), string_agg(id::text, ', ') as ids 
      FROM public.employees 
      GROUP BY name 
      HAVING COUNT(*) > 1;
    `);
    if (empRes.rows.length === 0) {
      console.log('No duplicate employee names found.');
    } else {
      empRes.rows.forEach(r => {
        console.log(`- Employee "${r.name}": Count = ${r.count} (IDs: ${r.ids})`);
      });
    }

    // 7. Check for duplicate customers
    console.log('\n--- 7. Customer Duplicates ---');
    const custRes = await client.query(`
      SELECT name, COUNT(*), string_agg(id::text, ', ') as ids 
      FROM public.customers 
      GROUP BY name 
      HAVING COUNT(*) > 1;
    `);
    if (custRes.rows.length === 0) {
      console.log('No duplicate customer names found.');
    } else {
      custRes.rows.forEach(r => {
        console.log(`- Customer "${r.name}": Count = ${r.count} (IDs: ${r.ids})`);
      });
    }

    // 8. Check triggers and views
    console.log('\n--- 8. Triggers ---');
    const triggersRes = await client.query(`
      SELECT trigger_name, event_manipulation, event_object_table, action_statement
      FROM information_schema.triggers
      WHERE trigger_schema = 'public';
    `);
    if (triggersRes.rows.length === 0) {
      console.log('No triggers found.');
    } else {
      triggersRes.rows.forEach(r => {
        console.log(`- Trigger "${r.trigger_name}" on "${r.event_object_table}" (${r.event_manipulation})`);
      });
    }

    // 9. Check RLS policies
    console.log('\n--- 9. RLS Policies ---');
    const rlsRes = await client.query(`
      SELECT tablename, rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public';
    `);
    rlsRes.rows.forEach(r => {
      console.log(`- Table "${r.tablename}": RLS Enabled = ${r.rowsecurity}`);
    });

  } catch (err) {
    console.error('Audit failed:', err);
  } finally {
    await client.end();
  }
}

audit();
