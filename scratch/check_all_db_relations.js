global.WebSocket = class {};
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://oweutcivgpmzldlcmkvd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93ZXV0Y2l2Z3BtemxkbGNta3ZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4NDgxMTQsImV4cCI6MjA5NjQyNDExNH0.sT3jrcRa3TkcVT5vXFoOQXDG6zREdl_wV0YZs3kBEAo';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const tablesToCheck = [
  'customers',
  'customer_dues',
  'sales',
  'bills',
  'bill_items',
  'collections',
  'route_sales',
  'dealer_transactions',
  'dealer_ledger',
  'dealers',
  'dealer_products',
  'dealer_collections',
  'customer_ledger',
  'dealer_sales',
  'returns',
  'dealer_returns',
  'leakages',
  'leakage_management',
  'stock',
  'stock_transactions',
  'products'
];

async function check() {
  console.log("Checking relations status...");
  for (const table of tablesToCheck) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      if (error.code === 'PGRST205' || error.message.includes("does not exist") || error.message.includes("Could not find")) {
        console.log(`Relation "${table}": ❌ DOES NOT EXIST`);
      } else {
        console.log(`Relation "${table}": ⚠️ EXIST BUT HAS ERROR (${error.code}: ${error.message})`);
      }
    } else {
      console.log(`Relation "${table}": ✅ EXISTS (Rows returned: ${data.length})`);
    }
  }
}

check();
