global.WebSocket = class {};
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://oweutcivgpmzldlcmkvd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93ZXV0Y2l2Z3BtemxkbGNta3ZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4NDgxMTQsImV4cCI6MjA5NjQyNDExNH0.sT3jrcRa3TkcVT5vXFoOQXDG6zREdl_wV0YZs3kBEAo';

async function run() {
  const adminClient = createClient(supabaseUrl, supabaseAnonKey);
  await adminClient.auth.signInWithPassword({
    email: 'owner@royalkissan.com',
    password: 'Admin@123'
  });

  // Fetch all products, drivers, routes, employees
  const { data: products } = await adminClient.from('products').select('*');
  const { data: drivers } = await adminClient.from('drivers').select('*');
  const { data: routes } = await adminClient.from('routes').select('*');
  const { data: employees } = await adminClient.from('employees').select('*');

  console.log(`Loaded from DB:`);
  console.log(`  Products: ${products?.length || 0}`);
  console.log(`  Drivers: ${drivers?.length || 0}`);
  console.log(`  Routes: ${routes?.length || 0}`);
  console.log(`  Employees: ${employees?.length || 0}`);

  // Query transaction counts
  const { count: billsCount } = await adminClient.from('bills').select('*', { count: 'exact', head: true });
  const { count: salesCount } = await adminClient.from('sales').select('*', { count: 'exact', head: true });
  const { count: routeSalesCount } = await adminClient.from('route_sales').select('*', { count: 'exact', head: true });

  console.log(`Transactions in DB:`);
  console.log(`  Bills: ${billsCount}`);
  console.log(`  Sales: ${salesCount}`);
  console.log(`  Route Sales: ${routeSalesCount}`);

  // Inspect references to duplicates
  // Let's identify the MIN(id) (kept) and other ids (duplicates) for duplicate products
  const productGroups = {};
  products.forEach(p => {
    productGroups[p.name] = productGroups[p.name] || [];
    productGroups[p.name].push(p.id);
  });

  console.log('\n--- PRODUCT DUPLICATE GROUPS & REFERENCES ---');
  for (const name in productGroups) {
    if (productGroups[name].length > 1) {
      const keptId = productGroups[name][0];
      const dupIds = productGroups[name].slice(1);
      console.log(`Product: "${name}"`);
      console.log(`  Kept ID: ${keptId}`);
      console.log(`  Duplicate IDs to delete: ${dupIds.join(', ')}`);
      
      // Check if duplicate IDs are referenced in bill_items or sales
      const { count: itemRefs } = await adminClient.from('bill_items').select('*', { count: 'exact', head: true }).in('product_id', dupIds);
      console.log(`  References in bill_items: ${itemRefs}`);
    }
  }
}

run();
