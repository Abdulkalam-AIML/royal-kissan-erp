global.WebSocket = class {};
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://oweutcivgpmzldlcmkvd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93ZXV0Y2l2Z3BtemxkbGNta3ZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4NDgxMTQsImV4cCI6MjA5NjQyNDExNH0.sT3jrcRa3TkcVT5vXFoOQXDG6zREdl_wV0YZs3kBEAo';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  await supabase.auth.signInWithPassword({
    email: 'owner@royalkissan.com',
    password: 'Admin@123'
  });

  // 1. Drivers list
  console.log('\n=== DRIVERS ===');
  const { data: drivers } = await supabase.from('drivers').select('*');
  drivers.forEach(d => console.log(`- ID: ${d.id}, Name: ${d.name}, Phone: ${d.phone}, Salary: ${d.salary}`));

  // 2. Routes list
  console.log('\n=== ROUTES ===');
  const { data: routes } = await supabase.from('routes').select('*');
  routes.forEach(r => console.log(`- ID: ${r.id}, Name: ${r.name}, Driver ID: ${r.driver_id}, Area: ${r.area}`));

  // 3. Duplicate Employees check
  console.log('\n=== DUPLICATE EMPLOYEES ===');
  const { data: employees } = await supabase.from('employees').select('id, name, role');
  const empGroups = {};
  employees.forEach(e => {
    empGroups[e.name] = empGroups[e.name] || [];
    empGroups[e.name].push(e);
  });
  Object.keys(empGroups).forEach(name => {
    if (empGroups[name].length > 1) {
      console.log(`- "${name}" has duplicates:`);
      empGroups[name].forEach(e => console.log(`  * ID: ${e.id}, Role: ${e.role}`));
    }
  });

  // 4. Duplicate Customers check
  console.log('\n=== DUPLICATE CUSTOMERS ===');
  const { data: customers } = await supabase.from('customers').select('id, name');
  const custGroups = {};
  customers.forEach(c => {
    custGroups[c.name] = custGroups[c.name] || [];
    custGroups[c.name].push(c);
  });
  Object.keys(custGroups).forEach(name => {
    if (custGroups[name].length > 1) {
      console.log(`- "${name}" has duplicates:`);
      custGroups[name].forEach(c => console.log(`  * ID: ${c.id}`));
    }
  });

  // 5. Products list
  console.log('\n=== PRODUCTS ===');
  const { data: products } = await supabase.from('products').select('id, name, price, gst_rate');
  products.forEach(p => console.log(`- ID: ${p.id}, Name: ${p.name}, Price: ${p.price}, GST: ${p.gst_rate}%`));
}

run();
