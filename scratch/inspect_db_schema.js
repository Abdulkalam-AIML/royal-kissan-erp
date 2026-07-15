global.WebSocket = class {};
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://oweutcivgpmzldlcmkvd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93ZXV0Y2l2Z3BtemxkbGNta3ZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4NDgxMTQsImV4cCI6MjA5NjQyNDExNH0.sT3jrcRa3TkcVT5vXFoOQXDG6zREdl_wV0YZs3kBEAo';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const targetTables = [
  'customers',
  'customer_dues',
  'sales',
  'bills',
  'collections',
  'dealer_collections',
  'route_sales',
  'dealer_transactions',
  'dealer_ledger',
  'dealers',
  'dealer_products',
  'customer_ledger'
];

async function inspectTable(table) {
  console.log(`\n========================================`);
  console.log(`Inspecting table: ${table}`);
  console.log(`========================================`);
  
  // Try fetching one row to get keys
  const { data, error } = await supabase.from(table).select('*').limit(1);
  if (error) {
    console.error(`❌ Error querying "${table}": ${error.message} (Code: ${error.code})`);
    return;
  }
  
  console.log(`✅ Table "${table}" exists.`);
  if (data && data.length > 0) {
    console.log(`Columns structure (from sample row):`);
    console.log(Object.keys(data[0]));
    console.log(`Sample row details:`, data[0]);
  } else {
    console.log(`Table exists but has 0 rows.`);
    // Try to get columns using an empty select or a RPC if possible, but let's just see if we can do postgrest headers or details
    // Sometimes we can select columns with a dummy query or check what columns might be there.
    // Let's do a select of '*' on a non-existent ID to see if the columns list is still returned (usually not keys, but we can verify it's empty)
  }
}

async function run() {
  for (const table of targetTables) {
    await inspectTable(table);
  }
}

run();
