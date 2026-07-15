global.WebSocket = class {};
const { createClient } = require('/Users/abdulkalam/Desktop/ROLLY ERP/royal-kissan-erp/node_modules/@supabase/supabase-js');

const supabaseUrl = 'https://oweutcivgpmzldlcmkvd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93ZXV0Y2l2Z3BtemxkbGNta3ZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4NDgxMTQsImV4cCI6MjA5NjQyNDExNH0.sT3jrcRa3TkcVT5vXFoOQXDG6zREdl_wV0YZs3kBEAo';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const tablesToCheck = [
  'sales',
  'sale_items',
  'bills',
  'bill_items',
  'route_sales',
  'driver_sales',
  'route_customers',
  'customer_dues',
  'driver_collections',
  'daily_reports',
  'monthly_reports',
  'driver_performance',
  'route_performance',
  'dealers',
  'drivers',
  'employees',
  'routes',
  'non_local_routes',
  'expenses',
  'salary',
  'stock',
  'attendance'
];

async function check() {
  await supabase.auth.signInWithPassword({
    email: 'owner@royalkissan.com',
    password: 'Admin@123'
  });

  console.log('--- TABLE VERIFICATION ---');
  for (const t of tablesToCheck) {
    const { error } = await supabase.from(t).select('*').limit(1);
    if (error) {
      console.log(`Table "${t}": ❌ MISSING/ERROR (${error.code}: ${error.message})`);
    } else {
      console.log(`Table "${t}": ✅ EXISTS`);
    }
  }
}

check();
