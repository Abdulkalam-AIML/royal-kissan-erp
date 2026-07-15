global.WebSocket = class {};
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://oweutcivgpmzldlcmkvd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93ZXV0Y2l2Z3BtemxkbGNta3ZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4NDgxMTQsImV4cCI6MjA5NjQyNDExNH0.sT3jrcRa3TkcVT5vXFoOQXDG6zREdl_wV0YZs3kBEAo';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const requestedTables = [
  'roles', 'user_profiles', 'employees', 'attendance', 'salary_payments',
  'drivers', 'routes', 'route_customers', 'route_sales', 'route_expenses',
  'route_stops', 'driver_collections', 'customer_dues', 'products', 'stock',
  'stock_items', 'stock_transactions', 'customers', 'dealers', 'dealer_sales',
  'dealer_ledger', 'sales', 'bills', 'bill_items', 'daily_reports',
  'monthly_reports', 'driver_performance', 'route_performance', 'settings'
];

async function check() {
  await supabase.auth.signInWithPassword({
    email: 'owner@royalkissan.com',
    password: 'Admin@123'
  });

  console.log('=== COMPLETE DATABASE TABLE AUDIT ===');
  for (const t of requestedTables) {
    const { count, error } = await supabase.from(t).select('*', { count: 'exact', head: true });
    if (error) {
      if (error.code === 'PGRST116' || error.message.includes('JSON')) {
        // sometimes head: true with certain structures returns code or single row error, but table exists
        console.log(`Table "${t}": ✅ EXISTS (Error on count: ${error.message})`);
      } else if (error.code === '42P01') {
        console.log(`Table "${t}": ❌ MISSING`);
      } else {
        console.log(`Table "${t}": ⚠️ ERROR (${error.code}: ${error.message})`);
      }
    } else {
      console.log(`Table "${t}": ✅ EXISTS (Rows: ${count})`);
    }
  }
}

check();
